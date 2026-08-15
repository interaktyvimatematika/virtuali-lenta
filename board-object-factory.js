(() => {
  'use strict';

  // P1.7.9.49-M2.11: lentos objektų sukūrimo / importavimo sluoksnis.
  // Čia laikome tik modelio konstravimą ir paveikslėlio paruošimą. DOM renderinimas,
  // MathLive, Firebase ir realtime sinchronizacija lieka savo esamuose moduliuose.

  const BOARD_IMAGE_MAX_INPUT_BYTES = 20 * 1024 * 1024;
  const BOARD_IMAGE_MAX_DIMENSION = 1600;
  const BOARD_IMAGE_TARGET_DATA_URL_LENGTH = 850000;
  const BOARD_IMAGE_HARD_DATA_URL_LENGTH = 1200000;

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function createNoteInstance(options = {}) {
    const noteCount = Math.max(0, Number(options.noteCount) || 0);
    const offset = noteCount % 5;
    const boardRect = options.boardRect || { width: 0, height: 0 };
    const boardWidth = Number(boardRect.width) || 0;
    const boardHeight = Number(boardRect.height) || 0;
    const board = options.board || {};
    const zoom = Math.max(0.2, Number(options.zoom) || 1);
    const visibleLeft = (Number(board.scrollLeft) || 0) / zoom;
    const visibleTop = (Number(board.scrollTop) || 0) / zoom;
    const visibleWidth = (Number(board.clientWidth) || 0) / zoom;
    const visibleHeight = (Number(board.clientHeight) || 0) / zoom;
    const objectWidth = 430;
    const objectHeight = 56;
    let left = visibleLeft + 54 + offset * 22;
    let top = visibleTop + 76 + offset * 26;
    const practiceWindow = options.practiceWindow;
    if (!options.windowShelved && practiceWindow?.isConnected) {
      const practiceRight = (Number(practiceWindow.offsetLeft) || 0) + (Number(practiceWindow.offsetWidth) || 0) + 34;
      const practiceBottom = (Number(practiceWindow.offsetTop) || 0) + (Number(practiceWindow.offsetHeight) || 0) + 28;
      if (practiceRight + objectWidth <= visibleLeft + visibleWidth - 24) left = Math.max(left, practiceRight);
      else if (practiceBottom + objectHeight <= visibleTop + visibleHeight - 24) top = Math.max(top, practiceBottom);
    }
    left = Math.max(0, Math.min(boardWidth - objectWidth, left));
    top = Math.max(0, Math.min(boardHeight - objectHeight, top));
    return {
      id: String(options.id || `note-${Number(options.now) || Date.now()}`),
      nodes: [{ type: 'text', text: '' }],
      x: boardWidth ? left / boardWidth : 0.055,
      y: boardHeight ? top / boardHeight : 0.08,
      width: objectWidth,
      minHeight: 44
    };
  }

  function normalizeImageInstance(candidate) {
    if (!candidate || typeof candidate !== 'object') return null;
    const src = String(candidate.src || '');
    if (!src.startsWith('data:image/')) return null;
    const naturalWidth = Math.max(1, Number(candidate.naturalWidth) || 1);
    const naturalHeight = Math.max(1, Number(candidate.naturalHeight) || 1);
    const naturalRatio = naturalWidth / naturalHeight;
    const ratio = clamp(Number(candidate.aspectRatio) || naturalRatio || 1, 0.05, 20);
    return {
      id: String(candidate.id || `board-image-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`),
      src,
      name: String(candidate.name || 'Nuotrauka').slice(0, 160),
      x: clamp(Number(candidate.x) || 0, 0, 1),
      y: clamp(Number(candidate.y) || 0, 0, 1),
      width: clamp(Number(candidate.width) || 0.22, 0.03, 1),
      height: clamp(Number(candidate.height) || 0.18, 0.03, 1),
      aspectRatio: ratio,
      naturalWidth,
      naturalHeight,
      createdAt: String(candidate.createdAt || new Date().toISOString())
    };
  }

  async function prepareImageFile(file, options = {}) {
    if (!file || !String(file.type || '').startsWith('image/')) throw new Error('Pasirink paveikslėlio failą');
    if (file.size > BOARD_IMAGE_MAX_INPUT_BYTES) throw new Error('Paveikslėlis per didelis. Didžiausias pradinis failas – 20 MB.');
    const readFileAsDataUrl = options.readFileAsDataUrl;
    const loadImageFromDataUrl = options.loadImageFromDataUrl;
    const doc = options.document || document;
    if (typeof readFileAsDataUrl !== 'function' || typeof loadImageFromDataUrl !== 'function') {
      throw new Error('Nepavyko parengti paveikslėlio skaitymo aplinkos');
    }
    const original = await readFileAsDataUrl(file);
    const source = await loadImageFromDataUrl(original);
    const naturalWidth = Math.max(1, source.naturalWidth || source.width || 1);
    const naturalHeight = Math.max(1, source.naturalHeight || source.height || 1);
    let scale = Math.min(1, BOARD_IMAGE_MAX_DIMENSION / Math.max(naturalWidth, naturalHeight));
    let quality = 0.88;
    let dataUrl = original;
    let outputWidth = naturalWidth;
    let outputHeight = naturalHeight;

    // Nuotrauką sumažiname prieš siųsdami per bendros lentos Firebase būseną.
    // Taip viena nuotrauka neužkemša localStorage ir realaus laiko sinchronizacijos.
    for (let attempt = 0; attempt < 7; attempt += 1) {
      outputWidth = Math.max(1, Math.round(naturalWidth * scale));
      outputHeight = Math.max(1, Math.round(naturalHeight * scale));
      const canvas = doc.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const context = canvas.getContext('2d', { alpha: true });
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(source, 0, 0, outputWidth, outputHeight);
      dataUrl = canvas.toDataURL('image/webp', quality);
      if (dataUrl.length <= BOARD_IMAGE_TARGET_DATA_URL_LENGTH) break;
      scale *= 0.82;
      quality = Math.max(0.62, quality - 0.06);
    }
    if (dataUrl.length > BOARD_IMAGE_HARD_DATA_URL_LENGTH) throw new Error('Nepavyko pakankamai sumažinti paveikslėlio. Pabandyk mažesnį failą.');
    return {
      src: dataUrl,
      naturalWidth: outputWidth,
      naturalHeight: outputHeight,
      aspectRatio: outputWidth / Math.max(1, outputHeight)
    };
  }

  function initialImagePixelSize(prepared, boardRect) {
    const boardWidth = Math.max(1, Number(boardRect?.width) || 1);
    const boardHeight = Math.max(1, Number(boardRect?.height) || 1);
    const aspectRatio = clamp(Number(prepared?.aspectRatio) || 1, 0.05, 20);
    const maxWidth = Math.min(620, boardWidth * 0.42);
    const maxHeight = Math.min(480, boardHeight * 0.36);
    let width = Math.min(maxWidth, Math.max(180, Number(prepared?.naturalWidth) || 1));
    let height = width / aspectRatio;
    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }
    // P1.7.9.49-M2.5.1: minimalaus / maksimalaus dydžio ribos nekeičia
    // paveikslėlio proporcijos. width ir height nėra clamp'inami atskirai.
    const minimumWidth = Math.max(120, 90 * aspectRatio);
    const maximumWidth = Math.max(1, Math.min(boardWidth, boardHeight * aspectRatio));
    width = Math.max(Math.min(minimumWidth, maximumWidth), Math.min(maximumWidth, width));
    height = width / aspectRatio;
    return { width, height, aspectRatio };
  }

  function createImageInstance(options = {}) {
    const prepared = options.prepared;
    if (!prepared || !String(prepared.src || '').startsWith('data:image/')) return null;
    const boardRect = options.boardRect || { width: 1, height: 1 };
    const boardWidth = Math.max(1, Number(boardRect.width) || 1);
    const boardHeight = Math.max(1, Number(boardRect.height) || 1);
    const size = initialImagePixelSize(prepared, boardRect);
    const center = options.center || { x: boardWidth / 2, y: boardHeight / 2 };
    const left = Math.max(0, Math.min(boardWidth - size.width, Number(center.x || 0) - size.width / 2));
    const top = Math.max(0, Math.min(boardHeight - size.height, Number(center.y || 0) - size.height / 2));
    const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
    const timestamp = now.getTime();
    const randomSuffix = String(options.randomSuffix || Math.random().toString(36).slice(2, 8));
    return normalizeImageInstance({
      id: String(options.id || `board-image-${timestamp}-${randomSuffix}`),
      src: prepared.src,
      name: options.name || 'Nuotrauka',
      x: boardWidth ? left / boardWidth : 0,
      y: boardHeight ? top / boardHeight : 0,
      width: boardWidth ? size.width / boardWidth : 0.22,
      height: boardHeight ? size.height / boardHeight : 0.18,
      aspectRatio: size.aspectRatio,
      naturalWidth: prepared.naturalWidth,
      naturalHeight: prepared.naturalHeight,
      createdAt: now.toISOString()
    });
  }

  window.P772BoardObjectFactory = Object.freeze({
    BOARD_IMAGE_MAX_INPUT_BYTES,
    BOARD_IMAGE_MAX_DIMENSION,
    BOARD_IMAGE_TARGET_DATA_URL_LENGTH,
    createNoteInstance,
    normalizeImageInstance,
    prepareImageFile,
    initialImagePixelSize,
    createImageInstance
  });
})();
