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
