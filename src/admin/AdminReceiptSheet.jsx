import React, { useEffect, useState } from 'react';
import { Loader2, Mail, Printer, Send, Share2, X } from 'lucide-react';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import { TimelineColor } from '../enums/index.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import * as mobileApi from '../mobile/mobileApi.js';
import styles from '../mobile/MobileApp.module.css';

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

/**
 * Receipt of a received fee (CondoFlow Gestão): the receipt itself (with its number, code and QR) and what can be
 * done with it — e-mail it to the owner, print it / save it as PDF (in the browser: the app's web view cannot
 * print) or share its verification link.
 */
export default function AdminReceiptSheet({ movement, t, onClose }) {
  const [links, setLinks] = useState(null);
  const [error, setError] = useState('');
  const [email, setEmail] = useState(null);
  const [isBusy, setIsBusy] = useState(false);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let isActive = true;
    mobileApi.getReceiptCode(movement.id, movement.date)
      .then((result) => {
        if (!isActive) return;
        if (!result?.code) {
          setError(t('admin.receipt.unavailable'));
          return;
        }
        setLinks({
          code: result.code,
          verifyUrl: result.verifyUrl,
          receiptUrl: `${new URL(result.verifyUrl).origin}/api/receipts/code/${encodeURIComponent(result.code)}`
        });
      })
      .catch((err) => isActive && setError(err.message));
    return () => { isActive = false; };
  }, [movement.id, movement.date, t]);

  const run = async (action) => {
    setIsBusy(true);
    setNotice('');
    try {
      await action();
    } catch (err) {
      // Closing the share sheet is not an error
      if (!/cancel/i.test(err?.message || '')) setError(err.message);
    } finally {
      setIsBusy(false);
    }
  };

  const handlePrint = () => run(() => Browser.open({ url: links.receiptUrl }));
  const handleShare = () => run(() => Share.share({
    title: t('admin.receipt.shareTitle', { title: movement.title }),
    text: t('admin.receipt.shareText', { title: movement.title, person: movement.personName, amount: formatCurrency(movement.amount) }),
    url: links.verifyUrl,
    dialogTitle: t('admin.receipt.share')
  }));
  const handleSendEmail = (e) => {
    e.preventDefault();
    if (!isValidEmail(email)) return;
    run(async () => {
      const address = email.trim();
      const result = await mobileApi.sendReceiptEmail(movement.id, { date: movement.date, personId: movement.personId, email: address });
      setEmail(null);
      setNotice(t(result?.sent ? 'receipt.sendEmailSent' : 'receipt.sendEmailQueued', { email: address }));
    });
  };

  return (
    <div className={styles.sheetBackdrop} role="dialog" aria-modal="true" onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()} style={{ maxHeight: '94vh' }}>
        <div className={styles.monthNav}>
          <div style={{ minWidth: 0 }}>
            <div className={styles.itemTitle}>{t('admin.receipt.title')}</div>
            <div className={styles.itemMeta}>{movement.title}{movement.personName ? ` · ${movement.personName}` : ''} · {formatCurrency(movement.amount)}</div>
          </div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={t('admin.form.cancel')}><X size={18} /></button>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}
        {notice && <div className={styles.itemMeta} role="status" style={{ color: TimelineColor.SUCCESS }}>{notice}</div>}

        {!links && !error && <Loader2 size={22} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)' }} />}

        {links && (
          <>
            {/* The receipt as it is printed (number, code and QR) */}
            <iframe title={t('admin.receipt.title')} src={links.receiptUrl} style={{ width: '100%', height: '46vh', border: '1px solid var(--border-glass)', borderRadius: '12px', background: 'var(--text-white)' }} />

            <div className={styles.actionRow} style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button type="button" className={styles.primaryButton} onClick={() => setEmail(email === null ? movement.personEmail || '' : null)} disabled={isBusy}>
                <Mail size={16} /><span>{t('admin.receipt.email')}</span>
              </button>
              <button type="button" className={styles.primaryButton} onClick={handlePrint} disabled={isBusy}>
                <Printer size={16} /><span>{t('admin.receipt.print')}</span>
              </button>
              <button type="button" className={styles.primaryButton} onClick={handleShare} disabled={isBusy}>
                <Share2 size={16} /><span>{t('admin.receipt.share')}</span>
              </button>
            </div>
            <span className={styles.itemMeta}>{t('admin.receipt.printHint')}</span>

            {email !== null && (
              <form onSubmit={handleSendEmail} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  autoFocus
                  className={styles.input}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('receipt.sendEmailPlaceholder')}
                  aria-label={t('receipt.sendEmailPlaceholder')}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="submit" className={styles.settleButton} disabled={isBusy || !isValidEmail(email)}>
                  {isBusy ? <Loader2 size={14} className={styles.spin} /> : <Send size={14} />} {t('receipt.sendEmailSubmit')}
                </button>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}
