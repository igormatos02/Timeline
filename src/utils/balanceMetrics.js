import { getPrincipal } from './loanCalculations.js';
import {
  EventType,
  EventStatus,
  TimelineType,
  LoanEventCategory,
  IncomeEventCategory,
  ExpenseEventCategory,
  InvestmentEventCategory,
  AmortizationEventCategory,
  AmortizationStrategy,
  isPositiveStatus,
  isCancelledStatus,
  isLoanTimelineType,
  normalizeTimelineType
} from '../enums/index.js';

/**
 * Initial value of the savings pockets (used in "Poupado" of the balance header).
 */
export function computePocketsInitialTotal({ pockets = [], timelines = [], events = [] }) {
    // Use pockets directly (timelines from API does not include .pockets sub-arrays)
    if (Array.isArray(pockets) && pockets.length > 0) {
      return pockets.reduce((sum, p) => sum + Number(p.initial_value ?? p.initialValue ?? 0), 0);
    }

    // Fallback: check timelines.pockets (populated when timeline objects include them)
    let sum = 0;
    (timelines || []).forEach((tl) => {
      if (normalizeTimelineType(tl?.type) === TimelineType.INVESTMENT) {
        let pocketsSum = 0;
        if (Array.isArray(tl.pockets) && tl.pockets.length > 0) {
          tl.pockets.forEach((p) => {
            pocketsSum += Number(p.initial_value ?? p.initialValue ?? 0);
          });
        }
        if (pocketsSum > 0) {
          sum += pocketsSum;
        } else {
          sum += Number(tl.initialValue ?? tl.initial_value ?? 0);
        }
      }
    });

    if (sum === 0) {
      const seenInitial = new Set();
      (events || []).forEach((ev) => {
        const isInvestmentEv = ev.eventType === EventType.INVESTMENT || ev.isInvestment === true || Boolean(ev.pocketId || ev.pocket_id);
        if (isInvestmentEv && Number(ev.initialInvestedAmount || 0) > 0 && (ev.isFirstOccurrence || !ev.isProjected)) {
          const key = ev.pocketId || ev.pocket_id || ev.seriesId || ev.eventId || ev.id;
          if (!seenInitial.has(key)) {
            sum += Number(ev.initialInvestedAmount);
            seenInitial.add(key);
          }
        }
      });
    }
    return sum;
}

/**
 * Realized (up to the current month) and planned (up to the horizon) totals of the balance timeline.
 * Shared by the balance header and the individual header (timeboard summary for individual users).
 */
