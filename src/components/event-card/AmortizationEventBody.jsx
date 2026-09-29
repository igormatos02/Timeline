import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { AmortizationEventCategory, EventStatus, TimelineColor, isPositiveStatus } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import { Ban, CheckCircle2, Clock } from 'lucide-react';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function AmortizationEventBody() {
  const {
    effectiveStatus,
    event,
    isCancelled,
    isCompleted,
    isFutureMonth,
    isTogglingStatus,
    t
  } = useEventCard();

  return (
    <div
      className="amortization-event-strip"
      style={{
        background: TimelineColor.INCOME,
        border: `1px solid ${TimelineColor.INCOME}`,
        borderRadius: '8px',
        padding: '8px 12px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        color: TimelineColor.WHITE,
        boxShadow: `0 4px 14px ${TimelineColor.EMERALD}47`
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Linha 2: [motivo] (left) e [b status] (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', color: `${TimelineColor.WHITE}d9`, textTransform: 'uppercase', fontWeight: '700' }}>
            {t('loanCard.amortizedValue')}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: `1px solid ${TimelineColor.WHITE}40`, paddingLeft: '10px' }}>
            <span style={{ fontSize: '0.68rem', color: `${TimelineColor.WHITE}d9`, textTransform: 'uppercase', fontWeight: '700' }}>
              {t('loanCard.purpose')}
            </span>
            <span style={{ fontSize: '0.80rem', fontWeight: '800', color: TimelineColor.WHITE }}>
              {event.strategy === AmortizationEventCategory.REDUCE_INSTALLMENT || event.category === AmortizationEventCategory.REDUCE_INSTALLMENT
                ? t('loanCard.reduceInstallment')
                : t('loanCard.reduceTerm')}
            </span>
          </div>
          {event.balanceAfter !== undefined && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: `1px solid ${TimelineColor.WHITE}40`, paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: `${TimelineColor.WHITE}d9`, textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanCard.remainingBalanceAfter')}
              </span>
              <span style={{ fontSize: '0.80rem', fontWeight: '800', color: TimelineColor.WHITE }}>
                {formatCurrency(event.balanceAfter)}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
          <StatusDropdownButton buttonProps={{
              title: t('timeline.clickToChangeStatus'),
              style: {
                background: isCancelled
                  ? 'var(--bg-shade)'
                  : (isCompleted || isPositiveStatus(effectiveStatus) || effectiveStatus === EventStatus.AMORTIZED)
                    ? `${TimelineColor.WHITE}40`
                    : `${TimelineColor.WHITE}2e`,
                color: TimelineColor.WHITE,
                border: isCancelled
                  ? `1px solid ${TimelineColor.WHITE}40`
                  : `1px solid ${TimelineColor.WHITE}66`,
                borderRadius: '9999px',
                padding: '4px 12px',
                minWidth: '110px',
                height: '26px',
                boxSizing: 'border-box',
                fontSize: '0.76rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                cursor: isTogglingStatus ? 'wait' : 'pointer',
                opacity: isTogglingStatus ? 0.6 : 1,
                pointerEvents: isTogglingStatus ? 'none' : 'auto',
                transition: 'all 0.15s ease'
              }
            }} children={isFutureMonth ? (
              <>
                <Clock size={13} style={{ color: `${TimelineColor.WHITE}d9` }} />
                <span style={{ color: TimelineColor.WHITE }}>{t('status.pending')}</span>
              </>
            ) : isCancelled ? (
              <>
                <Ban size={13} style={{ color: `${TimelineColor.WHITE}d9` }} />
                <span style={{ color: TimelineColor.WHITE }}>{t('status.cancelled')}</span>
              </>
            ) : (isCompleted || isPositiveStatus(effectiveStatus) || effectiveStatus === EventStatus.AMORTIZED) ? (
              <>
                <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                <span style={{ color: TimelineColor.WHITE }}>{t('status.amortized')}</span>
              </>
            ) : (
              <>
                <Clock size={13} style={{ color: `${TimelineColor.WHITE}d9` }} />
                <span style={{ color: TimelineColor.WHITE }}>{t('status.pending')}</span>
              </>
            )} />
        </div>
      </div>

      {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '-1px',
        paddingTop: '6px',
        borderTop: `1px solid ${TimelineColor.WHITE}33`
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: '1.05rem', fontWeight: '800', color: TimelineColor.WHITE }}>
            +{formatCurrency(event.amount || event.amortizationAmount || 0)}
          </span>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
