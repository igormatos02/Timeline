import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';
import {
  incomeDomainService,
  expenseDomainService,
  investmentDomainService,
  loanDomainService,
  balanceDomainService
} from '../../domain/services/timelines/financial/index.js';
import { TimelineType } from '../../../shared/enums/index.js';

export class TimelineService {
  /**
   * Auxiliar privado para enriquecer timelines com os dados das Stored Procedures SQL (Loan / Expense)
   */
  async _enrichTimelineMetrics(timeline, referenceDate = null) {
    if (!timeline) return timeline;
    const typeLower = (timeline.type || '').toLowerCase();
    
    if (typeLower === TimelineType.LOAN || typeLower === 'loan' || typeLower === 'empréstimo' || typeLower === 'emprestimo') {
      const loanHeaderResult = await timelineRepository.fetchLoanMetrics(timeline.id, referenceDate);
      if (loanHeaderResult) {
        return {
          ...timeline,
          loanHeaderResult,
          procedureMetrics: loanHeaderResult,
          metrics: loanHeaderResult
        };
      }
    } else if (typeLower === TimelineType.EXPENSE || typeLower === 'expense' || typeLower === 'despesa' || typeLower === 'gastos') {
      const expenseHeaderResult = await timelineRepository.fetchExpenseMetrics(timeline.id, referenceDate);
      if (expenseHeaderResult) {
        return {
          ...timeline,
          expenseHeaderResult,
          procedureMetrics: expenseHeaderResult,
          metrics: expenseHeaderResult
        };
      }
    } else if (typeLower === TimelineType.INCOME || typeLower === 'income' || typeLower === 'entradas' || typeLower === 'rendimentos') {
      const incomeHeaderResult = await timelineRepository.fetchIncomeMetrics(timeline.id, referenceDate);
      if (incomeHeaderResult) {
        return {
          ...timeline,
          incomeHeaderResult,
          procedureMetrics: incomeHeaderResult,
          metrics: incomeHeaderResult
        };
      }
    } else if (typeLower === TimelineType.INVESTMENT || typeLower === 'investment' || typeLower === 'investimento' || typeLower === 'poupança' || typeLower === 'poupanca') {
      const investmentHeaderResult = await timelineRepository.fetchInvestmentMetrics(timeline.id, referenceDate);
      if (investmentHeaderResult) {
        return {
          ...timeline,
          investmentHeaderResult,
          procedureMetrics: investmentHeaderResult,
          metrics: investmentHeaderResult
        };
      }
    }
    return timeline;
  }

  async getAllTimelines(timeboardId, query = {}) {
    const timelines = await timelineRepository.getAllByTimeboardId(timeboardId);

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

    const enrichedTimelines = await Promise.all(
      sortedTimelines.map(async (tl) => {
        const enriched = await this._enrichTimelineMetrics(tl, query.currentDate);
        return {
          ...enriched,
          events: []
        };
      })
    );

    return enrichedTimelines;
  }

  async getTimelineById(id, query = {}) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) return null;

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
    } else if (timeline.type === TimelineType.LOAN || timeline.type === 'loan' || timeline.type === 'Empréstimo' || timeline.type === 'emprestimo') {
      events = loanDomainService.filterEvents(projectedEvents, id);
    } else {
      events = projectedEvents.filter((ev) => ev.timelineId === id || ev.timelineOriginId === id);
    }

    const enriched = await this._enrichTimelineMetrics(timeline, query.currentDate);

    return {
      ...enriched,
      events,
      metrics: enriched.loanHeaderResult || enriched.expenseHeaderResult || metrics
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
      status: 'ativa',
      canDelete: true,
      isSystemDefault: false,
      ...data
    });
  }

  async updateTimeline(id, updates) {
    return timelineRepository.update(id, updates);
  }

  async deleteTimeline(id) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) throw new Error('Timeline not found');
    if (!timeline.canDelete) {
      throw new Error('Timeline do sistema não pode ser eliminada');
    }
    return timelineRepository.delete(id);
  }

  async resetTimeline(timelineId) {
    const timeline = await timelineRepository.getById(timelineId);
    if (!timeline) throw new Error('Timeline não encontrada');

    const events = await eventRepository.getAll((ev) => ev.timelineId === timelineId);
    for (const ev of events) {
      await eventRepository.delete(ev.id);
    }
    return true;
  }
}

export const timelineService = new TimelineService();
