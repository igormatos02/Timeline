import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  BookOpen,
  Bold,
  Italic,
  Strikethrough,
  RotateCcw,
  Sparkles,
  Smile,
  Meh,
  Frown,
  Calendar,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import {
  TimelineType,
  EventType,
  EventRecurrence,
  EventStatus,
  DiaryMood
} from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import ModalShell from '../ui/ModalShell.jsx';
import * as api from '../../services/api.js';

export const DIARY_MOOD_CONFIG = {
  [DiaryMood.BAD]: {
    id: DiaryMood.BAD,
    labelKey: 'diaryMood.bad',
    fallbackLabel: 'Dia Ruim',
    color: '#f43f5e',
    bgColor: 'rgba(244, 63, 94, 0.14)',
    borderColor: 'rgba(244, 63, 94, 0.35)',
    icon: Frown,
    emoji: '🌧️'
  },
  [DiaryMood.NORMAL]: {
    id: DiaryMood.NORMAL,
    labelKey: 'diaryMood.normal',
    fallbackLabel: 'Dia Normal',
    color: '#38bdf8',
    bgColor: 'rgba(56, 189, 248, 0.14)',
    borderColor: 'rgba(56, 189, 248, 0.35)',
    icon: Meh,
    emoji: '⛅'
  },
  [DiaryMood.GOOD]: {
    id: DiaryMood.GOOD,
    labelKey: 'diaryMood.good',
    fallbackLabel: 'Dia Bom',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.35)',
    icon: Smile,
    emoji: '☀️'
  },
  [DiaryMood.UNFORGETTABLE]: {
    id: DiaryMood.UNFORGETTABLE,
    labelKey: 'diaryMood.unforgettable',
    fallbackLabel: 'Dia Inesquecível',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.16)',
    borderColor: 'rgba(168, 85, 247, 0.45)',
    icon: Sparkles,
    emoji: '✨'
  }
};

const MAX_DESCRIPTION_LENGTH = 900;

