(() => {
  'use strict';

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function readSavedSnapshot({ storage = window.localStorage, storageKey, legacyStorageKeys = [], onError = null } = {}) {
    try {
      const direct = storage?.getItem?.(storageKey);
      if (direct) return JSON.parse(direct);
      for (const legacyKey of legacyStorageKeys) {
        const legacy = storage?.getItem?.(legacyKey);
        if (legacy) return JSON.parse(legacy);
      }
      return null;
    } catch (error) {
      if (typeof onError === 'function') onError(error);
      else console.warn('Nepavyko perskaityti P7.7.2 būsenos:', error);
      return null;
    }
  }

  function createDefaultState({ practicePackage, tasks = [], defaultResponse, library } = {}) {
    return {
      currentTask: 0,
      mode: 'student',
      packageData: practicePackage,
      responses: Object.fromEntries(tasks.map(task => [task.id, defaultResponse(task)])),
      results: Object.fromEntries(tasks.map(task => [task.id, null])),
      window: { x: null, y: null, width: null, height: null, collapsed: false, shelved: false },
      drawing: [],
      notes: [],
      formulas: [], // legacy: P7.7.2 formulės gyvena notes[].nodes modelyje
      boardImages: [],
      boardTasks: [],
      activeBoardTaskId: null,
      boardPractices: [],
      activeBoardPracticeId: null,
      activeBoardObject: null,
      camera: { zoom: 1, scrollLeft: 0, scrollTop: 0, worldWidth: 720, worldHeight: 10000, layoutMode: 'vertical-strip' },
      practiceOnly: { active: false, practiceId: null },
      mathToolbarCategory: 'Pagrindiniai',
      library,
      activeTool: 'select'
    };
  }

  function restoreState({
    parsed,
    base,
    practicePackage,
    tasks = [],
    defaultResponse,
    migrateMixedNotes,
    normalizeBoardImageInstance,
    normalizeBoardTaskInstance,
    normalizeBoardPracticeInstance,
    normalizeCamera,
    normalizeLibrary,
    normalizeStructuredSteps,
    resultMatchesCurrentResponse,
    onError = null
  } = {}) {
    if (!parsed || typeof parsed !== 'object') return base;
    try {
      const restored = {
        ...base,
        ...parsed,
        mode: parsed.mode === 'teacher' ? 'teacher' : 'student',
        packageData: practicePackage,
        responses: {},
        results: {},
        window: { ...base.window, ...(parsed.window || {}) },
        drawing: Array.isArray(parsed.drawing) ? parsed.drawing : [],
        notes: migrateMixedNotes(parsed.notes, parsed.formulas),
        formulas: [],
        boardImages: Array.isArray(parsed.boardImages) ? parsed.boardImages.map(normalizeBoardImageInstance).filter(Boolean) : [],
        boardTasks: Array.isArray(parsed.boardTasks) ? parsed.boardTasks.map(normalizeBoardTaskInstance).filter(Boolean) : [],
        activeBoardTaskId: typeof parsed.activeBoardTaskId === 'string' ? parsed.activeBoardTaskId : null,
        boardPractices: Array.isArray(parsed.boardPractices) ? parsed.boardPractices.map(normalizeBoardPracticeInstance).filter(Boolean) : [],
        activeBoardPracticeId: typeof parsed.activeBoardPracticeId === 'string' ? parsed.activeBoardPracticeId : null,
        activeBoardObject: parsed.activeBoardObject && typeof parsed.activeBoardObject === 'object'
          ? { type: String(parsed.activeBoardObject.type || ''), id: String(parsed.activeBoardObject.id || '') }
          : (typeof parsed.activeBoardTaskId === 'string'
            ? { type: 'task', id: parsed.activeBoardTaskId }
            : (typeof parsed.activeBoardPracticeId === 'string' ? { type: 'practice', id: parsed.activeBoardPracticeId } : null)),
        camera: normalizeCamera(parsed.camera || base.camera),
        practiceOnly: { active: false, practiceId: typeof parsed.practiceOnly?.practiceId === 'string' ? parsed.practiceOnly.practiceId : null },
        mathToolbarCategory: typeof parsed.mathToolbarCategory === 'string' ? parsed.mathToolbarCategory : base.mathToolbarCategory,
        library: normalizeLibrary(parsed.library || base.library)
      };
      if (restored.activeBoardObject?.type === 'formula' && restored.notes.some(item => item.id === restored.activeBoardObject.id)) {
        restored.activeBoardObject = { type: 'note', id: restored.activeBoardObject.id };
      }
      for (const task of tasks) {
        const fallback = defaultResponse(task);
        const candidate = parsed.responses?.[task.id];
        if (task.response.renderer === 'math-step-list') {
          restored.responses[task.id] = {
            steps: normalizeStructuredSteps(candidate?.steps || fallback.steps)
          };
        } else {
          restored.responses[task.id] = {
            answer: String(candidate?.answer || ''),
            answerLatex: String(candidate?.answerLatex || candidate?.latex || '')
          };
        }
        const result = parsed.results?.[task.id] || null;
        restored.results[task.id] = resultMatchesCurrentResponse(result, restored.responses[task.id], task) ? result : null;
      }
      restored.currentTask = Math.max(0, Math.min(tasks.length - 1, Number(restored.currentTask) || 0));
      return restored;
    } catch (error) {
      if (typeof onError === 'function') onError(error);
      else console.warn('Nepavyko atkurti būsenos:', error);
      return base;
    }
  }

  window.P772AppState = Object.freeze({
    version: 'P1.7.9.49-M2.9',
    deepClone,
    readSavedSnapshot,
    createDefaultState,
    restoreState
  });
})();
