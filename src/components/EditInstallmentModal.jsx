import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, AlertCircle, DollarSign, Calendar, X, ArrowRight, TrendingUp, CreditCard, Percent } from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculations';
import { EventStatus } from '../../shared/enums/EventStatus.js';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function EditInstallmentModal({
  isOpen,
  onClose,
  installment,
  onSave
}) {
  const { t } = useTranslation();
  const [status, setStatus] = useState(EventStatus.PENDING);
  const [amount, setAmount] = useState('');
  const [principalAmount, setPrincipalAmount] = useState('');
  const [interestPortion, setInterestPortion] = useState('');
  const [interestAmount, setInterestAmount] = useState(''); // mora/atraso
  const [propagateForward, setPropagateForward] = useState(false);

  useEffect(() => {
    if (installment) {
      const isPaid = installment.status === EventStatus.PAID;
      setStatus(isPaid ? EventStatus.PAID : EventStatus.PENDING);
      const total = installment.amount !== undefined ? installment.amount : 500;
      const principal = installment.principalAmount !== undefined ? installment.principalAmount : Math.round(total * 0.82 * 100) / 100;
      const interest = installment.interestPortion !== undefined ? installment.interestPortion : Math.round((total - principal) * 100) / 100;

      setAmount(total.toString());
      setPrincipalAmount(principal.toString());
      setInterestPortion(interest.toString());
      setInterestAmount(installment.interestAmount ? installment.interestAmount.toString() : '');
      setPropagateForward(false);
    }
  }, [installment]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !installment) return null;

  // Sync total when principal or interest portion changes
  const handlePrincipalChange = (val) => {
    setPrincipalAmount(val);
    const p = parseFloat(val) || 0;
    const i = parseFloat(interestPortion) || 0;
    setAmount((p + i).toFixed(2));
  };

  const handleInterestPortionChange = (val) => {
    setInterestPortion(val);
    const p = parseFloat(principalAmount) || 0;
    const i = parseFloat(val) || 0;
    setAmount((p + i).toFixed(2));
  };

  const handleTotalChange = (val) => {
    setAmount(val);
    const t = parseFloat(val) || 0;
    const p = Math.round(t * 0.82 * 100) / 100;
    const i = Math.round((t - p) * 100) / 100;
    setPrincipalAmount(p.toFixed(2));
    setInterestPortion(i.toFixed(2));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const numPrincipal = parseFloat(principalAmount) || 0;
    const numInterestPortion = parseFloat(interestPortion) || 0;
    const numTotal = numPrincipal + numInterestPortion;
    const numLateInterest = parseFloat(interestAmount) || 0;

    onSave(installment.id, {
      status,
      amount: numTotal,
      principalAmount: numPrincipal,
      interestPortion: numInterestPortion,
      interestAmount: numLateInterest,
      propagateForward
    });

    onClose();
  };

  const totalThisInstallmentWithLate = (parseFloat(amount) || 0) + (parseFloat(interestAmount) || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>
              {installment.title || 'Ajustar Prestação'}
            </h2>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Vencimento em {installment.date}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Status Selector */}
          <div className="form-group">
            <label className="form-label">Estado do Pagamento</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setStatus(EventStatus.PAID)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: `2px solid ${status === EventStatus.PAID ? '#10b981' : 'var(--border-glass)'}`,
                  background: status === EventStatus.PAID ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-glass)',
                  color: status === EventStatus.PAID ? '#10b981' : 'var(--text-muted)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <CheckCircle2 size={16} /> {t('status.paid')}
              </button>

              <button
                type="button"
                onClick={() => setStatus(EventStatus.PENDING)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '10px',
                  borderRadius: '8px',
                  border: `2px solid ${status === EventStatus.PENDING ? '#f59e0b' : 'var(--border-glass)'}`,
                  background: status === EventStatus.PENDING ? 'rgba(245, 158, 11, 0.15)' : 'var(--bg-glass)',
                  color: status === EventStatus.PENDING ? '#f59e0b' : 'var(--text-muted)',
                  fontWeight: '700',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                <Circle size={16} /> {t('status.pending')}
              </button>
            </div>
          </div>

          {/* Decomposição: Capital (Dívida) + Juros da Prestação */}
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.07)', border: '1px solid var(--border-glass-glow)', marginTop: '16px', marginBottom: '14px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--primary-light)', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <CreditCard size={15} /> Decomposição da Prestação (Capital + Juros)
            </div>

            <div className="form-row">
              {/* Amortização da Dívida (Capital) */}
              <div className="form-group">
                <label className="form-label">🏦 Capital / Dívida (€) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: '700' }}>€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="form-input"
                    style={{ paddingLeft: '32px' }}
                    value={principalAmount}
                    onChange={(e) => handlePrincipalChange(e.target.value)}
                  />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Abate diretamente à dívida.
                </p>
              </div>

              {/* Juros da Prestação */}
              <div className="form-group">
                <label className="form-label">📈 Juros Contratuais (€) *</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#f59e0b', fontWeight: '700' }}>€</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    className="form-input"
                    style={{ paddingLeft: '32px' }}
                    value={interestPortion}
                    onChange={(e) => handleInterestPortionChange(e.target.value)}
                  />
                </div>
                <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '2px' }}>
                  Custo financeiro do crédito.
                </p>
              </div>
            </div>

            {/* Total Base da Prestação */}
            <div className="form-group" style={{ marginBottom: '0', marginTop: '6px' }}>
              <label className="form-label">Valor Base Total da Prestação (€)</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-dim)', fontWeight: '700' }}>€</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  className="form-input"
                  style={{ paddingLeft: '32px', fontWeight: '700' }}
                  value={amount}
                  onChange={(e) => handleTotalChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Juros / Custos Extra de Mora por Atraso */}
          <div className="form-group">
            <label className="form-label">⚠️ Juros de Mora / Multa por Atraso (€) (Opcional)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#f87171', fontWeight: '700' }}>€</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="form-input"
                style={{ paddingLeft: '32px' }}
                placeholder="0.00"
                value={interestAmount}
                onChange={(e) => setInterestAmount(e.target.value)}
              />
            </div>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: '3px' }}>
              Cobrado apenas em caso de atraso no pagamento.
            </p>
          </div>

          {/* Total calculado da parcela */}
          <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'var(--bg-glass)', border: '1px solid var(--border-glass)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Total a Pagar nesta Parcela:</span>
            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: 'var(--text-main)' }}>{formatCurrency(totalThisInstallmentWithLate)}</span>
          </div>

          {/* Propagate Forward Checkbox */}
          <div
            onClick={() => setPropagateForward(!propagateForward)}
            style={{
              padding: '12px',
              borderRadius: '8px',
              border: `1px solid ${propagateForward ? 'var(--primary)' : 'var(--border-glass)'}`,
              background: propagateForward ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              transition: 'all 0.15s'
            }}
          >
            <input
              type="checkbox"
              checked={propagateForward}
              onChange={(e) => setPropagateForward(e.target.checked)}
              style={{ marginTop: '3px', cursor: 'pointer' }}
            />
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: propagateForward ? 'var(--primary-light)' : 'var(--text-main)' }}>
                Aplicar este valor a todas as parcelas futuras
              </div>
              <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px', lineHeight: '1.3' }}>
                Se ativado, todas as prestações da frente ({installment.installmentNumber + 1} em diante) passarão a ter a mesma decomposição de capital e juros.
              </p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '22px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              Salvar Alterações
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
