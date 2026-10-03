import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { RECEIPT_DATE_POPOVER_WIDTH, RECEIPT_NUMBER_POPOVER_WIDTH } from './cardUtils.js';
import { AccountOperation, TimelineColor } from '../../enums/index.js';
import { AlertCircle, FileText, Plus } from 'lucide-react';
import { format, parseISO } from 'date-fns';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function EventReceiptRef({ onPositiveCard }) {
  const {
    accountOperation,
    canEditPaymentDate,
    event,
    getProposedReceiptNumber,
    isCancelled,
    isCompleted,
    isDepositReference,
    isExpenseEvent,
    isIncomeEvent,
    isInvestmentEvent,
    isLoanInstallment,
    isOverdue,
    isOverdueExpense,
    isOverdueIncome,
    isOverdueInvestment,
    isOverdueLoan,
    isOverdueReminder,
    isReminderEvent,
    receiptDateAnchorRef,
    receiptNumberAnchorRef,
    saveReceiptNumber,
    setIsReceiptDateOpen,
    setIsReceiptNumberOpen,
    setReceiptDateDraft,
    setReceiptDatePos,
    setReceiptNumberDraft,
    setReceiptNumberError,
    setReceiptNumberPos,
    t
  } = useEventCard();

  const receiptNumber = event.cont_year ?? event.contYear;
  const hasReceiptNumber = receiptNumber != null && Number(receiptNumber) > 0;
  const paymentDate = isCompleted && !isCancelled ? (event.receiptDate || event.date) : null;
  // The receipt number can be added or changed at any time (same rules as the receipt modal)
  const canManageReceiptNumber = Boolean(paymentDate) && canEditPaymentDate
    && Boolean(saveReceiptNumber);
  const canAddReceiptNumber = !hasReceiptNumber && canManageReceiptNumber;
  const canChangeReceiptNumber = hasReceiptNumber && canManageReceiptNumber;
  const openReceiptNumberPopover = (e, initialValue) => {
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setReceiptNumberPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - RECEIPT_NUMBER_POPOVER_WIDTH - 8)) });
    setReceiptNumberDraft(String(initialValue || ''));
    setReceiptNumberError('');
    setIsReceiptDateOpen(false);
    setIsReceiptNumberOpen((open) => !open);
  };
  if (!hasReceiptNumber && !paymentDate) {
    if (isCancelled) return null;
    const isEventOverdue = Boolean(isOverdue || isOverdueIncome || isOverdueExpense || isOverdueInvestment || isOverdueLoan || isOverdueReminder);
    // A bank deposit shown in the wallet is still to be deposited (not to be paid)
    const pendingLabel = isDepositReference
      ? t('status.toDeposit')
      : isIncomeEvent
      ? t('status.toReceive')
      : (isExpenseEvent || isLoanInstallment)
      ? t('status.toPay')
      : accountOperation === AccountOperation.RECEIVE
      ? t('status.toReceive')
      : accountOperation === AccountOperation.PAY
      ? t('status.toPay')
      : accountOperation === AccountOperation.WITHDRAW
      ? t('status.toWithdraw')
      : isInvestmentEvent
      ? t('status.toCredit')
      : isReminderEvent
      ? t('status.open')
      : t('status.pending');

    return (
      <span
        style={{
          fontSize: '0.68rem',
          color: onPositiveCard ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)',
          textTransform: 'uppercase',
          fontWeight: '700',
          letterSpacing: '0.04em',
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {isEventOverdue && (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              background: `${TimelineColor.AMBER}29`,
              color: TimelineColor.WARNING,
              border: `1px solid ${TimelineColor.AMBER}66`,
              borderRadius: '4px',
              padding: '1px 5px',
              fontSize: '0.62rem',
              fontWeight: '800',
              lineHeight: '13px',
              letterSpacing: '0.02em'
            }}
          >
            <AlertCircle size={10} />
            {t('status.overdue')}
          </span>
        )}
        <span>{pendingLabel}</span>
      </span>
    );
  }
  return (
    <span style={{ fontSize: '0.7rem', color: onPositiveCard ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
      <FileText size={10} />
      {canChangeReceiptNumber ? (
        <button
          type="button"
          ref={receiptNumberAnchorRef}
          title={t('receipt.editNumberHint')}
          onClick={(e) => openReceiptNumberPopover(e, receiptNumber)}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            font: 'inherit',
            color: 'inherit',
            textTransform: 'inherit',
            textDecoration: 'underline dotted',
            cursor: 'pointer'
          }}
        >
          {t('receipt.receiptNumber', { number: receiptNumber })}
        </button>
      ) : (hasReceiptNumber && t('receipt.receiptNumber', { number: receiptNumber }))}
      {canAddReceiptNumber && (
        <button
          type="button"
          ref={receiptNumberAnchorRef}
          title={t('receipt.addNumberHint')}
          onClick={(e) => openReceiptNumberPopover(e, getProposedReceiptNumber?.(event))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
            padding: '0 6px',
            lineHeight: '14px',
            borderRadius: '9999px',
            border: '1px solid currentColor',
            background: 'transparent',
            color: 'inherit',
            font: 'inherit',
            fontSize: '0.62rem',
            textTransform: 'inherit',
            cursor: 'pointer',
            opacity: 0.9
          }}
        >
          <Plus size={9} />
          {t('receipt.addNumber')}
        </button>
      )}
      {(hasReceiptNumber || canAddReceiptNumber) && paymentDate && <span style={{ opacity: 0.6 }}>|</span>}
      {paymentDate && (canEditPaymentDate ? (
        <button
          type="button"
          title={t('receipt.changePaymentDate')}
          ref={receiptDateAnchorRef}
          onClick={(e) => {
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            setReceiptDatePos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - RECEIPT_DATE_POPOVER_WIDTH - 8)) });
            setReceiptDateDraft(paymentDate);
            setIsReceiptNumberOpen(false);
            setIsReceiptDateOpen((open) => !open);
          }}
          style={{
            background: 'transparent',
            border: 'none',
            padding: 0,
            font: 'inherit',
            color: 'inherit',
            textTransform: 'inherit',
            textDecoration: 'underline dotted',
            cursor: 'pointer'
          }}
        >
          {t('receipt.paymentDateShort', { date: format(parseISO(paymentDate), 'dd/MM/yyyy') })}
        </button>
      ) : t('receipt.paymentDateShort', { date: format(parseISO(paymentDate), 'dd/MM/yyyy') }))}
    </span>
  );
}
