import React, { useState, useMemo, useEffect } from 'react';
import { ArrowDownRight, Check, PiggyBank, FileText, Receipt, ShoppingCart, Zap, Repeat } from 'lucide-react';
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
  normalizePeriodicity
} from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { formatCurrency } from '../utils/formatCurrency.js';
import { generateUUID } from '../utils/uuid.js';
import { computeSpaceBalances } from '../../shared/finance/savingsSpaces.js';

/**
 * Money available in a pocket (shared financial engine): its initial value plus the effective movements
 * (pending deposits, external ones included, do not count yet).
 */
export function calculatePocketAvailableBalance(pocket, events = [], upToDate = null, excludeEventId = null) {
  if (!pocket) return 0;
  const balances = computeSpaceBalances({ events, pockets: [pocket], side: 'realized', upToDate, excludeEventId });
  return Math.max(0, balances.get(String(pocket.id)) || 0);
}

// Outflows of an account pocket: withdrawal (back to the income timeline), cost and expense (stay in the account)
const OUTFLOW_TYPES = [EventType.WITHDRAWAL, EventType.POCKET_COST, EventType.POCKET_EXPENSE];
const OUTFLOW_ICONS = {
  [EventType.WITHDRAWAL]: ArrowDownRight,
  [EventType.POCKET_COST]: Receipt,
  [EventType.POCKET_EXPENSE]: ShoppingCart
};
// Default recurrence of each outflow type (a cost is usually monthly, the others one-time)
const DEFAULT_RECURRENCE = {
  [EventType.WITHDRAWAL]: EventRecurrence.ONCE,
  [EventType.POCKET_COST]: EventRecurrence.RECURRING,
  [EventType.POCKET_EXPENSE]: EventRecurrence.ONCE
};

/**
 * "Add outflow" popup of an account pocket (savings timeline):
 * - withdrawal: one-time move of money from the pocket to the income timeline (as before)
 * - cost: debits the pocket (one-time or periodic), e.g. account fees
 * - expense: works like an expense (same categories) but is paid from the pocket
 * Costs and expenses only lower the pocket balance; they never reach the income timeline.
 */
