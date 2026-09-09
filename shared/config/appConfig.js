/**
 * Shared Application URL and Environment Defaults
 * Single source of truth for the default application URL fallback.
 */
export const DEFAULT_APP_URL = 'http://localhost:5173';

export function getAppUrl(customUrl = null) {
  if (customUrl) return String(customUrl).replace(/\/$/, '');

  if (typeof process !== 'undefined' && process.env?.VITE_APP_URL) {
    return process.env.VITE_APP_URL.replace(/\/$/, '');
  }

  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) {
    return import.meta.env.VITE_APP_URL.replace(/\/$/, '');
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }

  return DEFAULT_APP_URL;
}
