import { Router } from 'express';
import { pocketService } from '../../../application/services/PocketService.js';

export const pocketRouter = Router();

pocketRouter.get('/', async (req, res) => {
  try {
    const pockets = await pocketService.getAllPockets(req.query);
    res.json(pockets);
  } catch (error) {
    console.error('GET /api/pockets error:', error);
    res.status(500).json({ error: error.message });
  }
});

pocketRouter.get('/:id', async (req, res) => {
  try {
    const pocket = await pocketService.getPocketById(req.params.id);
    if (!pocket) {
      return res.status(404).json({ error: 'Pocket not found' });
    }
    res.json(pocket);
  } catch (error) {
    console.error(`GET /api/pockets/${req.params.id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});

pocketRouter.post('/', async (req, res) => {
  try {
    const created = await pocketService.createPocket(req.body);
    res.status(201).json(created);
  } catch (error) {
    console.error('POST /api/pockets error:', error);
    res.status(400).json({ error: error.message });
  }
});

pocketRouter.put('/:id', async (req, res) => {
  try {
    const updated = await pocketService.updatePocket(req.params.id, req.body);
    res.json(updated);
  } catch (error) {
    console.error(`PUT /api/pockets/${req.params.id} error:`, error);
    res.status(400).json({ error: error.message });
  }
});

pocketRouter.delete('/:id', async (req, res) => {
  try {
    await pocketService.deletePocket(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error(`DELETE /api/pockets/${req.params.id} error:`, error);
    res.status(500).json({ error: error.message });
  }
});
