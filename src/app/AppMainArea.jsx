import React from 'react';
import { usePermissions } from '../context/PermissionsContext.jsx';
import VerticalTimeline from '../components/VerticalTimeline';
import TimelineHeader from '../components/TimelineHeader';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';

// Extracted from App.jsx (App).
export default function AppMainArea({
  timeboards = [],
  activeTimeboardId,
  onSelectTimeboard,
  onOpenEditTimeboard,
  onOpenCreateTimeboard,
  onNavigateToHub,
  activeFinancialTab,
  activeTimeboard,
  activeTimeboardTimelines,
  activeTimeline,
  currentUser,
  displayEvents,
  futureHorizonYears,
  handleAddChecklistItem,
  handleAddEventForDate,
  handleAddFloatingTask,
  handleCompleteFloatingTask,
  handleCorrectEvent,
  handleDeleteChecklistItem,
  handleLoadMoreFuture,
  handleLoadMorePast,
  handleNavigateToTimeline,
  handleOpenAmortizationModal,
  handleOpenCreateEvent,
  handleOpenCreatePocket,
  handleOpenCreateTimeline,
  handleOpenEditEvent,
  handleOpenEditInstallment,
  handleOpenEditTimeline,
  handleOpenWithdrawalModal,
  handlePatchEventLocal,
  handlePayUpToHere,
  handleRequestDeleteEvent,
  handleRequestDeletePocket,
  handleRequestDeleteTimeline,
  handleSaveComputeStartDate,
  handleScrollToOverdue,
  handleToggleLoanPayment,
  handleToggleTask,
  handleToggleTimelineStatus,
  handleUpdateEventDirect,
  handleUpdateFloatingTaskPriority,
  individualEntityId,
  isIndividualRole,
  isIndividualView,
  isLoadingSystem,
  pastHorizonYears,
  pockets,
  setActiveFinancialTab,
  setActiveTimelineId,
  setIsIndividualView,
  t,
  timeboardPersons,
  timeboardSummary,
  timelines,
  visibleTimelines
}) {
  // Buttons follow the role on the timeboard (shared/permissions.js): missing handlers hide them
  const { canEdit, canManage } = usePermissions();
  const manage = (handler) => (canManage ? handler : undefined);
  const edit = (handler) => (canEdit ? handler : undefined);

  return (
    <main className="main-layout">
      {timelines.length > 0 && activeTimeline ? (
        <VerticalTimeline
          timeboards={timeboards}
          activeTimeboardId={activeTimeboardId}
          onSelectTimeboard={onSelectTimeboard}
          onOpenEditTimeboard={onOpenEditTimeboard}
          onOpenCreateTimeboard={onOpenCreateTimeboard}
          onNavigateToHub={onNavigateToHub}
          timeline={activeTimeline}
          lockedEntityId={individualEntityId}
          timelines={visibleTimelines}
          activeTimeboard={activeTimeboard}
          currentUser={currentUser}
          activeFinancialTab={activeFinancialTab}
          pockets={pockets}
          persons={timeboardPersons}
          onOpenCreatePocket={handleOpenCreatePocket}
          onEditPocket={handleOpenCreatePocket}
          onDeletePocket={handleRequestDeletePocket}
          onSelectFinancialTab={(tabKey) => {
            setActiveFinancialTab(tabKey);
            setActiveTimelineId(tabKey);
          }}
          onCreateTimeline={handleOpenCreateTimeline}
          futureHorizonYears={futureHorizonYears}
          pastHorizonYears={pastHorizonYears}
          onLoadMoreFuture={handleLoadMoreFuture}
          onLoadMorePast={handleLoadMorePast}
          onEditEvent={handleOpenEditEvent}
          onCorrectEvent={handleCorrectEvent}
          onUpdateEventDirect={handleUpdateEventDirect}
          onDeleteEvent={handleRequestDeleteEvent}
          onToggleTask={handleToggleTask}
          onAddEventForDate={handleAddEventForDate}
          onCompleteFloatingTask={handleCompleteFloatingTask}
          onAddFloatingTask={handleAddFloatingTask}
          onUpdateFloatingTaskPriority={handleUpdateFloatingTaskPriority}
          onAddChecklistItem={handleAddChecklistItem}
          onDeleteChecklistItem={handleDeleteChecklistItem}
          onToggleLoanPayment={handleToggleLoanPayment}
          onPayUpToHere={handlePayUpToHere}
          onOpenEditInstallment={handleOpenEditInstallment}
          onOpenAmortizationModal={handleOpenAmortizationModal}
          onOpenWithdrawModal={handleOpenWithdrawalModal}
          onNavigateToTimeline={handleNavigateToTimeline}
          onPatchEventLocal={handlePatchEventLocal}
          headerComponent={
            <TimelineHeader
              timeboard={activeTimeboard}
              timeline={activeTimeline}
              allTimelines={activeTimeboardTimelines}
              events={activeTimeline?.events || displayEvents}
              allEvents={displayEvents}
              activeFinancialTab={activeFinancialTab}
              pockets={pockets}
              onOpenCreatePocket={manage(handleOpenCreatePocket)}
              onEditPocket={manage(handleOpenCreatePocket)}
              onDeletePocket={manage(handleRequestDeletePocket)}
              onSelectFinancialTab={setActiveFinancialTab}
              onEdit={manage(handleOpenEditTimeline)}
              onToggleStatus={manage(handleToggleTimelineStatus)}
              onDelete={manage(handleRequestDeleteTimeline)}
              onOpenCreateTimeline={manage(handleOpenCreateTimeline)}
              onOpenAmortizationModal={edit(() => handleOpenAmortizationModal())}
              onScrollToOverdue={handleScrollToOverdue}
              onSaveComputeStartDate={manage(handleSaveComputeStartDate)}
              isIndividualView={isIndividualView}
              onToggleIndividualView={setIsIndividualView}
              isIndividualRole={isIndividualRole}
              timeboardSummary={timeboardSummary}
              onAddEvent={edit((opts) => {
                if (opts && typeof opts === 'object' && !opts.nativeEvent) {
                  const presetDate = opts.date || format(new Date(), 'yyyy-MM-dd');
                  const nature = opts.nature || (activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income');
                  handleOpenCreateEvent(presetDate, nature, opts);
                } else {
                  handleOpenCreateEvent(format(new Date(), 'yyyy-MM-dd'), activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income');
                }
              })}
            />
          }
        />
      ) : isLoadingSystem ? null : (
        <div className="empty-timeline-state glass-panel" style={{ marginTop: '40px', textAlign: 'center' }}>
          <h2>{activeTimeboard ? activeTimeboard.name : t('timeline.noTimeboards')}</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
            {t('timeline.noTimelines')}
          </p>
          {activeTimeboard && canManage && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              style={{ marginTop: '16px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              onClick={handleOpenCreateTimeline}
            >
              <Plus size={16} />
              <span>{t('timeline.createTimeline')}</span>
            </button>
          )}
        </div>
      )}
    </main>
  );
}
