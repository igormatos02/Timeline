export const TimelineType = Object.freeze({
  BALANCE: 'balance',
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT: 'investments',
  LOAN: 'loan',
  CUSTOM: 'custom',
  REMINDER: 'reminder',
  PROJECT: 'project',
  NOTE: 'note'
});

/**
 * Normaliza qualquer variação de string ou alias para o TimelineType enum canónico.
 * @param {string} type
 * @returns {string}
 */
export function normalizeTimelineType(type) {
  if (!type) return TimelineType.CUSTOM;
  const t = String(type).trim().toLowerCase();
  if (t === TimelineType.LOAN || t === 'emprestimo' || t === 'empréstimo') {
    return TimelineType.LOAN;
  }
  if (t === TimelineType.BALANCE || t === 'saldo' || t === 'balanço' || t === 'balanco') {
    return TimelineType.BALANCE;
  }
  if (t === TimelineType.INCOME || t === 'receita' || t === 'receitas' || t === 'rendimento') {
    return TimelineType.INCOME;
  }
  if (t === TimelineType.EXPENSE || t === 'despesa' || t === 'despesas' || t === 'gasto') {
    return TimelineType.EXPENSE;
  }
  if (t === TimelineType.INVESTMENT || t === 'investimento' || t === 'investimentos' || t === 'investment') {
    return TimelineType.INVESTMENT;
  }
  if (t === TimelineType.PROJECT || t === 'projeto' || t === 'projecto') {
    return TimelineType.PROJECT;
  }
  if (t === TimelineType.REMINDER || t === 'lembrete') {
    return TimelineType.REMINDER;
  }
  return t;
}

/**
 * Verifica se um tipo de timeline corresponde ao enum TimelineType.LOAN.
 * @param {string} type
 * @returns {boolean}
 */
export function isLoanTimelineType(type) {
  return normalizeTimelineType(type) === TimelineType.LOAN;
}
