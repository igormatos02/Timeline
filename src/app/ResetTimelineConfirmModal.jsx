import React from 'react';
import { TimelineColor, TimelineType } from '../enums/index.js';
import { RotateCcw, X } from 'lucide-react';

// Extracted from App.jsx (App).
export default function ResetTimelineConfirmModal({
  activeTimeline,
  handleConfirmResetTimeline,
  setIsResetConfirmOpen,
  t
}) {
  return (
    <div className="modal-overlay" style={{ zIndex: 1100 }}>
      <div className="modal-card" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: `${TimelineColor.AMBER}26`,
                color: TimelineColor.WARNING,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${TimelineColor.AMBER}4c`
              }}
            >
              <RotateCcw size={18} />
            </div>
            <div>
              <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                {t('resetTimelineModal.title')}
              </h3>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {activeTimeline?.type === TimelineType.BALANCE
                  ? t('resetTimelineModal.subtitleBalance')
                  : t('resetTimelineModal.subtitleTimeline', { name: activeTimeline?.name || '' })}
              </div>
            </div>
          </div>
          <button type="button" className="modal-close-btn" onClick={() => setIsResetConfirmOpen(false)}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '16px 0', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
          <p style={{ margin: '0 0 12px 0' }}>
            {t('resetTimelineModal.confirmMessage')}
          </p>
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              background: `${TimelineColor.DANGER}14`,
              border: `1px solid ${TimelineColor.DANGER}40`,
              fontSize: '0.82rem',
              color: TimelineColor.DANGER
            }}
          >
            ⚠️ {t('resetTimelineModal.warningMessage')}
          </div>
        </div>

        <div className="form-footer" style={{ margin: 0, paddingTop: '16px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setIsResetConfirmOpen(false)}
          >
            {t('buttons.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleConfirmResetTimeline}
            style={{
              background: TimelineColor.WARNING,
              borderColor: TimelineColor.WARNING,
              boxShadow: `0 4px 14px ${TimelineColor.AMBER}59`,
              fontWeight: '700',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <RotateCcw size={15} />
            <span>{t('resetTimelineModal.confirmButton')}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
