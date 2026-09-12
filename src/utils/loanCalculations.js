import {
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
  parseISO,
  isBefore
} from 'date-fns';

import { generateUUID } from './uuid.js';
import { formatCurrency } from './formatCurrency.js';

import {
  EventType,
  EventStatus,
  LoanEventCategory,
  EventPriority,
  EventPeriodicity,
  TimelineType,
  isPositiveStatus,
  isCancelledStatus,
  AmortizationEventCategory,
  AmortizationStrategy
} from '../enums/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** ISO date string for today (runtime, not hardcoded). */
function todayISO() {
  return new Date().toISOString().substring(0, 10);
}

/** Returns the number of periods per year for a given periodicity. */
function periodsPerYear(periodicity) {
  switch ((periodicity || EventPeriodicity.MONTHLY).toLowerCase()) {
    case 'daily':
      return 365;

    case EventPeriodicity.BIWEEKLY:
    case 'biweekly':
      return 26;

    case EventPeriodicity.BIMONTHLY:
    case 'bimonthly':
    case 'bimounthly':
      return 6;

    case EventPeriodicity.SEMIANNUAL:
    case 'biannual':
    case 'semiannual':
      return 2;

    case EventPeriodicity.ANNUAL:
    case 'annual':
      return 1;

    default:
      return 12;
  }
}

/** Returns the timeline grouping key. */
export function getGroupingForPeriodicity(periodicity) {
  switch ((periodicity || EventPeriodicity.MONTHLY).toLowerCase()) {
    case 'daily':
      return 'dia';

    case EventPeriodicity.BIWEEKLY:
    case 'biweekly':
      return 'semana';

    case EventPeriodicity.ANNUAL:
    case 'annual':
      return 'ano';

    default:
      return 'mes';
  }
}

/** Returns a human-readable label for a periodicity. */
export function getPeriodicityLabel(periodicity) {
  switch ((periodicity || EventPeriodicity.MONTHLY).toLowerCase()) {
    case 'daily':
      return 'Daily';

    case EventPeriodicity.BIWEEKLY:
    case 'biweekly':
      return 'Biweekly';

    case EventPeriodicity.MONTHLY:
    case 'monthly':
      return 'Monthly';

    case EventPeriodicity.BIMONTHLY:
    case 'bimonthly':
    case 'bimounthly':
      return 'Bimonthly';

    case EventPeriodicity.SEMIANNUAL:
    case 'biannual':
    case 'semiannual':
      return 'Semiannual';

    case EventPeriodicity.ANNUAL:
    case 'annual':
      return 'Yearly';

    default:
      return 'Monthly';
  }
}

/** Returns true if the event belongs to this loan timeline. */
export function isEventForTimeline(ev, timeline) {
  if (!timeline?.id || !ev) return false;

  return (
    ev.timelineId === timeline.id ||
    ev.timelineOriginId === timeline.id
  );
}

/** Returns true if the event is a loan installment. */
export function isLoanInstallment(ev) {
  if (!ev) return false;
  return (
    ev.eventType === EventType.LOAN_INSTALLMENT ||
    ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
    ev.category === LoanEventCategory.INSTALLMENTS ||
    Boolean(ev.isSystemLoanEvent)
  );
}

/** Returns true if the event is an extraordinary amortization. */
export function isAmortizationEvent(ev) {
  if (!ev) return false;
  return (
    ev.eventType === EventType.AMORTIZATION ||
    ev.category === AmortizationEventCategory.REDUCE_TERM ||
    ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
    Boolean(ev.isAmortization)
  );
}

/** Returns true if the event is abated/amortized. */
export function isAbated(ev) {
  if (!ev) return false;
  return (
    ev.status === EventStatus.ABATED ||
    ev.status === EventStatus.AMORTIZED ||
    Boolean(ev.isAbated)
  );
}

/**
 * Returns the capital (principal) portion of an installment.
 *
 * Priority:
 *   1. ev.installmentCapital / ev.principalAmount — if stored
 *   2. ev.installmentAmount - ev.installmentInterest - ev.installmentFee — if interest is known
 *   3. 82% of installmentAmount — last resort (French amortization approximation)
 *
 * Returns 0 when passed null, abated, or explicitly zeroed.
 */
