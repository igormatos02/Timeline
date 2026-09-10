import React, { useState, useEffect, useRef } from 'react';
import {
  PiggyBank,
  TrendingUp,
  Layers,
  Landmark,
  Zap,
  Sparkles,
  Tag,
  Repeat,
  ExternalLink
} from 'lucide-react';
import { format, parseISO, addMonths, getDaysInMonth } from 'date-fns';
import { EventStatus, EventPeriodicity, EventType, InvestmentEventCategory, EventUpdateMode } from '../../../shared/enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';
import { useModalEscape } from '../../hooks/useModalEscape.js';
import ModalShell from '../ui/ModalShell.jsx';
import EuroInput from '../ui/EuroInput.jsx';
import CategorySelector from '../ui/CategorySelector.jsx';
import PeriodicitySelector from '../ui/PeriodicitySelector.jsx';
import MonthPickerPopover from '../ui/MonthPickerPopover.jsx';
import DayPickerPopover from '../ui/DayPickerPopover.jsx';
import ToggleSwitch from '../ui/ToggleSwitch.jsx';
import ObligationSelector from '../ObligationSelector.jsx';

const ACCENT = '#8b5cf6';

const INVESTMENT_CATEGORY_META = {
  [InvestmentEventCategory.SAVINGS]: { icon: PiggyBank, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  [InvestmentEventCategory.STOCKS]: { icon: TrendingUp, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  [InvestmentEventCategory.FUNDS]: { icon: Layers, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  [InvestmentEventCategory.REAL_ESTATE]: { icon: Landmark, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  [InvestmentEventCategory.CRYPTO]: { icon: Zap, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  [InvestmentEventCategory.ASSETS]: { icon: Sparkles, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  [InvestmentEventCategory.OTHER]: { icon: Tag, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
};

export default function InvestmentEventModal({
  isOpen, onClose, onSave, initialData, defaultDate, timeline, timeboardId
}) {
  const { t, dateLocale } = useTranslation();
  const titleInputRef = useRef(null);

  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isEndMonthPickerOpen, setIsEndMonthPickerOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [endMonthPickerYear, setEndMonthPickerYear] = useState(new Date().getFullYear());
  const [updateScope, setUpdateScope] = useState(EventUpdateMode.SINGLE);
  const [obligationError, setObligationError] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || format(new Date(), 'yyyy-MM-dd'),
    dayOfMonth: 1,
    time: '09:00',
    status: EventStatus.PLANNED,
    periodicity: EventPeriodicity.RECURRING,
    recurrenceEndDate: '',
    amount: '',
    initialInvestedAmount: '',
    targetAmount: '',
    labelsInput: '',
    isAutomatic: false,
    isExternal: false,
    category: InvestmentEventCategory.SAVINGS,
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

      let cat = initialData.category || InvestmentEventCategory.SAVINGS;
      if (cat === 'investimento_poupanca') cat = InvestmentEventCategory.SAVINGS;
      else if (cat === 'investimento_patrimonio') cat = InvestmentEventCategory.ASSETS;
      else if (cat === 'investimento_outros') cat = InvestmentEventCategory.OTHER;

      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || EventStatus.PLANNED,
        periodicity: initPeriodicity,
        recurrenceEndDate: endRecDate,
        amount: initialData.amount !== undefined ? initialData.amount : (initialData.initialInvestedAmount || ''),
        initialInvestedAmount: initialData.initialInvestedAmount !== undefined && initialData.initialInvestedAmount !== null ? initialData.initialInvestedAmount : '',
        targetAmount: initialData.targetAmount !== undefined && initialData.targetAmount !== null ? initialData.targetAmount : '',
        labelsInput: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : '',
        isAutomatic: Boolean(initialData.isAutomatic),
        isExternal: Boolean(initialData.isExternal !== undefined ? initialData.isExternal : initialData.is_external),
        category: cat,
        isObligation: Boolean(initialData.isObligation || initialData.is_obligation),
        obligationPersonId: initialData.obligationPersonId || initialData.obligation_person_id || ''
      });
      setUpdateScope(EventUpdateMode.SUBSEQUENT);
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
        status: EventStatus.PLANNED,
        periodicity: EventPeriodicity.RECURRING,
        recurrenceEndDate: defaultEndMonth,
        amount: '',
        initialInvestedAmount: '',
        targetAmount: '',
        labelsInput: '',
        isAutomatic: false,
        isExternal: false,
        category: InvestmentEventCategory.SAVINGS,
        isObligation: false,
        obligationPersonId: ''
      });
      setUpdateScope(EventUpdateMode.SINGLE);
    }
  }, [initialData, defaultDate, isOpen]);

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

    const finalAmount = parseFloat(formData.amount) || 0;
    const finalInitialAmount = isFirstEvent
      ? (formData.initialInvestedAmount !== '' ? (parseFloat(formData.initialInvestedAmount) || 0) : 0)
      : (initialData?.initialInvestedAmount !== undefined ? (parseFloat(initialData.initialInvestedAmount) || 0) : 0);
    const finalTargetAmount = formData.targetAmount !== '' ? (parseFloat(formData.targetAmount) || 0) : 0;

    const labels = formData.labelsInput
      ? formData.labelsInput.split(',').map((l) => l.trim()).filter(Boolean)
      : [];

    const isRecurring = formData.periodicity === EventPeriodicity.RECURRING || formData.periodicity === EventPeriodicity.PERIOD;
    const recurrenceEndDate = formData.periodicity === EventPeriodicity.PERIOD && formData.recurrenceEndDate
      ? formData.recurrenceEndDate
      : null;

    onSave({
      ...(initialData || {}),
      name: formData.title.trim(),
      title: formData.title.trim(),
      date: finalDate,
      time: formData.time,
      status: initialData ? (initialData.status || EventStatus.PLANNED) : EventStatus.PLANNED,
      periodicity: formData.periodicity,
      isRecurring,
      recurrenceEndDate,
      endDate: recurrenceEndDate,
      amount: finalAmount,
      initialInvestedAmount: finalInitialAmount,
      targetAmount: finalTargetAmount,
      eventType: EventType.INVESTMENT,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      labels,
      category: formData.category || InvestmentEventCategory.SAVINGS,
      isAutomatic: formData.isAutomatic,
      isExternal: Boolean(formData.isExternal),
      is_external: Boolean(formData.isExternal),
      isObligation: formData.isObligation,
      obligationPersonId: formData.isObligation ? formData.obligationPersonId : null,
      updateScope: (initialData?.seriesId || initialData?.eventId || initialData?.isRecurring || isRecurring) ? updateScope : undefined
    });
    onClose();
  };

  const subtitle = `${timeline?.name || t('timeline.investments') || 'Investimentos'} • ${format(parseISO(formData.date), 'MMMM yyyy', { locale: dateLocale })}`;

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} accent={ACCENT}
      icon={PiggyBank}
      title={initialData ? (t('modal.editInvestment') || 'Editar Investimento') : (t('modal.newInvestment') || 'Novo Investimento')}
      subtitle={subtitle}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px' }}>{t('modal.cancel') || 'Cancelar'}</button>
          <button type="submit" className="btn btn-primary btn-sm"
            style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              borderColor: ACCENT,
              boxShadow: '0 4px 14px rgba(139, 92, 246, 0.35)',
              padding: '8px 20px', borderRadius: '8px', fontWeight: '800', color: '#ffffff'
            }}>
            {initialData ? (t('modal.saveChanges') || 'Salvar Alterações') : (t('modal.addInvestment') || 'Adicionar Investimento')}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
          {t('modal.investmentTitleLabel') || t('modal.titleLabel') || 'Título / Descrição *'}
        </label>
        <input
          ref={titleInputRef}
          type="text"
          required
          autoFocus
          placeholder={t('modal.investmentTitlePlaceholder') || 'Ex: Poupança, Ações, Fundos ETF, Cripto...'}
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
          categoryMeta={INVESTMENT_CATEGORY_META}
          accent={ACCENT}
          translationPrefix="investmentCategories"
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
        label={t('modal.monthlyInvestmentAmount') || t('modal.investmentAmountLabel') || 'Aporte Mensal / Valor (€) *'}
        value={formData.amount}
        accent={ACCENT}
        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
      />

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
        label={t('modal.dayOfMonth') || 'Dia de Aplicação / Vencimento'}
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
        label={t('modal.automatic') || 'Aporte / Débito Automático'}
        icon={Zap}
        accent={ACCENT}
      />

      <ToggleSwitch
        checked={formData.isExternal}
        onChange={(val) => setFormData({ ...formData, isExternal: val })}
        label={t('modal.isExternalDeposit') || 'É depósito externo?'}
        icon={ExternalLink}
        accent={ACCENT}
        hint={t('modal.isExternalDepositHint') || 'Não abate das entradas no cálculo de saldo/comprometimento.'}
      />

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
          setFormData((prev) => ({ ...prev, isObligation: val, obligationPersonId: val ? prev.obligationPersonId : '' }));
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