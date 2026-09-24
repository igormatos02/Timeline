import React, { useState, useMemo } from 'react';
import {
  Plus,
  Settings,
  Layers,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/formatCurrency';
import { ExpenseEventCategory } from '../../../shared/enums/ExpensesEventCategory.js';
import {
  EventType,
  EventStatus,
  isCancelledStatus,
  isPositiveStatus,
  TimelineColor,
  TimelineType,
  isLoanTimelineType,
  normalizeTimelineType,
  LoanEventCategory,
  AmortizationEventCategory
} from '../../enums/index.js';
import { TIMELINE_COLOR_PRESETS, getPaletteTheme } from '../../../shared/config/colorPalettes.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import IncomeEvolutionChart from '../IncomeEvolutionChart.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

import EntityViewSwitch from '../ui/EntityViewSwitch.jsx';

export default function ExpenseTimelineHeader({
  timeline,
  timeboard = null,
  computeStartDate = null,
  allTimelines = [],
  events = [],
  allEvents = [],
  filteredEvents,
  selectedExpenseCategories = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode,
  selectedEntityId,
  isIndividualView,
  onToggleIndividualView
}) {
  const { t, language } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);
  const [chartMode, setChartMode] = useState('realized');
  const dateLocale = language === 'en' ? enUS : pt;

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

  const paletteTheme = useMemo(() => {
    return getPaletteTheme(timeline?.color, TimelineColor.EXPENSE);
  }, [timeline?.color]);

  if (!timeline) return null;

  const headerColor = paletteTheme.primary;
  const metrics = timeline.metrics || {};

  const isFiltered = (selectedExpenseCategories && selectedExpenseCategories.length > 0) || (filteredEvents !== undefined);
  const eventsList = (isFiltered && filteredEvents) ? filteredEvents : (events && events.length > 0 ? events : (timeline.events || []));
  const currentMonthStr = new Date().toISOString().substring(0, 7);

  // DTO vindo da Stored Procedure SQL Supabase get_expense_timeline_metrics (usado apenas se não estiver filtrado)
  const dto = !isFiltered ? (timeline.expenseHeaderResult || timeline.procedureMetrics || metrics.expenseHeaderResult) : null;

  // 1. GASTOS POR CATEGORIA (Calculado com base nos eventos visíveis na UI)
  const validEnumValues = Object.values(ExpenseEventCategory);
  let uiTotalExp = 0;
  let uiTotalInc = 0;
  const currentMonthCategoryTotals = {};
  const allCategoryTotals = {};

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
    const isExpense = ev.eventType === EventType.EXPENSE || ev.isExpense;
    const isIncome = ev.eventType === EventType.INCOME || ev.isIncome;

    if (isExpense) {
      const amt = Number(ev.amount || 0);
      let cat = (ev.category || '').toLowerCase();
      if (!validEnumValues.includes(cat)) {
        cat = ExpenseEventCategory.OTHER;
      }
      allCategoryTotals[cat] = (allCategoryTotals[cat] || 0) + amt;

      if (ev.date.startsWith(currentMonthStr)) {
        uiTotalExp += amt;
        currentMonthCategoryTotals[cat] = (currentMonthCategoryTotals[cat] || 0) + amt;
      }
    } else if (isIncome && ev.date.startsWith(currentMonthStr)) {
      uiTotalInc += Number(ev.amount || 0);
    }
  });

  let monthTotalExpense = dto?.current_month_expense ?? uiTotalExp;
  let monthTotalIncome = dto?.current_month_income ?? uiTotalInc;

  // Extrair lista de categorias diretamente do DTO ou dos eventos da UI
  let categoryList = (!isFiltered && dto?.categories_breakdown && dto.categories_breakdown.length > 0)
    ? dto.categories_breakdown.map((item) => ({
        rawCat: item.category,
        name: item.category,
        amount: Number(item.amount || 0),
        percent: Number(item.percent || 0)
      }))
    : [];

  if (categoryList.length === 0) {
    const targetCategoryTotals = Object.keys(currentMonthCategoryTotals).length > 0 ? currentMonthCategoryTotals : allCategoryTotals;
    const targetTotal = Object.values(targetCategoryTotals).reduce((sum, val) => sum + val, 0);

    categoryList = Object.entries(targetCategoryTotals)
      .filter(([cat]) => validEnumValues.includes(cat))
      .map(([cat, amt]) => ({
        rawCat: cat,
        name: cat,
        amount: amt,
        percent: targetTotal > 0 ? Math.round((amt / targetTotal) * 100) : 0
      }))
      .sort((a, b) => b.amount - a.amount);
  }

  // 2. COMPROMETIMENTO ANUAL: do mês atual até +12 meses
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
    ...(eventsList || [])
  ];
  for (const ev of rawEventsList) {
    if (!ev) continue;
    const key = ev.id || `${ev.date}-${ev.title}-${ev.amount}`;
    seenEventMap.set(key, ev);
  }
  const allBoardEvents = Array.from(seenEventMap.values());

  let annualTotalExpense = 0;
  let annualTotalIncome = 0;

  allBoardEvents.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
    const evMonthKey = ev.date.substring(0, 7);

    if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
      const isWithdrawal = ev.eventType === EventType.WITHDRAWAL || Boolean(ev.isWithdrawal);
      const isVirtualWithdrawal = Boolean(ev.isVirtualWithdrawal) || (ev.id && String(ev.id).startsWith('virtual_withdrawal_'));
      if (isWithdrawal && ev.id && seenEventMap.has(`virtual_withdrawal_${ev.id}`)) {
        return;
      }

      const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timelineOriginId || ev.timeline_id || '')) || ev.timelineType;
      const isExpense = ((ev.eventType === EventType.EXPENSE || ev.isExpense || tlType === TimelineType.EXPENSE) && !isWithdrawal && !isVirtualWithdrawal);
      const isIncome = (isWithdrawal || isVirtualWithdrawal || ev.eventType === EventType.INCOME || ev.isIncome || tlType === TimelineType.INCOME) && !isExpense;

      if (isExpense) {
        annualTotalExpense += Number(ev.amount || 0);
      } else if (isIncome) {
        annualTotalIncome += Number(ev.amount || 0);
      }
    }
  });

  if (annualTotalIncome === 0) {
    const monthlyBudget = timeline.monthlyBudget || metrics.monthlyBudget || 0;
    const monthlyIncomeTarget = monthTotalIncome > 0 ? monthTotalIncome : (dto?.monthly_budget || monthlyBudget || 0);
    annualTotalIncome = monthlyIncomeTarget * 12;
  }

  const annualCommitmentPercent = annualTotalIncome > 0 ? Math.min(100, Math.round((annualTotalExpense / annualTotalIncome) * 100)) : 0;

  // 3. ACUMULAÇÃO ATUAL & GASTOS PLANEADOS (Ano Corrente)
  const balanceTimeline = (allTimelines || []).find((tl) => tl && tl.type === TimelineType.BALANCE);
  const timeboardComputeStart = timeboard?.computeFrom || timeboard?.compute_from;
  const balanceComputeStart = balanceTimeline?.computeStartDate || balanceTimeline?.compute_start_date || balanceTimeline?.computeFrom || balanceTimeline?.compute_from;
  const ownComputeStart = timeline?.computeStartDate || timeline?.compute_start_date || timeline?.computeFrom || timeline?.compute_from || timeline?.startDate || timeline?.start_date;
  const rawComputeStart = computeStartDate || timeboardComputeStart || balanceComputeStart || ownComputeStart;

  const computeFromMonth = rawComputeStart
    ? (String(rawComputeStart) === '1900-01' || String(rawComputeStart).startsWith('1900-01') || String(rawComputeStart) === 'all' ? '1900-01' : String(rawComputeStart).substring(0, 7))
    : '1900-01';

  const currentCalendarYear = new Date().getFullYear().toString();

  const monthlyTotalsRealized = new Map();

  allBoardEvents.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted) return;
    if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED || ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida || ev.status === 'Abatida') return;

    const evMonthKey = ev.date.substring(0, 7);
    const isAfterStart = !computeFromMonth || computeFromMonth === '1900-01' || evMonthKey >= computeFromMonth;
    const isUpToCurrentMonth = evMonthKey <= currentMonthStr;

    if (!isAfterStart || !isUpToCurrentMonth) return;

    const isWithdrawal = ev.eventType === EventType.WITHDRAWAL || Boolean(ev.isWithdrawal);
    const isVirtualWithdrawal = Boolean(ev.isVirtualWithdrawal) || (ev.id && String(ev.id).startsWith('virtual_withdrawal_'));
    if (isWithdrawal && ev.id && seenEventMap.has(`virtual_withdrawal_${ev.id}`)) {
      return;
    }

    const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timelineOriginId || ev.timeline_id || '')) || ev.timelineType;
    const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== AmortizationEventCategory.REDUCE_TERM && ev.category !== AmortizationEventCategory.REDUCE_INSTALLMENT);
    const isLoan = isLoanInstallment || ev.eventType === EventType.LOAN || ev.eventType === EventType.AMORTIZATION || ev.isLoan || isLoanTimelineType(tlType);
    const isInvestment = !isWithdrawal && !isVirtualWithdrawal && (ev.eventType === EventType.INVESTMENT || ev.isInvestment || tlType === TimelineType.INVESTMENT || Boolean(ev.pocketId || ev.pocket_id));
    const isExpense = ((ev.eventType === EventType.EXPENSE || ev.isExpense || tlType === TimelineType.EXPENSE) && !isLoan && !isInvestment && !isWithdrawal && !isVirtualWithdrawal);
    const isIncome = (isWithdrawal || isVirtualWithdrawal || ev.eventType === EventType.INCOME || ev.isIncome || tlType === TimelineType.INCOME) && !isLoan && !isInvestment && !isExpense;

    const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
    const amt = isLoanInstallment
      ? Math.abs(Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0)))
      : Math.abs(Number(ev.amount || 0));

    if (!monthlyTotalsRealized.has(evMonthKey)) {
      monthlyTotalsRealized.set(evMonthKey, { income: 0, expense: 0, loan: 0, investmentDeduction: 0 });
    }
    const mRealized = monthlyTotalsRealized.get(evMonthKey);
    const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted) || ev.status === EventStatus.WITHDRAWN;

    if (isIncome && isRealized) mRealized.income += amt;
    else if (isExpense && isRealized) mRealized.expense += amt;
    else if (isLoan && isRealized) mRealized.loan += amt;
    else if (isInvestment && !isExternal && isRealized) mRealized.investmentDeduction += amt;
  });

  let accumulatedRealizedBalance = 0;
  monthlyTotalsRealized.forEach((mData) => {
    const monthNet = mData.income - (mData.expense + mData.loan + mData.investmentDeduction);
    accumulatedRealizedBalance += monthNet;
  });

  const incomeTimeline = (allTimelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.INCOME);
  const incomeInitialValue = Number(incomeTimeline?.initialValue ?? incomeTimeline?.initial_value ?? 0);
  const ownInitialValue = Number(timeline.initialValue ?? timeline.initial_value ?? 0);
  const initialValueAmount = incomeInitialValue || ownInitialValue;
  const currentAccumulation = initialValueAmount + accumulatedRealizedBalance;

  // Gastos Planeados e Pagos do Ano Corrente (Jan - Dez)
  let calendarYearPlannedExpense = 0;
  let calendarYearPaidExpense = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
    const evMonthKey = ev.date.substring(0, 7);
    if (computeFromMonth && computeFromMonth !== '1900-01' && computeFromMonth !== 'all' && evMonthKey < computeFromMonth) return;
    const isExpense = ev.eventType === EventType.EXPENSE || ev.isExpense;
    if (isExpense && ev.date.startsWith(currentCalendarYear)) {
      const isPaid = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
      const amt = Math.abs(Number(ev.amount || 0));

      calendarYearPlannedExpense += amt;
      if (isPaid) {
        calendarYearPaidExpense += amt;
      }
    }
  });

  if (calendarYearPlannedExpense === 0 && calendarYearPaidExpense > 0) {
    calendarYearPlannedExpense = calendarYearPaidExpense;
  }

  const calendarYearPaidPercent = calendarYearPlannedExpense > 0
    ? Math.min(100, Math.round((calendarYearPaidExpense / calendarYearPlannedExpense) * 100))
    : 0;
  const calendarYearToPayPercent = Math.max(0, 100 - calendarYearPaidPercent);

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
                background: 'rgba(99, 102, 241, 0.1)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
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
      {/* Conteúdo Expandido com Métricas de Despesas */}
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
                  <span>{t('expenseHeader.summaryView')}</span>
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
                  <span>{t('expenseHeader.evolutionView')}</span>
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
                {/* Quadrante 1: GASTOS POR CATEGORIA (PieChart SVG & Legenda) */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('expenseHeader.categoriesTitle')}
                  </div>
                  {(() => {
                    const categoryColors = paletteTheme.colors && paletteTheme.colors.length > 1 ? paletteTheme.colors : TIMELINE_COLOR_PRESETS;

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
                              {t('expenseHeader.noExpenses')}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                              {t('expenseHeader.noExpensesHint')}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const items = categoryList.map((c, i) => ({
                      ...c,
                      color: categoryColors[i % categoryColors.length],
                      title: `${t(`expenseCategories.${c.name}`) || c.name}: ${c.percent}%`
                    }));

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                        <PieDonut items={items} centerFontSize="0.66rem" />
                        <DonutLegend
                          items={items}
                          nameFormatter={(item) => t(`expenseCategories.${item.name}`) || item.name}
                        />
                      </div>
                    );
                  })()}
                </div>

                {/* Quadrante 2: COMPROMETIMENTO ANUAL (PieChart Donut SVG Anual) */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('expenseHeader.annualCommitmentTitle')}
                  </div>
                  {(() => {
                    if (annualTotalExpense === 0 && annualTotalIncome === 0) {
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
                              {t('expenseHeader.noAnnualCommitment')}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>
                              {t('expenseHeader.noAnnualCommitmentHint')}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    const sliceColor = annualCommitmentPercent > 85 ? TimelineColor.DANGER : paletteTheme.primary;

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                        <DonutChart
                          percent={annualCommitmentPercent}
                          sliceColor={sliceColor}
                          remainingColor="rgba(255, 255, 255, 0.08)"
                          title={`${t('expenseHeader.annualCommitmentLabel')} ${annualCommitmentPercent}%`}
                          label={`${annualCommitmentPercent}%`}
                        />

                        {/* Informações Numéricas de Gastos vs Entradas Anuais */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1 }}>
                          <div style={{ fontSize: '0.76rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                            {t('expenseHeader.annualCommitmentLabel')}
                          </div>
                          <div style={{ fontSize: '0.94rem', fontWeight: '800', color: 'var(--text-main)' }}>
                            {formatCurrency(annualTotalExpense)}
                          </div>
                          {annualTotalIncome > 0 ? (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {t('expenseHeader.ofAnnualTotal', { amount: formatCurrency(annualTotalIncome) })}
                            </div>
                          ) : (
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {t('expenseHeader.projectedNext12Months')}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Quadrante 3: ACUMULAÇÃO ATUAL & GASTOS PLANEADOS (Balanço + Initial Value & Donut Chart Jan - Dez) */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('expenseHeader.currentAccumulationTitle')}
                      </span>
                      <span style={{ fontSize: '0.96rem', fontWeight: '800', color: currentAccumulation >= 0 ? TimelineColor.SUCCESS : TimelineColor.DANGER }}>
                        {formatCurrency(currentAccumulation)}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.74rem' }}>
                      <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                        {t('expenseHeader.plannedYearLabel', { year: currentCalendarYear })}
                      </span>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.86rem' }}>
                        {formatCurrency(calendarYearPlannedExpense)}
                      </strong>
                    </div>
                  </div>
                  {(() => {
                    const paidPct = calendarYearPaidPercent;
                    const toPayPct = calendarYearToPayPercent;

                    const accumulationItems = [
                      {
                        name: t('expenseHeader.paidYearLabel', { year: currentCalendarYear }),
                        percent: paidPct,
                        color: paletteTheme.primary
                      },
                      {
                        name: t('expenseHeader.totalToPayYearLabel', { year: currentCalendarYear }),
                        percent: toPayPct,
                        color: paletteTheme.light || TimelineColor.SLATE
                      }
                    ];

                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                        <PieDonut items={accumulationItems} centerLabel={`${paidPct}%`} centerColor={paletteTheme.primary} />
                        <DonutLegend items={accumulationItems} />
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Rodapé com Comparações, Projeção Anual & Gráfico de Colunas dos últimos 6 meses + mês atual */}
              {(() => {
                // Gerar estrutura dos últimos 6 meses + mês atual (total 7 meses)
                const currentDateObj = new Date();
                const last7Months = [];
                for (let i = 6; i >= 0; i--) {
                  const year = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getFullYear();
                  const month = new Date(currentDateObj.getFullYear(), currentDateObj.getMonth() - i, 1).getMonth() + 1;
                  const monthStr = String(month).padStart(2, '0');
                  const key = `${year}-${monthStr}`;

                  const d = new Date(year, month - 1, 1);
                  const label = format(d, 'MMM', { locale: dateLocale }).replace('.', '').toUpperCase();
                  const isNotComputed = Boolean(computeFromMonth && computeFromMonth !== '1900-01' && computeFromMonth !== 'all' && key < computeFromMonth);
                  last7Months.push({ key, label, total: 0, isNotComputed });
                }

                // Calcular volume de despesas de cada um dos 7 meses
                eventsList.forEach((ev) => {
                  if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
                  const isExpense = ev.eventType === EventType.EXPENSE || ev.isExpense;
                  if (isExpense) {
                    const isPaid = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
                    if (chartMode === 'realized' && !isPaid) return;

                    const evKey = ev.date.substring(0, 7);
                    if (computeFromMonth && computeFromMonth !== '1900-01' && computeFromMonth !== 'all' && evKey < computeFromMonth) return;
                    const foundMonth = last7Months.find((m) => m.key === evKey);
                    if (foundMonth) {
                      foundMonth.total += Math.abs(Number(ev.amount || 0));
                    }
                  }
                });

                const { diffPercentStr, isDiffPositive } = computeMonthDiff(last7Months);
                const isDiffNegative = diffPercentStr === '0,0%' || !isDiffPositive;

                // Projeção anual calculada a partir da soma real dos eventos projetados nos próximos 12 meses
                const annualProj = annualTotalExpense;

                return (
                  <BarChart7Months
                    months={last7Months}
                    chartTitle={t('expenseHeader.chartTitle')}
                    monthVsPrevLabel={t('expenseHeader.monthVsPrevMonth')}
                    diffPercentStr={diffPercentStr}
                    isGoodChange={isDiffNegative}
                    goodColor={TimelineColor.SUCCESS}
                    badColor={paletteTheme.primary}
                    sparklesLabel={t('expenseHeader.annualProjection')}
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
