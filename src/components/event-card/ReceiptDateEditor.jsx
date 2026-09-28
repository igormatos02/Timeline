import React from 'react';
import { useEventCard } from './EventCardContext.jsx';
import { RECEIPT_DATE_POPOVER_WIDTH } from './cardUtils.js';
import { format, parseISO } from 'date-fns';
import { createPortal } from 'react-dom';
import DueDatePicker from '../ui/DueDatePicker.jsx';
import { Check } from 'lucide-react';

// Section of the event card (TimelineEventCard.jsx): reads the card values from EventCardContext.
export default function ReceiptDateEditor() {
  const {
    isReceiptDateOpen,
    isSavingReceiptDate,
    paletteTheme,
    receiptDateDraft,
    receiptDatePopoverRef,
    receiptDatePos,
    saveReceiptDateDraft,
    setIsReceiptDateOpen,
    setReceiptDateDraft,
    t
  } = useEventCard();

  if (!isReceiptDateOpen || !receiptDateDraft || !receiptDatePos) return null;
  const draftObj = parseISO(receiptDateDraft);
  const smallButtonStyle = { padding: '3px 10px', fontSize: '0.7rem', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' };
  return createPortal(
    <div
      ref={receiptDatePopoverRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        top: receiptDatePos.top,
        left: receiptDatePos.left,
        zIndex: 1000,
        width: `${RECEIPT_DATE_POPOVER_WIDTH}px`,
        padding: '8px 8px 0',
        borderRadius: '10px',
        border: '1px solid var(--border-glass)',
        background: 'var(--bg-card)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      <DueDatePicker
        compact
        date={format(draftObj, 'yyyy-MM-01')}
        day={draftObj.getDate()}
        dayLabel={t('modal.day')}
        accent={paletteTheme.primary}
        onChange={({ date: monthDate, day }) => setReceiptDateDraft(`${monthDate.substring(0, 8)}${String(day).padStart(2, '0')}`)}
      />
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '8px' }}>
        <button type="button" className="btn btn-secondary btn-sm" style={smallButtonStyle} onClick={() => setIsReceiptDateOpen(false)}>
          {t('common.cancel')}
        </button>
        <button
          type="button"
          className="btn btn-primary btn-sm"
          disabled={isSavingReceiptDate}
          onClick={saveReceiptDateDraft}
          style={smallButtonStyle}
        >
          <Check size={11} />
          <span>{t('common.save')}</span>
        </button>
      </div>
    </div>,
    document.body
  );
  }
