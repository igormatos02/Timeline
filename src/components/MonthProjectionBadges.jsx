import React from 'react';
import { Sparkles, DollarSign, TrendingDown, PiggyBank, Landmark, Scale } from 'lucide-react';
import { formatCurrency } from '../utils/formatCurrency.js';

/**
 * MonthProjectionBadges
 * Renders the unified monthly projection bar (+Entradas, -Saídas, Investimentos, Empréstimos, Balance/Saldo)
 * across all financial views (Balanço, Entradas, Despesas, Investimentos).
 */
export default function MonthProjectionBadges({
  income = 0,
  expense = 0,
  investment = 0,
  loan = 0,
  saldo = null,
  isFutureMonth = false,
  t = (key) => key
}) {
  const numIncome = Number(income || 0);
  const numExpense = Number(expense || 0);
  const numInvestment = Number(investment || 0);
  const numLoan = Number(loan || 0);

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
        <span>{t('timeline.monthProjection') || 'Month Projection'}</span>
      </span>

      {/* 1. Entradas Projetadas */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'transparent',
          border: 'none',
          color: isFutureMonth
            ? 'var(--text-dim)'
            : (numIncome > 0 ? '#10b981' : 'var(--text-dim)'),
          fontWeight: '800',
          fontSize: '0.76rem'
        }}
        title={t('timeline.monthIncomeTitle') || 'Total em entradas previstas para este mês'}
      >
        <DollarSign size={12} />
        <span>+{formatCurrency(numIncome)}</span>
      </span>

      {/* 2. Gasto Projetado */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'transparent',
          border: 'none',
          color: isFutureMonth
            ? 'var(--text-dim)'
            : (numExpense > 0 ? '#f43f5e' : 'var(--text-dim)'),
          fontWeight: '800',
          fontSize: '0.76rem'
        }}
        title={t('timeline.monthExpenseTitle') || 'Total em despesas previstas para este mês'}
      >
        <TrendingDown size={12} />
        <span>-{formatCurrency(numExpense)}</span>
      </span>

      {/* 3. Investimento Projetado */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'transparent',
          border: 'none',
          color: isFutureMonth
            ? 'var(--text-dim)'
            : (numInvestment > 0 ? '#818cf8' : 'var(--text-dim)'),
          fontWeight: '800',
          fontSize: '0.76rem'
        }}
        title={t('timeline.monthInvestmentTitle') || 'Total em investimentos previstos para este mês'}
      >
        <PiggyBank size={12} />
        <span>{formatCurrency(numInvestment)}</span>
      </span>

      {/* 4. Total em Empréstimos a Pagar */}
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'transparent',
          border: 'none',
          color: isFutureMonth
            ? 'var(--text-dim)'
            : (numLoan > 0 ? '#eab308' : 'var(--text-dim)'),
          fontWeight: '800',
          fontSize: '0.76rem'
        }}
        title={t('timeline.monthLoanTitle') || 'Total em prestações de empréstimos a pagar este mês'}
      >
        <Landmark size={12} />
        <span>{formatCurrency(numLoan)}</span>
      </span>

      {/* 5. Saldo Líquido Projetado */}
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
          color: calculatedSaldo >= 0 ? '#10b981' : '#f43f5e',
          fontWeight: '800',
          fontSize: '0.76rem'
        }}
        title={t('timeline.monthBalanceTitle') || 'Saldo líquido projetado para este mês'}
      >
        <Scale size={12} />
        <span>{t('timeline.balance') || 'Balance'}: {calculatedSaldo >= 0 ? '+' : ''}{formatCurrency(calculatedSaldo)}</span>
      </span>
    </div>
  );
}
