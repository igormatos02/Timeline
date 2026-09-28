import React, { useState, useMemo, useCallback } from 'react';
import { EXPENSE_CATEGORY_ITEMS, CONDO_EXPENSE_CATEGORY_ITEMS, CONDO_EXPENSE_CATEGORY_IDS } from './timeline/timelineFilterItems.js';
import { groupEventsByDate } from '../utils/eventSorting.js';
import {
  format,
  parseISO,
  eachDayOfInterval,
  eachMonthOfInterval,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth
} from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import {
  Plus,
  Calendar,
  Layers,
  Clock,
  Sparkles,
  Tag,
  Pin,
  Repeat,
  DollarSign,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Landmark,
  CheckCircle2,
  Play,
  Home,
  CreditCard,
  FileText,
  Zap,
  Utensils,
  ShieldCheck,
  User,
  Building2,
  UserCheck,
  Loader2
} from 'lucide-react';
import { createEventDayComparator, buildPersonsById } from '../utils/eventSorting.js';
import { useTimeboard } from '../context/TimeboardContext.jsx';
import FloatingTaskStack from './FloatingTaskStack';
import { getPaletteTheme } from '../../shared/config/colorPalettes.js';
import {
  EventType,
  EventStatus,
  ClearanceDocumentType,
  HISTORY_PERIOD_MONTHS,
  HistoryPeriod,
  TimelineType,
  TimelineStatus,
  TimeboardType,
  TimelineColor,
  getDefaultTimelineColor,
  IncomeEventCategory,
  ExpensesEventCategory,
  LoanEventCategory,
  AmortizationEventCategory,
  AmortizationStrategy,
  PersonType,
  normalizeTimelineType,
  isLoanTimelineType,
  isPositiveStatus,
  isCancelledStatus
} from '../enums/index.js';
import { getTimelineDropdownOptions } from '../utils/timelineConfig.jsx';
import FilterSwitch from './sidebar/FilterSwitch.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { GENERAL_SPACE_KEY } from '../../shared/finance/savingsSpaces.js';



import ReceiptModal from './modals/ReceiptModal.jsx';
import HistoryPrintModal from './modals/HistoryPrintModal.jsx';
import { EventActionsProvider } from '../context/EventActionsContext.jsx';
import { usePermissions } from '../context/PermissionsContext.jsx';
import { useToast } from '../context/ToastContext.jsx';
import { buildClearanceHtml, buildCondoClearanceHtml, buildHistoryHtml } from '../utils/receiptGenerator.js';
import TimelineSidebar from './timeline/TimelineSidebar.jsx';
import TimelineMonthView from './timeline/TimelineMonthView.jsx';
import TimelineYearView from './timeline/TimelineYearView.jsx';
import TimelineDayView from './timeline/TimelineDayView.jsx';
import TimelineWeekView from './timeline/TimelineWeekView.jsx';
import TimelineFilteredListView from './timeline/TimelineFilteredListView.jsx';
import { useTimelineReceipts } from './timeline/useTimelineReceipts.js';
import { useTimelineMonthlyFlows } from './timeline/useTimelineMonthlyFlows.js';
import { useTimelineFilteredEvents } from './timeline/useTimelineFilteredEvents.js';


