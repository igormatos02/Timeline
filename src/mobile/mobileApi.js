/**
 * API client of the mobile app. The API address comes from VITE_API_URL (required in the Android build,
 * where the app does not run on the API domain); in development the Vite proxy serves /api.
 */
const API_BASE = `${String(import.meta.env.VITE_API_URL || '').replace(/\/$/, '')}/api`;

const TOKEN_KEY = 'chrono_mobile_token';
const USER_KEY = 'chrono_mobile_user';
const INVITE_CODE_KEY = 'chrono_mobile_invite_code';
const TIMEBOARD_KEY = 'chrono_mobile_timeboard';

const read = (key) => {
  try { return localStorage.getItem(key); } catch { return null; }
};
const write = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch { /* storage unavailable */ }
};

export class SessionExpiredError extends Error {}

export const getStoredUser = () => {
  const token = read(TOKEN_KEY);
  const user = read(USER_KEY);
  if (!token || !user) return null;
  try { return JSON.parse(user); } catch { return null; }
};

export function clearSession() {
  write(TOKEN_KEY, null);
  write(USER_KEY, null);
}

function saveSession(data) {
  const { token, ...user } = data;
  write(TOKEN_KEY, token);
  write(USER_KEY, JSON.stringify(user));
  return user;
}

async function request(path, { method = 'GET', body } = {}) {
  const token = read(TOKEN_KEY);
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && token && !path.startsWith('/auth/')) {
    clearSession();
    throw new SessionExpiredError(data.error);
  }
  if (!res.ok) throw new Error(data.error);
  return data;
}

export const login = async (email, password) => saveSession(await request('/auth/login', { method: 'POST', body: { email, password } }));
export const register = async (name, email, password) => saveSession(await request('/auth/register', { method: 'POST', body: { name, email, password } }));
// Google sign-in: the Supabase session (web OAuth or native Android sign-in) is exchanged for an API session
export const loginWithGoogleSession = async (accessToken) => saveSession(await request('/auth/google', { method: 'POST', body: { accessToken } }));
export const getMe = () => request('/auth/me');
export const deleteAccount = () => request('/auth/account', { method: 'DELETE' });

export const lookupInviteCode = (code) => request(`/invitations/code/${encodeURIComponent(code)}`);
export const acceptInviteByCode = (code) => request('/invitations/accept', { method: 'POST', body: { code } });

export const getTimeboards = () => request('/timeboards');
// Obligations of the logged-in person, or of another entity (`personId`, admins only)
export const getObligations = (timeboardId, personId = null) => request(
  `/me/obligations?timeboardId=${encodeURIComponent(timeboardId)}${personId ? `&personId=${encodeURIComponent(personId)}` : ''}`
);
// Admins: the timeboard's entities with their debt balance
export const getEntities = (timeboardId) => request(`/me/entities?timeboardId=${encodeURIComponent(timeboardId)}`);

export const getPendingInviteCode = () => read(INVITE_CODE_KEY);
export const setPendingInviteCode = (code) => write(INVITE_CODE_KEY, code || null);
export const getSelectedTimeboardId = () => read(TIMEBOARD_KEY);
export const setSelectedTimeboardId = (id) => write(TIMEBOARD_KEY, id || null);
