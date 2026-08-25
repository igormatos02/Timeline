import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Calendar, DollarSign, Repeat } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { pt } from 'date-fns/locale';
import { formatCurrency } from '../utils/loanCalculations';

export default function DeleteEventModal({
  isOpen,
  onClose,
  event,
  onConfirmDelete
}) {
  const [deleteScope, setDeleteScope] = useState('subsequent'); // 'single' | 'subsequent' | 'all'

  useEffect(() => {
    if (isOpen) {
      setDeleteScope('subsequent');
    }
  }, [isOpen, event]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !event) return null;

  const isRecurring = Boolean(
    event.periodicity === 'recorrente' ||
    event.isRecurring === true ||
    Boolean(event.seriesId) ||
    Boolean(
      event.category &&
      (event.category.includes('recorrente') ||
       event.category === 'parcela_emprestimo' ||
       event.category === 'repetitivo')
    )
  ) && event.periodicity !== 'unico' && event.periodicity !== 'pontual' && event.category !== 'saida_esporadica' && event.category !== 'entrada_esporadica' && event.category !== 'amortizacao' && !event.isAmortization;

  const isIncome = event.isIncome || event.financialType === 'entrada' || (event.category && event.category.includes('entrada'));
  const isExpense = event.isExpense || event.financialType === 'gasto' || (event.category && event.category.includes('saida')) || event.category === 'gasto';
  const isInvestment = event.isInvestment || event.financialType === 'investimento' || (event.category && event.category.includes('investimento'));

  const formattedDate = event.date
    ? format(parseISO(event.date), "d 'de' MMMM 'de' yyyy", { locale: pt })
    : '';

  const handleDelete = () => {
    if (onConfirmDelete) {
      onConfirmDelete(event.id, isRecurring ? deleteScope : 'single');
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '500px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f43f5e'
              }}
            >
              <Trash2 size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', margin: 0 }}>
                Eliminar Registo
              </h2>
              <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                Escolha o âmbito da eliminação
              </p>
            </div>
          </div>

          <button type="button" className="modal-close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Item Summary Card */}
        <div
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '12px 16px',
            marginBottom: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
            <span style={{ fontSize: '0.96rem', fontWeight: '700', color: 'var(--text-main)', flex: 1 }}>
              {(event.title || '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')}
            </span>
            {event.amount !== undefined && (
              <span
                style={{
                  fontSize: '0.96rem',
                  fontWeight: '800',
                  color: isIncome ? '#10b981' : isExpense ? '#f43f5e' : isInvestment ? 'var(--primary-light)' : 'var(--text-main)'
                }}
              >
                {isIncome ? '+' : isExpense ? '-' : ''}{formatCurrency(event.amount)}
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            {formattedDate && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Calendar size={13} style={{ color: 'var(--primary-light)' }} />
                {formattedDate}
              </span>
            )}
            {isRecurring && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  background: 'rgba(99, 102, 241, 0.12)',
                  color: 'var(--primary-light)',
                  padding: '2px 7px',
                  borderRadius: '9999px',
                  fontSize: '0.7rem',
                  fontWeight: '700'
                }}
              >
                <Repeat size={11} /> Recorrente
              </span>
            )}
          </div>
        </div>

        {/* 3 Scope Selector Options for Recurring Series */}
        {isRecurring ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
            {/* Opção 1: Apenas este mês */}
            <div
              onClick={() => setDeleteScope('single')}
              style={{
                background: deleteScope === 'single' ? 'rgba(6, 182, 212, 0.12)' : 'var(--bg-app)',
                border: deleteScope === 'single' ? '2px solid #06b6d4' : '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="radio"
                name="deleteScope"
                checked={deleteScope === 'single'}
                onChange={() => setDeleteScope('single')}
                style={{ accentColor: '#06b6d4', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: deleteScope === 'single' ? '#06b6d4' : 'var(--text-main)' }}>
                  Apenas este mês ({formattedDate})
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Oculta este mês com flag de exclusão. Os meses anteriores e futuros continuam normais.
                </span>
              </div>
            </div>

            {/* Opção 2: Deste mês em diante (Subsequentes) */}
            <div
              onClick={() => setDeleteScope('subsequent')}
              style={{
                background: deleteScope === 'subsequent' ? 'rgba(244, 63, 94, 0.12)' : 'var(--bg-app)',
                border: deleteScope === 'subsequent' ? '2px solid #f43f5e' : '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="radio"
                name="deleteScope"
                checked={deleteScope === 'subsequent'}
                onChange={() => setDeleteScope('subsequent')}
                style={{ accentColor: '#f43f5e', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '700', color: deleteScope === 'subsequent' ? '#f43f5e' : 'var(--text-main)' }}>
                  Deste mês em diante (Subsequentes)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Cria versão de encerramento para cessar a série deste mês para a frente. O histórico anterior é preservado.
                </span>
              </div>
            </div>

            {/* Opção 3: Apagar toda a série (Histórico + Futuro) */}
            <div
              onClick={() => setDeleteScope('all')}
              style={{
                background: deleteScope === 'all' ? 'rgba(220, 38, 38, 0.16)' : 'var(--bg-app)',
                border: deleteScope === 'all' ? '2px solid #dc2626' : '1px solid var(--border-glass)',
                borderRadius: '10px',
                padding: '10px 14px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                transition: 'all 0.15s ease'
              }}
            >
              <input
                type="radio"
                name="deleteScope"
                checked={deleteScope === 'all'}
                onChange={() => setDeleteScope('all')}
                style={{ accentColor: '#dc2626', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                <span style={{ fontSize: '0.84rem', fontWeight: '800', color: deleteScope === 'all' ? '#ef4444' : 'var(--text-main)' }}>
                  Apagar toda a série (Histórico + Futuro)
                </span>
                <span style={{ fontSize: '0.72rem', color: '#f87171' }}>
                  ⚠️ Remove completamente do JSON todos os registos e versões desta série.
                </span>
              </div>
            </div>
          </div>
        ) : (
          <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
            Tem a certeza que deseja eliminar este movimento? Esta ação não pode ser desfeita.
          </p>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '8px 16px', fontSize: '0.86rem' }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleDelete}
            style={{
              background: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
              color: '#ffffff',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: 'var(--radius-sm, 8px)',
              padding: '8px 18px',
              fontSize: '0.86rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.35)',
              transition: 'all 0.15s ease'
            }}
          >
            <Trash2 size={15} />
            <span>Eliminar</span>
          </button>
        </div>
      </div>
    </div>
  );
}
