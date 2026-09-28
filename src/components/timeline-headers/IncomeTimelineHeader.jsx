import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Layers,
  Settings
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  EventStatus,
  isCancelledStatus,
  isPositiveStatus,
  TimelineColor,
  TIMELINE_COLOR_PRESETS,
  TimelineType,
  IncomeEventCategory,
  MovementKind
} from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { classifyMovement } from '../../../shared/finance/movements.js';
import { computeMonthlyFlows, sumMonthlyFlows } from '../../../shared/finance/financialPosition.js';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import IncomeEvolutionChart from '../IncomeEvolutionChart.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';
import { getPaletteTheme } from '../../../shared/config/colorPalettes.js';
import EntityViewSwitch from '../ui/EntityViewSwitch.jsx';
import { useHeaderCollapsed } from '../../context/TimeboardContext.jsx';

// 'yyyy-MM' of the month before `monthKey`
const prevMonthKey = (monthKey) => {
  const [y, m] = monthKey.split('-').map(Number);
  return m === 1 ? `${y - 1}-12` : `${y}-${String(m - 1).padStart(2, '0')}`;
};

export default function IncomeTimelineHeader({
  timeline,
  timeboard = null,
  allTimelines = [],
  events = [],
  allEvents = [],
  filteredEvents,
  selectedCategoryFilter,
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode,
  computeStartDate = null,
  selectedEntityId,
  isIndividualView,
  onToggleIndividualView
}) {
  const { t, language } = useTranslation();
  const [collapsed, setIsCollapsed] = useHeaderCollapsed();
  const [chartMode, setChartMode] = useState('realized');
  const dateLocale = language === 'en' ? enUS : pt;

  const paletteTheme = useMemo(() => getPaletteTheme(timeline?.color, TimelineColor.INCOME), [timeline?.color]);

  // Mapa rápido de id -> tipo de timeline para classificação precisa
  const timelineTypeMap = useMemo(() => {
    const map = new Map();
    (allTimelines || []).forEach((tl) => {
      if (tl && tl.id) {
        map.set(String(tl.id), tl.type);
      }
    });
    return map;
  }, [allTimelines]);

  // Income owned by this timeline (references such as a savings withdrawal shown here are excluded)
  const isOwnIncome = (ev) => {
    const movement = classifyMovement(ev, timelineTypeMap);
    return movement.kind === MovementKind.INCOME && !movement.isReference;
  };

  if (!timeline) return null;

  const headerColor = timeline.color || TimelineColor.INCOME;
  const isFiltered = (selectedCategoryFilter && selectedCategoryFilter !== EventStatus.ALL) || (filteredEvents !== undefined);

  const eventsList = (isFiltered && filteredEvents) ? filteredEvents : (timeline.events || events || []);
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // 1. RENDIMENTOS POR ORIGEM / CATEGORIA & TOTAL DO MÊS
  const validEnumValues = Object.values(IncomeEventCategory);
  const getCategoryLabel = (cat) => t(`incomeCategories.${cat}`);

  // 2. CONSUMO / COMPROMETIMENTO DA ENTRADA (Janela de 12 meses a partir de hoje)
  const startDateObj = new Date();
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth();
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;
  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12;
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;

  // Coletar eventos únicos de todos os tracks para cálculo de consumo cruzado e acumulação
  const seenEventMap = new Map();
  const rawEventsList = [
    ...(allTimelines || []).flatMap((tl) => tl.events || []),
    ...(allEvents || []),
    ...eventsList
  ];
  for (const ev of rawEventsList) {
    if (!ev) continue;
    const key = ev.id || `${ev.date}-${ev.title}-${ev.amount}`;
    seenEventMap.set(key, ev);
  }
  const allBoardEvents = Array.from(seenEventMap.values());

  // Month-by-month flows of the whole board from the shared financial engine: references (e.g. the
  // withdrawal shown in this timeline) never count twice, and savings expenses / costs stay in the savings
  const boardFlows = computeMonthlyFlows({ events: allBoardEvents, timelineTypeMap });

  // Next 12 months (all planned movements): money coming into the available money vs what it is committed to
  const next12 = sumMonthlyFlows(boardFlows, { fromMonth: startMonthKey, toMonth: prevMonthKey(endMonthKey), side: 'projected' });
  const annualTotalIncome = next12.income + next12.allWithdrawals;
  const annualLoans = next12.installments + next12.amortizations;
  const annualExpenses = next12.expensesFromAvailable;
  const annualInvestments = next12.depositsInternal;

  const annualCommitted = annualLoans + annualExpenses + annualInvestments;
  const commitmentPercent = annualTotalIncome > 0
    ? Math.round((annualCommitted / annualTotalIncome) * 100)
    : (annualCommitted > 0 ? 100 : 0);
  const availableAmount = Math.max(0, annualTotalIncome - annualCommitted);
  const availablePercent = Math.max(0, 100 - commitmentPercent);

  const getConsumptionColor = (pct) => {
    if (pct <= 30) return TimelineColor.EMERALD;
    if (pct <= 50) return TimelineColor.CYAN;
    if (pct <= 75) return TimelineColor.WARNING;
    return TimelineColor.DANGER;
  };
  const consumptionColor = getConsumptionColor(commitmentPercent);

  // 3. ACUMULAÇÃO ATUAL & PROJETADA (Soma dos Balanços mensais desde computeFrom do Timeboard até o final do ano corrente + Valor Inicial da Timeline)
  const balanceTimeline = (allTimelines || []).find((tl) => tl && tl.type === TimelineType.BALANCE);
  const timeboardComputeStart = timeboard?.computeFrom || timeboard?.compute_from;
  const balanceComputeStart = balanceTimeline?.computeStartDate || balanceTimeline?.compute_start_date || balanceTimeline?.computeFrom || balanceTimeline?.compute_from;
  const ownComputeStart = timeline?.computeStartDate || timeline?.compute_start_date || timeline?.computeFrom || timeline?.compute_from || timeline?.startDate || timeline?.start_date;
  const rawComputeStart = computeStartDate || timeboardComputeStart || balanceComputeStart || ownComputeStart;

  const computeFromMonth = rawComputeStart
    ? (String(rawComputeStart) === '1900-01' || String(rawComputeStart).startsWith('1900-01') || String(rawComputeStart) === EventStatus.ALL ? '1900-01' : String(rawComputeStart).substring(0, 7))
    : '1900-01';

  const currentCalendarYear = new Date().getFullYear().toString();
  const endOfYearMonthStr = `${currentCalendarYear}-12`;

  // Accumulation of the available money: realized up to the current month, projected up to the end of the year
  const accumulationFrom = computeFromMonth === '1900-01' ? null : computeFromMonth;
  const accumulatedRealizedBalance = sumMonthlyFlows(boardFlows, { fromMonth: accumulationFrom, toMonth: currentMonthStr, side: 'realized' }).availableNet;
  const accumulatedProjectedBalance = sumMonthlyFlows(boardFlows, { fromMonth: accumulationFrom, toMonth: endOfYearMonthStr, side: 'projected' }).availableNet;

  const initialValueAmount = Number(timeline.initialValue ?? timeline.initial_value ?? 0);
  const currentAccumulation = initialValueAmount + accumulatedRealizedBalance;
  const currentProjectedAccumulation = initialValueAmount + accumulatedProjectedBalance;

  // 1. RENDIMENTOS POR ORIGEM: income of the current year by category (from the calculation start),
  // so categories that only occur in some months (e.g. a yearly reserve fund) are also shown
  let yearTotalIncome = 0;
  const categoryTotals = {};
  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
    const evMonthKey = ev.date.substring(0, 7);
    if (computeFromMonth && computeFromMonth !== '1900-01' && evMonthKey < computeFromMonth) return;
    if (!isOwnIncome(ev) || !ev.date.startsWith(currentCalendarYear)) return;
    const amt = Math.abs(Number(ev.amount || 0));
    yearTotalIncome += amt;
    let cat = (ev.category || '').toLowerCase();
    if (!validEnumValues.includes(cat)) {
      cat = IncomeEventCategory.OTHER;
    }
    categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
  });

  const categoryList = Object.entries(categoryTotals)
    .map(([cat, amt]) => ({
      rawCat: cat,
      name: getCategoryLabel(cat),
      amount: amt,
      percent: yearTotalIncome > 0 ? Math.round((amt / yearTotalIncome) * 100) : 0
    }))
    .sort((a, b) => b.amount - a.amount);

  // Projeção do Ano Corrente (Jan - Dez) para o PieDonut do Quadrante 3
  let calendarYearProjectedIncome = 0;
  let calendarYearReceivedIncome = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
    const evMonthKey = ev.date.substring(0, 7);
    if (computeFromMonth && computeFromMonth !== '1900-01' && computeFromMonth !== EventStatus.ALL && evMonthKey < computeFromMonth) return;
    if (isOwnIncome(ev) && ev.date.startsWith(currentCalendarYear)) {
      const isReceived = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
      const amt = Math.abs(Number(ev.amount || 0));

      calendarYearProjectedIncome += amt;
      if (isReceived) {
        calendarYearReceivedIncome += amt;
      }
    }
  });

  if (calendarYearProjectedIncome === 0 && calendarYearReceivedIncome > 0) {
    calendarYearProjectedIncome = calendarYearReceivedIncome;
  }

  const calendarYearPercent = calendarYearProjectedIncome > 0
    ? Math.min(100, Math.round((calendarYearReceivedIncome / calendarYearProjectedIncome) * 100))
    : 0;

  return (
    <HeaderShell
      timeline={timeline}
      collapsed={collapsed}
      onToggle={() => setIsCollapsed(!collapsed)}
      headerColor={headerColor}
      left={
        <HeaderTitleBlock
          color={headerColor}
          name={timeline.name}
          description={timeline.description}
          id={timeline.id}
        />
      }
      right={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <EntityViewSwitch
            selectedEntityId={selectedEntityId}
            isIndividualView={isIndividualView}
            onToggle={onToggleIndividualView}
          />
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('common.edit')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                background: 'var(--bg-app)',
                border: '1px solid var(--border-glass-glow)',
                color: 'var(--primary-light)',
                cursor: 'pointer',
                padding: '6px 12px',
                borderRadius: '8px',
                fontSize: '0.78rem',
                fontWeight: '600',
                transition: 'background-color 0.15s ease, border-color 0.15s ease'
              }}
            >
              <Settings size={14} />
              <span>{t('common.edit')}</span>
            </button>
          )}
        </div>
      }
    >
      {/* Conteúdo Expandido */}
      {!collapsed && (
        <div style={{ paddingTop: '14px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Alternador de Modo de Visão */}
          {setActiveViewMode && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '14px' }}>
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
                    background: activeViewMode === 'summary' ? `${paletteTheme.primary}2e` : 'transparent',
                    color: activeViewMode === 'summary' ? paletteTheme.primary : 'var(--text-muted)'
                  }}
                >
                  <Layers size={13} />
                  <span>{t('incomeHeader.summaryView')}</span>
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
                    background: activeViewMode === 'graph' ? `${paletteTheme.primary}2e` : 'transparent',
                    color: activeViewMode === 'graph' ? paletteTheme.primary : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>{t('incomeHeader.evolutionView')}</span>
                </button>
              </div>
            </div>
          )}

          {activeViewMode === 'graph' ? (
            <IncomeEvolutionChart
              timeline={timeline}
              allTimelines={allTimelines}
              events={eventsList}
              computeStartDate={computeStartDate}
            />
          ) : (
            <>
              {/* Grid Principal 2x2 */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* Quadrante 1: RENDIMENTOS POR ORIGEM (PieChart SVG & Legenda) */}
                <div style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('incomeHeader.sourcesTitleYear', { year: currentCalendarYear })}
                  </div>
                  {(() => {
                    const categoryColors = paletteTheme.colors && paletteTheme.colors.length > 1 ? paletteTheme.colors : TIMELINE_COLOR_PRESETS;

                    if (!categoryList || categoryList.length === 0) {
                      return (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                          <div style={{ position: 'relative', width: '76px', height: '76px', flexShrink: 0 }}>
                            <svg viewBox="-1 -1 2 2" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                              <circle cx="0" cy="0" r="0.82" fill="none" stroke="var(--border-glass)" strokeWidth="0.25" strokeDasharray="3 3" />
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
                                background: 'var(--bg-card)',
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
                              {t('incomeHeader.noIncome')}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                              {t('incomeHeader.noIncomeHint')}
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
                        <PieDonut items={items} centerColor={paletteTheme.primary} />
                        <DonutLegend items={items} />
                      </div>
                    );
                  })()}
                </div>

                {/* Quadrante 2: CONSUMO DA ENTRADA (Donut Chart de Comprometimento) */}
                <div style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('incomeHeader.incomeConsumptionTitle')}
                  </div>
                  {(() => {
                    const consumptionItems = [
                      {
                        name: t('incomeHeader.committedLabel'),
                        percent: Math.min(100, commitmentPercent),
                        color: consumptionColor
                      },
                      {
                        name: t('incomeHeader.freeAvailableLabel'),
                        percent: availablePercent,
                        color: TimelineColor.SUCCESS
                      }
                    ];

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                        <PieDonut items={consumptionItems} centerLabel={`${commitmentPercent}%`} centerColor={consumptionColor} />
                        <DonutLegend items={consumptionItems} />
                      </div>
                    );
                  })()}
                </div>

                {/* Quadrante 3: ACUMULAÇÃO ATUAL & PROJETADA (Balanço + Initial Value & Donut Chart Jan - Dez) */}
                <div style={{ background: 'var(--bg-app)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('incomeHeader.currentAccumulationTitle')}
                      </span>
                      <span style={{ fontSize: '0.96rem', fontWeight: '800', color: currentAccumulation >= 0 ? TimelineColor.SUCCESS : TimelineColor.DANGER }}>
                        {formatCurrency(currentAccumulation)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                        {t('incomeHeader.projectedAccumulationLabel', { year: currentCalendarYear })}
                      </span>
                      <strong style={{ color: currentProjectedAccumulation >= 0 ? TimelineColor.SUCCESS : TimelineColor.DANGER, fontSize: '0.86rem' }}>
                        {formatCurrency(currentProjectedAccumulation)}
                      </strong>
                    </div>
                  </div>
                  {(() => {
                    const receivedPct = calendarYearPercent;
                    const toReceivePct = Math.max(0, 100 - receivedPct);

                    const accumulationItems = [
                      {
                        name: t('incomeHeader.receivedYearLabel', { year: currentCalendarYear }),
                        percent: receivedPct,
                        color: paletteTheme.primary
                      },
                      {
                        name: t('incomeHeader.totalToReceiveYearLabel', { year: currentCalendarYear }),
                        percent: toReceivePct,
                        color: paletteTheme.light || paletteTheme.secondary
                      }
                    ];

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                        <PieDonut items={accumulationItems} centerLabel={`${receivedPct}%`} centerColor={paletteTheme.primary} />
                        <DonutLegend items={accumulationItems} />
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
                  const isNotComputed = Boolean(computeFromMonth && computeFromMonth !== '1900-01' && computeFromMonth !== EventStatus.ALL && key < computeFromMonth);
                  last7Months.push({ key, label, total: 0, isNotComputed });
                }

                eventsList.forEach((ev) => {
                  if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
                  const evMonthKey = ev.date.substring(0, 7);
                  if (computeFromMonth && computeFromMonth !== '1900-01' && computeFromMonth !== EventStatus.ALL && evMonthKey < computeFromMonth) return;

                  if (isOwnIncome(ev)) {
                    const isReceived = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
                    if (chartMode === 'realized' && !isReceived) return;

                    const foundMonth = last7Months.find((m) => m.key === evMonthKey);
                    if (foundMonth) {
                      foundMonth.total += Math.abs(Number(ev.amount || 0));
                    }
                  }
                });

                const { diffPercentStr, isDiffPositive } = computeMonthDiff(last7Months);
                const annualProj = availableAmount;

                return (
                  <BarChart7Months
                    months={last7Months}
                    chartTitle={t('incomeHeader.chartTitle')}
                    monthVsPrevLabel={t('incomeHeader.monthVsPrevMonth')}
                    diffPercentStr={diffPercentStr}
                    isGoodChange={isDiffPositive}
                    goodColor={paletteTheme.primary}
                    badColor={TimelineColor.DANGER}
                    middleLabel={t('incomeHeader.annualIncomingLabel')}
                    middleValue={annualTotalIncome}
                    middleColor={paletteTheme.primary}
                    sparklesLabel={t('incomeHeader.annualProjectionLabel')}
                    projection={annualProj}
                    sparklesColor={paletteTheme.primary}
                    projectionColor={paletteTheme.primary}
                    currentGradient={`linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`}
                    mutedGradientTop={paletteTheme.primary}
                    mutedGradientBottom={paletteTheme.secondary}
                    currentTextColor={paletteTheme.primary}
                    mode={chartMode}
                    onToggleMode={setChartMode}
                    accentColor={paletteTheme.primary}
                  />
                );
              })()}
            </>
          )}
        </div>
      )}
    </HeaderShell>
  );
}
