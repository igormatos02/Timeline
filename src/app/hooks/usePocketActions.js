import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LoanAmortizationSystem, TimelineType, isLoanTimelineType, normalizeTimelineType } from '../../enums/index.js';
import * as api from '../../services/api';
import { recalculateLoanState } from '../../utils/loanCalculations';
import { format } from 'date-fns';
import { computeBalanceTotals, computePocketsInitialTotal } from '../../utils/balanceMetrics.js';

// Extracted from App.jsx (App).
export function usePocketActions({
  activeTimeboard,
  activeTimeboardTimelines,
  activeTimeline,
  isIndividualRole,
  rawEvents,
  refreshTimelines,
  showToast,
  t
}) {
  const [pockets, setPockets] = useState([]);
  const [isPocketModalOpen, setIsPocketModalOpen] = useState(false);
  const [selectedPocketForEdit, setSelectedPocketForEdit] = useState(null);
  const [deletingPocket, setDeletingPocket] = useState(null);

  const investmentTimeline = useMemo(() => {
    return (activeTimeboardTimelines || []).find(
      (tl) => normalizeTimelineType(tl?.type) === TimelineType.INVESTMENT
    );
  }, [activeTimeboardTimelines]);

  const loadPockets = useCallback(async () => {
    const targetTimelineId = (normalizeTimelineType(activeTimeline?.type) === TimelineType.INVESTMENT)
      ? activeTimeline?.id
      : investmentTimeline?.id;

    if (!targetTimelineId && !activeTimeboard?.id) {
      setPockets([]);
      return;
    }

    try {
      const params = targetTimelineId
        ? { timelineId: targetTimelineId }
        : { timeboardId: activeTimeboard.id };
      const res = await api.getPockets(params);
      if (Array.isArray(res)) {
        setPockets(res);
      } else if (res && Array.isArray(res.data)) {
        setPockets(res.data);
      }
    } catch (err) {
      console.error('Error loading pockets:', err);
    }
  }, [activeTimeline?.id, activeTimeline?.type, investmentTimeline?.id, activeTimeboard?.id]);

  useEffect(() => {
    if (activeTimeboard?.id) {
      loadPockets();
    } else {
      setPockets([]);
    }
  }, [activeTimeboard?.id, investmentTimeline?.id, loadPockets]);

  // Timeboard balance summary for individual-role users (their displayEvents only hold their own
  // obligations, so the totals are computed from all timeboard events, like the balance header does).
  const timeboardSummary = React.useMemo(() => {
    if (!isIndividualRole) return null;
    const timelinesList = activeTimeboardTimelines || [];
    const balanceTimeline = timelinesList.find((tl) => normalizeTimelineType(tl?.type) === TimelineType.BALANCE);
    const incomeTimeline = timelinesList.find((tl) => normalizeTimelineType(tl?.type) === TimelineType.INCOME);

    const timelineTypeMap = new Map(timelinesList.filter((tl) => tl?.id).map((tl) => [String(tl.id), tl.type]));
    let events = (rawEvents || []).filter((ev) => {
      if (!ev || !ev.id) return false;
      const tlId = ev.timelineId || ev.timelineOriginId || ev.timeline_id;
      return (tlId && timelineTypeMap.has(String(tlId))) || Boolean(ev.pocketId || ev.pocket_id);
    });
    timelinesList.filter((tl) => isLoanTimelineType(tl.type)).forEach((loanTl) => {
      events = recalculateLoanState({
        ...loanTl,
        system: loanTl.system || loanTl.amortizationSystem || loanTl.loanContract?.system || loanTl.loanContract?.amortizationSystem || LoanAmortizationSystem.PRICE,
        amortizationSystem: loanTl.system || loanTl.amortizationSystem || loanTl.loanContract?.system || loanTl.loanContract?.amortizationSystem || LoanAmortizationSystem.PRICE
      }, events);
    });

    const rawComputeStart = activeTimeboard?.computeFrom || activeTimeboard?.compute_from ||
      balanceTimeline?.computeFrom || balanceTimeline?.compute_from || balanceTimeline?.startDate || balanceTimeline?.start_date;
    const computeFromMonth = rawComputeStart && !String(rawComputeStart).startsWith('1900-01') && String(rawComputeStart) !== 'all'
      ? String(rawComputeStart).substring(0, 7)
      : '1900-01';
    const currentMonthStr = format(new Date(), 'yyyy-MM');

    const totals = computeBalanceTotals({
      events,
      timelineTypeMap,
      computeFromMonth,
      currentMonthStr,
      targetHorizonMonthStr: currentMonthStr
    });
    const incomeInitialValue = Number(incomeTimeline?.initialValue ?? incomeTimeline?.initial_value ?? 0);
    const pocketsInitial = computePocketsInitialTotal({ pockets, timelines: timelinesList, events });

    return {
      netBalance: incomeInitialValue + totals.realizedIncome - (totals.realizedExpenses + totals.realizedLoanPaid) - totals.realizedInvestmentsDeductions,
      savedBalance: totals.realizedInvestmentsTotal + pocketsInitial
    };
  }, [isIndividualRole, activeTimeboardTimelines, rawEvents, activeTimeboard, pockets]);

  const handleOpenCreatePocket = useCallback((pocket = null) => {
    setSelectedPocketForEdit(pocket);
    setIsPocketModalOpen(true);
  }, []);

  const handleSavePocket = async (payload, pocketId) => {
    try {
      if (pocketId) {
        await api.updatePocket(pocketId, payload);
      } else {
        await api.createPocket(payload);
      }
      await loadPockets();
      showToast(pocketId ? t('toast.pocketUpdatedSuccess') : t('toast.pocketCreatedSuccess'), 'success');
    } catch (err) {
      console.error('Error saving pocket:', err);
      showToast(err.message || t('toast.eventSaveError'), 'error');
      throw err;
    }
  };

  const handleRequestDeletePocket = useCallback((pocketOrId) => {
    if (!pocketOrId) return;
    if (typeof pocketOrId === 'object') {
      setDeletingPocket(pocketOrId);
    } else {
      const found = pockets.find((p) => p.id === pocketOrId) || { id: pocketOrId, name: 'Cofrinho' };
      setDeletingPocket(found);
    }
  }, [pockets]);

  const handleConfirmDeletePocket = async (pocketId) => {
    try {
      await api.deletePocket(pocketId);
      await loadPockets();
      await refreshTimelines();
      showToast(t('toast.pocketDeletedSuccess'), 'success');
    } catch (err) {
      console.error('Error deleting pocket:', err);
      showToast(err.message || t('toast.eventDeleteError'), 'error');
    } finally {
      setDeletingPocket(null);
    }
  };

  return {
    deletingPocket,
    handleConfirmDeletePocket,
    handleOpenCreatePocket,
    handleRequestDeletePocket,
    handleSavePocket,
    isPocketModalOpen,
    pockets,
    selectedPocketForEdit,
    setDeletingPocket,
    setIsPocketModalOpen,
    setSelectedPocketForEdit,
    timeboardSummary
  };
}
