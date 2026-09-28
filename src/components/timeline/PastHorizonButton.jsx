import React from 'react';
import { TimelineColor } from '../../enums/index.js';
import { ArrowDown } from 'lucide-react';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function PastHorizonButton({
  onLoadMorePast,
  t
}) {
  if (!onLoadMorePast) return null;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 16px 0', position: 'relative', zIndex: 10 }}>
      <button
        type="button"
        className="btn btn-secondary btn-sm"
        onClick={onLoadMorePast}
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
        <ArrowDown size={15} />
        <span>{t('timeline.loadMorePast')}</span>
      </button>
    </div>
  );
  }
