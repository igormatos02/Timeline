import React, { useState } from 'react';
import { Loader2, X } from 'lucide-react';
import { format } from 'date-fns';
import {
  AccountOperation,
  EventPeriodicity,
  EventRecurrence,
  EventStatus,
  EventType,
  ExpenseEventCategory,
  InvestmentEventCategory,
  PaymentChannel,
  accountOperationEventType
} from '../enums/index.js';
import { effectiveStatusFor, pendingStatusFor } from '../../shared/finance/statusRules.js';
import { generateUUID } from '../../shared/utils/uuid.js';
import { CONDO_EXPENSE_CATEGORY_META } from '../components/event-modals/FinancialEventModalConfig.js';
import * as mobileApi from '../mobile/mobileApi.js';
import styles from '../mobile/MobileApp.module.css';

// What the form records: an outflow (from the cash or the bank account) or a deposit of the cash into the bank
export const AdminFormKind = Object.freeze({
  EXPENSE: 'expense',
  DEPOSIT: 'deposit'
});

/**
 * CondoFlow Gestão: records an outflow or a bank deposit with the same payload as the web forms (POST /api/events),
 * pending by default; "already done" then settles it through the web's status route (same checks, e.g. the cash
 * balance of a deposit).
 */
export default function AdminMovementForm({ kind, timeboardId, places, t, onClose, onSaved, onError }) {
  const isDeposit = kind === AdminFormKind.DEPOSIT;
  const [title, setTitle] = useState(isDeposit ? t('admin.form.depositDefaultTitle') : '');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [place, setPlace] = useState(PaymentChannel.CASH);
  const [category, setCategory] = useState(ExpenseEventCategory.OTHER);
  const [isDone, setIsDone] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const buildMovement = (value) => {
    const isFromAccount = isDeposit || place === PaymentChannel.BANK;
    const timelineId = isFromAccount ? places.accountTimelineId : places.walletTimelineId;
    const base = {
      id: generateUUID(),
      title: title.trim(),
      name: title.trim(),
      description: '',
      date,
      dayOfMonth: Number(date.substring(8, 10)),
      recurrence: EventRecurrence.ONCE,
      isRecurring: false,
      periodicity: EventPeriodicity.MONTHLY,
      timeboardId,
      timelineId,
      timelineOriginId: timelineId,
      isObligation: false,
      obligationPersonId: null,
      pocketId: null,
      pocket_id: null
    };
    if (isDeposit) {
      // Cash into the bank account: an internal account deposit
      const eventType = accountOperationEventType(AccountOperation.DEPOSIT);
      return { ...base, eventType, amount: value, isExternal: false, is_external: false, category: InvestmentEventCategory.OTHER, status: pendingStatusFor({ eventType }) };
    }
    if (place === PaymentChannel.BANK) {
      // Paid by the bank account: stored like the web's account outflow (negative amount)
      return { ...base, eventType: accountOperationEventType(AccountOperation.PAY), amount: -value, isInvestment: true, isWithdrawal: false, category, status: EventStatus.PENDING };
    }
    return { ...base, eventType: EventType.EXPENSE, amount: value, category, status: EventStatus.PENDING };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const value = Math.abs(Number(String(amount).replace(',', '.')));
    if (!title.trim() || !value) {
      setError(t('admin.form.required'));
      return;
    }
    setIsSaving(true);
    setError('');
    try {
      const movement = buildMovement(value);
      const created = await mobileApi.createMovement(movement);
      if (isDone) await mobileApi.setMovementEffective(created?.id || movement.id, effectiveStatusFor(movement));
      await onSaved();
      onClose();
    } catch (err) {
      setError(err.message);
      onError?.(err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.sheetBackdrop} role="dialog" aria-modal="true" onClick={onClose}>
      <form className={styles.sheet} onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()}>
        <div className={styles.monthNav}>
          <div className={styles.noticeHeading} style={{ margin: 0 }}>{t(isDeposit ? 'admin.form.newDeposit' : 'admin.form.newExpense')}</div>
          <button type="button" className={styles.iconButton} onClick={onClose} aria-label={t('admin.form.cancel')}><X size={18} /></button>
        </div>

        {error && <div className={styles.error} role="alert">{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-movement-title">{t('admin.form.title')}</label>
          <input id="admin-movement-title" className={styles.input} value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-movement-amount">{t('admin.form.amount')}</label>
          <input id="admin-movement-amount" className={styles.input} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="admin-movement-date">{t('admin.form.date')}</label>
          <input id="admin-movement-date" type="date" className={styles.input} value={date} onChange={(e) => setDate(e.target.value)} />
        </div>

        {!isDeposit && (
          <>
            <div className={styles.label}>{t('admin.form.place')}</div>
            <div className={styles.chipRow}>
              {[[PaymentChannel.CASH, 'admin.form.cash'], [PaymentChannel.BANK, 'admin.form.bank']].map(([key, labelKey]) => (
                <button key={key} type="button" className={`${styles.chip} ${place === key ? styles.chipActive : ''}`} onClick={() => setPlace(key)}>{t(labelKey)}</button>
              ))}
            </div>
            <div className={styles.label}>{t('admin.form.category')}</div>
            <div className={styles.chipRow}>
              {Object.keys(CONDO_EXPENSE_CATEGORY_META).map((key) => (
                <button key={key} type="button" className={`${styles.chip} ${category === key ? styles.chipActive : ''}`} onClick={() => setCategory(key)}>
                  {t(`condoExpenseCategories.${key}`)}
                </button>
              ))}
            </div>
          </>
        )}

        <label className={styles.toggleRow}>
          <span>{t(isDeposit ? 'admin.form.alreadyDeposited' : 'admin.form.alreadyPaid')}</span>
          <input type="checkbox" checked={isDone} onChange={(e) => setIsDone(e.target.checked)} />
        </label>

        <button type="submit" className={styles.primaryButton} disabled={isSaving}>
          {isSaving ? <Loader2 size={18} className={styles.spin} /> : null}
          <span>{t('admin.form.save')}</span>
        </button>
      </form>
    </div>
  );
}
