import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Clock,
  CheckSquare,
  Edit3,
  Trash2,
  User,
  AlertCircle,
  Repeat,
  Calendar,
  Pin,
  BookOpen,
  Tag,
  CreditCard,
  TrendingDown,
  TrendingUp,
  CheckCircle2,
  Circle,
  Sliders,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  Sparkles,
  Gift,
  MinusCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Home,
  Car,
  Layers,
  Zap,
  ShoppingCart,
  PiggyBank,
  Landmark,
  Check,
  X,
  Target,
  Building2,
  UserCheck,
  FileCheck2,
  Ban,
  Utensils,
  Cake,
  Wrench,
  Bell,
  ListTree,
  Loader2,
  Flag,
  Printer,
  Lock,
  Wallet,
  ReceiptEuro
} from 'lucide-react';
import { isLoanInstallment as checkIsLoanInstallment, isAmortizationEvent as checkIsAmortizationEvent } from '../utils/loanCalculations';
import { formatCurrency } from '../utils/formatCurrency';
import { format, parseISO, endOfMonth } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { generateUUID } from '../utils/uuid';
import {
  TimelineColor,
  EventType,
  TimelineType,
  EventStatus,
  FollowupStatus,
  ReminderEventStatus,
  EventRecurrence,
  EventPeriodicity,
  EventPriority,
  PersonType,
  AmortizationEventCategory,
  LoanEventCategory,
  InvestmentEventCategory,
  ReminderEventCategory,
  DiaryMood,
  DiaryPublishStatus,
  isCancelledStatus,
  isPositiveStatus,
  isNegativeStatus,
  isLoanTimelineType,
  normalizeTimelineType,
  normalizeRecurrence
} from '../enums/index.js';
import { INCOME_CATEGORY_META, EXPENSE_CATEGORY_META, INVESTMENT_CATEGORY_META, REMINDER_CATEGORY_META } from './event-modals/FinancialEventModalConfig.js';
import { DIARY_MOOD_CONFIG, renderFormattedMarkdown } from './event-modals/DiaryEventModal.jsx';
import { getPaletteTheme, ColorPaletteId, COLOR_PALETTES } from '../../shared/config/colorPalettes.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import * as api from '../services/api.js';
import { compareEventsWithinDay } from '../utils/eventSorting.js';
import CopyIdButton from './ui/CopyIdButton.jsx';
import { usePermissions } from '../context/PermissionsContext.jsx';
import { useTimeboard } from '../context/TimeboardContext.jsx';
import { useEventActions } from '../context/EventActionsContext.jsx';
import DueDatePicker from './ui/DueDatePicker.jsx';
import { makeDiaryT } from '../utils/diaryLabels.js';

const RECEIPT_DATE_POPOVER_WIDTH = 270;
const RECEIPT_NUMBER_POPOVER_WIDTH = 220;

