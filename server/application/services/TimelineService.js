import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { loanContractRepository } from '../../infrastructure/database/json/JsonLoanContractRepository.js';
import { eventRepository } from '../../infrastructure/database/json/JsonEventRepository.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';

export class TimelineService {
  async getAllTimelines(query = {}) {
    const timelines = await timelineRepository.getAll();
    const allLoans = await loanContractRepository.getAll();
    const allRawEvents = await eventRepository.getAll();

    const projectedEvents = projectEvents(allRawEvents, query);

    return timelines.map((tl) => {
      const tlLoans = allLoans.filter((l) => l.timelineId === tl.id);
      const tlEvents = projectedEvents.filter((ev) => ev.timelineId === tl.id || ev.timelineOriginId === tl.id);

      return {
        ...tl,
        carLoans: tlLoans,
        events: tlEvents
      };
    });
  }

  async getTimelineById(id, query = {}) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) return null;

    const loans = await loanContractRepository.findByTimelineId(id);
    const allRawEvents = await eventRepository.getAll();
    const projectedEvents = projectEvents(allRawEvents, query);

    const events = projectedEvents.filter((ev) => ev.timelineId === id || ev.timelineOriginId === id);

    return {
      ...timeline,
      carLoans: loans,
      events
    };
  }

  async createTimeline(data) {
    return timelineRepository.create(data);
  }

  async updateTimeline(id, updates) {
    return timelineRepository.update(id, updates);
  }

  async deleteTimeline(id) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) return false;

    await eventRepository.deleteMany((ev) => ev.timelineId === id || ev.timelineOriginId === id);
    await loanContractRepository.deleteMany((loan) => loan.timelineId === id);
    return timelineRepository.delete(id);
  }

  async resetTimeline(timelineId) {
    const timeline = await timelineRepository.getById(timelineId);
    if (!timeline) return false;

    await eventRepository.deleteMany((ev) => ev.timelineId === timelineId || ev.timelineOriginId === timelineId);
    return true;
  }
}

export const timelineService = new TimelineService();
export { projectEvents };
