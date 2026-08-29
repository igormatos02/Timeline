import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { loanContractRepository } from '../../infrastructure/database/json/JsonLoanContractRepository.js';
import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';
import {
  incomeTimelineService,
  expenseTimelineService,
  investmentTimelineService,
  loanTimelineService,
  balanceTimelineService
} from '../../domain/services/timelines/financial/index.js';
import { TimelineStatus } from '../../domain/enums/TimelineStatus.js';

export class TimelineService {
  async getAllTimelines(query = {}) {
    const timelines = await timelineRepository.getAll();
    const allLoans = await loanContractRepository.getAll();
    const allRawEvents = await eventRepository.getAll();

    const projectedEvents = projectEvents(allRawEvents, query);

    return timelines.map((tl) => {
      let tlEvents = [];
      let metrics = {};

      if (tl.type === TimelineStatus.INCOME) {
        tlEvents = incomeTimelineService.filterEvents(projectedEvents, tl.id);
        metrics = incomeTimelineService.calculateMetrics(tlEvents, query.currentMonth);
      } else if (tl.type === TimelineStatus.EXPENSE) {
        tlEvents = expenseTimelineService.filterEvents(projectedEvents, tl.id);
        metrics = expenseTimelineService.calculateMetrics(tlEvents, query.currentMonth);
      } else if (tl.type === TimelineStatus.INVESTMENT) {
        tlEvents = investmentTimelineService.filterEvents(projectedEvents, tl.id);
        metrics = investmentTimelineService.calculateMetrics(tlEvents, query.currentMonth);
      } else if (tl.type === TimelineStatus.LOAN) {
        tlEvents = loanTimelineService.filterEvents(projectedEvents, tl.id);
        metrics = loanTimelineService.calculateMetrics(tl, tlEvents, query.currentMonth);
      } else {
        tlEvents = projectedEvents.filter((ev) => ev.timelineId === tl.id || ev.timelineOriginId === tl.id);
      }

      const tlLoans = allLoans.filter((l) => l.timelineId === tl.id);

      return {
        ...tl,
        carLoans: tlLoans,
        events: tlEvents,
        metrics
      };
    });
  }

  async getTimelineById(id, query = {}) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) return null;

    const loans = await loanContractRepository.findByTimelineId(id);
    const allRawEvents = await eventRepository.getAll();
    const projectedEvents = projectEvents(allRawEvents, query);

    let events = [];
    let metrics = {};

    if (timeline.type === TimelineStatus.INCOME) {
      events = incomeTimelineService.filterEvents(projectedEvents, id);
      metrics = incomeTimelineService.calculateMetrics(events, query.currentMonth);
    } else if (timeline.type === TimelineStatus.EXPENSE) {
      events = expenseTimelineService.filterEvents(projectedEvents, id);
      metrics = expenseTimelineService.calculateMetrics(events, query.currentMonth);
    } else if (timeline.type === TimelineStatus.INVESTMENT) {
      events = investmentTimelineService.filterEvents(projectedEvents, id);
      metrics = investmentTimelineService.calculateMetrics(events, query.currentMonth);
    } else if (timeline.type === TimelineStatus.LOAN) {
      events = loanTimelineService.filterEvents(projectedEvents, id);
      metrics = loanTimelineService.calculateMetrics(timeline, events, query.currentMonth);
    } else {
      events = projectedEvents.filter((ev) => ev.timelineId === id || ev.timelineOriginId === id);
    }

    return {
      ...timeline,
      carLoans: loans,
      events,
      metrics
    };
  }

  async getTimeboardBalance(timeboardId, query = {}) {
    const allTimelines = await timelineRepository.getAll((tl) => !timeboardId || tl.timeboardId === timeboardId);
    const allRawEvents = await eventRepository.getAll((ev) => !timeboardId || ev.timeboardId === timeboardId);
    const projectedEvents = projectEvents(allRawEvents, query);

    return balanceTimelineService.calculateBalance({
      allEvents: projectedEvents,
      loanTimelines: allTimelines.filter((tl) => tl.type === TimelineStatus.LOAN),
      currentMonthKey: query.currentMonth
    });
  }

  async createTimeline(data) {
    return timelineRepository.create({
      ...data,
      type: data.type || TimelineStatus.LOAN,
      status: data.status || TimelineStatus.ACTIVE
    });
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
