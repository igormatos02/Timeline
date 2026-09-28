import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { DiaryMood, DiaryPublishStatus, TimelineColor } from '../../enums/index.js';
import EventCardHeader from './EventCardHeader.jsx';
import { DIARY_MOOD_CONFIG, renderFormattedMarkdown } from '../event-modals/DiaryEventModal.jsx';
import { Ban, CheckCircle2, Clock } from 'lucide-react';
import EventActionButtons from './EventActionButtons.jsx';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function DiaryEventBody() {
  const {
    event,
    isCancelledPost,
    isCondoPost,
    isCondoflow,
    isReadOnly,
    onEdit,
    onUpdateEventDirect,
    postPublishStatus,
    setPostPublishStatus,
    t
  } = useEventCard();

  return (
    <div
      className="loan-breakdown-strip"
      onClick={() => onEdit && onEdit(event)}
      style={{
        background: `${TimelineColor.PINK}08`,
        border: '1px solid var(--border-glass)',
        borderRadius: '8px',
        padding: '8px 12px',
        margin: '0',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        cursor: 'pointer',
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = `${TimelineColor.PINK}66`;
        e.currentTarget.style.background = `${TimelineColor.PINK}0f`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = 'var(--border-glass)';
        e.currentTarget.style.background = `${TimelineColor.PINK}08`;
      }}
    >
      {/* Linha 1: [icone] [titulo do evento] [lables] */}
      <EventCardHeader />

      {/* Texto completo do post para utilizadores só de leitura (lido diretamente na timeline) */}
      {isCondoPost && isReadOnly && event.description && (
        <div
          style={{
            fontSize: '0.84rem',
            lineHeight: 1.55,
            color: 'var(--text-main)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            margin: '6px 0 4px'
          }}
        >
          {renderFormattedMarkdown(event.description)}
        </div>
      )}

      {/* Linha 2: Mood Badge (left) e Ações (right) */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {!isCondoflow && (() => {
            const moodCfg = DIARY_MOOD_CONFIG[event.category] || DIARY_MOOD_CONFIG[DiaryMood.GOOD];
            return (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: `${TimelineColor.WHITE}0a`,
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-main)',
                  fontSize: '0.74rem',
                  fontWeight: '600'
                }}
              >
                <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{moodCfg.emoji}</span>
                <span>{t(moodCfg.labelKey) || moodCfg.fallbackLabel}</span>
              </div>
            );
          })()}
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
            {isCondoPost && !isReadOnly && (() => {
              const isPublished = postPublishStatus === DiaryPublishStatus.PUBLISHED;
              const statusColor = isCancelledPost ? TimelineColor.SLATE : (isPublished ? TimelineColor.SUCCESS : TimelineColor.WARNING);
              const pillStyle = {
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                borderRadius: '9999px',
                padding: '4px 12px',
                fontSize: '0.76rem',
                fontWeight: '700',
                background: `${statusColor}24`,
                color: statusColor,
                border: `1px solid ${statusColor}59`
              };
              const label = t(`diaryPublish.${postPublishStatus}`);
              if (isCancelledPost || !onUpdateEventDirect) {
                return <span style={{ ...pillStyle, cursor: 'default' }}>{isCancelledPost ? <Ban size={13} /> : null}{label}</span>;
              }
              return (
                <button
                  type="button"
                  className="btn btn-sm"
                  title={t('diaryPublish.clickToToggle')}
                  onClick={(e) => setPostPublishStatus(e, isPublished ? DiaryPublishStatus.UNPUBLISHED : DiaryPublishStatus.PUBLISHED)}
                  style={{ ...pillStyle, cursor: 'pointer' }}
                >
                  {isPublished ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                  <span>{label}</span>
                </button>
              );
            })()}
          <EventActionButtons />
        </div>
      </div>
    </div>
  );
}
