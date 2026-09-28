import React from 'react';
import { TimelineColor } from '../enums/index.js';

// Extracted from App.jsx (App).
export default function SystemLoadingOverlay() {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: 'var(--overlay-backdrop)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        color: TimelineColor.WHITE
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          border: `3px solid ${TimelineColor.PRIMARY}33`,
          borderTopColor: TimelineColor.PRIMARY,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }}
      />
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
      <div style={{ textAlign: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 4px 0', color: 'var(--text-main)' }}>
          System Loading...
        </h3>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', margin: 0 }}>
          Sincronizando eventos e status do mês corrente
        </p>
      </div>
    </div>
  );
}
