import { isPositiveStatus } from '../enums/index.js';

/**
 * Whether a pocket has a savings target. Legacy pockets (no explicit value) keep their target.
 */
export function pocketHasTarget(pocket) {
  const raw = pocket?.hasTarget !== undefined && pocket?.hasTarget !== null ? pocket.hasTarget : pocket?.has_target;
  return raw === undefined || raw === null ? true : Boolean(raw);
}

/**
 * Whether a pocket movement already counts as saved: only when it was actually received / completed.
 * External deposits follow the same rule (being external only means they do not commit the income).
 * @param {object} ev - pocket event
 */
export function isPocketMovementRealized(ev) {
  if (!ev) return false;
  return isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
}
