import React, { useState } from 'react';
import {
  DollarSign,
  Sparkles,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Layers,
  Settings,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { formatCurrency } from '../../utils/formatCurrency';
import { IncomeEventCategory } from '../../../shared/enums/IncomeEventCategory.js';
import { EventType } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

export default function IncomeTimelineHeader({
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
  const { t, language, dateLocale } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);

  if (!timeline) return null;

  const headerColor = timeline.color || '#10b981'; // Verde padrão para Entradas / Income
  const metrics = timeline.metrics || {};
  const dto = timeline.incomeHeaderResult || timeline.procedureMetrics || metrics.incomeHeaderResult;

  const eventsList = timeline.events || events || [];
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // 1. RENDIMENTOS POR ORIGEM / CATEGORIA & TOTAL DO MÊS
  const validEnumValues = Object.values(IncomeEventCategory);
  const getCategoryLabel = (cat) => {
    return t(`incomeCategories.${cat}`) || cat;
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
        name: getCategoryLabel(item.category),
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
        name: getCategoryLabel(cat),
        amount: amt,
        percent: monthTotalIncome > 0 ? Math.round((amt / monthTotalIncome) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // 2. PROJEÇÃO E COMPROMETIMENTO ANUAL (Janela de 12 meses a partir de hoje)
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

  // 3. ATUAL: TOTAL RECEBIDO & TARGET
  let totalInstallmentsReceived = 0;
  let initialContribution = 0;
  let totalReceivedCount = 0;
  let customTarget = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.status === 'cancelled' || ev.status === 'deleted') return;
    const isIncome = ev.eventType === 'income' || ev.eventType === EventType.INCOME || ev.isIncome;
    if (isIncome) {
      const isReceived = ev.status === 'paid' || ev.status === 'received' || ev.status === 'completed' || ev.status === 'settled' || ev.isCompleted;
      if (isReceived) {
        totalInstallmentsReceived += Number(ev.amount || 0);
        totalReceivedCount += 1;
      }
      if (Number(ev.initialInvestedAmount || 0) > 0 && (ev.isFirstOccurrence || !ev.isProjected)) {
        initialContribution += Number(ev.initialInvestedAmount);
      }
      if (Number(ev.targetAmount || 0) > 0) {
        customTarget = Math.max(customTarget, Number(ev.targetAmount));
      }
    }
  });

  const totalReceived = totalInstallmentsReceived + initialContribution;

  const targetAmount = customTarget > 0
    ? customTarget
    : (timeline.targetAmount || timeline.target || metrics?.targetAmount || metrics?.annualTarget || dto?.target || dto?.annual_target || 0);

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
            aria-label={collapsed ? (language === 'pt' ? 'Expandir cabeçalho' : 'Expand header') : (language === 'pt' ? 'Recolher cabeçalho' : 'Collapse header')}
            title={collapsed ? (language === 'pt' ? 'Expandir cabeçalho' : 'Expand header') : (language === 'pt' ? 'Recolher cabeçalho' : 'Collapse header')}
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

          <HeaderTitleBlock
            color={headerColor}
            icon={<DollarSign size={18} />}
            name={timeline.name}
            badge={t('incomeHeader.badge') || 'Inflows & Income'}
            iconBackground="rgba(16, 185, 129, 0.12)"
            badgeBackground="rgba(16, 185, 129, 0.12)"
            description={timeline.description}
            id={timeline.id}
          />
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
              <span>{t('incomeHeader.addIncome') || 'New Income'}</span>
            </button>
          )}

          {onReset && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onReset}
              title={t('incomeHeader.resetTitle') || 'Clear all movements in this timeline'}
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
              <span>{t('common.reset') || 'Reset'}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('incomeHeader.settingsTitle') || 'Timeline Settings'}
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
              title={t('incomeHeader.deleteTitle') || 'Delete this timeline'}
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
              <span>{t('common.delete') || 'Delete'}</span>
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
                  <span>{t('incomeHeader.summaryView') || 'Summary'}</span>
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
                  <span>{t('incomeHeader.evolutionView') || 'Evolution'}</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Principal 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: RENDIMENTOS POR ORIGEM (PieChart SVG & Legenda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('incomeHeader.sourcesTitle') || 'INCOME BY SOURCE'}
              </div>
              {(() => {
                const categoryColors = [
                  '#10b981', '#06b6d4', '#3b82f6', '#84cc16', '#a855f7',
                  '#f59e0b', '#14b8a6', '#6366f1', '#ec4899', '#f43f5e'
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
                          {t('incomeHeader.noIncome') || 'No income recorded'}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                          {t('incomeHeader.noIncomeHint') || 'Add income events to view the breakdown by source.'}
                        </span>
                      </div>
                    </div>
                  );
                }

                const items = categoryList.map((c, i) => ({
                  ...c,
                  color: categoryColors[i % categoryColors.length]
                }));

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <PieDonut items={items} />
                    <DonutLegend items={items} />
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: PROJEÇÃO ANUAL (PieChart Donut SVG Anual) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('incomeHeader.annualProjectionTitle') || 'ANNUAL PROJECTION'}
              </div>
              {(() => {
                const annualProjectionTitle = t('incomeHeader.annualProjectionTitle') || 'Annual Projection';
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={annualAchievementPercent}
                      sliceColor="#10b981"
                      remainingColor="rgba(255, 255, 255, 0.08)"
                      title={`${annualProjectionTitle}: ${annualAchievementPercent}%`}
                      label={`${annualAchievementPercent}%`}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        {t('incomeHeader.projectionNext12Months') || 'Projection (Next 12 months):'}
                      </div>
                      <div style={{ fontSize: '0.94rem', fontWeight: '800', color: '#10b981' }}>
                        {formatCurrency(annualTotalIncome)}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                        {t('incomeHeader.annualTarget', { amount: formatCurrency(annualTarget) }) || `annual target ${formatCurrency(annualTarget)}`}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 3: ATUAL (PieChart Donut SVG de Atingimento do Target) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('incomeHeader.currentTitle') || 'ATUAL'}
              </div>
              {(() => {
                const targetReachedLabel = t('incomeHeader.targetReached', { percent: targetPercent }) || `${targetPercent}% do target`;
                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <DonutChart
                      percent={targetPercent}
                      sliceColor="#10b981"
                      remainingColor="rgba(16, 185, 129, 0.2)"
                      title={targetReachedLabel}
                      label={`${targetPercent}%`}
                    />

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('incomeHeader.receivedTotalLabel') || 'recebidos:'}</span>
                        <strong style={{ color: '#10b981', fontSize: '0.86rem' }}>{formatCurrency(totalReceived)}</strong>
                      </div>
                      <div style={{ fontSize: '0.76rem', color: 'var(--text-main)', fontWeight: '600', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{t('incomeHeader.targetLabel') || 'target:'}</span>
                        <strong style={{ color: '#06b6d4', fontSize: '0.86rem' }}>{formatCurrency(targetAmount)}</strong>
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                        {t('incomeHeader.targetReached', { percent: targetPercent }) || `${targetPercent}% do target atingido`}
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
              const label = format(d, 'MMM', { locale: dateLocale }).replace('.', '').toUpperCase();
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

            const { diffPercentStr, isDiffPositive, currentMonthTotal } = computeMonthDiff(last7Months);
            const annualProj = (currentMonthTotal > 0 ? currentMonthTotal : monthTotalIncome) * 12;

            return (
              <BarChart7Months
                months={last7Months}
                chartTitle={t('incomeHeader.chartTitle') || 'INCOME VOLUME EVOLUTION (LAST 6 MONTHS + CURRENT MONTH)'}
                monthVsPrevLabel={t('incomeHeader.monthVsPrevMonth') || 'This month vs previous month:'}
                diffPercentStr={diffPercentStr}
                isGoodChange={isDiffPositive}
                goodColor="#10b981"
                sparklesLabel={t('incomeHeader.annualProjectionLabel') || 'Annual projection:'}
                projection={annualProj}
                sparklesColor="#10b981"
                projectionColor="#10b981"
                currentGradient="linear-gradient(180deg, #10b981 0%, #059669 100%)"
                mutedGradientTop="rgba(16, 185, 129, 0.6)"
                mutedGradientBottom="rgba(16, 185, 129, 0.3)"
                currentTextColor="#10b981"
              />
            );
          })()}
        </div>
      )}
    </div>
  );
}
