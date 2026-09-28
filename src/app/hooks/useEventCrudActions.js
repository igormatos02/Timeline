import React, { useCallback } from 'react';
import { format } from 'date-fns';
import { buildCorrectionDraft, isLockableMovement, isLockedMovement } from '../../../shared/finance/corrections.js';
import { AmortizationEventCategory, EventDeletionMode, EventRecurrence, EventStatus, EventType, FINANCIAL_ADVANCE_PAYMENT_TYPES, FollowupStatus, TimelineType, isAccountOutflowEvent, isCancelledStatus, isPocketTransferEvent, isPositiveStatus, normalizePeriodicity, normalizeRecurrence } from '../../enums/index.js';
import * as api from '../../services/api';
import { generateUUID } from '../../utils/uuid.js';
import { effectiveStatusFor } from '../../../shared/finance/statusRules.js';
import { isLoanInstallment } from '../../utils/loanCalculations';

// Extracted from App.jsx (App).
export function useEventCrudActions({
  focusedMonthRef,
  activeTimeboardId,
  activeTimeboardTimelines,
  activeTimeline,
  deletingEvent,
  editingEvent,
  fetchEventsForVisiblePeriod,
  futureHorizonYears,
  handleOpenAmortizationModal,
  handleOpenWithdrawalModal,
  pastHorizonYears,
  refreshTimelines,
  scrollYBeforeModalRef,
  setDeletingEvent,
  setEditingEvent,
  setEventModalDefaultNature,
  setIsEventModalOpen,
  setRawEvents,
  setSelectedDateForNewEvent,
  setTimelines,
  showToast,
  t,
  timelines
}) {

  const handleOpenCreateEvent = useCallback((dateStr = format(new Date(), 'yyyy-MM-dd'), nature = 'income', presetData = null) => {
    focusedMonthRef.current = dateStr ? dateStr.substring(0, 7) : null;
    scrollYBeforeModalRef.current = window.scrollY;
    setEditingEvent(presetData);
    setSelectedDateForNewEvent(dateStr);
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  }, []);

  const handleOpenEditEvent = useCallback((eventObj) => {
    focusedMonthRef.current = eventObj?.date ? eventObj.date.substring(0, 7) : null;
    scrollYBeforeModalRef.current = window.scrollY;

    // Effective movements are locked (only cancelled or corrected) and cancelled ones cannot be edited
    const isFinancialLocked = Boolean(eventObj) && (
      isLockedMovement(eventObj) ||
      (isLockableMovement(eventObj) && isCancelledStatus(eventObj.status))
    );
    if (isFinancialLocked) {
      showToast(t('timeline.cannotEditLockedEvent'), 'warning');
      return;
    }

    if (
      eventObj?.eventType === EventType.AMORTIZATION ||
      eventObj?.category === AmortizationEventCategory.REDUCE_TERM ||
      eventObj?.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
      eventObj?.isAmortization
    ) {
      handleOpenAmortizationModal(eventObj.date, eventObj);
      return;
    }
    if (eventObj?.eventType === EventType.WITHDRAWAL || eventObj?.isWithdrawal || isAccountOutflowEvent(eventObj) || isPocketTransferEvent(eventObj)) {
      handleOpenWithdrawalModal(eventObj.date, eventObj.pocketId || eventObj.pocket_id, eventObj);
      return;
    }
    setEditingEvent(eventObj);
    const nature = eventObj?.isExpense ? 'expense' : eventObj?.isInvestment ? 'investment' : 'income';
    setEventModalDefaultNature(nature);
    setIsEventModalOpen(true);
  }, [handleOpenAmortizationModal, handleOpenWithdrawalModal]);

  // "Correct" an effective movement: opens the matching form pre-filled with its data (as a new one-time
  // movement); the original occurrence is cancelled only when the correction is saved (see handleSaveEvent)
  const handleCorrectEvent = useCallback((eventObj) => {
    if (!eventObj) return;
    focusedMonthRef.current = eventObj.date ? eventObj.date.substring(0, 7) : null;
    scrollYBeforeModalRef.current = window.scrollY;
    const draft = buildCorrectionDraft(eventObj);
    if (eventObj.eventType === EventType.WITHDRAWAL || eventObj.isWithdrawal || isAccountOutflowEvent(eventObj) || isPocketTransferEvent(eventObj)) {
      handleOpenWithdrawalModal(eventObj.date, eventObj.pocketId || eventObj.pocket_id || null, draft);
      return;
    }
    setEditingEvent(draft);
    setEventModalDefaultNature(eventObj.isExpense ? 'expense' : eventObj.isInvestment ? 'investment' : 'income');
    setIsEventModalOpen(true);
  }, [handleOpenWithdrawalModal]);

  const sanitizeFutureEventStatus = (event) => {
    if (!event || !event.date) return event;
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isFutureEvent = event.date > todayStr;
    if (!isFutureEvent) return event;
    // Income, expense and investment events can be paid / received in advance
    if (FINANCIAL_ADVANCE_PAYMENT_TYPES.includes(event.eventType) || Boolean(event.isWithdrawal)) return event;

    const isPositive = isPositiveStatus(event.status) || event.status === FollowupStatus.FINISHED || Boolean(event.isCompleted);
    if (isPositive) {
      let pendingStatus = EventStatus.PENDING;
      const evType = event.eventType;
      const tlType = event.timelineType || event.timeline_type;
      if (evType === EventType.INVESTMENT) pendingStatus = EventStatus.PLANNED;
      else if (evType === EventType.REMINDER || tlType === TimelineType.REMINDER || evType === EventType.REGISTER || tlType === TimelineType.DIARY) pendingStatus = EventStatus.OPEN;
      else if (evType === EventType.FOLLOWUP || tlType === TimelineType.FOLLOWUP) pendingStatus = FollowupStatus.IN_PROGRESS;

      return {
        ...event,
        status: pendingStatus,
        isCompleted: false,
        completedAtTime: null
      };
    }
    return event;
  };

  // editTarget: the event being edited (the event modal's one by default; the account outflow modal passes its own)
  const handleSaveEvent = (rawEventData, editTarget = editingEvent) => {
    // "Correct": the new movement keeps the original's effective status and the original occurrence is cancelled
    const { correctionOf, ...correctedData } = rawEventData || {};
    const eventData = sanitizeFutureEventStatus(correctionOf
      ? { ...correctedData, status: correctionOf.status || correctedData.status, isCompleted: Boolean(correctionOf.status) || correctedData.isCompleted }
      : correctedData);
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
        if (editTarget && editTarget.id) {
          const updated = {
            ...editTarget,
            ...eventData,
            timeboardId: activeTimeboardId,
            timelineId: targetTimelineId,
            timelineOriginId: targetTimelineId,
            eventId: editTarget.eventId || editTarget.seriesId
          };
          await api.updateEvent(editTarget.id, updated);
          await refreshTimelines();
          showToast(t('toast.eventUpdatedSuccess'), 'success');
        } else {
          const normRec = normalizeRecurrence(eventData);
          const isRecurring = normRec === EventRecurrence.RECURRING || normRec === EventRecurrence.LIMITED;
          const newEvent = {
            ...eventData,
            id: generateUUID(),
            timeboardId: activeTimeboardId,
            timelineId: targetTimelineId,
            timelineOriginId: targetTimelineId,
            eventId: isRecurring ? generateUUID() : null,
            version: 0,
            recurrence: normRec,
            periodicity: normalizePeriodicity(eventData.periodicity || eventData.aggregation),
            isRecurring
          };
          await api.createEvent(newEvent);
          if (correctionOf?.id) {
            await api.setEventStatus(correctionOf.id, { date: correctionOf.date, status: EventStatus.CANCELLED, timeboardId: activeTimeboardId });
          }
          await refreshTimelines();
          showToast(t(correctionOf ? 'toast.eventCorrectedSuccess' : 'toast.eventCreatedSuccess'), 'success');
        }

        const monthKey = eventData.date ? eventData.date.substring(0, 7) : focusedMonthRef.current;
        const currentMonthKey = format(new Date(), 'yyyy-MM');
        const scrollToMonthNode = () => {
          if (monthKey) {
            const targetNode = document.querySelector(`[data-month-key="${monthKey}"]`) || (monthKey === currentMonthKey ? document.getElementById('timeline-node-today') : null);
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
        showToast(err.message || t('toast.eventSaveError'), 'error');
      }
    };

    saveAsync();
  };

  const handleUpdateEventDirect = useCallback(async (rawUpdatedEvent) => {
    if (!rawUpdatedEvent || !rawUpdatedEvent.id) return;

    // Shared notices are shown inside another timeline: restore their own timeline before saving
    let updatedEvent = rawUpdatedEvent;
    if (rawUpdatedEvent.isSharedNotice) {
      const { isSharedNotice: _isSharedNotice, noticeTimelineId, timelineOriginColor: _originColor, timelineColor: _color, ...rest } = rawUpdatedEvent;
      updatedEvent = { ...rest, timelineId: noticeTimelineId, timelineOriginId: noticeTimelineId, timeline_id: noticeTimelineId };
    }

    const targetSeriesId = updatedEvent.seriesId || updatedEvent.eventId;
    const isAutoChange = updatedEvent.automatic !== undefined;

    const resolveMatchingEvent = (ev) => {
      if (ev.id === updatedEvent.id) {
        return { ...ev, ...updatedEvent };
      }

      // Exigir estritamente que pertencem à mesma timeline e partilham seriesId/eventId
      const isSameSeries = targetSeriesId && ev.timelineId === updatedEvent.timelineId && (
        ev.seriesId === targetSeriesId ||
        ev.eventId === targetSeriesId
      );

      if (isSameSeries) {
        if (isAutoChange) {
          const nextAuto = Boolean(updatedEvent.automatic);
          let newStatus = ev.status;
          let newIsCompleted = Boolean(ev.isCompleted);

          const isNotCancelledOrDeleted = ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED;
          const todayStr = format(new Date(), 'yyyy-MM-dd');
          if (nextAuto && ev.date && ev.date <= todayStr && isNotCancelledOrDeleted) {
            // Shared status words (shared/finance/statusRules.js)
            newStatus = effectiveStatusFor(ev);
            newIsCompleted = true;
          }

          return {
            ...ev,
            automatic: nextAuto,
            isAutomatic: nextAuto,
            status: newStatus,
            isCompleted: newIsCompleted
          };
        }

        // Per-occurrence data (comments, payment date, receipt number) belongs to the edited month only
        const {
          date: _d,
          id: _i,
          monthNotes: _monthNotes,
          receiptDate: _receiptDate,
          contYear: _contYear,
          cont_year: _contYearSnake,
          ...restProps
        } = updatedEvent;
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
      // The optimistic change was not saved: reload the real state from the server and tell the user
      console.error('Error updating event directly:', err);
      showToast(t('common.updateFailed', { message: err?.message || '' }), 'error');
      await fetchEventsForVisiblePeriod(pastHorizonYears, futureHorizonYears, true);
    }
  }, [refreshTimelines, showToast, t, fetchEventsForVisiblePeriod, pastHorizonYears, futureHorizonYears]);

  // Updates an event in the local state only (the change was already saved elsewhere), so cards re-render at once
  const handlePatchEventLocal = useCallback((eventId, patch) => {
    if (!eventId || !patch) return;
    const applyPatch = (ev) => (ev && ev.id === eventId ? { ...ev, ...patch } : ev);
    setRawEvents((prev) => prev.map(applyPatch));
    setTimelines((prev) => prev.map((tl) => (tl.events ? { ...tl, events: tl.events.map(applyPatch) } : tl)));
  }, []);

  const handleRequestDeleteEvent = useCallback((eventOrId) => {
    scrollYBeforeModalRef.current = window.scrollY;
    if (!eventOrId) return;
    let targetObj = eventOrId;
    if (typeof eventOrId !== 'object' || !eventOrId.id) {
      targetObj = (activeTimeline?.events || []).find((ev) => ev.id === eventOrId);
    }
    if (targetObj && isLoanInstallment(targetObj)) {
      showToast('As parcelas de empréstimo não podem ser eliminadas individualmente. Edite ou elimine o contrato.', 'warning');
      return;
    }
    if (targetObj && targetObj.id) {
      setDeletingEvent(targetObj);
    }
  }, [activeTimeline]);

  const handleConfirmDeleteEvent = (eventId, deleteScope = EventDeletionMode.EVERYTHING) => {
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
        const mode = typeof deleteScope === 'string' ? deleteScope : (deleteScope ? EventDeletionMode.EVERYTHING : EventDeletionMode.ONLY_THIS);
        await api.deleteEvent(eventId, {
          deletionMode: mode,
          deleteScope: mode,
          eventId: targetEvent.eventId || targetEvent.seriesId,
          date: targetEvent.date
        });
        setRawEvents((prev) => prev.filter((ev) => String(ev.id) !== String(eventId)));
        const monthKey = targetEvent?.date ? targetEvent.date.substring(0, 7) : focusedMonthRef.current;
        const currentMonthKey = format(new Date(), 'yyyy-MM');
        const savedScrollPos = scrollYBeforeModalRef.current || window.scrollY;
        showToast(t('toast.eventDeletedSuccess'), 'success');
        await refreshTimelines();

        const scrollToMonthNode = () => {
          if (monthKey) {
            const targetNode = document.querySelector(`[data-month-key="${monthKey}"]`) || (monthKey === currentMonthKey ? document.getElementById('timeline-node-today') : null);
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
        showToast(t('toast.eventDeleteError'), 'error');
      }
    };

    deleteAsync();
    setDeletingEvent(null);
  };

  return {
    handleConfirmDeleteEvent,
    handleCorrectEvent,
    handleOpenCreateEvent,
    handleOpenEditEvent,
    handlePatchEventLocal,
    handleRequestDeleteEvent,
    handleSaveEvent,
    handleUpdateEventDirect
  };
}
