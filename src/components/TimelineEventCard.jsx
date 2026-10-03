import React, { useState, useRef, useEffect, useMemo } from 'react';
import { EventCardProvider } from './event-card/EventCardContext.jsx';
import { hexToRgba } from './event-card/cardUtils.js';
import {
  CheckSquare,
  Calendar,
  BookOpen,
  CreditCard,
  DollarSign,
  PiggyBank,
  Landmark,
  Bell,
  ListTree,
  Lock,
  Wallet,
  ReceiptEuro
} from 'lucide-react';
import { isLoanInstallment as checkIsLoanInstallment, isAmortizationEvent as checkIsAmortizationEvent } from '../utils/loanCalculations';
import { format, parseISO, endOfMonth } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { generateUUID } from '../utils/uuid';
import {
  TimelineColor,
  EventType,
  TimelineType,
  isWalletTimelineType,
  EventStatus,
  FollowupStatus,
  EventRecurrence,
  DiaryPublishStatus,
  isAccountOutflowEvent,
  isPocketTransferEvent,
  isCancelledStatus,
  isPositiveStatus,
  isLoanTimelineType,
  normalizeTimelineType,
  normalizeRecurrence,
  getDefaultTimelineColor,
  MovementKind
} from '../enums/index.js';
import {
  INCOME_CATEGORY_META,
  EXPENSE_CATEGORY_META,
  INVESTMENT_CATEGORY_META,
  CONDO_INCOME_CATEGORY_META,
  CONDO_EXPENSE_CATEGORY_META,
  CONDO_INVESTMENT_CATEGORY_META
} from './event-modals/FinancialEventModalConfig.js';
import { getPaletteTheme, ColorPaletteId, COLOR_PALETTES } from '../../shared/config/colorPalettes.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import * as api from '../services/api.js';
import { createEventDayComparator, buildPersonsById } from '../utils/eventSorting.js';
import { usePermissions } from '../context/PermissionsContext.jsx';
import { useTimeboard, usePocketName } from '../context/TimeboardContext.jsx';
import { useEventActions } from '../context/EventActionsContext.jsx';
import { makeDiaryT } from '../utils/diaryLabels.js';
import { classifyMovement, getMovementStatusKey } from '../../shared/finance/movements.js';
import GenericEventBody from './event-card/GenericEventBody.jsx';
import FollowupEventBody from './event-card/FollowupEventBody.jsx';
import TodoEventBody from './event-card/TodoEventBody.jsx';
import DiaryEventBody from './event-card/DiaryEventBody.jsx';
import LoanInstallmentBody from './event-card/LoanInstallmentBody.jsx';
import AmortizationEventBody from './event-card/AmortizationEventBody.jsx';
import InvestmentEventBody from './event-card/InvestmentEventBody.jsx';
import ExpenseEventBody from './event-card/ExpenseEventBody.jsx';
import IncomeEventBody from './event-card/IncomeEventBody.jsx';
import BreakdownEditor from './event-card/BreakdownEditor.jsx';
import EventCardNotes from './event-card/EventCardNotes.jsx';



