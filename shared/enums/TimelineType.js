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

/**
 * Normaliza qualquer valor para o TimelineType enum canónico.
 * @param {string} type
 * @returns {string}
 */
export function normalizeTimelineType(type) {
  if (!type) return '';
  const t = String(type).trim().toLowerCase();
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

