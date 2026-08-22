import React, { useState } from 'react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  subDays,
  startOfWeek,
  endOfWeek,
  isSameWeek,
  isSameMonth,
  getWeek,
  addYears
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
  TrendingUp
} from 'lucide-react';
import TimelineEventCard from './TimelineEventCard';
import FloatingTaskStack from './FloatingTaskStack';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroupingForPeriodicity, formatCurrency } from '../utils/loanCalculations';

export default function VerticalTimeline({
  timeline,
  onEditEvent,
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
  headerComponent
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Todos');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todos');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState('Todos');
  const [showEmptyDays, setShowEmptyDays] = useState(true);

  // Multi-selection of credit and income timelines for Principal view
  const availableCreditOptions = [
    { id: 'tl-loan-house', name: 'Habitação', icon: '🏠', color: '#10b981' },
    { id: 'tl-loan-80004197726', name: 'Automóvel', icon: '🚗', color: '#6366f1' },
    { id: 'tl-income', name: 'Entradas', icon: '💵', color: '#06b6d4' }
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

  // Scroll and focus on Today / Current period node when clicked by user
  const scrollToToday = () => {
    const todayNode = document.getElementById('timeline-node-today');
    if (todayNode) {
      todayNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Scroll memory per timeline: remember exact scroll position or jump directly to today without animated gliding
  const scrollPositionsRef = React.useRef({});
  const currentTimelineIdRef = React.useRef(timeline.id);

  React.useEffect(() => {
    const handleScroll = () => {
      if (currentTimelineIdRef.current) {
        scrollPositionsRef.current[currentTimelineIdRef.current] = window.scrollY;
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  React.useLayoutEffect(() => {
    const currentId = timeline.id;
    currentTimelineIdRef.current = currentId;

    const savedPosition = scrollPositionsRef.current[currentId];
    if (savedPosition !== undefined) {
      window.scrollTo({ top: savedPosition, behavior: 'instant' });
    } else {
      // First time opening this timeline: place directly on today without animated scroll racing
      const timer = setTimeout(() => {
        const todayNode = document.getElementById('timeline-node-today');
        if (todayNode) {
          todayNode.scrollIntoView({ behavior: 'instant', block: 'center' });
        }
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [timeline.id]);

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

  // Filter events based on search query, status, category, and label
  const filterEvents = (events) => {
    if (!events) return [];
    return events.filter((ev) => {
      const matchesSearch =
        searchQuery === '' ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.labels && ev.labels.some((l) => l.toLowerCase().includes(searchQuery.toLowerCase())));

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

      // Entradas: máximo 1 ano à frente da data atual (21/08/2026 -> 21/08/2027 / 31/08/2027)
      if (timeline.type === 'Entradas') {
        const oneYearAheadStr = format(addYears(todayDate, 1), 'yyyy-MM-31');
        if (ev.date > oneYearAheadStr) {
          return false;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesTimelineMultiSelect && matchesLabel;
    });
  };

  const filteredEvents = filterEvents(timelineEvents);

  // Collect all unique labels for filter pills
  const availableLabels = Array.from(
    new Set(allEvents.flatMap((ev) => ev.labels || []))
  );

  // Determine earliest date in timeline
  let startDateObj = parseISO(timeline.startDate || '2026-08-01');
  if (isNaN(startDateObj.getTime())) {
    startDateObj = subDays(todayDate, 20);
  }

  // Determine latest date in timeline (Principal only shows up to todayDate, Entradas shows at most 1 year ahead)
  let maxDateObj = todayDate;
  if (timeline.type === 'Principal') {
    maxDateObj = todayDate;
  } else if (timeline.type === 'Entradas') {
    maxDateObj = addYears(todayDate, 1);
  } else if (timeline.endDate) {
    try {
      const parsedEnd = parseISO(timeline.endDate);
      if (!isNaN(parsedEnd.getTime()) && parsedEnd > maxDateObj) {
        maxDateObj = parsedEnd;
      }
    } catch (e) { }
  }

  if (timeline.type !== 'Principal' && timeline.type !== 'Entradas') {
    allEvents.forEach((ev) => {
      try {
        const evD = parseISO(ev.date);
        if (!isNaN(evD.getTime()) && evD > maxDateObj) {
          maxDateObj = evD;
        }
      } catch (e) { }
    });
  }

  // Generate array of days from startDate up to maxDateObj (Descending: future at top, past at bottom)
  let daysArray = [];
  try {
    const daysAscending = eachDayOfInterval({
      start: startDateObj,
      end: maxDateObj
    });
    daysArray = daysAscending.reverse();
  } catch (err) {
    daysArray = [todayDate];
  }

  // Map events by date (YYYY-MM-DD)
  const eventsByDate = {};
  filteredEvents.forEach((ev) => {
    if (!eventsByDate[ev.date]) {
      eventsByDate[ev.date] = [];
    }
    eventsByDate[ev.date].push(ev);
  });

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
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: '700', marginBottom: '4px' }}>
                          📅 {format(parseISO(ev.date), "EEEE, d 'de' MMMM", { locale: pt })}
                        </div>
                        <TimelineEventCard
                          event={ev}
                          currentTimelineId={timeline.id}
                          onEdit={onEditEvent}
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

    daysArray.forEach((dayObj) => {
      const monthKey = format(dayObj, 'yyyy-MM');
      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, {
          monthDate: dayObj,
          events: []
        });
      }
    });

    filteredEvents.forEach((ev) => {
      try {
        const evDate = parseISO(ev.date);
        const monthKey = format(evDate, 'yyyy-MM');
        if (monthMap.has(monthKey)) {
          monthMap.get(monthKey).events.push(ev);
        } else {
          monthMap.set(monthKey, {
            monthDate: evDate,
            events: [ev]
          });
        }
      } catch (e) { }
    });

    const monthsList = Array.from(monthMap.values());

    // Pre-calculate chronological running cumulative budget (sum of received entries up to each month)
    const monthCumulativeMap = new Map();
    let runningCumulativeReceived = 0;
    const sortedChronologicalMonths = [...monthsList].sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());
    sortedChronologicalMonths.forEach((mG) => {
      let mReceived = 0;
      mG.events.forEach((ev) => {
        if (ev.status === 'Recebido') {
          mReceived += Number(ev.amount || 0);
        }
      });
      runningCumulativeReceived += mReceived;
      monthCumulativeMap.set(format(mG.monthDate, 'yyyy-MM'), runningCumulativeReceived);
    });

    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

        {monthsList.map((mGroup) => {
          const isCurrentMonth = format(todayDate, 'yyyy-MM') === format(mGroup.monthDate, 'yyyy-MM');
          const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: pt });
          const monthKeyStr = format(mGroup.monthDate, 'yyyy-MM');
          const hasEvents = mGroup.events.length > 0;

          // Calculate total received in this month
          let totalMonthReceived = 0;
          mGroup.events.forEach((ev) => {
            const amt = Number(ev.amount || 0);
            if (ev.status === 'Recebido') {
              totalMonthReceived += amt;
            }
          });

          // Cumulative received budget up to this specific month
          const cumulativeReceived = monthCumulativeMap.get(monthKeyStr) || 0;

          if (!showEmptyDays && !hasEvents && !isCurrentMonth) return null;

          return (
            <div
              key={format(mGroup.monthDate, 'yyyy-MM')}
              id={isCurrentMonth ? 'timeline-node-today' : undefined}
              className={`timeline-day-row ${isCurrentMonth ? 'is-today' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main">
                  {format(mGroup.monthDate, 'MMM', { locale: pt }).toUpperCase()}
                </div>
                <div className="day-date-sub">{format(mGroup.monthDate, 'yyyy')}</div>
                {isCurrentMonth && <span className="today-badge-chip pulse-glow">MÊS ATUAL</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentMonth ? 'is-today-node' : hasEvents ? 'has-events' : ''
                    }`}
                  style={hasEvents && !isCurrentMonth ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                    <h3 className="group-card-title" style={{ textTransform: 'capitalize' }}>
                      <Clock size={18} style={{ color: 'var(--primary-light)' }} /> {monthTitleStr}
                    </h3>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      {/* Badge do Contador de Entradas */}
                      <span
                        className="group-card-badge"
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          height: '26px',
                          boxSizing: 'border-box'
                        }}
                      >
                        {mGroup.events.length} {timeline.type === 'Entradas' ? 'entrada(s)' : 'evento(s)'}
                      </span>

                      {/* Badge 1: Budget Mensal (Soma do Recebido no Mês) */}
                      {timeline.type === 'Entradas' && (
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: totalMonthReceived > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            color: totalMonthReceived > 0 ? '#10b981' : 'var(--text-dim)',
                            borderColor: totalMonthReceived > 0 ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-glass)',
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title={`Budget mensal efetivamente recebido em ${monthTitleStr}: ${formatCurrency(totalMonthReceived)}`}
                        >
                          <DollarSign size={12} style={{ color: totalMonthReceived > 0 ? '#10b981' : 'var(--text-dim)' }} />
                          <span>Budget Mensal: {formatCurrency(totalMonthReceived)}</span>
                        </span>
                      )}

                      {/* Badge 2: Budget Acumulado (Soma do Recebido até este Mês) */}
                      {timeline.type === 'Entradas' && (
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: cumulativeReceived > 0 ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.04)',
                            color: cumulativeReceived > 0 ? 'var(--primary-light)' : 'var(--text-dim)',
                            borderColor: cumulativeReceived > 0 ? 'rgba(99, 102, 241, 0.35)' : 'var(--border-glass)',
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title={`Budget total acumulado recebido até ${monthTitleStr}: ${formatCurrency(cumulativeReceived)}`}
                        >
                          <TrendingUp size={12} style={{ color: cumulativeReceived > 0 ? 'var(--primary-light)' : 'var(--text-dim)' }} />
                          <span>Budget Acumulado: {formatCurrency(cumulativeReceived)}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {hasEvents ? (
                    <>
                      {mGroup.events.map((ev) => (
                        <div
                          key={ev.id}
                          id={ev.status === 'Atrasada' ? 'loan-inst-overdue' : undefined}
                          style={{ marginBottom: '12px' }}
                        >
                          <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: '700', marginBottom: '4px' }}>
                            📅 {format(parseISO(ev.date), "EEEE, d 'de' MMMM", { locale: pt })}
                          </div>
                          <TimelineEventCard
                            event={ev}
                            currentTimelineId={timeline.id}
                            onEdit={onEditEvent}
                            onDelete={onDeleteEvent}
                            onToggleTask={onToggleTask}
                            onToggleLoanPayment={onToggleLoanPayment}
                            onOpenEditInstallment={onOpenEditInstallment}
                            onNavigateToTimeline={onNavigateToTimeline}
                          />
                        </div>
                      ))}

                      {/* Botão no fundo do mês (Solid & Prominent) */}
                      <button
                        type="button"
                        onClick={() => onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-15'))}
                        className="btn btn-primary"
                        style={{
                          marginTop: '12px',
                          width: '100%',
                          background: timeline.type === 'Entradas'
                            ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                            : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                          color: '#ffffff',
                          border: '1px solid rgba(255, 255, 255, 0.25)',
                          boxShadow: timeline.type === 'Entradas'
                            ? '0 4px 16px rgba(16, 185, 129, 0.35)'
                            : '0 4px 16px rgba(99, 102, 241, 0.35)',
                          padding: '11px 18px',
                          borderRadius: '10px',
                          fontSize: '0.88rem',
                          fontWeight: '800',
                          letterSpacing: '0.2px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: 'translateY(0)'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-1px)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                        title={`Adicionar nova entrada em ${monthTitleStr}`}
                      >
                        <Plus size={16} strokeWidth={2.5} />
                        <span>{timeline.type === 'Entradas' ? 'Adicionar Nova Entrada neste Mês' : 'Adicionar Novo Evento'}</span>
                      </button>
                    </>
                  ) : (
                    /* Botão em frente à data quando o mês está vazio */
                    <div
                      className="empty-day-row"
                      onClick={() => onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-01'))}
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
                          {timeline.type === 'Entradas' ? 'Sem entradas registadas neste mês' : 'Sem eventos registados neste mês'}
                        </span>
                      </div>
                      <span
                        className="add-event-mini-btn"
                        style={{
                          background: timeline.type === 'Entradas' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(99, 102, 241, 0.15)',
                          color: timeline.type === 'Entradas' ? '#10b981' : 'var(--primary-light)',
                          border: `1px solid ${timeline.type === 'Entradas' ? 'rgba(16, 185, 129, 0.35)' : 'rgba(99, 102, 241, 0.3)'}`,
                          padding: '4px 10px',
                          borderRadius: '6px',
                          fontWeight: '700',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Plus size={13} /> {timeline.type === 'Entradas' ? 'Criar Entrada' : 'Adicionar'}
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
                              onEdit={onEditEvent}
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
                  <AnimatePresence>
                    {dayEvents.map((ev) => (
                      <div
                        key={ev.id}
                        id={ev.status === 'Atrasada' ? 'loan-inst-overdue' : undefined}
                      >
                        <TimelineEventCard
                          event={ev}
                          currentTimelineId={timeline.id}
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onOpenEditInstallment={onOpenEditInstallment}
                          onNavigateToTimeline={onNavigateToTimeline}
                        />
                      </div>
                    ))}
                  </AnimatePresence>
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
            {(timeline.type === 'Entradas'
              ? [
                { id: 'Todos', name: 'Todos os Estados', icon: '⚡' },
                { id: 'Recebido', name: 'Recebidos', icon: '✅' },
                { id: 'Pendente', name: 'A Receber', icon: '⏳' },
                { id: 'Atrasada', name: 'Em Atraso', icon: '⚠️' }
              ]
              : timeline.type === 'Empréstimo' || timeline.type === 'Principal'
                ? [
                  { id: 'Todos', name: 'Todos os Estados', icon: '⚡' },
                  { id: 'Pago', name: 'Pagas / Liquidadas', icon: '✅' },
                  { id: 'Pendente', name: 'Pendentes', icon: '⏳' },
                  { id: 'Atrasada', name: 'Em Atraso', icon: '⚠️' }
                ]
                : [
                  { id: 'Todos', name: 'Todos', icon: '⚡' },
                  { id: 'Em Progresso', name: 'Em Progresso', icon: '▶️' },
                  { id: 'Concluído', name: 'Concluídos', icon: '✅' },
                  { id: 'Planeado', name: 'Planeados', icon: '📅' }
                ]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                className={`sidebar-filter-item ${selectedStatusFilter === st.id ? 'active' : ''}`}
                onClick={() => setSelectedStatusFilter(st.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span>{st.icon}</span>
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
                      <span>{opt.icon}</span>
                      <span>{opt.name}</span>
                    </div>
                    <span style={{ fontSize: '0.85rem' }}>{isSelected ? '☑️' : '◻️'}</span>
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
              {(timeline.type === 'Entradas'
                ? [
                  { id: 'Todos', name: 'Todas as Categorias', icon: '⚡' },
                  { id: 'entrada_recorrente', name: 'Salários / Rendas', icon: '💰' },
                  { id: 'entrada_esporadica', name: 'Bónus / Extras', icon: '🎁' }
                ]
                : timeline.type === 'Empréstimo'
                  ? [
                    { id: 'Todos', name: 'Todas as Categorias', icon: '⚡' },
                    { id: 'parcela_emprestimo', name: 'Prestações Contratuais', icon: '💳' },
                    { id: 'amortizacao', name: 'Amortizações Extras', icon: '📉' }
                  ]
                  : [
                    { id: 'Todos', name: 'Todos os Tipos', icon: '⚡' },
                    { id: 'agendamento', name: 'Agendamentos', icon: '📅' },
                    { id: 'repetitivo', name: 'Repetitivos', icon: '🔁' },
                    { id: 'tarefa', name: 'Tarefas', icon: '📌' },
                    { id: 'memoria', name: 'Notas', icon: '📝' }
                  ]
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`sidebar-filter-item ${selectedCategoryFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>{cat.icon}</span>
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

        {/* 📌 Pilha de Tarefas Pendentes (apenas para timelines gerais/projeto) */}
        {timeline.type !== 'Empréstimo' && timeline.type !== 'Entradas' && timeline.type !== 'Principal' && (
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

        {/* Render Selected Timeline View (Fixed Monthly) */}
        {groupBy === 'semana' && renderWeekView()}
        {groupBy === 'mes' && renderMonthView()}
        {groupBy === 'ano' && renderYearView()}
        {groupBy === 'dia' && renderDayView()}

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

      {/* 🎯 Floating Quick Return to Today Button */}
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
          onClick={scrollToToday}
          className="btn btn-primary"
          style={{
            borderRadius: '9999px',
            padding: '10px 18px',
            boxShadow: '0 8px 24px rgba(99, 102, 241, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontWeight: '800',
            fontSize: '0.85rem',
            background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
          title="Focar e voltar para a data de Hoje / Mês Atual"
        >
          <LocateFixed size={16} />
          <span>Voltar ao Hoje</span>
        </button>
      </div>
    </div>
  );
}
