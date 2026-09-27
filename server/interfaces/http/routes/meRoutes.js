import { Router } from 'express';
import { meService } from '../../../application/services/MeService.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');
export const meRouter = Router();

// GET /api/me/obligations?timeboardId&year&month — the logged-in person's obligations and debt balance
meRouter.get('/obligations', async (req, res) => {
  try {
    const { timeboardId, year, month } = req.query;
    if (!timeboardId) return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    const result = await meService.getObligations(req.user.id, { timeboardId, year, month });
    if (!result) return res.status(403).json({ error: t('backend.validation.forbidden') });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
