import { MovementKind } from '../enums/index.js';
import { classifyMovement, isActiveMovement } from './movements.js';
import { getPrincipal } from './loanAmounts.js';

const emptyTotals = () => ({
  income: 0, // entries received / expected
  expensesFromAvailable: 0, // normal expenses
  savingsExpenses: 0, // expenses and costs paid by the savings (pockets)
  depositsInternal: 0, // money put into the savings from the available money
  depositsExternal: 0, // new money credited directly into the savings
  withdrawals: 0, // money taken out of the savings into the available money
  withdrawalsExternal: 0, // withdrawals flagged as external (not counted as back in the available money)
  loanPaid: 0, // installments and amortizations paid (or due, in the planned totals)
  amortized: 0 // capital that reduces the debt
});

const add = (totals, key, value) => { totals[key] += value; };

/**
 * Financial position of a set of events — the single calculation behind every balance total.
 *
 * - `realized`: effective movements from `fromMonth` up to `asOfMonth` (what already happened).
 * - `planned`: every active movement (effective or pending) from `fromMonth` up to `horizonMonth`;
 *   for installments not paid yet, the planned amortization is their capital share.
 * References (movements shown in a timeline that does not own them) and cancelled movements never count.
 *
 * Derived values (both for realized and planned):
 * - savingsNet: deposits (internal + external) - withdrawals - savings expenses
 * - savingsFromAvailable: internal deposits - withdrawals back to the available money (the net money moved
 *   out of the available money into the savings)
 * - availableNet: income - expenses - loan payments - savingsFromAvailable
 *
 * Months are 'yyyy-MM'; `fromMonth` null or '1900-01' = no lower bound.
 */
export function computeFinancialPosition({ events = [], timelineTypeMap = new Map(), fromMonth = null, asOfMonth, horizonMonth }) {
  const realized = emptyTotals();
  const planned = emptyTotals();
  const hasLowerBound = Boolean(fromMonth) && fromMonth !== '1900-01';

  (events || []).forEach((ev) => {
    if (!ev || !ev.date || !isActiveMovement(ev)) return;
    const month = ev.date.substring(0, 7);
    if (hasLowerBound && month < fromMonth) return;

    const m = classifyMovement(ev, timelineTypeMap);
    if (m.isReference || m.kind === MovementKind.NON_FINANCIAL) return;

    const inRealized = month <= asOfMonth && m.isEffective;
    const inPlanned = month <= horizonMonth;

    if (m.kind === MovementKind.LOAN_INSTALLMENT || m.kind === MovementKind.AMORTIZATION) {
      const isAmortization = m.kind === MovementKind.AMORTIZATION;
      if (inRealized) {
        add(realized, 'loanPaid', m.amount);
        if (isAmortization) add(realized, 'amortized', m.amount);
      }
      if (inPlanned) {
        add(planned, 'loanPaid', m.amount);
        if (isAmortization) add(planned, 'amortized', m.amount);
        else if (!m.isEffective && m.isLoanInst) add(planned, 'amortized', getPrincipal(ev));
      }
      return;
    }

    if (m.amount <= 0) return;
    const bucket = {
      [MovementKind.INCOME]: 'income',
      [MovementKind.EXPENSE]: 'expensesFromAvailable',
      [MovementKind.SAVINGS_EXPENSE]: 'savingsExpenses',
      [MovementKind.DEPOSIT_INTERNAL]: 'depositsInternal',
      [MovementKind.DEPOSIT_EXTERNAL]: 'depositsExternal',
      [MovementKind.WITHDRAWAL]: m.isExternal ? 'withdrawalsExternal' : 'withdrawals'
    }[m.kind];
    if (!bucket) return;
    if (inRealized) add(realized, bucket, m.amount);
    if (inPlanned) add(planned, bucket, m.amount);
  });

  const derive = (t) => {
    const allWithdrawals = t.withdrawals + t.withdrawalsExternal;
    const savingsFromAvailable = t.depositsInternal - t.withdrawals;
    return {
      ...t,
      allWithdrawals,
      savingsNet: t.depositsInternal + t.depositsExternal - allWithdrawals - t.savingsExpenses,
      savingsFromAvailable,
      availableNet: t.income - t.expensesFromAvailable - t.loanPaid - savingsFromAvailable
    };
  };

  return { realized: derive(realized), planned: derive(planned) };
}

