import { financialEventRepository } from './SupabaseFinancialEventRepository.js';
import { reminderRepository } from './SupabaseReminderRepository.js';
import { timelineRepository } from './SupabaseTimelineRepository.js';
import { TimelineType, normalizeTimelineType } from '../../../../shared/enums/index.js';

/**
 * Infrastructure Adapter: SupabaseEventRepository
 * Single entry point for timeline events stored across two tables:
 * - 'reminders'        → events of reminder timelines
 * - 'financial_events' → every other timeline event
 * Reads merge both tables; writes are routed to the table that owns the event.
 */
export class SupabaseEventRepository {
  constructor() {
    this.financial = financialEventRepository;
    this.reminders = reminderRepository;
    this._timelineIsReminder = new Map();
  }

  async _isReminderTimeline(timelineId) {
    if (!timelineId) return false;
    const key = String(timelineId);
    if (this._timelineIsReminder.has(key)) return this._timelineIsReminder.get(key);
    let isReminder = false;
    try {
      const tl = await timelineRepository.getById(key);
      isReminder = normalizeTimelineType(tl?.type) === TimelineType.REMINDER;
    } catch (e) {
      console.warn(`Could not resolve timeline type for ${key}:`, e.message);
    }
    this._timelineIsReminder.set(key, isReminder);
    return isReminder;
  }

  async _repositoryForItem(item) {
    const timelineId = item?.timelineId || item?.timelineOriginId || item?.timeline_id;
    return (await this._isReminderTimeline(timelineId)) ? this.reminders : this.financial;
  }

  // Repository that currently holds the event with this id (reminders first: smaller table)
  async _repositoryForId(id) {
    if (await this.reminders.getById(id)) return this.reminders;
    return this.financial;
  }

  async getAllWithStatuses(filter = null) {
    const [fin, rem] = await Promise.all([this.financial.getAllWithStatuses(filter), this.reminders.getAllWithStatuses(filter)]);
    return [...fin, ...rem];
  }

  async getAll(filter = null) {
    const [fin, rem] = await Promise.all([this.financial.getAll(filter), this.reminders.getAll(filter)]);
    return [...fin, ...rem];
  }

  async findByDateRange(startDate, endDate, additionalFilter = {}) {
    return this.getAll({ startDate, endDate, ...additionalFilter });
  }

  async getById(id) {
    return (await this.financial.getById(id)) || this.reminders.getById(id);
  }

  async create(item) {
    return (await this._repositoryForItem(item)).create(item);
  }

  async update(id, updates) {
    return (await this._repositoryForId(id)).update(id, updates);
  }

  async delete(id) {
    return (await this._repositoryForId(id)).delete(id);
  }

  async deleteByEventId(eventId) {
    await Promise.all([this.financial.deleteByEventId(eventId), this.reminders.deleteByEventId(eventId)]);
    return true;
  }

  async deleteByTimelineId(timelineId) {
    const [fin, rem] = await Promise.all([this.financial.deleteByTimelineId(timelineId), this.reminders.deleteByTimelineId(timelineId)]);
    this._timelineIsReminder.delete(String(timelineId));
    return fin && rem;
  }

  // Pockets and loans only exist in financial_events
  async deleteByPocketId(pocketId) {
    return this.financial.deleteByPocketId(pocketId);
  }

  async payUpTo(params) {
    return this.financial.payUpTo(params);
  }

  async updateMany(predicate, updates) {
    const [fin, rem] = await Promise.all([this.financial.updateMany(predicate, updates), this.reminders.updateMany(predicate, updates)]);
    return [...(fin || []), ...(rem || [])];
  }

  async deleteMany(predicate) {
    const [fin, rem] = await Promise.all([this.financial.deleteMany(predicate), this.reminders.deleteMany(predicate)]);
    return fin + rem;
  }
}

export const eventRepository = new SupabaseEventRepository();
