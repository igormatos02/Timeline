import React, { useState, useEffect } from 'react';
import { Sparkles, DollarSign, Calendar, FileText, X, TrendingDown, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculations';

export default function AmortizationModal({ isOpen, onClose, onSave, remainingBalance, defaultDate = '2026-08-21', initialEvent = null }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(defaultDate || '2026-08-21');
  const [strategy, setStrategy] = useState('reduce_term'); // 'reduce_term' | 'reduce_installment'
  const [status, setStatus] = useState('Amortizado'); // 'Amortizado' | 'Pendente'
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    if (initialEvent) {
      setAmount(initialEvent.amount || initialEvent.amortizationAmount || '');
      setDate(initialEvent.date || defaultDate || '2026-08-21');
      setStrategy(initialEvent.strategy || 'reduce_term');
      setStatus(initialEvent.status || 'Amortizado');
      setNotes(initialEvent.notes || (initialEvent.description && !initialEvent.description.startsWith('Amortização extraordinária') ? initialEvent.description : ''));
    } else {
      if (defaultDate) setDate(defaultDate);
      setAmount('');
      setStrategy('reduce_term');
      setStatus('Amortizado');
      setNotes('');
    }
  }, [defaultDate, isOpen, initialEvent]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) return;

    onSave({
      id: initialEvent?.id,
      amount: numAmount,
      date,
      strategy,
      status,
      notes: notes.trim()
    });

    setAmount('');
    setNotes('');
    setStatus('Amortizado');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <TrendingDown size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>
                {initialEvent ? 'Editar Amortização' : 'Amortização Extraordinária'}
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                {initialEvent ? 'Altere o montante, data ou estratégia desta amortização' : 'Abata o saldo devedor e escolha o impacto no empréstimo'}
              </p>
            </div>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {remainingBalance !== undefined && (
          <div style={{ padding: '10px 14px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.08)', border: '1px solid var(--border-glass-glow)', marginBottom: '18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Saldo Devedor Atual:</span>
            <span style={{ fontSize: '0.95rem', fontWeight: '800', color: 'var(--primary-light)' }}>{formatCurrency(remainingBalance)}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Valor da Amortização */}
          <div className="form-group">
            <label className="form-label">Valor a Amortizar (€) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: '700' }}>€</span>
              <input
                type="number"
                step="0.01"
                min="1"
                max={remainingBalance || 1000000}
                required
                className="form-input"
                style={{ paddingLeft: '32px', fontSize: '1.05rem', fontWeight: '700' }}
                placeholder="Ex: 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Estratégia de Amortização */}
          <div className="form-group" style={{ marginTop: '16px' }}>
            <label className="form-label">O que deseja alterar com a amortização?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '6px' }}>
              <div
                onClick={() => setStrategy('reduce_term')}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: `2px solid ${strategy === 'reduce_term' ? 'var(--primary)' : 'var(--border-glass)'}`,
                  background: strategy === 'reduce_term' ? 'rgba(99, 102, 241, 0.14)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.9rem', color: strategy === 'reduce_term' ? 'var(--primary-light)' : 'var(--text-main)' }}>
                  <Clock size={16} /> 1. Diminuir Prazo
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  Abate o número de parcelas <strong>do fim para trás</strong>, encurtando o prazo final da dívida.
                </p>
              </div>

              <div
                onClick={() => setStrategy('reduce_installment')}
                style={{
                  padding: '14px 12px',
                  borderRadius: '10px',
                  border: `2px solid ${strategy === 'reduce_installment' ? '#10b981' : 'var(--border-glass)'}`,
                  background: strategy === 'reduce_installment' ? 'rgba(16, 185, 129, 0.14)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '800', fontSize: '0.9rem', color: strategy === 'reduce_installment' ? '#10b981' : 'var(--text-main)' }}>
                  <TrendingDown size={16} /> 2. Diminuir Parcela
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.4' }}>
                  Reduz o valor das parcelas <strong>dali para a frente</strong>, diminuindo a prestação mensal.
                </p>
              </div>
            </div>
          </div>

          {/* Estado Inicial da Amortização */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">Estado Inicial</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginTop: '4px' }}>
              <button
                type="button"
                onClick={() => setStatus('Amortizado')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: status === 'Amortizado' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                  background: status === 'Amortizado' ? 'rgba(16, 185, 129, 0.16)' : 'var(--bg-glass)',
                  color: status === 'Amortizado' ? '#10b981' : 'var(--text-dim)',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <span>✓ Amortizado (Efetivado)</span>
              </button>
              <button
                type="button"
                onClick={() => setStatus('Pendente')}
                style={{
                  padding: '8px 12px',
                  borderRadius: '8px',
                  border: status === 'Pendente' ? '2px solid #f59e0b' : '1px solid var(--border-glass)',
                  background: status === 'Pendente' ? 'rgba(245, 158, 11, 0.16)' : 'var(--bg-glass)',
                  color: status === 'Pendente' ? '#f59e0b' : 'var(--text-dim)',
                  fontWeight: '700',
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.15s'
                }}
              >
                <span>⏳ Pendente (Agendado)</span>
              </button>
            </div>
          </div>

          {/* Notas Opcionais */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">Notas / Justificação (Opcional)</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Pagamento com subsídio de férias..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}>
              {initialEvent ? 'Salvar Alterações' : 'Confirmar Amortização'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
