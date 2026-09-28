import { Router } from 'express';
import { resourceAccessParam } from '../middleware/timeboardAccess.js';
import { todoService } from '../../../application/services/TodoService.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { Capability } from '../../../../shared/permissions.js';

export const todoRouter = Router();

// Access to the timeboard of the resource in the URL
todoRouter.param('id', resourceAccessParam('todo'));

// GET /api/todos
todoRouter.get('/', async (req, res) => {
  try {
    const todos = await todoService.getAllTodos(req.query);
    res.json(todos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/todos/:id
todoRouter.get('/:id', async (req, res) => {
  try {
    const todo = await todoService.getTodoById(req.params.id);
    if (!todo) {
      return res.status(404).json({ error: 'Todo not found' });
    }
    res.json(todo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/todos
todoRouter.post('/', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const created = await todoService.createTodo(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/todos/:id
todoRouter.put('/:id', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const updated = await todoService.updateTodo(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/todos/:id/toggle-status
todoRouter.post('/:id/toggle-status', requireCapability(Capability.CHANGE_STATUS), async (req, res) => {
  try {
    const updated = await todoService.toggleStatus(req.params.id, req.body?.status);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/todos/:id
todoRouter.delete('/:id', requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const deleted = await todoService.deleteTodo(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
