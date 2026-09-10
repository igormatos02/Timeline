import { EventType, EventStatus, EventPriority, EventPeriodicity, EventRecurrence, LoanEventCategory, isPositiveStatus } from '../../../shared/enums/index.js';
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
    recurrence = null,
    periodicity = null,
    aggregation = null,
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
    amount = 0,
    principalAmount,
    interestPortion,
    interestAmount,
    taxAmount,
    balanceAfter = 0,
    remainingDebtAfter = 0,
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
    notes,
    isCompleted,
    isSystemLoanEvent,
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

    this.timelineOriginName = timelineOriginName;
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
    this.eventType = event_type || eventType;

    // Periodicity & Recurrence mapping
    const rawPeriodicity = periodicity || aggregation;
    let mappedPeriodicity = EventPeriodicity.MONTHLY;
    if (rawPeriodicity && Object.values(EventPeriodicity).includes(rawPeriodicity)) {
      mappedPeriodicity = rawPeriodicity;
    } else if (rawPeriodicity === 'mensal' || rawPeriodicity === 'monthly') {
      mappedPeriodicity = EventPeriodicity.MONTHLY;
    } else if (rawPeriodicity === 'quinzenal' || rawPeriodicity === 'biweekly') {
      mappedPeriodicity = EventPeriodicity.BIWEEKLY;
    } else if (rawPeriodicity === 'bimestral' || rawPeriodicity === 'bimonthly' || rawPeriodicity === 'bimounthly') {
      mappedPeriodicity = EventPeriodicity.BIMONTHLY;
    } else if (rawPeriodicity === 'semestral' || rawPeriodicity === 'biannual' || rawPeriodicity === 'semiannual') {
      mappedPeriodicity = EventPeriodicity.SEMIANNUAL;
    } else if (rawPeriodicity === 'anual' || rawPeriodicity === 'annual') {
      mappedPeriodicity = EventPeriodicity.ANNUAL;
    }
    this.periodicity = mappedPeriodicity;
    this.aggregation = this.periodicity;

    let mappedRecurrence = EventRecurrence.ONCE;
    if (recurrence && Object.values(EventRecurrence).includes(recurrence)) {
      mappedRecurrence = recurrence;
    } else if (rawPeriodicity === 'recorrente' || rawPeriodicity === 'recurring' || Boolean(is_recurring !== undefined ? is_recurring : isRecurring)) {
      mappedRecurrence = EventRecurrence.RECURRING;
    } else if (rawPeriodicity === 'period' || rawPeriodicity === 'periodo' || rawPeriodicity === 'limited' || recurrenceEndDate || endDate) {
      mappedRecurrence = EventRecurrence.LIMITED;
    }
    this.recurrence = mappedRecurrence;
    this.isRecurring = this.recurrence === EventRecurrence.RECURRING || this.recurrence === EventRecurrence.LIMITED;

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
      principalAmount    != null  ? Number(principalAmount)     :
      null;
    this.installmentCapital = instCapRaw;
    this.principalAmount    = instCapRaw;

    // Installment Interest.
    // Returns null when not stored so getInstallmentInterest() can derive a fallback.
    const instIntRaw =
      installment_interest != null ? Number(installment_interest) :
      installmentInterest  != null ? Number(installmentInterest)  :
      interestAmount       != null ? Number(interestAmount)       :
      interestPortion      != null ? Number(interestPortion)      :
      null;
    this.installmentInterest = instIntRaw;
    this.interestAmount  = instIntRaw;
    this.interestPortion = instIntRaw;

    // Installment Fee / Stamp Tax.
    // Returns null when not stored — getInstallmentFee() defaults to 0.
    const instFeeRaw =
      installment_fee != null ? Number(installment_fee) :
      installmentFee  != null ? Number(installmentFee)  :
      taxAmount       != null ? Number(taxAmount)       :
      null;
    this.installmentFee = instFeeRaw;
    this.taxAmount   = instFeeRaw;

    this.amortizationAmount = Number(amortizationAmount) || Number(instAmtVal) || 0;
    this.initialInvestedAmount = Number(initialInvestedAmount) || 0;
    this.targetAmount = Number(targetAmount) || 0;
    this.strategy = amortizationStrategy || strategy;
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
    this.isSystemLoanEvent = Boolean(isSystemLoanEvent);
    this.balanceAfter = Number(remainingDebtAfter !== undefined ? remainingDebtAfter : balanceAfter) || 0;
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
