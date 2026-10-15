import { Router } from 'express';
import { meService } from '../../../application/services/MeService.js';
import { createT } from '../../../../shared/i18n/index.js';

export const receiptsRouter = Router();

// Plain page shown when a receipt link can no longer be opened (no app styles: it opens in the phone's browser)
const unavailablePage = (language) => {
  const t = createT(language);
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">`
    + `<title>${t('backend.receiptLink.unavailableTitle')}</title></head>`
    + `<body style="font-family: sans-serif; padding: 24px;"><h2>${t('backend.receiptLink.unavailableTitle')}</h2>`
    + `<p>${t('backend.receiptLink.unavailableBody')}</p></body></html>`;
};

// GET /api/receipts/:token — public: the receipt of a signed, short-lived link asked for by the mobile app
receiptsRouter.get('/:token', async (req, res) => {
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
