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
  Loader2,
  Eye,
  Edit3
} from 'lucide-react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import {
  TimelineType,
  EventType,
  EventRecurrence,
  EventStatus,
  DiaryMood
} from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ModalShell from '../ui/ModalShell.jsx';
import DayPickerPopover from '../ui/DayPickerPopover.jsx';
import * as api from '../../services/api.js';

/**
 * Converts markdown text into HTML for the WYSIWYG contentEditable editor.
 */
export function markdownToHtml(md) {
  if (!md) return '';
  let html = String(md)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Bold **...**
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Strikethrough ~~...~~
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  // Italic *...*
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Newlines
  html = html.replace(/\n/g, '<br>');

  return html;
}

/**
 * Converts rich HTML from contentEditable back to clean, portable markdown.
 */
export function htmlToMarkdown(html) {
  if (!html) return '';
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;

  function traverse(node) {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent;
    }
    if (node.nodeType === Node.ELEMENT_NODE) {
      const tag = node.tagName.toLowerCase();
      let inner = '';
      node.childNodes.forEach((child) => {
        inner += traverse(child);
      });

      if (tag === 'strong' || tag === 'b' || node.style?.fontWeight === 'bold' || Number(node.style?.fontWeight) >= 700) {
        return inner ? `**${inner}**` : '';
      }
      if (tag === 'em' || tag === 'i' || node.style?.fontStyle === 'italic') {
        return inner ? `*${inner}*` : '';
      }
      if (tag === 'del' || tag === 's' || tag === 'strike' || node.style?.textDecoration?.includes('line-through')) {
        return inner ? `~~${inner}~~` : '';
      }
      if (tag === 'br') {
        return '\n';
      }
      if (tag === 'div' || tag === 'p') {
        return inner ? `\n${inner}` : '';
      }
      return inner;
    }
    return '';
  }

  let res = traverse(tempDiv).replace(/^\n+/, '');
  return res.slice(0, MAX_DESCRIPTION_LENGTH);
}

/**
 * Parses markdown bold (**text**), italic (*text*), strikethrough (~~text~~), and linebreaks
 * and renders formatted React elements in the screen's native font styling.
 */
