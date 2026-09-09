import { EventStatus, EventType } from '../../../../../shared/enums/index.js';

/**
 * Domain Service: ExpenseDomainService
 * Encapsulates calculation rules and metrics specific to Expense / Outflow timelines.
 */
export class ExpenseDomainService {
  /**
   * Filter events belonging to expenses (excluding loan installments handled separately)
   */
  filterEvents(events = [], timelineId = null) {
    return events.filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      if (ev.status === EventStatus.CANCELLED || ev.status === 'cancelled' || ev.status === 'cancelado') return false;
      if (timelineId && ev.timelineId === timelineId) return true;
      if (ev.eventType === EventType.AMORTIZATION) return false;

      return (
        ev.eventType === EventType.EXPENSE
      );
    });
  }

  /**
   * Calculate financial metrics for Expenses
   */
  calculateMetrics(expenseEvents = [], currentMonthKey = null) {
    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    const validEvents = expenseEvents.filter((ev) => !ev.isDeleted && ev.status !== EventStatus.CANCELLED && ev.status !== 'cancelled' && ev.status !== 'cancelado');

    const monthlyTotal = validEvents
      .filter((ev) => ev.date && ev.date.startsWith(activeMonth))
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const paidTotal = validEvents
      .filter(
        (ev) =>
          ev.date &&
          ev.date.startsWith(activeMonth) &&
          (ev.status === EventStatus.PAID)
      )
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const pendingTotal = Math.max(0, monthlyTotal - paidTotal);
    const annualProjected = monthlyTotal * 12;

    return {
      monthlyTotal: Math.round(monthlyTotal * 100) / 100,
      paidTotal: Math.round(paidTotal * 100) / 100,
      pendingTotal: Math.round(pendingTotal * 100) / 100,
      annualProjected: Math.round(annualProjected * 100) / 100
    };
  }
}

export const expenseDomainService = new ExpenseDomainService();
