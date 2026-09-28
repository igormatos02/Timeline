import React from 'react';
import { groupEventsByDate } from '../../utils/eventSorting.js';
import { endOfWeek, format, getWeek, isSameWeek, parseISO, startOfWeek } from 'date-fns';
import FutureHorizonButton from './FutureHorizonButton.jsx';
import TimelineEventCard from '../TimelineEventCard';
import { Calendar, Plus } from 'lucide-react';
import PastHorizonButton from './PastHorizonButton.jsx';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function TimelineWeekView({
  activeFinancialTab,
  dateLocale,
  dayComparator,
  effectiveTimelines,
  filteredEvents,
  handleOpenReceipt,
  language,
  onAddEventForDate,
  onDeleteEvent,
  onEditEvent,
  onLoadMoreFuture,
  onLoadMorePast,
  onNavigateToTimeline,
  onOpenEditInstallment,
  onPayUpToHere,
  onToggleLoanPayment,
  onToggleTask,
  onUpdateEventDirect,
  paletteTheme,
  persons,
  showEmptyDays,
  t,
  timeline,
  timelines,
  todayDate
}) {
  const weekMap = new Map();

  // Map events directly into their corresponding weeks
  filteredEvents.forEach((ev) => {
    if (!ev || !ev.date) return;
    try {
      const evDate = parseISO(ev.date);
      const weekStart = startOfWeek(evDate, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');
      if (!weekMap.has(weekKey)) {
        const weekEnd = endOfWeek(evDate, { weekStartsOn: 1 });
        weekMap.set(weekKey, {
          weekStart,
          weekEnd,
          weekNum: getWeek(weekStart),
          events: []
        });
      }
      weekMap.get(weekKey).events.push(ev);
    } catch (e) { }
  });

  // Ensure current week is present
  const currentWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
  const currentWeekKey = format(currentWeekStart, 'yyyy-MM-dd');
  if (!weekMap.has(currentWeekKey)) {
    weekMap.set(currentWeekKey, {
      weekStart: currentWeekStart,
      weekEnd: endOfWeek(todayDate, { weekStartsOn: 1 }),
      weekNum: getWeek(currentWeekStart),
      events: []
    });
  }

  const weeksList = Array.from(weekMap.values()).sort(
    (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
  );

  return (
    <div className="vertical-timeline-container">
      <div className="timeline-spine" />
      <div
        className="timeline-spine-gradient"
        style={{ background: `linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` }}
      />

      {/* Botão Carregar Mais Futuro */}
      <FutureHorizonButton onLoadMoreFuture={onLoadMoreFuture} t={t} />

      {weeksList.map((weekData) => {
        const isCurrentWeek = isSameWeek(todayDate, weekData.weekStart, { weekStartsOn: 1 });
        const weekStartStr = format(weekData.weekStart, language === 'en' ? 'MMM d' : "d 'de' MMM", { locale: dateLocale });
        const weekEndStr = format(weekData.weekEnd, language === 'en' ? 'MMM d, yyyy' : "d 'de' MMM, yyyy", { locale: dateLocale });
        const hasEvents = weekData.events.length > 0;

        if (!showEmptyDays && !hasEvents && !isCurrentWeek) return null;

        return (
          <div
            key={format(weekData.weekStart, 'yyyy-MM-dd')}
            id={isCurrentWeek ? 'timeline-node-today' : undefined}
            className={`timeline-day-row ${isCurrentWeek ? 'is-today' : ''}`}
          >
            <div className="day-date-col">
              <div className="day-date-main">{t('timeline.weekLabel', { week: weekData.weekNum })}</div>
              <div className="day-date-sub">{format(weekData.weekStart, 'yyyy')}</div>
              {isCurrentWeek && <span className="today-badge-chip pulse-glow">{t('timeline.currentWeek')}</span>}
            </div>

            <div className="day-node-wrapper">
              <div
                className={`day-node-dot ${isCurrentWeek ? 'is-today-node' : hasEvents ? 'has-events' : ''
                  }`}
                style={hasEvents && !isCurrentWeek ? { backgroundColor: paletteTheme.primary } : {}}
              />
            </div>

            <div className="day-content-col">
              <div className="group-card">
                <div className="group-card-header">
                  <h3 className="group-card-title">
                    {t('timeline.weekTitle', { week: weekData.weekNum })} ({weekStartStr} - {weekEndStr})
                  </h3>
                  <span className="group-card-badge">
                    {t('timeline.eventsCount', { count: weekData.events.length })}
                  </span>
                </div>

                {hasEvents ? (
                  groupEventsByDate(weekData.events, dayComparator).map((dateGroup, gIdx) => (
                    <div
                      key={`${dateGroup.date}_${gIdx}`}
                      style={{ marginBottom: '8px' }}
                    >
                      <TimelineEventCard
                        events={dateGroup.events}
                        timelineColor={timeline.color}
                        allEvents={timeline.events || []}
                        timelines={effectiveTimelines || timelines}
                        currentTimelineId={timeline.id}
                        timelineType={timeline.type}
                        activeFinancialTab={activeFinancialTab}
                        onEdit={onEditEvent}
                        onUpdateEventDirect={onUpdateEventDirect}
                        onDelete={onDeleteEvent}
                        onToggleTask={onToggleTask}
                        onToggleLoanPayment={onToggleLoanPayment}
                        onPayUpToHere={onPayUpToHere}
                        onOpenEditInstallment={onOpenEditInstallment}
                        onNavigateToTimeline={onNavigateToTimeline}
                        onPrintReceipt={handleOpenReceipt}
                        persons={persons}
                      />
                    </div>
                  ))
                ) : (
                  <div
                    className="empty-day-row"
                    onClick={() => onAddEventForDate?.(format(weekData.weekStart, 'yyyy-MM-dd'))}
                  >
                    <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                    <span className="empty-day-text">{t('timeline.noEventsWeek')}</span>
                    <span className="add-event-mini-btn">
                      <Plus size={12} /> {t('buttons.add')}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Botão Carregar Mais Passado */}
      <PastHorizonButton onLoadMorePast={onLoadMorePast} t={t} />
    </div>
  );
  }
