import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  DollarSign,
  Calendar,
  Repeat,
  Zap,
  ChevronDown,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, addMonths, getDaysInMonth, setMonth, setYear } from 'date-fns';
import { EventStatus, EventPeriodicity, EventType, IncomeEventCategory } from '../../../shared/enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function IncomeEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline
}) {
  const { t, dateLocale } = useTranslation();
  const titleInputRef = useRef(null);

  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [isEndMonthPickerOpen, setIsEndMonthPickerOpen] = useState(false);
  const [endMonthPickerYear, setEndMonthPickerYear] = useState(2026);
  const [updateScope, setUpdateScope] = useState('single');
  const [breakdownItems, setBreakdownItems] = useState([]);

  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 1,
    time: '09:00',
    status: EventStatus.PENDING,
    periodicity: EventPeriodicity.RECURRING,
    recurrenceEndDate: '',
    amount: '',
    labelsInput: '',
    isAutomatic: false,
    category: IncomeEventCategory.NONE
  });

  // 1. Foco e seleção automática do título ao abrir
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

  // Handle Escape key to close modal or open popovers
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDayPickerOpen) setIsDayPickerOpen(false);
        else if (isEndMonthPickerOpen) setIsEndMonthPickerOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDayPickerOpen, isEndMonthPickerOpen, onClose]);

  // Inicialização de dados
  useEffect(() => {
    if (!isOpen) return;

    const todayStr = '2026-08-21';
    const targetDate = initialData?.date || defaultDate || todayStr;

    let parsedDay = 1;
    let initialYear = 2026;
    try {
      const d = parseISO(targetDate);
      if (!isNaN(d.getDate())) parsedDay = d.getDate();
      if (!isNaN(d.getFullYear())) initialYear = d.getFullYear();
    } catch {
      parsedDay = 1;
      initialYear = 2026;
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
        category: initialData.category || IncomeEventCategory.NONE
      });
      setUpdateScope('subsequent');
      setBreakdownItems(initialData.breakdownItems ? JSON.parse(JSON.stringify(initialData.breakdownItems)) : []);
    } else {
      let defaultEndMonth = '2026-12';
      try {
        const d6 = addMonths(parseISO(targetDate), 6);
        defaultEndMonth = format(d6, 'yyyy-MM');
        setEndMonthPickerYear(d6.getFullYear());
      } catch {
        setEndMonthPickerYear(initialYear);
      }

      // Inicia estritamente com RECURRING
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
        category: IncomeEventCategory.NONE
      });
      setUpdateScope('single');
      setBreakdownItems([]);
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  // Informações de data base do botão que abriu o modal
  let baseYearStr = '2026';
  let baseMonthStr = '08';
  let totalDays = 31;
  try {
    const pDate = parseISO(formData.date);
    baseYearStr = format(pDate, 'yyyy');
    baseMonthStr = format(pDate, 'MM');
    totalDays = getDaysInMonth(pDate) || 31;
  } catch (e) { }

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Subpartes: valor total derivado
  const totalBreakdownAmount = breakdownItems.reduce(
    (acc, it) => acc + (Number(it.amount) || 0),
    0
  );

  const displayedAmount = breakdownItems.length > 0
    ? totalBreakdownAmount
    : (formData.amount !== undefined ? formData.amount : '');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

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

    const eventPayload = {
      ...(initialData || {}),
      title: formData.title.trim(),
      date: finalDate,
      time: formData.time,
      status: formData.status,
      periodicity: formData.periodicity,
      isRecurring,
      recurrenceEndDate,
      endDate: recurrenceEndDate,
      amount: finalAmount,
      breakdownItems: breakdownItems.length > 0 ? breakdownItems : undefined,
      eventType: EventType.INCOME,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      labels,
      category: formData.category || IncomeEventCategory.NONE,
      isAutomatic: formData.isAutomatic,
      updateScope: initialData?.seriesId ? updateScope : undefined
    };

    onSave(eventPayload);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
        boxSizing: 'border-box'
      }}
    >
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: '1px solid rgba(16, 185, 129, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(16, 185, 129, 0.15)',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <DollarSign size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? t('modal.editIncome') : t('modal.newIncome')}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#10b981', fontWeight: '700' }}>
                {timeline?.name || 'Entradas'} • {format(parseISO(`${baseYearStr}-${baseMonthStr}-01`), 'MMMM yyyy', { locale: dateLocale })}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="action-icon-btn"
            onClick={onClose}
            aria-label="Fechar"
            style={{ background: 'transparent', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* 1. Título do Rendimento (Foco e seleção automática ao abrir) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              {t('modal.titleLabel')}
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              autoFocus
              placeholder={t('modal.titlePlaceholder')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Categoria do Rendimento */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              {t('sidebar.categoryType') || 'Categoria'}
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="form-input"
              style={{
                width: '100%',
                padding: '10px 12px',
                borderRadius: '8px',
                boxSizing: 'border-box',
                background: 'var(--bg-glass, rgba(255,255,255,0.03))',
                color: 'var(--text-main)',
                border: '1px solid var(--border-glass)',
                cursor: 'pointer'
              }}
            >
              {Object.entries(IncomeEventCategory).map(([key, val]) => (
                <option key={key} value={val} style={{ background: 'var(--bg-card, #131722)', color: 'var(--text-main)' }}>
                  {val === IncomeEventCategory.NONE ? (t('category.none') || 'Nenhuma') : val}
                </option>
              ))}
            </select>
          </div>

          {/* 2. Valor (€) e Quebra em Subpartes */}
          <div style={{ marginBottom: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '5px' }}>
              <label style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {t('modal.amountLabel')}
              </label>
              {breakdownItems.length > 0 && (
                <span style={{ fontSize: '0.72rem', color: '#10b981', fontWeight: '800' }}>
                  ({breakdownItems.length} {t('modal.subparts').toLowerCase()})
                </span>
              )}
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                readOnly={breakdownItems.length > 0}
                value={displayedAmount}
                onChange={(e) => {
                  if (breakdownItems.length === 0) {
                    setFormData({ ...formData, amount: e.target.value });
                  }
                }}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 32px',
                  borderRadius: '8px',
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: '#10b981',
                  background: breakdownItems.length > 0 ? 'rgba(16, 185, 129, 0.08)' : undefined,
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: '800' }}>
                €
              </span>
            </div>
          </div>

          {/* 3. Desmembramento em Subpartes */}
          <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--bg-glass, rgba(255,255,255,0.03))', border: '1px solid var(--border-glass)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: breakdownItems.length > 0 ? '10px' : '0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {t('modal.subparts')} {breakdownItems.length > 0 && `(${breakdownItems.length})`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (breakdownItems.length === 0) {
                    const curVal = parseFloat(formData.amount) || 0;
                    setBreakdownItems([
                      { id: crypto.randomUUID(), name: 'Parte 1', amount: curVal || 0 }
                    ]);
                  } else {
                    setBreakdownItems([
                      ...breakdownItems,
                      { id: crypto.randomUUID(), name: `Parte ${breakdownItems.length + 1}`, amount: 0 }
                    ]);
                  }
                }}
                style={{
                  background: 'rgba(16, 185, 129, 0.15)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  borderRadius: '6px',
                  color: '#10b981',
                  padding: '4px 10px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} /> {breakdownItems.length === 0 ? t('modal.splitIntoSubparts') : t('modal.addSubpart')}
              </button>
            </div>

            {breakdownItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px' }}>
                {breakdownItems.map((item, idx) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 28px', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      placeholder={t('modal.partNamePlaceholder', { index: idx + 1 })}
                      value={item.name}
                      onChange={(e) => {
                        const val = e.target.value;
                        setBreakdownItems((prev) => prev.map((it, i) => (i === idx ? { ...it, name: val } : it)));
                      }}
                    />
                    <div style={{ position: 'relative' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.85rem', fontWeight: '700', paddingLeft: '22px' }}
                        value={item.amount}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setBreakdownItems((prev) => prev.map((it, i) => (i === idx ? { ...it, amount: val } : it)));
                        }}
                      />
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: '#10b981', fontWeight: '800' }}>
                        €
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBreakdownItems((prev) => prev.filter((_, i) => i !== idx))}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#f43f5e',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '4px'
                      }}
                      title={t('modal.removeSubpart')}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 4. Periodicidade: Recorrente, Pontual, Período (Seleção Estritamente Exclusiva) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              {t('modal.periodicity')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: EventPeriodicity.RECURRING, label: t('modal.recurrent'), icon: <Repeat size={14} /> },
                { id: EventPeriodicity.ONCE, label: t('modal.unique'), icon: <Zap size={14} /> },
                { id: EventPeriodicity.PERIOD, label: t('modal.period'), icon: <Calendar size={14} /> }
              ].map((p) => {
                const isSelected = formData.periodicity === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      if (p.id === EventPeriodicity.PERIOD && !formData.recurrenceEndDate) {
                        const fallbackEnd = format(addMonths(parseISO(formData.date || '2026-08-21'), 6), 'yyyy-MM');
                        setFormData({ ...formData, periodicity: p.id, recurrenceEndDate: fallbackEnd });
                      } else {
                        setFormData({ ...formData, periodicity: p.id });
                      }
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #10b981' : '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                      color: isSelected ? '#10b981' : 'var(--text-muted)',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? '800' : '600',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Se for Período: Seletor de Mês Final Elegante */}
            {formData.periodicity === EventPeriodicity.PERIOD && (
              <div
                style={{
                  marginTop: '10px',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.28)',
                  borderRadius: '10px'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px' }}>
                  <Calendar size={13} />
                  <span>{t('modal.endMonth')}</span>
                </label>

                {/* Botão Bonito que abre o Seletor de Mês */}
                <div
                  onClick={() => setIsEndMonthPickerOpen(!isEndMonthPickerOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-card, #131722)',
                    border: isEndMonthPickerOpen ? '2px solid #10b981' : '1px solid rgba(16, 185, 129, 0.35)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {formData.recurrenceEndDate
                      ? format(parseISO(`${formData.recurrenceEndDate}-01`), 'MMMM yyyy', { locale: dateLocale })
                      : t('modal.endMonth')}
                  </span>
                  <ChevronDown
                    size={15}
                    style={{
                      color: '#10b981',
                      transform: isEndMonthPickerOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  />
                </div>

                {/* Popover Grade de 12 Meses com Navegação de Ano */}
                {isEndMonthPickerOpen && (
                  <div
                    style={{
                      marginTop: '8px',
                      background: 'var(--bg-card, #131722)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: '10px',
                      padding: '12px',
                      boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                    }}
                  >
                    {/* Barra de navegação por ano */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <button
                        type="button"
                        onClick={() => setEndMonthPickerYear(prev => prev - 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#10b981' }}>
                        {endMonthPickerYear}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEndMonthPickerYear(prev => prev + 1)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Grade de 12 meses */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '6px' }}>
                      {Array.from({ length: 12 }, (_, mIdx) => {
                        const mStr = String(mIdx + 1).padStart(2, '0');
                        const curMonthKey = `${endMonthPickerYear}-${mStr}`;
                        const isSelectedMonth = formData.recurrenceEndDate === curMonthKey;
                        const isPastThanStart = curMonthKey < `${baseYearStr}-${baseMonthStr}`;

                        // Nome curto do mês
                        const sampleDate = setMonth(setYear(new Date(), endMonthPickerYear), mIdx);
                        const monthLabel = format(sampleDate, 'MMM', { locale: dateLocale });

                        return (
                          <button
                            key={curMonthKey}
                            type="button"
                            disabled={isPastThanStart}
                            onClick={() => {
                              setFormData({ ...formData, recurrenceEndDate: curMonthKey });
                              setIsEndMonthPickerOpen(false);
                            }}
                            style={{
                              padding: '8px 4px',
                              borderRadius: '6px',
                              border: isSelectedMonth ? '2px solid #10b981' : '1px solid var(--border-glass)',
                              background: isSelectedMonth
                                ? 'rgba(16, 185, 129, 0.25)'
                                : isPastThanStart
                                ? 'rgba(255,255,255,0.01)'
                                : 'var(--bg-glass, rgba(255,255,255,0.03))',
                              color: isSelectedMonth
                                ? '#10b981'
                                : isPastThanStart
                                ? 'var(--text-dim)'
                                : 'var(--text-main)',
                              fontWeight: isSelectedMonth ? '800' : '600',
                              fontSize: '0.78rem',
                              textTransform: 'capitalize',
                              cursor: isPastThanStart ? 'not-allowed' : 'pointer',
                              opacity: isPastThanStart ? 0.35 : 1
                            }}
                          >
                            {monthLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '8px', lineHeight: 1.3 }}>
                  {t('modal.periodExplanation', {
                    start: format(parseISO(`${baseYearStr}-${baseMonthStr}-01`), 'MMMM yyyy', { locale: dateLocale }),
                    end: formData.recurrenceEndDate
                      ? format(parseISO(`${formData.recurrenceEndDate}-01`), 'MMMM yyyy', { locale: dateLocale })
                      : '...'
                  })}
                </div>
              </div>
            )}
          </div>

          {/* 5. Dia do Mês (Sem o campo de Start Month, usando o mês de lançamento) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              {t('modal.dayOfMonth')}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-glass, rgba(255,255,255,0.03))',
                border: isDayPickerOpen ? '2px solid #10b981' : '1px solid var(--border-glass)',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              onClick={() => setIsDayPickerOpen(!isDayPickerOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: '#10b981' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {t('sidebar.day')} {formData.dayOfMonth}
                </span>
              </div>
              <ChevronDown
                size={15}
                style={{
                  color: 'var(--text-muted)',
                  transform: isDayPickerOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s'
                }}
              />
            </div>
          </div>

          {/* Grid Popover de Seleção Rápida de Dias (1..31) */}
          {isDayPickerOpen && (
            <div style={{ background: 'var(--bg-card, #131722)', border: '1px solid var(--border-glass)', borderRadius: '10px', padding: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  {t('modal.selectDueDay')}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#10b981', fontWeight: '800' }}>
                  {format(parseISO(`${baseYearStr}-${baseMonthStr}-01`), 'MMMM yyyy', { locale: dateLocale })} ({totalDays} {t('sidebar.day').toLowerCase()}s)
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '6px' }}>
                {daysArray.map((d) => {
                  const isSelected = Number(formData.dayOfMonth) === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => {
                        setFormData({ ...formData, dayOfMonth: d });
                        setIsDayPickerOpen(false);
                      }}
                      style={{
                        padding: '7px 0',
                        fontSize: '0.82rem',
                        fontWeight: isSelected ? '800' : '600',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #10b981' : '1px solid var(--border-glass)',
                        background: isSelected ? 'rgba(16, 185, 129, 0.22)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                        color: isSelected ? '#10b981' : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Status Elegante em Cards / Pills */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              {t('modal.status')}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: EventStatus.PENDING })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: formData.status === EventStatus.PENDING ? '2px solid #eab308' : '1px solid var(--border-glass)',
                  background: formData.status === EventStatus.PENDING ? 'rgba(234, 179, 8, 0.14)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                  color: formData.status === EventStatus.PENDING ? '#facc15' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: formData.status === EventStatus.PENDING ? '800' : '600',
                  fontSize: '0.82rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={15} />
                <span>{t('modal.statusPending')}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: EventStatus.RECEIVED })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: formData.status === EventStatus.RECEIVED ? '2px solid #10b981' : '1px solid var(--border-glass)',
                  background: formData.status === EventStatus.RECEIVED ? 'rgba(16, 185, 129, 0.16)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                  color: formData.status === EventStatus.RECEIVED ? '#10b981' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: formData.status === EventStatus.RECEIVED ? '800' : '600',
                  fontSize: '0.82rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle2 size={15} />
                <span>{t('modal.statusReceived')}</span>
              </button>
            </div>
          </div>

          {/* 7. Switch Automático Moderno (iOS Toggle Style) */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--bg-glass, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-glass)',
              marginBottom: '16px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} style={{ color: formData.isAutomatic ? '#10b981' : 'var(--text-dim)' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {t('modal.automatic')}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={formData.isAutomatic}
              onClick={() => setFormData({ ...formData, isAutomatic: !formData.isAutomatic })}
              style={{
                width: '44px',
                height: '24px',
                borderRadius: '9999px',
                background: formData.isAutomatic ? '#10b981' : 'rgba(148, 163, 184, 0.25)',
                border: 'none',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s ease',
                padding: 0
              }}
            >
              <span
                style={{
                  display: 'block',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: '#ffffff',
                  position: 'absolute',
                  top: '3px',
                  left: formData.isAutomatic ? '22px' : '4px',
                  transition: 'left 0.2s ease',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.3)'
                }}
              />
            </button>
          </div>

          {/* Switch Mudar Subsequentes (Apenas ao Editar Evento Recorrente) */}
          {initialData && (initialData.seriesId || initialData.isRecurring || formData.periodicity === EventPeriodicity.RECURRING || formData.periodicity === EventPeriodicity.PERIOD) && (
            <div style={{ margin: '8px 0 14px 0' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: updateScope === 'subsequent' ? '#10b981' : 'var(--text-dim)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: updateScope === 'subsequent' ? 'rgba(16, 185, 129, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                  border: updateScope === 'subsequent' ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-glass)',
                  borderRadius: '9999px',
                  padding: '5px 12px'
                }}
              >
                <input
                  type="checkbox"
                  checked={updateScope === 'subsequent'}
                  onChange={(e) => setUpdateScope(e.target.checked ? 'subsequent' : 'single')}
                  style={{ accentColor: '#10b981' }}
                />
                <span>{t('modal.changeSubsequent')}</span>
              </label>
            </div>
          )}

          {/* Botões do Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px' }}
            >
              {t('modal.cancel')}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                background: '#10b981',
                borderColor: '#10b981',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: '800'
              }}
            >
              {initialData ? t('modal.saveChanges') : t('modal.addIncome')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
