import { Capacitor } from '@capacitor/core';
import { SocialLogin } from '@capgo/capacitor-social-login';
import { supabase } from '../services/supabaseClient.js';

/** Whether the app runs as the native Android app (Capacitor) instead of the browser. */
export const isNativeApp = () => Capacitor.isNativePlatform();

let isInitialized = false;

const randomNonce = () => {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
};

const sha256Hex = async (value) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
};

/**
 * Native Google sign-in (Android Credential Manager) -> Supabase session.
 * Google receives the SHA-256 of a random nonce and Supabase the raw nonce, which binds the ID token
 * to this sign-in. The resulting Supabase session is exchanged for the API session by MobileApp
 * (onAuthStateChange SIGNED_IN), exactly like the web OAuth flow.
 * Requires VITE_GOOGLE_WEB_CLIENT_ID: the Web OAuth client of the Google provider configured in Supabase.
 */
export async function signInWithNativeGoogle({ notConfiguredMessage, noTokenMessage }) {
  const webClientId = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID;
  if (!webClientId) throw new Error(notConfiguredMessage);
  if (!isInitialized) {
    await SocialLogin.initialize({ google: { webClientId } });
    isInitialized = true;
  }
  const rawNonce = randomNonce();
  const { result } = await SocialLogin.login({
    provider: 'google',
    options: { scopes: ['email', 'profile'], nonce: await sha256Hex(rawNonce) }
  });
  if (!result?.idToken) throw new Error(noTokenMessage);
  const { error } = await supabase.auth.signInWithIdToken({ provider: 'google', token: result.idToken, nonce: rawNonce });
  if (error) throw new Error(error.message);
}

/** Signs out of the native Google account too, so the next login lets the person choose the account. */
export async function signOutNativeGoogle() {
  if (!isNativeApp() || !isInitialized) return;
  try {
    await SocialLogin.logout({ provider: 'google' });
  } catch { /* already signed out */ }
}
