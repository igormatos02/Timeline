import React, { useRef } from 'react';
import { Printer, Download, X } from 'lucide-react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';

export default function ReceiptModal({
  isOpen,
  onClose,
  htmlContent,
  title,
  onPrint,
  toolbar = null,
  emptyMessage = ''
}) {
  const { t } = useTranslation();
  const iframeRef = useRef(null);

  if (!isOpen) return null;

  const handlePrint = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.focus();
      iframeRef.current.contentWindow.print();
    }
    if (onPrint) {
      onPrint();
    }
  };

  const handleDownload = () => {
    if (!htmlContent) return;
    const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    if (win) {
      win.addEventListener('load', () => {
        setTimeout(() => {
          win.print();
        }, 300);
      });
    }
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '860px',
          height: '90vh',
          maxHeight: '920px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '14px',
          border: '1px solid var(--border-glass)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid var(--border-glass)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-glass)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                background: 'var(--primary-glow)',
                color: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Printer size={18} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '800', color: 'var(--text-main)' }}>
              {title || t('receipt.receiptTitle')}
            </h3>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleDownload}
              disabled={!htmlContent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <Download size={14} />
              <span>{t('receipt.download')}</span>
            </button>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handlePrint}
              disabled={!htmlContent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} />
              <span>{t('receipt.print')}</span>
            </button>

            <button
              type="button"
              className="action-icon-btn"
              onClick={onClose}
              title={t('receipt.close')}
              style={{
                marginLeft: '6px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-dim)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
              }}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Optional toolbar (e.g. period filters) */}
        {toolbar && (
          <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border-glass)' }}>
            {toolbar}
          </div>
        )}

        {/* Iframe Preview Container */}
        {htmlContent ? (
          <div style={{ flex: 1, position: 'relative', background: TimelineColor.WHITE }}>
            <iframe
              ref={iframeRef}
              srcDoc={htmlContent}
              title={title || t('receipt.receiptTitle')}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
                background: TimelineColor.WHITE
              }}
            />
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
            {emptyMessage}
          </div>
        )}
      </div>
    </div>
  );
}
