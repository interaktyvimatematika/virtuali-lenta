(() => {
  'use strict';

  const STORAGE_KEY = 'virtuali-lenta-interaktyvios-pratybos-p7.7.2-online-p1-v1';
  const LEGACY_STORAGE_KEYS = [];
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

  const savedSnapshot = readSavedSnapshot();
  let practicePackage = normalizePackage(savedSnapshot?.packageData || defaultPracticePackage);
  let tasks = practicePackage.tasks;

  const refs = {
    board: document.getElementById('board'),
    boardStage: document.getElementById('boardCameraStage'),
    boardWorld: document.getElementById('boardWorld'),
    canvas: document.getElementById('drawingCanvas'),
    objectsLayer: document.getElementById('objectsLayer'),
    practiceWindow: document.getElementById('practiceWindow'),
    dragHandle: document.getElementById('practiceDragHandle'),
    resizeHandle: document.getElementById('practiceResizeHandle'),
    collapseButton: document.getElementById('collapseButton'),
    packageEyebrow: document.getElementById('packageEyebrow'),
    packageTitle: document.getElementById('packageTitle'),
    taskCounter: document.getElementById('taskCounter'),
    scoreLabel: document.getElementById('scoreLabel'),
    progressFill: document.getElementById('progressFill'),
    taskNumber: document.getElementById('taskNumber'),
    taskTitle: document.getElementById('taskTitle'),
    responseBadge: document.getElementById('responseBadge'),
    difficultyLabel: document.getElementById('difficultyLabel'),
    instructionText: document.getElementById('instructionText'),
    formulaDisplay: document.getElementById('formulaDisplay'),
    domainNote: document.getElementById('domainNote'),
    taskCard: document.querySelector('.task-card'),
    responseHost: document.getElementById('responseHost'),
    feedback: document.getElementById('feedback'),
    feedbackIcon: document.getElementById('feedbackIcon'),
    feedbackTitle: document.getElementById('feedbackTitle'),
    feedbackText: document.getElementById('feedbackText'),
    hintBox: document.getElementById('hintBox'),
    hintText: document.getElementById('hintText'),
    previousButton: document.getElementById('previousButton'),
    nextButton: document.getElementById('nextButton'),
    taskDots: document.getElementById('taskDots'),
    saveState: document.getElementById('saveState'),
    addNoteButton: document.getElementById('addNoteButton'),
    universalMathToolbar: document.getElementById('universalMathToolbar'),
    universalMathCategories: document.getElementById('universalMathCategories'),
    universalMathKeyboard: document.getElementById('universalMathKeyboard'),
    universalMathStatus: document.getElementById('universalMathStatus'),
    centerPracticeButton: document.getElementById('centerPracticeButton'),
    practiceOnlyButton: document.getElementById('practiceOnlyButton'),
    practiceOnlyOverlay: document.getElementById('practiceOnlyOverlay'),
    practiceOnlyHost: document.getElementById('practiceOnlyHost'),
    practiceOnlyTitle: document.getElementById('practiceOnlyTitle'),
    exitPracticeOnlyButton: document.getElementById('exitPracticeOnlyButton'),
    boardZoomOutButton: document.getElementById('boardZoomOutButton'),
    boardZoomInButton: document.getElementById('boardZoomInButton'),
    boardZoomActualButton: document.getElementById('boardZoomActualButton'),
    boardZoomFitButton: document.getElementById('boardZoomFitButton'),
    boardFocusObjectButton: document.getElementById('boardFocusObjectButton'),
    boardZoomLabel: document.getElementById('boardZoomLabel'),
    resetButton: document.getElementById('resetButton'),
    libraryButton: document.getElementById('libraryButton'),
    libraryModal: document.getElementById('libraryModal'),
    closeLibraryButton: document.getElementById('closeLibraryButton'),
    libraryTasksTab: document.getElementById('libraryTasksTab'),
    libraryPracticesTab: document.getElementById('libraryPracticesTab'),
    libraryTasksView: document.getElementById('libraryTasksView'),
    libraryPracticesView: document.getElementById('libraryPracticesView'),
    libraryTaskCount: document.getElementById('libraryTaskCount'),
    libraryPracticeCount: document.getElementById('libraryPracticeCount'),
    librarySearch: document.getElementById('librarySearch'),
    libraryClassFilter: document.getElementById('libraryClassFilter'),
    libraryTopicFilter: document.getElementById('libraryTopicFilter'),
    libraryTypeFilter: document.getElementById('libraryTypeFilter'),
    libraryDifficultyFilter: document.getElementById('libraryDifficultyFilter'),
    libraryStatusFilter: document.getElementById('libraryStatusFilter'),
    libraryClearFiltersButton: document.getElementById('libraryClearFiltersButton'),
    libraryResultsLabel: document.getElementById('libraryResultsLabel'),
    libraryTaskGrid: document.getElementById('libraryTaskGrid'),
    libraryEmpty: document.getElementById('libraryEmpty'),
    librarySelectionLabel: document.getElementById('librarySelectionLabel'),
    libraryInsertSelectedButton: document.getElementById('libraryInsertSelectedButton'),
    libraryBuildPracticeButton: document.getElementById('libraryBuildPracticeButton'),
    libraryPracticeList: document.getElementById('libraryPracticeList'),
    libraryPracticesEmpty: document.getElementById('libraryPracticesEmpty'),
    toast: document.getElementById('toast'),
    studentModeButton: document.getElementById('studentModeButton'),
    teacherModeButton: document.getElementById('teacherModeButton'),
    authoringBody: document.getElementById('authoringBody'),
    authoringTaskList: document.getElementById('authoringTaskList'),
    addTaskButton: document.getElementById('addTaskButton'),
    duplicateTaskButton: document.getElementById('duplicateTaskButton'),
    deleteTaskButton: document.getElementById('deleteTaskButton'),
    testAsStudentButton: document.getElementById('testAsStudentButton'),
    checkTaskButton: document.getElementById('checkTaskButton'),
    aiWorkflowButton: document.getElementById('aiWorkflowButton'),
    aiWorkflowModal: document.getElementById('aiWorkflowModal'),
    closeAiWorkflowButton: document.getElementById('closeAiWorkflowButton'),
    aiTeacherRequest: document.getElementById('aiTeacherRequest'),
    generateAiPromptButton: document.getElementById('generateAiPromptButton'),
    aiPromptOutput: document.getElementById('aiPromptOutput'),
    copyAiPromptButton: document.getElementById('copyAiPromptButton'),
    aiJsonInput: document.getElementById('aiJsonInput'),
    aiImportMode: document.getElementById('aiImportMode'),
    aiJsonFileInput: document.getElementById('aiJsonFileInput'),
    previewAiImportButton: document.getElementById('previewAiImportButton'),
    applyAiImportButton: document.getElementById('applyAiImportButton'),
    aiImportStatus: document.getElementById('aiImportStatus'),
    aiImportPreview: document.getElementById('aiImportPreview'),
    aiImportSummary: document.getElementById('aiImportSummary'),
    aiGenerationNotes: document.getElementById('aiGenerationNotes'),
    aiImportTaskList: document.getElementById('aiImportTaskList'),
    exportPackageButton: document.getElementById('exportPackageButton'),
    taskEditorForm: document.getElementById('taskEditorForm'),
    authoringEditorTitle: document.getElementById('authoringEditorTitle'),
    packageTitleInput: document.getElementById('packageTitleInput'),
    packageEyebrowInput: document.getElementById('packageEyebrowInput'),
    editorTaskTitle: document.getElementById('editorTaskTitle'),
    editorDifficulty: document.getElementById('editorDifficulty'),
    editorInstruction: document.getElementById('editorInstruction'),
    editorPromptKind: document.getElementById('editorPromptKind'),
    editorPromptValue: document.getElementById('editorPromptValue'),
    authoringMathPreview: document.getElementById('authoringMathPreview'),
    editorNote: document.getElementById('editorNote'),
    editorHint: document.getElementById('editorHint'),
    editorRenderer: document.getElementById('editorRenderer'),
    editorValidator: document.getElementById('editorValidator'),
    editorResponseLabel: document.getElementById('editorResponseLabel'),
    editorPlaceholder: document.getElementById('editorPlaceholder'),
    expressionValidatorPanel: document.getElementById('expressionValidatorPanel'),
    equationValidatorPanel: document.getElementById('equationValidatorPanel'),
    editorExpectedExpression: document.getElementById('editorExpectedExpression'),
    editorExpectedExpressionDisplay: document.getElementById('editorExpectedExpressionDisplay'),
    editorDomain: document.getElementById('editorDomain'),
    editorSamples: document.getElementById('editorSamples'),
    editorRequireSimplified: document.getElementById('editorRequireSimplified'),
    editorInitialEquation: document.getElementById('editorInitialEquation'),
    editorExpectedVariable: document.getElementById('editorExpectedVariable'),
    editorExpectedValue: document.getElementById('editorExpectedValue'),
    editorExpectedValueDisplay: document.getElementById('editorExpectedValueDisplay'),
    editorMinimumSteps: document.getElementById('editorMinimumSteps'),
    minimumStepsField: document.getElementById('minimumStepsField'),
    automaticAnalysisPanel: document.getElementById('automaticAnalysisPanel'),
    automaticAnalysisTitle: document.getElementById('automaticAnalysisTitle'),
    automaticAnalysisStatus: document.getElementById('automaticAnalysisStatus'),
    automaticAnalysisText: document.getElementById('automaticAnalysisText'),
    automaticAnalysisMath: document.getElementById('automaticAnalysisMath'),
    qualityGatePanel: document.getElementById('qualityGatePanel'),
    qualityGateTitle: document.getElementById('qualityGateTitle'),
    qualityGateStatus: document.getElementById('qualityGateStatus'),
    qualityGateSummary: document.getElementById('qualityGateSummary'),
    qualityGateChecklist: document.getElementById('qualityGateChecklist'),
    equationTechnicalFields: document.getElementById('equationTechnicalFields'),
    taskJsonPreview: document.getElementById('taskJsonPreview'),
    copyJsonButton: document.getElementById('copyJsonButton'),
    authoringValidation: document.getElementById('authoringValidation'),
    discardEditorChangesButton: document.getElementById('discardEditorChangesButton'),
    saveTaskToLibraryButton: document.getElementById('saveTaskToLibraryButton')
  };

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
    }
  };

  function createStructuredStep(type = 'equation', values = [''], latexValues = []) {
    const safeType = ['equation', 'alternatives', 'solution-set'].includes(type) ? type : 'equation';
    const sourceValues = Array.isArray(values) ? values.map(value => String(value ?? '')) : [String(values ?? '')];
    const sourceLatexValues = Array.isArray(latexValues)
      ? latexValues.map(value => String(value ?? ''))
      : [String(latexValues ?? '')];
    if (safeType === 'alternatives') {
      while (sourceValues.length < 2) sourceValues.push('');
      while (sourceLatexValues.length < sourceValues.length) sourceLatexValues.push('');
      return {
        type: safeType,
        values: sourceValues,
        latexValues: sourceLatexValues.slice(0, sourceValues.length)
      };
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
    return createStructuredStep(step.type, values, latexValues);
  }

  function normalizeStructuredSteps(steps) {
    if (!Array.isArray(steps) || !steps.length) return [createStructuredStep()];
    return steps.map(normalizeStructuredStep);
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
        if (normalized[normalized.length - 1]?.type !== 'break') normalized.push({ type: 'break' });
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
      width: Math.max(250, Math.min(900, Number(safe.width) || 420)),
      minHeight: Math.max(82, Math.min(700, Number(safe.minHeight || safe.height) || 118)),
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

  const defaultState = () => ({
    currentTask: 0,
    mode: 'student',
    packageData: practicePackage,
    responses: Object.fromEntries(tasks.map(task => [task.id, defaultResponse(task)])),
    results: Object.fromEntries(tasks.map(task => [task.id, null])),
    window: { x: null, y: null, width: null, height: null, collapsed: false, shelved: false },
    drawing: [],
    notes: [],
    formulas: [], // legacy: P7.7.2 formulės gyvena notes[].nodes modelyje
    boardTasks: [],
    activeBoardTaskId: null,
    boardPractices: [],
    activeBoardPracticeId: null,
    activeBoardObject: null,
    camera: { zoom: 0.72, scrollLeft: 0, scrollTop: 0, worldWidth: 2400, worldHeight: 1700 },
    practiceOnly: { active: false, practiceId: null },
    mathToolbarCategory: 'Pagrindiniai',
    library: createInitialLibrary(),
    activeTool: 'select'
  });

  let state = loadState(savedSnapshot);
  let saveTimer = null;
  let toastTimer = null;
  let drawingContext = null;
  let drawingActive = false;
  let activeStroke = null;
  let remoteLiveStrokes = [];
  let lastCanvasSize = { width: 0, height: 0 };
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
    'quadratic-equation-chain': validateQuadraticEquationChain
  };

  function deepClone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function clampCameraZoom(value) {
    return Math.max(0.2, Math.min(1.8, Number(value) || 0.72));
  }

  function normalizeCamera(camera) {
    return {
      zoom: clampCameraZoom(camera?.zoom),
      scrollLeft: Math.max(0, Number(camera?.scrollLeft) || 0),
      scrollTop: Math.max(0, Number(camera?.scrollTop) || 0),
      worldWidth: Math.max(1800, Math.min(4200, Number(camera?.worldWidth) || 2400)),
      worldHeight: Math.max(1200, Math.min(3000, Number(camera?.worldHeight) || 1700))
    };
  }

  function getBoardWorldRect() {
    const camera = normalizeCamera(state?.camera || {});
    return { width: camera.worldWidth, height: camera.worldHeight, left: 0, top: 0, right: camera.worldWidth, bottom: camera.worldHeight };
  }

  function currentBoardZoom() {
    return clampCameraZoom(state?.camera?.zoom);
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

  function readSavedSnapshot() {
    try {
      const direct = localStorage.getItem(STORAGE_KEY);
      if (direct) return JSON.parse(direct);
      for (const legacyKey of LEGACY_STORAGE_KEYS) {
        const legacy = localStorage.getItem(legacyKey);
        if (legacy) return JSON.parse(legacy);
      }
      return null;
    } catch (error) {
      console.warn('Nepavyko perskaityti P7.7.2 būsenos:', error);
      return null;
    }
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
    const base = defaultState();
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
      console.warn('Nepavyko atkurti būsenos:', error);
      return base;
    }
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

  function scheduleSave() {
    refs.saveState.textContent = 'Saugoma…';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        state.packageData = practicePackage;
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
        refs.saveState.textContent = 'Išsaugota';
        window.dispatchEvent(new CustomEvent('p772:shared-state-changed'));
      } catch (error) {
        refs.saveState.textContent = 'Neišsaugota';
        console.error('Nepavyko išsaugoti:', error);
      }
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

  function eventComposedPath(event) {
    try {
      const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
      if (Array.isArray(path) && path.length) return path;
    } catch (_) {}
    return event?.target ? [event.target] : [];
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
    const safeType = String(type || '');
    const safeId = String(id || '');
    if (!safeType || !safeId) return null;
    if (safeType === 'task' && state.boardTasks.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'practice' && state.boardPractices.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'note' && state.notes.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'formula' && state.formulas.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'practice-window' && safeId === 'main' && !state.window.shelved) return { type: safeType, id: safeId };
    return null;
  }

  function getBoardObjectElement(selection = state.activeBoardObject) {
    if (!selection) return null;
    if (selection.type === 'practice-window') return !state.window.shelved ? refs.practiceWindow : null;
    return [...(refs.objectsLayer?.querySelectorAll('[data-board-object-type][data-board-object-id]') || [])]
      .find(element => element.dataset.boardObjectType === selection.type && element.dataset.boardObjectId === selection.id) || null;
  }

  function updateActiveBoardObjectUi() {
    const selection = normalizeBoardObjectSelection(state.activeBoardObject?.type, state.activeBoardObject?.id);
    if (!selection) state.activeBoardObject = null;
    refs.objectsLayer?.querySelectorAll('[data-board-object-type][data-board-object-id]').forEach(element => {
      element.classList.toggle('is-active-object', Boolean(selection)
        && element.dataset.boardObjectType === selection.type
        && element.dataset.boardObjectId === selection.id);
    });
    refs.practiceWindow?.classList.toggle('is-object-selected', selection?.type === 'practice-window');
    if (refs.boardFocusObjectButton) {
      refs.boardFocusObjectButton.disabled = !selection;
      refs.boardFocusObjectButton.title = selection ? 'Priartinti pažymėtą lentos objektą' : 'Pirmiausia pažymėkite lentos objektą';
    }
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

  function astNodeToLatex(node, parentPrecedence = 0) {
    if (!node) return '';
    if (node.type === 'number') return formatNumber(node.value).replace(',', '.');
    if (node.type === 'variable') return node.name;
    if (node.mixedDisplay) {
      return `${node.mixedDisplay.whole}\\frac{${node.mixedDisplay.numerator}}{${node.mixedDisplay.denominator}}`;
    }
    if (node.type === 'unary') return `-${astNodeToLatex(node.value, 3)}`;
    if (node.type !== 'binary') return '';
    const current = precedence(node);
    let result = '';
    if (node.operator === '/') result = `\\frac{${astNodeToLatex(node.left, 0)}}{${astNodeToLatex(node.right, 0)}}`;
    else if (node.operator === '^') result = `${astNodeToLatex(node.left, 4)}^{${astNodeToLatex(node.right, 0)}}`;
    else {
      const operator = node.operator === '*' ? '\\cdot ' : node.operator;
      result = `${astNodeToLatex(node.left, current)}${operator}${astNodeToLatex(node.right, node.operator === '-' ? current + 1 : current)}`;
    }
    return current < parentPrecedence ? `\\left(${result}\\right)` : result;
  }

  function sourceToLatex(source, kind = 'expression') {
    const value = String(source || '').trim();
    if (!value) return '';
    try {
      if (kind === 'equation') {
        const equation = parseEquation(value);
        return `${astNodeToLatex(equation.left)}=${astNodeToLatex(equation.right)}`;
      }
      if (kind === 'solution-set') {
        const set = parseSolutionSetInput(value);
        if (set.kind === 'none') return '\\varnothing';
        if (set.kind === 'finite') return `\\left\\{${set.values.map(formatSupportedRoot).join(';')}\\right\\}`;
      }
      return astNodeToLatex(parseExpression(value));
    } catch (_) {
      return value
        .replace(/∅/g, '\\varnothing')
        .replace(/√/g, '\\sqrt{}')
        .replace(/:/g, '/');
    }
  }

  function normalizeMathLiveAscii(value) {
    let source = String(value || '')
      .replace(/\\left|\\right/g, '')
      .replace(/[−–—]/g, '-')
      .replace(/[·×]/g, '*')
      .replace(/\\cdot|cdot/g, '*')
      .replace(/\\times|times/g, '*')
      .replace(/\\varnothing|\\emptyset|emptyset|O\//g, '∅')
      .replace(/([A-Za-z])_\(?([0-9]+)\)?/g, '$1$2')
      .replace(/\s+/g, ' ')
      .trim();
    // MathLive ASCII can return a whole number immediately followed by a parenthesized fraction.
    source = source.replace(/(^|[^0-9])(-?\d+)\s*\((-?\d+)\)\s*\/\s*\((\d+)\)/g, '$1$2 $3/$4');
    source = source.replace(/(^|[^0-9])(-?\d+)\s+\((-?\d+)\)\s*\/\s*\((\d+)\)/g, '$1$2 $3/$4');
    return source;
  }

  function readDirectMathField(field) {
    try {
      if (typeof field.getValue === 'function') return normalizeMathLiveAscii(field.getValue('ascii-math'));
      if (typeof field.value === 'string') return normalizeMathLiveAscii(field.value);
    } catch (_) {}
    return normalizeMathLiveAscii(field.dataset.source || field.textContent || '');
  }

  function readDirectMathLatex(field) {
    try {
      if (typeof field.getValue === 'function') return String(field.getValue('latex') || field.getValue() || '');
      if (typeof field.value === 'string') return String(field.value || '');
    } catch (_) {}
    return String(field.dataset.latex || field.dataset.source || field.textContent || '');
  }

  function setDirectMathFieldValue(field, source, kind = 'expression', latexSource = '') {
    const plain = String(source || '');
    const latex = String(latexSource || sourceToLatex(plain, kind));
    field.dataset.source = plain;
    field.dataset.latex = latex;
    field.dataset.kind = kind;
    const apply = () => {
      try {
        if (typeof field.setValue === 'function') field.setValue(latex, { suppressChangeNotifications: true });
        else if ('value' in field) field.value = latex;
        else field.textContent = latex;
      } catch (_) { field.textContent = plain; }
    };
    apply();
    if (window.customElements?.whenDefined) {
      const initialLatex = latex;
      customElements.whenDefined('math-field').then(() => {
        if (!field.isConnected) return;
        // Neperrašome vartotojo įvesties, jeigu laukas buvo pakeistas dar prieš whenDefined mikro-užduotį.
        if (String(field.dataset.latex || '') === initialLatex) apply();
        renderMathFieldPreview(field);
      }).catch(() => {});
    }
    requestAnimationFrame(() => {
      if (field.isConnected) renderMathFieldPreview(field);
    });
  }

  function focusAdjacentMathField(field, direction = 1) {
    const fields = [...document.querySelectorAll('math-field.direct-math-field')].filter(item => item.isConnected && !item.hasAttribute('disabled'));
    const index = fields.indexOf(field);
    if (index < 0) return false;
    const next = fields[index + direction];
    if (!next) return false;
    try { next.focus({ preventScroll: true }); } catch (_) { next.focus(); }
    setActiveDirectMathField(next, next.dataset.mathContext || 'Matematinis laukas');
    return true;
  }

  function moveMathPlaceholderOrField(field, direction) {
    const before = selectionSignature(captureMathFieldSelection(field));
    let commandResult = false;
    try {
      if (typeof field.executeCommand === 'function') {
        commandResult = field.executeCommand(direction > 0 ? 'moveToNextPlaceholder' : 'moveToPreviousPlaceholder');
      }
    } catch (_) { commandResult = false; }
    const afterSelection = captureMathFieldSelection(field);
    const movedInside = commandResult === true || selectionSignature(afterSelection) !== before;
    if (movedInside) return;

    const wrapper = field?.closest?.('.mixed-inline-formula');
    const editor = wrapper ? mixedEditorFromNode(wrapper) : null;
    if (wrapper && editor) {
      clearMathEditSession();
      if (direction > 0) placeTextCaretAfter(wrapper, editor);
      else placeTextCaretBefore(wrapper, editor);
      return;
    }
    focusAdjacentMathField(field, direction);
  }

  function createDirectMathField({ source = '', latexSource = '', kind = 'expression', fieldKey = '', testid = '', placeholder = '', contextLabel = 'Matematinis laukas', onCommit, onEnter }) {
    const field = document.createElement('math-field');
    field.className = 'direct-math-field';
    field.setAttribute('virtual-keyboard-mode', 'manual');
    field.setAttribute('math-virtual-keyboard-policy', 'manual');
    field.setAttribute('smart-mode', 'false');
    field.setAttribute('smart-fence', 'true');
    field.setAttribute('aria-label', placeholder || 'Matematinis įvedimo laukas');
    if (placeholder) field.setAttribute('placeholder', placeholder);
    if (testid) field.dataset.testid = testid;
    field.dataset.mathContext = contextLabel;
    field.dataset.mathFieldKey = String(fieldKey || testid || `math-field-${++generatedMathFieldKey}`);
    setDirectMathFieldValue(field, source, kind, latexSource);
    registerMathField(field);

    const reaffirm = options => reaffirmMathEditSession(field, contextLabel, options);
    const sync = () => {
      // Android fizinė / ekraninė klaviatūra gali trumpam pakeisti naršyklės focus būseną.
      // Pats įvedimo įvykis yra patikimas signalas, kad šis MathLive laukas tebėra aktyvus.
      reaffirm({ ensureVisible: false });
      const plain = readDirectMathField(field);
      const latex = readDirectMathLatex(field);
      field.dataset.source = plain;
      field.dataset.latex = latex;
      captureMathFieldSelection(field);
      scheduleMathFieldPreview(field);
      onCommit?.(plain, latex);
      queueMicrotask(() => {
        if (field.isConnected) reaffirm({ ensureVisible: false });
      });
    };
    field.__syncDirectMathField = sync;
    field.addEventListener('focusin', () => reaffirm({ ensureVisible: true }));
    field.addEventListener('focusout', () => {
      // Android klaviatūra gali trumpam perkelti focus į MathLive keyboard-sink arba naršyklę.
      // Neuždarome sesijos vien dėl blur/focusout: ją uždaro tik aiškus pointerdown už lauko.
      window.setTimeout(() => {
        if (!field.isConnected || activeDirectMathField !== field) return;
        const active = document.activeElement;
        if (active === field || field.matches(':focus-within')) reaffirm({ ensureVisible: false });
        else updateMathToolbarUi();
      }, 80);
    });
    field.addEventListener('pointerdown', () => {
      field.__suppressMathReaffirmUntil = 0;
      reaffirm({ ensureVisible: false, explicit: true });
    });
    field.addEventListener('pointerup', () => {
      reaffirm({ ensureVisible: false });
      captureMathFieldSelection(field);
      ensureMathFieldVisible(field);
    });
    field.addEventListener('beforeinput', () => reaffirm({ ensureVisible: false }));
    field.addEventListener('compositionstart', () => reaffirm({ ensureVisible: false }));
    field.addEventListener('compositionupdate', () => reaffirm({ ensureVisible: false }));
    field.addEventListener('compositionend', sync);
    field.addEventListener('selection-change', () => {
      reaffirm({ ensureVisible: false });
      captureMathFieldSelection(field);
    });
    field.addEventListener('keyup', () => {
      reaffirm({ ensureVisible: false });
      captureMathFieldSelection(field);
    });
    field.addEventListener('input', sync);
    field.addEventListener('change', sync);
    field.addEventListener('keydown', event => {
      reaffirm({ ensureVisible: false });
      if (event.key === 'Tab') {
        event.preventDefault();
        moveMathPlaceholderOrField(field, event.shiftKey ? -1 : 1);
        return;
      }
      if (event.key === 'Escape') {
        event.preventDefault();
        sync();
        field.blur();
        clearMathEditSession();
        return;
      }
      if (event.key === 'Enter' && !event.isComposing) {
        event.preventDefault();
        event.stopPropagation();
        sync();
        onEnter?.();
      }
    });
    field.addEventListener('move-out', event => {
      const wrapper = field.closest?.('.mixed-inline-formula');
      const editor = wrapper ? mixedEditorFromNode(wrapper) : null;
      if (!wrapper || !editor) return;
      const direction = event.detail?.direction;
      if (!['forward', 'backward'].includes(direction)) return;
      event.preventDefault();
      sync();
      clearMathEditSession();
      if (direction === 'forward') placeTextCaretAfter(wrapper, editor);
      else placeTextCaretBefore(wrapper, editor);
    });
    return field;
  }

  const MATH_CATEGORIES = Object.freeze([
    'Pagrindiniai',
    'Veiksmai ir palyginimai',
    'Skliaustai',
    'Struktūros',
    'Sistemos',
    'Intervalai',
    'Funkcijos',
    'Analizė',
    'Vektoriai'
  ]);

  const PINNED_MATH_KEYS = Object.freeze([
    { label: '𝑥', action: 'math-mode', aria: 'Matematinis režimas – paversti pažymėtą arba prieš žymeklį esantį fragmentą formule', title: 'Matematinis režimas (Alt+=)' }
  ]);

  const DIRECT_MATH_KEYS = Object.freeze([
    // Pagrindiniai
    { category: 'Pagrindiniai', label: 'x', insert: 'x' },
    { category: 'Pagrindiniai', label: 'y', insert: 'y' },
    { category: 'Pagrindiniai', label: 'z', insert: 'z' },
    { category: 'Pagrindiniai', label: 'a', insert: 'a' },
    { category: 'Pagrindiniai', label: 'b', insert: 'b' },
    { category: 'Pagrindiniai', label: 'n', insert: 'n' },
    { category: 'Pagrindiniai', label: 'π', insert: '\\pi' },
    { category: 'Pagrindiniai', label: 'e', insert: 'e' },
    { category: 'Pagrindiniai', label: 'α', insert: '\\alpha' },
    { category: 'Pagrindiniai', label: 'β', insert: '\\beta' },
    { category: 'Pagrindiniai', label: 'γ', insert: '\\gamma' },
    { category: 'Pagrindiniai', label: 'θ', insert: '\\theta' },
    { category: 'Pagrindiniai', label: 'λ', insert: '\\lambda' },
    { category: 'Pagrindiniai', label: 'μ', insert: '\\mu' },

    // Veiksmai ir palyginimai
    { category: 'Veiksmai ir palyginimai', label: '+', insert: '+' },
    { category: 'Veiksmai ir palyginimai', label: '−', insert: '-' },
    { category: 'Veiksmai ir palyginimai', label: '·', insert: '\\cdot ' },
    { category: 'Veiksmai ir palyginimai', label: ':', insert: ':' },
    { category: 'Veiksmai ir palyginimai', label: '=', insert: '=' },
    { category: 'Veiksmai ir palyginimai', label: '≠', insert: '\\ne ' },
    { category: 'Veiksmai ir palyginimai', label: '<', insert: '<' },
    { category: 'Veiksmai ir palyginimai', label: '>', insert: '>' },
    { category: 'Veiksmai ir palyginimai', label: '≤', insert: '\\le ' },
    { category: 'Veiksmai ir palyginimai', label: '≥', insert: '\\ge ' },
    { category: 'Veiksmai ir palyginimai', label: '≈', insert: '\\approx ' },
    { category: 'Veiksmai ir palyginimai', label: '≡', insert: '\\equiv ' },
    { category: 'Veiksmai ir palyginimai', label: '±', insert: '\\pm ' },
    { category: 'Veiksmai ir palyginimai', label: '∓', insert: '\\mp ' },
    { category: 'Veiksmai ir palyginimai', label: '∝', insert: '\\propto ' },
    { category: 'Veiksmai ir palyginimai', label: '∞', insert: '\\infty' },

    // Skliaustai
    { category: 'Skliaustai', label: '( )', structure: 'parentheses', aria: 'Apvalieji skliaustai' },
    { category: 'Skliaustai', label: '[ ]', structure: 'brackets', aria: 'Laužtiniai skliaustai' },
    { category: 'Skliaustai', label: '{ }', structure: 'braces', aria: 'Figūriniai skliaustai' },
    { category: 'Skliaustai', label: '|x|', structure: 'absolute', aria: 'Modulis' },
    { category: 'Skliaustai', label: '‖x‖', structure: 'norm', aria: 'Norma' },
    { category: 'Skliaustai', label: '⌊x⌋', structure: 'floor', aria: 'Apatinė sveikoji dalis' },
    { category: 'Skliaustai', label: '⌈x⌉', structure: 'ceil', aria: 'Viršutinė sveikoji dalis' },

    // Struktūros
    { category: 'Struktūros', label: 'a⁄b', visual: 'fraction', structure: 'fraction', aria: 'Trupmena' },
    { category: 'Struktūros', label: '√', structure: 'root', aria: 'Kvadratinė šaknis' },
    { category: 'Struktūros', label: 'ⁿ√', visual: 'nth-root', structure: 'nth-root', aria: 'N-tojo laipsnio šaknis' },
    { category: 'Struktūros', label: 'x²', insert: '^2', aria: 'Kvadratas' },
    { category: 'Struktūros', label: 'xⁿ', structure: 'power', aria: 'Laipsnis' },
    { category: 'Struktūros', label: 'xₙ', structure: 'subscript', aria: 'Apatinis indeksas' },
    { category: 'Struktūros', label: '(n k)', visual: 'binomial', structure: 'binomial', aria: 'Binominis koeficientas' },
    { category: 'Struktūros', label: 'x̅', structure: 'overline', aria: 'Brūkšnys virš reiškinio' },

    // Sistemos
    { category: 'Sistemos', label: '⎧2', visual: 'system-2', structure: 'system-2', aria: 'Dviejų lygčių sistema' },
    { category: 'Sistemos', label: '⎧3', visual: 'system-3', structure: 'system-3', aria: 'Trijų lygčių sistema' },
    { category: 'Sistemos', label: '+ lygtis', visual: 'system-add-row', command: 'addRowAfter', mutates: true, requiresArray: true, aria: 'Pridėti lygtį po dabartinės eilutės' },
    { category: 'Sistemos', label: '− lygtis', visual: 'system-remove-row', command: 'removeRow', mutates: true, requiresArray: true, aria: 'Pašalinti dabartinę sistemos eilutę' },

    // Intervalai
    { category: 'Intervalai', label: '(a;b)', structure: 'interval-open', aria: 'Atviras intervalas' },
    { category: 'Intervalai', label: '[a;b]', structure: 'interval-closed', aria: 'Uždaras intervalas' },
    { category: 'Intervalai', label: '(a;b]', structure: 'interval-left-open', aria: 'Kairėje atviras intervalas' },
    { category: 'Intervalai', label: '[a;b)', structure: 'interval-right-open', aria: 'Dešinėje atviras intervalas' },
    { category: 'Intervalai', label: '(−∞;a)', structure: 'interval-minus-infinity', aria: 'Intervalas nuo minus begalybės' },
    { category: 'Intervalai', label: '(a;+∞)', structure: 'interval-plus-infinity', aria: 'Intervalas iki plius begalybės' },
    { category: 'Intervalai', label: '∈', insert: '\\in ' },
    { category: 'Intervalai', label: '∉', insert: '\\notin ' },
    { category: 'Intervalai', label: '∪', insert: '\\cup ' },
    { category: 'Intervalai', label: '∩', insert: '\\cap ' },
    { category: 'Intervalai', label: '⊂', insert: '\\subset ' },
    { category: 'Intervalai', label: '⊆', insert: '\\subseteq ' },
    { category: 'Intervalai', label: '∅', insert: '\\varnothing' },

    // Funkcijos
    { category: 'Funkcijos', label: 'f(x)', structure: 'function-f' },
    { category: 'Funkcijos', label: 'sin', structure: 'sin' },
    { category: 'Funkcijos', label: 'cos', structure: 'cos' },
    { category: 'Funkcijos', label: 'tg', structure: 'tan' },
    { category: 'Funkcijos', label: 'ctg', structure: 'cot' },
    { category: 'Funkcijos', label: 'log', structure: 'log' },
    { category: 'Funkcijos', label: 'ln', structure: 'ln' },
    { category: 'Funkcijos', label: 'eˣ', structure: 'exp' },

    // Analizė
    { category: 'Analizė', label: 'lim', visual: 'limit', structure: 'limit', aria: 'Riba' },
    { category: 'Analizė', label: "f′", structure: 'derivative', aria: 'Pirmoji išvestinė' },
    { category: 'Analizė', label: "f″", structure: 'second-derivative', aria: 'Antroji išvestinė' },
    { category: 'Analizė', label: '∫', structure: 'integral', aria: 'Neapibrėžtinis integralas' },
    { category: 'Analizė', label: '∫ᵃᵇ', visual: 'definite-integral', structure: 'definite-integral', aria: 'Apibrėžtinis integralas' },
    { category: 'Analizė', label: 'Σ', visual: 'sum', structure: 'sum', aria: 'Suma' },
    { category: 'Analizė', label: 'Π', visual: 'product', structure: 'product', aria: 'Sandauga' },
    { category: 'Analizė', label: '∞', insert: '\\infty' },

    // Vektoriai ir matricos
    { category: 'Vektoriai', label: 'a⃗', visual: 'vector', structure: 'vector', aria: 'Vektorius' },
    { category: 'Vektoriai', label: '(x;y)', visual: 'vector-2', structure: 'vector-2', aria: 'Dviejų koordinačių vektorius' },
    { category: 'Vektoriai', label: '(x;y;z)', visual: 'vector-3', structure: 'vector-3', aria: 'Trijų koordinačių vektorius' },
    { category: 'Vektoriai', label: 'a⃗·b⃗', visual: 'dot-product', structure: 'dot-product', aria: 'Skaliarinė sandauga' },
    { category: 'Vektoriai', label: '‖a⃗‖', visual: 'vector-norm', structure: 'vector-norm', aria: 'Vektoriaus modulis' },
    { category: 'Vektoriai', label: 'M₂', visual: 'matrix-2', structure: 'matrix-2', aria: 'Dviejų eilučių ir dviejų stulpelių matrica' },
    { category: 'Vektoriai', label: 'M₃', visual: 'matrix-3', structure: 'matrix-3', aria: 'Trijų eilučių ir trijų stulpelių matrica' },
    { category: 'Vektoriai', label: '|M₂|', visual: 'determinant-2', structure: 'determinant-2', aria: 'Antros eilės determinantė' },
    { category: 'Vektoriai', label: '+ eil.', visual: 'matrix-add-row', command: 'addRowAfter', mutates: true, requiresArray: true, aria: 'Pridėti matricos eilutę' },
    { category: 'Vektoriai', label: '+ st.', visual: 'matrix-add-column', command: 'addColumnAfter', mutates: true, requiresArray: true, aria: 'Pridėti matricos stulpelį' },
    { category: 'Vektoriai', label: '− eil.', visual: 'matrix-remove-row', command: 'removeRow', mutates: true, requiresArray: true, aria: 'Pašalinti matricos eilutę' },
    { category: 'Vektoriai', label: '− st.', visual: 'matrix-remove-column', command: 'removeColumn', mutates: true, requiresArray: true, aria: 'Pašalinti matricos stulpelį' }
  ]);

  const MATH_CONTROL_KEYS = Object.freeze([
    { label: '←', command: 'moveToPreviousChar', aria: 'Žymeklis kairėn' },
    { label: '→', command: 'moveToNextChar', aria: 'Žymeklis dešinėn' },
    { label: '⇤', command: 'moveToPreviousPlaceholder', aria: 'Ankstesnė formulės vieta' },
    { label: '⇥', command: 'moveToNextPlaceholder', aria: 'Kita formulės vieta' },
    { label: '⌫', command: 'deleteBackward', aria: 'Trinti į kairę' },
    { label: '⌦', command: 'deleteForward', aria: 'Trinti į dešinę' },
    { label: '↶', command: 'undo', aria: 'Atšaukti' },
    { label: '↷', command: 'redo', aria: 'Pakartoti' }
  ]);

  function mathStructureTemplate(type, hasSelection) {
    const selected = hasSelection ? '#0' : '#?';
    if (type === 'fraction') return hasSelection ? '\\frac{#0}{#?}' : '\\frac{#?}{#?}';
    if (type === 'root') return `\\sqrt{${selected}}`;
    if (type === 'nth-root') return hasSelection ? '\\sqrt[#?]{#0}' : '\\sqrt[#?]{#?}';
    if (type === 'power') return hasSelection ? '{#0}^{#?}' : '^{#?}';
    if (type === 'subscript') return hasSelection ? '{#0}_{#?}' : '_{#?}';
    if (type === 'binomial') return hasSelection ? '\\binom{#0}{#?}' : '\\binom{#?}{#?}';
    if (type === 'overline') return `\\overline{${selected}}`;
    if (type === 'parentheses') return `\\left(${selected}\\right)`;
    if (type === 'brackets') return `\\left[${selected}\\right]`;
    if (type === 'braces') return `\\left\\{${selected}\\right\\}`;
    if (type === 'absolute') return `\\left|${selected}\\right|`;
    if (type === 'norm') return `\\left\\|${selected}\\right\\|`;
    if (type === 'floor') return `\\left\\lfloor ${selected}\\right\\rfloor`;
    if (type === 'ceil') return `\\left\\lceil ${selected}\\right\\rceil`;
    if (type === 'system-2') return hasSelection
      ? '\\begin{cases}#0\\\\#?\\end{cases}'
      : '\\begin{cases}#?\\\\#?\\end{cases}';
    if (type === 'system-3') return hasSelection
      ? '\\begin{cases}#0\\\\#?\\\\#?\\end{cases}'
      : '\\begin{cases}#?\\\\#?\\\\#?\\end{cases}';
    if (type === 'interval-open') return '\\left(#?;#?\\right)';
    if (type === 'interval-closed') return '\\left[#?;#?\\right]';
    if (type === 'interval-left-open') return '\\left(#?;#?\\right]';
    if (type === 'interval-right-open') return '\\left[#?;#?\\right)';
    if (type === 'interval-minus-infinity') return '\\left(-\\infty;#?\\right)';
    if (type === 'interval-plus-infinity') return '\\left(#?;+\\infty\\right)';
    if (type === 'function-f') return `f\\left(${selected}\\right)`;
    if (type === 'sin') return `\\sin\\left(${selected}\\right)`;
    if (type === 'cos') return `\\cos\\left(${selected}\\right)`;
    if (type === 'tan') return `\\tan\\left(${selected}\\right)`;
    if (type === 'cot') return `\\cot\\left(${selected}\\right)`;
    if (type === 'log') return `\\log_{#?}\\left(${selected}\\right)`;
    if (type === 'ln') return `\\ln\\left(${selected}\\right)`;
    if (type === 'exp') return `e^{${selected}}`;
    if (type === 'limit') return hasSelection
      ? '\\lim_{#?\\to #?}#0'
      : '\\lim_{#?\\to #?}#?';
    if (type === 'derivative') return hasSelection
      ? '\\frac{d}{d#?}\\left(#0\\right)'
      : '\\frac{d}{d#?}\\left(#?\\right)';
    if (type === 'second-derivative') return hasSelection
      ? '\\frac{d^2}{d#?^2}\\left(#0\\right)'
      : '\\frac{d^2}{d#?^2}\\left(#?\\right)';
    if (type === 'integral') return hasSelection
      ? '\\int #0\\,d#?'
      : '\\int #?\\,d#?';
    if (type === 'definite-integral') return hasSelection
      ? '\\int_{#?}^{#?}#0\\,d#?'
      : '\\int_{#?}^{#?}#?\\,d#?';
    if (type === 'sum') return hasSelection
      ? '\\sum_{#?}^{#?}#0'
      : '\\sum_{#?}^{#?}#?';
    if (type === 'product') return hasSelection
      ? '\\prod_{#?}^{#?}#0'
      : '\\prod_{#?}^{#?}#?';
    if (type === 'vector') return `\\vec{${selected}}`;
    if (type === 'vector-2') return '\\begin{pmatrix}#?\\\\#?\\end{pmatrix}';
    if (type === 'vector-3') return '\\begin{pmatrix}#?\\\\#?\\\\#?\\end{pmatrix}';
    if (type === 'dot-product') return '\\vec{#?}\\cdot\\vec{#?}';
    if (type === 'vector-norm') return hasSelection
      ? '\\left\\|\\vec{#0}\\right\\|'
      : '\\left\\|\\vec{#?}\\right\\|';
    if (type === 'matrix-2') return '\\begin{pmatrix}#?&#?\\\\#?&#?\\end{pmatrix}';
    if (type === 'matrix-3') return '\\begin{pmatrix}#?&#?&#?\\\\#?&#?&#?\\\\#?&#?&#?\\end{pmatrix}';
    if (type === 'determinant-2') return '\\begin{vmatrix}#?&#?\\\\#?&#?\\end{vmatrix}';
    return '';
  }

  function insertIntoDirectMathField(field, key) {
    const target = field?.isConnected ? field : resolveActiveMathField();
    if (!target) {
      clearMathEditSession();
      showToast('Pirmiausia pasirink matematinį lauką pratybose arba mišriame tekste');
      return;
    }
    const savedSelection = captureMathFieldSelection(target) || mathSelectionByKey.get(mathFieldKey(target));
    try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
    restoreMathFieldSelection(target, savedSelection);
    setActiveDirectMathField(target, target.dataset.mathContext || activeMathContext, { ensureVisible: false });
    const hasSelection = mathSelectionHasContent(savedSelection || target.selection);
    const insert = key.structure ? mathStructureTemplate(key.structure, hasSelection) : key.insert;
    let usedNativeInsert = false;
    try {
      if (key.command && typeof target.executeCommand === 'function') {
        const result = target.executeCommand(key.command);
        if (key.command === 'moveToNextPlaceholder' && result !== true) moveMathPlaceholderOrField(target, 1);
        if (key.command === 'moveToPreviousPlaceholder' && result !== true) moveMathPlaceholderOrField(target, -1);
        if (key.requiresArray && result !== true) {
          showToast('Padėk žymeklį sistemos arba matricos viduje');
        }
        if (key.mutates && result === true) target.__syncDirectMathField?.();
      } else {
        const options = {
          insertionMode: 'replaceSelection',
          selectionMode: key.structure ? 'placeholder' : 'after',
          focus: true,
          scrollIntoView: false,
          format: 'latex'
        };
        if (typeof target.insert === 'function') {
          target.insert(insert, options);
          usedNativeInsert = true;
        } else if (typeof target.executeCommand === 'function') {
          target.executeCommand(['insert', insert, options]);
          usedNativeInsert = true;
        } else {
          const plainFallback = insert
            ?.replace(/\\cdot\s*/g, '*')
            .replace(/\\pi/g, 'π')
            .replace(/\\varnothing/g, '∅')
            .replace(/\\left|\\right/g, '')
            .replace(/\\frac\{#\?\}\{#\?\}/g, '()/()')
            .replace(/\\frac\{#0\}\{#\?\}/g, '()/()')
            .replace(/\\sqrt\{#\?\}/g, 'sqrt()')
            .replace(/#0|#\?/g, '');
          target.textContent = `${target.textContent || ''}${plainFallback || ''}`;
        }
      }
    } catch (_) {}

    // MathLive dispatches its own input event. We update the model directly as well,
    // without emitting a second bubbling input event that the parent contenteditable could misread.
    if (!key.command) target.__syncDirectMathField?.();
    queueMicrotask(() => {
      if (!target.isConnected) return;
      reaffirmMathEditSession(target, target.dataset.mathContext || activeMathContext, { ensureVisible: false });
      captureMathFieldSelection(target);
    });
    requestAnimationFrame(() => {
      if (!target.isConnected) return;
      captureMathFieldSelection(target);
      ensureMathFieldVisible(target);
    });
    if (!usedNativeInsert && !key.command) target.__syncDirectMathField?.();
  }

  function installMathEditingBoundary() {
    document.addEventListener('pointerdown', event => {
      const field = mathFieldFromEvent(event);
      if (field) {
        reaffirmMathEditSession(field, field.dataset.mathContext || activeMathContext, { ensureVisible: false });
        return;
      }
      if (eventTouchesMathToolbar(event)) return;
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

  function mathKeyVisualMarkup(name) {
    const cell = '<i></i>';
    const cells = count => cell.repeat(count);
    const map = {
      'fraction': '<span class="mi mi-fraction" aria-hidden="true"><span>a</span><span>b</span></span>',
      'nth-root': '<span class="mi mi-nth-root" aria-hidden="true"><sup>n</sup><b>√</b><i></i></span>',
      'binomial': '<span class="mi mi-binomial" aria-hidden="true"><b>(</b><span><i>n</i><i>k</i></span><b>)</b></span>',
      'system-2': '<span class="mi mi-system" aria-hidden="true"><b>{</b><span class="mi-system-lines"><i></i><i></i></span></span>',
      'system-3': '<span class="mi mi-system mi-system-3" aria-hidden="true"><b>{</b><span class="mi-system-lines"><i></i><i></i><i></i></span></span>',
      'system-add-row': '<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-system mi-system-small"><b>{</b><span class="mi-system-lines"><i></i><i></i></span></span><em>+</em><small>lygt.</small></span>',
      'system-remove-row': '<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-system mi-system-small"><b>{</b><span class="mi-system-lines"><i></i><i></i></span></span><em>−</em><small>lygt.</small></span>',
      'limit': '<span class="mi mi-limit" aria-hidden="true"><b>lim</b><small>x→a</small></span>',
      'definite-integral': '<span class="mi mi-definite-integral" aria-hidden="true"><b>∫</b><sup>b</sup><sub>a</sub><i>f</i></span>',
      'sum': '<span class="mi mi-large-op" aria-hidden="true"><b>Σ</b><sup>n</sup><sub>i=1</sub></span>',
      'product': '<span class="mi mi-large-op" aria-hidden="true"><b>Π</b><sup>n</sup><sub>i=1</sub></span>',
      'vector': '<span class="mi mi-overarrow" aria-hidden="true"><span>a</span></span>',
      'vector-2': '<span class="mi mi-column-vector" aria-hidden="true"><b>(</b><span><i>x</i><i>y</i></span><b>)</b></span>',
      'vector-3': '<span class="mi mi-column-vector mi-column-vector-3" aria-hidden="true"><b>(</b><span><i>x</i><i>y</i><i>z</i></span><b>)</b></span>',
      'dot-product': '<span class="mi mi-dot-product" aria-hidden="true"><span class="mi-overarrow"><span>a</span></span><b>·</b><span class="mi-overarrow"><span>b</span></span></span>',
      'vector-norm': '<span class="mi mi-vector-norm" aria-hidden="true"><b>‖</b><span class="mi-overarrow"><span>a</span></span><b>‖</b></span>',
      'matrix-2': `<span class="mi mi-matrix mi-matrix-2" aria-hidden="true"><span>${cells(4)}</span></span>`,
      'matrix-3': `<span class="mi mi-matrix mi-matrix-3" aria-hidden="true"><span>${cells(9)}</span></span>`,
      'determinant-2': `<span class="mi mi-matrix mi-determinant mi-matrix-2" aria-hidden="true"><span>${cells(4)}</span></span>`,
      'matrix-add-row': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>+</em><small>eil.</small></span>`,
      'matrix-add-column': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>+</em><small>st.</small></span>`,
      'matrix-remove-row': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>−</em><small>eil.</small></span>`,
      'matrix-remove-column': `<span class="mi mi-action-icon" aria-hidden="true"><span class="mi-matrix mi-matrix-2"><span>${cells(4)}</span></span><em>−</em><small>st.</small></span>`
    };
    return map[name] || '';
  }

  function createUniversalMathButton(key, extraClass = '') {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `math-key${key.structure ? ' is-structure-key' : ''}${key.action === 'math-mode' ? ' is-math-mode-key' : ''}${key.visual ? ' has-rich-icon' : ''}${extraClass ? ` ${extraClass}` : ''}`;
    if (key.visual) {
      button.innerHTML = mathKeyVisualMarkup(key.visual);
      button.dataset.visual = key.visual;
    } else {
      button.textContent = key.label;
    }
    button.setAttribute('aria-label', key.aria || key.label);
    button.title = key.title || key.aria || key.label;
    let pointerHandledAt = 0;
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      pointerHandledAt = performance.now();
      handleUniversalMathKey(key);
    });
    button.addEventListener('click', () => {
      if (performance.now() - pointerHandledAt < 500) return;
      handleUniversalMathKey(key);
    });
    return button;
  }

  function renderUniversalMathKeyboard() {
    const keyboard = refs.universalMathKeyboard;
    if (!keyboard) return;
    keyboard.replaceChildren();
    PINNED_MATH_KEYS.forEach(key => keyboard.appendChild(createUniversalMathButton(key, 'is-pinned-key')));

    const separatorA = document.createElement('span');
    separatorA.className = 'math-key-separator';
    separatorA.setAttribute('aria-hidden', 'true');
    keyboard.appendChild(separatorA);

    DIRECT_MATH_KEYS
      .filter(key => key.category === state.mathToolbarCategory)
      .forEach(key => keyboard.appendChild(createUniversalMathButton(key)));

    const separatorB = document.createElement('span');
    separatorB.className = 'math-key-separator';
    separatorB.setAttribute('aria-hidden', 'true');
    keyboard.appendChild(separatorB);
    MATH_CONTROL_KEYS.forEach(key => keyboard.appendChild(createUniversalMathButton(key, 'is-control-key')));
  }

  function setMathToolbarCategory(category, { save = true } = {}) {
    const next = MATH_CATEGORIES.includes(category) ? category : 'Pagrindiniai';
    state.mathToolbarCategory = next;
    refs.universalMathCategories?.querySelectorAll('.math-category-tab').forEach(tab => {
      const active = tab.dataset.category === next;
      tab.classList.toggle('is-active', active);
      tab.setAttribute('aria-selected', active ? 'true' : 'false');
      tab.tabIndex = active ? 0 : -1;
    });
    renderUniversalMathKeyboard();
    const activeTab = refs.universalMathCategories?.querySelector(`[data-category="${CSS.escape(next)}"]`);
    activeTab?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' });
    if (save) scheduleSave();
  }

  function initializeUniversalMathKeyboard() {
    const categories = refs.universalMathCategories;
    if (categories) {
      categories.replaceChildren();
      MATH_CATEGORIES.forEach(category => {
        const tab = document.createElement('button');
        tab.type = 'button';
        tab.className = 'math-category-tab';
        tab.dataset.category = category;
        tab.textContent = category;
        tab.setAttribute('role', 'tab');
        tab.setAttribute('aria-controls', 'universalMathKeyboard');
        let pointerHandledAt = 0;
        tab.addEventListener('pointerdown', event => {
          event.preventDefault();
          pointerHandledAt = performance.now();
          setMathToolbarCategory(category);
        });
        tab.addEventListener('click', () => {
          if (performance.now() - pointerHandledAt < 500) return;
          setMathToolbarCategory(category);
        });
        tab.addEventListener('keydown', event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const current = MATH_CATEGORIES.indexOf(state.mathToolbarCategory);
          let index = current;
          if (event.key === 'ArrowLeft') index = (current - 1 + MATH_CATEGORIES.length) % MATH_CATEGORIES.length;
          if (event.key === 'ArrowRight') index = (current + 1) % MATH_CATEGORIES.length;
          if (event.key === 'Home') index = 0;
          if (event.key === 'End') index = MATH_CATEGORIES.length - 1;
          setMathToolbarCategory(MATH_CATEGORIES[index]);
          refs.universalMathCategories?.querySelector(`[data-category="${CSS.escape(MATH_CATEGORIES[index])}"]`)?.focus({ preventScroll: true });
        });
        categories.appendChild(tab);
      });
    }
    if (!MATH_CATEGORIES.includes(state.mathToolbarCategory)) state.mathToolbarCategory = 'Pagrindiniai';
    setMathToolbarCategory(state.mathToolbarCategory, { save: false });
    clearMathEditSession();
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
    const descriptors = normalized.values.map(value => {
      const equation = parseEquation(value);
      return linearOnly ? describeLinearEquation(equation) : describePolynomialEquation(equation);
    });
    return { descriptor: unionEquationDescriptors(descriptors), descriptors };
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

  function validateEquationChain(task, response) {
    const steps = trimStructuredSteps(response.steps);
    if (!steps.length) {
      return { status: 'incorrect', title: 'Nėra sprendimo žingsnių', message: 'Įrašyk bent vieną naują lygtį.', stepResults: [] };
    }

    const stepResults = [];
    let previousEquation;
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
      try {
        if (step.type === 'alternatives') {
          descriptor = parseAlternativeDescriptor(step, true).descriptor;
        } else {
          const source = step.values[0];
          if (/\b(?:arba|ar)\b/i.test(source)) throw new Error('Viename laukelyje rašyk vieną lygtį. Alternatyvoms pasirink atskirų laukelių žingsnį.');
          equation = parseEquation(source);
          descriptor = describeLinearEquation(equation);
        }
      } catch (error) {
        stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
        return { status: 'incorrect', title: `Nepavyko perskaityti ${index + 1} žingsnio`, message: friendlyParseError(error), stepResults };
      }

      if (!sameLinearSolutionSet(previousDescriptor, descriptor)) {
        stepResults[index] = { status: 'incorrect', message: 'Šis žingsnis nebeturi tos pačios sprendinių aibės kaip ankstesnis.' };
        return {
          status: 'incorrect',
          title: `Pirmoji klaida – ${index + 1} žingsnyje`,
          message: explainEquationMismatch(previousDescriptor, descriptor),
          stepResults
        };
      }
      stepResults[index] = { status: 'correct', message: step.type === 'alternatives' ? 'Alternatyvų bendra sprendinių aibė išsaugota.' : 'Sprendinių aibė išsaugota.' };
      previousDescriptor = descriptor;
      if (equation && targetDescriptor.kind === 'single' && isVariableIsolated(equation, task.response.options.expectedVariable || 'x', targetDescriptor.value)) completed = true;
      if (step.type === 'alternatives' && alternativesAreIsolatedRoots(step, targetDescriptor)) completed = true;
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
      message: `Visi įvesti žingsniai išlaiko tą pačią sprendinių aibę, o galutinis atsakymas yra ${expectedVariable} = ${expectedDisplay}.`,
      stepResults
    };
  }


  function validateQuadraticEquationChain(task, response) {
    const steps = trimStructuredSteps(response.steps);
    if (!steps.length) {
      return { status: 'incorrect', title: 'Nėra sprendimo žingsnių', message: 'Įrašyk bent vieną naują lygtį.', stepResults: [] };
    }

    const stepResults = [];
    let targetDescriptor;
    let previousDescriptor;
    try {
      const initialEquation = parseEquation(task.response.options.initial || task.prompt?.value);
      targetDescriptor = describePolynomialEquation(initialEquation);
      previousDescriptor = targetDescriptor;
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
          continue;
        } catch (error) {
          stepResults[index] = { status: 'incorrect', message: friendlyParseError(error) };
          return { status: 'incorrect', title: 'Nepavyko perskaityti galutinio atsakymo', message: friendlyParseError(error), stepResults };
        }
      }

      let descriptor;
      let equation = null;
      try {
        if (step.type === 'alternatives') {
          descriptor = parseAlternativeDescriptor(step, false).descriptor;
        } else {
          const source = step.values[0];
          if (/\b(?:arba|ar)\b/i.test(source)) throw new Error('Viename laukelyje rašyk vieną lygtį. Šiam žingsniui pasirink „Sprendimo šakos“.');
          equation = parseEquation(source);
          descriptor = describePolynomialEquation(equation);
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

      stepResults[index] = {
        status: 'correct',
        message: step.type === 'alternatives' ? 'Alternatyvų bendra sprendinių aibė išsaugota.' : 'Sprendinių aibė išsaugota.'
      };
      previousDescriptor = descriptor;
      if (equation && descriptorIsSingleRoot(targetDescriptor) && isVariableIsolated(equation, 'x', descriptorRoots(targetDescriptor)[0])) completed = true;
      if (step.type === 'alternatives' && alternativesAreIsolatedRoots(step, targetDescriptor)) completed = true;
    }

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
      status: 'correct',
      title: 'Sprendimas teisingas',
      message: `Visi įvesti žingsniai išlaiko tą pačią sprendinių aibę. Galutinis rezultatas: ${formatSolutionDescriptor(targetDescriptor)}.`,
      stepResults
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

  function friendlyParseError(error) {
    return String(error?.message || error || 'Nežinoma klaida').replace(/^Parse error:\s*/i, '');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
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
        if (validator !== analysis.validator) {
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
    const equationMode = refs.editorPromptKind.value === 'equation' || ['linear-equation-chain', 'quadratic-equation-chain'].includes(refs.editorValidator.value);
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
        valueType: ['linear-equation-chain', 'quadratic-equation-chain'].includes(validator) ? 'equation' : 'expression',
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

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
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

  function safeString(value, fallback = '') {
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : fallback;
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

  function applyBoardCamera(options = {}) {
    state.camera = normalizeCamera(state.camera);
    const oldZoom = Number(options.oldZoom) || currentBoardZoom();
    const zoom = currentBoardZoom();
    const viewportWidth = Math.max(1, refs.board.clientWidth);
    const viewportHeight = Math.max(1, refs.board.clientHeight);
    let anchorWorldX = null;
    let anchorWorldY = null;
    let anchorViewportX = null;
    let anchorViewportY = null;

    if (options.anchorViewportX !== undefined && options.anchorViewportY !== undefined) {
      anchorViewportX = Number(options.anchorViewportX) || 0;
      anchorViewportY = Number(options.anchorViewportY) || 0;
      anchorWorldX = (refs.board.scrollLeft + anchorViewportX) / Math.max(0.001, oldZoom);
      anchorWorldY = (refs.board.scrollTop + anchorViewportY) / Math.max(0.001, oldZoom);
    } else if (options.preserveCenter) {
      anchorViewportX = viewportWidth / 2;
      anchorViewportY = viewportHeight / 2;
      anchorWorldX = (refs.board.scrollLeft + anchorViewportX) / Math.max(0.001, oldZoom);
      anchorWorldY = (refs.board.scrollTop + anchorViewportY) / Math.max(0.001, oldZoom);
    }

    const world = getBoardWorldRect();
    refs.boardWorld.style.width = `${world.width}px`;
    refs.boardWorld.style.height = `${world.height}px`;
    // Chromium CSS zoom perskaičiuoja MathLive geometriją prieš piešimą. Tai nepalieka
    // trupmeninio transformavimo siūlių ties ištempiamu šaknies ženklu.
    const useLayoutZoom = Boolean(window.CSS?.supports?.('zoom', '1'));
    refs.boardWorld.dataset.cameraScaleMode = useLayoutZoom ? 'layout-zoom' : 'transform';
    refs.boardWorld.style.zoom = useLayoutZoom ? String(zoom) : '';
    refs.boardWorld.style.transform = useLayoutZoom ? 'none' : `scale(${zoom})`;
    refs.boardStage.style.width = `${Math.max(viewportWidth, Math.round(world.width * zoom))}px`;
    refs.boardStage.style.height = `${Math.max(viewportHeight, Math.round(world.height * zoom))}px`;
    refs.boardZoomLabel.textContent = `${Math.round(zoom * 100)} %`;

    cameraApplying = true;
    requestAnimationFrame(() => {
      if (anchorWorldX !== null && anchorWorldY !== null) {
        refs.board.scrollLeft = Math.max(0, anchorWorldX * zoom - anchorViewportX);
        refs.board.scrollTop = Math.max(0, anchorWorldY * zoom - anchorViewportY);
      } else if (options.restoreScroll) {
        refs.board.scrollLeft = Math.max(0, Number(state.camera.scrollLeft) || 0);
        refs.board.scrollTop = Math.max(0, Number(state.camera.scrollTop) || 0);
      }
      state.camera.scrollLeft = refs.board.scrollLeft;
      state.camera.scrollTop = refs.board.scrollTop;
      cameraApplying = false;
      layoutBoardObjects();
      refreshMathFieldRendering(refs.boardWorld);
      if (state.practiceOnly?.active) refreshMathFieldRendering(refs.practiceOnlyHost);
    });
  }

  function setBoardZoom(value, options = {}) {
    const oldZoom = currentBoardZoom();
    state.camera.zoom = clampCameraZoom(value);
    applyBoardCamera({ ...options, oldZoom });
    scheduleSave();
  }

  function fitWholeBoard() {
    const world = getBoardWorldRect();
    const availableWidth = Math.max(1, refs.board.clientWidth - 30);
    const availableHeight = Math.max(1, refs.board.clientHeight - 30);
    state.camera.zoom = clampCameraZoom(Math.min(availableWidth / world.width, availableHeight / world.height));
    applyBoardCamera();
    requestAnimationFrame(() => {
      refs.board.scrollLeft = 0;
      refs.board.scrollTop = 0;
      state.camera.scrollLeft = 0;
      state.camera.scrollTop = 0;
      scheduleSave();
    });
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
    refs.boardZoomOutButton.addEventListener('click', () => setBoardZoom(currentBoardZoom() - 0.1, { preserveCenter: true }));
    refs.boardZoomInButton.addEventListener('click', () => setBoardZoom(currentBoardZoom() + 0.1, { preserveCenter: true }));
    refs.boardZoomActualButton.addEventListener('click', () => setBoardZoom(1, { preserveCenter: true }));
    refs.boardZoomFitButton.addEventListener('click', fitWholeBoard);
    refs.boardFocusObjectButton.addEventListener('click', focusActiveBoardObject);
    refs.practiceOnlyButton.addEventListener('click', () => enterPracticeOnly());
    refs.exitPracticeOnlyButton.addEventListener('click', exitPracticeOnly);

    refs.board.addEventListener('scroll', () => {
      if (cameraApplying) return;
      state.camera.scrollLeft = refs.board.scrollLeft;
      state.camera.scrollTop = refs.board.scrollTop;
      clearTimeout(cameraScrollTimer);
      cameraScrollTimer = window.setTimeout(scheduleSave, 140);
    }, { passive: true });

    refs.board.addEventListener('wheel', event => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const rect = refs.board.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.1 : 0.9;
      setBoardZoom(currentBoardZoom() * factor, {
        anchorViewportX: event.clientX - rect.left,
        anchorViewportY: event.clientY - rect.top
      });
    }, { passive: false });

    let pan = null;
    const touchPoints = new Map();
    let pinch = null;
    const isBoardBackground = target => target === refs.board || target === refs.boardStage || target === refs.boardWorld || target === refs.canvas || target === refs.objectsLayer;
    refs.board.addEventListener('pointerdown', event => {
      if (event.pointerType !== 'touch' || state.activeTool !== 'select' || state.practiceOnly?.active) return;
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
      if (!touchPoints.has(event.pointerId)) return;
      touchPoints.set(event.pointerId, { x: event.clientX, y: event.clientY });
      if (touchPoints.size >= 2 && pinch) {
        event.preventDefault();
        const points = [...touchPoints.values()].slice(0, 2);
        const distance = Math.max(20, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y));
        setBoardZoom(pinch.zoom * distance / pinch.distance, { anchorViewportX: pinch.midX, anchorViewportY: pinch.midY });
      } else if (pan && pan.pointerId === event.pointerId) {
        event.preventDefault();
        refs.board.scrollLeft = pan.left - (event.clientX - pan.startX);
        refs.board.scrollTop = pan.top - (event.clientY - pan.startY);
      }
    }, { capture: true, passive: false });
    const endTouch = event => {
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

  function resizeCanvas() {
    const rect = getBoardWorldRect();
    const dpr = Math.max(1, Math.min(1.5, window.devicePixelRatio || 1));
    if (Math.round(rect.width) === lastCanvasSize.width && Math.round(rect.height) === lastCanvasSize.height) return;
    lastCanvasSize = { width: Math.round(rect.width), height: Math.round(rect.height) };
    refs.canvas.width = Math.max(1, Math.round(rect.width * dpr));
    refs.canvas.height = Math.max(1, Math.round(rect.height * dpr));
    refs.canvas.style.width = `${rect.width}px`;
    refs.canvas.style.height = `${rect.height}px`;
    drawingContext = refs.canvas.getContext('2d');
    drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawingContext.lineCap = 'round';
    drawingContext.lineJoin = 'round';
    redrawCanvas();
    clampWindowToBoard();
  }

  function pointFromEvent(event) {
    const rect = refs.canvas.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) };
  }

  function createStrokeId() {
    return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function emitLiveStroke(phase, stroke = activeStroke) {
    if (!stroke) return;
    window.dispatchEvent(new CustomEvent('p772:live-stroke', {
      detail: { phase, stroke: deepClone(stroke) }
    }));
  }

  function startDrawing(event) {
    if (!['pen', 'eraser'].includes(state.activeTool)) return;
    event.preventDefault();
    refs.canvas.setPointerCapture(event.pointerId);
    drawingActive = true;
    activeStroke = {
      id: createStrokeId(),
      mode: state.activeTool,
      width: state.activeTool === 'eraser' ? 22 : 2.6,
      points: [pointFromEvent(event)]
    };
    redrawCanvas();
    emitLiveStroke('start');
  }

  function continueDrawing(event) {
    if (!drawingActive || !activeStroke) return;
    event.preventDefault();
    activeStroke.points.push(pointFromEvent(event));
    redrawCanvas();
    emitLiveStroke('update');
  }

  function stopDrawing(event) {
    if (!drawingActive || !activeStroke) return;
    const committedStroke = activeStroke;
    drawingActive = false;
    activeStroke = null;
    state.drawing.push(committedStroke);
    redrawCanvas();
    emitLiveStroke('end', committedStroke);
    try { refs.canvas.releasePointerCapture(event.pointerId); } catch (_) { /* nieko */ }
    scheduleSave();
  }

  function redrawCanvas() {
    if (!drawingContext) return;
    const rect = getBoardWorldRect();
    drawingContext.clearRect(0, 0, rect.width, rect.height);
    for (const stroke of state.drawing) drawStroke(stroke);
    for (const stroke of remoteLiveStrokes) drawStroke(stroke);
    if (activeStroke) drawStroke(activeStroke);
  }

  function drawStroke(stroke) {
    if (!drawingContext || !stroke.points.length) return;
    const rect = getBoardWorldRect();
    drawingContext.save();
    drawingContext.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';
    drawingContext.strokeStyle = '#27364f';
    drawingContext.lineWidth = stroke.width;
    drawingContext.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * rect.width;
      const y = point.y * rect.height;
      if (index === 0) drawingContext.moveTo(x, y); else drawingContext.lineTo(x, y);
    });
    if (stroke.points.length === 1) drawingContext.lineTo(stroke.points[0].x * rect.width + 0.01, stroke.points[0].y * rect.height + 0.01);
    drawingContext.stroke();
    drawingContext.restore();
  }

  function mixedEditorFromNode(node) {
    return node instanceof Element ? node.closest?.('.mixed-editor-content') || null : node?.parentElement?.closest?.('.mixed-editor-content') || null;
  }

  function mixedFormulaWrapperFromNode(node) {
    return node instanceof Element
      ? node.closest?.('.mixed-inline-formula') || null
      : node?.parentElement?.closest?.('.mixed-inline-formula') || null;
  }

  function directMathFieldHasDomFocus(field) {
    if (!field?.isConnected) return false;
    try { return document.activeElement === field || field.matches(':focus-within'); } catch (_) { return document.activeElement === field; }
  }

  function currentMixedTextRange(editor) {
    if (!editor?.isConnected) return null;
    const selection = window.getSelection?.();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    if (mixedFormulaWrapperFromNode(range.commonAncestorContainer)) return null;
    try { return range.cloneRange(); } catch (_) { return null; }
  }

  function deactivateMathForMixedTextRange(editor, range = null) {
    const textRange = range?.cloneRange?.() || currentMixedTextRange(editor);
    if (!textRange) return false;
    if (activeDirectMathField) clearMathEditSession();
    try { savedMixedTextRange = textRange.cloneRange(); } catch (_) { savedMixedTextRange = null; }
    updateMathToolbarUi();
    return true;
  }

  function setActiveMixedTextEditor(editor, options = {}) {
    const next = editor?.isConnected ? editor : null;
    if (activeMixedTextEditor && activeMixedTextEditor !== next) activeMixedTextEditor.closest('.board-note')?.classList.remove('is-mixed-editing');
    activeMixedTextEditor = next;
    if (next) {
      next.closest('.board-note')?.classList.add('is-mixed-editing');
      const noteId = next.closest('.board-note')?.dataset.noteId;
      if (noteId) setActiveBoardObject('note', noteId, { save: options.save !== false });
    }
    updateMathToolbarUi();
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

  function appendMixedNode(nodes, node) {
    if (node.type === 'text') {
      const text = String(node.text || '').replace(/\u200B/g, '');
      const previous = nodes[nodes.length - 1];
      if (previous?.type === 'text') previous.text += text;
      else nodes.push({ type: 'text', text });
      return;
    }
    if (node.type === 'break') {
      if (nodes[nodes.length - 1]?.type !== 'break') nodes.push({ type: 'break' });
      return;
    }
    nodes.push(node);
  }

  function mixedNodesFromEditor(editor) {
    const nodes = [];
    const walk = parent => {
      [...parent.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          appendMixedNode(nodes, { type: 'text', text: child.nodeValue || '' });
          return;
        }
        if (!(child instanceof Element)) return;
        if (child.matches('.mixed-inline-formula')) {
          const field = child.querySelector('math-field.direct-math-field');
          appendMixedNode(nodes, {
            type: 'formula',
            id: String(child.dataset.formulaNodeId || `mixed-formula-${Date.now()}`),
            value: field ? readDirectMathField(field) : String(child.dataset.value || ''),
            latex: field ? readDirectMathLatex(field) : String(child.dataset.latex || '')
          });
          return;
        }
        if (child.tagName === 'BR') {
          appendMixedNode(nodes, { type: 'break' });
          return;
        }
        const isBlock = ['DIV', 'P'].includes(child.tagName);
        if (isBlock && nodes.length && nodes[nodes.length - 1]?.type !== 'break') appendMixedNode(nodes, { type: 'break' });
        walk(child);
        if (isBlock && nodes[nodes.length - 1]?.type !== 'break') appendMixedNode(nodes, { type: 'break' });
      });
    };
    walk(editor);
    while (nodes.length > 1 && nodes[nodes.length - 1]?.type === 'break') nodes.pop();
    return normalizeMixedContentNodes(nodes);
  }

  function saveMixedNoteFromEditor(note, editor) {
    if (!note || !editor?.isConnected) return;
    note.nodes = mixedNodesFromEditor(editor);
    note.width = Math.max(250, Math.min(900, editor.closest('.board-note')?.offsetWidth || note.width || 420));
    note.minHeight = Math.max(82, Math.min(700, editor.closest('.board-note')?.offsetHeight || note.minHeight || 118));
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
    const adjacent = adjacentMixedFormula(editor, range, -1);
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

  function handleUniversalMathKey(key) {
    const editor = activeMixedTextEditor?.isConnected ? activeMixedTextEditor : null;
    if (key.action === 'math-mode') {
      activateExplicitMathMode(editor);
      return;
    }
    const textRange = editor ? currentMixedTextRange(editor) : null;
    let field = null;
    if (editor && textRange && (key.insert || key.structure)) {
      deactivateMathForMixedTextRange(editor, textRange);
      field = resolveMixedMathTarget(editor, { allowEmpty: true });
    } else {
      field = resolveActiveMathField();
      if (!field && editor && (key.insert || key.structure)) field = resolveMixedMathTarget(editor, { allowEmpty: true });
    }
    if (!field) {
      showToast(editor ? 'Pasirink matematinį simbolį ar struktūrą' : 'Pirmiausia aktyvuok teksto arba matematinį lauką');
      return;
    }
    insertIntoDirectMathField(field, key);
  }

  function installMixedTextEditing() {
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection?.();
      if (!selection?.rangeCount) return;
      const editor = mixedEditorFromNode(selection.anchorNode);
      if (!editor) return;
      setActiveMixedTextEditor(editor, { save: false });
      captureMixedTextSelection(editor);
    });
    document.addEventListener('pointerdown', event => {
      const path = eventComposedPath(event);
      const editor = path.map(node => mixedEditorFromNode(node)).find(Boolean) || null;
      if (editor) {
        setActiveMixedTextEditor(editor, { save: false });
        const touchesFormula = path.some(node => mixedFormulaWrapperFromNode(node));
        if (!touchesFormula && activeDirectMathField) clearMathEditSession();
        return;
      }
      if (eventTouchesMathToolbar(event)) return;
      setActiveMixedTextEditor(null, { save: false });
    }, true);
    document.addEventListener('focusin', event => {
      const editor = mixedEditorFromNode(event.target);
      if (!editor) return;
      setActiveMixedTextEditor(editor, { save: false });
      if (!mathFieldFromEvent(event) && !mixedFormulaWrapperFromNode(event.target)) captureMixedTextSelection(editor);
    }, true);
    document.addEventListener('keydown', event => {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey
        && (event.key === '=' || event.code === 'Equal');
      if (!isShortcut || eventOriginatesInDirectMathField(event)) return;
      const editor = mixedEditorFromNode(event.target) || (activeMixedTextEditor?.isConnected ? activeMixedTextEditor : null);
      if (!editor) return;
      event.preventDefault();
      event.stopPropagation();
      setActiveMixedTextEditor(editor, { save: false });
      activateExplicitMathMode(editor);
    }, true);
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
    const objectHeight = 118;
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
      minHeight: objectHeight
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
      element.style.width = `${Math.max(250, Math.min(900, note.width || 420))}px`;
      element.style.minHeight = `${Math.max(82, Math.min(700, note.minHeight || 118))}px`;

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

      editor.addEventListener('input', event => {
        setActiveMixedTextEditor(editor, { save: false });
        if (eventOriginatesInDirectMathField(event)) return;
        captureMixedTextSelection(editor);
        saveMixedNoteFromEditor(note, editor);
      });
      editor.addEventListener('pointerdown', event => {
        event.stopPropagation();
        setActiveMixedTextEditor(editor, { save: false });
        if (eventOriginatesInDirectMathField(event)) return;
        if (activeDirectMathField) clearMathEditSession();
        requestAnimationFrame(() => captureMixedTextSelection(editor));
      });
      editor.addEventListener('focusin', () => setActiveMixedTextEditor(editor, { save: false }));
      editor.addEventListener('keyup', event => {
        if (!eventOriginatesInDirectMathField(event)) captureMixedTextSelection(editor);
      });
      editor.addEventListener('mouseup', event => {
        if (!eventOriginatesInDirectMathField(event)) captureMixedTextSelection(editor);
      });
      let lastSmartMathTrigger = { character: '', at: 0 };
      editor.addEventListener('keydown', event => {
        if (eventOriginatesInDirectMathField(event)) return;
        const textRange = currentMixedTextRange(editor);
        if (textRange) deactivateMathForMixedTextRange(editor, textRange);
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
          event.preventDefault();
          insertFormulaIntoMixedEditor(editor);
          return;
        }
        if (handleMixedFormulaBoundaryKey(editor, event)) return;
        if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing && typedMathKey(event.key)) {
          if (trySmartMathTrigger(editor, event.key)) {
            event.preventDefault();
            lastSmartMathTrigger = { character: event.key, at: performance.now() };
          }
        }
      });
      editor.addEventListener('beforeinput', event => {
        if (eventOriginatesInDirectMathField(event)) return;
        const textRange = currentMixedTextRange(editor);
        if (textRange) deactivateMathForMixedTextRange(editor, textRange);
        if (event.inputType !== 'insertText' || !typedMathKey(event.data)) return;
        if (lastSmartMathTrigger.character === event.data && performance.now() - lastSmartMathTrigger.at < 120) {
          event.preventDefault();
          return;
        }
        if (trySmartMathTrigger(editor, event.data)) event.preventDefault();
      });

      element.append(handle, editor, remove);
      element.addEventListener('pointerdown', () => setActiveBoardObject('note', note.id));
      element.addEventListener('focusin', () => setActiveBoardObject('note', note.id));
      makeBoardObjectDraggable(element, note, handle, { alwaysAllow: true });
      const resizeObserver = new ResizeObserver(() => {
        if (!element.isConnected) return;
        note.width = Math.max(250, Math.min(900, element.offsetWidth));
        note.minHeight = Math.max(82, Math.min(700, element.offsetHeight));
      });
      resizeObserver.observe(element);
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
    const boardRect = getBoardWorldRect();
    if (!boardRect.width || !boardRect.height) return;
    for (const note of state.notes) {
      const element = refs.objectsLayer.querySelector(`[data-note-id="${note.id}"]`);
      if (!element) continue;
      const width = Math.min(boardRect.width, Math.max(250, Math.min(900, note.width || element.offsetWidth || 420)));
      element.style.width = `${width}px`;
      element.style.minHeight = `${Math.max(82, Math.min(700, note.minHeight || 118))}px`;
      const left = Math.max(0, Math.min(boardRect.width - width, note.x * boardRect.width));
      const top = Math.max(0, Math.min(boardRect.height - element.offsetHeight, note.y * boardRect.height));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      note.x = boardRect.width ? left / boardRect.width : note.x;
      note.y = boardRect.height ? top / boardRect.height : note.y;
    }
    for (const instance of state.boardPractices) {
      const element = refs.objectsLayer.querySelector(`[data-board-practice-id="${instance.id}"]`);
      if (!element) continue;
      const rect = boardPracticePixelRect(instance, boardRect);
      const width = rect.width;
      const height = instance.collapsed ? element.offsetHeight : rect.height;
      element.style.width = `${width}px`;
      if (!instance.collapsed) element.style.height = `${height}px`; else element.style.removeProperty('height');
      const left = Math.max(0, Math.min(boardRect.width - width, instance.x * boardRect.width));
      const top = Math.max(0, Math.min(boardRect.height - height, instance.y * boardRect.height));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      instance.x = boardRect.width ? left / boardRect.width : instance.x;
      instance.y = boardRect.height ? top / boardRect.height : instance.y;
      applyPracticePageScale(element, instance);
    }

    for (const instance of state.boardTasks) {
      const element = refs.objectsLayer.querySelector(`[data-board-task-id="${instance.id}"]`);
      if (!element) continue;
      const width = Math.min(boardRect.width, Math.max(330, Math.min(680, instance.width * boardRect.width)));
      const height = instance.collapsed ? element.offsetHeight : Math.min(boardRect.height, Math.max(300, Math.min(760, instance.height * boardRect.height)));
      element.style.width = `${width}px`;
      if (!instance.collapsed) element.style.height = `${height}px`; else element.style.removeProperty('height');
      const left = Math.max(0, Math.min(boardRect.width - width, instance.x * boardRect.width));
      const top = Math.max(0, Math.min(boardRect.height - height, instance.y * boardRect.height));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      instance.x = boardRect.width ? left / boardRect.width : instance.x;
      instance.y = boardRect.height ? top / boardRect.height : instance.y;
    }
  }

  function makeBoardObjectDraggable(element, model, handle, options = {}) {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      if (state.practiceOnly?.active) return;
      if (state.activeTool !== 'select' && !options.alwaysAllow) return;
      if (options.requireInactiveEditor && document.activeElement === element) return;
      if (!options.requireInactiveEditor) event.preventDefault();
      drag = { startX: event.clientX, startY: event.clientY, left: element.offsetLeft, top: element.offsetTop };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag) return;
      const boardRect = getBoardWorldRect();
      const zoom = currentBoardZoom();
      const left = Math.max(0, Math.min(boardRect.width - element.offsetWidth, drag.left + (event.clientX - drag.startX) / zoom));
      const top = Math.max(0, Math.min(boardRect.height - element.offsetHeight, drag.top + (event.clientY - drag.startY) / zoom));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      model.x = boardRect.width ? left / boardRect.width : 0;
      model.y = boardRect.height ? top / boardRect.height : 0;
    });
    handle.addEventListener('pointerup', event => {
      if (!drag) return;
      drag = null;
      try { handle.releasePointerCapture(event.pointerId); } catch (_) { /* nieko */ }
      scheduleSave();
    });
    handle.addEventListener('pointercancel', () => { drag = null; });
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
    } else if (state.mode === 'student') {
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
      boardTasks: deepClone(state.boardTasks),
      boardPractices: deepClone(state.boardPractices),
      window: deepClone(state.window)
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

  function applyOnlineSharedPart(part, value) {
    if (part === 'drawing') {
      state.drawing = Array.isArray(value) ? value.filter(Boolean) : [];
      ensureSharedIds();
      redrawCanvas();
      return;
    }
    if (part === 'notes') {
      state.notes = migrateMixedNotes(Array.isArray(value) ? value : [], []);
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

  window.P772OnlineBridge = Object.freeze({
    version: 'P2-SPLIT-P1.1',
    setOnlineRole: applyOnlineAccessRole,
    openStudentPreview() {
      window.dispatchEvent(new CustomEvent('p772:open-student-preview'));
    },
    getSharedSnapshot: onlineSharedSnapshot,
    applySharedPart: applyOnlineSharedPart,
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
    renderBoardObjects();
    redrawCanvas();
    setTool('select');
    setMode(onlineAccessRole === 'teacher' ? 'teacher' : 'student', { force: true, allowEmpty: true });
    requestAnimationFrame(() => { centerPracticeWindow(); if (state.mode === 'student') renderTask(); });
    showToast('P7.7.2 būsena, biblioteka, užduotys ir pratybų puslapiai išvalyti');
  });
  refs.canvas.addEventListener('pointerdown', startDrawing);
  refs.canvas.addEventListener('pointermove', continueDrawing);
  refs.canvas.addEventListener('pointerup', stopDrawing);
  refs.canvas.addEventListener('pointercancel', stopDrawing);

  new ResizeObserver(() => { applyBoardCamera({ preserveCenter: true }); resizeCanvas(); layoutBoardObjects(); }).observe(refs.board);
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
