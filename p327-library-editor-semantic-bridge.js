(() => {
  'use strict';

  const module = window.P772LibraryEditor;
  const analyzer = window.P327SemanticEquationAnalyzer;
  if (!module || typeof module.createLibraryEditor !== 'function') {
    console.warn('P3.2.7.6: P772LibraryEditor modulis nerastas; semantinis tiltas neprijungtas.');
    return;
  }
  if (!analyzer || typeof analyzer.analyze !== 'function') {
    console.warn('P3.2.7.1: bendras semantinis analizatorius nerastas; semantinis tiltas neprijungtas.');
    return;
  }

  const originalCreate = module.createLibraryEditor.bind(module);
  const patchedEditors = new WeakSet();
  const inputTimers = new WeakMap();
  // P3.2.7.10.3: saugome paskutinį į rengyklę atidarytą užduočių modelį.
  // Nustatymų blokai kuriami asinchroniškai, todėl jų negalima patikimai
  // hidratuoti vien tik open() momentu.
  const openedTasksByRoot = new WeakMap();

  function cloneArray(value) {
    return Array.isArray(value) ? value.slice() : [];
  }

  function readMathFieldSource(field) {
    if (!field) return '';
    if (typeof field.getValue === 'function') {
      for (const format of ['ascii-math', 'latex']) {
        try {
          const value = String(field.getValue(format) || '').trim();
          if (value) return value;
        } catch (_) { /* fallback below */ }
      }
    }
    return String(field.value ?? field.getAttribute?.('value') ?? '').trim();
  }

  function normalizeSourceForCore(source) {
    let value = String(source || '').trim();
    if (!value) return '';
    // MathLive ASCII is preferred. A small LaTeX fallback covers the common fraction form
    // in case a browser/build does not expose ascii-math.
    const fracPattern = /\\frac\s*\{([^{}]+)\}\s*\{([^{}]+)\}/g;
    let previous = null;
    while (value !== previous) {
      previous = value;
      value = value.replace(fracPattern, '(($1)/(($2)))');
    }
    value = value
      .replace(/\\left|\\right/g, '')
      .replace(/\\cdot|\\times/g, '*')
      .replace(/\\,/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    return value;
  }

  function analyzeSource(source) {
    try { return analyzer.analyze(normalizeSourceForCore(source)); }
    catch (error) {
      return { ok: false, status: 'error', title: 'Automatinė lygties analizė nepavyko', message: error?.message || String(error) };
    }
  }

  // P3.2.7.6 — one authoritative equation-analysis entry point for the
  // library editor. The editor itself calls window.P772PracticeEngine at
  // input time *and* again while validating before save. Replacing only a
  // visual error message would therefore leave the old parser blocking
  // rational equations on save. Keep the proven legacy analysis for
  // non-rational equations, but delegate recognized rational equations to
  // the domain-aware semantic analyzer.
  const originalPracticeEngine = window.P772PracticeEngine;
  if (originalPracticeEngine?.analyzeEquation) {
    const legacyAnalyzeEquation = originalPracticeEngine.analyzeEquation.bind(originalPracticeEngine);
    const unifiedPracticeEngine = {
      ...originalPracticeEngine,
      analyzeEquation(source) {
        const semantic = analyzeSource(source);
        if (semantic?.ok && semantic.rational) {
          return {
            ok: true,
            status: semantic.status || 'ready',
            title: semantic.title || 'Trupmeninė lygtis ir AD išanalizuotos automatiškai',
            message: semantic.message || '',
            validator: 'semantic-equation-chain',
            variable: semantic.variable || 'x',
            value: Array.isArray(semantic.values) && semantic.values.length === 1 ? semantic.values[0] : null,
            values: cloneArray(semantic.values),
            display: semantic.display || '',
            degree: Number(semantic.degree) || 1,
            solutionKind: semantic.solutionKind || (semantic.values?.length === 1 ? 'single' : 'multiple'),
            rational: true,
            domainRestrictions: semantic.domainDisplay || '',
            excludedValues: cloneArray(semantic.excludedValues)
          };
        }
        return legacyAnalyzeEquation(source);
      }
    };
    window.P772PracticeEngine = Object.freeze(unifiedPracticeEngine);
  }

  function promptSourceFromTask(task) {
    if (!task || typeof task !== 'object') return '';
    if (typeof task.prompt === 'string') return task.prompt.trim();
    if (task.prompt && typeof task.prompt.value === 'string') return task.prompt.value.trim();
    if (task.response && typeof task.initialEquation === 'string') return task.initialEquation.trim();
    return '';
  }


  // P3.2.7.10.3 — the public library editor does not guarantee a flat
  // lesson.tasks array. Locate task objects recursively and bind injected
  // structure switches to the actual equation shown in each task card.
  function collectTaskObjects(value, out = [], seen = new WeakSet()) {
    if (!value || typeof value !== 'object') return out;
    if (seen.has(value)) return out;
    seen.add(value);
    const source = promptSourceFromTask(value);
    if (source && value.response && typeof value.response === 'object') out.push(value);
    if (Array.isArray(value)) value.forEach(item => collectTaskObjects(item, out, seen));
    else Object.values(value).forEach(item => collectTaskObjects(item, out, seen));
    return out;
  }

  function sourceKey(source) {
    return normalizeSourceForCore(source)
      .replace(/\s+/g, '')
      .replace(/[−–—]/g, '-')
      .replace(/[×·⋅]/g, '*');
  }

  function sourceFingerprint(source) {
    const analysis = analyzeSource(source);
    if (!analysis?.ok) return '';
    const excluded = cloneArray(analysis.excludedValues).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    const values = cloneArray(analysis.values).map(Number).filter(Number.isFinite).sort((a, b) => a - b);
    return JSON.stringify({
      rational: Boolean(analysis.rational),
      variable: analysis.variable || 'x',
      degree: Number(analysis.degree) || 0,
      excluded,
      values
    });
  }

  function applyRationalAnalysisToTask(task, analysis, source) {
    if (!task || typeof task !== 'object' || !analysis?.ok || !analysis.rational) return false;
    if (task.prompt && typeof task.prompt === 'object') task.prompt.kind = 'equation';
    task.response = task.response && typeof task.response === 'object' ? task.response : {};
    task.response.label = task.response.label || 'Sprendimo eiga';
    task.response.renderer = 'math-step-list';
    task.response.validator = 'semantic-equation-chain';
    task.response.valueType = 'equation';
    task.response.placeholder = task.response.placeholder || 'Įrašyk kitą lygties žingsnį';
    const previous = task.response.options && typeof task.response.options === 'object' ? task.response.options : {};
    const options = {
      ...previous,
      autoDerived: true,
      initial: source,
      expectedVariable: analysis.variable,
      expectedValues: cloneArray(analysis.values),
      expectedDisplay: analysis.display,
      solutionKind: analysis.solutionKind,
      minimumSteps: Math.max(1, Math.min(20, Number(previous.minimumSteps) || 1)),
      stepTransitionValidation: 'semantic-v7-domain',
      domainRestrictions: analysis.domainDisplay,
      excludedValues: cloneArray(analysis.excludedValues)
    };
    if (analysis.values.length === 1) options.expectedValue = analysis.values[0];
    else delete options.expectedValue;
    task.response.options = options;
    task.analysis = task.analysis && typeof task.analysis === 'object' ? task.analysis : {};
    Object.assign(task.analysis, {
      source: 'automatic',
      status: 'ready',
      kind: 'equation',
      validator: 'semantic-equation-chain',
      variable: analysis.variable,
      solution: analysis.display,
      degree: analysis.degree,
      rational: true,
      domain: analysis.domainDisplay
    });
    return true;
  }

  function patchLessonPayload(value, seen = new WeakSet()) {
    if (!value || typeof value !== 'object') return value;
    if (seen.has(value)) return value;
    seen.add(value);

    const source = promptSourceFromTask(value);
    if (source && source.includes('=')) {
      const analysis = analyzeSource(source);
      if (analysis?.ok && analysis.rational) applyRationalAnalysisToTask(value, analysis, source);
    }

    if (Array.isArray(value)) {
      value.forEach(item => patchLessonPayload(item, seen));
    } else {
      Object.values(value).forEach(item => patchLessonPayload(item, seen));
    }
    return value;
  }

  function elementText(element) {
    return String(element?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findTaskScope(field, root) {
    let node = field?.parentElement || null;
    let best = null;
    for (let depth = 0; node && node !== root && depth < 9; depth += 1, node = node.parentElement) {
      const text = elementText(node);
      if (/Pradinė lygtis/i.test(text)) best = node;
      if (/Pradinė lygtis/i.test(text) && /Nurodymas mokiniui|Automatinio tikrintuvo atsakymas|Mažiausiai sprendimo žingsnių/i.test(text)) return node;
    }
    return best || root;
  }

  function refreshEditorCopy(root) {
    if (!root?.querySelectorAll) return;
    root.querySelectorAll('.p327-semantic-analysis').forEach(node => node.remove());
    root.querySelectorAll('small').forEach(node => {
      if (node.children && node.children.length) return;
      const text = elementText(node);
      if (/^Šiuo metu automatiškai tikrinamos tiesinės ir kvadratinės lygtys su vienu nežinomuoju\.?$/i.test(text)) {
        node.textContent = 'Automatiškai tikrinamos tiesinės, kvadratinės ir palaikomos trupmeninės lygtys su vienu nežinomuoju. Trupmeninėms lygtims pradinė AD sekama automatiškai.';
      }
    });
  }

  function findMinimumStepsSelect(scope) {
    if (!scope?.querySelectorAll) return null;
    for (const select of scope.querySelectorAll('select')) {
      const label = select.closest('label');
      if (/Mažiausiai sprendimo žingsnių/i.test(elementText(label))) return select;
    }
    return null;
  }


  function taskSourceFromScope(scope) {
    if (!scope?.querySelectorAll) return '';
    const fields = [...scope.querySelectorAll('math-field')];
    for (const field of fields) {
      const source = readMathFieldSource(field);
      if (source && (source.includes('=') || source.includes('\\frac') || source.includes('/'))) return source;
    }
    return fields.length ? readMathFieldSource(fields[0]) : '';
  }

  function taskForBlock(block, tasks, used = new Set()) {
    if (!block || !Array.isArray(tasks)) return null;
    const key = String(block.dataset.p327TaskKey || '');
    const fingerprint = String(block.dataset.p327TaskFingerprint || '');
    let match = tasks.find(task => !used.has(task) && key && sourceKey(promptSourceFromTask(task)) === key);
    if (!match && fingerprint) {
      match = tasks.find(task => !used.has(task) && sourceFingerprint(promptSourceFromTask(task)) === fingerprint);
    }
    if (!match) match = tasks.find(task => !used.has(task)) || null;
    if (match) used.add(match);
    return match;
  }

  function ensureStructureRequirements(root) {
    if (!root?.querySelectorAll) return;
    const equationFields = [...root.querySelectorAll('math-field')].filter(field => {
      const scope = findTaskScope(field, root);
      return scope && /Pradinė lygtis/i.test(elementText(scope));
    });
    const scopes = [...new Set(equationFields.map(field => findTaskScope(field, root)).filter(Boolean))];

    scopes.forEach(scope => {
      const minimum = findMinimumStepsSelect(scope);
      if (!minimum) return;
      const taskSource = taskSourceFromScope(scope);
      let block = scope.querySelector('.p327-structure-requirements');
      if (!block) {
        block = document.createElement('div');
        block.className = 'p327-structure-requirements is-wide';
        block.innerHTML = `
          <div class="p327-structure-title">Sprendimo struktūros reikalavimai</div>
          <label class="p327-structure-check"><input type="checkbox" data-p327-require="and"> <span>Reikalauti aiškiai naudoti <strong>IR</strong></span></label>
          <label class="p327-structure-check"><input type="checkbox" data-p327-require="or"> <span>Reikalauti aiškiai naudoti <strong>ARBA</strong> (Šakos)</span></label>
          <small>Pagal nutylėjimą abu išjungti. Tai pateikimo reikalavimai, o ne matematinės klaidos.</small>`;
        const anchor = minimum.closest('label') || minimum;
        anchor.parentElement?.insertBefore(block, anchor.nextSibling);
      }
      block.dataset.p327TaskKey = sourceKey(taskSource);
      block.dataset.p327TaskFingerprint = sourceFingerprint(taskSource);
    });
  }

  function hydrateStructureBlocks(root) {
    if (!root?.querySelectorAll) return;
    const tasks = openedTasksByRoot.get(root) || [];
    const blocks = [...root.querySelectorAll('.p327-structure-requirements')];
    const used = new Set();
    blocks.forEach(block => {
      const task = taskForBlock(block, tasks, used);
      if (block.dataset.p327Hydrated === '1') return;
      const options = task?.response?.options || {};
      const andBox = block.querySelector('[data-p327-require="and"]');
      const orBox = block.querySelector('[data-p327-require="or"]');
      if (andBox) andBox.checked = Boolean(options.requireExplicitAnd);
      if (orBox) orBox.checked = Boolean(options.requireExplicitOr);
      block.dataset.p327Hydrated = '1';
    });
  }

  function scanEditor(root) {
    refreshEditorCopy(root);
    ensureStructureRequirements(root);
    hydrateStructureBlocks(root);
  }

  function scheduleScan(root, field = null) {
    const key = field || root;
    const previous = inputTimers.get(key);
    if (previous) clearTimeout(previous);
    inputTimers.set(key, setTimeout(() => {
      inputTimers.delete(key);
      scanEditor(root);
    }, 40));
  }

  function patchEditor(editor) {
    if (!editor) return editor;
    if (patchedEditors.has(editor)) return editor;
    patchedEditors.add(editor);

    // P2LibraryEditor returns a frozen public facade. Do not mutate it in
    // strict mode (that would throw and make the "Naujos pratybos" button
    // appear broken). Build a thin wrapper instead.
    const root = editor.element;
    const originalOpen = typeof editor.open === 'function' ? editor.open.bind(editor) : null;
    const originalClose = typeof editor.close === 'function' ? editor.close.bind(editor) : null;
    const originalOnSave = typeof editor.onSave === 'function' ? editor.onSave.bind(editor) : null;
    const originalMarkSaved = typeof editor.markSaved === 'function' ? editor.markSaved.bind(editor) : null;

    if (root?.addEventListener) {
      root.addEventListener('input', event => scheduleScan(root, event.target), true);
      root.addEventListener('change', event => scheduleScan(root, event.target), true);
      const observer = new MutationObserver(() => scheduleScan(root));
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    }

    const bridgedEditor = {
      element: root,
      open(...args) {
        const tasks = [];
        args.forEach(value => collectTaskObjects(value, tasks));
        openedTasksByRoot.set(root, tasks);
        const result = originalOpen ? originalOpen(...args) : undefined;

        const hydrate = () => {
          // Jei tas pats DOM pernaudojamas kitai pamokai, priverstinai
          // perskaitome naujai atidarytos pamokos nustatymus.
          root?.querySelectorAll?.('.p327-structure-requirements').forEach(block => {
            block.dataset.p327Hydrated = '0';
          });
          scanEditor(root);
        };
        queueMicrotask(hydrate);
        requestAnimationFrame(hydrate);
        setTimeout(hydrate, 80);
        setTimeout(hydrate, 220);
        return result;
      },
      close(...args) {
        return originalClose ? originalClose(...args) : undefined;
      },
      onSave(handler) {
        if (!originalOnSave) return undefined;
        return originalOnSave(lesson => {
          const patched = patchLessonPayload(lesson);
          const blocks = root?.querySelectorAll ? [...root.querySelectorAll('.p327-structure-requirements')] : [];
          const tasks = collectTaskObjects(patched);
          const used = new Set();
          blocks.forEach(block => {
            const task = taskForBlock(block, tasks, used);
            if (!task) return;
            task.response = task.response && typeof task.response === 'object' ? task.response : {};
            task.response.options = task.response.options && typeof task.response.options === 'object' ? task.response.options : {};
            task.response.options.requireExplicitAnd = Boolean(block.querySelector('[data-p327-require="and"]')?.checked);
            task.response.options.requireExplicitOr = Boolean(block.querySelector('[data-p327-require="or"]')?.checked);
          });
          openedTasksByRoot.set(root, tasks);
          return handler(patched);
        });
      },
      markSaved(...args) {
        return originalMarkSaved ? originalMarkSaved(...args) : undefined;
      }
    };

    queueMicrotask(() => scanEditor(root));
    return Object.freeze(bridgedEditor);
  }

  const bridgedModule = { ...module };
  bridgedModule.createLibraryEditor = documentRef => patchEditor(originalCreate(documentRef));
  bridgedModule.semanticBridgeVersion = 'P3.2.7.10.3';
  window.P772LibraryEditor = bridgedModule;
})();
