import { TimelineAssociationType, EventType, EventStatus, EventPeriodicity, EventPriority, AmortizationStrategy } from '../../../shared/enums/index.js';

/**
 * Entity: TimelineEvent
 * Represents a discrete or projected financial event (income, expense, investment, or amortization).
 */
export class TimelineEvent {
  constructor({
    id,
    tenantId = 'tenant-igor',
    timeboardId = '5fcd8a1a-eac7-4405-9c8b-b9607e70b420',
    timelineId = null,
    timelineOriginId = null,
    timelineOriginName = 'Financeiro',
    timelineOriginIcon = '💰',
    eventId = null,
    sobrepositionOver = null,
    version = 0,
    isTerminated = false,
    dayOfMonth = null,
    date,
    time = '09:00',
    name,
    title,
    description = '',
    category = 'saida_recorrente',
    eventType = EventType.EXPENSE,
    event_type,
    financialType,
    financial_type,
    periodicity = EventPeriodicity.RECURRING,
    recurrenceEndDate = null,
    endDate = null,
    dueDate = null,
    due_date,
    paidDate = null,
    paid_date,
    status = EventStatus.PENDING,
    priority = EventPriority.NORMAL,
    amount = 0,
    amortizationAmount = 0,
    initialInvestedAmount = 0,
    targetAmount = 0,
    strategy = AmortizationStrategy.REDUCE_TERM,
    amortizationStrategy,
    amortization_strategy,
    notes = '',
    isIncome = false,
    isExpense = false,
    isInvestment = false,
    isAmortization = false,
    isRecurring = false,
    is_recurring,
    automatic = false,
    isAutomatic = false,
    isCompleted = false,
    isLocked = false,
    isSystemLoanEvent = false,
    principalAmount = 0,
    principal_amount,
    interestPortion = 0,
    interestAmount = 0,
    interest_amount,
    balanceAfter = 0,
    remainingDebtAfter = 0,
    remaining_debt_after,
    installmentNumber = null,
    installment_number,
    totalInstallments = null,
    total_installments,
    labels = [],
    breakdownItems = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    created_at,
    updated_at
  }) {
    this.id = id;
    this.tenantId = tenantId || 'tenant-igor';
    this.timeboardId = timeboardId;

    const effectiveTimelineId = timelineId !== undefined ? timelineId : timelineOriginId;
    this.timelineId = effectiveTimelineId || null;
    this.timelineOriginId = this.timelineId;

    this.timelineAssociationType = this.timelineId
      ? TimelineAssociationType.RECORD
      : TimelineAssociationType.DYNAMIC;

    this.timelineOriginName = timelineOriginName;
    this.timelineOriginIcon = timelineOriginIcon;
    this.eventId = eventId;

    this.sobrepositionOver = sobrepositionOver;
    this.version = Number(version) || 0;
    this.isTerminated = Boolean(isTerminated);
    this.dayOfMonth = dayOfMonth;
    this.date = date;
    this.time = time;
    this.name = name || title || 'Evento Financeiro';
    this.title = this.name;
    this.description = description || '';
    this.category = category;
    this.eventType = event_type || eventType || financial_type || financialType;
    this.periodicity = periodicity;
    this.recurrenceEndDate = recurrenceEndDate || endDate || null;
    this.endDate = this.recurrenceEndDate;
    this.dueDate = due_date || dueDate || null;
    this.paidDate = paid_date || paidDate || null;
    this.status = status;
    this.priority = priority;
    this.amount = Number(amount) || 0;
    this.amortizationAmount = Number(amortizationAmount) || Number(amount) || 0;
    this.initialInvestedAmount = Number(initialInvestedAmount) || 0;
    this.targetAmount = Number(targetAmount) || 0;
    this.strategy = amortization_strategy || amortizationStrategy || strategy;
    this.amortizationStrategy = this.strategy;
    this.notes = notes;
    this.isIncome = this.eventType === EventType.INCOME;
    this.isExpense = this.eventType === EventType.EXPENSE;
    this.isInvestment = this.eventType === EventType.INVESTMENT;
    this.isAmortization = this.eventType === EventType.AMORTIZATION;
    this.isRecurring = Boolean(is_recurring !== undefined ? is_recurring : isRecurring);
    this.automatic = Boolean(automatic || isAutomatic);
    this.isAutomatic = this.automatic;
    this.isCompleted = Boolean(isCompleted);
    this.isLocked = Boolean(isLocked);
    this.isSystemLoanEvent = Boolean(isSystemLoanEvent);
    this.principalAmount = Number(principal_amount !== undefined ? principal_amount : principalAmount) || 0;
    this.interestAmount = Number(interest_amount !== undefined ? interest_amount : (interestAmount || interestPortion)) || 0;
    this.interestPortion = this.interestAmount;
    this.balanceAfter = Number(remaining_debt_after !== undefined ? remaining_debt_after : (remainingDebtAfter || balanceAfter)) || 0;
    this.remainingDebtAfter = this.balanceAfter;
    this.installmentNumber = installment_number !== undefined ? installment_number : installmentNumber;
    this.totalInstallments = total_installments !== undefined ? total_installments : totalInstallments;
    this.labels = Array.isArray(labels) ? labels : [];
    this.breakdownItems = Array.isArray(breakdownItems) ? breakdownItems : [];
    this.createdAt = created_at || createdAt;
    this.updatedAt = updated_at || updatedAt;
  }

  isDynamicTimeline() {
    return this.timelineAssociationType === TimelineAssociationType.DYNAMIC;
  }

  isRecordTimeline() {
    return this.timelineAssociationType === TimelineAssociationType.RECORD;
  }

  isLoanEvent() {
    return (
      this.eventType === EventType.LOAN_INSTALLMENT ||
      this.isSystemLoanEvent ||
      Boolean(this.timelineId && String(this.timelineId).startsWith('tl-loan-'))
    );
  }

  isAmortizationEvent() {
    return this.eventType === EventType.AMORTIZATION;
  }

  getToggledStatus() {
    return calcToggledStatus(this);
  }

  static validate(data) {
    if (!data.date || typeof data.date !== 'string') {
      throw new Error('Valid event date (YYYY-MM-DD) is required');
    }
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new Error('Event title is required');
    }
    return true;
  }
}

export function calcToggledStatus(event) {
  const isAmortization = event.eventType === EventType.AMORTIZATION || (typeof event.isAmortizationEvent === 'function' && event.isAmortizationEvent());
  if (isAmortization) {
    const isCurrentlyAmortized =
      event.status === EventStatus.AMORTIZED || event.status === EventStatus.COMPLETED || Boolean(event.isCompleted);
    return {
      status: isCurrentlyAmortized ? EventStatus.PENDING : EventStatus.AMORTIZED,
      isCompleted: !isCurrentlyAmortized
    };
  }

  const isInvestment = event.eventType === EventType.INVESTMENT;
  const isIncome = event.eventType === EventType.INCOME;

  const isCompletedNow =
    event.status === EventStatus.PAID ||
    event.status === EventStatus.RECEIVED ||
    event.status === EventStatus.INVESTED ||
    event.status === EventStatus.COMPLETED ||
    Boolean(event.isCompleted);

  const willBeCompleted = !isCompletedNow;

  const newStatus = willBeCompleted
    ? (isIncome ? EventStatus.RECEIVED : (isInvestment ? EventStatus.INVESTED : EventStatus.PAID))
    : (isInvestment ? EventStatus.PLANNED : EventStatus.PENDING);

  return {
    status: newStatus,
    isCompleted: willBeCompleted
  };
}
