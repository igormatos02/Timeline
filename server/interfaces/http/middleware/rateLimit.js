/**
 * Minimal in-memory rate limiter (per IP and route). On serverless platforms each instance keeps
 * its own counters, which still blocks brute force from a single client.
 */
export function rateLimit({ windowMs = 10 * 60 * 1000, max = 20, message = 'Too many attempts.' } = {}) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip || req.headers['x-forwarded-for'] || 'unknown'}:${req.baseUrl}${req.route?.path || ''}`;
    const entry = hits.get(key);
    if (!entry || entry.resetAt < now) {
      hits.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    entry.count += 1;
    if (entry.count > max) return res.status(429).json({ error: message });
    next();
  };
}
