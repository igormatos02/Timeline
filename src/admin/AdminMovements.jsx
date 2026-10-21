import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, FileText, ListChecks, Loader2, Mail, Send, Share2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Browser } from '@capacitor/browser';
import { Share } from '@capacitor/share';
import { EntityDirection, EventStatus, PaymentChannel, TimelineColor, TimelineType, getFixedTimelineColor } from '../enums/index.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import { ADMIN_APP_OUTFLOWS_ENABLED } from '../../shared/config/featureFlags.js';
import * as mobileApi from '../mobile/mobileApi.js';
import styles from '../mobile/MobileApp.module.css';

// Tag of where the money was received / paid (same labels and colors as the web cards)
const CHANNEL_TAGS = {
  [PaymentChannel.CASH]: { labelKey: 'modal.cashIncome', color: getFixedTimelineColor(TimelineType.WALLET) },
  [PaymentChannel.BANK]: { labelKey: 'modal.externalDeposit', color: getFixedTimelineColor(TimelineType.INVESTMENT) }
};

const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || '').trim());

/**
 * The month's fees of the condominium (GET /api/me/movements): a pending one is received with the web's status
 * route and rules (it gets its receipt number and code); a received one shows its receipt, shares its link or
 * e-mails it. Outflows are hidden for now (ADMIN_APP_OUTFLOWS_ENABLED): the web handles them.
 */
