import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Plus,
  Trash2,
  CheckCircle,
  Tag,
  Repeat,
  Pin,
  BookOpen,
  DollarSign,
  Gift,
  Zap,
  Clock,
  Briefcase,
  ShoppingBag,
  ShoppingCart,
  PiggyBank,
  Sparkles,
  CreditCard,
  HeartHandshake,
  FileText,
  Home,
  Car,
  Layers,
  TrendingUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../utils/loanCalculations';

export default function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline,
  allTimelines = [],
  defaultNature = 'income'
}) {
  const isFinancialTimeline = timeline?.type === 'Entradas' || timeline?.type === 'Financeiro' || timeline?.id === 'tl-income';
  
  // 1. Tipo de Movimento: 'entrada' | 'saida' | 'investimento'
  const [movementType, setMovementType] = useState('entrada');

  // Base state
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 27,
    time: '10:00',
    status: 'Previsto',
    periodicity: 'recorrente', // 'unica' | 'recorrente'
    subtype: 'rendimentos',
    selectedLoanId: '',
    category: 'entrada_recorrente',
    priority: 'Normal',
    amount: 3300,
    description: '',
    author: 'Igor Matos',
    labelsInput: '',
    tasks: []
  });

  // Empréstimos ativos disponíveis na plataforma
  const activeLoans = (allTimelines || []).filter((tl) => tl.type === 'Empréstimo');

  useEffect(() => {
    const todayStr = '2026-08-21';
    const targetDate = initialData?.date || defaultDate || todayStr;

    let parsedDay = 27;
    try {
      const d = parseISO(targetDate);
      if (!isNaN(d.getDate())) {
        parsedDay = d.getDate();
      }
    } catch (e) {
      parsedDay = 27;
    }

    if (initialData) {
      let initType = 'entrada';
      if (initialData.isExpense || initialData.financialType === 'gasto' || (initialData.category && initialData.category.startsWith('saida')) || initialData.category === 'gasto') {
        initType = 'saida';
      } else if (initialData.isInvestment || initialData.financialType === 'investimento' || (initialData.category && initialData.category.startsWith('investimento'))) {
        initType = 'investimento';
      }

      setMovementType(initType);
      const isRecurrent = initialData.category === 'entrada_recorrente' || initialData.category === 'saida_recorrente' || initialData.category === 'investimento_poupanca';

      setFormData({
        ...initialData,
        dayOfMonth: parsedDay,
        amount: initialData.amount !== undefined ? initialData.amount : (initType === 'entrada' ? 3300 : initType === 'saida' ? 150 : 350),
        periodicity: isRecurrent ? 'recorrente' : 'unica',
        subtype: initialData.subtype || (initType === 'entrada' ? 'rendimentos' : initType === 'saida' ? 'compra' : 'aporte'),
        selectedLoanId: initialData.loanTimelineId || '',
        category: initialData.category || (initType === 'saida' ? 'saida_recorrente' : initType === 'investimento' ? 'investimento_poupanca' : 'entrada_recorrente'),
        labelsInput: initialData.labels ? initialData.labels.join(', ') : '',
        tasks: initialData.tasks || []
      });
    } else {
      const isPast = targetDate <= todayStr;
      const initialMovement = defaultNature === 'expense' ? 'saida' : defaultNature === 'investment' ? 'investimento' : 'entrada';
      setMovementType(initialMovement);

      let initTitle = 'Salário Mensal';
      let initAmt = 3300;
      let initCat = 'entrada_recorrente';
      let initSubtype = 'rendimentos';
      let initStatus = isPast ? 'Recebido' : 'Previsto';
      let initLabels = isPast ? 'Salário, Recebido' : 'Salário, Previsto';

      if (initialMovement === 'saida') {
        initTitle = 'Alimentação & Supermercado';
        initAmt = 380;
        initCat = 'saida_esporadica';
        initSubtype = 'compra';
        initStatus = isPast ? 'Pago' : 'Pendente';
        initLabels = 'Gastos, Supermercado';
      } else if (initialMovement === 'investimento') {
        initTitle = 'Aporte Poupança / Reserva';
        initAmt = 350;
        initCat = 'investimento_poupanca';
        initSubtype = 'aporte';
        initStatus = isPast ? 'Investido' : 'Planeado';
        initLabels = 'Poupança, Reserva';
      }

      setFormData({
        title: isFinancialTimeline ? initTitle : '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '10:00',
        status: isFinancialTimeline ? initStatus : 'Em Progresso',
        periodicity: initialMovement === 'saida' ? 'unica' : 'recorrente',
        subtype: initSubtype,
        selectedLoanId: '',
        category: isFinancialTimeline ? initCat : 'agendamento',
        priority: 'Normal',
        amount: isFinancialTimeline ? initAmt : 0,
        description: '',
        author: 'Igor Matos',
        labelsInput: isFinancialTimeline ? initLabels : '',
        tasks: []
      });
    }
  }, [initialData, defaultDate, isOpen, isFinancialTimeline, defaultNature]);

  if (!isOpen) return null;

  // Extract Year and Month from current target date
  let monthYearLabel = 'Agosto de 2026';
  let yearStr = '2026';
  let monthStr = '08';
  try {
    const d = parseISO(formData.date || '2026-08-21');
    if (!isNaN(d.getTime())) {
      monthYearLabel = format(d, "MMMM 'de' yyyy", { locale: pt });
      yearStr = format(d, 'yyyy');
      monthStr = format(d, 'MM');
    }
  } catch (e) { }

  // 1. Trocar Tipo de Movimento (Entrada vs Saída vs Investimento)
  const handleSelectMovementType = (type) => {
    setMovementType(type);
    let defaultPeriodicity = type === 'saida' ? 'unica' : 'recorrente';
    let defaultSubtype = type === 'entrada' ? 'rendimentos' : type === 'saida' ? 'compra' : 'aporte';
    let defaultTitle = formData.title;
    let defaultAmt = formData.amount;
    let defaultCat = 'entrada_recorrente';
    let defaultLabels = 'Salário';

    if (type === 'entrada') {
      defaultTitle = 'Salário Mensal';
      defaultAmt = 3300;
      defaultCat = defaultPeriodicity === 'recorrente' ? 'entrada_recorrente' : 'entrada_esporadica';
      defaultLabels = 'Salário, Rendimento';
    } else if (type === 'saida') {
      defaultTitle = 'Alimentação & Supermercado';
      defaultAmt = 380;
      defaultCat = defaultPeriodicity === 'recorrente' ? 'saida_recorrente' : 'saida_esporadica';
      defaultLabels = 'Gastos, Compras';
    } else if (type === 'investimento') {
      defaultTitle = 'Aporte ETF Mundial (VWCE)';
      defaultAmt = 250;
      defaultCat = defaultPeriodicity === 'recorrente' ? 'investimento_poupanca' : 'investimento_extra';
      defaultLabels = 'Investimentos, ETFs';
    }

    setFormData({
      ...formData,
      periodicity: defaultPeriodicity,
      subtype: defaultSubtype,
      selectedLoanId: '',
      title: defaultTitle,
      amount: defaultAmt,
      category: defaultCat,
      labelsInput: defaultLabels
    });
  };

  // 2. Trocar Periodicidade (Única vs Recorrente)
  const handleSelectPeriodicity = (p) => {
    let cat = formData.category;
    let defaultSub = formData.subtype;

    if (movementType === 'entrada') {
      cat = p === 'recorrente' ? 'entrada_recorrente' : 'entrada_esporadica';
      defaultSub = p === 'recorrente' ? 'rendimentos' : 'ganhos';
    } else if (movementType === 'saida') {
      cat = p === 'recorrente' ? 'saida_recorrente' : 'saida_esporadica';
      defaultSub = p === 'recorrente' ? 'despesas_fixas' : 'compra';
    } else if (movementType === 'investimento') {
      cat = p === 'recorrente' ? 'investimento_poupanca' : 'investimento_extra';
      defaultSub = 'aporte';
    }

    setFormData({
      ...formData,
      periodicity: p,
      subtype: defaultSub,
      category: cat
    });
  };

  // 3. Trocar Subtipo
  const handleSelectSubtype = (stKey) => {
    let newTitle = formData.title;
    let newAmt = formData.amount;
    let newLabels = formData.labelsInput;
    let selectedLoan = '';

    if (movementType === 'entrada') {
      if (stKey === 'rendimentos') {
        newTitle = 'Salário Mensal';
        newAmt = 3300;
        newLabels = 'Salário, Rendimento';
      } else if (stKey === 'rendas') {
        newTitle = 'Renda de Imóvel / Aluguer';
        newAmt = 750;
        newLabels = 'Rendas, Imobiliário';
      } else if (stKey === 'ganhos') {
        newTitle = 'Bónus de Desempenho';
        newAmt = 1500;
        newLabels = 'Ganhos, Bónus';
      } else if (stKey === 'vendas') {
        newTitle = 'Venda de Ativo / Bem';
        newAmt = 800;
        newLabels = 'Vendas';
      } else if (stKey === 'outros') {
        newTitle = formData.periodicity === 'recorrente' ? 'Outro Rendimento Recorrente' : 'Outra Entrada Extra';
        newAmt = 500;
        newLabels = 'Outros, Extra';
      }
    } else if (movementType === 'investimento') {
      if (stKey === 'aporte') {
        newTitle = formData.periodicity === 'recorrente' ? 'Aporte Mensal ETF Mundial (VWCE)' : 'Aporte Extraordinário';
        newAmt = 250;
        newLabels = 'Investimentos, ETFs';
      } else if (stKey === 'deposito') {
        newTitle = formData.periodicity === 'recorrente' ? 'Depósito Poupança / Reserva' : 'Depósito Pontual';
        newAmt = 350;
        newLabels = 'Poupança, Reserva';
      } else if (stKey === 'outros') {
        newTitle = 'Outro Investimento / Ativo';
        newAmt = 200;
        newLabels = 'Investimentos, Outros';
      }
    } else if (movementType === 'saida') {
      if (stKey === 'compra') {
        newTitle = 'Alimentação & Supermercado';
        newAmt = 380;
        newLabels = 'Alimentação, Supermercado';
      } else if (stKey === 'pagamento') {
        newTitle = 'Pagamento de Fatura / Serviços';
        newAmt = 145;
        newLabels = 'Pagamentos, Utilities';
      } else if (stKey === 'doacao') {
        newTitle = 'Doação / Apoio Social';
        newAmt = 50;
        newLabels = 'Doação, Solidariedade';
      } else if (stKey === 'despesas_fixas') {
        newTitle = 'Habitação & Condomínio';
        newAmt = 650;
        newLabels = 'Despesas Fixas, Habitação';
      } else if (stKey === 'subscricao') {
        newTitle = 'Subscrições & Software';
        newAmt = 35;
        newLabels = 'Subscrições, Serviços';
      } else if (stKey === 'emprestimo') {
        if (activeLoans.length > 0) {
          const firstLoan = activeLoans[0];
          selectedLoan = firstLoan.id;
          newTitle = `Prestação ${firstLoan.name}`;
          newAmt = Number(firstLoan.installmentAmount || 203.50);
          newLabels = `Empréstimo, ${firstLoan.name}`;
        } else {
          newTitle = 'Prestação de Empréstimo';
          newAmt = 203.50;
          newLabels = 'Empréstimo, Prestação';
        }
      } else if (stKey === 'outro') {
        newTitle = 'Outro Gasto / Despesa';
        newAmt = 90;
        newLabels = 'Outros, Despesas';
      }
    }

    setFormData({
      ...formData,
      subtype: stKey,
      selectedLoanId: selectedLoan,
      title: newTitle,
      amount: newAmt,
      labelsInput: newLabels
    });
  };

  // 4. Selecionar Empréstimo específico
  const handleSelectLoan = (loanId) => {
    const selected = activeLoans.find((l) => l.id === loanId);
    if (selected) {
      setFormData({
        ...formData,
        selectedLoanId: selected.id,
        title: `Prestação ${selected.name}`,
        amount: Number(selected.installmentAmount || 203.50),
        labelsInput: `Empréstimo, ${selected.name}`
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const safeDay = Math.min(31, Math.max(1, Number(formData.dayOfMonth) || 1));
    const safeDayStr = safeDay.toString().padStart(2, '0');
    const finalDateStr = isFinancialTimeline
      ? `${yearStr}-${monthStr}-${safeDayStr}`
      : formData.date;

    const labels = formData.labelsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const isPast = finalDateStr <= '2026-08-21';

    let finalCategory = 'entrada_recorrente';
    let isIncome = false;
    let isExpense = false;
    let isInvestment = false;
    let finalStatus = formData.status;

    if (movementType === 'entrada') {
      isIncome = true;
      finalCategory = formData.periodicity === 'recorrente' ? 'entrada_recorrente' : 'entrada_esporadica';
      finalStatus = isPast ? 'Recebido' : 'Previsto';
    } else if (movementType === 'saida') {
      isExpense = true;
      finalCategory = formData.periodicity === 'recorrente' ? 'saida_recorrente' : 'saida_esporadica';
      finalStatus = isPast ? 'Pago' : 'Pendente';
    } else if (movementType === 'investimento') {
      isInvestment = true;
      finalCategory = formData.periodicity === 'recorrente' ? 'investimento_poupanca' : 'investimento_extra';
      finalStatus = isPast ? 'Investido' : 'Planeado';
    }

    onSave({
      ...formData,
      date: finalDateStr,
      category: isFinancialTimeline ? finalCategory : formData.category,
      financialType: movementType === 'saida' ? 'gasto' : movementType === 'investimento' ? 'investimento' : 'entrada',
      isIncome,
      isExpense,
      isInvestment,
      loanTimelineId: formData.subtype === 'emprestimo' ? formData.selectedLoanId : undefined,
      subtype: formData.subtype,
      status: isFinancialTimeline ? finalStatus : formData.status,
      amount: isFinancialTimeline ? Number(formData.amount) || 0 : undefined,
      labels,
      isCompleted: isPast
    });

    onClose();
  };

  const isEditing = Boolean(initialData && initialData.id);

  // Lista dinâmica de subtipos para exibição
  const getSubtypeOptions = () => {
    if (movementType === 'entrada') {
      if (formData.periodicity === 'recorrente') {
        return [
          { id: 'rendimentos', name: 'Salário / Rendimento', icon: <Briefcase size={16} />, color: '#10b981' },
          { id: 'rendas', name: 'Rendas de Imóveis', icon: <Home size={16} />, color: '#06b6d4' },
          { id: 'outros', name: 'Outros Rendimentos', icon: <Sparkles size={16} />, color: '#8b5cf6' }
        ];
      }
      return [
        { id: 'ganhos', name: 'Bónus / Subsídio', icon: <Gift size={16} />, color: '#10b981' },
        { id: 'vendas', name: 'Venda de Ativo', icon: <ShoppingBag size={16} />, color: '#06b6d4' },
        { id: 'outros', name: 'Outra Entrada Extra', icon: <Sparkles size={16} />, color: '#8b5cf6' }
      ];
    }
    if (movementType === 'investimento') {
      return [
        { id: 'aporte', name: 'Aporte (ETFs / Ações)', icon: <TrendingUp size={16} />, color: '#6366f1' },
        { id: 'deposito', name: 'Depósito (Poupança)', icon: <PiggyBank size={16} />, color: '#10b981' },
        { id: 'outros', name: 'Outro Investimento', icon: <Sparkles size={16} />, color: '#8b5cf6' }
      ];
    }
    // Saída
    if (formData.periodicity === 'unica') {
      return [
        { id: 'compra', name: 'Compra / Mercado', icon: <ShoppingCart size={16} />, color: '#f43f5e' },
        { id: 'pagamento', name: 'Pagamento / Fatura', icon: <CreditCard size={16} />, color: '#f59e0b' },
        { id: 'doacao', name: 'Doação', icon: <HeartHandshake size={16} />, color: '#ec4899' },
        { id: 'emprestimo', name: 'Empréstimo', icon: <Home size={16} />, color: '#6366f1' },
        { id: 'outro', name: 'Outro Gasto', icon: <Tag size={16} />, color: '#94a3b8' }
      ];
    }
    return [
      { id: 'despesas_fixas', name: 'Despesa Fixa', icon: <Home size={16} />, color: '#f43f5e' },
      { id: 'subscricao', name: 'Subscrição', icon: <Repeat size={16} />, color: '#f59e0b' },
      { id: 'emprestimo', name: 'Empréstimo', icon: <Home size={16} />, color: '#6366f1' },
      { id: 'outro', name: 'Outro Gasto', icon: <Tag size={16} />, color: '#94a3b8' }
    ];
  };

  const subtypeOptions = getSubtypeOptions();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {movementType === 'entrada' ? (
              <DollarSign size={20} style={{ color: '#10b981' }} />
            ) : movementType === 'saida' ? (
              <ShoppingCart size={20} style={{ color: '#f43f5e' }} />
            ) : (
              <PiggyBank size={20} style={{ color: '#6366f1' }} />
            )}
            <h2 className="modal-title">
              {isEditing ? 'Editar Movimento Financeiro' : 'Novo Movimento Financeiro'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {isFinancialTimeline ? (
            <>
              {/* 1. Descrição / Título no Topo */}
              <div className="form-group">
                <label className="form-label">Descrição / Título do Movimento *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Salário Mensal, Supermercado, Aporte ETF..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* 2. Seleção do Tipo de Movimento (Entrada, Saída, Investimento) */}
              <div className="form-group">
                <label className="form-label">Tipo de Movimento *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  {/* Entrada */}
                  <button
                    type="button"
                    onClick={() => handleSelectMovementType('entrada')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: movementType === 'entrada' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                      background: movementType === 'entrada' ? 'rgba(16, 185, 129, 0.16)' : 'rgba(255, 255, 255, 0.02)',
                      color: movementType === 'entrada' ? '#10b981' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.84rem',
                      fontWeight: '800',
                      transition: 'all 0.2s'
                    }}
                  >
                    <DollarSign size={16} />
                    <span>Entrada</span>
                  </button>

                  {/* Saída */}
                  <button
                    type="button"
                    onClick={() => handleSelectMovementType('saida')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: movementType === 'saida' ? '2px solid #f43f5e' : '1px solid var(--border-glass)',
                      background: movementType === 'saida' ? 'rgba(244, 63, 94, 0.16)' : 'rgba(255, 255, 255, 0.02)',
                      color: movementType === 'saida' ? '#f43f5e' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.84rem',
                      fontWeight: '800',
                      transition: 'all 0.2s'
                    }}
                  >
                    <ShoppingCart size={16} />
                    <span>Saída</span>
                  </button>

                  {/* Investimento */}
                  <button
                    type="button"
                    onClick={() => handleSelectMovementType('investimento')}
                    style={{
                      padding: '10px 8px',
                      borderRadius: '8px',
                      border: movementType === 'investimento' ? '2px solid #6366f1' : '1px solid var(--border-glass)',
                      background: movementType === 'investimento' ? 'rgba(99, 102, 241, 0.16)' : 'rgba(255, 255, 255, 0.02)',
                      color: movementType === 'investimento' ? 'var(--primary-light)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.84rem',
                      fontWeight: '800',
                      transition: 'all 0.2s'
                    }}
                  >
                    <PiggyBank size={16} />
                    <span>Investimento</span>
                  </button>
                </div>
              </div>

              {/* 3. Periodicidade: Única vs Recorrente */}
              <div className="form-group">
                <label className="form-label">Periodicidade *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => handleSelectPeriodicity('unica')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: formData.periodicity === 'unica' ? '2px solid var(--primary-light)' : '1px solid var(--border-glass)',
                      background: formData.periodicity === 'unica' ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: formData.periodicity === 'unica' ? 'var(--primary-light)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Zap size={14} />
                    <span>Única</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSelectPeriodicity('recorrente')}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '8px',
                      border: formData.periodicity === 'recorrente' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                      background: formData.periodicity === 'recorrente' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                      color: formData.periodicity === 'recorrente' ? '#10b981' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      fontSize: '0.82rem',
                      fontWeight: '700',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Repeat size={14} />
                    <span>Recorrente</span>
                  </button>
                </div>
              </div>

              {/* 4. Subtipo / Categoria do Movimento */}
              <div className="form-group">
                <label className="form-label">Subtipo de Operação *</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: subtypeOptions.length > 3 ? 'repeat(auto-fit, minmax(130px, 1fr))' : `repeat(${subtypeOptions.length}, 1fr)`,
                    gap: '8px',
                    marginTop: '4px'
                  }}
                >
                  {subtypeOptions.map((opt) => {
                    const isSelected = formData.subtype === opt.id;
                    return (
                      <div
                        key={opt.id}
                        onClick={() => handleSelectSubtype(opt.id)}
                        style={{
                          padding: '10px 8px',
                          borderRadius: '8px',
                          border: isSelected ? `2px solid ${opt.color}` : '1px solid var(--border-glass)',
                          background: isSelected ? `${opt.color}22` : 'rgba(255, 255, 255, 0.02)',
                          color: isSelected ? opt.color : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: '700',
                          fontSize: '0.8rem',
                          textAlign: 'center',
                          transition: 'all 0.2s'
                        }}
                      >
                        <div>{opt.icon}</div>
                        <span>{opt.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 5. ESPECIAL: Se o Subtipo for Empréstimo, exibe seletor de Empréstimo Ativo */}
              {movementType === 'saida' && formData.subtype === 'emprestimo' && activeLoans.length > 0 && (
                <div className="form-group" style={{ background: 'rgba(99, 102, 241, 0.06)', padding: '12px', borderRadius: '10px', border: '1px solid rgba(99, 102, 241, 0.25)' }}>
                  <label className="form-label" style={{ color: 'var(--primary-light)', fontWeight: '800' }}>
                    Selecionar Empréstimo Contratado *
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    {activeLoans.map((loan) => {
                      const isSelected = formData.selectedLoanId === loan.id;
                      return (
                        <div
                          key={loan.id}
                          onClick={() => handleSelectLoan(loan.id)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--primary-light)' : '1px solid var(--border-glass)',
                            background: isSelected ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {loan.id.includes('house') ? <Home size={16} style={{ color: '#10b981' }} /> : <Car size={16} style={{ color: '#6366f1' }} />}
                            <div>
                              <div style={{ fontWeight: '700', fontSize: '0.84rem', color: 'var(--text-main)' }}>{loan.name}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{loan.installmentAmount ? `${formatCurrency(loan.installmentAmount)} / mês` : ''}</div>
                            </div>
                          </div>
                          <span style={{ fontSize: '0.9rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                            {formatCurrency(loan.installmentAmount || 203.50)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 6. Valor (€) */}
              <div className="form-group">
                <label className="form-label">Valor (€) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{
                      paddingLeft: '32px',
                      fontSize: '1.2rem',
                      fontWeight: '800',
                      color: movementType === 'entrada' ? '#10b981' : movementType === 'saida' ? '#f43f5e' : '#6366f1'
                    }}
                    required
                  />
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      fontWeight: '800',
                      fontSize: '1.1rem',
                      color: movementType === 'entrada' ? '#10b981' : movementType === 'saida' ? '#f43f5e' : '#6366f1'
                    }}
                  >
                    €
                  </span>
                </div>
              </div>

              {/* 7. Data (Mês/Ano Fixos + Escolha do Dia) */}
              <div className="form-group">
                <label className="form-label">Data da Operação</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      background: 'rgba(255, 255, 255, 0.04)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: '8px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <Calendar size={16} style={{ color: 'var(--primary-light)' }} />
                    <span style={{ fontSize: '0.88rem', fontWeight: '700', color: 'var(--text-main)', textTransform: 'capitalize' }}>
                      {monthYearLabel}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label style={{ fontSize: '0.8rem', fontWeight: '700', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
                      Dia:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="form-input"
                      value={formData.dayOfMonth}
                      onChange={(e) => setFormData({ ...formData, dayOfMonth: e.target.value })}
                      style={{ fontSize: '1rem', fontWeight: '800', textAlign: 'center' }}
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 8. Notas Adicionais */}
              <div className="form-group">
                <label className="form-label">Notas Adicionais (Opcional)</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Ex: Pagamento no terminal / Transferência..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* 9. Etiquetas */}
              <div className="form-group">
                <label className="form-label">Etiquetas</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Salário, Despesas Fixas, ETF"
                  value={formData.labelsInput}
                  onChange={(e) => setFormData({ ...formData, labelsInput: e.target.value })}
                />
              </div>
            </>
          ) : (
            /* Form Geral para outras Timelines */
            <>
              <div className="form-group">
                <label className="form-label">Título *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Título do evento"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Data *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Hora</label>
                  <input
                    type="time"
                    className="form-input"
                    value={formData.time}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Descrição</label>
                <textarea
                  className="form-textarea"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </>
          )}

          {/* Footer Actions */}
          <div className="modal-footer" style={{ marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              style={{
                background: movementType === 'entrada'
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : movementType === 'saida'
                    ? 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
                    : 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                border: 'none',
                fontWeight: '800'
              }}
            >
              {isEditing ? 'Salvar Alterações' : 'Criar Movimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
