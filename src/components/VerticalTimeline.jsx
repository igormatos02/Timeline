import React, { useState, useMemo, useCallback } from 'react';
import {
  format,
  parseISO,
  eachDayOfInterval,
  eachMonthOfInterval,
  subDays,
  startOfWeek,
  endOfWeek,
  isSameWeek,
  isSameMonth,
  getWeek,
  addYears,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  differenceInCalendarMonths
} from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import {
  Plus,
  Search,
  Calendar,
  Eye,
  EyeOff,
  Layers,
  Clock,
  Sparkles,
  Tag,
  Pin,
  Repeat,
  BookOpen,
  Filter,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Scale,
  ShoppingCart,
  PiggyBank,
  Landmark,
  CheckCircle2,
  AlertCircle,
  Play,
  CheckSquare,
  ListTree,
  Home,
  Car,
  CreditCard,
  Gift,
  ArrowUp,
  ArrowDown,
  FileText,
  Zap,
  Activity,
  Bell,
  FolderKanban,
  Utensils,
  Droplets,
  Flame,
  Wifi,
  Bus,
  HeartPulse,
  GraduationCap,
  Film,
  ShoppingBag,
  Shirt,
  Wrench,
  Hammer,
  ShieldCheck,
  Dog,
  Plane,
  Target,
  ArrowDownRight,
  Pencil,
  Trash2,
  ChevronDown,
  Users,
  User,
  Building2,
  UserCheck,
  Loader2,
  Printer
} from 'lucide-react';
import TimelineEventCard from './TimelineEventCard';
import { compareEventsWithinDay } from '../utils/eventSorting.js';
import MonthProjectionBadges from './MonthProjectionBadges.jsx';
import FloatingTaskStack from './FloatingTaskStack';
import { getGroupingForPeriodicity } from '../utils/loanCalculations';
import { formatCurrency } from '../utils/formatCurrency';
import { getPaletteTheme } from '../../shared/config/colorPalettes.js';
import {
  EventType,
  EventStatus,
  EventStatusLabel,
  TimelineType,
  TimelineStatus,
  TimeboardType,
  TimelineColor,
  IncomeEventCategory,
  ExpensesEventCategory,
  InvestmentEventCategory,
  LoanEventCategory,
  AmortizationEventCategory,
  AmortizationStrategy,
  EventPeriodicity,
  FollowupStatus,
  PersonType,
  normalizePeriodicity,
  normalizeTimelineType,
  isLoanTimelineType,
  isPositiveStatus,
  isCancelledStatus,
  isNegativeStatus
} from '../enums/index.js';
import { getTimelineDropdownOptions } from '../utils/timelineConfig.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const EXPENSE_CATEGORY_ITEMS = [
  { id: ExpensesEventCategory.FOOD, icon: Utensils, color: TimelineColor.EMERALD },
  { id: ExpensesEventCategory.RENT, icon: Home, color: TimelineColor.PRIMARY },
  { id: ExpensesEventCategory.ELECTRICITY, icon: Zap, color: TimelineColor.WARNING },
  { id: ExpensesEventCategory.WATER, icon: Droplets, color: TimelineColor.CYAN },
  { id: ExpensesEventCategory.GAS, icon: Flame, color: TimelineColor.AMBER },
  { id: ExpensesEventCategory.COMMUNICATIONS, icon: Wifi, color: TimelineColor.BLUE },
  { id: ExpensesEventCategory.TRANSPORTATION, icon: Bus, color: TimelineColor.PURPLE },
  { id: ExpensesEventCategory.HEALTH, icon: HeartPulse, color: TimelineColor.DANGER },
  { id: ExpensesEventCategory.EDUCATION, icon: GraduationCap, color: TimelineColor.SUCCESS },
  { id: ExpensesEventCategory.ENTERTAINMENT, icon: Film, color: TimelineColor.PINK },
  { id: ExpensesEventCategory.SHOPPING, icon: ShoppingBag, color: TimelineColor.EXPENSE },
  { id: ExpensesEventCategory.CLOTHING, icon: Shirt, color: TimelineColor.VIOLET },
  { id: ExpensesEventCategory.CARMAINTENANCE, icon: Wrench, color: TimelineColor.WARNING },
  { id: ExpensesEventCategory.HOUSE, icon: Hammer, color: TimelineColor.SUCCESS },
  { id: ExpensesEventCategory.ENSURANCE, icon: ShieldCheck, color: TimelineColor.INFO },
  { id: ExpensesEventCategory.PETS, icon: Dog, color: TimelineColor.AMBER },
  { id: ExpensesEventCategory.TRAVEL, icon: Plane, color: TimelineColor.CYAN },
  { id: ExpensesEventCategory.PERSONAL_CARE, icon: Sparkles, color: TimelineColor.ROSE },
  { id: ExpensesEventCategory.SERVICES, icon: CreditCard, color: TimelineColor.SLATE },
];

import * as api from '../services/api.js';
import ReceiptModal from './modals/ReceiptModal.jsx';
import { buildReceiptHtml, computeReceiptNumber, computeNextReceiptNumber } from '../utils/receiptGenerator.js';

const groupEventsByDate = (events = []) => {
  const groups = [];
  const map = new Map();
  for (const ev of events) {
    const dateKey = ev.date || ev.dueDate || 'no-date';
    if (!map.has(dateKey)) {
      const group = { date: dateKey, events: [] };
      map.set(dateKey, group);
      groups.push(group);
    }
    map.get(dateKey).events.push(ev);
  }
  for (const group of groups) {
    group.events.sort(compareEventsWithinDay);
  }
  return groups;
};

