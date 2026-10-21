import React from 'react';
import { Suspense } from 'react';
import { CreateTimeboardModal, TimeboardSettingsModal } from './lazyModals.js';

// Extracted from App.jsx (App).
export default function HubTimeboardModals({
  editingTimeboard,
  handleDeleteTimeboard,
  handleSaveTimeboard,
  isTimeboardModalOpen,
  isTimeboardSettingsModalOpen,
  setEditingTimeboard,
  setIsTimeboardModalOpen,
  setIsTimeboardSettingsModalOpen,
  settingsInitialTab
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
        }}
        timeboard={editingTimeboard}
        initialTab={settingsInitialTab}
        onSaveTimeboard={handleSaveTimeboard}
        onDeleteTimeboard={handleDeleteTimeboard}
      />
    </Suspense>
  );
}
