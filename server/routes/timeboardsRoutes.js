import { Router } from 'express';
import { timeboardService } from '../services/TimeboardService.js';
export const timeboardsRouter = Router();

// GET /api/timeboards
timeboardsRouter.get('/', async (req, res) => {
  try {
    const timeboards = await timeboardService.getAllTimeboards();
    res.json(timeboards);
  } catch (err) {
    console.error('Error fetching timeboards:', err);
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
