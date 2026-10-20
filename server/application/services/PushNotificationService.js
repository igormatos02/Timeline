import { pushDeviceRepository } from '../../infrastructure/database/supabase/SupabasePushDeviceRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { eventService } from './EventService.js';
import { isPushConfigured, sendPush } from '../../infrastructure/push/fcmClient.js';
import {
  PushNotificationKind,
  PushPlatform,
  TimeboardType,
  TimelineType,
  isCancelledStatus,
  isPositiveStatus,
  normalizeTimelineType
} from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';
import { planService } from './PlanService.js';
import { PlanFeature } from '../../../shared/config/plans.js';

// Reminders are sent for the day in the condominiums' time zone
const REMINDER_TIME_ZONE = 'Europe/Lisbon';
const todayIn = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const PREFERENCE_BY_KIND = {
  [PushNotificationKind.POST]: 'notifyPosts',
  [PushNotificationKind.REMINDER]: 'notifyReminders'
};

/**
 * Push notifications of the CondoFlow app: new condominium posts and reminders on their date, sent to every
 * person of the timeboard with an account (and its owner) who registered a phone and kept that kind on.
 */
export class PushNotificationService {
  registerDevice(userId, { token, platform = PushPlatform.ANDROID, language = 'pt', notifyPosts = true, notifyReminders = true }) {
    return pushDeviceRepository.upsert({ userId, token, platform, language, notifyPosts, notifyReminders });
  }

  unregisterDevice(userId, token) {
    return pushDeviceRepository.deleteByToken(token, userId);
  }

  async _recipientUserIds(timeboardId) {
    const [persons, timeboard] = await Promise.all([
      personRepository.getByTimeboardId(timeboardId),
      timeboardRepository.getById(timeboardId)
    ]);
    const ids = new Set((persons || []).map((p) => p.userId).filter(Boolean).map(String));
    if (timeboard?.ownerId) ids.add(String(timeboard.ownerId));
    return [...ids];
  }

  /** Sends one notification of a kind to the timeboard's members; `message(t)` builds { title, body } per language. */
  async notifyTimeboard(timeboardId, kind, message, data = {}) {
    if (!isPushConfigured()) {
      console.warn('Push notifications are off: FIREBASE_SERVICE_ACCOUNT is missing or not valid JSON');
      return { sent: 0 };
    }
    if (!timeboardId) return { sent: 0 };
    // Push notifications are part of the Profissional and Gestora plans
    if (!(await planService.hasFeature(timeboardId, PlanFeature.PUSH))) return { sent: 0 };
    const devices = await pushDeviceRepository.listByUserIds(await this._recipientUserIds(timeboardId));
    const wanted = devices.filter((device) => device[PREFERENCE_BY_KIND[kind]]);
    let sent = 0;
    await Promise.all(wanted.map(async (device) => {
      try {
        const result = await sendPush(device.token, { ...message(createT(device.language || 'pt')), data: { ...data, kind, timeboardId } });
        if (result.ok) sent += 1;
        else if (result.unregistered) await pushDeviceRepository.deleteByToken(device.token);
        else console.warn('Push notification refused by FCM:', result.error);
      } catch (err) {
        console.warn('Push notification not sent:', err.message);
      }
    }));
    console.info(`Push ${kind}: ${sent}/${wanted.length} sent (timeboard ${timeboardId})`);
    return { sent };
  }

  /** A condominium post was published. Never throws: a failed notification must not fail the save. */
  async notifyPostPublished(post) {
    try {
      if (!post?.timeboardId) return;
      const timeboard = await timeboardRepository.getById(post.timeboardId);
      if (timeboard?.type !== TimeboardType.CONDOFLOW) return;
      await this.notifyTimeboard(post.timeboardId, PushNotificationKind.POST, (t) => ({
        title: t('backend.push.newPostTitle', { timeboard: timeboard.name || '' }),
        body: post.name || post.title || ''
      }), { postId: post.id });
    } catch (err) {
      console.warn('Post notification failed:', err.message);
    }
  }

  /** Daily job: open reminders dated today in every condominium, one notification each. */
  async sendTodayReminders() {
    // `configured` tells at once whether the Firebase service account is readable in this environment
    if (!isPushConfigured()) return { configured: false, reminders: 0, sent: 0 };
    const today = todayIn(REMINDER_TIME_ZONE);
    const condominiums = await timeboardRepository.getAll((tb) => tb.type === TimeboardType.CONDOFLOW);
    let reminders = 0;
    let sent = 0;
    for (const timeboard of condominiums) {
      const timelines = await timelineRepository.findByTimeboardId(timeboard.id);
      const reminderTimelineIds = new Set(timelines
        .filter((tl) => normalizeTimelineType(tl.type) === TimelineType.REMINDER)
        .map((tl) => String(tl.id)));
      if (!reminderTimelineIds.size) continue;
      const events = await eventService.getAllEvents({ timeboardId: timeboard.id });
      const dueToday = (events || []).filter((ev) => ev.date === today
        && reminderTimelineIds.has(String(ev.timelineId || ev.timeline_id || ''))
        && !isCancelledStatus(ev.status) && !isPositiveStatus(ev.status));
      for (const reminder of dueToday) {
        reminders += 1;
        const result = await this.notifyTimeboard(timeboard.id, PushNotificationKind.REMINDER, (t) => ({
          title: t('backend.push.reminderTitle', { timeboard: timeboard.name || '' }),
          body: reminder.title || reminder.name || ''
        }), { reminderId: reminder.id });
        sent += result.sent;
      }
    }
    return { configured: true, reminders, sent };
  }
}

export const pushNotificationService = new PushNotificationService();
