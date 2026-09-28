import { MovementKind } from '../enums/index.js';
import { classifyMovement, isActiveMovement } from './movements.js';

// Key of the account's General space (movements without a pocket)
export const GENERAL_SPACE_KEY = 'general';

/**
 * Signed effect of a classified movement on the savings: + deposits (internal and external),
 * - withdrawals and savings expenses / costs; 0 for anything else (and for references).
 */
export function savingsEffect(movement) {
  if (!movement || movement.isReference) return 0;
  if (movement.kind === MovementKind.DEPOSIT_INTERNAL || movement.kind === MovementKind.DEPOSIT_EXTERNAL) return movement.amount;
  if (movement.kind === MovementKind.WITHDRAWAL || movement.kind === MovementKind.SAVINGS_EXPENSE) return -movement.amount;
  return 0;
}

/**
 * Balance of each savings space (each pocket + the General space), including the pockets' initial values.
 * - side 'realized': effective movements only (what is really in the space); 'projected': every active one.
 * - upToMonth ('yyyy-MM') / upToDate ('yyyy-MM-dd'): only movements up to that point.
 * - excludeEventId: leaves one movement out (e.g. the one being edited).
 * Returns Map(pocketId | GENERAL_SPACE_KEY → balance).
 */
export function computeSpaceBalances({
  events = [],
  pockets = [],
  timelineTypeMap = new Map(),
  side = 'realized',
  upToMonth = null,
  upToDate = null,
  excludeEventId = null
}) {
  const balances = new Map([[GENERAL_SPACE_KEY, 0]]);
  (pockets || []).forEach((p) => balances.set(String(p.id), Number(p.initial_value ?? p.initialValue ?? 0)));

  (events || []).forEach((ev) => {
    if (!ev || !ev.date || !isActiveMovement(ev)) return;
    if (excludeEventId && (ev.id === excludeEventId || ev.eventId === excludeEventId)) return;
    if (upToMonth && ev.date.substring(0, 7) > upToMonth) return;
    if (upToDate && ev.date > upToDate) return;
    const movement = classifyMovement(ev, timelineTypeMap);
    const effect = savingsEffect(movement);
    if (!effect) return;
    if (side === 'realized' && !movement.isEffective) return;
    const key = movement.pocketId ? String(movement.pocketId) : GENERAL_SPACE_KEY;
    balances.set(key, (balances.get(key) || 0) + effect);
  });
  return balances;
}
