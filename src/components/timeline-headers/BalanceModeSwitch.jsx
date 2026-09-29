import React from 'react';
import { Layers, ArrowDownLeft, ArrowUpRight } from 'lucide-react';
import { BalanceViewMode, TimelineColor } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

const MODE_OPTIONS = [
  { id: BalanceViewMode.ALL, labelKey: 'balanceHeader.viewModeAll', icon: Layers, color: TimelineColor.BALANCE },
  { id: BalanceViewMode.INCOME, labelKey: 'balanceHeader.viewModeIncome', icon: ArrowDownLeft, color: TimelineColor.INCOME },
  { id: BalanceViewMode.OUTFLOW, labelKey: 'balanceHeader.viewModeOutflow', icon: ArrowUpRight, color: TimelineColor.EXPENSE }
];

/** Segmented switch of the balance header: all movements, only income, only outflows. */
export default function BalanceModeSwitch({ value = BalanceViewMode.ALL, onChange }) {
  const { t } = useTranslation();

  return (
    <div
      role="radiogroup"
      aria-label={t('balanceHeader.viewModeLabel')}
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
      {MODE_OPTIONS.map((option) => {
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
