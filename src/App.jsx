import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { initialTimelines } from './data/mockTimelines';
import Navbar from './components/Navbar';
import TimelineHeader from './components/TimelineHeader';
import VerticalTimeline from './components/VerticalTimeline';
import CreateTimelineModal from './components/CreateTimelineModal';
import CreateEventModal from './components/CreateEventModal';
import AmortizationModal from './components/AmortizationModal';
import EditInstallmentModal from './components/EditInstallmentModal';
import {
  recalculateLoanState,
  propagateInstallmentAmountForward,
  applyExtraordinaryAmortization,
  getLoanMetrics
} from './utils/loanCalculations';
import './App.css';

export default function App() {
  // Load timelines from localStorage or mock data (v15 with clean structure & reactive toggles)
  const [timelines, setTimelines] = useState(() => {
    const saved = localStorage.getItem('chrono_timelines_data_v15');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved timelines:', e);
      }
    }
    return initialTimelines;
  });

  const [activeTimelineId, setActiveTimelineId] = useState(() => {
    return 'tl-principal';
  });

  // Financial Sub-Tabs State ('balanco' | 'entradas' | 'gastos' | 'investimentos' | 'emprestimos')
  const [activeFinancialTab, setActiveFinancialTab] = useState('balanco');

  // Modal states
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState('2026-08-21');
  const [eventModalDefaultNature, setEventModalDefaultNature] = useState('income'); // 'income' | 'expense' | 'investment'

  // Loan Specific Modals
  const [isAmortizationModalOpen, setIsAmortizationModalOpen] = useState(false);
  const [editingInstallment, setEditingInstallment] = useState(null);

  // Theme (light is default)
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('chrono_theme') || 'light';
  });

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('chrono_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Save to localStorage when timelines state updates
  useEffect(() => {
    localStorage.setItem('chrono_timelines_data_v15', JSON.stringify(timelines));
  }, [timelines]);

  const rawActiveTimeline = timelines.find((tl) => tl.id === activeTimelineId) || timelines[0];

  // Dynamically merge loan and income events up to today (2026-08-21) when viewing the Principal timeline
  const activeTimeline = React.useMemo(() => {
    if (!rawActiveTimeline) return null;
    if (rawActiveTimeline.type === 'Principal') {
      const todayStr = '2026-08-21';
      const otherTimelines = timelines.filter((tl) => tl.id !== rawActiveTimeline.id);
      const mergedEvents = [];

      otherTimelines.forEach((tl) => {
        (tl.events || []).forEach((ev) => {
          if (ev.date <= todayStr) {
            mergedEvents.push({
              ...ev,
              timelineOriginId: ev.timelineOriginId || tl.id,
              timelineOriginName: ev.timelineOriginName || tl.name,
              timelineOriginIcon:
                ev.timelineOriginIcon ||
                (tl.id === 'tl-loan-house' ? '🏠' : tl.id === 'tl-income' ? '💵' : '🚗'),
              timelineOriginColor: tl.color
            });
          }
        });
      });

      // Sort by date descending
      mergedEvents.sort((a, b) => b.date.localeCompare(a.date));

      return {
        ...rawActiveTimeline,
        startDate: '2018-01-10',
        endDate: todayStr,
        events: mergedEvents
      };
    }
    return rawActiveTimeline;
  }, [rawActiveTimeline, timelines]);

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
    } else {
      // Create new timeline
      const newTl = {
        ...formData,
        id: `tl-${Date.now()}`,
        events: []
      };
      setTimelines((prev) => [newTl, ...prev]);
      setActiveTimelineId(newTl.id);
    }
  };

  const handleDeleteTimeline = () => {
    if (!activeTimeline) return;
    if (window.confirm(`Tem a certeza que deseja eliminar a timeline "${activeTimeline.name}"?`)) {
      const filtered = timelines.filter((tl) => tl.id !== activeTimeline.id);
      setTimelines(filtered);
      if (filtered.length > 0) {
        setActiveTimelineId(filtered[0].id);
      }
    }
  };

  // ----------------------------------------------------
  // Event Handlers
  // ----------------------------------------------------
  const handleOpenCreateEvent = (dateStr = '2026-08-21', nature = 'income') => {
    setEditingEvent(null);
    setSelectedDateForNewEvent(dateStr);
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (eventObj) => {
    setEditingEvent(eventObj);
    const nature = eventObj?.isExpense ? 'expense' : eventObj?.isInvestment ? 'investment' : 'income';
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  };

  const handleSaveEvent = (eventData) => {
    if (!activeTimeline) return;

    if (editingEvent && editingEvent.id) {
      // Update event
      const updatedEvents = (activeTimeline.events || []).map((ev) =>
        ev.id === editingEvent.id ? { ...ev, ...eventData } : ev
      );

      setTimelines((prev) =>
        prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
      );
    } else {
      // Add new event
      const newEvent = {
        ...eventData,
        id: `ev-${Date.now()}`
      };

      const updatedEvents = [newEvent, ...(activeTimeline.events || [])];

      setTimelines((prev) =>
        prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
      );
    }
  };

  const handleUpdateEventDirect = (updatedEvent) => {
    if (!updatedEvent || !updatedEvent.id) return;
    setTimelines((prev) =>
      prev.map((tl) => {
        const hasEvent = (tl.events || []).some((ev) => ev.id === updatedEvent.id);
        if (!hasEvent) return tl;
        return {
          ...tl,
          events: tl.events.map((ev) => (ev.id === updatedEvent.id ? { ...ev, ...updatedEvent } : ev))
        };
      })
    );
  };

  const handleDeleteEvent = (eventId) => {
    if (!activeTimeline) return;
    if (window.confirm('Tem a certeza que deseja eliminar este evento?')) {
      const updatedEvents = (activeTimeline.events || []).filter((ev) => ev.id !== eventId);
      setTimelines((prev) =>
        prev.map((tl) => (tl.id === activeTimeline.id ? { ...tl, events: updatedEvents } : tl))
      );
    }
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
      id: `ev-task-${Date.now()}`
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
      todayNode.scrollIntoView({ behavior: 'smooth', block: 'center' });
      todayNode.classList.add('pulse-highlight-node');
      setTimeout(() => {
        todayNode.classList.remove('pulse-highlight-node');
      }, 2000);
    }
  };

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        timelines={timelines}
        activeTimelineId={activeTimelineId}
        onSelectTimeline={setActiveTimelineId}
        onOpenCreateTimeline={handleOpenCreateTimeline}
        onOpenCreateEvent={() => handleOpenCreateEvent('2026-08-21')}
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
            onEditEvent={handleOpenEditEvent}
            onUpdateEventDirect={handleUpdateEventDirect}
            onDeleteEvent={handleDeleteEvent}
            onToggleTask={handleToggleTask}
            onAddEventForDate={(dateStr, nature) => handleOpenCreateEvent(dateStr, nature || (activeFinancialTab === 'gastos' ? 'expense' : activeFinancialTab === 'investimentos' ? 'investment' : 'income'))}
            onCompleteFloatingTask={handleCompleteFloatingTask}
            onAddFloatingTask={handleAddFloatingTask}
            onUpdateFloatingTaskPriority={handleUpdateFloatingTaskPriority}
            onAddChecklistItem={handleAddChecklistItem}
            onDeleteChecklistItem={handleDeleteChecklistItem}
            onToggleLoanPayment={handleToggleLoanPayment}
            onOpenEditInstallment={(inst) => setEditingInstallment(inst)}
            onNavigateToTimeline={(timelineId) => setActiveTimelineId(timelineId)}
            headerComponent={
              <TimelineHeader
                timeline={activeTimeline}
                allTimelines={timelines}
                activeFinancialTab={activeFinancialTab}
                onSelectFinancialTab={setActiveFinancialTab}
                onEdit={handleOpenEditTimeline}
                onDelete={handleDeleteTimeline}
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
    </div>
  );
}
