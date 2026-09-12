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
  isPositiveStatus,
  isCancelledStatus,
  isLoanTimelineType
} from '../../enums/index.js';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { PieDonut } from '../ui/DonutChart.jsx';

export default function BalanceTimelineHeader({
  timeline,
  allTimelines = [],
  events = [],
  onEdit,
  _onDelete,
  onAddEvent,
  _onReset,
  activeViewMode = 'summary',
  setActiveViewMode,
  computeStartDate = null,
  onSaveComputeStartDate
}) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'en' ? enUS : pt;
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [collapsed, setIsCollapsed] = useState(false);
  const [projectionMonthsAhead, setProjectionMonthsAhead] = useState(0);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [_tempComputeMonth, setTempComputeMonth] = useState(currentMonthStr);

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
      const tid = String(e.timelineId || e.timeline_id || e.timelineOriginId || '');
      // Se conhecemos as timelines do timeboard, apenas incluir eventos pertencentes a elas
      if (validTimelineIds.size > 0 && tid && !validTimelineIds.has(tid)) return;
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

  const computeFromMonth = computeStartDate
    ? computeStartDate.substring(0, 7)
    : currentMonthStr;

  const getFormattedMonthLabel = (mStr) => {
    try {
      if (!mStr || mStr === '1900-01') return t('balanceHeader.allHistory');
      const [year, month] = mStr.split('-');
      const d = new Date(Number(year), Number(month) - 1, 1);
      return format(d, 'MMM/yyyy', { locale: dateLocale });
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
  const activeLoanTimelines = (allTimelines || []).filter((t) => {
    const isLoan = isLoanTimelineType(t.type);
    const isActive = t.status === TimelineStatus.ACTIVE || !t.status;
    return isLoan && isActive;
  });
  const hasLoanTimeline = activeLoanTimelines.length > 0;
  const hasInvestmentTimeline = (allTimelines || []).some((t) => t.type === TimelineType.INVESTMENT || t.type === 'investments' || t.type === 'investment');

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

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;

    const eventMonthStr = ev.date.substring(0, 7);
    const isAfterStart = !computeFromMonth || computeFromMonth === '1900-01' || eventMonthStr >= computeFromMonth;
    const isUpToCurrentMonth = eventMonthStr <= currentMonthStr;

    if (!isAfterStart || !isUpToCurrentMonth) return;

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
      ? Number(ev.installmentAmount !== undefined ? ev.installmentAmount : (ev.amount || 0))
      : Number(ev.amount || 0);

    if (amt <= 0) return;

    const isRealized = isPositiveStatus(ev.status) || isPositiveStatus(ev.status?.toLowerCase()) || Boolean(ev.isCompleted);

    if (isLoan) {
      if (isRealized) {
        calculatedLoanPaid += amt;
      } else {
        calculatedLoanDue += amt;
      }
      return;
    }

    if (!isRealized) return;

    const isIncome = (
      ev.eventType === EventType.INCOME ||
      ev.eventType === 'income' ||
      tlType === TimelineType.INCOME ||
      ev.category === 'entrada_recorrente' ||
      ev.category === IncomeEventCategory.RECURRING_INCOME ||
      Boolean(ev.isIncome)
    );

    const isInvestment = (
      ev.eventType === EventType.INVESTMENT ||
      ev.eventType === 'investment' ||
      ev.eventType === 'investimento' ||
      tlType === TimelineType.INVESTMENT ||
      Boolean(ev.isInvestment)
    );

    const isExpense = (
      ev.eventType === EventType.EXPENSE ||
      ev.eventType === 'expense' ||
      tlType === TimelineType.EXPENSE ||
      ev.category === 'saida_recorrente' ||
      ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
      Boolean(ev.isExpense)
    ) && !isIncome && !isInvestment;

    if (isIncome) {
      calculatedIncome += amt;
    } else if (isInvestment && !ev.isExternal && !ev.is_external && !ev.isFirstOccurrence) {
      calculatedInvestments += amt;
    } else if (isExpense) {
      calculatedExpenses += amt;
    }
  });

  const activeLoanTimelinesSum = activeLoanTimelines.reduce((sum, t) => {
    const m = t.metrics || t.loanHeaderResult || t.procedureMetrics || {};
    return sum + Number(m.remaining_debt ?? m.remainingDebt ?? m.total_debt ?? m.totalDebt ?? t.totalDebt ?? 0);
  }, 0);

  const rawRemainingDebt = rawMetrics.total_remaining_debt ?? rawMetrics.totalRemainingDebt ?? rawMetrics.totalActiveDebt ?? 0;
  const computedRemainingDebt = activeLoanTimelinesSum > 0 ? activeLoanTimelinesSum : rawRemainingDebt;

  const totalReceived = calculatedIncome;
  const totalPaidExpenses = calculatedExpenses + calculatedLoanPaid;
  const totalInvested = calculatedInvestments;
  const totalPeriodDueDebt = calculatedLoanDue;
  const totalRemainingDebt = computedRemainingDebt;
  // Saldo Líquido do período: Entradas Realizadas - Saídas Realizadas (incluindo parcelas pagas) - Investimentos Realizados
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
          badge={t('balanceHeader.badge')}
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
              <span>{t('balanceHeader.newMovement')}</span>
            </button>
          )}

          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              title={t('balanceHeader.settingsTitle')}
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
                title={t('balanceHeader.computeBtnTitle')}
              >
                <Calendar size={13} style={{ color: '#0ea5e9' }} />
                <span style={{ color: 'var(--text-dim)', fontSize: '0.74rem', fontWeight: '600' }}>{t('balanceHeader.computeLabel')}</span>
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
                    color: activeViewMode === 'graph' ? '#0ea5e9' : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>{t('balanceHeader.evolutionView')}</span>
                </button>
              </div>
            )}
          </div>

          {/* Grid Principal 2x2 padronizado com Donut SVGs */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {/* Quadrante 1: BALANÇO ATÉ O MÊS ATUAL */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('balanceHeader.currentBalanceTitle', { month: currentMonthLabel })}
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
                        {t('balanceHeader.netRealizedAccumulated')}
                      </div>
                      <div style={{ fontSize: '0.92rem', fontWeight: '800', color: netRealized >= 0 ? '#10b981' : '#f43f5e', marginBottom: '2px' }}>
                        {netRealized >= 0 ? '+' : ''}{formatCurrency(netRealized)}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inflows')}</span>
                          <strong style={{ color: '#10b981' }}>+{formatCurrency(totalReceived).replace(',00', '')}</strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.outflows')}</span>
                          <strong style={{ color: '#f43f5e' }}>-{formatCurrency(totalPaidExpenses).replace(',00', '')}</strong>
                        </div>
                        {(hasInvestmentTimeline && totalInvested > 0) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccount')}</span>
                            <strong style={{ color: '#6366f1' }}>-{formatCurrency(totalInvested).replace(',00', '')}</strong>
                          </div>
                        )}
                        {(hasLoanTimeline && totalPeriodDueDebt > 0) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.due')}</span>
                            <strong style={{ color: '#f59e0b' }}>{formatCurrency(totalPeriodDueDebt).replace(',00', '')}</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Quadrante 2: ANNUAL INCOME BREAKDOWN (Despesas + Em conta + Devido vs Renda) */}
            <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {t('balanceHeader.annualIncomeBreakdown')}
              </div>
              {(() => {
                // Janela de 12 meses a partir do mês de início de computação configurado (Computar: ...)
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

                const startMK = `${baseYear}-${String(baseMonth + 1).padStart(2, '0')}`;
                const etm = baseMonth + 12;
                const ey = baseYear + Math.floor(etm / 12);
                const em = etm % 12;
                const endMK = `${ey}-${String(em + 1).padStart(2, '0')}`;

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

                // Calcular custo anual de empréstimos das timelines ativas (mensalidade × 12)
                if (hasLoanTimeline) {
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
                  if (mk < startMK || mk >= endMK) return;

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
                    ? Number(ev.installmentAmount !== undefined ? ev.installmentAmount : (ev.amount || 0))
                    : Number(ev.amount || 0);

                  if (amt <= 0) return;

                  const isIncome = (
                    ev.eventType === EventType.INCOME ||
                    ev.eventType === 'income' ||
                    tlType === TimelineType.INCOME ||
                    ev.category === 'entrada_recorrente' ||
                    ev.category === IncomeEventCategory.RECURRING_INCOME ||
                    Boolean(ev.isIncome)
                  ) && !isLoan;

                  const isInvestment = (
                    ev.eventType === EventType.INVESTMENT ||
                    ev.eventType === 'investment' ||
                    ev.eventType === 'investimento' ||
                    tlType === TimelineType.INVESTMENT ||
                    Boolean(ev.isInvestment)
                  ) && !isLoan;

                  const isExpense = (
                    ev.eventType === EventType.EXPENSE ||
                    ev.eventType === 'expense' ||
                    tlType === TimelineType.EXPENSE ||
                    ev.category === 'saida_recorrente' ||
                    ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
                    Boolean(ev.isExpense)
                  ) && !isIncome && !isInvestment && !isLoan;

                  if (isIncome) {
                    annualIncome += amt;
                  } else if (isExpense) {
                    annualExpense += amt;
                  } else if (isInvestment && !ev.isFirstOccurrence && !ev.isExternal && !ev.is_external) {
                    annualInvestment += amt;
                  } else if (
                    hasLoanTimeline &&
                    annualLoan === 0 &&
                    isLoanInst &&
                    !isAmortization &&
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

                // Mesma fórmula do Balanço: Entradas - Saídas - Dívidas - Em conta
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
                          {t('balanceHeader.totalAnnualProjected')}
                        </span>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.02)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.balanceLabel')}</span>
                            <strong style={{ color: annualNet >= 0 ? '#10b981' : '#f43f5e' }}>
                              {annualNet >= 0 ? '+' : ''}{formatCurrency(annualNet)}
                            </strong>
                          </div>
                          {(hasInvestmentTimeline || annualInvestment > 0) && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccount')}</span>
                              <strong style={{ color: '#6366f1' }}>
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
                  { name: t('balanceHeader.expensesLegend'), label: t('balanceHeader.expensesLegend'), percent: expPct, pct: expPct, amount: annualExpense, color: '#f43f5e' },
                  ...((hasInvestmentTimeline && invPct > 0) ? [{ name: t('balanceHeader.inAccountLegend'), label: t('balanceHeader.inAccountLegend'), percent: invPct, pct: invPct, amount: annualInvestment, color: '#6366f1' }] : []),
                  ...((hasLoanTimeline && loanPct > 0) ? [{ name: t('balanceHeader.dueLegend'), label: t('balanceHeader.dueLegend'), percent: loanPct, pct: loanPct, amount: annualLoan, color: '#f59e0b' }] : []),
                  ...(freePct > 0 ? [{ name: t('balanceHeader.availableLegend'), label: t('balanceHeader.availableLegend'), percent: freePct, pct: freePct, amount: Math.max(0, annualNet), color: '#10b981' }] : [])
                ].filter((s) => s.percent > 0);

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
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f43f5e', flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.expensesLegend')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualExpense)}</span>
                            <strong style={{ color: '#f43f5e' }}>{expPct}%</strong>
                          </div>
                        </div>

                        {(hasInvestmentTimeline && invPct > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1', flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccountLegend')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualInvestment)}</span>
                              <strong style={{ color: '#6366f1' }}>{invPct}%</strong>
                            </div>
                          </div>
                        )}

                        {(hasLoanTimeline && loanPct > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', flexShrink: 0 }} />
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.dueLegend')}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualLoan)}</span>
                              <strong style={{ color: '#f59e0b' }}>{loanPct}%</strong>
                            </div>
                          </div>
                        )}

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.availableLegend')}</span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>+{formatCurrency(Math.max(0, annualNet))}</span>
                            <strong style={{ color: '#10b981' }}>{freePct}%</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {t('balanceHeader.totalAnnualProjected')}
                      </span>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.02)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.balanceLabel')}</span>
                          <strong style={{ color: annualNet >= 0 ? '#10b981' : '#f43f5e' }}>
                            {annualNet >= 0 ? '+' : ''}{formatCurrency(annualNet)}
                          </strong>
                        </div>
                        {(hasInvestmentTimeline && annualInvestment > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccount')}</span>
                            <strong style={{ color: '#6366f1' }}>
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

            {/* Quadrante 3: EMPRÉSTIMOS E FINANCIAMENTOS (Apenas exibido se houver timelines de dívida ativas) */}
            {hasLoanTimeline && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ fontSize: '0.74rem', fontWeight: '800', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {t('balanceHeader.loansAndFinancing')}
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
                    const isLoan = isLoanTimelineType(t.type);
                    const isActive = t.status === TimelineStatus.ACTIVE || !t.status;
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
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }}>{t('balanceHeader.amortizedCapital')}</span>
                          <strong style={{ color: '#10b981', fontSize: '0.84rem', fontWeight: '800' }}>
                            {formatCurrency(totalAmortizedVal)}
                          </strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                          <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }}>{t('balanceHeader.debtCapital')}</span>
                          <strong style={{ color: '#f43f5e', fontSize: '0.84rem', fontWeight: '800' }}>
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
              <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', display: 'inline-block' }} />
                {t('balanceHeader.futureProjection')}
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
                    {t('balanceHeader.forecastHorizon')}
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
                    accentColor: '#0284c7',
                    cursor: 'pointer',
                    height: '6px'
                  }}
                  title={t('balanceHeader.projectToTitle', { date: projectedHorizonLabel })}
                />
                <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', whiteSpace: 'nowrap' }}>
                  {t('balanceHeader.plusYears', { count: 10 })}
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
                        <span className="meta-label" style={{ fontSize: '0.7rem' }}>{t('balanceHeader.projectedBalance')}</span>
                        <span style={{ color: netProj >= 0 ? '#38bdf8' : '#f43f5e', fontSize: '0.96rem', fontWeight: '800' }}>
                          {netProj >= 0 ? '+' : ''}{formatCurrency(netProj)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.forecastInflows')}</span>
                          <span style={{ color: '#38bdf8', fontSize: '0.78rem', fontWeight: '700' }}>
                            +{formatCurrency(forecastInc)}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.forecastOutflows')}</span>
                          <span style={{ color: '#fb7185', fontSize: '0.78rem', fontWeight: '700' }}>
                            -{formatCurrency(plannedExp)}
                          </span>
                        </div>
                        {(hasInvestmentTimeline && plannedInv > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.investments')}</span>
                            <span style={{ color: '#6366f1', fontSize: '0.78rem', fontWeight: '700' }}>
                              -{formatCurrency(plannedInv)}
                            </span>
                          </div>
                        )}
                        {(hasLoanTimeline && plannedAmort > 0) && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                            <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.amortizedCapital')}:</span>
                            <span style={{ color: '#10b981', fontSize: '0.78rem', fontWeight: '700' }}>
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
                  {t('balanceHeader.computeModalTitle')}
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
                {t('balanceHeader.computeModalDescription')}
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
                {t('balanceHeader.selectMonthYear')}
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
                {t('balanceHeader.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => handleSaveComputeMonth(tempComputeMonth)}
                style={{ padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}
              >
                {t('balanceHeader.saveAndApply')}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </HeaderShell>
  );
}
