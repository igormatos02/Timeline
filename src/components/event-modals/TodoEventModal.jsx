import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Tag,
  AlignLeft,
  FileText,
  Plus,
  X,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { EventType, EventStatus, EventPriority, TimelineColor, TimelineType } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import ModalShell from '../ui/ModalShell.jsx';
import ObligationSelector from '../ObligationSelector.jsx';

const PRIORITY_OPTIONS = [
  { id: EventPriority.LOW, color: TimelineColor.SLATE, bg: 'rgba(100, 116, 139, 0.15)' },
  { id: EventPriority.NORMAL, color: TimelineColor.PRIMARY, bg: 'rgba(59, 130, 246, 0.15)' },
  { id: EventPriority.HIGH, color: TimelineColor.AMBER, bg: 'rgba(245, 158, 11, 0.15)' },
  { id: EventPriority.URGENT, color: TimelineColor.DANGER, bg: 'rgba(244, 63, 94, 0.15)' }
];

export default function TodoEventModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  timeline = null,
  timeboardId = null
}) {
  const { t } = useTranslation();
  const { showToast } = useToast();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [priority, setPriority] = useState(EventPriority.NORMAL);
  const [status, setStatus] = useState(EventStatus.PENDING);
  const [labels, setLabels] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [isObligation, setIsObligation] = useState(false);
  const [obligationPersonId, setObligationPersonId] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    if (initialData) {
      setName(initialData.name || initialData.title || '');
      setDescription(initialData.description || '');
      setNotes(initialData.notes || '');
      setPriority(initialData.priority || EventPriority.NORMAL);
      setStatus(initialData.status === EventStatus.COMPLETED || initialData.isCompleted ? EventStatus.COMPLETED : EventStatus.PENDING);
      setLabels(
        Array.isArray(initialData.labels)
          ? initialData.labels
          : (typeof initialData.labels === 'string' ? JSON.parse(initialData.labels || '[]') : [])
      );
      setIsObligation(Boolean(initialData.isObligation || initialData.is_obligation));
      setObligationPersonId(initialData.obligationPersonId || initialData.obligation_person_id || '');
    } else {
      setName('');
      setDescription('');
      setNotes('');
      setPriority(EventPriority.NORMAL);
      setStatus(EventStatus.PENDING);
      setLabels([]);
      setNewTagInput('');
      setIsObligation(false);
      setObligationPersonId('');
    }
  }, [isOpen, initialData]);

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

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();

    if (!name.trim()) {
      showToast(t('todoModal.nameRequired'), 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const isNowCompleted = status === EventStatus.COMPLETED;
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const resolvedDoneDate = isNowCompleted
        ? (initialData?.doneDate || initialData?.done_date || initialData?.date || todayStr)
        : null;

      const payload = {
        ...(initialData || {}),
        name: name.trim(),
        title: name.trim(),
        description: description.trim(),
        notes: notes.trim(),
        priority,
        status,
        isCompleted: isNowCompleted,
        doneDate: resolvedDoneDate,
        done_date: resolvedDoneDate,
        date: resolvedDoneDate || initialData?.date || todayStr,
        labels,
        isObligation,
        obligationPersonId: isObligation ? obligationPersonId : null,
        timelineId: timeline?.id || initialData?.timelineId || initialData?.timeline_id,
        timelineOriginId: timeline?.id || initialData?.timelineId || initialData?.timeline_id,
        timeboardId: timeboardId || timeline?.timeboardId || initialData?.timeboardId,
        eventType: EventType.TODO,
        timelineType: TimelineType.TODO
      };

      await onSave(payload);
      onClose();
    } catch (err) {
      console.error('Error saving todo item:', err);
      showToast(err.message, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      icon={CheckSquare}
      accent="var(--primary)"
      maxWidth="540px"
      title={
        initialData
          ? t('todoModal.editTitle')
          : t('todoModal.newTitle')
      }
      subtitle={t('todoHeader.badge')}
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
            {t('common.cancel')}
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
              background: 'var(--primary)',
              borderColor: 'var(--primary)'
            }}
          >
            {isSaving ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <Loader2 size={14} className="animate-spin" />
                <span>{t('buttons.saving')}</span>
              </span>
            ) : (
              t('buttons.save')
            )}
          </button>
        </>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        {/* Name / Title */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {t('todoModal.nameLabel')}
          </label>
          <input
            type="text"
            className="form-control"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('todoModal.namePlaceholder')}
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

        {/* Priority Selector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {t('todoModal.priorityLabel')}
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
            {PRIORITY_OPTIONS.map((opt) => {
              const isSelected = priority === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPriority(opt.id)}
                  style={{
                    padding: '7px 4px',
                    borderRadius: '7px',
                    border: isSelected ? `2px solid ${opt.color}` : '1px solid var(--border-glass)',
                    background: isSelected ? opt.bg : 'rgba(255, 255, 255, 0.03)',
                    color: isSelected ? opt.color : 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? '800' : '600',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'center'
                  }}
                >
                  {t(`priority.${opt.id}`)}
                </button>
              );
            })}
          </div>
        </div>

        {/* Status Toggle (if editing) */}
        {initialData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {t('todoModal.statusLabel')}
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setStatus(EventStatus.PENDING)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: status === EventStatus.PENDING ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                  background: status === EventStatus.PENDING ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: status === EventStatus.PENDING ? 'var(--primary-light)' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {t('todoModal.statusPending')}
              </button>
              <button
                type="button"
                onClick={() => setStatus(EventStatus.COMPLETED)}
                style={{
                  flex: 1,
                  padding: '7px 10px',
                  borderRadius: '7px',
                  border: status === EventStatus.COMPLETED ? '2px solid var(--success)' : '1px solid var(--border-glass)',
                  background: status === EventStatus.COMPLETED ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                  color: status === EventStatus.COMPLETED ? 'var(--success)' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                {t('todoModal.statusCompleted')}
              </button>
            </div>
          </div>
        )}

        {/* Labels / Tags */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <Tag size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{t('todoModal.labelsLabel')}</span>
          </label>
          <div style={{ display: 'flex', gap: '6px' }}>
            <input
              type="text"
              className="form-control"
              value={newTagInput}
              onChange={(e) => setNewTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddTag();
                }
              }}
              placeholder={t('todoModal.tagPlaceholder')}
              style={{
                flex: 1,
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: 'var(--text-main)',
                fontSize: '0.84rem'
              }}
            />
            <button
              type="button"
              className="btn btn-outline"
              onClick={handleAddTag}
              style={{ padding: '8px 14px', borderRadius: '8px', fontSize: '0.8rem', fontWeight: '700' }}
            >
              <Plus size={14} />
              <span>{t('todoModal.addTag')}</span>
            </button>
          </div>
          {labels.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
              {labels.map((lbl) => (
                <span
                  key={lbl}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 8px',
                    borderRadius: '6px',
                    background: 'rgba(59, 130, 246, 0.12)',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    color: 'var(--primary-light)',
                    fontSize: '0.76rem',
                    fontWeight: '600'
                  }}
                >
                  #{lbl}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(lbl)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'inherit',
                      cursor: 'pointer',
                      padding: 0,
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Description */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <AlignLeft size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{t('todoModal.descriptionLabel')}</span>
          </label>
          <textarea
            className="form-control"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('todoModal.descriptionPlaceholder')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text-main)',
              fontSize: '0.86rem',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Notes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <FileText size={13} style={{ color: 'var(--text-muted)' }} />
            <span>{t('todoModal.notesLabel')}</span>
          </label>
          <textarea
            className="form-control"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('todoModal.notesPlaceholder')}
            style={{
              background: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid var(--border-glass)',
              borderRadius: '8px',
              padding: '8px 12px',
              color: 'var(--text-main)',
              fontSize: '0.86rem',
              resize: 'vertical'
            }}
          />
        </div>

        {/* Obligation Selector */}
        <ObligationSelector
          isObligation={isObligation}
          obligationPersonId={obligationPersonId}
          onToggleObligation={(val) => setIsObligation(val)}
          onChangePersonId={(val) => setObligationPersonId(val)}
        />
      </div>
    </ModalShell>
  );
}
