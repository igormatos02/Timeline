import React, { useState } from 'react';
import { format, parseISO, eachDayOfInterval, isSameDay, isToday, subDays } from 'date-fns';
import { pt } from 'date-fns/locale';
import { Plus, Search, Filter, Calendar, Eye, EyeOff } from 'lucide-react';
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

  // Default Today reference (dynamic or 2026-08-21)
  const todayDate = new Date('2026-08-21');
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // Determine earliest date in timeline to render days down to
  let startDateObj = parseISO(timeline.startDate || '2026-08-01');
  if (isNaN(startDateObj.getTime())) {
    startDateObj = subDays(todayDate, 20);
  }

  // Ensure start date is not in future relative to today
  if (startDateObj > todayDate) {
    startDateObj = subDays(todayDate, 14);
  }

  // Generate array of days from startDate up to todayDate
  let daysArray = [];
  try {
    const daysAscending = eachDayOfInterval({
      start: startDateObj,
      end: todayDate
    });
    // Order DESCENDING so TODAY is at top (index 0)
    daysArray = daysAscending.reverse();
  } catch (err) {
    daysArray = [todayDate];
  }

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

  // Map events to date key (YYYY-MM-DD)
  const eventsByDate = {};
  filteredEvents.forEach((ev) => {
    if (!eventsByDate[ev.date]) {
      eventsByDate[ev.date] = [];
    }
    eventsByDate[ev.date].push(ev);
  });

  return (
    <div className="vertical-timeline-section">
      {/* Toolbar / Search / Filters */}
      <div className="toolbar-section glass-panel" style={{ padding: '16px 20px', borderRadius: '14px' }}>
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
          title="Alternar visibilidade dos dias sem eventos"
        >
          {showEmptyDays ? <Eye size={16} /> : <EyeOff size={16} />}
          <span>{showEmptyDays ? 'Ocultar dias vazios' : 'Mostrar dias vazios'}</span>
        </div>
      </div>

      {/* Vertical Timeline Engine */}
      <div className="vertical-timeline-container">
        {/* Spine Line */}
        <div className="timeline-spine" />
        <div className="timeline-spine-gradient" style={{ background: timeline.color || 'var(--timeline-line-active)' }} />

        {daysArray.map((dayDate) => {
          const dateKey = format(dayDate, 'yyyy-MM-dd');
          const isTodayNode = dateKey === todayStr;
          const dayEvents = eventsByDate[dateKey] || [];
          const hasEvents = dayEvents.length > 0;

          // If hiding empty days, skip rendering days without events unless it's Today
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
              {/* Left Column: Date Label */}
              <div className="day-date-col">
                <div className="day-date-main">
                  {dayOfWeekStr.toUpperCase()}, {dayNumStr} {monthStr}
                </div>
                <div className="day-date-sub">{format(dayDate, 'yyyy')}</div>
                {isTodayNode && (
                  <span className="today-badge-chip pulse-glow">HOJE</span>
                )}
              </div>

              {/* Central Spine Node (Bolinha) */}
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

              {/* Right Column: Events or Empty Day Button */}
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
    </div>
  );
}
