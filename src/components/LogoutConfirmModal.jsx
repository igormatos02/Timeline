import React, { useEffect } from 'react';
import { LogOut, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';

export default function LogoutConfirmModal({
  isOpen,
  onClose,
  onConfirm
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

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div
        className="modal-card"
        style={{ maxWidth: '420px' }}
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
              <LogOut size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                {t('logoutModal.title')}
              </h2>
            </div>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="modal-body" style={{ padding: '16px 0 8px 0' }}>
          <p
            style={{
              fontSize: '0.92rem',
              color: 'var(--text-main)',
              margin: 0,
              fontWeight: '500'
            }}
          >
            {t('logoutModal.message')}
          </p>
        </div>

        {/* Actions Footer */}
        <div className="modal-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
          >
            {t('logoutModal.cancelButton')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={handleConfirm}
            style={{
              background: TimelineColor.DANGER,
              borderColor: TimelineColor.DANGER,
              color: TimelineColor.WHITE
            }}
          >
            {t('logoutModal.confirmButton')}
          </button>
        </div>
      </div>
    </div>
  );
}
