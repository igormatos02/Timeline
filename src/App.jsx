import React, { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import Navbar from './components/Navbar';
import { PermissionsProvider } from './context/PermissionsContext.jsx';
import { TimeboardProvider } from './context/TimeboardContext.jsx';
import { HeaderRefreshProvider } from './context/HeaderRefreshContext.jsx';

// Heavy modals are lazy-loaded so they do not bloat the initial bundle
import {
  getLoanMetrics
} from './utils/loanCalculations';
import * as api from './services/api';
import { TimelineType, isLoanTimelineType } from './enums/index.js';
import { useToast } from './context/ToastContext.jsx';
import { useTranslation } from './i18n/LanguageContext.jsx';
import LandingPage from './components/landing/LandingPage.jsx';
import useAuth from './hooks/useAuth.js';
import './App.css';
import { useTimeboardActions } from './app/hooks/useTimeboardActions.js';
import { useEventStatusActions } from './app/hooks/useEventStatusActions.js';
import { useTaskActions } from './app/hooks/useTaskActions.js';
import { useEventCrudActions } from './app/hooks/useEventCrudActions.js';
import { usePocketActions } from './app/hooks/usePocketActions.js';
import { useTimelineActions } from './app/hooks/useTimelineActions.js';
import { useBoardTimelineData } from './app/hooks/useBoardTimelineData.js';
import AppFloatingControls from './app/AppFloatingControls.jsx';
import InstallmentsUpdatingOverlay from './app/InstallmentsUpdatingOverlay.jsx';
import SystemLoadingOverlay from './app/SystemLoadingOverlay.jsx';
import ResetTimelineConfirmModal from './app/ResetTimelineConfirmModal.jsx';
import AppModals from './app/AppModals.jsx';
import AppMainArea from './app/AppMainArea.jsx';
import { useAppPersistence } from './app/hooks/useAppPersistence.js';
import { useTheme } from './app/hooks/useTheme.js';
import { useLoanAndOutflowModals } from './app/hooks/useLoanAndOutflowModals.js';
import { useBoardDataLoading } from './app/hooks/useBoardDataLoading.js';
import { useTimeboardPersons } from './app/hooks/useTimeboardPersons.js';
import { useTimeboardsBootstrap } from './app/hooks/useTimeboardsBootstrap.js';
import AppHubView from './app/AppHubView.jsx';

export default function App() {
  const { showToast } = useToast();
  const { language, setLanguage, t } = useTranslation();

  // Authentication & View State
  const [currentView, setCurrentView] = useState(() => {
    const user = api.getCurrentUser();
    if (!user) return 'landing';
    const savedView = localStorage.getItem('chrono_current_view');
    return savedView === 'workspace' ? 'workspace' : 'hub';
  });

  const { currentUser, handleAuthSuccess, handleLogout } = useAuth(setCurrentView);

  // Timeboards State (Top Level Grouping)
  const [timeboards, setTimeboards] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_timeboards_v2');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return [];
  });

  const [myTimeboards, setMyTimeboards] = useState([]);
  const [sharedTimeboards, setSharedTimeboards] = useState([]);

  // Pending Invite State from URL query params (`invite` = invitation code; the other params come from older links)
  const [pendingInvite, setPendingInvite] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const inviteCode = params.get('invite');
      if (inviteCode) api.setPendingInviteCode(inviteCode);
      const inviteTbId = params.get('inviteTimeboardId') || params.get('tbId');
      const inviteEmail = params.get('email');
      if (inviteTbId || inviteCode) {
        return { timeboardId: inviteTbId || null, email: inviteEmail || '', code: inviteCode || api.getPendingInviteCode() || null };
      }
    } catch (e) { }
    const storedCode = api.getPendingInviteCode();
    return storedCode ? { timeboardId: null, email: '', code: storedCode } : null;
  });

  const [activeTimeboardId, setActiveTimeboardId] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_active_timeboard_id');
      if (saved) return saved;
    } catch (e) { }
    return null;
  });
  const [isTimeboardModalOpen, setIsTimeboardModalOpen] = useState(false);
  const [isTimeboardSettingsModalOpen, setIsTimeboardSettingsModalOpen] = useState(false);
  const [editingTimeboard, setEditingTimeboard] = useState(null);
  const [isUpdatingInstallments, setIsUpdatingInstallments] = useState(false);

  // Timelines State (Loaded directly from Supabase / Backend API)
  const [timelines, setTimelines] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_timelines_data_v27');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) { }
    return [];
  });

  const [activeTimelineId, setActiveTimelineId] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_active_timeline_id');
      if (saved) return saved;
    } catch (e) { }
    return null;
  });

  // Individual vs Global view mode when filtering by obligator.
  // Kept across timeline switches, together with the entity filter.
  const [isIndividualView, setIsIndividualView] = useState(false);

  // Financial Sub-Tabs State
  const [activeFinancialTab, setActiveFinancialTab] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_active_financial_tab');
      if (saved) return saved;
    } catch (e) { }
    return null;
  });

  // Effect: Handle Pending Invite for Logged-In User — accepted by its code (any account holding the code)
  // or, for older links, by the invited e-mail of the logged-in account
  useTimeboardsBootstrap({
    currentUser,
    pendingInvite,
    setActiveFinancialTab,
    setActiveTimeboardId,
    setActiveTimelineId,
    setCurrentView,
    setMyTimeboards,
    setPendingInvite,
    setSharedTimeboards,
    setTimeboards,
    showToast,
    t
  });

  // Load latest data from Database on mount - Timeboards for current user
  useEffect(() => {
    let isMounted = true;

    api.fetchTimeboards(currentUser?.id)
      .then((data) => {
        if (!isMounted) return;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          const my = data.myTimeboards || [];
          const shared = data.sharedTimeboards || [];
          const all = data.all || [...my, ...shared];
          setMyTimeboards(my);
          setSharedTimeboards(shared);
          setTimeboards(all);
          setActiveTimeboardId((currentId) => {
            const saved = localStorage.getItem('chrono_active_timeboard_id');
            const targetId = saved || currentId;
            const exists = all.some((tb) => tb.id === targetId);
            return exists ? targetId : (all[0]?.id || null);
          });
        } else if (Array.isArray(data)) {
          setTimeboards(data);
          setMyTimeboards(data);
          setActiveTimeboardId((currentId) => {
            const saved = localStorage.getItem('chrono_active_timeboard_id');
            const targetId = saved || currentId;
            const exists = data.some((tb) => tb.id === targetId);
            return exists ? targetId : (data[0]?.id || null);
          });
        }
      })
      .catch((err) => {
        console.error('Error fetching timeboards:', err.message);
      });

    return () => { isMounted = false; };
  }, [currentUser?.id]);

  const {
    currentUserPerson,
    rawEvents,
    reloadPersons,
    setRawEvents,
    setTimeboardPersons,
    timeboardPersons
  } = useTimeboardPersons({
    activeTimeboardId,
    currentUser
  });

  useEffect(() => {
    reloadPersons();
  }, [reloadPersons]);

  // Modal states
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [createTimelineInitialType, setCreateTimelineInitialType] = useState(null);
  const [isTimelineSettingsModalOpen, setIsTimelineSettingsModalOpen] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(null);
  const [deletingTimeline, setDeletingTimeline] = useState(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventModalDefaultNature, setEventModalDefaultNature] = useState('income'); // 'income' | 'expense' | 'investment'
  const [futureHorizonYears, setFutureHorizonYears] = useState(1);
  const [pastHorizonYears, setPastHorizonYears] = useState(1);
  const {
    fetchEventsForVisiblePeriod,
    focusedMonthRef,
    handleLoadMoreFuture,
    isLoadingSystem,
    refreshTimelines,
    scrollYBeforeModalRef
  } = useBoardDataLoading({
    activeFinancialTab,
    activeTimeboardId,
    activeTimelineId,
    futureHorizonYears,
    pastHorizonYears,
    setActiveFinancialTab,
    setActiveTimelineId,
    setFutureHorizonYears,
    setRawEvents,
    setTimelines,
    timelines
  });

  const handleLoadMorePast = async () => {
    const nextPast = pastHorizonYears + 1;
    setPastHorizonYears(nextPast);
  };

  // Loan Specific Modals
  const {
    amortizationDefaultDate,
    editingAmortization,
    editingInstallment,
    editingWithdrawal,
    handleOpenAmortizationModal,
    isAmortizationModalOpen,
    isWithdrawalModalOpen,
    setEditingAmortization,
    setEditingInstallment,
    setEditingWithdrawal,
    setIsAmortizationModalOpen,
    setIsWithdrawalModalOpen,
    setWithdrawalDefaultDate,
    setWithdrawalDefaultPocketId,
    withdrawalDefaultDate,
    withdrawalDefaultPocketId
  } = useLoanAndOutflowModals();

  const handleOpenWithdrawalModal = useCallback((dateStr = format(new Date(), 'yyyy-MM-dd'), pocketId = null, eventObj = null) => {
    focusedMonthRef.current = dateStr ? dateStr.substring(0, 7) : null;
    scrollYBeforeModalRef.current = window.scrollY;
    if (dateStr) {
      setWithdrawalDefaultDate(dateStr);
    }
    setWithdrawalDefaultPocketId(pocketId || null);
    setEditingWithdrawal(eventObj || null);
    setIsWithdrawalModalOpen(true);
  }, []);

  // Theme (light is default)
  const {
    handleToggleTheme,
    theme
  } = useTheme();

  // Save minimal settings to localStorage safely
  useAppPersistence({
    activeFinancialTab,
    activeTimeboardId,
    activeTimelineId,
    timeboards
  });

  // Selected Timeboard
  const {
    activeTimeboard,
    activeTimeboardTimelines,
    activeTimeline,
    displayEvents,
    individualEntityId,
    isIndividualRole,
    visibleTimelines
  } = useBoardTimelineData({
    activeFinancialTab,
    activeTimeboardId,
    activeTimelineId,
    currentUserPerson,
    rawEvents,
    timeboards,
    timelines
  });

  // Contagem de eventos da base de dados (templates únicos) e calculados (projeções/ocorrências)
  const dbEventsCount = React.useMemo(() => {
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) return 0;
    const uniqueRootIds = new Set();
    rawEvents.forEach((ev) => {
      const rootId = ev.eventId || ev.seriesId || (ev.id && String(ev.id).includes('_') ? String(ev.id).split('_')[0] : ev.id);
      if (rootId) uniqueRootIds.add(rootId);
    });
    return uniqueRootIds.size;
  }, [rawEvents]);

  const {
    calculatedEventsCount,
    handleOpenCreateTimeline,
    handleOpenEditTimeline,
    handleRequestDeleteTimeline,
    handleSaveComputeStartDate,
    handleSaveTimeline,
    handleToggleTimelineStatus
  } = useTimelineActions({
    activeTimeboardId,
    activeTimeboardTimelines,
    activeTimeline,
    editingTimeline,
    rawEvents,
    refreshTimelines,
    setActiveTimelineId,
    setCreateTimelineInitialType,
    setDeletingTimeline,
    setEditingTimeline,
    setIsTimelineModalOpen,
    setIsTimelineSettingsModalOpen,
    setIsUpdatingInstallments,
    setRawEvents,
    setTimelines,
    showToast,
    t,
    timelines
  });

  const handleConfirmDeleteTimeline = async (timelineId) => {
    let targetId = null;
    if (typeof timelineId === 'string') {
      targetId = timelineId;
    } else if (timelineId && typeof timelineId === 'object' && timelineId.id) {
      targetId = timelineId.id;
    }
    if (!targetId && deletingTimeline && deletingTimeline.id) {
      targetId = deletingTimeline.id;
    }
    if (!targetId && activeTimeline && activeTimeline.id) {
      targetId = activeTimeline.id;
    }
    if (!targetId) return;

    try {
      await api.deleteTimeline(targetId);
      setTimelines((prev) => {
        const filtered = prev.filter((tl) => tl.id !== targetId);
        if (activeTimelineId === targetId && filtered.length > 0) {
          setActiveTimelineId(filtered[0].id);
        }
        return filtered;
      });
      setRawEvents((prev) => prev.filter((ev) => ev.timelineId !== targetId && ev.timelineOriginId !== targetId));
      await refreshTimelines();
      showToast(t('toast.timelineDeletedSuccess') || 'Linha de tempo eliminada com sucesso!', 'success');
    } catch (err) {
      console.error('Error deleting timeline:', err);
      showToast(err.message || t('toast.timelineDeleteError') || 'Erro ao eliminar linha de tempo.', 'error');
      await refreshTimelines();
    } finally {
      setDeletingTimeline(null);
    }
  };

  // ----------------------------------------------------
  // Pockets State & Handlers (Investment / Savings)
  // ----------------------------------------------------
  const {
    deletingPocket,
    handleConfirmDeletePocket,
    handleOpenCreatePocket,
    handleRequestDeletePocket,
    handleSavePocket,
    isPocketModalOpen,
    pockets,
    selectedPocketForEdit,
    setDeletingPocket,
    setIsPocketModalOpen,
    setSelectedPocketForEdit,
    timeboardSummary
  } = usePocketActions({
    activeTimeboard,
    activeTimeboardTimelines,
    activeTimeline,
    isIndividualRole,
    rawEvents,
    refreshTimelines,
    showToast,
    t
  });

  // ----------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------
  const {
    handleConfirmDeleteEvent,
    handleCorrectEvent,
    handleOpenCreateEvent,
    handleOpenEditEvent,
    handlePatchEventLocal,
    handleRequestDeleteEvent,
    handleSaveEvent,
    handleUpdateEventDirect
  } = useEventCrudActions({
    focusedMonthRef,
    activeTimeboardId,
    activeTimeboardTimelines,
    activeTimeline,
    deletingEvent,
    editingEvent,
    fetchEventsForVisiblePeriod,
    futureHorizonYears,
    handleOpenAmortizationModal,
    handleOpenWithdrawalModal,
    pastHorizonYears,
    refreshTimelines,
    scrollYBeforeModalRef,
    setDeletingEvent,
    setEditingEvent,
    setEventModalDefaultNature,
    setIsEventModalOpen,
    setRawEvents,
    setSelectedDateForNewEvent,
    setTimelines,
    showToast,
    t,
    timelines
  });

  const handleConfirmResetTimeline = async () => {
    let targetTlIds = [];

    if (activeTimeline?.type === TimelineType.BALANCE) {
      targetTlIds = activeTimeboardTimelines.map((t) => t.id);
    } else if (activeTimeline?.id) {
      targetTlIds = [activeTimeline.id];
    }

    try {
      for (const tId of targetTlIds) {
        await api.resetTimeline(tId);
      }
      await refreshTimelines();
    } catch (err) {
      console.error('Error resetting timeline:', err);
    }

    setIsResetConfirmOpen(false);
  };

  const {
    handleAddChecklistItem,
    handleAddFloatingTask,
    handleCompleteFloatingTask,
    handleDeleteChecklistItem,
    handleToggleTask,
    handleUpdateFloatingTaskPriority
  } = useTaskActions({
    activeTimeline,
    setTimelines
  });

  // ----------------------------------------------------
  // Loan Specific Handlers (Empréstimo)
  // ----------------------------------------------------

  // Toggle installment payment / income / expense / investment status (3-state: Negative -> Positive -> Cancelled -> Negative)
  const {
    handlePayUpToHere,
    handleSaveAmortization,
    handleSaveEditInstallment,
    handleToggleLoanPayment
  } = useEventStatusActions({
    activeFinancialTab,
    activeTimeboardId,
    activeTimeboardTimelines,
    activeTimeline,
    activeTimelineId,
    editingAmortization,
    rawEvents,
    refreshTimelines,
    setEditingAmortization,
    setIsUpdatingInstallments,
    setRawEvents,
    setTimelines,
    showToast,
    t
  });

  const loanMetrics = activeTimeline && isLoanTimelineType(activeTimeline.type)
    ? getLoanMetrics(activeTimeline, activeTimeline.events || [])
    : null;

  const handleScrollToOverdue = () => {
    const el = document.getElementById('loan-inst-overdue');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleScrollToToday = () => {
    const todayNode = document.getElementById('timeline-node-today');
    if (todayNode) {
      const navbar = document.querySelector('.app-header') || document.querySelector('header');
      const stickyDock = document.querySelector('.sticky-header-dock');

      const navHeight = navbar ? navbar.offsetHeight : 68;
      const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
      const totalStickyOffset = navHeight + 24 + dockHeight + 14;

      const elementDocTop = todayNode.getBoundingClientRect().top + window.pageYOffset;
      const targetY = elementDocTop - totalStickyOffset;

      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });

      todayNode.classList.add('pulse-highlight-node');
      setTimeout(() => {
        todayNode.classList.remove('pulse-highlight-node');
      }, 2000);
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const {
    handleDeleteTimeboard,
    handleNavigateToHub,
    handleSaveTimeboard,
    handleSelectTimeboardFromHub
  } = useTimeboardActions({
    currentUser,
    editingTimeboard,
    language,
    setActiveFinancialTab,
    setActiveTimeboardId,
    setActiveTimelineId,
    setCurrentView,
    setEditingTimeboard,
    setMyTimeboards,
    setRawEvents,
    setTimeboards,
    setTimelines,
    timeboards,
    timelines
  });

  const handleAddEventForDate = useCallback(
    (dateStr, nature, presetData = null) => handleOpenCreateEvent(dateStr, nature || (activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income'), presetData),
    [handleOpenCreateEvent, activeFinancialTab]
  );

  const handleOpenEditInstallment = useCallback((inst) => setEditingInstallment(inst), []);

  const handleNavigateToTimeline = useCallback((timelineId, tab) => {
    if (timelineId) setActiveTimelineId(timelineId);
    if (tab) setActiveFinancialTab(tab);
  }, []);

  // 1. Landing Page View (When not logged in or explicitly at landing)
  if (!currentUser || currentView === 'landing') {
    return (
      <LandingPage
        onAuthSuccess={handleAuthSuccess}
        initialEmail={pendingInvite?.email || ''}
        pendingInvite={pendingInvite}
        t={t}
      />
    );
  }

  // 2. Dashboards / Timeboards Hub View (Second page when logged in)
  if (currentView === 'hub') {
    return (
      <AppHubView
        currentUser={currentUser}
        editingTimeboard={editingTimeboard}
        handleDeleteTimeboard={handleDeleteTimeboard}
        handleLogout={handleLogout}
        handleSaveTimeboard={handleSaveTimeboard}
        handleSelectTimeboardFromHub={handleSelectTimeboardFromHub}
        handleToggleTheme={handleToggleTheme}
        isTimeboardModalOpen={isTimeboardModalOpen}
        isTimeboardSettingsModalOpen={isTimeboardSettingsModalOpen}
        language={language}
        myTimeboards={myTimeboards}
        setEditingTimeboard={setEditingTimeboard}
        setIsTimeboardModalOpen={setIsTimeboardModalOpen}
        setIsTimeboardSettingsModalOpen={setIsTimeboardSettingsModalOpen}
        setLanguage={setLanguage}
        sharedTimeboards={sharedTimeboards}
        t={t}
        theme={theme}
        timeboards={timeboards}
      />
    );
  }

  // 3. Timeline Workspace View (When a specific timeboard is active)
  return (
    <PermissionsProvider isReadOnly={isIndividualRole}>
    <TimeboardProvider timeboardType={activeTimeboard?.type} headerDefaultState={activeTimeboard?.headerDefaultState} pockets={pockets}>
    <HeaderRefreshProvider value={refreshTimelines}>
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        timeboards={timeboards}
        activeTimeboardId={activeTimeboardId}
        onSelectTimeboard={(id) => {
          setActiveTimeboardId(id);
          setActiveTimelineId(null);
          setActiveFinancialTab(null);
        }}
        onOpenEditTimeboard={isIndividualRole ? undefined : async (tb) => {
          try {
            const fresh = await api.fetchTimeboard(tb.id);
            setEditingTimeboard(fresh || tb);
          } catch {
            setEditingTimeboard(tb);
          }
          setIsTimeboardSettingsModalOpen(true);
        }}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onNavigateToHub={handleNavigateToHub}
        onLogout={handleLogout}
      />

      {/* Main Layout Area */}
      <AppMainArea
        activeFinancialTab={activeFinancialTab}
        activeTimeboard={activeTimeboard}
        activeTimeboardTimelines={activeTimeboardTimelines}
        activeTimeline={activeTimeline}
        currentUser={currentUser}
        displayEvents={displayEvents}
        futureHorizonYears={futureHorizonYears}
        handleAddChecklistItem={handleAddChecklistItem}
        handleAddEventForDate={handleAddEventForDate}
        handleAddFloatingTask={handleAddFloatingTask}
        handleCompleteFloatingTask={handleCompleteFloatingTask}
        handleCorrectEvent={handleCorrectEvent}
        handleDeleteChecklistItem={handleDeleteChecklistItem}
        handleLoadMoreFuture={handleLoadMoreFuture}
        handleLoadMorePast={handleLoadMorePast}
        handleNavigateToTimeline={handleNavigateToTimeline}
        handleOpenAmortizationModal={handleOpenAmortizationModal}
        handleOpenCreateEvent={handleOpenCreateEvent}
        handleOpenCreatePocket={handleOpenCreatePocket}
        handleOpenCreateTimeline={handleOpenCreateTimeline}
        handleOpenEditEvent={handleOpenEditEvent}
        handleOpenEditInstallment={handleOpenEditInstallment}
        handleOpenEditTimeline={handleOpenEditTimeline}
        handleOpenWithdrawalModal={handleOpenWithdrawalModal}
        handlePatchEventLocal={handlePatchEventLocal}
        handlePayUpToHere={handlePayUpToHere}
        handleRequestDeleteEvent={handleRequestDeleteEvent}
        handleRequestDeletePocket={handleRequestDeletePocket}
        handleRequestDeleteTimeline={handleRequestDeleteTimeline}
        handleSaveComputeStartDate={handleSaveComputeStartDate}
        handleScrollToOverdue={handleScrollToOverdue}
        handleToggleLoanPayment={handleToggleLoanPayment}
        handleToggleTask={handleToggleTask}
        handleToggleTimelineStatus={handleToggleTimelineStatus}
        handleUpdateEventDirect={handleUpdateEventDirect}
        handleUpdateFloatingTaskPriority={handleUpdateFloatingTaskPriority}
        individualEntityId={individualEntityId}
        isIndividualRole={isIndividualRole}
        isIndividualView={isIndividualView}
        isLoadingSystem={isLoadingSystem}
        pastHorizonYears={pastHorizonYears}
        pockets={pockets}
        setActiveFinancialTab={setActiveFinancialTab}
        setActiveTimelineId={setActiveTimelineId}
        setIsIndividualView={setIsIndividualView}
        t={t}
        timeboardPersons={timeboardPersons}
        timeboardSummary={timeboardSummary}
        timelines={timelines}
        visibleTimelines={visibleTimelines}
      />

      {/* Modals */}
      <AppModals
        activeFinancialTab={activeFinancialTab}
        activeTimeboard={activeTimeboard}
        activeTimeboardId={activeTimeboardId}
        activeTimeboardTimelines={activeTimeboardTimelines}
        activeTimeline={activeTimeline}
        amortizationDefaultDate={amortizationDefaultDate}
        createTimelineInitialType={createTimelineInitialType}
        deletingEvent={deletingEvent}
        deletingPocket={deletingPocket}
        deletingTimeline={deletingTimeline}
        editingAmortization={editingAmortization}
        editingEvent={editingEvent}
        editingInstallment={editingInstallment}
        editingTimeboard={editingTimeboard}
        editingTimeline={editingTimeline}
        editingWithdrawal={editingWithdrawal}
        eventModalDefaultNature={eventModalDefaultNature}
        handleConfirmDeleteEvent={handleConfirmDeleteEvent}
        handleConfirmDeletePocket={handleConfirmDeletePocket}
        handleConfirmDeleteTimeline={handleConfirmDeleteTimeline}
        handleDeleteTimeboard={handleDeleteTimeboard}
        handleRequestDeleteTimeline={handleRequestDeleteTimeline}
        handleSaveAmortization={handleSaveAmortization}
        handleSaveEditInstallment={handleSaveEditInstallment}
        handleSaveEvent={handleSaveEvent}
        handleSavePocket={handleSavePocket}
        handleSaveTimeboard={handleSaveTimeboard}
        handleSaveTimeline={handleSaveTimeline}
        isAmortizationModalOpen={isAmortizationModalOpen}
        isEventModalOpen={isEventModalOpen}
        isPocketModalOpen={isPocketModalOpen}
        isTimeboardModalOpen={isTimeboardModalOpen}
        isTimeboardSettingsModalOpen={isTimeboardSettingsModalOpen}
        isTimelineModalOpen={isTimelineModalOpen}
        isTimelineSettingsModalOpen={isTimelineSettingsModalOpen}
        isWithdrawalModalOpen={isWithdrawalModalOpen}
        loanMetrics={loanMetrics}
        pockets={pockets}
        rawEvents={rawEvents}
        reloadPersons={reloadPersons}
        selectedDateForNewEvent={selectedDateForNewEvent}
        selectedPocketForEdit={selectedPocketForEdit}
        setDeletingEvent={setDeletingEvent}
        setDeletingPocket={setDeletingPocket}
        setDeletingTimeline={setDeletingTimeline}
        setEditingAmortization={setEditingAmortization}
        setEditingInstallment={setEditingInstallment}
        setEditingTimeboard={setEditingTimeboard}
        setEditingWithdrawal={setEditingWithdrawal}
        setIsAmortizationModalOpen={setIsAmortizationModalOpen}
        setIsEventModalOpen={setIsEventModalOpen}
        setIsPocketModalOpen={setIsPocketModalOpen}
        setIsResetConfirmOpen={setIsResetConfirmOpen}
        setIsTimeboardModalOpen={setIsTimeboardModalOpen}
        setIsTimeboardSettingsModalOpen={setIsTimeboardSettingsModalOpen}
        setIsTimelineModalOpen={setIsTimelineModalOpen}
        setIsTimelineSettingsModalOpen={setIsTimelineSettingsModalOpen}
        setIsWithdrawalModalOpen={setIsWithdrawalModalOpen}
        setSelectedPocketForEdit={setSelectedPocketForEdit}
        setTimeboardPersons={setTimeboardPersons}
        setWithdrawalDefaultPocketId={setWithdrawalDefaultPocketId}
        timeboards={timeboards}
        timelines={timelines}
        withdrawalDefaultDate={withdrawalDefaultDate}
        withdrawalDefaultPocketId={withdrawalDefaultPocketId}
      />

      {/* Reset Timeline Confirmation Modal */}
      {isResetConfirmOpen && (
        <ResetTimelineConfirmModal
          activeTimeline={activeTimeline}
          handleConfirmResetTimeline={handleConfirmResetTimeline}
          setIsResetConfirmOpen={setIsResetConfirmOpen}
          t={t}
        />
      )}

      {/* System Loading Overlay */}
      {isLoadingSystem && (
        <SystemLoadingOverlay />
      )}

      {/* Installments Updating Overlay */}
      {isUpdatingInstallments && (
        <InstallmentsUpdatingOverlay />
      )}
      {/* 🚀 Floating Bottom Right Controls (Go to Today + Event Counts) */}
      <AppFloatingControls
        calculatedEventsCount={calculatedEventsCount}
        dbEventsCount={dbEventsCount}
        handleScrollToToday={handleScrollToToday}
        t={t}
      />
    </div>
    </HeaderRefreshProvider>
    </TimeboardProvider>
    </PermissionsProvider>
  );
}
