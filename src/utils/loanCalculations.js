import { addDays, addWeeks, addMonths, addYears, format, parseISO, isBefore } from 'date-fns';
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
  if (amount === undefined || amount === null || isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR' }).format(amount);
}

/** ISO date string for today (runtime, not hardcoded). */
function todayISO() {
  return new Date().toISOString().substring(0, 10);
}

/** Returns the number of periods per year for a given EventAggregation periodicity. */
function periodsPerYear(periodicity) {
  switch ((periodicity || EventAggregation.MONTHLY).toLowerCase()) {
    case EventAggregation.DAILY:    return 365;
    case EventAggregation.BIWEEKLY: return 26;
    case EventAggregation.BIMONTHLY: return 6;
    case EventAggregation.SEMIANNUAL: return 2;
    case EventAggregation.ANNUAL:   return 1;
    default:                        return 12; // MONTHLY
  }
}

/** Returns the timeline grouping key ('dia' | 'semana' | 'mes' | 'ano') for a given periodicity. */
export function getGroupingForPeriodicity(periodicity) {
  switch ((periodicity || EventAggregation.MONTHLY).toLowerCase()) {
    case EventAggregation.DAILY:    return 'dia';
    case EventAggregation.BIWEEKLY: return 'semana';
    case EventAggregation.ANNUAL:   return 'ano';
    default:                        return 'mes';
  }
}

/** Returns a human-readable label for a given periodicity. */
export function getPeriodicityLabel(periodicity) {
  switch ((periodicity || EventAggregation.MONTHLY).toLowerCase()) {
    case EventAggregation.DAILY:      return 'Daily';
    case EventAggregation.BIWEEKLY:   return 'Biweekly';
    case EventAggregation.MONTHLY:    return 'Monthly';
    case EventAggregation.BIMONTHLY:  return 'Bimonthly';
    case EventAggregation.SEMIANNUAL: return 'Semiannual';
    case EventAggregation.ANNUAL:     return 'Yearly';
    default:                          return 'Monthly';
  }
}

/** Returns true if the event belongs to this loan timeline. */
function isEventForTimeline(ev, timeline) {
  if (!timeline?.id) return true;
  return ev.timelineId === timeline.id || ev.timelineOriginId === timeline.id;
}

/** Returns true if the event is a LOAN_INSTALLMENT. */
function isLoanInstallment(ev) {
  return ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
    ev.eventType === EventType.LOAN_INSTALLMENT;
}

/** Returns true if the event is an abated (amortized) installment. */
function isAbated(ev) {
  return ev.status === EventStatus.AMORTIZED || Boolean(ev.isAbatida);
}

/** Returns the principal portion of an installment event. */
function getPrincipal(ev) {
  if (ev.principalAmount !== undefined) return Number(ev.principalAmount);
  const amt = Number(ev.amount || 0);
  if (ev.interestPortion !== undefined) return Math.max(0, amt - Number(ev.interestPortion));
  return Math.round(amt * 0.82 * 100) / 100;
}

/** Computes the due date for installment k (1-indexed) given the base date and periodicity. */
function computeDueDate(baseDate, k, periodicity, preferredDueDay) {
  switch (periodicity.toLowerCase()) {
    case EventAggregation.DAILY:
      return addDays(baseDate, k - 1);
    case EventAggregation.BIWEEKLY:
      return addWeeks(baseDate, (k - 1) * 2);
    case EventAggregation.ANNUAL:
      return addYears(baseDate, k - 1);
    default: {
      const d = addMonths(baseDate, k - 1);
      const daysInMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      return new Date(d.getFullYear(), d.getMonth(), Math.min(preferredDueDay, daysInMonth));
    }
  }
}

// ---------------------------------------------------------------------------
// Schedule Generation
// ---------------------------------------------------------------------------

