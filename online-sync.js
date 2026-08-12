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
  // P2-SPLIT-P2.4.7.19.4.5: stay=1 yra tik rankiniu būdu įjungiamas
  // mokytojo istorinis / diagnostinis režimas. Jo negalima paveldėti į
  // mokinio nuorodą ar automatinį perėjimą į kitą sesiją.
  url.searchParams.delete('stay');
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

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== 'object') return value ?? null;
  const result = {};
  Object.keys(value).sort().forEach(key => {
    const item = value[key];
    if (item !== undefined) result[key] = canonicalize(item);
  });
  return result;
}

function stable(value) {
  return JSON.stringify(canonicalize(value));
}

const roomInfo = resolveRoom();
let roomId = roomInfo.room;
const onlineRole = resolveAccessRole();
// P2-SPLIT-P2.4.7.19.4.5: &stay=1 yra aiškiai rankiniu būdu įjungiamas
// istorinis / diagnostinis režimas. Jis veikia tiek mokytojo, tiek mokinio
// rolei, kad būtų galima apžiūrėti abi seno Room puses nepaisant transition.
// Įprastai generuojamos nuorodos stay parametro nepaveldi.
let stayOnRoom = new URL(window.location.href).searchParams.get('stay') === '1';
const me = clientId();
if (roomEl) roomEl.textContent = roomId;
if (roleBadge) roleBadge.textContent = onlineRole === 'teacher' ? 'Mokytojas' : 'Mokinys';
bridge.setOnlineRole?.(onlineRole);
if (copyButton) copyButton.hidden = onlineRole !== 'teacher';
if (previewButton) previewButton.hidden = onlineRole !== 'teacher';
if (newButton) {
  newButton.hidden = onlineRole !== 'teacher';
  if (stayOnRoom) {
    newButton.disabled = true;
    newButton.title = 'Istoriniame stay=1 režime nauja sesija nekuriama';
  }
}

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// P2-SPLIT-P2.5-P2: mokinių sąrašas nėra Room dalis. Kiekviena mokytojo
// naršyklė gauna ilgalaikį atsitiktinį profilio ID; jis niekada nepridedamas
// prie mokinio nuorodos. Tai dar nėra paskyrų/autentifikacijos sistema, bet
// neleidžia skirtingų mokytojų sąrašams susimaišyti viename bendrame mazge.
const TEACHER_PROFILE_STORAGE_KEY = 'p772-teacher-profile-id-v1';
function newTeacherProfileId() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(18);
  crypto.getRandomValues(bytes);
  return `T-${Array.from(bytes, value => alphabet[value % alphabet.length]).join('')}`;
}
function resolveTeacherProfileId() {
  if (onlineRole !== 'teacher') return '';
  let value = '';
  try { value = String(localStorage.getItem(TEACHER_PROFILE_STORAGE_KEY) || '').trim().toUpperCase(); } catch (_) {}
  if (!/^T-[A-Z2-9]{12,32}$/.test(value)) {
    value = newTeacherProfileId();
    try { localStorage.setItem(TEACHER_PROFILE_STORAGE_KEY, value); } catch (_) {}
  }
  return value;
}
const teacherProfileId = resolveTeacherProfileId();
const teacherProfileRef = teacherProfileId ? ref(db, `p772TeacherProfiles/${teacherProfileId}`) : null;
let teacherProfileCache = { students: {}, roomLinks: {}, classSessions: {}, scheduleEntries: {}, scheduleRuns: {} };

let roomRef;
let workspaceRef;
let drawingRef;
let notesRef;
let boardImagesRef;
let boardTasksRef;
let boardPracticesRef;
let windowRef;
let boardGeometryRef;
let liveRef;
let myLiveRootRef;
let presenceRef;
let presenceListRef;
let transitionRef;
let p2AssignmentRef;
let p2ProgressRef;
let p2StudentProfileRef;
const connectedRef = ref(db, '.info/connected');

function bindRoomRefs(targetRoom) {
  roomRef = ref(db, `p772Rooms/${targetRoom}`);
  workspaceRef = ref(db, `p772Rooms/${targetRoom}/workspace`);
  drawingRef = ref(db, `p772Rooms/${targetRoom}/workspace/drawing`);
  notesRef = ref(db, `p772Rooms/${targetRoom}/workspace/notes`);
  boardImagesRef = ref(db, `p772Rooms/${targetRoom}/workspace/boardImages`);
  boardTasksRef = ref(db, `p772Rooms/${targetRoom}/workspace/boardTasks`);
  boardPracticesRef = ref(db, `p772Rooms/${targetRoom}/workspace/boardPractices`);
  windowRef = ref(db, `p772Rooms/${targetRoom}/workspace/window`);
  boardGeometryRef = ref(db, `p772Rooms/${targetRoom}/workspace/boardGeometry`);
  liveRef = ref(db, `p772Rooms/${targetRoom}/liveStrokes`);
  myLiveRootRef = ref(db, `p772Rooms/${targetRoom}/liveStrokes/${me}`);
  presenceRef = ref(db, `p772Rooms/${targetRoom}/presence/${me}`);
  presenceListRef = ref(db, `p772Rooms/${targetRoom}/presence`);
  transitionRef = ref(db, `p772Rooms/${targetRoom}/control/transition`);
  p2AssignmentRef = ref(db, `p772Rooms/${targetRoom}/p2/student/assignment`);
  p2ProgressRef = ref(db, `p772Rooms/${targetRoom}/p2/student/progress`);
  p2StudentProfileRef = ref(db, `p772Rooms/${targetRoom}/p2/student/profile`);
}
bindRoomRefs(roomId);

