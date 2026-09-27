import { Router } from 'express';
import { timeboardService } from '../../../application/services/TimeboardService.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');
export const invitationsRouter = Router();

const codeAttempts = rateLimit({ windowMs: 10 * 60 * 1000, max: 20, message: t('backend.validation.tooManyAttempts') });

// GET /api/invitations/code/:code — public details of an invitation code (before login / registration)
invitationsRouter.get('/code/:code', codeAttempts, async (req, res) => {
  try {
    res.json(await timeboardService.lookupInviteCode(req.params.code));
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

// POST /api/invitations/accept  { code } — accepts the invitation with the logged-in account
invitationsRouter.post('/accept', requireAuth, codeAttempts, async (req, res) => {
  try {
    const { code } = req.body || {};
    if (!code) return res.status(400).json({ error: t('backend.validation.invitationCodeRequired') });
    res.json(await timeboardService.acceptInviteByCode(code, req.user.id));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
