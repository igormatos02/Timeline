import { Router } from 'express';
import { timeboardService } from '../../../application/services/TimeboardService.js';

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
    if (!targetUserId) return res.status(400).json({ error: 'userId is required' });

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

// GET /api/timeboards/:id
timeboardsRouter.get('/:id', async (req, res) => {
  try {
    const timeboard = await timeboardService.getTimeboardById(req.params.id);
    if (!timeboard) return res.status(404).json({ error: 'Timeboard not found' });
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
    if (!updated) return res.status(404).json({ error: 'Timeboard not found' });
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
