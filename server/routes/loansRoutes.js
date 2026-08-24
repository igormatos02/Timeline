import { Router } from 'express';
import { timelineService } from '../services/TimelineService.js';

export const loansRouter = Router();

// GET /api/loans
loansRouter.get('/', async (req, res) => {
  try {
    const loans = await timelineService.getLoanContracts();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loans/amortize
loansRouter.post('/amortize', async (req, res) => {
  try {
    const result = await timelineService.amortizeLoan(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
