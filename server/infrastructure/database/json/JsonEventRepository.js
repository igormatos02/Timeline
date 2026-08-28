import { JsonFileRepository } from './JsonFileRepository.js';
import { TimelineEvent } from '../../../domain/entities/TimelineEvent.js';

export class JsonEventRepository extends JsonFileRepository {
  constructor() {
    super('events', TimelineEvent);
  }

  async findByTimelineId(timelineId) {
    return this.getAll((ev) => ev.timelineId === timelineId || ev.timelineOriginId === timelineId);
  }

  async findByTimeboardId(timeboardId) {
    return this.getAll((ev) => ev.timeboardId === timeboardId);
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
}

export const eventRepository = new JsonEventRepository();
