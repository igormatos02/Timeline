import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scryptAsync = promisify(scrypt);
const PREFIX = 'scrypt';
const KEY_LENGTH = 64;

/** Hashes a password as `scrypt$<salt>$<hash>` (hex). */
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scryptAsync(String(password), salt, KEY_LENGTH);
  return `${PREFIX}$${salt}$${derived.toString('hex')}`;
}

/** Whether a stored password is already hashed (legacy rows keep the plain text until the next login). */
export function isHashedPassword(stored) {
  return typeof stored === 'string' && stored.startsWith(`${PREFIX}$`);
}

/** Compares a password with a stored value (hashed or legacy plain text) in constant time. */
export async function verifyPassword(password, stored) {
  if (!stored) return false;
  if (!isHashedPassword(stored)) {
    const a = Buffer.from(String(password));
    const b = Buffer.from(String(stored));
    return a.length === b.length && timingSafeEqual(a, b);
  }
  const [, salt, hashHex] = stored.split('$');
  const expected = Buffer.from(hashHex, 'hex');
  const derived = await scryptAsync(String(password), salt, expected.length);
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}
