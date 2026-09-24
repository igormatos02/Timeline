import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Domain Entity: Pocket
 * Represents a pocket / savings bucket / financial target linked to a timeline and timeboard.
 */
export class Pocket {
  constructor({
    id,
    name,
    initialValue = 0,
    initial_value,
    targetValue = 0,
    target_value,
    hasTarget,
    has_target,
    timelineId,
    timeline_id,
    timeboardId,
    timeboard_id,
    dateCreated = new Date().toISOString(),
    date_created,
    dateClosed = null,
    date_closed
  }) {
    this.id = id;
    this.name = name || t('backend.pocket.defaultName');
    this.initialValue = Number(initial_value !== undefined ? initial_value : (initialValue !== undefined ? initialValue : 0));
    this.initial_value = this.initialValue;
    this.targetValue = Number(target_value !== undefined ? target_value : (targetValue !== undefined ? targetValue : 0));
    this.target_value = this.targetValue;
    // Pockets without an explicit value (legacy rows) keep their target
    const rawHasTarget = has_target !== undefined && has_target !== null ? has_target : hasTarget;
    this.hasTarget = rawHasTarget === undefined || rawHasTarget === null ? true : Boolean(rawHasTarget);
    this.has_target = this.hasTarget;
    this.timelineId = timelineId || timeline_id || null;
    this.timeline_id = this.timelineId;
    this.timeboardId = timeboardId || timeboard_id || null;
    this.timeboard_id = this.timeboardId;
    this.dateCreated = date_created || dateCreated;
    this.date_created = this.dateCreated;
    this.dateClosed = date_closed !== undefined ? date_closed : (dateClosed !== undefined ? dateClosed : null);
    this.date_closed = this.dateClosed;
  }

  isClosed() {
    return Boolean(this.dateClosed);
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new Error(t('backend.validation.pocketNameRequired'));
    }
    if (!(data.timelineId || data.timeline_id)) {
      throw new Error(t('backend.validation.pocketTimelineIdRequired'));
    }
    if (!(data.timeboardId || data.timeboard_id)) {
      throw new Error(t('backend.validation.pocketTimeboardIdRequired'));
    }
    return true;
  }
}
