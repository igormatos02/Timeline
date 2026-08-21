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
  getWeek
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
  LocateFixed
} from 'lucide-react';
import TimelineEventCard from './TimelineEventCard';
import FloatingTaskStack from './FloatingTaskStack';
import { motion, AnimatePresence } from 'framer-motion';
import { getGroupingForPeriodicity } from '../utils/loanCalculations';

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
  onOpenEditInstallment
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Todos');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('Todos');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState('Todos');
  const [showEmptyDays, setShowEmptyDays] = useState(true);
  const [groupBy, setGroupBy] = useState(() => {
    if (timeline.type === 'Empréstimo' && timeline.periodicity) {
      return getGroupingForPeriodicity(timeline.periodicity);
    }
    return 'dia';
  });

  // Automatically update aggregation view when timeline periodicity changes
  React.useEffect(() => {
    if (timeline.type === 'Empréstimo' && timeline.periodicity) {
      setGroupBy(getGroupingForPeriodicity(timeline.periodicity));
    }
  }, [timeline.id, timeline.periodicity, timeline.type]);

  // Scroll and focus on Today / Current period node
  const scrollToToday = () => {
    const todayNode = document.getElementById('timeline-node-today');
    if (todayNode) {
      todayNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // Auto-focus on Today / Current node on startup / when changing timeline or view mode
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const todayNode = document.getElementById('timeline-node-today');
      if (todayNode) {
        todayNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [timeline.id, groupBy]);

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

      const matchesStatus =
        selectedStatusFilter === 'Todos' || ev.status === selectedStatusFilter;

      const matchesCategory =
        selectedCategoryFilter === 'Todos' || ev.category === selectedCategoryFilter;

      const matchesLabel =
        selectedLabelFilter === 'Todos' ||
        (ev.labels && ev.labels.includes(selectedLabelFilter));

      return matchesSearch && matchesStatus && matchesCategory && matchesLabel;
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

  // Determine latest date in timeline (supports future loan installments up to endDate)
  let maxDateObj = todayDate;
  if (timeline.endDate) {
    try {
      const parsedEnd = parseISO(timeline.endDate);
      if (!isNaN(parsedEnd.getTime()) && parsedEnd > maxDateObj) {
        maxDateObj = parsedEnd;
      }
    } catch (e) {}
  }

  // Check if any event has a later date
  allEvents.forEach((ev) => {
    try {
      const evD = parseISO(ev.date);
      if (!isNaN(evD.getTime()) && evD > maxDateObj) {
        maxDateObj = evD;
      }
    } catch (e) {}
  });

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
      } catch (e) {}
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
                  className={`day-node-dot ${
                    isCurrentWeek ? 'is-today-node' : hasEvents ? 'has-events' : ''
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
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onOpenEditInstallment={onOpenEditInstallment}
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
      } catch (e) {}
    });

    const monthsList = Array.from(monthMap.values());

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
          const hasEvents = mGroup.events.length > 0;

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
                  className={`day-node-dot ${
                    isCurrentMonth ? 'is-today-node' : hasEvents ? 'has-events' : ''
                  }`}
                  style={hasEvents && !isCurrentMonth ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header">
                    <h3 className="group-card-title" style={{ textTransform: 'capitalize' }}>
                      <Clock size={18} style={{ color: 'var(--primary-light)' }} /> {monthTitleStr}
                    </h3>
                    <span className="group-card-badge">
                      {mGroup.events.length} evento(s)
                    </span>
                  </div>

                  {hasEvents ? (
                    mGroup.events.map((ev) => (
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
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onOpenEditInstallment={onOpenEditInstallment}
                        />
                      </div>
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
      } catch (e) {}
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
                  className={`day-node-dot ${
                    isCurrentYear ? 'is-today-node' : totalEventsInYear > 0 ? 'has-events' : ''
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
                              onEdit={onEditEvent}
                              onDelete={onDeleteEvent}
                              onToggleTask={onToggleTask}
                              onToggleLoanPayment={onToggleLoanPayment}
                              onOpenEditInstallment={onOpenEditInstallment}
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
                  className={`day-node-dot ${
                    isTodayNode ? 'is-today-node' : hasEvents ? 'has-events' : ''
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
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onOpenEditInstallment={onOpenEditInstallment}
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
    <div className="vertical-timeline-section">

      {/* Toolbar / Search / Category / Label Filters & Grouping Selector */}
      <div
        className="toolbar-section glass-panel"
        style={{ padding: '18px 22px', borderRadius: '16px', flexDirection: 'column', alignItems: 'stretch', gap: '14px' }}
      >
        {/* Row 1: Search & Grouping View */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Pesquisar por título, notas ou #etiquetas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={scrollToToday}
              className="btn btn-secondary btn-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '700',
                borderColor: 'var(--primary-light)',
                color: 'var(--primary-light)',
                background: 'rgba(99, 102, 241, 0.12)'
              }}
              title="Focar e navegar diretamente para a data de hoje / período atual"
            >
              <LocateFixed size={14} />
              <span>Hoje / Atual</span>
            </button>

            <div className="group-selector-container">
              <span className="group-label">Agrupar:</span>
              <button
                className={`group-btn ${groupBy === 'dia' ? 'active' : ''}`}
                onClick={() => setGroupBy('dia')}
              >
                <Calendar size={14} /> Dia
              </button>
              <button
                className={`group-btn ${groupBy === 'semana' ? 'active' : ''}`}
                onClick={() => setGroupBy('semana')}
              >
                <Layers size={14} /> Semana
              </button>
              <button
                className={`group-btn ${groupBy === 'mes' ? 'active' : ''}`}
                onClick={() => setGroupBy('mes')}
              >
                <Clock size={14} /> Mês
              </button>
              <button
                className={`group-btn ${groupBy === 'ano' ? 'active' : ''}`}
                onClick={() => setGroupBy('ano')}
              >
                <Sparkles size={14} /> Ano
              </button>
            </div>
          </div>
        </div>

        {/* Row 2: Event Nature Category Filters */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Natureza:
          </span>
          {[
            { id: 'Todos', name: 'Todos os Tipos', icon: '⚡' },
            ...(timeline.type === 'Empréstimo'
              ? [
                  { id: 'parcela_emprestimo', name: 'Prestações', icon: '💳' },
                  { id: 'amortizacao', name: 'Amortizações', icon: '📉' }
                ]
              : []),
            { id: 'agendamento', name: 'Agendamentos', icon: '📅' },
            { id: 'repetitivo', name: 'Repetitivos / Aniversários', icon: '🔁' },
            { id: 'tarefa', name: 'Tarefas (Fixadas)', icon: '📌' },
            { id: 'memoria', name: 'Memórias / Notas', icon: '📝' }
          ].map((cat) => (
            <button
              key={cat.id}
              className={`pill-btn ${selectedCategoryFilter === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategoryFilter(cat.id)}
            >
              <span>{cat.icon}</span> {cat.name}
            </button>
          ))}
        </div>

        {/* Row 3: Label/Etiquetas Filter Bar */}
        {availableLabels.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Tag size={12} /> Etiquetas:
            </span>
            <button
              className={`pill-btn ${selectedLabelFilter === 'Todos' ? 'active' : ''}`}
              onClick={() => setSelectedLabelFilter('Todos')}
            >
              Todas
            </button>
            {availableLabels.map((lbl) => (
              <button
                key={lbl}
                className={`pill-btn ${selectedLabelFilter === lbl ? 'active' : ''}`}
                onClick={() => setSelectedLabelFilter(lbl)}
              >
                #{lbl}
              </button>
            ))}

            <div
              className="toggle-empty-days"
              onClick={() => setShowEmptyDays(!showEmptyDays)}
              style={{ marginLeft: 'auto' }}
              title="Alternar visibilidade dos dias sem eventos"
            >
              {showEmptyDays ? <Eye size={16} /> : <EyeOff size={16} />}
              <span>{showEmptyDays ? 'Ocultar vazios' : 'Mostrar vazios'}</span>
            </div>
          </div>
        )}
      </div>

      {/* 📌 Pilha de Tarefas Pendentes (abaixo dos filtros) */}
      <FloatingTaskStack
        pendingTasks={pendingFloatingTasks}
        onCompleteTask={onCompleteFloatingTask}
        onAddFloatingTask={onAddFloatingTask}
        onUpdatePriority={onUpdateFloatingTaskPriority}
        onToggleTask={onToggleTask}
        onAddChecklistItem={onAddChecklistItem}
        onDeleteChecklistItem={onDeleteChecklistItem}
      />

      {/* Render Selected Timeline View */}
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
            Tente alterar os filtros de pesquisa ou clique abaixo para adicionar um evento.
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
