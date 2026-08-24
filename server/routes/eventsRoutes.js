import { Router } from 'express';
import { timelineService } from '../services/TimelineService.js';

export const eventsRouter = Router();

// GET /api/events
eventsRouter.get('/', async (req, res) => {
  try {
    const events = await timelineService.getAllEvents(req.query);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events
eventsRouter.post('/', async (req, res) => {
  try {
    const newEvent = await timelineService.createEvent(req.body);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/events/:id
eventsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await timelineService.updateEvent(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/events/:id/toggle-payment
eventsRouter.post('/:id/toggle-payment', async (req, res) => {
  try {
    const updated = await timelineService.toggleEventPayment(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/events/:id
eventsRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await timelineService.deleteEvent(req.params.id, req.body);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
