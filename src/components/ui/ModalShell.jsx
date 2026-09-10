import React from 'react';
import { X } from 'lucide-react';

export default function ModalShell({
  isOpen, onClose, onSubmit, accent = '#10b981', maxWidth = '680px',
  icon: Icon, title, subtitle, children, footer,
  overflowY = true, showBorderGlow = true
}) {
  if (!isOpen) return null;

  const content = (
    <>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {Icon && (
            <div style={{
              background: `${accent}22`, color: accent, padding: '8px',
              borderRadius: '10px', display: 'flex', alignItems: 'center'
            }}>
              <Icon size={20} />
            </div>
          )}
          <div>
            <h3 style={{
              margin: 0, fontSize: '1.2rem', fontWeight: '800',
              color: 'var(--text-main)'
            }}>{title}</h3>
            {subtitle && (
              <div style={{
                fontSize: '0.76rem', color: accent, fontWeight: '700'
              }}>{subtitle}</div>
            )}
          </div>
        </div>
        <button
          type="button"
          className="action-icon-btn"
          onClick={onClose}
          aria-label="Fechar"
          style={{
            background: 'transparent', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>
      </div>

      {children}

      {footer && (
        <div style={{
          display: 'flex', justifyContent: 'flex-end', gap: '10px',
          marginTop: '20px', borderTop: '1px solid var(--border-glass)',
          paddingTop: '16px'
        }}>
          {footer}
        </div>
      )}
    </>
  );

  const inner = onSubmit ? <form onSubmit={onSubmit}>{content}</form> : content;

  return (
    <div
      className="modal-overlay"
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 9999, padding: '16px', boxSizing: 'border-box'
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth, width: '100%',
          ...(overflowY ? { maxHeight: '90vh', overflowY: 'auto' } : {}),
          background: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: `1px solid ${accent}55`,
          boxShadow: showBorderGlow
            ? `0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${accent}22`
            : '0 24px 60px rgba(0, 0, 0, 0.85)',
          padding: '24px', boxSizing: 'border-box'
        }}
      >
        {inner}
      </div>
    </div>
  );
}