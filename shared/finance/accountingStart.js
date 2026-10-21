import { TimeboardType } from '../enums/TimeboardType.js';

// Stored compute_from of a timeboard that counts from the beginning (no start date)
const NO_START_PREFIX = '1900';

/** Accounting start date of a timeboard (yyyy-MM-dd), or null when it counts from the beginning. */
export function accountingStartOf(timeboard) {
  const raw = String(timeboard?.computeFrom || timeboard?.compute_from || '');
  return !raw || raw.startsWith(NO_START_PREFIX) ? null : raw.substring(0, 10);
}

/** Condominiums need an accounting start date before any financial entry (balances and overdue fees start there). */
export const needsAccountingStart = (timeboard) => timeboard?.type === TimeboardType.CONDOFLOW && !accountingStartOf(timeboard);
