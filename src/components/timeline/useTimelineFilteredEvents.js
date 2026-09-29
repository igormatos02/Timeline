import { useMemo } from 'react';
import { AmortizationEventCategory, AmortizationStrategy, EventStatus, EventType, ExpensesEventCategory, IncomeEventCategory, LoanEventCategory, MovementKind, TimelineType, getAccountMovementType, getOutflowType, isCancelledStatus, isPositiveStatus, isWalletTimelineType, normalizeTimelineType, BalanceViewMode, isKindInBalanceViewMode } from '../../enums/index.js';
import { classifyMovement } from '../../../shared/finance/movements.js';
import { format } from 'date-fns';
import { CONDO_EXPENSE_CATEGORY_IDS } from './timelineFilterItems.js';
import { GENERAL_SPACE_KEY, isMovementInSpace } from '../../../shared/finance/savingsSpaces.js';

// Extracted from VerticalTimeline.jsx (VerticalTimeline).
export function useTimelineFilteredEvents({
  activeFinancialTab,
  balanceMode = BalanceViewMode.ALL,
  computeFromMonth,
  isCondoflow,
  isEventMatchingEntity,
  isFinancialTimeline,
  isListView,
  isPeriodActive,
  matchesReceiptNumber,
  maxDateObj,
  periodMonthIndex,
  periodRange,
  searchQuery,
  selectedCategoryFilter,
  selectedEntityId,
  selectedExpenseCategories,
  selectedLabelFilter,
  selectedMovementTypes,
  selectedOutflowTypes,
  selectedStatusFilters,
  selectedTimelineIds,
  showSharedPosts,
  showSharedReminders,
  startDateObj,
  timeline,
  timelineEvents,
  todayDate,
  todayStr
}) {
  // Until the database migration moves them, wallet expenses are stored in the expense timeline: the wallet
  // lists them as its own (not the references the expense timeline mirrors from the account and loans)
  const walletExpenseTimelineIds = useMemo(() => {
    if (!isWalletTimelineType(timeline.type)) return new Set();
    return new Set((timeline.timelines || [])
      .filter((tl) => normalizeTimelineType(tl?.type) === TimelineType.EXPENSE)
      .map((tl) => String(tl.id)));
  }, [timeline.type, timeline.timelines]);

  // Timeline types by id, for the movement classification of the balance modes
  const balanceTimelineTypeMap = useMemo(
    () => new Map((timeline.timelines || []).map((tl) => [String(tl.id), tl.type])),
    [timeline.timelines]
  );

  const filteredEvents = useMemo(() => {
    if (!timelineEvents) return [];
    return timelineEvents.filter((ev) => {
      if (ev.isSharedNotice) {
        if (ev.timelineType === TimelineType.REMINDER && !showSharedReminders) return false;
        if (ev.timelineType === TimelineType.DIARY && !showSharedPosts) return false;
      }
      const matchesSearch =
        searchQuery === '' ||
        ((ev.title || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        ((ev.description || '').toLowerCase().includes(searchQuery.toLowerCase())) ||
        (ev.labels && ev.labels.some((l) => (l || '').toLowerCase().includes(searchQuery.toLowerCase()))) ||
        matchesReceiptNumber(ev, searchQuery);

      // Na visualização de lista por status ou por categoria, mostrar apenas eventos até ao final do mês atual e meses anteriores
      if (periodRange && (!ev.date || ev.date < periodRange.startStr || ev.date > periodRange.endStr)) {
        return false;
      }
      if (!periodRange && periodMonthIndex !== null
        && (!ev.date || Number(ev.date.substring(5, 7)) - 1 !== periodMonthIndex || Number(ev.date.substring(0, 4)) > todayDate.getFullYear())) {
        return false;
      }
      if (isListView && !isPeriodActive) {
        const currentMonthKey = format(todayDate, 'yyyy-MM');
        if (ev.date && ev.date.substring(0, 7) > currentMonthKey) {
          return false;
        }
      }

      let matchesStatus = selectedStatusFilters.length === 0;
      if (!matchesStatus) {

        const isCompleted = isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
        const isCancelled = isCancelledStatus(ev.status);
        const isOverdue = Boolean(
          ev.status === EventStatus.OVERDUE ||
          (ev.date && ev.date < todayStr && !isCompleted && !isCancelled && ev.status !== EventStatus.DELETED)
        );
        const isPending = !isCompleted && !isCancelled && !isOverdue && ev.status !== EventStatus.DELETED;

        matchesStatus = selectedStatusFilters.some((statusFilter) => {
          if (
            statusFilter === EventStatus.RECEIVED ||
            statusFilter === EventStatus.PAID ||
            statusFilter === EventStatus.COMPLETED ||
            statusFilter === EventStatus.INVESTED ||
            statusFilter === EventStatus.WITHDRAWN ||
            statusFilter === EventStatus.SETTLED ||
            statusFilter === EventStatus.FINISHED ||
            statusFilter === EventStatus.CLOSED
          ) {
            return isCompleted;
          }
          if (statusFilter === EventStatus.OVERDUE) {
            return isOverdue;
          }
          if (statusFilter === EventStatus.PENDING) {
            return isPending || isOverdue;
          }
          if (statusFilter === EventStatus.PLANNED) {
            return isPending;
          }
          return ev.status === statusFilter;
        });
      }

      let matchesCategory = true;
      if (timeline.type === TimelineType.EXPENSE) {
        if (selectedExpenseCategories.length > 0) {
          const evCat = (ev.category || '').toLowerCase();
          matchesCategory = selectedExpenseCategories.some((cat) => {
            const targetCat = cat.toLowerCase();
            if (evCat === targetCat) return true;
            if (targetCat === ExpensesEventCategory.OTHER) {
              const allKnown = (isCondoflow ? CONDO_EXPENSE_CATEGORY_IDS : Object.values(ExpensesEventCategory)).map((v) => v.toLowerCase());
              return !allKnown.includes(evCat);
            }
            return false;
          });
        }
      } else if (selectedCategoryFilter !== EventStatus.ALL && selectedCategoryFilter !== 'all' && selectedCategoryFilter !== 'Todos') {
        if (timeline.type === TimelineType.INVESTMENT) {
          matchesCategory = isMovementInSpace(ev, selectedCategoryFilter === GENERAL_SPACE_KEY ? null : selectedCategoryFilter);
        } else if (isWalletTimelineType(timeline.type)) {
          const evCat = (ev.category || '').toLowerCase();
          if (selectedCategoryFilter === IncomeEventCategory.OTHER) {
            const allKnown = Object.values(IncomeEventCategory).map((v) => v.toLowerCase());
            matchesCategory = evCat === IncomeEventCategory.OTHER || !allKnown.includes(evCat);
          } else {
            matchesCategory = evCat === selectedCategoryFilter ||
              (selectedCategoryFilter === IncomeEventCategory.SALARY && evCat === 'salario') ||
              (selectedCategoryFilter === IncomeEventCategory.MEAL_ALLOWANCE && evCat === 'subsidio_alimentacao') ||
              (selectedCategoryFilter === IncomeEventCategory.FREELANCE && evCat === 'freelancer') ||
              (selectedCategoryFilter === IncomeEventCategory.INVESTMENT_RETURN && (evCat === 'rendimentos' || evCat === 'dividendos')) ||
              (selectedCategoryFilter === IncomeEventCategory.RECURRING_INCOME && (evCat === 'renda_recorrente' || evCat === 'recurring'));
          }
        } else if (selectedCategoryFilter === EventType.LOAN_INSTALLMENT || selectedCategoryFilter === 'parcela_emprestimo' || selectedCategoryFilter === 'loan_installment' || selectedCategoryFilter === LoanEventCategory.LOAN_INSTALLMENT) {
          matchesCategory = ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'parcela_emprestimo' || ev.category === 'loan_installment' || ev.category === LoanEventCategory.LOAN_INSTALLMENT || (ev.isSystemLoanEvent && ev.eventType !== EventType.AMORTIZATION && ev.category !== 'amortizacao');
        } else if (selectedCategoryFilter === EventType.AMORTIZATION || selectedCategoryFilter === 'amortizacao' || selectedCategoryFilter === 'amortization' || selectedCategoryFilter === LoanEventCategory.AMORTIZATION) {
          matchesCategory = ev.eventType === EventType.AMORTIZATION || ev.category === 'amortizacao' || ev.category === 'amortization' || ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT || ev.category === AmortizationStrategy.REDUCE_TERM || ev.category === AmortizationStrategy.REDUCE_INSTALLMENT;
        } else {
          matchesCategory = ev.category === selectedCategoryFilter || ev.eventType === selectedCategoryFilter;
        }
      }
      if (timeline.type === TimelineType.INVESTMENT && selectedMovementTypes.length > 0 && !selectedMovementTypes.includes(getAccountMovementType(ev))) {
        matchesCategory = false;
      }
      if (timeline.type === TimelineType.EXPENSE && selectedOutflowTypes.length > 0
        && !selectedOutflowTypes.includes(getOutflowType(ev.isReference ? ev.referenceKind : MovementKind.EXPENSE))) {
        matchesCategory = false;
      }

      const matchesTimelineMultiSelect =
        timeline.type !== TimelineType.BALANCE ||
        selectedTimelineIds.length === 0 ||
        selectedTimelineIds.includes(ev.timelineId) ||
        selectedTimelineIds.includes(ev.timelineOriginId) ||
        selectedTimelineIds.includes(ev.timeline_id) ||
        selectedTimelineIds.includes(ev.timeline_origin_id);

      const matchesLabel =
        selectedLabelFilter === EventStatus.ALL ||
        selectedLabelFilter === 'Todos' ||
        selectedLabelFilter === 'all' ||
        (ev.labels && ev.labels.includes(selectedLabelFilter));

      if (!matchesStatus || !matchesCategory || !matchesTimelineMultiSelect || !matchesLabel) {
        return false;
      }

      if (selectedEntityId && !isEventMatchingEntity(ev, selectedEntityId)) {
        return false;
      }

      // Timeline ownership filter
      if (timeline.type === TimelineType.BALANCE) {
        const isNonFinancial =
          ev.eventType === EventType.TODO ||
          ev.timelineType === TimelineType.TODO ||
          ev.timeline_type === TimelineType.TODO ||
          ev.category === EventType.TODO ||
          ev.category === 'tarefa' ||
          ev.category === 'todo' ||
          ev.eventType === EventType.FOLLOWUP ||
          ev.timelineType === TimelineType.FOLLOWUP ||
          ev.timeline_type === TimelineType.FOLLOWUP ||
          ev.category === 'followup' ||
          ev.eventType === EventType.REGISTER ||
          ev.timelineType === TimelineType.DIARY ||
          ev.timeline_type === TimelineType.DIARY;
        if (isNonFinancial) return false;
        // Outflow references mirror movements already listed in the balance under their owner timeline
        if (ev.isReference) return false;
        // Income / outflow modes: only the movements of that kind (transfers only in "all")
        if (balanceMode !== BalanceViewMode.ALL && !isKindInBalanceViewMode(classifyMovement(ev, balanceTimelineTypeMap).kind, balanceMode)) {
          return false;
        }
      } else {
        const isThisTimeline = ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id || ev.timeline_id === timeline.id;
        const isStoredWalletExpense = !ev.isReference && walletExpenseTimelineIds.has(String(ev.timelineId || ev.timeline_id || ''));
        if (!isThisTimeline && !isStoredWalletExpense) return false;
      }

      // Respeitar os limites do horizonte de tempo. Eventos anteriores ao início de cálculo continuam visíveis
      // (a partir do mês em que começam); esses meses aparecem esbatidos e não entram nos totais.
      if (isFinancialTimeline && ev.date) {
        const maxEndStr = format(maxDateObj, 'yyyy-MM-dd');
        const minStartStr = format(startDateObj, 'yyyy-MM-dd');
        if (ev.date > maxEndStr || ev.date < minStartStr) {
          return false;
        }
      }

      return matchesSearch && matchesStatus && matchesCategory && matchesLabel;
    }).sort((a, b) => {
      const dateA = a.date || '';
      const dateB = b.date || '';
      if (dateA !== dateB) return dateB.localeCompare(dateA);
      const timeA = a.time || '00:00';
      const timeB = b.time || '00:00';
      if (timeA !== timeB) return timeB.localeCompare(timeA);
      const titleCmp = (b.title || '').localeCompare(a.title || '');
      if (titleCmp !== 0) return titleCmp;
      return String(b.id || '').localeCompare(String(a.id || ''));
    });
  }, [
    timelineEvents,
    searchQuery,
    selectedStatusFilters,
    selectedCategoryFilter,
    selectedExpenseCategories,
    selectedEntityId,
    selectedLabelFilter,
    selectedTimelineIds,
    timeline.type,
    timeline.id,
    isFinancialTimeline,
    activeFinancialTab,
    computeFromMonth,
    showSharedReminders,
    showSharedPosts,
    periodRange,
    periodMonthIndex,
    isPeriodActive,
    isCondoflow,
    selectedMovementTypes,
    selectedOutflowTypes,
    walletExpenseTimelineIds,
    balanceMode,
    balanceTimelineTypeMap,
  ]);

  return {
    filteredEvents
  };
}
