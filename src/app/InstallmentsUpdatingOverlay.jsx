import React from 'react';
import { TimelineColor } from '../enums/index.js';

// Extracted from App.jsx (App).
export default function InstallmentsUpdatingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--overlay-backdrop)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        color: TimelineColor.WHITE
      }}
    >
      <div
        style={{
          width: '52px',
          height: '52px',
          border: `4px solid ${TimelineColor.PRIMARY}40`,
          borderTopColor: TimelineColor.PRIMARY,
          borderRadius: '50%',
          animation: 'spin 0.75s linear infinite'
        }}
      />
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: '700', margin: '0 0 6px 0', color: 'var(--text-main)' }}>
          Atualizando Prestações...
        </h3>
        <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)', margin: 0 }}>
          Por favor aguarde, a sincronizar o novo plano de amortização e impostos.
        </p>
      </div>
    </div>
  );
}
