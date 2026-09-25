import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Ban, X } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';

/**
 * Asks for confirmation before cancelling an event: a cancelled event can never be reactivated.
 * Rendered in a portal so it is not clipped by the event card.
 */
export default function CancelEventConfirmModal({ isOpen, eventTitle, onClose, onConfirm }) {
  const { t } = useTranslation();

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return createPortal(
    <div className="modal-overlay" onClick={(e) => { e.stopPropagation(); onClose(); }}>
      <div className="modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: `${TimelineColor.DANGER}26`,
                border: `1px solid ${TimelineColor.DANGER}4d`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: TimelineColor.DANGER
              }}
            >
              <Ban size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem', margin: 0 }}>
                {t('cancelEventConfirm.title')}
              </h2>
              {eventTitle && (
                <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>{eventTitle}</div>
              )}
            </div>
          </div>
          <button type="button" className="modal-close-btn" aria-label={t('common.close')} onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="modal-body" style={{ padding: '16px 0 8px 0' }}>
          <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', margin: 0, fontWeight: '500' }}>
            {t('cancelEventConfirm.message')}
          </p>
        </div>

        <div className="modal-footer" style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            {t('cancelEventConfirm.back')}
          </button>
          <button
            type="button"
            className="btn btn-danger"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            style={{ background: TimelineColor.DANGER, borderColor: TimelineColor.DANGER, color: TimelineColor.WHITE }}
          >
            {t('cancelEventConfirm.confirm')}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
