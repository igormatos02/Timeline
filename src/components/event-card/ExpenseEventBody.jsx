import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import EventReceiptRef from './EventReceiptRef.jsx';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import { ArrowUpRight, Ban, CheckCircle2, Lock, TrendingUp } from 'lucide-react';
import ReceiptDateEditor from './ReceiptDateEditor.jsx';
import ReceiptNumberEditor from './ReceiptNumberEditor.jsx';
import EventCategoryPicker from './EventCategoryPicker.jsx';
import EditableAmount from './EditableAmount.jsx';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function ExpenseEventBody() {
  const {
    event,
    isCancelled,
    isDepositReference,
    isFutureMonth,
    isOverdueExpense,
    isPaidExpense,
    isTogglingStatus,
    paletteTheme,
    t
  } = useEventCard();
  // A bank deposit shown in the wallet is credited (not paid) and, once done, deposited
  const pendingLabel = t(isDepositReference ? 'status.actionContribute' : 'status.actionPay');
  const doneLabel = t(isDepositReference ? 'status.deposited' : 'status.paid');
  // Same icon as the credit action of the account and balance cards
  const PendingIcon = isDepositReference ? TrendingUp : ArrowUpRight;

  return (
    <div
      className={`loan-breakdown-strip ${isPaidExpense ? 'flat-positive-card flat-positive-expense' : ''}`}
      style={{
        background: isPaidExpense
          ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
          : 'transparent',
        border: isPaidExpense ? `1px solid ${TimelineColor.WHITE}40` : '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 10px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: isPaidExpense ? TimelineColor.WHITE : 'inherit',
        boxShadow: isPaidExpense ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Linha 2: [recibo/data de pagamento] (left) e [b status] (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <EventReceiptRef onPositiveCard={isPaidExpense} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <StatusDropdownButton buttonProps={{
              className: 'btn btn-sm',
              title: t('timeline.clickToChangeStatus'),
              style: {
                background: isCancelled
                  ? `${TimelineColor.SLATE_LIGHT}26`
                  : isPaidExpense
                    ? `${TimelineColor.WHITE}40`
                    : 'var(--primary)',
                color: isCancelled
                  ? TimelineColor.SLATE
                  : TimelineColor.WHITE,
                border: isCancelled
                  ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                  : isPaidExpense
                    ? `1px solid ${TimelineColor.WHITE}66`
                    : '1px solid transparent',
                borderRadius: '9999px',
                padding: '4px 12px',
                minWidth: '110px',
                height: '26px',
                boxSizing: 'border-box',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: isTogglingStatus ? 'wait' : 'pointer',
                opacity: isTogglingStatus ? 0.6 : 1,
                pointerEvents: isTogglingStatus ? 'none' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
                boxShadow: isCancelled || isPaidExpense
                  ? 'none'
                  : `0 2px 8px ${TimelineColor.PRIMARY}59`
              }
            }} children={isFutureMonth ? (
              <>
                <PendingIcon size={13} style={{ color: isPaidExpense ? `${TimelineColor.WHITE}d9` : TimelineColor.WHITE }} />
                <span style={{ color: TimelineColor.WHITE }}>{isPaidExpense ? doneLabel : pendingLabel}</span>
              </>
            ) : isCancelled ? (
              <>
                <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                <span>{t('status.cancelled')}</span>
              </>
            ) : isPaidExpense ? (
              <>
                <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                <span style={{ color: TimelineColor.WHITE }}>{doneLabel}</span>
                <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
              </>
            ) : (
              <>
                <PendingIcon size={13} style={{ color: TimelineColor.WHITE }} />
                <span>{pendingLabel}</span>
              </>
            )} />
        </div>
      </div>
      <ReceiptDateEditor />
      <ReceiptNumberEditor />
      <EventCategoryPicker />

      {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '-1px',
        paddingTop: '6px',
        borderTop: isPaidExpense ? `1px solid ${TimelineColor.WHITE}33` : '1px solid var(--border-glass)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EditableAmount prefix={'-'} defaultColor={isCancelled ? TimelineColor.SLATE : isPaidExpense ? TimelineColor.WHITE : TimelineColor.EXPENSE} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
