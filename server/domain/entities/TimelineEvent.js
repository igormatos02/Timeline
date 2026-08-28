import { TimelineAssociationType, FinancialType, EventStatus, EventPeriodicity, EventPriority, AmortizationStrategy } from '../enums/index.js';

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
    seriesId = null,
    sobrepositionOver = null,
    version = 0,
    isTerminated = false,
    dayOfMonth = null,
    date,
    time = '09:00',
    title,
    description = '',
    category = 'saida_recorrente',
    financialType = FinancialType.EXPENSE,
    periodicity = EventPeriodicity.RECURRING,
    recurrenceEndDate = null,
    endDate = null,
    status = EventStatus.PENDING,
    priority = EventPriority.NORMAL,
    amount = 0,
    amortizationAmount = 0,
    initialInvestedAmount = 0,
    targetAmount = 0,
    strategy = AmortizationStrategy.REDUCE_TERM,
    notes = '',
    isIncome = false,
    isExpense = false,
    isInvestment = false,
    isAmortization = false,
    isRecurring = false,
    isCompleted = false,
    isLocked = false,
    isSystemLoanEvent = false,
    principalAmount = 0,
    interestPortion = 0,
    interestAmount = 0,
    balanceAfter = 0,
    installmentNumber = null,
    totalInstallments = null,
    labels = [],
    breakdownItems = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
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
    this.seriesId = seriesId;
    this.sobrepositionOver = sobrepositionOver;
    this.version = Number(version) || 0;
    this.isTerminated = Boolean(isTerminated);
    this.dayOfMonth = dayOfMonth;
    this.date = date;
    this.time = time;
    this.title = title;
    this.description = description;
    this.category = category;
    this.financialType = financialType;
    this.periodicity = periodicity;
    this.recurrenceEndDate = recurrenceEndDate || endDate || null;
    this.endDate = this.recurrenceEndDate;
    this.status = status;
    this.priority = priority;
    this.amount = Number(amount) || 0;
    this.amortizationAmount = Number(amortizationAmount) || Number(amount) || 0;
    this.initialInvestedAmount = Number(initialInvestedAmount) || 0;
    this.targetAmount = Number(targetAmount) || 0;
    this.strategy = strategy;
    this.notes = notes;
    this.isIncome = Boolean(isIncome || financialType === FinancialType.INCOME);
    this.isExpense = Boolean(isExpense || financialType === FinancialType.EXPENSE);
    this.isInvestment = Boolean(isInvestment || financialType === FinancialType.INVESTMENT);
    this.isAmortization = Boolean(isAmortization || category === 'amortizacao' || financialType === FinancialType.AMORTIZATION);
    this.isRecurring = Boolean(isRecurring);
    this.isCompleted = Boolean(isCompleted);
    this.isLocked = Boolean(isLocked);
    this.isSystemLoanEvent = Boolean(isSystemLoanEvent);
    this.principalAmount = Number(principalAmount) || 0;
    this.interestPortion = Number(interestPortion) || 0;
    this.interestAmount = Number(interestAmount) || 0;
    this.balanceAfter = Number(balanceAfter) || 0;
    this.installmentNumber = installmentNumber;
    this.totalInstallments = totalInstallments;
    this.labels = Array.isArray(labels) ? labels : [];
    this.breakdownItems = Array.isArray(breakdownItems) ? breakdownItems : [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isDynamicTimeline() {
    return this.timelineAssociationType === TimelineAssociationType.DYNAMIC;
  }

  isRecordTimeline() {
    return this.timelineAssociationType === TimelineAssociationType.RECORD;
  }

  isLoanEvent() {
    return (
      this.category === 'parcela_emprestimo' ||
      this.isSystemLoanEvent ||
      Boolean(this.timelineId && String(this.timelineId).startsWith('tl-loan-'))
    );
  }

  isAmortizationEvent() {
    return (
      this.category === 'amortizacao' ||
      this.financialType === FinancialType.AMORTIZATION ||
      this.isAmortization
    );
  }

  getToggledStatus() {
    if (this.isAmortizationEvent()) {
      const isCurrentlyAmortized =
        this.status === EventStatus.AMORTIZED || this.status === EventStatus.COMPLETED || Boolean(this.isCompleted);
      return {
        status: isCurrentlyAmortized ? EventStatus.PENDING : EventStatus.AMORTIZED,
        isCompleted: !isCurrentlyAmortized
      };
    }

    const isInvestment = this.isInvestment || this.financialType === FinancialType.INVESTMENT || this.category?.startsWith('investimento');
    const isIncome = this.isIncome || this.financialType === FinancialType.INCOME || this.category?.startsWith('entrada');

    const willBeCompleted = !(
      this.status === EventStatus.PAID ||
      this.status === EventStatus.RECEIVED ||
      this.status === EventStatus.INVESTED ||
      this.isCompleted
    );

    const newStatus = willBeCompleted
      ? isIncome
        ? EventStatus.RECEIVED
        : isInvestment
        ? EventStatus.INVESTED
        : EventStatus.PAID
      : isInvestment
      ? EventStatus.PLANNED
      : EventStatus.PENDING;

    return {
      status: newStatus,
      isCompleted: willBeCompleted
    };
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
