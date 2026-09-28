import { can } from '../../../../shared/permissions.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Route guard: the role of the user in the timeboard of the request (resolved by the access middleware)
 * must have the capability (shared/permissions.js). Requests without a timeboard only need authentication.
 */
export const requireCapability = (capability) => (req, res, next) => {
  if (!req.timeboardAccess) return next();
  if (can(req.timeboardAccess.role, capability)) return next();
  return res.status(403).json({ error: t('backend.validation.noPermission'), code: 'NO_PERMISSION' });
};

/** The user acting in a request, passed to the services (audit log, admin overrides). */
export const actorOf = (req) => ({ userId: req.user?.id || null, role: req.timeboardAccess?.role || null });
