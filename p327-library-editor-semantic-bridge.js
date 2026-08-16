(() => {
  'use strict';

  const module = window.P772LibraryEditor;
  const analyzer = window.P327SemanticEquationAnalyzer;
  if (!module || typeof module.createLibraryEditor !== 'function') {
    console.warn('P3.2.7.1: P772LibraryEditor modulis nerastas; semantinis tiltas neprijungtas.');
    return;
  }
  if (!analyzer || typeof analyzer.analyze !== 'function') {
    console.warn('P3.2.7.1: bendras semantinis analizatorius nerastas; semantinis tiltas neprijungtas.');
    return;
  }

  const originalCreate = module.createLibraryEditor.bind(module);
  const patchedEditors = new WeakSet();
  const inputTimers = new WeakMap();

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

  function promptSourceFromTask(task) {
    if (!task || typeof task !== 'object') return '';
    if (typeof task.prompt === 'string') return task.prompt.trim();
    if (task.prompt && typeof task.prompt.value === 'string') return task.prompt.value.trim();
    if (task.response && typeof task.initialEquation === 'string') return task.initialEquation.trim();
    return '';
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

  function hideSupersededOldAnalysis(scope) {
    if (!scope?.querySelectorAll) return;
    const nodes = scope.querySelectorAll('div,p,small,section,aside');
    nodes.forEach(node => {
      const text = elementText(node);
      if (!text || text.length > 520) return;
      if (/Automatinė lygties analizė nepavyko/i.test(text) || /neatpažintas simbolis\s*[„“"']?\/[„“"']?/i.test(text)) {
        node.dataset.p327SupersededAnalysis = 'true';
      }
      if (/Šiuo metu automatiškai tikrinamos tiesinės ir kvadratinės lygtys su vienu nežinomuoju/i.test(text)) {
        node.textContent = 'Automatiškai tikrinamos tiesinės, kvadratinės ir palaikomos trupmeninės lygtys su vienu nežinomuoju. Trupmeninėms lygtims pradinė AD sekama automatiškai.';
      }
    });
  }

  function upsertStatus(field, analysis, scope) {
    if (!field?.parentElement || !analysis?.ok || !analysis.rational) return;
    let status = field.parentElement.querySelector(':scope > .p327-semantic-analysis');
    if (!status) {
      status = document.createElement('div');
      status.className = 'p327-semantic-analysis';
      status.setAttribute('role', 'status');
      field.insertAdjacentElement('afterend', status);
    }
    const domain = analysis.domainDisplay ? ` AD: ${analysis.domainDisplay}.` : '';
    const solution = analysis.display ? ` Sprendinių aibė: ${analysis.display}.` : '';
    const html = `<strong>✓ Trupmeninė lygtis atpažinta bendru semantiniu tikrintuvu.</strong>${domain}${solution}`;
    if (status.innerHTML !== html) status.innerHTML = html;
    field.dataset.p327SemanticEquation = 'rational';
    hideSupersededOldAnalysis(scope);
  }

  function scanEditor(root) {
    if (!root?.querySelectorAll) return;
    const fields = root.querySelectorAll('math-field,input,textarea');
    fields.forEach(field => {
      const source = readMathFieldSource(field);
      if (!source || !source.includes('=')) return;
      const analysis = analyzeSource(source);
      if (!analysis?.ok || !analysis.rational) return;
      const scope = findTaskScope(field, root);
      upsertStatus(field, analysis, scope);
    });
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
    if (!editor || patchedEditors.has(editor)) return editor;
    patchedEditors.add(editor);
    const root = editor.element;

    if (typeof editor.onSave === 'function') {
      const originalOnSave = editor.onSave.bind(editor);
      editor.onSave = handler => originalOnSave(lesson => handler(patchLessonPayload(lesson)));
    }

    if (typeof editor.open === 'function') {
      const originalOpen = editor.open.bind(editor);
      editor.open = (...args) => {
        const result = originalOpen(...args);
        queueMicrotask(() => scanEditor(root));
        requestAnimationFrame(() => scanEditor(root));
        return result;
      };
    }

    if (root?.addEventListener) {
      root.addEventListener('input', event => scheduleScan(root, event.target), true);
      root.addEventListener('change', event => scheduleScan(root, event.target), true);
      const observer = new MutationObserver(() => scheduleScan(root));
      observer.observe(root, { childList: true, subtree: true, characterData: true });
    }
    queueMicrotask(() => scanEditor(root));
    return editor;
  }

  const bridgedModule = { ...module };
  bridgedModule.createLibraryEditor = documentRef => patchEditor(originalCreate(documentRef));
  bridgedModule.semanticBridgeVersion = 'P3.2.7.1';
  window.P772LibraryEditor = bridgedModule;
})();
