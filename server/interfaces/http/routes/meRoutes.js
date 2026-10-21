import { Router } from 'express';
import { meService } from '../../../application/services/MeService.js';
import { pushNotificationService } from '../../../application/services/PushNotificationService.js';
import { planService } from '../../../application/services/PlanService.js';
import { PlanFeature, PLANS } from '../../../../shared/config/plans.js';
import { PRODUCTS } from '../../../../shared/config/products.js';
import { emailService } from '../../../application/services/EmailService.js';
import { userRepository } from '../../../infrastructure/database/supabase/SupabaseUserRepository.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');
export const meRouter = Router();

// The apps' routes need the condominium's plan to include them (CondoFlow app / CondoFlow Gestão)
const requirePlanFeature = (feature) => async (req, res, next) => {
  try {
    const timeboardId = req.query?.timeboardId || req.body?.timeboardId;
    if (timeboardId) await planService.assertFeature(timeboardId, feature);
    next();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code });
  }
};
const memberApp = requirePlanFeature(PlanFeature.MEMBER_APP);
const adminApp = requirePlanFeature(PlanFeature.ADMIN_APP);

// GET /api/me/obligations?timeboardId&year&month[&personId] — obligations and debt balance of the logged-in person
// (or of another entity, for admins)
meRouter.get('/obligations', memberApp, async (req, res) => {
  try {
    const { timeboardId, year, month, personId } = req.query;
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    // personId (another entity) is only allowed for admins of the timeboard
    const result = await meService.getObligations(req.user.id, { timeboardId, year, month, personId });
    if (!result) return res.status(403).json({ error: t('backend.validation.forbidden') });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/me/entities?timeboardId — admins: the timeboard's entities with their debt balance
meRouter.get('/entities', adminApp, async (req, res) => {
  try {
    const { timeboardId } = req.query;
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    const result = await meService.getEntities(req.user.id, { timeboardId });
    if (!result) return res.status(403).json({ error: t('backend.validation.forbidden') });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/me/summary?timeboardId — admins: "where is my money" of the timeboard (shared financial engine)
meRouter.get('/summary', adminApp, async (req, res) => {
  try {
    const { timeboardId } = req.query;
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    const result = await meService.getSummary(req.user.id, { timeboardId });
    if (!result) return res.status(403).json({ error: t('backend.validation.forbidden') });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/me/month?timeboardId&month=YYYY-MM — admins: income, outflows and result of the month (CondoFlow Gestão)
meRouter.get('/month', adminApp, async (req, res) => {
  try {
    const { timeboardId, month } = req.query;
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    const result = await meService.getMonthFlows(req.user.id, { timeboardId, month });
    if (!result) return res.status(403).json({ error: t('backend.validation.forbidden') });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/me/movements?timeboardId&month=YYYY-MM — admins: the month's income and outflows (CondoFlow Gestão)
meRouter.get('/movements', adminApp, async (req, res) => {
  try {
    const { timeboardId, month } = req.query;
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    const result = await meService.getMonthMovements(req.user.id, { timeboardId, month });
    if (!result) return res.status(403).json({ error: t('backend.validation.forbidden') });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/me/notices?timeboardId — the condominium's published posts and open reminders (CondoFlow app)
meRouter.get('/notices', memberApp, async (req, res) => {
  try {
    const { timeboardId } = req.query;
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    const result = await meService.getNotices(req.user.id, { timeboardId });
    if (!result) return res.status(403).json({ error: t('backend.validation.forbidden') });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/me/receipt-link { timeboardId, eventId, personId?, language? } — signed link (valid a few minutes) to
// open the receipt of a paid obligation in the phone's browser, where it can be saved as PDF or shared
meRouter.post('/receipt-link', memberApp, async (req, res) => {
  try {
    const { timeboardId, eventId, personId, language } = req.body || {};
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    const token = await meService.createReceiptLinkToken(req.user.id, { timeboardId, eventId, personId, language });
    if (!token) return res.status(403).json({ error: t('backend.validation.forbidden') });
    const protocol = String(req.get('x-forwarded-proto') || req.protocol).split(',')[0].trim();
    const host = req.get('x-forwarded-host') || req.get('host');
    const lang = encodeURIComponent(language || 'pt');
    res.json({ url: `${protocol}://${host}/api/receipts/${token}?lang=${lang}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/me/push-devices { token, platform?, language?, notifyPosts?, notifyReminders? } — registers this phone for
// push notifications (CondoFlow app), or updates its preferences
meRouter.post('/push-devices', async (req, res) => {
  try {
    const { token, platform, language, notifyPosts, notifyReminders } = req.body || {};
    if (!token) return res.status(400).json({ error: t('backend.push.tokenRequired') });
    const device = await pushNotificationService.registerDevice(req.user.id, { token, platform, language, notifyPosts, notifyReminders });
    res.json({ notifyPosts: device.notifyPosts, notifyReminders: device.notifyReminders });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/me/push-devices { token } — this phone stops receiving notifications (sign-out)
meRouter.delete('/push-devices', async (req, res) => {
  try {
    const { token } = req.body || {};
    if (!token) return res.status(400).json({ error: t('backend.push.tokenRequired') });
    await pushNotificationService.unregisterDevice(req.user.id, token);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Limits in JSON (Infinity = no limit = null)
const finiteOrNull = (value) => (value === Infinity ? null : value);

// GET /api/me/licenses/:product — the account's license in a product: plan in force, end, limits and condominiums used
meRouter.get('/licenses/:product', async (req, res) => {
  try {
    if (!PRODUCTS[req.params.product]) return res.status(404).json({ error: t('backend.validation.productNotFound') });
    const license = await planService.getAccountLicense(req.user.id, req.params.product);
    res.json({
      ...license,
      limits: Object.fromEntries(Object.entries(license.limits).map(([key, value]) => [key, finiteOrNull(value)]))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/me/licenses/:product/upgrade-request { planId, message } — asks the provider for another plan (by e-mail)
meRouter.post('/licenses/:product/upgrade-request', async (req, res) => {
  try {
    const product = PRODUCTS[req.params.product];
    const { planId, message } = req.body || {};
    if (!product || !PLANS[planId]) return res.status(400).json({ error: t('backend.validation.invalidPlan') });
    const [license, user] = await Promise.all([
      planService.getAccountLicense(req.user.id, product.id),
      userRepository.getById(req.user.id)
    ]);
    const tp = createT('pt');
    await emailService.sendUpgradeRequest({
      requesterName: user?.name || req.user.name || '',
      requesterEmail: user?.email || req.user.email,
      productName: product.name,
      currentPlan: tp(`plans.names.${license.effectivePlanId}`),
      requestedPlan: tp(`plans.names.${planId}`),
      message: String(message || '').slice(0, 2000)
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
