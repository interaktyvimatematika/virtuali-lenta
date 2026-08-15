(() => {
  'use strict';

  const STORAGE_KEY = 'virtuali-lenta-interaktyvios-pratybos-p7.7.2-online-p1-v1';
  const LEGACY_STORAGE_KEYS = [];
  const AppState = window.P772AppState;
  if (!AppState) throw new Error('P772AppState modulis neįkeltas');
  const deepClone = AppState.deepClone;
  const EPSILON = 1e-8;
  const PRACTICE_PAGE_FORMATS = Object.freeze({
    A4: { width: 794, height: 1123, label: 'A4' },
    A5: { width: 559, height: 794, label: 'A5' }
  });
  const defaultPracticePackage = deepClone(window.PRACTICE_PACKAGE);

  if (!defaultPracticePackage || !Array.isArray(defaultPracticePackage.tasks)) {
    document.body.innerHTML = '<p style="padding:24px;font-family:sans-serif">Nepavyko įkelti pratybų duomenų modelio.</p>';
    throw new Error('PRACTICE_PACKAGE nerastas');
  }

  const savedSnapshot = AppState.readSavedSnapshot({
    storage: window.localStorage,
    storageKey: STORAGE_KEY,
    legacyStorageKeys: LEGACY_STORAGE_KEYS,
    onError: error => console.warn('Nepavyko perskaityti P7.7.2 būsenos:', error)
  });
  let practicePackage = normalizePackage(savedSnapshot?.packageData || defaultPracticePackage);
  let tasks = practicePackage.tasks;

  const AppBootstrap = window.P772AppBootstrap;
  if (!AppBootstrap) throw new Error('P772AppBootstrap modulis neįkeltas');
  const refs = AppBootstrap.collectRefs(document);
  const eventComposedPath = AppBootstrap.eventComposedPath;
  const friendlyParseError = AppBootstrap.friendlyParseError;
  const escapeHtml = AppBootstrap.escapeHtml;
  const clampNumber = AppBootstrap.clampNumber;
  const safeString = AppBootstrap.safeString;
  const readFileAsDataUrl = AppBootstrap.readFileAsDataUrl;
  const loadImageFromDataUrl = AppBootstrap.loadImageFromDataUrl;

  const rendererLabels = {
    'single-math-input': 'Vienas atsakymas',
    'math-step-list': 'Sprendimo eiga'
  };

  const validatorDefinitions = {
    'expression-equivalence': {
      label: 'Reiškinių lygiavertiškumas',
      renderer: 'single-math-input',
      promptKind: 'expression'
    },
    'linear-equation-chain': {
      label: 'Tiesinės lygties sprendimo eiga',
      renderer: 'math-step-list',
      promptKind: 'equation'
    },
    'quadratic-equation-chain': {
      label: 'Kvadratinės lygties sprendimo eiga',
      renderer: 'math-step-list',
      promptKind: 'equation'
    },
    'semantic-equation-chain': {
      label: 'Semantinė lygties sprendimo eiga',
      renderer: 'math-step-list',
      promptKind: 'equation'
    }
  };

  function createStructuredStep(type = 'equation', values = [''], latexValues = [], meta = {}) {
    const safeType = ['equation', 'alternatives', 'solution-set'].includes(type) ? type : 'equation';
    const sourceValues = Array.isArray(values) ? values.map(value => String(value ?? '')) : [String(values ?? '')];
    const sourceLatexValues = Array.isArray(latexValues)
      ? latexValues.map(value => String(value ?? ''))
      : [String(latexValues ?? '')];
    if (safeType === 'alternatives') {
      while (sourceValues.length < 2) sourceValues.push('');
      while (sourceLatexValues.length < sourceValues.length) sourceLatexValues.push('');
      const result = {
        type: safeType,
        values: sourceValues,
        latexValues: sourceLatexValues.slice(0, sourceValues.length)
      };
      const branchGroupId = String(meta?.branchGroupId || '').trim();
      if (branchGroupId) result.branchGroupId = branchGroupId;
      return result;
    }
    return {
      type: safeType,
      values: [sourceValues[0] || ''],
      latexValues: [sourceLatexValues[0] || '']
    };
  }

  function migrateLegacyStepString(value) {
    const source = String(value ?? '');
    const trimmed = source.trim();
    if (!trimmed) return createStructuredStep();
    const alternatives = trimmed.split(/\s+\b(?:arba|ar)\b\s+/i).map(part => part.trim()).filter(Boolean);
    if (alternatives.length > 1 && alternatives.every(part => part.includes('='))) {
      return createStructuredStep('alternatives', alternatives);
    }
    if (/^(?:\{|∅|sprendinių nėra|nėra sprendinių)/i.test(trimmed) || /;/.test(trimmed) || /x[_₁₂0-9]*\s*=.*[,;].*x[_₁₂0-9]*\s*=/i.test(trimmed)) {
      return createStructuredStep('solution-set', [source]);
    }
    return createStructuredStep('equation', [source]);
  }

  function normalizeStructuredStep(step) {
    if (typeof step === 'string' || typeof step === 'number') return migrateLegacyStepString(step);
    if (!step || typeof step !== 'object') return createStructuredStep();
    const values = Array.isArray(step.values) ? step.values : [step.value ?? ''];
    const latexValues = Array.isArray(step.latexValues)
      ? step.latexValues
      : [step.latex ?? ''];
    return createStructuredStep(step.type, values, latexValues, { branchGroupId: step.branchGroupId });
  }

  function normalizeStructuredSteps(steps) {
    if (!Array.isArray(steps) || !steps.length) return [createStructuredStep()];
    let legacyBranchGroupId = '';
    let legacyBranchStart = -1;
    return steps.map((rawStep, index) => {
      const step = normalizeStructuredStep(rawStep);
      if (step.type !== 'alternatives') {
        legacyBranchGroupId = '';
        legacyBranchStart = -1;
        return step;
      }
      if (step.branchGroupId) {
        legacyBranchGroupId = step.branchGroupId;
        legacyBranchStart = index;
        return step;
      }
      // Senesnėse versijose kiekviena šakų eilutė buvo atskiras top-level žingsnis.
      // Gretimas senas alternatyvų eilutes migruojame į vieną deterministinę vertikalią šakų grupę.
      if (!legacyBranchGroupId) {
        legacyBranchStart = index;
        legacyBranchGroupId = `legacy-branch-${legacyBranchStart}`;
      }
      return createStructuredStep('alternatives', step.values, step.latexValues, { branchGroupId: legacyBranchGroupId });
    });
  }

  const defaultResponse = task => task.response.renderer === 'math-step-list'
    ? { steps: [createStructuredStep()] }
    : { answer: '', answerLatex: '' };

  function normalizeMixedContentNodes(nodes) {
    const source = Array.isArray(nodes) ? nodes : [];
    const normalized = [];
    const appendText = value => {
      const text = String(value ?? '').replace(/\u200B/g, '');
      const previous = normalized[normalized.length - 1];
      if (previous?.type === 'text') previous.text += text;
      else normalized.push({ type: 'text', text });
    };
    source.forEach((node, index) => {
      if (typeof node === 'string' || typeof node === 'number') {
        appendText(node);
        return;
      }
      if (!node || typeof node !== 'object') return;
      if (node.type === 'formula') {
        normalized.push({
          type: 'formula',
          id: String(node.id || `mixed-formula-${Date.now()}-${index}`),
          value: String(node.value || ''),
          latex: String(node.latex || node.value || '')
        });
        return;
      }
      if (node.type === 'break' || node.type === 'lineBreak') {
        // P2-SPLIT-P2.2.3: keli iš eilės break mazgai yra prasmingi – jie reiškia
        // vartotojo paliktas tuščias eilutes. Jų nebesuspaudžiame į vieną, kad
        // mokytojo ir mokinio lentose išliktų identiškas vertikalus išdėstymas.
        normalized.push({ type: 'break' });
        return;
      }
      appendText(node.text ?? '');
    });
    if (!normalized.length) normalized.push({ type: 'text', text: '' });
    return normalized;
  }

  function normalizeMixedNote(note, index = 0) {
    const safe = note && typeof note === 'object' ? note : {};
    const nodes = Array.isArray(safe.nodes)
      ? normalizeMixedContentNodes(safe.nodes)
      : normalizeMixedContentNodes([{ type: 'text', text: String(safe.text || '') }]);
    return {
      id: String(safe.id || `note-${Date.now()}-${index}`),
      x: Number.isFinite(Number(safe.x)) ? Number(safe.x) : 0.08,
      y: Number.isFinite(Number(safe.y)) ? Number(safe.y) : 0.1,
      width: Math.max(110, Math.min(900, Number(safe.width) || 420)),
      minHeight: 44,
      nodes
    };
  }

  function migrateMixedNotes(parsedNotes, parsedFormulas) {
    const output = (Array.isArray(parsedNotes) ? parsedNotes : []).map(normalizeMixedNote);
    (Array.isArray(parsedFormulas) ? parsedFormulas : []).forEach((formula, index) => {
      const safe = formula && typeof formula === 'object' ? formula : {};
      const id = String(safe.id || `formula-${Date.now()}-${index}`);
      if (output.some(item => item.id === id)) return;
      output.push(normalizeMixedNote({
        id,
        x: safe.x,
        y: safe.y,
        width: 330,
        minHeight: 92,
        nodes: [
          { type: 'text', text: '' },
          { type: 'formula', id: `${id}-math`, value: String(safe.value || ''), latex: String(safe.latex || safe.value || '') },
          { type: 'text', text: '' }
        ]
      }, output.length));
    });
    return output;
  }

  const BUILTIN_PRACTICE_SETS = Object.freeze([
  {
    "id": "builtin-vbe-a-funkcijos-pamoka-1-v2",
    "kind": "external-module",
    "title": "VBE A · 1 pamoka — Funkcija ir f(x)",
    "description": "12 Pamokoje + 7 Savarankiškai · funkcijos sąvoka, f(x), reikšmė ir taškas grafike",
    "moduleUrl": "vbe-a-funkcijos-1-4-pamokos-v2.html?lesson=1",
    "moduleId": "vbe-a-funkcijos-1-4-v2",
    "moduleVersion": "2.0 · 1 pamoka",
    "taskCount": 19,
    "classTaskCount": 12,
    "selfTaskCount": 7,
    "handoutUrl": "konspektai/1-pamoka-funkcija-ir-fx.pdf",
    "builtIn": true,
    "createdAt": "2026-08-08T08:00:00.000Z",
    "updatedAt": "2026-08-08T08:00:00.000Z",
    "taskRefs": [],
    "snapshots": []
  },
  {
    "id": "builtin-vbe-a-funkcijos-pamoka-2-v2",
    "kind": "external-module",
    "title": "VBE A · 2 pamoka — Funkcijos grafiko skaitymas",
    "description": "14 Pamokoje + 8 Savarankiškai · nuliai, ženklas, intervalai, D(f), E(f), didėjimas ir mažėjimas",
    "moduleUrl": "vbe-a-funkcijos-1-4-pamokos-v2.html?lesson=2",
    "moduleId": "vbe-a-funkcijos-1-4-v2",
    "moduleVersion": "2.0 · 2 pamoka",
    "taskCount": 22,
    "classTaskCount": 14,
    "selfTaskCount": 8,
    "handoutUrl": "konspektai/2-pamoka-grafiko-skaitymas.pdf",
    "builtIn": true,
    "createdAt": "2026-08-08T08:00:00.000Z",
    "updatedAt": "2026-08-08T08:00:00.000Z",
    "taskRefs": [],
    "snapshots": []
  },
  {
    "id": "builtin-vbe-a-funkcijos-pamoka-3-v2",
    "kind": "external-module",
    "title": "VBE A · 3 pamoka — Tiesinė funkcija",
    "description": "13 Pamokoje + 8 Savarankiškai · f(x)=kx+b, grafikas, nulis ir formulės sudarymas",
    "moduleUrl": "vbe-a-funkcijos-1-4-pamokos-v2.html?lesson=3",
    "moduleId": "vbe-a-funkcijos-1-4-v2",
    "moduleVersion": "2.0 · 3 pamoka",
    "taskCount": 21,
    "classTaskCount": 13,
    "selfTaskCount": 8,
    "handoutUrl": "konspektai/3-pamoka-tiesine-funkcija.pdf",
    "builtIn": true,
    "createdAt": "2026-08-08T08:00:00.000Z",
    "updatedAt": "2026-08-08T08:00:00.000Z",
    "taskRefs": [],
    "snapshots": []
  },
  {
    "id": "builtin-vbe-a-funkcijos-pamoka-4-v2",
    "kind": "external-module",
    "title": "VBE A · 4 pamoka — Funkcija kaip problemų sprendimo įrankis",
    "description": "11 Pamokoje + 7 Savarankiškai · modeliai, palyginimas, koeficientų prasmė ir diagnostika",
    "moduleUrl": "vbe-a-funkcijos-1-4-pamokos-v2.html?lesson=4",
    "moduleId": "vbe-a-funkcijos-1-4-v2",
    "moduleVersion": "2.0 · 4 pamoka",
    "taskCount": 18,
    "classTaskCount": 11,
    "selfTaskCount": 7,
    "handoutUrl": "konspektai/4-pamoka-funkciju-taikymas.pdf",
    "builtIn": true,
    "createdAt": "2026-08-08T08:00:00.000Z",
    "updatedAt": "2026-08-08T08:00:00.000Z",
    "taskRefs": [],
    "snapshots": []
  }
]);

  function builtInPracticeSetCopies() {
    return BUILTIN_PRACTICE_SETS.map(item => deepClone(item));
  }

  const defaultState = () => AppState.createDefaultState({
    practicePackage,
    tasks,
    defaultResponse,
    library: createInitialLibrary()
  });

  let state = loadState(savedSnapshot);
  let saveTimer = null;
  let toastTimer = null;
  let drawingContext = null;
  let committedCanvas = null;
  let committedContext = null;
  let boardInput = null;
  let remoteLiveStrokes = [];
  let canvasViewport = null;
  let canvasViewportRaf = 0;
  let editorDirty = false;
  let editorLoading = false;
  let pendingAiImport = null;
  let libraryActiveTab = 'tasks';
  const selectedLibraryTaskIds = new Set();
  let onlineAccessRole = 'teacher';

  const responseRenderers = {
    'single-math-input': renderSingleMathInput,
    'math-step-list': renderMathStepList
  };

  const validators = {
    'expression-equivalence': validateExpressionResponse,
    'linear-equation-chain': validateEquationChain,
    'quadratic-equation-chain': validateQuadraticEquationChain,
    'semantic-equation-chain': validateSemanticEquationChain
  };

  // P2-SPLIT-P2.1: siauras tiltas P2 sluoksniui į tą patį P7.7.2 variklį.
  // Nekuriame antro formulės ar tikrinimo variklio: naudojami tie patys
  // MathLive laukai, struktūruotų žingsnių modelis ir validatoriai.
  window.P772PracticeEngine = Object.freeze({
    version: 'P7.7.2',
    createMathField(options = {}) {
      return createDirectMathField(options);
    },
    createStep(type = 'equation', values = [''], latexValues = [], meta = {}) {
      return createStructuredStep(type, values, latexValues, meta);
    },
    normalizeSteps(steps) {
      return normalizeStructuredSteps(steps);
    },
    holdMathToolbar(duration = 360) {
      holdMathToolbarDuringHandoff(duration);
    },
    validateTask(task, response) {
      const safeTask = upgradeTaskRequirements(deepClone(task));
      const validator = validators[safeTask?.response?.validator];
      if (!validator) {
        return {
          status: 'incorrect',
          title: 'Nepalaikomas tikrinimo būdas',
          message: `Validatorius „${safeTask?.response?.validator || 'nenurodytas'}“ nerastas.`,
          stepResults: []
        };
      }
      return deepClone(validator(safeTask, deepClone(response)));
    }
  });

  const BOARD_WORLD_MIN_WIDTH = 720;
  const BOARD_WORLD_MIN_HEIGHT = 1700;
  const BOARD_STRIP_DEFAULT_WIDTH = 720;
  const BOARD_STRIP_INITIAL_HEIGHT = 10000;
  // P2-SPLIT-P2.5-P4-P1.7.9.19: vertikali juosta susiaurinta iki 720 px, kad
  // sprendimas dar natūraliau tęstųsi žemyn, o šonuose liktų kuo mažiau tuščios erdvės.
  // Horizontalūs ir viršutiniai kraštai nebesiplečia; nauja erdvė pridedama tik
  // apačioje. Didelė techninė riba vartotojui praktiškai veikia kaip begalinis lapas.
  // Senų Room plotis sąmoningai nemažinamas, kad nebūtų iškraipyti ankstesni piešiniai.
  const BOARD_WORLD_MAX_WIDTH = 30000;
  const BOARD_WORLD_MAX_HEIGHT = 2000000;
  const BOARD_WORLD_EDGE_SCREEN_MARGIN = 180;
  // P3-P1.1: piešimo bitmapas apima tik matomą lentos sritį su nedideliu
  // rezervu aplink ją. Taip jo raiška nepriklauso nuo viso virtualaus pasaulio dydžio.
  const BOARD_CANVAS_OVERSCAN_SCREEN = 320;
  const BOARD_CANVAS_REPOSITION_GUARD_SCREEN = 110;
  const BOARD_CANVAS_MAX_DEVICE_DPR = 1.5;

  // P1.7.9.43: lentos geometrijos daugiau automatiškai nemigruojame net tada,
  // kai istorinis Room yra tuščias. Nauji Room ir taip kuriami 720 px pločio, o
  // senų Room worldWidth / worldHeight paliekami tokie, kokie buvo išsaugoti.
  // Mastelio suderinimas nuo šiol yra tik kameros / peržiūros atsakomybė.

  const BoardCamera = window.P772BoardCamera;
  if (!BoardCamera) throw new Error('P772BoardCamera modulis neįkeltas');
  const BoardGrid = window.P772BoardGrid;
  if (!BoardGrid) throw new Error('P772BoardGrid modulis neįkeltas');
  const BoardDrawing = window.P772BoardDrawing;
  if (!BoardDrawing) throw new Error('P772BoardDrawing modulis neįkeltas');
  const BoardInput = window.P772BoardInput;
  if (!BoardInput) throw new Error('P772BoardInput modulis neįkeltas');
  const BoardObjects = window.P772BoardObjects;
  if (!BoardObjects) throw new Error('P772BoardObjects modulis neįkeltas');
  const BoardTextEditor = window.P772BoardTextEditor;
  if (!BoardTextEditor) throw new Error('P772BoardTextEditor modulis neįkeltas');
  const BoardMathField = window.P772BoardMathField;
  if (!BoardMathField) throw new Error('P772BoardMathField modulis neįkeltas');
  const BoardMathToolbar = window.P772BoardMathToolbar;
  if (!BoardMathToolbar) throw new Error('P772BoardMathToolbar modulis neįkeltas');

  // P1.7.9.49-M2.10: DOM bootstrap / bendri helperiai app-bootstrap.js; bazinė būsenos schema / atkūrimas app-state.js; kameros matematika lieka board-camera.js, tinklelio
  // suderinimas board-grid.js, rasterizavimas board-drawing.js, pointer
  // seansas board-input.js, bendra objektų geometrija board-objects.js,
  // teksto / formulės DOM redagavimas board-text-editor.js, MathLive laukų
  // branduolys board-math-field.js, o matematikos juosta board-math-toolbar.js.
  const BOARD_FIT_SIDE_MARGIN_SCREEN = 0;
  const BOARD_LEGACY_USER_100_ZOOM = 1 / 3;
  const BOARD_LEGACY_FIT_PADDING_X = 28;
  const BOARD_CAMERA_CONFIG = Object.freeze({
    worldMinWidth: BOARD_WORLD_MIN_WIDTH,
    worldMinHeight: BOARD_WORLD_MIN_HEIGHT,
    worldMaxWidth: BOARD_WORLD_MAX_WIDTH,
    worldMaxHeight: BOARD_WORLD_MAX_HEIGHT,
    worldDefaultWidth: BOARD_STRIP_DEFAULT_WIDTH,
    worldDefaultHeight: BOARD_STRIP_INITIAL_HEIGHT,
    fitSideMarginScreen: BOARD_FIT_SIDE_MARGIN_SCREEN,
    legacyUser100Zoom: BOARD_LEGACY_USER_100_ZOOM,
    legacyFitPaddingX: BOARD_LEGACY_FIT_PADDING_X
  });

  function clampCameraZoom(value) {
    return BoardCamera.clampCameraZoom(value);
  }

  function normalizeCamera(camera) {
    return BoardCamera.normalizeCamera(camera, BOARD_CAMERA_CONFIG);
  }

  function getBoardWorldRect() {
    return BoardCamera.getWorldRect(state?.camera || {}, BOARD_CAMERA_CONFIG);
  }

  function currentBoardZoom() {
    return BoardCamera.currentZoom(state?.camera || {});
  }

  function boardFitZoom(viewportWidthOverride = null) {
    const viewportWidth = Math.max(1, Number(viewportWidthOverride) || refs.board?.clientWidth || 1);
    return BoardCamera.fitZoom(state?.camera || {}, viewportWidth, BOARD_CAMERA_CONFIG);
  }

  function boardUsesLegacyReadableScale() {
    return BoardCamera.usesLegacyReadableScale(state?.camera || {}, BOARD_CAMERA_CONFIG);
  }

  function boardUser100Zoom() {
    return BoardCamera.user100Zoom(state?.camera || {}, BOARD_CAMERA_CONFIG);
  }

  function boardZoomForUserPercent(percent) {
    return BoardCamera.zoomForUserPercent(state?.camera || {}, percent, BOARD_CAMERA_CONFIG);
  }

  function boardLegacyContentFitZoom(viewportWidthOverride = null) {
    const viewportWidth = Math.max(1, Number(viewportWidthOverride) || refs.board?.clientWidth || 1);
    return BoardCamera.legacyContentFitZoom(state?.camera || {}, boardContentBounds(), viewportWidth, BOARD_CAMERA_CONFIG);
  }

  function boardInitialFitZoom(viewportWidthOverride = null) {
    const viewportWidth = Math.max(1, Number(viewportWidthOverride) || refs.board?.clientWidth || 1);
    const bounds = boardUsesLegacyReadableScale() ? boardContentBounds() : null;
    return BoardCamera.initialFitZoom(state?.camera || {}, bounds, viewportWidth, BOARD_CAMERA_CONFIG);
  }

  function boardUserZoomPercent(actualZoom = currentBoardZoom()) {
    return BoardCamera.userZoomPercent(state?.camera || {}, actualZoom, BOARD_CAMERA_CONFIG);
  }

  function setBoardUserZoomPercent(percent, options = {}) {
    setBoardZoom(boardZoomForUserPercent(percent), options);
  }

  function boardStrokeWorldWidth(strokeWidth) {
    return BoardCamera.strokeWorldWidth(state?.camera || {}, strokeWidth, BOARD_CAMERA_CONFIG);
  }

  function boardStrokeRenderWorldWidth(stroke) {
    return BoardCamera.strokeRenderWorldWidth(state?.camera || {}, stroke, BOARD_CAMERA_CONFIG);
  }

  function boardGeometrySnapshot() {
    return BoardCamera.geometrySnapshot(state?.camera || {}, BOARD_CAMERA_CONFIG);
  }

  function normalizeBoardGeometry(geometry) {
    const camera = normalizeCamera({
      ...state?.camera,
      worldWidth: geometry?.worldWidth,
      worldHeight: geometry?.worldHeight,
      worldOriginX: geometry?.worldOriginX,
      worldOriginY: geometry?.worldOriginY
    });
    return {
      schemaVersion: 2,
      layoutMode: 'vertical-strip',
      worldWidth: camera.worldWidth,
      worldHeight: camera.worldHeight,
      worldOriginX: camera.worldOriginX,
      worldOriginY: camera.worldOriginY
    };
  }

  function remapNormalizedPoint(point, oldWidth, oldHeight, newWidth, newHeight, offsetX, offsetY) {
    if (!point || typeof point !== 'object') return;
    const oldX = Number(point.x) || 0;
    const oldY = Number(point.y) || 0;
    point.x = Math.max(0, Math.min(1, (oldX * oldWidth + offsetX) / Math.max(1, newWidth)));
    point.y = Math.max(0, Math.min(1, (oldY * oldHeight + offsetY) / Math.max(1, newHeight)));
  }

  function remapBoardStateForWorldResize(oldWidth, oldHeight, newWidth, newHeight, offsetX = 0, offsetY = 0) {
    if (!(oldWidth > 0 && oldHeight > 0 && newWidth > 0 && newHeight > 0)) return;
    const remapStroke = stroke => (stroke?.points || []).forEach(point => remapNormalizedPoint(point, oldWidth, oldHeight, newWidth, newHeight, offsetX, offsetY));
    state.drawing.forEach(remapStroke);
    remoteLiveStrokes.forEach(remapStroke);
    boardInput?.remapActiveStroke(remapStroke);

    for (const note of state.notes) {
      note.x = (Number(note.x || 0) * oldWidth + offsetX) / newWidth;
      note.y = (Number(note.y || 0) * oldHeight + offsetY) / newHeight;
    }

    for (const image of state.boardImages) {
      image.x = (Number(image.x || 0) * oldWidth + offsetX) / newWidth;
      image.y = (Number(image.y || 0) * oldHeight + offsetY) / newHeight;
      image.width = Number(image.width || 0) * oldWidth / newWidth;
      image.height = Number(image.height || 0) * oldHeight / newHeight;
    }

    for (const instance of [...state.boardTasks, ...state.boardPractices]) {
      instance.x = (Number(instance.x || 0) * oldWidth + offsetX) / newWidth;
      instance.y = (Number(instance.y || 0) * oldHeight + offsetY) / newHeight;
      instance.width = Number(instance.width || 0) * oldWidth / newWidth;
      instance.height = Number(instance.height || 0) * oldHeight / newHeight;
    }

    if (state.window && state.window.x !== null && state.window.y !== null) {
      state.window.x = (Number(state.window.x || 0) * oldWidth + offsetX) / newWidth;
      state.window.y = (Number(state.window.y || 0) * oldHeight + offsetY) / newHeight;
      if (state.window.width) state.window.width = Number(state.window.width) * oldWidth / newWidth;
      if (state.window.height) state.window.height = Number(state.window.height) * oldHeight / newHeight;
    }
  }

  function expandBoardWorld(request = {}, options = {}) {
    if (!refs.board || state.practiceOnly?.active || boardInput?.isDrawingActive()) return null;
    state.camera = normalizeCamera(state.camera);
    const oldWidth = state.camera.worldWidth;
    const oldHeight = state.camera.worldHeight;

    // P1.7.9: fiksuoto pločio lenta gali augti tik žemyn. Sąmoningai ignoruojame
    // left/right/top užklausas, todėl nebegalima „pasimesti“ erdvėje į šonus ar viršų.
    let bottom = Math.max(0, Number(request.bottom) || 0);
    const heightCapacity = Math.max(0, BOARD_WORLD_MAX_HEIGHT - oldHeight);
    bottom = Math.round(Math.min(bottom, heightCapacity));
    if (!bottom) return null;

    const newWidth = oldWidth;
    const newHeight = oldHeight + bottom;
    const oldScrollLeft = refs.board.scrollLeft;
    const oldScrollTop = refs.board.scrollTop;

    // Esamas modelis saugo Y koordinates normalizuotas pagal lentos aukštį, todėl
    // didinant aukštį jas perskaičiuojame taip, kad visi jau parašyti objektai liktų
    // tiksliai tose pačiose fizinėse vietose.
    remapBoardStateForWorldResize(oldWidth, oldHeight, newWidth, newHeight, 0, 0);
    state.camera.worldWidth = newWidth;
    state.camera.worldHeight = newHeight;
    state.camera.scrollLeft = oldScrollLeft;
    state.camera.scrollTop = oldScrollTop;

    applyBoardCamera({ restoreScroll: true });
    resizeCanvas({ force: true });
    layoutBoardObjects();
    initializePracticeWindow();
    if (options.save !== false) scheduleSave();
    return { left: 0, right: 0, top: 0, bottom, oldWidth, oldHeight, newWidth, newHeight };
  }

  function boardExpansionChunk(axis = 'y') {
    const zoom = Math.max(0.001, currentBoardZoom());
    const viewport = refs.board.clientHeight;
    // Dideli vertikalūs segmentai sumažina geometrijos perskaičiavimų skaičių
    // ilgoje pamokoje ir išlaiko P3 našumo pataisų naudą.
    return Math.round(Math.max(10000, viewport / zoom * 5));
  }

  function expandBoardForScrollIntent(deltaX = 0, deltaY = 0) {
    if (state.practiceOnly?.active || boardInput?.isDrawingActive() || deltaY <= 0) return null;
    const zoom = Math.max(0.001, currentBoardZoom());
    const world = getBoardWorldRect();
    const margin = BOARD_WORLD_EDGE_SCREEN_MARGIN;
    const scaledHeight = world.height * zoom;
    const maxTop = Math.max(0, scaledHeight - refs.board.clientHeight);
    if (maxTop - refs.board.scrollTop > margin) return null;
    return expandBoardWorld({ bottom: boardExpansionChunk('y') });
  }

  let infiniteBoardEdgeTimer = null;
  function scheduleBoardEdgeExpansion() {
    clearTimeout(infiniteBoardEdgeTimer);
    infiniteBoardEdgeTimer = window.setTimeout(() => {
      if (boardInput?.isDrawingActive() || state.practiceOnly?.active) return;
      const zoom = Math.max(0.001, currentBoardZoom());
      const world = getBoardWorldRect();
      const maxTop = Math.max(0, world.height * zoom - refs.board.clientHeight);
      const margin = 36;
      if (maxTop > 0 && maxTop - refs.board.scrollTop <= margin) {
        expandBoardWorld({ bottom: boardExpansionChunk('y') });
      }
    }, 90);
  }

  function applyIncomingBoardGeometry(rawGeometry) {
    const next = normalizeBoardGeometry(rawGeometry || {});
    state.camera = normalizeCamera(state.camera);
    const previous = boardGeometrySnapshot();
    if (previous.worldWidth === next.worldWidth && previous.worldHeight === next.worldHeight
      && previous.worldOriginX === next.worldOriginX && previous.worldOriginY === next.worldOriginY) return;

    const deltaOriginX = next.worldOriginX - previous.worldOriginX;
    const deltaOriginY = next.worldOriginY - previous.worldOriginY;
    const oldScrollLeft = refs.board.scrollLeft;
    const oldScrollTop = refs.board.scrollTop;
    state.camera.worldWidth = next.worldWidth;
    state.camera.worldHeight = next.worldHeight;
    state.camera.worldOriginX = next.worldOriginX;
    state.camera.worldOriginY = next.worldOriginY;
    state.camera.scrollLeft = Math.max(0, oldScrollLeft + deltaOriginX * currentBoardZoom());
    state.camera.scrollTop = Math.max(0, oldScrollTop + deltaOriginY * currentBoardZoom());
    applyBoardCamera({ restoreScroll: true });
    resizeCanvas({ force: true });
    layoutBoardObjects();
    initializePracticeWindow();
  }

  function taskRequiresMixedNumber(task) {
    if (task?.response?.options?.requiredAnswerForm === 'mixed-number') return true;
    const pedagogicalText = `${task?.title || ''} ${task?.instruction || ''}`.toLocaleLowerCase('lt-LT');
    return pedagogicalText.includes('mišr');
  }

  function taskIsMixedNumberTransformation(task) {
    if (task?.assessment?.mode === 'single-condition') return true;
    const text = `${task?.title || ''} ${task?.instruction || ''}`.toLocaleLowerCase('lt-LT');
    return task?.response?.renderer === 'single-math-input'
      && /(?:paversk|perrašyk|užrašyk)/u.test(text)
      && /mišr/u.test(text);
  }

  function normalizeAssessmentCriterion(raw, fallback = {}) {
    const criterion = raw && typeof raw === 'object' ? raw : {};
    const id = String(criterion.id || fallback.id || `criterion-${Date.now().toString(36)}`);
    const type = String(criterion.type || fallback.type || id);
    const role = criterion.role === 'secondary' ? 'secondary' : 'primary';
    return {
      id,
      type,
      role,
      label: String(criterion.label || fallback.label || 'Užduoties sąlyga'),
      ...(criterion.expected ? { expected: String(criterion.expected) } : fallback.expected ? { expected: String(fallback.expected) } : {})
    };
  }

  function upgradeTaskAssessment(task) {
    task.assessment = task.assessment && typeof task.assessment === 'object' ? task.assessment : {};
    const existing = Array.isArray(task.assessment.criteria)
      ? task.assessment.criteria.map(item => normalizeAssessmentCriterion(item))
      : [];
    const byType = type => existing.find(item => item.type === type);

    if (!byType('validator')) {
      existing.unshift(normalizeAssessmentCriterion({
        id: 'mathematical-correctness',
        type: 'validator',
        role: 'primary',
        label: task?.prompt?.kind === 'equation' ? 'Teisingas lygties sprendinys' : 'Teisinga matematinė reikšmė'
      }));
    }

    if (taskRequiresMixedNumber(task) && !byType('required-answer-form')) {
      existing.push(normalizeAssessmentCriterion({
        id: 'mixed-number-form',
        type: 'required-answer-form',
        role: taskIsMixedNumberTransformation(task) ? 'primary' : 'secondary',
        label: taskIsMixedNumberTransformation(task)
          ? 'Trupmena perrašyta mišriuoju skaičiumi'
          : 'Atsakymas pateiktas mišriuoju skaičiumi',
        expected: 'mixed-number'
      }));
    }

    const minimumSteps = Number(task?.response?.options?.minimumSteps) || 0;
    if (minimumSteps > 1 && !byType('minimum-steps')) {
      existing.push(normalizeAssessmentCriterion({
        id: 'solution-steps',
        type: 'minimum-steps',
        role: 'secondary',
        label: `Parodyta bent ${minimumSteps} sprendimo žingsnių`
      }));
    }

    if (task?.response?.options?.requireSimplified && !byType('simplified-form')) {
      existing.push(normalizeAssessmentCriterion({
        id: 'simplified-form',
        type: 'simplified-form',
        role: 'secondary',
        label: 'Atsakymas pateiktas pakankamai supaprastinta forma'
      }));
    }

    task.assessment.criteria = existing;
    task.assessment.modelVersion = 1;
    if (!task.assessment.mode) task.assessment.mode = taskIsMixedNumberTransformation(task) ? 'single-condition' : 'multi-condition';
    return task;
  }

  function upgradeTaskRequirements(task) {
    if (!task || typeof task !== 'object') return task;
    task.response = task.response && typeof task.response === 'object' ? task.response : {};
    task.response.options = task.response.options && typeof task.response.options === 'object' ? task.response.options : {};
    if (!task.response.options.requiredAnswerForm && taskRequiresMixedNumber(task)) {
      task.response.options.requiredAnswerForm = 'mixed-number';
    }
    return upgradeTaskAssessment(task);
  }

  function normalizePackage(candidate) {
    const fallback = deepClone(defaultPracticePackage);
    if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.tasks) || !candidate.tasks.length) return fallback;
    const normalized = deepClone(candidate);
    normalized.schemaVersion = Number(normalized.schemaVersion) || 1;
    normalized.contract = normalized.contract || 'interactive-practice-package@1';
    normalized.id = normalized.id || 'p3-authoring-package';
    normalized.title = String(normalized.title || 'Interaktyvios matematikos pratybos');
    normalized.eyebrow = String(normalized.eyebrow || 'DI TINKAMAS PRATYBŲ MODELIS · P7.7.2');
    if (['DI TINKAMAS PRATYBŲ MODELIS · P3', 'DI TINKAMAS PRATYBŲ MODELIS · P3.1', 'DI TINKAMAS PRATYBŲ MODELIS · P3.2', 'DI TINKAMAS PRATYBŲ MODELIS · P5', 'DI TINKAMAS PRATYBŲ MODELIS · P5.2', 'DI TINKAMAS PRATYBŲ MODELIS · P7.4', 'DI TINKAMAS PRATYBŲ MODELIS · P7.7.2'].includes(normalized.eyebrow)) {
      normalized.eyebrow = 'DI TINKAMAS PRATYBŲ MODELIS · P7.7.2';
    }
    const usedIds = new Set();
    normalized.tasks = normalized.tasks.map((task, index) => {
      const safe = task && typeof task === 'object' ? task : {};
      let id = String(safe.id || `task-${index + 1}`);
      while (usedIds.has(id)) id = `${id}-${index + 1}`;
      usedIds.add(id);
      safe.id = id;
      safe.response = safe.response && typeof safe.response === 'object' ? safe.response : {};
      safe.response.options = safe.response.options && typeof safe.response.options === 'object' ? safe.response.options : {};
      return upgradeTaskRequirements(safe);
    });
    return normalized;
  }

  function loadState(parsed) {
    return AppState.restoreState({
      parsed,
      base: defaultState(),
      practicePackage,
      tasks,
      defaultResponse,
      migrateMixedNotes,
      normalizeBoardImageInstance,
      normalizeBoardTaskInstance,
      normalizeBoardPracticeInstance,
      normalizeCamera,
      normalizeLibrary,
      normalizeStructuredSteps,
      resultMatchesCurrentResponse,
      onError: error => console.warn('Nepavyko atkurti būsenos:', error)
    });
  }

  function responseSnapshot(response) {
    return JSON.stringify(response);
  }

  function resultMatchesCurrentResponse(result, response, task = null) {
    if (!result) return true;
    if (result.checkedSnapshot !== responseSnapshot(response)) return false;
    if (result.assessmentVersion !== 1) return false;
    if (task && taskRequiresMixedNumber(task) && result.status === 'correct' && !responseUsesRequiredAnswerForm(task, response)) return false;
    return true;
  }

  let saveShouldNotifyShared = false;

  function scheduleSave(options = {}) {
    refs.saveState.textContent = 'Saugoma…';
    if (options.notifyShared !== false) saveShouldNotifyShared = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const notifyShared = saveShouldNotifyShared;
      saveShouldNotifyShared = false;
      try {
        state.packageData = practicePackage;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        refs.saveState.textContent = 'Išsaugota';
      } catch (error) {
        refs.saveState.textContent = 'Neišsaugota vietoje';
        console.error('Nepavyko išsaugoti vietinės kopijos:', error);
      }
      // Piešimo brūkšniai online režime siunčiami tiesiogiai per p772:live-stroke/end,
      // todėl vien dėl jų nebeskanuojame ir neserializuojame visos bendros lentos būsenos.
      if (notifyShared) window.dispatchEvent(new CustomEvent('p772:shared-state-changed'));
    }, 180);
  }

  function showToast(message) {
    clearTimeout(toastTimer);
    refs.toast.textContent = message;
    refs.toast.classList.add('is-visible');
    toastTimer = setTimeout(() => refs.toast.classList.remove('is-visible'), 2200);
  }

  function currentTask() {
    return tasks[state.currentTask];
  }

  function currentResponse() {
    return state.responses[currentTask().id];
  }

  function invalidateTaskResult(taskId) {
    state.results[taskId] = null;
    if (currentTask().id === taskId) renderFeedback(null);
    renderProgress();
    renderTaskDots();
  }

  function readyTaskIndexes() {
    return tasks.map((task, index) => isTaskReady(task) ? index : -1).filter(index => index >= 0);
  }

  function renderTask() {
    const task = currentTask();
    if (!task) return;
    const taskChanged = refs.taskCard.dataset.taskId !== task.id;
    if (taskChanged) clearMathEditSession();
    else prepareMathDomReplacement(refs.responseHost);
    const readyIndexes = readyTaskIndexes();
    const visiblePosition = Math.max(0, readyIndexes.indexOf(state.currentTask));
    const studentMode = state.mode === 'student';
    const visibleTotal = studentMode ? readyIndexes.length : tasks.length;
    const visibleNumber = studentMode ? visiblePosition + 1 : state.currentTask + 1;
    refs.packageTitle.textContent = practicePackage.title;
    refs.packageEyebrow.textContent = practicePackage.eyebrow;
    refs.taskCounter.textContent = `${visibleNumber} iš ${visibleTotal}`;
    refs.taskNumber.textContent = studentMode ? String(visibleNumber) : `${visibleNumber} užduotis`;
    refs.taskTitle.textContent = task.title || 'Užduotis be pavadinimo';
    refs.responseBadge.textContent = rendererLabels[task.response?.renderer] || task.response?.renderer || 'Nenurodytas tipas';
    refs.difficultyLabel.textContent = task.difficulty || '';
    refs.instructionText.textContent = task.instruction || '';
    refs.domainNote.textContent = task.note || '';
    refs.domainNote.hidden = !task.note;
    refs.hintText.textContent = task.hint || '';
    refs.hintBox.hidden = !task.hint;
    refs.hintBox.open = false;
    refs.previousButton.disabled = studentMode ? visiblePosition <= 0 : state.currentTask === 0;
    refs.nextButton.disabled = studentMode ? visiblePosition < 0 || visiblePosition >= readyIndexes.length - 1 : state.currentTask === tasks.length - 1;

    refs.formulaDisplay.replaceChildren();
    try {
      refs.formulaDisplay.appendChild(renderPromptMath(task.prompt));
    } catch (error) {
      refs.formulaDisplay.textContent = `Užduoties matematinis turinys dar neparuoštas: ${friendlyParseError(error)}`;
    }
    refs.responseHost.replaceChildren();
    const gate = getTaskQualityGate(task);
    if (studentMode && gate.status !== 'ready') {
      refs.responseHost.textContent = 'Ši užduotis nepateko į mokinio režimą, nes dar nepraėjo patikimumo vartų.';
    } else {
      const renderer = responseRenderers[task.response?.renderer];
      if (!renderer) refs.responseHost.textContent = `Nepalaikomas atsakymo laukas: ${task.response?.renderer || 'nenurodytas'}`;
      else renderer(task, currentResponse());
    }

    renderFeedback(state.results[task.id]);
    renderTaskDots();
    renderProgress();
    refs.taskCard.dataset.taskId = task.id;
    if (taskChanged) refs.taskCard.scrollTop = 0;
    finalizeMathDomReplacement();
    scheduleSave();
  }

  function renderPromptMath(prompt) {
    if (prompt.kind === 'equation') return equationToMathML(parseEquation(prompt.value));
    return astToMathML(parseExpression(prompt.value));
  }

  function renderTaskDots() {
    refs.taskDots.replaceChildren();
    const indexes = state.mode === 'student' ? readyTaskIndexes() : tasks.map((_, index) => index);
    indexes.forEach((taskIndex, visibleIndex) => {
      const task = tasks[taskIndex];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'task-dot';
      button.dataset.taskIndex = String(taskIndex);
      button.setAttribute('aria-label', `${visibleIndex + 1} užduotis`);
      button.classList.toggle('is-active', taskIndex === state.currentTask);
      button.classList.toggle('is-complete', state.results[task.id]?.status === 'correct');
      button.addEventListener('click', () => { state.currentTask = taskIndex; renderTask(); });
      refs.taskDots.appendChild(button);
    });
  }

  function renderProgress() {
    const visibleTasks = state.mode === 'student' ? readyTaskIndexes().map(index => tasks[index]) : tasks;
    const completed = visibleTasks.filter(task => state.results[task.id]?.status === 'correct').length;
    refs.scoreLabel.textContent = `Atlikta ${completed} iš ${visibleTasks.length}`;
    refs.progressFill.style.width = `${visibleTasks.length ? (completed / visibleTasks.length) * 100 : 0}%`;
  }


  // -------------------- P7.7.2 patikimas aktyvios formulės taikinio perjungimas --------------------

  let activeDirectMathField = null;
  let activeMathContext = '';
  let generatedMathFieldKey = 0;
  const mathFieldRegistry = new Map();
  const mathSelectionByKey = new Map();
  const mathEditSession = {
    key: '',
    context: '',
    field: null,
    selection: null,
    restorePending: false
  };
  let mathToolbarHandoffTimer = 0;

  function syncP2MathRibbonShellState() {
    const toolbar = refs.universalMathToolbar;
    const visible = Boolean(toolbar && (
      toolbar.classList.contains('is-active')
      || toolbar.classList.contains('is-handoff')
      || toolbar.classList.contains('is-restoring')
    ));
    document.body?.classList.toggle('p2-math-ribbon-active', visible);
    if (visible) scheduleUniversalMathKeyboardPageLayout();
  }

  function holdMathToolbarDuringHandoff(duration = 360) {
    const toolbar = refs.universalMathToolbar;
    if (!toolbar) return;
    const ms = Math.max(120, Math.min(900, Number(duration) || 360));
    toolbar.classList.add('is-handoff');
    syncP2MathRibbonShellState();
    if (mathToolbarHandoffTimer) window.clearTimeout(mathToolbarHandoffTimer);
    mathToolbarHandoffTimer = window.setTimeout(() => {
      mathToolbarHandoffTimer = 0;
      toolbar.classList.remove('is-handoff');
      updateMathToolbarUi();
    }, ms);
  }

  let activeMixedTextEditor = null;
  let savedMixedTextRange = null;

  function cloneMathSelection(selection) {
    if (!selection) return null;
    try { return JSON.parse(JSON.stringify(selection)); } catch (_) { return null; }
  }

  function selectionSignature(selection) {
    try { return JSON.stringify(selection || null); } catch (_) { return ''; }
  }

  function mathSelectionHasContent(selection) {
    const ranges = Array.isArray(selection) ? selection : selection?.ranges;
    return Array.isArray(ranges) && ranges.some(range => Array.isArray(range) && Number(range[0]) !== Number(range[1]));
  }

  function mathFieldKey(field) {
    return String(field?.dataset?.mathFieldKey || '');
  }

  function mathFieldFromEvent(event) {
    for (const node of eventComposedPath(event)) {
      if (node instanceof Element && node.matches?.('math-field.direct-math-field')) return node;
      if (node instanceof Element) {
        const field = node.closest?.('math-field.direct-math-field');
        if (field) return field;
      }
    }
    return null;
  }

  function eventTouchesMathToolbar(event) {
    return eventComposedPath(event).some(node => node instanceof Element && (node.id === 'universalMathToolbar' || node.closest?.('#universalMathToolbar')));
  }

  function eventOriginatesInDirectMathField(event) {
    if (mathFieldFromEvent(event)) return true;
    return eventComposedPath(event).some(node => node instanceof Element
      && (node.matches?.('.mixed-inline-formula') || node.closest?.('.mixed-inline-formula')));
  }

  function reaffirmMathEditSession(field, contextLabel = '', options = {}) {
    if (!field?.isConnected) return false;
    const suppressUntil = Number(field.__suppressMathReaffirmUntil || 0);
    if (suppressUntil > performance.now() && options.explicit !== true) return false;
    if (options.explicit === true) field.__suppressMathReaffirmUntil = 0;
    const wrapper = field.closest?.('.mixed-inline-formula');
    const mixedEditor = wrapper ? mixedEditorFromNode(wrapper) : null;
    if (mixedEditor && currentMixedTextRange(mixedEditor) && !directMathFieldHasDomFocus(field) && options.force !== true) {
      if (activeDirectMathField === field) clearMathEditSession();
      return false;
    }
    const context = contextLabel || field.dataset.mathContext || activeMathContext || 'Matematinis laukas';
    if (activeDirectMathField !== field) {
      setActiveDirectMathField(field, context, { restoreSelection: false, ensureVisible: options.ensureVisible !== false });
    } else {
      activeMathContext = context;
      const key = mathFieldKey(field);
      mathEditSession.key = key;
      mathEditSession.context = context;
      mathEditSession.field = field;
      mathEditSession.restorePending = false;
      field.classList.add('math-field-is-active');
      updateMathToolbarUi();
      if (options.ensureVisible) ensureMathFieldVisible(field, { immediate: true });
    }
    return true;
  }

  function captureMathFieldSelection(field = activeDirectMathField) {
    if (!field) return null;
    const key = mathFieldKey(field);
    let selection = null;
    try { selection = cloneMathSelection(field.selection); } catch (_) { selection = null; }
    if (key && selection) mathSelectionByKey.set(key, selection);
    if (key && mathEditSession.key === key) {
      mathEditSession.selection = selection;
      mathEditSession.field = field.isConnected ? field : null;
    }
    return selection;
  }

  function restoreMathFieldSelection(field, selection = null) {
    if (!field) return false;
    const saved = selection || mathSelectionByKey.get(mathFieldKey(field)) || mathEditSession.selection;
    if (!saved) return false;
    try {
      field.selection = cloneMathSelection(saved);
      return true;
    } catch (_) { return false; }
  }

  function updateMathToolbarUi() {
    const field = activeDirectMathField?.isConnected ? activeDirectMathField : null;
    const mixedEditor = activeMixedTextEditor?.isConnected ? activeMixedTextEditor : null;
    const enabled = Boolean(field || mixedEditor);
    refs.universalMathToolbar?.classList.toggle('is-inactive', !enabled);
    refs.universalMathToolbar?.classList.toggle('is-active', enabled);
    refs.universalMathToolbar?.classList.toggle('is-restoring', !field && !mixedEditor && Boolean(mathEditSession.restorePending && mathEditSession.key));
    syncP2MathRibbonShellState();
    if (refs.universalMathStatus) {
      refs.universalMathStatus.textContent = field
        ? (activeMathContext || 'Matematinis laukas')
        : mixedEditor
          ? 'Teksto ir formulių laukas – pasirink kategoriją ir struktūrą'
          : (mathEditSession.restorePending && mathEditSession.key
            ? 'Atkuriamas formulės žymeklis…'
            : 'Aktyvuok teksto arba matematinį lauką');
    }
  }

  function ensureMathFieldVisible(field, options = {}) {
    if (!field?.isConnected) return;
    requestAnimationFrame(() => {
      if (!field.isConnected) return;
      const answerArea = field.closest?.('.practice-page-answer-area');
      if (answerArea && typeof ensureElementVisibleInScroller === 'function') {
        ensureElementVisibleInScroller(answerArea, field);
      }
      const rect = field.getBoundingClientRect();
      const viewportHeight = window.visualViewport?.height || window.innerHeight;
      const topSafe = document.body.classList.contains('practice-only-mode') ? 62 : 104;
      const bottomSafe = Math.max(12, window.innerHeight - viewportHeight + 12);
      if (rect.top < topSafe || rect.bottom > viewportHeight - bottomSafe || rect.left < 0 || rect.right > window.innerWidth) {
        try { field.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: options.immediate ? 'auto' : 'smooth' }); } catch (_) {}
      }
    });
  }

  function setMathFieldEditing(field, editing) {
    if (!field) return;
    field.classList.toggle('math-field-is-active', Boolean(editing));
  }

  function scheduleMathFieldPreview() { /* P7.7.2: MathLive yra vienintelis matomas formulės mazgas. */ }
  function renderMathFieldPreview() { return Promise.resolve(); }

  function enterMathFieldEditMode(field) {
    if (!field?.isConnected) return;
    setMathFieldEditing(field, true);
    try { field.focus({ preventScroll: true }); } catch (_) { field.focus(); }
    setActiveDirectMathField(field, field.dataset.mathContext || 'Matematinis laukas', { ensureVisible: true });
    if (!captureMathFieldSelection(field)) {
      try { field.executeCommand?.('moveToMathfieldEnd'); } catch (_) {}
    }
  }

  function ensureMathDisplayShell(field) { return field?.parentElement || null; }

  function normalizeMathFieldRendering(field) {
    if (!field?.isConnected) return;
    field.style.removeProperty('--math-render-font-size');
    field.style.removeProperty('--math-render-zoom-compensation');
    field.classList.remove('is-preview-hidden');
  }

  function refreshMathFieldRendering(root = document) {
    const fields = root?.matches?.('math-field.direct-math-field')
      ? [root]
      : [...(root?.querySelectorAll?.('math-field.direct-math-field') || [])];
    fields.forEach(normalizeMathFieldRendering);
  }

  function registerMathField(field) {
    const key = mathFieldKey(field);
    if (!key) return;
    mathFieldRegistry.set(key, field);
    requestAnimationFrame(() => normalizeMathFieldRendering(field));
    requestAnimationFrame(() => {
      if (!field.isConnected || mathEditSession.key !== key || !mathEditSession.restorePending) return;
      activeDirectMathField = field;
      activeMathContext = field.dataset.mathContext || mathEditSession.context || 'Matematinis laukas';
      mathEditSession.field = field;
      mathEditSession.restorePending = false;
      field.classList.add('math-field-is-active');
      setMathFieldEditing(field, true);
      try { field.focus({ preventScroll: true }); } catch (_) { field.focus(); }
      restoreMathFieldSelection(field);
      updateMathToolbarUi();
      ensureMathFieldVisible(field, { immediate: true });
    });
  }

  function prepareMathDomReplacement(container) {
    if (!activeDirectMathField || !container?.contains(activeDirectMathField)) return;
    captureMathFieldSelection(activeDirectMathField);
    activeDirectMathField.classList.remove('math-field-is-active');
    setMathFieldEditing(activeDirectMathField, false);
    mathEditSession.key = mathFieldKey(activeDirectMathField);
    mathEditSession.context = activeMathContext;
    mathEditSession.field = null;
    mathEditSession.restorePending = Boolean(mathEditSession.key);
    activeDirectMathField = null;
    updateMathToolbarUi();
  }

  function finalizeMathDomReplacement() {
    if (!mathEditSession.restorePending || !mathEditSession.key) return;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (!mathEditSession.restorePending) return;
      const candidate = mathFieldRegistry.get(mathEditSession.key);
      if (!candidate?.isConnected) clearMathEditSession();
    }));
  }

  function clearMathEditSession(options = {}) {
    const previousField = activeDirectMathField;
    if (previousField) captureMathFieldSelection(previousField);
    previousField?.classList.remove('math-field-is-active');
    setMathFieldEditing(previousField, false);
    activeDirectMathField = null;
    activeMathContext = '';
    mathEditSession.field = null;
    mathEditSession.restorePending = false;
    if (!options.keepKey) {
      mathEditSession.key = '';
      mathEditSession.context = '';
      mathEditSession.selection = null;
    }
    updateMathToolbarUi();
    notifySharedNoteEditingEndedSoon?.();
  }

  function resolveActiveMathField() {
    const editor = activeMixedTextEditor?.isConnected ? activeMixedTextEditor : null;
    const focusedField = activeDirectMathField?.isConnected && directMathFieldHasDomFocus(activeDirectMathField)
      ? activeDirectMathField
      : null;
    if (editor && currentMixedTextRange(editor) && !focusedField) {
      if (activeDirectMathField) clearMathEditSession();
      return null;
    }
    if (activeDirectMathField?.isConnected) return activeDirectMathField;
    const registered = mathFieldRegistry.get(mathEditSession.key);
    if (registered?.isConnected) {
      const registeredEditor = mixedEditorFromNode(registered);
      if (registeredEditor && currentMixedTextRange(registeredEditor) && !directMathFieldHasDomFocus(registered)) {
        clearMathEditSession();
        return null;
      }
      activeDirectMathField = registered;
      mathEditSession.field = registered;
      return registered;
    }
    return null;
  }

  function normalizeBoardObjectSelection(type, id) {
    return BoardObjects.normalizeSelection(type, id, state);
  }

  function getBoardObjectElement(selection = state.activeBoardObject) {
    return BoardObjects.getElement(selection, {
      state,
      objectsLayer: refs.objectsLayer,
      practiceWindow: refs.practiceWindow
    });
  }

  function updateActiveBoardObjectUi() {
    BoardObjects.updateSelectionUi({
      state,
      objectsLayer: refs.objectsLayer,
      practiceWindow: refs.practiceWindow,
      focusObjectButton: refs.boardFocusObjectButton
    });
  }

  function setActiveBoardObject(type, id, options = {}) {
    const next = normalizeBoardObjectSelection(type, id);
    const previous = state.activeBoardObject;
    const unchanged = previous?.type === next?.type && previous?.id === next?.id;
    state.activeBoardObject = next;
    state.activeBoardTaskId = next?.type === 'task' ? next.id : null;
    state.activeBoardPracticeId = next?.type === 'practice' ? next.id : null;
    updateActiveBoardObjectUi();
    if (!unchanged && options.save !== false) scheduleSave();
    return next;
  }

  function clearActiveBoardObject(options = {}) {
    return setActiveBoardObject(null, null, options);
  }

  function setActiveBoardTask(instanceId, options = {}) {
    return instanceId ? setActiveBoardObject('task', instanceId, options) : clearActiveBoardObject(options);
  }

  function setActiveBoardPractice(instanceId, options = {}) {
    return instanceId ? setActiveBoardObject('practice', instanceId, options) : clearActiveBoardObject(options);
  }

  function setActiveDirectMathField(field, contextLabel = '', options = {}) {
    const nextField = field && field.isConnected ? field : null;
    if (activeDirectMathField && activeDirectMathField !== nextField) {
      const previousField = activeDirectMathField;
      captureMathFieldSelection(previousField);
      previousField.classList.remove('math-field-is-active');
      setMathFieldEditing(previousField, false);
    }
    activeDirectMathField = nextField;
    activeMathContext = nextField ? (contextLabel || nextField.dataset.mathContext || 'Matematinis laukas') : '';
    if (nextField) {
      registerMathField(nextField);
      const key = mathFieldKey(nextField);
      mathEditSession.key = key;
      mathEditSession.context = activeMathContext;
      mathEditSession.field = nextField;
      mathEditSession.restorePending = false;
      mathEditSession.selection = captureMathFieldSelection(nextField) || mathSelectionByKey.get(key) || null;
      const activePage = nextField.closest?.('.board-practice-page-object');
      const activeCard = nextField.closest?.('.board-solver-task');
      const activeFormula = nextField.closest?.('.board-formula');
      if (activePage?.dataset?.boardPracticeId) setActiveBoardPractice(activePage.dataset.boardPracticeId, { save: false });
      else if (activeCard?.dataset?.boardTaskId) setActiveBoardTask(activeCard.dataset.boardTaskId, { save: false });
      else if (activeFormula?.dataset?.formulaId) setActiveBoardObject('formula', activeFormula.dataset.formulaId, { save: false });
      nextField.classList.add('math-field-is-active');
      setMathFieldEditing(nextField, true);
      if (options.restoreSelection !== false) restoreMathFieldSelection(nextField);
      if (options.ensureVisible !== false) ensureMathFieldVisible(nextField, { immediate: options.immediate });
    } else if (!options.retainSession) {
      mathEditSession.key = '';
      mathEditSession.context = '';
      mathEditSession.selection = null;
      mathEditSession.field = null;
      mathEditSession.restorePending = false;
    }
    updateMathToolbarUi();
  }

  // P1.7.9.49-M2.10: MathLive lauko branduolys lieka board-math-field.js,
  // o matematikos juostos kategorijos / įterpimo semantika iškelta į
  // board-math-toolbar.js.
  const boardMathFieldEngine = BoardMathField.createEngine({
    deps: {
      formatNumber,
      precedence,
      parseEquation,
      parseSolutionSetInput,
      formatSupportedRoot,
      parseExpression
    },
    hooks: {
      captureMathFieldSelection,
      ensureMathFieldVisible,
      registerMathField,
      reaffirmMathEditSession,
      scheduleMathFieldPreview,
      renderMathFieldPreview,
      updateMathToolbarUi,
      setActiveDirectMathField,
      mixedEditorFromNode,
      clearMathEditSession,
      placeTextCaretAfter,
      placeTextCaretBefore,
      getActiveDirectMathField: () => activeDirectMathField
    }
  });

  function normalizeMathLiveAscii(value) { return boardMathFieldEngine.normalizeMathLiveAscii(value); }
  function readDirectMathField(field) { return boardMathFieldEngine.readDirectMathField(field); }
  function rawDirectMathLatex(field) { return boardMathFieldEngine.rawDirectMathLatex(field); }
  function scanVbeVectors(latex) { return boardMathFieldEngine.scanVbeVectors(latex); }
  function findInsertedVbeVectorIndex(beforeLatex, afterLatex) { return boardMathFieldEngine.findInsertedVbeVectorIndex(beforeLatex, afterLatex); }
  function clearVbeVectorPromptState(field) { return boardMathFieldEngine.clearVbeVectorPromptState(field); }
  function unwrapVbeVectorPrompts(latex) { return boardMathFieldEngine.unwrapVbeVectorPrompts(latex); }
  function finalizeVbeVectorPrompts(field) { return boardMathFieldEngine.finalizeVbeVectorPrompts(field); }
  function beginVbeVectorDeletion(field) { return boardMathFieldEngine.beginVbeVectorDeletion(field); }
  function finishVbeVectorDeletion(field) { return boardMathFieldEngine.finishVbeVectorDeletion(field); }
  function readDirectMathLatex(field) { return boardMathFieldEngine.readDirectMathLatex(field); }
  function isVbeVectorToolbarExitOperator(insert) { return boardMathFieldEngine.isVbeVectorToolbarExitOperator(insert); }
  function exitActiveVbeVectorPrompt(field) { return boardMathFieldEngine.exitActiveVbeVectorPrompt(field); }
  function moveMathPlaceholderOrField(field, direction) { return boardMathFieldEngine.moveMathPlaceholderOrField(field, direction); }
  function createDirectMathField(options = {}) { return boardMathFieldEngine.createDirectMathField(options); }

  const boardMathToolbarEngine = BoardMathToolbar.createEngine({
    refs,
    state,
    mathSelectionByKey,
    hooks: {
      resolveActiveMathField,
      clearMathEditSession,
      showToast,
      captureMathFieldSelection,
      mathFieldKey,
      restoreMathFieldSelection,
      setActiveDirectMathField,
      mathSelectionHasContent,
      rawDirectMathLatex,
      isVbeVectorToolbarExitOperator,
      exitActiveVbeVectorPrompt,
      beginVbeVectorDeletion,
      finishVbeVectorDeletion,
      moveMathPlaceholderOrField,
      findInsertedVbeVectorIndex,
      scanVbeVectors,
      clearVbeVectorPromptState,
      reaffirmMathEditSession,
      ensureMathFieldVisible,
      getActiveMathContext: () => activeMathContext,
      getActiveMixedTextEditor: () => activeMixedTextEditor,
      activateExplicitMathMode,
      toolbarTextRangeForMixedEditor,
      deactivateMathForMixedTextRange,
      resolveMixedMathTarget,
      scheduleSave
    }
  });

  function insertIntoDirectMathField(field, key) { return boardMathToolbarEngine.insertIntoDirectMathField(field, key); }
  function scheduleUniversalMathKeyboardPageLayout() { return boardMathToolbarEngine.scheduleUniversalMathKeyboardPageLayout(); }
  function initializeUniversalMathKeyboard() { return boardMathToolbarEngine.initializeUniversalMathKeyboard(); }

  // P1.7.9.49-M2.10: matematikos juostos kategorijos, klavišai, įterpimo
  // komandos ir puslapiavimas iškelti į board-math-toolbar.js.

  function installMathEditingBoundary() {
    // P2.4.7.7.9.4 – fizinės klaviatūros „*“ perimame CAPTURE fazėje,
    // dar prieš įvykiui pasiekiant MathLive Shadow DOM / vidinius keydown handlerius.
    // Ankstesnėse versijose perėmimas buvo pačiame <math-field> bubble etape, todėl
    // MathLive spėdavo įterpti savo „*“ ženklą, o mūsų kodas po to dar įterpdavo \cdot.
    // Rezultatas – du taškai. Dabar natyvus „*“ apskritai nepasiekia MathLive, o
    // vienintelis įterpimas eina tuo pačiu keliu kaip Matematikos juostos „·“.
    document.addEventListener('keydown', event => {
      if (event.key !== '*' || event.isComposing || event.ctrlKey || event.altKey || event.metaKey) return;
      const field = mathFieldFromEvent(event)
        || (document.activeElement?.matches?.('math-field.direct-math-field') ? document.activeElement : null);
      if (!field) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      field.__vbePhysicalStarCaptureAt = performance.now();
      insertIntoDirectMathField(field, { label: '·', insert: '\\cdot ' });
    }, true);

    // Kai platforma siunčia beforeinput be patikimo keydown (pvz. kai kurios ekraninės
    // klaviatūros), taip pat užblokuojame natyvų „*“. Jei prieš akimirką jį jau
    // apdorojome keydown CAPTURE fazėje, nieko antro neįterpiame.
    document.addEventListener('beforeinput', event => {
      if (event.isComposing || event.inputType !== 'insertText' || event.data !== '*') return;
      const field = mathFieldFromEvent(event)
        || (document.activeElement?.matches?.('math-field.direct-math-field') ? document.activeElement : null);
      if (!field) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const handledAt = Number(field.__vbePhysicalStarCaptureAt || 0);
      if (!handledAt || performance.now() - handledAt > 160) {
        field.__vbePhysicalStarCaptureAt = performance.now();
        insertIntoDirectMathField(field, { label: '·', insert: '\\cdot ' });
      }
    }, true);

    document.addEventListener('pointerdown', event => {
      const field = mathFieldFromEvent(event);
      if (field) {
        reaffirmMathEditSession(field, field.dataset.mathContext || activeMathContext, { ensureVisible: false });
        return;
      }
      if (eventTouchesMathToolbar(event)) return;

      // P2-SPLIT-P2.3.2: aktyvus MathLive laukas parodo universalią matematikos juostą.
      // Jei ją paslepiame jau pointerdown metu, visas P2 maketas pasislenka dar iki native click,
      // todėl pirmas paspaudimas ant „Šakos“, „Atsakymas“, „Pridėti eilutę“, „Tikrinti“ ir pan.
      // gali tik deaktyvuoti lauką, o ne paspausti mygtuką. P2 mokinio mygtukams sesiją uždarome
      // tik po trumpo pointer/click gesto lango. Jei pats veiksmas perrenderino ir sufokusavo naują
      // MathLive lauką, jo neliečiame.
      const path = eventComposedPath(event);
      const p2StudentControl = path.find(node => node?.matches?.('#p2StudentPanel button:not(:disabled)')) || null;
      if (p2StudentControl && activeDirectMathField?.isConnected) {
        const fieldAtPointerDown = activeDirectMathField;
        window.setTimeout(() => {
          const current = activeDirectMathField?.isConnected ? activeDirectMathField : null;
          if (!current || current === fieldAtPointerDown) clearMathEditSession();
        }, 180);
        return;
      }

      clearMathEditSession();
    }, true);

    // Shadow DOM viduje kilę focus / įvesties įvykiai gali būti peradresuoti į host elementą.
    // composedPath() leidžia neprarasti aktyvaus lauko net ir Android Chrome naršyklėje.
    document.addEventListener('focusin', event => {
      const field = mathFieldFromEvent(event);
      if (field) reaffirmMathEditSession(field, field.dataset.mathContext || activeMathContext, { ensureVisible: true });
    }, true);
    document.addEventListener('beforeinput', event => {
      const field = mathFieldFromEvent(event) || (document.activeElement?.matches?.('math-field.direct-math-field') ? document.activeElement : null);
      if (field) reaffirmMathEditSession(field, field.dataset.mathContext || activeMathContext, { ensureVisible: false });
    }, true);
    document.addEventListener('input', event => {
      const field = mathFieldFromEvent(event) || (document.activeElement?.matches?.('math-field.direct-math-field') ? document.activeElement : null);
      if (field) reaffirmMathEditSession(field, field.dataset.mathContext || activeMathContext, { ensureVisible: false });
    }, true);

    const reaffirmAfterViewportChange = () => {
      const field = resolveActiveMathField();
      if (!field) return;
      reaffirmMathEditSession(field, field.dataset.mathContext || activeMathContext, { ensureVisible: false });
      normalizeMathFieldRendering(field);
      ensureMathFieldVisible(field, { immediate: true });
    };
    window.visualViewport?.addEventListener('resize', reaffirmAfterViewportChange);
    window.visualViewport?.addEventListener('scroll', reaffirmAfterViewportChange);
  }


  // -------------------- Response renderer registry --------------------

  function renderSingleMathInput(task, response) {
    const section = document.createElement('section');
    section.className = 'single-response direct-math-response workbook-single-response';
    section.dataset.renderer = task.response.renderer;

    const answerLine = document.createElement('div');
    answerLine.className = 'workbook-answer-line';
    const label = document.createElement('span');
    label.className = 'answer-label';
    label.textContent = task.response.label || 'Atsakymas';
    const field = createDirectMathField({
      source: response.answer || '',
      latexSource: response.answerLatex || '',
      kind: 'expression',
      fieldKey: `main:${task.id}:answer`,
      testid: 'single-answer',
      placeholder: task.response.placeholder || 'Įrašyk atsakymą',
      contextLabel: 'Pratybų atsakymo laukas',
      onCommit: (plain, latex) => {
        response.answer = plain;
        response.answerLatex = latex;
        invalidateTaskResult(task.id);
        scheduleSave();
      },
      onEnter: () => {
        field.blur();
        window.setTimeout(() => runValidatorForTask(task.id), 0);
      }
    });
    field.classList.add('single-direct-math-field');
    answerLine.append(label, field);
    section.appendChild(answerLine);

    const actions = document.createElement('div');
    actions.className = 'workbook-check-row';
    const checkButton = document.createElement('button');
    checkButton.className = 'primary-button workbook-check-button';
    checkButton.dataset.testid = 'check-single';
    checkButton.type = 'button';
    checkButton.textContent = 'Patikrinti';
    checkButton.addEventListener('pointerdown', () => field.blur());
    checkButton.addEventListener('click', () => window.setTimeout(() => runCurrentValidator(), 0));
    actions.appendChild(checkButton);
    section.appendChild(actions);
    refs.responseHost.appendChild(section);
  }

  function renderMathStepList(task, response) {
    response.steps = normalizeStructuredSteps(response.steps);
    const section = document.createElement('section');
    section.className = 'steps-response workbook-solution';
    section.dataset.renderer = task.response.renderer;

    const heading = document.createElement('div');
    heading.className = 'steps-heading workbook-solution-heading';
    heading.innerHTML = `
      <div>
        <span class="answer-label">${escapeHtml(task.response.label || 'Sprendimas')}</span>
      </div>
      <span class="solution-enter-hint"><kbd>Enter</kbd> – nauja eilutė</span>
    `;
    section.appendChild(heading);

    const list = document.createElement('div');
    list.className = 'steps-list workbook-steps-list';
    list.dataset.testid = 'steps-list';
    section.appendChild(list);

    response.steps.forEach((step, index) => list.appendChild(createStepRow(task, response, index, step)));

    const actions = document.createElement('div');
    actions.className = 'steps-actions workbook-solution-actions';
    actions.innerHTML = `
      <button type="button" class="workbook-add-line add-step-button" data-testid="add-step">＋ Pridėti eilutę</button>
      <button type="button" class="primary-button check-solution-button workbook-check-button" data-testid="check-steps">Patikrinti sprendimą</button>
    `;
    section.appendChild(actions);

    actions.querySelector('.add-step-button').addEventListener('click', () => {
      response.steps.push(createStructuredStep());
      invalidateTaskResult(task.id);
      renderTask();
      requestAnimationFrame(() => {
        const inputs = refs.responseHost.querySelectorAll('.direct-math-field');
        inputs[inputs.length - 1]?.focus();
      });
    });
    actions.querySelector('.check-solution-button').addEventListener('click', () => {
      document.activeElement?.blur();
      window.setTimeout(() => runValidatorForTask(task.id), 0);
    });

    refs.responseHost.appendChild(section);
    applyStepResultState(state.results[task.id]);
  }

  function createStepRow(task, response, index, rawStep) {
    const step = normalizeStructuredStep(rawStep);
    response.steps[index] = step;
    const row = document.createElement('div');
    row.className = `solution-step workbook-step step-type-${step.type}`;
    row.dataset.stepIndex = String(index);
    row.innerHTML = `
      <span class="step-index" aria-hidden="true">${index + 1}.</span>
      <div class="step-entry">
        <div class="step-fields"></div>
        <div class="step-context-actions" role="toolbar" aria-label="${index + 1} sprendimo eilutės veiksmai">
          <button class="step-context-button make-equation-button" type="button" title="Viena sprendimo eilutė" aria-label="Viena sprendimo eilutė" data-label="Viena eilutė">=</button>
          <button class="step-context-button make-branches-button" type="button" title="Išskaidyti į sprendimo šakas" aria-label="Išskaidyti į sprendimo šakas" data-label="Šakos">⑂</button>
          <button class="step-context-button make-answer-button" type="button" title="Rašyti galutinį atsakymą" aria-label="Rašyti galutinį atsakymą" data-label="Atsakymas">∈</button>
          <button class="step-context-button remove-step-button" type="button" title="Pašalinti eilutę" aria-label="Pašalinti ${index + 1} sprendimo eilutę" data-label="Pašalinti">×</button>
        </div>
        <p class="step-message"></p>
      </div>
      <span class="step-state" aria-hidden="true"></span>
    `;
    const fields = row.querySelector('.step-fields');
    const remove = row.querySelector('.remove-step-button');
    const equationButton = row.querySelector('.make-equation-button');
    const branchesButton = row.querySelector('.make-branches-button');
    const answerButton = row.querySelector('.make-answer-button');
    remove.disabled = response.steps.length === 1;

    const commit = () => {
      response.steps[index] = normalizeStructuredStep(step);
      invalidateTaskResult(task.id);
      clearStepRowState(row);
      scheduleSave();
    };

    const focusNextStep = () => {
      if (index === response.steps.length - 1) response.steps.push(createStructuredStep());
      invalidateTaskResult(task.id);
      renderTask();
      requestAnimationFrame(() => refs.responseHost.querySelector(`[data-testid="step-input-${Math.min(index + 1, response.steps.length - 1)}"]`)?.focus());
    };

    const setStepType = type => {
      if (step.type === type) return;
      const previousValues = [...step.values];
      const previousLatexValues = [...(step.latexValues || [])];
      step.type = type;
      step.values = type === 'alternatives'
        ? [previousValues[0] || '', previousValues[1] || '']
        : [previousValues[0] || ''];
      step.latexValues = type === 'alternatives'
        ? [previousLatexValues[0] || '', previousLatexValues[1] || '']
        : [previousLatexValues[0] || ''];
      commit();
      renderFields();
      requestAnimationFrame(() => fields.querySelector('.direct-math-field')?.focus());
    };

    const renderFields = () => {
      fields.replaceChildren();
      row.className = `solution-step workbook-step step-type-${step.type}`;
      equationButton.hidden = step.type === 'equation';
      branchesButton.hidden = step.type === 'alternatives';
      answerButton.hidden = step.type === 'solution-set';
      const commitValue = (branchIndex, plain, latex) => {
        step.values[branchIndex] = plain;
        if (!Array.isArray(step.latexValues)) step.latexValues = [];
        step.latexValues[branchIndex] = latex;
        response.steps[index] = normalizeStructuredStep(step);
        invalidateTaskResult(task.id);
        clearStepRowState(row);
        scheduleSave();
      };

      if (step.type === 'alternatives') {
        const branches = document.createElement('div');
        branches.className = 'branch-fields workbook-branch-fields';
        step.values.forEach((value, branchIndex) => {
          if (branchIndex) {
            const separator = document.createElement('span');
            separator.className = 'branch-separator';
            separator.textContent = 'arba';
            branches.appendChild(separator);
          }
          const branch = document.createElement('div');
          branch.className = 'branch-field';
          const field = createDirectMathField({
            source: value,
            latexSource: step.latexValues?.[branchIndex] || '',
            kind: 'equation',
            fieldKey: `main:${task.id}:step:${index}:branch:${branchIndex}`,
            testid: branchIndex === 0 ? `step-input-${index}` : `step-input-${index}-${branchIndex}`,
            placeholder: branchIndex === 0 ? 'Pirmas atvejis' : 'Kitas atvejis',
            contextLabel: `Pratybų ${index + 1} eilutės ${branchIndex + 1} sprendimo šaka`,
            onCommit: (plain, latex) => commitValue(branchIndex, plain, latex),
            onEnter: () => {
              const next = branches.querySelector(`[data-testid="step-input-${index}-${branchIndex + 1}"]`);
              if (next) next.focus(); else focusNextStep();
            }
          });
          field.classList.add('step-input', 'branch-input');
          const removeBranch = document.createElement('button');
          removeBranch.type = 'button';
          removeBranch.className = 'remove-branch-button';
          removeBranch.textContent = '×';
          removeBranch.disabled = step.values.length <= 2;
          removeBranch.setAttribute('aria-label', `Pašalinti ${branchIndex + 1} sprendimo šaką`);
          removeBranch.addEventListener('click', () => {
            if (step.values.length <= 2) return;
            step.values.splice(branchIndex, 1);
            step.latexValues?.splice(branchIndex, 1);
            response.steps[index] = normalizeStructuredStep(step);
            invalidateTaskResult(task.id);
            scheduleSave();
            renderFields();
          });
          branch.append(field, removeBranch);
          branches.appendChild(branch);
        });
        fields.appendChild(branches);
        const addBranch = document.createElement('button');
        addBranch.type = 'button';
        addBranch.className = 'add-branch-button workbook-add-branch';
        addBranch.textContent = '＋ Dar viena šaka';
        addBranch.addEventListener('click', () => {
          step.values.push('');
          if (!Array.isArray(step.latexValues)) step.latexValues = [];
          step.latexValues.push('');
          response.steps[index] = normalizeStructuredStep(step);
          invalidateTaskResult(task.id);
          scheduleSave();
          renderFields();
          requestAnimationFrame(() => fields.querySelector(`[data-testid="step-input-${index}-${step.values.length - 1}"]`)?.focus());
        });
        fields.appendChild(addBranch);
      } else {
        if (step.type === 'solution-set') {
          const prefix = document.createElement('span');
          prefix.className = 'solution-set-prefix';
          prefix.textContent = 'Atsakymas';
          fields.appendChild(prefix);
        }
        const field = createDirectMathField({
          source: step.values[0] || '',
          latexSource: step.latexValues?.[0] || '',
          kind: step.type === 'solution-set' ? 'solution-set' : 'equation',
          fieldKey: `main:${task.id}:step:${index}:value`,
          testid: `step-input-${index}`,
          placeholder: step.type === 'solution-set' ? 'Sprendinių aibė' : (task.response.placeholder || 'Kita lygtis'),
          contextLabel: step.type === 'solution-set' ? 'Pratybų galutinis atsakymas' : `Pratybų ${index + 1} sprendimo eilutė`,
          onCommit: (plain, latex) => commitValue(0, plain, latex),
          onEnter: focusNextStep
        });
        field.classList.add('step-input');
        fields.appendChild(field);
      }
    };

    equationButton.addEventListener('click', () => setStepType('equation'));
    branchesButton.addEventListener('click', () => setStepType('alternatives'));
    answerButton.addEventListener('click', () => setStepType('solution-set'));
    remove.addEventListener('click', () => {
      if (response.steps.length <= 1) return;
      response.steps.splice(index, 1);
      invalidateTaskResult(task.id);
      renderTask();
    });
    row.addEventListener('focusin', () => row.classList.add('is-active'));
    row.addEventListener('focusout', () => requestAnimationFrame(() => {
      if (!row.contains(document.activeElement)) row.classList.remove('is-active');
    }));
    renderFields();
    return row;
  }

  function clearStepRowState(row) {
    row.classList.remove('is-correct', 'is-error', 'is-warning');
    row.querySelector('.step-state').textContent = '';
    row.querySelector('.step-message').textContent = '';
  }

  function applyStepResultState(result) {
    const rows = refs.responseHost.querySelectorAll('.solution-step:not(.is-start)');
    rows.forEach(clearStepRowState);
    if (!result || !Array.isArray(result.stepResults)) return;
    result.stepResults.forEach((stepResult, index) => {
      const row = refs.responseHost.querySelector(`.solution-step[data-step-index="${index}"]`);
      if (!row || !stepResult) return;
      row.classList.toggle('is-correct', stepResult.status === 'correct');
      row.classList.toggle('is-error', stepResult.status === 'incorrect');
      row.classList.toggle('is-warning', stepResult.status === 'warning');
      row.querySelector('.step-state').textContent = stepResult.status === 'correct' ? '✓' : stepResult.status === 'warning' ? '!' : '×';
      row.querySelector('.step-message').textContent = stepResult.message || '';
    });
  }

  function sourceUsesMixedNumberNotation(source) {
    const value = String(source || '').replace(/\u2212/g, '-');
    return /(?:^|[^\d])[-+]?\d+\s+\d+\s*(?:\/|:)\s*\d+(?![\d])/u.test(value);
  }

  function responseUsesRequiredAnswerForm(task, response) {
    if (!taskRequiresMixedNumber(task)) return true;
    if (task.response.renderer === 'single-math-input') return sourceUsesMixedNumberNotation(response?.answer);
    const steps = trimStructuredSteps(response?.steps);
    if (!steps.length) return false;
    const last = normalizeStructuredStep(steps[steps.length - 1]);
    return last.values.some(sourceUsesMixedNumberNotation);
  }

  function responseHasMeaningfulContent(task, response) {
    if (task?.response?.renderer === 'single-math-input') return Boolean(String(response?.answer || '').trim());
    return trimStructuredSteps(response?.steps).some(stepHasContent);
  }

  function assessmentCriterion(task, type, fallback = {}) {
    const criteria = Array.isArray(task?.assessment?.criteria) ? task.assessment.criteria : [];
    return criteria.find(item => item.type === type) || normalizeAssessmentCriterion({
      id: fallback.id || type,
      type,
      role: fallback.role || 'secondary',
      label: fallback.label || 'Papildoma užduoties sąlyga'
    });
  }

  function criterionResult(criterion, status, message) {
    return {
      id: criterion.id,
      type: criterion.type,
      role: criterion.role,
      label: criterion.label,
      status,
      passed: status === 'passed',
      message: String(message || '')
    };
  }

  function classifyBaseValidatorResult(task, baseResult) {
    const mathCriterion = assessmentCriterion(task, 'validator', {
      id: 'mathematical-correctness',
      role: 'primary',
      label: task?.prompt?.kind === 'equation' ? 'Teisingas lygties sprendinys' : 'Teisinga matematinė reikšmė'
    });
    const results = [];
    if (baseResult.status === 'correct') {
      results.push(criterionResult(mathCriterion, 'passed', baseResult.message));
      return results;
    }
    if (baseResult.status === 'incorrect') {
      results.push(criterionResult(mathCriterion, 'failed', baseResult.message || baseResult.title));
      return results;
    }

    const title = String(baseResult.title || '').toLocaleLowerCase('lt-LT');
    if (title.includes('sprendimas dar neužbaigtas')) {
      results.push(criterionResult(mathCriterion, 'failed', baseResult.message || 'Sprendimas neužbaigtas.'));
      return results;
    }

    results.push(criterionResult(mathCriterion, 'passed', 'Pagrindinis matematinis rezultatas teisingas.'));
    if (title.includes('trūksta sprendimo eigos')) {
      const criterion = assessmentCriterion(task, 'minimum-steps', {
        id: 'solution-steps', role: 'secondary', label: 'Parodyta reikalaujama sprendimo eiga'
      });
      results.push(criterionResult(criterion, 'failed', baseResult.message));
    } else if (title.includes('dar galima paprastinti')) {
      const criterion = assessmentCriterion(task, 'simplified-form', {
        id: 'simplified-form', role: 'secondary', label: 'Atsakymas pakankamai supaprastintas'
      });
      results.push(criterionResult(criterion, 'failed', baseResult.message));
    } else {
      const criterion = normalizeAssessmentCriterion({
        id: 'additional-requirement', type: 'additional-requirement', role: 'secondary', label: 'Papildomas užduoties reikalavimas'
      });
      results.push(criterionResult(criterion, 'failed', baseResult.message || baseResult.title));
    }
    return results;
  }

  function applyRequiredFormStepState(task, result, formCriterionResult) {
    if (!formCriterionResult || formCriterionResult.status !== 'failed' || task?.response?.renderer !== 'math-step-list') return;
    if (!Array.isArray(result.stepResults) || !result.stepResults.length) return;
    const last = result.stepResults.length - 1;
    const existing = result.stepResults[last];
    if (existing?.status === 'incorrect') return;
    result.stepResults[last] = {
      status: formCriterionResult.role === 'primary' ? 'incorrect' : 'warning',
      message: formCriterionResult.message
    };
  }

  function applyAssessmentCriteria(task, response, baseResult) {
    upgradeTaskRequirements(task);
    const result = {
      ...baseResult,
      ...(Array.isArray(baseResult.stepResults) ? { stepResults: baseResult.stepResults.map(item => item ? { ...item } : item) } : {}),
      assessmentVersion: 1
    };
    const criteriaResults = classifyBaseValidatorResult(task, baseResult);

    const formCriterion = taskRequiresMixedNumber(task)
      ? assessmentCriterion(task, 'required-answer-form', {
          id: 'mixed-number-form',
          role: taskIsMixedNumberTransformation(task) ? 'primary' : 'secondary',
          label: taskIsMixedNumberTransformation(task) ? 'Trupmena perrašyta mišriuoju skaičiumi' : 'Atsakymas pateiktas mišriuoju skaičiumi'
        })
      : null;

    if (formCriterion && responseHasMeaningfulContent(task, response)) {
      const expected = task?.response?.options?.expectedDisplay || '2 1/3';
      const passed = responseUsesRequiredAnswerForm(task, response);
      const message = passed
        ? 'Atsakymo forma atitinka užduoties sąlygą.'
        : taskIsMixedNumberTransformation(task)
          ? `Atsakymas neperrašytas mišriuoju skaičiumi. Įrašyk mišrųjį skaičių, pavyzdžiui, ${expected}.`
          : `Galutinis atsakymas nepateiktas mišriuoju skaičiumi. Įrašyk, pavyzdžiui, ${expected}.`;
      const formResult = criterionResult(formCriterion, passed ? 'passed' : 'failed', message);
      criteriaResults.push(formResult);
      applyRequiredFormStepState(task, result, formResult);
    }

    const failedPrimary = criteriaResults.filter(item => item.status === 'failed' && item.role === 'primary');
    const failedSecondary = criteriaResults.filter(item => item.status === 'failed' && item.role === 'secondary');
    const failed = [...failedPrimary, ...failedSecondary];
    result.criteriaResults = criteriaResults;

    if (!failed.length) return result;

    if (failedPrimary.length) {
      result.status = 'incorrect';
      result.title = failed.length > 1 ? 'Neįvykdytos kelios užduoties sąlygos' : (baseResult.status === 'incorrect' ? baseResult.title : 'Užduotis neatlikta');
    } else {
      result.status = 'warning';
      result.title = 'Pagrindinė sąlyga įvykdyta, bet liko papildomų reikalavimų';
    }
    result.message = failed.map(item => item.message).filter(Boolean).join(' ');
    return result;
  }


  // -------------------- Validator registry --------------------

  function runCurrentValidator() {
    runValidatorForTask(currentTask().id);
  }

  function runValidatorForTask(taskId) {
    const task = tasks.find(candidate => candidate.id === taskId);
    if (!task) return;
    const validator = validators[task.response.validator];
    if (!validator) {
      setTaskResult(task, { status: 'incorrect', title: 'Trūksta tikrintuvo', message: `Neužregistruotas modulis „${task.response.validator}“.` });
      return;
    }
    const baseResult = validator(task, state.responses[task.id]);
    const result = applyAssessmentCriteria(task, state.responses[task.id], baseResult);
    setTaskResult(task, result);
  }

  function setTaskResult(task, result) {
    state.results[task.id] = { ...result, checkedSnapshot: responseSnapshot(state.responses[task.id]), assessmentVersion: 1 };
    if (currentTask().id === task.id) {
      renderFeedback(state.results[task.id]);
      applyStepResultState(state.results[task.id]);
    }
    renderProgress();
    renderTaskDots();
    scheduleSave();
  }

  function validateExpressionResponse(task, response) {
    const input = String(response.answer || '').trim();
    if (!input) return { status: 'incorrect', title: 'Nėra atsakymo', message: 'Pirmiausia įrašyk reiškinį.' };

    let candidate;
    let expected;
    try {
      candidate = parseExpression(input);
      expected = parseExpression(task.response.options.expected);
    } catch (error) {
      return { status: 'incorrect', title: 'Nepavyko perskaityti reiškinio', message: `${friendlyParseError(error)} Patikrink skliaustus ir veiksmų ženklus.` };
    }

    const comparison = compareExpressions(candidate, expected, task.response.options.samples || [-7, -2, 0, 1, 3, 8]);
    if (!comparison.equivalent) {
      return { status: 'incorrect', title: 'Reiškiniai nėra lygiaverčiai', message: comparison.message };
    }

    const expectedDisplay = task.response.options.expectedDisplay || task.response.options.expected;
    if (task.response.options.requireSimplified && astComplexity(simplifyAst(candidate)) > astComplexity(simplifyAst(expected)) + 2) {
      return {
        status: 'warning',
        title: 'Lygiavertis, bet dar galima paprastinti',
        message: `Reiškinys matematiškai tinka, tačiau galutinę formą dar galima sutvarkyti iki ${expectedDisplay}.`
      };
    }

    return {
      status: 'correct',
      title: 'Teisingai',
      message: `Atsakymas lygiavertis ${expectedDisplay}. Atsižvelgiama į pradinę sąlygą ${task.response.options.domain}.`
    };
  }

  function stepHasContent(step) {
    return normalizeStructuredStep(step).values.some(value => String(value || '').trim());
  }

  function trimStructuredSteps(steps) {
    const normalized = normalizeStructuredSteps(steps);
    let last = -1;
    normalized.forEach((step, index) => { if (stepHasContent(step)) last = index; });
    return last < 0 ? [] : normalized.slice(0, last + 1);
  }

  // P2-SPLIT-P2.4.7.17: lygybės tęsinys naujoje eilutėje.
  // Mokinys gali rašyti, pvz. D=b^2-4ac, tada naujoje eilutėje =49-48 ir =1.
  // Validatorius mato pilną lygybę D=49-48 / D=1, tačiau UI palieka natūralų "=" tęsinį.
  function continuationAnchorFromSource(source) {
    const text = String(source || '').trim();
    if (!text || text.startsWith('=') || /;/.test(text)) return '';
    let parts;
    try { parts = splitTopLevelEqualities(text); } catch (_) { return ''; }
    if (!Array.isArray(parts) || parts.length < 2) return '';
    if (parts.length > 2 && /,/.test(text)) return ''; // keli priskyrimai vienoje eilutėje, ne tęstinė lygybė
    const anchor = String(parts[0] || '').trim();
    return anchor && !/;/.test(anchor) ? anchor : '';
  }

  function resolveStructuredStepContinuations(steps) {
    const normalized = normalizeStructuredSteps(steps);
    let equationAnchor = '';
    let branchGroupId = '';
    let branchAnchors = [];
    let branchLastSources = [];

    return normalized.map(step => {
      const current = normalizeStructuredStep(step);
      if (current.type === 'alternatives') {
        const groupId = String(current.branchGroupId || '').trim();
        const continuingGroup = Boolean(groupId && groupId === branchGroupId);
        if (!continuingGroup) {
          branchGroupId = groupId;
          branchAnchors = [];
          branchLastSources = [];
        }
        equationAnchor = '';
        const values = current.values.map((rawValue, index) => {
          const raw = String(rawValue || '').trim();
          let resolved = raw;
          if (raw.startsWith('=') && branchAnchors[index]) {
            resolved = `${branchAnchors[index]}${raw}`;
          }
          if (resolved) {
            branchLastSources[index] = resolved;
            const nextAnchor = continuationAnchorFromSource(resolved);
            if (nextAnchor) branchAnchors[index] = nextAnchor;
          }
          return resolved;
        });
        return createStructuredStep('alternatives', values, current.latexValues, { branchGroupId: groupId });
      }

      branchGroupId = '';
      branchAnchors = [];
      branchLastSources = [];
      if (current.type !== 'equation') {
        equationAnchor = '';
        return current;
      }

      const raw = String(current.values[0] || '').trim();
      const resolved = raw.startsWith('=') && equationAnchor ? `${equationAnchor}${raw}` : raw;
      const nextAnchor = continuationAnchorFromSource(resolved);
      if (nextAnchor) equationAnchor = nextAnchor;
      else if (raw && !raw.startsWith('=')) equationAnchor = '';
      return createStructuredStep('equation', [resolved], current.latexValues);
    });
  }

  function descriptorFromRootValues(values) {
    const unique = [];
    [...values].sort((a, b) => a - b).forEach(value => {
      if (!unique.some(existing => Math.abs(existing - value) <= EPSILON * Math.max(1, Math.abs(existing), Math.abs(value)))) unique.push(value);
    });
    if (!unique.length) return { kind: 'none', degree: 0, rootsSupported: true };
    if (unique.length === 1) return { kind: 'single', degree: 0, value: unique[0], rootsSupported: true };
    return { kind: 'two', degree: 0, values: unique, rootsSupported: unique.length <= 2 };
  }

  function unionEquationDescriptors(descriptors) {
    if (descriptors.some(descriptor => descriptor.kind === 'all')) return { kind: 'all', degree: 0, rootsSupported: true };
    return descriptorFromRootValues(descriptors.flatMap(descriptorRoots));
  }

  function parseAlternativeDescriptor(step, linearOnly = false) {
    const normalized = normalizeStructuredStep(step);
    if (normalized.type !== 'alternatives') throw new Error('Šis žingsnis nėra alternatyvų eilutė');
    if (normalized.values.some(value => !String(value || '').trim())) throw new Error('Užpildyk visas alternatyvias lygtis');
    const equations = normalized.values.map(value => parseEquation(value));
    const descriptors = equations.map(equation => linearOnly ? describeLinearEquation(equation) : describePolynomialEquation(equation));
    return { descriptor: unionEquationDescriptors(descriptors), descriptors, equations };
  }

  // 7.17: vertikaliose šakose viena šaka gali turėti daugiau tarpinių eilučių už kitą.
  // Tuščias tos pačios branchGroup eilutės stulpelis reiškia „ši šaka šiame žingsnyje nepakito“.
  function parseAlternativeDescriptorWithCarry(step, linearOnly = false, previousEquations = null) {
    const normalized = normalizeStructuredStep(step);
    if (normalized.type !== 'alternatives') throw new Error('Šis žingsnis nėra alternatyvų eilutė');
    const equations = normalized.values.map((value, index) => {
      const source = String(value || '').trim();
      if (source) return parseEquation(source);
      if (Array.isArray(previousEquations) && previousEquations[index]) return previousEquations[index];
      throw new Error('Užpildyk bent pirmą kiekvienos naujos sprendimo šakos eilutę');
    });
    const descriptors = equations.map(equation => linearOnly ? describeLinearEquation(equation) : describePolynomialEquation(equation));
    return { descriptor: unionEquationDescriptors(descriptors), descriptors, equations };
  }

  // P2-SPLIT-P2.4.7.16: semantinis koeficientų žingsnis priima kelis priskyrimus vienoje eilutėje (pvz. a=1, b=-7, c=12).
  // P2-SPLIT-P2.4.7.15: pirmasis semantinio sprendimo žingsnio modelis.
  // Ekvivalentiška lygtis yra tik vienas sprendimo žingsnio tipas. Diskriminanto
  // kelyje leidžiame ir pagalbinius dydžius (a, b, c, D) bei formulės taikymą,
  // kurie neturi atskiros sprendinių aibės ir todėl negali būti tikrinami kaip lygtis x atžvilgiu.
  function splitTopLevelEqualities(source) {
    const input = normalizeMathLiveAscii(source);
    const parts = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if (char === '(') depth += 1;
      else if (char === ')') depth -= 1;
      if (depth < 0) throw new Error('Parse error: uždarytas skliaustas neturi poros');
      if (char === '=' && depth === 0) {
        parts.push(input.slice(start, index).trim());
        start = index + 1;
      }
    }
    if (depth !== 0) throw new Error('Parse error: neuždaryti skliaustai');
    parts.push(input.slice(start).trim());
    return parts;
  }

  function quadraticContextFromInitialEquation(initialEquation, targetDescriptor) {
    const polynomial = equationPolynomial(initialEquation);
    const coefficients = {
      a: Number(polynomial[2] || 0),
      b: Number(polynomial[1] || 0),
      c: Number(polynomial[0] || 0)
    };
    const discriminant = coefficients.b * coefficients.b - 4 * coefficients.a * coefficients.c;
    return {
      targetDescriptor,
      coefficients,
      discriminant,
      seenCoefficients: new Set(),
      seenDiscriminant: false,
      semanticSteps: []
    };
  }

  function formatSemanticNumber(value) {
    return formatSupportedRoot(value);
  }

  function expandCompactQuadraticSymbols(source) {
    let result = String(source || '').toLowerCase().replace(/√/g, 'sqrt');
    // MathLive ASCII gali grąžinti 4ac be daugybos ženklų. Atskirame semantiniame
    // skaičiavime a, b, c ir d laikome pavieniais simboliais, todėl „ac“ -> „a*c“.
    result = result.replace(/[abcd]{2,}/g, match => match.split('').join('*'));
    result = result.replace(/(\d|\))(?=[abcd])/g, '$1*');
    result = result.replace(/([abcd])(?=\d|\()/g, '$1*');
    return result;
  }

  function replaceSemanticSqrtCalls(source, symbols, depth = 0) {
    if (depth > 12) throw new Error('Parse error: per daug įdėtų šaknų');
    let result = String(source || '');
    let guard = 0;
    while (/sqrt\s*\(/i.test(result)) {
      if (guard++ > 20) throw new Error('Parse error: nepavyko perskaityti kvadratinės šaknies');
      const lower = result.toLowerCase();
      const start = lower.lastIndexOf('sqrt(');
      const open = start + 4;
      let nesting = 0;
      let close = -1;
      for (let index = open; index < result.length; index += 1) {
        if (result[index] === '(') nesting += 1;
        else if (result[index] === ')') {
          nesting -= 1;
          if (nesting === 0) { close = index; break; }
        }
      }
      if (close < 0) throw new Error('Parse error: neuždaryta kvadratinė šaknis');
      const inner = result.slice(open + 1, close);
      const value = evaluateQuadraticSemanticNumeric(inner, symbols, depth + 1);
      const tolerance = EPSILON * Math.max(1, Math.abs(value));
      if (value < -tolerance) throw new Error('Parse error: realiųjų skaičių srityje negalima traukti šaknies iš neigiamo skaičiaus');
      const root = Math.sqrt(Math.max(0, value));
      result = `${result.slice(0, start)}(${root})${result.slice(close + 1)}`;
    }
    return result;
  }

  function evaluateQuadraticSemanticNumeric(source, symbols = {}, depth = 0) {
    let expression = expandCompactQuadraticSymbols(normalizeMathLiveAscii(source)).replace(/\s+/g, '');
    expression = replaceSemanticSqrtCalls(expression, symbols, depth);
    expression = expression.replace(/[abcd]/gi, symbol => {
      const key = symbol.toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(symbols, key) || !Number.isFinite(symbols[key])) {
        throw new Error(`Parse error: dar nežinoma ${symbol} reikšmė`);
      }
      return `(${symbols[key]})`;
    });
    const ast = parseExpression(expression);
    if (containsVariable(ast, 'x')) throw new Error('Parse error: pagalbinio dydžio reikšmėje neturi likti x');
    const value = evaluateAst(ast, {});
    if (!Number.isFinite(value)) throw new Error('Parse error: gauta nebaigtinė skaitinė reikšmė');
    return value;
  }

  function semanticNumberMatches(actual, expected) {
    return Math.abs(actual - expected) <= EPSILON * Math.max(1, Math.abs(actual), Math.abs(expected));
  }

  function splitQuadraticAuxiliaryAssignments(source) {
    const input = normalizeMathLiveAscii(source);
    const assignments = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if (char === '(') depth += 1;
      else if (char === ')') depth = Math.max(0, depth - 1);
      if (depth !== 0 || (char !== ',' && char !== ';')) continue;

      // Lietuviškas dešimtainis kablelis neturi būti laikomas priskyrimų skirtuku.
      // Skaidome tik tada, kai po kablelio / kabliataškio prasideda naujas a=, b=, c= arba D=.
      const remainder = input.slice(index + 1);
      if (!/^\s*[abcd]\s*=/i.test(remainder)) continue;
      const part = input.slice(start, index).trim();
      if (part) assignments.push(part);
      start = index + 1;
    }
    const tail = input.slice(start).trim();
    if (tail) assignments.push(tail);
    return assignments;
  }

  function classifySingleQuadraticAuxiliaryStep(source, context) {
    let parts;
    try { parts = splitTopLevelEqualities(source); }
    catch (error) { return { recognized: false, parseError: error }; }
    if (parts.length < 2) return { recognized: false };
    const left = parts[0].replace(/\s+/g, '').toLowerCase();
    if (!/^[abcd]$/.test(left)) return { recognized: false };

    const symbols = {
      ...context.coefficients,
      d: context.discriminant
    };
    const expected = left === 'd' ? context.discriminant : context.coefficients[left];
    let lastValue = null;
    try {
      for (let index = 1; index < parts.length; index += 1) {
        const value = evaluateQuadraticSemanticNumeric(parts[index], symbols);
        if (!semanticNumberMatches(value, expected)) {
          return {
            recognized: true,
            ok: false,
            semanticType: 'derived-value',
            kind: left === 'd' ? 'discriminant' : 'quadratic-coefficient',
            message: left === 'd'
              ? `Diskriminantas apskaičiuotas neteisingai. Šiai lygčiai D = ${formatSemanticNumber(expected)}.`
              : `Koeficientas ${left} nustatytas neteisingai. Šiai lygčiai ${left} = ${formatSemanticNumber(expected)}.`
          };
        }
        lastValue = value;
      }
    } catch (error) {
      return { recognized: true, ok: false, semanticType: 'derived-value', kind: left === 'd' ? 'discriminant' : 'quadratic-coefficient', message: friendlyParseError(error) };
    }

    if (left === 'd') {
      const mentionsFormulaSymbols = parts.slice(1).some(part => /[abc]/i.test(part));
      context.seenDiscriminant = true;
      context.semanticSteps.push({ semanticType: 'derived-value', kind: 'discriminant', value: expected });
      return {
        recognized: true,
        ok: true,
        semanticType: 'derived-value',
        kind: 'discriminant',
        solutionSetEffect: 'context-only',
        value: expected,
        message: mentionsFormulaSymbols
          ? `Pritaikyta diskriminanto formulė; teisingai gauta D = ${formatSemanticNumber(expected)}.`
          : `Teisingai apskaičiuotas diskriminantas: D = ${formatSemanticNumber(expected)}.`
      };
    }

    context.seenCoefficients.add(left);
    context.semanticSteps.push({ semanticType: 'derived-value', kind: 'quadratic-coefficient', symbol: left, value: expected });
    return {
      recognized: true,
      ok: true,
      semanticType: 'derived-value',
      kind: 'quadratic-coefficient',
      solutionSetEffect: 'context-only',
      value: lastValue,
      message: `Teisingai nustatytas kvadratinės lygties koeficientas ${left} = ${formatSemanticNumber(expected)}.`
    };
  }

  function classifyQuadraticAuxiliaryStep(source, context) {
    const assignments = splitQuadraticAuxiliaryAssignments(source);
    if (assignments.length <= 1) return classifySingleQuadraticAuxiliaryStep(source, context);

    const results = [];
    for (const assignment of assignments) {
      const result = classifySingleQuadraticAuxiliaryStep(assignment, context);
      if (!result.recognized) return { recognized: false };
      if (!result.ok) return result;
      results.push(result);
    }

    const coefficientResults = results.filter(result => result.kind === 'quadratic-coefficient');
    const otherResults = results.filter(result => result.kind !== 'quadratic-coefficient');
    const messages = [];
    if (coefficientResults.length) {
      const values = assignments
        .map(assignment => assignment.split('=')[0].trim().toLowerCase())
        .filter(symbol => /^[abc]$/.test(symbol))
        .map(symbol => `${symbol} = ${formatSemanticNumber(context.coefficients[symbol])}`);
      messages.push(`Teisingai nustatyti kvadratinės lygties koeficientai: ${values.join(', ')}.`);
    }
    messages.push(...otherResults.map(result => result.message));

    return {
      recognized: true,
      ok: true,
      semanticType: 'derived-value',
      kind: otherResults.length ? otherResults[otherResults.length - 1].kind : 'quadratic-coefficients',
      solutionSetEffect: 'context-only',
      message: messages.join(' ')
    };
  }

  function looksLikeQuadraticFormulaExpression(source) {
    const compact = String(source || '').replace(/\s+/g, '');
    if (/^[-+]?\d+(?:[.,]\d+)?(?:\/[-+]?\d+(?:[.,]\d+)?)?$/.test(compact)) return false;
    return /sqrt|√|[abcd]|[+\-*/^()]/i.test(compact);
  }

  function parseQuadraticFormulaRootAssignment(source, context) {
    let parts;
    try { parts = splitTopLevelEqualities(source); }
    catch (error) { return { recognized: true, ok: false, message: friendlyParseError(error) }; }
    if (parts.length < 2) return { recognized: false };
    const left = parts[0].replace(/\s+/g, '').replace(/_/g, '').replace(/[()]/g, '').toLowerCase();
    if (!/^x(?:1|2)?$/.test(left)) return { recognized: false };
    if (!parts.slice(1).some(looksLikeQuadraticFormulaExpression)) return { recognized: false };

    const symbols = { ...context.coefficients, d: context.discriminant };
    if (parts.slice(1).some(part => /\bd\b/i.test(expandCompactQuadraticSymbols(part))) && !context.seenDiscriminant) {
      return { recognized: true, ok: false, message: 'Prieš naudodamas D kvadratinės lygties formulėje pirmiausia parodyk diskriminanto skaičiavimą.' };
    }
    let value = null;
    try {
      for (let index = 1; index < parts.length; index += 1) {
        const current = evaluateQuadraticSemanticNumeric(parts[index], symbols);
        if (value !== null && !semanticNumberMatches(current, value)) {
          return { recognized: true, ok: false, message: 'Toje pačioje formulės eilutėje užrašytos skaitinės reikšmės nėra lygios.' };
        }
        value = current;
      }
    } catch (error) {
      return { recognized: true, ok: false, message: friendlyParseError(error) };
    }
    return { recognized: true, ok: true, value, lhs: left };
  }

  function syntheticRootEquation(value) {
    return {
      type: 'equation',
      left: { type: 'variable', name: 'x' },
      right: { type: 'number', value }
    };
  }

  function classifyQuadraticFormulaAlternatives(step, context) {
    const normalized = normalizeStructuredStep(step);
    if (normalized.type !== 'alternatives') return { recognized: false };
    const parsed = normalized.values.map(value => parseQuadraticFormulaRootAssignment(value, context));
    if (!parsed.some(item => item.recognized)) return { recognized: false };
    if (parsed.some(item => !item.recognized)) {
      return { recognized: true, ok: false, message: 'Kvadratinės formulės žingsnyje abi šakas užrašyk tuo pačiu principu.' };
    }
    const failed = parsed.find(item => !item.ok);
    if (failed) return { recognized: true, ok: false, message: failed.message };
    const values = parsed.map(item => item.value);
    const expectedRoots = descriptorRoots(context.targetDescriptor);
    if (!sameRootValues(values, expectedRoots)) {
      return {
        recognized: true,
        ok: false,
        message: `Kvadratinės formulės šaknys apskaičiuotos neteisingai. Teisinga sprendinių aibė: ${formatSolutionDescriptor(context.targetDescriptor)}.`
      };
    }
    context.semanticSteps.push({ semanticType: 'formula-application', kind: 'quadratic-formula', values: [...values] });
    return {
      recognized: true,
      ok: true,
      semanticType: 'formula-application',
      kind: 'quadratic-formula',
      solutionSetEffect: 'derive-solutions',
      values,
      descriptor: descriptorFromRootValues(values),
      equations: values.map(syntheticRootEquation),
      message: 'Pritaikyta kvadratinės lygties formulė; teisingai gautos abi sprendinių šakos.'
    };
  }



  // P2-SPLIT-P2.4.7.16: semantinis v2 kontekstas.
  // Mokinio pasirinkti simbolių vardai nebėra tapatinami su jų matematiniu vaidmeniu.
  // Vaidmuo nustatomas iš viso augančio sprendimo konteksto, todėl ankstesnė eilutė
  // gali būti laikinai „laukianti konteksto“ ir perskaičiuota įvedus vėlesnį žingsnį.
  function quadraticContextFromInitialEquationV2(initialEquation, targetDescriptor) {
    const base = quadraticContextFromInitialEquation(initialEquation, targetDescriptor);
    return {
      ...base,
      canonicalCoefficients: {
        A: base.coefficients.a,
        B: base.coefficients.b,
        C: base.coefficients.c
      },
      localSymbols: {},
      discriminantSymbols: new Set(),
      roleCandidates: null,
      pendingDefinitions: []
    };
  }

  function semanticRoleLabelV2(role) {
    if (role === 'A') return 'x² koeficientas';
    if (role === 'B') return 'x koeficientas';
    if (role === 'C') return 'laisvasis narys';
    return role;
  }

  function semanticAstVariablesV2(node, out = new Set()) {
    if (!node) return out;
    if (node.type === 'variable') out.add(String(node.name || '').toLowerCase());
    else if (node.type === 'unary') semanticAstVariablesV2(node.value, out);
    else if (node.type === 'binary') {
      semanticAstVariablesV2(node.left, out);
      semanticAstVariablesV2(node.right, out);
    }
    return out;
  }

  function expandCompactSemanticSymbolsV2(source, symbolNames) {
    const symbols = new Set([...symbolNames].map(item => String(item).toLowerCase()));
    let result = String(source || '').toLowerCase().replace(/√/g, 'sqrt');
    result = result.replace(/[a-z]{2,}/g, match => {
      if (match === 'sqrt') return match;
      const chars = [...match];
      return chars.every(char => symbols.has(char)) ? chars.join('*') : match;
    });
    return result;
  }

  function replaceSemanticSqrtCallsV2(source, symbols, depth = 0) {
    if (depth > 12) throw new Error('Parse error: per daug įdėtų šaknų');
    let result = String(source || '');
    let guard = 0;
    while (/sqrt\s*\(/i.test(result)) {
      if (guard++ > 20) throw new Error('Parse error: nepavyko perskaityti kvadratinės šaknies');
      const lower = result.toLowerCase();
      const start = lower.lastIndexOf('sqrt(');
      const open = start + 4;
      let nesting = 0;
      let close = -1;
      for (let index = open; index < result.length; index += 1) {
        if (result[index] === '(') nesting += 1;
        else if (result[index] === ')') {
          nesting -= 1;
          if (nesting === 0) { close = index; break; }
        }
      }
      if (close < 0) throw new Error('Parse error: neuždaryta kvadratinė šaknis');
      const inner = result.slice(open + 1, close);
      const value = evaluateQuadraticSemanticNumericV2(inner, symbols, depth + 1);
      const tolerance = EPSILON * Math.max(1, Math.abs(value));
      if (value < -tolerance) throw new Error('Parse error: realiųjų skaičių srityje negalima traukti šaknies iš neigiamo skaičiaus');
      const root = Math.sqrt(Math.max(0, value));
      result = `${result.slice(0, start)}(${root})${result.slice(close + 1)}`;
    }
    return result;
  }

  function evaluateQuadraticSemanticNumericV2(source, symbols = {}, depth = 0) {
    const normalizedSymbols = Object.fromEntries(Object.entries(symbols).map(([key, value]) => [String(key).toLowerCase(), value]));
    let expression = expandCompactSemanticSymbolsV2(normalizeMathLiveAscii(source), Object.keys(normalizedSymbols)).replace(/\s+/g, '');
    expression = replaceSemanticSqrtCallsV2(expression, normalizedSymbols, depth);
    // Bendras P2 reiškinių parseris sąmoningai palaiko tik x. Semantiniame sluoksnyje
    // vietinius mokinio simbolius pirmiausia pakeičiame jų skaitinėmis reikšmėmis,
    // todėl nereikia plėsti viso lygties parserio ir rizikuoti regresijomis.
    expression = expression.replace(/[a-z]/gi, symbol => {
      const key = symbol.toLowerCase();
      if (!Object.prototype.hasOwnProperty.call(normalizedSymbols, key) || !Number.isFinite(normalizedSymbols[key])) {
        throw new Error(`Parse error: dar nežinoma ${symbol} reikšmė`);
      }
      return `(${normalizedSymbols[key]})`;
    });
    const ast = parseExpression(expression);
    const value = evaluateAst(ast, {});
    if (!Number.isFinite(value)) throw new Error('Parse error: gauta nebaigtinė skaitinė reikšmė');
    return value;
  }

  function semanticIdentifiersV2(source) {
    const normalized = normalizeMathLiveAscii(source).toLowerCase().replace(/sqrt/g, '');
    const found = normalized.match(/[a-z]+/g) || [];
    const result = new Set();
    for (const token of found) {
      for (const char of token) result.add(char);
    }
    return [...result];
  }

  function splitSemanticAssignmentsV2(source) {
    const input = normalizeMathLiveAscii(source);
    const assignments = [];
    let depth = 0;
    let start = 0;
    for (let index = 0; index < input.length; index += 1) {
      const char = input[index];
      if (char === '(') depth += 1;
      else if (char === ')') depth = Math.max(0, depth - 1);
      if (depth !== 0 || (char !== ',' && char !== ';')) continue;
      const remainder = input.slice(index + 1);
      if (!/^\s*[A-Za-z]\s*=/.test(remainder)) continue;
      const part = input.slice(start, index).trim();
      if (part) assignments.push(part);
      start = index + 1;
    }
    const tail = input.slice(start).trim();
    if (tail) assignments.push(tail);
    return assignments;
  }

  function semanticMappingKeyV2(mapping) {
    return Object.entries(mapping).sort(([a], [b]) => a.localeCompare(b)).map(([symbol, role]) => `${symbol}:${role}`).join('|');
  }

  function semanticIntersectMappingsV2(left, right) {
    const rightKeys = new Set(right.map(semanticMappingKeyV2));
    return left.filter(item => rightKeys.has(semanticMappingKeyV2(item)));
  }

  function semanticCandidateMappingsV2(context, requestedSymbols) {
    const roles = ['A', 'B', 'C'];
    const symbols = [...new Set(requestedSymbols.map(item => String(item).toLowerCase()))]
      .filter(symbol => /^[a-z]$/.test(symbol) && symbol !== 'x' && !context.discriminantSymbols.has(symbol));
    let candidates = context.roleCandidates?.length ? context.roleCandidates.map(item => ({ ...item })) : [{}];

    for (const symbol of symbols) {
      const next = [];
      for (const candidate of candidates) {
        if (candidate[symbol]) { next.push(candidate); continue; }
        const usedRoles = new Set(Object.values(candidate));
        for (const role of roles) {
          if (usedRoles.has(role)) continue;
          next.push({ ...candidate, [symbol]: role });
        }
      }
      candidates = next;
    }

    // Jei mokinys jau priskyrė simboliui skaitinę reikšmę, ji turi sutapti su
    // to vaidmens koeficientu. Tačiau vien tik reikšmė dar nėra laikoma vaidmens paaiškinimu.
    candidates = candidates.filter(candidate => Object.entries(candidate).every(([symbol, role]) => {
      if (!Object.prototype.hasOwnProperty.call(context.localSymbols, symbol)) return true;
      return semanticNumberMatches(context.localSymbols[symbol], context.canonicalCoefficients[role]);
    }));
    return candidates;
  }

  function semanticScopeForCandidateV2(context, candidate, probe = null) {
    const scope = { ...context.localSymbols };
    for (const [symbol, role] of Object.entries(candidate)) {
      scope[symbol] = probe ? probe[role] : context.canonicalCoefficients[role];
    }
    const discriminant = probe
      ? probe.B * probe.B - 4 * probe.A * probe.C
      : context.discriminant;
    for (const symbol of context.discriminantSymbols) scope[symbol] = discriminant;
    return scope;
  }

  function semanticDiscriminantFormulaMatchesV2(source, context, candidate) {
    const probes = [
      { A: 1, B: 2, C: 3 },
      { A: 2, B: -5, C: 1 },
      { A: -1, B: 4, C: 2 },
      { A: 3, B: 0, C: -2 }
    ];
    try {
      return probes.every(probe => {
        const actual = evaluateQuadraticSemanticNumericV2(source, semanticScopeForCandidateV2(context, candidate, probe));
        const expected = probe.B * probe.B - 4 * probe.A * probe.C;
        return semanticNumberMatches(actual, expected);
      });
    } catch (_) { return false; }
  }

  function semanticQuadraticRootFormulaBranchV2(source, context, candidate) {
    const probes = [
      { A: 1, B: -5, C: 6 },
      { A: 2, B: -7, C: 3 },
      { A: 1, B: 4, C: 3 },
      { A: 3, B: -10, C: 3 }
    ];
    const branchMatches = sign => {
      try {
        return probes.every(probe => {
          const D = probe.B * probe.B - 4 * probe.A * probe.C;
          if (D < 0) return true;
          const actual = evaluateQuadraticSemanticNumericV2(source, semanticScopeForCandidateV2(context, candidate, probe));
          const expected = (-probe.B + sign * Math.sqrt(D)) / (2 * probe.A);
          return semanticNumberMatches(actual, expected);
        });
      } catch (_) { return false; }
    };
    if (branchMatches(-1)) return 'minus';
    if (branchMatches(1)) return 'plus';
    return null;
  }

  function classifyQuadraticDefinitionsV2(source, context) {
    const assignments = splitSemanticAssignmentsV2(source);
    if (!assignments.length) return { recognized: false };
    const parsed = [];
    const workingSymbols = { ...context.localSymbols };
    for (const assignment of assignments) {
      let parts;
      try { parts = splitTopLevelEqualities(assignment); }
      catch (_) { return { recognized: false }; }
      if (parts.length !== 2) return { recognized: false };
      const symbol = parts[0].replace(/\s+/g, '').toLowerCase();
      if (!/^[a-z]$/.test(symbol) || symbol === 'x') return { recognized: false };
      let value;
      try { value = evaluateQuadraticSemanticNumericV2(parts[1], workingSymbols); }
      catch (_) { return { recognized: false }; }
      workingSymbols[symbol] = value;
      parsed.push({ symbol, value });
    }
    Object.assign(context.localSymbols, workingSymbols);

    // Standartinis a,b,c žymėjimas, kai reikšmės sutampa su įprastais vaidmenimis,
    // yra pakankamai aiškus jau pats savaime.
    const standard = parsed.length >= 1 && parsed.every(({ symbol, value }) => {
      const role = symbol === 'a' ? 'A' : symbol === 'b' ? 'B' : symbol === 'c' ? 'C' : null;
      return role && semanticNumberMatches(value, context.canonicalCoefficients[role]);
    });
    if (standard) {
      const mapping = {};
      for (const { symbol } of parsed) mapping[symbol] = symbol === 'a' ? 'A' : symbol === 'b' ? 'B' : 'C';
      const candidates = semanticCandidateMappingsV2(context, Object.keys(mapping)).filter(candidate =>
        Object.entries(mapping).every(([symbol, role]) => candidate[symbol] === role));
      if (candidates.length) context.roleCandidates = candidates;
      return {
        recognized: true,
        ok: true,
        status: 'correct',
        semanticType: 'symbol-definition',
        kind: 'quadratic-coefficients',
        symbols: parsed.map(item => item.symbol),
        message: `Teisingai nustatyti kvadratinės lygties koeficientai: ${parsed.map(item => `${item.symbol} = ${formatSemanticNumber(item.value)}`).join(', ')}.`
      };
    }

    return {
      recognized: true,
      ok: true,
      status: 'warning',
      semanticType: 'symbol-definition',
      kind: 'local-symbols-pending',
      symbols: parsed.map(item => item.symbol),
      message: 'Žymėjimai užfiksuoti. Jų matematinis vaidmuo bus patikslintas iš tolesnio sprendimo.'
    };
  }

  function classifyQuadraticDiscriminantV2(source, context) {
    let parts;
    try { parts = splitTopLevelEqualities(source); }
    catch (error) { return { recognized: false, parseError: error }; }
    if (parts.length < 2) return { recognized: false };
    const left = parts[0].replace(/\s+/g, '').toLowerCase();
    if (!/^[a-z]$/.test(left) || left === 'x') return { recognized: false };

    const rhs = parts.slice(1);
    let formulaPart = null;
    for (const part of rhs) {
      const ids = semanticIdentifiersV2(part).filter(symbol => symbol !== left && symbol !== 'x');
      if (ids.length || /sqrt|√/i.test(part)) { formulaPart = part; break; }
    }

    // Grynas D=1 tebėra leidžiamas kaip įprastas trumpinys.
    if (!formulaPart) {
      if (left !== 'd' && !context.discriminantSymbols.has(left)) return { recognized: false };
      try {
        for (const part of rhs) {
          const value = evaluateQuadraticSemanticNumericV2(part, context.localSymbols);
          if (!semanticNumberMatches(value, context.discriminant)) {
            return { recognized: true, ok: false, message: `Diskriminantas apskaičiuotas neteisingai. Šiai lygčiai D = ${formatSemanticNumber(context.discriminant)}.` };
          }
        }
      } catch (error) { return { recognized: true, ok: false, message: friendlyParseError(error) }; }
      context.discriminantSymbols.add(left);
      context.localSymbols[left] = context.discriminant;
      context.seenDiscriminant = true;
      return { recognized: true, ok: true, status: 'correct', semanticType: 'derived-value', kind: 'discriminant', message: `Teisingai apskaičiuotas diskriminantas: ${left.toUpperCase()} = ${formatSemanticNumber(context.discriminant)}.` };
    }

    const formulaSymbols = semanticIdentifiersV2(formulaPart)
      .filter(symbol => symbol !== left && symbol !== 'x' && !context.discriminantSymbols.has(symbol));
    let candidates = semanticCandidateMappingsV2(context, formulaSymbols);
    const beforeStructure = candidates.length;
    candidates = candidates.filter(candidate => semanticDiscriminantFormulaMatchesV2(formulaPart, context, candidate));
    if (!candidates.length) {
      if (left === 'd' || beforeStructure) {
        return { recognized: true, ok: false, message: 'Užrašyta formulė pagal pasirinktus simbolius neatitinka diskriminanto D = B² − 4AC.' };
      }
      return { recognized: false };
    }

    const scope = semanticScopeForCandidateV2(context, candidates[0]);
    try {
      for (const part of rhs) {
        const value = evaluateQuadraticSemanticNumericV2(part, scope);
        if (!semanticNumberMatches(value, context.discriminant)) {
          return { recognized: true, ok: false, message: `Diskriminantas apskaičiuotas neteisingai. Šiai lygčiai D = ${formatSemanticNumber(context.discriminant)}.` };
        }
      }
    } catch (error) { return { recognized: true, ok: false, message: friendlyParseError(error) }; }

    context.roleCandidates = candidates;
    context.discriminantSymbols.add(left);
    context.localSymbols[left] = context.discriminant;
    context.seenDiscriminant = true;
    context.semanticSteps.push({ semanticType: 'derived-value', kind: 'discriminant', value: context.discriminant });
    return {
      recognized: true,
      ok: true,
      status: 'correct',
      semanticType: 'derived-value',
      kind: 'discriminant',
      message: `Pritaikyta diskriminanto formulė pagal pasirinktus žymėjimus; teisingai gauta ${left.toUpperCase()} = ${formatSemanticNumber(context.discriminant)}.`
    };
  }

  function classifyQuadraticAuxiliaryStepV2(source, context) {
    // P2-SPLIT-P2.4.7.16.1: keli atskiri simbolių priskyrimai vienoje eilutėje
    // (pvz. c=1; b=12; a=-7) pirmiausia turi būti interpretuojami kaip
    // vietinių simbolių apibrėžimai. Ankstesnėje 7.16 versijoje visa eilutė
    // galėjo būti klaidingai palaikyta diskriminanto formule vien todėl, kad
    // po pirmos lygybės dar buvo raidžių. Vieno priskyrimo atveju diskriminantą
    // vis dar tikriname pirmą, kad trumpinys D=1 išliktų semantinis D žingsnis.
    const assignments = splitSemanticAssignmentsV2(source);
    if (assignments.length > 1) {
      const definitions = classifyQuadraticDefinitionsV2(source, context);
      if (definitions.recognized) return definitions;
    }
    const discriminant = classifyQuadraticDiscriminantV2(source, context);
    if (discriminant.recognized) return discriminant;
    return classifyQuadraticDefinitionsV2(source, context);
  }

  function semanticResolvedRoleV2(context, symbol) {
    if (!context.roleCandidates?.length) return null;
    const roles = new Set(context.roleCandidates.map(candidate => candidate[symbol]).filter(Boolean));
    return roles.size === 1 ? [...roles][0] : null;
  }

  function finalizeQuadraticPendingDefinitionsV2(context, stepResults) {
    for (const pending of context.pendingDefinitions) {
      const details = [];
      let resolved = true;
      for (const symbol of pending.symbols) {
        const role = semanticResolvedRoleV2(context, symbol);
        if (!role) { resolved = false; break; }
        details.push(`${symbol} – ${semanticRoleLabelV2(role)}`);
      }
      if (resolved && stepResults[pending.index]) {
        stepResults[pending.index] = {
          status: 'correct',
          message: `Tolesnis sprendimas patikslino pasirinktus žymėjimus: ${details.join(', ')}.`
        };
      }
    }
  }

  // P2-SPLIT-P2.4.7.17.3: kvadratinės formulės simbolinis šablonas nėra privalomas.
  // Jei sprendimo kontekstas jau aiškus, mokinys gali vienoje ar abiejose šakose
  // iš karto statyti skaičius, pvz. x_2=(5+7)/4=3. Taip pat leidžiamas eilutės gale
  // paliktas '=' kai skaičiavimas tęsiamas kitoje tos pačios šakos eilutėje.
  function parseQuadraticFormulaRootAssignmentV2(source, context) {
    let parts;
    try { parts = splitTopLevelEqualities(source); }
    catch (error) { return { recognized: true, ok: false, message: friendlyParseError(error) }; }
    if (parts.length < 2) return { recognized: false };
    const left = parts[0].replace(/\s+/g, '').replace(/_/g, '').replace(/[()]/g, '').toLowerCase();
    if (!/^x(?:1|2)?$/.test(left)) return { recognized: false };

    const rhs = parts.slice(1);
    // Eilutė gali baigtis '=' ir būti tęsiama kitoje vertikalios šakos eilutėje.
    while (rhs.length && !String(rhs[rhs.length - 1] || '').trim()) rhs.pop();
    if (!rhs.length) return { recognized: false };
    if (rhs.some(part => !String(part || '').trim())) {
      return { recognized: true, ok: false, message: 'Lygybės grandinėje tarp dviejų = turi būti reiškinys.' };
    }

    // 1) Pirmiausia ieškome aiškiai užrašytos bendros kvadratinės formulės.
    let matched = [];
    let matchedFormulaPart = null;
    for (const part of rhs) {
      const ids = semanticIdentifiersV2(part).filter(symbol => symbol !== 'x' && !context.discriminantSymbols.has(symbol));
      if (!ids.length) continue;
      const candidates = semanticCandidateMappingsV2(context, ids);
      const localMatches = [];
      for (const candidate of candidates) {
        const branch = semanticQuadraticRootFormulaBranchV2(part, context, candidate);
        if (branch) localMatches.push({ candidate, branch });
      }
      if (localMatches.length) {
        matched = localMatches;
        matchedFormulaPart = part;
        break;
      }
    }

    if (matched.length) {
      if (semanticIdentifiersV2(matchedFormulaPart).some(symbol => context.discriminantSymbols.has(symbol)) && !context.seenDiscriminant) {
        return { recognized: true, ok: false, message: 'Prieš naudodamas diskriminantą kvadratinės lygties formulėje pirmiausia parodyk jo skaičiavimą.' };
      }

      let successful = null;
      for (const item of matched) {
        const scope = semanticScopeForCandidateV2(context, item.candidate);
        let value = null;
        let ok = true;
        try {
          for (const part of rhs) {
            const current = evaluateQuadraticSemanticNumericV2(part, scope);
            if (value !== null && !semanticNumberMatches(current, value)) { ok = false; break; }
            value = current;
          }
        } catch (_) { ok = false; }
        if (ok) { successful = { ...item, value }; break; }
      }
      if (!successful) return { recognized: true, ok: false, message: 'Toje pačioje formulės eilutėje užrašytos reikšmės nėra lygios.' };
      return {
        recognized: true,
        ok: true,
        value: successful.value,
        lhs: left,
        branch: successful.branch,
        mode: 'symbolic-formula',
        candidates: matched.filter(item => item.branch === successful.branch).map(item => item.candidate)
      };
    }

    // 2) Jei bendras simbolinis šablonas praleistas, leidžiame tiesioginį skaitinį
    // įstatymą. Tai analogiška 5·6=30 vietoje A=a·b=5·6=30: formulės vardinis
    // užrašymas nėra būtinas, jei sprendimo kontekstas ir pats skaičiavimas aiškūs.
    // Saugumo sumetimais šis trumpinys netaikomas išraiškai su dar neišspręstais
    // koeficientų simboliais: tokia išraiška turi būti atpažinta simboliškai aukščiau.
    const nonDiscriminantIds = [...new Set(rhs.flatMap(part => semanticIdentifiersV2(part)))]
      .filter(symbol => symbol !== 'x' && !context.discriminantSymbols.has(symbol));
    if (nonDiscriminantIds.length) return { recognized: false };

    const compactParts = rhs.map(part => normalizeMathLiveAscii(part).replace(/\s+/g, ''));
    const hasNontrivialCalculation = compactParts.some(part => !/^[-+]?\d+(?:[.,]\d+)?$/.test(part));
    if (!hasNontrivialCalculation) return { recognized: false };

    // Jei mokinys remiasi jau apskaičiuotu diskriminantu, jis turi būti parodytas.
    const usesDiscriminant = rhs.some(part => semanticIdentifiersV2(part).some(symbol => context.discriminantSymbols.has(symbol)));
    if (usesDiscriminant && !context.seenDiscriminant) {
      return { recognized: true, ok: false, message: 'Prieš naudodamas diskriminantą pirmiausia parodyk jo apskaičiavimą.' };
    }

    const scope = semanticScopeForCandidateV2(context, context.roleCandidates?.[0] || {});
    let value = null;
    try {
      for (const part of rhs) {
        const current = evaluateQuadraticSemanticNumericV2(part, scope);
        if (value !== null && !semanticNumberMatches(current, value)) {
          return { recognized: true, ok: false, message: 'Toje pačioje skaičiavimo eilutėje užrašytos reikšmės nėra lygios.' };
        }
        value = current;
      }
    } catch (error) {
      return { recognized: true, ok: false, message: friendlyParseError(error) };
    }

    const expectedRoots = descriptorRoots(context.targetDescriptor);
    if (!expectedRoots.some(root => semanticNumberMatches(root, value))) {
      return { recognized: true, ok: false, message: 'Skaitinis kvadratinės formulės pritaikymas neduoda pradinės lygties šaknies.' };
    }
    return {
      recognized: true,
      ok: true,
      value,
      lhs: left,
      branch: 'numeric-substitution',
      mode: 'numeric-substitution',
      candidates: []
    };
  }

  // P2-SPLIT-P2.4.7.18.1: vienintelio (dvigubo) sprendinio atveju viena
  // eilutė taip pat gali būti pilna lygybių / skaičiavimo grandinė, pvz.
  // x = -b/(2a) = -(-6)/(2*1) = 3. Tai nėra kelių lygčių sistema – tai
  // viena reikšmės grandinė, todėl jos negalima siųsti į parseEquation(),
  // kuris sąmoningai priima tik vieną '='.
  function semanticQuadraticDoubleRootFormulaMatchesV2(source, context, candidate) {
    const probes = [
      { A: 1, B: -6, C: 9 },
      { A: 2, B: -8, C: 8 },
      { A: 3, B: 12, C: 12 },
      { A: -2, B: 4, C: -2 }
    ];
    try {
      return probes.every(probe => {
        const actual = evaluateQuadraticSemanticNumericV2(source, semanticScopeForCandidateV2(context, candidate, probe));
        const expected = -probe.B / (2 * probe.A);
        return semanticNumberMatches(actual, expected);
      });
    } catch (_) { return false; }
  }

  function parseQuadraticSingleRootCalculationV2(source, context) {
    if (descriptorRoots(context.targetDescriptor).length !== 1) return { recognized: false };
    let parts;
    try { parts = splitTopLevelEqualities(source); }
    catch (error) { return { recognized: true, ok: false, message: friendlyParseError(error) }; }
    if (parts.length < 2) return { recognized: false };

    const left = String(parts[0] || '').replace(/\s+/g, '').replace(/_/g, '').replace(/[(){}]/g, '').toLowerCase();
    if (!/^x(?:1|2)?$/.test(left)) return { recognized: false };

    const rhs = parts.slice(1);
    // Leisti vizualiai užbaigti eilutę '=' ir tęsti kitame Enter žingsnyje.
    while (rhs.length && !String(rhs[rhs.length - 1] || '').trim()) rhs.pop();
    if (!rhs.length) return { recognized: false };
    if (rhs.some(part => !String(part || '').trim())) {
      return { recognized: true, ok: false, message: 'Lygybės grandinėje tarp dviejų = turi būti reiškinys.' };
    }

    const expectedRoot = descriptorRoots(context.targetDescriptor)[0];
    const allIds = [...new Set(rhs.flatMap(part => semanticIdentifiersV2(part)))]
      .filter(symbol => symbol !== 'x' && !context.discriminantSymbols.has(symbol));
    const candidatePool = semanticCandidateMappingsV2(context, allIds);

    // Pirmiausia ieškome semantiškai atpažįstamos dvigubos šaknies formulės -B/(2A).
    let formulaCandidates = [];
    for (const candidate of candidatePool) {
      if (rhs.some(part => semanticQuadraticDoubleRootFormulaMatchesV2(part, context, candidate))) {
        formulaCandidates.push(candidate);
      }
    }

    // Jei simbolinė formulė praleista, skaitinę grandinę leidžiame tik po parodyto
    // D = 0 ir tik tada, kai eilutėje iš tiesų yra skaičiavimas, o ne vien x = 3.
    const compact = rhs.map(part => normalizeMathLiveAscii(part).replace(/\s+/g, ''));
    const numericContinuation = context.seenDiscriminant
      && semanticNumberMatches(context.discriminant, 0)
      && rhs.length >= 2
      && compact.some(part => !/^[-+]?\d+(?:[.,]\d+)?$/.test(part));

    if (!formulaCandidates.length && !numericContinuation) return { recognized: false };

    const candidates = formulaCandidates.length
      ? formulaCandidates
      : (context.roleCandidates?.length ? context.roleCandidates : [{}]);
    let successful = null;
    for (const candidate of candidates) {
      const scope = semanticScopeForCandidateV2(context, candidate);
      let value = null;
      let ok = true;
      try {
        for (const part of rhs) {
          const current = evaluateQuadraticSemanticNumericV2(part, scope);
          if (value !== null && !semanticNumberMatches(current, value)) { ok = false; break; }
          value = current;
        }
      } catch (_) { ok = false; }
      if (!ok || value === null || !semanticNumberMatches(value, expectedRoot)) continue;
      successful = { candidate, value };
      break;
    }

    if (!successful) {
      return {
        recognized: true,
        ok: false,
        message: 'Vienintelio sprendinio skaičiavimo grandinėje užrašytos reikšmės nėra lygios arba negaunamas teisingas sprendinys.'
      };
    }

    if (formulaCandidates.length) context.roleCandidates = formulaCandidates;
    context.semanticSteps.push({ semanticType: 'formula-application', kind: 'quadratic-formula-single', value: successful.value });
    return {
      recognized: true,
      ok: true,
      value: successful.value,
      lhs: left,
      semanticType: 'formula-application',
      kind: 'quadratic-formula-single',
      message: formulaCandidates.length
        ? 'Pritaikyta dvigubos kvadratinės lygties šaknies formulė; lygybių grandinė apskaičiuota teisingai.'
        : 'Tęsiamas vienintelio sprendinio skaičiavimas; lygybių grandinė išlieka teisinga.'
    };
  }

  // P2-SPLIT-P2.4.7.17.3: vertikalios kvadratinės formulės šakos gali tęsti
  // lygybės grandinę per kelias eilutes, pvz. x_1 = ... ir kitoje eilutėje
  // = 6/2 = 3. resolveStructuredStepContinuations() jau atkuria kairįjį narį,
  // o ši funkcija patikrina visą grandinę kaip skaitinį tęsinį, užuot siuntusi ją
  // į bendrą parseEquation(), kuris sąmoningai leidžia tik vieną '='.
  function classifyQuadraticFormulaContinuationAlternativesV2(step, context, previousEquations) {
    const normalized = normalizeStructuredStep(step);
    if (normalized.type !== 'alternatives' || !Array.isArray(previousEquations) || !previousEquations.length) {
      return { recognized: false };
    }

    const parsedValues = [];
    const equations = [];
    let sawContinuation = false;

    for (let index = 0; index < normalized.values.length; index += 1) {
      const source = String(normalized.values[index] || '').trim();
      const previousEquation = previousEquations[index];
      if (!source) {
        if (!previousEquation) return { recognized: false };
        const previousDescriptor = describePolynomialEquation(previousEquation);
        const roots = descriptorRoots(previousDescriptor);
        if (roots.length !== 1) return { recognized: false };
        parsedValues.push(roots[0]);
        equations.push(previousEquation);
        continue;
      }

      let parts;
      try { parts = splitTopLevelEqualities(source); }
      catch (error) { return { recognized: true, ok: false, message: friendlyParseError(error) }; }
      if (parts.length < 2) return { recognized: false };

      const left = parts[0].replace(/\s+/g, '').replace(/_/g, '').replace(/[(){}]/g, '').toLowerCase();
      if (!/^x(?:1|2)?$/.test(left)) return { recognized: false };
      sawContinuation = true;

      const rhs = parts.slice(1).filter(part => String(part || '').trim());
      if (!rhs.length || rhs.length !== parts.length - 1) {
        return { recognized: true, ok: false, message: 'Lygybės tęsinio eilutėje po kiekvieno = turi būti reiškinys.' };
      }

      const ids = [...new Set(rhs.flatMap(part => semanticIdentifiersV2(part)))]
        .filter(symbol => symbol !== 'x' && !context.discriminantSymbols.has(symbol));
      const candidates = semanticCandidateMappingsV2(context, ids);
      let successful = null;

      for (const candidate of candidates.length ? candidates : [{}]) {
        const scope = semanticScopeForCandidateV2(context, candidate);
        let value = null;
        let ok = true;
        try {
          for (const part of rhs) {
            const current = evaluateQuadraticSemanticNumericV2(part, scope);
            if (value !== null && !semanticNumberMatches(current, value)) { ok = false; break; }
            value = current;
          }
        } catch (_) { ok = false; }
        if (!ok || value === null) continue;

        if (previousEquation) {
          const previousDescriptor = describePolynomialEquation(previousEquation);
          const previousRoots = descriptorRoots(previousDescriptor);
          if (previousRoots.length !== 1 || !semanticNumberMatches(value, previousRoots[0])) continue;
        }
        successful = { value, candidate };
        break;
      }

      if (!successful) {
        return {
          recognized: true,
          ok: false,
          message: 'Šios šakos lygybės tęsinys nėra lygus ankstesnėje eilutėje gautai reikšmei.'
        };
      }

      parsedValues.push(successful.value);
      equations.push(syntheticRootEquation(successful.value));
    }

    if (!sawContinuation) return { recognized: false };
    return {
      recognized: true,
      ok: true,
      semanticType: 'formula-application',
      kind: 'quadratic-formula-continuation',
      solutionSetEffect: 'preserve-solutions',
      values: parsedValues,
      descriptor: descriptorFromRootValues(parsedValues),
      equations,
      message: 'Tęsiami kvadratinės formulės skaičiavimai; kiekvienos šakos lygybės grandinė išlieka teisinga.'
    };
  }

  function classifyQuadraticFormulaAlternativesV2(step, context) {
    const normalized = normalizeStructuredStep(step);
    if (normalized.type !== 'alternatives') return { recognized: false };
    const parsed = normalized.values.map(value => parseQuadraticFormulaRootAssignmentV2(value, context));
    if (!parsed.some(item => item.recognized)) return { recognized: false };
    if (parsed.some(item => !item.recognized)) {
      return {
        recognized: true,
        ok: false,
        message: 'Abi sprendinių šakos turi būti matematiškai perskaitomos. Formulės simbolinio šablono kartoti neprivaloma – galima iš karto statyti skaičius.'
      };
    }
    const failed = parsed.find(item => !item.ok);
    if (failed) return { recognized: true, ok: false, message: failed.message };

    // Simbolių vaidmenis tikslina tik tos šakos, kurios iš tiesų parašė simbolinę
    // formulę. Skaitinis trumpinys neturi panaikinti kitos šakos suteikto konteksto.
    const candidateSets = parsed.map(item => item.candidates || []).filter(items => items.length);
    let commonCandidates = context.roleCandidates?.length ? context.roleCandidates.map(item => ({ ...item })) : [];
    if (candidateSets.length) {
      commonCandidates = candidateSets[0];
      for (let index = 1; index < candidateSets.length; index += 1) {
        commonCandidates = semanticIntersectMappingsV2(commonCandidates, candidateSets[index]);
      }
      if (!commonCandidates.length) {
        return { recognized: true, ok: false, message: 'Kvadratinės formulės šakose pasirinkti simboliai naudojami nenuosekliai.' };
      }
    }

    const values = parsed.map(item => item.value);
    const expectedRoots = descriptorRoots(context.targetDescriptor);
    if (!sameRootValues(values, expectedRoots)) {
      return { recognized: true, ok: false, message: `Kvadratinės lygties šaknys apskaičiuotos neteisingai. Teisinga sprendinių aibė: ${formatSolutionDescriptor(context.targetDescriptor)}.` };
    }
    if (candidateSets.length) context.roleCandidates = commonCandidates;
    context.semanticSteps.push({ semanticType: 'formula-application', kind: 'quadratic-formula', values: [...values] });

    const usedNumericShortcut = parsed.some(item => item.mode === 'numeric-substitution');
    return {
      recognized: true,
      ok: true,
      semanticType: 'formula-application',
      kind: 'quadratic-formula',
      solutionSetEffect: 'derive-solutions',
      values,
      descriptor: descriptorFromRootValues(values),
      equations: values.map(syntheticRootEquation),
      message: usedNumericShortcut
        ? 'Teisingai apskaičiuotos abi šaknys. Bendrą formulę galima užrašyti simboliais arba iš karto atlikti skaitinį įstatymą.'
        : 'Pritaikyta kvadratinės lygties formulė pagal pasirinktus žymėjimus; teisingai gautos abi sprendinių šakos.'
    };
  }

  function alternativesAreIsolatedRoots(step, targetDescriptor) {
    const normalized = normalizeStructuredStep(step);
    if (normalized.type !== 'alternatives' || targetDescriptor.kind === 'none' || targetDescriptor.kind === 'all') return false;
    const roots = descriptorRoots(targetDescriptor);
    if (normalized.values.length !== roots.length) return false;
    const found = [];
    for (const value of normalized.values) {
      try {
        const equation = parseEquation(value);
        const descriptor = describePolynomialEquation(equation);
        if (descriptor.kind !== 'single' || !isVariableIsolated(equation, 'x', descriptor.value)) return false;
        found.push(descriptor.value);
      } catch (_) { return false; }
    }
    return sameRootValues(found, roots);
  }

  function alternativeEquationsAreIsolatedRoots(equations, targetDescriptor) {
    if (!Array.isArray(equations) || targetDescriptor.kind === 'none' || targetDescriptor.kind === 'all') return false;
    const roots = descriptorRoots(targetDescriptor);
    if (equations.length !== roots.length) return false;
    const found = [];
    for (const equation of equations) {
      try {
        const descriptor = describePolynomialEquation(equation);
        if (descriptor.kind !== 'single' || !isVariableIsolated(equation, 'x', descriptor.value)) return false;
        found.push(descriptor.value);
      } catch (_) { return false; }
    }
    return sameRootValues(found, roots);
  }

  // P2-SPLIT-P2.4.7.18.1: bendro semantinio sprendimo srauto pagalbinė funkcija.
  // Tiesinėje lygtyje leidžiame natūralią izoliuoto kintamojo lygybių grandinę,
  // pvz. x = 16/2 = 8. Pirmoji lygybė vis tiek turi būti tiesiogiai pagrįsta
  // ankstesniu lygties žingsniu; likusi grandinė tik patvirtina tą pačią reikšmę.
  function parseLinearIsolatedValueChain(source, expectedVariable = 'x') {
    let parts;
    try { parts = splitTopLevelEqualities(source); }
    catch (_) { return null; }
    if (!Array.isArray(parts) || parts.length < 3) return null;
    const left = String(parts[0] || '').replace(/\s+/g, '').replace(/_/g, '').toLowerCase();
    if (left !== String(expectedVariable || 'x').toLowerCase()) return null;
    const rhs = parts.slice(1);
    if (rhs.some(part => !String(part || '').trim())) return { error: 'Lygybės grandinėje po kiekvieno = turi būti reiškinys.' };

    let value = null;
    try {
      for (const part of rhs) {
        const ast = parseExpression(String(part || '').trim());
        if (containsVariable(ast, 'x') || containsVariable(ast, 'y') || containsVariable(ast, 'z')) return null;
        const current = evaluateAst(ast, {});
        if (!Number.isFinite(current)) return { error: 'Lygybės grandinėje gauta nebaigtinė reikšmė.' };
        if (value !== null && Math.abs(current - value) > EPSILON * Math.max(1, Math.abs(current), Math.abs(value))) {
          return { error: 'Toje pačioje lygybės grandinėje užrašytos reikšmės nėra lygios.' };
        }
        value = current;
      }
    } catch (error) {
      return { error: friendlyParseError(error) };
    }

    const firstEquation = parseEquation(`${parts[0]}=${rhs[0]}`);
    return {
      equation: firstEquation,
      descriptor: describePolynomialEquation(firstEquation),
      value,
      messageSuffix: ' Lygybės grandinė tęsiama teisingai.'
    };
  }

  function validateEquationChain(task, response) {
    const steps = resolveStructuredStepContinuations(trimStructuredSteps(response.steps));
    if (!steps.length) {
      return { status: 'incorrect', title: 'Nėra sprendimo žingsnių', message: 'Įrašyk bent vieną naują lygtį.', stepResults: [] };
    }

    const stepResults = [];
    const transitionValidationSetting = task.response?.options?.stepTransitionValidation;
    // P2-SPLIT-P2.4.7.15: visos tiesinės lygtys pagal nutylėjimą tikrina ne tik sprendinių aibę,
    // bet ir tiesioginio žingsnio pagrįstumą. Seną elgesį galima aiškiai išjungti su 'off'.
    const localTransitionMode = transitionValidationSetting !== 'off' && transitionValidationSetting !== false;
    let previousEquation;
    let previousAlternativeEquations = null;
    let previousDescriptor;
    let targetDescriptor;
    try {
      previousEquation = parseEquation(task.response.options.initial || task.prompt?.value);
      previousDescriptor = describeLinearEquation(previousEquation);
      targetDescriptor = previousDescriptor;
    } catch (error) {
      return { status: 'incorrect', title: 'Netinkama pradinė lygtis', message: friendlyParseError(error), stepResults };
    }

    let completed = false;
    for (let index = 0; index < steps.length; index += 1) {
      const step = normalizeStructuredStep(steps[index]);
      if (!stepHasContent(step)) {
        stepResults[index] = { status: 'incorrect', message: 'Tarp sprendimo žingsnių liko tuščia eilutė.' };
        return { status: 'incorrect', title: `Patikrink ${index + 1} žingsnį`, message: 'Sprendimo eigoje negali būti tuščios eilutės tarp užpildytų žingsnių.', stepResults };
      }

      if (step.type === 'solution-set') {
        if (index !== steps.length - 1) {
          stepResults[index] = { status: 'incorrect', message: 'Sprendinių aibę rašyk tik paskutiniame žingsnyje.' };
          return { status: 'incorrect', title: `Patikrink ${index + 1} žingsnį`, message: 'Po galutinės sprendinių aibės nebegali būti kitų žingsnių.', stepResults };
        }
        try {
          const supplied = parseSolutionSetInput(step.values[0]);
          if (!solutionSetMatchesDescriptor(supplied, targetDescriptor)) throw new Error(`Teisingas rezultatas: ${formatSolutionDescriptor(targetDescriptor)}`);
          completed = true;
          stepResults[index] = { status: 'correct', message: 'Sprendinių aibė užrašyta teisingai.' };
          continue;
        } catch (error) {
          stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
          return { status: 'incorrect', title: 'Neteisinga sprendinių aibė', message: friendlyParseError(error), stepResults };
        }
      }

      let descriptor;
      let equation = null;
      let alternativeEquations = null;
      let chainMessageSuffix = '';
      try {
        if (step.type === 'alternatives') {
          const parsedAlternatives = parseAlternativeDescriptorWithCarry(step, true, previousAlternativeEquations);
          descriptor = parsedAlternatives.descriptor;
          alternativeEquations = parsedAlternatives.equations;
        } else {
          const source = step.values[0];
          if (/\b(?:arba|ar)\b/i.test(source)) throw new Error('Viename laukelyje rašyk vieną lygtį. Alternatyvoms pasirink atskirų laukelių žingsnį.');
          const equalityChain = localTransitionMode
            ? parseLinearIsolatedValueChain(source, task.response.options.expectedVariable || 'x')
            : null;
          if (equalityChain?.error) throw new Error(equalityChain.error);
          if (equalityChain?.equation) {
            equation = equalityChain.equation;
            descriptor = equalityChain.descriptor;
            chainMessageSuffix = equalityChain.messageSuffix || '';
          } else {
            equation = parseEquation(source);
            descriptor = localTransitionMode ? describePolynomialEquation(equation) : describeLinearEquation(equation);
          }
        }
      } catch (error) {
        stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
        return { status: 'incorrect', title: `Nepavyko perskaityti ${index + 1} žingsnio`, message: friendlyParseError(error), stepResults };
      }

      const preservesSolutionSet = localTransitionMode
        ? samePolynomialSolutionSet(previousDescriptor, descriptor)
        : sameLinearSolutionSet(previousDescriptor, descriptor);
      if (!preservesSolutionSet) {
        stepResults[index] = { status: 'incorrect', message: 'Šis žingsnis nebeturi tos pačios sprendinių aibės kaip ankstesnis.' };
        return {
          status: 'incorrect',
          title: `Pirmoji klaida – ${index + 1} žingsnyje`,
          message: explainEquationMismatch(previousDescriptor, descriptor),
          stepResults
        };
      }
      let transition = null;
      if (localTransitionMode && equation && previousEquation) {
        try {
          transition = classifyLocalEquationTransition(previousEquation, equation);
        } catch (error) {
          stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
          return {
            status: 'incorrect',
            title: `Nepavyko pagrįsti ${index + 1} žingsnio`,
            message: friendlyParseError(error),
            stepResults
          };
        }
        if (!transition.ok) {
          stepResults[index] = {
            status: 'incorrect',
            message: 'Per didelis šuolis. Parodyk tarpinį žingsnį.'
          };
          return {
            status: 'incorrect',
            title: `Per didelis šuolis – ${index + 1} žingsnyje`,
            message: 'Sprendinių aibė nepasikeitė, tačiau perėjimas nėra vienas aiškus lygiavertis pertvarkymas. Parodyk tarpinį žingsnį.',
            stepResults
          };
        }
      }

      stepResults[index] = {
        status: 'correct',
        message: step.type === 'alternatives'
          ? 'Alternatyvų bendra sprendinių aibė išsaugota.'
          : `${transition?.message || 'Sprendinių aibė išsaugota.'}${chainMessageSuffix}`
      };
      previousDescriptor = descriptor;
      previousEquation = equation || null;
      previousAlternativeEquations = alternativeEquations;
      if (equation && targetDescriptor.kind === 'single' && isVariableIsolated(equation, task.response.options.expectedVariable || 'x', targetDescriptor.value)) completed = true;
      if (step.type === 'alternatives' && alternativeEquationsAreIsolatedRoots(alternativeEquations, targetDescriptor)) completed = true;
    }

    if (!targetDescriptor || targetDescriptor.kind !== 'single') {
      return {
        status: 'incorrect',
        title: 'Šiai lygčiai dar trūksta tikrinimo režimo',
        message: targetDescriptor?.kind === 'all' ? 'Pradinė lygtis yra tapatybė.' : 'Pradinė lygtis neturi vienintelio sprendinio.',
        stepResults
      };
    }
    const expectedVariable = task.response.options.expectedVariable || 'x';
    const expectedDisplay = task.response.options.expectedDisplay || formatExactNumber(targetDescriptor.value);
    if (!completed) {
      return {
        status: 'warning',
        title: 'Žingsniai teisingi, bet sprendimas dar neužbaigtas',
        message: `Toliau pertvarkyk lygtį, kol gausi ${expectedVariable} = ${expectedDisplay}, arba pridėk galutinį sprendinių aibės žingsnį.`,
        stepResults
      };
    }

    const minimumSteps = Math.max(1, Number(task.response.options.minimumSteps) || 1);
    if (steps.length < minimumSteps) {
      return {
        status: 'warning',
        title: 'Atsakymas teisingas, bet trūksta sprendimo eigos',
        message: `Galutinis atsakymas teisingas, tačiau šiai užduočiai reikia parodyti bent ${minimumSteps} sprendimo žingsnius.`,
        stepResults
      };
    }

    return {
      status: 'correct',
      title: 'Sprendimas teisingas',
      message: localTransitionMode
        ? `Visi įvesti žingsniai išlaiko tą pačią sprendinių aibę ir yra pagrįsti tiesioginiais lygiaverčiais pertvarkymais. Galutinis atsakymas: ${expectedVariable} = ${expectedDisplay}.`
        : `Visi įvesti žingsniai išlaiko tą pačią sprendinių aibę, o galutinis atsakymas yra ${expectedVariable} = ${expectedDisplay}.`,
      stepResults
    };
  }


  function validateQuadraticEquationChain(task, response) {
    const steps = resolveStructuredStepContinuations(trimStructuredSteps(response.steps));
    if (!steps.length) {
      return { status: 'incorrect', title: 'Nėra sprendimo žingsnių', message: 'Įrašyk bent vieną naują lygtį.', stepResults: [] };
    }

    const stepResults = [];
    const transitionValidationSetting = task.response?.options?.stepTransitionValidation;
    // P2-SPLIT-P2.4.7.15: „semantic-v1“ išplečia lygties grandinę į bendresnį
    // matematinio sprendimo žingsnio modelį. Pagalbinis D skaičiavimas nėra nauja
    // lygtis x atžvilgiu, todėl jis tikrinamas pagal sprendimo kontekstą, o ne pagal sprendinių aibę.
    const localTransitionMode = transitionValidationSetting !== 'off' && transitionValidationSetting !== false;
    const semanticModeV1 = transitionValidationSetting === 'semantic-v1';
    const semanticModeV2 = transitionValidationSetting === 'semantic-v2';
    const semanticMode = semanticModeV1 || semanticModeV2;
    let targetDescriptor;
    let previousDescriptor;
    let previousEquation = null;
    let previousAlternativeEquations = null;
    let previousSemanticKind = null;
    let semanticContext = null;
    let usedSemanticStep = false;
    try {
      const initialEquation = parseEquation(task.response.options.initial || task.prompt?.value);
      targetDescriptor = describePolynomialEquation(initialEquation);
      previousDescriptor = targetDescriptor;
      previousEquation = initialEquation;
      if (semanticModeV2) semanticContext = quadraticContextFromInitialEquationV2(initialEquation, targetDescriptor);
      else if (semanticModeV1) semanticContext = quadraticContextFromInitialEquation(initialEquation, targetDescriptor);
    } catch (error) {
      return { status: 'incorrect', title: 'Netinkama pradinė lygtis', message: friendlyParseError(error), stepResults };
    }

    let completed = false;
    for (let index = 0; index < steps.length; index += 1) {
      const step = normalizeStructuredStep(steps[index]);
      if (!stepHasContent(step)) {
        stepResults[index] = { status: 'incorrect', message: 'Tarp sprendimo žingsnių liko tuščia eilutė.' };
        return { status: 'incorrect', title: `Patikrink ${index + 1} žingsnį`, message: 'Sprendimo eigoje negali būti tuščios eilutės tarp užpildytų žingsnių.', stepResults };
      }

      if (step.type === 'solution-set') {
        if (index !== steps.length - 1) {
          stepResults[index] = { status: 'incorrect', message: 'Sprendinių aibę rašyk tik paskutiniame žingsnyje.' };
          return { status: 'incorrect', title: `Patikrink ${index + 1} žingsnį`, message: 'Po galutinės sprendinių aibės nebegali būti kitų žingsnių.', stepResults };
        }
        try {
          const suppliedSet = parseSolutionSetInput(step.values[0]);
          if (!solutionSetMatchesDescriptor(suppliedSet, targetDescriptor)) {
            throw new Error(`Gauta sprendinių aibė nesutampa su ${formatSolutionDescriptor(targetDescriptor)}.`);
          }
          stepResults[index] = { status: 'correct', message: 'Sprendinių aibė užrašyta teisingai.' };
          completed = true;
          previousDescriptor = suppliedSetToDescriptor(suppliedSet);
          previousEquation = null;
          previousAlternativeEquations = null;
          previousSemanticKind = 'solution-set';
          continue;
        } catch (error) {
          stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
          return { status: 'incorrect', title: 'Nepavyko perskaityti galutinio atsakymo', message: friendlyParseError(error), stepResults };
        }
      }

      // Semantinis pagalbinio dydžio žingsnis, pvz. a = 1 arba D = b^2 - 4ac = 1.
      // Jis nekeičia aktyvios lygties ir todėl previousEquation / previousDescriptor paliekami tokie patys.
      if (semanticMode && step.type !== 'alternatives') {
        const source = step.values[0];
        const semanticAuxiliary = semanticModeV2
          ? classifyQuadraticAuxiliaryStepV2(source, semanticContext)
          : classifyQuadraticAuxiliaryStep(source, semanticContext);
        if (semanticAuxiliary.recognized) {
          if (!semanticAuxiliary.ok) {
            if (semanticModeV2) finalizeQuadraticPendingDefinitionsV2(semanticContext, stepResults);
            stepResults[index] = { status: 'incorrect', message: semanticAuxiliary.message };
            return {
              status: 'incorrect',
              title: `Patikrink ${index + 1} žingsnį`,
              message: semanticAuxiliary.message,
              stepResults
            };
          }
          usedSemanticStep = true;
          const semanticStatus = semanticAuxiliary.status || 'correct';
          stepResults[index] = { status: semanticStatus, message: semanticAuxiliary.message };
          if (semanticModeV2 && semanticStatus === 'warning' && semanticAuxiliary.symbols?.length) {
            semanticContext.pendingDefinitions.push({ index, symbols: [...semanticAuxiliary.symbols] });
          }
          previousSemanticKind = semanticAuxiliary.kind;
          continue;
        }
      }

      let descriptor;
      let equation = null;
      let alternativeEquations = null;
      let semanticTransition = null;
      try {
        if (step.type === 'alternatives') {
          // 7.17.2: po kvadratinės formulės šakų leisk tęsti skaičiavimą naujomis
          // eilutėmis, įskaitant kelis '=' vienoje tęsinio eilutėje.
          if (semanticModeV2 && previousAlternativeEquations
              && (previousSemanticKind === 'quadratic-formula' || previousSemanticKind === 'quadratic-formula-continuation')) {
            const semanticContinuation = classifyQuadraticFormulaContinuationAlternativesV2(
              step, semanticContext, previousAlternativeEquations
            );
            if (semanticContinuation.recognized) {
              if (!semanticContinuation.ok) throw new Error(semanticContinuation.message);
              semanticTransition = semanticContinuation;
              descriptor = semanticContinuation.descriptor;
              alternativeEquations = semanticContinuation.equations;
              usedSemanticStep = true;
            }
          }
          if (!descriptor && semanticMode && step.values.every(value => String(value || '').trim())) {
            const semanticFormula = semanticModeV2
              ? classifyQuadraticFormulaAlternativesV2(step, semanticContext)
              : classifyQuadraticFormulaAlternatives(step, semanticContext);
            if (semanticFormula.recognized) {
              if (!semanticFormula.ok) throw new Error(semanticFormula.message);
              semanticTransition = semanticFormula;
              descriptor = semanticFormula.descriptor;
              alternativeEquations = semanticFormula.equations;
              usedSemanticStep = true;
            }
          }
          if (!descriptor) {
            const parsedAlternatives = parseAlternativeDescriptorWithCarry(step, false, previousAlternativeEquations);
            descriptor = parsedAlternatives.descriptor;
            alternativeEquations = parsedAlternatives.equations;
          }
        } else {
          const source = step.values[0];
          if (/\b(?:arba|ar)\b/i.test(source)) throw new Error('Viename laukelyje rašyk vieną lygtį. Šiam žingsniui pasirink „Sprendimo šakos“.');

          // Dvigubo sprendinio atveju kvadratinės formulės nereikia dirbtinai skaidyti
          // į dvi vienodas šakas. Leidžiame vieną natūralią formulės / skaičiavimo grandinę,
          // pvz. x=(-b+sqrt(D))/(2a)=3.
          if (semanticModeV2 && descriptorRoots(targetDescriptor).length === 1) {
            const singleFormula = parseQuadraticSingleRootCalculationV2(source, semanticContext);
            if (singleFormula.recognized) {
              if (!singleFormula.ok) throw new Error(singleFormula.message);
              const expectedRoot = descriptorRoots(targetDescriptor)[0];
              if (!semanticNumberMatches(singleFormula.value, expectedRoot)) {
                throw new Error(`Kvadratinės formulės rezultatas neteisingas. Teisingas sprendinys: ${formatSemanticNumber(expectedRoot)}.`);
              }
              equation = syntheticRootEquation(singleFormula.value);
              descriptor = descriptorFromRootValues([singleFormula.value]);
              semanticTransition = {
                ok: true,
                semanticType: 'formula-application',
                kind: 'quadratic-formula-single',
                message: 'Pritaikyta kvadratinės lygties formulė; gautas vienintelis realus sprendinys.'
              };
              usedSemanticStep = true;
            }
          }

          if (!descriptor) {
            equation = parseEquation(source);
            descriptor = describePolynomialEquation(equation);
          }
        }
      } catch (error) {
        stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
        return { status: 'incorrect', title: `Nepavyko perskaityti ${index + 1} žingsnio`, message: friendlyParseError(error), stepResults };
      }

      if (!samePolynomialSolutionSet(previousDescriptor, descriptor)) {
        stepResults[index] = { status: 'incorrect', message: step.type === 'alternatives' ? 'Šių alternatyvų bendra sprendinių aibė nebesutampa su ankstesniu žingsniu.' : 'Ši lygtis nebeturi tos pačios sprendinių aibės kaip ankstesnė.' };
        return {
          status: 'incorrect',
          title: `Pirmoji klaida – ${index + 1} žingsnyje`,
          message: explainPolynomialEquationMismatch(previousDescriptor, descriptor),
          stepResults
        };
      }

      let transition = semanticTransition;
      if (localTransitionMode && !transition) {
        try {
          if (step.type === 'alternatives') {
            if (semanticMode && previousSemanticKind === 'quadratic-formula' && previousAlternativeEquations) {
              const currentRoots = alternativeEquations.map(item => descriptorRoots(describePolynomialEquation(item))[0]);
              const previousRoots = previousAlternativeEquations.map(item => descriptorRoots(describePolynomialEquation(item))[0]);
              if (sameRootValues(currentRoots, previousRoots)) {
                transition = { ok: true, kind: 'quadratic-formula-simplify', semanticType: 'formula-application', message: 'Supaprastintos kvadratinės formulės reikšmės.' };
              }
            }
            if (!transition) {
              if (previousEquation) transition = classifyEquationBranching(previousEquation, alternativeEquations);
              else if (previousAlternativeEquations) transition = classifyAlternativeBranchTransitions(previousAlternativeEquations, alternativeEquations);
            }
          } else if (equation && previousEquation) {
            transition = classifyQuadraticEquationTransition(previousEquation, equation);
          }
        } catch (error) {
          stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
          return {
            status: 'incorrect',
            title: `Nepavyko pagrįsti ${index + 1} žingsnio`,
            message: friendlyParseError(error),
            stepResults
          };
        }

        if (!transition?.ok) {
          stepResults[index] = { status: 'incorrect', message: 'Per didelis šuolis. Parodyk tarpinį žingsnį.' };
          return {
            status: 'incorrect',
            title: `Per didelis šuolis – ${index + 1} žingsnyje`,
            message: step.type === 'alternatives'
              ? 'Sprendinių aibė nepasikeitė, tačiau šakojimas neišplaukia tiesiogiai iš ankstesnės eilutės. Parodyk tarpinį matematinį pagrindimą.'
              : 'Sprendinių aibė nepasikeitė, tačiau perėjimas nėra vienas aiškus lygiavertis pertvarkymas. Parodyk tarpinį žingsnį.',
            stepResults
          };
        }
      }

      stepResults[index] = {
        status: 'correct',
        message: transition?.message || (step.type === 'alternatives' ? 'Alternatyvų bendra sprendinių aibė išsaugota.' : 'Sprendinių aibė išsaugota.')
      };
      previousDescriptor = descriptor;
      previousEquation = equation;
      previousAlternativeEquations = alternativeEquations;
      previousSemanticKind = semanticTransition?.kind || transition?.kind || null;
      if (equation && descriptorIsSingleRoot(targetDescriptor) && isVariableIsolated(equation, 'x', descriptorRoots(targetDescriptor)[0])) completed = true;
      if (semanticTransition?.kind === 'quadratic-formula' || semanticTransition?.kind === 'quadratic-formula-single') completed = true;
      else if (step.type === 'alternatives' && alternativeEquationsAreIsolatedRoots(alternativeEquations, targetDescriptor)) completed = true;
    }

    if (semanticModeV2) finalizeQuadraticPendingDefinitionsV2(semanticContext, stepResults);
    const unresolvedSemanticContext = semanticModeV2 && stepResults.some(item => item?.status === 'warning');

    if (!completed) {
      return {
        status: 'warning',
        title: 'Žingsniai teisingi, bet sprendimas dar neužbaigtas',
        message: targetDescriptor.kind === 'none'
          ? 'Pridėk paskutinį „Sprendinių aibės“ žingsnį ir įrašyk „sprendinių nėra“ arba ∅.'
          : `Galutines alternatyvas užbaik atskirais laukeliais x = … arba pridėk „Sprendinių aibės“ žingsnį: ${formatSolutionDescriptor(targetDescriptor)}.`,
        stepResults
      };
    }

    const minimumSteps = Math.max(1, Number(task.response.options.minimumSteps) || 1);
    if (steps.length < minimumSteps) {
      return {
        status: 'warning',
        title: 'Atsakymas teisingas, bet trūksta sprendimo eigos',
        message: `Galutinis atsakymas teisingas, tačiau šiai užduočiai reikia parodyti bent ${minimumSteps} sprendimo žingsnius.`,
        stepResults
      };
    }

    return {
      status: unresolvedSemanticContext ? 'warning' : 'correct',
      title: unresolvedSemanticContext ? 'Sprendimas matematiškai nuoseklus, bet dalis žymėjimų dar dviprasmiai' : 'Sprendimas teisingas',
      message: unresolvedSemanticContext
        ? 'Sprendimas neprieštarauja matematikai, tačiau ne visų tavo pasirinktų simbolių vaidmuo vienareikšmiškai paaiškėjo iš pateiktų žingsnių.'
        : semanticMode && usedSemanticStep
        ? `Lygties pertvarkymai ir pagalbiniai matematiniai žingsniai pagrįsti. Galutinis rezultatas: ${formatSolutionDescriptor(targetDescriptor)}.`
        : localTransitionMode
          ? `Visi įvesti žingsniai išlaiko tą pačią sprendinių aibę ir yra pagrįsti tiesioginiais pertvarkymais. Galutinis rezultatas: ${formatSolutionDescriptor(targetDescriptor)}.`
          : `Visi įvesti žingsniai išlaiko tą pačią sprendinių aibę. Galutinis rezultatas: ${formatSolutionDescriptor(targetDescriptor)}.`,
      stepResults
    };
  }


  // P2-SPLIT-P2.4.7.18.1: vienas įėjimo taškas visai „Lygčių diagnostikai“.
  // Užduotis nebesirenka seno tiesinio ar kvadratinio srauto rankiniu būdu:
  // pradinė lygtis išanalizuojama, o tada automatiškai prijungiamas naujausias
  // semantinis sprendimo modelis. UI, šakos, lygybės tęsiniai ir mokytojo peržiūra
  // išlieka bendri abiem šeimoms.
  function validateSemanticEquationChain(task, response) {
    let descriptor;
    try {
      const initial = task?.response?.options?.initial || task?.prompt?.value || task?.prompt;
      descriptor = describePolynomialEquation(parseEquation(String(initial || '')));
    } catch (error) {
      return { status: 'incorrect', title: 'Netinkama pradinė lygtis', message: friendlyParseError(error), stepResults: [] };
    }

    const options = { ...(task?.response?.options || {}) };
    const nextTask = {
      ...task,
      response: {
        ...(task?.response || {}),
        options
      }
    };

    if (descriptor.degree === 2) {
      nextTask.response.validator = 'quadratic-equation-chain';
      nextTask.response.options.stepTransitionValidation = 'semantic-v2';
      return validateQuadraticEquationChain(nextTask, response);
    }
    if (descriptor.degree <= 1) {
      nextTask.response.validator = 'linear-equation-chain';
      nextTask.response.options.stepTransitionValidation = 'linear-v2';
      return validateEquationChain(nextTask, response);
    }
    return {
      status: 'incorrect',
      title: 'Šios lygties semantinis režimas dar nepalaikomas',
      message: 'Naujausias diagnostikos srautas šiuo metu palaiko tiesines ir kvadratines lygtis.',
      stepResults: []
    };
  }


  function resolveExpectedNumeric(value) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    const ast = parseExpression(String(value ?? '').trim());
    if (containsVariable(ast, 'x') || containsVariable(ast, 'y') || containsVariable(ast, 'z')) {
      throw new Error('teisinga reikšmė turi būti skaičius');
    }
    const numeric = evaluateAst(ast, {});
    if (!Number.isFinite(numeric)) throw new Error('teisinga reikšmė nėra baigtinis skaičius');
    return numeric;
  }

  function renderFeedback(result) {
    refs.feedback.hidden = !result;
    refs.feedback.className = 'feedback';
    if (!result) return;
    if (result.status === 'correct') {
      refs.feedback.classList.add('is-success');
      refs.feedbackIcon.textContent = '✓';
    } else if (result.status === 'warning') {
      refs.feedback.classList.add('is-warning');
      refs.feedbackIcon.textContent = '!';
    } else {
      refs.feedback.classList.add('is-error');
      refs.feedbackIcon.textContent = '×';
    }
    refs.feedbackTitle.textContent = result.title || (result.status === 'correct' ? 'Teisingai' : 'Dar ne visai');
    refs.feedbackText.textContent = result.message || '';
    refs.feedback.querySelector('.criteria-feedback-list')?.remove();
    const failedCriteria = Array.isArray(result.criteriaResults) ? result.criteriaResults.filter(item => item.status === 'failed') : [];
    if (failedCriteria.length > 1) {
      refs.feedbackText.textContent = 'Patikrink visas pažymėtas sąlygas:';
      const list = document.createElement('ul');
      list.className = 'criteria-feedback-list';
      failedCriteria.forEach(item => {
        const entry = document.createElement('li');
        entry.textContent = item.message || item.label;
        list.appendChild(entry);
      });
      refs.feedback.querySelector('div:last-child')?.appendChild(list);
    }
  }

  // -------------------- P3.2 išmanus mokytojo režimas --------------------

  function setMode(mode, options = {}) {
    const nextMode = mode === 'teacher' ? 'teacher' : 'student';
    if (state.mode === 'teacher' && nextMode !== 'teacher' && editorDirty && !options.force) {
      if (!window.confirm('Yra neišsaugotų užduoties pakeitimų. Juos atmesti?')) return false;
    }

    if (nextMode === 'student') {
      const readyIndexes = readyTaskIndexes();
      if (!readyIndexes.length && !options.allowEmpty) {
        setAuthoringValidation('error', 'Nė viena užduotis dar nepraėjo patikimumo vartų.');
        showToast('Mokinio režimui nėra paruoštų užduočių');
        return false;
      }
      if (readyIndexes.length && !readyIndexes.includes(state.currentTask)) state.currentTask = readyIndexes[0];
    }

    state.mode = nextMode;
    refs.studentModeButton.classList.toggle('is-active', nextMode === 'student');
    refs.teacherModeButton.classList.toggle('is-active', nextMode === 'teacher');
    refs.practiceWindow.classList.toggle('is-authoring', nextMode === 'teacher');
    refs.practiceWindow.classList.toggle('is-student-practice', nextMode === 'student');
    refs.authoringBody.hidden = nextMode !== 'teacher';
    refs.centerPracticeButton.hidden = nextMode !== 'teacher';

    if (nextMode === 'teacher') {
      if (state.window.collapsed) {
        state.window.collapsed = false;
        refs.practiceWindow.classList.remove('is-collapsed');
        refs.collapseButton.textContent = '—';
      }
      renderAuthoringTaskList();
      populateEditor();
    } else {
      editorDirty = false;
      renderTask();
    }
    renderBoardObjects();
    scheduleSave();
    return true;
  }

  function renderAuthoringTaskList() {
    refs.authoringTaskList.replaceChildren();
    tasks.forEach((task, index) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'authoring-task-item';
      button.classList.toggle('is-active', index === state.currentTask);
      button.innerHTML = `
        <span class="authoring-task-index">${index + 1}</span>
        <span class="authoring-task-copy">
          <strong class="authoring-task-title">${escapeHtml(task.title || 'Užduotis be pavadinimo')}</strong>
          <span class="authoring-task-type">${escapeHtml(rendererLabels[task.response?.renderer] || task.response?.renderer || 'Nenurodytas tipas')}</span>
        </span>
        <span class="quality-mini is-${getTaskQualityGate(task).status}" title="${escapeHtml(getTaskQualityGate(task).label)}" aria-label="${escapeHtml(getTaskQualityGate(task).label)}">${getTaskQualityGate(task).status === 'ready' ? '✓' : getTaskQualityGate(task).status === 'unsupported' ? '×' : '!'}</span>
      `;
      button.addEventListener('click', () => selectTaskForAuthoring(index));
      refs.authoringTaskList.appendChild(button);
    });
  }

  function selectTaskForAuthoring(index) {
    if (index === state.currentTask) return;
    if (editorDirty && !window.confirm('Atmesti neišsaugotus dabartinės užduoties pakeitimus?')) return;
    editorDirty = false;
    state.currentTask = Math.max(0, Math.min(tasks.length - 1, index));
    renderTask();
    renderAuthoringTaskList();
    populateEditor();
    scheduleSave();
  }

  function hasTopLevelEquality(source) {
    const text = String(source || '').replace(/[＝]/g, '=');
    let depth = 0;
    for (const character of text) {
      if (character === '(') depth += 1;
      else if (character === ')') depth = Math.max(0, depth - 1);
      else if (character === '=' && depth === 0) return true;
    }
    return false;
  }

  function approximateFraction(value, maximumDenominator = 10000) {
    if (!Number.isFinite(value)) return null;
    if (Math.abs(value) < EPSILON) return { numerator: 0, denominator: 1 };
    const sign = value < 0 ? -1 : 1;
    const target = Math.abs(value);
    if (Number.isInteger(target)) return { numerator: sign * target, denominator: 1 };

    let previousNumerator = 0;
    let numerator = 1;
    let previousDenominator = 1;
    let denominator = 0;
    let remainder = target;
    for (let iteration = 0; iteration < 32; iteration += 1) {
      const whole = Math.floor(remainder);
      const nextNumerator = whole * numerator + previousNumerator;
      const nextDenominator = whole * denominator + previousDenominator;
      if (nextDenominator > maximumDenominator) break;
      previousNumerator = numerator;
      numerator = nextNumerator;
      previousDenominator = denominator;
      denominator = nextDenominator;
      const approximation = numerator / denominator;
      if (Math.abs(approximation - target) <= 1e-10 * Math.max(1, target)) break;
      const fractional = remainder - whole;
      if (Math.abs(fractional) < 1e-14) break;
      remainder = 1 / fractional;
    }
    return denominator ? { numerator: sign * numerator, denominator } : null;
  }

  function formatExactNumber(value) {
    const fraction = approximateFraction(value);
    if (!fraction) return formatNumber(value);
    if (fraction.denominator === 1) return String(fraction.numerator);
    return `${fraction.numerator}/${fraction.denominator}`;
  }

  function analyzeMathContent(source, kind) {
    const value = String(source || '').trim();
    if (!value) return { ok: false, kind, status: 'empty', title: 'Laukiama matematinio turinio', message: 'Įrašyk matematinį užduoties turinį.' };

    if (kind === 'expression') {
      try {
        parseExpression(value);
        return {
          ok: true,
          kind,
          status: 'partial',
          title: 'Atpažintas reiškinys',
          message: 'Parinktas reiškinių lygiavertiškumo tikrintuvas. Tikslinę galutinę formą dar turi nurodyti mokytojas arba DI.',
          validator: 'expression-equivalence'
        };
      } catch (error) {
        return { ok: false, kind, status: 'error', title: 'Reiškinio analizė nebaigta', message: friendlyParseError(error) };
      }
    }

    try {
      const equation = parseEquation(value);
      const descriptor = describePolynomialEquation(equation);
      if (descriptor.kind === 'all') {
        return { ok: false, kind, status: 'unsupported', title: 'Lygtis yra tapatybė', message: 'Šiai lygčiai tinka visi realieji skaičiai. Tapatybių sprendimo baigties modulis dar neprijungtas.' };
      }
      if (descriptor.degree === 2 && !descriptor.rootsSupported) {
        return { ok: false, kind, status: 'unsupported', title: 'Reikalinga tiksli šaknies išraiška', message: 'Lygtis turi iracionaliųjų sprendinių. P7.7.2 dar nepalaiko šaknies ženklo galutiniame atsakyme, todėl ši užduotis saugiai paliekama juodraščiu.' };
      }
      const validator = descriptor.degree === 2 ? 'quadratic-equation-chain' : 'linear-equation-chain';
      const display = formatSolutionDescriptor(descriptor);
      return {
        ok: true,
        kind,
        status: 'ready',
        title: descriptor.degree === 2 ? 'Kvadratinė lygtis išanalizuota automatiškai' : 'Tiesinė lygtis išanalizuota automatiškai',
        message: descriptor.degree === 2
          ? `Atpažinta kvadratinė lygtis su kintamuoju x. Sprendinių aibė: ${display}. Mokytojui atsakymo įrašyti nereikia.`
          : `Atpažinta lygtis su kintamuoju x. Ji susiveda į tiesinę lygtį, o sprendinys ${display}. Mokytojui atsakymo įrašyti nereikia.`,
        validator,
        variable: 'x',
        value: descriptor.kind === 'single' ? descriptor.value : null,
        values: descriptorRoots(descriptor),
        display,
        equation,
        descriptor,
        degree: descriptor.degree,
        solutionKind: descriptor.kind
      };
    } catch (error) {
      const message = friendlyParseError(error);
      const unsupported = /be kintamojo vardiklyje|nepalaikomas laipsnis|per didelis polinomo laipsnis|aukštesnio nei antrojo laipsnio/i.test(message);
      return unsupported
        ? { ok: false, kind, status: 'unsupported', title: 'Šio tipo lygties tikrinimas dar nepalaikomas', message }
        : { ok: false, kind, status: 'error', title: 'Automatinė lygties analizė nepavyko', message };
    }
  }

  function qualityCheck(id, status, message) {
    return { id, status, message };
  }

  function runTaskQualityGate(task) {
    const checks = [];
    const add = (id, status, message) => checks.push(qualityCheck(id, status, message));
    const title = String(task?.title || '').trim();
    const instruction = String(task?.instruction || '').trim();
    const promptValue = String(task?.prompt?.value || '').trim();
    const promptKind = task?.prompt?.kind;
    const renderer = task?.response?.renderer;
    const validator = task?.response?.validator;
    const definition = validatorDefinitions[validator];

    add('title', title ? 'pass' : 'fail', title ? 'Užduoties pavadinimas įrašytas.' : 'Trūksta užduoties pavadinimo.');
    add('instruction', instruction ? 'pass' : 'fail', instruction ? 'Instrukcija mokiniui įrašyta.' : 'Trūksta instrukcijos mokiniui.');
    add('prompt', promptValue ? 'pass' : 'fail', promptValue ? 'Matematinis turinys įrašytas.' : 'Trūksta matematinio turinio.');

    if (!responseRenderers[renderer]) add('renderer', 'unsupported', `Atsakymo laukas „${renderer || 'nenurodytas'}“ šiame variklyje nepalaikomas.`);
    else add('renderer', 'pass', `Atsakymo laukas „${rendererLabels[renderer]}“ palaikomas.`);

    if (!definition || !validators[validator]) add('validator', 'unsupported', `Tikrinimo modulis „${validator || 'nenurodytas'}“ neprijungtas.`);
    else if (definition.renderer !== renderer || definition.promptKind !== promptKind) add('compatibility', 'fail', 'Matematinė struktūra, atsakymo laukas ir tikrintuvas tarpusavyje nesuderinami.');
    else add('compatibility', 'pass', 'Matematinė struktūra, atsakymo laukas ir tikrintuvas suderinti.');

    if (promptValue && promptKind === 'expression') {
      let promptAst = null;
      let expectedAst = null;
      try {
        promptAst = parseExpression(promptValue);
        add('syntax', 'pass', 'Reiškinio sintaksė perskaityta.');
      } catch (error) {
        add('syntax', 'fail', `Reiškinio sintaksės klaida: ${friendlyParseError(error)}`);
      }
      const expected = String(task?.response?.options?.expected || '').trim();
      if (!expected) add('target', 'fail', 'Reiškinio užduočiai trūksta tikslinio atsakymo, kurį turi pateikti mokytojas arba DI.');
      else {
        try {
          expectedAst = parseExpression(expected);
          add('target-syntax', 'pass', 'Tikslinis atsakymas matematiškai perskaitytas.');
        } catch (error) {
          add('target-syntax', 'fail', `Tikslinio atsakymo sintaksės klaida: ${friendlyParseError(error)}`);
        }
      }
      const configuredSamples = Array.isArray(task?.response?.options?.samples) ? task.response.options.samples.filter(Number.isFinite) : [];
      if (configuredSamples.length < 3) add('samples', 'warning', 'Patikimam skaitiniam atsarginiam palyginimui rekomenduojami bent 3 patikros taškai.');
      else add('samples', 'pass', `Nurodyti ${configuredSamples.length} skaitiniai patikros taškai.`);
      if (promptAst && expectedAst) {
        const samples = Array.from(new Set([...configuredSamples, -11, -7, -2, -0.5, 0, 1, 3, 8, 13]));
        const comparison = compareExpressions(expectedAst, promptAst, samples);
        if (comparison.equivalent) add('target-equivalence', 'pass', 'Tikslinis atsakymas lygiavertis pradiniam reiškiniui.');
        else add('target-equivalence', 'fail', `Tikslinis atsakymas nepatvirtintas: ${comparison.message}`);
        try {
          const rational = astToRationalPolynomial(promptAst);
          const domain = String(task?.response?.options?.domain || '').trim().toLowerCase();
          if (!isConstantPolynomial(rational.denominator) && (!domain || domain === 'nenurodyta')) {
            add('domain', 'warning', 'Reiškinio vardiklyje yra kintamasis, tačiau apibrėžimo sąlyga nenurodyta.');
          } else add('domain', 'pass', 'Apibrėžimo srities informacija pakankama dabartiniam tikrintuvui.');
        } catch (_) { /* sintaksės ar palaikymo patikra jau pateikta kitur */ }
      }
    } else if (promptValue && promptKind === 'equation') {
      const analysis = analyzeMathContent(promptValue, 'equation');
      if (analysis.ok) {
        add('syntax', 'pass', 'Lygties sintaksė perskaityta.');
        if (validator !== analysis.validator && validator !== 'semantic-equation-chain') {
          add('validator-match', 'fail', `Šiai lygčiai turi būti parinktas modulis „${validatorDefinitions[analysis.validator]?.label || analysis.validator}“.`);
        } else {
          add('validator-match', 'pass', `Automatiškai parinktas tinkamas modulis „${validatorDefinitions[validator].label}“.`);
        }
        add('solver', 'pass', `${analysis.degree === 2 ? 'Kvadratinė' : 'Tiesinė'} lygtis palaikoma. Sprendinių aibė: ${analysis.display}.`);
        if (analysis.descriptor.kind === 'none') {
          add('solution-substitution', 'pass', 'Diskriminantas neigiamas, todėl realiųjų sprendinių nėra.');
        } else {
          let allVerified = true;
          for (const root of analysis.values) {
            try {
              const left = evaluateAst(analysis.equation.left, { x: root });
              const right = evaluateAst(analysis.equation.right, { x: root });
              const tolerance = EPSILON * Math.max(1, Math.abs(left), Math.abs(right));
              if (!Number.isFinite(left) || !Number.isFinite(right) || Math.abs(left - right) > tolerance) allVerified = false;
            } catch (_) { allVerified = false; }
          }
          add('solution-substitution', allVerified ? 'pass' : 'fail', allVerified ? 'Visi automatiškai apskaičiuoti sprendiniai patikrinti pradinėje lygtyje.' : 'Bent vienas automatiškai apskaičiuotas sprendinys nepatvirtintas pradinėje lygtyje.');
        }
        const minimumSteps = Number(task?.response?.options?.minimumSteps);
        if (Number.isInteger(minimumSteps) && minimumSteps >= 1 && minimumSteps <= 20) add('steps', 'pass', `Mažiausias sprendimo žingsnių skaičius: ${minimumSteps}.`);
        else add('steps', 'fail', 'Mažiausias sprendimo žingsnių skaičius turi būti nuo 1 iki 20.');
      } else if (analysis.status === 'unsupported') {
        add('solver', 'unsupported', `${analysis.title}: ${analysis.message}`);
      } else {
        add('syntax', 'fail', `${analysis.title}: ${analysis.message}`);
      }
    } else if (promptValue) {
      add('kind', 'unsupported', `Matematinė struktūra „${promptKind || 'nenurodyta'}“ dar nepalaikoma.`);
    }

    const hasUnsupported = checks.some(check => check.status === 'unsupported');
    const hasFail = checks.some(check => check.status === 'fail');
    const hasWarning = checks.some(check => check.status === 'warning');
    const status = hasUnsupported ? 'unsupported' : (hasFail || hasWarning ? 'attention' : 'ready');
    const label = status === 'ready' ? 'Paruošta mokiniui' : status === 'unsupported' ? 'Tikrinimas nepalaikomas' : 'Reikia mokytojo dėmesio';
    const summary = status === 'ready'
      ? 'Visos būtinos struktūros ir matematinės patikros praėjo. Užduotį galima saugiai išbandyti mokinio režime.'
      : status === 'unsupported'
        ? 'Užduoties tipas arba matematinis atvejis dar neturi patikimo tikrinimo modulio. Užduotis išsaugoma kaip juodraštis ir mokiniui nerodoma.'
        : 'Bent viena būtina patikra nepraėjo arba reikia papildomo mokytojo sprendimo. Užduotis išsaugoma kaip juodraštis ir mokiniui nerodoma.';
    return { version: 'task-quality-gate@1', status, label, summary, checks };
  }

  function getTaskQualityGate(task) {
    const gate = runTaskQualityGate(task);
    if (task && typeof task === 'object') task.qualityGate = gate;
    return gate;
  }

  function isTaskReady(task) {
    return getTaskQualityGate(task).status === 'ready';
  }

  function renderQualityGate(gate, options = {}) {
    const stale = Boolean(options.stale);
    refs.qualityGatePanel.className = `quality-gate is-${stale ? 'stale' : gate.status}`;
    refs.qualityGateTitle.textContent = stale ? 'Užduotis pakeista – patikrink dar kartą' : gate.label;
    refs.qualityGateStatus.textContent = stale ? 'Reikia patikrinti' : gate.label;
    refs.qualityGateSummary.textContent = stale ? 'Pakeitimai dar nepraėjo patikimumo vartų. Paspausk „Patikrinti užduotį“.' : gate.summary;
    refs.qualityGateChecklist.replaceChildren();
    if (!stale) gate.checks.forEach(check => {
      const item = document.createElement('li');
      item.className = `quality-check is-${check.status}`;
      const icon = check.status === 'pass' ? '✓' : check.status === 'warning' ? '!' : '×';
      item.innerHTML = `<span class="quality-check-icon" aria-hidden="true">${icon}</span><span>${escapeHtml(check.message)}</span>`;
      refs.qualityGateChecklist.appendChild(item);
    });
    refs.testAsStudentButton.disabled = stale || gate.status !== 'ready';
  }

  function checkEditorTask() {
    const task = buildTaskFromEditor(false);
    const gate = runTaskQualityGate(task);
    renderQualityGate(gate);
    if (gate.status === 'ready') setAuthoringValidation('success', 'Patikimumo vartai praeiti. Užduotį galima išbandyti mokinio režime.');
    else setAuthoringValidation('error', gate.summary);
    return gate;
  }

  function synchronizeAutomaticAuthoring(options = {}) {
    const source = refs.editorPromptValue.value.trim();
    const equationMode = options.fromRenderer
      ? refs.editorRenderer.value === 'math-step-list'
      : (hasTopLevelEquality(source) || refs.editorRenderer.value === 'math-step-list');
    if (!options.fromRenderer && hasTopLevelEquality(source)) refs.editorRenderer.value = 'math-step-list';
    refs.editorPromptKind.value = equationMode ? 'equation' : 'expression';
    const analysis = analyzeMathContent(source, equationMode ? 'equation' : 'expression');
    const preferredValidator = equationMode ? (analysis.validator || 'linear-equation-chain') : 'expression-equivalence';
    updateValidatorOptions(preferredValidator);
    refs.editorValidator.value = preferredValidator;
    updateValidatorPanels();
    updateAutomaticAnalysis();
  }

  function updateAutomaticAnalysis() {
    const kind = refs.editorPromptKind.value === 'equation' ? 'equation' : 'expression';
    const analysis = analyzeMathContent(refs.editorPromptValue.value, kind);
    refs.automaticAnalysisPanel.className = `automatic-analysis is-${analysis.status}`;
    refs.automaticAnalysisTitle.textContent = analysis.title;
    refs.automaticAnalysisStatus.textContent = analysis.ok ? (analysis.status === 'ready' ? 'Paruošta' : 'Dalinai') : (analysis.status === 'empty' ? '—' : 'Reikia dėmesio');
    refs.automaticAnalysisText.textContent = analysis.message;
    refs.automaticAnalysisMath.replaceChildren();
    refs.automaticAnalysisMath.hidden = true;

    if (kind === 'equation') {
      refs.editorInitialEquation.value = refs.editorPromptValue.value.trim();
      refs.editorExpectedVariable.value = analysis.ok ? analysis.variable : 'x';
      refs.editorExpectedValue.value = analysis.ok ? JSON.stringify(analysis.values) : '';
      refs.editorExpectedValueDisplay.value = analysis.ok ? analysis.display : '';
      if (analysis.ok) {
        try {
          refs.automaticAnalysisMath.appendChild(solutionSetToMathML(descriptorToSolutionSet(analysis.descriptor)));
          refs.automaticAnalysisMath.hidden = false;
        } catch (_) { /* tekstinis rezultatas jau parodytas */ }
      }
    } else {
      refs.editorInitialEquation.value = '';
      refs.editorExpectedVariable.value = '';
      refs.editorExpectedValue.value = '';
      refs.editorExpectedValueDisplay.value = '';
    }
    return analysis;
  }

  function populateEditor() {
    const task = currentTask();
    if (!task) return;
    editorLoading = true;
    refs.authoringEditorTitle.textContent = `${state.currentTask + 1}. ${task.title || 'Užduotis'}`;
    refs.packageTitleInput.value = practicePackage.title || '';
    refs.packageEyebrowInput.value = practicePackage.eyebrow || '';
    refs.editorTaskTitle.value = task.title || '';
    refs.editorDifficulty.value = task.difficulty || '';
    refs.editorInstruction.value = task.instruction || '';
    refs.editorPromptKind.value = task.prompt?.kind === 'equation' ? 'equation' : 'expression';
    refs.editorPromptValue.value = task.prompt?.value || '';
    refs.editorNote.value = task.note || '';
    refs.editorHint.value = task.hint || '';
    refs.editorRenderer.value = task.response?.renderer === 'math-step-list' ? 'math-step-list' : 'single-math-input';
    updateValidatorOptions(task.response?.validator);
    refs.editorResponseLabel.value = task.response?.label || '';
    refs.editorPlaceholder.value = task.response?.placeholder || '';

    const options = task.response?.options || {};
    refs.editorExpectedExpression.value = options.expected ?? '';
    refs.editorExpectedExpressionDisplay.value = options.expectedDisplay ?? '';
    refs.editorDomain.value = options.domain ?? '';
    refs.editorSamples.value = Array.isArray(options.samples) ? options.samples.join('; ') : '';
    refs.editorRequireSimplified.checked = Boolean(options.requireSimplified);
    refs.editorInitialEquation.value = options.initial ?? task.prompt?.value ?? '';
    refs.editorExpectedVariable.value = options.expectedVariable ?? 'x';
    refs.editorExpectedValue.value = options.expectedValue ?? '';
    refs.editorExpectedValueDisplay.value = options.expectedDisplay ?? '';
    refs.editorMinimumSteps.value = Math.max(1, Number(options.minimumSteps) || 1);

    synchronizeAutomaticAuthoring();
    updateAuthoringPreview();
    updateTaskJsonPreview();
    renderQualityGate(getTaskQualityGate(task));
    setAuthoringValidation('', '');
    editorDirty = false;
    editorLoading = false;
  }

  function updateValidatorOptions(preferred) {
    const renderer = refs.editorRenderer.value;
    const available = Object.entries(validatorDefinitions).filter(([, definition]) => definition.renderer === renderer);
    refs.editorValidator.replaceChildren();
    available.forEach(([id, definition]) => {
      const option = document.createElement('option');
      option.value = id;
      option.textContent = definition.label;
      refs.editorValidator.appendChild(option);
    });
    if (available.some(([id]) => id === preferred)) refs.editorValidator.value = preferred;
    else if (available.length) refs.editorValidator.value = available[0][0];
  }

  function updateValidatorPanels() {
    const equationMode = refs.editorPromptKind.value === 'equation' || ['linear-equation-chain', 'quadratic-equation-chain', 'semantic-equation-chain'].includes(refs.editorValidator.value);
    refs.expressionValidatorPanel.hidden = equationMode;
    refs.equationValidatorPanel.hidden = !equationMode;
    refs.minimumStepsField.hidden = !equationMode;
    refs.equationTechnicalFields.hidden = !equationMode;
  }

  function parseSamples(source) {
    const text = String(source || '').trim();
    if (!text) return [-7, -2, 0, 1, 3, 8];
    const values = text.split(/[;\n]+/).map(value => Number(value.trim().replace(',', '.'))).filter(Number.isFinite);
    if (!values.length) throw new Error('Nurodyk bent vieną skaitinį patikros tašką, taškus atskirk kabliataškiu.');
    return values;
  }

  function buildTaskFromEditor(strict = false) {
    const existing = currentTask();
    const renderer = refs.editorRenderer.value;
    const validator = refs.editorValidator.value;
    const promptKind = refs.editorPromptKind.value;
    const definition = validatorDefinitions[validator];
    const promptValue = refs.editorPromptValue.value.trim();
    const analysis = analyzeMathContent(promptValue, promptKind);

    const task = {
      id: existing.id,
      title: refs.editorTaskTitle.value.trim(),
      instruction: refs.editorInstruction.value.trim(),
      difficulty: refs.editorDifficulty.value.trim() || 'Nenurodyta',
      prompt: { kind: promptKind, value: promptValue },
      note: refs.editorNote.value.trim(),
      hint: refs.editorHint.value.trim(),
      response: {
        renderer,
        valueType: ['linear-equation-chain', 'quadratic-equation-chain', 'semantic-equation-chain'].includes(validator) ? 'equation' : 'expression',
        label: refs.editorResponseLabel.value.trim() || (renderer === 'math-step-list' ? 'Sprendimo eiga' : 'Atsakymas'),
        placeholder: refs.editorPlaceholder.value.trim(),
        validator,
        options: {}
      },
      analysis: {
        source: 'automatic',
        status: analysis.status,
        kind: promptKind,
        validator
      },
      assessment: deepClone(existing.assessment || {})
    };

    if (validator === 'expression-equivalence') {
      task.response.options = {
        expected: refs.editorExpectedExpression.value.trim(),
        requireSimplified: refs.editorRequireSimplified.checked,
        domain: refs.editorDomain.value.trim() || 'nenurodyta',
        samples: strict ? parseSamples(refs.editorSamples.value) : refs.editorSamples.value.split(/[;\n]+/).map(value => Number(value.trim().replace(',', '.'))).filter(Number.isFinite)
      };
      const expectedDisplay = refs.editorExpectedExpressionDisplay.value.trim();
      if (expectedDisplay) task.response.options.expectedDisplay = expectedDisplay;
      task.analysis.requiresTargetAnswer = true;
    } else if (analysis.ok) {
      task.response.validator = analysis.validator;
      task.response.options = {
        initial: promptValue,
        expectedVariable: analysis.variable,
        expectedValues: analysis.values,
        expectedDisplay: analysis.display,
        solutionKind: analysis.solutionKind,
        minimumSteps: Math.max(1, Math.min(20, Number(refs.editorMinimumSteps.value) || 1)),
        autoDerived: true
      };
      if (analysis.values.length === 1) task.response.options.expectedValue = analysis.values[0];
      task.analysis.validator = analysis.validator;
      task.analysis.variable = analysis.variable;
      task.analysis.solution = analysis.display;
      task.analysis.degree = analysis.degree;
    } else {
      task.response.options = {
        initial: promptValue,
        expectedVariable: 'x',
        expectedValue: '',
        minimumSteps: Math.max(1, Math.min(20, Number(refs.editorMinimumSteps.value) || 1)),
        autoDerived: true
      };
      task.analysis.message = analysis.message;
    }

    upgradeTaskRequirements(task);
    task.qualityGate = runTaskQualityGate(task);
    if (strict && task.qualityGate.status !== 'ready') throw new Error(task.qualityGate.summary);
    return task;
  }

  function updateAuthoringPreview() {
    refs.authoringMathPreview.replaceChildren();
    const value = refs.editorPromptValue.value.trim();
    if (!value) {
      refs.authoringMathPreview.textContent = 'Matematinė peržiūra';
      return;
    }
    try {
      const node = refs.editorPromptKind.value === 'equation'
        ? equationToMathML(parseEquation(value))
        : astToMathML(parseExpression(value));
      refs.authoringMathPreview.appendChild(node);
    } catch (error) {
      refs.authoringMathPreview.textContent = `Dar nebaigta: ${friendlyParseError(error)}`;
    }
  }

  function updateTaskJsonPreview() {
    try {
      refs.taskJsonPreview.textContent = JSON.stringify(buildTaskFromEditor(false), null, 2);
    } catch (error) {
      refs.taskJsonPreview.textContent = `JSON peržiūra laikinai negalima: ${friendlyParseError(error)}`;
    }
  }

  function markEditorDirty() {
    if (editorLoading) return;
    editorDirty = true;
    setAuthoringValidation('', '');
    updateAuthoringPreview();
    updateAutomaticAnalysis();
    updateTaskJsonPreview();
    renderQualityGate(runTaskQualityGate(buildTaskFromEditor(false)), { stale: true });
  }

  function setAuthoringValidation(type, message) {
    refs.authoringValidation.className = 'authoring-validation';
    refs.authoringValidation.textContent = message || '';
    if (type) refs.authoringValidation.classList.add(`is-${type}`);
  }

  function saveEditorChanges() {
    try {
      const oldTask = currentTask();
      const updatedTask = buildTaskFromEditor(false);
      const rendererChanged = oldTask.response?.renderer !== updatedTask.response.renderer;
      tasks[state.currentTask] = updatedTask;
      practicePackage.title = refs.packageTitleInput.value.trim() || 'Interaktyvios matematikos pratybos';
      practicePackage.eyebrow = refs.packageEyebrowInput.value.trim() || 'DI TINKAMAS PRATYBŲ MODELIS · P7.7.2';
      practicePackage.tasks = tasks;
      state.packageData = practicePackage;
      if (rendererChanged || !state.responses[updatedTask.id]) state.responses[updatedTask.id] = defaultResponse(updatedTask);
      state.results[updatedTask.id] = null;
      editorDirty = false;
      renderTask();
      renderAuthoringTaskList();
      populateEditor();
      const gate = getTaskQualityGate(updatedTask);
      if (gate.status === 'ready') {
        setAuthoringValidation('success', 'Užduotis išsaugota ir praėjo patikimumo vartus. Ji paruošta mokiniui.');
        showToast('Užduotis paruošta mokiniui');
      } else {
        setAuthoringValidation('error', `Juodraštis išsaugotas. ${gate.summary}`);
        showToast('Juodraštis išsaugotas');
      }
      scheduleSave();
      return true;
    } catch (error) {
      setAuthoringValidation('error', friendlyParseError(error));
      return false;
    }
  }

  function createBlankTask() {
    return {
      id: createUniqueTaskId('task'),
      title: 'Nauja užduotis',
      instruction: 'Įrašyk užduoties instrukciją mokiniui.',
      difficulty: 'Nauja',
      prompt: { kind: 'expression', value: 'x + 1' },
      note: '',
      hint: '',
      response: {
        renderer: 'single-math-input',
        valueType: 'expression',
        label: 'Atsakymas',
        placeholder: 'Įrašyk atsakymą',
        validator: 'expression-equivalence',
        options: {
          expected: 'x + 1',
          requireSimplified: false,
          domain: 'nenurodyta',
          samples: [-7, -2, 0, 1, 3, 8]
        }
      }
    };
  }

  function createUniqueTaskId(prefix) {
    let id = `${prefix}-${Date.now().toString(36)}`;
    let suffix = 1;
    while (tasks.some(task => task.id === id)) id = `${prefix}-${Date.now().toString(36)}-${suffix++}`;
    return id;
  }

  function addTask() {
    if (editorDirty && !window.confirm('Atmesti neišsaugotus dabartinės užduoties pakeitimus ir kurti naują užduotį?')) return;
    const task = createBlankTask();
    tasks.push(task);
    practicePackage.tasks = tasks;
    state.responses[task.id] = defaultResponse(task);
    state.results[task.id] = null;
    state.currentTask = tasks.length - 1;
    editorDirty = false;
    renderTask();
    renderAuthoringTaskList();
    populateEditor();
    scheduleSave();
    showToast('Pridėta nauja užduotis');
  }

  function duplicateTask() {
    if (editorDirty && !window.confirm('Atmesti neišsaugotus pakeitimus ir dubliuoti išsaugotą užduoties versiją?')) return;
    const copy = deepClone(currentTask());
    copy.id = createUniqueTaskId('task-copy');
    copy.title = `${copy.title} – kopija`;
    tasks.splice(state.currentTask + 1, 0, copy);
    practicePackage.tasks = tasks;
    state.responses[copy.id] = defaultResponse(copy);
    state.results[copy.id] = null;
    state.currentTask += 1;
    editorDirty = false;
    renderTask();
    renderAuthoringTaskList();
    populateEditor();
    scheduleSave();
    showToast('Užduotis dubliuota');
  }

  function deleteTask() {
    if (tasks.length <= 1) {
      setAuthoringValidation('error', 'Pratybų rinkinyje turi likti bent viena užduotis.');
      return;
    }
    const task = currentTask();
    if (!window.confirm(`Pašalinti užduotį „${task.title}“?`)) return;
    tasks.splice(state.currentTask, 1);
    delete state.responses[task.id];
    delete state.results[task.id];
    practicePackage.tasks = tasks;
    state.currentTask = Math.min(state.currentTask, tasks.length - 1);
    editorDirty = false;
    renderTask();
    renderAuthoringTaskList();
    populateEditor();
    scheduleSave();
    showToast('Užduotis pašalinta');
  }

  function copyCurrentTaskJson() {
    const text = refs.taskJsonPreview.textContent || '';
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => showToast('JSON nukopijuotas')).catch(() => {
        showToast(fallbackCopy() ? 'JSON nukopijuotas' : 'Nepavyko nukopijuoti JSON');
      });
    } else {
      showToast(fallbackCopy() ? 'JSON nukopijuotas' : 'Nepavyko nukopijuoti JSON');
    }
  }




  // -------------------- P7.7.2 vietinė užduočių biblioteka --------------------

  function inferLibraryTopic(task) {
    const validator = String(task?.response?.validator || '');
    const title = String(task?.title || '').toLowerCase();
    if (validator === 'quadratic-equation-chain' || title.includes('kvadratin')) return 'Kvadratinės lygtys';
    if (validator === 'linear-equation-chain' || task?.prompt?.kind === 'equation') return 'Tiesinės lygtys';
    if (title.includes('mišr')) return 'Skaičiai ir trupmenos';
    return 'Raidiniai reiškiniai';
  }

  function inferLibraryType(task) {
    if (task?.response?.validator === 'quadratic-equation-chain') return 'Kvadratinė lygtis';
    if (task?.response?.validator === 'linear-equation-chain') return 'Tiesinė lygtis';
    if (task?.prompt?.kind === 'equation') return 'Lygtis';
    return 'Reiškinys';
  }

  function createLibraryEntry(task, source = 'pradinis rinkinys', existing = null) {
    const now = new Date().toISOString();
    const snapshot = upgradeTaskRequirements(deepClone(task));
    delete snapshot.qualityGate;
    return {
      id: existing?.id || `library-${String(task.id || Date.now()).replace(/[^a-z0-9_-]/gi, '-')}`,
      taskId: String(task.id || `task-${Date.now()}`),
      version: existing ? Number(existing.version || 1) + 1 : 1,
      source,
      createdAt: existing?.createdAt || now,
      updatedAt: now,
      metadata: {
        classLevel: String(existing?.metadata?.classLevel || task?.metadata?.classLevel || '8 klasė'),
        topic: String(existing?.metadata?.topic || task?.metadata?.topic || inferLibraryTopic(task)),
        type: String(existing?.metadata?.type || task?.metadata?.type || inferLibraryType(task)),
        difficulty: String(task?.difficulty || existing?.metadata?.difficulty || 'Nenurodyta')
      },
      task: snapshot
    };
  }

  function createInitialLibrary() {
    return {
      schemaVersion: 1,
      tasks: tasks.map(task => createLibraryEntry(task, 'pradinis rinkinys')),
      practiceSets: builtInPracticeSetCopies()
    };
  }

  function normalizeLibrary(candidate) {
    const source = candidate && typeof candidate === 'object' ? candidate : createInitialLibrary();
    const entries = Array.isArray(source.tasks) ? source.tasks : [];
    const normalizedTasks = entries.map((entry, index) => {
      const rawTask = entry?.task && typeof entry.task === 'object' ? entry.task : entry;
      if (!rawTask || typeof rawTask !== 'object') return null;
      const normalized = createLibraryEntry(rawTask, entry?.source || 'atkurta', {
        ...entry,
        id: entry?.id || `library-restored-${index + 1}`,
        version: Math.max(0, Number(entry?.version || 1) - 1)
      });
      normalized.version = Math.max(1, Number(entry?.version || normalized.version));
      normalized.createdAt = entry?.createdAt || normalized.createdAt;
      normalized.updatedAt = entry?.updatedAt || normalized.updatedAt;
      return normalized;
    }).filter(Boolean);
    const practiceSets = Array.isArray(source.practiceSets) ? source.practiceSets.map((set, index) => {
      const external = set?.kind === 'external-module';
      return {
        id: String(set?.id || `practice-set-${index + 1}`),
        kind: external ? 'external-module' : 'native',
        title: String(set?.title || `Pratybos ${index + 1}`),
        description: String(set?.description || ''),
        createdAt: set?.createdAt || new Date().toISOString(),
        updatedAt: set?.updatedAt || set?.createdAt || new Date().toISOString(),
        taskRefs: Array.isArray(set?.taskRefs) ? set.taskRefs : [],
        snapshots: external ? [] : (Array.isArray(set?.snapshots) ? set.snapshots.map(task => upgradeTaskRequirements(deepClone(task))) : []),
        moduleUrl: external ? String(set?.moduleUrl || '') : '',
        moduleId: external ? String(set?.moduleId || '') : '',
        moduleVersion: external ? String(set?.moduleVersion || '') : '',
        taskCount: external ? Math.max(0, Number(set?.taskCount) || 0) : 0,
        classTaskCount: external ? Math.max(0, Number(set?.classTaskCount) || 0) : 0,
        selfTaskCount: external ? Math.max(0, Number(set?.selfTaskCount) || 0) : 0,
        builtIn: Boolean(set?.builtIn),
        handoutUrl: external ? String(set?.handoutUrl || '') : ''
      };
    }) : [];
    const currentBuiltinIds = new Set(BUILTIN_PRACTICE_SETS.map(item => item.id));
    for (let i = practiceSets.length - 1; i >= 0; i--) { if (practiceSets[i].builtIn && !currentBuiltinIds.has(practiceSets[i].id)) practiceSets.splice(i,1); }
    for (const builtin of builtInPracticeSetCopies()) {
      const existingIndex = practiceSets.findIndex(item => item.id === builtin.id);
      if (existingIndex < 0) practiceSets.unshift(builtin);
      else practiceSets[existingIndex] = { ...practiceSets[existingIndex], ...builtin };
    }
    return { schemaVersion: 1, tasks: normalizedTasks.length ? normalizedTasks : createInitialLibrary().tasks, practiceSets };
  }

  function normalizeBoardTaskResponse(task, candidate) {
    if (task?.response?.renderer === 'math-step-list') {
      return { steps: normalizeStructuredSteps(candidate?.steps) };
    }
    return {
      answer: String(candidate?.answer || ''),
      answerLatex: String(candidate?.answerLatex || candidate?.latex || '')
    };
  }

  function normalizeBoardTaskInstance(instance) {
    if (!instance || typeof instance !== 'object' || !instance.taskSnapshot) return null;
    const taskSnapshot = upgradeTaskRequirements(deepClone(instance.taskSnapshot));
    const response = normalizeBoardTaskResponse(taskSnapshot, instance.response);
    const result = resultMatchesCurrentResponse(instance.result || null, response, taskSnapshot) ? (instance.result || null) : null;
    return {
      id: String(instance.id || `board-task-${Date.now()}`),
      libraryTaskId: String(instance.libraryTaskId || ''),
      taskSnapshot,
      response,
      result,
      x: Number.isFinite(instance.x) ? instance.x : 0.04,
      y: Number.isFinite(instance.y) ? instance.y : 0.07,
      width: Number.isFinite(instance.width) ? instance.width : 0.43,
      height: Number.isFinite(instance.height) ? instance.height : 0.38,
      collapsed: Boolean(instance.collapsed)
    };
  }

  function defaultPracticeAnswerHeight(task) {
    return task?.response?.renderer === 'math-step-list' ? 210 : 108;
  }

  function normalizePracticeTaskLayout(layout, task) {
    const fallback = defaultPracticeAnswerHeight(task);
    const pageIndex = Number.isInteger(Number(layout?.pageIndex)) && Number(layout.pageIndex) >= 0
      ? Number(layout.pageIndex)
      : null;
    const columnIndex = Number.isInteger(Number(layout?.columnIndex)) && Number(layout.columnIndex) >= 0
      ? Number(layout.columnIndex)
      : null;
    const freeX = layout?.freeX !== null && layout?.freeX !== undefined && Number.isFinite(Number(layout.freeX)) ? clampNumber(layout.freeX, 0, 0.94, 0) : null;
    const freeY = layout?.freeY !== null && layout?.freeY !== undefined && Number.isFinite(Number(layout.freeY)) ? clampNumber(layout.freeY, 0, 0.94, 0) : null;
    const freeWidth = layout?.freeWidth !== null && layout?.freeWidth !== undefined && Number.isFinite(Number(layout.freeWidth)) ? clampNumber(layout.freeWidth, 0.28, 1, 0.96) : null;
    return {
      answerHeight: clampNumber(layout?.answerHeight, 80, 520, fallback),
      answerScrollTop: Math.max(0, Number(layout?.answerScrollTop) || 0),
      pageIndex,
      columnIndex,
      freeX,
      freeY,
      freeWidth
    };
  }

  function normalizePracticePageConfig(page) {
    const size = PRACTICE_PAGE_FORMATS[page?.size] ? page.size : 'A4';
    const orientation = page?.orientation === 'landscape' ? 'landscape' : 'portrait';
    const viewMode = ['fit-page', 'fit-width', 'actual'].includes(page?.viewMode) ? page.viewMode : 'fit-page';
    const layoutMode = ['flow', 'columns', 'free'].includes(page?.layoutMode) ? page.layoutMode : 'flow';
    const columns = [2, 3].includes(Number(page?.columns)) ? Number(page.columns) : 2;
    const paginationMode = page?.paginationMode === 'manual' || layoutMode === 'free' ? 'manual' : 'auto';
    return {
      size,
      orientation,
      viewMode,
      layoutMode,
      columns,
      paginationMode
    };
  }

  function practicePagePixelSize(instance) {
    const page = normalizePracticePageConfig(instance?.page);
    const format = PRACTICE_PAGE_FORMATS[page.size] || PRACTICE_PAGE_FORMATS.A4;
    return page.orientation === 'landscape'
      ? { width: format.height, height: format.width }
      : { width: format.width, height: format.height };
  }


  function practicePageContentCapacity(instance) {
    const pageSize = practicePagePixelSize(instance);
    // Fiksuoto lapo vidinė erdvė po antrašte, poraštėmis ir paraštėmis.
    return Math.max(260, pageSize.height - 215);
  }


  function practicePageContentBox(instance) {
    const pageSize = practicePagePixelSize(instance);
    return {
      width: Math.max(240, pageSize.width - 78),
      height: practicePageContentCapacity(instance)
    };
  }

  function practiceLayoutMode(instance) {
    return normalizePracticePageConfig(instance?.page).layoutMode;
  }

  function practiceColumnCount(instance) {
    return normalizePracticePageConfig(instance?.page).columns;
  }

  function estimatePracticeTaskHeight(taskInstance, instance = null) {
    const task = taskInstance?.taskSnapshot || {};
    const answerHeight = clampNumber(taskInstance?.layout?.answerHeight, 80, 520, defaultPracticeAnswerHeight(task));
    const mode = practiceLayoutMode(instance);
    const columns = mode === 'columns' ? practiceColumnCount(instance) : 1;
    const freeWidth = mode === 'free' ? clampNumber(taskInstance?.layout?.freeWidth, 0.28, 1, 0.96) : 1;
    const widthScale = mode === 'columns' ? 1 / columns : mode === 'free' ? freeWidth : 1;
    const titleChars = Math.max(16, Math.round(38 * widthScale));
    const instructionChars = Math.max(34, Math.round(86 * widthScale));
    const noteChars = Math.max(36, Math.round(92 * widthScale));
    const titleLines = Math.max(1, Math.ceil(String(task.title || '').length / titleChars));
    const instructionLines = Math.max(1, Math.ceil(String(task.instruction || '').length / instructionChars));
    const noteLines = task.note ? Math.max(1, Math.ceil(String(task.note).length / noteChars)) : 0;
    const hintAllowance = task.hint ? 18 : 0;
    const promptAllowance = task?.response?.renderer === 'math-step-list' ? 72 : 64;
    const actionAllowance = 48;
    const feedbackAllowance = 18;
    return 34 + titleLines * 19 + instructionLines * 15 + noteLines * 12 + hintAllowance
      + promptAllowance + answerHeight + actionAllowance + feedbackAllowance;
  }

  function practiceTasksOnPage(instance, pageIndex) {
    return (instance?.tasks || []).filter(item => Number(item?.layout?.pageIndex || 0) === Number(pageIndex));
  }

  function ensurePracticeFreeLayout(instance, pageIndex = null, options = {}) {
    const box = practicePageContentBox(instance);
    const pages = pageIndex === null
      ? Array.from({ length: Math.max(1, Number(instance?.pageCount) || 1) }, (_, index) => index)
      : [Math.max(0, Number(pageIndex) || 0)];
    pages.forEach(currentPage => {
      const pageTasks = practiceTasksOnPage(instance, currentPage);
      const needsAnyReset = options.reset || pageTasks.some(task => task.layout.freeX === null || task.layout.freeY === null || task.layout.freeWidth === null);
      if (!needsAnyReset) return;
      let usedY = 0;
      pageTasks.forEach(taskInstance => {
        const height = estimatePracticeTaskHeight(taskInstance, instance);
        taskInstance.layout.freeX = 0.02;
        taskInstance.layout.freeY = Math.max(0, usedY / box.height);
        taskInstance.layout.freeWidth = 0.96;
        usedY += height + 16;
      });
    });
    return instance;
  }

  function practiceFreeTaskRect(instance, taskInstance) {
    const box = practicePageContentBox(instance);
    const layout = taskInstance.layout;
    return {
      x: clampNumber(layout.freeX, 0, 0.94, 0.02) * box.width,
      y: clampNumber(layout.freeY, 0, 0.94, 0) * box.height,
      width: clampNumber(layout.freeWidth, 0.28, 1, 0.96) * box.width,
      height: estimatePracticeTaskHeight(taskInstance, instance)
    };
  }

  function practiceFreeLayoutIssues(instance, pageIndex = instance?.activePageIndex || 0) {
    const box = practicePageContentBox(instance);
    const tasks = practiceTasksOnPage(instance, pageIndex);
    const rects = tasks.map(task => ({ task, ...practiceFreeTaskRect(instance, task) }));
    const overflow = rects.some(rect => rect.x < -1 || rect.y < -1 || rect.x + rect.width > box.width + 1 || rect.y + rect.height > box.height + 1);
    let overlap = false;
    for (let i = 0; i < rects.length && !overlap; i += 1) {
      for (let j = i + 1; j < rects.length; j += 1) {
        const a = rects[i];
        const b = rects[j];
        const separated = a.x + a.width <= b.x + 4 || b.x + b.width <= a.x + 4 || a.y + a.height <= b.y + 4 || b.y + b.height <= a.y + 4;
        if (!separated) { overlap = true; break; }
      }
    }
    return { overflow, overlap };
  }

  function resetPracticeFreeLayout(instance, pageIndex = null) {
    ensurePracticeFreeLayout(instance, pageIndex, { reset: true });
    instance.page.paginationMode = 'manual';
    return instance;
  }

  function shortestPracticeColumn(instance, pageIndex, excludeTask = null) {
    const columns = practiceColumnCount(instance);
    const heights = Array.from({ length: columns }, () => 0);
    practiceTasksOnPage(instance, pageIndex).forEach(task => {
      if (task === excludeTask) return;
      const column = Math.max(0, Math.min(columns - 1, Number(task.layout.columnIndex) || 0));
      heights[column] += estimatePracticeTaskHeight(task, instance);
    });
    return heights.indexOf(Math.min(...heights));
  }

  function movePracticeTaskToColumn(instance, taskInstance, targetColumn) {
    const columns = practiceColumnCount(instance);
    taskInstance.layout.columnIndex = Math.max(0, Math.min(columns - 1, Number(targetColumn) || 0));
    instance.page.paginationMode = 'manual';
    renderBoardObjects();
    scheduleSave();
  }

  function setPracticeLayoutMode(instance, mode) {
    const next = ['flow', 'columns', 'free'].includes(mode) ? mode : 'flow';
    const previous = practiceLayoutMode(instance);
    if (next === 'free') {
      const hasSavedFreeLayout = instance.tasks.every(task => task.layout.freeX !== null && task.layout.freeY !== null && task.layout.freeWidth !== null);
      if (previous !== 'free' && !hasSavedFreeLayout) {
        instance.page.layoutMode = 'flow';
        instance.page.paginationMode = 'auto';
        autoPaginatePracticeInstance(instance, { preserveActive: true });
      }
      instance.page.layoutMode = 'free';
      instance.page.paginationMode = 'manual';
      normalizePracticePageNumbers(instance);
      if (hasSavedFreeLayout) ensurePracticeFreeLayout(instance);
      else resetPracticeFreeLayout(instance);
    } else {
      instance.page.layoutMode = next;
      instance.page.paginationMode = 'auto';
      autoPaginatePracticeInstance(instance, { preserveActive: true });
    }
    renderBoardObjects();
    scheduleSave();
  }

  function normalizePracticePageNumbers(instance) {
    const tasks = Array.isArray(instance?.tasks) ? instance.tasks : [];
    tasks.forEach(item => {
      const current = Number(item?.layout?.pageIndex);
      item.layout.pageIndex = Number.isInteger(current) && current >= 0 ? current : 0;
    });
    const highest = tasks.reduce((max, item) => Math.max(max, Number(item.layout.pageIndex) || 0), 0);
    instance.pageCount = Math.max(1, Number(instance.pageCount) || 1, highest + 1);
    instance.activePageIndex = Math.max(0, Math.min(instance.pageCount - 1, Number(instance.activePageIndex) || 0));
    return instance;
  }

  function autoPaginatePracticeInstance(instance, options = {}) {
    const tasks = Array.isArray(instance?.tasks) ? instance.tasks : [];
    const capacity = practicePageContentCapacity(instance);
    const mode = practiceLayoutMode(instance);
    if (mode === 'free') {
      normalizePracticePageNumbers(instance);
      ensurePracticeFreeLayout(instance);
      instance.page.paginationMode = 'manual';
      return instance;
    }

    let pageIndex = 0;
    if (mode === 'columns') {
      const columns = practiceColumnCount(instance);
      let heights = Array.from({ length: columns }, () => 0);
      tasks.forEach(taskInstance => {
        const height = Math.min(capacity, estimatePracticeTaskHeight(taskInstance, instance));
        let columnIndex = heights.indexOf(Math.min(...heights));
        if (Math.min(...heights) > 0 && heights[columnIndex] + height > capacity) {
          pageIndex += 1;
          heights = Array.from({ length: columns }, () => 0);
          columnIndex = 0;
        }
        taskInstance.layout.pageIndex = pageIndex;
        taskInstance.layout.columnIndex = columnIndex;
        heights[columnIndex] += height;
      });
    } else {
      let used = 0;
      tasks.forEach((taskInstance, index) => {
        const height = Math.min(capacity, estimatePracticeTaskHeight(taskInstance, instance));
        if (index > 0 && used > 0 && used + height > capacity) {
          pageIndex += 1;
          used = 0;
        }
        taskInstance.layout.pageIndex = pageIndex;
        taskInstance.layout.columnIndex = null;
        used += height;
      });
    }
    instance.pageCount = Math.max(1, pageIndex + 1);
    if (!options.preserveActive) instance.activePageIndex = 0;
    instance.activePageIndex = Math.max(0, Math.min(instance.pageCount - 1, Number(instance.activePageIndex) || 0));
    instance.page.paginationMode = 'auto';
    return instance;
  }

  function ensurePracticePagination(instance) {
    if (!instance?.tasks?.length) return instance;
    const hasAssignedPages = instance.tasks.every(item => Number.isInteger(item?.layout?.pageIndex));
    if (practiceLayoutMode(instance) === 'free') {
      normalizePracticePageNumbers(instance);
      ensurePracticeFreeLayout(instance);
      instance.page.paginationMode = 'manual';
      return instance;
    }
    if (instance.page?.paginationMode === 'manual' && hasAssignedPages) return normalizePracticePageNumbers(instance);
    return autoPaginatePracticeInstance(instance, { preserveActive: true });
  }

  function practiceTasksForPage(instance, pageIndex = instance?.activePageIndex || 0) {
    return practiceTasksOnPage(instance, pageIndex);
  }

  function setPracticeActivePage(instance, pageIndex, options = {}) {
    clearMathEditSession();
    const count = Math.max(1, Number(instance?.pageCount) || 1);
    instance.activePageIndex = Math.max(0, Math.min(count - 1, Number(pageIndex) || 0));
    if (options.render !== false) renderBoardObjects();
    if (options.save !== false) scheduleSave();
  }

  function movePracticeTaskToPage(instance, taskInstance, targetPage) {
    const target = Math.max(0, Number(targetPage) || 0);
    instance.page.paginationMode = 'manual';
    instance.pageCount = Math.max(Number(instance.pageCount) || 1, target + 1);
    taskInstance.layout.pageIndex = target;
    if (practiceLayoutMode(instance) === 'columns') {
      taskInstance.layout.columnIndex = shortestPracticeColumn(instance, target, taskInstance);
    }
    if (practiceLayoutMode(instance) === 'free') {
      taskInstance.layout.freeX = null;
      taskInstance.layout.freeY = null;
      taskInstance.layout.freeWidth = null;
      ensurePracticeFreeLayout(instance, target);
    }
    instance.activePageIndex = target;
    normalizePracticePageNumbers(instance);
    renderBoardObjects();
    scheduleSave();
  }

  function addPracticePage(instance) {
    instance.page.paginationMode = 'manual';
    instance.pageCount = Math.max(1, Number(instance.pageCount) || 1) + 1;
    instance.activePageIndex = instance.pageCount - 1;
    renderBoardObjects();
    scheduleSave();
  }

  function removeCurrentPracticePage(instance) {
    const pageIndex = Number(instance.activePageIndex) || 0;
    if ((instance.pageCount || 1) <= 1 || practiceTasksForPage(instance, pageIndex).length) return false;
    instance.tasks.forEach(item => {
      if ((Number(item.layout.pageIndex) || 0) > pageIndex) item.layout.pageIndex -= 1;
    });
    instance.pageCount -= 1;
    instance.activePageIndex = Math.max(0, Math.min(instance.pageCount - 1, pageIndex - 1));
    instance.page.paginationMode = 'manual';
    renderBoardObjects();
    scheduleSave();
    return true;
  }

  function normalizePracticePageTask(item, pageId, index) {
    const taskSnapshot = upgradeTaskRequirements(deepClone(item?.taskSnapshot || item?.task || item));
    if (!taskSnapshot || !taskSnapshot.response) return null;
    const response = normalizeBoardTaskResponse(taskSnapshot, item?.response);
    const result = resultMatchesCurrentResponse(item?.result || null, response, taskSnapshot) ? (item?.result || null) : null;
    return {
      id: String(item?.id || `${pageId}-task-${index + 1}`),
      taskSnapshot,
      response,
      result,
      layout: normalizePracticeTaskLayout(item?.layout, taskSnapshot)
    };
  }

  function normalizeBoardPracticeInstance(instance) {
    if (!instance || typeof instance !== 'object') return null;
    const id = String(instance.id || `board-practice-${Date.now()}`);
    if (instance.kind === 'external-module') {
      return {
        id,
        kind: 'external-module',
        practiceSetId: String(instance.practiceSetId || ''),
        title: String(instance.title || 'Interaktyvios pratybos'),
        subtitle: String(instance.subtitle || 'Išorinis pratybų modulis'),
        moduleUrl: String(instance.moduleUrl || ''),
        moduleId: String(instance.moduleId || ''),
        moduleVersion: String(instance.moduleVersion || ''),
        moduleState: instance.moduleState && typeof instance.moduleState === 'object' ? deepClone(instance.moduleState) : {},
        moduleMode: instance.moduleMode === 'self' ? 'self' : 'class',
        moduleCurrentIndex: Math.max(0, Number(instance.moduleCurrentIndex) || 0),
        moduleView: ['start', 'task', 'end'].includes(instance.moduleView) ? instance.moduleView : 'start',
        x: Number.isFinite(instance.x) ? instance.x : 0.025,
        y: Number.isFinite(instance.y) ? instance.y : 0.035,
        width: Number.isFinite(instance.width) ? instance.width : 0.62,
        height: Number.isFinite(instance.height) ? instance.height : 0.86,
        collapsed: Boolean(instance.collapsed)
      };
    }
    const sourceTasks = Array.isArray(instance.tasks)
      ? instance.tasks
      : Array.isArray(instance.snapshots)
        ? instance.snapshots
        : [];
    const normalizedTasks = sourceTasks.map((item, index) => normalizePracticePageTask(item, id, index)).filter(Boolean);
    if (!normalizedTasks.length) return null;
    const normalized = {
      id,
      practiceSetId: String(instance.practiceSetId || ''),
      title: String(instance.title || 'Interaktyvios pratybos'),
      subtitle: String(instance.subtitle || 'Kelių puslapių pratybos'),
      tasks: normalizedTasks,
      x: Number.isFinite(instance.x) ? instance.x : 0.025,
      y: Number.isFinite(instance.y) ? instance.y : 0.035,
      width: Number.isFinite(instance.width) ? instance.width : 0.5,
      height: Number.isFinite(instance.height) ? instance.height : 0.86,
      collapsed: Boolean(instance.collapsed),
      activePageIndex: Math.max(0, Number(instance.activePageIndex ?? instance.pageNumber - 1) || 0),
      pageCount: Math.max(1, Number(instance.pageCount) || 1),
      page: normalizePracticePageConfig(instance.page)
    };
    return ensurePracticePagination(normalized);
  }

  function libraryEntryForTaskId(taskId) {
    return state.library.tasks.find(entry => entry.taskId === taskId || entry.task?.id === taskId) || null;
  }

  function upsertTaskInLibrary(task, source = 'mokytojas', options = {}) {
    const existing = libraryEntryForTaskId(task.id);
    const entry = createLibraryEntry(task, source, existing);
    if (existing) {
      const index = state.library.tasks.indexOf(existing);
      state.library.tasks[index] = entry;
    } else state.library.tasks.unshift(entry);
    if (!options.silent) {
      scheduleSave();
      renderLibrary();
      showToast(existing ? `Bibliotekoje atnaujinta „${task.title}“` : `Bibliotekoje išsaugota „${task.title}“`);
    }
    return entry;
  }

  function addTasksToLibrary(importedTasks, source = 'DI importas') {
    importedTasks.forEach(task => upsertTaskInLibrary(task, source, { silent: true }));
    scheduleSave();
  }

  function libraryGate(entry) {
    const task = deepClone(entry.task);
    return runTaskQualityGate(task);
  }

  function libraryStatusLabel(status) {
    return status === 'ready' ? 'Paruošta' : status === 'unsupported' ? 'Nepalaikoma' : 'Reikia dėmesio';
  }

  function populateLibraryFilter(select, values, previousValue) {
    const first = select.options[0]?.outerHTML || '<option value="">Visi</option>';
    select.innerHTML = first;
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'lt')).forEach(value => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
    if ([...select.options].some(option => option.value === previousValue)) select.value = previousValue;
  }

  function refreshLibraryFilters() {
    const values = state.library.tasks.map(entry => entry.metadata || {});
    populateLibraryFilter(refs.libraryClassFilter, values.map(item => item.classLevel), refs.libraryClassFilter.value);
    populateLibraryFilter(refs.libraryTopicFilter, values.map(item => item.topic), refs.libraryTopicFilter.value);
    populateLibraryFilter(refs.libraryTypeFilter, values.map(item => item.type), refs.libraryTypeFilter.value);
    populateLibraryFilter(refs.libraryDifficultyFilter, values.map(item => item.difficulty), refs.libraryDifficultyFilter.value);
  }

  function matchesLibraryFilters(entry) {
    const query = refs.librarySearch.value.trim().toLocaleLowerCase('lt');
    const gate = libraryGate(entry);
    const haystack = [entry.task.title, entry.task.instruction, entry.task.prompt?.value, entry.metadata.classLevel, entry.metadata.topic, entry.metadata.type, entry.metadata.difficulty]
      .join(' ').toLocaleLowerCase('lt');
    return (!query || haystack.includes(query))
      && (!refs.libraryClassFilter.value || entry.metadata.classLevel === refs.libraryClassFilter.value)
      && (!refs.libraryTopicFilter.value || entry.metadata.topic === refs.libraryTopicFilter.value)
      && (!refs.libraryTypeFilter.value || entry.metadata.type === refs.libraryTypeFilter.value)
      && (!refs.libraryDifficultyFilter.value || entry.metadata.difficulty === refs.libraryDifficultyFilter.value)
      && (!refs.libraryStatusFilter.value || gate.status === refs.libraryStatusFilter.value);
  }

  function createLibraryMathPreview(task) {
    const holder = document.createElement('div');
    holder.className = 'library-math-preview';
    try {
      holder.appendChild(task.prompt?.kind === 'equation'
        ? equationToMathML(parseEquation(task.prompt.value))
        : astToMathML(parseExpression(task.prompt.value)));
    } catch (_) {
      holder.textContent = task.prompt?.value || 'Matematinis turinys nenurodytas';
    }
    return holder;
  }

  function updateLibrarySelectionBar() {
    const entries = selectedLibraryEntries();
    const count = entries.length;
    const readyCount = entries.filter(entry => libraryGate(entry).status === 'ready').length;
    refs.librarySelectionLabel.textContent = count ? `Pasirinkta: ${count}` : 'Nepasirinkta užduočių';
    refs.libraryInsertSelectedButton.disabled = readyCount < 1;
    refs.libraryInsertSelectedButton.textContent = readyCount ? `Įterpti į lentą (${readyCount})` : 'Įterpti pasirinktas į lentą';
    refs.libraryBuildPracticeButton.disabled = count < 1;
  }

  function renderLibraryTasks() {
    refreshLibraryFilters();
    refs.libraryTaskGrid.replaceChildren();
    const filtered = state.library.tasks.filter(matchesLibraryFilters);
    refs.libraryResultsLabel.textContent = `Rodoma ${filtered.length} iš ${state.library.tasks.length} užduočių`;
    refs.libraryEmpty.hidden = filtered.length > 0;
    filtered.forEach(entry => {
      const gate = libraryGate(entry);
      const card = document.createElement('article');
      card.className = 'library-task-card';
      card.dataset.libraryTaskId = entry.id;
      card.classList.toggle('is-selected', selectedLibraryTaskIds.has(entry.id));

      const selection = document.createElement('label');
      selection.className = 'library-task-select';
      selection.innerHTML = `<input type="checkbox" ${selectedLibraryTaskIds.has(entry.id) ? 'checked' : ''} aria-label="Pasirinkti ${escapeHtml(entry.task.title)}" /><span></span>`;
      selection.querySelector('input').addEventListener('change', event => {
        if (event.target.checked) selectedLibraryTaskIds.add(entry.id); else selectedLibraryTaskIds.delete(entry.id);
        card.classList.toggle('is-selected', event.target.checked);
        updateLibrarySelectionBar();
      });

      const body = document.createElement('div');
      body.className = 'library-task-body';
      body.innerHTML = `
        <div class="library-task-title-row">
          <div><h3>${escapeHtml(entry.task.title || 'Užduotis')}</h3><span>${escapeHtml(entry.metadata.topic)} · ${escapeHtml(entry.metadata.classLevel)}</span></div>
          <span class="library-status is-${gate.status}" title="${escapeHtml(gate.summary)}">${gate.status === 'ready' ? '✓' : gate.status === 'unsupported' ? '×' : '!' } ${libraryStatusLabel(gate.status)}</span>
        </div>
        <p class="library-task-instruction">${escapeHtml(entry.task.instruction || '')}</p>
      `;
      body.appendChild(createLibraryMathPreview(entry.task));
      const chips = document.createElement('div');
      chips.className = 'library-task-chips';
      [entry.metadata.type, entry.metadata.difficulty, `v${entry.version}`, entry.source].forEach(text => {
        const chip = document.createElement('span'); chip.textContent = text; chips.appendChild(chip);
      });
      body.appendChild(chips);

      const actions = document.createElement('div');
      actions.className = 'library-task-actions';
      const insert = document.createElement('button');
      insert.type = 'button'; insert.className = 'secondary-button compact'; insert.textContent = 'Į lentą';
      insert.disabled = gate.status !== 'ready';
      insert.title = gate.status === 'ready' ? 'Įterpti sprendžiamą užduoties kopiją į lentą' : 'Pirmiausia užduotis turi praeiti patikimumo vartus';
      insert.addEventListener('click', () => insertLibraryTaskIntoBoard(entry));
      const edit = document.createElement('button');
      edit.type = 'button'; edit.className = 'secondary-button compact'; edit.textContent = 'Redaguoti';
      edit.addEventListener('click', () => editLibraryTask(entry));
      actions.append(insert, edit);
      body.appendChild(actions);
      card.append(selection, body);
      refs.libraryTaskGrid.appendChild(card);
    });
    updateLibrarySelectionBar();
  }

  function renderLibraryPractices() {
    refs.libraryPracticeList.replaceChildren();
    const sets = state.library.practiceSets;
    refs.libraryPracticesEmpty.hidden = sets.length > 0;
    sets.forEach(set => {
      const card = document.createElement('article');
      card.className = 'library-practice-card';
      card.dataset.practiceSetId = set.id;
      const practiceMeta = set.kind === 'external-module'
        ? `${set.taskCount || 0} užduotys · ${escapeHtml(set.description || `v${set.moduleVersion || ''}`)}`
        : `${set.snapshots.length} užduotys · versijos užfiksuotos ${new Date(set.createdAt).toLocaleDateString('lt-LT')}`;
      card.innerHTML = `
        <div class="library-practice-card-copy">
          <span class="library-practice-icon" aria-hidden="true">${set.kind === 'external-module' ? 'ƒ' : '▤'}</span>
          <div><h3>${escapeHtml(set.title)}</h3><p>${practiceMeta}</p></div>
        </div>
        <div class="library-practice-card-actions"></div>
      `;
      const actions = card.querySelector('.library-practice-card-actions');
      const open = document.createElement('button');
      open.type = 'button'; open.className = 'primary-button compact'; open.textContent = 'Įterpti pratybas';
      open.addEventListener('click', () => insertPracticeSetIntoBoard(set));
      actions.appendChild(open);
      if (set.handoutUrl) { const handout=document.createElement('a'); handout.className='secondary-button compact'; handout.href=set.handoutUrl; handout.target='_blank'; handout.rel='noopener'; handout.textContent='Konspektas PDF'; actions.appendChild(handout); }
      if (!set.builtIn) {
        const remove = document.createElement('button');
        remove.type = 'button'; remove.className = 'secondary-button compact danger-text'; remove.textContent = 'Pašalinti';
        remove.addEventListener('click', () => {
          if (!window.confirm(`Pašalinti pratybų juodraštį „${set.title}“?`)) return;
          state.library.practiceSets = state.library.practiceSets.filter(item => item.id !== set.id);
          renderLibrary(); scheduleSave();
        });
        actions.appendChild(remove);
      }
      refs.libraryPracticeList.appendChild(card);
    });
  }

  function renderLibrary() {
    if (!state?.library) return;
    refs.libraryTaskCount.textContent = String(state.library.tasks.length);
    refs.libraryPracticeCount.textContent = String(state.library.practiceSets.length);
    refs.libraryTasksTab.classList.toggle('is-active', libraryActiveTab === 'tasks');
    refs.libraryPracticesTab.classList.toggle('is-active', libraryActiveTab === 'practices');
    refs.libraryTasksTab.setAttribute('aria-selected', String(libraryActiveTab === 'tasks'));
    refs.libraryPracticesTab.setAttribute('aria-selected', String(libraryActiveTab === 'practices'));
    refs.libraryTasksView.hidden = libraryActiveTab !== 'tasks';
    refs.libraryPracticesView.hidden = libraryActiveTab !== 'practices';
    if (libraryActiveTab === 'tasks') renderLibraryTasks(); else renderLibraryPractices();
  }

  function openLibrary(tab = 'tasks') {
    if (onlineAccessRole !== 'teacher') {
      showToast('Biblioteką valdo mokytojas');
      return;
    }
    libraryActiveTab = tab;
    refs.libraryModal.hidden = false;
    renderLibrary();
    requestAnimationFrame(() => (tab === 'tasks' ? refs.librarySearch : refs.libraryPracticesTab).focus());
  }

  function closeLibrary() {
    refs.libraryModal.hidden = true;
  }

  function clearLibraryFilters() {
    refs.librarySearch.value = '';
    [refs.libraryClassFilter, refs.libraryTopicFilter, refs.libraryTypeFilter, refs.libraryDifficultyFilter, refs.libraryStatusFilter].forEach(select => { select.value = ''; });
    renderLibraryTasks();
  }

  function selectedLibraryEntries() {
    return [...selectedLibraryTaskIds].map(id => state.library.tasks.find(entry => entry.id === id)).filter(Boolean);
  }

  function boardTaskPixelRect(instance, boardRect = getBoardWorldRect()) {
    const width = Math.min(boardRect.width, Math.max(330, Math.min(680, Number(instance.width || 0.43) * boardRect.width)));
    const height = Math.min(boardRect.height, Math.max(300, Math.min(760, Number(instance.height || 0.38) * boardRect.height)));
    return { x: Number(instance.x || 0) * boardRect.width, y: Number(instance.y || 0) * boardRect.height, width, height };
  }

  function boardPracticePixelRect(instance, boardRect = getBoardWorldRect()) {
    const external = instance?.kind === 'external-module';
    const requestedWidth = Number(instance.width || 0.5) * boardRect.width;
    const requestedHeight = Number(instance.height || 0.86) * boardRect.height;
    // Išorinis pratybų modulis yra tikras keičiamo dydžio langas: jo vartotojo
    // nustatytas dydis neturi būti nukerpamas iki seno puslapinių pratybų 760/980 px limito.
    const width = external
      ? Math.min(boardRect.width, Math.max(520, requestedWidth))
      : Math.min(boardRect.width, Math.max(470, Math.min(760, requestedWidth)));
    const height = external
      ? Math.min(boardRect.height, Math.max(560, requestedHeight))
      : Math.min(boardRect.height, Math.max(560, Math.min(980, requestedHeight)));
    return { x: Number(instance.x || 0) * boardRect.width, y: Number(instance.y || 0) * boardRect.height, width, height };
  }

  function boardRectsOverlap(a, b, gap = 16) {
    return !(a.x + a.width + gap <= b.x || b.x + b.width + gap <= a.x || a.y + a.height + gap <= b.y || b.y + b.height + gap <= a.y);
  }

  function nextBoardTaskPlacement(pendingInstances = []) {
    const boardRect = getBoardWorldRect();
    const boardWidth = Math.max(1, boardRect.width);
    const boardHeight = Math.max(1, boardRect.height);
    const margin = 22;
    const gap = 22;
    const width = Math.min(540, Math.max(330, boardWidth >= 820 ? boardWidth * 0.43 : boardWidth - margin * 2));
    const height = Math.min(500, Math.max(300, boardHeight * 0.36));
    const occupied = [
      ...state.boardTasks.map(item => boardTaskPixelRect(item, boardRect)),
      ...state.boardPractices.map(item => boardPracticePixelRect(item, boardRect)),
      ...pendingInstances.map(item => boardTaskPixelRect(item, boardRect))
    ];
    const columns = Math.max(1, Math.floor((boardWidth - margin * 2 + gap) / (width + gap)));
    const rows = Math.max(1, Math.floor((boardHeight - margin * 2 + gap) / (height + gap)));
    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const candidate = { x: margin + column * (width + gap), y: margin + row * (height + gap), width, height };
        if (candidate.x + width > boardWidth - margin + 1 || candidate.y + height > boardHeight - margin + 1) continue;
        if (!occupied.some(rect => boardRectsOverlap(candidate, rect))) {
          return { x: candidate.x / boardWidth, y: candidate.y / boardHeight, width: width / boardWidth, height: height / boardHeight };
        }
      }
    }
    const cascade = occupied.length % Math.max(1, columns * rows);
    const column = cascade % columns;
    const row = Math.floor(cascade / columns) % rows;
    const shift = Math.floor(occupied.length / Math.max(1, columns * rows)) * 18;
    return {
      x: Math.min(Math.max(0, boardWidth - width) / boardWidth, (margin + column * (width + gap) + shift) / boardWidth),
      y: Math.min(Math.max(0, boardHeight - height) / boardHeight, (margin + row * (height + gap) + shift) / boardHeight),
      width: width / boardWidth,
      height: height / boardHeight
    };
  }

  function nextBoardPracticePlacement() {
    const boardRect = getBoardWorldRect();
    const boardWidth = Math.max(1, boardRect.width);
    const boardHeight = Math.max(1, boardRect.height);
    const margin = 20;
    const width = Math.min(680, Math.max(500, boardWidth >= 1050 ? boardWidth * 0.49 : boardWidth * 0.68));
    const height = Math.min(920, Math.max(600, boardHeight - margin * 2));
    const occupied = [
      ...state.boardTasks.map(item => boardTaskPixelRect(item, boardRect)),
      ...state.boardPractices.map(item => boardPracticePixelRect(item, boardRect))
    ];
    const candidates = [
      { x: margin, y: margin },
      { x: Math.max(margin, boardWidth - width - margin), y: margin },
      { x: margin, y: Math.max(margin, boardHeight - height - margin) }
    ];
    const free = candidates.find(point => !occupied.some(rect => boardRectsOverlap({ ...point, width, height }, rect, 18)));
    const point = free || { x: margin + (occupied.length % 4) * 24, y: margin + (occupied.length % 4) * 24 };
    return {
      x: Math.min(Math.max(0, boardWidth - width), point.x) / boardWidth,
      y: Math.min(Math.max(0, boardHeight - height), point.y) / boardHeight,
      width: width / boardWidth,
      height: height / boardHeight
    };
  }

  function collapsePrimaryPracticeForBoardTasks() {
    state.window.shelved = true;
    refs.practiceWindow.hidden = true;
    scheduleSave();
  }

  function revealPrimaryPracticeWindow() {
    state.window.shelved = false;
    refs.practiceWindow.hidden = false;
  }

  function insertLibraryTasksIntoBoard(entries) {
    const readyEntries = entries.filter(entry => libraryGate(entry).status === 'ready');
    if (!readyEntries.length) {
      showToast('Pasirinktos užduotys dar neparuoštos sprendimui');
      return;
    }
    const startedAt = Date.now();
    const pendingInstances = [];
    readyEntries.forEach((entry, index) => {
      const placement = nextBoardTaskPlacement(pendingInstances);
      const taskSnapshot = deepClone(entry.task);
      const instance = {
        id: `board-task-${startedAt}-${index}`,
        libraryTaskId: entry.id,
        taskSnapshot,
        response: defaultResponse(taskSnapshot),
        result: null,
        collapsed: false,
        ...placement
      };
      pendingInstances.push(instance);
    });
    state.boardTasks.push(...pendingInstances);
    if (pendingInstances.at(-1)?.id) setActiveBoardObject('task', pendingInstances.at(-1).id, { save: false });
    selectedLibraryTaskIds.clear();
    collapsePrimaryPracticeForBoardTasks();
    renderBoardObjects();
    scheduleSave();
    closeLibrary();
    showToast(readyEntries.length === 1 ? 'Užduotis įterpta ir paruošta spręsti' : `${readyEntries.length} užduotys įterptos ir paruoštos spręsti`);
  }

  function insertLibraryTaskIntoBoard(entry) {
    insertLibraryTasksIntoBoard([entry]);
  }

  function activateTaskPackage(taskSnapshots, title, eyebrow = 'BIBLIOTEKOS PRATYBOS · P7.7.2') {
    const preparedTasks = taskSnapshots.map(task => {
      const copy = deepClone(task); copy.qualityGate = runTaskQualityGate(copy); return copy;
    });
    if (!preparedTasks.length) return false;
    practicePackage = normalizePackage({
      schemaVersion: 1,
      contract: 'interactive-practice-package@1',
      id: `library-package-${Date.now()}`,
      title,
      eyebrow,
      tasks: preparedTasks
    });
    tasks = practicePackage.tasks;
    state.packageData = practicePackage;
    state.currentTask = 0;
    resetResponsesForCurrentTasks({}, {});
    editorDirty = false;
    renderTask(); renderAuthoringTaskList(); populateEditor();
    // ONLINE-P1.1.7: pratybų atvaizdavimas nebėra tapatinamas su prisijungimo role.
    // Ir mokytojas, ir mokinys pagal nutylėjimą mato tas pačias sprendžiamas pratybas.
    // Rengyklė atidaroma tik aiškiu mokytojo veiksmu iš Bibliotekos.
    setMode('student', { force: true, allowEmpty: true });
    requestAnimationFrame(centerPracticeWindow);
    scheduleSave();
    return true;
  }


  function editLibraryTask(entry) {
    activateTaskPackage([entry.task], entry.task.title || 'Bibliotekos užduotis', 'BIBLIOTEKOS UŽDUOTIES REDAGAVIMAS · P7.7.2');
    setMode('teacher', { force: true });
    closeLibrary();
    showToast('Užduotis atidaryta mokytojo režime');
  }

  function buildPracticeFromSelection() {
    const entries = selectedLibraryEntries();
    if (!entries.length) return;
    const defaultTitle = `Naujos pratybos (${entries.length} užd.)`;
    const title = window.prompt('Pratybų pavadinimas', defaultTitle);
    if (title === null) return;
    const now = new Date().toISOString();
    const set = {
      id: `practice-set-${Date.now()}`,
      title: title.trim() || defaultTitle,
      createdAt: now,
      updatedAt: now,
      taskRefs: entries.map(entry => ({ libraryTaskId: entry.id, taskId: entry.taskId, version: entry.version })),
      snapshots: entries.map(entry => deepClone(entry.task))
    };
    state.library.practiceSets.unshift(set);
    selectedLibraryTaskIds.clear();
    renderLibrary(); scheduleSave();
    showToast(`Sukurtas kelių puslapių pratybų juodraštis iš ${entries.length} užduočių`);
    insertPracticeSetIntoBoard(set);
  }

  function insertPracticeSetIntoBoard(set) {
    if (set?.kind === 'external-module') {
      if (!set.moduleUrl || !set.moduleId) {
        showToast('Nepavyko rasti pratybų modulio failo');
        return;
      }
      const id = `board-practice-${Date.now()}`;
      const instance = normalizeBoardPracticeInstance({
        id,
        kind: 'external-module',
        practiceSetId: set.id,
        title: set.title,
        subtitle: set.description || 'Interaktyvios pratybos',
        moduleUrl: set.moduleUrl,
        moduleId: set.moduleId,
        moduleVersion: set.moduleVersion,
        moduleState: {},
        moduleMode: 'class',
        moduleCurrentIndex: 0,
        moduleView: 'start',
        collapsed: false,
        ...nextBoardPracticePlacement()
      });
      if (!instance) return;
      state.boardPractices.push(instance);
      setActiveBoardObject('practice', instance.id, { save: false });
      collapsePrimaryPracticeForBoardTasks();
      renderBoardObjects();
      scheduleSave();
      closeLibrary();
      showToast(`Įterptos pratybos „${set.title}“`);
      return;
    }
    const readySnapshots = (set.snapshots || []).filter(task => runTaskQualityGate(deepClone(task)).status === 'ready');
    if (!readySnapshots.length) {
      showToast('Šiame rinkinyje nėra mokiniui paruoštų užduočių');
      return;
    }
    const id = `board-practice-${Date.now()}`;
    const instance = normalizeBoardPracticeInstance({
      id,
      practiceSetId: set.id,
      title: set.title,
      subtitle: 'Interaktyvios pratybos',
      tasks: readySnapshots.map((task, index) => ({
        id: `${id}-task-${index + 1}`,
        taskSnapshot: deepClone(task),
        response: defaultResponse(task),
        result: null
      })),
      collapsed: false,
      activePageIndex: 0,
      pageCount: 1,
      page: { size: 'A4', orientation: 'portrait', viewMode: 'fit-page', layoutMode: 'flow', columns: 2, paginationMode: 'auto' },
      ...nextBoardPracticePlacement()
    });
    if (!instance) return;
    state.boardPractices.push(instance);
    setActiveBoardObject('practice', instance.id, { save: false });
    collapsePrimaryPracticeForBoardTasks();
    renderBoardObjects();
    scheduleSave();
    closeLibrary();
    showToast(`Įterptos kelių puslapių pratybos „${set.title}“`);
  }

  function saveCurrentTaskToLibrary() {
    if (editorDirty && !saveEditorChanges()) return;
    upsertTaskInLibrary(currentTask(), 'mokytojas');
  }

  function installLibraryEvents() {
    refs.libraryButton.addEventListener('click', () => openLibrary('tasks'));
    refs.closeLibraryButton.addEventListener('click', closeLibrary);
    refs.libraryModal.addEventListener('click', event => { if (event.target.dataset.libraryClose === 'true') closeLibrary(); });
    refs.libraryTasksTab.addEventListener('click', () => { libraryActiveTab = 'tasks'; renderLibrary(); });
    refs.libraryPracticesTab.addEventListener('click', () => { libraryActiveTab = 'practices'; renderLibrary(); });
    [refs.librarySearch, refs.libraryClassFilter, refs.libraryTopicFilter, refs.libraryTypeFilter, refs.libraryDifficultyFilter, refs.libraryStatusFilter]
      .forEach(control => control.addEventListener(control.tagName === 'INPUT' ? 'input' : 'change', renderLibraryTasks));
    refs.libraryClearFiltersButton.addEventListener('click', clearLibraryFilters);
    refs.libraryInsertSelectedButton.addEventListener('click', () => {
      insertLibraryTasksIntoBoard(selectedLibraryEntries());
    });
    refs.libraryBuildPracticeButton.addEventListener('click', buildPracticeFromSelection);
    refs.saveTaskToLibraryButton.addEventListener('click', saveCurrentTaskToLibrary);
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !refs.libraryModal.hidden) closeLibrary();
    });
  }

  // -------------------- P7.7.2 vietinis DI generavimo ir importo darbo srautas --------------------

  function setAiImportStatus(type, message) {
    refs.aiImportStatus.className = 'ai-import-status';
    refs.aiImportStatus.textContent = message || '';
    if (type && message) refs.aiImportStatus.classList.add(`is-${type}`);
  }

  function copyTextToClipboard(text, successMessage) {
    const source = String(text || '');
    if (!source) {
      showToast('Nėra ką kopijuoti');
      return;
    }
    const fallbackCopy = () => {
      const textarea = document.createElement('textarea');
      textarea.value = source;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      textarea.remove();
      return copied;
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(source)
        .then(() => showToast(successMessage))
        .catch(() => showToast(fallbackCopy() ? successMessage : 'Nepavyko nukopijuoti'));
    } else {
      showToast(fallbackCopy() ? successMessage : 'Nepavyko nukopijuoti');
    }
  }

  function buildAiGenerationPrompt() {
    const teacherRequest = refs.aiTeacherRequest.value.trim();
    if (!teacherRequest) throw new Error('Pirmiausia įrašyk, kokių pratybų reikia.');
    const packageTitle = refs.packageTitleInput.value.trim() || practicePackage.title || 'Interaktyvios matematikos pratybos';
    return `Tu kuri struktūrizuotą interaktyvių matematikos pratybų paketą programai „Virtuali lenta + interaktyvios pratybos P7.7.2“.

MOKYTOJO PRAŠYMAS:
${teacherRequest}

DABARTINĖS PROGRAMOS PALAIKYMO RIBOS:
1. Reiškinio užduotis: prompt.kind = "expression", vienas matematinis atsakymas, validator = "expression-equivalence". Privaloma pateikti matematiškai lygiavertį response.options.expected.
2. Tiesinės lygties užduotis: prompt.kind = "equation", sprendimo žingsniai, validator = "linear-equation-chain". Lygtis turi būti su kintamuoju x, susivesti į tiesinę lygtį ir turėti vieną sprendinį. Atsakymo reikšmės nerašyk – programa ją apskaičiuoja pati.
3. Kvadratinės lygties užduotis: prompt.kind = "equation", sprendimo žingsniai, validator = "quadratic-equation-chain". Lygtis turi būti ne aukštesnio kaip antrojo laipsnio, be x vardiklyje ir turėti du racionalius sprendinius, vieną dvigubą racionalų sprendinį arba neturėti realiųjų sprendinių. Atsakymo reikšmių nerašyk – programa jas apskaičiuoja pati.
4. Dalybą matematiniame turinyje žymėk dvitaškiu „:“, laipsnius – ženklu ^, pvz., x^2.
5. Lygčių sistemų, nelygybių, iracionaliųjų kvadratinių šaknų ir kitų dar nepalaikomų tipų nevadink paruoštais. Jeigu mokytojo prašymas jų reikalauja, įrašyk aiškų paaiškinimą lauke generationNotes; programa tokias užduotis blokuos patikimumo vartais.
6. Mokinys viename matematiniame laukelyje rašo vieną lygtį. Kvadratinės lygties alternatyvios šakos rodomos atskiruose tos pačios eilutės laukeliuose; šios sąsajos struktūros nereikia koduoti užduoties JSON.
7. Nenaudok HTML, LaTeX komandų ar Markdown matematiniame lauke. Naudok paprastą tekstinę matematinę sintaksę.
8. Jeigu užduotis turi kelias vertinimo sąlygas, pridėk assessment.criteria. Matematinė reikšmė ar sprendinys yra primary. Papildoma atsakymo forma ar reikalaujama eiga paprastai yra secondary. Jeigu visas užduoties tikslas yra pavidalo pakeitimas, atsakymo formos kriterijus taip pat yra primary.

GRĄŽINK TIK GALIOJANTĮ JSON, BE MARKDOWN KODO BLOKO IR BE JOKIO TEKSTO PRIEŠ AR PO JSON.

JSON SUTARTIS:
{
  "schemaVersion": 1,
  "contract": "interactive-practice-package@1",
  "id": "trumpas-unikalus-rinkinio-id",
  "title": "${packageTitle.replace(/"/g, '\\"')}",
  "eyebrow": "DI SUGENERUOTOS PRATYBOS · P7.7.2",
  "generationNotes": "nebūtinos pastabos mokytojui",
  "tasks": [
    {
      "id": "unikalus-uzduoties-id",
      "title": "Trumpas pavadinimas",
      "instruction": "Aiški instrukcija mokiniui",
      "difficulty": "Pagrindai | Vidutinė | Sudėtingesnė",
      "prompt": { "kind": "expression", "value": "(2x^2 + 4x) : (2x)" },
      "note": "Nebūtina pastaba arba apibrėžimo sąlyga",
      "hint": "Trumpa užuomina",
      "response": {
        "renderer": "single-math-input",
        "valueType": "expression",
        "label": "Galutinis reiškinys",
        "placeholder": "Pvz., x + 2",
        "validator": "expression-equivalence",
        "options": {
          "expected": "x + 2",
          "expectedDisplay": "x + 2",
          "requireSimplified": true,
          "domain": "x ≠ 0",
          "samples": [-7, -3, -1, 0.5, 2, 5, 11]
        }
      }
    },
    {
      "id": "unikalus-lygties-id",
      "title": "Išspręsk lygtį",
      "instruction": "Išspręsk lygtį, parodydamas sprendimo eigą.",
      "difficulty": "Vidutinė",
      "prompt": { "kind": "equation", "value": "3(x - 2) + 5 = 2x + 7" },
      "note": "Kiekvienas žingsnis turi išlaikyti tą pačią sprendinių aibę.",
      "hint": "Pirmiausia išskleisk skliaustus.",
      "response": {
        "renderer": "math-step-list",
        "valueType": "equation",
        "label": "Sprendimo eiga",
        "placeholder": "Pvz., 3x - 1 = 2x + 7",
        "validator": "linear-equation-chain",
        "options": { "minimumSteps": 2 }
      }
    },
    {
      "id": "unikalus-kvadratines-lygties-id",
      "title": "Išspręsk kvadratinę lygtį",
      "instruction": "Išspręsk kvadratinę lygtį, parodydamas sprendimo eigą.",
      "difficulty": "Sudėtingesnė",
      "prompt": { "kind": "equation", "value": "x^2 - 5x + 6 = 0" },
      "note": "Kai sprendimas išsišakoja, mokinys pasirenka alternatyvių lygčių žingsnį ir kiekvieną lygtį rašo atskirame laukelyje.",
      "hint": "Išskaidyk daugianarį dauginamaisiais.",
      "response": {
        "renderer": "math-step-list",
        "valueType": "equation",
        "label": "Sprendimo eiga",
        "placeholder": "Pvz., (x - 2)(x - 3) = 0",
        "validator": "quadratic-equation-chain",
        "options": { "minimumSteps": 2 }
      }
    }
  ]
}

KOKYBĖS REIKALAVIMAI:
- Sukurk tik tiek užduočių, kiek prašo mokytojas.
- Kiekvieną užduotį matematiškai perskaičiuok prieš grąžindamas.
- Reiškinio expected turi būti lygiavertis prompt.value.
- Užduotys turi palaipsniui sunkėti, kai to prašoma.
- Kiekvienas id turi būti unikalus visame pakete.
- Nepridėk laukų su null reikšmėmis.`;
  }

  function generateAiPrompt() {
    try {
      const prompt = buildAiGenerationPrompt();
      refs.aiPromptOutput.value = prompt;
      refs.copyAiPromptButton.disabled = false;
      setAiImportStatus('info', 'DI užklausa parengta. Nukopijuok ją į DI pokalbį, o gautą JSON įklijuok trečiame žingsnyje.');
    } catch (error) {
      setAiImportStatus('error', error.message);
      refs.aiTeacherRequest.focus();
    }
  }

  function stripJsonFence(source) {
    let text = String(source || '').trim().replace(/^\uFEFF/, '');
    const fenced = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    if (fenced) text = fenced[1].trim();
    return text;
  }

  function allocateImportedId(candidate, usedIds, index) {
    const base = safeString(candidate, `ai-task-${index + 1}`)
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || `ai-task-${index + 1}`;
    let id = base;
    let suffix = 2;
    while (usedIds.has(id)) id = `${base}-${suffix++}`;
    usedIds.add(id);
    return id;
  }

  function normalizeImportedTask(rawTask, index, usedIds) {
    if (!rawTask || typeof rawTask !== 'object' || Array.isArray(rawTask)) throw new Error(`${index + 1} užduotis nėra JSON objektas.`);
    const rawResponse = rawTask.response && typeof rawTask.response === 'object' ? rawTask.response : {};
    const rawOptions = rawResponse.options && typeof rawResponse.options === 'object' ? rawResponse.options : {};
    const promptObject = rawTask.prompt && typeof rawTask.prompt === 'object' ? rawTask.prompt : {};
    const promptValue = safeString(promptObject.value || rawTask.math || rawTask.expression || rawTask.equation);
    const inferredKind = hasTopLevelEquality(promptValue) ? 'equation' : 'expression';
    const promptKind = promptObject.kind === 'equation' || promptObject.kind === 'expression' ? promptObject.kind : inferredKind;
    const equationMode = promptKind === 'equation';
    const importedAnalysis = equationMode ? analyzeMathContent(promptValue, 'equation') : null;
    const defaultRenderer = equationMode ? 'math-step-list' : 'single-math-input';
    const defaultValidator = equationMode ? (importedAnalysis?.validator || 'linear-equation-chain') : 'expression-equivalence';
    const renderer = safeString(rawResponse.renderer, defaultRenderer) || defaultRenderer;
    const requestedValidator = safeString(rawResponse.validator, defaultValidator) || defaultValidator;
    const validator = equationMode && importedAnalysis?.ok ? importedAnalysis.validator : requestedValidator;
    const id = allocateImportedId(rawTask.id, usedIds, index);
    const task = {
      id,
      title: safeString(rawTask.title, `DI užduotis ${index + 1}`),
      instruction: safeString(rawTask.instruction, equationMode ? 'Išspręsk lygtį, parodydamas sprendimo eigą.' : 'Atlik nurodytą veiksmą ir įrašyk atsakymą.'),
      difficulty: safeString(rawTask.difficulty, 'DI sugeneruota'),
      prompt: { kind: promptKind, value: promptValue },
      note: safeString(rawTask.note),
      hint: safeString(rawTask.hint),
      response: {
        renderer,
        valueType: equationMode ? 'equation' : 'expression',
        label: safeString(rawResponse.label, equationMode ? 'Sprendimo eiga' : 'Atsakymas'),
        placeholder: safeString(rawResponse.placeholder, equationMode ? 'Įrašyk kitą lygties žingsnį' : 'Įrašyk atsakymą'),
        validator,
        options: {}
      },
      provenance: {
        source: 'ai-import',
        importedAt: new Date().toISOString(),
        contract: 'interactive-practice-package@1'
      },
      assessment: rawTask.assessment && typeof rawTask.assessment === 'object' ? deepClone(rawTask.assessment) : {}
    };

    if (equationMode) {
      const analysis = importedAnalysis || analyzeMathContent(promptValue, 'equation');
      task.response.validator = analysis.ok ? analysis.validator : validator;
      task.response.options = {
        initial: promptValue,
        expectedVariable: analysis.ok ? analysis.variable : 'x',
        expectedValues: analysis.ok ? analysis.values : [],
        minimumSteps: Math.max(1, Math.min(20, Number(rawOptions.minimumSteps) || 1)),
        autoDerived: true
      };
      if (analysis.ok) {
        task.response.options.expectedDisplay = analysis.display;
        task.response.options.solutionKind = analysis.solutionKind;
        if (analysis.values.length === 1) task.response.options.expectedValue = analysis.values[0];
      }
      task.analysis = {
        source: 'automatic-after-ai-import',
        status: analysis.status,
        kind: 'equation',
        validator: task.response.validator,
        ...(analysis.ok ? { variable: analysis.variable, solution: analysis.display, degree: analysis.degree } : { message: analysis.message })
      };
    } else {
      const expected = safeString(rawOptions.expected || rawTask.expected || rawTask.answer);
      const configuredSamples = Array.isArray(rawOptions.samples) ? rawOptions.samples.map(Number).filter(Number.isFinite) : [];
      const samples = configuredSamples.length >= 3 ? configuredSamples : [-11, -7, -2, -0.5, 0, 1, 3, 8, 13];
      task.response.options = {
        expected,
        requireSimplified: Boolean(rawOptions.requireSimplified),
        domain: safeString(rawOptions.domain, 'nenurodyta'),
        samples
      };
      const expectedDisplay = safeString(rawOptions.expectedDisplay);
      if (expectedDisplay) task.response.options.expectedDisplay = expectedDisplay;
      const requiredAnswerForm = safeString(rawOptions.requiredAnswerForm);
      if (requiredAnswerForm) task.response.options.requiredAnswerForm = requiredAnswerForm;
      task.analysis = {
        source: 'ai-import',
        status: promptValue ? 'partial' : 'empty',
        kind: 'expression',
        validator,
        requiresTargetAnswer: true
      };
    }

    upgradeTaskRequirements(task);
    task.qualityGate = runTaskQualityGate(task);
    return task;
  }

  function parseAiImportPayload(source) {
    const text = stripJsonFence(source);
    if (!text) throw new Error('Įklijuok DI sugeneruotą JSON arba pasirink JSON failą.');
    if (text.length > 1_000_000) throw new Error('JSON failas per didelis. P7.7.2 vienu kartu priima iki 1 MB.');
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (error) {
      throw new Error(`JSON sintaksės klaida: ${error.message}`);
    }

    let taskCandidates = [];
    let metadata = {};
    if (Array.isArray(parsed)) {
      taskCandidates = parsed;
    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.tasks)) {
      taskCandidates = parsed.tasks;
      metadata = parsed;
    } else if (parsed && typeof parsed === 'object' && parsed.task && typeof parsed.task === 'object') {
      taskCandidates = [parsed.task];
      metadata = parsed;
    } else if (parsed && typeof parsed === 'object' && parsed.prompt) {
      taskCandidates = [parsed];
    } else {
      throw new Error('JSON turi turėti lauką „tasks“, užduočių masyvą arba vieną užduoties objektą.');
    }
    if (!taskCandidates.length) throw new Error('JSON pakete nėra nė vienos užduoties.');
    if (taskCandidates.length > 50) throw new Error('P7.7.2 vienu importu leidžia ne daugiau kaip 50 užduočių.');

    const usedIds = new Set(tasks.map(task => task.id));
    const importedTasks = taskCandidates.map((task, index) => normalizeImportedTask(task, index, usedIds));
    const counts = importedTasks.reduce((result, task) => {
      result[task.qualityGate.status] = (result[task.qualityGate.status] || 0) + 1;
      return result;
    }, { ready: 0, attention: 0, unsupported: 0 });
    return {
      package: {
        schemaVersion: Number(metadata.schemaVersion) || 1,
        contract: safeString(metadata.contract, 'interactive-practice-package@1'),
        id: safeString(metadata.id, `ai-package-${Date.now().toString(36)}`),
        title: safeString(metadata.title, 'DI sugeneruotos matematikos pratybos'),
        eyebrow: safeString(metadata.eyebrow, 'DI SUGENERUOTOS PRATYBOS · P7.7.2'),
        generationNotes: safeString(metadata.generationNotes || metadata.notes)
      },
      tasks: importedTasks,
      counts
    };
  }

  function renderAiImportPreview(payload) {
    const total = payload.tasks.length;
    refs.aiImportSummary.innerHTML = `
      <div class="ai-summary-card"><strong>${total}</strong><span>IŠ VISO</span></div>
      <div class="ai-summary-card is-ready"><strong>${payload.counts.ready || 0}</strong><span>PARUOŠTOS</span></div>
      <div class="ai-summary-card is-attention"><strong>${payload.counts.attention || 0}</strong><span>REIKIA DĖMESIO</span></div>
      <div class="ai-summary-card is-unsupported"><strong>${payload.counts.unsupported || 0}</strong><span>NEPALAIKOMOS</span></div>
    `;
    refs.aiGenerationNotes.textContent = payload.package.generationNotes;
    refs.aiGenerationNotes.hidden = !payload.package.generationNotes;
    refs.aiImportTaskList.replaceChildren();
    payload.tasks.forEach((task, index) => {
      const gate = task.qualityGate;
      const item = document.createElement('div');
      item.className = `ai-import-task is-${gate.status}`;
      const icon = gate.status === 'ready' ? '✓' : gate.status === 'unsupported' ? '×' : '!';
      item.innerHTML = `
        <span class="ai-import-task-icon" aria-hidden="true">${icon}</span>
        <span class="ai-import-task-copy">
          <strong>${index + 1}. ${escapeHtml(task.title || 'Užduotis be pavadinimo')}</strong>
          <span>${escapeHtml(task.prompt?.value || 'Nėra matematinio turinio')}</span>
        </span>
        <span class="ai-import-task-status">${escapeHtml(gate.label)}</span>
      `;
      refs.aiImportTaskList.appendChild(item);
    });
    refs.aiImportPreview.hidden = false;
    refs.applyAiImportButton.disabled = false;
  }

  function previewAiImport() {
    try {
      pendingAiImport = parseAiImportPayload(refs.aiJsonInput.value);
      renderAiImportPreview(pendingAiImport);
      const counts = pendingAiImport.counts;
      setAiImportStatus('success', `JSON perskaitytas: ${pendingAiImport.tasks.length} užduotys. Paruoštos: ${counts.ready || 0}; reikia dėmesio: ${counts.attention || 0}; nepalaikomos: ${counts.unsupported || 0}.`);
    } catch (error) {
      pendingAiImport = null;
      refs.aiImportPreview.hidden = true;
      refs.applyAiImportButton.disabled = true;
      setAiImportStatus('error', error.message);
    }
  }

  function ensureUniqueImportedIds(importedTasks, existingTasks) {
    const usedIds = new Set(existingTasks.map(task => task.id));
    return importedTasks.map((task, index) => {
      const copy = deepClone(task);
      copy.id = allocateImportedId(copy.id, usedIds, index);
      return copy;
    });
  }

  function resetResponsesForCurrentTasks(previousResponses = {}, previousResults = {}) {
    const nextResponses = {};
    const nextResults = {};
    tasks.forEach(task => {
      const candidate = previousResponses[task.id];
      if (task.response?.renderer === 'math-step-list') {
        nextResponses[task.id] = Array.isArray(candidate?.steps) ? { steps: normalizeStructuredSteps(candidate.steps) } : defaultResponse(task);
      } else {
        nextResponses[task.id] = candidate && Object.prototype.hasOwnProperty.call(candidate, 'answer') ? { answer: String(candidate.answer || '') } : defaultResponse(task);
      }
      nextResults[task.id] = previousResults[task.id] || null;
    });
    state.responses = nextResponses;
    state.results = nextResults;
  }

  function applyAiImport() {
    if (!pendingAiImport) {
      setAiImportStatus('error', 'Pirmiausia patikrink įklijuotą JSON.');
      return;
    }
    if (editorDirty && !window.confirm('Importuojant bus atmesti neišsaugoti dabartinės užduoties pakeitimai. Tęsti?')) return;
    const mode = refs.aiImportMode.value === 'replace' ? 'replace' : 'append';
    if (mode === 'replace' && !window.confirm('Pakeisti visą dabartinį pratybų rinkinį importuotu paketu? Dabartinį rinkinį prieš tai galima eksportuoti į JSON.')) return;

    const previousResponses = mode === 'append' ? state.responses : {};
    const previousResults = mode === 'append' ? state.results : {};
    const insertionStart = mode === 'append' ? tasks.length : 0;
    const importedTasks = ensureUniqueImportedIds(pendingAiImport.tasks, mode === 'append' ? tasks : []);
    addTasksToLibrary(importedTasks, 'DI importas');
    tasks = mode === 'append' ? [...tasks, ...importedTasks] : importedTasks;
    practicePackage.tasks = tasks;
    if (mode === 'replace') {
      practicePackage.schemaVersion = 1;
      practicePackage.contract = 'interactive-practice-package@1';
      practicePackage.id = pendingAiImport.package.id;
      practicePackage.title = pendingAiImport.package.title;
      practicePackage.eyebrow = pendingAiImport.package.eyebrow;
      refs.packageTitleInput.value = practicePackage.title;
      refs.packageEyebrowInput.value = practicePackage.eyebrow;
    }
    resetResponsesForCurrentTasks(previousResponses, previousResults);
    state.currentTask = Math.min(insertionStart, tasks.length - 1);
    state.packageData = practicePackage;
    editorDirty = false;
    tasks.forEach(task => { task.qualityGate = runTaskQualityGate(task); });
    renderTask();
    renderAuthoringTaskList();
    populateEditor();
    scheduleSave();
    const counts = pendingAiImport.counts;
    setAuthoringValidation('success', `DI importas baigtas. Pridėta ${importedTasks.length} užduočių: ${counts.ready || 0} paruoštos, ${counts.attention || 0} reikalauja dėmesio, ${counts.unsupported || 0} nepalaikomos. Mokiniui rodomos tik žalios užduotys.`);
    pendingAiImport = null;
    refs.applyAiImportButton.disabled = true;
    closeAiWorkflow();
    showToast(`Importuota ${importedTasks.length} užduočių`);
  }

  function downloadJson(filename, data) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function exportCurrentPackage() {
    const exported = deepClone(practicePackage);
    exported.schemaVersion = 1;
    exported.contract = 'interactive-practice-package@1';
    exported.exportedAt = new Date().toISOString();
    exported.tasks = tasks.map(task => {
      const copy = deepClone(task);
      copy.qualityGate = runTaskQualityGate(copy);
      return copy;
    });
    const safeName = (practicePackage.title || 'interaktyvios-pratybos').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'interaktyvios-pratybos';
    downloadJson(`${safeName}-p5.json`, exported);
    showToast('Rinkinio JSON atsisiųstas');
  }

  function openAiWorkflow() {
    refs.aiWorkflowModal.hidden = false;
    document.body.classList.add('ai-modal-open');
    if (!refs.aiTeacherRequest.value.trim()) refs.aiTeacherRequest.value = `Sukurk 5 palaipsniui sunkėjančias matematikos užduotis rinkiniui „${practicePackage.title}“.`;
    requestAnimationFrame(() => refs.aiTeacherRequest.focus());
  }

  function closeAiWorkflow() {
    refs.aiWorkflowModal.hidden = true;
    document.body.classList.remove('ai-modal-open');
  }

  async function loadAiJsonFile(file) {
    if (!file) return;
    if (file.size > 1_000_000) {
      setAiImportStatus('error', 'JSON failas per didelis. P7.7.2 vienu kartu priima iki 1 MB.');
      return;
    }
    try {
      refs.aiJsonInput.value = await file.text();
      previewAiImport();
    } catch (error) {
      setAiImportStatus('error', `Nepavyko perskaityti failo: ${error.message}`);
    } finally {
      refs.aiJsonFileInput.value = '';
    }
  }

  function installAiWorkflowEvents() {
    refs.aiWorkflowButton.addEventListener('click', openAiWorkflow);
    refs.closeAiWorkflowButton.addEventListener('click', closeAiWorkflow);
    refs.aiWorkflowModal.addEventListener('click', event => {
      if (event.target?.dataset?.aiClose === 'true') closeAiWorkflow();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !refs.aiWorkflowModal.hidden) closeAiWorkflow();
    });
    refs.generateAiPromptButton.addEventListener('click', generateAiPrompt);
    refs.copyAiPromptButton.addEventListener('click', () => copyTextToClipboard(refs.aiPromptOutput.value, 'DI užklausa nukopijuota'));
    refs.previewAiImportButton.addEventListener('click', previewAiImport);
    refs.applyAiImportButton.addEventListener('click', applyAiImport);
    refs.exportPackageButton.addEventListener('click', exportCurrentPackage);
    refs.aiJsonFileInput.addEventListener('change', () => loadAiJsonFile(refs.aiJsonFileInput.files?.[0]));
    refs.aiJsonInput.addEventListener('input', () => {
      pendingAiImport = null;
      refs.applyAiImportButton.disabled = true;
      refs.aiImportPreview.hidden = true;
      setAiImportStatus('', '');
    });
  }


  function installAuthoringEvents() {
    refs.studentModeButton.addEventListener('click', () => {
      if (!state.boardPractices.length && !state.boardTasks.length) revealPrimaryPracticeWindow();
      setMode('student');
    });
    refs.teacherModeButton.addEventListener('click', () => {
      if (onlineAccessRole !== 'teacher') { showToast('Mokytojo režimas skirtas mokytojui'); return; }
      const changed = setMode('teacher');
      if (changed === false) return;
      if (state.boardPractices.length || state.boardTasks.length) {
        state.window.shelved = true;
        refs.practiceWindow.hidden = true;
        refs.centerPracticeButton.hidden = false;
        renderBoardObjects();
        scheduleSave();
      } else revealPrimaryPracticeWindow();
    });
    refs.checkTaskButton.addEventListener('click', checkEditorTask);
    refs.addTaskButton.addEventListener('click', addTask);
    refs.duplicateTaskButton.addEventListener('click', duplicateTask);
    refs.deleteTaskButton.addEventListener('click', deleteTask);
    refs.testAsStudentButton.addEventListener('click', () => {
      if (editorDirty && !saveEditorChanges()) return;
      const gate = getTaskQualityGate(currentTask());
      renderQualityGate(gate);
      if (gate.status !== 'ready') {
        setAuthoringValidation('error', gate.summary);
        showToast('Užduotis dar neparuošta mokiniui');
        return;
      }
      // ONLINE-P1.1.7: rengyklėje mokytojas grįžta į tas pačias sprendžiamas pratybas.
      // Tikslų mokinio sąsajos vaizdą atskirame lange ir toliau atidaro viršutinis „Mokinio vaizdas“.
      setMode('student', { force: true, allowEmpty: true });
      renderTask();
      showToast('Rodomos sprendžiamos pratybos');
    });
    refs.discardEditorChangesButton.addEventListener('click', populateEditor);
    refs.copyJsonButton.addEventListener('click', copyCurrentTaskJson);
    refs.taskEditorForm.addEventListener('submit', event => {
      event.preventDefault();
      saveEditorChanges();
    });
    refs.editorRenderer.addEventListener('change', () => {
      synchronizeAutomaticAuthoring({ fromRenderer: true });
      markEditorDirty();
    });
    refs.editorPromptValue.addEventListener('input', () => {
      synchronizeAutomaticAuthoring();
      markEditorDirty();
    });
    refs.editorPromptValue.addEventListener('change', () => {
      synchronizeAutomaticAuthoring();
      markEditorDirty();
    });
    refs.taskEditorForm.querySelectorAll('input, textarea, select').forEach(element => {
      if ([refs.editorRenderer, refs.editorValidator, refs.editorPromptKind, refs.editorPromptValue, refs.editorInitialEquation, refs.editorExpectedVariable, refs.editorExpectedValue, refs.editorExpectedValueDisplay].includes(element)) return;
      element.addEventListener('input', markEditorDirty);
      element.addEventListener('change', markEditorDirty);
    });
  }

  // -------------------- Math parser and symbolic comparison --------------------

  function normalizeExpression(source) {
    return String(source)
      .replace(/[−–—]/g, '-')
      .replace(/[×·⋅]/g, '*')
      .replace(/÷/g, '/')
      .replace(/:/g, '/')
      .replace(/,/g, '.')
      .replace(/²/g, '^2')
      .replace(/³/g, '^3')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function tokenize(source) {
    const input = normalizeExpression(source);
    const raw = [];
    let index = 0;
    while (index < input.length) {
      const char = input[index];
      if (/\s/.test(char)) { index += 1; continue; }
      if (/[0-9]/.test(char)) {
        const mixedMatch = input.slice(index).match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)(?![\d.])/);
        if (mixedMatch) {
          const wholeInput = Number(mixedMatch[1]);
          const numeratorInput = Number(mixedMatch[2]);
          const denominator = Number(mixedMatch[3]);
          if (denominator === 0) throw new Error('Parse error: mišriojo skaičiaus vardiklis negali būti 0');
          const totalNumerator = wholeInput * denominator + numeratorInput;
          const whole = Math.floor(totalNumerator / denominator);
          const numerator = totalNumerator % denominator;
          if (numerator === 0) {
            raw.push({ type: 'number', value: whole, text: mixedMatch[0] });
          } else if (whole === 0) {
            raw.push({ type: 'fraction', numerator, denominator, text: mixedMatch[0] });
          } else {
            raw.push({ type: 'mixed', whole, numerator, denominator, text: mixedMatch[0] });
          }
          index += mixedMatch[0].length;
          continue;
        }
      }
      if (/[0-9.]/.test(char)) {
        const start = index;
        let dots = 0;
        while (index < input.length && /[0-9.]/.test(input[index])) {
          if (input[index] === '.') dots += 1;
          index += 1;
        }
        const text = input.slice(start, index);
        if (dots > 1 || text === '.') throw new Error(`Parse error: netaisyklingas skaičius „${text}“`);
        raw.push({ type: 'number', value: Number(text), text });
        continue;
      }
      if (/[a-zA-Z]/.test(char)) {
        const start = index;
        while (index < input.length && /[a-zA-Z0-9_]/.test(input[index])) index += 1;
        raw.push({ type: 'identifier', value: input.slice(start, index) });
        continue;
      }
      if ('+-*/^()'.includes(char)) { raw.push({ type: char, value: char }); index += 1; continue; }
      throw new Error(`Parse error: neatpažintas simbolis „${char}“`);
    }
    const tokens = [];
    for (const current of raw) {
      const previous = tokens[tokens.length - 1];
      const leftCanMultiply = previous && ['number', 'fraction', 'mixed', 'identifier', ')'].includes(previous.type);
      const rightCanMultiply = ['number', 'fraction', 'mixed', 'identifier', '('].includes(current.type);
      if (leftCanMultiply && rightCanMultiply) tokens.push({ type: '*', value: '*', implicit: true });
      tokens.push(current);
    }
    tokens.push({ type: 'eof' });
    return tokens;
  }

  function parseExpression(source) {
    const tokens = tokenize(source);
    let position = 0;
    const peek = () => tokens[position];
    const consume = type => {
      const token = peek();
      if (token.type !== type) throw new Error(`Parse error: tikėtasi „${type}“, rasta „${token.value ?? token.type}“`);
      position += 1;
      return token;
    };

    function parseAdditive() {
      let node = parseMultiplicative();
      while (peek().type === '+' || peek().type === '-') {
        const operator = peek().type;
        position += 1;
        node = { type: 'binary', operator, left: node, right: parseMultiplicative() };
      }
      return node;
    }
    function parseMultiplicative() {
      let node = parseUnary();
      while (peek().type === '*' || peek().type === '/') {
        const operator = peek().type;
        position += 1;
        node = { type: 'binary', operator, left: node, right: parseUnary() };
      }
      return node;
    }
    function parseUnary() {
      if (peek().type === '+') { position += 1; return parseUnary(); }
      if (peek().type === '-') { position += 1; return { type: 'unary', operator: '-', value: parseUnary() }; }
      return parsePower();
    }
    function parsePower() {
      let node = parsePrimary();
      if (peek().type === '^') { position += 1; node = { type: 'binary', operator: '^', left: node, right: parseUnary() }; }
      return node;
    }
    function parsePrimary() {
      const token = peek();
      if (token.type === 'number') { position += 1; return { type: 'number', value: token.value }; }
      if (token.type === 'fraction') {
        position += 1;
        return {
          type: 'binary',
          operator: '/',
          left: { type: 'number', value: token.numerator },
          right: { type: 'number', value: token.denominator }
        };
      }
      if (token.type === 'mixed') {
        position += 1;
        return {
          type: 'binary',
          operator: '+',
          left: { type: 'number', value: token.whole },
          right: {
            type: 'binary',
            operator: '/',
            left: { type: 'number', value: token.numerator },
            right: { type: 'number', value: token.denominator }
          },
          mixedDisplay: { whole: token.whole, numerator: token.numerator, denominator: token.denominator }
        };
      }
      if (token.type === 'identifier') {
        position += 1;
        const name = token.value.toLowerCase();
        if (name !== 'x') throw new Error(`Parse error: P2 demonstracija kol kas palaiko kintamąjį x, ne „${token.value}“`);
        return { type: 'variable', name };
      }
      if (token.type === '(') {
        position += 1;
        const node = parseAdditive();
        consume(')');
        return node;
      }
      throw new Error(`Parse error: netikėta reiškinio vieta ties „${token.value ?? token.type}“`);
    }

    const result = parseAdditive();
    if (peek().type !== 'eof') throw new Error(`Parse error: liko neperskaityta dalis ties „${peek().value ?? peek().type}“`);
    return result;
  }

  function parseEquation(source) {
    const normalized = String(source).replace(/[＝]/g, '=');
    let depth = 0;
    let equalIndex = -1;
    for (let index = 0; index < normalized.length; index += 1) {
      const char = normalized[index];
      if (char === '(') depth += 1;
      if (char === ')') depth -= 1;
      if (depth < 0) throw new Error('Parse error: uždarytas skliaustas neturi poros');
      if (char === '=' && depth === 0) {
        if (equalIndex !== -1) throw new Error('Parse error: lygties eilutėje turi būti vienas lygybės ženklas');
        equalIndex = index;
      }
    }
    if (depth !== 0) throw new Error('Parse error: neuždaryti skliaustai');
    if (equalIndex === -1) throw new Error('Parse error: lygties eilutėje trūksta lygybės ženklo =');
    const left = normalized.slice(0, equalIndex).trim();
    const right = normalized.slice(equalIndex + 1).trim();
    if (!left || !right) throw new Error('Parse error: abiejose lygybės pusėse turi būti reiškinys');
    return { type: 'equation', left: parseExpression(left), right: parseExpression(right) };
  }

  function evaluateAst(node, scope) {
    if (node.type === 'number') return node.value;
    if (node.type === 'variable') return scope[node.name];
    if (node.type === 'unary') return -evaluateAst(node.value, scope);
    const left = evaluateAst(node.left, scope);
    const right = evaluateAst(node.right, scope);
    if (node.operator === '+') return left + right;
    if (node.operator === '-') return left - right;
    if (node.operator === '*') return left * right;
    if (node.operator === '/') return left / right;
    if (node.operator === '^') return left ** right;
    throw new Error(`Nežinomas operatorius ${node.operator}`);
  }

  function cleanPolynomial(poly) {
    const result = poly.map(value => Math.abs(value) < EPSILON ? 0 : value);
    while (result.length > 1 && Math.abs(result[result.length - 1]) < EPSILON) result.pop();
    return result.length ? result : [0];
  }

  function addPolynomials(a, b, factor = 1) {
    const result = Array(Math.max(a.length, b.length)).fill(0);
    for (let index = 0; index < result.length; index += 1) result[index] = (a[index] || 0) + factor * (b[index] || 0);
    return cleanPolynomial(result);
  }

  function multiplyPolynomials(a, b) {
    const result = Array(a.length + b.length - 1).fill(0);
    for (let i = 0; i < a.length; i += 1) for (let j = 0; j < b.length; j += 1) result[i + j] += a[i] * b[j];
    return cleanPolynomial(result);
  }

  function powerPolynomial(poly, exponent) {
    let result = [1];
    let base = poly;
    let power = exponent;
    while (power > 0) {
      if (power % 2 === 1) result = multiplyPolynomials(result, base);
      power = Math.floor(power / 2);
      if (power > 0) base = multiplyPolynomials(base, base);
      if (result.length > 65 || base.length > 65) throw new Error('Per didelis polinomo laipsnis');
    }
    return cleanPolynomial(result);
  }

  function isZeroPolynomial(poly) {
    return cleanPolynomial(poly).every(value => Math.abs(value) < EPSILON);
  }

  function isConstantPolynomial(poly) {
    return cleanPolynomial(poly).length <= 1;
  }

  function constantInteger(node) {
    if (node.type === 'number' && Number.isInteger(node.value)) return node.value;
    if (node.type === 'unary' && node.operator === '-') {
      const value = constantInteger(node.value);
      return value === null ? null : -value;
    }
    return null;
  }

  function astToRationalPolynomial(node) {
    if (node.type === 'number') return { numerator: [node.value], denominator: [1] };
    if (node.type === 'variable') return { numerator: [0, 1], denominator: [1] };
    if (node.type === 'unary') {
      const value = astToRationalPolynomial(node.value);
      return { numerator: value.numerator.map(coefficient => -coefficient), denominator: value.denominator };
    }
    const left = astToRationalPolynomial(node.left);
    const right = node.operator === '^' ? null : astToRationalPolynomial(node.right);
    if (node.operator === '+') return {
      numerator: addPolynomials(multiplyPolynomials(left.numerator, right.denominator), multiplyPolynomials(right.numerator, left.denominator)),
      denominator: multiplyPolynomials(left.denominator, right.denominator)
    };
    if (node.operator === '-') return {
      numerator: addPolynomials(multiplyPolynomials(left.numerator, right.denominator), multiplyPolynomials(right.numerator, left.denominator), -1),
      denominator: multiplyPolynomials(left.denominator, right.denominator)
    };
    if (node.operator === '*') return { numerator: multiplyPolynomials(left.numerator, right.numerator), denominator: multiplyPolynomials(left.denominator, right.denominator) };
    if (node.operator === '/') {
      if (isZeroPolynomial(right.numerator)) throw new Error('Dalyba iš nulio');
      return { numerator: multiplyPolynomials(left.numerator, right.denominator), denominator: multiplyPolynomials(left.denominator, right.numerator) };
    }
    if (node.operator === '^') {
      const exponent = constantInteger(node.right);
      if (exponent === null || Math.abs(exponent) > 20) throw new Error('Nepalaikomas laipsnis');
      if (exponent === 0) return { numerator: [1], denominator: [1] };
      const positive = Math.abs(exponent);
      const numerator = powerPolynomial(left.numerator, positive);
      const denominator = powerPolynomial(left.denominator, positive);
      if (exponent > 0) return { numerator, denominator };
      if (isZeroPolynomial(numerator)) throw new Error('Dalyba iš nulio');
      return { numerator: denominator, denominator: numerator };
    }
    throw new Error('Nepalaikomas operatorius');
  }

  function rationalPolynomialsEquivalent(left, right) {
    return isZeroPolynomial(addPolynomials(multiplyPolynomials(left.numerator, right.denominator), multiplyPolynomials(right.numerator, left.denominator), -1));
  }

  function compareExpressions(candidate, expected, samples) {
    let symbolicResult = null;
    try {
      symbolicResult = rationalPolynomialsEquivalent(astToRationalPolynomial(candidate), astToRationalPolynomial(expected));
    } catch (_) { /* deterministinis skaitinis atsarginis kelias */ }
    let compared = 0;
    for (const x of samples) {
      let a;
      let b;
      try { a = evaluateAst(candidate, { x }); b = evaluateAst(expected, { x }); } catch (_) { continue; }
      if (!Number.isFinite(b)) continue;
      if (!Number.isFinite(a)) return { equivalent: false, message: `Ties x = ${x} tavo reiškinys neturi baigtinės reikšmės.` };
      compared += 1;
      const tolerance = EPSILON * Math.max(1, Math.abs(a), Math.abs(b));
      if (Math.abs(a - b) > tolerance) {
        return { equivalent: false, message: `Patikrinus ties x = ${x}, tavo reiškinys duoda ${formatNumber(a)}, o turėtų duoti ${formatNumber(b)}.` };
      }
    }
    if (symbolicResult === false) return { equivalent: false, message: 'Reiškiniai nėra tapatūs. Patikrink pertvarkymus.' };
    if (compared < 3) return { equivalent: false, message: 'Nepavyko patikimai palyginti reiškinių.' };
    return { equivalent: true };
  }

  function equationPolynomial(equation) {
    const left = astToRationalPolynomial(equation.left);
    const right = astToRationalPolynomial(equation.right);
    if (!isConstantPolynomial(left.denominator) || !isConstantPolynomial(right.denominator)) {
      throw new Error('Dabartinis lygčių tikrintuvas priima lygtis be kintamojo vardiklyje');
    }
    const polynomial = cleanPolynomial(addPolynomials(
      multiplyPolynomials(left.numerator, right.denominator),
      multiplyPolynomials(right.numerator, left.denominator),
      -1
    ));
    if (polynomial.length > 3) throw new Error('Dabartinis lygčių tikrintuvas dar nepalaiko aukštesnio nei antrojo laipsnio lygčių');
    return polynomial;
  }

  function fractionIfExact(value, maximumDenominator = 1000) {
    const fraction = approximateFraction(value, maximumDenominator);
    if (!fraction) return null;
    const reconstructed = fraction.numerator / fraction.denominator;
    const tolerance = 1e-10 * Math.max(1, Math.abs(value));
    return Math.abs(reconstructed - value) <= tolerance ? fraction : null;
  }

  function formatSupportedRoot(value) {
    const fraction = fractionIfExact(value);
    if (!fraction) return formatNumber(value);
    return fraction.denominator === 1 ? String(fraction.numerator) : `${fraction.numerator}/${fraction.denominator}`;
  }

  function describePolynomialEquation(equation) {
    const polynomial = equationPolynomial(equation);
    const degree = polynomial.length - 1;
    const c = polynomial[0] || 0;
    const b = polynomial[1] || 0;
    const a = polynomial[2] || 0;
    if (degree <= 0 || Math.abs(a) < EPSILON && Math.abs(b) < EPSILON) {
      return Math.abs(c) < EPSILON ? { kind: 'all', degree: 0, rootsSupported: true } : { kind: 'none', degree: 0, rootsSupported: true };
    }
    if (degree === 1 || Math.abs(a) < EPSILON) {
      return { kind: 'single', degree: 1, value: -c / b, rootsSupported: true };
    }
    const discriminant = b * b - 4 * a * c;
    const tolerance = EPSILON * Math.max(1, Math.abs(b * b), Math.abs(4 * a * c));
    if (discriminant < -tolerance) return { kind: 'none', degree: 2, discriminant, rootsSupported: true };
    if (Math.abs(discriminant) <= tolerance) {
      const value = -b / (2 * a);
      return { kind: 'single', degree: 2, value, multiplicity: 2, discriminant: 0, rootsSupported: Boolean(fractionIfExact(value)) };
    }
    const sqrtDiscriminant = Math.sqrt(discriminant);
    const values = [(-b - sqrtDiscriminant) / (2 * a), (-b + sqrtDiscriminant) / (2 * a)].sort((x, y) => x - y);
    return { kind: 'two', degree: 2, values, discriminant, rootsSupported: values.every(value => Boolean(fractionIfExact(value))) };
  }

  function describeLinearEquation(equation) {
    const descriptor = describePolynomialEquation(equation);
    if (descriptor.degree > 1) throw new Error('Dabartinis tiesinių lygčių tikrintuvas priima tik lygtis, kurios susiveda į tiesinę lygtį');
    return descriptor;
  }

  function descriptorRoots(descriptor) {
    if (!descriptor) return [];
    if (descriptor.kind === 'single') return [descriptor.value];
    if (descriptor.kind === 'two') return [...descriptor.values];
    return [];
  }

  function descriptorIsSingleRoot(descriptor) {
    return descriptor?.kind === 'single';
  }

  function sameRootValues(firstValues, secondValues) {
    if (firstValues.length !== secondValues.length) return false;
    const first = [...firstValues].sort((a, b) => a - b);
    const second = [...secondValues].sort((a, b) => a - b);
    return first.every((value, index) => Math.abs(value - second[index]) <= EPSILON * Math.max(1, Math.abs(value), Math.abs(second[index])));
  }

  function samePolynomialSolutionSet(first, second) {
    if (first.kind === 'all' || second.kind === 'all') return first.kind === second.kind;
    if (first.kind === 'none' || second.kind === 'none') return first.kind === second.kind;
    return sameRootValues(descriptorRoots(first), descriptorRoots(second));
  }

  function sameLinearSolutionSet(first, second) {
    return samePolynomialSolutionSet(first, second);
  }

  // P2-SPLIT-P2.4.7.15: bendras tiesinių lygčių žingsnio pagrįstumo variklis.
  // Sprendinių aibės sutapimas lieka saugos sluoksniu, o ši klasifikacija tikrina,
  // ar nauja eilutė gaunama vienu aiškiu mokykliniu lygiaverčiu pertvarkymu.
  // Sąmoningai leidžiame kelių narių perkėlimą vienu žingsniu, bet ne kelių skirtingų
  // operacijų (pvz. perkėlimo ir dalybos) sujungimą į vieną nepaaiškintą šuolį.
  function expressionPolynomial(node) {
    const rational = astToRationalPolynomial(node);
    if (!isConstantPolynomial(rational.denominator)) {
      throw new Error('Tiesinių lygčių žingsnio pagrįstumo tikrinimas kol kas nepalaiko kintamojo vardiklyje');
    }
    const denominator = Number(rational.denominator[0] || 0);
    if (Math.abs(denominator) < EPSILON) throw new Error('Dalyba iš nulio');
    return cleanPolynomial(rational.numerator.map(coefficient => coefficient / denominator));
  }

  function polynomialsApproximatelyEqual(first, second) {
    const a = cleanPolynomial(first);
    const b = cleanPolynomial(second);
    const length = Math.max(a.length, b.length);
    for (let index = 0; index < length; index += 1) {
      const left = a[index] || 0;
      const right = b[index] || 0;
      const tolerance = EPSILON * Math.max(1, Math.abs(left), Math.abs(right));
      if (Math.abs(left - right) > tolerance) return false;
    }
    return true;
  }

  function equationSidePolynomials(equation) {
    return {
      left: expressionPolynomial(equation.left),
      right: expressionPolynomial(equation.right)
    };
  }

  function polynomialScaled(poly, factor) {
    return cleanPolynomial(poly.map(coefficient => coefficient * factor));
  }

  function equationUniformScale(previousSides, nextSides) {
    const pairs = [
      [previousSides.left, nextSides.left],
      [previousSides.right, nextSides.right]
    ];
    let factor = null;
    for (const [previous, next] of pairs) {
      const length = Math.max(previous.length, next.length);
      for (let index = 0; index < length; index += 1) {
        const before = previous[index] || 0;
        const after = next[index] || 0;
        if (Math.abs(before) <= EPSILON) {
          if (Math.abs(after) > EPSILON) return null;
          continue;
        }
        const candidate = after / before;
        if (!Number.isFinite(candidate)) return null;
        if (factor === null) factor = candidate;
        else {
          const tolerance = EPSILON * Math.max(1, Math.abs(factor), Math.abs(candidate));
          if (Math.abs(candidate - factor) > tolerance) return null;
        }
      }
    }
    if (factor === null || Math.abs(factor) <= EPSILON) return null;
    if (!polynomialsApproximatelyEqual(nextSides.left, polynomialScaled(previousSides.left, factor))) return null;
    if (!polynomialsApproximatelyEqual(nextSides.right, polynomialScaled(previousSides.right, factor))) return null;
    return factor;
  }

  // P2-SPLIT-P2.4.7.15: kvadratinių lygčių žingsnio pagrįstumo plėtra.
  // Faktorizavimą ir nulinės sandaugos taisyklę atpažįstame atskirai, o kitoms
  // lygiavertėms algebrinėms transformacijoms naudojame tą patį bendrą variklį.
  function isZeroAst(node) {
    const value = constantValue(node);
    return value !== null && Math.abs(value) <= EPSILON;
  }

  function factorFormScore(node) {
    if (!node) return 0;
    if (node.type === 'binary' && node.operator === '*') {
      const leftHasVariable = containsVariable(node.left, 'x');
      const rightHasVariable = containsVariable(node.right, 'x');
      const local = leftHasVariable && rightHasVariable ? 2 : (leftHasVariable || rightHasVariable ? 1 : 0);
      return local + factorFormScore(node.left) + factorFormScore(node.right);
    }
    if (node.type === 'binary' && node.operator === '^') {
      const exponent = constantValue(node.right);
      if (containsVariable(node.left, 'x') && exponent !== null && Number.isInteger(exponent) && exponent >= 2) return 2 + factorFormScore(node.left);
    }
    return 0;
  }

  function equationZeroSideExpression(equation) {
    if (isZeroAst(equation.right)) return { expression: equation.left, side: 'left' };
    if (isZeroAst(equation.left)) return { expression: equation.right, side: 'right' };
    return null;
  }

  function astStructureSignature(node) {
    if (!node) return '';
    if (node.type === 'number') return `n:${Number(node.value)}`;
    if (node.type === 'variable') return `v:${node.name}`;
    if (node.type === 'unary') return `u:${node.operator}(${astStructureSignature(node.value)})`;
    return `b:${node.operator}(${astStructureSignature(node.left)},${astStructureSignature(node.right)})`;
  }

  function signedTopLevelTerms(node, sign = 1) {
    if (node?.type === 'binary' && node.operator === '+') {
      return [...signedTopLevelTerms(node.left, sign), ...signedTopLevelTerms(node.right, sign)];
    }
    if (node?.type === 'binary' && node.operator === '-') {
      return [...signedTopLevelTerms(node.left, sign), ...signedTopLevelTerms(node.right, -sign)];
    }
    if (node?.type === 'unary' && node.operator === '-') return signedTopLevelTerms(node.value, -sign);
    return [{ node, sign }];
  }

  function signedTermPolynomial(term) {
    const polynomial = expressionPolynomial(term.node);
    return term.sign < 0 ? polynomialScaled(polynomial, -1) : polynomial;
  }

  function polynomialMultisetMatches(first, second) {
    if (first.length !== second.length) return false;
    const used = new Set();
    for (const item of first) {
      let match = -1;
      for (let index = 0; index < second.length; index += 1) {
        if (used.has(index)) continue;
        if (polynomialsApproximatelyEqual(item, second[index])) { match = index; break; }
      }
      if (match < 0) return false;
      used.add(match);
    }
    return true;
  }

  function detectSingleTermSplit(previousExpression, nextExpression) {
    const previousTerms = signedTopLevelTerms(previousExpression);
    const nextTerms = signedTopLevelTerms(nextExpression);
    if (nextTerms.length !== previousTerms.length + 1) return null;
    const previousPolynomials = previousTerms.map(signedTermPolynomial);
    const nextPolynomials = nextTerms.map(signedTermPolynomial);

    for (let previousIndex = 0; previousIndex < previousPolynomials.length; previousIndex += 1) {
      for (let firstIndex = 0; firstIndex < nextPolynomials.length; firstIndex += 1) {
        for (let secondIndex = firstIndex + 1; secondIndex < nextPolynomials.length; secondIndex += 1) {
          const combined = addPolynomials(nextPolynomials[firstIndex], nextPolynomials[secondIndex]);
          if (!polynomialsApproximatelyEqual(combined, previousPolynomials[previousIndex])) continue;
          const remainingPrevious = previousPolynomials.filter((_, index) => index !== previousIndex);
          const remainingNext = nextPolynomials.filter((_, index) => index !== firstIndex && index !== secondIndex);
          if (!polynomialMultisetMatches(remainingPrevious, remainingNext)) continue;
          return {
            split: previousPolynomials[previousIndex],
            pieces: [nextPolynomials[firstIndex], nextPolynomials[secondIndex]]
          };
        }
      }
    }
    return null;
  }

  function nonconstantFactorPolynomials(node) {
    return flattenProductFactors(node)
      .map(factor => {
        try { return expressionPolynomial(factor); }
        catch (_) { return null; }
      })
      .filter(polynomial => polynomial && cleanPolynomial(polynomial).length > 1);
  }

  function hasSharedNonconstantFactorAcrossTopLevelTerms(node) {
    const terms = signedTopLevelTerms(node);
    if (terms.length < 2) return false;
    const factorLists = terms.map(term => nonconstantFactorPolynomials(term.node));
    if (factorLists.some(list => !list.length)) return false;
    return factorLists[0].some(candidate => factorLists.slice(1).every(list => list.some(factor => polynomialProportionalFactor(candidate, factor) !== null)));
  }

  function isSquarePowerExpression(node) {
    if (node?.type !== 'binary' || node.operator !== '^') return false;
    const exponent = constantValue(node.right);
    return exponent !== null && Math.abs(exponent - 2) <= EPSILON;
  }

  function classifyQuadraticEquationTransition(previousEquation, nextEquation) {
    const previous = equationSidePolynomials(previousEquation);
    const next = equationSidePolynomials(nextEquation);
    const sameOrientation = polynomialsApproximatelyEqual(previous.left, next.left) && polynomialsApproximatelyEqual(previous.right, next.right);

    if (sameOrientation) {
      const previousZeroSide = equationZeroSideExpression(previousEquation);
      const nextZeroSide = equationZeroSideExpression(nextEquation);
      if (previousZeroSide && nextZeroSide && previousZeroSide.side === nextZeroSide.side) {
        const termSplit = detectSingleTermSplit(previousZeroSide.expression, nextZeroSide.expression);
        if (termSplit) {
          return {
            ok: true,
            semanticType: 'equivalent-equation',
            kind: 'split-term',
            operations: ['split-term'],
            message: 'Atpažintas lygiavertis pertvarkymas: vienas daugianario narys išskaidytas į du lygiaverčius narius.'
          };
        }

        const previousTermCount = signedTopLevelTerms(previousZeroSide.expression).length;
        const nextTermCount = signedTopLevelTerms(nextZeroSide.expression).length;
        if (nextTermCount >= 2 && previousTermCount > nextTermCount && hasSharedNonconstantFactorAcrossTopLevelTerms(nextZeroSide.expression)) {
          return {
            ok: true,
            semanticType: 'equivalent-equation',
            kind: 'group-factor',
            operations: ['group-terms', 'factor-common'],
            message: 'Atpažintas lygiavertis pertvarkymas: nariai sugrupuoti ir iš grupių iškelti bendrieji daugikliai.'
          };
        }

        const previousScore = factorFormScore(previousZeroSide.expression);
        const nextScore = factorFormScore(nextZeroSide.expression);
        if (nextScore > previousScore) {
          return {
            ok: true,
            semanticType: 'equivalent-equation',
            kind: 'factorize',
            operations: ['factorize'],
            message: isSquarePowerExpression(nextZeroSide.expression)
              ? 'Atpažintas lygiavertis pertvarkymas: daugianaris užrašytas pilno kvadrato pavidalu.'
              : 'Atpažintas lygiavertis pertvarkymas: daugianaris išskaidytas dauginamaisiais.'
          };
        }
        if (previousScore > nextScore) {
          return {
            ok: true,
            semanticType: 'equivalent-equation',
            kind: 'expand-factors',
            operations: ['expand-factors', 'combine-like-terms'],
            message: 'Atpažintas lygiavertis pertvarkymas: dauginamieji išskleisti ir sutraukti panašieji nariai.'
          };
        }
      }
    }

    const squareZero = squareEqualsZeroBase(previousEquation);
    if (squareZero) {
      const nextPolynomial = equationPolynomial(nextEquation);
      const basePolynomial = expressionPolynomial(squareZero.base);
      if (polynomialProportionalFactor(basePolynomial, nextPolynomial) !== null) {
        return {
          ok: true,
          semanticType: 'equivalent-equation',
          kind: 'square-zero-root',
          operations: ['square-zero'],
          message: 'Atpažintas lygiavertis pertvarkymas: jei reiškinio kvadratas lygus nuliui, pats reiškinys lygus nuliui.'
        };
      }
    }

    return classifyLocalEquationTransition(previousEquation, nextEquation);
  }


  function flattenProductFactors(node) {
    if (node?.type === 'binary' && node.operator === '*') {
      return [...flattenProductFactors(node.left), ...flattenProductFactors(node.right)];
    }
    return [node];
  }

  function nonzeroVariableFactorsFromZeroProduct(equation) {
    const zeroSide = equationZeroSideExpression(equation);
    if (!zeroSide) return [];
    const raw = flattenProductFactors(zeroSide.expression);
    const factors = [];
    for (const factor of raw) {
      const constant = constantValue(factor);
      if (constant !== null) {
        if (Math.abs(constant) <= EPSILON) return [];
        continue;
      }
      if (!containsVariable(factor, 'x')) continue;
      factors.push(expressionPolynomial(factor));
    }
    return factors;
  }

  function polynomialProportionalFactor(first, second) {
    const a = cleanPolynomial(first);
    const b = cleanPolynomial(second);
    const length = Math.max(a.length, b.length);
    let factor = null;
    for (let index = 0; index < length; index += 1) {
      const left = a[index] || 0;
      const right = b[index] || 0;
      if (Math.abs(left) <= EPSILON && Math.abs(right) <= EPSILON) continue;
      if (Math.abs(left) <= EPSILON || Math.abs(right) <= EPSILON) return null;
      const candidate = right / left;
      if (!Number.isFinite(candidate) || Math.abs(candidate) <= EPSILON) return null;
      if (factor === null) factor = candidate;
      else {
        const tolerance = EPSILON * Math.max(1, Math.abs(factor), Math.abs(candidate));
        if (Math.abs(candidate - factor) > tolerance) return null;
      }
    }
    return factor;
  }

  function squaredExpressionAndConstant(equation) {
    const candidates = [
      [equation.left, equation.right],
      [equation.right, equation.left]
    ];
    for (const [powerSide, constantSide] of candidates) {
      if (powerSide?.type !== 'binary' || powerSide.operator !== '^') continue;
      const exponent = constantValue(powerSide.right);
      const constant = constantValue(constantSide);
      if (exponent === 2 && constant !== null && Number.isFinite(constant)) {
        return { base: powerSide.left, constant };
      }
    }
    return null;
  }

  function squareEqualsZeroBase(equation) {
    const square = squaredExpressionAndConstant(equation);
    return square && Math.abs(square.constant) <= EPSILON ? square : null;
  }

  function classifySquareEquationBranching(previousEquation, alternativeEquations) {
    const square = squaredExpressionAndConstant(previousEquation);
    if (!square || square.constant <= EPSILON || alternativeEquations.length !== 2) {
      return { ok: false, kind: 'not-square-branch' };
    }
    const root = Math.sqrt(square.constant);
    if (!Number.isFinite(root)) return { ok: false, kind: 'not-square-branch' };
    const basePolynomial = expressionPolynomial(square.base);
    const expected = [
      addPolynomials(basePolynomial, [root], -1),
      addPolynomials(basePolynomial, [-root], -1)
    ];
    const unused = new Set([0, 1]);
    for (const equation of alternativeEquations) {
      const branchPolynomial = equationPolynomial(equation);
      let matched = null;
      for (const index of unused) {
        if (polynomialProportionalFactor(expected[index], branchPolynomial) !== null) {
          matched = index;
          break;
        }
      }
      if (matched === null) return { ok: false, kind: 'not-square-branch' };
      unused.delete(matched);
    }
    return {
      ok: true,
      kind: 'square-branches',
      message: 'Atpažintas šakojimas: iš reiškinio kvadrato lygties gauti du atvejai su priešingais kvadratinės šaknies ženklais.'
    };
  }

  function classifyEquationBranching(previousEquation, alternativeEquations) {
    const zeroProduct = classifyZeroProductBranching(previousEquation, alternativeEquations);
    if (zeroProduct.ok) return zeroProduct;
    const squareBranches = classifySquareEquationBranching(previousEquation, alternativeEquations);
    if (squareBranches.ok) return squareBranches;
    return { ok: false, kind: 'unexplained-branch' };
  }

  function classifyZeroProductBranching(previousEquation, alternativeEquations) {
    const factors = nonzeroVariableFactorsFromZeroProduct(previousEquation);
    if (factors.length < 2 || alternativeEquations.length !== factors.length) {
      return { ok: false, kind: 'not-zero-product-branch' };
    }

    const unused = new Set(factors.map((_, index) => index));
    for (const equation of alternativeEquations) {
      const branchPolynomial = equationPolynomial(equation);
      let matched = null;
      for (const index of unused) {
        if (polynomialProportionalFactor(factors[index], branchPolynomial) !== null) {
          matched = index;
          break;
        }
      }
      if (matched === null) return { ok: false, kind: 'not-zero-product-branch' };
      unused.delete(matched);
    }

    return {
      ok: true,
      kind: 'zero-product-branches',
      message: 'Atpažintas šakojimas: pritaikyta nulinės sandaugos taisyklė.'
    };
  }

  function classifyAlternativeBranchTransitions(previousEquations, nextEquations) {
    if (!Array.isArray(previousEquations) || !Array.isArray(nextEquations) || previousEquations.length !== nextEquations.length) {
      return { ok: false, kind: 'branch-transition-mismatch' };
    }
    const unused = new Set(previousEquations.map((_, index) => index));
    for (const nextEquation of nextEquations) {
      const nextDescriptor = describePolynomialEquation(nextEquation);
      let matchedIndex = null;
      for (const index of unused) {
        const previousEquation = previousEquations[index];
        const previousDescriptor = describePolynomialEquation(previousEquation);
        if (!samePolynomialSolutionSet(previousDescriptor, nextDescriptor)) continue;
        const transition = classifyLocalEquationTransition(previousEquation, nextEquation);
        if (!transition.ok) continue;
        matchedIndex = index;
        break;
      }
      if (matchedIndex === null) return { ok: false, kind: 'branch-transition-mismatch' };
      unused.delete(matchedIndex);
    }
    return {
      ok: true,
      kind: 'branch-transform',
      message: 'Atpažintas lygiavertis pertvarkymas: kiekviena sprendimo šaka pertvarkyta tiesioginiu lygiaverčiu veiksmu.'
    };
  }

  function classifyLocalEquationTransition(previousEquation, nextEquation) {
    const previous = equationSidePolynomials(previousEquation);
    const next = equationSidePolynomials(nextEquation);

    if (polynomialsApproximatelyEqual(previous.left, next.left) && polynomialsApproximatelyEqual(previous.right, next.right)) {
      return { ok: true, kind: 'simplify', message: 'Atpažintas lygiavertis pertvarkymas: išskleisti skliaustai, sutraukti nariai arba lygiavertiškai supaprastinta lygties pusė.' };
    }

    if (polynomialsApproximatelyEqual(previous.left, next.right) && polynomialsApproximatelyEqual(previous.right, next.left)) {
      const structurallyOnlySwapped = astStructureSignature(previous.left) === astStructureSignature(nextEquation.right)
        && astStructureSignature(previous.right) === astStructureSignature(nextEquation.left);
      return structurallyOnlySwapped
        ? { ok: true, semanticType: 'equivalent-equation', kind: 'swap', operations: ['swap-sides'], message: 'Atpažintas lygiavertis pertvarkymas: sukeistos lygties pusės.' }
        : { ok: true, semanticType: 'equivalent-equation', kind: 'swap-simplify', operations: ['swap-sides', 'simplify'], message: 'Atpažintas sudėtinis žingsnis: sukeistos lygties pusės ir lygiavertiškai pertvarkyta viena arba abi pusės.' };
    }

    const previousDifference = addPolynomials(previous.left, previous.right, -1);
    const nextDifference = addPolynomials(next.left, next.right, -1);
    if (polynomialsApproximatelyEqual(previousDifference, nextDifference)) {
      return {
        ok: true,
        kind: 'balanced-add',
        message: 'Atpažintas lygiavertis pertvarkymas: abiem lygties pusėms pridėtas arba atimtas tas pats reiškinys (taip pat gali būti perkelti keli nariai vienu žingsniu).'
      };
    }

    const factor = equationUniformScale(previous, next);
    if (factor !== null) {
      return {
        ok: true,
        kind: 'scale',
        factor,
        message: Math.abs(factor) < 1
          ? 'Atpažintas lygiavertis pertvarkymas: abi lygties pusės padalytos iš to paties nenulinio skaičiaus.'
          : 'Atpažintas lygiavertis pertvarkymas: abi lygties pusės padaugintos iš to paties nenulinio skaičiaus.'
      };
    }

    return {
      ok: false,
      kind: 'unexplained-jump',
      message: 'Sprendinių aibė išliko ta pati, tačiau ši eilutė nėra vienas tiesioginis ankstesnės lygties pertvarkymas. Parodyk tarpinį žingsnį.'
    };
  }

  function formatSolutionDescriptor(descriptor) {
    if (descriptor.kind === 'all') return 'x ∈ ℝ';
    if (descriptor.kind === 'none') return 'sprendinių nėra';
    const roots = descriptorRoots(descriptor);
    if (roots.length === 1) return `x = ${formatSupportedRoot(roots[0])}`;
    return roots.map(value => `x = ${formatSupportedRoot(value)}`).join('; ');
  }

  function explainPolynomialEquationMismatch(previous, next) {
    return `Ankstesnės eilutės sprendinių aibė: ${formatSolutionDescriptor(previous)}, o naujos eilutės: ${formatSolutionDescriptor(next)}.`;
  }

  function explainEquationMismatch(previous, next) {
    return explainPolynomialEquationMismatch(previous, next);
  }

  function parseSolutionSetInput(source) {
    const raw = String(source || '').trim();
    if (!raw) throw new Error('Parse error: neįrašyta sprendinių aibė');
    const folded = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (folded === '∅' || folded === '{}' || /^(sprendiniu nera|nera sprendiniu|tuscia aibe|s = ∅|s=∅)$/.test(folded)) {
      return { kind: 'none', values: [] };
    }
    let body = raw.trim().replace(/₀/g, '0').replace(/₁/g, '1').replace(/₂/g, '2').replace(/₃/g, '3');
    body = body.replace(/^x\s*[∈∊]\s*/i, '').trim();
    if (body.startsWith('{') && body.endsWith('}')) body = body.slice(1, -1).trim();
    const parts = body.split(/\s*(?:;|\barba\b|\bor\b|\|)\s*/i).filter(Boolean);
    if (!parts.length) throw new Error('Parse error: neįrašyti sprendiniai');
    const values = [];
    for (const part of parts) {
      let candidate = part.trim();
      if (/^x(?:_?[12])?\s*=/.test(candidate.toLowerCase())) candidate = candidate.replace(/^x(?:_?[12])?\s*=\s*/i, '');
      else if (/=\s*x(?:_?[12])?$/i.test(candidate)) candidate = candidate.replace(/=\s*x(?:_?[12])?$/i, '');
      else if (candidate.includes('=')) {
        const descriptor = describePolynomialEquation(parseEquation(candidate));
        const roots = descriptorRoots(descriptor);
        if (descriptor.degree > 1 || roots.length !== 1) throw new Error('Parse error: galutinėje sprendinių aibėje kiekviena lygtis turi nurodyti vieną x reikšmę');
        values.push(roots[0]);
        continue;
      }
      const ast = parseExpression(candidate);
      if (containsVariable(ast, 'x')) throw new Error('Parse error: sprendinys turi būti skaičius');
      const value = evaluateAst(ast, {});
      if (!Number.isFinite(value)) throw new Error('Parse error: sprendinys nėra baigtinis skaičius');
      values.push(value);
    }
    const unique = [];
    values.sort((a, b) => a - b).forEach(value => {
      if (!unique.some(existing => Math.abs(existing - value) <= EPSILON * Math.max(1, Math.abs(existing), Math.abs(value)))) unique.push(value);
    });
    return { kind: unique.length ? 'values' : 'none', values: unique };
  }

  function descriptorToSolutionSet(descriptor) {
    return descriptor.kind === 'none' ? { kind: 'none', values: [] } : { kind: 'values', values: descriptorRoots(descriptor) };
  }

  function suppliedSetToDescriptor(set) {
    if (set.kind === 'none') return { kind: 'none', degree: 0, rootsSupported: true };
    if (set.values.length === 1) return { kind: 'single', degree: 0, value: set.values[0], rootsSupported: true };
    return { kind: 'two', degree: 0, values: set.values, rootsSupported: true };
  }

  function solutionSetMatchesDescriptor(set, descriptor) {
    if (descriptor.kind === 'none') return set.kind === 'none';
    if (set.kind === 'none') return false;
    return sameRootValues(set.values, descriptorRoots(descriptor));
  }

  function solutionSetToMathML(set) {
    const math = m('math');
    const row = m('mrow');
    if (set.kind === 'none') {
      row.append(m('mi', 'S'), m('mo', '='), m('mo', '∅'));
    } else {
      row.append(m('mi', 'x'), m('mo', '∈'), m('mo', '{'));
      set.values.forEach((value, index) => {
        if (index) row.append(m('mo', ';'));
        row.append(renderMathNode(parseExpression(formatSupportedRoot(value))));
      });
      row.append(m('mo', '}'));
    }
    math.appendChild(row);
    return math;
  }

  function containsVariable(node, variable) {
    if (node.type === 'variable') return node.name === variable;
    if (node.type === 'number') return false;
    if (node.type === 'unary') return containsVariable(node.value, variable);
    return containsVariable(node.left, variable) || containsVariable(node.right, variable);
  }

  function constantValue(node) {
    if (containsVariable(node, 'x')) return null;
    const value = evaluateAst(node, {});
    return Number.isFinite(value) ? value : null;
  }

  function isVariableIsolated(equation, variable, expectedValue) {
    const leftIsVariable = equation.left.type === 'variable' && equation.left.name === variable;
    const rightIsVariable = equation.right.type === 'variable' && equation.right.name === variable;
    if (leftIsVariable) {
      const value = constantValue(equation.right);
      return value !== null && Math.abs(value - expectedValue) <= EPSILON * Math.max(1, Math.abs(value), Math.abs(expectedValue));
    }
    if (rightIsVariable) {
      const value = constantValue(equation.left);
      return value !== null && Math.abs(value - expectedValue) <= EPSILON * Math.max(1, Math.abs(value), Math.abs(expectedValue));
    }
    return false;
  }

  function simplifyAst(node) {
    if (node.type === 'number' || node.type === 'variable') return node;
    if (node.type === 'unary') {
      const value = simplifyAst(node.value);
      if (value.type === 'number') return { type: 'number', value: -value.value };
      if (value.type === 'unary' && value.operator === '-') return simplifyAst(value.value);
      return { ...node, value };
    }
    const left = simplifyAst(node.left);
    const right = simplifyAst(node.right);
    if (left.type === 'number' && right.type === 'number') {
      try {
        const value = evaluateAst({ ...node, left, right }, {});
        if (Number.isFinite(value)) return { type: 'number', value };
      } catch (_) { /* paliekame struktūrą */ }
    }
    if (node.operator === '+') {
      if (left.type === 'number' && Math.abs(left.value) < EPSILON) return right;
      if (right.type === 'number' && Math.abs(right.value) < EPSILON) return left;
    }
    if (node.operator === '-') {
      if (right.type === 'number' && Math.abs(right.value) < EPSILON) return left;
    }
    if (node.operator === '*') {
      if ((left.type === 'number' && Math.abs(left.value) < EPSILON) || (right.type === 'number' && Math.abs(right.value) < EPSILON)) return { type: 'number', value: 0 };
      if (left.type === 'number' && Math.abs(left.value - 1) < EPSILON) return right;
      if (right.type === 'number' && Math.abs(right.value - 1) < EPSILON) return left;
    }
    if (node.operator === '/') {
      if (right.type === 'number' && Math.abs(right.value - 1) < EPSILON) return left;
    }
    if (node.operator === '^') {
      if (right.type === 'number' && Math.abs(right.value - 1) < EPSILON) return left;
      if (right.type === 'number' && Math.abs(right.value) < EPSILON) return { type: 'number', value: 1 };
    }
    return { ...node, left, right };
  }

  function astComplexity(node) {
    if (node.type === 'number' || node.type === 'variable') return 1;
    if (node.type === 'unary') return 1 + astComplexity(node.value);
    return 1 + astComplexity(node.left) + astComplexity(node.right);
  }

  function formatNumber(value) {
    if (Math.abs(value) < EPSILON) return '0';
    if (Number.isInteger(value)) return String(value);
    return Number(value.toPrecision(7)).toString().replace('.', ',');
  }

  // -------------------- MathML renderer --------------------

  const MATH_NS = 'http://www.w3.org/1998/Math/MathML';
  const m = (name, text) => {
    const element = document.createElementNS(MATH_NS, name);
    if (text !== undefined) element.textContent = text;
    return element;
  };

  function astToMathML(ast) {
    const math = m('math');
    math.setAttribute('display', 'block');
    math.appendChild(renderMathNode(ast, 0));
    return math;
  }

  function equationToMathML(equation) {
    const math = m('math');
    math.setAttribute('display', 'block');
    const row = m('mrow');
    row.append(renderMathNode(equation.left, 0), m('mo', '='), renderMathNode(equation.right, 0));
    math.appendChild(row);
    return math;
  }

  function precedence(node) {
    if (node.mixedDisplay) return 5;
    if (node.type === 'binary') return { '+': 1, '-': 1, '*': 2, '/': 2, '^': 4 }[node.operator];
    if (node.type === 'unary') return 3;
    return 5;
  }

  function renderMathNode(node, parentPrecedence) {
    if (node.type === 'number') return m('mn', formatNumber(node.value));
    if (node.type === 'variable') return m('mi', node.name);
    if (node.mixedDisplay) {
      const row = m('mrow');
      const fraction = m('mfrac');
      fraction.append(m('mn', String(node.mixedDisplay.numerator)), m('mn', String(node.mixedDisplay.denominator)));
      row.append(m('mn', String(node.mixedDisplay.whole)), fraction);
      return row;
    }
    if (node.type === 'unary') {
      const row = m('mrow');
      row.append(m('mo', '−'), renderMathNode(node.value, node.value.mixedDisplay ? 0 : 3));
      return wrapIfNeeded(row, precedence(node) < parentPrecedence);
    }
    if (node.operator === '/') {
      const fraction = m('mfrac');
      fraction.append(renderMathNode(node.left, 0), renderMathNode(node.right, 0));
      return wrapIfNeeded(fraction, precedence(node) < parentPrecedence);
    }
    if (node.operator === '^') {
      const sup = m('msup');
      sup.append(renderMathNode(node.left, 4), renderMathNode(node.right, 0));
      return wrapIfNeeded(sup, precedence(node) < parentPrecedence);
    }
    const row = m('mrow');
    const prec = precedence(node);
    row.appendChild(renderMathNode(node.left, prec));
    row.appendChild(m('mo', node.operator === '*' ? '·' : node.operator === '-' ? '−' : node.operator));
    row.appendChild(renderMathNode(node.right, node.operator === '-' ? prec + 1 : prec));
    return wrapIfNeeded(row, prec < parentPrecedence);
  }

  function wrapIfNeeded(content, shouldWrap) {
    if (!shouldWrap) return content;
    const row = m('mrow');
    row.append(m('mo', '('), content, m('mo', ')'));
    return row;
  }


  // -------------------- P7.7.2 lentos kamera ir atskiras pratybų režimas --------------------

  let cameraApplying = false;
  let cameraScrollTimer = null;
  const roomBoardViews = new Map();

  function rememberBoardViewForRoom(roomId) {
    const id = String(roomId || '').trim().toUpperCase();
    if (!id || !refs.board) return;
    const zoom = Math.max(0.001, currentBoardZoom());
    const camera = normalizeCamera(state.camera);
    roomBoardViews.set(id, {
      zoom,
      userZoomPercent: boardUserZoomPercent(zoom),
      logicalLeft: refs.board.scrollLeft / zoom - camera.worldOriginX,
      logicalTop: refs.board.scrollTop / zoom - camera.worldOriginY
    });
  }

  function restoreBoardViewForRoom(roomId) {
    const id = String(roomId || '').trim().toUpperCase();
    if (!id || !refs.board) return;
    const saved = roomBoardViews.get(id) || null;
    if (!saved) {
      showBoardFittedFromTop({ save: false });
      return;
    }
    const camera = normalizeCamera(state.camera);
    if (Number.isFinite(saved?.userZoomPercent)) {
      state.camera.zoom = boardZoomForUserPercent(saved.userZoomPercent);
    } else if (saved?.zoom) {
      state.camera.zoom = clampCameraZoom(saved.zoom);
    }
    const zoom = currentBoardZoom();
    applyBoardCamera();
    requestAnimationFrame(() => {
      const logicalLeft = Number.isFinite(saved?.logicalLeft) ? saved.logicalLeft : 0;
      const logicalTop = Number.isFinite(saved?.logicalTop) ? saved.logicalTop : 0;
      refs.board.scrollLeft = Math.max(0, (camera.worldOriginX + logicalLeft) * zoom);
      refs.board.scrollTop = Math.max(0, (camera.worldOriginY + logicalTop) * zoom);
      state.camera.scrollLeft = refs.board.scrollLeft;
      state.camera.scrollTop = refs.board.scrollTop;
    });
  }

  window.addEventListener('p2:room-switch-start', event => {
    rememberBoardViewForRoom(event.detail?.fromRoom);
  });
  window.addEventListener('p2:room-switch-complete', event => {
    restoreBoardViewForRoom(event.detail?.roomId);
  });

  window.addEventListener('p2:workspace-ready', event => {
    // Pradinio puslapio įkėlimo metu neturime room-switch įvykio. Naujas arba pirmą
    // kartą šiame naršyklės seanse atvertas Room pradedamas nuo lentos viršaus.
    if (event.detail?.switched) return;
    const id = String(event.detail?.roomId || '').trim().toUpperCase();
    if (id && roomBoardViews.has(id)) restoreBoardViewForRoom(id);
    else showBoardFittedFromTop({ save: false });
  });


  // P1.7.9.7: perjungiant Padalintas ↔ Lenta mastelis nebekeičiamas automatiškai.
  // Abu režimai turi tą patį lentos konteinerio plotį, todėl pakanka perskaičiuoti
  // kamerą ir horizontalaus centravimo paraštes, išlaikant tą pačią vertikalią vietą.
  window.addEventListener('p2:view-changed', event => {
    const nextView = String(event.detail?.view || '');
    if (!['board', 'split'].includes(nextView) || state.practiceOnly?.active) return;
    const zoom = currentBoardZoom();
    const logicalTop = refs.board.scrollTop / Math.max(0.001, zoom);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      applyBoardCamera();
      requestAnimationFrame(() => {
        refs.board.scrollTop = Math.max(0, logicalTop * currentBoardZoom());
        state.camera.scrollTop = refs.board.scrollTop;
      });
    }));
  });

  function boardHorizontalCenterOffsetScreen(zoom = currentBoardZoom(), world = getBoardWorldRect()) {
    return BoardCamera.horizontalCenterOffsetScreen(state?.camera || {}, refs, zoom, world, BOARD_CAMERA_CONFIG);
  }

  function applyBoardCamera(options = {}) {
    BoardCamera.applyCamera({
      getState: () => state,
      refs,
      config: BOARD_CAMERA_CONFIG,
      callbacks: {
        setApplying: value => { cameraApplying = Boolean(value); },
        applyGrid: (boardWorld, camera) => BoardGrid.applyGrid(boardWorld, camera, BOARD_CAMERA_CONFIG),
        resizeCanvas,
        layoutBoardObjects,
        refreshMathFieldRendering
      }
    }, options);
  }

  function setBoardZoom(value, options = {}) {
    const oldZoom = currentBoardZoom();
    state.camera.zoom = clampCameraZoom(value);
    applyBoardCamera({ ...options, oldZoom });
    scheduleSave();
  }

  function boardContentBounds() {
    const world = getBoardWorldRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const include = (left, top, right = left, bottom = top) => {
      if (![left, top, right, bottom].every(Number.isFinite)) return;
      minX = Math.min(minX, left); minY = Math.min(minY, top);
      maxX = Math.max(maxX, right); maxY = Math.max(maxY, bottom);
    };
    for (const stroke of state.drawing) {
      for (const point of stroke?.points || []) include(point.x * world.width, point.y * world.height);
    }
    for (const note of state.notes) {
      const element = refs.objectsLayer.querySelector(`[data-note-id="${CSS.escape(String(note.id))}"]`);
      const left = note.x * world.width, top = note.y * world.height;
      include(left, top, left + Math.max(110, note.width || 420), top + Math.max(54, element?.offsetHeight || 90));
    }
    for (const image of state.boardImages) include(image.x * world.width, image.y * world.height, (image.x + image.width) * world.width, (image.y + image.height) * world.height);
    for (const task of state.boardTasks) { const r = boardTaskPixelRect(task, world); include(r.x, r.y, r.x + r.width, r.y + r.height); }
    for (const practice of state.boardPractices) { const r = boardPracticePixelRect(practice, world); include(r.x, r.y, r.x + r.width, r.y + r.height); }
    // Sąmoningai neįtraukiame seno plaukiojančio pratybų lango. Istoriniuose Room
    // jo x/y dažnai likę (0;0), nors realus mokinio rašymas prasideda už kelių
    // tūkstančių pasaulio pikselių. Įtraukus langą automatinis fokusas klaidingai
    // laikytų lentos pradžią turinio pradžia ir vartotojui vėl tektų ieškoti rašymo.
    return Number.isFinite(minX) ? { minX, minY, maxX, maxY } : null;
  }

  function alignLegacyBoardContentToViewportTop(options = {}) {
    if (!boardUsesLegacyReadableScale() || !refs.board) return false;
    const bounds = boardContentBounds();
    if (!bounds) return false;
    const zoom = currentBoardZoom();
    const paddingX = Math.max(12, Number(options.paddingX) || BOARD_LEGACY_FIT_PADDING_X);
    const paddingY = Math.max(8, Number(options.paddingY) || 18);
    refs.board.scrollLeft = Math.max(0, bounds.minX * zoom - paddingX);
    refs.board.scrollTop = Math.max(0, bounds.minY * zoom - paddingY);
    state.camera.scrollLeft = refs.board.scrollLeft;
    state.camera.scrollTop = refs.board.scrollTop;
    return true;
  }

  function showBoardFittedFromTop(options = {}) {
    const legacyReadable = boardUsesLegacyReadableScale();
    let settled = false;
    let attempt = 0;
    const retryDelays = [0, 40, 120, 260, 500, 900, 1500];

    // P1.7.9.47: naujo 720 px Room workspace-ready kartais ateina dar prieš
    // galutinį flex/grid išdėstymą. Pirmą akimirką board.clientWidth gali būti
    // keliais procentais per mažas, todėl ankstesnė versija užfiksuodavo, pvz.,
    // 98 %, nors po kelių kadrų 100 % jau visiškai telpa. Kelis kartus tyliai
    // perskaičiuojame TIK pradinį fit. Jei vartotojas per tą laiką pats pakeitė
    // mastelį, vėlyvas perskaičiavimas iškart nutraukiamas.
    let nonLegacyLastAppliedZoom = null;
    let nonLegacySettleIndex = 0;
    const nonLegacySettleDelays = [80, 220, 500, 900];

    const settleNonLegacyInitialFit = () => {
      if (legacyReadable || !refs.board || nonLegacySettleIndex >= nonLegacySettleDelays.length) return;
      const delay = nonLegacySettleDelays[nonLegacySettleIndex++];
      setTimeout(() => {
        if (legacyReadable || !refs.board) return;
        const currentZoom = currentBoardZoom();
        // Vartotojo + / − / 100 % paspaudimas turi absoliučią pirmenybę.
        if (Number.isFinite(nonLegacyLastAppliedZoom) && Math.abs(currentZoom - nonLegacyLastAppliedZoom) > 0.0025) return;

        const targetZoom = boardInitialFitZoom();
        if (Math.abs(targetZoom - currentZoom) > 0.001) {
          state.camera.zoom = targetZoom;
          state.camera.scrollLeft = 0;
          state.camera.scrollTop = 0;
          applyBoardCamera();
          requestAnimationFrame(() => {
            refs.board.scrollLeft = 0;
            refs.board.scrollTop = 0;
            state.camera.scrollLeft = 0;
            state.camera.scrollTop = 0;
          });
        }
        nonLegacyLastAppliedZoom = targetZoom;
        settleNonLegacyInitialFit();
      }, delay);
    };

    const applyFitAndAlign = () => {
      attempt += 1;
      // Tai tik pradinis PERŽIŪROS pritaikymas. Pats worldWidth/worldHeight ir visas
      // Room turinys neliečiami. UI procentas rodo realų camera.zoom.
      state.camera.zoom = boardInitialFitZoom();
      if (!legacyReadable) nonLegacyLastAppliedZoom = state.camera.zoom;
      state.camera.scrollLeft = 0;
      state.camera.scrollTop = 0;
      applyBoardCamera();

      requestAnimationFrame(() => {
        let aligned = true;
        if (legacyReadable) {
          aligned = alignLegacyBoardContentToViewportTop();
        } else {
          refs.board.scrollLeft = 0;
          refs.board.scrollTop = 0;
          state.camera.scrollLeft = 0;
          state.camera.scrollTop = 0;
        }

        // workspace-ready gali įvykti anksčiau už Firebase drawing snapshot'ą.
        // Kol realaus turinio ribų dar nėra, kelis kartus tyliai pakartojame.
        if (legacyReadable && !aligned && attempt < retryDelays.length) {
          setTimeout(applyFitAndAlign, retryDelays[attempt]);
          return;
        }

        // Po Firebase snapshot'o turinio ribos gali pasipildyti, todėl vieną kartą
        // vėliau perskaičiuojame tik pradinį fit mastelį. Tai nėra 100 % keitimas.
        if (legacyReadable && aligned && !settled && attempt < 4) {
          settled = true;
          setTimeout(applyFitAndAlign, 220);
          return;
        }

        if (!legacyReadable) settleNonLegacyInitialFit();
        if (options.save !== false) scheduleSave();
      });
    };

    applyFitAndAlign();
  }

  function focusBoardElement(element, options = {}) {
    if (!element || !refs.boardWorld.contains(element)) return false;
    const viewportWidth = Math.max(1, refs.board.clientWidth);
    const viewportHeight = Math.max(1, refs.board.clientHeight);
    const padding = Number(options.padding) || 54;
    const width = Math.max(1, element.offsetWidth);
    const height = Math.max(1, element.offsetHeight);
    const maxZoom = Number(options.maxZoom) || 1.35;
    const targetZoom = clampCameraZoom(Math.min(maxZoom, (viewportWidth - padding * 2) / width, (viewportHeight - padding * 2) / height));
    state.camera.zoom = targetZoom;
    applyBoardCamera();
    requestAnimationFrame(() => {
      refs.board.scrollLeft = Math.max(0, (element.offsetLeft + width / 2) * targetZoom - viewportWidth / 2);
      refs.board.scrollTop = Math.max(0, (element.offsetTop + height / 2) * targetZoom - viewportHeight / 2);
      state.camera.scrollLeft = refs.board.scrollLeft;
      state.camera.scrollTop = refs.board.scrollTop;
      scheduleSave();
    });
    return true;
  }

  function focusActiveBoardObject() {
    const selection = normalizeBoardObjectSelection(state.activeBoardObject?.type, state.activeBoardObject?.id);
    const element = getBoardObjectElement(selection);
    if (element && focusBoardElement(element, { maxZoom: selection?.type === 'practice-window' ? 1.05 : 1.35 })) return;
    clearActiveBoardObject({ save: false });
    showToast('Pirmiausia pažymėk objektą lentoje');
  }

  function activePracticeOnlyInstance() {
    const id = state.practiceOnly?.practiceId || state.activeBoardPracticeId;
    return state.boardPractices.find(item => item.id === id) || state.boardPractices[0] || null;
  }

  function mountPracticeOnlyObject() {
    if (!state.practiceOnly?.active || !refs.practiceOnlyHost) return;
    const instance = activePracticeOnlyInstance();
    if (!instance) return;
    state.practiceOnly.practiceId = instance.id;
    state.activeBoardPracticeId = instance.id;
    state.activeBoardObject = { type: 'practice', id: instance.id };
    const object = refs.objectsLayer.querySelector(`[data-board-practice-id="${instance.id}"]`);
    if (!object) return;
    object.classList.add('is-practice-only', 'is-active-object');
    object.style.removeProperty('left');
    object.style.removeProperty('top');
    object.style.removeProperty('width');
    object.style.removeProperty('height');
    refs.practiceOnlyHost.replaceChildren(object);
    refs.practiceOnlyTitle.textContent = instance.title || 'Pratybos';
    requestAnimationFrame(() => requestAnimationFrame(() => applyPracticePageScale(object, instance)));
  }

  function enterPracticeOnly(practiceId = null) {
    const instance = state.boardPractices.find(item => item.id === practiceId)
      || state.boardPractices.find(item => item.id === state.activeBoardPracticeId)
      || state.boardPractices[0];
    if (!instance) {
      showToast('Lentoje dar nėra puslapinių pratybų');
      return;
    }
    instance.collapsed = false;
    instance.page = { ...(instance.page || {}), viewMode: 'fit-width' };
    state.practiceOnly = { active: true, practiceId: instance.id };
    state.activeBoardPracticeId = instance.id;
    state.activeBoardObject = { type: 'practice', id: instance.id };
    document.body.classList.add('practice-only-mode');
    refs.practiceOnlyOverlay.hidden = false;
    renderBoardObjects();
    scheduleSave();
  }

  function exitPracticeOnly() {
    if (!state.practiceOnly?.active) return;
    prepareMathDomReplacement(refs.practiceOnlyHost);
    const practiceId = state.practiceOnly.practiceId;
    state.practiceOnly.active = false;
    clearMathEditSession();
    document.body.classList.remove('practice-only-mode');
    refs.practiceOnlyOverlay.hidden = true;
    refs.practiceOnlyHost.replaceChildren();
    renderBoardObjects();
    scheduleSave();
    requestAnimationFrame(() => {
      const object = refs.objectsLayer.querySelector(`[data-board-practice-id="${practiceId}"]`);
      if (object) focusBoardElement(object, { maxZoom: 1.05 });
    });
  }

  function installBoardCamera() {
    refs.boardZoomOutButton.addEventListener('click', () => setBoardUserZoomPercent(boardUserZoomPercent() - 10, { preserveCenter: true }));
    refs.boardZoomInButton.addEventListener('click', () => setBoardUserZoomPercent(boardUserZoomPercent() + 10, { preserveCenter: true }));
    refs.boardZoomActualButton.addEventListener('click', () => {
      // 100 % nuo P1.7.9.43 reiškia vienodą VIZUALŲ mastelį; senam 2400 px Room tai camera.zoom = 1/3.
      setBoardUserZoomPercent(100, { preserveCenter: true });
    });
    refs.boardFocusObjectButton.addEventListener('click', focusActiveBoardObject);
    refs.practiceOnlyButton.addEventListener('click', () => enterPracticeOnly());
    refs.exitPracticeOnlyButton.addEventListener('click', exitPracticeOnly);

    refs.board.addEventListener('scroll', () => {
      if (cameraApplying) return;
      state.camera.scrollLeft = refs.board.scrollLeft;
      state.camera.scrollTop = refs.board.scrollTop;
      scheduleCanvasViewportRefresh();
      clearTimeout(cameraScrollTimer);
      cameraScrollTimer = window.setTimeout(scheduleSave, 140);
      scheduleBoardEdgeExpansion();
    }, { passive: true });

    refs.board.addEventListener('wheel', event => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = refs.board.getBoundingClientRect();
        const factor = event.deltaY < 0 ? 1.1 : 0.9;
        setBoardZoom(currentBoardZoom() * factor, {
          anchorViewportX: event.clientX - rect.left,
          anchorViewportY: event.clientY - rect.top
        });
        return;
      }
      // Paprastas ratukas slenka vertikaliai. Priartėjus prie apatinio krašto
      // pridedame naują vertikalios juostos segmentą; į šonus ir viršų lenta neauga.
      expandBoardForScrollIntent(event.deltaX, event.deltaY);
    }, { passive: false });

    let pan = null;
    let mousePan = null;
    const touchPoints = new Map();
    let pinch = null;
    const isBoardBackground = target => target === refs.board || target === refs.boardStage || target === refs.boardWorld || target === refs.canvas || target === refs.objectsLayer;
    refs.board.addEventListener('pointerdown', event => {
      if (state.activeTool === 'pan' && !state.practiceOnly?.active && event.button === 0) {
        event.preventDefault();
        mousePan = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: refs.board.scrollLeft, top: refs.board.scrollTop };
        document.body.classList.add('is-board-panning');
        try { refs.board.setPointerCapture(event.pointerId); } catch (_) {}
        return;
      }
      if (event.pointerType !== 'touch' || !['select', 'pan'].includes(state.activeTool) || state.practiceOnly?.active) return;
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.size === 1 && isBoardBackground(event.target)) {
        pan = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: refs.board.scrollLeft, top: refs.board.scrollTop };
      }
      if (touchPoints.size === 2) {
        const points = [...touchPoints.values()];
        const dx = points[1].x - points[0].x;
        const dy = points[1].y - points[0].y;
        const rect = refs.board.getBoundingClientRect();
        const midX = (points[0].x + points[1].x) / 2 - rect.left;
        const midY = (points[0].y + points[1].y) / 2 - rect.top;
        pinch = { distance: Math.max(20, Math.hypot(dx, dy)), zoom: currentBoardZoom(), midX, midY };
        pan = null;
      }
    }, true);
    refs.board.addEventListener('pointermove', event => {
      if (mousePan && mousePan.pointerId === event.pointerId) {
        event.preventDefault();
        let targetLeft = mousePan.left - (event.clientX - mousePan.startX);
        let targetTop = mousePan.top - (event.clientY - mousePan.startY);
        const dxIntent = targetLeft < refs.board.scrollLeft ? -1 : targetLeft > refs.board.scrollLeft ? 1 : 0;
        const dyIntent = targetTop < refs.board.scrollTop ? -1 : targetTop > refs.board.scrollTop ? 1 : 0;
        const expansion = expandBoardForScrollIntent(dxIntent, dyIntent);
        if (expansion?.left) { mousePan.left += expansion.left * currentBoardZoom(); targetLeft += expansion.left * currentBoardZoom(); }
        if (expansion?.top) { mousePan.top += expansion.top * currentBoardZoom(); targetTop += expansion.top * currentBoardZoom(); }
        refs.board.scrollLeft = Math.max(0, targetLeft);
        refs.board.scrollTop = Math.max(0, targetTop);
        state.camera.scrollLeft = refs.board.scrollLeft;
        state.camera.scrollTop = refs.board.scrollTop;
        return;
      }
      if (!touchPoints.has(event.pointerId)) return;
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.size >= 2 && pinch) {
        event.preventDefault();
        const points = [...touchPoints.values()].slice(0, 2);
        const distance = Math.max(20, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y));
        setBoardZoom(pinch.zoom * distance / pinch.distance, { anchorViewportX: pinch.midX, anchorViewportY: pinch.midY });
      } else if (pan && pan.pointerId === event.pointerId) {
        event.preventDefault();
        let targetLeft = pan.left - (event.clientX - pan.startX);
        let targetTop = pan.top - (event.clientY - pan.startY);
        const expansion = expandBoardForScrollIntent(targetLeft < refs.board.scrollLeft ? -1 : targetLeft > refs.board.scrollLeft ? 1 : 0,
          targetTop < refs.board.scrollTop ? -1 : targetTop > refs.board.scrollTop ? 1 : 0);
        if (expansion?.left) { pan.left += expansion.left * currentBoardZoom(); targetLeft += expansion.left * currentBoardZoom(); }
        if (expansion?.top) { pan.top += expansion.top * currentBoardZoom(); targetTop += expansion.top * currentBoardZoom(); }
        refs.board.scrollLeft = Math.max(0, targetLeft);
        refs.board.scrollTop = Math.max(0, targetTop);
        state.camera.scrollLeft = refs.board.scrollLeft;
        state.camera.scrollTop = refs.board.scrollTop;
      }
    }, { capture: true, passive: false });
    const endTouch = event => {
      if (mousePan?.pointerId === event.pointerId) {
        mousePan = null;
        document.body.classList.remove('is-board-panning');
        try { refs.board.releasePointerCapture(event.pointerId); } catch (_) {}
      }
      touchPoints.delete(event.pointerId);
      if (pan?.pointerId === event.pointerId) pan = null;
      if (touchPoints.size < 2) pinch = null;
    };
    refs.board.addEventListener('pointerup', endTouch, true);
    refs.board.addEventListener('pointercancel', endTouch, true);

    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && state.practiceOnly?.active) exitPracticeOnly();
    });

    state.camera = normalizeCamera(state.camera);
    applyBoardCamera({ restoreScroll: true });
  }

  // -------------------- Virtualios lentos įrankiai --------------------

  function setTool(tool) {
    state.activeTool = tool;
    document.body.dataset.tool = tool;
    document.querySelectorAll('[data-tool]').forEach(button => button.classList.toggle('is-active', button.dataset.tool === tool));
    scheduleSave();
  }

  function configureCanvasContext(context, backingScale, viewport = canvasViewport) {
    BoardDrawing.configureCanvasContext(context, backingScale, viewport);
  }

  function clearPhysicalCanvas(context, canvas) {
    BoardDrawing.clearPhysicalCanvas(context, canvas);
  }

  function visibleBoardWorldRect() {
    const zoom = Math.max(0.001, currentBoardZoom());
    const world = getBoardWorldRect();
    const left = Math.max(0, refs.board.scrollLeft / zoom);
    const top = Math.max(0, refs.board.scrollTop / zoom);
    const width = Math.max(1, refs.board.clientWidth / zoom);
    const height = Math.max(1, refs.board.clientHeight / zoom);
    return {
      left, top, width, height,
      right: Math.min(world.width, left + width),
      bottom: Math.min(world.height, top + height)
    };
  }

  function desiredCanvasViewport() {
    const zoom = Math.max(0.001, currentBoardZoom());
    const world = getBoardWorldRect();
    const visible = visibleBoardWorldRect();
    const overscan = BOARD_CANVAS_OVERSCAN_SCREEN / zoom;
    const left = Math.max(0, visible.left - overscan);
    const top = Math.max(0, visible.top - overscan);
    const right = Math.min(world.width, visible.right + overscan);
    const bottom = Math.min(world.height, visible.bottom + overscan);
    return { left, top, width: Math.max(1, right - left), height: Math.max(1, bottom - top), right, bottom };
  }

  function canvasViewportStillCoversVisible() {
    if (!canvasViewport) return false;
    const zoom = Math.max(0.001, currentBoardZoom());
    const world = getBoardWorldRect();
    const visible = visibleBoardWorldRect();
    const guard = BOARD_CANVAS_REPOSITION_GUARD_SCREEN / zoom;
    const leftOk = canvasViewport.left <= 0.01 || canvasViewport.left <= visible.left - guard;
    const topOk = canvasViewport.top <= 0.01 || canvasViewport.top <= visible.top - guard;
    const rightOk = canvasViewport.right >= world.width - 0.01 || canvasViewport.right >= visible.right + guard;
    const bottomOk = canvasViewport.bottom >= world.height - 0.01 || canvasViewport.bottom >= visible.bottom + guard;
    return leftOk && topOk && rightOk && bottomOk && Math.abs((canvasViewport.zoom || 0) - zoom) < 0.0001;
  }

  function resizeCanvas(options = {}) {
    if (!refs.canvas || !refs.board) return;
    const force = options === true || Boolean(options?.force);
    if (!force && canvasViewportStillCoversVisible()) return;

    const zoom = Math.max(0.001, currentBoardZoom());
    const viewport = desiredCanvasViewport();
    const deviceDpr = Math.max(1, Math.min(BOARD_CANVAS_MAX_DEVICE_DPR, window.devicePixelRatio || 1));
    // Kadangi visas boardWorld mastelis keičiamas CSS zoom/transform būdu, bitmapui
    // reikia deviceDpr * zoom pikselių vienam pasaulio vienetui. Taip fizinis bitmapo
    // dydis išlieka maždaug ekrano dydžio, net kai virtualus pasaulis yra milžiniškas.
    const backingScale = Math.max(0.2, deviceDpr * zoom);
    viewport.zoom = zoom;
    viewport.backingScale = backingScale;
    canvasViewport = viewport;

    refs.canvas.style.left = `${viewport.left}px`;
    refs.canvas.style.top = `${viewport.top}px`;
    refs.canvas.style.width = `${viewport.width}px`;
    refs.canvas.style.height = `${viewport.height}px`;
    refs.canvas.width = Math.max(1, Math.round(viewport.width * backingScale));
    refs.canvas.height = Math.max(1, Math.round(viewport.height * backingScale));
    drawingContext = refs.canvas.getContext('2d');
    configureCanvasContext(drawingContext, backingScale, viewport);

    if (!committedCanvas) committedCanvas = document.createElement('canvas');
    committedCanvas.width = refs.canvas.width;
    committedCanvas.height = refs.canvas.height;
    committedContext = committedCanvas.getContext('2d');
    configureCanvasContext(committedContext, backingScale, viewport);

    rebuildCommittedCanvas();
    redrawCanvas();
    clampWindowToBoard();
  }

  function scheduleCanvasViewportRefresh(options = {}) {
    if (canvasViewportRaf) return;
    canvasViewportRaf = requestAnimationFrame(() => {
      canvasViewportRaf = 0;
      resizeCanvas(options);
    });
  }

  // P1.7.9.25: tylus techninės diagnostikos kanalas. Jis nesiunčia mokinio
  // atsakymų ar rašomo turinio — tik lentos geometrijos / pointer / canvas būseną.
  let lastDiagnosticEventAt = 0;
  function emitBoardDiagnostic(type, detail = {}, throttleMs = 0) {
    const now = Date.now();
    if (throttleMs > 0 && now - lastDiagnosticEventAt < throttleMs) return;
    lastDiagnosticEventAt = now;
    try {
      window.dispatchEvent(new CustomEvent('p772:diagnostic-event', {
        detail: { type: String(type || 'board-event').slice(0, 80), at: now, ...detail }
      }));
    } catch (_) { /* diagnostika negali trukdyti lentai */ }
  }

  function boardDiagnosticSnapshot() {
    const world = getBoardWorldRect();
    const zoom = Math.max(0.001, currentBoardZoom());
    const boardRect = refs.board?.getBoundingClientRect?.() || null;
    const canvasRect = refs.canvas?.getBoundingClientRect?.() || null;
    return {
      at: Date.now(),
      view: String(document.body?.dataset?.p2View || ''),
      tool: String(state.activeTool || ''),
      practiceOnly: Boolean(state.practiceOnly?.active),
      board: {
        viewportWidth: Math.round(refs.board?.clientWidth || 0),
        viewportHeight: Math.round(refs.board?.clientHeight || 0),
        rectWidth: Math.round((boardRect?.width || 0) * 10) / 10,
        rectHeight: Math.round((boardRect?.height || 0) * 10) / 10,
        scrollLeft: Math.round((refs.board?.scrollLeft || 0) * 10) / 10,
        scrollTop: Math.round((refs.board?.scrollTop || 0) * 10) / 10,
        worldWidth: Math.round(world.width || 0),
        worldHeight: Math.round(world.height || 0),
        zoom: Math.round(zoom * 10000) / 10000,
        userZoomPercent: boardUserZoomPercent(zoom),
        fitZoom: Math.round(boardInitialFitZoom() * 10000) / 10000,
        centerOffsetX: Math.round(boardHorizontalCenterOffsetScreen(zoom, world) * 10) / 10
      },
      canvas: {
        ready: Boolean(drawingContext && canvasViewport && refs.canvas?.width > 1 && refs.canvas?.height > 1),
        cssWidth: Math.round((canvasRect?.width || 0) * 10) / 10,
        cssHeight: Math.round((canvasRect?.height || 0) * 10) / 10,
        backingWidth: Math.round(refs.canvas?.width || 0),
        backingHeight: Math.round(refs.canvas?.height || 0),
        viewport: canvasViewport ? {
          left: Math.round(Number(canvasViewport.left || 0) * 10) / 10,
          top: Math.round(Number(canvasViewport.top || 0) * 10) / 10,
          width: Math.round(Number(canvasViewport.width || 0) * 10) / 10,
          height: Math.round(Number(canvasViewport.height || 0) * 10) / 10,
          zoom: Math.round(Number(canvasViewport.zoom || 0) * 10000) / 10000
        } : null
      },
      drawing: {
        strokeCount: Array.isArray(state.drawing) ? state.drawing.length : 0,
        active: Boolean(boardInput?.isDrawingActive()),
        activePointCount: boardInput?.getActiveStroke()?.points?.length || 0
      }
    };
  }

  let boardDrawNotReadyToastAt = 0;
  function ensureCanvasReadyForDrawing() {
    if (drawingContext && canvasViewport && refs.canvas?.width > 1 && refs.canvas?.height > 1
      && refs.board?.clientWidth > 1 && refs.board?.clientHeight > 1) return true;
    // Pabandome sinchroniškai užbaigti canvas inicializaciją. Jei darbo sritis dar
    // neturi realaus dydžio, brūkšnio visai nekuriame — ypač ne (0;0) taške.
    resizeCanvas({ force: true });
    const ready = Boolean(drawingContext && canvasViewport && refs.canvas?.width > 1 && refs.canvas?.height > 1
      && refs.board?.clientWidth > 1 && refs.board?.clientHeight > 1);
    if (!ready && Date.now() - boardDrawNotReadyToastAt > 1600) {
      boardDrawNotReadyToastAt = Date.now();
      emitBoardDiagnostic('canvas-not-ready-for-drawing', {
        boardWidth: refs.board?.clientWidth || 0, boardHeight: refs.board?.clientHeight || 0,
        canvasWidth: refs.canvas?.width || 0, canvasHeight: refs.canvas?.height || 0,
        hasContext: Boolean(drawingContext), hasViewport: Boolean(canvasViewport)
      });
      showToast('Lenta dar kraunama – pabandyk rašyti dar kartą po akimirkos');
    }
    return ready;
  }

  function boardDrawingRenderOptions() {
    return { strokeRenderWorldWidth: boardStrokeRenderWorldWidth };
  }

  function drawStrokeSegment(context, stroke, fromPoint, toPoint, rect = getBoardWorldRect()) {
    BoardDrawing.drawStrokeSegment(context, stroke, fromPoint, toPoint, rect, boardDrawingRenderOptions());
  }

  function drawStrokePoint(context, stroke, point, rect = getBoardWorldRect()) {
    BoardDrawing.drawStrokePoint(context, stroke, point, rect, boardDrawingRenderOptions());
  }

  function drawStrokeToContext(context, stroke, rect = getBoardWorldRect()) {
    BoardDrawing.drawStrokeToContext(context, stroke, rect, boardDrawingRenderOptions());
  }

  function rebuildCommittedCanvas() {
    BoardDrawing.rebuildCommittedCanvas(
      committedContext, committedCanvas, state.drawing, getBoardWorldRect(), boardDrawingRenderOptions()
    );
  }

  function paintCommittedStroke(stroke) {
    BoardDrawing.paintCommittedStroke(
      committedContext, stroke, getBoardWorldRect(), boardDrawingRenderOptions()
    );
  }

  boardInput = BoardInput.createController({
    refs: { board: refs.board, canvas: refs.canvas },
    BoardDrawing,
    getActiveTool: () => state.activeTool,
    getOnlineRole: () => document.body?.dataset?.onlineRole,
    getWorldRect: getBoardWorldRect,
    getZoom: currentBoardZoom,
    getHorizontalCenterOffsetScreen: boardHorizontalCenterOffsetScreen,
    ensureCanvasReadyForDrawing,
    scheduleCanvasViewportRefresh,
    getDrawingContext: () => drawingContext,
    drawStrokePoint,
    drawStrokeSegment,
    paintCommittedStroke,
    commitStroke: stroke => state.drawing.push(stroke),
    emitBoardDiagnostic,
    scheduleSave,
    shouldNotifyShared: () => !window.__p772DirectDrawingSyncReady
  });

  function redrawCanvas() {
    BoardDrawing.redrawCanvas(
      drawingContext, refs.canvas, committedCanvas, remoteLiveStrokes, boardInput?.getActiveStroke() || null,
      getBoardWorldRect(), boardDrawingRenderOptions()
    );
  }

  function drawStroke(stroke) {
    BoardDrawing.drawStrokeToContext(
      drawingContext, stroke, getBoardWorldRect(), boardDrawingRenderOptions()
    );
  }

  function mixedEditorFromNode(node) {
    return BoardTextEditor.editorFromNode(node);
  }

  function mixedFormulaWrapperFromNode(node) {
    return BoardTextEditor.formulaWrapperFromNode(node);
  }

  function directMathFieldHasDomFocus(field) {
    if (!field?.isConnected) return false;
    try { return document.activeElement === field || field.matches(':focus-within'); } catch (_) { return document.activeElement === field; }
  }

  function currentMixedTextRange(editor) {
    return BoardTextEditor.currentTextRange(editor);
  }

  function deactivateMathForMixedTextRange(editor, range = null) {
    const textRange = range?.cloneRange?.() || currentMixedTextRange(editor);
    if (!textRange) return false;
    if (activeDirectMathField) clearMathEditSession();
    try { savedMixedTextRange = textRange.cloneRange(); } catch (_) { savedMixedTextRange = null; }
    updateMathToolbarUi();
    return true;
  }

  // P2-SPLIT-P2.2.2 / M2.6: trumpa vietinio teksto redagavimo nuoma dabar
  // priklauso board-text-editor.js. Taip nuotolinis tekstas neužšąla dėl seno
  // Chromium focus, tačiau MathLive sesijos šaltinis ir Firebase lieka app.js.
  const sharedNoteEditLease = BoardTextEditor.createSharedEditLease({
    leaseMs: 420,
    getActiveEditor: () => activeMixedTextEditor?.isConnected ? activeMixedTextEditor : null,
    getActiveMathField: () => activeDirectMathField?.isConnected ? activeDirectMathField : null,
    mathFieldHasFocus: directMathFieldHasDomFocus,
    registeredBoardMathEditing: () => {
      const registered = mathFieldRegistry.get(mathEditSession.key);
      return Boolean(registered?.isConnected
        && registered.closest?.('.board-note')
        && (directMathFieldHasDomFocus(registered) || mathEditSession.restorePending));
    },
    onEditingEnded: () => window.dispatchEvent(new CustomEvent('p772:shared-note-editing-ended'))
  });

  function markSharedNoteLocalActivity() {
    sharedNoteEditLease.markActivity();
  }

  function sharedNoteEditingActive() {
    return sharedNoteEditLease.isEditing();
  }

  function notifySharedNoteEditingEndedSoon() {
    sharedNoteEditLease.notifyEndedSoon();
  }

  function setActiveMixedTextEditor(editor, options = {}) {
    const previous = activeMixedTextEditor;
    const next = editor?.isConnected ? editor : null;
    if (activeMixedTextEditor && activeMixedTextEditor !== next) activeMixedTextEditor.closest('.board-note')?.classList.remove('is-mixed-editing');
    activeMixedTextEditor = next;
    if (next) {
      next.closest('.board-note')?.classList.add('is-mixed-editing');
      const noteId = next.closest('.board-note')?.dataset.noteId;
      if (noteId) setActiveBoardObject('note', noteId, { save: options.save !== false });
    }
    updateMathToolbarUi();
    if (previous && !next) notifySharedNoteEditingEndedSoon();
  }

  function captureMixedTextSelection(editor = activeMixedTextEditor) {
    const range = currentMixedTextRange(editor);
    if (!range) return null;
    deactivateMathForMixedTextRange(editor, range);
    return savedMixedTextRange;
  }

  function placeTextCaretAfter(node, editor = activeMixedTextEditor) {
    if (!node || !editor) return;
    let bridge = node.nextSibling;
    if (!bridge || bridge.nodeType !== Node.TEXT_NODE) {
      bridge = document.createTextNode('\u200B');
      node.parentNode?.insertBefore(bridge, node.nextSibling);
    }
    const range = document.createRange();
    range.setStart(bridge, bridge.textContent?.length || 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedMixedTextRange = range.cloneRange();
    try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
  }

  function placeTextCaretBefore(node, editor = activeMixedTextEditor) {
    if (!node || !editor) return;
    let bridge = node.previousSibling;
    if (!bridge || bridge.nodeType !== Node.TEXT_NODE) {
      bridge = document.createTextNode('\u200B');
      node.parentNode?.insertBefore(bridge, node);
    }
    const range = document.createRange();
    range.setStart(bridge, bridge.textContent?.length || 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedMixedTextRange = range.cloneRange();
    try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
  }

  function placeTextCaretOnNewLineAfter(node, editor = activeMixedTextEditor) {
    if (!node?.isConnected || !editor?.isConnected || !node.parentNode) return null;
    const parent = node.parentNode;
    const next = node.nextSibling;
    const reusableBridge = next?.nodeType === Node.TEXT_NODE
      && !String(next.nodeValue || '').replace(/\u200B/g, '').length
      ? next
      : null;
    const lineBreak = document.createElement('br');
    parent.insertBefore(lineBreak, next);
    const marker = reusableBridge || document.createTextNode('\u200B');
    if (!reusableBridge) parent.insertBefore(marker, next);

    const range = document.createRange();
    range.setStart(marker, marker.textContent?.length || 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedMixedTextRange = range.cloneRange();
    try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
    return { lineBreak, marker, range };
  }

  function exitMixedFormulaToNewLine(note, editor, wrapper, field) {
    if (!note || !editor?.isConnected || !wrapper?.isConnected || !field?.isConnected) return false;

    // MathLive can emit focus/selection/input events a moment after Enter. During this
    // short window they may save content, but they cannot reclaim the active toolbar target.
    field.__suppressMathReaffirmUntil = performance.now() + 900;
    captureMathFieldSelection(field);
    clearMathEditSession();
    try { field.blur(); } catch (_) {}
    setActiveMixedTextEditor(editor, { save: false });

    const placed = placeTextCaretOnNewLineAfter(wrapper, editor);
    if (!placed) return false;
    saveMixedNoteFromEditor(note, editor);
    updateMathToolbarUi();

    // Reassert the text range after browser/Shadow DOM focus bookkeeping settles.
    queueMicrotask(() => {
      if (!editor.isConnected || !placed.marker.isConnected) return;
      placeMixedCaretAtMarker(placed.marker, editor);
      clearMathEditSession();
      updateMathToolbarUi();
    });
    return true;
  }

  function mixedNodesFromEditor(editor) {
    return BoardTextEditor.nodesFromEditor(editor, {
      readMathValue: readDirectMathField,
      readMathLatex: readDirectMathLatex,
      normalizeNodes: normalizeMixedContentNodes
    });
  }

  function mixedNoteContentMinimumWidth(editor) {
    return BoardTextEditor.contentMinimumWidth(editor);
  }

  function applyMixedNoteContentSizing(note, editor, options = {}) {
    BoardTextEditor.applyContentSizing(note, editor, options);
  }

  function saveMixedNoteFromEditor(note, editor) {
    if (!note || !editor?.isConnected) return;
    markSharedNoteLocalActivity();
    note.nodes = mixedNodesFromEditor(editor);
    applyMixedNoteContentSizing(note, editor);
    // P2-SPLIT-P2.2.2: localStorage išsaugojimas sąmoningai lieka debounce'intas,
    // tačiau bendra lenta turi būti gyva ir ilgo nenutrūkstamo rašymo metu.
    // Atskiras notes-live signalas internete throttlinamas, todėl mokytojas mato
    // mokinio tekstą beveik simbolis po simbolio neprarandant mokinio fokuso.
    window.dispatchEvent(new CustomEvent('p772:shared-notes-live'));
    scheduleSave();
  }

  function placeMixedCaretAtMarker(marker, editor) {
    if (!marker?.isConnected || !editor?.isConnected) return;
    const range = document.createRange();
    range.setStart(marker, marker.textContent?.length || 0);
    range.collapse(true);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    savedMixedTextRange = range.cloneRange();
    try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
  }

  function removeEmptyMixedFormula(note, editor, wrapper, field) {
    if (!wrapper?.isConnected) return;
    const marker = document.createTextNode('\u200B');
    wrapper.parentNode?.insertBefore(marker, wrapper);
    wrapper.remove();
    clearMathEditSession();
    placeMixedCaretAtMarker(marker, editor);
    saveMixedNoteFromEditor(note, editor);
  }

  function updateMixedFormulaCompactState(field, latexValue = null) {
    if (!field) return;
    const latex = String(latexValue ?? readDirectMathLatex(field) ?? '');
    const meaningful = latex
      .replace(/\\placeholder(?:\[[^\]]*\])?\{\}/g, '')
      .replace(/[{}\s]/g, '');
    const isEmpty = !meaningful;
    field.classList.toggle('is-empty-math-field', isEmpty);
    field.closest?.('.mixed-inline-formula')?.classList.toggle('is-empty-formula', isEmpty);
  }

  function createMixedFormulaNode(note, node, editor) {
    const wrapper = document.createElement('span');
    wrapper.className = 'mixed-inline-formula';
    wrapper.contentEditable = 'false';
    wrapper.dataset.formulaNodeId = node.id;
    const field = createDirectMathField({
      source: node.value || '',
      latexSource: node.latex || '',
      kind: 'expression',
      fieldKey: `mixed:${note.id}:${node.id}`,
      placeholder: 'Formulė',
      contextLabel: 'Formulė mišriame teksto lauke',
      onCommit: (plain, latex) => {
        node.value = plain;
        node.latex = latex;
        wrapper.dataset.value = plain;
        wrapper.dataset.latex = latex;
        updateMixedFormulaCompactState(field, latex);
        saveMixedNoteFromEditor(note, editor);
      },
      onEnter: () => {
        exitMixedFormulaToNewLine(note, editor, wrapper, field);
      }
    });
    field.classList.add('mixed-inline-math-field');
    field.setAttribute('default-mode', 'inline-math');
    field.setAttribute('letter-shape-style', 'tex');
    try {
      field.defaultMode = 'inline-math';
      field.letterShapeStyle = 'tex';
    } catch (_) {}
    field.addEventListener('focusin', () => setActiveMixedTextEditor(editor, { save: false }));
    field.addEventListener('keydown', event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        clearMathEditSession();
        placeTextCaretAfter(wrapper, editor);
        return;
      }
      if ((event.key === 'Backspace' || event.key === 'Delete') && !String(readDirectMathLatex(field) || '').trim()) {
        event.preventDefault();
        queueMicrotask(() => {
          if (String(readDirectMathLatex(field) || '').trim()) return;
          removeEmptyMixedFormula(note, editor, wrapper, field);
        });
      }
    });
    wrapper.appendChild(field);
    updateMixedFormulaCompactState(field, node.latex || '');
    requestAnimationFrame(() => updateMixedFormulaCompactState(field));
    return { wrapper, field };
  }

  function renderMixedNoteContent(note, editor) {
    editor.replaceChildren();
    const nodes = normalizeMixedContentNodes(note.nodes);
    note.nodes = nodes;
    nodes.forEach((node, index) => {
      if (node.type === 'text') {
        const span = document.createElement('span');
        span.className = 'mixed-text-run';
        span.textContent = node.text || ((index === 0 || index === nodes.length - 1) ? '\u200B' : '');
        editor.appendChild(span);
      } else if (node.type === 'break') {
        editor.appendChild(document.createElement('br'));
      } else if (node.type === 'formula') {
        const { wrapper } = createMixedFormulaNode(note, node, editor);
        editor.appendChild(wrapper);
        if (index === nodes.length - 1 || nodes[index + 1]?.type !== 'text') editor.appendChild(document.createTextNode('\u200B'));
      }
    });
    if (!editor.childNodes.length) editor.appendChild(document.createTextNode('\u200B'));
  }

  function rangeInsideMixedEditor(editor) {
    const current = currentMixedTextRange(editor);
    if (current) return current;
    if (savedMixedTextRange && editor.contains(savedMixedTextRange.commonAncestorContainer)
      && !mixedFormulaWrapperFromNode(savedMixedTextRange.commonAncestorContainer)) return savedMixedTextRange.cloneRange();
    const range = document.createRange();
    range.selectNodeContents(editor);
    range.collapse(false);
    return range;
  }

  function nodeRangeEndsBeforeCaret(node, caretRange) {
    try {
      const range = document.createRange();
      if (node.nodeType === Node.TEXT_NODE) range.selectNodeContents(node);
      else range.selectNode(node);
      return range.compareBoundaryPoints(Range.END_TO_START, caretRange) <= 0;
    } catch (_) { return false; }
  }

  function nodeRangeStartsAfterCaret(node, caretRange) {
    try {
      const range = document.createRange();
      if (node.nodeType === Node.TEXT_NODE) range.selectNodeContents(node);
      else range.selectNode(node);
      return range.compareBoundaryPoints(Range.START_TO_END, caretRange) >= 0;
    } catch (_) { return false; }
  }

  function mixedGapIsEmpty(editor, startNode, caretRange, direction) {
    try {
      const gap = document.createRange();
      if (direction < 0) {
        gap.setStartAfter(startNode);
        gap.setEnd(caretRange.startContainer, caretRange.startOffset);
      } else {
        gap.setStart(caretRange.endContainer, caretRange.endOffset);
        gap.setEndBefore(startNode);
      }
      const fragment = gap.cloneContents();
      if (fragment.querySelector?.('.mixed-inline-formula, br')) return false;
      return !String(fragment.textContent || '').replace(/\u200B/g, '').length;
    } catch (_) { return false; }
  }

  function adjacentMixedFormula(editor, caretRange, direction = -1) {
    if (!editor?.isConnected || !caretRange?.collapsed) return null;
    const wrappers = [...editor.querySelectorAll('.mixed-inline-formula')];
    const candidates = direction < 0
      ? wrappers.filter(wrapper => nodeRangeEndsBeforeCaret(wrapper, caretRange)).reverse()
      : wrappers.filter(wrapper => nodeRangeStartsAfterCaret(wrapper, caretRange));
    return candidates.find(wrapper => mixedGapIsEmpty(editor, wrapper, caretRange, direction)) || null;
  }

  function moveMathCaretToBoundary(field, side = 'end') {
    if (!field) return;
    try {
      const command = side === 'start' ? 'moveToMathFieldStart' : 'moveToMathFieldEnd';
      const result = field.executeCommand?.(command);
      if (result !== false) return;
    } catch (_) {}
    try { field.position = side === 'start' ? 0 : -1; } catch (_) {}
  }

  function activateAdjacentMixedFormula(wrapper, side = 'end') {
    const field = wrapper?.querySelector?.('math-field.direct-math-field');
    if (!field) return null;
    mathSelectionByKey.delete(mathFieldKey(field));
    try { field.focus({ preventScroll: true }); } catch (_) { field.focus(); }
    setActiveDirectMathField(field, field.dataset.mathContext || 'Formulė mišriame teksto lauke', { ensureVisible: true });
    moveMathCaretToBoundary(field, side);
    captureMathFieldSelection(field);
    return field;
  }

  function mixedLinearTokens(editor) {
    const tokens = [];
    const visit = node => {
      if (node.nodeType === Node.TEXT_NODE) {
        tokens.push({ type: 'text', node });
        return;
      }
      if (!(node instanceof Element)) return;
      if (node.matches('.mixed-inline-formula')) {
        tokens.push({ type: 'barrier', node });
        return;
      }
      if (node.tagName === 'BR') {
        tokens.push({ type: 'barrier', node });
        return;
      }
      [...node.childNodes].forEach(visit);
    };
    [...editor.childNodes].forEach(visit);
    return tokens;
  }

  function smartMathFragment(text) {
    const source = String(text || '').replace(/\u00A0/g, ' ');
    const match = source.match(/([−-]?[0-9A-Za-zÀ-žα-ωΑ-ΩπΠ.,()]+)$/u);
    if (!match) return '';
    const fragment = match[1];
    if (!/[0-9A-Za-zα-ωΑ-ΩπΠ]/u.test(fragment)) return '';
    const core = fragment.replace(/^[−-]/, '');
    const opens = (core.match(/\(/g) || []).length;
    const closes = (core.match(/\)/g) || []).length;
    if (opens !== closes) return '';
    if (!/[0-9()]/.test(core) && core.replace(/[.,]/g, '').length > 3) return '';
    return fragment;
  }

  function extractSmartMathPrefix(editor, caretRange = rangeInsideMixedEditor(editor)) {
    if (!editor?.isConnected || !caretRange?.collapsed || mixedEditorFromNode(caretRange.startContainer) !== editor) return null;
    if (caretRange.startContainer instanceof Element && caretRange.startContainer.closest?.('.mixed-inline-formula')) return null;
    if (caretRange.startContainer?.parentElement?.closest?.('.mixed-inline-formula')) return null;

    const tokens = mixedLinearTokens(editor);
    let lastBarrier = -1;
    tokens.forEach((token, index) => {
      if (token.type === 'barrier' && nodeRangeEndsBeforeCaret(token.node, caretRange)) lastBarrier = index;
    });

    const characters = [];
    for (let index = lastBarrier + 1; index < tokens.length; index += 1) {
      const token = tokens[index];
      if (token.type !== 'text') break;
      const node = token.node;
      let limit = -1;
      if (node === caretRange.startContainer) limit = caretRange.startOffset;
      else if (nodeRangeEndsBeforeCaret(node, caretRange)) limit = node.nodeValue?.length || 0;
      else break;
      const value = String(node.nodeValue || '');
      for (let offset = 0; offset < limit; offset += 1) {
        const char = value[offset];
        if (char === '\u200B') continue;
        characters.push({ char, node, offset });
      }
      if (node === caretRange.startContainer) break;
    }
    const cleanText = characters.map(item => item.char).join('');
    const fragment = smartMathFragment(cleanText);
    if (!fragment) return null;
    const startIndex = characters.length - fragment.length;
    const first = characters[startIndex];
    if (!first) return null;
    const deleteRange = document.createRange();
    deleteRange.setStart(first.node, first.offset);
    deleteRange.setEnd(caretRange.startContainer, caretRange.startOffset);
    return { text: fragment, range: deleteRange };
  }

  function typedMathKey(character) {
    const key = String(character || '');
    if (key === '+') return { label: '+', insert: '+' };
    if (key === '=' || key === '<' || key === '>') return { label: key, insert: key };
    if (key === '-' || key === '−') return { label: '−', insert: '-' };
    if (key === '*' || key === '·') return { label: '·', insert: '\\cdot ' };
    if (key === ':' || key === '/') return { label: key, insert: key };
    if (key === '^') return { label: 'xⁿ', insert: '^' };
    return null;
  }

  function insertFormulaIntoMixedEditor(editor = activeMixedTextEditor, options = {}) {
    if (!editor?.isConnected) return null;
    const noteId = editor.closest('.board-note')?.dataset.noteId;
    const note = state.notes.find(item => item.id === noteId);
    if (!note) return null;
    const range = options.range?.cloneRange?.() || rangeInsideMixedEditor(editor);
    const initialText = String(options.initialText || '');
    const initialLatex = String(options.initialLatex || initialText);
    const node = {
      type: 'formula',
      id: `mixed-formula-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      value: initialText,
      latex: initialLatex
    };
    const { wrapper, field } = createMixedFormulaNode(note, node, editor);
    range.deleteContents();
    const after = document.createTextNode('\u200B');
    const fragment = document.createDocumentFragment();
    fragment.append(wrapper, after);
    range.insertNode(fragment);
    const textRange = document.createRange();
    textRange.setStart(after, after.textContent.length);
    textRange.collapse(true);
    savedMixedTextRange = textRange.cloneRange();
    saveMixedNoteFromEditor(note, editor);
    try { field.focus({ preventScroll: true }); } catch (_) { field.focus(); }
    setActiveDirectMathField(field, 'Formulė mišriame teksto lauke', { ensureVisible: true });
    moveMathCaretToBoundary(field, 'end');
    captureMathFieldSelection(field);
    return field;
  }

  function resolveMixedMathTarget(editor, options = {}) {
    const range = rangeInsideMixedEditor(editor);
    if (!range?.collapsed) return insertFormulaIntoMixedEditor(editor, { range });
    const adjacent = options.preferNewFormula ? null : adjacentMixedFormula(editor, range, -1);
    if (adjacent) return activateAdjacentMixedFormula(adjacent, 'end');
    const prefix = extractSmartMathPrefix(editor, range);
    if (prefix) {
      return insertFormulaIntoMixedEditor(editor, {
        range: prefix.range,
        initialText: prefix.text,
        initialLatex: prefix.text.replace(/−/g, '-')
      });
    }
    return options.allowEmpty === false ? null : insertFormulaIntoMixedEditor(editor, { range });
  }

  function trySmartMathTrigger(editor, character) {
    const key = typedMathKey(character);
    if (!key || !editor?.isConnected) return false;
    const range = rangeInsideMixedEditor(editor);
    if (!range?.collapsed) return false;
    const adjacent = adjacentMixedFormula(editor, range, -1);
    let field = adjacent ? activateAdjacentMixedFormula(adjacent, 'end') : null;
    if (!field) {
      const prefix = extractSmartMathPrefix(editor, range);
      if (!prefix) return false;
      field = insertFormulaIntoMixedEditor(editor, {
        range: prefix.range,
        initialText: prefix.text,
        initialLatex: prefix.text.replace(/−/g, '-')
      });
    }
    if (!field) return false;
    insertIntoDirectMathField(field, key);
    return true;
  }

  function handleMixedFormulaBoundaryKey(editor, event) {
    if (!['Backspace', 'Delete'].includes(event.key)) return false;
    const range = rangeInsideMixedEditor(editor);
    if (!range?.collapsed) return false;
    const direction = event.key === 'Backspace' ? -1 : 1;
    const wrapper = adjacentMixedFormula(editor, range, direction);
    if (!wrapper) return false;
    event.preventDefault();
    activateAdjacentMixedFormula(wrapper, direction < 0 ? 'end' : 'start');
    return true;
  }

  function explicitMathModeTarget(editor = activeMixedTextEditor) {
    if (!editor?.isConnected) return null;
    const range = currentMixedTextRange(editor) || rangeInsideMixedEditor(editor);
    if (!range) return null;
    deactivateMathForMixedTextRange(editor, range);

    if (!range.collapsed) {
      const selectedText = String(range.toString() || '').replace(/\u200B/g, '');
      if (selectedText.trim()) {
        return insertFormulaIntoMixedEditor(editor, {
          range,
          initialText: selectedText,
          initialLatex: selectedText.replace(/−/g, '-')
        });
      }
      return insertFormulaIntoMixedEditor(editor, { range });
    }

    const prefix = extractSmartMathPrefix(editor, range);
    if (prefix) {
      return insertFormulaIntoMixedEditor(editor, {
        range: prefix.range,
        initialText: prefix.text,
        initialLatex: prefix.text.replace(/−/g, '-')
      });
    }
    return insertFormulaIntoMixedEditor(editor, { range });
  }

  function activateExplicitMathMode(editor = activeMixedTextEditor) {
    const currentField = resolveActiveMathField();
    if (currentField && directMathFieldHasDomFocus(currentField)) {
      reaffirmMathEditSession(currentField, currentField.dataset.mathContext || activeMathContext, { ensureVisible: true });
      return currentField;
    }
    if (!editor?.isConnected) {
      showToast('Pirmiausia aktyvuok teksto ir formulių lauką');
      return null;
    }
    const field = explicitMathModeTarget(editor);
    if (!field) showToast('Nepavyko pradėti matematinio režimo');
    return field;
  }

  function toolbarTextRangeForMixedEditor(editor) {
    if (!editor?.isConnected) return null;
    const live = currentMixedTextRange(editor);
    if (live) return live;
    if (activeDirectMathField?.isConnected && directMathFieldHasDomFocus(activeDirectMathField)) return null;
    if (!savedMixedTextRange || !editor.contains(savedMixedTextRange.commonAncestorContainer)
      || mixedFormulaWrapperFromNode(savedMixedTextRange.commonAncestorContainer)) return null;
    try { return savedMixedTextRange.cloneRange(); } catch (_) { return null; }
  }


  function installMixedTextEditing() {
    BoardTextEditor.installDocumentEditing({
      eventPath: eventComposedPath,
      setActiveEditor: setActiveMixedTextEditor,
      captureTextSelection: captureMixedTextSelection,
      getActiveMathField: () => activeDirectMathField?.isConnected ? activeDirectMathField : null,
      clearMathSession: clearMathEditSession,
      currentTextRange: currentMixedTextRange,
      deactivateMathForTextRange: deactivateMathForMixedTextRange,
      eventTouchesMathToolbar,
      mathFieldFromEvent,
      eventOriginatesInMathField: eventOriginatesInDirectMathField,
      getActiveEditor: () => activeMixedTextEditor?.isConnected ? activeMixedTextEditor : null,
      activateExplicitMathMode
    });
  }

  function addNote() {
    const id = `note-${Date.now()}`;
    const offset = state.notes.length % 5;
    const boardRect = getBoardWorldRect();
    const zoom = Math.max(0.2, currentBoardZoom());
    const visibleLeft = refs.board.scrollLeft / zoom;
    const visibleTop = refs.board.scrollTop / zoom;
    const visibleWidth = refs.board.clientWidth / zoom;
    const visibleHeight = refs.board.clientHeight / zoom;
    const objectWidth = 430;
    const objectHeight = 56;
    let left = visibleLeft + 54 + offset * 22;
    let top = visibleTop + 76 + offset * 26;
    if (!state.window.shelved && refs.practiceWindow?.isConnected) {
      const practiceRight = refs.practiceWindow.offsetLeft + refs.practiceWindow.offsetWidth + 34;
      const practiceBottom = refs.practiceWindow.offsetTop + refs.practiceWindow.offsetHeight + 28;
      if (practiceRight + objectWidth <= visibleLeft + visibleWidth - 24) left = Math.max(left, practiceRight);
      else if (practiceBottom + objectHeight <= visibleTop + visibleHeight - 24) top = Math.max(top, practiceBottom);
    }
    left = Math.max(0, Math.min(boardRect.width - objectWidth, left));
    top = Math.max(0, Math.min(boardRect.height - objectHeight, top));
    state.notes.push({
      id,
      nodes: [{ type: 'text', text: '' }],
      x: boardRect.width ? left / boardRect.width : 0.055,
      y: boardRect.height ? top / boardRect.height : 0.08,
      width: objectWidth,
      minHeight: 44
    });
    renderBoardObjects();
    scheduleSave();
    requestAnimationFrame(() => {
      const editor = document.querySelector(`[data-note-id="${id}"] .mixed-editor-content`);
      if (!editor) return;
      setActiveMixedTextEditor(editor);
      try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(true);
      const selection = window.getSelection();
      selection.removeAllRanges();
      selection.addRange(range);
      savedMixedTextRange = range.cloneRange();
    });
    showToast('Įterptas vieningas teksto ir formulių laukas. Matematikos juostoje pasirink kategoriją.');
  }


  function boardTaskFieldId(instance, index, branchIndex = null) {
    return branchIndex === null
      ? `board-${instance.id}-step-${index}`
      : `board-${instance.id}-step-${index}-${branchIndex}`;
  }

  function boardTaskCard(instance) {
    return refs.objectsLayer.querySelector(`[data-board-task-id="${instance.id}"]`);
  }

  function clearBoardTaskResultVisual(instance, card = boardTaskCard(instance)) {
    instance.result = null;
    if (!card) return;
    const feedback = card.querySelector('.board-task-feedback');
    if (feedback) {
      const practicePageFeedback = feedback.classList.contains('practice-page-feedback');
      feedback.hidden = true;
      feedback.className = 'board-task-feedback';
      if (practicePageFeedback) feedback.classList.add('practice-page-feedback');
      feedback.replaceChildren();
    }
    card.querySelectorAll('.board-task-step').forEach(row => {
      row.classList.remove('is-correct', 'is-error', 'is-warning');
      const stateIcon = row.querySelector('.step-state');
      const message = row.querySelector('.step-message');
      if (stateIcon) stateIcon.textContent = '';
      if (message) message.textContent = '';
    });
  }

  function renderBoardTaskFeedback(card, result) {
    const feedback = card.querySelector('.board-task-feedback');
    if (!feedback) return;
    const practicePageFeedback = feedback.classList.contains('practice-page-feedback');
    feedback.hidden = !result;
    feedback.className = 'board-task-feedback';
    if (practicePageFeedback) feedback.classList.add('practice-page-feedback');
    feedback.replaceChildren();
    if (!result) return;
    feedback.classList.add(result.status === 'correct' ? 'is-success' : result.status === 'warning' ? 'is-warning' : 'is-error');
    const icon = document.createElement('span');
    icon.className = 'board-task-feedback-icon';
    icon.textContent = result.status === 'correct' ? '✓' : result.status === 'warning' ? '!' : '×';
    const copy = document.createElement('div');
    const title = document.createElement('strong'); title.textContent = result.title || '';
    const text = document.createElement('p'); text.textContent = result.message || '';
    copy.append(title, text);
    const failedCriteria = Array.isArray(result.criteriaResults) ? result.criteriaResults.filter(item => item.status === 'failed') : [];
    if (failedCriteria.length > 1) {
      text.textContent = 'Patikrink visas pažymėtas sąlygas:';
      const list = document.createElement('ul');
      list.className = 'criteria-feedback-list';
      failedCriteria.forEach(item => {
        const entry = document.createElement('li');
        entry.textContent = item.message || item.label;
        list.appendChild(entry);
      });
      copy.appendChild(list);
    }
    feedback.append(icon, copy);
  }

  function applyBoardTaskStepResults(card, result) {
    card.querySelectorAll('.board-task-step').forEach(row => {
      row.classList.remove('is-correct', 'is-error', 'is-warning');
      const icon = row.querySelector('.step-state');
      const message = row.querySelector('.step-message');
      if (icon) icon.textContent = '';
      if (message) message.textContent = '';
    });
    if (!result || !Array.isArray(result.stepResults)) return;
    result.stepResults.forEach((stepResult, index) => {
      const row = card.querySelector(`.board-task-step[data-step-index="${index}"]`);
      if (!row || !stepResult) return;
      row.classList.toggle('is-correct', stepResult.status === 'correct');
      row.classList.toggle('is-error', stepResult.status === 'incorrect');
      row.classList.toggle('is-warning', stepResult.status === 'warning');
      const icon = row.querySelector('.step-state');
      const message = row.querySelector('.step-message');
      if (icon) icon.textContent = stepResult.status === 'correct' ? '✓' : stepResult.status === 'warning' ? '!' : '×';
      if (message) message.textContent = stepResult.message || '';
    });
  }

  function runBoardTaskValidator(instance, card = boardTaskCard(instance)) {
    const task = instance.taskSnapshot;
    const validator = validators[task.response?.validator];
    const baseResult = validator
      ? validator(task, instance.response)
      : { status: 'incorrect', title: 'Trūksta tikrintuvo', message: `Neužregistruotas modulis „${task.response?.validator || ''}“.` };
    const result = applyAssessmentCriteria(task, instance.response, baseResult);
    instance.result = { ...result, checkedSnapshot: responseSnapshot(instance.response), assessmentVersion: 1 };
    if (card) {
      renderBoardTaskFeedback(card, instance.result);
      applyBoardTaskStepResults(card, instance.result);
    }
    scheduleSave();
  }

  function rerenderBoardTasksAndFocus(instance, testid) {
    renderBoardObjects();
    requestAnimationFrame(() => {
      const field = refs.objectsLayer.querySelector(`[data-board-task-id="${instance.id}"] [data-testid="${testid}"]`);
      field?.focus();
      if (field) setActiveDirectMathField(field, `Lentos užduotis: ${instance.taskSnapshot.title || 'Užduotis'}`);
    });
  }

  function createBoardTaskStepRow(instance, index, rawStep) {
    const task = instance.taskSnapshot;
    const response = instance.response;
    const step = normalizeStructuredStep(rawStep);
    response.steps[index] = step;
    const row = document.createElement('div');
    row.className = `solution-step workbook-step board-task-step step-type-${step.type}`;
    row.dataset.stepIndex = String(index);
    row.innerHTML = `
      <span class="step-index" aria-hidden="true">${index + 1}.</span>
      <div class="step-entry">
        <div class="step-fields"></div>
        <div class="step-context-actions" role="toolbar" aria-label="${index + 1} sprendimo eilutės veiksmai">
          <button class="step-context-button make-equation-button" type="button" title="Viena sprendimo eilutė">=</button>
          <button class="step-context-button make-branches-button" type="button" title="Išskaidyti į sprendimo šakas">⑂</button>
          <button class="step-context-button make-answer-button" type="button" title="Rašyti galutinį atsakymą">∈</button>
          <button class="step-context-button remove-step-button" type="button" title="Pašalinti eilutę">×</button>
        </div>
        <p class="step-message"></p>
      </div>
      <span class="step-state" aria-hidden="true"></span>
    `;
    const fields = row.querySelector('.step-fields');
    const remove = row.querySelector('.remove-step-button');
    const equationButton = row.querySelector('.make-equation-button');
    const branchesButton = row.querySelector('.make-branches-button');
    const answerButton = row.querySelector('.make-answer-button');
    remove.disabled = response.steps.length === 1;

    const commit = () => {
      response.steps[index] = normalizeStructuredStep(step);
      clearBoardTaskResultVisual(instance, row.closest('.board-solver-task'));
      scheduleSave();
    };
    const focusNextStep = () => {
      if (index === response.steps.length - 1) {
        response.steps.push(createStructuredStep());
        clearBoardTaskResultVisual(instance);
        scheduleSave();
        rerenderBoardTasksAndFocus(instance, boardTaskFieldId(instance, index + 1));
        return;
      }
      row.closest('.board-solver-task')?.querySelector(`[data-testid="${boardTaskFieldId(instance, index + 1)}"]`)?.focus();
    };
    const setStepType = type => {
      if (step.type === type) return;
      const previousValues = [...step.values];
      const previousLatexValues = [...(step.latexValues || [])];
      step.type = type;
      step.values = type === 'alternatives' ? [previousValues[0] || '', previousValues[1] || ''] : [previousValues[0] || ''];
      step.latexValues = type === 'alternatives'
        ? [previousLatexValues[0] || '', previousLatexValues[1] || '']
        : [previousLatexValues[0] || ''];
      commit();
      rerenderBoardTasksAndFocus(instance, boardTaskFieldId(instance, index));
    };
    const renderFields = () => {
      fields.replaceChildren();
      equationButton.hidden = step.type === 'equation';
      branchesButton.hidden = step.type === 'alternatives';
      answerButton.hidden = step.type === 'solution-set';
      const commitValue = (branchIndex, plain, latex) => {
        step.values[branchIndex] = plain;
        if (!Array.isArray(step.latexValues)) step.latexValues = [];
        step.latexValues[branchIndex] = latex;
        response.steps[index] = normalizeStructuredStep(step);
        clearBoardTaskResultVisual(instance, row.closest('.board-solver-task'));
        scheduleSave();
      };
      if (step.type === 'alternatives') {
        const branches = document.createElement('div');
        branches.className = 'branch-fields workbook-branch-fields';
        step.values.forEach((value, branchIndex) => {
          if (branchIndex) {
            const separator = document.createElement('span'); separator.className = 'branch-separator'; separator.textContent = 'arba'; branches.appendChild(separator);
          }
          const branch = document.createElement('div'); branch.className = 'branch-field';
          const field = createDirectMathField({
            source: value,
            latexSource: step.latexValues?.[branchIndex] || '',
            kind: 'equation',
            fieldKey: `board-task:${instance.id}:step:${index}:branch:${branchIndex}`,
            testid: boardTaskFieldId(instance, index, branchIndex),
            placeholder: branchIndex === 0 ? 'Pirmas atvejis' : 'Kitas atvejis',
            contextLabel: `Lentos užduoties ${index + 1} eilutės ${branchIndex + 1} šaka`,
            onCommit: (plain, latex) => commitValue(branchIndex, plain, latex),
            onEnter: () => {
              const next = branches.querySelector(`[data-testid="${boardTaskFieldId(instance, index, branchIndex + 1)}"]`);
              if (next) next.focus(); else focusNextStep();
            }
          });
          field.classList.add('step-input', 'branch-input');
          const removeBranch = document.createElement('button');
          removeBranch.type = 'button'; removeBranch.className = 'remove-branch-button'; removeBranch.textContent = '×';
          removeBranch.disabled = step.values.length <= 2;
          removeBranch.addEventListener('click', () => {
            if (step.values.length <= 2) return;
            step.values.splice(branchIndex, 1);
            step.latexValues?.splice(branchIndex, 1);
            commit();
            rerenderBoardTasksAndFocus(instance, boardTaskFieldId(instance, index));
          });
          branch.append(field, removeBranch); branches.appendChild(branch);
        });
        fields.appendChild(branches);
        const addBranch = document.createElement('button');
        addBranch.type = 'button'; addBranch.className = 'add-branch-button workbook-add-branch'; addBranch.textContent = '＋ Dar viena šaka';
        addBranch.addEventListener('click', () => {
          step.values.push('');
          if (!Array.isArray(step.latexValues)) step.latexValues = [];
          step.latexValues.push('');
          commit();
          rerenderBoardTasksAndFocus(instance, boardTaskFieldId(instance, index, step.values.length - 1));
        });
        fields.appendChild(addBranch);
      } else {
        if (step.type === 'solution-set') {
          const prefix = document.createElement('span'); prefix.className = 'solution-set-prefix'; prefix.textContent = 'Atsakymas'; fields.appendChild(prefix);
        }
        const field = createDirectMathField({
          source: step.values[0] || '',
          latexSource: step.latexValues?.[0] || '',
          kind: step.type === 'solution-set' ? 'solution-set' : 'equation',
          fieldKey: `board-task:${instance.id}:step:${index}:value`,
          testid: boardTaskFieldId(instance, index),
          placeholder: step.type === 'solution-set' ? 'Sprendinių aibė' : (task.response.placeholder || 'Kita lygtis'),
          contextLabel: step.type === 'solution-set' ? 'Lentos užduoties galutinis atsakymas' : `Lentos užduoties ${index + 1} sprendimo eilutė`,
          onCommit: (plain, latex) => commitValue(0, plain, latex),
          onEnter: focusNextStep
        });
        field.classList.add('step-input'); fields.appendChild(field);
      }
    };
    equationButton.addEventListener('click', () => setStepType('equation'));
    branchesButton.addEventListener('click', () => setStepType('alternatives'));
    answerButton.addEventListener('click', () => setStepType('solution-set'));
    remove.addEventListener('click', () => {
      if (response.steps.length <= 1) return;
      response.steps.splice(index, 1); clearBoardTaskResultVisual(instance); scheduleSave();
      rerenderBoardTasksAndFocus(instance, boardTaskFieldId(instance, Math.max(0, index - 1)));
    });
    row.addEventListener('focusin', () => row.classList.add('is-active'));
    row.addEventListener('focusout', () => requestAnimationFrame(() => { if (!row.contains(document.activeElement)) row.classList.remove('is-active'); }));
    renderFields();
    return row;
  }

  function renderBoardTaskResponse(instance, host, card) {
    const task = instance.taskSnapshot;
    instance.response = normalizeBoardTaskResponse(task, instance.response);
    if (task.response.renderer === 'single-math-input') {
      const wrap = document.createElement('section'); wrap.className = 'board-task-single-response';
      const label = document.createElement('span'); label.className = 'answer-label'; label.textContent = task.response.label || 'Atsakymas';
      const field = createDirectMathField({
        source: instance.response.answer || '', latexSource: instance.response.answerLatex || '', kind: 'expression', fieldKey: `board-task:${instance.id}:answer`, testid: `board-${instance.id}-answer`,
        placeholder: task.response.placeholder || 'Įrašyk atsakymą', contextLabel: `Lentos užduotis: ${task.title || 'Užduotis'}`,
        onCommit: (plain, latex) => {
          instance.response.answer = plain;
          instance.response.answerLatex = latex;
          clearBoardTaskResultVisual(instance, card);
          scheduleSave();
        },
        onEnter: () => runBoardTaskValidator(instance, card)
      });
      field.classList.add('single-direct-math-field', 'board-task-answer-field');
      const check = document.createElement('button'); check.type = 'button'; check.className = 'primary-button compact board-task-check'; check.textContent = 'Patikrinti';
      check.addEventListener('pointerdown', () => field.blur()); check.addEventListener('click', () => window.setTimeout(() => runBoardTaskValidator(instance, card), 0));
      wrap.append(label, field, check); host.appendChild(wrap);
    } else {
      instance.response.steps = normalizeStructuredSteps(instance.response.steps);
      const wrap = document.createElement('section'); wrap.className = 'board-task-steps workbook-solution';
      const heading = document.createElement('div'); heading.className = 'board-task-solution-heading'; heading.innerHTML = '<span class="answer-label">Sprendimo eiga</span><span><kbd>Enter</kbd> – nauja eilutė</span>';
      const list = document.createElement('div'); list.className = 'steps-list workbook-steps-list board-task-steps-list';
      instance.response.steps.forEach((step, index) => list.appendChild(createBoardTaskStepRow(instance, index, step)));
      const actions = document.createElement('div'); actions.className = 'board-task-actions';
      const add = document.createElement('button'); add.type = 'button'; add.className = 'workbook-add-line'; add.textContent = '＋ Pridėti eilutę';
      add.addEventListener('click', () => { instance.response.steps.push(createStructuredStep()); clearBoardTaskResultVisual(instance); scheduleSave(); rerenderBoardTasksAndFocus(instance, boardTaskFieldId(instance, instance.response.steps.length - 1)); });
      const check = document.createElement('button'); check.type = 'button'; check.className = 'primary-button compact board-task-check'; check.textContent = 'Patikrinti sprendimą';
      check.addEventListener('click', () => { document.activeElement?.blur(); window.setTimeout(() => runBoardTaskValidator(instance, card), 0); });
      actions.append(add, check); wrap.append(heading, list, actions); host.appendChild(wrap);
    }
  }

  function makeBoardTaskResizable(element, model, handle) {
    let resize = null;
    handle.addEventListener('pointerdown', event => {
      if (state.activeTool !== 'select' || model.collapsed || state.practiceOnly?.active) return;
      event.preventDefault(); event.stopPropagation();
      const boardRect = getBoardWorldRect();
      resize = {
        pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
        width: element.offsetWidth, height: element.offsetHeight,
        maxWidth: boardRect.width - element.offsetLeft, maxHeight: boardRect.height - element.offsetTop
      };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!resize || event.pointerId !== resize.pointerId) return;
      const zoom = currentBoardZoom();
      const width = Math.max(330, Math.min(resize.maxWidth, resize.width + (event.clientX - resize.startX) / zoom));
      const height = Math.max(300, Math.min(resize.maxHeight, resize.height + (event.clientY - resize.startY) / zoom));
      element.style.width = `${width}px`; element.style.height = `${height}px`;
      const boardRect = getBoardWorldRect();
      model.width = boardRect.width ? width / boardRect.width : model.width;
      model.height = boardRect.height ? height / boardRect.height : model.height;
    });
    handle.addEventListener('pointerup', event => {
      if (!resize) return; resize = null;
      try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
      scheduleSave();
    });
    handle.addEventListener('pointercancel', () => { resize = null; });
  }

  function makeBoardPracticeResizable(element, model, handle) {
    let resize = null;
    handle.addEventListener('pointerdown', event => {
      if (model.collapsed || state.practiceOnly?.active) return;
      event.preventDefault(); event.stopPropagation();
      setActiveBoardPractice(model.id, { save: false });
      const boardRect = getBoardWorldRect();
      resize = {
        pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
        width: element.offsetWidth, height: element.offsetHeight,
        maxWidth: boardRect.width - element.offsetLeft, maxHeight: boardRect.height - element.offsetTop
      };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!resize || event.pointerId !== resize.pointerId) return;
      const zoom = currentBoardZoom();
      const minWidth = model.kind === 'external-module' ? 520 : 470;
      const width = Math.max(minWidth, Math.min(resize.maxWidth, resize.width + (event.clientX - resize.startX) / zoom));
      const height = Math.max(560, Math.min(resize.maxHeight, resize.height + (event.clientY - resize.startY) / zoom));
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      applyPracticePageScale(element, model);
      const boardRect = getBoardWorldRect();
      model.width = boardRect.width ? width / boardRect.width : model.width;
      model.height = boardRect.height ? height / boardRect.height : model.height;
    });
    handle.addEventListener('pointerup', event => {
      if (!resize) return;
      resize = null;
      try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
      scheduleSave();
    });
    handle.addEventListener('pointercancel', () => { resize = null; });
  }

  function ensureElementVisibleInScroller(scroller, element) {
    if (!scroller || !element) return;
    const scrollerRect = scroller.getBoundingClientRect();
    const elementRect = element.getBoundingClientRect();
    if (elementRect.top < scrollerRect.top + 6) scroller.scrollTop -= (scrollerRect.top + 6 - elementRect.top);
    else if (elementRect.bottom > scrollerRect.bottom - 6) scroller.scrollTop += (elementRect.bottom - scrollerRect.bottom + 6);
  }

  function makePracticeAnswerAreaResizable(area, taskInstance, handle, shell, pageInstance) {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      drag = { pointerId: event.pointerId, startY: event.clientY, height: area.getBoundingClientRect().height };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const height = Math.max(80, Math.min(520, drag.height + event.clientY - drag.startY));
      taskInstance.layout.answerHeight = Math.round(height);
      area.style.height = `${taskInstance.layout.answerHeight}px`;
      shell.dispatchEvent(new CustomEvent('practice-layout-change', { bubbles: true }));
    });
    const finish = event => {
      if (!drag) return;
      drag = null;
      try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
      if (pageInstance?.page?.paginationMode === 'auto') {
        autoPaginatePracticeInstance(pageInstance, { preserveActive: true });
        pageInstance.activePageIndex = Number(taskInstance.layout.pageIndex) || 0;
        renderBoardObjects();
      }
      scheduleSave();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  function practicePageScaleForViewport(viewport, instance) {
    const pageSize = practicePagePixelSize(instance);
    const availableWidth = Math.max(1, viewport.clientWidth - 28);
    const availableHeight = Math.max(1, viewport.clientHeight - 28);
    const mode = instance.page?.viewMode || 'fit-page';
    if (mode === 'actual') return 1;
    if (mode === 'fit-width') return Math.max(0.2, Math.min(2, availableWidth / pageSize.width));
    return Math.max(0.2, Math.min(2, Math.min(availableWidth / pageSize.width, availableHeight / pageSize.height)));
  }

  function updatePracticePageOverflowState(object, instance) {
    const content = object.querySelector('.practice-page-content');
    const badge = object.querySelector('.practice-page-layout-warning');
    if (!content || !badge) return;
    const mode = practiceLayoutMode(instance);
    let visibleWarning = false;
    let warningText = 'Šio puslapio turinys netelpa';
    if (mode === 'free') {
      const issues = practiceFreeLayoutIssues(instance, instance.activePageIndex);
      visibleWarning = state.mode === 'teacher' && (issues.overflow || issues.overlap);
      if (issues.overflow && issues.overlap) warningText = 'Objektai persidengia ir išeina už puslapio';
      else if (issues.overlap) warningText = 'Kai kurie užduočių blokai persidengia';
      else if (issues.overflow) warningText = 'Kai kurie blokai išeina už puslapio';
    } else {
      const overflowing = content.scrollHeight > content.clientHeight + 2;
      visibleWarning = overflowing && state.mode === 'teacher';
    }
    badge.textContent = warningText;
    object.classList.toggle('has-layout-overflow', visibleWarning);
    badge.hidden = !visibleWarning;
  }

  function applyPracticePageScale(object, instance) {
    const viewport = object?.querySelector('.practice-page-viewport');
    const stage = object?.querySelector('.practice-page-stage');
    const sheet = object?.querySelector('.practice-page-sheet');
    if (!viewport || !stage || !sheet) return;
    const pageSize = practicePagePixelSize(instance);
    const scale = practicePageScaleForViewport(viewport, instance);
    sheet.style.width = `${pageSize.width}px`;
    sheet.style.height = `${pageSize.height}px`;
    const useLayoutZoom = Boolean(window.CSS?.supports?.('zoom', '1'));
    sheet.dataset.pageScaleMode = useLayoutZoom ? 'layout-zoom' : 'transform';
    sheet.style.zoom = useLayoutZoom ? String(scale) : '';
    sheet.style.transform = useLayoutZoom ? 'none' : `scale(${scale})`;
    stage.style.width = `${Math.round(pageSize.width * scale)}px`;
    stage.style.height = `${Math.round(pageSize.height * scale)}px`;
    stage.dataset.scale = String(scale);
    stage.classList.toggle('is-centered', stage.offsetWidth < viewport.clientWidth - 8);
    requestAnimationFrame(() => {
      refreshMathFieldRendering(object);
      updatePracticePageOverflowState(object, instance);
    });
  }

  function makePracticeTaskFreeDraggable(shell, taskInstance, handle, pageInstance) {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      const content = shell.closest('.practice-page-content');
      if (!content) return;
      const contentRect = content.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: clampNumber(taskInstance.layout.freeX, 0, 0.94, 0.02),
        y: clampNumber(taskInstance.layout.freeY, 0, 0.94, 0),
        contentRect,
        shellRect
      };
      shell.classList.add('is-layout-dragging');
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const maxX = Math.max(0, 1 - drag.shellRect.width / Math.max(1, drag.contentRect.width));
      const maxY = Math.max(0, 1 - drag.shellRect.height / Math.max(1, drag.contentRect.height));
      const x = clampNumber(drag.x + (event.clientX - drag.startX) / Math.max(1, drag.contentRect.width), 0, maxX, drag.x);
      const y = clampNumber(drag.y + (event.clientY - drag.startY) / Math.max(1, drag.contentRect.height), 0, maxY, drag.y);
      taskInstance.layout.freeX = Math.round(x * 1000) / 1000;
      taskInstance.layout.freeY = Math.round(y * 1000) / 1000;
      shell.style.left = `${taskInstance.layout.freeX * 100}%`;
      shell.style.top = `${taskInstance.layout.freeY * 100}%`;
    });
    const finish = event => {
      if (!drag) return;
      drag = null;
      shell.classList.remove('is-layout-dragging');
      try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
      const object = shell.closest('.board-practice-page-object');
      updatePracticePageOverflowState(object, pageInstance);
      scheduleSave();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  function makePracticeTaskFreeResizable(shell, taskInstance, handle, pageInstance) {
    let resize = null;
    handle.addEventListener('pointerdown', event => {
      event.preventDefault();
      event.stopPropagation();
      const content = shell.closest('.practice-page-content');
      if (!content) return;
      const contentRect = content.getBoundingClientRect();
      const shellRect = shell.getBoundingClientRect();
      const scale = Number(shell.closest('.practice-page-stage')?.dataset.scale) || 1;
      resize = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: clampNumber(taskInstance.layout.freeWidth, 0.28, 1, 0.96),
        answerHeight: taskInstance.layout.answerHeight,
        x: clampNumber(taskInstance.layout.freeX, 0, 0.94, 0.02),
        contentRect,
        shellRect,
        scale
      };
      shell.classList.add('is-layout-resizing');
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!resize || event.pointerId !== resize.pointerId) return;
      const maxWidth = Math.max(0.28, 1 - resize.x);
      const width = clampNumber(resize.width + (event.clientX - resize.startX) / Math.max(1, resize.contentRect.width), 0.28, maxWidth, resize.width);
      const answerHeight = clampNumber(resize.answerHeight + (event.clientY - resize.startY) / Math.max(0.2, resize.scale), 80, 520, resize.answerHeight);
      taskInstance.layout.freeWidth = Math.round(width * 1000) / 1000;
      taskInstance.layout.answerHeight = Math.round(answerHeight);
      shell.style.setProperty('--practice-free-width', `${taskInstance.layout.freeWidth * 100}%`);
      const area = shell.querySelector('.practice-page-answer-area');
      if (area) area.style.height = `${taskInstance.layout.answerHeight}px`;
    });
    const finish = event => {
      if (!resize) return;
      resize = null;
      shell.classList.remove('is-layout-resizing');
      try { handle.releasePointerCapture(event.pointerId); } catch (_) {}
      const object = shell.closest('.board-practice-page-object');
      updatePracticePageOverflowState(object, pageInstance);
      scheduleSave();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  function createPracticeLayoutEditorBar(instance) {
    const bar = document.createElement('div');
    bar.className = 'practice-layout-editor-bar';
    bar.addEventListener('pointerdown', event => event.stopPropagation());
    const label = document.createElement('span');
    label.className = 'practice-layout-editor-label';
    label.textContent = 'Puslapio maketas';
    const modes = document.createElement('div');
    modes.className = 'practice-layout-mode-switch';
    const currentMode = practiceLayoutMode(instance);
    [
      ['flow', 'Srautas'],
      ['columns', 'Stulpeliai'],
      ['free', 'Laisvas']
    ].forEach(([value, caption]) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = caption;
      button.classList.toggle('is-active', currentMode === value);
      button.addEventListener('click', () => setPracticeLayoutMode(instance, value));
      modes.appendChild(button);
    });
    bar.append(label, modes);

    if (currentMode === 'columns') {
      const columns = document.createElement('select');
      columns.className = 'practice-layout-columns-select';
      columns.setAttribute('aria-label', 'Stulpelių skaičius');
      columns.innerHTML = '<option value="2">2 stulpeliai</option><option value="3">3 stulpeliai</option>';
      columns.value = String(practiceColumnCount(instance));
      columns.addEventListener('change', () => {
        instance.page.columns = Number(columns.value);
        instance.page.paginationMode = 'auto';
        autoPaginatePracticeInstance(instance, { preserveActive: true });
        renderBoardObjects();
        scheduleSave();
      });
      bar.appendChild(columns);
    }

    const reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'practice-layout-reset';
    reset.textContent = currentMode === 'free' ? 'Išdėstyti iš naujo' : 'Perskaičiuoti';
    reset.addEventListener('click', () => {
      if (currentMode === 'free') resetPracticeFreeLayout(instance);
      else autoPaginatePracticeInstance(instance, { preserveActive: true });
      renderBoardObjects();
      scheduleSave();
    });
    const help = document.createElement('span');
    help.className = 'practice-layout-editor-help';
    help.textContent = currentMode === 'free'
      ? 'Tempk už ⠿, dydį keisk apatiniame kampe.'
      : currentMode === 'columns'
        ? 'Užduotys paskirstomos į pasirinkto skaičiaus stulpelius.'
        : 'Užduotys dedamos viena po kitos.';
    bar.append(reset, help);
    return bar;
  }

  function createPracticePageTaskShell(pageInstance, taskInstance, index) {
    const task = taskInstance.taskSnapshot;
    taskInstance.layout = normalizePracticeTaskLayout(taskInstance.layout, task);
    const mode = practiceLayoutMode(pageInstance);
    if (mode === 'free') ensurePracticeFreeLayout(pageInstance, taskInstance.layout.pageIndex);
    const shell = document.createElement('section');
    shell.className = 'board-solver-task practice-page-task-shell';
    shell.classList.toggle('is-free-layout-task', mode === 'free');
    shell.classList.toggle('is-column-layout-task', mode === 'columns');
    shell.dataset.boardTaskId = taskInstance.id;
    shell.dataset.pageTaskIndex = String(index);
    if (mode === 'free') {
      shell.style.left = `${clampNumber(taskInstance.layout.freeX, 0, 0.94, 0.02) * 100}%`;
      shell.style.top = `${clampNumber(taskInstance.layout.freeY, 0, 0.94, 0) * 100}%`;
      shell.style.setProperty('--practice-free-width', `${clampNumber(taskInstance.layout.freeWidth, 0.28, 1, 0.96) * 100}%`);
    }

    const heading = document.createElement('header');
    heading.className = 'practice-page-task-heading';
    const number = document.createElement('span');
    number.className = 'practice-page-task-number';
    number.textContent = `${index + 1}.`;
    const copy = document.createElement('div');
    copy.className = 'practice-page-task-copy';
    const title = document.createElement('h3');
    title.textContent = task.title || 'Užduotis';
    const instruction = document.createElement('p');
    instruction.textContent = task.instruction || '';
    copy.append(title, instruction);
    if (task.hint) {
      const hint = document.createElement('details');
      hint.className = 'practice-page-hint';
      hint.innerHTML = `<summary>Užuomina</summary><p>${escapeHtml(task.hint)}</p>`;
      copy.appendChild(hint);
    }
    heading.append(number, copy);

    if (state.mode === 'teacher') {
      const layoutTools = document.createElement('div');
      layoutTools.className = 'practice-page-task-layout-tools';
      const label = document.createElement('span');
      label.textContent = 'Sprendimo vieta';
      const smaller = document.createElement('button');
      smaller.type = 'button'; smaller.textContent = '−'; smaller.setAttribute('aria-label', 'Sumažinti sprendimo vietą');
      const value = document.createElement('output');
      value.textContent = `${Math.round(taskInstance.layout.answerHeight)} px`;
      const larger = document.createElement('button');
      larger.type = 'button'; larger.textContent = '+'; larger.setAttribute('aria-label', 'Padidinti sprendimo vietą');
      const adjust = delta => {
        taskInstance.layout.answerHeight = Math.max(80, Math.min(520, taskInstance.layout.answerHeight + delta));
        value.textContent = `${Math.round(taskInstance.layout.answerHeight)} px`;
        if (pageInstance.page.paginationMode === 'auto' && mode !== 'free') {
          autoPaginatePracticeInstance(pageInstance, { preserveActive: true });
          pageInstance.activePageIndex = Number(taskInstance.layout.pageIndex) || 0;
          renderBoardObjects();
        } else {
          const area = shell.querySelector('.practice-page-answer-area');
          if (area) area.style.height = `${taskInstance.layout.answerHeight}px`;
          shell.dispatchEvent(new CustomEvent('practice-layout-change', { bubbles: true }));
        }
        scheduleSave();
      };
      smaller.addEventListener('click', event => { event.stopPropagation(); adjust(-32); });
      larger.addEventListener('click', event => { event.stopPropagation(); adjust(32); });
      const previousPage = document.createElement('button');
      previousPage.type = 'button'; previousPage.textContent = '←'; previousPage.title = 'Perkelti užduotį į ankstesnį puslapį';
      previousPage.disabled = (Number(taskInstance.layout.pageIndex) || 0) <= 0;
      previousPage.addEventListener('click', event => {
        event.stopPropagation();
        movePracticeTaskToPage(pageInstance, taskInstance, (Number(taskInstance.layout.pageIndex) || 0) - 1);
      });
      const nextPage = document.createElement('button');
      nextPage.type = 'button'; nextPage.textContent = '→'; nextPage.title = 'Perkelti užduotį į kitą puslapį';
      nextPage.addEventListener('click', event => {
        event.stopPropagation();
        movePracticeTaskToPage(pageInstance, taskInstance, (Number(taskInstance.layout.pageIndex) || 0) + 1);
      });
      layoutTools.append(label, smaller, value, larger);
      if (mode === 'columns') {
        const previousColumn = document.createElement('button');
        previousColumn.type = 'button'; previousColumn.textContent = '⇤'; previousColumn.title = 'Perkelti į kairį stulpelį';
        previousColumn.disabled = (Number(taskInstance.layout.columnIndex) || 0) <= 0;
        previousColumn.addEventListener('click', event => {
          event.stopPropagation();
          movePracticeTaskToColumn(pageInstance, taskInstance, (Number(taskInstance.layout.columnIndex) || 0) - 1);
        });
        const nextColumn = document.createElement('button');
        nextColumn.type = 'button'; nextColumn.textContent = '⇥'; nextColumn.title = 'Perkelti į dešinį stulpelį';
        nextColumn.disabled = (Number(taskInstance.layout.columnIndex) || 0) >= practiceColumnCount(pageInstance) - 1;
        nextColumn.addEventListener('click', event => {
          event.stopPropagation();
          movePracticeTaskToColumn(pageInstance, taskInstance, (Number(taskInstance.layout.columnIndex) || 0) + 1);
        });
        layoutTools.append(previousColumn, nextColumn);
      }
      layoutTools.append(previousPage, nextPage);
      heading.appendChild(layoutTools);
    }

    const math = createLibraryMathPreview(task);
    math.classList.add('practice-page-prompt-math');
    const answerArea = document.createElement('div');
    answerArea.className = 'practice-page-answer-area';
    answerArea.style.height = `${taskInstance.layout.answerHeight}px`;
    const responseHost = document.createElement('div');
    responseHost.className = 'board-task-response-host practice-page-response-host';
    answerArea.appendChild(responseHost);
    if (state.mode === 'teacher') {
      const resize = document.createElement('button');
      resize.type = 'button';
      resize.className = 'practice-page-answer-resize';
      resize.setAttribute('aria-label', 'Keisti sprendimo vietos aukštį');
      answerArea.appendChild(resize);
      makePracticeAnswerAreaResizable(answerArea, taskInstance, resize, shell, pageInstance);
    }
    const feedback = document.createElement('div');
    feedback.className = 'board-task-feedback practice-page-feedback';
    feedback.hidden = true;
    shell.append(heading, math, answerArea, feedback);
    renderBoardTaskResponse(taskInstance, responseHost, shell);
    const actionDock = document.createElement('div');
    actionDock.className = 'practice-page-action-dock';
    const singleCheck = responseHost.querySelector('.board-task-single-response > .board-task-check');
    const stepActions = responseHost.querySelector('.board-task-steps > .board-task-actions');
    if (singleCheck) actionDock.appendChild(singleCheck);
    if (stepActions) actionDock.appendChild(stepActions);
    if (actionDock.childElementCount) shell.insertBefore(actionDock, feedback);
    renderBoardTaskFeedback(shell, taskInstance.result);
    applyBoardTaskStepResults(shell, taskInstance.result);

    if (state.mode === 'teacher' && mode === 'free') {
      const freeHandle = document.createElement('button');
      freeHandle.type = 'button';
      freeHandle.className = 'practice-page-task-free-handle';
      freeHandle.textContent = '⠿';
      freeHandle.setAttribute('aria-label', 'Perkelti užduoties bloką puslapyje');
      const freeResize = document.createElement('button');
      freeResize.type = 'button';
      freeResize.className = 'practice-page-task-free-resize';
      freeResize.setAttribute('aria-label', 'Keisti užduoties bloko plotį ir sprendimo vietą');
      shell.append(freeHandle, freeResize);
      makePracticeTaskFreeDraggable(shell, taskInstance, freeHandle, pageInstance);
      makePracticeTaskFreeResizable(shell, taskInstance, freeResize, pageInstance);
    }

    answerArea.addEventListener('scroll', () => {
      taskInstance.layout.answerScrollTop = answerArea.scrollTop;
      scheduleSave();
    }, { passive: true });
    answerArea.addEventListener('focusin', event => {
      setActiveBoardPractice(pageInstance.id);
      requestAnimationFrame(() => ensureElementVisibleInScroller(answerArea, event.target));
    });
    requestAnimationFrame(() => { answerArea.scrollTop = taskInstance.layout.answerScrollTop || 0; });
    shell.addEventListener('focusin', () => setActiveBoardPractice(pageInstance.id));
    return shell;
  }

  function externalPracticeFrameFor(instance) {
    return refs.objectsLayer.querySelector(`iframe[data-external-practice-id="${CSS.escape(instance.id)}"]`)
      || refs.practiceOnlyHost?.querySelector(`iframe[data-external-practice-id="${CSS.escape(instance.id)}"]`)
      || null;
  }

  function syncExternalPracticeFrame(instance) {
    if (!instance || instance.kind !== 'external-module') return;
    const frame = externalPracticeFrameFor(instance);
    if (!frame?.contentWindow) return;
    frame.contentWindow.postMessage({
      type: 'p772:external-practice-load',
      practiceId: instance.id,
      moduleId: instance.moduleId,
      state: deepClone(instance.moduleState || {}),
      mode: instance.moduleMode || 'class',
      currentIndex: Number(instance.moduleCurrentIndex) || 0,
      view: instance.moduleView || 'start'
    }, location.origin);
  }

  function createExternalPracticeModule(instance, boardRect) {
    const object = document.createElement('article');
    object.className = 'board-practice-page-object external-practice-module-object';
    object.classList.toggle('is-active-object', state.activeBoardObject?.type === 'practice' && state.activeBoardObject.id === instance.id);
    object.classList.toggle('is-collapsed', instance.collapsed);
    object.dataset.boardPracticeId = instance.id;
    object.dataset.boardObjectType = 'practice';
    object.dataset.boardObjectId = instance.id;
    object.style.left = `${instance.x * boardRect.width}px`;
    object.style.top = `${instance.y * boardRect.height}px`;
    object.style.width = `${Math.min(boardRect.width, Math.max(520, instance.width * boardRect.width))}px`;
    if (!instance.collapsed) object.style.height = `${Math.min(boardRect.height, Math.max(560, instance.height * boardRect.height))}px`;

    const chrome = document.createElement('header');
    chrome.className = 'board-practice-page-chrome external-practice-module-chrome';
    const handle = document.createElement('button');
    handle.type = 'button'; handle.className = 'board-practice-page-handle'; handle.textContent = '⠿'; handle.setAttribute('aria-label', 'Perkelti pratybų modulį');
    handle.hidden = onlineAccessRole !== 'teacher';
    const chromeTitle = document.createElement('div');
    chromeTitle.className = 'board-practice-page-chrome-title';
    chromeTitle.innerHTML = `<span>Interaktyvių pratybų modulis · v${escapeHtml(instance.moduleVersion || '')}</span><strong>${escapeHtml(instance.title)}</strong>`;
    const actions = document.createElement('div');
    actions.className = 'board-practice-page-actions';

    const openOnly = document.createElement('button');
    openOnly.type = 'button';
    openOnly.className = 'board-practice-page-open-only';
    openOnly.textContent = '⛶';
    openOnly.title = 'Atverti tik šias pratybas';
    openOnly.addEventListener('click', event => { event.stopPropagation(); enterPracticeOnly(instance.id); });
    actions.appendChild(openOnly);

    if (onlineAccessRole === 'teacher') {
      const collapse = document.createElement('button');
      collapse.type = 'button'; collapse.className = 'board-practice-page-collapse'; collapse.textContent = instance.collapsed ? '+' : '−';
      collapse.setAttribute('aria-label', instance.collapsed ? 'Išskleisti pratybas' : 'Sutraukti pratybas');
      collapse.addEventListener('click', event => {
        event.stopPropagation();
        instance.collapsed = !instance.collapsed;
        setActiveBoardPractice(instance.id, { save: false });
        renderBoardObjects(); scheduleSave();
      });
      const remove = document.createElement('button');
      remove.type = 'button'; remove.className = 'board-practice-page-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Pašalinti pratybas');
      remove.addEventListener('click', event => {
        event.stopPropagation();
        state.boardPractices = state.boardPractices.filter(item => item.id !== instance.id);
        if (state.activeBoardObject?.type === 'practice' && state.activeBoardObject.id === instance.id) clearActiveBoardObject({ save: false });
        renderBoardObjects(); scheduleSave();
      });
      actions.append(collapse, remove);
    }

    chrome.append(handle, chromeTitle, actions);
    if (onlineAccessRole === 'teacher') makeBoardObjectDraggable(object, instance, chromeTitle, { alwaysAllow: true });
    object.appendChild(chrome);

    if (!instance.collapsed) {
      const host = document.createElement('div');
      host.className = 'external-practice-module-host';
      const frame = document.createElement('iframe');
      frame.className = 'external-practice-module-frame';
      frame.dataset.externalPracticeId = instance.id;
      const joiner = instance.moduleUrl.includes('?') ? '&' : '?';
      frame.src = `${instance.moduleUrl}${joiner}embed=1&practiceId=${encodeURIComponent(instance.id)}&role=${onlineAccessRole}&hostBuild=ONLINE-P1.1.9`;
      frame.title = instance.title;
      frame.setAttribute('allow', 'clipboard-write');
      frame.addEventListener('load', () => syncExternalPracticeFrame(instance));
      host.appendChild(frame);
      object.appendChild(host);
      if (onlineAccessRole === 'teacher') {
        const resize = document.createElement('button');
        resize.type = 'button'; resize.className = 'board-practice-page-resize'; resize.setAttribute('aria-label', 'Keisti pratybų objekto dydį');
        object.appendChild(resize);
        makeBoardPracticeResizable(object, instance, resize);
      }
    }
    object.addEventListener('pointerdown', () => setActiveBoardPractice(instance.id));
    object.addEventListener('focusin', () => setActiveBoardPractice(instance.id));
    return object;
  }

  function createBoardPracticePage(instance, boardRect) {
    if (instance?.kind === 'external-module') return createExternalPracticeModule(instance, boardRect);
    ensurePracticePagination(instance);
    const object = document.createElement('article');
    const layoutMode = practiceLayoutMode(instance);
    object.className = 'board-practice-page-object';
    object.classList.toggle('is-active-object', state.activeBoardObject?.type === 'practice' && state.activeBoardObject.id === instance.id);
    object.classList.toggle('is-collapsed', instance.collapsed);
    object.classList.toggle('has-layout-editor', state.mode === 'teacher' && !instance.collapsed);
    object.classList.toggle('is-layout-editing', state.mode === 'teacher');
    object.dataset.layoutMode = layoutMode;
    object.dataset.boardPracticeId = instance.id;
    object.dataset.boardObjectType = 'practice';
    object.dataset.boardObjectId = instance.id;
    object.style.left = `${instance.x * boardRect.width}px`;
    object.style.top = `${instance.y * boardRect.height}px`;
    object.style.width = `${Math.max(470, Math.min(760, instance.width * boardRect.width))}px`;
    if (!instance.collapsed) object.style.height = `${Math.max(560, Math.min(980, instance.height * boardRect.height))}px`;

    const chrome = document.createElement('header');
    chrome.className = 'board-practice-page-chrome';
    const handle = document.createElement('button');
    handle.type = 'button'; handle.className = 'board-practice-page-handle'; handle.textContent = '⠿'; handle.setAttribute('aria-label', 'Perkelti pratybų puslapius');
    const chromeTitle = document.createElement('div');
    chromeTitle.className = 'board-practice-page-chrome-title';
    chromeTitle.innerHTML = `<span>Pratybų dokumentas</span><strong>${escapeHtml(instance.title)}</strong><em class="practice-page-layout-warning" hidden>Šio puslapio turinys netelpa</em>`;
    const actions = document.createElement('div'); actions.className = 'board-practice-page-actions';

    const pageNav = document.createElement('div');
    pageNav.className = 'board-practice-page-navigation';
    const previous = document.createElement('button');
    previous.type = 'button'; previous.textContent = '‹'; previous.setAttribute('aria-label', 'Ankstesnis puslapis');
    previous.disabled = instance.activePageIndex <= 0;
    const counter = document.createElement('output');
    counter.textContent = `${instance.activePageIndex + 1} / ${instance.pageCount}`;
    const next = document.createElement('button');
    next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Kitas puslapis');
    next.disabled = instance.activePageIndex >= instance.pageCount - 1;
    previous.addEventListener('click', event => { event.stopPropagation(); setPracticeActivePage(instance, instance.activePageIndex - 1); });
    next.addEventListener('click', event => { event.stopPropagation(); setPracticeActivePage(instance, instance.activePageIndex + 1); });
    pageNav.append(previous, counter, next);
    actions.appendChild(pageNav);

    const viewMode = document.createElement('select');
    viewMode.className = 'board-practice-page-view-mode';
    viewMode.setAttribute('aria-label', 'Puslapio mastelis');
    viewMode.innerHTML = '<option value="fit-page">Talpinti puslapį</option><option value="fit-width">Talpinti pagal plotį</option><option value="actual">100 %</option>';
    viewMode.value = instance.page?.viewMode || 'fit-page';
    viewMode.addEventListener('pointerdown', event => event.stopPropagation());
    viewMode.addEventListener('change', event => {
      event.stopPropagation();
      instance.page.viewMode = viewMode.value;
      applyPracticePageScale(object, instance);
      scheduleSave();
    });
    actions.appendChild(viewMode);

    const openOnly = document.createElement('button');
    openOnly.type = 'button';
    openOnly.className = 'board-practice-page-open-only';
    openOnly.textContent = '⛶';
    openOnly.title = 'Atverti tik šias pratybas';
    openOnly.addEventListener('click', event => { event.stopPropagation(); enterPracticeOnly(instance.id); });
    actions.appendChild(openOnly);

    if (state.mode === 'teacher') {
      const size = document.createElement('select');
      size.className = 'board-practice-page-size';
      size.setAttribute('aria-label', 'Puslapio formatas');
      size.innerHTML = '<option value="A4">A4</option><option value="A5">A5</option>';
      size.value = instance.page?.size || 'A4';
      size.addEventListener('pointerdown', event => event.stopPropagation());
      size.addEventListener('change', event => {
        event.stopPropagation();
        instance.page.size = size.value;
        if (layoutMode === 'free') ensurePracticeFreeLayout(instance);
        else if (instance.page.paginationMode === 'auto') autoPaginatePracticeInstance(instance, { preserveActive: true });
        renderBoardObjects(); scheduleSave();
      });
      const orientation = document.createElement('button');
      orientation.type = 'button'; orientation.className = 'board-practice-page-orientation';
      orientation.textContent = instance.page?.orientation === 'landscape' ? '▭' : '▯';
      orientation.title = instance.page?.orientation === 'landscape' ? 'Horizontali orientacija' : 'Vertikali orientacija';
      orientation.addEventListener('click', event => {
        event.stopPropagation();
        instance.page.orientation = instance.page.orientation === 'landscape' ? 'portrait' : 'landscape';
        if (layoutMode === 'free') ensurePracticeFreeLayout(instance);
        else if (instance.page.paginationMode === 'auto') autoPaginatePracticeInstance(instance, { preserveActive: true });
        renderBoardObjects(); scheduleSave();
      });
      const autoFlow = document.createElement('button');
      autoFlow.type = 'button'; autoFlow.className = 'board-practice-page-autoflow'; autoFlow.textContent = '↻';
      autoFlow.title = layoutMode === 'free' ? 'Išdėstyti laisvus blokus iš naujo' : 'Perskirstyti užduotis automatiškai';
      autoFlow.classList.toggle('is-active', instance.page.paginationMode === 'auto' && layoutMode !== 'free');
      autoFlow.addEventListener('click', event => {
        event.stopPropagation();
        if (layoutMode === 'free') resetPracticeFreeLayout(instance);
        else autoPaginatePracticeInstance(instance);
        renderBoardObjects(); scheduleSave();
      });
      const addPage = document.createElement('button');
      addPage.type = 'button'; addPage.className = 'board-practice-page-add'; addPage.textContent = '+'; addPage.title = 'Pridėti tuščią puslapį';
      addPage.addEventListener('click', event => { event.stopPropagation(); addPracticePage(instance); });
      const removePage = document.createElement('button');
      removePage.type = 'button'; removePage.className = 'board-practice-page-delete'; removePage.textContent = '−'; removePage.title = 'Pašalinti tuščią puslapį';
      removePage.disabled = instance.pageCount <= 1 || practiceTasksForPage(instance).length > 0;
      removePage.addEventListener('click', event => {
        event.stopPropagation();
        if (!removeCurrentPracticePage(instance)) showToast('Galima pašalinti tik tuščią puslapį');
      });
      actions.append(size, orientation, autoFlow, addPage, removePage);
    }

    if (onlineAccessRole === 'teacher') {
      const collapse = document.createElement('button'); collapse.type = 'button'; collapse.className = 'board-practice-page-collapse'; collapse.textContent = instance.collapsed ? '+' : '−'; collapse.setAttribute('aria-label', instance.collapsed ? 'Išskleisti pratybas' : 'Sutraukti pratybas');
      collapse.addEventListener('click', event => { event.stopPropagation(); instance.collapsed = !instance.collapsed; setActiveBoardPractice(instance.id, { save: false }); renderBoardObjects(); scheduleSave(); });
      const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'board-practice-page-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Pašalinti pratybas');
      remove.addEventListener('click', event => {
        event.stopPropagation();
        if (activeDirectMathField && object.contains(activeDirectMathField)) setActiveDirectMathField(null);
        state.boardPractices = state.boardPractices.filter(item => item.id !== instance.id);
        if (state.activeBoardObject?.type === 'practice' && state.activeBoardObject.id === instance.id) clearActiveBoardObject({ save: false });
        renderBoardObjects(); scheduleSave();
      });
      actions.append(collapse, remove);
    }
    handle.hidden = onlineAccessRole !== 'teacher';
    chrome.append(handle, chromeTitle, actions);
    if (onlineAccessRole === 'teacher') makeBoardObjectDraggable(object, instance, chromeTitle, { alwaysAllow: true });
    object.appendChild(chrome);

    if (state.mode === 'teacher' && !instance.collapsed) object.appendChild(createPracticeLayoutEditorBar(instance));

    if (!instance.collapsed) {
      const viewport = document.createElement('div');
      viewport.className = 'practice-page-viewport';
      const stage = document.createElement('div');
      stage.className = 'practice-page-stage';
      const sheet = document.createElement('section');
      sheet.className = 'practice-page-sheet';
      sheet.dataset.pageIndex = String(instance.activePageIndex);
      sheet.dataset.layoutMode = layoutMode;
      const pageHeader = document.createElement('header');
      pageHeader.className = 'practice-page-sheet-header';
      pageHeader.innerHTML = `<div><span>${escapeHtml(instance.subtitle)}</span><h2>${escapeHtml(instance.title)}</h2></div><span class="practice-page-name-line">Vardas ____________________</span>`;
      const content = document.createElement('div');
      content.className = `practice-page-content layout-${layoutMode}`;
      content.style.setProperty('--practice-columns', String(practiceColumnCount(instance)));
      const pageTasks = practiceTasksForPage(instance);
      if (pageTasks.length) {
        if (layoutMode === 'columns') {
          const columns = Array.from({ length: practiceColumnCount(instance) }, (_, columnIndex) => {
            const column = document.createElement('div');
            column.className = 'practice-page-column';
            column.dataset.columnIndex = String(columnIndex);
            content.appendChild(column);
            return column;
          });
          pageTasks.forEach(taskInstance => {
            const globalIndex = instance.tasks.indexOf(taskInstance);
            const columnIndex = Math.max(0, Math.min(columns.length - 1, Number(taskInstance.layout.columnIndex) || 0));
            columns[columnIndex].appendChild(createPracticePageTaskShell(instance, taskInstance, globalIndex));
          });
        } else {
          if (layoutMode === 'free') ensurePracticeFreeLayout(instance, instance.activePageIndex);
          pageTasks.forEach(taskInstance => {
            const globalIndex = instance.tasks.indexOf(taskInstance);
            content.appendChild(createPracticePageTaskShell(instance, taskInstance, globalIndex));
          });
        }
      } else {
        const empty = document.createElement('div');
        empty.className = 'practice-page-empty';
        empty.innerHTML = state.mode === 'teacher'
          ? '<strong>Tuščias puslapis</strong><span>Perkelk čia užduotį rodykle prie užduoties arba grįžk prie automatinio paskirstymo.</span>'
          : '<span>Šiame puslapyje užduočių nėra.</span>';
        content.appendChild(empty);
      }
      const pageFooter = document.createElement('footer');
      pageFooter.className = 'practice-page-sheet-footer';
      const layoutCaption = layoutMode === 'free' ? 'laisvas maketas' : layoutMode === 'columns' ? `${practiceColumnCount(instance)} stulpeliai` : 'srautas';
      pageFooter.innerHTML = `<span>${pageTasks.length} užduotys · ${escapeHtml(instance.page.size)} ${instance.page.orientation === 'landscape' ? 'horizontaliai' : 'vertikaliai'} · ${layoutCaption}</span><strong>${instance.activePageIndex + 1}</strong>`;
      sheet.append(pageHeader, content, pageFooter);
      stage.appendChild(sheet); viewport.appendChild(stage); object.appendChild(viewport);
      object.addEventListener('practice-layout-change', () => requestAnimationFrame(() => updatePracticePageOverflowState(object, instance)));
      requestAnimationFrame(() => requestAnimationFrame(() => { applyPracticePageScale(object, instance); updatePracticePageOverflowState(object, instance); }));
      window.setTimeout(() => updatePracticePageOverflowState(object, instance), 120);
      const resize = document.createElement('button'); resize.type = 'button'; resize.className = 'board-practice-page-resize'; resize.setAttribute('aria-label', 'Keisti pratybų objekto dydį');
      object.appendChild(resize); makeBoardPracticeResizable(object, instance, resize);
    }
    object.addEventListener('pointerdown', () => setActiveBoardPractice(instance.id));
    object.addEventListener('focusin', () => setActiveBoardPractice(instance.id));
    makeBoardObjectDraggable(object, instance, handle, { alwaysAllow: true });
    return object;
  }

  const BOARD_IMAGE_MAX_INPUT_BYTES = 20 * 1024 * 1024;
  const BOARD_IMAGE_MAX_DIMENSION = 1600;
  const BOARD_IMAGE_TARGET_DATA_URL_LENGTH = 850000;

  function normalizeBoardImageInstance(candidate) {
    if (!candidate || typeof candidate !== 'object') return null;
    const src = String(candidate.src || '');
    if (!src.startsWith('data:image/')) return null;
    const naturalWidth = Math.max(1, Number(candidate.naturalWidth) || 1);
    const naturalHeight = Math.max(1, Number(candidate.naturalHeight) || 1);
    const naturalRatio = naturalWidth / naturalHeight;
    const ratio = Math.max(0.05, Math.min(20, Number(candidate.aspectRatio) || naturalRatio || 1));
    return {
      id: String(candidate.id || `board-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      src,
      name: String(candidate.name || 'Nuotrauka').slice(0, 160),
      x: Math.max(0, Math.min(1, Number(candidate.x) || 0)),
      y: Math.max(0, Math.min(1, Number(candidate.y) || 0)),
      width: Math.max(0.03, Math.min(1, Number(candidate.width) || 0.22)),
      height: Math.max(0.03, Math.min(1, Number(candidate.height) || 0.18)),
      aspectRatio: ratio,
      naturalWidth,
      naturalHeight,
      createdAt: String(candidate.createdAt || new Date().toISOString())
    };
  }

  async function prepareBoardImageFile(file) {
    if (!file || !String(file.type || '').startsWith('image/')) throw new Error('Pasirink paveikslėlio failą');
    if (file.size > BOARD_IMAGE_MAX_INPUT_BYTES) throw new Error('Paveikslėlis per didelis. Didžiausias pradinis failas – 20 MB.');
    const original = await readFileAsDataUrl(file);
    const source = await loadImageFromDataUrl(original);
    const naturalWidth = Math.max(1, source.naturalWidth || source.width || 1);
    const naturalHeight = Math.max(1, source.naturalHeight || source.height || 1);
    let scale = Math.min(1, BOARD_IMAGE_MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
    let quality = 0.88;
    let dataUrl = original;
    let outputWidth = naturalWidth;
    let outputHeight = naturalHeight;

    // Nuotrauką sumažiname prieš siųsdami per bendros lentos Firebase būseną.
    // Taip viena nuotrauka neužkemša localStorage ir realaus laiko sinchronizacijos.
    for (let attempt = 0; attempt < 7; attempt += 1) {
      outputWidth = Math.max(1, Math.round(naturalWidth * scale));
      outputHeight = Math.max(1, Math.round(naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d', { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(source, 0, 0, outputWidth, outputHeight);
      dataUrl = canvas.toDataURL('image/webp', quality);
      if (dataUrl.length <= BOARD_IMAGE_TARGET_DATA_URL_LENGTH) break;
      scale *= 0.82;
      quality = Math.max(0.62, quality - 0.06);
    }
    if (dataUrl.length > 1200000) throw new Error('Nepavyko pakankamai sumažinti paveikslėlio. Pabandyk mažesnį failą.');
    return {
      src: dataUrl,
      naturalWidth: outputWidth,
      naturalHeight: outputHeight,
      aspectRatio: outputWidth / Math.max(1, outputHeight)
    };
  }

  function visibleBoardWorldCenter() {
    return BoardObjects.visibleWorldCenter(refs.board, currentBoardZoom());
  }

  async function insertBoardImage(file) {
    const prepared = await prepareBoardImageFile(file);
    const boardRect = getBoardWorldRect();
    const maxWidth = Math.min(620, boardRect.width * 0.42);
    const maxHeight = Math.min(480, boardRect.height * 0.36);
    let width = Math.min(maxWidth, Math.max(180, prepared.naturalWidth));
    let height = width / prepared.aspectRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * prepared.aspectRatio;
    }
    // P1.7.9.49-M2.5.1: net ir minimalaus / maksimalaus dydžio ribos nekeičia
    // paveikslėlio proporcijos. Anksčiau width ir height buvo clamp'inami atskirai.
    const minimumWidth = Math.max(120, 90 * prepared.aspectRatio);
    const maximumWidth = Math.max(1, Math.min(boardRect.width, boardRect.height * prepared.aspectRatio));
    width = Math.max(Math.min(minimumWidth, maximumWidth), Math.min(maximumWidth, width));
    height = width / prepared.aspectRatio;
    const center = visibleBoardWorldCenter();
    const left = Math.max(0, Math.min(boardRect.width - width, center.x - width / 2));
    const top = Math.max(0, Math.min(boardRect.height - height, center.y - height / 2));
    const instance = normalizeBoardImageInstance({
      id: `board-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      src: prepared.src,
      name: file.name || 'Nuotrauka',
      x: boardRect.width ? left / boardRect.width : 0,
      y: boardRect.height ? top / boardRect.height : 0,
      width: boardRect.width ? width / boardRect.width : 0.22,
      height: boardRect.height ? height / boardRect.height : 0.18,
      aspectRatio: prepared.aspectRatio,
      naturalWidth: prepared.naturalWidth,
      naturalHeight: prepared.naturalHeight,
      createdAt: new Date().toISOString()
    });
    if (!instance) throw new Error('Nepavyko parengti paveikslėlio');
    state.boardImages.push(instance);
    setTool('select');
    renderBoardObjects();
    setActiveBoardObject('image', instance.id, { save: false });
    scheduleSave();
  }

  function makeBoardImageResizable(element, model, handle) {
    return BoardObjects.makeImageResizable(element, model, handle, {
      getState: () => state,
      getWorldRect: getBoardWorldRect,
      getZoom: currentBoardZoom,
      scheduleSave
    });
  }

  function renderBoardObjects() {
    prepareMathDomReplacement(refs.objectsLayer);
    if (refs.practiceOnlyHost?.contains(activeDirectMathField)) prepareMathDomReplacement(refs.practiceOnlyHost);
    refs.objectsLayer.replaceChildren();
    const boardRect = getBoardWorldRect();
    for (const note of state.notes) {
      const element = document.createElement('section');
      element.className = 'board-note board-mixed-editor';
      element.dataset.noteId = note.id;
      element.dataset.boardObjectType = 'note';
      element.dataset.boardObjectId = note.id;
      element.classList.toggle('is-active-object', state.activeBoardObject?.type === 'note' && state.activeBoardObject.id === note.id);
      element.style.left = `${note.x * boardRect.width}px`;
      element.style.top = `${note.y * boardRect.height}px`;
      element.style.width = `${Math.max(110, Math.min(900, note.width || 420))}px`;
      element.style.minHeight = '44px';

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'mixed-editor-handle';
      handle.textContent = '⠿';
      handle.setAttribute('aria-label', 'Perkelti teksto ir formulių lauką');

      const editor = document.createElement('div');
      editor.className = 'mixed-editor-content';
      editor.contentEditable = 'true';
      editor.spellcheck = true;
      editor.setAttribute('role', 'textbox');
      editor.setAttribute('aria-multiline', 'true');
      editor.setAttribute('aria-label', 'Teksto ir formulių laukas');
      editor.dataset.placeholder = 'Rašyk tekstą; po skaičiaus ar kintamojo spausk +, =, : ir formulė prasidės automatiškai…';
      renderMixedNoteContent(note, editor);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'mixed-editor-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Pašalinti teksto ir formulių lauką');
      remove.addEventListener('click', event => {
        event.stopPropagation();
        if (activeMixedTextEditor === editor) setActiveMixedTextEditor(null, { save: false });
        if (activeDirectMathField && editor.contains(activeDirectMathField)) clearMathEditSession();
        state.notes = state.notes.filter(item => item.id !== note.id);
        if (state.activeBoardObject?.type === 'note' && state.activeBoardObject.id === note.id) clearActiveBoardObject({ save: false });
        element.remove();
        scheduleSave();
      });

      BoardTextEditor.bindEditor(editor, note, {
        setActiveEditor: setActiveMixedTextEditor,
        eventOriginatesInMathField: eventOriginatesInDirectMathField,
        captureTextSelection: captureMixedTextSelection,
        saveNote: saveMixedNoteFromEditor,
        markLocalActivity: markSharedNoteLocalActivity,
        getActiveMathField: () => activeDirectMathField?.isConnected ? activeDirectMathField : null,
        clearMathSession: clearMathEditSession,
        currentTextRange: currentMixedTextRange,
        deactivateMathForTextRange: deactivateMathForMixedTextRange,
        insertFormula: insertFormulaIntoMixedEditor,
        handleFormulaBoundaryKey: handleMixedFormulaBoundaryKey,
        typedMathKey,
        trySmartMathTrigger
      });

      element.append(handle, editor, remove);
      element.addEventListener('pointerdown', () => setActiveBoardObject('note', note.id));
      element.addEventListener('focusin', () => setActiveBoardObject('note', note.id));
      makeBoardObjectDraggable(element, note, handle, { alwaysAllow: true });
      const resizeObserver = new ResizeObserver(() => {
        if (!element.isConnected) return;
        const minWidth = mixedNoteContentMinimumWidth(editor);
        element.style.setProperty('--mixed-note-content-min-width', `${minWidth}px`);

        // M2.6.1: native horizontal resize must stop at the visible board edge.
        // The limit is recalculated from the note's current X position on every
        // size change, so it remains correct even after the note was moved.
        const currentBoardRect = getBoardWorldRect();
        const availableWidth = Math.max(1, Math.min(900, currentBoardRect.width - element.offsetLeft));
        element.style.maxWidth = `${availableWidth}px`;
        const effectiveMinWidth = Math.min(minWidth, availableWidth);
        const boundedWidth = Math.max(effectiveMinWidth, Math.min(availableWidth, element.offsetWidth));
        if (Math.abs(element.offsetWidth - boundedWidth) > 0.5) element.style.width = `${boundedWidth}px`;
        note.width = boundedWidth;
        note.minHeight = 44;
        scheduleSave();
      });
      resizeObserver.observe(element);
      refs.objectsLayer.appendChild(element);
      requestAnimationFrame(() => applyMixedNoteContentSizing(note, editor));
    }

    for (const imageModel of state.boardImages) {
      const element = document.createElement('figure');
      element.className = 'board-image-object';
      element.classList.toggle('is-active-object', state.activeBoardObject?.type === 'image' && state.activeBoardObject.id === imageModel.id);
      element.dataset.boardImageId = imageModel.id;
      element.dataset.boardObjectType = 'image';
      element.dataset.boardObjectId = imageModel.id;
      const imageSize = BoardObjects.imagePixelSize(imageModel, boardRect);
      element.style.left = `${imageModel.x * boardRect.width}px`;
      element.style.top = `${imageModel.y * boardRect.height}px`;
      element.style.width = `${imageSize.width}px`;
      element.style.height = `${imageSize.height}px`;
      element.style.aspectRatio = `${imageSize.aspectRatio}`;
      imageModel.aspectRatio = imageSize.aspectRatio;
      imageModel.width = boardRect.width ? imageSize.width / boardRect.width : imageModel.width;
      imageModel.height = boardRect.height ? imageSize.height / boardRect.height : imageModel.height;

      const image = document.createElement('img');
      image.src = imageModel.src;
      image.alt = imageModel.name || 'Lentos nuotrauka';
      image.draggable = false;
      image.decoding = 'async';

      const handle = document.createElement('button');
      handle.type = 'button';
      handle.className = 'board-image-handle';
      handle.textContent = '⠿';
      handle.setAttribute('aria-label', 'Perkelti nuotrauką');
      handle.title = 'Perkelti';

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'board-image-remove';
      remove.textContent = '×';
      remove.setAttribute('aria-label', 'Pašalinti nuotrauką');
      remove.title = 'Pašalinti';
      remove.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        state.boardImages = state.boardImages.filter(item => item.id !== imageModel.id);
        if (state.activeBoardObject?.type === 'image' && state.activeBoardObject.id === imageModel.id) clearActiveBoardObject({ save: false });
        element.remove();
        scheduleSave();
      });

      const resize = document.createElement('button');
      resize.type = 'button';
      resize.className = 'board-image-resize';
      resize.setAttribute('aria-label', 'Keisti nuotraukos dydį');
      resize.title = 'Keisti dydį';

      element.append(image, handle, remove, resize);
      element.addEventListener('pointerdown', () => setActiveBoardObject('image', imageModel.id));
      makeBoardObjectDraggable(element, imageModel, handle, { alwaysAllow: true });
      makeBoardImageResizable(element, imageModel, resize);
      refs.objectsLayer.appendChild(element);
    }

    for (const instance of state.boardPractices) {
      refs.objectsLayer.appendChild(createBoardPracticePage(instance, boardRect));
    }

    for (const instance of state.boardTasks) {
      const task = instance.taskSnapshot;
      const card = document.createElement('article');
      card.className = 'board-solver-task is-student-practice';
      card.classList.toggle('is-active-object', state.activeBoardObject?.type === 'task' && state.activeBoardObject.id === instance.id);
      card.classList.toggle('is-collapsed', instance.collapsed);
      card.dataset.boardTaskId = instance.id;
      card.dataset.boardObjectType = 'task';
      card.dataset.boardObjectId = instance.id;
      card.style.left = `${instance.x * boardRect.width}px`;
      card.style.top = `${instance.y * boardRect.height}px`;
      card.style.width = `${Math.max(330, Math.min(680, instance.width * boardRect.width))}px`;
      if (!instance.collapsed) card.style.height = `${Math.max(300, Math.min(760, instance.height * boardRect.height))}px`;

      const header = document.createElement('header');
      header.className = 'board-solver-task-header';
      const handle = document.createElement('button'); handle.type = 'button'; handle.className = 'board-solver-task-handle'; handle.textContent = '⠿'; handle.setAttribute('aria-label', 'Perkelti užduotį');
      const title = document.createElement('div'); title.className = 'board-solver-task-title'; title.innerHTML = `<span>Pavienė užduotis</span><strong>${escapeHtml(task.title || 'Užduotis')}</strong>`;
      const headerActions = document.createElement('div'); headerActions.className = 'board-solver-task-header-actions';
      if (onlineAccessRole === 'teacher') {
        const collapse = document.createElement('button'); collapse.type = 'button'; collapse.className = 'board-solver-task-collapse'; collapse.textContent = instance.collapsed ? '+' : '−'; collapse.setAttribute('aria-label', instance.collapsed ? 'Išskleisti užduotį' : 'Sutraukti užduotį');
        collapse.addEventListener('click', event => {
          event.stopPropagation();
          instance.collapsed = !instance.collapsed;
          setActiveBoardTask(instance.id, { save: false });
          renderBoardObjects();
          scheduleSave();
        });
        const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'board-solver-task-remove'; remove.textContent = '×'; remove.setAttribute('aria-label', 'Pašalinti užduotį iš lentos');
        remove.addEventListener('click', event => {
          event.stopPropagation();
          if (activeDirectMathField && card.contains(activeDirectMathField)) setActiveDirectMathField(null);
          state.boardTasks = state.boardTasks.filter(item => item.id !== instance.id);
          if (state.activeBoardObject?.type === 'task' && state.activeBoardObject.id === instance.id) clearActiveBoardObject({ save: false });
          card.remove(); scheduleSave();
        });
        headerActions.append(collapse, remove);
      }
      handle.hidden = onlineAccessRole !== 'teacher';
      header.append(handle, title, headerActions);

      const body = document.createElement('div'); body.className = 'board-solver-task-body';
      const prompt = document.createElement('section'); prompt.className = 'board-task-prompt';
      const instruction = document.createElement('p'); instruction.className = 'board-task-instruction'; instruction.textContent = task.instruction || '';
      const math = createLibraryMathPreview(task); math.classList.add('board-task-prompt-math');
      prompt.append(instruction, math);
      if (task.note) { const note = document.createElement('p'); note.className = 'board-task-note'; note.textContent = task.note; prompt.appendChild(note); }
      if (task.hint) { const hint = document.createElement('details'); hint.className = 'board-task-hint'; hint.innerHTML = `<summary>Užuomina</summary><p>${escapeHtml(task.hint)}</p>`; prompt.appendChild(hint); }
      const responseHost = document.createElement('div'); responseHost.className = 'board-task-response-host';
      const feedback = document.createElement('div'); feedback.className = 'board-task-feedback'; feedback.hidden = true;
      body.append(prompt, responseHost, feedback);
      card.append(header, body);
      const resizeHandle = document.createElement('button'); resizeHandle.type = 'button'; resizeHandle.className = 'board-solver-task-resize'; resizeHandle.setAttribute('aria-label', 'Keisti užduoties dydį');
      resizeHandle.hidden = onlineAccessRole !== 'teacher';
      card.appendChild(resizeHandle);
      refs.objectsLayer.appendChild(card);
      renderBoardTaskResponse(instance, responseHost, card);
      renderBoardTaskFeedback(card, instance.result);
      applyBoardTaskStepResults(card, instance.result);
      card.addEventListener('pointerdown', () => setActiveBoardTask(instance.id));
      card.addEventListener('focusin', () => setActiveBoardTask(instance.id));
      if (onlineAccessRole === 'teacher') {
        makeBoardObjectDraggable(card, instance, handle);
        makeBoardTaskResizable(card, instance, resizeHandle);
      }
    }

    if (state.practiceOnly?.active) mountPracticeOnlyObject();
    updateActiveBoardObjectUi();
    finalizeMathDomReplacement();
  }

  function layoutBoardObjects() {
    return BoardObjects.layoutObjects({
      state,
      objectsLayer: refs.objectsLayer,
      boardRect: getBoardWorldRect(),
      mixedNoteContentMinimumWidth,
      boardPracticePixelRect,
      applyPracticePageScale
    });
  }

  function makeBoardObjectDraggable(element, model, handle, options = {}) {
    return BoardObjects.makeDraggable(element, model, handle, {
      ...options,
      getState: () => state,
      getWorldRect: getBoardWorldRect,
      getZoom: currentBoardZoom,
      scheduleSave
    });
  }


  function setPracticeObjectSelected(selected) {
    refs.practiceWindow.classList.toggle('is-object-selected', Boolean(selected));
  }

  function installPracticeObjectSelection() {
    refs.practiceWindow.dataset.boardObjectType = 'practice-window';
    refs.practiceWindow.dataset.boardObjectId = 'main';
    refs.practiceWindow.addEventListener('pointerdown', () => setActiveBoardObject('practice-window', 'main'));
    refs.board.addEventListener('pointerdown', event => {
      if (refs.practiceWindow.contains(event.target)) return;
      if (event.target.closest?.('[data-board-object-type][data-board-object-id]')) return;
      clearActiveBoardObject();
    });
    refs.practiceWindow.addEventListener('focusin', () => setActiveBoardObject('practice-window', 'main'));
    refs.teacherModeButton.addEventListener('click', () => setActiveBoardObject('practice-window', 'main'));
    refs.studentModeButton.addEventListener('click', () => setActiveBoardObject('practice-window', 'main'));
  }

  // -------------------- Perkeliamas ir keičiamo dydžio langas --------------------

  function initializePracticeWindow() {
    refs.practiceWindow.hidden = Boolean(state.window.shelved);
    refs.practiceWindow.classList.toggle('is-student-practice', state.mode === 'student');
    refs.practiceWindow.classList.toggle('is-authoring', state.mode === 'teacher');
    const boardRect = getBoardWorldRect();
    if (state.window.width && state.window.height && state.window.x !== null && state.window.y !== null) {
      refs.practiceWindow.style.transform = 'none';
      refs.practiceWindow.style.left = `${state.window.x * boardRect.width}px`;
      refs.practiceWindow.style.top = `${state.window.y * boardRect.height}px`;
      refs.practiceWindow.style.width = `${Math.min(1180, Math.max(360, state.window.width * boardRect.width))}px`;
      refs.practiceWindow.style.height = `${Math.min(920, Math.max(450, state.window.height * boardRect.height))}px`;
    } else {
      refs.practiceWindow.style.transform = 'none';
      refs.practiceWindow.style.left = '24px';
      refs.practiceWindow.style.top = '24px';
      refs.practiceWindow.style.width = '650px';
      refs.practiceWindow.style.height = '730px';
    }
    refs.practiceWindow.classList.toggle('is-collapsed', Boolean(state.window.collapsed));
    refs.collapseButton.textContent = state.window.collapsed ? '+' : '—';
    clampWindowToBoard();
  }

  function saveWindowGeometry() {
    if (state.window.shelved) { scheduleSave(); return; }
    const boardRect = getBoardWorldRect();
    if (!boardRect.width || !boardRect.height) return;
    state.window.x = refs.practiceWindow.offsetLeft / boardRect.width;
    state.window.y = refs.practiceWindow.offsetTop / boardRect.height;
    state.window.width = refs.practiceWindow.offsetWidth / boardRect.width;
    state.window.height = refs.practiceWindow.offsetHeight / boardRect.height;
    scheduleSave();
  }

  function clampWindowToBoard() {
    if (state.window.shelved) return;
    const boardRect = getBoardWorldRect();
    if (!boardRect.width) return;
    refs.practiceWindow.style.transform = 'none';
    const currentWidth = refs.practiceWindow.offsetWidth || 650;
    const currentHeight = refs.practiceWindow.offsetHeight || 730;
    const width = Math.min(Math.max(320, currentWidth), Math.min(1180, boardRect.width));
    const height = state.window.collapsed ? currentHeight : Math.min(Math.max(410, currentHeight), Math.min(920, boardRect.height));
    const left = Math.max(0, Math.min(boardRect.width - width, refs.practiceWindow.offsetLeft || 0));
    const top = Math.max(0, Math.min(boardRect.height - height, refs.practiceWindow.offsetTop || 0));
    refs.practiceWindow.style.left = `${left}px`;
    refs.practiceWindow.style.top = `${top}px`;
    refs.practiceWindow.style.width = `${width}px`;
    if (!state.window.collapsed) refs.practiceWindow.style.height = `${height}px`;
    saveWindowGeometry();
  }

  function centerPracticeWindow() {
    revealPrimaryPracticeWindow();
    const boardRect = getBoardWorldRect();
    const preferredWidth = state.mode === 'teacher' ? 1080 : 650;
    const preferredHeight = state.mode === 'teacher' ? 790 : 720;
    const width = Math.min(preferredWidth, boardRect.width - 36);
    const height = Math.min(preferredHeight, boardRect.height - 36);
    refs.practiceWindow.style.transform = 'none';
    refs.practiceWindow.style.width = `${width}px`;
    refs.practiceWindow.style.height = `${height}px`;
    const left = state.mode === 'teacher' ? Math.max(18, (boardRect.width - width) / 2) : 24;
    const top = state.mode === 'teacher' ? Math.max(18, (boardRect.height - height) / 2) : 24;
    refs.practiceWindow.style.left = `${left}px`;
    refs.practiceWindow.style.top = `${top}px`;
    if (state.window.collapsed) {
      state.window.collapsed = false;
      refs.practiceWindow.classList.remove('is-collapsed');
      refs.collapseButton.textContent = '—';
    }
    saveWindowGeometry();
  }

  function installWindowDrag() {
    let drag = null;
    refs.dragHandle.addEventListener('pointerdown', event => {
      if (onlineAccessRole !== 'teacher' || event.target.closest('button') || state.practiceOnly?.active) return;
      event.preventDefault();
      drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: refs.practiceWindow.offsetLeft, top: refs.practiceWindow.offsetTop };
      refs.dragHandle.setPointerCapture(event.pointerId);
    });
    refs.dragHandle.addEventListener('pointermove', event => {
      if (!drag || event.pointerId !== drag.pointerId) return;
      const boardRect = getBoardWorldRect();
      const zoom = currentBoardZoom();
      const left = Math.max(0, Math.min(boardRect.width - refs.practiceWindow.offsetWidth, drag.left + (event.clientX - drag.startX) / zoom));
      const top = Math.max(0, Math.min(boardRect.height - refs.practiceWindow.offsetHeight, drag.top + (event.clientY - drag.startY) / zoom));
      refs.practiceWindow.style.transform = 'none';
      refs.practiceWindow.style.left = `${left}px`;
      refs.practiceWindow.style.top = `${top}px`;
    });
    refs.dragHandle.addEventListener('pointerup', event => {
      if (!drag) return;
      drag = null;
      try { refs.dragHandle.releasePointerCapture(event.pointerId); } catch (_) { /* nieko */ }
      saveWindowGeometry();
    });
  }

  function installWindowResize() {
    let resize = null;
    refs.resizeHandle.addEventListener('pointerdown', event => {
      if (onlineAccessRole !== 'teacher' || state.practiceOnly?.active) return;
      event.preventDefault();
      event.stopPropagation();
      const boardRect = getBoardWorldRect();
      resize = {
        pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
        width: refs.practiceWindow.offsetWidth, height: refs.practiceWindow.offsetHeight,
        maxWidth: boardRect.width - refs.practiceWindow.offsetLeft, maxHeight: boardRect.height - refs.practiceWindow.offsetTop
      };
      refs.resizeHandle.setPointerCapture(event.pointerId);
    });
    refs.resizeHandle.addEventListener('pointermove', event => {
      if (!resize || event.pointerId !== resize.pointerId) return;
      const zoom = currentBoardZoom();
      refs.practiceWindow.style.width = `${Math.max(320, Math.min(resize.maxWidth, resize.width + (event.clientX - resize.startX) / zoom))}px`;
      refs.practiceWindow.style.height = `${Math.max(410, Math.min(resize.maxHeight, resize.height + (event.clientY - resize.startY) / zoom))}px`;
    });
    refs.resizeHandle.addEventListener('pointerup', event => {
      if (!resize) return;
      resize = null;
      try { refs.resizeHandle.releasePointerCapture(event.pointerId); } catch (_) { /* nieko */ }
      saveWindowGeometry();
    });
  }

  // -------------------- ONLINE-P1.1.2 bendros lentos tiltas --------------------

  function ensureSharedIds() {
    state.drawing.forEach((stroke, index) => {
      if (!stroke.id) stroke.id = `stroke-migrated-${index}-${Math.random().toString(36).slice(2, 8)}`;
    });
  }

  function onlineSharedSnapshot() {
    ensureSharedIds();
    return {
      schemaVersion: 1,
      drawing: deepClone(state.drawing),
      notes: deepClone(state.notes),
      boardImages: deepClone(state.boardImages),
      boardTasks: deepClone(state.boardTasks),
      boardPractices: deepClone(state.boardPractices),
      window: deepClone(state.window),
      boardGeometry: boardGeometrySnapshot()
    };
  }

  function externalPracticeStaticSignature(instance) {
    const copy = deepClone(instance);
    delete copy.moduleState;
    delete copy.moduleMode;
    delete copy.moduleCurrentIndex;
    delete copy.moduleView;
    return JSON.stringify(copy);
  }

  function applyExternalPracticeProgressWithoutRerender(incoming) {
    if (!Array.isArray(incoming) || incoming.length !== state.boardPractices.length) return false;
    const pairs = incoming.map(item => [state.boardPractices.find(current => current.id === item.id), item]);
    if (pairs.some(([current]) => !current)) return false;
    for (const [current, next] of pairs) {
      if (current.kind === 'external-module' && next.kind === 'external-module') {
        if (externalPracticeStaticSignature(current) !== externalPracticeStaticSignature(next)) return false;
      } else if (JSON.stringify(current) !== JSON.stringify(next)) return false;
    }
    for (const [current, next] of pairs) {
      if (current.kind !== 'external-module') continue;
      current.moduleState = deepClone(next.moduleState || {});
      current.moduleMode = next.moduleMode === 'self' ? 'self' : 'class';
      current.moduleCurrentIndex = Math.max(0, Number(next.moduleCurrentIndex) || 0);
      current.moduleView = ['start', 'task', 'end'].includes(next.moduleView) ? next.moduleView : 'start';
      syncExternalPracticeFrame(current);
    }
    return true;
  }

  function applyIncomingNotesWithoutBoardRerender(incoming) {
    if (!Array.isArray(incoming) || incoming.length !== state.notes.length) return false;
    const currentById = new Map(state.notes.map(note => [note.id, note]));
    if (incoming.some(note => !currentById.has(note.id))) return false;

    const boardRect = getBoardWorldRect();
    for (const next of incoming) {
      const current = currentById.get(next.id);
      if (!current) return false;
      if (JSON.stringify(current) === JSON.stringify(next)) continue;

      // Išlaikome tą patį objekto reference: ant esamo contenteditable užkabinti
      // event listeneriai turi closure į current. Taip nuotolinis tekstas gali būti
      // atnaujintas be visos lentos renderBoardObjects() perpiešimo.
      Object.keys(current).forEach(key => { if (!(key in next)) delete current[key]; });
      Object.assign(current, deepClone(next));

      const element = refs.objectsLayer.querySelector(`[data-note-id="${CSS.escape(String(current.id))}"]`);
      const editor = element?.querySelector('.mixed-editor-content');
      if (!element || !editor) return false;

      element.style.left = `${current.x * boardRect.width}px`;
      element.style.top = `${current.y * boardRect.height}px`;
      element.style.width = `${Math.max(110, Math.min(900, current.width || 420))}px`;
      element.style.minHeight = '44px';
      renderMixedNoteContent(current, editor);
      applyMixedNoteContentSizing(current, editor, { expandForFormula: false });
    }
    return true;
  }

  function applyOnlineSharedPart(part, value) {
    if (part === 'boardGeometry') {
      applyIncomingBoardGeometry(value && typeof value === 'object' ? value : {});
      try {
        state.packageData = practicePackage;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (_) {}
      return;
    }
    if (part === 'drawing') {
      state.drawing = Array.isArray(value) ? value.filter(Boolean) : [];
      ensureSharedIds();
      rebuildCommittedCanvas();
      redrawCanvas();
      return;
    }
    if (part === 'notes') {
      const incoming = migrateMixedNotes(Array.isArray(value) ? value : [], []);
      if (!applyIncomingNotesWithoutBoardRerender(incoming)) {
        state.notes = incoming;
        renderBoardObjects();
      }
    } else if (part === 'boardImages') {
      state.boardImages = (Array.isArray(value) ? value : []).map(normalizeBoardImageInstance).filter(Boolean);
      if (state.activeBoardObject?.type === 'image' && !state.boardImages.some(item => item.id === state.activeBoardObject.id)) state.activeBoardObject = null;
      renderBoardObjects();
    } else if (part === 'boardTasks') {
      state.boardTasks = (Array.isArray(value) ? value : []).map(normalizeBoardTaskInstance).filter(Boolean);
      if (state.activeBoardTaskId && !state.boardTasks.some(item => item.id === state.activeBoardTaskId)) state.activeBoardTaskId = null;
      renderBoardObjects();
    } else if (part === 'boardPractices') {
      const incoming = (Array.isArray(value) ? value : []).map(normalizeBoardPracticeInstance).filter(Boolean);
      if (!applyExternalPracticeProgressWithoutRerender(incoming)) {
        state.boardPractices = incoming;
        if (state.activeBoardPracticeId && !state.boardPractices.some(item => item.id === state.activeBoardPracticeId)) state.activeBoardPracticeId = null;
        renderBoardObjects();
      }
    } else if (part === 'window') {
      state.window = { ...defaultState().window, ...(value && typeof value === 'object' ? value : {}) };
      initializePracticeWindow();
    } else {
      return;
    }
    try {
      state.packageData = practicePackage;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      refs.saveState.textContent = 'Išsaugota';
    } catch (_) { /* vietinė kopija nėra kritinė online sinchronizacijai */ }
  }

  function applyOnlineAccessRole(role) {
    onlineAccessRole = role === 'student' ? 'student' : 'teacher';
    document.body.dataset.onlineRole = onlineAccessRole;
    const isTeacher = onlineAccessRole === 'teacher';

    refs.libraryButton.hidden = !isTeacher;
    refs.resetButton.hidden = !isTeacher;
    refs.collapseButton.hidden = !isTeacher;
    refs.resizeHandle.hidden = !isTeacher;
    const mainGrip = refs.practiceWindow.querySelector('.practice-object-grip');
    if (mainGrip) mainGrip.hidden = !isTeacher;
    const modeSwitch = refs.studentModeButton.closest('.mode-switch');
    // ONLINE-P1.1.3: rolė ir darbo režimas yra vienas dalykas.
    // Perjungiklis neberodomas nei mokytojui, nei mokiniui.
    if (modeSwitch) modeSwitch.hidden = true;

    if (isTeacher) {
      // Mokytojo teisės lieka mokytojo, tačiau pagrindiniame lange rodomos pačios pratybos.
      // Mokytojo rengyklė nėra numatytasis vaizdas.
      setMode('student', { force: true, allowEmpty: true });
    } else {
      closeLibrary();
      setMode('student', { force: true, allowEmpty: true });
      refs.authoringBody.hidden = true;
      refs.centerPracticeButton.hidden = true;
    }
    renderBoardObjects();
  }

  window.addEventListener('message', event => {
    if (event.origin !== location.origin) return;
    const data = event.data || {};
    if (!['p772:external-practice-ready', 'p772:external-practice-state'].includes(data.type)) return;
    const instance = state.boardPractices.find(item => item.kind === 'external-module' && item.id === data.practiceId && item.moduleId === data.moduleId);
    if (!instance) return;
    if (data.type === 'p772:external-practice-ready') {
      syncExternalPracticeFrame(instance);
      return;
    }
    instance.moduleState = data.state && typeof data.state === 'object' ? deepClone(data.state) : {};
    instance.moduleMode = data.mode === 'self' ? 'self' : 'class';
    instance.moduleCurrentIndex = Math.max(0, Number(data.currentIndex) || 0);
    instance.moduleView = ['start', 'task', 'end'].includes(data.view) ? data.view : 'start';
    scheduleSave();
  });

  window.addEventListener('blur', () => {
    window.dispatchEvent(new CustomEvent('p772:shared-note-editing-ended'));
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      window.dispatchEvent(new CustomEvent('p772:shared-note-editing-ended'));
    }
  });

  window.P772OnlineBridge = Object.freeze({
    version: 'P2-SPLIT-P2.2.3',
    setOnlineRole: applyOnlineAccessRole,
    openStudentPreview() {
      window.dispatchEvent(new CustomEvent('p772:open-student-preview'));
    },
    getSharedSnapshot: onlineSharedSnapshot,
    getDiagnosticSnapshot: boardDiagnosticSnapshot,
    applySharedPart: applyOnlineSharedPart,
    isSharedNoteEditing: sharedNoteEditingActive,
    setRemoteLiveStrokes(strokes) {
      remoteLiveStrokes = Array.isArray(strokes) ? strokes.filter(Boolean) : [];
      redrawCanvas();
    },
    showToast
  });

  // -------------------- Bendrieji įvykiai --------------------

  document.querySelectorAll('[data-tool]').forEach(button => button.addEventListener('click', () => setTool(button.dataset.tool)));
  refs.previousButton.addEventListener('click', () => {
    if (state.mode === 'student') {
      const indexes = readyTaskIndexes();
      const position = indexes.indexOf(state.currentTask);
      if (position > 0) state.currentTask = indexes[position - 1];
    } else state.currentTask = Math.max(0, state.currentTask - 1);
    renderTask();
  });
  refs.nextButton.addEventListener('click', () => {
    if (state.mode === 'student') {
      const indexes = readyTaskIndexes();
      const position = indexes.indexOf(state.currentTask);
      if (position >= 0 && position < indexes.length - 1) state.currentTask = indexes[position + 1];
    } else state.currentTask = Math.min(tasks.length - 1, state.currentTask + 1);
    renderTask();
  });
  refs.collapseButton.addEventListener('click', () => {
    if (onlineAccessRole !== 'teacher') return;
    state.window.collapsed = !state.window.collapsed;
    refs.practiceWindow.classList.toggle('is-collapsed', state.window.collapsed);
    refs.collapseButton.textContent = state.window.collapsed ? '+' : '—';
    saveWindowGeometry();
  });
  refs.addNoteButton.addEventListener('click', () => { setTool('select'); addNote(); });
  refs.addImageButton.addEventListener('click', () => {
    setTool('select');
    refs.boardImageInput.value = '';
    refs.boardImageInput.click();
  });
  refs.boardImageInput.addEventListener('change', async () => {
    const file = refs.boardImageInput.files?.[0];
    refs.boardImageInput.value = '';
    if (!file) return;
    refs.addImageButton.disabled = true;
    const previousTitle = refs.addImageButton.title;
    refs.addImageButton.title = 'Nuotrauka ruošiama…';
    try {
      await insertBoardImage(file);
      showToast('Nuotrauka įkelta į lentą');
    } catch (error) {
      console.error('Nuotraukos įkėlimo klaida:', error);
      showToast(error?.message || 'Nepavyko įkelti nuotraukos');
    } finally {
      refs.addImageButton.disabled = false;
      refs.addImageButton.title = previousTitle;
    }
  });
  refs.centerPracticeButton.addEventListener('click', centerPracticeWindow);
  refs.resetButton.addEventListener('click', () => {
    if (onlineAccessRole !== 'teacher') { showToast('Bendrą lentą gali išvalyti tik mokytojas'); return; }
    if (!window.confirm('Išvalyti visus P7.7.2 atsakymus, biblioteką, pavienes užduotis, puslapines pratybas, lentos objektus ir lango padėtį?')) return;
    document.body.classList.remove('practice-only-mode');
    refs.practiceOnlyOverlay.hidden = true;
    refs.practiceOnlyHost.replaceChildren();
    localStorage.removeItem(STORAGE_KEY);
    LEGACY_STORAGE_KEYS.forEach(key => localStorage.removeItem(key));
    practicePackage = normalizePackage(defaultPracticePackage);
    tasks = practicePackage.tasks;
    state = defaultState();
    editorDirty = false;
    refs.practiceWindow.removeAttribute('style');
    applyBoardCamera({ restoreScroll: true });
    resizeCanvas();
    renderBoardObjects();
    rebuildCommittedCanvas();
    redrawCanvas();
    setTool('select');
    setMode(onlineAccessRole === 'teacher' ? 'teacher' : 'student', { force: true, allowEmpty: true });
    requestAnimationFrame(() => { centerPracticeWindow(); if (state.mode === 'student') renderTask(); });
    showToast('P7.7.2 būsena, biblioteka, užduotys ir pratybų puslapiai išvalyti');
  });
  refs.canvas.addEventListener('pointerdown', boardInput.startDrawing);
  refs.canvas.addEventListener('pointermove', boardInput.continueDrawing);
  refs.canvas.addEventListener('pointerup', boardInput.stopDrawing);
  refs.canvas.addEventListener('pointercancel', boardInput.stopDrawing);

  // P1.7.9.43: keičiantis realiam lentos viewport'ui (planšetės pasukimas,
  // Padalintas/Lenta režimas, naršyklės dydis) išlaikome tą patį vartotojo mastelį.
  // 100 % bazė priklauso tik nuo Room koordinačių kartos, o ne nuo viewport'o pločio.
  let boardLastViewportWidth = 0;
  let boardViewportResizeFrame = 0;
  const boardViewportObserver = new ResizeObserver(() => {
    cancelAnimationFrame(boardViewportResizeFrame);
    boardViewportResizeFrame = requestAnimationFrame(() => {
      const nextWidth = Math.max(0, refs.board?.clientWidth || 0);
      const nextHeight = Math.max(0, refs.board?.clientHeight || 0);
      // Paslėptos panelės plotis gali trumpam būti 0 — tokio tarpinio dydžio
      // nelaikome tikru viewport'u ir pagal jį mastelio nekeičiame.
      if (nextWidth < 80 || nextHeight < 80) return;

      const oldZoom = currentBoardZoom();
      // P1.7.9.43: keičiantis viewport'ui mastelio bazės nekeičiame.
      // Naujam Room 100 % = zoom 1; senam 2400 px Room 100 % = zoom 1/3.
      boardLastViewportWidth = nextWidth;
      applyBoardCamera({ preserveCenter: true, oldZoom });
      resizeCanvas({ force: true });
      layoutBoardObjects();
    });
  });
  boardViewportObserver.observe(refs.board);
  window.addEventListener('beforeunload', () => {
    try {
      state.packageData = practicePackage;
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (_) { /* nieko */ }
  });

  installPracticeObjectSelection();
  installWindowDrag();
  installWindowResize();
  installAuthoringEvents();
  installAiWorkflowEvents();
  installLibraryEvents();
  setTool(state.activeTool || 'select');
  initializeUniversalMathKeyboard();
  installMathEditingBoundary();
  installMixedTextEditing();
  resizeCanvas();
  renderBoardObjects();
  initializePracticeWindow();
  installBoardCamera();
  if (!normalizeBoardObjectSelection(state.activeBoardObject?.type, state.activeBoardObject?.id) && state.mode === 'teacher' && !state.window.shelved) {
    state.activeBoardObject = { type: 'practice-window', id: 'main' };
  }
  updateActiveBoardObjectUi();
  tasks.forEach(task => { task.qualityGate = runTaskQualityGate(task); });
  renderLibrary();
  renderTask();
  setMode(state.mode, { force: true });
  if (!savedSnapshot && state.mode === 'student') requestAnimationFrame(centerPracticeWindow);
})();
