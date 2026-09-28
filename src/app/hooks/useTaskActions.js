import { useCallback } from 'react';
import { EventStatus } from '../../enums/index.js';
import { format } from 'date-fns';
import { generateUUID } from '../../utils/uuid.js';

// Extracted from App.jsx (App).
export function useTaskActions({
  activeTimeline,
  setTimelines
}) {
  const handleToggleTask = useCallback((eventId, taskIdx) => {
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
  }, [activeTimeline]);

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
          status: EventStatus.COMPLETED,
          date: format(new Date(), 'yyyy-MM-dd')
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

  return {
    handleAddChecklistItem,
    handleAddFloatingTask,
    handleCompleteFloatingTask,
    handleDeleteChecklistItem,
    handleToggleTask,
    handleUpdateFloatingTaskPriority
  };
}