export function getPrincipal(ev) {
  if (!ev) return 0;
  const cap = ev.installmentCapital ?? ev.principalAmount ?? ev.principal_amount;

  // Trust a stored number (including 0).
  if (cap != null && !isNaN(Number(cap))) {
    return Math.max(0, Number(cap));
  }

  const total = getInstallmentAmount(ev);
  if (total <= 0) return 0; // abated or zeroed out

  const interest = ev.installmentInterest ?? ev.interestAmount ?? ev.interestPortion ?? ev.interest_amount;
  if (interest != null && !isNaN(Number(interest))) {
    const fee = getInstallmentFee(ev);
    return Math.max(0, Math.round((total - Number(interest) - fee) * 100) / 100);
  }

  // Last resort: 82% of total (typical capital share in French amortization at ~3–4% TAN)
  return Math.round(total * 0.82 * 100) / 100;
}

/**
 * Returns the total installment amount (capital + interest + fee).
 */
export function getInstallmentAmount(ev) {
  if (!ev) return 0;
  return Math.max(0, Number(ev.installmentAmount ?? ev.installment_amount ?? ev.amount ?? 0));
}

/**
 * Returns the contractual interest portion of an installment.
 *
 * Priority:
 *   1. ev.installmentInterest / ev.interestAmount — if stored
 *   2. installmentAmount - installmentCapital - installmentFee — if capital is known
 *   3. 18% of installmentAmount — last resort (complement of 82% capital share)
 */
export function getInstallmentInterest(ev) {
  if (!ev) return 0;
  const interest = ev.installmentInterest ?? ev.interestAmount ?? ev.interestPortion ?? ev.interest_amount;
  if (interest != null && !isNaN(Number(interest))) {
    return Math.max(0, Number(interest));
  }

  const total = getInstallmentAmount(ev);
  if (total <= 0) return 0;

  // Derive from total - capital - fee if capital is stored
  const cap = ev.installmentCapital ?? ev.principalAmount ?? ev.principal_amount;
  if (cap != null && !isNaN(Number(cap))) {
    const fee = getInstallmentFee(ev);
    return Math.max(0, Math.round((total - Number(cap) - fee) * 100) / 100);
  }

  // Last resort: 18% of total (complement of 82% used by getPrincipal)
  const fee = getInstallmentFee(ev);
  return Math.max(0, Math.round((total * 0.18 - fee) * 100) / 100);
}

/**
 * Returns the stamp tax / fee portion of an installment.
 */
export function getInstallmentFee(ev) {
  if (!ev) return 0;
  const fee = ev.installmentFee ?? ev.installment_fee ?? ev.taxAmount ?? ev.tax_amount;
  if (fee != null && !isNaN(Number(fee))) {
    return Math.max(0, Number(fee));
  }
  return 0;
}

/** Computes the due date for installment k (1-indexed). */
function computeDueDate(
  baseDate,
  k,
  periodicity,
  preferredDueDay
) {
  const p = (periodicity || EventPeriodicity.MONTHLY).toLowerCase();
  switch (p) {
    case 'daily':
      return addDays(baseDate, k - 1);

    case EventPeriodicity.BIWEEKLY:
    case 'biweekly':
      return addWeeks(baseDate, (k - 1) * 2);

    case EventPeriodicity.ANNUAL:
    case 'annual':
      return addYears(baseDate, k - 1);

    default: {
      const d = addMonths(baseDate, k - 1);

      const daysInMonth = new Date(
        d.getFullYear(),
        d.getMonth() + 1,
        0
      ).getDate();

      return new Date(
        d.getFullYear(),
        d.getMonth(),
        Math.min(preferredDueDay, daysInMonth)
      );
    }
  }
}

// ---------------------------------------------------------------------------
// Schedule Generation
// ---------------------------------------------------------------------------

/**
 * Generate the full amortization schedule (French system).
 */
