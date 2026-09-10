import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { financialEventStatusRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventStatusRepository.js';
import { loanContractRepository } from '../../infrastructure/database/supabase/SupabaseLoanContractRepository.js';
import { financialEventService } from './FinancialEventService.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';
import {
  incomeDomainService,
  expenseDomainService,
  investmentDomainService,
  loanDomainService,
  balanceDomainService
} from '../../domain/services/timelines/financial/index.js';
import { TimelineType } from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

export class TimelineService {
  /**
   * Auxiliar privado para enriquecer timelines com métricas calculadas em memória via JS
   */
  async _enrichTimelineMetrics(timeline, referenceDate = null, preloadedEvents = null) {
    if (!timeline) return timeline;
    const typeLower = (timeline.type || '').toLowerCase();
    
    // Obter todos os eventos em memória projetados
    const allEvents = preloadedEvents || (await financialEventService.getAllEvents({ timeboardId: timeline.timeboardId }));

    if (typeLower === TimelineType.LOAN || typeLower === 'loan' || typeLower === 'empréstimo' || typeLower === 'emprestimo') {
      const loanEvents = allEvents.filter((ev) => ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id);
      let loanContract = null;
      try {
        loanContract = await loanContractRepository.getByTimelineId(timeline.id);
      } catch (e) { }

      const metrics = loanDomainService.calculateMetrics(timeline, loanEvents, referenceDate, loanContract);
      return {
        ...timeline,
        loanContract,
        totalInstallments: Number(loanContract?.totalInstallments ?? timeline.totalInstallments ?? 0),
        originalCapital: Number(loanContract?.originalCapital ?? timeline.originalCapital ?? timeline.totalDebt ?? 0),
        tanRate: Number(loanContract?.tanRate ?? timeline.tanRate ?? 0),
        spread: Number(loanContract?.spread ?? timeline.spread ?? 0),
        dueDay: Number(loanContract?.dueDay ?? timeline.dueDay ?? 15),
        startDate: loanContract?.startDate || timeline.startDate || null,
        contractNumber: loanContract?.contractNumber || timeline.contractNumber || '',
        bankName: loanContract?.bankName || timeline.bankName || '',
        interestStampTaxRate: Number(loanContract?.installmentStampTax ?? timeline.interestStampTaxRate ?? 0),
        loanHeaderResult: metrics,
        procedureMetrics: metrics,
        metrics
      };
    } else if (typeLower === TimelineType.EXPENSE || typeLower === 'expense' || typeLower === 'despesa' || typeLower === 'gastos') {
      const expenseEvents = allEvents.filter((ev) => ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id);
      const metrics = expenseDomainService.calculateMetrics(expenseEvents);
      return {
        ...timeline,
        expenseHeaderResult: metrics,
        procedureMetrics: metrics,
        metrics
      };
    } else if (typeLower === TimelineType.INCOME || typeLower === 'income' || typeLower === 'entradas' || typeLower === 'rendimentos') {
      const incomeEvents = allEvents.filter((ev) => ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id);
      const metrics = incomeDomainService.calculateMetrics(incomeEvents);
      return {
        ...timeline,
        incomeHeaderResult: metrics,
        procedureMetrics: metrics,
        metrics
      };
    } else if (typeLower === TimelineType.INVESTMENT || typeLower === 'investment' || typeLower === 'investimento' || typeLower === 'poupança' || typeLower === 'poupanca') {
      const investmentEvents = allEvents.filter((ev) => ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id);
      const metrics = investmentDomainService.calculateMetrics(investmentEvents);
      return {
        ...timeline,
        investmentHeaderResult: metrics,
        procedureMetrics: metrics,
        metrics
      };
    } else if (typeLower === TimelineType.BALANCE || typeLower === 'balance' || typeLower === 'balanço' || typeLower === 'balanco') {
      const loanTimelines = await timelineRepository.getAll((tl) => (!timeline.timeboardId || tl.timeboardId === timeline.timeboardId) && (tl.type === TimelineType.LOAN || tl.type === 'loan'));
      const balanceMetrics = balanceDomainService.calculateBalance({
        allEvents,
        loanTimelines,
        referenceDate
      });
      return {
        ...timeline,
        balanceHeaderResult: balanceMetrics,
        procedureMetrics: balanceMetrics,
        metrics: balanceMetrics
      };
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

    const allEvents = await financialEventService.getAllEvents({ timeboardId });

    const enrichedTimelines = await Promise.all(
      sortedTimelines.map(async (tl) => {
        const enriched = await this._enrichTimelineMetrics(tl, query.currentDate, allEvents);
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
    if (!timeline) throw new Error(t('backend.validation.timelineNotFound'));
    if (!timeline.canDelete) {
      throw new Error(t('backend.validation.timelineSystemCannotBeDeleted'));
    }

    // 1. Excluir todos os status associados à timeline
    await financialEventStatusRepository.deleteByTimelineId(id);

    // 2. Excluir todos os eventos financeiros associados à timeline
    await eventRepository.deleteByTimelineId(id);

    // 3. Excluir contrato de empréstimo associado à timeline (se existir)
    await loanContractRepository.deleteByTimelineId(id);

    // 4. Excluir a timeline
    return timelineRepository.delete(id);
  }

  async resetTimeline(timelineId) {
    const timeline = await timelineRepository.getById(timelineId);
    if (!timeline) throw new Error(t('backend.validation.timelineNotFound'));

    const events = await eventRepository.getAll((ev) => ev.timelineId === timelineId);
    for (const ev of events) {
      await eventRepository.delete(ev.id);
    }
    return true;
  }
}

export const timelineService = new TimelineService();
