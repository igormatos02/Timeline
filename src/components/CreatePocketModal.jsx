import React, { useState, useEffect } from 'react';
import { PiggyBank, Plus, Check } from 'lucide-react';
import { TimelineColor } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import ModalShell from './ui/ModalShell.jsx';
import EuroInput from './ui/EuroInput.jsx';

export default function CreatePocketModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  timeline = null,
  timeboardId = null
}) {
  const { t } = useTranslation();
  const isEditing = Boolean(initialData?.id);
  const accentColor = timeline?.color || TimelineColor.INVESTMENT;

  const [name, setName] = useState('');
  const [initialValue, setInitialValue] = useState('0');
  const [targetValue, setTargetValue] = useState('1000');
  const [dateCreated, setDateCreated] = useState(new Date().toISOString().substring(0, 10));
  const [dateClosed, setDateClosed] = useState('');
  const [isClosed, setIsClosed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (initialData && initialData.id) {
        setName(initialData.name || '');
        setInitialValue(String(initialData.initialValue ?? initialData.initial_value ?? 0));
        setTargetValue(String(initialData.targetValue ?? initialData.target_value ?? 0));
        const created = initialData.dateCreated || initialData.date_created;
        setDateCreated(created ? created.substring(0, 10) : new Date().toISOString().substring(0, 10));
        const closed = initialData.dateClosed || initialData.date_closed;
        setDateClosed(closed ? closed.substring(0, 10) : '');
        setIsClosed(Boolean(closed));
      } else {
        setName(initialData?.name || '');
        setInitialValue(String(initialData?.initialValue ?? initialData?.initial_value ?? 0));
        setTargetValue(String(initialData?.targetValue ?? initialData?.target_value ?? 1000));
        const defDate = initialData?.defaultDate || initialData?.dateCreated || initialData?.date_created;
        setDateCreated(defDate ? defDate.substring(0, 10) : new Date().toISOString().substring(0, 10));
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
        targetValue: Number(targetValue) || 0,
        target_value: Number(targetValue) || 0,
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

      {/* Initial and Target Values */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <EuroInput
          label={t('pocket.initialValue')}
          value={initialValue}
          onChange={(e) => setInitialValue(e.target.value)}
          placeholder="0.00"
          accent={accentColor}
        />
        <EuroInput
          label={t('pocket.targetValue')}
          value={targetValue}
          onChange={(e) => setTargetValue(e.target.value)}
          placeholder="1000.00"
          accent={accentColor}
        />
      </div>

      {/* Creation Date */}
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
          {t('pocket.dateCreated')}
        </label>
        <input
          type="date"
          className="form-input"
          value={dateCreated}
          onChange={(e) => setDateCreated(e.target.value)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '0.85rem',
            boxSizing: 'border-box'
          }}
        />
      </div>

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
