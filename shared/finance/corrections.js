import { MovementKind, EventRecurrence, EventPeriodicity } from '../enums/index.js';
import { classifyMovement, isEffectiveMovement } from './movements.js';

/**
 * Effective movements are locked: they never go back to pending and their financial data (amount, date, type,
 * category, space, timeline) never changes. A mistake is fixed with "Correct": the original occurrence is
 * cancelled (zero impact, kept in the history) and a new movement is created with the right data.
 * Loan installments and amortizations follow the loan rules (phase 5) and are not covered here.
 */

// Movement kinds locked once effective
export const LOCKABLE_MOVEMENT_KINDS = Object.freeze([
  MovementKind.INCOME,
  MovementKind.EXPENSE,
  MovementKind.DEPOSIT_INTERNAL,
  MovementKind.DEPOSIT_EXTERNAL,
  MovementKind.WITHDRAWAL,
  MovementKind.SAVINGS_EXPENSE,
  MovementKind.SAVINGS_TRANSFER
]);

/** Whether the movement can be locked once effective (financial, owned by its timeline, not a loan payment). */
export function isLockableMovement(ev, movement = classifyMovement(ev)) {
  return Boolean(ev) && !movement.isReference && LOCKABLE_MOVEMENT_KINDS.includes(movement.kind);
}

/** Effective and lockable: cannot be edited nor reverted to pending, only cancelled or corrected. */
export function isLockedMovement(ev, movement = classifyMovement(ev)) {
  return isLockableMovement(ev, movement) && isEffectiveMovement(ev);
}

const sameId = (a, b) => String(a || '') === String(b || '');
const sameAmount = (a, b) => Math.abs(Math.abs(Number(a || 0)) - Math.abs(Number(b || 0))) < 0.005;
const sameDate = (a, b) => String(a || '').substring(0, 10) === String(b || '').substring(0, 10);
const sameText = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
const sameFlag = (a, b) => Boolean(a === true || a === 'true') === Boolean(b === true || b === 'true');

// Financial fields of a movement: [name, read(ev), equal(a, b)]
const LOCKED_FIELDS = [
  ['amount', (ev) => ev.amount, sameAmount],
  ['date', (ev) => ev.date, sameDate],
  ['eventType', (ev) => ev.eventType ?? ev.event_type, sameText],
  ['category', (ev) => ev.category, sameText],
  ['pocketId', (ev) => ev.pocketId ?? ev.pocket_id, sameId],
  ['targetPocketId', (ev) => ev.targetPocketId ?? ev.target_pocket_id, sameId],
  ['isExternal', (ev) => ev.isExternal ?? ev.is_external, sameFlag],
  ['timelineId', (ev) => ev.timelineId ?? ev.timeline_id, sameId]
];

/**
 * Financial fields that an update would change on a movement (only the fields present in the update count).
 * `occurrenceDate` is the date of the occurrence being edited (recurring series share the root row).
 */
export function changedLockedFields(original, updates, { occurrenceDate = null } = {}) {
  if (!original || !updates) return [];
  const base = occurrenceDate ? { ...original, date: occurrenceDate } : original;
  return LOCKED_FIELDS
    .filter(([, read]) => read(updates) !== undefined)
    .filter(([, read, equal]) => !equal(read(base), read(updates)))
    .map(([name]) => name);
}

// Fields that identify the original occurrence or its effective state (never copied into the correction)
const CORRECTION_OMITTED_FIELDS = [
  'id', 'eventId', 'event_id', 'seriesId', 'status', 'isCompleted', 'completedAt', 'completedAtTime',
  'paidDate', 'paid_date', 'receiptNumber', 'receipt_number', 'notes', 'version', 'eventVersion', 'event_version'
];

/**
 * Pre-filled draft of the correct movement: same data as the original occurrence, as a new one-time movement.
 * `correctionOf` tells the save handler which occurrence to cancel once the correction is saved.
 */
export function buildCorrectionDraft(ev) {
  const draft = { ...ev };
  CORRECTION_OMITTED_FIELDS.forEach((field) => { delete draft[field]; });
  return {
    ...draft,
    recurrence: EventRecurrence.ONCE,
    periodicity: EventPeriodicity.MONTHLY,
    isRecurring: false,
    correctionOf: { id: ev.id, eventId: ev.eventId || ev.seriesId || null, date: ev.date, status: ev.status || null }
  };
}
