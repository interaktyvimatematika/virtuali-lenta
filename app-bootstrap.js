(() => {
  'use strict';

  // P1.7.9.49-M2.12: siauras programos bootstrap / bendrų helperių sluoksnis.
  // Čia nėra lentos, pratybų ar Firebase elgsenos – tik DOM nuorodų surinkimas
  // ir stateless pagalbinės funkcijos, anksčiau gyvenusios app.js.

  function collectRefs(doc = document) {
    if (!doc) throw new Error('Document objektas nepasiekiamas');
    return {
    board: doc.getElementById('board'),
    boardStage: doc.getElementById('boardCameraStage'),
    boardWorld: doc.getElementById('boardWorld'),
    canvas: doc.getElementById('drawingCanvas'),
    objectsLayer: doc.getElementById('objectsLayer'),
    practiceWindow: doc.getElementById('practiceWindow'),
    dragHandle: doc.getElementById('practiceDragHandle'),
    resizeHandle: doc.getElementById('practiceResizeHandle'),
    collapseButton: doc.getElementById('collapseButton'),
    packageEyebrow: doc.getElementById('packageEyebrow'),
    packageTitle: doc.getElementById('packageTitle'),
    taskCounter: doc.getElementById('taskCounter'),
    scoreLabel: doc.getElementById('scoreLabel'),
    progressFill: doc.getElementById('progressFill'),
    taskNumber: doc.getElementById('taskNumber'),
    taskTitle: doc.getElementById('taskTitle'),
    responseBadge: doc.getElementById('responseBadge'),
    difficultyLabel: doc.getElementById('difficultyLabel'),
    instructionText: doc.getElementById('instructionText'),
    formulaDisplay: doc.getElementById('formulaDisplay'),
    domainNote: doc.getElementById('domainNote'),
    taskCard: doc.querySelector('.task-card'),
    responseHost: doc.getElementById('responseHost'),
    feedback: doc.getElementById('feedback'),
    feedbackIcon: doc.getElementById('feedbackIcon'),
    feedbackTitle: doc.getElementById('feedbackTitle'),
    feedbackText: doc.getElementById('feedbackText'),
    hintBox: doc.getElementById('hintBox'),
    hintText: doc.getElementById('hintText'),
    previousButton: doc.getElementById('previousButton'),
    nextButton: doc.getElementById('nextButton'),
    taskDots: doc.getElementById('taskDots'),
    saveState: doc.getElementById('saveState'),
    addNoteButton: doc.getElementById('addNoteButton'),
    addImageButton: doc.getElementById('addImageButton'),
    boardImageInput: doc.getElementById('boardImageInput'),
    universalMathToolbar: doc.getElementById('universalMathToolbar'),
    universalMathCategories: doc.getElementById('universalMathCategories'),
    universalMathKeyboard: doc.getElementById('universalMathKeyboard'),
    universalMathStatus: doc.getElementById('universalMathStatus'),
    centerPracticeButton: doc.getElementById('centerPracticeButton'),
    practiceOnlyButton: doc.getElementById('practiceOnlyButton'),
    practiceOnlyOverlay: doc.getElementById('practiceOnlyOverlay'),
    practiceOnlyHost: doc.getElementById('practiceOnlyHost'),
    practiceOnlyTitle: doc.getElementById('practiceOnlyTitle'),
    exitPracticeOnlyButton: doc.getElementById('exitPracticeOnlyButton'),
    boardZoomOutButton: doc.getElementById('boardZoomOutButton'),
    boardZoomInButton: doc.getElementById('boardZoomInButton'),
    boardZoomActualButton: doc.getElementById('boardZoomActualButton'),
    boardFocusObjectButton: doc.getElementById('boardFocusObjectButton'),
    boardZoomLabel: doc.getElementById('boardZoomLabel'),
    resetButton: doc.getElementById('resetButton'),
    libraryButton: doc.getElementById('libraryButton'),
    libraryModal: doc.getElementById('libraryModal'),
    closeLibraryButton: doc.getElementById('closeLibraryButton'),
    libraryTasksTab: doc.getElementById('libraryTasksTab'),
    libraryPracticesTab: doc.getElementById('libraryPracticesTab'),
    libraryTasksView: doc.getElementById('libraryTasksView'),
    libraryPracticesView: doc.getElementById('libraryPracticesView'),
    libraryTaskCount: doc.getElementById('libraryTaskCount'),
    libraryPracticeCount: doc.getElementById('libraryPracticeCount'),
    librarySearch: doc.getElementById('librarySearch'),
    libraryClassFilter: doc.getElementById('libraryClassFilter'),
    libraryTopicFilter: doc.getElementById('libraryTopicFilter'),
    libraryTypeFilter: doc.getElementById('libraryTypeFilter'),
    libraryDifficultyFilter: doc.getElementById('libraryDifficultyFilter'),
    libraryStatusFilter: doc.getElementById('libraryStatusFilter'),
    libraryClearFiltersButton: doc.getElementById('libraryClearFiltersButton'),
    libraryResultsLabel: doc.getElementById('libraryResultsLabel'),
    libraryTaskGrid: doc.getElementById('libraryTaskGrid'),
    libraryEmpty: doc.getElementById('libraryEmpty'),
    librarySelectionLabel: doc.getElementById('librarySelectionLabel'),
    libraryInsertSelectedButton: doc.getElementById('libraryInsertSelectedButton'),
    libraryBuildPracticeButton: doc.getElementById('libraryBuildPracticeButton'),
    libraryPracticeList: doc.getElementById('libraryPracticeList'),
    libraryPracticesEmpty: doc.getElementById('libraryPracticesEmpty'),
    toast: doc.getElementById('toast'),
    studentModeButton: doc.getElementById('studentModeButton'),
    teacherModeButton: doc.getElementById('teacherModeButton'),
    authoringBody: doc.getElementById('authoringBody'),
    authoringTaskList: doc.getElementById('authoringTaskList'),
    addTaskButton: doc.getElementById('addTaskButton'),
    duplicateTaskButton: doc.getElementById('duplicateTaskButton'),
    deleteTaskButton: doc.getElementById('deleteTaskButton'),
    testAsStudentButton: doc.getElementById('testAsStudentButton'),
    checkTaskButton: doc.getElementById('checkTaskButton'),
    aiWorkflowButton: doc.getElementById('aiWorkflowButton'),
    aiWorkflowModal: doc.getElementById('aiWorkflowModal'),
    closeAiWorkflowButton: doc.getElementById('closeAiWorkflowButton'),
    aiTeacherRequest: doc.getElementById('aiTeacherRequest'),
    generateAiPromptButton: doc.getElementById('generateAiPromptButton'),
    aiPromptOutput: doc.getElementById('aiPromptOutput'),
    copyAiPromptButton: doc.getElementById('copyAiPromptButton'),
    aiJsonInput: doc.getElementById('aiJsonInput'),
    aiImportMode: doc.getElementById('aiImportMode'),
    aiJsonFileInput: doc.getElementById('aiJsonFileInput'),
    previewAiImportButton: doc.getElementById('previewAiImportButton'),
    applyAiImportButton: doc.getElementById('applyAiImportButton'),
    aiImportStatus: doc.getElementById('aiImportStatus'),
    aiImportPreview: doc.getElementById('aiImportPreview'),
    aiImportSummary: doc.getElementById('aiImportSummary'),
    aiGenerationNotes: doc.getElementById('aiGenerationNotes'),
    aiImportTaskList: doc.getElementById('aiImportTaskList'),
    exportPackageButton: doc.getElementById('exportPackageButton'),
    taskEditorForm: doc.getElementById('taskEditorForm'),
    authoringEditorTitle: doc.getElementById('authoringEditorTitle'),
    packageTitleInput: doc.getElementById('packageTitleInput'),
    packageEyebrowInput: doc.getElementById('packageEyebrowInput'),
    editorTaskTitle: doc.getElementById('editorTaskTitle'),
    editorDifficulty: doc.getElementById('editorDifficulty'),
    editorInstruction: doc.getElementById('editorInstruction'),
    editorPromptKind: doc.getElementById('editorPromptKind'),
    editorPromptValue: doc.getElementById('editorPromptValue'),
    authoringMathPreview: doc.getElementById('authoringMathPreview'),
    editorNote: doc.getElementById('editorNote'),
    editorHint: doc.getElementById('editorHint'),
    editorRenderer: doc.getElementById('editorRenderer'),
    editorValidator: doc.getElementById('editorValidator'),
    editorResponseLabel: doc.getElementById('editorResponseLabel'),
    editorPlaceholder: doc.getElementById('editorPlaceholder'),
    expressionValidatorPanel: doc.getElementById('expressionValidatorPanel'),
    equationValidatorPanel: doc.getElementById('equationValidatorPanel'),
    editorExpectedExpression: doc.getElementById('editorExpectedExpression'),
    editorExpectedExpressionDisplay: doc.getElementById('editorExpectedExpressionDisplay'),
    editorDomain: doc.getElementById('editorDomain'),
    editorSamples: doc.getElementById('editorSamples'),
    editorRequireSimplified: doc.getElementById('editorRequireSimplified'),
    editorInitialEquation: doc.getElementById('editorInitialEquation'),
    editorExpectedVariable: doc.getElementById('editorExpectedVariable'),
    editorExpectedValue: doc.getElementById('editorExpectedValue'),
    editorExpectedValueDisplay: doc.getElementById('editorExpectedValueDisplay'),
    editorMinimumSteps: doc.getElementById('editorMinimumSteps'),
    minimumStepsField: doc.getElementById('minimumStepsField'),
    automaticAnalysisPanel: doc.getElementById('automaticAnalysisPanel'),
    automaticAnalysisTitle: doc.getElementById('automaticAnalysisTitle'),
    automaticAnalysisStatus: doc.getElementById('automaticAnalysisStatus'),
    automaticAnalysisText: doc.getElementById('automaticAnalysisText'),
    automaticAnalysisMath: doc.getElementById('automaticAnalysisMath'),
    qualityGatePanel: doc.getElementById('qualityGatePanel'),
    qualityGateTitle: doc.getElementById('qualityGateTitle'),
    qualityGateStatus: doc.getElementById('qualityGateStatus'),
    qualityGateSummary: doc.getElementById('qualityGateSummary'),
    qualityGateChecklist: doc.getElementById('qualityGateChecklist'),
    equationTechnicalFields: doc.getElementById('equationTechnicalFields'),
    taskJsonPreview: doc.getElementById('taskJsonPreview'),
    copyJsonButton: doc.getElementById('copyJsonButton'),
    authoringValidation: doc.getElementById('authoringValidation'),
    discardEditorChangesButton: doc.getElementById('discardEditorChangesButton'),
    saveTaskToLibraryButton: doc.getElementById('saveTaskToLibraryButton')
  };
  }

  function eventComposedPath(event) {
    try {
      const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
      if (Array.isArray(path) && path.length) return path;
    } catch (_) {}
    return event?.target ? [event.target] : [];
  }

  function friendlyParseError(error) {
    return String(error?.message || error || 'Nežinoma klaida').replace(/^Parse error:\s*/i, '');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[character]));
  }

  function clampNumber(value, min, max, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, Math.min(max, number)) : fallback;
  }

  function safeString(value, fallback = '') {
    return typeof value === 'string' || typeof value === 'number' ? String(value).trim() : fallback;
  }

  function readFileAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error || new Error('Nepavyko perskaityti failo'));
      reader.readAsDataURL(file);
    });
  }

  function loadImageFromDataUrl(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Nepavyko atverti paveikslėlio'));
      image.src = src;
    });
  }

  window.P772AppBootstrap = Object.freeze({
    version: 'P1.7.9.49-M2.12',
    collectRefs,
    eventComposedPath,
    friendlyParseError,
    escapeHtml,
    clampNumber,
    safeString,
    readFileAsDataUrl,
    loadImageFromDataUrl
  });
})();
