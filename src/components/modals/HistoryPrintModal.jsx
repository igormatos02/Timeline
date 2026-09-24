import React, { useState } from 'react';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { HistoryPeriod } from '../../enums/index.js';
import ReceiptModal from './ReceiptModal.jsx';

const PERIOD_OPTIONS = [
  HistoryPeriod.LAST_6_MONTHS,
  HistoryPeriod.LAST_YEAR,
  HistoryPeriod.LAST_2_YEARS,
  HistoryPeriod.LAST_5_YEARS
];

/**
 * Print popup for the movement history of an entity.
 * The user picks a period and clicks Apply; `buildHtml(period)` returns the document to preview/print.
 */
export default function HistoryPrintModal({ isOpen, onClose, buildHtml }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState(HistoryPeriod.LAST_6_MONTHS);
  const [htmlContent, setHtmlContent] = useState('');

  if (!isOpen) return null;

  const handleApply = () => {
    setHtmlContent(buildHtml(period));
  };

  const toolbar = (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {t('history.periodLabel')}
      </span>
      <div
        role="group"
        aria-label={t('history.periodLabel')}
        style={{ display: 'inline-flex', flexWrap: 'wrap', gap: '4px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '3px' }}
      >
        {PERIOD_OPTIONS.map((opt) => {
          const isActive = period === opt;
          return (
            <button
              key={opt}
              type="button"
              aria-pressed={isActive}
              onClick={() => setPeriod(opt)}
              style={{
                padding: '5px 10px',
                borderRadius: '7px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600,
                background: isActive ? 'var(--primary)' : 'transparent',
                color: isActive ? 'var(--text-white)' : 'var(--text-muted)'
              }}
            >
              {t(`history.periods.${opt}`)}
            </button>
          );
        })}
      </div>
      <button type="button" className="btn btn-primary btn-sm" onClick={handleApply}>
        {t('history.apply')}
      </button>
    </div>
  );

  return (
    <ReceiptModal
      isOpen={isOpen}
      onClose={onClose}
      htmlContent={htmlContent}
      title={t('history.title')}
      toolbar={toolbar}
      emptyMessage={t('history.choosePeriod')}
    />
  );
}
