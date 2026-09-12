import React from 'react';
import { Sparkles, DollarSign, TrendingDown, PiggyBank, Landmark, Scale } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency.js';
import { TimelineColor } from '../../shared/enums/index.js';

/**
 * MonthProjectionBadges
 * Renders the unified monthly projection bar (+Entradas, -Saídas, Investimentos, Empréstimos, Balance/Saldo)
 * across financial views, conditionally showing only the badges for timeline types that exist in the active timeboard.
 */
export default function MonthProjectionBadges({
  income = 0,
  expense = 0,
  investment = 0,
  loan = 0,
  saldo = null,
  isFutureMonth = false,
  showIncome = true,
  showExpense = true,
  showInvestment = true,
  showLoan = true,
  showBalance = true,
  t = (key) => key
}) {
  const hasAnyBadge = showIncome || showExpense || showInvestment || showLoan || showBalance;
  if (!hasAnyBadge) return null;

  const numIncome = Math.abs(Number(income || 0));
  const numExpense = Math.abs(Number(expense || 0));
  const numInvestment = Math.abs(Number(investment || 0));
  const numLoan = Math.abs(Number(loan || 0));

  const calculatedSaldo = saldo !== null && saldo !== undefined
    ? Number(saldo)
    : (numIncome - (numExpense + numInvestment + numLoan));

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

      {/* 3. Investimento Projetado */}
      {showInvestment && (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            background: 'transparent',
            border: 'none',
            color: isFutureMonth
              ? 'var(--text-dim)'
              : (numInvestment > 0 ? TimelineColor.INVESTMENT : 'var(--text-dim)'),
            fontWeight: '800',
            fontSize: '0.76rem'
          }}
          title={t('timeline.monthInvestmentTitle')}
        >
          <PiggyBank size={12} />
          <span>{formatCurrency(numInvestment)}</span>
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
            border: calculatedSaldo >= 0 ? '1px solid rgba(16, 185, 129, 0.28)' : '1px solid rgba(244, 63, 94, 0.28)',
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
