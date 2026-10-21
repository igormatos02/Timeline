import { Router } from 'express';
import { meService } from '../../../application/services/MeService.js';
import { createT } from '../../../../shared/i18n/index.js';
import { rateLimit, RateLimitRule } from '../middleware/rateLimit.js';
import { receiptCodeService } from '../../../application/services/ReceiptCodeService.js';

export const receiptsRouter = Router();

// Plain page shown when a receipt link can no longer be opened (no app styles: it opens in the phone's browser)
const unavailablePage = (language) => {
  const t = createT(language);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${t('backend.receiptLink.unavailableTitle')}</title></head>`
    + `<body style="font-family: sans-serif; padding: 24px;"><h2>${t('backend.receiptLink.unavailableTitle')}</h2>`
    + `<p>${t('backend.receiptLink.unavailableBody')}</p></body></html>`;
};

const receiptCodeLimit = rateLimit({ ...RateLimitRule.RECEIPT_CODE, message: createT('en')('backend.validation.tooManyAttempts') });

// GET /api/receipts/verify/:code — public: whether a receipt code is valid (timeboard.pt/recibo/<code>)
receiptsRouter.get('/verify/:code', receiptCodeLimit, async (req, res) => {
  try {
    res.json(await receiptCodeService.verify(req.params.code, String(req.query.lang || 'pt')));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/receipts/code/:code — public: the receipt of a valid code (the e-mail and the verification page open it)
receiptsRouter.get('/code/:code', receiptCodeLimit, async (req, res) => {
  const language = String(req.query.lang || 'pt');
  try {
    const html = await receiptCodeService.renderByCode(req.params.code, language);
    if (!html) return res.status(404).type('html').send(unavailablePage(language));
    res.type('html').send(html);
  } catch {
    res.status(500).type('html').send(unavailablePage(language));
  }
});

// GET /api/receipts/:token — public: the receipt of a signed, short-lived link asked for by the mobile app
receiptsRouter.get('/:token', rateLimit({ ...RateLimitRule.RECEIPT_LINK, message: createT('en')('backend.validation.tooManyAttempts') }), async (req, res) => {
  const language = String(req.query.lang || 'pt');
  try {
    const html = await meService.renderReceipt(req.params.token);
    res.set('Cache-Control', 'no-store');
    if (!html) return res.status(404).type('html').send(unavailablePage(language));
    res.type('html').send(html);
  } catch {
    res.status(500).type('html').send(unavailablePage(language));
  }
});
