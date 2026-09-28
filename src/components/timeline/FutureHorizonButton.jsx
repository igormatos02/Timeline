import React from 'react';
import { TimelineColor } from '../../enums/index.js';
import { ArrowUp } from 'lucide-react';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function FutureHorizonButton({
  onLoadMoreFuture,
  t
}) {
  if (!onLoadMoreFuture) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 28px 0', position: 'relative', zIndex: 10 }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onLoadMoreFuture}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '9px 22px',
          borderRadius: '24px',
          background: `linear-gradient(135deg, ${TimelineColor.PRIMARY}2e, ${TimelineColor.PURPLE}2e)`,
          border: `1px solid ${TimelineColor.PRIMARY}73`,
          color: 'var(--primary-light)',
          fontWeight: '700',
          fontSize: '0.84rem',
          cursor: 'pointer',
          boxShadow: 'var(--shadow-lg)',
          transition: 'all var(--transition-fast)'
        }}
      >
        <ArrowUp size={15} />
        <span>{t('timeline.projectMoreFuture')}</span>
      </button>
    </div>
  );
  }