/**
 * Generate the full amortization schedule (constant installment — French system).
 *
 * @param {object} params
 * @param {number} params.totalAmountFinanced  - Capital financed (PV)
 * @param {number} [params.totalDebt]          - Alias for totalAmountFinanced
 * @param {number} [params.monthlyInstallment] - Override PMT (0 = auto-calculate)
 * @param {number} params.numberOfInstallments - Number of installments (n)
 * @param {number} [params.totalInstallments]  - Alias for numberOfInstallments
 * @param {number} [params.tanRate=0]          - Annual nominal rate (%)
 * @param {number} [params.spread=0]           - Spread to add to TAN (%)
 * @param {number} [params.interestStampTaxRate=0] - Fixed stamp tax per installment (€)
 * @param {string} params.startDate            - ISO start date
 * @param {string} [params.debtStartDate]      - Alias for startDate
 * @param {number} [params.dueDay]             - Preferred day of month for due date
 * @param {string} [params.periodicity]        - EventAggregation value
 * @returns {Array} Installment event objects
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
  const pv = Number(totalAmountFinanced ?? totalDebt ?? 0);
  const n  = parseInt(numberOfInstallments ?? totalInstallments ?? 1, 10) || 1;
  const pLower = (periodicity || EventAggregation.MONTHLY).toLowerCase();

  const tan = Number(tanRate || 0) + Number(spread || 0);
  const i   = (tan / 100) / periodsPerYear(pLower);

  // PMT — French constant installment formula
  let pmt = Number(monthlyInstallment || 0);
  if (pmt <= 0 && pv > 0 && n > 0) {
    pmt = i > 0
      ? (pv * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1)
      : pv / n;
  }
  pmt = Math.round(pmt * 100) / 100;

  const stampTax = Number(interestStampTaxRate || 0);
  const baseDate = parseISO(debtStartDate || startDate);
  const preferredDueDay = (dueDay != null && !isNaN(dueDay))
    ? parseInt(dueDay, 10)
    : baseDate.getDate();

  // Negative amortization guard
  const firstInterest = Math.round(pv * i * 100) / 100;
  if (pmt > 0 && pmt <= firstInterest) {
    throw new Error(
      'Os parâmetros fornecidos não permitem amortizar o capital. Verifique a TAN, prazo ou periodicidade.'
    );
  }

  const events = [];
  let balance = pv;

  for (let k = 1; k <= n; k++) {
    const interest  = Math.round(balance * i * 100) / 100;
    let   capital   = Math.round((pmt - interest) * 100) / 100;

    // Last installment: pay remaining balance
    if (k === n || balance <= capital) capital = balance;

    const totalPayment = Math.round((capital + interest + stampTax) * 100) / 100;
    balance = Math.max(0, Math.round((balance - capital) * 100) / 100);

    const dueDate = computeDueDate(baseDate, k, pLower, preferredDueDay);

    events.push({
      id: generateUUID(),
      date: format(dueDate, 'yyyy-MM-dd'),
      time: '09:00',
      title: `Installment #${k} of ${n}`,
      description: `${formatCurrency(capital)} capital + ${formatCurrency(interest)} interest + ${formatCurrency(stampTax)} stamp tax`,
      category: LoanEventCategory.LOAN_INSTALLMENT,
      eventType: EventType.LOAN_INSTALLMENT,
      status: EventStatus.PENDING,
      priority: EventPriority.NORMAL,
      amount: totalPayment,
      principalAmount: capital,
      interestPortion: interest,
      taxAmount: stampTax,
      balanceAfter: balance,
      installmentNumber: k,
      totalInstallments: n,
      isSystemLoanEvent: true,
      isCompleted: false
    });

    if (balance <= 0) break;
  }

  return events;
}

// ---------------------------------------------------------------------------
// In-memory Amortization Application
// ---------------------------------------------------------------------------

/**
 * Apply all extraordinary amortization events in memory, adjusting future installments.
 * REDUCE_TERM:        abates installments from the last one backward.
 * REDUCE_INSTALLMENT: proportionally reduces all future installment amounts.
 *
 * @private
 */
