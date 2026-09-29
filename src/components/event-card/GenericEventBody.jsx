import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import EventCategoryPicker from './EventCategoryPicker.jsx';
import StatusDropdownButton from './StatusDropdownButton.jsx';
import { Ban, Check, CheckCircle2 } from 'lucide-react';
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
        {/* Reminders show neither the type label nor the priority */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingBottom: '0px' }}>
          {!isReminderEvent && (
            <span style={{ fontSize: '0.7rem', color: isFlatPositive ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
              {t('common.event')}
            </span>
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
                    : 'var(--primary)',
                color: isCancelled
                  ? TimelineColor.SLATE
                  : TimelineColor.WHITE,
                border: isCancelled
                  ? `1px solid ${TimelineColor.SLATE_LIGHT}59`
                  : isFlatPositive
                    ? `1px solid ${TimelineColor.WHITE}66`
                    : '1px solid transparent',
                borderRadius: '9999px',
                padding: '4px 12px',
                minWidth: '110px',
                height: '26px',
                boxSizing: 'border-box',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                opacity: isTogglingStatus ? 0.6 : 1,
                pointerEvents: isTogglingStatus ? 'none' : 'auto',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease',
                boxShadow: isCancelled || isFlatPositive
                  ? 'none'
                  : `0 2px 8px ${TimelineColor.PRIMARY}59`
              }
            }} children={isFutureMonth ? (
              <>
                <Check size={13} style={{ color: isFlatPositive ? `${TimelineColor.WHITE}d9` : TimelineColor.WHITE }} />
                <span style={{ color: TimelineColor.WHITE }}>{isFlatPositive ? t('status.closed') : (isReminderEvent ? t('status.actionComplete') : t('status.open'))}</span>
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
            ) : (
              <>
                <Check size={13} style={{ color: TimelineColor.WHITE }} />
                <span>{isReminderEvent ? t('status.actionComplete') : t('status.open')}</span>
              </>
            )} />
        </div>
      </div>
      <EventCategoryPicker />

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
