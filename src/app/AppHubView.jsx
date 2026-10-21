import React, { useState } from 'react';
import TimeboardsHub from '../components/dashboard-hub/TimeboardsHub.jsx';
import * as api from '../services/api';
import HubTimeboardModals from './HubTimeboardModals.jsx';
import CondoSetupWizard from '../components/dashboard-hub/CondoSetupWizard.jsx';
import { ProductId } from '../../shared/config/products.js';

// Extracted from App.jsx (App).
export default function AppHubView({
  product,
  onNavigateHome,
  onOpenPlans,
  onCondominiumCreated,
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
  // Settings tab to open (the hub's first steps open the entities tab)
  const [settingsTab, setSettingsTab] = useState(undefined);
  // CondoFlow: a new condominium is created through the setup wizard
  const [isCondoWizardOpen, setIsCondoWizardOpen] = useState(false);
  const isCondoflow = product?.id === ProductId.CONDOFLOW;
  return (
    <div className="app-container">
      <TimeboardsHub
        product={product}
        onNavigateHome={onNavigateHome}
        onOpenPlans={onOpenPlans}
        timeboards={timeboards}
        myTimeboards={myTimeboards}
        sharedTimeboards={sharedTimeboards}
        currentUser={currentUser}
        onSelectTimeboard={handleSelectTimeboardFromHub}
        onOpenCreateTimeboard={() => {
          if (isCondoflow) {
            setIsCondoWizardOpen(true);
            return;
          }
          setEditingTimeboard(null);
          setIsTimeboardModalOpen(true);
        }}
        onOpenEditTimeboard={async (tb, tab) => {
          setSettingsTab(tab);
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
        statusRefreshKey={isTimeboardSettingsModalOpen}
      />

      <CondoSetupWizard
        isOpen={isCondoWizardOpen}
        onClose={() => setIsCondoWizardOpen(false)}
        onCreated={(created, warning) => {
          setIsCondoWizardOpen(false);
          onCondominiumCreated?.(created, warning);
        }}
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
        settingsInitialTab={settingsTab}
        createType={product?.timeboardType}
      />
    </div>
  );
}
