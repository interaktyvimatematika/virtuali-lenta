(() => {
  'use strict';

  // P1.7.9.49-M2.3.1: trumpalaikis mokinio pratybų draft cache.
  // Firebase lieka pagrindinis duomenų šaltinis. Šis sluoksnis saugo tik tą
  // pačią Room + assignmentKey nebaigtą lokalią būseną, kad staigus F5 / reload
  // neprarastų paskutinių dar nespėtų į Firebase išsiųsti simbolių.
  const STORAGE_KEY = 'p772-p2-practice-drafts-v1';
  const MAX_ENTRIES = 24;
  const MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000;

  function safeRoomId(value) {
    const text = String(value || '').trim().toUpperCase();
    return /^[A-Z0-9_-]{4,24}$/.test(text) ? text : '';
  }

  function assignmentKeyFor(assignment) {
    const source = assignment && typeof assignment === 'object' ? assignment : {};
    const direct = String(source.assignmentKey || '').trim();
    if (direct) return direct.slice(0, 160);
    const lessonId = String(source.lessonId || '').trim();
    return lessonId ? `lesson:${lessonId}`.slice(0, 160) : '';
  }

  function entryKey(roomId, assignmentKey) {
    const room = safeRoomId(roomId);
    const key = String(assignmentKey || '').trim();
    return room && key ? `${room}::${key}` : '';
  }

  function readStore() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const entries = parsed?.entries && typeof parsed.entries === 'object' ? parsed.entries : {};
      return { version: 1, entries };
    } catch (_) {
      return { version: 1, entries: {} };
    }
  }

  function writeStore(store) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(store)); }
    catch (_) {}
  }

  function cleanup(store, now = Date.now()) {
    const entries = Object.entries(store.entries || {})
      .filter(([, entry]) => entry && typeof entry === 'object')
      .filter(([, entry]) => now - Math.max(0, Number(entry.savedAt || 0)) <= MAX_AGE_MS)
      .sort((a, b) => Number(b[1]?.savedAt || 0) - Number(a[1]?.savedAt || 0));
    store.entries = Object.fromEntries(entries.slice(0, MAX_ENTRIES));
    return store;
  }

  function clone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return null; }
  }

  function taskTimestamp(value) {
    const source = value && typeof value === 'object' ? value : {};
    return Math.max(
      0,
      Number(source.selectionUpdatedAt || 0),
      Number(source.expressionUpdatedAt || 0),
      Number(source.solutionUpdatedAt || 0),
      Number(source.submittedAt || 0),
      Number(source.openedAt || 0)
    );
  }

  function mergeTaskState(remoteValue, draftValue, preferDraft) {
    const remote = remoteValue && typeof remoteValue === 'object' ? remoteValue : {};
    const draft = draftValue && typeof draftValue === 'object' ? draftValue : {};
    const remoteTs = taskTimestamp(remote);
    const draftTs = taskTimestamp(draft);
    const draftWins = draftTs > remoteTs || (draftTs === remoteTs && preferDraft);
    const merged = draftWins ? { ...remote, ...draft } : { ...draft, ...remote };

    // Jau pasiektas progresas negali būti sumažintas lokaliu draft'u.
    merged.attempts = Math.max(Number(remote.attempts || 0), Number(draft.attempts || 0));
    merged.wrongAttempts = Math.max(Number(remote.wrongAttempts || 0), Number(draft.wrongAttempts || 0));
    merged.hintUsed = Boolean(remote.hintUsed || draft.hintUsed);
    merged.solved = Boolean(remote.solved || draft.solved);
    if (remote.solved === true && draft.solved !== true) {
      // Jei Firebase jau turi išspręstą užduotį, jos pateikto rezultato nekeičiam.
      return { ...merged, ...remote, attempts: merged.attempts, wrongAttempts: merged.wrongAttempts, hintUsed: merged.hintUsed, solved: true };
    }
    const opened = [Number(remote.openedAt || 0), Number(draft.openedAt || 0)].filter(value => value > 0);
    if (opened.length) merged.openedAt = Math.min(...opened);
    return merged;
  }

  function mergeProgress(firebaseValue, draftValue, preferDraft) {
    const remote = firebaseValue && typeof firebaseValue === 'object' ? firebaseValue : {};
    const draft = draftValue && typeof draftValue === 'object' ? draftValue : {};
    const remoteStates = remote.taskStates && typeof remote.taskStates === 'object' ? remote.taskStates : {};
    const draftStates = draft.taskStates && typeof draft.taskStates === 'object' ? draft.taskStates : {};
    const taskStates = {};
    for (const taskId of new Set([...Object.keys(remoteStates), ...Object.keys(draftStates)])) {
      taskStates[taskId] = mergeTaskState(remoteStates[taskId], draftStates[taskId], preferDraft);
    }
    const merged = preferDraft ? { ...remote, ...draft } : { ...draft, ...remote };
    merged.taskStates = taskStates;
    if (remote.status === 'completed') merged.status = 'completed';
    const started = [Number(remote.startedAt || 0), Number(draft.startedAt || 0)].filter(value => value > 0);
    if (started.length) merged.startedAt = Math.min(...started);
    return merged;
  }

  function save({ roomId, assignment, progress }) {
    const room = safeRoomId(roomId);
    const assignmentKey = assignmentKeyFor(assignment);
    const key = entryKey(room, assignmentKey);
    const progressCopy = clone(progress);
    if (!key || !progressCopy || typeof progressCopy !== 'object') return null;
    const now = Date.now();
    const savedAt = Math.max(now, Number(progressCopy.updatedAt || 0));
    const store = cleanup(readStore(), now);
    store.entries[key] = {
      version: 1,
      roomId: room,
      assignmentKey,
      lessonId: String(assignment?.lessonId || ''),
      savedAt,
      progress: progressCopy
    };
    cleanup(store, now);
    writeStore(store);
    return { roomId: room, assignmentKey, savedAt };
  }

  function load({ roomId, assignment }) {
    const room = safeRoomId(roomId);
    const assignmentKey = assignmentKeyFor(assignment);
    const key = entryKey(room, assignmentKey);
    if (!key) return null;
    const store = cleanup(readStore());
    const entry = store.entries[key];
    writeStore(store);
    if (!entry || typeof entry !== 'object' || !entry.progress || typeof entry.progress !== 'object') return null;
    return clone(entry);
  }

  function clear({ roomId, assignmentKey }) {
    const key = entryKey(roomId, assignmentKey);
    if (!key) return false;
    const store = readStore();
    if (!Object.prototype.hasOwnProperty.call(store.entries || {}, key)) return false;
    delete store.entries[key];
    writeStore(cleanup(store));
    return true;
  }

  function restoreIfNewer({ roomId, assignment, firebaseProgress }) {
    const entry = load({ roomId, assignment });
    if (!entry) return { restored: false, progress: firebaseProgress || null };
    const assignmentKey = assignmentKeyFor(assignment);
    if (!assignmentKey || entry.assignmentKey !== assignmentKey) return { restored: false, progress: firebaseProgress || null };

    const remote = firebaseProgress && typeof firebaseProgress === 'object' ? firebaseProgress : {};
    const remoteUpdatedAt = Math.max(0, Number(remote.updatedAt || 0));
    const draftUpdatedAt = Math.max(0, Number(entry.savedAt || 0), Number(entry.progress?.updatedAt || 0));
    if (remoteUpdatedAt >= draftUpdatedAt && remoteUpdatedAt > 0) {
      clear({ roomId, assignmentKey });
      return { restored: false, staleDraftCleared: true, progress: firebaseProgress || null };
    }

    const merged = mergeProgress(remote, entry.progress, true);
    merged.assignmentKey = String(merged.assignmentKey || assignmentKey);
    merged.updatedAt = Math.max(Number(merged.updatedAt || 0), draftUpdatedAt);
    return {
      restored: true,
      progress: merged,
      assignmentKey,
      draftUpdatedAt,
      savedAt: entry.savedAt
    };
  }

  function clearIfPersisted({ roomId, assignmentKey, sourceUpdatedAt }) {
    const key = entryKey(roomId, assignmentKey);
    if (!key) return false;
    const store = readStore();
    const entry = store.entries?.[key];
    if (!entry) return false;
    const currentDraftUpdatedAt = Math.max(Number(entry.savedAt || 0), Number(entry.progress?.updatedAt || 0));
    if (currentDraftUpdatedAt > Number(sourceUpdatedAt || 0)) return false;
    delete store.entries[key];
    writeStore(cleanup(store));
    return true;
  }

  window.P772PracticeDraftStore = Object.freeze({
    storageKey: STORAGE_KEY,
    assignmentKeyFor,
    save,
    load,
    clear,
    restoreIfNewer,
    clearIfPersisted,
    mergeProgress
  });
})();
