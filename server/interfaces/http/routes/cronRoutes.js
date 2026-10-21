import { Router } from 'express';
import { pushNotificationService } from '../../../application/services/PushNotificationService.js';
import { condoNotificationService } from '../../../application/services/CondoNotificationService.js';
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
    // Reminders of today, the monthly overdue notices (on their day) and e-mails kept from previous days
    const reminders = await pushNotificationService.sendTodayReminders();
    const overdue = await condoNotificationService.runMonthlyOverdue();
    const outbox = overdue.skipped ? await condoNotificationService.processOutbox() : null;
    res.json({ ...reminders, overdue, outbox });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
