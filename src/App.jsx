import React, { useState, useEffect } from 'react';
import { format, parseISO, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
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
import { EventType, EventStatus, TimelineType, EventPriority, AmortizationStrategy } from './enums/index.js';
import { useToast } from './context/ToastContext.jsx';
import { useTranslation } from './i18n/LanguageContext.jsx';
import { RotateCcw, X } from 'lucide-react';
import './App.css';

export default function App() {
  const { showToast } = useToast();
  const { t } = useTranslation();

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
    return null;
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
    return null;
  });

  // Financial Sub-Tabs State
  const [activeFinancialTab, setActiveFinancialTab] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_active_financial_tab');
      if (saved) return saved;
    } catch (e) { }
    return null;
  });

  // Load latest data from Database on mount - Timeboards only for now
  useEffect(() => {
    let isMounted = true;

    // 1. Load Timeboards from Database
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
        console.error('Error fetching timeboards:', err.message);
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
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [eventModalDefaultNature, setEventModalDefaultNature] = useState('income'); // 'income' | 'expense' | 'investment'
  const [futureHorizonYears, setFutureHorizonYears] = useState(1);
  const [pastHorizonYears, setPastHorizonYears] = useState(1);
  const [isLoadingSystem, setIsLoadingSystem] = useState(true);
  const scrollYBeforeModalRef = React.useRef(0);

  const timelinesRef = React.useRef(timelines);
  React.useEffect(() => {
    timelinesRef.current = timelines;
  }, [timelines]);

  const fetchEventsForVisiblePeriod = React.useCallback(async (pastYears = pastHorizonYears, futureYears = futureHorizonYears, forceReload = false) => {
    if (!activeTimeboardId) return;

    // Calcular o horizonte global dinamicamente a partir da data atual do sistema
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const startObj = subMonths(currentMonthStart, Math.max(1, pastYears) * 12);
    const endObj = addMonths(endOfMonth(now), Math.max(1, futureYears) * 12);
    const startDate = format(startObj, 'yyyy-MM-01');
    const endDate = format(endObj, 'yyyy-MM-dd');

    try {
      const params = {
        timeboardId: activeTimeboardId,
        startDate,
        endDate
      };

      const evData = await api.fetchEvents(params);
      if (Array.isArray(evData)) {
        if (forceReload) {
          setRawEvents(evData);
        } else {
          // Merge sem duplicar eventos existentes na memória
          setRawEvents((prevEvents) => {
            const map = new Map(prevEvents.map((e) => [e.id, e]));
            evData.forEach((e) => map.set(e.id, e));
            return Array.from(map.values());
          });
        }
      }
    } catch (e) {
      console.error('Error fetching events for period:', e);
    } finally {
      setIsLoadingSystem(false);
    }
  }, [activeTimeboardId, pastHorizonYears, futureHorizonYears]);

  // Fetch todas as timelines e os eventos de todo o horizonte ao carregar o Timeboard
  useEffect(() => {
    if (!activeTimeboardId) return;
    let isMounted = true;
    setIsLoadingSystem(true);

    api.fetchTimelines({ timeboardId: activeTimeboardId })
      .then((data) => {
        if (isMounted && Array.isArray(data)) {
          setTimelines(data);
          if (data.length > 0) {
            const balanceTl = data.find((tl) => tl.type === TimelineType.BALANCE);
            const defaultTl = balanceTl || data[0];

            const rawTargetId = activeFinancialTab || activeTimelineId;
            const targetTl = data.find((tl) => tl.id === rawTargetId || tl.type === rawTargetId) || defaultTl;

            if (activeTimelineId !== targetTl.id) {
              setActiveTimelineId(targetTl.id);
            }
            if (activeFinancialTab !== targetTl.id) {
              setActiveFinancialTab(targetTl.id);
            }

            // Buscar eventos apenas UMA vez para todo o Timeboard no mount
            fetchEventsForVisiblePeriod(pastHorizonYears, futureHorizonYears, true);
          } else {
            setIsLoadingSystem(false);
          }
        }
      })
      .catch((err) => {
        console.error('Error fetching timelines for timeboard:', err.message);
        if (isMounted) setIsLoadingSystem(false);
      });

    return () => { isMounted = false; };
  }, [activeTimeboardId]);

  const refreshTimelines = React.useCallback(async () => {
    try {
      const tlData = await api.fetchTimelines({ timeboardId: activeTimeboardId });
      if (Array.isArray(tlData)) {
        setTimelines(tlData);
      }
      await fetchEventsForVisiblePeriod(pastHorizonYears, futureHorizonYears, true);
      return tlData;
    } catch (e) {
      console.error('Error refreshing timelines:', e);
    }
  }, [activeTimeboardId, fetchEventsForVisiblePeriod, pastHorizonYears, futureHorizonYears]);

  // Expandir horizonte de tempo sem descartar o que já está na memória
  useEffect(() => {
    if (activeTimeboardId) {
      fetchEventsForVisiblePeriod(pastHorizonYears, futureHorizonYears, false);
    }
  }, [pastHorizonYears, futureHorizonYears, activeTimeboardId, fetchEventsForVisiblePeriod]);

  const handleLoadMoreFuture = async () => {
    const nextYears = futureHorizonYears + 1;
    setFutureHorizonYears(nextYears);
  };

  const handleLoadMorePast = async () => {
    const nextPast = pastHorizonYears + 1;
    setPastHorizonYears(nextPast);
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

  // All timelines belonging to active Timeboard
  const activeTimeboardTimelines = React.useMemo(() => {
    if (!activeTimeboardId || !Array.isArray(timelines)) return [];
    const filtered = timelines.filter((tl) => (tl.timeboardId || tl.timeboard_id) === activeTimeboardId);

    const typePriority = {
      [TimelineType.BALANCE]: 1,
      [TimelineType.INCOME]: 2,
      [TimelineType.EXPENSE]: 3,
      [TimelineType.INVESTMENT]: 4
    };

    return [...filtered].sort((a, b) => {
      const pA = typePriority[a.type] ?? 99;
      const pB = typePriority[b.type] ?? 99;
      if (pA !== pB) {
        return pA - pB;
      }
      return (a.name || '').localeCompare(b.name || '');
    });
  }, [timelines, activeTimeboardId]);

  // Dynamic active timeline representation for the selected tab
  const activeTimeline = React.useMemo(() => {
    if (!activeTimeboard || activeTimeboardTimelines.length === 0) return null;

    const currentSelected = activeTimeboardTimelines.find(
      (tl) => tl.id === activeFinancialTab || tl.type === activeFinancialTab || tl.id === activeTimelineId || tl.type === activeTimelineId
    ) || activeTimeboardTimelines[0];

    return {
      ...currentSelected,
      timelines: activeTimeboardTimelines,
      events: rawEvents || []
    };
  }, [activeTimeboard, activeTimeboardTimelines, activeFinancialTab, activeTimelineId, rawEvents]);

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
  const focusedMonthRef = React.useRef(null);

  const handleOpenCreateEvent = (dateStr = '2026-08-21', nature = 'income') => {
    focusedMonthRef.current = dateStr ? dateStr.substring(0, 7) : null;
    scrollYBeforeModalRef.current = window.scrollY;
    setEditingEvent(null);
    setSelectedDateForNewEvent(dateStr);
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (eventObj) => {
    focusedMonthRef.current = eventObj?.date ? eventObj.date.substring(0, 7) : null;
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
          const updated = {
            ...editingEvent,
            ...eventData,
            timeboardId: activeTimeboardId,
            timelineId: targetTimelineId,
            timelineOriginId: targetTimelineId,
            eventId: editingEvent.eventId || editingEvent.seriesId
          };
          await api.updateEvent(editingEvent.id, updated);
          setRawEvents((prev) => prev.map((ev) => (ev.id === editingEvent.id ? updated : ev)));
          showToast(t('toast.eventUpdatedSuccess') || 'Evento atualizado com sucesso na base de dados!', 'success');
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
          setRawEvents((prev) => [newEvent, ...prev]);
          showToast(t('toast.eventCreatedSuccess') || 'Evento adicionado com sucesso na base de dados!', 'success');
        }

        const monthKey = eventData.date ? eventData.date.substring(0, 7) : focusedMonthRef.current;
        const scrollToMonthNode = () => {
          if (monthKey) {
            const targetNode = document.querySelector(`[data-month-key="${monthKey}"]`) || (monthKey === '2026-08' ? document.getElementById('timeline-node-today') : null);
            if (targetNode) {
              const navbar = document.querySelector('.app-header') || document.querySelector('header');
              const stickyDock = document.querySelector('.sticky-header-dock');
              const navHeight = navbar ? navbar.offsetHeight : 68;
              const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
              const totalStickyOffset = navHeight + 24 + dockHeight + 14;
              const elementDocTop = targetNode.getBoundingClientRect().top + window.pageYOffset;
              const targetY = elementDocTop - totalStickyOffset;
              window.scrollTo({ top: Math.max(0, targetY), behavior: 'instant' });
              return;
            }
          }
          if (typeof savedScrollPos === 'number' && savedScrollPos >= 0) {
            window.scrollTo({ top: savedScrollPos, left: 0, behavior: 'instant' });
          }
        };

        requestAnimationFrame(() => {
          scrollToMonthNode();
          setTimeout(scrollToMonthNode, 40);
        });
      } catch (err) {
        console.error('Error saving event:', err);
        showToast(t('toast.eventSaveError') || 'Erro ao guardar evento na base de dados.', 'error');
      }
    };

    saveAsync();
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

          const isNotCancelledOrDeleted = ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED;
          if (nextAuto && ev.date && ev.date <= todayStr && isNotCancelledOrDeleted) {
            const isIncome = ev.eventType === EventType.INCOME;
            const isInvestment = ev.eventType === EventType.INVESTMENT;
            const isAmortization = ev.eventType === EventType.AMORTIZATION;

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
      await refreshTimelines();
    } catch (err) {
      console.error('Error updating event directly:', err);
    }
  };

  const handleRequestDeleteEvent = (eventOrId) => {
    scrollYBeforeModalRef.current = window.scrollY;
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
        setRawEvents((prev) => prev.filter((ev) => String(ev.id) !== String(eventId)));
        const monthKey = targetEvent?.date ? targetEvent.date.substring(0, 7) : focusedMonthRef.current;
        const savedScrollPos = scrollYBeforeModalRef.current || window.scrollY;
        showToast(t('toast.eventDeletedSuccess') || 'Evento eliminado da base de dados!', 'success');

        const scrollToMonthNode = () => {
          if (monthKey) {
            const targetNode = document.querySelector(`[data-month-key="${monthKey}"]`) || (monthKey === '2026-08' ? document.getElementById('timeline-node-today') : null);
            if (targetNode) {
              const navbar = document.querySelector('.app-header') || document.querySelector('header');
              const stickyDock = document.querySelector('.sticky-header-dock');
              const navHeight = navbar ? navbar.offsetHeight : 68;
              const dockHeight = stickyDock ? stickyDock.offsetHeight : 80;
              const totalStickyOffset = navHeight + 24 + dockHeight + 14;
              const elementDocTop = targetNode.getBoundingClientRect().top + window.pageYOffset;
              const targetY = elementDocTop - totalStickyOffset;
              window.scrollTo({ top: Math.max(0, targetY), behavior: 'instant' });
              return;
            }
          }
          if (typeof savedScrollPos === 'number' && savedScrollPos >= 0) {
            window.scrollTo({ top: savedScrollPos, left: 0, behavior: 'instant' });
          }
        };

        requestAnimationFrame(() => {
          scrollToMonthNode();
          setTimeout(scrollToMonthNode, 40);
        });
      } catch (err) {
        console.error('Error deleting event:', err);
        showToast(t('toast.eventDeleteError') || 'Erro ao eliminar evento da base de dados.', 'error');
      }
    };

    deleteAsync();
    setDeletingEvent(null);
  };

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

        const isIncome = ev.eventType === EventType.INCOME;
        const isInvestment = ev.eventType === EventType.INVESTMENT;

        let nextStatus, nextCompleted;
        if (isIncome) {
          const isCurrReceived = ev.status === EventStatus.RECEIVED || Boolean(ev.isCompleted);
          nextStatus = isCurrReceived ? EventStatus.PENDING : EventStatus.RECEIVED;
          nextCompleted = !isCurrReceived;
        } else if (isInvestment) {
          const isCurrInvested = ev.status === EventStatus.INVESTED || ev.status === EventStatus.PAID || Boolean(ev.isCompleted);
          nextStatus = isCurrInvested ? EventStatus.PLANNED : EventStatus.INVESTED;
          nextCompleted = !isCurrInvested;
        } else {
          const isCurrPaid = ev.status === EventStatus.PAID || Boolean(ev.isCompleted);
          nextStatus = isCurrPaid ? EventStatus.PENDING : EventStatus.PAID;
          nextCompleted = !isCurrPaid;
        }

        return {
          ...ev,
          status: nextStatus,
          isCompleted: nextCompleted,
          isLocked: nextCompleted,
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

          const isIncome = ev.eventType === EventType.INCOME;
          const isInvestment = ev.eventType === EventType.INVESTMENT;

          let nextStatus, nextCompleted;
          if (isIncome) {
            const isCurrReceived = ev.status === EventStatus.RECEIVED || Boolean(ev.isCompleted);
            nextStatus = isCurrReceived ? EventStatus.PENDING : EventStatus.RECEIVED;
            nextCompleted = !isCurrReceived;
          } else if (isInvestment) {
            const isCurrInvested = ev.status === EventStatus.INVESTED || ev.status === EventStatus.PAID || Boolean(ev.isCompleted);
            nextStatus = isCurrInvested ? EventStatus.PLANNED : EventStatus.INVESTED;
            nextCompleted = !isCurrInvested;
          } else {
            const isCurrPaid = ev.status === EventStatus.PAID || Boolean(ev.isCompleted);
            nextStatus = isCurrPaid ? EventStatus.PENDING : EventStatus.PAID;
            nextCompleted = !isCurrPaid;
          }

          return {
            ...ev,
            status: nextStatus,
            isCompleted: nextCompleted,
            isLocked: nextCompleted,
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
    const isPaid = status === EventStatus.PAID;
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
  const handleSaveAmortization = async ({ id, amount, date, strategy, status = EventStatus.AMORTIZED, notes }) => {
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
    const isCompleted = status === EventStatus.AMORTIZED || status === EventStatus.PAID;

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
      eventType: EventType.AMORTIZATION,
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
        {timelines.length > 0 && activeTimeline ? (
          <VerticalTimeline
            timeline={activeTimeline}
            timelines={activeTimeboardTimelines}
            activeFinancialTab={activeFinancialTab}
            onSelectFinancialTab={(tabKey) => {
              setActiveFinancialTab(tabKey);
              setActiveTimelineId(tabKey);
            }}
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
          <div className="empty-timeline-state glass-panel" style={{ marginTop: '40px', textAlign: 'center' }}>
            <h2>{activeTimeboard ? activeTimeboard.name : 'Carregando Timeboards...'}</h2>
            <p style={{ color: 'var(--text-muted)', marginTop: '8px' }}>
              Timeboard conectado ao banco de dados.
            </p>
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
                    {activeTimeline?.type === TimelineType.BALANCE
                      ? 'Limpar todos os movimentos do Timeboard'
                      : `Limpar movimentos de ${activeTimeline?.name || ''}`}
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

      {/* System Loading Overlay */}
      {isLoadingSystem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99999,
            background: 'rgba(10, 15, 30, 0.85)',
            backdropFilter: 'blur(12px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '18px',
            color: '#fff'
          }}
        >
          <div
            style={{
              width: '48px',
              height: '48px',
              border: '3px solid rgba(99, 102, 241, 0.2)',
              borderTopColor: '#6366f1',
              borderRadius: '50%',
              animation: 'spin 0.8s linear infinite'
            }}
          />
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '700', margin: '0 0 4px 0', color: '#f8fafc' }}>
              System Loading...
            </h3>
            <p style={{ fontSize: '0.84rem', color: '#94a3b8', margin: 0 }}>
              Sincronizando eventos e status do mês corrente
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
