export const EventType = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT: 'investment',
  LOAN_INSTALLMENT: 'loan_installment',
  AMORTIZATION: 'amortization',
  WITHDRAWAL: 'withdrawal',
  // Account (savings timeline) outflows that stay in the account: an expense paid by the account
  // (legacy 'pocket_cost' events are expenses of the "bank fees" category)
  POCKET_COST: 'pocket_cost',
  POCKET_EXPENSE: 'pocket_expense',
  // Move between two spaces of the account (General or a pocket); the account total does not change
  POCKET_TRANSFER: 'pocket_transfer',
  GENERIC: 'generic',
  REMINDER: 'generic',
  REGISTER: 'register',
  TODO: 'todo',
  FOLLOWUP: 'followup'
});


// Event types that can be paid / received in advance (positive status on a future date)
export const FINANCIAL_ADVANCE_PAYMENT_TYPES = Object.freeze([
  EventType.INCOME,
  EventType.EXPENSE,
  EventType.INVESTMENT,
  EventType.WITHDRAWAL,
  EventType.POCKET_COST,
  EventType.POCKET_EXPENSE,
  EventType.POCKET_TRANSFER
]);

// Outflows of the account that debit a pocket without returning money to the income timeline
export const ACCOUNT_OUTFLOW_TYPES = Object.freeze([EventType.POCKET_COST, EventType.POCKET_EXPENSE]);

export const isAccountOutflowEvent = (ev) => Boolean(ev) && ACCOUNT_OUTFLOW_TYPES.includes(ev.eventType);

export const isPocketTransferEvent = (ev) => Boolean(ev) && ev.eventType === EventType.POCKET_TRANSFER;