export function generateLoanInstallments({
  totalAmountFinanced,
  totalDebt,
  monthlyInstallment,
  numberOfInstallments,
  totalInstallments,
  tanRate = 0,
  spread = 0,
  interestStampTaxRate = 0,
  startDate,
  debtStartDate,
  dueDay,
  periodicity = EventPeriodicity.MONTHLY
}) {
  const pv = Number(
    totalAmountFinanced ?? totalDebt ?? 0
  );

  const n =
    parseInt(
      numberOfInstallments ?? totalInstallments ?? 1,
      10
    ) || 1;

  const pLower = (
    periodicity || EventPeriodicity.MONTHLY
  ).toLowerCase();

  const tan =
    Number(tanRate || 0) +
    Number(spread || 0);

  const i =
    (tan / 100) /
    periodsPerYear(pLower);

  // PMT — French constant installment formula
  let pmt = Number(monthlyInstallment || 0);

  if (pmt <= 0 && pv > 0 && n > 0) {
    pmt =
      i > 0
        ? (
          pv *
          (i * Math.pow(1 + i, n))
        ) /
        (Math.pow(1 + i, n) - 1)
        : pv / n;
  }

  pmt = Math.round(pmt * 100) / 100;

  const stampTax = Number(
    interestStampTaxRate || 0
  );

  const baseDate = parseISO(
    debtStartDate || startDate
  );

  const preferredDueDay =
    dueDay != null && !isNaN(dueDay)
      ? parseInt(dueDay, 10)
      : baseDate.getDate();

  // Negative amortization guard
  const firstInterest =
    Math.round(pv * i * 100) / 100;

  if (pmt > 0 && pmt <= firstInterest) {
    throw new Error(
      'Os parâmetros fornecidos não permitem amortizar o capital. Verifique a TAN, prazo ou periodicidade.'
    );
  }

  const events = [];

  let balance = pv;

  for (let k = 1; k <= n; k++) {
    const interest =
      Math.round(balance * i * 100) / 100;

    let capital =
      Math.round((pmt - interest) * 100) / 100;

    // Last installment pays remaining capital
    if (k === n || balance <= capital) {
      capital = balance;
    }

    const totalPayment =
      Math.round(
        (capital + interest + stampTax) * 100
      ) / 100;

    balance = Math.max(
      0,
      Math.round((balance - capital) * 100) / 100
    );

    const dueDate = computeDueDate(
      baseDate,
      k,
      pLower,
      preferredDueDay
    );

    events.push({
      id: generateUUID(),

      date: format(dueDate, 'yyyy-MM-dd'),
      time: '09:00',

      title: `Installment #${k} of ${n}`,

      description:
        `${formatCurrency(capital)} capital + ` +
        `${formatCurrency(interest)} interest + ` +
        `${formatCurrency(stampTax)} stamp tax`,

      category: LoanEventCategory.LOAN_INSTALLMENT,
      eventType: EventType.LOAN_INSTALLMENT,

      status: EventStatus.PENDING,
      priority: EventPriority.NORMAL,

      // Entity fields
      installmentAmount: totalPayment,
      installmentCapital: capital,
      installmentInterest: interest,
      installmentFee: stampTax,

      balanceAfter: balance,

      installmentNumber: k,
      totalInstallments: n,

      isSystemLoanEvent: true,
      isCompleted: false
    });

    if (balance <= 0) {
      break;
    }
  }

  return events;
}

// ---------------------------------------------------------------------------
// In-memory Amortization Application
// ---------------------------------------------------------------------------

/** Helper predicate to find open installments eligible for amortization. */
function isOpenInstallmentForAmortization(ev, timeline) {
  return (
    isLoanInstallment(ev) &&
    isEventForTimeline(ev, timeline) &&
    !isPositiveStatus(ev.status) &&
    !isCancelledStatus(ev.status) &&
    !isAbated(ev)
  );
}

/**
 * REDUCE_INSTALLMENT (Diminuir Parcela)
 * Mantém o prazo e reduz o valor das parcelas abertas proporcionalmente.
 * Função 100% isolada e independente de cálculo.
 */
export function applyAmortizationReduceInstallment(
  currentEvents,
  amortEv,
  timeline
) {
  const amortVal = Number(
    amortEv.amortizationAmount ||
    amortEv.installmentAmount ||
    amortEv.amount ||
    0
  );

  if (isNaN(amortVal) || amortVal <= 0) {
    return currentEvents;
  }

  const future = currentEvents.filter((ev) =>
    isOpenInstallmentForAmortization(ev, timeline)
  );

  if (future.length === 0) {
    return currentEvents;
  }

  const totalPrincipalBefore = future.reduce(
    (sum, ev) => sum + getPrincipal(ev),
    0
  );

  if (totalPrincipalBefore <= 0) {
    return currentEvents;
  }

  const futureIds = new Set(future.map((f) => f.id));
  const ratio =
    Math.max(0, totalPrincipalBefore - amortVal) / totalPrincipalBefore;

  return currentEvents.map((ev) => {
    if (!futureIds.has(ev.id)) {
      return ev;
    }

    const capital =
      Math.round(getPrincipal(ev) * ratio * 100) / 100;
    const interest =
      Math.round(getInstallmentInterest(ev) * ratio * 100) / 100;
    const fee =
      Math.round(getInstallmentFee(ev) * ratio * 100) / 100;
    const amount =
      Math.round((capital + interest + fee) * 100) / 100;

    const origCap =
      ev.originalInstallmentCapital ??
      ev.installmentCapital ??
      getPrincipal(ev);
    const origInt =
      ev.originalInstallmentInterest ??
      ev.installmentInterest ??
      getInstallmentInterest(ev);
    const origFee =
      ev.originalInstallmentFee ??
      ev.installmentFee ??
      getInstallmentFee(ev);
    const origTotal =
      ev.originalInstallmentAmount ??
      ev.installmentAmount ??
      getInstallmentAmount(ev);

    const isFullyAmortized =
      ratio === 0 || (capital === 0 && interest === 0 && amount === 0);

    return {
      ...ev,
      originalInstallmentAmount: origTotal,
      originalInstallmentCapital: origCap,
      originalInstallmentInterest: origInt,
      originalInstallmentFee: origFee,
      savedInterest: isFullyAmortized
        ? origInt
        : Math.max(0, Math.round((origInt - interest) * 100) / 100),
      amount: amount,
      installmentAmount: amount,
      installmentCapital: capital,
      installmentInterest: interest,
      installmentFee: fee,
      status: isFullyAmortized ? EventStatus.ABATED : ev.status,
      isAbated: isFullyAmortized ? true : Boolean(ev.isAbated),
      isCompleted: isFullyAmortized ? true : Boolean(ev.isCompleted)
    };
  });
}

