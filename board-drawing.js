(() => {
  'use strict';

  // P1.7.9.49-M2.3: lentos piešimo / trintuko atvaizdavimo branduolys.
  // Modulis sąmoningai nežino apie Firebase, Room, programos state ar pointer
  // koordinačių šaltinį. app.js perduoda jau normalizuotus taškus, pasaulio
  // stačiakampį ir istorinių lentų linijos pločio skaičiavimo callback'ą.

  function configureCanvasContext(context, backingScale, viewport) {
    if (!context || !viewport) return;
    context.setTransform(
      backingScale, 0, 0, backingScale,
      -viewport.left * backingScale, -viewport.top * backingScale
    );
    context.lineCap = 'round';
    context.lineJoin = 'round';
  }

  function clearPhysicalCanvas(context, canvas) {
    if (!context || !canvas) return;
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, canvas.width, canvas.height);
    context.restore();
  }

  function createStrokeId() {
    return `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }

  function penStrokeColor(onlineRole) {
    return String(onlineRole || '') === 'student' ? '#111111' : '#d22f3f';
  }

  function createStroke({ tool, point, onlineRole } = {}) {
    const mode = String(tool || '');
    if (!['pen', 'eraser'].includes(mode) || !point) return null;
    return {
      id: createStrokeId(),
      mode,
      width: mode === 'eraser' ? 22 : 2.6,
      ...(mode === 'eraser' ? { widthModel: 'visual-v1' } : {}),
      color: mode === 'pen' ? penStrokeColor(onlineRole) : undefined,
      points: [point]
    };
  }

  function strokeRenderColor(stroke) {
    return String(stroke?.color || '#27364f');
  }

  function renderWorldWidth(stroke, options = {}) {
    const resolver = options.strokeRenderWorldWidth;
    return typeof resolver === 'function' ? resolver(stroke) : Number(stroke?.width) || 1;
  }

  function drawStrokeSegment(context, stroke, fromPoint, toPoint, rect, options = {}) {
    if (!context || !stroke || !fromPoint || !toPoint || !rect) return;
    context.save();
    context.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = strokeRenderColor(stroke);
    context.lineWidth = renderWorldWidth(stroke, options);
    context.beginPath();
    context.moveTo(fromPoint.x * rect.width, fromPoint.y * rect.height);
    context.lineTo(toPoint.x * rect.width, toPoint.y * rect.height);
    context.stroke();
    context.restore();
  }

  function drawStrokePoint(context, stroke, point, rect, options = {}) {
    if (!point || !rect) return;
    const epsilon = 0.01 / Math.max(1, rect.width);
    drawStrokeSegment(context, stroke, point, { x: point.x + epsilon, y: point.y }, rect, options);
  }

  function drawStrokeToContext(context, stroke, rect, options = {}) {
    if (!context || !stroke?.points?.length || !rect) return;
    context.save();
    context.globalCompositeOperation = stroke.mode === 'eraser' ? 'destination-out' : 'source-over';
    context.strokeStyle = strokeRenderColor(stroke);
    context.lineWidth = renderWorldWidth(stroke, options);
    context.beginPath();
    stroke.points.forEach((point, index) => {
      const x = point.x * rect.width;
      const y = point.y * rect.height;
      if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
    });
    if (stroke.points.length === 1) {
      context.lineTo(stroke.points[0].x * rect.width + 0.01, stroke.points[0].y * rect.height + 0.01);
    }
    context.stroke();
    context.restore();
  }

  function rebuildCommittedCanvas(context, canvas, strokes, rect, options = {}) {
    if (!context || !canvas) return;
    clearPhysicalCanvas(context, canvas);
    for (const stroke of Array.isArray(strokes) ? strokes : []) {
      drawStrokeToContext(context, stroke, rect, options);
    }
  }

  function paintCommittedStroke(context, stroke, rect, options = {}) {
    if (!context) return;
    drawStrokeToContext(context, stroke, rect, options);
  }

  function redrawCanvas(context, canvas, committedCanvas, remoteLiveStrokes, activeStroke, rect, options = {}) {
    if (!context || !canvas) return;
    clearPhysicalCanvas(context, canvas);
    if (committedCanvas) {
      context.save();
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.drawImage(committedCanvas, 0, 0);
      context.restore();
    }
    for (const stroke of Array.isArray(remoteLiveStrokes) ? remoteLiveStrokes : []) {
      drawStrokeToContext(context, stroke, rect, options);
    }
    if (activeStroke) drawStrokeToContext(context, activeStroke, rect, options);
  }

  function pointerJump(fromPoint, toPoint) {
    if (!fromPoint || !toPoint) return 0;
    return Math.hypot(toPoint.x - fromPoint.x, toPoint.y - fromPoint.y);
  }

  window.P772BoardDrawing = Object.freeze({
    configureCanvasContext,
    clearPhysicalCanvas,
    createStrokeId,
    penStrokeColor,
    createStroke,
    strokeRenderColor,
    drawStrokeSegment,
    drawStrokePoint,
    drawStrokeToContext,
    rebuildCommittedCanvas,
    paintCommittedStroke,
    redrawCanvas,
    pointerJump
  });
})();
