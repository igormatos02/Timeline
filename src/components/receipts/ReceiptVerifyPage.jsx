import React, { useEffect, useState } from 'react';
import { CheckCircle2, Home, Loader2, Search, XCircle } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';
import { BRAND } from '../../../shared/config/businessConfig.js';
import { LandingFooter } from '../landing/LandingPage.jsx';
import * as api from '../../services/api.js';

// Public pages: /recibo/<code> (also /receipt/<code>)
const RECEIPT_PATHS = ['recibo', 'receipt'];
const ReceiptState = Object.freeze({ VALID: 'valid', VOIDED: 'voided', NOT_FOUND: 'notFound' });

/** Receipt code in a public path (/recibo/<code>), '' for the page without code, null when it is another page. */
export function receiptCodeFromPath(pathname) {
  const [first, code] = String(pathname || '').split('/').filter(Boolean);
  if (!RECEIPT_PATHS.includes(first)) return null;
  return decodeURIComponent(code || '');
}

/**
 * Receipt verification (timeboard.pt/recibo/<code>, opened from the QR code of a receipt or its e-mail): tells
 * whether the receipt is valid — with its essentials and the receipt itself — voided or unknown.
 */
export default function ReceiptVerifyPage({ initialCode = '' }) {
  const { t, language } = useTranslation();
  const [code, setCode] = useState(initialCode);
  const [result, setResult] = useState(null);
  const [isLoading, setIsLoading] = useState(Boolean(initialCode));
  const [error, setError] = useState('');

  const check = async (value) => {
    const clean = String(value || '').trim();
    if (!clean) return;
    setIsLoading(true);
    setError('');
    try {
      setResult(await api.verifyReceiptCode(clean, language));
      window.history.replaceState({}, '', `/${RECEIPT_PATHS[0]}/${encodeURIComponent(clean.toUpperCase())}`);
    } catch {
      setError(t('receiptVerify.error'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) check(initialCode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const card = { width: '100%', maxWidth: '520px', boxSizing: 'border-box', padding: '22px', borderRadius: '16px', border: '1px solid var(--border-glass)', background: 'var(--bg-card)', display: 'flex', flexDirection: 'column', gap: '12px' };
  const row = (label, value) => value ? (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.9rem' }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ color: 'var(--text-main)', textAlign: 'right' }}>{value}</strong>
    </div>
  ) : null;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-main)', display: 'flex', flexDirection: 'column' }}>
      <header style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ background: TimelineColor.CONDOFLOW, color: 'var(--text-white)', borderRadius: '10px', padding: '7px', display: 'flex' }}><Home size={18} /></div>
        <strong style={{ color: 'var(--text-main)' }}>{BRAND.product}</strong>
        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>· {t('receiptVerify.title')}</span>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', padding: '32px 16px' }}>
        <form onSubmit={(e) => { e.preventDefault(); check(code); }} style={{ ...card, flexDirection: 'row', alignItems: 'center', padding: '12px' }}>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder={t('receiptVerify.codePlaceholder')}
            aria-label={t('receiptVerify.codePlaceholder')}
            style={{ flex: 1, minWidth: 0, padding: '10px 12px', borderRadius: '10px', border: '1px solid var(--border-glass)', background: 'var(--bg-card-hover)', color: 'var(--text-main)', fontFamily: 'monospace', fontSize: '0.95rem', letterSpacing: '1px' }}
          />
          <button type="submit" disabled={isLoading || !code.trim()} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 14px', borderRadius: '10px', border: 'none', background: TimelineColor.CONDOFLOW, color: 'var(--text-white)', fontWeight: 700, cursor: 'pointer' }}>
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Search size={16} />}
            {t('receiptVerify.check')}
          </button>
        </form>

        {error && <div role="alert" style={{ color: TimelineColor.DANGER }}>{error}</div>}

        {result?.state === ReceiptState.VALID && (
          <div style={{ ...card, borderColor: TimelineColor.SUCCESS }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: TimelineColor.SUCCESS }}>
              <CheckCircle2 size={26} />
              <strong style={{ fontSize: '1.15rem' }}>{t('receiptVerify.valid')}</strong>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{t('receiptVerify.validHint')}</span>
            {row(t('receiptVerify.code'), result.code)}
            {row(t('receiptVerify.condominium'), result.condominium)}
            {row(t('receiptVerify.unit'), result.unit)}
            {row(t('receiptVerify.concept'), result.concept)}
            {row(t('receiptVerify.month'), result.month)}
            {row(t('receiptVerify.amount'), result.amount)}
            {row(t('receiptVerify.paymentDate'), result.paymentDate)}
            {row(t('receiptVerify.receiptNumber'), result.receiptNumber ? String(result.receiptNumber) : '')}
            <a href={`/api/receipts/code/${encodeURIComponent(result.code)}?lang=${language}`} target="_blank" rel="noreferrer" style={{ alignSelf: 'flex-start', marginTop: '6px', padding: '10px 16px', borderRadius: '10px', background: TimelineColor.CONDOFLOW, color: 'var(--text-white)', fontWeight: 700, textDecoration: 'none' }}>
              {t('receiptVerify.open')}
            </a>
          </div>
        )}

        {(result?.state === ReceiptState.VOIDED || result?.state === ReceiptState.NOT_FOUND) && (
          <div style={{ ...card, borderColor: TimelineColor.DANGER }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: TimelineColor.DANGER }}>
              <XCircle size={26} />
              <strong style={{ fontSize: '1.15rem' }}>{t(result.state === ReceiptState.VOIDED ? 'receiptVerify.voided' : 'receiptVerify.notFound')}</strong>
            </div>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              {t(result.state === ReceiptState.VOIDED ? 'receiptVerify.voidedHint' : 'receiptVerify.notFoundHint')}
            </span>
          </div>
        )}
      </main>

      <LandingFooter />
    </div>
  );
}
