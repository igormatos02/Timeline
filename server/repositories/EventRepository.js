import { JsonFileRepository } from './JsonFileRepository.js';
import { TimelineEvent } from '../models/TimelineEvent.js';

export class EventRepository extends JsonFileRepository {
  constructor() {
    super('events', TimelineEvent);
  }

  async findByTimelineOriginId(timelineOriginId) {
    return this.getAll((ev) => ev.timelineOriginId === timelineOriginId);
  }

  async findBySeriesId(seriesId) {
    return this.getAll((ev) => ev.seriesId === seriesId);
  }

  async findByDateRange(startDate, endDate) {
    return this.getAll((ev) => (!startDate || ev.date >= startDate) && (!endDate || ev.date <= endDate));
  }

  async updateRecurringSeries(seriesId, updates, fromDate = null) {
    return this.updateMany(
      (ev) => ev.seriesId === seriesId && (!fromDate || ev.date >= fromDate),
      updates
    );
  }

  async updateSubpartNameInSeries(seriesId, previousTitle, newTitle, fromDate = null) {
    const rawItems = await this._readAllRaw();
    let updatedCount = 0;
    const now = new Date().toISOString();

    const updatedItems = rawItems.map((ev) => {
      if (ev.seriesId === seriesId && (!fromDate || ev.date >= fromDate)) {
        let changed = false;
        let updatedBreakdowns = ev.breakdownItems || [];

        if (Array.isArray(updatedBreakdowns)) {
          updatedBreakdowns = updatedBreakdowns.map((sub) => {
            if (sub.name === previousTitle) {
              changed = true;
              return { ...sub, name: newTitle };
            }
            return sub;
          });
        }

        if (changed) {
          updatedCount++;
          return {
            ...ev,
            breakdownItems: updatedBreakdowns,
            updatedAt: now
          };
        }
      }
      return ev;
    });

    if (updatedCount > 0) {
      await this._writeAllRaw(updatedItems);
    }
    return updatedCount;
  }
}

export const eventRepository = new EventRepository();
