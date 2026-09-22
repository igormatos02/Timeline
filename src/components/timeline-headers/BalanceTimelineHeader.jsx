import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
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
import { pt, enUS } from 'date-fns/locale';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import {
  EventType,
  EventStatus,
  TimelineType,
  TimelineStatus,
  LoanEventCategory,
  IncomeEventCategory,
  ExpenseEventCategory,
  AmortizationEventCategory,
  AmortizationStrategy,
  TimelineColor,
  TIMELINE_COLOR_PRESETS,
  isPositiveStatus,
  isCancelledStatus,
  isLoanTimelineType
} from '../../enums/index.js';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { PieDonut } from '../ui/DonutChart.jsx';

export default function BalanceTimelineHeader({
  timeline,
  timeboard = null,
  allTimelines = [],
  events = [],
  onEdit,
  _onDelete,
  onAddEvent,
  _onReset,
  activeViewMode = 'summary',
  setActiveViewMode,
  computeStartDate = null
}) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'en' ? enUS : pt;
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [collapsed, setIsCollapsed] = useState(false);
  const [projectionMonthsAhead, setProjectionMonthsAhead] = useState(0);

  // Mapa de tipo por ID de timeline para resolução precisa de eventos
  const timelineTypeMap = React.useMemo(() => {
    const map = new Map();
    (allTimelines || []).forEach((t) => {
      if (t && t.id) map.set(String(t.id), t.type);
    });
    if (timeline && timeline.id) {
      map.set(String(timeline.id), timeline.type);
    }
    return map;
  }, [allTimelines, timeline]);

  const validTimelineIds = React.useMemo(() => {
    const set = new Set();
    (allTimelines || []).forEach((t) => {
      if (t && t.id) set.add(String(t.id));
    });
    if (timeline && timeline.id) {
      set.add(String(timeline.id));
    }
    return set;
  }, [allTimelines, timeline]);

  const eventsList = React.useMemo(() => {
    const map = new Map();
    const addIfValid = (e) => {
      if (!e || !e.id) return;
      if (validTimelineIds.size > 0) {
        const hasValid = (e.timelineId && validTimelineIds.has(String(e.timelineId))) ||
          (e.timelineOriginId && validTimelineIds.has(String(e.timelineOriginId))) ||
          (e.timeline_id && validTimelineIds.has(String(e.timeline_id)));
        if (!hasValid) return;
      }
      map.set(e.id, e);
    };

    if (events && Array.isArray(events)) {
      events.forEach(addIfValid);
    }
    if (timeline?.events && Array.isArray(timeline.events)) {
      timeline.events.forEach(addIfValid);
    }
    (allTimelines || []).forEach((t) => {
      if (t.events && Array.isArray(t.events)) {
        t.events.forEach(addIfValid);
      }
    });
    return Array.from(map.values());
  }, [events, timeline?.events, allTimelines, validTimelineIds]);

  if (!timeline) return null;

  const headerColor = timeline.color || TimelineColor.CYAN;

  // Helper de data de horizonte projetado
  const projectedHorizonLabel = (() => {
    try {
      const baseDate = new Date();
      const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + projectionMonthsAhead, 1);
      return format(targetDate, 'MMM yyyy', { locale: dateLocale });
    } catch {
      return format(new Date(), 'MMM yyyy', { locale: dateLocale });
    }
  })();

  const rawComputeStart = computeStartDate || timeboard?.computeFrom || timeboard?.compute_from || timeline.computeFrom || timeline.compute_from || timeline.startDate || timeline.start_date;
  const computeFromMonth = rawComputeStart
    ? (String(rawComputeStart) === '1900-01' || String(rawComputeStart).startsWith('1900-01') || String(rawComputeStart) === 'all' ? '1900-01' : String(rawComputeStart).substring(0, 7))
    : '1900-01';

  const targetHorizonMonthStr = (() => {
    try {
      const baseDate = new Date();
      const targetDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + projectionMonthsAhead, 1);
      return format(targetDate, 'yyyy-MM');
    } catch {
      return currentMonthStr;
    }
  })();

  // Extrair métricas consolidadas seguras da Stored Procedure ou fallback
  const dto = timeline.balanceHeaderResult || timeline.procedureMetrics;
  const rawMetrics = dto || timeline.metrics || {};

  // Calcular saldo devedor vindo de todas as timelines de empréstimos ATIVAS
  const activeLoanTimelines = (allTimelines || []).filter((t) => {
    const isLoan = isLoanTimelineType(t.type);
    const isActive = t.status === TimelineStatus.ACTIVE || !t.status;
    return isLoan && isActive;
  });
  const hasLoanTimeline = activeLoanTimelines.length > 0;
  const hasInvestmentTimeline = (allTimelines || []).some((t) => t.type === TimelineType.INVESTMENT);

  const todayDate = new Date();
  const currentMonthLabel = (() => {
    try {
      return format(todayDate, 'MMMM yyyy', { locale: dateLocale });
    } catch {
      return '';
    }
  })();

  let calculatedIncome = 0;
  let calculatedExpenses = 0;
  let calculatedInvestments = 0;
  let calculatedLoanPaid = 0;
  let calculatedLoanDue = 0;
  let calculatedAmortized = 0;

  let horizonFutureInflows = 0;
  let horizonFutureOutflows = 0;
  let horizonFutureInvestments = 0;
  let horizonFutureAmortization = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;

    const eventMonthStr = ev.date.substring(0, 7);
    const isAfterStart = !computeFromMonth || computeFromMonth === '1900-01' || eventMonthStr >= computeFromMonth;
    const isUpToHorizon = eventMonthStr <= targetHorizonMonthStr;

    if (!isAfterStart || !isUpToHorizon) return;

    const isFutureEvent = eventMonthStr > currentMonthStr;
    const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timeline_id || ''));

    const isLoanInst = ev.eventType === EventType.LOAN_INSTALLMENT ||
      ev.eventType === 'loan_installment' ||
      ev.category === 'parcela_emprestimo' ||
      ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
      (Boolean(ev.isSystemLoanEvent) && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');

    const isAmortization = ev.eventType === EventType.AMORTIZATION ||
      ev.eventType === 'amortization' ||
      ev.category === 'amortizacao' ||
      ev.category === 'amortization' ||
      ev.category === AmortizationEventCategory.REDUCE_TERM ||
      ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
      ev.category === AmortizationStrategy.REDUCE_TERM ||
      ev.category === AmortizationStrategy.REDUCE_INSTALLMENT;

    const isLoan = isLoanInst || isAmortization || isLoanTimelineType(tlType);

    const amt = isLoanInst
      ? Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0))
      : Number(ev.amount || 0);

    if (amt <= 0) return;

    const isRealized = isFutureEvent || isPositiveStatus(ev.status) || isPositiveStatus(ev.status?.toLowerCase()) || Boolean(ev.isCompleted);

    if (isLoan) {
      if (isRealized) {
        calculatedLoanPaid += amt;
        if (isAmortization) {
          calculatedAmortized += amt;
          if (isFutureEvent) horizonFutureAmortization += amt;
        }
        if (isFutureEvent) {
          horizonFutureOutflows += amt;
        }
      } else {
        calculatedLoanDue += amt;
      }
      return;
    }

    if (!isRealized) return;

    const isIncome = (
      ev.eventType === EventType.INCOME ||
      tlType === TimelineType.INCOME ||
      ev.category === IncomeEventCategory.RECURRING_INCOME ||
      Boolean(ev.isIncome)
    );

    const isInvestment = (
      ev.eventType === EventType.INVESTMENT ||
      tlType === TimelineType.INVESTMENT ||
      Boolean(ev.isInvestment) ||
      Boolean(ev.pocketId || ev.pocket_id)
    );

    const isExpense = (
      ev.eventType === EventType.EXPENSE ||
      tlType === TimelineType.EXPENSE ||
      ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
      Boolean(ev.isExpense)
    ) && !isIncome && !isInvestment;

    if (isIncome) {
      calculatedIncome += amt;
      if (isFutureEvent) horizonFutureInflows += amt;
    } else if (isInvestment && !ev.isExternal && !ev.is_external) {
      calculatedInvestments += amt;
      if (isFutureEvent) horizonFutureInvestments += amt;
    } else if (isExpense) {
      calculatedExpenses += amt;
      if (isFutureEvent) horizonFutureOutflows += amt;
    }
  });

  const activeLoanTimelinesSum = activeLoanTimelines.reduce((sum, t) => {
    const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
    return sum + Number(m.remaining_debt ?? m.remainingDebt ?? m.total_debt ?? m.totalDebt ?? t.totalDebt ?? 0);
  }, 0);

  const rawRemainingDebt = rawMetrics.total_remaining_debt ?? rawMetrics.totalRemainingDebt ?? rawMetrics.totalActiveDebt ?? 0;
  const initialBaseRemainingDebt = activeLoanTimelinesSum > 0 ? activeLoanTimelinesSum : rawRemainingDebt;
  const computedRemainingDebt = Math.max(0, initialBaseRemainingDebt - (projectionMonthsAhead > 0 ? calculatedAmortized : 0));

  const totalReceived = calculatedIncome;
  const totalPaidExpenses = calculatedExpenses + calculatedLoanPaid;
  const totalInvested = calculatedInvestments;
  const totalPeriodDueDebt = calculatedLoanDue;
  const totalRemainingDebt = computedRemainingDebt;
  // Saldo Líquido do período: Entradas - Saídas (incluindo parcelas) - Investimentos
  const netRealized = totalReceived - totalPaidExpenses - totalInvested;

  const finMetrics = {
    ...rawMetrics,
    netRealized,
    totalReceived,
    totalPaidExpenses,
    totalInvested,
    totalPeriodDueDebt,
    totalLoanPaid: calculatedLoanPaid,
    totalRemainingDebt: computedRemainingDebt,
    totalAmortized: calculatedAmortized > 0 ? calculatedAmortized : (rawMetrics.total_amortized ?? rawMetrics.totalAmortized ?? 0),
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
                fontWeight: '700'
              }}
            >
              <Plus size={14} />
              <span>{t('balanceHeader.newMovement')}</span>
            </button>
          )}

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
      {/* Conteúdo Expandido com Métricas e Gráficos */}
      {!collapsed && (
        <div style={{ paddingTop: '14px' }}>
          {/* Barra de Controles: Switcher Resumo / Gráfico */}
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
                    background: activeViewMode === 'summary' ? 'rgba(14, 165, 233, 0.18)' : 'transparent',
                    color: activeViewMode === 'summary' ? TimelineColor.CYAN : 'var(--text-muted)'
                  }}
                >
                  <Layers size={13} />
                  <span>{t('balanceHeader.summaryView')}</span>
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
                    color: activeViewMode === 'graph' ? TimelineColor.CYAN : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>{t('balanceHeader.evolutionView')}</span>
                </button>
              </div>
            </div>
          )}

          {/* Grid Principal 2x2 padronizado com Donut SVGs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: BALANÇO ATÉ O HORIZONTE */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {projectionMonthsAhead === 0
                  ? t('balanceHeader.currentBalanceTitle', { month: currentMonthLabel })
                  : t('balanceHeader.projectedBalanceTitle', { month: projectedHorizonLabel })}
              </div>
              {(() => {
                const totalReceivedVal = finMetrics.totalReceived ?? 0;
                const totalPaidExpensesVal = finMetrics.totalPaidExpenses ?? 0;
                const totalInvestedVal = finMetrics.totalInvested ?? 0;
                const netVal = finMetrics.netRealized ?? (totalReceivedVal - totalPaidExpensesVal - totalInvestedVal);

                return (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                    {/* Detalhes Verticais em Lista */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '600' }}>
                        {projectionMonthsAhead === 0
                          ? t('balanceHeader.netRealizedAccumulated')
                          : t('balanceHeader.netProjectedAccumulated')}
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800', color: netVal >= 0 ? TimelineColor.SUCCESS : TimelineColor.EXPENSE, marginBottom: '2px' }}>
                        {netVal >= 0 ? '+' : ''}{formatCurrency(netVal)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inflows')}</span>
                          <strong style={{ color: TimelineColor.SUCCESS }}>+{formatCurrency(totalReceivedVal).replace(',00', '')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.outflows')}</span>
                          <strong style={{ color: TimelineColor.EXPENSE }}>-{formatCurrency(totalPaidExpensesVal).replace(',00', '')}</strong>
                        </div>
                        {(hasInvestmentTimeline && totalInvestedVal > 0) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccount')}</span>
                            <strong style={{ color: TimelineColor.LOAN }}>-{formatCurrency(totalInvestedVal).replace(',00', '')}</strong>
                          </div>
                        )}
                        {(hasLoanTimeline && totalPeriodDueDebt > 0) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.due')}</span>
                            <strong style={{ color: TimelineColor.WARNING }}>{formatCurrency(totalPeriodDueDebt).replace(',00', '')}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: DISTRIBUIÇÃO DE RENDIMENTOS NO PERÍODO / ANUAL */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {projectionMonthsAhead === 0
                  ? t('balanceHeader.annualIncomeBreakdown')
                  : t('balanceHeader.periodIncomeBreakdown')}
              </div>
              {(() => {
                let startMK, endMK;
                if (projectionMonthsAhead === 0) {
                  let baseYear, baseMonth;
                  if (computeFromMonth && computeFromMonth !== '1900-01') {
                    const [y, m] = computeFromMonth.split('-').map(Number);
                    baseYear = y;
                    baseMonth = m - 1;
                  } else {
                    const now = new Date();
                    baseYear = now.getFullYear();
                    baseMonth = now.getMonth();
                  }
                  startMK = `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}`;
                  const etm = baseMonth + 12;
                  const ey = baseYear + Math.floor(etm / 12);
                  const em = etm % 12;
                  endMK = `${ey}-${String(em + 1).padStart(2, '0')}`;
                } else {
                  startMK = computeFromMonth === '1900-01' ? '1900-01' : computeFromMonth;
                  endMK = targetHorizonMonthStr;
                }

                const activeLoanTimelines = (allTimelines || []).filter((t) => {
                  const isLoan = isLoanTimelineType(t.type);
                  const isActive = t.status === TimelineStatus.ACTIVE || !t.status;
                  return isLoan && isActive;
                });
                const hasLoanTimeline = activeLoanTimelines.length > 0;
                const activeLoanIds = new Set(activeLoanTimelines.map((t) => String(t.id)));

                let annualIncome = 0;
                let annualExpense = 0;
                let annualInvestment = 0;
                let annualLoan = 0;

                // Calcular custo de empréstimos das timelines ativas
                if (hasLoanTimeline && projectionMonthsAhead === 0) {
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
                }

                eventsList.forEach((ev) => {
                  if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
                  const mk = ev.date.substring(0, 7);
                  if (mk < startMK || (projectionMonthsAhead === 0 ? mk >= endMK : mk > endMK)) return;

                  const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timeline_id || ''));

                  const isLoanInst = ev.eventType === EventType.LOAN_INSTALLMENT ||
                    ev.eventType === 'loan_installment' ||
                    ev.category === 'parcela_emprestimo' ||
                    ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
                    (Boolean(ev.isSystemLoanEvent) && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');

                  const isAmortization = ev.eventType === EventType.AMORTIZATION ||
                    ev.eventType === 'amortization' ||
                    ev.category === 'amortizacao' ||
                    ev.category === 'amortization' ||
                    ev.category === AmortizationEventCategory.REDUCE_TERM ||
                    ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
                    ev.category === AmortizationStrategy.REDUCE_TERM ||
                    ev.category === AmortizationStrategy.REDUCE_INSTALLMENT;

                  const isLoan = isLoanInst || isAmortization || isLoanTimelineType(tlType);

                  const amt = isLoanInst
                    ? Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0))
                    : Number(ev.amount || 0);

                  if (amt <= 0) return;

                  const isIncome = (
                    ev.eventType === EventType.INCOME ||
                    tlType === TimelineType.INCOME ||
                    ev.category === IncomeEventCategory.RECURRING_INCOME ||
                    Boolean(ev.isIncome)
                  ) && !isLoan;

                  const isInvestment = (
                    ev.eventType === EventType.INVESTMENT ||
                    tlType === TimelineType.INVESTMENT ||
                    Boolean(ev.isInvestment)
                  ) && !isLoan;

                  const isExpense = (
                    ev.eventType === EventType.EXPENSE ||
                    tlType === TimelineType.EXPENSE ||
                    ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
                    Boolean(ev.isExpense)
                  ) && !isIncome && !isInvestment && !isLoan;

                  if (isIncome) {
                    annualIncome += amt;
                  } else if (isExpense) {
                    annualExpense += amt;
                  } else if (isInvestment && !ev.isExternal && !ev.is_external) {
                    annualInvestment += amt;
                  } else if (
                    hasLoanTimeline &&
                    (annualLoan === 0 || projectionMonthsAhead > 0) &&
                    (isLoanInst || isAmortization) &&
                    activeLoanIds.has(String(ev.timelineId || ev.timeline_id || ''))
                  ) {
                    annualLoan += amt;
                  }
                });

                const expPct = annualIncome > 0 ? Math.round((annualExpense / annualIncome) * 100) : 0;
                const invPct = annualIncome > 0 ? Math.round((annualInvestment / annualIncome) * 100) : 0;
                const loanPct = (hasLoanTimeline && annualIncome > 0) ? Math.round((annualLoan / annualIncome) * 100) : 0;
                const freePct = Math.max(0, 100 - expPct - invPct - loanPct);
                const totalCommitted = expPct + invPct + loanPct;

                // Entradas - Saídas - Dívidas - Em conta
                const annualNet = annualIncome - annualExpense - (hasLoanTimeline ? annualLoan : 0) - annualInvestment;

                if (annualIncome === 0) {
                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '4px', padding: '6px 0' }}>
                        <PieDonut items={[]} empty={true} emptyLabel="0%" centerColor="var(--text-dim)" />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)' }}>{t('balanceHeader.noProjectedIncome')}</span>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.3 }}>{t('balanceHeader.noProjectedIncomeHint')}</span>
                        </div>
                      </div>

                      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {projectionMonthsAhead === 0 ? t('balanceHeader.totalAnnualProjected') : t('balanceHeader.totalPeriodProjected')}
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.02)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.balanceLabel')}</span>
                            <strong style={{ color: annualNet >= 0 ? TimelineColor.SUCCESS : TimelineColor.EXPENSE }}>
                              {annualNet >= 0 ? '+' : ''}{formatCurrency(annualNet)}
                            </strong>
                          </div>
                          {(hasInvestmentTimeline || annualInvestment > 0) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccount')}</span>
                              <strong style={{ color: TimelineColor.LOAN }}>
                                +{formatCurrency(annualInvestment)}
                              </strong>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Fatias do Donut
                const segments = [
                  { name: t('balanceHeader.expensesLegend'), label: t('balanceHeader.expensesLegend'), percent: expPct, pct: expPct, amount: annualExpense, color: TimelineColor.EXPENSE },
                  ...((hasInvestmentTimeline && invPct > 0) ? [{ name: t('balanceHeader.inAccountLegend'), label: t('balanceHeader.inAccountLegend'), percent: invPct, pct: invPct, amount: annualInvestment, color: TimelineColor.LOAN }] : []),
                  ...((hasLoanTimeline && loanPct > 0) ? [{ name: t('balanceHeader.dueLegend'), label: t('balanceHeader.dueLegend'), percent: loanPct, pct: loanPct, amount: annualLoan, color: TimelineColor.WARNING }] : []),
                  ...(freePct > 0 ? [{ name: t('balanceHeader.availableLegend'), label: t('balanceHeader.availableLegend'), percent: freePct, pct: freePct, amount: Math.max(0, annualNet), color: TimelineColor.SUCCESS }] : [])
                ].filter((s) => s.percent > 0);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                      <PieDonut
                        items={segments}
                        centerColor={totalCommitted > 85 ? TimelineColor.EXPENSE : TimelineColor.CYAN}
                        centerLabel={`${totalCommitted}%`}
                        centerFontSize="0.74rem"
                      />

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TimelineColor.EXPENSE, flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.expensesLegend')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualExpense)}</span>
                            <strong style={{ color: TimelineColor.EXPENSE }}>{expPct}%</strong>
                          </div>
                        </div>

                        {(hasInvestmentTimeline && invPct > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TimelineColor.LOAN, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccountLegend')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualInvestment)}</span>
                              <strong style={{ color: TimelineColor.LOAN }}>{invPct}%</strong>
                            </div>
                          </div>
                        )}

                        {(hasLoanTimeline && loanPct > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TimelineColor.WARNING, flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.dueLegend')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualLoan)}</span>
                              <strong style={{ color: TimelineColor.WARNING }}>{loanPct}%</strong>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: TimelineColor.SUCCESS, flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.availableLegend')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>+{formatCurrency(Math.max(0, annualNet))}</span>
                            <strong style={{ color: TimelineColor.SUCCESS }}>{freePct}%</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {projectionMonthsAhead === 0 ? t('balanceHeader.totalAnnualProjected') : t('balanceHeader.totalPeriodProjected')}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.02)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.balanceLabel')}</span>
                          <strong style={{ color: annualNet >= 0 ? TimelineColor.SUCCESS : TimelineColor.EXPENSE }}>
                            {annualNet >= 0 ? '+' : ''}{formatCurrency(annualNet)}
                          </strong>
                        </div>
                        {(hasInvestmentTimeline && annualInvestment > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccount')}</span>
                            <strong style={{ color: TimelineColor.LOAN }}>
                              +{formatCurrency(annualInvestment)}
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 3: EMPRÉSTIMOS E FINANCIAMENTOS */}
            {hasLoanTimeline && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('balanceHeader.loansAndFinancing')}
                </div>
                {(() => {
                  const loanColors = TIMELINE_COLOR_PRESETS;

                  const activeLoanTimelines = (allTimelines || []).filter((t) => {
                    const isLoan = isLoanTimelineType(t.type);
                    const isActive = t.status === TimelineStatus.ACTIVE || !t.status;
                    return isLoan && isActive;
                  });

                  // Calcular dinamicamente o saldo devedor e o capital amortizado de CADA empréstimo até o horizonte projetado
                  const loanDynamicMetricsMap = new Map();

                  activeLoanTimelines.forEach((t) => {
                    const tid = String(t.id);
                    const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                    const baseRemainingDebt = Number(m.remaining_debt ?? m.remainingDebt ?? m.total_debt ?? m.totalDebt ?? t.totalDebt ?? 0);
                    const baseAmortizedCapital = Number(m.amortized_capital ?? m.amortizedCapital ?? m.paid_capital ?? 0);
                    const baseTotalCost = Number(m.total_loan_cost ?? m.totalLoanCost ?? m.totalCost ?? 0);

                    let futureAmortized = 0;

                    if (projectionMonthsAhead > 0) {
                      eventsList.forEach((ev) => {
                        if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
                        const evTid = String(ev.timelineId || ev.timeline_id || ev.timelineOriginId || '');
                        if (evTid !== tid) return;

                        const eventMonthStr = ev.date.substring(0, 7);
                        if (eventMonthStr <= currentMonthStr || eventMonthStr > targetHorizonMonthStr) return;

                        const isAmort = ev.eventType === EventType.AMORTIZATION ||
                          ev.eventType === 'amortization' ||
                          ev.category === 'amortizacao' ||
                          ev.category === 'amortization' ||
                          ev.category === AmortizationEventCategory.REDUCE_TERM ||
                          ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
                          ev.category === AmortizationStrategy.REDUCE_TERM ||
                          ev.category === AmortizationStrategy.REDUCE_INSTALLMENT;

                        const isInstallment = ev.eventType === EventType.LOAN_INSTALLMENT ||
                          ev.eventType === 'loan_installment' ||
                          ev.category === 'parcela_emprestimo' ||
                          ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
                          (Boolean(ev.isSystemLoanEvent) && !isAmort);

                        if (isAmort) {
                          futureAmortized += Number(ev.amount || 0);
                        } else if (isInstallment) {
                          const cap = Number(ev.installmentCapital ?? ev.principalAmount ?? ev.principal_amount ?? 0);
                          const amt = Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0));
                          const principal = cap > 0 ? cap : (amt * 0.82);
                          futureAmortized += principal;
                        }
                      });
                    }

                    const projectedDebt = Math.max(0, baseRemainingDebt - futureAmortized);
                    const projectedAmortized = baseAmortizedCapital + Math.min(baseRemainingDebt, futureAmortized);

                    loanDynamicMetricsMap.set(tid, {
                      remainingDebt: projectedDebt,
                      amortizedCapital: projectedAmortized,
                      totalCost: baseTotalCost,
                      name: t.name,
                      color: t.color
                    });
                  });

                  const loanItems = activeLoanTimelines.map((t, idx) => {
                    const m = loanDynamicMetricsMap.get(String(t.id)) || {};
                    const debt = Number(m.remainingDebt ?? 0);
                    return {
                      id: t.id,
                      name: t.name,
                      amount: debt,
                      color: t.color || loanColors[idx % loanColors.length]
                    };
                  });

                  const totalDebtSum = loanItems.reduce((acc, i) => acc + (i.amount || 0), 0);
                  const itemsWithPct = loanItems.map((i) => ({
                    ...i,
                    percent: totalDebtSum > 0 ? Math.round((i.amount / totalDebtSum) * 100) : 0
                  }));

                  const totalAmortizedVal = activeLoanTimelines.reduce((sum, t) => {
                    const m = loanDynamicMetricsMap.get(String(t.id)) || {};
                    return sum + Number(m.amortizedCapital ?? 0);
                  }, 0);

                  const totalRemainingDebtVal = totalDebtSum;

                  const computedActiveTotalLoanCost = activeLoanTimelines.reduce((sum, t) => {
                    const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
                    const totalCost = Number(m.total_loan_cost ?? m.totalLoanCost ?? m.totalCost ?? 0);
                    if (totalCost > 0) return sum + totalCost;
                    const originalCap = Number(m.original_capital ?? m.originalCapital ?? m.total_debt ?? m.totalDebt ?? t.totalDebt ?? 0);
                    const estInt = Number(m.total_estimated_interest ?? m.totalEstimatedInterest ?? m.future_interest ?? m.futureInterest ?? 0);
                    const estFee = Number(m.total_estimated_fee ?? m.totalEstimatedFee ?? m.future_fee ?? m.futureFee ?? 0);
                    return sum + (originalCap + estInt + estFee);
                  }, 0);

                  const totalRealCostVal = activeLoanTimelines.length > 0
                    ? computedActiveTotalLoanCost
                    : Number(finMetrics.totalLoanCost ?? finMetrics.total_loan_cost ?? (totalRemainingDebtVal + totalAmortizedVal));

                  return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                        <PieDonut
                          items={itemsWithPct.filter((i) => i.amount > 0)}
                          empty={totalDebtSum === 0}
                          emptyLabel="0€"
                          centerFontSize="0.64rem"
                          centerColor={TimelineColor.CYAN}
                        />

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

                      {/* Resumo de Totais */}
                      <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px', alignItems: 'flex-start' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }}>{t('balanceHeader.amortizedCapital')}</span>
                          <strong style={{ color: TimelineColor.SUCCESS, fontSize: '0.84rem', fontWeight: '800' }}>
                            {formatCurrency(totalAmortizedVal)}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }}>{t('balanceHeader.debtCapital')}</span>
                          <strong style={{ color: TimelineColor.EXPENSE, fontSize: '0.84rem', fontWeight: '800' }}>
                            {formatCurrency(totalRemainingDebtVal)}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }} title={t('balanceHeader.realCapitalCostTitle')}>{t('balanceHeader.realCapitalCost')}</span>
                          <strong style={{ color: 'var(--primary-light)', fontSize: '0.84rem', fontWeight: '800' }}>
                            {formatCurrency(totalRealCostVal)}
                          </strong>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* 🔵 LINHA 2: PREVISTOS & PROJEÇÃO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: TimelineColor.PRIMARY, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: `linear-gradient(135deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PRIMARY_LIGHT} 100%)`, display: 'inline-block' }} />
                {t('balanceHeader.futureProjection')}
              </span>
            </div>

            {/* Slider de Horizonte */}
            <div
              style={{
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                border: '1px solid var(--border-glass)',
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
                  <div style={{ background: 'rgba(99, 102, 241, 0.12)', color: TimelineColor.PRIMARY, padding: '5px', borderRadius: '7px', display: 'flex' }}>
                    <Clock size={15} />
                  </div>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    {t('balanceHeader.forecastHorizon')}
                  </span>
                  <span
                    style={{
                      background: 'rgba(99, 102, 241, 0.12)',
                      color: TimelineColor.PRIMARY,
                      border: 'none',
                      padding: '2px 9px',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      fontWeight: '800',
                      textTransform: 'capitalize'
                    }}
                  >
                    {projectedHorizonLabel} {projectionMonthsAhead === 0 ? t('balanceHeader.currentMonthParen') : `(+${projectionMonthsAhead}m)`}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {[
                    { label: t('balanceHeader.currentMonth'), months: 0 },
                    { label: t('balanceHeader.plusMonths', { count: 6 }), months: 6 },
                    { label: t('balanceHeader.plusYear', { count: 1 }), months: 12 },
                    { label: t('balanceHeader.plusYears', { count: 2 }), months: 24 },
                    { label: t('balanceHeader.plusYears', { count: 5 }), months: 60 }
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
                          border: 'none',
                          background: isSelected ? `linear-gradient(135deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PRIMARY_LIGHT} 100%)` : 'var(--bg-app)',
                          color: isSelected ? 'var(--text-white)' : 'var(--text-muted)',
                          boxShadow: isSelected ? '0 0 10px rgba(99, 102, 241, 0.35)' : 'none',
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
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  {t('balanceHeader.today', { month: format(todayDate, 'MMM yyyy', { locale: dateLocale }) })}
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
                    accentColor: TimelineColor.PRIMARY,
                    cursor: 'pointer',
                    height: '6px'
                  }}
                  title={t('balanceHeader.projectToTitle', { date: projectedHorizonLabel })}
                />
                <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  {t('balanceHeader.plusYears', { count: 10 })}
                </span>
              </div>
            </div>

            {/* Cards Projetados dinâmicos */}
            {(() => {
              const netProj = netRealized;
              const forecastInc = projectionMonthsAhead === 0 ? totalReceived : (horizonFutureInflows > 0 ? horizonFutureInflows : totalReceived);
              const plannedExp = projectionMonthsAhead === 0 ? totalPaidExpenses : (horizonFutureOutflows > 0 ? horizonFutureOutflows : totalPaidExpenses);
              const plannedInv = projectionMonthsAhead === 0 ? totalInvested : (horizonFutureInvestments > 0 ? horizonFutureInvestments : totalInvested);
              const plannedAmort = projectionMonthsAhead === 0 ? calculatedAmortized : (horizonFutureAmortization > 0 ? horizonFutureAmortization : calculatedAmortized);

              return (
                <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                  <div className="meta-item" style={{ padding: '8px 12px' }}>
                    <div className="meta-icon-box" style={{ background: 'rgba(99, 102, 241, 0.12)', color: TimelineColor.PRIMARY }}>
                      <TrendingUp size={16} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                        <span className="meta-label" style={{ fontSize: '0.7rem' }}>{t('balanceHeader.projectedBalance')}</span>
                        <span style={{ color: netProj >= 0 ? TimelineColor.PRIMARY : TimelineColor.EXPENSE, fontSize: '0.96rem', fontWeight: '800' }}>
                          {netProj >= 0 ? '+' : ''}{formatCurrency(netProj)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.forecastInflows')}</span>
                          <span style={{ color: TimelineColor.PRIMARY, fontSize: '0.78rem', fontWeight: '700' }}>
                            +{formatCurrency(forecastInc)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.forecastOutflows')}</span>
                          <span style={{ color: TimelineColor.EXPENSE, fontSize: '0.78rem', fontWeight: '700' }}>
                            -{formatCurrency(plannedExp)}
                          </span>
                        </div>
                        {(hasInvestmentTimeline && plannedInv > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.investments')}</span>
                            <span style={{ color: TimelineColor.LOAN, fontSize: '0.78rem', fontWeight: '700' }}>
                              -{formatCurrency(plannedInv)}
                            </span>
                          </div>
                        )}
                        {(hasLoanTimeline && plannedAmort > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.amortizedCapital')}:</span>
                            <span style={{ color: TimelineColor.SUCCESS, fontSize: '0.78rem', fontWeight: '700' }}>
                              +{formatCurrency(plannedAmort)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </HeaderShell>
  );
}
