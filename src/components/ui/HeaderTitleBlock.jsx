import React from 'react';
import CopyIdButton from './CopyIdButton.jsx';

export default function HeaderTitleBlock({
  name,
  description,
  id
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
          <span>{name}</span>
          {id && <CopyIdButton id={id} />}
        </h1>
      </div>
      {description && (
        <p
          style={{
            margin: '2px 0 0',
            fontSize: '0.78rem',
            color: 'var(--text-muted)'
          }}
        >
          {description}
        </p>
      )}
    </div>
  );
}