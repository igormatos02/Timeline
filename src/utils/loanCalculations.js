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

import {
  EventType,
  EventStatus,
  LoanEventCategory,
  EventPriority,
  EventAggregation,
  TimelineType,
  isPositiveStatus,
  AmortizationEventCategory
} from '../enums/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Format a number as EUR currency (pt-PT locale). */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0,00 €';
  }

  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/** ISO date string for today (runtime, not hardcoded). */
function todayISO() {
  return new Date().toISOString().substring(0, 10);
}

/** Returns the number of periods per year for a given periodicity. */
function periodsPerYear(periodicity) {
  switch ((periodicity || EventAggregation.MONTHLY).toLowerCase()) {
    case EventAggregation.DAILY:
      return 365;

    case EventAggregation.BIWEEKLY:
      return 26;

    case EventAggregation.BIMONTHLY:
      return 6;

    case EventAggregation.SEMIANNUAL:
      return 2;

    case EventAggregation.ANNUAL:
      return 1;

    default:
      return 12;
  }
}

/** Returns the timeline grouping key. */
export function getGroupingForPeriodicity(periodicity) {
  switch ((periodicity || EventAggregation.MONTHLY).toLowerCase()) {
    case EventAggregation.DAILY:
      return 'dia';

    case EventAggregation.BIWEEKLY:
      return 'semana';

    case EventAggregation.ANNUAL:
      return 'ano';

    default:
      return 'mes';
  }
}

/** Returns a human-readable label for a periodicity. */
export function getPeriodicityLabel(periodicity) {
  switch ((periodicity || EventAggregation.MONTHLY).toLowerCase()) {
    case EventAggregation.DAILY:
      return 'Daily';

    case EventAggregation.BIWEEKLY:
      return 'Biweekly';

    case EventAggregation.MONTHLY:
      return 'Monthly';

    case EventAggregation.BIMONTHLY:
      return 'Bimonthly';

    case EventAggregation.SEMIANNUAL:
      return 'Semiannual';

    case EventAggregation.ANNUAL:
      return 'Yearly';

    default:
      return 'Monthly';
  }
}

/** Returns true if the event belongs to this loan timeline. */
function isEventForTimeline(ev, timeline) {
  if (!timeline?.id) return true;

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
    Boolean(ev.isAbatida)
  );
}

/**
 * Returns the capital (principal) portion of an installment.
 *
 * Priority:
 *   1. ev.installmentCapital / ev.principalAmount — if stored and > 0
 *   2. ev.installmentAmount - ev.installmentInterest - ev.installmentFee — if interest is known
 *   3. 82% of installmentAmount — last resort (French amortization approximation)
 *
 * Returns 0 when passed null or abated.
 */
