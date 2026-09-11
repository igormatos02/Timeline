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
  isLoanTimelineType,
  normalizeTimelineType
} from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

const TIMELINE_TYPE_OPTIONS = [
  {
    type: TimelineType.BALANCE,
    labelKey: 'sidebar.balanceTimeline',
    fallbackLabel: 'Balanço',
    defaultName: 'Balanço',
    defaultColor: '#0ea5e9',
    icon: Scale,
    singleInstance: true
  },
  {
    type: TimelineType.INCOME,
    labelKey: 'sidebar.incomeTimeline',
    fallbackLabel: 'Entradas',
    defaultName: 'Entradas',
    defaultColor: '#10b981',
    icon: TrendingUp,
    singleInstance: true
  },
  {
    type: TimelineType.EXPENSE,
    labelKey: 'sidebar.expenseTimeline',
    fallbackLabel: 'Despesas',
    defaultName: 'Despesas',
    defaultColor: '#f43f5e',
    icon: ShoppingCart,
    singleInstance: true
  },
  {
    type: TimelineType.INVESTMENT,
    labelKey: 'sidebar.investmentTimeline',
    fallbackLabel: 'Investimentos',
    defaultName: 'Investimentos',
    defaultColor: '#8b5cf6',
    icon: PiggyBank,
    singleInstance: true
  },
  {
    type: TimelineType.LOAN,
    labelKey: 'sidebar.loanTimeline',
    fallbackLabel: 'Crédito / Empréstimo',
    defaultName: 'Crédito Habitação / Auto',
    defaultColor: '#6366f1',
    icon: CreditCard,
    singleInstance: false
  },
  {
    type: TimelineType.PROJECT,
    labelKey: 'sidebar.projectTimeline',
    fallbackLabel: 'Projetos',
    defaultName: 'Projetos',
    defaultColor: '#a855f7',
    icon: FolderKanban,
    singleInstance: false
  },
  {
    type: TimelineType.REMINDER,
    labelKey: 'sidebar.reminderTimeline',
    fallbackLabel: 'Lembretes',
    defaultName: 'Lembretes',
    defaultColor: '#f59e0b',
    icon: Bell,
    singleInstance: false
  },
  {
    type: TimelineType.DIARY,
    labelKey: 'sidebar.diaryTimeline',
    fallbackLabel: 'Diário',
    defaultName: 'Diário Pessoal',
    defaultColor: '#ec4899',
    icon: BookOpen,
    singleInstance: false
  }
];

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
    color: '#6366f1',
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
        color: initialData.color || '#6366f1',
        totalDebt: getVal('totalDebt', 'originalCapital', 'original_capital'),
        installmentAmount: getVal('installmentAmount', 'installment_amount'),
        periodicity: initialData.periodicity || initialData.aggregation || EventPeriodicity.MONTHLY,
        dueDay: getVal('dueDay', 'due_day') || '10',
        contractNumber: getVal('contractNumber', 'contract_number'),
        bankName: getVal('bankName', 'bank_name'),
        tanRate: getVal('tanRate', 'tan_rate'),
        spread: getVal('spread'),
        interestStampTaxRate: getVal('interestStampTaxRate', 'installmentStampTax', 'installment_stamp_tax')
      });
    } else {
      const currentYear = new Date().getFullYear();
      setPickerYear(currentYear);

      // Determine initial type (passed from caller or first available type)
      let resolvedType = initialType ? normalizeTimelineType(initialType) : TimelineType.LOAN;
      if (initialType && TIMELINE_TYPE_OPTIONS.find((opt) => opt.type === resolvedType && opt.singleInstance && existingTypesSet.has(resolvedType))) {
        resolvedType = TimelineType.LOAN;
      }

      const typeMeta = TIMELINE_TYPE_OPTIONS.find((opt) => opt.type === resolvedType) || TIMELINE_TYPE_OPTIONS[4];

      setFormData({
        name: typeMeta.type === TimelineType.LOAN ? '' : typeMeta.defaultName,
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
  const isLoanType = isLoanTimelineType(formData.type);
  const isStatusActive = formData.status === TimelineStatus.ACTIVE;
  const isStatusInactive = formData.status === TimelineStatus.INACTIVE;

  const handleSelectType = (selectedType) => {
    const meta = TIMELINE_TYPE_OPTIONS.find((opt) => opt.type === selectedType);
    if (!meta) return;

    // Check if current name was a default name, replace it; otherwise keep user's custom name
    const wasDefaultName = TIMELINE_TYPE_OPTIONS.some((opt) => opt.defaultName === formData.name) || !formData.name.trim();

    setFormData((prev) => ({
      ...prev,
      type: selectedType,
      color: meta.defaultColor,
      name: wasDefaultName ? (selectedType === TimelineType.LOAN ? '' : meta.defaultName) : prev.name
    }));
  };

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
          numberOfInstallments: finalData.totalInstallments,
          tanRate: finalData.tanRate,
          interestStampTaxRate: finalData.interestStampTaxRate,
          startDate: fullStartDate,
          dueDay: dueDayNum,
          periodicity: EventPeriodicity.MONTHLY
        });
        finalData.events = generatedEvents;
        if (generatedEvents.length > 0) {
          finalData.installmentAmount = generatedEvents[0].installmentAmount ?? ((generatedEvents[0].installmentCapital ?? generatedEvents[0].principalAmount ?? 0) + (generatedEvents[0].installmentInterest ?? generatedEvents[0].interestPortion ?? 0));
        }
      }
    }

    onSave(finalData);
    onClose();
  };

  const colors = [
    '#6366f1', // Indigo
    '#0ea5e9', // Sky Blue
    '#10b981', // Emerald
    '#f43f5e', // Rose
    '#f59e0b', // Amber
    '#a855f7', // Purple
    '#06b6d4', // Cyan
    '#3b82f6'  // Blue
  ];

  const monthNames = Array.from({ length: 12 }, (_, i) => {
    const d = setMonth(new Date(2026, 0, 1), i);
    return format(d, 'MMM', { locale: dateLocale });
  });

  const handleRunSimulation = () => {
    try {
      const parsedTotalDebt = parseFloat(formData.totalDebt) || 0;
      const parsedTotalInstallments = parseInt(formData.totalInstallments, 10) || 0;
      const dueDayNum = parseInt(formData.dueDay, 10) || 1;
      const dueDayStr = dueDayNum.toString().padStart(2, '0');
      const fullStartDate = formData.startDate ? `${formData.startDate}-${dueDayStr}` : getTodayStr();

      const events = generateLoanInstallments({
        totalAmountFinanced: parsedTotalDebt,
        numberOfInstallments: parsedTotalInstallments || 12,
        tanRate: parseFloat(formData.tanRate) || 0,
        spread: parseFloat(formData.spread) || 0,
        interestStampTaxRate: parseFloat(formData.interestStampTaxRate || formData.taxaImpostoSeloJuros || formData.installmentStampTax) || 0,
        startDate: fullStartDate,
        dueDay: dueDayNum,
        periodicity: EventPeriodicity.MONTHLY
      });

      setSimulationEvents(events);
      setShowSimulation(true);
    } catch (err) {
      alert(err.message || 'Erro ao gerar o plano de amortização.');
    }
  };

  const currentTypeMeta = TIMELINE_TYPE_OPTIONS.find((opt) => opt.type === formData.type) || TIMELINE_TYPE_OPTIONS[4];
  const HeaderIcon = currentTypeMeta.icon;

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
          background: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.15)',
          transition: 'max-width 0.3s ease'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <HeaderIcon size={22} style={{ color: formData.color || 'var(--primary)' }} />
            <h2 className="modal-title">
              {isEditing
                ? `${t('modal.edit') || 'Editar'} ${t(currentTypeMeta.labelKey) || currentTypeMeta.fallbackLabel}`
                : `${t('modal.new') || 'Nova'} ${t(currentTypeMeta.labelKey) || currentTypeMeta.fallbackLabel}`}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Seletor de Tipo de Timeline (Apenas na Criação) */}
          {!isEditing && (
            <div style={{ marginBottom: '20px' }}>
              <label className="form-label" style={{ marginBottom: '8px', display: 'block' }}>
                {t('timelineModal.typeLabel') || 'Tipo de Timeline *'}
              </label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
                  gap: '8px'
                }}
              >
                {TIMELINE_TYPE_OPTIONS.map((opt) => {
                  const isSelected = formData.type === opt.type;
                  const isAlreadyAdded = opt.singleInstance && existingTypesSet.has(opt.type);
                  const Icon = opt.icon;

                  return (
                    <button
                      key={opt.type}
                      type="button"
                      disabled={isAlreadyAdded}
                      onClick={() => handleSelectType(opt.type)}
                      title={isAlreadyAdded ? 'Já adicionada a este Timeboard (apenas 1 permitida)' : ''}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 8px',
                        borderRadius: '10px',
                        border: isSelected ? `2px solid ${opt.defaultColor}` : '1px solid var(--border-glass)',
                        background: isSelected
                          ? `${opt.defaultColor}22`
                          : isAlreadyAdded
                            ? 'rgba(255, 255, 255, 0.02)'
                            : 'var(--bg-glass, rgba(255,255,255,0.03))',
                        color: isSelected ? opt.defaultColor : isAlreadyAdded ? 'var(--text-dim)' : 'var(--text-main)',
                        opacity: isAlreadyAdded ? 0.45 : 1,
                        cursor: isAlreadyAdded ? 'not-allowed' : 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Icon size={18} style={{ color: isSelected ? opt.defaultColor : isAlreadyAdded ? 'var(--text-dim)' : opt.defaultColor }} />
                      <span style={{ fontSize: '0.74rem', fontWeight: isSelected ? '800' : '600', textAlign: 'center' }}>
                        {t(opt.labelKey) || opt.fallbackLabel}
                      </span>
                      {isAlreadyAdded && (
                        <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)' }}>
                          (Adicionada)
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Nome da Timeline */}
          <div className="form-group">
            <label className="form-label">{t('timelineModal.nameLabel') || t('loanModal.nameLabel') || 'Nome da Timeline *'}</label>
            <input
              type="text"
              className="form-input"
              placeholder={isLoanType ? (t('loanModal.namePlaceholder') || 'Ex: Crédito Automóvel, Habitação...') : 'Ex: Entradas Principais, Balanço, Despesas...'}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Descrição */}
          <div className="form-group">
            <label className="form-label">{t('loanModal.descriptionLabel') || 'Descrição'}</label>
            <textarea
              className="form-textarea"
              placeholder={t('loanModal.descriptionPlaceholder') || 'Breve descrição dos objetivos desta linha temporal...'}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Status da Timeline */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{t('loanModal.statusLabel') || 'Status'}</span>
              <span style={{ fontSize: '0.72rem', color: isStatusActive ? '#10b981' : '#f43f5e', fontWeight: '700' }}>
                {isStatusActive ? (t('loanModal.statusActiveHint') || 'Ativa na Projeção') : (t('loanModal.statusInactiveHint') || 'Inativa')}
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: TimelineStatus.ACTIVE })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isStatusActive ? '2px solid #10b981' : '1px solid var(--border-glass)',
                  background: isStatusActive ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-glass)',
                  color: isStatusActive ? '#10b981' : 'var(--text-muted)',
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
                <ShieldCheck size={16} /> {t('loanModal.statusActive') || 'Ativa'}
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: TimelineStatus.INACTIVE })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isStatusInactive ? '2px solid #f43f5e' : '1px solid var(--border-glass)',
                  background: isStatusInactive ? 'rgba(244, 63, 94, 0.18)' : 'var(--bg-glass)',
                  color: isStatusInactive ? '#f43f5e' : 'var(--text-muted)',
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
                <ShieldAlert size={16} /> {t('loanModal.statusInactive') || 'Inativa'}
              </button>
            </div>
          </div>

          {/* Parâmetros Específicos para Linha de Crédito / Empréstimo */}
          {isLoanType && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.07)', border: '1px solid var(--border-glass-glow)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary-light)', marginBottom: '12px' }}>
                <CreditCard size={16} /> {t('loanModal.contractSectionTitle') || 'Parâmetros do Contrato de Crédito'}
              </div>

              {/* Identificação do Contrato */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('loanModal.contractNumberLabel') || 'Nº do Contrato'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('loanModal.contractNumberPlaceholder') || 'Ex: CRED-2026-998'}
                    value={formData.contractNumber || ''}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('loanModal.bankNameLabel') || 'Entidade Bancária'}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('loanModal.bankNamePlaceholder') || 'Ex: Millennium BCP, Santander...'}
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </div>
              </div>

              {/* Capital & TAN */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('loanModal.totalDebtLabel') || 'Montante Financiado (€) *'}</label>
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
                  <label className="form-label">{t('loanModal.tanRateLabel') || 'Taxa de Juro (TAN %)'}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    className="form-input"
                    placeholder="Ex: 3.85"
                    value={formData.tanRate}
                    onChange={(e) => setFormData({ ...formData, tanRate: e.target.value })}
                  />
                </div>
              </div>

              {/* Spread & Imposto do Selo */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('loanModal.spreadLabel') || 'Spread (%)'}</label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    max="100"
                    className="form-input"
                    placeholder="Ex: 0.85"
                    value={formData.spread}
                    onChange={(e) => setFormData({ ...formData, spread: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">{t('loanModal.interestStampTaxRateLabel') || 'Imposto Selo s/ Juros (%)'}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    className="form-input"
                    placeholder="Ex: 4.00"
                    value={formData.interestStampTaxRate}
                    onChange={(e) => setFormData({ ...formData, interestStampTaxRate: e.target.value })}
                  />
                </div>
              </div>

              {/* Dia de Débito (1-31) */}
              <div className="form-group" style={{ position: 'relative', marginBottom: '14px' }}>
                <label className="form-label">{t('loanModal.dueDayLabel') || 'Dia de Cobrança / Débito'}</label>
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
                    {t('modal.dayLabel', { day: formData.dueDay || 10 }) || `Dia ${formData.dueDay || 10}`}
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
                      background: 'var(--bg-card, #131722)',
                      border: '1px solid var(--border-glass-glow, rgba(99, 102, 241, 0.3))',
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
                              background: isSelected ? 'rgba(99, 102, 241, 0.28)' : 'var(--bg-glass, rgba(255,255,255,0.03))',
                              color: isSelected ? '#ffffff' : 'var(--text-main)',
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
                  <label className="form-label">{t('loanModal.startDateLabel') || 'Mês de Início'}</label>

                  <div
                    onClick={() => setIsMonthPickerOpen(!isMonthPickerOpen)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      background: 'var(--bg-glass, rgba(255,255,255,0.03))',
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
                        : t('modal.startMonth') || 'Selecionar Mês'}
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
                        background: 'var(--bg-card, #131722)',
                        border: '1px solid var(--border-glass-glow, rgba(99, 102, 241, 0.3))',
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
                                background: isSelected ? 'rgba(99, 102, 241, 0.25)' : 'rgba(255,255,255,0.03)',
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
                  <label className="form-label">{t('loanModal.totalInstallmentsLabel') || 'Nº de Prestações'}</label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    className="form-input"
                    placeholder={t('loanModal.totalInstallmentsPlaceholder') || 'Ex: 120, 240, 360'}
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
            <label className="form-label">{t('loanModal.colorLabel') || 'Cor de Destaque'}</label>
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
                    border: formData.color === c ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: formData.color === c ? '0 0 12px ' + c : 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Tabela de Simulação de Prestações (Apenas para Empréstimo) */}
          {showSimulation && isLoanType && (
            <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', background: 'var(--bg-glass, rgba(255,255,255,0.02))', borderRadius: '12px', border: '1px solid var(--border-glass-glow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-light)', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={16} />
                  <span>{t('loanModal.simulationTitle') || 'Simulação do Plano de Pagamentos'}</span>
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSimulation(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <X size={16} />
                </button>
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
                        {t('loanHeader.originalCapital') || 'CAPITAL ORIGINAL'}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#10b981' }}>
                        {formatCurrency(simCapital)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {t('loanHeader.totalEstimatedInterest') || 'JUROS ESTIMADOS'}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#f59e0b' }}>
                        {formatCurrency(simInterest)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {t('loanHeader.totalEstimatedFees') || 'IMPOSTOS ESTIMADOS'}
                      </span>
                      <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#a855f7' }}>
                        {formatCurrency(simFees)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <span style={{ fontSize: '0.68rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
                        {t('loanHeader.totalLoanCost') || 'CUSTO TOTAL'}
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
                  <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-card, #131722)', zIndex: 2 }}>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 10px' }}>#</th>
                      <th style={{ padding: '8px 10px' }}>Data</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Capital</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Juros</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Imposto</th>
                      <th style={{ padding: '8px 10px', textAlign: 'right' }}>Prestação</th>
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
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: '#10b981' }}>{formatCurrency(c)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: '#f59e0b' }}>{formatCurrency(j)}</td>
                          <td style={{ padding: '6px 10px', textAlign: 'right', color: '#a855f7' }}>{formatCurrency(f)}</td>
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
              {t('buttons.cancel') || 'Cancelar'}
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
                {t('loanModal.simulateButton') || 'Simular'}
              </button>
            )}

            <button type="submit" className="btn btn-primary">
              {isEditing
                ? (t('loanModal.saveButton') || 'Guardar Alterações')
                : (t('loanModal.createButton') || 'Criar Timeline')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
