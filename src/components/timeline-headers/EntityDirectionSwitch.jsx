import React from 'react';
import { ArrowUpRight, ArrowDownLeft } from 'lucide-react';
import { EntityDirection, TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

const SIDE_OPTIONS = [
  { id: EntityDirection.OWES, labelKey: 'individualHeader.sideOwes', icon: ArrowDownLeft, color: TimelineColor.INCOME },
  { id: EntityDirection.RECEIVES, labelKey: 'individualHeader.sideReceives', icon: ArrowUpRight, color: TimelineColor.EXPENSE }
];

/** Switch of the individual header: what the entity owes / what it has to receive (shown when it has both). */
export default function EntityDirectionSwitch({ value = EntityDirection.OWES, onChange }) {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('individualHeader.sideLabel')}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '2px',
        padding: '2px',
        borderRadius: '9px',
        background: 'var(--bg-glass)',
        border: '1px solid var(--border-glass)'
      }}
    >
      {SIDE_OPTIONS.map((option) => {
        const isActive = option.id === value;
        const Icon = option.icon;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={(e) => {
              e.stopPropagation();
              if (!isActive) onChange?.(option.id);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              padding: '5px 10px',
              borderRadius: '7px',
              border: isActive ? `1px solid ${option.color}59` : '1px solid transparent',
              background: isActive ? `${option.color}1f` : 'transparent',
              color: isActive ? option.color : 'var(--text-muted)',
              fontSize: '0.76rem',
              fontWeight: isActive ? '700' : '600',
              cursor: isActive ? 'default' : 'pointer',
              transition: 'background-color 0.15s ease, color 0.15s ease'
            }}
          >
            <Icon size={13} />
            <span>{t(option.labelKey)}</span>
          </button>
        );
      })}
    </div>
  );
}
