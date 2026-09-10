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
  ArrowUpRight,
  ArrowDownRight,
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
  Check,
  X,
  Target,
  Building2,
  UserCheck,
  FileCheck2,
  Ban,
  Utensils
} from 'lucide-react';
import { isLoanInstallment as checkIsLoanInstallment, isAmortizationEvent as checkIsAmortizationEvent } from '../utils/loanCalculations';
import { formatCurrency } from '../utils/formatCurrency';
import { format, parseISO, endOfMonth } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { generateUUID } from '../utils/uuid';
import { useTranslation } from '../i18n/LanguageContext.jsx';
import { EventType, TimelineType, EventStatus, EventPeriodicity, PersonType, AmortizationEventCategory, LoanEventCategory, InvestmentEventCategory } from '../enums/index.js';
import * as api from '../services/api.js';
import { compareEventsWithinDay } from '../utils/eventSorting.js';

const TimelineEventInnerItem = React.memo(function TimelineEventInnerItem({
  event,
  allEvents = [],
  currentTimelineId,
  timelineType,
  activeFinancialTab = null,
  onEdit,
  onUpdateEventDirect,
  onDelete,
  onToggleTask,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onToggleLoanPayment,
  onPayUpToHere,
  onOpenEditInstallment,
  onNavigateToTimeline
}) {
  const { t, language } = useTranslation();
  const [isNotesExpanded, setIsNotesExpanded] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [localAuto, setLocalAuto] = React.useState(Boolean(event.automatic || event.isAutomatic));
  const [localStatus, setLocalStatus] = React.useState(event.status);
  const [isTogglingStatus, setIsTogglingStatus] = useState(false);
  const [isPayingUpToHere, setIsPayingUpToHere] = useState(false);

  const handleStatusToggle = React.useCallback(async (e, explicitStatus = null) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isTogglingStatus || !onToggleLoanPayment) return;

    setIsTogglingStatus(true);
    try {
      await onToggleLoanPayment(event.id, explicitStatus);
    } catch (err) {
      console.error('Error toggling status:', err);
    } finally {
      setIsTogglingStatus(false);
    }
  }, [event.id, isTogglingStatus, onToggleLoanPayment]);

  const handlePayUpToHereClick = React.useCallback(async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (isPayingUpToHere || !onPayUpToHere) return;

    setIsPayingUpToHere(true);
    try {
      await onPayUpToHere(event);
    } catch (err) {
      console.error('Error paying up to here:', err);
    } finally {
      setIsPayingUpToHere(false);
    }
  }, [event, isPayingUpToHere, onPayUpToHere]);

  const isObligationEvent = Boolean(event.isObligation || event.is_obligation);
  const obligationPersonId = event.obligationPersonId || event.obligation_person_id;
  const obligationPerson = React.useMemo(() => {
    if (event.obligationPerson || event.obligation_person) {
      return event.obligationPerson || event.obligation_person;
    }
    if (isObligationEvent && obligationPersonId) {
      const tbId = event.timeboardId || event.timeboard_id;
      if (tbId) {
        const cached = api.getLocalPersons(tbId);
        const found = cached.find((p) => p.id === obligationPersonId);
        if (found) return found;
      }
    }
    return null;
  }, [event.obligationPerson, event.obligation_person, isObligationEvent, obligationPersonId, event.timeboardId, event.timeboard_id]);

  React.useEffect(() => {
    setLocalAuto(Boolean(event.automatic || event.isAutomatic));
    setLocalStatus(event.status);
  }, [event.automatic, event.isAutomatic, event.status]);

  const isBalanceView = timelineType === TimelineType.BALANCE;
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentMonthEndStr = format(endOfMonth(now), 'yyyy-MM-dd');

  const effectiveStatus = (localStatus || event.status || '').toLowerCase();
  const isAmortization = checkIsAmortizationEvent(event);
  const isLoanInstallment =
    checkIsLoanInstallment(event) ||
    Boolean(event.isSystemLoanEvent && !isAmortization) ||
    Boolean(event.installmentNumber || event.installment_number) ||
    Boolean(currentTimelineId && String(currentTimelineId).includes('loan')) ||
    Boolean(event.timelineId && String(event.timelineId).includes('loan'));
  const isIncomeEvent = event.eventType === EventType.INCOME;
  const isExpenseEvent = event.eventType === EventType.EXPENSE;
  const isInvestmentEvent = event.eventType === EventType.INVESTMENT;
  const isSavingsInvestment = isInvestmentEvent && (
    !event.category ||
    event.category === 'savings' ||
    event.category === InvestmentEventCategory.SAVINGS ||
    event.category === 'investimento_poupanca' ||
    event.category === 'poupanca'
  );

  const isRecurringEvent = Boolean(
    event.isRecurring === true ||
    event.is_recurring === true ||
    event.periodicity === EventPeriodicity.RECURRING ||
    event.periodicity === EventPeriodicity.RECURRENT ||
    event.periodicity === EventPeriodicity.PERIOD ||
    Boolean(event.seriesId) ||
    isLoanInstallment
  ) &&
    event.periodicity !== EventPeriodicity.ONCE &&
    event.periodicity !== EventPeriodicity.UNIQUE;

  const isInertFuture = event.date > currentMonthEndStr;

  const isCancelled =
    effectiveStatus === EventStatus.CANCELLED ||
    effectiveStatus === 'cancelled' ||
    effectiveStatus === 'cancelado' ||
    event.status === EventStatus.CANCELLED ||
    event.status === 'cancelled' ||
    event.status === 'Cancelado';

  const isCompleted = !isCancelled && (
    effectiveStatus === EventStatus.PAID ||
    effectiveStatus === EventStatus.RECEIVED ||
    effectiveStatus === EventStatus.INVESTED ||
    effectiveStatus === EventStatus.SETTLED ||
    effectiveStatus === EventStatus.COMPLETED ||
    effectiveStatus === EventStatus.AMORTIZED
  );

  const isOverdue = Boolean(
    event.date &&
    event.date < todayStr &&
    !isCompleted &&
    !isCancelled &&
    effectiveStatus !== EventStatus.DELETED
  );

  const isReceivedIncome = isIncomeEvent && isCompleted && !isCancelled;
  const isOverdueIncome = isIncomeEvent && isOverdue && !isCancelled;
  const isNextIncome = isIncomeEvent && event.date >= todayStr && event.date <= currentMonthEndStr && !isReceivedIncome && !isCancelled;
  const isFarFutureIncome = isIncomeEvent && event.date > currentMonthEndStr && !isReceivedIncome && !isCancelled;

  const isPaidExpense = isExpenseEvent && isCompleted && !isCancelled;
  const isOverdueExpense = isExpenseEvent && isOverdue && !isCancelled;

  const isCompletedInvestment = isInvestmentEvent && isCompleted && !isCancelled;
  const isOverdueInvestment = isInvestmentEvent && isOverdue && !isCancelled;

  const isPaidLoan = isLoanInstallment && !isCancelled && (effectiveStatus === EventStatus.PAID || effectiveStatus === EventStatus.SETTLED || effectiveStatus === EventStatus.COMPLETED || effectiveStatus === EventStatus.AMORTIZED);
  const isOverdueLoan = isLoanInstallment && !isCancelled && (isOverdue || effectiveStatus === EventStatus.OVERDUE);
  const isAmortized = isLoanInstallment && !isCancelled && effectiveStatus === EventStatus.AMORTIZED;

  const abatedBreakdown = React.useMemo(() => {
    if (!isAmortized) return null;

    let origCapital = Number(
      event.originalInstallmentCapital ??
      event.originalCapital ??
      event.principalAmount ??
      0
    );
    let origInterest = Number(
      event.originalInstallmentInterest ??
      event.originalInterest ??
      event.savedInterest ??
      event.interestPortion ??
      event.interestAmount ??
      0
    );
    let origFee = Number(
      event.originalInstallmentFee ??
      event.installmentFee ??
      event.taxAmount ??
      0
    );
    let origTotal = Number(
      event.originalInstallmentAmount ??
      event.originalAmount ??
      0
    );

    // If values were not stored directly, extract them from description
    if ((!origCapital || !origInterest) && event.description) {
      const match = event.description.match(/([\d\s.,]+)\s*€?\s*capital\s*\+\s*([\d\s.,]+)\s*€?\s*(?:interest|juros)/i);
      if (match && match[1] && match[2]) {
        const parsedCap = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
        const parsedInt = parseFloat(match[2].replace(/\s/g, '').replace(',', '.'));
        if (!isNaN(parsedCap) && parsedCap > 0) origCapital = parsedCap;
        if (!isNaN(parsedInt) && parsedInt > 0) origInterest = parsedInt;
      }
    }

    if (!origTotal) {
      origTotal = origCapital + origInterest + origFee;
    }

    return { origTotal, origCapital, origInterest, origFee };
  }, [
    isAmortized,
    event.originalInstallmentCapital,
    event.originalCapital,
    event.principalAmount,
    event.originalInstallmentInterest,
    event.originalInterest,
    event.savedInterest,
    event.interestPortion,
    event.interestAmount,
    event.originalInstallmentFee,
    event.installmentFee,
    event.taxAmount,
    event.originalInstallmentAmount,
    event.originalAmount,
    event.description
  ]);

  const reducedBreakdown = React.useMemo(() => {
    if (isAmortized) return null;
    const currentTotal = Number(event.installmentAmount ?? event.amount ?? 0);
    const origTotal = Number(event.originalInstallmentAmount ?? event.originalAmount ?? 0);
    const origCap = Number(event.originalInstallmentCapital ?? event.originalCapital ?? 0);
    const currentCap = Number(event.installmentCapital ?? event.principalAmount ?? event.principal_amount ?? 0);

    const isReduced =
      origTotal > 0 &&
      currentTotal > 0 &&
      origTotal > currentTotal + 0.01;

    if (!isReduced) return null;

    const amortizedAmount = Math.max(0, Math.round((origTotal - currentTotal) * 100) / 100);
    const amortizedCapital = origCap > currentCap ? Math.max(0, Math.round((origCap - currentCap) * 100) / 100) : amortizedAmount;

    return {
      isReduced: true,
      origTotal,
      currentTotal,
      amortizedAmount,
      amortizedCapital
    };
  }, [
    isAmortized,
    event.installmentAmount,
    event.amount,
    event.originalInstallmentAmount,
    event.originalAmount,
    event.originalInstallmentCapital,
    event.originalCapital,
    event.installmentCapital,
    event.principalAmount,
    event.principal_amount
  ]);

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

  const canEditAmount = true;

  const isRecurring = Boolean(
    event.periodicity === EventPeriodicity.RECURRING ||
    event.periodicity === EventPeriodicity.RECURRENT ||
    event.isRecurring === true ||
    event.is_recurring === true ||
    Boolean(event.seriesId)
  ) &&
    event.periodicity !== EventPeriodicity.ONCE &&
    event.periodicity !== EventPeriodicity.UNIQUE;

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
        name: trimmed,
        title: trimmed,
        propagateForward: isRecurring,
        updateAllRecurring: isRecurring,
        updateScope: isRecurring ? 'subsequent' : 'single'
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

    finalItems = finalItems.map((it) => ({
      ...it,
      amount: parseFloat(it.amount) || 0
    }));

    const calculatedSum = finalItems.reduce((acc, it) => acc + (parseFloat(it.amount) || 0), 0);

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
    setDraftSubparts((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, amount: newAmountStr } : it))
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
          setPropagateSubsequent(true);
          setIsEditingAmount(true);
        }}
        title={
          isRecurring
            ? 'Clique para editar o valor (propaga para todos os meses seguintes)'
            : 'Clique para editar o valor'
        }
        style={{
          fontSize: '1.05rem',
          fontWeight: '800',
          color: defaultColor,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '5px',
          textDecoration: isCancelled ? 'line-through' : 'none',
          transition: 'opacity 0.15s ease'
        }}
      >
        {prefix}{formatCurrency(event.amount)}
      </span>
    );
  };

  const isMemoryCard = event.category === 'memoria';

  // Category Info & Styles
  const getCategoryMeta = (cat) => {
    const normalizedCat = (cat || '').toLowerCase().trim();
    switch (normalizedCat) {
      case 'meal_allowance':
      case 'mealallowance':
      case 'subsidio_alimentacao':
      case 'subsidio_refeicao':
        return {
          label: t('incomeCategories.meal_allowance') || 'Meal Allowance',
          icon: <Utensils size={11} />,
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#f59e0b',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'salary':
      case 'entrada_recorrente':
        return {
          label: t('incomeCategories.salary') || 'Salário',
          icon: <DollarSign size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'bonus':
      case 'entrada_esporadica':
        return {
          label: t('incomeCategories.bonus') || 'Bónus',
          icon: <Gift size={11} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#06b6d4',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      case 'freelance':
        return {
          label: t('incomeCategories.freelance') || 'Freelance',
          icon: <Zap size={11} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#06b6d4',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      case 'investment_return':
        return {
          label: t('incomeCategories.investment_return') || 'Retorno de Investimento',
          icon: <TrendingUp size={11} />,
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#3b82f6',
          border: 'rgba(59, 130, 246, 0.3)'
        };
      case 'recurring_income':
        return {
          label: t('incomeCategories.recurring_income') || 'Entrada Recorrente',
          icon: <Repeat size={11} />,
          bg: 'rgba(20, 184, 166, 0.15)',
          color: '#14b8a6',
          border: 'rgba(20, 184, 166, 0.3)'
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
      case 'electricity':
        return {
          label: 'Eletricidade',
          icon: <Zap size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: '#818cf8',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      case 'water':
        return {
          label: 'Água',
          icon: <Tag size={12} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#34d399',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      case 'gas':
        return {
          label: 'Gás',
          icon: <Tag size={12} />,
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'communications':
        return {
          label: 'Comunicações / TV',
          icon: <CreditCard size={12} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#22d3ee',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      case 'rent':
        return {
          label: 'Renda / Habitação',
          icon: <Home size={12} />,
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          border: 'rgba(168, 85, 247, 0.3)'
        };
      case 'health':
        return {
          label: 'Saúde',
          icon: <Tag size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#fb7185',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'food':
        return {
          label: 'Alimentação / Supermercado',
          icon: <ShoppingCart size={12} />,
          bg: 'rgba(244, 63, 94, 0.15)',
          color: '#f43f5e',
          border: 'rgba(244, 63, 94, 0.3)'
        };
      case 'transportation':
        return {
          label: 'Transporte / Combustível',
          icon: <Car size={12} />,
          bg: 'rgba(59, 130, 246, 0.15)',
          color: '#60a5fa',
          border: 'rgba(59, 130, 246, 0.3)'
        };
      case 'carmaintenance':
        return {
          label: 'Manutenção Auto',
          icon: <Car size={12} />,
          bg: 'rgba(245, 158, 11, 0.15)',
          color: '#fbbf24',
          border: 'rgba(245, 158, 11, 0.3)'
        };
      case 'house':
      case 'housemaintenance':
        return {
          label: 'Casa / Habitação',
          icon: <Home size={12} />,
          bg: 'rgba(168, 85, 247, 0.15)',
          color: '#c084fc',
          border: 'rgba(168, 85, 247, 0.3)'
        };
      case 'services':
      case 'fixed_expense':
        return {
          label: 'Serviços',
          icon: <Sliders size={12} />,
          bg: 'rgba(100, 116, 139, 0.15)',
          color: '#94a3b8',
          border: 'rgba(100, 116, 139, 0.3)'
        };
      case 'ensurance':
        return {
          label: 'Seguros',
          icon: <FileText size={12} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: '#818cf8',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      default: {
        const cleaned = cat
          ? cat.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'Agendamento';
        return {
          label: cleaned,
          icon: <Tag size={11} />,
          bg: 'rgba(6, 182, 212, 0.15)',
          color: '#67e8f9',
          border: 'rgba(6, 182, 212, 0.3)'
        };
      }
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
          label: t('status.received'),
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
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
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
          label: t('status.settled'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueLoan) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      return {
        label: t('status.pending'),
        icon: <Circle size={11} />,
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    }

    if (isExpenseEvent) {
      if (isPaidExpense) {
        return {
          label: t('status.paid'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(16, 185, 129, 0.15)',
          color: '#10b981',
          border: 'rgba(16, 185, 129, 0.3)'
        };
      }
      if (isOverdueExpense) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      return {
        label: t('status.pending'),
        icon: <Clock size={11} />,
        bg: 'rgba(245, 158, 11, 0.15)',
        color: '#f59e0b',
        border: 'rgba(245, 158, 11, 0.3)'
      };
    }

    if (isInvestmentEvent) {
      if (isCompletedInvestment) {
        return {
          label: t('status.invested'),
          icon: <CheckCircle2 size={11} />,
          bg: 'rgba(99, 102, 241, 0.15)',
          color: 'var(--primary-light)',
          border: 'rgba(99, 102, 241, 0.3)'
        };
      }
      if (isOverdueInvestment) {
        return {
          label: t('status.overdue'),
          icon: <AlertCircle size={11} />,
          bg: 'rgba(252, 191, 73, 0.18)',
          color: '#fcbf49',
          border: 'rgba(252, 191, 73, 0.4)',
          pulsing: true
        };
      }
      return {
        label: t('status.planned'),
        icon: <Clock size={11} />,
        bg: 'rgba(99, 102, 241, 0.1)',
        color: 'var(--primary-light)',
        border: 'rgba(99, 102, 241, 0.2)'
      };
    }

    if (!isCompleted && isOverdue) {
      return {
        label: t('status.overdue'),
        icon: <AlertCircle size={11} />,
        bg: 'rgba(252, 191, 73, 0.18)',
        color: '#fcbf49',
        border: 'rgba(252, 191, 73, 0.4)',
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

  // Card specific backgrounds and theme palette
  const getCardTheme = () => {
    if (isIncomeEvent) {
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        lightText: '#34d399'
      };
    }
    if (isExpenseEvent) {
      return {
        color: '#f43f5e',
        bg: 'rgba(244, 63, 94, 0.12)',
        border: 'rgba(244, 63, 94, 0.3)',
        lightText: '#fb7185'
      };
    }
    if (isInvestmentEvent) {
      return {
        color: '#8b5cf6',
        bg: 'rgba(139, 92, 246, 0.12)',
        border: 'rgba(139, 92, 246, 0.3)',
        lightText: '#a78bfa'
      };
    }
    if (isLoanInstallment) {
      return {
        color: '#0ea5e9',
        bg: 'rgba(14, 165, 233, 0.12)',
        border: 'rgba(14, 165, 233, 0.3)',
        lightText: '#38bdf8'
      };
    }
    if (isAmortization) {
      return {
        color: '#10b981',
        bg: 'rgba(16, 185, 129, 0.12)',
        border: 'rgba(16, 185, 129, 0.3)',
        lightText: '#34d399'
      };
    }
    return {
      color: 'var(--primary-light, #818cf8)',
      bg: 'rgba(99, 102, 241, 0.12)',
      border: 'rgba(99, 102, 241, 0.3)',
      lightText: 'var(--text-main, #e2e8f0)'
    };
  };

  const cardTheme = getCardTheme();

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
      timelineId: event.timelineOriginId,
      tab: event.timelineOriginId
    };
  };

  const originInfo = getEventOriginInfo();

  const renderCardInnerHeader = () => (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: '8px',
        flexWrap: 'wrap',
        width: '100%',
        marginBottom: '2px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', flex: 1, minWidth: 0 }}>
        {/* Ícone de Único ou Recorrente */}
        <span
          title={isRecurring ? 'Recorrente' : 'Único / Pontual'}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isInertFuture ? 'var(--text-dim)' : 'var(--primary-light)',
            opacity: 0.85,
            flexShrink: 0,
            marginTop: '2px'
          }}
        >
          {isRecurring ? <Repeat size={14} strokeWidth={2.2} /> : <Zap size={14} strokeWidth={2.2} />}
        </span>

        <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minWidth: 0, gap: '2px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: 0 }}>
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
                <h3
                  className="event-title"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isAmortized) return;
                    if (isLoanInstallment) {
                      handleNavigateToTimelineOrigin();
                    } else {
                      setIsEditingTitle(true);
                    }
                  }}
                  title={
                    isAmortized
                      ? 'Esta parcela foi totalmente liquidada/abatida por amortização extraordinária.'
                      : isLoanInstallment
                        ? `Clique para ir à timeline do ${originInfo ? originInfo.label : 'Empréstimo'}`
                        : isRecurring
                          ? "Clique para editar o nome (altera em todos os meses)"
                          : "Clique para editar o nome"
                  }
                  style={{
                    margin: 0,
                    fontSize: '0.98rem',
                    fontWeight: '700',
                    color: (isAmortized || isCancelled) ? 'var(--text-dim)' : isInertFuture ? 'var(--text-muted)' : 'var(--text-main)',
                    textDecoration: (isAmortized || isCancelled) ? 'line-through' : 'none',
                    cursor: isAmortized ? 'default' : 'pointer'
                  }}
                >
                  {(event.title || '').replace(/\s*\([\d.,\s€]+?\)\s*$/i, '')}
                </h3>
              )}

              {/* Labels / Tags next to Title */}
              <div className="tag-list" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                {/* Custom Labels / Etiquetas */}
                {event.labels && event.labels.map((lbl, i) => (
                  <span
                    key={i}
                    className="event-tag"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      fontSize: '0.70rem',
                      padding: '2px 7px',
                      borderRadius: '5px'
                    }}
                  >
                    <Tag size={10} /> {lbl}
                  </span>
                ))}

                {/* Amortized badge */}
                {isAmortized && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    <span
                      style={{
                        background: 'rgba(16, 185, 129, 0.14)',
                        color: '#10b981',
                        border: '1px solid rgba(16, 185, 129, 0.35)',
                        padding: '2px 7px',
                        borderRadius: '5px',
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
                          padding: '2px 7px',
                          borderRadius: '5px',
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

                {event.author && (
                  <span className="event-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.70rem', padding: '2px 7px' }}>
                    <User size={10} /> {event.author}
                  </span>
                )}

                {/* Origin / Sub-vision Clean Text Indicator - On Balanço, Principal or Gastos for loans/investments */}
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
                      border: activeFinancialTab === 'gastos' ? '1px solid rgba(99, 102, 241, 0.25)' : '1px solid var(--border-glass)',
                      borderRadius: '5px',
                      padding: '2px 7px',
                      color: isInertFuture ? 'var(--text-dim)' : originInfo.color,
                      fontWeight: '700',
                      fontSize: '0.70rem',
                      cursor: isInertFuture ? 'default' : (onNavigateToTimeline ? 'pointer' : 'default'),
                      pointerEvents: isInertFuture ? 'none' : 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '3px',
                      flexShrink: 0
                    }}
                    title={`Ir para a timeline do ${originInfo.label}`}
                  >
                    <span>{originInfo.label}</span>
                    <ArrowUpRight size={11} strokeWidth={2.5} style={{ opacity: isInertFuture ? 0.4 : 0.8 }} />
                  </button>
                )}
              </div>
            </div>

            {/* Informações da Obrigação: obligation ID em cima e person name abaixo alinhado à direita */}
            {isObligationEvent && (() => {
              const personDisplayName = obligationPerson?.name || obligationPerson?.personName || event.obligationPersonName || event.obligation_person_name || '';
              const personIdCode = obligationPerson?.obligatorIdentification || obligationPerson?.obligator_identification || obligationPerson?.taxId || obligationPerson?.tax_id || event.obligatorIdentification || event.obligator_identification || event.obligationIdentifier || event.obligation_identifier || '';
              const personType = obligationPerson?.type || PersonType.PERSON;

              return (
                <div
                  style={{
                    marginLeft: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end',
                    justifyContent: 'center',
                    gap: '2px',
                    flexShrink: 0,
                    textAlign: 'right'
                  }}
                  title={
                    personDisplayName
                      ? `Obrigação: ${personIdCode ? `${personIdCode} - ` : ''}${personDisplayName} (${personType === PersonType.ORGANIZATION
                        ? (t('timeboardSettings.entities.types.organization') || 'Empresa')
                        : personType === PersonType.MEMBER
                          ? (t('timeboardSettings.entities.types.member') || 'Membro')
                          : (t('timeboardSettings.entities.types.person') || 'Pessoa')
                      })`
                      : (t('modal.obligation') || 'Obrigação')
                  }
                >
                  {/* Linha de cima: Obligation ID */}
                  {personIdCode ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.84rem',
                        fontWeight: '800',
                        color: 'var(--text-main, #ffffff)',
                        lineHeight: 1.2
                      }}
                    >
                      <FileCheck2 size={13} style={{ color: cardTheme.color || '#f59e0b', flexShrink: 0 }} />
                      <span>{personIdCode}</span>
                    </div>
                  ) : !personDisplayName ? (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.74rem',
                        fontWeight: '800',
                        color: cardTheme.color || '#f59e0b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        lineHeight: 1.2
                      }}
                    >
                      <FileCheck2 size={12} style={{ color: cardTheme.color || '#f59e0b', flexShrink: 0 }} />
                      <span>{t('modal.obligation') || 'Obrigação'}</span>
                    </div>
                  ) : null}

                  {/* Linha de baixo: Person Name com ícone de user */}
                  {personDisplayName && (
                    <div
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        color: 'var(--text-muted, #94a3b8)',
                        lineHeight: 1.2
                      }}
                    >
                      {personType === PersonType.ORGANIZATION ? (
                        <Building2 size={12} style={{ opacity: 0.85, flexShrink: 0 }} />
                      ) : personType === PersonType.MEMBER ? (
                        <UserCheck size={12} style={{ opacity: 0.85, flexShrink: 0 }} />
                      ) : (
                        <User size={12} style={{ opacity: 0.85, flexShrink: 0 }} />
                      )}
                      <span>{personDisplayName}</span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>

          {/* Categoria do Evento debaixo do título (com ícone da categoria e texto sem _) */}
          {event.category && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.74rem',
                color: 'var(--text-dim, #94a3b8)',
                fontWeight: '500',
                lineHeight: '1.2'
              }}
            >
              {catMeta?.icon && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    opacity: 0.85,
                    color: catMeta.color || 'inherit'
                  }}
                >
                  {catMeta.icon}
                </span>
              )}
              <span>
                {catMeta?.label || event.category.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderActionButtons = () => (
    <div className="event-card-actions" style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
      {/* Botão Pagar até aqui para parcelas de empréstimo / dívida em aberto (apenas até ao mês atual) */}
      {isLoanInstallment && !isPaidLoan && onPayUpToHere && (event.date <= currentMonthEndStr) && (
        <button
          type="button"
          disabled={isPayingUpToHere}
          className="btn btn-secondary btn-sm"
          onClick={handlePayUpToHereClick}
          style={{
            padding: '3px 8px',
            fontSize: '0.72rem',
            gap: '4px',
            background: 'rgba(16, 185, 129, 0.14)',
            color: '#10b981',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            fontWeight: '700',
            borderRadius: '5px',
            cursor: isPayingUpToHere ? 'not-allowed' : 'pointer',
            opacity: isPayingUpToHere ? 0.6 : 1,
            pointerEvents: isPayingUpToHere ? 'none' : 'auto',
            transition: 'all 0.15s ease'
          }}
          title={t('buttons.payUpToHereTitle') || "Marcar como pagas todas as prestações deste empréstimo anteriores a esta parcela (inclusive)"}
        >
          <CheckCircle2 size={12} style={{ color: '#10b981' }} />
          <span>{t('buttons.payUpToHere') || "Pagar até aqui"}</span>
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
            onClick={(e) => {
              e.stopPropagation();
              setIsNotesExpanded(!isNotesExpanded);
            }}
            title={hasNotes ? `${t('actionNotes')} (${allNotes.length})` : t('actionAddNote')}
            style={{
              color: hasNotes ? '#f59e0b' : 'var(--text-dim)',
              background: hasNotes ? 'rgba(245, 158, 11, 0.14)' : 'transparent',
              border: hasNotes ? '1px solid rgba(245, 158, 11, 0.35)' : '1px solid transparent',
              borderRadius: '5px',
              padding: '3px 5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <FileText size={13} />
            {hasNotes && (
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: '#f59e0b' }}>
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
              borderRadius: '5px',
              padding: '3px 5px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Layers size={13} />
            {hasBreakdown && (
              <span style={{ fontSize: '0.65rem', fontWeight: '800', color: 'var(--primary-light)' }}>
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

            const targetSeriesKey = event.seriesId || event.eventId;

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
          title={localAuto ? "⚡ Movimento Automático Ativo: Liquida automaticamente na data de vencimento (Clique para desligar em toda a série)" : "⚙️ Movimento Manual: Clique para ativar a liquidação automática em toda a série"}
          style={{
            color: localAuto ? '#fbbf24' : 'var(--text-dim)',
            background: localAuto ? 'rgba(251, 191, 36, 0.16)' : 'transparent',
            border: localAuto ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid transparent',
            borderRadius: '5px',
            padding: '2px 5px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Zap size={12} fill={localAuto ? '#fbbf24' : 'none'} />
          {localAuto && (
            <span style={{ fontSize: '0.62rem', fontWeight: '800', letterSpacing: '0.02em', color: '#fbbf24' }}>
              AUTO
            </span>
          )}
        </button>
      )}

      {/* Botão Editar Evento - Não permitido para parcelas de empréstimo */}
      {onEdit && !isLoanInstallment && (
        <button
          type="button"
          className="action-icon-btn"
          onClick={(e) => {
            e.stopPropagation();
            onEdit(event);
          }}
          title="Editar detalhes do evento (Nome, Data, Valor, Categoria, Notas)"
          style={{ padding: '3px 5px', borderRadius: '5px' }}
        >
          <Edit3 size={13} />
        </button>
      )}

      {/* Botão Eliminar Evento - Não permitido para parcelas de empréstimo */}
      {onDelete && !isLoanInstallment && (
        <button
          type="button"
          className="action-icon-btn delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(event);
          }}
          title="Eliminar este evento permanentemente"
          style={{ padding: '3px 5px', borderRadius: '5px' }}
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );

  return (
    <div
      className={`event-inner-item ${isMemoryCard ? 'memory-card' : ''} ${isInertFuture ? 'is-inert-future-card' : ''}`}
      style={{ display: 'flex', flexDirection: 'column', gap: '4px', width: '100%' }}
    >
      {/* 💰 Income (Entrada) Financial Highlight Strip (boc in) */}
      {isIncomeEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', paddingBottom: '0px', marginBottom: '0px', lineHeight: 1 }}>
              {t('status.toReceive') || 'A Receber'}
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {isInertFuture ? (
                <div
                  style={{
                    background: 'rgba(148, 163, 184, 0.08)',
                    color: 'var(--text-dim)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'default',
                    userSelect: 'none'
                  }}
                >
                  <Clock size={12} />
                  <span>{t('status.planned')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isTogglingStatus}
                  onClick={handleStatusToggle}
                  className="btn btn-sm"
                  title="Clique para alternar o status"
                  style={{
                    background: isCancelled
                      ? 'rgba(148, 163, 184, 0.15)'
                      : isReceivedIncome
                        ? 'rgba(16, 185, 129, 0.16)'
                        : isOverdueIncome
                          ? 'rgba(252, 191, 73, 0.16)'
                          : isNextIncome
                            ? 'rgba(245, 158, 11, 0.14)'
                            : 'rgba(148, 163, 184, 0.1)',
                    color: isCancelled
                      ? '#94a3b8'
                      : isReceivedIncome
                        ? '#10b981'
                        : isOverdueIncome
                          ? '#fcbf49'
                          : isNextIncome
                            ? '#f59e0b'
                            : '#94a3b8',
                    border: isCancelled
                      ? '1px solid rgba(148, 163, 184, 0.35)'
                      : isReceivedIncome
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : isOverdueIncome
                          ? '1px solid rgba(252, 191, 73, 0.4)'
                          : isNextIncome
                            ? '1px solid rgba(245, 158, 11, 0.35)'
                            : '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    boxShadow: isOverdueIncome
                      ? '0 2px 10px rgba(252, 191, 73, 0.25)'
                      : isReceivedIncome
                        ? '0 2px 8px rgba(16, 185, 129, 0.2)'
                        : 'none'
                  }}
                >
                  {isCancelled ? (
                    <>
                      <Ban size={13} style={{ color: '#94a3b8' }} />
                      <span>{t('status.cancelled')}</span>
                    </>
                  ) : isReceivedIncome ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                      <span>{t('status.received')}</span>
                    </>
                  ) : isOverdueIncome ? (
                    <>
                      <AlertCircle size={13} style={{ color: '#fcbf49' }} />
                      <span>{t('status.overdue')}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} style={{ color: isNextIncome ? '#f59e0b' : '#94a3b8' }} />
                      <span>{t('status.toReceive')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderEditableAmount('+', isInertFuture ? '#94a3b8' : (isNextIncome ? '#f59e0b' : isFarFutureIncome ? '#94a3b8' : '#10b981'))}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 🛒 Expense (Gasto/Saída) Financial Highlight Strip (boc in) */}
      {isExpenseEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', paddingBottom: '0px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
                {t('status.toPay') || 'A Pagar'}
              </span>
              {event.priority && !isInertFuture && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Prioridade:
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    {event.priority}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {isInertFuture ? (
                <div
                  style={{
                    background: 'rgba(148, 163, 184, 0.08)',
                    color: 'var(--text-dim)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'default',
                    userSelect: 'none'
                  }}
                >
                  <Clock size={12} />
                  <span>{t('status.pending')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isTogglingStatus}
                  onClick={handleStatusToggle}
                  className="btn btn-sm"
                  title="Clique para alternar o status"
                  style={{
                    background: isCancelled
                      ? 'rgba(148, 163, 184, 0.15)'
                      : isPaidExpense
                        ? 'rgba(16, 185, 129, 0.16)'
                        : isOverdueExpense
                          ? 'rgba(252, 191, 73, 0.16)'
                          : 'rgba(245, 158, 11, 0.14)',
                    color: isCancelled
                      ? '#94a3b8'
                      : isPaidExpense
                        ? '#10b981'
                        : isOverdueExpense
                          ? '#fcbf49'
                          : '#f59e0b',
                    border: isCancelled
                      ? '1px solid rgba(148, 163, 184, 0.35)'
                      : isPaidExpense
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : isOverdueExpense
                          ? '1px solid rgba(252, 191, 73, 0.4)'
                          : '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isCancelled ? (
                    <>
                      <Ban size={13} style={{ color: '#94a3b8' }} />
                      <span>{t('status.cancelled')}</span>
                    </>
                  ) : isPaidExpense ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                      <span>{t('status.paid')}</span>
                    </>
                  ) : isOverdueExpense ? (
                    <>
                      <AlertCircle size={13} style={{ color: '#fcbf49' }} />
                      <span>{t('status.overdue')}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} style={{ color: '#f59e0b' }} />
                      <span>{t('status.pending')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {renderEditableAmount('-', isInertFuture ? '#94a3b8' : '#f43f5e')}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 📈 Investment (Investimento/Poupança/Património) Financial Highlight Strip (boc in) */}
      {isInvestmentEvent && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingBottom: '0px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
                {event.category === 'investimento_patrimonio'
                  ? 'Valor Atual do Património'
                  : (Number(event.amount || 0) > 0 ? 'Aporte do Mês' : 'Aporte Mensal')}
              </span>

              {event.category === 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && Number(event.amount || 0) > 0 && Number(event.initialInvestedAmount) !== Number(event.amount) && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                      Aquisição:
                    </span>
                    <span style={{ fontSize: '0.80rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                      {formatCurrency(event.initialInvestedAmount)}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                    <span style={{ fontSize: '0.68rem', color: (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '#10b981' : '#f43f5e', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <TrendingUp size={11} /> Valorização:
                    </span>
                    <span style={{ fontSize: '0.80rem', fontWeight: '800', color: (Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '#10b981' : '#f43f5e' }}>
                      {(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                      {formatCurrency(Number(event.amount) - Number(event.initialInvestedAmount))}
                      <span style={{ fontSize: '0.70rem', marginLeft: '4px', fontWeight: '700' }}>
                        ({(Number(event.amount) - Number(event.initialInvestedAmount)) >= 0 ? '+' : ''}
                        {(((Number(event.amount) - Number(event.initialInvestedAmount)) / Number(event.initialInvestedAmount)) * 100).toFixed(1)}%)
                      </span>
                    </span>
                  </div>
                </>
              )}

              {event.category === 'investimento_patrimonio' && event.linkedLoanTimelineName && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#38bdf8', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <CreditCard size={11} /> Financiamento:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '700', color: '#38bdf8' }}>
                    {event.linkedLoanTimelineName}
                  </span>
                </div>
              )}

              {event.category !== 'investimento_patrimonio' && Number(event.initialInvestedAmount || 0) > 0 && (event.isFirstOccurrence === true || (!event.isProjected && !event.eventId || event.seriesId) || (event.isFirstOccurrence !== false && !event.isProjected)) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Aporte Inicial:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isInertFuture ? 'var(--text-dim)' : 'var(--primary-light)' }}>
                    {formatCurrency(event.initialInvestedAmount)}
                  </span>
                </div>
              )}

              {event.category !== 'investimento_patrimonio' && Number(event.targetAmount || 0) > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#a78bfa', textTransform: 'uppercase', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Target size={11} /> Meta:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#a78bfa' }}>
                    {formatCurrency(event.targetAmount)}
                  </span>
                </div>
              )}

              {(event.isExternal || event.is_external) && (
                <div style={{ display: 'flex', alignItems: 'center', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span
                    style={{
                      background: 'rgba(139, 92, 246, 0.14)',
                      color: '#a78bfa',
                      border: '1px solid rgba(139, 92, 246, 0.35)',
                      padding: '2px 7px',
                      borderRadius: '5px',
                      fontSize: '0.68rem',
                      fontWeight: '700',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title={t('modal.isExternalDepositHint') || 'Depósito externo (não compromete renda)'}
                  >
                    <ExternalLink size={10} strokeWidth={2.5} />
                    <span>{t('modal.externalDeposit') || 'Depósito Externo'}</span>
                  </span>
                </div>
              )}
            </div>

            {/* Status Pill & Action */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {isSavingsInvestment && (
                <button
                  type="button"
                  onClick={(e) => e.stopPropagation()}
                  className="btn btn-sm"
                  title={t('buttons.withdrawal') || 'Withdrawal'}
                  style={{
                    background: 'rgba(139, 92, 246, 0.12)',
                    color: '#a78bfa',
                    border: '1px solid rgba(139, 92, 246, 0.3)',
                    borderRadius: '9999px',
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <ArrowDownRight size={12} strokeWidth={2.4} />
                  <span>{t('buttons.withdrawal') || 'Withdrawal'}</span>
                </button>
              )}

              {isInertFuture ? (
                <div
                  style={{
                    background: 'rgba(148, 163, 184, 0.08)',
                    color: 'var(--text-dim)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'default',
                    userSelect: 'none'
                  }}
                >
                  <Clock size={12} />
                  <span>{t('status.planned')}</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isTogglingStatus}
                  onClick={handleStatusToggle}
                  className="btn btn-sm"
                  title="Clique para alternar o status"
                  style={{
                    background: isCancelled
                      ? 'rgba(148, 163, 184, 0.15)'
                      : event.category === 'investimento_patrimonio'
                        ? (event.status === 'Financiado' ? 'rgba(2, 132, 199, 0.16)' : 'rgba(16, 185, 129, 0.16)')
                        : isCompletedInvestment
                          ? 'rgba(139, 92, 246, 0.16)'
                          : isOverdueInvestment
                            ? 'rgba(252, 191, 73, 0.16)'
                            : 'rgba(148, 163, 184, 0.12)',
                    color: isCancelled
                      ? '#94a3b8'
                      : event.category === 'investimento_patrimonio'
                        ? (event.status === 'Financiado' ? '#38bdf8' : '#10b981')
                        : isCompletedInvestment
                          ? '#8b5cf6'
                          : isOverdueInvestment
                            ? '#fcbf49'
                            : '#94a3b8',
                    border: isCancelled
                      ? '1px solid rgba(148, 163, 184, 0.35)'
                      : event.category === 'investimento_patrimonio'
                        ? (event.status === 'Financiado' ? '1px solid rgba(2, 132, 199, 0.4)' : '1px solid rgba(16, 185, 129, 0.4)')
                        : isCompletedInvestment
                          ? '1px solid rgba(139, 92, 246, 0.35)'
                          : isOverdueInvestment
                            ? '1px solid rgba(252, 191, 73, 0.4)'
                            : '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isCancelled ? (
                    <>
                      <Ban size={13} style={{ color: '#94a3b8' }} />
                      <span>{t('status.cancelled')}</span>
                    </>
                  ) : event.category === 'investimento_patrimonio' ? (
                    event.status === 'Financiado' ? (
                      <>
                        <CreditCard size={13} style={{ color: '#38bdf8' }} />
                        <span>Financiado</span>
                      </>
                    ) : (
                      <>
                        <Landmark size={13} style={{ color: '#10b981' }} />
                        <span>Quitado</span>
                      </>
                    )
                  ) : isCompletedInvestment ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: '#8b5cf6' }} />
                      <span>{t('status.invested')}</span>
                    </>
                  ) : isOverdueInvestment ? (
                    <>
                      <AlertCircle size={13} style={{ color: '#fcbf49' }} />
                      <span>{t('status.overdue')}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} style={{ color: '#94a3b8' }} />
                      <span>{t('status.planned')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {event.category === 'investimento_patrimonio' ? (
                <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#c084fc' }}>
                  +{formatCurrency(event.amount || event.initialInvestedAmount || 0)}
                </span>
              ) : (
                renderEditableAmount('+', isInertFuture ? '#94a3b8' : 'var(--primary-light)')
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>

          {/* 🎯 Barra de Progresso da Meta de Poupança / Investimento */}
          {Number(event.targetAmount || 0) > 0 && (() => {
            const seriesId = event.eventId || event.seriesId || event.id;
            let baseInitial = Number(event.initialInvestedAmount || 0);
            if (!baseInitial) {
              const sourceEv = (allEvents || []).find((ev) => {
                if (!ev || !Number(ev.initialInvestedAmount || 0)) return false;
                return Boolean(
                  (ev.eventType === EventType.INVESTMENT || ev.eventType === 'investimento' || ev.isInvestment) &&
                  (
                    (ev.eventId && (ev.eventId === seriesId || ev.eventId === event.eventId || ev.eventId === event.seriesId)) ||
                    (ev.seriesId && (ev.seriesId === seriesId || ev.seriesId === event.seriesId || ev.seriesId === event.eventId)) ||
                    (ev.id && (ev.id === seriesId || ev.id === event.eventId || ev.id === event.seriesId)) ||
                    (ev.sobrepositionOver && (ev.sobrepositionOver === seriesId || ev.sobrepositionOver === event.eventId || ev.sobrepositionOver === event.seriesId)) ||
                    (event.title && ev.title && ev.title.trim().toLowerCase() === event.title.trim().toLowerCase())
                  )
                );
              });
              if (sourceEv) {
                baseInitial = Number(sourceEv.initialInvestedAmount || 0);
              }
            }

            const isInvestmentsView = activeFinancialTab === 'investimentos' || timelineType === 'investimentos' || event.timelineOriginId === 'b3c4d5e6-f7a8-4b9c-0d1e-2f3a4b5c6d7e';
            const isFuture = event.date > todayStr;
            const useForecast = isInvestmentsView && isFuture;

            const isMatchingSeriesEvent = (ev) => {
              if (!ev || !ev.date) return false;
              if (ev.status === 'Cancelado' || ev.status === 'cancelled' || ev.status === 'Excluido' || ev.status === 'deleted' || ev.isDeleted) return false;
              const isInv = ev.eventType === EventType.INVESTMENT || ev.eventType === 'investimento' || ev.isInvestment;
              if (!isInv) return false;
              return Boolean(
                (ev.eventId && (ev.eventId === seriesId || ev.eventId === event.eventId || ev.eventId === event.seriesId)) ||
                (ev.seriesId && (ev.seriesId === seriesId || ev.seriesId === event.seriesId || ev.seriesId === event.eventId)) ||
                (ev.id && (ev.id === seriesId || ev.id === event.eventId || ev.id === event.seriesId)) ||
                (ev.sobrepositionOver && (ev.sobrepositionOver === seriesId || ev.sobrepositionOver === event.eventId || ev.sobrepositionOver === event.seriesId)) ||
                (event.title && ev.title && ev.title.trim().toLowerCase() === event.title.trim().toLowerCase())
              );
            };

            let currentSaved = baseInitial;
            if (useForecast) {
              const priorPlannedAportes = (allEvents || [])
                .filter((ev) => isMatchingSeriesEvent(ev) && ev.date < event.date)
                .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);
              const thisMonthAmount = Number(event.amount || 0);
              currentSaved = baseInitial + priorPlannedAportes + thisMonthAmount;
            } else {
              const priorRealizedAportes = (allEvents || [])
                .filter((ev) => {
                  if (!isMatchingSeriesEvent(ev) || ev.date >= event.date) return false;
                  return ev.status === 'Investido' || ev.status === 'invested' || ev.status === 'Pago' || ev.status === 'paid' || ev.isCompleted;
                })
                .reduce((sum, ev) => sum + Number(ev.amount || 0), 0);
              const thisMonthRealized = isCompletedInvestment ? Number(event.amount || 0) : 0;
              currentSaved = baseInitial + priorRealizedAportes + thisMonthRealized;
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
                  marginTop: '6px',
                  paddingTop: '6px',
                  borderTop: '1px solid rgba(139, 92, 246, 0.15)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    color: useForecast ? '#c084fc' : '#a78bfa',
                    marginBottom: '4px'
                  }}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Target size={11} />
                    <span>{labelTitle}</span>
                  </span>
                  <span style={{ color: progressPct >= 100 ? '#10b981' : (useForecast ? '#38bdf8' : '#c084fc'), fontWeight: '800' }}>
                    {labelPercent}
                  </span>
                </div>
                <div
                  style={{
                    width: '100%',
                    height: '5px',
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

      {/* ⚡ Amortização Extraordinária Strip (boc in) */}
      {isAmortization && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                Valor Amortizado
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  Finalidade:
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '700', color: 'var(--primary-light)' }}>
                  {event.strategy === AmortizationEventCategory.REDUCE_INSTALLMENT || event.category === AmortizationEventCategory.REDUCE_INSTALLMENT
                    ? 'Redução da Parcela'
                    : 'Redução do Prazo'}
                </span>
              </div>
              {event.balanceAfter !== undefined && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    Saldo Devedor Após:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: 'var(--text-main)' }}>
                    {formatCurrency(event.balanceAfter)}
                  </span>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              <button
                type="button"
                disabled={isTogglingStatus}
                onClick={handleStatusToggle}
                style={{
                  background: isCancelled
                    ? 'rgba(148, 163, 184, 0.15)'
                    : (isCompleted || isPositiveStatus(event.status) || event.status === EventStatus.AMORTIZED)
                      ? 'rgba(16, 185, 129, 0.16)'
                      : 'rgba(245, 158, 11, 0.16)',
                  color: isCancelled
                    ? '#94a3b8'
                    : (isCompleted || isPositiveStatus(event.status) || event.status === EventStatus.AMORTIZED)
                      ? '#10b981'
                      : '#f59e0b',
                  border: isCancelled
                    ? '1px solid rgba(148, 163, 184, 0.35)'
                    : (isCompleted || isPositiveStatus(event.status) || event.status === EventStatus.AMORTIZED)
                      ? '1px solid rgba(16, 185, 129, 0.4)'
                      : '1px solid rgba(245, 158, 11, 0.4)',
                  borderRadius: '9999px',
                  padding: '4px 12px',
                  fontSize: '0.76rem',
                  fontWeight: '800',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                  opacity: isTogglingStatus ? 0.6 : 1,
                  pointerEvents: isTogglingStatus ? 'none' : 'auto',
                  transition: 'all 0.15s ease'
                }}
                title="Clique para alternar o status"
              >
                {isCancelled ? (
                  <>
                    <Ban size={13} style={{ color: '#94a3b8' }} />
                    <span>{t('status.cancelled')}</span>
                  </>
                ) : (isCompleted || isPositiveStatus(event.status) || event.status === EventStatus.AMORTIZED) ? (
                  <>
                    <CheckCircle2 size={12} />
                    <span>{t('status.amortized') || 'Amortizado'}</span>
                  </>
                ) : (
                  <>
                    <Clock size={12} />
                    <span>{t('status.planned') || 'Previsto'}</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: '800', color: '#10b981' }}>
                +{formatCurrency(event.amount || event.amortizationAmount || 0)}
              </span>
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 🏦 Loan Installment Principal / Interest Breakdown Strip (boc in) */}
      {isLoanInstallment && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2: [motivo & decomposição] (left) e [b status] (right) */}
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap', marginBottom: '0px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', paddingBottom: '0px' }}>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700', lineHeight: 1 }}>
                {isAmortized ? t('loanCard.totalPaid') : t('loanCard.totalInstallment')}
              </span>

              {reducedBreakdown && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: '#10b981', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('loanCard.totalAmortized')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#10b981' }} title="Valor abatido/poupado nesta prestação">
                    +{formatCurrency(reducedBreakdown.amortizedAmount)}
                  </span>
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  {isAmortized ? t('loanCard.capitalAbated') : t('loanCard.capitalDebt')}:
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isAmortized ? 'var(--text-main)' : isInertFuture ? 'var(--text-muted)' : 'var(--text-main)' }}>
                  {isAmortized
                    ? formatCurrency(abatedBreakdown?.origCapital || event.originalInstallmentCapital || 0)
                    : formatCurrency(event.installmentCapital ?? event.principalAmount ?? event.principal_amount ?? 0)}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                <span style={{ fontSize: '0.68rem', color: isAmortized ? '#10b981' : 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                  {isAmortized ? t('loanCard.interestSaved') : t('loanCard.interest')}:
                </span>
                <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isAmortized ? '#10b981' : isInertFuture ? '#94a3b8' : '#f59e0b' }}>
                  {isAmortized
                    ? `+${formatCurrency(abatedBreakdown?.origInterest || event.savedInterest || event.originalInstallmentInterest || 0)}`
                    : formatCurrency(event.installmentInterest ?? event.interestPortion ?? event.interest_portion ?? 0)}
                </span>
              </div>

              {!isAmortized && ((event.installmentFee ?? event.taxAmount ?? event.tax_amount ?? 0) > 0) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('loanCard.stampTax') || 'Taxas'}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: '#a855f7' }}>
                    {formatCurrency(event.installmentFee ?? event.taxAmount ?? event.tax_amount ?? 0)}
                  </span>
                </div>
              )}

              {(event.balanceAfter !== undefined || event.remainingDebtAfter !== undefined || event.remaining_debt_after !== undefined) && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', borderLeft: '1px solid var(--border-glass)', paddingLeft: '10px' }}>
                  <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', textTransform: 'uppercase', fontWeight: '700' }}>
                    {t('loanCard.remainingDebt')}:
                  </span>
                  <span style={{ fontSize: '0.80rem', fontWeight: '800', color: isAmortized || isInertFuture ? '#94a3b8' : 'var(--primary-light)' }}>
                    {formatCurrency(event.balanceAfter !== undefined ? event.balanceAfter : (event.remainingDebtAfter !== undefined ? event.remainingDebtAfter : (event.remaining_debt_after || 0)))}
                  </span>
                </div>
              )}
            </div>

            {/* Inline Loan Payment Fast Toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginLeft: 'auto' }}>
              {isAmortized ? (
                <div
                  style={{
                    background: 'rgba(148, 163, 184, 0.12)',
                    color: '#94a3b8',
                    border: '1px solid rgba(148, 163, 184, 0.3)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '800',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'not-allowed',
                    userSelect: 'none'
                  }}
                  title="Parcela abatida por amortização extraordinária antecipada."
                >
                  <CheckCircle2 size={13} style={{ color: '#94a3b8' }} />
                  <span>{t('status.abatida')}</span>
                </div>
              ) : isInertFuture ? (
                <div
                  style={{
                    background: 'rgba(148, 163, 184, 0.08)',
                    color: 'var(--text-dim)',
                    border: '1px solid rgba(148, 163, 184, 0.2)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    cursor: 'default',
                    userSelect: 'none'
                  }}
                >
                  <Clock size={12} />
                  <span>Pendente</span>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={isTogglingStatus}
                  onClick={handleStatusToggle}
                  className="btn btn-sm"
                  title="Clique para alternar o status"
                  style={{
                    background: isCancelled
                      ? 'rgba(148, 163, 184, 0.15)'
                      : isPaidLoan
                        ? 'rgba(16, 185, 129, 0.16)'
                        : isOverdueLoan
                          ? 'rgba(252, 191, 73, 0.16)'
                          : 'rgba(245, 158, 11, 0.14)',
                    color: isCancelled
                      ? '#94a3b8'
                      : isPaidLoan
                        ? '#10b981'
                        : isOverdueLoan
                          ? '#fcbf49'
                          : '#f59e0b',
                    border: isCancelled
                      ? '1px solid rgba(148, 163, 184, 0.35)'
                      : isPaidLoan
                        ? '1px solid rgba(16, 185, 129, 0.35)'
                        : isOverdueLoan
                          ? '1px solid rgba(252, 191, 73, 0.4)'
                          : '1px solid rgba(245, 158, 11, 0.35)',
                    borderRadius: '9999px',
                    padding: '4px 12px',
                    fontSize: '0.76rem',
                    fontWeight: '700',
                    cursor: isTogglingStatus ? 'not-allowed' : 'pointer',
                    opacity: isTogglingStatus ? 0.6 : 1,
                    pointerEvents: isTogglingStatus ? 'none' : 'auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease',
                    boxShadow: isPaidLoan
                      ? '0 2px 8px rgba(16, 185, 129, 0.2)'
                      : 'none'
                  }}
                >
                  {isCancelled ? (
                    <>
                      <Ban size={13} style={{ color: '#94a3b8' }} />
                      <span>{t('status.cancelled')}</span>
                    </>
                  ) : isPaidLoan ? (
                    <>
                      <CheckCircle2 size={13} style={{ color: '#10b981' }} />
                      <span>{t('status.settled')}</span>
                    </>
                  ) : isOverdueLoan ? (
                    <>
                      <AlertCircle size={13} style={{ color: '#fcbf49' }} />
                      <span>{t('status.overdue')}</span>
                    </>
                  ) : (
                    <>
                      <Clock size={13} style={{ color: '#f59e0b' }} />
                      <span>{t('status.pending')}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Linha 3: [Valor] (left) e [event action buttons] (right) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {isAmortized ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textDecoration: 'line-through' }}>
                    {formatCurrency(abatedBreakdown?.origTotal || event.originalInstallmentAmount || event.originalAmount || 0)}
                  </span>
                  <span style={{ fontSize: '0.94rem', fontWeight: '800', color: '#10b981' }}>
                    {formatCurrency(abatedBreakdown?.origCapital || event.originalInstallmentCapital || 0)}
                  </span>
                </div>
              ) : reducedBreakdown ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-dim)', textDecoration: 'line-through' }} title="Valor original antes da amortização extraordinária">
                    {formatCurrency(reducedBreakdown.origTotal)}
                  </span>
                  <span style={{ fontSize: '0.95rem', fontWeight: '800', color: isInertFuture ? '#94a3b8' : 'var(--primary-light)' }} title="Novo valor reduzido da parcela">
                    {formatCurrency(reducedBreakdown.currentTotal)}
                  </span>
                </div>
              ) : (
                renderEditableAmount('', isInertFuture ? '#94a3b8' : 'var(--primary-light)')
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
          </div>
        </div>
      )}

      {/* 📋 Default / Generic Event Strip (boc in) */}
      {!isIncomeEvent && !isExpenseEvent && !isInvestmentEvent && !isAmortization && !isLoanInstallment && (
        <div
          className="loan-breakdown-strip"
          style={{
            background: 'transparent',
            border: '1px solid var(--border-glass)',
            borderRadius: '8px',
            padding: '8px 10px',
            margin: '0',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px'
          }}
        >
          {/* Linha 1: [icone] [titulo do evento] [lables] */}
          {renderCardInnerHeader()}

          {/* Linha 2 & 3: [Valor] & [event action buttons] */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            flexWrap: 'wrap',
            marginTop: '-1px',
            paddingTop: '6px',
            borderTop: '1px solid var(--border-glass, rgba(255, 255, 255, 0.08))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {event.amount !== undefined && Number(event.amount) > 0 ? (
                renderEditableAmount('', 'var(--text-main)')
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{event.description || ''}</span>
              )}
            </div>
            <div style={{ marginLeft: 'auto' }}>
              {renderActionButtons()}
            </div>
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
              marginTop: '8px',
              padding: '12px 14px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
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
              marginTop: '8px',
              padding: '14px',
              background: 'rgba(255, 255, 255, 0.03)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid var(--border-glass)',
              borderRadius: '10px',
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
                        placeholder="0.00"
                        disabled={!canEditAmount}
                        className="inline-amount-input"
                        value={item.amount !== undefined ? item.amount : ''}
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
    </div>
  );
});

function hexToRgba(hex, alpha = 1) {
  if (!hex) return `rgba(79, 70, 229, ${alpha})`;
  if (hex.startsWith('rgba')) {
    return hex;
  }
  if (hex.startsWith('rgb')) {
    return hex.replace(')', `, ${alpha})`).replace('rgb', 'rgba');
  }
  let c = hex.replace('#', '');
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  if (c.length === 6) {
    const num = parseInt(c, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hex;
}

export const TimelineEventCard = React.memo(function TimelineEventCard({
  events,
  event,
  timelineColor,
  allEvents = [],
  currentTimelineId,
  timelineType,
  activeFinancialTab = null,
  onEdit,
  onUpdateEventDirect,
  onDelete,
  onToggleTask,
  onAddChecklistItem,
  onDeleteChecklistItem,
  onToggleLoanPayment,
  onPayUpToHere,
  onOpenEditInstallment,
  onNavigateToTimeline
}) {
  const eventList = React.useMemo(() => {
    const list = Array.isArray(events) ? [...events] : (event ? [event] : []);
    return list.sort(compareEventsWithinDay);
  }, [events, event]);
  const { language } = useTranslation();
  const dateLocale = language === 'pt' ? pt : enUS;

  if (eventList.length === 0) return null;

  const firstEvent = eventList[0];
  const eventDateObj = firstEvent.date ? parseISO(firstEvent.date) : (firstEvent.dueDate ? parseISO(firstEvent.dueDate) : null);
  const formattedDateStr = eventDateObj
    ? format(eventDateObj, language === 'pt' ? "EEEE, dd 'de' MMMM" : "EEEE, MMMM dd", { locale: dateLocale })
    : '';

  const isBalance = timelineType === TimelineType.BALANCE || timelineType === 'balance' || timelineType === 'balanco';

  const baseColor = isBalance
    ? '#94a3b8'
    : (timelineColor || firstEvent.timelineColor || '#4f46e5');

  const bgGradient = isBalance
    ? 'linear-gradient(135deg, rgba(148, 163, 184, 0.05) 0%, var(--bg-card) 100%)'
    : `linear-gradient(135deg, ${hexToRgba(baseColor, 0.08)} 0%, var(--bg-card) 100%)`;

  const borderColor = isBalance
    ? 'rgba(148, 163, 184, 0.22)'
    : hexToRgba(baseColor, 0.35);

  const borderLeftColor = isBalance
    ? 'rgba(148, 163, 184, 0.45)'
    : hexToRgba(baseColor, 0.35);

  return (
    <div
      className="event-card"
      style={{
        background: bgGradient,
        border: `1px solid ${borderColor}`,
        borderLeft: `4px solid ${borderLeftColor}`,
        borderTopColor: borderColor,
        borderRightColor: borderColor,
        borderBottomColor: borderColor,
        padding: '8px 10px 8px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
      }}
    >
      {/* Top Header (box ex) */}
      {formattedDateStr && (
        <div
          className="event-card-header"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            width: '100%',
            marginBottom: '2px',
            padding: '2px 4px 2px 4px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: baseColor, fontSize: '0.80rem', fontWeight: '700', textTransform: 'capitalize' }}>
            <Calendar size={13} style={{ flexShrink: 0, opacity: 0.9 }} />
            <span style={{ letterSpacing: '0.01em' }}>
              {formattedDateStr}
            </span>
          </div>
          {eventList.length > 1 && (
            <span
              style={{
                fontSize: '0.66rem',
                fontWeight: '700',
                color: 'var(--text-dim)',
                background: 'rgba(255, 255, 255, 0.05)',
                padding: '1px 6px',
                borderRadius: '4px',
                border: '1px solid var(--border-glass)'
              }}
            >
              {eventList.length} {language === 'pt' ? 'eventos' : 'events'}
            </span>
          )}
        </div>
      )}

      {/* Stacked inner boxes (boc in) for each event on this date */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', width: '100%' }}>
        {eventList.map((ev, idx) => (
          <TimelineEventInnerItem
            key={`${ev.id || ev.eventId || 'ev'}_${ev.date}_${idx}`}
            event={ev}
            allEvents={allEvents}
            currentTimelineId={currentTimelineId}
            timelineType={timelineType}
            activeFinancialTab={activeFinancialTab}
            onEdit={onEdit}
            onUpdateEventDirect={onUpdateEventDirect}
            onDelete={onDelete}
            onToggleTask={onToggleTask}
            onAddChecklistItem={onAddChecklistItem}
            onDeleteChecklistItem={onDeleteChecklistItem}
            onToggleLoanPayment={onToggleLoanPayment}
            onPayUpToHere={onPayUpToHere}
            onOpenEditInstallment={onOpenEditInstallment}
            onNavigateToTimeline={onNavigateToTimeline}
          />
        ))}
      </div>
    </div>
  );
});

export default TimelineEventCard;
