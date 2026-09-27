export const EventType = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT: 'investment',
  LOAN_INSTALLMENT: 'loan_installment',
  AMORTIZATION: 'amortization',
  WITHDRAWAL: 'withdrawal',
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
  EventType.WITHDRAWAL
]);
