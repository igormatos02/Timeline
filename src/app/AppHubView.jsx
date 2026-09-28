import React from 'react';
import TimeboardsHub from '../components/dashboard-hub/TimeboardsHub.jsx';
import * as api from '../services/api';
import HubTimeboardModals from './HubTimeboardModals.jsx';

// Extracted from App.jsx (App).
export default function AppHubView({
  currentUser,
  editingTimeboard,
  handleDeleteTimeboard,
  handleLogout,
  handleSaveTimeboard,
  handleSelectTimeboardFromHub,
  handleToggleTheme,
  isTimeboardModalOpen,
  isTimeboardSettingsModalOpen,
  language,
  myTimeboards,
  setEditingTimeboard,
  setIsTimeboardModalOpen,
  setIsTimeboardSettingsModalOpen,
  setLanguage,
  sharedTimeboards,
  t,
  theme,
  timeboards
}) {
  return (
    <div className="app-container">
      <TimeboardsHub
        timeboards={timeboards}
        myTimeboards={myTimeboards}
        sharedTimeboards={sharedTimeboards}
        currentUser={currentUser}
        onSelectTimeboard={handleSelectTimeboardFromHub}
        onOpenCreateTimeboard={() => {
          setEditingTimeboard(null);
          setIsTimeboardModalOpen(true);
        }}
        onOpenEditTimeboard={async (tb) => {
          try {
            const fresh = await api.fetchTimeboard(tb.id);
            setEditingTimeboard(fresh || tb);
          } catch {
            setEditingTimeboard(tb);
          }
          setIsTimeboardSettingsModalOpen(true);
        }}
        onDeleteTimeboard={handleDeleteTimeboard}
        onLogout={handleLogout}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        language={language}
        onToggleLanguage={() => setLanguage(language === 'pt' ? 'en' : 'pt')}
        t={t}
      />

      {/* Global Modals for Timeboard management */}
      <HubTimeboardModals
        editingTimeboard={editingTimeboard}
        handleDeleteTimeboard={handleDeleteTimeboard}
        handleSaveTimeboard={handleSaveTimeboard}
        isTimeboardModalOpen={isTimeboardModalOpen}
        isTimeboardSettingsModalOpen={isTimeboardSettingsModalOpen}
        setEditingTimeboard={setEditingTimeboard}
        setIsTimeboardModalOpen={setIsTimeboardModalOpen}
        setIsTimeboardSettingsModalOpen={setIsTimeboardSettingsModalOpen}
      />
    </div>
  );
}
