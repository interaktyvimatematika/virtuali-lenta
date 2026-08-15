(() => {
  'use strict';

  const BUILD = 'P2-SPLIT-P2.5-P4-P1.7.9.49-M1.1';
  const P2_DATA_SCHEMA_VERSION = 1;
  const STORAGE_KEY = 'p772-p2-split-ui-v1';
  const body = document.body;
  const workspace = document.getElementById('p2Workspace');
  const splitter = document.getElementById('p2Splitter');
  const sidePane = document.getElementById('p2SidePane');
  const studentPanel = document.getElementById('p2StudentPanel');
  const teacherPanel = document.getElementById('p2TeacherPanel');
  const sideTitle = document.getElementById('p2SideTitle');
  const sideKicker = document.getElementById('p2SideKicker');
  const practiceModeButton = document.getElementById('p2PracticeModeButton');
  const userCount = document.getElementById('onlineUsers');
  const presencePill = document.getElementById('p2PresencePill');
  const sideRolePill = document.getElementById('p2SideRolePill');
  const boardPresenceText = document.getElementById('p2BoardPresenceText');
  const brandSubtitle = document.querySelector('.brand span');

  if (!workspace || !splitter || !sidePane || !studentPanel || !teacherPanel) return;

  body.classList.add('p2-shell');
  if (brandSubtitle) {
    brandSubtitle.textContent = 'Interaktyvios pratybos';
    brandSubtitle.title = BUILD;
  }

  const legacyPracticeButton = document.getElementById('practiceOnlyButton');
  if (legacyPracticeButton) legacyPracticeButton.hidden = true;

  // M1.1: built-in lesson data lives in p2-lessons.js. Keeping the same
  // constant names below means the rest of p2-ui.js stays mechanically unchanged.
  const builtInLessons = window.P772BuiltInLessons;
  if (!builtInLessons || !Array.isArray(builtInLessons.LESSON_CATALOG)) {
    console.error('P2 built-in pamokų modulis nerastas');
    return;
  }
  const {
    DEMO_LESSON,
    GRADE5_REVIEW_LESSON,
    GRADE7_REVIEW_LESSON,
    GRADE9_REVIEW_LESSON,
    GRADE10_REVIEW_LESSON,
    GRADE11B_REVIEW_LESSON,
    LESSON_CATALOG
  } = builtInLessons;

  let assignment = null;
  let pendingAttemptPolicy = { defaultMaxAttempts: 3, taskMaxAttempts: {} };
  let progress = null;
  let selectedAnswers = {};

  // P2-SPLIT-P2.5-P2: mokinys yra ilgalaikis objektas, o Room – tik vienos
  // konkrečios pamokos lenta. Čia laikome tik mokytojo mokinių indekso kopiją;
  // tikrasis įrašymas vyksta online-sync.js, atskirai nuo p772Rooms.
  let studentsModal = null;
  let backupRestoreModal = null;
  let backupRestorePreview = null;
  let backupRestoreFileInput = null;
  let scheduleModal = null;
  let editingScheduleId = '';
  let scheduleCreateMode = false;
  let scheduleSelectedDay = 0;
  let scheduleWeekStartKey = '';
  let scheduleSelectedDateKey = '';
  let editingScheduleDateKey = '';
  // P1.7.5.6: kuriant pamoką iš mokinio kortelės atidaromas tas pats
  // scheduleEntry redaktorius, tik mokinys iš anksto pažymimas. Jokios atskiros
  // „mokinio kortelės pamokos“ struktūros nebėra.
  let scheduleCreatePreset = null;
  let selectedStudentId = null;
  let studentSearchQuery = '';
  let studentGradeFilter = 'all';
  let studentCreateOpen = false;
  let studentEditOpen = false;
  let expandedStudentHistoryRoomId = '';
  const studentRoomHistoryCache = new Map();
  const studentRoomHistoryRequestTimers = new Map();
  const STUDENT_HISTORY_TIMEOUT_MS = 6500;
  let studentDbSnapshotTimer = null;
  let teacherStudentDb = { profileId: '', meta: {}, students: {}, roomLinks: {}, classSessions: {}, scheduleEntries: {}, scheduleRuns: {} };
  let roomStudentProfile = null;
  let lessonStudentTabs = null;
  let roomSwitching = false;

  function lessonForId(lessonId) {
    const id = String(lessonId || '').trim();
    return LESSON_CATALOG.find(lesson => lesson.id === id) || null;
  }

  function contentHash(value) {
    const text = JSON.stringify(value ?? null);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
  }

  function lessonContentSnapshot(lesson) {
    if (!lesson) return null;
    const snapshot = {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      lessonId: String(lesson.id || ''),
      contentVersion: Math.max(1, Math.round(Number(lesson.contentVersion) || 1)),
      title: String(lesson.title || ''),
      shortTitle: String(lesson.shortTitle || lesson.title || ''),
      description: String(lesson.description || ''),
      taskCount: Math.max(0, Number(lesson.taskCount) || 0),
      classCount: Math.max(0, Number(lesson.classCount) || 0),
      selfCount: Math.max(0, Number(lesson.selfCount) || 0),
      taskIds: Array.isArray(lesson.tasks) ? lesson.tasks.map(task => String(task?.id || '')).filter(Boolean) : [],
      tasks: Array.isArray(lesson.tasks) ? JSON.parse(JSON.stringify(lesson.tasks)) : []
    };
    snapshot.contentHash = contentHash(snapshot);
    return snapshot;
  }

  function assignmentContentDetail(lesson) {
    const snapshot = lessonContentSnapshot(lesson);
    return snapshot ? {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      contentVersion: snapshot.contentVersion,
      contentHash: snapshot.contentHash,
      taskIds: snapshot.taskIds,
      contentSnapshot: snapshot
    } : { schemaVersion: P2_DATA_SCHEMA_VERSION };
  }

  // P1.7.3.1: senų, dar iki turinio versijavimo pradėtų priskyrimų backfill.
  // Čia tik paruošiame katalogo metaduomenis; realų Firebase įrašymą ir
  // saugumo patikras atlieka online-sync.js. Vieną Room per puslapio sesiją
  // siunčiame daugiausia vieną kartą, kad profile onValue nesukeltų ciklo.
  const legacyAssignmentBackfillQueuedRooms = new Set();

  function queueLegacyAssignmentBackfills() {
    if (role() !== 'teacher') return;
    for (const [studentId, student] of Object.entries(teacherStudentDb.students || {})) {
      const lessons = student?.lessons && typeof student.lessons === 'object' ? student.lessons : {};
      for (const [roomId, recordRaw] of Object.entries(lessons)) {
        const record = recordRaw && typeof recordRaw === 'object' ? recordRaw : {};
        const lesson = lessonForId(record.lessonId);
        if (!lesson) continue;
        const linkedStudentId = String(teacherStudentDb.roomLinks?.[roomId]?.studentId || '').trim();
        if (linkedStudentId && linkedStudentId !== studentId) continue;
        const currentKey = String(record.currentAssignmentKey || record.assignmentKey || '').trim();
        const archived = currentKey && record.assignments && typeof record.assignments === 'object'
          ? record.assignments[currentKey]
          : null;
        const missingMetadata = !record.schemaVersion
          || !currentKey
          || !record.contentVersion
          || !record.contentHash
          || !Array.isArray(record.taskIds)
          || !record.taskIds.length
          || !archived
          || typeof archived !== 'object'
          || !archived.contentSnapshot;
        if (!missingMetadata || legacyAssignmentBackfillQueuedRooms.has(roomId)) continue;
        legacyAssignmentBackfillQueuedRooms.add(roomId);
        window.dispatchEvent(new CustomEvent('p2:students-request', {
          detail: {
            action: 'backfill-legacy-assignment',
            studentId,
            roomId,
            lessonId: lesson.id,
            title: record.title || lesson.shortTitle || lesson.title,
            taskCount: Number(record.taskCount || lesson.taskCount) || lesson.taskCount,
            assignedAt: Number(record.createdAt || 0) || null,
            summary: record.summary && typeof record.summary === 'object' ? record.summary : null,
            ...assignmentContentDetail(lesson)
          }
        }));
      }
    }
  }

  // P1.7.9.12: aktyvus priskyrimas visada naudoja savo išsaugotą turinio
  // snapshot. Taip Bibliotekoje atnaujinus tą patį lessonId jau pradėto mokinio
  // užduotys, jų ID ir progresas nepasikeičia. Tik naujas priskyrimas gauna
  // naujausią katalogo versiją.
  function lessonFromAssignmentSnapshot(record = assignment) {
    const snapshot = record?.contentSnapshot && typeof record.contentSnapshot === 'object'
      ? record.contentSnapshot
      : null;
    if (!snapshot || !Array.isArray(snapshot.tasks) || !snapshot.tasks.length) return null;
    const lessonId = String(snapshot.lessonId || record?.lessonId || '').trim();
    return {
      ...snapshot,
      id: lessonId,
      lessonId,
      title: String(snapshot.title || record?.title || ''),
      shortTitle: String(snapshot.shortTitle || snapshot.title || record?.title || ''),
      taskCount: Math.max(0, Number(snapshot.taskCount) || snapshot.tasks.length),
      classCount: Math.max(0, Number(snapshot.classCount) || snapshot.tasks.filter(task => task?.section === 'class').length),
      selfCount: Math.max(0, Number(snapshot.selfCount) || snapshot.tasks.filter(task => task?.section === 'self').length),
      tasks: snapshot.tasks
    };
  }

  function activeLesson() {
    return lessonFromAssignmentSnapshot() || lessonForId(assignment?.lessonId) || DEMO_LESSON;
  }

  function isSimpleInputTask(task) {
    return task?.type === 'input' || task?.response?.renderer === 'simple-input';
  }

  function parseLocalizedNumber(value) {
    const normalized = String(value ?? '')
      .trim()
      .replace(/\s+/g, '')
      .replace(',', '.')
      .replace(/−/g, '-');
    if (!normalized || !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(normalized)) return NaN;
    return Number(normalized);
  }

  // Tikimybei priimame lygiavertes mokiniams įprastas formas:
  // 1/2, 0,5, 0.5 ir 50 % turi būti tas pats skaičius.
  function parseProbabilityValue(value) {
    const normalized = String(value ?? '').trim().replace(/\s+/g, '').replace(/−/g, '-').replace(',', '.');
    if (!normalized) return NaN;
    if (normalized.endsWith('%')) {
      const percent = parseLocalizedNumber(normalized.slice(0, -1));
      return Number.isFinite(percent) ? percent / 100 : NaN;
    }
    const fraction = normalized.match(/^([+-]?(?:\d+(?:\.\d*)?|\.\d+))\/([+-]?(?:\d+(?:\.\d*)?|\.\d+))$/);
    if (fraction) {
      const numerator = Number(fraction[1]);
      const denominator = Number(fraction[2]);
      return Number.isFinite(numerator) && Number.isFinite(denominator) && Math.abs(denominator) > 1e-12
        ? numerator / denominator
        : NaN;
    }
    return parseLocalizedNumber(normalized);
  }

  function simpleAnswerMatches(task, value) {
    const candidates = Array.isArray(task?.acceptedAnswers) && task.acceptedAnswers.length
      ? task.acceptedAnswers
      : [task?.answer];
    if (task?.answerType === 'number') {
      const actual = parseLocalizedNumber(value);
      if (!Number.isFinite(actual)) return false;
      return candidates.some(candidate => {
        const expected = parseLocalizedNumber(candidate);
        return Number.isFinite(expected) && Math.abs(actual - expected) < 1e-9;
      });
    }
    if (task?.answerType === 'probability') {
      const actual = parseProbabilityValue(value);
      if (!Number.isFinite(actual)) return false;
      return candidates.some(candidate => {
        const expected = parseProbabilityValue(candidate);
        return Number.isFinite(expected) && Math.abs(actual - expected) < 1e-9;
      });
    }
    const normalize = source => String(source ?? '').trim().toLocaleLowerCase('lt-LT').replace(/\s+/g, ' ');
    const actual = normalize(value);
    return Boolean(actual) && candidates.some(candidate => actual === normalize(candidate));
  }

  let libraryModal = null;
  let teacherPreviewWindow = null;
  // Mokytojo pratybų peržiūra yra lokali: ji NIEKADA nekeičia mokinio aktyvios užduoties.
  let teacherPreviewTaskId = null;
  let teacherFollowStudent = true;
  let teacherPreviewMode = 'closed'; // closed | docked | minimized | maximized
  let teacherPreviewRestoreMode = 'docked';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  // Leidžia paprastame sąlygos tekste naudoti LaTeX fragmentus tarp \( ... \).
  // Sąlygose matematika yra tik rodoma, todėl naudojame MathLive statinį
  // <math-span>, o ne redagavimui skirtą <math-field>. Taip formulė tampa
  // natūralia tos pačios teksto eilutės dalimi ir neatsineša įvedimo lauko geometrijos.
  function renderRichMathText(value) {
    const source = String(value ?? '');
    const re = /\\\(([\s\S]*?)\\\)/g;
    let html = '';
    let cursor = 0;
    let match;
    while ((match = re.exec(source))) {
      html += escapeHtml(source.slice(cursor, match.index));

      const mathEnd = match.index + match[0].length;
      const afterMath = source.slice(mathEnd);
      // Skyrybos ženklas turi jungtis prie formulės kaip prie paprasto teksto.
      // Toleruojame ir netyčia tarp \(...\) bei skyrybos paliktus tarpus.
      const punctuation = afterMath.match(/^(\s*)([.,:;?!…])/u);
      html += `<math-span class="p2-inline-math" mode="textstyle">${escapeHtml(match[1])}</math-span>`;

      cursor = mathEnd + (punctuation ? punctuation[1].length : 0);
    }
    html += escapeHtml(source.slice(cursor));
    return html;
  }

  function taskDisplayPrompt(task) {
    return task?.promptDisplay || task?.prompt || '';
  }

  function taskDisplayChoice(task, index, fallback) {
    const displays = Array.isArray(task?.choicesDisplay) ? task.choicesDisplay : [];
    return displays[index] ?? fallback ?? '';
  }

  function taskDiagramMarkup(task) {
    const type = String(task?.diagram?.type || '');
    if (!type) return '';
    const wrap = (label, body) => `<figure class="p2-task-diagram" aria-label="${escapeHtml(label)}"><svg viewBox="0 0 240 160" role="img" aria-hidden="true">${body}</svg></figure>`;
    if (type === 'angle-bisector') return wrap('Trikampio kampo pusiaukampinės schema', `
      <path d="M120 18 L24 138 L218 138 Z"/><path d="M120 18 L102 138" class="guide"/>
      <text x="116" y="14">A</text><text x="11" y="151">B</text><text x="219" y="151">C</text><text x="97" y="153">D</text>
      <text x="48" y="132">6</text><text x="157" y="132">9</text><text x="63" y="72">8</text><text x="171" y="72">?</text>`);
    if (type === 'incircle') return wrap('Trikampis ir į jį įbrėžtas apskritimas', `
      <path d="M120 15 L35 145 L205 145 Z"/>
      <circle cx="120" cy="99.02" r="45.98" class="guide"/>
      <text x="116" y="12">A</text><text x="23" y="157">B</text><text x="208" y="157">C</text><text x="124" y="102">r</text>`);
    if (type === 'circumcircle') return wrap('Trikampis ir apie jį apibrėžtas apskritimas', `
      <circle cx="120" cy="82" r="70" class="guide"/>
      <path d="M120 12 L64 124 L176 124 Z"/>
      <path d="M120 82 L176 124" class="guide"/>
      <circle cx="120" cy="82" r="2.6" style="fill:#526078;stroke:none"/>
      <text x="116" y="10">A</text><text x="52" y="137">B</text><text x="179" y="137">C</text>
      <text x="112" y="77">O</text><text x="150" y="99">R</text>`);
    if (type === 'centroid') return wrap('Trikampio pusiaukraštinės ir sunkio centras', `
      <path d="M120 18 L27 139 L215 139 Z"/><path d="M120 18 L121 139" class="guide"/><path d="M27 139 L168 79" class="guide"/><path d="M215 139 L74 79" class="guide"/>
      <circle cx="121" cy="99" r="3.5"/><text x="116" y="14">A</text><text x="14" y="151">B</text><text x="218" y="151">C</text><text x="128" y="97">G</text>`);
    if (type === 'cyclic-quadrilateral') return wrap('Į apskritimą įbrėžtas keturkampis', `
      <circle cx="120" cy="82" r="70" class="guide"/>
      <path d="M66.38 37.00 L155.00 21.38 L165.00 135.62 L52.71 101.29 Z"/>
      <path d="M78 38 A23 23 0 0 1 61 58" class="guide"/>
      <path d="M160 119 A18 18 0 0 0 149 134" class="guide"/>
      <circle cx="66.38" cy="37" r="2.4" style="fill:#526078;stroke:none"/>
      <circle cx="155" cy="21.38" r="2.4" style="fill:#526078;stroke:none"/>
      <circle cx="165" cy="135.62" r="2.4" style="fill:#526078;stroke:none"/>
      <circle cx="52.71" cy="101.29" r="2.4" style="fill:#526078;stroke:none"/>
      <text x="54" y="31">A</text><text x="159" y="18">B</text><text x="169" y="149">C</text><text x="39" y="107">D</text>
      <text x="76" y="62">112°</text><text x="145" y="121">?</text>`);
    if (type === 'included-angle') return wrap('Trikampis su dviem kraštinėmis ir kampu tarp jų', `
      <path d="M31 137 L105 35 L215 137 Z"/><path d="M53 137 A22 22 0 0 1 45 119" class="guide"/>
      <text x="19" y="151">C</text><text x="101" y="30">A</text><text x="217" y="151">B</text>
      <text x="54" y="79">8</text><text x="121" y="151">10</text><text x="52" y="122">30°</text>`);
    if (type === 'cosine-law') return wrap('Trikampis kosinusų teoremai', `
      <path d="M30 137 L106 35 L218 137 Z"/><path d="M54 137 A24 24 0 0 1 45 118" class="guide"/>
      <text x="18" y="151">C</text><text x="102" y="30">A</text><text x="220" y="151">B</text>
      <text x="55" y="79">5</text><text x="127" y="151">7</text><text x="50" y="121">60°</text><text x="164" y="83">AB = ?</text>`);
    if (type === 'sine-law') return wrap('Trikampis sinusų teoremai', `
      <path d="M55 140 L55 25 L121.40 25 Z"/>
      <path d="M55 37 L67 37 L67 25" class="guide"/>
      <path d="M55 118 A22 22 0 0 1 66 120.95" class="guide"/>
      <text x="42" y="154">A</text><text x="42" y="20">B</text><text x="124" y="29">C</text>
      <text x="68" y="113">30°</text><text x="87" y="17">a = 10</text><text x="89" y="90">b = ?</text>`);
    return '';
  }

  const practiceEngine = window.P772PracticeEngine || null;
  const liveSolutionTimers = new Map();
  let solutionFocusRequest = null;
  let activeSolutionStep = { taskId: null, index: 0 };
  let branchGroupSequence = 0;
  function createBranchGroupId(taskId = 'task') {
    branchGroupSequence += 1;
    return `branch-${String(taskId || 'task').replace(/[^a-z0-9_-]/gi, '-')}-${Date.now().toString(36)}-${branchGroupSequence}`;
  }

  function deepCopy(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function isSolutionTask(task) {
    return task?.type === 'solution' || task?.response?.renderer === 'math-step-list';
  }

  function isExpressionTask(task) {
    return task?.type === 'expression' || task?.response?.renderer === 'single-math-input';
  }

  function isValidatedMathTask(task) {
    return isSolutionTask(task) || isExpressionTask(task);
  }

  function emptySolutionResponse() {
    const step = practiceEngine?.createStep?.('equation', [''], [''])
      || { type: 'equation', values: [''], latexValues: [''] };
    return { steps: [step] };
  }

  function normalizeSolutionResponse(value) {
    const source = value && typeof value === 'object' ? value : {};
    const steps = practiceEngine?.normalizeSteps?.(source.steps)
      || (Array.isArray(source.steps) && source.steps.length ? source.steps : emptySolutionResponse().steps);
    return { steps: deepCopy(steps) };
  }

  function solutionResponseForItem(item) {
    return normalizeSolutionResponse(item?.liveSolution || item?.lastSolution || emptySolutionResponse());
  }

  function solutionSummary(response) {
    return normalizeSolutionResponse(response).steps
      .map(step => Array.isArray(step.values) ? step.values.filter(Boolean).join(' arba ') : '')
      .filter(Boolean)
      .join(' → ');
  }

  function solutionTaskForEngine(task) {
    return {
      id: task.id,
      title: task.title || 'Išspręsk lygtį',
      instruction: task.instruction || '',
      prompt: { kind: 'equation', value: task.prompt },
      response: deepCopy(task.response)
    };
  }

  function validateSolutionTask(task, response) {
    if (!practiceEngine?.validateTask) {
      return { status: 'incorrect', title: 'Tikrinimo variklis nepasiekiamas', message: 'Perkrauk puslapį ir bandyk dar kartą.', stepResults: [] };
    }
    return practiceEngine.validateTask(solutionTaskForEngine(task), normalizeSolutionResponse(response));
  }

  function emptyExpressionResponse() {
    return { answer: '', answerLatex: '' };
  }

  function normalizeExpressionResponse(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      answer: String(source.answer || ''),
      answerLatex: String(source.answerLatex || '')
    };
  }

  function expressionResponseForItem(item) {
    return normalizeExpressionResponse(item?.liveExpression || item?.lastExpression || emptyExpressionResponse());
  }

  function expressionTaskForEngine(task) {
    return {
      id: task.id,
      title: task.title || 'Suprastink reiškinį',
      instruction: task.instruction || '',
      prompt: { kind: 'expression', value: task.prompt },
      response: deepCopy(task.response)
    };
  }

  function validateExpressionTask(task, response) {
    if (!practiceEngine?.validateTask) {
      return { status: 'incorrect', title: 'Tikrinimo variklis nepasiekiamas', message: 'Perkrauk puslapį ir bandyk dar kartą.' };
    }
    return practiceEngine.validateTask(expressionTaskForEngine(task), normalizeExpressionResponse(response));
  }

  function comparableProgress(value) {
    const copy = deepCopy(value && typeof value === 'object' ? value : {});
    delete copy.updatedAt;
    delete copy.updatedBy;
    return JSON.stringify(copy);
  }

  function studentMathFieldActive() {
    return Boolean(studentPanel.querySelector('math-field.p2-solution-math-field:focus-within, math-field.p2-solution-math-field.math-field-is-active, math-field.p2-expression-math-field:focus-within, math-field.p2-expression-math-field.math-field-is-active, input[data-simple-input]:focus'));
  }

  function publishLiveProgress(next, taskId) {
    progress = normalizedProgress(next);
    progress.updatedAt = Date.now();
    const old = liveSolutionTimers.get(taskId);
    if (old) clearTimeout(old);
    liveSolutionTimers.set(taskId, setTimeout(() => {
      liveSolutionTimers.delete(taskId);
      window.dispatchEvent(new CustomEvent('p2:practice-progress-live-request', { detail: deepCopy(progress) }));
    }, 90));
  }

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }

  const prefs = readPrefs();
  let view = ['board', 'split', 'practice'].includes(prefs.view) ? prefs.view : 'split';
  // P1.7.9.3: padalintas režimas yra fiksuotas 50/50. Santykis nebesaugomas kaip
  // vartotojo pasirinkimas, kad lenta kiekvieną kartą turėtų tą patį vizualų plotį.
  const ratio = 50;

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, ratio: 50 })); } catch (_) {}
  }

  function role() {
    return body.dataset.onlineRole === 'student' ? 'student' : 'teacher';
  }

  function toast(text) {
    window.P772OnlineBridge?.showToast?.(text);
  }

  function applyRatio() {
    workspace.style.setProperty('--p2-split', `${ratio}%`);
  }

  function applyView(next, { persist = true } = {}) {
    view = ['board', 'split', 'practice'].includes(next) ? next : 'split';
    workspace.dataset.view = view;
    body.dataset.p2View = view;
    document.querySelectorAll('[data-p2-view]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.p2View === view));
    splitter.setAttribute('aria-hidden', view !== 'split' ? 'true' : 'false');
    if (persist) savePrefs();
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new CustomEvent('p2:view-changed', { detail: { view } }));
    });
  }

  document.querySelectorAll('[data-p2-view]').forEach(button => {
    button.addEventListener('click', () => applyView(button.dataset.p2View));
  });

  // Fiksuotas 50/50 skyriklis yra tik vizualus: jo nebegalima tempti ar keisti
  // klaviatūra. Tai išlaiko vienodą lentos mastelį kiekvienoje pamokoje.
  splitter.setAttribute('aria-disabled', 'true');
  splitter.tabIndex = -1;

  function emptyProgress() {
    return {
      assignmentId: activeLesson().id,
      status: 'not_started',
      currentTaskId: activeLesson().tasks[0].id,
      taskStates: {},
      startedAt: null,
      updatedAt: Date.now()
    };
  }

  function normalizedProgress(value) {
    const source = value && typeof value === 'object' ? value : {};
    const base = emptyProgress();
    const sourceAssignmentId = String(source.assignmentId || '').trim();
    if (sourceAssignmentId && sourceAssignmentId !== base.assignmentId) return base;
    const merged = {
      ...base,
      ...source,
      assignmentId: base.assignmentId,
      taskStates: source.taskStates && typeof source.taskStates === 'object' ? source.taskStates : {}
    };
    if (!activeLesson().tasks.some(task => task.id === merged.currentTaskId)) merged.currentTaskId = base.currentTaskId;
    return merged;
  }

  function normalizeAttemptLimit(value, fallback = 3) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return fallback;
    if (numeric === 0) return 0; // 0 = neribotai
    return Math.max(1, Math.min(9, Math.round(numeric)));
  }

  function normalizedAttemptPolicy(source = assignment) {
    const legacyDefault = source?.allowRetries === false ? 1 : 3;
    const raw = source?.attemptPolicy && typeof source.attemptPolicy === 'object' ? source.attemptPolicy : {};
    const defaultMaxAttempts = normalizeAttemptLimit(raw.defaultMaxAttempts, legacyDefault);
    const taskMaxAttempts = {};
    const rawOverrides = raw.taskMaxAttempts && typeof raw.taskMaxAttempts === 'object' ? raw.taskMaxAttempts : {};
    activeLesson().tasks.forEach(task => {
      if (!Object.prototype.hasOwnProperty.call(rawOverrides, task.id)) return;
      taskMaxAttempts[task.id] = normalizeAttemptLimit(rawOverrides[task.id], defaultMaxAttempts);
    });
    return { defaultMaxAttempts, taskMaxAttempts };
  }

  function attemptLimitForTask(taskId, source = assignment) {
    const policy = normalizedAttemptPolicy(source);
    return Object.prototype.hasOwnProperty.call(policy.taskMaxAttempts, taskId)
      ? policy.taskMaxAttempts[taskId]
      : policy.defaultMaxAttempts;
  }

  function attemptLimitLabel(limit) {
    return Number(limit) === 0 ? '∞' : String(limit);
  }

  function attemptUsageLabel(item, taskId) {
    const used = Number(item?.attempts || 0);
    const max = attemptLimitForTask(taskId);
    return max === 0 ? `${used} band.` : `${used} / ${max} band.`;
  }

  function attemptsRemaining(item, taskId) {
    const max = attemptLimitForTask(taskId);
    if (max === 0) return Infinity;
    return Math.max(0, max - Number(item?.attempts || 0));
  }

  function isTaskExhausted(item, taskId) {
    if (item?.solved) return false;
    const max = attemptLimitForTask(taskId);
    return max > 0 && Number(item?.attempts || 0) >= max;
  }

  function policySummary(source = assignment) {
    const policy = normalizedAttemptPolicy(source);
    const overrides = Object.keys(policy.taskMaxAttempts).length;
    const base = policy.defaultMaxAttempts === 0 ? 'Neribotai visoms' : `${policy.defaultMaxAttempts} band. pagal nutylėjimą`;
    return overrides ? `${base} · ${overrides} individualūs` : base;
  }

  function currentTask() {
    const state = normalizedProgress(progress);
    return activeLesson().tasks.find(task => task.id === state.currentTaskId) || activeLesson().tasks[0];
  }

  function baseTaskState() {
    return { attempts: 0, wrongAttempts: 0, hintUsed: false, solved: false, status: 'pending', lastAnswer: '' };
  }

  function typedTaskState(taskId) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    const raw = normalizedProgress(progress).taskStates[taskId] || baseTaskState();
    // P2.1 c1 anksčiau buvo testinis klausimas. Jei kambaryje liko seno prototipo
    // A/B/C/D būsena, jos nelaikome naujos sprendžiamos lygties rezultatu.
    if (isSolutionTask(task) && !raw.liveSolution && !raw.lastSolution && (raw.liveAnswer || raw.lastAnswer || raw.solved)) {
      return { ...baseTaskState(), openedAt: raw.openedAt || null };
    }
    // P2.2 c2 anksčiau buvo A/B/C/D klausimas. Senas pasirinkimas negali būti
    // interpretuojamas kaip naujos reiškinio užduoties atsakymas.
    if (isExpressionTask(task) && !raw.liveExpression && !raw.lastExpression && (raw.liveAnswer || raw.lastAnswer || raw.solved)) {
      return { ...baseTaskState(), openedAt: raw.openedAt || null };
    }
    return raw;
  }

  function currentTaskState() {
    return typedTaskState(currentTask().id);
  }

  function taskState(taskId) {
    return typedTaskState(taskId);
  }

  function progressStats() {
    const state = normalizedProgress(progress);
    let solved = 0, good = 0, help = 0, repeat = 0;
    activeLesson().tasks.forEach(task => {
      const item = taskState(task.id);
      if (item.solved) solved += 1;
      if (item.solved) {
        if (item.hintUsed || Number(item.attempts || 0) > 1 || item.status === 'help') help += 1;
        else good += 1;
      } else if (isTaskExhausted(item, task.id)) {
        repeat += 1;
      }
    });
    const finished = solved + repeat;
    return { solved, finished, good, help, repeat, percent: Math.round((finished / activeLesson().taskCount) * 100) };
  }

  function pedagogicalStatus(item, options = {}) {
    const state = item || {};
    const taskId = options.taskId || null;
    if (state.solved) {
      if (state.hintUsed) return { key: 'help', label: 'Su pagalba' };
      if (Number(state.attempts || 0) > 1) return { key: 'help', label: 'Po kelių bandymų' };
      if (state.status === 'help') return { key: 'help', label: 'Su pagalba' };
      return { key: 'good', label: 'Savarankiškai' };
    }
    if (taskId && isTaskExhausted(state, taskId)) return { key: 'repeat', label: 'Kartoti' };
    if (options.current) return { key: 'working', label: 'Vykdoma' };
    if (state.openedAt || Number(state.attempts || 0) > 0) return { key: 'started', label: 'Pradėta' };
    return { key: 'pending', label: 'Nepradėta' };
  }


  function markTaskOpened(next, taskId) {
    if (!taskId) return next;
    const previous = (next.taskStates && next.taskStates[taskId]) || taskState(taskId);
    if (previous.solved || previous.openedAt) return next;
    next.taskStates = { ...next.taskStates, [taskId]: { ...previous, openedAt: Date.now() } };
    return next;
  }

  function publishProgress(next, options = {}) {
    progress = normalizedProgress(next);
    progress.updatedAt = Date.now();
    window.dispatchEvent(new CustomEvent('p2:practice-progress-request', { detail: progress }));
    if (options.render !== false) renderPanels();
  }

  function taskIndex(taskId) {
    return Math.max(0, activeLesson().tasks.findIndex(task => task.id === taskId));
  }

  function nextTaskId(taskId) {
    const index = taskIndex(taskId);
    return activeLesson().tasks[Math.min(activeLesson().tasks.length - 1, index + 1)].id;
  }

  function previousTaskId(taskId) {
    const index = taskIndex(taskId);
    return activeLesson().tasks[Math.max(0, index - 1)].id;
  }

  function sectionForCurrentTask() {
    return currentTask().section;
  }

  function statusLabel(state) {
    if (!state) return 'Nepradėta';
    if (state.status === 'completed') return 'Atlikta';
    if (state.status === 'in_progress') return 'Vykdoma';
    return 'Nepradėta';
  }

  function renderStudentPanel() {
    const stats = progressStats();
    if (!assignment) {
      studentPanel.innerHTML = `
        <div class="p2-student-hero">
          <div class="p2-student-hero-icon" aria-hidden="true">∑</div>
          <div class="p2-student-hero-copy"><span class="p2-label">Mano pratybos</span><h3>Čia atsiras mokytojo priskirtos pratybos</h3><p>Pratybos veiks atskirai nuo bendros lentos, todėl galėsi spręsti savo tempu, o lenta liks bendra darbo erdvė.</p></div>
          <span class="p2-count-badge">0</span>
        </div>
        <div class="p2-empty-card p2-practice-empty">
          <div class="p2-empty-illustration" aria-hidden="true"><span>f(x)</span><i></i></div>
          <strong>Kol kas nėra priskirtų pratybų</strong>
          <p>Kai mokytojas priskirs pratybas, jos atsiras čia. Tada galėsi jas atidaryti „Padalintame“ arba „Tik pratybos“ vaizde.</p>
        </div>
        ${studentProgressSummary(stats)}
      `;
      return;
    }

    const state = normalizedProgress(progress);
    if (state.status === 'not_started') {
      studentPanel.innerHTML = `
        <article class="p2-assigned-lesson-card">
          <div class="p2-assigned-lesson-icon" aria-hidden="true">ƒ</div>
          <div class="p2-assigned-lesson-copy">
            <span class="p2-label">Priskirtos pratybos</span>
            <h3>${escapeHtml(activeLesson().title)}</h3>
            <p>${escapeHtml(activeLesson().description)}</p>
            <div class="p2-assignment-meta"><span>${activeLesson().classCount} pamokoje</span><span>${activeLesson().selfCount} savarankiškai</span><span>${activeLesson().taskCount} užduotys</span></div>
          </div>
          <span class="p2-status-badge is-new">Nepradėta</span>
          <button class="p2-primary p2-open-assignment" type="button" data-action="open-assignment">Atidaryti</button>
        </article>
        ${studentProgressSummary(stats)}
      `;
      bindStudentActions();
      return;
    }

    studentPanel.innerHTML = studentPracticeMarkup(state, stats);
    bindStudentActions();
  }

  function studentProgressSummary(stats) {
    const progressBadge = assignment
      ? `<span class="p2-soft-pill">${stats.finished} / ${activeLesson().taskCount}</span>`
      : '';
    return `
      <section class="p2-mini-section" aria-label="Mano pažanga">
        <header><div><span class="p2-label">Mano pažanga</span><h3>Ši pamoka</h3></div>${progressBadge}</header>
        <div class="p2-student-progress">
          <div><span>Savarankiškai</span><strong>${stats.good}</strong></div>
          <div><span>Su pagalba / taisant</span><strong>${stats.help}</strong></div>
          <div><span>Kartoti</span><strong>${stats.repeat}</strong></div>
        </div>
      </section>`;
  }

  function taskFeedbackMarkup(task, item, { teacher = false } = {}) {
    const maxAttempts = attemptLimitForTask(task.id);
    const exhausted = isTaskExhausted(item, task.id);
    const remaining = attemptsRemaining(item, task.id);
    const extraClass = teacher ? ' p2-teacher-student-feedback' : '';

    if (item.solved) {
      if (item.hintUsed) {
        return `<div class="p2-practice-feedback is-warning${extraClass}">✓ Teisingai${Number(item.attempts || 0) > 1 ? ' su pagalba ir po kelių bandymų' : ' su pagalba'}.</div>`;
      }
      if (Number(item.attempts || 0) > 1) {
        return `<div class="p2-practice-feedback is-warning${extraClass}">✓ Teisingai po kelių bandymų.</div>`;
      }
      return `<div class="p2-practice-feedback is-success${extraClass}">✓ Teisingai. Gali tęsti.</div>`;
    }

    if (exhausted) {
      return `<div class="p2-practice-feedback is-repeat${extraClass}">Išnaudoti visi ${maxAttempts} ${maxAttempts === 1 ? 'bandymas' : 'bandymai'}. Užduotis pažymėta „Kartoti“.</div>`;
    }

    if (Number(item.attempts || 0) > 0) {
      const result = isValidatedMathTask(task) ? item.validationResult : null;
      const detail = result?.message ? `<span>${escapeHtml(result.message)}</span>` : '';
      const title = result?.title ? escapeHtml(result.title) : 'Dar ne.';
      return `<div class="p2-practice-feedback is-warning${extraClass}"><strong>${title}</strong>${detail}<small>${remaining === Infinity ? 'Bandymų skaičius neribojamas.' : `Liko ${remaining} ${remaining === 1 ? 'bandymas' : 'bandymai'}.`}</small></div>`;
    }
    return '';
  }

  function solutionEditorMarkup(task, item) {
    const response = solutionResponseForItem(item);
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const stepResults = Array.isArray(item.validationResult?.stepResults) ? item.validationResult.stepResults : [];
    // P2.4.1: vieninga sprendimo lapo sistema taikoma VISOMS sprendimo eigos užduotims.
    // Tiesinė ir kvadratinė lygtis naudoja tą pačią Įprasta / Šakos / Atsakymas juostą;
    // skirtumas lieka tik matematiniame validatoriuje, ne mokinio sąsajoje.
    const structuredModes = true;
    const activeIndex = activeSolutionStep.taskId === task.id
      ? Math.max(0, Math.min(response.steps.length - 1, Number(activeSolutionStep.index || 0)))
      : 0;
    const activeStep = response.steps[activeIndex] || response.steps[0] || { type: 'equation' };

    const rows = response.steps.map((rawStep, index) => {
      const step = practiceEngine?.createStep?.(
        rawStep?.type || 'equation',
        rawStep?.values || [''],
        rawStep?.latexValues || [''],
        { branchGroupId: rawStep?.branchGroupId }
      ) || rawStep;
      const result = stepResults[index] || null;
      const resultClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
      const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
      const groupId = step.type === 'alternatives' ? String(step.branchGroupId || '') : '';
      const previous = response.steps[index - 1];
      const next = response.steps[index + 1];
      const previousSameGroup = Boolean(groupId && previous?.type === 'alternatives' && previous?.branchGroupId === groupId);
      const nextSameGroup = Boolean(groupId && next?.type === 'alternatives' && next?.branchGroupId === groupId);
      const groupClass = step.type === 'alternatives' && groupId
        ? ` is-branch-group-${previousSameGroup ? (nextSameGroup ? 'middle' : 'end') : (nextSameGroup ? 'start' : 'single')}`
        : '';
      const continuationClass = step.values?.some(value => String(value || '').trim().startsWith('=')) ? ' is-continuation-line' : '';
      const separatorLabel = previousSameGroup ? '' : 'arba';
      const fields = step.type === 'alternatives'
        ? `<div class="p2-solution-branches p2-paper-branches">
            <div class="p2-solution-field-host" data-solution-field="${index}" data-solution-branch="0"></div>
            <span class="p2-solution-branch-separator" aria-hidden="true">${separatorLabel}</span>
            <div class="p2-solution-field-host" data-solution-field="${index}" data-solution-branch="1"></div>
          </div>`
        : `<div class="p2-solution-single-field ${step.type === 'solution-set' ? 'is-answer' : ''}">
            ${step.type === 'solution-set' ? '<span class="p2-solution-answer-prefix">Ats.:</span>' : ''}
            <div class="p2-solution-field-host" data-solution-field="${index}" data-solution-branch="0"></div>
          </div>`;

      return `
        <div class="p2-solution-step p2-paper-step${resultClass}${groupClass}${continuationClass}" data-solution-step="${index}" data-solution-step-type="${escapeHtml(step.type || 'equation')}"${groupId ? ` data-branch-group="${escapeHtml(groupId)}"` : ''}>
          <div class="p2-solution-step-main">
            ${fields}
            <p class="p2-solution-step-message">${result?.message ? escapeHtml(result.message) : ''}</p>
          </div>
          <span class="p2-solution-step-state" aria-hidden="true">${stateMark}</span>
          <button type="button" class="p2-solution-remove p2-paper-remove" data-solution-remove="${index}" aria-label="Pašalinti ${index + 1} eilutę" ${locked || response.steps.length <= 1 ? 'disabled' : ''}>×</button>
        </div>`;
    }).join('');

    const typeToolbar = structuredModes ? `
      <div class="p2-solution-type-toolbar" data-solution-toolbar data-active-step="${activeIndex}">
        <span class="p2-solution-type-label">Eilutės tipas</span>
        <div class="p2-solution-type-options" role="group" aria-label="Aktyvios sprendimo eilutės tipas">
          <button type="button" class="${activeStep.type === 'equation' ? 'is-active' : ''}" data-solution-toolbar-type="equation" ${locked ? 'disabled' : ''}>Įprasta</button>
          <button type="button" class="${activeStep.type === 'alternatives' ? 'is-active' : ''}" data-solution-toolbar-type="alternatives" ${locked ? 'disabled' : ''}>Šakos</button>
          <button type="button" class="${activeStep.type === 'solution-set' ? 'is-active' : ''}" data-solution-toolbar-type="solution-set" ${locked ? 'disabled' : ''}>Atsakymas</button>
        </div>
      </div>` : '';

    return `
      <section class="p2-solution-editor p2-solution-paper ${locked ? 'is-locked' : ''}">
        <header class="p2-solution-editor-head p2-solution-paper-head">
          <div><span>Sprendimas</span><small>${structuredModes ? 'Rašyk kaip lape. Eilutės paskirtį keisk tik tada, kai jos reikia.' : 'Rašyk po vieną sprendimo žingsnį eilutėje.'}</small></div>
          <span><kbd>Enter</kbd> – nauja eilutė; šakoje – tos pačios šakos tęsinys</span>
        </header>
        ${typeToolbar}
        <div class="p2-solution-steps p2-solution-paper-lines">${rows}</div>
        <div class="p2-solution-editor-actions p2-solution-paper-actions">
          <button type="button" class="p2-paper-add-line" data-action="add-solution-step" ${locked ? 'disabled' : ''}>＋ Eilutė</button>
        </div>
      </section>`;
  }

  function expressionEditorMarkup(task, item) {
    const response = expressionResponseForItem(item);
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const result = item.validationResult || null;
    const stateClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
    const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
    return `
      <section class="p2-expression-editor${stateClass} ${locked ? 'is-locked' : ''}">
        <header class="p2-expression-editor-head">
          <div><span>${escapeHtml(task.response?.label || 'Atsakymas')}</span><small>Įrašyk matematinį reiškinį. Tikrinama matematinė lygybė, ne teksto sutapimas.</small></div>
          <b class="p2-expression-state" aria-hidden="true">${stateMark}</b>
        </header>
        <div class="p2-expression-field-host" data-expression-field></div>
        ${result?.message ? `<p class="p2-expression-message">${escapeHtml(result.message)}</p>` : ''}
      </section>`;
  }

  function updateLiveExpression(task, plain, latex) {
    const next = normalizedProgress(progress);
    const previous = taskState(task.id);
    const response = { answer: plain, answerLatex: latex };
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [task.id]: {
        ...previous,
        liveExpression: response,
        expressionUpdatedAt: Date.now(),
        validationResult: null
      }
    };
    publishLiveProgress(next, task.id);
  }

  function hydrateStudentExpressionEditor() {
    const task = currentTask();
    if (!isExpressionTask(task)) return;
    const item = currentTaskState();
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const response = expressionResponseForItem(item);
    const host = studentPanel.querySelector('[data-expression-field]');
    if (!host) return;
    if (!practiceEngine?.createMathField) {
      host.textContent = response.answer || '';
      return;
    }
    const field = practiceEngine.createMathField({
      source: response.answer,
      latexSource: response.answerLatex,
      kind: 'expression',
      fieldKey: `p2:${task.id}:expression`,
      testid: 'p2-expression-input',
      placeholder: task.response?.placeholder || 'Įrašyk reiškinį',
      contextLabel: 'P2 pratybų reiškinio atsakymas',
      onCommit: (plain, latex) => updateLiveExpression(task, plain, latex)
    });
    field.classList.add('p2-expression-math-field');
    if (locked) {
      field.setAttribute('read-only', '');
      field.setAttribute('disabled', '');
    }
    host.replaceChildren(field);
  }

  function studentPracticeMarkup(state, stats) {
    const task = currentTask();
    const item = currentTaskState();
    const solutionTask = isSolutionTask(task);
    const expressionTask = isExpressionTask(task);
    const simpleInputTask = isSimpleInputTask(task);
    const selected = (solutionTask || expressionTask || simpleInputTask) ? '' : (selectedAnswers[task.id] ?? item.liveAnswer ?? item.lastAnswer ?? '');
    const simpleValue = simpleInputTask ? String(selectedAnswers[task.id] ?? item.liveAnswer ?? item.lastAnswer ?? '') : '';
    const taskNumber = taskIndex(task.id) + 1;
    const exhausted = isTaskExhausted(item, task.id);
    const feedback = taskFeedbackMarkup(task, item);
    const hint = item.hintUsed ? `<div class="p2-hint-box"><strong>Užuomina</strong><span>${escapeHtml(task.hint)}</span></div>` : '';

    const answerMarkup = solutionTask
      ? solutionEditorMarkup(task, item)
      : expressionTask
        ? expressionEditorMarkup(task, item)
        : simpleInputTask
          ? `<div class="p2-simple-answer">
              <label for="p2-simple-input-${escapeHtml(task.id)}">${escapeHtml(task.inputLabel || 'Atsakymas')}</label>
              <div class="p2-simple-answer-field">
                <input id="p2-simple-input-${escapeHtml(task.id)}" data-simple-input="${escapeHtml(task.id)}" type="text" inputmode="${task.answerType === 'number' ? 'decimal' : 'text'}" autocomplete="off" spellcheck="false" value="${escapeHtml(simpleValue)}" placeholder="${escapeHtml(task.placeholder || 'Įrašyk atsakymą')}" ${(item.solved || exhausted) ? 'disabled' : ''}>
                ${task.inputSuffix ? `<span>${escapeHtml(task.inputSuffix)}</span>` : ''}
              </div>
            </div>`
          : `<div class="p2-choice-list">${(Array.isArray(task.choices) ? task.choices : []).map((choice, index) => {
              const active = selected === choice ? ' is-selected' : '';
              return `<button type="button" class="p2-choice${active}" data-choice="${escapeHtml(choice)}" ${(item.solved || exhausted) ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span><b>${renderRichMathText(taskDisplayChoice(task, index, choice))}</b></button>`;
            }).join('')}</div>`;

    const conditionMarkup = (solutionTask || expressionTask)
      ? `<div class="p2-solution-condition">
          <p class="p2-task-instruction">${escapeHtml(task.instruction || task.title || 'Išspręsk užduotį.')}</p>
          <math-field class="p2-static-math p2-task-equation" read-only tabindex="-1">${escapeHtml(task.prompt)}</math-field>
          ${expressionTask && task.response?.options?.domain ? `<p class="p2-expression-domain">Apibrėžimo sąlyga: ${escapeHtml(task.response.options.domain)}</p>` : ''}
        </div>`
      : `<p class="p2-task-prompt">${renderRichMathText(taskDisplayPrompt(task))}</p>${taskDiagramMarkup(task)}`;

    const dots = activeLesson().tasks.map((candidate, index) => {
      const cstate = taskState(candidate.id);
      const pedagogy = pedagogicalStatus(cstate, { taskId: candidate.id, current: candidate.id === task.id && state.status === 'in_progress' });
      const cls = [candidate.id === task.id ? 'is-current' : '', pedagogy.key === 'good' ? 'is-done' : '', pedagogy.key === 'help' ? 'is-help' : '', pedagogy.key === 'repeat' ? 'is-repeat' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="p2-task-dot ${cls}" data-task-id="${candidate.id}" title="${escapeHtml(candidate.label)} · ${index + 1} · ${pedagogy.label}">${index + 1}</button>`;
    }).join('');

    return `
      <section class="p2-practice-shell">
        <header class="p2-practice-shell-head">
          <div><span class="p2-label">Mano pratybos</span><h3>${escapeHtml(activeLesson().shortTitle)}</h3></div>
          <div class="p2-practice-progress"><span>${taskNumber} / ${activeLesson().taskCount}</span><i><b style="width:${stats.percent}%"></b></i></div>
        </header>
        <div class="p2-tabs p2-live-tabs" role="tablist" aria-label="Pratybų dalys">
          <button type="button" data-section="class" class="${task.section === 'class' ? 'is-active' : ''}">▤ Pamokoje</button>
          <button type="button" data-section="self" class="${task.section === 'self' ? 'is-active' : ''}">⌂ Savarankiškai</button>
        </div>
        <article class="p2-task-card ${(solutionTask || expressionTask) ? 'p2-solution-task-card' : ''}${simpleInputTask ? ' p2-simple-input-task-card' : ''}">
          <div class="p2-task-card-head"><span class="p2-task-number">${taskNumber}.</span><div><span class="p2-label">${escapeHtml(task.label)}</span><h3>${escapeHtml((solutionTask || expressionTask || simpleInputTask) ? (task.title || 'Užduotis') : 'Užduotis')}</h3></div><span class="p2-soft-pill">${attemptUsageLabel(item, task.id)}</span></div>
          ${conditionMarkup}
          ${answerMarkup}
          ${hint}${feedback}
          <div class="p2-task-actions">
            <button type="button" class="p2-secondary" data-action="hint" ${(item.hintUsed || item.solved || exhausted) ? 'disabled' : ''}>💡 Užuomina</button>
            <span class="p2-task-actions-spacer"></span>
            <button type="button" class="p2-secondary" data-action="previous" ${taskNumber === 1 ? 'disabled' : ''}>← Ankstesnė</button>
            ${item.solved || exhausted
              ? '<button type="button" class="p2-primary" data-action="next">Toliau →</button>'
              : `<button type="button" class="p2-primary" data-action="check">${solutionTask ? 'Patikrinti sprendimą' : (expressionTask || simpleInputTask) ? 'Patikrinti atsakymą' : 'Tikrinti'}</button>`}
          </div>
        </article>
        <nav class="p2-task-dots" aria-label="Užduočių navigacija">${dots}</nav>
      </section>
      ${studentProgressSummary(stats)}
    `;
  }

  function updateLiveSolution(task, index, branchIndex, plain, latex, row) {
    const next = normalizedProgress(progress);
    const previous = taskState(task.id);
    const response = solutionResponseForItem(previous);
    while (response.steps.length <= index) response.steps.push(practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] });
    const current = response.steps[index] || practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] };
    const type = ['equation', 'alternatives', 'solution-set'].includes(current.type) ? current.type : 'equation';
    const values = Array.isArray(current.values) ? [...current.values] : [''];
    const latexValues = Array.isArray(current.latexValues) ? [...current.latexValues] : [''];
    while (values.length <= branchIndex) values.push('');
    while (latexValues.length <= branchIndex) latexValues.push('');
    values[branchIndex] = plain;
    latexValues[branchIndex] = latex;
    response.steps[index] = practiceEngine?.createStep?.(type, values, latexValues, { branchGroupId: current.branchGroupId })
      || { type, values, latexValues, ...(current.branchGroupId ? { branchGroupId: current.branchGroupId } : {}) };

    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [task.id]: {
        ...previous,
        liveSolution: response,
        solutionUpdatedAt: Date.now(),
        validationResult: null
      }
    };
    row?.classList.remove('is-correct', 'is-error', 'is-warning');
    const message = row?.querySelector('.p2-solution-step-message');
    const stateMark = row?.querySelector('.p2-solution-step-state');
    if (message) message.textContent = '';
    if (stateMark) stateMark.textContent = '';
    publishLiveProgress(next, task.id);
  }

  function setSolutionStepType(taskId, index, type) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    const current = response.steps[index] || practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] };
    const firstValue = current.values?.[0] || '';
    const firstLatex = current.latexValues?.[0] || '';
    const branchGroupId = type === 'alternatives'
      ? (current.type === 'alternatives' && current.branchGroupId ? current.branchGroupId : createBranchGroupId(taskId))
      : '';
    response.steps[index] = type === 'alternatives'
      ? (practiceEngine?.createStep?.('alternatives', [firstValue, ''], [firstLatex, ''], { branchGroupId }) || { type: 'alternatives', values: [firstValue, ''], latexValues: [firstLatex, ''], branchGroupId })
      : (practiceEngine?.createStep?.(type, [firstValue], [firstLatex]) || { type, values: [firstValue], latexValues: [firstLatex] });
    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    activeSolutionStep = { taskId, index };
    solutionFocusRequest = { taskId, index, branchIndex: 0 };
    practiceEngine?.holdMathToolbar?.(420);
    publishProgress(next, { render: false });

    if (!replaceSolutionStepInPlace(task, index)) {
      renderPanels();
      return;
    }
    focusStudentSolutionField(index, 0);
  }

  function hydrateStudentSolutionEditor(options = {}) {
    const task = currentTask();
    if (!isSolutionTask(task)) return;
    const item = currentTaskState();
    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    const response = solutionResponseForItem(item);
    studentPanel.querySelectorAll('[data-solution-field]').forEach(host => {
      if (options.onlyEmpty && host.querySelector('math-field')) return;
      const index = Number(host.dataset.solutionField);
      const branchIndex = Math.max(0, Number(host.dataset.solutionBranch || 0));
      const step = response.steps[index] || practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] };
      if (!practiceEngine?.createMathField) {
        host.textContent = step.values?.[branchIndex] || '';
        return;
      }
      const row = host.closest('.p2-solution-step');
      const field = practiceEngine.createMathField({
        source: step.values?.[branchIndex] || '',
        latexSource: step.latexValues?.[branchIndex] || '',
        kind: step.type === 'solution-set' ? 'solution-set' : 'equation',
        fieldKey: `p2:${task.id}:step:${index}:branch:${branchIndex}`,
        testid: branchIndex === 0 ? `p2-step-input-${index}` : `p2-step-input-${index}-${branchIndex}`,
        placeholder: step.type === 'alternatives'
          ? (response.steps[index - 1]?.type === 'alternatives' && response.steps[index - 1]?.branchGroupId && response.steps[index - 1]?.branchGroupId === step.branchGroupId
              ? '= tęsinys'
              : (branchIndex === 0 ? 'Pirmas atvejis' : 'Antras atvejis'))
          : step.type === 'solution-set'
            ? 'Pvz., x = 2; x = 3'
            : (task.response?.placeholder || 'Kita lygtis'),
        contextLabel: step.type === 'alternatives'
          ? `P2 pratybų ${index + 1} eilutės ${branchIndex + 1} sprendimo šaka`
          : step.type === 'solution-set'
            ? 'P2 pratybų galutinis atsakymas'
            : `P2 pratybų ${index + 1} sprendimo eilutė`,
        onCommit: (plain, latex) => updateLiveSolution(task, index, branchIndex, plain, latex, row),
        onEnter: () => {
          if (step.type === 'alternatives') {
            addBranchSolutionLine(task.id, index, branchIndex);
            return;
          }
          addSolutionStep(task.id, index + 1);
        }
      });
      field.classList.add('p2-solution-math-field');
      const markActiveLine = () => setActiveSolutionStep(task.id, index);
      field.addEventListener('focus', markActiveLine);
      field.addEventListener('pointerdown', markActiveLine, { passive: true });
      field.addEventListener('click', markActiveLine);
      if (locked) {
        field.setAttribute('read-only', '');
        field.setAttribute('disabled', '');
      }
      host.replaceChildren(field);
    });

    if (solutionFocusRequest?.taskId === task.id) {
      const targetIndex = solutionFocusRequest.index;
      const targetBranch = solutionFocusRequest.branchIndex || 0;
      solutionFocusRequest = null;
      setActiveSolutionStep(task.id, targetIndex);
      requestAnimationFrame(() => {
        const selector = targetBranch === 0
          ? `[data-testid="p2-step-input-${targetIndex}"]`
          : `[data-testid="p2-step-input-${targetIndex}-${targetBranch}"]`;
        const target = studentPanel.querySelector(selector);
        if (!target) return;
        try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
      });
    } else {
      syncSolutionToolbar();
    }
  }

  function setActiveSolutionStep(taskId, index) {
    activeSolutionStep = { taskId, index: Math.max(0, Number(index || 0)) };
    syncSolutionToolbar();
  }

  function syncSolutionToolbar() {
    const task = currentTask();
    if (!isSolutionTask(task)) return;
    const toolbar = studentPanel.querySelector('[data-solution-toolbar]');
    if (!toolbar) return;
    const response = solutionResponseForItem(currentTaskState());
    if (!response.steps.length) return;
    const index = activeSolutionStep.taskId === task.id
      ? Math.max(0, Math.min(response.steps.length - 1, Number(activeSolutionStep.index || 0)))
      : 0;
    activeSolutionStep = { taskId: task.id, index };
    toolbar.dataset.activeStep = String(index);
    const type = response.steps[index]?.type || 'equation';
    toolbar.querySelectorAll('[data-solution-toolbar-type]').forEach(button => {
      button.classList.toggle('is-active', button.dataset.solutionToolbarType === type);
      button.setAttribute('aria-pressed', button.dataset.solutionToolbarType === type ? 'true' : 'false');
    });
  }

  function solutionFieldSelector(index, branchIndex = 0) {
    return branchIndex === 0
      ? `[data-testid="p2-step-input-${index}"]`
      : `[data-testid="p2-step-input-${index}-${branchIndex}"]`;
  }

  function focusStudentSolutionField(index, branchIndex = 0) {
    requestAnimationFrame(() => {
      const target = studentPanel.querySelector(solutionFieldSelector(index, branchIndex));
      if (!target) return;
      try { target.focus({ preventScroll: true }); } catch (_) { target.focus(); }
    });
  }

  function bindSolutionRowActions(scope = studentPanel) {
    scope.querySelectorAll('[data-solution-remove]').forEach(button => {
      if (button.dataset.p2Bound === '1') return;
      button.dataset.p2Bound = '1';
      button.addEventListener('click', () => removeSolutionStep(currentTask().id, Number(button.dataset.solutionRemove)));
    });

    scope.querySelectorAll('[data-solution-toolbar-type]').forEach(button => {
      if (button.dataset.p2Bound === '1') return;
      button.dataset.p2Bound = '1';
      // Neišjungiame aktyvaus MathLive lauko vien dėl valdymo juostos paspaudimo.
      button.addEventListener('pointerdown', event => event.preventDefault());
      button.addEventListener('click', () => {
        const toolbar = button.closest('[data-solution-toolbar]');
        const index = Number(toolbar?.dataset.activeStep || activeSolutionStep.index || 0);
        setSolutionStepType(currentTask().id, index, button.dataset.solutionToolbarType);
      });
    });
  }

  function replaceSolutionStepInPlace(task, index) {
    const oldRow = studentPanel.querySelector(`[data-solution-step="${index}"]`);
    if (!oldRow) return false;

    const item = currentTaskState();
    const scratch = document.createElement('div');
    scratch.innerHTML = solutionEditorMarkup(task, item);
    const nextRow = scratch.querySelector(`[data-solution-step="${index}"]`);
    if (!nextRow) return false;

    oldRow.replaceWith(nextRow);
    bindSolutionRowActions(nextRow);
    hydrateStudentSolutionEditor({ onlyEmpty: true });
    syncSolutionToolbar();
    return true;
  }

  function appendSolutionStepInPlace(task, index) {
    const stepsHost = studentPanel.querySelector('.p2-solution-steps');
    if (!stepsHost || stepsHost.querySelector(`[data-solution-step="${index}"]`)) return false;

    const item = currentTaskState();
    const response = solutionResponseForItem(item);
    const scratch = document.createElement('div');
    scratch.innerHTML = solutionEditorMarkup(task, item);
    const row = scratch.querySelector(`[data-solution-step="${index}"]`);
    if (!row) return false;

    // P2-SPLIT-P2.3.3: neperpiešiame visos mokinio pratybų skilties vien dėl naujos
    // sprendimo eilutės. Senieji MathLive laukai lieka prijungti prie DOM, todėl
    // universali formulės juosta nepraranda aktyvaus taikinio ir vaizdas nebesumirksi.
    stepsHost.appendChild(row);

    const locked = Boolean(item.solved || isTaskExhausted(item, task.id));
    studentPanel.querySelectorAll('[data-solution-remove]').forEach(button => {
      button.disabled = locked || response.steps.length <= 1;
    });
    bindSolutionRowActions(row);
    hydrateStudentSolutionEditor({ onlyEmpty: true });
    return true;
  }

  function addBranchSolutionLine(taskId, index, branchIndex = 0) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    const current = response.steps[index];
    if (!current || current.type !== 'alternatives') return;

    const groupId = current.branchGroupId || createBranchGroupId(taskId);
    if (!current.branchGroupId) {
      response.steps[index] = practiceEngine?.createStep?.('alternatives', current.values, current.latexValues, { branchGroupId: groupId })
        || { ...current, branchGroupId: groupId };
    }

    const nextExisting = response.steps[index + 1];
    if (nextExisting?.type === 'alternatives' && nextExisting.branchGroupId === groupId) {
      activeSolutionStep = { taskId, index: index + 1 };
      practiceEngine?.holdMathToolbar?.(300);
      focusStudentSolutionField(index + 1, branchIndex);
      return;
    }

    const branchCount = Math.max(2, Array.isArray(current.values) ? current.values.length : 2);
    const values = Array.from({ length: branchCount }, () => '');
    const latexValues = Array.from({ length: branchCount }, () => '');
    const added = practiceEngine?.createStep?.('alternatives', values, latexValues, { branchGroupId: groupId })
      || { type: 'alternatives', values, latexValues, branchGroupId: groupId };
    response.steps.splice(index + 1, 0, added);

    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    activeSolutionStep = { taskId, index: index + 1 };
    solutionFocusRequest = { taskId, index: index + 1, branchIndex };
    practiceEngine?.holdMathToolbar?.(420);
    // Įterpiant eilutę branchGroup viduryje keičiasi tolesni indeksai, todėl sąmoningai
    // perpiešiame sprendimo lapą ir atkuriame fokusą toje pačioje šakoje.
    publishProgress(next);
  }

  function addSolutionStep(taskId, focusIndex = null) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    const nextIndex = focusIndex === null ? response.steps.length : Math.max(0, Number(focusIndex));

    // Jei Enter prašo pereiti į jau egzistuojančią kitą eilutę, nieko neperrenderiname.
    if (nextIndex < response.steps.length) {
      activeSolutionStep = { taskId, index: nextIndex };
      syncSolutionToolbar();
      practiceEngine?.holdMathToolbar?.(300);
      focusStudentSolutionField(nextIndex, 0);
      return;
    }

    response.steps.push(practiceEngine?.createStep?.() || { type: 'equation', values: [''], latexValues: [''] });
    const addedIndex = response.steps.length - 1;
    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    activeSolutionStep = { taskId, index: addedIndex };
    solutionFocusRequest = { taskId, index: addedIndex };
    practiceEngine?.holdMathToolbar?.(420);
    publishProgress(next, { render: false });

    if (!appendSolutionStepInPlace(task, addedIndex)) {
      renderPanels();
      return;
    }
    // hydrateStudentSolutionEditor() suvartoja solutionFocusRequest; jei naršyklė fokusą
    // atideda, papildomas stabilus focus nekoreguoja slinkties.
    focusStudentSolutionField(addedIndex, 0);
  }

  function removeSolutionStep(taskId, index) {
    const task = activeLesson().tasks.find(candidate => candidate.id === taskId);
    if (!task || !isSolutionTask(task)) return;
    const previous = taskState(taskId);
    if (previous.solved || isTaskExhausted(previous, taskId)) return;
    const response = solutionResponseForItem(previous);
    if (response.steps.length <= 1) return;
    response.steps.splice(index, 1);
    const next = normalizedProgress(progress);
    next.status = 'in_progress';
    next.taskStates = {
      ...next.taskStates,
      [taskId]: { ...previous, liveSolution: response, validationResult: null, solutionUpdatedAt: Date.now() }
    };
    solutionFocusRequest = { taskId, index: Math.max(0, Math.min(index, response.steps.length - 1)) };
    practiceEngine?.holdMathToolbar?.(420);
    publishProgress(next);
  }

  function bindStudentActions() {
    studentPanel.querySelector('[data-action="open-assignment"]')?.addEventListener('click', () => {
      const next = normalizedProgress(progress);
      next.status = 'in_progress';
      next.currentTaskId = next.currentTaskId || activeLesson().tasks[0].id;
      next.startedAt = next.startedAt || Date.now();
      markTaskOpened(next, next.currentTaskId);
      publishProgress(next);
    });

    studentPanel.querySelectorAll('[data-simple-input]').forEach(input => {
      input.addEventListener('input', () => {
        const taskId = input.dataset.simpleInput || currentTask().id;
        const task = activeLesson().tasks.find(candidate => candidate.id === taskId) || currentTask();
        if (!isSimpleInputTask(task)) return;
        const value = input.value || '';
        selectedAnswers[task.id] = value;
        const next = normalizedProgress(progress);
        const previous = taskState(task.id);
        next.status = 'in_progress';
        next.taskStates = {
          ...next.taskStates,
          [task.id]: { ...previous, liveAnswer: value, selectionUpdatedAt: Date.now() }
        };
        publishLiveProgress(next, task.id);
      });
      input.addEventListener('keydown', event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        studentPanel.querySelector('[data-action="check"]')?.click();
      });
    });

    studentPanel.querySelectorAll('[data-choice]').forEach(button => {
      button.addEventListener('click', () => {
        const task = currentTask();
        if (isSolutionTask(task) || isExpressionTask(task)) return;
        const choice = button.dataset.choice || '';
        selectedAnswers[task.id] = choice;
        const next = normalizedProgress(progress);
        const previous = taskState(task.id);
        next.taskStates = {
          ...next.taskStates,
          [task.id]: { ...previous, liveAnswer: choice, selectionUpdatedAt: Date.now() }
        };
        publishProgress(next);
      });
    });

    studentPanel.querySelector('[data-action="hint"]')?.addEventListener('click', () => {
      const task = currentTask();
      const next = normalizedProgress(progress);
      const previous = taskState(task.id);
      next.taskStates = { ...next.taskStates, [task.id]: { ...previous, hintUsed: true } };
      publishProgress(next);
    });

    studentPanel.querySelector('[data-action="add-solution-step"]')?.addEventListener('click', () => addSolutionStep(currentTask().id));
    bindSolutionRowActions(studentPanel);

    studentPanel.querySelector('[data-action="check"]')?.addEventListener('click', () => {
      const task = currentTask();
      const previous = taskState(task.id);
      if (isTaskExhausted(previous, task.id)) { toast('Šiai užduočiai bandymų nebeliko'); return; }

      let correct = false;
      let submittedAnswer = '';
      let validationResult = null;
      let submittedSolution = null;

      if (isSolutionTask(task)) {
        const response = solutionResponseForItem(previous);
        submittedAnswer = solutionSummary(response);
        if (!submittedAnswer) { toast('Įrašyk bent vieną sprendimo žingsnį'); return; }
        validationResult = validateSolutionTask(task, response);
        correct = validationResult.status === 'correct';
        submittedSolution = response;
      } else if (isExpressionTask(task)) {
        const response = expressionResponseForItem(previous);
        submittedAnswer = response.answer.trim();
        if (!submittedAnswer) { toast('Įrašyk reiškinį'); return; }
        validationResult = validateExpressionTask(task, response);
        correct = validationResult.status === 'correct';
      } else if (isSimpleInputTask(task)) {
        const answer = String(selectedAnswers[task.id] ?? previous.liveAnswer ?? '').trim();
        if (!answer) { toast('Įrašyk atsakymą'); return; }
        submittedAnswer = answer;
        correct = simpleAnswerMatches(task, answer);
      } else {
        const answer = selectedAnswers[task.id] ?? previous.liveAnswer ?? '';
        if (!answer) { toast('Pasirink atsakymą'); return; }
        submittedAnswer = answer;
        correct = answer === task.answer;
      }

      const next = normalizedProgress(progress);
      const attempts = Number(previous.attempts || 0) + 1;
      const wrongAttempts = Number(previous.wrongAttempts || 0) + (correct ? 0 : 1);
      const maxAttempts = attemptLimitForTask(task.id);
      const exhaustedAfter = !correct && maxAttempts > 0 && attempts >= maxAttempts;
      const status = correct
        ? (previous.hintUsed || attempts > 1 ? 'help' : 'good')
        : (exhaustedAfter ? 'repeat' : 'pending');
      const state = {
        ...previous,
        attempts,
        wrongAttempts,
        lastAnswer: submittedAnswer,
        lastResult: correct ? 'correct' : (validationResult?.status || 'wrong'),
        submittedAt: Date.now(),
        solved: correct,
        status,
        ...(isSolutionTask(task)
          ? { liveSolution: submittedSolution, lastSolution: submittedSolution, validationResult }
          : isExpressionTask(task)
            ? { liveExpression: expressionResponseForItem(previous), lastExpression: expressionResponseForItem(previous), validationResult }
            : { liveAnswer: submittedAnswer })
      };
      next.taskStates = { ...next.taskStates, [task.id]: state };
      const allFinished = activeLesson().tasks.every(candidate => {
        const candidateState = candidate.id === task.id ? state : taskState(candidate.id);
        return Boolean(candidateState.solved) || isTaskExhausted(candidateState, candidate.id);
      });
      next.status = allFinished ? 'completed' : 'in_progress';
      publishProgress(next);
    });

    studentPanel.querySelector('[data-action="next"]')?.addEventListener('click', () => {
      const task = currentTask();
      const next = normalizedProgress(progress);
      next.currentTaskId = nextTaskId(task.id);
      markTaskOpened(next, next.currentTaskId);
      publishProgress(next);
    });

    studentPanel.querySelector('[data-action="previous"]')?.addEventListener('click', () => {
      const task = currentTask();
      const next = normalizedProgress(progress);
      next.currentTaskId = previousTaskId(task.id);
      markTaskOpened(next, next.currentTaskId);
      publishProgress(next);
    });

    studentPanel.querySelectorAll('[data-task-id]').forEach(button => {
      button.addEventListener('click', () => {
        const next = normalizedProgress(progress);
        next.currentTaskId = button.dataset.taskId;
        markTaskOpened(next, next.currentTaskId);
        publishProgress(next);
      });
    });

    studentPanel.querySelectorAll('[data-section]').forEach(button => {
      button.addEventListener('click', () => {
        const section = button.dataset.section;
        const first = activeLesson().tasks.find(task => task.section === section);
        if (!first) return;
        const next = normalizedProgress(progress);
        next.currentTaskId = first.id;
        markTaskOpened(next, next.currentTaskId);
        publishProgress(next);
      });
    });

    hydrateStudentSolutionEditor();
    hydrateStudentExpressionEditor();
  }

  function renderTeacherPanel() {
    const count = Math.max(0, Number(userCount?.textContent || 0));
    const studentOnline = count >= 2;
    const learnerName = currentStudentName('Mokinys');
    const learnerInitial = String(learnerName || 'M').trim().slice(0, 1).toUpperCase() || 'M';
    const state = normalizedProgress(progress);
    const stats = progressStats();
    const task = assignment ? currentTask() : null;
    const item = assignment ? currentTaskState() : null;
    const assigned = Boolean(assignment);
    const started = assigned && state.status !== 'not_started';
    const assignmentTitle = assigned ? activeLesson().shortTitle : 'Pratybos dar nepriskirtos';
    const currentLabel = task ? `${taskIndex(task.id) + 1} / ${activeLesson().taskCount}` : '— / —';
    const helper = !assigned ? '—' : item?.hintUsed ? 'Naudota' : 'Nenaudota';
    const currentPedagogy = started ? pedagogicalStatus(item, { taskId: task?.id, current: state.status === 'in_progress' && Boolean(task) }) : { key: 'pending', label: '—' };
    const activityTitle = !assigned ? 'Pratybos dar nepriskirtos' : !started ? `${learnerName} dar neatidarė pratybų` : state.status === 'completed' ? 'Pratybos atliktos' : `Sprendžiama ${taskIndex(task.id) + 1} užduotis`;
    const activityText = !assigned
      ? `Priskirk pratybas Bibliotekoje. ${learnerName} jas iškart pamatys savo „Mano pratybos“ srityje.`
      : !started
        ? `Pratybos priskirtos. Kai ${learnerName} paspaus „Atidaryti“, čia realiu laiku atsiras dabartinė užduotis, bandymai ir pagalbos būsena.`
        : `${task?.prompt || ''}`;

    teacherPanel.innerHTML = `
      <div class="p2-learner-card p2-learner-overview">
        <div class="p2-avatar" aria-hidden="true">${escapeHtml(learnerInitial)}</div>
        <div class="p2-learner-copy"><span class="p2-label">${escapeHtml(learnerName)} · eiga</span><h3>${studentOnline ? `Prisijungė: ${escapeHtml(learnerName)}` : `Laukiama: ${escapeHtml(learnerName)}`}</h3><p>${studentOnline ? 'Lenta ir individuali pratybų būsena sinchronizuojamos realiu laiku.' : 'Nukopijuok šio mokinio nuorodą ir atidaryk ją kitame įrenginyje.'}</p></div>
        <span class="p2-presence-pill ${studentOnline ? 'is-online' : ''}">${studentOnline ? 'Prisijungęs' : `${count} įrenginys`}</span>
      </div>
      <div class="p2-teacher-dashboard-grid">
        <div class="p2-progress-card">
          <div class="p2-progress-head"><div><span class="p2-label">Priskirtos pratybos</span><h3>${escapeHtml(assignmentTitle)}</h3><p class="p2-teacher-status-line">${assigned ? `${statusLabel(state)} · ${policySummary(assignment)}` : 'Bibliotekoje pasirink pratybas ir priskirk mokiniui.'}</p></div><strong>${assigned ? `${stats.finished} / ${activeLesson().taskCount}` : '— / —'}</strong></div>
          <div class="p2-progress-line"><span style="width:${assigned ? stats.percent : 0}%"></span></div>
          <div class="p2-metrics">
            <div><span>Dabartinė užduotis</span><strong>${started ? currentLabel : '—'}</strong></div>
            <div><span>Bandymų</span><strong>${started && task ? attemptUsageLabel(item, task.id) : '—'}</strong></div>
            <div><span>Būsena</span><strong class="p2-metric-status status-${currentPedagogy.key}">${started ? currentPedagogy.label : '—'}</strong></div>
          </div>
        </div>
        <div class="p2-current-task-card">
          <div class="p2-card-heading-row"><div><span class="p2-label">Dabartinė veikla</span><h3>${escapeHtml(activityTitle)}</h3></div><span class="p2-soft-pill">${assigned ? statusLabel(state) : 'Laukiama'}</span></div>
          <p>${escapeHtml(activityText)}</p>
          ${started ? `<div class="p2-current-meta"><span>Pagalba: <strong>${helper}</strong></span><span>Istorinė būsena: <strong class="status-${currentPedagogy.key}">${currentPedagogy.label}</strong></span></div>` : ''}
          ${started && item?.lastAnswer ? `<div class="p2-last-answer"><span>Paskutinis atsakymas</span><strong>${escapeHtml(item.lastAnswer)}</strong></div>` : ''}
          <div class="p2-card-actions">
            <button type="button" class="p2-secondary" data-action="teacher-open" ${assigned ? '' : 'disabled'}>Atidaryti pratybas</button>
            <button type="button" class="p2-primary" data-action="teacher-board" disabled title="Bus įgyvendinta kitame etape">Rodyti lentoje</button>
          </div>
        </div>
      </div>
      <div class="p2-insight-card ${started ? '' : 'p2-insight-empty'}">
        <div class="p2-insight-icon" aria-hidden="true">✦</div>
        <div><span class="p2-label">${escapeHtml(learnerName)} · įžvalgos</span><h3>${started ? 'Tarpinė pamokos būsena' : 'Įžvalgos atsiras pradėjus spręsti'}</h3><p>${started ? `Savarankiškai: ${stats.good} · Su pagalba / taisant: ${stats.help} · Kartoti: ${stats.repeat}.` : 'Čia matysi, kuriuos gebėjimus mokinys atlieka savarankiškai, kur naudoja pagalbą ir ką verta pakartoti.'}</p></div>
      </div>
    `;

    teacherPanel.querySelector('[data-action="teacher-open"]')?.addEventListener('click', openTeacherPreview);
  }

  function renderPanels() {
    if (role() === 'teacher') renderTeacherPanel();
    else renderStudentPanel();
    renderLibraryContent();
    if (role() === 'teacher' && teacherPreviewMode === 'docked') teacherPanel.hidden = true;
  }

  function applyRole() {
    const isTeacher = role() === 'teacher';
    studentPanel.hidden = isTeacher;
    teacherPanel.hidden = !isTeacher;
    if (!isTeacher || teacherPreviewMode !== 'docked') {
      sideKicker.textContent = isTeacher ? 'MOKYTOJO STEBĖJIMAS' : 'MOKINIO ERDVĖ';
      sideTitle.textContent = isTeacher ? `${currentStudentName('Mokinys')} · eiga` : 'Mano pratybos';
    }
    practiceModeButton.textContent = isTeacher ? `${currentStudentName('Mokinys')} · eiga` : 'Tik pratybos';
    if (sideRolePill) sideRolePill.textContent = isTeacher ? 'Mokytojas' : currentStudentName('Mokinys');
    document.querySelectorAll('.p2-teacher-only').forEach(el => el.hidden = !isTeacher);
    const p2LibraryButton = document.getElementById('libraryButton');
    if (p2LibraryButton) p2LibraryButton.hidden = !isTeacher;
    const p2StudentsButton = document.getElementById('studentsButton');
    if (p2StudentsButton) p2StudentsButton.hidden = !isTeacher;
    const p2ScheduleButton = document.getElementById('scheduleButton');
    if (p2ScheduleButton) p2ScheduleButton.hidden = !isTeacher;
    if (!isTeacher && studentsModal) studentsModal.hidden = true;
    if (!isTeacher && scheduleModal) scheduleModal.hidden = true;
    if (!isTeacher && teacherPreviewMode !== 'closed') {
      teacherPreviewMode = 'closed';
      if (teacherPreviewWindow) teacherPreviewWindow.hidden = true;
      body.classList.remove('p2-teacher-preview-maximized');
      sidePane.classList.remove('has-preview-docked');
    }
    updateStudentIdentityLabels();
    renderLessonStudentTabs();
    updatePresence();
    renderPanels();
    if (isTeacher && teacherPreviewMode === 'docked') setTeacherSideHeader(true);
  }

  function updatePresence() {
    const count = Math.max(0, Number(userCount?.textContent || 0));
    if (boardPresenceText) boardPresenceText.textContent = count > 1 ? `${count} prisijungę` : 'Prisijungta';
    if (presencePill && role() === 'teacher') {
      presencePill.textContent = count >= 2 ? 'Prisijungęs' : `${count} ${count === 1 ? 'įrenginys' : 'įrenginiai'}`;
      presencePill.classList.toggle('is-online', count >= 2);
    }
    if (role() === 'teacher') renderTeacherPanel();
  }

  if (userCount) new MutationObserver(updatePresence).observe(userCount, { childList: true, subtree: true, characterData: true });


  function currentRoomId() {
    const visible = String(document.getElementById('onlineRoomCode')?.textContent || '').trim().toUpperCase();
    if (/^[A-Z0-9_-]{4,24}$/.test(visible) && visible !== '—') return visible;
    const fromUrl = String(new URL(location.href).searchParams.get('room') || '').trim().toUpperCase();
    return /^[A-Z0-9_-]{4,24}$/.test(fromUrl) ? fromUrl : '';
  }

  function normalizeTeacherStudentDb(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      profileId: String(source.profileId || ''),
      meta: source.meta && typeof source.meta === 'object' ? source.meta : {},
      students: source.students && typeof source.students === 'object' ? source.students : {},
      roomLinks: source.roomLinks && typeof source.roomLinks === 'object' ? source.roomLinks : {},
      classSessions: source.classSessions && typeof source.classSessions === 'object' ? source.classSessions : {},
      scheduleEntries: source.scheduleEntries && typeof source.scheduleEntries === 'object' ? source.scheduleEntries : {},
      scheduleRuns: source.scheduleRuns && typeof source.scheduleRuns === 'object' ? source.scheduleRuns : {}
    };
  }

  function studentGradeValue(value) {
    const grade = Math.round(Number(value) || 0);
    return grade >= 1 && grade <= 12 ? grade : 0;
  }

  function studentGuardianRelation(value) {
    const relation = String(value || '').trim().toLocaleLowerCase('lt-LT');
    return relation === 'mama' || relation === 'tėtis' || relation === 'kita' ? relation : '';
  }

  function studentGuardianLabel(student) {
    const relation = studentGuardianRelation(student?.guardianRelation);
    const name = String(student?.guardianName || '').trim();
    if (!relation || !name) return '';
    const custom = String(student?.guardianCustomRelation || '').trim();
    const relationLabel = relation === 'kita' ? custom : relation;
    return relationLabel ? `${relationLabel} ${name}` : '';
  }

  function normalizedStudentName(value) {
    return String(value || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('lt-LT');
  }

  function studentList() {
    return Object.entries(teacherStudentDb.students || {})
      .map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
      .sort((a, b) => {
        const gradeA = studentGradeValue(a.grade) || 99;
        const gradeB = studentGradeValue(b.grade) || 99;
        return gradeA - gradeB
          || String(a.name || '').localeCompare(String(b.name || ''), 'lt')
          || studentGuardianLabel(a).localeCompare(studentGuardianLabel(b), 'lt');
      });
  }

  function studentSameNameGroup(student, students = studentList()) {
    const name = normalizedStudentName(student?.name);
    if (!name) return [];
    return students.filter(item => normalizedStudentName(item.name) === name);
  }

  function studentSameNameGradeGroup(student, students = studentList()) {
    const grade = studentGradeValue(student?.grade);
    return studentSameNameGroup(student, students).filter(item => studentGradeValue(item.grade) === grade);
  }

  function studentTeacherLabel(student, students = studentList(), options = {}) {
    if (!student) return 'Mokinys';
    const name = String(student.name || 'Mokinys').trim() || 'Mokinys';
    const grade = studentGradeValue(student.grade);
    const sameName = studentSameNameGroup(student, students);
    const sameNameGrade = studentSameNameGradeGroup(student, students);
    const parts = [];
    if (options.alwaysGrade) parts.push(grade ? `${grade} kl.` : 'klasė nenurodyta');
    else if (sameName.length > 1 && grade) parts.push(`${grade} kl.`);
    const guardian = studentGuardianLabel(student);
    if (options.alwaysGuardian) {
      parts.push(guardian || 'globėjas nenurodytas');
    } else if (sameNameGrade.length > 1 && guardian) {
      parts.push(guardian);
    }
    return parts.length ? `${name} · ${parts.join(' · ')}` : name;
  }

  // Tvarkaraštis yra mokytojo darbo aplinka, todėl čia sąmoningai rodome
  // pilną mokinio identifikatorių net ir tada, kai šiuo metu dublikatų nėra.
  // Globėjo duomenys niekur nekopijuojami į mokinio Room / mokinio sąsają.
  function scheduleStudentTeacherLabel(student, students = studentList()) {
    return studentTeacherLabel(student, students, { alwaysGrade: true, alwaysGuardian: true });
  }

  function studentMatchesSearch(student, query = studentSearchQuery) {
    const needle = String(query || '').trim().toLocaleLowerCase('lt-LT');
    if (!needle) return true;
    const grade = studentGradeValue(student?.grade);
    const haystack = [
      student?.name,
      grade ? `${grade}` : '',
      grade ? `${grade} klasė` : '',
      studentGuardianLabel(student),
      student?.guardianName,
      student?.guardianCustomRelation,
      student?.notes
    ].map(value => String(value || '').toLocaleLowerCase('lt-LT')).join(' ');
    return haystack.includes(needle);
  }

  function filteredStudentList(students = studentList()) {
    return students.filter(student => {
      const grade = studentGradeValue(student.grade);
      const gradeMatches = studentGradeFilter === 'all'
        || (studentGradeFilter === 'none' ? grade === 0 : grade === Number(studentGradeFilter));
      return gradeMatches && studentMatchesSearch(student);
    });
  }

  function linkedStudentIdForRoom(roomId = currentRoomId()) {
    return String(teacherStudentDb.roomLinks?.[roomId]?.studentId || '');
  }


  function linkedClassSessionIdForRoom(roomId = currentRoomId()) {
    return String(teacherStudentDb.roomLinks?.[roomId]?.classSessionId || roomStudentProfile?.classSessionId || '');
  }

  function studentRecord(studentId) {
    const id = String(studentId || '').trim();
    return id ? teacherStudentDb.students?.[id] || null : null;
  }

  function currentStudentId() {
    return String(roomStudentProfile?.studentId || linkedStudentIdForRoom() || '').trim();
  }

  function currentStudentName(fallback = 'Mokinys') {
    const id = currentStudentId();
    const fromDb = studentRecord(id)?.name;
    const value = String(roomStudentProfile?.name || fromDb || '').trim();
    return value || fallback;
  }

  function classSessionParticipants(classSessionId = linkedClassSessionIdForRoom()) {
    const session = teacherStudentDb.classSessions?.[classSessionId];
    const entries = Object.entries(session?.students && typeof session.students === 'object' ? session.students : {});
    const students = studentList();
    return entries.map(([studentId, item]) => ({
      studentId,
      roomId: String(item?.roomId || '').trim().toUpperCase(),
      name: studentTeacherLabel(studentRecord(studentId), students),
      addedAt: Number(item?.addedAt || 0)
    })).filter(item => item.roomId).sort((a, b) => a.addedAt - b.addedAt || a.name.localeCompare(b.name, 'lt'));
  }

  function ensureLessonStudentTabs() {
    if (lessonStudentTabs) return lessonStudentTabs;
    lessonStudentTabs = document.createElement('nav');
    lessonStudentTabs.id = 'p2LessonStudentTabs';
    lessonStudentTabs.className = 'p2-lesson-student-tabs';
    lessonStudentTabs.setAttribute('aria-label', 'Pamokos mokiniai');
    const topbar = document.querySelector('.topbar');
    if (topbar?.parentNode) topbar.insertAdjacentElement('afterend', lessonStudentTabs);
    return lessonStudentTabs;
  }

  function renderLessonStudentTabs() {
    if (role() !== 'teacher') {
      body.classList.remove('p2-lesson-student-tabs-active');
      if (lessonStudentTabs) lessonStudentTabs.hidden = true;
      return;
    }
    const classSessionId = linkedClassSessionIdForRoom();
    const participants = classSessionParticipants(classSessionId);
    if (!classSessionId || participants.length < 2) {
      body.classList.remove('p2-lesson-student-tabs-active');
      if (lessonStudentTabs) lessonStudentTabs.hidden = true;
      return;
    }
    const bar = ensureLessonStudentTabs();
    const activeRoom = currentRoomId();
    bar.hidden = false;
    bar.innerHTML = `<span class="p2-lesson-tabs-label">Pamokos mokiniai</span><div class="p2-lesson-tabs-scroll">${participants.map(item => {
      const active = item.roomId === activeRoom;
      const initial = String(item.name || 'M').trim().slice(0, 1).toUpperCase() || 'M';
      return `<button type="button" class="p2-lesson-student-tab ${active ? 'is-active' : ''}" data-lesson-student-room="${escapeHtml(item.roomId)}" ${active ? 'aria-current="page"' : ''}><span class="p2-lesson-tab-avatar">${escapeHtml(initial)}</span><span>${escapeHtml(item.name)}</span></button>`;
    }).join('')}</div>`;
    bar.querySelectorAll('[data-lesson-student-room]').forEach(button => button.addEventListener('click', () => {
      const targetRoom = String(button.dataset.lessonStudentRoom || '').trim().toUpperCase();
      if (!targetRoom || targetRoom === activeRoom || roomSwitching) return;
      requestTeacherRoomSwitch(targetRoom);
    }));
    body.classList.add('p2-lesson-student-tabs-active');
  }

  function requestTeacherRoomSwitch(targetRoom, preserveStay = true) {
    const safe = String(targetRoom || '').trim().toUpperCase();
    if (role() !== 'teacher' || !/^[A-Z0-9_-]{4,24}$/.test(safe) || safe === currentRoomId() || roomSwitching) return;
    roomSwitching = true;
    clearTimeout(studentDbSnapshotTimer);
    studentDbSnapshotTimer = null;
    renderLessonStudentTabs();
    window.dispatchEvent(new CustomEvent('p2:room-switch-request', {
      detail: { roomId: safe, preserveStay: preserveStay !== false }
    }));
  }

  function updateStudentIdentityLabels() {
    const isTeacher = role() === 'teacher';
    const name = currentStudentName('Mokinys');
    const hasName = currentStudentId() && name !== 'Mokinys';
    const roleBadge = document.getElementById('onlineRoleBadge');
    if (roleBadge) {
      roleBadge.textContent = isTeacher ? 'Mokytojas' : (hasName ? name : 'Mokinys');
      roleBadge.title = isTeacher ? 'Mokytojo režimas' : (hasName ? `Mokinio režimas · ${name}` : 'Mokinio režimas');
    }
    const boardTitle = document.querySelector('.p2-board-heading strong');
    const boardSubtitle = document.querySelector('.p2-board-subtitle');
    if (boardTitle) boardTitle.textContent = hasName ? `${name} · lenta` : 'Bendra lenta';
    if (boardSubtitle) boardSubtitle.textContent = hasName ? 'Individuali realaus laiko erdvė' : 'Bendra realaus laiko erdvė';
    if (isTeacher) {
      if (teacherPreviewMode !== 'docked' && sideTitle) sideTitle.textContent = `${name} · eiga`;
      if (practiceModeButton) practiceModeButton.textContent = `${name} · eiga`;
    } else if (sideRolePill) {
      sideRolePill.textContent = hasName ? name : 'Mokinys';
    }
  }

  function formatStudentDate(value, compact = false) {
    const stamp = Number(value);
    if (!Number.isFinite(stamp) || stamp <= 0) return '—';
    try {
      return new Intl.DateTimeFormat('lt-LT', compact
        ? { year: 'numeric', month: '2-digit', day: '2-digit' }
        : { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }
      ).format(new Date(stamp));
    } catch (_) { return new Date(stamp).toLocaleString('lt-LT'); }
  }

  function historicalRoomUrl(roomId, targetRole = 'teacher', useStay = true) {
    const url = new URL(location.href);
    url.searchParams.set('room', roomId);
    url.searchParams.set('role', targetRole === 'student' ? 'student' : 'teacher');
    if (useStay) url.searchParams.set('stay', '1');
    else url.searchParams.delete('stay');
    url.searchParams.delete('blank');
    return url.toString();
  }

  const STUDENT_HISTORY_RETURN_KEY = 'p2-student-history-return-v1';
  const STUDENT_CARD_REOPEN_KEY = 'p2-student-card-reopen-v1';

  function saveStudentHistoryReturn(studentId = selectedStudentId, targetRoomId = '', targetRole = 'teacher') {
    if (role() !== 'teacher') return;
    const safeStudentId = String(studentId || '').trim();
    const safeTargetRoomId = String(targetRoomId || '').trim().toUpperCase();
    const safeTargetRole = targetRole === 'student' ? 'student' : 'teacher';
    if (!safeStudentId || !safeTargetRoomId) return;
    try {
      sessionStorage.setItem(STUDENT_HISTORY_RETURN_KEY, JSON.stringify({
        url: location.href,
        studentId: safeStudentId,
        targetRoomId: safeTargetRoomId,
        targetRole: safeTargetRole,
        savedAt: Date.now()
      }));
    } catch (_) {}
  }

  function readStudentHistoryReturn() {
    try {
      const value = JSON.parse(sessionStorage.getItem(STUDENT_HISTORY_RETURN_KEY) || 'null');
      if (!value || typeof value !== 'object') return null;
      const url = String(value.url || '');
      const studentId = String(value.studentId || '').trim();
      const targetRoomId = String(value.targetRoomId || '').trim().toUpperCase();
      const targetRole = value.targetRole === 'student' ? 'student' : 'teacher';
      if (!url || !studentId || !targetRoomId) return null;
      if (Number(value.savedAt || 0) && Date.now() - Number(value.savedAt) > 12 * 60 * 60 * 1000) return null;
      return { url, studentId, targetRoomId, targetRole };
    } catch (_) { return null; }
  }

  function installStudentHistoryReturnButton() {
    const state = readStudentHistoryReturn();
    if (!state) return;
    const params = new URL(location.href).searchParams;
    const activeRoomId = String(params.get('room') || '').trim().toUpperCase();
    const activeRole = params.get('role') === 'student' ? 'student' : 'teacher';
    const historical = params.get('stay') === '1';
    if (!activeRoomId || activeRoomId !== state.targetRoomId) return;

    // P2-SPLIT-P2.5-P4-P1.2: grįžimo juosta priklauso tik tam vaizdui,
    // kuris buvo sąmoningai atidarytas iš mokinio kortelės. Grįžus į įprastą
    // mokytojo lentą (be stay=1) senas sessionStorage įrašas nebegali jos
    // klaidingai paversti „Mokinio vaizdu“.
    if (!historical && activeRole !== state.targetRole) {
      try { sessionStorage.removeItem(STUDENT_HISTORY_RETURN_KEY); } catch (_) {}
      return;
    }

    const app = document.getElementById('app');
    const workspace = document.getElementById('p2Workspace');
    if (!app || !workspace || document.getElementById('studentHistoryReturnBar')) return;

    const bar = document.createElement('div');
    bar.className = 'p2-history-return-bar';
    bar.id = 'studentHistoryReturnBar';
    bar.setAttribute('role', 'navigation');
    bar.setAttribute('aria-label', 'Grįžimas į mokinio kortelę');
    bar.innerHTML = `<div class="p2-history-return-context"><span aria-hidden="true">${historical ? '◷' : '◉'}</span><strong>${historical ? 'Istorinė pamoka' : 'Mokinio vaizdas'}</strong><code>${escapeHtml(activeRoomId)}</code></div>`;

    const button = document.createElement('button');
    button.className = 'p2-history-return-button';
    button.id = 'studentHistoryReturnButton';
    button.type = 'button';
    button.innerHTML = '<span aria-hidden="true">←</span><span>Grįžti į mokinio kortelę</span>';
    button.title = 'Grįžti į mokinio kortelę tame pačiame naršyklės skirtuke';
    button.addEventListener('click', () => {
      try {
        sessionStorage.setItem(STUDENT_CARD_REOPEN_KEY, state.studentId);
        // Grįžimo tikslas jau perduotas per STUDENT_CARD_REOPEN_KEY, todėl
        // seno vaizdo navigacijos įrašą išvalome dar prieš grįždami.
        sessionStorage.removeItem(STUDENT_HISTORY_RETURN_KEY);
      } catch (_) {}
      location.assign(state.url);
    });
    bar.appendChild(button);
    app.insertBefore(bar, workspace);
    document.body.classList.add('p2-student-history-nav-active');
  }

  function openHistoricalRoom(roomId, targetRole = 'teacher') {
    const safe = String(roomId || '').trim().toUpperCase();
    if (!safe) return;
    const target = targetRole === 'student' ? 'student' : 'teacher';
    const activeRoomId = currentRoomId();

    // P2-SPLIT-P2.5-P2: jei mokytojas iš kortelės atidaro būtent tą pačią
    // aktyvią lentą, jokios istorinės navigacijos nereikia. Tiesiog uždarome
    // kortelę, todėl URL lieka be stay=1 ir aktyvios sesijos funkcijos išlieka.
    if (safe === activeRoomId && target === role()) {
      if (studentsModal) studentsModal.hidden = true;
      return;
    }

    saveStudentHistoryReturn(selectedStudentId, safe, target);
    const isHistoricalRoom = safe !== activeRoomId;
    // Kitai (senesnei) Room pridedame stay=1, kad transition nenukreiptų į
    // naujesnę sesiją. Tos pačios aktyvios Room mokinio vaizdui stay nereikia.
    location.assign(historicalRoomUrl(safe, target, isHistoricalRoom));
  }

  installStudentHistoryReturnButton();

  function requestStudentDb(detail) {
    if (role() !== 'teacher') return;
    window.dispatchEvent(new CustomEvent('p2:students-request', { detail }));
  }

  function backupRestoreCount(value) {
    const number = Math.max(0, Number(value) || 0);
    return new Intl.NumberFormat('lt-LT').format(number);
  }

  function backupRestoreDate(value) {
    const date = value ? new Date(value) : null;
    if (!date || Number.isNaN(date.getTime())) return 'Data nenurodyta';
    try { return new Intl.DateTimeFormat('lt-LT', { dateStyle: 'medium', timeStyle: 'short' }).format(date); }
    catch (_) { return date.toLocaleString('lt-LT'); }
  }

  function closeBackupRestoreModal() {
    if (backupRestoreModal) backupRestoreModal.hidden = true;
    backupRestorePreview = null;
  }

  function ensureBackupRestoreModal() {
    if (backupRestoreModal) return backupRestoreModal;
    backupRestoreModal = document.createElement('div');
    backupRestoreModal.className = 'p2-backup-restore-modal';
    backupRestoreModal.hidden = true;
    backupRestoreModal.innerHTML = `
      <div class="p2-backup-restore-backdrop" data-backup-restore-close></div>
      <section class="p2-backup-restore-panel" role="dialog" aria-modal="true" aria-label="Atkurti atsarginę kopiją">
        <header class="p2-backup-restore-head">
          <div><span class="p2-side-kicker">DUOMENŲ SAUGA</span><h2>Atkurti atsarginę kopiją</h2><p>Pirmiausia patikriname failą. Duomenys į Firebase neįrašomi, kol aiškiai nepatvirtinsi atkūrimo.</p></div>
          <button type="button" data-backup-restore-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-backup-restore-body" id="p2BackupRestoreBody"></div>
      </section>`;
    document.body.appendChild(backupRestoreModal);
    backupRestoreModal.querySelectorAll('[data-backup-restore-close]').forEach(el => el.addEventListener('click', closeBackupRestoreModal));
    return backupRestoreModal;
  }

  function backupRestoreChangeKind(kind) {
    if (kind === 'rollback') return 'Grįš atgal';
    if (kind === 'forward') return 'Bus naujesnė';
    if (kind === 'restore') return 'Bus atkurta';
    if (kind === 'remove') return 'Nebebus bazėje';
    return 'Bus pakeista';
  }

  function backupRestoreChangeRows(items, limit = 8) {
    const list = Array.isArray(items) ? items.filter(Boolean) : [];
    const shown = list.slice(0, limit);
    const rows = shown.map(item => `<div class="p2-backup-restore-change-row is-${escapeHtml(String(item.kind || 'changed'))}"><span class="p2-backup-restore-change-badge">${escapeHtml(backupRestoreChangeKind(item.kind))}</span><div><strong>${escapeHtml(String(item.label || item.roomId || 'Įrašas'))}</strong><small>${escapeHtml(String(item.detail || 'Duomenys bus pakeisti.'))}</small></div></div>`).join('');
    const more = list.length > shown.length ? `<p class="p2-backup-restore-more">Ir dar ${backupRestoreCount(list.length - shown.length)} pakeitimai.</p>` : '';
    return rows + more;
  }

  function backupRestoreDiffHtml(changes = {}) {
    if (!changes || changes.hasChanges === false) {
      return `<section class="p2-backup-restore-nochanges"><span aria-hidden="true">✓</span><div><strong>Reikšmingų skirtumų nerasta</strong><p>Pasirinktos kopijos mokinių bazė ir joje esantys Room šiuo metu sutampa su Firebase būsena.</p></div></section>`;
    }
    const students = changes.students || {};
    const schedule = changes.schedule || {};
    const rooms = changes.rooms || {};
    const roomItems = Array.isArray(rooms.items) ? rooms.items : [];
    const risky = roomItems.filter(item => item?.kind === 'rollback');
    const otherRooms = roomItems.filter(item => item?.kind !== 'rollback');
    const studentCount = Math.max(0, Number(students.totalChanges || 0));
    const scheduleCount = Math.max(0, Number(schedule.totalChanges || 0));
    const roomCount = Math.max(0, Number(rooms.changed || 0)) + Math.max(0, Number(rooms.restored || 0));
    return `<section class="p2-backup-restore-diff">
      <div class="p2-backup-restore-diff-head"><div><strong>Kas konkrečiai pasikeis?</strong><p>Rodoma kryptis <b>dabar → pasirinkta kopija</b>.</p></div><div class="p2-backup-restore-diff-chips"><span>${backupRestoreCount(studentCount)} mokinių</span><span>${backupRestoreCount(scheduleCount)} tvarkaraščio</span><span>${backupRestoreCount(roomCount)} Room</span>${Number(rooms.progressBack || 0) ? `<span class="is-danger">${backupRestoreCount(rooms.progressBack)} progreso grįš atgal</span>` : ''}</div></div>
      ${risky.length ? `<div class="p2-backup-restore-change-group is-risk"><strong>Progresas, kuris bus grąžintas atgal</strong>${backupRestoreChangeRows(risky, 10)}</div>` : ''}
      ${(students.items || []).length ? `<div class="p2-backup-restore-change-group"><strong>Mokinių bazė</strong>${backupRestoreChangeRows(students.items, 8)}</div>` : ''}
      ${otherRooms.length ? `<div class="p2-backup-restore-change-group"><strong>Lentos ir pratybos</strong>${backupRestoreChangeRows(otherRooms, 10)}</div>` : ''}
      ${scheduleCount ? `<div class="p2-backup-restore-change-summary"><strong>Tvarkaraštis ir pamokų istorija</strong><span>${backupRestoreCount(schedule.entries?.changed?.length || 0)} pakeisti laikai · ${backupRestoreCount(schedule.entries?.added?.length || 0)} atkurti · ${backupRestoreCount(schedule.entries?.removed?.length || 0)} pašalinti</span><span>${backupRestoreCount(schedule.sessions?.changed?.length || 0)} pakeistos pamokos · ${backupRestoreCount(schedule.sessions?.added?.length || 0)} atkurtos · ${backupRestoreCount(schedule.sessions?.removed?.length || 0)} pašalintos</span></div>` : ''}
      ${Number(rooms.extra || 0) ? `<div class="p2-backup-restore-change-summary is-muted"><strong>${backupRestoreCount(rooms.extra)} dabartiniai Room kopijoje neegzistuoja</strong><span>Jų fiziniai duomenys Firebase nebus trinami, tačiau atkūrus senesnį profilį jie gali nebesimatyti mokinio istorijoje.</span></div>` : ''}
    </section>`;
  }

  function renderBackupRestorePreview(detail = {}) {
    const modal = ensureBackupRestoreModal();
    const body = modal.querySelector('#p2BackupRestoreBody');
    if (!body) return;
    backupRestorePreview = detail;
    const backup = detail.backupCounts || {};
    const current = detail.currentCounts || {};
    const warnings = Array.isArray(detail.warnings) ? detail.warnings.filter(Boolean) : [];
    body.innerHTML = `
      <section class="p2-backup-restore-file">
        <div><span>Pasirinktas failas</span><strong>${escapeHtml(detail.fileName || 'Atsarginė kopija')}</strong><small>${escapeHtml(backupRestoreDate(detail.exportedAtIso || detail.exportedAt))} · ${escapeHtml(detail.appBuild || 'versija nenurodyta')}</small></div>
        <span class="p2-backup-restore-ok">✓ Failas patikrintas</span>
      </section>
      <div class="p2-backup-restore-compare">
        <section><span>Atsarginėje kopijoje</span><strong>${backupRestoreCount(backup.students)} mok.</strong><small>${backupRestoreCount(backup.scheduleEntries)} laikai · ${backupRestoreCount(backup.classSessions)} pamokos · ${backupRestoreCount(backup.rooms)} Room</small></section>
        <span class="p2-backup-restore-arrow" aria-hidden="true">→</span>
        <section><span>Dabar Firebase</span><strong>${backupRestoreCount(current.students)} mok.</strong><small>${backupRestoreCount(current.scheduleEntries)} laikai · ${backupRestoreCount(current.classSessions)} pamokos · ${backupRestoreCount(current.rooms)} Room</small></section>
      </div>
      ${backupRestoreDiffHtml(detail.changes || {})}
      ${warnings.length ? `<div class="p2-backup-restore-warnings"><strong>Prieš atkuriant</strong>${warnings.map(text => `<p>• ${escapeHtml(text)}</p>`).join('')}</div>` : ''}
      <div class="p2-backup-restore-policy">
        <strong>Kas bus daroma?</strong>
        <p>Mokinių bazė, tvarkaraštis ir pamokų istorija bus grąžinti į pasirinktos kopijos būseną. Kopijoje esantys Room atkurs savo lentą ir pratybų progresą.</p>
        <p><b>Saugiklis:</b> prieš įrašymą programa automatiškai atsisiųs dar vieną dabartinės būsenos kopiją „prieš atkūrimą“. Room, kurių pasirinktoje kopijoje nėra, fiziškai nebus ištrinami.</p>
      </div>
      <label class="p2-backup-restore-confirm"><input type="checkbox" id="p2BackupRestoreConfirm"> <span>Suprantu, kad dabartinė mokinių bazės būsena bus pakeista pasirinktos atsarginės kopijos būsena.</span></label>
      <div class="p2-backup-restore-actions"><button type="button" class="p2-secondary" data-backup-restore-close-action>Atšaukti</button><button type="button" class="p2-primary p2-backup-restore-apply" data-backup-restore-apply disabled>Atkurti šią kopiją</button></div>`;
    const checkbox = body.querySelector('#p2BackupRestoreConfirm');
    const apply = body.querySelector('[data-backup-restore-apply]');
    checkbox?.addEventListener('change', () => { if (apply) apply.disabled = !checkbox.checked; });
    body.querySelector('[data-backup-restore-close-action]')?.addEventListener('click', closeBackupRestoreModal);
    apply?.addEventListener('click', () => {
      if (!checkbox?.checked || !backupRestorePreview) return;
      apply.disabled = true;
      apply.textContent = 'Atkuriama…';
      body.querySelector('[data-backup-restore-close-action]')?.setAttribute('disabled', '');
      window.dispatchEvent(new CustomEvent('p2:restore-apply-request'));
    });
    modal.hidden = false;
  }

  function beginBackupRestoreFileSelection() {
    if (role() !== 'teacher') return;
    if (!backupRestoreFileInput) {
      backupRestoreFileInput = document.createElement('input');
      backupRestoreFileInput.type = 'file';
      backupRestoreFileInput.accept = '.json,application/json';
      backupRestoreFileInput.hidden = true;
      document.body.appendChild(backupRestoreFileInput);
      backupRestoreFileInput.addEventListener('change', async () => {
        const file = backupRestoreFileInput.files?.[0] || null;
        backupRestoreFileInput.value = '';
        if (!file) return;
        if (file.size > 25 * 1024 * 1024) {
          window.alert('Atsarginės kopijos failas per didelis. Didžiausias leidžiamas dydis – 25 MB.');
          return;
        }
        try {
          const text = await file.text();
          window.dispatchEvent(new CustomEvent('p2:restore-preview-request', { detail: { fileName: file.name, text } }));
        } catch (_) {
          window.alert('Nepavyko perskaityti pasirinkto failo.');
        }
      });
    }
    backupRestoreFileInput.click();
  }

  function ensureStudentsModal() {
    if (studentsModal) return studentsModal;
    studentsModal = document.createElement('div');
    studentsModal.className = 'p2-students-modal';
    studentsModal.hidden = true;
    studentsModal.innerHTML = `
      <div class="p2-students-backdrop" data-students-close></div>
      <section class="p2-students-panel" role="dialog" aria-modal="true" aria-label="Mokiniai">
        <header class="p2-students-header">
          <div><span class="p2-side-kicker">MOKINIŲ DUOMENŲ BAZĖ</span><h2>Mokiniai</h2><p>Pamokos, jų eiga, pratybos ir mokinio darbas.</p></div>
          <button type="button" data-students-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-students-body" id="p2StudentsBody"></div>
      </section>`;
    document.body.appendChild(studentsModal);
    studentsModal.querySelectorAll('[data-students-close]').forEach(el => el.addEventListener('click', () => { studentsModal.hidden = true; }));
    return studentsModal;
  }

  function lessonHistoryForStudent(student) {
    return Object.entries(student?.lessons && typeof student.lessons === 'object' ? student.lessons : {})
      // P1.7.9.18: klaidingai vėliau sukurto tuščio Room metaduomenų netriname,
      // bet pataisymo migracija gali jį pažymėti kaip paslėptą dublikatą. Taip
      // atsarginėje kopijoje išlieka audito pėdsakas, o mokinio istorijoje
      // rodomas tik tikrasis pamokos Room.
      .filter(([, item]) => !(item && typeof item === 'object' && item.historyHidden === true))
      .map(([roomId, item]) => ({ roomId, ...(item && typeof item === 'object' ? item : {}) }))
      .sort((a, b) => Number(b.createdAt || b.linkedAt || 0) - Number(a.createdAt || a.linkedAt || 0));
  }

  function studentProgressLabel(lesson) {
    const summary = lesson?.summary && typeof lesson.summary === 'object' ? lesson.summary : {};
    const taskCount = Math.max(0, Number(lesson?.taskCount || summary.taskCount || 0));
    const finished = Math.max(0, Number(summary.finished || 0));
    if (!lesson?.lessonId) return 'Lenta be pratybų';
    if (!taskCount) return summary.status === 'completed' ? 'Baigta' : 'Pratybos priskirtos';
    return `${finished} / ${taskCount}${summary.status === 'completed' ? ' · baigta' : ''}`;
  }

  function studentHistoryCacheKey(studentId, roomId) {
    return `${String(studentId || '').trim()}::${String(roomId || '').trim().toUpperCase()}`;
  }

  function studentLessonScheduleMeta(lesson) {
    const session = teacherStudentDb.classSessions?.[lesson?.classSessionId] || {};
    // P1.7.9.18: pirmiausia naudojame classSession metaduomenis, bet turime
    // saugų fallback į patį mokinio pamokos įrašą. Naujesnės schedule pamokos
    // šiuos laukus turi abiejose vietose, todėl statusas nepriklauso nuo to,
    // kuri Firebase šaka buvo užkrauta pirmiau.
    const dateKey = String(session.scheduleDate || lesson?.scheduleDate || '').trim();
    const start = String(session.scheduledStart || lesson?.scheduledStart || '').trim();
    const duration = Math.max(0, Number(session.durationMinutes || lesson?.durationMinutes || 0));
    let dateLabel = '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
      try {
        const [year, month, day] = dateKey.split('-').map(Number);
        dateLabel = new Intl.DateTimeFormat('lt-LT', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(year, month - 1, day));
      } catch (_) { dateLabel = dateKey; }
    }
    return { dateKey, dateLabel, start, duration };
  }

  function studentLessonWhenLabel(lesson) {
    const schedule = studentLessonScheduleMeta(lesson);
    const parts = [];
    if (schedule.dateLabel) parts.push(schedule.dateLabel);
    if (schedule.start) parts.push(schedule.start);
    if (schedule.duration) parts.push(`${schedule.duration} min.`);
    if (parts.length) return parts.join(' · ');
    return formatStudentDate(lesson?.createdAt || lesson?.linkedAt);
  }

  function studentLessonOccurrenceState(lesson, now = new Date()) {
    const schedule = studentLessonScheduleMeta(lesson);
    return scheduleOccurrenceStateFromParts(schedule.dateKey, schedule.start, schedule.duration, now);
  }

  // P2-SPLIT-P2.5-P4-P1.7.8.1: būsimos mokinio pamokos skaičiuojamos ne iš
  // paties pamokos laiko, o iš konkrečių mokinio priskyrimų tam laikui.
  function studentScheduleNextOccurrence(entry, studentId, now = new Date()) {
    const id = String(studentId || '').trim();
    if (!id) return null;
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    for (let offset = 0; offset <= 180; offset += 1) {
      const date = new Date(from.getTime());
      date.setDate(from.getDate() + offset);
      const dateKey = localDateKey(date);
      const active = scheduleActiveAssignments(entry, dateKey).find(item => item.studentId === id);
      if (!active) continue;
      const time = scheduleSlotTimeForDate(entry, dateKey);
      const startMinutes = scheduleTimeToMinutes(time?.start);
      if (startMinutes === null) continue;
      const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      if (next.getTime() > now.getTime()) return { nextAt: next, dateKey, assignment: active, time };
    }
    return null;
  }

  function studentUpcomingScheduleLessons(studentId) {
    const id = String(studentId || '').trim();
    if (!id) return [];
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
    const result = [];
    for (let offset = 0; offset <= 120; offset += 1) {
      const date = new Date(from.getTime());
      date.setDate(from.getDate() + offset);
      const dateKey = localDateKey(date);
      for (const entry of scheduleEntriesList()) {
        const assignment = scheduleActiveAssignments(entry, dateKey).find(item => item.studentId === id);
        if (!assignment) continue;
        const time = scheduleSlotTimeForDate(entry, dateKey);
        const startMinutes = scheduleTimeToMinutes(time?.start);
        if (startMinutes === null) continue;
        const nextAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
        if (nextAt.getTime() <= now.getTime()) continue;
        result.push({ ...entry, occurrenceDateKey: dateKey, nextAt, attendanceMode: scheduleMode(assignment), attendanceAssignmentId: assignment.id, start: time.start, durationMinutes: time.durationMinutes, day: time.day });
      }
    }
    return result.sort((a, b) => a.nextAt.getTime() - b.nextAt.getTime()).slice(0, 24);
  }

  function studentScheduledLessonWhenLabel(entry) {
    const dateKey = String(entry?.occurrenceDateKey || '').trim();
    const date = entry?.nextAt instanceof Date ? entry.nextAt : scheduleDateFromKey(dateKey);
    if (!date) return 'Laikas nenurodytas';
    let dateText = '';
    try { dateText = new Intl.DateTimeFormat('lt-LT', { weekday: 'long', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date); }
    catch (_) { dateText = date.toLocaleDateString('lt-LT'); }
    const duration = Math.max(15, Math.min(180, Math.round(Number(entry?.durationMinutes) || 40)));
    return `${dateText} · ${String(entry?.start || '').trim() || '—'} · ${duration} min.`;
  }


  function studentPracticeLabel(source) {
    const lessonId = String(source?.lessonId || '').trim();
    const catalog = lessonId ? lessonForId(lessonId) : null;
    const title = String(source?.practiceTitle || source?.title || catalog?.shortTitle || '').trim();
    const taskCount = Math.max(0, Number(source?.taskCount || catalog?.taskCount || 0));
    if (!lessonId && !title) return 'Tik lenta';
    return `${title || 'Pratybos'}${taskCount ? ` · ${taskCount} užd.` : ''}`;
  }

  function studentLessonStatus(lesson) {
    const summary = lesson?.summary && typeof lesson.summary === 'object' ? lesson.summary : {};
    if (!lesson?.lessonId) return { key: 'board', label: 'Tik lenta' };
    if (summary.status === 'completed') return { key: 'completed', label: 'Pratybos baigtos' };
    if (summary.status === 'in_progress') return { key: 'progress', label: 'Pratybos nebaigtos' };
    return { key: 'not-started', label: 'Pratybos nepradėtos' };
  }

  function studentLessonResultText(lesson) {
    const summary = lesson?.summary && typeof lesson.summary === 'object' ? lesson.summary : {};
    const taskCount = Math.max(0, Number(lesson?.taskCount || summary.taskCount || 0));
    if (!lesson?.lessonId) return 'Pratybos nepriskirtos';
    if (!taskCount) return 'Pratybos priskirtos';
    const finished = Math.max(0, Number(summary.finished || 0));
    const percent = Math.max(0, Math.min(100, Number(summary.percent || 0)));
    return `${finished} / ${taskCount} · ${Math.round(percent)} %`;
  }

  function historicalTaskStatus(state) {
    const item = state && typeof state === 'object' ? state : {};
    if (item.solved) {
      if (item.hintUsed) return { key: 'help', label: 'Su pagalba' };
      if (Number(item.attempts || 0) > 1 || item.status === 'help') return { key: 'help', label: 'Po kelių bandymų' };
      return { key: 'good', label: 'Savarankiškai' };
    }
    if (item.status === 'repeat') return { key: 'repeat', label: 'Kartoti' };
    if (Number(item.attempts || 0) > 0 || item.openedAt) return { key: 'started', label: 'Pradėta' };
    return { key: 'pending', label: 'Nepradėta' };
  }

  function historicalTaskAnswer(state) {
    const item = state && typeof state === 'object' ? state : {};
    const direct = String(item.lastAnswer ?? item.liveAnswer ?? '').trim();
    if (direct) return direct;
    const expression = item.lastExpression || item.liveExpression;
    if (expression && typeof expression === 'object') {
      const value = String(expression.answer || expression.answerLatex || '').trim();
      if (value) return value;
    }
    const solution = item.lastSolution || item.liveSolution;
    if (solution && typeof solution === 'object' && Array.isArray(solution.steps)) {
      const values = solution.steps
        .map(step => Array.isArray(step?.values) ? step.values.map(value => String(value || '').trim()).filter(Boolean).join(' arba ') : '')
        .filter(Boolean);
      if (values.length) return values.join(' → ');
    }
    return '';
  }

  function historicalProgressStats(progressValue, tasks) {
    const states = progressValue?.taskStates && typeof progressValue.taskStates === 'object' ? progressValue.taskStates : {};
    let good = 0, help = 0, repeat = 0, started = 0;
    for (const task of tasks) {
      const status = historicalTaskStatus(states[task?.id]);
      if (status.key === 'good') good += 1;
      else if (status.key === 'help') help += 1;
      else if (status.key === 'repeat') repeat += 1;
      else if (status.key === 'started') started += 1;
    }
    const finished = good + help + repeat;
    return { good, help, repeat, started, finished, taskCount: tasks.length };
  }

  function studentRoomPracticeRuns(lesson, payload) {
    const runs = [];
    const metadataByKey = lesson?.assignments && typeof lesson.assignments === 'object' ? lesson.assignments : {};
    const seen = new Set();
    const addRun = (assignmentValue, progressValue, extra = {}) => {
      const assignmentRecord = assignmentValue && typeof assignmentValue === 'object' ? assignmentValue : {};
      const key = String(assignmentRecord.assignmentKey || extra.assignmentKey || '').trim();
      const metadata = (key && metadataByKey[key] && typeof metadataByKey[key] === 'object') ? metadataByKey[key] : {};
      const combinedAssignment = { ...metadata, ...assignmentRecord };
      if ((!combinedAssignment.contentSnapshot || typeof combinedAssignment.contentSnapshot !== 'object') && metadata.contentSnapshot) combinedAssignment.contentSnapshot = metadata.contentSnapshot;
      if ((!Array.isArray(combinedAssignment.taskIds) || !combinedAssignment.taskIds.length) && Array.isArray(metadata.taskIds)) combinedAssignment.taskIds = metadata.taskIds;
      const storedProgress = metadata.latestProgress && typeof metadata.latestProgress === 'object'
        ? metadata.latestProgress
        : (metadata.progressSnapshot && typeof metadata.progressSnapshot === 'object' ? metadata.progressSnapshot : null);
      const identity = key || `${combinedAssignment.lessonId || lesson?.lessonId || 'lesson'}-${combinedAssignment.assignedAt || extra.archivedAt || runs.length}`;
      if (seen.has(identity)) return;
      seen.add(identity);
      runs.push({
        assignmentKey: key,
        assignment: combinedAssignment,
        progress: progressValue && typeof progressValue === 'object' ? progressValue : storedProgress,
        archivedAt: Number(extra.archivedAt || 0),
        current: Boolean(extra.current)
      });
    };

    const archived = payload?.history && typeof payload.history === 'object' ? payload.history : {};
    for (const [key, value] of Object.entries(archived)) {
      if (!value || typeof value !== 'object') continue;
      addRun(value.assignment || metadataByKey[key] || {}, value.progress || null, { assignmentKey: key, archivedAt: value.lastArchivedAt || value.archivedAt || 0 });
    }
    if (payload?.assignment && typeof payload.assignment === 'object') {
      addRun(payload.assignment, payload.progress || null, { assignmentKey: payload.assignment.assignmentKey || lesson?.currentAssignmentKey || lesson?.assignmentKey || '', current: true });
    }
    // Labai seniems įrašams bent parodome išsaugotą turinio snapshot metaduomenį,
    // net jei Room eigos duomenys nebepasiekiami.
    if (!runs.length) {
      for (const [key, metadata] of Object.entries(metadataByKey)) {
        const storedProgress = metadata?.latestProgress && typeof metadata.latestProgress === 'object' ? metadata.latestProgress : null;
        addRun(metadata, storedProgress, { assignmentKey: key });
      }
    }
    return runs.sort((a, b) => Number(b.assignment?.assignedAt || b.archivedAt || 0) - Number(a.assignment?.assignedAt || a.archivedAt || 0));
  }

  function renderHistoricalPracticeRun(run, lesson, runIndex) {
    const assignmentRecord = run?.assignment && typeof run.assignment === 'object' ? run.assignment : {};
    const snapshot = assignmentRecord.contentSnapshot && typeof assignmentRecord.contentSnapshot === 'object' ? assignmentRecord.contentSnapshot : null;
    const tasks = Array.isArray(snapshot?.tasks) ? snapshot.tasks : [];
    const hasProgress = Boolean(run?.progress && typeof run.progress === 'object');
    const states = hasProgress && run.progress.taskStates && typeof run.progress.taskStates === 'object' ? run.progress.taskStates : {};
    const latestSummary = assignmentRecord.latestSummary && typeof assignmentRecord.latestSummary === 'object' ? assignmentRecord.latestSummary : {};
    const stats = hasProgress ? historicalProgressStats(run.progress, tasks) : {
      good: Math.max(0, Number(latestSummary.good || latestSummary.solved || 0)),
      help: Math.max(0, Number(latestSummary.help || 0)),
      repeat: Math.max(0, Number(latestSummary.repeat || 0)),
      started: 0,
      finished: Math.max(0, Number(latestSummary.finished || 0)),
      taskCount: tasks.length || Math.max(0, Number(latestSummary.taskCount || assignmentRecord.taskCount || 0))
    };
    const title = assignmentRecord.title || snapshot?.shortTitle || snapshot?.title || lesson?.title || 'Pratybos';
    const version = Math.max(1, Number(assignmentRecord.contentVersion || snapshot?.contentVersion || lesson?.contentVersion || 1));
    const assignedAt = Number(assignmentRecord.assignedAt || 0);
    const runMeta = [assignedAt ? formatStudentDate(assignedAt) : '', `turinio v${version}`, run.assignmentKey ? `ID ${run.assignmentKey}` : ''].filter(Boolean).join(' · ');

    let tasksMarkup = '';
    if (tasks.length && hasProgress) {
      tasksMarkup = `<div class="p2-history-task-table">${tasks.map((task, index) => {
        const state = states[task?.id] && typeof states[task.id] === 'object' ? states[task.id] : {};
        const status = historicalTaskStatus(state);
        const answer = historicalTaskAnswer(state);
        const attempts = Math.max(0, Number(state.attempts || 0));
        const taskTitle = task?.title || task?.label || `Užduotis ${index + 1}`;
        const prompt = String(task?.prompt || '').trim();
        return `<article class="p2-history-task-row is-${escapeHtml(status.key)}">
          <span class="p2-history-task-number">${index + 1}</span>
          <div class="p2-history-task-copy"><strong>${escapeHtml(taskTitle)}</strong>${prompt ? `<small>${escapeHtml(prompt)}</small>` : ''}${answer ? `<p><span>Mokinio atsakymas</span>${escapeHtml(answer)}</p>` : ''}</div>
          <div class="p2-history-task-result"><span class="p2-history-task-status is-${escapeHtml(status.key)}">${escapeHtml(status.label)}</span><small>${attempts ? `${attempts} ${attempts === 1 ? 'bandymas' : 'bandymai'}` : 'Be bandymų'}${state.hintUsed ? ' · naudota pagalba' : ''}</small></div>
        </article>`;
      }).join('')}</div>`;
    } else if (tasks.length) {
      tasksMarkup = `<div class="p2-history-answer-pending"><strong>Užduočių turinys jau pasiekiamas.</strong><span>Individualūs mokinio atsakymai saugomi atskirai ir tikrinami fone. Kol kas rodoma išsaugota pamokos suvestinė.</span></div>`;
    } else {
      tasksMarkup = `<div class="p2-history-no-snapshot"><strong>Užduočių tekstai šiame įraše neišsaugoti.</strong><span>Rezultato santrauka liko istorijoje, tačiau senam priskyrimui nėra turinio snapshot.</span></div>`;
    }

    const summaryMarkup = (tasks.length || stats.taskCount) ? `<div class="p2-history-run-stats">
      <div><span>Savarankiškai</span><strong>${stats.good}</strong></div>
      <div><span>Su pagalba</span><strong>${stats.help}</strong></div>
      <div><span>Kartoti</span><strong>${stats.repeat}</strong></div>
      <div><span>Baigta</span><strong>${stats.finished} / ${stats.taskCount}</strong></div>
    </div>` : '';

    return `<section class="p2-history-practice-run ${runIndex ? 'is-older' : ''}">
      <div class="p2-history-practice-head"><div><strong>${escapeHtml(title)}</strong><small>${escapeHtml(runMeta)}</small></div>${run.current ? '<span>Dabartinė versija</span>' : ''}</div>
      ${summaryMarkup}
      ${tasksMarkup}
    </section>`;
  }

  function storedStudentRoomHistoryPayload(lesson) {
    const metadataByKey = lesson?.assignments && typeof lesson.assignments === 'object' ? lesson.assignments : {};
    const keys = Object.keys(metadataByKey);
    const currentKey = String(lesson?.currentAssignmentKey || lesson?.assignmentKey || keys[0] || '').trim();
    const currentMetadata = currentKey && metadataByKey[currentKey] && typeof metadataByKey[currentKey] === 'object' ? metadataByKey[currentKey] : null;
    const currentProgress = currentMetadata?.latestProgress && typeof currentMetadata.latestProgress === 'object'
      ? currentMetadata.latestProgress
      : (lesson?.latestProgress && typeof lesson.latestProgress === 'object' ? lesson.latestProgress : null);
    const history = {};
    for (const [key, metadata] of Object.entries(metadataByKey)) {
      if (key === currentKey || !metadata || typeof metadata !== 'object') continue;
      history[key] = {
        assignment: metadata,
        progress: metadata.latestProgress && typeof metadata.latestProgress === 'object' ? metadata.latestProgress : null,
        archivedAt: Number(metadata.archivedMetadataAt || metadata.assignedAt || 0)
      };
    }
    return {
      assignment: currentMetadata,
      progress: currentProgress,
      history,
      fetchedAt: Number(currentProgress?.updatedAt || currentMetadata?.lastProgressAt || lesson?.updatedAt || 0),
      stored: true
    };
  }

  function renderStudentRoomHistoryDetails(student, lesson) {
    if (!student || !lesson || expandedStudentHistoryRoomId !== lesson.roomId) return '';
    const key = studentHistoryCacheKey(student.id, lesson.roomId);
    const cached = studentRoomHistoryCache.get(key);
    const storedPayload = storedStudentRoomHistoryPayload(lesson);
    const payload = cached?.data && typeof cached.data === 'object' ? cached.data : storedPayload;
    const runs = studentRoomPracticeRuns(lesson, payload);
    const boardHint = `<div class="p2-history-board-hint"><div><span aria-hidden="true">✎</span><div><strong>Pamokos lenta saugoma Room ${escapeHtml(lesson.roomId)}</strong><small>Atidaręs pamoką pamatysi jos lentą ir, jei buvo priskirtos, pratybas.</small></div></div><button type="button" data-student-open-room="${escapeHtml(lesson.roomId)}" data-room-role="teacher">Atidaryti pamoką</button></div>`;

    let syncStatus = '';
    if (cached?.fetching) {
      syncStatus = `<div class="p2-history-sync-status is-checking"><span class="p2-history-loader" aria-hidden="true"></span><div><strong>Tikrinamos individualių atsakymų detalės…</strong><small>Tikrinimas baigsis ne vėliau kaip po 6 sekundžių. Pamokos suvestinė jau rodoma žemiau.</small></div></div>`;
    } else if (cached?.error) {
      syncStatus = `<div class="p2-history-sync-status is-warning"><div><strong>Rodoma išsaugota pamokos suvestinė.</strong><small>${escapeHtml(cached.error)}</small></div><button type="button" data-student-history-retry="${escapeHtml(lesson.roomId)}">Tikrinti dar kartą</button></div>`;
    } else if (cached?.data && !cached.provisional) {
      syncStatus = `<div class="p2-history-sync-status is-ready"><span aria-hidden="true">✓</span><div><strong>Pamokos eiga įkelta.</strong><small>Individualūs atsakymai ir bandymai yra atnaujinti.</small></div></div>`;
    }

    if (!lesson.lessonId && !runs.length) {
      return `<div class="p2-student-history-detail">${boardHint}${syncStatus}<div class="p2-history-no-snapshot"><strong>Šioje pamokoje pratybos nebuvo priskirtos.</strong><span>Istorijoje lieka pati lenta ir pamokos ryšys su mokiniu.</span></div></div>`;
    }
    return `<div class="p2-student-history-detail">${boardHint}${syncStatus}${runs.length ? runs.map((run, index) => renderHistoricalPracticeRun(run, lesson, index)).join('') : `<div class="p2-history-no-snapshot"><strong>Pratybų eigos duomenų šiame įraše nerasta.</strong><span>Pamokos santrauka vis tiek lieka mokinio istorijoje.</span></div>`}</div>`;
  }

  function requestStudentRoomHistory(studentId, roomId, force = false) {
    const normalizedStudentId = String(studentId || '').trim();
    const normalizedRoomId = String(roomId || '').trim().toUpperCase();
    if (!normalizedStudentId || !normalizedRoomId) return;
    const key = studentHistoryCacheKey(normalizedStudentId, normalizedRoomId);
    const existing = studentRoomHistoryCache.get(key);
    if (!force && existing && (existing.fetching || (existing.data && !existing.provisional))) return;

    const student = teacherStudentDb.students?.[normalizedStudentId] || null;
    const lesson = student?.lessons?.[normalizedRoomId] || null;
    const storedPayload = storedStudentRoomHistoryPayload(lesson);

    const currentRoom = String(currentRoomId() || '').trim().toUpperCase();
    const currentStudent = currentRoom ? linkedStudentIdForRoom(currentRoom) : '';
    const canSeedFromLiveState = !force
      && normalizedRoomId === currentRoom
      && currentStudent === normalizedStudentId
      && assignment && typeof assignment === 'object'
      && progress && typeof progress === 'object';

    const seededData = canSeedFromLiveState
      ? { assignment, progress, history: storedPayload.history || {}, fetchedAt: Date.now(), stored: false }
      : (existing?.data || storedPayload);

    studentRoomHistoryCache.set(key, {
      loading: false,
      fetching: true,
      provisional: true,
      error: '',
      data: seededData
    });

    const previousTimer = studentRoomHistoryRequestTimers.get(key);
    if (previousTimer) window.clearTimeout(previousTimer);
    const timer = window.setTimeout(() => {
      const current = studentRoomHistoryCache.get(key);
      if (!current?.fetching) return;
      studentRoomHistoryCache.set(key, {
        ...current,
        loading: false,
        fetching: false,
        provisional: true,
        error: 'Room neatsakė per 6 sekundes. Gali naudoti jau rodomą išsaugotą suvestinę arba bandyti dar kartą.'
      });
      studentRoomHistoryRequestTimers.delete(key);
      if (selectedStudentId === normalizedStudentId && expandedStudentHistoryRoomId === normalizedRoomId) renderStudentsModal();
    }, STUDENT_HISTORY_TIMEOUT_MS);
    studentRoomHistoryRequestTimers.set(key, timer);

    requestStudentDb({ action: 'get-room-history', studentId: normalizedStudentId, roomId: normalizedRoomId });
  }

  function prefetchStudentRoomHistories(student, limit = 1) {
    if (!student?.id) return;
    const lessons = lessonHistoryForStudent(student).slice(0, Math.max(0, Number(limit) || 0));
    lessons.forEach(lesson => {
      const roomId = String(lesson?.roomId || '').trim().toUpperCase();
      if (roomId) requestStudentRoomHistory(student.id, roomId);
    });
  }

  function renderStudentsModal() {
    if (!studentsModal || studentsModal.hidden) return;
    const host = studentsModal.querySelector('#p2StudentsBody');
    if (!host) return;
    const students = studentList();
    const visibleStudents = filteredStudentList(students);
    const roomId = currentRoomId();
    const linkedStudentId = linkedStudentIdForRoom(roomId);
    if (selectedStudentId && !teacherStudentDb.students?.[selectedStudentId]) { selectedStudentId = null; studentEditOpen = false; }
    const selected = selectedStudentId ? teacherStudentDb.students[selectedStudentId] : null;
    const history = selected ? lessonHistoryForStudent(selected) : [];
    const currentLesson = selected?.lessons?.[roomId] || null;
    const selectedOwnsActiveRoom = Boolean(selected && roomId && (linkedStudentId === selectedStudentId || currentLesson));
    const defaultLessonId = selectedOwnsActiveRoom ? (currentLesson?.lessonId || assignment?.lessonId || '') : '';
    const classSessionId = linkedClassSessionIdForRoom(roomId);
    const classParticipants = classSessionParticipants(classSessionId);
    const selectedClassParticipant = classParticipants.find(item => item.studentId === selectedStudentId) || null;

    const presentGrades = Array.from(new Set(students.map(student => studentGradeValue(student.grade)).filter(Boolean))).sort((a, b) => a - b);
    const hasUngraded = students.some(student => !studentGradeValue(student.grade));
    const validGradeFilters = new Set(['all', ...presentGrades.map(String), ...(hasUngraded ? ['none'] : [])]);
    if (!validGradeFilters.has(studentGradeFilter)) studentGradeFilter = 'all';
    const gradeFilterOptions = [
      '<option value="all">Visos klasės</option>',
      ...presentGrades.map(grade => `<option value="${grade}" ${studentGradeFilter === String(grade) ? 'selected' : ''}>${grade} klasė</option>`),
      ...(hasUngraded ? [`<option value="none" ${studentGradeFilter === 'none' ? 'selected' : ''}>Klasė nenurodyta</option>`] : [])
    ].join('').replace('value="all"', `value="all" ${studentGradeFilter === 'all' ? 'selected' : ''}`);

    const grouped = new Map();
    for (const student of visibleStudents) {
      const grade = studentGradeValue(student.grade);
      const key = grade ? String(grade) : 'none';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(student);
    }
    const groupEntries = Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === 'none') return 1;
      if (b === 'none') return -1;
      return Number(a) - Number(b);
    });

    const overviewMarkup = groupEntries.length ? groupEntries.map(([gradeKey, groupStudents]) => {
      const heading = gradeKey === 'none' ? 'Klasė nenurodyta' : `${gradeKey} klasė`;
      const cards = groupStudents.map(student => {
        const count = lessonHistoryForStudent(student).length;
        const duplicate = studentSameNameGradeGroup(student, students).length > 1;
        const guardian = studentGuardianLabel(student);
        const current = linkedStudentId === student.id;
        const identity = duplicate ? (guardian || 'reikia identifikatoriaus') : guardian;
        const meta = [identity, `${count} ${count === 1 ? 'pamoka' : 'pamokos'}`, current ? 'dabartinė sesija' : ''].filter(Boolean).join(' · ');
        const initial = String(student.name || 'M').trim().slice(0, 1).toUpperCase() || 'M';
        return `<button class="p2-student-overview-card" type="button" data-student-select="${escapeHtml(student.id)}">
          <span class="p2-student-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
          <span class="p2-student-overview-copy"><strong>${escapeHtml(student.name || 'Mokinys')}</strong><small class="${duplicate && !guardian ? 'needs-id' : ''}">${escapeHtml(meta || 'Mokinio kortelė')}</small></span>
          <span class="p2-student-overview-open" aria-hidden="true">›</span>
        </button>`;
      }).join('');
      return `<section class="p2-student-overview-group"><div class="p2-student-overview-heading"><div><span class="p2-label">${escapeHtml(heading)}</span><strong>${groupStudents.length} ${groupStudents.length === 1 ? 'mokinys' : 'mokiniai'}</strong></div></div><div class="p2-student-overview-grid">${cards}</div></section>`;
    }).join('') : (students.length
      ? `<div class="p2-students-empty is-overview"><strong>Mokinių nerasta</strong><span>Pakeisk paiešką arba klasės filtrą.</span></div>`
      : `<div class="p2-students-empty is-overview"><strong>Dar nėra mokinių</strong><span>Paspausk „Naujas mokinys“ ir sukurk pirmą kortelę.</span></div>`);


    const gradeOptions = (selectedGrade = 0) => `<option value="">—</option>${Array.from({ length: 12 }, (_, index) => index + 1).map(grade => `<option value="${grade}" ${grade === selectedGrade ? 'selected' : ''}>${grade}</option>`).join('')}`;
    const guardianRelationOptions = selectedRelation => {
      const relation = studentGuardianRelation(selectedRelation);
      return `<option value="">— Nenurodyta —</option><option value="mama" ${relation === 'mama' ? 'selected' : ''}>Mama</option><option value="tėtis" ${relation === 'tėtis' ? 'selected' : ''}>Tėtis</option><option value="kita" ${relation === 'kita' ? 'selected' : ''}>Kita</option>`;
    };

    let detailMarkup = `
      <section class="p2-students-overview">
        <div class="p2-students-overview-head">
          <div><span class="p2-label">Mokinių bazė</span><h3>Mokinių sąrašas</h3><p>${visibleStudents.length === students.length ? `${students.length} ${students.length === 1 ? 'mokinys' : 'mokiniai'}` : `Rodoma ${visibleStudents.length} iš ${students.length}`}</p></div>
          <button type="button" class="p2-primary" data-student-create-open>＋ Naujas mokinys</button>
        </div>
        <div class="p2-students-overview-toolbar">
          <div class="p2-students-overview-filters">
            <label class="p2-student-search"><span aria-hidden="true">⌕</span><input id="p2StudentSearch" value="${escapeHtml(studentSearchQuery)}" placeholder="Ieškoti mokinio…" autocomplete="off"></label>
            <select id="p2StudentGradeFilter" aria-label="Filtruoti pagal klasę">${gradeFilterOptions}</select>
          </div>
          <div class="p2-students-overview-actions">
            <span class="p2-student-overview-summary">${presentGrades.length ? `${presentGrades.length} ${presentGrades.length === 1 ? 'klasė' : 'klasės'}` : 'Klasės dar nenurodytos'}</span>
            <button type="button" class="p2-secondary p2-student-backup-inline" data-student-backup title="Atsisiųsti mokinių bazės, susietų pamokų ir mokytojo profilio atkūrimo kopiją">↓ Atsarginė kopija</button>
            <button type="button" class="p2-secondary p2-student-restore-inline" data-student-restore title="Atkurti duomenis arba po naršyklės duomenų išvalymo vėl prijungti mokytojo profilį">↥ Atkurti</button>
          </div>
        </div>
        <div class="p2-students-overview-groups">${overviewMarkup}</div>
      </section>`;

    if (studentCreateOpen) {
      detailMarkup = `
        <section class="p2-student-create-page">
          <div class="p2-student-page-head">
            <button type="button" class="p2-back-link" data-student-overview>← Visi mokiniai</button>
            <div><span class="p2-label">Naujas mokinys</span><h3>Sukurti mokinio kortelę</h3><p>Vardas ir klasė bus naudojami mokinių bazėje. Tėčio, mamos ar globėjo informacija matoma tik mokytojui.</p></div>
          </div>
          <div class="p2-student-create-card">
            <div class="p2-student-create-page-grid">
              <label class="p2-create-student-name"><span>Vardas</span><input id="p2NewStudentName" maxlength="80" placeholder="Vardas"></label>
              <label class="p2-create-grade"><span>Klasė</span><select id="p2NewStudentGrade">${gradeOptions(0)}</select></label>
              <div class="p2-guardian-row p2-create-guardian-row">
                <label class="p2-create-relation"><span>Ryšys</span><select id="p2NewStudentGuardianRelation">${guardianRelationOptions('')}</select></label>
                <label class="p2-create-guardian-custom" data-new-guardian-custom-field hidden><span>Kas tai?</span><input id="p2NewStudentGuardianCustom" maxlength="40" placeholder="Pvz. globėja, močiutė"></label>
                <label class="p2-create-guardian-name"><span>Vardas</span><input id="p2NewStudentGuardianName" maxlength="80" placeholder="Tėčio, mamos ar globėjo vardas"></label>
              </div>
            </div>
            <div class="p2-student-create-page-footer"><button type="button" class="p2-secondary" data-student-overview>Atšaukti</button><button type="button" class="p2-primary" data-student-add>Sukurti mokinį</button></div>
          </div>
        </section>`;
    } else if (selected) {
      const selectedGrade = studentGradeValue(selected.grade);
      const selectedRelation = studentGuardianRelation(selected.guardianRelation);
      const guardianLabel = studentGuardianLabel(selected);
      const cardMeta = [selectedGrade ? `${selectedGrade} klasė` : 'Klasė nenurodyta', guardianLabel ? `${guardianLabel} · tik mokytojui` : '', `Sukurta ${formatStudentDate(selected.createdAt, true)}`].filter(Boolean).join(' · ');
      const lessonOptions = LESSON_CATALOG.map(lesson => `<option value="${escapeHtml(lesson.id)}" ${lesson.id === defaultLessonId ? 'selected' : ''}>${escapeHtml(lesson.shortTitle)} · ${lesson.taskCount} užd.</option>`).join('');
      const relationDisplay = selectedRelation === 'mama' ? 'Mama' : selectedRelation === 'tėtis' ? 'Tėtis' : selectedRelation === 'kita' ? (String(selected.guardianCustomRelation || '').trim() || 'Kita') : 'Nenurodyta';
      const guardianNameDisplay = String(selected.guardianName || '').trim() || 'Nenurodytas';
      const participantRoomId = String(selectedClassParticipant?.roomId || '').trim().toUpperCase();
      const participantLesson = participantRoomId ? (selected?.lessons?.[participantRoomId] || null) : null;
      const activeCandidateRoomId = selectedOwnsActiveRoom ? roomId : (selectedClassParticipant && participantRoomId ? participantRoomId : '');
      const activeCandidateLesson = activeCandidateRoomId ? (selected?.lessons?.[activeCandidateRoomId] || (activeCandidateRoomId === roomId ? currentLesson : participantLesson) || null) : null;
      const activeCandidateState = activeCandidateLesson ? studentLessonOccurrenceState(activeCandidateLesson) : { known: false, state: '' };
      const timedRunningLesson = history.find(item => {
        const state = studentLessonOccurrenceState(item);
        return state.known && state.state === 'running';
      }) || null;
      // Aktyvi classSession pati savaime nebereiškia „Vyksta“. Jei turime
      // konkrečią datą ir laiką, ši būsena galioja tik realiame pamokos lange.
      // Seniems nesuplanuotiems Room paliekame ankstesnį aktyvaus Room elgesį.
      const runningRoomId = activeCandidateRoomId && (!activeCandidateState.known || activeCandidateState.state === 'running')
        ? activeCandidateRoomId
        : String(timedRunningLesson?.roomId || '').trim().toUpperCase();
      const runningLesson = runningRoomId
        ? (selected?.lessons?.[runningRoomId] || (runningRoomId === activeCandidateRoomId ? activeCandidateLesson : timedRunningLesson) || null)
        : null;
      const runningIsOpenRoom = Boolean(runningRoomId && runningRoomId === roomId);
      const runningExpanded = Boolean(runningRoomId && expandedStudentHistoryRoomId === runningRoomId);
      const pastHistory = history.filter(item => {
        if (runningRoomId && item.roomId === runningRoomId) return false;
        const state = studentLessonOccurrenceState(item);
        if (state.known) return state.state === 'past';
        return true;
      });
      const upcomingLessons = studentUpcomingScheduleLessons(selectedStudentId);

      const runningMarkup = runningRoomId ? (() => {
        const runningSummary = runningLesson?.summary && typeof runningLesson.summary === 'object' ? runningLesson.summary : {};
        const percent = Math.max(0, Math.min(100, Number(runningSummary.percent || 0)));
        const openAttribute = runningIsOpenRoom
          ? `data-student-open-room="${escapeHtml(runningRoomId)}" data-room-role="teacher"`
          : `data-student-switch-class-room="${escapeHtml(runningRoomId)}"`;
        const practice = studentPracticeLabel(runningLesson || {});
        const runningClassSessionId = String(runningLesson?.classSessionId || linkedClassSessionIdForRoom(runningRoomId) || '').trim();
        const runningTitle = String(teacherStudentDb.classSessions?.[runningClassSessionId]?.label || '').trim() || 'Pamoka';
        const canAssignPractice = runningIsOpenRoom && !runningLesson?.lessonId;
        return `<div class="p2-student-lessons-group is-running-group">
          <div class="p2-student-lessons-group-title"><span>Vykstanti pamoka</span></div>
          <article class="p2-student-lesson-card is-running ${runningExpanded ? 'is-expanded' : ''}">
            <div class="p2-student-lesson-state"><span class="p2-student-lesson-dot" aria-hidden="true"></span><strong>Vyksta</strong></div>
            <div class="p2-student-lesson-card-main">
              <div class="p2-student-lesson-card-title"><strong>${escapeHtml(runningTitle)}</strong>${runningLesson?.scheduleMode && scheduleMode(runningLesson) !== 'weekly' ? `<span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(runningLesson))}">${escapeHtml(scheduleModeLabel(runningLesson, true))}</span>` : ''}<span>${escapeHtml(studentTeacherLabel(selected, students))}</span></div>
              <p>${escapeHtml(studentLessonWhenLabel(runningLesson || {}))} · Room <code>${escapeHtml(runningRoomId)}</code></p>
              <div class="p2-student-lesson-content"><span>Pamokos turinys</span><strong>${escapeHtml(practice)}</strong></div>
              ${runningLesson?.lessonId ? `<div class="p2-student-history-progress"><i><b style="width:${percent}%"></b></i><strong>${escapeHtml(studentLessonResultText(runningLesson))}</strong></div>` : ''}
              ${canAssignPractice ? `<div class="p2-student-assign-row is-in-lesson-card"><label><span>Pridėti pratybas į šią pamoką</span><select id="p2StudentLessonSelect"><option value="">Tik lenta</option>${lessonOptions}</select></label><button type="button" class="p2-primary" data-student-link-current>Priskirti pratybas</button></div>` : ''}
            </div>
            <div class="p2-student-lesson-card-actions">
              ${runningLesson ? `<button type="button" class="p2-history-detail-toggle ${runningExpanded ? 'is-open' : ''}" data-student-history-toggle="${escapeHtml(runningRoomId)}">${runningExpanded ? 'Slėpti detales' : 'Pamokos detalės'}</button>` : ''}
              <button type="button" class="p2-primary" ${openAttribute}>Atidaryti pamoką</button>
            </div>
            ${runningLesson ? renderStudentRoomHistoryDetails(selected, { roomId: runningRoomId, ...runningLesson }) : ''}
          </article>
        </div>`;
      })() : '';

      const upcomingMarkup = upcomingLessons.length ? `<div class="p2-student-lessons-group is-upcoming-group">
        <div class="p2-student-lessons-group-title"><span>Vyksiančios pamokos</span><strong>${upcomingLessons.length}</strong></div>
        ${upcomingLessons.map(entry => {
          const title = String(entry.label || '').trim() || 'Pamoka';
          return `<article class="p2-student-lesson-card is-upcoming">
            <div class="p2-student-lesson-state"><span class="p2-student-lesson-dot" aria-hidden="true"></span><strong>Numatyta</strong></div>
            <div class="p2-student-lesson-card-main">
              <div class="p2-student-lesson-card-title"><strong>${escapeHtml(title)}</strong><span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(entry))}">${escapeHtml(scheduleModeLabel(entry, true))}</span></div>
              <p>${escapeHtml(studentScheduledLessonWhenLabel(entry))}</p>
              <div class="p2-student-lesson-content"><span>Pamokos turinys</span><strong>${escapeHtml(studentPracticeLabel(entry))}</strong></div>
            </div>
            <div class="p2-student-lesson-card-actions"><button type="button" data-student-open-schedule="${escapeHtml(entry.id)}" data-student-open-schedule-date="${escapeHtml(entry.occurrenceDateKey || '')}">Tvarkyti laiką</button></div>
          </article>`;
        }).join('')}
      </div>` : '';

      const pastMarkup = pastHistory.length ? `<div class="p2-student-lessons-group is-past-group">
        <div class="p2-student-lessons-group-title"><span>Įvykusios pamokos</span><strong>${pastHistory.length}</strong></div>
        ${pastHistory.map(item => {
          const title = String(teacherStudentDb.classSessions?.[item.classSessionId]?.label || '').trim() || 'Pamoka';
          const summary = item.summary && typeof item.summary === 'object' ? item.summary : {};
          const percent = Math.max(0, Math.min(100, Number(summary.percent || 0)));
          const practiceStatus = studentLessonStatus(item);
          const expanded = expandedStudentHistoryRoomId === item.roomId;
          const resultDetails = item.lessonId
            ? [`Savarankiškai ${Math.max(0, Number(summary.good || 0))}`, `Su pagalba ${Math.max(0, Number(summary.help || 0))}`, `Kartoti ${Math.max(0, Number(summary.repeat || 0))}`].join(' · ')
            : '';
          return `<article class="p2-student-lesson-card is-past ${expanded ? 'is-expanded' : ''}">
            <div class="p2-student-lesson-state"><span class="p2-student-lesson-dot" aria-hidden="true"></span><strong>Įvyko</strong></div>
            <div class="p2-student-lesson-card-main">
              <div class="p2-student-lesson-card-title"><strong>${escapeHtml(title)}</strong>${item?.scheduleMode && scheduleMode(item) !== 'weekly' ? `<span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(item))}">${escapeHtml(scheduleModeLabel(item, true))}</span>` : ''}<span class="p2-student-lesson-status is-${escapeHtml(practiceStatus.key)}">${escapeHtml(practiceStatus.label)}</span></div>
              <p>${escapeHtml(studentLessonWhenLabel(item))} · Room <code>${escapeHtml(item.roomId)}</code></p>
              <div class="p2-student-lesson-content"><span>Pamokos turinys</span><strong>${escapeHtml(studentPracticeLabel(item))}</strong></div>
              ${item.lessonId ? `<div class="p2-student-history-progress"><i><b style="width:${percent}%"></b></i><strong>${escapeHtml(studentLessonResultText(item))}</strong>${resultDetails ? `<span>${escapeHtml(resultDetails)}</span>` : ''}</div>` : ''}
            </div>
            <div class="p2-student-lesson-card-actions">
              <button type="button" class="p2-history-detail-toggle ${expanded ? 'is-open' : ''}" data-student-history-toggle="${escapeHtml(item.roomId)}">${expanded ? 'Slėpti detales' : 'Pamokos detalės'}</button>
              <button type="button" data-student-open-room="${escapeHtml(item.roomId)}" data-room-role="teacher">Atidaryti pamoką</button>
              <button class="is-secondary" type="button" data-student-open-room="${escapeHtml(item.roomId)}" data-room-role="student">Mokinio vaizdas</button>
              <button class="is-muted" type="button" data-student-unlink-room="${escapeHtml(item.roomId)}">Pašalinti iš istorijos</button>
            </div>
            ${renderStudentRoomHistoryDetails(selected, item)}
          </article>`;
        }).join('')}
      </div>` : '';

      const lessonsTimelineMarkup = (runningMarkup || upcomingMarkup || pastMarkup)
        ? `${runningMarkup}${upcomingMarkup}${pastMarkup}`
        : `<div class="p2-student-history-empty">Šiam mokiniui dar nėra suplanuotų ar įvykusių pamokų.</div>`;

      detailMarkup = `
        <button type="button" class="p2-back-link p2-student-detail-back" data-student-overview>← Visi mokiniai</button>
        <div class="p2-student-card-head">
          <div class="p2-student-avatar is-large" aria-hidden="true">${escapeHtml(String(selected.name || 'M').trim().slice(0, 1).toUpperCase() || 'M')}</div>
          <div><span class="p2-label">Mokinio kortelė</span><h3>${escapeHtml(selected.name || 'Mokinys')}</h3><p>${escapeHtml(cardMeta)}</p></div>
          ${studentEditOpen ? '' : '<button class="p2-secondary p2-student-edit-open" type="button" data-student-edit-open>Redaguoti informaciją</button>'}
        </div>
        ${studentEditOpen ? `<section class="p2-student-edit-card is-active">
          <div class="p2-student-edit-grid">
            <label class="p2-edit-student-name"><span>Vardas</span><input id="p2StudentNameEdit" value="${escapeHtml(selected.name || '')}" maxlength="80"></label>
            <label class="p2-student-grade-field p2-edit-grade"><span>Klasė</span><select id="p2StudentGradeEdit">${gradeOptions(selectedGrade)}</select></label>
            <div class="p2-guardian-row p2-edit-guardian-row">
              <label class="p2-edit-relation"><span>Ryšys</span><select id="p2StudentGuardianRelationEdit">${guardianRelationOptions(selectedRelation)}</select></label>
              <label class="p2-edit-guardian-custom" data-guardian-custom-field ${selectedRelation === 'kita' ? '' : 'hidden'}><span>Kas tai?</span><input id="p2StudentGuardianCustomEdit" value="${escapeHtml(selected.guardianCustomRelation || '')}" maxlength="40" placeholder="Pvz. globėja, močiutė"></label>
              <label class="p2-edit-guardian-name"><span>Vardas</span><input id="p2StudentGuardianNameEdit" value="${escapeHtml(selected.guardianName || '')}" maxlength="80" placeholder="Tėčio, mamos ar globėjo vardas"></label>
            </div>
            <label class="p2-student-notes-field"><span>Pastabos</span><textarea id="p2StudentNotesEdit" maxlength="600" placeholder="Nebūtina">${escapeHtml(selected.notes || '')}</textarea></label>
          </div>
          <div class="p2-student-edit-footer"><span>Tėčio / mamos / globėjo duomenys saugomi tik mokytojo mokinių bazėje ir į mokinio Room nekopijuojami.</span><div class="p2-student-edit-actions"><button type="button" class="p2-student-danger" data-student-delete>Pašalinti mokinį</button><button type="button" class="p2-secondary" data-student-edit-cancel>Atšaukti</button><button type="button" class="p2-primary" data-student-save>Įrašyti pakeitimus</button></div></div>
        </section>` : `<section class="p2-student-info-card">
          <div class="p2-student-info-grid">
            <div class="p2-student-info-item"><span>Vardas</span><strong>${escapeHtml(selected.name || '—')}</strong></div>
            <div class="p2-student-info-item"><span>Klasė</span><strong>${selectedGrade ? `${selectedGrade} klasė` : 'Nenurodyta'}</strong></div>
            <div class="p2-student-info-item"><span>Ryšys</span><strong>${escapeHtml(relationDisplay)}</strong></div>
            <div class="p2-student-info-item"><span>Tėčio / mamos / globėjo vardas</span><strong>${escapeHtml(guardianNameDisplay)}</strong></div>
            <div class="p2-student-info-item is-notes"><span>Pastabos</span><strong>${escapeHtml(String(selected.notes || '').trim() || 'Pastabų nėra')}</strong></div>
          </div>
          <p class="p2-student-info-private">Tėčio / mamos / globėjo duomenys matomi tik mokytojui ir į mokinio Room nekopijuojami.</p>
        </section>`}
        <section class="p2-student-history p2-student-lessons">
          <div class="p2-student-section-heading"><div><span class="p2-label">Pamokos</span><h3>Mokinio pamokos</h3><p>Tvarkaraštis ir mokinio kortelė naudoja tą patį pamokos įrašą.</p></div><button type="button" class="p2-secondary" data-student-schedule-new>＋ Priskirti pamokos laiką</button></div>
          <div class="p2-student-lessons-stack">${lessonsTimelineMarkup}</div>
        </section>`;
    }

    host.innerHTML = `<main class="p2-student-detail-pane p2-student-detail-pane-full">${detailMarkup}</main>`;

    host.querySelector('[data-student-backup]')?.addEventListener('click', event => {
      const button = event.currentTarget;
      if (button) { button.disabled = true; button.textContent = 'Ruošiama…'; }
      window.dispatchEvent(new CustomEvent('p2:backup-request'));
    });
    host.querySelector('[data-student-restore]')?.addEventListener('click', () => beginBackupRestoreFileSelection());

    host.querySelectorAll('[data-student-create-open]').forEach(button => button.addEventListener('click', () => {
      selectedStudentId = null;
      expandedStudentHistoryRoomId = '';
      studentCreateOpen = true;
      studentEditOpen = false;
      renderStudentsModal();
      studentsModal?.querySelector('#p2NewStudentName')?.focus();
    }));
    host.querySelectorAll('[data-student-overview]').forEach(button => button.addEventListener('click', () => {
      selectedStudentId = null;
      expandedStudentHistoryRoomId = '';
      studentCreateOpen = false;
      studentEditOpen = false;
      renderStudentsModal();
    }));

    const searchInput = host.querySelector('#p2StudentSearch');
    searchInput?.addEventListener('input', () => {
      const value = String(searchInput.value || '');
      studentSearchQuery = value;
      selectedStudentId = null;
      studentCreateOpen = false;
      studentEditOpen = false;
      renderStudentsModal();
      const next = studentsModal?.querySelector('#p2StudentSearch');
      if (next) {
        next.focus();
        try { next.setSelectionRange(value.length, value.length); } catch (_) {}
      }
    });
    host.querySelector('#p2StudentGradeFilter')?.addEventListener('change', event => {
      studentGradeFilter = String(event.currentTarget?.value || 'all');
      selectedStudentId = null;
      studentCreateOpen = false;
      studentEditOpen = false;
      renderStudentsModal();
    });

    host.querySelectorAll('[data-student-select]').forEach(button => button.addEventListener('click', () => {
      selectedStudentId = button.dataset.studentSelect;
      expandedStudentHistoryRoomId = '';
      studentCreateOpen = false;
      studentEditOpen = false;
      const selectedStudent = teacherStudentDb.students?.[selectedStudentId];
      if (selectedStudent) prefetchStudentRoomHistories(selectedStudent, 1);
      renderStudentsModal();
    }));

    host.querySelectorAll('[data-student-history-toggle]').forEach(button => button.addEventListener('click', () => {
      const targetRoom = String(button.dataset.studentHistoryToggle || '').trim().toUpperCase();
      if (!selectedStudentId || !targetRoom) return;
      if (expandedStudentHistoryRoomId === targetRoom) {
        expandedStudentHistoryRoomId = '';
      } else {
        expandedStudentHistoryRoomId = targetRoom;
        requestStudentRoomHistory(selectedStudentId, targetRoom);
      }
      renderStudentsModal();
    }));
    host.querySelectorAll('[data-student-history-retry]').forEach(button => button.addEventListener('click', () => {
      const targetRoom = String(button.dataset.studentHistoryRetry || '').trim().toUpperCase();
      if (!selectedStudentId || !targetRoom) return;
      requestStudentRoomHistory(selectedStudentId, targetRoom, true);
      renderStudentsModal();
    }));

    const newRelation = host.querySelector('#p2NewStudentGuardianRelation');
    const syncNewGuardianCustom = () => {
      const field = host.querySelector('[data-new-guardian-custom-field]');
      if (field) field.hidden = String(newRelation?.value || '') !== 'kita';
    };
    newRelation?.addEventListener('change', syncNewGuardianCustom);
    syncNewGuardianCustom();

    const addStudent = () => {
      const addInput = host.querySelector('#p2NewStudentName');
      const name = String(addInput?.value || '').trim();
      const grade = studentGradeValue(host.querySelector('#p2NewStudentGrade')?.value);
      const guardianRelation = studentGuardianRelation(host.querySelector('#p2NewStudentGuardianRelation')?.value);
      const guardianCustomRelation = guardianRelation === 'kita' ? String(host.querySelector('#p2NewStudentGuardianCustom')?.value || '').trim() : '';
      const guardianName = String(host.querySelector('#p2NewStudentGuardianName')?.value || '').trim();
      if (!name) { addInput?.focus(); return; }
      if (guardianRelation && !guardianName) { toast('Įrašyk tėčio, mamos arba globėjo vardą'); host.querySelector('#p2NewStudentGuardianName')?.focus(); return; }
      if (guardianRelation === 'kita' && !guardianCustomRelation) { toast('Nurodyk, kas tai yra'); host.querySelector('#p2NewStudentGuardianCustom')?.focus(); return; }
      requestStudentDb({ action: 'add', name, grade, guardianRelation, guardianCustomRelation, guardianName });
      studentCreateOpen = false;
      selectedStudentId = null;
      renderStudentsModal();
    };
    host.querySelector('[data-student-add]')?.addEventListener('click', addStudent);
    host.querySelector('#p2NewStudentName')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addStudent(); } });

    host.querySelector('[data-student-edit-open]')?.addEventListener('click', () => {
      if (!selectedStudentId || !selected) return;
      studentEditOpen = true;
      renderStudentsModal();
      studentsModal?.querySelector('#p2StudentNameEdit')?.focus();
    });
    host.querySelector('[data-student-edit-cancel]')?.addEventListener('click', () => {
      studentEditOpen = false;
      renderStudentsModal();
    });

    const editRelation = host.querySelector('#p2StudentGuardianRelationEdit');
    const syncEditGuardianCustom = () => {
      const field = host.querySelector('[data-guardian-custom-field]');
      if (field) field.hidden = String(editRelation?.value || '') !== 'kita';
    };
    editRelation?.addEventListener('change', syncEditGuardianCustom);
    syncEditGuardianCustom();

    host.querySelector('[data-student-save]')?.addEventListener('click', () => {
      if (!selectedStudentId || !selected) return;
      const guardianRelation = studentGuardianRelation(editRelation?.value);
      const guardianCustomRelation = guardianRelation === 'kita' ? String(host.querySelector('#p2StudentGuardianCustomEdit')?.value || '').trim() : '';
      const guardianName = String(host.querySelector('#p2StudentGuardianNameEdit')?.value || '').trim();
      if (guardianRelation && !guardianName) { toast('Įrašyk tėčio, mamos arba globėjo vardą'); host.querySelector('#p2StudentGuardianNameEdit')?.focus(); return; }
      if (guardianRelation === 'kita' && !guardianCustomRelation) { toast('Nurodyk, kas tai yra'); host.querySelector('#p2StudentGuardianCustomEdit')?.focus(); return; }
      requestStudentDb({
        action: 'update', studentId: selectedStudentId,
        name: host.querySelector('#p2StudentNameEdit')?.value || selected.name || '',
        grade: studentGradeValue(host.querySelector('#p2StudentGradeEdit')?.value),
        guardianRelation,
        guardianCustomRelation,
        guardianName,
        notes: host.querySelector('#p2StudentNotesEdit')?.value || ''
      });
      studentEditOpen = false;
    });
    host.querySelector('[data-student-delete]')?.addEventListener('click', () => {
      if (!selectedStudentId || !selected) return;
      if (!window.confirm(`Pašalinti mokinį „${selected.name || 'Mokinys'}“ iš mokinių bazės? Senos Room lentos nebus ištrintos.`)) return;
      requestStudentDb({ action: 'delete', studentId: selectedStudentId });
      studentEditOpen = false;
      selectedStudentId = null;
    });
    host.querySelector('[data-student-link-current]')?.addEventListener('click', () => {
      if (!selectedStudentId || !roomId) return;
      const selectedLessonId = String(host.querySelector('#p2StudentLessonSelect')?.value || '');
      const lesson = lessonForId(selectedLessonId);
      requestStudentDb({
        action: 'link-room',
        studentId: selectedStudentId,
        roomId,
        lessonId: lesson?.id || '',
        title: lesson?.shortTitle || '',
        taskCount: lesson?.taskCount || 0,
        attemptPolicy: lesson ? normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy }) : null,
        ...(lesson ? assignmentContentDetail(lesson) : { schemaVersion: P2_DATA_SCHEMA_VERSION })
      });
    });
    host.querySelector('[data-student-schedule-new]')?.addEventListener('click', () => {
      if (!selectedStudentId || !teacherStudentDb.students?.[selectedStudentId]) return;
      if (studentsModal) studentsModal.hidden = true;
      ensureScheduleModal();
      editingScheduleId = '';
      editingScheduleDateKey = '';
      scheduleCreateMode = false;
      scheduleWeekStartKey = scheduleWeekStart(new Date());
      scheduleSelectedDateKey = localDateKey();
      scheduleSelectedDay = scheduleTodayIndex();
      // P1.7.7: iš mokinio kortelės nekuriamas atskiras laikas. Mokytojas
      // pasirenka jau egzistuojantį pamokos laiką, o redaktoriuje mokinys
      // iš anksto parenkamas priskyrimo formoje.
      scheduleCreatePreset = { studentId: selectedStudentId };
      scheduleModal.hidden = false;
      renderScheduleModal();
    });
    host.querySelectorAll('[data-student-open-schedule]').forEach(button => button.addEventListener('click', () => {
      const scheduleId = String(button.dataset.studentOpenSchedule || '').trim();
      const entry = teacherStudentDb.scheduleEntries?.[scheduleId];
      if (!scheduleId || !entry) return;
      if (studentsModal) studentsModal.hidden = true;
      ensureScheduleModal();
      editingScheduleId = scheduleId;
      scheduleCreateMode = false;
      scheduleCreatePreset = null;
      const occurrenceDateKey = String(button.dataset.studentOpenScheduleDate || '').trim() || localDateKey();
      editingScheduleDateKey = scheduleDateKeyValid(occurrenceDateKey) ? occurrenceDateKey : localDateKey();
      scheduleWeekStartKey = scheduleWeekStart(editingScheduleDateKey);
      scheduleSelectedDateKey = editingScheduleDateKey;
      scheduleSelectedDay = scheduleDateDayIndex(editingScheduleDateKey) || Number(entry.day || scheduleTodayIndex());
      scheduleModal.hidden = false;
      renderScheduleModal();
    }));
    host.querySelector('[data-student-switch-class-room]')?.addEventListener('click', event => {
      const targetRoom = String(event.currentTarget?.dataset.studentSwitchClassRoom || '').trim().toUpperCase();
      if (!targetRoom) return;
      if (studentsModal) studentsModal.hidden = true;
      requestTeacherRoomSwitch(targetRoom);
    });
    host.querySelectorAll('[data-student-open-room]').forEach(button => button.addEventListener('click', () => {
      openHistoricalRoom(button.dataset.studentOpenRoom, button.dataset.roomRole || 'teacher');
    }));
    host.querySelectorAll('[data-student-unlink-room]').forEach(button => button.addEventListener('click', () => {
      const oldRoom = button.dataset.studentUnlinkRoom;
      if (!window.confirm(`Pašalinti Room ${oldRoom} iš šio mokinio pamokų istorijos? Pati lenta Firebase liks nepaliesta.`)) return;
      requestStudentDb({ action: 'unlink-room', studentId: selectedStudentId, roomId: oldRoom });
    }));
  }
  function openStudentsDatabase(options = {}) {
    if (role() !== 'teacher') return;
    ensureStudentsModal();
    if (!options.preserveSelection) {
      selectedStudentId = null;
      studentCreateOpen = false;
    }
    studentsModal.hidden = false;
    renderStudentsModal();
  }

  // P2-SPLIT-P2.5-P4-P1.7.8.1: tvarkaraštis turi tris atskirus sluoksnius:
  // 1) nepriklausomas pamokos laikas, 2) neribotas mokinio priskyrimų rinkinys
  // prie vieno ar kelių laikų, 3) konkrečios datos pamoka / Room. Pamokos laiko
  // laikinas išjungimas ar panaikinimas nekeičia kitų to paties mokinio laikų.
  const SCHEDULE_DAYS = Object.freeze([
    { id: 1, short: 'Pr', label: 'Pirmadienis' },
    { id: 2, short: 'An', label: 'Antradienis' },
    { id: 3, short: 'Tr', label: 'Trečiadienis' },
    { id: 4, short: 'Kt', label: 'Ketvirtadienis' },
    { id: 5, short: 'Pn', label: 'Penktadienis' },
    { id: 6, short: 'Št', label: 'Šeštadienis' },
    { id: 7, short: 'Sk', label: 'Sekmadienis' }
  ]);
  const SCHEDULE_ATTENDANCE_META = Object.freeze({
    recurring: { label: 'Nuolatinis', long: 'Nuolatinis laikas' },
    dates: { label: 'Pavienės', long: 'Pavienės pamokos' },
    intro: { label: 'Pažintinė', long: 'Pažintinė pamoka' },
    final: { label: 'Paskutinė', long: 'Paskutinė pamoka' }
  });

  function scheduleTodayIndex(date = new Date()) {
    const day = Number(date.getDay());
    return day === 0 ? 7 : day;
  }

  function localDateKey(date = new Date()) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function scheduleDateFromKey(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || '').trim());
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
    if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1 || date.getDate() !== Number(match[3])) return null;
    return date;
  }

  function scheduleDateKeyValid(value) { return Boolean(scheduleDateFromKey(value)); }

  function scheduleOccurrenceStateFromParts(dateKeyRaw, startRaw, durationRaw, now = new Date()) {
    const date = scheduleDateFromKey(dateKeyRaw);
    const startMinutes = scheduleTimeToMinutes(startRaw);
    const duration = Math.max(0, Number(durationRaw || 0));
    if (!date || startMinutes === null || !duration) return { known: false, state: '', startAt: null, endAt: null };
    const startAt = new Date(date.getFullYear(), date.getMonth(), date.getDate(), Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    const endAt = new Date(startAt.getTime() + duration * 60000);
    const nowMs = now instanceof Date ? now.getTime() : Number(now);
    if (nowMs < startAt.getTime()) return { known: true, state: 'future', startAt, endAt };
    if (nowMs < endAt.getTime()) return { known: true, state: 'running', startAt, endAt };
    return { known: true, state: 'past', startAt, endAt };
  }

  function scheduleOccurrenceState(entry, dateKey, now = new Date()) {
    const time = scheduleSlotTimeForDate(entry, dateKey);
    return scheduleOccurrenceStateFromParts(dateKey, time?.start, time?.durationMinutes, now);
  }

  function scheduleAddDays(value, days) {
    const date = value instanceof Date ? new Date(value.getTime()) : scheduleDateFromKey(value);
    if (!date) return '';
    date.setDate(date.getDate() + Number(days || 0));
    return localDateKey(date);
  }

  function scheduleWeekStart(value = new Date()) {
    const date = value instanceof Date ? new Date(value.getTime()) : (scheduleDateFromKey(value) || new Date());
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (scheduleTodayIndex(date) - 1));
    return localDateKey(date);
  }

  function scheduleWeekDates(weekStartKey) {
    const start = scheduleDateFromKey(weekStartKey) || scheduleDateFromKey(scheduleWeekStart(new Date()));
    return SCHEDULE_DAYS.map((day, index) => {
      const date = new Date(start.getTime());
      date.setDate(start.getDate() + index);
      return { ...day, date, dateKey: localDateKey(date) };
    });
  }

  function scheduleDateDayIndex(dateKey) {
    const date = scheduleDateFromKey(dateKey);
    return date ? scheduleTodayIndex(date) : 0;
  }

  function formatScheduleClock(value) {
    const stamp = Number(value);
    if (!Number.isFinite(stamp) || stamp <= 0) return '';
    try { return new Intl.DateTimeFormat('lt-LT', { hour: '2-digit', minute: '2-digit' }).format(new Date(stamp)); }
    catch (_) { return new Date(stamp).toLocaleTimeString('lt-LT', { hour: '2-digit', minute: '2-digit' }); }
  }

  function defaultScheduleTime() {
    const date = new Date();
    let minutes = date.getMinutes();
    minutes = Math.ceil(minutes / 15) * 15;
    if (minutes >= 60) { date.setHours(date.getHours() + 1); minutes = 0; }
    return `${String(date.getHours()).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  function scheduleTimeToMinutes(value) {
    const match = /^(\d{2}):(\d{2})$/.exec(String(value || '').trim());
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function scheduleClockFromMinutes(value) {
    const total = Math.max(0, Math.min(24 * 60, Math.round(Number(value) || 0)));
    return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
  }

  function scheduleTimesOverlap(a, b) {
    const aStart = scheduleTimeToMinutes(a?.start);
    const bStart = scheduleTimeToMinutes(b?.start);
    if (aStart === null || bStart === null) return false;
    const aEnd = aStart + Math.max(15, Math.min(180, Math.round(Number(a?.durationMinutes) || 40)));
    const bEnd = bStart + Math.max(15, Math.min(180, Math.round(Number(b?.durationMinutes) || 40)));
    return aStart < bEnd && aEnd > bStart;
  }

  function scheduleMode(value) {
    const raw = String(value?.attendanceMode || value?.scheduleMode || value?.mode || '').trim().toLowerCase();
    if (raw === 'weekly') return 'recurring';
    if (raw === 'single') return 'dates';
    return Object.prototype.hasOwnProperty.call(SCHEDULE_ATTENDANCE_META, raw) ? raw : 'recurring';
  }

  function scheduleModeLabel(value, short = false) {
    const meta = SCHEDULE_ATTENDANCE_META[scheduleMode(value)] || SCHEDULE_ATTENDANCE_META.recurring;
    return short ? meta.label : meta.long;
  }

  function scheduleEntriesList() {
    return Object.entries(teacherStudentDb.scheduleEntries || {})
      .map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
      .sort((a, b) => {
        const aTime = scheduleSlotTimeForDate(a, scheduleSelectedDateKey || localDateKey()) || scheduleSlotTimeVersions(a)[0] || {};
        const bTime = scheduleSlotTimeForDate(b, scheduleSelectedDateKey || localDateKey()) || scheduleSlotTimeVersions(b)[0] || {};
        return Number(aTime.day || 7) - Number(bTime.day || 7) || String(aTime.start || '').localeCompare(String(bTime.start || '')) || Number(a.createdAt || 0) - Number(b.createdAt || 0);
      });
  }

  function scheduleSlotTimeVersions(entry) {
    const raw = entry?.timeVersions && typeof entry.timeVersions === 'object' ? entry.timeVersions : {};
    const list = Object.entries(raw).map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
      .filter(item => scheduleDateKeyValid(item.effectiveFrom) && Number(item.day) >= 1 && Number(item.day) <= 7 && scheduleTimeToMinutes(item.start) !== null)
      .map(item => ({ ...item, durationMinutes: Math.max(15, Math.min(180, Math.round(Number(item.durationMinutes) || 40))) }));
    if (!list.length || Number(entry?.slotModelVersion || 0) < 2) {
      const legacyDate = scheduleDateKeyValid(entry?.startDate) ? String(entry.startDate) : (scheduleDateKeyValid(entry?.date) ? String(entry.date) : '2000-01-01');
      const legacyDay = Math.max(1, Math.min(7, Math.round(Number(entry?.day) || scheduleDateDayIndex(entry?.date) || 1)));
      const legacyStart = scheduleTimeToMinutes(entry?.start) === null ? '16:00' : String(entry.start);
      const legacy = { id: '__legacy__', effectiveFrom: legacyDate, day: legacyDay, start: legacyStart, durationMinutes: Math.max(15, Math.min(180, Math.round(Number(entry?.durationMinutes) || 40))), createdAt: Number(entry?.createdAt || 0) };
      if (!list.some(item => item.effectiveFrom === legacy.effectiveFrom && Number(item.day) === legacy.day && String(item.start) === legacy.start)) list.push(legacy);
    }
    return list.sort((a, b) => String(a.effectiveFrom).localeCompare(String(b.effectiveFrom)) || Number(a.createdAt || 0) - Number(b.createdAt || 0));
  }

  function scheduleSlotTimeForDate(entry, dateKey) {
    if (!scheduleDateKeyValid(dateKey)) return null;
    if (Number(entry?.slotModelVersion || 0) < 2) {
      const legacyMode = String(entry?.scheduleMode || '').trim().toLowerCase();
      const legacyDate = String(entry?.date || '').trim();
      if (legacyMode && legacyMode !== 'weekly' && scheduleDateKeyValid(legacyDate) && legacyDate !== dateKey) return null;
    }
    const versions = scheduleSlotTimeVersions(entry).filter(item => item.effectiveFrom <= dateKey);
    return versions.length ? versions[versions.length - 1] : null;
  }

  function scheduleSlotClosureRanges(entry) {
    const raw = entry?.closedRanges && typeof entry.closedRanges === 'object' ? entry.closedRanges : {};
    return Object.entries(raw).map(([id, value]) => ({ id, ...(value && typeof value === 'object' ? value : {}) }))
      .filter(item => scheduleDateKeyValid(item.fromDate) && scheduleDateKeyValid(item.toDate) && String(item.toDate) >= String(item.fromDate))
      .sort((a, b) => String(a.fromDate).localeCompare(String(b.fromDate)) || String(a.toDate).localeCompare(String(b.toDate)));
  }

  function scheduleSlotClosedOnDate(entry, dateKey) {
    if (!scheduleDateKeyValid(dateKey)) return false;
    const retiredFrom = scheduleDateKeyValid(entry?.retiredFrom) ? String(entry.retiredFrom) : '';
    if (retiredFrom && dateKey >= retiredFrom) return true;
    return scheduleSlotClosureRanges(entry).some(item => dateKey >= String(item.fromDate) && dateKey <= String(item.toDate));
  }

  function scheduleSlotOccursOnDate(entry, dateKey) {
    if (scheduleSlotClosedOnDate(entry, dateKey)) return false;
    const time = scheduleSlotTimeForDate(entry, dateKey);
    return Boolean(time && Number(time.day) === scheduleDateDayIndex(dateKey));
  }

  function scheduleAttendanceAssignments(entry) {
    const result = [];
    const raw = entry?.assignments && typeof entry.assignments === 'object' ? entry.assignments : {};
    Object.entries(raw).forEach(([id, value]) => {
      if (!value || typeof value !== 'object') return;
      const studentId = String(value.studentId || '').trim();
      if (!studentId || !teacherStudentDb.students?.[studentId]) return;
      result.push({ id, ...value, studentId, mode: scheduleMode(value) });
    });
    const explicitStudents = new Set(result.map(item => item.studentId));
    const legacyRaw = entry?.studentIds;
    const legacyIds = Array.isArray(legacyRaw)
      ? legacyRaw.map(String)
      : (legacyRaw && typeof legacyRaw === 'object' ? Object.keys(legacyRaw).filter(id => legacyRaw[id]) : []);
    const legacyMode = scheduleMode({ scheduleMode: entry?.scheduleMode || 'weekly' });
    for (const studentId of legacyIds) {
      if (!teacherStudentDb.students?.[studentId] || explicitStudents.has(studentId)) continue;
      const date = scheduleDateKeyValid(entry?.date) ? String(entry.date) : '';
      const startDate = scheduleDateKeyValid(entry?.startDate) ? String(entry.startDate) : '2000-01-01';
      const item = { id: `__legacy__${studentId}`, studentId, mode: legacyMode, createdAt: Number(entry?.createdAt || 0), legacy: true };
      if (legacyMode === 'recurring') item.startDate = startDate;
      else if (legacyMode === 'dates') item.dates = date ? { [date]: true } : {};
      else item.date = date;
      result.push(item);
    }
    return result;
  }

  function scheduleFinalCutoffForStudent(studentId, sourceAssignment) {
    const id = String(studentId || '').trim();
    const createdAt = Math.max(0, Number(sourceAssignment?.createdAt || 0));
    const finals = [];
    scheduleEntriesList().forEach(slot => {
      scheduleAttendanceAssignments(slot).forEach(assignment => {
        if (assignment.studentId !== id || scheduleMode(assignment) !== 'final') return;
        if (Math.max(0, Number(assignment.createdAt || 0)) < createdAt) return;
        const date = String(assignment.date || '').trim();
        if (scheduleDateKeyValid(date)) finals.push(date);
      });
    });
    return finals.sort()[0] || '';
  }

  function scheduleAssignmentOccursOnDate(entry, assignment, dateKey) {
    if (!scheduleSlotOccursOnDate(entry, dateKey)) return false;
    const mode = scheduleMode(assignment);
    const cutoff = mode === 'final' ? '' : scheduleFinalCutoffForStudent(assignment.studentId, assignment);
    if (cutoff && dateKey >= cutoff) return false;
    if (mode === 'recurring') {
      const from = scheduleDateKeyValid(assignment.startDate) ? String(assignment.startDate) : '2000-01-01';
      return dateKey >= from;
    }
    if (mode === 'dates') {
      const dates = assignment?.dates && typeof assignment.dates === 'object' ? assignment.dates : {};
      return Boolean(dates[dateKey]);
    }
    const exact = String(assignment?.date || '').trim();
    return scheduleDateKeyValid(exact) && exact === dateKey;
  }

  function scheduleActiveAssignments(entry, dateKey) {
    const priority = { recurring: 1, dates: 2, intro: 3, final: 4 };
    const byStudent = new Map();
    scheduleAttendanceAssignments(entry).forEach(assignment => {
      if (!scheduleAssignmentOccursOnDate(entry, assignment, dateKey)) return;
      const previous = byStudent.get(assignment.studentId);
      if (!previous || (priority[scheduleMode(assignment)] || 0) >= (priority[scheduleMode(previous)] || 0)) byStudent.set(assignment.studentId, assignment);
    });
    return Array.from(byStudent.values());
  }

  function scheduleActiveStudentIds(entry, dateKey) {
    return scheduleActiveAssignments(entry, dateKey).map(item => item.studentId);
  }

  function scheduleStudentIds(entry) {
    return Array.from(new Set(scheduleAttendanceAssignments(entry).map(item => item.studentId)));
  }

  function scheduleStudentNames(entry, dateKey = '') {
    const students = studentList();
    if (!dateKey) return scheduleStudentIds(entry).map(id => scheduleStudentTeacherLabel(studentRecord(id), students));
    return scheduleActiveAssignments(entry, dateKey).map(assignment => ({
      id: assignment.studentId,
      name: scheduleStudentTeacherLabel(studentRecord(assignment.studentId), students),
      mode: scheduleMode(assignment)
    }));
  }

  function scheduleRunRooms(run) {
    const rooms = run?.rooms && typeof run.rooms === 'object' ? run.rooms : {};
    return Object.values(rooms).map(value => String(value?.roomId || value || '').trim().toUpperCase()).filter(Boolean);
  }

  function scheduleOccurrenceConflict(entry, dateKey) {
    if (!scheduleSlotOccursOnDate(entry, dateKey)) return null;
    const time = scheduleSlotTimeForDate(entry, dateKey);
    return scheduleEntriesList().find(other => {
      if (String(other.id) === String(entry.id) || !scheduleSlotOccursOnDate(other, dateKey)) return false;
      return scheduleTimesOverlap(time, scheduleSlotTimeForDate(other, dateKey));
    }) || null;
  }

  function scheduleFindTimeVersionConflict(candidate, excludeScheduleId = '') {
    const fromKey = scheduleDateKeyValid(candidate?.effectiveFrom) ? String(candidate.effectiveFrom) : localDateKey();
    const from = scheduleDateFromKey(fromKey);
    if (!from) return null;
    for (let offset = 0; offset < 370; offset += 1) {
      const date = new Date(from.getTime());
      date.setDate(from.getDate() + offset);
      const dateKey = localDateKey(date);
      if (scheduleDateDayIndex(dateKey) !== Number(candidate.day || 0)) continue;
      for (const other of scheduleEntriesList()) {
        if (String(other.id || '') === String(excludeScheduleId || '') || !scheduleSlotOccursOnDate(other, dateKey)) continue;
        if (scheduleTimesOverlap(candidate, scheduleSlotTimeForDate(other, dateKey))) return { ...other, conflictDateKey: dateKey };
      }
    }
    return null;
  }

  function scheduleConflictText(conflict) {
    if (!conflict) return '';
    const date = conflict.conflictDateKey ? ` ${conflict.conflictDateKey}` : '';
    const time = conflict.conflictDateKey ? scheduleSlotTimeForDate(conflict, conflict.conflictDateKey) : scheduleSlotTimeVersions(conflict).slice(-1)[0];
    const label = String(conflict.label || '').trim() || 'kitas pamokos laikas';
    const start = String(time?.start || '—');
    const end = scheduleClockFromMinutes((scheduleTimeToMinutes(start) || 0) + Math.max(15, Number(time?.durationMinutes || 40)));
    return `Laikas persidengia su „${label}“${date} (${start}–${end}).`;
  }

  function scheduleAssignmentSummary(assignment) {
    const mode = scheduleMode(assignment);
    if (mode === 'recurring') return `nuo ${String(assignment.startDate || '—')}`;
    if (mode === 'dates') {
      const dates = Object.keys(assignment?.dates && typeof assignment.dates === 'object' ? assignment.dates : {}).filter(scheduleDateKeyValid).sort();
      if (!dates.length) return 'datos nenurodytos';
      if (dates.length <= 3) return dates.join(', ');
      return `${dates.slice(0, 2).join(', ')} … +${dates.length - 2}`;
    }
    return String(assignment.date || '—');
  }

  function requestSchedule(detail) {
    if (role() !== 'teacher') return;
    window.dispatchEvent(new CustomEvent('p2:schedule-request', { detail }));
  }

  function ensureScheduleModal() {
    if (scheduleModal) return scheduleModal;
    scheduleModal = document.createElement('div');
    scheduleModal.className = 'p2-schedule-modal';
    scheduleModal.hidden = true;
    scheduleModal.innerHTML = `
      <div class="p2-schedule-backdrop" data-schedule-close></div>
      <section class="p2-schedule-panel" role="dialog" aria-modal="true" aria-label="Pamokų tvarkaraštis">
        <header class="p2-schedule-header">
          <div><span class="p2-side-kicker">PAMOKŲ PLANAS</span><h2>Tvarkaraštis</h2><p>Pirmiausia sukurk pamokų laikus. Mokinius prie jų priskirk atskirai – tas pats mokinys gali turėti kelis laikus ir papildomas pavienes pamokas.</p></div>
          <button type="button" data-schedule-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-schedule-body">
          <main class="p2-schedule-week-pane" id="p2ScheduleWeekPane"></main>
          <aside class="p2-schedule-editor-pane" id="p2ScheduleEditorPane"></aside>
        </div>
      </section>`;
    document.body.appendChild(scheduleModal);
    scheduleModal.querySelectorAll('[data-schedule-close]').forEach(el => el.addEventListener('click', () => {
      scheduleModal.hidden = true;
      editingScheduleId = '';
      editingScheduleDateKey = '';
      scheduleCreateMode = false;
      scheduleCreatePreset = null;
    }));
    return scheduleModal;
  }

  function renderScheduleModal() {
    if (!scheduleModal || scheduleModal.hidden) return;
    const weekHost = scheduleModal.querySelector('#p2ScheduleWeekPane');
    const editorHost = scheduleModal.querySelector('#p2ScheduleEditorPane');
    if (!weekHost || !editorHost) return;

    const todayKey = localDateKey();
    if (!scheduleWeekStartKey) scheduleWeekStartKey = scheduleWeekStart(new Date());
    const weekDates = scheduleWeekDates(scheduleWeekStartKey);
    const weekKeys = weekDates.map(item => item.dateKey);
    if (!scheduleSelectedDateKey || !weekKeys.includes(scheduleSelectedDateKey)) scheduleSelectedDateKey = weekKeys.includes(todayKey) ? todayKey : weekKeys[0];
    scheduleSelectedDay = scheduleDateDayIndex(scheduleSelectedDateKey) || scheduleTodayIndex();
    const entries = scheduleEntriesList();
    const students = studentList();
    const editing = editingScheduleId ? teacherStudentDb.scheduleEntries?.[editingScheduleId] || null : null;
    const editorVisible = Boolean(editing || scheduleCreateMode);
    scheduleModal.querySelector('.p2-schedule-body')?.classList.toggle('is-editor-closed', !editorVisible);
    editorHost.hidden = !editorVisible;

    let occurrenceCount = 0;
    const dayColumns = weekDates.map(day => {
      const dayEntries = entries.filter(entry => scheduleSlotOccursOnDate(entry, day.dateKey));
      occurrenceCount += dayEntries.length;
      const cards = dayEntries.length ? dayEntries.map(entry => {
        const time = scheduleSlotTimeForDate(entry, day.dateKey) || {};
        const active = scheduleStudentNames(entry, day.dateKey);
        const run = teacherStudentDb.scheduleRuns?.[entry.id]?.[day.dateKey] || null;
        const occurrenceState = scheduleOccurrenceState(entry, day.dateKey);
        const practice = entry.lessonId ? (entry.practiceTitle || lessonForId(entry.lessonId)?.shortTitle || 'Pratybos') : '';
        const label = String(entry.label || '').trim() || 'Pamokos laikas';
        const conflict = scheduleOccurrenceConflict(entry, day.dateKey);
        return `<article class="p2-schedule-card ${editingScheduleId === entry.id && editingScheduleDateKey === day.dateKey ? 'is-editing' : ''} ${run ? 'is-started' : ''} ${conflict ? 'has-conflict' : ''}" data-schedule-card="${escapeHtml(entry.id)}" data-schedule-date="${escapeHtml(day.dateKey)}">
          <div class="p2-schedule-card-time"><strong>${escapeHtml(time.start || '—')}</strong><span>${Math.max(15, Number(time.durationMinutes || 40))} min.</span></div>
          <div class="p2-schedule-card-copy">
            <h4>${escapeHtml(label)}</h4>
            <div class="p2-schedule-card-students">${active.length ? active.map(item => `<span>${escapeHtml(item.name)} <small>${escapeHtml(scheduleModeLabel({ mode: item.mode }, true))}</small></span>`).join('') : '<em>Laisvas laikas · mokinių šiai datai nėra</em>'}</div>
            ${practice ? `<p>▦ ${escapeHtml(practice)}</p>` : '<p>□ Tik lenta</p>'}
            ${run ? `<small>${occurrenceState.state === 'past' ? '✓ Įvyko' : occurrenceState.state === 'running' ? '● Vyksta' : '◷ Atidaryta'}${run.startedAt ? ` · ${escapeHtml(formatScheduleClock(run.startedAt || 0))}` : ''}</small>` : ''}
            ${conflict ? '<small class="p2-schedule-conflict">⚠ Persidengia su kitu laiku</small>' : ''}
          </div>
        </article>`;
      }).join('') : '<div class="p2-schedule-day-empty">Pamokų laikų nėra</div>';
      const isToday = day.dateKey === todayKey;
      let monthDay = day.dateKey.slice(5);
      try { monthDay = new Intl.DateTimeFormat('lt-LT', { month: '2-digit', day: '2-digit' }).format(day.date); } catch (_) {}
      return `<section class="p2-schedule-day ${isToday ? 'is-today' : ''} ${day.dateKey === scheduleSelectedDateKey ? 'is-selected' : ''}" data-schedule-day="${day.id}" data-schedule-date="${escapeHtml(day.dateKey)}">
        <header data-schedule-select-date="${escapeHtml(day.dateKey)}"><span>${escapeHtml(day.short)}</span><strong>${escapeHtml(monthDay)}</strong>${isToday ? '<b>Šiandien</b>' : ''}</header>
        <div class="p2-schedule-day-list">${cards}</div>
      </section>`;
    }).join('');

    let weekLabel = `${weekDates[0]?.dateKey || ''} – ${weekDates[6]?.dateKey || ''}`;
    try {
      const formatter = new Intl.DateTimeFormat('lt-LT', { month: 'short', day: '2-digit' });
      weekLabel = `${formatter.format(weekDates[0]?.date)} – ${formatter.format(weekDates[6]?.date)}`;
    } catch (_) {}
    const presetStudent = scheduleCreatePreset?.studentId ? studentRecord(scheduleCreatePreset.studentId) : null;
    const assignHint = presetStudent && !editing
      ? `<div class="p2-schedule-assignment-hint"><strong>Priskiriamas mokinys: ${escapeHtml(scheduleStudentTeacherLabel(presetStudent, students))}</strong><span>Pasirink vieną iš sukurtų pamokos laikų.</span></div>`
      : '';

    weekHost.innerHTML = `
      <div class="p2-schedule-week-toolbar">
        <div><span class="p2-label">Savaitė</span><strong>${escapeHtml(weekLabel)} · ${occurrenceCount} ${occurrenceCount === 1 ? 'laikas' : 'laikai'}</strong></div>
        <div class="p2-schedule-week-nav">
          <button type="button" class="p2-secondary" data-schedule-prev-week>←</button>
          <button type="button" class="p2-secondary" data-schedule-this-week>Ši savaitė</button>
          <button type="button" class="p2-secondary" data-schedule-next-week>→</button>
          <button type="button" class="p2-primary" data-schedule-new>＋ Naujas pamokos laikas</button>
        </div>
      </div>
      ${assignHint}
      <div class="p2-schedule-week-grid">${dayColumns}</div>`;

    const dayOptionsFor = selectedDay => SCHEDULE_DAYS.map(day => `<option value="${day.id}" ${day.id === selectedDay ? 'selected' : ''}>${escapeHtml(day.label)}</option>`).join('');
    const lessonOptionsFor = selectedId => LESSON_CATALOG.map(lesson => `<option value="${escapeHtml(lesson.id)}" ${lesson.id === selectedId ? 'selected' : ''}>${escapeHtml(lesson.shortTitle)} · ${lesson.taskCount} užd.</option>`).join('');
    const studentOptionsFor = selectedId => students.length
      ? students.map(student => `<option value="${escapeHtml(student.id)}" ${student.id === selectedId ? 'selected' : ''}>${escapeHtml(scheduleStudentTeacherLabel(student, students))}</option>`).join('')
      : '<option value="">Mokinių dar nėra</option>';

    if (scheduleCreateMode && !editing) {
      const preset = scheduleCreatePreset && typeof scheduleCreatePreset === 'object' ? scheduleCreatePreset : {};
      const effectiveFrom = scheduleDateKeyValid(preset.dateKey) ? preset.dateKey : scheduleSelectedDateKey;
      const day = Number(preset.day || scheduleDateDayIndex(effectiveFrom) || scheduleSelectedDay || 1);
      editorHost.innerHTML = `
        <div class="p2-schedule-editor-head"><button type="button" class="p2-schedule-editor-close" data-schedule-editor-close>×</button><span class="p2-label">NAUJAS PAMOKOS LAIKAS</span><h3>Sukurti pamokos laiką</h3><p class="p2-schedule-editor-note">Čia kuriamas pats laikas. Mokinius priskirsi tik po to.</p></div>
        <div class="p2-schedule-form">
          <label><span>Pavadinimas <small>nebūtina</small></span><input id="p2ScheduleLabel" maxlength="80" placeholder="Pvz. Vakarinė pamoka"></label>
          <div class="p2-schedule-form-row two"><label><span>Galioja nuo</span><input id="p2ScheduleEffectiveFrom" type="date" value="${escapeHtml(effectiveFrom)}"></label><label><span>Savaitės diena</span><select id="p2ScheduleDay">${dayOptionsFor(day)}</select></label></div>
          <div class="p2-schedule-form-row two"><label><span>Pradžia</span><input id="p2ScheduleStart" type="time" value="${escapeHtml(defaultScheduleTime())}" step="300"></label><label><span>Trukmė (min.)</span><input id="p2ScheduleDuration" type="number" min="15" max="180" step="5" value="40"></label></div>
          <label><span>Numatytos pratybos <small>nebūtina</small></span><select id="p2ScheduleLesson"><option value="">Tik lenta / pratybas priskirsiu vėliau</option>${lessonOptionsFor('')}</select></label>
          <div class="p2-schedule-form-actions p2-schedule-form-actions-single"><span></span><button type="button" class="p2-primary" data-schedule-create>Sukurti pamokos laiką</button></div>
        </div>`;
    } else if (editing) {
      const selectedDate = scheduleDateKeyValid(editingScheduleDateKey) ? editingScheduleDateKey : scheduleSelectedDateKey;
      const time = scheduleSlotTimeForDate(editing, selectedDate) || scheduleSlotTimeVersions(editing).slice(-1)[0] || { day: scheduleSelectedDay, start: defaultScheduleTime(), durationMinutes: 40, effectiveFrom: selectedDate };
      const assignments = scheduleAttendanceAssignments(editing);
      const activeAssignments = scheduleActiveAssignments(editing, selectedDate);
      const run = teacherStudentDb.scheduleRuns?.[editingScheduleId]?.[selectedDate] || null;
      const occurrenceState = scheduleOccurrenceState(editing, selectedDate);
      const runRooms = scheduleRunRooms(run);
      const presetId = scheduleCreatePreset?.studentId && teacherStudentDb.students?.[scheduleCreatePreset.studentId] ? scheduleCreatePreset.studentId : '';
      const assignmentRows = assignments.length ? assignments.map(item => {
        const student = studentRecord(item.studentId);
        return `<div class="p2-schedule-assignment-row"><div><strong>${escapeHtml(scheduleStudentTeacherLabel(student, students))}</strong><span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(item))}">${escapeHtml(scheduleModeLabel(item, true))}</span><small>${escapeHtml(scheduleAssignmentSummary(item))}</small></div>${item.legacy ? '<em>Senas įrašas</em>' : `<button type="button" class="is-muted" data-schedule-assignment-delete="${escapeHtml(item.id)}">Pašalinti</button>`}</div>`;
      }).join('') : '<div class="p2-schedule-no-students">Mokiniai dar nepriskirti.</div>';
      const versions = scheduleSlotTimeVersions(editing);
      const versionRows = versions.map((item, index) => {
        const technicalLegacyDate = item.id === '__legacy__' || String(item.effectiveFrom || '') === '2000-01-01';
        const versionLabel = technicalLegacyDate && index === 0 ? 'Pradinis laikas' : `Nuo ${escapeHtml(item.effectiveFrom)}`;
        return `<div class="p2-schedule-time-version ${technicalLegacyDate ? 'is-legacy' : ''}"><strong>${versionLabel}</strong><span>${escapeHtml(SCHEDULE_DAYS.find(day => day.id === Number(item.day))?.label || '')} · ${escapeHtml(item.start)} · ${Math.max(15, Number(item.durationMinutes || 40))} min.</span></div>`;
      }).join('');
      const closureRanges = scheduleSlotClosureRanges(editing);
      const retiredFrom = scheduleDateKeyValid(editing.retiredFrom) ? String(editing.retiredFrom) : '';
      const closureRows = closureRanges.length ? closureRanges.map(item => `<div class="p2-schedule-time-version is-closed"><strong>Nevyksta ${escapeHtml(item.fromDate)}–${escapeHtml(item.toDate)}</strong><span>Po šio intervalo laikas ir jo mokinių priskyrimai automatiškai grįžta.</span><button type="button" class="is-muted" data-schedule-closure-delete="${escapeHtml(item.id)}">Atšaukti išimtį</button></div>`).join('') : '';
      const label = String(editing.label || '').trim();
      editorHost.innerHTML = `
        <div class="p2-schedule-editor-head"><button type="button" class="p2-schedule-editor-close" data-schedule-editor-close>×</button><span class="p2-label">PAMOKOS LAIKAS</span><h3>${escapeHtml(label || `${time.start} · ${SCHEDULE_DAYS.find(day => day.id === Number(time.day))?.label || ''}`)}</h3><p class="p2-schedule-editor-note">Laiko išimtys nekeičia praeities pamokų istorijos ir neliečia kitų mokinių priskyrimų prie kitų laikų.</p></div>
        <div class="p2-schedule-form p2-schedule-slot-editor">
          <section class="p2-schedule-editor-section"><h4>Pamokos laikas</h4>
            <div class="p2-schedule-current-time"><span>Pasirinkta data</span><strong>${escapeHtml(selectedDate)} · ${escapeHtml(time.start)} · ${Math.max(15, Number(time.durationMinutes || 40))} min.</strong></div>
            <div class="p2-schedule-time-history">${versionRows}${closureRows}${retiredFrom ? `<div class="p2-schedule-time-version is-closed"><strong>Panaikintas nuo ${escapeHtml(retiredFrom)}</strong><span>Nuo šios datos šis pamokos laikas nebegrįžta. Kiti mokinių laikai neliečiami.</span></div>` : ''}</div>
            <details class="p2-schedule-change-time p2-schedule-time-manager" data-schedule-time-manager>
              <summary>Tvarkyti pamokos laiką</summary>
              <label><span>Veiksmas</span><select id="p2ScheduleTimeManageAction"><option value="temporary">Laikinai pašalinti nuo–iki</option>${retiredFrom ? '' : '<option value="retire">Panaikinti nuo datos</option>'}</select></label>
              <div class="p2-schedule-time-manage-pane" data-time-manage-temporary>
                <small>Šiuo laikotarpiu pats laikas tvarkaraštyje nevyksta. Jo nuolatiniai mokinių priskyrimai išlieka ir po intervalo automatiškai vėl galioja. Kiti tų mokinių pamokų laikai neliečiami.</small>
                <div class="p2-schedule-form-row two"><label><span>Nuo</span><input id="p2ScheduleCloseFrom" type="date" value="${escapeHtml(selectedDate)}"></label><label><span>Iki</span><input id="p2ScheduleCloseTo" type="date" value="${escapeHtml(selectedDate)}"></label></div>
                <button type="button" class="p2-student-danger" data-schedule-close-range>Laikinai pašalinti laiką</button>
              </div>
              ${retiredFrom ? '' : `<div class="p2-schedule-time-manage-pane" data-time-manage-retire hidden>
                <small>Praeities pamokos ir Room lieka istorijoje. Nuo pasirinktos datos panaikinamas tik šis pamokos laikas. Kiti mokinio priskyrimai išlieka, o šio laiko mokinius gali atskirai priskirti naujiems laikams.</small>
                <label><span>Nuo datos</span><input id="p2ScheduleRetireFrom" type="date" value="${escapeHtml(selectedDate)}"></label>
                <button type="button" class="p2-student-danger" data-schedule-close-forever>Panaikinti laiką nuo datos</button>
              </div>`}
            </details>
          </section>
          <section class="p2-schedule-editor-section"><h4>Pamokos informacija</h4><label><span>Pavadinimas <small>nebūtina</small></span><input id="p2ScheduleLabel" maxlength="80" value="${escapeHtml(label)}"></label><label><span>Numatytos pratybos <small>nebūtina</small></span><select id="p2ScheduleLesson"><option value="">Tik lenta / pratybas priskirsiu vėliau</option>${lessonOptionsFor(String(editing.lessonId || ''))}</select></label><button type="button" class="p2-secondary" data-schedule-meta-save>Išsaugoti informaciją</button></section>
          <section class="p2-schedule-editor-section"><div class="p2-schedule-section-title"><h4>Mokinių priskyrimai šiame laike</h4><span>${assignments.length}</span></div><p class="p2-schedule-editor-note">Tas pats mokinys gali būti priskirtas ir keliems kitiems pamokų laikams. Šio sąrašo pakeitimai jų neliečia.</p><div class="p2-schedule-assignments">${assignmentRows}</div>
            <div class="p2-schedule-assignment-form"><h5>Pridėti priskyrimą</h5><label><span>Mokinys</span><select id="p2ScheduleAssignStudent"><option value="">Pasirink mokinį</option>${studentOptionsFor(presetId)}</select></label><label><span>Lankymo režimas</span><select id="p2ScheduleAssignMode"><option value="recurring">Nuolatinis</option><option value="dates">Pavienės pamokos</option><option value="intro">Pažintinė pamoka</option><option value="final">Paskutinė pamoka</option></select></label>
              <div data-assignment-recurring><label><span>Lanko nuo</span><input id="p2ScheduleAssignStartDate" type="date" value="${escapeHtml(selectedDate)}"></label><small>Nuolatinis laikas neturi pabaigos datos. Jis galioja, kol mokinio priskyrimas nepakeičiamas arba nepažymima paskutinė pamoka.</small></div>
              <div data-assignment-dates hidden><label><span>Pavienių datų įvedimas</span><select id="p2ScheduleDatesMethod"><option value="exact">Atskiros datos</option><option value="interval">Intervalas</option></select></label><div data-dates-exact><div id="p2ScheduleExactDates"><label><span>Data</span><input type="date" class="p2-schedule-exact-date" value="${escapeHtml(selectedDate)}"></label></div><button type="button" class="p2-secondary" data-schedule-date-add>＋ Pridėti datą</button></div><div data-dates-interval hidden><div class="p2-schedule-form-row two"><label><span>Nuo</span><input id="p2ScheduleIntervalFrom" type="date" value="${escapeHtml(selectedDate)}"></label><label><span>Iki</span><input id="p2ScheduleIntervalTo" type="date" value="${escapeHtml(scheduleAddDays(selectedDate, 28))}"></label></div><label><span>Dažnis</span><select id="p2ScheduleIntervalWeeks"><option value="1">Kas savaitę</option><option value="2">Kas 2 savaites</option><option value="3">Kas 3 savaites</option><option value="4">Kas 4 savaites</option></select></label></div></div>
              <div data-assignment-exact hidden><label><span>Data</span><input id="p2ScheduleAssignDate" type="date" value="${escapeHtml(selectedDate)}"></label><small data-assignment-final-help hidden>„Paskutinė pamoka“ reiškia, kad nuo šios datos mokinys apskritai nebetęsia ankstesnių priskyrimų. Jei nori panaikinti tik vieną jo nuolatinį laiką, pašalink tik tą konkretų priskyrimą.</small></div>
              <button type="button" class="p2-primary" data-schedule-assignment-add>Priskirti mokinį</button>
            </div>
          </section>
          <section class="p2-schedule-editor-section"><h4>${escapeHtml(selectedDate)} pamoka</h4><div class="p2-schedule-open-box ${run && occurrenceState.state === 'running' ? 'is-running' : ''}"><div><strong>${run ? (occurrenceState.state === 'past' ? 'Pamoka įvyko' : occurrenceState.state === 'running' ? 'Pamoka vyksta' : 'Pamoka atidaryta') : (occurrenceState.state === 'past' ? 'Pamokos laikas jau praėjo' : activeAssignments.length ? `${activeAssignments.length} mok. šią datą` : 'Šią datą mokinių nėra')}</strong><span>${activeAssignments.length ? activeAssignments.map(item => `${scheduleStudentTeacherLabel(studentRecord(item.studentId), students)} · ${scheduleModeLabel(item, true)}`).join(' · ') : 'Priskirk mokinius šiai datai.'}</span></div><button type="button" class="p2-primary" data-schedule-open-lesson ${(runRooms.length || (activeAssignments.length && occurrenceState.state !== 'past')) ? '' : 'disabled'}>${runRooms.length ? 'Atidaryti pamoką' : occurrenceState.state === 'past' ? 'Pamoka įvyko' : 'Atidaryti pamoką'}</button></div></section>
        </div>`;
    }

    const shiftWeek = days => {
      scheduleWeekStartKey = scheduleAddDays(scheduleWeekStartKey, days);
      scheduleSelectedDateKey = scheduleAddDays(scheduleSelectedDateKey || scheduleWeekStartKey, days);
      editingScheduleId = '';
      editingScheduleDateKey = '';
      scheduleCreateMode = false;
      renderScheduleModal();
    };
    weekHost.querySelector('[data-schedule-prev-week]')?.addEventListener('click', () => shiftWeek(-7));
    weekHost.querySelector('[data-schedule-next-week]')?.addEventListener('click', () => shiftWeek(7));
    weekHost.querySelector('[data-schedule-this-week]')?.addEventListener('click', () => {
      scheduleWeekStartKey = scheduleWeekStart(new Date());
      scheduleSelectedDateKey = localDateKey();
      editingScheduleId = '';
      editingScheduleDateKey = '';
      scheduleCreateMode = false;
      renderScheduleModal();
    });
    weekHost.querySelector('[data-schedule-new]')?.addEventListener('click', () => {
      editingScheduleId = '';
      editingScheduleDateKey = '';
      scheduleCreateMode = true;
      scheduleCreatePreset = { ...(scheduleCreatePreset?.studentId ? { studentId: scheduleCreatePreset.studentId } : {}), dateKey: scheduleSelectedDateKey };
      renderScheduleModal();
    });
    weekHost.querySelectorAll('[data-schedule-select-date]').forEach(header => header.addEventListener('click', () => {
      const dateKey = String(header.dataset.scheduleSelectDate || '');
      if (!scheduleDateKeyValid(dateKey)) return;
      scheduleSelectedDateKey = dateKey;
      scheduleSelectedDay = scheduleDateDayIndex(dateKey);
      editingScheduleId = '';
      editingScheduleDateKey = '';
      scheduleCreateMode = false;
      renderScheduleModal();
    }));
    weekHost.querySelectorAll('[data-schedule-card]').forEach(card => card.addEventListener('click', event => {
      if (event.target.closest('button, input, select, textarea, a')) return;
      const scheduleId = String(card.dataset.scheduleCard || '');
      const dateKey = String(card.dataset.scheduleDate || '');
      if (!scheduleId || !scheduleDateKeyValid(dateKey)) return;
      editingScheduleId = scheduleId;
      editingScheduleDateKey = dateKey;
      scheduleCreateMode = false;
      scheduleSelectedDateKey = dateKey;
      scheduleSelectedDay = scheduleDateDayIndex(dateKey);
      renderScheduleModal();
    }));

    editorHost.querySelector('[data-schedule-editor-close]')?.addEventListener('click', () => {
      editingScheduleId = '';
      editingScheduleDateKey = '';
      scheduleCreateMode = false;
      if (!scheduleCreatePreset?.studentId) scheduleCreatePreset = null;
      renderScheduleModal();
    });

    editorHost.querySelector('[data-schedule-create]')?.addEventListener('click', () => {
      const effectiveFrom = String(editorHost.querySelector('#p2ScheduleEffectiveFrom')?.value || '').trim();
      const day = Number(editorHost.querySelector('#p2ScheduleDay')?.value || 0);
      const start = String(editorHost.querySelector('#p2ScheduleStart')?.value || '').trim();
      const durationMinutes = Number(editorHost.querySelector('#p2ScheduleDuration')?.value || 40);
      const label = String(editorHost.querySelector('#p2ScheduleLabel')?.value || '').trim();
      const lessonId = String(editorHost.querySelector('#p2ScheduleLesson')?.value || '').trim();
      const lesson = lessonForId(lessonId);
      if (!scheduleDateKeyValid(effectiveFrom)) { toast('Pasirink, nuo kada galioja šis laikas'); return; }
      if (scheduleTimeToMinutes(start) === null) { toast('Pasirink pradžios laiką'); return; }
      const conflict = scheduleFindTimeVersionConflict({ effectiveFrom, day, start, durationMinutes });
      if (conflict) { toast(scheduleConflictText(conflict)); return; }
      requestSchedule({ action: 'slot-add', effectiveFrom, day, start, durationMinutes, label, lessonId: lesson?.id || '', practiceTitle: lesson?.shortTitle || '', taskCount: lesson?.taskCount || 0, attemptPolicy: lesson ? normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy }) : null, ...(lesson ? assignmentContentDetail(lesson) : { schemaVersion: P2_DATA_SCHEMA_VERSION }) });
    });


    editorHost.querySelector('[data-schedule-meta-save]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const label = String(editorHost.querySelector('#p2ScheduleLabel')?.value || '').trim();
      const lessonId = String(editorHost.querySelector('#p2ScheduleLesson')?.value || '').trim();
      const lesson = lessonForId(lessonId);
      requestSchedule({ action: 'slot-meta', scheduleId: editingScheduleId, label, lessonId: lesson?.id || '', practiceTitle: lesson?.shortTitle || '', taskCount: lesson?.taskCount || 0, attemptPolicy: lesson ? normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy }) : null, ...(lesson ? assignmentContentDetail(lesson) : { schemaVersion: P2_DATA_SCHEMA_VERSION }) });
    });

    const timeManageSelect = editorHost.querySelector('#p2ScheduleTimeManageAction');
    const syncTimeManageAction = () => {
      const action = String(timeManageSelect?.value || 'temporary');
      const temporaryPane = editorHost.querySelector('[data-time-manage-temporary]');
      const retirePane = editorHost.querySelector('[data-time-manage-retire]');
      if (temporaryPane) temporaryPane.hidden = action !== 'temporary';
      if (retirePane) retirePane.hidden = action !== 'retire';
    };
    timeManageSelect?.addEventListener('change', syncTimeManageAction);
    syncTimeManageAction();

    const modeSelect = editorHost.querySelector('#p2ScheduleAssignMode');
    const syncAssignmentMode = () => {
      const mode = String(modeSelect?.value || 'recurring');
      const recurring = editorHost.querySelector('[data-assignment-recurring]');
      const dates = editorHost.querySelector('[data-assignment-dates]');
      const exact = editorHost.querySelector('[data-assignment-exact]');
      if (recurring) recurring.hidden = mode !== 'recurring';
      if (dates) dates.hidden = mode !== 'dates';
      if (exact) exact.hidden = mode !== 'intro' && mode !== 'final';
      const finalHelp = editorHost.querySelector('[data-assignment-final-help]');
      if (finalHelp) finalHelp.hidden = mode !== 'final';
    };
    modeSelect?.addEventListener('change', syncAssignmentMode);
    syncAssignmentMode();
    const datesMethod = editorHost.querySelector('#p2ScheduleDatesMethod');
    const syncDatesMethod = () => {
      const method = String(datesMethod?.value || 'exact');
      const exact = editorHost.querySelector('[data-dates-exact]');
      const interval = editorHost.querySelector('[data-dates-interval]');
      if (exact) exact.hidden = method !== 'exact';
      if (interval) interval.hidden = method !== 'interval';
    };
    datesMethod?.addEventListener('change', syncDatesMethod);
    syncDatesMethod();
    editorHost.querySelector('[data-schedule-date-add]')?.addEventListener('click', () => {
      const host = editorHost.querySelector('#p2ScheduleExactDates');
      if (!host) return;
      const label = document.createElement('label');
      label.innerHTML = '<span>Data</span><input type="date" class="p2-schedule-exact-date">';
      host.appendChild(label);
    });

    editorHost.querySelector('[data-schedule-assignment-add]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const studentId = String(editorHost.querySelector('#p2ScheduleAssignStudent')?.value || '').trim();
      const mode = String(editorHost.querySelector('#p2ScheduleAssignMode')?.value || 'recurring');
      if (!studentId) { toast('Pasirink mokinį'); return; }
      const detail = { action: 'assignment-add', scheduleId: editingScheduleId, studentId, mode };
      if (mode === 'recurring') {
        detail.startDate = String(editorHost.querySelector('#p2ScheduleAssignStartDate')?.value || '').trim();
        if (!scheduleDateKeyValid(detail.startDate)) { toast('Pasirink, nuo kada mokinys lanko nuolat'); return; }
      } else if (mode === 'dates') {
        const method = String(editorHost.querySelector('#p2ScheduleDatesMethod')?.value || 'exact');
        if (method === 'exact') {
          detail.dates = Array.from(editorHost.querySelectorAll('.p2-schedule-exact-date')).map(input => String(input.value || '').trim()).filter(Boolean);
          if (!detail.dates.length) { toast('Pridėk bent vieną datą'); return; }
        } else {
          detail.rangeStart = String(editorHost.querySelector('#p2ScheduleIntervalFrom')?.value || '').trim();
          detail.rangeEnd = String(editorHost.querySelector('#p2ScheduleIntervalTo')?.value || '').trim();
          detail.everyWeeks = Number(editorHost.querySelector('#p2ScheduleIntervalWeeks')?.value || 1);
          if (!scheduleDateKeyValid(detail.rangeStart) || !scheduleDateKeyValid(detail.rangeEnd) || detail.rangeEnd < detail.rangeStart) { toast('Patikrink intervalo datas'); return; }
        }
      } else {
        detail.date = String(editorHost.querySelector('#p2ScheduleAssignDate')?.value || '').trim();
        if (!scheduleDateKeyValid(detail.date)) { toast('Pasirink pamokos datą'); return; }
      }
      requestSchedule(detail);
    });

    editorHost.querySelectorAll('[data-schedule-assignment-delete]').forEach(button => button.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const assignmentId = String(button.dataset.scheduleAssignmentDelete || '').trim();
      if (!assignmentId) return;
      if (!window.confirm('Pašalinti šį mokinio priskyrimą? Jau įvykusių pamokų istorija liks.')) return;
      requestSchedule({ action: 'assignment-delete', scheduleId: editingScheduleId, assignmentId });
    }));

    editorHost.querySelector('[data-schedule-open-lesson]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const dateKey = editingScheduleDateKey || scheduleSelectedDateKey;
      const entry = teacherStudentDb.scheduleEntries?.[editingScheduleId];
      if (!entry || !scheduleSlotOccursOnDate({ id: editingScheduleId, ...entry }, dateKey)) { toast('Šis pamokos laikas pasirinktą datą nevyksta'); return; }
      const run = teacherStudentDb.scheduleRuns?.[editingScheduleId]?.[dateKey] || null;
      const active = scheduleActiveAssignments({ id: editingScheduleId, ...entry }, dateKey);
      if (!scheduleRunRooms(run).length && !active.length) { toast('Šiai datai nėra priskirtų mokinių'); return; }
      const button = editorHost.querySelector('[data-schedule-open-lesson]');
      if (button) { button.disabled = true; button.textContent = 'Atidaroma…'; }
      requestSchedule({ action: 'start', scheduleId: editingScheduleId, dateKey });
    });

    editorHost.querySelector('[data-schedule-close-range]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const fromDate = String(editorHost.querySelector('#p2ScheduleCloseFrom')?.value || '').trim();
      const toDate = String(editorHost.querySelector('#p2ScheduleCloseTo')?.value || '').trim();
      if (!scheduleDateKeyValid(fromDate) || !scheduleDateKeyValid(toDate) || toDate < fromDate) { toast('Patikrink laikino pašalinimo datas'); return; }
      if (!window.confirm(`Pašalinti šį pamokos laiką nuo ${fromDate} iki ${toDate}? Pasibaigus intervalui jis automatiškai grįš, o jo ankstesni priskyrimai vėl galios. Kiti mokinių laikai nebus keičiami.`)) return;
      requestSchedule({ action: 'slot-close-range', scheduleId: editingScheduleId, fromDate, toDate });
    });

    editorHost.querySelectorAll('[data-schedule-closure-delete]').forEach(button => button.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const closureId = String(button.dataset.scheduleClosureDelete || '').trim();
      if (!closureId) return;
      requestSchedule({ action: 'slot-close-range-delete', scheduleId: editingScheduleId, closureId });
    }));

    editorHost.querySelector('[data-schedule-close-forever]')?.addEventListener('click', () => {
      if (!editingScheduleId) return;
      const fromDate = String(editorHost.querySelector('#p2ScheduleRetireFrom')?.value || '').trim();
      if (!scheduleDateKeyValid(fromDate)) { toast('Pasirink datą, nuo kurios laikas panaikinamas'); return; }
      if (!window.confirm(`Panaikinti šį pamokos laiką nuo ${fromDate}? Praeities pamokų istorija liks. Nuo šios datos nebegalios tik šis laikas; kiti mokinių priskyrimai liks.`)) return;
      requestSchedule({ action: 'slot-close-forever', scheduleId: editingScheduleId, fromDate });
    });
  }

  function openSchedule() {
    if (role() !== 'teacher') return;
    scheduleWeekStartKey = scheduleWeekStart(new Date());
    scheduleSelectedDateKey = localDateKey();
    scheduleSelectedDay = scheduleTodayIndex();
    ensureScheduleModal();
    editingScheduleId = '';
    editingScheduleDateKey = '';
    scheduleCreateMode = false;
    scheduleCreatePreset = null;
    scheduleModal.hidden = false;
    renderScheduleModal();
  }


  const originalStudentsButton = document.getElementById('studentsButton');
  if (originalStudentsButton) originalStudentsButton.addEventListener('click', openStudentsDatabase);
  const originalScheduleButton = document.getElementById('scheduleButton');
  if (originalScheduleButton) originalScheduleButton.addEventListener('click', openSchedule);

  function queueCurrentStudentLessonSnapshot() {
    if (role() !== 'teacher' || roomSwitching) return;
    clearTimeout(studentDbSnapshotTimer);
    const scheduledRoomId = currentRoomId();
    studentDbSnapshotTimer = setTimeout(() => {
      if (roomSwitching || currentRoomId() !== scheduledRoomId) return;
      const roomId = scheduledRoomId;
      const studentId = linkedStudentIdForRoom(roomId);
      if (!roomId || !studentId) return;
      const state = progress ? normalizedProgress(progress) : null;
      let summary = { status: state?.status || 'not_started', finished: 0, solved: 0, good: 0, help: 0, repeat: 0, percent: 0, taskCount: assignment?.taskCount || 0, currentTaskId: state?.currentTaskId || null };
      if (assignment && state) summary = { ...summary, ...progressStats(), status: state.status, taskCount: activeLesson().taskCount, currentTaskId: state.currentTaskId };
      requestStudentDb({
        action: 'snapshot', studentId, roomId,
        lessonId: assignment?.lessonId || '',
        title: assignment ? activeLesson().shortTitle : '',
        taskCount: assignment ? activeLesson().taskCount : 0,
        assignmentKey: assignment?.assignmentKey || '',
        assignedAt: Number(assignment?.assignedAt || 0) || null,
        contentVersion: Number(assignment?.contentVersion || activeLesson()?.contentVersion || 1),
        contentHash: String(assignment?.contentHash || ''),
        taskIds: Array.isArray(assignment?.taskIds) ? assignment.taskIds : activeLesson().tasks.map(task => task.id),
        contentSnapshot: assignment?.contentSnapshot || lessonContentSnapshot(activeLesson()),
        schemaVersion: P2_DATA_SCHEMA_VERSION,
        summary,
        progressSnapshot: state ? {
          schemaVersion: P2_DATA_SCHEMA_VERSION,
          assignmentKey: String(assignment?.assignmentKey || state.assignmentKey || ''),
          currentTaskId: state.currentTaskId || null,
          status: state.status || 'not_started',
          startedAt: Number(state.startedAt || 0) || null,
          updatedAt: Number(state.updatedAt || Date.now()),
          taskStates: state.taskStates && typeof state.taskStates === 'object' ? state.taskStates : {}
        } : null
      });
    }, 450);
  }

  window.addEventListener('p2:room-student-state', event => {
    roomStudentProfile = event.detail && typeof event.detail === 'object' ? event.detail : null;
    updateStudentIdentityLabels();
    renderLessonStudentTabs();
    renderPanels();
    renderTeacherPreview();
    renderStudentsModal();
  });

  window.addEventListener('p2:room-switch-start', () => {
    roomSwitching = true;
    clearTimeout(studentDbSnapshotTimer);
    studentDbSnapshotTimer = null;
    // Senos Room pedagoginę būseną atjungiame lokaliai, bet sąmoningai
    // neuždarome mokytojo pratybų peržiūros režimo. Naujo mokinio assignment
    // ir progress netrukus ateis iš jo Firebase Room.
    roomStudentProfile = null;
    assignment = null;
    progress = null;
    selectedAnswers = {};
  });

  window.addEventListener('p2:room-switch-complete', () => {
    roomSwitching = false;
    updateStudentIdentityLabels();
    renderLessonStudentTabs();
    renderPanels();
    renderTeacherPreview();
    renderStudentsModal();
    queueCurrentStudentLessonSnapshot();
  });

  window.addEventListener('p2:room-switch-error', () => {
    roomSwitching = false;
    renderLessonStudentTabs();
    renderStudentsModal();
    toast('Nepavyko perjungti mokinio lentos');
  });

  window.addEventListener('p2:student-room-history', event => {
    const detail = event.detail && typeof event.detail === 'object' ? event.detail : {};
    const studentId = String(detail.studentId || '').trim();
    const roomId = String(detail.roomId || '').trim().toUpperCase();
    if (!studentId || !roomId) return;
    const key = studentHistoryCacheKey(studentId, roomId);
    const timer = studentRoomHistoryRequestTimers.get(key);
    if (timer) window.clearTimeout(timer);
    studentRoomHistoryRequestTimers.delete(key);
    const existing = studentRoomHistoryCache.get(key);
    if (detail.error) {
      studentRoomHistoryCache.set(key, {
        ...(existing || {}),
        loading: false,
        fetching: false,
        provisional: true,
        error: String(detail.error),
        data: existing?.data || storedStudentRoomHistoryPayload(teacherStudentDb.students?.[studentId]?.lessons?.[roomId])
      });
    } else {
      studentRoomHistoryCache.set(key, { loading: false, fetching: false, provisional: false, error: '', data: detail.data && typeof detail.data === 'object' ? detail.data : {} });
    }
    if (selectedStudentId === studentId && expandedStudentHistoryRoomId === roomId) renderStudentsModal();
  });

  window.addEventListener('p2:students-state', event => {
    teacherStudentDb = normalizeTeacherStudentDb(event.detail);
    queueLegacyAssignmentBackfills();
    if (selectedStudentId && !teacherStudentDb.students?.[selectedStudentId]) { selectedStudentId = null; studentEditOpen = false; }
    updateStudentIdentityLabels();
    renderLessonStudentTabs();

    // Grįžus iš istorinės lentos tame pačiame skirtuke, atstatome būtent
    // tą mokinio kortelę, iš kurios pamoka buvo atidaryta.
    if (role() === 'teacher') {
      let reopenStudentId = '';
      try { reopenStudentId = String(sessionStorage.getItem(STUDENT_CARD_REOPEN_KEY) || '').trim(); } catch (_) {}
      if (reopenStudentId && teacherStudentDb.students?.[reopenStudentId]) {
        selectedStudentId = reopenStudentId;
        try {
          sessionStorage.removeItem(STUDENT_CARD_REOPEN_KEY);
          sessionStorage.removeItem(STUDENT_HISTORY_RETURN_KEY);
        } catch (_) {}
        openStudentsDatabase({ preserveSelection: true });
        return;
      }
    }
    renderStudentsModal();
    renderScheduleModal();
  });

  const resetBackupButton = () => {
    const button = studentsModal?.querySelector('[data-student-backup]');
    if (button) { button.disabled = false; button.textContent = '↓ Atsisiųsti atsarginę kopiją'; }
  };
  window.addEventListener('p2:backup-complete', resetBackupButton);
  window.addEventListener('p2:backup-error', resetBackupButton);

  window.addEventListener('p2:restore-preview', event => renderBackupRestorePreview(event.detail || {}));
  window.addEventListener('p2:restore-preview-error', event => {
    backupRestorePreview = null;
    const message = String(event.detail?.message || 'Pasirinkta atsarginė kopija netinkama.');
    window.alert(message);
  });
  window.addEventListener('p2:restore-complete', event => {
    const body = backupRestoreModal?.querySelector('#p2BackupRestoreBody');
    if (body) {
      body.innerHTML = `<section class="p2-backup-restore-success"><span aria-hidden="true">✓</span><div><strong>Atkūrimas baigtas</strong><p>${escapeHtml(String(event.detail?.message || 'Pasirinktos kopijos duomenys atkurti.'))}</p><p>Dabartinės būsenos kopija prieš atkūrimą taip pat buvo automatiškai atsisiųsta.</p></div></section><div class="p2-backup-restore-actions"><button type="button" class="p2-primary" data-backup-restore-finish>Gerai</button></div>`;
      body.querySelector('[data-backup-restore-finish]')?.addEventListener('click', () => { closeBackupRestoreModal(); renderStudentsModal(); });
    }
    backupRestorePreview = null;
  });
  window.addEventListener('p2:restore-error', event => {
    const body = backupRestoreModal?.querySelector('#p2BackupRestoreBody');
    const message = String(event.detail?.message || 'Atkūrimas nepavyko. Duomenys nebuvo pakeisti.');
    if (body) {
      body.insertAdjacentHTML('afterbegin', `<div class="p2-backup-restore-error"><strong>Atkūrimas sustabdytas</strong><p>${escapeHtml(message)}</p></div>`);
      const apply = body.querySelector('[data-backup-restore-apply]');
      const cancel = body.querySelector('[data-backup-restore-close-action]');
      if (apply) { apply.disabled = false; apply.textContent = 'Bandyti dar kartą'; }
      cancel?.removeAttribute('disabled');
    } else window.alert(message);
  });

  window.addEventListener('p2:schedule-saved', event => {
    const scheduleId = String(event.detail?.scheduleId || '').trim();
    const kind = String(event.detail?.kind || '').trim();
    if (kind === 'slot-delete' || kind === 'slot-close-range' || kind === 'slot-close-forever') {
      const entry = scheduleId ? teacherStudentDb.scheduleEntries?.[scheduleId] : null;
      if (kind === 'slot-delete' || (entry && editingScheduleDateKey && !scheduleSlotOccursOnDate({ id: scheduleId, ...entry }, editingScheduleDateKey))) {
        editingScheduleId = '';
        editingScheduleDateKey = '';
      }
      scheduleCreateMode = false;
      scheduleCreatePreset = null;
      renderScheduleModal();
      return;
    }
    if (scheduleId) editingScheduleId = scheduleId;
    if (!editingScheduleDateKey) editingScheduleDateKey = scheduleSelectedDateKey || localDateKey();
    scheduleCreateMode = false;
    if (kind === 'assignment') scheduleCreatePreset = null;
    renderScheduleModal();
  });

  window.addEventListener('p2:schedule-started', event => {
    const firstRoom = String(event.detail?.firstRoom || '').trim().toUpperCase();
    if (scheduleModal) scheduleModal.hidden = true;
    editingScheduleId = '';
    editingScheduleDateKey = '';
    scheduleCreateMode = false;
    scheduleCreatePreset = null;
    if (firstRoom && firstRoom !== currentRoomId()) requestTeacherRoomSwitch(firstRoom, false);
  });

  window.addEventListener('p2:schedule-error', () => {
    renderScheduleModal();
  });

  const originalLibraryButton = document.getElementById('libraryButton');
  if (originalLibraryButton) {
    const button = originalLibraryButton.cloneNode(true);
    originalLibraryButton.replaceWith(button);
    button.id = 'libraryButton';
    button.addEventListener('click', () => {
      if (role() !== 'teacher') return;
      openPrototypeLibrary();
    });
  }

  function ensureLibraryModal() {
    if (libraryModal) return libraryModal;
    libraryModal = document.createElement('div');
    libraryModal.className = 'p2-library-modal';
    libraryModal.innerHTML = `
      <div class="p2-library-backdrop" data-close></div>
      <section class="p2-library-panel p2-library-panel-wide" role="dialog" aria-modal="true" aria-label="Mokytojo biblioteka">
        <header><div><span class="p2-side-kicker">P2 PROTOTIPAS</span><h2>Biblioteka</h2></div><button type="button" data-close aria-label="Uždaryti">×</button></header>
        <div class="p2-library-body" id="p2LibraryBody"></div>
      </section>`;
    document.body.appendChild(libraryModal);
    libraryModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => libraryModal.hidden = true));
    return libraryModal;
  }

  function openPrototypeLibrary() {
    ensureLibraryModal();
    renderLibraryContent();
    libraryModal.hidden = false;
  }

  function renderLibraryContent() {
    if (!libraryModal) return;
    const host = libraryModal.querySelector('#p2LibraryBody');
    if (!host) return;

    const cards = LESSON_CATALOG.map(lesson => {
      const assigned = assignment?.lessonId === lesson.id;
      const policy = assigned
        ? normalizedAttemptPolicy(assignment)
        : normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy });
      const replacing = Boolean(assignment && !assigned);
      const icon = lesson.id === GRADE5_REVIEW_LESSON.id ? '5'
        : lesson.id === GRADE7_REVIEW_LESSON.id ? '7'
          : 'ƒ';
      const label = lesson.id === GRADE5_REVIEW_LESSON.id ? '5 KLASĖS KARTOJIMAS'
        : lesson.id === GRADE7_REVIEW_LESSON.id ? '7 KLASĖS KARTOJIMAS'
          : 'LYGČIŲ DIAGNOSTIKA';
      return `
        <article class="p2-library-lesson-card ${assigned ? 'is-assigned' : ''}" data-library-lesson="${escapeHtml(lesson.id)}">
          <div class="p2-library-lesson-icon" aria-hidden="true">${icon}</div>
          <div class="p2-library-lesson-copy">
            <span class="p2-label">${label}</span>
            <h3>${escapeHtml(lesson.shortTitle)}</h3>
            <p>${escapeHtml(lesson.description)}</p>
            <div class="p2-assignment-meta"><span>${lesson.taskCount} užduotys</span><span>${lesson.classCount} pamokoje</span><span>${lesson.selfCount} savarankiškai</span></div>
          </div>
          <div class="p2-library-lesson-actions">
            <div class="p2-library-attempt-summary">
              <span>Bandymų nustatymas</span>
              <b>${escapeHtml(policySummary({ attemptPolicy: policy }))}</b>
              <small>${assigned ? 'Keisk išplėstinėje mokytojo pratybų peržiūroje.' : 'Numatyta: 3 bandymai. Po priskyrimo galėsi nustatyti ir kiekvienai užduočiai atskirai.'}</small>
            </div>
            ${assigned
              ? `<span class="p2-status-badge is-assigned">✓ Priskirta</span><button class="p2-secondary" type="button" data-library-action="unassign" data-lesson-id="${escapeHtml(lesson.id)}">Atšaukti priskyrimą</button>`
              : `<button class="p2-primary" type="button" data-library-action="assign" data-lesson-id="${escapeHtml(lesson.id)}">${replacing ? 'Priskirti vietoje dabartinės' : 'Priskirti mokiniui'}</button>`}
          </div>
        </article>`;
    }).join('');

    host.innerHTML = `
      <div class="p2-library-intro"><div><span class="p2-label">Mokytojo biblioteka</span><h3>Pasirink pamoką mokiniui</h3><p>Priskirta pamoka iškart atsiras mokinio „Mano pratybos“ srityje. Vienu metu aktyvi viena pamoka; kitą gali priskirti vėliau.</p></div></div>
      <div class="p2-library-lesson-list">${cards}</div>
      <div class="p2-library-flow"><span>Biblioteka</span><b>→</b><span>Priskirti</span><b>→</b><span>Mokinio „Mano pratybos“</span><b>→</b><span>Mokinio eiga</span></div>
    `;

    host.querySelectorAll('[data-library-action="assign"]').forEach(button => {
      button.addEventListener('click', () => {
        const lesson = lessonForId(button.dataset.lessonId);
        if (!lesson) return;
        if (assignment && assignment.lessonId !== lesson.id) {
          const current = lessonForId(assignment.lessonId);
          const ok = window.confirm(`Dabar priskirta „${current?.shortTitle || assignment.title || 'kita pamoka'}“. Pakeisti ją į „${lesson.shortTitle}“?`);
          if (!ok) return;
        }
        const attemptPolicy = normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy });
        window.dispatchEvent(new CustomEvent('p2:assignment-request', {
          detail: { action: 'assign', lessonId: lesson.id, title: lesson.title, taskCount: lesson.taskCount, attemptPolicy, ...assignmentContentDetail(lesson) }
        }));
        toast('Pamoka priskiriama mokiniui…');
      });
    });

    host.querySelectorAll('[data-library-action="unassign"]').forEach(button => {
      button.addEventListener('click', () => {
        const lesson = lessonForId(button.dataset.lessonId) || activeLesson();
        if (!window.confirm(`Atšaukti pamokos „${lesson.shortTitle}“ priskyrimą ir išvalyti mokinio eigą?`)) return;
        window.dispatchEvent(new CustomEvent('p2:assignment-request', { detail: { action: 'unassign', lessonId: lesson.id } }));
        toast('Priskyrimas atšaukiamas…');
      });
    });
  }

  function ensureTeacherPreviewWindow() {
    if (teacherPreviewWindow) return teacherPreviewWindow;
    teacherPreviewWindow = document.createElement('section');
    teacherPreviewWindow.className = 'p2-teacher-practice-window';
    teacherPreviewWindow.hidden = true;
    teacherPreviewWindow.setAttribute('aria-label', 'Mokytojo pratybų peržiūra');
    teacherPreviewWindow.innerHTML = `
      <header class="p2-practice-window-chrome">
        <div class="p2-practice-window-title">
          <span class="p2-side-kicker">MOKYTOJO PERŽIŪRA</span>
          <strong>${escapeHtml(activeLesson().shortTitle)}</strong>
        </div>
        <div class="p2-practice-window-controls" aria-label="Pratybų peržiūros lango valdymas">
          <button type="button" data-preview-window="minimize" title="Minimizuoti" aria-label="Minimizuoti">—</button>
          <button type="button" data-preview-window="maximize" title="Išplėsti" aria-label="Išplėsti">□</button>
          <button type="button" data-preview-window="close" title="Uždaryti" aria-label="Uždaryti">×</button>
        </div>
      </header>
      <div class="p2-teacher-practice-window-body" id="p2TeacherPreviewBody"></div>`;
    sidePane.appendChild(teacherPreviewWindow);
    teacherPreviewWindow.querySelector('[data-preview-window="minimize"]')?.addEventListener('click', () => {
      setTeacherPreviewMode(teacherPreviewMode === 'minimized' ? 'docked' : 'minimized');
    });
    teacherPreviewWindow.querySelector('[data-preview-window="maximize"]')?.addEventListener('click', () => {
      if (teacherPreviewMode === 'maximized') setTeacherPreviewMode(teacherPreviewRestoreMode || 'docked');
      else setTeacherPreviewMode('maximized');
    });
    teacherPreviewWindow.querySelector('[data-preview-window="close"]')?.addEventListener('click', () => setTeacherPreviewMode('closed'));
    teacherPreviewWindow.querySelector('.p2-practice-window-title')?.addEventListener('dblclick', () => {
      if (teacherPreviewMode === 'minimized') setTeacherPreviewMode('docked');
      else setTeacherPreviewMode(teacherPreviewMode === 'maximized' ? teacherPreviewRestoreMode || 'docked' : 'maximized');
    });
    return teacherPreviewWindow;
  }

  function setTeacherSideHeader(previewActive = false) {
    if (role() !== 'teacher') return;
    sideKicker.textContent = previewActive ? 'MOKYTOJO PERŽIŪRA' : 'MOKYTOJO STEBĖJIMAS';
    sideTitle.textContent = previewActive ? 'Pratybų peržiūra' : `${currentStudentName('Mokinys')} · eiga`;
  }

  function setTeacherPreviewMode(nextMode) {
    if (role() !== 'teacher') return;
    const preview = ensureTeacherPreviewWindow();
    const mode = ['closed','docked','minimized','maximized'].includes(nextMode) ? nextMode : 'docked';
    if (mode === 'maximized' && teacherPreviewMode !== 'maximized') {
      teacherPreviewRestoreMode = teacherPreviewMode === 'minimized' ? 'minimized' : 'docked';
    }
    teacherPreviewMode = mode;
    preview.hidden = mode === 'closed';
    preview.classList.toggle('is-docked', mode === 'docked');
    preview.classList.toggle('is-minimized', mode === 'minimized');
    preview.classList.toggle('is-maximized', mode === 'maximized');
    body.classList.toggle('p2-teacher-preview-maximized', mode === 'maximized');
    sidePane.classList.toggle('has-preview-docked', mode === 'docked');

    if (preview.parentElement !== sidePane) sidePane.appendChild(preview);
    if (teacherPanel) teacherPanel.hidden = mode === 'docked';
    setTeacherSideHeader(mode === 'docked');

    const minButton = preview.querySelector('[data-preview-window="minimize"]');
    const maxButton = preview.querySelector('[data-preview-window="maximize"]');
    if (minButton) {
      minButton.textContent = mode === 'minimized' ? '▣' : '—';
      minButton.title = mode === 'minimized' ? 'Atkurti dešinėje' : 'Minimizuoti';
      minButton.setAttribute('aria-label', minButton.title);
    }
    if (maxButton) {
      maxButton.textContent = mode === 'maximized' ? '❐' : '□';
      maxButton.title = mode === 'maximized' ? 'Atkurti ankstesnį dydį' : 'Išplėsti';
      maxButton.setAttribute('aria-label', maxButton.title);
    }
    if (mode !== 'closed') renderTeacherPreview();
  }

  function openTeacherPreview() {
    if (!assignment) return;
    if (!teacherPreviewTaskId || teacherFollowStudent) teacherPreviewTaskId = currentTask().id;
    setTeacherPreviewMode('docked');
  }

  function teacherPreviewTask() {
    return activeLesson().tasks.find(task => task.id === teacherPreviewTaskId) || currentTask();
  }

  function setAttemptPolicy(nextPolicy, message = 'Bandymų nustatymai atnaujinti') {
    if (!assignment || role() !== 'teacher') return;
    const normalized = normalizedAttemptPolicy({ attemptPolicy: nextPolicy });
    assignment = { ...assignment, attemptPolicy: normalized };
    pendingAttemptPolicy = normalized;
    renderTeacherPanel();
    renderLibraryContent();
    renderTeacherPreview();
    window.dispatchEvent(new CustomEvent('p2:assignment-request', { detail: { action: 'settings', attemptPolicy: normalized } }));
    toast(message);
  }

  function attemptSettingsMarkup(previewTask) {
    const policy = normalizedAttemptPolicy(assignment);
    const global = policy.defaultMaxAttempts;
    const limits = [1, 2, 3, 0];
    const globalButtons = limits.map(limit => `<button type="button" class="${global === limit ? 'is-active' : ''}" data-attempt-global="${limit}">${attemptLimitLabel(limit)}</button>`).join('');
    const taskRows = activeLesson().tasks.map((task, index) => {
      const hasOverride = Object.prototype.hasOwnProperty.call(policy.taskMaxAttempts, task.id);
      const effective = attemptLimitForTask(task.id);
      const item = taskState(task.id);
      const options = [
        `<option value="inherit" ${hasOverride ? '' : 'selected'}>Bendras (${attemptLimitLabel(global)})</option>`,
        ...limits.map(limit => `<option value="${limit}" ${hasOverride && policy.taskMaxAttempts[task.id] === limit ? 'selected' : ''}>${limit === 0 ? 'Neribotai' : `${limit} ${limit === 1 ? 'bandymas' : 'bandymai'}`}</option>`)
      ].join('');
      return `
        <div class="p2-attempt-task-row ${task.id === previewTask.id ? 'is-current' : ''} ${hasOverride ? 'has-override' : ''}">
          <button type="button" class="p2-attempt-task-number" data-attempt-preview-task="${task.id}" title="Rodyti ${index + 1} užduotį">${index + 1}</button>
          <div class="p2-attempt-task-copy"><strong>${escapeHtml(task.label)}</strong><span>${Number(item.attempts || 0)} / ${effective === 0 ? '∞' : effective} panaudota</span></div>
          <select data-attempt-task="${task.id}" aria-label="${index + 1} užduoties bandymų skaičius">${options}</select>
        </div>`;
    }).join('');
    return `
      <aside class="p2-attempt-settings">
        <header class="p2-attempt-settings-head"><div><span class="p2-label">MOKYTOJO NUSTATYMAI</span><h3>Bandymų skaičius</h3></div><span class="p2-attempt-sync">● gyvai</span></header>
        <section class="p2-attempt-global-card">
          <div class="p2-attempt-setting-title"><strong>Bendras nustatymas</strong><span>Taikomas visoms užduotims be individualaus nustatymo.</span></div>
          <div class="p2-attempt-global-actions"><div class="p2-attempt-segment" aria-label="Bendras bandymų skaičius">${globalButtons}</div><button type="button" class="p2-attempt-apply-all" data-attempt-apply-all>Taikyti visoms</button></div>
        </section>
        <div class="p2-attempt-list-head"><strong>Individualiai</strong><span>„Bendras“ reiškia, kad užduotis paveldi aukščiau pasirinktą skaičių.</span></div>
        <div class="p2-attempt-task-list">${taskRows}</div>
        <p class="p2-attempt-note">Pakeitimai iškart perduodami mokiniui. Jei bandymų limitas jau išnaudotas, užduotis užrakinama ir žymima „Kartoti“.</p>
      </aside>`;
  }

  function bindAttemptSettings(host) {
    host.querySelectorAll('[data-attempt-global]').forEach(button => {
      button.addEventListener('click', () => {
        const policy = normalizedAttemptPolicy(assignment);
        policy.defaultMaxAttempts = normalizeAttemptLimit(button.dataset.attemptGlobal, policy.defaultMaxAttempts);
        setAttemptPolicy(policy, `Bendras limitas: ${attemptLimitLabel(policy.defaultMaxAttempts)}`);
      });
    });
    host.querySelector('[data-attempt-apply-all]')?.addEventListener('click', () => {
      const policy = normalizedAttemptPolicy(assignment);
      policy.taskMaxAttempts = {};
      setAttemptPolicy(policy, 'Bendras bandymų skaičius pritaikytas visoms užduotims');
    });
    host.querySelectorAll('[data-attempt-task]').forEach(select => {
      select.addEventListener('change', () => {
        const policy = normalizedAttemptPolicy(assignment);
        const taskId = select.dataset.attemptTask;
        if (select.value === 'inherit') delete policy.taskMaxAttempts[taskId];
        else policy.taskMaxAttempts[taskId] = normalizeAttemptLimit(select.value, policy.defaultMaxAttempts);
        setAttemptPolicy(policy, `${taskIndex(taskId) + 1} užduoties bandymų skaičius atnaujintas`);
      });
    });
    host.querySelectorAll('[data-attempt-preview-task]').forEach(button => {
      button.addEventListener('click', () => {
        teacherPreviewTaskId = button.dataset.attemptPreviewTask;
        teacherFollowStudent = false;
        renderTeacherPreview();
      });
    });
  }

  function teacherSolutionMarkup(task, item) {
    const response = solutionResponseForItem(item);
    const stepResults = Array.isArray(item.validationResult?.stepResults) ? item.validationResult.stepResults : [];
    const rows = response.steps.map((step, index) => {
      const result = stepResults[index] || null;
      const resultClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
      const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
      const groupId = step?.type === 'alternatives' ? String(step?.branchGroupId || '') : '';
      const previous = response.steps[index - 1];
      const next = response.steps[index + 1];
      const previousSameGroup = Boolean(groupId && previous?.type === 'alternatives' && previous?.branchGroupId === groupId);
      const nextSameGroup = Boolean(groupId && next?.type === 'alternatives' && next?.branchGroupId === groupId);
      const groupClass = step?.type === 'alternatives' && groupId
        ? ` is-branch-group-${previousSameGroup ? (nextSameGroup ? 'middle' : 'end') : (nextSameGroup ? 'start' : 'single')}`
        : '';
      const continuationClass = step?.values?.some(value => String(value || '').trim().startsWith('=')) ? ' is-continuation-line' : '';
      const separatorLabel = previousSameGroup ? '' : 'arba';
      // Teacher preview must render the same LaTeX representation that the student MathLive field uses.
      // `values` is the plain/ASCII form used by validators (e.g. sqrt(D), /, *), and feeding it
      // back into <math-field> as LaTeX makes formulas look broken in the teacher view.
      const latexValues = Array.isArray(step?.latexValues) ? step.latexValues : [];
      const plainValues = Array.isArray(step?.values) ? step.values : [];
      const displayValue = branchIndex => String(latexValues[branchIndex] || plainValues[branchIndex] || '');
      let valueMarkup;
      if (step?.type === 'alternatives') {
        const branchCount = Math.max(plainValues.length, latexValues.length, 2);
        const branches = Array.from({ length: branchCount }, (_, branchIndex) => `<math-field class="p2-static-math p2-teacher-live-math" read-only tabindex="-1">${escapeHtml(displayValue(branchIndex))}</math-field>`);
        valueMarkup = `<div class="p2-teacher-solution-branches">${branches.map((branch, branchIndex) => `${branchIndex ? `<span>${separatorLabel}</span>` : ''}${branch}`).join('')}</div>`;
      } else {
        const value = displayValue(0);
        valueMarkup = `<div class="p2-teacher-solution-single ${step?.type === 'solution-set' ? 'is-answer' : ''}">
          ${step?.type === 'solution-set' ? '<span class="p2-solution-answer-prefix">Ats.:</span>' : ''}
          <math-field class="p2-static-math p2-teacher-live-math" read-only tabindex="-1">${escapeHtml(value)}</math-field>
        </div>`;
      }
      return `
        <div class="p2-solution-step p2-paper-step p2-teacher-solution-step${resultClass}${groupClass}${continuationClass}"${groupId ? ` data-branch-group="${escapeHtml(groupId)}"` : ''}>
          <div class="p2-solution-step-main">
            ${valueMarkup}
            <p class="p2-solution-step-message">${result?.message ? escapeHtml(result.message) : ''}</p>
          </div>
          <span class="p2-solution-step-state" aria-hidden="true">${stateMark}</span>
        </div>`;
    }).join('');
    return `
      <section class="p2-teacher-solution-view p2-solution-paper">
        <header><div><strong>Sprendimas</strong><span>Tas pats mokinio „lapas“ realiu laiku</span></div><b class="p2-live-label">● gyvai</b></header>
        <div class="p2-solution-steps p2-solution-paper-lines">${rows}</div>
      </section>`;
  }


  function teacherExpressionMarkup(task, item) {
    const response = expressionResponseForItem(item);
    const result = item.validationResult || null;
    const stateClass = result?.status === 'correct' ? ' is-correct' : result?.status === 'incorrect' ? ' is-error' : result?.status === 'warning' ? ' is-warning' : '';
    const stateMark = result?.status === 'correct' ? '✓' : result?.status === 'incorrect' ? '×' : result?.status === 'warning' ? '!' : '';
    return `
      <section class="p2-teacher-expression-view${stateClass}">
        <header><div><strong>Mokinio atsakymas</strong><span>Tas pats MathLive laukas realiu laiku</span></div><b class="p2-live-label">● gyvai</b></header>
        <div class="p2-teacher-expression-value">
          <math-field class="p2-static-math p2-teacher-live-math" read-only tabindex="-1">${escapeHtml(response.answerLatex || response.answer || '')}</math-field>
          <b class="p2-expression-state" aria-hidden="true">${stateMark}</b>
        </div>
        ${result?.message ? `<p class="p2-expression-message">${escapeHtml(result.message)}</p>` : ''}
      </section>`;
  }

  function renderTeacherPreview() {
    if (!teacherPreviewWindow || teacherPreviewMode === 'closed') return;
    const host = teacherPreviewWindow.querySelector('#p2TeacherPreviewBody');
    if (!host || !assignment) return;
    const previewTitle = teacherPreviewWindow.querySelector('.p2-practice-window-title strong');
    if (previewTitle) previewTitle.textContent = activeLesson().shortTitle;

    const studentTask = currentTask();
    if (teacherFollowStudent) teacherPreviewTaskId = studentTask.id;
    const previewTask = teacherPreviewTask();
    const previewIndex = taskIndex(previewTask.id) + 1;
    const studentIndex = taskIndex(studentTask.id) + 1;
    const item = taskState(previewTask.id);
    const isStudentTask = previewTask.id === studentTask.id;
    const solutionTask = isSolutionTask(previewTask);
    const expressionTask = isExpressionTask(previewTask);
    const simpleInputTask = isSimpleInputTask(previewTask);
    const pedagogy = pedagogicalStatus(item, { taskId: previewTask.id, current: isStudentTask && normalizedProgress(progress).status === 'in_progress' });
    const answerText = item.lastAnswer ? escapeHtml(item.lastAnswer) : '—';
    const liveAnswer = item.liveAnswer || item.lastAnswer || '';

    let conditionMarkup;
    let answerKeyMarkup;
    let responseMarkup;
    if (solutionTask) {
      conditionMarkup = `
        <h3>${escapeHtml(previewTask.title || 'Išspręsk lygtį')}</h3>
        <p class="p2-preview-instruction">${escapeHtml(previewTask.instruction || '')}</p>
        <math-field class="p2-static-math p2-preview-equation" read-only tabindex="-1">${escapeHtml(previewTask.prompt)}</math-field>`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key p2-teacher-math-answer"><span>Teisingas atsakymas</span><math-field class="p2-static-math p2-answer-equation" read-only tabindex="-1">${escapeHtml(previewTask.answer)}</math-field></div>`;
      responseMarkup = teacherSolutionMarkup(previewTask, item);
    } else if (expressionTask) {
      conditionMarkup = `
        <h3>${escapeHtml(previewTask.title || 'Suprastink reiškinį')}</h3>
        <p class="p2-preview-instruction">${escapeHtml(previewTask.instruction || '')}</p>
        <math-field class="p2-static-math p2-preview-equation" read-only tabindex="-1">${escapeHtml(previewTask.prompt)}</math-field>
        ${previewTask.response?.options?.domain ? `<p class="p2-expression-domain">Apibrėžimo sąlyga: ${escapeHtml(previewTask.response.options.domain)}</p>` : ''}`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key p2-teacher-math-answer"><span>Teisingas atsakymas</span><math-field class="p2-static-math p2-answer-equation" read-only tabindex="-1">${escapeHtml(previewTask.answer)}</math-field></div>`;
      responseMarkup = teacherExpressionMarkup(previewTask, item);
    } else if (simpleInputTask) {
      conditionMarkup = `<h3>${escapeHtml(previewTask.title || 'Užduotis')}</h3><p class="p2-preview-instruction">${renderRichMathText(taskDisplayPrompt(previewTask))}</p>${taskDiagramMarkup(previewTask)}`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key"><span>Teisingas atsakymas</span><strong>${escapeHtml(previewTask.answer)}${previewTask.inputSuffix ? ` ${escapeHtml(previewTask.inputSuffix)}` : ''}</strong></div>`;
      responseMarkup = `<div class="p2-teacher-simple-answer"><span>Mokinio įrašas</span><strong>${liveAnswer ? escapeHtml(liveAnswer) : '—'}${liveAnswer && previewTask.inputSuffix ? ` ${escapeHtml(previewTask.inputSuffix)}` : ''}</strong><small>● gyvai</small></div>`;
    } else {
      const choices = Array.isArray(previewTask.choices) ? previewTask.choices : [];
      const correctIndex = Math.max(0, choices.findIndex(choice => choice === previewTask.answer));
      const correctLetter = String.fromCharCode(65 + correctIndex);
      conditionMarkup = `<h3>${renderRichMathText(taskDisplayPrompt(previewTask))}</h3>${taskDiagramMarkup(previewTask)}`;
      answerKeyMarkup = `<div class="p2-teacher-answer-key"><span>Teisingas atsakymas</span><strong>${correctLetter} · ${renderRichMathText(taskDisplayChoice(previewTask, correctIndex, previewTask.answer))}</strong></div>`;
      const choiceMarkup = choices.map((choice, index) => {
        const isSelected = liveAnswer === choice;
        const classes = ['p2-preview-choice', isSelected ? 'is-student-selected' : ''].filter(Boolean).join(' ');
        return `<div class="${classes}"><span class="p2-preview-choice-letter">${String.fromCharCode(65 + index)}</span><b>${renderRichMathText(taskDisplayChoice(previewTask, index, choice))}</b></div>`;
      }).join('');
      responseMarkup = `<div class="p2-preview-choice-list">${choiceMarkup}</div>`;
    }

    const previewFeedback = taskFeedbackMarkup(previewTask, item, { teacher: true });
    const taskNavigation = activeLesson().tasks.map((task, index) => {
      const taskItem = taskState(task.id);
      const taskPedagogy = pedagogicalStatus(taskItem, { taskId: task.id, current: task.id === studentTask.id && normalizedProgress(progress).status === 'in_progress' });
      const classes = [
        'p2-task-dot',
        task.id === previewTask.id ? 'is-current' : '',
        task.id === studentTask.id ? 'is-student-current' : '',
        taskPedagogy.key === 'good' ? 'is-done' : '',
        taskPedagogy.key === 'help' ? 'is-help' : '',
        taskPedagogy.key === 'repeat' ? 'is-repeat' : ''
      ].filter(Boolean).join(' ');
      return `<button type="button" class="${classes}" data-preview-task="${task.id}" title="${index + 1}. ${escapeHtml(task.title || task.prompt)} · ${taskPedagogy.label}" aria-label="${index + 1} užduotis, ${taskPedagogy.label}">${index + 1}</button>`;
    }).join('');

    const locationText = isStudentTask
      ? `${currentStudentName('Mokinys')} · ${studentIndex} / ${activeLesson().taskCount}`
      : `${currentStudentName('Mokinys')} · ${studentIndex} / ${activeLesson().taskCount} · Peržiūri ${previewIndex}`;

    host.innerHTML = `
      <div class="p2-preview-toolbar">
        <div class="p2-preview-location"><span class="p2-live-dot" aria-hidden="true"></span><strong>${escapeHtml(locationText)}</strong></div>
        <div class="p2-preview-follow-actions">
          ${teacherFollowStudent
            ? '<button type="button" class="p2-secondary is-active" data-preview-action="follow">✓ Sekama</button>'
            : '<button type="button" class="p2-secondary" data-preview-action="return">↩ Grįžti prie mokinio</button>'}
        </div>
      </div>
      <div class="p2-preview-layout">
        <div class="p2-preview-main">
          <article class="p2-preview-detail ${(solutionTask || expressionTask) ? 'p2-solution-preview-detail' : ''}${simpleInputTask ? ' p2-simple-input-preview-detail' : ''}">
            <header class="p2-preview-detail-head">
              <div>
                <span class="p2-label">${escapeHtml(previewTask.label)} · ${previewIndex} užduotis${isStudentTask ? ` · ${escapeHtml(currentStudentName('Mokinys'))} dabar čia` : ''}</span>
                ${conditionMarkup}
                ${answerKeyMarkup}
              </div>
              <span class="p2-preview-badge status-${pedagogy.key}">${pedagogy.label}</span>
            </header>
            ${responseMarkup}
            ${previewFeedback}
            <div class="p2-preview-detail-metrics">
              <span>Bandymų: <b>${attemptUsageLabel(item, previewTask.id)}</b></span>
              <span>Pagalba: <b>${item.hintUsed ? 'naudota' : 'nenaudota'}</b></span>
              <span>Paskutinis pateiktas: <b>${answerText}</b></span>
            </div>
            <div class="p2-preview-hint"><span>Užuomina</span><p>${escapeHtml(previewTask.hint)}</p></div>
            <div class="p2-preview-detail-actions">
              <button type="button" class="p2-secondary" data-preview-action="previous" ${previewIndex === 1 ? 'disabled' : ''}>← Ankstesnė</button>
              <button type="button" class="p2-secondary" data-preview-action="next" ${previewIndex === activeLesson().taskCount ? 'disabled' : ''}>Kita →</button>
              <span></span>
              <button type="button" class="p2-primary" disabled title="Bus įgyvendinta kitame etape">Rodyti lentoje</button>
            </div>
          </article>
          <nav class="p2-task-dots p2-teacher-task-dots" aria-label="Pamokos užduotys">${taskNavigation}</nav>
        </div>
        ${attemptSettingsMarkup(previewTask)}
      </div>`;

    host.querySelectorAll('[data-preview-task]').forEach(button => {
      button.addEventListener('click', () => {
        teacherPreviewTaskId = button.dataset.previewTask;
        teacherFollowStudent = false;
        renderTeacherPreview();
      });
    });
    bindAttemptSettings(host);
    host.querySelector('[data-preview-action="follow"]')?.addEventListener('click', () => {
      teacherFollowStudent = !teacherFollowStudent;
      if (teacherFollowStudent) teacherPreviewTaskId = currentTask().id;
      renderTeacherPreview();
    });
    host.querySelector('[data-preview-action="return"]')?.addEventListener('click', () => {
      teacherFollowStudent = true;
      teacherPreviewTaskId = currentTask().id;
      renderTeacherPreview();
    });
    host.querySelector('[data-preview-action="previous"]')?.addEventListener('click', () => {
      teacherFollowStudent = false;
      teacherPreviewTaskId = previousTaskId(previewTask.id);
      renderTeacherPreview();
    });
    host.querySelector('[data-preview-action="next"]')?.addEventListener('click', () => {
      teacherFollowStudent = false;
      teacherPreviewTaskId = nextTaskId(previewTask.id);
      renderTeacherPreview();
    });
  }

  const legacyLibrary = document.getElementById('libraryModal');
  if (legacyLibrary) legacyLibrary.setAttribute('aria-hidden', 'true');

  // Lokalus index-local.html fallbackas skirtas tik UI peržiūrai be Firebase.
  // Internetinėje versijoje šiuos įvykius apdoroja online-sync.js.
  if (location.protocol === 'file:') {
    window.addEventListener('p2:assignment-request', event => {
      const detail = event.detail || {};
      if (detail.action === 'unassign') {
        assignment = null; progress = null; selectedAnswers = {}; renderPanels(); renderLibraryContent(); return;
      }
      if (detail.action === 'assign') {
        const lesson = lessonForId(detail.lessonId) || DEMO_LESSON;
        assignment = { lessonId: lesson.id, title: lesson.title, taskCount: lesson.taskCount, attemptPolicy: detail.attemptPolicy || pendingAttemptPolicy, assignedAt: Date.now(), assignmentKey: `LOCAL-${Date.now()}`, ...assignmentContentDetail(lesson) };
        pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
        progress = emptyProgress();
        selectedAnswers = {};
        teacherPreviewTaskId = activeLesson().tasks[0]?.id || null;
        renderPanels(); renderLibraryContent();
      }
      if (detail.action === 'settings' && assignment) {
        assignment = { ...assignment, attemptPolicy: normalizedAttemptPolicy({ attemptPolicy: detail.attemptPolicy || assignment.attemptPolicy }) };
        pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
        renderPanels(); renderLibraryContent(); renderTeacherPreview();
      }
    });
    window.addEventListener('p2:practice-progress-request', event => {
      progress = event.detail && typeof event.detail === 'object' ? normalizedProgress(event.detail) : progress;
      renderPanels();
    });
    window.addEventListener('p2:practice-progress-live-request', event => {
      progress = event.detail && typeof event.detail === 'object' ? normalizedProgress(event.detail) : progress;
    });
  }

  window.addEventListener('p2:assignment-state', event => {
    const previousLessonId = assignment?.lessonId || null;
    assignment = event.detail && typeof event.detail === 'object' ? event.detail : null;
    const nextLessonId = assignment?.lessonId || null;
    const lessonChanged = previousLessonId !== nextLessonId;
    if (assignment) {
      pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
      if (role() === 'teacher') {
        const lesson = lessonForId(assignment.lessonId);
        if (lesson && (!assignment.schemaVersion || !assignment.contentVersion || !assignment.contentSnapshot || !assignment.assignmentKey)) {
          window.dispatchEvent(new CustomEvent('p2:assignment-request', {
            detail: {
              action: 'metadata',
              lessonId: lesson.id,
              assignedAt: Number(assignment.assignedAt || 0) || null,
              ...assignmentContentDetail(lesson)
            }
          }));
        }
      }
    }
    if (!assignment || lessonChanged) {
      progress = null;
      selectedAnswers = {};
      teacherPreviewTaskId = assignment ? activeLesson().tasks[0]?.id || null : null;
      teacherFollowStudent = true;
      if (!assignment && role() === 'teacher' && teacherPreviewMode !== 'closed') setTeacherPreviewMode('closed');
    }
    renderPanels();
    renderLibraryContent();
    renderTeacherPreview();
    queueCurrentStudentLessonSnapshot();
    renderStudentsModal();
  });

  window.addEventListener('p2:progress-state', event => {
    const incoming = event.detail && typeof event.detail === 'object' ? normalizedProgress(event.detail) : null;
    const ownLiveEcho = role() === 'student'
      && incoming
      && progress
      && studentMathFieldActive()
      && comparableProgress(incoming) === comparableProgress(progress);
    progress = incoming;
    if (teacherFollowStudent && progress) teacherPreviewTaskId = currentTask().id;
    if (ownLiveEcho) { queueCurrentStudentLessonSnapshot(); return; }
    renderPanels();
    renderTeacherPreview();
    queueCurrentStudentLessonSnapshot();
    renderStudentsModal();
  });

  const roleObserver = new MutationObserver(() => applyRole());
  roleObserver.observe(body, { attributes: true, attributeFilter: ['data-online-role'] });
  document.getElementById('p2SideRefreshButton')?.addEventListener('click', () => {
    updatePresence();
    renderPanels();
  });

  applyRatio();
  applyView(view, { persist: false });
  applyRole();
})();
