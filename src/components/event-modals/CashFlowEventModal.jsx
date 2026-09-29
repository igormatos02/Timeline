import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Zap,
  Users,
  FileText,
  Sparkles
} from 'lucide-react';
import { format, parseISO, addMonths, getDaysInMonth } from 'date-fns';
import {
  EventRecurrence,
  EventPeriodicity,
  EventUpdateMode,
  EventType,
  EventModalTab,
  normalizeRecurrence,
  normalizePeriodicity
} from '../../../shared/enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useModalEscape } from '../../hooks/useModalEscape.js';
import ModalShell from '../ui/ModalShell.jsx';
import EuroInput from '../ui/EuroInput.jsx';
import RecurrenceSelector from '../ui/RecurrenceSelector.jsx';
import PeriodicitySelector from '../ui/PeriodicitySelector.jsx';
import MonthPickerPopover from '../ui/MonthPickerPopover.jsx';
import CategorySelector from '../ui/CategorySelector.jsx';
import DueDatePicker from '../ui/DueDatePicker.jsx';
import FloatingBreakdownPopover from '../ui/FloatingBreakdownPopover.jsx';
import ObligationSelector from '../ObligationSelector.jsx';
import { EVENT_MODAL_CONFIG, resolveEventModalConfig } from './FinancialEventModalConfig.js';
import { useTimeboard } from '../../context/TimeboardContext.jsx';

// Category of an existing event mapped to the categories this form offers
const resolveCategory = (config, category) => {
  let cat = category || config.categoryDefault;
  if (config.categoryLegacyMap?.[cat]) cat = config.categoryLegacyMap[cat];
  return config.categoryMeta[cat] ? cat : config.categoryDefault;
};

/**
 * Compact form for money coming in or going out (income and expense timelines).
 * Colors, titles, labels and categories come from FinancialEventModalConfig for the given event type.
 */
