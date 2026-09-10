import React from 'react';
import { Repeat, Zap, Calendar } from 'lucide-react';

export default function PeriodicitySelector({
  value, onChange, accent = '#10b981', t,
  options, layout = 'column', disabled = false
}) {
  const defaultOptions = [
    { id: 'recurring', label: t('modal.recurrent') || 'Recorrente', icon: <Repeat size={14} /> },
    { id: 'once', label: t('modal.unique') || 'Única', icon: <Zap size={14} /> },
    { id: 'period', label: t('modal.period') || 'Período', icon: <Calendar size={14} /> }
  ];

  const items = options || defaultOptions;

  if (disabled) return null;

  return (
    <div style={{ marginBottom: '14px' }}>
      <label style={{
        display: 'block', fontSize: '0.78rem', fontWeight: '700',
        marginBottom: '6px', color: 'var(--text-main)'
      }}>
        {t('modal.periodicity') || 'Periodicidade'}
      </label>
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px'
      }}>
        {items.map((p) => {
          const isSelected = value === p.id;
          return (
            <button key={p.id} type="button"
              onClick={() => onChange(p.id)}
              style={{
                display: 'flex', flexDirection: layout,
                alignItems: 'center', justifyContent: 'center',
                gap: layout === 'column' ? '4px' : '5px',
                padding: layout === 'column' ? '10px 8px' : '8px',
                borderRadius: '8px',
                border: isSelected ? `2px solid ${accent}` : '1px solid var(--border-glass)',
                background: isSelected ? `${accent}2e` : 'var(--bg-glass, rgba(255,255,255,0.03))',
                color: isSelected ? accent : 'var(--text-muted)',
                fontSize: layout === 'column' ? '0.8rem' : '0.78rem',
                fontWeight: isSelected ? '800' : '600',
                cursor: 'pointer', transition: 'all 0.15s ease'
              }}>
              {p.icon}
              <span>{p.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
