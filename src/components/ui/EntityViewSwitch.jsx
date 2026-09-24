import React from 'react';
import { Globe, User } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

/**
 * EntityViewSwitch - A segmented switch visible only when an obligator filter is active.
 * Toggles between "Global View" (default) and "Individual View" (shows IndividualTimelineHeader).
 *
 * Props:
 *   selectedEntityId  - the currently active obligator filter id (null = not shown)
 *   isIndividualView  - boolean, controlled from app level
 *   onToggle          - (bool) => void, called when the user switches modes (null = not shown)
 */
export default function EntityViewSwitch({ selectedEntityId, isIndividualView, onToggle }) {
  const { t } = useTranslation();

  // Hidden when no obligator is selected or the timeboard does not support the individual view.
  if (!selectedEntityId || !onToggle) return null;

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-glass)',
        borderRadius: '10px',
        padding: '3px',
        gap: '2px',
        flexShrink: 0
      }}
      role="group"
      aria-label={isIndividualView ? t('header.viewIndividual') : t('header.viewGlobal')}
    >
      {/* Global */}
      <button
        type="button"
        id="entity-view-switch-global"
        onClick={() => onToggle(false)}
        title={t('header.viewGlobal')}
        aria-pressed={!isIndividualView}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          borderRadius: '7px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 600,
          transition: 'background 0.18s ease, color 0.18s ease',
          background: !isIndividualView ? 'var(--primary)' : 'transparent',
          color: !isIndividualView ? '#fff' : 'var(--text-muted)'
        }}
      >
        <Globe size={13} />
        <span>{t('header.viewGlobal')}</span>
      </button>

      {/* Individual */}
      <button
        type="button"
        id="entity-view-switch-individual"
        onClick={() => onToggle(true)}
        title={t('header.viewIndividual')}
        aria-pressed={isIndividualView}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          padding: '5px 10px',
          borderRadius: '7px',
          border: 'none',
          cursor: 'pointer',
          fontSize: '0.75rem',
          fontWeight: 600,
          transition: 'background 0.18s ease, color 0.18s ease',
          background: isIndividualView ? 'var(--primary)' : 'transparent',
          color: isIndividualView ? '#fff' : 'var(--text-muted)'
        }}
      >
        <User size={13} />
        <span>{t('header.viewIndividual')}</span>
      </button>
    </div>
  );
}
