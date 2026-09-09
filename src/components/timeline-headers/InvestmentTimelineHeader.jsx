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
  Layers,
  Settings,
  RotateCcw,
  ArrowDownRight,
  Copy,
  Check
} from 'lucide-react';
import { formatCurrency } from '../../utils/loanCalculations';
import { InvestmentEventCategory } from '../../../shared/enums/InvestmentEventCategory.js';
import { EventType } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function InvestmentTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode
}) {
  const { t } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const handleCopyId = (e) => {
    e.stopPropagation();
    if (timeline?.id) {
      navigator.clipboard.writeText(String(timeline.id));
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 1800);
    }
  };

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

  // 2. COMPROMETIMENTO ANUAL — Aportes projetados nos próximos 12 meses vs Renda Anual
  const startDateObj = new Date();
  // Use local year/month to avoid timezone shifts from toISOString() (UTC) vs local time
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth(); // 0-indexed
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;

  // End = exactly 12 months later (exclusive upper bound)
  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12; // 0-indexed
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;


  let annualTotalInvested = 0;
  let annualRegularInvested = 0;
  let annualExternalInvested = 0;
  let currentMonthRegularInvested = 0;
  let currentMonthExternalInvested = 0;
  let annualTotalIncome = 0;

  // eventsList already contains rawEvents from all timelines (set by App.jsx activeTimeline memo)
  // So we scan it once for both income and investment events in the 12-month window
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
    const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    const isExternal = Boolean(ev.isExternal || ev.is_external);
    const amt = Number(ev.amount || 0);

    if (isIncome) {
      const evMonthKey = ev.date.substring(0, 7);
      if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
        annualTotalIncome += amt;
      }
    }

    if (isInvestment) {
      if (ev.date.startsWith(currentMonthStr)) {
        if (isExternal) {
          currentMonthExternalInvested += amt;
        } else {
          currentMonthRegularInvested += amt;
        }
      }

      const evMonthKey = ev.date.substring(0, 7);
      if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
        if (isExternal) {
          annualExternalInvested += amt;
        } else if (!ev.isFirstOccurrence) {
          annualRegularInvested += amt;
          annualTotalInvested += amt;
        }
      }
    }
  });

  // Fallback: use timeline monthly salary/budget setting if no income events found
  if (annualTotalIncome === 0) {
    const monthlyFallback = timeline.monthlySalary || timeline.monthlyBudget || timeline.monthlyIncome || 0;
    annualTotalIncome = monthlyFallback * 12;
  }

  if (annualTotalInvested === 0) {
    annualTotalInvested = (currentMonthRegularInvested > 0 ? currentMonthRegularInvested : monthTotalInvested) * 12;
    annualRegularInvested = annualTotalInvested;
  }

  const annualCommitmentPercent = annualTotalIncome > 0
    ? Math.min(100, Math.round((annualTotalInvested / annualTotalIncome) * 100))
    : 0;

  // 3. ATUAL: TOTAL RECEBIDO / APORTADO (INCLUINDO APORTE INICIAL) & TARGET
  let totalInstallmentsReceived = 0;
  let initialContribution = 0;
  let totalReceivedCount = 0;
  let highestTargetVersion = -1;
  let customTarget = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isInvestment = ev.eventType === 'investment' || ev.eventType === EventType.INVESTMENT || ev.isInvestment;
    if (isInvestment) {
      const isReceived = ev.status === 'paid' || ev.status === 'settled' || ev.status === 'completed' || ev.status === 'received' || ev.status === 'invested' || ev.isCompleted;
      if (isReceived) {
        totalInstallmentsReceived += Number(ev.amount || 0);
        totalReceivedCount += 1;
      }
      if (Number(ev.initialInvestedAmount || 0) > 0 && (ev.isFirstOccurrence || !ev.isProjected)) {
        initialContribution += Number(ev.initialInvestedAmount);
      }
      const evVer = Number(ev.version !== undefined ? ev.version : (ev.eventVersion !== undefined ? ev.eventVersion : (ev.event_version || 0)));
      if (Number(ev.targetAmount || 0) > 0 && evVer >= highestTargetVersion) {
        highestTargetVersion = evVer;
        customTarget = Number(ev.targetAmount);
      }
    }
  });

  const totalReceived = totalInstallmentsReceived + initialContribution;

  const targetAmount = customTarget > 0
    ? customTarget
    : (timeline.targetAmount || timeline.target || metrics?.targetAmount || metrics?.target || dto?.target || dto?.annual_target || 0);

  const targetPercent = targetAmount > 0
    ? Math.min(100, Math.round((totalReceived / targetAmount) * 100))
    : 0;

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
                {t('investmentHeader.badge') || 'Poupança & Investimentos'}
              </span>
            </div>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '0.78rem',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                flexWrap: 'wrap'
              }}
            >
              {timeline.description && (
                <span>{timeline.description}</span>
              )}
              {timeline.id && (
                <span
                  style={{
                    fontSize: '0.68rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid var(--border-glass)',
                    color: 'var(--text-dim)',
                    fontFamily: 'monospace',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <span style={{ userSelect: 'all' }}>ID: {timeline.id}</span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    title={copiedId ? 'Copiado!' : 'Copiar ID'}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      padding: '1px 2px',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: copiedId ? '#10b981' : 'var(--text-muted)',
                      borderRadius: '3px',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {copiedId ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
                  </button>
                </span>
              )}
            </p>
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

          {onReset && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onReset}
              title="Limpar todos os movimentos desta timeline"
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
            {/* Quadrante 1: INVESTIMENTOS POR CATEGORIA (PieChart SVG & Legenda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                INVESTIMENTOS POR CATEGORIA
              </div>
              {(() => {
                const categoryColors = [
                  '#6366f1', '#a855f7', '#06b6d4', '#10b981', '#f59e0b',
                  '#ec4899', '#3b82f6', '#84cc16', '#14b8a6', '#f43f5e'
                ];

                if (!categoryList || categoryList.length === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                      <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          <circle cx="0" cy="0" r="0.82" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.25" strokeDasharray="3 3" />
                        </svg>
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            width: '42px',
                            height: '42px',
                            borderRadius: '50%',
                            background: 'var(--bg-card, #0f172a)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-glass)',
                            fontSize: '0.7rem',
                            fontWeight: '700',
                            color: 'var(--text-dim)'
                          }}
                        >
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          Sem investimentos registados
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          Adicione aportes para visualizar o gráfico por categoria.
                        </span>
                      </div>
                    </div>
                  );
                }

                const items = categoryList.map((c, i) => ({
                  ...c,
                  color: categoryColors[i % categoryColors.length]
                }));

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
                          color: 'var(--text-main)'
                        }}
                      >
                        100%
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1, overflowY: 'auto', maxHeight: '110px' }}>
                      {items.map((item, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem' }}>
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

            {/* Quadrante 2: COMPROMETIMENTO ANUAL (Aportes vs Renda — Donut Chart) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                ANNUAL COMMITMENT
              </div>
              {(() => {
                if (annualTotalInvested === 0 && annualTotalIncome === 0) {
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                      <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                        <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                          <circle cx="0" cy="0" r="0.82" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.25" strokeDasharray="3 3" />
                        </svg>
                        <div
                          style={{
                            position: 'absolute', top: '50%', left: '50%',
                            transform: 'translate(-50%, -50%)', width: '42px', height: '42px',
                            borderRadius: '50%', background: 'var(--bg-card, #0f172a)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            border: '1px solid var(--border-glass)', fontSize: '0.7rem',
                            fontWeight: '700', color: 'var(--text-dim)'
                          }}
                        >
                          0%
                        </div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                          Sem dados disponíveis
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          Adicione aportes e rendimentos para calcular o comprometimento anual.
                        </span>
                      </div>
                    </div>
                  );
                }

                const usedFraction = Math.min(1, Math.max(0, annualCommitmentPercent / 100));
                const sliceX = Math.cos(2 * Math.PI * usedFraction);
                const sliceY = Math.sin(2 * Math.PI * usedFraction);
                const largeArcFlag = usedFraction > 0.5 ? 1 : 0;

                const sliceColor = annualCommitmentPercent > 60 ? '#f59e0b' : '#6366f1';
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
                            <title>{`Annual Commitment: ${annualCommitmentPercent}%`}</title>
                          </path>
                        )}
                      </svg>
                      <div
                        style={{
                          position: 'absolute', top: '50%', left: '50%',
                          transform: 'translate(-50%, -50%)', width: '46px', height: '46px',
                          borderRadius: '50%', background: 'var(--bg-card, #0f172a)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          border: '1px solid var(--border-glass)', fontSize: '0.74rem',
                          fontWeight: '800', color: sliceColor
                        }}
                      >
                        {annualCommitmentPercent}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        Annual Commitment:
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {formatCurrency(annualTotalInvested)}
                      </div>
                      {annualTotalIncome > 0 ? (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          of {formatCurrency(annualTotalIncome)} annual total
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          projected next 12 months
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 3: ATUAL (PieChart Donut SVG de Atingimento do Target) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('investmentHeader.currentTitle') || 'ATUAL'}
              </div>
              {(() => {
                const targetFraction = Math.min(1, Math.max(0, targetPercent / 100));

                const sliceX = Math.cos(2 * Math.PI * targetFraction);
                const sliceY = Math.sin(2 * Math.PI * targetFraction);
                const largeArcFlag = targetFraction > 0.5 ? 1 : 0;

                const sliceColor = '#8b5cf6';
                const remainingColor = 'rgba(139, 92, 246, 0.2)';

                const pathData = targetFraction >= 0.999
                  ? `M 1 0 A 1 1 0 1 1 -0.999 0 L 0 0`
                  : `M 1 0 A 1 1 0 ${largeArcFlag} 1 ${sliceX} ${sliceY} L 0 0`;

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <div style={{ position: 'relative', width: '84px', height: '84px', flexShrink: 0 }}>
                      <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%', overflow: 'visible' }}>
                        <circle cx="0" cy="0" r="1" fill={remainingColor} />
                        {targetFraction > 0 && (
                          <path d={pathData} fill={sliceColor} style={{ transition: 'all 0.3s ease' }}>
                            <title>{`${t('investmentHeader.targetReached', { percent: targetPercent }) || `${targetPercent}% do target`}`}</title>
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
                        {targetPercent}%
                      </div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('investmentHeader.receivedTotalLabel') || 'recebidos:'}</span>
                        <strong style={{ color: '#10b981', fontSize: '0.86rem' }}>{formatCurrency(totalReceived)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('investmentHeader.targetLabel') || 'target:'}</span>
                        <strong style={{ color: '#8b5cf6', fontSize: '0.86rem' }}>{formatCurrency(targetAmount)}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {t('investmentHeader.targetReached', { percent: targetPercent }) || `${targetPercent}% do target atingido`}
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

            const baseRegularAnnual = annualRegularInvested > 0 ? annualRegularInvested : ((currentMonthRegularInvested > 0 ? currentMonthRegularInvested : monthTotalInvested) * 12);
            const annualProj = baseRegularAnnual + annualExternalInvested;
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
