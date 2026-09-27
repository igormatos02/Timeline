import { verifySessionToken } from '../../../infrastructure/security/sessionToken.js';

/**
 * Requires a valid session token (`Authorization: Bearer <token>`) and exposes the user as `req.user`.
 */
export function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : null;
  let payload = null;
  try {
    payload = verifySessionToken(token);
  } catch (err) {
    console.error('[requireAuth]', err.message);
    return res.status(500).json({ error: 'Authentication is not configured on the server.' });
  }
  if (!payload) return res.status(401).json({ error: 'Unauthorized' });
  req.user = { id: payload.sub, email: payload.email };
  next();
}
