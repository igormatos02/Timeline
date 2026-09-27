import { createHmac, timingSafeEqual } from 'node:crypto';

// Session tokens: signed JWT (HS256) with the user id and email, valid for 30 days
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const base64url = (input) => Buffer.from(input).toString('base64url');

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET is missing or too short (min. 32 characters). Configure it in server/.env and in the deployment environment.');
  }
  return secret;
}

const sign = (data) => createHmac('sha256', getSecret()).update(data).digest('base64url');

export function createSessionToken(user) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = base64url(JSON.stringify({ sub: user.id, email: user.email || null, iat: now, exp: now + TOKEN_TTL_SECONDS }));
  return `${header}.${payload}.${sign(`${header}.${payload}`)}`;
}

/** Returns the token payload ({ sub, email, iat, exp }) or null when the token is invalid or expired. */
export function verifySessionToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, payload, signature] = parts;
  const expected = Buffer.from(sign(`${header}.${payload}`));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (!data.sub || !data.exp || data.exp < Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch {
    return null;
  }
}
