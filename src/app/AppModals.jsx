import React from 'react';
import { Suspense } from 'react';
import { AccountOutflowModal, AmortizationModal, CreateEventModal, CreatePocketModal, CreateTimeboardModal, CreateTimelineModal, DeleteEventModal, DeletePocketModal, DeleteTimelineModal, EditInstallmentModal, EditTimelineSettingsModal, TimeboardSettingsModal } from './lazyModals.js';

// Extracted from App.jsx (App).
export default function AppModals({
  activeFinancialTab,
  activeTimeboard,
  activeTimeboardId,
  activeTimeboardTimelines,
  activeTimeline,
  amortizationDefaultDate,
  createTimelineInitialType,
  deletingEvent,
  deletingPocket,
  deletingTimeline,
  editingAmortization,
  editingEvent,
  editingInstallment,
  editingTimeboard,
  editingTimeline,
  editingWithdrawal,
  eventModalDefaultNature,
  handleConfirmDeleteEvent,
  handleConfirmDeletePocket,
  handleConfirmDeleteTimeline,
  handleDeleteTimeboard,
  handleRequestDeleteTimeline,
  handleSaveAmortization,
  handleSaveEditInstallment,
  handleSaveEvent,
  handleSavePocket,
  handleSaveTimeboard,
  handleSaveTimeline,
  isAmortizationModalOpen,
  isEventModalOpen,
  isPocketModalOpen,
  isTimeboardModalOpen,
  isTimeboardSettingsModalOpen,
  isTimelineModalOpen,
  isTimelineSettingsModalOpen,
  isWithdrawalModalOpen,
  loanMetrics,
  pockets,
  rawEvents,
  reloadPersons,
  selectedDateForNewEvent,
  selectedPocketForEdit,
  setDeletingEvent,
  setDeletingPocket,
  setDeletingTimeline,
  setEditingAmortization,
  setEditingInstallment,
  setEditingTimeboard,
  setEditingWithdrawal,
  setIsAmortizationModalOpen,
  setIsEventModalOpen,
  setIsPocketModalOpen,
  setIsResetConfirmOpen,
  setIsTimeboardModalOpen,
  setIsTimeboardSettingsModalOpen,
  setIsTimelineModalOpen,
  setIsTimelineSettingsModalOpen,
  setIsWithdrawalModalOpen,
  setSelectedPocketForEdit,
  setTimeboardPersons,
  setWithdrawalDefaultPocketId,
  timeboards,
  timelines,
  withdrawalDefaultDate,
  withdrawalDefaultPocketId
}) {
  return (
    <Suspense fallback={null}>
      <CreateTimeboardModal
        isOpen={isTimeboardModalOpen}
        onClose={() => setIsTimeboardModalOpen(false)}
        onSave={handleSaveTimeboard}
        onDelete={handleDeleteTimeboard}
        initialData={null}
      />

      <TimeboardSettingsModal
        isOpen={isTimeboardSettingsModalOpen}
        onClose={() => {
          setIsTimeboardSettingsModalOpen(false);
          setEditingTimeboard(null);
          reloadPersons();
        }}
        timeboard={timeboards.find((t) => t.id === (editingTimeboard?.id || activeTimeboardId)) || editingTimeboard || activeTimeboard}
        onSaveTimeboard={handleSaveTimeboard}
        onDeleteTimeboard={handleDeleteTimeboard}
        timelines={activeTimeboardTimelines}
        events={rawEvents}
        pockets={pockets}
        onEntitySaved={(savedEntity) => {
          if (!savedEntity || !savedEntity.id) return;
          setTimeboardPersons((prev) => {
            const exists = prev.some((p) => p.id === savedEntity.id);
            if (exists) {
              return prev.map((p) => (p.id === savedEntity.id ? { ...p, ...savedEntity } : p));
            }
            return [...prev, savedEntity];
          });
        }}
      />

      <CreateTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        onSave={handleSaveTimeline}
        initialData={editingTimeline}
        initialType={createTimelineInitialType}
        existingTimelines={activeTimeboardTimelines}
      />

      <EditTimelineSettingsModal
        isOpen={isTimelineSettingsModalOpen}
        onClose={() => setIsTimelineSettingsModalOpen(false)}
        onSave={handleSaveTimeline}
        onDelete={handleRequestDeleteTimeline}
        onReset={() => {
          setIsTimelineSettingsModalOpen(false);
          setIsResetConfirmOpen(true);
        }}
        initialData={editingTimeline}
      />

      <CreateEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        initialData={editingEvent}
        pockets={pockets}
        defaultDate={selectedDateForNewEvent}
        timeline={activeTimeline}
        timeboardId={activeTimeboardId}
        allTimelines={timelines}
        events={activeTimeline?.events || rawEvents || []}
        allEvents={rawEvents || activeTimeline?.events || []}
        defaultNature={eventModalDefaultNature}
        activeFinancialTab={activeFinancialTab}
      />

      {/* Loan Modals */}
      <AmortizationModal
        isOpen={isAmortizationModalOpen}
        onClose={() => {
          setIsAmortizationModalOpen(false);
          setEditingAmortization(null);
        }}
        onSave={handleSaveAmortization}
        initialEvent={editingAmortization}
        defaultDate={amortizationDefaultDate}
        remainingBalance={loanMetrics ? loanMetrics.remainingBalance : undefined}
      />

      {/* Account outflow modal: withdrawal, expense paid by the account, transfer between spaces */}
      <AccountOutflowModal
        isOpen={isWithdrawalModalOpen}
        onClose={() => {
          setIsWithdrawalModalOpen(false);
          setEditingWithdrawal(null);
          setWithdrawalDefaultPocketId(null);
        }}
        onSave={(payload) => handleSaveEvent(payload, editingWithdrawal)}
        initialData={editingWithdrawal}
        defaultDate={withdrawalDefaultDate}
        defaultPocketId={withdrawalDefaultPocketId}
        pockets={pockets}
        timeline={activeTimeline}
        events={activeTimeline?.events || rawEvents || []}
      />

      <EditInstallmentModal
        isOpen={Boolean(editingInstallment)}
        onClose={() => setEditingInstallment(null)}
        installment={editingInstallment}
        onSave={handleSaveEditInstallment}
      />

      {/* Delete Event Confirmation Modal */}
      <DeleteEventModal
        isOpen={Boolean(deletingEvent)}
        onClose={() => setDeletingEvent(null)}
        event={deletingEvent}
        events={activeTimeline?.events || rawEvents || []}
        onConfirmDelete={handleConfirmDeleteEvent}
      />

      {/* Delete Timeline Confirmation Modal */}
      <DeleteTimelineModal
        isOpen={Boolean(deletingTimeline)}
        onClose={() => setDeletingTimeline(null)}
        timeline={deletingTimeline}
        onConfirmDelete={handleConfirmDeleteTimeline}
      />

      {/* Pocket Modal */}
      {isPocketModalOpen && (
        <CreatePocketModal
          isOpen={isPocketModalOpen}
          onClose={() => {
            setIsPocketModalOpen(false);
            setSelectedPocketForEdit(null);
          }}
          onSave={handleSavePocket}
          initialData={selectedPocketForEdit}
          timeline={activeTimeline}
          timeboardId={activeTimeboardId}
        />
      )}

      {/* Delete Pocket Confirmation Modal */}
      {deletingPocket && (
        <DeletePocketModal
          isOpen={Boolean(deletingPocket)}
          onClose={() => setDeletingPocket(null)}
          pocket={deletingPocket}
          timeline={activeTimeline}
          allEvents={rawEvents}
          onConfirmDelete={handleConfirmDeletePocket}
        />
      )}
    </Suspense>
  );
}