export default function CashFlowEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline,
  timeboardId,
  eventType = EventType.INCOME,
  // Account shown as the subtitle when the movement is stored elsewhere (wallet expenses before the migration)
  accountName
}) {
  const { isCondoflow } = useTimeboard();
  const config = useMemo(
    () => resolveEventModalConfig(EVENT_MODAL_CONFIG[eventType] || EVENT_MODAL_CONFIG[EventType.INCOME], isCondoflow),
    [eventType, isCondoflow]
  );
  const ACCENT = config.accent;
  const { t, dateLocale } = useTranslation();
  const titleInputRef = useRef(null);

  const isEditing = Boolean(initialData?.id || initialData?.eventId);
  const categoryMeta = config.categoryMeta;

  // Active section disclosures / tabs
  const [activeTab, setActiveTab] = useState(EventModalTab.OBLIGATION);
  const [isBreakdownOpen, setIsBreakdownOpen] = useState(false);

  const [isCategoryOpen, setIsCategoryOpen] = useState(false);
  const [isRecurrenceOpen, setIsRecurrenceOpen] = useState(false);
  const [isPeriodicityOpen, setIsPeriodicityOpen] = useState(false);
  const [isEndMonthPickerOpen, setIsEndMonthPickerOpen] = useState(false);
  const [endMonthPickerYear, setEndMonthPickerYear] = useState(new Date().getFullYear());
  const [updateScope, setUpdateScope] = useState(EventUpdateMode.SINGLE);
  const [breakdownItems, setBreakdownItems] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    dayOfMonth: 1,
    time: '09:00',
    status: config.defaultStatus,
    recurrence: EventRecurrence.ONCE,
    periodicity: EventPeriodicity.MONTHLY,
    recurrenceEndDate: '',
    amount: '',
    isAutomatic: false,
    category: config.categoryDefault,
    isObligation: false,
    obligationPersonId: '',
    pocketId: null
  });

  // A single subpart is not a breakdown: closing the popover with one (or none) goes back to the plain amount
  const closeBreakdown = () => {
    setIsBreakdownOpen(false);
    if (breakdownItems.length > 1) return;
    const onlyAmount = breakdownItems[0]?.amount;
    if (onlyAmount !== undefined && onlyAmount !== '') {
      setFormData((prev) => ({ ...prev, amount: onlyAmount }));
    }
    setBreakdownItems([]);
  };

  // Escape on the breakdown popover is handled by the popover itself (onClose -> closeBreakdown)
  useModalEscape(isOpen, onClose, [
    [isBreakdownOpen, setIsBreakdownOpen],
    [isCategoryOpen, setIsCategoryOpen],
    [isRecurrenceOpen, setIsRecurrenceOpen],
    [isPeriodicityOpen, setIsPeriodicityOpen],
    [isEndMonthPickerOpen, setIsEndMonthPickerOpen]
  ]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        if (titleInputRef.current) {
          titleInputRef.current.focus();
          titleInputRef.current.select();
        }
      }, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    const today = format(new Date(), 'yyyy-MM-dd');
    const targetDate = initialData?.date || defaultDate || today;

    let parsedDay = 1;
    if (initialData?.dayOfMonth) {
      parsedDay = Number(initialData.dayOfMonth);
    } else if (initialData?.date) {
      try {
        const parts = initialData.date.split('-');
        if (parts.length === 3) parsedDay = parseInt(parts[2], 10) || 1;
      } catch {
        parsedDay = 1;
      }
    } else {
      parsedDay = new Date().getDate();
    }

    const defaultEndMonth = format(addMonths(parseISO(targetDate), 6), 'yyyy-MM');

    if (initialData) {
      // Saved events keep their recurrence in several legacy shapes (isRecurring, limitDate...)
      const endDate = initialData.limitDate || initialData.limit_date || initialData.recurrenceEndDate || initialData.endDate || '';
      setFormData({
        title: initialData?.title || initialData?.name || '',
        description: initialData?.description || initialData?.notes || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData?.time || '09:00',
        status: initialData?.status || config.defaultStatus,
        recurrence: isEditing ? normalizeRecurrence(initialData) : (initialData?.recurrence || EventRecurrence.ONCE),
        periodicity: normalizePeriodicity(initialData?.periodicity || initialData?.aggregation),
        recurrenceEndDate: endDate ? String(endDate).substring(0, 7) : defaultEndMonth,
        amount: initialData?.amount !== undefined ? initialData.amount : '',
        isAutomatic: Boolean(initialData?.isAutomatic),
        category: resolveCategory(config, initialData?.category),
        isObligation: Boolean(initialData?.isObligation || initialData?.is_obligation),
        obligationPersonId: initialData?.obligationPersonId || initialData?.obligation_person_id || '',
        pocketId: initialData?.pocketId || initialData?.pocket_id || null
      });

      // Default active tab to obligation or description if editing
      if (initialData?.description && !initialData?.isObligation && !initialData?.obligationPersonId) {
        setActiveTab(EventModalTab.DESCRIPTION);
      } else {
        setActiveTab(EventModalTab.OBLIGATION);
      }

      if (Array.isArray(initialData?.breakdownItems) && initialData.breakdownItems.length > 0) {
        setBreakdownItems(JSON.parse(JSON.stringify(initialData.breakdownItems)));
      } else {
        setBreakdownItems([]);
      }
    } else {
      setFormData({
        title: '',
        description: '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '09:00',
        status: config.defaultStatus,
        recurrence: EventRecurrence.ONCE,
        periodicity: EventPeriodicity.MONTHLY,
        recurrenceEndDate: defaultEndMonth,
        amount: '',
        isAutomatic: false,
        category: config.categoryDefault,
        isObligation: false,
        obligationPersonId: '',
        pocketId: null
      });
      setActiveTab(EventModalTab.OBLIGATION);
      setBreakdownItems([]);
    }
    setIsBreakdownOpen(false);
    setUpdateScope(EventUpdateMode.SINGLE);
  }, [initialData, defaultDate, isOpen, isEditing, config]);

  const totalBreakdownAmount = breakdownItems.reduce(
    (acc, it) => acc + (parseFloat(it.amount) || 0), 0
  );

  const displayedAmount = breakdownItems.length > 0
    ? totalBreakdownAmount
    : (formData.amount !== undefined ? formData.amount : '');

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    if (!formData.title.trim()) return;

    const baseYearStr = format(parseISO(formData.date), 'yyyy');
    const baseMonthStr = format(parseISO(formData.date), 'MM');
    const totalDays = getDaysInMonth(parseISO(formData.date)) || 31;

    const safeDay = Math.min(totalDays, Math.max(1, Number(formData.dayOfMonth) || 1));
    const safeDayStr = safeDay.toString().padStart(2, '0');
    const finalDate = `${baseYearStr}-${baseMonthStr}-${safeDayStr}`;

    const finalAmount = breakdownItems.length > 0
      ? totalBreakdownAmount
      : (parseFloat(formData.amount) || 0);

    // The obligation follows the selected person: a person means obligation, no person means none
    const isObligation = Boolean(formData.obligationPersonId);
    const isRecurring = formData.recurrence === EventRecurrence.RECURRING || formData.recurrence === EventRecurrence.LIMITED;
    const recurrenceEndDate = formData.recurrence === EventRecurrence.LIMITED && formData.recurrenceEndDate
      ? formData.recurrenceEndDate
      : null;

    const payload = {
      // Editing keeps the fields this form doesn't show (labels, series ids...)
      ...(isEditing ? (initialData || {}) : {}),
      ...formData,
      name: formData.title.trim(),
      title: formData.title.trim(),
      description: formData.description ? formData.description.trim() : '',
      notes: formData.description ? formData.description.trim() : '',
      isObligation,
      obligationPersonId: isObligation ? formData.obligationPersonId : null,
      amount: finalAmount,
      date: finalDate,
      dayOfMonth: safeDay,
      periodicity: formData.periodicity || EventPeriodicity.MONTHLY,
      isRecurring,
      recurrenceEndDate,
      endDate: recurrenceEndDate,
      limitDate: recurrenceEndDate,
      limit_date: recurrenceEndDate,
      eventType: config.eventType,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      timeboardId: timeboardId || timeline?.timeboardId || timeline?.timeboard_id || null,
      pocketId: formData.pocketId || null,
      pocket_id: formData.pocketId || null,
      breakdownItems: breakdownItems.length > 0 ? breakdownItems : undefined,
      updateScope: isEditing ? updateScope : undefined,
      // "Correct" an effective movement: the original occurrence is cancelled once this one is saved
      correctionOf: initialData?.correctionOf || undefined
    };

    onSave(payload);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey && e.target.tagName !== 'TEXTAREA') {
      e.preventDefault();
      handleSubmit();
    }
  };

  if (!isOpen) return null;

  return (
    <ModalShell
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      title={
        initialData?.correctionOf
          ? t('modal.correctMovement')
          : isEditing
            ? t(config.titleKeys.editKey)
            : t(config.titleKeys.newKey)
      }
      subtitle={accountName || timeline?.name || t(config.subtitleKey)}
      accent={ACCENT}
      minHeight="520px"
      headerRight={
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '3px 8px',
            background: `${ACCENT}1f`,
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontWeight: '700',
            color: ACCENT,
            border: `1px solid ${ACCENT}40`
          }}
        >
          <Sparkles size={11} />
          <span>{t(config.subtitleKey)}</span>
        </div>
      }
      footer={
        <>
          {isEditing && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                {t('modal.scope')}:
              </span>
              <select
                value={updateScope}
                onChange={(e) => setUpdateScope(e.target.value)}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  background: 'var(--bg-glass)',
                  border: '1px solid var(--border-glass)',
                  color: 'var(--text-main)',
                  fontSize: '0.76rem',
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                <option value={EventUpdateMode.SINGLE}>{t('modal.scopeSingle')}</option>
                <option value={EventUpdateMode.SUBSEQUENT}>{t('modal.scopeFuture')}</option>
                <option value={EventUpdateMode.ALL_SERIES}>{t('modal.scopeAll')}</option>
              </select>
            </div>
          )}

          <div style={{ flex: 1 }} />

          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 14px',
              borderRadius: '8px',
              border: '1px solid var(--border-glass)',
              background: 'transparent',
              color: 'var(--text-muted)',
              fontSize: '0.84rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            {t('buttons.cancel')}
          </button>

          <button
            type="submit"
            style={{
              padding: '7px 18px',
              borderRadius: '8px',
              border: 'none',
              background: ACCENT,
              color: 'var(--bg-main)',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: `0 4px 14px ${ACCENT}40`
            }}
          >
            {isEditing ? t('buttons.save') : t(config.titleKeys.addKey)}
          </button>
        </>
      }
    >
      <div onKeyDown={handleKeyDown} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {/* 🌟 1. TWO-COLUMN GRID: TITLE & CATEGORY */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1.5fr) minmax(150px, 1fr)', gap: '10px', alignItems: 'flex-start' }}>
          {/* Hero Title Column */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: '600', marginBottom: '5px', color: 'var(--text-muted)' }}>
              {t(config.titleLabelKey)}
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={t(config.titlePlaceholderKey)}
              style={{
                width: '100%',
                height: '42px',
                padding: '0 14px',
                background: 'var(--bg-glass)',
                border: '1px solid var(--border-glass)',
                borderRadius: '8px',
                color: 'var(--text-main)',
                fontSize: '0.92rem',
                fontWeight: '600',
                outline: 'none',
                boxSizing: 'border-box',
                display: 'flex',
                alignItems: 'center',
                transition: 'border-color 0.15s ease'
              }}
              onFocus={(e) => (e.target.style.borderColor = ACCENT)}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-glass)')}
            />
          </div>

          {/* Category Column */}
          <div>
            <CategorySelector
              value={formData.category}
              onChange={(catKey) => setFormData((prev) => ({ ...prev, category: catKey }))}
              categoryMeta={categoryMeta}
              accent={ACCENT}
              translationPrefix={config.translationPrefix}
              label={t('modal.categoryLabel')}
              isOpen={isCategoryOpen}
              onToggle={() => {
                setIsCategoryOpen((prev) => !prev);
                setIsRecurrenceOpen(false);
                setIsPeriodicityOpen(false);
                setIsEndMonthPickerOpen(false);
                if (isBreakdownOpen) closeBreakdown();
              }}
              marginBottom="0"
            />
          </div>
        </div>

        {/* 🌟 2. TWO-COLUMN GRID: AMOUNT & DUE DATE */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(130px, 0.75fr) minmax(260px, 1.25fr)', gap: '10px', alignItems: 'flex-start' }}>
          {/* Amount Column */}
          <div style={{ position: 'relative' }}>
            <EuroInput
              label={t(config.amountLabelKey)}
              value={displayedAmount}
              accent={ACCENT}
              readOnly={breakdownItems.length > 0}
              onChange={(e) => {
                if (breakdownItems.length === 0) {
                  setFormData((prev) => ({ ...prev, amount: e.target.value }));
                }
              }}
              labelExtra={breakdownItems.length > 0 ? (
                <span style={{ fontSize: '0.72rem', color: ACCENT, fontWeight: '800' }}>
                  ({breakdownItems.length} {t('modal.subparts').toLowerCase()})
                </span>
              ) : null}
              onBreakdownToggle={() => {
                if (isBreakdownOpen) closeBreakdown();
                else setIsBreakdownOpen(true);
                setIsCategoryOpen(false);
                setIsRecurrenceOpen(false);
                setIsPeriodicityOpen(false);
                setIsEndMonthPickerOpen(false);
              }}
              isBreakdownActive={isBreakdownOpen || breakdownItems.length > 0}
              breakdownCount={breakdownItems.length}
              breakdownTitle={t('modal.splitIntoSubparts')}
              marginBottom="0"
            />

            <FloatingBreakdownPopover
              isOpen={isBreakdownOpen}
              onClose={closeBreakdown}
              items={breakdownItems}
              onChange={setBreakdownItems}
              accent={ACCENT}
              t={t}
              initialAmount={formData.amount}
            />
          </div>

          {/* Date & Day Column */}
          <div>
            <DueDatePicker
              date={formData.date}
              day={formData.dayOfMonth}
              onChange={({ date, day }) => setFormData((prev) => ({ ...prev, date, dayOfMonth: day }))}
              accent={ACCENT}
              dayLabel={t('modal.dayOfMonth')}
              onOpen={() => {
                setIsEndMonthPickerOpen(false);
                setIsCategoryOpen(false);
                setIsRecurrenceOpen(false);
                setIsPeriodicityOpen(false);
                if (isBreakdownOpen) closeBreakdown();
              }}
              marginBottom="0"
            />
          </div>
        </div>

        {/* 🌟 3. TWO-COLUMN ROW: RECURRENCE & PERIODICITY */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'flex-start' }}>
          {/* Recurrence */}
          <div>
            <RecurrenceSelector
              value={formData.recurrence}
              onChange={(recId) => {
                setFormData((prev) => {
                  if (recId === EventRecurrence.LIMITED && !prev.recurrenceEndDate) {
                    return {
                      ...prev,
                      recurrence: recId,
                      recurrenceEndDate: format(addMonths(parseISO(prev.date || format(new Date(), 'yyyy-MM-dd')), 6), 'yyyy-MM')
                    };
                  }
                  return { ...prev, recurrence: recId };
                });
              }}
              accent={ACCENT}
              label={t('modal.recurrence')}
              isOpen={isRecurrenceOpen}
              onToggle={() => {
                setIsRecurrenceOpen((prev) => !prev);
                setIsCategoryOpen(false);
                setIsPeriodicityOpen(false);
                setIsEndMonthPickerOpen(false);
                if (isBreakdownOpen) closeBreakdown();
              }}
              marginBottom="0"
            />
          </div>

          {/* Periodicity (disabled and empty for movements that don't repeat) */}
          <div>
            <PeriodicitySelector
              value={formData.periodicity}
              onChange={(pId) => setFormData((prev) => ({ ...prev, periodicity: pId }))}
              accent={ACCENT}
              label={t('modal.periodicity')}
              isOpen={isPeriodicityOpen}
              onToggle={() => {
                setIsPeriodicityOpen((prev) => !prev);
                setIsCategoryOpen(false);
                setIsRecurrenceOpen(false);
                setIsEndMonthPickerOpen(false);
                if (isBreakdownOpen) closeBreakdown();
              }}
              disabled={formData.recurrence === EventRecurrence.ONCE}
              marginBottom="0"
            />
          </div>
        </div>

        {/* Floating End Month Picker when Limited */}
        {formData.recurrence === EventRecurrence.LIMITED && (
          <MonthPickerPopover
            value={formData.recurrenceEndDate}
            onChange={(month) => setFormData({ ...formData, recurrenceEndDate: month })}
            accent={ACCENT}
            dateLocale={dateLocale}
            label={t('modal.endMonth')}
            isOpen={isEndMonthPickerOpen}
            onToggle={() => {
              setIsEndMonthPickerOpen((prev) => !prev);
              setIsCategoryOpen(false);
              setIsRecurrenceOpen(false);
              setIsPeriodicityOpen(false);
              if (isBreakdownOpen) closeBreakdown();
            }}
            year={endMonthPickerYear}
            onYearChange={setEndMonthPickerYear}
            baseDate={formData.date}
            explanation={t('modal.periodExplanation', {
              start: format(parseISO(formData.date), 'MMMM yyyy', { locale: dateLocale }),
              end: formData.recurrenceEndDate
                ? format(parseISO(`${formData.recurrenceEndDate}-01`), 'MMMM yyyy', { locale: dateLocale })
                : '...'
            })}
          />
        )}

        {/* 🌟 4. PROGRESSIVE DISCLOSURE TABS (MAIS OPÇÕES) */}
        <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: '1px solid var(--border-glass)',
              paddingBottom: '0px',
              marginBottom: activeTab ? '10px' : '0'
            }}
          >
            {/* Left: Tab items with underline indicator */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              {/* Obligation Tab */}
              <button
                type="button"
                onClick={() => setActiveTab((prev) => (prev === EventModalTab.OBLIGATION ? null : EventModalTab.OBLIGATION))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 2px 8px 2px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === EventModalTab.OBLIGATION ? `2px solid ${ACCENT}` : '2px solid transparent',
                  color: activeTab === EventModalTab.OBLIGATION ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === EventModalTab.OBLIGATION ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <Users size={14} style={{ color: activeTab === EventModalTab.OBLIGATION ? ACCENT : 'var(--text-muted)' }} />
                <span>{t('modal.obligationBadge')}</span>
                {formData.obligationPersonId ? (
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ACCENT }} />
                ) : null}
              </button>

              {/* Separator */}
              <span style={{ color: 'var(--border-glass)', fontSize: '0.85rem', userSelect: 'none', opacity: 0.8 }}>|</span>

              {/* Description Tab */}
              <button
                type="button"
                onClick={() => setActiveTab((prev) => (prev === EventModalTab.DESCRIPTION ? null : EventModalTab.DESCRIPTION))}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 2px 8px 2px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: activeTab === EventModalTab.DESCRIPTION ? `2px solid ${ACCENT}` : '2px solid transparent',
                  color: activeTab === EventModalTab.DESCRIPTION ? 'var(--text-main)' : 'var(--text-muted)',
                  fontSize: '0.8rem',
                  fontWeight: activeTab === EventModalTab.DESCRIPTION ? '700' : '500',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  position: 'relative'
                }}
              >
                <FileText size={14} style={{ color: activeTab === EventModalTab.DESCRIPTION ? ACCENT : 'var(--text-muted)' }} />
                <span>{t('modal.description')}</span>
                {formData.description ? (
                  <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: ACCENT }} />
                ) : null}
              </button>
            </div>

            {/* Right: Inline Clean Switch for Automatic */}
            <div
              onClick={() => setFormData((prev) => ({ ...prev, isAutomatic: !prev.isAutomatic }))}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                padding: '3px 0 6px 0',
                userSelect: 'none'
              }}
            >
              <Zap size={13} style={{ color: formData.isAutomatic ? ACCENT : 'var(--text-muted)' }} />
              <span style={{ fontSize: '0.76rem', fontWeight: '600', color: formData.isAutomatic ? 'var(--text-main)' : 'var(--text-muted)' }}>
                {t('modal.automatic')}
              </span>
              {/* Sleek toggle switch */}
              <div
                style={{
                  width: '28px',
                  height: '16px',
                  borderRadius: '10px',
                  background: formData.isAutomatic ? ACCENT : 'var(--border-glass)',
                  position: 'relative',
                  transition: 'background 0.2s ease'
                }}
              >
                <div
                  style={{
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    background: 'var(--bg-main)',
                    position: 'absolute',
                    top: '2px',
                    left: formData.isAutomatic ? '14px' : '2px',
                    transition: 'left 0.2s ease',
                    boxShadow: 'var(--shadow-xs)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Active Tab Panel */}
          {activeTab && (
            <div style={{ marginTop: '8px', minHeight: '78px' }}>
              {activeTab === EventModalTab.DESCRIPTION && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    minHeight: '78px',
                    boxSizing: 'border-box'
                  }}
                >
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('modal.descriptionNotesPlaceholder')}
                    style={{
                      width: '100%',
                      height: '56px',
                      padding: '8px 10px',
                      background: 'var(--bg-glass)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '6px',
                      color: 'var(--text-main)',
                      fontSize: '0.84rem',
                      outline: 'none',
                      boxSizing: 'border-box',
                      resize: 'none',
                      fontFamily: 'inherit'
                    }}
                  />
                </div>
              )}

              {activeTab === EventModalTab.OBLIGATION && (
                <div
                  style={{
                    background: 'var(--bg-card)',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-glass)',
                    minHeight: '78px',
                    boxSizing: 'border-box',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ width: '100%' }}>
                    <ObligationSelector
                      isObligation={Boolean(formData.obligationPersonId)}
                      obligationPersonId={formData.obligationPersonId}
                      timeboardId={timeboardId}
                      accentColor={ACCENT}
                      t={t}
                      onChange={({ isObligation, obligationPersonId }) => {
                        setFormData((prev) => ({ ...prev, isObligation, obligationPersonId }));
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
}