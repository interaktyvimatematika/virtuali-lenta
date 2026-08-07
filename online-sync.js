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
const myLiveRef = ref(db, `p772Rooms/${roomId}/liveStrokes/${me}`);
const presenceRef = ref(db, `p772Rooms/${roomId}/presence/${me}`);
const presenceListRef = ref(db, `p772Rooms/${roomId}/presence`);
const connectedRef = ref(db, '.info/connected');

let bootstrapped = false;
let liveTimer = null;
let pendingLive = null;
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
    console.error('ONLINE-P1 publish klaida', error);
    setUi('error', 'Sinchronizavimo klaida');
  }
}

function applyMapPart(part, raw) {
  const normalized = raw && typeof raw === 'object' ? raw : {};
  const fp = stable(normalized);
  remoteCache[part] = fp;
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
    console.error('ONLINE-P1 workspace inicijavimo klaida', error);
    setUi('error', 'Firebase Rules klaida');
  }
}

initializeWorkspace();

onValue(liveRef, snapshot => {
  const raw = snapshot.val() || {};
  const now = Date.now();
  const strokes = Object.entries(raw)
    .filter(([id, item]) => id !== me && item && Array.isArray(item.points) && item.points.length)
    .map(([, item]) => item)
    .filter(item => !item.updatedAt || now - Number(item.updatedAt) < 30000);
  bridge.setRemoteLiveStrokes(strokes);
});

onValue(connectedRef, snapshot => {
  if (snapshot.val() === true) {
    set(presenceRef, { online: true, joinedAt: Date.now(), updatedAt: serverTimestamp() });
    onDisconnect(presenceRef).remove();
    onDisconnect(myLiveRef).remove();
    const localNote = location.protocol === 'file:' ? 'Prisijungta · lokalus failas' : 'Prisijungta · bendra lenta';
    setUi('online', localNote);
  } else {
    setUi('offline', 'Nėra ryšio');
  }
}, error => {
  console.error('ONLINE-P1 connection klaida', error);
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

async function sendLive() {
  liveTimer = null;
  if (!pendingLive) return;
  const payload = pendingLive;
  pendingLive = null;
  try {
    await set(myLiveRef, { ...payload, updatedAt: Date.now(), clientId: me });
  } catch (error) {
    console.warn('ONLINE-P1 live stroke klaida', error);
  }
}

window.addEventListener('p772:live-stroke', event => {
  const detail = event.detail || {};
  if (detail.phase === 'end') {
    pendingLive = null;
    if (liveTimer) { clearTimeout(liveTimer); liveTimer = null; }
    remove(myLiveRef).catch(() => {});
    return;
  }
  if (!detail.stroke) return;
  pendingLive = detail.stroke;
  if (!liveTimer) liveTimer = setTimeout(sendLive, 55);
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
  remove(myLiveRef).catch(() => {});
  remove(presenceRef).catch(() => {});
});

if (location.protocol === 'file:') {
  console.info('ONLINE-P1 veikia su Firebase ir iš lokalaus failo, tačiau bendrinama file:// nuoroda kitame kompiuteryje neveiks. Patalpinkite aplanką statiniame hostinge.');
}
