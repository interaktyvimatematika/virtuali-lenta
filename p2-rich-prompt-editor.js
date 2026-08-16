(() => {
  'use strict';

  const BoardMathField = window.P772BoardMathField;
  const BoardMathToolbar = window.P772BoardMathToolbar;

  function deepClone(value) {
    try { return JSON.parse(JSON.stringify(value)); }
    catch (_) { return value; }
  }

  function mathSelectionHasContent(selection) {
    const ranges = Array.isArray(selection) ? selection : selection?.ranges;
    return Array.isArray(ranges) && ranges.some(range => Array.isArray(range) && Number(range[0]) !== Number(range[1]));
  }

  function escapeTextNodeValue(value) {
    return String(value ?? '').replace(/\u200B/g, '');
  }

  function parsePrompt(source) {
    const value = String(source ?? '');
    const nodes = [];
    const re = /\\\(([\s\S]*?)\\\)/g;
    let cursor = 0;
    let match;
    while ((match = re.exec(value))) {
      if (match.index > cursor) nodes.push({ type: 'text', value: value.slice(cursor, match.index) });
      nodes.push({ type: 'formula', latex: match[1] });
      cursor = match.index + match[0].length;
    }
    if (cursor < value.length) nodes.push({ type: 'text', value: value.slice(cursor) });
    if (!nodes.length && value) nodes.push({ type: 'text', value });
    return nodes;
  }

  function createPromptEditor(options = {}) {
    const doc = options.document || document;
    const onChange = typeof options.onChange === 'function' ? options.onChange : () => {};
    const contextLabel = String(options.contextLabel || 'Pratybų sąlyga');
    const ariaLabel = String(options.ariaLabel || contextLabel);
    const toolbarTitle = String(options.toolbarTitle || 'Matematikos juosta');
    const toolbarHint = options.toolbarHint === false ? '' : String(options.toolbarHint || 'Alt+= – įterpti formulę');
    const variant = String(options.variant || '').trim();
    const compact = Boolean(options.compact);
    const root = doc.createElement('div');
    root.className = `p2-rich-prompt-editor${compact ? ' is-compact' : ''}${variant ? ` is-${variant}` : ''}`;

    const toolbar = doc.createElement('div');
    toolbar.className = 'p2-rich-prompt-toolbar';
    toolbar.innerHTML = `
      <div class="p2-rich-prompt-toolbar-head">
        <span>${toolbarTitle}</span>
        ${toolbarHint ? `<small>${toolbarHint}</small>` : ''}
      </div>
      <div class="p2-rich-prompt-categories" role="tablist" aria-label="Matematikos kategorijos"></div>
      <div class="p2-rich-prompt-keys" aria-label="Matematikos simboliai"></div>`;

    const editor = doc.createElement('div');
    editor.className = 'p2-rich-prompt-content';
    editor.contentEditable = 'true';
    editor.dataset.p2RichEditor = '1';
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('aria-label', ariaLabel);
    editor.dataset.placeholder = options.placeholder || 'Įrašyk užduoties sąlygą. Formules įterpk Matematikos juosta.';

    root.append(toolbar, editor);

    const categoriesHost = toolbar.querySelector('.p2-rich-prompt-categories');
    const keysHost = toolbar.querySelector('.p2-rich-prompt-keys');
    const mathSelectionByKey = new Map();
    let activeField = null;
    let savedTextRange = null;
    let category = 'Pagrindiniai';
    let destroyed = false;
    let fieldCounter = 0;
    const editorInstanceKey = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const belongsToEditor = node => Boolean(node && (node === editor || editor.contains(node)));
    const editorFromNode = node => {
      if (!node) return null;
      if (node === editor || editor.contains(node instanceof Node ? node : null)) return editor;
      return null;
    };

    function placeCaretAround(wrapper, after = true) {
      if (!wrapper?.isConnected) return;
      const range = doc.createRange();
      if (after) range.setStartAfter(wrapper);
      else range.setStartBefore(wrapper);
      range.collapse(true);
      const selection = doc.getSelection?.();
      selection?.removeAllRanges();
      selection?.addRange(range);
      savedTextRange = range.cloneRange();
      activeField = null;
      try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
    }

    function captureMathSelection(field) {
      if (!field) return null;
      let selection = null;
      try { selection = deepClone(field.selection); } catch (_) {}
      const key = String(field.dataset.mathFieldKey || '');
      if (key && selection) mathSelectionByKey.set(key, selection);
      return selection;
    }

    function restoreMathSelection(field, selection) {
      if (!field || !selection) return false;
      try {
        field.selection = deepClone(selection);
        return true;
      } catch (_) { return false; }
    }

    const fieldEngine = BoardMathField?.createEngine?.({
      deps: {
        formatNumber: value => String(value),
        precedence: () => 0,
        parseEquation: value => value,
        parseSolutionSetInput: () => ({ kind: 'none' }),
        formatSupportedRoot: value => String(value),
        parseExpression: value => value
      },
      hooks: {
        captureMathFieldSelection: captureMathSelection,
        ensureMathFieldVisible(field) { field?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); },
        registerMathField() {},
        reaffirmMathEditSession(field) { activeField = field; return true; },
        scheduleMathFieldPreview() {},
        renderMathFieldPreview() { return Promise.resolve(); },
        updateMathToolbarUi() {},
        setActiveDirectMathField(field) { activeField = field; },
        mixedEditorFromNode: editorFromNode,
        clearMathEditSession() { activeField = null; },
        placeTextCaretAfter(wrapper) { placeCaretAround(wrapper, true); },
        placeTextCaretBefore(wrapper) { placeCaretAround(wrapper, false); },
        getActiveDirectMathField() { return activeField?.isConnected ? activeField : null; }
      }
    });

    const toolbarState = { mathToolbarCategory: category };
    const toolbarEngine = BoardMathToolbar?.createEngine?.({
      state: toolbarState,
      mathSelectionByKey,
      hooks: {
        resolveActiveMathField() { return activeField?.isConnected ? activeField : null; },
        clearMathEditSession() { activeField = null; },
        showToast(message) { root.dataset.message = String(message || ''); },
        captureMathFieldSelection: captureMathSelection,
        mathFieldKey(field) { return String(field?.dataset?.mathFieldKey || ''); },
        restoreMathFieldSelection: restoreMathSelection,
        setActiveDirectMathField(field) { activeField = field; },
        mathSelectionHasContent,
        rawDirectMathLatex(field) { return fieldEngine?.rawDirectMathLatex?.(field) || String(field?.value || ''); },
        isVbeVectorToolbarExitOperator(value) { return fieldEngine?.isVbeVectorToolbarExitOperator?.(value) || false; },
        exitActiveVbeVectorPrompt(field) { return fieldEngine?.exitActiveVbeVectorPrompt?.(field) || false; },
        beginVbeVectorDeletion(field) { return fieldEngine?.beginVbeVectorDeletion?.(field) || { handled: false }; },
        finishVbeVectorDeletion(field) { fieldEngine?.finishVbeVectorDeletion?.(field); },
        moveMathPlaceholderOrField(field, direction) { return fieldEngine?.moveMathPlaceholderOrField?.(field, direction) || false; },
        findInsertedVbeVectorIndex(before, after) { return fieldEngine?.findInsertedVbeVectorIndex?.(before, after) ?? -1; },
        scanVbeVectors(value) { return fieldEngine?.scanVbeVectors?.(value) || []; },
        clearVbeVectorPromptState(field) { fieldEngine?.clearVbeVectorPromptState?.(field); },
        reaffirmMathEditSession(field) { activeField = field; return true; },
        ensureMathFieldVisible(field) { field?.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); },
        getActiveMathContext() { return contextLabel; },
        scheduleSave() {}
      }
    });

    const categories = toolbarEngine?.categories || ['Pagrindiniai'];
    const directKeys = toolbarEngine?.directKeys || [
      { category: 'Pagrindiniai', label: '+', insert: '+' },
      { category: 'Pagrindiniai', label: '−', insert: '-' },
      { category: 'Pagrindiniai', label: '·', insert: '\\cdot ' },
      { category: 'Pagrindiniai', label: '=', insert: '=' },
      { category: 'Pagrindiniai', label: 'a⁄b', structure: 'fraction' },
      { category: 'Pagrindiniai', label: '√', structure: 'root' }
    ];
    const controlKeys = toolbarEngine?.controlKeys || [];

    function readFieldLatex(field) {
      if (!field) return '';
      try {
        if (fieldEngine?.readDirectMathLatex) return String(fieldEngine.readDirectMathLatex(field) || '');
        if (typeof field.getValue === 'function') return String(field.getValue('latex-expanded') || field.getValue('latex') || '');
      } catch (_) {}
      return String(field.dataset.latex || field.value || field.textContent || '');
    }


    function mathFieldIsEmpty(field) {
      const latex = readFieldLatex(field)
        .replace(/\\placeholder(?:\[[^\]]*\])?\{[^{}]*\}/g, '')
        .replace(/[{}\s]/g, '');
      return latex === '';
    }

    function zeroWidthOnly(node) {
      return Boolean(node?.nodeType === Node.TEXT_NODE
        && String(node.nodeValue || '').replace(/\u200B/g, '').length === 0);
    }

    function adjacentFormulaFromRange(range, direction) {
      if (!range?.collapsed) return null;
      const dir = direction < 0 ? -1 : 1;
      let container = range.startContainer;
      let offset = range.startOffset;

      if (container?.nodeType === Node.TEXT_NODE) {
        const text = String(container.nodeValue || '');
        const side = dir < 0 ? text.slice(0, offset) : text.slice(offset);
        if (side.replace(/\u200B/g, '').length) return null;
        const parent = container.parentNode;
        if (!parent) return null;
        const index = Array.prototype.indexOf.call(parent.childNodes, container);
        container = parent;
        offset = dir < 0 ? index : index + 1;
      }

      while (container && (container === editor || editor.contains(container))) {
        if (!(container instanceof Element)) break;
        const children = container.childNodes;
        let index = dir < 0 ? offset - 1 : offset;
        while (index >= 0 && index < children.length) {
          const candidate = children[index];
          if (zeroWidthOnly(candidate)) {
            index += dir;
            continue;
          }
          if (candidate instanceof Element && candidate.matches('.p2-rich-inline-formula')) return candidate;
          return null;
        }
        if (container === editor) break;
        const parent = container.parentNode;
        if (!parent) break;
        const parentIndex = Array.prototype.indexOf.call(parent.childNodes, container);
        container = parent;
        offset = dir < 0 ? parentIndex : parentIndex + 1;
      }
      return null;
    }

    function removeFormulaWrapper(wrapper) {
      if (!wrapper?.isConnected || !editor.contains(wrapper)) return false;
      const marker = doc.createTextNode('\u200B');
      wrapper.before(marker);
      wrapper.remove();
      const range = doc.createRange();
      range.setStart(marker, marker.nodeValue?.length || 0);
      range.collapse(true);
      const selection = doc.getSelection?.();
      selection?.removeAllRanges();
      selection?.addRange(range);
      savedTextRange = range.cloneRange();
      activeField = null;
      try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); }
      emitChange();
      return true;
    }

    function serializeNode(node, output) {
      if (node.nodeType === Node.TEXT_NODE) {
        output.push(escapeTextNodeValue(node.nodeValue || ''));
        return;
      }
      if (!(node instanceof Element)) return;
      if (node.matches('.p2-rich-inline-formula')) {
        const field = node.querySelector('math-field');
        output.push(`\\(${readFieldLatex(field)}\\)`);
        return;
      }
      if (node.tagName === 'BR') {
        output.push('\n');
        return;
      }
      const isBlock = ['DIV', 'P'].includes(node.tagName);
      if (isBlock && output.length && !String(output[output.length - 1]).endsWith('\n')) output.push('\n');
      [...node.childNodes].forEach(child => serializeNode(child, output));
      if (isBlock && output.length && !String(output[output.length - 1]).endsWith('\n')) output.push('\n');
    }

    function getValue() {
      const output = [];
      [...editor.childNodes].forEach(node => serializeNode(node, output));
      return output.join('').replace(/\n{3,}/g, '\n\n').replace(/\n+$/g, '');
    }

    function emitChange() {
      if (destroyed) return;
      root.classList.toggle('is-empty', !getValue().trim());
      onChange(getValue());
    }

    function createMathField(latex = '') {
      const wrapper = doc.createElement('span');
      wrapper.className = 'p2-rich-inline-formula mixed-inline-formula';
      wrapper.contentEditable = 'false';
      wrapper.dataset.formulaNodeId = `p2-rich-formula-${editorInstanceKey}-${++fieldCounter}`;
      let field;
      if (fieldEngine?.createDirectMathField) {
        field = fieldEngine.createDirectMathField({
          source: '',
          latexSource: String(latex || ''),
          fieldKey: wrapper.dataset.formulaNodeId,
          contextLabel,
          placeholder: 'Formulė',
          onCommit(_plain, nextLatex) {
            wrapper.dataset.latex = String(nextLatex || '');
            emitChange();
          }
        });
      } else {
        field = doc.createElement('math-field');
        field.className = 'direct-math-field';
        field.value = String(latex || '');
        field.addEventListener('input', emitChange);
      }
      // Šios rengyklės MathLive laukus izoliuojame nuo pagrindinės lentos
      // document-level MathLive sesijos, todėl nenaudojame .direct-math-field klasės.
      field.classList.remove('direct-math-field');
      field.classList.add('p2-rich-prompt-math-field');
      field.dataset.mathFieldKey = field.dataset.mathFieldKey || wrapper.dataset.formulaNodeId;
      field.dataset.mathContext = contextLabel;
      wrapper.dataset.latex = String(latex || '');
      wrapper.appendChild(field);

      field.addEventListener('focusin', () => {
        activeField = field;
        root.classList.add('is-active');
        captureMathSelection(field);
      });
      field.addEventListener('pointerup', () => {
        activeField = field;
        captureMathSelection(field);
      });
      field.addEventListener('selection-change', () => captureMathSelection(field));
      field.addEventListener('keydown', event => {
        if (!event.defaultPrevented && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey
          && (event.key === 'Backspace' || event.key === 'Delete') && mathFieldIsEmpty(field)) {
          event.preventDefault();
          event.stopImmediatePropagation();
          removeFormulaWrapper(wrapper);
          return;
        }
        if (event.key === '*' && !event.ctrlKey && !event.altKey && !event.metaKey && !event.isComposing) {
          event.preventDefault();
          event.stopImmediatePropagation();
          field.__p2PromptStarAt = performance.now();
          insertMathKey({ label: '·', insert: '\\cdot ', aria: 'Daugyba' }, field);
        }
      }, true);
      field.addEventListener('beforeinput', event => {
        if (event.isComposing || event.inputType !== 'insertText' || event.data !== '*') return;
        event.preventDefault();
        event.stopImmediatePropagation();
        const handledAt = Number(field.__p2PromptStarAt || 0);
        if (!handledAt || performance.now() - handledAt > 160) {
          field.__p2PromptStarAt = performance.now();
          insertMathKey({ label: '·', insert: '\\cdot ', aria: 'Daugyba' }, field);
        }
      }, true);
      return wrapper;
    }

    function appendTextWithBreaks(value) {
      const parts = String(value || '').split('\n');
      parts.forEach((part, index) => {
        if (part) editor.appendChild(doc.createTextNode(part));
        if (index < parts.length - 1) editor.appendChild(doc.createElement('br'));
      });
    }

    function setValue(value = '') {
      activeField = null;
      savedTextRange = null;
      editor.replaceChildren();
      parsePrompt(value).forEach(node => {
        if (node.type === 'formula') editor.appendChild(createMathField(node.latex));
        else appendTextWithBreaks(node.value);
      });
      root.classList.toggle('is-empty', !String(value || '').trim());
    }

    function captureTextRange() {
      const selection = doc.getSelection?.();
      if (!selection?.rangeCount) return null;
      const range = selection.getRangeAt(0);
      if (!belongsToEditor(range.commonAncestorContainer)) return null;
      const formula = range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer.closest?.('.p2-rich-inline-formula')
        : range.commonAncestorContainer.parentElement?.closest?.('.p2-rich-inline-formula');
      if (formula) return null;
      try {
        savedTextRange = range.cloneRange();
        return savedTextRange;
      } catch (_) { return null; }
    }

    function ensureTextRange() {
      if (savedTextRange) {
        try {
          if (belongsToEditor(savedTextRange.commonAncestorContainer)) return savedTextRange.cloneRange();
        } catch (_) {}
      }
      const range = doc.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      return range;
    }

    function insertFormulaAtTextCaret(latex = '') {
      const range = ensureTextRange();
      const wrapper = createMathField(latex);
      range.deleteContents();
      range.insertNode(wrapper);
      const spacer = doc.createTextNode('\u200B');
      wrapper.after(spacer);
      activeField = wrapper.querySelector('math-field');
      try { activeField.focus({ preventScroll: true }); } catch (_) { activeField.focus(); }
      captureMathSelection(activeField);
      emitChange();
      return activeField;
    }

    function insertMathKey(key, forcedField = null) {
      let field = forcedField?.isConnected ? forcedField : (activeField?.isConnected && editor.contains(activeField) ? activeField : null);
      if (!field) field = insertFormulaAtTextCaret('');
      if (!field) return;
      if (toolbarEngine?.insertIntoDirectMathField) {
        toolbarEngine.insertIntoDirectMathField(field, key);
      } else if (key.command && typeof field.executeCommand === 'function') {
        try { field.executeCommand(key.command); } catch (_) {}
      } else {
        const insert = key.structure
          ? (toolbarEngine?.mathStructureTemplate?.(key.structure, false) || '')
          : String(key.insert || key.label || '');
        try {
          if (typeof field.insert === 'function') field.insert(insert, { insertionMode: 'replaceSelection', selectionMode: key.structure ? 'placeholder' : 'after', focus: true, format: 'latex' });
          else field.value = `${field.value || ''}${insert.replace(/#\?|#0/g, '')}`;
        } catch (_) {}
      }
      emitChange();
    }

    function renderCategories() {
      categoriesHost.replaceChildren();
      categories.forEach(name => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = `p2-rich-prompt-category${name === category ? ' is-active' : ''}`;
        button.textContent = name;
        button.setAttribute('role', 'tab');
        button.setAttribute('aria-selected', name === category ? 'true' : 'false');
        button.addEventListener('pointerdown', event => event.preventDefault());
        button.addEventListener('click', () => {
          category = name;
          toolbarState.mathToolbarCategory = name;
          renderCategories();
          renderKeys();
        });
        categoriesHost.appendChild(button);
      });
    }

    function renderKeys() {
      keysHost.replaceChildren();
      const mathMode = doc.createElement('button');
      mathMode.type = 'button';
      mathMode.className = 'p2-rich-prompt-key is-math-mode';
      mathMode.textContent = '𝑥';
      mathMode.title = 'Įterpti formulę (Alt+=)';
      mathMode.setAttribute('aria-label', 'Įterpti formulę');
      mathMode.addEventListener('pointerdown', event => event.preventDefault());
      mathMode.addEventListener('click', () => insertFormulaAtTextCaret(''));
      keysHost.appendChild(mathMode);

      directKeys.filter(key => key.category === category).forEach(key => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.className = `p2-rich-prompt-key${key.structure ? ' is-structure' : ''}`;
        button.textContent = key.label;
        button.title = key.aria || key.label;
        button.setAttribute('aria-label', key.aria || key.label);
        button.addEventListener('pointerdown', event => event.preventDefault());
        button.addEventListener('click', () => insertMathKey(key));
        keysHost.appendChild(button);
      });

      if (controlKeys.length) {
        const separator = doc.createElement('span');
        separator.className = 'p2-rich-prompt-key-separator';
        keysHost.appendChild(separator);
        controlKeys.forEach(key => {
          const button = doc.createElement('button');
          button.type = 'button';
          button.className = 'p2-rich-prompt-key is-control';
          button.textContent = key.label;
          button.title = key.aria || key.label;
          button.setAttribute('aria-label', key.aria || key.label);
          button.addEventListener('pointerdown', event => event.preventDefault());
          button.addEventListener('click', () => insertMathKey(key));
          keysHost.appendChild(button);
        });
      }
    }

    const selectionChangeHandler = () => {
      if (destroyed) return;
      const range = captureTextRange();
      if (range) activeField = null;
    };
    doc.addEventListener('selectionchange', selectionChangeHandler);

    editor.addEventListener('focusin', () => {
      root.classList.add('is-active');
      captureTextRange();
    });
    editor.addEventListener('pointerup', captureTextRange);
    editor.addEventListener('keyup', captureTextRange);
    editor.addEventListener('input', event => {
      if (event.target?.closest?.('math-field')) return;
      captureTextRange();
      emitChange();
    });
    editor.addEventListener('keydown', event => {
      if (!event.target?.closest?.('math-field') && !event.isComposing && !event.ctrlKey && !event.altKey && !event.metaKey
        && (event.key === 'Backspace' || event.key === 'Delete')) {
        const range = captureTextRange();
        const wrapper = adjacentFormulaFromRange(range, event.key === 'Backspace' ? -1 : 1);
        if (wrapper) {
          event.preventDefault();
          event.stopPropagation();
          removeFormulaWrapper(wrapper);
          return;
        }
      }
      if (event.altKey && !event.ctrlKey && !event.metaKey && (event.key === '=' || event.code === 'Equal')) {
        event.preventDefault();
        event.stopPropagation();
        captureTextRange();
        insertFormulaAtTextCaret('');
      }
    }, true);
    editor.addEventListener('paste', event => {
      if (!event.clipboardData) return;
      const text = event.clipboardData.getData('text/plain');
      if (!text) return;
      event.preventDefault();
      doc.execCommand?.('insertText', false, text);
    });

    root.addEventListener('focusout', () => {
      window.setTimeout(() => {
        if (!root.contains(doc.activeElement)) root.classList.remove('is-active');
      }, 0);
    });

    renderCategories();
    renderKeys();
    setValue(options.value || '');

    return Object.freeze({
      element: root,
      editor,
      getValue,
      setValue,
      focus() { try { editor.focus({ preventScroll: true }); } catch (_) { editor.focus(); } },
      destroy() {
        destroyed = true;
        doc.removeEventListener('selectionchange', selectionChangeHandler);
      }
    });
  }

  window.P772RichPromptEditor = Object.freeze({
    version: 'P3.2.4.1',
    createPromptEditor,
    parsePrompt
  });
})();
