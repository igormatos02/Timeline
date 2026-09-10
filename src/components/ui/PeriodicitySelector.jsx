import React from 'react';
import { EventPeriodicity } from '../../enums/index.js';

export default function PeriodicitySelector({
  value = EventPeriodicity.MONTHLY,
  onChange,
  accent = '#10b981',
  t,
  options,
  disabled = false,
  label
}) {
  const defaultOptions = [
    { id: EventPeriodicity.MONTHLY, label: t('periodicity.monthly') || 'Mensal' },
    { id: EventPeriodicity.BIWEEKLY, label: t('periodicity.biweekly') || 'Quinzenal' },
    { id: EventPeriodicity.BIMONTHLY, label: t('periodicity.bimonthly') || 'Bimestral' },
    { id: EventPeriodicity.SEMIANNUAL, label: t('periodicity.biannual') || 'Semestral' },
    { id: EventPeriodicity.ANNUAL, label: t('periodicity.annual') || 'Anual' }
  ];

  const items = options || defaultOptions;

  if (disabled) return null;

  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{
        display: 'block',
        fontSize: '0.78rem',
        fontWeight: '700',
        marginBottom: '6px',
        color: 'var(--text-main)'
      }}>
        {label || t('modal.periodicity') || 'Periodicidade'}
      </label>
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '6px'
      }}>
        {items.map((p) => {
          const isSelected = value === p.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p.id)}
              style={{
                flex: '1 1 auto',
                minWidth: '70px',
                padding: '7px 10px',
                borderRadius: '8px',
                border: isSelected ? `2px solid ${accent}` : '1px solid var(--border-glass)',
                background: isSelected ? `${accent}25` : 'var(--bg-glass, rgba(255,255,255,0.03))',
                color: isSelected ? accent : 'var(--text-muted)',
                fontSize: '0.78rem',
                fontWeight: isSelected ? '800' : '600',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.15s ease'
              }}
            >
              {p.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
