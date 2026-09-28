import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { hexToRgba } from './cardUtils.js';
import { FollowupStatus, TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import { CheckCircle2, Circle, Clock, Flag, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function FollowupEventBody() {
  const {
    event,
    handleStatusToggle,
    isAnchorCard,
    isCompleted,
    isTogglingStatus,
    paletteTheme,
    t
  } = useEventCard();

  return (
    <div
      className={isAnchorCard ? 'followup-anchor-strip' : (isCompleted ? 'flat-positive-card flat-positive-followup' : 'loan-breakdown-strip')}
      style={{
        background: isAnchorCard
          ? paletteTheme.primary
          : isCompleted
            ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
            : `linear-gradient(90deg, ${TimelineColor.CYAN}14 0%, ${TimelineColor.CYAN}05 100%)`,
        border: isAnchorCard
          ? 'none'
          : isCompleted
            ? `1px solid ${TimelineColor.WHITE}40`
            : `1px solid ${TimelineColor.CYAN}59`,
        borderLeft: isAnchorCard
          ? 'none'
          : isCompleted
            ? `1px solid ${TimelineColor.WHITE}40`
            : `4px solid ${paletteTheme.primary}`,
        borderRadius: '8px',
        padding: '8px 12px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        color: (isAnchorCard || isCompleted) ? TimelineColor.WHITE : 'inherit',
        boxShadow: isAnchorCard
          ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}`
          : isCompleted
            ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}`
            : 'none',
        opacity: 1
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [labels] */}
      <EventCardHeader />

      {/* Subtasks Progress Bar & Checklist Preview */}
      {(() => {
        const rawSubtasks = event.breakdownItems || event.breakdown_items || [];
        const subtasks = Array.isArray(rawSubtasks) ? rawSubtasks : (typeof rawSubtasks === 'string' ? JSON.parse(rawSubtasks || '[]') : []);
        const completedSubtasks = subtasks.filter((s) => s.status === FollowupStatus.FINISHED || s.status === 'finished' || s.status === 'completed').length;
        const subtaskRate = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {subtasks.length > 0 && !isAnchorCard && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
                background: isCompleted ? `${TimelineColor.WHITE}26` : `${TimelineColor.WHITE}05`,
                padding: '6px 10px',
                borderRadius: '6px',
                border: isCompleted ? `1px solid ${TimelineColor.WHITE}40` : '1px solid var(--border-glass)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                  <span style={{ color: isCompleted ? `${TimelineColor.WHITE}e6` : 'var(--text-dim)', fontWeight: '700' }}>
                    {t('followupModal.subtasksLabel')} ({completedSubtasks}/{subtasks.length})
                  </span>
                  <span style={{ fontWeight: '800', color: isCompleted ? TimelineColor.WHITE : (subtaskRate === 100 ? TimelineColor.SUCCESS : TimelineColor.FOLLOWUP) }}>
                    {subtaskRate}%
                  </span>
                </div>
                <div style={{ width: '100%', height: '4px', background: isCompleted ? `${TimelineColor.WHITE}40` : 'var(--border-glass)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div
                    style={{
                      width: `${subtaskRate}%`,
                      height: '100%',
                      background: isCompleted ? TimelineColor.WHITE : (subtaskRate === 100 ? TimelineColor.SUCCESS : TimelineColor.FOLLOWUP),
                      borderRadius: '2px',
                      transition: 'width 0.2s ease'
                    }}
                  />
                </div>
              </div>
            )}

            {/* Linha 2: Badges (Status / Anchor / Floating) + Botão de Ação */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                {/* Status Badge */}
                {isAnchorCard ? (
                  <>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: '800',
                        padding: '3px 9px',
                        borderRadius: '5px',
                        background: `${TimelineColor.WHITE}38`,
                        color: TimelineColor.WHITE,
                        border: `1px solid ${TimelineColor.WHITE}66`,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '5px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.03em'
                      }}
                    >
                      <Flag size={11} style={{ color: TimelineColor.WHITE }} />
                      {t('followupHeader.startAnchorBadge')}
                    </span>
                    <span
                      style={{
                        fontSize: '0.70rem',
                        fontWeight: '700',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        background: `${TimelineColor.WHITE}26`,
                        border: `1px solid ${TimelineColor.WHITE}4c`,
                        color: TimelineColor.WHITE,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Clock size={11} style={{ color: TimelineColor.WHITE }} />
                      {t('followupStatus.initiated')}
                    </span>
                  </>
                ) : isCompleted ? (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      background: `${TimelineColor.WHITE}38`,
                      border: `1px solid ${TimelineColor.WHITE}59`,
                      color: TimelineColor.WHITE,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCircle2 size={12} style={{ color: TimelineColor.WHITE }} />
                    {t('followupStatus.finished')}
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      padding: '2px 8px',
                      borderRadius: '5px',
                      background: `${TimelineColor.CYAN}26`,
                      color: TimelineColor.FOLLOWUP,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Clock size={12} />
                    {t('followupStatus.inProgress')}
                  </span>
                )}

                {/* Indicador de Trilha / Ligação ao Marco Inicial no Card Ativo */}
                {!isAnchorCard && event.createdAt && (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px',
                      padding: '2px 7px',
                      borderRadius: '4px',
                      background: isCompleted ? `${TimelineColor.WHITE}2e` : `${TimelineColor.BLUE}14`,
                      border: isCompleted ? `1px solid ${TimelineColor.WHITE}4c` : `1px solid ${TimelineColor.BLUE}40`,
                      fontSize: '0.68rem',
                      color: isCompleted ? TimelineColor.WHITE : TimelineColor.BLUE,
                      fontWeight: '700'
                    }}
                    title={t('followupHeader.initiatedOn', { date: format(new Date(event.createdAt), 'dd/MM/yyyy') })}
                  >
                    <Flag size={10} style={{ color: isCompleted ? TimelineColor.WHITE : TimelineColor.BLUE }} />
                    <span>{t('followupHeader.initiatedOn', { date: format(new Date(event.createdAt), 'dd/MM/yyyy') })}</span>
                  </div>
                )}

                {event.isFloating && !isCompleted && !isAnchorCard && (
                  <span
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: '600',
                      color: 'var(--text-dim)',
                      background: `${TimelineColor.WHITE}0a`,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-glass)'
                    }}
                  >
                    {t('followupHeader.currentMonthBadge')}
                  </span>
                )}
              </div>

              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {!isAnchorCard && (
                  <button
                    type="button"
                    disabled={isTogglingStatus}
                    onClick={(e) => handleStatusToggle(e, isCompleted ? FollowupStatus.IN_PROGRESS : FollowupStatus.FINISHED)}
                    title={isTogglingStatus ? t('common.processing') : (isCompleted ? t('followupHeader.markInProgress') : t('followupHeader.markFinished'))}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      border: isCompleted ? `1px solid ${TimelineColor.WHITE}66` : `1px solid ${TimelineColor.FOLLOWUP}`,
                      background: isCompleted ? `${TimelineColor.WHITE}40` : `${TimelineColor.CYAN}26`,
                      color: isCompleted ? TimelineColor.WHITE : TimelineColor.FOLLOWUP,
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
                          ? t('followupStatus.finished')
                          : t('followupHeader.finishAction')}
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
      })()}
    </div>
  );
}
