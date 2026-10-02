import React from 'react';
import { X } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';

export default function ModalShell({
  isOpen, onClose, onSubmit, accent = TimelineColor.EMERALD, maxWidth = '680px', minHeight,
  icon: Icon, title, subtitle, children, footer,
  overflowY = true, showBorderGlow = true,
  headerBanner, headerBg
}) {
  if (!isOpen) return null;

  const content = (
    <>
      {headerBanner ? (
        <div
          style={{
            margin: '-24px -24px 14px -24px',
            backgroundColor: headerBg || 'transparent',
            borderBottom: '1px solid var(--border-glass)',
            borderRadius: '16px 16px 0 0',
            overflow: 'hidden',
            transition: 'background-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          {/* 🌟 PARTE 1 (SUPERIOR): Título, Caixa e Botão Fechar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 24px 10px 24px',
              background: 'transparent',
              borderBottom: '1px solid var(--border-glass)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              {Icon && (
                <div style={{
                  background: `${accent}22`, color: accent, padding: '7px',
                  borderRadius: '9px', display: 'flex', alignItems: 'center'
                }}>
                  <Icon size={18} />
                </div>
              )}
              <div>
                <h3 style={{
                  margin: 0, fontSize: '1.12rem', fontWeight: '800',
                  color: 'var(--text-main)', letterSpacing: '-0.01em'
                }}>{title}</h3>
                {subtitle && (
                  <div style={{
                    fontSize: '0.74rem', color: accent, fontWeight: '700'
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
                color: 'var(--text-dim)', cursor: 'pointer',
                borderRadius: '6px', padding: '5px', display: 'flex', alignItems: 'center',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.background = 'var(--bg-glass)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-dim)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <X size={18} />
            </button>
          </div>

          {/* 🌟 PARTE 2 (INFERIOR): Animação de Fluxo */}
          <div style={{ padding: '6px 20px 8px 20px' }}>
            {headerBanner}
          </div>
        </div>
      ) : (
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
      )}

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
          ...(minHeight ? { minHeight } : {}),
          ...(overflowY ? { maxHeight: '90vh', overflowY: 'auto' } : {}),
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: `1px solid ${accent}55`,
          boxShadow: showBorderGlow
            ? `0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${accent}22`
            : '0 24px 60px rgba(0, 0, 0, 0.85)',
          transition: 'border-color 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          padding: '24px', boxSizing: 'border-box'
        }}
      >
        {inner}
      </div>
    </div>
  );
}