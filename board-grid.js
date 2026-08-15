(() => {
  'use strict';

  // P1.7.9.49-M2.2: lentos tinklelio geometrijos / suderinamumo branduolys.
  // Pats CSS gradientas kol kas lieka styles.css; šis modulis valdo tik jo
  // geometrinius parametrus ir dabartinės / istorinės koordinačių skalės režimą.

  const CURRENT_GRID = Object.freeze({
    mode: 'current-720',
    major: 90,
    minor: 18,
    majorLine: 1.2,
    minorLine: 0.9
  });

  const LEGACY_GRID = Object.freeze({
    mode: 'legacy-2400',
    major: 270,
    minor: 54,
    majorLine: 3.6,
    minorLine: 2.7
  });

  function usesLegacyScale(camera, config = {}) {
    const defaultWidth = Math.max(1, Number(config.worldDefaultWidth) || 720);
    const worldWidth = Math.max(defaultWidth, Number(camera?.worldWidth) || defaultWidth);
    return worldWidth > defaultWidth + 1;
  }

  function parameters(camera, config = {}) {
    const source = usesLegacyScale(camera, config) ? LEGACY_GRID : CURRENT_GRID;
    return {
      mode: source.mode,
      major: source.major,
      minor: source.minor,
      majorLine: source.majorLine,
      minorLine: source.minorLine
    };
  }

  function applyGrid(boardWorld, camera, config = {}) {
    if (!boardWorld) return parameters(camera, config);
    const grid = parameters(camera, config);
    boardWorld.dataset.coordinateScale = grid.mode;
    boardWorld.style.setProperty('--board-grid-major', `${grid.major}px`);
    boardWorld.style.setProperty('--board-grid-minor', `${grid.minor}px`);
    boardWorld.style.setProperty('--board-grid-major-line', `${grid.majorLine}px`);
    boardWorld.style.setProperty('--board-grid-minor-line', `${grid.minorLine}px`);
    return grid;
  }

  window.P772BoardGrid = Object.freeze({
    usesLegacyScale,
    parameters,
    applyGrid
  });
})();
