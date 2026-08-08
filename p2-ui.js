(() => {
  'use strict';

  const BUILD = 'P2-SPLIT-P1.9.7';
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

  const DEMO_LESSON = Object.freeze({
    id: 'p2-demo-funkcija-01',
    title: 'Pamokos prototipas · Funkcija ir f(x)',
    shortTitle: 'Funkcija ir f(x)',
    description: 'Demonstracinė pamoka P2 darbo eigai išbandyti. Turinys vėliau bus pakeistas galutine medžiaga.',
    taskCount: 6,
    classCount: 4,
    selfCount: 2,
    tasks: [
      { id: 'c1', section: 'class', label: 'Pamokoje', prompt: 'Jei f(x) = 2x + 1, kokia yra f(3) reikšmė?', choices: ['5', '6', '7', '8'], answer: '7', hint: 'Į funkcijos formulę vietoje x įrašyk 3.' },
      { id: 'c2', section: 'class', label: 'Pamokoje', prompt: 'Kuris taškas priklauso funkcijos y = x + 2 grafikui?', choices: ['(1; 1)', '(1; 3)', '(2; 1)', '(0; 0)'], answer: '(1; 3)', hint: 'Patikrink: kai x = 1, kiek tada lygu y?' },
      { id: 'c3', section: 'class', label: 'Pamokoje', prompt: 'Ką reiškia užrašas f(4) = 9?', choices: ['Kai x = 9, y = 4', 'Kai x = 4, funkcijos reikšmė yra 9', 'Funkcija visada lygi 9', 'Grafikas kerta x ašį ties 4'], answer: 'Kai x = 4, funkcijos reikšmė yra 9', hint: 'f(4) nurodo funkcijos reikšmę, kai argumento x reikšmė yra 4.' },
      { id: 'c4', section: 'class', label: 'Pamokoje', prompt: 'Jei f(x) = 3 − x, kokia yra f(−2) reikšmė?', choices: ['1', '5', '−5', '−1'], answer: '5', hint: 'Atsargiai su dviem minuso ženklais: 3 − (−2).' },
      { id: 's1', section: 'self', label: 'Savarankiškai', prompt: 'Jei g(x) = 4x − 3, kokia yra g(2) reikšmė?', choices: ['5', '8', '11', '−5'], answer: '5', hint: 'Įrašyk x = 2 į formulę g(x) = 4x − 3.' },
      { id: 's2', section: 'self', label: 'Savarankiškai', prompt: 'Kuris užrašas reiškia, kad taškas (2; 6) priklauso funkcijos h grafikui?', choices: ['h(6) = 2', 'h(2) = 6', 'h(x) = 2', 'h(2) = x'], answer: 'h(2) = 6', hint: 'Taško pirmoji koordinatė yra x, antroji – funkcijos reikšmė.' }
    ]
  });

  let assignment = null;
  let pendingAttemptPolicy = { defaultMaxAttempts: 3, taskMaxAttempts: {} };
  let progress = null;
  let selectedAnswers = {};
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

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }

  const prefs = readPrefs();
  let view = ['board', 'split', 'practice'].includes(prefs.view) ? prefs.view : 'split';
  let ratio = Number.isFinite(Number(prefs.ratio)) ? Number(prefs.ratio) : 55;
  ratio = Math.max(34, Math.min(72, ratio));

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, ratio })); } catch (_) {}
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
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  document.querySelectorAll('[data-p2-view]').forEach(button => {
    button.addEventListener('click', () => applyView(button.dataset.p2View));
  });

  let drag = null;
  splitter.addEventListener('pointerdown', event => {
    if (view !== 'split') return;
    event.preventDefault();
    splitter.setPointerCapture?.(event.pointerId);
    drag = { pointerId: event.pointerId };
    body.classList.add('p2-resizing');
  });
  splitter.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = workspace.getBoundingClientRect();
    const stacked = matchMedia('(max-width: 900px)').matches;
    const raw = stacked ? ((event.clientY - rect.top) / rect.height * 100) : ((event.clientX - rect.left) / rect.width * 100);
    ratio = Math.max(34, Math.min(72, raw));
    applyRatio();
  });
  const endDrag = event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    body.classList.remove('p2-resizing');
    savePrefs();
    window.dispatchEvent(new Event('resize'));
  };
  splitter.addEventListener('pointerup', endDrag);
  splitter.addEventListener('pointercancel', endDrag);
  splitter.addEventListener('keydown', event => {
    if (view !== 'split') return;
    const stacked = matchMedia('(max-width: 900px)').matches;
    const dec = stacked ? 'ArrowUp' : 'ArrowLeft';
    const inc = stacked ? 'ArrowDown' : 'ArrowRight';
    if (![dec, inc].includes(event.key)) return;
    event.preventDefault();
    ratio = Math.max(34, Math.min(72, ratio + (event.key === inc ? 3 : -3)));
    applyRatio();
    savePrefs();
    window.dispatchEvent(new Event('resize'));
  });

  function emptyProgress() {
    return {
      assignmentId: DEMO_LESSON.id,
      status: 'not_started',
      currentTaskId: DEMO_LESSON.tasks[0].id,
      taskStates: {},
      startedAt: null,
      updatedAt: Date.now()
    };
  }

  function normalizedProgress(value) {
    const source = value && typeof value === 'object' ? value : {};
    return {
      ...emptyProgress(),
      ...source,
      taskStates: source.taskStates && typeof source.taskStates === 'object' ? source.taskStates : {}
    };
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
    DEMO_LESSON.tasks.forEach(task => {
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
    return DEMO_LESSON.tasks.find(task => task.id === state.currentTaskId) || DEMO_LESSON.tasks[0];
  }

  function currentTaskState() {
    const task = currentTask();
    return normalizedProgress(progress).taskStates[task.id] || { attempts: 0, wrongAttempts: 0, hintUsed: false, solved: false, status: 'pending', lastAnswer: '' };
  }

  function taskState(taskId) {
    return normalizedProgress(progress).taskStates[taskId] || { attempts: 0, wrongAttempts: 0, hintUsed: false, solved: false, status: 'pending', lastAnswer: '' };
  }

  function progressStats() {
    const state = normalizedProgress(progress);
    let solved = 0, good = 0, help = 0, repeat = 0;
    DEMO_LESSON.tasks.forEach(task => {
      const item = state.taskStates[task.id] || {};
      if (item.solved) solved += 1;
      if (item.solved) {
        if (item.hintUsed || Number(item.attempts || 0) > 1 || item.status === 'help') help += 1;
        else good += 1;
      } else if (isTaskExhausted(item, task.id)) {
        repeat += 1;
      }
    });
    const finished = solved + repeat;
    return { solved, finished, good, help, repeat, percent: Math.round((finished / DEMO_LESSON.taskCount) * 100) };
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

  function publishProgress(next) {
    progress = normalizedProgress(next);
    progress.updatedAt = Date.now();
    window.dispatchEvent(new CustomEvent('p2:practice-progress-request', { detail: progress }));
    renderPanels();
  }

  function taskIndex(taskId) {
    return Math.max(0, DEMO_LESSON.tasks.findIndex(task => task.id === taskId));
  }

  function nextTaskId(taskId) {
    const index = taskIndex(taskId);
    return DEMO_LESSON.tasks[Math.min(DEMO_LESSON.tasks.length - 1, index + 1)].id;
  }

  function previousTaskId(taskId) {
    const index = taskIndex(taskId);
    return DEMO_LESSON.tasks[Math.max(0, index - 1)].id;
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
          <div class="p2-student-hero-copy"><span class="p2-label">Mano pratybos</span><h3>Čia atsiras mokytojo priskirtos pamokos</h3><p>Pratybos veiks atskirai nuo bendros lentos, todėl galėsi spręsti savo tempu, o lenta liks bendra darbo erdvė.</p></div>
          <span class="p2-count-badge">0</span>
        </div>
        <div class="p2-empty-card p2-practice-empty">
          <div class="p2-empty-illustration" aria-hidden="true"><span>f(x)</span><i></i></div>
          <strong>Kol kas nėra priskirtų pratybų</strong>
          <p>Kai mokytojas priskirs pamoką, ji atsiras čia. Tada galėsi ją atidaryti „Padalintame“ arba „Tik pratybos“ vaizde.</p>
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
            <span class="p2-label">Priskirta pamoka</span>
            <h3>${escapeHtml(DEMO_LESSON.title)}</h3>
            <p>${escapeHtml(DEMO_LESSON.description)}</p>
            <div class="p2-assignment-meta"><span>${DEMO_LESSON.classCount} pamokoje</span><span>${DEMO_LESSON.selfCount} savarankiškai</span><span>${DEMO_LESSON.taskCount} užduotys</span></div>
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
    return `
      <section class="p2-mini-section" aria-label="Mano pažanga">
        <header><div><span class="p2-label">Mano pažanga</span><h3>Ši pamoka</h3></div><span class="p2-soft-pill">${stats.finished} / ${DEMO_LESSON.taskCount}</span></header>
        <div class="p2-student-progress">
          <div><span>Savarankiškai</span><strong>${stats.good}</strong></div>
          <div><span>Su pagalba / taisant</span><strong>${stats.help}</strong></div>
          <div><span>Kartoti</span><strong>${stats.repeat}</strong></div>
        </div>
      </section>`;
  }

  function studentPracticeMarkup(state, stats) {
    const task = currentTask();
    const item = currentTaskState();
    const selected = selectedAnswers[task.id] ?? item.liveAnswer ?? item.lastAnswer ?? '';
    const taskNumber = taskIndex(task.id) + 1;
    const maxAttempts = attemptLimitForTask(task.id);
    const exhausted = isTaskExhausted(item, task.id);
    const remaining = attemptsRemaining(item, task.id);
    const feedback = item.solved
      ? item.hintUsed
        ? `<div class="p2-practice-feedback is-warning">✓ Teisingai${Number(item.attempts || 0) > 1 ? ' su pagalba ir po kelių bandymų' : ' su pagalba'}.</div>`
        : Number(item.attempts || 0) > 1
          ? `<div class="p2-practice-feedback is-warning">✓ Teisingai po kelių bandymų.</div>`
          : `<div class="p2-practice-feedback is-success">✓ Teisingai. Gali tęsti.</div>`
      : exhausted
        ? `<div class="p2-practice-feedback is-repeat">Išnaudoti visi ${maxAttempts} ${maxAttempts === 1 ? 'bandymas' : 'bandymai'}. Šią užduotį pažymime „Kartoti“.</div>`
        : item.attempts > 0
          ? `<div class="p2-practice-feedback is-warning">Dar ne. ${remaining === Infinity ? 'Gali bandyti dar kartą.' : `Liko ${remaining} ${remaining === 1 ? 'bandymas' : 'bandymai'}.`}</div>`
          : '';
    const hint = item.hintUsed ? `<div class="p2-hint-box"><strong>Užuomina</strong><span>${escapeHtml(task.hint)}</span></div>` : '';
    const choiceMarkup = task.choices.map(choice => {
      const active = selected === choice ? ' is-selected' : '';
      return `<button type="button" class="p2-choice${active}" data-choice="${escapeHtml(choice)}" ${(item.solved || exhausted) ? 'disabled' : ''}><span>${String.fromCharCode(65 + task.choices.indexOf(choice))}</span><b>${escapeHtml(choice)}</b></button>`;
    }).join('');
    const dots = DEMO_LESSON.tasks.map((candidate, index) => {
      const cstate = taskState(candidate.id);
      const pedagogy = pedagogicalStatus(cstate, { taskId: candidate.id, current: candidate.id === task.id && state.status === 'in_progress' });
      const cls = [candidate.id === task.id ? 'is-current' : '', pedagogy.key === 'good' ? 'is-done' : '', pedagogy.key === 'help' ? 'is-help' : '', pedagogy.key === 'repeat' ? 'is-repeat' : ''].filter(Boolean).join(' ');
      return `<button type="button" class="p2-task-dot ${cls}" data-task-id="${candidate.id}" title="${escapeHtml(candidate.label)} · ${index + 1} · ${pedagogy.label}">${index + 1}</button>`;
    }).join('');
    return `
      <section class="p2-practice-shell">
        <header class="p2-practice-shell-head">
          <div><span class="p2-label">Mano pratybos</span><h3>${escapeHtml(DEMO_LESSON.shortTitle)}</h3></div>
          <div class="p2-practice-progress"><span>${taskNumber} / ${DEMO_LESSON.taskCount}</span><i><b style="width:${stats.percent}%"></b></i></div>
        </header>
        <div class="p2-tabs p2-live-tabs" role="tablist" aria-label="Pratybų dalys">
          <button type="button" data-section="class" class="${task.section === 'class' ? 'is-active' : ''}">▤ Pamokoje</button>
          <button type="button" data-section="self" class="${task.section === 'self' ? 'is-active' : ''}">⌂ Savarankiškai</button>
        </div>
        <article class="p2-task-card">
          <div class="p2-task-card-head"><span class="p2-task-number">${taskNumber}.</span><div><span class="p2-label">${escapeHtml(task.label)}</span><h3>Užduotis</h3></div><span class="p2-soft-pill">${attemptUsageLabel(item, task.id)}</span></div>
          <p class="p2-task-prompt">${escapeHtml(task.prompt)}</p>
          <div class="p2-choice-list">${choiceMarkup}</div>
          ${hint}${feedback}
          <div class="p2-task-actions">
            <button type="button" class="p2-secondary" data-action="hint" ${(item.hintUsed || item.solved || exhausted) ? 'disabled' : ''}>💡 Užuomina</button>
            <span class="p2-task-actions-spacer"></span>
            <button type="button" class="p2-secondary" data-action="previous" ${taskNumber === 1 ? 'disabled' : ''}>← Ankstesnė</button>
            ${item.solved || exhausted
              ? '<button type="button" class="p2-primary" data-action="next">Toliau →</button>'
              : '<button type="button" class="p2-primary" data-action="check">Tikrinti</button>'}
          </div>
        </article>
        <nav class="p2-task-dots" aria-label="Užduočių navigacija">${dots}</nav>
      </section>
      ${studentProgressSummary(stats)}
    `;
  }


  function bindStudentActions() {
    studentPanel.querySelector('[data-action="open-assignment"]')?.addEventListener('click', () => {
      const next = normalizedProgress(progress);
      next.status = 'in_progress';
      next.currentTaskId = next.currentTaskId || DEMO_LESSON.tasks[0].id;
      next.startedAt = next.startedAt || Date.now();
      markTaskOpened(next, next.currentTaskId);
      publishProgress(next);
    });

    studentPanel.querySelectorAll('[data-choice]').forEach(button => {
      button.addEventListener('click', () => {
        const task = currentTask();
        const choice = button.dataset.choice || '';
        selectedAnswers[task.id] = choice;

        // P1.9.6: mokytojas turi matyti tą patį pasirinkimą realiu laiku,
        // kurį šiuo metu mato mokinys, dar prieš paspaudžiant „Tikrinti“.
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

    studentPanel.querySelector('[data-action="check"]')?.addEventListener('click', () => {
      const task = currentTask();
      const previous = taskState(task.id);
      if (isTaskExhausted(previous, task.id)) { toast('Šiai užduočiai bandymų nebeliko'); return; }
      const answer = selectedAnswers[task.id] ?? previous.liveAnswer ?? '';
      if (!answer) { toast('Pasirink atsakymą'); return; }
      const next = normalizedProgress(progress);
      const correct = answer === task.answer;
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
        liveAnswer: answer,
        lastAnswer: answer,
        lastResult: correct ? 'correct' : 'wrong',
        submittedAt: Date.now(),
        solved: correct,
        status
      };
      next.taskStates = { ...next.taskStates, [task.id]: state };
      const allFinished = DEMO_LESSON.tasks.every(candidate => {
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
        const first = DEMO_LESSON.tasks.find(task => task.section === section);
        if (!first) return;
        const next = normalizedProgress(progress);
        next.currentTaskId = first.id;
        markTaskOpened(next, next.currentTaskId);
        publishProgress(next);
      });
    });
  }

  function renderTeacherPanel() {
    const count = Math.max(0, Number(userCount?.textContent || 0));
    const studentOnline = count >= 2;
    const state = normalizedProgress(progress);
    const stats = progressStats();
    const task = assignment ? currentTask() : null;
    const item = assignment ? currentTaskState() : null;
    const assigned = Boolean(assignment);
    const started = assigned && state.status !== 'not_started';
    const assignmentTitle = assigned ? DEMO_LESSON.shortTitle : 'Pamoka dar nepriskirta';
    const currentLabel = task ? `${taskIndex(task.id) + 1} / ${DEMO_LESSON.taskCount}` : '— / —';
    const helper = !assigned ? '—' : item?.hintUsed ? 'Naudota' : 'Nenaudota';
    const currentPedagogy = started ? pedagogicalStatus(item, { taskId: task?.id, current: state.status === 'in_progress' && Boolean(task) }) : { key: 'pending', label: '—' };
    const activityTitle = !assigned ? 'Pamoka dar nepriskirta' : !started ? 'Mokinys dar neatidarė pratybų' : state.status === 'completed' ? 'Pratybos atliktos' : `Sprendžiama ${taskIndex(task.id) + 1} užduotis`;
    const activityText = !assigned
      ? 'Priskirk demonstracinę pamoką Bibliotekoje. Mokinys ją iškart pamatys savo „Mano pratybos“ srityje.'
      : !started
        ? 'Pamoka priskirta. Kai mokinys paspaus „Atidaryti“, čia realiu laiku atsiras jo dabartinė užduotis, bandymai ir pagalbos būsena.'
        : `${task?.prompt || ''}`;

    teacherPanel.innerHTML = `
      <div class="p2-learner-card p2-learner-overview">
        <div class="p2-avatar" aria-hidden="true">M</div>
        <div class="p2-learner-copy"><span class="p2-label">Mokinio eiga</span><h3>${studentOnline ? 'Mokinys prisijungęs' : 'Laukiama mokinio'}</h3><p>${studentOnline ? 'Bendra lenta ir individuali pratybų būsena sinchronizuojamos realiu laiku.' : 'Nukopijuok mokinio nuorodą ir atidaryk ją kitame įrenginyje.'}</p></div>
        <span class="p2-presence-pill ${studentOnline ? 'is-online' : ''}">${studentOnline ? 'Prisijungęs' : `${count} įrenginys`}</span>
      </div>
      <div class="p2-teacher-dashboard-grid">
        <div class="p2-progress-card">
          <div class="p2-progress-head"><div><span class="p2-label">Priskirta pamoka</span><h3>${escapeHtml(assignmentTitle)}</h3><p class="p2-teacher-status-line">${assigned ? `${statusLabel(state)} · ${policySummary(assignment)}` : 'Bibliotekoje pasirink pamoką ir priskirk mokiniui.'}</p></div><strong>${assigned ? `${stats.finished} / ${DEMO_LESSON.taskCount}` : '— / —'}</strong></div>
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
        <div><span class="p2-label">Mokinio įžvalgos</span><h3>${started ? 'Tarpinė pamokos būsena' : 'Įžvalgos atsiras pradėjus spręsti'}</h3><p>${started ? `Savarankiškai: ${stats.good} · Su pagalba / taisant: ${stats.help} · Kartoti: ${stats.repeat}.` : 'Čia matysi, kuriuos gebėjimus mokinys atlieka savarankiškai, kur naudoja pagalbą ir ką verta pakartoti.'}</p></div>
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
      sideTitle.textContent = isTeacher ? 'Mokinio eiga' : 'Mano pratybos';
    }
    practiceModeButton.textContent = isTeacher ? 'Mokinio eiga' : 'Tik pratybos';
    if (sideRolePill) sideRolePill.textContent = isTeacher ? 'Mokytojas' : 'Mokinys';
    document.querySelectorAll('.p2-teacher-only').forEach(el => el.hidden = !isTeacher);
    const p2LibraryButton = document.getElementById('libraryButton');
    if (p2LibraryButton) p2LibraryButton.hidden = !isTeacher;
    if (!isTeacher && teacherPreviewMode !== 'closed') {
      teacherPreviewMode = 'closed';
      if (teacherPreviewWindow) teacherPreviewWindow.hidden = true;
      body.classList.remove('p2-teacher-preview-maximized');
      sidePane.classList.remove('has-preview-docked');
    }
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
    const assigned = assignment?.lessonId === DEMO_LESSON.id;
    const policy = assigned ? normalizedAttemptPolicy(assignment) : normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy });
    host.innerHTML = `
      <div class="p2-library-intro"><div><span class="p2-label">Mokytojo biblioteka</span><h3>Priskirk mokiniui demonstracinę pamoką</h3><p>Šiame prototipe tikriname darbo eigą, todėl naudojame vieną nedidelį rinkinį. Galutinis turinys bus dedamas vėliau.</p></div></div>
      <article class="p2-library-lesson-card ${assigned ? 'is-assigned' : ''}">
        <div class="p2-library-lesson-icon" aria-hidden="true">ƒ</div>
        <div class="p2-library-lesson-copy"><span class="p2-label">Pamokos prototipas</span><h3>${escapeHtml(DEMO_LESSON.shortTitle)}</h3><p>${escapeHtml(DEMO_LESSON.description)}</p><div class="p2-assignment-meta"><span>${DEMO_LESSON.taskCount} užduotys</span><span>${DEMO_LESSON.classCount} pamokoje</span><span>${DEMO_LESSON.selfCount} savarankiškai</span></div></div>
        <div class="p2-library-lesson-actions">
          <div class="p2-library-attempt-summary"><span>Bandymų nustatymas</span><b>${escapeHtml(policySummary({ attemptPolicy: policy }))}</b><small>${assigned ? 'Keisk išplėstinėje mokytojo pratybų peržiūroje.' : 'Numatyta: 3 bandymai. Po priskyrimo galėsi nustatyti ir kiekvienai užduočiai atskirai.'}</small></div>
          ${assigned ? '<span class="p2-status-badge is-assigned">✓ Priskirta</span><button class="p2-secondary" type="button" data-library-action="unassign">Atšaukti priskyrimą</button>' : '<button class="p2-primary" type="button" data-library-action="assign">Priskirti mokiniui</button>'}
        </div>
      </article>
      <div class="p2-library-flow"><span>Biblioteka</span><b>→</b><span>Priskirti</span><b>→</b><span>Mokinio „Mano pratybos“</span><b>→</b><span>Mokinio eiga</span></div>
    `;
    host.querySelector('[data-library-action="assign"]')?.addEventListener('click', () => {
      const attemptPolicy = normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy });
      window.dispatchEvent(new CustomEvent('p2:assignment-request', { detail: { action: 'assign', lessonId: DEMO_LESSON.id, title: DEMO_LESSON.title, taskCount: DEMO_LESSON.taskCount, attemptPolicy } }));
      toast('Pamoka priskiriama mokiniui…');
    });
    host.querySelector('[data-library-action="unassign"]')?.addEventListener('click', () => {
      if (!window.confirm('Atšaukti šios pamokos priskyrimą ir išvalyti demonstracinę mokinio eigą?')) return;
      window.dispatchEvent(new CustomEvent('p2:assignment-request', { detail: { action: 'unassign', lessonId: DEMO_LESSON.id } }));
      toast('Priskyrimas atšaukiamas…');
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
          <strong>${escapeHtml(DEMO_LESSON.shortTitle)}</strong>
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
    sideTitle.textContent = previewActive ? 'Pratybų peržiūra' : 'Mokinio eiga';
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
    return DEMO_LESSON.tasks.find(task => task.id === teacherPreviewTaskId) || currentTask();
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
    const taskRows = DEMO_LESSON.tasks.map((task, index) => {
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

  function renderTeacherPreview() {

    if (!teacherPreviewWindow || teacherPreviewMode === 'closed') return;
    const host = teacherPreviewWindow.querySelector('#p2TeacherPreviewBody');
    if (!host || !assignment) return;

    const studentTask = currentTask();
    if (teacherFollowStudent) teacherPreviewTaskId = studentTask.id;
    const previewTask = teacherPreviewTask();
    const previewIndex = taskIndex(previewTask.id) + 1;
    const studentIndex = taskIndex(studentTask.id) + 1;
    const item = taskState(previewTask.id);
    const isStudentTask = previewTask.id === studentTask.id;
    const pedagogy = pedagogicalStatus(item, { taskId: previewTask.id, current: isStudentTask && normalizedProgress(progress).status === 'in_progress' });
    const answerText = item.lastAnswer ? escapeHtml(item.lastAnswer) : '—';
    const liveAnswer = item.liveAnswer || item.lastAnswer || '';
    const correctIndex = Math.max(0, previewTask.choices.findIndex(choice => choice === previewTask.answer));
    const correctLetter = String.fromCharCode(65 + correctIndex);
    const choices = previewTask.choices.map((choice, index) => {
      const isSelected = liveAnswer === choice;
      const classes = ['p2-preview-choice', isSelected ? 'is-student-selected' : ''].filter(Boolean).join(' ');
      return `<div class="${classes}"><span class="p2-preview-choice-letter">${String.fromCharCode(65 + index)}</span><b>${escapeHtml(choice)}</b></div>`;
    }).join('');
    const previewMaxAttempts = attemptLimitForTask(previewTask.id);
    const previewExhausted = isTaskExhausted(item, previewTask.id);
    const previewRemaining = attemptsRemaining(item, previewTask.id);
    const previewFeedback = item.solved
      ? item.hintUsed
        ? `<div class="p2-practice-feedback is-warning p2-teacher-student-feedback">✓ Teisingai${Number(item.attempts || 0) > 1 ? ' su pagalba ir po kelių bandymų' : ' su pagalba'}.</div>`
        : Number(item.attempts || 0) > 1
          ? '<div class="p2-practice-feedback is-warning p2-teacher-student-feedback">✓ Teisingai po kelių bandymų.</div>'
          : '<div class="p2-practice-feedback is-success p2-teacher-student-feedback">✓ Teisingai. Gali tęsti.</div>'
      : previewExhausted
        ? `<div class="p2-practice-feedback is-repeat p2-teacher-student-feedback">Išnaudoti visi ${previewMaxAttempts} bandymai. Užduotis pažymėta „Kartoti“.</div>`
        : Number(item.attempts || 0) > 0
          ? `<div class="p2-practice-feedback is-warning p2-teacher-student-feedback">Dar ne. ${previewRemaining === Infinity ? 'Bandymų skaičius neribojamas.' : `Liko ${previewRemaining} ${previewRemaining === 1 ? 'bandymas' : 'bandymai'}.`}</div>`
          : '';


    const taskNavigation = DEMO_LESSON.tasks.map((task, index) => {
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
      return `<button type="button" class="${classes}" data-preview-task="${task.id}" title="${index + 1}. ${escapeHtml(task.prompt)} · ${taskPedagogy.label}" aria-label="${index + 1} užduotis, ${taskPedagogy.label}">${index + 1}</button>`;
    }).join('');

    const locationText = isStudentTask
      ? `Mokinys · ${studentIndex} / ${DEMO_LESSON.taskCount}`
      : `Mokinys · ${studentIndex} / ${DEMO_LESSON.taskCount} · Peržiūri ${previewIndex}`;

    host.innerHTML = `
      <div class="p2-preview-toolbar">
        <div class="p2-preview-location"><span class="p2-live-dot" aria-hidden="true"></span><strong>${locationText}</strong></div>
        <div class="p2-preview-follow-actions">
          ${teacherFollowStudent
            ? '<button type="button" class="p2-secondary is-active" data-preview-action="follow">✓ Sekama</button>'
            : '<button type="button" class="p2-secondary" data-preview-action="return">↩ Grįžti prie mokinio</button>'}
        </div>
      </div>
      <div class="p2-preview-layout">
        <div class="p2-preview-main">
          <article class="p2-preview-detail">
            <header class="p2-preview-detail-head">
              <div>
                <span class="p2-label">${escapeHtml(previewTask.label)} · ${previewIndex} užduotis${isStudentTask ? ' · mokinys dabar čia' : ''}</span>
                <h3>${escapeHtml(previewTask.prompt)}</h3>
                <div class="p2-teacher-answer-key"><span>Teisingas atsakymas</span><strong>${correctLetter} · ${escapeHtml(previewTask.answer)}</strong></div>
              </div>
              <span class="p2-preview-badge status-${pedagogy.key}">${pedagogy.label}</span>
            </header>
            <div class="p2-preview-choice-list">${choices}</div>
            ${previewFeedback}
            <div class="p2-preview-detail-metrics">
              <span>Bandymų: <b>${attemptUsageLabel(item, previewTask.id)}</b></span>
              <span>Pagalba: <b>${item.hintUsed ? 'naudota' : 'nenaudota'}</b></span>
              <span>Paskutinis pateiktas: <b>${answerText}</b></span>
            </div>
            <div class="p2-preview-hint"><span>Užuomina</span><p>${escapeHtml(previewTask.hint)}</p></div>
            <div class="p2-preview-detail-actions">
              <button type="button" class="p2-secondary" data-preview-action="previous" ${previewIndex === 1 ? 'disabled' : ''}>← Ankstesnė</button>
              <button type="button" class="p2-secondary" data-preview-action="next" ${previewIndex === DEMO_LESSON.taskCount ? 'disabled' : ''}>Kita →</button>
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
        assignment = { lessonId: DEMO_LESSON.id, title: DEMO_LESSON.title, taskCount: DEMO_LESSON.taskCount, attemptPolicy: normalizedAttemptPolicy({ attemptPolicy: detail.attemptPolicy || pendingAttemptPolicy }), assignedAt: Date.now() };
        pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
        progress = emptyProgress();
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
  }

  window.addEventListener('p2:assignment-state', event => {
    assignment = event.detail && typeof event.detail === 'object' ? event.detail : null;
    if (assignment) pendingAttemptPolicy = normalizedAttemptPolicy(assignment);
    if (!assignment) {
      progress = null;
      selectedAnswers = {};
      if (role() === 'teacher' && teacherPreviewMode !== 'closed') setTeacherPreviewMode('closed');
    }
    renderPanels();
    renderTeacherPreview();
  });

  window.addEventListener('p2:progress-state', event => {
    progress = event.detail && typeof event.detail === 'object' ? normalizedProgress(event.detail) : null;
    if (teacherFollowStudent && progress) teacherPreviewTaskId = currentTask().id;
    renderPanels();
    renderTeacherPreview();
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
