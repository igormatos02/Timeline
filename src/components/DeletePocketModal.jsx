import React, { useEffect } from 'react';
import { Trash2, AlertTriangle, X, PiggyBank, Calendar } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency.js';
import { TimelineColor } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function DeletePocketModal({
  isOpen,
  onClose,
  pocket,
  timeline = null,
  allEvents = [],
  onConfirmDelete
}) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !pocket) return null;

  const pocketEvents = (allEvents || []).filter(
    (ev) => ev && (ev.pocketId === pocket.id || ev.pocket_id === pocket.id) && !ev.isDeleted
  );
  const eventsCount = pocketEvents.length;

  const initialVal = Number(pocket.initial_value ?? pocket.initialValue ?? 0);
  const targetVal = Number(pocket.target_value ?? pocket.targetValue ?? 0);
  const accentColor = timeline?.color || TimelineColor.INVESTMENT;

  const handleDelete = () => {
    if (onConfirmDelete) {
      onConfirmDelete(pocket.id);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        style={{ maxWidth: '480px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TimelineColor.DANGER
              }}
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                {t('deletePocketModal.title')}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {t('deletePocketModal.subtitle')}
              </p>
            </div>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Pocket Summary Card */}
        <div
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <PiggyBank size={18} style={{ color: accentColor, flexShrink: 0 }} />
              <span style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {pocket.name}
              </span>
            </div>
            <span
              style={{
                fontSize: '0.72rem',
                fontWeight: '700',
                padding: '3px 8px',
                borderRadius: '6px',
                background: 'rgba(255, 255, 255, 0.05)',
                color: 'var(--text-muted)'
              }}
            >
              {eventsCount} {t('deletePocketModal.eventsCount')}
            </span>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.78rem',
              color: 'var(--text-muted)',
              borderTop: '1px solid var(--border-glass)',
              paddingTop: '8px',
              marginTop: '2px'
            }}
          >
            <span>
              {t('deletePocketModal.initialValue')}{' '}
              <strong style={{ color: 'var(--text-main)' }}>{formatCurrency(initialVal)}</strong>
            </span>
            <span>
              {t('deletePocketModal.targetValue')}{' '}
              <strong style={{ color: accentColor }}>{formatCurrency(targetVal)}</strong>
            </span>
          </div>
        </div>

        {/* Warning Alert */}
        <div
          style={{
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            borderRadius: '10px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '10px',
            marginBottom: '18px'
          }}
        >
          <AlertTriangle
            size={18}
            style={{ color: TimelineColor.DANGER, flexShrink: 0, marginTop: '2px' }}
          />
          <div style={{ fontSize: '0.8rem', color: 'var(--text-main)', lineHeight: '1.45' }}>
            <p style={{ margin: 0, fontWeight: '700', marginBottom: '4px', color: TimelineColor.DANGER }}>
              {t('deletePocketModal.confirmMessage')}
            </p>
            <p style={{ margin: 0, color: 'var(--text-muted)' }}>
              {t('deletePocketModal.warningNote')}
            </p>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="modal-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: 0 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '0.84rem' }}
          >
            {t('deletePocketModal.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleDelete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 18px',
              fontSize: '0.84rem',
              fontWeight: '700',
              background: TimelineColor.DANGER,
              borderColor: TimelineColor.DANGER,
              color: TimelineColor.WHITE
            }}
          >
            <Trash2 size={15} />
            <span>{t('deletePocketModal.confirm')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