const TimelineEventInnerItem = React.memo(function TimelineEventInnerItem({
  event,
  allEvents = [],
  currentTimelineId,
  timelineType,
  activeFinancialTab = null,
  onEdit: onEditProp,
  onUpdateEventDirect: onUpdateEventDirectProp,
  onDelete: onDeleteProp,
  onToggleLoanPayment: onToggleLoanPaymentProp,
  onPayUpToHere: onPayUpToHereProp,
  onNavigateToTimeline,
  onPrintReceipt: onPrintReceiptProp,
  timelineColor,
  timelines = [],
  persons = []
}) {
  const { t } = useTranslation();
  // What the user can do on the card follows the role (shared/permissions.js): contributors only mark
  // movements as done (and add the payment date / receipt number), admins can also revert and delete
  // effective movements; individual members only view.
  const { isReadOnly, canEdit, canChangeStatus, canPrint, canOverride } = usePermissions();
  // Condominium timeboards do not use the diary mood
  const { isCondoflow } = useTimeboard();
  const pocketName = usePocketName();
  // References and other in-memory events (withdrawal income, outflows of other timelines) are read-only too
  const isInMemoryEvent = Boolean(event.isVirtual || event.isReadOnly);
  // A bank deposit shown in the wallet can be credited from there: its status changes the account movement
  const isDepositReference = Boolean(event.isReference && event.referenceKind === MovementKind.DEPOSIT_INTERNAL && event.referenceOriginId);
  const blocksChanges = !canEdit || isInMemoryEvent;
  const blocksStatusChanges = !canChangeStatus || (isInMemoryEvent && !isDepositReference);
  const onEdit = blocksChanges ? undefined : onEditProp;
  const onUpdateEventDirect = blocksChanges ? undefined : onUpdateEventDirectProp;
  const onSaveNotes = onUpdateEventDirectProp;
  const onDelete = blocksChanges ? undefined : onDeleteProp;
  const onToggleLoanPayment = blocksStatusChanges ? undefined : onToggleLoanPaymentProp;
  const onPayUpToHere = blocksStatusChanges ? undefined : onPayUpToHereProp;
  const onPrintReceipt = !canPrint || isInMemoryEvent ? undefined : onPrintReceiptProp;
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [isCancelConfirmOpen, setIsCancelConfirmOpen] = useState(false);
  const [isRevertConfirmOpen, setIsRevertConfirmOpen] = useState(false);
  // Payment date edited directly on the ticket (paid / received events)
  const { saveReceiptDate, saveReceiptNumber, getProposedReceiptNumber, addEventNote, deleteEventNote, correctEvent, currentUserId } = useEventActions();
  const [isReceiptDateOpen, setIsReceiptDateOpen] = useState(false);
  const [receiptDateDraft, setReceiptDateDraft] = useState(null);
  const [isSavingReceiptDate, setIsSavingReceiptDate] = useState(false);
  const [receiptDatePos, setReceiptDatePos] = useState(null);
  const receiptDateAnchorRef = useRef(null);
  const receiptDatePopoverRef = useRef(null);
  // Floating "add receipt number" popover on the ticket
  const [isReceiptNumberOpen, setIsReceiptNumberOpen] = useState(false);
  const [receiptNumberDraft, setReceiptNumberDraft] = useState('');
  const [receiptNumberError, setReceiptNumberError] = useState('');
  const [isSavingReceiptNumber, setIsSavingReceiptNumber] = useState(false);
  const [receiptNumberPos, setReceiptNumberPos] = useState(null);
  const receiptNumberAnchorRef = useRef(null);
  const receiptNumberPopoverRef = useRef(null);
  const [isCategoryPickerOpen, setIsCategoryPickerOpen] = useState(false);
  const [categoryPickerPos, setCategoryPickerPos] = useState(null);
  const categoryAnchorRef = useRef(null);
  const categoryPickerPopoverRef = useRef(null);
  const [newItemText, setNewItemText] = useState('');
  const [localAuto, setLocalAuto] = React.useState(Boolean(event.automatic || event.isAutomatic));
  const [localStatus, setLocalStatus] = React.useState(event.status);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isPayingUpToHere, setIsPayingUpToHere] = useState(false);

  const handleStatusToggle = React.useCallback(async (e, explicitStatus = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isTogglingStatus || !onToggleLoanPayment) return;
    // A cancelled event can never be reactivated
    if (isCancelledStatus(localStatus || event.status)) return;

    // Immediate 0ms visual feedback
    const isCurrPositive = isPositiveStatus(event.status) || event.status === FollowupStatus.FINISHED || Boolean(event.isCompleted);
    const isFinancialLocked = event.eventType === EventType.INCOME || event.eventType === EventType.EXPENSE || event.eventType === EventType.INVESTMENT;

    // If it's a positive financial event and no explicit status is passed (or attempting to revert to negative): block it
    if (isFinancialLocked && isCurrPositive && !explicitStatus) {
      return;
    }

    // Deposit reference: credits the account movement (the reference is rebuilt from it, no local status)
    if (isDepositReference) {
      // Only crediting is done from the wallet: other status changes belong to the account
      if (explicitStatus && !isPositiveStatus(explicitStatus)) return;
      setIsTogglingStatus(true);
      try {
        await onToggleLoanPayment(event.referenceOriginId, explicitStatus || EventStatus.INVESTED);
      } finally {
        setIsTogglingStatus(false);
      }
      return;
    }

    const nextStatus = explicitStatus || (isCurrPositive
      ? (event.eventType === EventType.INVESTMENT ? EventStatus.PLANNED : EventStatus.PENDING)
      : (event.eventType === EventType.INCOME ? EventStatus.RECEIVED : EventStatus.PAID));
    setLocalStatus(nextStatus);

    setIsTogglingStatus(true);
    try {
      await onToggleLoanPayment(event.id, nextStatus);
    } catch (err) {
      console.error('Error toggling status:', err);
      setLocalStatus(event.status);
    } finally {
      setIsTogglingStatus(false);
    }
  }, [event, localStatus, isTogglingStatus, onToggleLoanPayment, isDepositReference]);

  const handlePayUpToHereClick = React.useCallback(async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isPayingUpToHere || !onPayUpToHere) return;

    setIsPayingUpToHere(true);
    try {
      await onPayUpToHere(event);
    } catch (err) {
      console.error('Error paying up to here:', err);
    } finally {
      setIsPayingUpToHere(false);
    }
  }, [event, isPayingUpToHere, onPayUpToHere]);

  const isObligationEvent = Boolean(event.isObligation || event.is_obligation);
  const obligationPersonId = event.obligationPersonId || event.obligation_person_id;
  const obligationPerson = React.useMemo(() => {
    if (obligationPersonId && Array.isArray(persons) && persons.length > 0) {
      const matchInPersons = persons.find((p) => p.id === obligationPersonId);
      if (matchInPersons) return matchInPersons;
    }
    if (event.obligationPerson || event.obligation_person) {
      return event.obligationPerson || event.obligation_person;
    }
    if (isObligationEvent && obligationPersonId) {
      const tbId = event.timeboardId || event.timeboard_id;
      if (tbId) {
        const cached = api.getLocalPersons(tbId);
        const found = cached.find((p) => p.id === obligationPersonId);
        if (found) return found;
      }
    }
    return null;
  }, [persons, event.obligationPerson, event.obligation_person, isObligationEvent, obligationPersonId, event.timeboardId, event.timeboard_id]);

  React.useEffect(() => {
    setLocalAuto(Boolean(event.automatic || event.isAutomatic));
    setLocalStatus(event.status);
  }, [event.automatic, event.isAutomatic, event.status]);

  const isBalanceView = timelineType === TimelineType.BALANCE || currentTimelineId === 'balance';
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentMonthEndStr = format(endOfMonth(now), 'yyyy-MM-dd');

  const effectiveStatus = (localStatus || event.status || '').toLowerCase();
  const isAmortization = checkIsAmortizationEvent(event);
  const isVirtual = Boolean(event.isVirtual || event.isReadOnly);
  const isVirtualWithdrawal = Boolean(event.isVirtualWithdrawal || (isVirtual && event.id && String(event.id).startsWith('virtual_withdrawal_')));
  const cleanVirtualWithdrawalReason = useMemo(() => {
    if (!isVirtualWithdrawal) return '';
    let raw = (event.title || event.name || '').trim();
    raw = raw
      .replace(/^Retirada da Poupança\s*(?:\((.*)\))?$/i, '$1')
      .replace(/^Savings Withdrawal\s*(?:\((.*)\))?$/i, '$1')
      .replace(/^(?:Retirada|Withdrawal):\s*/i, '')
      .replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')
      .trim();
    if (!raw || raw === t('withdrawalModal.savingsWithdrawalTitle')) return '';
    return raw;
  }, [isVirtualWithdrawal, event.title, event.name, t]);

  const virtualWithdrawalDisplayTitle = useMemo(() => {
    if (!isVirtualWithdrawal) return '';
    return cleanVirtualWithdrawalReason
      ? t('withdrawalModal.savingsWithdrawalWithReason', { reason: cleanVirtualWithdrawalReason })
      : t('withdrawalModal.savingsWithdrawalTitle');
  }, [isVirtualWithdrawal, cleanVirtualWithdrawalReason, t]);
  // Balance view: money that only moves between the wallet and the bank (deposit / withdrawal to the wallet)
  // is one movement with two ends — shown as "wallet -X -> account +X", never as an income or an expense
  const walletBankTransfer = useMemo(() => {
    if (!isBalanceView || event.isReference) return null;
    const timelineTypeMap = new Map((timelines || []).map((tl) => [String(tl.id), tl.type]));
    const { kind, isExternal } = classifyMovement(event, timelineTypeMap);
    const isDeposit = kind === MovementKind.DEPOSIT_INTERNAL;
    if (!isDeposit && !(kind === MovementKind.WITHDRAWAL && !isExternal)) return null;
    const accountId = String(event.timelineId || event.timeline_id || event.timelineOriginId || '');
    const account = (timelines || []).find((tl) => String(tl.id) === accountId);
    const wallet = (timelines || []).find((tl) => isWalletTimelineType(normalizeTimelineType(tl.type)));
    const walletName = wallet?.title || wallet?.name || t('flow.wallet');
    const accountName = account?.title || account?.name || t('flow.account');
    return isDeposit
      ? { fromName: walletName, toName: accountName }
      : { fromName: accountName, toName: walletName };
  }, [isBalanceView, event, timelines, t]);

  // Outflow owned by another timeline (pocket expense, paid installment) shown as a reference in the Outflows timeline
  const isOutflowReference = Boolean(event.isReference && event.referenceKind);
  const outflowReferenceInfo = useMemo(() => {
    if (!isOutflowReference) return null;
    const originTimeline = (timelines || []).find((tl) => String(tl.id) === String(event.referenceOriginTimelineId));
    const labelKey = {
      [MovementKind.SAVINGS_EXPENSE]: 'outflowReference.savings',
      [MovementKind.LOAN_INSTALLMENT]: 'outflowReference.installment',
      [MovementKind.AMORTIZATION]: 'outflowReference.amortization',
      [MovementKind.DEPOSIT_INTERNAL]: 'outflowReference.bankDeposit'
    }[event.referenceKind] || 'outflowReference.savings';
    return {
      label: t(labelKey),
      originId: originTimeline?.id || event.referenceOriginTimelineId,
      originName: originTimeline?.name || t('outflowReference.origin'),
      color: originTimeline?.color || getDefaultTimelineColor(normalizeTimelineType(originTimeline?.type)),
      Icon: event.referenceKind === MovementKind.SAVINGS_EXPENSE ? PiggyBank : Landmark
    };
  }, [isOutflowReference, timelines, event.referenceOriginTimelineId, event.referenceKind, t]);
  const openOutflowReferenceOrigin = (e) => {
    e?.stopPropagation?.();
    // Same as the sidebar: the origin timeline becomes both the active timeline and the active tab
    if (outflowReferenceInfo?.originId && onNavigateToTimeline) onNavigateToTimeline(outflowReferenceInfo.originId, outflowReferenceInfo.originId);
  };

  const isLoanInstallment =
    checkIsLoanInstallment(event) ||
    Boolean(event.isSystemLoanEvent && !isAmortization) ||
    Boolean(event.installmentNumber || event.installment_number) ||
    Boolean(currentTimelineId && String(currentTimelineId).includes('loan')) ||
    Boolean(event.timelineId && String(event.timelineId).includes('loan'));
  const isDiaryTimeline = timelineType === TimelineType.DIARY;
  const isRegisterEvent =
    isDiaryTimeline ||
    event.eventType === EventType.REGISTER ||
    event.timelineType === TimelineType.DIARY ||
    event.timeline_type === TimelineType.DIARY ||
    event.category === 'diary' ||
    event.category === 'mood_great' ||
    event.category === 'mood_good' ||
    event.category === 'mood_neutral' ||
    event.category === 'mood_bad' ||
    event.category === 'mood_terrible';
  // Condominium (condoflow) diary entries are "posts" with a publication state
  const isCondoPost = isCondoflow && isRegisterEvent;
  const postPublishStatus = event.publishStatus || DiaryPublishStatus.UNPUBLISHED;
  const isCancelledPost = isCondoPost && postPublishStatus === DiaryPublishStatus.CANCELLED;
  const setPostPublishStatus = (e, nextStatus) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (onUpdateEventDirect) onUpdateEventDirect({ ...event, publishStatus: nextStatus });
  };

  const isTodoTimeline = timelineType === TimelineType.TODO;
  const isTodoEvent =
    isTodoTimeline ||
    event.eventType === EventType.TODO ||
    event.timelineType === TimelineType.TODO ||
    event.timeline_type === TimelineType.TODO ||
    event.category === 'tarefa' ||
    event.category === 'todo';

  const isReminderTimeline = timelineType === TimelineType.REMINDER;
  const isReminderEvent =
    isReminderTimeline ||
    event.eventType === EventType.REMINDER ||
    event.timelineType === TimelineType.REMINDER ||
    event.timeline_type === TimelineType.REMINDER ||
    event.category === 'reminder';

  const isFollowupTimeline = timelineType === TimelineType.FOLLOWUP;
  const isFollowupEvent =
    isFollowupTimeline ||
    event.eventType === EventType.FOLLOWUP ||
    event.timelineType === TimelineType.FOLLOWUP ||
    event.timeline_type === TimelineType.FOLLOWUP ||
    event.category === 'followup';

  // Account outflows that stay in the account (pocket cost / expense) are not withdrawals
  const isAccountOutflow = isAccountOutflowEvent(event);
  // Transfer between two spaces of the account: shown as "General → Roof", without a sign
  const isTransferEvent = isPocketTransferEvent(event);
  const isWithdrawalEvent = !isAccountOutflow && !isTransferEvent && Boolean(
    event.eventType === EventType.WITHDRAWAL ||
    event.isWithdrawal ||
    (event.pocketId && Number(event.amount || 0) < 0)
  );
  // Events that take money out of a pocket (shown with a minus sign)
  const isPocketOutflowEvent = isWithdrawalEvent || isAccountOutflow;
  // Uniform status word of the movement once effective (deposited, credited, withdrawn, paid…)
  const effectiveStatusKey = getMovementStatusKey({ ...event, status: EventStatus.PAID });

  const isIncomeEvent = event.eventType === EventType.INCOME && !isRegisterEvent && !isTodoEvent && !isReminderEvent && !isFollowupEvent;
  const isExpenseEvent = (event.eventType === EventType.EXPENSE || Boolean(event.isExpense)) && !isRegisterEvent && !isTodoEvent && !isReminderEvent && !isFollowupEvent;
  const isInvestmentEvent = (event.eventType === EventType.INVESTMENT || isPocketOutflowEvent || isTransferEvent) && !isRegisterEvent && !isTodoEvent && !isReminderEvent && !isFollowupEvent;

  const baseItemColor = useMemo(() => {
    if (isWithdrawalEvent) {
      const incomeTimeline = (timelines || []).find((t) => isWalletTimelineType(t?.type));
      if (incomeTimeline?.color) {
        return incomeTimeline.color;
      }
      const incomeEvent = (allEvents || []).find((e) => e.eventType === EventType.INCOME && e.timelineColor);
      if (incomeEvent?.timelineColor) {
        return incomeEvent.timelineColor;
      }
      return COLOR_PALETTES[ColorPaletteId.LIGHT_BLUE]?.shades?.SHADE_1 || COLOR_PALETTES[ColorPaletteId.LIGHT_BLUE]?.colors[0];
    }

    if (isExpenseEvent || event.timelineType === TimelineType.EXPENSE || event.eventType === EventType.EXPENSE || Boolean(event.isExpense)) {
      const expenseTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.EXPENSE);
      if (expenseTl?.color) return expenseTl.color;
      return TimelineColor.EXPENSE;
    }

    const explicitOriginColor = event.timelineOriginColor || (event.timelineOriginId && event.timelineColor);
    if (explicitOriginColor) {
      return explicitOriginColor;
    }

    const originTimelineId = event.timelineOriginId || event.timelineId || event.timeline_id;
    if (originTimelineId && timelines && timelines.length > 0) {
      const matchedTimeline = timelines.find((t) => t.id === originTimelineId && normalizeTimelineType(t.type) !== TimelineType.BALANCE);
      if (matchedTimeline?.color) {
        return matchedTimeline.color;
      }
    }

    if (isBalanceView) {
      if (isIncomeEvent || isWalletTimelineType(event.timelineType) || event.eventType === EventType.INCOME) {
        const incomeTl = (timelines || []).find((t) => isWalletTimelineType(t?.type));
        if (incomeTl?.color) return incomeTl.color;
        return TimelineColor.INCOME;
      }
      if (isInvestmentEvent || event.timelineType === TimelineType.INVESTMENT || event.eventType === EventType.INVESTMENT) {
        const investTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.INVESTMENT);
        if (investTl?.color) return investTl.color;
        return TimelineColor.INVESTMENT;
      }
      if (isLoanInstallment || isLoanTimelineType(event.timelineType) || isLoanTimelineType(event.timeline_type) || isLoanTimelineType(event.eventType)) {
        const loanTl = (timelines || []).find((t) => isLoanTimelineType(t?.type));
        if (loanTl?.color) return loanTl.color;
        return TimelineColor.LOAN;
      }
      if (isReminderEvent || event.timelineType === TimelineType.REMINDER || event.eventType === EventType.REMINDER) {
        const reminderTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.REMINDER);
        if (reminderTl?.color) return reminderTl.color;
        return TimelineColor.REMINDER;
      }
      if (isTodoEvent || event.timelineType === TimelineType.TODO || event.eventType === EventType.TODO) {
        const todoTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.TODO);
        if (todoTl?.color) return todoTl.color;
        return TimelineColor.TODO;
      }
      if (isFollowupEvent || event.timelineType === TimelineType.FOLLOWUP || event.eventType === EventType.FOLLOWUP) {
        const followupTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.FOLLOWUP);
        if (followupTl?.color) return followupTl.color;
        return TimelineColor.FOLLOWUP;
      }
      if (isRegisterEvent || event.timelineType === TimelineType.DIARY || event.eventType === EventType.REGISTER) {
        const diaryTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.DIARY);
        if (diaryTl?.color) return diaryTl.color;
        return TimelineColor.DIARY;
      }
    }

    return event.timelineColor || timelineColor || (event.timelineOriginId ? event.timelineColor : null) || TimelineColor.PRIMARY;
  }, [
    isWithdrawalEvent,
    event,
    timelines,
    allEvents,
    isBalanceView,
    timelineColor,
    isIncomeEvent,
    isExpenseEvent,
    isInvestmentEvent,
    isLoanInstallment,
    isReminderEvent,
    isTodoEvent,
    isFollowupEvent,
    isRegisterEvent
  ]);

  const paletteTheme = useMemo(() => {
    return getPaletteTheme(baseItemColor, TimelineColor.PRIMARY);
  }, [baseItemColor]);

  const normRec = normalizeRecurrence(event);
  const isRecurringEvent = (
    normRec === EventRecurrence.RECURRING ||
    normRec === EventRecurrence.LIMITED ||
    Boolean(event.seriesId) ||
    isLoanInstallment
  ) && normRec !== EventRecurrence.ONCE;

  // Future months lock the status, except income / expense / investment events, which can be paid in advance
  const isFutureMonth = Boolean(event.date && event.date > currentMonthEndStr) && !isIncomeEvent && !isExpenseEvent && !isInvestmentEvent;

  const isCancelled = isCancelledStatus(effectiveStatus) || isCancelledStatus(event.status);

  const isAnchorCard = isFollowupEvent && Boolean(event.position === 0 || event.isReadOnly || event.isAnchorVisible);

  const isFollowupFinished = isFollowupEvent && (
    effectiveStatus === FollowupStatus.FINISHED ||
    effectiveStatus === 'finished' ||
    event.status === FollowupStatus.FINISHED ||
    event.status === 'finished' ||
    Boolean(event.isFinished)
  );

  const isCompleted = !isCancelled && (
    (isFollowupEvent && isFollowupFinished) ||
    (!isFollowupEvent && (
      effectiveStatus === EventStatus.PAID ||
      effectiveStatus === EventStatus.RECEIVED ||
      effectiveStatus === EventStatus.INVESTED ||
      effectiveStatus === EventStatus.WITHDRAWN ||
      effectiveStatus === EventStatus.SETTLED ||
      effectiveStatus === EventStatus.COMPLETED ||
      effectiveStatus === EventStatus.AMORTIZED ||
      effectiveStatus === EventStatus.CLOSED ||
      effectiveStatus === EventStatus.FINISHED
    ))
  );

  const isOverdue = Boolean(
    event.date &&
    event.date < todayStr &&
    !isCompleted &&
    !isCancelled &&
    effectiveStatus !== EventStatus.DELETED
  );

  const isClosedReminder = isReminderEvent && isCompleted && !isCancelled;
  const isOverdueReminder = isReminderEvent && isOverdue && !isCancelled;

  const isReceivedIncome = isIncomeEvent && isCompleted && !isCancelled;
  const isOverdueIncome = isIncomeEvent && isOverdue && !isCancelled;

  const isPaidExpense = isExpenseEvent && isCompleted && !isCancelled;
  const isOverdueExpense = isExpenseEvent && isOverdue && !isCancelled;

  const isCompletedInvestment = isInvestmentEvent && isCompleted && !isCancelled;
  const isOverdueInvestment = isInvestmentEvent && isOverdue && !isCancelled;

  const isPaidLoan = isLoanInstallment && !isCancelled && (effectiveStatus === EventStatus.PAID || effectiveStatus === EventStatus.SETTLED || effectiveStatus === EventStatus.COMPLETED || effectiveStatus === EventStatus.AMORTIZED);
  const isOverdueLoan = isLoanInstallment && !isCancelled && (isOverdue || effectiveStatus === EventStatus.OVERDUE);
  const isAmortized = isLoanInstallment && !isCancelled && effectiveStatus === EventStatus.AMORTIZED;

  const isFlatPositive = !isCancelled && (
    isAnchorCard ||
    isAmortization ||
    isReceivedIncome ||
    isPaidExpense ||
    isCompletedInvestment ||
    isPaidLoan ||
    (isTodoEvent && isCompleted) ||
    (isFollowupEvent && isCompleted) ||
    (isReminderEvent && isCompleted)
  );

  const isFinancialLockedType = isIncomeEvent || isExpenseEvent || isInvestmentEvent;
  const isLockedPositive = isFinancialLockedType && (isReceivedIncome || isPaidExpense || isCompletedInvestment || isPositiveStatus(effectiveStatus));

  // Comments of financial events and reminders are stored per occurrence (year / month), so they
  // are not propagated to the other months of a recurring event. Todo / follow-up / diary items keep
  // their notes on the item itself.
  const usesOccurrenceNotes = Boolean(addEventNote) && !isTodoEvent && !isFollowupEvent && !isRegisterEvent && !isVirtual;
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Normalized list: { key, content, noteId?, authorId?, authorName?, createdAt? }
  const getCardNotes = () => {
    if (usesOccurrenceNotes) {
      return (Array.isArray(event.monthNotes) ? event.monthNotes : [])
        .filter((n) => n && n.content)
        .map((n) => ({ key: n.id, noteId: n.id, content: n.content, authorId: n.authorId, authorName: n.authorName, createdAt: n.createdAt }));
    }
    const legacy = Array.isArray(event.notes)
      ? event.notes.filter(Boolean)
      : (event.description && !event.description.toLowerCase().includes('transferência bancária de vencimento') && event.description.trim() ? [event.description.trim()] : []);
    return legacy.map((content, idx) => ({ key: `legacy-${idx}`, content }));
  };

  const canAddNote = usesOccurrenceNotes || Boolean(onSaveNotes);
  const canDeleteNote = (note) => {
    if (usesOccurrenceNotes) {
      return canEdit || (currentUserId && String(note.authorId) === String(currentUserId));
    }
    return Boolean(onUpdateEventDirect || onEdit);
  };

  const addCardNote = async (text) => {
    const content = text.trim();
    if (!content) return false;
    if (usesOccurrenceNotes) {
      setIsSavingNote(true);
      const ok = await addEventNote(event, content);
      setIsSavingNote(false);
      return ok;
    }
    const updatedNotes = [...getCardNotes().map((n) => n.content), content];
    onSaveNotes({ ...event, notes: updatedNotes, description: updatedNotes[0] || '' });
    return true;
  };

  const removeCardNote = (note, idx) => {
    if (usesOccurrenceNotes) {
      deleteEventNote(event, note.noteId);
      return;
    }
    const updatedNotes = getCardNotes().map((n) => n.content).filter((_, nIdx) => nIdx !== idx);
    if (onUpdateEventDirect) {
      onUpdateEventDirect({ ...event, notes: updatedNotes, description: updatedNotes[0] || '' });
    }
  };

  // Category sources of the event's type: [metaMap, labelNamespace]
  // (condoflow timeboards use their own income / expense / deposit categories)
  const getCategorySources = () => (
    isIncomeEvent
      ? [[isCondoflow ? CONDO_INCOME_CATEGORY_META : null, 'incomeCategories'], [INCOME_CATEGORY_META, 'incomeCategories']]
      : isExpenseEvent
        ? (isCondoflow ? [[CONDO_EXPENSE_CATEGORY_META, 'condoExpenseCategories']] : [[EXPENSE_CATEGORY_META, 'expenseCategories']])
        : event.eventType === EventType.POCKET_EXPENSE
          // Pocket expenses use the expense categories
          ? (isCondoflow ? [[CONDO_EXPENSE_CATEGORY_META, 'condoExpenseCategories']] : [[EXPENSE_CATEGORY_META, 'expenseCategories']])
          : isInvestmentEvent && !isPocketOutflowEvent && !isTransferEvent
            ? [[isCondoflow ? CONDO_INVESTMENT_CATEGORY_META : null, 'investmentCategories'], [INVESTMENT_CATEGORY_META, 'investmentCategories']]
            : []
  ).filter(([metaMap]) => metaMap);

  // The category can be changed from the badge when the event can be edited in place
  const canChangeCategory = Boolean(onUpdateEventDirect) && !isCancelledStatus(event.status);

  const saveCategory = (nextCategory) => {
    setIsCategoryPickerOpen(false);
    if (!onUpdateEventDirect || nextCategory === String(event.category || '').toLowerCase().trim()) return;
    onUpdateEventDirect({ ...event, category: nextCategory });
  };





  const canEditPaymentDate = Boolean(saveReceiptDate) && canChangeStatus && isCompleted && !isCancelled && !isVirtual;

  // Close the floating payment-date popover on outside click, Escape or scroll (it is anchored to the date)
  useEffect(() => {
    if (!isReceiptDateOpen) return undefined;
    const handleMouseDown = (e) => {
      if (receiptDatePopoverRef.current?.contains(e.target) || receiptDateAnchorRef.current?.contains(e.target)) return;
      setIsReceiptDateOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsReceiptDateOpen(false);
    };
    const handleScroll = (e) => {
      if (receiptDatePopoverRef.current?.contains(e.target)) return;
      setIsReceiptDateOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isReceiptDateOpen]);

  // Close the floating category picker on outside click, Escape or scroll
  useEffect(() => {
    if (!isCategoryPickerOpen) return undefined;
    const handleMouseDown = (e) => {
      if (categoryPickerPopoverRef.current?.contains(e.target) || categoryAnchorRef.current?.contains(e.target)) return;
      setIsCategoryPickerOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsCategoryPickerOpen(false);
    };
    const handleScroll = (e) => {
      if (categoryPickerPopoverRef.current?.contains(e.target)) return;
      setIsCategoryPickerOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isCategoryPickerOpen]);

  // Close the floating receipt-number popover on outside click, Escape or scroll
  useEffect(() => {
    if (!isReceiptNumberOpen) return undefined;
    const handleMouseDown = (e) => {
      if (receiptNumberPopoverRef.current?.contains(e.target) || receiptNumberAnchorRef.current?.contains(e.target)) return;
      setIsReceiptNumberOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === 'Escape') setIsReceiptNumberOpen(false);
    };
    const handleScroll = (e) => {
      if (receiptNumberPopoverRef.current?.contains(e.target)) return;
      setIsReceiptNumberOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', handleScroll, true);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, [isReceiptNumberOpen]);

  const saveReceiptNumberDraft = async () => {
    if (isSavingReceiptNumber || !saveReceiptNumber) return;
    setIsSavingReceiptNumber(true);
    const result = await saveReceiptNumber(event, receiptNumberDraft);
    setIsSavingReceiptNumber(false);
    if (result?.error) {
      setReceiptNumberError(result.error);
      return;
    }
    setIsReceiptNumberOpen(false);
  };


  const saveReceiptDateDraft = async () => {
    if (!receiptDateDraft || isSavingReceiptDate) return;
    setIsSavingReceiptDate(true);
    const ok = await saveReceiptDate(event, receiptDateDraft);
    setIsSavingReceiptDate(false);
    if (ok) setIsReceiptDateOpen(false);
  };


  // Removes lock icons from a status label (read-only users see the status as a plain indicator)
  const stripLockIcons = (node) => React.Children.map(node, (child) => {
    if (!React.isValidElement(child)) return child;
    if (child.type === Lock) return null;
    if (child.props && child.props.children !== undefined) {
      return React.cloneElement(child, undefined, stripLockIcons(child.props.children));
    }
    return child;
  });


  const abatedBreakdown = React.useMemo(() => {
    if (!isAmortized) return null;

    let origCapital = Number(
      event.originalInstallmentCapital ??
      event.originalCapital ??
      event.principalAmount ??
      0
    );
    let origInterest = Number(
      event.originalInstallmentInterest ??
      event.originalInterest ??
      event.savedInterest ??
      event.interestPortion ??
      event.interestAmount ??
      0
    );
    let origFee = Number(
      event.originalInstallmentFee ??
      event.installmentFee ??
      event.taxAmount ??
      0
    );
    let origTotal = Number(
      event.originalInstallmentAmount ??
      event.originalAmount ??
      0
    );

    // If values were not stored directly, extract them from description
    if ((!origCapital || !origInterest) && event.description) {
      const match = event.description.match(/([\d\s.,]+)\s*€?\s*capital\s*\+\s*([\d\s.,]+)\s*€?\s*(?:interest|juros)/i);
      if (match && match[1] && match[2]) {
        const parsedCap = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
        const parsedInt = parseFloat(match[2].replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(parsedCap) && parsedCap > 0) origCapital = parsedCap;
        if (!isNaN(parsedInt) && parsedInt > 0) origInterest = parsedInt;
      }
    }

    if (!origTotal) {
      origTotal = origCapital + origInterest + origFee;
    }

    return { origTotal, origCapital, origInterest, origFee };
  }, [
    isAmortized,
    event.originalInstallmentCapital,
    event.originalCapital,
    event.principalAmount,
    event.originalInstallmentInterest,
    event.originalInterest,
    event.savedInterest,
    event.interestPortion,
    event.interestAmount,
    event.originalInstallmentFee,
    event.installmentFee,
    event.taxAmount,
    event.originalInstallmentAmount,
    event.originalAmount,
    event.description
  ]);

  const reducedBreakdown = React.useMemo(() => {
    if (isAmortized) return null;
    const currentTotal = Number(event.installmentAmount ?? event.amount ?? 0);
    const origTotal = Number(event.originalInstallmentAmount ?? event.originalAmount ?? 0);
    const origCap = Number(event.originalInstallmentCapital ?? event.originalCapital ?? 0);
    const currentCap = Number(event.installmentCapital ?? event.principalAmount ?? event.principal_amount ?? 0);

    const isReduced =
      origTotal > 0 &&
      currentTotal > 0 &&
      origTotal > currentTotal + 0.01;

    if (!isReduced) return null;

    const amortizedAmount = Math.max(0, Math.round((origTotal - currentTotal) * 100) / 100);
    const amortizedCapital = origCap > currentCap ? Math.max(0, Math.round((origCap - currentCap) * 100) / 100) : amortizedAmount;

    return {
      isReduced: true,
      origTotal,
      currentTotal,
      amortizedAmount,
      amortizedCapital
    };
  }, [
    isAmortized,
    event.installmentAmount,
    event.amount,
    event.originalInstallmentAmount,
    event.originalAmount,
    event.originalInstallmentCapital,
    event.originalCapital,
    event.installmentCapital,
    event.principalAmount,
    event.principal_amount
  ]);

  const [isEditingAmount, setIsEditingAmount] = useState(false);
  // Pocket outflows are stored as negative amounts but edited as positive values
  const editableAmount = event.amount !== undefined ? (isPocketOutflowEvent ? Math.abs(Number(event.amount)) : event.amount) : '';
  const [tempAmount, setTempAmount] = useState(editableAmount);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(event.title || '');
  const [propagateSubsequent, setPropagateSubsequent] = useState(true);
  const [isDesmembramentoExpanded, setIsDesmembramentoExpanded] = useState(false);
  const [draftSubparts, setDraftSubparts] = useState([]);
  const [newSubpartName, setNewSubpartName] = useState('');
  const [newSubpartAmount, setNewSubpartAmount] = useState('');
  const [editingSubpartIdx, setEditingSubpartIdx] = useState(null);




  const hasBreakdown = Array.isArray(event.breakdownItems) && event.breakdownItems.length > 0;

  React.useEffect(() => {
    setTempAmount(editableAmount);
  }, [event.amount]);

  React.useEffect(() => {
    setTempTitle(event.title || '');
  }, [event.title]);

  const canEditAmount = true;

  const isRecurring = (
    normRec === EventRecurrence.RECURRING ||
    normRec === EventRecurrence.LIMITED ||
    Boolean(event.seriesId)
  ) && normRec !== EventRecurrence.ONCE;

  const handleSaveAmount = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const num = Number(tempAmount);
    if (!isNaN(num) && num >= 0 && onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        amount: isPocketOutflowEvent ? -num : num,
        propagateForward: isRecurring ? propagateSubsequent : false
      });
    }
    setIsEditingAmount(false);
  };

  const handleCancelAmount = (e) => {
    if (e) e.stopPropagation();
    setTempAmount(editableAmount);
    setIsEditingAmount(false);
  };

  // Handlers para edição inline do Título / Nome
  const handleSaveTitle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== event.title && onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        previousTitle: event.title,
        name: trimmed,
        title: trimmed,
        propagateForward: isRecurring,
        updateAllRecurring: isRecurring,
        updateScope: isRecurring ? 'subsequent' : 'single'
      });
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = (e) => {
    if (e) e.stopPropagation();
    setTempTitle(event.title || '');
    setIsEditingTitle(false);
  };

  // Abrir o painel de desmembramento carregando o estado de rascunho
  const openDesmembramento = (e) => {
    if (e) e.stopPropagation();
    const existing = event.breakdownItems ? JSON.parse(JSON.stringify(event.breakdownItems)) : [];
    setDraftSubparts(existing);
    setNewSubpartName('');
    setNewSubpartAmount(existing.length > 0 ? '' : (event.amount !== undefined ? event.amount.toString() : ''));
    setIsEditingAmount(false);
    setIsDesmembramentoExpanded(true);
  };

  // Salvar desmembramento definitivamente
  const handleSaveDesmembramento = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let finalItems = [...draftSubparts];
    if (newSubpartName.trim()) {
      const amt = Number(newSubpartAmount) || 0;
      finalItems.push({
        id: generateUUID(),
        name: newSubpartName.trim(),
        amount: amt
      });
      setNewSubpartName('');
      setNewSubpartAmount('');
    }

    finalItems = finalItems.map((it) => ({
      ...it,
      amount: parseFloat(it.amount) || 0
    }));

    const calculatedSum = finalItems.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);

    if (onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        amount: finalItems.length > 0 ? calculatedSum : event.amount,
        breakdownItems: finalItems.length > 0 ? finalItems : undefined,
        propagateForward: isRecurring ? propagateSubsequent : false
      });
    }
    setIsDesmembramentoExpanded(false);
  };

  // Cancelar e fechar desmembramento sem guardar
  const handleCancelDesmembramento = (e) => {
    if (e) e.stopPropagation();
    setDraftSubparts(event.breakdownItems ? JSON.parse(JSON.stringify(event.breakdownItems)) : []);
    setNewSubpartName('');
    setNewSubpartAmount('');
    setIsDesmembramentoExpanded(false);
  };

  // Handlers para manipular o rascunho (draft)
  const handleDraftUpdateAmount = (idx, newAmountStr) => {
    setDraftSubparts((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, amount: newAmountStr } : it))
    );
  };

  const handleDraftUpdateName = (idx, newName) => {
    setDraftSubparts((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, name: newName } : it))
    );
  };

  const handleDraftDeleteSubpart = (idx, e) => {
    if (e) e.stopPropagation();
    setDraftSubparts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDraftAddSubpart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (newSubpartName.trim()) {
      const amt = Number(newSubpartAmount) || 0;
      setDraftSubparts((prev) => [
        ...prev,
        { id: generateUUID(), name: newSubpartName.trim(), amount: amt }
      ]);
      setNewSubpartName('');
      setNewSubpartAmount('');
    }
  };


  const isMemoryCard = isRegisterEvent || event.category === 'memoria' || event.category === 'memory' || event.category === 'note';








  // Card specific backgrounds and theme palette
  const getCardTheme = () => {
    if (isIncomeEvent) {
      return {
        color: TimelineColor.EMERALD,
        bg: `${TimelineColor.EMERALD}1f`,
        border: `${TimelineColor.EMERALD}4c`,
        lightText: TimelineColor.EMERALD
      };
    }
    if (isExpenseEvent) {
      return {
        color: TimelineColor.ROSE,
        bg: `${TimelineColor.ROSE}1f`,
        border: `${TimelineColor.ROSE}4c`,
        lightText: TimelineColor.ROSE
      };
    }
    if (isInvestmentEvent) {
      return {
        color: TimelineColor.VIOLET,
        bg: `${TimelineColor.VIOLET}1f`,
        border: `${TimelineColor.VIOLET}4c`,
        lightText: TimelineColor.VIOLET
      };
    }
    if (isLoanInstallment) {
      return {
        color: TimelineColor.SKY,
        bg: `${TimelineColor.SKY}1f`,
        border: `${TimelineColor.SKY}4c`,
        lightText: TimelineColor.SKY
      };
    }
    if (isAmortization) {
      return {
        color: TimelineColor.INCOME,
        bg: `${TimelineColor.EMERALD}1f`,
        border: `${TimelineColor.EMERALD}4c`,
        lightText: TimelineColor.EMERALD
      };
    }
    return {
      color: `var(--primary-light, ${TimelineColor.PRIMARY_LIGHT})`,
      bg: `${TimelineColor.PRIMARY}1f`,
      border: `${TimelineColor.PRIMARY}4c`,
      lightText: `var(--text-main, ${TimelineColor.SLATE_LIGHT})`
    };
  };

  const cardTheme = getCardTheme();

  // Event Origin / Sub-vision info for right-aligned badge (coherent with vision palettes)
  const getEventOriginInfo = () => {
    const originName = event.timelineOriginName || '';
    const originId = event.timelineOriginId || event.timelineId || event.timeline_id;
    const originColor = event.timelineOriginColor || event.timelineColor;

    if (isLoanInstallment || isLoanTimelineType(event.timelineType) || isLoanTimelineType(event.timeline_type)) {
      const p = getPaletteTheme(originColor || TimelineColor.LOAN, TimelineColor.LOAN);
      return {
        label: originName || t('sidebar.loanTimeline'),
        icon: <CreditCard size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    if (isExpenseEvent || event.timelineType === TimelineType.EXPENSE || event.eventType === EventType.EXPENSE || Boolean(event.isExpense)) {
      const p = getPaletteTheme(originColor || TimelineColor.EXPENSE, TimelineColor.EXPENSE);
      return {
        label: originName || t('sidebar.expenseTimeline'),
        icon: <ReceiptEuro size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    const walletTimeline = (timelines || []).find((tl) => isWalletTimelineType(tl?.type));
    if (isInvestmentEvent || event.timelineType === TimelineType.INVESTMENT) {
      const p = getPaletteTheme(originColor || TimelineColor.INVESTMENT, TimelineColor.INVESTMENT);
      return {
        label: originName || t('sidebar.investmentTimeline'),
        icon: <Landmark size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    if (isIncomeEvent || isWalletTimelineType(event.timelineType)) {
      const p = getPaletteTheme(originColor || TimelineColor.INCOME, TimelineColor.INCOME);
      return {
        label: originName || walletTimeline?.name || t(isCondoflow ? 'sidebar.cashTimeline' : 'sidebar.walletTimeline'),
        icon: <Wallet size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    if (isReminderEvent || event.timelineType === TimelineType.REMINDER) {
      const p = getPaletteTheme(originColor || TimelineColor.REMINDER, TimelineColor.REMINDER);
      return {
        label: originName || t('sidebar.reminderTimeline'),
        icon: <Bell size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    if (isTodoEvent || event.timelineType === TimelineType.TODO) {
      const p = getPaletteTheme(originColor || TimelineColor.TODO, TimelineColor.TODO);
      return {
        label: originName || t('sidebar.todoTimeline'),
        icon: <CheckSquare size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    if (isFollowupEvent || event.timelineType === TimelineType.FOLLOWUP) {
      const p = getPaletteTheme(originColor || TimelineColor.FOLLOWUP, TimelineColor.FOLLOWUP);
      return {
        label: originName || t('sidebar.followupTimeline'),
        icon: <ListTree size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    if (isRegisterEvent || event.timelineType === TimelineType.DIARY) {
      const p = getPaletteTheme(originColor || TimelineColor.DIARY, TimelineColor.DIARY);
      return {
        label: originName || makeDiaryT(t, isCondoflow)('sidebar.diaryTimeline'),
        icon: <BookOpen size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    const p = getPaletteTheme(originColor || TimelineColor.SUCCESS, TimelineColor.SUCCESS);
    return {
      label: originName || t('sidebar.balanceTimeline'),
      icon: <DollarSign size={11} strokeWidth={2.4} />,
      bg: hexToRgba(p.light, 0.22),
      color: p.primary,
      border: hexToRgba(p.medium, 0.40),
      timelineId: originId,
      tab: originId
    };
  };

  const originInfo = getEventOriginInfo();





  // Values shared with the card sections (event-card/*) through EventCardContext
  const eventCardContext = {
    abatedBreakdown,
    activeFinancialTab,
    addCardNote,
    allEvents,
    blocksChanges,
    canAddNote,
    canChangeCategory,
    canChangeStatus,
    canDeleteNote,
    canEdit,
    canEditAmount,
    canEditPaymentDate,
    canOverride,
    cardTheme,
    categoryAnchorRef,
    categoryPickerPopoverRef,
    categoryPickerPos,
    correctEvent,
    currentMonthEndStr,
    draftSubparts,
    editingSubpartIdx,
    effectiveStatus,
    effectiveStatusKey,
    event,
    getCardNotes,
    getCategorySources,
    getProposedReceiptNumber,
    handleCancelAmount,
    handleCancelDesmembramento,
    handleCancelTitle,
    handleDraftAddSubpart,
    handleDraftDeleteSubpart,
    handleDraftUpdateAmount,
    handleDraftUpdateName,
    handlePayUpToHereClick,
    handleSaveAmount,
    handleSaveDesmembramento,
    handleSaveTitle,
    handleStatusToggle,
    hasBreakdown,
    isAccountOutflow,
    isAmortization,
    isAmortized,
    isAnchorCard,
    isBalanceView,
    isCancelConfirmOpen,
    isCancelled,
    isCancelledPost,
    isCategoryPickerOpen,
    isClosedReminder,
    isCompleted,
    isCompletedInvestment,
    isCondoPost,
    isCondoflow,
    isDesmembramentoExpanded,
    isEditingAmount,
    isEditingTitle,
    isExpenseEvent,
    isFlatPositive,
    isFollowupEvent,
    isFutureMonth,
    isIncomeEvent,
    isInvestmentEvent,
    isLoanInstallment,
    isLockedPositive,
    isNotesExpanded,
    isObligationEvent,
    isOutflowReference,
    isDepositReference,
    walletBankTransfer,
    isOverdue,
    isOverdueExpense,
    isOverdueIncome,
    isOverdueInvestment,
    isOverdueLoan,
    isOverdueReminder,
    isPaidExpense,
    isPaidLoan,
    isPayingUpToHere,
    isPocketOutflowEvent,
    isReadOnly,
    isReceiptDateOpen,
    isReceiptNumberOpen,
    isReceivedIncome,
    isRecurring,
    isRecurringEvent,
    isRegisterEvent,
    isReminderEvent,
    isRevertConfirmOpen,
    isSavingNote,
    isSavingReceiptDate,
    isSavingReceiptNumber,
    isTodoEvent,
    isTogglingStatus,
    isTransferEvent,
    isVirtual,
    isVirtualWithdrawal,
    localAuto,
    newItemText,
    newSubpartAmount,
    newSubpartName,
    obligationPerson,
    onDelete,
    onEdit,
    onNavigateToTimeline,
    onPayUpToHere,
    onPrintReceipt,
    onToggleLoanPayment,
    onUpdateEventDirect,
    openDesmembramento,
    openOutflowReferenceOrigin,
    originInfo,
    outflowReferenceInfo,
    paletteTheme,
    pocketName,
    postPublishStatus,
    propagateSubsequent,
    receiptDateAnchorRef,
    receiptDateDraft,
    receiptDatePopoverRef,
    receiptDatePos,
    receiptNumberAnchorRef,
    receiptNumberDraft,
    receiptNumberError,
    receiptNumberPopoverRef,
    receiptNumberPos,
    reducedBreakdown,
    removeCardNote,
    saveCategory,
    saveReceiptDateDraft,
    saveReceiptNumber,
    saveReceiptNumberDraft,
    setCategoryPickerPos,
    setEditingSubpartIdx,
    setIsCancelConfirmOpen,
    setIsCategoryPickerOpen,
    setIsDesmembramentoExpanded,
    setIsEditingAmount,
    setIsEditingTitle,
    setIsNotesExpanded,
    setIsReceiptDateOpen,
    setIsReceiptNumberOpen,
    setIsRevertConfirmOpen,
    setLocalAuto,
    setLocalStatus,
    setNewItemText,
    setNewSubpartAmount,
    setNewSubpartName,
    setPostPublishStatus,
    setPropagateSubsequent,
    setReceiptDateDraft,
    setReceiptDatePos,
    setReceiptNumberDraft,
    setReceiptNumberError,
    setReceiptNumberPos,
    setTempAmount,
    setTempTitle,
    stripLockIcons,
    t,
    tempAmount,
    tempTitle,
    timelineType,
    todayStr,
    virtualWithdrawalDisplayTitle
  };

  return (
    <EventCardProvider value={eventCardContext}>
    <div
      className={`event-inner-item ${isMemoryCard ? 'memory-card' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}
    >
      {/* 💰 Income (Entrada) Financial Highlight Strip (boc in) */}
      {isIncomeEvent && (
        <IncomeEventBody />
      )}

      {/* 🛒 Expense (Gasto/Saída) Financial Highlight Strip (boc in) */}
      {isExpenseEvent && (
        <ExpenseEventBody />
      )}

      {/* 📈 Investment (Investimento/Poupança/Património) Financial Highlight Strip (boc in) */}
      {isInvestmentEvent && (
        <InvestmentEventBody />
      )}

      {/* ⚡ Amortização Extraordinária Strip (flat green with white text) */}
      {isAmortization && (
        <AmortizationEventBody />
      )}

      {/* 🏦 Loan Installment Principal / Interest Breakdown Strip (boc in) */}
      {isLoanInstallment && (
        <LoanInstallmentBody />
      )}

      {/* 📖 Diary Register Event Strip (Direct Click-to-Edit, Mood Badge) */}
      {isRegisterEvent && (
        <DiaryEventBody />
      )}

      {/* 📝 To Do Item Event Strip */}
      {isTodoEvent && (
        <TodoEventBody />
      )}

      {/* 🚀 Follow-up Event Strip */}
      {isFollowupEvent && (
        <FollowupEventBody />
      )}

      {/* 📋 Default / Generic / Reminder Event Strip */}
      {!isIncomeEvent && !isExpenseEvent && !isInvestmentEvent && !isAmortization && !isLoanInstallment && !isRegisterEvent && !isTodoEvent && !isFollowupEvent && (
        <GenericEventBody />
      )}

      {/* Expandable Notes Section (Glassmorphism) */}
      <EventCardNotes />

      {/* 🧩 Painel de Desmembramento do Valor (In-place, com Salvar e Cancelar) */}
      {isDesmembramentoExpanded && <BreakdownEditor />}
    </div>
    </EventCardProvider>
  );
});


const TimelineEventDayCard = React.memo(function TimelineEventDayCard({
  events,
  event,
  timelineColor,
  allEvents = [],
  timelines = [],
  currentTimelineId,
  timelineType,
  activeFinancialTab = null,
  showYear = false,
  onEdit,
  onUpdateEventDirect,
  onDelete,
  onToggleTask,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onToggleLoanPayment,
  onPayUpToHere,
  onOpenEditInstallment,
  onNavigateToTimeline,
  onPrintReceipt,
  persons = []
}) {
  const { isCondoflow: isCondoflowBoard } = useTimeboard();
  const dayComparator = React.useMemo(
    () => createEventDayComparator({ personsById: buildPersonsById(persons), obligatorFirst: isCondoflowBoard }),
    [persons, isCondoflowBoard]
  );
  const eventList = React.useMemo(() => {
    const list = Array.isArray(events) ? [...events] : (event ? [event] : []);
    return list.sort(dayComparator);
  }, [events, event, dayComparator]);
  const { language } = useTranslation();
  const dateLocale = language === 'pt' ? pt : enUS;

  if (eventList.length === 0) return null;

  const firstEvent = eventList[0];
  const eventDateObj = firstEvent.date ? parseISO(firstEvent.date) : (firstEvent.dueDate ? parseISO(firstEvent.dueDate) : null);
  const formattedDateStr = eventDateObj
    ? format(
        eventDateObj,
        showYear
          ? (language === 'pt' ? "EEEE, dd 'de' MMMM 'de' yyyy" : "EEEE, MMMM dd, yyyy")
          : (language === 'pt' ? "EEEE, dd 'de' MMMM" : "EEEE, MMMM dd"),
        { locale: dateLocale }
      )
    : '';

  const isBalance = timelineType === TimelineType.BALANCE;

  // Shared notices (reminders / diaries shown to individual users) keep the color of their own timeline
  const sharedNoticeColor = eventList.every((ev) => ev.isSharedNotice && ev.timelineOriginColor === firstEvent.timelineOriginColor)
    ? firstEvent.timelineOriginColor
    : null;

  const baseColor = isBalance
    ? TimelineColor.SLATE
    : (sharedNoticeColor || timelineColor || firstEvent.timelineColor || TimelineColor.PRIMARY);
  return (
    <div
      className="event-card"
      style={{
        background: 'transparent',
        border: '1px solid var(--border-glass)',
        padding: '8px 10px 8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        overflow: 'visible',
        position: 'relative'
      }}
    >
      {/* Top Header (box ex) */}
      {formattedDateStr && (
        <div
          className="event-card-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            width: '100%',
            marginBottom: '2px',
            padding: '2px 4px 2px 4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: TimelineColor.PRIMARY, fontSize: '0.80rem', fontWeight: '700', textTransform: 'capitalize' }}>
            <Calendar size={13} style={{ flexShrink: 0, opacity: 0.9 }} />
            <span style={{ letterSpacing: '0.01em' }}>
              {formattedDateStr}
            </span>
          </div>
          {eventList.length > 1 && (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: '700',
                color: 'var(--text-dim)',
                background: `${TimelineColor.WHITE}0d`,
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-glass)'
              }}
            >
              {eventList.length} {language === 'pt' ? 'eventos' : 'events'}
            </span>
          )}
        </div>
      )}

      {/* Stacked inner boxes (boc in) for each event on this date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {eventList.map((ev, idx) => (
          <TimelineEventInnerItem
            key={`${ev.id || ev.eventId || 'ev'}_${ev.date}_${idx}`}
            event={ev}
            allEvents={allEvents}
            timelines={timelines}
            currentTimelineId={currentTimelineId}
            timelineType={timelineType}
            activeFinancialTab={activeFinancialTab}
            onEdit={onEdit}
            onUpdateEventDirect={onUpdateEventDirect}
            onDelete={onDelete}
            onToggleTask={onToggleTask}
            onAddChecklistItem={onAddChecklistItem}
            onDeleteChecklistItem={onDeleteChecklistItem}
            onToggleLoanPayment={onToggleLoanPayment}
            onPayUpToHere={onPayUpToHere}
            onOpenEditInstallment={onOpenEditInstallment}
            onNavigateToTimeline={onNavigateToTimeline}
            onPrintReceipt={onPrintReceipt}
            timelineColor={sharedNoticeColor || timelineColor || baseColor}
            persons={persons}
          />
        ))}
      </div>
    </div>
  );
});

/**
 * Day card entry point. Shared notices (reminders / diaries shown to individual users) never share
 * a frame with the user's own events: a mixed day is rendered as one card for the own events and one
 * card per notice origin, so each keeps the color of its own timeline.
 */
export const TimelineEventCard = React.memo(function TimelineEventCard(props) {
  const { events, event } = props;
  const groups = React.useMemo(() => {
    const list = Array.isArray(events) ? events : (event ? [event] : []);
    const own = list.filter((ev) => !ev.isSharedNotice);
    const notices = list.filter((ev) => ev.isSharedNotice);
    if (own.length === 0 || notices.length === 0) return null;
    const byColor = new Map();
    notices.forEach((ev) => {
      const key = ev.timelineOriginColor || '';
      if (!byColor.has(key)) byColor.set(key, []);
      byColor.get(key).push(ev);
    });
    return [own, ...byColor.values()];
  }, [events, event]);

  if (!groups) return <TimelineEventDayCard {...props} />;

  return (
    <>
      {groups.map((groupEvents, idx) => (
        <TimelineEventDayCard key={idx} {...props} event={undefined} events={groupEvents} />
      ))}
    </>
  );
});

export default TimelineEventCard;
