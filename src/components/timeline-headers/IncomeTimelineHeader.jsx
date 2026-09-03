import React, { useState } from 'react';
import {
  DollarSign,
  Sparkles,
  Clock,
  TrendingUp,
  Plus,
  Edit3,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers
} from 'lucide-react';
import { formatCurrency } from '../../utils/loanCalculations';
import { IncomeEventCategory } from '../../../shared/enums/IncomeEventCategory.js';
import { EventType } from '../../enums/index.js';

export default function IncomeTimelineHeader({
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

  const headerColor = timeline.color || '#10b981'; // Verde padrão para Entradas / Income
  const metrics = timeline.metrics || {};
  const dto = timeline.incomeHeaderResult || timeline.procedureMetrics || metrics.incomeHeaderResult;

  const eventsList = timeline.events || events || [];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // 1. RENDIMENTOS POR ORIGEM / CATEGORIA & TOTAL DO MÊS
  const validEnumValues = Object.values(IncomeEventCategory);
  const incomeCategoryLabelsMap = {
    [IncomeEventCategory.SALARY]: 'Salário / Vencimento',
    [IncomeEventCategory.MEAL_ALLOWANCE]: 'Subsídio Alimentação',
    [IncomeEventCategory.BONUS]: 'Bónus / Prémio',
    [IncomeEventCategory.FREELANCE]: 'Freelance / Serviços',
    [IncomeEventCategory.INVESTMENT_RETURN]: 'Rendimento de Investimento',
    [IncomeEventCategory.RECURRING_INCOME]: 'Entrada Recorrente',
    [IncomeEventCategory.OTHER]: 'Outras Entradas'
  };

  let monthTotalIncome = dto?.current_month_income ?? 0;

  let uiTotalInc = 0;
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
    if (isIncome && ev.date.startsWith(currentMonthStr)) {
      uiTotalInc += Number(ev.amount || 0);
    }
  });

  if (monthTotalIncome === 0 && uiTotalInc > 0) {
    monthTotalIncome = uiTotalInc;
  }

  // Extrair lista de categorias / origens diretamente do DTO vindo da Stored Procedure SQL
  let categoryList = (dto?.categories_breakdown && dto.categories_breakdown.length > 0)
    ? dto.categories_breakdown.map((item) => ({
        rawCat: item.category,
        name: incomeCategoryLabelsMap[item.category] || item.category,
        amount: Number(item.amount || 0),
        percent: Number(item.percent || 0)
      }))
    : [];

  // Fallback para cálculo local estritamente validado com IncomeEventCategory enum
  if (categoryList.length === 0) {
    const categoryTotals = {};
    eventsList.forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
      const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
      if (isIncome && ev.date.startsWith(currentMonthStr)) {
        const amt = Number(ev.amount || 0);
        let cat = (ev.category || '').toLowerCase();
        if (!validEnumValues.includes(cat)) {
          cat = IncomeEventCategory.OTHER;
        }
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
      }
    });

    categoryList = Object.entries(categoryTotals)
      .filter(([cat]) => validEnumValues.includes(cat))
      .map(([cat, amt]) => ({
        rawCat: cat,
        name: incomeCategoryLabelsMap[cat] || cat,
        amount: amt,
        percent: monthTotalIncome > 0 ? Math.round((amt / monthTotalIncome) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // 2. PROJEÇÃO E COMPROMETIMENTO ANUAL (Janela de 12 meses a partir de hoje)
  const startDateObj = new Date();
  const startMonthKey = startDateObj.toISOString().substring(0, 7);
  const endDateObj = new Date(startDateObj.getFullYear(), startDateObj.getMonth() + 12, 1);
  const endMonthKey = endDateObj.toISOString().substring(0, 7);

  let annualTotalIncome = 0;
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const evMonthKey = ev.date.substring(0, 7);
    if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
      const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
      if (isIncome) {
        annualTotalIncome += Number(ev.amount || 0);
      }
    }
  });

  if (annualTotalIncome === 0) {
    annualTotalIncome = monthTotalIncome * 12;
  }

  const annualTarget = dto?.annual_target || (metrics.monthlyBaseSalary ? metrics.monthlyBaseSalary * 12 : 36000);
  const annualAchievementPercent = annualTarget > 0 ? Math.min(100, Math.round((annualTotalIncome / annualTarget) * 100)) : 0;

  // 3. PRÓXIMOS 30 DIAS & RECEBIDOS NO MÊS
  const todayStr = new Date().toISOString().substring(0, 10);
  const next30Date = new Date();
  next30Date.setDate(next30Date.getDate() + 30);
  const next30Str = next30Date.toISOString().substring(0, 10);

  let projectedAmount30 = 0;
  let projectedCount30 = 0;
  let receivedAmountMonth = 0;
  let receivedCountMonth = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
    if (isIncome) {
      if (ev.date >= todayStr && ev.date <= next30Str) {
        projectedAmount30 += Number(ev.amount || 0);
        projectedCount30 += 1;
      }
      const isReceived = ev.status === 'paid' || ev.status === 'received' || ev.status === 'completed' || ev.isCompleted;
      if (ev.date.startsWith(currentMonthStr) && isReceived) {
        receivedAmountMonth += Number(ev.amount || 0);
        receivedCountMonth += 1;
      }
    }
  });

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
              background: 'rgba(16, 185, 129, 0.12)',
              color: headerColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: `1px solid ${headerColor}33`,
              flexShrink: 0
            }}
          >
            <DollarSign size={18} />
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
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: headerColor,
                  border: `1px solid ${headerColor}44`,
                  textTransform: 'uppercase'
                }}
              >
                Entradas e Rendimentos
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
              <span>Nova Entrada</span>
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
                    background: activeViewMode === 'summary' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                    color: activeViewMode === 'summary' ? '#10b981' : 'var(--text-muted)'
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
                    background: activeViewMode === 'graph' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                    color: activeViewMode === 'graph' ? '#10b981' : 'var(--text-muted)'
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
            {/* Quadrante 1: RENDIMENTOS POR ORIGEM (PieChart SVG & Legenda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                RENDIMENTOS POR ORIGEM
              </div>
              {(() => {
                const categoryColors = [
                  '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#a855f7',
                  '#f59e0b', '#14b8a6', '#6366f1', '#ec4899', '#f43f5e'
                ];

                const items = categoryList.length > 0
                  ? categoryList.map((c, i) => ({
                    ...c,
                    color: categoryColors[i % categoryColors.length]
                  }))
                  : [
                    { name: 'Salário / Trabalho', percent: 80, color: '#10b981' },
                    { name: 'Outros Rendimentos', percent: 20, color: '#06b6d4' }
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
                          color: '#10b981'
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

            {/* Quadrante 2: PROJEÇÃO ANUAL (PieChart Donut SVG Anual) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PROJEÇÃO ANUAL
              </div>
              {(() => {
                const usedFraction = Math.min(1, Math.max(0, annualAchievementPercent / 100));
                const sliceX = Math.cos(2 * Math.PI * usedFraction);
                const sliceY = Math.sin(2 * Math.PI * usedFraction);
                const largeArcFlag = usedFraction > 0.5 ? 1 : 0;

                const sliceColor = '#10b981';
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
                            <title>{`Projeção Anual: ${annualAchievementPercent}%`}</title>
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
                        Projeção (Próximos 12 meses):
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#10b981' }}>
                        {formatCurrency(annualTotalIncome)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        alvo anual {formatCurrency(annualTarget)}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 3: PRÓXIMOS 30 DIAS (PieChart Donut SVG de Recebimentos) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                PRÓXIMOS 30 DIAS
              </div>
              {(() => {
                const totalPrevisto = monthTotalIncome > 0 ? monthTotalIncome : projectedAmount30;
                const receivedPercent = totalPrevisto > 0 ? Math.min(100, Math.round((receivedAmountMonth / totalPrevisto) * 100)) : 0;
                const receivedFraction = Math.min(1, Math.max(0, receivedPercent / 100));

                const sliceX = Math.cos(2 * Math.PI * receivedFraction);
                const sliceY = Math.sin(2 * Math.PI * receivedFraction);
                const largeArcFlag = receivedFraction > 0.5 ? 1 : 0;

                const sliceColor = '#10b981'; // Verde para Recebido
                const remainingColor = 'rgba(6, 182, 212, 0.25)'; // Ciano para pendente

                const pathData = receivedFraction >= 0.999
                  ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                  : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        <circle cx="0" cy="0" r="1" fill={remainingColor} />
                        {receivedFraction > 0 && (
                          <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                            <title>{`Recebido: ${receivedPercent}%`}</title>
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
                        {receivedPercent}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Previstos 30d:</span>
                        <strong style={{ color: '#06b6d4' }}>{formatCurrency(projectedAmount30)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between' }}>
                        <span>Recebidos:</span>
                        <strong style={{ color: '#10b981' }}>{formatCurrency(receivedAmountMonth)}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        {projectedCount30} previstos ({receivedCountMonth} já recebidos)
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
              const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
              if (isIncome) {
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

            const annualProj = (currentMonthTotal > 0 ? currentMonthTotal : monthTotalIncome) * 12;
            const maxMonthTotal = Math.max(...last7Months.map((m) => m.total), 1);

            return (
              <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '10px', fontSize: '0.82rem', fontWeight: '700' }}>
                  <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <TrendingUp size={15} style={{ color: isDiffPositive ? '#10b981' : '#f43f5e' }} />
                    <span>Este mês vs mês anterior:</span>
                    <span style={{ color: isDiffPositive ? '#10b981' : '#f43f5e', background: isDiffPositive ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)', padding: '2px 6px', borderRadius: '6px' }}>
                      {diffPercentStr}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={15} style={{ color: '#10b981' }} />
                    <span>Projeção anual:</span>
                    <span style={{ color: '#10b981' }}>{formatCurrency(annualProj)}</span>
                  </div>
                </div>

                {/* Gráfico de Colunas: Volume de Entradas */}
                <div style={{ background: 'rgba(255, 255, 255, 0.015)', border: '1px solid var(--border-glass)', borderRadius: '8px', padding: '12px 14px 10px 14px' }}>
                  <div style={{ fontSize: '0.7rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', marginBottom: '10px', letterSpacing: '0.5px' }}>
                    EVOLUÇÃO DO VOLUME DE ENTRADAS (ÚLTIMOS 6 MESES + MÊS ATUAL)
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
                          <div style={{ fontSize: '0.66rem', fontWeight: '800', color: isCurrentMonth ? '#10b981' : 'var(--text-muted)' }}>
                            {formatCurrency(m.total).replace(',00', '')}
                          </div>

                          <div style={{ width: '100%', height: '54px', display: 'flex', alignItems: 'flex-end', background: 'rgba(255, 255, 255, 0.03)', borderRadius: '4px', overflow: 'hidden' }}>
                            <div
                              style={{
                                width: '100%',
                                height: `${heightPct}%`,
                                background: isCurrentMonth
                                  ? 'linear-gradient(180deg, #10b981 0%, #059669 100%)'
                                  : 'linear-gradient(180deg, rgba(16, 185, 129, 0.6) 0%, rgba(16, 185, 129, 0.3) 100%)',
                                borderRadius: '4px',
                                transition: 'height 0.3s ease'
                              }}
                              title={`${m.label}: ${formatCurrency(m.total)}`}
                            />
                          </div>

                          <div style={{ fontSize: '0.66rem', fontWeight: isCurrentMonth ? '800' : '600', color: isCurrentMonth ? '#10b981' : 'var(--text-dim)' }}>
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
