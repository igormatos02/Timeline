import { EventStatus, EventType, isCancelledStatus } from '../../../../../shared/enums/index.js';

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
      if (isCancelledStatus(ev.status)) return false;
      if (timelineId && ev.timelineId === timelineId) return true;
      return (
        ev.eventType === EventType.INCOME
      );
    });
  }

  /**
   * Calculate financial metrics for Income
   */
  calculateMetrics(incomeEvents = [], currentMonthKey = null) {
    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    const validEvents = incomeEvents.filter((ev) => !ev.isDeleted && !isCancelledStatus(ev.status));

    const monthlyTotal = validEvents
      .filter((ev) => ev.date && ev.date.startsWith(activeMonth))
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const receivedTotal = validEvents
      .filter(
        (ev) =>
          ev.date &&
          ev.date.startsWith(activeMonth) &&
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
