import React, { useState } from 'react';
import { Sparkles, DollarSign, TrendingDown, PiggyBank, Landmark, Scale, ChevronDown, CheckCircle2 } from 'lucide-react';
import { formatCurrency as defaultFormatCurrency } from '../utils/formatCurrency.js';
import { TimelineColor } from '../../shared/enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

/**
 * MonthProjectionBadges
 * Renders the unified monthly projection / realized bar (+Entradas, -Saídas, Investimentos, Empréstimos, Balance/Saldo)
 * across financial views with a dropdown to toggle between "Month Projection" and "Real Projection".
 */
export default function MonthProjectionBadges({
  income,
  expense,
  investment,
  investmentInternal,
  investmentExternal,
  loan,
  saldo,
  monthProjectedIncome,
  monthProjectedExpense,
  monthProjectedInvestment,
  monthProjectedInvestmentInternal,
  monthProjectedInvestmentExternal,
  monthProjectedInvestmentDeduction,
  monthProjectedLoan,
  monthProjectedSaldo,
  monthRealizedIncome,
  monthRealizedExpense,
  monthRealizedInvestment,
  monthRealizedInvestmentInternal,
  monthRealizedInvestmentExternal,
  monthRealizedInvestmentDeduction,
  monthRealizedLoan,
  monthRealizedSaldo,
  projectionMode = 'projected',
  onToggleProjectionMode,
  hasIncomeTimeline,
  hasExpenseTimeline,
  hasInvestmentTimeline,
  hasLoanTimeline,
  isFutureMonth = false,
  isNotComputedMonth = false,
  showIncome = true,
  showExpense = true,
  showInvestment = true,
  showLoan = true,
  showBalance = true,
  formatCurrency = defaultFormatCurrency,
  t: propT
}) {
  const { t: contextT } = useTranslation();
  const t = propT || contextT;

  const [localMode, setLocalMode] = useState('projected');
  const currentMode = onToggleProjectionMode ? projectionMode : localMode;
  const handleModeChange = (newMode) => {
    if (onToggleProjectionMode) {
      onToggleProjectionMode(newMode);
    } else {
      setLocalMode(newMode);
    }
  };

  const isRealizedMode = currentMode === 'realized';

  // Values based on active mode
  const actualIncome = isRealizedMode
    ? (monthRealizedIncome !== undefined ? monthRealizedIncome : 0)
    : (monthProjectedIncome !== undefined ? monthProjectedIncome : (income || 0));

  const actualExpense = isRealizedMode
    ? (monthRealizedExpense !== undefined ? monthRealizedExpense : 0)
    : (monthProjectedExpense !== undefined ? monthProjectedExpense : (expense || 0));

  const actualInvestmentInternal = isRealizedMode
    ? (monthRealizedInvestmentInternal !== undefined
      ? monthRealizedInvestmentInternal
      : (monthRealizedInvestmentDeduction !== undefined ? monthRealizedInvestmentDeduction : 0))
    : (monthProjectedInvestmentInternal !== undefined
      ? monthProjectedInvestmentInternal
      : (monthProjectedInvestmentDeduction !== undefined ? monthProjectedInvestmentDeduction : (investmentInternal || 0)));

  const actualInvestmentExternal = isRealizedMode
    ? (monthRealizedInvestmentExternal !== undefined ? monthRealizedInvestmentExternal : 0)
    : (monthProjectedInvestmentExternal !== undefined ? monthProjectedInvestmentExternal : (investmentExternal || 0));

  const actualInvestmentTotal = isRealizedMode
    ? (monthRealizedInvestment !== undefined ? monthRealizedInvestment : (actualInvestmentInternal + actualInvestmentExternal))
    : (monthProjectedInvestment !== undefined
      ? monthProjectedInvestment
      : (investment !== undefined ? investment : (actualInvestmentInternal + actualInvestmentExternal)));

  const actualLoan = isRealizedMode
    ? (monthRealizedLoan !== undefined ? monthRealizedLoan : 0)
    : (monthProjectedLoan !== undefined ? monthProjectedLoan : (loan || 0));

  const actualSaldo = isRealizedMode
    ? (monthRealizedSaldo !== undefined ? monthRealizedSaldo : null)
    : (monthProjectedSaldo !== undefined ? monthProjectedSaldo : saldo);

  const actualShowIncome = hasIncomeTimeline !== undefined ? hasIncomeTimeline : showIncome;
  const actualShowExpense = hasExpenseTimeline !== undefined ? hasExpenseTimeline : showExpense;
  const actualShowInvestment = hasInvestmentTimeline !== undefined ? hasInvestmentTimeline : showInvestment;
  const actualShowLoan = hasLoanTimeline !== undefined ? hasLoanTimeline : showLoan;

  const hasAnyBadge = actualShowIncome || actualShowExpense || actualShowInvestment || actualShowLoan || showBalance;
  if (!hasAnyBadge) return null;

  const numIncome = Math.abs(Number(actualIncome || 0));
  const numExpense = Math.abs(Number(actualExpense || 0));
  const numInvestmentInternal = Math.abs(Number(actualInvestmentInternal || 0));
  const numInvestmentExternal = Math.abs(Number(actualInvestmentExternal || 0));
  const numInvestmentTotal = Math.abs(Number(actualInvestmentTotal || 0));
  const numLoan = Math.abs(Number(actualLoan || 0));

  const calculatedSaldo = actualSaldo !== null && actualSaldo !== undefined
    ? Number(actualSaldo)
    : (numIncome - (numExpense + numInvestmentInternal + numLoan));

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%', opacity: isNotComputedMonth ? 0.82 : 1 }}>
      {/* 🏷️ Dropdown Seletor: Month Projection vs Real Projection */}
      <div
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          marginRight: '2px'
        }}
      >
        <select
          value={currentMode}
          onChange={(e) => handleModeChange(e.target.value)}
          aria-label={t('timeline.selectProjectionMode')}
          style={{
            appearance: 'none',
            WebkitAppearance: 'none',
            MozAppearance: 'none',
            background: isRealizedMode ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
            border: `1px solid ${isRealizedMode ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-glass)'}`,
            borderRadius: '6px',
            padding: '2px 22px 2px 24px',
            fontSize: '0.72rem',
            fontWeight: '700',
            color: isRealizedMode
              ? TimelineColor.INCOME
              : (isNotComputedMonth || isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)'),
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            cursor: 'pointer',
            outline: 'none',
            height: '24px',
            lineHeight: '20px',
            transition: 'all 0.15s ease'
          }}
          title={t('timeline.selectProjectionMode')}
        >
          <option value="projected" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
            {t('timeline.monthProjection')}
          </option>
          <option value="realized" style={{ background: 'var(--bg-card)', color: 'var(--text-main)' }}>
            {t('timeline.realProjection')}
          </option>
        </select>
        {isRealizedMode ? (
          <CheckCircle2
            size={12}
            style={{
              position: 'absolute',
              left: '7px',
              pointerEvents: 'none',
              color: TimelineColor.INCOME
            }}
          />
        ) : (
          <Sparkles
            size={12}
            style={{
              position: 'absolute',
              left: '7px',
              pointerEvents: 'none',
              color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)'
            }}
          />
        )}
        <ChevronDown
          size={12}
          style={{
            position: 'absolute',
            right: '6px',
            pointerEvents: 'none',
            color: isRealizedMode ? TimelineColor.INCOME : 'var(--text-dim)'
          }}
        />
      </div>

      {/* 1. Entradas */}
      {showIncome && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: isFutureMonth
              ? 'var(--text-dim)'
              : (numIncome > 0 ? TimelineColor.INCOME : 'var(--text-dim)'),
            fontWeight: '800',
            fontSize: '0.76rem'
          }}
          title={isRealizedMode ? t('timeline.monthRealizedIncomeTitle') : t('timeline.monthIncomeTitle')}
        >
          <DollarSign size={12} />
          <span>+{formatCurrency(numIncome)}</span>
        </span>
      )}

      {/* 2. Gastos */}
      {showExpense && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: isFutureMonth
              ? 'var(--text-dim)'
              : (numExpense > 0 ? TimelineColor.EXPENSE : 'var(--text-dim)'),
            fontWeight: '800',
            fontSize: '0.76rem'
          }}
          title={isRealizedMode ? t('timeline.monthRealizedExpenseTitle') : t('timeline.monthExpenseTitle')}
        >
          <TrendingDown size={12} />
          <span>-{formatCurrency(numExpense)}</span>
        </span>
      )}

      {/* 3. Investimentos */}
      {showInvestment && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'transparent',
            border: 'none',
            color: isFutureMonth
              ? 'var(--text-dim)'
              : (numInvestmentTotal > 0 || numInvestmentInternal > 0 || numInvestmentExternal > 0 ? TimelineColor.INVESTMENT : 'var(--text-dim)'),
            fontWeight: '800',
            fontSize: '0.76rem'
          }}
          title={isRealizedMode ? t('timeline.monthRealizedInvestmentTitle') : t('timeline.monthInvestmentTitle')}
        >
          <PiggyBank size={12} />
          <span>
            {formatCurrency(numInvestmentExternal > 0 ? numInvestmentInternal : (numInvestmentTotal > 0 ? numInvestmentTotal : numInvestmentInternal))}
          </span>
          {numInvestmentExternal > 0 && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                fontWeight: '700',
                color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)',
                opacity: 0.95
              }}
              title={t('modal.isExternalDepositHint')}
            >
              <span>+</span>
              <span>{formatCurrency(numInvestmentExternal)}</span>
              <span style={{ fontSize: '0.70rem', fontWeight: '600', textTransform: 'lowercase' }}>
                {t('timeline.externalDeposits')}
              </span>
            </span>
          )}
        </span>
      )}

      {/* 4. Empréstimos */}
      {showLoan && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: isFutureMonth
              ? 'var(--text-dim)'
              : (numLoan > 0 ? TimelineColor.LOAN : 'var(--text-dim)'),
            fontWeight: '800',
            fontSize: '0.76rem'
          }}
          title={isRealizedMode ? t('timeline.monthRealizedLoanTitle') : t('timeline.monthLoanTitle')}
        >
          <Landmark size={12} />
          <span>{formatCurrency(numLoan)}</span>
        </span>
      )}

      {/* 5. Saldo Líquido */}
      {showBalance && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            marginLeft: 'auto',
            padding: '2px 8px',
            borderRadius: '6px',
            background: calculatedSaldo >= 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)',
            border: 'none',
            color: calculatedSaldo >= 0 ? TimelineColor.INCOME : TimelineColor.EXPENSE,
            fontWeight: '800',
            fontSize: '0.76rem'
          }}
          title={isRealizedMode ? t('timeline.monthRealizedBalanceTitle') : t('timeline.monthBalanceTitle')}
        >
          <Scale size={12} />
          <span>{t('timeline.balance')}: {calculatedSaldo >= 0 ? '+' : ''}{formatCurrency(calculatedSaldo)}</span>
        </span>
      )}
    </div>
  );
}
