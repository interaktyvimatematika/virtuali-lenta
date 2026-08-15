(() => {
  'use strict';

  function createController(options = {}) {
    const refs = options.refs || {};
    const getState = typeof options.getState === 'function' ? options.getState : () => ({});
    const getOnlineAccessRole = typeof options.getOnlineAccessRole === 'function' ? options.getOnlineAccessRole : () => 'teacher';
    const getWorldRect = options.getWorldRect;
    const getZoom = options.getZoom;
    const scheduleSave = options.scheduleSave;
    const setActiveBoardPractice = options.setActiveBoardPractice;
    const setActiveBoardObject = options.setActiveBoardObject;
    const clearActiveBoardObject = options.clearActiveBoardObject;
    const revealPrimaryPracticeWindow = options.revealPrimaryPracticeWindow;
    const practicePagePixelSize = options.practicePagePixelSize;
    const practiceLayoutMode = options.practiceLayoutMode;
    const practiceFreeLayoutIssues = options.practiceFreeLayoutIssues;
    const refreshMathFieldRendering = options.refreshMathFieldRendering;
    const autoPaginatePracticeInstance = options.autoPaginatePracticeInstance;
    const renderBoardObjects = options.renderBoardObjects;
    const clampNumber = options.clampNumber;
    const resetPracticeFreeLayout = options.resetPracticeFreeLayout;
    const setPracticeLayoutMode = options.setPracticeLayoutMode;
    const practiceColumnCount = options.practiceColumnCount;
    const win = options.window || window;
    const doc = options.document || document;

    function state() {
      return getState() || {};
    }

    function makeBoardTaskResizable(element, model, handle) {
      let resize = null;
      handle.addEventListener('pointerdown', event => {
        if (state().activeTool !== 'select' || model.collapsed || state().practiceOnly?.active) return;
        event.preventDefault(); event.stopPropagation();
        const boardRect = getWorldRect();
        resize = {
          pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
          width: element.offsetWidth, height: element.offsetHeight,
          maxWidth: boardRect.width - element.offsetLeft, maxHeight: boardRect.height - element.offsetTop
        };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove', event => {
        if (!resize || event.pointerId !== resize.pointerId) return;
        const zoom = getZoom();
        const width = Math.max(330, Math.min(resize.maxWidth, resize.width + (event.clientX - resize.startX) / zoom));
        const height = Math.max(300, Math.min(resize.maxHeight, resize.height + (event.clientY - resize.startY) / zoom));
        element.style.width = `${width}px`; element.style.height = `${height}px`;
        const boardRect = getWorldRect();
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
        if (model.collapsed || state().practiceOnly?.active) return;
        event.preventDefault(); event.stopPropagation();
        setActiveBoardPractice(model.id, { save: false });
        const boardRect = getWorldRect();
        resize = {
          pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
          width: element.offsetWidth, height: element.offsetHeight,
          maxWidth: boardRect.width - element.offsetLeft, maxHeight: boardRect.height - element.offsetTop
        };
        handle.setPointerCapture(event.pointerId);
      });
      handle.addEventListener('pointermove', event => {
        if (!resize || event.pointerId !== resize.pointerId) return;
        const zoom = getZoom();
        const minWidth = model.kind === 'external-module' ? 520 : 470;
        const width = Math.max(minWidth, Math.min(resize.maxWidth, resize.width + (event.clientX - resize.startX) / zoom));
        const height = Math.max(560, Math.min(resize.maxHeight, resize.height + (event.clientY - resize.startY) / zoom));
        element.style.width = `${width}px`;
        element.style.height = `${height}px`;
        applyPracticePageScale(element, model);
        const boardRect = getWorldRect();
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
        shell.dispatchEvent(new win.CustomEvent('practice-layout-change', { bubbles: true }));
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
      const content = object?.querySelector('.practice-page-content');
      const badge = object?.querySelector('.practice-page-layout-warning');
      if (!content || !badge) return;
      const mode = practiceLayoutMode(instance);
      let visibleWarning = false;
      let warningText = 'Šio puslapio turinys netelpa';
      if (mode === 'free') {
        const issues = practiceFreeLayoutIssues(instance, instance.activePageIndex);
        visibleWarning = state().mode === 'teacher' && (issues.overflow || issues.overlap);
        if (issues.overflow && issues.overlap) warningText = 'Objektai persidengia ir išeina už puslapio';
        else if (issues.overlap) warningText = 'Kai kurie užduočių blokai persidengia';
        else if (issues.overflow) warningText = 'Kai kurie blokai išeina už puslapio';
      } else {
        const overflowing = content.scrollHeight > content.clientHeight + 2;
        visibleWarning = overflowing && state().mode === 'teacher';
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
      const useLayoutZoom = Boolean(win.CSS?.supports?.('zoom', '1'));
      sheet.dataset.pageScaleMode = useLayoutZoom ? 'layout-zoom' : 'transform';
      sheet.style.zoom = useLayoutZoom ? String(scale) : '';
      sheet.style.transform = useLayoutZoom ? 'none' : `scale(${scale})`;
      stage.style.width = `${Math.round(pageSize.width * scale)}px`;
      stage.style.height = `${Math.round(pageSize.height * scale)}px`;
      stage.dataset.scale = String(scale);
      stage.classList.toggle('is-centered', stage.offsetWidth < viewport.clientWidth - 8);
      win.requestAnimationFrame(() => {
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
      const bar = doc.createElement('div');
      bar.className = 'practice-layout-editor-bar';
      bar.addEventListener('pointerdown', event => event.stopPropagation());
      const label = doc.createElement('span');
      label.className = 'practice-layout-editor-label';
      label.textContent = 'Puslapio maketas';
      const modes = doc.createElement('div');
      modes.className = 'practice-layout-mode-switch';
      const currentMode = practiceLayoutMode(instance);
      [
        ['flow', 'Srautas'],
        ['columns', 'Stulpeliai'],
        ['free', 'Laisvas']
      ].forEach(([value, caption]) => {
        const button = doc.createElement('button');
        button.type = 'button';
        button.textContent = caption;
        button.classList.toggle('is-active', currentMode === value);
        button.addEventListener('click', () => setPracticeLayoutMode(instance, value));
        modes.appendChild(button);
      });
      bar.append(label, modes);

      if (currentMode === 'columns') {
        const columns = doc.createElement('select');
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

      const reset = doc.createElement('button');
      reset.type = 'button';
      reset.className = 'practice-layout-reset';
      reset.textContent = currentMode === 'free' ? 'Išdėstyti iš naujo' : 'Perskaičiuoti';
      reset.addEventListener('click', () => {
        if (currentMode === 'free') resetPracticeFreeLayout(instance);
        else autoPaginatePracticeInstance(instance, { preserveActive: true });
        renderBoardObjects();
        scheduleSave();
      });
      const help = doc.createElement('span');
      help.className = 'practice-layout-editor-help';
      help.textContent = currentMode === 'free'
        ? 'Tempk už ⠿, dydį keisk apatiniame kampe.'
        : currentMode === 'columns'
          ? 'Užduotys paskirstomos į pasirinkto skaičiaus stulpelius.'
          : 'Užduotys dedamos viena po kitos.';
      bar.append(reset, help);
      return bar;
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

    function initializePracticeWindow() {
      const current = state();
      refs.practiceWindow.hidden = Boolean(current.window.shelved);
      refs.practiceWindow.classList.toggle('is-student-practice', current.mode === 'student');
      refs.practiceWindow.classList.toggle('is-authoring', current.mode === 'teacher');
      const boardRect = getWorldRect();
      if (current.window.width && current.window.height && current.window.x !== null && current.window.y !== null) {
        refs.practiceWindow.style.transform = 'none';
        refs.practiceWindow.style.left = `${current.window.x * boardRect.width}px`;
        refs.practiceWindow.style.top = `${current.window.y * boardRect.height}px`;
        refs.practiceWindow.style.width = `${Math.min(1180, Math.max(360, current.window.width * boardRect.width))}px`;
        refs.practiceWindow.style.height = `${Math.min(920, Math.max(450, current.window.height * boardRect.height))}px`;
      } else {
        refs.practiceWindow.style.transform = 'none';
        refs.practiceWindow.style.left = '24px';
        refs.practiceWindow.style.top = '24px';
        refs.practiceWindow.style.width = '650px';
        refs.practiceWindow.style.height = '730px';
      }
      refs.practiceWindow.classList.toggle('is-collapsed', Boolean(current.window.collapsed));
      refs.collapseButton.textContent = current.window.collapsed ? '+' : '—';
      clampWindowToBoard();
    }

    function saveWindowGeometry() {
      const current = state();
      if (current.window.shelved) { scheduleSave(); return; }
      const boardRect = getWorldRect();
      if (!boardRect.width || !boardRect.height) return;
      current.window.x = refs.practiceWindow.offsetLeft / boardRect.width;
      current.window.y = refs.practiceWindow.offsetTop / boardRect.height;
      current.window.width = refs.practiceWindow.offsetWidth / boardRect.width;
      current.window.height = refs.practiceWindow.offsetHeight / boardRect.height;
      scheduleSave();
    }

    function clampWindowToBoard() {
      const current = state();
      if (current.window.shelved) return;
      const boardRect = getWorldRect();
      if (!boardRect.width) return;
      refs.practiceWindow.style.transform = 'none';
      const currentWidth = refs.practiceWindow.offsetWidth || 650;
      const currentHeight = refs.practiceWindow.offsetHeight || 730;
      const width = Math.min(Math.max(320, currentWidth), Math.min(1180, boardRect.width));
      const height = current.window.collapsed ? currentHeight : Math.min(Math.max(410, currentHeight), Math.min(920, boardRect.height));
      const left = Math.max(0, Math.min(boardRect.width - width, refs.practiceWindow.offsetLeft || 0));
      const top = Math.max(0, Math.min(boardRect.height - height, refs.practiceWindow.offsetTop || 0));
      refs.practiceWindow.style.left = `${left}px`;
      refs.practiceWindow.style.top = `${top}px`;
      refs.practiceWindow.style.width = `${width}px`;
      if (!current.window.collapsed) refs.practiceWindow.style.height = `${height}px`;
      saveWindowGeometry();
    }

    function centerPracticeWindow() {
      revealPrimaryPracticeWindow();
      const current = state();
      const boardRect = getWorldRect();
      const preferredWidth = current.mode === 'teacher' ? 1080 : 650;
      const preferredHeight = current.mode === 'teacher' ? 790 : 720;
      const width = Math.min(preferredWidth, boardRect.width - 36);
      const height = Math.min(preferredHeight, boardRect.height - 36);
      refs.practiceWindow.style.transform = 'none';
      refs.practiceWindow.style.width = `${width}px`;
      refs.practiceWindow.style.height = `${height}px`;
      const left = current.mode === 'teacher' ? Math.max(18, (boardRect.width - width) / 2) : 24;
      const top = current.mode === 'teacher' ? Math.max(18, (boardRect.height - height) / 2) : 24;
      refs.practiceWindow.style.left = `${left}px`;
      refs.practiceWindow.style.top = `${top}px`;
      if (current.window.collapsed) {
        current.window.collapsed = false;
        refs.practiceWindow.classList.remove('is-collapsed');
        refs.collapseButton.textContent = '—';
      }
      saveWindowGeometry();
    }

    function installWindowDrag() {
      let drag = null;
      refs.dragHandle.addEventListener('pointerdown', event => {
        if (getOnlineAccessRole() !== 'teacher' || event.target.closest('button') || state().practiceOnly?.active) return;
        event.preventDefault();
        drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: refs.practiceWindow.offsetLeft, top: refs.practiceWindow.offsetTop };
        refs.dragHandle.setPointerCapture(event.pointerId);
      });
      refs.dragHandle.addEventListener('pointermove', event => {
        if (!drag || event.pointerId !== drag.pointerId) return;
        const boardRect = getWorldRect();
        const zoom = getZoom();
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
        if (getOnlineAccessRole() !== 'teacher' || state().practiceOnly?.active) return;
        event.preventDefault();
        event.stopPropagation();
        const boardRect = getWorldRect();
        resize = {
          pointerId: event.pointerId, startX: event.clientX, startY: event.clientY,
          width: refs.practiceWindow.offsetWidth, height: refs.practiceWindow.offsetHeight,
          maxWidth: boardRect.width - refs.practiceWindow.offsetLeft, maxHeight: boardRect.height - refs.practiceWindow.offsetTop
        };
        refs.resizeHandle.setPointerCapture(event.pointerId);
      });
      refs.resizeHandle.addEventListener('pointermove', event => {
        if (!resize || event.pointerId !== resize.pointerId) return;
        const zoom = getZoom();
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

    return Object.freeze({
      makeBoardTaskResizable,
      makeBoardPracticeResizable,
      ensureElementVisibleInScroller,
      makePracticeAnswerAreaResizable,
      practicePageScaleForViewport,
      updatePracticePageOverflowState,
      applyPracticePageScale,
      makePracticeTaskFreeDraggable,
      makePracticeTaskFreeResizable,
      createPracticeLayoutEditorBar,
      setPracticeObjectSelected,
      installPracticeObjectSelection,
      initializePracticeWindow,
      saveWindowGeometry,
      clampWindowToBoard,
      centerPracticeWindow,
      installWindowDrag,
      installWindowResize
    });
  }

  window.P772BoardPracticeUI = Object.freeze({ version: 'P1.7.9.49-M2.12', createController });
})();
