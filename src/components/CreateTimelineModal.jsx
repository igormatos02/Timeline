import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  CreditCard,
  Scale,
  TrendingUp,
  ShoppingCart,
  PiggyBank,
  FolderKanban,
  Bell,
  BookOpen,
  CheckSquare,
  Layers,
  Target,
  Calendar,
  ShieldCheck,
  ShieldAlert,
  ChevronDown,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, setMonth, setYear } from 'date-fns';
import { generateLoanInstallments } from '../utils/loanCalculations';
import { formatCurrency } from '../utils/formatCurrency';
import {
  TimelineType,
  TimelineStatus,
  EventPeriodicity,
  TimelineColor,
  TIMELINE_COLOR_PRESETS,
  isLoanTimelineType,
  isSingleInstanceTimelineType,
  normalizeTimelineType,
  LoanAmortizationSystem
} from '../enums/index.js';
import { getTimelineTypeOptions } from '../utils/timelineConfig.jsx';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const TIMELINE_TYPE_OPTIONS = getTimelineTypeOptions();

export default function CreateTimelineModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialType,
  existingTimelines = []
}) {
  const { t, dateLocale } = useTranslation();
  const getTodayStr = () => new Date().toISOString().substring(0, 10);
  const getTodayMonthStr = () => new Date().toISOString().substring(0, 7);

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [isDueDayPickerOpen, setIsDueDayPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationEvents, setSimulationEvents] = useState([]);

  // Compute set of existing timeline types in this timeboard
  const existingTypesSet = new Set(
    (existingTimelines || []).map((tl) => normalizeTimelineType(tl.type))
  );

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: getTodayMonthStr(),
    totalInstallments: '',
    status: TimelineStatus.ACTIVE,
    type: TimelineType.LOAN,
    color: TimelineColor.LOAN,
    totalDebt: '',
    installmentAmount: '',
    periodicity: EventPeriodicity.MONTHLY,
    dueDay: '10',
    contractNumber: '',
    bankName: '',
    tanRate: '',
    spread: '',
    interestStampTaxRate: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    setIsMonthPickerOpen(false);
    setIsDueDayPickerOpen(false);
    setShowSimulation(false);

    if (initialData) {
      const initDate = initialData.startDate || getTodayStr();
      try {
        const y = parseInt(initDate.substring(0, 4), 10);
        if (!isNaN(y)) setPickerYear(y);
      } catch { }

      const getVal = (...keys) => {
        for (const k of keys) {
          const val = initialData[k];
          if (val !== undefined && val !== null && val !== '') {
            return val;
          }
        }
        return '';
      };

      const resolvedType = normalizeTimelineType(initialData.type || TimelineType.LOAN);

      setFormData({
        ...initialData,
        name: initialData.name || '',
        description: initialData.description || '',
        startDate: initDate.substring(0, 7) || getTodayMonthStr(),
        totalInstallments: getVal('totalInstallments', 'total_installments'),
        status: initialData.status === TimelineStatus.INACTIVE ? TimelineStatus.INACTIVE : TimelineStatus.ACTIVE,
        type: resolvedType,
        color: initialData.color || TimelineColor.LOAN,
        totalDebt: getVal('totalDebt', 'originalCapital', 'original_capital'),
        installmentAmount: getVal('installmentAmount', 'installment_amount'),
        periodicity: initialData.periodicity || initialData.aggregation || EventPeriodicity.MONTHLY,
        dueDay: getVal('dueDay', 'due_day') || '10',
        contractNumber: getVal('contractNumber', 'contract_number'),
        bankName: getVal('bankName', 'bank_name'),
        tanRate: getVal('tanRate', 'tan_rate'),
        spread: getVal('spread'),
        interestStampTaxRate: getVal('interestStampTaxRate', 'installmentStampTax', 'installment_stamp_tax', 'taxaImpostoSeloJuros', 'installmentFee', 'installment_fee')
      });
    } else {
      const currentYear = new Date().getFullYear();
      setPickerYear(currentYear);

      // Determine initial type (passed from caller or first available type)
      let resolvedType = initialType ? normalizeTimelineType(initialType) : null;
      if (resolvedType && isSingleInstanceTimelineType(resolvedType) && existingTypesSet.has(resolvedType)) {
        resolvedType = null;
      }
      if (!resolvedType) {
        const firstAvailable = TIMELINE_TYPE_OPTIONS.find((opt) => !opt.singleInstance || !existingTypesSet.has(opt.type));
        resolvedType = firstAvailable ? firstAvailable.type : TimelineType.LOAN;
      }

      const typeMeta = TIMELINE_TYPE_OPTIONS.find((opt) => opt.type === resolvedType) || TIMELINE_TYPE_OPTIONS[0];

      setFormData({
        name: typeMeta.type === TimelineType.LOAN ? '' : (t(typeMeta.labelKey) || ''),
        description: '',
        startDate: getTodayMonthStr(),
        totalInstallments: '',
        status: TimelineStatus.ACTIVE,
        type: resolvedType,
        color: typeMeta.defaultColor,
        totalDebt: '',
        installmentAmount: '',
        periodicity: EventPeriodicity.MONTHLY,
        dueDay: '10',
        contractNumber: '',
        bankName: '',
        tanRate: '',
        spread: '',
        interestStampTaxRate: ''
      });
    }
  }, [initialData, initialType, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDueDayPickerOpen) setIsDueDayPickerOpen(false);
        else if (isMonthPickerOpen) setIsMonthPickerOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMonthPickerOpen, isDueDayPickerOpen, onClose]);

  if (!isOpen) return null;

  const isEditing = Boolean(initialData && initialData.id);
  const isTypeLocked = Boolean(initialType || isEditing);
  const isLoanType = isLoanTimelineType(formData.type);
  const isStatusActive = formData.status === TimelineStatus.ACTIVE;
  const isStatusInactive = formData.status === TimelineStatus.INACTIVE;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const isInactive = formData.status === TimelineStatus.INACTIVE;
    const dueDayNum = parseInt(formData.dueDay, 10) || 1;
    const dueDayStr = dueDayNum.toString().padStart(2, '0');
    const fullStartDate = formData.startDate ? `${formData.startDate}-${dueDayStr}` : getTodayStr();

    const parsedTotalDebt = parseFloat(formData.totalDebt) || 0;
    const parsedTotalInstallments = parseInt(formData.totalInstallments, 10) || 0;

    let finalData = {
      ...formData,
      name: formData.name.trim(),
      description: formData.description.trim(),
      type: formData.type,
      color: formData.color,
      status: isInactive ? TimelineStatus.INACTIVE : TimelineStatus.ACTIVE
    };

    if (isLoanType) {
      finalData = {
        ...finalData,
        startDate: fullStartDate,
        totalDebt: parsedTotalDebt,
        totalAmountFinanced: parsedTotalDebt,
        totalInstallments: parsedTotalInstallments,
        numberOfInstallments: parsedTotalInstallments,
        dueDay: dueDayNum,
        tanRate: parseFloat(formData.tanRate) || 0,
        spread: parseFloat(formData.spread) || 0,
        interestStampTaxRate: parseFloat(formData.interestStampTaxRate) || 0,
        taxaImpostoSeloJuros: parseFloat(formData.interestStampTaxRate) || 0,
        periodicity: formData.periodicity || EventPeriodicity.MONTHLY
      };

      // Automatically generate loan installments schedule via PMT formula
      if (!initialData) {
        const generatedEvents = generateLoanInstallments({
          totalAmountFinanced: finalData.totalDebt,
          totalDebt: finalData.totalDebt,
          numberOfInstallments: finalData.totalInstallments,
          totalInstallments: finalData.totalInstallments,
          tanRate: finalData.tanRate,
          spread: finalData.spread,
          interestStampTaxRate: finalData.interestStampTaxRate,
          taxaImpostoSeloJuros: finalData.interestStampTaxRate,
          startDate: fullStartDate,
          debtStartDate: fullStartDate,
          dueDay: dueDayNum,
          periodicity: EventPeriodicity.MONTHLY
        });
        finalData.events = generatedEvents;
        if (generatedEvents.length > 0) {
          finalData.installmentAmount = generatedEvents[0].installmentAmount ?? ((generatedEvents[0].installmentCapital ?? generatedEvents[0].principalAmount ?? 0) + (generatedEvents[0].installmentInterest ?? generatedEvents[0].interestPortion ?? 0) + (generatedEvents[0].installmentFee ?? 0));
        }
      }
    }

    onSave(finalData);
    onClose();
  };

  const colors = TIMELINE_COLOR_PRESETS;

  const monthNames = Array.from({ length: 12 }, (_, i) => {
    const d = setMonth(new Date(2026, 0, 1), i);
    return format(d, 'MMM', { locale: dateLocale });
  });

  const handleRunSimulation = (targetSystem = simulationSystem) => {
    try {
      const parsedTotalDebt = parseFloat(formData.totalDebt) || 0;
      const parsedTotalInstallments = parseInt(formData.totalInstallments, 10) || 0;
      const dueDayNum = parseInt(formData.dueDay, 10) || 1;
      const dueDayStr = dueDayNum.toString().padStart(2, '0');
      const fullStartDate = formData.startDate ? `${formData.startDate}-${dueDayStr}` : getTodayStr();

      const parsedFees = parseFloat(formData.interestStampTaxRate || formData.taxaImpostoSeloJuros || formData.installmentStampTax) || 0;
      const events = generateLoanInstallments({
        totalAmountFinanced: parsedTotalDebt,
        totalDebt: parsedTotalDebt,
        numberOfInstallments: parsedTotalInstallments || 12,
        totalInstallments: parsedTotalInstallments || 12,
        tanRate: parseFloat(formData.tanRate) || 0,
        spread: parseFloat(formData.spread) || 0,
        interestStampTaxRate: parsedFees,
        taxaImpostoSeloJuros: parsedFees,
        startDate: fullStartDate,
        debtStartDate: fullStartDate,
        dueDay: dueDayNum,
        periodicity: EventPeriodicity.MONTHLY,
        amortizationSystem: targetSystem
      });

      setSimulationSystem(targetSystem);
      setSimulationEvents(events);
      setShowSimulation(true);
    } catch (err) {
      alert(err.message || t('createTimelineModal.simulationError'));
    }
  };

  const currentTypeMeta = TIMELINE_TYPE_OPTIONS.find((opt) => opt.type === formData.type) || TIMELINE_TYPE_OPTIONS[0];
  const HeaderIcon = currentTypeMeta?.icon || Layers;

  return (
    <div
      className="modal-overlay"
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
          maxWidth: showSimulation ? '900px' : isLoanType ? '580px' : '520px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card)',
          borderRadius: '16px',
          border: '1px solid var(--border-glass)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85)',
          transition: 'max-width 0.3s ease'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HeaderIcon size={22} style={{ color: formData.color || TimelineColor.PRIMARY }} />
            <h2 className="modal-title">
              {isEditing
                ? t('createTimelineModal.editTitle', { type: t(currentTypeMeta.labelKey) })
                : t('createTimelineModal.newTitle', { type: t(currentTypeMeta.labelKey) })}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Tipo de Timeline */}
          <div style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ marginBottom: '6px', display: 'block' }}>
              {t('createTimelineModal.typeLabel')}
            </label>
            {isTypeLocked ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 14px',
                  borderRadius: '10px',
                  background: `${currentTypeMeta.defaultColor}18`,
                  border: `1px solid ${currentTypeMeta.defaultColor}44`,
                  color: currentTypeMeta.defaultColor,
                  fontWeight: '700',
                  fontSize: '0.88rem'
                }}
              >
                <HeaderIcon size={18} />
                <span>{t(currentTypeMeta.labelKey)}</span>
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: `${currentTypeMeta.defaultColor}18`,
                    border: `1px solid ${currentTypeMeta.defaultColor}44`,
                    color: currentTypeMeta.defaultColor,
                    flexShrink: 0
                  }}
                >
                  <HeaderIcon size={20} />
                </div>
                <select
                  className="form-input"
                  style={{
                    fontWeight: '600',
                    fontSize: '0.9rem',
                    cursor: 'pointer',
                    height: '40px'
                  }}
                  value={formData.type}
                  onChange={(e) => {
                    const newType = normalizeTimelineType(e.target.value);
                    const newMeta = TIMELINE_TYPE_OPTIONS.find((opt) => opt.type === newType) || TIMELINE_TYPE_OPTIONS[0];
                    setFormData((prev) => ({
                      ...prev,
                      type: newType,
                      color: newMeta.defaultColor,
                      name: newType === TimelineType.LOAN ? '' : (t(newMeta.labelKey) || '')
                    }));
                  }}
                >
                  {TIMELINE_TYPE_OPTIONS.filter((opt) => !opt.singleInstance || !existingTypesSet.has(opt.type)).map((opt) => (
                    <option key={opt.type} value={opt.type}>
                      {t(opt.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Nome da Timeline */}
          <div className="form-group">
            <label className="form-label">{t('createTimelineModal.nameLabel')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={isLoanType ? t('createTimelineModal.namePlaceholderLoan') : t('createTimelineModal.namePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label className="form-label">{t('createTimelineModal.descriptionLabel')}</label>
            <textarea
              className="form-textarea"
              placeholder={t('createTimelineModal.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Status da Timeline */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{t('createTimelineModal.statusLabel')}</span>
              <span style={{ fontSize: '0.72rem', color: isStatusActive ? TimelineColor.SUCCESS : TimelineColor.DANGER, fontWeight: '700' }}>
                {isStatusActive ? t('createTimelineModal.statusActiveHint') : t('createTimelineModal.statusInactiveHint')}
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: TimelineStatus.ACTIVE })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isStatusActive ? `2px solid ${TimelineColor.SUCCESS}` : '1px solid var(--border-glass)',
                  background: isStatusActive ? `${TimelineColor.SUCCESS}2e` : 'var(--bg-glass)',
                  color: isStatusActive ? TimelineColor.SUCCESS : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldCheck size={16} /> {t('createTimelineModal.statusActive')}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: TimelineStatus.INACTIVE })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isStatusInactive ? `2px solid ${TimelineColor.DANGER}` : '1px solid var(--border-glass)',
                  background: isStatusInactive ? `${TimelineColor.DANGER}2e` : 'var(--bg-glass)',
                  color: isStatusInactive ? TimelineColor.DANGER : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldAlert size={16} /> {t('createTimelineModal.statusInactive')}
              </button>
            </div>
          </div>

          {/* Parâmetros Específicos para Linha de Crédito / Empréstimo */}
          {isLoanType && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.07)', border: '1px solid var(--border-glass-glow)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary-light)', marginBottom: '12px' }}>
                <CreditCard size={16} /> {t('createTimelineModal.contractSectionTitle')}
              </div>

              {/* Identificação do Contrato */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('createTimelineModal.contractNumberLabel')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('createTimelineModal.contractNumberPlaceholder')}
                    value={formData.contractNumber || ''}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('createTimelineModal.bankNameLabel')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('createTimelineModal.bankNamePlaceholder')}
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </div>
              </div>

              {/* Capital & TAN */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('createTimelineModal.totalDebtLabel')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.totalDebt}
                    onChange={(e) => setFormData({ ...formData, totalDebt: e.target.value })}
                    required={isLoanType}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('createTimelineModal.tanRateLabel')}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    className="form-input"
                    placeholder="3.85"
                    value={formData.tanRate}
                    onChange={(e) => setFormData({ ...formData, tanRate: e.target.value })}
                  />
                </div>
              </div>

              {/* Spread & Imposto do Selo */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('createTimelineModal.spreadLabel')}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    className="form-input"
                    placeholder="0.85"
                    value={formData.spread}
                    onChange={(e) => setFormData({ ...formData, spread: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('createTimelineModal.interestStampTaxRateLabel')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder={t('createTimelineModal.interestStampTaxRatePlaceholder')}
                    value={formData.interestStampTaxRate}
                    onChange={(e) => setFormData({ ...formData, interestStampTaxRate: e.target.value })}
                  />
                </div>
              </div>

              {/* Dia de Débito (1-31) */}
              <div className="form-group" style={{ position: 'relative', marginBottom: '14px' }}>
                <label className="form-label">{t('createTimelineModal.dueDayLabel')}</label>
                <div
                  onClick={() => setIsDueDayPickerOpen(!isDueDayPickerOpen)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'var(--bg-glass, rgba(255,255,255,0.03))',
                    border: isDueDayPickerOpen ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                    borderRadius: '8px',
                    padding: '10px 12px',
                    cursor: 'pointer',
                    minHeight: '42px',
                    boxSizing: 'border-box'
                  }}
                >
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    {t('createTimelineModal.dayLabel', { day: formData.dueDay || 10 })}
                  </span>
                  <ChevronDown
                    size={16}
                    style={{
                      color: 'var(--text-muted)',
                      transform: isDueDayPickerOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.2s'
                    }}
                  />
                </div>

                {isDueDayPickerOpen && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      zIndex: 100,
                      marginTop: '6px',
                      width: '280px',
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-glass-glow)',
                      borderRadius: '12px',
                      padding: '12px',
                      boxShadow: '0 12px 30px rgba(0,0,0,0.7)'
                    }}
                  >
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '4px' }}>
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
                        const isSelected = String(formData.dueDay) === String(d);
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() => {
                              setFormData({ ...formData, dueDay: String(d) });
                              setIsDueDayPickerOpen(false);
                            }}
                            style={{
                              padding: '7px 0',
                              fontSize: '0.82rem',
                              fontWeight: isSelected ? '800' : '600',
                              borderRadius: '6px',
                              border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                              background: isSelected ? `${TimelineColor.PRIMARY}47` : 'var(--bg-glass)',
                              color: isSelected ? TimelineColor.WHITE : 'var(--text-main)',
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
              </div>

              {/* Start Date & Total Installments */}
              <div className="form-row">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">{t('createTimelineModal.startDateLabel')}</label>

                  <div
                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-glass)',
                      border: isMonthPickerOpen ? '2px solid var(--primary)' : '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      minHeight: '42px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <span style={{ fontSize: '0.9rem', fontWeight: '700', color: formData.startDate ? 'var(--text-main)' : 'var(--text-muted)' }}>
                      {formData.startDate
                        ? format(parseISO(`${formData.startDate}-01`), 'MMMM yyyy', { locale: dateLocale })
                        : t('createTimelineModal.startMonthPlaceholder')}
                    </span>
                    <ChevronDown
                      size={16}
                      style={{
                        color: 'var(--text-muted)',
                        transform: isMonthPickerOpen ? 'rotate(180deg)' : 'none',
                        transition: 'transform 0.2s'
                      }}
                    />
                  </div>

                  {isMonthPickerOpen && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        zIndex: 100,
                        marginTop: '6px',
                        width: '260px',
                        background: 'var(--bg-card)',
                        border: '1px solid var(--border-glass-glow)',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 12px 30px rgba(0,0,0,0.7)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                        <button
                          type="button"
                          onClick={() => setPickerYear((prev) => prev - 1)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                        >
                          <ChevronLeft size={16} />
                        </button>
                        <span style={{ fontWeight: '800', fontSize: '0.9rem', color: 'var(--primary-light)' }}>
                          {pickerYear}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPickerYear((prev) => prev + 1)}
                          style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: '4px' }}
                        >
                          <ChevronRight size={16} />
                        </button>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        {monthNames.map((name, idx) => {
                          const mStr = (idx + 1).toString().padStart(2, '0');
                          const keyVal = `${pickerYear}-${mStr}`;
                          const isSelected = formData.startDate === keyVal;

                          return (
                            <button
                              key={keyVal}
                              type="button"
                              onClick={() => {
                                setFormData({ ...formData, startDate: keyVal });
                                setIsMonthPickerOpen(false);
                              }}
                              style={{
                                padding: '8px 4px',
                                borderRadius: '6px',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid transparent',
                                background: isSelected ? `${TimelineColor.PRIMARY}40` : 'rgba(255,255,255,0.03)',
                                color: isSelected ? 'var(--primary-light)' : 'var(--text-main)',
                                fontWeight: isSelected ? '800' : '600',
                                fontSize: '0.8rem',
                                cursor: 'pointer',
                                textAlign: 'center',
                                textTransform: 'capitalize'
                              }}
                            >
                              {name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">{t('createTimelineModal.totalInstallmentsLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    className="form-input"
                    placeholder={t('createTimelineModal.totalInstallmentsPlaceholder')}
                    value={formData.totalInstallments}
                    onChange={(e) => setFormData({ ...formData, totalInstallments: e.target.value })}
                    disabled={isEditing}
                    style={isEditing ? { opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' } : {}}
                    required={isLoanType}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Seletor de Cor */}
          <div className="form-group">
            <label className="form-label">{t('createTimelineModal.colorLabel')}</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              {colors.map((c) => (
                <div
                  key={c}
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: formData.color === c ? `3px solid ${TimelineColor.WHITE}` : '2px solid transparent',
                    boxShadow: formData.color === c ? `0 0 12px ${c}` : 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tabela de Simulação de Prestações (Apenas para Empréstimo) */}
          {showSimulation && isLoanType && (
            <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', background: 'var(--bg-glass)', borderRadius: '12px', border: '1px solid var(--border-glass-glow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-light)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  <span>{t('createTimelineModal.simulationTitle')}</span>
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {/* Switch Price vs SAC */}
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '2px',
                      gap: '2px'
                    }}
                    title={t('loan.systemTitle')}
                  >
                    <button
                      type="button"
                      onClick={() => handleRunSimulation(LoanAmortizationSystem.PRICE)}
                      style={{
                        background: simulationSystem === LoanAmortizationSystem.PRICE ? 'var(--primary)' : 'transparent',
                        color: simulationSystem === LoanAmortizationSystem.PRICE ? 'var(--text-bright)' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: simulationSystem === LoanAmortizationSystem.PRICE ? '800' : '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title={t('loan.systemPriceDescription')}
                    >
                      {t('loan.systemPriceShort')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRunSimulation(LoanAmortizationSystem.SAC)}
                      style={{
                        background: simulationSystem === LoanAmortizationSystem.SAC ? 'var(--primary)' : 'transparent',
                        color: simulationSystem === LoanAmortizationSystem.SAC ? 'var(--text-bright)' : 'var(--text-muted)',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 10px',
                        fontSize: '0.74rem',
                        fontWeight: simulationSystem === LoanAmortizationSystem.SAC ? '800' : '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      title={t('loan.systemSacDescription')}
                    >
                      {t('loan.systemSacShort')}
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowSimulation(false)}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {(() => {
                const simCapital = parseFloat(formData.totalDebt) || simulationEvents.reduce((acc, ev) => acc + Number(ev.installmentCapital ?? ev.principalAmount ?? 0), 0);
                const simInterest = simulationEvents.reduce((acc, ev) => acc + Number(ev.installmentInterest ?? ev.interestPortion ?? 0), 0);
                const simFees = simulationEvents.reduce((acc, ev) => acc + Number(ev.installmentFee ?? ev.taxAmount ?? 0), 0);
                const simTotalCost = simCapital + simInterest + simFees;

                return (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))',
                      gap: '12px',
                      marginBottom: '16px',
                      padding: '12px 14px',
                      background: 'rgba(255, 255, 255, 0.03)',
                      borderRadius: '10px',
                      border: '1px solid var(--border-glass)'
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {t('createTimelineModal.originalCapital')}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '800', color: TimelineColor.SUCCESS }}>
                        {formatCurrency(simCapital)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {t('createTimelineModal.estimatedInterest')}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '800', color: TimelineColor.WARNING }}>
                        {formatCurrency(simInterest)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {t('createTimelineModal.estimatedFees')}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '800', color: TimelineColor.PROJECT }}>
                        {formatCurrency(simFees)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {t('createTimelineModal.totalCost')}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                        {formatCurrency(simTotalCost)}
                      </span>
                    </div>
                  </div>
                );
              })()}

              <div style={{ maxHeight: '240px', overflowY: 'auto', border: '1px solid var(--border-glass)', borderRadius: '8px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card)', zIndex: 2 }}>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 10px' }}>{t('createTimelineModal.colNumber')}</th>
                      <th style={{ padding: '8px 10px' }}>{t('createTimelineModal.colDate')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>{t('createTimelineModal.colCapital')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>{t('createTimelineModal.colInterest')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>{t('createTimelineModal.colTax')}</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>{t('createTimelineModal.colInstallment')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationEvents.map((ev, i) => {
                      const c = Number(ev.installmentCapital ?? ev.principalAmount ?? 0);
                      const j = Number(ev.installmentInterest ?? ev.interestPortion ?? 0);
                      const f = Number(ev.installmentFee ?? ev.taxAmount ?? 0);
                      const totalPmt = Number(ev.installmentAmount ?? ev.amount ?? (c + j + f));

                      return (
                        <tr key={i} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                          <td style={{ padding: '6px 10px', fontWeight: '700', color: 'var(--text-muted)' }}>{ev.installmentNumber || (i + 1)}</td>
                          <td style={{ padding: '6px 10px', color: 'var(--text-main)' }}>{ev.date}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: TimelineColor.SUCCESS }}>{formatCurrency(c)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: TimelineColor.WARNING }}>{formatCurrency(j)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: TimelineColor.PROJECT }}>{formatCurrency(f)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', fontWeight: '800', color: 'var(--primary-light)' }}>
                            {formatCurrency(totalPmt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Botões de Ação */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('buttons.cancel')}
            </button>

            {isLoanType && (
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleRunSimulation}
                style={{
                  borderColor: 'var(--primary)',
                  color: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={16} />
                {t('createTimelineModal.simulateButton')}
              </button>
            )}

            <button type="submit" className="btn btn-primary">
              {isEditing
                ? t('createTimelineModal.saveButton')
                : t('createTimelineModal.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
