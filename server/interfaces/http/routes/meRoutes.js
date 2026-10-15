import { Router } from 'express';
import { meService } from '../../../application/services/MeService.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');
export const meRouter = Router();

// GET /api/me/obligations?timeboardId&year&month[&personId] — obligations and debt balance of the logged-in person
// (or of another entity, for admins)
meRouter.get('/obligations', async (req, res) => {
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
meRouter.get('/entities', async (req, res) => {
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
meRouter.get('/summary', async (req, res) => {
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

// POST /api/me/receipt-link { timeboardId, eventId, personId?, language? } — signed link (valid a few minutes) to
// open the receipt of a paid obligation in the phone's browser, where it can be saved as PDF or shared
meRouter.post('/receipt-link', async (req, res) => {
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
