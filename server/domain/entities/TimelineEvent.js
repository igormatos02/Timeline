import { TimelineAssociationType, EventType, EventStatus, EventPriority, AmortizationStrategy, EventAggregation, LoanEventCategory, isPositiveStatus } from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Entity: TimelineEvent
 * Represents a discrete or projected financial event (income, expense, investment, or amortization).
 */
export class TimelineEvent {
  constructor({
    id,
    tenantId = null,
    timeboardId = null,
    timelineId = null,
    timelineOriginId = null,
    timelineOriginName = '',
    timelineOriginIcon = '💰',
    eventId = null,
    sobrepositionOver = null,
    version = 0,
    event_version,
    isTerminated = false,
    is_terminated,
    dayOfMonth = null,
    day_of_month,
    date,
    time = '',
    name,
    title,
    description = '',
    category = LoanEventCategory.LOAN_INSTALLMENT,
    eventType = EventType.EXPENSE,
    event_type,
    financialType,
    financial_type,
    recurrenceEndDate = null,
    endDate = null,
    dueDate = null,
    due_date,
    paidDate = null,
    paid_date,
    status = EventStatus.PENDING,
    priority = EventPriority.NORMAL,
    installmentAmount = 0,
    installment_amount,
    installmentCapital,
    installment_capital,
    installmentInterest,
    installment_interest,
    installmentFee,
    installment_fee,
    aggregation = EventAggregation.MONTHLY,
    amount = 0,
    principalAmount,
    principal_amount,
    interestPortion,
    interestAmount,
    interest_amount,
    taxAmount,
    tax_amount,
    balanceAfter = 0,
    remainingDebtAfter = 0,
    remaining_debt_after,
    installmentNumber = null,
    installment_number,
    totalInstallments = null,
    total_installments,
    labels = [],
    breakdownItems = [],
    breakdown_items,
    amortizationAmount,
    initialInvestedAmount,
    targetAmount,
    strategy,
    amortizationStrategy,
    amortization_strategy,
    notes,
    isCompleted,
    isLocked,
    isSystemLoanEvent,
    is_system_loan_event,
    isRecurring,
    is_recurring,
    isExternal = false,
    is_external,
    automatic,
    isAutomatic,
    isObligation = false,
    is_obligation,
    obligationPersonId = null,
    obligation_person_id,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    created_at,
    updated_at
  }) {
    this.id = id;
    this.tenantId = tenantId || null;
    this.timeboardId = timeboardId;

    const effectiveTimelineId = timelineId !== undefined ? timelineId : timelineOriginId;
    this.timelineId = effectiveTimelineId || null;
    this.timelineOriginId = this.timelineId;

    this.timelineAssociationType = this.timelineId
      ? TimelineAssociationType.RECORD
      : TimelineAssociationType.DYNAMIC;

    this.timelineOriginName = timelineOriginName;
    this.timelineOriginIcon = timelineOriginIcon;
    this.eventId = eventId || id;
    this.eventVersion = Number(version !== undefined ? version : (event_version !== undefined ? event_version : 0));
    this.version = this.eventVersion;

    this.sobrepositionOver = sobrepositionOver;
    this.isTerminated = Boolean(isTerminated || is_terminated);
    this.dayOfMonth = dayOfMonth !== undefined ? dayOfMonth : (day_of_month !== undefined ? day_of_month : null);
    this.date = date;
    this.time = time;
    this.name = title || name || t('backend.event.defaultName');
    this.title = this.name;
    this.description = description || '';
    this.category = category;
    this.eventType = event_type || eventType || financial_type || financialType;

    this.aggregation = aggregation || EventAggregation.MONTHLY;

    this.recurrenceEndDate = recurrenceEndDate || endDate || null;
    this.endDate = this.recurrenceEndDate;
    this.dueDate = due_date || dueDate || null;
    this.paidDate = paid_date || paidDate || null;
    this.status = status;
    this.priority = priority;

    // Amount mapping: installmentAmount is the total installment payment.
    // Use != null (loose equality) to treat both null and undefined as "not set".
    const instAmtVal =
      installment_amount != null ? Number(installment_amount) :
      installmentAmount != null  ? Number(installmentAmount)  :
      Number(amount || 0);
    this.installmentAmount = instAmtVal;
    this.amount = instAmtVal;

    // Installment Capital / Principal Amount.
    // Returns null when not stored so getPrincipal() can apply a derivation fallback.
    const instCapRaw =
      installment_capital != null ? Number(installment_capital) :
      installmentCapital != null  ? Number(installmentCapital)  :
      principal_amount   != null  ? Number(principal_amount)    :
      principalAmount    != null  ? Number(principalAmount)     :
      null;
    this.installmentCapital = instCapRaw;
    this.principalAmount    = instCapRaw;
    this.principal_amount   = instCapRaw;

    // Installment Interest.
    // Returns null when not stored so getInstallmentInterest() can derive a fallback.
    const instIntRaw =
      installment_interest != null ? Number(installment_interest) :
      installmentInterest  != null ? Number(installmentInterest)  :
      interest_amount      != null ? Number(interest_amount)      :
      interestAmount       != null ? Number(interestAmount)       :
      interestPortion      != null ? Number(interestPortion)      :
      null;
    this.installmentInterest = instIntRaw;
    this.interestAmount  = instIntRaw;
    this.interestPortion = instIntRaw;
    this.interest_amount = instIntRaw;

    // Installment Fee / Stamp Tax.
    // Returns null when not stored — getInstallmentFee() defaults to 0.
    const instFeeRaw =
      installment_fee != null ? Number(installment_fee) :
      installmentFee  != null ? Number(installmentFee)  :
      tax_amount      != null ? Number(tax_amount)      :
      taxAmount       != null ? Number(taxAmount)       :
      null;
    this.installmentFee = instFeeRaw;
    this.taxAmount   = instFeeRaw;
    this.tax_amount  = instFeeRaw;

    this.amortizationAmount = Number(amortizationAmount) || Number(instAmtVal) || 0;
    this.initialInvestedAmount = Number(initialInvestedAmount) || 0;
    this.targetAmount = Number(targetAmount) || 0;
    this.strategy = amortization_strategy || amortizationStrategy || strategy;
    this.amortizationStrategy = this.strategy;
    this.notes = notes || '';
    this.isIncome = this.eventType === EventType.INCOME;
    this.isExpense = this.eventType === EventType.EXPENSE;
    this.isInvestment = this.eventType === EventType.INVESTMENT;
    this.isAmortization = this.eventType === EventType.AMORTIZATION;
    this.isRecurring = Boolean(is_recurring !== undefined ? is_recurring : isRecurring);
    this.isExternal = Boolean(isExternal !== undefined ? isExternal : is_external);
    this.is_external = this.isExternal;
    this.automatic = Boolean(automatic || isAutomatic);
    this.isAutomatic = this.automatic;
    this.isCompleted = Boolean(isCompleted);
    this.isLocked = Boolean(isLocked);
    this.isSystemLoanEvent = Boolean(isSystemLoanEvent || is_system_loan_event);
    this.balanceAfter = Number(remaining_debt_after !== undefined ? remaining_debt_after : (remainingDebtAfter || balanceAfter)) || 0;
    this.remainingDebtAfter = this.balanceAfter;
    this.installmentNumber = installment_number !== undefined ? installment_number : installmentNumber;
    this.totalInstallments = total_installments !== undefined ? total_installments : totalInstallments;
    this.labels = Array.isArray(labels) ? labels : [];
    this.breakdownItems = Array.isArray(breakdown_items) ? breakdown_items : (Array.isArray(breakdownItems) ? breakdownItems : []);
    this.isObligation = Boolean(isObligation || is_obligation);
    this.obligationPersonId = obligationPersonId || obligation_person_id || null;
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
      throw new Error(t('backend.validation.eventDateRequired'));
    }
    if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
      throw new Error(t('backend.validation.eventTitleRequired'));
    }
    if ((data.isObligation || data.is_obligation) && !(data.obligationPersonId || data.obligation_person_id)) {
      throw new Error(t('backend.validation.obligationPersonIdRequired'));
    }
    return true;
  }
}

