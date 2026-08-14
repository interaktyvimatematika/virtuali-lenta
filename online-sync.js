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

const BUILD = 'P2-SPLIT-P2.5-P4-P1.7.9.10.6';
const P2_DATA_SCHEMA_VERSION = 1;
const BACKUP_FORMAT_VERSION = 1;

function safeAssignmentKey(value) {
  return String(value || '').trim().replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 96);
}
function newAssignmentKey(lessonId = 'lesson', stamp = Date.now()) {
  const safeLesson = String(lessonId || 'lesson').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 36) || 'lesson';
  const bytes = new Uint8Array(5);
  crypto.getRandomValues(bytes);
  const suffix = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
  return `A-${Number(stamp || Date.now()).toString(36)}-${safeLesson}-${suffix}`.slice(0, 96);
}
function assignmentKeyFor(value, fallbackLessonId = '') {
  const source = value && typeof value === 'object' ? value : {};
  const existing = safeAssignmentKey(source.assignmentKey);
  if (existing) return existing;
  const stamp = Math.max(0, Number(source.assignedAt || 0) || 0);
  const lessonId = String(source.lessonId || fallbackLessonId || 'lesson').replace(/[^A-Za-z0-9_-]/g, '-').slice(0, 36) || 'lesson';
  return `LEGACY-${stamp || 'unknown'}-${lessonId}`.slice(0, 96);
}
function sanitizeContentSnapshot(value, fallback = {}) {
  const source = value && typeof value === 'object' ? value : {};
  const tasks = Array.isArray(source.tasks) ? source.tasks.slice(0, 500) : [];
  let clonedTasks = [];
  try { clonedTasks = JSON.parse(JSON.stringify(tasks)); } catch (_) { clonedTasks = []; }
  const taskIds = Array.isArray(source.taskIds)
    ? source.taskIds.map(id => String(id || '').slice(0, 80)).filter(Boolean).slice(0, 500)
    : clonedTasks.map(task => String(task?.id || '').slice(0, 80)).filter(Boolean);
  const snapshot = {
    schemaVersion: P2_DATA_SCHEMA_VERSION,
    lessonId: String(source.lessonId || fallback.lessonId || '').slice(0, 80),
    contentVersion: Math.max(1, Math.round(Number(source.contentVersion || fallback.contentVersion) || 1)),
    title: String(source.title || fallback.title || '').slice(0, 180),
    shortTitle: String(source.shortTitle || fallback.shortTitle || source.title || '').slice(0, 180),
    description: String(source.description || '').slice(0, 1200),
    taskCount: Math.max(0, Math.min(500, Math.round(Number(source.taskCount ?? fallback.taskCount) || clonedTasks.length || 0))),
    classCount: Math.max(0, Math.min(500, Math.round(Number(source.classCount) || 0))),
    selfCount: Math.max(0, Math.min(500, Math.round(Number(source.selfCount) || 0))),
    taskIds,
    tasks: clonedTasks,
    contentHash: String(source.contentHash || fallback.contentHash || '').slice(0, 80)
  };
  try {
    if (JSON.stringify(snapshot).length > 900000) snapshot.tasks = [];
  } catch (_) { snapshot.tasks = []; }
  return snapshot;
}
function assignmentContentMetadata(detail = {}, fallback = {}) {
  const snapshot = sanitizeContentSnapshot(detail.contentSnapshot, {
    lessonId: detail.lessonId ?? fallback.lessonId,
    contentVersion: detail.contentVersion ?? fallback.contentVersion,
    title: detail.title ?? fallback.title,
    shortTitle: detail.title ?? fallback.shortTitle,
    taskCount: detail.taskCount ?? fallback.taskCount,
    contentHash: detail.contentHash ?? fallback.contentHash
  });
  const taskIds = Array.isArray(detail.taskIds) && detail.taskIds.length
    ? detail.taskIds.map(id => String(id || '').slice(0, 80)).filter(Boolean).slice(0, 500)
    : snapshot.taskIds;
  return {
    schemaVersion: P2_DATA_SCHEMA_VERSION,
    contentVersion: Math.max(1, Math.round(Number(detail.contentVersion || snapshot.contentVersion || fallback.contentVersion) || 1)),
    contentHash: String(detail.contentHash || snapshot.contentHash || fallback.contentHash || '').slice(0, 80),
    taskIds,
    contentSnapshot: snapshot
  };
}

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
let teacherProfileCache = { meta: {}, students: {}, roomLinks: {}, classSessions: {}, scheduleEntries: {}, scheduleRuns: {} };

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
let p2AssignmentCache = null;
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
  p2AssignmentCache = null;
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
  bridge.applySharedPart('boardGeometry', workspace.boardGeometry || { schemaVersion: 2, layoutMode: 'vertical-strip', worldWidth: 2400, worldHeight: 10000, worldOriginX: 0, worldOriginY: 0 });
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
    boardGeometry: { schemaVersion: 2, layoutMode: 'vertical-strip', worldWidth: 2400, worldHeight: 10000, worldOriginX: 0, worldOriginY: 0 }
  };
}

function clearLocalSharedWorkspace() {
  bridge.applySharedPart('drawing', []);
  bridge.applySharedPart('notes', []);
  bridge.applySharedPart('boardImages', []);
  bridge.applySharedPart('boardTasks', []);
  bridge.applySharedPart('boardPractices', []);
  bridge.applySharedPart('window', {});
  bridge.applySharedPart('boardGeometry', { schemaVersion: 2, layoutMode: 'vertical-strip', worldWidth: 2400, worldHeight: 10000, worldOriginX: 0, worldOriginY: 0 });
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
    window.dispatchEvent(new CustomEvent('p2:workspace-ready', {
      detail: { roomId: targetRoom, startsBlank: Boolean(startsBlank), switched: Boolean(switched) }
    }));
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
function safeAttendanceMode(value) {
  const raw = String(value || '').trim().toLowerCase();
  if (raw === 'weekly') return 'recurring';
  if (raw === 'single') return 'dates';
  return ['recurring', 'dates', 'intro', 'final'].includes(raw) ? raw : 'recurring';
}
function validScheduleDateKey(value) {
  const text = String(value || '').trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (!match) return '';
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  return date.getFullYear() === Number(match[1]) && date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3]) ? text : '';
}
function scheduleDateFromKey(value) {
  const text = validScheduleDateKey(value);
  if (!text) return null;
  const [y, m, d] = text.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}
