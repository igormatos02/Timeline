import {
  EventStatus,
  EventType,
  TimelineStatus,
  LoanEventCategory,
  AmortizationEventCategory,
  AmortizationStrategy,
  isPositiveStatus,
  isCancelledStatus
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
      loanTimeline.status === TimelineStatus.INACTIVE;

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
      Math.round((totalCapitalPaidFromEvents + totalExtraordinaryAmortized) * 100) / 100
    );

    const remainingDebt = Math.max(
      0,
      Math.round((totalDebt - amortizedCapital) * 100) / 100
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
     * Interest / fee / payment aggregations.
     */
    let paidCapital = 0;
    let paidInterest = 0;
    let paidFee = 0;
    let futureCapital = 0;
    let futureInterest = 0;
    let futureFee = 0;
    let paidInstallmentsCount = 0;
    let nextDueDate = null;

    const totalInstallmentsCount =
      Number(loanContract?.totalInstallments || 0) ||
      Number(loanTimeline?.totalInstallments || 0) ||
      sortedEvents.length;

    // Apply extraordinary amortizations in-memory to calculate exact future schedule based on strategy
    let processedEvents = sortedEvents.map((ev) => ({ ...ev }));
    if (amortizationEvents.length > 0) {
      for (const amortEv of amortizationEvents) {
        const isPaid = isPositiveStatus(amortEv.status) || amortEv.isCompleted;
        if (!isPaid) continue;

        const amortVal = Number(
          amortEv.amortizationAmount ??
          amortEv.installmentAmount ??
          amortEv.amount ??
          0
        );
        if (isNaN(amortVal) || amortVal <= 0) continue;

        const strategy =
          amortEv.strategy ||
          amortEv.amortizationStrategy ||
          amortEv.category ||
          AmortizationStrategy.REDUCE_TERM;

        const isReduceInstallment =
          strategy === AmortizationStrategy.REDUCE_INSTALLMENT ||
          strategy === AmortizationEventCategory.REDUCE_INSTALLMENT;

        const openList = processedEvents.filter(
          (ev) => !isPositiveStatus(ev.status) && !ev.isCompleted && !ev.isAbated
        );

        if (isReduceInstallment) {
          processedEvents = this.#applyAmortizationReduceInstallment(
            processedEvents,
            amortEv,
            amortVal,
            loanContract,
            loanTimeline
          );
        } else {
          processedEvents = this.#applyAmortizationReduceTerm(
            processedEvents,
            openList,
            amortVal
          );
        }
      }
    }

    for (const ev of processedEvents) {
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

      const isAbat =
        ev.status === EventStatus.ABATED ||
        ev.isAbated;

      if (isPaid && !isAbat) {
        paidCapital += capital;
        paidInterest += interest;
        paidFee += fee;
        paidInstallmentsCount++;
      } else if (!isPaid && !isAbat) {
        futureCapital += capital;
        futureInterest += interest;
        futureFee += fee;

        if (!nextDueDate && ev.date) {
          nextDueDate = ev.date;
        }
      }
    }

    const futureInterestAdjusted = Math.max(
      0,
      Math.round(futureInterest * 100) / 100
    );

    const futureFeeAdjusted = Math.max(
      0,
      Math.round(futureFee * 100) / 100
    );

    const totalEstimatedInterestAdjusted = Math.max(
      0,
      Math.round((paidInterest + futureInterestAdjusted) * 100) / 100
    );
    const totalEstimatedFeeAdjusted = Math.max(
      0,
      Math.round((paidFee + futureFeeAdjusted) * 100) / 100
    );

    /**
     * Total cost of the loan.
     *
     * Original capital + estimated interest + estimated fees.
     */
    const totalLoanCost =
      totalDebt + totalEstimatedInterestAdjusted + totalEstimatedFeeAdjusted;

    const paidTotal =
      amortizedCapital + paidInterest + paidFee;

    /**
     * Future capital matches calculated remaining debt.
     */
    const normalizedFutureCapital =
      remainingDebt;

    const futureTotal =
      normalizedFutureCapital + futureInterestAdjusted + futureFeeAdjusted;

    const remainingInstallmentsCount =
      Math.max(
        0,
        totalInstallmentsCount -
        paidInstallmentsCount
      );

    const lastActiveInstallment =
      processedEvents
        .filter(
          (ev) => !isPositiveStatus(ev.status) && !ev.isCompleted && !ev.isAbated
        )
        .pop() ||
      processedEvents[processedEvents.length - 1];

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
        Math.round(totalEstimatedInterestAdjusted * 100) / 100,

      totalEstimatedFee:
        Math.round(totalEstimatedFeeAdjusted * 100) / 100,

      totalLoanCost:
        Math.round(totalLoanCost * 100) / 100,

      paidInterest:
        Math.round(paidInterest * 100) / 100,

      totalInterestPaid:
        Math.round(paidInterest * 100) / 100,

      paidFee:
        Math.round(paidFee * 100) / 100,

      totalFeePaid:
        Math.round(paidFee * 100) / 100,

      paidTotal:
        Math.round(paidTotal * 100) / 100,

      futureCapital:
        Math.round(normalizedFutureCapital * 100) / 100,

      futureInterest:
        Math.round(futureInterestAdjusted * 100) / 100,

      futureFee:
        Math.round(futureFeeAdjusted * 100) / 100,

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

  /**
   * REDUCE_INSTALLMENT: scale open installments down starting from the amortization date
   * based on the contract amortization system (SAC or Price).
   * Isolated calculation logic.
   */
  #applyAmortizationReduceInstallment(
    processedEvents,
    amortEv,
    amortVal,
    loanContract = null,
    loanTimeline = null
  ) {
    const amortDateStr = (amortEv.date || '1900-01-01').substring(0, 10);
    const subsequentList = processedEvents.filter(
      (ev) =>
        (ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.isSystemLoanEvent) &&
        !isCancelledStatus(ev.status) &&
        (ev.date || '').substring(0, 10) >= amortDateStr
    );
    if (!subsequentList || subsequentList.length === 0) return processedEvents;

    const totalOpenCapital = subsequentList.reduce(
      (sum, ev) => sum + Number(ev.originalInstallmentCapital ?? ev.installmentCapital ?? 0),
      0
    );
    if (totalOpenCapital <= 0) return processedEvents;

    const newPrincipal = Math.max(0, Math.round((totalOpenCapital - amortVal) * 100) / 100);
    const n = subsequentList.length;

    const isSac = (
      loanContract?.system ||
      loanContract?.amortizationSystem ||
      loanTimeline?.system ||
      loanTimeline?.amortizationSystem ||
      ''
    ).toLowerCase() === 'sac';

    let monthlyRate = 0;
    const tan =
      Number(loanTimeline?.tanRate || 0) + Number(loanTimeline?.spread || 0) ||
      Number(
        loanContract?.annualInterestRate ||
        loanContract?.tanRate ||
        loanTimeline?.annualInterestRate ||
        0
      );

    if (tan > 0) {
      monthlyRate = (tan / 100) / 12;
    } else if (totalOpenCapital > 0 && subsequentList[0]) {
      const firstInt = Number(
        subsequentList[0].originalInstallmentInterest ??
        subsequentList[0].installmentInterest ??
        0
      );
      if (firstInt > 0) monthlyRate = firstInt / totalOpenCapital;
    }

    let pmt = 0;
    const sacCapital = n > 0 ? Math.round((newPrincipal / n) * 100) / 100 : 0;

    if (!isSac) {
      if (newPrincipal > 0 && n > 0) {
        if (monthlyRate > 0) {
          const compound = Math.pow(1 + monthlyRate, n);
          pmt = (newPrincipal * (monthlyRate * compound)) / (compound - 1);
        } else {
          pmt = newPrincipal / n;
        }
      }
      pmt = Math.round(pmt * 100) / 100;
    }

    let runningBalance = newPrincipal;
    const patch = new Map();

    for (let k = 0; k < subsequentList.length; k++) {
      const ev = subsequentList[k];
      const isLast = k === subsequentList.length - 1;

      const origCap = Number(ev.originalInstallmentCapital ?? ev.installmentCapital ?? 0);
      const origInt = Number(ev.originalInstallmentInterest ?? ev.installmentInterest ?? 0);
      const origFee = Number(ev.originalInstallmentFee ?? ev.installmentFee ?? 0);
      const origTotal = Number(ev.originalInstallmentAmount ?? ev.installmentAmount ?? ev.amount ?? 0);

      let interest = Math.round(runningBalance * monthlyRate * 100) / 100;
      let capital = isSac ? sacCapital : Math.round((pmt - interest) * 100) / 100;

      if (isLast || runningBalance <= capital) {
        capital = runningBalance;
      }

      runningBalance = Math.max(0, Math.round((runningBalance - capital) * 100) / 100);

      const fee = origFee;
      const amount = Math.round((capital + interest + fee) * 100) / 100;
      const isZero = newPrincipal === 0 || (capital === 0 && interest === 0 && amount === 0);

      patch.set(ev.id, {
        originalInstallmentAmount: origTotal,
        originalInstallmentCapital: origCap,
        originalInstallmentInterest: origInt,
        originalInstallmentFee: origFee,
        installmentCapital: capital,
        installmentInterest: interest,
        installmentFee: fee,
        installmentAmount: amount,
        status: isZero ? EventStatus.ABATED : ev.status,
        isAbated: isZero ? true : Boolean(ev.isAbated),
        isCompleted: isZero ? true : Boolean(ev.isCompleted)
      });
    }

    return processedEvents.map((ev) =>
      patch.has(ev.id) ? { ...ev, ...patch.get(ev.id) } : ev
    );
  }

  /**
   * REDUCE_TERM: abate open installments from end backwards.
   * Isolated calculation logic.
   */
  #applyAmortizationReduceTerm(processedEvents, openList, amortVal) {
    if (!openList || openList.length === 0) return processedEvents;

    const sortedOpen = [...openList].sort((a, b) => {
      const numA = Number(a.installmentNumber || 0);
      const numB = Number(b.installmentNumber || 0);
      if (numA && numB) return numB - numA;
      return (b.date || '').localeCompare(a.date || '');
    });

    let remaining = amortVal;
    const patch = new Map();

    for (const inst of sortedOpen) {
      if (remaining <= 0) break;
      const cap = Number(inst.installmentCapital || 0);
      if (cap <= 0) continue;

      if (remaining >= cap) {
        patch.set(inst.id, {
          installmentCapital: 0,
          installmentInterest: 0,
          installmentFee: 0,
          installmentAmount: 0,
          status: EventStatus.ABATED,
          isAbated: true,
          isCompleted: true
        });
        remaining -= cap;
      } else {
        const newCap = Math.max(0, Math.round((cap - remaining) * 100) / 100);
        const int = Number(inst.installmentInterest || 0);
        const fee = Number(inst.installmentFee || 0);
        patch.set(inst.id, {
          installmentCapital: newCap,
          installmentAmount: Math.round((newCap + int + fee) * 100) / 100
        });
        remaining = 0;
      }
    }

    return processedEvents.map((ev) =>
      patch.has(ev.id) ? { ...ev, ...patch.get(ev.id) } : ev
    );
  }
}

export const loanDomainService =
  new LoanDomainService();