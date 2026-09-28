import { Router } from 'express';
import { resourceAccessParam } from '../middleware/timeboardAccess.js';
import { followupService } from '../../../application/services/FollowupService.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { Capability } from '../../../../shared/permissions.js';

export const followupRouter = Router();

// Access to the timeboard of the resource in the URL
followupRouter.param('id', resourceAccessParam('followup'));
followupRouter.param('eventId', resourceAccessParam('event'));

// GET /api/followups
followupRouter.get('/', async (req, res) => {
  try {
    const followups = await followupService.getProjectedFollowups(req.query);
    res.json(followups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/followups/raw
followupRouter.get('/raw', async (req, res) => {
  try {
    const followups = await followupService.getAllFollowups(req.query);
    res.json(followups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/followups/:id
followupRouter.get('/:id', async (req, res) => {
  try {
    const followup = await followupService.getFollowupById(req.params.id);
    if (!followup) {
      return res.status(404).json({ error: 'Followup not found' });
    }
    res.json(followup);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/followups/event/:eventId
followupRouter.get('/event/:eventId', async (req, res) => {
  try {
    const followups = await followupService.getFollowupsByEventId(req.params.eventId);
    res.json(followups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/followups
followupRouter.post('/', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const created = await followupService.createFollowup(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/followups/:id
followupRouter.put('/:id', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const updated = await followupService.updateFollowup(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/followups/:id/toggle-status
followupRouter.post('/:id/toggle-status', requireCapability(Capability.CHANGE_STATUS), async (req, res) => {
  try {
    const updated = await followupService.toggleStatus(req.params.id, req.body?.status);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/followups/:id
followupRouter.delete('/:id', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const deleted = await followupService.deleteFollowup(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