export function renderFormattedMarkdown(text) {
  if (!text) return null;

  const lines = String(text).split('\n');

  return lines.map((line, lineIdx) => {
    // Regex matching **bold**, ~~strikethrough~~, *italic*
    const regex = /(\*\*[\s\S]*?\*\*|~~[\s\S]*?~~|\*[\s\S]*?\*)/g;
    const parts = line.split(regex);

    const renderedLine = parts.map((part, partIdx) => {
      if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
        return (
          <strong key={partIdx} style={{ fontWeight: '700', color: 'inherit' }}>
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('~~') && part.endsWith('~~') && part.length >= 4) {
        return (
          <del key={partIdx} style={{ textDecoration: 'line-through', opacity: 0.75 }}>
            {part.slice(2, -2)}
          </del>
        );
      }
      if (part.startsWith('*') && part.endsWith('*') && part.length >= 2) {
        return (
          <em key={partIdx} style={{ fontStyle: 'italic', color: 'inherit' }}>
            {part.slice(1, -1)}
          </em>
        );
      }
      return <React.Fragment key={partIdx}>{part}</React.Fragment>;
    });

    return (
      <React.Fragment key={lineIdx}>
        {renderedLine}
        {lineIdx < lines.length - 1 && <br />}
      </React.Fragment>
    );
  });
}

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
  allEvents = [],
  events = []
}) {
  const { t, dateLocale } = useTranslation();
  const { showToast } = useToast();
  const editorRef = useRef(null);

  const todayDateObj = useMemo(() => new Date(), []);
  const todayDayNumber = useMemo(() => todayDateObj.getDate(), [todayDateObj]);
  const todayStr = useMemo(() => format(todayDateObj, 'yyyy-MM-dd'), [todayDateObj]);
  const initialDateStr = initialData?.date || defaultDate || todayStr;

  const [title, setTitle] = useState('');
  const [baseMonthPrefix, setBaseMonthPrefix] = useState(() => initialDateStr.substring(0, 7));
  const [dayOfMonth, setDayOfMonth] = useState(() => {
    if (initialData?.date) {
      try {
        const d = parseISO(initialData.date);
        return !isNaN(d.getDate()) ? d.getDate() : todayDayNumber;
      } catch {
        return todayDayNumber;
      }
    }
    return todayDayNumber;
  });
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState(DiaryMood.GOOD);
  const [description, setDescription] = useState('');
  const [charCount, setCharCount] = useState(0);
  const [isLoadingDescription, setIsLoadingDescription] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fallback to active timeline events or rawEvents
  const timelineEvents = useMemo(() => {
    if (Array.isArray(allEvents) && allEvents.length > 0) return allEvents;
    if (Array.isArray(events) && events.length > 0) return events;
    if (Array.isArray(timeline?.events) && timeline.events.length > 0) return timeline.events;
    return [];
  }, [allEvents, events, timeline?.events]);

  // Helper to sync editor content
  const updateEditorContent = (mdText) => {
    const cleanMd = (mdText || '').slice(0, MAX_DESCRIPTION_LENGTH);
    setDescription(cleanMd);
    const html = markdownToHtml(cleanMd);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
      setCharCount((editorRef.current.innerText || '').length);
    } else {
      setCharCount(cleanMd.length);
    }
  };

  // Initialize or reset form data
  useEffect(() => {
    if (!isOpen) return;

    const initialTitle = initialData?.title || initialData?.name || '';
    const initialMood = initialData?.category || DiaryMood.GOOD;
    const now = new Date();
    const currentDay = now.getDate();

    let parsedDay = currentDay;
    let monthPrefix = format(now, 'yyyy-MM');

    if (initialData?.date) {
      try {
        const d = parseISO(initialData.date);
        if (!isNaN(d.getDate())) parsedDay = d.getDate();
        monthPrefix = format(d, 'yyyy-MM');
      } catch {
        parsedDay = currentDay;
        monthPrefix = initialData.date.substring(0, 7) || format(now, 'yyyy-MM');
      }
    } else if (defaultDate) {
      try {
        const d = parseISO(defaultDate);
        monthPrefix = format(d, 'yyyy-MM');
      } catch {
        monthPrefix = defaultDate.substring(0, 7) || format(now, 'yyyy-MM');
      }
      parsedDay = currentDay;
    } else {
      parsedDay = currentDay;
      monthPrefix = format(now, 'yyyy-MM');
    }

    try {
      const daysInMonth = getDaysInMonth(parseISO(`${monthPrefix}-01`));
      parsedDay = Math.min(parsedDay, daysInMonth);
    } catch {
      parsedDay = Math.min(parsedDay, 28);
    }

    setTitle(initialTitle);
    setBaseMonthPrefix(monthPrefix);
    setDayOfMonth(parsedDay);
    setIsDayPickerOpen(false);
    setSelectedMood(
      Object.values(DiaryMood).includes(initialMood) ? initialMood : DiaryMood.GOOD
    );

    // If initialData has description already in memory
    if (initialData?.description !== undefined && initialData?.description !== null) {
      setIsLoadingDescription(false);
      setTimeout(() => {
        updateEditorContent(initialData.description);
      }, 0);
    } else if (initialData?.id) {
      // Lazy load description from backend endpoint /api/events/:id
      setIsLoadingDescription(true);
      api
        .fetchEventById(initialData.id)
        .then((fullEvent) => {
          if (fullEvent && fullEvent.description !== undefined) {
            updateEditorContent(fullEvent.description);
          } else {
            updateEditorContent('');
          }
        })
        .catch((err) => {
          console.warn('Could not fetch event description lazy payload:', err);
          updateEditorContent('');
        })
        .finally(() => {
          setIsLoadingDescription(false);
        });
    } else {
      setIsLoadingDescription(false);
      setTimeout(() => {
        updateEditorContent('');
      }, 0);
    }
  }, [isOpen, initialData, defaultDate, todayStr]);

  // Computed ISO date yyyy-MM-dd
  const computedDate = useMemo(() => {
    const safeDay = Math.max(1, Math.min(31, Number(dayOfMonth) || 1));
    return `${baseMonthPrefix}-${String(safeDay).padStart(2, '0')}`;
  }, [baseMonthPrefix, dayOfMonth]);

  // Set of already registered days in the current month for this timeline
  const takenDaysSet = useMemo(() => {
    const timelineId = timeline?.id || initialData?.timelineId || initialData?.timeline_id;
    const set = new Set();
    timelineEvents.forEach((ev) => {
      if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED) return;
      if (initialData?.id && (ev.id === initialData.id || ev.eventId === initialData.id)) return;
      const sameTimeline =
        !timelineId ||
        String(ev.timelineId || ev.timelineOriginId || ev.timeline_id) === String(timelineId);
      if (sameTimeline && ev.date && String(ev.date).startsWith(baseMonthPrefix)) {
        try {
          const parts = String(ev.date).split('-');
          const dayNum = Number(parts[2]);
          if (!isNaN(dayNum)) set.add(dayNum);
        } catch {}
      }
    });
    return set;
  }, [timelineEvents, timeline?.id, initialData?.id, initialData?.timelineId, initialData?.timeline_id, baseMonthPrefix]);

  // Check duplicate date constraint (1 register event per day in this diary timeline)
  const isDuplicateDay = useMemo(() => {
    if (!computedDate) return false;
    const timelineId = timeline?.id || initialData?.timelineId || initialData?.timeline_id;

    return timelineEvents.some((ev) => {
      if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED) return false;
      // Skip the currently edited event
      if (initialData?.id && (ev.id === initialData.id || ev.eventId === initialData.id)) {
        return false;
      }
      const sameTimeline =
        !timelineId ||
        String(ev.timelineId || ev.timelineOriginId || ev.timeline_id) === String(timelineId);
      const sameDate = String(ev.date) === String(computedDate);
      return sameTimeline && sameDate;
    });
  }, [timelineEvents, computedDate, timeline?.id, initialData?.id, initialData?.timelineId, initialData?.timeline_id]);

  // WYSIWYG Formatting Actions
  const applyFormatting = (formatType) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    switch (formatType) {
      case 'bold':
        document.execCommand('bold', false, null);
        break;
      case 'italic':
        document.execCommand('italic', false, null);
        break;
      case 'strikethrough':
        document.execCommand('strikeThrough', false, null);
        break;
      case 'normal':
        document.execCommand('removeFormat', false, null);
        break;
      default:
        break;
    }

    handleEditorInput();
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const plainText = editorRef.current.innerText || '';
    const currentLen = plainText.length;
    setCharCount(currentLen);

    const md = htmlToMarkdown(editorRef.current.innerHTML);
    setDescription(md);
  };

  const handleEditorPaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    document.execCommand('insertText', false, text);
    handleEditorInput();
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!title.trim()) {
      showToast(t('diaryModal.titleRequired') || 'Por favor, insira o título do registro.', 'warning');
      return;
    }

    if (isDuplicateDay) {
      showToast(
        t('diaryModal.duplicateDayError') || 'Já existe um registro para este dia no Diário. Só é permitido 1 registro por dia.',
        'warning'
      );
      return;
    }

    if (!computedDate || isSaving) return;

    setIsSaving(true);
    try {
      const finalMd = editorRef.current ? htmlToMarkdown(editorRef.current.innerHTML) : description;

      const payload = {
        ...(initialData || {}),
        title: title.trim(),
        name: title.trim(),
        date: computedDate,
        category: selectedMood,
        description: finalMd.slice(0, MAX_DESCRIPTION_LENGTH),
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
      showToast(err.message || 'Erro ao salvar registro no diário', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const activeMoodMeta = DIARY_MOOD_CONFIG[selectedMood] || DIARY_MOOD_CONFIG[DiaryMood.GOOD];
  const isNearLimit = charCount > MAX_DESCRIPTION_LENGTH * 0.9;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      icon={BookOpen}
      accent="var(--primary, #6366f1)"
      maxWidth="580px"
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
            disabled={isSaving}
            className="btn btn-primary"
            style={{
              padding: '8px 22px',
              borderRadius: '8px',
              fontSize: '0.84rem',
              fontWeight: '600',
              opacity: isDuplicateDay || !title.trim() ? 0.7 : 1
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

        {/* Day Picker Popover (Same standard selection as all other event modals) */}
        <div>
          <DayPickerPopover
            label={t('modal.dayOfMonth') || 'Dia de Registro *'}
            value={dayOfMonth}
            onChange={(day) => {
              setDayOfMonth(day);
              if (takenDaysSet.has(Number(day))) {
                showToast(
                  t('diaryModal.duplicateDayError') || 'Já existe um registro para este dia no Diário. Só é permitido 1 registro por dia.',
                  'warning'
                );
              }
            }}
            takenDays={takenDaysSet}
            accent="var(--primary, #6366f1)"
            dateLocale={dateLocale}
            baseDate={`${baseMonthPrefix}-01`}
            isOpen={isDayPickerOpen}
            onToggle={() => setIsDayPickerOpen((prev) => !prev)}
          />
          {isDuplicateDay && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 12px',
                background: 'rgba(244, 63, 94, 0.12)',
                border: '1px solid rgba(244, 63, 94, 0.35)',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: '600',
                color: '#f43f5e',
                marginTop: '-4px',
                marginBottom: '4px'
              }}
            >
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              <span>
                {t('diaryModal.duplicateDayError') ||
                  'Já existe um registro para este dia no Diário. Só é permitido 1 registro por dia.'}
              </span>
            </div>
          )}
        </div>

        {/* Mood Selector (Ultra-compact Segmented Control) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <label
              style={{
                fontSize: '0.78rem',
                fontWeight: '600',
                color: 'var(--text-main)',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>{t('diaryMood.moodLabel') || 'Mood'}</span>
            </label>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: '500' }}>
              {t(activeMoodMeta.labelKey) || activeMoodMeta.fallbackLabel}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px',
              borderRadius: '8px',
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid var(--border-glass)'
            }}
          >
            {Object.values(DiaryMood).map((moodKey) => {
              const cfg = DIARY_MOOD_CONFIG[moodKey];
              const isSelected = selectedMood === moodKey;

              return (
                <button
                  key={moodKey}
                  type="button"
                  onClick={() => setSelectedMood(moodKey)}
                  style={{
                    flex: 1,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    padding: '6px 8px',
                    borderRadius: '6px',
                    border: isSelected ? '1px solid var(--border-glass)' : '1px solid transparent',
                    background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                    color: isSelected ? 'var(--text-main)' : 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? '600' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span style={{ fontSize: '0.95rem', lineHeight: 1 }}>{cfg.emoji}</span>
                  <span style={{ whiteSpace: 'nowrap' }}>
                    {t(cfg.labelKey) || cfg.fallbackLabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Description Field with WYSIWYG Rich Text Editor & 900 Char Limit */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '6px'
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
                gap: '2px',
                background: 'rgba(255, 255, 255, 0.04)',
                padding: '2px 4px',
                borderRadius: '6px',
                border: '1px solid var(--border-glass)'
              }}
            >
              <button
                type="button"
                onClick={() => applyFormatting('bold')}
                title={t('diaryModal.bold') || 'Negrito'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '4px 7px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Bold size={13} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('italic')}
                title={t('diaryModal.italic') || 'Itálico'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '4px 7px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Italic size={13} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('strikethrough')}
                title={t('diaryModal.strikethrough') || 'Riscado'}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '4px 7px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center'
                }}
              >
                <Strikethrough size={13} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={() => applyFormatting('normal')}
                title={t('diaryModal.normal') || 'Limpar formatação'}
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
                  height: '130px',
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
              <div style={{ position: 'relative' }}>
                <div
                  ref={editorRef}
                  contentEditable
                  suppressContentEditableWarning
                  onInput={handleEditorInput}
                  onPaste={handleEditorPaste}
                  style={{
                    minHeight: '130px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '10px 14px',
                    color: 'var(--text-main)',
                    fontSize: '0.88rem',
                    lineHeight: '1.6',
                    outline: 'none',
                    boxSizing: 'border-box'
                  }}
                />
                {!charCount && (
                  <div
                    onClick={() => editorRef.current?.focus()}
                    style={{
                      position: 'absolute',
                      top: '10px',
                      left: '14px',
                      color: 'var(--text-dim)',
                      fontSize: '0.86rem',
                      pointerEvents: 'none',
                      userSelect: 'none'
                    }}
                  >
                    {t('diaryModal.descriptionPlaceholder') ||
                      'Escreva sobre o seu dia, reflexões ou momentos...'}
                  </div>
                )}
              </div>
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
