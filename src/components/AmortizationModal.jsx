import React, { useState, useEffect } from 'react';
import { Sparkles, DollarSign, Calendar, FileText, X, TrendingDown, Clock } from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculations';

export default function AmortizationModal({ isOpen, onClose, onSave, remainingBalance }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState('2026-08-21');
  const [strategy, setStrategy] = useState('reduce_term'); // 'reduce_term' | 'reduce_installment'
  const [notes, setNotes] = useState('');

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
      amount: numAmount,
      date,
      strategy,
      notes: notes.trim()
    });

    setAmount('');
    setNotes('');
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
              <h2 className="modal-title" style={{ fontSize: '1.25rem' }}>Amortização Extraordinária</h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Abata o saldo devedor e escolha o impacto no empréstimo
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
                style={{ paddingLeft: '32px' }}
                placeholder="Ex: 1500"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {/* Data da Amortização */}
          <div className="form-group">
            <label className="form-label">Data da Amortização *</label>
            <input
              type="date"
              required
              className="form-input"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Estratégia de Amortização */}
          <div className="form-group" style={{ marginTop: '14px' }}>
            <label className="form-label">O que deseja alterar com a amortização?</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <div
                onClick={() => setStrategy('reduce_term')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: `2px solid ${strategy === 'reduce_term' ? 'var(--primary)' : 'var(--border-glass)'}`,
                  background: strategy === 'reduce_term' ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.88rem', color: strategy === 'reduce_term' ? 'var(--primary-light)' : 'var(--text-main)' }}>
                  <Clock size={16} /> Reduzir Prazo
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                  Mantém o valor da prestação e antecipa a data final de término da dívida.
                </p>
              </div>

              <div
                onClick={() => setStrategy('reduce_installment')}
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  border: `2px solid ${strategy === 'reduce_installment' ? '#10b981' : 'var(--border-glass)'}`,
                  background: strategy === 'reduce_installment' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-glass)',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: '700', fontSize: '0.88rem', color: strategy === 'reduce_installment' ? '#10b981' : 'var(--text-main)' }}>
                  <TrendingDown size={16} /> Reduzir Parcela
                </div>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: '1.3' }}>
                  Mantém a data de término e reduz o valor de todas as parcelas futuras da frente.
                </p>
              </div>
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
              Confirmar Amortização
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
