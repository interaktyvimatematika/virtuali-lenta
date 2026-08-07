import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  update,
  remove,
  onValue,
  get,
  onDisconnect,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA5zJ2jx67MMg9b_aYn7QW1_ORmQAaMrCg",
  authDomain: "virtuali-lenta.firebaseapp.com",
  databaseURL: "https://virtuali-lenta-default-rtdb.europe-west1.firebasedatabase.app/",
  projectId: "virtuali-lenta",
  storageBucket: "virtuali-lenta.firebasestorage.app",
  messagingSenderId: "101736426636",
  appId: "1:101736426636:web:4c6c8da5417e4a8d06dfa9"
};

const bridge = window.P772OnlineBridge;
const sessionBox = document.getElementById('onlineSession');
const statusEl = document.getElementById('onlineStatus');
const roomEl = document.getElementById('onlineRoomCode');
const usersEl = document.getElementById('onlineUsers');
const copyButton = document.getElementById('copySessionLinkButton');
const newButton = document.getElementById('newSessionButton');

if (!bridge) {
  setUi('error', 'Online tiltas nerastas');
  throw new Error('P772OnlineBridge nerastas');
}

function safeRoom(value) {
  const cleaned = String(value || '').toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 24);
  return cleaned.length >= 4 ? cleaned : '';
}

function newRoomId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(7);
  crypto.getRandomValues(bytes);
  return [...bytes].map(value => alphabet[value % alphabet.length]).join('');
}

function resolveRoom() {
  const url = new URL(window.location.href);
  let room = safeRoom(url.searchParams.get('room'));
  if (!room) {
    room = newRoomId();
    url.searchParams.set('room', room);
    try {
      history.replaceState(null, '', url);
    } catch (_) {
      try { window.location.replace(url.toString()); } catch (_) { /* kraštutiniu atveju kodas liks tik šiame lange */ }
    }
  }
  return room;
}

