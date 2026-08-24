import React, { useState, useEffect } from 'react';
import {
  X,
  Plus,
  Trash2,
  Calendar,
  Clock,
  DollarSign,
  ShoppingCart,
  PiggyBank,
  Repeat,
  Sparkles,
  Lock
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

  // 1. Tipo de Movimento: 'entrada' | 'saida' | 'investimento'
  const [movementType, setMovementType] = useState(() => {
    if (activeFinancialTab === 'gastos' || defaultNature === 'expense') return 'saida';
    if (activeFinancialTab === 'investimentos' || defaultNature === 'investment') return 'investimento';
    return 'entrada';
  });

  const [breakdownItems, setBreakdownItems] = useState([]);

  // Base Form State
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 1,
    time: '09:00',
    status: 'Previsto',
    periodicity: 'recorrente', // 'recorrente' | 'unica'
    amount: 100,
    priority: 'Normal',
    labelsInput: ''
  });

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

      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || (initType === 'entrada' ? 'Previsto' : initType === 'saida' ? 'Pendente' : 'Planeado'),
        periodicity: isRecurrent ? 'recorrente' : 'unica',
        amount: initialData.amount !== undefined ? initialData.amount : 100,
        priority: initialData.priority || 'Normal',
        labelsInput: initialData.labels ? initialData.labels.join(', ') : ''
      });
      setBreakdownItems(initialData.breakdownItems ? JSON.parse(JSON.stringify(initialData.breakdownItems)) : []);
    } else {
      // Determine initial movement type based on context
      let initialMovement = 'entrada';
      if (activeFinancialTab === 'gastos' || defaultNature === 'expense') {
        initialMovement = 'saida';
      } else if (activeFinancialTab === 'investimentos' || defaultNature === 'investment') {
        initialMovement = 'investimento';
      }

      setMovementType(initialMovement);

      let initTitle = 'Salário';
      let initAmt = 3300;
      let initStatus = 'Previsto'; // A receber por default
      let initLabels = 'Salário, A Receber';

      if (initialMovement === 'saida') {
        initTitle = 'Alimentação & Supermercado';
        initAmt = 250;
        initStatus = 'Pendente';
        initLabels = 'Gastos, Supermercado';
      } else if (initialMovement === 'investimento') {
        initTitle = 'Aporte Poupança / Reserva';
        initAmt = 350;
        initStatus = 'Planeado';
        initLabels = 'Poupança, Reserva';
      }

      setFormData({
        title: initTitle,
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '09:00',
        status: initStatus,
        periodicity: 'recorrente',
        amount: initAmt,
        priority: 'Normal',
        labelsInput: initLabels
      });
      setBreakdownItems([]);
    }
  }, [initialData, defaultDate, defaultNature, activeFinancialTab, isOpen]);

  if (!isOpen) return null;

  // Extract year & month from selected date
  let yearStr = '2026';
  let monthStr = '08';
  try {
    const pDate = parseISO(formData.date);
    yearStr = format(pDate, 'yyyy');
    monthStr = format(pDate, 'MM');
  } catch (e) { }

  // Theme styling configuration based on movementType
  const themeConfig = {
    entrada: {
      color: '#10b981',
      bgLight: 'rgba(16, 185, 129, 0.12)',
      bgGlow: 'rgba(16, 185, 129, 0.25)',
      border: 'rgba(16, 185, 129, 0.35)',
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
      border: 'rgba(244, 63, 94, 0.35)',
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
      border: 'rgba(99, 102, 241, 0.35)',
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
    if (!isBalancoView) return; // Locked if not coming from Balanço
    setMovementType(typeKey);
    let newTitle = formData.title;
    let newAmt = formData.amount;
    let newStatus = formData.status;
    let newLabels = formData.labelsInput;

    if (typeKey === 'entrada') {
      newTitle = 'Salário';
      newAmt = 3300;
      newStatus = 'Previsto';
      newLabels = 'Salário, A Receber';
    } else if (typeKey === 'saida') {
      newTitle = 'Alimentação & Supermercado';
      newAmt = 250;
      newStatus = 'Pendente';
      newLabels = 'Gastos, Supermercado';
    } else if (typeKey === 'investimento') {
      newTitle = 'Aporte Poupança / Reserva';
      newAmt = 350;
      newStatus = 'Planeado';
      newLabels = 'Poupança, Reserva';
    }

    setFormData({
      ...formData,
      title: newTitle,
      amount: newAmt,
      status: newStatus,
      labelsInput: newLabels
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
      finalCategory = formData.periodicity === 'recorrente' ? 'entrada_recorrente' : 'entrada_esporadica';
      finalStatus = formData.status || 'Previsto';
    } else if (movementType === 'saida') {
      isExpense = true;
      finalCategory = formData.periodicity === 'recorrente' ? 'saida_recorrente' : 'saida_esporadica';
      finalStatus = formData.status || 'Pendente';
    } else if (movementType === 'investimento') {
      isInvestment = true;
      finalCategory = formData.periodicity === 'recorrente' ? 'investimento_poupanca' : 'investimento_extra';
      finalStatus = formData.status || 'Planeado';
    }

    const isCompleted = finalStatus === 'Recebido' || finalStatus === 'Pago' || finalStatus === 'Investido';

    onSave({
      ...formData,
      title: formData.title.trim(),
      date: finalDateStr,
      category: finalCategory,
      financialType: movementType === 'saida' ? 'gasto' : movementType === 'investimento' ? 'investimento' : 'entrada',
      isIncome,
      isExpense,
      isInvestment,
      status: finalStatus,
      amount: breakdownItems.length > 0
        ? breakdownItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
        : Number(formData.amount) || 0,
      breakdownItems: breakdownItems.length > 0 ? breakdownItems : undefined,
      labels,
      isCompleted
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
          background: 'var(--bg-card, #1c2033)',
          border: `1px solid ${currentTheme.border}`,
          borderRadius: '16px',
          boxShadow: `0 24px 60px rgba(0, 0, 0, 0.45), 0 0 35px ${currentTheme.bgGlow}`,
          overflow: 'hidden',
          padding: 0
        }}
      >
        {/* Header com estilo correspondente ao tipo */}
        <div
          className="modal-header"
          style={{
            margin: 0,
            padding: '16px 20px',
            borderBottom: `1px solid ${currentTheme.border}`,
            background: `linear-gradient(180deg, ${currentTheme.bgLight} 0%, transparent 100%)`
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '9px',
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
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)', fontWeight: '800' }}>
                {initialData ? `Editar ${currentTheme.textTitle}` : `Novo(a) ${currentTheme.textTitle}`}
              </h3>
              <p style={{ margin: 0, fontSize: '0.8rem', color: currentTheme.color, fontWeight: '700' }}>
                {format(parseISO(`${yearStr}-${monthStr}-01`), 'MMMM yyyy', { locale: pt }).toUpperCase()}
              </p>
            </div>
          </div>
          <button type="button" className="btn-icon" onClick={onClose} aria-label="Fechar">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px' }}>
            
            {/* Seletor de Tipo de Movimento (Sempre visível, disabled quando não vier do Balanço) */}
            <div className="form-group" style={{ marginBottom: '2px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label className="form-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Tipo de Movimento
                </label>
                {!isBalancoView && (
                  <span style={{ fontSize: '0.72rem', color: currentTheme.color, fontWeight: '700', display: 'flex', alignItems: 'center', gap: '4px' }}>
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
                    borderRadius: '8px',
                    border: movementType === 'entrada' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                    background: movementType === 'entrada' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: movementType === 'entrada' ? '#10b981' : 'var(--text-muted)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: !isBalancoView ? 'not-allowed' : 'pointer',
                    opacity: !isBalancoView && movementType !== 'entrada' ? 0.35 : 1,
                    transition: 'all 0.15s ease'
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
                    borderRadius: '8px',
                    border: movementType === 'saida' ? '2px solid #f43f5e' : '1px solid var(--border-glass)',
                    background: movementType === 'saida' ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: movementType === 'saida' ? '#f43f5e' : 'var(--text-muted)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: !isBalancoView ? 'not-allowed' : 'pointer',
                    opacity: !isBalancoView && movementType !== 'saida' ? 0.35 : 1,
                    transition: 'all 0.15s ease'
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
                    borderRadius: '8px',
                    border: movementType === 'investimento' ? '2px solid #6366f1' : '1px solid var(--border-glass)',
                    background: movementType === 'investimento' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                    color: movementType === 'investimento' ? '#818cf8' : 'var(--text-muted)',
                    fontWeight: '800',
                    fontSize: '0.8rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: !isBalancoView ? 'not-allowed' : 'pointer',
                    opacity: !isBalancoView && movementType !== 'investimento' ? 0.35 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <PiggyBank size={14} /> Investimento
                </button>
              </div>
            </div>

            {/* Título do Movimento */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                Título / Descrição do Movimento *
              </label>
              <input
                type="text"
                className="form-control"
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

            {/* Linha: Valor (€) e Dia do Mês */}
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                  Valor Total (€) *
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    style={{
                      borderColor: currentTheme.border,
                      fontSize: '1.1rem',
                      fontWeight: '800',
                      color: currentTheme.color,
                      paddingLeft: '28px'
                    }}
                    value={
                      breakdownItems.length > 0
                        ? breakdownItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0)
                        : formData.amount
                    }
                    onChange={(e) => {
                      if (breakdownItems.length === 0) {
                        setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 });
                      }
                    }}
                    readOnly={breakdownItems.length > 0}
                    required
                  />
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: currentTheme.color }}>
                    €
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                  Dia do Mês
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-control"
                    style={{ fontWeight: '700' }}
                    value={formData.dayOfMonth}
                    onChange={(e) => setFormData({ ...formData, dayOfMonth: parseInt(e.target.value) || 1 })}
                    required
                  />
                  <span style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    de {format(parseISO(`${yearStr}-${monthStr}-01`), 'MMMM', { locale: pt })}
                  </span>
                </div>
              </div>
            </div>

            {/* Linha: Periodicidade e Status */}
            <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              {/* Periodicidade */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                  Periodicidade
                </label>
                <select
                  className="form-select"
                  value={formData.periodicity}
                  onChange={(e) => setFormData({ ...formData, periodicity: e.target.value })}
                >
                  <option value="recorrente">🔁 Mensal (Recorrente)</option>
                  <option value="unica">⚡ Pontual (Mês Atual)</option>
                </select>
              </div>

              {/* Status */}
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: '700', fontSize: '0.85rem' }}>
                  Estado
                </label>
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
            </div>

            {/* Desmembramento em Subpartes (Opcional) */}
            <div style={{ marginTop: '2px', padding: '12px', borderRadius: '8px', background: 'rgba(255, 255, 255, 0.03)', border: '1px solid var(--border-glass)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: breakdownItems.length > 0 ? '10px' : '0' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-muted)' }}>
                  Desmembramento em Subpartes {breakdownItems.length > 0 && `(${breakdownItems.length})`}
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
                    borderRadius: '6px',
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {breakdownItems.map((item, idx) => (
                    <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 28px', gap: '8px', alignItems: 'center' }}>
                      <input
                        type="text"
                        className="form-control"
                        style={{ padding: '5px 8px', fontSize: '0.82rem' }}
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
                          className="form-control"
                          style={{ padding: '5px 8px', fontSize: '0.82rem', fontWeight: '700', paddingLeft: '20px' }}
                          value={item.amount}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setBreakdownItems((prev) => prev.map((it, i) => (i === idx ? { ...it, amount: val } : it)));
                          }}
                        />
                        <span style={{ position: 'absolute', left: '6px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.75rem', color: currentTheme.color }}>
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

            {/* Etiquetas (Tags) */}
            <div className="form-group">
              <label className="form-label" style={{ fontWeight: '700', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Etiquetas / Categorias (separadas por vírgula)
              </label>
              <input
                type="text"
                className="form-control"
                style={{ fontSize: '0.85rem' }}
                placeholder="Ex: Fixo, Alimentação, Habitação, Poupança"
                value={formData.labelsInput}
                onChange={(e) => setFormData({ ...formData, labelsInput: e.target.value })}
              />
            </div>

          </div>

          <div
            className="modal-footer"
            style={{
              margin: 0,
              padding: '14px 20px',
              borderTop: `1px solid ${currentTheme.border}`,
              background: 'rgba(0, 0, 0, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: '10px'
            }}
          >
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
                fontWeight: '800'
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
