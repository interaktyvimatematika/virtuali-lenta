(() => {
  'use strict';

  function editorFromNode(node) {
    return node instanceof Element
      ? node.closest?.('.mixed-editor-content') || null
      : node?.parentElement?.closest?.('.mixed-editor-content') || null;
  }

  function formulaWrapperFromNode(node) {
    return node instanceof Element
      ? node.closest?.('.mixed-inline-formula') || null
      : node?.parentElement?.closest?.('.mixed-inline-formula') || null;
  }

  function currentTextRange(editor) {
    if (!editor?.isConnected) return null;
    const selection = window.getSelection?.();
    if (!selection?.rangeCount) return null;
    const range = selection.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer)) return null;
    if (formulaWrapperFromNode(range.commonAncestorContainer)) return null;
    try { return range.cloneRange(); } catch (_) { return null; }
  }

  function appendNode(nodes, node) {
    if (node.type === 'text') {
      const text = String(node.text || '').replace(/\u200B/g, '');
      const previous = nodes[nodes.length - 1];
      if (previous?.type === 'text') previous.text += text;
      else nodes.push({ type: 'text', text });
      return;
    }
    if (node.type === 'break') {
      nodes.push({ type: 'break' });
      return;
    }
    nodes.push(node);
  }

  function nodesFromEditor(editor, options = {}) {
    const readMathValue = typeof options.readMathValue === 'function' ? options.readMathValue : field => String(field?.value || '');
    const readMathLatex = typeof options.readMathLatex === 'function' ? options.readMathLatex : field => String(field?.value || '');
    const normalizeNodes = typeof options.normalizeNodes === 'function' ? options.normalizeNodes : value => value;
    const nodes = [];
    const walk = parent => {
      [...parent.childNodes].forEach(child => {
        if (child.nodeType === Node.TEXT_NODE) {
          appendNode(nodes, { type: 'text', text: child.nodeValue || '' });
          return;
        }
        if (!(child instanceof Element)) return;
        if (child.matches('.mixed-inline-formula')) {
          const field = child.querySelector('math-field.direct-math-field');
          appendNode(nodes, {
            type: 'formula',
            id: String(child.dataset.formulaNodeId || `mixed-formula-${Date.now()}`),
            value: field ? readMathValue(field) : String(child.dataset.value || ''),
            latex: field ? readMathLatex(field) : String(child.dataset.latex || '')
          });
          return;
        }
        if (child.tagName === 'BR') {
          appendNode(nodes, { type: 'break' });
          return;
        }
        const isBlock = ['DIV', 'P'].includes(child.tagName);
        if (isBlock && nodes.length && nodes[nodes.length - 1]?.type !== 'break') appendNode(nodes, { type: 'break' });
        walk(child);
        if (isBlock && nodes[nodes.length - 1]?.type !== 'break') appendNode(nodes, { type: 'break' });
      });
    };
    walk(editor);
    while (nodes.length > 1 && nodes[nodes.length - 1]?.type === 'break') nodes.pop();
    return normalizeNodes(nodes);
  }

  function contentMinimumWidth(editor) {
    if (!editor?.isConnected) return 110;
    let widestFormula = 0;
    editor.querySelectorAll('.mixed-inline-formula').forEach(wrapper => {
      const field = wrapper.querySelector('math-field');
      const width = Math.max(
        Number(wrapper.scrollWidth) || 0,
        Number(wrapper.offsetWidth) || 0,
        Number(field?.scrollWidth) || 0,
        Number(field?.offsetWidth) || 0
      );
      if (Number.isFinite(width)) widestFormula = Math.max(widestFormula, Math.ceil(width));
    });
    return Math.max(110, Math.min(900, widestFormula ? widestFormula + 10 : 110));
  }

  function applyContentSizing(note, editor, { expandForFormula = true } = {}) {
    const element = editor?.closest?.('.board-note');
    if (!element) return;
    const minWidth = contentMinimumWidth(editor);
    element.style.setProperty('--mixed-note-content-min-width', `${minWidth}px`);
    element.style.removeProperty('height');
    element.style.minHeight = '44px';
    if (expandForFormula && element.offsetWidth < minWidth) element.style.width = `${minWidth}px`;
    if (note) {
      note.width = Math.max(minWidth, Math.min(900, element.offsetWidth || note.width || 420));
      note.minHeight = 44;
    }
  }

  function createSharedEditLease(options = {}) {
    const leaseMs = Math.max(80, Number(options.leaseMs) || 420);
    let lastLocalActivityAt = 0;
    let timer = null;

    const editingActive = () => {
      if (document.visibilityState === 'hidden') return false;
      if (typeof document.hasFocus === 'function' && !document.hasFocus()) return false;
      if (performance.now() - lastLocalActivityAt > leaseMs) return false;

      const activeElement = document.activeElement;
      const editor = options.getActiveEditor?.();
      if (editor?.isConnected && editor.closest?.('.board-note')) {
        if (activeElement === editor || editor.contains(activeElement)) return true;
        const noteElement = editor.closest('.board-note');
        if (activeElement && noteElement?.contains(activeElement)) return true;
      }
      const activeMathField = options.getActiveMathField?.();
      if (activeMathField?.isConnected && activeMathField.closest?.('.board-note')
        && options.mathFieldHasFocus?.(activeMathField)) return true;
      return Boolean(options.registeredBoardMathEditing?.());
    };

    const notifyEnded = () => options.onEditingEnded?.();

    const markActivity = () => {
      lastLocalActivityAt = performance.now();
      clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        if (!editingActive()) notifyEnded();
      }, leaseMs + 30);
    };

    const notifyEndedSoon = () => {
      queueMicrotask(() => {
        if (!editingActive()) notifyEnded();
      });
    };

    return Object.freeze({ markActivity, isEditing: editingActive, notifyEndedSoon });
  }

  function bindEditor(editor, note, callbacks = {}) {
    let lastSmartMathTrigger = { character: '', at: 0 };

    editor.addEventListener('input', event => {
      callbacks.setActiveEditor?.(editor, { save: false });
      if (callbacks.eventOriginatesInMathField?.(event)) return;
      callbacks.captureTextSelection?.(editor);
      callbacks.saveNote?.(note, editor);
    });

    editor.addEventListener('pointerdown', event => {
      event.stopPropagation();
      callbacks.markLocalActivity?.();
      callbacks.setActiveEditor?.(editor, { save: false });
      if (callbacks.eventOriginatesInMathField?.(event)) return;
      if (callbacks.getActiveMathField?.()) callbacks.clearMathSession?.();
      requestAnimationFrame(() => callbacks.captureTextSelection?.(editor));
    });

    editor.addEventListener('focusin', () => {
      callbacks.markLocalActivity?.();
      callbacks.setActiveEditor?.(editor, { save: false });
    });

    editor.addEventListener('keyup', event => {
      if (!callbacks.eventOriginatesInMathField?.(event)) callbacks.captureTextSelection?.(editor);
    });

    editor.addEventListener('mouseup', event => {
      if (!callbacks.eventOriginatesInMathField?.(event)) callbacks.captureTextSelection?.(editor);
    });

    editor.addEventListener('keydown', event => {
      if (callbacks.eventOriginatesInMathField?.(event)) return;
      const textRange = callbacks.currentTextRange?.(editor);
      if (textRange) callbacks.deactivateMathForTextRange?.(editor, textRange);
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'm') {
        event.preventDefault();
        callbacks.insertFormula?.(editor);
        return;
      }
      if (callbacks.handleFormulaBoundaryKey?.(editor, event)) return;
      if (!event.ctrlKey && !event.metaKey && !event.altKey && !event.isComposing && callbacks.typedMathKey?.(event.key)) {
        if (callbacks.trySmartMathTrigger?.(editor, event.key)) {
          event.preventDefault();
          lastSmartMathTrigger = { character: event.key, at: performance.now() };
        }
      }
    });

    editor.addEventListener('beforeinput', event => {
      if (callbacks.eventOriginatesInMathField?.(event)) return;
      const textRange = callbacks.currentTextRange?.(editor);
      if (textRange) callbacks.deactivateMathForTextRange?.(editor, textRange);
      if (event.inputType !== 'insertText' || !callbacks.typedMathKey?.(event.data)) return;
      if (lastSmartMathTrigger.character === event.data && performance.now() - lastSmartMathTrigger.at < 120) {
        event.preventDefault();
        return;
      }
      if (callbacks.trySmartMathTrigger?.(editor, event.data)) event.preventDefault();
    });
  }

  function eventPath(event) {
    try {
      const path = typeof event?.composedPath === 'function' ? event.composedPath() : [];
      if (Array.isArray(path) && path.length) return path;
    } catch (_) {}
    return event?.target ? [event.target] : [];
  }

  function installDocumentEditing(callbacks = {}) {
    document.addEventListener('selectionchange', () => {
      const selection = window.getSelection?.();
      if (!selection?.rangeCount) return;
      const editor = editorFromNode(selection.anchorNode);
      if (!editor) return;
      callbacks.setActiveEditor?.(editor, { save: false });
      callbacks.captureTextSelection?.(editor);
    });

    document.addEventListener('pointerdown', event => {
      const path = callbacks.eventPath?.(event) || eventPath(event);
      const editor = path.map(node => editorFromNode(node)).find(Boolean) || null;
      if (editor) {
        callbacks.setActiveEditor?.(editor, { save: false });
        const touchesFormula = path.some(node => formulaWrapperFromNode(node));
        if (!touchesFormula) {
          if (callbacks.getActiveMathField?.()) callbacks.clearMathSession?.();
          window.setTimeout(() => {
            if (!editor.isConnected) return;
            const range = callbacks.currentTextRange?.(editor);
            if (range) callbacks.deactivateMathForTextRange?.(editor, range);
          }, 0);
        }
        return;
      }
      if (callbacks.eventTouchesMathToolbar?.(event)) return;
      callbacks.setActiveEditor?.(null, { save: false });
    }, true);

    document.addEventListener('focusin', event => {
      const editor = editorFromNode(event.target);
      if (!editor) return;
      callbacks.setActiveEditor?.(editor, { save: false });
      if (!callbacks.mathFieldFromEvent?.(event) && !formulaWrapperFromNode(event.target)) callbacks.captureTextSelection?.(editor);
    }, true);

    document.addEventListener('keydown', event => {
      const isShortcut = event.altKey && !event.ctrlKey && !event.metaKey
        && (event.key === '=' || event.code === 'Equal');
      if (!isShortcut || callbacks.eventOriginatesInMathField?.(event)) return;
      const editor = editorFromNode(event.target) || callbacks.getActiveEditor?.();
      if (!editor?.isConnected) return;
      event.preventDefault();
      event.stopPropagation();
      callbacks.setActiveEditor?.(editor, { save: false });
      callbacks.activateExplicitMathMode?.(editor);
    }, true);
  }

  window.P772BoardTextEditor = Object.freeze({
    version: 'P1.7.9.49-M2.6.1',
    editorFromNode,
    formulaWrapperFromNode,
    currentTextRange,
    nodesFromEditor,
    contentMinimumWidth,
    applyContentSizing,
    createSharedEditLease,
    bindEditor,
    installDocumentEditing
  });
})();
