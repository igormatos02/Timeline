import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Scale,
  Calendar,
  Layers,
  Sparkles,
  Clock,
  TrendingUp,
  Plus,
  X,
  Settings
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/formatCurrency';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { PieDonut } from '../ui/DonutChart.jsx';

export default function BalanceTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode,
  computeStartDate = null,
  onSaveComputeStartDate
}) {
  const [collapsed, setIsCollapsed] = useState(false);
  const [projectionMonthsAhead, setProjectionMonthsAhead] = useState(0);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [tempComputeMonth, setTempComputeMonth] = useState('2026-08');

  if (!timeline) return null;

  const headerColor = timeline.color || '#0ea5e9';

  // Helper de data de horizonte projetado
  const projectedHorizonLabel = (() => {
    try {
      const baseDate = parseISO('2026-08-01');
      const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + projectionMonthsAhead, 1);
      return format(targetDate, 'MMM yyyy', { locale: pt });
    } catch {
      return 'Ago 2026';
    }
  })();

  const computeFromMonth = computeStartDate
    ? computeStartDate.substring(0, 7)
    : '2026-08';

  const getFormattedMonthLabel = (mStr) => {
    try {
      if (!mStr || mStr === '1900-01') return 'Todo o Histórico';
      const [year, month] = mStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return format(d, 'MMM/yyyy', { locale: pt });
    } catch {
      return mStr;
    }
  };

  const handleSaveComputeMonth = (monthVal) => {
    if (onSaveComputeStartDate) {
      if (monthVal === '1900-01') {
        onSaveComputeStartDate('1900-01-01');
      } else {
        onSaveComputeStartDate(`${monthVal}-01`);
      }
    }
    setIsDatePickerOpen(false);
  };

  // Extrair métricas consolidadas seguras da Stored Procedure ou fallback
  const dto = timeline.balanceHeaderResult || timeline.procedureMetrics;
  const rawMetrics = dto || timeline.metrics || {};
  // Calcular saldo devedor vindo de todas as timelines de empréstimos ATIVAS
  const activeLoanTimelinesSum = (allTimelines || []).filter((t) => {
    const typeLower = (t.type || '').toLowerCase();
    const isLoan = typeLower.includes('loan') || typeLower.includes('empr');
    const isActive = t.status === 'active' || t.status === 'ACTIVE' || !t.status;
    return isLoan && isActive;
  }).reduce((sum, t) => {
    const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
    return sum + Number(m.remaining_debt ?? m.remainingDebt ?? m.total_debt ?? m.totalDebt ?? 0);
  }, 0);

  const rawRemainingDebt = rawMetrics.total_remaining_debt ?? rawMetrics.totalRemainingDebt ?? 0;
  const computedRemainingDebt = activeLoanTimelinesSum > 0 ? activeLoanTimelinesSum : rawRemainingDebt;

  const finMetrics = {
    ...rawMetrics,
    netRealized: rawMetrics.net_realized ?? rawMetrics.netRealized ?? 0,
    totalReceived: rawMetrics.total_received ?? rawMetrics.totalReceived ?? 0,
    totalPaidExpenses: rawMetrics.total_paid_expenses ?? rawMetrics.totalPaidExpenses ?? 0,
    totalInvested: rawMetrics.total_invested ?? rawMetrics.totalInvested ?? 0,
    totalRemainingDebt: computedRemainingDebt,
    totalAmortized: rawMetrics.total_amortized ?? rawMetrics.totalAmortized ?? 0,
    totalLoanDebt: rawMetrics.total_loan_debt ?? rawMetrics.totalLoanDebt ?? 0,
    investmentsTotalAccumulated: rawMetrics.investments_total_accumulated ?? rawMetrics.investmentsTotalAccumulated ?? 0
  };

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          icon={<Scale size={18} />}
          name={timeline.name}
          badge="Balanço Consolidado"
          iconBackground="rgba(14, 165, 233, 0.12)"
          badgeBackground="rgba(14, 165, 233, 0.12)"
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {onAddEvent && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={onAddEvent}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '700'
              }}
            >
              <Plus size={14} />
              <span>Novo Movimento</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title="Timeline Settings"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 8px',
                borderRadius: '8px',
                transition: 'all 0.15s ease'
              }}
            >
              <Settings size={15} />
            </button>
          )}
        </div>
      }
    >
      {/* Conteúdo Expandido com Métricas e Gráficos */}
      {!collapsed && (
        <div style={{ paddingTop: '14px' }}>
          {/* Barra de Controles: Computar e Switcher Resumo / Gráfico */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => {
                  setTempComputeMonth(computeFromMonth);
                  setIsDatePickerOpen(true);
                }}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '5px 12px',
                  height: '32px',
                  background: 'rgba(14, 165, 233, 0.1)',
                  border: isDatePickerOpen ? '1px solid #0ea5e9' : '1px solid rgba(14, 165, 233, 0.3)',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  transition: 'all 0.2s ease',
                  whiteSpace: 'nowrap'
                }}
                title="Clique para alterar e salvar o mês inicial de computação do Balanço"
              >
                <Calendar size={13} style={{ color: '#0ea5e9' }} />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem', fontWeight: '600' }}>Computar:</span>
                <span style={{ color: '#0ea5e9', fontSize: '0.78rem', fontWeight: '800' }}>
                  {getFormattedMonthLabel(computeFromMonth)}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>⚙️</span>
              </button>
            </div>

            {setActiveViewMode && (
              <div
                style={{
                  display: 'inline-flex',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: '8px',
                  padding: '3px',
                  gap: '3px',
                  height: '32px',
                  alignItems: 'center'
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveViewMode('summary')}
                  className={`btn-view-toggle ${activeViewMode === 'summary' ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: activeViewMode === 'summary' ? '800' : '600',
                    cursor: 'pointer',
                    background: activeViewMode === 'summary' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                    color: activeViewMode === 'summary' ? '#0ea5e9' : 'var(--text-muted)'
                  }}
                >
                  <Layers size={13} />
                  <span>Resumo</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveViewMode('graph')}
                  className={`btn-view-toggle ${activeViewMode === 'graph' ? 'active' : ''}`}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '3px 10px',
                    borderRadius: '6px',
                    border: 'none',
                    fontSize: '0.74rem',
                    fontWeight: activeViewMode === 'graph' ? '800' : '600',
                    cursor: 'pointer',
                    background: activeViewMode === 'graph' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                    color: activeViewMode === 'graph' ? '#0ea5e9' : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>Gráfico de Evolução</span>
                </button>
              </div>
            )}
          </div>

          {/* Grid Principal 2x2 padronizado com Donut SVGs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: BALANÇO ATUAL (Donut SVG de Entradas vs Saídas/Investido/Devido) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                BALANÇO ATUAL
              </div>
              {(() => {
                const totalReceived = finMetrics.totalReceived ?? 0;
                const totalPaidExpenses = finMetrics.totalPaidExpenses ?? 0;
                const totalInvested = finMetrics.totalInvested ?? 0;
                const totalRemainingDebt = finMetrics.totalRemainingDebt ?? 0;
                const netRealized = finMetrics.netRealized ?? (totalReceived - totalPaidExpenses - totalInvested);

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    {/* Detalhes Verticais em Lista */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        Saldo Líquido Acumulado:
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800', color: netRealized >= 0 ? '#10b981' : '#f43f5e', marginBottom: '2px' }}>
                        {netRealized >= 0 ? '+' : ''}{formatCurrency(netRealized)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Entradas:</span>
                          <strong style={{ color: '#10b981' }}>+{formatCurrency(totalReceived).replace(',00', '')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Saídas:</span>
                          <strong style={{ color: '#f43f5e' }}>-{formatCurrency(totalPaidExpenses).replace(',00', '')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Investido:</span>
                          <strong style={{ color: '#6366f1' }}>-{formatCurrency(totalInvested).replace(',00', '')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>Devido:</span>
                          <strong style={{ color: '#f59e0b' }}>{formatCurrency(totalRemainingDebt).replace(',00', '')}</strong>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: ANNUAL INCOME BREAKDOWN (Despesas + Investimentos + Empréstimos vs Renda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ANNUAL INCOME BREAKDOWN
              </div>
              {(() => {
                const eventsList = (events && events.length > 0 ? events : timeline.events) || [];

                // Timezone-safe 12-month window
                const now = new Date();
                const sy = now.getFullYear();
                const sm = now.getMonth(); // 0-indexed
                const startMK = `${sy}-${String(sm + 1).padStart(2, '0')}`;
                const etm = sm + 12;
                const ey = sy + Math.floor(etm / 12);
                const em = etm % 12;
                const endMK = `${ey}-${String(em + 1).padStart(2, '0')}`;

                // Use the same active loan filter as Quadrant 3 (which already works)
                const activeLoanTimelines = (allTimelines || []).filter((t) => {
                  const typeLower = (t.type || '').toLowerCase();
                  const isLoanType = typeLower.includes('loan') || typeLower.includes('empr');
                  const isActive = (t.status || '').toLowerCase() === 'active';
                  return isLoanType && isActive;
                });

                // Build active loan ID set for event-based fallback
                const activeLoanIds = new Set(activeLoanTimelines.map((t) => String(t.id)));

                let annualIncome = 0;
                let annualExpense = 0;
                let annualInvestment = 0;
                let annualLoan = 0;

                // Calculate annual loan cost from active loan timeline metrics (monthly installment × 12)
                // This is reliable because it comes from stored metrics, not event timelineId
                activeLoanTimelines.forEach((t) => {
                  const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                  const monthly = Number(
                    m.monthly_installment ?? m.monthlyInstallment ??
                    m.monthly_payment ?? m.monthlyPayment ??
                    m.installment ?? 0
                  );
                  if (monthly > 0) {
                    annualLoan += monthly * 12;
                  }
                });

                eventsList.forEach((ev) => {
                  if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
                  const mk = ev.date.substring(0, 7);
                  if (mk < startMK || mk >= endMK) return;

                  const isIncome = ev.eventType === 'income' || ev.isIncome;
                  const isExpense = ev.eventType === 'expense' || ev.isExpense;
                  const isInvestment = ev.eventType === 'investment' || ev.isInvestment;
                  const amt = Number(ev.amount || 0);

                  if (isIncome) annualIncome += amt;
                  else if (isExpense) annualExpense += amt;
                  else if (isInvestment && !ev.isFirstOccurrence && !ev.isExternal && !ev.is_external) annualInvestment += amt;
                  // Loan: only use event-based if no metrics were found on active timelines
                  else if (
                    annualLoan === 0 &&
                    (ev.eventType === 'loan_installment' || ev.isSystemLoanEvent) &&
                    ev.eventType !== 'amortization' &&
                    ev.category !== 'amortizacao' &&
                    activeLoanIds.has(String(ev.timelineId || ev.timeline_id || ''))
                  ) {
                    annualLoan += amt;
                  }
                });

                const expPct = annualIncome > 0 ? Math.round((annualExpense / annualIncome) * 100) : 0;
                const invPct = annualIncome > 0 ? Math.round((annualInvestment / annualIncome) * 100) : 0;
                const loanPct = annualIncome > 0 ? Math.round((annualLoan / annualIncome) * 100) : 0;
                const freePct = Math.max(0, 100 - expPct - invPct - loanPct);
                const totalCommitted = expPct + invPct + loanPct;

                if (annualIncome === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                      <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          <circle cx="0" cy="0" r="0.82" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.25" strokeDasharray="3 3" />
                        </svg>
                        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', width: '42px', height: '42px', borderRadius: '50%', background: 'var(--bg-card, #0f172a)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border-glass)', fontSize: '0.7rem', fontWeight: '700', color: 'var(--text-dim)' }}>
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>Sem rendimentos projetados</span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>Adicione entradas para visualizar a distribuição anual.</span>
                      </div>
                    </div>
                  );
                }

                // Build pie slices
                const segments = [
                  { label: 'Gastos', pct: expPct, amount: annualExpense, color: '#f43f5e' },
                  { label: 'Investimentos', pct: invPct, amount: annualInvestment, color: '#6366f1' },
                  { label: 'Empréstimos', pct: loanPct, amount: annualLoan, color: '#f59e0b' },
                  { label: 'Disponível', pct: freePct, amount: Math.max(0, annualIncome - annualExpense - annualInvestment - annualLoan), color: '#10b981' }
                ].filter((s) => s.pct > 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <PieDonut
                        items={segments}
                        centerColor={totalCommitted > 85 ? '#f43f5e' : '#0ea5e9'}
                        centerLabel={`${totalCommitted}%`}
                        centerFontSize="0.74rem"
                      />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                        {segments.filter(s => s.label !== 'Disponível').map((seg, i) => (
                          <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: seg.color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-dim)' }}>{seg.label}</span>
                            </div>
                            <strong style={{ color: 'var(--text-main)' }}>{seg.pct}%</strong>
                          </div>
                        ))}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.2)', flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-dim)' }}>Disponível</span>
                          </div>
                          <strong style={{ color: '#10b981' }}>{freePct}%</strong>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '600' }}>Total Anual Projetado</span>
                      <strong style={{ color: '#0ea5e9', fontSize: '0.86rem', fontWeight: '800' }}>
                        {formatCurrency(annualIncome)}
                      </strong>
                    </div>
                  </div>
                );
              })()}
            </div>


            {/* Quadrante 3: EMPRÉSTIMOS E FINANCIAMENTOS (Donut SVG por Financiamento) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                EMPRÉSTIMOS E FINANCIAMENTOS
              </div>
              {(() => {
                const loanColors = ['#8b5cf6', '#0ea5e9', '#14b8a6', '#6366f1', '#f59e0b', '#ec4899'];

                let loanItems = (finMetrics.loans_breakdown || []).map((l, idx) => ({
                  id: l.timeline_id,
                  name: l.name,
                  amount: Number(l.amount || l.remaining_principal || 0),
                  percent: Number(l.percentage || l.percent || 0),
                  color: loanColors[idx % loanColors.length]
                })).filter((item) => item.amount > 0 || item.percent > 0);

                const activeLoanTimelines = (allTimelines || []).filter((t) => {
                  const typeLower = (t.type || '').toLowerCase();
                  const isLoan = typeLower.includes('loan') || typeLower.includes('empr');
                  const isActive = t.status === 'active' || t.status === 'ACTIVE' || !t.status;
                  return isLoan && isActive;
                });

                if (loanItems.length === 0) {
                  loanItems = activeLoanTimelines.map((t, idx) => {
                    const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                    const debt = Number(m.remaining_debt ?? m.remainingDebt ?? m.total_debt ?? m.totalDebt ?? 0);
                    return {
                      id: t.id,
                      name: t.name,
                      amount: debt,
                      color: t.color || loanColors[idx % loanColors.length]
                    };
                  }).filter((item) => item.amount > 0);
                }

                const computedActiveAmortized = activeLoanTimelines.reduce((sum, t) => {
                  const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                  return sum + Number(m.amortized_capital ?? m.amortizedCapital ?? m.paid_capital ?? 0);
                }, 0);

                const computedActiveRemainingDebt = activeLoanTimelines.reduce((sum, t) => {
                  const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                  return sum + Number(m.remaining_debt ?? m.remainingDebt ?? m.total_debt ?? m.totalDebt ?? 0);
                }, 0);

                const computedActiveTotalLoanCost = activeLoanTimelines.reduce((sum, t) => {
                  const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                  const totalCost = Number(m.total_loan_cost ?? m.totalLoanCost ?? m.totalCost ?? 0);
                  if (totalCost > 0) return sum + totalCost;
                  const originalCap = Number(m.original_capital ?? m.originalCapital ?? m.total_debt ?? m.totalDebt ?? t.totalDebt ?? 0);
                  const estInt = Number(m.total_estimated_interest ?? m.totalEstimatedInterest ?? m.future_interest ?? m.futureInterest ?? 0);
                  const estFee = Number(m.total_estimated_fee ?? m.totalEstimatedFee ?? m.future_fee ?? m.futureFee ?? 0);
                  return sum + (originalCap + estInt + estFee);
                }, 0);

                const totalDebtSum = loanItems.reduce((acc, i) => acc + (i.amount || 0), 0);
                const itemsWithPct = loanItems.map((i) => ({
                  ...i,
                  percent: i.percent ?? (totalDebtSum > 0 ? Math.round((i.amount / totalDebtSum) * 100) : 0)
                }));

                const totalAmortizedVal = activeLoanTimelines.length > 0 ? computedActiveAmortized : (finMetrics.totalAmortized ?? 0);
                const totalRemainingDebtVal = activeLoanTimelines.length > 0 ? computedActiveRemainingDebt : (finMetrics.totalRemainingDebt ?? 0);
                const totalRealCostVal = activeLoanTimelines.length > 0
                  ? computedActiveTotalLoanCost
                  : Number(finMetrics.totalLoanCost ?? finMetrics.total_loan_cost ?? (totalRemainingDebtVal + totalAmortizedVal));

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <PieDonut items={itemsWithPct} centerFontSize="0.64rem" centerColor="#0ea5e9" />

                      {/* Lista com percentagem de cada financiamento */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, maxHeight: '90px', overflowY: 'auto' }}>
                        {itemsWithPct.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {item.name}
                              </span>
                            </div>
                            <span style={{ color: 'var(--text-muted)', fontWeight: '800', marginLeft: '6px' }}>
                              {item.percent}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Resumo de Totais: Capital Amortizado vs Capital Devido vs Custo Real do Capital */}
                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }}>Capital Amortizado</span>
                        <strong style={{ color: '#10b981', fontSize: '0.84rem', fontWeight: '800' }}>
                          {formatCurrency(totalAmortizedVal)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }}>Capital Devido</span>
                        <strong style={{ color: '#f43f5e', fontSize: '0.84rem', fontWeight: '800' }}>
                          {formatCurrency(totalRemainingDebtVal)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }} title="Custo total real estimado (Capital Financiado + Juros + Impostos)">Custo Real Capital</span>
                        <strong style={{ color: 'var(--primary-light)', fontSize: '0.84rem', fontWeight: '800' }}>
                          {formatCurrency(totalRealCostVal)}
                        </strong>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* 🔵 LINHA 2: PREVISTOS & PROJEÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                Projeção Futura
              </span>
            </div>

            {/* Slider de Horizonte */}
            <div
              style={{
                background: '#ffffff',
                color: '#1e293b',
                border: '1px solid rgba(226, 232, 240, 0.95)',
                borderRadius: '12px',
                padding: '10px 14px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                boxShadow: '0 2px 10px rgba(0, 0, 0, 0.06)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ background: 'rgba(2, 132, 199, 0.12)', color: '#0284c7', padding: '5px', borderRadius: '7px', display: 'flex' }}>
                    <Clock size={15} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b' }}>
                    Horizonte dos Previstos:
                  </span>
                  <span
                    style={{
                      background: 'rgba(2, 132, 199, 0.1)',
                      color: '#0284c7',
                      border: '1px solid rgba(2, 132, 199, 0.3)',
                      padding: '2px 9px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: '800',
                      textTransform: 'capitalize'
                    }}
                  >
                    {projectedHorizonLabel} {projectionMonthsAhead === 0 ? '(Mês Atual)' : `(+${projectionMonthsAhead}m)`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { label: 'Mês Atual', months: 0 },
                    { label: '+6 Meses', months: 6 },
                    { label: '+1 Ano', months: 12 },
                    { label: '+2 Anos', months: 24 },
                    { label: '+5 Anos', months: 60 }
                  ].map((preset) => {
                    const isSelected = projectionMonthsAhead === preset.months;
                    return (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => setProjectionMonthsAhead(preset.months)}
                        style={{
                          padding: '3px 9px',
                          borderRadius: '6px',
                          fontSize: '0.72rem',
                          fontWeight: isSelected ? '800' : '600',
                          cursor: 'pointer',
                          border: isSelected ? '1px solid #0284c7' : '1px solid #cbd5e1',
                          background: isSelected ? '#0284c7' : '#f8fafc',
                          color: isSelected ? '#ffffff' : '#334155',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {preset.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  Hoje (Ago 2026)
                </span>
                <input
                  type="range"
                  min="0"
                  max="120"
                  step="1"
                  value={projectionMonthsAhead}
                  onChange={(e) => setProjectionMonthsAhead(Number(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: '#0284c7',
                    cursor: 'pointer',
                    height: '6px'
                  }}
                  title={`Projetar até ${projectedHorizonLabel}`}
                />
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  +10 Anos
                </span>
              </div>
            </div>

            {/* Cards Projetados vindos da Stored Procedure em memória */}
            {(() => {
              const projectedItem = (dto?.projected_list && dto.projected_list.length > 0)
                ? (dto.projected_list.find((p) => p.monthsOffset === projectionMonthsAhead) || dto.projected_list[Math.min(projectionMonthsAhead, dto.projected_list.length - 1)])
                : null;

              const netProj = projectedItem ? projectedItem.netProjected : (finMetrics.netProjectedHorizon ?? 0);
              const forecastInc = projectedItem ? projectedItem.forecastIncome : (finMetrics.totalForecastIncomeHorizon ?? 0);
              const plannedExp = projectedItem ? projectedItem.plannedExpenses : (finMetrics.totalPlannedExpensesHorizon ?? 0);
              const plannedInv = projectedItem ? projectedItem.plannedInvestments : (finMetrics.totalInvestmentsHorizon ?? finMetrics.totalInvested ?? 0);
              const plannedAmort = projectedItem ? projectedItem.plannedAmortization : (finMetrics.totalAmortizedHorizon ?? finMetrics.totalAmortized ?? 0);

              return (
                <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  <div className="meta-item" style={{ padding: '8px 12px' }}>
                    <div className="meta-icon-box" style={{ color: '#38bdf8' }}>
                      <TrendingUp size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span className="meta-label" style={{ fontSize: '0.7rem' }}>Balanço Projetado</span>
                        <span style={{ color: netProj >= 0 ? '#38bdf8' : '#f43f5e', fontSize: '0.96rem', fontWeight: '800' }}>
                          {netProj >= 0 ? '+' : ''}{formatCurrency(netProj)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>Entradas Previstas:</span>
                          <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: '700' }}>
                            +{formatCurrency(forecastInc)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>Saídas Previstas:</span>
                          <span style={{ color: '#fb7185', fontSize: '0.78rem', fontWeight: '700' }}>
                            -{formatCurrency(plannedExp)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>Investimentos:</span>
                          <span style={{ color: '#6366f1', fontSize: '0.78rem', fontWeight: '700' }}>
                            -{formatCurrency(plannedInv)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>Capital Amortizado:</span>
                          <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: '700' }}>
                            +{formatCurrency(plannedAmort)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Modal para configurar mês inicial de computação */}
      {isDatePickerOpen && typeof document !== 'undefined' && createPortal(
        <div
          className="modal-overlay"
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '16px',
            boxSizing: 'border-box'
          }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              width: '100%',
              background: 'var(--bg-card, #131722)',
              borderRadius: '16px',
              border: '1px solid var(--border-glass-glow, rgba(99, 102, 241, 0.35))',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(99, 102, 241, 0.18)',
              padding: '24px',
              boxSizing: 'border-box'
            }}
          >
            <div className="modal-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(14, 165, 233, 0.15)', color: '#0ea5e9', padding: '7px', borderRadius: '10px', display: 'flex' }}>
                  <Calendar size={20} />
                </div>
                <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  Computar a partir de
                </h3>
              </div>
              <button
                type="button"
                className="modal-close-btn action-icon-btn"
                onClick={() => setIsDatePickerOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', padding: '4px' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '0 0 16px 0' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
                Defina a partir de qual mês/ano os resumos e gráficos do Balanço devem ser calculados.
              </p>

              <label
                style={{
                  fontSize: '0.78rem',
                  color: 'var(--text-main)',
                  display: 'block',
                  marginBottom: '6px',
                  fontWeight: '700'
                }}
              >
                Selecione Mês e Ano:
              </label>
              <input
                type="month"
                value={tempComputeMonth}
                onChange={(e) => setTempComputeMonth(e.target.value)}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  fontSize: '0.94rem',
                  borderRadius: '10px',
                  background: 'var(--bg-app, #0f172a)',
                  border: '1px solid rgba(14, 165, 233, 0.3)',
                  color: 'var(--text-main)',
                  marginBottom: '16px',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div className="form-footer" style={{ margin: 0, paddingTop: '16px', borderTop: '1px solid var(--border-glass, rgba(255,255,255,0.08))', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsDatePickerOpen(false)}
                style={{ padding: '8px 16px', borderRadius: '8px' }}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleSaveComputeMonth(tempComputeMonth)}
                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}
              >
                Salvar e Aplicar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </HeaderShell>
  );
}
