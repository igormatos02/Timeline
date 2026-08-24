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
  const [deleteSubsequent, setDeleteSubsequent] = useState(true);

  useEffect(() => {
    if (isOpen) {
      setDeleteSubsequent(true);
    }
  }, [isOpen, event]);

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
  ) && event.periodicity !== 'unico' && event.periodicity !== 'pontual' && event.category !== 'saida_esporadica' && event.category !== 'entrada_esporadica';

  const isIncome = event.isIncome || event.financialType === 'entrada' || (event.category && event.category.includes('entrada'));
  const isExpense = event.isExpense || event.financialType === 'gasto' || (event.category && event.category.includes('saida')) || event.category === 'gasto';
  const isInvestment = event.isInvestment || event.financialType === 'investimento' || (event.category && event.category.includes('investimento'));

  const formattedDate = event.date
    ? format(parseISO(event.date), "d 'de' MMMM 'de' yyyy", { locale: pt })
    : '';

  const handleDelete = () => {
    if (onConfirmDelete) {
      onConfirmDelete(event.id, isRecurring ? deleteSubsequent : false);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
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
                Confirmação de exclusão
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
            padding: '14px 16px',
            marginBottom: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
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

        {/* Warning Text */}
        <p style={{ margin: '0 0 16px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
          Tem a certeza que deseja eliminar este movimento? Esta ação não pode ser desfeita.
        </p>

        {/* Recurring Propagation Switch */}
        {isRecurring && (
          <div
            onClick={() => setDeleteSubsequent(!deleteSubsequent)}
            style={{
              background: deleteSubsequent ? 'rgba(244, 63, 94, 0.08)' : 'var(--bg-app)',
              border: deleteSubsequent ? '1px solid rgba(244, 63, 94, 0.35)' : '1px solid var(--border-glass)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '20px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'flex-start',
              justifyContent: 'space-between',
              gap: '12px',
              transition: 'all 0.2s ease',
              userSelect: 'none'
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              <span
                style={{
                  fontSize: '0.84rem',
                  fontWeight: '700',
                  color: deleteSubsequent ? '#f43f5e' : 'var(--text-main)'
                }}
              >
                Eliminar ocorrências subsequentes
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', lineHeight: '1.35' }}>
                {deleteSubsequent
                  ? 'Elimina este mês e todos os meses futuros da série. Os meses passados permanecem guardados.'
                  : 'Elimina apenas este registo específico. Os restantes meses da série são mantidos.'}
              </span>
            </div>

            {/* Visual Switch */}
            <div
              style={{
                width: '36px',
                height: '20px',
                background: deleteSubsequent ? '#f43f5e' : 'rgba(148, 163, 184, 0.35)',
                borderRadius: '9999px',
                position: 'relative',
                flexShrink: 0,
                marginTop: '2px',
                transition: 'background 0.2s ease'
              }}
            >
              <div
                style={{
                  width: '14px',
                  height: '14px',
                  background: '#ffffff',
                  borderRadius: '50%',
                  position: 'absolute',
                  top: '3px',
                  left: deleteSubsequent ? '19px' : '3px',
                  transition: 'left 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              />
            </div>
          </div>
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
