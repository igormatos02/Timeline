import React from 'react';
import { TimelineColor } from '../../enums/index.js';

/**
 * OptionBoxGroup - single choice shown as compact boxes (icon + name), with an optional tooltip per option.
 * Shared by the category and recurrence selectors of the event modals, so both look the same.
 *
 * Props:
 *   label         - field label (same style as the other modal labels)
 *   options       - [{ id, label, icon: ComponentType, color, tooltip?, hint?, disabled? }]
 *                   (hint = small second line, e.g. a balance; disabled options cannot be chosen)
 *   value         - selected option id
 *   onChange      - (id) => void
 *   marginBottom  - spacing after the field (defaults to the modal field spacing)
 */
export default function OptionBoxGroup({ label, options, value, onChange, marginBottom = '14px' }) {
  return (
    <div style={{ marginBottom }}>
      {label && (
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
          {label}
        </label>
      )}
      <div
        role="radiogroup"
        aria-label={label}
        style={{ display: 'grid', gridTemplateColumns: `repeat(${options.length === 4 ? 2 : Math.min(options.length, 3)}, 1fr)`, gap: '8px' }}
      >
        {options.map((option) => {
          const Icon = option.icon;
          const isSelected = value === option.id;
          return (
            <button
              key={option.id ?? 'none'}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-disabled={option.disabled || undefined}
              disabled={option.disabled}
              title={option.tooltip || undefined}
              onClick={() => onChange(option.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 10px',
                borderRadius: '12px',
                border: `2px solid ${isSelected ? option.color : 'var(--border-glass)'}`,
                background: isSelected ? `${option.color}1f` : 'var(--bg-glass)',
                color: 'var(--text-main)',
                cursor: option.disabled ? 'not-allowed' : 'pointer',
                opacity: option.disabled ? 0.45 : 1,
                fontSize: '0.8rem',
                fontWeight: '600',
                textAlign: 'left',
                transition: 'all 0.15s ease',
                boxSizing: 'border-box',
                minWidth: 0
              }}
            >
              <div style={{ background: isSelected ? option.color : 'var(--bg-input)', padding: '6px', borderRadius: '8px', display: 'flex', flexShrink: 0 }}>
                <Icon size={16} style={{ color: isSelected ? TimelineColor.WHITE : option.color }} />
              </div>
              <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                <span style={{ fontWeight: '700', color: isSelected ? option.color : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: option.hint ? 'nowrap' : undefined }}>
                  {option.label}
                </span>
                {option.hint && (
                  <span style={{ fontSize: '0.7rem', fontWeight: '600', color: 'var(--text-dim)' }}>{option.hint}</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
