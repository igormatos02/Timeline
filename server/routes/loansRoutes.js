import { Router } from 'express';
import { loanService } from '../services/LoanService.js';

export const loansRouter = Router();

// GET /api/loans
loansRouter.get('/', async (req, res) => {
  try {
    const loans = await loanService.getLoanContracts();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loans/amortize
loansRouter.post('/amortize', async (req, res) => {
  try {
    const result = await loanService.amortizeLoan(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
