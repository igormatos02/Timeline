import { Router } from 'express';
import { timeboardService } from '../../../application/services/TimeboardService.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');

export const timeboardsRouter = Router();

// GET /api/timeboards?userId=...
timeboardsRouter.get('/', async (req, res) => {
  try {
    const { userId, user_id } = req.query;
    const targetUserId = userId || user_id;

    if (targetUserId) {
      const result = await timeboardService.getTimeboardsForUser(targetUserId);
      return res.json(result);
    }

    const timeboards = await timeboardService.getAllTimeboards();
    res.json(timeboards);
  } catch (err) {
    console.error('Error fetching timeboards:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/members
timeboardsRouter.get('/:id/members', async (req, res) => {
  try {
    const members = await timeboardService.getMembers(req.params.id);
    res.json(members);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/members
timeboardsRouter.post('/:id/members', async (req, res) => {
  try {
    const { userId, user_id } = req.body;
    const targetUserId = userId || user_id;
    if (!targetUserId) return res.status(400).json({ error: t('backend.validation.userIdRequired') });

    const member = await timeboardService.addMember(req.params.id, targetUserId);
    res.status(201).json(member);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/timeboards/:id/members/:userId
timeboardsRouter.delete('/:id/members/:userId', async (req, res) => {
  try {
    const deleted = await timeboardService.removeMember(req.params.id, req.params.userId);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timeboards/:id/invitations
timeboardsRouter.get('/:id/invitations', async (req, res) => {
  try {
    const invitations = await timeboardService.getInvitations(req.params.id);
    res.json(invitations);
  } catch (err) {
    console.error('Error fetching invitations:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/invitations/:invitationId/revoke
timeboardsRouter.post('/:id/invitations/:invitationId/revoke', async (req, res) => {
  try {
    const result = await timeboardService.revokeInvitation(req.params.id, req.params.invitationId);
    res.json({ success: true, result });
  } catch (err) {
    console.error('Error revoking invitation:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/persons/:personId/unlink
timeboardsRouter.post('/:id/persons/:personId/unlink', async (req, res) => {
  try {
    const result = await timeboardService.unlinkPersonMember(req.params.id, req.params.personId);
    res.json(result);
  } catch (err) {
    console.error('Error unlinking person member:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/invite
timeboardsRouter.post('/:id/invite', async (req, res) => {
  try {
    const { personId, email, role, inviterName, invitedBy, invited_by } = req.body;
    const originUrl = req.headers.origin || req.headers.referer;
    const result = await timeboardService.sendInvitation({
      timeboardId: req.params.id,
      personId,
      email,
      role,
      inviterName,
      invitedBy: invitedBy || invited_by,
      originUrl
    });
    res.json(result);
  } catch (err) {
    console.error('Error sending invitation:', err);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/timeboards/:id/accept-invite
timeboardsRouter.post('/:id/accept-invite', async (req, res) => {
  try {
    const { userId, email } = req.body;
    if (!userId) return res.status(400).json({ error: t('backend.validation.userIdRequired') });

    const result = await timeboardService.acceptInvite(req.params.id, userId, email);
    res.json(result);
  } catch (err) {
    console.error('Error accepting invitation:', err);
    res.status(400).json({ error: err.message });
  }
});

// GET /api/timeboards/:id
timeboardsRouter.get('/:id', async (req, res) => {
  try {
    const timeboard = await timeboardService.getTimeboardById(req.params.id);
    if (!timeboard) return res.status(404).json({ error: t('backend.validation.timeboardNotFound') });
    res.json(timeboard);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timeboards
timeboardsRouter.post('/', async (req, res) => {
  try {
    const newTimeboard = await timeboardService.createTimeboard(req.body);
    res.status(201).json(newTimeboard);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/timeboards/:id
timeboardsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await timeboardService.updateTimeboard(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: t('backend.validation.timeboardNotFound') });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/timeboards/:id
timeboardsRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await timeboardService.deleteTimeboard(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
