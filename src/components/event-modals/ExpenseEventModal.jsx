import React, { useState, useEffect, useRef } from 'react';
import {
  ShoppingCart,
  Utensils,
  Home,
  Droplets,
  Flame,
  Wifi,
  Bus,
  HeartPulse,
  GraduationCap,
  Film,
  ShoppingBag,
  Shirt,
  Wrench,
  Hammer,
  ShieldCheck,
  Dog,
  Plane,
  Sparkles,
  Pin,
  Tag,
  Zap,
  Repeat
} from 'lucide-react';
import { format, parseISO, addMonths, getDaysInMonth } from 'date-fns';
import { EventStatus, EventPeriodicity, EventType, ExpenseEventCategory, EventUpdateMode } from '../../../shared/enums/index.js';
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

const ACCENT = '#f43f5e';

const EXPENSE_CATEGORY_META = {
  [ExpenseEventCategory.FOOD]: { icon: Utensils, color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  [ExpenseEventCategory.RENT]: { icon: Home, color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  [ExpenseEventCategory.ELECTRICITY]: { icon: Zap, color: '#eab308', bg: 'rgba(234, 179, 8, 0.15)' },
  [ExpenseEventCategory.WATER]: { icon: Droplets, color: '#06b6d4', bg: 'rgba(6, 182, 212, 0.15)' },
  [ExpenseEventCategory.GAS]: { icon: Flame, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  [ExpenseEventCategory.COMMUNICATIONS]: { icon: Wifi, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  [ExpenseEventCategory.TRANSPORTATION]: { icon: Bus, color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  [ExpenseEventCategory.HEALTH]: { icon: HeartPulse, color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)' },
  [ExpenseEventCategory.EDUCATION]: { icon: GraduationCap, color: '#6366f1', bg: 'rgba(99, 102, 241, 0.15)' },
  [ExpenseEventCategory.ENTERTAINMENT]: { icon: Film, color: '#a855f7', bg: 'rgba(168, 85, 247, 0.15)' },
  [ExpenseEventCategory.SHOPPING]: { icon: ShoppingBag, color: '#f43f5e', bg: 'rgba(244, 63, 94, 0.15)' },
  [ExpenseEventCategory.CLOTHING]: { icon: Shirt, color: '#14b8a6', bg: 'rgba(20, 184, 166, 0.15)' },
  [ExpenseEventCategory.CARMAINTENANCE]: { icon: Wrench, color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)' },
  [ExpenseEventCategory.HOUSE]: { icon: Hammer, color: '#84cc16', bg: 'rgba(132, 204, 22, 0.15)' },
  [ExpenseEventCategory.ENSURANCE]: { icon: ShieldCheck, color: '#0ea5e9', bg: 'rgba(14, 165, 233, 0.15)' },
  [ExpenseEventCategory.PETS]: { icon: Dog, color: '#d97706', bg: 'rgba(217, 119, 6, 0.15)' },
  [ExpenseEventCategory.TRAVEL]: { icon: Plane, color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)' },
  [ExpenseEventCategory.PERSONAL_CARE]: { icon: Sparkles, color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
  [ExpenseEventCategory.SERVICES]: { icon: Pin, color: '#64748b', bg: 'rgba(100, 116, 139, 0.15)' },
  [ExpenseEventCategory.OTHER]: { icon: Tag, color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.15)' }
};

export default function ExpenseEventModal({
  isOpen, onClose, onSave, initialData, defaultDate, timeline, timeboardId
}) {
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
    status: EventStatus.PENDING,
    periodicity: EventPeriodicity.RECURRING,
    recurrenceEndDate: '',
    amount: '',
    labelsInput: '',
    isAutomatic: false,
    category: ExpenseEventCategory.OTHER,
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

      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || EventStatus.PENDING,
        periodicity: initPeriodicity,
        recurrenceEndDate: endRecDate,
        amount: initialData.amount !== undefined ? initialData.amount : '',
        labelsInput: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : '',
        isAutomatic: Boolean(initialData.isAutomatic),
        category: initialData.category || ExpenseEventCategory.OTHER,
        isObligation: Boolean(initialData.isObligation || initialData.is_obligation),
        obligationPersonId: initialData.obligationPersonId || initialData.obligation_person_id || ''
      });
      setUpdateScope(EventUpdateMode.SUBSEQUENT);
      setBreakdownItems(initialData.breakdownItems ? JSON.parse(JSON.stringify(initialData.breakdownItems)) : []);
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
        status: EventStatus.PENDING,
        periodicity: EventPeriodicity.RECURRING,
        recurrenceEndDate: defaultEndMonth,
        amount: '',
        labelsInput: '',
        isAutomatic: false,
        category: ExpenseEventCategory.OTHER,
        isObligation: false,
        obligationPersonId: ''
      });
      setUpdateScope(EventUpdateMode.SINGLE);
      setBreakdownItems([]);
    }
  }, [initialData, defaultDate, isOpen]);

  const totalBreakdownAmount = breakdownItems.reduce(
    (acc, it) => acc + (parseFloat(it.amount) || 0), 0
  );

  const displayedAmount = breakdownItems.length > 0
    ? totalBreakdownAmount
    : (formData.amount !== undefined ? formData.amount : '');

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

    const finalAmount = breakdownItems.length > 0
      ? totalBreakdownAmount
      : (parseFloat(formData.amount) || 0);

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
      status: initialData ? (initialData.status || EventStatus.PENDING) : EventStatus.PENDING,
      periodicity: formData.periodicity,
      isRecurring,
      recurrenceEndDate,
      endDate: recurrenceEndDate,
      amount: finalAmount,
      breakdownItems: breakdownItems.length > 0 ? breakdownItems : undefined,
      eventType: EventType.EXPENSE,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      labels,
      category: formData.category || ExpenseEventCategory.OTHER,
      isAutomatic: formData.isAutomatic,
      isObligation: formData.isObligation,
      obligationPersonId: formData.isObligation ? formData.obligationPersonId : null,
      updateScope: (initialData?.seriesId || initialData?.eventId || initialData?.isRecurring || isRecurring) ? updateScope : undefined
    });
    onClose();
  };

  const subtitle = `${timeline?.name || t('timeline.expenses')} • ${format(parseISO(formData.date), 'MMMM yyyy', { locale: dateLocale })}`;

  return (
    <ModalShell
      isOpen={isOpen} onClose={onClose} onSubmit={handleSubmit} accent={ACCENT}
      icon={ShoppingCart}
      title={initialData ? (t('modal.editExpense') || 'Editar Despesa') : (t('modal.newExpense') || 'Nova Despesa')}
      subtitle={subtitle}
      footer={
        <>
          <button type="button" className="btn btn-secondary btn-sm" onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '8px' }}>{t('modal.cancel') || 'Cancelar'}</button>
          <button type="submit" className="btn btn-primary btn-sm"
            style={{ background: ACCENT, borderColor: ACCENT, padding: '8px 20px', borderRadius: '8px', fontWeight: '800' }}>
            {initialData ? (t('modal.saveChanges') || 'Salvar Alterações') : (t('modal.addExpense') || 'Adicionar Despesa')}
          </button>
        </>
      }
    >
      <div style={{ marginBottom: '14px' }}>
        <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
          {t('modal.expenseTitleLabel') || 'Descrição da Despesa *'}
        </label>
        <input
          ref={titleInputRef}
          type="text"
          required
          autoFocus
          placeholder={t('modal.expenseTitlePlaceholder') || 'Ex: Renda / Aluguel, Supermercado, Eletricidade, Carro...'}
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
          categoryMeta={EXPENSE_CATEGORY_META}
          accent={ACCENT}
          translationPrefix="expenseCategories"
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
        label={t('modal.expenseAmountLabel') || 'Valor da Despesa (€) *'}
        value={displayedAmount}
        accent={ACCENT}
        readOnly={breakdownItems.length > 0}
        background={breakdownItems.length > 0 ? 'rgba(244, 63, 94, 0.08)' : undefined}
        onChange={(e) => {
          if (breakdownItems.length === 0) {
            setFormData({ ...formData, amount: e.target.value });
          }
        }}
        labelExtra={breakdownItems.length > 0 ? (
          <span style={{ fontSize: '0.72rem', color: ACCENT, fontWeight: '800' }}>
            ({breakdownItems.length} {(t('modal.subparts') || 'Subpartes').toLowerCase()})
          </span>
        ) : null}
      />

      <BreakdownItems
        items={breakdownItems}
        onChange={setBreakdownItems}
        accent={ACCENT}
        t={t}
        initialAmount={formData.amount}
      />

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
        label={t('modal.dayOfMonth') || 'Dia de Vencimento'}
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
        label={t('modal.automatic') || 'Débito / Pagamento Automático'}
        icon={Zap}
        accent={ACCENT}
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