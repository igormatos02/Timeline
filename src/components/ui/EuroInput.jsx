import React from 'react';
import { Scissors } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';

export default function EuroInput({
  value, onChange, accent = TimelineColor.EMERALD, min = '0', step = '0.01',
  label, placeholder = '0.00', readOnly = false, required = true,
  suffix = '€', marginBottom = '0', fontSize = '0.94rem',
  background, labelExtra,
  onBreakdownToggle, isBreakdownActive = false, breakdownCount = 0, breakdownTitle
}) {
  return (
    <div style={{ marginBottom }}>
      {(label || labelExtra) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          {label ? (
            <label style={{
              display: 'block',
              fontSize: '0.8rem',
              fontWeight: '600',
              color: 'var(--text-muted)'
            }}>{label}</label>
          ) : <span />}
          {labelExtra}
        </div>
      )}
      <div style={{ position: 'relative' }}>
        <input
          type="number"
          step={step}
          min={min}
          required={required}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          readOnly={readOnly}
          className="form-input euro-input-field"
          style={{
            width: '100%',
            height: '42px',
            padding: onBreakdownToggle
              ? (breakdownCount > 0 ? '0 52px 0 32px' : '0 42px 0 32px')
              : '0 12px 0 32px',
            borderRadius: '8px',
            fontSize,
            fontWeight: '800',
            color: accent,
            boxSizing: 'border-box',
            cursor: readOnly ? 'default' : 'text',
            display: 'flex',
            alignItems: 'center',
            ...(background ? { background } : {})
          }}
        />
        <span style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: accent,
          fontWeight: '800', pointerEvents: 'none'
        }}>{suffix}</span>

        {onBreakdownToggle && (
          <button
            type="button"
            onClick={onBreakdownToggle}
            title={breakdownTitle}
            aria-label={breakdownTitle}
            style={{
              position: 'absolute',
              right: '6px',
              top: '50%',
              transform: 'translateY(-50%)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              padding: '5px 7px',
              borderRadius: '6px',
              background: isBreakdownActive ? `${accent}2b` : 'var(--bg-card)',
              border: isBreakdownActive ? `1px solid ${accent}` : '1px solid var(--border-glass)',
              color: isBreakdownActive ? accent : 'var(--text-muted)',
              cursor: 'pointer',
              fontSize: '0.72rem',
              fontWeight: '700',
              transition: 'all 0.15s ease'
            }}
          >
            <Scissors size={13} style={{ transform: 'rotate(-45deg)' }} />
            {breakdownCount > 0 && <span>{breakdownCount}</span>}
          </button>
        )}
      </div>
    </div>
  );
}
