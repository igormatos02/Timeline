import React, { useState } from 'react';
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
  Gift,
  MinusCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  FileText,
  Home,
  Car,
  Layers,
  Zap,
  ShoppingCart,
  PiggyBank
} from 'lucide-react';
import { motion } from 'framer-motion';
import { formatCurrency } from '../utils/loanCalculations';

export default function TimelineEventCard({
  event,
  currentTimelineId,
  timelineType,
  activeFinancialTab = 'balanco',
  onEdit,
  onUpdateEventDirect,
  onDelete,
  onToggleTask,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onToggleLoanPayment,
  onOpenEditInstallment,
  onNavigateToTimeline
}) {
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const isBalanceView = timelineType === 'Principal' || activeFinancialTab === 'balanco';
  const todayStr = '2026-08-21';
  const isLoanInstallment = event.category === 'parcela_emprestimo';
  const isAmortization = event.category === 'amortizacao';
  const isIncomeEvent = (event.isIncome || event.financialType === 'entrada' || event.category === 'entrada_recorrente' || event.category === 'entrada_esporadica') && !event.isExpense && !event.isInvestment;
  const isExpenseEvent = event.isExpense || event.financialType === 'gasto' || (event.category && event.category.startsWith('saida')) || event.category === 'gasto';
  const isInvestmentEvent = event.isInvestment || event.financialType === 'investimento' || (event.category && event.category.startsWith('investimento'));

  const isReceivedIncome = isIncomeEvent && (event.status === 'Recebido' || event.isCompleted);
  const isOverdueIncome = isIncomeEvent && event.date < todayStr && !isReceivedIncome;
  const isNextIncome = isIncomeEvent && event.date >= todayStr && event.date <= '2026-08-31' && !isReceivedIncome;
  const isFarFutureIncome = isIncomeEvent && event.date > '2026-08-31' && !isReceivedIncome;

  const isPaidExpense = isExpenseEvent && (event.status === 'Pago' || event.isCompleted);
  const isCompletedInvestment = isInvestmentEvent && (event.status === 'Investido' || event.status === 'Pago' || event.isCompleted);

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
      case 'saida_recorrente':
        return {
          label: 'Gasto Recorrente / Fixo',
          icon: <CreditCard size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'saida_esporadica':
      case 'gasto':
        return {
          label: 'Gasto / Saída',
          icon: <Tag size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'investimento_poupanca':
        return {
          label: 'Poupança / Reserva',
          icon: <TrendingUp size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      case 'investimento_etf':
      case 'investimento_acoes':
      case 'investimento_extra':
        return {
          label: 'Investimento / Aporte',
          icon: <Sparkles size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: '#818cf8',
          border: 'rgba(99, 102, 241, 0.3)'
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

  const getCompletedTimeStr = () => {
    return event.completedAtTime || event.time || '10:00';
  };

  // Custom Status Badges
  const getCustomStatusBadge = () => {
    if (isIncomeEvent) {
      if (isReceivedIncome) {
        return {
          label: `Recebido às ${getCompletedTimeStr()}`,
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
          label: `Liquidado às ${getCompletedTimeStr()}`,
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

    if (isPaidExpense) {
      return {
        label: `Pago às ${getCompletedTimeStr()}`,
        icon: <CheckCircle2 size={11} />,
        bg: 'rgba(244, 63, 94, 0.15)',
        color: '#f43f5e',
        border: 'rgba(244, 63, 94, 0.3)'
      };
    }

    if (isCompletedInvestment) {
      return {
        label: `Investido às ${getCompletedTimeStr()}`,
        icon: <CheckCircle2 size={11} />,
        bg: 'rgba(99, 102, 241, 0.15)',
        color: 'var(--primary-light)',
        border: 'rgba(99, 102, 241, 0.3)'
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
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #ef4444',
        borderColor: 'rgba(239, 68, 68, 0.3)'
      };
    } else if (isReceivedIncome) {
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #10b981',
        borderColor: 'rgba(16, 185, 129, 0.28)'
      };
    } else if (isNextIncome) {
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.09) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #3b82f6',
        borderColor: 'rgba(59, 130, 246, 0.3)'
      };
    } else {
      cardStyle = {
        background: 'rgba(255, 255, 255, 0.02)',
        borderLeft: '4px solid #64748b',
        borderColor: 'var(--border-glass)'
      };
    }
  } else if (isExpenseEvent) {
    cardStyle = {
      background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.06) 0%, var(--bg-card) 100%)',
      borderLeft: '4px solid #f43f5e',
      borderColor: 'rgba(244, 63, 94, 0.25)'
    };
  } else if (isInvestmentEvent) {
    cardStyle = {
      background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.06) 0%, var(--bg-card) 100%)',
      borderLeft: '4px solid #6366f1',
      borderColor: 'rgba(99, 102, 241, 0.25)'
    };
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

  const isRecurring =
    event.periodicity === 'recorrente' ||
    event.isRecurring ||
    Boolean(
      event.category &&
      (event.category.includes('recorrente') ||
       event.category === 'parcela_emprestimo' ||
       event.category === 'repetitivo')
    );

  // Event Origin / Sub-vision info for right-aligned badge (coherent with vision palettes)
  const getEventOriginInfo = () => {
    if (
      event.timelineOriginId === 'tl-loan-house' ||
      event.timelineOriginName === 'Habitação' ||
      event.timelineOriginName === 'Crédito Habitação'
    ) {
      return {
        label: 'Habitação',
        icon: <Home size={11} strokeWidth={2.4} />,
        bg: 'rgba(14, 165, 233, 0.12)',
        color: '#0ea5e9',
        border: 'rgba(14, 165, 233, 0.28)',
        timelineId: 'tl-loan-house',
        tab: null
      };
    }
    if (
      event.timelineOriginId === 'tl-loan-80004197726' ||
      event.category === 'parcela_emprestimo' ||
      event.category === 'amortizacao' ||
      isLoanInstallment
    ) {
      return {
        label: 'Automóvel',
        icon: <Car size={11} strokeWidth={2.4} />,
        bg: 'rgba(99, 102, 241, 0.12)',
        color: '#6366f1',
        border: 'rgba(99, 102, 241, 0.28)',
        timelineId: 'tl-income',
        tab: 'emprestimos'
      };
    }
    if (isExpenseEvent) {
      return {
        label: 'Gastos',
        icon: <ShoppingCart size={11} strokeWidth={2.4} />,
        bg: 'rgba(244, 63, 94, 0.12)',
        color: '#f43f5e',
        border: 'rgba(244, 63, 94, 0.28)',
        timelineId: 'tl-income',
        tab: 'gastos'
      };
    }
    if (isInvestmentEvent) {
      return {
        label: 'Investimentos',
        icon: <PiggyBank size={11} strokeWidth={2.4} />,
        bg: 'rgba(139, 92, 246, 0.12)',
        color: '#8b5cf6',
        border: 'rgba(139, 92, 246, 0.28)',
        timelineId: 'tl-income',
        tab: 'investimentos'
      };
    }
    if (isIncomeEvent) {
      return {
        label: 'Entradas',
        icon: <DollarSign size={11} strokeWidth={2.4} />,
        bg: 'rgba(16, 185, 129, 0.12)',
        color: '#10b981',
        border: 'rgba(16, 185, 129, 0.28)',
        timelineId: 'tl-income',
        tab: 'entradas'
      };
    }
    return {
      label: event.timelineOriginName || 'Financeiro',
      icon: <DollarSign size={11} strokeWidth={2.4} />,
      bg: 'rgba(16, 185, 129, 0.12)',
      color: '#10b981',
      border: 'rgba(16, 185, 129, 0.28)',
      timelineId: event.timelineOriginId || 'tl-income',
      tab: 'balanco'
    };
  };

  const originInfo = getEventOriginInfo();

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      className={`event-card ${isMemoryCard ? 'memory-card' : ''}`}
      style={cardStyle}
    >
      {/* Top Header */}
      <div
        className="event-card-header"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '10px',
          width: '100%'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: 0 }}>
          {/* Ícone de Único ou Recorrente neutro e sem fundo */}
          <span
            title={isRecurring ? 'Recorrente' : 'Único / Pontual'}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-light)',
              opacity: 0.85,
              flexShrink: 0
            }}
          >
            {isRecurring ? <Repeat size={14} strokeWidth={2.2} /> : <Zap size={14} strokeWidth={2.2} />}
          </span>

          {/* Título do evento limpo */}
          <h3 className="event-title" style={{ margin: 0 }}>
            {(event.title || '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')}
          </h3>
        </div>

        {/* Origin / Sub-vision Badge aligned to the RIGHT - ONLY on Balanço / Principal view */}
        {isBalanceView && originInfo && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onNavigateToTimeline) {
                onNavigateToTimeline(originInfo.timelineId, originInfo.tab);
              }
            }}
            className="badge"
            style={{
              backgroundColor: originInfo.bg,
              color: originInfo.color,
              borderColor: originInfo.border,
              fontWeight: '700',
              fontSize: '0.72rem',
              letterSpacing: '0.01em',
              padding: '3px 9px',
              borderRadius: '9999px',
              cursor: onNavigateToTimeline ? 'pointer' : 'default',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              marginLeft: 'auto',
              transition: 'all 0.15s ease',
              lineHeight: 1.2
            }}
            title={`Ir para a visão de ${originInfo.label}`}
          >
            {originInfo.icon}
            <span>{originInfo.label}</span>
            {onNavigateToTimeline && <ArrowUpRight size={10} style={{ opacity: 0.75, marginLeft: '1px' }} />}
          </button>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              disabled={event.date > todayStr}
              onClick={(e) => {
                e.stopPropagation();
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
                    : 'none'
              }}
            >
              {isReceivedIncome ? (
                <>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span>Recebido às {getCompletedTimeStr()}</span>
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
          </div>
        </div>
      )}

      {/* 🛒 Expense (Gasto/Saída) Financial Highlight Strip */}
      {isExpenseEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'rgba(244, 63, 94, 0.08)',
            border: '1px solid rgba(244, 63, 94, 0.22)',
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
                Valor Pago / Débito
              </span>
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: '#f43f5e'
                }}
              >
                -{formatCurrency(event.amount)}
              </span>
            </div>

            {event.priority && (
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Prioridade
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {event.priority}
                </span>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleLoanPayment) onToggleLoanPayment(event.id);
            }}
            className="btn btn-sm"
            style={{
              background: isPaidExpense ? 'rgba(244, 63, 94, 0.16)' : 'rgba(245, 158, 11, 0.14)',
              color: isPaidExpense ? '#f43f5e' : '#f59e0b',
              border: `1px solid ${isPaidExpense ? 'rgba(244, 63, 94, 0.35)' : 'rgba(245, 158, 11, 0.35)'}`,
              borderRadius: '9999px',
              padding: '5px 14px',
              fontSize: '0.78rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {isPaidExpense ? (
              <>
                <CheckCircle2 size={14} style={{ color: '#f43f5e' }} />
                <span>Pago às {getCompletedTimeStr()}</span>
              </>
            ) : (
              <>
                <Clock size={14} style={{ color: '#f59e0b' }} />
                <span>Pendente</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 📈 Investment (Investimento/Poupança) Financial Highlight Strip */}
      {isInvestmentEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'rgba(99, 102, 241, 0.08)',
            border: '1px solid rgba(99, 102, 241, 0.22)',
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
                Valor Aportado / Investimento
              </span>
              <span
                style={{
                  fontSize: '1.05rem',
                  fontWeight: '800',
                  color: 'var(--primary-light)'
                }}
              >
                +{formatCurrency(event.amount)}
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleLoanPayment) onToggleLoanPayment(event.id);
              }}
              className="btn btn-sm"
              style={{
                background: isCompletedInvestment ? 'rgba(99, 102, 241, 0.16)' : 'rgba(148, 163, 184, 0.12)',
                color: isCompletedInvestment ? 'var(--primary-light)' : '#94a3b8',
                border: `1px solid ${isCompletedInvestment ? 'rgba(99, 102, 241, 0.35)' : 'rgba(148, 163, 184, 0.3)'}`,
                borderRadius: '9999px',
                padding: '5px 14px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isCompletedInvestment ? (
                <>
                  <CheckCircle2 size={14} style={{ color: 'var(--primary-light)' }} />
                  <span>Investido às {getCompletedTimeStr()}</span>
                </>
              ) : (
                <>
                  <Clock size={14} style={{ color: '#94a3b8' }} />
                  <span>Planeado</span>
                </>
              )}
            </button>
          </div>
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
                Capital (Dívida)
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>
                {formatCurrency(event.principalAmount !== undefined ? event.principalAmount : Math.round((Number(event.amount) || 0) * 0.82))}
              </span>
            </div>

            {/* Juros Embutidos */}
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Juros
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: '#f59e0b' }}>
                {formatCurrency(event.interestPortion !== undefined ? event.interestPortion : Math.round((Number(event.amount) || 0) * 0.18))}
              </span>
            </div>

            {/* Juros Extra de Mora se Atrasada */}
            {event.interestAmount > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.7rem', color: '#f87171', textTransform: 'uppercase', fontWeight: '700' }}>
                  Mora / Atraso
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
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleLoanPayment) onToggleLoanPayment(event.id);
              }}
              className="btn btn-sm"
              style={{
                background: event.status === 'Pago'
                  ? 'rgba(16, 185, 129, 0.16)'
                  : event.status === 'Atrasada'
                    ? 'rgba(239, 68, 68, 0.16)'
                    : 'rgba(245, 158, 11, 0.14)',
                color: event.status === 'Pago'
                  ? '#10b981'
                  : event.status === 'Atrasada'
                    ? '#f87171'
                    : '#f59e0b',
                border: `1px solid ${event.status === 'Pago'
                    ? 'rgba(16, 185, 129, 0.35)'
                    : event.status === 'Atrasada'
                      ? 'rgba(239, 68, 68, 0.4)'
                      : 'rgba(245, 158, 11, 0.35)'
                  }`,
                borderRadius: '9999px',
                padding: '5px 14px',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.2s',
                boxShadow: event.status === 'Pago'
                  ? '0 2px 8px rgba(16, 185, 129, 0.2)'
                  : 'none'
              }}
            >
              {event.status === 'Pago' ? (
                <>
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span>Liquidado às {getCompletedTimeStr()}</span>
                </>
              ) : event.status === 'Atrasada' ? (
                <>
                  <AlertCircle size={14} style={{ color: '#f87171' }} />
                  <span>Atrasada</span>
                </>
              ) : (
                <>
                  <Clock size={14} style={{ color: '#f59e0b' }} />
                  <span>Pendente</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Expandable Notes Section (Glassmorphism) */}
      {(() => {
        const allNotes = Array.isArray(event.notes)
          ? event.notes.filter(Boolean)
          : (event.description && !event.description.toLowerCase().includes('transferência bancária de vencimento') && event.description.trim() ? [event.description.trim()] : []);
        const hasNotes = allNotes.length > 0;

        if (!isNotesExpanded) return null;

        return (
          <div
            style={{
              marginTop: '10px',
              marginBottom: '10px',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', fontWeight: '700', color: hasNotes ? '#f59e0b' : 'var(--text-muted)' }}>
                <FileText size={14} style={{ color: hasNotes ? '#f59e0b' : 'var(--text-dim)' }} />
                <span>Notas do Movimento ({allNotes.length})</span>
              </div>
              <button
                type="button"
                onClick={() => setIsNotesExpanded(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.72rem',
                  padding: '2px 6px'
                }}
              >
                ✕ Fechar
              </button>
            </div>

            {/* List of existing notes */}
            {hasNotes ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {allNotes.map((note, idx) => (
                  <div
                    key={idx}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      gap: '8px',
                      fontSize: '0.78rem',
                      color: 'var(--text-main)',
                      padding: '6px 10px',
                      background: 'rgba(255, 255, 255, 0.04)',
                      borderRadius: '6px',
                      borderLeft: '3px solid #f59e0b'
                    }}
                  >
                    <span style={{ flex: 1, lineHeight: '1.45' }}>{note}</span>
                    {(onUpdateEventDirect || onEdit) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const updatedNotes = allNotes.filter((_, nIdx) => nIdx !== idx);
                          const updatedEvent = {
                            ...event,
                            notes: updatedNotes,
                            description: updatedNotes[0] || ''
                          };
                          if (onUpdateEventDirect) {
                            onUpdateEventDirect(updatedEvent);
                          }
                        }}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-dim)',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center'
                        }}
                        title="Eliminar esta nota"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <span style={{ fontSize: '0.74rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                Nenhuma nota adicionada ainda.
              </span>
            )}

            {/* Add New Note Input Form */}
            {(onUpdateEventDirect || onEdit) && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (newItemText.trim()) {
                    const updatedNotes = [...allNotes, newItemText.trim()];
                    const updatedEvent = {
                      ...event,
                      notes: updatedNotes,
                      description: updatedNotes[0] || ''
                    };
                    if (onUpdateEventDirect) {
                      onUpdateEventDirect(updatedEvent);
                    }
                    setNewItemText('');
                  }
                }}
                onClick={(e) => e.stopPropagation()}
                style={{ display: 'flex', gap: '6px', marginTop: '4px' }}
              >
                <input
                  type="text"
                  placeholder="Escrever uma nova nota..."
                  value={newItemText}
                  onChange={(e) => setNewItemText(e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    flex: 1,
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.76rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newItemText.trim()}
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-primary btn-sm"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.74rem',
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#ffffff',
                    border: 'none',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Adicionar nota"
                >
                  <Plus size={13} />
                  <span>Adicionar</span>
                </button>
              </form>
            )}
          </div>
        );
      })()}

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

              {/* Botão de Notas para parcelas */}
              {onEdit && (() => {
                const allNotes = Array.isArray(event.notes)
                  ? event.notes.filter(Boolean)
                  : (event.description && !event.description.toLowerCase().includes('transferência bancária de vencimento') && event.description.trim() ? [event.description.trim()] : []);
                const hasNotes = allNotes.length > 0;

                return (
                  <button
                    type="button"
                    className="action-icon-btn"
                    onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                    title={hasNotes ? `Ver / Editar Notas (${allNotes.length})` : "Adicionar Nota"}
                    style={{
                      color: hasNotes ? '#f59e0b' : 'var(--text-dim)',
                      background: hasNotes ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                      border: hasNotes ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FileText size={14} />
                    {hasNotes && (
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#f59e0b' }}>
                        {allNotes.length}
                      </span>
                    )}
                  </button>
                );
              })()}

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
              {onEdit && (() => {
                const allNotes = Array.isArray(event.notes)
                  ? event.notes.filter(Boolean)
                  : (event.description && !event.description.toLowerCase().includes('transferência bancária de vencimento') && event.description.trim() ? [event.description.trim()] : []);
                const hasNotes = allNotes.length > 0;

                return (
                  <button
                    type="button"
                    className="action-icon-btn"
                    onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                    title={hasNotes ? `Ver / Editar Notas (${allNotes.length})` : "Adicionar Nota"}
                    style={{
                      color: hasNotes ? '#f59e0b' : 'var(--text-dim)',
                      background: hasNotes ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
                      border: hasNotes ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
                      borderRadius: '6px',
                      padding: '4px 6px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <FileText size={15} />
                    {hasNotes && (
                      <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#f59e0b' }}>
                        {allNotes.length}
                      </span>
                    )}
                  </button>
                );
              })()}
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
