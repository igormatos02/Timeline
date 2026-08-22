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
  TrendingUp,
  CheckCircle2,
  Circle,
  Sliders,
  DollarSign,
  Lock,
  ArrowUpRight,
  ExternalLink,
  Sparkles,
  Gift
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/loanCalculations';

export default function TimelineEventCard({
  event,
  currentTimelineId,
  onEdit,
  onDelete,
  onToggleTask,
  onToggleLoanPayment,
  onOpenEditInstallment,
  onNavigateToTimeline
}) {
  const todayStr = '2026-08-21';
  const isLoanInstallment = event.category === 'parcela_emprestimo';
  const isAmortization = event.category === 'amortizacao';
  const isIncomeEvent = event.isIncome || event.category === 'entrada_recorrente' || event.category === 'entrada_esporadica';
  const isReceivedIncome = isIncomeEvent && event.status === 'Recebido';
  const isOverdueIncome = isIncomeEvent && event.date < todayStr && !isReceivedIncome;
  const isNextIncome = isIncomeEvent && event.date >= todayStr && event.date <= '2026-08-31' && !isReceivedIncome;
  const isFarFutureIncome = isIncomeEvent && event.date > '2026-08-31' && !isReceivedIncome;
  const isMemoryCard = event.category === 'memoria';

  // Category Info & Styles
  const getCategoryMeta = (cat) => {
    switch (cat) {
      case 'entrada_recorrente':
        return {
          label: 'Entrada Recorrente (Salário)',
          icon: <DollarSign size={12} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'entrada_esporadica':
        return {
          label: 'Entrada Extra / Bónus',
          icon: <Gift size={12} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#06b6d4',
          border: 'rgba(6, 182, 212, 0.3)'
        };
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

  // Status Badge for Loan Installments or Income
  const getCustomStatusBadge = () => {
    if (isIncomeEvent) {
      if (isReceivedIncome) {
        return {
          label: 'Recebido',
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueIncome) {
        return {
          label: 'Em Atraso',
          icon: <AlertCircle size={11} />,
          bg: 'rgba(239, 68, 68, 0.18)',
          color: '#f87171',
          border: 'rgba(239, 68, 68, 0.4)',
          pulsing: true
        };
      }
      if (isNextIncome) {
        return {
          label: 'Próxima Entrada',
          icon: <Clock size={11} />,
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: 'rgba(59, 130, 246, 0.35)'
        };
      }
      return {
        label: 'A Receber',
        icon: <Clock size={11} />,
        bg: 'rgba(148, 163, 184, 0.1)',
        color: '#94a3b8',
        border: 'rgba(148, 163, 184, 0.2)'
      };
    }

    if (isLoanInstallment) {
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
    }

    return null;
  };

  const statusBadge = getCustomStatusBadge();

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
  if (isIncomeEvent) {
    if (isOverdueIncome) {
      // 🔴 Entrada em Atraso (Data anterior a hoje e ainda não recebida)
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.09) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #ef4444',
        borderColor: 'rgba(239, 68, 68, 0.35)'
      };
    } else if (isReceivedIncome) {
      // 🟢 Entradas Já Recebidas / Confirmadas (Verde)
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.07) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #10b981',
        borderColor: 'rgba(16, 185, 129, 0.25)'
      };
    } else if (isNextIncome) {
      // 🔵 Próxima Entrada Imediata (Azul)
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.09) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #3b82f6',
        borderColor: 'rgba(59, 130, 246, 0.3)'
      };
    } else {
      // ⚪ Entradas Futuras Posteriores (Cinza / Previstas)
      cardStyle = {
        background: 'rgba(255, 255, 255, 0.02)',
        borderLeft: '4px solid #64748b',
        borderColor: 'var(--border-glass)'
      };
    }
  } else if (isLoanInstallment) {
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
      borderLeft: '4px solid #06b6d4',
      fontFamily: 'inherit'
    };
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
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

          {/* Timeline Origin Badge (Crédito Habitação vs Automóvel vs Entradas) - Clickable, shown only when not inside that timeline */}
          {event.timelineOriginName && event.timelineOriginId !== currentTimelineId && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onNavigateToTimeline && event.timelineOriginId) {
                  onNavigateToTimeline(event.timelineOriginId);
                }
              }}
              className="badge"
              style={{
                backgroundColor:
                  event.timelineOriginId === 'tl-loan-house'
                    ? 'rgba(16, 185, 129, 0.15)'
                    : event.timelineOriginId === 'tl-income'
                      ? 'rgba(6, 182, 212, 0.15)'
                      : 'rgba(99, 102, 241, 0.15)',
                color:
                  event.timelineOriginId === 'tl-loan-house'
                    ? '#10b981'
                    : event.timelineOriginId === 'tl-income'
                      ? '#06b6d4'
                      : 'var(--primary-light)',
                borderColor:
                  event.timelineOriginId === 'tl-loan-house'
                    ? 'rgba(16, 185, 129, 0.3)'
                    : event.timelineOriginId === 'tl-income'
                      ? 'rgba(6, 182, 212, 0.3)'
                      : 'rgba(99, 102, 241, 0.3)',
                fontWeight: '700',
                cursor: onNavigateToTimeline ? 'pointer' : 'default',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title={`Navegar para a timeline dedicada de ${event.timelineOriginName}`}
            >
              <span>{event.timelineOriginIcon || '📌'}</span>
              <span>{event.timelineOriginName}</span>
              {onNavigateToTimeline && <ArrowUpRight size={11} />}
            </button>
          )}

          {/* Clean event title without trailing values in parentheses */}
          <h3 className="event-title">
            {(event.title || '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')}
          </h3>

          {event.priority && !isLoanInstallment && !isIncomeEvent && (
            <span
              className="badge"
              style={{
                backgroundColor: priorityStyle.bg,
                color: priorityStyle.text,
                borderColor: priorityStyle.border
              }}
            >
              {event.priority}
            </span>
          )}
        </div>

        {event.time && (
          <div className="event-time" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Clock size={12} />
            <span>{event.time}</span>
          </div>
        )}
      </div>

      {/* 💰 Income (Entrada) Financial Highlight Strip */}
      {isIncomeEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: isNextIncome
              ? 'rgba(59, 130, 246, 0.08)'
              : isFarFutureIncome
                ? 'rgba(255, 255, 255, 0.02)'
                : 'rgba(16, 185, 129, 0.08)',
            border: isNextIncome
              ? '1px solid rgba(59, 130, 246, 0.28)'
              : isFarFutureIncome
                ? '1px solid var(--border-glass)'
                : '1px solid rgba(16, 185, 129, 0.22)',
            borderRadius: '10px',
            padding: '8px 12px',
            margin: '10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Valor a Receber / Creditado
              </span>
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: isNextIncome ? '#60a5fa' : isFarFutureIncome ? '#94a3b8' : '#10b981'
                }}
              >
                +{formatCurrency(event.amount)}
              </span>
            </div>
          </div>

          {/* Interactive Status Toggle Pill for Income */}
          {isIncomeEvent && (
            <button
              type="button"
              disabled={event.date > todayStr}
              onClick={() => {
                if (event.date <= todayStr && onToggleLoanPayment) {
                  onToggleLoanPayment(event.id);
                }
              }}
              className="btn btn-sm"
              style={{
                background: isReceivedIncome
                  ? 'rgba(16, 185, 129, 0.16)'
                  : isOverdueIncome
                    ? 'rgba(239, 68, 68, 0.16)'
                    : isNextIncome
                      ? 'rgba(59, 130, 246, 0.12)'
                      : 'rgba(148, 163, 184, 0.1)',
                color: isReceivedIncome
                  ? '#10b981'
                  : isOverdueIncome
                    ? '#f87171'
                    : isNextIncome
                      ? '#60a5fa'
                      : '#94a3b8',
                border: `1px solid ${isReceivedIncome
                    ? 'rgba(16, 185, 129, 0.35)'
                    : isOverdueIncome
                      ? 'rgba(239, 68, 68, 0.4)'
                      : isNextIncome
                        ? 'rgba(59, 130, 246, 0.3)'
                        : 'rgba(148, 163, 184, 0.2)'
                  }`,
                borderRadius: '9999px',
                padding: '5px 14px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: event.date > todayStr ? 'default' : 'pointer',
                opacity: event.date > todayStr ? 0.75 : 1,
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: isOverdueIncome
                  ? '0 2px 10px rgba(239, 68, 68, 0.25)'
                  : isReceivedIncome
                    ? '0 2px 8px rgba(16, 185, 129, 0.2)'
                    : 'none',
                animation: isOverdueIncome ? 'pulseGlow 2s infinite' : 'none'
              }}
              title={
                event.date > todayStr
                  ? 'Entrada futura (só pode ser recebida na data prevista)'
                  : isReceivedIncome
                    ? 'Clique para marcar como A Receber'
                    : isOverdueIncome
                      ? 'Entrada em atraso! Clique para confirmar recebimento'
                      : 'Clique para marcar como Recebido'
              }
            >
              {isReceivedIncome ? (
                <>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span>Recebido</span>
                </>
              ) : isOverdueIncome ? (
                <>
                  <AlertCircle size={14} style={{ color: '#f87171' }} />
                  <span>Em Atraso</span>
                </>
              ) : (
                <>
                  <Clock size={14} style={{ color: isNextIncome ? '#60a5fa' : '#94a3b8' }} />
                  <span>A Receber</span>
                </>
              )}
            </button>
          )}
        </div>
      )}

      {/* 🏦 Loan Installment Principal / Interest Breakdown Strip */}
      {isLoanInstallment && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'var(--bg-app)',
            border: '1px solid var(--border-glass)',
            borderRadius: '10px',
            padding: '8px 12px',
            margin: '10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            {/* Valor Total da Parcela */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Total da Parcela
              </span>
              <span style={{ fontSize: '1rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {formatCurrency(Number(event.amount) + Number(event.interestAmount || 0))}
              </span>
            </div>

            {/* Decomposição: Capital Amortizado */}
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
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
          {/* Botão para ir para a timeline dedicada do evento quando na visão consolidada */}
          {event.timelineOriginId && event.timelineOriginId !== currentTimelineId && onNavigateToTimeline && (
            <button
              type="button"
              className="btn btn-outline btn-sm"
              onClick={() => onNavigateToTimeline(event.timelineOriginId)}
              style={{
                padding: '4px 10px',
                fontSize: '0.74rem',
                gap: '4px',
                color:
                  event.timelineOriginId === 'tl-loan-house'
                    ? '#10b981'
                    : event.timelineOriginId === 'tl-income'
                      ? '#06b6d4'
                      : 'var(--primary-light)',
                borderColor: 'var(--border-glass)'
              }}
              title={`Abrir timeline de ${event.timelineOriginName}`}
            >
              <ArrowUpRight size={13} />
              <span>Ver na Timeline ({event.timelineOriginName})</span>
            </button>
          )}

          {/* Loan Installment Specific Actions */}
          {isLoanInstallment ? (
            <>
              {/* Ajustar / Juros exibido APENAS em parcelas em aberto (Pendentes ou Atrasadas) */}
              {event.status !== 'Pago' && (
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => onOpenEditInstallment && onOpenEditInstallment(event)}
                  style={{ padding: '4px 10px', fontSize: '0.76rem', gap: '4px' }}
                  title="Ajustar valor da parcela, juros ou propagar para a frente"
                >
                  <Sliders size={13} />
                  <span>Ajustar / Juros</span>
                </button>
              )}

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
