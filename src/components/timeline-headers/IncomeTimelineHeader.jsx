import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Layers,
  Settings,
  RotateCcw
} from 'lucide-react';
import { format } from 'date-fns';
import { enUS, pt } from 'date-fns/locale';
import { formatCurrency } from '../../utils/formatCurrency';
import { IncomeEventCategory } from '../../../shared/enums/IncomeEventCategory.js';
import { EventType, EventStatus, isCancelledStatus, isPositiveStatus, TimelineColor, TimelineType, isLoanTimelineType } from '../../enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { DonutChart, PieDonut, DonutLegend } from '../ui/DonutChart.jsx';
import BarChart7Months from '../ui/BarChart7Months.jsx';
import { computeMonthDiff } from '../../utils/timelineCharts.js';

export default function IncomeTimelineHeader({
  timeline,
  timeboard = null,
  allTimelines = [],
  events = [],
  allEvents = [],
  onEdit,
  onDelete,
  onAddEvent,
  onReset,
  activeViewMode = 'summary',
  setActiveViewMode,
  computeStartDate = null
}) {
  const { t, language } = useTranslation();
  const [collapsed, setIsCollapsed] = useState(false);
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

  if (!timeline) return null;

  const headerColor = timeline.color || TimelineColor.INCOME;
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
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
    const isIncome = ev.eventType === EventType.INCOME || ev.isIncome;
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
      if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
      const isIncome = ev.eventType === EventType.INCOME || ev.isIncome;
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

  // 2. CONSUMO / COMPROMETIMENTO DA ENTRADA (Janela de 12 meses a partir de hoje)
  const startDateObj = new Date();
  const startYear = startDateObj.getFullYear();
  const startMonth = startDateObj.getMonth();
  const startMonthKey = `${startYear}-${String(startMonth + 1).padStart(2, '0')}`;
  const endTotalMonths = startMonth + 12;
  const endYear = startYear + Math.floor(endTotalMonths / 12);
  const endMonthNum = endTotalMonths % 12;
  const endMonthKey = `${endYear}-${String(endMonthNum + 1).padStart(2, '0')}`;

  // Coletar eventos únicos de todos os tracks para cálculo de consumo cruzado
  const seenEventIds = new Set();
  const allBoardEvents = [];
  const rawEventsList = [
    ...(allEvents || []),
    ...eventsList,
    ...(allTimelines || []).flatMap((tl) => tl.events || [])
  ];
  for (const ev of rawEventsList) {
    if (!ev) continue;
    const key = ev.id || `${ev.date}-${ev.title}-${ev.amount}`;
    if (!seenEventIds.has(key)) {
      seenEventIds.add(key);
      allBoardEvents.push(ev);
    }
  }

  let annualTotalIncome = 0;
  let annualLoans = 0;
  let annualExpenses = 0;
  let annualInvestments = 0;

  allBoardEvents.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
    const evMonthKey = ev.date.substring(0, 7);
    if (evMonthKey >= startMonthKey && evMonthKey < endMonthKey) {
      const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timelineOriginId || ev.timeline_id || '')) || ev.timelineType;
      const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'parcela_emprestimo' || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');
      const isLoan = isLoanInstallment || ev.eventType === EventType.LOAN || ev.eventType === EventType.AMORTIZATION || ev.isLoan || ev.category === 'amortizacao' || isLoanTimelineType(tlType);
      const isInvestment = ev.eventType === EventType.INVESTMENT || ev.category === 'investimento_poupanca' || ev.category === 'investment' || ev.isInvestment || tlType === TimelineType.INVESTMENT;
      const isExpense = ((ev.eventType === EventType.EXPENSE || ev.category === 'saida_recorrente' || ev.category === 'expense' || ev.isExpense || tlType === TimelineType.EXPENSE) && !isLoan && !isInvestment);
      const isIncome = (ev.eventType === EventType.INCOME || ev.category === 'entrada_recorrente' || ev.category === 'income' || ev.isIncome || tlType === TimelineType.INCOME) && !isLoan && !isInvestment && !isExpense;

      const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
      const amt = isLoanInstallment
        ? Math.abs(Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0)))
        : Math.abs(Number(ev.amount || 0));

      if (isIncome) {
        annualTotalIncome += amt;
      } else if (isLoan) {
        annualLoans += amt;
      } else if (isExpense) {
        annualExpenses += amt;
      } else if (isInvestment && !isExternal && !ev.isFirstOccurrence) {
        annualInvestments += amt;
      }
    }
  });

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

  // 3. ACUMULAÇÃO ATUAL & PROJETADA (Soma dos Balanços mensais desde computeFrom do Timeboard até o mês atual + Valor Inicial da Timeline)
  const balanceTimeline = (allTimelines || []).find((tl) => tl && (tl.type === TimelineType.BALANCE || tl.type === 'balance'));
  const timeboardComputeStart = timeboard?.computeFrom || timeboard?.compute_from;
  const balanceComputeStart = balanceTimeline?.computeStartDate || balanceTimeline?.compute_start_date || balanceTimeline?.computeFrom || balanceTimeline?.compute_from;
  const ownComputeStart = timeline?.computeStartDate || timeline?.compute_start_date || timeline?.computeFrom || timeline?.compute_from;
  const rawComputeStart = computeStartDate || timeboardComputeStart || balanceComputeStart || ownComputeStart;

  const computeFromMonth = rawComputeStart
    ? (String(rawComputeStart) === '1900-01' || String(rawComputeStart).startsWith('1900-01') ? '1900-01' : String(rawComputeStart).substring(0, 7))
    : currentMonthStr;

  const monthlyTotalsRealized = new Map();
  const monthlyTotalsProjected = new Map();

  allBoardEvents.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted) return;
    if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED || ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida || ev.status === 'Abatida') return;

    const evMonthKey = ev.date.substring(0, 7);
    const isAfterStart = computeFromMonth === '1900-01' || evMonthKey >= computeFromMonth;
    const isUpToCurrentMonth = evMonthKey <= currentMonthStr;

    if (!isAfterStart || !isUpToCurrentMonth) return;

    if (!monthlyTotalsRealized.has(evMonthKey)) {
      monthlyTotalsRealized.set(evMonthKey, { income: 0, expense: 0, loan: 0, investmentDeduction: 0 });
    }
    if (!monthlyTotalsProjected.has(evMonthKey)) {
      monthlyTotalsProjected.set(evMonthKey, { income: 0, expense: 0, loan: 0, investmentDeduction: 0 });
    }

    const mRealized = monthlyTotalsRealized.get(evMonthKey);
    const mProjected = monthlyTotalsProjected.get(evMonthKey);

    const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timelineOriginId || ev.timeline_id || '')) || ev.timelineType;
    const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'parcela_emprestimo' || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');
    const isLoan = isLoanInstallment || ev.eventType === EventType.LOAN || ev.eventType === EventType.AMORTIZATION || ev.isLoan || ev.category === 'amortizacao' || isLoanTimelineType(tlType);
    const isInvestment = ev.eventType === EventType.INVESTMENT || ev.category === 'investimento_poupanca' || ev.category === 'investment' || ev.isInvestment || tlType === TimelineType.INVESTMENT;
    const isExpense = ((ev.eventType === EventType.EXPENSE || ev.category === 'saida_recorrente' || ev.category === 'expense' || ev.isExpense || tlType === TimelineType.EXPENSE) && !isLoan && !isInvestment);
    const isIncome = (ev.eventType === EventType.INCOME || ev.category === 'entrada_recorrente' || ev.category === 'income' || ev.isIncome || tlType === TimelineType.INCOME) && !isLoan && !isInvestment && !isExpense;

    const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
    const amt = isLoanInstallment
      ? Math.abs(Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0)))
      : Math.abs(Number(ev.amount || 0));

    const isRealized = isPositiveStatus(ev.status) || isPositiveStatus(ev.status?.toLowerCase()) || Boolean(ev.isCompleted);

    if (isIncome) {
      mProjected.income += amt;
      if (isRealized) mRealized.income += amt;
    } else if (isExpense) {
      mProjected.expense += amt;
      if (isRealized) mRealized.expense += amt;
    } else if (isLoan) {
      mProjected.loan += amt;
      if (isRealized) mRealized.loan += amt;
    } else if (isInvestment && !isExternal && !ev.isFirstOccurrence) {
      mProjected.investmentDeduction += amt;
      if (isRealized) mRealized.investmentDeduction += amt;
    }
  });

  let accumulatedRealizedBalance = 0;
  monthlyTotalsRealized.forEach((mData) => {
    const monthNet = mData.income - (mData.expense + mData.loan + mData.investmentDeduction);
    accumulatedRealizedBalance += monthNet;
  });

  let accumulatedProjectedBalance = 0;
  monthlyTotalsProjected.forEach((mData) => {
    const monthNet = mData.income - (mData.expense + mData.loan + mData.investmentDeduction);
    accumulatedProjectedBalance += monthNet;
  });

  const initialValueAmount = Number(timeline.initialValue ?? timeline.initial_value ?? 0);
  const currentAccumulation = initialValueAmount + accumulatedRealizedBalance;
  const currentProjectedAccumulation = initialValueAmount + accumulatedProjectedBalance;

  // Projeção do Ano Corrente (Jan - Dez) para o PieDonut do Quadrante 3
  const currentCalendarYear = new Date().getFullYear().toString();
  let calendarYearProjectedIncome = 0;
  let calendarYearReceivedIncome = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status)) return;
    const isIncome = ev.eventType === EventType.INCOME || ev.isIncome;
    if (isIncome && ev.date.startsWith(currentCalendarYear)) {
      const isReceived = ev.status === 'paid' || ev.status === 'received' || ev.status === 'completed' || ev.status === 'settled' || ev.isCompleted;
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
              <span>{t('incomeHeader.addIncome')}</span>
            </button>
          )}

          {onReset && (
            <button
              type="button"
              className="btn btn-outline-danger btn-sm"
              onClick={onReset}
              title={t('incomeHeader.resetTitle')}
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
              <span>{t('common.reset')}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('incomeHeader.settingsTitle')}
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
              onClick={() => onDelete && onDelete(timeline)}
              title={t('incomeHeader.deleteTitle')}
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
              <span>{t('common.delete')}</span>
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
                    color: activeViewMode === 'summary' ? TimelineColor.INCOME : 'var(--text-muted)'
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
                    background: activeViewMode === 'graph' ? 'rgba(16, 185, 129, 0.18)' : 'transparent',
                    color: activeViewMode === 'graph' ? TimelineColor.INCOME : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>{t('incomeHeader.evolutionView')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Principal 2x2 */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: RENDIMENTOS POR ORIGEM (PieChart SVG & Legenda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('incomeHeader.sourcesTitle')}
              </div>
              {(() => {
                const categoryColors = [
                  TimelineColor.INCOME,
                  TimelineColor.CYAN,
                  TimelineColor.BLUE,
                  TimelineColor.PURPLE,
                  TimelineColor.AMBER,
                  TimelineColor.PINK,
                  TimelineColor.SLATE,
                  TimelineColor.PRIMARY,
                  TimelineColor.ROSE,
                  TimelineColor.VIOLET
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
                    <PieDonut items={items} />
                    <DonutLegend items={items} />
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: CONSUMO DA ENTRADA (Donut Chart de Comprometimento) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
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
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {t('incomeHeader.currentAccumulationTitle')}
                  </span>
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: currentAccumulation >= 0 ? TimelineColor.SUCCESS : TimelineColor.DANGER }}>
                    {formatCurrency(currentAccumulation)}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontSize: '0.74rem' }}>
                  <span style={{ color: 'var(--text-muted)', fontWeight: '600' }}>
                    {t('incomeHeader.projectedAccumulationLabel')}
                  </span>
                  <strong style={{ color: currentProjectedAccumulation >= 0 ? TimelineColor.CYAN : TimelineColor.DANGER, fontSize: '0.84rem' }}>
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
                    color: TimelineColor.INCOME
                  },
                  {
                    name: t('incomeHeader.totalToReceiveYearLabel', { year: currentCalendarYear }),
                    percent: toReceivePct,
                    color: TimelineColor.CYAN
                  }
                ];

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    <PieDonut items={accumulationItems} centerLabel={`${receivedPct}%`} centerColor={TimelineColor.INCOME} />
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
              last7Months.push({ key, label, total: 0 });
            }

            const monthMap = new Map();
            last7Months.forEach((m) => {
              monthMap.set(m.key, { income: 0, expense: 0, loan: 0, investmentDeduction: 0 });
            });

            allBoardEvents.forEach((ev) => {
              if (!ev || !ev.date || ev.isDeleted) return;
              if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED || ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida || ev.status === 'Abatida') return;

              const evMonthKey = ev.date.substring(0, 7);
              const isAfterStart = computeFromMonth === '1900-01' || evMonthKey >= computeFromMonth;
              if (!isAfterStart || !monthMap.has(evMonthKey)) return;

              const mData = monthMap.get(evMonthKey);

              const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timelineOriginId || ev.timeline_id || '')) || ev.timelineType;
              const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'parcela_emprestimo' || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');
              const isLoan = isLoanInstallment || ev.eventType === EventType.LOAN || ev.eventType === EventType.AMORTIZATION || ev.isLoan || ev.category === 'amortizacao' || isLoanTimelineType(tlType);
              const isInvestment = ev.eventType === EventType.INVESTMENT || ev.category === 'investimento_poupanca' || ev.category === 'investment' || ev.isInvestment || tlType === TimelineType.INVESTMENT;
              const isExpense = ((ev.eventType === EventType.EXPENSE || ev.category === 'saida_recorrente' || ev.category === 'expense' || ev.isExpense || tlType === TimelineType.EXPENSE) && !isLoan && !isInvestment);
              const isIncome = (ev.eventType === EventType.INCOME || ev.category === 'entrada_recorrente' || ev.category === 'income' || ev.isIncome || tlType === TimelineType.INCOME) && !isLoan && !isInvestment && !isExpense;

              const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
              const amt = isLoanInstallment
                ? Math.abs(Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0)))
                : Math.abs(Number(ev.amount || 0));

              if (isIncome) {
                mData.income += amt;
              } else if (isExpense) {
                mData.expense += amt;
              } else if (isLoan) {
                mData.loan += amt;
              } else if (isInvestment && !isExternal && !ev.isFirstOccurrence) {
                mData.investmentDeduction += amt;
              }
            });

            last7Months.forEach((m) => {
              const isMonthAfterStart = computeFromMonth === '1900-01' || m.key >= computeFromMonth;
              if (!isMonthAfterStart) {
                m.total = 0;
                return;
              }
              const mData = monthMap.get(m.key);
              if (mData) {
                m.total = mData.income - (mData.expense + mData.loan + mData.investmentDeduction);
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
                goodColor={TimelineColor.INCOME}
                badColor={TimelineColor.DANGER}
                sparklesLabel={t('incomeHeader.annualProjectionLabel')}
                projection={annualProj}
                sparklesColor={TimelineColor.INCOME}
                projectionColor={TimelineColor.INCOME}
                currentGradient={`linear-gradient(180deg, ${TimelineColor.INCOME} 0%, rgba(16, 185, 129, 0.8) 100%)`}
                mutedGradientTop="rgba(16, 185, 129, 0.6)"
                mutedGradientBottom="rgba(16, 185, 129, 0.3)"
                currentTextColor={TimelineColor.INCOME}
              />
            );
          })()}
        </div>
      )}
    </HeaderShell>
  );
}
