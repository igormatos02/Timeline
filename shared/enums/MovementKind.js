// Financial kind of a movement, derived from its event type, timeline and flags (see shared/finance/movements.js).
// Each kind has one owner timeline and a fixed effect on the balances when effective.
export const MovementKind = Object.freeze({
  INCOME: 'income', // + available
  EXPENSE: 'expense', // - available
  DEPOSIT_INTERNAL: 'deposit_internal', // - available, + savings
  DEPOSIT_EXTERNAL: 'deposit_external', // + savings (new money)
  WITHDRAWAL: 'withdrawal', // - savings, + available
  SAVINGS_EXPENSE: 'savings_expense', // - savings (pocket expenses and costs)
  SAVINGS_TRANSFER: 'savings_transfer', // - origin space, + destination space (total unchanged)
  LOAN_INSTALLMENT: 'loan_installment', // - available; its capital share reduces the debt
  AMORTIZATION: 'amortization', // - available, - debt
  NON_FINANCIAL: 'non_financial' // reminders, diary, to-dos, follow-ups
});

export const SAVINGS_MOVEMENT_KINDS = Object.freeze([
  MovementKind.DEPOSIT_INTERNAL,
  MovementKind.DEPOSIT_EXTERNAL,
  MovementKind.WITHDRAWAL,
  MovementKind.SAVINGS_EXPENSE,
  MovementKind.SAVINGS_TRANSFER
]);

export const LOAN_MOVEMENT_KINDS = Object.freeze([MovementKind.LOAN_INSTALLMENT, MovementKind.AMORTIZATION]);
