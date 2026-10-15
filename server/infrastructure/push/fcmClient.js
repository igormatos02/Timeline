import { createSign } from 'node:crypto';

/**
 * Firebase Cloud Messaging (HTTP v1) with the project's service account, no SDK:
 * FIREBASE_SERVICE_ACCOUNT holds the service account JSON (Firebase console → Project settings → Service accounts).
 */
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging';

let cachedAccess = null;

function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  try {
    const account = JSON.parse(raw);
    return account.project_id && account.client_email && account.private_key ? account : null;
  } catch {
    return null;
  }
}

/** Whether push notifications can be sent (the service account is configured). */
export const isPushConfigured = () => Boolean(serviceAccount());

// OAuth access token of the service account (signed JWT exchanged at Google), reused until close to expiry
async function getAccessToken(account) {
  const now = Math.floor(Date.now() / 1000);
  if (cachedAccess && cachedAccess.expiresAt - 60 > now) return cachedAccess.token;
  const base64url = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
  const unsigned = `${base64url({ alg: 'RS256', typ: 'JWT' })}.${base64url({
    iss: account.client_email,
    scope: FCM_SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600
  })}`;
  const signature = createSign('RSA-SHA256').update(unsigned).sign(account.private_key, 'base64url');
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${unsigned}.${signature}` })
  });
  const result = await response.json();
  if (!response.ok || !result.access_token) throw new Error(`FCM auth failed: ${result.error_description || result.error || response.status}`);
  cachedAccess = { token: result.access_token, expiresAt: now + Number(result.expires_in || 3600) };
  return cachedAccess.token;
}

/**
 * Sends one notification to a device token. Returns { ok, unregistered }: `unregistered` tells the token is no
 * longer valid (app removed, token rotated) and should be forgotten.
 */
export async function sendPush(token, { title, body, data = {} }) {
  const account = serviceAccount();
  if (!account) return { ok: false, unregistered: false };
  const accessToken = await getAccessToken(account);
  const response = await fetch(`https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: {
        token,
        notification: { title, body },
        // FCM data values must be strings
        data: Object.fromEntries(Object.entries(data).map(([key, value]) => [key, String(value ?? '')])),
        android: { priority: 'high' }
      }
    })
  });
  if (response.ok) return { ok: true, unregistered: false };
  const result = await response.json().catch(() => ({}));
  const errorCode = (result.error?.details || []).map((detail) => detail.errorCode).find(Boolean);
  return { ok: false, unregistered: response.status === 404 || errorCode === 'UNREGISTERED' };
}
