import React, { useState, useMemo } from 'react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  eachMonthOfInterval,
  subDays,
  startOfWeek,
  endOfWeek,
  isSameWeek,
  isSameMonth,
  getWeek,
  addYears,
  addMonths,
  subMonths
} from 'date-fns';
import { pt } from 'date-fns/locale';
import {
  Plus,
  Search,
  Calendar,
  Eye,
  EyeOff,
  Layers,
  Clock,
  Sparkles,
  Tag,
  Pin,
  Repeat,
  BookOpen,
  Filter,
  LocateFixed,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  ShoppingCart,
  PiggyBank,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Play,
  CheckSquare,
  Square,
  Home,
  Car,
  CreditCard,
  Gift,
  ArrowUp,
  ArrowDown,
  FileText,
  Zap,
  Activity
} from 'lucide-react';
import TimelineEventCard from './TimelineEventCard';
import FloatingTaskStack from './FloatingTaskStack';
import { getGroupingForPeriodicity, formatCurrency } from '../utils/loanCalculations';
import { FinancialType, EventStatus, TimelineType } from '../enums/index.js';

function VerticalTimeline({
  timeline,
  activeFinancialTab = 'balanco',
  onSelectFinancialTab,
  onEditEvent,
  onUpdateEventDirect,
  onDeleteEvent,
  onToggleTask,
  onAddEventForDate,
  onCompleteFloatingTask,
  onAddFloatingTask,
  onUpdateFloatingTaskPriority,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onToggleLoanPayment,
  onOpenEditInstallment,
  onOpenAmortizationModal,
  onNavigateToTimeline,
  headerComponent,
  futureHorizonYears = 1,
  pastHorizonYears = 1,
  onLoadMoreFuture,
  onLoadMorePast
}) {
  const isFinancialTimeline =
    timeline.type === 'Financeiro' ||
    timeline.type === 'Entradas' ||
    timeline.type === 'entradas' ||
    timeline.type === 'gastos' ||
    timeline.type === 'investimentos' ||
    timeline.id === 'tl-income' ||
    timeline.id === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';

  const isLoanTimelineOrTab =
    timeline.type === 'Empréstimo' ||
    timeline.type === 'emprestimo' ||
    activeFinancialTab === 'jeep' ||
    activeFinancialTab === 'dacia' ||
    activeFinancialTab === 'casa1' ||
    activeFinancialTab === 'casa2' ||
    activeFinancialTab === 'emprestimos';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Todos');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todos');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState('Todos');
  const [showEmptyDays, setShowEmptyDays] = useState(true);

  // Multi-selection of credit and income timelines for Principal view
  const availableCreditOptions = [
    { id: 'tl-income', name: 'Entradas', icon: <DollarSign size={14} />, color: '#10b981' },
    { id: 'tl-loan-house', name: 'Habitação', icon: <Home size={14} />, color: '#0ea5e9' },
    { id: 'tl-loan-80004197726', name: 'Automóvel', icon: <Car size={14} />, color: '#6366f1' }
  ];
  const [selectedTimelineIds, setSelectedTimelineIds] = useState(['tl-loan-house', 'tl-loan-80004197726', 'tl-income']);

  const toggleTimelineSelection = (id) => {
    if (selectedTimelineIds.includes(id)) {
      if (selectedTimelineIds.length === 1) {
        setSelectedTimelineIds(availableCreditOptions.map((o) => o.id));
      } else {
        setSelectedTimelineIds(selectedTimelineIds.filter((item) => item !== id));
      }
    } else {
      setSelectedTimelineIds([...selectedTimelineIds, id]);
    }
  };

  const selectAllTimelines = () => {
    if (selectedTimelineIds.length === availableCreditOptions.length) {
      setSelectedTimelineIds([availableCreditOptions[0].id]);
    } else {
      setSelectedTimelineIds(availableCreditOptions.map((o) => o.id));
    }
  };

  // Agrupamento fixo mensal por agora
  const [groupBy, setGroupBy] = useState('mes');

  // Helper to determine allowed grouping modes based on timeline type and periodicity
  const getAllowedGroupingModes = () => {
    if (timeline.type === 'Principal' || timeline.type === 'Entradas') {
      return [
        { id: 'dia', name: 'Dia', icon: <Calendar size={14} /> },
        { id: 'mes', name: 'Mês', icon: <Clock size={14} /> },
        { id: 'ano', name: 'Ano', icon: <Sparkles size={14} /> }
      ];
    }
    if (timeline.type !== 'Empréstimo') {
      return [
        { id: 'dia', name: 'Dia', icon: <Calendar size={14} /> },
        { id: 'semana', name: 'Semana', icon: <Layers size={14} /> },
        { id: 'mes', name: 'Mês', icon: <Clock size={14} /> },
        { id: 'ano', name: 'Ano', icon: <Sparkles size={14} /> }
      ];
    }
    const p = (timeline.periodicity || 'mensal').toLowerCase();
    if (p === 'anual') {
      return [
        { id: 'ano', name: 'Ano', icon: <Sparkles size={14} /> }
      ];
    }
    if (p === 'mensal' || p === 'bimestral' || p === 'semestral') {
      return [
        { id: 'mes', name: 'Mês', icon: <Clock size={14} /> },
        { id: 'ano', name: 'Ano', icon: <Sparkles size={14} /> }
      ];
    }
    if (p === 'quinzenal') {
      return [
        { id: 'semana', name: 'Semana', icon: <Layers size={14} /> },
        { id: 'mes', name: 'Mês', icon: <Clock size={14} /> },
        { id: 'ano', name: 'Ano', icon: <Sparkles size={14} /> }
      ];
    }
    // diaria
    return [
      { id: 'dia', name: 'Dia', icon: <Calendar size={14} /> },
      { id: 'semana', name: 'Semana', icon: <Layers size={14} /> },
      { id: 'mes', name: 'Mês', icon: <Clock size={14} /> },
      { id: 'ano', name: 'Ano', icon: <Sparkles size={14} /> }
    ];
  };

  const allowedGroupingModes = getAllowedGroupingModes();

  // Automatically update aggregation view when timeline periodicity changes & ensure valid grouping
  // Keep grouping locked to monthly
  React.useEffect(() => {
    setGroupBy('mes');
  }, [timeline.id]);

  // Scroll and focus on Today / Current period node when clicked by user (positioned right below sticky header dock)
  const scrollToToday = () => {
    const todayNode = document.getElementById('timeline-node-today');
    if (todayNode) {
      const navbar = document.querySelector('.app-header') || document.querySelector('header');
      const stickyDock = document.querySelector('.sticky-header-dock');

      const navHeight = navbar ? navbar.offsetHeight : 68;
      const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
      const totalStickyOffset = navHeight + 24 + dockHeight + 14;

      const elementDocTop = todayNode.getBoundingClientRect().top + window.pageYOffset;
      const targetY = elementDocTop - totalStickyOffset;

      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Scroll memory per timeline/tab & Auto-scroll directly to Today
  const positionOnToday = React.useCallback((behavior = 'instant') => {
    const todayNode = document.getElementById('timeline-node-today');
    if (todayNode) {
      const navbar = document.querySelector('.app-header') || document.querySelector('header');
      const stickyDock = document.querySelector('.sticky-header-dock');

      const navHeight = navbar ? navbar.offsetHeight : 68;
      const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
      const totalStickyOffset = navHeight + 24 + dockHeight + 14;

      const elementDocTop = todayNode.getBoundingClientRect().top + window.pageYOffset;
      const targetY = elementDocTop - totalStickyOffset;

      window.scrollTo({ top: Math.max(0, targetY), behavior });
      return true;
    }
    return false;
  }, []);

  // Ensure scroll goes directly to Today on mount, refresh, or tab switch
  React.useEffect(() => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const scrolled = positionOnToday('instant');
      if (scrolled || attempts >= 30) {
        clearInterval(interval);
      }
    }, 40);

    return () => clearInterval(interval);
  }, [timeline.id, activeFinancialTab, timeline.events?.length, positionOnToday]);

  // Default Today reference (2026-08-21)
  const todayDate = new Date('2026-08-21');
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // Extract pending floating tasks (category === 'tarefa' and !isCompleted)
  const allEvents = timeline.events || [];
  const pendingFloatingTasks = allEvents.filter(
    (ev) => ev.category === 'tarefa' && ev.isCompleted === false
  );

  // Events that belong on the timeline (non-floating OR completed tasks fixed to dates)
  const timelineEvents = allEvents.filter(
    (ev) => !(ev.category === 'tarefa' && ev.isCompleted === false)
  );

  const isBalancoView = (isFinancialTimeline && activeFinancialTab === 'balanco') || timeline.type === 'Principal';

  // Determine earliest date in timeline (12 meses anteriores expansível)
  const startDateObj = isBalancoView ? parseISO('2025-08-01') : subMonths(parseISO('2026-08-01'), Math.max(1, pastHorizonYears) * 12);

  // Determine latest date in timeline (12 meses futuros expansível)
  const maxDateObj = isBalancoView ? parseISO('2026-08-31') : addMonths(parseISO('2026-08-31'), Math.max(1, futureHorizonYears) * 12);

  // Generate array of days from startDate up to maxDateObj (Descending: future at top, past at bottom)
  const daysArray = useMemo(() => {
    try {
      const daysAscending = eachDayOfInterval({
        start: startDateObj,
        end: maxDateObj
      });
      return daysAscending.reverse();
    } catch (err) {
      return [todayDate];
    }
  }, [startDateObj.getTime(), maxDateObj.getTime()]);

  // Filter events based on search query, status, category, and label
  const filteredEvents = useMemo(() => {
    if (!timelineEvents) return [];
    return timelineEvents.filter((ev) => {
      const matchesSearch =
        searchQuery === '' ||
        ((ev.title || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((ev.description || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.labels && ev.labels.some((l) => (l || '').toLowerCase().includes(searchQuery.toLowerCase())));

      let matchesStatus = selectedStatusFilter === 'Todos';
      if (!matchesStatus) {
        if (selectedStatusFilter === 'Recebido') {
          matchesStatus = ev.status === 'Recebido';
        } else if (selectedStatusFilter === 'Pendente') {
          matchesStatus = (ev.status === 'Pendente' || ev.status === 'Previsto') && (!ev.isIncome || ev.date >= todayStr);
        } else if (selectedStatusFilter === 'Atrasada') {
          matchesStatus = ev.status === 'Atrasada' || (ev.isIncome && ev.date < todayStr && ev.status !== 'Recebido');
        } else {
          matchesStatus = ev.status === selectedStatusFilter;
        }
      }

      const matchesCategory =
        selectedCategoryFilter === 'Todos' ||
        ev.category === selectedCategoryFilter;

      const matchesTimelineMultiSelect =
        timeline.type !== 'Principal' ||
        selectedTimelineIds.length === 0 ||
        selectedTimelineIds.includes(ev.timelineOriginId);

      const matchesLabel =
        selectedLabelFilter === 'Todos' ||
        (ev.labels && ev.labels.includes(selectedLabelFilter));

      // Financial Tabs Filter
      if (isFinancialTimeline) {
        const isInvestment = Boolean(ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento')));

        const isJeep = !isInvestment && Boolean(
          ev.timelineOriginId === 'c4d5e6f7-a8b9-4c0d-1e2f-3a4b5c6d7e8f' ||
          ev.timelineOriginId === 'tl-loan-jeep' ||
          ev.timelineOriginId === 'tl-loan-80004197726' ||
          (ev.timelineOriginName && ev.timelineOriginName.toLowerCase().includes('crédito jeep')) ||
          (ev.title && (ev.title.includes('Crédito Jeep') || ev.title.includes('80004197726'))) ||
          (ev.isSystemLoanEvent && ev.amount === 218.47)
        );

        const isDacia = !isInvestment && Boolean(
          ev.timelineOriginId === 'd5e6f7a8-b9c0-4d1e-2f3a-4b5c6d7e8f9a' ||
          ev.timelineOriginId === 'tl-loan-dacia' ||
          ev.timelineOriginId === 'tl-loan-crd19605103001' ||
          (ev.timelineOriginName && ev.timelineOriginName.toLowerCase().includes('crédito dacia')) ||
          (ev.title && (ev.title.includes('Crédito Dacia') || ev.title.includes('CRD19605103001'))) ||
          (ev.isSystemLoanEvent && ev.amount === 180.08)
        );

        const isCasa1 = !isInvestment && Boolean(
          ev.timelineOriginId === 'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b' ||
          ev.timelineOriginId === 'tl-loan-casa1' ||
          (ev.timelineOriginName && (ev.timelineOriginName.includes('02012642') || ev.timelineOriginName.includes('Crédito Egas Moniz') || ev.timelineOriginName.includes('Casa 1'))) ||
          (ev.title && (ev.title.includes('02012642') || ev.title.includes('Crédito Egas Moniz') || ev.title.includes('Casa 1')))
        ) && !(ev.title && ev.title.includes('Hipoteca')) && !(ev.timelineOriginName && ev.timelineOriginName.includes('Hipoteca'));

        const isCasa2 = !isInvestment && Boolean(
          ev.timelineOriginId === 'f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c' ||
          ev.timelineOriginId === 'tl-loan-casa2' ||
          (ev.timelineOriginName && (ev.timelineOriginName.includes('02015122') || ev.timelineOriginName.includes('Hipoteca') || ev.timelineOriginName.includes('Casa 2'))) ||
          (ev.title && (ev.title.includes('02015122') || ev.title.includes('Hipoteca') || ev.title.includes('Casa 2')))
        );

        const isLoan = isJeep || isDacia || isCasa1 || isCasa2 || ev.financialType === FinancialType.AMORTIZATION || ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || ev.category === 'amortizacao';
        const isIncome = (ev.financialType === FinancialType.INCOME || ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
        const isExpense = (ev.financialType === FinancialType.EXPENSE || ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') && !isLoan;

        if (activeFinancialTab === 'entradas' && !isIncome) return false;
        if (activeFinancialTab === 'gastos') {
          if (isInvestment) return false;
          if (!isExpense && !isLoan) return false;
        }
        if (activeFinancialTab === 'investimentos' && !isInvestment) return false;
        if (activeFinancialTab === 'jeep' && !isJeep) return false;
        if (activeFinancialTab === 'dacia' && !isDacia) return false;
        if (activeFinancialTab === 'casa1' && !isCasa1) return false;
        if (activeFinancialTab === 'casa2' && !isCasa2) return false;
        if (activeFinancialTab === 'emprestimos' && !isLoan) return false;
        // 'balanco' shows all
      }

      // No Balanço: mostrar somente até ao fim do mês corrente (2026-08-31)
      if (isBalancoView) {
        const currentMonthEndStr = '2026-08-31';
        if (ev.date > currentMonthEndStr) {
          return false;
        }
      }

      // Entradas / Gastos / Investimentos em Financeiro: respeitar o horizonte máximo projetado
      const isCarLoanTab = activeFinancialTab === 'jeep' || activeFinancialTab === 'dacia' || activeFinancialTab === 'casa1' || activeFinancialTab === 'casa2' || activeFinancialTab === 'emprestimos';
      if (isFinancialTimeline && !isCarLoanTab && !isBalancoView) {
        const maxEndStr = format(maxDateObj, 'yyyy-MM-dd');
        if (ev.date > maxEndStr) {
          return false;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesLabel;
    }).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      if (timeA !== timeB) return timeB.localeCompare(timeA);
      return (b.title || '').localeCompare(a.title || '');
    });
  }, [
    timelineEvents,
    searchQuery,
    selectedStatusFilter,
    selectedCategoryFilter,
    selectedLabelFilter,
    selectedTimelineIds,
    isFinancialTimeline,
    activeFinancialTab,
    isBalancoView,
    maxDateObj
  ]);

  // Collect all unique labels for filter pills
  const availableLabels = useMemo(() => {
    return Array.from(new Set(allEvents.flatMap((ev) => ev.labels || [])));
  }, [allEvents]);

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((ev) => {
      if (!map[ev.date]) {
        map[ev.date] = [];
      }
      map[ev.date].push(ev);
    });
    return map;
  }, [filteredEvents]);

  // ========================================================
  // RENDER ENGINES BY GROUPBY MODE
  // ========================================================

  const renderWeekView = () => {
    const weekMap = new Map();

    daysArray.forEach((dayObj) => {
      const weekStart = startOfWeek(dayObj, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(dayObj, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart,
          weekEnd,
          weekNum: getWeek(weekStart),
          events: []
        });
      }
    });

    filteredEvents.forEach((ev) => {
      try {
        const evDate = parseISO(ev.date);
        for (let [weekKey, weekData] of weekMap.entries()) {
          if (isSameWeek(evDate, weekData.weekStart, { weekStartsOn: 1 })) {
            weekData.events.push(ev);
            break;
          }
        }
      } catch (e) { }
    });

    const weeksList = Array.from(weekMap.values());

    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

        {weeksList.map((weekData) => {
          const isCurrentWeek = isSameWeek(todayDate, weekData.weekStart, { weekStartsOn: 1 });
          const weekStartStr = format(weekData.weekStart, "d 'de' MMM", { locale: pt });
          const weekEndStr = format(weekData.weekEnd, "d 'de' MMM, yyyy", { locale: pt });
          const hasEvents = weekData.events.length > 0;

          if (!showEmptyDays && !hasEvents && !isCurrentWeek) return null;

          return (
            <div
              key={format(weekData.weekStart, 'yyyy-MM-dd')}
              id={isCurrentWeek ? 'timeline-node-today' : undefined}
              className={`timeline-day-row ${isCurrentWeek ? 'is-today' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main">SEMANA {weekData.weekNum}</div>
                <div className="day-date-sub">{format(weekData.weekStart, 'yyyy')}</div>
                {isCurrentWeek && <span className="today-badge-chip pulse-glow">SEMANA ATUAL</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentWeek ? 'is-today-node' : hasEvents ? 'has-events' : ''
                    }`}
                  style={hasEvents && !isCurrentWeek ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header">
                    <h3 className="group-card-title">
                      Semana {weekData.weekNum} ({weekStartStr} - {weekEndStr})
                    </h3>
                    <span className="group-card-badge">
                      {weekData.events.length} evento(s)
                    </span>
                  </div>

                  {hasEvents ? (
                    weekData.events.map((ev) => (
                      <div
                        key={ev.id}
                        id={ev.status === 'Atrasada' ? 'loan-inst-overdue' : undefined}
                        style={{ marginBottom: '12px' }}
                      >
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} />
                          <span>{format(parseISO(ev.date), "EEEE, d 'de' MMMM", { locale: pt })}</span>
                        </div>
                        <TimelineEventCard
                          event={ev}
                          allEvents={timeline.events || []}
                          currentTimelineId={timeline.id}
                          timelineType={timeline.type}
                          activeFinancialTab={activeFinancialTab}
                          onEdit={onEditEvent}
                          onUpdateEventDirect={onUpdateEventDirect}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onOpenEditInstallment={onOpenEditInstallment}
                          onNavigateToTimeline={onNavigateToTimeline}
                        />
                      </div>
                    ))
                  ) : (
                    <div
                      className="empty-day-row"
                      onClick={() => onAddEventForDate(format(weekData.weekStart, 'yyyy-MM-dd'))}
                    >
                      <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                      <span className="empty-day-text">Sem eventos registados nesta semana</span>
                      <span className="add-event-mini-btn">
                        <Plus size={12} /> Adicionar
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderMonthView = () => {
    const monthMap = new Map();

    try {
      const allMonthsDesc = eachMonthOfInterval({
        start: startDateObj,
        end: maxDateObj
      }).reverse();

      allMonthsDesc.forEach((mDate) => {
        const monthKey = format(mDate, 'yyyy-MM');
        monthMap.set(monthKey, {
          monthDate: mDate,
          events: []
        });
      });
    } catch {
      monthMap.set(format(todayDate, 'yyyy-MM'), { monthDate: todayDate, events: [] });
    }

    filteredEvents.forEach((ev) => {
      if (!ev || !ev.date) return;
      const monthKey = ev.date.substring(0, 7);
      if (monthMap.has(monthKey)) {
        monthMap.get(monthKey).events.push(ev);
      }
    });

    monthMap.forEach((mEntry) => {
      mEntry.events.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        if (timeA !== timeB) return timeB.localeCompare(timeA);
        return (b.title || '').localeCompare(a.title || '');
      });
    });

    const monthsList = Array.from(monthMap.values());

    const isFinancialTimeline =
      timeline.type === 'Financeiro' ||
      timeline.type === 'Entradas' ||
      timeline.type === 'entradas' ||
      timeline.type === 'gastos' ||
      timeline.type === 'investimentos' ||
      timeline.type === 'emprestimo' ||
      timeline.type === 'Empréstimo' ||
      timeline.type === 'Principal' ||
      timeline.type === TimelineType.INCOME ||
      timeline.type === TimelineType.EXPENSE ||
      timeline.type === TimelineType.INVESTMENT ||
      timeline.type === TimelineType.LOAN ||
      timeline.id === 'tl-income' ||
      timeline.id === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';

    // Pre-calculate total projected expenses per month across all events
    const monthExpensesTotalMap = useMemo(() => {
      const map = new Map();
      (timelineEvents || []).forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED || ev.status === 'Cancelado' || ev.status === 'Excluido') return;
        const isLoan = ev.financialType === FinancialType.AMORTIZATION || ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || (ev.timelineOriginId && String(ev.timelineOriginId).includes('loan'));
        const isInvestment = ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));
        const isExpense = ((ev.financialType === FinancialType.EXPENSE || ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') || isLoan) && !isInvestment;

        if (isExpense) {
          const mKey = ev.date.substring(0, 7);
          map.set(mKey, (map.get(mKey) || 0) + Number(ev.amount || 0));
        }
      });
      return map;
    }, [timelineEvents]);

    // Pre-calculate total projected income per month across all events
    const monthIncomeTotalMap = useMemo(() => {
      const map = new Map();
      (timelineEvents || []).forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED || ev.status === 'Cancelado' || ev.status === 'Excluido') return;
        const isLoan = ev.financialType === FinancialType.AMORTIZATION || ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || (ev.timelineOriginId && String(ev.timelineOriginId).includes('loan'));
        const isInvestment = ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));
        const isIncome = (ev.financialType === FinancialType.INCOME || ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;

        if (isIncome) {
          const mKey = ev.date.substring(0, 7);
          map.set(mKey, (map.get(mKey) || 0) + Number(ev.amount || 0));
        }
      });
      return map;
    }, [timelineEvents]);

    // Pre-calculate total projected investments per month across all events
    const monthInvestmentsTotalMap = useMemo(() => {
      const map = new Map();
      (timelineEvents || []).forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED || ev.status === 'Cancelado' || ev.status === 'Excluido') return;
        const isInvestment = ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

        if (isInvestment) {
          const mKey = ev.date.substring(0, 7);
          map.set(mKey, (map.get(mKey) || 0) + Number(ev.amount || 0));
        }
      });
      return map;
    }, [timelineEvents]);

    // Pre-calculate chronological running cumulative metrics
    const monthCumulativeMap = new Map();
    const seenInitialInvestments = new Set();
    let runningIncome = 0;
    let runningExpense = 0;
    let runningInvestment = 0;

    const sortedChronologicalMonths = [...monthsList].sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());
    sortedChronologicalMonths.forEach((mG) => {
      let mInc = 0;
      let mExp = 0;
      let mInv = 0;

      mG.events.forEach((ev) => {
        const amt = Number(ev.amount || 0);
        const isLoan = ev.financialType === FinancialType.AMORTIZATION || ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || (ev.timelineOriginId && String(ev.timelineOriginId).includes('loan'));
        const isIncome = (ev.financialType === FinancialType.INCOME || ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
        const isExpense = (ev.financialType === FinancialType.EXPENSE || ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') || isLoan;
        const isInvestment = ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

        const initialKey = ev.eventId || ev.seriesId || ev.id;
        let initialAmt = 0;
        if (isInvestment && ev.initialInvestedAmount && !seenInitialInvestments.has(initialKey)) {
          initialAmt = Number(ev.initialInvestedAmount) || 0;
          seenInitialInvestments.add(initialKey);
        }

        if (isIncome) mInc += amt;
        if (isExpense) mExp += amt;
        if (isInvestment) mInv += amt + initialAmt;
      });

      runningIncome += mInc;
      runningExpense += mExp;
      runningInvestment += mInv;

      monthCumulativeMap.set(format(mG.monthDate, 'yyyy-MM'), {
        income: runningIncome,
        expense: runningExpense,
        investment: runningInvestment
      });
    });

    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

        {/* Botão de Carregar / Projetar Mais Meses Futuros */}
        {onLoadMoreFuture && !isBalancoView && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 28px 0', position: 'relative', zIndex: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onLoadMoreFuture}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))',
                border: '1px solid rgba(99, 102, 241, 0.45)',
                color: 'var(--primary-light)',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <ArrowUp size={15} />
              <span>Projetar +12 Meses Futuros</span>
            </button>
          </div>
        )}

        {monthsList.map((mGroup) => {
          const currentMonthKey = format(todayDate, 'yyyy-MM');
          const monthKeyStr = format(mGroup.monthDate, 'yyyy-MM');
          const isCurrentMonth = currentMonthKey === monthKeyStr;
          const isFutureMonth = monthKeyStr > currentMonthKey;
          const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: pt });
          const hasEvents = mGroup.events.length > 0;

          // Calculate month stats
          let mMonthIncome = 0;
          let mMonthExpense = 0;
          let mMonthInvestment = 0;

          let mMonthIncomePaid = 0;
          let mMonthExpensePaid = 0;
          let mMonthInvestmentPaid = 0;

          mGroup.events.forEach((ev) => {
            if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED || ev.status === 'Cancelado' || ev.status === 'Excluido' || ev.isDeleted) return;

            const amt = Number(ev.amount || 0);
            const isLoan = ev.financialType === FinancialType.AMORTIZATION || ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || (ev.timelineOriginId && String(ev.timelineOriginId).includes('loan'));
            const isInvestment = ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));
            const isIncome = (ev.financialType === FinancialType.INCOME || ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
            const isExpense = ((ev.financialType === FinancialType.EXPENSE || ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') || isLoan) && !isInvestment;

            const isIncomeReceived = ev.status === EventStatus.RECEIVED || ev.status === EventStatus.PAID || ev.status === 'Recebido' || ev.status === 'Pago' || ev.isCompleted;
            const isExpensePaid = ev.status === EventStatus.PAID || ev.status === 'Pago' || ev.status === 'Liquidado' || ev.isCompleted;
            const isInvested = ev.status === EventStatus.INVESTED || ev.status === EventStatus.PAID || ev.status === 'Investido' || ev.status === 'Pago' || ev.isCompleted;

            if (isIncome) {
              mMonthIncome += amt;
              if (isIncomeReceived) mMonthIncomePaid += amt;
            }
            if (isExpense) {
              mMonthExpense += amt;
              if (isExpensePaid) mMonthExpensePaid += amt;
            }
            if (isInvestment) {
              mMonthInvestment += amt;
              if (isInvested) mMonthInvestmentPaid += amt;
            }
          });

          // No Balanço: Se for mês passado ou atual, computar o que foi efetivamente recebido/pago/investido para atualizar dinamicamente com o status
          const effectiveIncome = isBalancoView ? (isFutureMonth ? mMonthIncome : mMonthIncomePaid) : mMonthIncome;
          const effectiveExpense = isBalancoView ? (isFutureMonth ? mMonthExpense : mMonthExpensePaid) : mMonthExpense;
          const effectiveInvestment = isBalancoView ? (isFutureMonth ? mMonthInvestment : mMonthInvestmentPaid) : mMonthInvestment;
          const mNetRealizedMonth = effectiveIncome - (effectiveExpense + effectiveInvestment);
          const mNetProjectedMonth = mMonthIncome - (mMonthExpense + mMonthInvestment);
          const cumData = monthCumulativeMap.get(monthKeyStr) || { income: 0, expense: 0, investment: 0 };
          const mMonthProjectedExpense = monthExpensesTotalMap.get(monthKeyStr) || 0;
          const mMonthProjectedIncome = monthIncomeTotalMap.get(monthKeyStr) || 0;
          const mMonthProjectedInvestment = monthInvestmentsTotalMap.get(monthKeyStr) || 0;
          const mMonthProjectedSaldo = mMonthProjectedIncome - (mMonthProjectedExpense + mMonthProjectedInvestment);

          if (!showEmptyDays && !hasEvents && !isCurrentMonth) return null;

          return (
            <div
              key={format(mGroup.monthDate, 'yyyy-MM')}
              id={isCurrentMonth ? 'timeline-node-today' : `timeline-month-${format(mGroup.monthDate, 'yyyy-MM')}`}
              data-month-key={format(mGroup.monthDate, 'yyyy-MM')}
              className={`timeline-day-row ${isCurrentMonth ? 'is-today' : ''} ${isFutureMonth ? 'is-future-month' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main" style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-main)' }}>
                  {format(mGroup.monthDate, 'MMM', { locale: pt }).toUpperCase()}
                </div>
                <div className="day-date-sub" style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                  {format(mGroup.monthDate, 'yyyy')}
                </div>
                {isCurrentMonth && <span className="today-badge-chip pulse-glow">MÊS ATUAL</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentMonth ? 'is-today-node' : hasEvents ? 'has-events' : ''}`}
                  style={
                    hasEvents && !isCurrentMonth
                      ? {
                          backgroundColor: isFutureMonth ? 'rgba(148, 163, 184, 0.4)' : timeline.color,
                          borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.3)' : undefined
                        }
                      : {}
                  }
                />
              </div>

              <div className="day-content-col">
                <div className="group-card" style={isFutureMonth ? { borderColor: 'rgba(148, 163, 184, 0.18)' } : undefined}>
                  <div className="group-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {/* Linha Superior: Nome do Mês à esquerda, Contador e Botões de Ação à direita */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                      <h3 className="group-card-title" style={{ margin: 0, textTransform: 'capitalize', color: isFutureMonth ? 'var(--text-muted)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)' }} /> {monthTitleStr}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Badge do Contador */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '26px',
                            boxSizing: 'border-box',
                            color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)',
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.18)' : 'var(--border-glass)',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.05)' : undefined
                          }}
                        >
                          {mGroup.events.length} evento(s)
                        </span>

                        {/* Botão Amortizar no Mês (disponível do mês atual em diante; oculto em meses passados e em parcelas abatidas) */}
                        {onOpenAmortizationModal && isLoanTimelineOrTab && (() => {
                          const thisMonthStr = format(mGroup.monthDate, 'yyyy-MM');
                          if (thisMonthStr < '2026-08') return null;

                          const monthLoanEvents = mGroup.events.filter((e) => e.category === 'parcela_emprestimo');
                          const isAbatidaMonth = monthLoanEvents.length > 0 && monthLoanEvents.every((e) => e.isAbatida || e.status === 'Abatida');
                          if (isAbatidaMonth) return null;

                          return (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
                                padding: '4px 12px',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: 'none',
                                color: '#ffffff'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-15');
                                onOpenAmortizationModal(targetDayStr);
                              }}
                              title={`Amortizar extraordinariamente neste mês (${monthTitleStr})`}
                            >
                              <TrendingDown size={14} />
                              <span>Amortizar</span>
                            </button>
                          );
                        })()}

                        {/* Botão Adicionar Evento no Mês (oculto em timelines / abas de empréstimo) */}
                        {onAddEventForDate && !isLoanTimelineOrTab && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              height: '26px',
                              padding: '0 10px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-01');
                              onAddEventForDate(
                                targetDayStr,
                                activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income'
                              );
                            }}
                            title={`Adicionar novo evento em ${monthTitleStr}`}
                          >
                            <Plus size={13} strokeWidth={2.5} />
                            <span>Adicionar Evento</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Linha Inferior: Badges Projetados Unificados para linhas de tempo do Financeiro (oculto em empréstimos e créditos) */}
                    {isFinancialTimeline && !isLoanTimelineOrTab && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                        {/* Indicador Projeção do Mês */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            marginRight: '2px'
                          }}
                        >
                          <Sparkles size={12} style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)' }} />
                          <span>Projeção do Mês:</span>
                        </span>

                        {/* 1. Entradas Projetadas */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthProjectedIncome > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                            color: isFutureMonth ? 'var(--text-dim)' : (mMonthProjectedIncome > 0 ? '#10b981' : 'var(--text-dim)'),
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthProjectedIncome > 0 ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-glass)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title="Total de entradas projetadas para este mês"
                        >
                          <DollarSign size={12} />
                          <span>+{formatCurrency(mMonthProjectedIncome)}</span>
                        </span>

                        {/* 2. Gasto Projetado */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthProjectedExpense > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                            color: isFutureMonth ? 'var(--text-dim)' : (mMonthProjectedExpense > 0 ? '#f43f5e' : 'var(--text-dim)'),
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthProjectedExpense > 0 ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-glass)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title="Total de gastos projetados para este mês (inclui prestações de empréstimos)"
                        >
                          <TrendingDown size={12} />
                          <span>-{formatCurrency(mMonthProjectedExpense)}</span>
                        </span>

                        {/* 3. Investimento Projetado */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthProjectedInvestment > 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                            color: isFutureMonth ? 'var(--text-dim)' : (mMonthProjectedInvestment > 0 ? '#818cf8' : 'var(--text-dim)'),
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthProjectedInvestment > 0 ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-glass)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title="Total de aportes / investimentos projetados para este mês"
                        >
                          <PiggyBank size={12} />
                          <span>{formatCurrency(mMonthProjectedInvestment)}</span>
                        </span>

                        {/* 4. Saldo Líquido Projetado */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth
                              ? 'rgba(148, 163, 184, 0.08)'
                              : (mMonthProjectedSaldo >= 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(244, 63, 94, 0.12)'),
                            color: isFutureMonth
                              ? 'var(--text-dim)'
                              : (mMonthProjectedSaldo >= 0 ? '#38bdf8' : '#f43f5e'),
                            borderColor: isFutureMonth
                              ? 'rgba(148, 163, 184, 0.2)'
                              : (mMonthProjectedSaldo >= 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(244, 63, 94, 0.35)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title="Saldo Projetado do mês = Entradas - (Gastos + Investimentos)"
                        >
                          <Scale size={12} />
                          <span>Saldo: {mMonthProjectedSaldo >= 0 ? '+' : ''}{formatCurrency(mMonthProjectedSaldo)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {hasEvents ? (
                    mGroup.events.map((ev) => (
                      <div
                        key={ev.id}
                        id={ev.status === 'Atrasada' ? 'loan-inst-overdue' : undefined}
                        style={{ marginBottom: '12px' }}
                      >
                        <div style={{ fontSize: '0.78rem', color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} />
                          <span>{format(parseISO(ev.date), "EEEE, d 'de' MMMM", { locale: pt })}</span>
                        </div>
                        <TimelineEventCard
                          event={ev}
                          allEvents={timeline.events || []}
                          currentTimelineId={timeline.id}
                          timelineType={timeline.type}
                          activeFinancialTab={activeFinancialTab}
                          onEdit={onEditEvent}
                          onUpdateEventDirect={onUpdateEventDirect}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onAddChecklistItem={onAddChecklistItem}
                          onDeleteChecklistItem={onDeleteChecklistItem}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onOpenEditInstallment={onOpenEditInstallment}
                          onNavigateToTimeline={onNavigateToTimeline}
                        />
                      </div>
                    ))
                  ) : (
                    /* Linha informativa quando o mês está vazio */
                    <div
                      className="empty-day-row"
                      onClick={() => {
                        if (isLoanTimelineOrTab) return;
                        const nature = activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income';
                        onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-01'), nature);
                      }}
                      style={{
                        cursor: isLoanTimelineOrTab ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                        <span className="empty-day-text">
                          {isLoanTimelineOrTab ? 'Nenhuma parcela ou amortização neste mês' : 'Sem registos nesta aba para este mês'}
                        </span>
                      </div>
                      {!isLoanTimelineOrTab && (
                        <span
                          className="add-event-mini-btn"
                          style={{
                            background: 'rgba(16, 185, 129, 0.18)',
                            color: '#10b981',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            padding: '4px 10px',
                            borderRadius: '6px',
                            fontWeight: '700',
                            fontSize: '0.76rem',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Plus size={13} /> Adicionar
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão de Carregar Mais Meses Anteriores (Histórico) */}
        {onLoadMorePast && !isBalancoView && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 16px 0', position: 'relative', zIndex: 10 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onLoadMorePast}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '9px 22px',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))',
                border: '1px solid rgba(99, 102, 241, 0.45)',
                color: 'var(--primary-light)',
                fontWeight: '700',
                fontSize: '0.84rem',
                cursor: 'pointer',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
                transition: 'all var(--transition-fast)'
              }}
            >
              <ArrowDown size={15} />
              <span>Carregar +12 Meses Anteriores (Histórico)</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderYearView = () => {
    const yearMap = new Map();

    daysArray.forEach((dayObj) => {
      const yearKey = format(dayObj, 'yyyy');
      if (!yearMap.has(yearKey)) {
        yearMap.set(yearKey, {
          yearStr: yearKey,
          monthsMap: new Map()
        });
      }

      const yearEntry = yearMap.get(yearKey);
      const monthKey = format(dayObj, 'yyyy-MM');
      if (!yearEntry.monthsMap.has(monthKey)) {
        yearEntry.monthsMap.set(monthKey, {
          monthDate: dayObj,
          events: []
        });
      }
    });

    filteredEvents.forEach((ev) => {
      try {
        const evDate = parseISO(ev.date);
        const yearKey = format(evDate, 'yyyy');
        const monthKey = format(evDate, 'yyyy-MM');

        if (!yearMap.has(yearKey)) {
          yearMap.set(yearKey, {
            yearStr: yearKey,
            monthsMap: new Map()
          });
        }
        const yearEntry = yearMap.get(yearKey);
        if (!yearEntry.monthsMap.has(monthKey)) {
          yearEntry.monthsMap.set(monthKey, {
            monthDate: evDate,
            events: []
          });
        }
        yearEntry.monthsMap.get(monthKey).events.push(ev);
      } catch (e) { }
    });

    const yearsList = Array.from(yearMap.values());

    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

        {yearsList.map((yGroup) => {
          const isCurrentYear = format(todayDate, 'yyyy') === yGroup.yearStr;
          const monthsList = Array.from(yGroup.monthsMap.values());
          const totalEventsInYear = monthsList.reduce((sum, m) => sum + m.events.length, 0);

          return (
            <div
              key={yGroup.yearStr}
              id={isCurrentYear ? 'timeline-node-today' : undefined}
              className={`timeline-day-row ${isCurrentYear ? 'is-today' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main">ANO {yGroup.yearStr}</div>
                {isCurrentYear && <span className="today-badge-chip pulse-glow">ANO ATUAL</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentYear ? 'is-today-node' : totalEventsInYear > 0 ? 'has-events' : ''
                    }`}
                  style={totalEventsInYear > 0 && !isCurrentYear ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header">
                    <h3 className="group-card-title">
                      <Sparkles size={18} style={{ color: 'var(--primary-light)' }} /> Ano de {yGroup.yearStr}
                    </h3>
                    <span className="group-card-badge">
                      {monthsList.length} meses • {totalEventsInYear} evento(s)
                    </span>
                  </div>

                  {monthsList.map((mGroup) => {
                    const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: pt });
                    const hasEvents = mGroup.events.length > 0;

                    if (!showEmptyDays && !hasEvents) return null;

                    return (
                      <div key={format(mGroup.monthDate, 'yyyy-MM')} className="year-month-box">
                        <div className="year-month-header">
                          <h4 className="year-month-title" style={{ textTransform: 'capitalize' }}>
                            🗓️ {monthTitleStr}
                          </h4>
                          <span className="event-tag" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe' }}>
                            {mGroup.events.length} evento(s)
                          </span>
                        </div>

                        {hasEvents ? (
                          mGroup.events.map((ev) => (
                            <TimelineEventCard
                              key={ev.id}
                              event={ev}
                              allEvents={timeline.events || []}
                              currentTimelineId={timeline.id}
                              timelineType={timeline.type}
                              activeFinancialTab={activeFinancialTab}
                              onEdit={onEditEvent}
                              onUpdateEventDirect={onUpdateEventDirect}
                              onDelete={onDeleteEvent}
                              onToggleTask={onToggleTask}
                              onToggleLoanPayment={onToggleLoanPayment}
                              onOpenEditInstallment={onOpenEditInstallment}
                              onNavigateToTimeline={onNavigateToTimeline}
                            />
                          ))
                        ) : (
                          <div
                            className="empty-day-row"
                            onClick={() => onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-01'))}
                          >
                            <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                            <span className="empty-day-text">Sem eventos registados neste mês</span>
                            <span className="add-event-mini-btn">
                              <Plus size={12} /> Adicionar
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

        {daysArray.map((dayDate) => {
          const dateKey = format(dayDate, 'yyyy-MM-dd');
          const isTodayNode = dateKey === todayStr;
          const dayEvents = eventsByDate[dateKey] || [];
          const hasEvents = dayEvents.length > 0;

          if (!showEmptyDays && !hasEvents && !isTodayNode) {
            return null;
          }

          const dayOfWeekStr = format(dayDate, 'EEE', { locale: pt });
          const dayNumStr = format(dayDate, 'dd');
          const monthStr = format(dayDate, 'MMM', { locale: pt });

          return (
            <div
              key={dateKey}
              id={isTodayNode ? 'timeline-node-today' : undefined}
              className={`timeline-day-row ${isTodayNode ? 'is-today' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main">
                  {dayOfWeekStr.toUpperCase()}, {dayNumStr} {monthStr}
                </div>
                <div className="day-date-sub">{format(dayDate, 'yyyy')}</div>
                {isTodayNode && (
                  <span className="today-badge-chip pulse-glow">HOJE</span>
                )}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isTodayNode ? 'is-today-node' : hasEvents ? 'has-events' : ''
                    }`}
                  onClick={() => onAddEventForDate(dateKey)}
                  title={
                    hasEvents
                      ? `${dayEvents.length} evento(s) neste dia. Clique para adicionar outro.`
                      : `Sem eventos. Clique para adicionar evento no dia ${dateKey}`
                  }
                  style={hasEvents && !isTodayNode ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                {hasEvents ? (
                  dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      id={ev.status === 'Atrasada' ? 'loan-inst-overdue' : undefined}
                    >
                      <TimelineEventCard
                        event={ev}
                        allEvents={timeline.events || []}
                        currentTimelineId={timeline.id}
                        timelineType={timeline.type}
                        activeFinancialTab={activeFinancialTab}
                        onEdit={onEditEvent}
                        onUpdateEventDirect={onUpdateEventDirect}
                        onDelete={onDeleteEvent}
                        onToggleTask={onToggleTask}
                        onToggleLoanPayment={onToggleLoanPayment}
                        onOpenEditInstallment={onOpenEditInstallment}
                        onNavigateToTimeline={onNavigateToTimeline}
                      />
                    </div>
                  ))
                ) : (
                  <div
                    className="empty-day-row"
                    onClick={() => onAddEventForDate(dateKey)}
                  >
                    <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                    <span className="empty-day-text">Sem eventos registados</span>
                    <span className="add-event-mini-btn">
                      <Plus size={12} /> Adicionar
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="timeline-workspace-layout">
      {/* 🧭 Left Filter Sidebar Cockpit */}
      <aside className="filter-sidebar">
        <div className="sidebar-header-title">
          <Filter size={15} style={{ color: 'var(--primary-light)' }} />
          <span>Filtros & Navegação</span>
        </div>

        {/* 🌟 0. Timelines do Timeboard */}
        {isFinancialTimeline && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span>Timelines</span>
            </div>
            <div className="sidebar-btn-group">
              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'balanco' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('balanco')}
                style={activeFinancialTab === 'balanco' ? { borderColor: '#0ea5e9', background: 'rgba(14, 165, 233, 0.16)', color: '#0ea5e9' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Scale size={14} />
                  <span style={{ fontWeight: '800' }}>Balanço (Principal)</span>
                </div>
                {activeFinancialTab === 'balanco' && <span style={{ fontSize: '0.75rem', color: '#0ea5e9' }}>✓</span>}
              </button>

              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'entradas' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('entradas')}
                style={activeFinancialTab === 'entradas' ? { borderColor: '#10b981', background: 'rgba(16, 185, 129, 0.14)', color: '#10b981' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <DollarSign size={14} />
                  <span style={{ fontWeight: '700' }}>Entradas e Rendimentos</span>
                </div>
                {activeFinancialTab === 'entradas' && <span style={{ fontSize: '0.75rem', color: '#10b981' }}>✓</span>}
              </button>

              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'gastos' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('gastos')}
                style={activeFinancialTab === 'gastos' ? { borderColor: '#f43f5e', background: 'rgba(244, 63, 94, 0.14)', color: '#f43f5e' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <ShoppingCart size={14} />
                  <span style={{ fontWeight: '700' }}>Gastos e Saídas</span>
                </div>
                {activeFinancialTab === 'gastos' && <span style={{ fontSize: '0.75rem', color: '#f43f5e' }}>✓</span>}
              </button>

              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'investimentos' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('investimentos')}
                style={activeFinancialTab === 'investimentos' ? { borderColor: '#6366f1', background: 'rgba(99, 102, 241, 0.14)', color: 'var(--primary-light)' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <PiggyBank size={14} />
                  <span style={{ fontWeight: '700' }}>Investimentos e Poupança</span>
                </div>
                {activeFinancialTab === 'investimentos' && <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>✓</span>}
              </button>

              {/* Contratos de Empréstimo do Timeboard */}
              {timeline.carLoans && timeline.carLoans.length > 0 && (
                timeline.carLoans.map((loan) => {
                  const tabKey = (loan.contractNumber === '80004197726' || loan.name?.includes('Jeep')) ? 'jeep'
                    : (loan.contractNumber === 'CRD19605103001' || loan.name?.includes('Dacia')) ? 'dacia'
                    : (loan.contractNumber === '02015122' || loan.name?.includes('Hipoteca')) ? 'casa2'
                    : 'casa1';
                  return (
                    <button
                      key={loan.id}
                      type="button"
                      className={`sidebar-filter-item ${activeFinancialTab === tabKey ? 'active' : ''}`}
                      onClick={() => onSelectFinancialTab && onSelectFinancialTab(tabKey)}
                      style={activeFinancialTab === tabKey ? { borderColor: loan.color || 'var(--primary-light)', background: 'rgba(99, 102, 241, 0.14)', color: loan.color || 'var(--primary-light)' } : {}}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <CreditCard size={14} />
                        <span style={{ fontWeight: '700' }}>{loan.name}</span>
                      </div>
                      {activeFinancialTab === tabKey && <span style={{ fontSize: '0.75rem', color: loan.color || 'var(--primary-light)' }}>✓</span>}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* 1. Search Box */}
        <div className="sidebar-section">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Pesquisar eventos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 2. Quick Focus Today Button */}
        <div className="sidebar-section">
          <button
            type="button"
            onClick={scrollToToday}
            className="btn btn-secondary btn-sm"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '700',
              borderColor: 'var(--primary-light)',
              color: 'var(--primary-light)',
              background: 'rgba(99, 102, 241, 0.12)',
              padding: '8px 12px'
            }}
            title="Focar e navegar diretamente para o mês atual"
          >
            <LocateFixed size={15} />
            <span>Focar no Mês Atual</span>
          </button>
        </div>

        {/* 3. Estado Filter */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>Estado</span>
          </div>
          <div className="sidebar-btn-group">
            {(timeline.type === 'Entradas' || timeline.type === 'Financeiro'
              ? [
                { id: 'Todos', name: 'Todos os Estados', icon: <Layers size={13} /> },
                { id: 'Recebido', name: 'Recebidos / Pagos', icon: <CheckCircle2 size={13} /> },
                { id: 'Pendente', name: 'Previstos / Pendentes', icon: <Clock size={13} /> },
                { id: 'Atrasada', name: 'Em Atraso', icon: <AlertCircle size={13} /> }
              ]
              : timeline.type === 'Empréstimo' || timeline.type === 'Principal'
                ? [
                  { id: 'Todos', name: 'Todos os Estados', icon: <Layers size={13} /> },
                  { id: 'Pago', name: 'Pagas / Liquidadas', icon: <CheckCircle2 size={13} /> },
                  { id: 'Pendente', name: 'Pendentes', icon: <Clock size={13} /> },
                  { id: 'Atrasada', name: 'Em Atraso', icon: <AlertCircle size={13} /> }
                ]
                : [
                  { id: 'Todos', name: 'Todos', icon: <Layers size={13} /> },
                  { id: 'Em Progresso', name: 'Em Progresso', icon: <Play size={13} /> },
                  { id: 'Concluído', name: 'Concluídos', icon: <CheckCircle2 size={13} /> },
                  { id: 'Planeado', name: 'Planeados', icon: <Calendar size={13} /> }
                ]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                className={`sidebar-filter-item ${selectedStatusFilter === st.id ? 'active' : ''}`}
                onClick={() => setSelectedStatusFilter(st.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {st.icon}
                  <span>{st.name}</span>
                </div>
                {selectedStatusFilter === st.id && <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Timelines Filter (Multi-Selection for Principal) */}
        {timeline.type === 'Principal' && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span>Linhas Integradas</span>
              <button
                type="button"
                onClick={selectAllTimelines}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-light)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                {selectedTimelineIds.length === availableCreditOptions.length ? 'Desmarcar' : 'Todas'}
              </button>
            </div>
            <div className="sidebar-btn-group">
              {availableCreditOptions.map((opt) => {
                const isSelected = selectedTimelineIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleTimelineSelection(opt.id)}
                    style={isSelected ? { borderColor: opt.color } : { opacity: 0.6 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {opt.icon}
                      <span>{opt.name}</span>
                    </div>
                    {isSelected ? <CheckSquare size={13} style={{ color: opt.color }} /> : <Square size={13} style={{ color: 'var(--text-dim)' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Tipo / Natureza Filter */}
        {timeline.type !== 'Principal' && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span>Categoria / Tipo</span>
            </div>
            <div className="sidebar-btn-group">
              {(timeline.type === 'Entradas' || timeline.type === 'Financeiro' || timeline.type === 'investimentos'
                ? [
                  { id: 'Todos', name: 'Todas as Categorias', icon: <Layers size={13} /> },
                  { id: 'entrada_recorrente', name: 'Salários / Rendas', icon: <DollarSign size={13} /> },
                  { id: 'entrada_esporadica', name: 'Bónus / Extras', icon: <Gift size={13} /> },
                  { id: 'saida_recorrente', name: 'Despesas Fixas', icon: <CreditCard size={13} /> },
                  { id: 'gasto', name: 'Gastos Variáveis', icon: <Tag size={13} /> },
                  { id: 'investimento_poupanca', name: 'Poupança', icon: <PiggyBank size={13} /> },
                  { id: 'investimento_patrimonio', name: 'Património', icon: <Landmark size={13} /> },
                  { id: 'investimento_outros', name: 'Outros Investimentos', icon: <Sparkles size={13} /> }
                ]
                : timeline.type === 'Empréstimo'
                  ? [
                    { id: 'Todos', name: 'Todas as Categorias', icon: <Layers size={13} /> },
                    { id: 'parcela_emprestimo', name: 'Prestações Contratuais', icon: <CreditCard size={13} /> },
                    { id: 'amortizacao', name: 'Amortizações Extras', icon: <TrendingDown size={13} /> }
                  ]
                  : [
                    { id: 'Todos', name: 'Todos os Tipos', icon: <Layers size={13} /> },
                    { id: 'agendamento', name: 'Agendamentos', icon: <Calendar size={13} /> },
                    { id: 'repetitivo', name: 'Repetitivos', icon: <Repeat size={13} /> },
                    { id: 'tarefa', name: 'Tarefas', icon: <Pin size={13} /> },
                    { id: 'memoria', name: 'Notas', icon: <FileText size={13} /> }
                  ]
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`sidebar-filter-item ${selectedCategoryFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cat.icon}
                    <span>{cat.name}</span>
                  </div>
                  {selectedCategoryFilter === cat.id && <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>✓</span>}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 6. Períodos Vazios Toggle */}
        <div className="sidebar-section">
          <div
            className="sidebar-filter-item"
            onClick={() => setShowEmptyDays(!showEmptyDays)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showEmptyDays ? <Eye size={15} /> : <EyeOff size={15} />}
              <span>{showEmptyDays ? 'Ocultar vazios' : 'Mostrar vazios'}</span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {showEmptyDays ? 'Visível' : 'Oculto'}
            </span>
          </div>
        </div>
      </aside>

      {/* 📜 Right Timeline Content Stream */}
      <div className="timeline-content-stream">
        {/* Sticky Header Dock */}
        <div className="sticky-header-dock">
          {headerComponent}
        </div>

        {/* 📌 Pilha de Tarefas Pendentes (apenas para timelines de projeto/gerais, oculta em Financeiro, Entradas, Empréstimos e Principal) */}
        {!isFinancialTimeline && timeline.type !== 'Financeiro' && timeline.type !== 'Entradas' && timeline.type !== 'Empréstimo' && timeline.type !== 'Principal' && (
          <FloatingTaskStack
            pendingTasks={pendingFloatingTasks}
            onCompleteTask={onCompleteFloatingTask}
            onAddFloatingTask={onAddFloatingTask}
            onUpdatePriority={onUpdateFloatingTaskPriority}
            onToggleTask={onToggleTask}
            onAddChecklistItem={onAddChecklistItem}
            onDeleteChecklistItem={onDeleteChecklistItem}
          />
        )}

        {/* Render Selected Timeline View with Key Isolation per view & tab */}
        <div key={`${timeline.id}-${activeFinancialTab || 'all'}-${groupBy}`} className="timeline-view-wrapper">
          {groupBy === 'semana' && renderWeekView()}
          {groupBy === 'mes' && renderMonthView()}
          {groupBy === 'ano' && renderYearView()}
          {groupBy === 'dia' && renderDayView()}
        </div>

        {/* Fallback if no matching events */}
        {filteredEvents.length === 0 && !showEmptyDays && (
          <div className="empty-timeline-state glass-panel">
            <div className="empty-icon">
              <Calendar size={28} />
            </div>
            <h3>Nenhum evento encontrado</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Tente alterar os filtros de pesquisa na barra lateral ou clique abaixo para adicionar um evento.
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: '16px' }}
              onClick={() => onAddEventForDate(todayStr)}
            >
              <Plus size={16} /> Adicionar Evento em Hoje
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(VerticalTimeline);
