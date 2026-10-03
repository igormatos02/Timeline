import { useCallback } from 'react';
import { format } from 'date-fns';
import { AmortizationEventCategory, AmortizationStrategy, EventPriority, EventStatus, EventType, FollowupStatus, MovementKind, TimelineColor, isLoanTimelineType, isPositiveStatus } from '../../enums/index.js';
import { isLockableMovement } from '../../../shared/finance/corrections.js';
import { effectiveStatusFor, pendingStatusFor } from '../../../shared/finance/statusRules.js';
import { classifyMovement, isEffectiveMovement } from '../../../shared/finance/movements.js';
import { collectBoardEvents, computeFinancialPosition } from '../../../shared/finance/financialPosition.js';
import { propagateInstallmentAmountForward, recalculateLoanState } from '../../utils/loanCalculations';
import * as api from '../../services/api';
import { generateUUID } from '../../utils/uuid.js';
import { DEFAULT_TENANT } from '../../constants/tenant.js';

// Extracted from App.jsx (App).
export function useEventStatusActions({
  activeFinancialTab,
  activeTimeboardId,
  activeTimeboardTimelines,
  activeTimeline,
  activeTimelineId,
  editingAmortization,
  rawEvents,
  refreshTimelines,
  setEditingAmortization,
  setIsUpdatingInstallments,
  setRawEvents,
  setTimelines,
  showToast,
  t
}) {
  const handleToggleLoanPayment = useCallback(async (installmentId, explicitStatus = null) => {
    if (!installmentId) return;

    // A deposit from the wallet into the bank only becomes effective when the wallet has the money
    const boardEvents = collectBoardEvents(activeTimeboardTimelines, rawEvents);
    const target = boardEvents.find((ev) => ev.id === installmentId);
    if (target && !isEffectiveMovement(target) && (!explicitStatus || isPositiveStatus(explicitStatus))) {
      const timelineTypeMap = new Map((activeTimeboardTimelines || []).map((tl) => [String(tl.id), tl.type]));
      if (classifyMovement(target, timelineTypeMap).kind === MovementKind.DEPOSIT_INTERNAL) {
        const depositMonth = String(target.date || '').substring(0, 7);
        const { realized } = computeFinancialPosition({
          events: boardEvents,
          timelineTypeMap,
          asOfMonth: depositMonth,
          horizonMonth: depositMonth
        });
        if (realized.availableNet + 0.001 < Math.abs(Number(target.amount || 0))) {
          showToast(t('account.walletInsufficientForDeposit'), 'error');
          return;
        }
      }
    }

    const clickTimeStr = format(new Date(), 'HH:mm');

    const getNextState = (ev) => {
      if (explicitStatus) {
        return {
          nextStatus: explicitStatus,
          nextCompleted: isPositiveStatus(explicitStatus)
        };
      }

      const isCurrPositive = isPositiveStatus(ev.status) || ev.status === FollowupStatus.FINISHED || Boolean(ev.isCompleted);

      // Effective financial movements are locked (shared/finance/corrections.js)
      if (isLockableMovement(ev) && isCurrPositive) {
        return {
          nextStatus: ev.status,
          nextCompleted: true
        };
      }

      // Shared status words (shared/finance/statusRules.js)
      if (isCurrPositive) {
        return {
          nextStatus: pendingStatusFor(ev),
          nextCompleted: false
        };
      }

      const positiveStatus = effectiveStatusFor(ev);

      return {
        nextStatus: positiveStatus,
        nextCompleted: true
      };
    };

    let finalTargetStatus = explicitStatus;

    // 1. Optimistic update in rawEvents
    setRawEvents((prevEvents) =>
      prevEvents.map((ev) => {
        if (ev.id !== installmentId) return ev;
        const { nextStatus, nextCompleted } = getNextState(ev);
        if (!finalTargetStatus) finalTargetStatus = nextStatus;
        return {
          ...ev,
          status: nextStatus,
          isCompleted: nextCompleted,
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
          const { nextStatus, nextCompleted } = getNextState(ev);
          if (!finalTargetStatus) finalTargetStatus = nextStatus;
          return {
            ...ev,
            status: nextStatus,
            isCompleted: nextCompleted,
            completedAtTime: nextCompleted ? clickTimeStr : null
          };
        });

        const finalEvents = isLoanTimelineType(tl.type)
          ? recalculateLoanState(tl, updatedEvents)
          : updatedEvents;

        return { ...tl, events: finalEvents };
      });
    });

    // 3. Persist to backend asynchronously in the background
    try {
      await api.toggleEventPayment(installmentId, finalTargetStatus);
    } catch (err) {
      console.error('Error toggling payment status:', err);
      // Rollback, and say why (e.g. no permission, effective movement locked)
      showToast(t('common.updateFailed', { message: err?.message || '' }), 'error');
      refreshTimelines();
    }
  }, [activeTimeboardTimelines, rawEvents, refreshTimelines, showToast, t]);

  // Pay all prior loan installments up to (and including) target event
  const handlePayUpToHere = useCallback(async (targetEv) => {
    if (!targetEv || !activeTimeline) return;
    const targetInstNum = Number(targetEv.installmentNumber || targetEv.installment_number || 0);
    const targetDate = targetEv.date || '';
    const targetTimelineId = targetEv.timelineOriginId || targetEv.timelineId || targetEv.timeline_id || activeTimeline.id;

    let allTlEvents = rawEvents.filter(
      (ev) => ev.timelineId === targetTimelineId || ev.timelineOriginId === targetTimelineId || ev.timeline_id === targetTimelineId || ev.timelineId === activeTimeline.id || ev.timelineOriginId === activeTimeline.id
    );

    // Garantir que obtemos a totalidade das prestações da timeline vindas da API (mesmo as não visíveis no ecrã)
    try {
      const freshEvents = await api.fetchEvents({ timelineId: targetTimelineId });
      if (freshEvents && freshEvents.length > 0) {
        allTlEvents = freshEvents;
      }
    } catch (e) { }

    const eventsToPay = allTlEvents.filter((ev) => {
      const instNum = Number(ev.installmentNumber || ev.installment_number || 0);
      const isPaid = ev.status === EventStatus.PAID || Boolean(ev.isCompleted);
      if (isPaid) return false;
      if (targetInstNum > 0 && instNum > 0) {
        return instNum <= targetInstNum;
      }
      return ev.date && ev.date <= targetDate;
    });

    if (eventsToPay.length === 0) {
      showToast(t('toast.allPreviousPaid'), 'info');
      return;
    }

    // 1. Optimistic update in rawEvents
    const payIds = new Set(eventsToPay.map((e) => e.id));
    setRawEvents((prev) =>
      prev.map((ev) => {
        if (!payIds.has(ev.id)) return ev;
        return {
          ...ev,
          status: EventStatus.PAID,
          isCompleted: true
        };
      })
    );

    // 2. Atomic single-query update on backend (payUpTo)
    setIsUpdatingInstallments(true);
    try {
      await api.payUpTo({
        timelineId: targetTimelineId,
        date: targetDate,
        installmentNumber: targetInstNum,
        status: EventStatus.PAID
      });
      showToast(t('toast.payUpToSuccess', { count: eventsToPay.length }), 'success');
      await refreshTimelines();
    } catch (err) {
      console.error('Error paying up to here:', err);
      showToast(t('toast.payUpToError'), 'error');
    } finally {
      setIsUpdatingInstallments(false);
    }
  }, [activeTimeline, rawEvents, refreshTimelines, t]);

  // Save changes from EditInstallmentModal (amount, principalAmount, interestPortion, interestAmount, propagateForward)
  const handleSaveEditInstallment = async (installmentId, { status, amount, principalAmount, interestPortion, interestAmount, propagateForward }) => {
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

    const targetEv = updatedList.find((e) => e.id === installmentId);
    if (targetEv) {
      try {
        await api.updateEvent(installmentId, targetEv);
        await refreshTimelines();
      } catch (err) {
        console.error('Error updating installment:', err);
      }
    }
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
    if (!targetTimeline && isLoanTimelineType(activeTimeline?.type)) {
      targetTimeline = activeTimeline;
    }
    if (!targetTimeline) {
      targetTimeline = activeTimeboardTimelines.find((t) => isLoanTimelineType(t.type)) || activeTimeboardTimelines[0];
    }

    if (!targetTimeline) return;

    const loanName = targetTimeline.name || '';
    const targetDate = date || format(new Date(), 'yyyy-MM-dd');
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isFutureEvent = targetDate > todayStr;
    const isCompleted = !isFutureEvent && (status === EventStatus.AMORTIZED || status === EventStatus.PAID);

    const amortEvent = {
      id: generateUUID(),
      tenantId: DEFAULT_TENANT.id,
      timeboardId: activeTimeboardId,
      timelineId: targetTimeline.id,
      timelineOriginId: targetTimeline.id,
      timelineOriginName: loanName,
      timelineOriginColor: targetTimeline.color || TimelineColor.PRIMARY,
      description:
        notes ||
        (strategy === AmortizationStrategy.REDUCE_TERM
          ? 'Amortização extraordinária para redução do prazo.'
          : 'Amortização extraordinária para redução da parcela.'),
      date: targetDate,
      dayOfMonth: parseInt(targetDate.substring(8, 10), 10) || 15,
      time: '12:00',
      amount: amortVal,
      amortizationAmount: amortVal,
      category:
        strategy === AmortizationStrategy.REDUCE_INSTALLMENT
          ? AmortizationEventCategory.REDUCE_INSTALLMENT
          : AmortizationEventCategory.REDUCE_TERM,
      eventType: EventType.AMORTIZATION,
      isAmortization: true,
      isExpense: true,
      isIncome: false,
      isInvestment: false,
      isSystemLoanEvent: true,
      status: isCompleted ? EventStatus.AMORTIZED : EventStatus.PENDING,
      isCompleted: isCompleted,
      priority: EventPriority.HIGH,
      strategy:
        strategy === AmortizationStrategy.REDUCE_INSTALLMENT
          ? AmortizationStrategy.REDUCE_INSTALLMENT
          : AmortizationStrategy.REDUCE_TERM,
      amortizationStrategy:
        strategy === AmortizationStrategy.REDUCE_INSTALLMENT
          ? AmortizationStrategy.REDUCE_INSTALLMENT
          : AmortizationStrategy.REDUCE_TERM,
      notes: notes || '',
      labels: [
        'Amortização',
        strategy === AmortizationStrategy.REDUCE_TERM ? 'Redução Prazo' : 'Redução Parcela'
      ],
      version: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 1. Atualizar o estado local otimisticamente
    setRawEvents((prev) => {
      const filtered = prev.filter((e) => e.id !== amortEvent.id);
      return [amortEvent, ...filtered];
    });

    setEditingAmortization(null);

    // 2. Gravar apenas o registo do evento de amortização na base de dados
    try {
      await api.createEvent(amortEvent);
      showToast(t('toast.eventCreatedSuccess') || 'Evento de amortização registado com sucesso!', 'success');
      await refreshTimelines();
    } catch (err) {
      console.error('Error saving amortization event:', err);
      showToast('Erro ao guardar evento de amortização na base de dados.', 'error');
    }
  };

  return {
    handlePayUpToHere,
    handleSaveAmortization,
    handleSaveEditInstallment,
    handleToggleLoanPayment
  };
}
