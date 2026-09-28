import { Router } from 'express';
import { resourceAccessParam } from '../middleware/timeboardAccess.js';
import { eventService } from '../../../application/services/EventService.js';
import { meService } from '../../../application/services/MeService.js';
import { PersonRole } from '../../../../shared/enums/index.js';
import { requireCapability, actorOf } from '../middleware/requireCapability.js';
import { can } from '../../../../shared/permissions.js';
import { EventStatus, isCancelledStatus } from '../../../../shared/enums/index.js';
import { createT } from '../../../../shared/i18n/index.js';

const t = createT('en');

// Cancelling / deleting through a status change is an edit (contributors only mark movements as done)
const deniesStatusChange = (req, status) => (
  Boolean(status) && (isCancelledStatus(status) || status === EventStatus.DELETED) &&
  Boolean(req.timeboardAccess) && !can(req.timeboardAccess.role, Capability.EDIT)
);
const noPermission = (res) => res.status(403).json({ error: t('backend.validation.noPermission'), code: 'NO_PERMISSION' });
import { Capability } from '../../../../shared/permissions.js';

export const eventsRouter = Router();

// Access to the timeboard of the resource in the URL
eventsRouter.param('id', resourceAccessParam('event'));
eventsRouter.param('noteId', resourceAccessParam('note'));

// GET /api/events
eventsRouter.get('/', async (req, res) => {
  try {
    // Events are always read within a timeboard the user can access (resolved by the access middleware)
    if (!req.timeboardId) return res.status(400).json({ error: 'timeboardId or timelineId is required' });
    const events = await eventService.getAllEvents({ ...req.query, timeboardId: req.query.timeboardId || req.timeboardId });
    // Individual members only receive their own obligations and the shared notices
    if (req.timeboardAccess?.role === PersonRole.INDIVIDUAL) {
      return res.json(await meService.filterEventsForIndividual(events, req.timeboardId, req.timeboardAccess));
    }
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/events/:id (fetches single event with full details including description)
eventsRouter.get('/:id', async (req, res) => {
  try {
    const event = await eventService.getEventById(req.params.id);
    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/events
eventsRouter.post('/', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const newEvent = await eventService.createEvent(req.body);
    res.status(201).json(newEvent);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/events/pay-up-to
eventsRouter.post('/pay-up-to', requireCapability(Capability.CHANGE_STATUS), async (req, res) => {
  try {
    const result = await eventService.payUpTo(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/events/:id
eventsRouter.put('/:id', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const updated = await eventService.updateEvent(req.params.id, req.body, { actor: actorOf(req) });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/events/:id/toggle-payment
eventsRouter.post('/:id/toggle-payment', requireCapability(Capability.CHANGE_STATUS), async (req, res) => {
  try {
    if (deniesStatusChange(req, req.body?.status)) return noPermission(res);
    const updated = await eventService.toggleEventPayment(req.params.id, req.body?.status, actorOf(req));
    res.json(updated);
  } catch (err) {
    res.status(err.code === 'EVENT_LOCKED' ? 409 : 400).json({ error: err.message, code: err.code });
  }
});

// POST /api/events/:id/notes (adds a comment to one occurrence: year / month of the given date)
eventsRouter.post('/:id/notes', requireCapability(Capability.NOTE), async (req, res) => {
  try {
    const { date, content, timelineId, timeboardId, authorId, authorName } = req.body || {};
    const note = await eventService.addEventNote(req.params.id, { date, content, timelineId, timeboardId, authorId, authorName });
    res.status(201).json(note);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/events/notes/:noteId
eventsRouter.delete('/notes/:noteId', requireCapability(Capability.NOTE), async (req, res) => {
  try {
    await eventService.deleteEventNote(req.params.noteId);
    res.status(204).end();
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/events/:id/status (Updates or sets status and options like cont_year in financial_event_status)
eventsRouter.post('/:id/status', requireCapability(Capability.CHANGE_STATUS), async (req, res) => {
  try {
    const { date, status, contYear, cont_year, receiptDate, receipt_date, timelineId, timeboardId, checkReceiptNumber, reason } = req.body;
    if (deniesStatusChange(req, status)) return noPermission(res);
    const result = await eventService.setEventStatus(req.params.id, {
      actor: actorOf(req),
      reason,
      date,
      status,
      contYear: contYear !== undefined ? contYear : cont_year,
      cont_year: cont_year !== undefined ? cont_year : contYear,
      receiptDate: receiptDate !== undefined ? receiptDate : receipt_date,
      checkReceiptNumber: Boolean(checkReceiptNumber),
      timelineId,
      timeboardId
    });
    res.json(result);
  } catch (err) {
    const httpStatus = err.code === 'RECEIPT_NUMBER_TAKEN' || err.code === 'EVENT_LOCKED' ? 409 : 400;
    res.status(httpStatus).json({ error: err.message, code: err.code });
  }
});

// DELETE /api/events/:id
eventsRouter.delete('/:id', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const options = { ...req.query, ...req.body, actor: actorOf(req) };
    const deleted = await eventService.deleteEvent(req.params.id, options);
    res.json({ success: deleted });
  } catch (err) {
    // Effective movements cannot be deleted (409), anything else is a server error
    res.status(err.code === 'EVENT_LOCKED' ? 409 : 500).json({ error: err.message, code: err.code });
  }
});