function applyAmortizationsInMemory(timeline, eventsList) {
  const amortEvents = eventsList
    .filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return false;
      if (timeline?.id && ev.timelineId && !isEventForTimeline(ev, timeline)) return false;
      const isAmort =
        ev.category === AmortizationEventCategory.REDUCE_TERM ||
        ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
        ev.eventType === EventType.AMORTIZATION ||
        ev.isAmortization;
      return isAmort && isPositiveStatus(ev.status);
    })
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  if (amortEvents.length === 0) return eventsList;

  let currentEvents = [...eventsList];

  for (const amortEv of amortEvents) {
    const amortVal  = Number(amortEv.amount || amortEv.amortizationAmount || 0);
    if (isNaN(amortVal) || amortVal <= 0) continue;

    const amortDate = amortEv.date || '1900-01-01';
    const category  = amortEv.category || amortEv.strategy || AmortizationEventCategory.REDUCE_TERM;
    const isReduceInstallment = category === AmortizationEventCategory.REDUCE_INSTALLMENT;

    const isOpenInstallment = (ev) =>
      isLoanInstallment(ev) &&
      isEventForTimeline(ev, timeline) &&
      !isPositiveStatus(ev.status) &&
      ev.status !== EventStatus.AMORTIZED &&
      !ev.isAbatida;

    if (isReduceInstallment) {
      // --- REDUCE_INSTALLMENT: proportionally scale down future installments ---
      const future = currentEvents.filter((ev) => isOpenInstallment(ev) && ev.date >= amortDate);
      if (future.length === 0) continue;

      const totalPrincipalBefore = future.reduce((sum, ev) => sum + getPrincipal(ev), 0);
      if (totalPrincipalBefore <= 0) continue;

      const ratio = Math.max(0, (totalPrincipalBefore - amortVal)) / totalPrincipalBefore;

      currentEvents = currentEvents.map((ev) => {
        if (!isOpenInstallment(ev) || ev.date < amortDate) return ev;
        const cap = Math.round(getPrincipal(ev) * ratio * 100) / 100;
        const jur = Math.round(Number(ev.interestPortion || 0) * ratio * 100) / 100;
        return {
          ...ev,
          originalAmount: ev.originalAmount ?? ev.amount,
          amount: Math.round((cap + jur) * 100) / 100,
          principalAmount: cap,
          interestPortion: jur
        };
      });
    } else {
      // --- REDUCE_TERM: abate installments from last to first ---
      const future = currentEvents
        .filter(isOpenInstallment)
        .sort((a, b) => {
          const na = Number(a.installmentNumber || 0);
          const nb = Number(b.installmentNumber || 0);
          return (na && nb) ? nb - na : (b.date || '').localeCompare(a.date || '');
        });

      let remaining = amortVal;
      const patch = new Map();

      for (const inst of future) {
        if (remaining <= 0) break;
        const principal = getPrincipal(inst);
        if (principal <= 0) continue;

        if (remaining >= principal) {
          patch.set(inst.id, {
            status: EventStatus.AMORTIZED,
            isAbatida: true,
            isCompleted: true,
            originalAmount: inst.originalAmount ?? inst.amount,
            originalPrincipal: inst.originalPrincipal ?? principal,
            amount: 0,
            principalAmount: 0,
            interestPortion: 0
          });
          remaining -= principal;
        } else {
          const newCap = Math.max(0, Math.round((principal - remaining) * 100) / 100);
          const origJur = Number(inst.interestPortion || 0);
          patch.set(inst.id, {
            amount: Math.round((newCap + origJur) * 100) / 100,
            principalAmount: newCap
          });
          remaining = 0;
        }
      }

      currentEvents = currentEvents.map((ev) =>
        patch.has(ev.id) ? { ...ev, ...patch.get(ev.id) } : ev
      );
    }
  }

  return currentEvents;
}

// ---------------------------------------------------------------------------
// Loan State Recalculation
// ---------------------------------------------------------------------------

/**
 * Applies in-memory amortizations and recalculates balances + statuses for
 * every installment in the timeline.
 *
 * @param {object} timeline   - The loan timeline object
 * @param {Array}  eventsList - All events (may include other timelines)
 * @returns {Array} Updated event list
 */
export function recalculateLoanState(timeline, eventsList) {
  const today = parseISO(todayISO());
  const prepared = applyAmortizationsInMemory(timeline, eventsList);

  const sorted = [...prepared].sort((a, b) => {
    if (a.date === b.date) return (a.installmentNumber || 0) - (b.installmentNumber || 0);
    return a.date.localeCompare(b.date);
  });

  let runningBalance = Number(
    timeline?.loanContract?.originalCapital ||
    timeline?.originalCapital ||
    timeline?.totalDebt ||
    0
  );

  return sorted.map((ev) => {
    if (!isLoanInstallment(ev)) return ev;

    if (isAbated(ev)) {
      return {
        ...ev,
        status: EventStatus.AMORTIZED,
        isAbatida: true,
        isCompleted: true,
        amount: 0,
        principalAmount: 0,
        interestPortion: 0,
        balanceAfter: runningBalance
      };
    }

    const principal      = getPrincipal(ev);
    const totalAmount    = Number(ev.amount || 0);
    const interestPortion = ev.interestPortion !== undefined
      ? Number(ev.interestPortion)
      : Math.max(0, totalAmount - principal);

    const isPaid = isPositiveStatus(ev.status);
    let status = isPaid ? ev.status : EventStatus.PENDING;
    try {
      if (!isPaid && isBefore(parseISO(ev.date), today)) status = EventStatus.OVERDUE;
    } catch (_) { /* invalid date — skip */ }

    runningBalance = Math.max(0, Math.round((runningBalance - principal) * 100) / 100);

    return {
      ...ev,
      amount: totalAmount,
      principalAmount: principal,
      interestPortion,
      status,
      isCompleted: isPaid,
      balanceAfter: runningBalance
    };
  });
}

