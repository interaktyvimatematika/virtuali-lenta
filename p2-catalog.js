(() => {
  'use strict';

  // M1.2 + P3.2.1: lesson-catalog / assignment-content helpers.
  // Built-in lessons stay immutable; teacher-created lessons are injected at runtime.
  const P2_DATA_SCHEMA_VERSION = 1;
  const builtInLessons = window.P772BuiltInLessons;
  const BUILT_IN_LESSON_CATALOG = Array.isArray(builtInLessons?.LESSON_CATALOG)
    ? builtInLessons.LESSON_CATALOG
    : [];
  let customLessons = [];

  function normalizeCustomLesson(raw) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const id = String(raw.id || raw.lessonId || '').trim();
    const tasks = Array.isArray(raw.tasks) ? raw.tasks.filter(task => task && typeof task === 'object') : [];
    if (!id || !tasks.length) return null;
    const classCount = tasks.filter(task => task?.section === 'class').length;
    const selfCount = tasks.filter(task => task?.section === 'self').length;
    return {
      ...raw,
      id,
      lessonId: id,
      source: 'custom',
      isCustom: true,
      contentVersion: Math.max(1, Math.round(Number(raw.contentVersion) || 1)),
      title: String(raw.title || raw.shortTitle || 'Mano pratybos').trim() || 'Mano pratybos',
      shortTitle: String(raw.shortTitle || raw.title || 'Mano pratybos').trim() || 'Mano pratybos',
      description: String(raw.description || '').trim(),
      taskCount: tasks.length,
      classCount,
      selfCount,
      tasks: JSON.parse(JSON.stringify(tasks))
    };
  }

  function setCustomLessons(value) {
    const records = Array.isArray(value)
      ? value
      : Object.values(value && typeof value === 'object' ? value : {});
    customLessons = records.map(normalizeCustomLesson).filter(Boolean);
    return customLessons.slice();
  }

  function customLessonList() {
    return customLessons.slice();
  }

  function allLessons() {
    return [...BUILT_IN_LESSON_CATALOG, ...customLessons];
  }

  function lessonForId(lessonId) {
    const id = String(lessonId || '').trim();
    return customLessons.find(lesson => lesson.id === id)
      || BUILT_IN_LESSON_CATALOG.find(lesson => lesson.id === id)
      || null;
  }

  function contentHash(value) {
    const text = JSON.stringify(value ?? null);
    let hash = 0x811c9dc5;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return `fnv1a-${hash.toString(16).padStart(8, '0')}`;
  }

  function lessonContentSnapshot(lesson) {
    if (!lesson) return null;
    const snapshot = {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      lessonId: String(lesson.id || ''),
      contentVersion: Math.max(1, Math.round(Number(lesson.contentVersion) || 1)),
      title: String(lesson.title || ''),
      shortTitle: String(lesson.shortTitle || lesson.title || ''),
      description: String(lesson.description || ''),
      taskCount: Math.max(0, Number(lesson.taskCount) || 0),
      classCount: Math.max(0, Number(lesson.classCount) || 0),
      selfCount: Math.max(0, Number(lesson.selfCount) || 0),
      taskIds: Array.isArray(lesson.tasks) ? lesson.tasks.map(task => String(task?.id || '')).filter(Boolean) : [],
      tasks: Array.isArray(lesson.tasks) ? JSON.parse(JSON.stringify(lesson.tasks)) : []
    };
    snapshot.contentHash = contentHash(snapshot);
    return snapshot;
  }

  function assignmentContentDetail(lesson) {
    const snapshot = lessonContentSnapshot(lesson);
    return snapshot ? {
      schemaVersion: P2_DATA_SCHEMA_VERSION,
      contentVersion: snapshot.contentVersion,
      contentHash: snapshot.contentHash,
      taskIds: snapshot.taskIds,
      contentSnapshot: snapshot
    } : { schemaVersion: P2_DATA_SCHEMA_VERSION };
  }

  function lessonFromAssignmentSnapshot(record) {
    const snapshot = record?.contentSnapshot && typeof record.contentSnapshot === 'object'
      ? record.contentSnapshot
      : null;
    if (!snapshot || !Array.isArray(snapshot.tasks) || !snapshot.tasks.length) return null;
    const lessonId = String(snapshot.lessonId || record?.lessonId || '').trim();
    return {
      ...snapshot,
      id: lessonId,
      lessonId,
      title: String(snapshot.title || record?.title || ''),
      shortTitle: String(snapshot.shortTitle || snapshot.title || record?.title || ''),
      taskCount: Math.max(0, Number(snapshot.taskCount) || snapshot.tasks.length),
      classCount: Math.max(0, Number(snapshot.classCount) || snapshot.tasks.filter(task => task?.section === 'class').length),
      selfCount: Math.max(0, Number(snapshot.selfCount) || snapshot.tasks.filter(task => task?.section === 'self').length),
      tasks: snapshot.tasks
    };
  }

  window.P772LessonCatalogService = Object.freeze({
    P2_DATA_SCHEMA_VERSION,
    LESSON_CATALOG: BUILT_IN_LESSON_CATALOG,
    BUILT_IN_LESSON_CATALOG,
    setCustomLessons,
    customLessonList,
    allLessons,
    lessonForId,
    contentHash,
    lessonContentSnapshot,
    assignmentContentDetail,
    lessonFromAssignmentSnapshot
  });
})();
