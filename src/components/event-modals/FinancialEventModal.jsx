import React, { useState, useEffect, useRef } from 'react';
import {
  Zap,
  Repeat,
  ExternalLink
} from 'lucide-react';
import { format, parseISO, addMonths, getDaysInMonth } from 'date-fns';
import { EventPeriodicity, EventUpdateMode } from '../../../shared/enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useModalEscape } from '../../hooks/useModalEscape.js';
import ModalShell from '../ui/ModalShell.jsx';
import EuroInput from '../ui/EuroInput.jsx';
import CategorySelector from '../ui/CategorySelector.jsx';
import PeriodicitySelector from '../ui/PeriodicitySelector.jsx';
import MonthPickerPopover from '../ui/MonthPickerPopover.jsx';
import DayPickerPopover from '../ui/DayPickerPopover.jsx';
import ToggleSwitch from '../ui/ToggleSwitch.jsx';
import BreakdownItems from '../ui/BreakdownItems.jsx';
import ObligationSelector from '../ObligationSelector.jsx';
import { EVENT_MODAL_CONFIG } from './FinancialEventModalConfig.js';

export default function FinancialEventModal({
  isOpen, onClose, onSave, initialData, defaultDate, timeline, timeboardId, eventType = 'income'
}) {
  const config = EVENT_MODAL_CONFIG[eventType] || EVENT_MODAL_CONFIG.income;
  const ACCENT = config.accent;
  const { t, dateLocale } = useTranslation();
  const titleInputRef = useRef(null);

  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isEndMonthPickerOpen, setIsEndMonthPickerOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [endMonthPickerYear, setEndMonthPickerYear] = useState(new Date().getFullYear());
  const [updateScope, setUpdateScope] = useState(EventUpdateMode.SINGLE);
  const [breakdownItems, setBreakdownItems] = useState([]);
  const [obligationError, setObligationError] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    dayOfMonth: 1,
    time: '09:00',
    status: config.defaultStatus,
    periodicity: EventPeriodicity.RECURRING,
    recurrenceEndDate: '',
    amount: '',
    initialInvestedAmount: '',
    targetAmount: '',
    labelsInput: '',
    isAutomatic: false,
    isExternal: false,
    category: config.categoryDefault,
    isObligation: false,
    obligationPersonId: ''
  });

  useModalEscape(isOpen, onClose, [
    [isDayPickerOpen, setIsDayPickerOpen],
    [isEndMonthPickerOpen, setIsEndMonthPickerOpen],
    [isCategoryDropdownOpen, setIsCategoryDropdownOpen]
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

    const cfg = EVENT_MODAL_CONFIG[eventType] || EVENT_MODAL_CONFIG.income;

    const today = format(new Date(), 'yyyy-MM-dd');
    const targetDate = initialData?.date || defaultDate || today;

    let parsedDay = 1;
    let initialYear = new Date().getFullYear();
    try {
      const d = parseISO(targetDate);
      if (!isNaN(d.getDate())) parsedDay = d.getDate();
      if (!isNaN(d.getFullYear())) initialYear = d.getFullYear();
    } catch {
      parsedDay = 1;
      initialYear = new Date().getFullYear();
    }

    if (initialData) {
      let initPeriodicity = EventPeriodicity.RECURRING;
      if (
        initialData.periodicity === EventPeriodicity.PERIOD ||
        initialData.periodicity === 'period' ||
        initialData.periodicity === 'periodo' ||
        initialData.recurrenceEndDate ||
        initialData.endDate
      ) {
        initPeriodicity = EventPeriodicity.PERIOD;
      } else if (
        initialData.periodicity === EventPeriodicity.ONCE ||
        initialData.periodicity === 'once' ||
        initialData.periodicity === 'unica' ||
        initialData.periodicity === 'unico'
      ) {
        initPeriodicity = EventPeriodicity.ONCE;
      }

      const endRecDate = initialData.recurrenceEndDate || initialData.endDate || '';
      if (endRecDate) {
        try {
          const ey = parseInt(endRecDate.split('-')[0], 10);
          if (!isNaN(ey)) setEndMonthPickerYear(ey);
        } catch { }
      }

      let cat = initialData.category || cfg.categoryDefault;
      if (cfg.categoryLegacyMap && cfg.categoryLegacyMap[cat]) {
        cat = cfg.categoryLegacyMap[cat];
      }

      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || cfg.defaultStatus,
        periodicity: initPeriodicity,
        recurrenceEndDate: endRecDate,
        amount: initialData.amount !== undefined
          ? initialData.amount
          : (cfg.showInitialTarget ? (initialData.initialInvestedAmount || '') : ''),
        initialInvestedAmount: cfg.showInitialTarget && initialData.initialInvestedAmount !== undefined && initialData.initialInvestedAmount !== null ? initialData.initialInvestedAmount : '',
        targetAmount: cfg.showInitialTarget && initialData.targetAmount !== undefined && initialData.targetAmount !== null ? initialData.targetAmount : '',
        labelsInput: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : '',
        isAutomatic: Boolean(initialData.isAutomatic),
        isExternal: cfg.showIsExternal ? Boolean(initialData.isExternal !== undefined ? initialData.isExternal : initialData.is_external) : false,
        category: cat,
        isObligation: Boolean(initialData.isObligation || initialData.is_obligation),
        obligationPersonId: initialData.obligationPersonId || initialData.obligation_person_id || ''
      });
      setUpdateScope(EventUpdateMode.SUBSEQUENT);
      if (cfg.useBreakdown) {
        setBreakdownItems(initialData.breakdownItems ? JSON.parse(JSON.stringify(initialData.breakdownItems)) : []);
      }
    } else {
      let defaultEndMonth = format(addMonths(parseISO(targetDate), 6), 'yyyy-MM');
      try {
        const d6 = addMonths(parseISO(targetDate), 6);
        defaultEndMonth = format(d6, 'yyyy-MM');
        setEndMonthPickerYear(d6.getFullYear());
      } catch {
        setEndMonthPickerYear(initialYear);
      }

      setFormData({
        title: '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '09:00',
        status: cfg.defaultStatus,
        periodicity: EventPeriodicity.RECURRING,
        recurrenceEndDate: defaultEndMonth,
        amount: '',
        initialInvestedAmount: '',
        targetAmount: '',
        labelsInput: '',
        isAutomatic: false,
        isExternal: false,
        category: cfg.categoryDefault,
        isObligation: false,
        obligationPersonId: ''
      });
      setUpdateScope(EventUpdateMode.SINGLE);
      if (cfg.useBreakdown) {
        setBreakdownItems([]);
      }
    }
    setObligationError(false);
  }, [initialData, defaultDate, isOpen, eventType]);

  const totalBreakdownAmount = breakdownItems.reduce(
    (acc, it) => acc + (parseFloat(it.amount) || 0), 0
  );

  const displayedAmount = config.useBreakdown && breakdownItems.length > 0
    ? totalBreakdownAmount
    : (formData.amount !== undefined ? formData.amount : '');

  const isFirstEvent = !initialData || Boolean(initialData.isFirstOccurrence) || (!initialData.isProjected && !initialData.id?.includes('_') && (initialData.version === undefined || Number(initialData.version) === 0));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;
    if (formData.isObligation && !formData.obligationPersonId) {
      setObligationError(true);
      return;
    }
    setObligationError(false);

    const baseYearStr = format(parseISO(formData.date), 'yyyy');
    const baseMonthStr = format(parseISO(formData.date), 'MM');
    const totalDays = getDaysInMonth(parseISO(formData.date)) || 31;

    const safeDay = Math.min(totalDays, Math.max(1, Number(formData.dayOfMonth) || 1));
    const safeDayStr = safeDay.toString().padStart(2, '0');
    const finalDate = `${baseYearStr}-${baseMonthStr}-${safeDayStr}`;

    const finalAmount = config.useBreakdown && breakdownItems.length > 0
      ? totalBreakdownAmount
      : (parseFloat(formData.amount) || 0);

    const finalInitialAmount = config.showInitialTarget
      ? (isFirstEvent
        ? (formData.initialInvestedAmount !== '' ? (parseFloat(formData.initialInvestedAmount) || 0) : 0)
        : (initialData?.initialInvestedAmount !== undefined ? (parseFloat(initialData.initialInvestedAmount) || 0) : 0))
      : undefined;

    const finalTargetAmount = config.showInitialTarget
      ? (formData.targetAmount !== '' ? (parseFloat(formData.targetAmount) || 0) : 0)
      : undefined;

    const labels = formData.labelsInput
      ? formData.labelsInput.split(',').map((l) => l.trim()).filter(Boolean)
      : [];

    const isRecurring = formData.periodicity === EventPeriodicity.RECURRING || formData.periodicity === EventPeriodicity.PERIOD;
    const recurrenceEndDate = formData.periodicity === EventPeriodicity.PERIOD && formData.recurrenceEndDate
      ? formData.recurrenceEndDate
      : null;

    const payload = {
      ...(initialData || {}),
      name: formData.title.trim(),
      title: formData.title.trim(),
      date: finalDate,
      time: formData.time,
      status: initialData ? (initialData.status || config.defaultStatus) : config.defaultStatus,
      periodicity: formData.periodicity,
      isRecurring,
      recurrenceEndDate,
      endDate: recurrenceEndDate,
      amount: finalAmount,
      eventType: config.eventType,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      labels,
      category: formData.category || config.categoryDefault,
      isAutomatic: formData.isAutomatic,
      isObligation: Boolean(formData.isObligation),
      obligationPersonId: formData.isObligation ? formData.obligationPersonId : null,
      updateScope: (initialData?.seriesId || initialData?.eventId || initialData?.isRecurring || isRecurring) ? updateScope : undefined
    };

    if (config.useBreakdown) {
      payload.breakdownItems = breakdownItems.length > 0 ? breakdownItems : undefined;
    }

    if (config.includeSnakeObligation) {
      payload.is_obligation = Boolean(formData.isObligation);
      payload.obligation_person_id = formData.isObligation ? formData.obligationPersonId : null;
    }

    if (config.showIsExternal) {
      payload.isExternal = Boolean(formData.isExternal);
      payload.is_external = Boolean(formData.isExternal);
    }

    if (config.showInitialTarget) {
      payload.initialInvestedAmount = finalInitialAmount;
      payload.targetAmount = finalTargetAmount;
    }

    onSave(payload);
    onClose();
  };

  const subtitle = `${timeline?.name || t(config.subtitleKey) || config.subtitleFallback} • ${format(parseISO(formData.date), 'MMMM yyyy', { locale: dateLocale })}`;

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} accent={ACCENT}
      icon={config.icon}
      title={initialData ? (t(config.titleKeys.editKey) || config.titleKeys.editFallback) : (t(config.titleKeys.newKey) || config.titleKeys.newFallback)}
      subtitle={subtitle}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px' }}>{t('modal.cancel') || 'Cancelar'}</button>
          <button type="submit" className="btn btn-primary btn-sm"
            style={{
              background: config.submitBg,
              borderColor: config.submitBorder,
              boxShadow: config.submitShadow,
              padding: '8px 20px', borderRadius: '8px', fontWeight: '800',
              color: config.submitText || undefined
            }}>
            {initialData ? (t('modal.saveChanges') || 'Salvar Alterações') : (t(config.titleKeys.addKey) || config.titleKeys.addFallback)}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
          {t(config.titleLabelKey) || config.titleLabelFallback}
        </label>
        <input
          ref={titleInputRef}
          type="text"
          required
          autoFocus
          placeholder={t(config.titlePlaceholderKey) || config.titlePlaceholderFallback}
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          className="form-input"
          style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
        />
      </div>

      {!initialData && (
        <CategorySelector
          value={formData.category}
          onChange={(category) => setFormData((prev) => ({ ...prev, category }))}
          categoryMeta={config.categoryMeta}
          accent={ACCENT}
          translationPrefix={config.translationPrefix}
          t={t}
          label={t('modal.categoryLabel') || t('sidebar.categoryType') || 'Categoria'}
          isOpen={isCategoryDropdownOpen}
          onToggle={() => {
            setIsCategoryDropdownOpen(!isCategoryDropdownOpen);
            setIsDayPickerOpen(false);
            setIsEndMonthPickerOpen(false);
          }}
        />
      )}

      <EuroInput
        label={t(config.amountLabelKey) || config.amountLabelFallback}
        value={displayedAmount}
        accent={ACCENT}
        readOnly={config.useBreakdown && breakdownItems.length > 0}
        background={config.useBreakdown && breakdownItems.length > 0 ? config.amountBg : undefined}
        onChange={(e) => {
          if (!config.useBreakdown || breakdownItems.length === 0) {
            setFormData((prev) => ({ ...prev, amount: e.target.value }));
          }
        }}
        labelExtra={config.useBreakdown && breakdownItems.length > 0 ? (
          <span style={{ fontSize: '0.72rem', color: ACCENT, fontWeight: '800' }}>
            ({breakdownItems.length} {(t('modal.subparts') || 'Subpartes').toLowerCase()})
          </span>
        ) : null}
      />

      {config.useBreakdown && (
        <BreakdownItems
          items={breakdownItems}
          onChange={setBreakdownItems}
          accent={ACCENT}
          t={t}
          initialAmount={formData.amount}
        />
      )}

      {config.showInitialTarget && (
        <div style={{ display: 'grid', gridTemplateColumns: isFirstEvent ? '1fr 1fr' : '1fr', gap: '10px', marginBottom: '16px' }}>
          {isFirstEvent && (
            <EuroInput
              label={t('modal.initialInvestedAmount') || 'Aporte Inicial (€)'}
              value={formData.initialInvestedAmount}
              accent="#64748b"
              required={false}
              fontSize="0.9rem"
              marginBottom="0"
              onChange={(e) => setFormData({ ...formData, initialInvestedAmount: e.target.value })}
            />
          )}
          <EuroInput
            label={t('modal.targetAmount') || 'Meta Final (€)'}
            value={formData.targetAmount}
            accent="#64748b"
            required={false}
            fontSize="0.9rem"
            marginBottom="0"
            onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
          />
        </div>
      )}

      {!initialData && (
        <>
          <PeriodicitySelector
            value={formData.periodicity}
            onChange={(id) => {
              setFormData((prev) => {
                if (id === EventPeriodicity.PERIOD && !prev.recurrenceEndDate) {
                  return {
                    ...prev,
                    periodicity: id,
                    recurrenceEndDate: format(addMonths(parseISO(prev.date || format(new Date(), 'yyyy-MM-dd')), 6), 'yyyy-MM')
                  };
                }
                return { ...prev, periodicity: id };
              });
            }}
            accent={ACCENT}
            t={t}
          />
          {formData.periodicity === EventPeriodicity.PERIOD && (
            <MonthPickerPopover
              value={formData.recurrenceEndDate}
              onChange={(month) => setFormData({ ...formData, recurrenceEndDate: month })}
              accent={ACCENT}
              dateLocale={dateLocale}
              label={t('modal.endMonth') || 'Mês Final'}
              isOpen={isEndMonthPickerOpen}
              onToggle={() => {
                setIsEndMonthPickerOpen(!isEndMonthPickerOpen);
                setIsDayPickerOpen(false);
                setIsCategoryDropdownOpen(false);
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
        </>
      )}

      <DayPickerPopover
        label={t('modal.dayOfMonth') || config.dayLabelFallback}
        value={formData.dayOfMonth}
        onChange={(day) => setFormData((prev) => ({ ...prev, dayOfMonth: day }))}
        accent={ACCENT}
        dateLocale={dateLocale}
        baseDate={formData.date}
        isOpen={isDayPickerOpen}
        onToggle={() => {
          setIsDayPickerOpen(!isDayPickerOpen);
          setIsEndMonthPickerOpen(false);
          setIsCategoryDropdownOpen(false);
        }}
      />

      <ToggleSwitch
        checked={formData.isAutomatic}
        onChange={(val) => setFormData({ ...formData, isAutomatic: val })}
        label={t('modal.automatic') || config.automaticLabelFallback}
        icon={Zap}
        accent={ACCENT}
      />

      {config.showIsExternal && (
        <ToggleSwitch
          checked={formData.isExternal}
          onChange={(val) => setFormData({ ...formData, isExternal: val })}
          label={t('modal.isExternalDeposit') || 'É depósito externo?'}
          icon={ExternalLink}
          accent={ACCENT}
          hint={t('modal.isExternalDepositHint') || 'Não abate das entradas no cálculo de saldo/comprometimento.'}
        />
      )}

      {initialData && (initialData.seriesId || initialData.eventId || initialData.isRecurring || formData.periodicity === EventPeriodicity.RECURRING || formData.periodicity === EventPeriodicity.PERIOD) && (
        <ToggleSwitch
          checked={updateScope === EventUpdateMode.SUBSEQUENT}
          onChange={(val) => setUpdateScope(val ? EventUpdateMode.SUBSEQUENT : EventUpdateMode.SINGLE)}
          label={t('modal.changeSubsequent') || 'Aplicar alterações aos meses futuros'}
          icon={Repeat}
          accent={ACCENT}
        />
      )}

      <ObligationSelector
        isObligation={formData.isObligation}
        obligationPersonId={formData.obligationPersonId}
        onToggleObligation={(val) => {
          setFormData((prev) => ({
            ...prev,
            isObligation: val,
            obligationPersonId: val ? prev.obligationPersonId : ''
          }));
          if (!val) setObligationError(false);
        }}
        onSelectPerson={(personId) => {
          setFormData((prev) => ({ ...prev, obligationPersonId: personId }));
          if (personId) setObligationError(false);
        }}
        timeboardId={timeboardId || timeline?.timeboardId || timeline?.timeboard_id}
        accentColor={ACCENT}
        showError={obligationError}
      />
    </ModalShell>
  );
}