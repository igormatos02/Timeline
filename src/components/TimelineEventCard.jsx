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
  PiggyBank,
  Landmark,
  Unlock,
  Check,
  X,
  Target
} from 'lucide-react';
import { formatCurrency } from '../utils/loanCalculations';
import { generateUUID } from '../utils/uuid';
import { useTranslation } from '../i18n/LanguageContext.jsx';

export default function TimelineEventCard({
  event,
  allEvents = [],
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
  const { t, language } = useTranslation();
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [localAuto, setLocalAuto] = React.useState(Boolean(event.automatic || event.isAutomatic));
  const [localStatus, setLocalStatus] = React.useState(event.status);

  React.useEffect(() => {
    setLocalAuto(Boolean(event.automatic || event.isAutomatic));
    setLocalStatus(event.status);
  }, [event.automatic, event.isAutomatic, event.status]);

  const isBalanceView = timelineType === 'Principal' || activeFinancialTab === 'balanco';
  const todayStr = '2026-08-21';
  const effectiveStatus = (localStatus || event.status || '').toLowerCase();
  const isAmortization = event.category === 'amortizacao' || event.financialType === 'amortization';
  const isLoanInstallment = (event.category === 'parcela_emprestimo' || (event.isSystemLoanEvent && !isAmortization) || event.timelineOriginId === 'tl-loan-jeep' || event.timelineOriginId === 'tl-loan-dacia' || event.timelineOriginId === 'tl-loan-casa1' || event.timelineOriginId === 'tl-loan-casa2' || event.timelineOriginId === 'tl-loan-80004197726') && !isAmortization && event.category !== 'investimento_patrimonio';
  const isIncomeEvent = (event.isIncome || event.financialType === 'income' || event.financialType === 'entrada' || event.category === 'entrada_recorrente' || event.category === 'entrada_esporadica') && !event.isExpense && !event.isInvestment && !isLoanInstallment && !isAmortization;
  const isExpenseEvent = (event.isExpense || event.financialType === 'expense' || event.financialType === 'gasto' || (event.category && event.category.startsWith('saida')) || event.category === 'gasto') && !isLoanInstallment && !isAmortization && !event.isInvestment;
  const isInvestmentEvent = (event.isInvestment || event.financialType === 'investment' || event.financialType === 'investimento' || (event.category && event.category.startsWith('investimento'))) && !isLoanInstallment && !isAmortization;

  const isRecurringEvent = Boolean(
    event.isRecurring ||
    event.periodicity === 'recurring' ||
    event.periodicity === 'recorrente' ||
    event.periodicity === 'period' ||
    event.periodicity === 'periodo' ||
    event.eventId || event.seriesId ||
    isLoanInstallment ||
    event.category === 'entrada_recorrente' ||
    event.category === 'saida_recorrente' ||
    event.category === 'investimento_poupanca' ||
    event.category === 'parcela_emprestimo'
  );

  const isInertFuture = event.date > '2026-08-31';

  const isCompleted =
    effectiveStatus === 'paid' ||
    effectiveStatus === 'pago' ||
    effectiveStatus === 'received' ||
    effectiveStatus === 'recebido' ||
    effectiveStatus === 'invested' ||
    effectiveStatus === 'investido' ||
    effectiveStatus === 'liquidado' ||
    effectiveStatus === 'completed' ||
    effectiveStatus === 'concluído' ||
    effectiveStatus === 'amortized' ||
    effectiveStatus === 'amortizado' ||
    Boolean(event.isCompleted);

  const isOverdue = Boolean(
    event.date &&
    event.date < todayStr &&
    !isCompleted &&
    effectiveStatus !== 'cancelled' &&
    effectiveStatus !== 'cancelado' &&
    effectiveStatus !== 'deleted' &&
    effectiveStatus !== 'excluido'
  );

  const isReceivedIncome = isIncomeEvent && isCompleted;
  const isOverdueIncome = isIncomeEvent && isOverdue;
  const isNextIncome = isIncomeEvent && event.date >= todayStr && event.date <= '2026-08-31' && !isReceivedIncome;
  const isFarFutureIncome = isIncomeEvent && event.date > '2026-08-31' && !isReceivedIncome;

  const isPaidExpense = isExpenseEvent && isCompleted;
  const isOverdueExpense = isExpenseEvent && isOverdue;

  const isCompletedInvestment = isInvestmentEvent && isCompleted;
  const isOverdueInvestment = isInvestmentEvent && isOverdue;

  const isPaidLoan = isLoanInstallment && (effectiveStatus === 'paid' || effectiveStatus === 'pago' || effectiveStatus === 'liquidado' || event.isCompleted);
  const isOverdueLoan = isLoanInstallment && (isOverdue || effectiveStatus === 'overdue' || effectiveStatus === 'atrasada');
  const isAbatida = effectiveStatus === 'abatida' || Boolean(event.isAbatida) || (Array.isArray(event.labels) && event.labels.includes('Abatida'));

  const abatedBreakdown = React.useMemo(() => {
    if (!isAbatida) return null;
    let origCapital = 0;
    let origInterest = 0;
    const origTotal = Number(event.originalAmount || (Number(event.amount) > 0 ? event.amount : 218.47));

    if (event.description) {
      const match = event.description.match(/\(([\d\s.,]+)\s*€?\s*capital\s*\+\s*([\d\s.,]+)\s*€?\s*juros/i);
      if (match && match[1] && match[2]) {
        origCapital = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
        origInterest = parseFloat(match[2].replace(/\s/g, '').replace(',', '.'));
      }
    }
    if (!origCapital || isNaN(origCapital)) {
      origCapital = Math.round(origTotal * 0.85 * 100) / 100;
      origInterest = Math.round((origTotal - origCapital) * 100) / 100;
    }
    return { origTotal, origCapital, origInterest };
  }, [isAbatida, event.description, event.originalAmount, event.amount]);

  const isLocked = event.isLocked !== undefined ? !!event.isLocked : (isCompleted || isAbatida);

  const [isEditingAmount, setIsEditingAmount] = useState(false);
  const [tempAmount, setTempAmount] = useState(event.amount !== undefined ? event.amount : '');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(event.title || '');
  const [propagateSubsequent, setPropagateSubsequent] = useState(true);
  const [isDesmembramentoExpanded, setIsDesmembramentoExpanded] = useState(false);
  const [draftSubparts, setDraftSubparts] = useState([]);
  const [newSubpartName, setNewSubpartName] = useState('');
  const [newSubpartAmount, setNewSubpartAmount] = useState('');
  const [editingSubpartIdx, setEditingSubpartIdx] = useState(null);

  const hasBreakdown = Array.isArray(event.breakdownItems) && event.breakdownItems.length > 0;

  React.useEffect(() => {
    setTempAmount(event.amount !== undefined ? event.amount : '');
  }, [event.amount]);

  React.useEffect(() => {
    setTempTitle(event.title || '');
  }, [event.title]);

  // Lock rule: locked events cannot be edited (unless in future months where lock doesn't apply)
  const canEditAmount = isInertFuture || !isLocked;

  const isRecurring = Boolean(
    event.periodicity === 'recorrente' ||
    event.isRecurring === true ||
    Boolean(event.eventId || event.seriesId) ||
    Boolean(
      event.category &&
      (event.category.includes('recorrente') ||
       event.category === 'parcela_emprestimo' ||
       event.category === 'repetitivo')
    )
  ) && event.periodicity !== 'unico' && event.periodicity !== 'pontual' && event.category !== 'saida_esporadica' && event.category !== 'entrada_esporadica';

  const handleSaveAmount = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const num = Number(tempAmount);
    if (!isNaN(num) && num >= 0 && onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        amount: num,
        propagateForward: isRecurring ? propagateSubsequent : false
      });
    }
    setIsEditingAmount(false);
  };

  const handleCancelAmount = (e) => {
    if (e) e.stopPropagation();
    setTempAmount(event.amount !== undefined ? event.amount : '');
    setIsEditingAmount(false);
  };

  // Handlers para edição inline do Título / Nome
  const handleSaveTitle = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = tempTitle.trim();
    if (trimmed && trimmed !== event.title && onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        previousTitle: event.title,
        title: trimmed,
        propagateForward: isRecurring,
        updateAllRecurring: isRecurring
      });
    }
    setIsEditingTitle(false);
  };

  const handleCancelTitle = (e) => {
    if (e) e.stopPropagation();
    setTempTitle(event.title || '');
    setIsEditingTitle(false);
  };

  // Abrir o painel de desmembramento carregando o estado de rascunho
  const openDesmembramento = (e) => {
    if (e) e.stopPropagation();
    const existing = event.breakdownItems ? JSON.parse(JSON.stringify(event.breakdownItems)) : [];
    setDraftSubparts(existing);
    setNewSubpartName('');
    setNewSubpartAmount(existing.length > 0 ? '' : (event.amount !== undefined ? event.amount.toString() : ''));
    setIsEditingAmount(false);
    setIsDesmembramentoExpanded(true);
  };

  // Salvar desmembramento definitivamente
  const handleSaveDesmembramento = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    let finalItems = [...draftSubparts];
    if (newSubpartName.trim()) {
      const amt = Number(newSubpartAmount) || 0;
      finalItems.push({
        id: generateUUID(),
        name: newSubpartName.trim(),
        amount: amt
      });
      setNewSubpartName('');
      setNewSubpartAmount('');
    }

    const calculatedSum = finalItems.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);

    if (onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        amount: finalItems.length > 0 ? calculatedSum : event.amount,
        breakdownItems: finalItems.length > 0 ? finalItems : undefined,
        propagateForward: isRecurring ? propagateSubsequent : false
      });
    }
    setIsDesmembramentoExpanded(false);
  };

  // Cancelar e fechar desmembramento sem guardar
  const handleCancelDesmembramento = (e) => {
    if (e) e.stopPropagation();
    setDraftSubparts(event.breakdownItems ? JSON.parse(JSON.stringify(event.breakdownItems)) : []);
    setNewSubpartName('');
    setNewSubpartAmount('');
    setIsDesmembramentoExpanded(false);
  };

  // Handlers para manipular o rascunho (draft)
  const handleDraftUpdateAmount = (idx, newAmountStr) => {
    const num = Number(newAmountStr);
    if (isNaN(num) || num < 0) return;
    setDraftSubparts((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, amount: num } : it))
    );
  };

  const handleDraftUpdateName = (idx, newName) => {
    setDraftSubparts((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, name: newName } : it))
    );
  };

  const handleDraftDeleteSubpart = (idx, e) => {
    if (e) e.stopPropagation();
    setDraftSubparts((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleDraftAddSubpart = (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (newSubpartName.trim()) {
      const amt = Number(newSubpartAmount) || 0;
      setDraftSubparts((prev) => [
        ...prev,
        { id: generateUUID(), name: newSubpartName.trim(), amount: amt }
      ]);
      setNewSubpartName('');
      setNewSubpartAmount('');
    }
  };

  const renderEditableAmount = (prefix = '', defaultColor = 'var(--text-main)') => {
    // Se o valor estiver desmembrado em subpartes, o total NÃO é alterado diretamente mas sim pelas subpartes
    if (hasBreakdown) {
      return (
        <span
          onClick={(e) => {
            e.stopPropagation();
            if (isDesmembramentoExpanded) {
              handleCancelDesmembramento(e);
            } else {
              openDesmembramento(e);
            }
          }}
          title="Valor desmembrado em subpartes. Clique para ver/editar as subpartes abaixo."
          style={{
            fontSize: '1.05rem',
            fontWeight: '800',
            color: defaultColor,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          {prefix}{formatCurrency(event.amount)}
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (isDesmembramentoExpanded) {
                handleCancelDesmembramento(e);
              } else {
                openDesmembramento(e);
              }
            }}
            style={{
              fontSize: '0.72rem',
              fontWeight: '700',
              color: isDesmembramentoExpanded ? '#ffffff' : 'var(--primary-light)',
              background: isDesmembramentoExpanded ? 'var(--primary)' : 'rgba(99, 102, 241, 0.14)',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              borderRadius: '9999px',
              padding: '2px 9px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '5px',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              boxShadow: isDesmembramentoExpanded ? '0 2px 8px rgba(99, 102, 241, 0.35)' : 'none'
            }}
            title={isDesmembramentoExpanded ? "Clique para fechar o desmembramento" : "Clique para abrir e ver/editar as subpartes"}
          >
            <Layers size={11} />
            <span>{event.breakdownItems.length} subpartes</span>
            <span style={{ fontSize: '0.65rem', opacity: 0.85 }}>{isDesmembramentoExpanded ? '▲' : '▼'}</span>
          </span>
        </span>
      );
    }

    if (isEditingAmount) {
      return (
        <form
          onSubmit={handleSaveAmount}
          onClick={(e) => e.stopPropagation()}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', margin: 0, padding: 0 }}
        >
          {prefix && (
            <span style={{ fontSize: '1.05rem', fontWeight: '800', color: defaultColor, marginRight: '-2px' }}>
              {prefix}
            </span>
          )}
          <input
            type="number"
            step="0.01"
            min="0"
            autoFocus
            className="inline-amount-input"
            value={tempAmount}
            onFocus={(e) => e.target.select()}
            onBlur={handleSaveAmount}
            onChange={(e) => setTempAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') handleCancelAmount(e);
            }}
            onClick={(e) => e.stopPropagation()}
            style={{
              color: defaultColor,
              borderColor: defaultColor !== 'var(--text-main)' ? defaultColor : 'rgba(255, 255, 255, 0.35)'
            }}
          />
          <button
            type="submit"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleSaveAmount}
            style={{
              background: '#10b981',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title={isRecurring && propagateSubsequent ? "Guardar valor (propagando para os meses seguintes)" : "Guardar valor apenas neste mês"}
          >
            <Check size={13} strokeWidth={3} />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleCancelAmount}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              color: 'var(--text-dim)',
              border: 'none',
              borderRadius: '4px',
              padding: '4px 6px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center'
            }}
            title="Cancelar"
          >
            <X size={13} strokeWidth={2.5} />
          </button>

          {/* Botão para Desmembrar valor em subpartes */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={openDesmembramento}
            title="Desmembrar valor em subpartes com nomes associados"
            style={{
              background: 'rgba(99, 102, 241, 0.14)',
              color: 'var(--primary-light)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: '4px',
              padding: '3px 6px',
              cursor: 'pointer',
              fontSize: '0.7rem',
              fontWeight: '700',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              marginLeft: '2px'
            }}
          >
            <Layers size={11} />
            <span>Desmembrar</span>
          </button>

          {/* Switch para Mudar os valores subsequentes (Default: true) */}
          {isRecurring && (
            <label
              onMouseDown={(e) => e.preventDefault()}
              onClick={(e) => e.stopPropagation()}
              title="Ativar para aplicar este novo valor a todos os meses subsequentes ou desativar para alterar apenas este mês"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '0.72rem',
                fontWeight: '600',
                color: propagateSubsequent ? 'var(--primary-light)' : 'var(--text-dim)',
                cursor: 'pointer',
                userSelect: 'none',
                background: propagateSubsequent ? 'rgba(99, 102, 241, 0.14)' : 'rgba(255, 255, 255, 0.05)',
                border: propagateSubsequent ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid var(--border-glass)',
                borderRadius: '9999px',
                padding: '2px 8px',
                marginLeft: '4px',
                transition: 'all 0.15s ease'
              }}
            >
              <span
                style={{
                  width: '20px',
                  height: '11px',
                  background: propagateSubsequent ? 'var(--primary)' : 'rgba(148, 163, 184, 0.35)',
                  borderRadius: '9999px',
                  position: 'relative',
                  display: 'inline-block',
                  transition: 'background 0.15s ease'
                }}
              >
                <span
                  style={{
                    width: '7px',
                    height: '7px',
                    background: '#fff',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '2px',
                    left: propagateSubsequent ? '11px' : '2px',
                    transition: 'left 0.15s ease'
                  }}
                />
              </span>
              <input
                type="checkbox"
                checked={propagateSubsequent}
                onChange={(e) => {
                  e.stopPropagation();
                  setPropagateSubsequent(e.target.checked);
                }}
                style={{ display: 'none' }}
              />
              <span>Mudar subsequentes</span>
            </label>
          )}
        </form>
      );
    }

    return (
      <span
        onClick={(e) => {
          e.stopPropagation();
          if (canEditAmount) {
            setPropagateSubsequent(true);
            setIsEditingAmount(true);
          }
        }}
        title={
          !canEditAmount
            ? 'Valor bloqueado. Abra o cadeado para editar.'
            : isRecurring
              ? 'Clique para editar o valor (propaga para todos os meses seguintes)'
              : 'Clique para editar o valor'
        }
        style={{
          fontSize: '1.05rem',
          fontWeight: '800',
          color: defaultColor,
          cursor: canEditAmount ? 'pointer' : 'default',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          transition: 'opacity 0.15s ease'
        }}
      >
        {prefix}{formatCurrency(event.amount)}
      </span>
    );
  };


  const handleToggleLock = (e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    const nextLocked = !isLocked;
    if (onUpdateEventDirect) {
      onUpdateEventDirect({
        ...event,
        isLocked: nextLocked,
        updateScope: event.eventId || event.seriesId ? 'single' : undefined
      });
    }
  };

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
          label: 'Poupança',
          icon: <PiggyBank size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      case 'investimento_patrimonio':
        return {
          label: 'Património',
          icon: <Landmark size={12} />,
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          border: 'rgba(168, 85, 247, 0.3)'
        };
      case 'investimento_outros':
      case 'investimento_etf':
      case 'investimento_acoes':
      case 'investimento_extra':
        return {
          label: 'Outros Investimentos',
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
          label: 'Atrasada',
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
      if (isPaidLoan) {
        return {
          label: `Liquidado às ${getCompletedTimeStr()}`,
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueLoan) {
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

    if (isExpenseEvent) {
      if (isPaidExpense) {
        return {
          label: `Pago às ${getCompletedTimeStr()}`,
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueExpense) {
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
        icon: <Clock size={11} />,
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    }

    if (isInvestmentEvent) {
      if (isCompletedInvestment) {
        return {
          label: `Investido às ${getCompletedTimeStr()}`,
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      }
      if (isOverdueInvestment) {
        return {
          label: 'Atrasado',
          icon: <AlertCircle size={11} />,
          bg: 'rgba(239, 68, 68, 0.18)',
          color: '#f87171',
          border: 'rgba(239, 68, 68, 0.4)',
          pulsing: true
        };
      }
      return {
        label: 'Planeado',
        icon: <Clock size={11} />,
        bg: 'rgba(99, 102, 241, 0.1)',
        color: 'var(--primary-light)',
        border: 'rgba(99, 102, 241, 0.2)'
      };
    }

    if (!isCompleted && isOverdue) {
      return {
        label: 'Atrasado',
        icon: <AlertCircle size={11} />,
        bg: 'rgba(239, 68, 68, 0.18)',
        color: '#f87171',
        border: 'rgba(239, 68, 68, 0.4)',
        pulsing: true
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
  if (isOverdueIncome || isOverdueExpense || isOverdueInvestment || isOverdueLoan || (isOverdue && !isCompleted)) {
    cardStyle = {
      background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, var(--bg-card) 100%)',
      borderLeft: '4px solid #ef4444',
      borderColor: 'rgba(239, 68, 68, 0.32)'
    };
  } else if (isIncomeEvent) {
    if (isReceivedIncome || isNextIncome) {
      cardStyle = {
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, var(--bg-card) 100%)',
        borderLeft: '4px solid #10b981',
        borderColor: 'rgba(16, 185, 129, 0.28)'
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
    if (isPaidLoan) {
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

  if (isAbatida) {
    cardStyle = {
      ...cardStyle,
      opacity: 0.48,
      background: 'rgba(148, 163, 184, 0.03)',
      borderColor: 'rgba(148, 163, 184, 0.2)',
      borderLeft: '4px solid #94a3b8',
      filter: 'grayscale(0.35)',
      pointerEvents: 'none'
    };
  }

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
      event.timelineOriginId === 'tl-loan-casa1' ||
      event.timelineOriginId === 'e6f7a8b9-c0d1-4e2f-3a4b-5c6d7e8f9a0b' ||
      ((event.title && (event.title.includes('02012642') || event.title.includes('Crédito Egas Moniz') || event.title.includes('Casa 1'))) && !event.title?.includes('Hipoteca'))
    ) {
      return {
        label: 'Crédito Egas Moniz',
        icon: <Home size={11} strokeWidth={2.4} />,
        bg: 'rgba(14, 165, 233, 0.12)',
        color: '#0ea5e9',
        border: 'rgba(14, 165, 233, 0.28)',
        timelineId: 'tl-income',
        tab: 'casa1'
      };
    }
    if (
      event.timelineOriginId === 'tl-loan-casa2' ||
      event.timelineOriginId === 'f7a8b9c0-d1e2-4f3a-4b5c-6d7e8f9a0b1c' ||
      (event.title && (event.title.includes('02015122') || event.title.includes('Hipoteca') || event.title.includes('Casa 2')))
    ) {
      return {
        label: 'Hipoteca Egas Moniz',
        icon: <Home size={11} strokeWidth={2.4} />,
        bg: 'rgba(20, 184, 166, 0.12)',
        color: '#14b8a6',
        border: 'rgba(20, 184, 166, 0.28)',
        timelineId: 'tl-income',
        tab: 'casa2'
      };
    }
    if (
      event.timelineOriginId === 'tl-loan-dacia' ||
      event.timelineOriginId === 'tl-loan-crd19605103001' ||
      (event.title && event.title.includes('Dacia'))
    ) {
      return {
        label: 'Crédito Dacia',
        icon: <Car size={11} strokeWidth={2.4} />,
        bg: 'rgba(139, 92, 246, 0.12)',
        color: '#8b5cf6',
        border: 'rgba(139, 92, 246, 0.28)',
        timelineId: 'tl-income',
        tab: 'dacia'
      };
    }
    if (
      event.timelineOriginId === 'tl-loan-jeep' ||
      event.timelineOriginId === 'tl-loan-80004197726' ||
      event.category === 'parcela_emprestimo' ||
      event.category === 'amortizacao' ||
      isLoanInstallment
    ) {
      return {
        label: 'Crédito Jeep',
        icon: <Car size={11} strokeWidth={2.4} />,
        bg: 'rgba(99, 102, 241, 0.12)',
        color: '#6366f1',
        border: 'rgba(99, 102, 241, 0.28)',
        timelineId: 'tl-income',
        tab: 'jeep'
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
    <div
      className={`event-card ${isMemoryCard ? 'memory-card' : ''} ${isInertFuture ? 'is-inert-future-card' : ''}`}
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
              color: isInertFuture ? 'var(--text-dim)' : 'var(--primary-light)',
              opacity: 0.85,
              flexShrink: 0
            }}
          >
            {isRecurring ? <Repeat size={14} strokeWidth={2.2} /> : <Zap size={14} strokeWidth={2.2} />}
          </span>

          {/* Título do evento limpo e editável ao clicar */}
          {isEditingTitle ? (
            <form
              onSubmit={handleSaveTitle}
              onClick={(e) => e.stopPropagation()}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0, margin: 0, padding: 0 }}
            >
              <input
                type="text"
                autoFocus
                value={tempTitle}
                onFocus={(e) => e.target.select()}
                onBlur={handleSaveTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') handleCancelTitle(e);
                }}
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '3px solid var(--primary-light)',
                  borderRadius: '0px',
                  padding: '2px 0',
                  fontSize: '0.98rem',
                  fontWeight: '700',
                  color: 'var(--text-main)',
                  outline: 'none',
                  flex: 1,
                  minWidth: '120px'
                }}
              />
              <button
                type="submit"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleSaveTitle}
                style={{
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
                title={isRecurring ? "Guardar nome (atualiza todos os meses desta despesa/receita recorrente)" : "Guardar nome"}
              >
                <Check size={13} strokeWidth={3} />
              </button>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={handleCancelTitle}
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'var(--text-dim)',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '4px 6px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center'
                }}
                title="Cancelar"
              >
                <X size={13} strokeWidth={2.5} />
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <h3
                className="event-title"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isAbatida) return;
                  if (!isLoanInstallment) {
                    setIsEditingTitle(true);
                  } else if (onNavigateToTimeline && originInfo) {
                    onNavigateToTimeline(originInfo.timelineId, originInfo.tab);
                  }
                }}
                title={
                  isAbatida
                    ? 'Esta parcela foi totalmente liquidada/abatida por amortização extraordinária.'
                    : isLoanInstallment
                      ? `Clique para ir à timeline do ${originInfo ? originInfo.label : 'Empréstimo'}`
                      : isRecurring
                        ? "Clique para editar o nome (altera em todos os meses)"
                        : "Clique para editar o nome"
                }
                style={{
                  margin: 0,
                  color: isAbatida ? 'var(--text-dim)' : isInertFuture ? 'var(--text-muted)' : 'var(--text-main)',
                  textDecoration: isAbatida ? 'line-through' : 'none',
                  cursor: isAbatida ? 'default' : 'pointer'
                }}
              >
                {(event.title || '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')}
              </h3>

              {isAbatida && (
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                  <span
                    style={{
                      background: 'rgba(16, 185, 129, 0.14)',
                      color: '#10b981',
                      border: '1px solid rgba(16, 185, 129, 0.35)',
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      letterSpacing: '0.02em',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <CheckCircle2 size={11} /> Abatida (Total Pago: 0,00 €)
                  </span>
                  {abatedBreakdown && abatedBreakdown.origInterest > 0 && (
                    <span
                      style={{
                        background: 'rgba(99, 102, 241, 0.12)',
                        color: 'var(--primary-light)',
                        border: '1px solid rgba(99, 102, 241, 0.3)',
                        padding: '2px 8px',
                        borderRadius: '6px',
                        fontSize: '0.68rem',
                        fontWeight: '800',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Sparkles size={11} /> Poupança: +{formatCurrency(abatedBreakdown.origInterest)} em juros
                    </span>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Origin / Sub-vision Clean Text Indicator aligned to the RIGHT - On Balanço, Principal or Gastos for loans/investments */}
        {(isBalanceView || (activeFinancialTab === 'gastos' && (isLoanInstallment || isInvestmentEvent))) && originInfo && (
          <button
            type="button"
            disabled={isInertFuture}
            onClick={(e) => {
              e.stopPropagation();
              if (!isInertFuture && onNavigateToTimeline) {
                onNavigateToTimeline(originInfo.timelineId, originInfo.tab);
              }
            }}
            style={{
              background: activeFinancialTab === 'gastos' ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
              border: activeFinancialTab === 'gastos' ? '1px solid rgba(99, 102, 241, 0.25)' : 'none',
              borderRadius: activeFinancialTab === 'gastos' ? '6px' : '0px',
              boxShadow: 'none',
              padding: activeFinancialTab === 'gastos' ? '3px 8px' : '2px 0',
              color: isInertFuture ? 'var(--text-dim)' : originInfo.color,
              fontWeight: '700',
              fontSize: '0.74rem',
              letterSpacing: '0.01em',
              cursor: isInertFuture ? 'default' : (onNavigateToTimeline ? 'pointer' : 'default'),
              pointerEvents: isInertFuture ? 'none' : 'auto',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              flexShrink: 0,
              marginLeft: 'auto',
              transition: 'all 0.15s ease',
              lineHeight: 1.2
            }}
            title={`Ir para a timeline do ${originInfo.label}`}
          >
            <span>{originInfo.label}</span>
            <ArrowUpRight size={13} strokeWidth={2.5} style={{ opacity: isInertFuture ? 0.4 : 0.8 }} />
          </button>
        )}
      </div>

      {/* 💰 Income (Entrada) Financial Highlight Strip */}
      {isIncomeEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: isInertFuture
              ? 'rgba(148, 163, 184, 0.04)'
              : isNextIncome
                ? 'rgba(245, 158, 11, 0.08)'
                : isFarFutureIncome
                  ? 'rgba(255, 255, 255, 0.02)'
                  : 'rgba(16, 185, 129, 0.08)',
            border: isInertFuture
              ? '1px solid rgba(148, 163, 184, 0.18)'
              : isNextIncome
                ? '1px solid rgba(245, 158, 11, 0.32)'
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
              {renderEditableAmount('+', isInertFuture ? '#94a3b8' : (isNextIncome ? '#f59e0b' : isFarFutureIncome ? '#94a3b8' : '#10b981'))}
            </div>
          </div>

          {/* Status Pill for Income */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isInertFuture ? (
              <div
                style={{
                  background: 'rgba(148, 163, 184, 0.08)',
                  color: 'var(--text-dim)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '9999px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'default',
                  userSelect: 'none'
                }}
              >
                <Clock size={13} />
                <span>Previsto</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLocked) {
                    handleToggleLock(e);
                    return;
                  }
                  if (onToggleLoanPayment) {
                    onToggleLoanPayment(event.id);
                  }
                }}
                className="btn btn-sm"
                title={
                  isLocked
                    ? 'Entrada confirmada e bloqueada. Clique para destrancar.'
                    : 'Clique para alternar o status'
                }
                style={{
                  background: isReceivedIncome
                    ? 'rgba(16, 185, 129, 0.16)'
                    : isOverdueIncome
                      ? 'rgba(239, 68, 68, 0.16)'
                      : isNextIncome
                        ? 'rgba(245, 158, 11, 0.14)'
                        : 'rgba(148, 163, 184, 0.1)',
                  color: isReceivedIncome
                    ? '#10b981'
                    : isOverdueIncome
                      ? '#f87171'
                      : isNextIncome
                        ? '#f59e0b'
                        : '#94a3b8',
                  border: isReceivedIncome
                    ? isLocked
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1.5px dashed rgba(16, 185, 129, 0.65)'
                    : isOverdueIncome
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : isNextIncome
                        ? '1px solid rgba(245, 158, 11, 0.35)'
                        : '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '9999px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
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
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggleLock(e);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px 4px',
                        marginLeft: '4px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isLocked ? 'rgba(245, 158, 11, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                        color: isLocked ? '#f59e0b' : 'var(--text-dim)',
                        transition: 'all 0.15s ease'
                      }}
                      title={isLocked ? 'Cadeado trancado (Clique para destravar)' : 'Cadeado aberto (Clique para trancar)'}
                    >
                      {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </span>
                  </>
                ) : isOverdueIncome ? (
                  <>
                    <AlertCircle size={14} style={{ color: '#f87171' }} />
                    <span>Em Atraso</span>
                  </>
                ) : (
                  <>
                    <Clock size={14} style={{ color: isNextIncome ? '#f59e0b' : '#94a3b8' }} />
                    <span>A Receber</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 🛒 Expense (Gasto/Saída) Financial Highlight Strip */}
      {isExpenseEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: isInertFuture
              ? 'rgba(148, 163, 184, 0.04)'
              : isPaidExpense
                ? 'rgba(16, 185, 129, 0.08)'
                : 'rgba(244, 63, 94, 0.08)',
            border: isInertFuture
              ? '1px solid rgba(148, 163, 184, 0.18)'
              : isPaidExpense
                ? '1px solid rgba(16, 185, 129, 0.28)'
                : '1px solid rgba(244, 63, 94, 0.22)',
            borderRadius: '10px',
            padding: '8px 12px',
            margin: '10px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '12px',
            transition: 'all 0.2s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Valor Pago / Débito
              </span>
              {renderEditableAmount('-', isInertFuture ? '#94a3b8' : isPaidExpense ? '#10b981' : '#f43f5e')}
            </div>
            {event.priority && !isInertFuture && (
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

          {isInertFuture ? (
            <div
              style={{
                background: 'rgba(148, 163, 184, 0.08)',
                color: 'var(--text-dim)',
                border: '1px solid rgba(148, 163, 184, 0.2)',
                borderRadius: '9999px',
                padding: '5px 14px',
                fontSize: '0.78rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'default',
                userSelect: 'none'
              }}
            >
              <Clock size={13} />
              <span>Pendente</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (isLocked) {
                  handleToggleLock(e);
                  return;
                }
                if (onToggleLoanPayment) onToggleLoanPayment(event.id);
              }}
              className="btn btn-sm"
              title={
                isLocked
                  ? 'Gasto pago e bloqueado. Clique para destrancar.'
                  : 'Clique para alternar o status'
              }
              style={{
                background: isPaidExpense
                  ? 'rgba(16, 185, 129, 0.16)'
                  : isOverdueExpense
                    ? 'rgba(239, 68, 68, 0.16)'
                    : 'rgba(245, 158, 11, 0.14)',
                color: isPaidExpense
                  ? '#10b981'
                  : isOverdueExpense
                    ? '#f87171'
                    : '#f59e0b',
                border: isPaidExpense
                  ? isLocked
                    ? '1px solid rgba(16, 185, 129, 0.35)'
                    : '1.5px dashed rgba(16, 185, 129, 0.65)'
                  : isOverdueExpense
                    ? '1px solid rgba(239, 68, 68, 0.4)'
                    : '1px solid rgba(245, 158, 11, 0.35)',
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
                  <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                  <span>Pago às {getCompletedTimeStr()}</span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      handleToggleLock(e);
                    }}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: '2px 4px',
                      marginLeft: '4px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      background: isLocked ? 'rgba(245, 158, 11, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                      color: isLocked ? '#f59e0b' : 'var(--text-dim)',
                      transition: 'all 0.15s ease'
                    }}
                    title={isLocked ? 'Cadeado trancado (Clique para destravar)' : 'Cadeado aberto (Clique para trancar)'}
                  >
                    {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  </span>
                </>
              ) : isOverdueExpense ? (
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
          )}
        </div>
      )}

      {/* 📈 Investment (Investimento/Poupança/Património) Financial Highlight Strip */}
      {isInvestmentEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: event.category === 'investimento_patrimonio'
              ? 'linear-gradient(135deg, rgba(192, 132, 252, 0.08) 0%, var(--bg-card) 100%)'
              : isInertFuture ? 'rgba(148, 163, 184, 0.04)' : 'rgba(99, 102, 241, 0.08)',
            border: event.category === 'investimento_patrimonio'
              ? '1px solid rgba(192, 132, 252, 0.3)'
              : isInertFuture ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid rgba(99, 102, 241, 0.22)',
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
                {event.category === 'investimento_patrimonio'
                  ? 'Valor Atual do Património'
                  : (Number(event.amount || 0) > 0 ? 'Aporte do Mês' : 'Aporte Mensal')}
              </span>
              {event.category === 'investimento_patrimonio' ? (
                <span style={{ fontSize: '1.08rem', fontWeight: '800', color: '#c084fc' }}>
                  +{formatCurrency(event.amount || event.initialInvestedAmount || 0)}
                </span>
              ) : (
                renderEditableAmount('+', isInertFuture ? '#94a3b8' : 'var(--primary-light)')
              )}
            </div>

            {event.category === 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && Number(event.amount || 0) > 0 && Number(event.initialInvestedAmount) !== Number(event.amount) && (
              <>
                <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Aquisição
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                    {formatCurrency(event.initialInvestedAmount)}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                  <span style={{ fontSize: '0.7rem', color: (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '#10b981' : '#f43f5e', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <TrendingUp size={11} /> Valorização
                  </span>
                  <span style={{ fontSize: '0.9rem', fontWeight: '800', color: (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '#10b981' : '#f43f5e' }}>
                    {(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                    {formatCurrency(Number(event.amount) - Number(event.initialInvestedAmount))}
                    <span style={{ fontSize: '0.75rem', marginLeft: '4px', fontWeight: '700' }}>
                      ({(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                      {(((Number(event.amount) - Number(event.initialInvestedAmount)) / Number(event.initialInvestedAmount)) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>
              </>
            )}

            {event.category === 'investimento_patrimonio' && event.linkedLoanTimelineName && (
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <CreditCard size={11} /> Financiamento
                </span>
                <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#38bdf8' }}>
                  {event.linkedLoanTimelineName}
                </span>
              </div>
            )}

            {event.category !== 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && (event.isFirstOccurrence === true || (!event.isProjected && !event.eventId || event.seriesId) || (event.isFirstOccurrence !== false && !event.isProjected)) && (
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Património Anterior
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: isInertFuture ? 'var(--text-dim)' : 'var(--primary-light)' }}>
                  {formatCurrency(event.initialInvestedAmount)}
                </span>
              </div>
            )}

            {event.category !== 'investimento_patrimonio' && Number(event.targetAmount || 0) > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Target size={11} /> Meta
                </span>
                <span style={{ fontSize: '0.9rem', fontWeight: '800', color: '#a78bfa' }}>
                  {formatCurrency(event.targetAmount)}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isInertFuture ? (
              <div
                style={{
                  background: 'rgba(148, 163, 184, 0.08)',
                  color: 'var(--text-dim)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '9999px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'default',
                  userSelect: 'none'
                }}
              >
                <Clock size={13} />
                <span>Planeado</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLocked) {
                    handleToggleLock(e);
                    return;
                  }
                  if (onToggleLoanPayment) onToggleLoanPayment(event.id);
                }}
                className="btn btn-sm"
                title={
                  isLocked
                    ? 'Investimento confirmado e bloqueado. Clique para destrancar.'
                    : 'Clique para alternar o status'
                }
                style={{
                  background: event.category === 'investimento_patrimonio'
                    ? (event.status === 'Financiado' ? 'rgba(2, 132, 199, 0.16)' : 'rgba(16, 185, 129, 0.16)')
                    : isCompletedInvestment
                      ? 'rgba(139, 92, 246, 0.16)'
                      : isOverdueInvestment
                        ? 'rgba(239, 68, 68, 0.16)'
                        : 'rgba(148, 163, 184, 0.12)',
                  color: event.category === 'investimento_patrimonio'
                    ? (event.status === 'Financiado' ? '#38bdf8' : '#10b981')
                    : isCompletedInvestment
                      ? '#8b5cf6'
                      : isOverdueInvestment
                        ? '#f87171'
                        : '#94a3b8',
                  border: event.category === 'investimento_patrimonio'
                    ? (event.status === 'Financiado' ? '1px solid rgba(2, 132, 199, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)')
                    : isCompletedInvestment
                      ? isLocked
                        ? '1px solid rgba(139, 92, 246, 0.35)'
                        : '1.5px dashed rgba(139, 92, 246, 0.65)'
                      : isOverdueInvestment
                        ? '1px solid rgba(239, 68, 68, 0.4)'
                        : '1px solid rgba(148, 163, 184, 0.3)',
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
                {event.category === 'investimento_patrimonio' ? (
                  event.status === 'Financiado' ? (
                    <>
                      <CreditCard size={14} style={{ color: '#38bdf8' }} />
                      <span>Financiado</span>
                    </>
                  ) : (
                    <>
                      <Landmark size={14} style={{ color: '#10b981' }} />
                      <span>Quitado</span>
                    </>
                  )
                ) : isCompletedInvestment ? (
                  <>
                    <CheckCircle2 size={14} style={{ color: '#8b5cf6' }} />
                    <span>Investido às {getCompletedTimeStr()}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggleLock(e);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px 4px',
                        marginLeft: '4px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isLocked ? 'rgba(245, 158, 11, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                        color: isLocked ? '#f59e0b' : 'var(--text-dim)',
                        transition: 'all 0.15s ease'
                      }}
                      title={isLocked ? 'Cadeado trancado (Clique para destravar)' : 'Cadeado aberto (Clique para trancar)'}
                    >
                      {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                  </span>
                </>
              ) : isOverdueInvestment ? (
                <>
                  <AlertCircle size={14} style={{ color: '#f87171' }} />
                  <span>Atrasado</span>
                </>
              ) : (
                <>
                  <Clock size={14} style={{ color: '#94a3b8' }} />
                  <span>Planeado</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* 🎯 Barra de Progresso da Meta de Poupança / Investimento */}
        {Number(event.targetAmount || 0) > 0 && (() => {
          const seriesId = event.eventId || event.seriesId || event.id;
          const baseInitial = Number(event.initialInvestedAmount || 0);
          const isInvestmentsView = activeFinancialTab === 'investimentos' || timelineType === 'investimentos' || event.timelineOriginId === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';
          const isFuture = event.date > todayStr;
          const useForecast = isInvestmentsView && isFuture;

          let currentSaved = baseInitial;

          if (useForecast) {
            // Em visão de Investimentos no futuro: computar a projeção/previsão acumulada
            const priorPlannedAportes = (allEvents || [])
              .filter((ev) => {
                if (!ev || !ev.date || ev.date >= event.date) return false;
                const matchSeries = (ev.eventId || ev.seriesId && ev.eventId || ev.seriesId === seriesId) || (ev.id === seriesId) || (ev.sobrepositionOver === seriesId) || (ev.category === event.category && ev.financialType === 'investimento');
                const isValid = ev.status !== 'Cancelado' && ev.status !== 'Excluido';
                return matchSeries && isValid;
              })
              .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);

            const thisMonthAmount = Number(event.amount || 0);
            currentSaved = baseInitial + priorPlannedAportes + thisMonthAmount;
          } else {
            // Em visão de Balanço ou histórico realizado: computar apenas o património e aportes efetivamente liquidados até à data
            const priorRealizedAportes = (allEvents || [])
              .filter((ev) => {
                if (!ev || !ev.date || ev.date >= event.date) return false;
                const matchSeries = (ev.eventId || ev.seriesId && ev.eventId || ev.seriesId === seriesId) || (ev.id === seriesId) || (ev.sobrepositionOver === seriesId) || (ev.category === event.category && ev.financialType === 'investimento');
                const isDone = ev.status === 'Investido' || ev.status === 'Pago' || ev.isCompleted;
                return matchSeries && isDone;
              })
              .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);

            currentSaved = baseInitial + priorRealizedAportes;
          }

          const targetVal = Number(event.targetAmount);
          const progressPct = Math.min(100, Math.max(0, Math.round((currentSaved / targetVal) * 100)));

          const labelTitle = useForecast
            ? `Previsão de Progresso da Meta (${formatCurrency(currentSaved)} de ${formatCurrency(targetVal)})`
            : `Progresso da Meta (${formatCurrency(currentSaved)} de ${formatCurrency(targetVal)})`;

          const labelPercent = useForecast
            ? (progressPct >= 100 ? '🎉 Meta Atingida (Previsão)!' : `${progressPct}% previsto`)
            : (progressPct >= 100 ? '🎉 Meta Atingida!' : `${progressPct}% alcançado`);

          return (
            <div
              style={{
                width: '100%',
                marginTop: '10px',
                paddingTop: '8px',
                borderTop: '1px solid rgba(139, 92, 246, 0.15)'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: '0.73rem',
                  fontWeight: '700',
                  color: useForecast ? '#c084fc' : '#a78bfa',
                  marginBottom: '5px'
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <Target size={12} />
                  <span>{labelTitle}</span>
                </span>
                <span style={{ color: progressPct >= 100 ? '#10b981' : (useForecast ? '#38bdf8' : '#c084fc'), fontWeight: '800' }}>
                  {labelPercent}
                </span>
              </div>
              <div
                style={{
                  width: '100%',
                  height: '6px',
                  background: 'rgba(148, 163, 184, 0.15)',
                  borderRadius: '9999px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: '100%',
                    background: progressPct >= 100
                      ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                      : useForecast
                        ? 'linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #38bdf8 100%)'
                        : 'linear-gradient(90deg, #8b5cf6 0%, #a855f7 100%)',
                    borderRadius: '9999px',
                    transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                    boxShadow: useForecast ? '0 0 12px rgba(56, 189, 248, 0.35)' : '0 0 10px rgba(139, 92, 246, 0.4)'
                  }}
                />
              </div>
            </div>
          );
        })()}
      </div>
    )}

      {/* ⚡ Amortização Extraordinária Strip */}
      {isAmortization && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, var(--bg-app) 100%)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
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
                Valor Amortizado
              </span>
              <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#10b981' }}>
                +{formatCurrency(event.amount || event.amortizationAmount || 0)}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Finalidade
              </span>
              <span style={{ fontSize: '0.85rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                {event.strategy === 'reduce_installment' ? 'Redução da Parcela' : 'Redução do Prazo'}
              </span>
            </div>

            {event.balanceAfter !== undefined && (
              <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Saldo Devedor Após
                </span>
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: 'var(--text-main)' }}>
                  {formatCurrency(event.balanceAfter)}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onToggleLoanPayment) {
                  onToggleLoanPayment(event.id);
                }
              }}
              style={{
                background: (event.status === 'Amortizado' || event.status === 'Concluído' || event.isCompleted)
                  ? 'rgba(16, 185, 129, 0.16)'
                  : 'rgba(245, 158, 11, 0.16)',
                color: (event.status === 'Amortizado' || event.status === 'Concluído' || event.isCompleted)
                  ? '#10b981'
                  : '#f59e0b',
                border: (event.status === 'Amortizado' || event.status === 'Concluído' || event.isCompleted)
                  ? '1px solid rgba(16, 185, 129, 0.4)'
                  : '1px solid rgba(245, 158, 11, 0.4)',
                borderRadius: '9999px',
                padding: '5px 14px',
                fontSize: '0.78rem',
                fontWeight: '800',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              title="Clique para alternar entre Amortizado (Efetivado) e Pendente (Agendado)"
            >
              {(event.status === 'Amortizado' || event.status === 'Concluído' || event.isCompleted) ? (
                <>
                  <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                  <span>Amortizado</span>
                </>
              ) : (
                <>
                  <Clock size={13} style={{ color: '#f59e0b' }} />
                  <span>Pendente</span>
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
            background: isInertFuture ? 'rgba(148, 163, 184, 0.04)' : 'var(--bg-app)',
            border: isInertFuture ? '1px solid rgba(148, 163, 184, 0.18)' : '1px solid var(--border-glass)',
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
                {isAbatida ? 'Total Pago' : 'Total da Parcela'}
              </span>
              {isAbatida ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                    {formatCurrency(abatedBreakdown?.origTotal || event.originalAmount || 218.47)}
                  </span>
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#10b981' }}>
                    0,00 €
                  </span>
                </div>
              ) : (
                renderEditableAmount('', isInertFuture ? '#94a3b8' : 'var(--primary-light)')
              )}
            </div>

            {/* Decomposição: Capital Amortizado */}
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid var(--border-glass)', paddingLeft: '14px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                {isAbatida ? 'Capital Abatido' : 'Capital (Dívida)'}
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: isAbatida ? 'var(--text-main)' : isInertFuture ? 'var(--text-muted)' : 'var(--text-main)' }}>
                {isAbatida
                  ? formatCurrency(abatedBreakdown?.origCapital || 194.88)
                  : formatCurrency(event.principalAmount !== undefined ? event.principalAmount : Math.round((Number(event.amount) || 0) * 0.82))}
              </span>
            </div>

            {/* Juros Embutidos ou Juros Poupados */}
            <div style={{ display: 'flex', flexDirection: 'column', borderLeft: isAbatida ? '1px solid var(--border-glass)' : 'none', paddingLeft: isAbatida ? '14px' : '0' }}>
              <span style={{ fontSize: '0.7rem', color: isAbatida ? '#10b981' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                {isAbatida ? 'Juros Poupados' : 'Juros'}
              </span>
              <span style={{ fontSize: '0.88rem', fontWeight: '800', color: isAbatida ? '#10b981' : isInertFuture ? '#94a3b8' : '#f59e0b' }}>
                {isAbatida
                  ? `+${formatCurrency(abatedBreakdown?.origInterest || 23.59)}`
                  : formatCurrency(event.interestPortion !== undefined ? event.interestPortion : Math.round((Number(event.amount) || 0) * 0.18))}
              </span>
            </div>

            {/* Juros Extra de Mora se Atrasada */}
            {event.interestAmount > 0 && !isInertFuture && !isAbatida && (
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
                <span style={{ fontSize: '0.88rem', fontWeight: '800', color: isAbatida || isInertFuture ? '#94a3b8' : 'var(--primary-light)' }}>
                  {formatCurrency(event.balanceAfter)}
                </span>
              </div>
            )}
          </div>

          {/* Inline Loan Payment Fast Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isAbatida ? (
              <div
                style={{
                  background: 'rgba(148, 163, 184, 0.12)',
                  color: '#94a3b8',
                  border: '1px solid rgba(148, 163, 184, 0.3)',
                  borderRadius: '9999px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'not-allowed',
                  userSelect: 'none'
                }}
                title="Parcela abatida por amortização extraordinária antecipada."
              >
                <CheckCircle2 size={13} style={{ color: '#94a3b8' }} />
                <span>Abatida</span>
              </div>
            ) : isInertFuture ? (
              <div
                style={{
                  background: 'rgba(148, 163, 184, 0.08)',
                  color: 'var(--text-dim)',
                  border: '1px solid rgba(148, 163, 184, 0.2)',
                  borderRadius: '9999px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  cursor: 'default',
                  userSelect: 'none'
                }}
              >
                <Clock size={13} />
                <span>Pendente</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isLocked) {
                    handleToggleLock(e);
                    return;
                  }
                  if (onToggleLoanPayment) onToggleLoanPayment(event.id);
                }}
                className="btn btn-sm"
                title={
                  isLocked
                    ? 'Prestação liquidada e bloqueada. Clique para destrancar.'
                    : 'Clique para alternar o status'
                }
                style={{
                  background: isPaidLoan
                    ? 'rgba(16, 185, 129, 0.16)'
                    : isOverdueLoan
                      ? 'rgba(239, 68, 68, 0.16)'
                      : 'rgba(245, 158, 11, 0.14)',
                  color: isPaidLoan
                    ? '#10b981'
                    : isOverdueLoan
                      ? '#f87171'
                      : '#f59e0b',
                  border: isPaidLoan
                    ? isLocked
                      ? '1px solid rgba(16, 185, 129, 0.35)'
                      : '1.5px dashed rgba(16, 185, 129, 0.65)'
                    : isOverdueLoan
                      ? '1px solid rgba(239, 68, 68, 0.4)'
                      : '1px solid rgba(245, 158, 11, 0.35)',
                  borderRadius: '9999px',
                  padding: '5px 14px',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.2s',
                  boxShadow: isPaidLoan
                    ? '0 2px 8px rgba(16, 185, 129, 0.2)'
                    : 'none'
                }}
              >
                {isPaidLoan ? (
                  <>
                    <CheckCircle2 size={14} style={{ color: '#10b981' }} />
                    <span>Liquidado às {getCompletedTimeStr()}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        handleToggleLock(e);
                      }}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '2px 4px',
                        marginLeft: '4px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        background: isLocked ? 'rgba(245, 158, 11, 0.25)' : 'rgba(148, 163, 184, 0.15)',
                        color: isLocked ? '#f59e0b' : 'var(--text-dim)',
                        transition: 'all 0.15s ease'
                      }}
                      title={isLocked ? 'Cadeado trancado (Clique para destravar)' : 'Cadeado aberto (Clique para trancar)'}
                    >
                      {isLocked ? <Lock size={12} /> : <Unlock size={12} />}
                    </span>
                  </>
                ) : isOverdueLoan ? (
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
            )}
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

      {/* 🧩 Painel de Desmembramento do Valor (In-place, com Salvar e Cancelar) */}
      {isDesmembramentoExpanded && (() => {
        const pendingAmount = Number(newSubpartAmount) || 0;
        const totalCalculated = draftSubparts.reduce((acc, it) => acc + (Number(it.amount) || 0), 0) + (newSubpartName.trim() ? pendingAmount : 0);

        return (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              marginTop: '10px',
              marginBottom: '10px',
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                <Layers size={15} style={{ color: 'var(--primary-light)' }} />
                <span>Desmembramento do Valor ({draftSubparts.length} subpartes)</span>
              </div>
              <button
                type="button"
                onClick={handleCancelDesmembramento}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-dim)',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  padding: '2px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '3px'
                }}
                title="Cancelar alterações"
              >
                <X size={13} />
                <span>Cancelar</span>
              </button>
            </div>

            {/* Total Banner */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 12px',
                background: 'rgba(99, 102, 241, 0.08)',
                border: '1px solid rgba(99, 102, 241, 0.25)',
                borderRadius: '8px'
              }}
            >
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Total Acumulado das Subpartes
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  A soma das subpartes definirá a totalidade desta entrada ao salvar
                </div>
              </div>
              <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                {formatCurrency(totalCalculated)}
              </span>
            </div>

            {/* List of draft subparts */}
            {draftSubparts.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {draftSubparts.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '8px',
                      padding: '4px 0px',
                      background: 'transparent',
                      borderBottom: '3px solid rgba(165, 180, 252, 0.65)',
                      width: '100%'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flex: 1, minWidth: 0 }}>
                      <input
                        type="text"
                        disabled={!canEditAmount}
                        value={item.name}
                        onFocus={(e) => {
                          e.target.select();
                          setEditingSubpartIdx(idx);
                        }}
                        onBlur={() => setEditingSubpartIdx(null)}
                        onChange={(e) => handleDraftUpdateName(idx, e.target.value)}
                        placeholder="Nome da subparte..."
                        style={{
                          flex: 1,
                          background: 'transparent',
                          border: 'none',
                          outline: 'none',
                          padding: '2px 0',
                          color: 'var(--text-main)',
                          fontSize: '0.86rem',
                          fontWeight: '700'
                        }}
                      />
                      {canEditAmount && editingSubpartIdx === idx && (
                        <button
                          type="button"
                          onMouseDown={(e) => e.preventDefault()}
                          onClick={() => setEditingSubpartIdx(null)}
                          style={{
                            background: '#10b981',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '2px 5px',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Confirmar nome da subparte"
                        >
                          <Check size={11} strokeWidth={3} />
                        </button>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        disabled={!canEditAmount}
                        className="inline-amount-input"
                        value={item.amount}
                        onFocus={(e) => e.target.select()}
                        onChange={(e) => handleDraftUpdateAmount(idx, e.target.value)}
                        style={{
                          width: '75px',
                          fontSize: '0.86rem',
                          textAlign: 'right',
                          fontWeight: '700',
                          padding: '2px 0'
                        }}
                      />
                      <span style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--text-dim)' }}>€</span>
                      {canEditAmount && (
                        <button
                          type="button"
                          onClick={(e) => handleDraftDeleteSubpart(idx, e)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-dim)',
                            cursor: 'pointer',
                            padding: '2px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                          title="Eliminar esta subparte"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add New Subpart Form */}
            {canEditAmount && (
              <form
                onSubmit={handleDraftAddSubpart}
                style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr auto', gap: '6px', marginTop: '6px' }}
              >
                <input
                  type="text"
                  placeholder="Nome da subparte (ex: Restaurante)"
                  value={newSubpartName}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewSubpartName(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    color: 'var(--text-main)',
                    outline: 'none'
                  }}
                />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="Valor (€)"
                  value={newSubpartAmount}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) => setNewSubpartAmount(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.15)',
                    border: '1px solid var(--border-glass)',
                    borderRadius: '6px',
                    padding: '6px 10px',
                    fontSize: '0.78rem',
                    color: 'var(--text-main)',
                    outline: 'none',
                    fontWeight: '700'
                  }}
                />
                <button
                  type="submit"
                  disabled={!newSubpartName.trim()}
                  className="btn btn-secondary btn-sm"
                  style={{
                    padding: '4px 12px',
                    fontSize: '0.74rem',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                  title="Adicionar mais uma subparte à lista"
                >
                  <Plus size={13} />
                  <span>Adicionar</span>
                </button>
              </form>
            )}

            {/* Footer Actions: Switch Subsequentes, Salvar e Cancelar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px', paddingTop: '8px', borderTop: '1px solid var(--border-glass)' }}>
              {isRecurring ? (
                <label
                  title="Ativar para aplicar este desmembramento a todos os meses subsequentes ao salvar"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    fontSize: '0.72rem',
                    fontWeight: '600',
                    color: propagateSubsequent ? 'var(--primary-light)' : 'var(--text-dim)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <input
                    type="checkbox"
                    checked={propagateSubsequent}
                    onChange={(e) => setPropagateSubsequent(e.target.checked)}
                  />
                  <span>Mudar subsequentes</span>
                </label>
              ) : <div />}

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {canEditAmount && (draftSubparts.length > 0 || hasBreakdown) && (
                  <button
                    type="button"
                    onClick={() => {
                      if (onUpdateEventDirect) {
                        onUpdateEventDirect({
                          ...event,
                          breakdownItems: undefined,
                          propagateForward: isRecurring ? propagateSubsequent : false
                        });
                      }
                      setIsDesmembramentoExpanded(false);
                    }}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      color: '#f87171',
                      cursor: 'pointer',
                      fontSize: '0.72rem',
                      fontWeight: '600',
                      textDecoration: 'underline',
                      marginRight: '6px'
                    }}
                  >
                    Voltar a Valor Único
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleCancelDesmembramento}
                  className="btn btn-secondary btn-sm"
                  style={{
                    fontSize: '0.74rem',
                    padding: '5px 12px',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}
                >
                  <X size={13} />
                  <span>Cancelar</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveDesmembramento}
                  className="btn btn-primary btn-sm"
                  style={{
                    fontSize: '0.74rem',
                    padding: '5px 14px',
                    borderRadius: '6px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    boxShadow: '0 2px 10px rgba(16, 185, 129, 0.3)'
                  }}
                >
                  <Check size={14} strokeWidth={2.5} />
                  <span>Salvar Desmembramento</span>
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Footer Meta & Actions (Always visible and interactive) */}
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
          {/* Ajustar / Juros exibido em parcelas em aberto de empréstimo */}
          {isLoanInstallment && event.status !== 'Pago' && (
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

          {/* Botão de Notas */}
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
                title={hasNotes ? `${t('actionNotes')} (${allNotes.length})` : t('actionAddNote')}
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

          {/* Botão de Desmembrar Valor */}
          {!isLoanInstallment && (onUpdateEventDirect || onEdit) && (() => {
            const allSubparts = Array.isArray(event.breakdownItems) ? event.breakdownItems : [];
            const hasBreakdown = allSubparts.length > 0;

            return (
              <button
                type="button"
                className="action-icon-btn"
                onClick={(e) => {
                  if (isDesmembramentoExpanded) {
                    handleCancelDesmembramento(e);
                  } else {
                    openDesmembramento(e);
                  }
                }}
                title={hasBreakdown ? t('actionBreakdown', { count: allSubparts.length }) : t('actionSplitValue')}
                style={{
                  color: hasBreakdown ? 'var(--primary-light)' : 'var(--text-dim)',
                  background: hasBreakdown ? 'rgba(99, 102, 241, 0.14)' : 'transparent',
                  border: hasBreakdown ? '1px solid rgba(99, 102, 241, 0.35)' : '1px solid transparent',
                  borderRadius: '6px',
                  padding: '4px 6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Layers size={14} />
                {hasBreakdown && (
                  <span style={{ fontSize: '0.68rem', fontWeight: '800', color: 'var(--primary-light)' }}>
                    {allSubparts.length}
                  </span>
                )}
              </button>
            );
          })()}

          {/* Botão / Indicador de Evento Automático (Apenas para Eventos Recorrentes / Parcelamentos) */}
          {isRecurringEvent && (
            <button
              type="button"
              className="action-icon-btn"
              onClick={(e) => {
                e.stopPropagation();
                if (!onUpdateEventDirect) return;
                const nextAuto = !localAuto;
                setLocalAuto(nextAuto);

                const targetSeriesKey = event.eventId || event.seriesId || (isLoanInstallment ? event.timelineId || event.timelineOriginId : event.id);

                let newStatus = event.status;
                let newIsCompleted = Boolean(event.isCompleted);

                if (nextAuto) {
                  const isPastOrToday = Boolean(event.date && event.date <= todayStr);
                  if (isPastOrToday && event.status !== 'cancelled' && event.status !== 'deleted' && event.status !== 'Cancelado' && event.status !== 'Excluido') {
                    if (isIncomeEvent) {
                      newStatus = 'received';
                      newIsCompleted = true;
                    } else if (isInvestmentEvent) {
                      newStatus = 'invested';
                      newIsCompleted = true;
                    } else if (isAmortization) {
                      newStatus = 'amortized';
                      newIsCompleted = true;
                    } else {
                      newStatus = 'paid';
                      newIsCompleted = true;
                    }
                  }
                  setLocalStatus(newStatus);
                }

                onUpdateEventDirect({
                  ...event,
                  seriesId: targetSeriesKey,
                  automatic: nextAuto,
                  isAutomatic: nextAuto,
                  status: newStatus,
                  isCompleted: newIsCompleted,
                  updateScope: 'all_series'
                });
              }}
              title={localAuto ? t('actionAutoOn') : t('actionAutoOff')}
              style={{
                color: localAuto ? '#fbbf24' : 'var(--text-dim)',
                background: localAuto ? 'rgba(251, 191, 36, 0.16)' : 'transparent',
                border: localAuto ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '3px 5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
            >
              <Zap size={13} fill={localAuto ? '#fbbf24' : 'none'} />
              {localAuto && (
                <span style={{ fontSize: '0.65rem', fontWeight: '800', letterSpacing: '0.02em', color: '#fbbf24' }}>
                  AUTO
                </span>
              )}
            </button>
          )}

          {/* Botão Editar Evento */}
          {onEdit && (
            <button
              type="button"
              className="action-icon-btn"
              onClick={() => onEdit(event)}
              title={t('actionEdit')}
            >
              <Edit3 size={15} />
            </button>
          )}

          {/* Botão Eliminar Evento - Sempre visível e ativo para TODOS os eventos */}
          {onDelete && (
            <button
              type="button"
              className="action-icon-btn delete"
              onClick={() => onDelete(event)}
              title={t('actionDelete')}
            >
              <Trash2 size={15} />
            </button>
          )}

          {/* Botão Bloquear / Desbloquear */}
          {isCompleted && (
            <button
              type="button"
              className="action-icon-btn"
              onClick={handleToggleLock}
              title={isLocked ? t('actionLock') : t('actionUnlock')}
              style={{
                color: isLocked ? '#10b981' : 'var(--text-dim)',
                background: isLocked ? 'rgba(16, 185, 129, 0.12)' : 'transparent',
                border: isLocked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid transparent',
                borderRadius: '6px',
                padding: '4px 6px',
                display: 'inline-flex',
                alignItems: 'center'
              }}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
