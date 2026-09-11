export const EventRecurrence = Object.freeze({
  RECURRING: 'recurring',
  ONCE: 'once',
  LIMITED: 'limited'
});

/**
 * Checks if recurrence or limit date indicates a limited period series
 */
export function isLimitedRecurrence(recurrence, limitDate) {
  return recurrence === EventRecurrence.LIMITED || Boolean(limitDate);
}

/**
 * Checks if recurrence indicates a single occurrence event
 */
export function isOnceRecurrence(recurrence) {
  return recurrence === EventRecurrence.ONCE;
}

/**
 * Normalizes event recurrence to the canonical EventRecurrence enum value
 */
export function normalizeRecurrence(event = {}) {
  const limit = event.limitDate || event.limit_date || event.recurrenceEndDate || event.endDate;
  if (isLimitedRecurrence(event.recurrence, limit)) {
    return EventRecurrence.LIMITED;
  }
  if (isOnceRecurrence(event.recurrence)) {
    return EventRecurrence.ONCE;
  }
  if (event.isRecurring === true || event.is_recurring === true) {
    return EventRecurrence.RECURRING;
  }
  return EventRecurrence.RECURRING;
}
