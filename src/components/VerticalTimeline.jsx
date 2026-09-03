import React, { useState, useMemo } from 'react';
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
  endOfMonth
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
  LocateFixed,
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
  Square,
  Home,
  Car,
  CreditCard,
  Gift,
  ArrowUp,
  ArrowDown,
  FileText,
  Zap,
  Activity
} from 'lucide-react';
import TimelineEventCard from './TimelineEventCard';
import FloatingTaskStack from './FloatingTaskStack';
import { getGroupingForPeriodicity, formatCurrency } from '../utils/loanCalculations';
import { EventType, EventStatus, EventStatusLabel, TimelineType, IncomeEventCategory, ExpensesEventCategory, InvestmentEventCategory, LoanEventCategory } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

function VerticalTimeline({
  timeline,
  timelines = [],
  activeFinancialTab = '',
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
  onOpenEditInstallment,
  onOpenAmortizationModal,
  onNavigateToTimeline,
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

  const isLoanTimelineOrTab = timeline.type === TimelineType.LOAN;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState(EventStatus.ALL);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState('Todos');
  const [showEmptyDays, setShowEmptyDays] = useState(true);

  // Multi-selection of timelines for Balance view (derived dynamically from real timelines)
  const availableCreditOptions = useMemo(() => {
    return (timelines || []).filter((t) => t.type !== TimelineType.BALANCE).map((t) => ({
      id: t.id,
      name: t.name,
      color: t.color || '#6366f1'
    }));
  }, [timelines]);

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
    if (timeline.type !== TimelineType.LOAN) {
      return [
        { id: 'dia', name: t('sidebar.day'), icon: <Calendar size={14} /> },
        { id: 'semana', name: t('sidebar.week'), icon: <Layers size={14} /> },
        { id: 'mes', name: t('sidebar.month'), icon: <Clock size={14} /> },
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    const p = (timeline.periodicity || 'mensal').toLowerCase();
    if (p === 'anual') {
      return [
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    if (p === 'mensal' || p === 'bimestral' || p === 'semestral') {
      return [
        { id: 'mes', name: t('sidebar.month'), icon: <Clock size={14} /> },
        { id: 'ano', name: t('sidebar.year'), icon: <Sparkles size={14} /> }
      ];
    }
    if (p === 'quinzenal') {
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

      const elementDocTop = targetNode.getBoundingClientRect().top + window.pageYOffset;
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

  // Track physical or programmatic scroll position to mark user interaction
  React.useEffect(() => {
    const handleUserInteraction = () => {
      userInteractedRef.current = true;
    };
    if (window.scrollY > 0) {
      userInteractedRef.current = true;
    }
    window.addEventListener('scroll', handleUserInteraction, { passive: true });
    window.addEventListener('wheel', handleUserInteraction, { passive: true });
    window.addEventListener('touchmove', handleUserInteraction, { passive: true });
    window.addEventListener('keydown', handleUserInteraction, { passive: true });
    window.addEventListener('mousedown', handleUserInteraction, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleUserInteraction);
      window.removeEventListener('wheel', handleUserInteraction);
      window.removeEventListener('touchmove', handleUserInteraction);
      window.removeEventListener('keydown', handleUserInteraction);
      window.removeEventListener('mousedown', handleUserInteraction);
    };
  }, []);

  // Auto-scroll directly to Current Month (August 2026) on mount or tab switch
  React.useEffect(() => {
    userInteractedRef.current = false;
    positionOnToday('instant');
    const t1 = setTimeout(() => {
      if (!userInteractedRef.current) positionOnToday('instant');
    }, 50);
    const t2 = setTimeout(() => {
      if (!userInteractedRef.current) positionOnToday('instant');
    }, 200);
    const t3 = setTimeout(() => {
      if (!userInteractedRef.current) positionOnToday('instant');
    }, 500);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [timeline?.id, activeFinancialTab, positionOnToday]);

  // Reference to Today using current system date
  const todayDate = new Date();
  const todayStr = format(todayDate, 'yyyy-MM-dd');

  // Extract pending floating tasks (category === 'tarefa' and !isCompleted)
  const allEvents = timeline.events || [];
  const pendingFloatingTasks = allEvents.filter(
    (ev) => ev.category === 'tarefa' && ev.isCompleted === false
  );

  // Events that belong on the timeline (non-floating OR completed tasks fixed to dates)
  const timelineEvents = allEvents.filter(
    (ev) => !(ev.category === 'tarefa' && ev.isCompleted === false)
  );

  const isBalancoView = timeline.type === TimelineType.BALANCE;

  // Determine earliest and latest dates in timeline dynamically
  const currentMonthStart = startOfMonth(todayDate);
  const currentMonthEnd = endOfMonth(todayDate);
  const startDateObj = isBalancoView ? subMonths(currentMonthStart, 11) : subMonths(currentMonthStart, Math.max(1, pastHorizonYears) * 12);
  const maxDateObj = isBalancoView ? currentMonthEnd : addMonths(currentMonthEnd, Math.max(1, futureHorizonYears) * 12);

  // Generate array of days from startDate up to maxDateObj (Descending: future at top, past at bottom)
  const daysArray = useMemo(() => {
    try {
      const daysAscending = eachDayOfInterval({
        start: startDateObj,
        end: maxDateObj
      });
      return daysAscending.reverse();
    } catch (err) {
      return [todayDate];
    }
  }, [startDateObj.getTime(), maxDateObj.getTime()]);

  // Filter events based on search query, status, category, and label
  const filteredEvents = useMemo(() => {
    if (!timelineEvents) return [];
    return timelineEvents.filter((ev) => {
      const matchesSearch =
        searchQuery === '' ||
        ((ev.title || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((ev.description || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.labels && ev.labels.some((l) => (l || '').toLowerCase().includes(searchQuery.toLowerCase())));

      let matchesStatus = selectedStatusFilter === EventStatus.ALL || selectedStatusFilter === 'Todos';
      if (!matchesStatus) {
        if (selectedStatusFilter === EventStatus.RECEIVED) {
          matchesStatus = ev.status === EventStatus.RECEIVED || ev.status === EventStatus.PAID;
        } else if (selectedStatusFilter === EventStatus.PENDING) {
          matchesStatus = (ev.status === EventStatus.PENDING || ev.status === EventStatus.PLANNED) && (!ev.isIncome || ev.date >= todayStr);
        } else if (selectedStatusFilter === EventStatus.OVERDUE) {
          matchesStatus = ev.status === EventStatus.OVERDUE || (ev.isIncome && ev.date < todayStr && ev.status !== EventStatus.RECEIVED);
        } else {
          matchesStatus = ev.status === selectedStatusFilter;
        }
      }

      const matchesCategory =
        selectedCategoryFilter === 'all' ||
        selectedCategoryFilter === 'Todos' ||
        ev.category === selectedCategoryFilter;

      const matchesTimelineMultiSelect =
        timeline.type !== TimelineType.BALANCE ||
        selectedTimelineIds.length === 0 ||
        selectedTimelineIds.includes(ev.timelineId) ||
        selectedTimelineIds.includes(ev.timelineOriginId);

      const matchesLabel =
        selectedLabelFilter === 'Todos' ||
        (ev.labels && ev.labels.includes(selectedLabelFilter));

      if (!matchesStatus || !matchesCategory || !matchesTimelineMultiSelect || !matchesLabel) {
        return false;
      }

      // Financial Tabs Filter by TimelineType
      if (isFinancialTimeline) {
        if (timeline.type === TimelineType.INCOME) {
          const isIncome = ev.eventType === EventType.INCOME || ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id;
          if (!isIncome) return false;
        } else if (timeline.type === TimelineType.EXPENSE) {
          const isExpense = ev.eventType === EventType.EXPENSE || ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id;
          if (!isExpense) return false;
        } else if (timeline.type === TimelineType.INVESTMENT) {
          const isInvestment = ev.eventType === EventType.INVESTMENT || ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id;
          if (!isInvestment) return false;
        } else if (timeline.type === TimelineType.LOAN) {
          const isThisLoan = ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id || (ev.eventType === EventType.LOAN_INSTALLMENT || ev.eventType === EventType.AMORTIZATION);
          if (!isThisLoan) return false;
        }
        // TimelineType.BALANCE shows all integrated movements
      }

      // No Balanço: mostrar somente até ao fim do mês corrente
      if (isBalancoView) {
        const currentMonthEndStr = format(currentMonthEnd, 'yyyy-MM-dd');
        if (ev.date > currentMonthEndStr) {
          return false;
        }
      }

      // Respeitar os limites dinâmicos do horizonte de tempo para todas as timelines financeiras
      if (isFinancialTimeline && !isBalancoView) {
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
    selectedStatusFilter,
    selectedCategoryFilter,
    selectedLabelFilter,
    selectedTimelineIds,
    timeline.type,
    timeline.id,
    isFinancialTimeline,
    activeFinancialTab,
  ]);

  // Re-anchor scroll on Today when events load from backend if user has not manually interacted
  React.useLayoutEffect(() => {
    if (!userInteractedRef.current) {
      positionOnToday('instant');
    }
  }, [filteredEvents, timelineEvents, positionOnToday]);
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
    return map;
  }, [filteredEvents]);

  // ========================================================
  // RENDER ENGINES BY GROUPBY MODE
  // ========================================================

  const renderWeekView = () => {
    const weekMap = new Map();

    daysArray.forEach((dayObj) => {
      const weekStart = startOfWeek(dayObj, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(dayObj, { weekStartsOn: 1 });
      const weekKey = format(weekStart, 'yyyy-MM-dd');

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, {
          weekStart,
          weekEnd,
          weekNum: getWeek(weekStart),
          events: []
        });
      }
    });

    filteredEvents.forEach((ev) => {
      try {
        const evDate = parseISO(ev.date);
        for (let [weekKey, weekData] of weekMap.entries()) {
          if (isSameWeek(evDate, weekData.weekStart, { weekStartsOn: 1 })) {
            weekData.events.push(ev);
            break;
          }
        }
      } catch (e) { }
    });

    const weeksList = Array.from(weekMap.values());

    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

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
                <div className="day-date-main">{language === 'en' ? `WEEK ${weekData.weekNum}` : `SEMANA ${weekData.weekNum}`}</div>
                <div className="day-date-sub">{format(weekData.weekStart, 'yyyy')}</div>
                {isCurrentWeek && <span className="today-badge-chip pulse-glow">{language === 'en' ? 'CURRENT WEEK' : 'SEMANA ATUAL'}</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentWeek ? 'is-today-node' : hasEvents ? 'has-events' : ''
                    }`}
                  style={hasEvents && !isCurrentWeek ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header">
                    <h3 className="group-card-title">
                      {language === 'en' ? `Week ${weekData.weekNum}` : `Semana ${weekData.weekNum}`} ({weekStartStr} - {weekEndStr})
                    </h3>
                    <span className="group-card-badge">
                      {t('timeline.eventsCount', { count: weekData.events.length })}
                    </span>
                  </div>

                  {hasEvents ? (
                    weekData.events.map((ev) => (
                      <div
                        key={ev.id}
                        id={ev.status === EventStatus.OVERDUE ? 'loan-inst-overdue' : undefined}
                        style={{ marginBottom: '12px' }}
                      >
                        <div style={{ fontSize: '0.78rem', color: 'var(--primary-light)', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} />
                          <span>{format(parseISO(ev.date), language === 'en' ? 'EEEE, MMMM d' : "EEEE, d 'de' MMMM", { locale: dateLocale })}</span>
                        </div>
                        <TimelineEventCard
                          event={ev}
                          allEvents={timeline.events || []}
                          currentTimelineId={timeline.id}
                          timelineType={timeline.type}
                          activeFinancialTab={activeFinancialTab}
                          onEdit={onEditEvent}
                          onUpdateEventDirect={onUpdateEventDirect}
                          onDelete={onDeleteEvent}
                          onToggleTask={onToggleTask}
                          onToggleLoanPayment={onToggleLoanPayment}
                          onOpenEditInstallment={onOpenEditInstallment}
                          onNavigateToTimeline={onNavigateToTimeline}
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
      </div>
    );
  };

  const renderMonthView = () => {
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
          events: []
        });
      });
    } catch {
      monthMap.set(format(todayDate, 'yyyy-MM'), { monthDate: todayDate, events: [] });
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
    });

    const monthsList = Array.from(monthMap.values());

    // Pre-calculate total projected expenses per month across all events
    const monthExpensesTotalMap = useMemo(() => {
      const map = new Map();
      (timelineEvents || []).forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
        const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT;
        const isInvestment = ev.eventType === EventType.INVESTMENT;
        const isExpense = ev.eventType === EventType.EXPENSE || isLoan;

        if (isExpense) {
          const mKey = ev.date.substring(0, 7);
          map.set(mKey, (map.get(mKey) || 0) + Number(ev.amount || 0));
        }
      });
      return map;
    }, [timelineEvents]);

    // Pre-calculate total projected income per month across all events
    const monthIncomeTotalMap = useMemo(() => {
      const map = new Map();
      (timelineEvents || []).forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
        const isIncome = ev.eventType === EventType.INCOME;

        if (isIncome) {
          const mKey = ev.date.substring(0, 7);
          map.set(mKey, (map.get(mKey) || 0) + Number(ev.amount || 0));
        }
      });
      return map;
    }, [timelineEvents]);

    // Pre-calculate total projected investments per month across all events
    const monthInvestmentsTotalMap = useMemo(() => {
      const map = new Map();
      (timelineEvents || []).forEach((ev) => {
        if (!ev || !ev.date || ev.isDeleted) return;
        if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
        const isInvestment = ev.eventType === EventType.INVESTMENT;

        if (isInvestment) {
          const mKey = ev.date.substring(0, 7);
          map.set(mKey, (map.get(mKey) || 0) + Number(ev.amount || 0));
        }
      });
      return map;
    }, [timelineEvents]);

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
        const amt = Number(ev.amount || 0);
        const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent;
        const isIncome = ev.eventType === EventType.INCOME;
        const isExpense = ev.eventType === EventType.EXPENSE || isLoan;
        const isInvestment = ev.eventType === EventType.INVESTMENT;

        const initialKey = ev.eventId || ev.seriesId || ev.id;
        let initialAmt = 0;
        if (isInvestment && ev.initialInvestedAmount && !seenInitialInvestments.has(initialKey)) {
          initialAmt = Number(ev.initialInvestedAmount) || 0;
          seenInitialInvestments.add(initialKey);
        }

        if (isIncome) mInc += amt;
        if (isExpense) mExp += amt;
        if (isInvestment) mInv += amt + initialAmt;
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
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

        {/* Botão de Carregar / Projetar Mais Meses Futuros */}
        {onLoadMoreFuture && !isBalancoView && (
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
              <span>Projetar +12 Meses Futuros</span>
            </button>
          </div>
        )}

        {monthsList.map((mGroup) => {
          const currentMonthKey = format(todayDate, 'yyyy-MM');
          const monthKeyStr = format(mGroup.monthDate, 'yyyy-MM');
          const isCurrentMonth = currentMonthKey === monthKeyStr;
          const isFutureMonth = monthKeyStr > currentMonthKey;
          const monthTitleStr = format(mGroup.monthDate, 'MMMM yyyy', { locale: dateLocale });
          const hasEvents = mGroup.events.length > 0;

          // Calculate month stats
          let mMonthIncome = 0;
          let mMonthExpense = 0;
          let mMonthInvestment = 0;

          let mMonthIncomePaid = 0;
          let mMonthExpensePaid = 0;
          let mMonthInvestmentPaid = 0;

          mGroup.events.forEach((ev) => {
            if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED || ev.isDeleted) return;

            const amt = Number(ev.amount || 0);
            const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT;
            const isInvestment = ev.eventType === EventType.INVESTMENT || ev.isInvestment;
            const isIncome = (ev.eventType === EventType.INCOME || ev.isIncome) && !ev.isExpense && !ev.isInvestment && !isLoan;
            const isExpense = ((ev.eventType === EventType.EXPENSE || ev.isExpense) || isLoan) && !isInvestment;

            const isIncomeReceived = ev.status === EventStatus.RECEIVED || ev.status === EventStatus.PAID || ev.isCompleted;
            const isExpensePaid = ev.status === EventStatus.PAID || ev.status === EventStatus.SETTLED || ev.isCompleted;
            const isInvested = ev.status === EventStatus.INVESTED || ev.status === EventStatus.PAID || ev.isCompleted;

            if (isIncome) {
              mMonthIncome += amt;
              if (isIncomeReceived) mMonthIncomePaid += amt;
            }
            if (isExpense) {
              mMonthExpense += amt;
              if (isExpensePaid) mMonthExpensePaid += amt;
            }
            if (isInvestment) {
              mMonthInvestment += amt;
              if (isInvested) mMonthInvestmentPaid += amt;
            }
          });

          // No Balanço: Se for mês passado ou atual, computar o que foi efetivamente recebido/pago/investido para atualizar dinamicamente com o status
          const effectiveIncome = isBalancoView ? (isFutureMonth ? mMonthIncome : mMonthIncomePaid) : mMonthIncome;
          const effectiveExpense = isBalancoView ? (isFutureMonth ? mMonthExpense : mMonthExpensePaid) : mMonthExpense;
          const effectiveInvestment = isBalancoView ? (isFutureMonth ? mMonthInvestment : mMonthInvestmentPaid) : mMonthInvestment;
          const mNetRealizedMonth = effectiveIncome - (effectiveExpense + effectiveInvestment);
          const mNetProjectedMonth = mMonthIncome - (mMonthExpense + mMonthInvestment);
          const cumData = monthCumulativeMap.get(monthKeyStr) || { income: 0, expense: 0, investment: 0 };
          const mMonthProjectedExpense = monthExpensesTotalMap.get(monthKeyStr) || 0;
          const mMonthProjectedIncome = monthIncomeTotalMap.get(monthKeyStr) || 0;
          const mMonthProjectedInvestment = monthInvestmentsTotalMap.get(monthKeyStr) || 0;
          const mMonthProjectedSaldo = mMonthProjectedIncome - (mMonthProjectedExpense + mMonthProjectedInvestment);

          if (!showEmptyDays && !hasEvents && !isCurrentMonth) return null;

          return (
            <div
              key={format(mGroup.monthDate, 'yyyy-MM')}
              id={isCurrentMonth ? 'timeline-node-today' : `timeline-month-${format(mGroup.monthDate, 'yyyy-MM')}`}
              data-month-key={format(mGroup.monthDate, 'yyyy-MM')}
              className={`timeline-day-row ${isCurrentMonth ? 'is-today' : ''} ${isFutureMonth ? 'is-future-month' : ''}`}
            >
              <div className="day-date-col">
                <div className="day-date-main" style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-main)' }}>
                  {format(mGroup.monthDate, 'MMM', { locale: dateLocale }).toUpperCase()}
                </div>
                <div className="day-date-sub" style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)' }}>
                  {format(mGroup.monthDate, 'yyyy')}
                </div>
                {isCurrentMonth && <span className="today-badge-chip pulse-glow">{language === 'en' ? 'CURRENT MONTH' : 'MÊS ATUAL'}</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentMonth ? 'is-today-node' : hasEvents ? 'has-events' : ''}`}
                  style={
                    hasEvents && !isCurrentMonth
                      ? {
                        backgroundColor: isFutureMonth ? 'rgba(148, 163, 184, 0.4)' : timeline.color,
                        borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.3)' : undefined
                      }
                      : {}
                  }
                />
              </div>

              <div className="day-content-col">
                <div className="group-card" style={isFutureMonth ? { borderColor: 'rgba(148, 163, 184, 0.18)' } : undefined}>
                  <div className="group-card-header" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {/* Linha Superior: Nome do Mês à esquerda, Contador e Botões de Ação à direita */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', width: '100%' }}>
                      <h3 className="group-card-title" style={{ margin: 0, textTransform: 'capitalize', color: isFutureMonth ? 'var(--text-muted)' : 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Clock size={18} style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)' }} /> {monthTitleStr}
                      </h3>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        {/* Badge do Contador */}
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

                        {/* Botão Amortizar no Mês (disponível do mês atual em diante; oculto em meses passados e em parcelas abatidas) */}
                        {onOpenAmortizationModal && isLoanTimelineOrTab && (() => {
                          const thisMonthStr = format(mGroup.monthDate, 'yyyy-MM');
                          if (thisMonthStr < '2026-08') return null;

                          const monthLoanEvents = mGroup.events.filter((e) => e.category === 'parcela_emprestimo');
                          const isAbatidaMonth = monthLoanEvents.length > 0 && monthLoanEvents.every((e) => e.isAbatida || e.status === 'Abatida');
                          if (isAbatidaMonth) return null;

                          return (
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              style={{
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)',
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
                                color: '#ffffff'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-15');
                                onOpenAmortizationModal(targetDayStr);
                              }}
                              title={`Amortizar (${monthTitleStr})`}
                            >
                              <TrendingDown size={14} />
                              <span>{t('buttons.amortize')}</span>
                            </button>
                          );
                        })()}

                        {/* Botão Adicionar Evento no Mês (oculto em timelines / abas de empréstimo) */}
                        {onAddEventForDate && !isLoanTimelineOrTab && (
                          <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            style={{
                              height: '26px',
                              padding: '0 10px',
                              fontSize: '0.75rem',
                              fontWeight: '700',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              borderRadius: '6px',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              const targetDayStr = format(mGroup.monthDate, 'yyyy-MM-01');
                              onAddEventForDate(
                                targetDayStr,
                                timeline.type === TimelineType.EXPENSE ? 'expense' : timeline.type === TimelineType.INVESTMENT ? 'investment' : 'income'
                              );
                            }}
                            title={t('timeline.addEventMonthTitle', { month: monthTitleStr })}
                          >
                            <Plus size={13} strokeWidth={2.5} />
                            <span>{t('buttons.addEvent')}</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Linha Inferior: Badges Projetados Unificados para linhas de tempo do Financeiro (oculto em empréstimos e créditos) */}
                    {isFinancialTimeline && !isLoanTimelineOrTab && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
                        {/* Indicador Projeção do Mês */}
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            fontSize: '0.72rem',
                            fontWeight: '700',
                            color: isFutureMonth ? 'var(--text-dim)' : 'var(--text-muted)',
                            textTransform: 'uppercase',
                            letterSpacing: '0.04em',
                            marginRight: '2px'
                          }}
                        >
                          <Sparkles size={12} style={{ color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)' }} />
                          <span>{t('timeline.monthProjection')}</span>
                        </span>

                        {/* 1. Entradas Projetadas */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthProjectedIncome > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)'),
                            color: isFutureMonth ? 'var(--text-dim)' : (mMonthProjectedIncome > 0 ? '#10b981' : 'var(--text-dim)'),
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthProjectedIncome > 0 ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-glass)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title={t('timeline.monthIncomeTitle')}
                        >
                          <DollarSign size={12} />
                          <span>+{formatCurrency(mMonthProjectedIncome)}</span>
                        </span>

                        {/* 2. Gasto Projetado */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthProjectedExpense > 0 ? 'rgba(244, 63, 94, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                            color: isFutureMonth ? 'var(--text-dim)' : (mMonthProjectedExpense > 0 ? '#f43f5e' : 'var(--text-dim)'),
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthProjectedExpense > 0 ? 'rgba(244, 63, 94, 0.3)' : 'var(--border-glass)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title={t('timeline.monthExpenseTitle')}
                        >
                          <TrendingDown size={12} />
                          <span>-{formatCurrency(mMonthProjectedExpense)}</span>
                        </span>

                        {/* 3. Investimento Projetado */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth ? 'rgba(148, 163, 184, 0.08)' : (mMonthProjectedInvestment > 0 ? 'rgba(99, 102, 241, 0.12)' : 'rgba(255, 255, 255, 0.04)'),
                            color: isFutureMonth ? 'var(--text-dim)' : (mMonthProjectedInvestment > 0 ? '#818cf8' : 'var(--text-dim)'),
                            borderColor: isFutureMonth ? 'rgba(148, 163, 184, 0.2)' : (mMonthProjectedInvestment > 0 ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-glass)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title={t('timeline.monthInvestmentTitle')}
                        >
                          <PiggyBank size={12} />
                          <span>{formatCurrency(mMonthProjectedInvestment)}</span>
                        </span>

                        {/* 4. Saldo Líquido Projetado */}
                        <span
                          className="group-card-badge"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            height: '26px',
                            boxSizing: 'border-box',
                            background: isFutureMonth
                              ? 'rgba(148, 163, 184, 0.08)'
                              : (mMonthProjectedSaldo >= 0 ? 'rgba(56, 189, 248, 0.12)' : 'rgba(244, 63, 94, 0.12)'),
                            color: isFutureMonth
                              ? 'var(--text-dim)'
                              : (mMonthProjectedSaldo >= 0 ? '#38bdf8' : '#f43f5e'),
                            borderColor: isFutureMonth
                              ? 'rgba(148, 163, 184, 0.2)'
                              : (mMonthProjectedSaldo >= 0 ? 'rgba(56, 189, 248, 0.35)' : 'rgba(244, 63, 94, 0.35)'),
                            fontWeight: '800',
                            fontSize: '0.76rem'
                          }}
                          title={t('timeline.monthBalanceTitle')}
                        >
                          <Scale size={12} />
                          <span>{t('timeline.balance')}: {mMonthProjectedSaldo >= 0 ? '+' : ''}{formatCurrency(mMonthProjectedSaldo)}</span>
                        </span>
                      </div>
                    )}
                  </div>

                  {hasEvents ? (
                    mGroup.events.map((ev) => (
                      <div
                        key={ev.id}
                        id={ev.status === EventStatus.OVERDUE ? 'loan-inst-overdue' : undefined}
                        style={{ marginBottom: '12px' }}
                      >
                        <div style={{ fontSize: '0.78rem', color: isFutureMonth ? 'var(--text-dim)' : 'var(--primary-light)', fontWeight: '700', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Calendar size={13} />
                          <span>{format(parseISO(ev.date), language === 'en' ? 'EEEE, MMMM d' : "EEEE, d 'de' MMMM", { locale: dateLocale })}</span>
                        </div>
                        <TimelineEventCard
                          event={ev}
                          allEvents={timeline.events || []}
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
                          onOpenEditInstallment={onOpenEditInstallment}
                          onNavigateToTimeline={onNavigateToTimeline}
                        />
                      </div>
                    ))
                  ) : (
                    /* Linha informativa quando o mês está vazio */
                    <div
                      className="empty-day-row"
                      onClick={() => {
                        if (isLoanTimelineOrTab) return;
                        const nature = timeline.type === TimelineType.EXPENSE ? 'expense' : timeline.type === TimelineType.INVESTMENT ? 'investment' : 'income';
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
                          {isLoanTimelineOrTab ? t('timeline.noLoanMonth') : t('timeline.noTabRecords')}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {/* Botão de Carregar Mais Meses Anteriores (Histórico) */}
        {onLoadMorePast && !isBalancoView && (
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
              <span>Carregar +12 Meses Anteriores (Histórico)</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderYearView = () => {
    const yearMap = new Map();

    daysArray.forEach((dayObj) => {
      const yearKey = format(dayObj, 'yyyy');
      if (!yearMap.has(yearKey)) {
        yearMap.set(yearKey, {
          yearStr: yearKey,
          monthsMap: new Map()
        });
      }

      const yearEntry = yearMap.get(yearKey);
      const monthKey = format(dayObj, 'yyyy-MM');
      if (!yearEntry.monthsMap.has(monthKey)) {
        yearEntry.monthsMap.set(monthKey, {
          monthDate: dayObj,
          events: []
        });
      }
    });

    filteredEvents.forEach((ev) => {
      try {
        const evDate = parseISO(ev.date);
        const yearKey = format(evDate, 'yyyy');
        const monthKey = format(evDate, 'yyyy-MM');

        if (!yearMap.has(yearKey)) {
          yearMap.set(yearKey, {
            yearStr: yearKey,
            monthsMap: new Map()
          });
        }
        const yearEntry = yearMap.get(yearKey);
        if (!yearEntry.monthsMap.has(monthKey)) {
          yearEntry.monthsMap.set(monthKey, {
            monthDate: evDate,
            events: []
          });
        }
        yearEntry.monthsMap.get(monthKey).events.push(ev);
      } catch (e) { }
    });

    const yearsList = Array.from(yearMap.values());

    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

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
                <div className="day-date-main">ANO {yGroup.yearStr}</div>
                {isCurrentYear && <span className="today-badge-chip pulse-glow">ANO ATUAL</span>}
              </div>

              <div className="day-node-wrapper">
                <div
                  className={`day-node-dot ${isCurrentYear ? 'is-today-node' : totalEventsInYear > 0 ? 'has-events' : ''
                    }`}
                  style={totalEventsInYear > 0 && !isCurrentYear ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                <div className="group-card">
                  <div className="group-card-header">
                    <h3 className="group-card-title">
                      <Sparkles size={18} style={{ color: 'var(--primary-light)' }} /> {language === 'en' ? `Year ${yGroup.yearStr}` : `Ano de ${yGroup.yearStr}`}
                    </h3>
                    <span className="group-card-badge">
                      {monthsList.length} {language === 'en' ? 'months' : 'meses'} • {t('timeline.eventsCount', { count: totalEventsInYear })}
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
                          <span className="event-tag" style={{ background: 'rgba(99, 102, 241, 0.2)', color: '#c7d2fe' }}>
                            {t('timeline.eventsCount', { count: mGroup.events.length })}
                          </span>
                        </div>

                        {hasEvents ? (
                          mGroup.events.map((ev) => (
                            <TimelineEventCard
                              key={ev.id}
                              event={ev}
                              allEvents={timeline.events || []}
                              currentTimelineId={timeline.id}
                              timelineType={timeline.type}
                              activeFinancialTab={activeFinancialTab}
                              onEdit={onEditEvent}
                              onUpdateEventDirect={onUpdateEventDirect}
                              onDelete={onDeleteEvent}
                              onToggleTask={onToggleTask}
                              onToggleLoanPayment={onToggleLoanPayment}
                              onOpenEditInstallment={onOpenEditInstallment}
                              onNavigateToTimeline={onNavigateToTimeline}
                            />
                          ))
                        ) : (
                          <div
                            className="empty-day-row"
                            onClick={() => onAddEventForDate(format(mGroup.monthDate, 'yyyy-MM-01'))}
                          >
                            <Calendar size={14} style={{ color: 'var(--text-dim)' }} />
                            <span className="empty-day-text">Sem eventos registados neste mês</span>
                            <span className="add-event-mini-btn">
                              <Plus size={12} /> Adicionar
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
      </div>
    );
  };

  const renderDayView = () => {
    return (
      <div className="vertical-timeline-container">
        <div className="timeline-spine" />
        <div
          className="timeline-spine-gradient"
          style={{ background: timeline.color || 'var(--timeline-line-active)' }}
        />

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
                  style={hasEvents && !isTodayNode ? { backgroundColor: timeline.color } : {}}
                />
              </div>

              <div className="day-content-col">
                {hasEvents ? (
                  dayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      id={ev.status === EventStatus.OVERDUE ? 'loan-inst-overdue' : undefined}
                    >
                      <TimelineEventCard
                        event={ev}
                        allEvents={timeline.events || []}
                        currentTimelineId={timeline.id}
                        timelineType={timeline.type}
                        activeFinancialTab={activeFinancialTab}
                        onEdit={onEditEvent}
                        onUpdateEventDirect={onUpdateEventDirect}
                        onDelete={onDeleteEvent}
                        onToggleTask={onToggleTask}
                        onToggleLoanPayment={onToggleLoanPayment}
                        onOpenEditInstallment={onOpenEditInstallment}
                        onNavigateToTimeline={onNavigateToTimeline}
                      />
                    </div>
                  ))
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
            <div className="sidebar-section-title">
              <span>{t('sidebar.timelines')}</span>
            </div>
            <div className="sidebar-btn-group">
              {((timelines && timelines.length > 0) ? timelines : (timeline?.timelines || [])).map((tl) => {
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
                    default:
                      return <Layers size={14} style={{ color: tlColor }} />;
                  }
                };

                return (
                  <button
                    key={tl.id}
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
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 2. Quick Focus Today Button */}
        <div className="sidebar-section">
          <button
            type="button"
            onClick={scrollToToday}
            className="btn btn-secondary btn-sm"
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontWeight: '700',
              borderColor: 'var(--primary-light)',
              color: 'var(--primary-light)',
              background: 'rgba(99, 102, 241, 0.12)',
              padding: '8px 12px'
            }}
            title={t('sidebar.focusCurrentMonthTitle')}
          >
            <LocateFixed size={15} />
            <span>{t('sidebar.focusCurrentMonth')}</span>
          </button>
        </div>

        {/* 3. Estado Filter */}
        <div className="sidebar-section">
          <div className="sidebar-section-title">
            <span>{t('sidebar.status')}</span>
          </div>
          <div className="sidebar-btn-group">
            {([TimelineType.INCOME, TimelineType.BALANCE, TimelineType.EXPENSE, TimelineType.INVESTMENT].includes(timeline.type)
              ? [
                { id: EventStatus.ALL, name: EventStatusLabel[EventStatus.ALL], icon: <Layers size={13} /> },
                { id: EventStatus.RECEIVED, name: EventStatusLabel[EventStatus.RECEIVED], icon: <CheckCircle2 size={13} /> },
                { id: EventStatus.PENDING, name: EventStatusLabel[EventStatus.PENDING], icon: <Clock size={13} /> },
                { id: EventStatus.OVERDUE, name: EventStatusLabel[EventStatus.OVERDUE], icon: <AlertCircle size={13} /> }
              ]
              : timeline.type === TimelineType.LOAN
                ? [
                  { id: EventStatus.ALL, name: EventStatusLabel[EventStatus.ALL], icon: <Layers size={13} /> },
                  { id: EventStatus.PAID, name: EventStatusLabel[EventStatus.PAID], icon: <CheckCircle2 size={13} /> },
                  { id: EventStatus.PENDING, name: EventStatusLabel[EventStatus.PENDING], icon: <Clock size={13} /> },
                  { id: EventStatus.OVERDUE, name: EventStatusLabel[EventStatus.OVERDUE], icon: <AlertCircle size={13} /> }
                ]
                : [
                  { id: EventStatus.ALL, name: EventStatusLabel[EventStatus.ALL], icon: <Layers size={13} /> },
                  { id: EventStatus.IN_PROGRESS, name: EventStatusLabel[EventStatus.IN_PROGRESS], icon: <Play size={13} /> },
                  { id: EventStatus.COMPLETED, name: EventStatusLabel[EventStatus.COMPLETED], icon: <CheckCircle2 size={13} /> },
                  { id: EventStatus.PLANNED, name: EventStatusLabel[EventStatus.PLANNED], icon: <Calendar size={13} /> }
                ]
            ).map((st) => (
              <button
                key={st.id}
                type="button"
                className={`sidebar-filter-item ${selectedStatusFilter === st.id ? 'active' : ''}`}
                onClick={() => setSelectedStatusFilter(st.id)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {st.icon}
                  <span>{st.name}</span>
                </div>
                {selectedStatusFilter === st.id && <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>✓</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 4. Timelines Filter (Multi-Selection for Balance) */}
        {timeline.type === TimelineType.BALANCE && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span>{t('sidebar.integratedTimelines')}</span>
              <button
                type="button"
                onClick={selectAllTimelines}
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
            <div className="sidebar-btn-group">
              {availableCreditOptions.map((opt) => {
                const isSelected = selectedTimelineIds.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    className={`sidebar-filter-item ${isSelected ? 'active' : ''}`}
                    onClick={() => toggleTimelineSelection(opt.id)}
                    style={isSelected ? { borderColor: opt.color } : { opacity: 0.6 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt.color }} />
                      <span>{opt.name}</span>
                    </div>
                    {isSelected ? <CheckSquare size={13} style={{ color: opt.color }} /> : <Square size={13} style={{ color: 'var(--text-dim)' }} />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* 5. Tipo / Natureza Filter */}
        {timeline.type !== TimelineType.BALANCE && (
          <div className="sidebar-section">
            <div className="sidebar-section-title">
              <span>{t('sidebar.categoryType')}</span>
            </div>
            <div className="sidebar-btn-group">
              {
              /* 
              ([TimelineType.INCOME, TimelineType.BALANCE, TimelineType.INVESTMENT, TimelineType.EXPENSE].includes(timeline.type)
                ? [
                  { id: EventCategory.ALL, name: t('category.all'), icon: <Layers size={13} /> },
                  { id: EventCategory.RECURRING_INCOME, name: t('category.recurringIncome'), icon: <DollarSign size={13} /> },
                  { id: EventCategory.SPORADIC_INCOME, name: t('category.sporadicIncome'), icon: <Gift size={13} /> },
                  { id: EventCategory.FIXED_EXPENSE, name: t('category.fixedExpense'), icon: <CreditCard size={13} /> },
                  { id: EventCategory.VARIABLE_EXPENSE, name: t('category.variableExpense'), icon: <Tag size={13} /> },
                  { id: EventCategory.SAVINGS_INVESTMENT, name: t('category.savingsInvestment'), icon: <PiggyBank size={13} /> },
                  { id: EventCategory.ASSET_INVESTMENT, name: t('category.assetInvestment'), icon: <Landmark size={13} /> },
                  { id: EventCategory.OTHER_INVESTMENT, name: t('category.otherInvestment'), icon: <Sparkles size={13} /> }
                ]
                : timeline.type === TimelineType.LOAN
                  ? [
                    { id: EventCategory.ALL, name: t('category.all'), icon: <Layers size={13} /> },
                    { id: EventCategory.LOAN_INSTALLMENT, name: t('category.loanInstallment'), icon: <CreditCard size={13} /> },
                    { id: EventCategory.AMORTIZATION, name: t('category.amortization'), icon: <TrendingDown size={13} /> }
                  ]
                  : [
                    { id: EventCategory.ALL, name: t('category.allTypes'), icon: <Layers size={13} /> },
                    { id: EventCategory.SCHEDULE, name: t('category.schedule'), icon: <Calendar size={13} /> },
                    { id: EventCategory.REPETITIVE, name: t('category.repetitive'), icon: <Repeat size={13} /> },
                    { id: EventCategory.TASK, name: t('category.task'), icon: <Pin size={13} /> },
                    { id: EventCategory.NOTE, name: t('category.note'), icon: <FileText size={13} /> }
                  ]
              ).map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  className={`sidebar-filter-item ${selectedCategoryFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedCategoryFilter(cat.id)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {cat.icon}
                    <span>{cat.name}</span>
                  </div>
                  {selectedCategoryFilter === cat.id && <span style={{ fontSize: '0.75rem', color: 'var(--primary-light)' }}>✓</span>}
                </button>
              ))*/}
            </div>
          </div>
        )}

        {/* 6. Períodos Vazios Toggle */}
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
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {showEmptyDays ? t('sidebar.visible') : t('sidebar.hidden')}
            </span>
          </div>
        </div>
      </aside>

      {/* 📜 Right Timeline Content Stream */}
      <div className="timeline-content-stream">
        {/* Sticky Header Dock */}
        <div className="sticky-header-dock">
          {headerComponent}
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

        {/* Render Selected Timeline View with Key Isolation per view & tab */}
        <div key={`${timeline.id}-${activeFinancialTab || 'all'}-${groupBy}`} className="timeline-view-wrapper">
          {groupBy === 'semana' && renderWeekView()}
          {groupBy === 'mes' && renderMonthView()}
          {groupBy === 'ano' && renderYearView()}
          {groupBy === 'dia' && renderDayView()}
        </div>

        {/* Fallback if no matching events */}
        {filteredEvents.length === 0 && !showEmptyDays && (
          <div className="empty-timeline-state glass-panel">
            <div className="empty-icon">
              <Calendar size={28} />
            </div>
            <h3>Nenhum evento encontrado</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '4px' }}>
              Tente alterar os filtros de pesquisa na barra lateral ou clique abaixo para adicionar um evento.
            </p>
            <button
              className="btn btn-primary btn-sm"
              style={{ marginTop: '16px' }}
              onClick={() => onAddEventForDate(todayStr)}
            >
              <Plus size={16} /> Adicionar Evento em Hoje
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default React.memo(VerticalTimeline);