const emptyMonth = () => ({
  income: 0,
  withdrawals: 0, // back into the available money (non-external)
  expensesFromAvailable: 0,
  savingsExpenses: 0,
  depositsInternal: 0,
  depositsExternal: 0,
  installments: 0,
  amortizations: 0,
  allWithdrawals: 0
});

/**
 * Month-by-month flows (for the month badges and charts): per 'yyyy-MM', the `projected` totals of every
 * active movement and the `realized` totals of the effective ones. References and cancelled movements never
 * count; `include(ev)` narrows the scope (entity, selected timelines, inactive timelines…).
 * Derived per month: savingsNet (deposits - withdrawals - savings expenses), savingsFromAvailable
 * (internal deposits - withdrawals) and availableNet (income - expenses - loan payments - savingsFromAvailable).
 */
export function computeMonthlyFlows({ events = [], timelineTypeMap = new Map(), fromMonth = null, include = null }) {
  const months = new Map();
  const hasLowerBound = Boolean(fromMonth) && fromMonth !== '1900-01';
  const monthOf = (key) => {
    if (!months.has(key)) months.set(key, { projected: emptyMonth(), realized: emptyMonth() });
    return months.get(key);
  };

  (events || []).forEach((ev) => {
    if (!ev || !ev.date || !isActiveMovement(ev)) return;
    const key = ev.date.substring(0, 7);
    if (hasLowerBound && key < fromMonth) return;
    if (include && !include(ev)) return;
    const m = classifyMovement(ev, timelineTypeMap);
    if (m.isReference || m.kind === MovementKind.NON_FINANCIAL) return;

    const field = {
      [MovementKind.INCOME]: 'income',
      [MovementKind.EXPENSE]: 'expensesFromAvailable',
      [MovementKind.SAVINGS_EXPENSE]: 'savingsExpenses',
      [MovementKind.DEPOSIT_INTERNAL]: 'depositsInternal',
      [MovementKind.DEPOSIT_EXTERNAL]: 'depositsExternal',
      [MovementKind.LOAN_INSTALLMENT]: 'installments',
      [MovementKind.AMORTIZATION]: 'amortizations'
    }[m.kind];
    const entry = monthOf(key);
    const apply = (totals) => {
      if (m.kind === MovementKind.WITHDRAWAL) {
        totals.allWithdrawals += m.amount;
        if (!m.isExternal) totals.withdrawals += m.amount;
      } else if (field) {
        totals[field] += m.amount;
      }
    };
    apply(entry.projected);
    if (m.isEffective) apply(entry.realized);
  });

  const derive = (t) => {
    const savingsFromAvailable = t.depositsInternal - t.withdrawals;
    return {
      ...t,
      savingsNet: t.depositsInternal + t.depositsExternal - t.allWithdrawals - t.savingsExpenses,
      savingsFromAvailable,
      availableNet: t.income - t.expensesFromAvailable - t.installments - t.amortizations - savingsFromAvailable
    };
  };
  months.forEach((entry, key) => months.set(key, { projected: derive(entry.projected), realized: derive(entry.realized) }));
  return months;
}

/**
 * Sums the monthly flows between two months (inclusive; null = open) — `side` is 'projected' or 'realized'.
 * Returns the same fields as a month (income, withdrawals, installments, savingsNet, availableNet…).
 */
export function sumMonthlyFlows(flows, { fromMonth = null, toMonth = null, side = 'projected' } = {}) {
  const total = {};
  flows.forEach((entry, key) => {
    if ((fromMonth && key < fromMonth) || (toMonth && key > toMonth)) return;
    Object.entries(entry[side]).forEach(([field, value]) => { total[field] = (total[field] || 0) + value; });
  });
  return new Proxy(total, { get: (target, field) => target[field] || 0 });
}
