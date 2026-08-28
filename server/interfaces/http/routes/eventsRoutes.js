import { Router } from 'express';
import { eventService } from '../../../application/services/EventService.js';

export const eventsRouter = Router();

// GET /api/events
eventsRouter.get('/', async (req, res) => {
  try {
    const events = await eventService.getAllEvents(req.query);
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events
eventsRouter.post('/', async (req, res) => {
  try {
    const newEvent = await eventService.createEvent(req.body);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/events/:id
eventsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await eventService.updateEvent(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/events/:id/toggle-payment
eventsRouter.post('/:id/toggle-payment', async (req, res) => {
  try {
    const updated = await eventService.toggleEventPayment(req.params.id);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/events/:id
eventsRouter.delete('/:id', async (req, res) => {
  try {
    const options = { ...req.query, ...req.body };
    const deleted = await eventService.deleteEvent(req.params.id, options);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
