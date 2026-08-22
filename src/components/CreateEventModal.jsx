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
  Sparkles
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { EVENT_CATEGORIES, DEFAULT_LABELS } from '../data/mockTimelines';

export default function CreateEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline
}) {
  const isIncomeTimeline = timeline?.type === 'Entradas';

  // Base state
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 27,
    time: '10:00',
    status: 'Previsto',
    periodicity: 'recorrente', // 'unica' | 'recorrente'
    incomeSubtype: 'rendimentos', // for recorrente: 'rendimentos' | 'outros' ; for unica: 'ganhos' | 'vendas' | 'outros'
    category: 'entrada_recorrente',
    priority: 'Normal',
    amount: 3300,
    description: '',
    author: 'Igor Matos',
    labelsInput: '',
    tasks: []
  });

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
      const isRecurrent = initialData.category === 'entrada_recorrente';
      let subtype = initialData.incomeSubtype;
      if (!subtype) {
        if (isRecurrent) {
          subtype = 'rendimentos';
        } else {
          subtype = initialData.title?.toLowerCase().includes('venda') ? 'vendas' : 'ganhos';
        }
      }

      setFormData({
        ...initialData,
        dayOfMonth: parsedDay,
        amount: initialData.amount !== undefined ? initialData.amount : 3300,
        periodicity: isRecurrent ? 'recorrente' : 'unica',
        incomeSubtype: subtype,
        category: initialData.category || (isIncomeTimeline ? (isRecurrent ? 'entrada_recorrente' : 'entrada_esporadica') : 'agendamento'),
        labelsInput: initialData.labels ? initialData.labels.join(', ') : '',
        tasks: initialData.tasks || []
      });
    } else {
      const isPast = targetDate <= todayStr;

      setFormData({
        title: isIncomeTimeline ? 'Salário Mensal' : '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '10:00',
        status: isIncomeTimeline ? (isPast ? 'Recebido' : 'Previsto') : 'Em Progresso',
        periodicity: 'recorrente',
        incomeSubtype: 'rendimentos',
        category: isIncomeTimeline ? 'entrada_recorrente' : 'agendamento',
        priority: 'Normal',
        amount: isIncomeTimeline ? 3300 : 0,
        description: '',
        author: 'Igor Matos',
        labelsInput: isIncomeTimeline ? (isPast ? 'Salário, Recebido' : 'Salário, Previsto') : '',
        tasks: []
      });
    }
  }, [initialData, defaultDate, isOpen, isIncomeTimeline]);

  if (!isOpen) return null;

  const isIncomeCategory = formData.category === 'entrada_recorrente' || formData.category === 'entrada_esporadica' || isIncomeTimeline;

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

  // Handle switching Periodicity (Única vs Recorrente)
  const handleSelectPeriodicity = (p) => {
    if (p === 'unica') {
      setFormData({
        ...formData,
        periodicity: 'unica',
        category: 'entrada_esporadica',
        incomeSubtype: 'ganhos',
        title: formData.title === 'Salário Mensal' || !formData.title ? 'Bónus de Desempenho' : formData.title,
        amount: formData.amount === 3300 ? 1500 : formData.amount,
        labelsInput: 'Ganhos, Bónus'
      });
    } else {
      setFormData({
        ...formData,
        periodicity: 'recorrente',
        category: 'entrada_recorrente',
        incomeSubtype: 'rendimentos',
        title: formData.title === 'Bónus de Desempenho' || !formData.title ? 'Salário Mensal' : formData.title,
        amount: formData.amount === 1500 ? 3300 : formData.amount,
        labelsInput: 'Salário, Rendimento'
      });
    }
  };

  // Handle Subtype selection
  const handleSelectIncomeSubtype = (st) => {
    let defaultTitle = formData.title;
    let defaultAmount = formData.amount;
    let defaultLabels = formData.labelsInput;

    if (st === 'rendimentos') {
      defaultTitle = 'Salário Mensal';
      defaultAmount = 3300;
      defaultLabels = 'Salário, Rendimento';
    } else if (st === 'ganhos') {
      defaultTitle = 'Bónus de Desempenho';
      defaultAmount = 1500;
      defaultLabels = 'Ganhos, Bónus';
    } else if (st === 'vendas') {
      defaultTitle = 'Venda de Ativo / Bem';
      defaultAmount = 800;
      defaultLabels = 'Vendas';
    } else if (st === 'outros') {
      defaultTitle = formData.periodicity === 'recorrente' ? 'Outro Rendimento Recorrente' : 'Outra Entrada Extra';
      defaultAmount = 500;
      defaultLabels = 'Outros, Extra';
    }

    setFormData({
      ...formData,
      incomeSubtype: st,
      title: defaultTitle,
      amount: defaultAmount,
      labelsInput: defaultLabels
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    // Calculate final date using the chosen day and the fixed month/year
    const safeDay = Math.min(31, Math.max(1, Number(formData.dayOfMonth) || 1));
    const safeDayStr = safeDay.toString().padStart(2, '0');
    const finalDateStr = isIncomeCategory
      ? `${yearStr}-${monthStr}-${safeDayStr}`
      : formData.date;

    const labels = formData.labelsInput
      .split(',')
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const isPast = finalDateStr <= '2026-08-21';
    const computedCategory = formData.periodicity === 'recorrente' ? 'entrada_recorrente' : 'entrada_esporadica';
    const computedStatus = isIncomeCategory ? (isPast ? 'Recebido' : 'Pendente') : formData.status;

    onSave({
      ...formData,
      date: finalDateStr,
      category: isIncomeCategory ? computedCategory : formData.category,
      incomeSubtype: formData.incomeSubtype,
      status: computedStatus,
      amount: isIncomeCategory ? Number(formData.amount) || 0 : undefined,
      isIncome: isIncomeCategory,
      labels,
      isCompleted: isIncomeCategory ? isPast : (formData.category === 'tarefa' ? false : true)
    });
    onClose();
  };

  const isEditing = Boolean(initialData && initialData.id);

  // Boxes dynamically configured per periodicity
  const incomeSubtypeBoxes = formData.periodicity === 'unica'
    ? [
      {
        id: 'ganhos',
        name: 'Ganhos',
        icon: <Gift size={18} />,
        color: '#10b981',
        bgGlow: 'rgba(16, 185, 129, 0.15)',
        borderColor: '#10b981'
      },
      {
        id: 'vendas',
        name: 'Vendas',
        icon: <ShoppingBag size={18} />,
        color: '#06b6d4',
        bgGlow: 'rgba(6, 182, 212, 0.15)',
        borderColor: '#06b6d4'
      },
      {
        id: 'outros',
        name: 'Outros',
        icon: <Sparkles size={18} />,
        color: '#8b5cf6',
        bgGlow: 'rgba(139, 92, 246, 0.15)',
        borderColor: '#8b5cf6'
      }
    ]
    : [
      {
        id: 'rendimentos',
        name: 'Rendimentos',
        icon: <Briefcase size={18} />,
        color: '#10b981',
        bgGlow: 'rgba(16, 185, 129, 0.15)',
        borderColor: '#10b981'
      },
      {
        id: 'outros',
        name: 'Outros',
        icon: <Sparkles size={18} />,
        color: '#8b5cf6',
        bgGlow: 'rgba(139, 92, 246, 0.15)',
        borderColor: '#8b5cf6'
      }
    ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {isIncomeCategory ? (
              <DollarSign size={20} style={{ color: '#10b981' }} />
            ) : (
              <Calendar size={20} style={{ color: 'var(--primary-light)' }} />
            )}
            <h2 className="modal-title">
              {isEditing
                ? isIncomeCategory ? 'Editar Entrada Financeira' : 'Editar Evento'
                : isIncomeCategory ? 'Nova Entrada Financeira' : 'Novo Evento'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* SE FOR TIMELINE DE ENTRADAS: FORMULÁRIO DINÂMICO */}
          {isIncomeCategory ? (
            <>
              {/* 1. Descrição / Título (Primeiro Campo) */}
              <div className="form-group">
                <label className="form-label">Descrição / Título (ex: Salário) *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Salário / Aluguel / Bónus"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* 2. Periodicidade: Apenas Única ou Recorrente */}
              <div className="form-group">
                <label className="form-label">Periodicidade *</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
                  {/* Opção Única */}
                  <button
                    type="button"
                    onClick={() => handleSelectPeriodicity('unica')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: formData.periodicity === 'unica' ? '2px solid var(--primary-light)' : '1px solid var(--border-glass)',
                      background: formData.periodicity === 'unica' ? 'rgba(99, 102, 241, 0.18)' : 'rgba(255,255,255,0.03)',
                      color: formData.periodicity === 'unica' ? 'var(--primary-light)' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.86rem',
                      fontWeight: '800',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Zap size={15} />
                    <span>Única</span>
                  </button>

                  {/* Opção Recorrente */}
                  <button
                    type="button"
                    onClick={() => handleSelectPeriodicity('recorrente')}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: formData.periodicity === 'recorrente' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                      background: formData.periodicity === 'recorrente' ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255,255,255,0.03)',
                      color: formData.periodicity === 'recorrente' ? '#10b981' : 'var(--text-muted)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '8px',
                      fontSize: '0.86rem',
                      fontWeight: '800',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Repeat size={15} />
                    <span>Recorrente</span>
                  </button>
                </div>
              </div>

              {/* 3. Boxes Coloridas para Seleção do Tipo */}
              <div className="form-group">
                <label className="form-label">Tipo de Entrada *</label>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: incomeSubtypeBoxes.length === 3 ? '1fr 1fr 1fr' : '1fr 1fr',
                    gap: '10px',
                    marginTop: '4px'
                  }}
                >
                  {incomeSubtypeBoxes.map((box) => {
                    const isSelected = formData.incomeSubtype === box.id;
                    return (
                      <div
                        key={box.id}
                        onClick={() => handleSelectIncomeSubtype(box.id)}
                        style={{
                          padding: '12px 10px',
                          borderRadius: '10px',
                          border: isSelected ? `2px solid ${box.borderColor}` : '1px solid var(--border-glass)',
                          background: isSelected ? box.bgGlow : 'rgba(255, 255, 255, 0.02)',
                          color: isSelected ? box.color : 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontWeight: '800',
                          fontSize: '0.86rem',
                          transition: 'all 0.2s',
                          boxShadow: isSelected ? `0 4px 16px ${box.bgGlow}` : 'none'
                        }}
                      >
                        <div style={{ color: isSelected ? box.color : 'var(--text-dim)' }}>
                          {box.icon}
                        </div>
                        <span>{box.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. Valor (€) */}
              <div className="form-group">
                <label className="form-label">Valor (€) *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-input"
                    placeholder="3300.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    style={{
                      paddingLeft: '32px',
                      fontSize: '1.2rem',
                      fontWeight: '800',
                      color: '#10b981'
                    }}
                    required
                  />
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '800', color: '#10b981', fontSize: '1.1rem' }}>
                    €
                  </span>
                </div>
              </div>

              {/* 5. Data: Mês e Ano Fixos + Escolha do Dia */}
              <div className="form-group">
                <label className="form-label">Data da Entrada</label>
                <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px', alignItems: 'center' }}>
                  {/* Mês e Ano Fixos */}
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

                  {/* Campo Escolha do Dia */}
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

              {/* 6. Notas Adicionais */}
              <div className="form-group">
                <label className="form-label">Notas Adicionais (Opcional)</label>
                <textarea
                  className="form-textarea"
                  rows="2"
                  placeholder="Ex: Transferência bancária / Depósito em conta..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* 7. Etiquetas */}
              <div className="form-group">
                <label className="form-label">Etiquetas</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Ex: Salário, Rendimentos, Bónus"
                  value={formData.labelsInput}
                  onChange={(e) => setFormData({ ...formData, labelsInput: e.target.value })}
                />
              </div>
            </>
          ) : (
            /* FORMULÁRIO GERAL PARA OUTRAS TIMELINES */
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
                background: isIncomeCategory
                  ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
                  : 'var(--primary)',
                fontWeight: '800'
              }}
            >
              {isEditing
                ? isIncomeCategory ? 'Salvar Entrada' : 'Salvar Evento'
                : isIncomeCategory ? 'Registar Entrada (+)' : 'Criar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
