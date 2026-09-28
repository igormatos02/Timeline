import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import EventReceiptRef from './EventReceiptRef.jsx';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import { AlertCircle, Ban, CheckCircle2, Clock, Lock } from 'lucide-react';
import ReceiptDateEditor from './ReceiptDateEditor.jsx';
import ReceiptNumberEditor from './ReceiptNumberEditor.jsx';
import EventCategoryPicker from './EventCategoryPicker.jsx';
import EditableAmount from './EditableAmount.jsx';
import EventCategoryBadge from './EventCategoryBadge.jsx';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function ExpenseEventBody() {
  const {
    event,
    isCancelled,
    isFutureMonth,
    isOverdueExpense,
    isPaidExpense,
    isTogglingStatus,
    paletteTheme,
    t
  } = useEventCard();

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

      {/* Linha 2: [receipt number or empty] (left) e [b status] (right) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '0px' }}>
          <EventReceiptRef onPositiveCard={isPaidExpense} />
          {event.priority && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidExpense ? `1px solid ${TimelineColor.WHITE}4c` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isPaidExpense ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('timeline.priority')}:
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isPaidExpense ? TimelineColor.WHITE : 'var(--text-main)' }}>
                {event.priority}
              </span>
            </div>
          )}
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
                    : isOverdueExpense
                      ? `${TimelineColor.AMBER}29`
                      : `${TimelineColor.AMBER}24`,
                color: isCancelled
                  ? TimelineColor.SLATE
                  : isPaidExpense
                    ? TimelineColor.WHITE
                    : isOverdueExpense
                      ? TimelineColor.WARNING
                      : TimelineColor.WARNING,
                border: isCancelled
                  ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                  : isPaidExpense
                    ? `1px solid ${TimelineColor.WHITE}66`
                    : isOverdueExpense
                      ? `1px solid ${TimelineColor.AMBER}66`
                      : `1px solid ${TimelineColor.AMBER}59`,
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: isTogglingStatus ? 'wait' : 'pointer',
                opacity: isTogglingStatus ? 0.6 : 1,
                pointerEvents: isTogglingStatus ? 'none' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }
            }} children={isFutureMonth ? (
              <>
                <Clock size={13} style={{ color: isPaidExpense ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)' }} />
                <span style={{ color: isPaidExpense ? TimelineColor.WHITE : undefined }}>{t('status.toPay')}</span>
              </>
            ) : isCancelled ? (
              <>
                <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                <span>{t('status.cancelled')}</span>
              </>
            ) : isPaidExpense ? (
              <>
                <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                <span style={{ color: TimelineColor.WHITE }}>{t('status.paid')}</span>
                <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
              </>
            ) : isOverdueExpense ? (
              <>
                <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                <span>{t('status.overdue')}</span>
              </>
            ) : (
              <>
                <Clock size={13} style={{ color: TimelineColor.WARNING }} />
                <span>{t('status.toPay')}</span>
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
          <EventCategoryBadge onPositiveCard={isPaidExpense} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
