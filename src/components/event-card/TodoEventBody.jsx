import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { EventPriority, EventStatus, TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import { Check, CheckCircle2, Circle, Loader2 } from 'lucide-react';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function TodoEventBody() {
  const {
    event,
    handleStatusToggle,
    isCompleted,
    isFutureMonth,
    isTogglingStatus,
    paletteTheme,
    t
  } = useEventCard();

  return (
    <div
      className={isCompleted ? 'flat-positive-card flat-positive-todo' : 'loan-breakdown-strip'}
      style={{
        background: isCompleted
          ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
          : `${TimelineColor.BLUE}08`,
        border: isCompleted
          ? `1px solid ${TimelineColor.WHITE}40`
          : '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 12px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: isCompleted ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none',
        color: isCompleted ? TimelineColor.WHITE : 'inherit'
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Linha 2: Badges (Priority, Done Date / Status) + Botão de Conclusão & Ações */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Priority badge */}
          {event.priority && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '5px',
                background: isCompleted
                  ? `${TimelineColor.WHITE}33`
                  : (event.priority || '').toLowerCase() === EventPriority.URGENT
                    ? `${TimelineColor.ROSE}26`
                    : (event.priority || '').toLowerCase() === EventPriority.HIGH
                      ? `${TimelineColor.AMBER}26`
                      : (event.priority || '').toLowerCase() === EventPriority.LOW
                        ? `${TimelineColor.SLATE}26`
                        : `${TimelineColor.BLUE}26`,
                color: isCompleted
                  ? TimelineColor.WHITE
                  : (event.priority || '').toLowerCase() === EventPriority.URGENT
                    ? TimelineColor.DANGER
                    : (event.priority || '').toLowerCase() === EventPriority.HIGH
                      ? TimelineColor.WARNING
                      : (event.priority || '').toLowerCase() === EventPriority.LOW
                        ? TimelineColor.SLATE
                        : TimelineColor.BLUE,
                border: isCompleted ? `1px solid ${TimelineColor.WHITE}4c` : 'none'
              }}
            >
              {event.priority}
            </span>
          )}

          {/* Concluded Date badge */}
          {isCompleted && (event.doneDate || event.date) && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                color: TimelineColor.WHITE,
                background: `${TimelineColor.WHITE}33`,
                border: `1px solid ${TimelineColor.WHITE}59`,
                padding: '2px 8px',
                borderRadius: '5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <Check size={12} style={{ color: TimelineColor.WHITE }} />
              <span>{t('todoModal.concludedOn', { date: event.doneDate || event.date })}</span>
            </span>
          )}

          {!isCompleted && (
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '600',
                color: TimelineColor.TODO,
                background: `${TimelineColor.BLUE}1a`,
                padding: '2px 8px',
                borderRadius: '5px'
              }}
            >
              {t('todoModal.currentMonth')}
            </span>
          )}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Checkbox / Toggle status button */}
          {isFutureMonth ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)',
                background: `${TimelineColor.WHITE}08`,
                color: 'var(--text-dim)',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: 'default',
                userSelect: 'none',
                opacity: 0.65
              }}
            >
              <Circle size={13} style={{ color: 'var(--text-dim)' }} />
              <span>{t('status.pending')}</span>
            </div>
          ) : (
            <button
              type="button"
              disabled={isTogglingStatus}
              onClick={(e) => handleStatusToggle(e, isCompleted ? EventStatus.PENDING : EventStatus.COMPLETED)}
              title={isTogglingStatus ? t('common.processing') : (isCompleted ? t('todoModal.markPending') : t('todoModal.markCompleted'))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '6px',
                border: isCompleted ? `1px solid ${TimelineColor.WHITE}66` : '1px solid var(--border-glass)',
                background: isCompleted ? `${TimelineColor.WHITE}40` : `${TimelineColor.WHITE}0a`,
                color: isCompleted ? TimelineColor.WHITE : 'var(--text-main)',
                fontSize: '0.76rem',
                fontWeight: '700',
                cursor: isTogglingStatus ? 'wait' : 'pointer',
                opacity: isTogglingStatus ? 0.75 : 1,
                transition: 'all 0.15s ease'
              }}
            >
              {isTogglingStatus ? (
                <Loader2 size={13} className="animate-spin" />
              ) : isCompleted ? (
                <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
              ) : (
                <Circle size={13} />
              )}
              <span>
                {isTogglingStatus
                  ? t('common.processing')
                  : isCompleted
                    ? t('status.completed')
                    : t('todoHeader.completeAction')}
              </span>
            </button>
          )}

          <div onClick={(e) => e.stopPropagation()}>
            <EventActionButtons />
          </div>
        </div>
      </div>
    </div>
  );
}
