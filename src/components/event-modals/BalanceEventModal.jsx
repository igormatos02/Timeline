import React, { useState, useEffect } from 'react';
import {
  X,
  Scale,
  DollarSign,
  ShoppingCart,
  PiggyBank,
  Calendar,
  Repeat,
  Zap
} from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { TimelineType, EventStatus, EventPeriodicity, EventType } from '../../enums/index.js';

export default function BalanceEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline,
  allTimelines = []
}) {
  const [movementType, setMovementType] = useState('entrada'); // 'entrada' | 'saida' | 'investimento'
  const [targetTimelineId, setTargetTimelineId] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 1,
    time: '09:00',
    status: EventStatus.PENDING,
    periodicity: EventPeriodicity.RECURRENT,
    recurrenceEndDate: '',
    amount: '',
    labelsInput: ''
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Encontrar timelines do timeboard para seleção
  const relevantTimelines = React.useMemo(() => {
    const targetType = movementType === 'saida'
      ? TimelineType.EXPENSE
      : movementType === 'investimento'
        ? TimelineType.INVESTMENT
        : TimelineType.INCOME;

    return allTimelines.filter((tl) => tl.type === targetType);
  }, [allTimelines, movementType]);

  useEffect(() => {
    if (relevantTimelines.length > 0 && !targetTimelineId) {
      setTargetTimelineId(relevantTimelines[0].id);
    }
  }, [relevantTimelines, targetTimelineId]);

  useEffect(() => {
    if (!isOpen) return;

    const todayStr = '2026-08-21';
    const targetDate = initialData?.date || defaultDate || todayStr;

    let parsedDay = 1;
    try {
      const d = parseISO(targetDate);
      if (!isNaN(d.getDate())) parsedDay = d.getDate();
    } catch {
      parsedDay = 1;
    }

    if (initialData) {
      let initType = 'entrada';
      if (initialData.isExpense || initialData.eventType === EventType.EXPENSE) initType = 'saida';
      else if (initialData.isInvestment || initialData.eventType === EventType.INVESTMENT) initType = 'investimento';

      setMovementType(initType);
      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || EventStatus.PENDING,
        periodicity: initialData.periodicity || EventPeriodicity.RECURRENT,
        recurrenceEndDate: initialData.recurrenceEndDate || initialData.endDate || '',
        amount: initialData.amount !== undefined ? initialData.amount : '',
        labelsInput: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : ''
      });
      setTargetTimelineId(initialData.timelineId || '');
    } else {
      let defaultEndMonth = '2026-12';
      try {
        defaultEndMonth = format(addMonths(parseISO(targetDate), 6), 'yyyy-MM');
      } catch { }

      setFormData({
        title: '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '09:00',
        status: EventStatus.PENDING,
        periodicity: EventPeriodicity.RECURRENT,
        recurrenceEndDate: defaultEndMonth,
        amount: '',
        labelsInput: ''
      });
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    let finalDate = formData.date;
    try {
      const [y, m] = formData.date.split('-');
      const dStr = String(formData.dayOfMonth).padStart(2, '0');
      finalDate = `${y}-${m}-${dStr}`;
    } catch { }

    const numAmount = parseFloat(formData.amount) || 0;
    const labels = formData.labelsInput
      ? formData.labelsInput.split(',').map((l) => l.trim()).filter(Boolean)
      : [];

    const isExp = movementType === 'saida';
    const isInv = movementType === 'investimento';
    const isInc = movementType === 'entrada';

    const eventPayload = {
      ...(initialData || {}),
      title: formData.title.trim(),
      date: finalDate,
      time: formData.time,
      status: formData.status,
      periodicity: formData.periodicity,
      recurrenceEndDate: formData.periodicity === EventPeriodicity.PERIOD ? formData.recurrenceEndDate : null,
      amount: numAmount,
      isExpense: isExp,
      isInvestment: isInv,
      isIncome: isInc,
      eventType: isExp ? EventType.EXPENSE : isInv ? EventType.INVESTMENT : EventType.INCOME,
      financialType: isExp ? 'expense' : isInv ? 'investment' : 'income',
      timelineId: targetTimelineId || timeline?.id,
      timelineOriginId: targetTimelineId || timeline?.id,
      labels
    };

    onSave(eventPayload);
    onClose();
  };

  const accentColor = movementType === 'saida' ? '#f43f5e' : movementType === 'investimento' ? '#6366f1' : '#10b981';

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
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: `1px solid ${accentColor}55`,
          boxShadow: `0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px ${accentColor}22`,
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: `${accentColor}22`, color: accentColor, padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <Scale size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? 'Editar Movimento' : 'Novo Movimento Financeiro'}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#0ea5e9', fontWeight: '700' }}>
                Balanço Consolidado
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

        {/* Seletor de Natureza do Movimento */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            Tipo de Movimento
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { id: 'entrada', label: 'Entrada', color: '#10b981', icon: <DollarSign size={14} /> },
              { id: 'saida', label: 'Gasto / Saída', color: '#f43f5e', icon: <ShoppingCart size={14} /> },
              { id: 'investimento', label: 'Investimento', color: '#6366f1', icon: <PiggyBank size={14} /> }
            ].map((m) => {
              const isSelected = movementType === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMovementType(m.id);
                    setTargetTimelineId('');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '5px',
                    padding: '8px',
                    borderRadius: '8px',
                    border: isSelected ? `1px solid ${m.color}` : '1px solid var(--border-glass)',
                    background: isSelected ? `${m.color}22` : 'var(--bg-app)',
                    color: isSelected ? m.color : 'var(--text-muted)',
                    fontSize: '0.78rem',
                    fontWeight: isSelected ? '800' : '600',
                    cursor: 'pointer'
                  }}
                >
                  {m.icon}
                  <span>{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Timeline de Destino */}
          {relevantTimelines.length > 0 && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
                Timeline de Destino
              </label>
              <select
                value={targetTimelineId}
                onChange={(e) => setTargetTimelineId(e.target.value)}
                className="form-select"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
              >
                {relevantTimelines.map((tl) => (
                  <option key={tl.id} value={tl.id}>
                    {tl.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Título */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Título do Movimento *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Salário, Aluguel, Aporte Poupança..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Valor (€) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Valor (€) *
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
                style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: '800', color: accentColor, boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: accentColor, fontWeight: '800' }}>
                €
              </span>
            </div>
          </div>

          {/* Periodicidade */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              Periodicidade
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[
                { id: EventPeriodicity.RECURRENT, label: 'Recorrente', icon: <Repeat size={13} /> },
                { id: EventPeriodicity.UNIQUE, label: 'Pontual', icon: <Zap size={13} /> },
                { id: EventPeriodicity.PERIOD, label: 'Período', icon: <Calendar size={13} /> }
              ].map((p) => {
                const isSelected = formData.periodicity === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, periodicity: p.id })}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '5px',
                      padding: '8px',
                      borderRadius: '8px',
                      border: isSelected ? `1px solid ${accentColor}` : '1px solid var(--border-glass)',
                      background: isSelected ? `${accentColor}22` : 'var(--bg-app)',
                      color: isSelected ? accentColor : 'var(--text-muted)',
                      fontSize: '0.78rem',
                      fontWeight: isSelected ? '800' : '600',
                      cursor: 'pointer'
                    }}
                  >
                    {p.icon}
                    <span>{p.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Dia e Data */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
                Dia do Mês
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={formData.dayOfMonth}
                onChange={(e) => setFormData({ ...formData, dayOfMonth: Number(e.target.value) })}
                className="form-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="form-select"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
              >
                <option value={EventStatus.PENDING}>Pendente / Previsto</option>
                <option value={EventStatus.RECEIVED}>Recebido</option>
                <option value={EventStatus.PAID}>Pago</option>
              </select>
            </div>
          </div>

          {/* Botões do Rodapé */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px', borderTop: '1px solid var(--border-glass)', paddingTop: '16px' }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={onClose}
              style={{ padding: '8px 16px', borderRadius: '8px' }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="btn btn-primary btn-sm"
              style={{
                background: accentColor,
                borderColor: accentColor,
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: '800'
              }}
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar Movimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
