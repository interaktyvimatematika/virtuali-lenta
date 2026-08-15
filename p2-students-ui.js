(() => {
  'use strict';

  // M1.4: pure Students modal/body rendering extracted from p2-ui.js.
  // Event handlers, Firebase actions, Room navigation and schedule orchestration
  // intentionally remain in p2-ui.js.

  function createStudentsModal(doc = document) {
    const modal = doc.createElement('div');
    modal.className = 'p2-students-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="p2-students-backdrop" data-students-close></div>
      <section class="p2-students-panel" role="dialog" aria-modal="true" aria-label="Mokiniai">
        <header class="p2-students-header">
          <div><span class="p2-side-kicker">MOKINIŲ DUOMENŲ BAZĖ</span><h2>Mokiniai</h2><p>Pamokos, jų eiga, pratybos ir mokinio darbas.</p></div>
          <button type="button" data-students-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-students-body" id="p2StudentsBody"></div>
      </section>`;
    return modal;
  }

  function renderStudentsBodyMarkup(ctx = {}) {
    let {
      students = [], visibleStudents = [], roomId = '', linkedStudentId = '',
      selected = null, history = [], currentLesson = null,
      selectedOwnsActiveRoom = false, defaultLessonId = '', selectedClassParticipant = null,
      studentGradeFilter = 'all', studentSearchQuery = '', studentCreateOpen = false,
      studentEditOpen = false, selectedStudentId = '', expandedStudentHistoryRoomId = '',
      teacherStudentDb = {}, LESSON_CATALOG = []
    } = ctx;
    const {
      studentGradeValue, lessonHistoryForStudent, studentSameNameGradeGroup,
      studentGuardianLabel, studentGuardianRelation, formatStudentDate,
      studentLessonOccurrenceState, studentUpcomingScheduleLessons, studentPracticeLabel,
      linkedClassSessionIdForRoom, scheduleMode, scheduleModeLabel, studentTeacherLabel,
      studentLessonWhenLabel, studentLessonResultText, studentScheduledLessonWhenLabel,
      studentLessonStatus, renderStudentRoomHistoryDetails, escapeHtml
    } = ctx;

    const presentGrades = Array.from(new Set(students.map(student => studentGradeValue(student.grade)).filter(Boolean))).sort((a, b) => a - b);
    const hasUngraded = students.some(student => !studentGradeValue(student.grade));
    const validGradeFilters = new Set(['all', ...presentGrades.map(String), ...(hasUngraded ? ['none'] : [])]);
    if (!validGradeFilters.has(studentGradeFilter)) studentGradeFilter = 'all';
    const gradeFilterOptions = [
      '<option value="all">Visos klasės</option>',
      ...presentGrades.map(grade => `<option value="${grade}" ${studentGradeFilter === String(grade) ? 'selected' : ''}>${grade} klasė</option>`),
      ...(hasUngraded ? [`<option value="none" ${studentGradeFilter === 'none' ? 'selected' : ''}>Klasė nenurodyta</option>`] : [])
    ].join('').replace('value="all"', `value="all" ${studentGradeFilter === 'all' ? 'selected' : ''}`);

    const grouped = new Map();
    for (const student of visibleStudents) {
      const grade = studentGradeValue(student.grade);
      const key = grade ? String(grade) : 'none';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(student);
    }
    const groupEntries = Array.from(grouped.entries()).sort(([a], [b]) => {
      if (a === 'none') return 1;
      if (b === 'none') return -1;
      return Number(a) - Number(b);
    });

    const overviewMarkup = groupEntries.length ? groupEntries.map(([gradeKey, groupStudents]) => {
      const heading = gradeKey === 'none' ? 'Klasė nenurodyta' : `${gradeKey} klasė`;
      const cards = groupStudents.map(student => {
        const count = lessonHistoryForStudent(student).length;
        const duplicate = studentSameNameGradeGroup(student, students).length > 1;
        const guardian = studentGuardianLabel(student);
        const current = linkedStudentId === student.id;
        const identity = duplicate ? (guardian || 'reikia identifikatoriaus') : guardian;
        const meta = [identity, `${count} ${count === 1 ? 'pamoka' : 'pamokos'}`, current ? 'dabartinė sesija' : ''].filter(Boolean).join(' · ');
        const initial = String(student.name || 'M').trim().slice(0, 1).toUpperCase() || 'M';
        return `<button class="p2-student-overview-card" type="button" data-student-select="${escapeHtml(student.id)}">
          <span class="p2-student-avatar" aria-hidden="true">${escapeHtml(initial)}</span>
          <span class="p2-student-overview-copy"><strong>${escapeHtml(student.name || 'Mokinys')}</strong><small class="${duplicate && !guardian ? 'needs-id' : ''}">${escapeHtml(meta || 'Mokinio kortelė')}</small></span>
          <span class="p2-student-overview-open" aria-hidden="true">›</span>
        </button>`;
      }).join('');
      return `<section class="p2-student-overview-group"><div class="p2-student-overview-heading"><div><span class="p2-label">${escapeHtml(heading)}</span><strong>${groupStudents.length} ${groupStudents.length === 1 ? 'mokinys' : 'mokiniai'}</strong></div></div><div class="p2-student-overview-grid">${cards}</div></section>`;
    }).join('') : (students.length
      ? `<div class="p2-students-empty is-overview"><strong>Mokinių nerasta</strong><span>Pakeisk paiešką arba klasės filtrą.</span></div>`
      : `<div class="p2-students-empty is-overview"><strong>Dar nėra mokinių</strong><span>Paspausk „Naujas mokinys“ ir sukurk pirmą kortelę.</span></div>`);


    const gradeOptions = (selectedGrade = 0) => `<option value="">—</option>${Array.from({ length: 12 }, (_, index) => index + 1).map(grade => `<option value="${grade}" ${grade === selectedGrade ? 'selected' : ''}>${grade}</option>`).join('')}`;
    const guardianRelationOptions = selectedRelation => {
      const relation = studentGuardianRelation(selectedRelation);
      return `<option value="">— Nenurodyta —</option><option value="mama" ${relation === 'mama' ? 'selected' : ''}>Mama</option><option value="tėtis" ${relation === 'tėtis' ? 'selected' : ''}>Tėtis</option><option value="kita" ${relation === 'kita' ? 'selected' : ''}>Kita</option>`;
    };

    let detailMarkup = `
      <section class="p2-students-overview">
        <div class="p2-students-overview-head">
          <div><span class="p2-label">Mokinių bazė</span><h3>Mokinių sąrašas</h3><p>${visibleStudents.length === students.length ? `${students.length} ${students.length === 1 ? 'mokinys' : 'mokiniai'}` : `Rodoma ${visibleStudents.length} iš ${students.length}`}</p></div>
          <button type="button" class="p2-primary" data-student-create-open>＋ Naujas mokinys</button>
        </div>
        <div class="p2-students-overview-toolbar">
          <div class="p2-students-overview-filters">
            <label class="p2-student-search"><span aria-hidden="true">⌕</span><input id="p2StudentSearch" value="${escapeHtml(studentSearchQuery)}" placeholder="Ieškoti mokinio…" autocomplete="off"></label>
            <select id="p2StudentGradeFilter" aria-label="Filtruoti pagal klasę">${gradeFilterOptions}</select>
          </div>
          <div class="p2-students-overview-actions">
            <span class="p2-student-overview-summary">${presentGrades.length ? `${presentGrades.length} ${presentGrades.length === 1 ? 'klasė' : 'klasės'}` : 'Klasės dar nenurodytos'}</span>
            <button type="button" class="p2-secondary p2-student-backup-inline" data-student-backup title="Atsisiųsti mokinių bazės, susietų pamokų ir mokytojo profilio atkūrimo kopiją">↓ Atsarginė kopija</button>
            <button type="button" class="p2-secondary p2-student-restore-inline" data-student-restore title="Atkurti duomenis arba po naršyklės duomenų išvalymo vėl prijungti mokytojo profilį">↥ Atkurti</button>
          </div>
        </div>
        <div class="p2-students-overview-groups">${overviewMarkup}</div>
      </section>`;

    if (studentCreateOpen) {
      detailMarkup = `
        <section class="p2-student-create-page">
          <div class="p2-student-page-head">
            <button type="button" class="p2-back-link" data-student-overview>← Visi mokiniai</button>
            <div><span class="p2-label">Naujas mokinys</span><h3>Sukurti mokinio kortelę</h3><p>Vardas ir klasė bus naudojami mokinių bazėje. Tėčio, mamos ar globėjo informacija matoma tik mokytojui.</p></div>
          </div>
          <div class="p2-student-create-card">
            <div class="p2-student-create-page-grid">
              <label class="p2-create-student-name"><span>Vardas</span><input id="p2NewStudentName" maxlength="80" placeholder="Vardas"></label>
              <label class="p2-create-grade"><span>Klasė</span><select id="p2NewStudentGrade">${gradeOptions(0)}</select></label>
              <div class="p2-guardian-row p2-create-guardian-row">
                <label class="p2-create-relation"><span>Ryšys</span><select id="p2NewStudentGuardianRelation">${guardianRelationOptions('')}</select></label>
                <label class="p2-create-guardian-custom" data-new-guardian-custom-field hidden><span>Kas tai?</span><input id="p2NewStudentGuardianCustom" maxlength="40" placeholder="Pvz. globėja, močiutė"></label>
                <label class="p2-create-guardian-name"><span>Vardas</span><input id="p2NewStudentGuardianName" maxlength="80" placeholder="Tėčio, mamos ar globėjo vardas"></label>
              </div>
            </div>
            <div class="p2-student-create-page-footer"><button type="button" class="p2-secondary" data-student-overview>Atšaukti</button><button type="button" class="p2-primary" data-student-add>Sukurti mokinį</button></div>
          </div>
        </section>`;
    } else if (selected) {
      const selectedGrade = studentGradeValue(selected.grade);
      const selectedRelation = studentGuardianRelation(selected.guardianRelation);
      const guardianLabel = studentGuardianLabel(selected);
      const cardMeta = [selectedGrade ? `${selectedGrade} klasė` : 'Klasė nenurodyta', guardianLabel ? `${guardianLabel} · tik mokytojui` : '', `Sukurta ${formatStudentDate(selected.createdAt, true)}`].filter(Boolean).join(' · ');
      const lessonOptions = LESSON_CATALOG.map(lesson => `<option value="${escapeHtml(lesson.id)}" ${lesson.id === defaultLessonId ? 'selected' : ''}>${escapeHtml(lesson.shortTitle)} · ${lesson.taskCount} užd.</option>`).join('');
      const relationDisplay = selectedRelation === 'mama' ? 'Mama' : selectedRelation === 'tėtis' ? 'Tėtis' : selectedRelation === 'kita' ? (String(selected.guardianCustomRelation || '').trim() || 'Kita') : 'Nenurodyta';
      const guardianNameDisplay = String(selected.guardianName || '').trim() || 'Nenurodytas';
      const participantRoomId = String(selectedClassParticipant?.roomId || '').trim().toUpperCase();
      const participantLesson = participantRoomId ? (selected?.lessons?.[participantRoomId] || null) : null;
      const activeCandidateRoomId = selectedOwnsActiveRoom ? roomId : (selectedClassParticipant && participantRoomId ? participantRoomId : '');
      const activeCandidateLesson = activeCandidateRoomId ? (selected?.lessons?.[activeCandidateRoomId] || (activeCandidateRoomId === roomId ? currentLesson : participantLesson) || null) : null;
      const activeCandidateState = activeCandidateLesson ? studentLessonOccurrenceState(activeCandidateLesson) : { known: false, state: '' };
      const timedRunningLesson = history.find(item => {
        const state = studentLessonOccurrenceState(item);
        return state.known && state.state === 'running';
      }) || null;
      // Aktyvi classSession pati savaime nebereiškia „Vyksta“. Jei turime
      // konkrečią datą ir laiką, ši būsena galioja tik realiame pamokos lange.
      // Seniems nesuplanuotiems Room paliekame ankstesnį aktyvaus Room elgesį.
      const runningRoomId = activeCandidateRoomId && (!activeCandidateState.known || activeCandidateState.state === 'running')
        ? activeCandidateRoomId
        : String(timedRunningLesson?.roomId || '').trim().toUpperCase();
      const runningLesson = runningRoomId
        ? (selected?.lessons?.[runningRoomId] || (runningRoomId === activeCandidateRoomId ? activeCandidateLesson : timedRunningLesson) || null)
        : null;
      const runningIsOpenRoom = Boolean(runningRoomId && runningRoomId === roomId);
      const runningExpanded = Boolean(runningRoomId && expandedStudentHistoryRoomId === runningRoomId);
      const pastHistory = history.filter(item => {
        if (runningRoomId && item.roomId === runningRoomId) return false;
        const state = studentLessonOccurrenceState(item);
        if (state.known) return state.state === 'past';
        return true;
      });
      const upcomingLessons = studentUpcomingScheduleLessons(selectedStudentId);

      const runningMarkup = runningRoomId ? (() => {
        const runningSummary = runningLesson?.summary && typeof runningLesson.summary === 'object' ? runningLesson.summary : {};
        const percent = Math.max(0, Math.min(100, Number(runningSummary.percent || 0)));
        const openAttribute = runningIsOpenRoom
          ? `data-student-open-room="${escapeHtml(runningRoomId)}" data-room-role="teacher"`
          : `data-student-switch-class-room="${escapeHtml(runningRoomId)}"`;
        const practice = studentPracticeLabel(runningLesson || {});
        const runningClassSessionId = String(runningLesson?.classSessionId || linkedClassSessionIdForRoom(runningRoomId) || '').trim();
        const runningTitle = String(teacherStudentDb.classSessions?.[runningClassSessionId]?.label || '').trim() || 'Pamoka';
        const canAssignPractice = runningIsOpenRoom && !runningLesson?.lessonId;
        return `<div class="p2-student-lessons-group is-running-group">
          <div class="p2-student-lessons-group-title"><span>Vykstanti pamoka</span></div>
          <article class="p2-student-lesson-card is-running ${runningExpanded ? 'is-expanded' : ''}">
            <div class="p2-student-lesson-state"><span class="p2-student-lesson-dot" aria-hidden="true"></span><strong>Vyksta</strong></div>
            <div class="p2-student-lesson-card-main">
              <div class="p2-student-lesson-card-title"><strong>${escapeHtml(runningTitle)}</strong>${runningLesson?.scheduleMode && scheduleMode(runningLesson) !== 'weekly' ? `<span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(runningLesson))}">${escapeHtml(scheduleModeLabel(runningLesson, true))}</span>` : ''}<span>${escapeHtml(studentTeacherLabel(selected, students))}</span></div>
              <p>${escapeHtml(studentLessonWhenLabel(runningLesson || {}))} · Room <code>${escapeHtml(runningRoomId)}</code></p>
              <div class="p2-student-lesson-content"><span>Pamokos turinys</span><strong>${escapeHtml(practice)}</strong></div>
              ${runningLesson?.lessonId ? `<div class="p2-student-history-progress"><i><b style="width:${percent}%"></b></i><strong>${escapeHtml(studentLessonResultText(runningLesson))}</strong></div>` : ''}
              ${canAssignPractice ? `<div class="p2-student-assign-row is-in-lesson-card"><label><span>Pridėti pratybas į šią pamoką</span><select id="p2StudentLessonSelect"><option value="">Tik lenta</option>${lessonOptions}</select></label><button type="button" class="p2-primary" data-student-link-current>Priskirti pratybas</button></div>` : ''}
            </div>
            <div class="p2-student-lesson-card-actions">
              ${runningLesson ? `<button type="button" class="p2-history-detail-toggle ${runningExpanded ? 'is-open' : ''}" data-student-history-toggle="${escapeHtml(runningRoomId)}">${runningExpanded ? 'Slėpti detales' : 'Pamokos detalės'}</button>` : ''}
              <button type="button" class="p2-primary" ${openAttribute}>Atidaryti pamoką</button>
            </div>
            ${runningLesson ? renderStudentRoomHistoryDetails(selected, { roomId: runningRoomId, ...runningLesson }) : ''}
          </article>
        </div>`;
      })() : '';

      const upcomingMarkup = upcomingLessons.length ? `<div class="p2-student-lessons-group is-upcoming-group">
        <div class="p2-student-lessons-group-title"><span>Vyksiančios pamokos</span><strong>${upcomingLessons.length}</strong></div>
        ${upcomingLessons.map(entry => {
          const title = String(entry.label || '').trim() || 'Pamoka';
          return `<article class="p2-student-lesson-card is-upcoming">
            <div class="p2-student-lesson-state"><span class="p2-student-lesson-dot" aria-hidden="true"></span><strong>Numatyta</strong></div>
            <div class="p2-student-lesson-card-main">
              <div class="p2-student-lesson-card-title"><strong>${escapeHtml(title)}</strong><span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(entry))}">${escapeHtml(scheduleModeLabel(entry, true))}</span></div>
              <p>${escapeHtml(studentScheduledLessonWhenLabel(entry))}</p>
              <div class="p2-student-lesson-content"><span>Pamokos turinys</span><strong>${escapeHtml(studentPracticeLabel(entry))}</strong></div>
            </div>
            <div class="p2-student-lesson-card-actions"><button type="button" data-student-open-schedule="${escapeHtml(entry.id)}" data-student-open-schedule-date="${escapeHtml(entry.occurrenceDateKey || '')}">Tvarkyti laiką</button></div>
          </article>`;
        }).join('')}
      </div>` : '';

      const pastMarkup = pastHistory.length ? `<div class="p2-student-lessons-group is-past-group">
        <div class="p2-student-lessons-group-title"><span>Įvykusios pamokos</span><strong>${pastHistory.length}</strong></div>
        ${pastHistory.map(item => {
          const title = String(teacherStudentDb.classSessions?.[item.classSessionId]?.label || '').trim() || 'Pamoka';
          const summary = item.summary && typeof item.summary === 'object' ? item.summary : {};
          const percent = Math.max(0, Math.min(100, Number(summary.percent || 0)));
          const practiceStatus = studentLessonStatus(item);
          const expanded = expandedStudentHistoryRoomId === item.roomId;
          const resultDetails = item.lessonId
            ? [`Savarankiškai ${Math.max(0, Number(summary.good || 0))}`, `Su pagalba ${Math.max(0, Number(summary.help || 0))}`, `Kartoti ${Math.max(0, Number(summary.repeat || 0))}`].join(' · ')
            : '';
          return `<article class="p2-student-lesson-card is-past ${expanded ? 'is-expanded' : ''}">
            <div class="p2-student-lesson-state"><span class="p2-student-lesson-dot" aria-hidden="true"></span><strong>Įvyko</strong></div>
            <div class="p2-student-lesson-card-main">
              <div class="p2-student-lesson-card-title"><strong>${escapeHtml(title)}</strong>${item?.scheduleMode && scheduleMode(item) !== 'weekly' ? `<span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(item))}">${escapeHtml(scheduleModeLabel(item, true))}</span>` : ''}<span class="p2-student-lesson-status is-${escapeHtml(practiceStatus.key)}">${escapeHtml(practiceStatus.label)}</span></div>
              <p>${escapeHtml(studentLessonWhenLabel(item))} · Room <code>${escapeHtml(item.roomId)}</code></p>
              <div class="p2-student-lesson-content"><span>Pamokos turinys</span><strong>${escapeHtml(studentPracticeLabel(item))}</strong></div>
              ${item.lessonId ? `<div class="p2-student-history-progress"><i><b style="width:${percent}%"></b></i><strong>${escapeHtml(studentLessonResultText(item))}</strong>${resultDetails ? `<span>${escapeHtml(resultDetails)}</span>` : ''}</div>` : ''}
            </div>
            <div class="p2-student-lesson-card-actions">
              <button type="button" class="p2-history-detail-toggle ${expanded ? 'is-open' : ''}" data-student-history-toggle="${escapeHtml(item.roomId)}">${expanded ? 'Slėpti detales' : 'Pamokos detalės'}</button>
              <button type="button" data-student-open-room="${escapeHtml(item.roomId)}" data-room-role="teacher">Atidaryti pamoką</button>
              <button class="is-secondary" type="button" data-student-open-room="${escapeHtml(item.roomId)}" data-room-role="student">Mokinio vaizdas</button>
              <button class="is-muted" type="button" data-student-unlink-room="${escapeHtml(item.roomId)}">Pašalinti iš istorijos</button>
            </div>
            ${renderStudentRoomHistoryDetails(selected, item)}
          </article>`;
        }).join('')}
      </div>` : '';

      const lessonsTimelineMarkup = (runningMarkup || upcomingMarkup || pastMarkup)
        ? `${runningMarkup}${upcomingMarkup}${pastMarkup}`
        : `<div class="p2-student-history-empty">Šiam mokiniui dar nėra suplanuotų ar įvykusių pamokų.</div>`;

      detailMarkup = `
        <button type="button" class="p2-back-link p2-student-detail-back" data-student-overview>← Visi mokiniai</button>
        <div class="p2-student-card-head">
          <div class="p2-student-avatar is-large" aria-hidden="true">${escapeHtml(String(selected.name || 'M').trim().slice(0, 1).toUpperCase() || 'M')}</div>
          <div><span class="p2-label">Mokinio kortelė</span><h3>${escapeHtml(selected.name || 'Mokinys')}</h3><p>${escapeHtml(cardMeta)}</p></div>
          ${studentEditOpen ? '' : '<button class="p2-secondary p2-student-edit-open" type="button" data-student-edit-open>Redaguoti informaciją</button>'}
        </div>
        ${studentEditOpen ? `<section class="p2-student-edit-card is-active">
          <div class="p2-student-edit-grid">
            <label class="p2-edit-student-name"><span>Vardas</span><input id="p2StudentNameEdit" value="${escapeHtml(selected.name || '')}" maxlength="80"></label>
            <label class="p2-student-grade-field p2-edit-grade"><span>Klasė</span><select id="p2StudentGradeEdit">${gradeOptions(selectedGrade)}</select></label>
            <div class="p2-guardian-row p2-edit-guardian-row">
              <label class="p2-edit-relation"><span>Ryšys</span><select id="p2StudentGuardianRelationEdit">${guardianRelationOptions(selectedRelation)}</select></label>
              <label class="p2-edit-guardian-custom" data-guardian-custom-field ${selectedRelation === 'kita' ? '' : 'hidden'}><span>Kas tai?</span><input id="p2StudentGuardianCustomEdit" value="${escapeHtml(selected.guardianCustomRelation || '')}" maxlength="40" placeholder="Pvz. globėja, močiutė"></label>
              <label class="p2-edit-guardian-name"><span>Vardas</span><input id="p2StudentGuardianNameEdit" value="${escapeHtml(selected.guardianName || '')}" maxlength="80" placeholder="Tėčio, mamos ar globėjo vardas"></label>
            </div>
            <label class="p2-student-notes-field"><span>Pastabos</span><textarea id="p2StudentNotesEdit" maxlength="600" placeholder="Nebūtina">${escapeHtml(selected.notes || '')}</textarea></label>
          </div>
          <div class="p2-student-edit-footer"><span>Tėčio / mamos / globėjo duomenys saugomi tik mokytojo mokinių bazėje ir į mokinio Room nekopijuojami.</span><div class="p2-student-edit-actions"><button type="button" class="p2-student-danger" data-student-delete>Pašalinti mokinį</button><button type="button" class="p2-secondary" data-student-edit-cancel>Atšaukti</button><button type="button" class="p2-primary" data-student-save>Įrašyti pakeitimus</button></div></div>
        </section>` : `<section class="p2-student-info-card">
          <div class="p2-student-info-grid">
            <div class="p2-student-info-item"><span>Vardas</span><strong>${escapeHtml(selected.name || '—')}</strong></div>
            <div class="p2-student-info-item"><span>Klasė</span><strong>${selectedGrade ? `${selectedGrade} klasė` : 'Nenurodyta'}</strong></div>
            <div class="p2-student-info-item"><span>Ryšys</span><strong>${escapeHtml(relationDisplay)}</strong></div>
            <div class="p2-student-info-item"><span>Tėčio / mamos / globėjo vardas</span><strong>${escapeHtml(guardianNameDisplay)}</strong></div>
            <div class="p2-student-info-item is-notes"><span>Pastabos</span><strong>${escapeHtml(String(selected.notes || '').trim() || 'Pastabų nėra')}</strong></div>
          </div>
          <p class="p2-student-info-private">Tėčio / mamos / globėjo duomenys matomi tik mokytojui ir į mokinio Room nekopijuojami.</p>
        </section>`}
        <section class="p2-student-history p2-student-lessons">
          <div class="p2-student-section-heading"><div><span class="p2-label">Pamokos</span><h3>Mokinio pamokos</h3><p>Tvarkaraštis ir mokinio kortelė naudoja tą patį pamokos įrašą.</p></div><button type="button" class="p2-secondary" data-student-schedule-new>＋ Priskirti pamokos laiką</button></div>
          <div class="p2-student-lessons-stack">${lessonsTimelineMarkup}</div>
        </section>`;
    }

    return { html: `<main class="p2-student-detail-pane p2-student-detail-pane-full">${detailMarkup}</main>`, studentGradeFilter };
  }

  window.P772StudentsUI = Object.freeze({
    createStudentsModal,
    renderStudentsBodyMarkup
  });
})();
