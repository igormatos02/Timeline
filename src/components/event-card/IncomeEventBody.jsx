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
export default function IncomeEventBody() {
  const {
    isCancelled,
    isFutureMonth,
    isOverdueIncome,
    isReceivedIncome,
    isTogglingStatus,
    isVirtual,
    paletteTheme,
    t
  } = useEventCard();

  return (
    <div
      className={`loan-breakdown-strip ${isReceivedIncome ? 'flat-positive-card flat-positive-income' : ''}`}
      style={{
        background: isReceivedIncome
          ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
          : 'transparent',
        border: isReceivedIncome ? `1px solid ${TimelineColor.WHITE}40` : '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 10px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        color: isReceivedIncome ? TimelineColor.WHITE : 'inherit',
        boxShadow: isReceivedIncome ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Linha 2: [receipt number or empty] (left) e [b status] (right, apenas não virtual) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
        <EventReceiptRef onPositiveCard={isReceivedIncome} />
        {!isVirtual && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
            <StatusDropdownButton buttonProps={{
                className: 'btn btn-sm',
                title: t('timeline.clickToChangeStatus'),
                style: {
                  background: isCancelled
                    ? `${TimelineColor.SLATE_LIGHT}26`
                    : isReceivedIncome
                      ? `${TimelineColor.WHITE}40`
                      : isOverdueIncome
                        ? `${TimelineColor.AMBER}29`
                        : `${TimelineColor.AMBER}24`,
                  color: isCancelled
                    ? TimelineColor.SLATE
                    : isReceivedIncome
                      ? TimelineColor.WHITE
                      : isOverdueIncome
                        ? TimelineColor.WARNING
                        : TimelineColor.WARNING,
                  border: isCancelled
                    ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                    : isReceivedIncome
                      ? `1px solid ${TimelineColor.WHITE}66`
                      : isOverdueIncome
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
                  transition: 'all 0.15s ease',
                  boxShadow: isOverdueIncome
                    ? `0 2px 10px ${TimelineColor.AMBER}40`
                    : 'none'
                }
              }} children={isFutureMonth ? (
                <>
                  <Clock size={13} style={{ color: isReceivedIncome ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)' }} />
                  <span style={{ color: isReceivedIncome ? TimelineColor.WHITE : undefined }}>{t('status.toReceive')}</span>
                </>
              ) : isCancelled ? (
                <>
                  <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                  <span>{t('status.cancelled')}</span>
                </>
              ) : isReceivedIncome ? (
                <>
                  <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                  <span style={{ color: TimelineColor.WHITE }}>{t('status.received')}</span>
                  <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
                </>
              ) : isOverdueIncome ? (
                <>
                  <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                  <span>{t('status.overdue')}</span>
                </>
              ) : (
                <>
                  <Clock size={13} style={{ color: TimelineColor.WARNING }} />
                  <span>{t('status.toReceive')}</span>
                </>
              )} />
          </div>
        )}
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
        borderTop: isReceivedIncome ? `1px solid ${TimelineColor.WHITE}33` : '1px solid var(--border-glass)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <EditableAmount prefix={'+'} defaultColor={isCancelled ? TimelineColor.SLATE : isReceivedIncome ? TimelineColor.WHITE : TimelineColor.WARNING} />
          <EventCategoryBadge onPositiveCard={isReceivedIncome} />
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
