import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import { AlertCircle, Ban, CheckCircle2, Clock } from 'lucide-react';
import EditableAmount from './EditableAmount.jsx';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function GenericEventBody() {
  const {
    event,
    isCancelled,
    isClosedReminder,
    isFlatPositive,
    isFutureMonth,
    isOverdueReminder,
    isReminderEvent,
    isTogglingStatus,
    paletteTheme,
    t
  } = useEventCard();

  return (
    <div
      className={isFlatPositive ? 'flat-positive-card flat-positive-reminder' : 'loan-breakdown-strip'}
      style={{
        background: isFlatPositive
          ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
          : 'transparent',
        border: isFlatPositive
          ? `1px solid ${TimelineColor.WHITE}40`
          : '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 10px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        boxShadow: isFlatPositive ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none',
        color: isFlatPositive ? TimelineColor.WHITE : 'inherit'
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Linha 2: [motivo/tipo] (left) e [b status] (right) */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
        {/* Reminders show neither the type label nor the priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '0px' }}>
          {!isReminderEvent && (
            <span style={{ fontSize: '0.7rem', color: isFlatPositive ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
              {t('common.event')}
            </span>
          )}
          {event.priority && !isReminderEvent && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isFlatPositive ? `1px solid ${TimelineColor.WHITE}40` : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
              <span style={{ fontSize: '0.68rem', color: isFlatPositive ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('timeline.priority')}:
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)' }}>
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
                  : isFlatPositive
                    ? `${TimelineColor.WHITE}40`
                    : isOverdueReminder
                      ? `${TimelineColor.AMBER}29`
                      : `${TimelineColor.CYAN}24`,
                color: isCancelled
                  ? TimelineColor.SLATE
                  : isFlatPositive
                    ? TimelineColor.WHITE
                    : isOverdueReminder
                      ? TimelineColor.WARNING
                      : TimelineColor.CYAN,
                border: isCancelled
                  ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                  : isFlatPositive
                    ? `1px solid ${TimelineColor.WHITE}66`
                    : isOverdueReminder
                      ? `1px solid ${TimelineColor.AMBER}66`
                      : `1px solid ${TimelineColor.CYAN}59`,
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                opacity: isTogglingStatus ? 0.6 : 1,
                pointerEvents: isTogglingStatus ? 'none' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }
            }} children={isFutureMonth ? (
              <>
                <Clock size={13} style={{ color: 'var(--text-dim)' }} />
                <span>{t('status.open')}</span>
              </>
            ) : isCancelled ? (
              <>
                <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                <span>{t('status.cancelled')}</span>
              </>
            ) : isClosedReminder ? (
              <>
                <CheckCircle2 size={13} style={{ color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.SUCCESS }} />
                <span>{t('status.closed')}</span>
              </>
            ) : isOverdueReminder ? (
              <>
                <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                <span>{t('status.overdue')}</span>
              </>
            ) : (
              <>
                <Clock size={13} style={{ color: TimelineColor.CYAN }} />
                <span>{t('status.open')}</span>
              </>
            )} />
        </div>
      </div>

      {/* Linha 3: [Valor] & [event action buttons] */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        marginTop: '-1px',
        paddingTop: '6px',
        borderTop: isFlatPositive ? `1px solid ${TimelineColor.WHITE}33` : `1px solid var(--border-glass, ${TimelineColor.WHITE}14)`
      }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {event.amount !== undefined && Number(event.amount) > 0 ? (
            <EditableAmount prefix={''} defaultColor={isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)'} />
          ) : (
            <span style={{ fontSize: '0.78rem', color: isFlatPositive ? `${TimelineColor.WHITE}cc` : 'var(--text-muted)' }}>{event.description || ''}</span>
          )}
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