function scheduleAddDays(value, days) {
  const date = scheduleDateFromKey(value);
  if (!date) return '';
  date.setDate(date.getDate() + Number(days || 0));
  return localDateKey(date);
}
function scheduleDayFromDateKey(value) {
  const date = scheduleDateFromKey(value);
  if (!date) return 0;
  const day = date.getDay();
  return day === 0 ? 7 : day;
}
function newScheduleTimeVersionId() {
  return `t_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function newScheduleAssignmentId() {
  return `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
function scheduleTimeVersionsForEntry(entry) {
  const raw = entry?.timeVersions && typeof entry.timeVersions === 'object' ? entry.timeVersions : {};
  const list = Object.entries(raw).map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
    .filter(item => validScheduleDateKey(item.effectiveFrom) && Number(item.day) >= 1 && Number(item.day) <= 7)
    .map(item => ({ ...item, day: safeScheduleDay(item.day), start: safeScheduleTime(item.start), durationMinutes: safeScheduleDuration(item.durationMinutes), effectiveFrom: validScheduleDateKey(item.effectiveFrom), createdAt: Math.max(0, Number(item.createdAt || 0)) }));
  if (!list.length || Number(entry?.slotModelVersion || 0) < 2) {
    const legacyDate = validScheduleDateKey(entry?.startDate) || validScheduleDateKey(entry?.date) || '2000-01-01';
    const legacy = {
      id: '__legacy__', effectiveFrom: legacyDate,
      day: safeScheduleDay(entry?.day || scheduleDayFromDateKey(entry?.date)),
      start: safeScheduleTime(entry?.start), durationMinutes: safeScheduleDuration(entry?.durationMinutes),
      createdAt: Math.max(0, Number(entry?.createdAt || 0))
    };
    if (!list.some(item => item.effectiveFrom === legacy.effectiveFrom && item.day === legacy.day && item.start === legacy.start)) list.push(legacy);
  }
  return list.sort((a, b) => a.effectiveFrom.localeCompare(b.effectiveFrom) || a.createdAt - b.createdAt);
}
function scheduleSlotTimeForDate(entry, dateKeyRaw) {
  const dateKey = validScheduleDateKey(dateKeyRaw);
  if (!dateKey) return null;
  if (Number(entry?.slotModelVersion || 0) < 2) {
    const legacyMode = String(entry?.scheduleMode || '').trim().toLowerCase();
    const legacyDate = validScheduleDateKey(entry?.date);
    if (legacyMode && legacyMode !== 'weekly' && legacyDate && legacyDate !== dateKey) return null;
  }
  if (validScheduleDateKey(entry?.oneOffDate) && entry.oneOffDate !== dateKey) return null;
  const versions = scheduleTimeVersionsForEntry(entry).filter(item => item.effectiveFrom <= dateKey);
  return versions.length ? versions[versions.length - 1] : null;
}
function scheduleClosureRangesForEntry(entry) {
  const raw = entry?.closedRanges && typeof entry.closedRanges === 'object' ? entry.closedRanges : {};
  return Object.entries(raw).map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
    .map(item => ({ ...item, fromDate: validScheduleDateKey(item.fromDate), toDate: validScheduleDateKey(item.toDate) }))
    .filter(item => item.fromDate && item.toDate && item.toDate >= item.fromDate)
    .sort((a, b) => a.fromDate.localeCompare(b.fromDate) || a.toDate.localeCompare(b.toDate));
}
function scheduleSlotClosedOnDate(entry, dateKeyRaw) {
  const dateKey = validScheduleDateKey(dateKeyRaw);
  if (!dateKey) return false;
  const retiredFrom = validScheduleDateKey(entry?.retiredFrom);
  if (retiredFrom && dateKey >= retiredFrom) return true;
  return scheduleClosureRangesForEntry(entry).some(item => dateKey >= item.fromDate && dateKey <= item.toDate);
}
function scheduleSlotOccursOnDate(entry, dateKeyRaw) {
  const dateKey = validScheduleDateKey(dateKeyRaw);
  if (!dateKey || scheduleSlotClosedOnDate(entry, dateKey)) return false;
  const time = scheduleSlotTimeForDate(entry, dateKey);
  return Boolean(time && time.day === scheduleDayFromDateKey(dateKey));
}
function scheduleAssignmentsForEntry(entry) {
  const result = [];
  const raw = entry?.assignments && typeof entry.assignments === 'object' ? entry.assignments : {};
  for (const [id, value] of Object.entries(raw)) {
    if (!value || typeof value !== 'object') continue;
    const studentId = safeStudentId(value.studentId);
    if (!studentId) continue;
    const mode = safeAttendanceMode(value.mode || value.scheduleMode);
    const assignment = { id, ...value, studentId, mode, createdAt: Math.max(0, Number(value.createdAt || 0)) };
    result.push(assignment);
  }
  const explicit = new Set(result.map(item => item.studentId));
  const legacyRaw = entry?.studentIds;
  const legacyIds = Array.isArray(legacyRaw) ? legacyRaw.map(safeStudentId).filter(Boolean)
    : (legacyRaw && typeof legacyRaw === 'object' ? Object.keys(legacyRaw).map(safeStudentId).filter(id => id && legacyRaw[id]) : []);
  const legacyMode = safeAttendanceMode(entry?.scheduleMode || 'weekly');
  for (const studentId of legacyIds) {
    if (explicit.has(studentId)) continue;
    const date = validScheduleDateKey(entry?.date);
    const assignment = { id: `__legacy__${studentId}`, studentId, mode: legacyMode, createdAt: Math.max(0, Number(entry?.createdAt || 0)), legacy: true };
    if (legacyMode === 'recurring') assignment.startDate = validScheduleDateKey(entry?.startDate) || '2000-01-01';
    else if (legacyMode === 'dates') assignment.dates = date ? { [date]: true } : {};
    else assignment.date = date;
    result.push(assignment);
  }
  return result;
}
function scheduleFinalCutoffForStudent(studentId, sourceAssignment) {
  const id = safeStudentId(studentId);
  if (!id) return '';
  const createdAt = Math.max(0, Number(sourceAssignment?.createdAt || 0));
  const dates = [];
  for (const entry of Object.values(teacherProfileCache.scheduleEntries || {})) {
    for (const assignment of scheduleAssignmentsForEntry(entry)) {
      if (assignment.studentId !== id || safeAttendanceMode(assignment.mode) !== 'final') continue;
      if (Math.max(0, Number(assignment.createdAt || 0)) < createdAt) continue;
      const date = validScheduleDateKey(assignment.date);
      if (date) dates.push(date);
    }
  }
  return dates.sort()[0] || '';
}
function scheduleAssignmentOccursOnDate(entry, assignment, dateKeyRaw) {
  const dateKey = validScheduleDateKey(dateKeyRaw);
  if (!dateKey || !scheduleSlotOccursOnDate(entry, dateKey)) return false;
  const mode = safeAttendanceMode(assignment.mode);
  const cutoff = mode === 'final' ? '' : scheduleFinalCutoffForStudent(assignment.studentId, assignment);
  if (cutoff && dateKey >= cutoff) return false;
  if (mode === 'recurring') return dateKey >= (validScheduleDateKey(assignment.startDate) || '2000-01-01');
  if (mode === 'dates') return Boolean(assignment?.dates && typeof assignment.dates === 'object' && assignment.dates[dateKey]);
  return validScheduleDateKey(assignment.date) === dateKey;
}
function scheduleActiveAssignmentsForDate(entry, dateKey) {
  const priority = { recurring: 1, dates: 2, intro: 3, final: 4 };
  const byStudent = new Map();
  for (const assignment of scheduleAssignmentsForEntry(entry)) {
    const studentId = safeStudentId(assignment.studentId);
    if (!studentId || !teacherProfileCache.students?.[studentId] || !scheduleAssignmentOccursOnDate(entry, assignment, dateKey)) continue;
    const previous = byStudent.get(studentId);
    if (!previous || (priority[safeAttendanceMode(assignment.mode)] || 0) >= (priority[safeAttendanceMode(previous.mode)] || 0)) byStudent.set(studentId, assignment);
  }
  return Array.from(byStudent.values());
}
function scheduleTimesOverlap(a, b) {
  const aStart = scheduleTimeMinutes(a?.start);
  const bStart = scheduleTimeMinutes(b?.start);
  const aEnd = aStart + safeScheduleDuration(a?.durationMinutes);
  const bEnd = bStart + safeScheduleDuration(b?.durationMinutes);
  return aStart < bEnd && aEnd > bStart;
}
function findScheduleTimeVersionConflict(candidate, excludeScheduleId = '') {
  const effectiveFrom = validScheduleDateKey(candidate?.effectiveFrom) || localDateKey();
  for (let offset = 0; offset < 370; offset += 1) {
    const dateKey = scheduleAddDays(effectiveFrom, offset);
    if (scheduleDayFromDateKey(dateKey) !== safeScheduleDay(candidate?.day)) continue;
    for (const [id, raw] of Object.entries(teacherProfileCache.scheduleEntries || {})) {
      if (String(id) === String(excludeScheduleId || '') || !raw || typeof raw !== 'object' || !scheduleSlotOccursOnDate(raw, dateKey)) continue;
      const otherTime = scheduleSlotTimeForDate(raw, dateKey);
      if (scheduleTimesOverlap(candidate, otherTime)) return { id, ...raw, conflictDateKey: dateKey, conflictTime: otherTime };
    }
  }
  return null;
}
function findScheduleConflict(day, start, durationMinutes, excludeScheduleId = '') {
  return findScheduleTimeVersionConflict({ effectiveFrom: localDateKey(), day, start, durationMinutes }, excludeScheduleId);
}
function scheduleConflictError(conflict) {
  const label = cleanScheduleLabel(conflict?.label) || 'kitas pamokos laikas';
  const time = conflict?.conflictTime || scheduleTimeVersionsForEntry(conflict || {}).slice(-1)[0] || {};
  const start = safeScheduleTime(time.start);
  const end = scheduleClockMinutes(scheduleTimeMinutes(start) + safeScheduleDuration(time.durationMinutes));
  const date = validScheduleDateKey(conflict?.conflictDateKey);
  const error = new Error(`Laikas persidengia su „${label}“${date ? ` ${date}` : ''} (${start}–${end}).`);
  error.code = 'schedule-conflict';
  return error;
}
function explicitScheduleSlotPayload(existing = {}) {
  const now = Date.now();
  const timeVersions = {};
  for (const item of scheduleTimeVersionsForEntry(existing)) {
    const id = item.id === '__legacy__' ? newScheduleTimeVersionId() : String(item.id || newScheduleTimeVersionId());
    timeVersions[id] = { effectiveFrom: item.effectiveFrom, day: safeScheduleDay(item.day), start: safeScheduleTime(item.start), durationMinutes: safeScheduleDuration(item.durationMinutes), createdAt: Math.max(0, Number(item.createdAt || existing.createdAt || now)) || now };
  }
  const assignments = {};
  for (const item of scheduleAssignmentsForEntry(existing)) {
    const id = String(item.id || '').startsWith('__legacy__') ? newScheduleAssignmentId() : String(item.id || newScheduleAssignmentId());
    const mode = safeAttendanceMode(item.mode);
    const value = { studentId: safeStudentId(item.studentId), mode, createdAt: Math.max(0, Number(item.createdAt || existing.createdAt || now)) || now, updatedAt: now };
    if (mode === 'recurring') value.startDate = validScheduleDateKey(item.startDate) || '2000-01-01';
    else if (mode === 'dates') value.dates = Object.fromEntries(Object.keys(item.dates && typeof item.dates === 'object' ? item.dates : {}).map(validScheduleDateKey).filter(Boolean).map(date => [date, true]));
    else value.date = validScheduleDateKey(item.date);
    assignments[id] = value;
  }
  const closedRanges = {};
  for (const item of scheduleClosureRangesForEntry(existing)) {
    const id = String(item.id || '').trim() || `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
    closedRanges[id] = { fromDate: item.fromDate, toDate: item.toDate, createdAt: Math.max(0, Number(item.createdAt || now)) || now };
  }
  const currentTime = scheduleSlotTimeForDate(existing, localDateKey()) || Object.values(timeVersions).sort((a,b) => a.effectiveFrom.localeCompare(b.effectiveFrom)).slice(-1)[0] || { day: 1, start: '16:00', durationMinutes: 40 };
  return {
    schemaVersion: P2_DATA_SCHEMA_VERSION,
    slotModelVersion: 2,
    label: cleanScheduleLabel(existing.label),
    timeVersions,
    assignments,
    closedRanges,
    retiredFrom: validScheduleDateKey(existing.retiredFrom),
    lessonId: String(existing.lessonId || '').trim().slice(0, 80),
    practiceTitle: String(existing.practiceTitle || '').trim().slice(0, 140),
    taskCount: Math.max(0, Math.min(500, Math.round(Number(existing.taskCount) || 0))),
    contentVersion: existing.contentVersion || null,
    contentHash: String(existing.contentHash || '').slice(0, 80),
    taskIds: Array.isArray(existing.taskIds) ? existing.taskIds.slice(0, 500) : [],
    contentSnapshot: existing.contentSnapshot || null,
    attemptPolicy: sanitizeAttemptPolicy(existing.attemptPolicy),
    oneOffDate: validScheduleDateKey(existing.oneOffDate) || (Number(existing.slotModelVersion || 0) < 2 && String(existing.scheduleMode || '').trim() && String(existing.scheduleMode).trim() !== 'weekly' ? validScheduleDateKey(existing.date) : ''),
    day: safeScheduleDay(currentTime.day), start: safeScheduleTime(currentTime.start), durationMinutes: safeScheduleDuration(currentTime.durationMinutes),
    createdAt: Math.max(0, Number(existing.createdAt || now)) || now,
    updatedAt: now
  };
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
function safeStudentGrade(value) {
  const grade = Math.round(Number(value) || 0);
  return grade >= 1 && grade <= 12 ? grade : 0;
}
function cleanGuardianRelation(value) {
  const relation = String(value || '').trim().toLocaleLowerCase('lt-LT');
  return relation === 'mama' || relation === 'tėtis' || relation === 'kita' ? relation : '';
}
function cleanGuardianCustomRelation(value) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 40); }
function cleanGuardianName(value) { return String(value || '').trim().replace(/\s+/g, ' ').slice(0, 80); }
function normalizedGuardianFields(detail = {}) {
  let guardianRelation = cleanGuardianRelation(detail.guardianRelation);
  let guardianCustomRelation = cleanGuardianCustomRelation(detail.guardianCustomRelation);
  let guardianName = cleanGuardianName(detail.guardianName);
  if (!guardianRelation || !guardianName || (guardianRelation === 'kita' && !guardianCustomRelation)) {
    guardianRelation = '';
    guardianCustomRelation = '';
    guardianName = '';
  } else if (guardianRelation !== 'kita') {
    guardianCustomRelation = '';
  }
  return { guardianRelation, guardianCustomRelation, guardianName };
}
function cleanStudentNotes(value) { return String(value || '').trim().slice(0, 600); }
function emitTeacherProfile() {
  if (!teacherProfileId) return;
  window.dispatchEvent(new CustomEvent('p2:students-state', {
    detail: {
      profileId: teacherProfileId,
      meta: teacherProfileCache.meta || {},
      students: teacherProfileCache.students || {},
      roomLinks: teacherProfileCache.roomLinks || {},
      classSessions: teacherProfileCache.classSessions || {},
      scheduleEntries: teacherProfileCache.scheduleEntries || {},
      scheduleRuns: teacherProfileCache.scheduleRuns || {}
    }
  }));
}

// P1.7.5.6 vienkartinis vartotojo paprašytas duomenų pataisymas.
// Svarbu: būsimos pamokos saugomos TIK scheduleEntries. Mokinio kortelė jų
// nekopijuoja į atskirą struktūrą, todėl šis įrašas iš karto matysis ir
// Tvarkaraštyje, ir Adomo kortelėje. Kitame patvirtintame build'e šį
// vienkartinį migracijos bloką galima pašalinti; profilyje lieka markeris.
const P1756_TARGET_PROFILE_ID = 'T-VDU4BBHJAWNDRHAPPH';
const P1756_TARGET_STUDENT_ID = 's_msrqctow_eb68cwy';
const P1756_SCHEDULE_MIGRATION_KEY = 'p1756_adomas_thursday_1930_80';
let p1756ScheduleMigrationRunning = false;
let p1756ScheduleConflictShown = false;

async function applyP1756RequestedScheduleOnce() {
  if (onlineRole !== 'teacher' || !teacherProfileRef || teacherProfileId !== P1756_TARGET_PROFILE_ID) return;
  if (p1756ScheduleMigrationRunning) return;
  const migrations = teacherProfileCache.meta?.migrations && typeof teacherProfileCache.meta.migrations === 'object'
    ? teacherProfileCache.meta.migrations : {};
  if (migrations[P1756_SCHEDULE_MIGRATION_KEY]?.status === 'done') return;

  let studentId = teacherProfileCache.students?.[P1756_TARGET_STUDENT_ID] ? P1756_TARGET_STUDENT_ID : '';
  if (!studentId) {
    const candidates = Object.entries(teacherProfileCache.students || {}).filter(([, student]) => {
      const name = cleanStudentName(student?.name).toLocaleLowerCase('lt-LT');
      return name === 'adomas' && safeStudentGrade(student?.grade) === 8;
    });
    if (candidates.length === 1) studentId = candidates[0][0];
  }
  if (!studentId) return;

  const targetDay = 4;
  const targetStart = '19:30';
  const targetDuration = 80;
  const entries = Object.entries(teacherProfileCache.scheduleEntries || {});
  const sameStart = entries.find(([, entry]) => safeScheduleDay(entry?.day) === targetDay && safeScheduleTime(entry?.start) === targetStart) || null;
  const sameStartId = sameStart?.[0] || '';
  const sameStartEntry = sameStart?.[1] || null;
  const sameStartStudents = sameStartEntry?.studentIds && typeof sameStartEntry.studentIds === 'object'
    ? Object.keys(sameStartEntry.studentIds).filter(id => sameStartEntry.studentIds[id]) : [];

  // P1.7.7: vienas pamokos laikas gali turėti skirtingus mokinius, todėl
  // senasis vienkartinis Adomo priskyrimas gali saugiai naudoti jau esamą
  // ketvirtadienio 19:30 laiko kortelę.

  const conflict = findScheduleConflict(targetDay, targetStart, targetDuration, sameStartId);
  if (conflict) {
    if (!p1756ScheduleConflictShown) {
      p1756ScheduleConflictShown = true;
      bridge.showToast?.(`Adomo 19:30–20:50 laikas kertasi su kita pamoka (${safeScheduleTime(conflict.start)}).`);
    }
    return;
  }

  p1756ScheduleMigrationRunning = true;
  try {
    const now = Date.now();
    const scheduleId = sameStartId || newScheduleId();
    const updates = {};
    if (sameStartEntry) {
      updates[`scheduleEntries/${scheduleId}/schemaVersion`] = P2_DATA_SCHEMA_VERSION;
      updates[`scheduleEntries/${scheduleId}/day`] = targetDay;
      updates[`scheduleEntries/${scheduleId}/start`] = targetStart;
      updates[`scheduleEntries/${scheduleId}/durationMinutes`] = targetDuration;
      updates[`scheduleEntries/${scheduleId}/studentIds/${studentId}`] = true;
      updates[`scheduleEntries/${scheduleId}/updatedAt`] = now;
    } else {
      updates[`scheduleEntries/${scheduleId}`] = {
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        day: targetDay,
        start: targetStart,
        durationMinutes: targetDuration,
        label: '',
        studentIds: { [studentId]: true },
        lessonId: '',
        practiceTitle: '',
        taskCount: 0,
        contentVersion: null,
        contentHash: '',
        taskIds: [],
        contentSnapshot: null,
        attemptPolicy: null,
        createdAt: now,
        updatedAt: now
      };
    }
    updates[`meta/migrations/${P1756_SCHEDULE_MIGRATION_KEY}`] = {
      status: 'done', scheduleId, studentId, day: targetDay, start: targetStart, durationMinutes: targetDuration, appliedAt: now
    };
    await update(teacherProfileRef, updates);
    bridge.showToast?.('Adomui priskirta: ketvirtadienis 19:30–20:50.');
  } catch (error) {
    console.error('P1.7.5.6 Adomo tvarkaraščio migracijos klaida', error);
    bridge.showToast?.('Nepavyko automatiškai priskirti Adomo pamokos laiko.');
  } finally {
    p1756ScheduleMigrationRunning = false;
  }
}
if (teacherProfileRef) {
  onValue(teacherProfileRef, snapshot => {
    const value = snapshot.val() || {};
    teacherProfileCache = {
      meta: value.meta && typeof value.meta === 'object' ? value.meta : {},
      students: value.students && typeof value.students === 'object' ? value.students : {},
      roomLinks: value.roomLinks && typeof value.roomLinks === 'object' ? value.roomLinks : {},
      classSessions: value.classSessions && typeof value.classSessions === 'object' ? value.classSessions : {},
      scheduleEntries: value.scheduleEntries && typeof value.scheduleEntries === 'object' ? value.scheduleEntries : {},
      scheduleRuns: value.scheduleRuns && typeof value.scheduleRuns === 'object' ? value.scheduleRuns : {}
    };
    const profileMeta = teacherProfileCache.meta || {};
    if (Number(profileMeta.schemaVersion || 0) < P2_DATA_SCHEMA_VERSION || profileMeta.lastCompatibleBuild !== BUILD) {
      const now = Date.now();
      const metaUpdates = {
        'meta/schemaVersion': P2_DATA_SCHEMA_VERSION,
        'meta/lastCompatibleBuild': BUILD,
        'meta/lastOpenedAt': now
      };
      if (!profileMeta.createdAt) metaUpdates['meta/createdAt'] = now;
      update(teacherProfileRef, metaUpdates).catch(error => console.warn('Nepavyko papildyti duomenų schemos metaduomenų', error));
    }
    emitTeacherProfile();
    applyP1756RequestedScheduleOnce().catch(error => console.warn('P1.7.5.6 tvarkaraščio migracija neįvykdyta', error));
  }, error => {
    console.error('P2-SPLIT-P2.5-P2 mokinių bazės skaitymo klaida', error);
    bridge.showToast?.('Nepavyko atidaryti mokinių bazės');
    emitTeacherProfile();
  });
}

function backupRoomIdsFromProfile(profile) {
  const ids = new Set();
  const activeRoom = safeRoom(roomId); if (activeRoom) ids.add(activeRoom);
  for (const roomId of Object.keys(profile?.roomLinks || {})) {
    const safe = safeRoom(roomId); if (safe) ids.add(safe);
  }
  for (const student of Object.values(profile?.students || {})) {
    for (const roomId of Object.keys(student?.lessons || {})) {
      const safe = safeRoom(roomId); if (safe) ids.add(safe);
    }
  }
  for (const byDate of Object.values(profile?.scheduleRuns || {})) {
    for (const run of Object.values(byDate || {})) {
      for (const roomValue of Object.values(run?.rooms || {})) {
        const safe = safeRoom(roomValue?.roomId || roomValue); if (safe) ids.add(safe);
      }
    }
  }
  return Array.from(ids).sort();
}

function triggerJsonDownload(filename, value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

window.addEventListener('p2:backup-request', async () => {
  if (onlineRole !== 'teacher' || !teacherProfileRef || !teacherProfileId) return;
  try {
    bridge.showToast?.('Ruošiama duomenų atsarginė kopija…');
    const profileSnapshot = await get(teacherProfileRef);
    const profile = profileSnapshot.val() || {};
    const roomIds = backupRoomIdsFromProfile(profile);
    const rooms = {};
    const batchSize = 6;
    for (let i = 0; i < roomIds.length; i += batchSize) {
      const batch = roomIds.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(async targetRoom => {
        const snapshot = await get(ref(db, `p772Rooms/${targetRoom}`));
        const raw = snapshot.val() || {};
        return [targetRoom, {
          workspace: raw.workspace || null,
          p2: raw.p2 || null,
          control: raw.control || null
        }];
      }));
      for (const [targetRoom, data] of results) rooms[targetRoom] = data;
    }
    const now = new Date();
    const stamp = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}_${String(now.getHours()).padStart(2,'0')}-${String(now.getMinutes()).padStart(2,'0')}`;
    const backup = {
      backupFormatVersion: BACKUP_FORMAT_VERSION,
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      appBuild: BUILD,
      exportedAt: Date.now(),
      exportedAtIso: now.toISOString(),
      teacherProfileId,
      profile,
      rooms
    };
    triggerJsonDownload(`virtuali-lenta-atsargine-kopija-${stamp}.json`, backup);
    bridge.showToast?.(`Atsarginė kopija paruošta · ${roomIds.length} Room`);
    window.dispatchEvent(new CustomEvent('p2:backup-complete', { detail: { roomCount: roomIds.length } }));
  } catch (error) {
    console.error('P2 duomenų atsarginės kopijos klaida', error);
    bridge.showToast?.('Nepavyko paruošti atsarginės kopijos');
    window.dispatchEvent(new CustomEvent('p2:backup-error'));
  }
});

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

