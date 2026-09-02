import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { loanContractRepository } from '../../infrastructure/database/json/JsonLoanContractRepository.js';
import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';
import {
  incomeDomainService,
  expenseDomainService,
  investmentDomainService,
  loanDomainService,
  balanceDomainService
} from '../../domain/services/timelines/financial/index.js';
import { TimelineType, TimelineStatus } from '../../../shared/enums/index.js';

export class TimelineService {
  async getAllTimelines(timeboardId, query = {}) {
    const timelines = await timelineRepository.getAllByTimeboardId(timeboardId);
    //const allLoans = await loanContractRepository.getAll();
    const allRawEvents = [];//await eventRepository.getAll();

    const projectedEvents = projectEvents(allRawEvents, query);

    const typePriority = {
      [TimelineType.BALANCE]: 1,
      [TimelineType.INCOME]: 2,
      [TimelineType.EXPENSE]: 3,
      [TimelineType.INVESTMENT]: 4
    };

    const sortedTimelines = [...timelines].sort((a, b) => {
      const pA = typePriority[a.type] ?? 99;
      const pB = typePriority[b.type] ?? 99;
      if (pA !== pB) {
        return pA - pB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });

    return sortedTimelines.map((tl) => {
      let tlEvents = [];
      let metrics = {};

      /* if (tl.type === TimelineType.INCOME) {
         tlEvents = incomeDomainService.filterEvents(projectedEvents, tl.id);
         metrics = incomeDomainService.calculateMetrics(tlEvents, query.currentMonth);
       } else if (tl.type === TimelineType.EXPENSE) {
         tlEvents = expenseDomainService.filterEvents(projectedEvents, tl.id);
         metrics = expenseDomainService.calculateMetrics(tlEvents, query.currentMonth);
       } else if (tl.type === TimelineType.INVESTMENT) {
         tlEvents = investmentDomainService.filterEvents(projectedEvents, tl.id);
         metrics = investmentDomainService.calculateMetrics(tlEvents, query.currentMonth);
       } else if (tl.type === TimelineType.LOAN) {
         tlEvents = loanDomainService.filterEvents(projectedEvents, tl.id);
         metrics = loanDomainService.calculateMetrics(tl, tlEvents, query.currentMonth);
       } else {
         tlEvents = projectedEvents.filter((ev) => ev.timelineId === tl.id || ev.timelineOriginId === tl.id);
       }*/

      //const tlLoans = allLoans.filter((l) => l.timelineId === tl.id);

      return {
        ...tl,
        // carLoans: tlLoans,
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

    if (timeline.type === TimelineType.INCOME) {
      events = incomeDomainService.filterEvents(projectedEvents, id);
      metrics = incomeDomainService.calculateMetrics(events, query.currentMonth);
    } else if (timeline.type === TimelineType.EXPENSE) {
      events = expenseDomainService.filterEvents(projectedEvents, id);
      metrics = expenseDomainService.calculateMetrics(events, query.currentMonth);
    } else if (timeline.type === TimelineType.INVESTMENT) {
      events = investmentDomainService.filterEvents(projectedEvents, id);
      metrics = investmentDomainService.calculateMetrics(events, query.currentMonth);
    } else if (timeline.type === TimelineType.LOAN) {
      events = loanDomainService.filterEvents(projectedEvents, id);
      metrics = loanDomainService.calculateMetrics(timeline, events, query.currentMonth);
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

    return balanceDomainService.calculateBalance({
      allEvents: projectedEvents,
      loanTimelines: allTimelines.filter((tl) => tl.type === TimelineType.LOAN),
      currentMonthKey: query.currentMonth
    });
  }

  async createTimeline(data) {
    return timelineRepository.create({
      ...data,
      type: data.type || TimelineType.LOAN,
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
