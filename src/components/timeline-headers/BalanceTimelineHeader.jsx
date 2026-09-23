import React, { useState, useId } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar,
  Layers,
  Sparkles,
  Clock,
  TrendingUp,
  TrendingDown,
  Wallet,
  Plus,
  X,
  Settings
} from 'lucide-react';
import { format, parseISO, subMonths, addMonths } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { formatCurrency } from '../../utils/formatCurrency';
import { getPrincipal } from '../../utils/loanCalculations.js';
import {
  EventType,
  EventStatus,
  TimelineType,
  TimelineStatus,
  LoanEventCategory,
  IncomeEventCategory,
  ExpenseEventCategory,
  ExpensesEventCategory,
  InvestmentEventCategory,
  AmortizationEventCategory,
  AmortizationStrategy,
  TimelineColor,
  TIMELINE_COLOR_PRESETS,
  isPositiveStatus,
  isCancelledStatus,
  isLoanTimelineType,
  normalizeTimelineType
} from '../../enums/index.js';
import * as api from '../../services/api.js';
import HeaderTitleBlock from '../ui/HeaderTitleBlock.jsx';
import HeaderShell from '../ui/HeaderShell.jsx';
import { PieDonut } from '../ui/DonutChart.jsx';
import IncomeEvolutionChart from '../IncomeEvolutionChart.jsx';
import { getPaletteTheme } from '../../../shared/config/colorPalettes.js';