function VerticalTimeline({
  timeline,
  timelines = [],
  activeTimeboard = null,
  currentUser = null,
  activeFinancialTab = '',
  pockets = [],
  persons = [],
  onOpenCreatePocket,
  onEditPocket,
  onDeletePocket,
  onSelectFinancialTab,
  onEditEvent,
  onUpdateEventDirect,
  onDeleteEvent,
  onToggleTask,
  onAddEventForDate,
  onCompleteFloatingTask,
  onAddFloatingTask,
  onUpdateFloatingTaskPriority,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onToggleLoanPayment,
  onPayUpToHere,
  onOpenEditInstallment,
  onOpenAmortizationModal,
  onOpenWithdrawModal,
  onNavigateToTimeline,
  onCreateTimeline,
  headerComponent,
  futureHorizonYears = 1,
  pastHorizonYears = 1,
  onLoadMoreFuture,
  onLoadMorePast
}) {
  const { language, t } = useTranslation();
  const dateLocale = language === 'en' ? enUS : pt;

  const isFinancialTimeline = [
    TimelineType.BALANCE,
    TimelineType.INCOME,
    TimelineType.EXPENSE,
    TimelineType.INVESTMENT,
    TimelineType.LOAN
  ].includes(timeline.type);

  const isLoanTimelineOrTab = isLoanTimelineType(timeline.type);
  const isInvestmentTimelineOrTab = normalizeTimelineType(timeline.type) === TimelineType.INVESTMENT;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilters, setSelectedStatusFilters] = useState([]);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState(EventStatus.ALL);
  const [selectedEntityId, setSelectedEntityId] = useState(null);
  const [selectedLabelFilter, setSelectedLabelFilter] = useState(EventStatus.ALL);
  const [showEmptyDays, setShowEmptyDays] = useState(true);
  const [monthProjectionMode, setMonthProjectionMode] = useState('realized');
  const [collapsedSections, setCollapsedSections] = useState({
    timelines: false,
    status: false,
    integratedTimelines: false,
    categories: false,
    entities: false
  });

  // Receipt Modal and Generation Overlay State
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);

  const handleReceiptPrint = useCallback(async () => {
    if (!receiptModalData || !receiptModalData.receiptNumber || !receiptModalData.timelineId) return;
    const { receiptNumber, timelineId, targetEvent } = receiptModalData;

    // Se o evento já possuía cont_year, não avança o contador da timeline
    const hadEventContYear = Boolean(
      (targetEvent?.contYear && targetEvent.contYear > 0) ||
      (targetEvent?.cont_year && targetEvent.cont_year > 0)
    );

    // Salvar o receiptNumber no status do evento na tabela financial_event_status
    if (targetEvent?.id) {
      targetEvent.contYear = receiptNumber;
      targetEvent.cont_year = receiptNumber;
      try {
        await api.setEventStatus(targetEvent.id, {
          date: targetEvent.date,
          status: targetEvent.status,
          contYear: receiptNumber,
          cont_year: receiptNumber,
          timelineId: targetEvent.timelineId || timelineId,
          timeboardId: activeTimeboard?.id
        });
      } catch (err) {
        console.error('Error saving cont_year in event status:', err);
      }
    }

    // Se o evento ainda NÃO tinha cont_year próprio, incrementa o contador da timeline
    if (!hadEventContYear) {
      const nextReceiptNumber = computeNextReceiptNumber(receiptNumber);

      // Atualiza imediatamente em memória a timeline ativa
      if (timeline && (timeline.id === timelineId || String(timeline.id) === String(timelineId))) {
        timeline.contYear = nextReceiptNumber;
        timeline.cont_year = nextReceiptNumber;
      }

      try {
        await api.updateTimeline(timelineId, {
          contYear: nextReceiptNumber,
          cont_year: nextReceiptNumber
        });
      } catch (err) {
        console.error('Error updating timeline cont_year after print:', err);
      }
    }
  }, [receiptModalData, timeline, activeTimeboard]);

  const handleOpenReceipt = useCallback((targetEvent, targetPerson) => {
    setIsGeneratingReceipt(true);
    setTimeout(() => {
      try {
        const receiptNumber = computeReceiptNumber(timeline, targetEvent);
        const html = buildReceiptHtml({
          event: targetEvent,
          timeboard: activeTimeboard,
          timeline,
          receiptNumber,
          currentUser,
          obligationPerson: targetPerson,
          persons,
          language,
          t
        });
        setReceiptModalData({
          isOpen: true,
          htmlContent: html,
          title: t('receipt.printReceipt'),
          receiptNumber,
          timelineId: timeline?.id,
          targetEvent
        });
      } catch (err) {
        console.error('Error generating receipt HTML:', err);
      } finally {
        setIsGeneratingReceipt(false);
      }
    }, 450);
  }, [activeTimeboard, timeline, currentUser, language, t, persons]);

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
    setSelectedEntityId(null);
  }, [timeline?.id]);

  const isFinancial = activeTimeboard?.type === TimeboardType.FINANCIAL || isFinancialTimeline;
  const isProjects = activeTimeboard?.type === TimeboardType.PROJECTS || normalizeTimelineType(timeline?.type) === TimelineType.PROJECT;
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

  const hasBalanceTimeline = useMemo(() => {
    return effectiveTimelines.some(
      (t) => normalizeTimelineType(t.type) === TimelineType.BALANCE &&
        t.status !== TimelineStatus.INACTIVE && t.isActive !== false
    );
  }, [effectiveTimelines]);

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

  const getStatusFilterOptions = () => {
    if ([TimelineType.INCOME, TimelineType.BALANCE].includes(timeline.type)) {
      return [
        { id: EventStatus.ALL, name: t('status.all'), icon: <Layers size={13} /> },
        { id: EventStatus.RECEIVED, name: t('status.received'), icon: <CheckCircle2 size={13} /> },
        { id: EventStatus.PENDING, name: t('status.pending'), icon: <Clock size={13} /> },
        { id: EventStatus.OVERDUE, name: t('status.overdue'), icon: <AlertCircle size={13} /> }
      ];
    }
    if ([TimelineType.EXPENSE, TimelineType.LOAN].includes(timeline.type) || isLoanTimelineType(timeline.type)) {
      return [
        { id: EventStatus.ALL, name: t('status.all'), icon: <Layers size={13} /> },
        { id: EventStatus.PAID, name: t('status.paid'), icon: <CheckCircle2 size={13} /> },
        { id: EventStatus.PENDING, name: t('status.pending'), icon: <Clock size={13} /> },
        { id: EventStatus.OVERDUE, name: t('status.overdue'), icon: <AlertCircle size={13} /> }
      ];
    }
    if (timeline.type === TimelineType.INVESTMENT) {
      return [
        { id: EventStatus.ALL, name: t('status.all'), icon: <Layers size={13} /> },
        { id: EventStatus.INVESTED, name: t('status.invested'), icon: <CheckCircle2 size={13} /> },
        { id: EventStatus.PENDING, name: t('status.pending'), icon: <Clock size={13} /> },
        { id: EventStatus.OVERDUE, name: t('status.overdue'), icon: <AlertCircle size={13} /> }
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
  const renderFilterSwitch = (checked, activeColor = 'var(--primary)') => (
    <span
      style={{
        width: '28px',
        height: '16px',
        borderRadius: '9999px',
        background: checked ? activeColor : 'rgba(148, 163, 184, 0.25)',
        position: 'relative',
        transition: 'background 0.2s ease',
        flexShrink: 0,
        display: 'inline-block'
      }}
    >
      <span
        style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          background: TimelineColor.WHITE,
          position: 'absolute',
          top: '2px',
          left: checked ? '14px' : '2px',
          transition: 'left 0.2s ease',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
        }}
      />
    </span>
  );

  // Multi-selection of categories for Expense timeline
  const [selectedExpenseCategories, setSelectedExpenseCategories] = useState([]);

  const isCategoryFiltered =
    (timeline.type === TimelineType.EXPENSE && selectedExpenseCategories.length > 0) ||
    (timeline.type !== TimelineType.EXPENSE && selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos');

  const isSearchActive = Boolean(searchQuery && searchQuery.trim().length > 0);

  const isListView = selectedStatusFilters.length > 0 || isCategoryFiltered || isSearchActive || Boolean(selectedEntityId);

  const resetAllFilters = () => {
    setSelectedStatusFilters([]);
    setSelectedExpenseCategories([]);
    setSelectedCategoryFilter(EventStatus.ALL);
    setSearchQuery('');
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
      if (next.length === EXPENSE_CATEGORY_ITEMS.length) {
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

  // Helper to determine allowed grouping modes based on timeline type and periodicity
  const getAllowedGroupingModes = () => {
    if (timeline.type === TimelineType.BALANCE || timeline.type === TimelineType.INCOME) {
      return [
        { id: 'dia', name: t('sidebar.day'), icon: <Calendar size={14} /> },
        { id: 'mes', name: t('sidebar.month'), icon: <Clock size={14} /> },
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    if (!isLoanTimelineType(timeline.type)) {
      return [
        { id: 'dia', name: t('sidebar.day'), icon: <Calendar size={14} /> },
        { id: 'semana', name: t('sidebar.week'), icon: <Layers size={14} /> },
        { id: 'mes', name: t('sidebar.month'), icon: <Clock size={14} /> },
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    const p = normalizePeriodicity(timeline.periodicity);
    if (p === EventPeriodicity.ANNUAL) {
      return [
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    if (p === EventPeriodicity.MONTHLY || p === EventPeriodicity.BIMONTHLY || p === EventPeriodicity.SEMIANNUAL) {
      return [
        { id: 'mes', name: t('sidebar.month'), icon: <Clock size={14} /> },
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    if (p === EventPeriodicity.BIWEEKLY) {
      return [
        { id: 'semana', name: t('sidebar.week'), icon: <Layers size={14} /> },
        { id: 'mes', name: t('sidebar.month'), icon: <Clock size={14} /> },
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    return [
      { id: 'dia', name: t('sidebar.day'), icon: <Calendar size={14} /> },
      { id: 'semana', name: t('sidebar.week'), icon: <Layers size={14} /> },
      { id: 'mes', name: t('sidebar.month'), icon: <Clock size={14} /> },
      { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
    ];
  };

  const allowedGroupingModes = getAllowedGroupingModes();

  // Automatically update aggregation view when timeline periodicity changes & ensure valid grouping
  // Keep grouping locked to monthly
  React.useEffect(() => {
    setGroupBy('mes');
  }, [timeline.id]);

  // Scroll and focus on Today / Current period node when clicked by user (positioned right below sticky header dock)
  const scrollToToday = () => {
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
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

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

  // Extract unique entities referenced across timeline events
  const timelineEntities = useMemo(() => {
    if (!timelineEvents || timelineEvents.length === 0) return [];
    const entityMap = new Map();

    // Helper to test if an event belongs to this timeline's scope
    const isEventBelongingToCurrentTimeline = (ev) => {
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
    };

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
  }, [timelineEvents, timeline.id, timeline.type]);


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
    );
    return EXPENSE_CATEGORY_ITEMS.filter((cat) => presentCategories.has(cat.id));
  }, [timelineEvents]);

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
  const startDateObj = subMonths(currentMonthStart, effectivePastYears * 12);
  const maxDateObj = addMonths(currentMonthEnd, Math.max(1, futureHorizonYears) * 12);

  // Filter events based on search query, status, category, and label
  const filteredEvents = useMemo(() => {
    if (!timelineEvents) return [];
    return timelineEvents.filter((ev) => {
      const matchesSearch =
        searchQuery === '' ||
        ((ev.title || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((ev.description || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.labels && ev.labels.some((l) => (l || '').toLowerCase().includes(searchQuery.toLowerCase())));

      // Na visualização de lista por status ou por categoria, mostrar apenas eventos até ao final do mês atual e meses anteriores
      if (isListView) {
        const currentMonthKey = format(todayDate, 'yyyy-MM');
        if (ev.date && ev.date.substring(0, 7) > currentMonthKey) {
          return false;
        }
      }

      let matchesStatus = selectedStatusFilters.length === 0;
      if (!matchesStatus) {

        const isCompleted = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        const isCancelled = isCancelledStatus(ev.status);
        const isOverdue = Boolean(
          ev.status === EventStatus.OVERDUE ||
          (ev.date && ev.date < todayStr && !isCompleted && !isCancelled && ev.status !== EventStatus.DELETED)
        );
        const isPending = !isCompleted && !isCancelled && !isOverdue && ev.status !== EventStatus.DELETED;

        matchesStatus = selectedStatusFilters.some((statusFilter) => {
          if (
            statusFilter === EventStatus.RECEIVED ||
            statusFilter === EventStatus.PAID ||
            statusFilter === EventStatus.COMPLETED ||
            statusFilter === EventStatus.INVESTED ||
            statusFilter === EventStatus.WITHDRAWN ||
            statusFilter === EventStatus.SETTLED ||
            statusFilter === EventStatus.FINISHED ||
            statusFilter === EventStatus.CLOSED
          ) {
            return isCompleted;
          }
          if (statusFilter === EventStatus.OVERDUE) {
            return isOverdue;
          }
          if (statusFilter === EventStatus.PENDING || statusFilter === EventStatus.PLANNED) {
            return isPending;
          }
          return ev.status === statusFilter;
        });
      }

      let matchesCategory = true;
      if (timeline.type === TimelineType.EXPENSE) {
        if (selectedExpenseCategories.length > 0) {
          const evCat = (ev.category || '').toLowerCase();
          matchesCategory = selectedExpenseCategories.some((cat) => {
            const targetCat = cat.toLowerCase();
            if (evCat === targetCat) return true;
            if (targetCat === ExpensesEventCategory.OTHER) {
              const allKnown = Object.values(ExpensesEventCategory).map((v) => v.toLowerCase());
              return !allKnown.includes(evCat);
            }
            return false;
          });
        }
      } else if (selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos') {
        if (timeline.type === TimelineType.INVESTMENT) {
          matchesCategory = ev.pocketId === selectedCategoryFilter || ev.pocket_id === selectedCategoryFilter;
        } else if (timeline.type === TimelineType.INCOME) {
          const evCat = (ev.category || '').toLowerCase();
          if (selectedCategoryFilter === IncomeEventCategory.OTHER) {
            const allKnown = Object.values(IncomeEventCategory).map((v) => v.toLowerCase());
            matchesCategory = evCat === IncomeEventCategory.OTHER || !allKnown.includes(evCat);
          } else {
            matchesCategory = evCat === selectedCategoryFilter ||
              (selectedCategoryFilter === IncomeEventCategory.SALARY && evCat === 'salario') ||
              (selectedCategoryFilter === IncomeEventCategory.MEAL_ALLOWANCE && evCat === 'subsidio_alimentacao') ||
              (selectedCategoryFilter === IncomeEventCategory.FREELANCE && evCat === 'freelancer') ||
              (selectedCategoryFilter === IncomeEventCategory.INVESTMENT_RETURN && (evCat === 'rendimentos' || evCat === 'dividendos')) ||
              (selectedCategoryFilter === IncomeEventCategory.RECURRING_INCOME && (evCat === 'renda_recorrente' || evCat === 'recurring'));
          }
        } else if (selectedCategoryFilter === EventType.LOAN_INSTALLMENT || selectedCategoryFilter === 'parcela_emprestimo' || selectedCategoryFilter === 'loan_installment' || selectedCategoryFilter === LoanEventCategory.LOAN_INSTALLMENT) {
          matchesCategory = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'parcela_emprestimo' || ev.category === 'loan_installment' || ev.category === LoanEventCategory.LOAN_INSTALLMENT || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');
        } else if (selectedCategoryFilter === EventType.AMORTIZATION || selectedCategoryFilter === 'amortizacao' || selectedCategoryFilter === 'amortization' || selectedCategoryFilter === LoanEventCategory.AMORTIZATION) {
          matchesCategory = ev.eventType === EventType.AMORTIZATION || ev.category === 'amortizacao' || ev.category === 'amortization' || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT || ev.category === AmortizationStrategy.REDUCE_TERM || ev.category === AmortizationStrategy.REDUCE_INSTALLMENT;
        } else {
          matchesCategory = ev.category === selectedCategoryFilter || ev.eventType === selectedCategoryFilter;
        }
      }

      const matchesTimelineMultiSelect =
        timeline.type !== TimelineType.BALANCE ||
        selectedTimelineIds.length === 0 ||
        selectedTimelineIds.includes(ev.timelineId) ||
        selectedTimelineIds.includes(ev.timelineOriginId) ||
        selectedTimelineIds.includes(ev.timeline_id) ||
        selectedTimelineIds.includes(ev.timeline_origin_id);

      const matchesLabel =
        selectedLabelFilter === EventStatus.ALL ||
        selectedLabelFilter === 'Todos' ||
        selectedLabelFilter === 'all' ||
        (ev.labels && ev.labels.includes(selectedLabelFilter));

      if (!matchesStatus || !matchesCategory || !matchesTimelineMultiSelect || !matchesLabel) {
        return false;
      }

      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) {
        return false;
      }

      // Timeline ownership filter
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
        if (isNonFinancial) return false;
      } else {
        const isThisTimeline = ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id || ev.timeline_id === timeline.id;
        if (!isThisTimeline) return false;
      }

      // Respeitar os limites dinâmicos do horizonte de tempo e início de cálculo para todas as timelines financeiras
      if (isFinancialTimeline && ev.date) {
        const evMonth = ev.date.substring(0, 7);
        if (computeFromMonth && evMonth < computeFromMonth) {
          return false;
        }
        const maxEndStr = format(maxDateObj, 'yyyy-MM-dd');
        const minStartStr = format(startDateObj, 'yyyy-MM-dd');
        if (ev.date > maxEndStr || ev.date < minStartStr) {
          return false;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesLabel;
    }).sort((a, b) => {
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
  }, [
    timelineEvents,
    searchQuery,
    selectedStatusFilters,
    selectedCategoryFilter,
    selectedExpenseCategories,
    selectedEntityId,
    selectedLabelFilter,
    selectedTimelineIds,
    timeline.type,
    timeline.id,
    isFinancialTimeline,
    activeFinancialTab,
    computeFromMonth,
  ]);

  const availableLabels = useMemo(() => {
    return Array.from(new Set(allEvents.flatMap((ev) => ev.labels || [])));
  }, [allEvents]);

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
      list.sort(compareEventsWithinDay);
    });
    return map;
  }, [filteredEvents]);

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

  const renderFutureHorizonButton = () => {
    if (!onLoadMoreFuture) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '16px 0 28px 0', position: 'relative', zIndex: 10 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onLoadMoreFuture}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 22px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))',
            border: '1px solid rgba(99, 102, 241, 0.45)',
            color: 'var(--primary-light)',
            fontWeight: '700',
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <ArrowUp size={15} />
          <span>{t('timeline.projectMoreFuture')}</span>
        </button>
      </div>
    );
  };

  const renderPastHorizonButton = () => {
    if (!onLoadMorePast) return null;
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: '24px 0 16px 0', position: 'relative', zIndex: 10 }}>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={onLoadMorePast}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '9px 22px',
            borderRadius: '24px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.18), rgba(168, 85, 247, 0.18))',
            border: '1px solid rgba(99, 102, 241, 0.45)',
            color: 'var(--primary-light)',
            fontWeight: '700',
            fontSize: '0.84rem',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
            transition: 'all var(--transition-fast)'
          }}
        >
          <ArrowDown size={15} />
          <span>{t('timeline.loadMorePast')}</span>
        </button>
      </div>
    );
  };

  const renderWeekView = () => {
    const weekMap = new Map();

    // Map events directly into their corresponding weeks
    filteredEvents.forEach((ev) => {
      if (!ev || !ev.date) return;
      try {
        const evDate = parseISO(ev.date);
        const weekStart = startOfWeek(evDate, { weekStartsOn: 1 });
        const weekKey = format(weekStart, 'yyyy-MM-dd');
        if (!weekMap.has(weekKey)) {
          const weekEnd = endOfWeek(evDate, { weekStartsOn: 1 });
          weekMap.set(weekKey, {
            weekStart,
            weekEnd,
            weekNum: getWeek(weekStart),
            events: []
          });
        }
        weekMap.get(weekKey).events.push(ev);
      } catch (e) { }
    });

    // Ensure current week is present
    const currentWeekStart = startOfWeek(todayDate, { weekStartsOn: 1 });
    const currentWeekKey = format(currentWeekStart, 'yyyy-MM-dd');
    if (!weekMap.has(currentWeekKey)) {
      weekMap.set(currentWeekKey, {
        weekStart: currentWeekStart,
        weekEnd: endOfWeek(todayDate, { weekStartsOn: 1 }),
        weekNum: getWeek(currentWeekStart),
        events: []
      });
    }

    const weeksList = Array.from(weekMap.values()).sort(
      (a, b) => b.weekStart.getTime() - a.weekStart.getTime()
    );

    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: `linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` }}
        />

        {/* Botão Carregar Mais Futuro */}
        {renderFutureHorizonButton()}

        {weeksList.map((weekData) => {
          const isCurrentWeek = isSameWeek(todayDate, weekData.weekStart, { weekStartsOn: 1 });
          const weekStartStr = format(weekData.weekStart, language === 'en' ? 'MMM d' : "d 'de' MMM", { locale: dateLocale });
          const weekEndStr = format(weekData.weekEnd, language === 'en' ? 'MMM d, yyyy' : "d 'de' MMM, yyyy", { locale: dateLocale });
          const hasEvents = weekData.events.length > 0;

          if (!showEmptyDays && !hasEvents && !isCurrentWeek) return null;

          return (
            <div
              key={format(weekData.weekStart, 'yyyy-MM-dd')}
              id={isCurrentWeek ? 'timeline-node-today' : undefined}
              className={`timeline-day-row ${isCurrentWeek ? 'is-today' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main">{t('timeline.weekLabel', { week: weekData.weekNum })}</div>
                <div className="day-date-sub">{format(weekData.weekStart, 'yyyy')}</div>
                {isCurrentWeek && <span className="today-badge-chip pulse-glow">{t('timeline.currentWeek')}</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentWeek ? 'is-today-node' : hasEvents ? 'has-events' : ''
                    }`}
                  style={hasEvents && !isCurrentWeek ? { backgroundColor: paletteTheme.primary } : {}}
                />
              </div>

              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header">
                    <h3 className="group-card-title">
                      {t('timeline.weekTitle', { week: weekData.weekNum })} ({weekStartStr} - {weekEndStr})
                    </h3>
                    <span className="group-card-badge">
                      {t('timeline.eventsCount', { count: weekData.events.length })}
                    </span>
                  </div>

                  {hasEvents ? (
                    groupEventsByDate(weekData.events).map((dateGroup, gIdx) => (
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
                          persons={persons}
                        />
                      </div>
                    ))
                  ) : (
                    <div
                      className="empty-day-row"
                      onClick={() => onAddEventForDate(format(weekData.weekStart, 'yyyy-MM-dd'))}
                    >
                      <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                      <span className="empty-day-text">{t('timeline.noEventsWeek')}</span>
                      <span className="add-event-mini-btn">
                        <Plus size={12} /> {t('buttons.add')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão Carregar Mais Passado */}
        {renderPastHorizonButton()}
      </div>
    );
  };

  // Pre-calculate total projected expenses per month across all events in timeboard scope (excluding loans)
  const monthExpensesTotalMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT;
      const isExpense = (ev.eventType === EventType.EXPENSE || ev.category === ExpensesEventCategory.RECURRING_EXPENSE || ev.isExpense) && !isLoan;

      if (isExpense) {
        const mKey = ev.date.substring(0, 7);
        map.set(mKey, (map.get(mKey) || 0) + Math.abs(Number(ev.amount || 0)));
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total projected loan payments per month across all events in timeboard scope
  const monthLoansTotalMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED || ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== AmortizationEventCategory.REDUCE_TERM && ev.category !== AmortizationEventCategory.REDUCE_INSTALLMENT);

      if (isLoanInstallment) {
        const mKey = ev.date.substring(0, 7);
        const amt = Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0));
        map.set(mKey, (map.get(mKey) || 0) + Math.abs(amt));
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total projected income per month across all events in timeboard scope
  const monthIncomeTotalMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT;
      const isInvestment = ev.eventType === EventType.INVESTMENT || ev.category === InvestmentEventCategory.SAVINGS || ev.isInvestment;
      const isIncome = (ev.eventType === EventType.INCOME || ev.category === IncomeEventCategory.RECURRING_INCOME || ev.isIncome) && !isLoan && !isInvestment;

      if (isIncome) {
        const mKey = ev.date.substring(0, 7);
        map.set(mKey, (map.get(mKey) || 0) + Math.abs(Number(ev.amount || 0)));
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total projected investments per month across all events in timeboard scope (for badge display)
  const monthInvestmentsTotalMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isInvestment =
        ev.eventType === EventType.INVESTMENT ||
        ev.eventType === EventType.WITHDRAWAL ||
        ev.category === InvestmentEventCategory.SAVINGS ||
        ev.isInvestment ||
        ev.isWithdrawal ||
        Boolean(ev.pocketId || ev.pocket_id);

      if (isInvestment) {
        const isWithdrawal = Boolean(
          ev.isWithdrawal ||
          ev.eventType === EventType.WITHDRAWAL ||
          ev.eventType === EventType.EXPENSE ||
          ev.isExpense ||
          Number(ev.amount || 0) < 0
        );
        const multiplier = isWithdrawal ? -1 : 1;
        const amt = Math.abs(Number(ev.amount || 0));
        const mKey = ev.date.substring(0, 7);
        map.set(mKey, (map.get(mKey) || 0) + multiplier * amt);
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total deductible investments from monthly income (excludes external deposits)
  const monthInvestmentsDeductionsMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
      if (isExternal) return;

      const isWithdrawal = Boolean(
        ev.isWithdrawal ||
        ev.eventType === EventType.WITHDRAWAL ||
        ev.isVirtualWithdrawal ||
        (ev.id && String(ev.id).startsWith('virtual_withdrawal_')) ||
        (ev.eventType === EventType.EXPENSE && (Boolean(ev.pocketId || ev.pocket_id) || ev.isInvestment)) ||
        Number(ev.amount || 0) < 0
      );
      if (isWithdrawal) return;

      const isInvestment =
        ev.eventType === EventType.INVESTMENT ||
        ev.category === InvestmentEventCategory.SAVINGS ||
        ev.isInvestment ||
        Boolean(ev.pocketId || ev.pocket_id);

      if (isInvestment) {
        const amt = Math.abs(Number(ev.amount || 0));
        const mKey = ev.date.substring(0, 7);
        map.set(mKey, (map.get(mKey) || 0) + amt);
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total external deposits / investments per month (excluded from monthly income deduction)
  const monthInvestmentsExternalMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
      if (!isExternal) return;

      const isInvestment =
        ev.eventType === EventType.INVESTMENT ||
        ev.eventType === EventType.WITHDRAWAL ||
        ev.category === InvestmentEventCategory.SAVINGS ||
        ev.isInvestment ||
        ev.isWithdrawal ||
        Boolean(ev.pocketId || ev.pocket_id);

      if (isInvestment) {
        const isWithdrawal = Boolean(
          ev.isWithdrawal ||
          ev.eventType === EventType.WITHDRAWAL ||
          ev.eventType === EventType.EXPENSE ||
          ev.isExpense ||
          Number(ev.amount || 0) < 0
        );
        const multiplier = isWithdrawal ? -1 : 1;
        const amt = Math.abs(Number(ev.amount || 0));
        const mKey = ev.date.substring(0, 7);
        map.set(mKey, (map.get(mKey) || 0) + multiplier * amt);
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total realized expenses per month (only positive/paid statuses)
  const monthExpensesRealizedMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT;
      const isExpense = (ev.eventType === EventType.EXPENSE || ev.category === ExpensesEventCategory.RECURRING_EXPENSE || ev.isExpense) && !isLoan;

      if (isExpense) {
        const mKey = ev.date.substring(0, 7);
        const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        if (isRealized) {
          map.set(mKey, (map.get(mKey) || 0) + Math.abs(Number(ev.amount || 0)));
        }
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total realized loan payments per month
  const monthLoansRealizedMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED || ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== AmortizationEventCategory.REDUCE_TERM && ev.category !== AmortizationEventCategory.REDUCE_INSTALLMENT);
      const isLoan = isLoanInstallment || ev.eventType === EventType.LOAN || ev.eventType === EventType.AMORTIZATION || ev.isLoan || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT;

      if (isLoan) {
        const mKey = ev.date.substring(0, 7);
        const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        if (isRealized) {
          const amt = isLoanInstallment
            ? (ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0))
            : (ev.amount || 0);
          map.set(mKey, (map.get(mKey) || 0) + Math.abs(Number(amt)));
        }
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total realized income per month
  const monthIncomeRealizedMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent || ev.category === LoanEventCategory.INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT;
      const isInvestment = ev.eventType === EventType.INVESTMENT || ev.category === InvestmentEventCategory.SAVINGS || ev.isInvestment;
      const isIncome = (ev.eventType === EventType.INCOME || ev.category === IncomeEventCategory.RECURRING_INCOME || ev.isIncome) && !isLoan && !isInvestment;

      if (isIncome) {
        const mKey = ev.date.substring(0, 7);
        const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        if (isRealized) {
          map.set(mKey, (map.get(mKey) || 0) + Math.abs(Number(ev.amount || 0)));
        }
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total realized investments per month
  const monthInvestmentsRealizedMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isInvestment =
        ev.eventType === EventType.INVESTMENT ||
        ev.eventType === EventType.WITHDRAWAL ||
        ev.category === InvestmentEventCategory.SAVINGS ||
        ev.isInvestment ||
        ev.isWithdrawal ||
        Boolean(ev.pocketId || ev.pocket_id);

      if (isInvestment) {
        const mKey = ev.date.substring(0, 7);
        const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        if (isRealized) {
          const isWithdrawal = Boolean(
            ev.isWithdrawal ||
            ev.eventType === EventType.WITHDRAWAL ||
            ev.eventType === EventType.EXPENSE ||
            ev.isExpense ||
            Number(ev.amount || 0) < 0
          );
          const multiplier = isWithdrawal ? -1 : 1;
          const amt = Math.abs(Number(ev.amount || 0));
          map.set(mKey, (map.get(mKey) || 0) + multiplier * amt);
        }
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total realized deductible investments per month
  const monthInvestmentsDeductionsRealizedMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
      if (isExternal) return;

      const isWithdrawal = Boolean(
        ev.isWithdrawal ||
        ev.eventType === EventType.WITHDRAWAL ||
        ev.isVirtualWithdrawal ||
        (ev.id && String(ev.id).startsWith('virtual_withdrawal_')) ||
        (ev.eventType === EventType.EXPENSE && (Boolean(ev.pocketId || ev.pocket_id) || ev.isInvestment)) ||
        Number(ev.amount || 0) < 0
      );
      if (isWithdrawal) return;

      const isInvestment =
        ev.eventType === EventType.INVESTMENT ||
        ev.category === InvestmentEventCategory.SAVINGS ||
        ev.isInvestment ||
        Boolean(ev.pocketId || ev.pocket_id);

      if (isInvestment) {
        const mKey = ev.date.substring(0, 7);
        const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        if (isRealized) {
          const amt = Math.abs(Number(ev.amount || 0));
          map.set(mKey, (map.get(mKey) || 0) + amt);
        }
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  // Pre-calculate total realized external investments per month
  const monthInvestmentsExternalRealizedMap = useMemo(() => {
    const map = new Map();
    (timelineEvents || []).forEach((ev) => {
      if (!ev || !ev.date || ev.isDeleted) return;
      if (isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
      if (computeFromMonth && ev.date.substring(0, 7) < computeFromMonth) return;
      if (!isEventTimelineActive(ev)) return;
      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) return;
      if (timeline.type === TimelineType.BALANCE && selectedTimelineIds && selectedTimelineIds.length > 0) {
        if (!selectedTimelineIds.includes(ev.timelineId) && !selectedTimelineIds.includes(ev.timelineOriginId)) return;
      }
      const isExternal = Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');
      if (!isExternal) return;

      const isInvestment =
        ev.eventType === EventType.INVESTMENT ||
        ev.eventType === EventType.WITHDRAWAL ||
        ev.category === InvestmentEventCategory.SAVINGS ||
        ev.isInvestment ||
        ev.isWithdrawal ||
        Boolean(ev.pocketId || ev.pocket_id);

      if (isInvestment) {
        const mKey = ev.date.substring(0, 7);
        const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        if (isRealized) {
          const isWithdrawal = Boolean(
            ev.isWithdrawal ||
            ev.eventType === EventType.WITHDRAWAL ||
            ev.eventType === EventType.EXPENSE ||
            ev.isExpense ||
            Number(ev.amount || 0) < 0
          );
          const multiplier = isWithdrawal ? -1 : 1;
          const amt = Math.abs(Number(ev.amount || 0));
          map.set(mKey, (map.get(mKey) || 0) + multiplier * amt);
        }
      }
    });
    return map;
  }, [timelineEvents, selectedTimelineIds, selectedEntityId, timeline.type, inactiveTimelineIdSet, computeFromMonth]);

  const monthsList = useMemo(() => {
    const monthMap = new Map();

    try {
      const allMonthsDesc = eachMonthOfInterval({
        start: startDateObj,
        end: maxDateObj
      }).reverse();

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
      mEntry.groupedDateEvents = groupEventsByDate(mEntry.events);
    });

    return Array.from(monthMap.values());
  }, [filteredEvents, startDateObj, maxDateObj, todayDate]);

  const renderMonthView = () => {

    // Helper to verify if an event belongs to active / selected timelines
    const isEventInActiveTimelines = (ev) => {
      if (!ev) return false;
      if (timeline.type === TimelineType.BALANCE) {
        if (selectedTimelineIds.length === 0) return true;
        return (
          selectedTimelineIds.includes(ev.timelineId) ||
          selectedTimelineIds.includes(ev.timelineOriginId) ||
          selectedTimelineIds.includes(ev.timeline_id) ||
          selectedTimelineIds.includes(ev.timeline_origin_id)
        );
      }
      return ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id || ev.timeline_id === timeline.id;
    };

    // Pre-calculate chronological running cumulative metrics
    const monthCumulativeMap = new Map();
    const seenInitialInvestments = new Set();
    let runningIncome = 0;
    let runningExpense = 0;
    let runningInvestment = 0;

    const sortedChronologicalMonths = [...monthsList].sort((a, b) => a.monthDate.getTime() - b.monthDate.getTime());
    sortedChronologicalMonths.forEach((mG) => {
      let mInc = 0;
      let mExp = 0;
      let mInv = 0;

      mG.events.forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED || ev.status === EventStatus.ABATED || ev.isAbated || ev.isAbatida || ev.status === 'Abatida') return;

        const isLoanInstallment = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'parcela_emprestimo' || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');
        const amt = isLoanInstallment
          ? Number(ev.installmentAmount !== undefined ? ev.installmentAmount : (ev.amount || 0))
          : Number(ev.amount || 0);

        const isLoan = isLoanInstallment || ev.eventType === EventType.AMORTIZATION || ev.category === 'amortizacao';
        const isIncome = ev.eventType === EventType.INCOME;
        const isExpense = ev.eventType === EventType.EXPENSE || isLoan;
        const isInvestment =
          ev.eventType === EventType.INVESTMENT ||
          ev.eventType === EventType.WITHDRAWAL ||
          ev.isInvestment ||
          ev.isWithdrawal ||
          Boolean(ev.pocketId || ev.pocket_id);
        const isWithdrawal = Boolean(
          ev.isWithdrawal ||
          ev.eventType === EventType.WITHDRAWAL ||
          ev.eventType === EventType.EXPENSE ||
          ev.isExpense ||
          Number(ev.amount || 0) < 0
        );
        const multiplier = isWithdrawal ? -1 : 1;

        const initialKey = ev.eventId || ev.seriesId || ev.id;
        let initialAmt = 0;
        if (isInvestment && ev.initialInvestedAmount && !seenInitialInvestments.has(initialKey)) {
          initialAmt = Number(ev.initialInvestedAmount) || 0;
          seenInitialInvestments.add(initialKey);
        }

        if (isIncome) mInc += amt;
        if (isExpense) mExp += amt;
        if (isInvestment) mInv += multiplier * Math.abs(amt) + initialAmt;
      });

      runningIncome += mInc;
      runningExpense += mExp;
      runningInvestment += mInv;

      monthCumulativeMap.set(format(mG.monthDate, 'yyyy-MM'), {
        income: runningIncome,
        expense: runningExpense,
        investment: runningInvestment
      });
    });

    return (
      <div className="vertical-timeline-container">
        {/* Left Main Chronological Timeline Spine */}
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: `linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` }}
        />

        {/* Botão Carregar Mais Futuro */}
        {renderFutureHorizonButton()}

        {monthsList.map((mGroup) => {
          const currentMonthKey = format(todayDate, 'yyyy-MM');
          const monthKeyStr = format(mGroup.monthDate, 'yyyy-MM');
          const isCurrentMonth = currentMonthKey === monthKeyStr;
          const isFutureMonth = monthKeyStr > currentMonthKey;
          const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: dateLocale });
          const hasEvents = mGroup.events.length > 0;

          const mMonthProjectedExpense = hasExpenseTimeline ? (monthExpensesTotalMap.get(monthKeyStr) || 0) : 0;
          const mMonthProjectedLoan = hasLoanTimeline ? (monthLoansTotalMap.get(monthKeyStr) || 0) : 0;
          const mMonthProjectedIncome = hasIncomeTimeline ? (monthIncomeTotalMap.get(monthKeyStr) || 0) : 0;
          const mMonthProjectedInvestment = hasInvestmentTimeline ? (monthInvestmentsTotalMap.get(monthKeyStr) || 0) : 0;
          const mMonthProjectedInvestmentInternal = hasInvestmentTimeline ? (monthInvestmentsDeductionsMap.get(monthKeyStr) || 0) : 0;
          const mMonthProjectedInvestmentExternal = hasInvestmentTimeline ? (monthInvestmentsExternalMap.get(monthKeyStr) || 0) : 0;
          const mMonthProjectedInvestmentDeduction = mMonthProjectedInvestmentInternal;
          const mMonthProjectedSaldo = mMonthProjectedIncome - (mMonthProjectedExpense + mMonthProjectedLoan + mMonthProjectedInvestmentDeduction);

          const mMonthRealizedExpense = hasExpenseTimeline ? (monthExpensesRealizedMap.get(monthKeyStr) || 0) : 0;
          const mMonthRealizedLoan = hasLoanTimeline ? (monthLoansRealizedMap.get(monthKeyStr) || 0) : 0;
          const mMonthRealizedIncome = hasIncomeTimeline ? (monthIncomeRealizedMap.get(monthKeyStr) || 0) : 0;
          const mMonthRealizedInvestment = hasInvestmentTimeline ? (monthInvestmentsRealizedMap.get(monthKeyStr) || 0) : 0;
          const mMonthRealizedInvestmentInternal = hasInvestmentTimeline ? (monthInvestmentsDeductionsRealizedMap.get(monthKeyStr) || 0) : 0;
          const mMonthRealizedInvestmentExternal = hasInvestmentTimeline ? (monthInvestmentsExternalRealizedMap.get(monthKeyStr) || 0) : 0;
          const mMonthRealizedInvestmentDeduction = mMonthRealizedInvestmentInternal;
          const mMonthRealizedSaldo = mMonthRealizedIncome - (mMonthRealizedExpense + mMonthRealizedLoan + mMonthRealizedInvestmentDeduction);

          const isNotComputedMonth = Boolean(isFinancial && computeFromMonth && monthKeyStr < computeFromMonth);

          if (!showEmptyDays && !hasEvents && !isCurrentMonth) return null;

          return (
            <div
              key={format(mGroup.monthDate, 'yyyy-MM')}
              id={isCurrentMonth ? 'timeline-node-today' : `timeline-month-${format(mGroup.monthDate, 'yyyy-MM')}`}
              data-month-key={format(mGroup.monthDate, 'yyyy-MM')}
              className={`timeline-day-row ${isCurrentMonth ? 'is-today' : ''} ${isFutureMonth ? 'is-future-month' : ''} ${isNotComputedMonth ? 'is-not-computed-month' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main" style={{ color: isNotComputedMonth ? 'var(--text-dim)' : (isFutureMonth ? 'var(--text-dim)' : 'var(--text-main)') }}>
                  {format(mGroup.monthDate, 'MMM', { locale: dateLocale }).toUpperCase()}
                </div>
                <div className="day-date-sub" style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                  {format(mGroup.monthDate, 'yyyy')}
                </div>
                {isCurrentMonth && <span className="today-badge-chip pulse-glow">{t('timeline.currentMonth')}</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentMonth ? 'is-today-node' : hasEvents ? 'has-events' : ''}`}
                  style={
                    hasEvents && !isCurrentMonth
                      ? {
                        backgroundColor: isNotComputedMonth
                          ? 'rgba(148, 163, 184, 0.25)'
                          : (isFutureMonth
                            ? 'rgba(148, 163, 184, 0.4)'
                            : paletteTheme.primary),
                        borderColor: isNotComputedMonth
                          ? 'rgba(148, 163, 184, 0.25)'
                          : (isFutureMonth ? 'rgba(148, 163, 184, 0.3)' : undefined)
                      }
                      : {}
                  }
                />
              </div>

              <div className="day-content-col">
                <div
                  className="group-card"
                  style={
                    isNotComputedMonth
                      ? { opacity: 0.78, borderStyle: 'dashed', borderColor: 'rgba(148, 163, 184, 0.25)' }
                      : (isFutureMonth ? { borderColor: 'rgba(148, 163, 184, 0.18)' } : undefined)
                  }
                >
                  <div className="group-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                      <h3
                        className="group-card-title"
                        style={{
                          margin: 0,
                          textTransform: 'capitalize',
                          color: isNotComputedMonth ? 'var(--text-dim)' : (isFutureMonth ? 'var(--text-muted)' : 'var(--text-main)'),
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          flexWrap: 'wrap'
                        }}
                      >
                        <Clock size={18} style={{ color: isNotComputedMonth ? 'var(--text-dim)' : (isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)') }} />
                        <span>{monthTitleStr}</span>
                        {isNotComputedMonth && (
                          <span
                            className="group-card-badge"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              height: '22px',
                              padding: '0 8px',
                              boxSizing: 'border-box',
                              fontSize: '0.68rem',
                              fontWeight: '700',
                              color: 'var(--text-dim)',
                              borderColor: 'rgba(148, 163, 184, 0.25)',
                              background: 'rgba(148, 163, 184, 0.08)',
                              borderRadius: '999px',
                              letterSpacing: '0.2px',
                              cursor: 'help'
                            }}
                            title={t('timeline.notComputedTooltip')}
                          >
                            <EyeOff size={11} style={{ opacity: 0.8 }} />
                            <span>{t('timeline.notComputed')}</span>
                          </span>
                        )}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            height: '26px',
                            boxSizing: 'border-box',
                            color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)',
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.18)' : 'var(--border-glass)',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.05)' : undefined
                          }}
                        >
                          {t('timeline.eventsCount', { count: mGroup.events.length })}
                        </span>

                        {onOpenAmortizationModal && isLoanTimelineOrTab && (() => {
                          const monthLoanEvents = mGroup.events.filter((e) => e.category === LoanEventCategory.INSTALLMENT || e.category === LoanEventCategory.LOAN_INSTALLMENT || e.eventType === EventType.LOAN_INSTALLMENT);
                          const isAbatidaMonth = monthLoanEvents.length > 0 && monthLoanEvents.every((e) => e.isAbatida || e.status === EventStatus.AMORTIZED || e.status === EventStatus.ABATED);
                          if (isAbatidaMonth) return null;
                          return (
                            <button
                              type="button"
                              className="btn btn-sm"
                              style={{
                                background: 'linear-gradient(135deg, var(--success) 0%, var(--accent-emerald) 100%)',
                                boxShadow: '0 4px 14px var(--shadow-glow-emerald)',
                                padding: '4px 12px',
                                height: '26px',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                border: 'none',
                                color: TimelineColor.WHITE
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-15');
                                onOpenAmortizationModal(targetDayStr);
                              }}
                              title={t('timeline.amortizeMonthTitle', { month: monthTitleStr })}
                            >
                              <TrendingDown size={14} />
                              <span>{t('buttons.amortize')}</span>
                            </button>
                          );
                        })()}

                        {onAddEventForDate && !isLoanTimelineOrTab && !isBalancoView && (() => {
                          const isInvestment = timeline.type === TimelineType.INVESTMENT || activeFinancialTab === 'investimentos';
                          const addLabel = isFinancialTimeline
                            ? (activeFinancialTab === 'gastos' || timeline.type === TimelineType.EXPENSE
                                ? t('expenseHeader.addExpenseButton')
                                : isInvestment
                                  ? t('pocket.addPocket')
                                  : t('incomeHeader.addIncome'))
                            : timeline.type === TimelineType.REMINDER
                              ? t('reminderHeader.addReminder')
                              : timeline.type === TimelineType.DIARY
                                ? t('diaryHeader.addEntry')
                                : timeline.type === TimelineType.TODO
                                  ? t('todoHeader.addTask')
                                  : timeline.type === TimelineType.FOLLOWUP
                                    ? t('followupHeader.addFollowup')
                                    : timeline.type === TimelineType.PROJECT
                                      ? t('projectHeader.newTaskMilestone')
                                      : t('buttons.addEvent');

                          const buttonColor = paletteTheme.primary;

                          return isInvestment ? (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                background: `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`,
                                borderColor: paletteTheme.primary,
                                color: TimelineColor.WHITE
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onOpenCreatePocket) onOpenCreatePocket({ defaultDate: format(mGroup.monthDate, 'yyyy-MM-01') });
                              }}
                              title={t('pocket.addPocket')}
                            >
                              <PiggyBank size={14} />
                              <span>{addLabel}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '6px 12px',
                                borderRadius: '8px',
                                fontSize: '0.78rem',
                                fontWeight: '700',
                                cursor: 'pointer',
                                background: `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`,
                                borderColor: paletteTheme.primary,
                                color: TimelineColor.WHITE
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-01');
                                onAddEventForDate(
                                  targetDayStr,
                                  timeline.type === TimelineType.EXPENSE || activeFinancialTab === 'gastos'
                                    ? EventType.EXPENSE
                                    : timeline.type === TimelineType.FOLLOWUP
                                      ? EventType.FOLLOWUP
                                      : isReminders
                                        ? EventType.REMINDER
                                        : EventType.INCOME
                                );
                              }}
                              title={t('timeline.addEventMonthTitle', { month: monthTitleStr })}
                            >
                              <Plus size={14} />
                              <span>{addLabel}</span>
                            </button>
                          );
                        })()}
                      </div>
                    </div>

                    {isFinancialTimeline && !isLoanTimelineOrTab && (
                      <MonthProjectionBadges
                        monthProjectedIncome={mMonthProjectedIncome}
                        monthProjectedExpense={mMonthProjectedExpense}
                        monthProjectedLoan={mMonthProjectedLoan}
                        monthProjectedInvestment={mMonthProjectedInvestment}
                        monthProjectedInvestmentInternal={mMonthProjectedInvestmentInternal}
                        monthProjectedInvestmentExternal={mMonthProjectedInvestmentExternal}
                        monthProjectedInvestmentDeduction={mMonthProjectedInvestmentDeduction}
                        monthProjectedSaldo={mMonthProjectedSaldo}
                        monthRealizedIncome={mMonthRealizedIncome}
                        monthRealizedExpense={mMonthRealizedExpense}
                        monthRealizedLoan={mMonthRealizedLoan}
                        monthRealizedInvestment={mMonthRealizedInvestment}
                        monthRealizedInvestmentInternal={mMonthRealizedInvestmentInternal}
                        monthRealizedInvestmentExternal={mMonthRealizedInvestmentExternal}
                        monthRealizedInvestmentDeduction={mMonthRealizedInvestmentDeduction}
                        monthRealizedSaldo={mMonthRealizedSaldo}
                        projectionMode={monthProjectionMode}
                        onToggleProjectionMode={setMonthProjectionMode}
                        timelines={effectiveTimelines || timelines}
                        hasIncomeTimeline={hasIncomeTimeline}
                        hasExpenseTimeline={hasExpenseTimeline}
                        hasLoanTimeline={hasLoanTimeline}
                        hasInvestmentTimeline={hasInvestmentTimeline}
                        isFutureMonth={isFutureMonth}
                        isNotComputedMonth={isNotComputedMonth}
                        formatCurrency={formatCurrency}
                        t={t}
                      />
                    )}
                  </div>

                  {timeline.type === TimelineType.INVESTMENT ? (() => {
                    const monthKey = format(mGroup.monthDate, 'yyyy-MM');
                    const visiblePockets = (pockets || []).filter((pocket) => {
                      if (selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos') {
                        if (pocket.id !== selectedCategoryFilter) return false;
                      }
                      const createdMonth = (pocket.date_created || pocket.dateCreated || '').substring(0, 7) || '1900-01';
                      const closedMonth = (pocket.date_closed || pocket.dateClosed || '').substring(0, 7) || null;

                      // Pocket starts appearing from its creation month forward
                      if (monthKey < createdMonth) return false;
                      // Pocket stops appearing after its closing month (if date_closed is null, it appears forever)
                      if (closedMonth && monthKey > closedMonth) return false;

                      return true;
                    });

                    const unassignedEvents = (mGroup.events || []).filter(
                      (ev) => {
                        if (ev.pocketId || ev.pocket_id || ev.isDeleted || isCancelledStatus(ev.status) || ev.status !== EventStatus.DELETED) return false;
                        if (selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos' && selectedCategoryFilter !== 'unassigned') {
                          return false;
                        }
                        return true;
                      }
                    );

                    if (visiblePockets.length === 0 && unassignedEvents.length === 0) {
                      return (
                        <div
                          className="empty-day-row"
                          onClick={() => {
                            if (onOpenCreatePocket) onOpenCreatePocket({ defaultDate: format(mGroup.monthDate, 'yyyy-MM-01') });
                          }}
                          style={{
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            padding: '12px 14px',
                            borderRadius: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            border: '1px dashed var(--border-glass)'
                          }}
                        >
                          <PiggyBank size={18} style={{ color: timeline.color || TimelineColor.INVESTMENT }} />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                              {t('pocket.noPockets')}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                              {t('pocket.noPocketsHint')}
                            </span>
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {visiblePockets.map((pocket) => {
                          const pInitial = Number(pocket.initial_value ?? pocket.initialValue ?? 0);
                          const pTarget = Number(pocket.target_value ?? pocket.targetValue ?? 0);

                          let allPocketContributed = 0;
                          (timeline.events || []).forEach((ev) => {
                            if (!ev || !ev.date || ev.isDeleted || isCancelledStatus(ev.status) || ev.status === EventStatus.DELETED) return;
                            if (ev.pocketId === pocket.id || ev.pocket_id === pocket.id) {
                              const evMonth = ev.date.substring(0, 7);
                              if (evMonth <= monthKey) {
                                const isWithdrawal = Boolean(ev.isWithdrawal || ev.eventType === EventType.WITHDRAWAL || ev.eventType === EventType.EXPENSE || ev.isExpense || Number(ev.amount || 0) < 0);
                                const multiplier = isWithdrawal ? -1 : 1;
                                const amt = Math.abs(Number(ev.amount || 0));

                                if (isFutureMonth) {
                                  allPocketContributed += multiplier * amt;
                                } else {
                                  const isReceived = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
                                  const isExternal = Boolean(ev.isExternal || ev.is_external);
                                  if (isReceived || isExternal) {
                                    allPocketContributed += multiplier * amt;
                                  }
                                }
                              }
                            }
                          });

                          const pAccumulated = pInitial + allPocketContributed;
                          const pPercent = pTarget > 0 ? Math.min(100, Math.round((pAccumulated / pTarget) * 100)) : 0;
                          const isClosed = Boolean(pocket.date_closed || pocket.dateClosed);
                          const pocketMonthEvents = (mGroup.events || []).filter(
                            (ev) => (ev.pocketId === pocket.id || ev.pocket_id === pocket.id) && !ev.isDeleted && !isCancelledStatus(ev.status) && ev.status !== EventStatus.DELETED
                          );

                          return (
                            <div
                              key={pocket.id}
                              style={{
                                padding: '12px 14px',
                                borderRadius: '10px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid var(--border-glass)',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px',
                                opacity: isClosed ? 0.75 : 1
                              }}
                            >
                              {/* Linha 1 no topo: Nome do cofrinho + Status Encerrado (se houver) + Botões de Ação */}
                              <div
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  flexWrap: 'wrap',
                                  gap: '8px'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <PiggyBank size={18} style={{ color: timeline.color || TimelineColor.INVESTMENT }} />
                                  <span style={{ fontSize: '0.92rem', fontWeight: '800', color: 'var(--text-main)' }}>
                                    {pocket.name}
                                  </span>
                                  {isClosed && (
                                    <span
                                      style={{
                                        fontSize: '0.68rem',
                                        fontWeight: '700',
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        background: 'rgba(239, 68, 68, 0.15)',
                                        color: TimelineColor.DANGER
                                      }}
                                    >
                                      {t('pocket.statusClosed')}
                                    </span>
                                  )}
                                </div>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  {onEditPocket && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onEditPocket(pocket);
                                      }}
                                      className="btn btn-ghost btn-xs"
                                      title={t('common.edit')}
                                      style={{ padding: '4px 7px', color: 'var(--text-muted)' }}
                                    >
                                      <Pencil size={13} />
                                    </button>
                                  )}

                                  {onDeletePocket && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onDeletePocket(pocket);
                                      }}
                                      className="btn btn-ghost btn-xs"
                                      title={t('common.delete')}
                                      style={{ padding: '4px 7px', color: TimelineColor.DANGER }}
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  )}

                                  {onAddEventForDate && !isClosed && (
                                    <>
                                      <button
                                        type="button"
                                        className="btn btn-primary btn-xs"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-01');
                                          onAddEventForDate(targetDayStr, EventType.INVESTMENT, {
                                            pocketId: pocket.id,
                                            pocketName: pocket.name,
                                            title: pocket.name,
                                            category: InvestmentEventCategory.SAVINGS
                                          });
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          fontSize: '0.74rem',
                                          fontWeight: '700',
                                          background: timeline.color || TimelineColor.INVESTMENT,
                                          borderColor: timeline.color || TimelineColor.INVESTMENT
                                        }}
                                      >
                                        <Plus size={12} strokeWidth={2.5} />
                                        <span>{t('buttons.addEvent')}</span>
                                      </button>

                                      <button
                                        type="button"
                                        className="btn btn-xs"
                                        title={t('buttons.withdrawal')}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-01');
                                          if (onOpenWithdrawModal) {
                                            onOpenWithdrawModal(targetDayStr, pocket.id);
                                          } else if (onAddEventForDate) {
                                            onAddEventForDate(targetDayStr, EventType.WITHDRAWAL, {
                                              pocketId: pocket.id,
                                              pocketName: pocket.name,
                                              title: pocket.name,
                                              isWithdrawal: true
                                            });
                                          }
                                        }}
                                        style={{
                                          display: 'inline-flex',
                                          alignItems: 'center',
                                          gap: '4px',
                                          padding: '4px 10px',
                                          borderRadius: '6px',
                                          fontSize: '0.74rem',
                                          fontWeight: '700',
                                          background: 'rgba(239, 68, 68, 0.12)',
                                          color: TimelineColor.DANGER,
                                          border: '1px solid rgba(239, 68, 68, 0.35)',
                                          cursor: 'pointer',
                                          transition: 'all 0.15s ease'
                                        }}
                                      >
                                        <ArrowDownRight size={12} strokeWidth={2.4} />
                                        <span>{t('buttons.withdrawal')}</span>
                                      </button>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* Linha 2: Barra de Progresso idêntica à do evento com meta */}
                              {pTarget > 0 && (() => {
                                const labelTitle = isFutureMonth
                                  ? t('pocket.goalProgressForecast', {
                                      accumulated: formatCurrency(pAccumulated),
                                      target: formatCurrency(pTarget)
                                    })
                                  : t('pocket.goalProgress', {
                                      accumulated: formatCurrency(pAccumulated),
                                      target: formatCurrency(pTarget)
                                    });

                                const labelPercent = isFutureMonth
                                  ? (pPercent >= 100
                                      ? t('pocket.goalReachedForecast')
                                      : t('pocket.forecastPercent', { percent: pPercent }))
                                  : (pPercent >= 100
                                      ? t('pocket.goalReached')
                                      : t('pocket.reachedPercent', { percent: pPercent }));

                                return (
                                  <div
                                    style={{
                                      width: '100%',
                                      marginTop: '2px',
                                      paddingTop: '6px',
                                      borderTop: '1px solid rgba(139, 92, 246, 0.15)'
                                    }}
                                  >
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        fontSize: '0.74rem',
                                        fontWeight: '700',
                                        color: isFutureMonth ? TimelineColor.PRIMARY_LIGHT : paletteTheme.primary,
                                        marginBottom: '5px'
                                      }}
                                    >
                                      <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                                        <Target size={12} />
                                        <span>{labelTitle}</span>
                                        {pInitial > 0 && (
                                          <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: '500', marginLeft: '4px' }}>
                                            ({t('pocket.initialContributionNote', { amount: formatCurrency(pInitial) })})
                                          </span>
                                        )}
                                      </span>
                                      <span
                                        style={{
                                          color: pPercent >= 100
                                            ? TimelineColor.SUCCESS
                                            : isFutureMonth
                                              ? TimelineColor.PRIMARY_LIGHT
                                              : paletteTheme.primary,
                                          fontWeight: '800'
                                        }}
                                      >
                                        {labelPercent}
                                      </span>
                                    </div>

                                    <div
                                      style={{
                                        width: '100%',
                                        height: '6px',
                                        background: 'rgba(148, 163, 184, 0.15)',
                                        borderRadius: '9999px',
                                        overflow: 'hidden',
                                        position: 'relative'
                                      }}
                                    >
                                      <div
                                        style={{
                                          width: `${pPercent}%`,
                                          height: '100%',
                                          background: pPercent >= 100
                                            ? `linear-gradient(90deg, ${TimelineColor.SUCCESS} 0%, ${TimelineColor.EMERALD} 100%)`
                                            : `linear-gradient(90deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`,
                                          borderRadius: '9999px',
                                          transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                          boxShadow: '0 0 10px rgba(99, 102, 241, 0.45)'
                                        }}
                                      />
                                    </div>
                                  </div>
                                );
                              })()}

                              {/* Abaixo: Os eventos como já ficavam no card do mês */}
                              {pocketMonthEvents.length > 0 ? (
                                <div style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {groupEventsByDate(pocketMonthEvents).map((dateGroup, gIdx) => (
                                    <div key={`${dateGroup.date}_${gIdx}`}>
                                      <TimelineEventCard
                                        events={dateGroup.events}
                                        timelineColor={timeline.color}
                                        allEvents={timeline.events || []}
                                        timelines={effectiveTimelines || timelines}
                                        currentTimelineId={timeline.id}
                                        timelineType={timeline.type}
                                        activeFinancialTab={activeFinancialTab}
                                        persons={persons}
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
                                  ))}
                                </div>
                              ) : (
                                <div
                                  style={{
                                    padding: '8px 10px',
                                    borderRadius: '6px',
                                    background: 'rgba(255, 255, 255, 0.01)',
                                    border: '1px dashed var(--border-glass)',
                                    fontSize: '0.74rem',
                                    color: 'var(--text-dim)',
                                    textAlign: 'center',
                                    marginTop: '2px'
                                  }}
                                >
                                  {t('timeline.noEventsMonth')}
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Eventos não associados a nenhum cofrinho */}
                        {unassignedEvents.length > 0 && (
                          <div style={{ marginTop: '6px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {groupEventsByDate(unassignedEvents).map((dateGroup, gIdx) => (
                              <div key={`unassigned_${dateGroup.date}_${gIdx}`}>
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
                                  onAddChecklistItem={onAddChecklistItem}
                                  onDeleteChecklistItem={onDeleteChecklistItem}
                                  onToggleLoanPayment={onToggleLoanPayment}
                                  onPayUpToHere={onPayUpToHere}
                                  onOpenEditInstallment={onOpenEditInstallment}
                                  onNavigateToTimeline={onNavigateToTimeline}
                                  onPrintReceipt={handleOpenReceipt}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })() : hasEvents ? (
                    (mGroup.groupedDateEvents || groupEventsByDate(mGroup.events)).map((dateGroup, gIdx) => (
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
                          onAddChecklistItem={onAddChecklistItem}
                          onDeleteChecklistItem={onDeleteChecklistItem}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onPayUpToHere={onPayUpToHere}
                          onOpenEditInstallment={onOpenEditInstallment}
                          onNavigateToTimeline={onNavigateToTimeline}
                          onPrintReceipt={handleOpenReceipt}
                          persons={persons}
                        />
                      </div>
                    ))
                  ) : (
                    <div
                      className="empty-day-row"
                      onClick={() => {
                        if (isLoanTimelineOrTab) return;
                        const nature = timeline.type === TimelineType.EXPENSE
                          ? EventType.EXPENSE
                          : timeline.type === TimelineType.INVESTMENT
                            ? EventType.INVESTMENT
                            : isReminders
                              ? EventType.REMINDER
                              : EventType.INCOME;
                        onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-01'), nature);
                      }}
                      style={{
                        cursor: isLoanTimelineOrTab ? 'default' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                        <span className="empty-day-text">
                          {isLoanTimelineOrTab ? t('timeline.noLoanMonth') : isReminders ? t('reminderHeader.noReminders') : t('timeline.noTabRecords')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão Carregar Mais Passado */}
        {renderPastHorizonButton()}
      </div>
    );
  };

  const renderYearView = () => {
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
        {renderFutureHorizonButton()}

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
                          <span className="event-tag" style={{ background: 'rgba(99, 102, 241, 0.2)', color: 'var(--primary-light)' }}>
                            {t('timeline.eventsCount', { count: mGroup.events.length })}
                          </span>
                        </div>

                        {hasEvents ? (
                          groupEventsByDate(mGroup.events).map((dateGroup, gIdx) => (
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
                            onClick={() => onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-01'))}
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
        {renderPastHorizonButton()}
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: `linear-gradient(180deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)` }}
        />

        {/* Botão Carregar Mais Futuro */}
        {renderFutureHorizonButton()}

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
                  onClick={() => onAddEventForDate(dateKey)}
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
                    onClick={() => onAddEventForDate(dateKey)}
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
        {renderPastHorizonButton()}
      </div>
    );
  };

  const renderFilteredStatusListView = () => {
    const sortedEvents = [...filteredEvents].sort((a, b) => {
      const dateA = a.date || a.dueDate || '';
      const dateB = b.date || b.dueDate || '';
      return dateB.localeCompare(dateA);
    });

    const grouped = groupEventsByDate(sortedEvents);

    return (
      <div className="filtered-events-stack-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%', padding: '4px 0 24px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 4px 12px 4px', borderBottom: '1px solid var(--border-glass)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)' }}>
            <Filter size={15} style={{ color: 'var(--primary-light)' }} />
            <span>{t('timeline.eventsCount', { count: filteredEvents.length })}</span>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={resetAllFilters}
            style={{ fontSize: '0.74rem', padding: '4px 10px' }}
          >
            {t('status.all')}
          </button>
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
  };

  return (
    <div className="timeline-workspace-layout">
      {/* 🧭 Left Filter Sidebar Cockpit */}
      <aside className="filter-sidebar">
        <div className="sidebar-header-title">
          <Filter size={15} style={{ color: 'var(--primary-light)' }} />
          <span>{t('sidebar.filtersNavigation')}</span>
        </div>

        {/* 🌟 0. Timelines do Timeboard vindas da Base de Dados */}
        {((timelines && timelines.length > 0) || (timeline?.timelines && timeline.timelines.length > 0)) && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSectionCollapse('timelines')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronDown
                  size={13}
                  style={{
                    transform: collapsedSections['timelines'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                    color: 'var(--text-muted)'
                  }}
                />
                <span>{t('sidebar.timelines')}</span>
              </div>
              {onCreateTimeline && (
                <div ref={timelineDropdownRef} onClick={(e) => e.stopPropagation()} style={{ position: 'relative', display: 'inline-block' }}>
                  <button
                    type="button"
                    onClick={() => setIsTimelineDropdownOpen((prev) => !prev)}
                    title={t('sidebar.newTimeline')}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      border: 'none',
                      background: 'var(--primary)',
                      color: TimelineColor.WHITE,
                      fontSize: '0.72rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(99, 102, 241, 0.35)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Plus size={13} />
                    <span>{t('buttons.new')}</span>
                  </button>

                  {isTimelineDropdownOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        right: 0,
                        marginTop: '6px',
                        minWidth: '200px',
                        background: 'var(--bg-card)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        border: '1px solid var(--border-glass)',
                        borderRadius: '10px',
                        boxShadow: '0 16px 40px rgba(0, 0, 0, 0.5), 0 0 20px rgba(99, 102, 241, 0.15)',
                        padding: '6px',
                        zIndex: 100,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '2px'
                      }}
                    >
                      {timelineOptions.map((opt, optIdx) => (
                        <button
                          key={opt.key || `opt-${optIdx}`}
                          type="button"
                          onClick={() => {
                            setIsTimelineDropdownOpen(false);
                            if (onCreateTimeline) {
                              onCreateTimeline(opt.type);
                            }
                          }}
                          style={{
                            width: '100%',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid transparent',
                            background: 'transparent',
                            color: 'var(--text-main)',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                            textAlign: 'left',
                            transition: 'all 0.15s ease'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = 'rgba(99, 102, 241, 0.14)';
                            e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                            e.currentTarget.style.color = 'var(--primary-light)';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = 'transparent';
                            e.currentTarget.style.borderColor = 'transparent';
                            e.currentTarget.style.color = 'var(--text-main)';
                          }}
                        >
                          {opt.icon}
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
            {!collapsedSections['timelines'] && (
              <div className="sidebar-btn-group">
              {((timelines && timelines.length > 0) ? timelines : (timeline?.timelines || [])).map((tl, tlIdx) => {
                const isActive = activeFinancialTab === tl.id || timeline?.id === tl.id;
                const tlColor = tl.color;
                const getTimelineIcon = (type) => {
                  switch (type) {
                    case TimelineType.INCOME:
                      return <DollarSign size={14} style={{ color: tlColor }} />;
                    case TimelineType.EXPENSE:
                      return <ShoppingCart size={14} style={{ color: tlColor }} />;
                    case TimelineType.INVESTMENT:
                      return <PiggyBank size={14} style={{ color: tlColor }} />;
                    case TimelineType.LOAN:
                      return <CreditCard size={14} style={{ color: tlColor }} />;
                    case TimelineType.BALANCE:
                      return <Scale size={14} style={{ color: tlColor }} />;
                    case TimelineType.REMINDER:
                    case 'reminder':
                    case 'reminders':
                      return <Bell size={14} style={{ color: tlColor }} />;
                    case TimelineType.PROJECT:
                    case 'project':
                    case 'projects':
                      return <FolderKanban size={14} style={{ color: tlColor }} />;
                    case TimelineType.DIARY:
                    case 'diary':
                      return <BookOpen size={14} style={{ color: tlColor }} />;
                    case TimelineType.TODO:
                    case 'todo':
                    case 'todos':
                      return <CheckSquare size={14} style={{ color: tlColor }} />;
                    case TimelineType.FOLLOWUP:
                    case 'followup':
                    case 'followups':
                      return <ListTree size={14} style={{ color: tlColor }} />;
                    default:
                      return <Layers size={14} style={{ color: tlColor }} />;
                  }
                };

                return (
                  <button
                    key={tl.id || `tl-${tlIdx}`}
                    type="button"
                    className={`sidebar-filter-item ${isActive ? 'active' : ''}`}
                    onClick={() => {
                      if (onSelectFinancialTab) onSelectFinancialTab(tl.id);
                      if (onNavigateToTimeline) onNavigateToTimeline(tl.id);
                    }}
                    style={isActive ? {
                      borderColor: tlColor,
                      background: tlColor ? `${tlColor}20` : undefined,
                      color: tlColor
                    } : {}}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                        {getTimelineIcon(tl.type)}
                      </span>
                      <span style={{ fontWeight: '700' }}>{tl.name}</span>
                    </div>
                    {isActive && <span style={{ fontSize: '0.75rem', color: tlColor }}>✓</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

        {/* 1. Search Box */}
        <div className="sidebar-section">
          <div className="search-box">
            <Search size={15} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder={t('sidebar.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => {
                const val = e.target.value;
                if (!isListView && val.trim().length > 0) {
                  window.scrollTo({ top: 0, behavior: 'instant' });
                }
                setSearchQuery(val);
              }}
            />
          </div>
        </div>


        {/* 3. Estado Filter (Multi-Selection) */}
        <div className="sidebar-section">
          <div
            className="sidebar-section-title"
            style={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => toggleSectionCollapse('status')}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <ChevronDown
                size={13}
                style={{
                  transform: collapsedSections['status'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                  transition: 'transform 0.18s ease',
                  color: 'var(--text-muted)'
                }}
              />
              <span>{t('sidebar.status')}</span>
            </div>
            {selectedStatusFilters.length > 0 && (
              <button
                type="button"
                className="sidebar-action-link"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAllStatuses();
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-light)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  padding: 0,
                  fontWeight: '700'
                }}
              >
                {t('buttons.all')}
              </button>
            )}
          </div>
          {!collapsedSections['status'] && (
            <div className="sidebar-btn-group">
              {getStatusFilterOptions().map((st, stIdx) => {
                const isAllOption = st.id === EventStatus.ALL;
                const isSelected = isAllOption ? selectedStatusFilters.length === 0 : selectedStatusFilters.includes(st.id);
                return (
                  <button
                    key={st.id || `st-${stIdx}`}
                    type="button"
                    className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleStatusFilter(st.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {st.icon}
                      <span>{st.name}</span>
                    </div>
                    {renderFilterSwitch(isSelected, 'var(--primary)')}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 4. Timelines Filter (Multi-Selection for Balance) */}
        {timeline.type === TimelineType.BALANCE && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSectionCollapse('integratedTimelines')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronDown
                  size={13}
                  style={{
                    transform: collapsedSections['integratedTimelines'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                    color: 'var(--text-muted)'
                  }}
                />
                <span>{t('sidebar.integratedTimelines')}</span>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  selectAllTimelines();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary-light)',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  fontWeight: '700'
                }}
              >
                {selectedTimelineIds.length === availableCreditOptions.length ? t('buttons.deselectAll') : t('buttons.all')}
              </button>
            </div>
            {!collapsedSections['integratedTimelines'] && (
              <div className="sidebar-btn-group">
                {availableCreditOptions.map((opt, optIdx) => {
                  const isSelected = selectedTimelineIds.includes(opt.id);
                  return (
                    <button
                      key={opt.id || `opt-credit-${optIdx}`}
                      type="button"
                      className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                      onClick={() => toggleTimelineSelection(opt.id)}
                      style={isSelected ? { borderColor: opt.color } : { opacity: 0.6 }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                        <span>{opt.name}</span>
                      </div>
                      {renderFilterSwitch(isSelected, opt.color)}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. Tipo / Natureza Filter */}
        {timeline.type === TimelineType.EXPENSE ? (
          availableExpenseCategoryItems.length > 0 && (
            <div className="sidebar-section">
              <div
                className="sidebar-section-title"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSectionCollapse('categories')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: collapsedSections['categories'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.18s ease',
                      color: 'var(--text-muted)'
                    }}
                  />
                  <span>{t('sidebar.categoryType')}</span>
                </div>
                {selectedExpenseCategories.length > 0 && (
                  <button
                    type="button"
                    className="sidebar-action-link"
                    onClick={(e) => {
                      e.stopPropagation();
                      selectAllExpenseCategories();
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--primary-light)',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      padding: 0,
                      fontWeight: '700'
                    }}
                  >
                    {t('buttons.all')}
                  </button>
                )}
              </div>
              {!collapsedSections['categories'] && (
                <div className="sidebar-btn-group" style={{ maxHeight: '320px', overflowY: 'auto', paddingRight: '2px' }}>
                  {/* Opção "Todas as Categorias" */}
                  <button
                    type="button"
                    className={`sidebar-filter-item ${selectedExpenseCategories.length === 0 ? 'active' : ''}`}
                    onClick={() => setSelectedExpenseCategories([])}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Layers size={13} />
                      <span>{t('sidebar.allCategories')}</span>
                    </div>
                    {renderFilterSwitch(selectedExpenseCategories.length === 0, 'var(--primary)')}
                  </button>

                  {/* Lista de Categorias de Despesas que possuem eventos */}
                  {availableExpenseCategoryItems.map((cat, catIdx) => {
                    const isSelected = selectedExpenseCategories.includes(cat.id);
                    const IconComponent = cat.icon;
                    return (
                      <button
                        key={cat.id || `exp-cat-${catIdx}`}
                        type="button"
                        className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                        onClick={() => toggleExpenseCategory(cat.id)}
                        style={isSelected ? { borderColor: `${cat.color}66` } : {}}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ color: cat.color, display: 'inline-flex', alignItems: 'center' }}>
                            <IconComponent size={13} />
                          </span>
                          <span>{t(`expenseCategories.${cat.id}`)}</span>
                        </div>
                        {renderFilterSwitch(isSelected, cat.color)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )
        ) : timeline.type !== TimelineType.BALANCE && (
          availableCategoryOptions.length > 1 && (
            <div className="sidebar-section">
              <div
                className="sidebar-section-title"
                style={{ cursor: 'pointer', userSelect: 'none' }}
                onClick={() => toggleSectionCollapse('categories')}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <ChevronDown
                    size={13}
                    style={{
                      transform: collapsedSections['categories'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.18s ease',
                      color: 'var(--text-muted)'
                    }}
                  />
                  <span>{timeline.type === TimelineType.INVESTMENT ? t('pocket.filterByPockets') : t('sidebar.categoryType')}</span>
                </div>
              </div>
              {!collapsedSections['categories'] && (
                <div className="sidebar-btn-group">
                  {availableCategoryOptions.map((cat, catIdx) => {
                    const isSelected = selectedCategoryFilter === cat.id;
                    return (
                      <button
                        key={cat.id || `cat-filter-${catIdx}`}
                        type="button"
                        className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                        onClick={() => {
                          if (!isListView && cat.id !== EventStatus.ALL) {
                            window.scrollTo({ top: 0, behavior: 'instant' });
                          }
                          setSelectedCategoryFilter(cat.id);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {cat.icon}
                          <span>{cat.name}</span>
                        </div>
                        {renderFilterSwitch(isSelected, 'var(--primary)')}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )
        )}

        {/* 🌟 6. Entidades / Individuals Filter (Single Selection) */}
        {timelineEntities.length > 0 && (
          <div className="sidebar-section">
            <div
              className="sidebar-section-title"
              style={{ cursor: 'pointer', userSelect: 'none' }}
              onClick={() => toggleSectionCollapse('entities')}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <ChevronDown
                  size={13}
                  style={{
                    transform: collapsedSections['entities'] ? 'rotate(-90deg)' : 'rotate(0deg)',
                    transition: 'transform 0.18s ease',
                    color: 'var(--text-muted)'
                  }}
                />
                <span>{t('sidebar.entities')}</span>
              </div>
              {selectedEntityId && (
                <button
                  type="button"
                  className="sidebar-action-link"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedEntityId(null);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--primary-light)',
                    cursor: 'pointer',
                    fontSize: '0.72rem',
                    padding: 0,
                    fontWeight: '700'
                  }}
                >
                  {t('buttons.all')}
                </button>
              )}
            </div>

            {!collapsedSections['entities'] && (
              <div className="sidebar-btn-group" style={{ maxHeight: '260px', overflowY: 'auto', paddingRight: '2px' }}>
                {/* Opção "Todas as Entidades" */}
                <button
                  type="button"
                  className={`sidebar-filter-item ${!selectedEntityId ? 'active' : ''}`}
                  onClick={() => setSelectedEntityId(null)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={13} />
                    <span>{t('sidebar.allEntities')}</span>
                  </div>
                  {renderFilterSwitch(!selectedEntityId, 'var(--primary)')}
                </button>

                {/* Lista de Entidades que possuem eventos nesta timeline */}
                {timelineEntities.map((ent) => {
                  const isSelected = String(selectedEntityId) === String(ent.id);
                  return (
                    <button
                      key={ent.id}
                      type="button"
                      className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                      onClick={() => setSelectedEntityId((prev) => (String(prev) === String(ent.id) ? null : ent.id))}
                      title={ent.name}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}>
                          {getEntityIcon(ent.type)}
                        </span>
                        <span
                          style={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            fontSize: '0.8rem'
                          }}
                        >
                          {ent.name}
                        </span>
                      </div>
                      {renderFilterSwitch(isSelected, 'var(--primary)')}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 7. Períodos Vazios Toggle */}
        <div className="sidebar-section">
          <div
            className="sidebar-filter-item"
            onClick={() => setShowEmptyDays(!showEmptyDays)}
            style={{ cursor: 'pointer' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {showEmptyDays ? <Eye size={15} /> : <EyeOff size={15} />}
              <span>{showEmptyDays ? t('sidebar.hideEmpty') : t('sidebar.showEmpty')}</span>
            </div>
            {renderFilterSwitch(showEmptyDays, 'var(--primary)')}
          </div>
        </div>
      </aside>

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
        {!isFinancialTimeline && (
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
            renderFilteredStatusListView()
          ) : (
            <>
              {groupBy === 'semana' && renderWeekView()}
              {groupBy === 'mes' && renderMonthView()}
              {groupBy === 'ano' && renderYearView()}
              {groupBy === 'dia' && renderDayView()}
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
                onClick={() => onAddEventForDate(todayStr)}
              >
                <Plus size={16} /> {t('timeline.addEventToday')}
              </button>
            )}
          </div>
        )}

        {/* Modal de Impressão / Pré-visualização do Recibo */}
        {receiptModalData && receiptModalData.isOpen && (
          <ReceiptModal
            isOpen={receiptModalData.isOpen}
            onClose={() => setReceiptModalData(null)}
            htmlContent={receiptModalData.htmlContent}
            title={receiptModalData.title}
            onPrint={handleReceiptPrint}
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
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
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
              {t('receipt.generatingReceipt')}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(VerticalTimeline);
