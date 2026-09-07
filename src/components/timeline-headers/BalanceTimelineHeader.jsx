import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Scale,
  Calendar,
  Layers,
  Sparkles,
  RotateCcw,
  Clock,
  TrendingUp,
  PiggyBank,
  CreditCard,
  Plus,
  ChevronDown,
  ChevronUp,
  X
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/loanCalculations';

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
  const finMetrics = {
    ...rawMetrics,
    netRealized: rawMetrics.net_realized ?? rawMetrics.netRealized ?? 0,
    totalReceived: rawMetrics.total_received ?? rawMetrics.totalReceived ?? 0,
    totalPaidExpenses: rawMetrics.total_paid_expenses ?? rawMetrics.totalPaidExpenses ?? 0,
    totalInvested: rawMetrics.total_invested ?? rawMetrics.totalInvested ?? 0,
    totalRemainingDebt: rawMetrics.total_remaining_debt ?? rawMetrics.total_remaining_debt ?? rawMetrics.totalRemainingDebt ?? 0,
    totalAmortized: rawMetrics.total_amortized ?? rawMetrics.totalAmortized ?? 0,
    totalLoanDebt: rawMetrics.total_loan_debt ?? rawMetrics.totalLoanDebt ?? 0,
    investmentsTotalAccumulated: rawMetrics.investments_total_accumulated ?? rawMetrics.investmentsTotalAccumulated ?? 0
  };

  return (
    <div
      className={`timeline-hero glass-panel ${collapsed ? 'hero-collapsed' : ''}`}
      style={{
        borderLeft: `4px solid ${headerColor}`,
        '--active-timeline-color': headerColor,
        padding: collapsed ? '12px 18px' : '16px 20px',
        marginBottom: '10px',
        transition: 'padding 0.2s ease, box-shadow 0.2s ease',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* 🏷️ Topo: Título, Ícone e Ações Globais */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px',
          paddingBottom: collapsed ? '0' : '12px',
          borderBottom: collapsed ? 'none' : '1px solid var(--border-glass)'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            type="button"
            onClick={() => setIsCollapsed(!collapsed)}
            aria-label={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
            title={collapsed ? "Expandir cabeçalho" : "Recolher cabeçalho"}
            style={{
              width: '30px',
              height: '30px',
              borderRadius: '50%',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--bg-glass)',
              border: '1px solid var(--border-glass)',
              color: 'var(--text-main)',
              cursor: 'pointer',
              transition: 'background-color 0.15s ease, transform 0.2s ease',
              flexShrink: 0
            }}
          >
            {collapsed ? <ChevronDown size={17} /> : <ChevronUp size={17} />}
          </button>

          <div
            style={{
              width: '34px',
              height: '34px',
              borderRadius: '10px',
              background: 'rgba(14, 165, 233, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <Scale size={18} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <h1 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {timeline.name}
              </h1>
              <span
                style={{
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: 'rgba(14, 165, 233, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                Balanço Consolidado
              </span>
            </div>
            {timeline.description && (
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {timeline.description}
              </p>
            )}
          </div>
        </div>

        {/* Botões de Ação */}
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

          {onReset && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onReset}
              title="Limpar todos os dados consolidados"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

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

            {/* Quadrante 2: INVESTIMENTOS (Pie/Donut por Categoria e Total Acumulado) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INVESTIMENTOS
              </div>
              {(() => {
                const categoryColorMap = {
                  savings: '#10b981',
                  assets: '#6366f1',
                  stocks: '#38bdf8',
                  funds: '#f59e0b',
                  crypto: '#ec4899',
                  real_estate: '#8b5cf6',
                  other: '#64748b'
                };

                let invItems = (finMetrics.investments_breakdown || []).map((b) => ({
                  name: b.category_label || b.category,
                  amount: Number(b.total_amount || b.amount || 0),
                  percent: Number(b.percentage || b.percent || 0),
                  color: categoryColorMap[b.category] || '#6366f1'
                })).filter((i) => i.amount > 0 || i.percent > 0);

                if (invItems.length === 0) {
                  const poupanca = finMetrics.totalPoupanca ?? 0;
                  const patrimonio = finMetrics.totalPatrimonioAcquisition ?? 0;
                  const outros = finMetrics.totalOutros ?? 0;
                  invItems = [
                    { name: 'Poupança', amount: poupanca, color: '#10b981' },
                    { name: 'Ativos / Património', amount: patrimonio, color: '#6366f1' },
                    { name: 'Outros', amount: outros, color: '#38bdf8' }
                  ].filter((i) => i.amount > 0);
                }

                const defaultItems = invItems.length > 0 ? invItems : [
                  { name: 'Poupança', amount: 1, percent: 50, color: '#10b981' },
                  { name: 'Ativos', amount: 1, percent: 50, color: '#6366f1' }
                ];

                const totalSum = defaultItems.reduce((acc, i) => acc + (i.amount || 0), 0);
                const itemsWithPct = defaultItems.map((i) => ({
                  ...i,
                  percent: i.percent ?? (totalSum > 0 ? Math.round((i.amount / totalSum) * 100) : 0)
                }));

                let cumulativePercent = 0;
                const getCoordinatesForPercent = (percent) => {
                  const x = Math.cos(2 * Math.PI * percent);
                  const y = Math.sin(2 * Math.PI * percent);
                  return [x, y];
                };

                const slices = itemsWithPct.map((slice) => {
                  const startPercent = cumulativePercent;
                  cumulativePercent += slice.percent / 100;
                  const endPercent = cumulativePercent;

                  const [startX, startY] = getCoordinatesForPercent(startPercent);
                  const [endX, endY] = getCoordinatesForPercent(endPercent);
                  const largeArcFlag = slice.percent / 100 > 0.5 ? 1 : 0;

                  const pathData = [
                    `M ${startX} ${startY}`,
                    `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                    `L 0 0`
                  ].join(' ');

                  return { ...slice, pathData };
                });

                const totalInvested = finMetrics.investmentsTotalAccumulated || finMetrics.totalInvested || 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                          {slices.map((s, idx) => (
                            <path
                              key={idx}
                              d={s.pathData}
                              fill={s.color}
                            />
                          ))}
                        </svg>
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: 'var(--bg-card, #0f172a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            color: '#6366f1'
                          }}
                        >
                          100%
                        </div>
                      </div>

                      {/* Lista de % por Categoria */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                        {itemsWithPct.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                              <span style={{ color: 'var(--text-dim)' }}>{item.name}</span>
                            </div>
                            <strong style={{ color: 'var(--text-main)', fontSize: '0.7rem' }}>{item.percent}%</strong>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '600' }}>Total Acumulado</span>
                      <strong style={{ color: '#6366f1', fontSize: '0.86rem', fontWeight: '800' }}>
                        {formatCurrency(totalInvested)}
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

                if (loanItems.length === 0) {
                  // Extrair linhas do tempo de empréstimos enviadas em allTimelines
                  const loanTimelines = (allTimelines || []).filter((t) => {
                    const typeLower = (t.type || '').toLowerCase();
                    return typeLower.includes('loan') || typeLower.includes('empr');
                  });

                  loanItems = loanTimelines.map((t, idx) => {
                    const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                    const debt = Number(m.remaining_debt ?? m.total_debt ?? 0);
                    return {
                      id: t.id,
                      name: t.name,
                      amount: debt,
                      color: t.color || loanColors[idx % loanColors.length]
                    };
                  }).filter((item) => item.amount > 0);
                }

                const totalDebtSum = loanItems.reduce((acc, i) => acc + (i.amount || 0), 0);
                const itemsWithPct = loanItems.map((i) => ({
                  ...i,
                  percent: i.percent ?? (totalDebtSum > 0 ? Math.round((i.amount / totalDebtSum) * 100) : 0)
                }));

                let cumulativePercent = 0;
                const getCoordinatesForPercent = (percent) => {
                  const x = Math.cos(2 * Math.PI * percent);
                  const y = Math.sin(2 * Math.PI * percent);
                  return [x, y];
                };

                const slices = itemsWithPct.map((slice) => {
                  const startPercent = cumulativePercent;
                  cumulativePercent += slice.percent / 100;
                  const endPercent = cumulativePercent;

                  const [startX, startY] = getCoordinatesForPercent(startPercent);
                  const [endX, endY] = getCoordinatesForPercent(endPercent);
                  const largeArcFlag = slice.percent / 100 > 0.5 ? 1 : 0;

                  const pathData = [
                    `M ${startX} ${startY}`,
                    `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
                    `L 0 0`
                  ].join(' ');

                  return { ...slice, pathData };
                });

                const totalAmortizedVal = finMetrics.totalAmortized ?? 0;
                const totalRemainingDebtVal = finMetrics.totalRemainingDebt ?? 0;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                          {slices.map((s, idx) => (
                            <path
                              key={idx}
                              d={s.pathData}
                              fill={s.color}
                              style={{ transition: 'all 0.2s ease', cursor: 'pointer' }}
                            >
                              <title>{`${s.name}: ${s.percent}% (${formatCurrency(s.amount)})`}</title>
                            </path>
                          ))}
                        </svg>
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '46px',
                            height: '46px',
                            borderRadius: '50%',
                            background: 'var(--bg-card, #0f172a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-glass)',
                            fontSize: '0.64rem',
                            fontWeight: '800',
                            color: '#0ea5e9'
                          }}
                        >
                          100%
                        </div>
                      </div>

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

                    {/* Resumo de Totais: Capital Amortizado vs Capital Devido */}
                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '600' }}>Capital Amortizado</span>
                        <strong style={{ color: '#10b981', fontSize: '0.86rem', fontWeight: '800' }}>
                          {formatCurrency(totalAmortizedVal)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '600' }}>Capital Devido</span>
                        <strong style={{ color: '#f43f5e', fontSize: '0.86rem', fontWeight: '800' }}>
                          {formatCurrency(totalRemainingDebtVal)}
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
          onClick={() => setIsDatePickerOpen(false)}
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
    </div>
  );
}
