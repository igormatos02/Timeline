import { EventStatus, EventPriority, isPositiveStatus } from '../../../shared/enums/index.js';

/**
 * Domain Entity: Todo
 * Represents an actionable task in the To Do timeline.
 */
export class Todo {
  constructor({
    id,
    timeboardId,
    timelineId = null,
    name,
    description = '',
    labels = [],
    notes = '',
    priority = EventPriority.NORMAL,
    status = EventStatus.PENDING,
    doneDate = null,
    isObligation = false,
    obligationPersonId = null,
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
    this.priority = priority || EventPriority.NORMAL;
    this.status = status ? String(status).toLowerCase() : EventStatus.PENDING;
    this.doneDate = doneDate || null;
    this.isObligation = Boolean(isObligation);
    this.obligationPersonId = obligationPersonId || null;
    this.tenantId = tenantId || null;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isCompleted() {
    return String(this.status).toLowerCase() === EventStatus.COMPLETED || isPositiveStatus(this.status);
  }

  isPending() {
    return !this.isCompleted();
  }

  markAsCompleted(doneDate = null) {
    this.status = EventStatus.COMPLETED;
    this.doneDate = doneDate || new Date().toISOString().substring(0, 10);
    this.updatedAt = new Date().toISOString();
  }

  markAsPending() {
    this.status = EventStatus.PENDING;
    this.doneDate = null;
    this.updatedAt = new Date().toISOString();
  }
}