// ---------------------------------------------------------------------------
// Installment Propagation
// ---------------------------------------------------------------------------

/**
 * Updates a target installment and propagates the same amount to all subsequent
 * open installments.
 *
 * @param {Array}  eventsList    - Current event list
 * @param {string} targetEventId - ID of the installment to update
 * @param {number} newTotalAmount
 * @param {number|null} newPrincipal - If null, computed from newTotalAmount (82%)
 * @param {number|null} newInterest  - If null, computed as remainder
 * @returns {Array}
 */
export function propagateInstallmentAmountForward(eventsList, targetEventId, newTotalAmount, newPrincipal = null, newInterest = null) {
  const total = Number(newTotalAmount);
  const computePrincipal = () => newPrincipal !== null ? Number(newPrincipal) : Math.round(total * 0.82 * 100) / 100;
  const computeInterest  = (p) => newInterest !== null ? Number(newInterest) : Math.round((total - p) * 100) / 100;

  let targetFound = false;

  return eventsList.map((ev) => {
    if (ev.id === targetEventId) {
      targetFound = true;
      const p = computePrincipal();
      return { ...ev, amount: total, principalAmount: p, interestPortion: computeInterest(p) };
    }
    if (targetFound && isLoanInstallment(ev) && !isPositiveStatus(ev.status)) {
      const p = computePrincipal();
      return { ...ev, amount: total, principalAmount: p, interestPortion: computeInterest(p) };
    }
    return ev;
  });
}

// ---------------------------------------------------------------------------
// Extraordinary Amortization Event Builder
// ---------------------------------------------------------------------------

/**
 * Builds and appends an extraordinary amortization event to the list.
 * No-op if existingAmortEvent is provided (already recorded).
 */
export function applyExtraordinaryAmortization({ eventsList, existingAmortEvent, amortizationAmount, amortizationDateStr, strategy, notes }) {
  if (existingAmortEvent) return eventsList;
  const amount = Number(amortizationAmount || 0);
  const ev = {
    id: generateUUID(),
    date: amortizationDateStr,
    time: '12:00',
    title: `Extraordinary Amortization: ${formatCurrency(amount)}`,
    description: notes || 'Extraordinary amortization record',
    category: LoanEventCategory.AMORTIZATION,
    eventType: EventType.AMORTIZATION,
    status: EventStatus.AMORTIZED,
    priority: EventPriority.HIGH,
    amount,
    amortizationAmount: amount,
    strategy,
    isCompleted: true
  };
  return eventsList.some((e) => e.id === ev.id) ? eventsList : [...eventsList, ev];
}

// ---------------------------------------------------------------------------
// Loan Metrics
// ---------------------------------------------------------------------------

/**
 * Calculate summary metrics for a single loan timeline header.
 *
 * originalCapital priority:
 *   timeline.loanContract.originalCapital  (contract row — Total Amount Financed)
 *   > timeline.originalCapital
 *   > timeline.totalDebt
 *   > sum of installment principal amounts
 *
 * remaining_debt = sum of amounts of all open (non-paid, non-abated) installments.
 *
 * @param {object} timeline   - Loan timeline (may include a .loanContract sub-object)
 * @param {Array}  eventsList - All events already processed by recalculateLoanState
 * @returns {object} Metrics object consumed by LoanTimelineHeader
 */
