import { DiaryMood, DiaryPublishStatus } from '../../../shared/enums/index.js';

/**
 * Domain Entity: Diary
 * A diary entry (one per day) of a Diary timeline, stored in table 'diaries'.
 */
export class Diary {
  constructor({
    id,
    timeboardId,
    timelineId = null,
    name,
    description = '',
    labels = [],
    notes = '',
    date = null,
    mood = DiaryMood.GOOD,
    publishStatus = DiaryPublishStatus.UNPUBLISHED,
    tenantId = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.timeboardId = timeboardId;
    this.timelineId = timelineId;
    this.name = name;
    this.description = description || '';
    this.labels = Array.isArray(labels) ? labels : (typeof labels === 'string' ? JSON.parse(labels || '[]') : []);
    this.notes = notes || '';
    this.date = date ? String(date).substring(0, 10) : null;
    this.mood = mood || DiaryMood.GOOD;
    this.publishStatus = publishStatus || DiaryPublishStatus.UNPUBLISHED;
    this.tenantId = tenantId || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
