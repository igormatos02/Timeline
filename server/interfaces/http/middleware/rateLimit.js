import { createHash } from 'node:crypto';
import { supabase } from '../../../infrastructure/database/supabase/supabaseClient.js';

/**
 * Rate limits per client (IP) or per account / e-mail, shared by every API instance through the database
 * (rate_limit_hit, migration 0018). Until that migration exists — or if the database fails — each instance counts
 * in memory, which still stops brute force from one client. A limiter error never blocks a request.
 */

// Client IP as set by Vercel (not by the client); the socket address locally
export const clientIpOf = (req) => (
  String(req.headers['x-vercel-forwarded-for'] || req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
  req.ip ||
  'unknown'
);

const memoryHits = new Map();
let isSharedStoreAvailable = true;

const memoryHit = (key, windowMs) => {
  const now = Date.now();
  const entry = memoryHits.get(key);
  if (!entry || entry.resetAt < now) {
    memoryHits.set(key, { count: 1, resetAt: now + windowMs });
    return 1;
  }
  entry.count += 1;
  return entry.count;
};

async function countHit(key, windowMs) {
  if (isSharedStoreAvailable) {
    const { data, error } = await supabase.rpc('rate_limit_hit', { p_key: key, p_window_seconds: Math.ceil(windowMs / 1000) });
    if (!error && Number.isFinite(Number(data))) return Number(data);
    // Before migration 0018 the function does not exist: stop asking the database
    if (error && /rate_limit_hit|schema cache|does not exist|PGRST202/i.test(`${error.message} ${error.code}`)) isSharedStoreAvailable = false;
  }
  return memoryHit(key, windowMs);
}

/**
 * @param {object} options
 * @param {string} options.name action being limited (part of the counter key)
 * @param {number} options.windowMs window length
 * @param {number} options.max hits allowed in a window
 * @param {string} options.message error of a refused request (429)
 * @param {(req) => string|string[]} [options.keyOf] who is counted (default: the client IP); several subjects are
 *   each limited (e.g. the IP and the e-mail of a login)
 */
export function rateLimit({ name, windowMs, max, message, keyOf = clientIpOf }) {
  return async (req, res, next) => {
    try {
      const subjects = [].concat(keyOf(req)).map((subject) => String(subject || '').trim().toLowerCase()).filter(Boolean);
      for (const subject of subjects) {
        // Counters never store the IP or e-mail itself
        const key = createHash('sha256').update(`${name}:${subject}`).digest('hex');
        if (await countHit(key, windowMs) > max) {
          res.set('Retry-After', String(Math.ceil(windowMs / 1000)));
          return res.status(429).json({ error: message, code: 'RATE_LIMITED' });
        }
      }
    } catch (err) {
      console.warn('[rateLimit] counting failed, request allowed:', err.message);
    }
    next();
  };
}

const MINUTE = 60 * 1000;

/** Limits of the sensitive routes (per client IP unless said otherwise). */
export const RateLimitRule = Object.freeze({
  LOGIN: { name: 'login', windowMs: 10 * MINUTE, max: 30 },
  LOGIN_ACCOUNT: { name: 'login-account', windowMs: 15 * MINUTE, max: 10 }, // per e-mail
  REGISTER: { name: 'register', windowMs: 60 * MINUTE, max: 10 },
  GOOGLE: { name: 'google', windowMs: 10 * MINUTE, max: 30 },
  INVITE_CODE: { name: 'invite-code', windowMs: 10 * MINUTE, max: 20 },
  SEND_INVITE: { name: 'send-invite', windowMs: 60 * MINUTE, max: 30 }, // per account
  UPGRADE_REQUEST: { name: 'upgrade-request', windowMs: 60 * MINUTE, max: 5 }, // per account
  RECEIPT_LINK: { name: 'receipt-link', windowMs: 10 * MINUTE, max: 60 }
});
