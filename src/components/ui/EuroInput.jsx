import React from 'react';

export default function EuroInput({
  value, onChange, accent = '#10b981', min = '0', step = '0.01',
  label, placeholder = '0.00', readOnly = false, required = true,
  suffix = '€', marginBottom = '14px', fontSize = '1.05rem',
  background, labelExtra
}) {
  return (
    <div style={{ marginBottom }}>
      {(label || labelExtra) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
          {label ? (
            <label style={{
              display: 'block', fontSize: '0.78rem', fontWeight: '700',
              color: 'var(--text-main)'
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
          className="form-input"
          style={{
            width: '100%', padding: '10px 12px 10px 32px',
            borderRadius: '8px', fontSize, fontWeight: '800',
            color: accent, boxSizing: 'border-box',
            ...(background ? { background } : {})
          }}
        />
        <span style={{
          position: 'absolute', left: '12px', top: '50%',
          transform: 'translateY(-50%)', color: accent,
          fontWeight: '800', pointerEvents: 'none'
        }}>{suffix}</span>
      </div>
    </div>
  );
}
