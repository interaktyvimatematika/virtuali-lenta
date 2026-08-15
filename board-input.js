(() => {
  'use strict';

  // P1.7.9.49-M2.4: pointer koordinačių ir aktyvaus piešimo seanso valdymas.
  // Modulis sąmoningai nekeičia P1.7.9.19 koordinačių matematikos ir M2.3
  // rasterizavimo logikos — app.js pateikia tik siaurus state / canvas adapterius.

  function createController(options = {}) {
    const refs = options.refs || {};
    const BoardDrawing = options.BoardDrawing;
    if (!refs.board || !refs.canvas) throw new Error('BoardInput: trūksta board/canvas nuorodų');
    if (!BoardDrawing) throw new Error('BoardInput: BoardDrawing modulis neįkeltas');

    let drawingActive = false;
    let activeStroke = null;

    function emitDiagnostic(type, detail = {}, throttleMs = 0) {
      try { options.emitBoardDiagnostic?.(type, detail, throttleMs); } catch (_) { /* diagnostika negali trukdyti lentai */ }
    }

    // P1.7.9.19: pieštuko koordinatės skaičiuojamos iš pačios lentos kameros,
    // o ne iš slankiojančio viewport canvas stačiakampio. Viewport canvas gali būti
    // perstatomas po scroll / resize / split pokyčio; jei tuo pat metu tęsiamas
    // pointer brūkšnys, jo DOM rect ir canvasViewport akimirkai gali nesutapti.
    // Kamera + board scroller yra vienintelis stabilus koordinačių šaltinis.
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
      if (!Number.isFinite(clientX) || !Number.isFinite(clientY)) {
        emitDiagnostic('pointer-invalid-client-coordinates', { clientX, clientY }, 1500);
        return null;
      }

      // clientLeft/clientTop pašalina scrollerio rėmelį; scrollLeft/scrollTop
      // grąžina ekraninę poziciją į mastelio turinio koordinates.
      const viewportX = clientX - boardRect.left - (refs.board.clientLeft || 0);
      const viewportY = clientY - boardRect.top - (refs.board.clientTop || 0);
      const worldX = (refs.board.scrollLeft + viewportX - centerOffsetX) / zoom;
      const worldY = (refs.board.scrollTop + viewportY) / zoom;

      const normalizedX = worldX / Math.max(1, world.width);
      const normalizedY = worldY / Math.max(1, world.height);
      if (normalizedX < -0.02 || normalizedX > 1.02 || normalizedY < -0.02 || normalizedY > 1.02) {
        emitDiagnostic('pointer-outside-world', {
          pointerType: String(event?.pointerType || ''),
          clientX: Math.round(clientX), clientY: Math.round(clientY),
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
      // CustomEvent apdorojamas sinchroniškai. Nekopijuojame viso augančio points masyvo
      // per kiekvieną pointermove; online sluoksnis kopiją pasidaro tik realiai siųsdamas.
      window.dispatchEvent(new CustomEvent('p772:live-stroke', {
        detail: { phase, stroke }
      }));
    }

    function startDrawing(event) {
      const activeTool = options.getActiveTool();
      if (!['pen', 'eraser'].includes(activeTool)) return;
      event.preventDefault();
      if (!options.ensureCanvasReadyForDrawing()) return;
      const startPoint = pointFromEvent(event);
      if (!startPoint) {
        options.scheduleCanvasViewportRefresh?.({ force: true });
        return;
      }
      refs.canvas.setPointerCapture(event.pointerId);
      drawingActive = true;
      activeStroke = BoardDrawing.createStroke({
        tool: activeTool,
        point: startPoint,
        onlineRole: options.getOnlineRole?.()
      });
      // Svarbu našumui: pradėdami naują brūkšnį nebeperpiešiame visų senų taškų.
      options.drawStrokePoint(options.getDrawingContext(), activeStroke, activeStroke.points[0]);
      emitLiveStroke('start');
    }

    function continueDrawing(event) {
      if (!drawingActive || !activeStroke) return;
      event.preventDefault();
      const previousPoint = activeStroke.points[activeStroke.points.length - 1];
      const nextPoint = pointFromEvent(event);
      if (!nextPoint) return;
      const pointerJump = BoardDrawing.pointerJump(previousPoint, nextPoint);
      if (pointerJump > 0.12) {
        emitDiagnostic('pointer-coordinate-jump', {
          pointerType: String(event?.pointerType || ''),
          jump: Math.round(pointerJump * 10000) / 10000,
          fromX: Math.round(previousPoint.x * 10000) / 10000,
          fromY: Math.round(previousPoint.y * 10000) / 10000,
          toX: Math.round(nextPoint.x * 10000) / 10000,
          toY: Math.round(nextPoint.y * 10000) / 10000
        }, 1200);
      }
      activeStroke.points.push(nextPoint);
      // Ankstesnė versija čia kiekvienam pointermove išvalydavo canvas ir iš naujo
      // perpiešdavo visą state.drawing. Ilgesnėje pamokoje tai tapdavo O(visos lentos)
      // darbu kiekvienam rašiklio judesiui, todėl linija pradėdavo vytis žymeklį.
      options.drawStrokeSegment(options.getDrawingContext(), activeStroke, previousPoint, nextPoint);
      emitLiveStroke('update');
    }

    function stopDrawing(event) {
      if (!drawingActive || !activeStroke) return;
      const committedStroke = activeStroke;
      drawingActive = false;
      activeStroke = null;
      options.commitStroke(committedStroke);
      // Pagrindiniame canvas brūkšnys jau nupieštas segmentais. Įdedame jį tik į
      // statinį cache, kad būsimi nuotoliniai atnaujinimai nereikalautų senų brūkšnių redraw.
      options.paintCommittedStroke(committedStroke);
      emitLiveStroke('end', committedStroke);
      try { refs.canvas.releasePointerCapture(event.pointerId); } catch (_) { /* nieko */ }
      options.scheduleSave({ notifyShared: options.shouldNotifyShared?.() ?? true });
    }

    function isDrawingActive() {
      return drawingActive;
    }

    function getActiveStroke() {
      return activeStroke;
    }

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

  window.P772BoardInput = Object.freeze({ createController });
})();
