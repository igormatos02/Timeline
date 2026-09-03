import React, { useState } from 'react';
import {
  PiggyBank,
  Sparkles,
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { formatCurrency } from '../../utils/loanCalculations';
import { InvestmentEventCategory } from '../../../shared/enums/InvestmentEventCategory.js';
import { EventType } from '../../enums/index.js';

export default function InvestmentTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  activeViewMode = 'summary',
  setActiveViewMode
}) {
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#6366f1';
  const metrics = timeline.metrics || {};
  const dto = timeline.investmentHeaderResult || timeline.procedureMetrics || metrics.investmentHeaderResult;

  const eventsList = timeline.events || events || [];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // 1. INVESTIMENTOS / POUPANÇA POR CATEGORIA & TOTAL DO MÊS
  const validEnumValues = Object.values(InvestmentEventCategory);

  let monthTotalInvested = dto?.current_month_invested ?? 0;

  let uiTotalInv = 0;
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    if (isInvestment && ev.date.startsWith(currentMonthStr)) {
      uiTotalInv += Number(ev.amount || 0);
    }
  });

  if (monthTotalInvested === 0 && uiTotalInv > 0) {
    monthTotalInvested = uiTotalInv;
  }

  // Extrair lista de categorias diretamente do DTO vindo da Stored Procedure SQL usando os valores exatos do enum
  let categoryList = (dto?.categories_breakdown && dto.categories_breakdown.length > 0)
    ? dto.categories_breakdown.map((item) => ({
        rawCat: item.category,
        name: item.category, // Valor exato vindo do enum
        amount: Number(item.amount || 0),
        percent: Number(item.percent || 0)
      }))
    : [];

  // Fallback para cálculo local se o DTO for nulo ou vazio
  if (categoryList.length === 0) {
    const categoryTotals = {};
    eventsList.forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
      const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
      if (isInvestment && ev.date.startsWith(currentMonthStr)) {
        const amt = Number(ev.amount || 0);
        let cat = (ev.category || '').toLowerCase();
        if (!validEnumValues.includes(cat)) {
          cat = InvestmentEventCategory.OTHER;
        }
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    categoryList = Object.entries(categoryTotals)
      .filter(([cat]) => validEnumValues.includes(cat))
      .map(([cat, amt]) => ({
        rawCat: cat,
        name: cat, // Valor exato vindo do enum
        amount: amt,
        percent: monthTotalInvested > 0 ? Math.round((amt / monthTotalInvested) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // 2. PROJEÇÃO E TAXA DE POUPANÇA ANUAL (Janela de 12 meses a partir de hoje)
  const startDateObj = new Date();
  const startMonthKey = startDateObj.toISOString().substring(0, 7);
  const endDateObj = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 12, 1);
  const endMonthKey = endDateObj.toISOString().substring(0, 7);

  let annualTotalInvested = 0;
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const evMonthKey = ev.date.substring(0, 7);
    if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
      const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
      if (isInvestment) {
        annualTotalInvested += Number(ev.amount || 0);
      }
    }
  });

  if (annualTotalInvested === 0) {
    annualTotalInvested = monthTotalInvested * 12;
  }

  const annualTarget = dto?.monthly_target ? dto.monthly_target * 12 : 6000;
  const annualAchievementPercent = annualTarget > 0 ? Math.min(100, Math.round((annualTotalInvested / annualTarget) * 100)) : 0;

  // 3. PRÓXIMOS 30 DIAS & APORTES REALIZADOS NO MÊS
  const todayStr = new Date().toISOString().substring(0, 10);
  const next30Date = new Date();
  next30Date.setDate(next30Date.getDate() + 30);
  const next30Str = next30Date.toISOString().substring(0, 10);

  let committedAmount30 = dto?.committed_amount_30 ?? 0;
  let committedCount30 = dto?.committed_count_30 ?? 0;
  let paidAmountMonth = dto?.paid_amount_month ?? 0;
  let paidCountMonth = dto?.paid_count_month ?? 0;

  let uiCommAmt = 0;
  let uiCommCnt = 0;
  let uiPaidAmt = 0;
  let uiPaidCnt = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    if (isInvestment) {
      if (ev.date >= todayStr && ev.date <= next30Str) {
        uiCommAmt += Number(ev.amount || 0);
        uiCommCnt += 1;
      }
      const isPaid = ev.status === 'paid' || ev.status === 'settled' || ev.status === 'completed' || ev.isCompleted;
      if (ev.date.startsWith(currentMonthStr) && isPaid) {
        uiPaidAmt += Number(ev.amount || 0);
        uiPaidCnt += 1;
      }
    }
  });

  if (committedAmount30 === 0 && uiCommAmt > 0) {
    committedAmount30 = uiCommAmt;
    committedCount30 = uiCommCnt;
  }
  if (paidAmountMonth === 0 && uiPaidAmt > 0) {
    paidAmountMonth = uiPaidAmt;
    paidCountMonth = uiPaidCnt;
  }

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
      {/* 🏷️ Topo: Título, Ícone e Ações */}
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
              background: 'rgba(99, 102, 241, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <PiggyBank size={18} />
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
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                Investimentos & Poupança
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
                fontWeight: '700',
                background: headerColor,
                borderColor: headerColor
              }}
            >
              <Plus size={14} />
              <span>Novo Aporte</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onEdit}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Edit3 size={13} />
              <span>Editar</span>
            </button>
          )}

          {onDelete && !timeline.isSystemDefault && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onDelete}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '6px 10px',
                borderRadius: '8px',
                fontSize: '0.74rem'
              }}
            >
              <Trash2 size={13} />
              <span>Excluir</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Expandido */}
      {!collapsed && (
        <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Alternador de Modo de Visão */}
          {setActiveViewMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                    background: activeViewMode === 'summary' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    color: activeViewMode === 'summary' ? '#6366f1' : 'var(--text-muted)'
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
                    background: activeViewMode === 'graph' ? 'rgba(99, 102, 241, 0.18)' : 'transparent',
                    color: activeViewMode === 'graph' ? '#6366f1' : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>Evolução</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Principal 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: APORTES POR CATEGORIA (PieChart SVG & Legenda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                APORTES POR CATEGORIA
              </div>
              {(() => {
                const categoryColors = [
                  '#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b',
                  '#ec4899', '#3b82f6', '#84cc16', '#14b8a6', '#f43f5e'
                ];

                const items = categoryList.length > 0
                  ? categoryList.map((c, i) => ({
                    ...c,
                    color: categoryColors[i % categoryColors.length]
                  }))
                  : [
                    { name: 'Poupança / Reserva', percent: 60, color: '#6366f1' },
                    { name: 'Ativos / Fundos', percent: 40, color: '#a855f7' }
                  ];

                let cumulativePercent = 0;
                const getCoordinatesForPercent = (percent) => {
                  const x = Math.cos(2 * Math.PI * percent);
                  const y = Math.sin(2 * Math.PI * percent);
                  return [x, y];
                };

                const slices = items.map((slice) => {
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

                return (
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
                            <title>{`${s.name}: ${s.percent}%`}</title>
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
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          color: '#6366f1'
                        }}
                      >
                        100%
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, maxHeight: '84px', overflowY: 'auto' }}>
                      {items.slice(0, 4).map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color, flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.name}
                            </span>
                          </div>
                          <span style={{ color: 'var(--text-muted)', fontWeight: '700', marginLeft: '6px' }}>
                            {item.percent}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: PROJEÇÃO DE APORTES ANUAIS (PieChart Donut SVG Anual) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PROJEÇÃO ANUAL DE APORTES
              </div>
              {(() => {
                const usedFraction = Math.min(1, Math.max(0, annualAchievementPercent / 100));
                const sliceX = Math.cos(2 * Math.PI * usedFraction);
                const sliceY = Math.sin(2 * Math.PI * usedFraction);
                const largeArcFlag = usedFraction > 0.5 ? 1 : 0;

                const sliceColor = '#6366f1';
                const remainingColor = 'rgba(255, 255, 255, 0.08)';

                const pathData = usedFraction >= 0.999
                  ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                  : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        <circle cx="0" cy="0" r="1" fill={remainingColor} />
                        {usedFraction > 0 && (
                          <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                            <title>{`Atingimento da Meta: ${annualAchievementPercent}%`}</title>
                          </path>
                        )}
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
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          color: sliceColor
                        }}
                      >
                        {annualAchievementPercent}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        Aportes Projetados (12m):
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#6366f1' }}>
                        {formatCurrency(annualTotalInvested)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        alvo estimado {formatCurrency(annualTarget)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 3: PRÓXIMOS 30 DIAS (PieChart Donut SVG de Aportes) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PRÓXIMOS 30 DIAS
              </div>
              {(() => {
                const totalPrevistoOuAportado = monthTotalInvested > 0 ? monthTotalInvested : committedAmount30;
                const paidPercent = totalPrevistoOuAportado > 0 ? Math.min(100, Math.round((paidAmountMonth / totalPrevistoOuAportado) * 100)) : 0;
                const paidFraction = Math.min(1, Math.max(0, paidPercent / 100));

                const sliceX = Math.cos(2 * Math.PI * paidFraction);
                const sliceY = Math.sin(2 * Math.PI * paidFraction);
                const largeArcFlag = paidFraction > 0.5 ? 1 : 0;

                const sliceColor = '#6366f1';
                const remainingColor = 'rgba(99, 102, 241, 0.25)';

                const pathData = paidFraction >= 0.999
                  ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                  : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        <circle cx="0" cy="0" r="1" fill={remainingColor} />
                        {paidFraction > 0 && (
                          <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                            <title>{`Aportado: ${paidPercent}%`}</title>
                          </path>
                        )}
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
                          fontSize: '0.74rem',
                          fontWeight: '800',
                          color: sliceColor
                        }}
                      >
                        {paidPercent}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Previstos 30d:</span>
                        <strong style={{ color: '#6366f1' }}>{formatCurrency(committedAmount30)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Aportados:</span>
                        <strong style={{ color: '#10b981' }}>{formatCurrency(paidAmountMonth)}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {committedCount30} previstos ({paidCountMonth} já liquidados)
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Rodapé com Comparações, Projeção Anual & Gráfico de Colunas dos últimos 6 meses + mês atual */}
          {(() => {
            const currentDateObj = new Date();
            const last7Months = [];
            for (let i = 6; i >= 0; i--) {
              const year = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getFullYear();
              const month = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getMonth() + 1;
              const monthStr = String(month).padStart(2, '0');
              const key = `${year}-${monthStr}`;

              const d = new Date(year, month - 1, 1);
              const label = d.toLocaleDateString('pt-PT', { month: 'short' }).replace('.', '').toUpperCase();
              last7Months.push({ key, label, total: 0 });
            }

            eventsList.forEach((ev) => {
              if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
              const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
              if (isInvestment) {
                const evKey = ev.date.substring(0, 7);
                const foundMonth = last7Months.find((m) => m.key === evKey);
                if (foundMonth) {
                  foundMonth.total += Number(ev.amount || 0);
                }
              }
            });

            const currentMonthTotal = last7Months[last7Months.length - 1]?.total || 0;
            const prevMonthTotal = last7Months[last7Months.length - 2]?.total || 0;
            let diffPercentStr = '0,0%';
            let isDiffPositive = true;

            if (prevMonthTotal > 0) {
              const diffPct = ((currentMonthTotal - prevMonthTotal) / prevMonthTotal) * 100;
              isDiffPositive = diffPct >= 0;
              diffPercentStr = `${diffPct > 0 ? '+' : ''}${diffPct.toFixed(1).replace('.', ',')}%`;
            } else if (currentMonthTotal > 0) {
              diffPercentStr = '+100%';
            }

            const annualProj = (currentMonthTotal > 0 ? currentMonthTotal : monthTotalInvested) * 12;
            const maxMonthTotal = Math.max(...last7Months.map((m) => m.total), 1);

            return (
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: '700' }}>
                  <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={15} style={{ color: isDiffPositive ? '#6366f1' : '#f43f5e' }} />
                    <span>Este mês vs mês anterior:</span>
                    <span style={{ color: isDiffPositive ? '#6366f1' : '#f43f5e', background: isDiffPositive ? 'rgba(99, 102, 241, 0.12)' : 'rgba(244, 63, 94, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>
                      {diffPercentStr}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} style={{ color: '#6366f1' }} />
                    <span>Projeção anual:</span>
                    <span style={{ color: '#6366f1' }}>{formatCurrency(annualProj)}</span>
                  </div>
                </div>

                {/* Gráfico de Colunas: Volume de Aportes */}
                <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px 14px 10px 14px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    EVOLUÇÃO DO VOLUME DE APORTES (ÚLTIMOS 6 MESES + MÊS ATUAL)
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', height: '90px' }}>
                    {last7Months.map((m, idx) => {
                      const heightPct = Math.max(8, Math.min(100, Math.round((m.total / maxMonthTotal) * 100)));
                      const isCurrentMonth = idx === last7Months.length - 1;

                      return (
                        <div
                          key={`${m.key}-${idx}`}
                          style={{
                            flex: 1,
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '6px',
                            height: '100%',
                            justifyContent: 'flex-end'
                          }}
                        >
                          <div style={{ fontSize: '0.66rem', fontWeight: '800', color: isCurrentMonth ? '#6366f1' : 'var(--text-muted)' }}>
                            {formatCurrency(m.total).replace(',00', '')}
                          </div>

                          <div style={{ width: '100%', height: '54px', display: 'flex', alignItems: 'flex-end', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: '100%',
                                height: `${heightPct}%`,
                                background: isCurrentMonth
                                  ? 'linear-gradient(180deg, #6366f1 0%, #4f46e5 100%)'
                                  : 'linear-gradient(180deg, rgba(99, 102, 241, 0.6) 0%, rgba(99, 102, 241, 0.3) 100%)',
                                borderRadius: '4px',
                                transition: 'height 0.3s ease'
                              }}
                              title={`${m.label}: ${formatCurrency(m.total)}`}
                            />
                          </div>

                          <div style={{ fontSize: '0.66rem', fontWeight: isCurrentMonth ? '800' : '600', color: isCurrentMonth ? '#6366f1' : 'var(--text-dim)' }}>
                            {m.label}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
