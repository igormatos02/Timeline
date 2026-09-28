import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { RECEIPT_NUMBER_POPOVER_WIDTH } from './cardUtils.js';
import { createPortal } from 'react-dom';
import { Check } from 'lucide-react';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function ReceiptNumberEditor() {
  const {
    isReceiptNumberOpen,
    isSavingReceiptNumber,
    receiptNumberDraft,
    receiptNumberError,
    receiptNumberPopoverRef,
    receiptNumberPos,
    saveReceiptNumberDraft,
    setReceiptNumberDraft,
    setReceiptNumberError,
    t
  } = useEventCard();

  if (!isReceiptNumberOpen || !receiptNumberPos) return null;
  const smallButtonStyle = { padding: '3px 10px', fontSize: '0.7rem', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' };
  return createPortal(
    <div
      ref={receiptNumberPopoverRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: receiptNumberPos.top,
        left: receiptNumberPos.left,
        zIndex: 1000,
        width: `${RECEIPT_NUMBER_POPOVER_WIDTH}px`,
        padding: '8px',
        borderRadius: '10px',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      <label style={{ fontSize: '0.64rem', fontWeight: '700', color: 'var(--text-muted)' }}>
        {t('receipt.numberLabel')}
      </label>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          type="number"
          min="1"
          step="1"
          autoFocus
          onFocus={(e) => e.target.select()}
          value={receiptNumberDraft}
          onChange={(e) => {
            setReceiptNumberDraft(e.target.value);
            setReceiptNumberError('');
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') saveReceiptNumberDraft();
          }}
          style={{
            flex: 1,
            minWidth: 0,
            padding: '4px 8px',
            borderRadius: '6px',
            border: `1px solid ${receiptNumberError ? 'var(--danger)' : 'var(--border-glass)'}`,
            background: 'var(--bg-glass)',
            color: 'var(--text-main)',
            fontSize: '0.78rem',
            fontWeight: '700'
          }}
        />
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isSavingReceiptNumber || !receiptNumberDraft}
          onClick={saveReceiptNumberDraft}
          style={smallButtonStyle}
        >
          <Check size={11} />
          <span>{t('common.save')}</span>
        </button>
      </div>
      {receiptNumberError && (
        <span role="alert" style={{ fontSize: '0.66rem', color: 'var(--danger)', fontWeight: '600' }}>
          {receiptNumberError}
        </span>
      )}
    </div>,
    document.body
  );
  }
