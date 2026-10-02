import React, { useState, useMemo, useEffect } from 'react';
import { ArrowDownRight, ArrowLeftRight, Check, FileText, ShoppingCart, Zap, Repeat } from 'lucide-react';
import { format, parseISO, getDaysInMonth, addMonths } from 'date-fns';
import ModalShell from './ui/ModalShell.jsx';
import EuroInput from './ui/EuroInput.jsx';
import DayPickerPopover from './ui/DayPickerPopover.jsx';
import OptionBoxGroup from './ui/OptionBoxGroup.jsx';
import RecurrenceSelector from './ui/RecurrenceSelector.jsx';
import PeriodicitySelector from './ui/PeriodicitySelector.jsx';
import MonthPickerPopover from './ui/MonthPickerPopover.jsx';
import ToggleSwitch from './ui/ToggleSwitch.jsx';
import CategorySelector from './ui/CategorySelector.jsx';
import CategoryBoxSelector from './ui/CategoryBoxSelector.jsx';
import AccountSpaceSelector from './ui/AccountSpaceSelector.jsx';
import { EXPENSE_CATEGORY_META, CONDO_EXPENSE_CATEGORY_META } from './event-modals/FinancialEventModalConfig.js';
import { useTimeboard } from '../context/TimeboardContext.jsx';
import {
  EventType,
  EventStatus,
  EventRecurrence,
  EventPeriodicity,
  EventUpdateMode,
  ExpenseEventCategory,
  InvestmentEventCategory,
  TimelineColor,
  normalizeRecurrence,
  PocketTransferKind,
  normalizePeriodicity
} from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import { generateUUID } from '../utils/uuid.js';
import { computeSpaceBalances, GENERAL_SPACE_KEY } from '../../shared/finance/savingsSpaces.js';

// Outflows of the account: withdrawal (back to the available money), expense paid by the account, transfer
// between two spaces (General / pockets)
const OUTFLOW_TYPES = [EventType.WITHDRAWAL, EventType.POCKET_EXPENSE, EventType.POCKET_TRANSFER];
const OUTFLOW_ICONS = {
  [EventType.WITHDRAWAL]: ArrowDownRight,
  [EventType.POCKET_EXPENSE]: ShoppingCart,
  [EventType.POCKET_TRANSFER]: ArrowLeftRight
};
const OUTFLOW_COLORS = {
  [EventType.WITHDRAWAL]: TimelineColor.DANGER,
  [EventType.POCKET_EXPENSE]: TimelineColor.DANGER,
  [EventType.POCKET_TRANSFER]: TimelineColor.CYAN
};

// Legacy pocket costs are edited as expenses of the "bank fees" category
const resolveInitialType = (initialData) => {
  if (initialData?.eventType === EventType.POCKET_COST) return EventType.POCKET_EXPENSE;
  return OUTFLOW_TYPES.includes(initialData?.eventType) ? initialData.eventType : EventType.WITHDRAWAL;
};
const resolveInitialCategory = (initialData, categoryMeta) => {
  if (initialData?.eventType === EventType.POCKET_COST) return ExpenseEventCategory.BANK_FEES;
  const category = String(initialData?.category || '').toLowerCase();
  return categoryMeta[category] ? category : ExpenseEventCategory.OTHER;
};
const spaceKeyOf = (pocketId) => (pocketId ? String(pocketId) : GENERAL_SPACE_KEY);

/**
 * "Add outflow" popup of the account (savings timeline):
 * - withdrawal: moves money from a space (General or a pocket) back to the available money
 * - expense: an expense paid by the account (expense categories, bank fees included), one-time or periodic
 * - transfer: moves money between two spaces; the account total and the balance do not change
 * The amount is limited to the balance of the origin space ("Where").
 */