/**
 * REDUCE_TERM (Diminuir Prazo)
 * Abate as parcelas do fim para trás a 0, mantendo as iniciais abertas intactas.
 * Função 100% isolada e independente de cálculo.
 */
export function applyAmortizationReduceTerm(
  currentEvents,
  amortEv,
  timeline
) {
  const amortVal = Number(
    amortEv.amortizationAmount ||
    amortEv.installmentAmount ||
    amortEv.amount ||
    0
  );

  if (isNaN(amortVal) || amortVal <= 0) {
    return currentEvents;
  }

  const futureCandidates = currentEvents.filter((ev) =>
    isOpenInstallmentForAmortization(ev, timeline)
  );

  const future = futureCandidates.sort((a, b) => {
    const na = Number(a.installmentNumber || 0);
    const nb = Number(b.installmentNumber || 0);

    return na && nb
      ? nb - na
      : (b.date || '').localeCompare(a.date || '');
  });

  let remaining = amortVal;
  const patch = new Map();

  for (const inst of future) {
    if (remaining <= 0) {
      break;
    }

    const principal = getPrincipal(inst);

    if (principal <= 0) {
      continue;
    }

    const origCap =
      inst.originalInstallmentCapital ??
      inst.installmentCapital ??
      getPrincipal(inst);
    const origInt =
      inst.originalInstallmentInterest ??
      inst.installmentInterest ??
      getInstallmentInterest(inst);
    const origFee =
      inst.originalInstallmentFee ??
      inst.installmentFee ??
      getInstallmentFee(inst);
    const origTotal =
      inst.originalInstallmentAmount ??
      inst.installmentAmount ??
      getInstallmentAmount(inst);

    if (remaining >= principal) {
      patch.set(inst.id, {
        status: EventStatus.ABATED,
        isAbated: true,
        isCompleted: true,
        originalInstallmentAmount: origTotal,
        originalInstallmentCapital: origCap,
        originalInstallmentInterest: origInt,
        originalInstallmentFee: origFee,
        savedInterest: origInt,
        amount: 0,
        installmentAmount: 0,
        installmentCapital: 0,
        installmentInterest: 0,
        installmentFee: 0
      });

      remaining -= principal;
    } else {
      const newCapital = Math.max(
        0,
        Math.round((principal - remaining) * 100) / 100
      );

      const interest = getInstallmentInterest(inst);
      const fee = getInstallmentFee(inst);
      const newAmount =
        Math.round((newCapital + interest + fee) * 100) / 100;

      patch.set(inst.id, {
        originalInstallmentAmount: origTotal,
        originalInstallmentCapital: origCap,
        originalInstallmentInterest: origInt,
        originalInstallmentFee: origFee,
        savedInterest: 0,
        amount: newAmount,
        installmentAmount: newAmount,
        installmentCapital: newCapital
      });

      remaining = 0;
    }
  }

  return currentEvents.map((ev) =>
    patch.has(ev.id)
      ? {
        ...ev,
        ...patch.get(ev.id)
      }
      : ev
  );
}

