export const TimelineType = Object.freeze({
  BALANCE: 'balance',
  INCOME: 'income',
  // Cash wallet ("Carteira" / "Caixa"): the money in hand, with income and expenses. Income timelines were
  // migrated to it (migration 0011); INCOME stays only to read legacy data (see isWalletTimelineType)
  WALLET: 'wallet',
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
  TimelineType.WALLET,
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

/**
 * Whether the timeline is the cash wallet: the 'wallet' type or a legacy 'income' timeline (migration 0011
 * converted them all; the alias keeps any leftover data working).
 * @param {string} type
 * @returns {boolean}
 */
export function isWalletTimelineType(type) {
  const normalized = normalizeTimelineType(type);
  return normalized === TimelineType.WALLET || normalized === TimelineType.INCOME;
}

