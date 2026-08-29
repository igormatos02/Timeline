import React, { useState, useEffect } from 'react';
import { X, Sparkles, FolderPlus, Edit2, CreditCard, DollarSign, Calendar, ShieldCheck, ShieldAlert } from 'lucide-react';
import { generateLoanSchedule } from '../utils/loanCalculations';

export default function CreateTimelineModal({
  isOpen,
  onClose,
  onSave,
  initialData
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    startDate: '2026-01-10',
    endDate: '2027-12-10',
    status: 'Ativo',
    type: 'emprestimo',
    color: '#6366f1',
    totalDebt: 12000,
    installmentAmount: 500,
    periodicity: 'mensal',
    dueDay: 10
  });

  useEffect(() => {
    if (!isOpen) return;
    if (initialData) {
      setFormData({
        ...initialData,
        type: 'emprestimo',
        status: initialData.status === 'Inativo' ? 'Inativo' : 'Ativo'
      });
    } else {
      setFormData({
        name: '',
        description: '',
        startDate: '2026-01-10',
        endDate: '2027-12-10',
        status: 'Ativo',
        type: 'emprestimo',
        color: '#6366f1',
        totalDebt: 12000,
        installmentAmount: 500,
        periodicity: 'mensal',
        dueDay: 10
      });
    }
  }, [initialData, isOpen]);

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
    if (!formData.name.trim()) return;

    let finalData = {
      ...formData,
      type: 'emprestimo',
      status: formData.status === 'Inativo' ? 'Inativo' : 'Ativo'
    };

    // If new loan timeline, automatically generate loan installments schedule
    if (!initialData) {
      const generatedEvents = generateLoanSchedule({
        totalDebt: Number(formData.totalDebt) || 12000,
        installmentAmount: Number(formData.installmentAmount) || 500,
        startDateStr: formData.startDate,
        dueDay: Number(formData.dueDay) || 10,
        periodicity: formData.periodicity || 'mensal'
      });
      finalData.events = generatedEvents;
    }

    onSave(finalData);
    onClose();
  };

  const isEditing = Boolean(initialData && initialData.id);

  const colors = [
    '#6366f1', // Indigo
    '#ec4899', // Pink
    '#10b981', // Emerald
    '#06b6d4', // Cyan
    '#f59e0b', // Amber
    '#a855f7', // Purple
    '#3b82f6'  // Blue
  ];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '580px' }}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CreditCard size={22} className="text-primary" />
            <h2 className="modal-title">
              {isEditing ? 'Editar Empréstimo' : 'Novo Empréstimo'}
            </h2>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Nome do Empréstimo */}
          <div className="form-group">
            <label className="form-label">Nome do Empréstimo / Financiamento *</label>
            <input
              type="text"
              className="form-input"
              placeholder="Ex: Crédito Jeep, Habitação Egas Moniz, Crédito Pessoal..."
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label">Descrição / Notas</label>
            <textarea
              className="form-textarea"
              placeholder="Ex: Contrato nº 80004197726 no Banco Santander..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Status do Empréstimo */}
          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Status do Empréstimo</span>
              <span style={{ fontSize: '0.72rem', color: formData.status === 'Ativo' ? '#10b981' : '#f43f5e', fontWeight: '700' }}>
                {formData.status === 'Ativo' ? '● Incluído nas Contas e Balanço' : '○ Desativado (Fora das Contas)'}
              </span>
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'Ativo' })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: formData.status === 'Ativo' ? '2px solid #10b981' : '1px solid var(--border-glass)',
                  background: formData.status === 'Ativo' ? 'rgba(16, 185, 129, 0.18)' : 'var(--bg-glass)',
                  color: formData.status === 'Ativo' ? '#10b981' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldCheck size={16} /> Ativo
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, status: 'Inativo' })}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: formData.status === 'Inativo' ? '2px solid #f43f5e' : '1px solid var(--border-glass)',
                  background: formData.status === 'Inativo' ? 'rgba(244, 63, 94, 0.18)' : 'var(--bg-glass)',
                  color: formData.status === 'Inativo' ? '#f43f5e' : 'var(--text-muted)',
                  fontWeight: '700',
                  fontSize: '0.86rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <ShieldAlert size={16} /> Inativo
              </button>
            </div>
            {formData.status === 'Inativo' && (
              <div style={{ fontSize: '0.72rem', color: '#f87171', marginTop: '6px', lineHeight: 1.3 }}>
                ⚠️ Ao desativar, este empréstimo e todas as suas parcelas deixarão de fazer parte do Balanço Global e das contas.
              </div>
            )}
          </div>

          {/* Loan Specific Parameters */}
          {isLoan && (
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(99, 102, 241, 0.07)', border: '1px solid var(--border-glass-glow)', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary-light)', marginBottom: '10px' }}>
                <CreditCard size={15} /> Parâmetros Financeiros do Empréstimo
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Valor Total da Dívida (€)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="form-input"
                    value={formData.totalDebt || ''}
                    onChange={(e) => setFormData({ ...formData, totalDebt: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Valor da Parcela (€)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    className="form-input"
                    value={formData.installmentAmount || ''}
                    onChange={(e) => setFormData({ ...formData, installmentAmount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Periodicidade</label>
                  <select
                    className="form-select"
                    value={formData.periodicity || 'mensal'}
                    onChange={(e) => setFormData({ ...formData, periodicity: e.target.value })}
                  >
                    <option value="mensal">Mensal (Padrão)</option>
                    <option value="quinzenal">Quinzenal</option>
                    <option value="diaria">Diária</option>
                    <option value="bimestral">Bimestral</option>
                    <option value="semestral">Semestral</option>
                    <option value="anual">Anual</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Dia do Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    className="form-input"
                    value={formData.dueDay || 10}
                    onChange={(e) => setFormData({ ...formData, dueDay: parseInt(e.target.value) || 1 })}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Start & End Dates */}
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Data de Início da Dívida</label>
              <input
                type="date"
                className="form-input"
                value={formData.startDate}
                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">Data Prevista de Término</label>
              <input
                type="date"
                className="form-input"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Color Accent */}
          <div className="form-group">
            <label className="form-label">Cor de Destaque</label>
            <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
              {colors.map((c) => (
                <div
                  key={c}
                  onClick={() => setFormData({ ...formData, color: c })}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    backgroundColor: c,
                    cursor: 'pointer',
                    border: formData.color === c ? '3px solid #fff' : '2px solid transparent',
                    boxShadow: formData.color === c ? '0 0 12px ' + c : 'none',
                    transition: 'all 0.2s'
                  }}
                />
              ))}
            </div>
          </div>

          {/* Submit */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="btn btn-primary">
              {isEditing ? 'Salvar Alterações' : 'Criar Empréstimo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
