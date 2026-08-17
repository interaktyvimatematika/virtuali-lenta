(() => {
  'use strict';

  // P3.2.7.10.9 — rašiklio taškų nepraradimas + darbinis 100 % = lapas per plotį.
  // Modulis sąmoningai uždedamas ant esamų BoardCamera / BoardInput API,
  // kad nereikėtų keisti kitų stabilios lentos modulių.
  const BaseCamera = window.P772BoardCamera;
  const BaseInput = window.P772BoardInput;
  if (!BaseCamera || !BaseInput) throw new Error('Board stylus/fit patch: baziniai lentos moduliai neįkelti');

  function fitZoom(camera, viewportWidth, config = {}) {
    const world = BaseCamera.getWorldRect(camera, config);
    const width = Math.max(1, Number(viewportWidth) || 1);
    const margin = Math.max(0, Number(config.fitSideMarginScreen) || 0);
    const availableWidth = Math.max(1, width - margin * 2);
    // Ankstesnis fit buvo apribotas iki 1, todėl 720 px lapas platesniame
    // viewport'e niekada nepadidėdavo ir šonuose likdavo pilka sritis.
    return BaseCamera.clampCameraZoom(availableWidth / Math.max(1, world.width));
  }

  function user100Zoom(camera, config = {}, viewportWidthOverride = null) {
    if (BaseCamera.usesLegacyReadableScale(camera, config)) {
      return BaseCamera.clampCameraZoom(Number(config.legacyUser100Zoom) || (1 / 3));
    }
    const resolver = config.modernUser100ZoomResolver;
    if (typeof resolver === 'function') {
      const resolved = Number(resolver(camera, viewportWidthOverride));
      if (Number.isFinite(resolved) && resolved > 0) return BaseCamera.clampCameraZoom(resolved);
    }
    if (Number.isFinite(Number(viewportWidthOverride)) && Number(viewportWidthOverride) > 0) {
      return fitZoom(camera, Number(viewportWidthOverride), config);
    }
    return BaseCamera.clampCameraZoom(1);
  }

  function zoomForUserPercent(camera, percent, config = {}, viewportWidthOverride = null) {
    const normalized = Math.max(1, Math.min(180, Number(percent) || 100));
    return BaseCamera.clampCameraZoom(user100Zoom(camera, config, viewportWidthOverride) * normalized / 100);
  }

  function initialFitZoom(camera, bounds, viewportWidth, config = {}) {
    if (BaseCamera.usesLegacyReadableScale(camera, config)) {
      return BaseCamera.legacyContentFitZoom(camera, bounds, viewportWidth, config);
    }
    return user100Zoom(camera, config, viewportWidth);
  }

  function userZoomPercent(camera, actualZoom = BaseCamera.currentZoom(camera), config = {}, viewportWidthOverride = null) {
    const baseZoom = Math.max(0.001, user100Zoom(camera, config, viewportWidthOverride));
    return Math.max(1, Math.round((BaseCamera.clampCameraZoom(actualZoom) / baseZoom) * 100));
  }

  function strokeWorldWidth(camera, strokeWidth, config = {}) {
    const width = Math.max(0.1, Number(strokeWidth) || 2.6);
    return width / Math.max(0.001, user100Zoom(camera, config));
  }

  function strokeRenderWorldWidth(camera, stroke, config = {}) {
    const fallback = stroke?.mode === 'eraser' ? 22 : 2.6;
    const width = Math.max(0.1, Number(stroke?.width) || fallback);
    if (stroke?.mode !== 'eraser') return strokeWorldWidth(camera, width, config);
    if (stroke?.widthModel === 'visual-v1') return strokeWorldWidth(camera, width, config);
    return width;
  }

  function applyCamera(context, options = {}) {
    BaseCamera.applyCamera(context, options);
    const refs = context?.refs;
    const state = context?.getState?.();
    if (refs?.boardZoomLabel && state?.camera) {
      refs.boardZoomLabel.textContent = `${userZoomPercent(
        state.camera,
        BaseCamera.currentZoom(state.camera),
        context?.config || {},
        refs.board?.clientWidth || null
      )} %`;
    }
  }

  window.P772BoardCamera = Object.freeze({
    ...BaseCamera,
    fitZoom,
    user100Zoom,
    zoomForUserPercent,
    initialFitZoom,
    userZoomPercent,
    strokeWorldWidth,
    strokeRenderWorldWidth,
    applyCamera
  });

  function createController(options = {}) {
    const refs = options.refs || {};
    const BoardDrawing = options.BoardDrawing;
    if (!refs.board || !refs.canvas) throw new Error('BoardInput: trūksta board/canvas nuorodų');
    if (!BoardDrawing) throw new Error('BoardInput: BoardDrawing modulis neįkeltas');

    let drawingActive = false;
    let activeStroke = null;
    let activePointerId = null;

    function emitDiagnostic(type, detail = {}, throttleMs = 0) {
      try { options.emitBoardDiagnostic?.(type, detail, throttleMs); } catch (_) { /* diagnostika negali trukdyti lentai */ }
    }

    function pointFromEvent(event) {
      if (!refs.board) return null;
      const world = options.getWorldRect();
      const zoom = Math.max(0.001, options.getZoom());
      const boardRect = refs.board.getBoundingClientRect();
      const viewportWidth = Math.max(1, refs.board.clientWidth);
      const viewportHeight = Math.max(1, refs.board.clientHeight);
      if (!(boardRect.width > 1 && boardRect.height > 1 && viewportWidth > 1 && viewportHeight > 1)) {
        emitDiagnostic('pointer-invalid-board-rect', { viewportWidth, viewportHeight, rectWidth: boardRect.width, rectHeight: boardRect.height }, 1500);
        return null;
      }
      const centerOffsetX = options.getHorizontalCenterOffsetScreen(zoom, world);
      const clientX = Number(event?.clientX);
      const clientY = Number(event?.clientY);
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) return null;
      const viewportX = clientX - boardRect.left - (refs.board.clientLeft || 0);
      const viewportY = clientY - boardRect.top - (refs.board.clientTop || 0);
      const worldX = (refs.board.scrollLeft + viewportX - centerOffsetX) / zoom;
      const worldY = (refs.board.scrollTop + viewportY) / zoom;
      const normalizedX = worldX / Math.max(1, world.width);
      const normalizedY = worldY / Math.max(1, world.height);
      if (normalizedX < -0.02 || normalizedX > 1.02 || normalizedY < -0.02 || normalizedY > 1.02) {
        emitDiagnostic('pointer-outside-world', {
          pointerType: String(event?.pointerType || ''),
          normalizedX: Math.round(normalizedX * 10000) / 10000,
          normalizedY: Math.round(normalizedY * 10000) / 10000
        }, 1200);
      }
      return {
        x: Math.max(0, Math.min(1, normalizedX)),
        y: Math.max(0, Math.min(1, normalizedY))
      };
    }

    function emitLiveStroke(phase, stroke = activeStroke) {
      if (!stroke) return;
      window.dispatchEvent(new CustomEvent('p772:live-stroke', { detail: { phase, stroke } }));
    }

    function pointerSamples(event) {
      const result = [];
      try {
        if (typeof event?.getCoalescedEvents === 'function') {
          const coalesced = event.getCoalescedEvents();
          if (Array.isArray(coalesced) && coalesced.length) result.push(...coalesced);
        }
      } catch (_) { /* fallback į patį event */ }
      // Kai kurios naršyklės į coalesced masyvą galutinio dispatch taško neįdeda.
      // Patį event visada pridedame; dublikatas žemiau bus atmestas pagal atstumą.
      result.push(event);
      return result.filter(Boolean);
    }

    function appendPointerSamples(event, { emitLive = true } = {}) {
      if (!drawingActive || !activeStroke) return 0;
      if (activePointerId !== null && event?.pointerId !== undefined && event.pointerId !== activePointerId) return 0;
      const samples = pointerSamples(event);
      let added = 0;
      for (const sample of samples) {
        if (activePointerId !== null && sample?.pointerId !== undefined && sample.pointerId !== activePointerId) continue;
        const previousPoint = activeStroke.points[activeStroke.points.length - 1];
        const nextPoint = pointFromEvent(sample);
        if (!nextPoint) continue;
        const distance = BoardDrawing.pointerJump(previousPoint, nextPoint);
        // Coalesced masyvas dažnai kartoja paskutinį dispatch tašką.
        if (distance < 1e-7) continue;
        if (distance > 0.12) {
          emitDiagnostic('pointer-coordinate-jump', {
            pointerType: String(event?.pointerType || ''),
            jump: Math.round(distance * 10000) / 10000,
            fromX: Math.round(previousPoint.x * 10000) / 10000,
            fromY: Math.round(previousPoint.y * 10000) / 10000,
            toX: Math.round(nextPoint.x * 10000) / 10000,
            toY: Math.round(nextPoint.y * 10000) / 10000
          }, 1200);
        }
        activeStroke.points.push(nextPoint);
        options.drawStrokeSegment(options.getDrawingContext(), activeStroke, previousPoint, nextPoint);
        added += 1;
      }
      if (samples.length > 1) {
        emitDiagnostic('pointer-coalesced-batch', {
          pointerType: String(event?.pointerType || ''),
          samples: samples.length,
          appended: added
        }, 2500);
      }
      if (added && emitLive) emitLiveStroke('update');
      return added;
    }

    function startDrawing(event) {
      const activeTool = options.getActiveTool();
      if (!['pen', 'eraser'].includes(activeTool) || drawingActive) return;
      event.preventDefault();
      if (!options.ensureCanvasReadyForDrawing()) return;
      const startPoint = pointFromEvent(event);
      if (!startPoint) {
        options.scheduleCanvasViewportRefresh?.({ force: true });
        return;
      }
      try { refs.canvas.setPointerCapture(event.pointerId); }
      catch (error) {
        emitDiagnostic('pointer-capture-failed', { pointerType: String(event?.pointerType || ''), message: String(error?.message || '') }, 1500);
      }
      drawingActive = true;
      activePointerId = event.pointerId ?? null;
      activeStroke = BoardDrawing.createStroke({
        tool: activeTool,
        point: startPoint,
        onlineRole: options.getOnlineRole?.()
      });
      options.drawStrokePoint(options.getDrawingContext(), activeStroke, activeStroke.points[0]);
      emitLiveStroke('start');
    }

    function continueDrawing(event) {
      if (!drawingActive || !activeStroke) return;
      if (activePointerId !== null && event?.pointerId !== undefined && event.pointerId !== activePointerId) return;
      event.preventDefault();
      appendPointerSamples(event);
    }

    function stopDrawing(event) {
      if (!drawingActive || !activeStroke) return;
      if (activePointerId !== null && event?.pointerId !== undefined && event.pointerId !== activePointerId) return;
      try { event?.preventDefault?.(); } catch (_) {}
      // Pointerup gali turėti paskutinį judesį, kuris niekada nepateko į pointermove.
      // pointercancel / lostpointercapture koordinatės nėra patikimas galinis taškas,
      // todėl juose tik išsaugome iki tol surinktą brūkšnį.
      if (event?.type === 'pointerup') appendPointerSamples(event, { emitLive: false });
      const committedStroke = activeStroke;
      const pointerId = activePointerId;
      drawingActive = false;
      activeStroke = null;
      activePointerId = null;
      options.commitStroke(committedStroke);
      options.paintCommittedStroke(committedStroke);
      emitLiveStroke('end', committedStroke);
      try {
        if (pointerId !== null && refs.canvas.hasPointerCapture?.(pointerId)) refs.canvas.releasePointerCapture(pointerId);
      } catch (_) { /* nieko */ }
      options.scheduleSave({ notifyShared: options.shouldNotifyShared?.() ?? true });
    }

    function isDrawingActive() { return drawingActive; }
    function getActiveStroke() { return activeStroke; }
    function remapActiveStroke(remap) {
      if (activeStroke && typeof remap === 'function') remap(activeStroke);
    }

    return Object.freeze({
      pointFromEvent,
      startDrawing,
      continueDrawing,
      stopDrawing,
      isDrawingActive,
      getActiveStroke,
      remapActiveStroke
    });
  }

  window.P772BoardInput = Object.freeze({ ...BaseInput, createController });
})();
