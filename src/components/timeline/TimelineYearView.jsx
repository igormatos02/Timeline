import React from 'react';
import { groupEventsByDate } from '../../utils/eventSorting.js';
import { format } from 'date-fns';
import FutureHorizonButton from './FutureHorizonButton.jsx';
import { Calendar, Plus, Sparkles } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';
import TimelineEventCard from '../TimelineEventCard';
import PastHorizonButton from './PastHorizonButton.jsx';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function TimelineYearView({
  monthsList,
  activeFinancialTab,
  dateLocale,
  dayComparator,
  effectiveTimelines,
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
  todayDate
}) {
  const yearMap = new Map();

  monthsList.forEach((mEntry) => {
    const yearKey = format(mEntry.monthDate, 'yyyy');
    if (!yearMap.has(yearKey)) {
      yearMap.set(yearKey, {
        yearStr: yearKey,
        monthsMap: new Map()
      });
    }

    const yearEntry = yearMap.get(yearKey);
    const monthKey = format(mEntry.monthDate, 'yyyy-MM');
    yearEntry.monthsMap.set(monthKey, {
      monthDate: mEntry.monthDate,
      events: mEntry.events
    });
  });

  const yearsList = Array.from(yearMap.values());

  return (
    <div className="vertical-timeline-container">
      <div className="timeline-spine" />
      <div
        className="timeline-spine-gradient"
        style={{ background: `linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` }}
      />

      {/* Botão Carregar Mais Futuro */}
      <FutureHorizonButton onLoadMoreFuture={onLoadMoreFuture} t={t} />

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
              <div className="day-date-main">{t('timeline.yearLabel', { year: yGroup.yearStr })}</div>
              {isCurrentYear && <span className="today-badge-chip pulse-glow">{t('timeline.currentYear')}</span>}
            </div>

            <div className="day-node-wrapper">
              <div
                className={`day-node-dot ${isCurrentYear ? 'is-today-node' : totalEventsInYear > 0 ? 'has-events' : ''
                  }`}
                style={totalEventsInYear > 0 && !isCurrentYear ? { backgroundColor: paletteTheme.primary } : {}}
              />
            </div>

            <div className="day-content-col">
              <div className="group-card">
                <div className="group-card-header">
                  <h3 className="group-card-title">
                    <Sparkles size={18} style={{ color: 'var(--primary-light)' }} /> {t('timeline.currentYearTitle', { year: yGroup.yearStr })}
                  </h3>
                  <span className="group-card-badge">
                    {t('timeline.monthsCount', { count: monthsList.length })} • {t('timeline.eventsCount', { count: totalEventsInYear })}
                  </span>
                </div>

                {monthsList.map((mGroup) => {
                  const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: dateLocale });
                  const hasEvents = mGroup.events.length > 0;

                  if (!showEmptyDays && !hasEvents) return null;

                  return (
                    <div key={format(mGroup.monthDate, 'yyyy-MM')} className="year-month-box">
                      <div className="year-month-header">
                        <h4 className="year-month-title" style={{ textTransform: 'capitalize' }}>
                          🗓️ {monthTitleStr}
                        </h4>
                        <span className="event-tag" style={{ background: `${TimelineColor.PRIMARY}33`, color: 'var(--primary-light)' }}>
                          {t('timeline.eventsCount', { count: mGroup.events.length })}
                        </span>
                      </div>

                      {hasEvents ? (
                        groupEventsByDate(mGroup.events, dayComparator).map((dateGroup, gIdx) => (
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
                            />
                          </div>
                        ))
                      ) : (
                        <div
                          className="empty-day-row"
                          onClick={() => onAddEventForDate?.(format(mGroup.monthDate, 'yyyy-MM-01'))}
                        >
                          <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                          <span className="empty-day-text">{t('timeline.noEventsMonth')}</span>
                          <span className="add-event-mini-btn">
                            <Plus size={12} /> {t('buttons.add')}
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

      {/* Botão Carregar Mais Passado */}
      <PastHorizonButton onLoadMorePast={onLoadMorePast} t={t} />
    </div>
  );
  }
