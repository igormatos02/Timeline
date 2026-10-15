import { PushNotifications } from '@capacitor/push-notifications';
import { PushPlatform } from '../enums/index.js';
import { isNativeApp } from './nativeGoogle.js';
import * as mobileApi from './mobileApi.js';

/**
 * Push notifications of the CondoFlow app (Firebase Cloud Messaging): new condominium posts and reminders on
 * their date. Only on the Android app built with VITE_PUSH_ENABLED (it needs android/app/google-services.json:
 * registering without Firebase configured would close the app).
 */
export const isPushAvailable = () => isNativeApp() && import.meta.env.VITE_PUSH_ENABLED === 'true';

// Device token from FCM: the registration answers through listeners, wrapped here as a promise
const registerForToken = () => new Promise((resolve, reject) => {
  const handles = [];
  const done = (fn) => (value) => {
    handles.forEach((handle) => handle.then((h) => h.remove()));
    fn(value);
  };
  handles.push(PushNotifications.addListener('registration', done(({ value }) => resolve(value))));
  handles.push(PushNotifications.addListener('registrationError', done((err) => reject(new Error(err?.error || 'registration error')))));
  PushNotifications.register().catch(done(reject));
});

/**
 * Asks for the notification permission (Android 13+), registers the phone and sends its token and the person's
 * choices to the server. Returns the choices, or null when push is unavailable or the permission is refused.
 */
export async function enablePush(language) {
  if (!isPushAvailable()) return null;
  let permission = await PushNotifications.checkPermissions();
  if (permission.receive === 'prompt' || permission.receive === 'prompt-with-rationale') {
    permission = await PushNotifications.requestPermissions();
  }
  if (permission.receive !== 'granted') return null;
  const token = await registerForToken();
  mobileApi.setPushToken(token);
  const prefs = mobileApi.getPushPrefs();
  await mobileApi.registerPushDevice({ token, platform: PushPlatform.ANDROID, language, ...prefs });
  return prefs;
}

/** Saves the person's choices (new posts / reminders) for this phone. */
export async function savePushPrefs(prefs, language) {
  mobileApi.setPushPrefs(prefs);
  const token = mobileApi.getPushToken();
  if (!isPushAvailable() || !token) return;
  await mobileApi.registerPushDevice({ token, platform: PushPlatform.ANDROID, language, ...prefs });
}

/** On sign-out: this phone stops receiving the account's notifications. */
export async function disablePush() {
  const token = mobileApi.getPushToken();
  if (!isPushAvailable() || !token) return;
  try {
    await mobileApi.unregisterPushDevice(token);
  } catch {
    // Signed out anyway; the server forgets tokens Firebase reports as gone
  }
}
