import React, { useState, useEffect } from 'react';
import { X, Sparkles, Settings, Trash2 } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineStatus, TimelineColor, TIMELINE_COLOR_PRESETS, TimelineType, normalizeTimelineType } from '../enums/index.js';

export default function EditTimelineSettingsModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialData
}) {
  const { t } = useTranslation();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: TimelineColor.PRIMARY,
    status: TimelineStatus.ACTIVE,
    initialValue: ''
  });

  const resolvedType = normalizeTimelineType(initialData?.type);
  const isIncomeOrInvestment = resolvedType === TimelineType.INCOME || resolvedType === TimelineType.INVESTMENT;

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      const initVal = initialData.initialValue !== undefined && initialData.initialValue !== null
        ? initialData.initialValue
        : (initialData.initial_value !== undefined && initialData.initial_value !== null ? initialData.initial_value : '');
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        color: initialData.color || TimelineColor.PRIMARY,
        status: initialData.status === TimelineStatus.INACTIVE ? TimelineStatus.INACTIVE : TimelineStatus.ACTIVE,
        initialValue: initVal !== '' ? String(initVal) : ''
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    onSave({
      ...initialData,
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      initialValue: parseFloat(formData.initialValue) || 0,
      initial_value: parseFloat(formData.initialValue) || 0
    });
    onClose();
  };

  const handleDelete = () => {
    if (initialData && initialData.id && onDelete) {
      onDelete(initialData.id);
      onClose();
    }
  };

  const colors = TIMELINE_COLOR_PRESETS;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '500px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: `${formData.color || TimelineColor.PRIMARY}26`, color: formData.color || TimelineColor.PRIMARY, padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Settings size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {t('editTimelineSettingsModal.title')}
              </h3>
              <div style={{ fontSize: '0.76rem', color: formData.color || TimelineColor.PRIMARY, fontWeight: '700' }}>
                {t('editTimelineSettingsModal.subtitle')}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="action-icon-btn"
            onClick={onClose}
            aria-label="Close"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Timeline Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {t('editTimelineSettingsModal.nameLabel')}
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder={t('editTimelineSettingsModal.namePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {t('editTimelineSettingsModal.descriptionLabel')}
            </label>
            <textarea
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none'
              }}
              placeholder={t('editTimelineSettingsModal.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Initial Value for Income / Investment */}
          {isIncomeOrInvestment && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
                {t('editTimelineSettingsModal.initialValueLabel')}
              </label>
              <input
                type="number"
                step="0.01"
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  background: 'rgba(0, 0, 0, 0.25)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '10px',
                  color: 'var(--text-main)',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                placeholder={t('editTimelineSettingsModal.initialValuePlaceholder')}
                value={formData.initialValue}
                onChange={(e) => setFormData({ ...formData, initialValue: e.target.value })}
              />
            </div>
          )}

          {/* Color Accent */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {t('editTimelineSettingsModal.colorLabel')}
            </label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '4px' }}>
              {colors.map((c) => (
                <div
                  key={c}
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: formData.color === c ? `3px solid ${TimelineColor.WHITE}` : '2px solid transparent',
                    boxShadow: formData.color === c ? `0 0 12px ${c}` : 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '14px' }}>
            {initialData && !initialData.isSystemDefault && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: `1px solid ${TimelineColor.DANGER}55`,
                  background: `${TimelineColor.DANGER}1f`,
                  color: TimelineColor.DANGER,
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title={t('editTimelineSettingsModal.deleteTitle')}
              >
                <Trash2 size={15} />
                <span>{t('buttons.delete')}</span>
              </button>
            )}

            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px'
              }}
            >
              {t('buttons.cancel')}
            </button>

            <button
              type="submit"
              className="btn btn-primary"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <Sparkles size={16} />
              <span>{t('buttons.save')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
