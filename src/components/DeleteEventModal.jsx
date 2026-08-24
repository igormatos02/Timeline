import React, { useState, useEffect } from 'react';
import { Trash2, AlertTriangle, X, Calendar, DollarSign, Repeat, ArrowRight } from 'lucide-react';
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
    <div
      className="modal-overlay"
      onClick={onClose}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px'
      }}
    >
      <div
        className="modal-content glass-panel"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '460px',
          padding: '24px',
          borderRadius: '16px',
          border: '1px solid rgba(244, 63, 94, 0.35)',
          background: 'linear-gradient(135deg, rgba(30, 27, 75, 0.95) 0%, rgba(15, 23, 42, 0.98) 100%)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(244, 63, 94, 0.15)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(244, 63, 94, 0.15)',
                border: '1px solid rgba(244, 63, 94, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#f43f5e'
              }}
            >
              <Trash2 size={20} strokeWidth={2.2} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '800', color: 'var(--text-main)' }}>
                Eliminar Registo
              </h3>
              <span style={{ fontSize: '0.76rem', color: 'var(--text-dim)' }}>
                Confirmação de exclusão
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-dim)',
              cursor: 'pointer',
              padding: '6px',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Item Summary Card */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            border: '1px solid var(--border-glass)',
            borderRadius: '12px',
            padding: '14px 16px',
            marginBottom: '18px',
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
        <p style={{ margin: '0 0 18px 0', fontSize: '0.86rem', color: 'var(--text-muted)', lineHeight: '1.45' }}>
          Tem a certeza que deseja eliminar este movimento? Esta ação não pode ser revertida.
        </p>

        {/* Recurring Propagation Switch */}
        {isRecurring && (
          <div
            onClick={() => setDeleteSubsequent(!deleteSubsequent)}
            style={{
              background: deleteSubsequent ? 'rgba(244, 63, 94, 0.08)' : 'rgba(255, 255, 255, 0.02)',
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
                  color: deleteSubsequent ? '#f87171' : 'var(--text-main)'
                }}
              >
                Eliminar ocorrências subsequentes
              </span>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', lineHeight: '1.35' }}>
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
              boxShadow: '0 4px 14px rgba(244, 63, 94, 0.4)',
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
