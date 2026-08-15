(() => {
  'use strict';

  // P1.7.9.49-M2.5.1: bendras lentos objektų geometrijos / pozicionavimo sluoksnis.
  // Modulis sąmoningai nežino apie MathLive turinį, paveikslėlių įkėlimą ar Firebase.
  // app.js perduoda esamą state, DOM nuorodas ir siaurus callback'us.

  function normalizeSelection(type, id, state) {
    const safeType = String(type || '');
    const safeId = String(id || '');
    if (!safeType || !safeId || !state) return null;
    if (safeType === 'task' && state.boardTasks.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'practice' && state.boardPractices.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'note' && state.notes.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'image' && state.boardImages.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'formula' && state.formulas.some(item => item.id === safeId)) return { type: safeType, id: safeId };
    if (safeType === 'practice-window' && safeId === 'main' && !state.window.shelved) return { type: safeType, id: safeId };
    return null;
  }

  function getElement(selection, { state, objectsLayer, practiceWindow } = {}) {
    if (!selection) return null;
    if (selection.type === 'practice-window') return !state?.window?.shelved ? practiceWindow : null;
    return [...(objectsLayer?.querySelectorAll('[data-board-object-type][data-board-object-id]') || [])]
      .find(element => element.dataset.boardObjectType === selection.type && element.dataset.boardObjectId === selection.id) || null;
  }

  function updateSelectionUi({ state, objectsLayer, practiceWindow, focusObjectButton } = {}) {
    if (!state) return null;
    const selection = normalizeSelection(state.activeBoardObject?.type, state.activeBoardObject?.id, state);
    if (!selection) state.activeBoardObject = null;
    objectsLayer?.querySelectorAll('[data-board-object-type][data-board-object-id]').forEach(element => {
      element.classList.toggle('is-active-object', Boolean(selection)
        && element.dataset.boardObjectType === selection.type
        && element.dataset.boardObjectId === selection.id);
    });
    practiceWindow?.classList.toggle('is-object-selected', selection?.type === 'practice-window');
    if (focusObjectButton) {
      focusObjectButton.disabled = !selection;
      focusObjectButton.title = selection ? 'Priartinti pažymėtą lentos objektą' : 'Pirmiausia pažymėkite lentos objektą';
    }
    return selection;
  }

  function visibleWorldCenter(board, zoom) {
    const safeZoom = Math.max(0.001, Number(zoom) || 0.001);
    return {
      x: (board.scrollLeft + board.clientWidth / 2) / safeZoom,
      y: (board.scrollTop + board.clientHeight / 2) / safeZoom
    };
  }

  function imageAspectRatio(model) {
    const stored = Number(model?.aspectRatio);
    const naturalWidth = Number(model?.naturalWidth);
    const naturalHeight = Number(model?.naturalHeight);
    const natural = naturalWidth > 0 && naturalHeight > 0 ? naturalWidth / naturalHeight : NaN;
    const ratio = Number.isFinite(stored) && stored > 0 ? stored : natural;
    return Math.max(0.05, Math.min(20, Number.isFinite(ratio) && ratio > 0 ? ratio : 1));
  }

  // P1.7.9.49-M2.5.1: paveikslėlio proporcija yra autoritetinga. Ankstesnis modelis
  // plotį ir aukštį laikė atskiromis board.width / board.height proporcijomis, todėl
  // augant lentos aukščiui paveikslėlio DOM dėžutė išsitampydavo, o object-fit:contain
  // parodydavo dirbtines paraštes. Dabar plotis lieka modelio dydžio atrama, o aukštis
  // visada išvedamas iš tikro aspectRatio.
  function imagePixelSize(model, boardRect, options = {}) {
    const boardWidth = Math.max(1, Number(boardRect?.width) || 1);
    const boardHeight = Math.max(1, Number(boardRect?.height) || 1);
    const ratio = imageAspectRatio(model);
    const minWidth = Math.max(1, Number(options.minWidth) || 110);
    const minHeight = Math.max(1, Number(options.minHeight) || 80);
    const minimumWidthForRatio = Math.max(minWidth, minHeight * ratio);
    const maximumWidthForBoard = Math.max(1, Math.min(boardWidth, boardHeight * ratio));
    const storedWidth = Number(model?.width) * boardWidth;
    const storedHeight = Number(model?.height) * boardHeight;
    const preferredWidth = Number.isFinite(storedWidth) && storedWidth > 0
      ? storedWidth
      : (Number.isFinite(storedHeight) && storedHeight > 0 ? storedHeight * ratio : minimumWidthForRatio);
    const effectiveMinimum = Math.min(minimumWidthForRatio, maximumWidthForBoard);
    const width = Math.max(effectiveMinimum, Math.min(maximumWidthForBoard, preferredWidth));
    return { width, height: width / ratio, aspectRatio: ratio };
  }

  function makeDraggable(element, model, handle, options = {}) {
    let drag = null;
    handle.addEventListener('pointerdown', event => {
      const state = options.getState?.();
      if (state?.practiceOnly?.active) return;
      if (state?.activeTool !== 'select' && !options.alwaysAllow) return;
      if (options.requireInactiveEditor && document.activeElement === element) return;
      if (!options.requireInactiveEditor) event.preventDefault();
      drag = { startX: event.clientX, startY: event.clientY, left: element.offsetLeft, top: element.offsetTop };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!drag) return;
      const boardRect = options.getWorldRect();
      const zoom = options.getZoom();
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
      options.scheduleSave?.();
    });
    handle.addEventListener('pointercancel', () => { drag = null; });
  }

  function makeImageResizable(element, model, handle, options = {}) {
    let resize = null;
    handle.addEventListener('pointerdown', event => {
      const state = options.getState?.();
      if (state?.practiceOnly?.active) return;
      event.preventDefault();
      event.stopPropagation();
      const boardRect = options.getWorldRect();
      resize = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        width: element.offsetWidth,
        height: element.offsetHeight,
        maxWidth: boardRect.width - element.offsetLeft,
        maxHeight: boardRect.height - element.offsetTop
      };
      handle.setPointerCapture(event.pointerId);
    });
    handle.addEventListener('pointermove', event => {
      if (!resize || event.pointerId !== resize.pointerId) return;
      const zoom = Math.max(0.001, options.getZoom());
      const dx = (event.clientX - resize.startX) / zoom;
      const dy = (event.clientY - resize.startY) / zoom;
      const denom = resize.width * resize.width + resize.height * resize.height;
      let scale = 1 + ((dx * resize.width + dy * resize.height) / Math.max(1, denom));
      const minScale = Math.max(110 / resize.width, 80 / resize.height);
      const maxScale = Math.min(resize.maxWidth / resize.width, resize.maxHeight / resize.height);
      scale = Math.max(minScale, Math.min(maxScale, scale));
      const width = resize.width * scale;
      const height = resize.height * scale;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      const boardRect = options.getWorldRect();
      model.width = boardRect.width ? width / boardRect.width : model.width;
      model.height = boardRect.height ? height / boardRect.height : model.height;
    });
    const finish = () => {
      if (!resize) return;
      const pointerId = resize.pointerId;
      resize = null;
      try { handle.releasePointerCapture(pointerId); } catch (_) {}
      options.scheduleSave?.();
    };
    handle.addEventListener('pointerup', finish);
    handle.addEventListener('pointercancel', finish);
  }

  function layoutObjects(options = {}) {
    const state = options.state;
    const objectsLayer = options.objectsLayer;
    const boardRect = options.boardRect;
    if (!state || !objectsLayer || !boardRect?.width || !boardRect?.height) return;

    for (const note of state.notes) {
      const element = objectsLayer.querySelector(`[data-note-id="${note.id}"]`);
      if (!element) continue;
      const editor = element.querySelector('.mixed-editor-content');
      const minWidth = options.mixedNoteContentMinimumWidth(editor);
      element.style.setProperty('--mixed-note-content-min-width', `${minWidth}px`);
      const width = Math.min(boardRect.width, Math.max(minWidth, Math.min(900, note.width || element.offsetWidth || 420)));
      element.style.width = `${width}px`;
      element.style.minHeight = '44px';
      const left = Math.max(0, Math.min(boardRect.width - width, note.x * boardRect.width));
      const top = Math.max(0, Math.min(boardRect.height - element.offsetHeight, note.y * boardRect.height));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.maxWidth = `${Math.max(1, Math.min(900, boardRect.width - left))}px`;
      note.x = boardRect.width ? left / boardRect.width : note.x;
      note.y = boardRect.height ? top / boardRect.height : note.y;
    }

    for (const imageModel of state.boardImages) {
      const element = objectsLayer.querySelector(`[data-board-image-id="${CSS.escape(String(imageModel.id))}"]`);
      if (!element) continue;
      const size = imagePixelSize(imageModel, boardRect);
      const width = size.width;
      const height = size.height;
      const left = Math.max(0, Math.min(boardRect.width - width, imageModel.x * boardRect.width));
      const top = Math.max(0, Math.min(boardRect.height - height, imageModel.y * boardRect.height));
      element.style.left = `${left}px`;
      element.style.top = `${top}px`;
      element.style.width = `${width}px`;
      element.style.height = `${height}px`;
      element.style.aspectRatio = `${size.aspectRatio}`;
      imageModel.aspectRatio = size.aspectRatio;
      imageModel.x = boardRect.width ? left / boardRect.width : imageModel.x;
      imageModel.y = boardRect.height ? top / boardRect.height : imageModel.y;
      imageModel.width = boardRect.width ? width / boardRect.width : imageModel.width;
      imageModel.height = boardRect.height ? height / boardRect.height : imageModel.height;
    }

    for (const instance of state.boardPractices) {
      const element = objectsLayer.querySelector(`[data-board-practice-id="${instance.id}"]`);
      if (!element) continue;
      const rect = options.boardPracticePixelRect(instance, boardRect);
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
      options.applyPracticePageScale(element, instance);
    }

    for (const instance of state.boardTasks) {
      const element = objectsLayer.querySelector(`[data-board-task-id="${instance.id}"]`);
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

  window.P772BoardObjects = Object.freeze({
    normalizeSelection,
    getElement,
    updateSelectionUi,
    visibleWorldCenter,
    imageAspectRatio,
    imagePixelSize,
    makeDraggable,
    makeImageResizable,
    layoutObjects
  });
})();