function myLiveStrokeRef(strokeId) {
  const safeId = String(strokeId || 'stroke').replace(/[.#$\[\]/]/g, '-');
  return ref(db, `p772Rooms/${roomId}/liveStrokes/${me}/${safeId}`);
}

// P2-SPLIT-P1.7: individualios pratybos nėra canvas objektas. Vienai dabartinio
// prototipo mokinio vietai kambaryje saugome tik priskyrimą ir pedagogiškai
// svarbią eigą. Langų dydžiai, split santykis ir scroll pozicijos čia nepatenka.

let bootstrapped = false;
let liveTimer = null;
let pendingLive = null;
const pendingLiveCommits = new Map();
let remoteCache = {
  drawing: '', notes: '', boardImages: '', boardTasks: '', boardPractices: '', window: '', boardGeometry: ''
};
let pendingRemoteNotes = null;
let localNotesRevision = 0;
let notesLiveTimer = null;
let notesLiveQueued = false;
let notesLivePublishing = false;
let lastNotesLivePublishAt = 0;
const NOTES_LIVE_INTERVAL_MS = 55;

// P2-SPLIT-P2.5-P4-P1.2: mokytojo pamokos skirtukai gali pakeisti aktyvų Room
// neperkraudami viso puslapio. Visi su Room susieti listeneriai registruojami
// vienoje vietoje ir prieš perėjimą patikimai atjungiami.
let roomGeneration = 0;
let roomSubscriptions = [];
let connectedNow = false;
let presenceDisconnectHandle = null;
let liveDisconnectHandle = null;
let activePresenceRoom = '';

function roomOnValue(targetRef, callback, errorCallback) {
  const generation = roomGeneration;
  const unsubscribe = onValue(targetRef, snapshot => {
    if (generation !== roomGeneration) return;
    callback(snapshot);
  }, error => {
    if (generation !== roomGeneration) return;
    if (errorCallback) errorCallback(error);
  });
  roomSubscriptions.push(unsubscribe);
  return unsubscribe;
}

function clearRoomSubscriptions() {
  for (const unsubscribe of roomSubscriptions.splice(0)) {
    try { unsubscribe?.(); } catch (_) {}
  }
}

function resetRoomRuntimeState() {
  bootstrapped = false;
  pendingLive = null;
  if (liveTimer) { clearTimeout(liveTimer); liveTimer = null; }
  if (notesLiveTimer) { clearTimeout(notesLiveTimer); notesLiveTimer = null; }
  clearTimeout(window.__p772OnlinePublishTimer);
  window.__p772OnlinePublishTimer = null;
  notesLiveQueued = false;
  notesLivePublishing = false;
  pendingRemoteNotes = null;
  localNotesRevision = 0;
  remoteCache = { drawing: '', notes: '', boardImages: '', boardTasks: '', boardPractices: '', window: '', boardGeometry: '' };
  for (const bucket of Object.values(pendingLocalEchoes)) bucket.splice(0);
  for (const timer of pendingLiveCommits.values()) if (timer) clearTimeout(timer);
  pendingLiveCommits.clear();
  bridge.setRemoteLiveStrokes([]);
}

async function leaveCurrentRoomPresence() {
  const oldPresenceDisconnect = presenceDisconnectHandle;
  const oldLiveDisconnect = liveDisconnectHandle;
  const oldLiveRootRef = myLiveRootRef;
  const oldPresenceRef = presenceRef;
  presenceDisconnectHandle = null;
  liveDisconnectHandle = null;
  activePresenceRoom = '';
  await Promise.allSettled([
    oldPresenceDisconnect?.cancel?.(),
    oldLiveDisconnect?.cancel?.(),
    remove(oldLiveRootRef),
    remove(oldPresenceRef)
  ].filter(Boolean));
}

async function activateCurrentRoomPresence(generation = roomGeneration) {
  if (!connectedNow || generation !== roomGeneration) return;
  if (activePresenceRoom === roomId && presenceDisconnectHandle && liveDisconnectHandle) return;
  const presenceRoom = roomId;
  const localPresenceRef = presenceRef;
  const localLiveRootRef = myLiveRootRef;
  try {
    await set(localPresenceRef, { online: true, joinedAt: Date.now(), updatedAt: serverTimestamp() });
    if (generation !== roomGeneration) {
      remove(localPresenceRef).catch(() => {});
      return;
    }
    presenceDisconnectHandle = onDisconnect(localPresenceRef);
    liveDisconnectHandle = onDisconnect(localLiveRootRef);
    await presenceDisconnectHandle.remove();
    await liveDisconnectHandle.remove();
    if (generation === roomGeneration && presenceRoom === roomId) activePresenceRoom = presenceRoom;
  } catch (error) {
    console.warn('P2-SPLIT-P2.5-P4-P1.2 presence perjungimo klaida', error);
  }
}

// P2-SPLIT-P1.1: Firebase gali grąžinti mūsų pačių ankstesnę būseną tuo metu,
// kai vartotojas jau įvedė kitą raidę / formulės simbolį. Jei tokią senesnę
// savo būseną aklai pritaikytume, renderBoardObjects() sunaikintų aktyvų DOM
// lauką, dingtų focus / žymeklis, o formulėje kitas simbolis galėtų pakeisti
// ankstesnį. Laikome neseniai išsiųstų pilnų dalių fingerprintus ir jų echo
// priimame tik kaip Firebase patvirtinimą, bet neperpiešiame lokalaus vaizdo.
const pendingLocalEchoes = {
  drawing: [], notes: [], boardImages: [], boardTasks: [], boardPractices: [], window: [], boardGeometry: []
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
    boardImages: toMap(snap.boardImages),
    boardTasks: toMap(snap.boardTasks),
    boardPractices: toMap(snap.boardPractices),
    window: snap.window || {},
    boardGeometry: snap.boardGeometry || {}
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
    boardImages: JSON.parse(remoteCache.boardImages || '{}'),
    boardTasks: JSON.parse(remoteCache.boardTasks || '{}'),
    boardPractices: JSON.parse(remoteCache.boardPractices || '{}')
  };

  const changed = {
    drawing: stable(parts.drawing) !== remoteCache.drawing,
    notes: stable(parts.notes) !== remoteCache.notes,
    boardImages: stable(parts.boardImages) !== remoteCache.boardImages,
    boardTasks: stable(parts.boardTasks) !== remoteCache.boardTasks,
    boardPractices: stable(parts.boardPractices) !== remoteCache.boardPractices,
    window: stable(parts.window) !== remoteCache.window,
    boardGeometry: stable(parts.boardGeometry) !== remoteCache.boardGeometry
  };

  diffMap('workspace/drawing', parts.drawing, currentRemote.drawing, updates);
  diffMap('workspace/notes', parts.notes, currentRemote.notes, updates);
  diffMap('workspace/boardImages', parts.boardImages, currentRemote.boardImages, updates);
  diffMap('workspace/boardTasks', parts.boardTasks, currentRemote.boardTasks, updates);
  diffMap('workspace/boardPractices', parts.boardPractices, currentRemote.boardPractices, updates);
  if (changed.window) updates['workspace/window'] = parts.window;
  if (changed.boardGeometry) updates['workspace/boardGeometry'] = parts.boardGeometry;

  if (!Object.keys(updates).length) return;

  // P2-SPLIT-P1.7: tekstas ir MathLive negali būti perpiešiami nuo mūsų pačių
  // Firebase aido. Notes pakeitimui pridedame aiškią autoriaus/revizijos žymą,
  // o remote cache atnaujiname optimistiškai dar prieš tinklo round-trip.
  let previousNotesCache = null;
  if (changed.notes) {
    previousNotesCache = remoteCache.notes;
    remoteCache.notes = stable(parts.notes);
    localNotesRevision += 1;
    updates['workspace/meta/notesUpdatedBy'] = me;
    updates['workspace/meta/notesRevision'] = localNotesRevision;
  }

  const echoes = {};
  for (const part of ['drawing', 'notes', 'boardImages', 'boardTasks', 'boardPractices', 'window', 'boardGeometry']) {
    if (changed[part]) echoes[part] = rememberLocalEcho(part, parts[part]);
  }

  updates['workspace/meta/updatedAt'] = serverTimestamp();
  updates['workspace/meta/updatedBy'] = me;
  try {
    await update(roomRef, updates);
  } catch (error) {
    for (const [part, fp] of Object.entries(echoes)) forgetLocalEcho(part, fp);
    if (changed.notes && remoteCache.notes === stable(parts.notes) && previousNotesCache !== null) {
      remoteCache.notes = previousNotesCache;
    }
    console.error('P2-SPLIT-P1.7 publish klaida', error);
    setUi('error', 'Sinchronizavimo klaida');
  }
}

async function publishNotesLive() {
  if (!bootstrapped || notesLivePublishing) {
    notesLiveQueued = true;
    return;
  }

  const notes = toMap(bridge.getSharedSnapshot().notes);
  const notesFp = stable(notes);
  if (notesFp === remoteCache.notes) return;

  let remoteNotes = {};
  try { remoteNotes = JSON.parse(remoteCache.notes || '{}'); } catch (_) { remoteNotes = {}; }
  const updates = {};
  diffMap('workspace/notes', notes, remoteNotes, updates);
  if (!Object.keys(updates).length) return;

  const previousNotesCache = remoteCache.notes;
  remoteCache.notes = notesFp;
  localNotesRevision += 1;
  updates['workspace/meta/notesUpdatedBy'] = me;
  updates['workspace/meta/notesRevision'] = localNotesRevision;
  updates['workspace/meta/updatedAt'] = serverTimestamp();
  updates['workspace/meta/updatedBy'] = me;
  const echoFp = rememberLocalEcho('notes', notes);

  notesLivePublishing = true;
  try {
    await update(roomRef, updates);
  } catch (error) {
    forgetLocalEcho('notes', echoFp);
    if (remoteCache.notes === notesFp) remoteCache.notes = previousNotesCache;
    console.warn('P2-SPLIT-P2.2.3 gyvo lentos teksto sinchronizavimo klaida', error);
  } finally {
    notesLivePublishing = false;
    if (notesLiveQueued) queueNotesLivePublish();
  }
}

function queueNotesLivePublish() {
  notesLiveQueued = true;
  if (!bootstrapped || notesLiveTimer || notesLivePublishing) return;
  const elapsed = Date.now() - lastNotesLivePublishAt;
  const delay = Math.max(0, NOTES_LIVE_INTERVAL_MS - elapsed);
  notesLiveTimer = setTimeout(async () => {
    notesLiveTimer = null;
    if (!notesLiveQueued) return;
    notesLiveQueued = false;
    lastNotesLivePublishAt = Date.now();
    await publishNotesLive();
    if (notesLiveQueued) queueNotesLivePublish();
  }, delay);
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
    // Ref užfiksuojame dabar, kad perjungus mokinio Room vėluojantis timeris
    // negalėtų paliesti naujos lentos liveStrokes mazgo.
    const committedLiveRef = myLiveStrokeRef(strokeId);
    setTimeout(() => remove(committedLiveRef).catch(() => {}), 70);
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

function applyNotesPart(raw, meta = {}) {
  const normalized = raw && typeof raw === 'object' ? raw : {};
  const fp = stable(normalized);
  const author = String(meta?.notesUpdatedBy || '');
  const ownEcho = author === me || consumeLocalEcho('notes', fp);

  // Jei tai mūsų pačių būsena, ji jau yra gyvame DOM. Jokio renderio.
  if (ownEcho) {
    remoteCache.notes = fp;
    return;
  }

  if (fp === remoteCache.notes) return;
  remoteCache.notes = fp;

  // Kito įrenginio teksto pakeitimo neperpiešiame per aktyvų contenteditable/MathLive.
  // Jį pritaikysime iškart, kai vietinis teksto/formulės redagavimas baigsis.
  if (bridge.isSharedNoteEditing?.()) {
    pendingRemoteNotes = { normalized, fp };
    return;
  }

  pendingRemoteNotes = null;
  if (stable(toMap(bridge.getSharedSnapshot().notes)) === fp) return;
  bridge.applySharedPart('notes', mapToArray(normalized));
}

function flushPendingRemoteNotes() {
  if (!pendingRemoteNotes || bridge.isSharedNoteEditing?.()) return;
  const pending = pendingRemoteNotes;
  pendingRemoteNotes = null;
  if (stable(toMap(bridge.getSharedSnapshot().notes)) === pending.fp) return;
  bridge.applySharedPart('notes', mapToArray(pending.normalized));
}

window.addEventListener('p772:shared-note-editing-ended', () => {
  setTimeout(flushPendingRemoteNotes, 0);
});

function cacheWorkspace(data) {
  const workspace = data && typeof data === 'object' ? data : {};
  remoteCache.drawing = stable(workspace.drawing || {});
  remoteCache.notes = stable(workspace.notes || {});
  remoteCache.boardImages = stable(workspace.boardImages || {});
  remoteCache.boardTasks = stable(workspace.boardTasks || {});
  remoteCache.boardPractices = stable(workspace.boardPractices || {});
  remoteCache.window = stable(workspace.window || {});
  remoteCache.boardGeometry = stable(workspace.boardGeometry || {});
}

function applyInitialWorkspace(data) {
  const workspace = data && typeof data === 'object' ? data : {};
  cacheWorkspace(workspace);
  bridge.applySharedPart('boardGeometry', workspace.boardGeometry || { schemaVersion: 1, worldWidth: 2400, worldHeight: 1700, worldOriginX: 0, worldOriginY: 0 });
  bridge.applySharedPart('drawing', mapToArray(workspace.drawing || {}));
  bridge.applySharedPart('notes', mapToArray(workspace.notes || {}));
  bridge.applySharedPart('boardImages', mapToArray(workspace.boardImages || {}));
  bridge.applySharedPart('boardTasks', mapToArray(workspace.boardTasks || {}));
  bridge.applySharedPart('boardPractices', mapToArray(workspace.boardPractices || {}));
  if (workspace.window) bridge.applySharedPart('window', workspace.window);
}

function subscribeWorkspaceParts() {
  roomOnValue(boardGeometryRef, snapshot => {
    const value = snapshot.val() || {};
    const fp = stable(value);
    const ownEcho = consumeLocalEcho('boardGeometry', fp);
    remoteCache.boardGeometry = fp;
    if (ownEcho) return;
    if (stable(bridge.getSharedSnapshot().boardGeometry || {}) !== fp) bridge.applySharedPart('boardGeometry', value);
  });
  roomOnValue(drawingRef, snapshot => applyMapPart('drawing', snapshot.val()));
  // Notes skaitome kartu su jų meta žyma viename atominiame workspace snapshot'e.
  roomOnValue(workspaceRef, snapshot => {
    const workspace = snapshot.val() || {};
    applyNotesPart(workspace.notes || {}, workspace.meta || {});
  });
  roomOnValue(boardImagesRef, snapshot => applyMapPart('boardImages', snapshot.val()));
  roomOnValue(boardTasksRef, snapshot => applyMapPart('boardTasks', snapshot.val()));
  roomOnValue(boardPracticesRef, snapshot => applyMapPart('boardPractices', snapshot.val()));
  roomOnValue(windowRef, snapshot => {
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
    boardImages: {},
    boardTasks: {},
    boardPractices: {},
    window: {},
    boardGeometry: { schemaVersion: 1, worldWidth: 2400, worldHeight: 1700, worldOriginX: 0, worldOriginY: 0 }
  };
}

function clearLocalSharedWorkspace() {
  bridge.applySharedPart('drawing', []);
  bridge.applySharedPart('notes', []);
  bridge.applySharedPart('boardImages', []);
  bridge.applySharedPart('boardTasks', []);
  bridge.applySharedPart('boardPractices', []);
  bridge.applySharedPart('window', {});
  bridge.applySharedPart('boardGeometry', { schemaVersion: 1, worldWidth: 2400, worldHeight: 1700, worldOriginX: 0, worldOriginY: 0 });
  bridge.setRemoteLiveStrokes([]);
}

// Nauja sesija turi atrodyti tuščia iš karto, dar prieš Firebase atsakymą.
// Ankstesnėje P1.1 versijoje naujas tuščias Firebase kambarys būdavo
// automatiškai „užsėjamas“ sena localStorage lenta, todėl „Nauja sesija“
// vizualiai nieko nepakeisdavo.
if (roomInfo.startsBlank) clearLocalSharedWorkspace();

function subscribeLiveStrokes() {
  roomOnValue(liveRef, snapshot => {
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
}

async function initializeWorkspace({ startsBlank = false, generation = roomGeneration, switched = false } = {}) {
  const localWorkspaceRef = workspaceRef;
  const targetRoom = roomId;
  try {
    const snapshot = await get(localWorkspaceRef);
    if (generation !== roomGeneration || targetRoom !== roomId) return;

    if (startsBlank || !snapshot.exists()) {
      const blank = emptyWorkspace();
      await set(localWorkspaceRef, {
        ...blank,
        meta: { schemaVersion: 1, seededBy: me, updatedAt: serverTimestamp() }
      });
      if (generation !== roomGeneration || targetRoom !== roomId) return;
      applyInitialWorkspace(blank);
    } else {
      applyInitialWorkspace(snapshot.val());
    }

    bootstrapped = true;
    subscribeRoomRealtimeListeners(generation);
    // Presence užregistruojame fone; mokinio skirtuko UI neturi laukti dar
    // kelių Firebase round-trip vien tam, kad galėtų parodyti jau užkrautą lentą.
    activateCurrentRoomPresence(generation);
    if (generation !== roomGeneration || targetRoom !== roomId) return;
    setUi('online', location.protocol === 'file:' ? 'Prisijungta · lokalus failas' : 'Prisijungta · bendra lenta');
    if (switched) {
      window.dispatchEvent(new CustomEvent('p2:room-switch-complete', { detail: { roomId: targetRoom } }));
    }
  } catch (error) {
    if (generation !== roomGeneration) return;
    console.error('P2-SPLIT-P2.5-P4-P1.2 workspace inicijavimo klaida', error);
    setUi('error', 'Firebase Rules klaida');
    if (switched) window.dispatchEvent(new CustomEvent('p2:room-switch-error', { detail: { roomId: targetRoom } }));
  }
}

initializeWorkspace({ startsBlank: roomInfo.startsBlank, generation: roomGeneration });


// P2-SPLIT-P2.5-P2: ilgalaikė mokinių bazė / pamokų indeksas.
function safeStudentId(value) {
  const id = String(value || '').trim();
  return /^[a-z0-9_-]{6,48}$/i.test(id) ? id : '';
}
function newStudentId() {
  const random = Math.random().toString(36).slice(2, 9);
  return `s_${Date.now().toString(36)}_${random}`;
}
function newClassSessionId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `c_${Date.now().toString(36)}_${random}`;
}
function safeClassSessionId(value) {
  const id = String(value || '').trim();
  return /^[a-z0-9_-]{6,64}$/i.test(id) ? id : '';
}
function safeScheduleId(value) {
  const id = String(value || '').trim();
  return /^[a-z0-9_-]{6,64}$/i.test(id) ? id : '';
}
function newScheduleId() {
  const random = Math.random().toString(36).slice(2, 10);
  return `w_${Date.now().toString(36)}_${random}`;
}
function safeScheduleDay(value) {
  const day = Math.round(Number(value) || 0);
  return day >= 1 && day <= 7 ? day : 1;
}
function safeScheduleTime(value) {
  const text = String(value || '').trim();
  return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : '16:00';
}
function safeScheduleDuration(value) {
  return Math.max(15, Math.min(180, Math.round(Number(value) || 40)));
}
function cleanScheduleLabel(value) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80); }
function scheduleTimeMinutes(value) {
  const match = /^(\d{2}):(\d{2})$/.exec(safeScheduleTime(value));
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}
function scheduleClockMinutes(value) {
  const total = Math.max(0, Math.min(24 * 60, Math.round(Number(value) || 0)));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function findScheduleConflict(day, start, durationMinutes, excludeScheduleId = '') {
  const safeDay = safeScheduleDay(day);
  const startMinutes = scheduleTimeMinutes(start);
  const duration = safeScheduleDuration(durationMinutes);
  const endMinutes = startMinutes + duration;
  for (const [id, raw] of Object.entries(teacherProfileCache.scheduleEntries || {})) {
    if (String(id) === String(excludeScheduleId || '')) continue;
    if (!raw || typeof raw !== 'object' || safeScheduleDay(raw.day) !== safeDay) continue;
    const otherStart = scheduleTimeMinutes(raw.start);
    const otherDuration = safeScheduleDuration(raw.durationMinutes);
    const otherEnd = otherStart + otherDuration;
    if (startMinutes < otherEnd && endMinutes > otherStart) return { id, ...raw, startMinutes: otherStart, endMinutes: otherEnd };
  }
  return null;
}
function scheduleConflictError(conflict) {
  const label = cleanScheduleLabel(conflict?.label) || 'kita pamoka';
  const start = safeScheduleTime(conflict?.start);
  const end = scheduleClockMinutes(Number(conflict?.endMinutes || scheduleTimeMinutes(start) + safeScheduleDuration(conflict?.durationMinutes)));
  const error = new Error(`Laikas persidengia su „${label}“ (${start}–${end}).`);
  error.code = 'schedule-conflict';
  return error;
}
function safeDateKey(value) {
  const text = String(value || '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : '';
}
function localDateKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
function cleanStudentName(value) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80); }
function cleanStudentNotes(value) { return String(value || '').trim().slice(0, 600); }
function emitTeacherProfile() {
  if (!teacherProfileId) return;
  window.dispatchEvent(new CustomEvent('p2:students-state', {
    detail: {
      profileId: teacherProfileId,
      students: teacherProfileCache.students || {},
      roomLinks: teacherProfileCache.roomLinks || {},
      classSessions: teacherProfileCache.classSessions || {},
      scheduleEntries: teacherProfileCache.scheduleEntries || {},
      scheduleRuns: teacherProfileCache.scheduleRuns || {}
    }
  }));
}
if (teacherProfileRef) {
  onValue(teacherProfileRef, snapshot => {
    const value = snapshot.val() || {};
    teacherProfileCache = {
      students: value.students && typeof value.students === 'object' ? value.students : {},
      roomLinks: value.roomLinks && typeof value.roomLinks === 'object' ? value.roomLinks : {},
      classSessions: value.classSessions && typeof value.classSessions === 'object' ? value.classSessions : {},
      scheduleEntries: value.scheduleEntries && typeof value.scheduleEntries === 'object' ? value.scheduleEntries : {},
      scheduleRuns: value.scheduleRuns && typeof value.scheduleRuns === 'object' ? value.scheduleRuns : {}
    };
    emitTeacherProfile();
  }, error => {
    console.error('P2-SPLIT-P2.5-P2 mokinių bazės skaitymo klaida', error);
    bridge.showToast?.('Nepavyko atidaryti mokinių bazės');
    emitTeacherProfile();
  });
}

function cleanLessonSummary(value) {
  const source = value && typeof value === 'object' ? value : {};
  const number = (raw, max = 9999) => Math.max(0, Math.min(max, Math.round(Number(raw) || 0)));
  const allowedStatus = ['not_started', 'in_progress', 'completed'];
  return {
    status: allowedStatus.includes(source.status) ? source.status : 'not_started',
    finished: number(source.finished), solved: number(source.solved), good: number(source.good),
    help: number(source.help), repeat: number(source.repeat), percent: number(source.percent, 100),
    taskCount: number(source.taskCount), currentTaskId: source.currentTaskId ? String(source.currentTaskId).slice(0, 60) : null,
    updatedAt: Date.now()
  };
}

function subscribeP2StudentProfile() {
  roomOnValue(p2StudentProfileRef, snapshot => {
    const value = snapshot.val();
    window.dispatchEvent(new CustomEvent('p2:room-student-state', {
      detail: value && typeof value === 'object' ? value : null
    }));
  });
}


function scheduleRunRoomEntries(run) {
  const raw = run?.rooms && typeof run.rooms === 'object' ? run.rooms : {};
  return Object.entries(raw).map(([studentIdRaw, roomRaw]) => ({
    studentId: safeStudentId(studentIdRaw),
    roomId: safeRoom(roomRaw?.roomId || roomRaw)
  })).filter(item => item.studentId && item.roomId && teacherProfileCache.students?.[item.studentId]);
}

async function ensureScheduleRunClassSession(scheduleId, dateKey, run, entry) {
  const roomEntries = scheduleRunRoomEntries(run);
  if (!roomEntries.length) return { classSessionId: '', roomEntries: [] };

  let classSessionId = safeClassSessionId(run?.classSessionId);
  if (!classSessionId) classSessionId = newClassSessionId();
  const now = Date.now();
  const existingSession = teacherProfileCache.classSessions?.[classSessionId] || {};
  const updates = {};

  // P2.5-P4-P1.2: tvarkaraščio paleidimas yra vienos bendros pamokos sesija.
  // Atkuriame indeksą ir senesniems P4-P1.1 run'ams, jei Firebase listenerio
  // lenktynė ar ankstesnė versija paliko tik scheduleRuns.rooms žemėlapį.
  updates[`classSessions/${classSessionId}/createdAt`] = Number(existingSession.createdAt || run?.startedAt || now) || now;
  updates[`classSessions/${classSessionId}/updatedAt`] = now;
  updates[`classSessions/${classSessionId}/scheduleId`] = scheduleId;
  updates[`classSessions/${classSessionId}/scheduleDate`] = dateKey;
  updates[`classSessions/${classSessionId}/scheduledDay`] = safeScheduleDay(entry?.day);
  updates[`classSessions/${classSessionId}/scheduledStart`] = safeScheduleTime(entry?.start);
  updates[`classSessions/${classSessionId}/durationMinutes`] = safeScheduleDuration(entry?.durationMinutes);
  updates[`classSessions/${classSessionId}/label`] = cleanScheduleLabel(entry?.label);
  updates[`scheduleRuns/${scheduleId}/${dateKey}/classSessionId`] = classSessionId;

  const localStudents = { ...(existingSession.students && typeof existingSession.students === 'object' ? existingSession.students : {}) };
  const localRoomLinks = { ...(teacherProfileCache.roomLinks || {}) };
  for (const item of roomEntries) {
    const addedAt = Number(existingSession.students?.[item.studentId]?.addedAt || run?.startedAt || now) || now;
    updates[`classSessions/${classSessionId}/students/${item.studentId}`] = { roomId: item.roomId, addedAt };
    updates[`roomLinks/${item.roomId}`] = { studentId: item.studentId, classSessionId, scheduleId, linkedAt: Number(run?.startedAt || now) || now };
    localStudents[item.studentId] = { roomId: item.roomId, addedAt };
    localRoomLinks[item.roomId] = { studentId: item.studentId, classSessionId, scheduleId, linkedAt: Number(run?.startedAt || now) || now };
  }

  await update(teacherProfileRef, updates);
  teacherProfileCache.classSessions = {
    ...(teacherProfileCache.classSessions || {}),
    [classSessionId]: {
      ...existingSession,
      createdAt: Number(existingSession.createdAt || run?.startedAt || now) || now,
      updatedAt: now,
      scheduleId,
      scheduleDate: dateKey,
      scheduledDay: safeScheduleDay(entry?.day),
      scheduledStart: safeScheduleTime(entry?.start),
      durationMinutes: safeScheduleDuration(entry?.durationMinutes),
      label: cleanScheduleLabel(entry?.label),
      students: localStudents
    }
  };
  teacherProfileCache.roomLinks = localRoomLinks;
  teacherProfileCache.scheduleRuns = {
    ...(teacherProfileCache.scheduleRuns || {}),
    [scheduleId]: {
      ...(teacherProfileCache.scheduleRuns?.[scheduleId] || {}),
      [dateKey]: { ...(run || {}), classSessionId }
    }
  };
  emitTeacherProfile();
  return { classSessionId, roomEntries };
}

window.addEventListener('p2:schedule-request', async event => {
  if (onlineRole !== 'teacher' || !teacherProfileRef) return;
  const detail = event.detail || {};
  try {
    const saveScheduleEntry = async (scheduleId, existing = {}) => {
      const studentIds = Array.isArray(detail.studentIds)
        ? Array.from(new Set(detail.studentIds.map(safeStudentId).filter(id => id && teacherProfileCache.students?.[id])))
        : Object.keys(existing.studentIds && typeof existing.studentIds === 'object' ? existing.studentIds : {})
            .filter(id => existing.studentIds[id] && teacherProfileCache.students?.[id]);
      const lessonId = String(detail.lessonId ?? existing.lessonId ?? '').trim().slice(0, 80);
      const day = safeScheduleDay(detail.day ?? existing.day);
      const start = safeScheduleTime(detail.start ?? existing.start);
      const durationMinutes = safeScheduleDuration(detail.durationMinutes ?? existing.durationMinutes);
      const conflict = findScheduleConflict(day, start, durationMinutes, scheduleId);
      if (conflict) throw scheduleConflictError(conflict);
      const payload = {
        day,
        start,
        durationMinutes,
        label: cleanScheduleLabel(detail.label ?? existing.label),
        studentIds: Object.fromEntries(studentIds.map(id => [id, true])),
        lessonId,
        practiceTitle: String(detail.practiceTitle ?? existing.practiceTitle ?? '').trim().slice(0, 140),
        taskCount: Math.max(0, Math.min(500, Math.round(Number(detail.taskCount ?? existing.taskCount) || 0))),
        attemptPolicy: lessonId ? sanitizeAttemptPolicy(detail.attemptPolicy ?? existing.attemptPolicy) : null,
        createdAt: Number(existing.createdAt || 0) || Date.now(),
        updatedAt: Date.now()
      };
      await set(ref(db, `p772TeacherProfiles/${teacherProfileId}/scheduleEntries/${scheduleId}`), payload);
      return payload;
    };

    if (detail.action === 'add' || detail.action === 'update') {
      const scheduleId = detail.action === 'update' ? safeScheduleId(detail.scheduleId) : newScheduleId();
      if (!scheduleId) return;
      const existing = teacherProfileCache.scheduleEntries?.[scheduleId] || {};
      await saveScheduleEntry(scheduleId, existing);
      bridge.showToast?.(detail.action === 'update' ? 'Pamoka atnaujinta' : 'Pamoka sukurta');
      window.dispatchEvent(new CustomEvent('p2:schedule-saved', { detail: { scheduleId, created: detail.action === 'add' } }));
      return;
    }

    const scheduleId = safeScheduleId(detail.scheduleId);
    if (!scheduleId) return;

    if (detail.action === 'delete') {
      await update(teacherProfileRef, {
        [`scheduleEntries/${scheduleId}`]: null,
        [`scheduleRuns/${scheduleId}`]: null
      });
      bridge.showToast?.('Pamoka pašalinta iš tvarkaraščio');
      return;
    }

    if (detail.action === 'update-and-start') {
      const existing = teacherProfileCache.scheduleEntries?.[scheduleId];
      if (!existing || typeof existing !== 'object') throw new Error('Tvarkaraščio įrašas nerastas');
      await saveScheduleEntry(scheduleId, existing);
      // Vietinį cache papildome naujausia forma, kad nereikėtų laukti Firebase
      // round-trip prieš kuriant tos pačios pamokos mokinių Room.
      const studentIds = Array.isArray(detail.studentIds)
        ? Array.from(new Set(detail.studentIds.map(safeStudentId).filter(id => id && teacherProfileCache.students?.[id])))
        : [];
      const lessonId = String(detail.lessonId || '').trim().slice(0, 80);
      const entry = {
        ...existing,
        day: safeScheduleDay(detail.day), start: safeScheduleTime(detail.start),
        durationMinutes: safeScheduleDuration(detail.durationMinutes), label: cleanScheduleLabel(detail.label),
        studentIds: Object.fromEntries(studentIds.map(id => [id, true])),
        lessonId, practiceTitle: String(detail.practiceTitle || '').trim().slice(0, 140),
        taskCount: Math.max(0, Math.min(500, Math.round(Number(detail.taskCount) || 0))),
        attemptPolicy: lessonId ? sanitizeAttemptPolicy(detail.attemptPolicy) : null
      };
      detail.action = 'start';
      teacherProfileCache.scheduleEntries = { ...(teacherProfileCache.scheduleEntries || {}), [scheduleId]: entry };
    }

    if (detail.action === 'start') {
      const entry = teacherProfileCache.scheduleEntries?.[scheduleId];
      if (!entry || typeof entry !== 'object') throw new Error('Tvarkaraščio įrašas nerastas');
      const dateKey = safeDateKey(detail.dateKey) || localDateKey();
      const existingRun = teacherProfileCache.scheduleRuns?.[scheduleId]?.[dateKey];
      if (existingRun?.rooms && typeof existingRun.rooms === 'object') {
        const repaired = await ensureScheduleRunClassSession(scheduleId, dateKey, existingRun, entry);
        const firstRoom = repaired.roomEntries[0]?.roomId || Object.values(existingRun.rooms).map(value => safeRoom(value?.roomId || value)).find(Boolean) || '';
        bridge.showToast?.('Ši pamoka šiandien jau atidaryta');
        window.dispatchEvent(new CustomEvent('p2:schedule-started', {
          detail: {
            scheduleId, dateKey, firstRoom, existing: true,
            classSessionId: repaired.classSessionId,
            rooms: Object.fromEntries(repaired.roomEntries.map(item => [item.studentId, item.roomId]))
          }
        }));
        return;
      }

      const studentIds = Object.keys(entry.studentIds && typeof entry.studentIds === 'object' ? entry.studentIds : {})
        .map(safeStudentId)
        .filter(id => id && entry.studentIds[id] && teacherProfileCache.students?.[id]);
      if (!studentIds.length) throw new Error('Pamokoje dar nėra priskirtų mokinių');

      const classSessionId = newClassSessionId();
      const now = Date.now();
      const lessonId = String(entry.lessonId || '').trim().slice(0, 80);
      const practiceTitle = String(entry.practiceTitle || '').trim().slice(0, 140);
      const taskCount = Math.max(0, Math.min(500, Math.round(Number(entry.taskCount) || 0)));
      const durationMinutes = safeScheduleDuration(entry.durationMinutes);
      const rooms = {};
      const updates = {
        [`classSessions/${classSessionId}/createdAt`]: now,
        [`classSessions/${classSessionId}/updatedAt`]: now,
        [`classSessions/${classSessionId}/scheduleId`]: scheduleId,
        [`classSessions/${classSessionId}/scheduleDate`]: dateKey,
        [`classSessions/${classSessionId}/scheduledDay`]: safeScheduleDay(entry.day),
        [`classSessions/${classSessionId}/scheduledStart`]: safeScheduleTime(entry.start),
        [`classSessions/${classSessionId}/durationMinutes`]: durationMinutes,
        [`classSessions/${classSessionId}/label`]: cleanScheduleLabel(entry.label)
      };

      for (const studentId of studentIds) {
        const targetRoom = newRoomId();
        rooms[studentId] = targetRoom;
        const studentName = cleanStudentName(teacherProfileCache.students?.[studentId]?.name) || 'Mokinys';
        const blank = emptyWorkspace();
        await set(ref(db, `p772Rooms/${targetRoom}/workspace`), {
          ...blank,
          meta: { schemaVersion: 1, seededBy: me, updatedAt: serverTimestamp() }
        });
        if (lessonId) {
          await set(ref(db, `p772Rooms/${targetRoom}/p2/student/assignment`), {
            lessonId,
            title: practiceTitle || 'Pamoka',
            taskCount,
            attemptPolicy: sanitizeAttemptPolicy(entry.attemptPolicy),
            assignedAt: now,
            assignedBy: me
          });
          await set(ref(db, `p772Rooms/${targetRoom}/p2/student/progress`), {
            assignmentId: lessonId,
            status: 'not_started',
            currentTaskId: '',
            taskStates: {},
            startedAt: null,
            updatedAt: now
          });
        }
        await set(ref(db, `p772Rooms/${targetRoom}/p2/student/profile`), {
          studentId,
          name: studentName,
          classSessionId,
          scheduleId,
          updatedAt: now
        });

        const recordTitle = practiceTitle || cleanScheduleLabel(entry.label) || (lessonId ? 'Pamoka' : 'Lentos sesija');
        updates[`students/${studentId}/lessons/${targetRoom}`] = {
          roomId: targetRoom,
          classSessionId,
          scheduleId,
          scheduleDate: dateKey,
          scheduledDay: safeScheduleDay(entry.day),
          scheduledStart: safeScheduleTime(entry.start),
          durationMinutes,
          lessonId,
          title: recordTitle,
          taskCount,
          createdAt: now,
          linkedAt: now,
          updatedAt: now,
          summary: cleanLessonSummary({ taskCount })
        };
        updates[`students/${studentId}/updatedAt`] = now;
        updates[`roomLinks/${targetRoom}`] = { studentId, classSessionId, scheduleId, linkedAt: now };
        updates[`classSessions/${classSessionId}/students/${studentId}`] = { roomId: targetRoom, addedAt: now };
      }

      updates[`scheduleRuns/${scheduleId}/${dateKey}`] = {
        classSessionId,
        startedAt: now,
        rooms,
        scheduledStart: safeScheduleTime(entry.start),
        durationMinutes
      };
      await update(teacherProfileRef, updates);

      // Firebase profilio onValue paprastai atkeliauja iš karto, bet mokinių
      // skirtukų nerodome priklausomai nuo callback'ų eilės. Iš žinomų ką tik
      // sukurtos pamokos duomenų iškart atnaujiname vietinį indeksą.
      const localSessionStudents = {};
      const localRoomLinks = { ...(teacherProfileCache.roomLinks || {}) };
      for (const [studentId, targetRoom] of Object.entries(rooms)) {
        localSessionStudents[studentId] = { roomId: targetRoom, addedAt: now };
        localRoomLinks[targetRoom] = { studentId, classSessionId, scheduleId, linkedAt: now };
      }
      teacherProfileCache.classSessions = {
        ...(teacherProfileCache.classSessions || {}),
        [classSessionId]: {
          createdAt: now, updatedAt: now, scheduleId, scheduleDate: dateKey,
          scheduledDay: safeScheduleDay(entry.day), scheduledStart: safeScheduleTime(entry.start),
          durationMinutes, label: cleanScheduleLabel(entry.label), students: localSessionStudents
        }
      };
      teacherProfileCache.roomLinks = localRoomLinks;
      teacherProfileCache.scheduleRuns = {
        ...(teacherProfileCache.scheduleRuns || {}),
        [scheduleId]: {
          ...(teacherProfileCache.scheduleRuns?.[scheduleId] || {}),
          [dateKey]: { classSessionId, startedAt: now, rooms, scheduledStart: safeScheduleTime(entry.start), durationMinutes }
        }
      };
      emitTeacherProfile();

      const firstRoom = Object.values(rooms)[0] || '';
      bridge.showToast?.('Pamoka atidaryta');
      window.dispatchEvent(new CustomEvent('p2:schedule-started', { detail: { scheduleId, dateKey, classSessionId, firstRoom, rooms } }));
      return;
    }
  } catch (error) {
    console.error('P2-SPLIT-P2.5-P4-P1.7 tvarkaraščio įrašymo klaida', error);
    const message = String(error?.message || error || 'Nepavyko atnaujinti tvarkaraščio');
    bridge.showToast?.(error?.code === 'schedule-conflict' ? message : 'Nepavyko atnaujinti tvarkaraščio');
    window.dispatchEvent(new CustomEvent('p2:schedule-error', { detail: { message } }));
  }
});

window.addEventListener('p2:students-request', async event => {
  if (onlineRole !== 'teacher' || !teacherProfileRef) return;
  const detail = event.detail || {};
  try {
    if (detail.action === 'add') {
      const name = cleanStudentName(detail.name);
      if (!name) return;
      const studentId = newStudentId();
      await set(ref(db, `p772TeacherProfiles/${teacherProfileId}/students/${studentId}`), {
        name, notes: '', createdAt: Date.now(), updatedAt: Date.now(), lessons: {}
      });
      bridge.showToast?.(`Mokinys „${name}“ sukurtas`);
      return;
    }
    const studentId = safeStudentId(detail.studentId);
    if (!studentId) return;
    if (detail.action === 'update') {
      const name = cleanStudentName(detail.name);
      if (!name) return;
      await update(ref(db, `p772TeacherProfiles/${teacherProfileId}/students/${studentId}`), {
        name, notes: cleanStudentNotes(detail.notes), updatedAt: Date.now()
      });
      const linkedRooms = Object.entries(teacherProfileCache.roomLinks || {})
        .filter(([, link]) => link?.studentId === studentId)
        .map(([linkedRoom]) => safeRoom(linkedRoom))
        .filter(Boolean);
      await Promise.all(linkedRooms.map(linkedRoom => update(ref(db, `p772Rooms/${linkedRoom}/p2/student/profile`), {
        studentId, name, updatedAt: Date.now()
      }).catch(() => {})));
      bridge.showToast?.('Mokinio kortelė atnaujinta');
      return;
    }
    if (detail.action === 'delete') {
      const updates = { [`students/${studentId}`]: null };
      const linkedRooms = [];
      for (const [linkedRoom, link] of Object.entries(teacherProfileCache.roomLinks || {})) {
        if (link?.studentId !== studentId) continue;
        updates[`roomLinks/${linkedRoom}`] = null;
        linkedRooms.push(linkedRoom);
        const classSessionId = safeClassSessionId(link?.classSessionId);
        if (classSessionId) updates[`classSessions/${classSessionId}/students/${studentId}`] = null;
      }
      for (const [scheduleId, entry] of Object.entries(teacherProfileCache.scheduleEntries || {})) {
        if (!entry?.studentIds?.[studentId]) continue;
        updates[`scheduleEntries/${scheduleId}/studentIds/${studentId}`] = null;
        updates[`scheduleEntries/${scheduleId}/updatedAt`] = Date.now();
      }
      await update(teacherProfileRef, updates);
      await Promise.all(linkedRooms.map(linkedRoom => remove(ref(db, `p772Rooms/${safeRoom(linkedRoom)}/p2/student/profile`)).catch(() => {})));
      bridge.showToast?.('Mokinys pašalintas iš bazės');
      return;
    }
    const targetRoom = safeRoom(detail.roomId);
    if (!targetRoom) return;
    if (detail.action === 'unlink-room') {
      const link = teacherProfileCache.roomLinks?.[targetRoom] || {};
      const updates = { [`students/${studentId}/lessons/${targetRoom}`]: null };
      if (link?.studentId === studentId) {
        updates[`roomLinks/${targetRoom}`] = null;
        const classSessionId = safeClassSessionId(link.classSessionId);
        if (classSessionId) updates[`classSessions/${classSessionId}/students/${studentId}`] = null;
      }
      await update(teacherProfileRef, updates);
      if (link?.studentId === studentId) await remove(ref(db, `p772Rooms/${targetRoom}/p2/student/profile`)).catch(() => {});
      bridge.showToast?.('Pamokos įrašas pašalintas. Lenta liko Firebase.');
      return;
    }
    if (detail.action === 'link-room') {
      const previousStudentId = safeStudentId(teacherProfileCache.roomLinks?.[targetRoom]?.studentId);
      const previousClassSessionId = safeClassSessionId(teacherProfileCache.roomLinks?.[targetRoom]?.classSessionId);
      const classSessionId = previousClassSessionId || newClassSessionId();
      const updates = {};
      if (previousStudentId && previousStudentId !== studentId) {
        updates[`students/${previousStudentId}/lessons/${targetRoom}`] = null;
        if (previousClassSessionId) updates[`classSessions/${previousClassSessionId}/students/${previousStudentId}`] = null;
      }

      const currentAssignmentSnap = await get(p2AssignmentRef);
      const currentProgressSnap = await get(p2ProgressRef);
      const currentAssignment = currentAssignmentSnap.val();
      let lessonId = String(detail.lessonId || '').trim().slice(0, 80);
      let title = String(detail.title || '').trim().slice(0, 140);
      let taskCount = Math.max(0, Math.min(500, Number(detail.taskCount) || 0));

      if (lessonId) {
        if (String(currentAssignment?.lessonId || '') !== lessonId) {
          const assignmentPayload = {
            lessonId, title: title || 'Pamoka', taskCount,
            attemptPolicy: sanitizeAttemptPolicy(detail.attemptPolicy),
            assignedAt: Date.now(), assignedBy: me
          };
          await set(p2AssignmentRef, assignmentPayload);
          await set(p2ProgressRef, {
            assignmentId: lessonId, status: 'not_started', currentTaskId: '', taskStates: {},
            startedAt: null, updatedAt: Date.now()
          });
        } else {
          title = String(currentAssignment?.title || title || 'Pamoka').slice(0, 140);
          taskCount = Math.max(0, Math.min(500, Number(currentAssignment?.taskCount || taskCount) || 0));
        }
      } else if (currentAssignment?.lessonId) {
        lessonId = String(currentAssignment.lessonId).slice(0, 80);
        title = String(currentAssignment.title || '').slice(0, 140);
        taskCount = Math.max(0, Math.min(500, Number(currentAssignment.taskCount) || 0));
      }

      const student = teacherProfileCache.students?.[studentId] || {};
      const studentName = cleanStudentName(student.name) || 'Mokinys';
      const existingRecord = teacherProfileCache.students?.[studentId]?.lessons?.[targetRoom] || {};
      const progressValue = currentProgressSnap.val();
      const record = {
        roomId: targetRoom,
        classSessionId,
        lessonId,
        title: title || (lessonId ? 'Pamoka' : 'Lentos sesija'),
        taskCount,
        createdAt: Number(existingRecord.createdAt || existingRecord.linkedAt || 0) || Date.now(),
        linkedAt: Date.now(),
        updatedAt: Date.now(),
        summary: existingRecord.summary || (progressValue ? cleanLessonSummary({ status: progressValue.status, taskCount }) : cleanLessonSummary({ taskCount }))
      };
      updates[`students/${studentId}/lessons/${targetRoom}`] = record;
      updates[`students/${studentId}/updatedAt`] = Date.now();
      updates[`roomLinks/${targetRoom}`] = { studentId, classSessionId, linkedAt: Date.now() };
      updates[`classSessions/${classSessionId}/createdAt`] = Number(teacherProfileCache.classSessions?.[classSessionId]?.createdAt || 0) || Date.now();
      updates[`classSessions/${classSessionId}/updatedAt`] = Date.now();
      updates[`classSessions/${classSessionId}/students/${studentId}`] = { roomId: targetRoom, addedAt: Date.now() };
      await update(teacherProfileRef, updates);
      await set(p2StudentProfileRef, { studentId, name: studentName, classSessionId, updatedAt: Date.now() });
      bridge.showToast?.('Pamoka susieta su mokiniu');
      return;
    }

    if (detail.action === 'add-to-class-session') {
      const sourceRoom = targetRoom;
      const sourceLink = teacherProfileCache.roomLinks?.[sourceRoom] || {};
      const sourceStudentId = safeStudentId(sourceLink.studentId);
      if (!sourceStudentId) throw new Error('Dabartinė Room dar nesusieta su mokiniu');
      let classSessionId = safeClassSessionId(sourceLink.classSessionId);
      const updates = {};
      if (!classSessionId) {
        classSessionId = newClassSessionId();
        updates[`roomLinks/${sourceRoom}/classSessionId`] = classSessionId;
        updates[`students/${sourceStudentId}/lessons/${sourceRoom}/classSessionId`] = classSessionId;
        updates[`classSessions/${classSessionId}/students/${sourceStudentId}`] = { roomId: sourceRoom, addedAt: Date.now() };
        const sourceStudentName = cleanStudentName(teacherProfileCache.students?.[sourceStudentId]?.name) || 'Mokinys';
        await update(ref(db, `p772Rooms/${sourceRoom}/p2/student/profile`), {
          studentId: sourceStudentId, name: sourceStudentName, classSessionId, updatedAt: Date.now()
        });
      }

      const existingParticipant = teacherProfileCache.classSessions?.[classSessionId]?.students?.[studentId];
      if (existingParticipant?.roomId) {
        bridge.showToast?.('Šis mokinys jau yra šioje pamokoje');
        return;
      }

      const targetStudentRoom = newRoomId();
      const student = teacherProfileCache.students?.[studentId] || {};
      const studentName = cleanStudentName(student.name) || 'Mokinys';
      let lessonId = String(detail.lessonId || '').trim().slice(0, 80);
      let title = String(detail.title || '').trim().slice(0, 140);
      let taskCount = Math.max(0, Math.min(500, Number(detail.taskCount) || 0));
      if (!lessonId) {
        const sourceAssignment = (await get(p2AssignmentRef)).val();
        if (sourceAssignment?.lessonId) {
          lessonId = String(sourceAssignment.lessonId).slice(0, 80);
          title = String(sourceAssignment.title || '').slice(0, 140);
          taskCount = Math.max(0, Math.min(500, Number(sourceAssignment.taskCount) || 0));
        }
      }

      const blank = emptyWorkspace();
      await set(ref(db, `p772Rooms/${targetStudentRoom}/workspace`), {
        ...blank,
        meta: { schemaVersion: 1, seededBy: me, updatedAt: serverTimestamp() }
      });
      if (lessonId) {
        await set(ref(db, `p772Rooms/${targetStudentRoom}/p2/student/assignment`), {
          lessonId, title: title || 'Pamoka', taskCount,
          attemptPolicy: sanitizeAttemptPolicy(detail.attemptPolicy),
          assignedAt: Date.now(), assignedBy: me
        });
        await set(ref(db, `p772Rooms/${targetStudentRoom}/p2/student/progress`), {
          assignmentId: lessonId, status: 'not_started', currentTaskId: '', taskStates: {},
          startedAt: null, updatedAt: Date.now()
        });
      }
      await set(ref(db, `p772Rooms/${targetStudentRoom}/p2/student/profile`), {
        studentId, name: studentName, classSessionId, updatedAt: Date.now()
      });

      const now = Date.now();
      const record = {
        roomId: targetStudentRoom, classSessionId, lessonId,
        title: title || (lessonId ? 'Pamoka' : 'Lentos sesija'), taskCount,
        createdAt: now, linkedAt: now, updatedAt: now,
        summary: cleanLessonSummary({ taskCount })
      };
      updates[`students/${studentId}/lessons/${targetStudentRoom}`] = record;
      updates[`students/${studentId}/updatedAt`] = now;
      updates[`roomLinks/${targetStudentRoom}`] = { studentId, classSessionId, linkedAt: now };
      updates[`classSessions/${classSessionId}/createdAt`] = Number(teacherProfileCache.classSessions?.[classSessionId]?.createdAt || 0) || now;
      updates[`classSessions/${classSessionId}/updatedAt`] = now;
      updates[`classSessions/${classSessionId}/students/${studentId}`] = { roomId: targetStudentRoom, addedAt: now };
      await update(teacherProfileRef, updates);
      bridge.showToast?.(`Pamoka papildyta: ${studentName}`);
      return;
    }
    if (detail.action === 'snapshot') {
      if (teacherProfileCache.roomLinks?.[targetRoom]?.studentId !== studentId) return;
      const existing = teacherProfileCache.students?.[studentId]?.lessons?.[targetRoom] || {};
      const updates = {
        [`students/${studentId}/lessons/${targetRoom}/updatedAt`]: Date.now(),
        [`students/${studentId}/lessons/${targetRoom}/summary`]: cleanLessonSummary(detail.summary),
        [`students/${studentId}/updatedAt`]: Date.now()
      };
      if (detail.lessonId) {
        updates[`students/${studentId}/lessons/${targetRoom}/lessonId`] = String(detail.lessonId).slice(0, 80);
        updates[`students/${studentId}/lessons/${targetRoom}/title`] = String(detail.title || existing.title || 'Pamoka').slice(0, 140);
        updates[`students/${studentId}/lessons/${targetRoom}/taskCount`] = Math.max(0, Math.min(500, Number(detail.taskCount) || 0));
      }
      await update(teacherProfileRef, updates);
    }
  } catch (error) {
    console.error('P2-SPLIT-P2.5-P2 mokinių bazės įrašymo klaida', error);
    bridge.showToast?.('Nepavyko išsaugoti mokinio duomenų');
  }
});

// P2 priskyrimo / eigos kanalas. UI yra klasikiniame p2-ui.js, todėl
// Firebase modulis su juo kalbasi per CustomEvent ir neturi valdyti DOM.
function subscribeP2AssignmentAndProgress() {
  roomOnValue(p2AssignmentRef, snapshot => {
    window.dispatchEvent(new CustomEvent('p2:assignment-state', { detail: snapshot.val() || null }));
  });
  roomOnValue(p2ProgressRef, snapshot => {
    const value = snapshot.val() || null;

    // P2-SPLIT-P2.1.1: mokinio paties Firebase įrašo echo negrąžiname atgal į jo UI.
    // Sprendimo MathLive laukas jau turi naujausią vietinę būseną. Greitai rašant
    // ankstesnio simbolio echo galėdavo atkeliauti po kito simbolio, sukelti viso
    // pratybų skydelio perrenderinimą ir pakeisti aktyvų lauką nauju DOM elementu.
    // Mokytojas ir toliau gauna kiekvieną mokinio atnaujinimą realiu laiku.
    if (onlineRole === 'student' && value?.updatedBy === me) return;

    window.dispatchEvent(new CustomEvent('p2:progress-state', { detail: value }));
  });
}

function sanitizeAttemptPolicy(value) {
  const source = value && typeof value === 'object' ? value : {};
  const normalizeLimit = (raw, fallback = 3) => {
    const number = Number(raw);
    if (!Number.isFinite(number)) return fallback;
    if (number === 0) return 0; // 0 = neribotai
    return Math.max(1, Math.min(9, Math.round(number)));
  };
  const defaultMaxAttempts = normalizeLimit(source.defaultMaxAttempts, 3);
  const taskMaxAttempts = {};
  if (source.taskMaxAttempts && typeof source.taskMaxAttempts === 'object') {
    for (const [taskId, rawLimit] of Object.entries(source.taskMaxAttempts)) {
      if (!/^[a-z0-9_-]{1,40}$/i.test(String(taskId))) continue;
      taskMaxAttempts[String(taskId)] = normalizeLimit(rawLimit, defaultMaxAttempts);
    }
  }
  return { defaultMaxAttempts, taskMaxAttempts };
}

window.addEventListener('p2:assignment-request', async event => {
  if (onlineRole !== 'teacher') return;
  const detail = event.detail || {};
  try {
    if (detail.action === 'unassign') {
      await remove(p2AssignmentRef);
      await remove(p2ProgressRef);
      bridge.showToast?.('Pamokos priskyrimas atšauktas');
      return;
    }
    if (detail.action === 'settings') {
      await update(p2AssignmentRef, {
        attemptPolicy: sanitizeAttemptPolicy(detail.attemptPolicy),
        settingsUpdatedAt: Date.now(),
        settingsUpdatedBy: me
      });
      bridge.showToast?.('Bandymų nustatymai atnaujinti');
      return;
    }
    if (detail.action !== 'assign') return;
    const assignment = {
      lessonId: String(detail.lessonId || ''),
      title: String(detail.title || 'Pamokos prototipas'),
      taskCount: Math.max(0, Number(detail.taskCount) || 0),
      attemptPolicy: sanitizeAttemptPolicy(detail.attemptPolicy),
      assignedAt: Date.now(),
      assignedBy: me
    };
    await set(p2AssignmentRef, assignment);
    await set(p2ProgressRef, {
      assignmentId: assignment.lessonId,
      status: 'not_started',
      currentTaskId: 'c1',
      taskStates: {},
      startedAt: null,
      updatedAt: Date.now()
    });
    bridge.showToast?.('Pamoka priskirta mokiniui');
  } catch (error) {
    console.error('P2-SPLIT-P2.1.1 priskyrimo / nustatymų klaida', error);
    bridge.showToast?.('Nepavyko pakeisti pamokos nustatymų');
  }
});

async function persistP2PracticeProgress(event) {
  if (onlineRole !== 'student') return;
  const value = event.detail;
  if (!value || typeof value !== 'object') return;
  try {
    await set(p2ProgressRef, { ...value, updatedAt: Date.now(), updatedBy: me });
  } catch (error) {
    console.error('P2-SPLIT-P2.1.1 mokinio eigos klaida', error);
    bridge.showToast?.('Nepavyko išsaugoti pratybų eigos');
  }
}
window.addEventListener('p2:practice-progress-request', persistP2PracticeProgress);
window.addEventListener('p2:practice-progress-live-request', persistP2PracticeProgress);

let transitionInProgress = false;

function subscribeTransition() {
  roomOnValue(transitionRef, snapshot => {
    const data = snapshot.val();
    const nextRoom = safeRoom(data?.toRoom);
    if (!nextRoom || nextRoom === roomId || transitionInProgress) return;
    // &stay=1 leidžia sąmoningai likti būtent šiame istoriniame Room.
    if (stayOnRoom) {
      console.info(`Istorinis Room ${roomId}: automatinis perėjimas į ${nextRoom} praleistas dėl stay=1.`);
      return;
    }
    transitionInProgress = true;
    const target = urlForRoom(nextRoom, onlineRole);
    bridge.showToast?.('Mokytojas pradėjo naują sesiją');
    setTimeout(() => window.location.replace(target.toString()), 80);
  });
}

function subscribePresenceList() {
  roomOnValue(presenceListRef, snapshot => {
    const count = Object.values(snapshot.val() || {}).filter(Boolean).length;
    if (usersEl) {
      usersEl.textContent = String(count);
      usersEl.title = `Prisijungę langai: ${count}`;
    }
  });
}

function subscribeRoomRealtimeListeners(generation = roomGeneration) {
  if (generation !== roomGeneration) return;
  subscribeWorkspaceParts();
  subscribeLiveStrokes();
  subscribeP2StudentProfile();
  subscribeP2AssignmentAndProgress();
  subscribeTransition();
  subscribePresenceList();
}

onValue(connectedRef, snapshot => {
  connectedNow = snapshot.val() === true;
  if (connectedNow) {
    if (bootstrapped) activateCurrentRoomPresence(roomGeneration);
    const localNote = location.protocol === 'file:' ? 'Prisijungta · lokalus failas' : 'Prisijungta · bendra lenta';
    setUi('online', localNote);
  } else {
    setUi('offline', 'Nėra ryšio');
  }
}, error => {
  connectedNow = false;
  console.error('P2-SPLIT-P2.5-P4-P1.2 connection klaida', error);
  setUi('error', 'Nepavyko prisijungti');
});

async function switchActiveTeacherRoom(targetRoom, { preserveStay = true } = {}) {
  const nextRoom = safeRoom(targetRoom);
  if (onlineRole !== 'teacher' || !nextRoom || nextRoom === roomId || transitionInProgress) return;

  const previousRoom = roomId;
  const previousStay = stayOnRoom;
  window.dispatchEvent(new CustomEvent('p2:room-switch-start', { detail: { fromRoom: previousRoom, roomId: nextRoom } }));
  setUi('online', 'Perjungiama lenta…');

  // Prieš atjungdami seną Room įrašome paskutinę vietinę teksto / objektų būseną.
  try { await publishLocalChanges(); } catch (_) {}

  clearRoomSubscriptions();
  // Generaciją pakeičiame dar prieš asinchroninį presence atjungimą, kad net
  // jau eilėje esantis seno Room callback'as nebegalėtų pritaikyti jo būsenos.
  roomGeneration += 1;
  // Seno Room presence/live cleanup vyksta fone ir neblokuoja skirtuko perėjimo.
  leaveCurrentRoomPresence();
  resetRoomRuntimeState();
  clearLocalSharedWorkspace();

  roomId = nextRoom;
  stayOnRoom = preserveStay ? previousStay : false;
  transitionInProgress = false;
  bindRoomRefs(roomId);

  if (roomEl) roomEl.textContent = roomId;
  if (usersEl) {
    usersEl.textContent = '0';
    usersEl.title = 'Jungiama prie mokinio lentos';
  }

  const url = new URL(window.location.href);
  url.searchParams.set('room', roomId);
  url.searchParams.set('role', 'teacher');
  url.searchParams.delete('new');
  url.searchParams.delete('student');
  if (stayOnRoom) url.searchParams.set('stay', '1');
  else url.searchParams.delete('stay');
  try { history.replaceState(null, '', url); } catch (_) {}

  if (newButton) {
    newButton.disabled = stayOnRoom;
    newButton.title = stayOnRoom ? 'Istoriniame stay=1 režime nauja sesija nekuriama' : '';
  }

  emitTeacherProfile();
  await initializeWorkspace({ startsBlank: false, generation: roomGeneration, switched: true });
}

window.addEventListener('p2:room-switch-request', event => {
  const detail = event.detail || {};
  switchActiveTeacherRoom(detail.roomId, { preserveStay: detail.preserveStay !== false });
});


window.addEventListener('p772:shared-notes-live', () => {
  // Throttle, ne debounce: net jei mokinys rašo be jokios pauzės kelias sekundes,
  // mokytojo lenta gauna tarpines teksto būsenas maždaug kas 55 ms.
  queueNotesLivePublish();
});

window.addEventListener('p772:shared-state-changed', () => {
  clearTimeout(window.__p772OnlinePublishTimer);
  window.__p772OnlinePublishTimer = setTimeout(publishLocalChanges, 90);
});

function drawingStrokePayload(stroke) {
  if (!stroke?.id || !Array.isArray(stroke.points) || !stroke.points.length) return null;
  return {
    id: String(stroke.id),
    mode: stroke.mode === 'eraser' ? 'eraser' : 'pen',
    width: Math.max(0.5, Number(stroke.width) || 2.6),
    points: stroke.points.map(point => ({
      x: Math.max(0, Math.min(1, Number(point?.x) || 0)),
      y: Math.max(0, Math.min(1, Number(point?.y) || 0))
    }))
  };
}

async function writeLiveStroke(stroke) {
  const payload = drawingStrokePayload(stroke);
  if (!payload) return;
  try {
    // Kopiją darome tik čia (daugiausia kas ~40 ms), o ne per kiekvieną pointermove.
    await set(myLiveStrokeRef(payload.id), { ...payload, updatedAt: Date.now(), clientId: me });
  } catch (error) {
    console.warn('P2-SPLIT-P1.7 live stroke klaida', error);
  }
}

async function commitDrawingStroke(stroke) {
  const payload = drawingStrokePayload(stroke);
  if (!payload) return;
  const safeId = payload.id.replace(/[.#$\[\]/]/g, '-');
  const updates = {
    [`workspace/drawing/${safeId}`]: payload,
    'workspace/meta/updatedAt': serverTimestamp(),
    'workspace/meta/updatedBy': me
  };
  try {
    // Baigtą brūkšnį įrašome tiesiai į jo Firebase mazgą. Ankstesnė versija
    // pointerup metu serializuodavo ir diff'indavo visą sukauptą lentą.
    await update(roomRef, updates);
  } catch (error) {
    console.warn('P2-SPLIT-P2.5-P2 brūkšnio persistavimo klaida', error);
    // Jei tiesioginis įrašas nepavyktų, paliekame bendrą sinchronizavimo kelią kaip fallback.
    window.dispatchEvent(new CustomEvent('p772:shared-state-changed'));
  }
}

async function sendLive() {
  liveTimer = null;
  if (!pendingLive) return;
  const payload = pendingLive;
  pendingLive = null;
  await writeLiveStroke(payload);
}

window.__p772DirectDrawingSyncReady = true;

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

    // Brūkšnys state.drawing jau yra. Į workspace įrašome tik šį vieną brūkšnį,
    // o ne iš naujo serializuojame visą per pamoką sukauptą piešinių masyvą.
    commitDrawingStroke(stroke);
    return;
  }

  pendingLive = stroke;
  if (!liveTimer) liveTimer = setTimeout(sendLive, 40);
});

function studentUrlForCurrentRoom() {
  const url = urlForRoom(roomId, 'student');
  // Jei mokytojas sąmoningai apžiūri istorinį Room, jo mokinio peržiūra
  // turi likti tame pačiame Room, o ne sekti senu transition į naują sesiją.
  if (stayOnRoom) url.searchParams.set('stay', '1');
  return url;
}

function openStudentPreview() {
  if (onlineRole !== 'teacher') return;
  const studentUrl = studentUrlForCurrentRoom().toString();
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
      const studentUrl = studentUrlForCurrentRoom().toString();
      await navigator.clipboard.writeText(studentUrl);
      bridge.showToast(location.protocol === 'file:'
        ? 'Mokinio nuoroda nukopijuota. Kitam įrenginiui ji veiks tik patalpinus lentą internete.'
        : 'Mokinio nuoroda nukopijuota');
    } catch (_) {
      window.prompt('Nukopijuok mokiniui šią nuorodą:', studentUrlForCurrentRoom().toString());
    }
  });
}

if (newButton) {
  newButton.addEventListener('click', async () => {
    if (onlineRole !== 'teacher' || stayOnRoom || transitionInProgress) return;
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
      console.error('P2-SPLIT-P1.7 naujos sesijos klaida', error);
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
  console.info('P2-SPLIT-P1.7 veikia su Firebase ir iš lokalaus failo, tačiau bendrinama file:// nuoroda kitame kompiuteryje neveiks. Patalpinkite aplanką statiniame hostinge.');
}
