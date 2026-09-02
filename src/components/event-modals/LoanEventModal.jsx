import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  DollarSign,
  Calendar,
  Sparkles,
  CheckCircle2,
  TrendingDown,
  Clock
} from 'lucide-react';
import { EventStatus, EventType, AmortizationStrategy } from '../../enums/index.js';

export default function LoanEventModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  defaultDate,
  timeline
}) {
  const [formData, setFormData] = useState({
    title: '',
    date: defaultDate || '2026-08-21',
    amount: '',
    isAmortization: true,
    amortizationStrategy: AmortizationStrategy.TERM_REDUCTION,
    status: EventStatus.PAID,
    notes: ''
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

    if (initialData) {
      setFormData({
        title: initialData.title || 'Amortização Extraordinária',
        date: initialData.date || defaultDate || '2026-08-21',
        amount: initialData.amount !== undefined ? initialData.amount : '',
        isAmortization: Boolean(initialData.isAmortization ?? true),
        amortizationStrategy: initialData.amortizationStrategy || AmortizationStrategy.TERM_REDUCTION,
        status: initialData.status || EventStatus.PAID,
        notes: initialData.notes || ''
      });
    } else {
      setFormData({
        title: 'Amortização Extraordinária',
        date: defaultDate || '2026-08-21',
        amount: '',
        isAmortization: true,
        amortizationStrategy: AmortizationStrategy.TERM_REDUCTION,
        status: EventStatus.PAID,
        notes: ''
      });
    }
  }, [initialData, defaultDate, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(formData.amount) || 0;
    if (numAmount <= 0) return;

    const eventPayload = {
      ...(initialData || {}),
      title: formData.title.trim() || 'Amortização de Empréstimo',
      date: formData.date,
      amount: numAmount,
      isAmortization: formData.isAmortization,
      amortizationStrategy: formData.amortizationStrategy,
      status: formData.status,
      eventType: EventType.AMORTIZATION,
      financialType: 'amortization',
      category: 'amortizacao',
      timelineId: timeline?.id,
      timelineOriginId: timeline?.id,
      notes: formData.notes
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
          maxWidth: '500px',
          width: '100%',
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
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '8px', borderRadius: '10px', display: 'flex' }}>
              <CreditCard size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {initialData ? 'Editar Amortização' : 'Nova Amortização'}
              </h3>
              <div style={{ fontSize: '0.76rem', color: '#818cf8', fontWeight: '700' }}>
                {timeline?.name || 'Empréstimo'}
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
          {/* Valor a Amortizar */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              Valor a Amortizar (€) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="form-input"
                style={{ width: '100%', padding: '10px 12px 10px 32px', borderRadius: '8px', fontSize: '1.1rem', fontWeight: '800', color: '#10b981', boxSizing: 'border-box' }}
              />
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#10b981', fontWeight: '800' }}>
                €
              </span>
            </div>
          </div>

          {/* Estratégia de Amortização */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '6px', color: 'var(--text-main)' }}>
              Estratégia de Redução
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, amortizationStrategy: AmortizationStrategy.TERM_REDUCTION })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: formData.amortizationStrategy === AmortizationStrategy.TERM_REDUCTION ? '1px solid #10b981' : '1px solid var(--border-glass)',
                  background: formData.amortizationStrategy === AmortizationStrategy.TERM_REDUCTION ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-app)',
                  color: formData.amortizationStrategy === AmortizationStrategy.TERM_REDUCTION ? '#10b981' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: formData.amortizationStrategy === AmortizationStrategy.TERM_REDUCTION ? '800' : '600',
                  cursor: 'pointer'
                }}
              >
                <Clock size={16} />
                <span>Reduzir Prazo</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, amortizationStrategy: AmortizationStrategy.INSTALLMENT_REDUCTION })}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: formData.amortizationStrategy === AmortizationStrategy.INSTALLMENT_REDUCTION ? '1px solid #818cf8' : '1px solid var(--border-glass)',
                  background: formData.amortizationStrategy === AmortizationStrategy.INSTALLMENT_REDUCTION ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-app)',
                  color: formData.amortizationStrategy === AmortizationStrategy.INSTALLMENT_REDUCTION ? '#818cf8' : 'var(--text-muted)',
                  fontSize: '0.76rem',
                  fontWeight: formData.amortizationStrategy === AmortizationStrategy.INSTALLMENT_REDUCTION ? '800' : '600',
                  cursor: 'pointer'
                }}
              >
                <TrendingDown size={16} />
                <span>Reduzir Prestação</span>
              </button>
            </div>
          </div>

          {/* Data da Operação */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', marginBottom: '5px', color: 'var(--text-main)' }}>
              Data da Amortização *
            </label>
            <input
              type="date"
              required
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="form-input"
              style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', boxSizing: 'border-box' }}
            />
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
                background: '#10b981',
                borderColor: '#10b981',
                padding: '8px 20px',
                borderRadius: '8px',
                fontWeight: '800'
              }}
            >
              Confirmar Amortização
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
