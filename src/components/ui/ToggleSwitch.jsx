import React from 'react';

export default function ToggleSwitch({ checked, onChange, label, icon: Icon, accent = '#10b981', hint }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 14px', borderRadius: '10px',
      background: 'var(--bg-glass, rgba(255,255,255,0.03))',
      border: checked ? `1px solid ${accent}44` : '1px solid var(--border-glass)',
      marginBottom: '16px', transition: 'border-color 0.2s ease'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        {Icon && <Icon size={16} style={{ color: checked ? accent : 'var(--text-dim)', flexShrink: 0 }} />}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
          <span style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-main)' }}>{label}</span>
          {hint && <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>{hint}</span>}
        </div>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        style={{
          width: '44px', height: '24px', borderRadius: '9999px', flexShrink: 0,
          background: checked ? accent : 'rgba(148, 163, 184, 0.25)',
          border: 'none', cursor: 'pointer', position: 'relative',
          transition: 'background 0.2s ease', padding: 0
        }}
      >
        <span style={{
          display: 'block', width: '18px', height: '18px', borderRadius: '50%',
          background: '#ffffff', position: 'absolute', top: '3px',
          left: checked ? '22px' : '4px', transition: 'left 0.2s ease',
          boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
        }} />
      </button>
    </div>
  );
}
