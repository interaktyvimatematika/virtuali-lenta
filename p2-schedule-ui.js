(() => {
  'use strict';

  // M1.5: pure Schedule modal/week/editor markup extracted from p2-ui.js.
  // Schedule state changes, Room creation, event handlers and Firebase communication
  // intentionally remain in p2-ui.js.

  function createScheduleModal(doc = document) {
    const modal = doc.createElement('div');
    modal.className = 'p2-schedule-modal';
    modal.hidden = true;
    modal.innerHTML = `
      <div class="p2-schedule-backdrop" data-schedule-close></div>
      <section class="p2-schedule-panel" role="dialog" aria-modal="true" aria-label="Pamokų tvarkaraštis">
        <header class="p2-schedule-header">
          <div><span class="p2-side-kicker">PAMOKŲ PLANAS</span><h2>Tvarkaraštis</h2><p>Pirmiausia sukurk pamokų laikus. Mokinius prie jų priskirk atskirai – tas pats mokinys gali turėti kelis laikus ir papildomas pavienes pamokas.</p></div>
          <button type="button" data-schedule-close aria-label="Uždaryti">×</button>
        </header>
        <div class="p2-schedule-body">
          <main class="p2-schedule-week-pane" id="p2ScheduleWeekPane"></main>
          <aside class="p2-schedule-editor-pane" id="p2ScheduleEditorPane"></aside>
        </div>
      </section>`;
    return modal;
  }

  function renderScheduleWeekMarkup(ctx = {}) {
    const {
      weekDates = [], entries = [], todayKey = '', selectedDateKey = '',
      editingScheduleId = '', editingScheduleDateKey = '', scheduleRuns = {},
      scheduleCreatePreset = null, students = [], hasEditing = false,
      scheduleSlotOccursOnDate, scheduleSlotTimeForDate, scheduleStudentNames,
      scheduleOccurrenceState, lessonForId, scheduleOccurrenceConflict,
      scheduleModeLabel, formatScheduleClock, studentRecord,
      scheduleStudentTeacherLabel, escapeHtml
    } = ctx;

    let occurrenceCount = 0;
    const dayColumns = weekDates.map(day => {
      const dayEntries = entries.filter(entry => scheduleSlotOccursOnDate(entry, day.dateKey));
      occurrenceCount += dayEntries.length;
      const cards = dayEntries.length ? dayEntries.map(entry => {
        const time = scheduleSlotTimeForDate(entry, day.dateKey) || {};
        const active = scheduleStudentNames(entry, day.dateKey);
        const run = scheduleRuns?.[entry.id]?.[day.dateKey] || null;
        const occurrenceState = scheduleOccurrenceState(entry, day.dateKey);
        const practice = entry.lessonId ? (entry.practiceTitle || lessonForId(entry.lessonId)?.shortTitle || 'Pratybos') : '';
        const label = String(entry.label || '').trim() || 'Pamokos laikas';
        const conflict = scheduleOccurrenceConflict(entry, day.dateKey);
        return `<article class="p2-schedule-card ${editingScheduleId === entry.id && editingScheduleDateKey === day.dateKey ? 'is-editing' : ''} ${run ? 'is-started' : ''} ${conflict ? 'has-conflict' : ''}" data-schedule-card="${escapeHtml(entry.id)}" data-schedule-date="${escapeHtml(day.dateKey)}">
          <div class="p2-schedule-card-time"><strong>${escapeHtml(time.start || '—')}</strong><span>${Math.max(15, Number(time.durationMinutes || 40))} min.</span></div>
          <div class="p2-schedule-card-copy">
            <h4>${escapeHtml(label)}</h4>
            <div class="p2-schedule-card-students">${active.length ? active.map(item => `<span>${escapeHtml(item.name)} <small>${escapeHtml(scheduleModeLabel({ mode: item.mode }, true))}</small></span>`).join('') : '<em>Laisvas laikas · mokinių šiai datai nėra</em>'}</div>
            ${practice ? `<p>▦ ${escapeHtml(practice)}</p>` : '<p>□ Tik lenta</p>'}
            ${run ? `<small>${occurrenceState.state === 'past' ? '✓ Įvyko' : occurrenceState.state === 'running' ? '● Vyksta' : '◷ Atidaryta'}${run.startedAt ? ` · ${escapeHtml(formatScheduleClock(run.startedAt || 0))}` : ''}</small>` : ''}
            ${conflict ? '<small class="p2-schedule-conflict">⚠ Persidengia su kitu laiku</small>' : ''}
          </div>
        </article>`;
      }).join('') : '<div class="p2-schedule-day-empty">Pamokų laikų nėra</div>';
      const isToday = day.dateKey === todayKey;
      let monthDay = day.dateKey.slice(5);
      try { monthDay = new Intl.DateTimeFormat('lt-LT', { month: '2-digit', day: '2-digit' }).format(day.date); } catch (_) {}
      return `<section class="p2-schedule-day ${isToday ? 'is-today' : ''} ${day.dateKey === selectedDateKey ? 'is-selected' : ''}" data-schedule-day="${day.id}" data-schedule-date="${escapeHtml(day.dateKey)}">
        <header data-schedule-select-date="${escapeHtml(day.dateKey)}"><span>${escapeHtml(day.short)}</span><strong>${escapeHtml(monthDay)}</strong>${isToday ? '<b>Šiandien</b>' : ''}</header>
        <div class="p2-schedule-day-list">${cards}</div>
      </section>`;
    }).join('');

    let weekLabel = `${weekDates[0]?.dateKey || ''} – ${weekDates[6]?.dateKey || ''}`;
    try {
      const formatter = new Intl.DateTimeFormat('lt-LT', { month: 'short', day: '2-digit' });
      weekLabel = `${formatter.format(weekDates[0]?.date)} – ${formatter.format(weekDates[6]?.date)}`;
    } catch (_) {}
    const presetStudent = scheduleCreatePreset?.studentId ? studentRecord(scheduleCreatePreset.studentId) : null;
    const assignHint = presetStudent && !hasEditing
      ? `<div class="p2-schedule-assignment-hint"><strong>Priskiriamas mokinys: ${escapeHtml(scheduleStudentTeacherLabel(presetStudent, students))}</strong><span>Pasirink vieną iš sukurtų pamokos laikų.</span></div>`
      : '';

    return `
      <div class="p2-schedule-week-toolbar">
        <div><span class="p2-label">Savaitė</span><strong>${escapeHtml(weekLabel)} · ${occurrenceCount} ${occurrenceCount === 1 ? 'laikas' : 'laikai'}</strong></div>
        <div class="p2-schedule-week-nav">
          <button type="button" class="p2-secondary" data-schedule-prev-week>←</button>
          <button type="button" class="p2-secondary" data-schedule-this-week>Ši savaitė</button>
          <button type="button" class="p2-secondary" data-schedule-next-week>→</button>
          <button type="button" class="p2-primary" data-schedule-new>＋ Naujas pamokos laikas</button>
        </div>
      </div>
      ${assignHint}
      <div class="p2-schedule-week-grid">${dayColumns}</div>`;
  }

  function dayOptionsMarkup(days, selectedDay, escapeHtml) {
    return days.map(day => `<option value="${day.id}" ${day.id === selectedDay ? 'selected' : ''}>${escapeHtml(day.label)}</option>`).join('');
  }

  function lessonOptionsMarkup(lessons, selectedId, escapeHtml) {
    return lessons.map(lesson => `<option value="${escapeHtml(lesson.id)}" ${lesson.id === selectedId ? 'selected' : ''}>${escapeHtml(lesson.shortTitle)} · ${lesson.taskCount} užd.</option>`).join('');
  }

  function studentOptionsMarkup(students, selectedId, scheduleStudentTeacherLabel, escapeHtml) {
    return students.length
      ? students.map(student => `<option value="${escapeHtml(student.id)}" ${student.id === selectedId ? 'selected' : ''}>${escapeHtml(scheduleStudentTeacherLabel(student, students))}</option>`).join('')
      : '<option value="">Mokinių dar nėra</option>';
  }

  function renderScheduleCreateEditorMarkup(ctx = {}) {
    const {
      effectiveFrom = '', day = 1, defaultStart = '16:00',
      SCHEDULE_DAYS = [], LESSON_CATALOG = [], escapeHtml
    } = ctx;
    return `
        <div class="p2-schedule-editor-head"><button type="button" class="p2-schedule-editor-close" data-schedule-editor-close>×</button><span class="p2-label">NAUJAS PAMOKOS LAIKAS</span><h3>Sukurti pamokos laiką</h3><p class="p2-schedule-editor-note">Čia kuriamas pats laikas. Mokinius priskirsi tik po to.</p></div>
        <div class="p2-schedule-form">
          <label><span>Pavadinimas <small>nebūtina</small></span><input id="p2ScheduleLabel" maxlength="80" placeholder="Pvz. Vakarinė pamoka"></label>
          <div class="p2-schedule-form-row two"><label><span>Galioja nuo</span><input id="p2ScheduleEffectiveFrom" type="date" value="${escapeHtml(effectiveFrom)}"></label><label><span>Savaitės diena</span><select id="p2ScheduleDay">${dayOptionsMarkup(SCHEDULE_DAYS, day, escapeHtml)}</select></label></div>
          <div class="p2-schedule-form-row two"><label><span>Pradžia</span><input id="p2ScheduleStart" type="time" value="${escapeHtml(defaultStart)}" step="300"></label><label><span>Trukmė (min.)</span><input id="p2ScheduleDuration" type="number" min="15" max="180" step="5" value="40"></label></div>
          <label><span>Numatytos pratybos <small>nebūtina</small></span><select id="p2ScheduleLesson"><option value="">Tik lenta / pratybas priskirsiu vėliau</option>${lessonOptionsMarkup(LESSON_CATALOG, '', escapeHtml)}</select></label>
          <div class="p2-schedule-form-actions p2-schedule-form-actions-single"><span></span><button type="button" class="p2-primary" data-schedule-create>Sukurti pamokos laiką</button></div>
        </div>`;
  }

  function renderScheduleEditEditorMarkup(ctx = {}) {
    const {
      selectedDate = '', time = {}, assignments = [], activeAssignments = [], run = null,
      occurrenceState = {}, runRooms = [], presetId = '', versions = [], closureRanges = [],
      retiredFrom = '', label = '', editing = {}, students = [],
      SCHEDULE_DAYS = [], LESSON_CATALOG = [], scheduleMode, scheduleModeLabel,
      scheduleAssignmentSummary, scheduleStudentTeacherLabel, studentRecord,
      scheduleAddDays, escapeHtml
    } = ctx;

    const assignmentRows = assignments.length ? assignments.map(item => {
      const student = studentRecord(item.studentId);
      return `<div class="p2-schedule-assignment-row"><div><strong>${escapeHtml(scheduleStudentTeacherLabel(student, students))}</strong><span class="p2-student-lesson-status is-${escapeHtml(scheduleMode(item))}">${escapeHtml(scheduleModeLabel(item, true))}</span><small>${escapeHtml(scheduleAssignmentSummary(item))}</small></div>${item.legacy ? '<em>Senas įrašas</em>' : `<button type="button" class="is-muted" data-schedule-assignment-delete="${escapeHtml(item.id)}">Pašalinti</button>`}</div>`;
    }).join('') : '<div class="p2-schedule-no-students">Mokiniai dar nepriskirti.</div>';

    const versionRows = versions.map((item, index) => {
      const technicalLegacyDate = item.id === '__legacy__' || String(item.effectiveFrom || '') === '2000-01-01';
      const versionLabel = technicalLegacyDate && index === 0 ? 'Pradinis laikas' : `Nuo ${escapeHtml(item.effectiveFrom)}`;
      return `<div class="p2-schedule-time-version ${technicalLegacyDate ? 'is-legacy' : ''}"><strong>${versionLabel}</strong><span>${escapeHtml(SCHEDULE_DAYS.find(day => day.id === Number(item.day))?.label || '')} · ${escapeHtml(item.start)} · ${Math.max(15, Number(item.durationMinutes || 40))} min.</span></div>`;
    }).join('');
    const closureRows = closureRanges.length ? closureRanges.map(item => `<div class="p2-schedule-time-version is-closed"><strong>Nevyksta ${escapeHtml(item.fromDate)}–${escapeHtml(item.toDate)}</strong><span>Po šio intervalo laikas ir jo mokinių priskyrimai automatiškai grįžta.</span><button type="button" class="is-muted" data-schedule-closure-delete="${escapeHtml(item.id)}">Atšaukti išimtį</button></div>`).join('') : '';

    return `
        <div class="p2-schedule-editor-head"><button type="button" class="p2-schedule-editor-close" data-schedule-editor-close>×</button><span class="p2-label">PAMOKOS LAIKAS</span><h3>${escapeHtml(label || `${time.start} · ${SCHEDULE_DAYS.find(day => day.id === Number(time.day))?.label || ''}`)}</h3><p class="p2-schedule-editor-note">Laiko išimtys nekeičia praeities pamokų istorijos ir neliečia kitų mokinių priskyrimų prie kitų laikų.</p></div>
        <div class="p2-schedule-form p2-schedule-slot-editor">
          <section class="p2-schedule-editor-section"><h4>Pamokos laikas</h4>
            <div class="p2-schedule-current-time"><span>Pasirinkta data</span><strong>${escapeHtml(selectedDate)} · ${escapeHtml(time.start)} · ${Math.max(15, Number(time.durationMinutes || 40))} min.</strong></div>
            <div class="p2-schedule-time-history">${versionRows}${closureRows}${retiredFrom ? `<div class="p2-schedule-time-version is-closed"><strong>Panaikintas nuo ${escapeHtml(retiredFrom)}</strong><span>Nuo šios datos šis pamokos laikas nebegrįžta. Kiti mokinių laikai neliečiami.</span></div>` : ''}</div>
            <details class="p2-schedule-change-time p2-schedule-time-manager" data-schedule-time-manager>
              <summary>Tvarkyti pamokos laiką</summary>
              <label><span>Veiksmas</span><select id="p2ScheduleTimeManageAction"><option value="temporary">Laikinai pašalinti nuo–iki</option>${retiredFrom ? '' : '<option value="retire">Panaikinti nuo datos</option>'}</select></label>
              <div class="p2-schedule-time-manage-pane" data-time-manage-temporary>
                <small>Šiuo laikotarpiu pats laikas tvarkaraštyje nevyksta. Jo nuolatiniai mokinių priskyrimai išlieka ir po intervalo automatiškai vėl galioja. Kiti tų mokinių pamokų laikai neliečiami.</small>
                <div class="p2-schedule-form-row two"><label><span>Nuo</span><input id="p2ScheduleCloseFrom" type="date" value="${escapeHtml(selectedDate)}"></label><label><span>Iki</span><input id="p2ScheduleCloseTo" type="date" value="${escapeHtml(selectedDate)}"></label></div>
                <button type="button" class="p2-student-danger" data-schedule-close-range>Laikinai pašalinti laiką</button>
              </div>
              ${retiredFrom ? '' : `<div class="p2-schedule-time-manage-pane" data-time-manage-retire hidden>
                <small>Praeities pamokos ir Room lieka istorijoje. Nuo pasirinktos datos panaikinamas tik šis pamokos laikas. Kiti mokinio priskyrimai išlieka, o šio laiko mokinius gali atskirai priskirti naujiems laikams.</small>
                <label><span>Nuo datos</span><input id="p2ScheduleRetireFrom" type="date" value="${escapeHtml(selectedDate)}"></label>
                <button type="button" class="p2-student-danger" data-schedule-close-forever>Panaikinti laiką nuo datos</button>
              </div>`}
            </details>
          </section>
          <section class="p2-schedule-editor-section"><h4>Pamokos informacija</h4><label><span>Pavadinimas <small>nebūtina</small></span><input id="p2ScheduleLabel" maxlength="80" value="${escapeHtml(label)}"></label><label><span>Numatytos pratybos <small>nebūtina</small></span><select id="p2ScheduleLesson"><option value="">Tik lenta / pratybas priskirsiu vėliau</option>${lessonOptionsMarkup(LESSON_CATALOG, String(editing.lessonId || ''), escapeHtml)}</select></label><button type="button" class="p2-secondary" data-schedule-meta-save>Išsaugoti informaciją</button></section>
          <section class="p2-schedule-editor-section"><div class="p2-schedule-section-title"><h4>Mokinių priskyrimai šiame laike</h4><span>${assignments.length}</span></div><p class="p2-schedule-editor-note">Tas pats mokinys gali būti priskirtas ir keliems kitiems pamokų laikams. Šio sąrašo pakeitimai jų neliečia.</p><div class="p2-schedule-assignments">${assignmentRows}</div>
            <div class="p2-schedule-assignment-form"><h5>Pridėti priskyrimą</h5><label><span>Mokinys</span><select id="p2ScheduleAssignStudent"><option value="">Pasirink mokinį</option>${studentOptionsMarkup(students, presetId, scheduleStudentTeacherLabel, escapeHtml)}</select></label><label><span>Lankymo režimas</span><select id="p2ScheduleAssignMode"><option value="recurring">Nuolatinis</option><option value="dates">Pavienės pamokos</option><option value="intro">Pažintinė pamoka</option><option value="final">Paskutinė pamoka</option></select></label>
              <div data-assignment-recurring><label><span>Lanko nuo</span><input id="p2ScheduleAssignStartDate" type="date" value="${escapeHtml(selectedDate)}"></label><small>Nuolatinis laikas neturi pabaigos datos. Jis galioja, kol mokinio priskyrimas nepakeičiamas arba nepažymima paskutinė pamoka.</small></div>
              <div data-assignment-dates hidden><label><span>Pavienių datų įvedimas</span><select id="p2ScheduleDatesMethod"><option value="exact">Atskiros datos</option><option value="interval">Intervalas</option></select></label><div data-dates-exact><div id="p2ScheduleExactDates"><label><span>Data</span><input type="date" class="p2-schedule-exact-date" value="${escapeHtml(selectedDate)}"></label></div><button type="button" class="p2-secondary" data-schedule-date-add>＋ Pridėti datą</button></div><div data-dates-interval hidden><div class="p2-schedule-form-row two"><label><span>Nuo</span><input id="p2ScheduleIntervalFrom" type="date" value="${escapeHtml(selectedDate)}"></label><label><span>Iki</span><input id="p2ScheduleIntervalTo" type="date" value="${escapeHtml(scheduleAddDays(selectedDate, 28))}"></label></div><label><span>Dažnis</span><select id="p2ScheduleIntervalWeeks"><option value="1">Kas savaitę</option><option value="2">Kas 2 savaites</option><option value="3">Kas 3 savaites</option><option value="4">Kas 4 savaites</option></select></label></div></div>
              <div data-assignment-exact hidden><label><span>Data</span><input id="p2ScheduleAssignDate" type="date" value="${escapeHtml(selectedDate)}"></label><small data-assignment-final-help hidden>„Paskutinė pamoka“ reiškia, kad nuo šios datos mokinys apskritai nebetęsia ankstesnių priskyrimų. Jei nori panaikinti tik vieną jo nuolatinį laiką, pašalink tik tą konkretų priskyrimą.</small></div>
              <button type="button" class="p2-primary" data-schedule-assignment-add>Priskirti mokinį</button>
            </div>
          </section>
          <section class="p2-schedule-editor-section"><h4>${escapeHtml(selectedDate)} pamoka</h4><div class="p2-schedule-open-box ${run && occurrenceState.state === 'running' ? 'is-running' : ''}"><div><strong>${run ? (occurrenceState.state === 'past' ? 'Pamoka įvyko' : occurrenceState.state === 'running' ? 'Pamoka vyksta' : 'Pamoka atidaryta') : (occurrenceState.state === 'past' ? 'Pamokos laikas jau praėjo' : activeAssignments.length ? `${activeAssignments.length} mok. šią datą` : 'Šią datą mokinių nėra')}</strong><span>${activeAssignments.length ? activeAssignments.map(item => `${scheduleStudentTeacherLabel(studentRecord(item.studentId), students)} · ${scheduleModeLabel(item, true)}`).join(' · ') : 'Priskirk mokinius šiai datai.'}</span></div><button type="button" class="p2-primary" data-schedule-open-lesson ${(runRooms.length || (activeAssignments.length && occurrenceState.state !== 'past')) ? '' : 'disabled'}>${runRooms.length ? 'Atidaryti pamoką' : occurrenceState.state === 'past' ? 'Pamoka įvyko' : 'Atidaryti pamoką'}</button></div></section>
        </div>`;
  }

  window.P772ScheduleUI = Object.freeze({
    createScheduleModal,
    renderScheduleWeekMarkup,
    renderScheduleCreateEditorMarkup,
    renderScheduleEditEditorMarkup
  });
})();
