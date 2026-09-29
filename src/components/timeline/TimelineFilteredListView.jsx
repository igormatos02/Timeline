import React from 'react';
import { groupEventsByDate } from '../../utils/eventSorting.js';
import { Filter } from 'lucide-react';
import { TimelineColor } from '../../enums/index.js';
import AddEventButton from './AddEventButton.jsx';
import TimelineEventCard from '../TimelineEventCard';

// Extracted from VerticalTimeline.jsx (VerticalTimeline): receives every value it uses as a prop.
export default function TimelineFilteredListView({
  activeFinancialTab,
  activeTimeboard,
  dayComparator,
  effectiveTimelines,
  filteredEvents,
  handleOpenReceipt,
  isBalancoView,
  balanceMode,
  isFinancialTimeline,
  isLoanTimelineOrTab,
  isReminders,
  onAddChecklistItem,
  onAddEventForDate,
  onDeleteChecklistItem,
  onDeleteEvent,
  onEditEvent,
  onNavigateToTimeline,
  onOpenCreatePocket,
  onOpenEditInstallment,
  onPayUpToHere,
  onToggleLoanPayment,
  onToggleTask,
  onUpdateEventDirect,
  paletteTheme,
  resetAllFilters,
  sharedNoticeToggles,
  t,
  timeline,
  timelines,
  todayStr
}) {
  const sortedEvents = [...filteredEvents].sort((a, b) => {
    const dateA = a.date || a.dueDate || '';
    const dateB = b.date || b.dueDate || '';
    return dateB.localeCompare(dateA);
  });

  const grouped = groupEventsByDate(sortedEvents, dayComparator);

  return (
    <div className="filtered-events-stack-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '4px 0 24px 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px 12px 4px', borderBottom: '1px solid var(--border-glass)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)' }}>
          <Filter size={15} style={{ color: 'var(--primary-light)' }} />
          <span>{t('timeline.eventsCount', { count: filteredEvents.length })}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {/* Switches for the shared reminders / diary posts (individual view) */}
          {sharedNoticeToggles.map((item) => (
            <button
              key={item.type}
              type="button"
              className="btn btn-sm"
              aria-pressed={item.isOn}
              onClick={item.toggle}
              title={item.label}
              style={{
                fontSize: '0.74rem',
                padding: '4px 10px',
                border: `1px solid ${item.color}`,
                background: item.isOn ? item.color : 'transparent',
                color: item.isOn ? TimelineColor.WHITE : item.color,
                opacity: item.isOn ? 1 : 0.75
              }}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={resetAllFilters}
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
          >
            {t('status.all')}
          </button>
          <AddEventButton
            targetDayStr={todayStr}
            title={t('timeline.addEventToday')}
            activeFinancialTab={activeFinancialTab}
            activeTimeboard={activeTimeboard}
            isBalancoView={isBalancoView}
                        balanceMode={balanceMode}
            isFinancialTimeline={isFinancialTimeline}
            isLoanTimelineOrTab={isLoanTimelineOrTab}
            isReminders={isReminders}
            onAddEventForDate={onAddEventForDate}
            onOpenCreatePocket={onOpenCreatePocket}
            paletteTheme={paletteTheme}
            t={t}
            timeline={timeline}
          />
        </div>
      </div>

      {filteredEvents.length === 0 ? (
        <div style={{ padding: '48px 20px', textAlign: 'center', background: 'transparent', border: 'none' }}>
          <div className="empty-icon">
            <Filter size={28} />
          </div>
          <h3>{t('timeline.noEventsFoundUpToCurrentMonth')}</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
            {t('timeline.noEventsFoundAdjustFiltersDesc')}
          </p>
        </div>
      ) : (
        grouped.map((dateGroup, gIdx) => (
          <div key={`${dateGroup.date}_${gIdx}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <TimelineEventCard
            events={dateGroup.events}
            timelineColor={timeline.color}
            allEvents={timeline.events || []}
            timelines={effectiveTimelines || timelines}
            currentTimelineId={timeline.id}
            timelineType={timeline.type}
            activeFinancialTab={activeFinancialTab}
            showYear={true}
            onEdit={onEditEvent}
            onUpdateEventDirect={onUpdateEventDirect}
            onDelete={onDeleteEvent}
            onToggleTask={onToggleTask}
            onAddChecklistItem={onAddChecklistItem}
            onDeleteChecklistItem={onDeleteChecklistItem}
            onToggleLoanPayment={onToggleLoanPayment}
            onPayUpToHere={onPayUpToHere}
            onOpenEditInstallment={onOpenEditInstallment}
            onNavigateToTimeline={onNavigateToTimeline}
            onPrintReceipt={handleOpenReceipt}
          />
        </div>
      ))
    )}
    </div>
  );
  }
