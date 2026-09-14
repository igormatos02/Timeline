import React from 'react';
import { Sparkles, DollarSign, TrendingDown, PiggyBank, Landmark, Scale } from 'lucide-react';
import { formatCurrency as defaultFormatCurrency } from '../utils/formatCurrency.js';
import { TimelineColor } from '../../shared/enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

/**
 * MonthProjectionBadges
 * Renders the unified monthly projection bar (+Entradas, -Saídas, Investimentos, Empréstimos, Balance/Saldo)
 * across financial views, conditionally showing only the badges for timeline types that exist in the active timeboard.
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
  hasIncomeTimeline,
  hasExpenseTimeline,
  hasInvestmentTimeline,
  hasLoanTimeline,
  isFutureMonth = false,
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
  const actualIncome = monthProjectedIncome !== undefined ? monthProjectedIncome : (income || 0);
  const actualExpense = monthProjectedExpense !== undefined ? monthProjectedExpense : (expense || 0);
  const actualInvestmentInternal = monthProjectedInvestmentInternal !== undefined
    ? monthProjectedInvestmentInternal
    : (monthProjectedInvestmentDeduction !== undefined ? monthProjectedInvestmentDeduction : (investmentInternal || 0));
  const actualInvestmentExternal = monthProjectedInvestmentExternal !== undefined
    ? monthProjectedInvestmentExternal
    : (investmentExternal || 0);
  const actualInvestmentTotal = monthProjectedInvestment !== undefined
    ? monthProjectedInvestment
    : (investment !== undefined ? investment : (actualInvestmentInternal + actualInvestmentExternal));
  const actualLoan = monthProjectedLoan !== undefined ? monthProjectedLoan : (loan || 0);
  const actualSaldo = monthProjectedSaldo !== undefined ? monthProjectedSaldo : saldo;

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
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
      {/* 🏷️ Indicador Projeção do Mês */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          fontSize: '0.72rem',
          fontWeight: '700',
          color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          marginRight: '2px'
        }}
      >
        <Sparkles size={12} style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)' }} />
        <span>{t('timeline.monthProjection')}</span>
      </span>

      {/* 1. Entradas Projetadas */}
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
          title={t('timeline.monthIncomeTitle')}
        >
          <DollarSign size={12} />
          <span>+{formatCurrency(numIncome)}</span>
        </span>
      )}

      {/* 2. Gasto Projetado */}
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
          title={t('timeline.monthExpenseTitle')}
        >
          <TrendingDown size={12} />
          <span>-{formatCurrency(numExpense)}</span>
        </span>
      )}

      {/* 3. Investimento Projetado (Separado: Interno + Depósitos Externos) */}
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
          title={t('timeline.monthInvestmentTitle')}
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

      {/* 4. Total em Empréstimos a Pagar */}
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
          title={t('timeline.monthLoanTitle')}
        >
          <Landmark size={12} />
          <span>{formatCurrency(numLoan)}</span>
        </span>
      )}

      {/* 5. Saldo Líquido Projetado */}
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
          title={t('timeline.monthBalanceTitle')}
        >
          <Scale size={12} />
          <span>{t('timeline.balance')}: {calculatedSaldo >= 0 ? '+' : ''}{formatCurrency(calculatedSaldo)}</span>
        </span>
      )}
    </div>
  );
}
