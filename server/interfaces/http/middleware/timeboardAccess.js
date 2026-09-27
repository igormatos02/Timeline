import { accessService } from '../../../application/services/AccessService.js';
import { PersonRole } from '../../../../shared/enums/index.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');
const READ_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

const pick = (source, ...keys) => {
  if (!source || typeof source !== 'object') return null;
  for (const key of keys) if (source[key]) return source[key];
  return null;
};

async function checkAccess(req, res, next, timeboardId) {
  try {
    const access = await accessService.getTimeboardAccess(req.user.id, timeboardId);
    if (!access) return res.status(403).json({ error: t('backend.validation.forbidden') });
    // Individual members only read (their own data is filtered by the routes)
    if (access.role === PersonRole.INDIVIDUAL && !READ_METHODS.has(req.method)) {
      return res.status(403).json({ error: t('backend.validation.forbidden') });
    }
    req.timeboardId = String(timeboardId);
    req.timeboardAccess = access;
    next();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/**
 * Checks the user's access to the timeboard a request targets, resolved from the query / body
 * (`timeboardId` or `timelineId`). Requests without a timeboard reference only need authentication.
 */
export async function timeboardAccessFromRequest(req, res, next) {
  try {
    const timeboardId = await accessService.resolveTimeboardId({
      timeboardId: pick(req.query, 'timeboardId', 'timeboard_id') || pick(req.body, 'timeboardId', 'timeboard_id'),
      timelineId: pick(req.query, 'timelineId', 'timeline_id') || pick(req.body, 'timelineId', 'timeline_id', 'timelineOriginId')
    });
    if (!timeboardId) return next();
    return checkAccess(req, res, next, timeboardId);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

/** Router param handler for routes whose `:id` is a timeboard id. */
export function timeboardAccessFromParam(req, res, next, timeboardId) {
  return checkAccess(req, res, next, timeboardId);
}
