import { isPositiveStatus } from '../enums/index.js';

/**
 * Whether a pocket has a savings target. Legacy pockets (no explicit value) keep their target.
 */
export function pocketHasTarget(pocket) {
  const raw = pocket?.hasTarget !== undefined && pocket?.hasTarget !== null ? pocket.hasTarget : pocket?.has_target;
  return raw === undefined || raw === null ? true : Boolean(raw);
}

/**
 * Whether a pocket movement already counts as saved:
 * - received / completed movements, or
 * - external deposits whose date has already arrived (future external deposits are only planned).
 * @param {object} ev - pocket event
 * @param {string} todayStr - 'yyyy-MM-dd'
 */
export function isPocketMovementRealized(ev, todayStr) {
  if (!ev) return false;
  if (isPositiveStatus(ev.status) || ev.isCompleted) return true;
  const isExternal = Boolean(ev.isExternal || ev.is_external);
  return isExternal && Boolean(ev.date) && ev.date <= todayStr;
}
