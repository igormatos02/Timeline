export const TimelineType = Object.freeze({
  BALANCE: 'balance',
  INCOME: 'income',
  EXPENSE: 'expense',
  INVESTMENT: 'investments',
  LOAN: 'loan',
  REMINDER: 'reminder',
  DIARY: 'diary',
  /* GOALS: 'goals',
    PROJECT: 'project',
   HISTORY: 'history',
     CUSTOM: 'custom',
  */
  TODO: 'todo',
  FOLLOWUP: 'followup'
});

const VALID_TIMELINE_TYPES = new Set(Object.values(TimelineType));

export const SINGLE_INSTANCE_TIMELINE_TYPES = Object.freeze(new Set([
  TimelineType.BALANCE,
  TimelineType.INCOME,
  TimelineType.EXPENSE,
  TimelineType.INVESTMENT
]));

export function isSingleInstanceTimelineType(type) {
  if (!type) return false;
  return SINGLE_INSTANCE_TIMELINE_TYPES.has(normalizeTimelineType(type));
}

export function normalizeTimelineType(type) {
  if (!type) return '';
  const t = String(type).trim().toLowerCase();
  if (t === 'investment' || t === 'investments') return TimelineType.INVESTMENT;
  if (t === 'expense' || t === 'expenses') return TimelineType.EXPENSE;
  if (t === 'income' || t === 'incomes') return TimelineType.INCOME;
  if (t === 'loan' || t === 'loans') return TimelineType.LOAN;
  return VALID_TIMELINE_TYPES.has(t) ? t : '';
}

/**
 * Verifica se um tipo de timeline corresponde ao enum TimelineType.LOAN.
 * @param {string} type
 * @returns {boolean}
 */
export function isLoanTimelineType(type) {
  if (!type) return false;
  return normalizeTimelineType(type) === TimelineType.LOAN;
}

