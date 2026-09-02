import { EventStatus, FinancialType } from '../../../../../shared/enums/index.js';

/**
 * Domain Service: IncomeDomainService
 * Encapsulates calculation rules and metrics specific to Income / Revenue timelines.
 */
export class IncomeDomainService {
  /**
   * Filter events belonging to income
   */
  filterEvents(events = [], timelineId = null) {
    return events.filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      if (timelineId && ev.timelineId === timelineId) return true;
      return (
        ev.financialType === FinancialType.INCOME
      );
    });
  }

  /**
   * Calculate financial metrics for Income
   */
  calculateMetrics(incomeEvents = [], currentMonthKey = null) {
    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    const monthlyTotal = incomeEvents
      .filter((ev) => ev.date && ev.date.startsWith(activeMonth) && !ev.isDeleted)
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const receivedTotal = incomeEvents
      .filter(
        (ev) =>
          ev.date &&
          ev.date.startsWith(activeMonth) &&
          !ev.isDeleted &&
          (ev.status === EventStatus.RECEIVED)
      )
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const pendingTotal = Math.max(0, monthlyTotal - receivedTotal);
    const annualProjected = monthlyTotal * 12;

    return {
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      receivedTotal: Math.round(receivedTotal * 100) / 100,
      pendingTotal: Math.round(pendingTotal * 100) / 100,
      annualProjected: Math.round(annualProjected * 100) / 100
    };
  }
}

export const incomeDomainService = new IncomeDomainService();
