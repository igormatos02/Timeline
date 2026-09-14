import { FollowupStatus, normalizeFollowupStatus } from '../../../shared/enums/index.js';

/**
 * Domain Entity: Followup
 * Represents a follow-up record in table 'followup'.
 */
export class Followup {
  constructor({
    id,
    eventId,
    timeboardId,
    timelineId = null,
    name,
    description = '',
    labels = [],
    notes = '',
    breakdownItems = [],
    position = 0,
    status = FollowupStatus.IN_PROGRESS,
    tenantId = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.eventId = eventId;
    this.timeboardId = timeboardId;
    this.timelineId = timelineId;
    this.name = name;
    this.description = description || '';
    this.labels = Array.isArray(labels) ? labels : (typeof labels === 'string' ? JSON.parse(labels || '[]') : []);
    this.notes = notes || '';
    this.breakdownItems = Array.isArray(breakdownItems)
      ? breakdownItems
      : (typeof breakdownItems === 'string' ? JSON.parse(breakdownItems || '[]') : []);
    this.position = Number(position ?? 0);
    this.status = normalizeFollowupStatus(status);
    this.tenantId = tenantId || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isAnchor() {
    return this.position === 0;
  }

  isActive() {
    return this.position === 1;
  }

  isInitiated() {
    return this.status === FollowupStatus.INITIATED;
  }

  isInProgress() {
    return this.status === FollowupStatus.IN_PROGRESS;
  }

  isFinished() {
    return this.status === FollowupStatus.FINISHED;
  }

  markAsFinished(finishedDate = null) {
    if (this.isAnchor()) return; // Anchor cannot be finished directly
    this.status = FollowupStatus.FINISHED;
    this.updatedAt = finishedDate ? new Date(finishedDate).toISOString() : new Date().toISOString();
  }

  markAsInProgress() {
    if (this.isAnchor()) return;
    this.status = FollowupStatus.IN_PROGRESS;
    this.updatedAt = new Date().toISOString();
  }
}