export default function AccountOutflowModal({
  isOpen,
  onClose,
  onSave,
  initialData = null,
  defaultDate = null,
  defaultPocketId = null,
  pockets = [],
  timeline = null,
  events = []
}) {
  const { t, dateLocale } = useTranslation();
  const { isCondoflow } = useTimeboard();

  const isEditing = Boolean(initialData && initialData.id);
  const expenseCategoryMeta = isCondoflow ? CONDO_EXPENSE_CATEGORY_META : EXPENSE_CATEGORY_META;
  const expenseTranslationPrefix = isCondoflow ? 'condoExpenseCategories' : 'expenseCategories';

  const initialOriginId = initialData ? (initialData.pocketId || initialData.pocket_id || null) : (defaultPocketId || null);

  // Locked base month and year from the trigger context
  const baseDateStr = useMemo(() => {
    return initialData?.date || defaultDate || format(new Date(), 'yyyy-MM-dd');
  }, [initialData?.date, defaultDate]);

  const baseMonthKey = useMemo(() => baseDateStr.substring(0, 7), [baseDateStr]);

  const initialDay = useMemo(() => {
    try {
      return Number(format(parseISO(baseDateStr), 'd'));
    } catch {
      return 1;
    }
  }, [baseDateStr]);

  const initialType = resolveInitialType(initialData);

  const [outflowType, setOutflowType] = useState(initialType);
  const [originId, setOriginId] = useState(initialOriginId);
  const [targetId, setTargetId] = useState(null);
  const [title, setTitle] = useState(initialData?.title || initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount ? Math.abs(Number(initialData.amount)).toString() : '');
  const [dayOfMonth, setDayOfMonth] = useState(initialDay);
  const [recurrence, setRecurrence] = useState(EventRecurrence.ONCE);
  const [periodicity, setPeriodicity] = useState(EventPeriodicity.MONTHLY);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState('');
  const [category, setCategory] = useState(ExpenseEventCategory.OTHER);
  const [isAutomatic, setIsAutomatic] = useState(false);
  const [updateScope, setUpdateScope] = useState(EventUpdateMode.SINGLE);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isEndMonthPickerOpen, setIsEndMonthPickerOpen] = useState(false);
  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [endMonthPickerYear, setEndMonthPickerYear] = useState(new Date().getFullYear());
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Default destination of a transfer: the first open pocket other than the origin (or General from a pocket)
  const defaultTargetFor = (origin) => {
    if (origin) return null;
    const firstPocket = (pockets || []).find((p) => !(p.date_closed || p.dateClosed));
    return firstPocket ? firstPocket.id : null;
  };

  useEffect(() => {
    if (isOpen) {
      const type = resolveInitialType(initialData);
      const origin = initialData ? (initialData.pocketId || initialData.pocket_id || null) : (defaultPocketId || null);
      setOutflowType(type);
      setOriginId(origin);
      setTargetId(initialData?.targetPocketId || initialData?.target_pocket_id || defaultTargetFor(origin));
      setTitle(initialData?.title || initialData?.name || '');
      setAmount(initialData?.amount ? Math.abs(Number(initialData.amount)).toString() : '');
      setDayOfMonth(initialDay);
      setRecurrence(initialData ? normalizeRecurrence(initialData) : EventRecurrence.ONCE);
      setPeriodicity(initialData ? normalizePeriodicity(initialData.periodicity) : EventPeriodicity.MONTHLY);
      setRecurrenceEndDate(initialData?.limitDate || initialData?.limit_date || initialData?.recurrenceEndDate || '');
      setCategory(resolveInitialCategory(initialData, expenseCategoryMeta));
      setIsAutomatic(Boolean(initialData?.isAutomatic ?? initialData?.automatic ?? false));
      setUpdateScope(EventUpdateMode.SINGLE);
      setIsDayPickerOpen(false);
      setIsEndMonthPickerOpen(false);
      setIsCategoryOpen(false);
      setError(null);
      setLoading(false);
    }
    // defaultTargetFor only depends on the pockets
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialData, initialDay, expenseCategoryMeta, defaultPocketId, pockets]);

  // Effective balance of every space (the movement being edited is left out)
  const spaceBalances = useMemo(() => computeSpaceBalances({
    events,
    pockets,
    side: 'realized',
    excludeEventId: initialData?.id || null
  }), [events, pockets, initialData?.id]);

  if (!isOpen) return null;

  const isWithdrawal = outflowType === EventType.WITHDRAWAL;
  const isPocketExpense = outflowType === EventType.POCKET_EXPENSE;
  const isTransfer = outflowType === EventType.POCKET_TRANSFER;
  // Pocket contribution / withdrawal: a transfer between the current account and one pocket, both ends fixed
  // (from the pocket buttons, or when editing such a transfer); a pocket never moves money anywhere else
  const pocketTransferKind = isTransfer
    ? (initialData?.transferKind || (isEditing
      ? (!originId && targetId ? PocketTransferKind.CONTRIBUTION : (originId && !targetId ? PocketTransferKind.WITHDRAWAL : null))
      : null))
    : null;
  const transferPocketId = pocketTransferKind === PocketTransferKind.CONTRIBUTION ? targetId : originId;
  const isRecurring = !isWithdrawal && (recurrence === EventRecurrence.RECURRING || recurrence === EventRecurrence.LIMITED);
  const isSeriesEdit = isEditing && Boolean(initialData?.seriesId || initialData?.eventId || initialData?.isRecurring);
  const accent = OUTFLOW_COLORS[outflowType];

  const spaceName = (pocketId) => (pocketId
    ? ((pockets || []).find((p) => String(p.id) === String(pocketId))?.name || t('account.general'))
    : t('account.general'));
  const maxAvailable = Math.max(0, spaceBalances.get(spaceKeyOf(originId)) || 0);

  // Without pockets everything happens in the General space: no "Where" choice and nothing to transfer to
  const hasPockets = (pockets || []).length > 0;
  // Transfers with pockets are made from the pocket buttons (contribution / withdrawal), never chosen here
  const outflowOptions = OUTFLOW_TYPES.filter((type) => type !== EventType.POCKET_TRANSFER).map((type) => ({
    id: type,
    label: t(`withdrawalModal.types.${type}`),
    icon: OUTFLOW_ICONS[type],
    color: OUTFLOW_COLORS[type],
    tooltip: t(`withdrawalModal.typesDesc.${type}`)
  }));

  const handleChangeType = (type) => {
    setOutflowType(type);
    setRecurrence(EventRecurrence.ONCE);
    setIsAutomatic(false);
    if (type === EventType.POCKET_TRANSFER && String(targetId ?? '') === String(originId ?? '')) {
      setTargetId(defaultTargetFor(originId));
    }
  };

  const handleChangeOrigin = (id) => {
    setOriginId(id);
    if (String(targetId ?? '') === String(id ?? '')) setTargetId(defaultTargetFor(id));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('validation.titleRequired'));
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || Number.isNaN(numAmount) || numAmount <= 0) {
      setError(t('validation.amountRequired'));
      return;
    }

    if (numAmount > maxAvailable + 0.001) {
      setError(t('account.amountExceedsSpaceError', { space: spaceName(originId), max: formatCurrency(maxAvailable) }));
      return;
    }

    if (isTransfer && String(targetId ?? '') === String(originId ?? '')) {
      setError(t('account.transferSameSpaceError'));
      return;
    }

    const maxDays = getDaysInMonth(parseISO(`${baseMonthKey}-01`));
    const safeDay = Math.min(maxDays, Math.max(1, Number(dayOfMonth) || 1));
    const finalDateStr = `${baseMonthKey}-${String(safeDay).padStart(2, '0')}`;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    // One-time outflows on a past date are already done; periodic ones follow the automatic toggle
    const isCompleted = !isRecurring && finalDateStr <= todayStr;
    const settledStatus = isWithdrawal ? EventStatus.WITHDRAWN : (isTransfer ? EventStatus.COMPLETED : EventStatus.PAID);
    const pendingStatus = isWithdrawal ? EventStatus.PLANNED : EventStatus.PENDING;
    const finalRecurrence = isWithdrawal ? EventRecurrence.ONCE : recurrence;
    const endDate = !isWithdrawal && recurrence === EventRecurrence.LIMITED && recurrenceEndDate ? recurrenceEndDate : null;
    const originPocket = (pockets || []).find((p) => String(p.id) === String(originId)) || null;

    const payload = {
      ...(initialData || {}),
      id: initialData?.id || generateUUID(),
      title: trimmedTitle,
      name: trimmedTitle,
      // Withdrawals and expenses take money out of the account; a transfer only moves it inside the account
      amount: isTransfer ? Math.abs(numAmount) : -Math.abs(numAmount),
      date: finalDateStr,
      dayOfMonth: safeDay,
      pocketId: originId || null,
      pocket_id: originId || null,
      pocketName: originPocket?.name || null,
      targetPocketId: isTransfer ? (targetId || null) : null,
      target_pocket_id: isTransfer ? (targetId || null) : null,
      category: isPocketExpense ? category : InvestmentEventCategory.OTHER,
      eventType: outflowType,
      recurrence: finalRecurrence,
      periodicity: isRecurring ? periodicity : EventPeriodicity.MONTHLY,
      recurrenceEndDate: endDate,
      endDate,
      limitDate: endDate,
      limit_date: endDate,
      isWithdrawal,
      isInvestment: !isTransfer,
      isRecurring,
      isAutomatic: !isWithdrawal && isAutomatic,
      status: isEditing && initialData?.status ? initialData.status : (isCompleted ? settledStatus : pendingStatus),
      isCompleted: isEditing && initialData ? Boolean(initialData.isCompleted) : isCompleted,
      timelineId: timeline?.id || initialData?.timelineId || null,
      updateScope: isSeriesEdit ? updateScope : undefined
    };

    try {
      setLoading(true);
      await onSave(payload);
      onClose();
    } catch (err) {
      setError(err?.message || t('toast.eventSaveError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      accent={accent}
      icon={OUTFLOW_ICONS[outflowType]}
      title={initialData?.correctionOf
        ? t('modal.correctMovement')
        : pocketTransferKind
          ? t(pocketTransferKind === PocketTransferKind.CONTRIBUTION ? 'account.contributionTitle' : 'account.pocketWithdrawalTitle', { pocket: spaceName(transferPocketId) })
          : (isEditing ? t('withdrawalModal.outflowEditTitle') : t('withdrawalModal.outflowTitle'))}
      subtitle={timeline?.name || t('withdrawalModal.subtitle')}
      footer={
        <>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={onClose}
            disabled={loading}
          >
            {t('buttons.cancel')}
          </button>
          <button
            type="submit"
            className="btn btn-primary btn-sm"
            style={{
              background: accent,
              borderColor: accent,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
            disabled={loading || maxAvailable <= 0}
          >
            {isEditing ? <Check size={14} /> : <ArrowDownRight size={14} />}
            <span>{isEditing ? t('withdrawalModal.saveOutflow') : t('withdrawalModal.confirmOutflow')}</span>
          </button>
        </>
      }
    >
      {error && (
        <div
          style={{
            padding: '10px 14px',
            marginBottom: '16px',
            background: `${TimelineColor.DANGER}26`,
            border: `1px solid ${TimelineColor.DANGER}4d`,
            borderRadius: '8px',
            color: TimelineColor.DANGER,
            fontSize: '0.8rem',
            fontWeight: '600'
          }}
        >
          {error}
        </div>
      )}

      {/* Outflow type (fixed when editing, and for a pocket contribution / withdrawal) */}
      {!isEditing && !pocketTransferKind && (
        <OptionBoxGroup
          label={t('withdrawalModal.typeLabel')}
          options={outflowOptions}
          value={outflowType}
          onChange={handleChangeType}
        />
      )}

      {/* Origin space ("Where") with the balances; destination of a transfer. Expenses and withdrawals happen in
          the current account and a pocket transfer has both ends fixed, so neither offers the choice */}
      {hasPockets && isTransfer && !pocketTransferKind && (
      <AccountSpaceSelector
        label={t('account.where')}
        pockets={pockets}
        value={originId}
        onChange={handleChangeOrigin}
        balances={spaceBalances}
        generalLabel={t('account.general')}
      />
      )}
      {isTransfer && !pocketTransferKind && (
        <AccountSpaceSelector
          label={t('account.to')}
          pockets={pockets}
          value={targetId}
          onChange={setTargetId}
          balances={spaceBalances}
          excludeId={originId}
          generalLabel={t('account.general')}
          color={TimelineColor.CYAN}
        />
      )}

      {/* Title */}
      <div style={{ marginBottom: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
          <FileText size={13} style={{ color: 'var(--text-muted)' }} />
          <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
            {t('withdrawalModal.titleLabel')}
          </label>
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t(`withdrawalModal.titlePlaceholders.${outflowType}`)}
          className="form-input"
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: '8px',
            fontSize: '0.88rem',
            color: 'var(--text-main)',
            boxSizing: 'border-box'
          }}
          autoFocus
          required
        />
      </div>

      {/* Amount, limited to the balance of the origin space */}
      <div style={{ marginBottom: '14px' }}>
        <EuroInput
          label={t('withdrawalModal.outflowAmountLabel')}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          accent={accent}
          placeholder="0.00"
          min="0.01"
          step="0.01"
          marginBottom="4px"
          labelExtra={
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                color: maxAvailable > 0 ? accent : 'var(--text-dim)'
              }}
            >
              {t('withdrawalModal.maxAvailable', { amount: formatCurrency(maxAvailable) })}
            </span>
          }
        />
        {maxAvailable <= 0 && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: TimelineColor.DANGER, fontWeight: '600' }}>
            {t('account.noSpaceBalanceError', { space: spaceName(originId) })}
          </p>
        )}
      </div>

      {/* Expense category (same categories as the expenses timeline, bank fees included) */}
      {isPocketExpense && (isCondoflow ? (
        <CategoryBoxSelector
          value={category}
          onChange={setCategory}
          categoryMeta={expenseCategoryMeta}
          translationPrefix={expenseTranslationPrefix}
          descriptionPrefix="condoExpenseCategoryDesc"
          label={t('modal.categoryLabel')}
          t={t}
        />
      ) : (
        <CategorySelector
          value={category}
          onChange={setCategory}
          categoryMeta={expenseCategoryMeta}
          accent={accent}
          translationPrefix={expenseTranslationPrefix}
          t={t}
          label={t('modal.categoryLabel')}
          isOpen={isCategoryOpen}
          onToggle={() => setIsCategoryOpen(!isCategoryOpen)}
        />
      ))}

      {/* Recurrence of expenses and transfers (one-time, recurring or period), like the other events */}
      {!isWithdrawal && !isEditing && (
        <>
          <RecurrenceSelector
            value={recurrence}
            onChange={(id) => {
              if (id === EventRecurrence.LIMITED && !recurrenceEndDate) {
                setRecurrenceEndDate(format(addMonths(parseISO(`${baseMonthKey}-01`), 6), 'yyyy-MM'));
              }
              setRecurrence(id);
            }}
            accent={accent}
            t={t}
          />
          {isRecurring && (
            <PeriodicitySelector
              value={periodicity}
              onChange={setPeriodicity}
              accent={accent}
              t={t}
            />
          )}
          {recurrence === EventRecurrence.LIMITED && (
            <MonthPickerPopover
              value={recurrenceEndDate}
              onChange={setRecurrenceEndDate}
              accent={accent}
              dateLocale={dateLocale}
              label={t('modal.endMonth')}
              isOpen={isEndMonthPickerOpen}
              onToggle={() => setIsEndMonthPickerOpen(!isEndMonthPickerOpen)}
              year={endMonthPickerYear}
              onYearChange={setEndMonthPickerYear}
              baseDate={`${baseMonthKey}-01`}
              explanation={t('modal.periodExplanation', {
                start: format(parseISO(`${baseMonthKey}-01`), 'MMMM yyyy', { locale: dateLocale }),
                end: recurrenceEndDate
                  ? format(parseISO(`${recurrenceEndDate}-01`), 'MMMM yyyy', { locale: dateLocale })
                  : '...'
              })}
            />
          )}
        </>
      )}

      {/* Day of the month */}
      <DayPickerPopover
        value={dayOfMonth}
        onChange={(d) => setDayOfMonth(d)}
        accent={accent}
        dateLocale={dateLocale}
        baseDate={`${baseMonthKey}-01`}
        label={t('withdrawalModal.dayLabel')}
        isOpen={isDayPickerOpen}
        onToggle={() => setIsDayPickerOpen(!isDayPickerOpen)}
      />

      {/* Periodic expenses / transfers can be done automatically */}
      {isRecurring && (
        <ToggleSwitch
          checked={isAutomatic}
          onChange={setIsAutomatic}
          label={t('withdrawalModal.automaticLabel')}
          icon={Zap}
          accent={accent}
        />
      )}

      {isSeriesEdit && !isWithdrawal && (
        <ToggleSwitch
          checked={updateScope === EventUpdateMode.SUBSEQUENT}
          onChange={(val) => setUpdateScope(val ? EventUpdateMode.SUBSEQUENT : EventUpdateMode.SINGLE)}
          label={t('modal.changeSubsequent')}
          icon={Repeat}
          accent={accent}
        />
      )}
    </ModalShell>
  );
}