export default function DiaryEventModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  defaultDate = null,
  timeline = null,
  allEvents = []
}) {
  const { t } = useTranslation();
  const textareaRef = useRef(null);

  const todayStr = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);
  const initialDateStr = initialData?.date || defaultDate || todayStr;

  const [title, setTitle] = useState('');
  const [date, setDate] = useState(initialDateStr);
  const [selectedMood, setSelectedMood] = useState(DiaryMood.GOOD);
  const [description, setDescription] = useState('');
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or reset form data
  useEffect(() => {
    if (!isOpen) return;

    const initialTitle = initialData?.title || initialData?.name || '';
    const initialMood = initialData?.category || DiaryMood.GOOD;
    const initialDate = initialData?.date || defaultDate || todayStr;

    setTitle(initialTitle);
    setDate(initialDate);
    setSelectedMood(
      Object.values(DiaryMood).includes(initialMood) ? initialMood : DiaryMood.GOOD
    );

    // If initialData has description already in memory
    if (initialData?.description !== undefined && initialData?.description !== null) {
      setDescription(initialData.description.slice(0, MAX_DESCRIPTION_LENGTH));
      setIsLoadingDescription(false);
    } else if (initialData?.id) {
      // Lazy load description from backend endpoint /api/events/:id
      setIsLoadingDescription(true);
      api
        .fetchEventById(initialData.id)
        .then((fullEvent) => {
          if (fullEvent && fullEvent.description !== undefined) {
            setDescription((fullEvent.description || '').slice(0, MAX_DESCRIPTION_LENGTH));
          } else {
            setDescription('');
          }
        })
        .catch((err) => {
          console.warn('Could not fetch event description lazy payload:', err);
          setDescription('');
        })
        .finally(() => {
          setIsLoadingDescription(false);
        });
    } else {
      setDescription('');
      setIsLoadingDescription(false);
    }
  }, [isOpen, initialData, defaultDate, todayStr]);

  // Check duplicate date constraint (1 register event per day in this diary timeline)
  const isDuplicateDay = useMemo(() => {
    if (!date) return false;
    const timelineId = timeline?.id || initialData?.timelineId || initialData?.timeline_id;

    return allEvents.some((ev) => {
      if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED) return false;
      // Skip the currently edited event
      if (initialData?.id && (ev.id === initialData.id || ev.eventId === initialData.id)) {
        return false;
      }
      const sameTimeline =
        timelineId &&
        String(ev.timelineId || ev.timelineOriginId || ev.timeline_id) === String(timelineId);
      const sameDate = String(ev.date) === String(date);
      return sameTimeline && sameDate;
    });
  }, [allEvents, date, timeline?.id, initialData?.id, initialData?.timelineId, initialData?.timeline_id]);

  // Rich text formatting helpers (Bold, Italic, Strikethrough, Normal)
  const applyFormatting = (formatType) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = description.substring(start, end);

    let formatted = '';
    switch (formatType) {
      case 'bold':
        formatted = selectedText ? `**${selectedText}**` : '**texto**';
        break;
      case 'italic':
        formatted = selectedText ? `*${selectedText}*` : '*texto*';
        break;
      case 'strikethrough':
        formatted = selectedText ? `~~${selectedText}~~` : '~~texto~~';
        break;
      case 'normal':
        // Strip markdown bold, italic, strikethrough from selected text
        formatted = selectedText.replace(/(\*\*|\*|~~)/g, '');
        break;
      default:
        formatted = selectedText;
    }

    const newDescription = (
      description.substring(0, start) +
      formatted +
      description.substring(end)
    ).slice(0, MAX_DESCRIPTION_LENGTH);

    setDescription(newDescription);

    setTimeout(() => {
      textarea.focus();
      const newCursorPos = start + formatted.length;
      textarea.setSelectionRange(newCursorPos, newCursorPos);
    }, 10);
  };

  const handleDescriptionChange = (e) => {
    const val = e.target.value;
    if (val.length <= MAX_DESCRIPTION_LENGTH) {
      setDescription(val);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!title.trim() || !date || isDuplicateDay || isSaving) return;

    setIsSaving(true);
    try {
      const payload = {
        ...(initialData || {}),
        title: title.trim(),
        name: title.trim(),
        date,
        category: selectedMood,
        description: description.slice(0, MAX_DESCRIPTION_LENGTH),
        eventType: EventType.REGISTER,
        timelineType: TimelineType.DIARY,
        recurrence: EventRecurrence.ONCE,
        isRecurring: false,
        status: initialData?.status || EventStatus.COMPLETED
      };

      if (timeline?.id) {
        payload.timelineId = timeline.id;
        payload.timelineOriginId = timeline.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error saving diary register event:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const activeMoodMeta = DIARY_MOOD_CONFIG[selectedMood] || DIARY_MOOD_CONFIG[DiaryMood.GOOD];
  const charCount = description.length;
  const isNearLimit = charCount > MAX_DESCRIPTION_LENGTH * 0.9;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      icon={BookOpen}
      accent={activeMoodMeta.color}
      maxWidth="620px"
      title={
        initialData
          ? t('diaryModal.editTitle') || 'Editar Registro no Diário'
          : t('diaryModal.newTitle') || 'Novo Registro no Diário'
      }
      subtitle={t('diaryHeader.badge') || 'Diário Pessoal'}
      footer={
        <>
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: '600'
            }}
          >
            {t('diaryModal.cancel') || 'Cancelar'}
          </button>
          <button
            type="submit"
            disabled={!title.trim() || !date || isDuplicateDay || isSaving}
            className="btn btn-primary"
            style={{
              padding: '8px 22px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: '700',
              background: isDuplicateDay
                ? 'rgba(148, 163, 184, 0.3)'
                : activeMoodMeta.color,
              borderColor: isDuplicateDay
                ? 'rgba(148, 163, 184, 0.3)'
                : activeMoodMeta.color,
              color: '#ffffff',
              opacity: isDuplicateDay || !title.trim() ? 0.6 : 1,
              cursor: isDuplicateDay || !title.trim() ? 'not-allowed' : 'pointer',
              boxShadow: isDuplicateDay
                ? 'none'
                : `0 4px 14px ${activeMoodMeta.color}44`
            }}
          >
            {isSaving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('buttons.saving') || 'A guardar...'}</span>
              </span>
            ) : (
              t('diaryModal.save') || 'Salvar Registro'
            )}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Title Field */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              fontSize: '0.78rem',
              fontWeight: '700',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <span>{t('diaryModal.nameLabel') || 'Título / Resumo do Dia *'}</span>
          </label>
          <input
            type="text"
            className="form-control"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={
              t('diaryModal.namePlaceholder') || 'Como foi o seu dia?...'
            }
            required
            autoFocus
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text-main)',
              fontSize: '0.9rem',
              fontWeight: '600'
            }}
          />
        </div>

        {/* Date Field & Duplicate Validation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label
            style={{
              fontSize: '0.78rem',
              fontWeight: '700',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Calendar size={13} style={{ color: activeMoodMeta.color }} />
            <span>{t('diaryModal.dateLabel') || 'Data *'}</span>
          </label>
          <input
            type="date"
            className="form-control"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: isDuplicateDay
                ? '1px solid #f43f5e'
                : '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '10px 14px',
              color: 'var(--text-main)',
              fontSize: '0.88rem'
            }}
          />
          {isDuplicateDay && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.74rem',
                color: '#f43f5e',
                marginTop: '2px'
              }}
            >
              <AlertCircle size={13} />
              <span>
                {t('diaryModal.duplicateDayError') ||
                  'Já existe um registro para este dia no Diário.'}
              </span>
            </div>
          )}
        </div>

        {/* Mood Selector (Labeled strictly as "Mood") */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <label
            style={{
              fontSize: '0.78rem',
              fontWeight: '700',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>{t('diaryMood.moodLabel') || 'Mood do Dia'}</span>
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '8px'
            }}
          >
            {Object.values(DiaryMood).map((moodKey) => {
              const cfg = DIARY_MOOD_CONFIG[moodKey];
              const isSelected = selectedMood === moodKey;
              const IconComp = cfg.icon;

              return (
                <button
                  key={moodKey}
                  type="button"
                  onClick={() => setSelectedMood(moodKey)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '10px 6px',
                    borderRadius: '10px',
                    border: isSelected
                      ? `2px solid ${cfg.color}`
                      : '1px solid var(--border-glass)',
                    background: isSelected
                      ? cfg.bgColor
                      : 'rgba(255, 255, 255, 0.02)',
                    color: isSelected ? cfg.color : 'var(--text-muted)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isSelected
                      ? `0 4px 12px ${cfg.color}33`
                      : 'none'
                  }}
                >
                  <div style={{ fontSize: '1.25rem' }}>{cfg.emoji}</div>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: isSelected ? '800' : '600',
                      textAlign: 'center',
                      lineHeight: 1.2
                    }}
                  >
                    {t(cfg.labelKey) || cfg.fallbackLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Field with Rich Text Formatting Toolbar & 900 Char Limit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: '700',
                color: 'var(--text-main)'
              }}
            >
              {t('diaryModal.descriptionLabel') || 'Relato do Diário'}
            </label>

            {/* Rich Text Toolbar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '2px 4px',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)'
              }}
            >
              <button
                type="button"
                onClick={() => applyFormatting('bold')}
                title={t('diaryModal.bold') || 'Negrito (**texto**)'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Bold size={13} />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('italic')}
                title={t('diaryModal.italic') || 'Itálico (*texto*)'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Italic size={13} />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('strikethrough')}
                title={t('diaryModal.strikethrough') || 'Riscado (~~texto~~)'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Strikethrough size={13} />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('normal')}
                title={t('diaryModal.normal') || 'Normal / Limpar formatação'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  padding: '4px 6px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.7rem',
                  fontWeight: '700'
                }}
              >
                Normal
              </button>
            </div>
          </div>

          <div style={{ position: 'relative' }}>
            {isLoadingDescription ? (
              <div
                style={{
                  height: '140px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  color: 'var(--text-dim)',
                  fontSize: '0.82rem'
                }}
              >
                <Loader2 size={16} className="animate-spin" />
                <span>{t('diaryModal.loadingDescription') || 'Carregando relato...'}</span>
              </div>
            ) : (
              <textarea
                ref={textareaRef}
                className="form-control"
                rows={5}
                value={description}
                onChange={handleDescriptionChange}
                maxLength={MAX_DESCRIPTION_LENGTH}
                placeholder={
                  t('diaryModal.descriptionPlaceholder') ||
                  'Escreva sobre o seu dia, reflexões ou momentos...'
                }
                style={{
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '10px 14px',
                  color: 'var(--text-main)',
                  fontSize: '0.86rem',
                  lineHeight: '1.5',
                  resize: 'vertical',
                  width: '100%',
                  boxSizing: 'border-box'
                }}
              />
            )}
          </div>

          {/* Character counter (Limit 900) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              fontSize: '0.72rem',
              fontWeight: '700',
              color: isNearLimit ? '#f59e0b' : 'var(--text-dim)',
              marginTop: '2px'
            }}
          >
            <span>
              {charCount} / {MAX_DESCRIPTION_LENGTH} caracteres
            </span>
          </div>
        </div>
      </div>
    </ModalShell>
  );
}