const TimelineEventInnerItem = React.memo(function TimelineEventInnerItem({
  event,
  allEvents = [],
  currentTimelineId,
  timelineType,
  activeFinancialTab = null,
  onEdit: onEditProp,
  onUpdateEventDirect: onUpdateEventDirectProp,
  onDelete: onDeleteProp,
  onToggleTask: onToggleTaskProp,
  onAddChecklistItem: onAddChecklistItemProp,
  onDeleteChecklistItem: onDeleteChecklistItemProp,
  onToggleLoanPayment: onToggleLoanPaymentProp,
  onPayUpToHere: onPayUpToHereProp,
  onOpenEditInstallment: onOpenEditInstallmentProp,
  onNavigateToTimeline,
  onPrintReceipt: onPrintReceiptProp,
  timelineColor,
  timelines = [],
  persons = []
}) {
  const { t, language } = useTranslation();
  // Read-only users (individual role) cannot change events; they can only view and add notes.
  const { isReadOnly } = usePermissions();
  // Condominium timeboards do not use the diary mood
  const { isCondoflow } = useTimeboard();
  const onEdit = isReadOnly ? undefined : onEditProp;
  const onUpdateEventDirect = isReadOnly ? undefined : onUpdateEventDirectProp;
  const onSaveNotes = onUpdateEventDirectProp;
  const onDelete = isReadOnly ? undefined : onDeleteProp;
  const onToggleTask = isReadOnly ? undefined : onToggleTaskProp;
  const onAddChecklistItem = isReadOnly ? undefined : onAddChecklistItemProp;
  const onDeleteChecklistItem = isReadOnly ? undefined : onDeleteChecklistItemProp;
  const onToggleLoanPayment = isReadOnly ? undefined : onToggleLoanPaymentProp;
  const onPayUpToHere = isReadOnly ? undefined : onPayUpToHereProp;
  const onOpenEditInstallment = isReadOnly ? undefined : onOpenEditInstallmentProp;
  const onPrintReceipt = isReadOnly ? undefined : onPrintReceiptProp;
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  // Payment date edited directly on the ticket (paid / received events)
  const { saveReceiptDate, saveReceiptNumber, getProposedReceiptNumber } = useEventActions();
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
  const [newItemText, setNewItemText] = useState('');
  const [localAuto, setLocalAuto] = React.useState(Boolean(event.automatic || event.isAutomatic));
  const [localStatus, setLocalStatus] = React.useState(event.status);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isPayingUpToHere, setIsPayingUpToHere] = useState(false);

  const handleStatusToggle = React.useCallback(async (e, explicitStatus = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isTogglingStatus || !onToggleLoanPayment) return;

    // Immediate 0ms visual feedback
    const isCurrPositive = isPositiveStatus(event.status) || event.status === FollowupStatus.FINISHED || Boolean(event.isCompleted);
    const isFinancialLocked = event.eventType === EventType.INCOME || event.eventType === EventType.EXPENSE || event.eventType === EventType.INVESTMENT;

    // If it's a positive financial event and no explicit status is passed (or attempting to revert to negative): block it
    if (isFinancialLocked && isCurrPositive && !explicitStatus) {
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
  }, [event, isTogglingStatus, onToggleLoanPayment]);

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

  const isWithdrawalEvent = Boolean(
    event.eventType === EventType.WITHDRAWAL ||
    event.isWithdrawal ||
    (event.pocketId && Number(event.amount || 0) < 0)
  );

  const isIncomeEvent = event.eventType === EventType.INCOME && !isRegisterEvent && !isTodoEvent && !isReminderEvent && !isFollowupEvent;
  const isExpenseEvent = event.eventType === EventType.EXPENSE && !isRegisterEvent && !isTodoEvent && !isReminderEvent && !isFollowupEvent;
  const isInvestmentEvent = (event.eventType === EventType.INVESTMENT || isWithdrawalEvent) && !isRegisterEvent && !isTodoEvent && !isReminderEvent && !isFollowupEvent;

  const baseItemColor = useMemo(() => {
    if (isWithdrawalEvent) {
      const incomeTimeline = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.INCOME);
      if (incomeTimeline?.color) {
        return incomeTimeline.color;
      }
      const incomeEvent = (allEvents || []).find((e) => e.eventType === EventType.INCOME && e.timelineColor);
      if (incomeEvent?.timelineColor) {
        return incomeEvent.timelineColor;
      }
      return COLOR_PALETTES[ColorPaletteId.LIGHT_BLUE]?.shades?.SHADE_1 || COLOR_PALETTES[ColorPaletteId.LIGHT_BLUE]?.colors[0];
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
      if (isIncomeEvent || event.timelineType === TimelineType.INCOME || event.eventType === EventType.INCOME) {
        const incomeTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.INCOME);
        if (incomeTl?.color) return incomeTl.color;
        return TimelineColor.INCOME;
      }
      if (isExpenseEvent || event.timelineType === TimelineType.EXPENSE || event.eventType === EventType.EXPENSE) {
        const expenseTl = (timelines || []).find((t) => normalizeTimelineType(t?.type) === TimelineType.EXPENSE);
        if (expenseTl?.color) return expenseTl.color;
        return TimelineColor.EXPENSE;
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

  const isFutureMonth = Boolean(event.date && event.date > currentMonthEndStr);

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
  const isNextIncome = isIncomeEvent && event.date >= todayStr && event.date <= currentMonthEndStr && !isReceivedIncome && !isCancelled;

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

  // Receipt reference line: "REC. 202602 | Data: 13/03/2025".
  // The payment date shows as soon as the event is paid / received (stored receipt date, or the event date).
  const renderReceiptRef = (onPositiveCard) => {
    const receiptNumber = event.cont_year ?? event.contYear;
    const hasReceiptNumber = receiptNumber != null && Number(receiptNumber) > 0;
    const paymentDate = isCompleted && !isCancelled ? (event.receiptDate || event.date) : null;
    const canAddReceiptNumber = !hasReceiptNumber && Boolean(paymentDate) && canEditPaymentDate
      && isObligationEvent && Boolean(onPrintReceipt) && Boolean(saveReceiptNumber);
    if (!hasReceiptNumber && !paymentDate) {
      return <span style={{ fontSize: '0.7rem', lineHeight: 1 }}>&nbsp;</span>;
    }
    return (
      <span style={{ fontSize: '0.7rem', color: onPositiveCard ? `${TimelineColor.WHITE}d9` : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <FileText size={10} />
        {hasReceiptNumber && t('receipt.receiptNumber', { number: receiptNumber })}
        {canAddReceiptNumber && (
          <button
            type="button"
            ref={receiptNumberAnchorRef}
            title={t('receipt.addNumberHint')}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setReceiptNumberPos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - RECEIPT_NUMBER_POPOVER_WIDTH - 8)) });
              setReceiptNumberDraft(String(getProposedReceiptNumber?.(event) || ''));
              setReceiptNumberError('');
              setIsReceiptDateOpen(false);
              setIsReceiptNumberOpen((open) => !open);
            }}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '2px',
              padding: '0 6px',
              lineHeight: '14px',
              borderRadius: '9999px',
              border: '1px solid currentColor',
              background: 'transparent',
              color: 'inherit',
              font: 'inherit',
              fontSize: '0.62rem',
              textTransform: 'inherit',
              cursor: 'pointer',
              opacity: 0.9
            }}
          >
            <Plus size={9} />
            {t('receipt.addNumber')}
          </button>
        )}
        {(hasReceiptNumber || canAddReceiptNumber) && paymentDate && <span style={{ opacity: 0.6 }}>|</span>}
        {paymentDate && (canEditPaymentDate ? (
          <button
            type="button"
            title={t('receipt.changePaymentDate')}
            ref={receiptDateAnchorRef}
            onClick={(e) => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setReceiptDatePos({ top: rect.bottom + 4, left: Math.max(8, Math.min(rect.left, window.innerWidth - RECEIPT_DATE_POPOVER_WIDTH - 8)) });
              setReceiptDateDraft(paymentDate);
              setIsReceiptNumberOpen(false);
              setIsReceiptDateOpen((open) => !open);
            }}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              font: 'inherit',
              color: 'inherit',
              textTransform: 'inherit',
              textDecoration: 'underline dotted',
              cursor: 'pointer'
            }}
          >
            {t('receipt.paymentDateShort', { date: format(parseISO(paymentDate), 'dd/MM/yyyy') })}
          </button>
        ) : t('receipt.paymentDateShort', { date: format(parseISO(paymentDate), 'dd/MM/yyyy') }))}
      </span>
    );
  };

  const canEditPaymentDate = Boolean(saveReceiptDate) && !isReadOnly && isCompleted && !isCancelled && !isVirtual;

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

  // Floating popover (portal) to add the receipt number: pre-filled with the next sequential number, editable
  const renderReceiptNumberEditor = () => {
    if (!isReceiptNumberOpen || !receiptNumberPos) return null;
    const smallButtonStyle = { padding: '3px 10px', fontSize: '0.7rem', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' };
    return createPortal(
      <div
        ref={receiptNumberPopoverRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: receiptNumberPos.top,
          left: receiptNumberPos.left,
          zIndex: 1000,
          width: `${RECEIPT_NUMBER_POPOVER_WIDTH}px`,
          padding: '8px',
          borderRadius: '10px',
          border: '1px solid var(--border-glass)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-sm)',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}
      >
        <label style={{ fontSize: '0.64rem', fontWeight: '700', color: 'var(--text-muted)' }}>
          {t('receipt.numberLabel')}
        </label>
        <div style={{ display: 'flex', gap: '6px' }}>
          <input
            type="number"
            min="1"
            step="1"
            autoFocus
            value={receiptNumberDraft}
            onChange={(e) => {
              setReceiptNumberDraft(e.target.value);
              setReceiptNumberError('');
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') saveReceiptNumberDraft();
            }}
            style={{
              flex: 1,
              minWidth: 0,
              padding: '4px 8px',
              borderRadius: '6px',
              border: `1px solid ${receiptNumberError ? 'var(--danger)' : 'var(--border-glass)'}`,
              background: 'var(--bg-glass)',
              color: 'var(--text-main)',
              fontSize: '0.78rem',
              fontWeight: '700'
            }}
          />
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isSavingReceiptNumber || !receiptNumberDraft}
            onClick={saveReceiptNumberDraft}
            style={smallButtonStyle}
          >
            <Check size={11} />
            <span>{t('common.save')}</span>
          </button>
        </div>
        {receiptNumberError && (
          <span role="alert" style={{ fontSize: '0.66rem', color: 'var(--danger)', fontWeight: '600' }}>
            {receiptNumberError}
          </span>
        )}
      </div>,
      document.body
    );
  };

  const saveReceiptDateDraft = async () => {
    if (!receiptDateDraft || isSavingReceiptDate) return;
    setIsSavingReceiptDate(true);
    const ok = await saveReceiptDate(event, receiptDateDraft);
    setIsSavingReceiptDate(false);
    if (ok) setIsReceiptDateOpen(false);
  };

  // Small floating popover (portal, fixed position) with the compact Year | Month | Day picker,
  // so changing the payment date does not grow the ticket
  const renderReceiptDateEditor = () => {
    if (!isReceiptDateOpen || !receiptDateDraft || !receiptDatePos) return null;
    const draftObj = parseISO(receiptDateDraft);
    const smallButtonStyle = { padding: '3px 10px', fontSize: '0.7rem', minHeight: 0, display: 'inline-flex', alignItems: 'center', gap: '4px' };
    return createPortal(
      <div
        ref={receiptDatePopoverRef}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'fixed',
          top: receiptDatePos.top,
          left: receiptDatePos.left,
          zIndex: 1000,
          width: `${RECEIPT_DATE_POPOVER_WIDTH}px`,
          padding: '8px 8px 0',
          borderRadius: '10px',
          border: '1px solid var(--border-glass)',
          background: 'var(--bg-card)',
          boxShadow: 'var(--shadow-sm)'
        }}
      >
        <DueDatePicker
          compact
          date={format(draftObj, 'yyyy-MM-01')}
          day={draftObj.getDate()}
          dayLabel={t('modal.day')}
          accent={paletteTheme.primary}
          onChange={({ date: monthDate, day }) => setReceiptDateDraft(`${monthDate.substring(0, 8)}${String(day).padStart(2, '0')}`)}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginBottom: '8px' }}>
          <button type="button" className="btn btn-secondary btn-sm" style={smallButtonStyle} onClick={() => setIsReceiptDateOpen(false)}>
            {t('common.cancel')}
          </button>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={isSavingReceiptDate}
            onClick={saveReceiptDateDraft}
            style={smallButtonStyle}
          >
            <Check size={11} />
            <span>{t('common.save')}</span>
          </button>
        </div>
      </div>,
      document.body
    );
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

  const renderStatusDropdownButton = (buttonProps, children) => {
    // Read-only users: status is an indicator, not a button (reminders show no status at all)
    if (isReadOnly) {
      if (isReminderEvent) return null;
      return (
        <span
          style={{
            ...buttonProps?.style,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            cursor: 'default',
            pointerEvents: 'none',
            userSelect: 'none',
            boxShadow: 'none'
          }}
        >
          {stripLockIcons(children)}
        </span>
      );
    }

    if (isFutureMonth) {
      return (
        <div
          className="btn btn-sm"
          style={{
            ...buttonProps?.style,
            background: 'rgba(255, 255, 255, 0.03)',
            color: 'var(--text-dim)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'none',
            cursor: 'default',
            userSelect: 'none',
            opacity: 0.65,
            pointerEvents: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title=""
        >
          {children}
        </div>
      );
    }

    if (isLockedPositive) {
      return (
        <div
          className="btn btn-sm"
          style={{
            ...buttonProps?.style,
            boxShadow: 'none',
            cursor: 'default',
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title={t('timeline.lockedPositiveNotice')}
        >
          {children}
        </div>
      );
    }

    return (
      <button
        type="button"
        disabled={isTogglingStatus}
        onClick={(e) => {
          e.stopPropagation();
          handleStatusToggle(e);
        }}
        {...buttonProps}
        style={{
          ...buttonProps?.style,
          cursor: isTogglingStatus ? 'wait' : (buttonProps?.style?.cursor || 'pointer'),
          opacity: isTogglingStatus ? 0.75 : (buttonProps?.style?.opacity || 1)
        }}
      >
        {isTogglingStatus ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
            <Loader2 size={12} className="animate-spin" />
            <span>{t('common.processing')}</span>
          </span>
        ) : (
          children
        )}
      </button>
    );
  };

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
  const [tempAmount, setTempAmount] = useState(event.amount !== undefined ? event.amount : '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(event.title || '');
  const [propagateSubsequent, setPropagateSubsequent] = useState(true);
  const [isDesmembramentoExpanded, setIsDesmembramentoExpanded] = useState(false);
  const [draftSubparts, setDraftSubparts] = useState([]);
  const [newSubpartName, setNewSubpartName] = useState('');
  const [newSubpartAmount, setNewSubpartAmount] = useState('');
  const [editingSubpartIdx, setEditingSubpartIdx] = useState(null);

  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [catOpenUpwards, setCatOpenUpwards] = useState(false);
  const categoryDropdownRef = useRef(null);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return;
    if (categoryDropdownRef.current) {
      const rect = categoryDropdownRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < 260 && rect.top > 260) {
        setCatOpenUpwards(true);
      } else {
        setCatOpenUpwards(false);
      }
    }
    const handleClickOutside = (e) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isCategoryDropdownOpen]);

  const handleSelectCategory = (newCat) => {
    if (newCat && newCat !== event.category && onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        category: newCat
      });
    }
    setIsCategoryDropdownOpen(false);
  };

  const getCategoryOptionsForEvent = () => {
    const isIncome = event.eventType === EventType.INCOME || timelineType === TimelineType.INCOME || event.isIncome;
    const isInvestment = event.eventType === EventType.INVESTMENT || timelineType === TimelineType.INVESTMENT || event.isInvestment;
    const isReminder = timelineType === TimelineType.REMINDER || timelineType === 'reminder' || timelineType === 'reminders';
    if (isReminder) {
      return Object.values(ReminderEventCategory).map((key) => ({
        key,
        meta: REMINDER_CATEGORY_META[key] || {
          icon: Tag,
          color: TimelineColor.WARNING,
          bg: `${TimelineColor.WARNING}26`
        },
        label: t(`reminderCategories.${key}`) || key
      }));
    }
    if (isIncome) {
      return Object.keys(INCOME_CATEGORY_META).map((key) => ({
        key,
        meta: INCOME_CATEGORY_META[key],
        label: t(`incomeCategories.${key}`) || key
      }));
    }
    if (isInvestment) {
      return Object.keys(INVESTMENT_CATEGORY_META).map((key) => ({
        key,
        meta: INVESTMENT_CATEGORY_META[key],
        label: t(`investmentCategories.${key}`) || key
      }));
    }
    return Object.keys(EXPENSE_CATEGORY_META).map((key) => ({
      key,
      meta: EXPENSE_CATEGORY_META[key],
      label: t(`expenseCategories.${key}`) || key
    }));
  };

  const hasBreakdown = Array.isArray(event.breakdownItems) && event.breakdownItems.length > 0;

  React.useEffect(() => {
    setTempAmount(event.amount !== undefined ? event.amount : '');
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
        amount: num,
        propagateForward: isRecurring ? propagateSubsequent : false
      });
    }
    setIsEditingAmount(false);
  };

  const handleCancelAmount = (e) => {
    if (e) e.stopPropagation();
    setTempAmount(event.amount !== undefined ? event.amount : '');
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

  const renderEditableAmount = (prefix = '', defaultColor = 'var(--text-main)') => {
    if (isVirtual) {
      return (
        <span
          style={{
            fontSize: '1.05rem',
            fontWeight: '800',
            color: defaultColor,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          {prefix}{formatCurrency(Math.abs(Number(event.amount || 0)))}
        </span>
      );
    }

    // Se o valor estiver desmembrado em subpartes, o total NÃO é alterado diretamente mas sim pelas subpartes
    if (hasBreakdown) {
      return (
        <span
          onClick={(e) => {
            if (isReadOnly || isLockedPositive || isCancelled) return;
            e.stopPropagation();
            if (isDesmembramentoExpanded) {
              handleCancelDesmembramento(e);
            } else {
              openDesmembramento(e);
            }
          }}
          title={
            (isLockedPositive || isCancelled)
              ? t('timeline.lockedPositiveNotice')
              : t('timeline.breakdownValueTooltip')
          }
          style={{
            fontSize: '1.05rem',
            fontWeight: '800',
            color: defaultColor,
            cursor: (isLockedPositive || isCancelled) ? 'default' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {prefix}{formatCurrency(Math.abs(Number(event.amount || 0)))}
          <span
            onClick={(e) => {
              if (isReadOnly || isLockedPositive || isCancelled) return;
              e.stopPropagation();
              if (isDesmembramentoExpanded) {
                handleCancelDesmembramento(e);
              } else {
                openDesmembramento(e);
              }
            }}
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              color: isDesmembramentoExpanded ? TimelineColor.WHITE : 'var(--primary-light)',
              background: isDesmembramentoExpanded ? 'var(--primary)' : 'rgba(99, 102, 241, 0.14)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '9999px',
              padding: '2px 9px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: (isLockedPositive || isCancelled) ? 'default' : 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isDesmembramentoExpanded ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none'
            }}
            title={
              (isLockedPositive || isCancelled)
                ? t('timeline.lockedPositiveNotice')
                : isDesmembramentoExpanded
                  ? t('timeline.breakdownCloseTooltip')
                  : t('timeline.breakdownOpenTooltip')
            }
          >
            <Layers size={11} />
            <span>{t('timeline.subpartsCount', { count: event.breakdownItems.length })}</span>
            {!isLockedPositive && !isCancelled && (
              <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{isDesmembramentoExpanded ? '▲' : '▼'}</span>
            )}
          </span>
        </span>
      );
    }

    if (isEditingAmount && !isLockedPositive && !isCancelled) {
      return (
        <form
          onSubmit={handleSaveAmount}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0, padding: 0 }}
        >
          {prefix && (
            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: defaultColor, marginRight: '-2px' }}>
              {prefix}
            </span>
          )}
          <input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            className="inline-amount-input"
            value={tempAmount}
            onFocus={(e) => e.target.select()}
            onBlur={handleSaveAmount}
            onChange={(e) => setTempAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCancelAmount(e);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: defaultColor,
              borderColor: defaultColor !== 'var(--text-main)' ? defaultColor : 'rgba(255, 255, 255, 0.35)'
            }}
          />
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSaveAmount}
            style={{
              background: TimelineColor.SUCCESS,
              color: TimelineColor.WHITE,
              border: 'none',
              borderRadius: '4px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title={isRecurring && propagateSubsequent ? "Guardar valor (propagando para os meses seguintes)" : "Guardar valor apenas neste mês"}
          >
            <Check size={13} strokeWidth={3} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancelAmount}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-dim)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="Cancelar"
          >
            <X size={13} strokeWidth={2.5} />
          </button>

          {/* Botão para Desmembrar valor em subpartes */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openDesmembramento}
            title="Desmembrar valor em subpartes com nomes associados"
            style={{
              background: 'rgba(99, 102, 241, 0.14)',
              color: 'var(--primary-light)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '4px',
              padding: '3px 6px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              marginLeft: '2px'
            }}
          >
            <Layers size={11} />
            <span>Desmembrar</span>
          </button>

          {/* Switch para Mudar os valores subsequentes (Default: true) */}
          {isRecurring && (
            <label
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
              title="Ativar para aplicar este novo valor a todos os meses subsequentes ou desativar para alterar apenas este mês"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: '600',
                color: propagateSubsequent ? 'var(--primary-light)' : 'var(--text-dim)',
                cursor: 'pointer',
                userSelect: 'none',
                background: propagateSubsequent ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                border: propagateSubsequent ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-glass)',
                borderRadius: '9999px',
                padding: '2px 8px',
                marginLeft: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '11px',
                  background: propagateSubsequent ? 'var(--primary)' : 'rgba(148, 163, 184, 0.35)',
                  borderRadius: '9999px',
                  position: 'relative',
                  display: 'inline-block',
                  transition: 'background 0.15s ease'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: propagateSubsequent ? '11px' : '2px',
                    transition: 'left 0.15s ease'
                  }}
                />
              </span>
              <input
                type="checkbox"
                checked={propagateSubsequent}
                onChange={(e) => {
                  e.stopPropagation();
                  setPropagateSubsequent(e.target.checked);
                }}
                style={{ display: 'none' }}
              />
              <span>Mudar subsequentes</span>
            </label>
          )}
        </form>
      );
    }

    return (
      <span
        onClick={(e) => {
          if (isReadOnly || isLockedPositive || isCancelled) return;
          e.stopPropagation();
          setPropagateSubsequent(true);
          setIsEditingAmount(true);
        }}
        title={
          isLockedPositive
            ? t('timeline.lockedPositiveNotice')
            : isRecurring
              ? t('timeline.clickToEditAmountPropagate')
              : t('timeline.clickToEditAmount')
        }
        style={{
          fontSize: '1.05rem',
          fontWeight: '800',
          color: defaultColor,
          cursor: (isLockedPositive || isCancelled) ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          textDecoration: isCancelled ? 'line-through' : 'none',
          transition: 'opacity 0.15s ease'
        }}
      >
        {prefix}{formatCurrency(Math.abs(Number(event.amount || 0)))}
      </span>
    );
  };

  const isMemoryCard = isRegisterEvent || event.category === 'memoria' || event.category === 'memory' || event.category === 'note';

  // Category Info & Styles
  const getCategoryMeta = (cat) => {
    const normalizedCat = (cat || '').toLowerCase().trim();
    if (!normalizedCat) {
      return {
        label: t('categories.default') || '',
        icon: <Tag size={12} />,
        bg: 'rgba(6, 182, 212, 0.15)',
        color: '#67e8f9',
        border: 'rgba(6, 182, 212, 0.3)'
      };
    }

    if (EXPENSE_CATEGORY_META[normalizedCat]) {
      const meta = EXPENSE_CATEGORY_META[normalizedCat];
      const IconComp = meta.icon;
      return {
        label: t(`expenseCategories.${normalizedCat}`) || normalizedCat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: IconComp ? <IconComp size={12} /> : <Tag size={12} />,
        bg: meta.bg || 'rgba(244, 63, 94, 0.15)',
        color: meta.color || '#f43f5e',
        border: 'rgba(244, 63, 94, 0.3)'
      };
    }

    if (INCOME_CATEGORY_META[normalizedCat]) {
      const meta = INCOME_CATEGORY_META[normalizedCat];
      const IconComp = meta.icon;
      return {
        label: t(`incomeCategories.${normalizedCat}`) || normalizedCat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: IconComp ? <IconComp size={12} /> : <DollarSign size={12} />,
        bg: meta.bg || 'rgba(16, 185, 129, 0.15)',
        color: meta.color || '#10b981',
        border: 'rgba(16, 185, 129, 0.3)'
      };
    }

    if (isWithdrawalEvent) {
      return {
        label: t('withdrawalModal.badge'),
        icon: <ArrowDownRight size={12} />,
        bg: 'rgba(239, 68, 68, 0.15)',
        color: TimelineColor.DANGER,
        border: 'rgba(239, 68, 68, 0.3)'
      };
    }

    if (INVESTMENT_CATEGORY_META[normalizedCat]) {
      const meta = INVESTMENT_CATEGORY_META[normalizedCat];
      const IconComp = meta.icon;
      return {
        label: t(`investmentCategories.${normalizedCat}`) || normalizedCat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: IconComp ? <IconComp size={12} /> : <TrendingUp size={12} />,
        bg: meta.bg || 'rgba(139, 92, 246, 0.15)',
        color: meta.color || '#8b5cf6',
        border: 'rgba(139, 92, 246, 0.3)'
      };
    }

    if (REMINDER_CATEGORY_META[normalizedCat] || Object.values(ReminderEventCategory).includes(normalizedCat)) {
      const meta = REMINDER_CATEGORY_META[normalizedCat] || {
        icon: Tag,
        color: '#f59e0b',
        bg: 'rgba(245, 158, 11, 0.15)'
      };
      const IconComp = meta.icon || Tag;
      const color = meta.color || '#f59e0b';
      return {
        label: t(`reminderCategories.${normalizedCat}`) || normalizedCat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        icon: <IconComp size={12} />,
        bg: meta.bg || `${color}26`,
        color,
        border: `${color}4d`
      };
    }

    switch (normalizedCat) {
      case 'meal_allowance':
      case 'mealallowance':
      case 'subsidio_alimentacao':
      case 'subsidio_refeicao':
        return {
          label: t('incomeCategories.meal_allowance') || '',
          icon: <Utensils size={12} />,
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'salary':
      case 'entrada_recorrente':
        return {
          label: t('incomeCategories.salary') || '',
          icon: <DollarSign size={12} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'bonus':
      case 'entrada_esporadica':
        return {
          label: t('incomeCategories.bonus') || '',
          icon: <Gift size={12} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#06b6d4',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      case 'freelance':
        return {
          label: t('incomeCategories.freelance') || '',
          icon: <Zap size={12} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#06b6d4',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      case 'investment_return':
        return {
          label: t('incomeCategories.investment_return') || '',
          icon: <TrendingUp size={12} />,
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#3b82f6',
          border: 'rgba(59, 130, 246, 0.3)'
        };
      case 'recurring_income':
        return {
          label: t('incomeCategories.recurring_income') || '',
          icon: <Repeat size={12} />,
          bg: 'rgba(20, 184, 166, 0.15)',
          color: '#14b8a6',
          border: 'rgba(20, 184, 166, 0.3)'
        };
      case 'saida_recorrente':
        return {
          label: 'Gasto Recorrente / Fixo',
          icon: <CreditCard size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'saida_esporadica':
      case 'gasto':
        return {
          label: 'Gasto / Saída',
          icon: <Tag size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'investimento_poupanca':
        return {
          label: 'Poupança',
          icon: <PiggyBank size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      case 'investimento_patrimonio':
        return {
          label: 'Património',
          icon: <Landmark size={12} />,
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          border: 'rgba(168, 85, 247, 0.3)'
        };
      case 'investimento_outros':
      case 'investimento_etf':
      case 'investimento_acoes':
      case 'investimento_extra':
        return {
          label: 'Outros Investimentos',
          icon: <Sparkles size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: '#818cf8',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      case 'parcela_emprestimo':
        return {
          label: 'Prestação / Parcela',
          icon: <CreditCard size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      case 'amortizacao':
        return {
          label: 'Amortização Extraordinária',
          icon: <TrendingDown size={12} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'repetitivo':
        return {
          label: 'Data Comemorativa / Aniversário',
          icon: <Repeat size={12} />,
          bg: 'rgba(236, 72, 153, 0.15)',
          color: '#f472b6',
          border: 'rgba(236, 72, 153, 0.3)'
        };
      case 'tarefa':
        return {
          label: 'Tarefa (Fixada)',
          icon: <Pin size={12} />,
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fcd34d',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'memoria':
        return {
          label: 'Memória / Nota',
          icon: <BookOpen size={12} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#6ee7b7',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'electricity':
        return {
          label: 'Eletricidade',
          icon: <Zap size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'water':
        return {
          label: 'Água',
          icon: <Tag size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'gas':
        return {
          label: 'Gás',
          icon: <Tag size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'communications':
        return {
          label: 'Comunicações / TV',
          icon: <CreditCard size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'rent':
        return {
          label: 'Renda / Habitação',
          icon: <Home size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'health':
        return {
          label: 'Saúde',
          icon: <Tag size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'food':
        return {
          label: 'Alimentação / Supermercado',
          icon: <ShoppingCart size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'transportation':
        return {
          label: 'Transporte / Combustível',
          icon: <Car size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'carmaintenance':
        return {
          label: 'Manutenção Auto',
          icon: <Car size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'house':
      case 'housemaintenance':
        return {
          label: 'Casa / Habitação',
          icon: <Home size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'services':
      case 'fixed_expense':
        return {
          label: 'Serviços',
          icon: <Sliders size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'ensurance':
        return {
          label: 'Seguros',
          icon: <FileText size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      default: {
        const cleaned = cat
          ? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Agendamento';
        return {
          label: cleaned,
          icon: <Tag size={12} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#67e8f9',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      }
    }
  };

  const catMeta = getCategoryMeta(event.category);

  const getCompletedTimeStr = () => {
    return event.completedAtTime || event.time || '10:00';
  };

  // Custom Status Badges
  const getCustomStatusBadge = () => {
    if (isReminderEvent) {
      if (isClosedReminder) {
        return {
          label: t('status.closed'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueReminder) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      return {
        label: t('status.open'),
        icon: <Clock size={11} />,
        bg: 'rgba(6, 182, 212, 0.15)',
        color: '#06b6d4',
        border: 'rgba(6, 182, 212, 0.3)'
      };
    }

    if (isIncomeEvent) {
      if (isReceivedIncome) {
        return {
          label: t('status.received'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueIncome) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      if (isNextIncome) {
        return {
          label: t(`status.${EventStatus.NEXT_INCOME}`),
          icon: <Clock size={11} />,
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: 'rgba(59, 130, 246, 0.35)'
        };
      }
      return {
        label: t(`status.${EventStatus.TO_RECEIVE}`),
        icon: <Clock size={11} />,
        bg: 'rgba(148, 163, 184, 0.1)',
        color: '#94a3b8',
        border: 'rgba(148, 163, 184, 0.2)'
      };
    }

    if (isLoanInstallment) {
      if (isPaidLoan) {
        return {
          label: t('status.settled'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueLoan) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      return {
        label: t('status.pending'),
        icon: <Circle size={11} />,
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    }

    if (isExpenseEvent) {
      if (isPaidExpense) {
        return {
          label: t('status.paid'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueExpense) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      return {
        label: t('status.pending'),
        icon: <Clock size={11} />,
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    }

    if (isInvestmentEvent) {
      if (isCompletedInvestment) {
        return {
          label: isWithdrawalEvent ? t('status.withdrawn') : t('status.invested'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      }
      if (isOverdueInvestment) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      return {
        label: t('status.planned'),
        icon: <Clock size={11} />,
        bg: 'rgba(99, 102, 241, 0.1)',
        color: 'var(--primary-light)',
        border: 'rgba(99, 102, 241, 0.2)'
      };
    }

    if (!isCompleted && isOverdue) {
      return {
        label: t('status.overdue'),
        icon: <AlertCircle size={11} />,
        bg: 'rgba(252, 191, 73, 0.18)',
        color: '#fcbf49',
        border: 'rgba(252, 191, 73, 0.4)',
        pulsing: true
      };
    }

    return null;
  };

  const statusBadge = getCustomStatusBadge();

  // Priority Badge Color
  const getPriorityStyle = (priority) => {
    const p = String(priority || '').toLowerCase();
    switch (p) {
      case EventPriority.URGENT:

        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' };
      case EventPriority.HIGH:

        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.3)' };
      case EventPriority.LOW:

        return { bg: 'rgba(100, 116, 139, 0.15)', text: '#94a3b8', border: 'rgba(100, 116, 139, 0.3)' };
      case EventPriority.NORMAL:

      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', text: 'var(--text-dim)', border: 'var(--border-glass)' };
    }
  };

  const priorityStyle = getPriorityStyle(event.priority);

  // Card specific backgrounds and theme palette
  const getCardTheme = () => {
    if (isIncomeEvent) {
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        lightText: '#34d399'
      };
    }
    if (isExpenseEvent) {
      return {
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.3)',
        lightText: '#fb7185'
      };
    }
    if (isInvestmentEvent) {
      return {
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.12)',
        border: 'rgba(139, 92, 246, 0.3)',
        lightText: '#a78bfa'
      };
    }
    if (isLoanInstallment) {
      return {
        color: '#0ea5e9',
        bg: 'rgba(14, 165, 233, 0.12)',
        border: 'rgba(14, 165, 233, 0.3)',
        lightText: '#38bdf8'
      };
    }
    if (isAmortization) {
      return {
        color: TimelineColor.INCOME,
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        lightText: TimelineColor.EMERALD
      };
    }
    return {
      color: 'var(--primary-light, #818cf8)',
      bg: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.3)',
      lightText: 'var(--text-main, #e2e8f0)'
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
    if (isExpenseEvent || event.timelineType === TimelineType.EXPENSE) {
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
    if (isInvestmentEvent || event.timelineType === TimelineType.INVESTMENT) {
      const p = getPaletteTheme(originColor || TimelineColor.INVESTMENT, TimelineColor.INVESTMENT);
      return {
        label: originName || t('sidebar.investmentTimeline'),
        icon: <PiggyBank size={11} strokeWidth={2.4} />,
        bg: hexToRgba(p.light, 0.22),
        color: p.primary,
        border: hexToRgba(p.medium, 0.40),
        timelineId: originId,
        tab: originId
      };
    }
    if (isIncomeEvent || event.timelineType === TimelineType.INCOME) {
      const p = getPaletteTheme(originColor || TimelineColor.INCOME, TimelineColor.INCOME);
      return {
        label: originName || t('sidebar.incomeTimeline'),
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

  const renderCardInnerHeader = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        width: '100%',
        marginBottom: '2px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
        {/* Ícone de Único, Recorrente ou Poupança/Retirada */}
        <span
          title={isVirtualWithdrawal ? t('withdrawalModal.depositBadge') : (isRecurring ? t('recurrence.recurring') : t('recurrence.once'))}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isFlatPositive ? TimelineColor.WHITE : (isVirtualWithdrawal ? TimelineColor.INVESTMENT : 'var(--primary-light)'),
            opacity: isFlatPositive ? 1 : 0.85,
            flexShrink: 0
          }}
        >
          {isVirtualWithdrawal ? (
            <PiggyBank size={14} strokeWidth={2.2} />
          ) : isRecurring ? (
            <Repeat size={14} strokeWidth={2.2} />
          ) : isRegisterEvent ? (
            <BookOpen size={14} strokeWidth={2.2} />
          ) : isTodoEvent ? (
            <CheckSquare size={14} strokeWidth={2.2} />
          ) : isFollowupEvent ? (
            isAnchorCard ? (
              <Flag size={14} strokeWidth={2.2} style={{ color: TimelineColor.WHITE }} />
            ) : isCompleted ? (
              <CheckCircle2 size={14} strokeWidth={2.2} style={{ color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.SUCCESS }} />
            ) : (
              <ListTree size={14} strokeWidth={2.2} style={{ color: TimelineColor.FOLLOWUP }} />
            )
          ) : isAmortization ? (
            <Zap size={14} strokeWidth={2.2} style={{ color: TimelineColor.WHITE }} />
          ) : (
            <Zap size={14} strokeWidth={2.2} />
          )}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
              {isVirtualWithdrawal && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.68rem',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '2px 7px',
                    borderRadius: '5px',
                    background: isFlatPositive ? 'rgba(255, 255, 255, 0.22)' : hexToRgba(TimelineColor.INCOME, 0.16),
                    color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.INCOME,
                    border: isFlatPositive ? '1px solid rgba(255, 255, 255, 0.35)' : `1px solid ${hexToRgba(TimelineColor.INCOME, 0.38)}`
                  }}
                >
                  {t('withdrawalModal.depositBadge')}
                </span>
              )}

              {/* Título do evento limpo e editável ao clicar */}
              {isEditingTitle && !isLockedPositive && !isCancelled ? (
                <form
                  onSubmit={handleSaveTitle}
                  onClick={(e) => e.stopPropagation()}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: '120px', margin: 0, padding: 0 }}
                >
                  <input
                    type="text"
                    autoFocus
                    value={tempTitle}
                    onFocus={(e) => e.target.select()}
                    onBlur={handleSaveTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') handleCancelTitle(e);
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className="editable-title-input"
                    style={{
                      margin: 0,
                      padding: '2px 6px',
                      fontSize: '0.98rem',
                      fontWeight: '700',
                      color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)',
                      background: isFlatPositive ? 'rgba(0,0,0,0.25)' : 'var(--bg-glass-input)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '4px',
                      outline: 'none',
                      width: '100%'
                    }}
                  />
                  <button
                    type="submit"
                    title={t('common.save')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.SUCCESS }}
                  >
                    <Check size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={handleCancelTitle}
                    title={t('common.cancel')}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px', color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-muted)' }}
                  >
                    <X size={14} />
                  </button>
                </form>
              ) : (
                <h3
                  onClick={() => {
                    if (isAmortized || isAnchorCard || isVirtual || isLockedPositive || isCancelled) return;
                    if (isLoanInstallment && originInfo && onNavigateToTimeline) {
                      onNavigateToTimeline(originInfo.id);
                    } else if (!isReadOnly) {
                      setIsEditingTitle(true);
                    }
                  }}
                  title={
                    isLockedPositive
                      ? t('timeline.lockedPositiveNotice')
                      : isVirtualWithdrawal
                        ? virtualWithdrawalDisplayTitle
                        : isVirtual
                          ? undefined
                          : isAmortized
                            ? t('event.amortizedTooltip')
                            : isLoanInstallment
                              ? t('event.loanInstallmentTooltip', { label: originInfo ? originInfo.label : t('loans.loan') })
                              : isRecurring
                                ? t('event.editNameRecurring')
                                : t('event.editName')
                  }
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: '700',
                    color: isFlatPositive ? TimelineColor.WHITE : ((isAmortized || isCancelled) ? 'var(--text-dim)' : 'var(--text-main)'),
                    textDecoration: (isAmortized || isCancelled) ? 'line-through' : 'none',
                    cursor: (isAmortized || isAnchorCard || isVirtual || isLockedPositive || isCancelled) ? 'default' : 'pointer'
                  }}
                >
                  {isVirtualWithdrawal
                    ? virtualWithdrawalDisplayTitle
                    : (event.title || '').replace(/^Retirada:\s*/i, '').replace(/^Withdrawal:\s*/i, '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')
                  }
                </h3>
              )}

              {/* Copy event id (same as the timeboard / timeline headers) */}
              {!isEditingTitle && !isVirtual && event.id && (
                <span onClick={(e) => e.stopPropagation()} style={{ display: 'inline-flex' }}>
                  <CopyIdButton id={event.id} />
                </span>
              )}

              {/* Labels / Tags next to Title */}
              <div className="tag-list" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {/* Custom Labels / Etiquetas */}
                {event.labels && event.labels.map((lbl, i) => (
                  <span
                    key={i}
                    className={isFlatPositive ? '' : 'event-tag'}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.70rem',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      background: isFlatPositive ? 'rgba(255, 255, 255, 0.2)' : undefined,
                      color: isFlatPositive ? TimelineColor.WHITE : undefined,
                      border: isFlatPositive ? '1px solid rgba(255, 255, 255, 0.35)' : undefined
                    }}
                  >
                    <Tag size={10} style={{ color: isFlatPositive ? TimelineColor.WHITE : undefined }} /> {lbl}
                  </span>
                ))}

                {/* Amortized badge */}
                {isAmortized && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        textTransform: 'uppercase',
                        letterSpacing: '0.02em',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <CheckCircle2 size={11} /> Abatida (Total Pago: 0,00 €)
                    </span>
                    {abatedBreakdown && abatedBreakdown.origInterest > 0 && (
                      <span
                        style={{
                          background: 'rgba(99, 102, 241, 0.12)',
                          color: 'var(--primary-light)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          padding: '2px 7px',
                          borderRadius: '5px',
                          fontSize: '0.68rem',
                          fontWeight: '800',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Sparkles size={11} /> Poupança: +{formatCurrency(abatedBreakdown.origInterest)} em juros
                      </span>
                    )}
                  </div>
                )}

                {event.author && (
                  <span className="event-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.70rem', padding: '2px 7px' }}>
                    <User size={10} /> {event.author}
                  </span>
                )}

                {/* Origin / Sub-vision Clean Text Indicator - On Balanço, Principal or Gastos for loans/investments */}
                {(isBalanceView || (activeFinancialTab === 'gastos' && (isLoanInstallment || isInvestmentEvent))) && originInfo && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (onNavigateToTimeline) {
                        onNavigateToTimeline(originInfo.timelineId, originInfo.tab);
                      }
                    }}
                    style={{
                      background: activeFinancialTab === 'gastos' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      border: activeFinancialTab === 'gastos' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid var(--border-glass)',
                      borderRadius: '5px',
                      padding: '2px 7px',
                      color: originInfo.color,
                      fontWeight: '700',
                      fontSize: '0.70rem',
                      cursor: onNavigateToTimeline ? 'pointer' : 'default',
                      pointerEvents: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      flexShrink: 0
                    }}
                    title={`Ir para a timeline do ${originInfo.label}`}
                  >
                    <span>{originInfo.label}</span>
                    <ArrowUpRight size={11} strokeWidth={2.5} style={{ opacity: 0.8 }} />
                  </button>
                )}
              </div>
            </div>

            {/* Informações da Obrigação: obligation ID em cima e person name abaixo alinhado à direita */}
            {isObligationEvent && (() => {
              const personDisplayName = obligationPerson?.name || obligationPerson?.personName || event.obligationPersonName || event.obligation_person_name || '';
              const personIdCode = obligationPerson?.obligatorIdentification || obligationPerson?.obligator_identification || obligationPerson?.taxId || obligationPerson?.tax_id || event.obligatorIdentification || event.obligator_identification || event.obligationIdentifier || event.obligation_identifier || '';
              const personType = obligationPerson?.type || PersonType.PERSON;

              return (
                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: '2px',
                    flexShrink: 0,
                    textAlign: 'right'
                  }}
                  title={
                    personDisplayName
                      ? `Obrigação: ${personIdCode ? `${personIdCode} - ` : ''}${personDisplayName} (${personType === PersonType.ORGANIZATION
                        ? (t('timeboardSettings.entities.types.organization') || 'Empresa')
                        : personType === PersonType.MEMBER
                          ? (t('timeboardSettings.entities.types.member') || 'Membro')
                          : (t('timeboardSettings.entities.types.person') || 'Pessoa')
                      })`
                      : (t('modal.obligation') || 'Obrigação')
                  }
                >
                  {/* Linha de cima: Person Name - bold */}
                  {personDisplayName ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.84rem',
                        fontWeight: '700',
                        color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)',
                        lineHeight: 1.2
                      }}
                    >
                      {personType === PersonType.ORGANIZATION ? (
                        <Building2 size={13} style={{ color: cardTheme.color || '#f59e0b', flexShrink: 0 }} />
                      ) : personType === PersonType.MEMBER ? (
                        <UserCheck size={13} style={{ color: cardTheme.color || '#f59e0b', flexShrink: 0 }} />
                      ) : (
                        <User size={13} style={{ color: cardTheme.color || '#f59e0b', flexShrink: 0 }} />
                      )}
                      <span>{personDisplayName}</span>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        color: cardTheme.color || '#f59e0b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        lineHeight: 1.2
                      }}
                    >
                      <FileCheck2 size={12} style={{ color: cardTheme.color || '#f59e0b', flexShrink: 0 }} />
                      <span>{t('modal.obligation') || 'Obrigação'}</span>
                    </div>
                  )}

                  {/* Linha de baixo: Obligation ID - sem negrito */}
                  {personIdCode && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: '400',
                        color: isFlatPositive ? 'rgba(255,255,255,0.7)' : 'var(--text-muted)',
                        lineHeight: 1.2
                      }}
                    >
                      <FileCheck2 size={11} style={{ opacity: 0.7, flexShrink: 0 }} />
                      <span>{personIdCode}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>


        </div>
      </div>
    </div>
  );

  const renderActionButtons = () => {
    if (isVirtual) return null;
    return (
      <div className="event-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {/* Botão Pagar até aqui para parcelas de empréstimo / dívida em aberto (apenas até ao mês atual) */}
      {isLoanInstallment && !isPaidLoan && onPayUpToHere && (event.date <= currentMonthEndStr) && (
        <button
          type="button"
          disabled={isPayingUpToHere}
          className="btn btn-secondary btn-sm"
          onClick={handlePayUpToHereClick}
          style={{
            padding: '3px 8px',
            fontSize: '0.72rem',
            gap: '4px',
            background: 'rgba(16, 185, 129, 0.14)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            fontWeight: '700',
            borderRadius: '5px',
            cursor: isPayingUpToHere ? 'not-allowed' : 'pointer',
            opacity: isPayingUpToHere ? 0.6 : 1,
            pointerEvents: isPayingUpToHere ? 'none' : 'auto',
            transition: 'all 0.15s ease'
          }}
          title={t('buttons.payUpToHereTitle') || "Marcar como pagas todas as prestações deste empréstimo anteriores a esta parcela (inclusive)"}
        >
          <CheckCircle2 size={12} style={{ color: '#10b981' }} />
          <span>{t('buttons.payUpToHere') || "Pagar até aqui"}</span>
        </button>
      )}

      {/* Botão de Notas (também disponível para utilizadores só de leitura) */}
      {(onEdit || isReadOnly) && !isAnchorCard && !isCondoPost && (() => {
        const allNotes = Array.isArray(event.notes)
          ? event.notes.filter(Boolean)
          : (event.description && !event.description.toLowerCase().includes('transferência bancária de vencimento') && event.description.trim() ? [event.description.trim()] : []);
        const hasNotes = allNotes.length > 0;

        return (
          <button
            type="button"
            className="action-icon-btn"
            onClick={(e) => {
              e.stopPropagation();
              setIsNotesExpanded(!isNotesExpanded);
            }}
            title={hasNotes ? `${t('actionNotes')} (${allNotes.length})` : t('actionAddNote')}
            style={{
              color: hasNotes ? (isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING) : (isFlatPositive ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)'),
              background: hasNotes ? (isFlatPositive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(245, 158, 11, 0.14)') : 'transparent',
              border: hasNotes ? (isFlatPositive ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(245, 158, 11, 0.35)') : '1px solid transparent',
              borderRadius: '5px',
              padding: '3px 5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileText size={13} />
            {hasNotes && (
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING }}>
                {allNotes.length}
              </span>
            )}
          </button>
        );
      })()}

      {/* Botão de Desmembrar Valor */}
      {!isLoanInstallment && !isFollowupEvent && !isAnchorCard && !isCondoPost && !isVirtual && !isLockedPositive && !isCancelled && (onUpdateEventDirect || onEdit) && (() => {
        const allSubparts = Array.isArray(event.breakdownItems) ? event.breakdownItems : [];
        const hasBreakdown = allSubparts.length > 0;

        return (
          <button
            type="button"
            className="action-icon-btn"
            onClick={(e) => {
              if (isDesmembramentoExpanded) {
                handleCancelDesmembramento(e);
              } else {
                openDesmembramento(e);
              }
            }}
            title={hasBreakdown ? t('actionBreakdown', { count: allSubparts.length }) : t('actionSplitValue')}
            style={{
              color: hasBreakdown ? 'var(--primary-light)' : 'var(--text-dim)',
              background: hasBreakdown ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
              border: hasBreakdown ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
              borderRadius: '5px',
              padding: '3px 5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Layers size={13} />
            {hasBreakdown && (
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {allSubparts.length}
              </span>
            )}
          </button>
        );
      })()}

      {/* Botão / Indicador de Evento Automático (Apenas para Eventos Recorrentes / Parcelamentos e não trancados/cancelados) */}
      {isRecurringEvent && !isReadOnly && !isLockedPositive && !isCancelled && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            if (!onUpdateEventDirect) return;
            const nextAuto = !localAuto;
            setLocalAuto(nextAuto);

            const targetSeriesKey = event.seriesId || event.eventId;

            let newStatus = event.status;
            let newIsCompleted = Boolean(event.isCompleted);

            if (nextAuto) {
              const isPastOrToday = Boolean(event.date && event.date <= todayStr);
              if (isPastOrToday && !isCancelledStatus(event.status) && event.status !== EventStatus.DELETED) {
                if (isIncomeEvent) {
                  newStatus = EventStatus.RECEIVED;
                  newIsCompleted = true;
                } else if (isWithdrawalEvent) {
                  newStatus = EventStatus.WITHDRAWN;
                  newIsCompleted = true;
                } else if (isInvestmentEvent) {
                  newStatus = EventStatus.INVESTED;
                  newIsCompleted = true;
                } else if (isAmortization) {
                  newStatus = EventStatus.AMORTIZED;
                  newIsCompleted = true;
                } else {
                  newStatus = EventStatus.PAID;
                  newIsCompleted = true;
                }
              }
              setLocalStatus(newStatus);
            }

            onUpdateEventDirect({
              ...event,
              seriesId: targetSeriesKey,
              automatic: nextAuto,
              isAutomatic: nextAuto,
              status: newStatus,
              isCompleted: newIsCompleted,
              updateScope: 'all_series'
            });
          }}
          title={localAuto ? t('event.autoMovementActiveTitle') : t('event.autoMovementManualTitle')}
          style={{
            color: localAuto ? TimelineColor.WARNING : 'var(--text-dim)',
            background: localAuto ? 'rgba(251, 191, 36, 0.16)' : 'transparent',
            border: localAuto ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid transparent',
            borderRadius: '5px',
            padding: '2px 5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Zap size={12} fill={localAuto ? TimelineColor.WARNING : 'none'} />
          {localAuto && (
            <span style={{ fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.02em', color: TimelineColor.WARNING }}>
              AUTO
            </span>
          )}
        </button>
      )}

      {/* Botão Cancelar / Reativar Post (condoflow): reativar volta a "não publicado" */}
      {isCondoPost && onUpdateEventDirect && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => setPostPublishStatus(e, isCancelledPost ? DiaryPublishStatus.UNPUBLISHED : DiaryPublishStatus.CANCELLED)}
          title={isCancelledPost ? t('actionReactivateEvent') : t('actionCancelEvent')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isCancelledPost ? TimelineColor.WARNING : 'var(--text-dim)',
            background: isCancelledPost ? `${TimelineColor.WARNING}24` : 'transparent',
            border: `1px solid ${isCancelledPost ? `${TimelineColor.WARNING}59` : 'transparent'}`,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          <Ban size={13} />
        </button>
      )}

      {/* Botão Cancelar / Reativar Evento */}
      {!isAnchorCard && !isLoanInstallment && !isCondoPost && onToggleLoanPayment && (
        <button
          type="button"
          className="action-icon-btn"
          disabled={isTogglingStatus}
          onClick={(e) => {
            e.stopPropagation();
            if (isCancelled) {
              // Reactivating goes back to the event's open (negative) status; "overdue" is derived from the date
              const uncancelledStatus = isInvestmentEvent
                ? EventStatus.PLANNED
                : isReminderEvent
                  ? EventStatus.OPEN
                  : isFollowupEvent
                    ? FollowupStatus.IN_PROGRESS
                    : EventStatus.PENDING;
              handleStatusToggle(e, uncancelledStatus);
            } else {
              handleStatusToggle(e, EventStatus.CANCELLED);
            }
          }}
          title={isCancelled ? t('actionReactivateEvent') : t('actionCancelEvent')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isCancelled ? (isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING) : (isFlatPositive ? TimelineColor.WHITE : 'var(--text-dim)'),
            background: isCancelled ? (isFlatPositive ? 'rgba(255, 255, 255, 0.25)' : 'rgba(245, 158, 11, 0.14)') : 'transparent',
            border: isCancelled ? (isFlatPositive ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(245, 158, 11, 0.35)') : '1px solid transparent',
            cursor: isTogglingStatus ? 'wait' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center'
          }}
        >
          <Ban size={13} style={{ color: isCancelled ? (isFlatPositive ? TimelineColor.WHITE : TimelineColor.WARNING) : (isFlatPositive ? TimelineColor.WHITE : undefined) }} />
        </button>
      )}

      {/* Botão Imprimir Recibo - Apenas para evento com obligator e status positivo */}
      {isObligationEvent && onPrintReceipt && isPositiveStatus(effectiveStatus) && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onPrintReceipt(event, obligationPerson);
          }}
          title={t('receipt.printReceipt')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : 'var(--primary-light)',
            background: isFlatPositive ? 'rgba(255, 255, 255, 0.22)' : 'rgba(99, 102, 241, 0.15)',
            border: isFlatPositive ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(99, 102, 241, 0.35)',
            display: 'inline-flex',
            alignItems: 'center',
            cursor: 'pointer'
          }}
        >
          <Printer size={13} style={{ color: isFlatPositive ? TimelineColor.WHITE : 'var(--primary-light)' }} />
        </button>
      )}

      {/* Indicador de Cadeado (Trancado) para eventos financeiros positivos (oculto para utilizadores só de leitura) */}
      {isLockedPositive && !isReadOnly && (
        <span
          title={t('timeline.lockedPositiveNotice')}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-dim)',
            opacity: 0.9
          }}
        >
          <Lock size={13} />
        </span>
      )}

      {/* Botão Editar Evento - Não permitido para parcelas de empréstimo, eventos virtuais ou eventos trancados/cancelados */}
      {onEdit && !isLoanInstallment && !isVirtual && !isLockedPositive && !isCancelled && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
          title={t('actionEdit')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? TimelineColor.WHITE : undefined
          }}
        >
          <Edit3 size={13} style={{ color: isFlatPositive ? TimelineColor.WHITE : undefined }} />
        </button>
      )}

      {/* Botão Eliminar Evento - Não permitido para parcelas de empréstimo ou eventos virtuais */}
      {onDelete && !isLoanInstallment && !isVirtual && (
        <button
          type="button"
          className="action-icon-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event);
          }}
          title={t('actionDelete')}
          style={{
            padding: '3px 5px',
            borderRadius: '5px',
            color: isFlatPositive ? 'rgba(255, 255, 255, 0.9)' : undefined
          }}
        >
          <Trash2 size={13} style={{ color: isFlatPositive ? 'rgba(255, 255, 255, 0.9)' : undefined }} />
        </button>
      )}
    </div>
  );
};

  return (
    <div
      className={`event-inner-item ${isMemoryCard ? 'memory-card' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}
    >
      {/* 💰 Income (Entrada) Financial Highlight Strip (boc in) */}
      {isIncomeEvent && (
        <div
          className={`loan-breakdown-strip ${isReceivedIncome ? 'flat-positive-card flat-positive-income' : ''}`}
          style={{
            background: isReceivedIncome
              ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
              : 'transparent',
            border: isReceivedIncome ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            color: isReceivedIncome ? TimelineColor.WHITE : 'inherit',
            boxShadow: isReceivedIncome ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [receipt number or empty] (left) e [b status] (right, apenas não virtual) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            {renderReceiptRef(isReceivedIncome)}
            {!isVirtual && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
                {renderStatusDropdownButton(
                  {
                    className: 'btn btn-sm',
                    title: t('timeline.clickToChangeStatus'),
                    style: {
                      background: isCancelled
                        ? 'rgba(148, 163, 184, 0.15)'
                        : isReceivedIncome
                          ? 'rgba(255, 255, 255, 0.25)'
                          : isOverdueIncome
                            ? 'rgba(252, 191, 73, 0.16)'
                            : 'rgba(245, 158, 11, 0.14)',
                      color: isCancelled
                        ? TimelineColor.SLATE
                        : isReceivedIncome
                          ? TimelineColor.WHITE
                          : isOverdueIncome
                            ? TimelineColor.WARNING
                            : TimelineColor.WARNING,
                      border: isCancelled
                        ? '1px solid rgba(148, 163, 184, 0.35)'
                        : isReceivedIncome
                          ? '1px solid rgba(255, 255, 255, 0.4)'
                          : isOverdueIncome
                            ? '1px solid rgba(252, 191, 73, 0.4)'
                            : '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '9999px',
                      padding: '4px 12px',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: isTogglingStatus ? 'wait' : 'pointer',
                      opacity: isTogglingStatus ? 0.6 : 1,
                      pointerEvents: isTogglingStatus ? 'none' : 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                      boxShadow: isOverdueIncome
                        ? '0 2px 10px rgba(252, 191, 73, 0.25)'
                        : 'none'
                    }
                  },
                  isFutureMonth ? (
                    <>
                      <Clock size={13} style={{ color: isReceivedIncome ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)' }} />
                      <span style={{ color: isReceivedIncome ? TimelineColor.WHITE : undefined }}>{t('status.toReceive')}</span>
                    </>
                  ) : isCancelled ? (
                    <>
                      <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                      <span>{t('status.cancelled')}</span>
                    </>
                  ) : isReceivedIncome ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                      <span style={{ color: TimelineColor.WHITE }}>{t('status.received')}</span>
                      <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
                    </>
                  ) : isOverdueIncome ? (
                    <>
                      <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                      <span>{t('status.overdue')}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} style={{ color: TimelineColor.WARNING }} />
                      <span>{t('status.toReceive')}</span>
                    </>
                  )
                )}
              </div>
            )}
          </div>
          {renderReceiptDateEditor()}
          {renderReceiptNumberEditor()}

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: isReceivedIncome ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderEditableAmount('+', isCancelled ? TimelineColor.SLATE : isReceivedIncome ? TimelineColor.WHITE : TimelineColor.WARNING)}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 🛒 Expense (Gasto/Saída) Financial Highlight Strip (boc in) */}
      {isExpenseEvent && (
        <div
          className={`loan-breakdown-strip ${isPaidExpense ? 'flat-positive-card flat-positive-expense' : ''}`}
          style={{
            background: isPaidExpense
              ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
              : 'transparent',
            border: isPaidExpense ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            color: isPaidExpense ? TimelineColor.WHITE : 'inherit',
            boxShadow: isPaidExpense ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [receipt number or empty] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '0px' }}>
              {renderReceiptRef(isPaidExpense)}
              {event.priority && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidExpense ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isPaidExpense ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('timeline.priority')}:
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isPaidExpense ? TimelineColor.WHITE : 'var(--text-main)' }}>
                    {event.priority}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {renderStatusDropdownButton(
                {
                  className: 'btn btn-sm',
                  title: t('timeline.clickToChangeStatus'),
                  style: {
                    background: isCancelled
                      ? 'rgba(148, 163, 184, 0.15)'
                      : isPaidExpense
                        ? 'rgba(255, 255, 255, 0.25)'
                        : isOverdueExpense
                          ? 'rgba(252, 191, 73, 0.16)'
                          : 'rgba(245, 158, 11, 0.14)',
                    color: isCancelled
                      ? TimelineColor.SLATE
                      : isPaidExpense
                        ? TimelineColor.WHITE
                        : isOverdueExpense
                          ? TimelineColor.WARNING
                          : TimelineColor.WARNING,
                    border: isCancelled
                      ? '1px solid rgba(148, 163, 184, 0.35)'
                      : isPaidExpense
                        ? '1px solid rgba(255, 255, 255, 0.4)'
                        : isOverdueExpense
                          ? '1px solid rgba(252, 191, 73, 0.4)'
                          : '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'wait' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }
                },
                isFutureMonth ? (
                  <>
                    <Clock size={13} style={{ color: isPaidExpense ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)' }} />
                    <span style={{ color: isPaidExpense ? TimelineColor.WHITE : undefined }}>{t('status.toPay')}</span>
                  </>
                ) : isCancelled ? (
                  <>
                    <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                    <span>{t('status.cancelled')}</span>
                  </>
                ) : isPaidExpense ? (
                  <>
                    <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                    <span style={{ color: TimelineColor.WHITE }}>{t('status.paid')}</span>
                    <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
                  </>
                ) : isOverdueExpense ? (
                  <>
                    <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                    <span>{t('status.overdue')}</span>
                  </>
                ) : (
                  <>
                    <Clock size={13} style={{ color: TimelineColor.WARNING }} />
                    <span>{t('status.toPay')}</span>
                  </>
                )
              )}
            </div>
          </div>
          {renderReceiptDateEditor()}
          {renderReceiptNumberEditor()}

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: isPaidExpense ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderEditableAmount('-', isCancelled ? TimelineColor.SLATE : isPaidExpense ? TimelineColor.WHITE : TimelineColor.EXPENSE)}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 📈 Investment (Investimento/Poupança/Património) Financial Highlight Strip (boc in) */}
      {isInvestmentEvent && (
        <div
          className={`loan-breakdown-strip ${isCompletedInvestment ? 'flat-positive-card flat-positive-investment' : ''}`}
          style={{
            background: isCompletedInvestment
              ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
              : 'transparent',
            border: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            color: isCompletedInvestment ? TimelineColor.WHITE : 'inherit',
            boxShadow: isCompletedInvestment ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [receipt number or category label] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingBottom: '0px' }}>
              {renderReceiptRef(isCompletedInvestment)}

              {event.category === 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && Number(event.amount || 0) > 0 && Number(event.initialInvestedAmount) !== Number(event.amount) && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                    <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                      {t('timeline.acquisition')}:
                    </span>
                    <span style={{ fontSize: '0.80rem', fontWeight: '700', color: isCompletedInvestment ? TimelineColor.WHITE : 'var(--primary-light)' }}>
                      {formatCurrency(event.initialInvestedAmount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                    <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? TimelineColor.WHITE : (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? TimelineColor.INCOME : TimelineColor.EXPENSE, textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <TrendingUp size={11} /> {t('timeline.valuation')}:
                    </span>
                    <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? TimelineColor.INCOME : TimelineColor.EXPENSE }}>
                      {(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                      {formatCurrency(Number(event.amount) - Number(event.initialInvestedAmount))}
                      <span style={{ fontSize: '0.70rem', marginLeft: '4px', fontWeight: '700' }}>
                        ({(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                        {(((Number(event.amount) - Number(event.initialInvestedAmount)) / Number(event.initialInvestedAmount)) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                </>
              )}

              {event.category === 'investimento_patrimonio' && event.linkedLoanTimelineName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.SKY, textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CreditCard size={11} /> {t('timeline.financing')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '700', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.SKY }}>
                    {event.linkedLoanTimelineName}
                  </span>
                </div>
              )}

              {!event.pocketId && !event.pocket_id && event.category !== 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && (event.isFirstOccurrence === true || (!event.isProjected && !event.eventId || event.seriesId) || (event.isFirstOccurrence !== false && !event.isProjected)) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('timeline.initialContribution')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : 'var(--primary-light)' }}>
                    {formatCurrency(event.initialInvestedAmount)}
                  </span>
                </div>
              )}

              {!event.pocketId && !event.pocket_id && event.category !== 'investimento_patrimonio' && Number(event.targetAmount || 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INVESTMENT, textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Target size={11} /> {t('timeline.goal')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INVESTMENT }}>
                    {formatCurrency(event.targetAmount)}
                  </span>
                </div>
              )}

              {(event.isExternal || event.is_external) && (
                <div style={{ display: 'flex', alignItems: 'center', borderLeft: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span
                    style={{
                      background: isCompletedInvestment ? 'rgba(255, 255, 255, 0.2)' : 'rgba(139, 92, 246, 0.14)',
                      color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.PRIMARY_LIGHT,
                      border: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.35)' : '1px solid rgba(139, 92, 246, 0.35)',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={t('modal.isExternalDepositHint')}
                  >
                    <ExternalLink size={10} strokeWidth={2.5} />
                    <span>{t('modal.externalDeposit')}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Status Pill & Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {renderStatusDropdownButton(
                {
                  className: 'btn btn-sm',
                  title: t('timeline.clickToChangeStatus'),
                  style: {
                    background: isCancelled
                      ? 'rgba(148, 163, 184, 0.15)'
                      : event.category === 'investimento_patrimonio'
                        ? (event.status === 'Financiado' ? 'rgba(2, 132, 199, 0.16)' : (isCompletedInvestment ? 'rgba(255, 255, 255, 0.25)' : 'rgba(16, 185, 129, 0.16)'))
                        : isCompletedInvestment
                          ? 'rgba(255, 255, 255, 0.25)'
                          : isOverdueInvestment
                            ? 'rgba(252, 191, 73, 0.16)'
                            : 'rgba(139, 92, 246, 0.14)',
                    color: isCancelled
                      ? TimelineColor.SLATE
                      : event.category === 'investimento_patrimonio'
                        ? (event.status === 'Financiado' ? TimelineColor.CYAN : (isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INCOME))
                        : isCompletedInvestment
                          ? TimelineColor.WHITE
                          : isOverdueInvestment
                            ? TimelineColor.WARNING
                            : TimelineColor.INVESTMENT,
                    border: isCancelled
                      ? '1px solid rgba(148, 163, 184, 0.35)'
                      : event.category === 'investimento_patrimonio'
                        ? (event.status === 'Financiado' ? '1px solid rgba(2, 132, 199, 0.4)' : (isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)'))
                        : isCompletedInvestment
                          ? '1px solid rgba(255, 255, 255, 0.4)'
                          : isOverdueInvestment
                            ? '1px solid rgba(252, 191, 73, 0.4)'
                            : '1px solid rgba(139, 92, 246, 0.35)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'wait' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }
                },
                isFutureMonth ? (
                  <>
                    <Clock size={13} style={{ color: isCompletedInvestment ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)' }} />
                    <span style={{ color: isCompletedInvestment ? TimelineColor.WHITE : undefined }}>{t('status.planned')}</span>
                  </>
                ) : isCancelled ? (
                  <>
                    <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                    <span>{t('status.cancelled')}</span>
                  </>
                ) : event.category === 'investimento_patrimonio' ? (
                  event.status === 'Financiado' ? (
                    <>
                      <CreditCard size={13} style={{ color: TimelineColor.CYAN }} />
                      <span>{t('status.financed')}</span>
                    </>
                  ) : (
                    <>
                      <Landmark size={13} style={{ color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INCOME }} />
                      <span style={{ color: isCompletedInvestment ? TimelineColor.WHITE : undefined }}>{t('status.paidOff')}</span>
                    </>
                  )
                ) : isCompletedInvestment ? (
                  <>
                    <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                    <span style={{ color: TimelineColor.WHITE }}>{isWithdrawalEvent ? t('status.withdrawn') : t('status.invested')}</span>
                    <Lock size={11} style={{ color: TimelineColor.WHITE, marginLeft: '2px' }} />
                  </>
                ) : isOverdueInvestment ? (
                  <>
                    <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                    <span>{t('status.overdue')}</span>
                  </>
                ) : (
                  <>
                    <Clock size={13} style={{ color: TimelineColor.INVESTMENT }} />
                    <span>{t('status.planned')}</span>
                  </>
                )
              )}
            </div>
          </div>
          {renderReceiptDateEditor()}
          {renderReceiptNumberEditor()}

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: isCompletedInvestment ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {event.category === 'investimento_patrimonio' ? (
                <span style={{ fontSize: '1.05rem', fontWeight: '800', color: isCompletedInvestment ? TimelineColor.WHITE : TimelineColor.INVESTMENT }}>
                  +{formatCurrency(event.amount || event.initialInvestedAmount || 0)}
                </span>
              ) : (
                renderEditableAmount(
                  isWithdrawalEvent ? '-' : '+',
                  isCancelled
                    ? TimelineColor.SLATE
                    : isCompletedInvestment
                    ? TimelineColor.WHITE
                    : isWithdrawalEvent
                    ? TimelineColor.DANGER
                    : TimelineColor.INVESTMENT
                )
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>

          {/* 🎯 Barra de Progresso da Meta de Poupança / Investimento */}
          {!event.pocketId && !event.pocket_id && Number(event.targetAmount || 0) > 0 && (() => {
            const seriesId = event.eventId || event.seriesId || event.id;
            let baseInitial = Number(event.initialInvestedAmount || 0);
            if (!baseInitial) {
              const sourceEv = (allEvents || []).find((ev) => {
                if (!ev || !Number(ev.initialInvestedAmount || 0)) return false;
                return Boolean(
                  (ev.eventType === EventType.INVESTMENT || ev.eventType === 'investimento' || ev.isInvestment) &&
                  (
                    (ev.eventId && (ev.eventId === seriesId || ev.eventId === event.eventId || ev.eventId === event.seriesId)) ||
                    (ev.seriesId && (ev.seriesId === seriesId || ev.seriesId === event.seriesId || ev.seriesId === event.eventId)) ||
                    (ev.id && (ev.id === seriesId || ev.id === event.eventId || ev.id === event.seriesId)) ||
                    (ev.sobrepositionOver && (ev.sobrepositionOver === seriesId || ev.sobrepositionOver === event.eventId || ev.sobrepositionOver === event.seriesId)) ||
                    (event.title && ev.title && ev.title.trim().toLowerCase() === event.title.trim().toLowerCase())
                  )
                );
              });
              if (sourceEv) {
                baseInitial = Number(sourceEv.initialInvestedAmount || 0);
              }
            }

            const isInvestmentsView = activeFinancialTab === 'investimentos' || timelineType === 'investimentos' || event.timelineOriginId === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';
            const isFuture = event.date > todayStr;
            const useForecast = isInvestmentsView && isFuture;

            const isMatchingSeriesEvent = (ev) => {
              if (!ev || !ev.date) return false;
              if (ev.status === 'Cancelado' || ev.status === 'cancelled' || ev.status === 'Excluido' || ev.status === 'deleted' || ev.isDeleted) return false;
              const isInv = ev.eventType === EventType.INVESTMENT || ev.eventType === 'investimento' || ev.isInvestment;
              if (!isInv) return false;
              return Boolean(
                (ev.eventId && (ev.eventId === seriesId || ev.eventId === event.eventId || ev.eventId === event.seriesId)) ||
                (ev.seriesId && (ev.seriesId === seriesId || ev.seriesId === event.seriesId || ev.seriesId === event.eventId)) ||
                (ev.id && (ev.id === seriesId || ev.id === event.eventId || ev.id === event.seriesId)) ||
                (ev.sobrepositionOver && (ev.sobrepositionOver === seriesId || ev.sobrepositionOver === event.eventId || ev.sobrepositionOver === event.seriesId)) ||
                (event.title && ev.title && ev.title.trim().toLowerCase() === event.title.trim().toLowerCase())
              );
            };

            let currentSaved = baseInitial;
            if (useForecast) {
              const priorPlannedAportes = (allEvents || [])
                .filter((ev) => isMatchingSeriesEvent(ev) && ev.date < event.date)
                .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);
              const thisMonthAmount = Number(event.amount || 0);
              currentSaved = baseInitial + priorPlannedAportes + thisMonthAmount;
            } else {
              const priorRealizedAportes = (allEvents || [])
                .filter((ev) => {
                  if (!isMatchingSeriesEvent(ev) || ev.date >= event.date) return false;
                  return ev.status === 'Investido' || ev.status === 'invested' || ev.status === 'Pago' || ev.status === 'paid' || ev.isCompleted;
                })
                .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);
              const thisMonthRealized = isCompletedInvestment ? Number(event.amount || 0) : 0;
              currentSaved = baseInitial + priorRealizedAportes + thisMonthRealized;
            }

            const targetVal = Number(event.targetAmount);
            const progressPct = Math.min(100, Math.max(0, Math.round((currentSaved / targetVal) * 100)));
            const labelTitle = useForecast
              ? `Previsão de Progresso da Meta (${formatCurrency(currentSaved)} de ${formatCurrency(targetVal)})`
              : `Progresso da Meta (${formatCurrency(currentSaved)} de ${formatCurrency(targetVal)})`;
            const labelPercent = useForecast
              ? (progressPct >= 100 ? '🎉 Meta Atingida (Previsão)!' : `${progressPct}% previsto`)
              : (progressPct >= 100 ? '🎉 Meta Atingida!' : `${progressPct}% alcançado`);

            return (
              <div
                style={{
                  width: '100%',
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(139, 92, 246, 0.15)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: useForecast ? TimelineColor.PRIMARY_LIGHT : TimelineColor.PRIMARY,
                    marginBottom: '4px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Target size={11} />
                    <span>{labelTitle}</span>
                  </span>
                  <span style={{ color: progressPct >= 100 ? TimelineColor.SUCCESS : TimelineColor.PRIMARY_LIGHT, fontWeight: '800' }}>
                    {labelPercent}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '5px',
                    background: 'rgba(148, 163, 184, 0.15)',
                    borderRadius: '9999px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}
                >
                  <div
                    style={{
                      width: `${progressPct}%`,
                      height: '100%',
                      background: progressPct >= 100
                        ? `linear-gradient(90deg, ${TimelineColor.SUCCESS} 0%, ${TimelineColor.EMERALD} 100%)`
                        : useForecast
                          ? `linear-gradient(90deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PRIMARY_LIGHT} 100%)`
                          : `linear-gradient(90deg, ${TimelineColor.PRIMARY} 0%, ${TimelineColor.PRIMARY_LIGHT} 100%)`,
                      borderRadius: '9999px',
                      transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                      boxShadow: '0 0 10px rgba(99, 102, 241, 0.45)'
                    }}
                  />
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* ⚡ Amortização Extraordinária Strip (flat green with white text) */}
      {isAmortization && (
        <div
          className="amortization-event-strip"
          style={{
            background: TimelineColor.INCOME,
            border: `1px solid ${TimelineColor.INCOME}`,
            borderRadius: '8px',
            padding: '8px 12px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            color: TimelineColor.WHITE,
            boxShadow: '0 4px 14px rgba(16, 185, 129, 0.28)'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', fontWeight: '700' }}>
                {t('loanCard.amortizedValue')}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', fontWeight: '700' }}>
                  {t('loanCard.purpose')}
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: TimelineColor.WHITE }}>
                  {event.strategy === AmortizationEventCategory.REDUCE_INSTALLMENT || event.category === AmortizationEventCategory.REDUCE_INSTALLMENT
                    ? t('loanCard.reduceInstallment')
                    : t('loanCard.reduceTerm')}
                </span>
              </div>
              {event.balanceAfter !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid rgba(255, 255, 255, 0.25)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'rgba(255, 255, 255, 0.85)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('loanCard.remainingBalanceAfter')}
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: TimelineColor.WHITE }}>
                    {formatCurrency(event.balanceAfter)}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {renderStatusDropdownButton(
                {
                  title: t('timeline.clickToChangeStatus'),
                  style: {
                    background: isCancelled
                      ? 'rgba(0, 0, 0, 0.2)'
                      : (isCompleted || isPositiveStatus(effectiveStatus) || effectiveStatus === EventStatus.AMORTIZED)
                        ? 'rgba(255, 255, 255, 0.25)'
                        : 'rgba(255, 255, 255, 0.18)',
                    color: TimelineColor.WHITE,
                    border: isCancelled
                      ? '1px solid rgba(255, 255, 255, 0.25)'
                      : '1px solid rgba(255, 255, 255, 0.4)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: isTogglingStatus ? 'wait' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    transition: 'all 0.15s ease'
                  }
                },
                isFutureMonth ? (
                  <>
                    <Clock size={13} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
                    <span style={{ color: TimelineColor.WHITE }}>{t('status.pending')}</span>
                  </>
                ) : isCancelled ? (
                  <>
                    <Ban size={13} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
                    <span style={{ color: TimelineColor.WHITE }}>{t('status.cancelled')}</span>
                  </>
                ) : (isCompleted || isPositiveStatus(effectiveStatus) || effectiveStatus === EventStatus.AMORTIZED) ? (
                  <>
                    <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                    <span style={{ color: TimelineColor.WHITE }}>{t('status.amortized')}</span>
                  </>
                ) : (
                  <>
                    <Clock size={13} style={{ color: 'rgba(255, 255, 255, 0.85)' }} />
                    <span style={{ color: TimelineColor.WHITE }}>{t('status.pending')}</span>
                  </>
                )
              )}
            </div>
          </div>

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: '1px solid rgba(255, 255, 255, 0.2)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: '800', color: TimelineColor.WHITE }}>
                +{formatCurrency(event.amount || event.amortizationAmount || 0)}
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 🏦 Loan Installment Principal / Interest Breakdown Strip (boc in) */}
      {isLoanInstallment && (
        <div
          className={`loan-breakdown-strip ${isPaidLoan ? 'flat-positive-card flat-positive-loan' : ''}`}
          style={{
            background: isPaidLoan
              ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
              : 'transparent',
            border: isPaidLoan ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            color: isPaidLoan ? TimelineColor.WHITE : 'inherit',
            boxShadow: isPaidLoan ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo & decomposição] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingBottom: '0px' }}>
              <span style={{ fontSize: '0.7rem', color: isPaidLoan ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
                {isAmortized ? t('loanCard.totalPaid') : t('loanCard.totalInstallment')}
              </span>

              {reducedBreakdown && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isPaidLoan ? 'rgba(255, 255, 255, 0.85)' : TimelineColor.INCOME, textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('loanCard.totalAmortized')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : TimelineColor.INCOME }} title="Valor abatido/poupado nesta prestação">
                    +{formatCurrency(reducedBreakdown.amortizedAmount)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: isPaidLoan ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  {isAmortized ? t('loanCard.capitalAbated') : t('loanCard.capitalDebt')}:
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : (isAmortized ? 'var(--text-dim)' : 'var(--text-main)') }}>
                  {isAmortized
                    ? formatCurrency(abatedBreakdown?.origCapital || event.originalInstallmentCapital || 0)
                    : formatCurrency(event.installmentCapital ?? event.principalAmount ?? event.principal_amount ?? 0)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: isPaidLoan ? 'rgba(255, 255, 255, 0.85)' : (isAmortized ? TimelineColor.INCOME : 'var(--text-dim)'), textTransform: 'uppercase', fontWeight: '700' }}>
                  {isAmortized ? t('loanCard.interestSaved') : t('loanCard.interest')}:
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : (isAmortized ? TimelineColor.INCOME : TimelineColor.WARNING) }}>
                  {isAmortized
                    ? `+${formatCurrency(abatedBreakdown?.origInterest || event.savedInterest || event.originalInstallmentInterest || 0)}`
                    : formatCurrency(event.installmentInterest ?? event.interestPortion ?? event.interest_portion ?? 0)}
                </span>
              </div>

              {!isAmortized && ((event.installmentFee ?? event.taxAmount ?? event.tax_amount ?? 0) > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isPaidLoan ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('loanCard.stampTax')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : TimelineColor.PURPLE }}>
                    {formatCurrency(event.installmentFee ?? event.taxAmount ?? event.tax_amount ?? 0)}
                  </span>
                </div>
              )}

              {(event.balanceAfter !== undefined || event.remainingDebtAfter !== undefined || event.remaining_debt_after !== undefined) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isPaidLoan ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isPaidLoan ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('loanCard.remainingDebt')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : (isAmortized ? TimelineColor.SLATE : 'var(--primary-light)') }}>
                    {formatCurrency(event.balanceAfter !== undefined ? event.balanceAfter : (event.remainingDebtAfter !== undefined ? event.remainingDebtAfter : (event.remaining_debt_after || 0)))}
                  </span>
                </div>
              )}
            </div>

            {/* Inline Loan Payment Fast Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {isAmortized ? (
                <div
                  style={{
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: TimelineColor.SLATE,
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'not-allowed',
                    userSelect: 'none'
                  }}
                  title="Parcela abatida por amortização extraordinária antecipada."
                >
                  <CheckCircle2 size={13} style={{ color: TimelineColor.SLATE }} />
                  <span>{t('status.abatida')}</span>
                </div>
              ) : (
                renderStatusDropdownButton(
                  {
                    className: 'btn btn-sm',
                    title: t('timeline.clickToChangeStatus'),
                    style: {
                      background: isCancelled
                        ? 'rgba(148, 163, 184, 0.15)'
                        : isPaidLoan
                          ? 'rgba(255, 255, 255, 0.25)'
                          : isOverdueLoan
                            ? 'rgba(252, 191, 73, 0.16)'
                            : 'rgba(245, 158, 11, 0.14)',
                      color: isCancelled
                        ? TimelineColor.SLATE
                        : isPaidLoan
                          ? TimelineColor.WHITE
                          : isOverdueLoan
                            ? TimelineColor.WARNING
                            : TimelineColor.WARNING,
                      border: isCancelled
                        ? '1px solid rgba(148, 163, 184, 0.35)'
                        : isPaidLoan
                          ? '1px solid rgba(255, 255, 255, 0.4)'
                          : isOverdueLoan
                            ? '1px solid rgba(252, 191, 73, 0.4)'
                            : '1px solid rgba(245, 158, 11, 0.35)',
                      borderRadius: '9999px',
                      padding: '4px 12px',
                      fontSize: '0.76rem',
                      fontWeight: '700',
                      cursor: isTogglingStatus ? 'wait' : 'pointer',
                      opacity: isTogglingStatus ? 0.6 : 1,
                      pointerEvents: isTogglingStatus ? 'none' : 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      transition: 'all 0.15s ease',
                      boxShadow: isPaidLoan
                        ? 'none'
                        : 'none'
                    }
                  },
                  isFutureMonth ? (
                    <>
                      <Clock size={13} style={{ color: isPaidLoan ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)' }} />
                      <span style={{ color: isPaidLoan ? TimelineColor.WHITE : undefined }}>{t('status.pending')}</span>
                    </>
                  ) : isCancelled ? (
                    <>
                      <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                      <span>{t('status.cancelled')}</span>
                    </>
                  ) : isPaidLoan ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                      <span style={{ color: TimelineColor.WHITE }}>{t('status.settled')}</span>
                    </>
                  ) : isOverdueLoan ? (
                    <>
                      <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                      <span>{t('status.overdue')}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} style={{ color: TimelineColor.WARNING }} />
                      <span>{t('status.pending')}</span>
                    </>
                  )
                )
              )}
            </div>
          </div>

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: isPaidLoan ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-glass)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isAmortized ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                    {formatCurrency(abatedBreakdown?.origTotal || event.originalInstallmentAmount || event.originalAmount || 0)}
                  </span>
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: TimelineColor.INCOME }}>
                    {formatCurrency(abatedBreakdown?.origCapital || event.originalInstallmentCapital || 0)}
                  </span>
                </div>
              ) : reducedBreakdown ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: isPaidLoan ? 'rgba(255, 255, 255, 0.75)' : 'var(--text-dim)', textDecoration: 'line-through' }} title="Valor original antes da amortização extraordinária">
                    {formatCurrency(reducedBreakdown.origTotal)}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : 'var(--primary-light)' }} title="Novo valor reduzido da parcela">
                    {formatCurrency(reducedBreakdown.currentTotal)}
                  </span>
                </div>
              ) : (
                <span style={{ fontSize: '1.05rem', fontWeight: '800', color: isPaidLoan ? TimelineColor.WHITE : 'var(--primary-light)' }}>
                  {formatCurrency(event.amount)}
                </span>
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 📖 Diary Register Event Strip (Direct Click-to-Edit, Mood Badge) */}
      {isRegisterEvent && (
        <div
          className="loan-breakdown-strip"
          onClick={() => onEdit && onEdit(event)}
          style={{
            background: 'rgba(236, 72, 153, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 12px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'rgba(236, 72, 153, 0.4)';
            e.currentTarget.style.background = 'rgba(236, 72, 153, 0.06)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-glass)';
            e.currentTarget.style.background = 'rgba(236, 72, 153, 0.03)';
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Texto completo do post para utilizadores só de leitura (lido diretamente na timeline) */}
          {isCondoPost && isReadOnly && event.description && (
            <div
              style={{
                fontSize: '0.84rem',
                lineHeight: 1.55,
                color: 'var(--text-main)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                margin: '6px 0 4px'
              }}
            >
              {renderFormattedMarkdown(event.description)}
            </div>
          )}

          {/* Linha 2: Mood Badge (left) e Ações (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {!isCondoflow && (() => {
                const moodCfg = DIARY_MOOD_CONFIG[event.category] || DIARY_MOOD_CONFIG[DiaryMood.GOOD];
                return (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-glass)',
                      color: 'var(--text-main)',
                      fontSize: '0.74rem',
                      fontWeight: '600'
                    }}
                  >
                    <span style={{ fontSize: '0.85rem', lineHeight: 1 }}>{moodCfg.emoji}</span>
                    <span>{t(moodCfg.labelKey) || moodCfg.fallbackLabel}</span>
                  </div>
                );
              })()}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                {isCondoPost && !isReadOnly && (() => {
                  const isPublished = postPublishStatus === DiaryPublishStatus.PUBLISHED;
                  const statusColor = isCancelledPost ? TimelineColor.SLATE : (isPublished ? TimelineColor.SUCCESS : TimelineColor.WARNING);
                  const pillStyle = {
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    background: `${statusColor}24`,
                    color: statusColor,
                    border: `1px solid ${statusColor}59`
                  };
                  const label = t(`diaryPublish.${postPublishStatus}`);
                  if (isCancelledPost || !onUpdateEventDirect) {
                    return <span style={{ ...pillStyle, cursor: 'default' }}>{isCancelledPost ? <Ban size={13} /> : null}{label}</span>;
                  }
                  return (
                    <button
                      type="button"
                      className="btn btn-sm"
                      title={t('diaryPublish.clickToToggle')}
                      onClick={(e) => setPostPublishStatus(e, isPublished ? DiaryPublishStatus.UNPUBLISHED : DiaryPublishStatus.PUBLISHED)}
                      style={{ ...pillStyle, cursor: 'pointer' }}
                    >
                      {isPublished ? <CheckCircle2 size={13} /> : <Clock size={13} />}
                      <span>{label}</span>
                    </button>
                  );
                })()}
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 📝 To Do Item Event Strip */}
      {isTodoEvent && (
        <div
          className={isCompleted ? 'flat-positive-card flat-positive-todo' : 'loan-breakdown-strip'}
          style={{
            background: isCompleted
              ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
              : 'rgba(59, 130, 246, 0.03)',
            border: isCompleted
              ? '1px solid rgba(255, 255, 255, 0.25)'
              : '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 12px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxShadow: isCompleted ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none',
            color: isCompleted ? TimelineColor.WHITE : 'inherit'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: Badges (Priority, Done Date / Status) + Botão de Conclusão & Ações */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Priority badge */}
              {event.priority && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    background: isCompleted
                      ? 'rgba(255, 255, 255, 0.2)'
                      : (event.priority || '').toLowerCase() === EventPriority.URGENT
                        ? 'rgba(244, 63, 94, 0.15)'
                        : (event.priority || '').toLowerCase() === EventPriority.HIGH
                          ? 'rgba(245, 158, 11, 0.15)'
                          : (event.priority || '').toLowerCase() === EventPriority.LOW
                            ? 'rgba(100, 116, 139, 0.15)'
                            : 'rgba(59, 130, 246, 0.15)',
                    color: isCompleted
                      ? TimelineColor.WHITE
                      : (event.priority || '').toLowerCase() === EventPriority.URGENT
                        ? TimelineColor.DANGER
                        : (event.priority || '').toLowerCase() === EventPriority.HIGH
                          ? TimelineColor.WARNING
                          : (event.priority || '').toLowerCase() === EventPriority.LOW
                            ? TimelineColor.SLATE
                            : TimelineColor.BLUE,
                    border: isCompleted ? '1px solid rgba(255, 255, 255, 0.3)' : 'none'
                  }}
                >
                  {event.priority}
                </span>
              )}

              {/* Concluded Date badge */}
              {isCompleted && (event.doneDate || event.date) && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: TimelineColor.WHITE,
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: '1px solid rgba(255, 255, 255, 0.35)',
                    padding: '2px 8px',
                    borderRadius: '5px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <Check size={12} style={{ color: TimelineColor.WHITE }} />
                  <span>{t('todoModal.concludedOn', { date: event.doneDate || event.date })}</span>
                </span>
              )}

              {!isCompleted && (
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    color: TimelineColor.TODO,
                    background: 'rgba(59, 130, 246, 0.1)',
                    padding: '2px 8px',
                    borderRadius: '5px'
                  }}
                >
                  {t('todoModal.currentMonth')}
                </span>
              )}
            </div>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
              {/* Checkbox / Toggle status button */}
              {isFutureMonth ? (
                <div
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-glass)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    color: 'var(--text-dim)',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: 'default',
                    userSelect: 'none',
                    opacity: 0.65
                  }}
                >
                  <Circle size={13} style={{ color: 'var(--text-dim)' }} />
                  <span>{t('status.pending')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isTogglingStatus}
                  onClick={(e) => handleStatusToggle(e, isCompleted ? EventStatus.PENDING : EventStatus.COMPLETED)}
                  title={isTogglingStatus ? t('common.processing') : (isCompleted ? t('todoModal.markPending') : t('todoModal.markCompleted'))}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    border: isCompleted ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid var(--border-glass)',
                    background: isCompleted ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.04)',
                    color: isCompleted ? TimelineColor.WHITE : 'var(--text-main)',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'wait' : 'pointer',
                    opacity: isTogglingStatus ? 0.75 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isTogglingStatus ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : isCompleted ? (
                    <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                  ) : (
                    <Circle size={13} />
                  )}
                  <span>
                    {isTogglingStatus
                      ? t('common.processing')
                      : isCompleted
                        ? t('status.completed')
                        : t('todoHeader.completeAction')}
                  </span>
                </button>
              )}

              <div onClick={(e) => e.stopPropagation()}>
                {renderActionButtons()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 Follow-up Event Strip */}
      {isFollowupEvent && (
        <div
          className={isAnchorCard ? 'followup-anchor-strip' : (isCompleted ? 'flat-positive-card flat-positive-followup' : 'loan-breakdown-strip')}
          style={{
            background: isAnchorCard
              ? paletteTheme.primary
              : isCompleted
                ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
                : 'linear-gradient(90deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.02) 100%)',
            border: isAnchorCard
              ? 'none'
              : isCompleted
                ? '1px solid rgba(255, 255, 255, 0.25)'
                : '1px solid rgba(6, 182, 212, 0.35)',
            borderLeft: isAnchorCard
              ? 'none'
              : isCompleted
                ? '1px solid rgba(255, 255, 255, 0.25)'
                : `4px solid ${paletteTheme.primary}`,
            borderRadius: '8px',
            padding: '8px 12px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            color: (isAnchorCard || isCompleted) ? TimelineColor.WHITE : 'inherit',
            boxShadow: isAnchorCard
              ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}`
              : isCompleted
                ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}`
                : 'none',
            opacity: 1
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [labels] */}
          {renderCardInnerHeader()}

          {/* Subtasks Progress Bar & Checklist Preview */}
          {(() => {
            const rawSubtasks = event.breakdownItems || event.breakdown_items || [];
            const subtasks = Array.isArray(rawSubtasks) ? rawSubtasks : (typeof rawSubtasks === 'string' ? JSON.parse(rawSubtasks || '[]') : []);
            const completedSubtasks = subtasks.filter((s) => s.status === FollowupStatus.FINISHED || s.status === 'finished' || s.status === 'completed').length;
            const subtaskRate = subtasks.length > 0 ? Math.round((completedSubtasks / subtasks.length) * 100) : 0;

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {subtasks.length > 0 && !isAnchorCard && (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    background: isCompleted ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: isCompleted ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-glass)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                      <span style={{ color: isCompleted ? 'rgba(255, 255, 255, 0.9)' : 'var(--text-dim)', fontWeight: '700' }}>
                        {t('followupModal.subtasksLabel')} ({completedSubtasks}/{subtasks.length})
                      </span>
                      <span style={{ fontWeight: '800', color: isCompleted ? TimelineColor.WHITE : (subtaskRate === 100 ? TimelineColor.SUCCESS : TimelineColor.FOLLOWUP) }}>
                        {subtaskRate}%
                      </span>
                    </div>
                    <div style={{ width: '100%', height: '4px', background: isCompleted ? 'rgba(255, 255, 255, 0.25)' : 'var(--border-glass)', borderRadius: '2px', overflow: 'hidden' }}>
                      <div
                        style={{
                          width: `${subtaskRate}%`,
                          height: '100%',
                          background: isCompleted ? TimelineColor.WHITE : (subtaskRate === 100 ? TimelineColor.SUCCESS : TimelineColor.FOLLOWUP),
                          borderRadius: '2px',
                          transition: 'width 0.2s ease'
                        }}
                      />
                    </div>
                  </div>
                )}

                {/* Linha 2: Badges (Status / Anchor / Floating) + Botão de Ação */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginTop: '2px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    {/* Status Badge */}
                    {isAnchorCard ? (
                      <>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '800',
                            padding: '3px 9px',
                            borderRadius: '5px',
                            background: 'rgba(255, 255, 255, 0.22)',
                            color: TimelineColor.WHITE,
                            border: '1px solid rgba(255, 255, 255, 0.4)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.03em'
                          }}
                        >
                          <Flag size={11} style={{ color: TimelineColor.WHITE }} />
                          {t('followupHeader.startAnchorBadge')}
                        </span>
                        <span
                          style={{
                            fontSize: '0.70rem',
                            fontWeight: '700',
                            padding: '3px 8px',
                            borderRadius: '5px',
                            background: 'rgba(255, 255, 255, 0.15)',
                            border: '1px solid rgba(255, 255, 255, 0.3)',
                            color: TimelineColor.WHITE,
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Clock size={11} style={{ color: TimelineColor.WHITE }} />
                          {t('followupStatus.initiated')}
                        </span>
                      </>
                    ) : isCompleted ? (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: 'rgba(255, 255, 255, 0.22)',
                          border: '1px solid rgba(255, 255, 255, 0.35)',
                          color: TimelineColor.WHITE,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <CheckCircle2 size={12} style={{ color: TimelineColor.WHITE }} />
                        {t('followupStatus.finished')}
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '2px 8px',
                          borderRadius: '5px',
                          background: 'rgba(6, 182, 212, 0.15)',
                          color: TimelineColor.FOLLOWUP,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <Clock size={12} />
                        {t('followupStatus.inProgress')}
                      </span>
                    )}

                    {/* Indicador de Trilha / Ligação ao Marco Inicial no Card Ativo */}
                    {!isAnchorCard && event.createdAt && (
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '2px 7px',
                          borderRadius: '4px',
                          background: isCompleted ? 'rgba(255, 255, 255, 0.18)' : 'rgba(59, 130, 246, 0.08)',
                          border: isCompleted ? '1px solid rgba(255, 255, 255, 0.3)' : '1px solid rgba(59, 130, 246, 0.25)',
                          fontSize: '0.68rem',
                          color: isCompleted ? TimelineColor.WHITE : TimelineColor.BLUE,
                          fontWeight: '700'
                        }}
                        title={t('followupHeader.initiatedOn', { date: format(new Date(event.createdAt), 'dd/MM/yyyy') })}
                      >
                        <Flag size={10} style={{ color: isCompleted ? TimelineColor.WHITE : TimelineColor.BLUE }} />
                        <span>{t('followupHeader.initiatedOn', { date: format(new Date(event.createdAt), 'dd/MM/yyyy') })}</span>
                      </div>
                    )}

                    {event.isFloating && !isCompleted && !isAnchorCard && (
                      <span
                        style={{
                          fontSize: '0.68rem',
                          fontWeight: '600',
                          color: 'var(--text-dim)',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-glass)'
                        }}
                      >
                        {t('followupHeader.currentMonthBadge')}
                      </span>
                    )}
                  </div>

                  <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {!isAnchorCard && (
                      <button
                        type="button"
                        disabled={isTogglingStatus}
                        onClick={(e) => handleStatusToggle(e, isCompleted ? FollowupStatus.IN_PROGRESS : FollowupStatus.FINISHED)}
                        title={isTogglingStatus ? t('common.processing') : (isCompleted ? t('followupHeader.markInProgress') : t('followupHeader.markFinished'))}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          padding: '4px 10px',
                          borderRadius: '6px',
                          border: isCompleted ? '1px solid rgba(255, 255, 255, 0.4)' : `1px solid ${TimelineColor.FOLLOWUP}`,
                          background: isCompleted ? 'rgba(255, 255, 255, 0.25)' : 'rgba(6, 182, 212, 0.15)',
                          color: isCompleted ? TimelineColor.WHITE : TimelineColor.FOLLOWUP,
                          fontSize: '0.76rem',
                          fontWeight: '700',
                          cursor: isTogglingStatus ? 'wait' : 'pointer',
                          opacity: isTogglingStatus ? 0.75 : 1,
                          transition: 'all 0.15s ease'
                        }}
                      >
                        {isTogglingStatus ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : isCompleted ? (
                          <CheckCircle2 size={13} style={{ color: TimelineColor.WHITE }} />
                        ) : (
                          <Circle size={13} />
                        )}
                        <span>
                          {isTogglingStatus
                            ? t('common.processing')
                            : isCompleted
                              ? t('followupStatus.finished')
                              : t('followupHeader.finishAction')}
                        </span>
                      </button>
                    )}

                    <div onClick={(e) => e.stopPropagation()}>
                      {renderActionButtons()}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 📋 Default / Generic / Reminder Event Strip */}
      {!isIncomeEvent && !isExpenseEvent && !isInvestmentEvent && !isAmortization && !isLoanInstallment && !isRegisterEvent && !isTodoEvent && !isFollowupEvent && (
        <div
          className={isFlatPositive ? 'flat-positive-card flat-positive-reminder' : 'loan-breakdown-strip'}
          style={{
            background: isFlatPositive
              ? `linear-gradient(135deg, ${paletteTheme.primary} 0%, ${paletteTheme.secondary} 100%)`
              : 'transparent',
            border: isFlatPositive
              ? '1px solid rgba(255, 255, 255, 0.25)'
              : '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
            boxShadow: isFlatPositive ? `0 4px 14px ${hexToRgba(paletteTheme.primary, 0.35)}` : 'none',
            color: isFlatPositive ? TimelineColor.WHITE : 'inherit'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo/tipo] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            {/* Reminders show neither the type label nor the priority */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '0px' }}>
              {!isReminderEvent && (
                <span style={{ fontSize: '0.7rem', color: isFlatPositive ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
                  {t('common.event')}
                </span>
              )}
              {event.priority && !isReminderEvent && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: isFlatPositive ? '1px solid rgba(255, 255, 255, 0.25)' : '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: isFlatPositive ? 'rgba(255, 255, 255, 0.85)' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('timeline.priority')}:
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)' }}>
                    {event.priority}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {renderStatusDropdownButton(
                {
                  className: 'btn btn-sm',
                  title: t('timeline.clickToChangeStatus'),
                  style: {
                    background: isCancelled
                      ? 'rgba(148, 163, 184, 0.15)'
                      : isFlatPositive
                        ? 'rgba(255, 255, 255, 0.25)'
                        : isOverdueReminder
                          ? 'rgba(252, 191, 73, 0.16)'
                          : 'rgba(6, 182, 212, 0.14)',
                    color: isCancelled
                      ? TimelineColor.SLATE
                      : isFlatPositive
                        ? TimelineColor.WHITE
                        : isOverdueReminder
                          ? TimelineColor.WARNING
                          : TimelineColor.CYAN,
                    border: isCancelled
                      ? '1px solid rgba(148, 163, 184, 0.35)'
                      : isFlatPositive
                        ? '1px solid rgba(255, 255, 255, 0.4)'
                        : isOverdueReminder
                          ? '1px solid rgba(252, 191, 73, 0.4)'
                          : '1px solid rgba(6, 182, 212, 0.35)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }
                },
                isFutureMonth ? (
                  <>
                    <Clock size={13} style={{ color: 'var(--text-dim)' }} />
                    <span>{t('status.open')}</span>
                  </>
                ) : isCancelled ? (
                  <>
                    <Ban size={13} style={{ color: TimelineColor.SLATE }} />
                    <span>{t('status.cancelled')}</span>
                  </>
                ) : isClosedReminder ? (
                  <>
                    <CheckCircle2 size={13} style={{ color: isFlatPositive ? TimelineColor.WHITE : TimelineColor.SUCCESS }} />
                    <span>{t('status.closed')}</span>
                  </>
                ) : isOverdueReminder ? (
                  <>
                    <AlertCircle size={13} style={{ color: TimelineColor.WARNING }} />
                    <span>{t('status.overdue')}</span>
                  </>
                ) : (
                  <>
                    <Clock size={13} style={{ color: TimelineColor.CYAN }} />
                    <span>{t('status.open')}</span>
                  </>
                )
              )}
            </div>
          </div>

          {/* Linha 3: [Valor] & [event action buttons] */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: isFlatPositive ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {event.amount !== undefined && Number(event.amount) > 0 ? (
                renderEditableAmount('', isFlatPositive ? TimelineColor.WHITE : 'var(--text-main)')
              ) : (
                <span style={{ fontSize: '0.78rem', color: isFlatPositive ? 'rgba(255, 255, 255, 0.8)' : 'var(--text-muted)' }}>{event.description || ''}</span>
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* Expandable Notes Section (Glassmorphism) */}
      {(() => {
        const allNotes = Array.isArray(event.notes)
          ? event.notes.filter(Boolean)
          : (event.description && !event.description.toLowerCase().includes('transferência bancária de vencimento') && event.description.trim() ? [event.description.trim()] : []);
        const hasNotes = allNotes.length > 0;

        if (!isNotesExpanded) return null;

        return (
          <div
            style={{
              marginTop: '8px',
              padding: '12px 14px',
              background: 'var(--bg-glass)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: '700', color: hasNotes ? TimelineColor.WARNING : 'var(--text-muted)' }}>
                <FileText size={14} style={{ color: hasNotes ? TimelineColor.WARNING : 'var(--text-dim)' }} />
                <span>{t('eventNotes.title', { count: allNotes.length })}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNotesExpanded(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  padding: '2px 6px'
                }}
              >
                ✕ Fechar
              </button>
            </div>

            {/* List of existing notes */}
            {hasNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {allNotes.map((note, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '0.78rem',
                      color: 'var(--text-main)',
                      padding: '6px 10px',
                      background: 'var(--bg-glass)',
                      borderRadius: '6px',
                      borderLeft: `3px solid ${TimelineColor.WARNING}`
                    }}
                  >
                    <span style={{ flex: 1, lineHeight: '1.45' }}>{renderFormattedMarkdown(note)}</span>
                    {(onUpdateEventDirect || onEdit) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const updatedNotes = allNotes.filter((_, nIdx) => nIdx !== idx);
                          const updatedEvent = {
                            ...event,
                            notes: updatedNotes,
                            description: updatedNotes[0] || ''
                          };
                          if (onUpdateEventDirect) {
                            onUpdateEventDirect(updatedEvent);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title={t('eventNotes.delete')}
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                {t('eventNotes.empty')}
              </span>
            )}

            {/* Add New Note Input Form (also available to read-only users) */}
            {onSaveNotes && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (newItemText.trim()) {
                    const updatedNotes = [...allNotes, newItemText.trim()];
                    const updatedEvent = {
                      ...event,
                      notes: updatedNotes,
                      description: updatedNotes[0] || ''
                    };
                    onSaveNotes(updatedEvent);
                    setNewItemText('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', gap: '6px', marginTop: '4px' }}
              >
                <input
                  type="text"
                  placeholder={t('eventNotes.placeholder')}
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    background: 'var(--bg-card)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.74rem',
                    background: TimelineColor.WARNING,
                    color: TimelineColor.WHITE,
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title={t('actionAddNote')}
                >
                  <Plus size={13} />
                  <span>{t('eventNotes.add')}</span>
                </button>
              </form>
            )}
          </div>
        );
      })()}

      {/* 🧩 Painel de Desmembramento do Valor (In-place, com Salvar e Cancelar) */}
      {isDesmembramentoExpanded && (() => {
        const pendingAmount = Number(newSubpartAmount) || 0;
        const totalCalculated = draftSubparts.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) + (newSubpartName.trim() ? pendingAmount : 0);

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: '8px',
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                <Layers size={15} style={{ color: 'var(--primary-light)' }} />
                <span>Desmembramento do Valor ({draftSubparts.length} subpartes)</span>
              </div>
              <button
                type="button"
                onClick={handleCancelDesmembramento}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  padding: '2px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Cancelar alterações"
              >
                <X size={13} />
                <span>Cancelar</span>
              </button>
            </div>

            {/* Total Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Total Acumulado das Subpartes
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  A soma das subpartes definirá a totalidade desta entrada ao salvar
                </div>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {formatCurrency(totalCalculated)}
              </span>
            </div>

            {/* List of draft subparts */}
            {draftSubparts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {draftSubparts.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '4px 0px',
                      background: 'transparent',
                      borderBottom: '3px solid rgba(165, 180, 252, 0.65)',
                      width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        disabled={!canEditAmount}
                        value={item.name}
                        onFocus={(e) => {
                          e.target.select();
                          setEditingSubpartIdx(idx);
                        }}
                        onBlur={() => setEditingSubpartIdx(null)}
                        onChange={(e) => handleDraftUpdateName(idx, e.target.value)}
                        placeholder="Nome da subparte..."
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          padding: '2px 0',
                          color: 'var(--text-main)',
                          fontSize: '0.86rem',
                          fontWeight: '700'
                        }}
                      />
                      {canEditAmount && editingSubpartIdx === idx && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setEditingSubpartIdx(null)}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Confirmar nome da subparte"
                        >
                          <Check size={11} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        disabled={!canEditAmount}
                        className="inline-amount-input"
                        value={item.amount !== undefined ? item.amount : ''}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleDraftUpdateAmount(idx, e.target.value)}
                        style={{
                          width: '75px',
                          fontSize: '0.86rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          padding: '2px 0'
                        }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)' }}>€</span>
                      {canEditAmount && (
                        <button
                          type="button"
                          onClick={(e) => handleDraftDeleteSubpart(idx, e)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Eliminar esta subparte"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Subpart Form */}
            {canEditAmount && (
              <form
                onSubmit={handleDraftAddSubpart}
                style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '6px', marginTop: '6px' }}
              >
                <input
                  type="text"
                  placeholder="Nome da subparte (ex: Restaurante)"
                  value={newSubpartName}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewSubpartName(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Valor (€)"
                  value={newSubpartAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewSubpartAmount(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontWeight: '700'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newSubpartName.trim()}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.74rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Adicionar mais uma subparte à lista"
                >
                  <Plus size={13} />
                  <span>Adicionar</span>
                </button>
              </form>
            )}

            {/* Footer Actions: Switch Subsequentes, Salvar e Cancelar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
              {isRecurring ? (
                <label
                  title="Ativar para aplicar este desmembramento a todos os meses subsequentes ao salvar"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    color: propagateSubsequent ? 'var(--primary-light)' : 'var(--text-dim)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={propagateSubsequent}
                    onChange={(e) => setPropagateSubsequent(e.target.checked)}
                  />
                  <span>Mudar subsequentes</span>
                </label>
              ) : <div />}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {canEditAmount && (draftSubparts.length > 0 || hasBreakdown) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateEventDirect) {
                        onUpdateEventDirect({
                          ...event,
                          breakdownItems: undefined,
                          propagateForward: isRecurring ? propagateSubsequent : false
                        });
                      }
                      setIsDesmembramentoExpanded(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      marginRight: '6px'
                    }}
                  >
                    Voltar a Valor Único
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancelDesmembramento}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.74rem',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={13} />
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveDesmembramento}
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: '0.74rem',
                    padding: '5px 14px',
                    borderRadius: '6px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Salvar Desmembramento</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
});

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(79, 70, 229, ${alpha})`;
  if (hex.startsWith('rgba')) {
    return hex;
  }
  if (hex.startsWith('rgb')) {
    return hex.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
  }
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  if (c.length === 6) {
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

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
  const eventList = React.useMemo(() => {
    const list = Array.isArray(events) ? [...events] : (event ? [event] : []);
    return list.sort(compareEventsWithinDay);
  }, [events, event]);
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

  const paletteTheme = getPaletteTheme(baseColor, TimelineColor.PRIMARY);

  const bgGradient = isBalance
    ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.05) 0%, var(--bg-card) 100%)'
    : `linear-gradient(135deg, ${hexToRgba(paletteTheme.secondary, 0.10)} 0%, ${hexToRgba(paletteTheme.light, 0.03)} 60%, var(--bg-card) 100%)`;

  const borderColor = isBalance
    ? 'rgba(148, 163, 184, 0.22)'
    : hexToRgba(paletteTheme.medium, 0.32);

  const borderLeftColor = isBalance
    ? 'rgba(148, 163, 184, 0.45)'
    : paletteTheme.primary;

  return (
    <div
      className="event-card"
      style={{
        background: bgGradient,
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${borderLeftColor}`,
        borderTopColor: borderColor,
        borderRightColor: borderColor,
        borderBottomColor: borderColor,
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: baseColor, fontSize: '0.80rem', fontWeight: '700', textTransform: 'capitalize' }}>
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
                background: 'rgba(255, 255, 255, 0.05)',
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
