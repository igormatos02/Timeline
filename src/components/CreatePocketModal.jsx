import React, { useState, useEffect, useMemo } from 'react';
import { PiggyBank, Plus, Check, Calendar, Target } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt as ptLocale, enUS } from 'date-fns/locale';
import { TimelineColor } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import ModalShell from './ui/ModalShell.jsx';
import EuroInput from './ui/EuroInput.jsx';
import ToggleSwitch from './ui/ToggleSwitch.jsx';
import { pocketHasTarget } from '../utils/pocketUtils.js';

export default function CreatePocketModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  timeline = null,
  timeboardId = null
}) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'en' ? enUS : ptLocale;
  const isEditing = Boolean(initialData?.id);
  const accentColor = timeline?.color || TimelineColor.INVESTMENT;

  const [name, setName] = useState('');
  const [initialValue, setInitialValue] = useState('0');
  const [targetValue, setTargetValue] = useState('1000');
  // The target is optional: when off, it is not required and the progress line is not shown
  const [hasTarget, setHasTarget] = useState(true);
  const [dateCreated, setDateCreated] = useState(new Date().toISOString().substring(0, 10));
  const [dateClosed, setDateClosed] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Formatted month/year label derived from dateCreated state
  const createdMonthLabel = useMemo(() => {
    try {
      const d = dateCreated ? parseISO(dateCreated) : new Date();
      return format(d, 'MMMM yyyy', { locale: dateLocale });
    } catch {
      return format(new Date(), 'MMMM yyyy', { locale: dateLocale });
    }
  }, [dateCreated, dateLocale]);

  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.id) {
        setName(initialData.name || '');
        setInitialValue(String(initialData.initialValue ?? initialData.initial_value ?? 0));
        setTargetValue(String(initialData.targetValue ?? initialData.target_value ?? 0));
        setHasTarget(pocketHasTarget(initialData));
        const created = initialData.dateCreated || initialData.date_created;
        setDateCreated(created ? created.substring(0, 10) : new Date().toISOString().substring(0, 10));
        const closed = initialData.dateClosed || initialData.date_closed;
        setDateClosed(closed ? closed.substring(0, 10) : '');
        setIsClosed(Boolean(closed));
      } else {
        setName(initialData?.name || '');
        setInitialValue(String(initialData?.initialValue ?? initialData?.initial_value ?? 0));
        setTargetValue(String(initialData?.targetValue ?? initialData?.target_value ?? 1000));
        setHasTarget(true);
        // Use defaultDate from context (e.g. when clicking "Add Pocket" from a specific month row)
        const defaultDate = initialData?.defaultDate || initialData?.date || null;
        setDateCreated(defaultDate ? defaultDate.substring(0, 10) : format(new Date(), 'yyyy-MM-dd'));
        setDateClosed('');
        setIsClosed(false);
      }
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialData]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t('pocket.namePlaceholder'));
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        name: name.trim(),
        initialValue: Number(initialValue) || 0,
        initial_value: Number(initialValue) || 0,
        hasTarget,
        has_target: hasTarget,
        targetValue: hasTarget ? (Number(targetValue) || 0) : 0,
        target_value: hasTarget ? (Number(targetValue) || 0) : 0,
        dateCreated: dateCreated ? `${dateCreated}T12:00:00.000Z` : new Date().toISOString(),
        date_created: dateCreated ? `${dateCreated}T12:00:00.000Z` : new Date().toISOString(),
        dateClosed: isClosed ? (dateClosed ? `${dateClosed}T12:00:00.000Z` : new Date().toISOString()) : null,
        date_closed: isClosed ? (dateClosed ? `${dateClosed}T12:00:00.000Z` : new Date().toISOString()) : null,
        timelineId: timeline?.id,
        timeline_id: timeline?.id,
        timeboardId: timeboardId || timeline?.timeboardId || timeline?.timeboard_id,
        timeboard_id: timeboardId || timeline?.timeboardId || timeline?.timeboard_id
      };

      await onSave(payload, initialData?.id);
      onClose();
    } catch (err) {
      console.error('Error saving pocket:', err);
      setError(err.message || t('backend.validation.pocketNotFound'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      accent={accentColor}
      icon={PiggyBank}
      title={isEditing ? t('pocket.editPocket') : t('pocket.newPocket')}
      subtitle={timeline?.name}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            {t('buttons.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{
              background: accentColor,
              borderColor: accentColor,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={loading}
          >
            {isEditing ? <Check size={14} /> : <Plus size={14} />}
            <span>{isEditing ? t('buttons.save') : t('pocket.addPocket')}</span>
          </button>
        </>
      }
    >
      {error && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            background: 'rgba(239, 68, 68, 0.15)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            borderRadius: '8px',
            color: TimelineColor.DANGER,
            fontSize: '0.8rem'
          }}
        >
          {error}
        </div>
      )}

      {/* Pocket Name */}
      <div style={{ marginBottom: '14px' }}>
        <label
          style={{
            display: 'block',
            fontSize: '0.78rem',
            fontWeight: '700',
            color: 'var(--text-main)',
            marginBottom: '5px'
          }}
        >
          {t('pocket.name')} *
        </label>
        <input
          type="text"
          required
          autoFocus
          className="form-input"
          placeholder={t('pocket.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            boxSizing: 'border-box'
          }}
        />
      </div>

      {/* Target switch */}
      <ToggleSwitch
        checked={hasTarget}
        onChange={setHasTarget}
        label={t('pocket.hasTarget')}
        hint={t('pocket.hasTargetHint')}
        icon={Target}
        accent={accentColor}
      />

      {/* Initial and Target Values (target only when the pocket has one) */}
      <div style={{ display: 'grid', gridTemplateColumns: hasTarget ? '1fr 1fr' : '1fr', gap: '12px' }}>
        <EuroInput
          label={t('pocket.initialValue')}
          value={initialValue}
          onChange={(e) => setInitialValue(e.target.value)}
          placeholder="0.00"
          accent={accentColor}
        />
        {hasTarget && (
          <EuroInput
            label={t('pocket.targetValue')}
            value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder="1000.00"
            accent={accentColor}
          />
        )}
      </div>
      {/* Creation Month Badge — shown only when creating */}
      {!isEditing && (
        <div style={{ marginBottom: '14px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '0.78rem',
              fontWeight: '700',
              color: 'var(--text-main)',
              marginBottom: '5px'
            }}
          >
            {t('pocket.startingMonth')}
          </label>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '7px',
              padding: '7px 14px',
              borderRadius: '20px',
              background: `${accentColor}18`,
              border: `1px solid ${accentColor}40`,
              color: accentColor,
              fontSize: '0.85rem',
              fontWeight: '700',
              textTransform: 'capitalize'
            }}
          >
            <Calendar size={14} />
            {createdMonthLabel}
          </div>
        </div>
      )}


      {/* Close Pocket Toggle */}
      {isEditing && (
        <div
          style={{
            marginTop: '8px',
            padding: '12px',
            borderRadius: '8px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {isClosed ? t('pocket.statusClosed') : t('pocket.statusActive')}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                {isClosed ? t('pocket.reopenPocket') : t('pocket.closePocket')}
              </div>
            </div>
            <button
              type="button"
              className={`btn btn-sm ${isClosed ? 'btn-ghost' : 'btn-outline'}`}
              onClick={() => {
                const next = !isClosed;
                setIsClosed(next);
                if (next && !dateClosed) {
                  setDateClosed(new Date().toISOString().substring(0, 10));
                }
              }}
              style={{ fontSize: '0.74rem', padding: '4px 10px' }}
            >
              {isClosed ? t('pocket.reopenPocket') : t('pocket.closePocket')}
            </button>
          </div>

          {isClosed && (
            <div style={{ marginTop: '10px' }}>
              <label
                style={{
                  display: 'block',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  color: 'var(--text-dim)',
                  marginBottom: '4px'
                }}
              >
                {t('pocket.dateClosed')}
              </label>
              <input
                type="date"
                className="form-input"
                value={dateClosed}
                onChange={(e) => setDateClosed(e.target.value)}
                style={{
                  width: '100%',
                  padding: '7px 10px',
                  borderRadius: '6px',
                  fontSize: '0.8rem',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          )}
        </div>
      )}
    </ModalShell>
  );
}
