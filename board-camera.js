(() => {
  'use strict';

  // P1.7.9.49-M2.2: lentos kameros / mastelio branduolys.
  // Šis failas sąmoningai neturi Firebase, piešimo ar objektų duomenų logikos.
  // Jis gauna būseną, DOM nuorodas ir perpiešimo callback'us iš app.js.

  function clampCameraZoom(value) {
    return Math.max(0.005, Math.min(1.8, Number(value) || 1));
  }

  function normalizeCamera(camera, config = {}) {
    const minWidth = Number(config.worldMinWidth) || 720;
    const minHeight = Number(config.worldMinHeight) || 1700;
    const maxWidth = Number(config.worldMaxWidth) || 30000;
    const maxHeight = Number(config.worldMaxHeight) || 2000000;
    const defaultWidth = Number(config.worldDefaultWidth) || 720;
    const defaultHeight = Number(config.worldDefaultHeight) || 10000;
    return {
      zoom: clampCameraZoom(camera?.zoom),
      scrollLeft: Math.max(0, Number(camera?.scrollLeft) || 0),
      scrollTop: Math.max(0, Number(camera?.scrollTop) || 0),
      worldWidth: Math.max(minWidth, Math.min(maxWidth, Number(camera?.worldWidth) || defaultWidth)),
      worldHeight: Math.max(minHeight, Math.min(maxHeight, Number(camera?.worldHeight) || defaultHeight)),
      worldOriginX: Math.max(0, Number(camera?.worldOriginX) || 0),
      worldOriginY: Math.max(0, Number(camera?.worldOriginY) || 0),
      layoutMode: 'vertical-strip'
    };
  }

  function getWorldRect(camera, config = {}) {
    const normalized = normalizeCamera(camera || {}, config);
    return {
      width: normalized.worldWidth,
      height: normalized.worldHeight,
      left: 0,
      top: 0,
      right: normalized.worldWidth,
      bottom: normalized.worldHeight
    };
  }

  function currentZoom(camera) {
    return clampCameraZoom(camera?.zoom);
  }

  function usesLegacyReadableScale(camera, config = {}) {
    const world = getWorldRect(camera, config);
    const defaultWidth = Number(config.worldDefaultWidth) || 720;
    return world.width > defaultWidth + 1;
  }

  function user100Zoom(camera, config = {}) {
    const legacyZoom = Number(config.legacyUser100Zoom) || (1 / 3);
    return usesLegacyReadableScale(camera, config) ? legacyZoom : 1;
  }

  function zoomForUserPercent(camera, percent, config = {}) {
    const normalized = Math.max(1, Math.min(180, Number(percent) || 100));
    return clampCameraZoom(user100Zoom(camera, config) * normalized / 100);
  }

  function fitZoom(camera, viewportWidth, config = {}) {
    const world = getWorldRect(camera, config);
    const width = Math.max(1, Number(viewportWidth) || 1);
    const margin = Math.max(0, Number(config.fitSideMarginScreen) || 0);
    const availableWidth = Math.max(1, width - margin * 2);
    return clampCameraZoom(Math.min(1, availableWidth / Math.max(1, world.width)));
  }

  function legacyContentFitZoom(camera, bounds, viewportWidth, config = {}) {
    const width = Math.max(1, Number(viewportWidth) || 1);
    const naturalZoom = user100Zoom(camera, config);
    if (!bounds) return naturalZoom;
    const contentWidth = Math.max(1, Number(bounds.maxX) - Number(bounds.minX));
    if (contentWidth * naturalZoom <= width + 0.5) return naturalZoom;
    const padding = Math.max(0, Number(config.legacyFitPaddingX) || 28);
    const availableWidth = Math.max(1, width - padding * 2);
    return clampCameraZoom(Math.min(naturalZoom, availableWidth / contentWidth));
  }

  function initialFitZoom(camera, bounds, viewportWidth, config = {}) {
    if (usesLegacyReadableScale(camera, config)) return legacyContentFitZoom(camera, bounds, viewportWidth, config);
    return Math.min(user100Zoom(camera, config), fitZoom(camera, viewportWidth, config));
  }

  function userZoomPercent(camera, actualZoom = currentZoom(camera), config = {}) {
    const baseZoom = Math.max(0.001, user100Zoom(camera, config));
    return Math.max(1, Math.round((clampCameraZoom(actualZoom) / baseZoom) * 100));
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

  function geometrySnapshot(camera, config = {}) {
    const normalized = normalizeCamera(camera || {}, config);
    return {
      schemaVersion: 2,
      layoutMode: 'vertical-strip',
      worldWidth: normalized.worldWidth,
      worldHeight: normalized.worldHeight,
      worldOriginX: normalized.worldOriginX,
      worldOriginY: normalized.worldOriginY
    };
  }

  function horizontalCenterOffsetScreen(camera, refs, zoom = currentZoom(camera), world = getWorldRect(camera, {}), config = {}) {
    if (!refs?.board) return 0;
    const viewportWidth = Math.max(1, refs.board.clientWidth);
    const renderedWidth = Math.max(1, world.width * Math.max(0.001, zoom));
    return Math.max(0, (viewportWidth - renderedWidth) / 2);
  }

  function applyCamera(context, options = {}) {
    const { refs, config = {}, callbacks = {} } = context || {};
    const state = context?.getState?.();
    if (!state || !refs?.board || !refs?.boardWorld || !refs?.boardStage) return;

    state.camera = normalizeCamera(state.camera, config);
    const oldZoom = Number(options.oldZoom) || currentZoom(state.camera);
    const zoom = currentZoom(state.camera);
    const viewportWidth = Math.max(1, refs.board.clientWidth);
    const viewportHeight = Math.max(1, refs.board.clientHeight);
    let anchorWorldX = null;
    let anchorWorldY = null;
    let anchorViewportX = null;
    let anchorViewportY = null;

    const world = getWorldRect(state.camera, config);
    const oldCenterOffsetX = horizontalCenterOffsetScreen(state.camera, refs, oldZoom, world, config);
    if (options.anchorViewportX !== undefined && options.anchorViewportY !== undefined) {
      anchorViewportX = Number(options.anchorViewportX) || 0;
      anchorViewportY = Number(options.anchorViewportY) || 0;
      anchorWorldX = (refs.board.scrollLeft + anchorViewportX - oldCenterOffsetX) / Math.max(0.001, oldZoom);
      anchorWorldY = (refs.board.scrollTop + anchorViewportY) / Math.max(0.001, oldZoom);
    } else if (options.preserveCenter) {
      anchorViewportX = viewportWidth / 2;
      anchorViewportY = viewportHeight / 2;
      anchorWorldX = (refs.board.scrollLeft + anchorViewportX - oldCenterOffsetX) / Math.max(0.001, oldZoom);
      anchorWorldY = (refs.board.scrollTop + anchorViewportY) / Math.max(0.001, oldZoom);
    }

    refs.boardWorld.style.width = `${world.width}px`;
    refs.boardWorld.style.height = `${world.height}px`;
    callbacks.applyGrid?.(refs.boardWorld, state.camera, world);
    const useLayoutZoom = Boolean(window.CSS?.supports?.('zoom', '1'));
    refs.boardWorld.dataset.cameraScaleMode = useLayoutZoom ? 'layout-zoom' : 'transform';
    refs.boardWorld.style.zoom = useLayoutZoom ? String(zoom) : '';
    refs.boardWorld.style.transform = useLayoutZoom ? 'none' : `scale(${zoom})`;
    const renderedWorldWidth = Math.round(world.width * zoom);
    const centerOffsetX = horizontalCenterOffsetScreen(state.camera, refs, zoom, world, config);
    refs.boardWorld.style.left = `${useLayoutZoom ? centerOffsetX / Math.max(0.001, zoom) : centerOffsetX}px`;
    refs.boardStage.style.width = `${Math.max(viewportWidth, renderedWorldWidth)}px`;
    refs.boardStage.style.height = `${Math.max(viewportHeight, Math.round(world.height * zoom))}px`;
    if (refs.boardZoomLabel) refs.boardZoomLabel.textContent = `${userZoomPercent(state.camera, zoom, config)} %`;

    callbacks.setApplying?.(true);
    requestAnimationFrame(() => {
      if (anchorWorldX !== null && anchorWorldY !== null) {
        refs.board.scrollLeft = Math.max(0, anchorWorldX * zoom + centerOffsetX - anchorViewportX);
        refs.board.scrollTop = Math.max(0, anchorWorldY * zoom - anchorViewportY);
      } else if (options.restoreScroll) {
        refs.board.scrollLeft = Math.max(0, Number(state.camera.scrollLeft) || 0);
        refs.board.scrollTop = Math.max(0, Number(state.camera.scrollTop) || 0);
      }
      state.camera.scrollLeft = refs.board.scrollLeft;
      state.camera.scrollTop = refs.board.scrollTop;
      callbacks.setApplying?.(false);
      callbacks.resizeCanvas?.({ force: true });
      callbacks.layoutBoardObjects?.();
      callbacks.refreshMathFieldRendering?.(refs.boardWorld);
      if (state.practiceOnly?.active) callbacks.refreshMathFieldRendering?.(refs.practiceOnlyHost);
    });
  }

  window.P772BoardCamera = Object.freeze({
    clampCameraZoom,
    normalizeCamera,
    getWorldRect,
    currentZoom,
    usesLegacyReadableScale,
    user100Zoom,
    zoomForUserPercent,
    fitZoom,
    legacyContentFitZoom,
    initialFitZoom,
    userZoomPercent,
    strokeWorldWidth,
    strokeRenderWorldWidth,
    geometrySnapshot,
    horizontalCenterOffsetScreen,
    applyCamera
  });
})();
