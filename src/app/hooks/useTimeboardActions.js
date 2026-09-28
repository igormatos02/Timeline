import { DEFAULT_TENANT } from '../../constants/tenant.js';
import * as api from '../../services/api';
import { generateUUID } from '../../utils/uuid.js';
import { TimelineType } from '../../enums/index.js';

// Extracted from App.jsx (App).
export function useTimeboardActions({
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
}) {
  const handleSaveTimeboard = async (formData) => {
    const targetId = formData?.id || editingTimeboard?.id;
    if (targetId) {
      // Ensure print_template takes precedence over printTemplate
      const printTemplateValue = formData.print_template ?? formData.printTemplate ?? null;
      const updated = {
        ...formData,
        print_template: printTemplateValue,
        printTemplate: printTemplateValue,
        tenantId: formData?.tenantId || editingTimeboard?.tenantId || DEFAULT_TENANT.id
      };
      setTimeboards((prev) =>
        prev.map((tb) => (tb.id === targetId ? { ...tb, ...updated } : tb))
      );
      setMyTimeboards((prev) =>
        prev.map((tb) => (tb.id === targetId ? { ...tb, ...updated } : tb))
      );
      try {
        const saved = await api.updateTimeboard(targetId, updated);
        if (saved) {
          const freshSaved = {
            ...saved,
            print_template: saved.print_template ?? saved.printTemplate ?? printTemplateValue,
            printTemplate: saved.printTemplate ?? saved.print_template ?? printTemplateValue
          };
          setTimeboards((prev) =>
            prev.map((tb) => (tb.id === targetId ? { ...tb, ...freshSaved } : tb))
          );
          setMyTimeboards((prev) =>
            prev.map((tb) => (tb.id === targetId ? { ...tb, ...freshSaved } : tb))
          );
          setEditingTimeboard((prev) => (prev?.id === targetId ? { ...prev, ...freshSaved } : prev));
        }
        return saved;
      } catch (err) {
        console.error('Error updating timeboard:', err);
        throw err;
      }
    } else {
      const current = currentUser || api.getCurrentUser();
      const currentUserId = current ? current.id : null;

      const newTb = {
        ...formData,
        id: generateUUID(),
        tenantId: DEFAULT_TENANT.id,
        ownerId: currentUserId,
        owner_id: currentUserId
      };

      // Optimistic update of timeboard list and myTimeboards
      setTimeboards((prev) => [...prev, newTb]);
      setMyTimeboards((prev) => [...prev, newTb]);
      setActiveTimeboardId(newTb.id);

      try {
        const createdTb = await api.createTimeboard(newTb, language);
        if (createdTb && createdTb.id) {
          setTimeboards((prev) => prev.map((tb) => (tb.id === newTb.id ? { ...tb, ...createdTb } : tb)));
          setMyTimeboards((prev) => prev.map((tb) => (tb.id === newTb.id ? { ...tb, ...createdTb } : tb)));
        }
        // Refresh timelines from backend to load newly created default timelines (Balance, Income, Expense, Investments)
        const updatedTimelines = await api.fetchTimelines({ timeboardId: newTb.id });
        if (Array.isArray(updatedTimelines) && updatedTimelines.length > 0) {
          setTimelines((prev) => [...prev.filter((tl) => tl.timeboardId !== newTb.id), ...updatedTimelines]);
          const balanceTl = updatedTimelines.find((tl) => tl.type === TimelineType.BALANCE);
          const initialTabId = balanceTl ? balanceTl.id : updatedTimelines[0].id;
          setActiveTimelineId(initialTabId);
          setActiveFinancialTab(initialTabId);
        }
      } catch (err) {
        console.error('Error creating timeboard or default timelines:', err);
      }
    }
  };

  const handleDeleteTimeboard = async (timeboardId) => {
    if (!timeboardId) return;
    const targetTb = timeboards.find((t) => t.id === timeboardId);
    const nameStr = targetTb ? ` "${targetTb.name}"` : '';
    if (window.confirm(`Tem a certeza que deseja eliminar o Timeboard${nameStr}?`)) {
      const remaining = timeboards.filter((tb) => tb.id !== timeboardId);
      setTimeboards(remaining);

      // Limpar o estado local de timelines e eventos pertencentes ao timeboard excluído
      const deletedTimelineIds = new Set(
        timelines.filter((tl) => tl.timeboardId === timeboardId || tl.timeboard_id === timeboardId).map((tl) => tl.id)
      );
      setTimelines((prev) => prev.filter((tl) => tl.timeboardId !== timeboardId && tl.timeboard_id !== timeboardId));
      setRawEvents((prev) => prev.filter((ev) => ev.timeboardId !== timeboardId && !deletedTimelineIds.has(ev.timelineId)));

      if (remaining.length > 0) {
        setActiveTimeboardId(remaining[0].id);
      } else {
        setActiveTimeboardId(null);
        setActiveTimelineId(null);
        setActiveFinancialTab(null);
      }

      try {
        await api.deleteTimeboard(timeboardId);
      } catch (e) {
        console.error('Error deleting timeboard:', e);
      }
    }
  };

  const handleSelectTimeboardFromHub = (tbId) => {
    setActiveTimeboardId(tbId);
    setActiveTimelineId(null);
    setActiveFinancialTab(null);
    setCurrentView('workspace');
    localStorage.setItem('chrono_current_view', 'workspace');
  };

  const handleNavigateToHub = () => {
    setCurrentView('hub');
    localStorage.setItem('chrono_current_view', 'hub');
  };

  return {
    handleDeleteTimeboard,
    handleNavigateToHub,
    handleSaveTimeboard,
    handleSelectTimeboardFromHub
  };
}
