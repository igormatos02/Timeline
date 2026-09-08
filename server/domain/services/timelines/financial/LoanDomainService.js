import {
  EventStatus,
  EventType,
  TimelineStatus,
  LoanEventCategory,
  AmortizationEventCategory,
  isPositiveStatus
} from '../../../../../shared/enums/index.js';

/**
 * Domain Service: LoanDomainService
 *
 * Uses only the loan installment properties defined by the domain entity:
 * - installmentAmount
 * - installmentCapital
 * - installmentInterest
 * - installmentFee
 */
export class LoanDomainService {
  /**
   * Filter events belonging to loans.
   */
  filterEvents(events = [], timelineId = null) {
    return events.filter((ev) => {
      if (!ev || ev.isDeleted) return false;

      if (
        timelineId &&
        (ev.timelineId === timelineId ||
          ev.timelineOriginId === timelineId)
      ) {
        return true;
      }

      return (
        ev.eventType === EventType.AMORTIZATION ||
        ev.eventType === EventType.LOAN_INSTALLMENT ||
        ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
        ev.category === LoanEventCategory.INSTALLMENTS ||
        Boolean(ev.isSystemLoanEvent) ||
        Boolean(ev.isAmortization)
      );
    });
  }

  /**
   * Calculate metrics for a single loan timeline
   * or consolidated active loans.
   */
  calculateMetrics(
    loanTimeline,
    loanEvents = [],
    currentMonthKey = null,
    loanContract = null
  ) {
    const isInactive =
      loanTimeline &&
      (
        loanTimeline.status === TimelineStatus.INACTIVE ||
        loanTimeline.status === 'inactive'
      );

    const activeMonth =
      currentMonthKey ||
      new Date().toISOString().substring(0, 7);

    /**
     * Loan installments for schedule calculations.
     */
    const sortedEvents = [...loanEvents]
      .filter(
        (ev) =>
          ev &&
          !ev.isDeleted &&
          (
            ev.eventType === EventType.LOAN_INSTALLMENT ||
            ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
            ev.category === LoanEventCategory.INSTALLMENTS ||
            Boolean(ev.isSystemLoanEvent)
          )
      )
      .sort((a, b) => {
        const numA = Number(a.installmentNumber || 0);
        const numB = Number(b.installmentNumber || 0);

        if (numA && numB) {
          return numA - numB;
        }

        return (a.date || '').localeCompare(b.date || '');
      });

    /**
     * Extraordinary amortizations.
     */
    const amortizationEvents = [...loanEvents].filter(
      (ev) =>
        ev &&
        !ev.isDeleted &&
        (
          ev.eventType === EventType.AMORTIZATION ||
          ev.category === AmortizationEventCategory.REDUCE_TERM ||
          ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
          Boolean(ev.isAmortization)
        )
    );

    const totalExtraordinaryAmortized = amortizationEvents.reduce((sum, ev) => {
      const isPaid =
        isPositiveStatus(ev.status) ||
        ev.isCompleted;

      if (!isPaid) {
        return sum;
      }

      const val = Number(
        ev.amortizationAmount ??
        ev.installmentAmount ??
        ev.amount ??
        0
      );

      return sum + val;
    }, 0);

    /**
     * Total capital represented by all installments.
     */
    const sumCapitalFromAllEvents = sortedEvents.reduce(
      (sum, ev) =>
        sum + Number(ev.installmentCapital ?? ev.principalAmount ?? 0),
      0
    );

    /**
     * Original financed capital.
     */
    const contractCapital =
      Number(loanContract?.originalCapital || 0);

    const timelineCapital =
      Number(loanTimeline?.totalDebt || 0);

    const totalDebt =
      contractCapital > 0
        ? contractCapital
        : timelineCapital > 0
          ? timelineCapital
          : sumCapitalFromAllEvents;

    /**
     * Capital already paid from regular installments.
     */
    const totalCapitalPaidFromEvents =
      sortedEvents.reduce((sum, ev) => {
        const isPaid =
          isPositiveStatus(ev.status) ||
          ev.isCompleted;

        if (!isPaid) {
          return sum;
        }

        return (
          sum +
          Number(ev.installmentCapital ?? ev.principalAmount ?? 0)
        );
      }, 0);

    /**
     * Total amortized capital includes paid regular installments and extraordinary amortizations.
     */
    const amortizedCapital = Math.max(
      0,
      totalCapitalPaidFromEvents + totalExtraordinaryAmortized
    );

    /**
     * Use remainingDebtAfter when it is available.
     * Otherwise calculate: original capital - amortized capital
     */
    const paidEventsWithRemaining =
      sortedEvents.filter(
        (ev) =>
          (
            isPositiveStatus(ev.status) ||
            ev.isCompleted
          ) &&
          ev.remainingDebtAfter !== undefined &&
          ev.remainingDebtAfter !== null
      );

    const lastPaidEvent =
      paidEventsWithRemaining[
      paidEventsWithRemaining.length - 1
      ];

    let calculatedRemainingDebt =
      totalDebt - amortizedCapital;

    if (
      lastPaidEvent &&
      lastPaidEvent.remainingDebtAfter !== undefined &&
      lastPaidEvent.remainingDebtAfter !== null
    ) {
      calculatedRemainingDebt =
        Number(lastPaidEvent.remainingDebtAfter);
    }

    const remainingDebt = Math.max(
      0,
      Math.min(totalDebt, calculatedRemainingDebt)
    );

    /**
     * Current monthly installment.
     *
     * Only installmentAmount is used.
     */
    const monthlyInstallment =
      Number(
        loanTimeline?.installmentAmount ||
        sortedEvents[0]?.installmentAmount ||
        0
      );

    const progressPercent =
      totalDebt > 0
        ? Math.min(
          100,
          Math.round(
            (amortizedCapital / totalDebt) * 100
          )
        )
        : 0;

    /**
     * Interest / payment aggregations.
     */
    let totalEstimatedInterest = 0;
    let paidCapital = 0;
    let paidInterest = 0;
    let futureCapital = 0;
    let futureInterest = 0;
    let paidInstallmentsCount = 0;
    let nextDueDate = null;

    const totalInstallmentsCount =
      sortedEvents.length ||
      Number(loanContract?.totalInstallments || 0);

    for (const ev of sortedEvents) {
      /**
       * Domain entity fields ONLY.
       */
      const capital =
        Number(ev.installmentCapital || 0);

      const interest =
        Number(ev.installmentInterest || 0);

      const fee =
        Number(ev.installmentFee || 0);

      const isPaid =
        isPositiveStatus(ev.status) ||
        ev.isCompleted;

      /**
       * Estimated total interest includes:
       *
       * installmentInterest
       *
       * and installmentFee only if the fee is considered
       * part of the loan's estimated cost.
       */
      totalEstimatedInterest += interest + fee;

      if (isPaid) {
        paidCapital += capital;
        paidInterest += interest + fee;
        paidInstallmentsCount++;
      } else {
        futureCapital += capital;
        futureInterest += interest + fee;

        if (!nextDueDate && ev.date) {
          nextDueDate = ev.date;
        }
      }
    }

    /**
     * Total cost of the loan.
     *
     * Original capital + estimated interest/fees.
     */
    const totalLoanCost =
      totalDebt + totalEstimatedInterest;

    const paidTotal =
      paidCapital + paidInterest;

    /**
     * Future capital should match the calculated
     * remaining debt.
     */
    const normalizedFutureCapital =
      remainingDebt;

    const futureTotal =
      normalizedFutureCapital + futureInterest;

    const remainingInstallmentsCount =
      Math.max(
        0,
        totalInstallmentsCount -
        paidInstallmentsCount
      );

    const lastActiveInstallment =
      sortedEvents
        .filter(
          (ev) => !isPositiveStatus(ev.status)
        )
        .pop() ||
      sortedEvents[sortedEvents.length - 1];

    const estimatedPayoffDate =
      lastActiveInstallment?.date ||
      loanContract?.endDate ||
      null;

    /**
     * Total paid during the active month.
     *
     * IMPORTANT:
     * installmentAmount is the entity field.
     */
    const monthlyInstallmentsPaid =
      sortedEvents
        .filter(
          (ev) =>
            ev.date &&
            ev.date.startsWith(activeMonth) &&
            !ev.isDeleted &&
            (
              isPositiveStatus(ev.status) ||
              ev.isCompleted
            )
        )
        .reduce(
          (sum, ev) =>
            sum +
            Number(ev.installmentAmount || 0),
          0
        );

    return {
      isActive: !isInactive,

      totalDebt: Math.round(totalDebt * 100) / 100,

      originalCapital:
        Math.round(totalDebt * 100) / 100,

      remainingDebt:
        Math.round(remainingDebt * 100) / 100,

      remainingBalance:
        Math.round(remainingDebt * 100) / 100,

      amortizedCapital:
        Math.round(amortizedCapital * 100) / 100,

      paidCapital:
        Math.round(paidCapital * 100) / 100,

      monthlyInstallment:
        Math.round(monthlyInstallment * 100) / 100,

      monthlyInstallmentsPaid:
        Math.round(monthlyInstallmentsPaid * 100) / 100,

      currentInstallmentAmount:
        Math.round(monthlyInstallment * 100) / 100,

      totalEstimatedInterest:
        Math.round(totalEstimatedInterest * 100) / 100,

      totalLoanCost:
        Math.round(totalLoanCost * 100) / 100,

      paidInterest:
        Math.round(paidInterest * 100) / 100,

      paidTotal:
        Math.round(paidTotal * 100) / 100,

      futureCapital:
        Math.round(normalizedFutureCapital * 100) / 100,

      futureInterest:
        Math.round(futureInterest * 100) / 100,

      futureTotal:
        Math.round(futureTotal * 100) / 100,

      paidInstallments:
        paidInstallmentsCount,

      totalInstallments:
        totalInstallmentsCount,

      remainingInstallments:
        remainingInstallmentsCount,

      estimatedPayoffDate,

      nextDueDate,

      progressPercent,

      amortizedPercent:
        progressPercent
    };
  }
}

export const loanDomainService =
  new LoanDomainService();