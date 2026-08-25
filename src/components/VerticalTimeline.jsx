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

export default function VerticalTimeline({
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

  // Scroll memory per timeline/tab: remember exact scroll position or jump directly to today without animated gliding
  const scrollPositionsRef = React.useRef({});
  const currentKeyRef = React.useRef(`${timeline.id}_${activeFinancialTab || 'default'}`);

  React.useEffect(() => {
    const handleScroll = () => {
      if (currentKeyRef.current && window.scrollY > 0) {
        scrollPositionsRef.current[currentKeyRef.current] = window.scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useLayoutEffect(() => {
    const viewKey = `${timeline.id}_${activeFinancialTab || 'default'}`;
    currentKeyRef.current = viewKey;

    const savedPosition = scrollPositionsRef.current[viewKey];
    if (savedPosition !== undefined) {
      // Restaurar exatamente onde o utilizador esteve pela última vez
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    } else {
      // Apenas na PRIMEIRA VEZ que entra nesta visão: posicionar no mês corrente logo abaixo do painel do topo
      const timer = setTimeout(() => {
        const todayNode = document.getElementById('timeline-node-today');
        if (todayNode) {
          const navbar = document.querySelector('.app-header') || document.querySelector('header');
          const stickyDock = document.querySelector('.sticky-header-dock');

          const navHeight = navbar ? navbar.offsetHeight : 68;
          const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
          const totalStickyOffset = navHeight + 24 + dockHeight + 14;

          const elementDocTop = todayNode.getBoundingClientRect().top + window.pageYOffset;
          const targetY = elementDocTop - totalStickyOffset;

          window.scrollTo({ top: Math.max(0, targetY), behavior: 'instant' });
        } else {
          window.scrollTo({ top: 0, behavior: 'instant' });
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [timeline.id, activeFinancialTab]);

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
        const isJeep = ev.timelineOriginId === 'tl-loan-jeep' || ev.timelineOriginId === 'tl-loan-80004197726' || (ev.title && ev.title.includes('Jeep')) || (ev.isSystemLoanEvent && ev.amount === 218.47);
        const isDacia = ev.timelineOriginId === 'tl-loan-dacia' || ev.timelineOriginId === 'tl-loan-crd19605103001' || (ev.title && ev.title.includes('Dacia')) || (ev.isSystemLoanEvent && ev.amount === 180.08);
        const isCasa1 = ev.timelineOriginId === 'tl-loan-casa1' || ev.timelineOriginId === 'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b' || (ev.title && (ev.title.includes('02012642') || ev.title.includes('Egas Moniz') || ev.title.includes('Casa 1')));
        const isCasa2 = ev.timelineOriginId === 'tl-loan-casa2' || ev.timelineOriginId === 'f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c' || (ev.title && (ev.title.includes('02015122') || ev.title.includes('Hipoteca') || ev.title.includes('Casa 2')));
        const isLoan = isJeep || isDacia || isCasa1 || isCasa2 || ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || ev.category === 'amortizacao';
        const isIncome = (ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
        const isExpense = (ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') && !isLoan;
        const isInvestment = ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

        if (activeFinancialTab === 'entradas' && !isIncome) return false;
        if (activeFinancialTab === 'gastos') {
          if (isInvestment && Number(ev.amount || 0) <= 0) return false;
          if (!isExpense && !isLoan && !isInvestment) return false;
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
      timeline.id === 'tl-income' ||
      timeline.id === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';

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
        const isLoan = ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || (ev.timelineOriginId && String(ev.timelineOriginId).includes('loan'));
        const isIncome = (ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
        const isExpense = (ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') || isLoan;
        const isInvestment = ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

        const initialKey = ev.seriesId || ev.id;
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
            if (ev.status === 'Cancelado' || ev.status === 'Excluido' || ev.isDeleted) return;

            const amt = Number(ev.amount || 0);
            const isLoan = ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || (ev.timelineOriginId && String(ev.timelineOriginId).includes('loan'));
            const isIncome = (ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
            const isExpense = (ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto') || isLoan;
            const isInvestment = ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

            const isIncomeReceived = ev.status === 'Recebido' || ev.isCompleted;
            const isExpensePaid = ev.status === 'Pago' || ev.isCompleted;
            const isInvested = ev.status === 'Investido' || ev.status === 'Pago' || ev.isCompleted;

            if (isIncome) {
              mMonthIncome += amt;
              if (isIncomeReceived || isFutureMonth) mMonthIncomePaid += amt;
            }
            if (isExpense) {
              mMonthExpense += amt;
              if (isExpensePaid || isFutureMonth) mMonthExpensePaid += amt;
            }
            if (isInvestment) {
              mMonthInvestment += amt;
              if (isInvested || isFutureMonth) mMonthInvestmentPaid += amt;
            }
          });

          // No Balanço: Se for mês passado ou atual, computar o que foi efetivamente recebido/pago/investido para atualizar dinamicamente com o status
          const effectiveIncome = isBalancoView ? (isFutureMonth ? mMonthIncome : mMonthIncomePaid) : mMonthIncome;
          const effectiveExpense = isBalancoView ? (isFutureMonth ? mMonthExpense : mMonthExpensePaid) : mMonthExpense;
          const effectiveInvestment = isBalancoView ? (isFutureMonth ? mMonthInvestment : mMonthInvestmentPaid) : mMonthInvestment;
          const mNetRealizedMonth = effectiveIncome - (effectiveExpense + effectiveInvestment);
          const mNetProjectedMonth = mMonthIncome - (mMonthExpense + mMonthInvestment);
          const cumData = monthCumulativeMap.get(monthKeyStr) || { income: 0, expense: 0, investment: 0 };

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
                  <div className="group-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="group-card-title" style={{ textTransform: 'capitalize', color: isFutureMonth ? 'var(--text-muted)' : 'var(--text-main)' }}>
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
                        {mGroup.events.length} {isFinancialTimeline ? (activeFinancialTab === 'gastos' ? 'saída(s)' : activeFinancialTab === 'investimentos' ? 'aporte(s)' : 'movimento(s)') : 'evento(s)'}
                      </span>

                      {/* Badges para a aba Entradas */}
                      {isFinancialTimeline && activeFinancialTab === 'entradas' && (
                        <>
                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthIncome > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                              color: isFutureMonth ? 'var(--text-dim)' : (mMonthIncome > 0 ? '#10b981' : 'var(--text-dim)'),
                              borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthIncome > 0 ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-glass)'),
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                          >
                            <DollarSign size={12} />
                            <span>Budget Mensal: {formatCurrency(mMonthIncome)}</span>
                          </span>

                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (cumData.income > 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                              color: isFutureMonth ? 'var(--text-dim)' : (cumData.income > 0 ? 'var(--primary-light)' : 'var(--text-dim)'),
                              borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (cumData.income > 0 ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-glass)'),
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                          >
                            <TrendingUp size={12} />
                            <span>Budget Acumulado: {formatCurrency(cumData.income)}</span>
                          </span>
                        </>
                      )}

                      {/* Badges para a aba Gastos (Gastos + Empréstimos + Investimentos) */}
                      {isFinancialTimeline && activeFinancialTab === 'gastos' && (
                        <>
                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : ((mMonthExpense + mMonthInvestment) > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                              color: isFutureMonth ? 'var(--text-dim)' : ((mMonthExpense + mMonthInvestment) > 0 ? '#f43f5e' : 'var(--text-dim)'),
                              borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : ((mMonthExpense + mMonthInvestment) > 0 ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-glass)'),
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                          >
                            <span>Total Saídas: -{formatCurrency(mMonthExpense + mMonthInvestment)}</span>
                          </span>

                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : ((cumData.expense + cumData.investment) > 0 ? 'rgba(244, 63, 94, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                              color: isFutureMonth ? 'var(--text-dim)' : ((cumData.expense + cumData.investment) > 0 ? '#fb7185' : 'var(--text-dim)'),
                              borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : ((cumData.expense + cumData.investment) > 0 ? 'rgba(244, 63, 94, 0.35)' : 'var(--border-glass)'),
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                          >
                            <span>Acumulado: -{formatCurrency(cumData.expense + cumData.investment)}</span>
                          </span>
                        </>
                      )}

                      {/* Badges para a aba Investimentos */}
                      {isFinancialTimeline && activeFinancialTab === 'investimentos' && (
                        <>
                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthInvestment > 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                              color: isFutureMonth ? 'var(--text-dim)' : (mMonthInvestment > 0 ? 'var(--primary-light)' : 'var(--text-dim)'),
                              borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthInvestment > 0 ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-glass)'),
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                          >
                            <span>Aportes: +{formatCurrency(mMonthInvestment)}</span>
                          </span>

                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (cumData.investment > 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                              color: isFutureMonth ? 'var(--text-dim)' : (cumData.investment > 0 ? '#818cf8' : 'var(--text-dim)'),
                              borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (cumData.investment > 0 ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-glass)'),
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                          >
                            <span>Património: {formatCurrency(cumData.investment)}</span>
                          </span>
                        </>
                      )}

                      {/* Badges para a aba Balanço */}
                      {isFinancialTimeline && activeFinancialTab === 'balanco' && (
                        <>
                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '26px',
                              boxSizing: 'border-box',
                              color: '#10b981',
                              borderColor: 'rgba(16, 185, 129, 0.25)',
                              background: 'rgba(16, 185, 129, 0.08)',
                              fontWeight: '800',
                              fontSize: '0.74rem'
                            }}
                            title="Total de Entradas"
                          >
                            +{formatCurrency(effectiveIncome)}
                          </span>

                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '26px',
                              boxSizing: 'border-box',
                              color: '#f43f5e',
                              borderColor: 'rgba(244, 63, 94, 0.25)',
                              background: 'rgba(244, 63, 94, 0.08)',
                              fontWeight: '800',
                              fontSize: '0.74rem'
                            }}
                            title="Total de Gastos Pagos (inclui Empréstimos)"
                          >
                            -{formatCurrency(effectiveExpense)}
                          </span>

                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '26px',
                              boxSizing: 'border-box',
                              color: 'var(--primary-light, #818cf8)',
                              borderColor: 'rgba(99, 102, 241, 0.25)',
                              background: 'rgba(99, 102, 241, 0.08)',
                              fontWeight: '800',
                              fontSize: '0.74rem'
                            }}
                            title="Total de Investimentos / Aportes"
                          >
                            -{formatCurrency(effectiveInvestment)}
                          </span>

                          {/* Badge 1: Realizado (Liquidado até à data) */}
                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: mNetRealizedMonth >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: mNetRealizedMonth >= 0 ? '#10b981' : '#f43f5e',
                              borderColor: mNetRealizedMonth >= 0 ? 'rgba(16, 185, 129, 0.35)' : 'rgba(244, 63, 94, 0.35)',
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                            title={`Saldo Líquido Realizado = ${formatCurrency(effectiveIncome)} - (${formatCurrency(effectiveExpense)} + ${formatCurrency(effectiveInvestment)})`}
                          >
                            <span>Realizado: {mNetRealizedMonth > 0 ? '+' : ''}{formatCurrency(mNetRealizedMonth)}</span>
                          </span>

                          {/* Badge 2: Previsto (Estimativa total do mês em azul) */}
                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '26px',
                              boxSizing: 'border-box',
                              background: mNetProjectedMonth >= 0 ? 'rgba(56, 189, 248, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                              color: mNetProjectedMonth >= 0 ? '#38bdf8' : '#f43f5e',
                              borderColor: mNetProjectedMonth >= 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(244, 63, 94, 0.35)',
                              fontWeight: '800',
                              fontSize: '0.76rem'
                            }}
                            title={`Saldo Líquido Previsto (Total do Mês) = ${formatCurrency(mMonthIncome)} - (${formatCurrency(mMonthExpense)} + ${formatCurrency(mMonthInvestment)})`}
                          >
                            <span>Previsto: {mNetProjectedMonth > 0 ? '+' : ''}{formatCurrency(mNetProjectedMonth)}</span>
                          </span>
                        </>
                      )}

                      {/* Botão Adicionar Evento no Mês (em frente à data, alinhado à direita) */}
                      {onAddEventForDate && (
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
                            marginLeft: '6px',
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
                    /* Botão em frente à data quando o mês está vazio */
                    <div
                      className="empty-day-row"
                      onClick={() => {
                        const nature = activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income';
                        onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-01'), nature);
                      }}
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                        <span className="empty-day-text">
                          Sem registos nesta aba para este mês
                        </span>
                      </div>
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

              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'jeep' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('jeep')}
                style={activeFinancialTab === 'jeep' ? { borderColor: '#6366f1', background: 'rgba(99, 102, 241, 0.14)', color: 'var(--primary-light)' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={14} />
                  <span style={{ fontWeight: '700' }}>Empréstimo Jeep</span>
                </div>
                {activeFinancialTab === 'jeep' && <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>✓</span>}
              </button>

              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'dacia' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('dacia')}
                style={activeFinancialTab === 'dacia' ? { borderColor: '#8b5cf6', background: 'rgba(139, 92, 246, 0.14)', color: '#8b5cf6' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={14} />
                  <span style={{ fontWeight: '700' }}>Empréstimo Dacia</span>
                </div>
                {activeFinancialTab === 'dacia' && <span style={{ fontSize: '0.75rem', color: '#8b5cf6' }}>✓</span>}
              </button>

              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'casa1' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('casa1')}
                style={activeFinancialTab === 'casa1' ? { borderColor: '#0ea5e9', background: 'rgba(14, 165, 233, 0.14)', color: '#0ea5e9' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={14} />
                  <span style={{ fontWeight: '700' }}>Crédito Egas Moniz</span>
                </div>
                {activeFinancialTab === 'casa1' && <span style={{ fontSize: '0.75rem', color: '#0ea5e9' }}>✓</span>}
              </button>

              <button
                type="button"
                className={`sidebar-filter-item ${activeFinancialTab === 'casa2' ? 'active' : ''}`}
                onClick={() => onSelectFinancialTab && onSelectFinancialTab('casa2')}
                style={activeFinancialTab === 'casa2' ? { borderColor: '#14b8a6', background: 'rgba(20, 184, 166, 0.14)', color: '#14b8a6' } : {}}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CreditCard size={14} />
                  <span style={{ fontWeight: '700' }}>Hipoteca Egas Moniz</span>
                </div>
                {activeFinancialTab === 'casa2' && <span style={{ fontSize: '0.75rem', color: '#14b8a6' }}>✓</span>}
              </button>
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

      {/* 🎯 Floating Quick Novo Button (Aligned with UI Design System) */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 99
        }}
      >
        <button
          type="button"
          onClick={() => {
            const nature = activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income';
            onAddEventForDate(todayStr, nature);
          }}
          className="btn btn-primary"
          style={{
            borderRadius: '9999px',
            padding: '10px 20px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '700',
            fontSize: '0.86rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            color: '#ffffff',
            cursor: 'pointer',
            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px) scale(1.02)';
            e.currentTarget.style.boxShadow = '0 12px 28px rgba(99, 102, 241, 0.55)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0) scale(1)';
            e.currentTarget.style.boxShadow = '0 8px 24px rgba(99, 102, 241, 0.4)';
          }}
          title="Criar novo registo / movimento"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Novo</span>
        </button>
      </div>
    </div>
  );
}