function cleanStudentHistoryProgress(value) {
  if (!value || typeof value !== 'object') return null;
  try {
    const copy = JSON.parse(JSON.stringify(value));
    const taskStates = copy.taskStates && typeof copy.taskStates === 'object' ? copy.taskStates : {};
    const entries = Object.entries(taskStates).slice(0, 500);
    copy.taskStates = Object.fromEntries(entries);
    copy.schemaVersion = P2_DATA_SCHEMA_VERSION;
    if (copy.assignmentKey) copy.assignmentKey = safeAssignmentKey(copy.assignmentKey) || null;
    if (copy.currentTaskId) copy.currentTaskId = String(copy.currentTaskId).slice(0, 80);
    copy.updatedAt = Math.max(0, Number(copy.updatedAt || Date.now()));
    const encoded = JSON.stringify(copy);
    return encoded.length <= 120000 ? copy : null;
  } catch (_) {
    return null;
  }
}

function firebaseGetWithTimeout(targetRef, timeoutMs = 6000) {
  let timer = null;
  return Promise.race([
    get(targetRef),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('history-timeout')), timeoutMs);
    })
  ]).finally(() => { if (timer) clearTimeout(timer); });
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
  const time = scheduleSlotTimeForDate(entry, dateKey) || { day: run?.scheduledDay || entry?.day, start: run?.scheduledStart || entry?.start, durationMinutes: run?.durationMinutes || entry?.durationMinutes };
  const attendanceModes = run?.attendanceModes && typeof run.attendanceModes === 'object' ? run.attendanceModes : {};
  const updates = {
    [`classSessions/${classSessionId}/createdAt`]: Number(existingSession.createdAt || run?.startedAt || now) || now,
    [`classSessions/${classSessionId}/updatedAt`]: now,
    [`classSessions/${classSessionId}/scheduleId`]: scheduleId,
    [`classSessions/${classSessionId}/scheduleDate`]: dateKey,
    [`classSessions/${classSessionId}/scheduledDay`]: safeScheduleDay(time.day),
    [`classSessions/${classSessionId}/scheduledStart`]: safeScheduleTime(time.start),
    [`classSessions/${classSessionId}/durationMinutes`]: safeScheduleDuration(time.durationMinutes),
    [`classSessions/${classSessionId}/label`]: cleanScheduleLabel(entry?.label),
    [`classSessions/${classSessionId}/scheduleModelVersion`]: 2,
    [`scheduleRuns/${scheduleId}/${dateKey}/classSessionId`]: classSessionId
  };
  const localStudents = { ...(existingSession.students && typeof existingSession.students === 'object' ? existingSession.students : {}) };
  const localRoomLinks = { ...(teacherProfileCache.roomLinks || {}) };
  for (const item of roomEntries) {
    const addedAt = Number(existingSession.students?.[item.studentId]?.addedAt || run?.startedAt || now) || now;
    const attendanceMode = safeAttendanceMode(attendanceModes[item.studentId] || existingSession.students?.[item.studentId]?.attendanceMode);
    updates[`classSessions/${classSessionId}/students/${item.studentId}`] = { roomId: item.roomId, addedAt, attendanceMode };
    updates[`roomLinks/${item.roomId}`] = { studentId: item.studentId, classSessionId, scheduleId, linkedAt: Number(run?.startedAt || now) || now };
    localStudents[item.studentId] = { roomId: item.roomId, addedAt, attendanceMode };
    localRoomLinks[item.roomId] = { studentId: item.studentId, classSessionId, scheduleId, linkedAt: Number(run?.startedAt || now) || now };
  }
  await update(teacherProfileRef, updates);
  teacherProfileCache.classSessions = {
    ...(teacherProfileCache.classSessions || {}),
    [classSessionId]: { ...existingSession, createdAt: Number(existingSession.createdAt || run?.startedAt || now) || now, updatedAt: now, scheduleId, scheduleDate: dateKey, scheduledDay: safeScheduleDay(time.day), scheduledStart: safeScheduleTime(time.start), durationMinutes: safeScheduleDuration(time.durationMinutes), label: cleanScheduleLabel(entry?.label), scheduleModelVersion: 2, students: localStudents }
  };
  teacherProfileCache.roomLinks = localRoomLinks;
  teacherProfileCache.scheduleRuns = { ...(teacherProfileCache.scheduleRuns || {}), [scheduleId]: { ...(teacherProfileCache.scheduleRuns?.[scheduleId] || {}), [dateKey]: { ...(run || {}), classSessionId } } };
  emitTeacherProfile();
  return { classSessionId, roomEntries };
}