function applyAmortizationsInMemory(
  timeline,
  eventsList
) {
  const amortEvents = eventsList
    .filter((ev) => {
      if (isCancelledStatus(ev.status)) return false;
      const isAmort =
        ev.eventType === EventType.AMORTIZATION ||
        ev.category === AmortizationEventCategory.REDUCE_TERM ||
        ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
        Boolean(ev.isAmortization);

      return isAmort;
    })
    .sort((a, b) =>
      (a.date || '').localeCompare(
        b.date || ''
      )
    );

  if (amortEvents.length === 0) {
    return eventsList;
  }

  let currentEvents = [...eventsList];

  for (const amortEv of amortEvents) {
    const strategy =
      amortEv.strategy ||
      amortEv.amortizationStrategy ||
      amortEv.category ||
      AmortizationStrategy.REDUCE_TERM;

    const isReduceInstallment =
      strategy === AmortizationStrategy.REDUCE_INSTALLMENT ||
      strategy === AmortizationEventCategory.REDUCE_INSTALLMENT ||
      strategy === 'reduce_installment';

    if (isReduceInstallment) {
      currentEvents = applyAmortizationReduceInstallment(
        currentEvents,
        amortEv,
        timeline
      );
    } else {
      currentEvents = applyAmortizationReduceTerm(
        currentEvents,
        amortEv,
        timeline
      );
    }
  }

  return currentEvents;
}

// ---------------------------------------------------------------------------
// Loan State Recalculation
// ---------------------------------------------------------------------------

export function recalculateLoanState(
  timeline,
  eventsList
) {
  const today = parseISO(todayISO());

  const prepared =
    applyAmortizationsInMemory(
      timeline,
      eventsList
    );

  const sorted = [...prepared].sort(
    (a, b) => {
      if (a.date === b.date) {
        return (
          (a.installmentNumber || 0) -
          (b.installmentNumber || 0)
        );
      }

      return a.date.localeCompare(
        b.date
      );
    }
  );

  let runningBalance = Number(
    timeline?.loanContract?.originalCapital ||
    timeline?.originalCapital ||
    timeline?.totalDebt ||
    0
  );

  return sorted.map((ev) => {
    if (!isLoanInstallment(ev)) {
      return ev;
    }

    if (isAbated(ev)) {
      return {
        ...ev,

        status: EventStatus.AMORTIZED,
        isAbatida: true,
        isCompleted: true,

        installmentAmount: 0,
        installmentCapital: 0,
        installmentInterest: 0,
        installmentFee: 0,

        balanceAfter: runningBalance
      };
    }

    const principal =
      getPrincipal(ev);

    const totalAmount =
      getInstallmentAmount(ev);

    const interest =
      getInstallmentInterest(ev);

    const fee =
      getInstallmentFee(ev);

    const isPaid =
      isPositiveStatus(ev.status);

    let status =
      isPaid
        ? ev.status
        : EventStatus.PENDING;

    try {
      if (
        !isPaid &&
        isBefore(
          parseISO(ev.date),
          today
        )
      ) {
        status =
          EventStatus.OVERDUE;
      }
    } catch (_) {
      // Invalid date — keep current status
    }

    runningBalance = Math.max(
      0,
      Math.round(
        (
          runningBalance -
          principal
        ) * 100
      ) / 100
    );

    return {
      ...ev,

      installmentAmount: totalAmount,
      installmentCapital: principal,
      installmentInterest: interest,
      installmentFee: fee,

      status,
      isCompleted: isPaid,

      balanceAfter: runningBalance
    };
  });
}

// ---------------------------------------------------------------------------
// Installment Propagation
// ---------------------------------------------------------------------------

export function propagateInstallmentAmountForward(
  eventsList,
  targetEventId,
  newTotalAmount,
  newPrincipal = null,
  newInterest = null
) {
  const total =
    Number(newTotalAmount);

  const targetEvent = eventsList.find((e) => e.id === targetEventId);
  const targetTimelineId = targetEvent?.timelineId || targetEvent?.timelineOriginId;

  const computePrincipal = () =>
    newPrincipal !== null
      ? Number(newPrincipal)
      : Math.round(
        total * 0.82 * 100
      ) / 100;

  const computeInterest = (principal) =>
    newInterest !== null
      ? Number(newInterest)
      : Math.round(
        (
          total -
          principal
        ) * 100
      ) / 100;

  let targetFound = false;

  return eventsList.map((ev) => {
    if (ev.id === targetEventId) {
      targetFound = true;

      const principal =
        computePrincipal();

      const interest =
        computeInterest(principal);

      return {
        ...ev,

        installmentAmount: total,
        installmentCapital: principal,
        installmentInterest: interest
      };
    }

    const matchesTimeline = !targetTimelineId ||
      ev.timelineId === targetTimelineId ||
      ev.timelineOriginId === targetTimelineId;

    if (
      targetFound &&
      matchesTimeline &&
      isLoanInstallment(ev) &&
      !isPositiveStatus(ev.status)
    ) {
      const principal =
        computePrincipal();

      const interest =
        computeInterest(principal);

      return {
        ...ev,

        installmentAmount: total,
        installmentCapital: principal,
        installmentInterest: interest
      };
    }

    return ev;
  });
}

