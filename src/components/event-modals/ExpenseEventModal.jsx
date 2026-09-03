import React, { useState, useEffect } from 'react';
import {
  X,
  ShoppingCart,
  Calendar,
  Repeat,
  Zap,
  Plus,
  Trash2
} from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { EventStatus, EventPeriodicity, EventType } from '../../enums/index.js';

export default function ExpenseEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline
}) {
  const [breakdownItems, setBreakdownItems] = useState([]);
  const [updateScope, setUpdateScope] = useState('single');

  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 1,
    time: '09:00',
    status: EventStatus.PENDING,
    periodicity: EventPeriodicity.RECURRENT,
    recurrenceEndDate: '',
    amount: '',
    labelsInput: '',
    isAutomatic: false
  });

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

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
      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || EventStatus.PENDING,
        periodicity: initialData.periodicity || EventPeriodicity.RECURRENT,
        recurrenceEndDate: initialData.recurrenceEndDate || initialData.endDate || '',
        amount: initialData.amount !== undefined ? initialData.amount : '',
        labelsInput: Array.isArray(initialData.labels) ? initialData.labels.join(', ') : '',
        isAutomatic: Boolean(initialData.isAutomatic)
      });
      setUpdateScope('subsequent');
      setBreakdownItems(initialData.breakdownItems ? JSON.parse(JSON.stringify(initialData.breakdownItems)) : []);
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
        labelsInput: '',
        isAutomatic: false
      });
      setBreakdownItems([]);
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleAddBreakdown = () => {
    setBreakdownItems([
      ...breakdownItems,
      { id: `bk-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`, description: '', amount: '' }
    ]);
  };

  const handleUpdateBreakdown = (index, field, val) => {
    const updated = [...breakdownItems];
    updated[index][field] = val;
    setBreakdownItems(updated);

    const totalFromBreakdown = updated.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    if (totalFromBreakdown > 0) {
      setFormData((prev) => ({ ...prev, amount: totalFromBreakdown.toFixed(2) }));
    }
  };

  const handleRemoveBreakdown = (index) => {
    const updated = breakdownItems.filter((_, i) => i !== index);
    setBreakdownItems(updated);
    const totalFromBreakdown = updated.reduce((acc, item) => acc + (parseFloat(item.amount) || 0), 0);
    if (totalFromBreakdown > 0) {
      setFormData((prev) => ({ ...prev, amount: totalFromBreakdown.toFixed(2) }));
    }
  };

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

    const eventPayload = {
      ...(initialData || {}),
      title: formData.title.trim(),
      date: finalDate,
      time: formData.time,
      status: formData.status,
      periodicity: formData.periodicity,
      recurrenceEndDate: formData.periodicity === EventPeriodicity.PERIOD ? formData.recurrenceEndDate : null,
      amount: numAmount,
      eventType: EventType.EXPENSE,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      breakdownItems: breakdownItems.filter((b) => b.description.trim() || b.amount),
      labels,
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
          maxWidth: '540px',
          width: '100%',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-card, #131722)',
          borderRadius: '16px',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(244, 63, 94, 0.15)',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(244, 63, 94, 0.15)', color: '#f43f5e', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <ShoppingCart size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? 'Editar Despesa' : 'Novo Gasto / Despesa'}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#f43f5e', fontWeight: '700' }}>
                {timeline?.name || 'Gastos e Despesas'}
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
          {/* Título */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Descrição da Despesa *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Renda / Aluguel, Supermercado, Energia Elétrica..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Valor (€) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Valor a Pagar (€) *
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
                style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: '800', color: '#f43f5e', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#f43f5e', fontWeight: '800' }}>
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
                      border: isSelected ? '1px solid #f43f5e' : '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(244, 63, 94, 0.15)' : 'var(--bg-app)',
                      color: isSelected ? '#f43f5e' : 'var(--text-muted)',
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

          {/* Dia de Vencimento e Status */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
                Dia do Mês (Vencimento)
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
                <option value={EventStatus.PENDING}>Pendente</option>
                <option value={EventStatus.PAID}>Pago (Liquidado)</option>
              </select>
            </div>
          </div>

          {/* Detalhamento de Fatura (Breakdown) */}
          <div style={{ marginBottom: '16px', background: 'var(--bg-app)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-glass)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: 'var(--text-main)' }}>
                Subitens / Detalhamento (Opcional)
              </span>
              <button
                type="button"
                onClick={handleAddBreakdown}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(244, 63, 94, 0.1)',
                  color: '#f43f5e',
                  border: '1px solid rgba(244, 63, 94, 0.3)',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <Plus size={12} /> Item
              </button>
            </div>

            {breakdownItems.map((item, idx) => (
              <div key={item.id || idx} style={{ display: 'flex', gap: '8px', marginBottom: '6px', alignItems: 'center' }}>
                <input
                  type="text"
                  placeholder="Item / Categoria"
                  value={item.description}
                  onChange={(e) => handleUpdateBreakdown(idx, 'description', e.target.value)}
                  className="form-input"
                  style={{ flex: 2, padding: '6px 8px', fontSize: '0.78rem', borderRadius: '6px' }}
                />
                <input
                  type="number"
                  step="0.01"
                  placeholder="€"
                  value={item.amount}
                  onChange={(e) => handleUpdateBreakdown(idx, 'amount', e.target.value)}
                  className="form-input"
                  style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem', borderRadius: '6px' }}
                />
                <button
                  type="button"
                  onClick={() => handleRemoveBreakdown(idx)}
                  style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: '4px' }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
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
                background: '#f43f5e',
                borderColor: '#f43f5e',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: '800'
              }}
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar Despesa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
