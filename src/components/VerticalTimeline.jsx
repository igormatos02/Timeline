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
  isSameYear,
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
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import TimelineEventCard from './TimelineEventCard';
import { motion, AnimatePresence } from 'framer-motion';

export default function VerticalTimeline({
  timeline,
  onEditEvent,
  onDeleteEvent,
  onToggleTask,
  onAddEventForDate
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('Todos');
  const [showEmptyDays, setShowEmptyDays] = useState(true);
  const [groupBy, setGroupBy] = useState('dia'); // 'dia' | 'semana' | 'mes' | 'ano'

  // Default Today reference (dynamic or 2026-08-21)
  const todayDate = new Date('2026-08-21');
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // Filter events based on search query and status filter
  const filterEvents = (events) => {
    if (!events) return [];
    return events.filter((ev) => {
      const matchesSearch =
        searchQuery === '' ||
        ev.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (ev.description && ev.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.tags && ev.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase())));

      const matchesStatus =
        selectedStatusFilter === 'Todos' || ev.status === selectedStatusFilter;

      return matchesSearch && matchesStatus;
    });
  };

  const filteredEvents = filterEvents(timeline.events || []);

  // Determine earliest date in timeline
  let startDateObj = parseISO(timeline.startDate || '2026-08-01');
  if (isNaN(startDateObj.getTime())) {
    startDateObj = subDays(todayDate, 20);
  }
  if (startDateObj > todayDate) {
    startDateObj = subDays(todayDate, 14);
  }

  // Generate array of days from startDate up to todayDate (Descending)
  let daysArray = [];
  try {
    const daysAscending = eachDayOfInterval({
      start: startDateObj,
      end: todayDate
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
  // GROUPING COMPUTATIONS
  // ========================================================

  // 1. GROUP BY WEEK (Semana)
  const renderWeekView = () => {
    const weekMap = new Map();

    // Collect all weeks in interval
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

    // Populate events in weeks
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
              className={`timeline-day-row ${isCurrentWeek ? 'is-today' : ''}`}
            >
              {/* Left Column */}
              <div className="day-date-col">
                <div className="day-date-main">SEMANA {weekData.weekNum}</div>
                <div className="day-date-sub">{format(weekData.weekStart, 'yyyy')}</div>
                {isCurrentWeek && <span className="today-badge-chip pulse-glow">SEMANA ATUAL</span>}
              </div>

              {/* Central Spine Node (Bolinha) */}
              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${
                    isCurrentWeek ? 'is-today-node' : hasEvents ? 'has-events' : ''
                  }`}
                  style={hasEvents && !isCurrentWeek ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              {/* Content Column */}
              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header">
                    <div>
                      <h3 className="group-card-title">
                        Semana {weekData.weekNum} ({weekStartStr} - {weekEndStr})
                      </h3>
                    </div>
                    <span className="group-card-badge">
                      {weekData.events.length} evento(s)
                    </span>
                  </div>

                  {hasEvents ? (
                    weekData.events.map((ev) => (
                      <div key={ev.id} style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: '700', marginBottom: '4px' }}>
                          📅 {format(parseISO(ev.date), "EEEE, d 'de' MMMM", { locale: pt })}
                        </div>
                        <TimelineEventCard
                          event={ev}
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
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

  // 2. GROUP BY MONTH (Mês)
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
          const isCurrentMonth = isSameMonth(todayDate, mGroup.monthDate);
          const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: pt });
          const hasEvents = mGroup.events.length > 0;

          if (!showEmptyDays && !hasEvents && !isCurrentMonth) return null;

          return (
            <div
              key={format(mGroup.monthDate, 'yyyy-MM')}
              className={`timeline-day-row ${isCurrentMonth ? 'is-today' : ''}`}
            >
              {/* Left Column */}
              <div className="day-date-col">
                <div className="day-date-main">
                  {format(mGroup.monthDate, 'MMM', { locale: pt }).toUpperCase()}
                </div>
                <div className="day-date-sub">{format(mGroup.monthDate, 'yyyy')}</div>
                {isCurrentMonth && <span className="today-badge-chip pulse-glow">MÊS ATUAL</span>}
              </div>

              {/* Central Spine Node */}
              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${
                    isCurrentMonth ? 'is-today-node' : hasEvents ? 'has-events' : ''
                  }`}
                  style={hasEvents && !isCurrentMonth ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              {/* Content Column */}
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
                      <div key={ev.id} style={{ marginBottom: '12px' }}>
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: '700', marginBottom: '4px' }}>
                          📅 {format(parseISO(ev.date), "EEEE, d 'de' MMMM", { locale: pt })}
                        </div>
                        <TimelineEventCard
                          event={ev}
                          onEdit={onEditEvent}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
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

  // 3. GROUP BY YEAR (Ano - mostra os Meses dentro de cada Ano)
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
              className={`timeline-day-row ${isCurrentYear ? 'is-today' : ''}`}
            >
              {/* Left Column */}
              <div className="day-date-col">
                <div className="day-date-main">ANO {yGroup.yearStr}</div>
                {isCurrentYear && <span className="today-badge-chip pulse-glow">ANO ATUAL</span>}
              </div>

              {/* Central Spine Node */}
              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${
                    isCurrentYear ? 'is-today-node' : totalEventsInYear > 0 ? 'has-events' : ''
                  }`}
                  style={totalEventsInYear > 0 && !isCurrentYear ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              {/* Content Column: Displays the Months breakdown for the Year */}
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

                  {/* Render Months inside Year */}
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

  // 4. GROUP BY DAY (Dia - Default)
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
              className={`timeline-day-row ${isTodayNode ? 'is-today' : ''}`}
            >
              {/* Left Column */}
              <div className="day-date-col">
                <div className="day-date-main">
                  {dayOfWeekStr.toUpperCase()}, {dayNumStr} {monthStr}
                </div>
                <div className="day-date-sub">{format(dayDate, 'yyyy')}</div>
                {isTodayNode && (
                  <span className="today-badge-chip pulse-glow">HOJE</span>
                )}
              </div>

              {/* Central Spine Node */}
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

              {/* Content Column */}
              <div className="day-content-col">
                {hasEvents ? (
                  <AnimatePresence>
                    {dayEvents.map((ev) => (
                      <TimelineEventCard
                        key={ev.id}
                        event={ev}
                        onEdit={onEditEvent}
                        onDelete={onDeleteEvent}
                        onToggleTask={onToggleTask}
                      />
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
      {/* Toolbar / Search / Filters & Grouping Selector */}
      <div
        className="toolbar-section glass-panel"
        style={{ padding: '16px 20px', borderRadius: '14px', flexDirection: 'column', alignItems: 'stretch' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
          {/* Search Box */}
          <div className="search-box">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Pesquisar eventos, palavras-chave ou #tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Group By Selector */}
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

        {/* Second Row: Status Filter Pills and Toggle Empty Days */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '14px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)', flexWrap: 'wrap', gap: '12px' }}>
          <div className="filter-pills">
            {['Todos', 'Em Progresso', 'Concluído', 'Planeado'].map((status) => (
              <button
                key={status}
                className={`pill-btn ${selectedStatusFilter === status ? 'active' : ''}`}
                onClick={() => setSelectedStatusFilter(status)}
              >
                {status}
              </button>
            ))}
          </div>

          <div
            className="toggle-empty-days"
            onClick={() => setShowEmptyDays(!showEmptyDays)}
            title="Alternar visibilidade de intervalos sem eventos"
          >
            {showEmptyDays ? <Eye size={16} /> : <EyeOff size={16} />}
            <span>{showEmptyDays ? 'Ocultar vazios' : 'Mostrar vazios'}</span>
          </div>
        </div>
      </div>

      {/* Render Selected View Engine */}
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
    </div>
  );
}
