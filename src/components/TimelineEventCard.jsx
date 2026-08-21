import React from 'react';
import {
  Clock,
  CheckSquare,
  Edit3,
  Trash2,
  User,
  AlertCircle,
  Repeat,
  Calendar,
  Pin,
  BookOpen,
  Tag,
  CreditCard,
  TrendingDown,
  CheckCircle2,
  Circle,
  Sliders,
  DollarSign,
  Lock
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/loanCalculations';

export default function TimelineEventCard({
  event,
  onEdit,
  onDelete,
  onToggleTask,
  onToggleLoanPayment,
  onOpenEditInstallment
}) {
  const isLoanInstallment = event.category === 'parcela_emprestimo';
  const isAmortization = event.category === 'amortizacao';
  const isMemoryCard = event.category === 'memoria';

  // Category Info & Styles
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'parcela_emprestimo':
        return {
          label: 'Prestação / Parcela',
          icon: <CreditCard size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      case 'amortizacao':
        return {
          label: 'Amortização Extraordinária',
          icon: <TrendingDown size={12} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'repetitivo':
        return {
          label: 'Data Comemorativa / Aniversário',
          icon: <Repeat size={12} />,
          bg: 'rgba(236, 72, 153, 0.15)',
          color: '#f472b6',
          border: 'rgba(236, 72, 153, 0.3)'
        };
      case 'tarefa':
        return {
          label: 'Tarefa (Fixada)',
          icon: <Pin size={12} />,
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fcd34d',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'memoria':
        return {
          label: 'Memória / Nota',
          icon: <BookOpen size={12} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#6ee7b7',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      default:
        return {
          label: 'Agendamento',
          icon: <Calendar size={12} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#67e8f9',
          border: 'rgba(6, 182, 212, 0.3)'
        };
    }
  };

  const catMeta = getCategoryMeta(event.category);

  // Status Badge for Loan Installments
  const getLoanStatusBadge = () => {
    if (event.status === 'Pago' || event.isCompleted) {
      return {
        label: 'Pago',
        icon: <CheckCircle2 size={11} />,
        bg: 'rgba(16, 185, 129, 0.15)',
        color: '#10b981',
        border: 'rgba(16, 185, 129, 0.3)'
      };
    }
    if (event.status === 'Atrasada') {
      return {
        label: 'Atrasada',
        icon: <AlertCircle size={11} />,
        bg: 'rgba(239, 68, 68, 0.18)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.4)',
        pulsing: true
      };
    }
    return {
      label: 'Pendente',
      icon: <Circle size={11} />,
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
      border: 'rgba(245, 158, 11, 0.3)'
    };
  };

  const loanStatusBadge = isLoanInstallment ? getLoanStatusBadge() : null;

  // Priority Badge Color
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Urgente':
        return { bg: 'rgba(239, 68, 68, 0.15)', text: '#fca5a5', border: 'rgba(239, 68, 68, 0.3)' };
      case 'Alta':
        return { bg: 'rgba(245, 158, 11, 0.15)', text: '#fcd34d', border: 'rgba(245, 158, 11, 0.3)' };
      case 'Média':
        return { bg: 'rgba(99, 102, 241, 0.15)', text: '#a5b4fc', border: 'rgba(99, 102, 241, 0.3)' };
      default:
        return { bg: 'rgba(255, 255, 255, 0.05)', text: 'var(--text-dim)', border: 'var(--border-glass)' };
    }
  };

  const priorityStyle = getPriorityStyle(event.priority);

  // Card specific backgrounds
  let cardStyle = {};
  if (isLoanInstallment) {
    if (event.status === 'Atrasada') {
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #ef4444'
      };
    } else if (event.status === 'Pago') {
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #10b981'
      };
    } else {
      cardStyle = {
        borderLeft: '4px solid var(--primary)'
      };
    }
  } else if (isAmortization) {
    cardStyle = {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, var(--bg-card) 100%)',
      borderLeft: '4px solid #10b981',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    };
  } else if (isMemoryCard) {
    cardStyle = {
      background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(6, 182, 212, 0.06) 100%)',
      borderColor: 'rgba(16, 185, 129, 0.3)'
    };
  }

  const totalAmountWithInterest = (Number(event.amount) || 0) + (Number(event.interestAmount) || 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.25 }}
      className={`event-card ${isMemoryCard ? 'memory-card' : ''}`}
      style={cardStyle}
    >
      {/* Top Header */}
      <div className="event-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Nature Category Badge */}
          <span
            className="badge"
            style={{
              backgroundColor: catMeta.bg,
              color: catMeta.color,
              borderColor: catMeta.border
            }}
          >
            {catMeta.icon} {catMeta.label}
          </span>

          {/* Loan Installment Status Badge (Pago / Pendente / Atrasada) */}
          {loanStatusBadge && (
            <span
              className="badge"
              style={{
                backgroundColor: loanStatusBadge.bg,
                color: loanStatusBadge.color,
                borderColor: loanStatusBadge.border,
                fontWeight: '700'
              }}
            >
              {loanStatusBadge.icon} {loanStatusBadge.label}
            </span>
          )}

          <h3 className="event-title">{event.title}</h3>

          {event.priority && !isLoanInstallment && (
            <span
              className="badge"
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.text,
                borderColor: priorityStyle.border
              }}
            >
              <AlertCircle size={10} /> {event.priority}
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {isLoanInstallment && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
              <div style={{ fontSize: '1.15rem', fontWeight: '800', color: event.status === 'Pago' ? '#10b981' : event.status === 'Atrasada' ? '#ef4444' : 'var(--text-main)' }}>
                {formatCurrency(totalAmountWithInterest)}
              </div>
              {event.interestAmount > 0 && (
                <div style={{ fontSize: '0.72rem', color: '#f87171', fontWeight: '600' }}>
                  (inclui +{formatCurrency(event.interestAmount)} juros)
                </div>
              )}
            </div>
          )}

          {isAmortization && (
            <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#10b981' }}>
              -{formatCurrency(event.amount)}
            </div>
          )}

          {event.time && !isLoanInstallment && (
            <div className="event-time-chip">
              <Clock size={13} />
              <span>{event.time}</span>
            </div>
          )}
        </div>
      </div>

      {/* Loan Installment Financial Details Bar */}
      {isLoanInstallment && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'var(--bg-glass)',
            border: '1px solid var(--border-glass)',
            margin: '10px 0 12px 0',
            flexWrap: 'wrap'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            {/* Capital / Dívida Amortizada */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                🏦 Capital (Dívida)
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {formatCurrency(event.principalAmount !== undefined ? event.principalAmount : Math.round((Number(event.amount) || 0) * 0.82))}
              </span>
            </div>

            {/* Juros Embutidos */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                📈 Juros
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f59e0b' }}>
                {formatCurrency(event.interestPortion !== undefined ? event.interestPortion : Math.round((Number(event.amount) || 0) * 0.18))}
              </span>
            </div>

            {/* Juros Extra de Mora se Atrasada */}
            {event.interestAmount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase', fontWeight: '700' }}>
                  ⚠️ Mora / Atraso
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f87171' }}>
                  +{formatCurrency(event.interestAmount)}
                </span>
              </div>
            )}

            {/* Saldo Devedor Restante */}
            {event.balanceAfter !== undefined && (
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Saldo Devedor Restante
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                  {formatCurrency(event.balanceAfter)}
                </span>
              </div>
            )}
          </div>

          {/* Inline Loan Payment Fast Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={() => onToggleLoanPayment && onToggleLoanPayment(event.id)}
              className="btn btn-sm"
              style={{
                background: event.status === 'Pago' ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-card)',
                color: event.status === 'Pago' ? '#10b981' : 'var(--text-main)',
                border: `1px solid ${event.status === 'Pago' ? 'rgba(16, 185, 129, 0.3)' : 'var(--border-glass)'}`,
                padding: '4px 10px',
                fontSize: '0.78rem'
              }}
            >
              {event.status === 'Pago' ? (
                <>
                  <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                  <span>Liquidada (Marcar Pendente)</span>
                </>
              ) : (
                <>
                  <Circle size={13} style={{ color: '#f59e0b' }} />
                  <span>Marcar como Paga</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Description / Note */}
      {event.description && (
        <p className="event-description" style={isMemoryCard ? { fontStyle: 'italic', color: '#e2e8f0' } : {}}>
          {isMemoryCard && '📝 '}
          {event.description}
        </p>
      )}

      {/* Subtasks Checklist */}
      {event.tasks && event.tasks.length > 0 && (
        <div className="event-tasks-box">
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <CheckSquare size={13} />
            <span>Checklist ({event.tasks.filter((t) => t.completed).length}/{event.tasks.length})</span>
          </div>
          {event.tasks.map((task, idx) => (
            <div
              key={idx}
              className={`task-item ${task.completed ? 'completed' : ''}`}
              onClick={() => onToggleTask && onToggleTask(event.id, idx)}
            >
              <div className="task-checkbox">
                {task.completed && '✓'}
              </div>
              <span>{task.text}</span>
            </div>
          ))}
        </div>
      )}

      {/* Footer Meta & Actions */}
      <div className="event-card-footer">
        <div className="tag-list">
          {/* Custom Labels / Etiquetas */}
          {event.labels && event.labels.map((lbl, i) => (
            <span
              key={i}
              className="event-tag"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px'
              }}
            >
              <Tag size={10} /> {lbl}
            </span>
          ))}

          {event.author && (
            <span className="event-tag" style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <User size={10} /> {event.author}
            </span>
          )}
        </div>

        <div className="event-card-actions">
          {/* Loan Installment Specific Actions */}
          {isLoanInstallment ? (
            <>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => onOpenEditInstallment && onOpenEditInstallment(event)}
                style={{ padding: '4px 10px', fontSize: '0.76rem', gap: '4px' }}
                title="Ajustar valor da parcela, juros ou propagar para a frente"
              >
                <Sliders size={13} />
                <span>Ajustar / Juros</span>
              </button>

              <span
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.72rem',
                  color: 'var(--text-dim)',
                  marginLeft: '4px'
                }}
                title="Prestações contratuais são protegidas e não podem ser eliminadas"
              >
                <Lock size={12} />
              </span>
            </>
          ) : (
            <>
              <button
                className="action-icon-btn"
                onClick={() => onEdit(event)}
                title="Editar Evento"
              >
                <Edit3 size={15} />
              </button>
              <button
                className="action-icon-btn delete"
                onClick={() => onDelete(event.id)}
                title="Eliminar Evento"
              >
                <Trash2 size={15} />
              </button>
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}
