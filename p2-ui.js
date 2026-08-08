(() => {
  'use strict';
  const BUILD = 'P2-SPLIT-P1.5';
  const STORAGE_KEY = 'p772-p2-split-ui-v1';
  const body = document.body;
  const workspace = document.getElementById('p2Workspace');
  const splitter = document.getElementById('p2Splitter');
  const sidePane = document.getElementById('p2SidePane');
  const studentPanel = document.getElementById('p2StudentPanel');
  const teacherPanel = document.getElementById('p2TeacherPanel');
  const sideTitle = document.getElementById('p2SideTitle');
  const sideKicker = document.getElementById('p2SideKicker');
  const practiceModeButton = document.getElementById('p2PracticeModeButton');
  const userCount = document.getElementById('onlineUsers');
  const learnerTitle = document.getElementById('p2LearnerStatusTitle');
  const learnerText = document.getElementById('p2LearnerStatusText');
  const presencePill = document.getElementById('p2PresencePill');
  const sideRolePill = document.getElementById('p2SideRolePill');
  const boardPresenceText = document.getElementById('p2BoardPresenceText');
  const brandSubtitle = document.querySelector('.brand span');

  if (!workspace || !splitter || !sidePane) return;
  body.classList.add('p2-shell');
  if (brandSubtitle) brandSubtitle.textContent = `Interaktyvios pratybos · ${BUILD}`;

  // Senas pratybų langas paliekamas kode suderinamumui, bet P2 sąsajoje jis nebėra canvas objektas.
  const legacyPracticeButton = document.getElementById('practiceOnlyButton');
  if (legacyPracticeButton) legacyPracticeButton.hidden = true;

  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
    catch (_) { return {}; }
  }
  const prefs = readPrefs();
  let view = ['board', 'split', 'practice'].includes(prefs.view) ? prefs.view : 'split';
  let ratio = Number.isFinite(Number(prefs.ratio)) ? Number(prefs.ratio) : 55;
  ratio = Math.max(34, Math.min(72, ratio));

  function savePrefs() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify({ view, ratio })); } catch (_) {}
  }

  function role() {
    return body.dataset.onlineRole === 'student' ? 'student' : 'teacher';
  }

  function applyRole() {
    const isTeacher = role() === 'teacher';
    studentPanel.hidden = isTeacher;
    teacherPanel.hidden = !isTeacher;
    sideKicker.textContent = isTeacher ? 'MOKYTOJO STEBĖJIMAS' : 'MOKINIO ERDVĖ';
    sideTitle.textContent = isTeacher ? 'Mokinio eiga' : 'Mano pratybos';
    practiceModeButton.textContent = isTeacher ? 'Mokinio eiga' : 'Tik pratybos';
    if (sideRolePill) sideRolePill.textContent = isTeacher ? 'Mokytojas' : 'Mokinys';
    document.querySelectorAll('.p2-teacher-only').forEach(el => el.hidden = !isTeacher);
    const p2LibraryButton = document.getElementById('libraryButton');
    if (p2LibraryButton) p2LibraryButton.hidden = !isTeacher;
    updatePresence();
  }

  function applyRatio() {
    workspace.style.setProperty('--p2-split', `${ratio}%`);
  }

  function applyView(next, { persist = true } = {}) {
    view = ['board', 'split', 'practice'].includes(next) ? next : 'split';
    workspace.dataset.view = view;
    body.dataset.p2View = view;
    document.querySelectorAll('[data-p2-view]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.p2View === view));
    splitter.setAttribute('aria-hidden', view !== 'split' ? 'true' : 'false');
    if (persist) savePrefs();
    // Lentos ResizeObserver perskaičiuos kamerą; papildomas resize padeda naršyklėms, kurios delsia po grid pokyčio.
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }

  document.querySelectorAll('[data-p2-view]').forEach(button => {
    button.addEventListener('click', () => applyView(button.dataset.p2View));
  });

  let drag = null;
  splitter.addEventListener('pointerdown', event => {
    if (view !== 'split') return;
    event.preventDefault();
    splitter.setPointerCapture?.(event.pointerId);
    drag = { pointerId: event.pointerId };
    body.classList.add('p2-resizing');
  });
  splitter.addEventListener('pointermove', event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    const rect = workspace.getBoundingClientRect();
    const stacked = matchMedia('(max-width: 900px)').matches;
    const raw = stacked ? ((event.clientY - rect.top) / rect.height * 100) : ((event.clientX - rect.left) / rect.width * 100);
    ratio = Math.max(34, Math.min(72, raw));
    applyRatio();
  });
  const endDrag = event => {
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag = null;
    body.classList.remove('p2-resizing');
    savePrefs();
    window.dispatchEvent(new Event('resize'));
  };
  splitter.addEventListener('pointerup', endDrag);
  splitter.addEventListener('pointercancel', endDrag);
  splitter.addEventListener('keydown', event => {
    if (view !== 'split') return;
    const stacked = matchMedia('(max-width: 900px)').matches;
    const dec = stacked ? 'ArrowUp' : 'ArrowLeft';
    const inc = stacked ? 'ArrowDown' : 'ArrowRight';
    if (![dec, inc].includes(event.key)) return;
    event.preventDefault();
    ratio = Math.max(34, Math.min(72, ratio + (event.key === inc ? 3 : -3)));
    applyRatio(); savePrefs(); window.dispatchEvent(new Event('resize'));
  });

  function updatePresence() {
    const count = Math.max(0, Number(userCount?.textContent || 0));
    if (boardPresenceText) boardPresenceText.textContent = count > 1 ? `${count} prisijungę` : 'Prisijungta';
    if (!presencePill) return;
    presencePill.textContent = `${count} ${count === 1 ? 'įrenginys' : 'įrenginiai'}`;
    if (role() !== 'teacher') return;
    if (count >= 2) {
      learnerTitle.textContent = 'Mokinys prisijungęs';
      learnerText.textContent = 'Bendra lenta veikia realiu laiku. Individualios pratybos bus prijungtos kitame P2 etape.';
      presencePill.classList.add('is-online');
    } else {
      learnerTitle.textContent = 'Laukiama mokinio';
      learnerText.textContent = 'Nukopijuok mokinio nuorodą ir atidaryk ją kitame įrenginyje.';
      presencePill.classList.remove('is-online');
    }
  }
  if (userCount) new MutationObserver(updatePresence).observe(userCount, { childList: true, subtree: true, characterData: true });

  // P2 biblioteka – sąmoningai tuščia, kad senas bandomasis turinys neformuotų naujos architektūros.
  const originalLibraryButton = document.getElementById('libraryButton');
  if (originalLibraryButton) {
    const button = originalLibraryButton.cloneNode(true);
    originalLibraryButton.replaceWith(button);
    button.id = 'libraryButton';
    button.addEventListener('click', () => {
      if (role() !== 'teacher') return;
      openPrototypeLibrary();
    });
  }

  let libraryModal = null;
  function openPrototypeLibrary() {
    if (!libraryModal) {
      libraryModal = document.createElement('div');
      libraryModal.className = 'p2-library-modal';
      libraryModal.innerHTML = `
        <div class="p2-library-backdrop" data-close></div>
        <section class="p2-library-panel" role="dialog" aria-modal="true" aria-label="Mokytojo biblioteka">
          <header><div><span class="p2-side-kicker">P2 PROTOTIPAS</span><h2>Biblioteka</h2></div><button type="button" data-close aria-label="Uždaryti">×</button></header>
          <div class="p2-library-body">
            <div class="p2-empty-icon">▦</div>
            <h3>Turinį pridėsime stabilizavę vaizdus</h3>
            <p>Čia vėliau bus mokytojo biblioteka su veiksmu <strong>„Priskirti mokiniui“</strong>. Dabartinis senasis užduočių turinys sąmoningai neperkeltas.</p>
            <div class="p2-library-flow"><span>Biblioteka</span><b>→</b><span>Priskirti</span><b>→</b><span>Mokinio „Mano pratybos“</span></div>
          </div>
        </section>`;
      document.body.appendChild(libraryModal);
      libraryModal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', () => libraryModal.hidden = true));
    }
    libraryModal.hidden = false;
  }

  // Seną biblioteką ir seną „tik pratybos“ overlay P2 naudotojui paslepiame.
  const legacyLibrary = document.getElementById('libraryModal');
  if (legacyLibrary) legacyLibrary.setAttribute('aria-hidden', 'true');

  const roleObserver = new MutationObserver(() => applyRole());
  roleObserver.observe(body, { attributes: true, attributeFilter: ['data-online-role'] });
  document.getElementById('p2SideRefreshButton')?.addEventListener('click', updatePresence);

  applyRatio();
  applyView(view, { persist: false });
  applyRole();
})();