export default function WithdrawalModal({
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

  // Locked target pocket based on where the button was clicked
  const targetPocketId = useMemo(() => {
    if (initialData?.pocketId || initialData?.pocket_id) {
      return initialData.pocketId || initialData.pocket_id;
    }
    if (defaultPocketId) return defaultPocketId;
    return pockets.length > 0 ? pockets[0].id : '';
  }, [initialData, defaultPocketId, pockets]);

  const selectedPocket = useMemo(() => {
    return pockets.find((p) => p.id === targetPocketId) || pockets[0] || null;
  }, [pockets, targetPocketId]);

  // Locked base month and year from the trigger context
  const baseDateStr = useMemo(() => {
    return initialData?.date || defaultDate || format(new Date(), 'yyyy-MM-dd');
  }, [initialData?.date, defaultDate]);

  const baseMonthKey = useMemo(() => {
    return baseDateStr.substring(0, 7);
  }, [baseDateStr]);

  const initialDay = useMemo(() => {
    try {
      const parsed = parseISO(baseDateStr);
      return Number(format(parsed, 'd'));
    } catch {
      return 1;
    }
  }, [baseDateStr]);

  const initialType = OUTFLOW_TYPES.includes(initialData?.eventType) ? initialData.eventType : EventType.WITHDRAWAL;

  const [outflowType, setOutflowType] = useState(initialType);
  const [title, setTitle] = useState(initialData?.title || initialData?.name || '');
  const [amount, setAmount] = useState(initialData?.amount ? Math.abs(Number(initialData.amount)).toString() : '');
  const [dayOfMonth, setDayOfMonth] = useState(initialDay);
  const [recurrence, setRecurrence] = useState(DEFAULT_RECURRENCE[initialType]);
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

  useEffect(() => {
    if (isOpen) {
      const type = OUTFLOW_TYPES.includes(initialData?.eventType) ? initialData.eventType : EventType.WITHDRAWAL;
      setOutflowType(type);
      setTitle(initialData?.title || initialData?.name || '');
      setAmount(initialData?.amount ? Math.abs(Number(initialData.amount)).toString() : '');
      setDayOfMonth(initialDay);
      setRecurrence(initialData ? normalizeRecurrence(initialData) : DEFAULT_RECURRENCE[type]);
      setPeriodicity(initialData ? normalizePeriodicity(initialData.periodicity) : EventPeriodicity.MONTHLY);
      setRecurrenceEndDate(initialData?.limitDate || initialData?.limit_date || initialData?.recurrenceEndDate || '');
      const initialCategory = String(initialData?.category || '').toLowerCase();
      setCategory(expenseCategoryMeta[initialCategory] ? initialCategory : ExpenseEventCategory.OTHER);
      setIsAutomatic(Boolean(initialData?.isAutomatic ?? initialData?.automatic ?? false));
      setUpdateScope(EventUpdateMode.SINGLE);
      setIsDayPickerOpen(false);
      setIsEndMonthPickerOpen(false);
      setIsCategoryOpen(false);
      setError(null);
      setLoading(false);
    }
  }, [isOpen, initialData, initialDay, expenseCategoryMeta]);

  const maxAvailable = useMemo(() => {
    if (!selectedPocket) return 0;
    return calculatePocketAvailableBalance(
      selectedPocket,
      events,
      null,
      initialData?.id || null
    );
  }, [selectedPocket, events, initialData?.id]);

  if (!isOpen) return null;

  const isWithdrawal = outflowType === EventType.WITHDRAWAL;
  const isPocketExpense = outflowType === EventType.POCKET_EXPENSE;
  const isRecurring = !isWithdrawal && (recurrence === EventRecurrence.RECURRING || recurrence === EventRecurrence.LIMITED);
  const isSeriesEdit = isEditing && Boolean(initialData?.seriesId || initialData?.eventId || initialData?.isRecurring);
  const accent = TimelineColor.DANGER;

  const outflowOptions = OUTFLOW_TYPES.map((type) => ({
    id: type,
    label: t(`withdrawalModal.types.${type}`),
    icon: OUTFLOW_ICONS[type],
    color: accent,
    tooltip: t(`withdrawalModal.typesDesc.${type}`)
  }));

  const handleChangeType = (type) => {
    setOutflowType(type);
    setRecurrence(DEFAULT_RECURRENCE[type]);
    setIsAutomatic(type === EventType.POCKET_COST);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t('validation.titleRequired'));
      return;
    }

    if (!selectedPocket) {
      setError(t('withdrawalModal.noBalanceError'));
      return;
    }

    const numAmount = Number(amount);
    if (!numAmount || Number.isNaN(numAmount) || numAmount <= 0) {
      setError(t('validation.amountRequired'));
      return;
    }

    if (numAmount > maxAvailable + 0.001) {
      setError(t('withdrawalModal.amountExceedsError', { max: formatCurrency(maxAvailable) }));
      return;
    }

    const maxDays = getDaysInMonth(parseISO(`${baseMonthKey}-01`));
    const safeDay = Math.min(maxDays, Math.max(1, Number(dayOfMonth) || 1));
    const finalDateStr = `${baseMonthKey}-${String(safeDay).padStart(2, '0')}`;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    // One-time outflows on a past date are already done; periodic ones follow the automatic payment toggle
    const isCompleted = !isRecurring && finalDateStr <= todayStr;
    const settledStatus = isWithdrawal ? EventStatus.WITHDRAWN : EventStatus.PAID;
    const pendingStatus = isWithdrawal ? EventStatus.PLANNED : EventStatus.PENDING;
    const finalRecurrence = isWithdrawal ? EventRecurrence.ONCE : recurrence;
    const endDate = !isWithdrawal && recurrence === EventRecurrence.LIMITED && recurrenceEndDate ? recurrenceEndDate : null;

    const payload = {
      ...(initialData || {}),
      id: initialData?.id || generateUUID(),
      title: trimmedTitle,
      name: trimmedTitle,
      amount: -Math.abs(numAmount),
      date: finalDateStr,
      dayOfMonth: safeDay,
      pocketId: selectedPocket.id,
      pocket_id: selectedPocket.id,
      pocketName: selectedPocket.name,
      category: isPocketExpense ? category : InvestmentEventCategory.OTHER,
      eventType: outflowType,
      recurrence: finalRecurrence,
      periodicity: isRecurring ? periodicity : EventPeriodicity.MONTHLY,
      recurrenceEndDate: endDate,
      endDate,
      limitDate: endDate,
      limit_date: endDate,
      isWithdrawal,
      isInvestment: true,
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
      title={isEditing ? t('withdrawalModal.outflowEditTitle') : t('withdrawalModal.outflowTitle')}
      subtitle={selectedPocket?.name || timeline?.name || t('withdrawalModal.subtitle')}
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

      {/* Source pocket (fixed) with its available balance */}
      {selectedPocket && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '9px 12px',
            borderRadius: '8px',
            background: `${TimelineColor.INVESTMENT}14`,
            border: `1px solid ${TimelineColor.INVESTMENT}40`,
            marginBottom: '14px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PiggyBank size={15} style={{ color: TimelineColor.INVESTMENT }} />
            <span style={{ fontSize: '0.86rem', fontWeight: '700', color: 'var(--text-main)' }}>
              {selectedPocket.name}
            </span>
          </div>
          <span
            style={{
              fontSize: '0.74rem',
              fontWeight: '700',
              color: TimelineColor.INVESTMENT,
              background: `${TimelineColor.INVESTMENT}26`,
              padding: '2px 8px',
              borderRadius: '6px'
            }}
          >
            {formatCurrency(maxAvailable)}
          </span>
        </div>
      )}

      {/* Outflow type (fixed when editing) */}
      {!isEditing && (
        <OptionBoxGroup
          label={t('withdrawalModal.typeLabel')}
          options={outflowOptions}
          value={outflowType}
          onChange={handleChangeType}
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

      {/* Amount, limited to the pocket balance */}
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
                color: maxAvailable > 0 ? TimelineColor.DANGER : 'var(--text-dim)'
              }}
            >
              {t('withdrawalModal.maxAvailable', { amount: formatCurrency(maxAvailable) })}
            </span>
          }
        />
        {maxAvailable <= 0 && (
          <p style={{ margin: '4px 0 0 0', fontSize: '0.72rem', color: TimelineColor.DANGER, fontWeight: '600' }}>
            {t('withdrawalModal.noBalanceError')}
          </p>
        )}
      </div>

      {/* Expense category (same categories as the expenses timeline) */}
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

      {/* Recurrence of costs and expenses (one-time, recurring or period), like the other events */}
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

      {/* Periodic costs / expenses can be debited automatically */}
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
