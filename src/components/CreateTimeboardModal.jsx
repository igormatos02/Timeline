import React, { useState, useEffect } from 'react';
import { X, Sparkles, LayoutGrid, ChevronDown, Trash2 } from 'lucide-react';
import { TimeboardType } from '../../shared/enums/TimeboardType.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function CreateTimeboardModal({
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
    type: TimeboardType.FINANCIAL
  });

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        description: initialData.description || '',
        type: initialData.type || TimeboardType.FINANCIAL
      });
    } else {
      setFormData({
        name: '',
        description: '',
        type: TimeboardType.FINANCIAL
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
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type || TimeboardType.FINANCIAL
    });
    onClose();
  };

  const handleDelete = () => {
    if (initialData && initialData.id && onDelete) {
      onDelete(initialData.id);
      onClose();
    }
  };

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
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.15)',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? 'Timeboard Settings' : t('timeboardModal.newTitle')}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#6366f1', fontWeight: '700' }}>
                {initialData ? t('timeboardModal.editSubtitle') : t('timeboardModal.newSubtitle')}
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
          {/* Timeboard Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {t('timeboardModal.nameLabel')}
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontSize: '0.95rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder={t('timeboardModal.namePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {t('timeboardModal.descriptionLabel')}
            </label>
            <textarea
              rows={3}
              style={{
                width: '100%',
                padding: '12px 14px',
                background: 'rgba(0, 0, 0, 0.25)',
                border: '1px solid var(--border-glass, rgba(255, 255, 255, 0.1))',
                borderRadius: '10px',
                color: 'var(--text-main)',
                fontSize: '0.9rem',
                outline: 'none',
                boxSizing: 'border-box',
                resize: 'none'
              }}
              placeholder={t('timeboardModal.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Timeboard Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {t('timeboardModal.typeLabel')}
            </label>
            <div style={{ position: 'relative' }}>
              <select
                className="form-input"
                disabled={Boolean(initialData)}
                style={{
                  width: '100%',
                  padding: '10px 36px 10px 12px',
                  borderRadius: '8px',
                  boxSizing: 'border-box',
                  background: initialData ? 'rgba(148, 163, 184, 0.1)' : 'var(--bg-glass, rgba(255, 255, 255, 0.03))',
                  color: initialData ? 'var(--text-dim)' : 'var(--text-main)',
                  border: '1px solid var(--border-glass)',
                  cursor: initialData ? 'not-allowed' : 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  appearance: 'none',
                  WebkitAppearance: 'none'
                }}
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                required
              >
                <option value={TimeboardType.FINANCIAL} style={{ background: 'var(--bg-card, #131722)', color: 'var(--text-main)' }}>
                  {t('timeboardModal.typeFinancial')}
                </option>
                <option value={TimeboardType.PROJECTS} style={{ background: 'var(--bg-card, #131722)', color: 'var(--text-main)' }}>
                  {t('timeboardModal.typeProjects')}
                </option>
                <option value={TimeboardType.REMINDERS} style={{ background: 'var(--bg-card, #131722)', color: 'var(--text-main)' }}>
                  {t('timeboardModal.typeReminders')}
                </option>
              </select>
              <div
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  pointerEvents: 'none',
                  color: 'var(--text-dim)',
                  display: 'flex'
                }}
              >
                <ChevronDown size={16} />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
            {initialData && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  background: 'rgba(244, 63, 94, 0.12)',
                  color: '#f43f5e',
                  fontWeight: '700',
                  cursor: 'pointer',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Eliminar este Timeboard"
              >
                <Trash2 size={15} />
                <span>{t('buttons.delete') || 'Excluir'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              style={{
                flex: 1,
                padding: '12px',
                borderRadius: '10px',
                border: '1px solid var(--border-glass)',
                background: 'transparent',
                color: 'var(--text-main)',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              {t('buttons.cancel')}
            </button>
            <button
              type="submit"
              style={{
                flex: 2,
                padding: '12px',
                borderRadius: '10px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#fff',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)'
              }}
            >
              <Sparkles size={16} />
              <span>{initialData ? t('timeboardModal.saveButton') : t('timeboardModal.createButton')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
