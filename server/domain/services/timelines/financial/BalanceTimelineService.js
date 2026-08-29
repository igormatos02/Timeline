import { incomeTimelineService } from './IncomeTimelineService.js';
import { expenseTimelineService } from './ExpenseTimelineService.js';
import { investmentTimelineService } from './InvestmentTimelineService.js';
import { loanTimelineService } from './LoanTimelineService.js';
import { TimelineStatus } from '../../../enums/index.js';

/**
 * Domain Service: BalanceTimelineService
 * Computes consolidated financial health, net balances, savings rate, and cash flows
 * by aggregating income, expenses, investments, and active loans.
 */
export class BalanceTimelineService {
  /**
   * Calculate consolidated monthly balance and financial metrics for a Timeboard
   */
  calculateBalance({ allEvents = [], loanTimelines = [], currentMonthKey = null }) {
    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    // 1. Income calculations
    const incomeEvents = incomeTimelineService.filterEvents(allEvents);
    const incomeMetrics = incomeTimelineService.calculateMetrics(incomeEvents, activeMonth);

    // 2. Expense calculations
    const expenseEvents = expenseTimelineService.filterEvents(allEvents);
    const expenseMetrics = expenseTimelineService.calculateMetrics(expenseEvents, activeMonth);

    // 3. Investment calculations
    const investmentEvents = investmentTimelineService.filterEvents(allEvents);
    const investmentMetrics = investmentTimelineService.calculateMetrics(investmentEvents, activeMonth);

    // 4. Active Loans calculations
    const activeLoans = (loanTimelines || []).filter(
      (tl) => tl.status !== TimelineStatus.INACTIVE && tl.status !== 'Inativo'
    );

    const activeLoanIds = new Set(activeLoans.map((l) => l.id));
    const activeLoanEvents = allEvents.filter(
      (ev) =>
        (ev.timelineId && activeLoanIds.has(ev.timelineId)) ||
        (ev.category === 'parcela_emprestimo' && (!ev.timelineId || activeLoanIds.has(ev.timelineId)))
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

export const balanceTimelineService = new BalanceTimelineService();