export function getLoanMetrics(timeline, eventsList = []) {
  const today = todayISO();

  // --- Original capital ---
  const originalCapital = Number(
    timeline?.loanContract?.originalCapital ||
    timeline?.loanContract?.original_capital ||
    timeline?.originalCapital ||
    timeline?.original_capital ||
    timeline?.totalDebt ||
    0
  ) || (eventsList || []).reduce((acc, ev) => {
    if (!isLoanInstallment(ev)) return acc;
    return acc + getPrincipal(ev);
  }, 0);

  // --- Per-installment aggregations ---
  let principalPaid      = 0;
  let interestPaid       = 0;
  let lateInterestPaid   = 0;
  let paidCount          = 0;
  let overdueCount       = 0;
  let totalCount         = 0;
  let nextInstallment    = null;

  for (const ev of eventsList) {
    if (!isLoanInstallment(ev)) continue;
    totalCount++;

    const principal   = getPrincipal(ev);
    const interest    = Number(ev.interestPortion || 0);
    const lateInterest = Number(ev.interestAmount || 0);
    const amount      = Number(ev.amount || 0);
    const abated      = isAbated(ev);
    const paid        = isPositiveStatus(ev.status);

    if (abated) {
      // Abated installments: use stored original principal (paid via amortization)
      const abatedPrincipal = Number(ev.originalPrincipal ?? (ev.principalAmount > 0 ? ev.principalAmount : getPrincipal({ ...ev, amount: Number(ev.originalAmount || amount) })));
      principalPaid += abatedPrincipal;
      paidCount++;
    } else if (paid) {
      principalPaid    += principal;
      interestPaid     += interest;
      lateInterestPaid += lateInterest;
      paidCount++;
    } else {
      // Open installment
      if (ev.status === EventStatus.OVERDUE || ev.date < today) overdueCount++;
      if (!nextInstallment || ev.date < nextInstallment.date) nextInstallment = ev;
    }
  }

  // --- Remaining debt = sum of principal only of open (non-paid, non-abated) installments ---
  // Does NOT include interest or stamp tax — pure outstanding capital
  const remainingDebt = Math.max(0, eventsList.reduce((acc, ev) => {
    if (!isLoanInstallment(ev) || isAbated(ev) || isPositiveStatus(ev.status)) return acc;
    return acc + getPrincipal(ev);
  }, 0));

  // --- Future interest = sum of interestPortion of open installments ---
  const futureInterest = Math.max(0, eventsList.reduce((acc, ev) => {
    if (!isLoanInstallment(ev) || isAbated(ev) || isPositiveStatus(ev.status)) return acc;
    return acc + Number(ev.interestPortion || 0);
  }, 0));

  // --- Total loan cost = what the user actually pays in total ---
  //
  //   PAID installments  → ev.amount (capital + interest + tax effectively paid)
  //   ABATED installments → 0  (those installments were eliminated; the principal
  //                             was covered by the extraordinary amortization event,
  //                             and the interest of those installments is SAVED)
  //   AMORTIZATION events → ev.amount  (the lump sum the user paid upfront)
  //   OPEN installments   → ev.amount  (scheduled, already adjusted post-amortization)
  //
  // Result: abating installments reduces the total cost by the interest component
  // of those cancelled installments (the "interest saved").
  const totalLoanCost = Math.round(eventsList.reduce((acc, ev) => {
    // Extraordinary amortization payments count at face value
    if (ev.eventType === EventType.AMORTIZATION || ev.category === LoanEventCategory.AMORTIZATION) {
      if (isPositiveStatus(ev.status) || ev.isCompleted) return acc + Number(ev.amount || 0);
      return acc;
    }
    if (!isLoanInstallment(ev)) return acc;
    if (isAbated(ev)) return acc; // interest saved — not counted
    if (isPositiveStatus(ev.status)) return acc + Number(ev.amount || 0) + Number(ev.interestAmount || 0);
    return acc + Number(ev.amount || 0); // open: already reduced by amortization
  }, 0) * 100) / 100;

  const totalInterestPaid = interestPaid + lateInterestPaid;
  const progressPercent = originalCapital > 0
    ? Math.min(100, Math.round((principalPaid / originalCapital) * 100))
    : 0;

  let loanStatus = EventStatus.PLANNED;
  if (remainingDebt <= 0 || (totalCount > 0 && paidCount >= totalCount)) {
    loanStatus = EventStatus.SETTLED;
  } else if (overdueCount > 0) {
    loanStatus = EventStatus.OVERDUE;
  }

  // --- Last active installment (for payoff date) ---
  const openInstallments = eventsList
    .filter((ev) => isLoanInstallment(ev) && !isPositiveStatus(ev.status))
    .sort((a, b) => a.date.localeCompare(b.date));

  const lastActiveInstallment = openInstallments.length > 0
    ? openInstallments[openInstallments.length - 1]
    : (eventsList
        .filter(isLoanInstallment)
        .sort((a, b) => a.date.localeCompare(b.date))
        .at(-1) ?? null);

  const estimatedPayoffDate = lastActiveInstallment?.date ?? timeline?.endDate ?? null;
  const nextDueDate = nextInstallment?.date ?? null;

  const currentInstallmentAmount =
    Number(timeline?.installmentAmount || 0) ||
    Number(nextInstallment?.amount || 0) ||
    Number(eventsList.find(isLoanInstallment)?.amount || 0);

  return {
    // Capital
    originalCapital,

    // Debt
    remainingDebt,
    remainingBalance: remainingDebt,

    // Amortized
    principalPaid,
    amortizedCapital: principalPaid,

    // Paid totals
    totalPaid: principalPaid + totalInterestPaid,
    interestPaid,
    lateInterestPaid,
    totalInterestPaid,

    // Loan cost
    totalLoanCost,

    // Future
    futureCapital: remainingDebt,
    futureInterest,
    futureTotal: remainingDebt + futureInterest,

    // Installment counts
    paidInstallments: paidCount,
    overdueInstallments: overdueCount,
    totalInstallments: totalCount,
    remainingInstallments: Math.max(0, totalCount - paidCount),

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
// Consolidated Metrics (across multiple loan timelines)
// ---------------------------------------------------------------------------

/**
 * Aggregate metrics across all (or a subset of) loan timelines.
 *
 * @param {Array}      timelines   - All timelines
 * @param {Array|null} selectedIds - Restrict to these timeline IDs (null = all loans)
 * @returns {object}
 */
export function getConsolidatedLoanMetrics(timelines, selectedIds = null) {
  const loans = (timelines || []).filter(
    (tl) => (tl.type === TimelineType.LOAN || (tl.type || '').toLowerCase().includes('loan')) &&
            (!selectedIds || selectedIds.includes(tl.id))
  );

  let totalContractedDebt  = 0;
  let totalRemainingDebt   = 0;
  let totalPaid            = 0;
  let totalPrincipalPaid   = 0;
  let totalInterestPaid    = 0;
  let totalInstallments    = 0;
  let paidInstallments     = 0;
  let overdueInstallments  = 0;

  for (const tl of loans) {
    const m = getLoanMetrics(tl, tl.events || []);
    totalContractedDebt  += m.originalCapital;
    totalRemainingDebt   += m.remainingDebt;
    totalPaid            += m.totalPaid;
    totalPrincipalPaid   += m.principalPaid;
    totalInterestPaid    += m.totalInterestPaid;
    totalInstallments    += m.totalInstallments;
    paidInstallments     += m.paidInstallments;
    overdueInstallments  += m.overdueInstallments;
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
    progressPercent: totalContractedDebt > 0
      ? Math.min(100, Math.round((totalPrincipalPaid / totalContractedDebt) * 100))
      : 0
  };
}

/**
 * Consolidated loan metrics at a specific horizon month (e.g. for balance projections).
 *
 * @param {Array}       timelines          - All timelines
 * @param {string|null} targetHorizonMonth - 'yyyy-MM' cutoff (null = no cutoff)
 * @param {Array|null}  selectedIds        - Restrict to these IDs
 * @returns {{ totalContractedDebt, totalPrincipalPaid, totalRemainingDebt }}
 */
export function getConsolidatedLoanMetricsAtHorizon(timelines, targetHorizonMonth = null, selectedIds = null) {
  const loans = (timelines || []).filter(
    (tl) => (tl.type === TimelineType.LOAN || (tl.type || '').toLowerCase().includes('loan')) &&
            (!selectedIds || selectedIds.includes(tl.id))
  );

  let totalContractedDebt = 0;
  let totalPrincipalPaid  = 0;
  let totalRemainingDebt  = 0;

  for (const tl of loans) {
    const { originalCapital } = getLoanMetrics(tl, tl.events || []);
    totalContractedDebt += originalCapital;

    let paidForLoan = 0;
    for (const ev of tl.events || []) {
      if (!ev?.date) continue;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) continue;
      if (targetHorizonMonth && ev.date.substring(0, 7) > targetHorizonMonth) continue;
      if (!isLoanInstallment(ev)) continue;
      paidForLoan += getPrincipal(ev);
    }

    const capped = Math.min(originalCapital, paidForLoan);
    totalPrincipalPaid += capped;
    totalRemainingDebt += Math.max(0, originalCapital - capped);
  }

  return { totalContractedDebt, totalPrincipalPaid, totalRemainingDebt };
}
