import React, { useState, useEffect } from 'react';
import { X, Sparkles, FolderPlus, Edit2, CreditCard, DollarSign, Calendar, ShieldCheck, ShieldAlert, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, parseISO, setMonth, setYear } from 'date-fns';
import { generateLoanInstallments } from '../utils/loanCalculations';
import { TimelineType, TimelineStatus, EventPeriodicity, EventAggregation } from '../enums/index.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function CreateTimelineModal({
  isOpen,
  onClose,
  onSave,
  initialData
}) {
  const { t, dateLocale } = useTranslation();
  const getTodayStr = () => new Date().toISOString().substring(0, 10);
  const getTodayMonthStr = () => new Date().toISOString().substring(0, 7);

  const [isMonthPickerOpen, setIsMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const [showSimulation, setShowSimulation] = useState(false);
  const [simulationEvents, setSimulationEvents] = useState([]);

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
    periodicity: EventAggregation.MONTHLY,
    dueDay: '',
    contractNumber: '',
    bankName: '',
    tanRate: '',
    spread: '',
    interestStampTaxRate: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    setIsMonthPickerOpen(false);
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

      setFormData({
        ...initialData,
        name: initialData.name || '',
        description: initialData.description || '',
        startDate: initDate.substring(0, 7) || getTodayMonthStr(),
        totalInstallments: getVal('totalInstallments', 'total_installments'),
        status: initialData.status === TimelineStatus.INACTIVE ? TimelineStatus.INACTIVE : TimelineStatus.ACTIVE,
        type: TimelineType.LOAN,
        color: initialData.color || '#6366f1',
        totalDebt: getVal('totalDebt', 'originalCapital', 'original_capital'),
        installmentAmount: getVal('installmentAmount', 'installment_amount'),
        periodicity: initialData.periodicity || initialData.aggregation || EventAggregation.MONTHLY,
        dueDay: getVal('dueDay', 'due_day'),
        contractNumber: getVal('contractNumber', 'contract_number'),
        bankName: getVal('bankName', 'bank_name'),
        tanRate: getVal('tanRate', 'tan_rate'),
        spread: getVal('spread'),
        interestStampTaxRate: getVal('interestStampTaxRate', 'installmentStampTax', 'installment_stamp_tax')
      });
    } else {
      const currentYear = new Date().getFullYear();
      setPickerYear(currentYear);
      setFormData({
        name: '',
        description: '',
        startDate: getTodayMonthStr(),
        totalInstallments: '',
        status: TimelineStatus.ACTIVE,
        type: TimelineType.LOAN,
        color: '#6366f1',
        totalDebt: '',
        installmentAmount: '',
        periodicity: EventAggregation.MONTHLY,
        dueDay: '',
        contractNumber: '',
        bankName: '',
        tanRate: '',
        spread: '',
        interestStampTaxRate: ''
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isMonthPickerOpen) setIsMonthPickerOpen(false);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isMonthPickerOpen, onClose]);

  if (!isOpen) return null;

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
      type: TimelineType.LOAN,
      aggregation: formData.aggregation || formData.periodicity || EventAggregation.MONTHLY,
      periodicity: formData.aggregation || formData.periodicity || EventAggregation.MONTHLY,
      status: isInactive ? TimelineStatus.INACTIVE : TimelineStatus.ACTIVE
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
        periodicity: EventAggregation.MONTHLY
      });
      finalData.events = generatedEvents;
      if (generatedEvents.length > 0) {
        // Contractual PMT base
        finalData.installmentAmount = generatedEvents[0].principalAmount + generatedEvents[0].interestPortion;
      }
    }

    onSave(finalData);
    onClose();
  };

  const isEditing = Boolean(initialData && initialData.id);
  const isLoanType = (formData.type || initialData?.type || '').toLowerCase() === TimelineType.LOAN || (formData.type || initialData?.type || '').toLowerCase() === 'loan' || (formData.type || initialData?.type || '').toLowerCase() === 'empréstimo' || (formData.type || initialData?.type || '').toLowerCase() === 'emprestimo';
  const isStatusActive = formData.status === TimelineStatus.ACTIVE;
  const isStatusInactive = formData.status === TimelineStatus.INACTIVE;

  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#a855f7', // Purple
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
        periodicity: EventAggregation.MONTHLY
      });

      setSimulationEvents(events);
      setShowSimulation(true);
    } catch (err) {
      alert(err.message || 'Erro ao gerar o plano de amortização.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: showSimulation ? '900px' : '580px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          transition: 'max-width 0.3s ease'
        }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={22} className="text-primary" />
            <h2 className="modal-title">
              {isEditing ? (isLoanType ? t('loanModal.editTitle') : 'Timeline Settings') : t('loanModal.newTitle')}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nome do Empréstimo */}
          <div className="form-group">
            <label className="form-label">{t('loanModal.nameLabel')}</label>
            <input
              type="text"
              className="form-input"
              placeholder={t('loanModal.namePlaceholder')}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">{t('loanModal.descriptionLabel')}</label>
            <textarea
              className="form-textarea"
              placeholder={t('loanModal.descriptionPlaceholder')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Status do Empréstimo */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{t('loanModal.statusLabel')}</span>
              <span style={{ fontSize: '0.72rem', color: isStatusActive ? '#10b981' : '#f43f5e', fontWeight: '700' }}>
                {isStatusActive ? t('loanModal.statusActiveHint') : t('loanModal.statusInactiveHint')}
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
                <ShieldCheck size={16} /> {t('loanModal.statusActive')}
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
                <ShieldAlert size={16} /> {t('loanModal.statusInactive')}
              </button>
            </div>
            {isStatusInactive && (
              <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '6px', lineHeight: 1.3 }}>
                {t('loanModal.statusInactiveWarning')}
              </div>
            )}
          </div>

          {/* Loan Contract Specific Parameters (Renderizado Apenas para Timeline de Empréstimo) */}
          {isLoanType && (
            <div style={{ padding: '16px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.07)', border: '1px solid var(--border-glass-glow)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.88rem', fontWeight: '700', color: 'var(--primary-light)', marginBottom: '12px' }}>
                <CreditCard size={16} /> {t('loanModal.contractSectionTitle')}
              </div>

              {/* Identificação do Contrato */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('loanModal.contractNumberLabel')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('loanModal.contractNumberPlaceholder')}
                    value={formData.contractNumber || ''}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('loanModal.bankNameLabel')}</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder={t('loanModal.bankNamePlaceholder')}
                    value={formData.bankName || ''}
                    onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  />
                </div>
              </div>

              {/* Valores Principais */}
              <div className="form-group">
                <label className="form-label">{t('loanModal.totalDebtLabel')}</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  className="form-input"
                  placeholder={t('loanModal.totalDebtPlaceholder')}
                  value={formData.totalDebt}
                  onChange={(e) => setFormData({ ...formData, totalDebt: e.target.value })}
                  required={isLoanType}
                />
              </div>

              {/* Taxas & Condições */}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">{t('loanModal.tanRateLabel')}</label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    className="form-input"
                    placeholder="Ex: 11.1830"
                    value={formData.tanRate}
                    onChange={(e) => setFormData({ ...formData, tanRate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">{t('loanModal.spreadLabel')}</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="Ex: 0.00"
                    value={formData.spread}
                    onChange={(e) => setFormData({ ...formData, spread: e.target.value })}
                  />
                </div>
              </div>

              {/* Imposto de Selo sobre Juros */}
              <div className="form-group">
                <label className="form-label">{t('loanModal.interestStampTaxRateLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="form-input"
                  placeholder="Ex: 4.00"
                  value={formData.interestStampTaxRate}
                  onChange={(e) => setFormData({ ...formData, interestStampTaxRate: e.target.value })}
                />
              </div>

              {/* Dia Vencimento */}
              <div className="form-group">
                <label className="form-label">{t('loanModal.dueDayLabel')}</label>
                <input
                  type="number"
                  min="1"
                  max="31"
                  className="form-input"
                  placeholder="Ex: 10"
                  value={formData.dueDay}
                  onChange={(e) => setFormData({ ...formData, dueDay: e.target.value })}
                  required={isLoanType}
                />
              </div>

              {/* Start Date (Mês/Ano) & Total Installments */}
              <div className="form-row">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">{t('loanModal.startDateLabel')}</label>

                  {/* Botão Seletor Mês/Ano */}
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

                  {/* Popover Seletor Grade de 12 Meses + Navegação de Ano */}
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
                      {/* Controlo de Ano */}
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

                      {/* Grade de 12 Meses */}
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
                  <label className="form-label">{t('loanModal.totalInstallmentsLabel')}</label>
                  <input
                    type="number"
                    min="0"
                    max="600"
                    className="form-input"
                    placeholder={t('loanModal.totalInstallmentsPlaceholder')}
                    value={formData.totalInstallments}
                    onChange={(e) => setFormData({ ...formData, totalInstallments: e.target.value })}
                    disabled={isEditing}
                    style={isEditing ? { opacity: 0.65, cursor: 'not-allowed', background: 'rgba(255,255,255,0.03)' } : {}}
                    required={isLoanType}
                  />
                  {isEditing && (
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                      O número de prestações não pode ser alterado após a criação.
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Color Accent */}
          <div className="form-group">
            <label className="form-label">{t('loanModal.colorLabel')}</label>
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

          {/* Tabela de Simulação de Prestações */}
          {showSimulation && (
            <div style={{ marginTop: '20px', marginBottom: '20px', padding: '16px', background: 'var(--bg-glass, rgba(255,255,255,0.02))', borderRadius: '12px', border: '1px solid var(--border-glass-glow)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--primary-light)', fontWeight: '700' }}>
                  {t('loanModal.simulationTitle')}
                </h4>
                <button
                  type="button"
                  onClick={() => setShowSimulation(false)}
                  style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.8rem' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-glass)', color: 'var(--text-muted)' }}>
                      <th style={{ padding: '8px 6px' }}>{t('loanModal.colNumber')}</th>
                      <th style={{ padding: '8px 6px' }}>{t('loanModal.colDate')}</th>
                      <th style={{ padding: '8px 6px' }}>{t('loanModal.colTotalAmount')}</th>
                      <th style={{ padding: '8px 6px' }}>{t('loanModal.colCapital')}</th>
                      <th style={{ padding: '8px 6px' }}>{t('loanModal.colInterest')}</th>
                      <th style={{ padding: '8px 6px' }}>{t('loanModal.colTax')}</th>
                      <th style={{ padding: '8px 6px' }}>{t('loanModal.colRemaining')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {simulationEvents.map((ev) => {
                      const capitalVal = Number(ev.principalAmount || 0);
                      const interestVal = Number(ev.interestPortion || 0);
                      const taxVal = Number(ev.taxAmount || 0);
                      const totalPayable = Number(ev.amount || 0);

                      return (
                        <tr key={ev.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                          <td style={{ padding: '8px 6px', fontWeight: '700', color: 'var(--primary-light)' }}>
                            #{ev.installmentNumber}
                          </td>
                          <td style={{ padding: '8px 6px', color: 'var(--text-main)' }}>
                            {ev.date}
                          </td>
                          <td style={{ padding: '8px 6px', fontWeight: '700', color: 'var(--text-main)' }}>
                            {totalPayable.toFixed(2)} €
                          </td>
                          <td style={{ padding: '8px 6px', color: '#10b981' }}>
                            {capitalVal.toFixed(2)} €
                          </td>
                          <td style={{ padding: '8px 6px', color: '#f59e0b' }}>
                            {interestVal.toFixed(2)} €
                          </td>
                          <td style={{ padding: '8px 6px', color: '#a855f7' }}>
                            {taxVal.toFixed(2)} €
                          </td>
                          <td style={{ padding: '8px 6px', color: 'var(--text-muted)' }}>
                            {Number(ev.balanceAfter || 0).toFixed(2)} €
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('buttons.cancel')}
            </button>

            {/* Botão Simular (Apenas para Empréstimo) */}
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
                {t('loanModal.simulateButton')}
              </button>
            )}

            <button type="submit" className="btn btn-primary">
              {isEditing ? t('loanModal.saveButton') : t('loanModal.createButton')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
