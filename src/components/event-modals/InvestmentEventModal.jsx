import React, { useState, useEffect } from 'react';
import {
  X,
  PiggyBank,
  Landmark,
  Sparkles,
  Calendar,
  Repeat,
  Zap,
  Target
} from 'lucide-react';
import { format, parseISO, addMonths } from 'date-fns';
import { EventStatus, EventPeriodicity, EventType } from '../../enums/index.js';

export default function InvestmentEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline
}) {
  const [investmentSubtype, setInvestmentSubtype] = useState('investimento_poupanca');
  const [updateScope, setUpdateScope] = useState('single');

  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    dayOfMonth: 1,
    time: '09:00',
    status: EventStatus.PLANNED,
    periodicity: EventPeriodicity.RECURRENT,
    recurrenceEndDate: '',
    amount: '',
    initialInvestedAmount: '',
    targetAmount: '',
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
      if (initialData.category === 'investimento_patrimonio') {
        setInvestmentSubtype('investimento_patrimonio');
      } else if (initialData.category === 'investimento_outros' || initialData.category?.includes('etf')) {
        setInvestmentSubtype('investimento_outros');
      } else {
        setInvestmentSubtype('investimento_poupanca');
      }

      setFormData({
        title: initialData.title || '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: initialData.time || '09:00',
        status: initialData.status || EventStatus.PLANNED,
        periodicity: initialData.periodicity || EventPeriodicity.RECURRENT,
        recurrenceEndDate: initialData.recurrenceEndDate || initialData.endDate || '',
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
        defaultEndMonth = format(addMonths(parseISO(targetDate), 6), 'yyyy-MM');
      } catch { }

      setFormData({
        title: '',
        date: targetDate,
        dayOfMonth: parsedDay,
        time: '09:00',
        status: EventStatus.PLANNED,
        periodicity: EventPeriodicity.RECURRENT,
        recurrenceEndDate: defaultEndMonth,
        amount: '',
        initialInvestedAmount: '',
        targetAmount: '',
        labelsInput: '',
        isAutomatic: false
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
    const numInitial = formData.initialInvestedAmount ? parseFloat(formData.initialInvestedAmount) : undefined;
    const numTarget = formData.targetAmount ? parseFloat(formData.targetAmount) : undefined;
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
      initialInvestedAmount: numInitial,
      targetAmount: numTarget,
      eventType: EventType.INVESTMENT,
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
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
          border: '1px solid rgba(99, 102, 241, 0.35)',
          boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 35px rgba(99, 102, 241, 0.15)',
          padding: '24px',
          boxSizing: 'border-box'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#6366f1', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <PiggyBank size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? 'Editar Investimento' : 'Novo Aporte / Ativo'}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#6366f1', fontWeight: '700' }}>
                {timeline?.name || 'Investimentos'}
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

        {/* Subtipo de Investimento */}
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
            Categoria de Investimento
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
            {[
              { id: 'investimento_poupanca', label: 'Poupança / Caixa', icon: <PiggyBank size={14} /> },
              { id: 'investimento_patrimonio', label: 'Património / Bem', icon: <Landmark size={14} /> },
              { id: 'investimento_outros', label: 'Ações / Fundos', icon: <Sparkles size={14} /> }
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
                    padding: '8px',
                    borderRadius: '8px',
                    border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-glass)',
                    background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-app)',
                    color: isSelected ? '#818cf8' : 'var(--text-muted)',
                    fontSize: '0.74rem',
                    fontWeight: isSelected ? '800' : '600',
                    cursor: 'pointer'
                  }}
                >
                  {sub.icon}
                  <span>{sub.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Título */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Nome do Ativo / Aporte *
            </label>
            <input
              type="text"
              required
              placeholder="Ex: Conta Poupança, Apartamento Lisboa, ETF VWCE..."
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
          </div>

          {/* Valor (€) */}
          <div style={{ marginBottom: '14px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              {investmentSubtype === 'investimento_patrimonio' ? 'Valor Atual de Mercado (€) *' : 'Valor do Aporte (€) *'}
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
                style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', fontSize: '1.05rem', fontWeight: '800', color: 'var(--primary-light)', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary-light)', fontWeight: '800' }}>
                €
              </span>
            </div>
          </div>

          {/* Se for Patrimônio: Custo Base / Aquisição */}
          {investmentSubtype === 'investimento_patrimonio' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
                Valor de Aquisição / Custo de Compra (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Valor investido na compra..."
                value={formData.initialInvestedAmount}
                onChange={(e) => setFormData({ ...formData, initialInvestedAmount: e.target.value })}
                className="form-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>
          )}

          {/* Meta Alvo */}
          {investmentSubtype === 'investimento_poupanca' && (
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
                <Target size={13} style={{ color: '#06b6d4' }} />
                <span>Meta / Alvo de Poupança (€) (Opcional)</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 10000.00"
                value={formData.targetAmount}
                onChange={(e) => setFormData({ ...formData, targetAmount: e.target.value })}
                className="form-input"
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
              />
            </div>
          )}

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
                      border: isSelected ? '1px solid #6366f1' : '1px solid var(--border-glass)',
                      background: isSelected ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-app)',
                      color: isSelected ? '#818cf8' : 'var(--text-muted)',
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

          {/* Dia e Status */}
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
                <option value={EventStatus.PLANNED}>Planeado</option>
                <option value={EventStatus.INVESTED}>Aportado (Realizado)</option>
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
                background: '#6366f1',
                borderColor: '#6366f1',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: '800'
              }}
            >
              {initialData ? 'Salvar Alterações' : 'Adicionar Investimento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