export function getPrincipal(ev) {
  if (!ev) return 0;
  const cap = ev.installmentCapital ?? ev.principalAmount ?? ev.principal_amount;

  // Trust a stored positive number.
  if (cap != null && Number(cap) > 0) {
    return Number(cap);
  }

  const total = getInstallmentAmount(ev);
  if (total <= 0) return 0; // abated or unknown

  const interest = ev.installmentInterest ?? ev.interestAmount ?? ev.interestPortion ?? ev.interest_amount;
  if (interest != null) {
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
  return Number(ev.installmentAmount ?? ev.installment_amount ?? ev.amount ?? 0);
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
  if (interest != null) return Number(interest);

  const total = getInstallmentAmount(ev);
  if (total <= 0) return 0;

  // Derive from total - capital - fee if capital is stored
  const cap = ev.installmentCapital ?? ev.principalAmount ?? ev.principal_amount;
  if (cap != null) {
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
  return fee != null ? Number(fee) : 0;
}

/** Computes the due date for installment k (1-indexed). */
function computeDueDate(
  baseDate,
  k,
  periodicity,
  preferredDueDay
) {
  switch (periodicity.toLowerCase()) {
    case EventAggregation.DAILY:
      return addDays(baseDate, k - 1);

    case EventAggregation.BIWEEKLY:
      return addWeeks(baseDate, (k - 1) * 2);

    case EventAggregation.ANNUAL:
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
  periodicity = EventAggregation.MONTHLY
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
    periodicity || EventAggregation.MONTHLY
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

function applyAmortizationsInMemory(
  timeline,
  eventsList
) {
  const amortEvents = eventsList
    .filter((ev) => {
      if (!ev || ev.isDeleted) return false;

      if (
        ev.status === EventStatus.CANCELLED ||
        ev.status === EventStatus.DELETED
      ) {
        return false;
      }

      if (
        timeline?.id &&
        ev.timelineId &&
        !isEventForTimeline(ev, timeline)
      ) {
        return false;
      }

      const isAmort =
        ev.category ===
        AmortizationEventCategory.REDUCE_TERM ||
        ev.category ===
        AmortizationEventCategory.REDUCE_INSTALLMENT ||
        ev.eventType === EventType.AMORTIZATION ||
        ev.isAmortization;

      return (
        isAmort &&
        isPositiveStatus(ev.status)
      );
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
    const amortVal = Number(
      amortEv.amortizationAmount ||
      amortEv.installmentAmount ||
      amortEv.amount ||
      0
    );

    if (
      isNaN(amortVal) ||
      amortVal <= 0
    ) {
      continue;
    }

    const amortDate =
      amortEv.date || '1900-01-01';

    const category =
      amortEv.category ??
      AmortizationEventCategory.REDUCE_TERM;

    const isReduceInstallment =
      category ===
      AmortizationEventCategory.REDUCE_INSTALLMENT;

    const isOpenInstallment = (ev) =>
      isLoanInstallment(ev) &&
      isEventForTimeline(ev, timeline) &&
      !isPositiveStatus(ev.status) &&
      !isAbated(ev);

    if (isReduceInstallment) {
      // ---------------------------------------------------------
      // REDUCE_INSTALLMENT
      // ---------------------------------------------------------

      const future = currentEvents.filter(
        (ev) =>
          isOpenInstallment(ev) &&
          ev.date >= amortDate
      );

      if (future.length === 0) {
        continue;
      }

      const totalPrincipalBefore =
        future.reduce(
          (sum, ev) =>
            sum + getPrincipal(ev),
          0
        );

      if (totalPrincipalBefore <= 0) {
        continue;
      }

      const ratio =
        Math.max(
          0,
          totalPrincipalBefore - amortVal
        ) /
        totalPrincipalBefore;

      currentEvents = currentEvents.map(
        (ev) => {
          if (
            !isOpenInstallment(ev) ||
            ev.date < amortDate
          ) {
            return ev;
          }

          const capital =
            Math.round(
              getPrincipal(ev) *
              ratio *
              100
            ) / 100;

          const interest =
            Math.round(
              getInstallmentInterest(ev) *
              ratio *
              100
            ) / 100;

          const fee =
            getInstallmentFee(ev);

          const amount =
            Math.round(
              (
                capital +
                interest +
                fee
              ) * 100
            ) / 100;

          return {
            ...ev,

            installmentAmount: amount,
            installmentCapital: capital,
            installmentInterest: interest,
            installmentFee: fee
          };
        }
      );
    } else {
      // ---------------------------------------------------------
      // REDUCE_TERM
      // ---------------------------------------------------------

      const future = currentEvents
        .filter(isOpenInstallment)
        .sort((a, b) => {
          const na =
            Number(
              a.installmentNumber || 0
            );

          const nb =
            Number(
              b.installmentNumber || 0
            );

          return (na && nb)
            ? nb - na
            : (b.date || '').localeCompare(
              a.date || ''
            );
        });

      let remaining = amortVal;

      const patch = new Map();

      for (const inst of future) {
        if (remaining <= 0) {
          break;
        }

        const principal =
          getPrincipal(inst);

        if (principal <= 0) {
          continue;
        }

        if (remaining >= principal) {
          patch.set(inst.id, {
            status: EventStatus.ABATED,
            isAbatida: true,
            isCompleted: true,

            installmentAmount: 0,
            installmentCapital: 0,
            installmentInterest: 0,
            installmentFee: 0
          });

          remaining -= principal;
        } else {
          const newCapital =
            Math.max(
              0,
              Math.round(
                (principal - remaining) *
                100
              ) / 100
            );

          const interest =
            getInstallmentInterest(inst);

          const fee =
            getInstallmentFee(inst);

          const newAmount =
            Math.round(
              (
                newCapital +
                interest +
                fee
              ) * 100
            ) / 100;

          patch.set(inst.id, {
            installmentAmount: newAmount,
            installmentCapital: newCapital
          });

          remaining = 0;
        }
      }

      currentEvents =
        currentEvents.map((ev) =>
          patch.has(ev.id)
            ? {
              ...ev,
              ...patch.get(ev.id)
            }
            : ev
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

    if (
      targetFound &&
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

  // ---------------------------------------------------------
  // Original capital
  // ---------------------------------------------------------

  const originalCapital =
    Number(
      timeline?.loanContract?.originalCapital ||
      timeline?.originalCapital ||
      timeline?.totalDebt ||
      0
    ) ||
    eventsList.reduce(
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
  let paidCount = 0;
  let overdueCount = 0;
  let totalCount = 0;

  let nextInstallment = null;

  for (const ev of eventsList) {
    // Extraordinary amortization events
    if (isAmortizationEvent(ev)) {
      if (isPositiveStatus(ev.status) || ev.isCompleted) {
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

  // ---------------------------------------------------------
  // Remaining capital
  // ---------------------------------------------------------

  const remainingDebt =
    Math.max(
      0,
      Math.round(
        eventsList.reduce(
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
              getPrincipal(ev)
            );
          },
          0
        ) * 100
      ) / 100
    );

  // Total amortized capital includes paid regular installment principal plus extraordinary amortizations
  const amortizedCapital = Math.round((regularPrincipalPaid + extraordinaryAmortized) * 100) / 100;
  const principalPaid = amortizedCapital;

  // ---------------------------------------------------------
  // Future interest
  // ---------------------------------------------------------

  const futureInterest =
    Math.max(
      0,
      Math.round(
        eventsList.reduce(
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

  // ---------------------------------------------------------
  // Total loan cost
  // ---------------------------------------------------------

  const totalLoanCost =
    Math.round(
      eventsList.reduce(
        (acc, ev) => {
          // Extraordinary amortization
          if (isAmortizationEvent(ev)) {
            if (
              isPositiveStatus(ev.status) ||
              ev.isCompleted
            ) {
              return (
                acc +
                Number(
                  ev.amortizationAmount ??
                  ev.installmentAmount ??
                  ev.amount ??
                  0
                )
              );
            }

            return acc;
          }

          if (!isLoanInstallment(ev)) {
            return acc;
          }

          // Abated installment is not paid.
          if (isAbated(ev)) {
            return acc;
          }

          return (
            acc +
            getInstallmentAmount(ev)
          );
        },
        0
      ) * 100
    ) / 100;

  const totalPaid =
    Math.round((amortizedCapital + interestPaid) * 100) / 100;

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
    eventsList
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
        eventsList
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
      eventsList.find(
        isLoanInstallment
      )?.installmentAmount || 0
    );

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

    // Loan cost
    totalLoanCost,

    // Future
    futureCapital: remainingDebt,
    futureInterest,
    futureTotal:
      remainingDebt +
      futureInterest,

    // Installment counts
    paidInstallments: paidCount,
    overdueInstallments: overdueCount,
    totalInstallments: totalCount,

    remainingInstallments:
      Math.max(
        0,
        totalCount - paidCount
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