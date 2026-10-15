import { Router } from 'express';
import { pushNotificationService } from '../../../application/services/PushNotificationService.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');

export const cronRouter = Router();

// Vercel cron jobs call these routes with "Authorization: Bearer <CRON_SECRET>"; nothing runs without it
const isCronRequest = (req) => {
  const secret = process.env.CRON_SECRET;
  return Boolean(secret) && req.get('authorization') === `Bearer ${secret}`;
};

// GET /api/cron/reminders — daily: push notifications of the condominium reminders dated today
cronRouter.get('/reminders', async (req, res) => {
  if (!isCronRequest(req)) return res.status(401).json({ error: t('backend.push.unauthorized') });
  try {
    res.json(await pushNotificationService.sendTodayReminders());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