window.addEventListener('p2:schedule-request', async event => {
  if (onlineRole !== 'teacher' || !teacherProfileRef) return;
  const detail = event.detail || {};
  try {
    const cacheSlot = (scheduleId, payload) => {
      teacherProfileCache.scheduleEntries = { ...(teacherProfileCache.scheduleEntries || {}), [scheduleId]: payload };
      emitTeacherProfile();
    };
    const saveSlot = async (scheduleId, payload, kind, message) => {
      payload.updatedAt = Date.now();
      await set(ref(db, `p772TeacherProfiles/${teacherProfileId}/scheduleEntries/${scheduleId}`), payload);
      cacheSlot(scheduleId, payload);
      if (message) bridge.showToast?.(message);
      window.dispatchEvent(new CustomEvent('p2:schedule-saved', { detail: { scheduleId, kind } }));
      return payload;
    };

    if (detail.action === 'slot-add') {
      const effectiveFrom = validScheduleDateKey(detail.effectiveFrom);
      if (!effectiveFrom) throw new Error('Pasirink, nuo kada galioja pamokos laikas');
      const day = safeScheduleDay(detail.day);
      const start = safeScheduleTime(detail.start);
      const durationMinutes = safeScheduleDuration(detail.durationMinutes);
      const conflict = findScheduleTimeVersionConflict({ effectiveFrom, day, start, durationMinutes });
      if (conflict) throw scheduleConflictError(conflict);
      const scheduleId = newScheduleId();
      const versionId = newScheduleTimeVersionId();
      const now = Date.now();
      const lessonId = String(detail.lessonId || '').trim().slice(0, 80);
      const contentMeta = lessonId ? assignmentContentMetadata(detail, {}) : null;
      const payload = {
        schemaVersion: P2_DATA_SCHEMA_VERSION, slotModelVersion: 2,
        label: cleanScheduleLabel(detail.label),
        timeVersions: { [versionId]: { effectiveFrom, day, start, durationMinutes, createdAt: now } },
        assignments: {},
        lessonId,
        practiceTitle: String(detail.practiceTitle || '').trim().slice(0, 140),
        taskCount: Math.max(0, Math.min(500, Math.round(Number(detail.taskCount) || 0))),
        contentVersion: contentMeta?.contentVersion || null,
        contentHash: contentMeta?.contentHash || '',
        taskIds: contentMeta?.taskIds || [],
        contentSnapshot: contentMeta?.contentSnapshot || null,
        attemptPolicy: lessonId ? sanitizeAttemptPolicy(detail.attemptPolicy) : null,
        oneOffDate: '', day, start, durationMinutes,
        createdAt: now, updatedAt: now
      };
      await saveSlot(scheduleId, payload, 'slot-add', 'Pamokos laikas sukurtas');
      return;
    }

    const scheduleId = safeScheduleId(detail.scheduleId);
    if (!scheduleId) return;
    const existing = teacherProfileCache.scheduleEntries?.[scheduleId];
    if (!existing || typeof existing !== 'object') throw new Error('Pamokos laikas nerastas');

    if (detail.action === 'slot-delete') {
      await update(teacherProfileRef, { [`scheduleEntries/${scheduleId}`]: null, [`scheduleRuns/${scheduleId}`]: null });
      const nextEntries = { ...(teacherProfileCache.scheduleEntries || {}) }; delete nextEntries[scheduleId];
      const nextRuns = { ...(teacherProfileCache.scheduleRuns || {}) }; delete nextRuns[scheduleId];
      teacherProfileCache.scheduleEntries = nextEntries; teacherProfileCache.scheduleRuns = nextRuns; emitTeacherProfile();
      bridge.showToast?.('Pamokos laikas pašalintas');
      window.dispatchEvent(new CustomEvent('p2:schedule-saved', { detail: { scheduleId, kind: 'slot-delete' } }));
      return;
    }

    if (detail.action === 'slot-close-range') {
      const fromDate = validScheduleDateKey(detail.fromDate);
      const toDate = validScheduleDateKey(detail.toDate);
      if (!fromDate || !toDate || toDate < fromDate) throw new Error('Patikrink laikino pašalinimo datas');
      const payload = explicitScheduleSlotPayload(existing);
      const retiredFrom = validScheduleDateKey(payload.retiredFrom);
      if (retiredFrom && fromDate >= retiredFrom) throw new Error('Šis pamokos laikas nuo pasirinktos datos jau pašalintas visam laikui');
      const closureId = `c_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      payload.closedRanges[closureId] = { fromDate, toDate: retiredFrom && toDate >= retiredFrom ? scheduleAddDays(retiredFrom, -1) : toDate, createdAt: Date.now() };
      if (payload.closedRanges[closureId].toDate < fromDate) throw new Error('Pasirinktas intervalas patenka po laiko pašalinimo visam laikui datos');
      await saveSlot(scheduleId, payload, 'slot-close-range', `Pamokos laikas laikinai pašalintas ${fromDate}–${payload.closedRanges[closureId].toDate}`);
      return;
    }

    if (detail.action === 'slot-close-range-delete') {
      const closureId = String(detail.closureId || '').trim();
      const payload = explicitScheduleSlotPayload(existing);
      if (!closureId || !payload.closedRanges?.[closureId]) throw new Error('Laikino pašalinimo išimtis nerasta');
      delete payload.closedRanges[closureId];
      await saveSlot(scheduleId, payload, 'slot-close-range-delete', 'Laikino pašalinimo išimtis atšaukta');
      return;
    }

    if (detail.action === 'slot-close-forever') {
      const fromDate = validScheduleDateKey(detail.fromDate);
      if (!fromDate) throw new Error('Pasirink datą, nuo kurios laikas panaikinamas');
      const payload = explicitScheduleSlotPayload(existing);
      payload.retiredFrom = fromDate;
      for (const [id, range] of Object.entries(payload.closedRanges || {})) {
        if (range.fromDate >= fromDate) { delete payload.closedRanges[id]; continue; }
        if (range.toDate >= fromDate) range.toDate = scheduleAddDays(fromDate, -1);
      }
      await saveSlot(scheduleId, payload, 'slot-close-forever', `Pamokos laikas panaikintas nuo ${fromDate}`);
      return;
    }

    if (detail.action === 'slot-meta') {
      const payload = explicitScheduleSlotPayload(existing);
      const lessonId = String(detail.lessonId || '').trim().slice(0, 80);
      const contentMeta = lessonId ? assignmentContentMetadata(detail, payload) : null;
      payload.label = cleanScheduleLabel(detail.label);
      payload.lessonId = lessonId;
      payload.practiceTitle = String(detail.practiceTitle || '').trim().slice(0, 140);
      payload.taskCount = Math.max(0, Math.min(500, Math.round(Number(detail.taskCount) || 0)));
      payload.contentVersion = contentMeta?.contentVersion || null;
      payload.contentHash = contentMeta?.contentHash || '';
      payload.taskIds = contentMeta?.taskIds || [];
      payload.contentSnapshot = contentMeta?.contentSnapshot || null;
      payload.attemptPolicy = lessonId ? sanitizeAttemptPolicy(detail.attemptPolicy) : null;
      await saveSlot(scheduleId, payload, 'slot-meta', 'Pamokos informacija išsaugota');
      return;
    }


    if (detail.action === 'assignment-delete') {
      const assignmentId = String(detail.assignmentId || '').trim();
      const payload = explicitScheduleSlotPayload(existing);
      if (!assignmentId || !payload.assignments?.[assignmentId]) throw new Error('Mokinio priskyrimas nerastas');
      delete payload.assignments[assignmentId];
      await saveSlot(scheduleId, payload, 'assignment', 'Mokinio priskyrimas pašalintas');
      return;
    }

    if (detail.action === 'assignment-add') {
      const studentId = safeStudentId(detail.studentId);
      if (!studentId || !teacherProfileCache.students?.[studentId]) throw new Error('Pasirink mokinį');
      const mode = safeAttendanceMode(detail.mode);
      const payload = explicitScheduleSlotPayload(existing);
      if (mode === 'recurring') {
        const duplicate = Object.values(payload.assignments || {}).find(item => safeStudentId(item?.studentId) === studentId && safeAttendanceMode(item?.mode) === 'recurring');
        if (duplicate) throw new Error('Šis mokinys jau turi nuolatinį priskyrimą šiam laikui');
      }
      const assignmentId = newScheduleAssignmentId();
      const now = Date.now();
      const assignment = { studentId, mode, createdAt: now, updatedAt: now };
      if (mode === 'recurring') {
        assignment.startDate = validScheduleDateKey(detail.startDate);
        if (!assignment.startDate) throw new Error('Pasirink, nuo kada mokinys lanko nuolat');
      } else if (mode === 'dates') {
        let dates = Array.isArray(detail.dates) ? detail.dates.map(validScheduleDateKey).filter(Boolean) : [];
        if (!dates.length && validScheduleDateKey(detail.rangeStart) && validScheduleDateKey(detail.rangeEnd)) {
          const from = detail.rangeStart; const to = detail.rangeEnd; const everyWeeks = Math.max(1, Math.min(12, Math.round(Number(detail.everyWeeks) || 1)));
          let occurrenceIndex = 0;
          for (let dateKey = from, guard = 0; dateKey && dateKey <= to && guard < 800; dateKey = scheduleAddDays(dateKey, 1), guard += 1) {
            if (!scheduleSlotOccursOnDate(payload, dateKey)) continue;
            if (occurrenceIndex % everyWeeks === 0) dates.push(dateKey);
            occurrenceIndex += 1;
          }
        }
        dates = Array.from(new Set(dates)).sort();
        if (!dates.length) throw new Error('Nenurodyta nė viena tinkama pavienės pamokos data');
        const invalid = dates.find(dateKey => !scheduleSlotOccursOnDate(payload, dateKey));
        if (invalid) throw new Error(`${invalid} nėra šio pamokos laiko diena`);
        assignment.dates = Object.fromEntries(dates.map(dateKey => [dateKey, true]));
      } else {
        assignment.date = validScheduleDateKey(detail.date);
        if (!assignment.date) throw new Error('Pasirink pamokos datą');
        if (!scheduleSlotOccursOnDate(payload, assignment.date)) throw new Error(`${assignment.date} nėra šio pamokos laiko diena`);
      }
      payload.assignments[assignmentId] = assignment;
      await saveSlot(scheduleId, payload, 'assignment', `${cleanStudentName(teacherProfileCache.students?.[studentId]?.name) || 'Mokinys'} priskirtas`);
      return;
    }

    if (detail.action === 'start') {
      const dateKey = validScheduleDateKey(detail.dateKey) || localDateKey();
      if (!scheduleSlotOccursOnDate(existing, dateKey)) throw new Error('Šis pamokos laikas pasirinktą datą nevyksta');
      const existingRun = teacherProfileCache.scheduleRuns?.[scheduleId]?.[dateKey];
      if (existingRun?.rooms && typeof existingRun.rooms === 'object') {
        const repaired = await ensureScheduleRunClassSession(scheduleId, dateKey, existingRun, existing);
        const firstRoom = repaired.roomEntries[0]?.roomId || Object.values(existingRun.rooms).map(value => safeRoom(value?.roomId || value)).find(Boolean) || '';
        bridge.showToast?.('Ši pamoka jau atidaryta');
        window.dispatchEvent(new CustomEvent('p2:schedule-started', { detail: { scheduleId, dateKey, firstRoom, existing: true, classSessionId: repaired.classSessionId, rooms: Object.fromEntries(repaired.roomEntries.map(item => [item.studentId, item.roomId])) } }));
        return;
      }

      const activeAssignments = scheduleActiveAssignmentsForDate(existing, dateKey);
      if (!activeAssignments.length) throw new Error('Šiai datai nėra priskirtų mokinių');
      const time = scheduleSlotTimeForDate(existing, dateKey);
      const classSessionId = newClassSessionId();
      const now = Date.now();
      const lessonId = String(existing.lessonId || '').trim().slice(0, 80);
      const practiceTitle = String(existing.practiceTitle || '').trim().slice(0, 140);
      const taskCount = Math.max(0, Math.min(500, Math.round(Number(existing.taskCount) || 0)));
      const durationMinutes = safeScheduleDuration(time?.durationMinutes);
      const rooms = {};
      const attendanceModes = {};
      const updates = {
        [`classSessions/${classSessionId}/schemaVersion`]: P2_DATA_SCHEMA_VERSION,
        [`classSessions/${classSessionId}/scheduleModelVersion`]: 2,
        [`classSessions/${classSessionId}/createdAt`]: now,
        [`classSessions/${classSessionId}/updatedAt`]: now,
        [`classSessions/${classSessionId}/scheduleId`]: scheduleId,
        [`classSessions/${classSessionId}/scheduleDate`]: dateKey,
        [`classSessions/${classSessionId}/scheduledDay`]: safeScheduleDay(time?.day),
        [`classSessions/${classSessionId}/scheduledStart`]: safeScheduleTime(time?.start),
        [`classSessions/${classSessionId}/durationMinutes`]: durationMinutes,
        [`classSessions/${classSessionId}/label`]: cleanScheduleLabel(existing.label)
      };

      for (const activeAssignment of activeAssignments) {
        const studentId = safeStudentId(activeAssignment.studentId);
        if (!studentId || !teacherProfileCache.students?.[studentId]) continue;
        const attendanceMode = safeAttendanceMode(activeAssignment.mode);
        attendanceModes[studentId] = attendanceMode;
        const targetRoom = newRoomId();
        rooms[studentId] = targetRoom;
        const studentName = cleanStudentName(teacherProfileCache.students?.[studentId]?.name) || 'Mokinys';
        const blank = emptyWorkspace();
        await set(ref(db, `p772Rooms/${targetRoom}/workspace`), { ...blank, meta: { schemaVersion: 1, seededBy: me, updatedAt: serverTimestamp() } });
        let roomAssignment = null;
        if (lessonId) {
          const metadata = assignmentContentMetadata(existing, { lessonId, title: practiceTitle, taskCount });
          const assignmentKey = newAssignmentKey(lessonId, now);
          roomAssignment = { schemaVersion: P2_DATA_SCHEMA_VERSION, assignmentKey, lessonId, title: practiceTitle || 'Pamoka', taskCount, contentVersion: metadata.contentVersion, contentHash: metadata.contentHash, taskIds: metadata.taskIds, contentSnapshot: metadata.contentSnapshot, attemptPolicy: sanitizeAttemptPolicy(existing.attemptPolicy), assignedAt: now, assignedBy: me };
          await set(ref(db, `p772Rooms/${targetRoom}/p2/student/assignment`), roomAssignment);
          await set(ref(db, `p772Rooms/${targetRoom}/p2/student/progress`), { schemaVersion: P2_DATA_SCHEMA_VERSION, assignmentId: lessonId, assignmentKey, assignmentContentVersion: roomAssignment.contentVersion, status: 'not_started', currentTaskId: '', taskStates: {}, startedAt: null, updatedAt: now });
        }
        await set(ref(db, `p772Rooms/${targetRoom}/p2/student/profile`), { schemaVersion: P2_DATA_SCHEMA_VERSION, studentId, name: studentName, classSessionId, scheduleId, attendanceMode, updatedAt: now });
        await set(ref(db, `p772Rooms/${targetRoom}/p2/meta`), { schemaVersion: P2_DATA_SCHEMA_VERSION, createdWithBuild: BUILD, updatedAt: now });

        const recordTitle = practiceTitle || cleanScheduleLabel(existing.label) || (lessonId ? 'Pamoka' : 'Lentos sesija');
        const initialSummary = cleanLessonSummary({ taskCount });
        const archiveMeta = roomAssignment ? assignmentArchiveMetadata(roomAssignment, initialSummary) : null;
        updates[`students/${studentId}/lessons/${targetRoom}`] = {
          schemaVersion: P2_DATA_SCHEMA_VERSION, roomId: targetRoom, classSessionId, scheduleId, scheduleDate: dateKey,
          scheduledDay: safeScheduleDay(time?.day), scheduledStart: safeScheduleTime(time?.start), durationMinutes,
          scheduleMode: attendanceMode, attendanceMode,
          lessonId, title: recordTitle, taskCount,
          assignmentKey: roomAssignment?.assignmentKey || '', contentVersion: roomAssignment?.contentVersion || null, contentHash: roomAssignment?.contentHash || '', taskIds: roomAssignment?.taskIds || [], currentAssignmentKey: roomAssignment?.assignmentKey || '', assignments: archiveMeta ? { [roomAssignment.assignmentKey]: archiveMeta } : {},
          createdAt: now, linkedAt: now, updatedAt: now, summary: initialSummary
        };
        updates[`students/${studentId}/updatedAt`] = now;
        updates[`roomLinks/${targetRoom}`] = { studentId, classSessionId, scheduleId, linkedAt: now };
        updates[`classSessions/${classSessionId}/students/${studentId}`] = { roomId: targetRoom, addedAt: now, attendanceMode };
      }

      if (!Object.keys(rooms).length) throw new Error('Šiai datai nėra galiojančių mokinių');
      updates[`scheduleRuns/${scheduleId}/${dateKey}`] = { schemaVersion: P2_DATA_SCHEMA_VERSION, scheduleModelVersion: 2, classSessionId, startedAt: now, rooms, attendanceModes, scheduledDay: safeScheduleDay(time?.day), scheduledStart: safeScheduleTime(time?.start), durationMinutes };
      await update(teacherProfileRef, updates);

      const localSessionStudents = {};
      const localRoomLinks = { ...(teacherProfileCache.roomLinks || {}) };
      for (const [studentId, targetRoom] of Object.entries(rooms)) {
        localSessionStudents[studentId] = { roomId: targetRoom, addedAt: now, attendanceMode: attendanceModes[studentId] };
        localRoomLinks[targetRoom] = { studentId, classSessionId, scheduleId, linkedAt: now };
      }
      teacherProfileCache.classSessions = { ...(teacherProfileCache.classSessions || {}), [classSessionId]: { schemaVersion: P2_DATA_SCHEMA_VERSION, scheduleModelVersion: 2, createdAt: now, updatedAt: now, scheduleId, scheduleDate: dateKey, scheduledDay: safeScheduleDay(time?.day), scheduledStart: safeScheduleTime(time?.start), durationMinutes, label: cleanScheduleLabel(existing.label), students: localSessionStudents } };
      teacherProfileCache.roomLinks = localRoomLinks;
      teacherProfileCache.scheduleRuns = { ...(teacherProfileCache.scheduleRuns || {}), [scheduleId]: { ...(teacherProfileCache.scheduleRuns?.[scheduleId] || {}), [dateKey]: { schemaVersion: P2_DATA_SCHEMA_VERSION, scheduleModelVersion: 2, classSessionId, startedAt: now, rooms, attendanceModes, scheduledDay: safeScheduleDay(time?.day), scheduledStart: safeScheduleTime(time?.start), durationMinutes } } };
      emitTeacherProfile();
      const firstRoom = Object.values(rooms)[0] || '';
      bridge.showToast?.('Pamoka atidaryta');
      window.dispatchEvent(new CustomEvent('p2:schedule-started', { detail: { scheduleId, dateKey, classSessionId, firstRoom, rooms } }));
      return;
    }
  } catch (error) {
    console.error('P2-SPLIT-P2.5-P4-P1.7.9.10.6 tvarkaraščio įrašymo klaida', error);
    const message = String(error?.message || error || 'Nepavyko atnaujinti tvarkaraščio');
    bridge.showToast?.(message);
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
      const grade = safeStudentGrade(detail.grade);
      const guardian = normalizedGuardianFields(detail);
      const studentId = newStudentId();
      const now = Date.now();
      const record = {
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        name,
        notes: '',
        createdAt: now,
        updatedAt: now,
        lessons: {}
      };
      if (grade) record.grade = grade;
      if (guardian.guardianRelation) {
        record.guardianRelation = guardian.guardianRelation;
        record.guardianName = guardian.guardianName;
        if (guardian.guardianCustomRelation) record.guardianCustomRelation = guardian.guardianCustomRelation;
      }
      await set(ref(db, `p772TeacherProfiles/${teacherProfileId}/students/${studentId}`), record);
      bridge.showToast?.(`Mokinys „${name}“ sukurtas`);
      return;
    }
    const studentId = safeStudentId(detail.studentId);
    if (!studentId) return;
    if (detail.action === 'update') {
      const name = cleanStudentName(detail.name);
      if (!name) return;
      const grade = safeStudentGrade(detail.grade);
      const guardian = normalizedGuardianFields(detail);
      await update(ref(db, `p772TeacherProfiles/${teacherProfileId}/students/${studentId}`), {
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        name,
        grade: grade || null,
        guardianRelation: guardian.guardianRelation || null,
        guardianCustomRelation: guardian.guardianCustomRelation || null,
        guardianName: guardian.guardianName || null,
        notes: cleanStudentNotes(detail.notes),
        updatedAt: Date.now()
      });
      const linkedRooms = Object.entries(teacherProfileCache.roomLinks || {})
        .filter(([, link]) => link?.studentId === studentId)
        .map(([linkedRoom]) => safeRoom(linkedRoom))
        .filter(Boolean);
      await Promise.all(linkedRooms.map(linkedRoom => update(ref(db, `p772Rooms/${linkedRoom}/p2/student/profile`), {
        schemaVersion: P2_DATA_SCHEMA_VERSION, studentId, name, updatedAt: Date.now()
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
        let touched = false;
        if (entry?.studentIds?.[studentId]) {
          updates[`scheduleEntries/${scheduleId}/studentIds/${studentId}`] = null;
          touched = true;
        }
        const assignments = entry?.assignments && typeof entry.assignments === 'object' ? entry.assignments : {};
        for (const [assignmentId, scheduleAssignment] of Object.entries(assignments)) {
          if (safeStudentId(scheduleAssignment?.studentId) !== studentId) continue;
          updates[`scheduleEntries/${scheduleId}/assignments/${assignmentId}`] = null;
          touched = true;
        }
        if (touched) updates[`scheduleEntries/${scheduleId}/updatedAt`] = Date.now();
      }
      await update(teacherProfileRef, updates);
      await Promise.all(linkedRooms.map(linkedRoom => remove(ref(db, `p772Rooms/${safeRoom(linkedRoom)}/p2/student/profile`)).catch(() => {})));
      bridge.showToast?.('Mokinys pašalintas iš bazės');
      return;
    }
    const targetRoom = safeRoom(detail.roomId);
    if (!targetRoom) return;
    if (detail.action === 'get-room-history') {
      const lessonRecord = teacherProfileCache.students?.[studentId]?.lessons?.[targetRoom];
      const linkedStudentId = safeStudentId(teacherProfileCache.roomLinks?.[targetRoom]?.studentId);
      const belongsToStudent = Boolean(lessonRecord && typeof lessonRecord === 'object') || linkedStudentId === studentId;
      if (!belongsToStudent || (linkedStudentId && linkedStudentId !== studentId)) {
        window.dispatchEvent(new CustomEvent('p2:student-room-history', {
          detail: { studentId, roomId: targetRoom, error: 'Ši Room nesusieta su pasirinktu mokiniu.' }
        }));
        return;
      }
      try {
        // P1.7.5.2: turinio snapshot jau yra mokinio istorijoje, todėl iš senos
        // Room nebesiunčiame visos /p2 šakos. Perskaitome tik kompaktišką
        // dabartinio priskyrimo progress objektą ir turime griežtą 6 s ribą.
        const progressSnap = await firebaseGetWithTimeout(ref(db, `p772Rooms/${targetRoom}/p2/student/progress`), 6000);
        const progressValue = cleanStudentHistoryProgress(progressSnap.val());
        const assignments = lessonRecord?.assignments && typeof lessonRecord.assignments === 'object' ? lessonRecord.assignments : {};
        const currentKey = safeAssignmentKey(lessonRecord?.currentAssignmentKey || lessonRecord?.assignmentKey || progressValue?.assignmentKey || Object.keys(assignments)[0]);
        const assignmentValue = currentKey && assignments[currentKey] && typeof assignments[currentKey] === 'object' ? assignments[currentKey] : null;

        window.dispatchEvent(new CustomEvent('p2:student-room-history', {
          detail: {
            studentId,
            roomId: targetRoom,
            data: {
              assignment: assignmentValue,
              progress: progressValue,
              history: {},
              fetchedAt: Date.now()
            }
          }
        }));

        // Sėkmingai perskaityta individuali eiga išsaugoma mokytojo profilyje.
        // Kitas tos pačios pamokos atidarymas dėl to nebepriklauso nuo senos Room.
        if (progressValue && currentKey) {
          const cacheUpdates = {
            [`students/${studentId}/lessons/${targetRoom}/latestProgress`]: progressValue,
            [`students/${studentId}/lessons/${targetRoom}/assignments/${currentKey}/latestProgress`]: progressValue,
            [`students/${studentId}/lessons/${targetRoom}/assignments/${currentKey}/lastProgressAt`]: Date.now()
          };
          update(teacherProfileRef, cacheUpdates).catch(error => console.warn('Nepavyko išsaugoti pamokos eigos cache', error));
        }
      } catch (error) {
        const timedOut = String(error?.message || '') === 'history-timeout';
        if (!timedOut) console.error('Mokinio pamokos istorijos skaitymo klaida', error);
        window.dispatchEvent(new CustomEvent('p2:student-room-history', {
          detail: { studentId, roomId: targetRoom, error: timedOut ? 'Room neatsakė per 6 sekundes. Rodoma išsaugota pamokos suvestinė.' : 'Nepavyko perskaityti individualių šios pamokos atsakymų. Rodoma išsaugota suvestinė.' }
        }));
      }
      return;
    }
    if (detail.action === 'backfill-legacy-assignment') {
      const existingLessonRecord = teacherProfileCache.students?.[studentId]?.lessons?.[targetRoom];
      const linkedStudentId = safeStudentId(teacherProfileCache.roomLinks?.[targetRoom]?.studentId);
      const recordBelongsToStudent = existingLessonRecord && typeof existingLessonRecord === 'object'
        && safeRoom(existingLessonRecord.roomId || targetRoom) === targetRoom;
      if (linkedStudentId && linkedStudentId !== studentId) return;
      if (!linkedStudentId && !recordBelongsToStudent) return;

      const lessonId = String(detail.lessonId || existingLessonRecord?.lessonId || '').trim().slice(0, 80);
      if (!lessonId) return;
      const targetAssignmentRef = ref(db, `p772Rooms/${targetRoom}/p2/student/assignment`);
      const targetProgressRef = ref(db, `p772Rooms/${targetRoom}/p2/student/progress`);
      const assignmentSnap = await get(targetAssignmentRef);
      const current = assignmentSnap.val();
      // Neatkuriame jau atšaukto priskyrimo ir niekada nekeičiame kito rinkinio.
      if (!current || typeof current !== 'object' || String(current.lessonId || '') !== lessonId) return;

      const metadata = assignmentContentMetadata(detail, current);
      const assignmentKey = safeAssignmentKey(current.assignmentKey) || assignmentKeyFor(current, lessonId);
      const snapshotTaskCount = Number(metadata.contentSnapshot?.taskCount || 0);
      const currentTaskCount = Number(current.taskCount || detail.taskCount || 0);
      const snapshotCompatible = !snapshotTaskCount || !currentTaskCount || snapshotTaskCount === currentTaskCount;
      const assignmentUpdates = {};
      if (!current.schemaVersion) assignmentUpdates.schemaVersion = P2_DATA_SCHEMA_VERSION;
      if (!current.assignmentKey) assignmentUpdates.assignmentKey = assignmentKey;
      if (snapshotCompatible) {
        if (!current.contentVersion) assignmentUpdates.contentVersion = metadata.contentVersion;
        if (!current.contentHash && metadata.contentHash) assignmentUpdates.contentHash = metadata.contentHash;
        if ((!Array.isArray(current.taskIds) || !current.taskIds.length) && metadata.taskIds.length) assignmentUpdates.taskIds = metadata.taskIds;
        if ((!current.contentSnapshot || typeof current.contentSnapshot !== 'object') && metadata.contentSnapshot) assignmentUpdates.contentSnapshot = metadata.contentSnapshot;
      }
      if (Object.keys(assignmentUpdates).length) {
        assignmentUpdates.metadataBackfilledAt = Date.now();
        assignmentUpdates.metadataBackfilledFromBuild = BUILD;
        await update(targetAssignmentRef, assignmentUpdates);
      }

      const progressSnap = await get(targetProgressRef);
      const currentProgress = progressSnap.val();
      if (currentProgress && typeof currentProgress === 'object') {
        const progressUpdates = {};
        if (!currentProgress.schemaVersion) progressUpdates.schemaVersion = P2_DATA_SCHEMA_VERSION;
        if (!currentProgress.assignmentKey) progressUpdates.assignmentKey = assignmentKey;
        if (snapshotCompatible && !currentProgress.assignmentContentVersion) {
          progressUpdates.assignmentContentVersion = assignmentUpdates.contentVersion || current.contentVersion || metadata.contentVersion;
        }
        if (Object.keys(progressUpdates).length) await update(targetProgressRef, progressUpdates);
      }

      // Papildome ir mokinio istorijos indeksą, tačiau neliečiame jo progreso datos
      // ar rezultatų. Snapshot saugomas prie konkretaus assignmentKey, todėl
      // ateities katalogo pakeitimai neperrašys šios istorinės versijos.
      const record = existingLessonRecord && typeof existingLessonRecord === 'object' ? existingLessonRecord : {};
      const profileUpdates = {};
      const basePath = `students/${studentId}/lessons/${targetRoom}`;
      if (!record.schemaVersion) profileUpdates[`${basePath}/schemaVersion`] = P2_DATA_SCHEMA_VERSION;
      if (!record.assignmentKey) profileUpdates[`${basePath}/assignmentKey`] = assignmentKey;
      if (!record.currentAssignmentKey) profileUpdates[`${basePath}/currentAssignmentKey`] = assignmentKey;
      if (!record.lessonId) profileUpdates[`${basePath}/lessonId`] = lessonId;
      if (!record.title) profileUpdates[`${basePath}/title`] = String(detail.title || current.title || 'Pamoka').slice(0, 140);
      if (!record.taskCount) profileUpdates[`${basePath}/taskCount`] = Math.max(0, Math.min(500, currentTaskCount));
      if (snapshotCompatible) {
        if (!record.contentVersion) profileUpdates[`${basePath}/contentVersion`] = assignmentUpdates.contentVersion || current.contentVersion || metadata.contentVersion;
        if (!record.contentHash && (assignmentUpdates.contentHash || current.contentHash || metadata.contentHash)) {
          profileUpdates[`${basePath}/contentHash`] = assignmentUpdates.contentHash || current.contentHash || metadata.contentHash;
        }
        if ((!Array.isArray(record.taskIds) || !record.taskIds.length) && metadata.taskIds.length) {
          profileUpdates[`${basePath}/taskIds`] = metadata.taskIds;
        }
      }
      const archived = record.assignments?.[assignmentKey];
      const archivePath = `${basePath}/assignments/${assignmentKey}`;
      const summary = cleanLessonSummary(detail.summary || record.summary);
      if (!archived || typeof archived !== 'object') {
        profileUpdates[archivePath] = {
          schemaVersion: P2_DATA_SCHEMA_VERSION,
          assignmentKey,
          lessonId,
          title: String(detail.title || record.title || current.title || 'Pamoka').slice(0, 140),
          taskCount: Math.max(0, Math.min(500, currentTaskCount)),
          contentVersion: snapshotCompatible ? (assignmentUpdates.contentVersion || current.contentVersion || metadata.contentVersion) : Math.max(1, Number(current.contentVersion) || 1),
          contentHash: snapshotCompatible ? (assignmentUpdates.contentHash || current.contentHash || metadata.contentHash || '') : String(current.contentHash || ''),
          taskIds: snapshotCompatible ? metadata.taskIds : (Array.isArray(current.taskIds) ? current.taskIds : []),
          contentSnapshot: snapshotCompatible ? (assignmentUpdates.contentSnapshot || current.contentSnapshot || metadata.contentSnapshot || null) : (current.contentSnapshot || null),
          assignedAt: Number(current.assignedAt || detail.assignedAt || record.createdAt || 0) || null,
          archivedMetadataAt: Date.now(),
          metadataBackfilledFromBuild: BUILD,
          latestSummary: summary
        };
      } else {
        if (!archived.schemaVersion) profileUpdates[`${archivePath}/schemaVersion`] = P2_DATA_SCHEMA_VERSION;
        if (snapshotCompatible && !archived.contentVersion) profileUpdates[`${archivePath}/contentVersion`] = assignmentUpdates.contentVersion || current.contentVersion || metadata.contentVersion;
        if (snapshotCompatible && !archived.contentHash && metadata.contentHash) profileUpdates[`${archivePath}/contentHash`] = metadata.contentHash;
        if (snapshotCompatible && (!Array.isArray(archived.taskIds) || !archived.taskIds.length) && metadata.taskIds.length) profileUpdates[`${archivePath}/taskIds`] = metadata.taskIds;
        if (snapshotCompatible && (!archived.contentSnapshot || typeof archived.contentSnapshot !== 'object') && metadata.contentSnapshot) profileUpdates[`${archivePath}/contentSnapshot`] = metadata.contentSnapshot;
      }
      if (Object.keys(profileUpdates).length) {
        profileUpdates[`${basePath}/metadataBackfilledAt`] = Date.now();
        profileUpdates[`${basePath}/metadataBackfilledFromBuild`] = BUILD;
        await update(teacherProfileRef, profileUpdates);
      }
      await update(ref(db, `p772Rooms/${targetRoom}/p2/meta`), {
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        lastCompatibleBuild: BUILD,
        metadataBackfilledAt: Date.now(),
        updatedAt: Date.now()
      });
      return;
    }
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
      let effectiveAssignment = currentAssignment && typeof currentAssignment === 'object' ? currentAssignment : null;
      let lessonId = String(detail.lessonId || '').trim().slice(0, 80);
      let title = String(detail.title || '').trim().slice(0, 140);
      let taskCount = Math.max(0, Math.min(500, Number(detail.taskCount) || 0));

      if (lessonId) {
        if (String(currentAssignment?.lessonId || '') !== lessonId) {
          if (currentAssignment?.lessonId) await archiveCurrentRoomPractice('replaced-by-link');
          const assignedAt = Date.now();
          const metadata = assignmentContentMetadata(detail, { lessonId, title, taskCount });
          const assignmentPayload = {
            schemaVersion: P2_DATA_SCHEMA_VERSION,
            assignmentKey: newAssignmentKey(lessonId, assignedAt),
            lessonId, title: title || 'Pamoka', taskCount,
            contentVersion: metadata.contentVersion,
            contentHash: metadata.contentHash,
            taskIds: metadata.taskIds,
            contentSnapshot: metadata.contentSnapshot,
            attemptPolicy: sanitizeAttemptPolicy(detail.attemptPolicy),
            assignedAt, assignedBy: me
          };
          await set(p2AssignmentRef, assignmentPayload);
          await set(p2ProgressRef, {
            schemaVersion: P2_DATA_SCHEMA_VERSION,
            assignmentId: lessonId,
            assignmentKey: assignmentPayload.assignmentKey,
            assignmentContentVersion: assignmentPayload.contentVersion,
            status: 'not_started', currentTaskId: '', taskStates: {},
            startedAt: null, updatedAt: assignedAt
          });
          effectiveAssignment = assignmentPayload;
        } else {
          title = String(currentAssignment?.title || title || 'Pamoka').slice(0, 140);
          taskCount = Math.max(0, Math.min(500, Number(currentAssignment?.taskCount || taskCount) || 0));
          effectiveAssignment = currentAssignment;
        }
      } else if (currentAssignment?.lessonId) {
        lessonId = String(currentAssignment.lessonId).slice(0, 80);
        title = String(currentAssignment.title || '').slice(0, 140);
        taskCount = Math.max(0, Math.min(500, Number(currentAssignment.taskCount) || 0));
        effectiveAssignment = currentAssignment;
      }

      const student = teacherProfileCache.students?.[studentId] || {};
      const studentName = cleanStudentName(student.name) || 'Mokinys';
      const existingRecord = teacherProfileCache.students?.[studentId]?.lessons?.[targetRoom] || {};
      const progressValue = currentProgressSnap.val();
      const summary = existingRecord.summary || (progressValue ? cleanLessonSummary({ status: progressValue.status, taskCount }) : cleanLessonSummary({ taskCount }));
      const archiveMeta = effectiveAssignment ? assignmentArchiveMetadata(effectiveAssignment, summary) : null;
      const assignments = { ...(existingRecord.assignments && typeof existingRecord.assignments === 'object' ? existingRecord.assignments : {}) };
      if (archiveMeta && !assignments[archiveMeta.assignmentKey]) assignments[archiveMeta.assignmentKey] = archiveMeta;
      const record = {
        ...existingRecord,
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        roomId: targetRoom,
        classSessionId,
        lessonId,
        title: title || (lessonId ? 'Pamoka' : 'Lentos sesija'),
        taskCount,
        assignmentKey: effectiveAssignment ? assignmentKeyFor(effectiveAssignment, lessonId) : '',
        contentVersion: effectiveAssignment?.contentVersion || null,
        contentHash: effectiveAssignment?.contentHash || '',
        taskIds: Array.isArray(effectiveAssignment?.taskIds) ? effectiveAssignment.taskIds : [],
        currentAssignmentKey: effectiveAssignment ? assignmentKeyFor(effectiveAssignment, lessonId) : '',
        assignments,
        createdAt: Number(existingRecord.createdAt || existingRecord.linkedAt || 0) || Date.now(),
        linkedAt: Date.now(),
        updatedAt: Date.now(),
        summary
      };
      updates[`students/${studentId}/lessons/${targetRoom}`] = record;
      updates[`students/${studentId}/updatedAt`] = Date.now();
      updates[`roomLinks/${targetRoom}`] = { studentId, classSessionId, linkedAt: Date.now() };
      updates[`classSessions/${classSessionId}/createdAt`] = Number(teacherProfileCache.classSessions?.[classSessionId]?.createdAt || 0) || Date.now();
      updates[`classSessions/${classSessionId}/updatedAt`] = Date.now();
      updates[`classSessions/${classSessionId}/students/${studentId}`] = { roomId: targetRoom, addedAt: Date.now() };
      await update(teacherProfileRef, updates);
      await set(p2StudentProfileRef, { schemaVersion: P2_DATA_SCHEMA_VERSION, studentId, name: studentName, classSessionId, updatedAt: Date.now() });
      await update(ref(db, `p772Rooms/${targetRoom}/p2/meta`), { schemaVersion: P2_DATA_SCHEMA_VERSION, lastCompatibleBuild: BUILD, updatedAt: Date.now() });
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
      let sourceAssignment = null;
      if (!lessonId) {
        sourceAssignment = (await get(p2AssignmentRef)).val();
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
      const now = Date.now();
      let roomAssignment = null;
      if (lessonId) {
        const metadataSource = sourceAssignment || detail;
        const metadata = assignmentContentMetadata(metadataSource, { lessonId, title, taskCount });
        roomAssignment = {
          schemaVersion: P2_DATA_SCHEMA_VERSION,
          assignmentKey: newAssignmentKey(lessonId, now),
          lessonId, title: title || 'Pamoka', taskCount,
          contentVersion: metadata.contentVersion,
          contentHash: metadata.contentHash,
          taskIds: metadata.taskIds,
          contentSnapshot: metadata.contentSnapshot,
          attemptPolicy: sanitizeAttemptPolicy(detail.attemptPolicy || sourceAssignment?.attemptPolicy),
          assignedAt: now, assignedBy: me
        };
        await set(ref(db, `p772Rooms/${targetStudentRoom}/p2/student/assignment`), roomAssignment);
        await set(ref(db, `p772Rooms/${targetStudentRoom}/p2/student/progress`), {
          schemaVersion: P2_DATA_SCHEMA_VERSION,
          assignmentId: lessonId,
          assignmentKey: roomAssignment.assignmentKey,
          assignmentContentVersion: roomAssignment.contentVersion,
          status: 'not_started', currentTaskId: '', taskStates: {},
          startedAt: null, updatedAt: now
        });
      }
      await set(ref(db, `p772Rooms/${targetStudentRoom}/p2/student/profile`), {
        schemaVersion: P2_DATA_SCHEMA_VERSION, studentId, name: studentName, classSessionId, updatedAt: now
      });
      await set(ref(db, `p772Rooms/${targetStudentRoom}/p2/meta`), { schemaVersion: P2_DATA_SCHEMA_VERSION, createdWithBuild: BUILD, updatedAt: now });

      const summary = cleanLessonSummary({ taskCount });
      const archiveMeta = roomAssignment ? assignmentArchiveMetadata(roomAssignment, summary) : null;
      const record = {
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        roomId: targetStudentRoom, classSessionId, lessonId,
        title: title || (lessonId ? 'Pamoka' : 'Lentos sesija'), taskCount,
        assignmentKey: roomAssignment?.assignmentKey || '',
        contentVersion: roomAssignment?.contentVersion || null,
        contentHash: roomAssignment?.contentHash || '',
        taskIds: roomAssignment?.taskIds || [],
        currentAssignmentKey: roomAssignment?.assignmentKey || '',
        assignments: archiveMeta ? { [roomAssignment.assignmentKey]: archiveMeta } : {},
        createdAt: now, linkedAt: now, updatedAt: now,
        summary
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
      const now = Date.now();
      const summary = cleanLessonSummary(detail.summary);
      const progressSnapshot = cleanStudentHistoryProgress(detail.progressSnapshot);
      const updates = {
        [`students/${studentId}/lessons/${targetRoom}/schemaVersion`]: P2_DATA_SCHEMA_VERSION,
        [`students/${studentId}/lessons/${targetRoom}/updatedAt`]: now,
        [`students/${studentId}/lessons/${targetRoom}/summary`]: summary,
        [`students/${studentId}/updatedAt`]: now
      };
      if (progressSnapshot) updates[`students/${studentId}/lessons/${targetRoom}/latestProgress`] = progressSnapshot;
      if (detail.lessonId) {
        const lessonId = String(detail.lessonId).slice(0, 80);
        const assignmentKey = safeAssignmentKey(detail.assignmentKey) || safeAssignmentKey(existing.currentAssignmentKey) || `LEGACY-${Number(detail.assignedAt || existing.createdAt || now)}-${lessonId}`.slice(0, 96);
        const existingArchive = existing.assignments?.[assignmentKey];
        const lightweightVersion = Math.max(1, Math.round(Number(detail.contentVersion || existing.contentVersion) || 1));
        const lightweightHash = String(detail.contentHash || existing.contentHash || '').slice(0, 80);
        const lightweightTaskIds = Array.isArray(detail.taskIds) ? detail.taskIds.map(id => String(id || '').slice(0, 80)).filter(Boolean).slice(0, 500) : (Array.isArray(existing.taskIds) ? existing.taskIds : []);
        updates[`students/${studentId}/lessons/${targetRoom}/lessonId`] = lessonId;
        updates[`students/${studentId}/lessons/${targetRoom}/title`] = String(detail.title || existing.title || 'Pamoka').slice(0, 140);
        updates[`students/${studentId}/lessons/${targetRoom}/taskCount`] = Math.max(0, Math.min(500, Number(detail.taskCount) || 0));
        updates[`students/${studentId}/lessons/${targetRoom}/assignmentKey`] = assignmentKey;
        updates[`students/${studentId}/lessons/${targetRoom}/currentAssignmentKey`] = assignmentKey;
        updates[`students/${studentId}/lessons/${targetRoom}/contentVersion`] = lightweightVersion;
        if (lightweightHash) updates[`students/${studentId}/lessons/${targetRoom}/contentHash`] = lightweightHash;
        if (lightweightTaskIds.length) updates[`students/${studentId}/lessons/${targetRoom}/taskIds`] = lightweightTaskIds;
        if (!existingArchive || typeof existingArchive !== 'object') {
          const metadata = assignmentContentMetadata(detail, { lessonId, title: detail.title, taskCount: detail.taskCount, contentVersion: lightweightVersion, contentHash: lightweightHash });
          updates[`students/${studentId}/lessons/${targetRoom}/assignments/${assignmentKey}`] = {
            schemaVersion: P2_DATA_SCHEMA_VERSION,
            assignmentKey,
            lessonId,
            title: String(detail.title || existing.title || 'Pamoka').slice(0, 140),
            taskCount: Math.max(0, Math.min(500, Number(detail.taskCount) || 0)),
            contentVersion: metadata.contentVersion,
            contentHash: metadata.contentHash,
            taskIds: metadata.taskIds,
            contentSnapshot: metadata.contentSnapshot,
            assignedAt: Number(detail.assignedAt || 0) || null,
            archivedMetadataAt: now,
            latestSummary: summary,
            ...(progressSnapshot ? { latestProgress: progressSnapshot } : {})
          };
        } else {
          // Metaduomenys nekeičiami; gyvai atnaujinama tik eigos santrauka.
          updates[`students/${studentId}/lessons/${targetRoom}/assignments/${assignmentKey}/latestSummary`] = summary;
          updates[`students/${studentId}/lessons/${targetRoom}/assignments/${assignmentKey}/lastProgressAt`] = now;
          if (progressSnapshot) updates[`students/${studentId}/lessons/${targetRoom}/assignments/${assignmentKey}/latestProgress`] = progressSnapshot;
        }
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
    p2AssignmentCache = snapshot.val() || null;
    window.dispatchEvent(new CustomEvent('p2:assignment-state', { detail: p2AssignmentCache }));
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

async function archiveCurrentRoomPractice(reason = 'archived') {
  const [assignmentSnap, progressSnap] = await Promise.all([get(p2AssignmentRef), get(p2ProgressRef)]);
  const currentAssignment = assignmentSnap.val();
  if (!currentAssignment || typeof currentAssignment !== 'object' || !currentAssignment.lessonId) return null;
  const currentProgress = progressSnap.val() && typeof progressSnap.val() === 'object' ? progressSnap.val() : null;
  const assignmentKey = assignmentKeyFor(currentAssignment, currentAssignment.lessonId);
  const historyRef = ref(db, `p772Rooms/${roomId}/p2/history/${assignmentKey}`);
  const historySnap = await get(historyRef);
  const existing = historySnap.val();
  const archivedAt = Date.now();
  if (!existing || typeof existing !== 'object') {
    await set(historyRef, {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      assignmentKey,
      assignment: { ...currentAssignment, assignmentKey, schemaVersion: Number(currentAssignment.schemaVersion || P2_DATA_SCHEMA_VERSION) },
      progress: currentProgress,
      archivedAt,
      lastArchivedAt: archivedAt,
      reason: String(reason || 'archived').slice(0, 40)
    });
  } else {
    // Priskyrimo metaduomenų neperrašome: archyvo turinio versija lieka tokia,
    // kokia buvo pirmą kartą užfiksuota. Atnaujiname tik paskutinę eigos kopiją.
    await update(historyRef, {
      progress: currentProgress,
      lastArchivedAt: archivedAt,
      reason: String(reason || existing.reason || 'archived').slice(0, 40)
    });
  }
  return { assignmentKey, assignment: currentAssignment, progress: currentProgress };
}

function assignmentArchiveMetadata(assignment, summary = null) {
  const source = assignment && typeof assignment === 'object' ? assignment : {};
  if (!source.lessonId) return null;
  const assignmentKey = assignmentKeyFor(source, source.lessonId);
  return {
    schemaVersion: P2_DATA_SCHEMA_VERSION,
    assignmentKey,
    lessonId: String(source.lessonId || '').slice(0, 80),
    title: String(source.title || 'Pamoka').slice(0, 140),
    taskCount: Math.max(0, Math.min(500, Math.round(Number(source.taskCount) || 0))),
    contentVersion: Math.max(1, Math.round(Number(source.contentVersion) || 1)),
    contentHash: String(source.contentHash || '').slice(0, 80),
    taskIds: Array.isArray(source.taskIds) ? source.taskIds.slice(0, 500) : [],
    contentSnapshot: source.contentSnapshot && typeof source.contentSnapshot === 'object' ? source.contentSnapshot : null,
    assignedAt: Number(source.assignedAt || 0) || null,
    archivedMetadataAt: Date.now(),
    latestSummary: summary || null
  };
}

window.addEventListener('p2:assignment-request', async event => {
  if (onlineRole !== 'teacher') return;
  const detail = event.detail || {};
  try {
    if (detail.action === 'unassign') {
      await archiveCurrentRoomPractice('unassigned');
      await remove(p2AssignmentRef);
      await remove(p2ProgressRef);
      bridge.showToast?.('Pratybų priskyrimas atšauktas · ankstesnė eiga išsaugota archyve');
      return;
    }
    if (detail.action === 'metadata') {
      const currentSnap = await get(p2AssignmentRef);
      const current = currentSnap.val();
      if (!current || typeof current !== 'object') return;
      if (detail.lessonId && String(detail.lessonId) !== String(current.lessonId || '')) return;
      const metadata = assignmentContentMetadata(detail, current);
      const updates = {};
      if (!current.schemaVersion) updates.schemaVersion = P2_DATA_SCHEMA_VERSION;
      if (!current.assignmentKey) updates.assignmentKey = assignmentKeyFor(current, current.lessonId);
      if (!current.contentVersion) updates.contentVersion = metadata.contentVersion;
      if (!current.contentHash && metadata.contentHash) updates.contentHash = metadata.contentHash;
      if ((!Array.isArray(current.taskIds) || !current.taskIds.length) && metadata.taskIds.length) updates.taskIds = metadata.taskIds;
      if ((!current.contentSnapshot || typeof current.contentSnapshot !== 'object') && metadata.contentSnapshot) updates.contentSnapshot = metadata.contentSnapshot;
      if (Object.keys(updates).length) {
        updates.metadataBackfilledAt = Date.now();
        await update(p2AssignmentRef, updates);
      }
      const progressSnap = await get(p2ProgressRef);
      const currentProgress = progressSnap.val();
      if (currentProgress && typeof currentProgress === 'object') {
        const progressUpdates = {};
        if (!currentProgress.schemaVersion) progressUpdates.schemaVersion = P2_DATA_SCHEMA_VERSION;
        if (!currentProgress.assignmentKey) progressUpdates.assignmentKey = updates.assignmentKey || current.assignmentKey || assignmentKeyFor(current, current.lessonId);
        if (!currentProgress.assignmentContentVersion) progressUpdates.assignmentContentVersion = updates.contentVersion || current.contentVersion || metadata.contentVersion;
        if (Object.keys(progressUpdates).length) await update(p2ProgressRef, progressUpdates);
      }
      await update(ref(db, `p772Rooms/${roomId}/p2/meta`), { schemaVersion: P2_DATA_SCHEMA_VERSION, lastCompatibleBuild: BUILD, updatedAt: Date.now() });
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
    const previousSnap = await get(p2AssignmentRef);
    if (previousSnap.exists()) await archiveCurrentRoomPractice('replaced');
    const assignedAt = Date.now();
    const lessonId = String(detail.lessonId || '').slice(0, 80);
    const metadata = assignmentContentMetadata(detail, { lessonId, title: detail.title, taskCount: detail.taskCount });
    const assignment = {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      assignmentKey: newAssignmentKey(lessonId, assignedAt),
      lessonId,
      title: String(detail.title || 'Pamokos prototipas').slice(0, 140),
      taskCount: Math.max(0, Number(detail.taskCount) || 0),
      contentVersion: metadata.contentVersion,
      contentHash: metadata.contentHash,
      taskIds: metadata.taskIds,
      contentSnapshot: metadata.contentSnapshot,
      attemptPolicy: sanitizeAttemptPolicy(detail.attemptPolicy),
      assignedAt,
      assignedBy: me
    };
    await set(p2AssignmentRef, assignment);
    await set(p2ProgressRef, {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      assignmentId: assignment.lessonId,
      assignmentKey: assignment.assignmentKey,
      assignmentContentVersion: assignment.contentVersion,
      status: 'not_started',
      currentTaskId: 'c1',
      taskStates: {},
      startedAt: null,
      updatedAt: Date.now()
    });
    await update(ref(db, `p772Rooms/${roomId}/p2/meta`), { schemaVersion: P2_DATA_SCHEMA_VERSION, lastCompatibleBuild: BUILD, updatedAt: Date.now() });
    bridge.showToast?.('Pratybos priskirtos mokiniui');
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
    const currentAssignment = p2AssignmentCache || {};
    await set(p2ProgressRef, {
      ...value,
      schemaVersion: Number(value.schemaVersion || P2_DATA_SCHEMA_VERSION),
      assignmentKey: value.assignmentKey || currentAssignment.assignmentKey || assignmentKeyFor(currentAssignment, currentAssignment.lessonId),
      assignmentContentVersion: Number(value.assignmentContentVersion || currentAssignment.contentVersion || 1),
      updatedAt: Date.now(),
      updatedBy: me
    });
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
  const color = /^#[0-9a-f]{6}$/i.test(String(stroke.color || '')) ? String(stroke.color) : undefined;
  return {
    id: String(stroke.id),
    mode: stroke.mode === 'eraser' ? 'eraser' : 'pen',
    width: Math.max(0.5, Number(stroke.width) || 2.6),
    ...(color ? { color } : {}),
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
