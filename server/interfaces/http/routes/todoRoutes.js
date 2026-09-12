import { Router } from 'express';
import { todoService } from '../../../application/services/TodoService.js';

export const todoRouter = Router();

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
todoRouter.post('/', async (req, res) => {
  try {
    const created = await todoService.createTodo(req.body);
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/todos/:id
todoRouter.put('/:id', async (req, res) => {
  try {
    const updated = await todoService.updateTodo(req.params.id, req.body);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/todos/:id/toggle-status
todoRouter.post('/:id/toggle-status', async (req, res) => {
  try {
    const updated = await todoService.toggleStatus(req.params.id, req.body?.status);
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// DELETE /api/todos/:id
todoRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await todoService.deleteTodo(req.params.id);
    res.json({ success: deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
