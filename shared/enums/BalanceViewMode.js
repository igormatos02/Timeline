import { MovementKind } from './MovementKind.js';

// Modes of the balance timeline: everything, only the money coming in, only the money going out
export const BalanceViewMode = Object.freeze({
  ALL: 'all',
  INCOME: 'income',
  OUTFLOW: 'outflow'
});

// Movements listed in each mode (transfers between own accounts are neither income nor outflow: "all" only)
const BALANCE_VIEW_MODE_KINDS = Object.freeze({
  [BalanceViewMode.INCOME]: Object.freeze([MovementKind.INCOME, MovementKind.DEPOSIT_EXTERNAL]),
  [BalanceViewMode.OUTFLOW]: Object.freeze([
    MovementKind.EXPENSE,
    MovementKind.SAVINGS_EXPENSE,
    MovementKind.LOAN_INSTALLMENT,
    MovementKind.AMORTIZATION
  ])
});

/** Whether a movement kind is listed in the balance mode ("all" lists every kind). */
export function isKindInBalanceViewMode(kind, mode) {
  const kinds = BALANCE_VIEW_MODE_KINDS[mode];
  return !kinds || kinds.includes(kind);
}