export function calcToggledStatus(event, explicitStatus = null) {
  if (explicitStatus) {
    return {
      status: explicitStatus,
      isCompleted: isPositiveStatus(explicitStatus)
    };
  }

  const isAmortization = event.eventType === EventType.AMORTIZATION || (typeof event.isAmortizationEvent === 'function' && event.isAmortizationEvent());
  const isInvestment = event.eventType === EventType.INVESTMENT;
  const isIncome = event.eventType === EventType.INCOME;

  const currentStatus = String(event.status || '').toLowerCase();

  const isPositive =
    isPositiveStatus(currentStatus) ||
    currentStatus === EventStatus.PAID ||
    currentStatus === EventStatus.RECEIVED ||
    currentStatus === EventStatus.INVESTED ||
    currentStatus === EventStatus.AMORTIZED ||
    currentStatus === EventStatus.COMPLETED ||
    Boolean(event.isCompleted);

  const isCancelled =
    currentStatus === EventStatus.CANCELLED ||
    currentStatus === 'cancelled' ||
    currentStatus === 'cancelado';

  // 3-state cycle:
  // 1. Negative (pending/planned) -> 2. Positive (paid/received/invested/amortized) -> 3. Cancelled (cancelled) -> 1. Negative
  if (isCancelled) {
    const nextNeg = isInvestment ? EventStatus.PLANNED : EventStatus.PENDING;
    return {
      status: nextNeg,
      isCompleted: false
    };
  }

  if (isPositive) {
    return {
      status: EventStatus.CANCELLED,
      isCompleted: false
    };
  }

  let positiveStatus = EventStatus.PAID;
  if (isIncome) positiveStatus = EventStatus.RECEIVED;
  else if (isInvestment) positiveStatus = EventStatus.INVESTED;
  else if (isAmortization) positiveStatus = EventStatus.AMORTIZED;

  return {
    status: positiveStatus,
    isCompleted: true
  };
}
