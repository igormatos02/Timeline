import React, { useMemo, useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, CheckCircle2, ListChecks, Loader2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { EntityDirection, EventStatus, PaymentChannel, TimelineColor, TimelineType, getFixedTimelineColor } from '../enums/index.js';
import { formatCurrency } from '../utils/formatCurrency.js';
import * as mobileApi from '../mobile/mobileApi.js';
import styles from '../mobile/MobileApp.module.css';

// Tag of where the money was received / paid (same labels and colors as the web cards)
const CHANNEL_TAGS = {
  [PaymentChannel.CASH]: { labelKey: 'modal.cashIncome', color: getFixedTimelineColor(TimelineType.WALLET) },
  [PaymentChannel.BANK]: { labelKey: 'modal.externalDeposit', color: getFixedTimelineColor(TimelineType.INVESTMENT) }
};

/**
 * The month's movements of the condominium (GET /api/me/movements), filtered by side (income / outflows) and state
 * (pending / effective). A pending one is received or paid with the web's status route and rules; once effective it
 * is locked, like on the web (corrections stay on the web).
 */
export default function AdminMovements({ movements, t, dateLocale, onChanged, onError }) {
  const [side, setSide] = useState(EventStatus.ALL);
  const [state, setState] = useState(EventStatus.PENDING);
  const [savingId, setSavingId] = useState(null);

  const shown = useMemo(() => (movements || []).filter((movement) => (
    (side === EventStatus.ALL || movement.side === side)
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
      <div className={styles.noticeHeading}><ListChecks size={16} />{t('admin.movementsTitle')}</div>
      {chips([
        [EventStatus.ALL, 'admin.filterAll'],
        [EntityDirection.OWES, 'admin.filterIncome'],
        [EntityDirection.RECEIVES, 'admin.filterOutflows']
      ], side, setSide)}
      {chips([
        [EventStatus.PENDING, 'admin.filterPending'],
        [EventStatus.PAID, 'admin.filterPaid'],
        [EventStatus.ALL, 'admin.filterAll']
      ], state, setState)}

      {movements === null ? (
        <Loader2 size={22} className={styles.spin} style={{ alignSelf: 'center', color: 'var(--primary)' }} />
      ) : shown.length === 0 ? (
        <div className={styles.empty}>{t('admin.noMovements')}</div>
      ) : shown.map((movement) => {
        const isIncome = movement.side === EntityDirection.OWES;
        const amountColor = isIncome ? TimelineColor.SUCCESS : TimelineColor.DANGER;
        const tag = CHANNEL_TAGS[movement.channel];
        return (
          <div key={movement.id} className={styles.noticeItem} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
                <button type="button" className={styles.settleButton} onClick={() => handleSettle(movement)} disabled={savingId === movement.id}>
                  {savingId === movement.id
                    ? <Loader2 size={14} className={styles.spin} />
                    : (isIncome ? <ArrowDownLeft size={14} /> : <ArrowUpRight size={14} />)}
                  {t(isIncome ? 'status.actionReceive' : 'status.actionPay')}
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
