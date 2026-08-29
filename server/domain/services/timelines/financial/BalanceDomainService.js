import { incomeDomainService } from './IncomeDomainService.js';
import { expenseDomainService } from './ExpenseDomainService.js';
import { investmentDomainService } from './InvestmentDomainService.js';
import { loanDomainService } from './LoanDomainService.js';
import { TimelineStatus } from '../../../enums/index.js';

/**
 * Domain Service: BalanceDomainService
 * Computes consolidated financial health, net balances, savings rate, and cash flows
 * by aggregating income, expenses, investments, and active loans.
 */
export class BalanceDomainService {
  /**
   * Calculate consolidated monthly balance and financial metrics for a Timeboard
   */
  calculateBalance({ allEvents = [], loanTimelines = [], currentMonthKey = null }) {
    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    // 1. Income calculations
    const incomeEvents = incomeDomainService.filterEvents(allEvents);
    const incomeMetrics = incomeDomainService.calculateMetrics(incomeEvents, activeMonth);

    // 2. Expense calculations
    const expenseEvents = expenseDomainService.filterEvents(allEvents);
    const expenseMetrics = expenseDomainService.calculateMetrics(expenseEvents, activeMonth);

    // 3. Investment calculations
    const investmentEvents = investmentDomainService.filterEvents(allEvents);
    const investmentMetrics = investmentDomainService.calculateMetrics(investmentEvents, activeMonth);

    // 4. Active Loans calculations
    const activeLoans = (loanTimelines || []).filter(
      (tl) => tl.status !== TimelineStatus.INACTIVE
    );

    const activeLoanIds = new Set(activeLoans.map((l) => l.id));
    const activeLoanEvents = allEvents.filter(
      (ev) =>
        (ev.timelineId && activeLoanIds.has(ev.timelineId)) ||
        ((!ev.timelineId || activeLoanIds.has(ev.timelineId)))
    );

    const monthlyLoanInstallments = activeLoanEvents
      .filter((ev) => ev.date && ev.date.startsWith(activeMonth) && !ev.isDeleted)
      .reduce((sum, ev) => sum + (Number(ev.amount) || 0), 0);

    const totalActiveDebt = activeLoans.reduce(
      (sum, l) => sum + Number(l.remainingDebt !== undefined ? l.remainingDebt : l.totalDebt || 0),
      0
    );

    // 5. Consolidated Net Balance
    const totalOutflows = expenseMetrics.monthlyTotal + monthlyLoanInstallments + investmentMetrics.monthlyContributions;
    const monthlyNetBalance = incomeMetrics.monthlyTotal - totalOutflows;

    const savingsRate =
      incomeMetrics.monthlyTotal > 0
        ? Math.round(((investmentMetrics.monthlyContributions + Math.max(0, monthlyNetBalance)) / incomeMetrics.monthlyTotal) * 100)
        : 0;

    return {
      activeMonth,
      totalIncome: incomeMetrics.monthlyTotal,
      totalExpenses: expenseMetrics.monthlyTotal,
      totalLoanInstallments: Math.round(monthlyLoanInstallments * 100) / 100,
      totalInvestments: investmentMetrics.monthlyContributions,
      totalOutflows: Math.round(totalOutflows * 100) / 100,
      netBalance: Math.round(monthlyNetBalance * 100) / 100,
      savingsRate,
      totalActiveDebt: Math.round(totalActiveDebt * 100) / 100,
      activeLoansCount: activeLoans.length,
      incomeMetrics,
      expenseMetrics,
      investmentMetrics
    };
  }
}

export const balanceDomainService = new BalanceDomainService();