export default function AdminMovements({ movements, t, dateLocale, onChanged, onError }) {
  const [side, setSide] = useState(ADMIN_APP_OUTFLOWS_ENABLED ? EventStatus.ALL : EntityDirection.OWES);
  const [state, setState] = useState(EventStatus.PENDING);
  const [savingId, setSavingId] = useState(null);
  // Receipt being e-mailed: { movementId, email }
  const [emailDraft, setEmailDraft] = useState(null);
  const [notice, setNotice] = useState('');

  const shown = useMemo(() => (movements || []).filter((movement) => (
    (ADMIN_APP_OUTFLOWS_ENABLED || movement.side === EntityDirection.OWES)
    && (side === EventStatus.ALL || movement.side === side)
    && (state === EventStatus.ALL || (state === EventStatus.PAID ? movement.isPaid : !movement.isPaid))
  )), [movements, side, state]);

  const handleSettle = async (movement) => {
    setSavingId(movement.id);
    try {
      await mobileApi.setMovementEffective(movement.id, movement.effectiveStatus);
      await onChanged();
    } catch (err) {
      onError(err);
    } finally {
      setSavingId(null);
    }
  };

  // Receipt code of a received fee (its verification page and the receipt itself)
  const receiptLinks = async (movement) => {
    const result = await mobileApi.getReceiptCode(movement.id, movement.date);
    if (!result?.code) throw new Error(t('admin.receipt.unavailable'));
    return { verifyUrl: result.verifyUrl, receiptUrl: `${new URL(result.verifyUrl).origin}/api/receipts/code/${encodeURIComponent(result.code)}` };
  };

  const runAction = async (movement, action) => {
    setSavingId(movement.id);
    setNotice('');
    try {
      await action();
    } catch (err) {
      // Closing the share sheet is not an error
      if (!/cancel/i.test(err?.message || '')) onError(err);
    } finally {
      setSavingId(null);
    }
  };

  const handleView = (movement) => runAction(movement, async () => {
    const { receiptUrl } = await receiptLinks(movement);
    await Browser.open({ url: receiptUrl });
  });

  const handleShare = (movement) => runAction(movement, async () => {
    const { verifyUrl } = await receiptLinks(movement);
    await Share.share({
      title: t('admin.receipt.shareTitle', { title: movement.title }),
      text: t('admin.receipt.shareText', { title: movement.title, person: movement.personName, amount: formatCurrency(movement.amount) }),
      url: verifyUrl,
      dialogTitle: t('admin.receipt.share')
    });
  });

  const handleSendEmail = (movement) => runAction(movement, async () => {
    const email = emailDraft.email.trim();
    const result = await mobileApi.sendReceiptEmail(movement.id, { date: movement.date, personId: movement.personId, email });
    setEmailDraft(null);
    setNotice(t(result?.sent ? 'receipt.sendEmailSent' : 'receipt.sendEmailQueued', { email }));
  });

  const chips = (options, value, onChange) => (
    <div className={styles.chipRow}>
      {options.map(([key, labelKey]) => (
        <button key={key} type="button" className={`${styles.chip} ${value === key ? styles.chipActive : ''}`} onClick={() => onChange(key)}>
          {t(labelKey)}
        </button>
      ))}
    </div>
  );

  return (
    <div className={styles.card}>
      <div className={styles.noticeHeading}><ListChecks size={16} />{t(ADMIN_APP_OUTFLOWS_ENABLED ? 'admin.movementsTitle' : 'admin.feesTitle')}</div>
      {ADMIN_APP_OUTFLOWS_ENABLED && chips([
        [EventStatus.ALL, 'admin.filterAll'],
        [EntityDirection.OWES, 'admin.filterIncome'],
        [EntityDirection.RECEIVES, 'admin.filterOutflows']
      ], side, setSide)}
      {chips([
        [EventStatus.PENDING, 'admin.filterPending'],
        [EventStatus.PAID, ADMIN_APP_OUTFLOWS_ENABLED ? 'admin.filterPaid' : 'admin.filterReceived'],
        [EventStatus.ALL, 'admin.filterAll']
      ], state, setState)}

      {notice && <div className={styles.itemMeta} role="status" style={{ color: TimelineColor.SUCCESS }}>{notice}</div>}

      {movements === null ? (
        <Loader2 size={22} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)' }} />
      ) : shown.length === 0 ? (
        <div className={styles.empty}>{t('admin.noMovements')}</div>
      ) : shown.map((movement) => {
        const isIncome = movement.side === EntityDirection.OWES;
        const amountColor = isIncome ? TimelineColor.SUCCESS : TimelineColor.DANGER;
        const tag = CHANNEL_TAGS[movement.channel];
        const isBusy = savingId === movement.id;
        const hasReceipt = isIncome && movement.isPaid && Boolean(movement.personId);
        const isEmailing = emailDraft?.movementId === movement.id;
        return (
          <div key={movement.id} className={styles.noticeItem} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div className={styles.itemTitle}>{movement.title}</div>
                <div className={styles.itemMeta}>
                  {format(parseISO(movement.date), 'dd MMM', { locale: dateLocale })}
                  {movement.personName ? ` · ${movement.personName}` : ''}
                </div>
                {tag && (
                  <div className={styles.itemExtra}>
                    <span className={styles.channelTag} style={{ background: `${tag.color}1f`, color: tag.color, borderColor: `${tag.color}59` }}>{t(tag.labelKey)}</span>
                  </div>
                )}
              </div>
              <div className={styles.itemRight}>
                <div className={styles.itemAmount} style={{ color: amountColor }}>{isIncome ? '+' : '-'}{formatCurrency(movement.amount)}</div>
                {movement.isPaid ? (
                  <span className={styles.badge} style={{ background: `${TimelineColor.SUCCESS}1f`, color: TimelineColor.SUCCESS }}>
                    <CheckCircle2 size={12} /> {t(isIncome ? 'status.received' : 'status.paid')}
                  </span>
                ) : (
                  <button type="button" className={styles.settleButton} onClick={() => handleSettle(movement)} disabled={isBusy}>
                    {isBusy
                      ? <Loader2 size={14} className={styles.spin} />
                      : (isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />)}
                    {t(isIncome ? 'status.actionReceive' : 'status.actionPay')}
                  </button>
                )}
              </div>
            </div>

            {/* Receipt of a received fee: view, share its link, e-mail it */}
            {hasReceipt && (
              <div className={styles.chipRow}>
                <button type="button" className={styles.chip} onClick={() => handleView(movement)} disabled={isBusy}><FileText size={13} /> {t('admin.receipt.view')}</button>
                <button type="button" className={styles.chip} onClick={() => handleShare(movement)} disabled={isBusy}><Share2 size={13} /> {t('admin.receipt.share')}</button>
                <button type="button" className={styles.chip} onClick={() => setEmailDraft(isEmailing ? null : { movementId: movement.id, email: movement.personEmail || '' })} disabled={isBusy}>
                  <Mail size={13} /> {t('admin.receipt.email')}
                </button>
                {isBusy && <Loader2 size={14} className={styles.spin} />}
              </div>
            )}
            {isEmailing && (
              <form onSubmit={(e) => { e.preventDefault(); if (isValidEmail(emailDraft.email)) handleSendEmail(movement); }} style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  className={styles.input}
                  value={emailDraft.email}
                  onChange={(e) => setEmailDraft({ ...emailDraft, email: e.target.value })}
                  placeholder={t('receipt.sendEmailPlaceholder')}
                  aria-label={t('receipt.sendEmailPlaceholder')}
                  style={{ flex: 1, minWidth: 0 }}
                />
                <button type="submit" className={styles.settleButton} disabled={isBusy || !isValidEmail(emailDraft.email)}>
                  <Send size={14} /> {t('receipt.sendEmailSubmit')}
                </button>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}
