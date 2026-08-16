(() => {
  'use strict';

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
  }

  function makeId(prefix = 'item') {
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}-${Date.now().toString(36)}-${random}`;
  }

  function deepCopy(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function normalizeTask(raw, index = 0) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const type = source.type === 'choice' ? 'choice' : 'input';
    const choices = type === 'choice'
      ? (Array.isArray(source.choices) && source.choices.length ? source.choices : ['Atsakymas A', 'Atsakymas B']).map(value => String(value ?? ''))
      : [];
    return {
      id: String(source.id || makeId('task')),
      type,
      section: source.section === 'self' ? 'self' : 'class',
      label: String(source.label || (type === 'choice' ? 'Pasirinkimas' : 'Trumpas atsakymas')),
      title: String(source.title || `Užduotis ${index + 1}`),
      prompt: String(source.promptDisplay || source.prompt || ''),
      hint: String(source.hint || ''),
      answer: String(source.answer || ''),
      answerType: source.answerType === 'number' ? 'number' : 'text',
      choices
    };
  }

  function normalizeLesson(raw, { duplicate = false } = {}) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const tasks = Array.isArray(source.tasks) ? source.tasks.map(normalizeTask) : [];
    const now = Date.now();
    return {
      id: duplicate || !source.id ? makeId('custom-practice') : String(source.id),
      isNew: duplicate || !source.id,
      sourceVersion: Math.max(0, Number(source.contentVersion) || 0),
      createdAt: duplicate ? now : Math.max(0, Number(source.createdAt) || now),
      title: duplicate ? `${String(source.title || source.shortTitle || 'Mano pratybos')} – kopija` : String(source.title || source.shortTitle || ''),
      description: String(source.description || ''),
      defaultMaxAttempts: [0,1,2,3].includes(Number(source.defaultMaxAttempts)) ? Number(source.defaultMaxAttempts) : 3,
      tasks
    };
  }

  function richPreviewMarkup(value) {
    const source = String(value ?? '');
    const re = /\\\(([\s\S]*?)\\\)/g;
    let html = '';
    let cursor = 0;
    let match;
    while ((match = re.exec(source))) {
      html += escapeHtml(source.slice(cursor, match.index));
      html += `<math-span class="p2-inline-math" mode="textstyle">${escapeHtml(match[1])}</math-span>`;
      cursor = match.index + match[0].length;
    }
    html += escapeHtml(source.slice(cursor));
    return html || '<span class="p2-library-editor-placeholder">Čia matysi sąlygos peržiūrą.</span>';
  }

  function createLibraryEditor(doc = document) {
    const modal = doc.createElement('div');
    modal.className = 'p2-library-editor-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="p2-library-editor-backdrop" data-editor-close></div>
      <section class="p2-library-editor-panel" role="dialog" aria-modal="true" aria-label="Pratybų rengyklė">
        <header class="p2-library-editor-head">
          <div><span class="p2-side-kicker">PRATYBŲ RENGYKLĖ</span><h2 data-editor-heading>Pratybos</h2></div>
          <button type="button" data-editor-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-library-editor-scroll">
          <section class="p2-library-editor-meta">
            <label class="is-wide"><span>Pratybų pavadinimas</span><input type="text" data-lesson-field="title" maxlength="100" placeholder="Pvz., Trupmenų kartojimas"></label>
            <label><span>Numatytieji bandymai</span><select data-lesson-field="defaultMaxAttempts"><option value="1">1 bandymas</option><option value="2">2 bandymai</option><option value="3">3 bandymai</option><option value="0">Neribotai</option></select></label>
            <label class="is-wide"><span>Aprašymas</span><textarea data-lesson-field="description" rows="2" maxlength="500" placeholder="Ką mokinys kartos šiose pratybose?"></textarea></label>
          </section>

          <div class="p2-library-editor-taskbar">
            <div><span class="p2-label">UŽDUOTYS</span><strong data-task-count>0 užduočių</strong></div>
            <div class="p2-library-editor-add-actions">
              <button type="button" class="p2-secondary" data-add-task="input">+ Trumpas atsakymas</button>
              <button type="button" class="p2-secondary" data-add-task="choice">+ Pasirinkimas</button>
            </div>
          </div>
          <div class="p2-library-editor-tasks" data-editor-tasks></div>
        </div>
        <footer class="p2-library-editor-footer">
          <span class="p2-library-editor-status" data-editor-status></span>
          <div><button type="button" class="p2-secondary" data-editor-close>Atšaukti</button><button type="button" class="p2-primary" data-editor-save>Išsaugoti pratybas</button></div>
        </footer>
      </section>`;

    let draft = normalizeLesson(null);
    let saveHandler = null;

    const tasksHost = modal.querySelector('[data-editor-tasks]');
    const status = modal.querySelector('[data-editor-status]');

    function setStatus(message = '', type = '') {
      status.textContent = message;
      status.className = `p2-library-editor-status${type ? ` is-${type}` : ''}`;
    }

    function taskMarkup(task, index) {
      const choiceRows = task.type === 'choice' ? task.choices.map((choice, choiceIndex) => `
        <div class="p2-library-editor-choice-row">
          <input type="radio" name="answer-${escapeHtml(task.id)}" data-task-choice-correct="${choiceIndex}" ${task.answer === choice ? 'checked' : ''} aria-label="Teisingas variantas">
          <div class="p2-library-editor-choice-editor" data-task-rich-choice="${choiceIndex}" data-choice-value="${escapeHtml(choice)}"></div>
          <button type="button" data-remove-choice="${choiceIndex}" aria-label="Pašalinti variantą">×</button>
        </div>`).join('') : '';
      return `
        <article class="p2-library-editor-task" data-task-id="${escapeHtml(task.id)}">
          <header>
            <div class="p2-library-editor-task-number">${index + 1}</div>
            <div><strong>${task.type === 'choice' ? 'Pasirinkimas iš variantų' : 'Trumpas atsakymas'}</strong><small>${task.section === 'self' ? 'Savarankiškai' : 'Pamokoje'}</small></div>
            <div class="p2-library-editor-task-actions"><button type="button" data-move-task="up" aria-label="Aukštyn">↑</button><button type="button" data-move-task="down" aria-label="Žemyn">↓</button><button type="button" data-remove-task aria-label="Ištrinti užduotį">×</button></div>
          </header>
          <div class="p2-library-editor-task-grid">
            <label><span>Skiltis</span><select data-task-field="section"><option value="class" ${task.section === 'class' ? 'selected' : ''}>Pamoka</option><option value="self" ${task.section === 'self' ? 'selected' : ''}>Savarankiškai</option></select></label>
            <label><span>Temos žyma</span><input type="text" data-task-field="label" maxlength="50" value="${escapeHtml(task.label)}" placeholder="Pvz., Trupmenos"></label>
            <label class="is-wide"><span>Užduoties pavadinimas</span><input type="text" data-task-field="title" maxlength="100" value="${escapeHtml(task.title)}" placeholder="Pvz., Trupmenų sudėtis"></label>
            <div class="p2-library-editor-rich-field is-wide">
              <div class="p2-library-editor-field-title"><span>Sąlyga</span><small>Rašyk tekstą tiesiogiai, o formules įterpk Matematikos juosta.</small></div>
              <div data-task-rich-prompt></div>
            </div>
            ${task.type === 'choice' ? `
              <div class="p2-library-editor-choices is-wide"><div class="p2-library-editor-field-title"><span>Atsakymo variantai</span><small>Pažymėk teisingą variantą.</small></div>${choiceRows}<button type="button" class="p2-library-editor-add-choice" data-add-choice>+ Pridėti variantą</button></div>
            ` : `
              <label><span>Atsakymo tipas</span><select data-task-field="answerType"><option value="text" ${task.answerType === 'text' ? 'selected' : ''}>Tekstas</option><option value="number" ${task.answerType === 'number' ? 'selected' : ''}>Skaičius</option></select></label>
              <label><span>Teisingas atsakymas</span><input type="text" data-task-field="answer" value="${escapeHtml(task.answer)}" placeholder="Pvz., 12 arba x = 3"></label>
            `}
            <div class="p2-library-editor-rich-field is-wide is-hint-field">
              <div class="p2-library-editor-field-title"><span>Užuomina</span><small>Gali būti tekstas ir formulės. Rodoma mokiniui pasirinkus pagalbą.</small></div>
              <div data-task-rich-hint></div>
            </div>
          </div>
        </article>`;
    }

    function updateTaskCount() {
      const total = draft.tasks.length;
      const classCount = draft.tasks.filter(task => task.section === 'class').length;
      const selfCount = total - classCount;
      modal.querySelector('[data-task-count]').textContent = `${total} užd. · ${classCount} pamokoje · ${selfCount} savarankiškai`;
    }

    function syncTaskFromCard(card) {
      const task = draft.tasks.find(item => item.id === card.dataset.taskId);
      if (!task) return;
      if (card.__p2RichPromptEditor) task.prompt = card.__p2RichPromptEditor.getValue();
      if (card.__p2RichHintEditor) task.hint = card.__p2RichHintEditor.getValue();
      card.querySelectorAll('[data-task-field]').forEach(field => {
        task[field.dataset.taskField] = field.value;
      });
      if (task.type === 'choice') {
        const richChoices = Array.isArray(card.__p2RichChoiceEditors) ? card.__p2RichChoiceEditors : [];
        const choices = richChoices.length
          ? richChoices.map(editor => editor?.getValue?.() ?? '')
          : Array.from(card.querySelectorAll('[data-task-choice]')).map(input => input.value);
        task.choices = choices;
        const checked = card.querySelector('[data-task-choice-correct]:checked');
        const selected = checked ? Number(checked.dataset.taskChoiceCorrect) : -1;
        task.answer = selected >= 0 ? String(choices[selected] ?? '') : '';
      }
    }

    function syncAll() {
      modal.querySelectorAll('[data-lesson-field]').forEach(field => {
        const key = field.dataset.lessonField;
        draft[key] = key === 'defaultMaxAttempts' ? Number(field.value) : field.value;
      });
      modal.querySelectorAll('[data-task-id]').forEach(syncTaskFromCard);
    }

    function destroyTaskEditors(card) {
      card?.__p2RichPromptEditor?.destroy?.();
      card?.__p2RichHintEditor?.destroy?.();
      if (Array.isArray(card?.__p2RichChoiceEditors)) {
        card.__p2RichChoiceEditors.forEach(editor => editor?.destroy?.());
      }
      if (card) {
        card.__p2RichPromptEditor = null;
        card.__p2RichHintEditor = null;
        card.__p2RichChoiceEditors = [];
      }
    }

    function bindTaskCard(card) {
      const taskId = card.dataset.taskId;
      const task = () => draft.tasks.find(item => item.id === taskId);
      const RichEditor = window.P772RichPromptEditor;
      const canRichEdit = Boolean(RichEditor?.createPromptEditor);
      const currentTask = task();

      const richHost = card.querySelector('[data-task-rich-prompt]');
      if (richHost && canRichEdit) {
        const richEditor = RichEditor.createPromptEditor({
          value: currentTask?.prompt || '',
          placeholder: 'Įrašyk užduoties sąlygą…',
          contextLabel: 'Pratybų sąlyga',
          ariaLabel: 'Užduoties sąlyga',
          onChange(value) {
            const current = task();
            if (!current) return;
            current.prompt = value;
            setStatus('Yra neišsaugotų pakeitimų', 'pending');
          }
        });
        card.__p2RichPromptEditor = richEditor;
        richHost.appendChild(richEditor.element);
      } else if (richHost) {
        richHost.innerHTML = `<textarea data-task-field="prompt" rows="3" placeholder="Įrašyk užduoties sąlygą">${escapeHtml(currentTask?.prompt || '')}</textarea>`;
      }

      const hintHost = card.querySelector('[data-task-rich-hint]');
      if (hintHost && canRichEdit) {
        const hintEditor = RichEditor.createPromptEditor({
          value: currentTask?.hint || '',
          placeholder: 'Įrašyk užuominą…',
          contextLabel: 'Pratybų užuomina',
          ariaLabel: 'Užduoties užuomina',
          toolbarTitle: 'Matematika užuominai',
          toolbarHint: false,
          compact: true,
          variant: 'hint',
          onChange(value) {
            const current = task();
            if (!current) return;
            current.hint = value;
            setStatus('Yra neišsaugotų pakeitimų', 'pending');
          }
        });
        card.__p2RichHintEditor = hintEditor;
        hintHost.appendChild(hintEditor.element);
      } else if (hintHost) {
        hintHost.innerHTML = `<textarea data-task-field="hint" rows="2" placeholder="Rodoma mokiniui pasirinkus pagalbą">${escapeHtml(currentTask?.hint || '')}</textarea>`;
      }

      card.__p2RichChoiceEditors = [];
      card.querySelectorAll('[data-task-rich-choice]').forEach(host => {
        const choiceIndex = Number(host.dataset.taskRichChoice);
        const initialValue = String(currentTask?.choices?.[choiceIndex] ?? host.dataset.choiceValue ?? '');
        if (canRichEdit) {
          const choiceEditor = RichEditor.createPromptEditor({
            value: initialValue,
            placeholder: `Atsakymo variantas ${choiceIndex + 1}`,
            contextLabel: `Atsakymo variantas ${choiceIndex + 1}`,
            ariaLabel: `Atsakymo variantas ${choiceIndex + 1}`,
            toolbarTitle: 'Matematika atsakymui',
            toolbarHint: false,
            compact: true,
            variant: 'choice',
            onChange(value) {
              const current = task();
              if (!current || current.type !== 'choice') return;
              current.choices[choiceIndex] = value;
              const correct = card.querySelector(`[data-task-choice-correct="${choiceIndex}"]`);
              if (correct?.checked) current.answer = value;
              setStatus('Yra neišsaugotų pakeitimų', 'pending');
            }
          });
          card.__p2RichChoiceEditors[choiceIndex] = choiceEditor;
          host.appendChild(choiceEditor.element);
        } else {
          host.innerHTML = `<input type="text" data-task-choice="${choiceIndex}" value="${escapeHtml(initialValue)}" placeholder="Atsakymo variantas">`;
        }
      });

      card.querySelectorAll('input, textarea, select').forEach(field => field.addEventListener('input', () => {
        syncTaskFromCard(card);
        const current = task();
        const small = card.querySelector('header small');
        if (small && current) small.textContent = current.section === 'self' ? 'Savarankiškai' : 'Pamokoje';
        updateTaskCount();
        setStatus('Yra neišsaugotų pakeitimų', 'pending');
      }));
      card.querySelector('[data-remove-task]')?.addEventListener('click', () => {
        if (draft.tasks.length === 1 && !window.confirm('Pratybose neliks nė vienos užduoties. Pašalinti?')) return;
        draft.tasks = draft.tasks.filter(item => item.id !== taskId);
        renderTasks();
        setStatus('Yra neišsaugotų pakeitimų', 'pending');
      });
      card.querySelectorAll('[data-move-task]').forEach(button => button.addEventListener('click', () => {
        syncAll();
        const index = draft.tasks.findIndex(item => item.id === taskId);
        const delta = button.dataset.moveTask === 'up' ? -1 : 1;
        const target = index + delta;
        if (index < 0 || target < 0 || target >= draft.tasks.length) return;
        [draft.tasks[index], draft.tasks[target]] = [draft.tasks[target], draft.tasks[index]];
        renderTasks();
      }));
      card.querySelector('[data-add-choice]')?.addEventListener('click', () => {
        syncTaskFromCard(card);
        const current = task();
        if (!current || current.choices.length >= 8) return;
        current.choices.push(`Variantas ${current.choices.length + 1}`);
        renderTasks();
      });
      card.querySelectorAll('[data-remove-choice]').forEach(button => button.addEventListener('click', () => {
        syncTaskFromCard(card);
        const current = task();
        if (!current || current.choices.length <= 2) return;
        current.choices.splice(Number(button.dataset.removeChoice), 1);
        if (!current.choices.includes(current.answer)) current.answer = '';
        renderTasks();
      }));
    }

    function renderTasks() {
      tasksHost.querySelectorAll('[data-task-id]').forEach(destroyTaskEditors);
      tasksHost.innerHTML = draft.tasks.length
        ? draft.tasks.map(taskMarkup).join('')
        : '<div class="p2-library-editor-empty"><strong>Dar nėra užduočių.</strong><span>Pridėk trumpo atsakymo arba pasirinkimo užduotį.</span></div>';
      tasksHost.querySelectorAll('[data-task-id]').forEach(bindTaskCard);
      updateTaskCount();
    }

    function close() {
      tasksHost.querySelectorAll('[data-task-id]').forEach(destroyTaskEditors);
      modal.hidden = true;
      setStatus('');
    }

    function open(lesson = null, options = {}) {
      draft = normalizeLesson(lesson, { duplicate: Boolean(options.duplicate) });
      modal.querySelector('[data-editor-heading]').textContent = options.duplicate ? 'Kopijuojamos pratybos' : (lesson ? 'Redaguoti pratybas' : 'Naujos pratybos');
      modal.querySelector('[data-lesson-field="title"]').value = draft.title;
      modal.querySelector('[data-lesson-field="description"]').value = draft.description;
      modal.querySelector('[data-lesson-field="defaultMaxAttempts"]').value = String(draft.defaultMaxAttempts);
      renderTasks();
      setStatus(lesson && !options.duplicate ? `Versija ${Math.max(1, draft.sourceVersion)}` : 'Naujos pratybos');
      modal.hidden = false;
      modal.querySelector('[data-lesson-field="title"]')?.focus();
    }

    function validateAndBuild() {
      syncAll();
      const title = String(draft.title || '').trim();
      if (!title) throw new Error('Įrašyk pratybų pavadinimą.');
      if (!draft.tasks.length) throw new Error('Pridėk bent vieną užduotį.');
      const tasks = draft.tasks.map((task, index) => {
        const prompt = String(task.prompt || '').trim();
        const taskTitle = String(task.title || '').trim() || `Užduotis ${index + 1}`;
        if (!prompt) throw new Error(`${index + 1} užduočiai trūksta sąlygos.`);
        if (task.type === 'choice') {
          const choices = task.choices.map(value => String(value || '').trim()).filter(Boolean);
          if (choices.length < 2) throw new Error(`${index + 1} užduočiai reikia bent 2 atsakymo variantų.`);
          const answer = String(task.answer || '').trim();
          if (!answer || !choices.includes(answer)) throw new Error(`${index + 1} užduočiai pažymėk teisingą variantą.`);
          return {
            id: task.id,
            type: 'choice',
            section: task.section === 'self' ? 'self' : 'class',
            label: String(task.label || 'Pasirinkimas').trim() || 'Pasirinkimas',
            title: taskTitle,
            prompt,
            promptDisplay: prompt,
            choices,
            choicesDisplay: choices,
            answer,
            hint: String(task.hint || '').trim()
          };
        }
        const answer = String(task.answer || '').trim();
        if (!answer) throw new Error(`${index + 1} užduočiai įrašyk teisingą atsakymą.`);
        return {
          id: task.id,
          type: 'input',
          section: task.section === 'self' ? 'self' : 'class',
          label: String(task.label || 'Trumpas atsakymas').trim() || 'Trumpas atsakymas',
          title: taskTitle,
          prompt,
          promptDisplay: prompt,
          answer,
          answerType: task.answerType === 'number' ? 'number' : 'text',
          inputLabel: 'Atsakymas',
          placeholder: task.answerType === 'number' ? 'Įrašyk skaičių' : 'Įrašyk atsakymą',
          hint: String(task.hint || '').trim()
        };
      });
      const now = Date.now();
      const classCount = tasks.filter(task => task.section === 'class').length;
      const selfCount = tasks.length - classCount;
      return {
        id: draft.id,
        lessonId: draft.id,
        source: 'custom',
        isCustom: true,
        contentVersion: draft.isNew ? 1 : Math.max(1, draft.sourceVersion + 1),
        title,
        shortTitle: title,
        description: String(draft.description || '').trim(),
        defaultMaxAttempts: [0,1,2,3].includes(Number(draft.defaultMaxAttempts)) ? Number(draft.defaultMaxAttempts) : 3,
        taskCount: tasks.length,
        classCount,
        selfCount,
        createdAt: draft.createdAt || now,
        updatedAt: now,
        tasks
      };
    }

    modal.querySelectorAll('[data-editor-close]').forEach(button => button.addEventListener('click', close));
    modal.querySelectorAll('[data-lesson-field]').forEach(field => field.addEventListener('input', () => setStatus('Yra neišsaugotų pakeitimų', 'pending')));
    modal.querySelectorAll('[data-add-task]').forEach(button => button.addEventListener('click', () => {
      syncAll();
      const type = button.dataset.addTask === 'choice' ? 'choice' : 'input';
      draft.tasks.push(normalizeTask({ type, section: 'class', choices: type === 'choice' ? ['Variantas 1', 'Variantas 2'] : [] }, draft.tasks.length));
      renderTasks();
      const cards = tasksHost.querySelectorAll('[data-task-id]');
      cards[cards.length - 1]?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      setStatus('Yra neišsaugotų pakeitimų', 'pending');
    }));
    modal.querySelector('[data-editor-save]')?.addEventListener('click', async () => {
      try {
        const lesson = validateAndBuild();
        setStatus('Saugoma…', 'pending');
        const button = modal.querySelector('[data-editor-save]');
        button.disabled = true;
        try { await saveHandler?.(deepCopy(lesson)); }
        finally { button.disabled = false; }
      } catch (error) {
        setStatus(String(error?.message || error || 'Patikrink įvestus duomenis.'), 'error');
      }
    });

    return Object.freeze({
      element: modal,
      open,
      close,
      onSave(handler) { saveHandler = typeof handler === 'function' ? handler : null; },
      markSaved(message = 'Išsaugota') { setStatus(message, 'success'); close(); }
    });
  }

  window.P772LibraryEditor = Object.freeze({ createLibraryEditor });
})();
