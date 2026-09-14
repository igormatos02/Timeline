export const FollowupStatus = Object.freeze({
  INITIATED: 'initiated',
  IN_PROGRESS: 'in_progress',
  FINISHED: 'finished'
});

const VALID_STATUSES = new Set(Object.values(FollowupStatus));

/**
 * Normaliza qualquer valor para o FollowupStatus enum canónico.
 * @param {string} status
 * @returns {string}
 */
export function normalizeFollowupStatus(status) {
  if (!status) return FollowupStatus.INITIATED;
  const s = String(status).trim().toLowerCase();
  if (s === 'initiated' || s === 'not_started' || s === 'pending') return FollowupStatus.INITIATED;
  if (s === 'in_progress') return FollowupStatus.IN_PROGRESS;
  if (s === 'finished' || s === 'completed') return FollowupStatus.FINISHED;
  return VALID_STATUSES.has(s) ? s : FollowupStatus.INITIATED;
}