// ---------------------------------------------------------------------------
// Extraordinary Amortization Event Builder
// ---------------------------------------------------------------------------

export function applyExtraordinaryAmortization({
  eventsList,
  existingAmortEvent,
  amortizationAmount,
  amortizationDateStr,
  strategy,
  notes
}) {
  if (existingAmortEvent) {
    return eventsList;
  }

  const amount =
    Number(amortizationAmount || 0);

  const ev = {
    id: generateUUID(),

    date: amortizationDateStr,
    time: '12:00',

    title:
      `Extraordinary Amortization: ` +
      `${formatCurrency(amount)}`,

    description:
      notes ||
      'Extraordinary amortization record',

    category:
      LoanEventCategory.AMORTIZATION,

    eventType:
      EventType.AMORTIZATION,

    status:
      EventStatus.AMORTIZED,

    priority:
      EventPriority.HIGH,

    // Entity field
    installmentAmount: amount,

    strategy,

    isCompleted: true
  };

  return eventsList.some(
    (e) => e.id === ev.id
  )
    ? eventsList
    : [...eventsList, ev];
}

// ---------------------------------------------------------------------------
// Loan Metrics
// ---------------------------------------------------------------------------

export function getLoanMetrics(
  timeline,
  eventsList = []
) {
  const today = todayISO();

  // Filter events strictly for the specified timeline if timeline is provided
  const timelineEvents = timeline?.id
    ? eventsList.filter((ev) => isEventForTimeline(ev, timeline))
    : eventsList;

  // ---------------------------------------------------------
  // Original capital
  // ---------------------------------------------------------

  const originalCapital =
    Number(
      timeline?.originalCapital ||
      timeline?.totalDebt ||
      timeline?.loanContract?.originalCapital ||
      0
    ) ||
    timelineEvents.reduce(
      (acc, ev) => {
        if (!isLoanInstallment(ev)) {
          return acc;
        }

        return (
          acc +
          getPrincipal(ev)
        );
      },
      0
    );

  // ---------------------------------------------------------
  // Per-installment and amortization aggregations
  // ---------------------------------------------------------

  let regularPrincipalPaid = 0;
  let extraordinaryAmortized = 0;
  let interestPaid = 0;
  let feePaid = 0;
  let paidCount = 0;
  let overdueCount = 0;
  let totalCount = 0;

  let nextInstallment = null;

  for (const ev of timelineEvents) {
    if (!ev || ev.isDeleted) continue;
    const isCancelled = isCancelledStatus(ev.status);

    // Extraordinary amortization events
    if (isAmortizationEvent(ev)) {
      if (!isCancelled && (isPositiveStatus(ev.status) || ev.isCompleted)) {
        const amortVal = Number(
          ev.amortizationAmount ??
          ev.installmentAmount ??
          ev.amount ??
          0
        );
        if (amortVal > 0) {
          extraordinaryAmortized += amortVal;
          paidCount++;
        }
      }
      continue;
    }

    if (!isLoanInstallment(ev)) {
      continue;
    }

    if (isCancelled) {
      continue;
    }

    totalCount++;

    const principal =
      getPrincipal(ev);

    const interest =
      getInstallmentInterest(ev);

    const amount =
      getInstallmentAmount(ev);

    const abated =
      isAbated(ev);

    const paid =
      isPositiveStatus(ev.status);

    if (abated) {
      paidCount++;
    } else if (paid) {
      regularPrincipalPaid += principal;
      interestPaid += interest;
      feePaid += getInstallmentFee(ev);
      paidCount++;
    } else {
      if (
        ev.status === EventStatus.OVERDUE ||
        ev.date < today
      ) {
        overdueCount++;
      }

      if (
        !nextInstallment ||
        ev.date < nextInstallment.date
      ) {
        nextInstallment = ev;
      }
    }

    // Explicitly keep amount referenced so the
    // event contract is clear.
    void amount;
  }

  // Total amortized capital includes paid regular installment principal plus extraordinary amortizations
  const amortizedCapital = Math.round((regularPrincipalPaid + extraordinaryAmortized) * 100) / 100;
  const principalPaid = amortizedCapital;

  // ---------------------------------------------------------
  // Remaining capital (Remaining Debt)
  // ---------------------------------------------------------

  const remainingDebt =
    originalCapital > 0
      ? Math.max(0, Math.round((originalCapital - amortizedCapital) * 100) / 100)
      : Math.max(
          0,
          Math.round(
            timelineEvents.reduce(
              (acc, ev) => {
                if (
                  !isLoanInstallment(ev) ||
                  isAbated(ev) ||
                  isPositiveStatus(ev.status) ||
                  isCancelledStatus(ev.status)
                ) {
                  return acc;
                }

                return (
                  acc +
                  getPrincipal(ev)
                );
              },
              0
            ) * 100
          ) / 100
        );

  // ---------------------------------------------------------
  // Future interest & Fees
  // ---------------------------------------------------------

  const futureInterest =
    Math.max(
      0,
      Math.round(
        timelineEvents.reduce(
          (acc, ev) => {
            if (
              !isLoanInstallment(ev) ||
              isAbated(ev) ||
              isPositiveStatus(ev.status)
            ) {
              return acc;
            }

            return (
              acc +
              getInstallmentInterest(ev)
            );
          },
          0
        ) * 100
      ) / 100
    );

  const futureFee =
    Math.max(
      0,
      Math.round(
        timelineEvents.reduce(
          (acc, ev) => {
            if (
              !isLoanInstallment(ev) ||
              isAbated(ev) ||
              isPositiveStatus(ev.status)
            ) {
              return acc;
            }

            return (
              acc +
              getInstallmentFee(ev)
            );
          },
          0
        ) * 100
      ) / 100
    );

  const totalEstimatedInterest =
    Math.round((interestPaid + futureInterest) * 100) / 100;

  const totalEstimatedFee =
    Math.round((feePaid + futureFee) * 100) / 100;

  const futureTotal =
    Math.round((remainingDebt + futureInterest + futureFee) * 100) / 100;

  const totalPaid =
    Math.round((amortizedCapital + interestPaid + feePaid) * 100) / 100;

  const totalLoanCost =
    Math.round((originalCapital + totalEstimatedInterest + totalEstimatedFee) * 100) / 100;

  const progressPercent =
    originalCapital > 0
      ? Math.min(
        100,
        Math.round(
          (
            amortizedCapital /
            originalCapital
          ) * 100
        )
      )
      : 0;

  let loanStatus =
    EventStatus.PLANNED;

  if (
    remainingDebt <= 0 ||
    (
      totalCount > 0 &&
      paidCount >= totalCount
    )
  ) {
    loanStatus =
      EventStatus.SETTLED;
  } else if (overdueCount > 0) {
    loanStatus =
      EventStatus.OVERDUE;
  }

  // ---------------------------------------------------------
  // Last active installment
  // ---------------------------------------------------------

  const openInstallments =
    timelineEvents
      .filter(
        (ev) =>
          isLoanInstallment(ev) &&
          !isPositiveStatus(ev.status)
      )
      .sort((a, b) =>
        a.date.localeCompare(
          b.date
        )
      );

  const lastActiveInstallment =
    openInstallments.length > 0
      ? openInstallments[
      openInstallments.length - 1
      ]
      : (
        timelineEvents
          .filter(isLoanInstallment)
          .sort((a, b) =>
            a.date.localeCompare(
              b.date
            )
          )
          .at(-1) ?? null
      );

  const estimatedPayoffDate =
    lastActiveInstallment?.date ??
    timeline?.endDate ??
    null;

  const nextDueDate =
    nextInstallment?.date ??
    null;

  const currentInstallmentAmount =
    Number(
      timeline?.installmentAmount || 0
    ) ||
    Number(
      nextInstallment?.installmentAmount || 0
    ) ||
    Number(
      timelineEvents.find(
        isLoanInstallment
      )?.installmentAmount || 0
    );

  const contractTotalInstallments = Number(
    timeline?.totalInstallments ??
    timeline?.loanContract?.totalInstallments ??
    timeline?.numberOfInstallments ??
    0
  );

  const finalTotalInstallments = contractTotalInstallments > 0 ? contractTotalInstallments : totalCount;

  return {
    // Capital
    originalCapital,

    // Debt
    remainingDebt,
    remainingBalance: remainingDebt,

    // Paid / amortized
    principalPaid,
    amortizedCapital,

    // Paid totals
    totalPaid,
    interestPaid,
    totalInterestPaid: interestPaid,
    paidInterest: interestPaid,
    feePaid,
    paidFee: feePaid,
    totalFeePaid: feePaid,

    // Loan cost
    totalLoanCost,
    totalEstimatedInterest,
    totalEstimatedFee,

    // Future
    futureCapital: remainingDebt,
    futureInterest,
    futureFee,
    futureTotal,

    // Installment counts
    paidInstallments: paidCount,
    overdueInstallments: overdueCount,
    totalInstallments: finalTotalInstallments,

    remainingInstallments:
      Math.max(
        0,
        finalTotalInstallments - paidCount
      ),

    // Dates & amounts
    currentInstallmentAmount,
    nextInstallment,
    nextDueDate,
    estimatedPayoffDate,
    lastActiveInstallment,

    // Progress
    progressPercent,
    loanStatus
  };
}

