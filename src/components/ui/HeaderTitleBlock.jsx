import React from 'react';
import CopyIdButton from './CopyIdButton.jsx';

export default function HeaderTitleBlock({
  color,
  icon,
  name,
  badge,
  badgeTextTransform = 'uppercase',
  iconBackground,
  badgeBackground,
  description,
  id,
  idLabel = 'ID: '
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
      <div
        style={{
          width: '34px',
          height: '34px',
          borderRadius: '10px',
          background: iconBackground || `${color}22`,
          color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${color}33`,
          flexShrink: 0
        }}
      >
        {icon}
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
            {name}
          </h1>
          {badge && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: '700',
                padding: '2px 8px',
                borderRadius: '12px',
                background: badgeBackground || `${color}18`,
                color,
                border: `1px solid ${color}44`,

                textTransform: badgeTextTransform
              }}
            >
              {badge}
            </span>
          )}
        </div>
        <p
          style={{
            margin: '2px 0 0',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          {description && <span>{description}</span>}
          {id && (
            <span
              style={{
                fontSize: '0.68rem',
                padding: '1px 6px',
                borderRadius: '4px',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-glass)',
                color: 'var(--text-dim)',
                fontFamily: 'monospace',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span style={{ userSelect: 'all' }}>{idLabel}{id}</span>
              <CopyIdButton id={id} />
            </span>
          )}
        </p>
      </div>
    </div>
  );
}