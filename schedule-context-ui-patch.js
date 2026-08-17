(() => {
  'use strict';

  // P3.2.7.10.11 — kontekstinis tvarkaraščio inspektorius.
  // Šis sluoksnis nekeičia tvarkaraščio duomenų modelio ar Firebase veiksmų.
  // Jis tik parenka, kuris jau egzistuojantis dešiniojo skydelio blokas matomas.

  const STATE = {
    mode: 'overview', // overview | time | assignment | add | content
    scheduleId: '',
    dateKey: '',
    assignmentLabel: ''
  };

  const KNOWN_HEADINGS = [
    'Pamokos laikas',
    'Pamokos informacija',
    'Mokinių priskyrimai šiame laike'
  ];

  function text(node) {
    return String(node?.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function injectStyles() {
    if (document.getElementById('p3271011ScheduleContextStyles')) return;
    const style = document.createElement('style');
    style.id = 'p3271011ScheduleContextStyles';
    style.textContent = `
      #p2ScheduleWeekPane [data-schedule-card] .p2-context-zone {
        border-radius: 8px;
        transition: background-color .14s ease, color .14s ease, box-shadow .14s ease;
      }
      #p2ScheduleWeekPane [data-schedule-card] .p2-context-zone:hover {
        background: rgba(74,103,214,.09);
        box-shadow: 0 0 0 3px rgba(74,103,214,.06);
        cursor: pointer;
      }
      #p2ScheduleWeekPane [data-schedule-card] .p2-context-zone.is-context-active {
        background: rgba(74,103,214,.13);
        box-shadow: 0 0 0 2px rgba(74,103,214,.12);
      }
      #p2ScheduleEditorPane .p2-schedule-context-toolbar {
        position: sticky;
        top: 0;
        z-index: 6;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin: 0 0 12px;
        padding: 8px 0 10px;
        background: linear-gradient(180deg,#fff 78%,rgba(255,255,255,.92));
      }
      #p2ScheduleEditorPane .p2-schedule-context-toolbar[hidden] { display:none !important; }
      #p2ScheduleEditorPane .p2-schedule-context-label {
        min-width: 0;
        color: #687287;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: .035em;
        text-transform: uppercase;
      }
      #p2ScheduleEditorPane .p2-schedule-context-toolbar [data-schedule-open-lesson] {
        flex: 0 0 auto;
        width: auto;
        min-height: 36px;
        padding-left: 12px;
        padding-right: 12px;
      }
      #p2ScheduleEditorPane .p2-context-hidden { display: none !important; }
      #p2ScheduleEditorPane .p2-context-focus-block {
        animation: p2-context-focus-in .16s ease-out;
      }
      @keyframes p2-context-focus-in {
        from { opacity:.72; transform:translateY(2px); }
        to { opacity:1; transform:none; }
      }
      #p2ScheduleEditorPane .p2-context-assignment-active {
        box-shadow: 0 0 0 2px rgba(74,103,214,.13);
        border-radius: 12px;
      }
    `;
    document.head.appendChild(style);
  }

  function minimalAncestor(start, stop, predicate) {
    let node = start instanceof Element ? start : null;
    let best = null;
    while (node && node !== stop) {
      if (predicate(node)) best = node;
      node = node.parentElement;
    }
    return best;
  }

  function cardZones(card) {
    const result = [];
    const seen = new Set();
    const add = (el, kind, label = '') => {
      if (!el || seen.has(el)) return;
      seen.add(el);
      el.classList.add('p2-context-zone');
      el.dataset.p2ScheduleContext = kind;
      if (label) el.dataset.p2ScheduleContextLabel = label;
      result.push(el);
    };

    // Laikas — mažiausias elementas, kurio visas tekstas yra HH:MM.
    card.querySelectorAll('*').forEach(el => {
      const value = text(el);
      if (/^\d{2}:\d{2}$/.test(value) && !Array.from(el.children).some(child => /^\d{2}:\d{2}$/.test(text(child)))) {
        add(el, 'time');
      }
    });

    // Mokinio „pill“ — mažiausias konteineris su klase. Sąmoningai nevartojame
    // konkrečios CSS klasės, kad pataisa liktų suderinama su dabartiniu rendereriu.
    card.querySelectorAll('*').forEach(el => {
      const value = text(el);
      if (!value || !/\b\d{1,2}\s*kl\./i.test(value)) return;
      const childHasStudent = Array.from(el.children).some(child => /\b\d{1,2}\s*kl\./i.test(text(child)));
      if (childHasStudent) return;
      const clean = value
        .replace(/\b(Nuolatinis|Pavienės|Pažintinė|Paskutinė)\b/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
      add(el, 'assignment', clean);
    });

    // Pamokos turinys / laisvas laikas.
    card.querySelectorAll('*').forEach(el => {
      const value = text(el);
      if (value === 'Tik lenta' || value.startsWith('Tik lenta ')) add(el, 'content');
      if (value.includes('Laisvas laikas') && !Array.from(el.children).some(child => text(child).includes('Laisvas laikas'))) add(el, 'add');
    });

    return result;
  }

  function markWeekZones() {
    const week = document.getElementById('p2ScheduleWeekPane');
    if (!week) return;
    week.querySelectorAll('[data-schedule-card]').forEach(card => {
      const scheduleId = String(card.dataset.scheduleCard || '');
      const dateKey = String(card.dataset.scheduleDate || '');
      const zones = cardZones(card);
      zones.forEach(zone => {
        zone.classList.remove('is-context-active');
        if (scheduleId !== STATE.scheduleId || dateKey !== STATE.dateKey) return;
        const kind = String(zone.dataset.p2ScheduleContext || '');
        if (kind !== STATE.mode) return;
        if (kind === 'assignment' && STATE.assignmentLabel) {
          const label = String(zone.dataset.p2ScheduleContextLabel || '');
          if (!labelsLikelyMatch(label, STATE.assignmentLabel)) return;
        }
        zone.classList.add('is-context-active');
      });
    });
  }

  function labelsLikelyMatch(a, b) {
    const normalize = value => String(value || '')
      .toLocaleLowerCase('lt-LT')
      .replace(/\b(nuolatinis|pavienės|pažintinė|paskutinė)\b/g, '')
      .replace(/[^\p{L}\p{N}]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    const x = normalize(a);
    const y = normalize(b);
    if (!x || !y) return false;
    return x === y || x.includes(y) || y.includes(x) || x.split(' ')[0] === y.split(' ')[0];
  }

  function majorBlockFromAnchor(host, anchor, heading = '') {
    if (!host || !anchor) return null;
    let node = anchor.closest('section, article, fieldset, div');
    let best = node;
    while (node && node !== host) {
      const value = text(node);
      const containsHeading = !heading || value.includes(heading);
      const knownCount = KNOWN_HEADINGS.reduce((count, item) => count + (value.includes(item) ? 1 : 0), 0);
      if (containsHeading && knownCount <= 1) best = node;
      const parent = node.parentElement;
      if (!parent || parent === host) break;
      const parentText = text(parent);
      const parentKnownCount = KNOWN_HEADINGS.reduce((count, item) => count + (parentText.includes(item) ? 1 : 0), 0);
      if (parentKnownCount > 1) break;
      node = parent;
    }
    return best;
  }

  function sessionBlock(host, openButton, excluded) {
    if (!openButton) return null;
    let node = openButton.closest('section, article, fieldset, div');
    let best = node;
    while (node && node !== host) {
      const hitsExcluded = excluded.some(block => block && (block === node || block.contains(node) || node.contains(block)));
      if (hitsExcluded && node !== best) break;
      best = node;
      if (node.parentElement === host) break;
      node = node.parentElement;
    }
    return best;
  }

  function findAssignmentCards(assignmentBlock) {
    if (!assignmentBlock) return [];
    return Array.from(assignmentBlock.querySelectorAll('[data-schedule-assignment-delete]')).map(button => {
      let node = button.closest('article, li, section, div');
      let best = node;
      while (node && node !== assignmentBlock) {
        const value = text(node);
        const deleteCount = node.querySelectorAll('[data-schedule-assignment-delete]').length;
        if (deleteCount === 1 && value.length < 800) best = node;
        if (node.parentElement === assignmentBlock) break;
        node = node.parentElement;
      }
      return best;
    }).filter((value, index, array) => value && array.indexOf(value) === index);
  }

  function assignmentAddBlock(assignmentBlock) {
    const anchor = assignmentBlock?.querySelector('#p2ScheduleAssignStudent');
    if (!anchor) return null;
    let node = anchor.closest('fieldset, section, article, div');
    let best = node;
    while (node && node !== assignmentBlock) {
      const value = text(node).toLocaleLowerCase('lt-LT');
      if (value.includes('pridėti priskyrimą') || value.includes('priskirti mokinį')) best = node;
      if (node.parentElement === assignmentBlock) break;
      node = node.parentElement;
    }
    return best;
  }

  function modeLabel() {
    if (STATE.mode === 'time') return 'Redaguojamas laikas';
    if (STATE.mode === 'assignment') return STATE.assignmentLabel ? `Mokinio priskyrimas · ${STATE.assignmentLabel}` : 'Mokinio priskyrimas';
    if (STATE.mode === 'add') return 'Priskirti mokinį';
    if (STATE.mode === 'content') return 'Pamokos turinys';
    return 'Pamokos peržiūra';
  }

  function installStickyLessonAction(host, openButton) {
    let toolbar = host.querySelector(':scope > .p2-schedule-context-toolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.className = 'p2-schedule-context-toolbar';
      const label = document.createElement('span');
      label.className = 'p2-schedule-context-label';
      toolbar.appendChild(label);
      host.prepend(toolbar);
    }
    const label = toolbar.querySelector('.p2-schedule-context-label');
    if (label) label.textContent = modeLabel();
    if (openButton && openButton.parentElement !== toolbar) toolbar.appendChild(openButton);
    toolbar.hidden = !host.children.length;
    return toolbar;
  }

  function applyAssignmentFocus(assignmentBlock) {
    if (!assignmentBlock) return;
    const cards = findAssignmentCards(assignmentBlock);
    const addBlock = assignmentAddBlock(assignmentBlock);
    cards.forEach(card => {
      card.classList.remove('p2-context-hidden', 'p2-context-assignment-active');
    });
    if (addBlock) addBlock.classList.remove('p2-context-hidden');

    if (STATE.mode === 'assignment') {
      if (addBlock) addBlock.classList.add('p2-context-hidden');
      if (STATE.assignmentLabel) {
        cards.forEach(card => {
          if (labelsLikelyMatch(text(card), STATE.assignmentLabel)) card.classList.add('p2-context-assignment-active');
          else card.classList.add('p2-context-hidden');
        });
      }
    } else if (STATE.mode === 'add') {
      cards.forEach(card => card.classList.add('p2-context-hidden'));
      if (addBlock) addBlock.classList.add('p2-context-focus-block');
    }
  }

  function applyEditorMode() {
    const host = document.getElementById('p2ScheduleEditorPane');
    if (!host || host.hidden) return;

    const timeAnchor = host.querySelector('#p2ScheduleTimeManageAction');
    const metaAnchor = host.querySelector('#p2ScheduleLabel, [data-schedule-meta-save]');
    const assignmentAnchor = host.querySelector('#p2ScheduleAssignStudent, [data-schedule-assignment-delete]');
    const openButton = host.querySelector('[data-schedule-open-lesson]');

    const timeBlock = majorBlockFromAnchor(host, timeAnchor, 'Pamokos laikas');
    const metaBlock = majorBlockFromAnchor(host, metaAnchor, 'Pamokos informacija');
    const assignmentBlock = majorBlockFromAnchor(host, assignmentAnchor, 'Mokinių priskyrimai šiame laike');
    const session = sessionBlock(host, openButton, [timeBlock, metaBlock, assignmentBlock]);

    const blocks = [timeBlock, metaBlock, assignmentBlock, session].filter((value, index, array) => value && array.indexOf(value) === index);
    blocks.forEach(block => block.classList.remove('p2-context-hidden', 'p2-context-focus-block'));

    installStickyLessonAction(host, openButton);

    const showOnly = target => {
      blocks.forEach(block => {
        if (block === target) block.classList.add('p2-context-focus-block');
        else block.classList.add('p2-context-hidden');
      });
    };

    if (STATE.mode === 'time' && timeBlock) showOnly(timeBlock);
    else if (STATE.mode === 'content' && metaBlock) showOnly(metaBlock);
    else if ((STATE.mode === 'assignment' || STATE.mode === 'add') && assignmentBlock) showOnly(assignmentBlock);
    else if (STATE.mode === 'overview' && session) showOnly(session);
    else if (STATE.mode !== 'overview') {
      // Jei dabartinio rendererio struktūra netikėta, nieko nepaslepiame.
      blocks.forEach(block => block.classList.remove('p2-context-hidden'));
    }

    applyAssignmentFocus(assignmentBlock);
  }

  function enhance() {
    injectStyles();
    markWeekZones();
    applyEditorMode();
  }

  function findClickedZone(target, card) {
    let node = target instanceof Element ? target : null;
    while (node && node !== card) {
      if (node.dataset?.p2ScheduleContext) return node;
      node = node.parentElement;
    }
    return null;
  }

  // Capture fazė: būseną nusistatome prieš p2-ui.js kortelės click handlerį,
  // kuris po to perrenderins dešinį skydelį.
  document.addEventListener('click', event => {
    const target = event.target instanceof Element ? event.target : null;
    const card = target?.closest?.('#p2ScheduleWeekPane [data-schedule-card]');
    if (!card) return;
    if (target.closest('button, input, select, textarea, a')) return;

    // Jeigu rendereris ką tik perpiešė kortelę, zonas pažymime sinchroniškai.
    cardZones(card);
    const zone = findClickedZone(target, card);
    STATE.scheduleId = String(card.dataset.scheduleCard || '');
    STATE.dateKey = String(card.dataset.scheduleDate || '');
    STATE.assignmentLabel = '';
    STATE.mode = zone ? String(zone.dataset.p2ScheduleContext || 'overview') : 'overview';
    if (STATE.mode === 'assignment') STATE.assignmentLabel = String(zone?.dataset.p2ScheduleContextLabel || text(zone));
  }, true);

  const observer = new MutationObserver(() => {
    queueMicrotask(enhance);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('DOMContentLoaded', enhance, { once: true });
  if (document.readyState !== 'loading') enhance();
})();
