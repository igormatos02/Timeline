import { EventStatus, FinancialType } from '../../../../../shared/enums/index.js';

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
      if (timelineId && ev.timelineId === timelineId) return true;
      if (ev.financialType === FinancialType.AMORTIZATION) return false;

      return (
        ev.financialType === FinancialType.EXPENSE
      );
    });
  }

  /**
   * Calculate financial metrics for Expenses
   */
  calculateMetrics(expenseEvents = [], currentMonthKey = null) {
    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    const monthlyTotal = expenseEvents
      .filter((ev) => ev.date && ev.date.startsWith(activeMonth) && !ev.isDeleted)
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const paidTotal = expenseEvents
      .filter(
        (ev) =>
          ev.date &&
          ev.date.startsWith(activeMonth) &&
          !ev.isDeleted &&
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
