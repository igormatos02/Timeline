import { Router } from 'express';
import { personService } from '../../../application/services/PersonService.js';

export const personsRouter = Router();

// GET /api/persons?timeboardId=:id
personsRouter.get('/', async (req, res) => {
  try {
    const { timeboardId } = req.query;
    if (!timeboardId) {
      return res.status(400).json({ error: 'timeboardId query parameter is required' });
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
    if (!person) return res.status(404).json({ error: 'Person not found' });
    res.json(person);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/persons
personsRouter.post('/', async (req, res) => {
  try {
    const created = await personService.createPerson(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/persons/:id
personsRouter.put('/:id', async (req, res) => {
  try {
    const updated = await personService.updatePerson(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: 'Person not found' });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/persons/:id
personsRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await personService.deletePerson(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
