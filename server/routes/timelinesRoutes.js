import { Router } from 'express';
import { timelineService } from '../services/TimelineService.js';

export const timelinesRouter = Router();

// GET /api/timelines
timelinesRouter.get('/', async (req, res) => {
  try {
    const timelines = await timelineService.getAllTimelines(req.query);
    res.json(timelines);
  } catch (err) {
    console.error('Error fetching timelines:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/timelines/:id
timelinesRouter.get('/:id', async (req, res) => {
  try {
    const timeline = await timelineService.getTimelineById(req.params.id, req.query);
    if (!timeline) return res.status(404).json({ error: 'Timeline not found' });
    res.json(timeline);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timelines
timelinesRouter.post('/', async (req, res) => {
  try {
    const newTimeline = await timelineService.createTimeline(req.body);
    res.status(201).json(newTimeline);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/timelines/:id
timelinesRouter.put('/:id', async (req, res) => {
  try {
    const updated = await timelineService.updateTimeline(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Timeline not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/timelines/:id
timelinesRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await timelineService.deleteTimeline(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/timelines/:id/reset
timelinesRouter.post('/:id/reset', async (req, res) => {
  try {
    const reset = await timelineService.resetTimeline(req.params.id);
    res.json({ success: reset });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
