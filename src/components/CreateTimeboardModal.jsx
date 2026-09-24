import React, { useState, useEffect } from 'react';
import { X, Sparkles, LayoutGrid, Trash2, DollarSign, Plus, Home } from 'lucide-react';
import { TimeboardType } from '../../shared/enums/TimeboardType.js';
import { TimelineColor } from '../../shared/enums/TimelineColor.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const TEMPLATES = [
  {
    value: TimeboardType.CONDOFLOW,
    icon: Home,
    color: TimelineColor.CONDOFLOW,
    titleKey: 'templateCondoflow',
    descKey: 'templateCondoflowDesc',
    namePlaceholderKey: 'namePlaceholderCondoflow',
    descriptionPlaceholderKey: 'descriptionPlaceholderCondoflow'
  },
  {
    value: TimeboardType.FINANCIAL,
    icon: DollarSign,
    color: TimelineColor.FINANCIAL,
    titleKey: 'templateFinancial',
    descKey: 'templateFinancialDesc',
    namePlaceholderKey: 'namePlaceholderFinancial',
    descriptionPlaceholderKey: 'descriptionPlaceholderFinancial'
  },
  {
    value: TimeboardType.EMPTY,
    icon: Plus,
    color: TimelineColor.EMPTY,
    titleKey: 'templateEmpty',
    descKey: 'templateEmptyDesc',
    namePlaceholderKey: 'namePlaceholderEmpty',
    descriptionPlaceholderKey: 'descriptionPlaceholderEmpty'
  }
];

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
            <div style={{ background: `${TimelineColor.PRIMARY}26`, color: TimelineColor.PRIMARY, padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <LayoutGrid size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? t('timeboardModal.editTitle') : t('timeboardModal.newTitle')}
              </h3>
              <div style={{ fontSize: '0.76rem', color: TimelineColor.PRIMARY, fontWeight: '700' }}>
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
          {/* Timeboard Template */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {t('timeboardModal.templateLabel')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              {TEMPLATES.map((tmpl) => {
                const Icon = tmpl.icon;
                const isSelected = formData.type === tmpl.value;
                const isDisabled = Boolean(initialData);
                return (
                  <button
                    key={tmpl.value}
                    type="button"
                    onClick={() => !isDisabled && setFormData({ 
                      ...formData, 
                      type: tmpl.value,
                      name: '',
                      description: ''
                    })}
                    disabled={isDisabled}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: '8px',
                      padding: '14px 12px',
                      borderRadius: '12px',
                      border: `2px solid ${isSelected ? tmpl.color : 'var(--border-glass)'}`,
                      background: isSelected ? `${tmpl.color}1f` : (isDisabled ? 'rgba(148, 163, 184, 0.1)' : 'var(--bg-glass)'),
                      color: isDisabled ? 'var(--text-dim)' : 'var(--text-main)',
                      cursor: isDisabled ? 'not-allowed' : 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      textAlign: 'left',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box',
                      minHeight: '100px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', width: '100%' }}>
                      <div style={{ background: isSelected ? tmpl.color : 'var(--bg-input)', padding: '8px', borderRadius: '8px', display: 'flex' }}>
                        <Icon size={18} style={{ color: isSelected ? 'white' : tmpl.color }} />
                      </div>
                      <span style={{ fontWeight: '700', color: isSelected ? tmpl.color : (isDisabled ? 'var(--text-dim)' : 'var(--text-main)') }}>
                        {t(`timeboardModal.${tmpl.titleKey}`)}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: '400', color: isDisabled ? 'var(--text-dim)' : 'var(--text-muted)', lineHeight: '1.4' }}>
                      {t(`timeboardModal.${tmpl.descKey}`)}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

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
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: '#090d16',
                fontSize: '0.95rem',
                fontWeight: '500',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder={t(`timeboardModal.${TEMPLATES.find(t => t.value === formData.type)?.namePlaceholderKey || 'namePlaceholder'}`)}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Description / Condo Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)' }}>
              {formData.type === 'condoflow'
                ? t('timeboardModal.condoNameLabel')
                : t('timeboardModal.descriptionLabel')}
            </label>
            <input
              type="text"
              style={{
                width: '100%',
                padding: '12px 14px',
                background: '#ffffff',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: '#090d16',
                fontSize: '0.95rem',
                fontWeight: '500',
                outline: 'none',
                boxSizing: 'border-box'
              }}
              placeholder={formData.type === 'condoflow'
                ? t('timeboardModal.condoNamePlaceholder')
                : t(`timeboardModal.${TEMPLATES.find(t => t.value === formData.type)?.descriptionPlaceholderKey || 'descriptionPlaceholder'}`)}
              maxLength={formData.type === 'condoflow' ? 100 : undefined}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            {formData.type === 'condoflow' && (
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {formData.description?.length || 0}/100
              </span>
            )}
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
                title={t('timeboardModal.deleteTitle')}
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
              <span>{initialData ? t('timeboardModal.saveButton') : t('timeboardModal.createButton')}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