// ---------------------------------------------------------------------------
// Consolidated Metrics
// ---------------------------------------------------------------------------

export function getConsolidatedLoanMetrics(
  timelines,
  selectedIds = null
) {
  const loans =
    (timelines || []).filter(
      (tl) =>
        (
          tl.type === TimelineType.LOAN ||
          (tl.type || '')
            .toLowerCase()
            .includes('loan')
        ) &&
        (
          !selectedIds ||
          selectedIds.includes(tl.id)
        )
    );

  let totalContractedDebt = 0;
  let totalRemainingDebt = 0;
  let totalPaid = 0;
  let totalPrincipalPaid = 0;
  let totalInterestPaid = 0;
  let totalInstallments = 0;
  let paidInstallments = 0;
  let overdueInstallments = 0;

  for (const tl of loans) {
    const metrics =
      getLoanMetrics(
        tl,
        tl.events || []
      );

    totalContractedDebt +=
      metrics.originalCapital;

    totalRemainingDebt +=
      metrics.remainingDebt;

    totalPaid +=
      metrics.totalPaid;

    totalPrincipalPaid +=
      metrics.principalPaid;

    totalInterestPaid +=
      metrics.totalInterestPaid;

    totalInstallments +=
      metrics.totalInstallments;

    paidInstallments +=
      metrics.paidInstallments;

    overdueInstallments +=
      metrics.overdueInstallments;
  }

  return {
    activeCreditsCount: loans.length,

    totalContractedDebt,
    totalRemainingDebt,

    totalPaid,
    totalPrincipalPaid,
    totalInterestPaid,

    totalInstallments,
    paidInstallments,
    overdueInstallments,

    progressPercent:
      totalContractedDebt > 0
        ? Math.min(
          100,
          Math.round(
            (
              totalPrincipalPaid /
              totalContractedDebt
            ) * 100
          )
        )
        : 0
  };
}

