(() => {
  'use strict';

  // P3.1.2 — bendras kompaktiškų valdiklių informacinis rėmelis.
  // Event delegation leidžia jį naudoti ir vėliau dinamiškai sukuriamiems mygtukams.
  const SELECTOR = '[data-p2-tooltip]';
  let tooltip = null;
  let activeTarget = null;
  let showTimer = 0;

  function ensureTooltip() {
    if (tooltip?.isConnected) return tooltip;
    tooltip = document.createElement('div');
    tooltip.className = 'p2-command-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.setAttribute('aria-hidden', 'true');
    tooltip.innerHTML = '<strong class="p2-command-tooltip-title"></strong><span class="p2-command-tooltip-detail"></span>';
    document.body.appendChild(tooltip);
    return tooltip;
  }

  function targetFrom(node) {
    return node instanceof Element ? node.closest(SELECTOR) : null;
  }

  function tooltipContent(target) {
    const label = String(target?.dataset?.p2Tooltip || '').trim();
    let detail = String(target?.dataset?.p2TooltipDetail || '').trim();
    const sourceSelector = String(target?.dataset?.p2TooltipSource || '').trim();
    if (sourceSelector) {
      try {
        const source = document.querySelector(sourceSelector);
        const sourceText = String(source?.textContent || '').trim();
        if (sourceText) detail = sourceText;
      } catch (_) {}
    }
    return { label, detail };
  }

  function position(target) {
    const box = ensureTooltip();
    const rect = target.getBoundingClientRect();
    const tipRect = box.getBoundingClientRect();
    const margin = 8;
    const viewportPadding = 8;
    let left = rect.left + rect.width / 2 - tipRect.width / 2;
    left = Math.max(viewportPadding, Math.min(left, window.innerWidth - tipRect.width - viewportPadding));
    let top = rect.bottom + margin;
    if (top + tipRect.height > window.innerHeight - viewportPadding) {
      top = Math.max(viewportPadding, rect.top - tipRect.height - margin);
      box.dataset.placement = 'top';
    } else {
      box.dataset.placement = 'bottom';
    }
    box.style.left = `${Math.round(left)}px`;
    box.style.top = `${Math.round(top)}px`;
  }

  function show(target, immediate = false) {
    clearTimeout(showTimer);
    if (!target) return;
    const run = () => {
      const { label, detail } = tooltipContent(target);
      if (!label && !detail) return;
      activeTarget = target;
      const box = ensureTooltip();
      box.querySelector('.p2-command-tooltip-title').textContent = label || detail;
      const detailEl = box.querySelector('.p2-command-tooltip-detail');
      detailEl.textContent = label ? detail : '';
      detailEl.hidden = !label || !detail;
      box.classList.add('is-visible');
      box.setAttribute('aria-hidden', 'false');
      position(target);
    };
    if (immediate) run();
    else showTimer = window.setTimeout(run, 320);
  }

  function hide(target = null) {
    clearTimeout(showTimer);
    if (target && activeTarget && target !== activeTarget) return;
    activeTarget = null;
    if (!tooltip) return;
    tooltip.classList.remove('is-visible');
    tooltip.setAttribute('aria-hidden', 'true');
  }

  document.addEventListener('pointerover', (event) => {
    const target = targetFrom(event.target);
    if (!target || target.contains(event.relatedTarget)) return;
    show(target, false);
  });
  document.addEventListener('pointerout', (event) => {
    const target = targetFrom(event.target);
    if (!target || target.contains(event.relatedTarget)) return;
    hide(target);
  });
  document.addEventListener('focusin', (event) => show(targetFrom(event.target), true));
  document.addEventListener('focusout', (event) => hide(targetFrom(event.target)));
  document.addEventListener('pointerdown', () => hide());
  window.addEventListener('resize', () => activeTarget ? position(activeTarget) : undefined, { passive: true });
  window.addEventListener('scroll', () => hide(), { passive: true, capture: true });

  window.P772UiTooltip = Object.freeze({ version: 'P3.1.2', show, hide });
})();
