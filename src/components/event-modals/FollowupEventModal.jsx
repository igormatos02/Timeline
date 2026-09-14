import React, { useState, useEffect } from 'react';
import { format, parseISO, getDaysInMonth } from 'date-fns';
import {
  ListTree,
  Tag,
  AlignLeft,
  FileText,
  Plus,
  X,
  CheckCircle2,
  Clock,
  Square,
  AlertCircle,
  Loader2,
  Trash2
} from 'lucide-react';
import {
  EventType,
  TimelineType,
  TimelineColor,
  FollowupStatus,
  normalizeFollowupStatus
} from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ModalShell from '../ui/ModalShell.jsx';
import DayPickerPopover from '../ui/DayPickerPopover.jsx';
import { generateUUID } from '../../utils/uuid.js';

export default function FollowupEventModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  defaultDate = null,
  timeline = null,
  timeboardId = null
}) {
  const { t, dateLocale } = useTranslation();
  const { showToast } = useToast();

  const isAnchor = Boolean(initialData?.position === 0 || initialData?.isReadOnly || initialData?.isAnchorVisible);

  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState(FollowupStatus.IN_PROGRESS);
  const [labels, setLabels] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [breakdownItems, setBreakdownItems] = useState([]);
  const [newSubtaskInput, setNewSubtaskInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const targetDate = initialData?.date || (initialData?.createdAt ? String(initialData.createdAt).substring(0, 10) : defaultDate) || format(new Date(), 'yyyy-MM-dd');
    let parsedDay = 1;
    try {
      const d = parseISO(targetDate);
      if (!isNaN(d.getDate())) parsedDay = d.getDate();
    } catch {
      parsedDay = 1;
    }
    setDayOfMonth(parsedDay);

    if (initialData) {
      setName(initialData.name || initialData.title || '');
      setDescription(initialData.description || '');
      setNotes(initialData.notes || '');
      setStatus(
        initialData.position === 0
          ? FollowupStatus.INITIATED
          : (initialData.status === FollowupStatus.FINISHED || initialData.isFinished ? FollowupStatus.FINISHED : FollowupStatus.IN_PROGRESS)
      );
      setLabels(
        Array.isArray(initialData.labels)
          ? initialData.labels
          : (typeof initialData.labels === 'string' ? JSON.parse(initialData.labels || '[]') : [])
      );
      const rawBreakdowns = initialData.breakdownItems || initialData.breakdown_items || [];
      setBreakdownItems(
        Array.isArray(rawBreakdowns)
          ? rawBreakdowns
          : (typeof rawBreakdowns === 'string' ? JSON.parse(rawBreakdowns || '[]') : [])
      );
    } else {
      setName('');
      setDescription('');
      setNotes('');
      setStatus(FollowupStatus.IN_PROGRESS);
      setLabels([]);
      setNewTagInput('');
      setBreakdownItems([]);
      setNewSubtaskInput('');
    }
    setIsDayPickerOpen(false);
  }, [isOpen, initialData, defaultDate]);

  const handleAddTag = (e) => {
    if (e) e.preventDefault();
    const tag = newTagInput.trim();
    if (!tag) return;
    if (!labels.includes(tag)) {
      setLabels([...labels, tag]);
    }
    setNewTagInput('');
  };

  const handleRemoveTag = (tagToRemove) => {
    setLabels(labels.filter((item) => item !== tagToRemove));
  };

  const handleAddSubtask = (e) => {
    if (e) e.preventDefault();
    const title = newSubtaskInput.trim();
    if (!title) return;
    const newItem = {
      id: generateUUID(),
      title,
      status: FollowupStatus.INITIATED
    };
    setBreakdownItems([...breakdownItems, newItem]);
    setNewSubtaskInput('');
  };

  const handleToggleSubtaskStatus = (subtaskId) => {
    setBreakdownItems(
      breakdownItems.map((item) => {
        if (item.id !== subtaskId) return item;
        let nextStatus = FollowupStatus.INITIATED;
        if (item.status === FollowupStatus.INITIATED || item.status === 'not_started' || !item.status) {
          nextStatus = FollowupStatus.IN_PROGRESS;
        } else if (item.status === FollowupStatus.IN_PROGRESS) {
          nextStatus = FollowupStatus.FINISHED;
        } else {
          nextStatus = FollowupStatus.INITIATED;
        }
        return { ...item, status: nextStatus };
      })
    );
  };

  const handleRemoveSubtask = (subtaskId) => {
    setBreakdownItems(breakdownItems.filter((item) => item.id !== subtaskId));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      showToast(t('followupModal.nameRequired'), 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const baseTargetDate = initialData?.date || (initialData?.createdAt ? String(initialData.createdAt).substring(0, 10) : defaultDate) || format(new Date(), 'yyyy-MM-dd');
      const baseYearStr = format(parseISO(baseTargetDate), 'yyyy');
      const baseMonthStr = format(parseISO(baseTargetDate), 'MM');
      const totalDays = getDaysInMonth(parseISO(baseTargetDate)) || 31;
      const safeDay = Math.min(totalDays, Math.max(1, Number(dayOfMonth) || 1));
      const safeDayStr = safeDay.toString().padStart(2, '0');
      const finalDate = `${baseYearStr}-${baseMonthStr}-${safeDayStr}`;

      const payload = {
        name: name.trim(),
        description: description.trim(),
        labels,
        notes: isAnchor ? '' : notes,
        breakdownItems: isAnchor ? [] : breakdownItems,
        status: isAnchor ? FollowupStatus.INITIATED : status,
        date: finalDate,
        createdAt: initialData?.createdAt ? initialData.createdAt : new Date(`${finalDate}T12:00:00.000Z`).toISOString(),
        timelineId: timeline?.id || initialData?.timelineId || initialData?.timeline_id || null,
        timeboardId: timeboardId || timeline?.timeboardId || timeline?.timeboard_id || initialData?.timeboardId || null,
        eventType: EventType.FOLLOWUP,
        timelineType: TimelineType.FOLLOWUP
      };

      if (initialData?.eventId || initialData?.event_id) {
        payload.eventId = initialData.eventId || initialData.event_id;
      }
      if (initialData?.id) {
        payload.id = initialData.id;
      }

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error saving followup:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const headerColor = timeline?.color || TimelineColor.FOLLOWUP;
  const isEditing = Boolean(initialData && initialData.id);
  const baseTargetDate = initialData?.date || (initialData?.createdAt ? String(initialData.createdAt).substring(0, 10) : defaultDate) || format(new Date(), 'yyyy-MM-dd');

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        isAnchor
          ? t('followupModal.viewAnchorTitle')
          : (isEditing ? t('followupModal.editTitle') : t('followupModal.newTitle'))
      }
      subtitle={t('sidebar.followupTimeline')}
      icon={ListTree}
      accent={headerColor}
      maxWidth="600px"
      footer={
        <>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            disabled={isSaving}
          >
            {t('followupModal.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            style={{
              background: headerColor,
              border: 'none',
              color: TimelineColor.WHITE,
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={isSaving}
          >
            {isSaving && <Loader2 size={15} className="spin" />}
            {t('followupModal.save')}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Banner informativo quando o registro for âncora fixa */}
        {isAnchor && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              background: 'rgba(6, 182, 212, 0.08)',
              border: `1px solid ${TimelineColor.FOLLOWUP}`,
              borderRadius: '8px',
              fontSize: '0.78rem',
              color: 'var(--text-main)'
            }}
          >
            <AlertCircle size={18} style={{ color: TimelineColor.FOLLOWUP, flexShrink: 0 }} />
            <span>{t('followupModal.anchorNotice')}</span>
          </div>
        )}

        {/* Título / Nome */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            {t('followupModal.nameLabel')}
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('followupModal.namePlaceholder')}
            disabled={isSaving}
            autoFocus={!isEditing}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-glass, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>

        {/* Seleção do Dia do Mês (DayPickerPopover) */}
        {!isAnchor && (
          <DayPickerPopover
            label={t('followupModal.dayOfMonth')}
            value={dayOfMonth}
            onChange={(day) => setDayOfMonth(day)}
            accent={headerColor}
            dateLocale={dateLocale}
            baseDate={baseTargetDate}
            isOpen={isDayPickerOpen}
            onToggle={() => setIsDayPickerOpen(!isDayPickerOpen)}
          />
        )}

        {/* Estado / Status */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            {t('followupModal.statusLabel')}
          </label>
          {isAnchor ? (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                background: 'rgba(100, 116, 139, 0.15)',
                color: TimelineColor.SLATE,
                fontSize: '0.8rem',
                fontWeight: '700'
              }}
            >
              <Clock size={14} />
              {t('followupModal.statusInitiated')}
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setStatus(FollowupStatus.IN_PROGRESS)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: status === FollowupStatus.IN_PROGRESS ? `1px solid ${TimelineColor.FOLLOWUP}` : '1px solid var(--border-glass)',
                  background: status === FollowupStatus.IN_PROGRESS ? 'rgba(6, 182, 212, 0.15)' : 'var(--bg-card)',
                  color: status === FollowupStatus.IN_PROGRESS ? TimelineColor.FOLLOWUP : 'var(--text-dim)',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={15} />
                {t('followupStatus.inProgress')}
              </button>

              <button
                type="button"
                onClick={() => setStatus(FollowupStatus.FINISHED)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  border: status === FollowupStatus.FINISHED ? `1px solid ${TimelineColor.SUCCESS}` : '1px solid var(--border-glass)',
                  background: status === FollowupStatus.FINISHED ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                  color: status === FollowupStatus.FINISHED ? TimelineColor.SUCCESS : 'var(--text-dim)',
                  transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle2 size={15} />
                {t('followupStatus.finished')}
              </button>
            </div>
          )}
        </div>

        {/* Breakdown Items / Subtarefas (Apenas editável na posição 1) */}
        {!isAnchor && (
          <div>
            <label style={{ display: 'block', fontSize: '0.76rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              {t('followupModal.subtasksLabel')} ({breakdownItems.filter((s) => s.status === FollowupStatus.FINISHED || s.status === 'finished').length}/{breakdownItems.length})
            </label>

            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <input
                type="text"
                value={newSubtaskInput}
                onChange={(e) => setNewSubtaskInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddSubtask();
                  }
                }}
                placeholder={t('followupModal.subtaskPlaceholder')}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  background: 'var(--bg-glass, rgba(255,255,255,0.03))',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  color: 'var(--text-main)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleAddSubtask}
                style={{ padding: '8px 14px', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <Plus size={14} />
                {t('followupModal.addSubtask')}
              </button>
            </div>

            {breakdownItems.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '150px', overflowY: 'auto' }}>
                {breakdownItems.map((subtask) => {
                  const isDone = subtask.status === FollowupStatus.FINISHED || subtask.status === 'finished';
                  const isInProg = subtask.status === FollowupStatus.IN_PROGRESS || subtask.status === 'in_progress';

                  return (
                    <div
                      key={subtask.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '6px',
                        fontSize: '0.82rem'
                      }}
                    >
                      <div
                        onClick={() => handleToggleSubtaskStatus(subtask.id)}
                        style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1, overflow: 'hidden' }}
                      >
                        {isDone ? (
                          <CheckCircle2 size={16} style={{ color: TimelineColor.SUCCESS, flexShrink: 0 }} />
                        ) : isInProg ? (
                          <Clock size={16} style={{ color: TimelineColor.FOLLOWUP, flexShrink: 0 }} />
                        ) : (
                          <Square size={16} style={{ color: 'var(--text-dim)', flexShrink: 0 }} />
                        )}
                        <span
                          style={{
                            color: isDone ? 'var(--text-dim)' : 'var(--text-main)',
                            textDecoration: isDone ? 'line-through' : 'none',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                        >
                          {subtask.title}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span
                          onClick={() => handleToggleSubtaskStatus(subtask.id)}
                          style={{
                            fontSize: '0.68rem',
                            fontWeight: '700',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            background: isDone ? 'rgba(16, 185, 129, 0.15)' : (isInProg ? 'rgba(6, 182, 212, 0.15)' : 'rgba(100, 116, 139, 0.15)'),
                            color: isDone ? TimelineColor.SUCCESS : (isInProg ? TimelineColor.FOLLOWUP : TimelineColor.SLATE)
                          }}
                        >
                          {isDone ? t('followupBreakdownStatus.finished') : (isInProg ? t('followupBreakdownStatus.inProgress') : t('followupBreakdownStatus.notStarted'))}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveSubtask(subtask.id)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            padding: '2px'
                          }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontStyle: 'italic', padding: '4px 0' }}>
                {t('followupModal.noSubtasks')}
              </div>
            )}
          </div>
        )}

        {/* Labels / Tags */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            {t('followupModal.labelsLabel')}
          </label>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '6px' }}>
            <input
              type="text"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={t('followupModal.tagPlaceholder')}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'var(--bg-glass, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={handleAddTag}
              style={{ padding: '8px 14px', fontSize: '0.78rem' }}
            >
              {t('followupModal.addTag')}
            </button>
          </div>

          {labels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
              {labels.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(6, 182, 212, 0.12)',
                    color: TimelineColor.FOLLOWUP,
                    fontSize: '0.72rem',
                    fontWeight: '700'
                  }}
                >
                  #{tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}
                  >
                    <X size={11} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Descrição */}
        <div>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            {t('followupModal.descriptionLabel')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('followupModal.descriptionPlaceholder')}
            rows={2}
            style={{
              width: '100%',
              padding: '10px 12px',
              background: 'var(--bg-glass, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              color: 'var(--text-main)',
              fontSize: '0.88rem',
              outline: 'none',
              boxSizing: 'border-box',
              resize: 'vertical',
              fontFamily: 'inherit'
            }}
          />
        </div>

        {/* Notas / Histórico (Apenas no follow-up ativo de posição 1) */}
        {!isAnchor && (
          <div>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              {t('followupModal.notesLabel')}
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('followupModal.notesPlaceholder')}
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'var(--bg-glass, rgba(255,255,255,0.03))',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.88rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'vertical',
                fontFamily: 'inherit'
              }}
            />
          </div>
        )}

      </div>
    </ModalShell>
  );
}
