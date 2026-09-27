export const EventType = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT: 'investment',
  LOAN_INSTALLMENT: 'loan_installment',
  AMORTIZATION: 'amortization',
  WITHDRAWAL: 'withdrawal',
  // Account (savings timeline) outflows that stay in the account: a pocket cost and a pocket expense
  POCKET_COST: 'pocket_cost',
  POCKET_EXPENSE: 'pocket_expense',
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
  EventType.POCKET_EXPENSE
]);

// Outflows of the account that debit a pocket without returning money to the income timeline
export const ACCOUNT_OUTFLOW_TYPES = Object.freeze([EventType.POCKET_COST, EventType.POCKET_EXPENSE]);

export const isAccountOutflowEvent = (ev) => Boolean(ev) && ACCOUNT_OUTFLOW_TYPES.includes(ev.eventType);
