import React from 'react';
import FutureHorizonButton from './FutureHorizonButton.jsx';
import { format } from 'date-fns';
import TimelineEventCard from '../TimelineEventCard';
import { Calendar, Plus } from 'lucide-react';
import PastHorizonButton from './PastHorizonButton.jsx';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function TimelineDayView({
  activeFinancialTab,
  dateLocale,
  daysArray,
  effectiveTimelines,
  eventsByDate,
  handleOpenReceipt,
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
  showEmptyDays,
  t,
  timeline,
  timelines,
  todayStr
}) {
  return (
    <div className="vertical-timeline-container">
      <div className="timeline-spine" />
      <div
        className="timeline-spine-gradient"
        style={{ background: `linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` }}
      />

      {/* Botão Carregar Mais Futuro */}
      <FutureHorizonButton onLoadMoreFuture={onLoadMoreFuture} t={t} />

      {daysArray.map((dayDate) => {
        const dateKey = format(dayDate, 'yyyy-MM-dd');
        const isTodayNode = dateKey === todayStr;
        const dayEvents = eventsByDate[dateKey] || [];
        const hasEvents = dayEvents.length > 0;

        if (!showEmptyDays && !hasEvents && !isTodayNode) {
          return null;
        }

        const dayOfWeekStr = format(dayDate, 'EEE', { locale: dateLocale });
        const dayNumStr = format(dayDate, 'dd');
        const monthStr = format(dayDate, 'MMM', { locale: dateLocale });

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
                <span className="today-badge-chip pulse-glow">{t('timeline.today').toUpperCase()}</span>
              )}
            </div>

            <div className="day-node-wrapper">
              <div
                className={`day-node-dot ${isTodayNode ? 'is-today-node' : hasEvents ? 'has-events' : ''
                  }`}
                onClick={() => onAddEventForDate?.(dateKey)}
                title={
                  hasEvents
                    ? `${t('timeline.eventsCount', { count: dayEvents.length })}`
                    : t('timeline.noEventsDay')
                }
                style={hasEvents && !isTodayNode ? { backgroundColor: paletteTheme.primary } : {}}
              />
            </div>

            <div className="day-content-col">
              {hasEvents ? (
                <TimelineEventCard
                  events={dayEvents}
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
                />
              ) : (
                <div
                  className="empty-day-row"
                  onClick={() => onAddEventForDate?.(dateKey)}
                >
                  <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                  <span className="empty-day-text">{t('timeline.noEventsDay')}</span>
                  <span className="add-event-mini-btn">
                    <Plus size={12} /> {t('buttons.add')}
                  </span>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Botão Carregar Mais Passado */}
      <PastHorizonButton onLoadMorePast={onLoadMorePast} t={t} />
    </div>
  );
  }