export function computeBalanceTotals({ events = [], timelineTypeMap = new Map(), computeFromMonth, currentMonthStr, targetHorizonMonthStr }) {
  let realizedIncome = 0;
  let realizedExpenses = 0;
  let realizedInvestmentsDeductions = 0;
  let realizedInvestmentsTotal = 0;
  let realizedWithdrawals = 0;
  let realizedLoanPaid = 0;
  let realizedAmortized = 0;

  // 3. Projected / Planned totals (PLANEJADO até o horizonte targetHorizonMonthStr) - used in slider and projected cards
  let plannedIncome = 0;
  let plannedExpenses = 0;
  let plannedInvestmentsDeductions = 0;
  let plannedInvestmentsTotal = 0;
  let plannedWithdrawals = 0;
  let plannedLoanPaidAndDue = 0;
  let plannedAmortized = 0;

  (events || []).forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;

    const eventMonthStr = ev.date.substring(0, 7);
    const isAfterStart = !computeFromMonth || computeFromMonth === '1900-01' || eventMonthStr >= computeFromMonth;
    if (!isAfterStart) return;

    const isUpToCurrentMonth = eventMonthStr <= currentMonthStr;
    const isUpToHorizon = eventMonthStr <= targetHorizonMonthStr;

    const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timeline_id || ''));

    const isLoanInst = ev.eventType === EventType.LOAN_INSTALLMENT ||
      ev.eventType === 'loan_installment' ||
      ev.category === 'parcela_emprestimo' ||
      ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
      (Boolean(ev.isSystemLoanEvent) && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');

    const isAmortization = ev.eventType === EventType.AMORTIZATION ||
      ev.eventType === 'amortization' ||
      ev.category === 'amortizacao' ||
      ev.category === 'amortization' ||
      ev.category === AmortizationEventCategory.REDUCE_TERM ||
      ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
      ev.category === AmortizationStrategy.REDUCE_TERM ||
      ev.category === AmortizationStrategy.REDUCE_INSTALLMENT;

    const isLoan = isLoanInst || isAmortization || isLoanTimelineType(tlType);

    const amt = isLoanInst
      ? Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0))
      : Number(ev.amount || 0);
    const absAmt = Math.abs(amt);

    const isPaid = isPositiveStatus(ev.status) || isPositiveStatus(ev.status?.toLowerCase()) || Boolean(ev.isCompleted);

    // Loan Handling
    if (isLoan) {
      // Realized loan (up to current month, only if paid)
      if (isUpToCurrentMonth && isPaid) {
        realizedLoanPaid += absAmt;
        if (isAmortization) {
          realizedAmortized += absAmt;
        }
      }

      // Planned loan (up to target horizon, all installments/amortizations)
      if (isUpToHorizon) {
        plannedLoanPaidAndDue += absAmt;
        if (isPaid) {
          if (isAmortization) {
            plannedAmortized += absAmt;
          }
        } else {
          if (isAmortization) {
            plannedAmortized += absAmt;
          } else if (isLoanInst) {
            const principalAmt = getPrincipal(ev);
            plannedAmortized += principalAmt;
          }
        }
      }
      return;
    }

    const normalizedTlType = normalizeTimelineType(tlType || ev.timelineType || ev.timeline_type);

    const isIncome = (
      ev.eventType === EventType.INCOME ||
      normalizedTlType === TimelineType.INCOME ||
      ev.category === IncomeEventCategory.RECURRING_INCOME ||
      Boolean(ev.isIncome)
    ) && !isLoan;

    const isInvestment = (
      ev.eventType === EventType.INVESTMENT ||
      ev.eventType === 'investment' ||
      ev.eventType === 'investments' ||
      ev.eventType === EventType.WITHDRAWAL ||
      ev.category === InvestmentEventCategory.SAVINGS ||
      ev.category === 'savings' ||
      ev.category === 'investimento' ||
      normalizedTlType === TimelineType.INVESTMENT ||
      Boolean(ev.isInvestment) ||
      Boolean(ev.isWithdrawal) ||
      Boolean(ev.pocketId || ev.pocket_id)
    ) && !isLoan;

    const isWithdrawal = Boolean(
      ev.isWithdrawal ||
      ev.eventType === EventType.WITHDRAWAL ||
      (isInvestment && (ev.eventType === EventType.EXPENSE || ev.isExpense || Number(ev.amount || 0) < 0))
    );
    const multiplier = isWithdrawal ? -1 : 1;
    if (absAmt <= 0) return;

    const isExpense = (
      ev.eventType === EventType.EXPENSE ||
      normalizedTlType === TimelineType.EXPENSE ||
      ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
      Boolean(ev.isExpense)
    ) && !isIncome && !isInvestment && !isLoan;

    const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted) || ev.status === EventStatus.WITHDRAWN;

    // Accumulate Realized (only up to current month and realized)
    if (isUpToCurrentMonth && isRealized) {
      if (isIncome) {
        realizedIncome += absAmt;
      } else if (isInvestment) {
        realizedInvestmentsTotal += multiplier * absAmt;
        if (!ev.isExternal && !ev.is_external) {
          realizedInvestmentsDeductions += multiplier * absAmt;
        }
        if (isWithdrawal) {
          realizedWithdrawals += absAmt;
        }
      } else if (isExpense) {
        realizedExpenses += absAmt;
      }
    }

    // Accumulate Planned (up to target horizon, all planned events)
    if (isUpToHorizon) {
      if (isIncome) {
        plannedIncome += absAmt;
      } else if (isInvestment) {
        plannedInvestmentsTotal += multiplier * absAmt;
        if (!ev.isExternal && !ev.is_external) {
          plannedInvestmentsDeductions += multiplier * absAmt;
        }
        if (isWithdrawal) {
          plannedWithdrawals += absAmt;
        }
      } else if (isExpense) {
        plannedExpenses += absAmt;
      }
    }
  });

  return {
    realizedIncome,
    realizedExpenses,
    realizedInvestmentsDeductions,
    realizedInvestmentsTotal,
    realizedWithdrawals,
    realizedLoanPaid,
    realizedAmortized,
    plannedIncome,
    plannedExpenses,
    plannedInvestmentsDeductions,
    plannedInvestmentsTotal,
    plannedWithdrawals,
    plannedLoanPaidAndDue,
    plannedAmortized
  };
}