// ---------------------------------------------------------------------------
// Consolidated Metrics at Horizon
// ---------------------------------------------------------------------------

export function getConsolidatedLoanMetricsAtHorizon(
  timelines,
  targetHorizonMonth = null,
  selectedIds = null
) {
  const loans =
    (timelines || []).filter(
      (tl) =>
        (
          tl.type === TimelineType.LOAN ||
          (tl.type || '')
            .toLowerCase()
            .includes('loan')
        ) &&
        (
          !selectedIds ||
          selectedIds.includes(tl.id)
        )
    );

  let totalContractedDebt = 0;
  let totalPrincipalPaid = 0;
  let totalRemainingDebt = 0;

  for (const tl of loans) {
    const {
      originalCapital
    } = getLoanMetrics(
      tl,
      tl.events || []
    );

    totalContractedDebt +=
      originalCapital;

    let paidForLoan = 0;

    for (const ev of tl.events || []) {
      if (!ev?.date) {
        continue;
      }

      if (
        ev.status === EventStatus.CANCELLED ||
        ev.status === EventStatus.DELETED
      ) {
        continue;
      }

      if (
        targetHorizonMonth &&
        ev.date.substring(0, 7) >
        targetHorizonMonth
      ) {
        continue;
      }

      if (!isLoanInstallment(ev)) {
        continue;
      }

      paidForLoan +=
        getPrincipal(ev);
    }

    const capped =
      Math.min(
        originalCapital,
        paidForLoan
      );

    totalPrincipalPaid += capped;

    totalRemainingDebt +=
      Math.max(
        0,
        originalCapital - capped
      );
  }

  return {
    totalContractedDebt,
    totalPrincipalPaid,
    totalRemainingDebt
  };
}