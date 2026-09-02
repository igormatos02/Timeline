export const EventCategory = Object.freeze({
  ALL: 'all',
  ASSETS: 'assets',
  SAVINGS: 'savings',
  LIABILITIES: 'liabilities',
  INSTALLMENTS: 'installments',
  VALUE: 'value',
  NONE: 'none',
  AUTO: 'auto',
  MORTGAGE: 'housing',
  PERSONAL: 'personal',

  // Financial Categories
  RECURRING_INCOME: 'entrada_recorrente',
  SPORADIC_INCOME: 'entrada_esporadica',
  FIXED_EXPENSE: 'saida_recorrente',
  VARIABLE_EXPENSE: 'gasto',
  SAVINGS_INVESTMENT: 'investimento_poupanca',
  ASSET_INVESTMENT: 'investimento_patrimonio',
  OTHER_INVESTMENT: 'investimento_outros',

  // Loan Categories
  LOAN_INSTALLMENT: 'parcela_emprestimo',
  AMORTIZATION: 'amortizacao',

  // Generic / Custom Timeline Types
  SCHEDULE: 'agendamento',
  REPETITIVE: 'repetitivo',
  TASK: 'tarefa',
  NOTE: 'memoria'
});
