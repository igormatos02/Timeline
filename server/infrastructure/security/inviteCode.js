import { randomInt } from 'node:crypto';

// Invitation codes: 8 characters without look-alike characters (0/O, 1/I/L), shown as XXXX-XXXX
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
export const INVITE_CODE_TTL_DAYS = 14;

export function generateInviteCode() {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

/** Normalizes a typed code (case, spaces, hyphen) to the stored form, or null when it cannot be a code. */
export function normalizeInviteCode(input) {
  const code = String(input || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return code.length === CODE_LENGTH ? code : null;
}

export const formatInviteCode = (code) => (code ? `${code.slice(0, 4)}-${code.slice(4)}` : '');

/** Masks an e-mail for display to someone holding the code: j***@gmail.com */
export function maskEmail(email) {
  const [user, domain] = String(email || '').split('@');
  if (!user || !domain) return '';
  return `${user[0]}***@${domain}`;
}
