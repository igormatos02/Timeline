import React, { useMemo } from 'react';
import { DiaryPublishStatus, EventStatus, EventType, LoanAmortizationSystem, PersonRole, TimeboardType, TimelineType, isWalletTimelineType, getDefaultTimelineColor, isCancelledStatus, isLoanTimelineType, isPositiveStatus, normalizeTimelineType } from '../../enums/index.js';
import { buildOutflowReferences, buildWithdrawalReferences } from '../../../shared/finance/references.js';
import { getLoanMetrics, recalculateLoanState } from '../../utils/loanCalculations';

// Extracted from App.jsx (App).
export function useBoardTimelineData({
  activeFinancialTab,
  activeTimeboardId,
  activeTimelineId,
  currentUserPerson,
  rawEvents,
  timeboards,
  timelines
}) {
  const activeTimeboard = timeboards.find((tb) => tb.id === activeTimeboardId) || timeboards[0];

  // All timelines belonging to active Timeboard
  const activeTimeboardTimelines = React.useMemo(() => {
    if (!activeTimeboardId || !Array.isArray(timelines)) return [];
    const filtered = timelines.filter((tl) => (tl.timeboardId || tl.timeboard_id) === activeTimeboardId);

    const typePriority = {
      [TimelineType.BALANCE]: 1,
      [TimelineType.INCOME]: 2,
      [TimelineType.WALLET]: 2,
      [TimelineType.EXPENSE]: 3,
      [TimelineType.INVESTMENT]: 4,
      [TimelineType.PROJECT]: 5,
      [TimelineType.REMINDER]: 6,
      [TimelineType.DIARY]: 7,
      [TimelineType.TODO]: 8,
      [TimelineType.FOLLOWUP]: 9
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

  // Savings withdrawals shown as income references in the income timeline (never persisted, never counted)
  const virtualWithdrawalEvents = useMemo(() => {
    if (!Array.isArray(rawEvents) || rawEvents.length === 0) return [];
    const incomeTimeline = (activeTimeboardTimelines || []).find((tl) => isWalletTimelineType(tl.type));
    return buildWithdrawalReferences({ events: rawEvents, incomeTimelineId: incomeTimeline?.id });
  }, [rawEvents, activeTimeboardTimelines]);

  // Users with the individual role only see their own obligations and the individual header
  const isIndividualRole = activeTimeboard?.role === PersonRole.INDIVIDUAL || currentUserPerson?.role === PersonRole.INDIVIDUAL;
  const individualEntityId = isIndividualRole ? (activeTimeboard?.personId || currentUserPerson?.id || null) : null;

  // Events used for display — rawEvents enriched with virtual withdrawal income events
  const displayEvents = useMemo(() => {
    let events = !virtualWithdrawalEvents.length ? rawEvents : [...rawEvents, ...virtualWithdrawalEvents];

    if (isIndividualRole) {
      const currentPersonId = activeTimeboard?.personId || currentUserPerson?.id;
      const currentObligatorId = (
        activeTimeboard?.obligatorIdentification ||
        currentUserPerson?.obligatorIdentification ||
        currentUserPerson?.obligator_identification ||
        ''
      ).trim().toLowerCase();

      // Shared notices: open reminders and all diary entries of the timeboard are visible to
      // individual users in whatever timeline they are viewing.
      const timelineTypeById = new Map((activeTimeboardTimelines || []).map((tl) => [String(tl.id), normalizeTimelineType(tl.type)]));
      const timelineColorById = new Map((activeTimeboardTimelines || []).map((tl) => [String(tl.id), tl.color || getDefaultTimelineColor(normalizeTimelineType(tl.type))]));
      const getNoticeType = (ev) => {
        const tlType = timelineTypeById.get(String(ev.timelineId || ev.timelineOriginId || ev.timeline_id || ''));
        if (ev.eventType === EventType.REGISTER || tlType === TimelineType.DIARY) return TimelineType.DIARY;
        if (ev.eventType === EventType.REMINDER || tlType === TimelineType.REMINDER) return TimelineType.REMINDER;
        return null;
      };
      const isOpenReminder = (ev) => (
        !ev.isDeleted &&
        ev.status !== EventStatus.DELETED &&
        !isCancelledStatus(ev.status) &&
        !isPositiveStatus(ev.status) &&
        !ev.isCompleted
      );
      const notices = [];

      events = events.filter((ev) => {
        if (!ev) return false;

        const noticeType = getNoticeType(ev);
        if (noticeType) {
          const isVisiblePost = noticeType === TimelineType.DIARY &&
            (activeTimeboard?.type !== TimeboardType.CONDOFLOW || ev.publishStatus === DiaryPublishStatus.PUBLISHED);
          if (isVisiblePost || (noticeType === TimelineType.REMINDER && isOpenReminder(ev))) {
            const noticeTimelineId = ev.timelineId || ev.timelineOriginId || ev.timeline_id;
            // Keep the color configured on the notice's own timeline (reminders / diary)
            const noticeColor = timelineColorById.get(String(noticeTimelineId)) || getDefaultTimelineColor(noticeType);
            notices.push({
              ...ev,
              isSharedNotice: true,
              timelineType: noticeType,
              noticeTimelineId,
              timelineOriginColor: noticeColor,
              timelineColor: noticeColor
            });
          }
          return false;
        }

        if (!ev.isObligation && !ev.is_obligation) return false;

        const evPersonId = ev.obligationPersonId || ev.obligation_person_id;
        if (currentPersonId && evPersonId && String(evPersonId) === String(currentPersonId)) {
          return true;
        }

        const evObligatorId = (
          ev.obligatorIdentification ||
          ev.obligator_identification ||
          ev.obligationPerson?.obligatorIdentification ||
          ev.obligationPerson?.obligator_identification ||
          ''
        ).trim().toLowerCase();

        if (currentObligatorId && evObligatorId && evObligatorId === currentObligatorId) {
          return true;
        }

        return false;
      });

      events = [...events, ...notices];
    }

    return events;
  }, [rawEvents, virtualWithdrawalEvents, activeTimeboard, activeTimeboardTimelines, currentUserPerson, isIndividualRole]);

  // Individual-role users only see the timelines they take part in (those holding their obligations)
  // The expense timeline is not shown when there is a wallet: its expenses are listed in the wallet (until the
  // database migration moves them) and in the outflows mode of the balance
  const visibleTimelines = React.useMemo(() => {
    const walletTimeline = activeTimeboardTimelines.find((tl) => isWalletTimelineType(tl.type));
    const isHiddenExpenseTimeline = (tl) => Boolean(walletTimeline) && normalizeTimelineType(tl.type) === TimelineType.EXPENSE;
    const boardTimelines = activeTimeboardTimelines.filter((tl) => !isHiddenExpenseTimeline(tl));
    if (!isIndividualRole) return boardTimelines;
    const hiddenIds = new Set(activeTimeboardTimelines.filter(isHiddenExpenseTimeline).map((tl) => String(tl.id)));
    const ownTimelineIds = new Set(
      (displayEvents || [])
        .filter((ev) => !ev.isSharedNotice)
        .map((ev) => String(ev.timelineId || ev.timeline_id || ''))
        .filter(Boolean)
        .map((id) => (hiddenIds.has(id) ? String(walletTimeline.id) : id))
    );
    return boardTimelines.filter((tl) => ownTimelineIds.has(String(tl.id)));
  }, [isIndividualRole, activeTimeboardTimelines, displayEvents]);

  // Board events with the loans recalculated and the outflow references added: they depend only on the
  // board's events and timelines, so switching timeline reuses them (and keeps the same array reference,
  // which lets the memoized lists of the timeline view skip their work)
  const boardEvents = React.useMemo(() => {
    let computedEvents = displayEvents || [];
    activeTimeboardTimelines.filter((tl) => isLoanTimelineType(tl.type)).forEach((loanTl) => {
      const system = loanTl.system || loanTl.amortizationSystem || loanTl.loanContract?.system || loanTl.loanContract?.amortizationSystem || LoanAmortizationSystem.PRICE;
      computedEvents = recalculateLoanState({ ...loanTl, system, amortizationSystem: system }, computedEvents);
    });

    // Outflows owned by the account (pocket expenses) and loans (paid installments) shown as references in
    // the Outflows timeline — after the loan recalculation, so installments carry their final amounts
    const expenseTimeline = activeTimeboardTimelines.find((tl) => tl.type === TimelineType.EXPENSE);
    if (expenseTimeline) {
      const timelineTypeMap = new Map(activeTimeboardTimelines.map((tl) => [String(tl.id), tl.type]));
      computedEvents = [
        ...computedEvents,
        ...buildOutflowReferences({ events: computedEvents, expenseTimelineId: expenseTimeline.id, timelineTypeMap })
      ];
    }
    return computedEvents;
  }, [activeTimeboardTimelines, displayEvents]);

  // Dynamic active timeline representation for the selected tab
  const activeTimeline = React.useMemo(() => {
    if (!activeTimeboard || visibleTimelines.length === 0) return null;

    const currentSelectedRaw = visibleTimelines.find(
      (tl) => tl.id === activeFinancialTab || tl.type === activeFinancialTab || tl.id === activeTimelineId || tl.type === activeTimelineId
    ) || visibleTimelines[0];

    const system = currentSelectedRaw.system || currentSelectedRaw.amortizationSystem || currentSelectedRaw.loanContract?.system || currentSelectedRaw.loanContract?.amortizationSystem || LoanAmortizationSystem.PRICE;
    const currentSelected = { ...currentSelectedRaw, system, amortizationSystem: system };
    const isLoanType = isLoanTimelineType(currentSelected?.type);

    // Shared notices (individual role) are shown as events of the timeline being viewed
    const hasSharedNotices = boardEvents.some((ev) => ev.isSharedNotice);
    const computedEvents = hasSharedNotices
      ? boardEvents.map((ev) => (ev.isSharedNotice
        ? { ...ev, timelineId: currentSelected.id, timelineOriginId: currentSelected.id, timeline_id: currentSelected.id }
        : ev))
      : boardEvents;

    const computedMetrics = isLoanType ? getLoanMetrics(currentSelected, computedEvents) : currentSelected?.loanHeaderResult;

    return {
      ...currentSelected,
      loanHeaderResult: computedMetrics,
      procedureMetrics: computedMetrics,
      timelines: visibleTimelines,
      // Every timeline of the board, hidden ones included
      boardTimelines: activeTimeboardTimelines,
      events: computedEvents
    };
  }, [activeTimeboard, activeTimeboardTimelines, visibleTimelines, activeFinancialTab, activeTimelineId, boardEvents]);

  return {
    activeTimeboard,
    activeTimeboardTimelines,
    activeTimeline,
    displayEvents,
    individualEntityId,
    isIndividualRole,
    visibleTimelines
  };
}
