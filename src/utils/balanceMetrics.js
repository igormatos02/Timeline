import { EventType, TimelineType, normalizeTimelineType } from '../enums/index.js';
import { classifyMovement } from '../../shared/finance/movements.js';
import { computeFinancialPosition } from '../../shared/finance/financialPosition.js';

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
 * Classifies an event the way the balance timeline does — delegates to the shared financial engine
 * (shared/finance/movements.js), the single source of the movement rules.
 */
export function classifyBalanceEvent(ev, timelineTypeMap = new Map()) {
  return classifyMovement(ev, timelineTypeMap);
}

/**
 * Realized (up to the current month) and planned (up to the horizon) totals of the balance timeline.
 * Shared by the balance header and the individual header (timeboard summary for individual users).
 */
export function computeBalanceTotals({ events = [], timelineTypeMap = new Map(), computeFromMonth, currentMonthStr, targetHorizonMonthStr }) {
  const { realized, planned } = computeFinancialPosition({
    events,
    timelineTypeMap,
    fromMonth: computeFromMonth,
    asOfMonth: currentMonthStr,
    horizonMonth: targetHorizonMonthStr
  });
  return {
    realizedIncome: realized.income,
    realizedExpenses: realized.expensesFromAvailable,
    realizedInvestmentsDeductions: realized.savingsFromAvailable,
    realizedInvestmentsTotal: realized.savingsNet,
    realizedWithdrawals: realized.allWithdrawals,
    realizedLoanPaid: realized.loanPaid,
    realizedAmortized: realized.amortized,
    plannedIncome: planned.income,
    plannedExpenses: planned.expensesFromAvailable,
    plannedInvestmentsDeductions: planned.savingsFromAvailable,
    plannedInvestmentsTotal: planned.savingsNet,
    plannedWithdrawals: planned.allWithdrawals,
    plannedLoanPaidAndDue: planned.loanPaid,
    plannedAmortized: planned.amortized
  };
}
