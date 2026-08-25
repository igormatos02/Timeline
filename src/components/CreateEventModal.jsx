import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  DollarSign,
  ShoppingCart,
  PiggyBank,
  Landmark,
  Sparkles,
  Lock,
  Repeat,
  Zap,
  Calendar,
  ChevronDown,
  Target
} from 'lucide-react';
import { format, parseISO, getDaysInMonth, addMonths } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../utils/loanCalculations';
import { generateUUID } from '../utils/uuid';

export default function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline,
  allTimelines = [],
  defaultNature = 'income',
  activeFinancialTab = 'balanco'
}) {
  const isFinancialTimeline = timeline?.type === 'Entradas' || timeline?.type === 'Financeiro' || timeline?.id === 'tl-income';
  const isBalancoView = activeFinancialTab === 'balanco';

  // Tipo de Movimento: 'entrada' | 'saida' | 'investimento'
  const [movementType, setMovementType] = useState(() => {
    if (activeFinancialTab === 'gastos' || defaultNature === 'expense') return 'saida';
    if (activeFinancialTab === 'investimentos' || defaultNature === 'investment') return 'investimento';
    return 'entrada';
  });

  const [breakdownItems, setBreakdownItems] = useState([]);
  const [isDayPickerOpen, setIsDayPickerOpen] = useState(false);
  const [updateScope, setUpdateScope] = useState('single'); // 'single' (Apenas este mês) | 'subsequent' (Deste mês em diante)
  const [investmentSubtype, setInvestmentSubtype] = useState('investimento_poupanca'); // 'investimento_poupanca' | 'investimento_patrimonio' | 'investimento_outros'

  // Base Form State
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 1,
    time: '09:00',
    status: 'Previsto',
    periodicity: 'recorrente', // 'recorrente' | 'unica' | 'periodo'
    recurrenceEndDate: '', // 'YYYY-MM'
    amount: 100,
    initialInvestedAmount: '',
    targetAmount: '',
    priority: 'Normal',
    labelsInput: ''
  });

  // Handle Escape key to close modal or day picker
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (isDayPickerOpen) {
          setIsDayPickerOpen(false);
        } else {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isDayPickerOpen, onClose]);

  useEffect(() => {
    const todayStr = '2026-08-21';
    const targetDate = initialData?.date || defaultDate || todayStr;

    let parsedDay = 1;
    try {
      const d = parseISO(targetDate);
      if (!isNaN(d.getDate())) {
        parsedDay = d.getDate();
      }
    } catch (e) {
      parsedDay = 1;
    }

    if (initialData) {
      let initType = 'entrada';
      if (initialData.isExpense || initialData.financialType === 'gasto' || (initialData.category && initialData.category.startsWith('saida')) || initialData.category === 'gasto') {
        initType = 'saida';
      } else if (initialData.isInvestment || initialData.financialType === 'investimento' || (initialData.category && initialData.category.startsWith('investimento'))) {
        initType = 'investimento';
      }

      setMovementType(initType);
      const isRecurrent = initialData.category === 'entrada_recorrente' || initialData.category === 'saida_recorrente' || initialData.category === 'investimento_poupanca' || initialData.periodicity === 'recorrente';

      if (initialData.category === 'investimento_patrimonio') {
        setInvestmentSubtype('investimento_patrimonio');
      } else if (initialData.category === 'investimento_outros' || initialData.category?.includes('etf') || initialData.category?.includes('acoes') || initialData.category?.includes('extra')) {
        setInvestmentSubtype('investimento_outros');
      } else {
        setInvestmentSubtype('investimento_poupanca');
      }

      let targetAmtVal = initialData.targetAmount !== undefined && initialData.targetAmount !== null ? initialData.targetAmount : '';
      if ((targetAmtVal === '' || targetAmtVal === undefined) && initialData.seriesId) {
        const match = (allTimelines || []).flatMap(t => t.events || []).find(ev => ev.seriesId === initialData.seriesId && ev.targetAmount);
        if (match) targetAmtVal = match.targetAmount;
      }

      let initPeriodicity = 'recorrente';
      if (initialData.periodicity === 'periodo' || initialData.recurrenceEndDate || initialData.endDate) {
        initPeriodicity = 'periodo';
      } else if (initialData.periodicity === 'unica' || initialData.periodicity === 'unico' || (!isRecurrent && !initialData.seriesId)) {
        initPeriodicity = 'unica';
      }

      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || (initType === 'entrada' ? 'Previsto' : initType === 'saida' ? 'Pendente' : 'Planeado'),
        periodicity: initPeriodicity,
        recurrenceEndDate: initialData.recurrenceEndDate || initialData.endDate || '',
        amount: initialData.amount !== undefined ? initialData.amount : 100,
        initialInvestedAmount: initialData.initialInvestedAmount !== undefined ? initialData.initialInvestedAmount : '',
        targetAmount: targetAmtVal,
        priority: initialData.priority || 'Normal',
        labelsInput: initialData.labels ? initialData.labels.join(', ') : ''
      });
      setUpdateScope('subsequent');
      setBreakdownItems(initialData.breakdownItems ? JSON.parse(JSON.stringify(initialData.breakdownItems)) : []);
    } else {
      let initialMovement = 'entrada';
      if (activeFinancialTab === 'gastos' || defaultNature === 'expense') {
        initialMovement = 'saida';
      } else if (activeFinancialTab === 'investimentos' || defaultNature === 'investment') {
        initialMovement = 'investimento';
      }

      setMovementType(initialMovement);
      setInvestmentSubtype('investimento_poupanca');

      const initStatus = initialMovement === 'saida' ? 'Pendente' : initialMovement === 'investimento' ? 'Planeado' : 'Previsto';

      let defaultEndMonth = '2026-12';
      try {
        defaultEndMonth = format(addMonths(parseISO(targetDate), 6), 'yyyy-MM');
      } catch { }

      setFormData({
        title: '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '09:00',
        status: initStatus,
        periodicity: 'recorrente',
        recurrenceEndDate: defaultEndMonth,
        amount: '',
        initialInvestedAmount: '',
        targetAmount: '',
        priority: 'Normal',
        labelsInput: ''
      });
      setBreakdownItems([]);
    }
  }, [initialData, defaultDate, defaultNature, activeFinancialTab, isOpen]);

  if (!isOpen) return null;

  // Extract year & month from selected date
  let yearStr = '2026';
  let monthStr = '08';
  let totalDays = 31;
  try {
    const pDate = parseISO(formData.date);
    yearStr = format(pDate, 'yyyy');
    monthStr = format(pDate, 'MM');
    totalDays = getDaysInMonth(pDate) || 31;
  } catch (e) { }

  const daysArray = Array.from({ length: totalDays }, (_, i) => i + 1);

  // Theme styling configuration based on movementType
  const themeConfig = {
    entrada: {
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)',
      bgGlow: 'rgba(16, 185, 129, 0.25)',
      border: 'rgba(16, 185, 129, 0.4)',
      textTitle: 'Entrada / Rendimento',
      icon: <DollarSign size={20} />,
      statusOptions: [
        { value: 'Previsto', label: 'A Receber (Previsto)' },
        { value: 'Recebido', label: 'Recebido (Liquidado)' }
      ]
    },
    saida: {
      color: '#f43f5e',
      bgLight: 'rgba(244, 63, 94, 0.12)',
      bgGlow: 'rgba(244, 63, 94, 0.25)',
      border: 'rgba(244, 63, 94, 0.4)',
      textTitle: 'Saída / Gasto',
      icon: <ShoppingCart size={20} />,
      statusOptions: [
        { value: 'Pendente', label: 'A Pagar (Pendente)' },
        { value: 'Pago', label: 'Pago (Liquidado)' }
      ]
    },
    investimento: {
      color: '#6366f1',
      bgLight: 'rgba(99, 102, 241, 0.12)',
      bgGlow: 'rgba(99, 102, 241, 0.25)',
      border: 'rgba(99, 102, 241, 0.4)',
      textTitle: 'Investimento / Poupança',
      icon: <PiggyBank size={20} />,
      statusOptions: [
        { value: 'Planeado', label: 'Planeado (Aguardando Aporte)' },
        { value: 'Investido', label: 'Investido / Realizado' }
      ]
    }
  };

  const currentTheme = themeConfig[movementType] || themeConfig.entrada;

  const handleSelectMovementType = (typeKey) => {
    if (!isBalancoView) return;
    setMovementType(typeKey);
    const newStatus = typeKey === 'saida' ? 'Pendente' : typeKey === 'investimento' ? 'Planeado' : 'Previsto';

    setFormData({
      ...formData,
      status: newStatus
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const safeDay = Math.min(31, Math.max(1, Number(formData.dayOfMonth) || 1));
    const safeDayStr = safeDay.toString().padStart(2, '0');
    const finalDateStr = `${yearStr}-${monthStr}-${safeDayStr}`;

    const labels = formData.labelsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    let finalCategory = 'entrada_recorrente';
    let isIncome = false;
    let isExpense = false;
    let isInvestment = false;
    let finalStatus = formData.status || 'Previsto';

    if (movementType === 'entrada') {
      isIncome = true;
      finalCategory = (formData.periodicity === 'recorrente' || formData.periodicity === 'periodo') ? 'entrada_recorrente' : 'entrada_esporadica';
      finalStatus = formData.status || 'Previsto';
    } else if (movementType === 'saida') {
      isExpense = true;
      finalCategory = (formData.periodicity === 'recorrente' || formData.periodicity === 'periodo') ? 'saida_recorrente' : 'saida_esporadica';
      finalStatus = formData.status || 'Pendente';
    } else if (movementType === 'investimento') {
      isInvestment = true;
      finalCategory = investmentSubtype || 'investimento_poupanca';
      finalStatus = formData.status || 'Planeado';
    }

    const isCompleted = finalStatus === 'Recebido' || finalStatus === 'Pago' || finalStatus === 'Investido';
    const priorInvested = movementType === 'investimento' ? (Number(formData.initialInvestedAmount) || 0) : 0;
    const finalAmount = breakdownItems.length > 0
      ? breakdownItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
      : (formData.amount !== '' && formData.amount !== undefined ? Number(formData.amount) : 0);

    if (movementType === 'investimento') {
      if (priorInvested <= 0 && finalAmount <= 0) {
        alert('Por favor indique o aporte do mês ou o valor já investido anteriormente.');
        return;
      }
    } else {
      if (finalAmount <= 0) {
        alert('Por favor indique um valor maior que zero.');
        return;
      }
    }

    const targetAmountVal = movementType === 'investimento' && formData.targetAmount !== '' ? (Number(formData.targetAmount) || 0) : undefined;
    const isRecurring = formData.periodicity === 'recorrente' || formData.periodicity === 'periodo';
    const recurrenceEndDate = formData.periodicity === 'periodo' && formData.recurrenceEndDate ? formData.recurrenceEndDate : null;

    onSave({
      ...formData,
      title: formData.title.trim(),
      date: finalDateStr,
      category: finalCategory,
      financialType: movementType === 'saida' ? 'gasto' : movementType === 'investimento' ? 'investimento' : 'entrada',
      isIncome,
      isExpense,
      isInvestment,
      isRecurring,
      periodicity: formData.periodicity,
      recurrenceEndDate,
      endDate: recurrenceEndDate,
      status: finalStatus,
      amount: finalAmount,
      initialInvestedAmount: priorInvested,
      targetAmount: targetAmountVal,
      breakdownItems: breakdownItems.length > 0 ? breakdownItems : undefined,
      labels,
      isCompleted,
      updateScope: initialData ? updateScope : 'all'
    });

    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 1100 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: '560px',
          width: '100%',
          borderColor: currentTheme.border,
          boxShadow: `0 24px 60px rgba(0, 0, 0, 0.45), 0 0 35px ${currentTheme.bgGlow}`
        }}
      >
        {/* Modal Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                background: currentTheme.bgLight,
                color: currentTheme.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1px solid ${currentTheme.border}`
              }}
            >
              {currentTheme.icon}
            </div>
            <div>
              <h2 className="modal-title" style={{ margin: 0 }}>
                {initialData ? `Editar ${currentTheme.textTitle}` : `Novo(a) ${currentTheme.textTitle}`}
              </h2>
              <div style={{ fontSize: '0.8rem', color: currentTheme.color, fontWeight: '700', marginTop: '2px' }}>
                {format(parseISO(`${yearStr}-${monthStr}-01`), 'MMMM yyyy', { locale: pt }).toUpperCase()}
              </div>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Seletor de Tipo de Movimento (Apenas na Criação de Novo Evento) */}
          {!initialData && (
            <div className="form-group">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label">Tipo de Movimento</label>
                {!isBalancoView && (
                  <span style={{ fontSize: '0.72rem', color: currentTheme.color, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px', textTransform: 'none' }}>
                    <Lock size={11} /> Definido pela Timeline ativa
                  </span>
                )}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  disabled={!isBalancoView}
                  onClick={() => handleSelectMovementType('entrada')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: movementType === 'entrada' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                    background: movementType === 'entrada' ? 'rgba(16, 185, 129, 0.2)' : 'var(--bg-glass)',
                    color: movementType === 'entrada' ? '#10b981' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: !isBalancoView ? 'not-allowed' : 'pointer',
                    opacity: !isBalancoView && movementType !== 'entrada' ? 0.4 : 1,
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <DollarSign size={14} /> Entrada
                </button>

                <button
                  type="button"
                  disabled={!isBalancoView}
                  onClick={() => handleSelectMovementType('saida')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: movementType === 'saida' ? '2px solid #f43f5e' : '1px solid var(--border-glass)',
                    background: movementType === 'saida' ? 'rgba(244, 63, 94, 0.2)' : 'var(--bg-glass)',
                    color: movementType === 'saida' ? '#f43f5e' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: !isBalancoView ? 'not-allowed' : 'pointer',
                    opacity: !isBalancoView && movementType !== 'saida' ? 0.4 : 1,
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <ShoppingCart size={14} /> Saída
                </button>

                <button
                  type="button"
                  disabled={!isBalancoView}
                  onClick={() => handleSelectMovementType('investimento')}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    border: movementType === 'investimento' ? '2px solid #6366f1' : '1px solid var(--border-glass)',
                    background: movementType === 'investimento' ? 'rgba(99, 102, 241, 0.2)' : 'var(--bg-glass)',
                    color: movementType === 'investimento' ? '#818cf8' : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: !isBalancoView ? 'not-allowed' : 'pointer',
                    opacity: !isBalancoView && movementType !== 'investimento' ? 0.4 : 1,
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <PiggyBank size={14} /> Investimento
                </button>
              </div>
            </div>
          )}

          {/* Subtipo de Investimento: Poupança, Património, Outros */}
          {movementType === 'investimento' && (
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ color: 'var(--primary-light)', fontSize: '0.8rem', fontWeight: '700', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>Tipo de Investimento</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {[
                  { id: 'investimento_poupanca', label: 'Poupança', icon: <PiggyBank size={16} />, desc: 'Reserva / Depósitos' },
                  { id: 'investimento_patrimonio', label: 'Património', icon: <Landmark size={16} />, desc: 'Bens / Imóveis' },
                  { id: 'investimento_outros', label: 'Outros', icon: <Sparkles size={16} />, desc: 'ETFs / Fundos / Ações' }
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
                        borderRadius: '10px',
                        border: isSelected ? '2px solid #818cf8' : '1px solid var(--border-glass)',
                        background: isSelected ? 'rgba(99, 102, 241, 0.22)' : 'var(--bg-glass)',
                        color: isSelected ? '#a5b4fc' : 'var(--text-muted)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(99, 102, 241, 0.3)' : 'none'
                      }}
                    >
                      <div style={{ color: isSelected ? '#818cf8' : 'var(--text-dim)' }}>
                        {sub.icon}
                      </div>
                      <span style={{ fontSize: '0.84rem', fontWeight: '800' }}>{sub.label}</span>
                      <span style={{ fontSize: '0.64rem', color: 'var(--text-dim)', textAlign: 'center' }}>{sub.desc}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Título do Movimento */}
          <div className="form-group">
            <label className="form-label">Título do Movimento *</label>
            <input
              type="text"
              className="form-input"
              style={{
                borderColor: currentTheme.border,
                fontSize: '0.95rem',
                fontWeight: '600'
              }}
              placeholder={
                movementType === 'entrada'
                  ? 'Ex: Salário Mensal, Renda de Aluguer, Venda...'
                  : movementType === 'saida'
                  ? 'Ex: Supermercado, Eletricidade, Jantar, Ginásio...'
                  : 'Ex: Aporte ETF Mundial, Depósito Poupança...'
              }
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Campo Especial para Investimentos: Valor Já Investido Anteriormente e Meta a Atingir */}
          {movementType === 'investimento' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '14px' }}>
              {/* Valor Já Investido Anteriormente */}
              <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.08)', border: '1px solid rgba(99, 102, 241, 0.25)', borderRadius: '10px', padding: '12px', margin: 0 }}>
                <label className="form-label" style={{ color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span>Valor Já Investido Anteriormente (€)</span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>Base de Património</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00 (ex: 5000 € já acumulados)"
                    className="form-input"
                    style={{
                      borderColor: 'rgba(99, 102, 241, 0.35)',
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: 'var(--primary-light)',
                      paddingLeft: '28px'
                    }}
                    value={formData.initialInvestedAmount !== undefined ? formData.initialInvestedAmount : ''}
                    onChange={(e) => setFormData({ ...formData, initialInvestedAmount: e.target.value })}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: 'var(--primary-light)' }}>
                    €
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.35' }}>
                  💡 Este valor é contabilizado no <strong>Total Investido</strong> / Património, mas <strong>NÃO</strong> entra como despesa de saída nos gastos mensais.
                </div>
              </div>

              {/* Meta a Ser Atingida (€) */}
              <div className="form-group" style={{ background: 'rgba(139, 92, 246, 0.08)', border: '1px solid rgba(139, 92, 246, 0.25)', borderRadius: '10px', padding: '12px', margin: 0 }}>
                <label className="form-label" style={{ color: '#a78bfa', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={14} />
                    <span>Meta a Ser Atingida (€)</span>
                  </span>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 'normal' }}>Objetivo / Meta</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00 (ex: 20000 € para Reserva / Objetivo)"
                    className="form-input"
                    style={{
                      borderColor: 'rgba(139, 92, 246, 0.35)',
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: '#a78bfa',
                      paddingLeft: '28px'
                    }}
                    value={formData.targetAmount !== undefined ? formData.targetAmount : ''}
                    onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#a78bfa' }}>
                    €
                  </span>
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: '5px', lineHeight: '1.35' }}>
                  🎯 Defina o objetivo financeiro desta poupança para acompanhar a % de progresso atingida.
                </div>
              </div>
            </div>
          )}

          {/* Linha: Valor (€) e Dia do Mês */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">
                {movementType === 'investimento'
                  ? (Number(formData.initialInvestedAmount) > 0 ? 'Aporte do Mês (€)' : 'Aporte do Mês (€) *')
                  : 'Valor Total (€) *'}
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  className="form-input"
                  style={{
                    borderColor: currentTheme.border,
                    fontSize: '1.05rem',
                    fontWeight: '700',
                    color: currentTheme.color,
                    paddingLeft: '28px'
                  }}
                  value={
                    breakdownItems.length > 0
                      ? breakdownItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
                      : (formData.amount !== undefined ? formData.amount : '')
                  }
                  onChange={(e) => {
                    if (breakdownItems.length === 0) {
                      setFormData({ ...formData, amount: e.target.value });
                    }
                  }}
                  readOnly={breakdownItems.length > 0}
                  required={movementType !== 'investimento' || !(Number(formData.initialInvestedAmount) > 0)}
                />
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: currentTheme.color }}>
                  €
                </span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Dia do Mês</label>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  background: 'var(--bg-glass)',
                  border: isDayPickerOpen ? `1px solid ${currentTheme.color}` : '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-sm)',
                  padding: '6px 10px',
                  cursor: 'pointer',
                  height: '42px'
                }}
                onClick={() => setIsDayPickerOpen(!isDayPickerOpen)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Calendar size={15} style={{ color: currentTheme.color }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--text-main)' }}>
                    Dia {formData.dayOfMonth}
                  </span>
                </div>
                <ChevronDown size={14} style={{ color: 'var(--text-muted)', transform: isDayPickerOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
              </div>
            </div>
          </div>

          {/* Grid Popover de Seleção Rápida de Dias (1..31) */}
          {isDayPickerOpen && (
            <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-sm)', padding: '12px', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: '700', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Selecione o Dia de Vencimento
                </span>
                <span style={{ fontSize: '0.72rem', color: currentTheme.color, fontWeight: '800' }}>
                  {format(parseISO(`${yearStr}-${monthStr}-01`), 'MMMM yyyy', { locale: pt })} ({totalDays} dias)
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
                        padding: '6px 0',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? '800' : '600',
                        borderRadius: '4px',
                        border: isSelected ? `2px solid ${currentTheme.color}` : '1px solid var(--border-glass)',
                        background: isSelected ? currentTheme.bgLight : 'var(--bg-glass)',
                        color: isSelected ? currentTheme.color : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)'
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Switch Mudar Subsequentes (Apenas ao Editar Evento Recorrente) */}
          {initialData && (initialData.seriesId || initialData.isRecurring || formData.periodicity === 'recorrente') && (
            <div className="form-group" style={{ margin: '4px 0 14px 0' }}>
              <label
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '0.8rem',
                  fontWeight: '700',
                  color: updateScope === 'subsequent' ? 'var(--primary-light)' : 'var(--text-dim)',
                  cursor: 'pointer',
                  userSelect: 'none',
                  background: updateScope === 'subsequent' ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.04)',
                  border: updateScope === 'subsequent' ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-glass)',
                  borderRadius: '9999px',
                  padding: '5px 12px',
                  transition: 'all 0.15s ease'
                }}
              >
                <span
                  style={{
                    width: '24px',
                    height: '13px',
                    background: updateScope === 'subsequent' ? 'var(--primary)' : 'rgba(148, 163, 184, 0.35)',
                    borderRadius: '9999px',
                    position: 'relative',
                    display: 'inline-block',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <span
                    style={{
                      width: '9px',
                      height: '9px',
                      background: '#fff',
                      borderRadius: '50%',
                      position: 'absolute',
                      top: '2px',
                      left: updateScope === 'subsequent' ? '13px' : '2px',
                      transition: 'left 0.15s ease'
                    }}
                  />
                </span>
                <input
                  type="checkbox"
                  checked={updateScope === 'subsequent'}
                  onChange={(e) => setUpdateScope(e.target.checked ? 'subsequent' : 'single')}
                  style={{ display: 'none' }}
                />
                <span>Mudar subsequentes</span>
              </label>
            </div>
          )}

          {/* Periodicidade: Seletor de Único, Recorrente, Período */}
          {!initialData && (
            <div className="form-group" style={{ marginBottom: '14px' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Periodicidade do Movimento</span>
                {formData.periodicity === 'periodo' && (
                  <span style={{ fontSize: '0.72rem', color: currentTheme.color, fontWeight: '700' }}>
                    Com data de término
                  </span>
                )}
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, periodicity: 'unica' })}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: formData.periodicity === 'unica' ? `2px solid ${currentTheme.color}` : '1px solid var(--border-glass)',
                    background: formData.periodicity === 'unica' ? currentTheme.bgLight : 'var(--bg-glass)',
                    color: formData.periodicity === 'unica' ? currentTheme.color : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Zap size={15} />
                  <span>Único</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, periodicity: 'recorrente' })}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: formData.periodicity === 'recorrente' ? `2px solid ${currentTheme.color}` : '1px solid var(--border-glass)',
                    background: formData.periodicity === 'recorrente' ? currentTheme.bgLight : 'var(--bg-glass)',
                    color: formData.periodicity === 'recorrente' ? currentTheme.color : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Repeat size={15} />
                  <span>Recorrente</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const fallbackEnd = format(addMonths(parseISO(formData.date || '2026-08-21'), 6), 'yyyy-MM');
                    setFormData({
                      ...formData,
                      periodicity: 'periodo',
                      recurrenceEndDate: formData.recurrenceEndDate || fallbackEnd
                    });
                  }}
                  style={{
                    padding: '8px 6px',
                    borderRadius: 'var(--radius-sm)',
                    border: formData.periodicity === 'periodo' ? `2px solid ${currentTheme.color}` : '1px solid var(--border-glass)',
                    background: formData.periodicity === 'periodo' ? currentTheme.bgLight : 'var(--bg-glass)',
                    color: formData.periodicity === 'periodo' ? currentTheme.color : 'var(--text-muted)',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    cursor: 'pointer',
                    transition: 'all var(--transition-fast)'
                  }}
                >
                  <Calendar size={15} />
                  <span>Período</span>
                </button>
              </div>

              {/* Se for Período: Campo Mês de Fim */}
              {formData.periodicity === 'periodo' && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '12px',
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: `1px solid ${currentTheme.border}`,
                    borderRadius: 'var(--radius-sm)'
                  }}
                >
                  <label className="form-label" style={{ color: currentTheme.color, fontSize: '0.78rem', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={13} />
                    <span>Mês de Fim do Período</span>
                  </label>
                  <input
                    type="month"
                    className="form-input"
                    style={{
                      borderColor: currentTheme.border,
                      fontWeight: '700',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem'
                    }}
                    min={(formData.date || '2026-08').substring(0, 7)}
                    value={formData.recurrenceEndDate || ''}
                    onChange={(e) => setFormData({ ...formData, recurrenceEndDate: e.target.value })}
                    required={formData.periodicity === 'periodo'}
                  />
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: '5px', lineHeight: 1.3 }}>
                    O evento será gerado todos os meses desde <strong>{(formData.date || '2026-08').substring(0, 7)}</strong> até <strong>{formData.recurrenceEndDate || '...'}</strong>.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Estado Inicial (Apenas na Criação) */}
          {!initialData && (
            <div className="form-group">
              <label className="form-label">Estado Inicial</label>
              <select
                className="form-select"
                style={{
                  color: formData.status === 'Recebido' || formData.status === 'Pago' || formData.status === 'Investido' ? currentTheme.color : 'var(--text-main)',
                  fontWeight: '700'
                }}
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                {currentTheme.statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Desmembramento em Subpartes (Opcional) */}
          <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: breakdownItems.length > 0 ? '10px' : '0' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Subpartes {breakdownItems.length > 0 && `(${breakdownItems.length})`}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (breakdownItems.length === 0) {
                    const curVal = parseFloat(formData.amount) || 0;
                    setBreakdownItems([
                      { id: generateUUID(), name: 'Parte 1', amount: curVal || 0 }
                    ]);
                  } else {
                    setBreakdownItems([
                      ...breakdownItems,
                      { id: generateUUID(), name: `Parte ${breakdownItems.length + 1}`, amount: 0 }
                    ]);
                  }
                }}
                style={{
                  background: currentTheme.bgLight,
                  border: `1px solid ${currentTheme.border}`,
                  borderRadius: '4px',
                  color: currentTheme.color,
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Plus size={12} /> {breakdownItems.length === 0 ? 'Dividir em Subpartes' : 'Adicionar Subparte'}
              </button>
            </div>

            {breakdownItems.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {breakdownItems.map((item, idx) => (
                  <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 28px', gap: '8px', alignItems: 'center' }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                      placeholder={`Nome da parte ${idx + 1}`}
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
                      <span style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: currentTheme.color }}>
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
                      title="Remover subparte"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Etiquetas */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Etiquetas / Categorias</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Fixo, Alimentação, Habitação, Poupança"
              value={formData.labelsInput}
              onChange={(e) => setFormData({ ...formData, labelsInput: e.target.value })}
            />
          </div>

          {/* Modal Footer */}
          <div className="form-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: currentTheme.color,
                borderColor: currentTheme.color,
                boxShadow: `0 4px 14px ${currentTheme.bgGlow}`,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: '700'
              }}
            >
              <Sparkles size={16} />
              <span>{initialData ? 'Salvar Alterações' : `Criar ${currentTheme.textTitle}`}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
