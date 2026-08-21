import React, { useState, useEffect } from 'react';
import { initialTimelines } from './data/mockTimelines';
import Navbar from './components/Navbar';
import TimelineHeader from './components/TimelineHeader';
import VerticalTimeline from './components/VerticalTimeline';
import CreateTimelineModal from './components/CreateTimelineModal';
import CreateEventModal from './components/CreateEventModal';
import './App.css';

export default function App() {
  // Load timelines from localStorage or mock data
  const [timelines, setTimelines] = useState(() => {
    const saved = localStorage.getItem('chrono_timelines_data');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse saved timelines:', e);
      }
    }
    return initialTimelines;
  });

  const [activeTimelineId, setActiveTimelineId] = useState(() => {
    return timelines[0]?.id || 'tl-1';
  });

  // Modal states
  const [isTimelineModalOpen, setIsTimelineModalOpen] = useState(false);
  const [editingTimeline, setEditingTimeline] = useState(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState('2026-08-21');

  // Save to localStorage when timelines state updates
  useEffect(() => {
    localStorage.setItem('chrono_timelines_data', JSON.stringify(timelines));
  }, [timelines]);

  const activeTimeline = timelines.find((tl) => tl.id === activeTimelineId) || timelines[0];

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
  const handleOpenCreateEvent = (dateStr = '2026-08-21') => {
    setEditingEvent(null);
    setSelectedDateForNewEvent(dateStr);
    setIsEventModalOpen(true);
  };

  const handleOpenEditEvent = (eventObj) => {
    setEditingEvent(eventObj);
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

  return (
    <div className="app-container">
      {/* Navbar */}
      <Navbar
        timelines={timelines}
        activeTimelineId={activeTimelineId}
        onSelectTimeline={setActiveTimelineId}
        onOpenCreateTimeline={handleOpenCreateTimeline}
        onOpenCreateEvent={() => handleOpenCreateEvent('2026-08-21')}
      />

      {/* Main Layout Area */}
      <main className="main-layout">
        {activeTimeline ? (
          <>
            {/* Active Timeline Hero Banner */}
            <TimelineHeader
              timeline={activeTimeline}
              onEdit={handleOpenEditTimeline}
              onDelete={handleDeleteTimeline}
            />

            {/* Vertical Timeline Engine */}
            <VerticalTimeline
              timeline={activeTimeline}
              onEditEvent={handleOpenEditEvent}
              onDeleteEvent={handleDeleteEvent}
              onToggleTask={handleToggleTask}
              onAddEventForDate={(dateStr) => handleOpenCreateEvent(dateStr)}
            />
          </>
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
      />
    </div>
  );
}
