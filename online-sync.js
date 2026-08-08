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
const previewButton = document.getElementById('previewStudentButton');
const newButton = document.getElementById('newSessionButton');
const roleBadge = document.getElementById('onlineRoleBadge');

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
  let startsBlank = url.searchParams.get('new') === '1';

  if (!room) {
    room = newRoomId();
    startsBlank = true;
    url.searchParams.set('room', room);
  }

  // „new=1“ yra tik vienkartinis paleidimo ženklas. Jo negalima palikti
  // bendrinamoje nuorodoje, nes kitas prisijungęs langas vėl išvalytų kambarį.
  url.searchParams.delete('new');
  try {
    history.replaceState(null, '', url);
  } catch (_) {
    /* URL išvalymas nėra kritinis sinchronizacijai. */
  }

  return { room, startsBlank };
}

function resolveAccessRole() {
  const url = new URL(window.location.href);
  const requested = String(url.searchParams.get('role') || '').toLowerCase();
  const legacyStudent = url.searchParams.get('student') === '1';
  // ONLINE-P1.1.3: rolę visada lemia nuoroda. Vietinė ankstesnė būsena jos
  // perrašyti negali. Be rolės atidarytas adresas yra mokytojo adresas.
  const role = requested === 'student' || legacyStudent ? 'student' : 'teacher';
  url.searchParams.set('role', role);
  url.searchParams.delete('student');
  try { history.replaceState(null, '', url); } catch (_) {}
  return role;
}

function urlForRoom(targetRoom, role) {
  const url = new URL(window.location.href);
  url.searchParams.set('room', targetRoom);
  url.searchParams.set('role', role === 'student' ? 'student' : 'teacher');
  url.searchParams.delete('student');
  url.searchParams.delete('new');
  return url;
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

const roomInfo = resolveRoom();
const roomId = roomInfo.room;
const onlineRole = resolveAccessRole();
const me = clientId();
if (roomEl) roomEl.textContent = roomId;
if (roleBadge) roleBadge.textContent = onlineRole === 'teacher' ? 'Mokytojas' : 'Mokinys';
bridge.setOnlineRole?.(onlineRole);
if (copyButton) copyButton.hidden = onlineRole !== 'teacher';
if (previewButton) previewButton.hidden = onlineRole !== 'teacher';
if (newButton) newButton.hidden = onlineRole !== 'teacher';

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
const transitionRef = ref(db, `p772Rooms/${roomId}/control/transition`);
const connectedRef = ref(db, '.info/connected');

let bootstrapped = false;
let liveTimer = null;
let pendingLive = null;
const pendingLiveCommits = new Map();
let remoteCache = {
  drawing: '', notes: '', boardTasks: '', boardPractices: '', window: ''
};

// P2-SPLIT-P1.1: Firebase gali grąžinti mūsų pačių ankstesnę būseną tuo metu,
// kai vartotojas jau įvedė kitą raidę / formulės simbolį. Jei tokią senesnę
// savo būseną aklai pritaikytume, renderBoardObjects() sunaikintų aktyvų DOM
// lauką, dingtų focus / žymeklis, o formulėje kitas simbolis galėtų pakeisti
// ankstesnį. Laikome neseniai išsiųstų pilnų dalių fingerprintus ir jų echo
// priimame tik kaip Firebase patvirtinimą, bet neperpiešiame lokalaus vaizdo.
const pendingLocalEchoes = {
  drawing: [], notes: [], boardTasks: [], boardPractices: [], window: []
};

function rememberLocalEcho(part, value) {
  const bucket = pendingLocalEchoes[part];
  if (!bucket) return '';
  const fp = stable(value);
  if (!bucket.includes(fp)) bucket.push(fp);
  if (bucket.length > 24) bucket.splice(0, bucket.length - 24);
  return fp;
}

function consumeLocalEcho(part, fp) {
  const bucket = pendingLocalEchoes[part];
  if (!bucket?.length) return false;
  const index = bucket.indexOf(fp);
  if (index < 0) return false;
  // Firebase gali sujungti kelis greitus update ir neatsiųsti kiekvienos
  // tarpinės būsenos atskiru callback'u. Jei gavome vėlesnį savo echo,
  // ankstesni laukimai taip pat nebeaktualūs.
  bucket.splice(0, index + 1);
  return true;
}

function forgetLocalEcho(part, fp) {
  if (!fp) return;
  const bucket = pendingLocalEchoes[part];
  const index = bucket?.indexOf(fp) ?? -1;
  if (index >= 0) bucket.splice(index, 1);
}

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

  const changed = {
    drawing: stable(parts.drawing) !== remoteCache.drawing,
    notes: stable(parts.notes) !== remoteCache.notes,
    boardTasks: stable(parts.boardTasks) !== remoteCache.boardTasks,
    boardPractices: stable(parts.boardPractices) !== remoteCache.boardPractices,
    window: stable(parts.window) !== remoteCache.window
  };

  diffMap('workspace/drawing', parts.drawing, currentRemote.drawing, updates);
  diffMap('workspace/notes', parts.notes, currentRemote.notes, updates);
  diffMap('workspace/boardTasks', parts.boardTasks, currentRemote.boardTasks, updates);
  diffMap('workspace/boardPractices', parts.boardPractices, currentRemote.boardPractices, updates);
  if (changed.window) updates['workspace/window'] = parts.window;

  if (!Object.keys(updates).length) return;

  const echoes = {};
  for (const part of ['drawing', 'notes', 'boardTasks', 'boardPractices', 'window']) {
    if (changed[part]) echoes[part] = rememberLocalEcho(part, parts[part]);
  }

  updates['workspace/meta/updatedAt'] = serverTimestamp();
  updates['workspace/meta/updatedBy'] = me;
  try {
    await update(roomRef, updates);
  } catch (error) {
    for (const [part, fp] of Object.entries(echoes)) forgetLocalEcho(part, fp);
    console.error('P2-SPLIT-P1.1 publish klaida', error);
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
    // Persistent brūkšnys jau atkeliavo į workspace. Gyvą kopiją pašaliname tik
    // po trumpo dažymo ciklo, kad kitame ekrane nebūtų tuščio kadro / mirktelėjimo.
    setTimeout(() => remove(myLiveStrokeRef(strokeId)).catch(() => {}), 70);
  }
}