function clientId() {
  let value = sessionStorage.getItem('p772-online-client-id');
  if (!value) {
    value = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    sessionStorage.setItem('p772-online-client-id', value);
  }
  return value.replace(/[.#$\[\]/]/g, '-');
}

function setUi(kind, text) {
  if (!sessionBox || !statusEl) return;
  sessionBox.classList.toggle('is-online', kind === 'online');
  sessionBox.classList.toggle('is-error', kind === 'error');
  statusEl.textContent = text;
}

function toMap(items) {
  const map = {};
  (Array.isArray(items) ? items : []).forEach((item, index) => {
    if (!item || typeof item !== 'object') return;
    const id = String(item.id || `item-${index}`).replace(/[.#$\[\]/]/g, '-');
    map[id] = item;
  });
  return map;
}

function mapToArray(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.values(value).filter(Boolean);
}

function stable(value) {
  return JSON.stringify(value ?? null);
}

const roomId = resolveRoom();
const me = clientId();
if (roomEl) roomEl.textContent = roomId;

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const roomRef = ref(db, `p772Rooms/${roomId}`);
const workspaceRef = ref(db, `p772Rooms/${roomId}/workspace`);
const drawingRef = ref(db, `p772Rooms/${roomId}/workspace/drawing`);
const notesRef = ref(db, `p772Rooms/${roomId}/workspace/notes`);
const boardTasksRef = ref(db, `p772Rooms/${roomId}/workspace/boardTasks`);
const boardPracticesRef = ref(db, `p772Rooms/${roomId}/workspace/boardPractices`);
const windowRef = ref(db, `p772Rooms/${roomId}/workspace/window`);
const liveRef = ref(db, `p772Rooms/${roomId}/liveStrokes`);
const myLiveRootRef = ref(db, `p772Rooms/${roomId}/liveStrokes/${me}`);
function myLiveStrokeRef(strokeId) {
  const safeId = String(strokeId || 'stroke').replace(/[.#$\[\]/]/g, '-');
  return ref(db, `p772Rooms/${roomId}/liveStrokes/${me}/${safeId}`);
}
const presenceRef = ref(db, `p772Rooms/${roomId}/presence/${me}`);
const presenceListRef = ref(db, `p772Rooms/${roomId}/presence`);
const connectedRef = ref(db, '.info/connected');

let bootstrapped = false;
const LIVE_STREAM_INTERVAL_MS = 24;
const liveStreams = new Map();
const pendingLiveCommits = new Map();
let remoteCache = {
  drawing: '', notes: '', boardTasks: '', boardPractices: '', window: ''
};

function localParts() {
  const snap = bridge.getSharedSnapshot();
  return {
    drawing: toMap(snap.drawing),
    notes: toMap(snap.notes),
    boardTasks: toMap(snap.boardTasks),
    boardPractices: toMap(snap.boardPractices),
    window: snap.window || {}
  };
}

function diffMap(prefix, localMap, remoteMap, updates) {
  const local = localMap || {};
  const remote = remoteMap || {};
  for (const [id, value] of Object.entries(local)) {
    if (stable(value) !== stable(remote[id])) updates[`${prefix}/${id}`] = value;
  }
  for (const id of Object.keys(remote)) {
    if (!(id in local)) updates[`${prefix}/${id}`] = null;
  }
}

async function publishLocalChanges() {
  if (!bootstrapped) return;
  const parts = localParts();
  const updates = {};

  const currentRemote = {
    drawing: JSON.parse(remoteCache.drawing || '{}'),
    notes: JSON.parse(remoteCache.notes || '{}'),
    boardTasks: JSON.parse(remoteCache.boardTasks || '{}'),
    boardPractices: JSON.parse(remoteCache.boardPractices || '{}')
  };

  diffMap('workspace/drawing', parts.drawing, currentRemote.drawing, updates);
  diffMap('workspace/notes', parts.notes, currentRemote.notes, updates);
  diffMap('workspace/boardTasks', parts.boardTasks, currentRemote.boardTasks, updates);
  diffMap('workspace/boardPractices', parts.boardPractices, currentRemote.boardPractices, updates);
  if (stable(parts.window) !== remoteCache.window) updates['workspace/window'] = parts.window;

  if (!Object.keys(updates).length) return;
  updates['workspace/meta/updatedAt'] = serverTimestamp();
  updates['workspace/meta/updatedBy'] = me;
  try {
    await update(roomRef, updates);
  } catch (error) {
    console.error('ONLINE-P1.3 publish klaida', error);
    setUi('error', 'Sinchronizavimo klaida');
  }
}

function settleCommittedLiveStrokes(normalizedDrawing) {
  if (!normalizedDrawing || typeof normalizedDrawing !== 'object' || !pendingLiveCommits.size) return;
  for (const strokeId of [...pendingLiveCommits.keys()]) {
    if (!normalizedDrawing[strokeId]) continue;
    const timer = pendingLiveCommits.get(strokeId);
    if (timer) clearTimeout(timer);
    pendingLiveCommits.delete(strokeId);
    const stream = liveStreams.get(strokeId);
    if (stream?.timer) clearTimeout(stream.timer);
    liveStreams.delete(strokeId);
    // Persistent brūkšnys jau atkeliavo į workspace. Gyvą kopiją pašaliname tik
    // po trumpo dažymo ciklo, kad kitame ekrane nebūtų tuščio kadro / mirktelėjimo.
    setTimeout(() => remove(myLiveStrokeRef(strokeId)).catch(() => {}), 70);
  }
}

function applyMapPart(part, raw) {
  const normalized = raw && typeof raw === 'object' ? raw : {};
  const fp = stable(normalized);
  remoteCache[part] = fp;
  if (part === 'drawing') settleCommittedLiveStrokes(normalized);
  if (stable(toMap(bridge.getSharedSnapshot()[part])) === fp) return;
  bridge.applySharedPart(part, mapToArray(normalized));
}

function cacheWorkspace(data) {
  const workspace = data && typeof data === 'object' ? data : {};
  remoteCache.drawing = stable(workspace.drawing || {});
  remoteCache.notes = stable(workspace.notes || {});
  remoteCache.boardTasks = stable(workspace.boardTasks || {});
  remoteCache.boardPractices = stable(workspace.boardPractices || {});
  remoteCache.window = stable(workspace.window || {});
}

function applyInitialWorkspace(data) {
  const workspace = data && typeof data === 'object' ? data : {};
  cacheWorkspace(workspace);
  bridge.applySharedPart('drawing', mapToArray(workspace.drawing || {}));
  bridge.applySharedPart('notes', mapToArray(workspace.notes || {}));
  bridge.applySharedPart('boardTasks', mapToArray(workspace.boardTasks || {}));
  bridge.applySharedPart('boardPractices', mapToArray(workspace.boardPractices || {}));
  if (workspace.window) bridge.applySharedPart('window', workspace.window);
}

function subscribeWorkspaceParts() {
  onValue(drawingRef, snapshot => applyMapPart('drawing', snapshot.val()));
  onValue(notesRef, snapshot => applyMapPart('notes', snapshot.val()));
  onValue(boardTasksRef, snapshot => applyMapPart('boardTasks', snapshot.val()));
  onValue(boardPracticesRef, snapshot => applyMapPart('boardPractices', snapshot.val()));
  onValue(windowRef, snapshot => {
    const value = snapshot.val() || {};
    const fp = stable(value);
    remoteCache.window = fp;
    if (stable(bridge.getSharedSnapshot().window) !== fp) bridge.applySharedPart('window', value);
  });
}

async function initializeWorkspace() {
  try {
    const snapshot = await get(workspaceRef);
    if (!snapshot.exists()) {
      const parts = localParts();
      await set(workspaceRef, {
        ...parts,
        meta: { schemaVersion: 1, seededBy: me, updatedAt: serverTimestamp() }
      });
      cacheWorkspace(parts);
    } else {
      applyInitialWorkspace(snapshot.val());
    }
    bootstrapped = true;
    subscribeWorkspaceParts();
  } catch (error) {
    console.error('ONLINE-P1.3 workspace inicijavimo klaida', error);
    setUi('error', 'Firebase Rules klaida');
  }
}

initializeWorkspace();

function normalizeLiveStroke(item) {
  if (!item || typeof item !== 'object') return null;

  // ONLINE-P1 / P1.1 suderinamumas: visas brūkšnys buvo perrašomas vienu masyvu.
  if (Array.isArray(item.points)) {
    if (!item.points.length) return null;
    return item;
  }

  // ONLINE-P1.3: siunčiame tik naujus taškų gabalus. Taip nereikia per kiekvieną
  // judesį iš naujo siųsti viso vis ilgėjančio brūkšnio, todėl rašymas kitame
  // ekrane pradeda rodytis dar neatitraukus pieštuko.
  if (!item.chunks || typeof item.chunks !== 'object') return null;
  const points = [];
  for (const key of Object.keys(item.chunks).sort()) {
    const chunk = item.chunks[key];
    if (!chunk || !Array.isArray(chunk.points)) continue;
    for (const point of chunk.points) {
      if (point && Number.isFinite(Number(point.x)) && Number.isFinite(Number(point.y))) {
        points.push({ x: Number(point.x), y: Number(point.y) });
      }
    }
  }
  if (!points.length) return null;
  return {
    id: item.id || 'live-stroke',
    mode: item.mode === 'eraser' ? 'eraser' : 'pen',
    width: Number(item.width) || (item.mode === 'eraser' ? 22 : 2.6),
    points,
    updatedAt: item.updatedAt || 0
  };
}

onValue(liveRef, snapshot => {
  const raw = snapshot.val() || {};
  const now = Date.now();
  const strokes = [];
  for (const [client, value] of Object.entries(raw)) {
    if (client === me || !value || typeof value !== 'object') continue;
    // Vienas klientas gali turėti kelis dar nepatvirtintus brūkšnius.
    const candidates = (Array.isArray(value.points) || value.chunks) ? [value] : Object.values(value);
    for (const item of candidates) {
      const stroke = normalizeLiveStroke(item);
      if (!stroke) continue;
      if (stroke.updatedAt && now - Number(stroke.updatedAt) >= 30000) continue;
      strokes.push(stroke);
    }
  }
  bridge.setRemoteLiveStrokes(strokes);
});

onValue(connectedRef, snapshot => {
  if (snapshot.val() === true) {
    set(presenceRef, { online: true, joinedAt: Date.now(), updatedAt: serverTimestamp() });
    onDisconnect(presenceRef).remove();
    onDisconnect(myLiveRootRef).remove();
    const localNote = location.protocol === 'file:' ? 'Prisijungta · lokalus failas' : 'Prisijungta · bendra lenta';
    setUi('online', localNote);
  } else {
    setUi('offline', 'Nėra ryšio');
  }
}, error => {
  console.error('ONLINE-P1.3 connection klaida', error);
  setUi('error', 'Nepavyko prisijungti');
});

onValue(presenceListRef, snapshot => {
  const count = Object.values(snapshot.val() || {}).filter(Boolean).length;
  if (usersEl) {
    usersEl.textContent = String(count);
    usersEl.title = `Prisijungę langai: ${count}`;
  }
});

window.addEventListener('p772:shared-state-changed', () => {
  clearTimeout(window.__p772OnlinePublishTimer);
  window.__p772OnlinePublishTimer = setTimeout(publishLocalChanges, 90);
});

function streamFor(stroke) {
  let stream = liveStreams.get(stroke.id);
  if (!stream) {
    stream = {
      sentPoints: 0,
      sequence: 0,
      latestStroke: stroke,
      timer: null,
      lastFlushAt: 0
    };
    liveStreams.set(stroke.id, stream);
  }
  stream.latestStroke = stroke;
  return stream;
}

function liveChunkKey(sequence) {
  return `c${String(sequence).padStart(6, '0')}`;
}

function flushLiveDelta(strokeId, force = false) {
  const stream = liveStreams.get(strokeId);
  const stroke = stream?.latestStroke;
  if (!stream || !stroke?.id) return;
  if (stream.timer) { clearTimeout(stream.timer); stream.timer = null; }

  const points = Array.isArray(stroke.points) ? stroke.points : [];
  if (stream.sentPoints >= points.length && !force) return;

  const from = stream.sentPoints;
  const delta = points.slice(from);
  if (!delta.length && !force) return;

  // sentPoints keliame prieš asinchroninį rašymą, kad greiti pointermove įvykiai
  // nesukurtų tų pačių taškų dublikatų. Firebase SDK pats eilėje išlaiko writes.
  stream.sentPoints = points.length;
  const chunkKey = liveChunkKey(stream.sequence++);
  stream.lastFlushAt = performance.now();

  const updates = {
    id: stroke.id,
    mode: stroke.mode,
    width: stroke.width,
    clientId: me,
    updatedAt: Date.now()
  };
  if (delta.length) {
    updates[`chunks/${chunkKey}`] = { points: delta, updatedAt: Date.now() };
  }
  if (force) updates.ended = true;

  update(myLiveStrokeRef(stroke.id), updates).catch(error => {
    console.warn('ONLINE-P1.3 live delta klaida', error);
  });
}

function scheduleLiveDelta(stroke, immediate = false) {
  const stream = streamFor(stroke);
  const elapsed = performance.now() - stream.lastFlushAt;
  if (immediate || elapsed >= LIVE_STREAM_INTERVAL_MS) {
    flushLiveDelta(stroke.id, false);
    return;
  }
  if (!stream.timer) {
    stream.timer = setTimeout(() => flushLiveDelta(stroke.id, false), Math.max(0, LIVE_STREAM_INTERVAL_MS - elapsed));
  }
}

window.addEventListener('p772:live-stroke', event => {
  const detail = event.detail || {};
  const stroke = detail.stroke;
  if (!stroke?.id) return;

  if (detail.phase === 'start') {
    // Pirmą tašką išsiunčiame nedelsiant – kitas ekranas pradeda piešti iš karto.
    scheduleLiveDelta(stroke, true);
    return;
  }

  if (detail.phase === 'update') {
    scheduleLiveDelta(stroke, false);
    return;
  }

  if (detail.phase === 'end') {
    const stream = streamFor(stroke);
    if (stream.timer) { clearTimeout(stream.timer); stream.timer = null; }
    flushLiveDelta(stroke.id, true);

    const previousTimer = pendingLiveCommits.get(stroke.id);
    if (previousTimer) clearTimeout(previousTimer);
    const fallbackTimer = setTimeout(() => {
      pendingLiveCommits.delete(stroke.id);
      liveStreams.delete(stroke.id);
      remove(myLiveStrokeRef(stroke.id)).catch(() => {});
    }, 2500);
    pendingLiveCommits.set(stroke.id, fallbackTimer);

    // Persistuojame iš karto, bet gyvas srautas lieka matomas iki drawing patvirtinimo,
    // todėl nėra tarpinio dingimo tarp „rašoma“ ir „išsaugota“.
    publishLocalChanges();
  }
});

if (copyButton) {
  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      bridge.showToast(location.protocol === 'file:'
        ? 'Nuoroda nukopijuota. Kitam įrenginiui ji veiks tik patalpinus lentą internete.'
        : 'Bendros lentos nuoroda nukopijuota');
    } catch (_) {
      window.prompt('Nukopijuok šią nuorodą:', window.location.href);
    }
  });
}

if (newButton) {
  newButton.addEventListener('click', () => {
    const url = new URL(window.location.href);
    url.searchParams.set('room', newRoomId());
    window.location.href = url.toString();
  });
}

window.addEventListener('beforeunload', () => {
  remove(myLiveRootRef).catch(() => {});
  remove(presenceRef).catch(() => {});
});

if (location.protocol === 'file:') {
  console.info('ONLINE-P1.3 veikia su Firebase ir iš lokalaus failo, tačiau bendrinama file:// nuoroda kitame kompiuteryje neveiks. Patalpinkite aplanką statiniame hostinge.');
}
