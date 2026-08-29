import React, { useState, useEffect } from 'react';
import { format, parseISO, addMonths } from 'date-fns';
import Navbar from './components/Navbar';
import TimelineHeader from './components/TimelineHeader';
import VerticalTimeline from './components/VerticalTimeline';
import CreateTimelineModal from './components/CreateTimelineModal';
import CreateTimeboardModal from './components/CreateTimeboardModal';
import CreateEventModal from './components/CreateEventModal';
import DeleteEventModal from './components/DeleteEventModal';
import AmortizationModal from './components/AmortizationModal';
import EditInstallmentModal from './components/EditInstallmentModal';
import {
  recalculateLoanState,
  propagateInstallmentAmountForward,
  applyExtraordinaryAmortization,
  getLoanMetrics,
  formatCurrency
} from './utils/loanCalculations';
import * as api from './services/api';
import { generateUUID } from './utils/uuid';
import { FinancialType, EventStatus, TimelineType, EventPriority, AmortizationStrategy } from './enums/index.js';
import { RotateCcw, X } from 'lucide-react';
import './App.css';

export default function App() {
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

  const [activeTimeboardId, setActiveTimeboardId] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_active_timeboard_id');
      if (saved) return saved;
    } catch (e) { }
    return '5fcd8a1a-eac7-4405-9c8b-b9607e70b420';
  });
  const [isTimeboardModalOpen, setIsTimeboardModalOpen] = useState(false);
  const [editingTimeboard, setEditingTimeboard] = useState(null);

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
    return 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';
  });

  // Financial Sub-Tabs State ('balanco' | 'entradas' | 'gastos' | 'investimentos' | 'emprestimos' | 'jeep' | 'dacia' | 'casa1' | 'casa2')
  const [activeFinancialTab, setActiveFinancialTab] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_active_financial_tab');
      if (saved) return saved;
    } catch (e) { }
    return 'balanco';
  });

  // Load latest data from Backend JSON Database on mount
  useEffect(() => {
    let isMounted = true;

    // 1. Load Timeboards
    api.fetchTimeboards()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTimeboards(data);
          setActiveTimeboardId((currentId) => {
            const saved = localStorage.getItem('chrono_active_timeboard_id');
            const targetId = saved || currentId;
            const exists = data.some((tb) => tb.id === targetId);
            return exists ? targetId : data[0].id;
          });
        }
      })
      .catch((err) => {
        console.info('Using local timeboards cache:', err.message);
      });

    // 2. Load Timelines
    api.fetchTimelines({ startDate: '2024-01-01', endDate: '2056-12-31' })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTimelines(data);
        }
      })
      .catch((err) => {
        console.info('Backend API connected with fallback cache:', err.message);
      });

    // 3. Load All Events
    api.fetchEvents({ startDate: '2024-01-01', endDate: '2056-12-31' })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setRawEvents(data);
        }
      })
      .catch((err) => {
        console.info('Error fetching raw events:', err.message);
      });

    return () => { isMounted = false; };
  }, []);

  const [rawEvents, setRawEvents] = useState([]);

  // Modal states
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [deletingEvent, setDeletingEvent] = useState(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState('2026-08-21');
  const [eventModalDefaultNature, setEventModalDefaultNature] = useState('income'); // 'income' | 'expense' | 'investment'
  const [futureHorizonYears, setFutureHorizonYears] = useState(1);
  const [pastHorizonYears, setPastHorizonYears] = useState(1);
  const scrollYBeforeModalRef = React.useRef(0);

  const refreshTimelines = async () => {
    try {
      const [tlData, evData] = await Promise.all([
        api.fetchTimelines({ startDate: '2024-01-01', endDate: '2056-12-31' }),
        api.fetchEvents({ startDate: '2024-01-01', endDate: '2056-12-31' })
      ]);
      if (Array.isArray(tlData)) {
        setTimelines(tlData);
      }
      if (Array.isArray(evData)) {
        setRawEvents(evData);
      }
      return tlData;
    } catch (e) {
      console.error('Error refreshing timelines and events:', e);
    }
  };

  const handleLoadMoreFuture = async () => {
    const nextYears = futureHorizonYears + 1;
    setFutureHorizonYears(nextYears);
    await refreshTimelines(nextYears, pastHorizonYears);
  };

  const handleLoadMorePast = async () => {
    const nextPast = pastHorizonYears + 1;
    setPastHorizonYears(nextPast);
    await refreshTimelines(futureHorizonYears, nextPast);
  };

  // Loan Specific Modals
  const [isAmortizationModalOpen, setIsAmortizationModalOpen] = useState(false);
  const [editingAmortization, setEditingAmortization] = useState(null);
  const [amortizationDefaultDate, setAmortizationDefaultDate] = useState('2026-08-21');
  const [editingInstallment, setEditingInstallment] = useState(null);

  const handleOpenAmortizationModal = (dateStr, eventObj = null) => {
    if (dateStr) {
      setAmortizationDefaultDate(dateStr);
    }
    setEditingAmortization(eventObj || null);
    setIsAmortizationModalOpen(true);
  };

  // Theme (light is default)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chrono_theme') || 'light';
  });

  // Apply theme to document
  useEffect(() => {
    try {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('chrono_theme', theme);
    } catch (e) { }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Save minimal settings to localStorage safely
  useEffect(() => {
    try {
      localStorage.setItem('chrono_timeboards_v2', JSON.stringify(timeboards));
    } catch { }
  }, [timeboards]);

  useEffect(() => {
    try {
      if (activeTimeboardId) {
        localStorage.setItem('chrono_active_timeboard_id', activeTimeboardId);
      }
    } catch { }
  }, [activeTimeboardId]);

  useEffect(() => {
    try {
      if (activeTimelineId) {
        localStorage.setItem('chrono_active_timeline_id', activeTimelineId);
      }
    } catch { }
  }, [activeTimelineId]);

  useEffect(() => {
    try {
      if (activeFinancialTab) {
        localStorage.setItem('chrono_active_financial_tab', activeFinancialTab);
      }
    } catch { }
  }, [activeFinancialTab]);

  // Selected Timeboard
  const activeTimeboard = timeboards.find((tb) => tb.id === activeTimeboardId) || timeboards[0];

  // All timelines belonging to active Timeboard (memoized to prevent re-renders when modal opens/closes)
  const activeTimeboardTimelines = React.useMemo(() => {
    return timelines.filter(
      (tl) => {
        const tbId = tl.timeboardId || tl.timeboard_id;
        return tbId === activeTimeboardId || (!tbId && (activeTimeboardId === '5fcd8a1a-eac7-4405-9c8b-b9607e70b420' || activeTimeboard?.id === '5fcd8a1a-eac7-4405-9c8b-b9607e70b420'));
      }
    );
  }, [timelines, activeTimeboardId, activeTimeboard?.id]);

  // Dynamic consolidated timeline aggregating all financial movements and loan timelines of the active Timeboard
  const activeTimeline = React.useMemo(() => {
    const seenEventIds = new Set();
    const allEvents = [];

    // 1. Add all direct Timeboard events (dynamically typed: entradas, gastos, investimentos)
    (rawEvents || []).forEach((ev) => {
      if (!ev || !ev.id) return;
      const belongsToTimeboard = ev.timeboardId === activeTimeboardId || (!ev.timeboardId && (!activeTimeboardId || activeTimeboardId === '5fcd8a1a-eac7-4405-9c8b-b9607e70b420'));
      if (belongsToTimeboard && !seenEventIds.has(ev.id)) {
        seenEventIds.add(ev.id);
        allEvents.push({
          ...ev,
          timelineOriginId: ev.timelineId || ev.timelineOriginId || null,
          timelineOriginName: ev.timelineOriginName || (ev.isIncome ? 'Entradas' : ev.isInvestment ? 'Investimentos' : 'Gastos'),
          timelineOriginColor: ev.timelineOriginColor || (ev.isIncome ? '#10b981' : ev.isInvestment ? '#6366f1' : '#f43f5e')
        });
      }
    });

    // 2. Add events from specific real contract timelines (loans)
    activeTimeboardTimelines.forEach((tl) => {
      const isTimelineActive = tl.status !== 'Inativo';
      if (isTimelineActive) {
        (tl.events || []).forEach((ev) => {
          if (!ev || !ev.id) return;
          if (!seenEventIds.has(ev.id)) {
            seenEventIds.add(ev.id);
            allEvents.push({
              ...ev,
              timelineOriginId: ev.timelineId || ev.timelineOriginId || tl.id,
              timelineOriginName: ev.timelineOriginName || tl.name,
              timelineOriginColor: ev.timelineOriginColor || tl.color
            });
          }
        });
      }
    });

    const normalizeLoanKey = (loan) => {
      const num = loan.contractNumber || '';
      const id = loan.id || '';
      const name = (loan.name || '').toLowerCase();
      if (num === '80004197726' || id.includes('jeep') || name.includes('jeep')) return 'jeep';
      if (num === 'CRD19605103001' || id.includes('dacia') || name.includes('dacia')) return 'dacia';
      if (num === '02012642' || id.includes('casa1') || (name.includes('egas moniz') && !name.includes('hipoteca'))) return 'casa1';
      if (num === '02015122' || id.includes('casa2') || name.includes('hipoteca')) return 'casa2';
      return id || num || name;
    };

    const seenLoanKeys = new Set();
    const carLoans = [];
    activeTimeboardTimelines.forEach((tl) => {
      const isTimelineActive = tl.status !== 'Inativo';
      if (isTimelineActive && (tl.type === TimelineType.LOAN || tl.type === 'emprestimo' || tl.type === 'Empréstimo')) {
        const key = normalizeLoanKey(tl);
        if (!seenLoanKeys.has(key)) {
          seenLoanKeys.add(key);
          carLoans.push(tl);
        }
      }
      if (isTimelineActive && Array.isArray(tl.carLoans)) {
        tl.carLoans.forEach((loan) => {
          if (loan.status !== 'Inativo') {
            const key = normalizeLoanKey(loan);
            if (!seenLoanKeys.has(key)) {
              seenLoanKeys.add(key);
              carLoans.push(loan);
            }
          }
        });
      }
    });

    const incomeTimeline = activeTimeboardTimelines.find((tl) => tl.type === TimelineType.INCOME || tl.type === 'entradas');
    const monthlySalary = incomeTimeline?.monthlySalary !== undefined ? incomeTimeline.monthlySalary : (activeTimeboard?.id === 'tb-clean-financial-002' ? 0 : 3349.60);

    return {
      id: activeTimeboard?.id || '5fcd8a1a-eac7-4405-9c8b-b9607e70b420',
      name: activeTimeboard?.name || 'Timeboard Portugal',
      type: 'Financeiro',
      description: activeTimeboard?.description || '',
      startDate: '2025-08-01',
      endDate: `${2026 + futureHorizonYears}-08-31`,
      monthlySalary,
      carLoans,
      events: allEvents,
      timelines: activeTimeboardTimelines
    };
  }, [activeTimeboard, activeTimeboardTimelines, rawEvents, activeTimeboardId, futureHorizonYears]);

  // ----------------------------------------------------
  // Timeline Handlers
  // ----------------------------------------------------
  const handleOpenCreateTimeline = () => {
    setEditingTimeline(null);
    setIsTimelineModalOpen(true);
  };

  const handleOpenEditTimeline = () => {
    setEditingTimeline(activeTimeline);
    setIsTimelineModalOpen(true);
  };

  const handleSaveTimeline = (formData) => {
    if (editingTimeline && editingTimeline.id) {
      // Update existing timeline
      const updatedData = {
        ...formData,
        type: 'emprestimo',
        status: formData.status === 'Inativo' ? 'Inativo' : 'Ativo'
      };
      setTimelines((prev) =>
        prev.map((tl) => (tl.id === editingTimeline.id ? { ...tl, ...updatedData } : tl))
      );
      api.updateTimeline(editingTimeline.id, updatedData).then(() => refreshTimelines()).catch(console.error);
    } else {
      // Create new loan timeline
      const newTl = {
        ...formData,
        id: generateUUID(),
        type: 'emprestimo',
        status: formData.status === 'Inativo' ? 'Inativo' : 'Ativo',
        timeboardId: activeTimeboardId,
        events: formData.events || []
      };
      setTimelines((prev) => [newTl, ...prev]);
      setActiveTimelineId(newTl.id);
      api.createTimeline(newTl).then(() => refreshTimelines()).catch(console.error);
    }
  };

  const handleDeleteTimeline = () => {
    if (!activeTimeline) return;
    if (window.confirm(`Tem a certeza que deseja eliminar a timeline "${activeTimeline.name}"?`)) {
      const targetId = activeTimeline.id;
      const filtered = timelines.filter((tl) => tl.id !== targetId);
      setTimelines(filtered);
      if (filtered.length > 0) {
        setActiveTimelineId(filtered[0].id);
      }
      api.deleteTimeline(targetId).catch(console.error);
    }
  };

  // ----------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------
  const handleOpenCreateEvent = (dateStr = '2026-08-21', nature = 'income') => {
    scrollYBeforeModalRef.current = window.scrollY;
    setEditingEvent(null);
    setSelectedDateForNewEvent(dateStr);
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (eventObj) => {
    scrollYBeforeModalRef.current = window.scrollY;
    if (eventObj?.category === 'amortizacao' || eventObj?.financialType === 'amortizacao' || eventObj?.isAmortization) {
      handleOpenAmortizationModal(eventObj.date, eventObj);
      return;
    }
    setEditingEvent(eventObj);
    const nature = eventObj?.isExpense ? 'expense' : eventObj?.isInvestment ? 'investment' : 'income';
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (eventData) => {
    const savedScrollPos = scrollYBeforeModalRef.current || window.scrollY;

    // 1. Determinar se o evento pertence a um contrato específico (empréstimo) ou é dinâmico do Timeboard
    let targetTimelineId = eventData.timelineId || eventData.timelineOriginId || null;
    // Se não for um ID de timeline real de empréstimo, fica null (movimento geral do Timeboard)
    const isRealTimeline = activeTimeboardTimelines.some((tl) => tl.id === targetTimelineId);
    if (!isRealTimeline) {
      targetTimelineId = null;
    }

    const saveAsync = async () => {
      try {
        if (editingEvent && editingEvent.id) {
          await api.updateEvent(editingEvent.id, {
            ...eventData,
            timeboardId: activeTimeboardId,
            timelineId: targetTimelineId,
            timelineOriginId: targetTimelineId,
            eventId: editingEvent.eventId || editingEvent.seriesId,
            version: editingEvent.version
          });
        } else {
          const isRecurring = eventData.periodicity === 'recorrente' || eventData.isRecurring || (eventData.category && eventData.category.includes('recorrente'));
          const newEvent = {
            ...eventData,
            id: generateUUID(),
            timeboardId: activeTimeboardId,
            timelineId: targetTimelineId,
            timelineOriginId: targetTimelineId,
            eventId: isRecurring ? generateUUID() : null,
            version: 0,
            isRecurring: Boolean(isRecurring)
          };
          await api.createEvent(newEvent);
        }

        await refreshTimelines();
      } catch (err) {
        console.error('Error saving event:', err);
      }
    };

    saveAsync();

    // Restore and lock scroll position exactly where the user was
    const targetMonthKey = (eventData.date || selectedDateForNewEvent || '2026-08-01').substring(0, 7);
    const restoreScroll = () => {
      const monthNode = document.getElementById(`timeline-month-${targetMonthKey}`) ||
        (targetMonthKey === '2026-08' ? document.getElementById('timeline-node-today') : null);
      if (monthNode) {
        const navbar = document.querySelector('.app-header') || document.querySelector('header');
        const stickyDock = document.querySelector('.sticky-header-dock');
        const navHeight = navbar ? navbar.offsetHeight : 68;
        const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
        const totalStickyOffset = navHeight + 24 + dockHeight + 14;

        const elementDocTop = monthNode.getBoundingClientRect().top + window.pageYOffset;
        const targetY = Math.max(0, elementDocTop - totalStickyOffset);
        window.scrollTo({ top: targetY, behavior: 'instant' });
      } else if (savedScrollPos > 0) {
        window.scrollTo({ top: savedScrollPos, behavior: 'instant' });
      }
    };

    requestAnimationFrame(restoreScroll);
    setTimeout(restoreScroll, 20);
    setTimeout(restoreScroll, 80);
    setTimeout(restoreScroll, 200);
  };

  const handleUpdateEventDirect = async (updatedEvent) => {
    if (!updatedEvent || !updatedEvent.id) return;

    const todayStr = '2026-08-21';
    const targetSeriesKey = updatedEvent.eventId || updatedEvent.seriesId || updatedEvent.timelineId || updatedEvent.id;
    const isAutoChange = updatedEvent.automatic !== undefined;

    const resolveMatchingEvent = (ev) => {
      if (ev.id === updatedEvent.id) {
        return { ...ev, ...updatedEvent };
      }

      const isSameSeries = targetSeriesKey && (
        ev.eventId === targetSeriesKey ||
        ev.seriesId === targetSeriesKey ||
        ev.id === targetSeriesKey ||
        (ev.timelineId && ev.timelineId === targetSeriesKey) ||
        (ev.timelineOriginId && ev.timelineOriginId === targetSeriesKey)
      );

      if (isSameSeries) {
        if (isAutoChange) {
          const nextAuto = Boolean(updatedEvent.automatic);
          let newStatus = ev.status;
          let newIsCompleted = Boolean(ev.isCompleted);

          const isNotCancelledOrDeleted = ev.status !== 'cancelled' && ev.status !== 'deleted' && ev.status !== 'Cancelado' && ev.status !== 'Excluido';
          if (nextAuto && ev.date && ev.date <= todayStr && isNotCancelledOrDeleted) {
            const isIncome = ev.financialType === 'income' || ev.financialType === 'entrada' || ev.isIncome || ev.category?.startsWith('entrada');
            const isInvestment = ev.financialType === 'investment' || ev.financialType === 'investimento' || ev.isInvestment || ev.category?.startsWith('investimento');
            const isAmortization = ev.financialType === 'amortization' || ev.financialType === 'amortizacao' || ev.category === 'amortizacao';

            if (isIncome) {
              newStatus = 'received';
              newIsCompleted = true;
            } else if (isInvestment) {
              newStatus = 'invested';
              newIsCompleted = true;
            } else if (isAmortization) {
              newStatus = 'amortized';
              newIsCompleted = true;
            } else {
              newStatus = 'paid';
              newIsCompleted = true;
            }
          }

          return {
            ...ev,
            automatic: nextAuto,
            isAutomatic: nextAuto,
            status: newStatus,
            isCompleted: newIsCompleted
          };
        }

        const { date: _d, id: _i, ...restProps } = updatedEvent;
        return { ...ev, ...restProps };
      }

      return ev;
    };

    // 1. Optimistic update local state preserving specific dates of other monthly instances
    setRawEvents((prev) => prev.map(resolveMatchingEvent));

    setTimelines((prev) =>
      prev.map((tl) => ({
        ...tl,
        events: (tl.events || []).map(resolveMatchingEvent)
      }))
    );

    try {
      await api.updateEvent(updatedEvent.id, {
        ...updatedEvent,
        updateScope: isAutoChange ? 'all_series' : updatedEvent.updateScope
      });
    } catch (err) {
      console.error('Error updating event directly:', err);
    }
  };

  const handleRequestDeleteEvent = (eventOrId) => {
    if (!eventOrId) return;
    if (typeof eventOrId === 'object' && eventOrId.id) {
      setDeletingEvent(eventOrId);
      return;
    }
    const found = (activeTimeline?.events || []).find((ev) => ev.id === eventOrId);
    if (found) {
      setDeletingEvent(found);
    }
  };

  const handleConfirmDeleteEvent = (eventId, deleteScope = 'single') => {
    let targetEvent = deletingEvent && (deletingEvent.id === eventId || String(deletingEvent.id) === String(eventId)) ? deletingEvent : null;
    if (!targetEvent) {
      timelines.forEach((tl) => {
        const found = (tl.events || []).find((ev) => String(ev.id) === String(eventId));
        if (found) targetEvent = found;
      });
    }

    if (!targetEvent && activeTimeline) {
      targetEvent = (activeTimeline.events || []).find((ev) => String(ev.id) === String(eventId));
    }
    if (!targetEvent) {
      targetEvent = { id: eventId };
    }

    const deleteAsync = async () => {
      try {
        const scope = typeof deleteScope === 'string' ? deleteScope : (deleteScope ? 'subsequent' : 'single');
        await api.deleteEvent(eventId, {
          deleteScope: scope,
          eventId: targetEvent.eventId || targetEvent.seriesId,
          date: targetEvent.date
        });
        await refreshTimelines();
      } catch (err) {
        console.error('Error deleting event:', err);
      }
    };

    deleteAsync();
    setDeletingEvent(null);
  };

  const handleConfirmResetTimeline = async () => {
    let targetTlIds = [];

    if (activeFinancialTab === 'balanco') {
      targetTlIds = activeTimeboardTimelines.map((t) => t.id);
    } else if (activeFinancialTab === 'entradas') {
      const found = activeTimeboardTimelines.find((t) => t.type === 'entradas');
      if (found) targetTlIds = [found.id];
    } else if (activeFinancialTab === 'gastos') {
      const found = activeTimeboardTimelines.find((t) => t.type === 'gastos');
      if (found) targetTlIds = [found.id];
    } else if (activeFinancialTab === 'investimentos') {
      const found = activeTimeboardTimelines.find((t) => t.type === 'investimentos');
      if (found) targetTlIds = [found.id];
    } else if (activeFinancialTab === 'emprestimos') {
      targetTlIds = activeTimeboardTimelines.filter((t) => t.type === 'emprestimo' || t.type === 'Empréstimo').map((t) => t.id);
    } else if (activeFinancialTab === 'jeep') {
      const found = activeTimeboardTimelines.find((t) => (t.name && t.name.toLowerCase().includes('jeep')) || t.contractNumber === '80004197726');
      if (found) targetTlIds = [found.id];
    } else if (activeFinancialTab === 'dacia') {
      const found = activeTimeboardTimelines.find((t) => (t.name && t.name.toLowerCase().includes('dacia')) || t.contractNumber === 'CRD19605103001');
      if (found) targetTlIds = [found.id];
    } else if (activeFinancialTab === 'casa1') {
      const found = activeTimeboardTimelines.find((t) => (t.name && t.name.toLowerCase().includes('casa 1')) || (t.name && t.name.includes('02012642')));
      if (found) targetTlIds = [found.id];
    } else if (activeFinancialTab === 'casa2') {
      const found = activeTimeboardTimelines.find((t) => (t.name && t.name.toLowerCase().includes('casa 2')) || (t.name && t.name.includes('02015122')));
      if (found) targetTlIds = [found.id];
    } else if (activeTimelineId) {
      targetTlIds = [activeTimelineId];
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

  const handleToggleTask = (eventId, taskIdx) => {
    if (!activeTimeline) return;
    const updatedEvents = (activeTimeline.events || []).map((ev) => {
      if (ev.id === eventId && ev.tasks) {
        const updatedTasks = ev.tasks.map((task, idx) =>
          idx === taskIdx ? { ...task, completed: !task.completed } : task
        );
        return { ...ev, tasks: updatedTasks };
      }
      return ev;
    });

    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
    );
  };

  // Add a new checklist item to any event/task
  const handleAddChecklistItem = (eventId, itemText) => {
    if (!activeTimeline || !itemText || !itemText.trim()) return;
    const updatedEvents = (activeTimeline.events || []).map((ev) => {
      if (ev.id === eventId) {
        const currentTasks = ev.tasks || [];
        return {
          ...ev,
          tasks: [...currentTasks, { text: itemText.trim(), completed: false }]
        };
      }
      return ev;
    });

    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
    );
  };

  // Delete a checklist item from any event/task
  const handleDeleteChecklistItem = (eventId, itemIdx) => {
    if (!activeTimeline) return;
    const updatedEvents = (activeTimeline.events || []).map((ev) => {
      if (ev.id === eventId && ev.tasks) {
        const updatedTasks = ev.tasks.filter((_, idx) => idx !== itemIdx);
        return { ...ev, tasks: updatedTasks };
      }
      return ev;
    });

    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
    );
  };

  // Complete a floating pending task and fix it to today's date on the timeline
  const handleCompleteFloatingTask = (taskId) => {
    if (!activeTimeline) return;
    const updatedEvents = (activeTimeline.events || []).map((ev) => {
      if (ev.id === taskId) {
        return {
          ...ev,
          isCompleted: true,
          status: 'Concluído',
          date: '2026-08-21' // Fix to completion date (today)
        };
      }
      return ev;
    });

    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
    );
  };

  // Add a new floating task directly to the top stack
  const handleAddFloatingTask = (taskData) => {
    if (!activeTimeline) return;
    const newFloatingTask = {
      ...taskData,
      id: generateUUID()
    };

    const updatedEvents = [newFloatingTask, ...(activeTimeline.events || [])];
    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
    );
  };

  // Update priority of a floating task
  const handleUpdateFloatingTaskPriority = (taskId, priority) => {
    if (!activeTimeline) return;
    const updatedEvents = (activeTimeline.events || []).map((ev) =>
      ev.id === taskId ? { ...ev, priority } : ev
    );
    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
    );
  };

  // ----------------------------------------------------
  // Loan Specific Handlers (Empréstimo)
  // ----------------------------------------------------

  // Toggle installment payment / income / expense / investment status
  const handleToggleLoanPayment = async (installmentId) => {
    if (!installmentId) return;

    const clickTimeStr = format(new Date(), 'HH:mm');

    // 1. Optimistic update in rawEvents
    setRawEvents((prevEvents) =>
      prevEvents.map((ev) => {
        if (ev.id !== installmentId) return ev;

        const isIncome = ev.isIncome || ev.financialType === FinancialType.INCOME || ev.financialType === 'entrada' || (ev.category && ev.category.startsWith('entrada'));
        const isInvestment = ev.isInvestment || ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || (ev.category && ev.category.startsWith('investimento'));

        let nextStatus, nextCompleted;
        if (isIncome) {
          nextStatus = ev.status === 'Recebido' || ev.status === EventStatus.RECEIVED ? 'Pendente' : 'Recebido';
          nextCompleted = nextStatus === 'Recebido';
        } else if (isInvestment) {
          nextStatus = (ev.status === 'Investido' || ev.status === 'Pago' || ev.status === EventStatus.INVESTED || ev.status === EventStatus.PAID) ? 'Planeado' : 'Investido';
          nextCompleted = nextStatus === 'Investido';
        } else {
          nextStatus = ev.status === 'Pago' || ev.status === EventStatus.PAID ? 'Pendente' : 'Pago';
          nextCompleted = nextStatus === 'Pago';
        }

        return {
          ...ev,
          status: nextStatus,
          isCompleted: nextCompleted,
          isLocked: nextCompleted,
          time: nextCompleted ? clickTimeStr : ev.time,
          completedAtTime: nextCompleted ? clickTimeStr : null
        };
      })
    );

    // 2. Optimistic update in timelines
    setTimelines((prevTimelines) => {
      return prevTimelines.map((tl) => {
        const hasEvent = (tl.events || []).some((e) => e.id === installmentId);
        if (!hasEvent) return tl;

        const updatedEvents = (tl.events || []).map((ev) => {
          if (ev.id !== installmentId) return ev;

          const isIncome = ev.isIncome || ev.financialType === FinancialType.INCOME || ev.financialType === 'entrada' || (ev.category && ev.category.startsWith('entrada'));
          const isInvestment = ev.isInvestment || ev.financialType === FinancialType.INVESTMENT || ev.financialType === 'investimento' || (ev.category && ev.category.startsWith('investimento'));

          let nextStatus, nextCompleted;
          if (isIncome) {
            nextStatus = ev.status === 'Recebido' || ev.status === EventStatus.RECEIVED ? 'Pendente' : 'Recebido';
            nextCompleted = nextStatus === 'Recebido';
          } else if (isInvestment) {
            nextStatus = (ev.status === 'Investido' || ev.status === 'Pago' || ev.status === EventStatus.INVESTED || ev.status === EventStatus.PAID) ? 'Planeado' : 'Investido';
            nextCompleted = nextStatus === 'Investido';
          } else {
            nextStatus = ev.status === 'Pago' || ev.status === EventStatus.PAID ? 'Pendente' : 'Pago';
            nextCompleted = nextStatus === 'Pago';
          }

          return {
            ...ev,
            status: nextStatus,
            isCompleted: nextCompleted,
            isLocked: nextCompleted,
            time: nextCompleted ? clickTimeStr : ev.time,
            completedAtTime: nextCompleted ? clickTimeStr : null
          };
        });

        const finalEvents = (tl.type === TimelineType.LOAN || tl.type === 'Empréstimo' || tl.type === 'emprestimo')
          ? recalculateLoanState(tl, updatedEvents)
          : updatedEvents;

        return { ...tl, events: finalEvents };
      });
    });

    try {
      await api.toggleEventPayment(installmentId);
    } catch (err) {
      console.error('Error toggling payment status:', err);
    }
  };

  // Save changes from EditInstallmentModal (amount, principalAmount, interestPortion, interestAmount, propagateForward)
  const handleSaveEditInstallment = (installmentId, { status, amount, principalAmount, interestPortion, interestAmount, propagateForward }) => {
    if (!activeTimeline) return;

    let currentEvents = activeTimeline.events || [];

    if (propagateForward) {
      // Propagate new base amount, principal and interest to this and all subsequent future installments
      currentEvents = propagateInstallmentAmountForward(currentEvents, installmentId, amount, principalAmount, interestPortion);
    }

    // Update the specific installment's values and status
    const isPaid = status === 'Pago';
    const updatedList = currentEvents.map((ev) => {
      if (ev.id === installmentId) {
        return {
          ...ev,
          amount: Number(amount),
          principalAmount: Number(principalAmount),
          interestPortion: Number(interestPortion),
          interestAmount: Number(interestAmount) || 0,
          status: status,
          isCompleted: isPaid
        };
      }
      return ev;
    });

    const finalEvents = recalculateLoanState(activeTimeline, updatedList);

    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: finalEvents } : tl))
    );
  };

  // Save extraordinary amortization event
  const handleSaveAmortization = async ({ id, amount, date, strategy, status = 'Amortizado', notes }) => {
    const amortVal = Number(amount);
    if (isNaN(amortVal) || amortVal <= 0) return;

    const existingId = id || editingAmortization?.id;
    if (existingId) {
      try {
        await api.deleteEvent(existingId);
      } catch (e) {
        console.error('Error rolling back previous amortization version:', e);
      }
    }

    let targetTimeline = activeTimeboardTimelines.find((t) => t.id === activeFinancialTab || t.id === activeTimelineId);
    if (!targetTimeline && (activeTimeline?.type === TimelineType.LOAN || activeTimeline?.type === 'loan' || activeTimeline?.type === 'emprestimo' || activeTimeline?.type === 'Empréstimo')) {
      targetTimeline = activeTimeline;
    }
    if (!targetTimeline) {
      targetTimeline = activeTimeboardTimelines.find((t) => t.type === TimelineType.LOAN || t.type === 'loan' || t.type === 'emprestimo' || t.type === 'Empréstimo') || activeTimeboardTimelines[0];
    }

    if (!targetTimeline) return;

    const loanName = targetTimeline.name || 'Empréstimo';
    const targetDate = date || '2026-08-15';
    const isCompleted = status === EventStatus.AMORTIZED || status === 'Amortizado' || status === EventStatus.PAID || status === 'Pago';

    const amortEvent = {
      id: generateUUID(),
      tenantId: 'tenant-igor',
      timelineId: targetTimeline.id,
      timelineOriginId: targetTimeline.id,
      timelineOriginName: loanName,
      timelineOriginColor: targetTimeline.color || '#10b981',
      title: `Amortização ${loanName}: ${formatCurrency(amortVal)}`,
      description: notes || `Amortização extraordinária para ${strategy === AmortizationStrategy.REDUCE_TERM || strategy === 'reduce_term' ? 'redução do prazo' : 'redução da parcela'}.`,
      date: targetDate,
      dayOfMonth: parseInt(targetDate.substring(8, 10), 10) || 15,
      time: '12:00',
      amount: amortVal,
      amortizationAmount: amortVal,
      financialType: FinancialType.AMORTIZATION,
      isAmortization: true,
      isExpense: true,
      isIncome: false,
      isInvestment: false,
      isSystemLoanEvent: true,
      status: isCompleted ? EventStatus.AMORTIZED : EventStatus.PENDING,
      isCompleted: isCompleted,
      priority: EventPriority.HIGH,
      strategy: strategy || AmortizationStrategy.REDUCE_TERM,
      amortizationStrategy: strategy || AmortizationStrategy.REDUCE_TERM,
      notes: notes || '',
      labels: ['Amortização', strategy === AmortizationStrategy.REDUCE_TERM || strategy === 'reduce_term' ? 'Redução Prazo' : 'Redução Parcela'],
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Atualizar o estado local imediatamente
    setTimelines((prev) =>
      prev.map((tl) => {
        if (tl.id === targetTimeline.id) {
          if (isCompleted) {
            const calculated = applyExtraordinaryAmortization({
              timeline: tl,
              eventsList: tl.events || [],
              amortizationAmount: amortVal,
              amortizationDateStr: targetDate,
              strategy: strategy,
              notes: notes,
              existingAmortEvent: amortEvent
            });
            return { ...tl, events: calculated };
          } else {
            return { ...tl, events: [...(tl.events || []), amortEvent] };
          }
        }
        return tl;
      })
    );

    setEditingAmortization(null);

    // 2. Gravar na base de dados
    try {
      await api.createEvent(amortEvent);
      await refreshTimelines();
    } catch (err) {
      console.error('Error saving amortization event:', err);
    }
  };

  const loanMetrics = activeTimeline?.type === 'Empréstimo'
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

  const handleSaveTimeboard = (formData) => {
    if (editingTimeboard && editingTimeboard.id) {
      setTimeboards((prev) =>
        prev.map((tb) => (tb.id === editingTimeboard.id ? { ...tb, ...formData } : tb))
      );
      api.updateTimeboard(editingTimeboard.id, formData).catch(console.error);
    } else {
      const newTb = {
        ...formData,
        id: generateUUID()
      };
      setTimeboards((prev) => [...prev, newTb]);
      setActiveTimeboardId(newTb.id);
      api.createTimeboard(newTb).catch(console.error);
    }
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        timeboards={timeboards}
        activeTimeboardId={activeTimeboardId}
        onSelectTimeboard={(id) => {
          setActiveTimeboardId(id);
          const foundTl = timelines.find((tl) => tl.timeboardId === id);
          if (foundTl) setActiveTimelineId(foundTl.id);
        }}
        onOpenCreateTimeboard={() => {
          setEditingTimeboard(null);
          setIsTimeboardModalOpen(true);
        }}
        onScrollToToday={handleScrollToToday}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Main Layout Area */}
      <main className="main-layout">
        {activeTimeline ? (
          <VerticalTimeline
            timeline={activeTimeline}
            activeFinancialTab={activeFinancialTab}
            onSelectFinancialTab={setActiveFinancialTab}
            futureHorizonYears={futureHorizonYears}
            pastHorizonYears={pastHorizonYears}
            onLoadMoreFuture={handleLoadMoreFuture}
            onLoadMorePast={handleLoadMorePast}
            onEditEvent={handleOpenEditEvent}
            onUpdateEventDirect={handleUpdateEventDirect}
            onDeleteEvent={handleRequestDeleteEvent}
            onToggleTask={handleToggleTask}
            onAddEventForDate={(dateStr, nature) => handleOpenCreateEvent(dateStr, nature || (activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income'))}
            onCompleteFloatingTask={handleCompleteFloatingTask}
            onAddFloatingTask={handleAddFloatingTask}
            onUpdateFloatingTaskPriority={handleUpdateFloatingTaskPriority}
            onAddChecklistItem={handleAddChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
            onToggleLoanPayment={handleToggleLoanPayment}
            onOpenEditInstallment={(inst) => setEditingInstallment(inst)}
            onOpenAmortizationModal={handleOpenAmortizationModal}
            onNavigateToTimeline={(timelineId, tab) => {
              if (timelineId) setActiveTimelineId(timelineId);
              if (tab) setActiveFinancialTab(tab);
            }}
            headerComponent={
              <TimelineHeader
                timeline={activeTimeline}
                allTimelines={activeTimeboardTimelines}
                activeFinancialTab={activeFinancialTab}
                onSelectFinancialTab={setActiveFinancialTab}
                onEdit={handleOpenEditTimeline}
                onDelete={handleDeleteTimeline}
                onReset={() => setIsResetConfirmOpen(true)}
                onOpenCreateTimeline={handleOpenCreateTimeline}
                onOpenAmortizationModal={() => handleOpenAmortizationModal()}
                onScrollToOverdue={handleScrollToOverdue}
              />
            }
          />
        ) : (
          <div className="empty-timeline-state glass-panel" style={{ marginTop: '40px' }}>
            <h2>Nenhuma Timeline Encontrada</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              Crie a sua primeira linha temporal para começar.
            </p>
            <button
              className="btn btn-primary"
              style={{ marginTop: '20px' }}
              onClick={handleOpenCreateTimeline}
            >
              Criar Timeline
            </button>
          </div>
        )}
      </main>

      {/* Modals */}
      <CreateTimeboardModal
        isOpen={isTimeboardModalOpen}
        onClose={() => setIsTimeboardModalOpen(false)}
        onSave={handleSaveTimeboard}
        initialData={editingTimeboard}
      />

      <CreateTimelineModal
        isOpen={isTimelineModalOpen}
        onClose={() => setIsTimelineModalOpen(false)}
        onSave={handleSaveTimeline}
        initialData={editingTimeline}
      />

      <CreateEventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        onSave={handleSaveEvent}
        initialData={editingEvent}
        defaultDate={selectedDateForNewEvent}
        timeline={activeTimeline}
        allTimelines={timelines}
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
        onConfirmDelete={handleConfirmDeleteEvent}
      />

      {/* Reset Timeline Confirmation Modal */}
      {isResetConfirmOpen && (
        <div className="modal-overlay" onClick={() => setIsResetConfirmOpen(false)} style={{ zIndex: 1100 }}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid rgba(245, 158, 11, 0.3)'
                  }}
                >
                  <RotateCcw size={18} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ margin: 0, fontSize: '1.15rem' }}>
                    Resetar Timeline
                  </h3>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {activeFinancialTab === 'balanco'
                      ? 'Limpar todos os movimentos do Timeboard'
                      : activeFinancialTab === 'emprestimos'
                        ? 'Limpar todos os empréstimos e financiamentos'
                        : `Limpar movimentos de ${activeFinancialTab.toUpperCase()}`}
                  </div>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={() => setIsResetConfirmOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: '16px 0', fontSize: '0.9rem', color: 'var(--text-main)', lineHeight: '1.5' }}>
              <p style={{ margin: '0 0 12px 0' }}>
                Tem a certeza que deseja <strong>resetar e apagar todos os movimentos</strong> desta timeline?
              </p>
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(239, 68, 68, 0.08)',
                  border: '1px solid rgba(239, 68, 68, 0.25)',
                  fontSize: '0.82rem',
                  color: '#f87171'
                }}
              >
                ⚠️ Esta ação limpará todos os eventos registados e não pode ser revertida.
              </div>
            </div>

            <div className="form-footer" style={{ margin: 0, paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsResetConfirmOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleConfirmResetTimeline}
                style={{
                  background: '#f59e0b',
                  borderColor: '#f59e0b',
                  boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                  fontWeight: '700',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <RotateCcw size={15} />
                <span>Sim, Resetar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
