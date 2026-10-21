import React from 'react';
import { CalendarClock } from 'lucide-react';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { TimelineColor } from '../enums/index.js';

/** Condominium without accounting start date: no entries can be created until it is set (Settings → Geral). */
export default function StartDateNotice({ canEdit, onOpenSettings }) {
  const { t } = useTranslation();
  return (
    <div
      role="alert"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '10px',
        // Stays visible under the sticky header (the timeline opens scrolled to the current month)
        position: 'sticky',
        top: '76px',
        zIndex: 40,
        margin: '12px auto 0',
        maxWidth: '1100px',
        boxShadow: 'var(--shadow-sm)',
        padding: '12px 16px',
        borderRadius: '12px',
        border: `1px solid ${TimelineColor.WARNING}66`,
        background: 'var(--bg-card-hover)',
        color: 'var(--text-main)',
        fontSize: '0.86rem'
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
        <CalendarClock size={18} style={{ color: TimelineColor.WARNING, flexShrink: 0 }} />
        {t(canEdit ? 'condoSettings.startDateMissing' : 'condoSettings.startDateMissingMember')}
      </span>
      {canEdit && (
        <button
          type="button"
          onClick={onOpenSettings}
          style={{ background: TimelineColor.WARNING, border: 'none', color: 'var(--text-white)', borderRadius: '8px', padding: '7px 12px', fontSize: '0.82rem', fontWeight: 700, cursor: 'pointer' }}
        >
          {t('condoSettings.setStartDate')}
        </button>
      )}
    </div>
  );
}
