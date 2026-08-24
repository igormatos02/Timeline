import React, { useState, useEffect } from 'react';
import { format, parseISO, addMonths } from 'date-fns';
import { initialTimeboards, initialTimelines } from './data/mockTimelines';
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
  getLoanMetrics
} from './utils/loanCalculations';
import * as api from './services/api';
import { generateUUID } from './utils/uuid';
import { RotateCcw, X } from 'lucide-react';
import './App.css';

export default function App() {
  // Timeboards State (Top Level Grouping)
  const [timeboards, setTimeboards] = useState(() => {
    try {
      const saved = localStorage.getItem('chrono_timeboards_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) { }
    return initialTimeboards;
  });

  const [activeTimeboardId, setActiveTimeboardId] = useState('e7b8c2d1-9f3a-4a6c-8e5b-1d7f3a9e2c4b');
  const [isTimeboardModalOpen, setIsTimeboardModalOpen] = useState(false);
  const [editingTimeboard, setEditingTimeboard] = useState(null);

  // Load timelines from localStorage or mock data (with automatic legacy cleanup)
  const [timelines, setTimelines] = useState(() => {
    try {
      // Clear legacy storage keys to free browser quota
      for (let i = 1; i <= 23; i++) {
        localStorage.removeItem(`chrono_timelines_data_v${i}`);
      }
    } catch (e) { }

    try {
      const saved = localStorage.getItem('chrono_timelines_data_v26');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Failed to parse saved timelines:', e);
    }
    return initialTimelines;
  });

  const [activeTimelineId, setActiveTimelineId] = useState(() => {
    return 'tl-income';
  });

  // Financial Sub-Tabs State ('balanco' | 'entradas' | 'gastos' | 'investimentos' | 'emprestimos')
  const [activeFinancialTab, setActiveFinancialTab] = useState('balanco');

  // Load latest data from Backend JSON Database on mount
  useEffect(() => {
    let isMounted = true;
    
    // 1. Load Timeboards
    api.fetchTimeboards()
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTimeboards(data);
          setActiveTimeboardId((currentId) => {
            const exists = data.some((tb) => tb.id === currentId);
            return exists ? currentId : data[0].id;
          });
        }
      })
      .catch((err) => {
        console.info('Using local timeboards cache:', err.message);
      });

    // 2. Load Timelines (12 meses anteriores e 12 meses futuros)
    api.fetchTimelines({ startDate: '2025-08-01', endDate: '2027-08-31' })
      .then((data) => {
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setTimelines(data);
        }
      })
      .catch((err) => {
        console.info('Backend API connected with fallback cache:', err.message);
      });

    return () => { isMounted = false; };
  }, []);

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

  const refreshTimelines = async (futureYears = futureHorizonYears, pastYears = pastHorizonYears) => {
    const endYear = 2026 + futureYears;
    const startYear = 2026 - pastYears;
    try {
      const data = await api.fetchTimelines({ startDate: `${startYear}-08-01`, endDate: `${endYear}-08-31` });
      if (Array.isArray(data) && data.length > 0) {
        setTimelines(data);
      }
      return data;
    } catch (e) {
      console.error('Error refreshing timelines:', e);
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
  const [editingInstallment, setEditingInstallment] = useState(null);

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
      localStorage.setItem('chrono_timeboards_v1', JSON.stringify(timeboards));
    } catch { }
  }, [timeboards]);

  // Selected Timeboard
  const activeTimeboard = timeboards.find((tb) => tb.id === activeTimeboardId) || timeboards[0];

  // All timelines belonging to active Timeboard
  const activeTimeboardTimelines = timelines.filter(
    (tl) => !tl.timeboardId || tl.timeboardId === activeTimeboardId || tl.timeboardId === activeTimeboard?.id || timeboards.length <= 1
  );

  // Dynamic consolidated timeline aggregating all financial timelines of the active Timeboard
  const activeTimeline = React.useMemo(() => {
    const seenEventIds = new Set();
    const allEvents = [];
    activeTimeboardTimelines.forEach((tl) => {
      (tl.events || []).forEach((ev) => {
        if (!ev || !ev.id) return;
        if (!seenEventIds.has(ev.id)) {
          seenEventIds.add(ev.id);
          allEvents.push({
            ...ev,
            timelineOriginId: ev.timelineOriginId || tl.id,
            timelineOriginName: ev.timelineOriginName || tl.name,
            timelineOriginColor: ev.timelineOriginColor || tl.color
          });
        }
      });
    });

    const carLoans = [];
    activeTimeboardTimelines.forEach((tl) => {
      if (tl.type === 'emprestimo') {
        carLoans.push(tl);
      }
      if (Array.isArray(tl.carLoans)) {
        tl.carLoans.forEach((loan) => carLoans.push(loan));
      }
    });

    return {
      id: activeTimeboard?.id || 'tb-principal',
      name: activeTimeboard?.name || 'Timeboard Principal',
      type: 'Financeiro',
      description: activeTimeboard?.description || '',
      startDate: '2025-08-01',
      endDate: `${2026 + futureHorizonYears}-08-31`,
      monthlySalary: 3349.60,
      carLoans,
      events: allEvents,
      timelines: activeTimeboardTimelines
    };
  }, [activeTimeboard, activeTimeboardTimelines, futureHorizonYears]);

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
      setTimelines((prev) =>
        prev.map((tl) => (tl.id === editingTimeline.id ? { ...tl, ...formData } : tl))
      );
      api.updateTimeline(editingTimeline.id, formData).catch(console.error);
    } else {
      // Create new timeline
      const newTl = {
        ...formData,
        id: generateUUID(),
        timeboardId: activeTimeboardId,
        events: []
      };
      setTimelines((prev) => [newTl, ...prev]);
      setActiveTimelineId(newTl.id);
      api.createTimeline(newTl).catch(console.error);
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
    setEditingEvent(eventObj);
    const nature = eventObj?.isExpense ? 'expense' : eventObj?.isInvestment ? 'investment' : 'income';
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (eventData) => {
    const savedScrollPos = scrollYBeforeModalRef.current || window.scrollY;

    // 1. Determinar o timelineOriginId correto dentro do Timeboard ativo
    let targetTimelineId = eventData.timelineOriginId;
    if (!targetTimelineId || targetTimelineId === activeTimeboardId) {
      if (eventData.isIncome || eventData.financialType === 'entrada' || eventData.category?.includes('entrada')) {
        const entTl = activeTimeboardTimelines.find((tl) => tl.type === 'entradas');
        targetTimelineId = entTl ? entTl.id : activeTimeboardTimelines[0]?.id;
      } else if (eventData.isInvestment || eventData.financialType === 'investimento' || eventData.category?.includes('investimento')) {
        const invTl = activeTimeboardTimelines.find((tl) => tl.type === 'investimentos');
        targetTimelineId = invTl ? invTl.id : activeTimeboardTimelines[0]?.id;
      } else {
        const gastTl = activeTimeboardTimelines.find((tl) => tl.type === 'gastos');
        targetTimelineId = gastTl ? gastTl.id : activeTimeboardTimelines[0]?.id;
      }
    }

    const saveAsync = async () => {
      try {
        if (editingEvent && editingEvent.id) {
          await api.updateEvent(editingEvent.id, {
            ...eventData,
            timelineOriginId: targetTimelineId,
            seriesId: editingEvent.seriesId,
            version: editingEvent.version
          });
        } else {
          const isRecurring = eventData.periodicity === 'recorrente' || eventData.isRecurring || (eventData.category && eventData.category.includes('recorrente'));
          const newEvent = {
            ...eventData,
            id: generateUUID(),
            seriesId: isRecurring ? generateUUID() : null,
            version: 0,
            isRecurring: Boolean(isRecurring),
            timelineOriginId: targetTimelineId
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

    try {
      await api.updateEvent(updatedEvent.id, updatedEvent);
      await refreshTimelines();
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
          seriesId: targetEvent.seriesId,
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
    let targetTlId = activeTimelineId;

    if (activeFinancialTab === 'entradas') {
      const found = activeTimeboardTimelines.find((t) => t.type === 'entradas');
      if (found) targetTlId = found.id;
    } else if (activeFinancialTab === 'gastos') {
      const found = activeTimeboardTimelines.find((t) => t.type === 'gastos');
      if (found) targetTlId = found.id;
    } else if (activeFinancialTab === 'investimentos') {
      const found = activeTimeboardTimelines.find((t) => t.type === 'investimentos');
      if (found) targetTlId = found.id;
    }

    try {
      if (activeFinancialTab === 'balanco') {
        const tlIdsToReset = activeTimeboardTimelines.map((t) => t.id);
        for (const tId of tlIdsToReset) {
          await api.resetTimeline(tId);
        }
      } else if (targetTlId) {
        await api.resetTimeline(targetTlId);
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
  const handleToggleLoanPayment = (installmentId) => {
    if (!installmentId) return;

    // Sync to backend
    api.toggleEventPayment(installmentId).catch(console.error);

    setTimelines((prevTimelines) => {
      const clickTimeStr = format(new Date(), 'HH:mm');

      return prevTimelines.map((tl) => {
        const hasEvent = (tl.events || []).some((e) => e.id === installmentId);
        if (!hasEvent) return tl;

        const updatedEvents = (tl.events || []).map((ev) => {
          if (ev.id !== installmentId) return ev;

          const isIncome = ev.isIncome || ev.financialType === 'entrada' || (ev.category && ev.category.startsWith('entrada'));
          const isInvestment = ev.isInvestment || ev.financialType === 'investimento' || (ev.category && ev.category.startsWith('investimento'));

          let nextStatus, nextCompleted;

          if (isIncome) {
            if (ev.date > '2026-08-21') {
              return ev; // Entradas futuras não podem ser marcadas antes da data
            }
            nextStatus = ev.status === 'Recebido' ? 'Pendente' : 'Recebido';
            nextCompleted = nextStatus === 'Recebido';
          } else if (isInvestment) {
            nextStatus = (ev.status === 'Investido' || ev.status === 'Pago') ? 'Planeado' : 'Investido';
            nextCompleted = nextStatus === 'Investido';
          } else {
            // Gastos e Parcelas de Empréstimo
            nextStatus = ev.status === 'Pago' ? 'Pendente' : 'Pago';
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

        const finalEvents = tl.type === 'Empréstimo'
          ? recalculateLoanState(tl, updatedEvents)
          : updatedEvents;

        return { ...tl, events: finalEvents };
      });
    });
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
  const handleSaveAmortization = ({ amount, date, strategy, notes }) => {
    if (!activeTimeline) return;

    let targetTimeline = activeTimeline;
    if (activeTimeline.type === 'Financeiro') {
      targetTimeline = {
        ...(activeTimeline.carLoanContract || {
          id: "tl-loan-80004197726",
          name: "Crédito Automóvel Nº 80004197726",
          totalDebt: 15456.60,
          installmentAmount: 218.47,
          periodicity: "mensal"
        }),
        events: activeTimeline.events
      };
    }

    const finalEvents = applyExtraordinaryAmortization({
      timeline: targetTimeline,
      eventsList: activeTimeline.events || [],
      amortizationAmount: amount,
      amortizationDateStr: date,
      strategy: strategy,
      notes: notes
    });

    setTimelines((prev) =>
      prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: finalEvents } : tl))
    );
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
            onNavigateToTimeline={(timelineId, tab) => {
              if (timelineId) setActiveTimelineId(timelineId);
              if (tab) setActiveFinancialTab(tab);
            }}
            headerComponent={
              <TimelineHeader
                timeline={activeTimeline}
                allTimelines={timelines}
                activeFinancialTab={activeFinancialTab}
                onSelectFinancialTab={setActiveFinancialTab}
                onEdit={handleOpenEditTimeline}
                onDelete={handleDeleteTimeline}
                onReset={() => setIsResetConfirmOpen(true)}
                onOpenCreateTimeline={handleOpenCreateTimeline}
                onOpenAmortizationModal={() => setIsAmortizationModalOpen(true)}
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
        onClose={() => setIsAmortizationModalOpen(false)}
        onSave={handleSaveAmortization}
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
                      : `Limpar ${activeFinancialTab.toUpperCase()}`}
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
