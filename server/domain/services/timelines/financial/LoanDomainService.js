import { EventStatus, FinancialType, TimelineStatus } from '../../../enums/index.js';

/**
 * Domain Service: LoanDomainService
 * Encapsulates calculation rules and metrics for Loans, Mortgages, Installments and Amortizations.
 */
export class LoanDomainService {
  /**
   * Filter events belonging to loans
   */
  filterEvents(events = [], timelineId = null) {
    return events.filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      if (timelineId && (ev.timelineId === timelineId || ev.timelineOriginId === timelineId)) return true;
      return (
        ev.financialType === FinancialType.AMORTIZATION
      );
    });
  }

  /**
   * Calculate metrics for a single loan timeline or consolidated active loans
   */
  calculateMetrics(loanTimeline, loanEvents = [], currentMonthKey = null) {
    const isInactive = loanTimeline && loanTimeline.status === TimelineStatus.INACTIVE;
    if (isInactive) {
      return {
        isActive: false,
        totalDebt: 0,
        remainingDebt: 0,
        amortizedCapital: 0,
        monthlyInstallment: 0,
        progressPercent: 0
      };
    }

    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    const totalDebt = Number(loanTimeline?.totalDebt || 0);
    const remainingDebt = Number(loanTimeline?.remainingDebt !== undefined ? loanTimeline.remainingDebt : totalDebt);
    const amortizedCapital = Number(loanTimeline?.amortizedCapital || Math.max(0, totalDebt - remainingDebt));
    const monthlyInstallment = Number(loanTimeline?.installmentAmount || 0);

    const progressPercent = totalDebt > 0 ? Math.min(100, Math.round((amortizedCapital / totalDebt) * 100)) : 0;

    const monthlyInstallmentsPaid = loanEvents
      .filter(
        (ev) =>
          ev.date &&
          ev.date.startsWith(activeMonth) &&
          !ev.isDeleted &&
          (ev.status === EventStatus.PAID)
      )
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    return {
      isActive: true,
      totalDebt: Math.round(totalDebt * 100) / 100,
      remainingDebt: Math.round(remainingDebt * 100) / 100,
      amortizedCapital: Math.round(amortizedCapital * 100) / 100,
      monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
      monthlyInstallmentsPaid: Math.round(monthlyInstallmentsPaid * 100) / 100,
      progressPercent
    };
  }
}

export const loanDomainService = new LoanDomainService();
