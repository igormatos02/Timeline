import React from 'react';
import { Calculator, Database, LocateFixed } from 'lucide-react';
import { TimelineColor } from '../enums/index.js';

// Extracted from App.jsx (App).
export default function AppFloatingControls({
  calculatedEventsCount,
  dbEventsCount,
  handleScrollToToday,
  t
}) {
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '24px',
        zIndex: 90,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '8px'
      }}
    >
      {/* Floating Go to Current Month Button */}
      <button
        type="button"
        className="floating-today-btn"
        onClick={handleScrollToToday}
        title={t('header.goToTodayTitle')}
      >
        <LocateFixed size={14} />
        <span>{t('header.goToToday')}</span>
      </button>

      {/* 📊 Floating Event Counts Badge */}
      <div
        className="floating-events-count-badge"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          padding: '7px 12px',
          background: 'var(--bg-card)',
          border: '1px solid var(--border-glass)',
          borderRadius: 'var(--radius-md, 12px)',
          boxShadow: 'var(--shadow-lg)',
          backdropFilter: 'blur(12px)',
          fontSize: '0.74rem',
          fontWeight: '700',
          color: 'var(--text-main)',
          userSelect: 'none',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        {/* DB Events Count */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title={t('header.dbEventsTooltip', { count: dbEventsCount })}
        >
          <Database size={13} style={{ color: TimelineColor.PRIMARY }} />
          <span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{dbEventsCount}</span>
          <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--text-dim)' }}>{t('header.dbEvents')}</span>
        </div>

        <span style={{ width: '1px', height: '12px', background: 'var(--border-glass)', display: 'inline-block' }} />

        {/* Calculated Events Count */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title={t('header.calculatedEventsTooltip', { count: calculatedEventsCount })}
        >
          <Calculator size={13} style={{ color: TimelineColor.SUCCESS }} />
          <span style={{ color: 'var(--text-main)', fontWeight: '800' }}>{calculatedEventsCount}</span>
          <span style={{ fontSize: '0.68rem', fontWeight: '600', color: 'var(--text-dim)' }}>{t('header.calcEvents')}</span>
        </div>
      </div>
    </div>
  );
}