function applyMapPart(part, raw) {
  const normalized = raw && typeof raw === 'object' ? raw : {};
  const fp = stable(normalized);
  const ownEcho = consumeLocalEcho(part, fp);
  remoteCache[part] = fp;
  if (part === 'drawing') settleCommittedLiveStrokes(normalized);

  // Mūsų pačių senesnis Firebase echo nėra nauja nuotolinė informacija.
  // Ypač svarbu notes: jo pritaikymas perrenderintų contenteditable / MathLive
  // ir nutrauktų tekstą po pirmos raidės ar formulę po pirmo simbolio.
  if (ownEcho) return;
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
    const ownEcho = consumeLocalEcho('window', fp);
    remoteCache.window = fp;
    if (ownEcho) return;
    if (stable(bridge.getSharedSnapshot().window) !== fp) bridge.applySharedPart('window', value);
  });
}

function emptyWorkspace() {
  return {
    drawing: {},
    notes: {},
    boardTasks: {},
    boardPractices: {},
    window: {}
  };
}

function clearLocalSharedWorkspace() {
  bridge.applySharedPart('drawing', []);
  bridge.applySharedPart('notes', []);
  bridge.applySharedPart('boardTasks', []);
  bridge.applySharedPart('boardPractices', []);
  bridge.applySharedPart('window', {});
  bridge.setRemoteLiveStrokes([]);
}

// Nauja sesija turi atrodyti tuščia iš karto, dar prieš Firebase atsakymą.
// Ankstesnėje P1.1 versijoje naujas tuščias Firebase kambarys būdavo
// automatiškai „užsėjamas“ sena localStorage lenta, todėl „Nauja sesija“
// vizualiai nieko nepakeisdavo.
if (roomInfo.startsBlank) clearLocalSharedWorkspace();

async function initializeWorkspace() {
  try {
    const snapshot = await get(workspaceRef);

    if (roomInfo.startsBlank || !snapshot.exists()) {
      const blank = emptyWorkspace();
      await set(workspaceRef, {
        ...blank,
        meta: { schemaVersion: 1, seededBy: me, updatedAt: serverTimestamp() }
      });
      applyInitialWorkspace(blank);
    } else {
      applyInitialWorkspace(snapshot.val());
    }

    bootstrapped = true;
    subscribeWorkspaceParts();
  } catch (error) {
    console.error('ONLINE-P1.1.3 workspace inicijavimo klaida', error);
    setUi('error', 'Firebase Rules klaida');
  }
}

initializeWorkspace();

onValue(liveRef, snapshot => {
  const raw = snapshot.val() || {};
  const now = Date.now();
  const strokes = [];
  for (const [client, value] of Object.entries(raw)) {
    if (client === me || !value || typeof value !== 'object') continue;
    // Suderinamumas su ONLINE-P1: ten vienam klientui buvo saugomas vienas brūkšnys.
    const candidates = Array.isArray(value.points) ? [value] : Object.values(value);
    for (const item of candidates) {
      if (!item || !Array.isArray(item.points) || !item.points.length) continue;
      if (item.updatedAt && now - Number(item.updatedAt) >= 30000) continue;
      strokes.push(item);
    }
  }
  bridge.setRemoteLiveStrokes(strokes);
});

