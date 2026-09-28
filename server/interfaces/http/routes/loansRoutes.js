import { Router } from 'express';
import { resourceAccessParam, resourceAccessFromBody } from '../middleware/timeboardAccess.js';
import { loanService } from '../../../application/services/LoanService.js';
import { requireCapability } from '../middleware/requireCapability.js';
import { Capability } from '../../../../shared/permissions.js';

export const loansRouter = Router();

// Access to the timeboard of the resource in the URL
loansRouter.param('id', resourceAccessParam('loan'));
loansRouter.param('timelineId', resourceAccessParam('timeline'));

// GET /api/loans
loansRouter.get('/', async (req, res) => {
  try {
    const loans = await loanService.getLoanContracts();
    res.json(loans);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/loans/timeline/:timelineId
loansRouter.get('/timeline/:timelineId', async (req, res) => {
  try {
    const contract = await loanService.getContractByTimelineId(req.params.timelineId);
    res.json(contract || null);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/loans
loansRouter.post('/', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const newContract = await loanService.createContract(req.body);
    res.status(201).json(newContract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// PUT /api/loans/:id
loansRouter.put('/:id', requireCapability(Capability.MANAGE), async (req, res) => {
  try {
    const updatedContract = await loanService.updateContract(req.params.id, req.body);
    res.json(updatedContract);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/loans/amortize
loansRouter.post('/amortize', resourceAccessFromBody('loan', 'loanId'), requireCapability(Capability.EDIT), async (req, res) => {
  try {
    const result = await loanService.amortizeLoan(req.body);
    res.json(result);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});
