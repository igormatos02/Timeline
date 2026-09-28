// Actions recorded in the audit log (changes to money already recorded)
export const AuditAction = Object.freeze({
  DELETE_EVENT: 'delete_event', // one occurrence / one-time movement
  DELETE_SERIES: 'delete_series', // a whole recurring series (or from a month onwards)
  REVERT_TO_PENDING: 'revert_to_pending',
  CANCEL: 'cancel',
  CORRECT: 'correct' // the original of a correction is cancelled
});
