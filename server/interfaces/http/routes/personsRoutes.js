import { Router } from 'express';
import { resourceAccessParam } from '../middleware/timeboardAccess.js';
import { personService } from '../../../application/services/PersonService.js';
import { createT } from '../../../../shared/i18n/index.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { Capability } from '../../../../shared/permissions.js';

const t = createT('en');

export const personsRouter = Router();

// Access to the timeboard of the resource in the URL
personsRouter.param('id', resourceAccessParam('person'));

// GET /api/persons?timeboardId=:id
personsRouter.get('/', async (req, res) => {
  try {
    const { timeboardId } = req.query;
    if (!timeboardId) {
      return res.status(400).json({ error: t('backend.validation.timeboardIdQueryParamRequired') });
    }
    const persons = await personService.getPersonsByTimeboard(timeboardId);
    res.json(persons);
  } catch (err) {
    console.error('Error fetching persons:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/persons/:id
personsRouter.get('/:id', async (req, res) => {
  try {
    const person = await personService.getPersonById(req.params.id);
    if (!person) return res.status(404).json({ error: t('backend.validation.personNotFound') });
    res.json(person);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/persons
personsRouter.post('/', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const created = await personService.createPerson(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/persons/:id
personsRouter.put('/:id', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const updated = await personService.updatePerson(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: t('backend.validation.personNotFound') });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/persons/:id
personsRouter.delete('/:id', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const deleted = await personService.deletePerson(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
