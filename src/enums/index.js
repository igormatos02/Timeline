export const FinancialType = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT: 'investment',
  AMORTIZATION: 'amortization'
});

export const TimelineType = Object.freeze({
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT: 'investments',
  LOAN: 'loan',
  CUSTOM: 'custom'
});

export const EventStatus = Object.freeze({
  PENDING: 'pending',
  PAID: 'paid',
  RECEIVED: 'received',
  INVESTED: 'invested',
  AMORTIZED: 'amortized',
  CANCELLED: 'cancelled',
  DELETED: 'deleted',
  ACTIVE: 'active',
  INACTIVE: 'inactive'
});

export const EventPeriodicity = Object.freeze({
  RECURRING: 'recurring',
  ONCE: 'once',
  PERIOD: 'period'
});

export const EventPriority = Object.freeze({
  URGENT: 'urgent',
  HIGH: 'high',
  NORMAL: 'normal',
  LOW: 'low'
});

export const AmortizationStrategy = Object.freeze({
  REDUCE_TERM: 'reduce_term',
  REDUCE_INSTALLMENT: 'reduce_installment'
});

export const LoanCategory = Object.freeze({
  AUTO: 'automovel',
  MORTGAGE: 'hipotecario',
  PERSONAL: 'pessoal'
});

export const LoanStatus = Object.freeze({
  IN_PROGRESS: 'in_progress',
  SETTLED: 'settled',
  OVERDUE: 'overdue'
});

export const Periodicity = Object.freeze({
  MONTHLY: 'mensal',
  DAILY: 'diaria',
  BIWEEKLY: 'quinzenal',
  BIMONTHLY: 'bimestral',
  SEMIANNUAL: 'semestral',
  ANNUAL: 'anual'
});
