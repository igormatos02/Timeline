import React, { useRef, useState } from 'react';
import { Printer, Download, X, Calendar, ChevronDown, Check } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import DueDatePicker from '../ui/DueDatePicker.jsx';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { TimelineColor } from '../../enums/index.js';

export default function ReceiptModal({
  isOpen,
  onClose,
  htmlContent,
  title,
  onPrint,
  toolbar = null,
  emptyMessage = '',
  date = null,
  onDateChange,
  onSaveDate,
  receiptNumber = null,
  canEditReceiptNumber = false,
  onSaveReceiptNumber
}) {
  const { t, dateLocale } = useTranslation();
  const iframeRef = useRef(null);
  // Receipt date (shown as a label in the header; clicking it opens the Year | Month | Day picker)
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const hasDatePicker = Boolean(date && onDateChange);
  // Receipt number: editable (and saved without advancing the timeline counter) until printed
  const [numberDraft, setNumberDraft] = useState(receiptNumber != null ? String(receiptNumber) : '');
  const [numberError, setNumberError] = useState('');
  const [isSavingNumber, setIsSavingNumber] = useState(false);
  const hasReceiptNumber = receiptNumber != null && Boolean(onSaveReceiptNumber);

  const handleSaveNumber = async () => {
    setIsSavingNumber(true);
    const result = await onSaveReceiptNumber(String(numberDraft).trim());
    setIsSavingNumber(false);
    setNumberError(result?.error || '');
  };

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

        {/* Payment date row (below the header, separated by a divider) */}
        {hasDatePicker && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 20px',
              borderBottom: '1px solid var(--border-glass)',
              background: 'var(--bg-glass)'
            }}
          >
            {hasReceiptNumber && (
              <>
                <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  {t('receipt.numberLabel')}
                </span>
                {canEditReceiptNumber ? (
                  <>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={numberDraft}
                      aria-label={t('receipt.numberLabel')}
                      title={t('receipt.numberEditableHint')}
                      onChange={(e) => { setNumberDraft(e.target.value); setNumberError(''); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' && String(numberDraft).trim()) handleSaveNumber(); }}
                      style={{
                        width: '110px',
                        padding: '4px 8px',
                        borderRadius: '8px',
                        border: `1px solid ${numberError ? TimelineColor.DANGER : 'var(--border-glass)'}`,
                        background: 'var(--bg-card)',
                        color: 'var(--text-main)',
                        fontSize: '0.8rem',
                        fontWeight: '700'
                      }}
                    />
                    {/* Small OK button, always available: saves the automatic proposal or a custom number */}
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      disabled={isSavingNumber || !String(numberDraft).trim()}
                      onClick={handleSaveNumber}
                      title={t('common.save')}
                      aria-label={t('common.save')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', padding: '3px 8px', fontSize: '0.74rem' }}
                    >
                      <Check size={12} />
                      <span>{t('receipt.ok')}</span>
                    </button>
                  </>
                ) : (
                  <strong style={{ fontSize: '0.82rem', color: 'var(--text-main)' }}>{receiptNumber}</strong>
                )}
                <span style={{ width: '1px', height: '18px', background: 'var(--border-glass)', margin: '0 4px' }} />
              </>
            )}
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)' }}>
              {t('receipt.paymentDateLabel')}
            </span>
            <button
              type="button"
              aria-expanded={isDatePickerOpen}
              title={t('receipt.dateLabel')}
              onClick={() => setIsDatePickerOpen((open) => !open)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 10px',
                borderRadius: '9999px',
                border: `1px solid ${isDatePickerOpen ? 'var(--primary)' : 'var(--border-glass)'}`,
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '0.8rem',
                fontWeight: '700',
                cursor: 'pointer'
              }}
            >
              <Calendar size={14} style={{ color: 'var(--primary-light)' }} />
              <span>{format(parseISO(date), 'PPP', { locale: dateLocale })}</span>
              <ChevronDown size={13} style={{ color: 'var(--text-muted)', transform: isDatePickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {numberError && (
              <span role="alert" style={{ fontSize: '0.76rem', fontWeight: '600', color: TimelineColor.DANGER, marginLeft: '4px' }}>
                {numberError}
              </span>
            )}
          </div>
        )}

        {/* Receipt date picker (defaults to the event date) */}
        {hasDatePicker && isDatePickerOpen && (
          <div style={{ padding: '12px 20px 0', borderBottom: '1px solid var(--border-glass)' }}>
            <DueDatePicker
              date={format(parseISO(date), 'yyyy-MM-01')}
              day={parseISO(date).getDate()}
              dayLabel={t('modal.day')}
              onChange={({ date: monthDate, day }) => {
                onDateChange(`${monthDate.substring(0, 8)}${String(day).padStart(2, '0')}`);
              }}
            />
            {onSaveDate && (
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    await onSaveDate(date);
                    setIsDatePickerOpen(false);
                  }}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}
                >
                  <Check size={14} />
                  <span>{t('common.save')}</span>
                </button>
              </div>
            )}
          </div>
        )}

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
