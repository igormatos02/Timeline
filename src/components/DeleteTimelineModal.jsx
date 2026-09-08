import React, { useEffect } from 'react';
import { Trash2, X, Calendar, Layers } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function DeleteTimelineModal({
  isOpen,
  onClose,
  timeline,
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

  if (!isOpen || !timeline) return null;

  const eventsCount = Array.isArray(timeline.events) ? timeline.events.length : 0;
  const timelineColor = timeline.color || 'var(--primary-light)';

  const handleDelete = () => {
    if (onConfirmDelete) {
      onConfirmDelete(timeline.id || timeline);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f43f5e'
              }}
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                {t('deleteTimelineModal.title') || 'Eliminar Linha de Tempo'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                {t('deleteTimelineModal.subtitle') || 'Confirmar eliminação da timeline'}
              </p>
            </div>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Timeline Summary Card */}
        <div
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
              <span
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: timelineColor,
                  flexShrink: 0,
                  boxShadow: `0 0 8px ${timelineColor}`
                }}
              />
              <span style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {timeline.name || 'Timeline'}
              </span>
            </div>

            {timeline.type && (
              <span
                style={{
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  padding: '2px 8px',
                  borderRadius: '6px',
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-dim)'
                }}
              >
                {timeline.type}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {eventsCount > 0 && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Layers size={13} style={{ color: 'var(--primary-light)' }} />
                {t('deleteTimelineModal.eventsCount', { count: eventsCount }) || `${eventsCount} registos associados`}
              </span>
            )}
            {timeline.description && (
              <span style={{ color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {timeline.description}
              </span>
            )}
          </div>
        </div>

        {/* Warning message */}
        <p style={{ margin: '0 0 20px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
          {t('deleteTimelineModal.warning') || 'Tem a certeza que deseja eliminar esta linha de tempo e todos os seus registos associados? Esta ação não pode ser desfeita.'}
        </p>

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            {t('buttons.cancel') || 'Cancelar'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-sm, 8px)',
              padding: '8px 18px',
              fontSize: '0.86rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={15} />
            <span>{t('buttons.delete') || 'Eliminar'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
