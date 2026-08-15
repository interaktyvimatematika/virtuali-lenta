(() => {
  'use strict';

  // M1.3: pure Library modal/content rendering extracted from p2-ui.js.
  // Event handling, assignment orchestration and Firebase communication stay in p2-ui.js.

  function createLibraryModal(doc = document) {
    const modal = doc.createElement('div');
    modal.className = 'p2-library-modal';
    modal.innerHTML = `
      <div class="p2-library-backdrop" data-close></div>
      <section class="p2-library-panel p2-library-panel-wide" role="dialog" aria-modal="true" aria-label="Mokytojo biblioteka">
        <header><div><span class="p2-side-kicker">P2 PROTOTIPAS</span><h2>Biblioteka</h2></div><button type="button" data-close aria-label="Uždaryti">×</button></header>
        <div class="p2-library-body" id="p2LibraryBody"></div>
      </section>`;
    return modal;
  }

  function renderLibraryContentMarkup({
    lessons,
    assignment,
    pendingAttemptPolicy,
    normalizedAttemptPolicy,
    policySummary,
    escapeHtml,
    grade5LessonId,
    grade7LessonId
  }) {
    const cards = lessons.map(lesson => {
      const assigned = assignment?.lessonId === lesson.id;
      const policy = assigned
        ? normalizedAttemptPolicy(assignment)
        : normalizedAttemptPolicy({ attemptPolicy: pendingAttemptPolicy });
      const replacing = Boolean(assignment && !assigned);
      const icon = lesson.id === grade5LessonId ? '5'
        : lesson.id === grade7LessonId ? '7'
          : 'ƒ';
      const label = lesson.id === grade5LessonId ? '5 KLASĖS KARTOJIMAS'
        : lesson.id === grade7LessonId ? '7 KLASĖS KARTOJIMAS'
          : 'LYGČIŲ DIAGNOSTIKA';
      return `
        <article class="p2-library-lesson-card ${assigned ? 'is-assigned' : ''}" data-library-lesson="${escapeHtml(lesson.id)}">
          <div class="p2-library-lesson-icon" aria-hidden="true">${icon}</div>
          <div class="p2-library-lesson-copy">
            <span class="p2-label">${label}</span>
            <h3>${escapeHtml(lesson.shortTitle)}</h3>
            <p>${escapeHtml(lesson.description)}</p>
            <div class="p2-assignment-meta"><span>${lesson.taskCount} užduotys</span><span>${lesson.classCount} pamokoje</span><span>${lesson.selfCount} savarankiškai</span></div>
          </div>
          <div class="p2-library-lesson-actions">
            <div class="p2-library-attempt-summary">
              <span>Bandymų nustatymas</span>
              <b>${escapeHtml(policySummary({ attemptPolicy: policy }))}</b>
              <small>${assigned ? 'Keisk išplėstinėje mokytojo pratybų peržiūroje.' : 'Numatyta: 3 bandymai. Po priskyrimo galėsi nustatyti ir kiekvienai užduočiai atskirai.'}</small>
            </div>
            ${assigned
              ? `<span class="p2-status-badge is-assigned">✓ Priskirta</span><button class="p2-secondary" type="button" data-library-action="unassign" data-lesson-id="${escapeHtml(lesson.id)}">Atšaukti priskyrimą</button>`
              : `<button class="p2-primary" type="button" data-library-action="assign" data-lesson-id="${escapeHtml(lesson.id)}">${replacing ? 'Priskirti vietoje dabartinės' : 'Priskirti mokiniui'}</button>`}
          </div>
        </article>`;
    }).join('');

    return `
      <div class="p2-library-intro"><div><span class="p2-label">Mokytojo biblioteka</span><h3>Pasirink pamoką mokiniui</h3><p>Priskirta pamoka iškart atsiras mokinio „Mano pratybos“ srityje. Vienu metu aktyvi viena pamoka; kitą gali priskirti vėliau.</p></div></div>
      <div class="p2-library-lesson-list">${cards}</div>
      <div class="p2-library-flow"><span>Biblioteka</span><b>→</b><span>Priskirti</span><b>→</b><span>Mokinio „Mano pratybos“</span><b>→</b><span>Mokinio eiga</span></div>
    `;
  }

  window.P772LibraryUI = Object.freeze({
    createLibraryModal,
    renderLibraryContentMarkup
  });
})();
