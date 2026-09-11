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

const VALID_TIMELINE_TYPES = new Set(Object.values(TimelineType));

/**
 * Normaliza qualquer valor para o TimelineType enum canónico.
 * @param {string} type
 * @returns {string}
 */
export function normalizeTimelineType(type) {
  if (!type) return TimelineType.CUSTOM;
  const t = String(type).trim().toLowerCase();
  return VALID_TIMELINE_TYPES.has(t) ? t : TimelineType.CUSTOM;
}

/**
 * Verifica se um tipo de timeline corresponde ao enum TimelineType.LOAN.
 * @param {string} type
 * @returns {boolean}
 */
export function isLoanTimelineType(type) {
  return normalizeTimelineType(type) === TimelineType.LOAN;
}