function VerticalTimeline({
  lockedEntityId = null,
  timeline,
  timelines = [],
  activeTimeboard = null,
  currentUser = null,
  activeFinancialTab = '',
  pockets = [],
  persons = [],
  onOpenCreatePocket: onOpenCreatePocketProp,
  onEditPocket: onEditPocketProp,
  onDeletePocket: onDeletePocketProp,
  onSelectFinancialTab,
  onEditEvent,
  onUpdateEventDirect,
  onDeleteEvent,
  onToggleTask,
  onAddEventForDate: onAddEventForDateProp,
  onCompleteFloatingTask: onCompleteFloatingTaskProp,
  onAddFloatingTask: onAddFloatingTaskProp,
  onUpdateFloatingTaskPriority: onUpdateFloatingTaskPriorityProp,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onToggleLoanPayment,
  onPayUpToHere,
  onOpenEditInstallment,
  onOpenAmortizationModal: onOpenAmortizationModalProp,
  onOpenWithdrawModal: onOpenWithdrawModalProp,
  onNavigateToTimeline,
  onCorrectEvent,
  onPatchEventLocal,
  onCreateTimeline: onCreateTimelineProp,
  headerComponent,
  futureHorizonYears = 1,
  pastHorizonYears = 1,
  onLoadMoreFuture,
  onLoadMorePast
}) {
  const { language, t } = useTranslation();
  const { showToast } = useToast();
  const { isCondoflow } = useTimeboard();
  // Events of a same day: condoflow timeboards are ordered by the obligator identifier (unit), others by title
  const personsById = useMemo(() => buildPersonsById(persons), [persons]);
  const dayComparator = useMemo(
    () => createEventDayComparator({ personsById, obligatorFirst: isCondoflow }),
    [personsById, isCondoflow]
  );
  // Read-only users (individual role) cannot create or change anything on the timeline.
  const { isReadOnly } = usePermissions();
  const onOpenCreatePocket = isReadOnly ? undefined : onOpenCreatePocketProp;
  const onEditPocket = isReadOnly ? undefined : onEditPocketProp;
  const onDeletePocket = isReadOnly ? undefined : onDeletePocketProp;
  const onAddEventForDate = isReadOnly ? undefined : onAddEventForDateProp;
  const onCompleteFloatingTask = isReadOnly ? undefined : onCompleteFloatingTaskProp;
  const onAddFloatingTask = isReadOnly ? undefined : onAddFloatingTaskProp;
  const onUpdateFloatingTaskPriority = isReadOnly ? undefined : onUpdateFloatingTaskPriorityProp;
  const onOpenAmortizationModal = isReadOnly ? undefined : onOpenAmortizationModalProp;
  const onOpenWithdrawModal = isReadOnly ? undefined : onOpenWithdrawModalProp;
  const onCreateTimeline = isReadOnly ? undefined : onCreateTimelineProp;
  const dateLocale = language === 'en' ? enUS : pt;

  const isFinancialTimeline = [
    TimelineType.BALANCE,
    TimelineType.INCOME,
    TimelineType.EXPENSE,
    TimelineType.INVESTMENT,
    TimelineType.LOAN
  ].includes(timeline.type);

  const isLoanTimelineOrTab = isLoanTimelineType(timeline.type);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilters, setSelectedStatusFilters] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(EventStatus.ALL);
  const [selectedEntityId, setSelectedEntityId] = useState(lockedEntityId);

  // Individual-role users are always filtered to their own entity
  React.useEffect(() => {
    if (lockedEntityId && String(selectedEntityId) !== String(lockedEntityId)) {
      setSelectedEntityId(lockedEntityId);
    }
  }, [lockedEntityId, selectedEntityId]);
  const [selectedLabelFilter] = useState(EventStatus.ALL);
  // Empty days / weeks / months are always shown (the sidebar toggle was removed)
  const showEmptyDays = true;
  // Period filter (year / month): show only that month or year instead of scrolling the whole timeline
  const [periodYear, setPeriodYear] = useState('');
  const [periodMonth, setPeriodMonth] = useState('');
  // Individual view: switches for the shared reminders / diary posts (on by default)
  const [showSharedReminders, setShowSharedReminders] = useState(true);
  const [showSharedPosts, setShowSharedPosts] = useState(true);
  const [monthProjectionMode, setMonthProjectionMode] = useState('realized');
  const [collapsedSections, setCollapsedSections] = useState({
    timelines: false,
    status: true,
    integratedTimelines: false,
    categories: true,
    entities: false,
    period: false
  });

  // Receipt Modal and Generation Overlay State
  const {
    eventActions,
    generatingLabelKey,
    handleOpenReceipt,
    handleReceiptDateChange,
    handleReceiptPrint,
    handleSaveReceiptDate,
    handleSaveReceiptNumber,
    isGeneratingReceipt,
    receiptModalData,
    setGeneratingLabelKey,
    setIsGeneratingReceipt,
    setReceiptModalData
  } = useTimelineReceipts({
    activeTimeboard,
    currentUser,
    language,
    onCorrectEvent,
    onPatchEventLocal,
    persons,
    showToast,
    t,
    timeline,
    timelines
  });

  const toggleSectionCollapse = (key) => {
    setCollapsedSections((prev) => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const paletteTheme = useMemo(() => {
    return getPaletteTheme(timeline?.color, TimelineColor.PRIMARY);
  }, [timeline?.color]);

  // State & Ref for New Timeline Dropdown
  const [isTimelineDropdownOpen, setIsTimelineDropdownOpen] = useState(false);
  const timelineDropdownRef = React.useRef(null);

  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (timelineDropdownRef.current && !timelineDropdownRef.current.contains(event.target)) {
        setIsTimelineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  React.useEffect(() => {
    setSelectedCategoryFilter(EventStatus.ALL);
    setSelectedStatusFilters([]);
    setSelectedExpenseCategories([]);
    // The entity filter is intentionally kept when switching timelines.
  }, [timeline?.id]);

  const isFinancial = activeTimeboard?.type === TimeboardType.FINANCIAL || isFinancialTimeline;
  const isReminders = activeTimeboard?.type === TimeboardType.REMINDERS || normalizeTimelineType(timeline?.type) === TimelineType.REMINDER;

  const balanceTimeline = (timelines || []).find((tl) => tl && tl.type === TimelineType.BALANCE);
  const timeboardComputeStart = activeTimeboard?.computeFrom || activeTimeboard?.compute_from;
  const balanceComputeStart = balanceTimeline?.computeStartDate || balanceTimeline?.compute_start_date || balanceTimeline?.computeFrom || balanceTimeline?.compute_from;
  const timelineComputeStart = timeline?.computeStartDate || timeline?.compute_start_date || timeline?.computeFrom || timeline?.compute_from || timeline?.startDate || timeline?.start_date;
  const rawComputeStart = timeboardComputeStart || balanceComputeStart || timelineComputeStart;
  const computeFromMonth = rawComputeStart && String(rawComputeStart) !== '1900-01' && !String(rawComputeStart).startsWith('1900-01') && String(rawComputeStart) !== 'all'
    ? String(rawComputeStart).substring(0, 7)
    : null;

  const timelineOptions = useMemo(() => {
    return getTimelineDropdownOptions(timelines, t, activeTimeboard?.type);
  }, [timelines, t, activeTimeboard?.type]);

  // Multi-selection of timelines for Balance view (derived dynamically from real timelines)
  const availableCreditOptions = useMemo(() => {
    return (timelines || [])
      .filter(
        (t) =>
          t.type !== TimelineType.BALANCE &&
          t.type !== TimelineType.TODO &&
          t.type !== TimelineType.FOLLOWUP &&
          t.type !== TimelineType.DIARY &&
          t.type !== TimelineType.REMINDER &&
          t.status !== TimelineStatus.INACTIVE &&
          t.status !== 'inactive' &&
          t.status !== 'Inativo' &&
          t.isActive !== false
      )
      .map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color || TimelineColor.PRIMARY
      }));
  }, [timelines]);

  const inactiveTimelineIdSet = useMemo(() => {
    return new Set(
      (timelines || [])
        .filter((t) => t.status === TimelineStatus.INACTIVE || t.isActive === false)
        .map((t) => t.id)
    );
  }, [timelines]);

  const effectiveTimelines = useMemo(() => {
    if (Array.isArray(timelines) && timelines.length > 0) return timelines;
    if (Array.isArray(timeline?.timelines) && timeline.timelines.length > 0) return timeline.timelines;
    if (timeline) return [timeline];
    return [];
  }, [timelines, timeline]);


  const hasIncomeTimeline = useMemo(() => {
    return effectiveTimelines.some(
      (t) => normalizeTimelineType(t.type) === TimelineType.INCOME &&
        t.status !== TimelineStatus.INACTIVE && t.isActive !== false
    );
  }, [effectiveTimelines]);

  const hasExpenseTimeline = useMemo(() => {
    return effectiveTimelines.some(
      (t) => normalizeTimelineType(t.type) === TimelineType.EXPENSE &&
        t.status !== TimelineStatus.INACTIVE && t.isActive !== false
    );
  }, [effectiveTimelines]);

  const hasInvestmentTimeline = useMemo(() => {
    return effectiveTimelines.some(
      (t) => normalizeTimelineType(t.type) === TimelineType.INVESTMENT &&
        t.status !== TimelineStatus.INACTIVE && t.isActive !== false
    );
  }, [effectiveTimelines]);

  const hasLoanTimeline = useMemo(() => {
    return effectiveTimelines.some(
      (t) => isLoanTimelineType(t.type) &&
        t.status !== TimelineStatus.INACTIVE && t.isActive !== false
    );
  }, [effectiveTimelines]);

  const isEventTimelineActive = (ev) => {
    if (!ev) return false;
    const tlId = ev.timelineId || ev.timelineOriginId;
    if (tlId && inactiveTimelineIdSet.has(tlId)) return false;
    return true;
  };

  const [selectedTimelineIds, setSelectedTimelineIds] = useState([]);

  const toggleTimelineSelection = (id) => {
    if (selectedTimelineIds.includes(id)) {
      setSelectedTimelineIds(selectedTimelineIds.filter((item) => item !== id));
    } else {
      setSelectedTimelineIds([...selectedTimelineIds, id]);
    }
  };

  const selectAllTimelines = () => {
    if (selectedTimelineIds.length === availableCreditOptions.length) {
      setSelectedTimelineIds([]);
    } else {
      setSelectedTimelineIds(availableCreditOptions.map((o) => o.id));
    }
  };

  // Multi-selection of status filters
  const toggleStatusFilter = (stId) => {
    if (stId === EventStatus.ALL) {
      setSelectedStatusFilters([]);
      return;
    }
    if (selectedStatusFilters.length === 0) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (selectedStatusFilters.includes(stId)) {
      setSelectedStatusFilters(selectedStatusFilters.filter((id) => id !== stId));
    } else {
      setSelectedStatusFilters([...selectedStatusFilters, stId]);
    }
  };

  const selectAllStatuses = () => {
    setSelectedStatusFilters([]);
  };

  // "Pending" also covers overdue events (there is no separate overdue filter)
  const getStatusFilterOptions = () => {
    if ([TimelineType.INCOME, TimelineType.BALANCE].includes(timeline.type)) {
      return [
        { id: EventStatus.ALL, name: t('status.all'), icon: <Layers size={13} /> },
        { id: EventStatus.RECEIVED, name: t('status.received'), icon: <CheckCircle2 size={13} /> },
        { id: EventStatus.PENDING, name: t('status.pending'), icon: <Clock size={13} /> }
      ];
    }
    if ([TimelineType.EXPENSE, TimelineType.LOAN].includes(timeline.type) || isLoanTimelineType(timeline.type)) {
      return [
        { id: EventStatus.ALL, name: t('status.all'), icon: <Layers size={13} /> },
        { id: EventStatus.PAID, name: t('status.paid'), icon: <CheckCircle2 size={13} /> },
        { id: EventStatus.PENDING, name: t('status.pending'), icon: <Clock size={13} /> }
      ];
    }
    if (timeline.type === TimelineType.INVESTMENT) {
      return [
        { id: EventStatus.ALL, name: t('status.all'), icon: <Layers size={13} /> },
        { id: EventStatus.INVESTED, name: t('status.invested'), icon: <CheckCircle2 size={13} /> },
        { id: EventStatus.PENDING, name: t('status.pending'), icon: <Clock size={13} /> }
      ];
    }
    return [
      { id: EventStatus.ALL, name: t('status.all'), icon: <Layers size={13} /> },
      { id: EventStatus.IN_PROGRESS, name: t('status.inProgress'), icon: <Play size={13} /> },
      { id: EventStatus.COMPLETED, name: t('status.completed'), icon: <CheckCircle2 size={13} /> },
      { id: EventStatus.PLANNED, name: t('status.planned'), icon: <Calendar size={13} /> }
    ];
  };

  // Switch toggle renderer for sidebar filters
  const renderFilterSwitch = (checked, activeColor = 'var(--primary)') => <FilterSwitch checked={checked} color={activeColor} />;

  // Multi-selection of categories for Expense timeline
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState([]);
  // Account (savings timeline) movement filter: inflows, withdrawals, costs and expenses (empty = all)
  const [selectedMovementTypes, setSelectedMovementTypes] = useState([]);
  // Outflows timeline filter: own expenses, expenses via savings and installments (empty = all)
  const [selectedOutflowTypes, setSelectedOutflowTypes] = useState([]);

  const isCategoryFiltered =
    (timeline.type === TimelineType.EXPENSE && selectedExpenseCategories.length > 0) ||
    (timeline.type !== TimelineType.EXPENSE && selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos');

  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);

  const isListView = selectedStatusFilters.length > 0 || isCategoryFiltered || isSearchActive || Boolean(selectedEntityId);

  const resetAllFilters = () => {
    setSelectedStatusFilters([]);
    setSelectedExpenseCategories([]);
    setSelectedOutflowTypes([]);
    setSelectedCategoryFilter(EventStatus.ALL);
    setSearchQuery('');
    setShowSharedReminders(true);
    setShowSharedPosts(true);
    setPeriodYear('');
    setPeriodMonth('');
  };

  const toggleExpenseCategory = (catId) => {
    if (!isListView) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    if (selectedExpenseCategories.length === 0) {
      setSelectedExpenseCategories([catId]);
    } else if (selectedExpenseCategories.includes(catId)) {
      const next = selectedExpenseCategories.filter((item) => item !== catId);
      setSelectedExpenseCategories(next);
    } else {
      const next = [...selectedExpenseCategories, catId];
      if (next.length === (isCondoflow ? CONDO_EXPENSE_CATEGORY_ITEMS : EXPENSE_CATEGORY_ITEMS).length) {
        setSelectedExpenseCategories([]);
      } else {
        setSelectedExpenseCategories(next);
      }
    }
  };

  const selectAllExpenseCategories = () => {
    setSelectedExpenseCategories([]);
  };

  // Agrupamento fixo mensal por agora
  const [groupBy, setGroupBy] = useState('mes');



  // Automatically update aggregation view when timeline periodicity changes & ensure valid grouping
  // Keep grouping locked to monthly
  React.useEffect(() => {
    setGroupBy('mes');
  }, [timeline.id]);


  // Scroll memory per timeline/tab & Auto-scroll directly to Today or Specific Month
  const positionOnMonth = React.useCallback((monthKey, behavior = 'instant') => {
    if (!monthKey) return false;
    const currentMKey = format(new Date(), 'yyyy-MM');
    const targetNode = document.querySelector(`[data-month-key="${monthKey}"]`) || (monthKey === currentMKey ? document.getElementById('timeline-node-today') : null);
    if (targetNode) {
      const navbar = document.querySelector('.app-header') || document.querySelector('header');
      const stickyDock = document.querySelector('.sticky-header-dock');

      const navHeight = navbar ? navbar.offsetHeight : 68;
      const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
      const totalStickyOffset = navHeight + 24 + dockHeight + 14;

      const elementDocTop = targetNode.getBoundingClientRect().top + (window.scrollY || window.pageYOffset || 0);
      const targetY = elementDocTop - totalStickyOffset;

      window.scrollTo({ top: Math.max(0, targetY), behavior });
      return true;
    }
    return false;
  }, []);

  const positionOnToday = React.useCallback((behavior = 'instant') => {
    const currentMKey = format(new Date(), 'yyyy-MM');
    return positionOnMonth(currentMKey, behavior);
  }, [positionOnMonth]);

  const userInteractedRef = React.useRef(false);

  // Track physical user scroll interaction (wheel, touchmove)
  React.useEffect(() => {
    const handleUserScroll = () => {
      userInteractedRef.current = true;
    };
    window.addEventListener('wheel', handleUserScroll, { passive: true });
    window.addEventListener('touchmove', handleUserScroll, { passive: true });
    return () => {
      window.removeEventListener('wheel', handleUserScroll);
      window.removeEventListener('touchmove', handleUserScroll);
    };
  }, []);

  // Position on Current Month / Today on timeline mount, tab switch, or when events dataset loads
  React.useEffect(() => {
    userInteractedRef.current = false;
    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 12;

    const attemptScroll = () => {
      if (cancelled || userInteractedRef.current) return;
      positionOnToday('instant');
    };

    attemptScroll();
    const rafId = requestAnimationFrame(attemptScroll);

    const intervalId = setInterval(() => {
      attempts++;
      if (cancelled || userInteractedRef.current || attempts >= maxAttempts) {
        clearInterval(intervalId);
        return;
      }
      attemptScroll();
    }, 50);

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      clearInterval(intervalId);
    };
  }, [timeline?.id, timeline?.events?.length, activeFinancialTab, positionOnToday]);

  // Auto-scroll when switching between full timeline view and list view (status or category filtered)
  const prevIsListViewRef = React.useRef(isListView);
  React.useEffect(() => {
    // When switching from timeline to list mode -> instant jump to top of page
    if (!prevIsListViewRef.current && isListView) {
      window.scrollTo({ top: 0, behavior: 'instant' });
    }
    // When returning to full timeline view -> instant scroll to today / current month
    if (prevIsListViewRef.current && !isListView) {
      userInteractedRef.current = false;
      let attempts = 0;
      const maxAttempts = 12;

      const attemptScroll = () => {
        return positionOnToday('instant');
      };

      attemptScroll();
      const rafId = requestAnimationFrame(attemptScroll);

      const intervalId = setInterval(() => {
        attempts++;
        const done = attemptScroll();
        if (done || attempts >= maxAttempts) {
          clearInterval(intervalId);
        }
      }, 50);

      return () => {
        cancelAnimationFrame(rafId);
        clearInterval(intervalId);
      };
    }
    prevIsListViewRef.current = isListView;
  }, [isListView, positionOnToday]);

  // Reference to Today using current system date
  const todayDate = new Date();
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // Extract pending floating tasks (tasks without a fixed date that are not completed)
  const allEvents = timeline.events || [];
  const isFloatingTask = (ev) =>
    Boolean(
      (ev.category === EventType.TODO || ev.category === 'todo' || ev.category === 'tarefa' || ev.eventType === EventType.TODO || ev.timelineType === TimelineType.TODO || ev.timeline_type === TimelineType.TODO) &&
      ev.isCompleted === false &&
      !ev.date
    );

  const personsRef = React.useRef(persons);
  personsRef.current = persons;

  const isEventMatchingEntity = useCallback((ev, targetEntityId) => {
    // Shared notices (reminders / diaries shown to individual users) belong to every entity view
    if (ev?.isSharedNotice) return true;
    if (!targetEntityId) return true;
    if (!ev) return false;
    const target = String(targetEntityId).trim().toLowerCase();

    // Direct IDs and foreign keys across schemas
    const candidateIds = [
      ev.obligationPersonId,
      ev.obligation_person_id,
      ev.personId,
      ev.person_id,
      ev.obligationPerson?.id,
      ev.obligationPerson?.personId,
      ev.obligation_person?.id,
      ev.obligation_person?.person_id,
      ev.person?.id
    ].filter(Boolean).map((v) => String(v).trim().toLowerCase());

    if (candidateIds.includes(target)) return true;

    // Names
    const candidateNames = [
      ev.obligationPersonName,
      ev.obligation_person_name,
      ev.obligationPerson?.personName,
      ev.obligationPerson?.person_name,
      ev.obligationPerson?.name,
      ev.obligation_person?.personName,
      ev.obligation_person?.person_name,
      ev.obligation_person?.name,
      ev.person?.name,
      ev.person?.personName
    ].filter(Boolean).map((v) => String(v).trim().toLowerCase());

    if (candidateNames.some((n) => n === target || n.includes(target) || target.includes(n))) return true;

    // Identifications / NIF / CPF
    const candidateCodes = [
      ev.obligatorIdentification,
      ev.obligator_identification,
      ev.obligationIdentifier,
      ev.obligation_identifier,
      ev.obligationPerson?.obligatorIdentification,
      ev.obligationPerson?.obligator_identification,
      ev.obligationPerson?.identification,
      ev.obligation_person?.obligatorIdentification,
      ev.obligation_person?.obligator_identification,
      ev.obligation_person?.identification
    ].filter(Boolean).map((v) => String(v).trim().toLowerCase());

    if (candidateCodes.includes(target)) return true;

    // Cross reference with timeboardPersons (only if persons loaded)
    const currentPersons = personsRef.current;
    if (currentPersons && currentPersons.length > 0) {
      for (const pid of candidateIds) {
        const matched = currentPersons.find((p) => String(p.id).trim().toLowerCase() === pid);
        if (matched) {
          const mName = String(matched.personName || matched.person_name || matched.name || '').trim().toLowerCase();
          const mCode = String(matched.obligatorIdentification || matched.obligator_identification || matched.identification || '').trim().toLowerCase();
          if (mName && (mName === target || mName.includes(target) || target.includes(mName))) return true;
          if (mCode && mCode === target) return true;
        }
      }

      // Reverse: if targetEntityId is person id, check if candidate names match that person
      const targetPerson = currentPersons.find((p) => String(p.id).trim().toLowerCase() === target);
      if (targetPerson) {
        const tpName = String(targetPerson.personName || targetPerson.person_name || targetPerson.name || '').trim().toLowerCase();
        const tpCode = String(targetPerson.obligatorIdentification || targetPerson.obligator_identification || targetPerson.identification || '').trim().toLowerCase();
        if (tpName && candidateNames.some((n) => n === tpName || n.includes(tpName) || tpName.includes(n))) return true;
        if (tpCode && candidateCodes.includes(tpCode)) return true;
      }
    }

    return false;
  }, []);

  const pendingFloatingTasks = useMemo(() => {
    return allEvents.filter((ev) => {
      if (!isFloatingTask(ev)) return false;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return false;
      return true;
    });
  }, [allEvents, selectedEntityId, isEventMatchingEntity]);

  // Events that belong on the timeline (have dates, or completed, or non-floating)
  const timelineEvents = allEvents.filter((ev) => !isFloatingTask(ev));

  // Helper to test if an event belongs to this timeline's scope
  const isEventBelongingToCurrentTimeline = useCallback((ev) => {
    if (!ev || ev.isDeleted) return false;
    if (timeline.type === TimelineType.BALANCE) {
      const isNonFinancial =
        ev.eventType === EventType.TODO ||
        ev.timelineType === TimelineType.TODO ||
        ev.timeline_type === TimelineType.TODO ||
        ev.category === EventType.TODO ||
        ev.category === 'tarefa' ||
        ev.category === 'todo' ||
        ev.eventType === EventType.FOLLOWUP ||
        ev.timelineType === TimelineType.FOLLOWUP ||
        ev.timeline_type === TimelineType.FOLLOWUP ||
        ev.category === 'followup' ||
        ev.eventType === EventType.REGISTER ||
        ev.timelineType === TimelineType.DIARY ||
        ev.timeline_type === TimelineType.DIARY;
      return !isNonFinancial;
    }
    return ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id || ev.timeline_id === timeline.id;
  }, [timeline.id, timeline.type]);

  // Extract unique entities referenced across timeline events
  const timelineEntities = useMemo(() => {
    if (!timelineEvents || timelineEvents.length === 0) return [];
    const entityMap = new Map();

    timelineEvents.forEach((ev) => {
      if (!isEventBelongingToCurrentTimeline(ev)) return;
      const pId = ev.obligationPersonId || ev.obligation_person_id;
      const pObj = ev.obligationPerson || ev.obligation_person;

      if (pId) {
        const idKey = String(pId);
        if (!entityMap.has(idKey)) {
          // Try to enhance with persons data if available
          let matchedName = '';
          let finalType = PersonType.PERSON;
          let idCode = '';

          if (persons && persons.length > 0) {
            const matched = persons.find((p) => String(p.id) === idKey);
            if (matched) {
              matchedName = matched.personName || matched.person_name || matched.name || '';
              finalType = matched.type || PersonType.PERSON;
              idCode = matched.obligatorIdentification || matched.obligator_identification || matched.identification || '';
            }
          }

          const pObjName = pObj?.personName || pObj?.person_name || pObj?.name || '';
          const evName = ev.obligationPersonName || ev.obligation_person_name || '';
          if (!idCode) {
            idCode = pObj?.obligatorIdentification || pObj?.obligator_identification || pObj?.identification || ev.obligatorIdentification || ev.obligator_identification || ev.obligationIdentifier || ev.obligation_identifier || '';
          }

          const finalName = matchedName || pObjName || evName || idCode || idKey;
          if (!finalType || finalType === PersonType.PERSON) {
            finalType = pObj?.type || PersonType.PERSON;
          }

          entityMap.set(idKey, {
            id: idKey,
            name: finalName,
            type: finalType,
            identification: idCode
          });
        }
      } else if (pObj && (pObj.id || pObj.personName || pObj.person_name || pObj.name)) {
        const idKey = String(pObj.id || pObj.personName || pObj.person_name || pObj.name);
        if (!entityMap.has(idKey)) {
          const pObjName = pObj.personName || pObj.person_name || pObj.name || '';
          const evName = ev.obligationPersonName || ev.obligation_person_name || '';
          const idCode = pObj.obligatorIdentification || pObj.obligator_identification || pObj.identification || ev.obligatorIdentification || ev.obligator_identification || '';
          const finalName = pObjName || evName || idCode || idKey;

          entityMap.set(idKey, {
            id: idKey,
            name: finalName,
            type: pObj.type || PersonType.PERSON,
            identification: idCode
          });
        }
      } else if (ev.obligationPersonName || ev.obligation_person_name || ev.obligatorIdentification || ev.obligator_identification) {
        const idKey = String(ev.obligationPersonName || ev.obligation_person_name || ev.obligatorIdentification || ev.obligator_identification);
        if (!entityMap.has(idKey)) {
          const finalName = ev.obligationPersonName || ev.obligation_person_name || ev.obligatorIdentification || ev.obligator_identification || idKey;
          entityMap.set(idKey, {
            id: idKey,
            name: finalName,
            type: PersonType.PERSON,
            identification: ev.obligatorIdentification || ev.obligator_identification || ''
          });
        }
      }
    });

    return Array.from(entityMap.values()).sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  }, [timelineEvents, isEventBelongingToCurrentTimeline]);

  const selectedEntity = useMemo(() => {
    if (!selectedEntityId) return null;
    const found = timelineEntities.find((ent) => String(ent.id) === String(selectedEntityId));
    if (found || !lockedEntityId) return found || null;
    // Locked (individual-role) entity without events in this timeline: resolve it from the timeboard persons
    const person = (persons || []).find((p) => String(p.id) === String(selectedEntityId));
    return person
      ? {
        id: person.id,
        name: person.personName || person.person_name || person.name || '',
        type: person.type || PersonType.PERSON,
        identification: person.obligatorIdentification || person.obligator_identification || ''
      }
      : null;
  }, [timelineEntities, selectedEntityId, lockedEntityId, persons]);

  // Movement history of the selected entity (printable from the individual header)
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const handleBuildHistoryHtml = useCallback((period) => {
    const months = HISTORY_PERIOD_MONTHS[period] || HISTORY_PERIOD_MONTHS[HistoryPeriod.LAST_6_MONTHS];
    const fromDate = format(subMonths(todayDate, months), 'yyyy-MM-dd');
    const settledStatus = timeline?.type === TimelineType.EXPENSE ? EventStatus.PAID : EventStatus.RECEIVED;

    const rows = timelineEvents
      .filter((ev) => (
        !ev.isSharedNotice &&
        isEventBelongingToCurrentTimeline(ev) &&
        ev.date && ev.date >= fromDate && ev.date <= todayStr &&
        ev.status !== EventStatus.DELETED &&
        isEventMatchingEntity(ev, selectedEntityId)
      ))
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((ev) => {
        let statusKey = EventStatus.PENDING;
        if (isCancelledStatus(ev.status)) statusKey = EventStatus.CANCELLED;
        else if (isPositiveStatus(ev.status)) statusKey = ev.status;
        else if (ev.isCompleted) statusKey = settledStatus;
        else if (ev.date < todayStr) statusKey = EventStatus.OVERDUE;
        return { date: ev.date, name: ev.title || ev.name || '', statusLabel: t(`status.${statusKey}`) };
      });

    return buildHistoryHtml({
      timeboard: activeTimeboard,
      currentUser,
      entityName: selectedEntity?.name || '',
      fromDate,
      toDate: todayStr,
      rows,
      language,
      t
    });
  }, [timelineEvents, isEventBelongingToCurrentTimeline, isEventMatchingEntity, selectedEntityId, selectedEntity, timeline?.type, todayStr, activeTimeboard, currentUser, language, t]);

  // On timeline switch, keep the entity filter only if the entity exists in the new timeline.
  React.useEffect(() => {
    if (lockedEntityId) return;
    if (selectedEntityId && !selectedEntity) {
      setSelectedEntityId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline?.id]);

  // Events of this timeline belonging to the selected entity, independent of
  // search/status/category/label filters (used by the individual header).
  // Capped at the end of the current month, like the entity list view.
  const currentMonthKey = format(todayDate, 'yyyy-MM');
  const entityEvents = useMemo(() => {
    if (!selectedEntityId) return [];
    return timelineEvents.filter((ev) => {
      if (ev.isSharedNotice) return false;
      if (!isEventBelongingToCurrentTimeline(ev)) return false;
      const evMonth = ev.date ? ev.date.substring(0, 7) : null;
      if (evMonth && computeFromMonth && evMonth < computeFromMonth) return false;
      if (evMonth && evMonth > currentMonthKey) return false;
      return isEventMatchingEntity(ev, selectedEntityId);
    });
  }, [timelineEvents, selectedEntityId, computeFromMonth, currentMonthKey, isEventBelongingToCurrentTimeline, isEventMatchingEntity]);

  // Events of the selected entity for the whole current calendar year (Jan - Dec),
  // used by the individual header's year progress indicator.
  const currentYearKey = format(todayDate, 'yyyy');
  const entityYearEvents = useMemo(() => {
    if (!selectedEntityId) return [];
    return timelineEvents.filter((ev) => {
      if (ev.isSharedNotice) return false;
      if (!isEventBelongingToCurrentTimeline(ev)) return false;
      if (!ev.date || !ev.date.startsWith(currentYearKey)) return false;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return false;
      return isEventMatchingEntity(ev, selectedEntityId);
    });
  }, [timelineEvents, selectedEntityId, computeFromMonth, currentYearKey, isEventBelongingToCurrentTimeline, isEventMatchingEntity]);

  // Clearance certificate: income-side timelines declare the entity owes nothing to the timeboard;
  // expense timelines declare the timeboard owes nothing to the entity.
  const handleOpenClearance = useCallback(() => {
    if (!selectedEntity) return;
    setGeneratingLabelKey('clearance.generating');
    setIsGeneratingReceipt(true);
    setTimeout(() => {
      try {
        const matchedPerson = (persons || []).find((p) => String(p.id) === String(selectedEntity.id));
        const obligationPerson = matchedPerson || {
          id: selectedEntity.id,
          name: selectedEntity.name,
          identification: selectedEntity.identification
        };
        const isExpenseTimeline = timeline?.type === TimelineType.EXPENSE;
        const isCondoDeclaration = isExpenseTimeline || timeline?.type === TimelineType.INCOME || timeline?.type === TimelineType.INVESTMENT;
        const documentType = isExpenseTimeline ? ClearanceDocumentType.SERVICE_PROVIDER : ClearanceDocumentType.OWNER;
        let html;
        let title = t('clearance.title');
        if (isCondoDeclaration) {
          const currentYear = format(todayDate, 'yyyy');
          const settledStatus = isExpenseTimeline ? EventStatus.PAID : EventStatus.RECEIVED;
          const charges = entityEvents
            .filter((ev) => ev.date && ev.date.startsWith(currentYear) && !isCancelledStatus(ev.status) && ev.status !== EventStatus.DELETED)
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((ev) => {
              let statusKey = EventStatus.PENDING;
              if (isPositiveStatus(ev.status)) statusKey = ev.status;
              else if (ev.isCompleted) statusKey = settledStatus;
              else if (ev.date < todayStr) statusKey = EventStatus.OVERDUE;
              return { date: ev.date, amount: ev.amount, statusLabel: t(`status.${statusKey}`) };
            });
          const serviceDescription = Array.from(new Set(
            entityEvents.map((ev) => (ev.title || '').trim()).filter(Boolean)
          )).join(', ');
          html = buildCondoClearanceHtml({
            timeboard: activeTimeboard,
            currentUser,
            obligationPerson,
            persons,
            charges,
            documentType,
            serviceDescription,
            language,
            t
          });
          title = isExpenseTimeline ? t('clearance.providerTitle') : t('clearance.condoTitle');
        } else {
          html = buildClearanceHtml({
            timeboard: activeTimeboard,
            currentUser,
            obligationPerson,
            persons,
            timeboardIsCreditor: true,
            language,
            t
          });
        }
        setReceiptModalData({
          isOpen: true,
          htmlContent: html,
          title
        });
      } catch (err) {
        console.error('Error generating clearance HTML:', err);
      } finally {
        setIsGeneratingReceipt(false);
      }
    }, 450);
  }, [selectedEntity, entityEvents, todayStr, persons, activeTimeboard, currentUser, timeline?.type, language, t]);


  const getEntityIcon = (type) => {
    if (type === PersonType.ORGANIZATION) return <Building2 size={13} style={{ color: TimelineColor.CYAN }} />;
    if (type === PersonType.MEMBER) return <UserCheck size={13} style={{ color: TimelineColor.SUCCESS }} />;
    return <User size={13} style={{ color: TimelineColor.PRIMARY }} />;
  };

  // Only display categories in the sidebar filter that have at least one existing event
  const availableExpenseCategoryItems = useMemo(() => {
    if (!timelineEvents || timelineEvents.length === 0) return [];
    const presentCategories = new Set(
      timelineEvents
        .filter((ev) => !ev.isDeleted)
        .map((ev) => ev.category || ev.expenseCategory || ev.type)
        .filter(Boolean)
        // Condoflow: categories outside its own list are shown as "Other"
        .map((cat) => (isCondoflow && !CONDO_EXPENSE_CATEGORY_IDS.includes(cat) ? ExpensesEventCategory.OTHER : cat))
    );
    return (isCondoflow ? CONDO_EXPENSE_CATEGORY_ITEMS : EXPENSE_CATEGORY_ITEMS).filter((cat) => presentCategories.has(cat.id));
  }, [timelineEvents, isCondoflow]);

  const availableCategoryOptions = useMemo(() => {
    if (timeline.type === TimelineType.INVESTMENT) {
      const pocketOptions = (pockets || []).map((p) => ({
        id: p.id,
        name: p.name,
        icon: <PiggyBank size={13} style={{ color: p.color || timeline.color || TimelineColor.INVESTMENT }} />,
        matches: (ev) => ev.pocketId === p.id || ev.pocket_id === p.id
      }));

      return [
        { id: EventStatus.ALL, name: t('pocket.allPockets'), icon: <Layers size={13} /> },
        { id: GENERAL_SPACE_KEY, name: t('account.general'), icon: <Landmark size={13} style={{ color: timeline.color || TimelineColor.INVESTMENT }} /> },
        ...pocketOptions
      ];
    }

    if (!timelineEvents || timelineEvents.length === 0) {
      const allTitle = timeline.type === TimelineType.INCOME
        ? t('category.all')
        : t('category.allTypes');
      return [{ id: EventStatus.ALL, name: allTitle, icon: <Layers size={13} /> }];
    }

    let allOptions = [];
    if (timeline.type === TimelineType.LOAN) {
      allOptions = [
        {
          id: EventType.LOAN_INSTALLMENT,
          name: t('category.loanInstallment'),
          icon: <CreditCard size={13} />,
          matches: (ev) => ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'parcela_emprestimo' || ev.category === LoanEventCategory.LOAN_INSTALLMENT || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao')
        },
        {
          id: EventType.AMORTIZATION,
          name: t('category.amortization'),
          icon: <TrendingDown size={13} />,
          matches: (ev) => ev.eventType === EventType.AMORTIZATION || ev.category === 'amortizacao' || ev.category === 'amortization' || ev.category === LoanEventCategory.AMORTIZATION || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT || ev.category === AmortizationStrategy.REDUCE_TERM || ev.category === AmortizationStrategy.REDUCE_INSTALLMENT
        }
      ];
    } else if (timeline.type === TimelineType.INCOME) {
      allOptions = [
        {
          id: IncomeEventCategory.SALARY,
          name: t('incomeCategories.salary'),
          icon: <DollarSign size={13} style={{ color: TimelineColor.SUCCESS }} />,
          matches: (ev) => {
            const c = (ev.category || '').toLowerCase();
            return c === IncomeEventCategory.SALARY || c === 'salario';
          }
        },
        {
          id: IncomeEventCategory.MEAL_ALLOWANCE,
          name: t('incomeCategories.meal_allowance'),
          icon: <Utensils size={13} style={{ color: TimelineColor.WARNING }} />,
          matches: (ev) => {
            const c = (ev.category || '').toLowerCase();
            return c === IncomeEventCategory.MEAL_ALLOWANCE || c === 'subsidio_alimentacao';
          }
        },
        {
          id: IncomeEventCategory.BONUS,
          name: t('incomeCategories.bonus'),
          icon: <Sparkles size={13} style={{ color: TimelineColor.PURPLE }} />,
          matches: (ev) => {
            const c = (ev.category || '').toLowerCase();
            return c === IncomeEventCategory.BONUS;
          }
        },
        {
          id: IncomeEventCategory.FREELANCE,
          name: t('incomeCategories.freelance'),
          icon: <Zap size={13} style={{ color: TimelineColor.CYAN }} />,
          matches: (ev) => {
            const c = (ev.category || '').toLowerCase();
            return c === IncomeEventCategory.FREELANCE || c === 'freelancer';
          }
        },
        {
          id: IncomeEventCategory.INVESTMENT_RETURN,
          name: t('incomeCategories.investment_return'),
          icon: <TrendingUp size={13} style={{ color: TimelineColor.BLUE }} />,
          matches: (ev) => {
            const c = (ev.category || '').toLowerCase();
            return c === IncomeEventCategory.INVESTMENT_RETURN || c === 'rendimentos' || c === 'dividendos';
          }
        },
        {
          id: IncomeEventCategory.RECURRING_INCOME,
          name: t('incomeCategories.recurring_income'),
          icon: <Repeat size={13} style={{ color: TimelineColor.EMERALD }} />,
          matches: (ev) => {
            const c = (ev.category || '').toLowerCase();
            return c === IncomeEventCategory.RECURRING_INCOME || c === 'renda_recorrente' || c === 'recurring';
          }
        },
        {
          id: IncomeEventCategory.CONDO_PAYMENT,
          name: t('incomeCategories.condo_payment'),
          icon: <Home size={13} style={{ color: TimelineColor.CONDOFLOW }} />,
          matches: (ev) => (ev.category || '').toLowerCase() === IncomeEventCategory.CONDO_PAYMENT
        },
        {
          id: IncomeEventCategory.RESERVE_FUND,
          name: t('incomeCategories.reserve_fund'),
          icon: <ShieldCheck size={13} style={{ color: TimelineColor.INVESTMENT }} />,
          matches: (ev) => (ev.category || '').toLowerCase() === IncomeEventCategory.RESERVE_FUND
        },
        {
          id: IncomeEventCategory.OTHER,
          name: t('incomeCategories.other'),
          icon: <Tag size={13} style={{ color: TimelineColor.SLATE }} />,
          matches: (ev) => {
            const c = (ev.category || '').toLowerCase();
            const allKnown = Object.values(IncomeEventCategory).map((v) => v.toLowerCase());
            return c === IncomeEventCategory.OTHER || !allKnown.includes(c);
          }
        }
      ];
    } else {
      allOptions = [
        { id: 'schedule', name: t('category.schedule'), icon: <Calendar size={13} />, matches: (ev) => ev.category === 'schedule' || ev.eventType === 'schedule' },
        { id: 'repetitive', name: t('category.repetitive'), icon: <Repeat size={13} />, matches: (ev) => ev.category === 'repetitive' || ev.eventType === 'repetitive' },
        { id: 'task', name: t('category.task'), icon: <Pin size={13} />, matches: (ev) => ev.category === 'task' || ev.eventType === 'task' },
        { id: 'note', name: t('category.note'), icon: <FileText size={13} />, matches: (ev) => ev.category === 'note' || ev.eventType === 'note' }
      ];
    }

    const filteredOptions = allOptions.filter((opt) =>
      timelineEvents.some((ev) => !ev.isDeleted && (opt.matches ? opt.matches(ev) : (ev.category === opt.id || ev.eventType === opt.id)))
    );

    const allTitle = timeline.type === TimelineType.INCOME
      ? t('category.all')
      : t('category.allTypes');

    return [
      { id: EventStatus.ALL, name: allTitle, icon: <Layers size={13} /> },
      ...filteredOptions
    ];
  }, [timelineEvents, timeline.type, timeline.color, pockets, t]);

  const isBalancoView = timeline.type === TimelineType.BALANCE;

  // Determine earliest and latest dates in timeline dynamically
  const currentMonthStart = startOfMonth(todayDate);
  const currentMonthEnd = endOfMonth(todayDate);

  const effectivePastYears = Math.max(1, pastHorizonYears);
  // Events are shown from the month they start in: extend the past horizon to the earliest event of this timeline
  const earliestEventDate = useMemo(() => {
    let earliest = null;
    timelineEvents.forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted || !isEventBelongingToCurrentTimeline(ev)) return;
      if (!earliest || ev.date < earliest) earliest = ev.date;
    });
    return earliest;
  }, [timelineEvents, isEventBelongingToCurrentTimeline]);
  const horizonStartDateObj = subMonths(currentMonthStart, effectivePastYears * 12);
  const earliestEventMonthStart = earliestEventDate ? startOfMonth(parseISO(earliestEventDate)) : null;
  const defaultStartDateObj = earliestEventMonthStart && earliestEventMonthStart < horizonStartDateObj
    ? earliestEventMonthStart
    : horizonStartDateObj;

  // Selected period: a year (optionally with a month) renders only that range;
  // a month alone (e.g. every August) renders that month of every year up to the current one
  const isPeriodActive = periodYear !== '' || periodMonth !== '';
  const periodMonthIndex = periodMonth !== '' ? Number(periodMonth) : null;
  const periodRange = useMemo(() => {
    if (!periodYear) return null;
    const year = Number(periodYear);
    const start = periodMonth !== '' ? new Date(year, Number(periodMonth), 1) : new Date(year, 0, 1);
    const end = periodMonth !== '' ? endOfMonth(start) : new Date(year, 11, 31);
    return { start, end, startStr: format(start, 'yyyy-MM-dd'), endStr: format(end, 'yyyy-MM-dd') };
  }, [periodYear, periodMonth]);

  // Years available in the period filter: from the timeboard's calculation start (or the earliest event
  // of this timeline, whichever comes first) up to the current year
  const periodYearOptions = useMemo(() => {
    const currentYear = todayDate.getFullYear();
    const years = new Set([currentYear]);
    if (computeFromMonth) years.add(Number(computeFromMonth.substring(0, 4)));
    timelineEvents.forEach((ev) => {
      if (ev?.date && isEventBelongingToCurrentTimeline(ev)) years.add(Number(ev.date.substring(0, 4)));
    });
    const list = [...years].filter((y) => y && y <= currentYear);
    const min = Math.min(...list);
    const max = currentYear;
    return Array.from({ length: max - min + 1 }, (_, i) => max - i);
  }, [timelineEvents, isEventBelongingToCurrentTimeline, computeFromMonth]);

  const startDateObj = periodRange ? periodRange.start : defaultStartDateObj;
  const maxDateObj = periodRange
    ? periodRange.end
    : (periodMonthIndex !== null ? new Date(todayDate.getFullYear(), 11, 31) : addMonths(currentMonthEnd, Math.max(1, futureHorizonYears) * 12));

  // A search made only of digits (optionally prefixed by "REC") also finds the receipt number of the occurrence
  const matchesReceiptNumber = (ev, query) => {
    const receiptNumber = ev.cont_year ?? ev.contYear;
    if (receiptNumber == null || Number(receiptNumber) <= 0) return false;
    const match = String(query).trim().match(/^(?:rec\.?\s*)?(\d+)$/i);
    return Boolean(match) && String(receiptNumber).includes(match[1]);
  };

  // Filter events based on search query, status, category, and label
  const {
    filteredEvents
  } = useTimelineFilteredEvents({
    activeFinancialTab,
    computeFromMonth,
    isCondoflow,
    isEventMatchingEntity,
    isFinancialTimeline,
    isListView,
    isPeriodActive,
    matchesReceiptNumber,
    maxDateObj,
    periodMonthIndex,
    periodRange,
    searchQuery,
    selectedCategoryFilter,
    selectedEntityId,
    selectedExpenseCategories,
    selectedLabelFilter,
    selectedMovementTypes,
    selectedOutflowTypes,
    selectedStatusFilters,
    selectedTimelineIds,
    showSharedPosts,
    showSharedReminders,
    startDateObj,
    timeline,
    timelineEvents,
    todayDate,
    todayStr
  });

  // Shared notice types present in this timeline and the color of their own timeline
  const sharedNoticeToggles = useMemo(() => {
    const colors = new Map();
    timelineEvents.forEach((ev) => {
      if (ev.isSharedNotice && !colors.has(ev.timelineType)) {
        colors.set(ev.timelineType, ev.timelineOriginColor || getDefaultTimelineColor(ev.timelineType));
      }
    });
    return [
      { type: TimelineType.REMINDER, label: t('timeline.reminders'), isOn: showSharedReminders, toggle: () => setShowSharedReminders((v) => !v) },
      { type: TimelineType.DIARY, label: t('timeline.posts'), isOn: showSharedPosts, toggle: () => setShowSharedPosts((v) => !v) }
    ]
      .filter((item) => colors.has(item.type))
      .map((item) => ({ ...item, color: colors.get(item.type) }));
  }, [timelineEvents, showSharedReminders, showSharedPosts, t]);


  // Map events by date (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = {};
    filteredEvents.forEach((ev) => {
      if (!map[ev.date]) {
        map[ev.date] = [];
      }
      map[ev.date].push(ev);
    });
    Object.values(map).forEach((list) => {
      list.sort(dayComparator);
    });
    return map;
  }, [filteredEvents, dayComparator]);

  // Generate array of days only when day-view is active
  const daysArray = useMemo(() => {
    if (groupBy !== 'day') return [];
    if (!showEmptyDays) {
      const datesSet = new Set(Object.keys(eventsByDate));
      datesSet.add(todayStr);
      return Array.from(datesSet)
        .sort((a, b) => b.localeCompare(a))
        .map((dStr) => {
          try {
            return parseISO(dStr);
          } catch {
            return todayDate;
          }
        });
    }
    try {
      const daysAscending = eachDayOfInterval({
        start: startDateObj,
        end: maxDateObj
      });
      return daysAscending.reverse();
    } catch {
      return [todayDate];
    }
  }, [groupBy, showEmptyDays, eventsByDate, todayStr, startDateObj.getTime(), maxDateObj.getTime(), todayDate]);

  // ========================================================
  // RENDER ENGINES BY GROUPBY MODE
  // ========================================================




  // Month-by-month flows from the shared financial engine (shared/finance): one pass over the events,
  // references and cancelled movements excluded, scoped to the active timelines / entity / selected lines
  const {
    monthExpensesRealizedMap,
    monthExpensesTotalMap,
    monthIncomeRealizedMap,
    monthIncomeTotalMap,
    monthInvestmentsDeductionsMap,
    monthInvestmentsDeductionsRealizedMap,
    monthInvestmentsExternalMap,
    monthInvestmentsExternalRealizedMap,
    monthInvestmentsRealizedMap,
    monthInvestmentsTotalMap,
    monthLoansRealizedMap,
    monthLoansTotalMap
  } = useTimelineMonthlyFlows({
    computeFromMonth,
    effectiveTimelines,
    inactiveTimelineIdSet,
    isEventMatchingEntity,
    isEventTimelineActive,
    selectedEntityId,
    selectedTimelineIds,
    timeline,
    timelineEvents,
    timelines
  });

  const monthsList = useMemo(() => {
    const monthMap = new Map();

    try {
      const allMonthsDesc = eachMonthOfInterval({
        start: startDateObj,
        end: maxDateObj
      }).reverse().filter((mDate) => periodMonthIndex === null || mDate.getMonth() === periodMonthIndex);

      allMonthsDesc.forEach((mDate) => {
        const monthKey = format(mDate, 'yyyy-MM');
        monthMap.set(monthKey, {
          monthDate: mDate,
          events: [],
          groupedDateEvents: []
        });
      });
    } catch {
      monthMap.set(format(todayDate, 'yyyy-MM'), { monthDate: todayDate, events: [], groupedDateEvents: [] });
    }

    filteredEvents.forEach((ev) => {
      if (!ev || !ev.date) return;
      const monthKey = ev.date.substring(0, 7);
      if (monthMap.has(monthKey)) {
        monthMap.get(monthKey).events.push(ev);
      }
    });

    monthMap.forEach((mEntry) => {
      mEntry.events.sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        const timeA = a.time || '00:00';
        const timeB = b.time || '00:00';
        if (timeA !== timeB) return timeB.localeCompare(timeA);
        const titleCmp = (b.title || '').localeCompare(a.title || '');
        if (titleCmp !== 0) return titleCmp;
        return String(b.id || '').localeCompare(String(a.id || ''));
      });
      mEntry.groupedDateEvents = groupEventsByDate(mEntry.events, dayComparator);
    });

    return Array.from(monthMap.values());
  }, [filteredEvents, startDateObj, maxDateObj, todayDate, periodMonthIndex, dayComparator]);






  return (
    <EventActionsProvider value={eventActions}>
    <div className="timeline-workspace-layout">
      {/* 🧭 Left Filter Sidebar Cockpit */}
      <TimelineSidebar
        activeFinancialTab={activeFinancialTab}
        availableCategoryOptions={availableCategoryOptions}
        availableCreditOptions={availableCreditOptions}
        availableExpenseCategoryItems={availableExpenseCategoryItems}
        collapsedSections={collapsedSections}
        getEntityIcon={getEntityIcon}
        getStatusFilterOptions={getStatusFilterOptions}
        isCondoflow={isCondoflow}
        isListView={isListView}
        isPeriodActive={isPeriodActive}
        isReadOnly={isReadOnly}
        isTimelineDropdownOpen={isTimelineDropdownOpen}
        onCreateTimeline={onCreateTimeline}
        onNavigateToTimeline={onNavigateToTimeline}
        onSelectFinancialTab={onSelectFinancialTab}
        periodMonth={periodMonth}
        periodYear={periodYear}
        periodYearOptions={periodYearOptions}
        renderFilterSwitch={renderFilterSwitch}
        searchQuery={searchQuery}
        selectAllExpenseCategories={selectAllExpenseCategories}
        selectAllStatuses={selectAllStatuses}
        selectAllTimelines={selectAllTimelines}
        selectedCategoryFilter={selectedCategoryFilter}
        selectedEntityId={selectedEntityId}
        selectedExpenseCategories={selectedExpenseCategories}
        selectedMovementTypes={selectedMovementTypes}
        selectedOutflowTypes={selectedOutflowTypes}
        selectedStatusFilters={selectedStatusFilters}
        selectedTimelineIds={selectedTimelineIds}
        setIsTimelineDropdownOpen={setIsTimelineDropdownOpen}
        setPeriodMonth={setPeriodMonth}
        setPeriodYear={setPeriodYear}
        setSearchQuery={setSearchQuery}
        setSelectedCategoryFilter={setSelectedCategoryFilter}
        setSelectedEntityId={setSelectedEntityId}
        setSelectedExpenseCategories={setSelectedExpenseCategories}
        setSelectedMovementTypes={setSelectedMovementTypes}
        setSelectedOutflowTypes={setSelectedOutflowTypes}
        t={t}
        timeline={timeline}
        timelineDropdownRef={timelineDropdownRef}
        timelineEntities={timelineEntities}
        timelineOptions={timelineOptions}
        timelines={timelines}
        toggleExpenseCategory={toggleExpenseCategory}
        toggleSectionCollapse={toggleSectionCollapse}
        toggleStatusFilter={toggleStatusFilter}
        toggleTimelineSelection={toggleTimelineSelection}
      />

      {/* 📜 Right Timeline Content Stream */}
      <div className="timeline-content-stream">
        {/* Sticky Header Dock */}
        <div className="sticky-header-dock">
          {React.isValidElement(headerComponent)
            ? React.cloneElement(headerComponent, {
              filteredEvents: Boolean(selectedEntityId) || (timeline.type === TimelineType.EXPENSE && selectedExpenseCategories.length > 0) || (timeline.type === TimelineType.INVESTMENT && selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos') || (timeline.type === TimelineType.INCOME && selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos') ? filteredEvents : undefined,
              events: Boolean(selectedEntityId) ? filteredEvents : undefined,
              allEvents: Boolean(selectedEntityId) ? (timeline.type === TimelineType.BALANCE ? filteredEvents : undefined) : undefined,
              selectedExpenseCategories: timeline.type === TimelineType.EXPENSE ? selectedExpenseCategories : undefined,
              selectedCategoryFilter: (timeline.type === TimelineType.INVESTMENT || timeline.type === TimelineType.INCOME) ? selectedCategoryFilter : undefined,
              selectedPocketId: timeline.type === TimelineType.INVESTMENT && selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos' ? selectedCategoryFilter : undefined,
              selectedEntityId,
              selectedEntity,
              entityEvents,
              entityYearEvents,
              onOpenClearance: timeline.type !== TimelineType.BALANCE ? handleOpenClearance : undefined,
              onOpenHistory: () => setIsHistoryOpen(true),
              monthExpensesTotalMap,
              monthLoansTotalMap,
              monthIncomeTotalMap,
              monthInvestmentsTotalMap,
              monthInvestmentsDeductionsMap,
              hasExpenseTimeline,
              hasLoanTimeline,
              hasIncomeTimeline,
              hasInvestmentTimeline,
              computeFromMonth
            })
            : headerComponent}
        </div>

        {/* 📌 Pilha de Tarefas Pendentes (apenas para timelines de projeto/gerais, oculta em Financeiro, Entradas, Empréstimos e Principal) */}
        {!isFinancialTimeline && !isReadOnly && (
          <FloatingTaskStack
            pendingTasks={pendingFloatingTasks}
            onCompleteTask={onCompleteFloatingTask}
            onAddFloatingTask={onAddFloatingTask}
            onUpdatePriority={onUpdateFloatingTaskPriority}
            onToggleTask={onToggleTask}
            onAddChecklistItem={onAddChecklistItem}
            onDeleteChecklistItem={onDeleteChecklistItem}
          />
        )}

        {/* Render Selected Timeline View or Filtered Status/Category/Search Stack List */}
        <div key={`${timeline.id}-${activeFinancialTab || 'all'}-${groupBy}-${selectedStatusFilters.join(',')}-${selectedExpenseCategories.join(',')}-${selectedCategoryFilter}-${searchQuery}-${selectedEntityId || ''}`} className="timeline-view-wrapper">
          {isListView ? (
            <TimelineFilteredListView
              activeFinancialTab={activeFinancialTab}
              activeTimeboard={activeTimeboard}
              dayComparator={dayComparator}
              effectiveTimelines={effectiveTimelines}
              filteredEvents={filteredEvents}
              handleOpenReceipt={handleOpenReceipt}
              isBalancoView={isBalancoView}
              isFinancialTimeline={isFinancialTimeline}
              isLoanTimelineOrTab={isLoanTimelineOrTab}
              isReminders={isReminders}
              onAddChecklistItem={onAddChecklistItem}
              onAddEventForDate={onAddEventForDate}
              onDeleteChecklistItem={onDeleteChecklistItem}
              onDeleteEvent={onDeleteEvent}
              onEditEvent={onEditEvent}
              onNavigateToTimeline={onNavigateToTimeline}
              onOpenCreatePocket={onOpenCreatePocket}
              onOpenEditInstallment={onOpenEditInstallment}
              onPayUpToHere={onPayUpToHere}
              onToggleLoanPayment={onToggleLoanPayment}
              onToggleTask={onToggleTask}
              onUpdateEventDirect={onUpdateEventDirect}
              paletteTheme={paletteTheme}
              resetAllFilters={resetAllFilters}
              sharedNoticeToggles={sharedNoticeToggles}
              t={t}
              timeline={timeline}
              timelines={timelines}
              todayStr={todayStr}
            />
          ) : (
            <>
              {groupBy === 'semana' && <TimelineWeekView
                activeFinancialTab={activeFinancialTab}
                dateLocale={dateLocale}
                dayComparator={dayComparator}
                effectiveTimelines={effectiveTimelines}
                filteredEvents={filteredEvents}
                handleOpenReceipt={handleOpenReceipt}
                language={language}
                onAddEventForDate={onAddEventForDate}
                onDeleteEvent={onDeleteEvent}
                onEditEvent={onEditEvent}
                onLoadMoreFuture={onLoadMoreFuture}
                onLoadMorePast={onLoadMorePast}
                onNavigateToTimeline={onNavigateToTimeline}
                onOpenEditInstallment={onOpenEditInstallment}
                onPayUpToHere={onPayUpToHere}
                onToggleLoanPayment={onToggleLoanPayment}
                onToggleTask={onToggleTask}
                onUpdateEventDirect={onUpdateEventDirect}
                paletteTheme={paletteTheme}
                persons={persons}
                showEmptyDays={showEmptyDays}
                t={t}
                timeline={timeline}
                timelines={timelines}
                todayDate={todayDate}
              />}
              {groupBy === 'mes' && <TimelineMonthView
                activeFinancialTab={activeFinancialTab}
                activeTimeboard={activeTimeboard}
                computeFromMonth={computeFromMonth}
                dateLocale={dateLocale}
                dayComparator={dayComparator}
                effectiveTimelines={effectiveTimelines}
                handleOpenReceipt={handleOpenReceipt}
                hasExpenseTimeline={hasExpenseTimeline}
                hasIncomeTimeline={hasIncomeTimeline}
                hasInvestmentTimeline={hasInvestmentTimeline}
                hasLoanTimeline={hasLoanTimeline}
                isBalancoView={isBalancoView}
                isFinancial={isFinancial}
                isFinancialTimeline={isFinancialTimeline}
                isLoanTimelineOrTab={isLoanTimelineOrTab}
                isReadOnly={isReadOnly}
                isReminders={isReminders}
                monthExpensesRealizedMap={monthExpensesRealizedMap}
                monthExpensesTotalMap={monthExpensesTotalMap}
                monthIncomeRealizedMap={monthIncomeRealizedMap}
                monthIncomeTotalMap={monthIncomeTotalMap}
                monthInvestmentsDeductionsMap={monthInvestmentsDeductionsMap}
                monthInvestmentsDeductionsRealizedMap={monthInvestmentsDeductionsRealizedMap}
                monthInvestmentsExternalMap={monthInvestmentsExternalMap}
                monthInvestmentsExternalRealizedMap={monthInvestmentsExternalRealizedMap}
                monthInvestmentsRealizedMap={monthInvestmentsRealizedMap}
                monthInvestmentsTotalMap={monthInvestmentsTotalMap}
                monthLoansRealizedMap={monthLoansRealizedMap}
                monthLoansTotalMap={monthLoansTotalMap}
                monthProjectionMode={monthProjectionMode}
                monthsList={monthsList}
                onAddChecklistItem={onAddChecklistItem}
                onAddEventForDate={onAddEventForDate}
                onDeleteChecklistItem={onDeleteChecklistItem}
                onDeleteEvent={onDeleteEvent}
                onDeletePocket={onDeletePocket}
                onEditEvent={onEditEvent}
                onEditPocket={onEditPocket}
                onLoadMoreFuture={onLoadMoreFuture}
                onLoadMorePast={onLoadMorePast}
                onNavigateToTimeline={onNavigateToTimeline}
                onOpenAmortizationModal={onOpenAmortizationModal}
                onOpenCreatePocket={onOpenCreatePocket}
                onOpenEditInstallment={onOpenEditInstallment}
                onOpenWithdrawModal={onOpenWithdrawModal}
                onPayUpToHere={onPayUpToHere}
                onToggleLoanPayment={onToggleLoanPayment}
                onToggleTask={onToggleTask}
                onUpdateEventDirect={onUpdateEventDirect}
                paletteTheme={paletteTheme}
                persons={persons}
                pockets={pockets}
                selectedCategoryFilter={selectedCategoryFilter}
                setMonthProjectionMode={setMonthProjectionMode}
                showEmptyDays={showEmptyDays}
                t={t}
                timeline={timeline}
                timelines={timelines}
                todayDate={todayDate}
              />}
              {groupBy === 'ano' && <TimelineYearView
            monthsList={monthsList}
                activeFinancialTab={activeFinancialTab}
                dateLocale={dateLocale}
                dayComparator={dayComparator}
                effectiveTimelines={effectiveTimelines}
                handleOpenReceipt={handleOpenReceipt}
                onAddEventForDate={onAddEventForDate}
                onDeleteEvent={onDeleteEvent}
                onEditEvent={onEditEvent}
                onLoadMoreFuture={onLoadMoreFuture}
                onLoadMorePast={onLoadMorePast}
                onNavigateToTimeline={onNavigateToTimeline}
                onOpenEditInstallment={onOpenEditInstallment}
                onPayUpToHere={onPayUpToHere}
                onToggleLoanPayment={onToggleLoanPayment}
                onToggleTask={onToggleTask}
                onUpdateEventDirect={onUpdateEventDirect}
                paletteTheme={paletteTheme}
                showEmptyDays={showEmptyDays}
                t={t}
                timeline={timeline}
                timelines={timelines}
                todayDate={todayDate}
              />}
              {groupBy === 'dia' && <TimelineDayView
                activeFinancialTab={activeFinancialTab}
                dateLocale={dateLocale}
                daysArray={daysArray}
                effectiveTimelines={effectiveTimelines}
                eventsByDate={eventsByDate}
                handleOpenReceipt={handleOpenReceipt}
                onAddEventForDate={onAddEventForDate}
                onDeleteEvent={onDeleteEvent}
                onEditEvent={onEditEvent}
                onLoadMoreFuture={onLoadMoreFuture}
                onLoadMorePast={onLoadMorePast}
                onNavigateToTimeline={onNavigateToTimeline}
                onOpenEditInstallment={onOpenEditInstallment}
                onPayUpToHere={onPayUpToHere}
                onToggleLoanPayment={onToggleLoanPayment}
                onToggleTask={onToggleTask}
                onUpdateEventDirect={onUpdateEventDirect}
                paletteTheme={paletteTheme}
                showEmptyDays={showEmptyDays}
                t={t}
                timeline={timeline}
                timelines={timelines}
                todayStr={todayStr}
              />}
            </>
          )}
        </div>

        {/* Fallback if no matching events when in normal timeline mode */}
        {selectedStatusFilters.length === 0 && filteredEvents.length === 0 && !showEmptyDays && (
          <div className="empty-timeline-state glass-panel">
            <div className="empty-icon">
              <Calendar size={28} />
            </div>
            <h3>{t('timeline.noEventsFound')}</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              {t('timeline.noEventsFoundDesc')}
            </p>
            {!isBalancoView && (
              <button
                className="btn btn-primary btn-sm"
                style={{ marginTop: '16px' }}
                onClick={() => onAddEventForDate?.(todayStr)}
              >
                <Plus size={16} /> {t('timeline.addEventToday')}
              </button>
            )}
          </div>
        )}

        {/* Modal de Impressão do Histórico de Movimentações */}
        {isHistoryOpen && (
          <HistoryPrintModal
            isOpen={isHistoryOpen}
            onClose={() => setIsHistoryOpen(false)}
            buildHtml={handleBuildHistoryHtml}
          />
        )}

        {/* Modal de Impressão / Pré-visualização do Recibo */}
        {receiptModalData && receiptModalData.isOpen && (
          <ReceiptModal
            isOpen={receiptModalData.isOpen}
            onClose={() => setReceiptModalData(null)}
            htmlContent={receiptModalData.htmlContent}
            title={receiptModalData.title}
            onPrint={handleReceiptPrint}
            date={receiptModalData.receiptDate}
            onDateChange={receiptModalData.targetEvent ? handleReceiptDateChange : undefined}
            onSaveDate={receiptModalData.targetEvent ? handleSaveReceiptDate : undefined}
            receiptNumber={receiptModalData.receiptNumber}
            canEditReceiptNumber={Boolean(receiptModalData.targetEvent && receiptModalData.canEditReceiptNumber)}
            onSaveReceiptNumber={receiptModalData.targetEvent ? handleSaveReceiptNumber : undefined}
          />
        )}

        {/* Overlay elegante enquanto gera o documento */}
        {isGeneratingReceipt && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'var(--overlay-backdrop)',
              backdropFilter: 'blur(4px)',
              zIndex: 10000,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '12px'
            }}
          >
            <Loader2 size={36} className="spin" style={{ color: 'var(--primary-light)' }} />
            <div style={{ color: TimelineColor.WHITE, fontSize: '1rem', fontWeight: '700' }}>
              {t(generatingLabelKey)}
            </div>
          </div>
        )}
      </div>
    </div>
    </EventActionsProvider>
  );
}

export default React.memo(VerticalTimeline);
