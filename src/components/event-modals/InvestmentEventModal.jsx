import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  PiggyBank,
  Landmark,
  Sparkles,
  Calendar,
  Repeat,
  Zap,
  ChevronDown,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Target
} from 'lucide-react';
import { format, parseISO, addMonths, getDaysInMonth, setMonth, setYear } from 'date-fns';
import { EventStatus, EventPeriodicity, EventType } from '../../../shared/enums/index.js';
import { useTranslation } from '../../i18n/LanguageContext.jsx';

export default function InvestmentEventModal({
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
  const [investmentSubtype, setInvestmentSubtype] = useState('investimento_poupanca');

  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 1,
    time: '09:00',
    status: EventStatus.PLANNED,
    periodicity: EventPeriodicity.RECURRING,
    recurrenceEndDate: '',
    amount: '',
    initialInvestedAmount: '',
    targetAmount: '',
    labelsInput: '',
    isAutomatic: false
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
      if (initialData.category === 'investimento_patrimonio') {
        setInvestmentSubtype('investimento_patrimonio');
      } else if (initialData.category === 'investimento_outros' || initialData.category?.includes('etf')) {
        setInvestmentSubtype('investimento_outros');
      } else {
        setInvestmentSubtype('investimento_poupanca');
      }

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
        status: initialData.status || EventStatus.PLANNED,
        periodicity: initPeriodicity,
        recurrenceEndDate: endRecDate,
        amount: initialData.amount !== undefined ? initialData.amount : (initialData.initialInvestedAmount || ''),
        initialInvestedAmount: initialData.initialInvestedAmount !== undefined ? initialData.initialInvestedAmount : '',
        targetAmount: initialData.targetAmount || '',
        labelsInput: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : '',
        isAutomatic: Boolean(initialData.isAutomatic)
      });
      setUpdateScope('subsequent');
    } else {
      let defaultEndMonth = '2026-12';
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
        isAutomatic: false
      });
      setUpdateScope('single');
      setInvestmentSubtype('investimento_poupanca');
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

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const safeDay = Math.min(totalDays, Math.max(1, Number(formData.dayOfMonth) || 1));
    const safeDayStr = safeDay.toString().padStart(2, '0');
    const finalDate = `${baseYearStr}-${baseMonthStr}-${safeDayStr}`;

    const finalAmount = parseFloat(formData.amount) || 0;
    const finalInitialAmount = formData.initialInvestedAmount !== '' ? (parseFloat(formData.initialInvestedAmount) || 0) : undefined;
    const finalTargetAmount = formData.targetAmount !== '' ? (parseFloat(formData.targetAmount) || 0) : undefined;

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
      initialInvestedAmount: finalInitialAmount,
      targetAmount: finalTargetAmount,
      eventType: EventType.INVESTMENT,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      labels,
      category: investmentSubtype,
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
          border: '1px solid rgba(139, 92, 246, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(139, 92, 246, 0.15)',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        {/* Cabeçalho */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.15)', color: '#8b5cf6', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <PiggyBank size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? (t('modal.editInvestment') || 'Editar Investimento') : (t('modal.newInvestment') || 'Novo Investimento / Poupança')}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#8b5cf6', fontWeight: '700' }}>
                {timeline?.name || 'Investimentos'} • {format(parseISO(`${baseYearStr}-${baseMonthStr}-01`), 'MMMM yyyy', { locale: dateLocale })}
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
          {/* Subtipo do Investimento */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              {t('modal.investmentSubtype') || 'Tipo de Aplicação / Investimento'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: 'investimento_poupanca', label: t('investment.typeSavings') || 'Poupança / Refúgio', icon: <PiggyBank size={14} /> },
                { id: 'investimento_patrimonio', label: t('investment.typeAssets') || 'Patrimônio / Imóvel', icon: <Landmark size={14} /> },
                { id: 'investimento_outros', label: t('investment.typeOthers') || 'Outros / ETFs', icon: <Sparkles size={14} /> }
              ].map((sub) => {
                const isSelected = investmentSubtype === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => setInvestmentSubtype(sub.id)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '4px',
                      padding: '10px 6px',
                      borderRadius: '8px',
                      border: isSelected ? '2px solid #8b5cf6' : '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                      color: isSelected ? '#a855f7' : 'var(--text-muted)',
                      fontSize: '0.76rem',
                      fontWeight: isSelected ? '800' : '600',
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {sub.icon}
                    <span>{sub.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 1. Título do Investimento (Foco e seleção automática ao abrir) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              {t('modal.titleLabel') || 'Nome / Título do Investimento *'}
            </label>
            <input
              ref={titleInputRef}
              type="text"
              required
              autoFocus
              placeholder={t('modal.investmentTitlePlaceholder') || 'Ex: Fundo de Emergência, ETF S&P500, Entrada de Casa...'}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* 2. Valor Mensal (€) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              {t('modal.monthlyInvestmentAmount') || 'Aporte Mensal / Valor (€)'}
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="form-input"
                style={{
                  width: '100%',
                  padding: '10px 12px 10px 32px',
                  borderRadius: '8px',
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: '#a855f7',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#a855f7', fontWeight: '800' }}>
                €
              </span>
            </div>
          </div>

          {/* Valor Inicial e Meta (Opcionais) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-muted)' }}>
                {t('modal.initialInvestedAmount') || 'Aporte Inicial (€)'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.initialInvestedAmount}
                  onChange={(e) => setFormData({ ...formData, initialInvestedAmount: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '8px 10px 8px 26px', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  €
                </span>
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.74rem', fontWeight: '700', marginBottom: '4px', color: 'var(--text-muted)' }}>
                {t('modal.targetAmount') || 'Meta Final (€)'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={formData.targetAmount}
                  onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  className="form-input"
                  style={{ width: '100%', padding: '8px 10px 8px 26px', borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box' }}
                />
                <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  €
                </span>
              </div>
            </div>
          </div>

          {/* 4. Periodicidade: Recorrente, Pontual, Período */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              {t('modal.periodicity') || 'Periodicidade'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: EventPeriodicity.RECURRING, label: t('modal.recurrent') || 'Recorrente', icon: <Repeat size={14} /> },
                { id: EventPeriodicity.ONCE, label: t('modal.unique') || 'Única', icon: <Zap size={14} /> },
                { id: EventPeriodicity.PERIOD, label: t('modal.period') || 'Período', icon: <Calendar size={14} /> }
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
                      border: isSelected ? '2px solid #8b5cf6' : '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(139, 92, 246, 0.18)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                      color: isSelected ? '#a855f7' : 'var(--text-muted)',
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
                  background: 'rgba(139, 92, 246, 0.08)',
                  border: '1px solid rgba(139, 92, 246, 0.28)',
                  borderRadius: '10px'
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#a855f7', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px' }}>
                  <Calendar size={13} />
                  <span>{t('modal.endMonth') || 'Mês Final'}</span>
                </label>

                {/* Botão Bonito que abre o Seletor de Mês */}
                <div
                  onClick={() => setIsEndMonthPickerOpen(!isEndMonthPickerOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-card, #131722)',
                    border: isEndMonthPickerOpen ? '2px solid #8b5cf6' : '1px solid rgba(139, 92, 246, 0.35)',
                    borderRadius: '8px',
                    padding: '9px 12px',
                    cursor: 'pointer'
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {formData.recurrenceEndDate
                      ? format(parseISO(`${formData.recurrenceEndDate}-01`), 'MMMM yyyy', { locale: dateLocale })
                      : (t('modal.endMonth') || 'Mês Final')}
                  </span>
                  <ChevronDown
                    size={15}
                    style={{
                      color: '#a855f7',
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
                      border: '1px solid rgba(139, 92, 246, 0.3)',
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
                      <span style={{ fontWeight: '800', fontSize: '0.9rem', color: '#a855f7' }}>
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
                              border: isSelectedMonth ? '2px solid #8b5cf6' : '1px solid var(--border-glass)',
                              background: isSelectedMonth
                                ? 'rgba(139, 92, 246, 0.25)'
                                : isPastThanStart
                                ? 'rgba(255,255,255,0.01)'
                                : 'var(--bg-glass, rgba(255,255,255,0.03))',
                              color: isSelectedMonth
                                ? '#a855f7'
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
                  }) || `Projeção mensal de ${format(parseISO(`${baseYearStr}-${baseMonthStr}-01`), 'MMMM yyyy', { locale: dateLocale })} até ao mês selecionado.`}
                </div>
              </div>
            )}
          </div>

          {/* 5. Dia do Mês */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              {t('modal.dayOfMonth') || 'Dia de Depósito'}
            </label>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--bg-glass, rgba(255,255,255,0.03))',
                border: isDayPickerOpen ? '2px solid #8b5cf6' : '1px solid var(--border-glass)',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                boxSizing: 'border-box'
              }}
              onClick={() => setIsDayPickerOpen(!isDayPickerOpen)}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Calendar size={16} style={{ color: '#8b5cf6' }} />
                <span style={{ fontSize: '0.92rem', fontWeight: '700', color: 'var(--text-main)' }}>
                  {t('sidebar.day') || 'Dia'} {formData.dayOfMonth}
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
                  {t('modal.selectDueDay') || 'Selecionar Dia'}
                </span>
                <span style={{ fontSize: '0.74rem', color: '#a855f7', fontWeight: '800' }}>
                  {format(parseISO(`${baseYearStr}-${baseMonthStr}-01`), 'MMMM yyyy', { locale: dateLocale })} ({totalDays} {(t('sidebar.day') || 'dia').toLowerCase()}s)
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
                        border: isSelected ? '2px solid #8b5cf6' : '1px solid var(--border-glass)',
                        background: isSelected ? 'rgba(139, 92, 246, 0.22)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                        color: isSelected ? '#a855f7' : 'var(--text-main)',
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
              {t('modal.status') || 'Estado'}
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: EventStatus.PLANNED })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: formData.status === EventStatus.PLANNED ? '2px solid #eab308' : '1px solid var(--border-glass)',
                  background: formData.status === EventStatus.PLANNED ? 'rgba(234, 179, 8, 0.14)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                  color: formData.status === EventStatus.PLANNED ? '#facc15' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: formData.status === EventStatus.PLANNED ? '800' : '600',
                  fontSize: '0.82rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <Clock size={15} />
                <span>{t('modal.statusPlanned') || 'Planeado'}</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: EventStatus.INVESTED })}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: formData.status === EventStatus.INVESTED ? '2px solid #8b5cf6' : '1px solid var(--border-glass)',
                  background: formData.status === EventStatus.INVESTED ? 'rgba(139, 92, 246, 0.16)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                  color: formData.status === EventStatus.INVESTED ? '#a855f7' : 'var(--text-muted)',
                  cursor: 'pointer',
                  fontWeight: formData.status === EventStatus.INVESTED ? '800' : '600',
                  fontSize: '0.82rem',
                  transition: 'all 0.15s ease'
                }}
              >
                <CheckCircle2 size={15} />
                <span>{t('modal.statusInvested') || 'Investido'}</span>
              </button>
            </div>
          </div>

          {/* 7. Switch Automático Moderno */}
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
              <Zap size={16} style={{ color: formData.isAutomatic ? '#a855f7' : 'var(--text-dim)' }} />
              <span style={{ fontSize: '0.84rem', fontWeight: '700', color: 'var(--text-main)' }}>
                {t('modal.automatic') || 'Transferência Automática'}
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
                background: formData.isAutomatic ? '#8b5cf6' : 'rgba(148, 163, 184, 0.25)',
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

          {/* Switch Mudar Subsequentes */}
          {initialData && (initialData.seriesId || initialData.isRecurring || formData.periodicity === EventPeriodicity.RECURRING || formData.periodicity === EventPeriodicity.PERIOD) && (
            <div style={{ margin: '8px 0 14px 0' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: updateScope === 'subsequent' ? '#a855f7' : 'var(--text-dim)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: updateScope === 'subsequent' ? 'rgba(139, 92, 246, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                  border: updateScope === 'subsequent' ? '1px solid rgba(139, 92, 246, 0.35)' : '1px solid var(--border-glass)',
                  borderRadius: '9999px',
                  padding: '5px 12px'
                }}
              >
                <input
                  type="checkbox"
                  checked={updateScope === 'subsequent'}
                  onChange={(e) => setUpdateScope(e.target.checked ? 'subsequent' : 'single')}
                  style={{ accentColor: '#8b5cf6' }}
                />
                <span>{t('modal.changeSubsequent') || 'Aplicar alterações aos meses futuros'}</span>
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
              {t('modal.cancel') || 'Cancelar'}
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                background: '#8b5cf6',
                borderColor: '#8b5cf6',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: '800'
              }}
            >
              {initialData ? (t('modal.saveChanges') || 'Salvar Alterações') : (t('modal.addInvestment') || 'Adicionar Investimento')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
