import React, { useState } from 'react';
import { Compass, ChevronDown } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency.js';
import styles from './MobileApp.module.css';

/**
 * Admin view of the mobile app: "where is my money" of the timeboard (GET /api/me/summary), collapsed by default.
 * Same answers and rules as the web balance (shared/finance/moneySummary.js).
 */
export default function MobileMoneySummary({ summary, t }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!summary) return null;

  const rows = [
    ['available', summary.available],
    ['savings', summary.savingsTotal],
    ['received', summary.received],
    ['expected', summary.expectedToReceive],
    ['spent', summary.spentFromAvailable + summary.spentViaSavings],
    ['transferred', summary.transferred],
    ['withdrawn', summary.withdrawn],
    ['putIntoSavings', summary.putIntoSavingsInternal + summary.putIntoSavingsExternal],
    ['loanPaid', summary.loanPaid],
    ['amortized', summary.amortized],
    ['owed', summary.owed]
  ];

  return (
    <div className={styles.card}>
      <button type="button" className={styles.summaryToggle} onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen}>
        <span className={styles.summaryTitle}>
          <Compass size={16} />
          {t('moneySummary.title')}
        </span>
        <span className={styles.summaryWealth}>
          {formatCurrency(summary.wealth)}
          <ChevronDown size={16} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.18s ease' }} />
        </span>
      </button>
      {isOpen && (
        <div className={styles.summaryRows}>
          {rows.map(([key, value]) => (
            <div key={key} className={styles.summaryRow}>
              <span>{t(`moneySummary.${key}`)}</span>
              <strong>{formatCurrency(value)}</strong>
            </div>
          ))}
          {summary.spaces.map((space) => (
            <div key={space.id} className={`${styles.summaryRow} ${styles.summarySubRow}`}>
              <span>{space.isGeneral ? t('account.general') : space.name}</span>
              <strong>{formatCurrency(space.balance)}</strong>
            </div>
          ))}
          <div className={`${styles.summaryRow} ${styles.summaryTotalRow}`}>
            <span>{t('moneySummary.wealth')}</span>
            <strong>{formatCurrency(summary.wealth)}</strong>
          </div>
        </div>
      )}
    </div>
  );
}