function Last6MonthsTimeSeriesChart({ series = [], t }) {
  const [hoveredKey, setHoveredKey] = useState(null);
  const rawId = useId();
  const gradId = 'tsGrad_' + rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const activeMonth = series.find((m) => m.key === hoveredKey) || series[series.length - 1];

  const svgWidth = 260;
  const svgHeight = 80;
  const padX = 28;
  const usableWidth = svgWidth - padX - 16;
  const stepX = usableWidth / Math.max(1, series.length - 1);

  const topY = 16;
  const bottomY = 56;
  const plotSpan = bottomY - topY; // 40px

  const safeNets = (series || []).map((m) => {
    const val = Number(m?.net);
    return Number.isFinite(val) ? val : 0;
  });
  const maxVal = Math.max(...safeNets, 0);
  const minVal = Math.min(...safeNets, 0);

  // Escala linear exata com zero estritamente ancorado
  const getY = (val) => {
    const safeVal = Number.isFinite(val) ? val : 0;
    if (maxVal === 0 && minVal === 0) {
      return (topY + bottomY) / 2;
    }
    if (minVal >= 0) {
      const range = maxVal || 1;
      return bottomY - (safeVal / range) * plotSpan;
    }
    if (maxVal <= 0) {
      const range = Math.abs(minVal) || 1;
      return topY + (Math.abs(safeVal) / range) * plotSpan;
    }
    const totalRange = maxVal - minVal;
    if (totalRange <= 0) return (topY + bottomY) / 2;
    return topY + ((maxVal - safeVal) / totalRange) * plotSpan;
  };

  const zeroY = getY(0);

  const points = (series || []).map((m, idx) => {
    const safeNet = Number.isFinite(Number(m?.net)) ? Number(m.net) : 0;
    const x = padX + idx * stepX;
    const y = getY(safeNet);
    return { ...m, net: safeNet, x, y };
  });

  const pathD = points.reduce((acc, pt, idx, arr) => {
    if (idx === 0) return `M ${pt.x} ${pt.y}`;
    const prev = arr[idx - 1];
    const cX = prev.x + (pt.x - prev.x) / 2;
    return `${acc} C ${cX} ${prev.y}, ${cX} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const isAllPositive = points.every((p) => p.net >= 0);
  const isAllNegative = points.every((p) => p.net < 0);
  const strokeColor = isAllPositive
    ? TimelineColor.SUCCESS
    : isAllNegative
      ? TimelineColor.EXPENSE
      : `url(#${gradId})`;

  const formatCompact = (val) => {
    const abs = Math.abs(val);
    const sign = val >= 0 ? '+' : '-';
    if (abs >= 1000) {
      return `${sign}${(abs / 1000).toFixed(1).replace('.0', '')}k`;
    }
    return `${sign}${Math.round(abs)}€`;
  };

  return (
    <div style={{ borderTop: '1px solid var(--border-glass)', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {t('balanceHeader.last6MonthsBalance')}
        </span>
        {activeMonth && (
          <span style={{ fontSize: '0.68rem', fontWeight: '800', color: activeMonth.net >= 0 ? TimelineColor.SUCCESS : TimelineColor.EXPENSE }}>
            <span style={{ color: 'var(--text-dim)', fontWeight: '600', textTransform: 'capitalize', marginRight: '4px' }}>{activeMonth.label}:</span>
            {activeMonth.net >= 0 ? '+' : ''}{formatCurrency(activeMonth.net)}
          </span>
        )}
      </div>

      <div style={{ width: '100%', height: '80px', position: 'relative' }}>
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
        >
          <defs>
            <linearGradient
              id={gradId}
              gradientUnits="userSpaceOnUse"
              x1={padX}
              y1="0"
              x2={padX + usableWidth}
              y2="0"
            >
              {points.map((pt, idx) => {
                const pct = (idx / Math.max(1, points.length - 1)) * 100;
                const color = pt.net >= 0 ? TimelineColor.SUCCESS : TimelineColor.EXPENSE;
                return <stop key={pt.key || idx} offset={`${pct}%`} stopColor={color} />;
              })}
            </linearGradient>
          </defs>

          {/* Linha Horizontal do Zero e Rótulo 0 bem visíveis e destacados */}
          <line
            x1={padX - 4}
            y1={zeroY}
            x2={svgWidth - 8}
            y2={zeroY}
            stroke="var(--text-muted)"
            strokeWidth="1.5"
            strokeDasharray="3 3"
          />
          <text
            x={padX - 7}
            y={zeroY + 3}
            textAnchor="end"
            fill="var(--text-muted)"
            fontSize="8.5"
            fontWeight="800"
          >
            0
          </text>

          {/* Linha da série temporal (verde no positivo, vermelho no negativo) */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Pontos de cada mês */}
          {points.map((pt) => {
            const isPos = pt.net >= 0;
            const ptColor = isPos ? TimelineColor.SUCCESS : TimelineColor.EXPENSE;
            const isHovered = hoveredKey === pt.key;
            const textY = isPos ? Math.max(9, pt.y - 5) : Math.min(67, pt.y + 11);

            return (
              <g
                key={pt.key}
                onMouseEnter={() => setHoveredKey(pt.key)}
                onMouseLeave={() => setHoveredKey(null)}
                style={{ cursor: 'pointer' }}
              >
                <title>{`${pt.label} (${pt.key}): ${isPos ? '+' : ''}${formatCurrency(pt.net)}`}</title>

                {/* Área de captura de hover transparente */}
                <circle cx={pt.x} cy={pt.y} r={14} fill="transparent" />

                {/* Nó pontual da time series */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5 : (pt.isCurrent ? 4 : 3)}
                  fill={ptColor}
                  stroke="var(--bg-app)"
                  strokeWidth="1.5"
                  style={{ transition: 'r 0.15s ease' }}
                />

                {/* Valor compacto do mês */}
                <text
                  x={pt.x}
                  y={textY}
                  textAnchor="middle"
                  fill={ptColor}
                  fontSize="7.5"
                  fontWeight="800"
                >
                  {formatCompact(pt.net)}
                </text>

                {/* Rótulo do Mês */}
                <text
                  x={pt.x}
                  y={svgHeight - 2}
                  textAnchor="middle"
                  fill={pt.isCurrent ? 'var(--text-main)' : 'var(--text-dim)'}
                  fontSize="8.5"
                  fontWeight={pt.isCurrent ? '800' : '600'}
                  style={{ textTransform: 'capitalize' }}
                >
                  {pt.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default function BalanceTimelineHeader({
  timeline,
  timeboard = null,
  allTimelines = [],
  events = [],
  allEvents = [],
  filteredEvents,
  pockets = [],
  onEdit,
  _onDelete,
  onAddEvent,
  _onReset,
  activeViewMode = 'summary',
  setActiveViewMode,
  computeStartDate = null,
  monthExpensesTotalMap: propMonthExpensesTotalMap = null,
  monthLoansTotalMap: propMonthLoansTotalMap = null,
  monthIncomeTotalMap: propMonthIncomeTotalMap = null,
  monthInvestmentsTotalMap: _propMonthInvestmentsTotalMap = null,
  monthInvestmentsDeductionsMap: propMonthInvestmentsDeductionsMap = null,
  hasExpenseTimeline: propHasExpenseTimeline,
  hasLoanTimeline: propHasLoanTimeline,
  hasIncomeTimeline: propHasIncomeTimeline,
  hasInvestmentTimeline: propHasInvestmentTimeline,
  computeFromMonth: propComputeFromMonth
}) {
  const { t, language } = useTranslation();
  const dateLocale = language === 'en' ? enUS : pt;
  const currentMonthStr = format(new Date(), 'yyyy-MM');
  const [collapsed, setIsCollapsed] = useState(false);
  const [projectionMonthsAhead, setProjectionMonthsAhead] = useState(0);

  const incomeTimeline = React.useMemo(() => (allTimelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.INCOME), [allTimelines]);
  const expenseTimeline = React.useMemo(() => (allTimelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.EXPENSE), [allTimelines]);
  const investmentTimeline = React.useMemo(() => (allTimelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.INVESTMENT), [allTimelines]);
  const primaryLoanTimeline = React.useMemo(() => (allTimelines || []).find((t) => isLoanTimelineType(t?.type)), [allTimelines]);

  const paletteTheme = React.useMemo(() => getPaletteTheme(timeline?.color, TimelineColor.CYAN), [timeline?.color]);
  const incomePalette = React.useMemo(() => getPaletteTheme(incomeTimeline?.color, TimelineColor.INCOME), [incomeTimeline?.color]);
  const expensePalette = React.useMemo(() => getPaletteTheme(expenseTimeline?.color, TimelineColor.EXPENSE), [expenseTimeline?.color]);
  const investmentPalette = React.useMemo(() => getPaletteTheme(investmentTimeline?.color, TimelineColor.INVESTMENT), [investmentTimeline?.color]);
  const loanPalette = React.useMemo(() => getPaletteTheme(primaryLoanTimeline?.color, TimelineColor.LOAN), [primaryLoanTimeline?.color]);

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
    if (filteredEvents !== undefined) {
      return filteredEvents;
    }
    const map = new Map();
    const addIfValid = (e) => {
      if (!e || !e.id) return;
      if (e.isVirtualWithdrawal || String(e.id).startsWith('virtual_withdrawal_')) return;
      if (validTimelineIds.size > 0) {
        const hasValid = (e.timelineId && validTimelineIds.has(String(e.timelineId))) ||
          (e.timelineOriginId && validTimelineIds.has(String(e.timelineOriginId))) ||
          (e.timeline_id && validTimelineIds.has(String(e.timeline_id)));
        const isPocketEvent = Boolean(e.pocketId || e.pocket_id);
        if (!hasValid && !isPocketEvent) return;
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
  }, [filteredEvents, events, timeline?.events, allTimelines, validTimelineIds]);

  const [fetchedPockets, setFetchedPockets] = useState([]);

  React.useEffect(() => {
    if (Array.isArray(pockets) && pockets.length > 0) {
      return;
    }
    const invTl = (allTimelines || []).find((tl) => normalizeTimelineType(tl?.type) === TimelineType.INVESTMENT);
    const tbId = timeboard?.id || timeline?.timeboardId || timeline?.timeboard_id;
    const tlId = invTl?.id;

    if (tlId || tbId) {
      const params = tlId ? { timelineId: tlId } : { timeboardId: tbId };
      api.getPockets(params).then((res) => {
        if (Array.isArray(res)) setFetchedPockets(res);
        else if (res && Array.isArray(res.data)) setFetchedPockets(res.data);
      }).catch((e) => console.error('Failed to fetch pockets in BalanceTimelineHeader:', e));
    }
  }, [pockets, allTimelines, timeboard?.id, timeline?.timeboardId, timeline?.timeboard_id]);

  const effectivePockets = (Array.isArray(pockets) && pockets.length > 0) ? pockets : fetchedPockets;

  const totalPocketsInitial = React.useMemo(() => {
    // Use effectivePockets directly (allTimelines from API does not include .pockets sub-arrays)
    if (Array.isArray(effectivePockets) && effectivePockets.length > 0) {
      return effectivePockets.reduce((sum, p) => sum + Number(p.initial_value ?? p.initialValue ?? 0), 0);
    }

    // Fallback: check allTimelines.pockets (populated when timeline objects include them)
    let sum = 0;
    (allTimelines || []).forEach((tl) => {
      if (normalizeTimelineType(tl?.type) === TimelineType.INVESTMENT) {
        let pocketsSum = 0;
        if (Array.isArray(tl.pockets) && tl.pockets.length > 0) {
          tl.pockets.forEach((p) => {
            pocketsSum += Number(p.initial_value ?? p.initialValue ?? 0);
          });
        }
        if (pocketsSum > 0) {
          sum += pocketsSum;
        } else {
          sum += Number(tl.initialValue ?? tl.initial_value ?? 0);
        }
      }
    });

    if (sum === 0) {
      const seenInitial = new Set();
      (eventsList || []).forEach((ev) => {
        const isInvestmentEv = ev.eventType === EventType.INVESTMENT || ev.isInvestment === true || Boolean(ev.pocketId || ev.pocket_id);
        if (isInvestmentEv && Number(ev.initialInvestedAmount || 0) > 0 && (ev.isFirstOccurrence || !ev.isProjected)) {
          const key = ev.pocketId || ev.pocket_id || ev.seriesId || ev.eventId || ev.id;
          if (!seenInitial.has(key)) {
            sum += Number(ev.initialInvestedAmount);
            seenInitial.add(key);
          }
        }
      });
    }
    return sum;
  }, [effectivePockets, allTimelines, eventsList]);

  const headerColor = paletteTheme.primary;

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

  const rawComputeStart = computeStartDate || timeboard?.computeFrom || timeboard?.compute_from || timeline?.computeFrom || timeline?.compute_from || timeline?.startDate || timeline?.start_date;
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
  const hasLoanTimeline = propHasLoanTimeline !== undefined
    ? propHasLoanTimeline
    : activeLoanTimelines.length > 0;
  const hasInvestmentTimeline = propHasInvestmentTimeline !== undefined
    ? propHasInvestmentTimeline
    : (allTimelines || []).some((t) => normalizeTimelineType(t?.type) === TimelineType.INVESTMENT && t.status !== TimelineStatus.INACTIVE && t.isActive !== false);
  const hasIncomeTimeline = propHasIncomeTimeline !== undefined
    ? propHasIncomeTimeline
    : (allTimelines || []).some((t) => normalizeTimelineType(t?.type) === TimelineType.INCOME && t.status !== TimelineStatus.INACTIVE && t.isActive !== false);
  const hasExpenseTimeline = propHasExpenseTimeline !== undefined
    ? propHasExpenseTimeline
    : (allTimelines || []).some((t) => normalizeTimelineType(t?.type) === TimelineType.EXPENSE && t.status !== TimelineStatus.INACTIVE && t.isActive !== false);

  const effectiveComputeFromMonth = propComputeFromMonth !== undefined
    ? propComputeFromMonth
    : (() => {
        const rawComputeStart = computeStartDate || timeboard?.computeStartDate || timeboard?.compute_start_date || timeline?.computeStartDate || timeline?.compute_start_date;
        return rawComputeStart && String(rawComputeStart) !== '1900-01' && !String(rawComputeStart).startsWith('1900-01') && String(rawComputeStart) !== 'all'
          ? String(rawComputeStart).substring(0, 7)
          : null;
      })();

  const last6MonthsSeries = React.useMemo(() => {
    const refDate = projectionMonthsAhead > 0 ? addMonths(new Date(), projectionMonthsAhead) : new Date();
    const months = [];

    // Priorizar os maps pré-calculados do VerticalTimeline (mesma fonte exata do MonthProjectionBadges)
    let incomeMap = propMonthIncomeTotalMap;
    let expenseMap = propMonthExpensesTotalMap;
    let loanMap = propMonthLoansTotalMap;
    let investDeductionsMap = propMonthInvestmentsDeductionsMap;

    if (!incomeMap || !expenseMap || !loanMap || !investDeductionsMap) {
      incomeMap = new Map();
      expenseMap = new Map();
      loanMap = new Map();
      investDeductionsMap = new Map();

      const sourceEvents = (filteredEvents !== undefined)
        ? filteredEvents
        : ((allEvents && allEvents.length > 0) ? allEvents : (eventsList || []));
      (sourceEvents || []).forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
        if (effectiveComputeFromMonth && ev.date.substring(0, 7) < effectiveComputeFromMonth) return;

        const mKey = ev.date.substring(0, 7);
        const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT;
        const isExpense = (ev.eventType === EventType.EXPENSE || ev.category === ExpensesEventCategory.RECURRING_EXPENSE || ev.isExpense) && !isLoan;
        const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== AmortizationEventCategory.REDUCE_TERM && ev.category !== AmortizationEventCategory.REDUCE_INSTALLMENT);
        const isInvestmentForIncome = ev.eventType === EventType.INVESTMENT || ev.category === InvestmentEventCategory.SAVINGS || ev.isInvestment;
        const isIncome = (ev.eventType === EventType.INCOME || ev.category === IncomeEventCategory.RECURRING_INCOME || ev.isIncome) && !isLoan && !isInvestmentForIncome;

        if (isExpense) {
          expenseMap.set(mKey, (expenseMap.get(mKey) || 0) + Math.abs(Number(ev.amount || 0)));
        }
        if (isLoanInstallment && !(ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida)) {
          const amt = Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0));
          loanMap.set(mKey, (loanMap.get(mKey) || 0) + Math.abs(amt));
        }
        if (isIncome) {
          incomeMap.set(mKey, (incomeMap.get(mKey) || 0) + Math.abs(Number(ev.amount || 0)));
        }

        const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
        if (!isExternal) {
          const isWithdrawal = Boolean(
            ev.isWithdrawal ||
            ev.eventType === EventType.WITHDRAWAL ||
            ev.isVirtualWithdrawal ||
            (ev.id && String(ev.id).startsWith('virtual_withdrawal_')) ||
            (ev.eventType === EventType.EXPENSE && (Boolean(ev.pocketId || ev.pocket_id) || ev.isInvestment)) ||
            Number(ev.amount || 0) < 0
          );
          if (!isWithdrawal) {
            const isInvestment =
              ev.eventType === EventType.INVESTMENT ||
              ev.category === InvestmentEventCategory.SAVINGS ||
              ev.isInvestment ||
              Boolean(ev.pocketId || ev.pocket_id);
            if (isInvestment) {
              const amt = Math.abs(Number(ev.amount || 0));
              investDeductionsMap.set(mKey, (investDeductionsMap.get(mKey) || 0) + amt);
            }
          }
        }
      });
    }

    for (let i = 5; i >= 0; i--) {
      const d = subMonths(refDate, i);
      const monthKey = format(d, 'yyyy-MM');
      const monthLabel = format(d, 'MMM', { locale: dateLocale });

      const rawIncome = hasIncomeTimeline ? (incomeMap.get(monthKey) || 0) : 0;
      const rawExpense = hasExpenseTimeline ? (expenseMap.get(monthKey) || 0) : 0;
      const rawLoan = hasLoanTimeline ? (loanMap.get(monthKey) || 0) : 0;
      const rawInvestDeduction = hasInvestmentTimeline ? (investDeductionsMap.get(monthKey) || 0) : 0;

      const income = Number.isFinite(Number(rawIncome)) ? Number(rawIncome) : 0;
      const expense = Number.isFinite(Number(rawExpense)) ? Number(rawExpense) : 0;
      const loan = Number.isFinite(Number(rawLoan)) ? Number(rawLoan) : 0;
      const investDeduction = Number.isFinite(Number(rawInvestDeduction)) ? Number(rawInvestDeduction) : 0;

      // Saldo projetado do mês = Entradas - (Despesas + Empréstimos + Deduções de Poupança/Investimento)
      const projectedSaldo = income - (expense + loan + investDeduction);

      months.push({
        key: monthKey,
        label: monthLabel,
        income,
        expense,
        loan,
        investment: investDeduction,
        net: projectedSaldo,
        isCurrent: format(d, 'yyyy-MM') === currentMonthStr
      });
    }

    return months;
  }, [
    propMonthIncomeTotalMap,
    propMonthExpensesTotalMap,
    propMonthLoansTotalMap,
    propMonthInvestmentsDeductionsMap,
    allEvents,
    eventsList,
    effectiveComputeFromMonth,
    hasIncomeTimeline,
    hasExpenseTimeline,
    hasLoanTimeline,
    hasInvestmentTimeline,
    dateLocale,
    projectionMonthsAhead,
    currentMonthStr
  ]);

  if (!timeline) return null;

  const todayDate = new Date();
  const currentMonthLabel = (() => {
    try {
      return format(todayDate, 'MMMM yyyy', { locale: dateLocale });
    } catch {
      return '';
    }
  })();

  // 1. Initial Value from Income Timeline (Timeline de Entrada)
  const incomeInitialValue = Number(
    incomeTimeline?.initialValue ??
    incomeTimeline?.initial_value ??
    (normalizeTimelineType(timeline?.type) === TimelineType.INCOME ? (timeline.initialValue ?? timeline.initial_value ?? 0) : 0)
  );

  // 2. Realized totals (REALIZADO até o mês atual) - used in Quadrante 1 (Saldo Líquido Acumulado)
  // This does NOT change with the slider progression (projectionMonthsAhead)
  let realizedIncome = 0;
  let realizedExpenses = 0;
  let realizedInvestmentsDeductions = 0;
  let realizedInvestmentsTotal = 0;
  let realizedWithdrawals = 0;
  let realizedLoanPaid = 0;
  let realizedAmortized = 0;

  // 3. Projected / Planned totals (PLANEJADO até o horizonte targetHorizonMonthStr) - used in slider and projected cards
  let plannedIncome = 0;
  let plannedExpenses = 0;
  let plannedInvestmentsDeductions = 0;
  let plannedInvestmentsTotal = 0;
  let plannedWithdrawals = 0;
  let plannedLoanPaidAndDue = 0;
  let plannedAmortized = 0;

  eventsList.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;

    const eventMonthStr = ev.date.substring(0, 7);
    const isAfterStart = !computeFromMonth || computeFromMonth === '1900-01' || eventMonthStr >= computeFromMonth;
    if (!isAfterStart) return;

    const isUpToCurrentMonth = eventMonthStr <= currentMonthStr;
    const isUpToHorizon = eventMonthStr <= targetHorizonMonthStr;

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
    const absAmt = Math.abs(amt);

    const isPaid = isPositiveStatus(ev.status) || isPositiveStatus(ev.status?.toLowerCase()) || Boolean(ev.isCompleted);

    // Loan Handling
    if (isLoan) {
      // Realized loan (up to current month, only if paid)
      if (isUpToCurrentMonth && isPaid) {
        realizedLoanPaid += absAmt;
        if (isAmortization) {
          realizedAmortized += absAmt;
        }
      }

      // Planned loan (up to target horizon, all installments/amortizations)
      if (isUpToHorizon) {
        plannedLoanPaidAndDue += absAmt;
        if (isPaid) {
          if (isAmortization) {
            plannedAmortized += absAmt;
          }
        } else {
          if (isAmortization) {
            plannedAmortized += absAmt;
          } else if (isLoanInst) {
            const principalAmt = getPrincipal(ev);
            plannedAmortized += principalAmt;
          }
        }
      }
      return;
    }

    const normalizedTlType = normalizeTimelineType(tlType || ev.timelineType || ev.timeline_type);

    const isIncome = (
      ev.eventType === EventType.INCOME ||
      normalizedTlType === TimelineType.INCOME ||
      ev.category === IncomeEventCategory.RECURRING_INCOME ||
      Boolean(ev.isIncome)
    ) && !isLoan;

    const isInvestment = (
      ev.eventType === EventType.INVESTMENT ||
      ev.eventType === 'investment' ||
      ev.eventType === 'investments' ||
      ev.eventType === EventType.WITHDRAWAL ||
      ev.category === InvestmentEventCategory.SAVINGS ||
      ev.category === 'savings' ||
      ev.category === 'investimento' ||
      normalizedTlType === TimelineType.INVESTMENT ||
      Boolean(ev.isInvestment) ||
      Boolean(ev.isWithdrawal) ||
      Boolean(ev.pocketId || ev.pocket_id)
    ) && !isLoan;

    const isWithdrawal = Boolean(
      ev.isWithdrawal ||
      ev.eventType === EventType.WITHDRAWAL ||
      (isInvestment && (ev.eventType === EventType.EXPENSE || ev.isExpense || Number(ev.amount || 0) < 0))
    );
    const multiplier = isWithdrawal ? -1 : 1;
    if (absAmt <= 0) return;

    const isExpense = (
      ev.eventType === EventType.EXPENSE ||
      normalizedTlType === TimelineType.EXPENSE ||
      ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
      Boolean(ev.isExpense)
    ) && !isIncome && !isInvestment && !isLoan;

    const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted) || ev.status === EventStatus.WITHDRAWN;

    // Accumulate Realized (only up to current month and realized)
    if (isUpToCurrentMonth && isRealized) {
      if (isIncome) {
        realizedIncome += absAmt;
      } else if (isInvestment) {
        realizedInvestmentsTotal += multiplier * absAmt;
        if (!ev.isExternal && !ev.is_external) {
          realizedInvestmentsDeductions += multiplier * absAmt;
        }
        if (isWithdrawal) {
          realizedWithdrawals += absAmt;
        }
      } else if (isExpense) {
        realizedExpenses += absAmt;
      }
    }

    // Accumulate Planned (up to target horizon, all planned events)
    if (isUpToHorizon) {
      if (isIncome) {
        plannedIncome += absAmt;
      } else if (isInvestment) {
        plannedInvestmentsTotal += multiplier * absAmt;
        if (!ev.isExternal && !ev.is_external) {
          plannedInvestmentsDeductions += multiplier * absAmt;
        }
        if (isWithdrawal) {
          plannedWithdrawals += absAmt;
        }
      } else if (isExpense) {
        plannedExpenses += absAmt;
      }
    }
  });

  const activeLoanTimelinesSum = activeLoanTimelines.reduce((sum, t) => {
    const m = t.loanHeaderResult || t.procedureMetrics || t.metrics || {};
    return sum + Number(m.remainingDebt ?? m.remaining_debt ?? m.remainingBalance ?? m.remaining_balance ?? m.totalDebt ?? m.total_debt ?? t.totalDebt ?? 0);
  }, 0);

  const rawRemainingDebt = rawMetrics.total_remaining_debt ?? rawMetrics.totalRemainingDebt ?? rawMetrics.totalActiveDebt ?? 0;
  const initialBaseRemainingDebt = activeLoanTimelinesSum > 0 ? activeLoanTimelinesSum : rawRemainingDebt;
  const computedRemainingDebt = Math.max(0, initialBaseRemainingDebt - (projectionMonthsAhead > 0 ? plannedAmortized : realizedAmortized));

  const realizedPaidExpenses = realizedExpenses + realizedLoanPaid;
  // Saldo Líquido do período (Realizado até o mês atual + Saldo Inicial da timeline de Entrada)
  const netRealizedAccumulated = incomeInitialValue + realizedIncome - realizedPaidExpenses - realizedInvestmentsDeductions;

  const plannedTotalExpenses = plannedExpenses + plannedLoanPaidAndDue;
  // Balanço Projetado (Planejado até o horizonte do slider + Saldo Inicial da timeline de Entrada)
  const netProjected = incomeInitialValue + plannedIncome - plannedTotalExpenses - plannedInvestmentsDeductions;

  const finMetrics = {
    ...rawMetrics,
    netRealized: netRealizedAccumulated,
    netProjected,
    incomeInitialValue,
    totalReceived: realizedIncome,
    totalPaidExpenses: realizedPaidExpenses,
    totalInvested: realizedInvestmentsTotal,
    totalWithdrawals: realizedWithdrawals,
    totalPeriodDueDebt: Math.max(0, plannedLoanPaidAndDue - realizedLoanPaid),
    totalLoanPaid: realizedLoanPaid,
    totalRemainingDebt: computedRemainingDebt,
    totalAmortized: projectionMonthsAhead > 0 ? plannedAmortized : (realizedAmortized > 0 ? realizedAmortized : (rawMetrics.total_amortized ?? rawMetrics.totalAmortized ?? 0)),
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
                    background: activeViewMode === 'summary' ? `${paletteTheme.primary}2e` : 'transparent',
                    color: activeViewMode === 'summary' ? paletteTheme.primary : 'var(--text-muted)'
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
                    background: activeViewMode === 'graph' ? `${paletteTheme.primary}2e` : 'transparent',
                    color: activeViewMode === 'graph' ? paletteTheme.primary : 'var(--text-muted)'
                  }}
                >
                  <Sparkles size={13} />
                  <span>{t('balanceHeader.evolutionView')}</span>
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
              {/* Grid Principal 2x2 padronizado com Donut SVGs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
                {/* Quadrante 1: BALANÇO ATÉ O HORIZONTE */}
                <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-glass)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {(() => {
                    const totalReceivedVal = finMetrics.totalReceived ?? 0;
                    const totalPaidExpensesVal = finMetrics.totalPaidExpenses ?? 0;
                    const totalInvestedVal = (finMetrics.totalInvested ?? 0) + totalPocketsInitial;
                    const totalWithdrawalsVal = finMetrics.totalWithdrawals ?? 0;
                    const totalRemainingDebtVal = finMetrics.totalRemainingDebt ?? 0;
                    const netVal = finMetrics.netRealized;

                    const isPositive = netVal >= 0;
                    const netColor = isPositive ? TimelineColor.SUCCESS : TimelineColor.EXPENSE;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
                        {/* Bloco Destaque Principal do Saldo Líquido */}
                        <div
                          style={{
                            background: `linear-gradient(135deg, ${netColor}1c, ${netColor}08)`,
                            border: `1.5px solid ${netColor}44`,
                            boxShadow: `0 4px 18px ${netColor}1a, inset 0 0 12px ${netColor}0d`,
                            borderRadius: '12px',
                            padding: '12px 14px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <Wallet size={14} style={{ color: netColor, opacity: 0.9 }} />
                              <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                {t('balanceHeader.netRealizedAccumulated')}
                              </span>
                            </div>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px',
                                fontSize: '0.64rem',
                                fontWeight: '800',
                                padding: '2px 7px',
                                borderRadius: '999px',
                                background: `${netColor}22`,
                                color: netColor
                              }}
                            >
                              {isPositive ? <TrendingUp size={11} strokeWidth={2.5} /> : <TrendingDown size={11} strokeWidth={2.5} />}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: '1.85rem',
                              fontWeight: '900',
                              color: netColor,
                              lineHeight: 1.1,
                              letterSpacing: '-0.025em',
                              textShadow: `0 0 20px ${netColor}4d`
                            }}
                          >
                            {isPositive ? '+' : ''}{formatCurrency(netVal)}
                          </div>
                        </div>

                        {/* Indicador do Período (Abaixo da Caixa do Saldo) */}
                        <div style={{ fontSize: '0.70rem', fontWeight: '700', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '0 2px' }}>
                          {t('balanceHeader.currentBalanceTitle', { month: currentMonthLabel })}
                        </div>

                        {/* Detalhes Secundários (Recebido, Gasto, Poupado, Devido) */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingTop: '2px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inflows')}</span>
                            <strong style={{ color: incomePalette.primary, fontSize: '0.74rem' }}>
                              +{formatCurrency(totalReceivedVal + totalWithdrawalsVal).replace(',00', '')}
                            </strong>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.outflows')}</span>
                            <strong style={{ color: expensePalette.primary, fontSize: '0.74rem' }}>-{formatCurrency(totalPaidExpensesVal).replace(',00', '')}</strong>
                          </div>
                          {((hasInvestmentTimeline || totalInvestedVal > 0) && totalInvestedVal > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccount')}</span>
                              <strong style={{ color: investmentPalette.primary, fontSize: '0.74rem' }}>{formatCurrency(totalInvestedVal).replace(',00', '')}</strong>
                            </div>
                          )}
                          {(hasLoanTimeline && totalRemainingDebtVal > 0) && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.70rem', alignItems: 'center' }}>
                              <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.due')}</span>
                              <strong style={{ color: loanPalette.primary, fontSize: '0.74rem' }}>{formatCurrency(totalRemainingDebtVal).replace(',00', '')}</strong>
                            </div>
                          )}
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

                      const isIncome = (
                        ev.eventType === EventType.INCOME ||
                        tlType === TimelineType.INCOME ||
                        ev.category === IncomeEventCategory.RECURRING_INCOME ||
                        Boolean(ev.isIncome)
                      ) && !isLoan;

                      const isInvestment = (
                        ev.eventType === EventType.INVESTMENT ||
                        ev.eventType === EventType.WITHDRAWAL ||
                        tlType === TimelineType.INVESTMENT ||
                        Boolean(ev.isInvestment) ||
                        Boolean(ev.isWithdrawal) ||
                        Boolean(ev.pocketId || ev.pocket_id)
                      ) && !isLoan;

                      const isWithdrawal = Boolean(
                        ev.isWithdrawal ||
                        ev.eventType === EventType.WITHDRAWAL ||
                        (isInvestment && (ev.eventType === EventType.EXPENSE || ev.isExpense || Number(ev.amount || 0) < 0))
                      );
                      const multiplier = isWithdrawal ? -1 : 1;
                      const absAmt = Math.abs(amt);
                      if (absAmt <= 0) return;

                      const isExpense = (
                        ev.eventType === EventType.EXPENSE ||
                        tlType === TimelineType.EXPENSE ||
                        ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
                        Boolean(ev.isExpense)
                      ) && !isIncome && !isInvestment && !isLoan;

                      if (isIncome) {
                        annualIncome += absAmt;
                      } else if (isExpense) {
                        annualExpense += absAmt;
                      } else if (isInvestment && !ev.isExternal && !ev.is_external) {
                        annualInvestment += multiplier * absAmt;
                      } else if (
                        hasLoanTimeline &&
                        (annualLoan === 0 || projectionMonthsAhead > 0) &&
                        (isLoanInst || isAmortization) &&
                        activeLoanIds.has(String(ev.timelineId || ev.timeline_id || ''))
                      ) {
                        annualLoan += absAmt;
                      }
                    });

                    const expPct = annualIncome > 0 ? Math.round((annualExpense / annualIncome) * 100) : 0;
                    const invPct = (annualIncome > 0 && annualInvestment > 0) ? Math.round((annualInvestment / annualIncome) * 100) : 0;
                    const loanPct = (hasLoanTimeline && annualIncome > 0) ? Math.round((annualLoan / annualIncome) * 100) : 0;
                    const freePct = Math.max(0, 100 - expPct - invPct - loanPct);

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

                          <Last6MonthsTimeSeriesChart series={last6MonthsSeries} t={t} />
                        </div>
                      );
                    }

                    // Fatias do Donut com as cores das timelines de origem
                    const segments = [
                      { name: t('balanceHeader.expensesLegend'), label: t('balanceHeader.expensesLegend'), percent: expPct, pct: expPct, amount: annualExpense, color: expensePalette.primary },
                      ...((hasInvestmentTimeline && invPct > 0) ? [{ name: t('balanceHeader.inAccountLegend'), label: t('balanceHeader.inAccountLegend'), percent: invPct, pct: invPct, amount: annualInvestment, color: investmentPalette.primary }] : []),
                      ...((hasLoanTimeline && loanPct > 0) ? [{ name: t('balanceHeader.dueLegend'), label: t('balanceHeader.dueLegend'), percent: loanPct, pct: loanPct, amount: annualLoan, color: loanPalette.primary }] : []),
                      ...(freePct > 0 ? [{ name: t('balanceHeader.availableLegend'), label: t('balanceHeader.availableLegend'), percent: freePct, pct: freePct, amount: Math.max(0, annualNet), color: TimelineColor.SUCCESS }] : [])
                    ].filter((s) => s.percent > 0);

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginTop: '2px' }}>
                          <PieDonut
                            items={segments}
                            centerColor={paletteTheme.primary}
                            centerLabel="100%"
                            centerFontSize="0.74rem"
                          />

                          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: expensePalette.primary, flexShrink: 0 }} />
                                <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.expensesLegend')}</span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualExpense)}</span>
                                <strong style={{ color: expensePalette.primary }}>{expPct}%</strong>
                              </div>
                            </div>

                            {(hasInvestmentTimeline && invPct > 0) && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: investmentPalette.primary, flexShrink: 0 }} />
                                  <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.inAccountLegend')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualInvestment)}</span>
                                  <strong style={{ color: investmentPalette.primary }}>{invPct}%</strong>
                                </div>
                              </div>
                            )}

                            {(hasLoanTimeline && loanPct > 0) && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: loanPalette.primary, flexShrink: 0 }} />
                                  <span style={{ color: 'var(--text-dim)' }}>{t('balanceHeader.dueLegend')}</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ color: 'var(--text-dim)', fontSize: '0.66rem' }}>-{formatCurrency(annualLoan)}</span>
                                  <strong style={{ color: loanPalette.primary }}>{loanPct}%</strong>
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

                        <Last6MonthsTimeSeriesChart series={last6MonthsSeries} t={t} />
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
                        const tPalette = getPaletteTheme(t.color, loanColors[idx % loanColors.length]);
                        return {
                          id: t.id,
                          name: t.name,
                          amount: debt,
                          color: tPalette.primary
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
                              centerColor={paletteTheme.primary}
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
                              <strong style={{ color: expensePalette.primary, fontSize: '0.84rem', fontWeight: '800' }}>
                                {formatCurrency(totalRemainingDebtVal)}
                              </strong>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                              <span style={{ fontSize: '0.66rem', color: 'var(--text-dim)', fontWeight: '600', whiteSpace: 'nowrap' }} title={t('balanceHeader.realCapitalCostTitle')}>{t('balanceHeader.realCapitalCost')}</span>
                              <strong style={{ color: paletteTheme.primary, fontSize: '0.84rem', fontWeight: '800' }}>
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
                  <span style={{ fontSize: '0.72rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: paletteTheme.primary, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`, display: 'inline-block' }} />
                    {t('balanceHeader.futureProjection')}
                  </span>
                </div>

                {/* Slider de Horizonte */}
                <div
                  style={{
                    background: 'rgba(255, 255, 255, 0.02)',
                    color: 'var(--text-main)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '12px',
                    padding: '12px 14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ background: `${paletteTheme.primary}1f`, color: paletteTheme.primary, padding: '5px', borderRadius: '7px', display: 'flex' }}>
                        <Clock size={15} />
                      </div>
                      <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-main)' }}>
                        {t('balanceHeader.forecastHorizon')}
                      </span>
                      <span
                        style={{
                          background: `${paletteTheme.primary}1f`,
                          color: paletteTheme.primary,
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
                              border: isSelected ? 'none' : '1px solid var(--border-glass)',
                              background: isSelected ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` : 'rgba(255, 255, 255, 0.04)',
                              color: isSelected ? 'var(--text-white)' : 'var(--text-muted)',
                              boxShadow: isSelected ? `0 0 10px ${paletteTheme.primary}59` : 'none',
                              transition: 'all 0.15s ease'
                            }}
                          >
                            {preset.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {(() => {
                    const sliderPercent = Math.min(100, Math.max(0, (projectionMonthsAhead / 120) * 100));
                    return (
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
                          className="timeline-range-input"
                          style={{
                            flex: 1,
                            accentColor: paletteTheme.primary,
                            '--slider-thumb-color': paletteTheme.primary,
                            background: `linear-gradient(to right, ${paletteTheme.primary} 0%, ${paletteTheme.primary} ${sliderPercent}%, var(--border-glass) ${sliderPercent}%, var(--border-glass) 100%)`,
                            cursor: 'pointer',
                            height: '6px'
                          }}
                          title={t('balanceHeader.projectToTitle', { date: projectedHorizonLabel })}
                        />
                        <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: '700', whiteSpace: 'nowrap' }}>
                          {t('balanceHeader.plusYears', { count: 10 })}
                        </span>
                      </div>
                    );
                  })()}
                </div>

                {/* Cards Projetados dinâmicos */}
                {(() => {
                  const netProj = finMetrics.netProjected;
                  const forecastInc = plannedIncome + plannedWithdrawals;
                  const plannedExp = plannedTotalExpenses;
                  const plannedInv = plannedInvestmentsTotal + totalPocketsInitial;
                  const plannedAmort = plannedAmortized;

                  return (
                    <div className="hero-meta-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                      <div className="meta-item" style={{ padding: '8px 12px' }}>
                        <div className="meta-icon-box" style={{ background: `${paletteTheme.primary}1f`, color: paletteTheme.primary }}>
                          <TrendingUp size={16} />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                            <span className="meta-label" style={{ fontSize: '0.7rem' }}>{t('balanceHeader.projectedBalance')}</span>
                            <span style={{ color: netProj >= 0 ? TimelineColor.SUCCESS : TimelineColor.EXPENSE, fontSize: '0.96rem', fontWeight: '800' }}>
                              {netProj >= 0 ? '+' : ''}{formatCurrency(netProj)}
                            </span>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.forecastInflows')}</span>
                              <span style={{ color: incomePalette.primary, fontSize: '0.78rem', fontWeight: '700' }}>
                                +{formatCurrency(forecastInc)}
                              </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                              <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.forecastOutflows')}</span>
                              <span style={{ color: expensePalette.primary, fontSize: '0.78rem', fontWeight: '700' }}>
                                -{formatCurrency(plannedExp)}
                              </span>
                            </div>
                            {(hasInvestmentTimeline || plannedInv !== 0 || totalPocketsInitial > 0) && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.forecastSavings')}</span>
                                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  <span style={{ color: investmentPalette.primary, fontSize: '0.78rem', fontWeight: '700' }}>
                                    {plannedInv >= 0 ? '+' : '-'}{formatCurrency(Math.abs(plannedInv))}
                                  </span>
                                </div>
                              </div>
                            )}
                            {(hasLoanTimeline && plannedAmort > 0) && (
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                <span style={{ fontSize: '0.69rem', color: 'var(--text-dim)' }}>{t('balanceHeader.amortizedCapital')}:</span>
                                <span style={{ color: loanPalette.primary, fontSize: '0.78rem', fontWeight: '700' }}>
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
            </>
          )}
        </div>
      )}
    </HeaderShell>
  );
}