let transitionInProgress = false;
onValue(transitionRef, snapshot => {
  const data = snapshot.val();
  const nextRoom = safeRoom(data?.toRoom);
  if (!nextRoom || nextRoom === roomId || transitionInProgress) return;
  transitionInProgress = true;
  const target = urlForRoom(nextRoom, onlineRole);
  bridge.showToast?.('Mokytojas pradėjo naują sesiją');
  // replace() nepalieka seno kambario kaip tarpinio Back istorijos žingsnio.
  setTimeout(() => window.location.replace(target.toString()), 80);
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
  console.error('ONLINE-P1.1.3 connection klaida', error);
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

async function writeLiveStroke(stroke) {
  if (!stroke?.id) return;
  try {
    await set(myLiveStrokeRef(stroke.id), { ...stroke, updatedAt: Date.now(), clientId: me });
  } catch (error) {
    console.warn('ONLINE-P1.1.3 live stroke klaida', error);
  }
}

async function sendLive() {
  liveTimer = null;
  if (!pendingLive) return;
  const payload = pendingLive;
  pendingLive = null;
  await writeLiveStroke(payload);
}

window.addEventListener('p772:live-stroke', event => {
  const detail = event.detail || {};
  const stroke = detail.stroke;
  if (!stroke?.id) return;

  if (detail.phase === 'end') {
    // ONLINE-P1 pašalindavo gyvą brūkšnį iš karto, o nuolatinė kopija dar
    // kelias dešimtis / šimtus ms keliaudavo per Firebase. Dėl to nuotoliniame
    // ekrane brūkšnys akimirkai dingdavo ir vėl atsirasdavo.
    pendingLive = null;
    if (liveTimer) { clearTimeout(liveTimer); liveTimer = null; }
    writeLiveStroke(stroke); // paliekame galutinę gyvą kopiją iki persistavimo

    const previousTimer = pendingLiveCommits.get(stroke.id);
    if (previousTimer) clearTimeout(previousTimer);
    const fallbackTimer = setTimeout(() => {
      pendingLiveCommits.delete(stroke.id);
      remove(myLiveStrokeRef(stroke.id)).catch(() => {});
    }, 2500);
    pendingLiveCommits.set(stroke.id, fallbackTimer);

    // Brūkšnys state.drawing jau yra, todėl nereikia laukti lokalaus 180 ms save debounce.
    // Iš karto perduodame jį į workspace; gyva kopija bus nuimta tik gavus
    // patvirtinimą per drawing listenerį.
    publishLocalChanges();
    return;
  }

  pendingLive = stroke;
  if (!liveTimer) liveTimer = setTimeout(sendLive, 40);
});

function openStudentPreview() {
  if (onlineRole !== 'teacher') return;
  const studentUrl = urlForRoom(roomId, 'student').toString();
  // noopener svarbus ir tam, kad naujas skirtukas negautų mokytojo lango
  // sessionStorage kopijos kaip savo identiteto. Naudojame <a>, kad
  // naršyklės nesukurtų dviejų skirtukų dėl window.open grąžinimo ypatumų.
  const link = document.createElement('a');
  link.href = studentUrl;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  link.remove();
}

// app.js mokytojo rengyklėje esantis „Išbandyti kaip mokiniui“ taip pat
// naudoja tą patį atskirą mokinio langą, o ne pakeičia mokytojo rolę.
window.addEventListener('p772:open-student-preview', openStudentPreview);

if (previewButton) previewButton.addEventListener('click', openStudentPreview);

if (copyButton) {
  copyButton.addEventListener('click', async () => {
    try {
      const studentUrl = urlForRoom(roomId, 'student').toString();
      await navigator.clipboard.writeText(studentUrl);
      bridge.showToast(location.protocol === 'file:'
        ? 'Mokinio nuoroda nukopijuota. Kitam įrenginiui ji veiks tik patalpinus lentą internete.'
        : 'Mokinio nuoroda nukopijuota');
    } catch (_) {
      window.prompt('Nukopijuok mokiniui šią nuorodą:', urlForRoom(roomId, 'student').toString());
    }
  });
}

if (newButton) {
  newButton.addEventListener('click', async () => {
    if (onlineRole !== 'teacher' || transitionInProgress) return;
    if (!window.confirm('Pradėti naują tuščią sesiją ir perkelti į ją visus prie šios lentos prisijungusius dalyvius?')) return;

    newButton.disabled = true;
    const nextRoom = newRoomId();
    try {
      const nextWorkspaceRef = ref(db, `p772Rooms/${nextRoom}/workspace`);
      const blank = emptyWorkspace();
      await set(nextWorkspaceRef, {
        ...blank,
        meta: { schemaVersion: 1, seededBy: me, updatedAt: serverTimestamp() }
      });
      // Pirmiausia paruošiame naują tuščią kambarį, tik tada paskelbiame perėjimą.
      // Senajame kambaryje ši nuoroda lieka ir vėliau prisijungusį mokinį taip pat
      // nukreips į naujausią sesiją.
      await set(transitionRef, { toRoom: nextRoom, issuedBy: me, issuedAt: serverTimestamp() });
    } catch (error) {
      console.error('ONLINE-P1.1.3 naujos sesijos klaida', error);
      newButton.disabled = false;
      bridge.showToast?.('Nepavyko pradėti naujos sesijos');
    }
  });
}

window.addEventListener('beforeunload', () => {
  remove(myLiveRootRef).catch(() => {});
  remove(presenceRef).catch(() => {});
});

if (location.protocol === 'file:') {
  console.info('ONLINE-P1.1.3 veikia su Firebase ir iš lokalaus failo, tačiau bendrinama file:// nuoroda kitame kompiuteryje neveiks. Patalpinkite aplanką statiniame hostinge.');
}
