import { addDays, addWeeks, addMonths, addYears, format, parseISO, isBefore, isAfter, differenceInDays } from 'date-fns';
import { generateUUID } from './uuid.js';
import {
  EventType,
  EventStatus,
  LoanEventCategory,
  IncomeEventCategory,
  InvestmentEventCategory,
  TimelineType,
  EventPriority,
  EventAggregation,
  isPositiveStatus,
  AmortizationEventCategory
} from '../enums/index.js';

/**
 * Format currency in EUR (€)
 */
export function formatCurrency(amount) {
  if (amount === undefined || amount === null || isNaN(amount)) return '0,00 €';
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR'
  }).format(amount);
}

/**
 * Helper to get default timeline grouping based on loan periodicity
 */
export function getGroupingForPeriodicity(periodicity) {
  const p = (periodicity || EventAggregation.MONTHLY).toLowerCase();
  if (p === EventAggregation.DAILY || p === 'diaria') return 'dia';
  if (p === EventAggregation.BIWEEKLY || p === 'quinzenal') return 'semana';
  if (p === EventAggregation.ANNUAL || p === 'yearly' || p === 'anual') return 'ano';
  return 'mes';
}

/**
 * Helper to get human label for periodicity using EventAggregation
 */
export function getPeriodicityLabel(periodicity) {
  const p = (periodicity || EventAggregation.MONTHLY).toLowerCase();
  switch (p) {
    case EventAggregation.DAILY:
    case 'diaria': return 'Daily';
    case EventAggregation.BIWEEKLY:
    case 'quinzenal': return 'Biweekly';
    case EventAggregation.MONTHLY:
    case 'mensal': return 'Monthly';
    case EventAggregation.BIMONTHLY:
    case 'bimestral': return 'Bimonthly';
    case EventAggregation.SEMIANNUAL:
    case 'semestral': return 'Semiannual';
    case EventAggregation.ANNUAL:
    case 'yearly':
    case 'anual': return 'Yearly';
    default: return 'Monthly';
  }
}

/**
 * Calculate loan amortization schedule (constant installment payments)
 */
export function generateLoanInstallments({
  totalDebt,
  totalAmountFinanced,
  monthlyInstallment,
  totalInstallments,
  numberOfInstallments,
  tanRate = 0,
  spread = 0,
  taxaImpostoSeloJuros = 4,
  interestStampTaxRate,
  taxaImpostoSeloIsPercentage = false,
  startDate,
  debtStartDate,
  dueDay,
  periodicity = EventAggregation.MONTHLY
}) {
  const events = [];

  // 1. Inputs initialization & fallbacks
  const initialCapital = Number(totalAmountFinanced !== undefined ? totalAmountFinanced : (totalDebt || 0));
  const n = parseInt(numberOfInstallments !== undefined ? numberOfInstallments : totalInstallments, 10) || 1;

  // Applicable TAN: TaxaAplicavel = TANRate + Spread (se spread for fornecido separadamente)
  const baseTan = Number(tanRate || 0);
  const spreadVal = Number(spread || 0);
  const applicableTan = baseTan + spreadVal;

  // Stamp tax rate on interest (e.g. 4%)
  const stampTaxRate = Number(interestStampTaxRate !== undefined ? interestStampTaxRate : (taxaImpostoSeloJuros || 0));

  // 2. Date calculation: debtStartDate & dueDay
  const startIso = debtStartDate || startDate;
  const baseDate = parseISO(startIso);
  const preferredDueDay = dueDay !== undefined && dueDay !== null && !isNaN(dueDay) ? parseInt(dueDay, 10) : baseDate.getDate();

  // 3. Periodic interest rate: i = TAN / 12 / 100
  const pLower = (periodicity || EventAggregation.MONTHLY).toLowerCase();
  let periodsPerYear = 12;
  if (pLower === EventAggregation.DAILY || pLower === 'diaria') periodsPerYear = 365;
  else if (pLower === EventAggregation.BIWEEKLY || pLower === 'quinzenal') periodsPerYear = 26;
  else if (pLower === EventAggregation.BIMONTHLY || pLower === 'bimestral') periodsPerYear = 6;
  else if (pLower === EventAggregation.SEMIANNUAL || pLower === 'semestral') periodsPerYear = 2;
  else if (pLower === EventAggregation.ANNUAL || pLower === 'yearly' || pLower === 'anual') periodsPerYear = 1;

  const i = (applicableTan / 100) / periodsPerYear;

  // 4. Calculate monthly constant installment PMT (if not explicitly passed or <= 0)
  let pmt = Number(monthlyInstallment || 0);
  if (pmt <= 0 && initialCapital > 0 && n > 0) {
    if (i > 0) {
      pmt = (initialCapital * (i * Math.pow(1 + i, n))) / (Math.pow(1 + i, n) - 1);
    } else {
      pmt = initialCapital / n;
    }
  }
  pmt = Math.round(pmt * 100) / 100;

  // Initial validation: check if first month's interest exceeds monthly installment (Negative Amortization guard)
  const firstPeriodInterest = Math.round(initialCapital * i * 100) / 100;
  if (pmt > 0 && pmt <= firstPeriodInterest) {
    throw new Error(
      'Os parâmetros fornecidos não permitem amortizar o capital com uma prestação normal. Verifique a TAN, prazo, periodicidade ou regra de cálculo.'
    );
  }

  // 5. Sequential calculation loop
  let currentBalance = initialCapital;

  for (let k = 1; k <= n; k++) {
    // Determine installment date
    let dueDate;
    switch (pLower) {
      case EventAggregation.DAILY:
      case 'diaria': dueDate = addDays(baseDate, k - 1); break;
      case EventAggregation.BIWEEKLY:
      case 'quinzenal': dueDate = addWeeks(baseDate, (k - 1) * 2); break;
      case EventAggregation.ANNUAL:
      case 'yearly':
      case 'anual': dueDate = addYears(baseDate, k - 1); break;
      default: {
        const nextMonthDate = addMonths(baseDate, k - 1);
        const daysInMonth = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1, 0).getDate();
        const targetDay = Math.min(preferredDueDay, daysInMonth);
        dueDate = new Date(nextMonthDate.getFullYear(), nextMonthDate.getMonth(), targetDay);
        break;
      }
    }

    const dueDateStr = format(dueDate, 'yyyy-MM-dd');

    // Juros = SaldoInicial * TaxaMensal (rounded to 2 decimal places)
    let interest = Math.round(currentBalance * i * 100) / 100;

    // Imposto de Selo: valor fixo em Euros por prestação (ex: 4.00 ou 4.94)
    const taxStamp = Number(stampTaxRate) || 0;

    // CapitalAmortizado = Prestacao - Juros
    let capital = Math.round((pmt - interest) * 100) / 100;

    // Last installment or adjustment if capital exceeds current balance
    if (k === n || currentBalance <= capital) {
      capital = currentBalance;
    }

    // TotalPago = Prestacao (Capital + Juros) + ImpostoSelo
    const totalPayment = Math.round((capital + interest + taxStamp) * 100) / 100;

    // SaldoFinal = SaldoInicial - CapitalAmortizado
    const remaining = Math.max(0, Math.round((currentBalance - capital) * 100) / 100);
    currentBalance = remaining;

    events.push({
      id: generateUUID(),
      date: dueDateStr,
      time: '09:00',
      title: `Installment #${k} of ${n}`,
      description: `Contractual installment payment (${formatCurrency(capital)} principal + ${formatCurrency(interest)} interest + ${formatCurrency(taxStamp)} stamp tax).`,
      category: LoanEventCategory.LOAN_INSTALLMENT,
      eventType: EventType.LOAN_INSTALLMENT,
      status: EventStatus.PENDING,
      priority: EventPriority.NORMAL,
      amount: totalPayment,
      installmentAmount: totalPayment,
      installment_amount: totalPayment,
      principalAmount: capital,
      principal_amount: capital,
      installmentCapital: capital,
      installment_capital: capital,
      interestPortion: interest,
      interest_portion: interest,
      installmentInterest: interest,
      installment_interest: interest,
      taxAmount: taxStamp,
      tax_amount: taxStamp,
      installmentFee: taxStamp,
      installment_fee: taxStamp,
      interestAmount: 0,
      balanceAfter: currentBalance,
      balance_after: currentBalance,
      remainingDebtAfter: currentBalance,
      remaining_debt_after: currentBalance,
      installmentNumber: k,
      totalInstallments: n,
      isSystemLoanEvent: true,
      isCompleted: false,
      labels: ['Loan', 'Installment']
    });

    if (currentBalance <= 0) break;
  }

  return events;
}

/**
 * Alias for generateLoanInstallments for backward compatibility
 */
export function generateLoanSchedule(params) {
  return generateLoanInstallments({
    totalDebt: params.totalDebt,
    totalAmountFinanced: params.totalAmountFinanced !== undefined ? params.totalAmountFinanced : params.totalDebt,
    monthlyInstallment: params.monthlyInstallment !== undefined ? params.monthlyInstallment : params.installmentAmount,
    totalInstallments: params.totalInstallments || 120,
    numberOfInstallments: params.numberOfInstallments || params.totalInstallments || 120,
    tanRate: params.tanRate !== undefined ? params.tanRate : (params.tan || 0),
    spread: params.spread || 0,
    taxaImpostoSeloJuros: params.taxaImpostoSeloJuros !== undefined ? params.taxaImpostoSeloJuros : (params.interestStampTaxRate || 4),
    interestStampTaxRate: params.interestStampTaxRate !== undefined ? params.interestStampTaxRate : (params.taxaImpostoSeloJuros || 4),
    startDate: params.startDateStr || params.startDate,
    debtStartDate: params.debtStartDate || params.startDateStr || params.startDate,
    dueDay: params.dueDay,
    periodicity: params.periodicity
  });
}

/**
 * Helper to recalculate installments in-memory based on extraordinary amortizations
 */
function applyAmortizationsInMemory(timeline, eventsList) {
  // Extrair todos os eventos de amortização ativos desta timeline
  const amortEvents = eventsList.filter((ev) => {
    if (!ev || ev.isDeleted || ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return false;
    if (timeline && timeline.id && ev.timelineId && ev.timelineId !== timeline.id && ev.timelineOriginId !== timeline.id) return false;
    const isAmort = ev.category === AmortizationEventCategory.REDUCE_TERM || ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT || ev.eventType === EventType.AMORTIZATION || ev.isAmortization;
    return isAmort && isPositiveStatus(ev.status);
  }).sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  if (amortEvents.length === 0) return eventsList;

  let currentEvents = [...eventsList];

  for (const amortEv of amortEvents) {
    const amortVal = Number(amortEv.amount || amortEv.amortizationAmount || 0);
    if (isNaN(amortVal) || amortVal <= 0) continue;

    const category = amortEv.category || amortEv.strategy || AmortizationEventCategory.REDUCE_TERM;
    const amortDate = amortEv.date || '1900-01-01';

    const isReduceInstallment = category === AmortizationEventCategory.REDUCE_INSTALLMENT || category === 'reduce_installment' || amortEv.strategy === 'reduce_installment';

    if (isReduceInstallment) {
      // Redução no Valor da Parcela (REDUCE_INSTALLMENT)
      const futureUnpaid = currentEvents.filter((ev) => {
        if (timeline && timeline.id && ev.timelineId && ev.timelineId !== timeline.id && ev.timelineOriginId !== timeline.id) return false;
        const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
        return isLoanInst && !isPositiveStatus(ev.status) && ev.date >= amortDate;
      });

      if (futureUnpaid.length > 0) {
        const remainingDebtBefore = futureUnpaid.reduce((acc, ev) => acc + Number(ev.principalAmount || Math.round(Number(ev.amount || 0) * 0.82)), 0);
        const newFuturePrincipal = Math.max(0, remainingDebtBefore - amortVal);
        const ratio = remainingDebtBefore > 0 ? (newFuturePrincipal / remainingDebtBefore) : 1;

        currentEvents = currentEvents.map((ev) => {
          if (timeline && timeline.id && ev.timelineId && ev.timelineId !== timeline.id && ev.timelineOriginId !== timeline.id) return ev;
          const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
          if (isLoanInst && !isPositiveStatus(ev.status) && ev.date >= amortDate) {
            const origCap = Number(ev.principalAmount || Math.round(Number(ev.amount || 0) * 0.82));
            const origJur = Number(ev.interestPortion || Math.round(Number(ev.amount || 0) * 0.18));
            const newCap = Math.round(origCap * ratio * 100) / 100;
            const newJur = Math.round(origJur * ratio * 100) / 100;
            return {
              ...ev,
              amount: Math.round((newCap + newJur) * 100) / 100,
              principalAmount: newCap,
              interestPortion: newJur
            };
          }
          return ev;
        });
      }
    } else {
      // Redução de Prazo (REDUCE_TERM - Abater parcelas a partir da última parcela da timeline inteira)
      const futureUnpaid = currentEvents
        .filter((ev) => {
          if (timeline && timeline.id && ev.timelineId && ev.timelineId !== timeline.id && ev.timelineOriginId !== timeline.id) return false;
          const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
          return isLoanInst && !isPositiveStatus(ev.status) && ev.status !== EventStatus.AMORTIZED && !ev.isAbatida;
        })
        .sort((a, b) => {
          const numA = Number(a.installmentNumber || 0);
          const numB = Number(b.installmentNumber || 0);
          if (numA && numB) return numB - numA;
          return (b.date || '').localeCompare(a.date || '');
        }); // Ordenar do maior número de parcela / última data para o menor número de parcela (decrescente)

      let remainingToDeduct = amortVal;
      const updatesMap = new Map();

      for (let i = 0; i < futureUnpaid.length; i++) {
        if (remainingToDeduct <= 0) break;
        const inst = futureUnpaid[i];
        const instPrincipal = Number(inst.principalAmount !== undefined ? inst.principalAmount : Math.round(Number(inst.amount || 0) * 0.82 * 100) / 100);

        if (remainingToDeduct >= instPrincipal && instPrincipal > 0) {
          updatesMap.set(inst.id, {
            status: EventStatus.AMORTIZED,
            isAbatida: true,
            isCompleted: true,
            originalAmount: inst.amount || instPrincipal,
            amount: 0,
            principalAmount: 0,
            interestPortion: 0,
            labels: Array.from(new Set([...(inst.labels || []), 'Amortized']))
          });
          remainingToDeduct -= instPrincipal;
        } else if (remainingToDeduct > 0 && instPrincipal > 0) {
          const newCap = Math.max(0, Math.round((instPrincipal - remainingToDeduct) * 100) / 100);
          const origJur = Number(inst.interestPortion || Math.round(Number(inst.amount || 0) * 0.18 * 100) / 100);
          updatesMap.set(inst.id, {
            amount: Math.round((newCap + origJur) * 100) / 100,
            principalAmount: newCap,
            labels: Array.from(new Set([...(inst.labels || []), 'Partial Amortization']))
          });
          remainingToDeduct = 0;
        }
      }

      currentEvents = currentEvents.map((ev) => {
        if (updatesMap.has(ev.id)) {
          return { ...ev, ...updatesMap.get(ev.id) };
        }
        return ev;
      });
    }
  }

  return currentEvents;
}

/**
 * Recalculate remaining balances and installment numbers across all loan events
 */
export function recalculateLoanState(timeline, eventsList) {
  const initialDebt = Number(timeline.totalDebt || 0);
  let runningBalance = initialDebt;
  const todayStr = '2026-08-21';
  const today = parseISO(todayStr);

  // Aplicar amortizações dinamicamente em memória
  const preparedList = applyAmortizationsInMemory(timeline, eventsList);

  const sorted = [...preparedList].sort((a, b) => {
    if (a.date === b.date) {
      return (a.installmentNumber || 0) - (b.installmentNumber || 0);
    }
    return a.date.localeCompare(b.date);
  });

  const updatedEvents = sorted.map((ev) => {
    const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;

    if (isLoanInst) {
      const isAbatida = ev.status === EventStatus.AMORTIZED || Boolean(ev.isAbatida);
      if (isAbatida) {
        return {
          ...ev,
          status: EventStatus.AMORTIZED,
          isAbatida: true,
          isCompleted: true,
          amount: 0,
          principalAmount: 0,
          interestPortion: 0,
          interestAmount: 0,
          balanceAfter: runningBalance
        };
      }

      const totalAmount = Number(ev.amount || 0);
      let principal = ev.principalAmount !== undefined
        ? Number(ev.principalAmount)
        : (ev.interestPortion !== undefined ? Math.max(0, totalAmount - Number(ev.interestPortion)) : Math.round(totalAmount * 0.82 * 100) / 100);

      let interestPortion = ev.interestPortion !== undefined
        ? Number(ev.interestPortion)
        : Math.max(0, Math.round((totalAmount - principal) * 100) / 100);

      const lateInterest = Number(ev.interestAmount || 0);
      const isPaid = isPositiveStatus(ev.status);
      let status = isPaid ? ev.status : EventStatus.PENDING;
      try {
        const evDate = parseISO(ev.date);
        if (!isPaid && isBefore(evDate, today)) {
          status = EventStatus.OVERDUE;
        }
      } catch (e) { }

      runningBalance = Math.max(0, Math.round((runningBalance - principal) * 100) / 100);

      return {
        ...ev,
        amount: totalAmount,
        principalAmount: principal,
        interestPortion: interestPortion,
        interestAmount: lateInterest,
        status: status,
        isCompleted: isPaid,
        balanceAfter: runningBalance
      };
    }
    return ev;
  });

  return updatedEvents;
}

/**
 * Propagate a new installment amount from a specific installment to all subsequent future installments
 */
export function propagateInstallmentAmountForward(eventsList, targetEventId, newTotalAmount, newPrincipal = null, newInterest = null) {
  let targetFound = false;
  const numTotal = Number(newTotalAmount);

  return eventsList.map((ev) => {
    const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
    if (ev.id === targetEventId) {
      targetFound = true;
      const principal = newPrincipal !== null ? Number(newPrincipal) : Math.round(numTotal * 0.82 * 100) / 100;
      const interest = newInterest !== null ? Number(newInterest) : Math.round((numTotal - principal) * 100) / 100;
      return {
        ...ev,
        amount: numTotal,
        principalAmount: principal,
        interestPortion: interest
      };
    }

    if (targetFound && isLoanInst && !isPositiveStatus(ev.status)) {
      const principal = newPrincipal !== null ? Number(newPrincipal) : Math.round(numTotal * 0.82 * 100) / 100;
      const interest = newInterest !== null ? Number(newInterest) : Math.round((numTotal - principal) * 100) / 100;
      return {
        ...ev,
        amount: numTotal,
        principalAmount: principal,
        interestPortion: interest
      };
    }
    return ev;
  });
}

/**
 * Apply an extraordinary amortization event (No-op on installment calculations)
 */
export function applyExtraordinaryAmortization({ eventsList, existingAmortEvent, amortizationAmount, amortizationDateStr, strategy, notes }) {
  if (existingAmortEvent) return eventsList;
  const amortVal = Number(amortizationAmount || 0);
  const amortEvent = {
    id: generateUUID(),
    date: amortizationDateStr,
    time: '12:00',
    title: `Extraordinary Amortization: ${formatCurrency(amortVal)}`,
    description: notes || `Extraordinary amortization record`,
    category: LoanEventCategory.AMORTIZATION,
    eventType: EventType.AMORTIZATION,
    status: EventStatus.AMORTIZED,
    priority: EventPriority.HIGH,
    amount: amortVal,
    amortizationAmount: amortVal,
    strategy: strategy,
    isCompleted: true,
    labels: ['Amortization']
  };
  return eventsList.some((e) => e.id === amortEvent.id) ? eventsList : [...eventsList, amortEvent];
}

/**
 * Calculate Summary Metrics for the Loan Timeline Header
 */
export function getLoanMetrics(timeline, eventsList = []) {
  let calculatedTotalDebt = Number(timeline?.totalDebt || timeline?.totalLoanAmount || timeline?.initialDebt || 0);
  if (!calculatedTotalDebt || calculatedTotalDebt === 0) {
    calculatedTotalDebt = (eventsList || []).reduce((acc, ev) => {
      const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
      if (isLoanInst) {
        const totalAmt = Number(ev.amount || 0);
        const principal = ev.principalAmount !== undefined ? Number(ev.principalAmount) : Math.round(totalAmt * 0.82 * 100) / 100;
        return acc + principal;
      }
      return acc;
    }, 0);
  }
  const totalDebt = calculatedTotalDebt;
  let totalPaid = 0;
  let totalContractInterestPaid = 0;
  let totalLateInterestPaid = 0;
  let totalPrincipalAmortized = 0;
  let paidInstallmentsCount = 0;
  let overdueInstallmentsCount = 0;
  let totalInstallmentsCount = 0;
  let nextInstallment = null;

  const todayStr = '2026-08-21';

  eventsList.forEach((ev) => {
    const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
    if (!isLoanInst) return;

    totalInstallmentsCount++;
    const totalAmt = Number(ev.amount || 0);
    const principal = ev.principalAmount !== undefined ? Number(ev.principalAmount) : Math.round(totalAmt * 0.82);
    const interestPortion = ev.interestPortion !== undefined ? Number(ev.interestPortion) : totalAmt - principal;
    const lateInterest = Number(ev.interestAmount || 0);

    const isPaid = isPositiveStatus(ev.status);

    if (isPaid) {
      totalPaid += totalAmt + lateInterest;
      totalContractInterestPaid += interestPortion;
      totalLateInterestPaid += lateInterest;
      totalPrincipalAmortized += principal;
      paidInstallmentsCount++;
    } else if (ev.status === EventStatus.OVERDUE || (ev.date < todayStr && !isPositiveStatus(ev.status))) {
      overdueInstallmentsCount++;
      if (!nextInstallment || ev.date < nextInstallment.date) {
        nextInstallment = ev;
      }
    } else {
      if (!nextInstallment || ev.date < nextInstallment.date) {
        nextInstallment = ev;
      }
    }
  });

  const remainingBalance = Math.max(0, totalDebt - totalPrincipalAmortized);
  const progressPercent = totalDebt > 0 ? Math.min(100, Math.round((totalPrincipalAmortized / totalDebt) * 100)) : 0;
  const totalInterestPaid = totalContractInterestPaid + totalLateInterestPaid;
  let loanStatus = EventStatus.PLANNED;
  if (remainingBalance <= 0 || (totalInstallmentsCount > 0 && paidInstallmentsCount >= totalInstallmentsCount)) {
    loanStatus = EventStatus.SETTLED;
  } else if (overdueInstallmentsCount > 0) {
    loanStatus = EventStatus.OVERDUE;
  }

  let lastActiveInstallment = null;
  const activeInstallments = eventsList
    .filter((ev) => {
      const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
      return isLoanInst && !isPositiveStatus(ev.status);
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  if (activeInstallments.length > 0) {
    lastActiveInstallment = activeInstallments[activeInstallments.length - 1];
  } else {
    const allLoanInst = eventsList
      .filter((ev) => ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT)
      .sort((a, b) => a.date.localeCompare(b.date));
    lastActiveInstallment = allLoanInst.length > 0 ? allLoanInst[allLoanInst.length - 1] : null;
  }

  const estimatedPayoffDate = lastActiveInstallment ? lastActiveInstallment.date : (timeline.endDate || null);
  const nextDueDate = nextInstallment ? nextInstallment.date : null;
  const currentInstallmentAmount = Number(timeline.installmentAmount || 0) || (nextInstallment ? Number(nextInstallment.amount || 0) : (eventsList.find((e) => e.category === LoanEventCategory.LOAN_INSTALLMENT || e.eventType === EventType.LOAN_INSTALLMENT)?.amount || 0));
  const estimatedFutureInterest = Math.max(0, (eventsList || []).filter(e => (e.category === LoanEventCategory.LOAN_INSTALLMENT || e.eventType === EventType.LOAN_INSTALLMENT) && !isPositiveStatus(e.status)).reduce((acc, ev) => acc + Number(ev.interestPortion || 0), 0));
  const futureCapital = remainingBalance;
  const futureTotal = futureCapital + estimatedFutureInterest;
  const totalEstimatedInterest = totalInterestPaid + estimatedFutureInterest;
  const totalLoanCost = totalDebt + totalEstimatedInterest;

  return {
    totalDebt,
    original_capital: totalDebt,
    originalCapital: totalDebt,
    remainingBalance,
    remaining_debt: remainingBalance,
    remainingDebt: remainingBalance,
    amortized_capital: totalPrincipalAmortized,
    amortizedCapital: totalPrincipalAmortized,
    paid_capital: totalPrincipalAmortized,
    totalPaid,
    totalPrincipalAmortized,
    totalContractInterestPaid,
    totalLateInterestPaid,
    totalInterestPaid,
    paid_interest: totalInterestPaid,
    paid_total: totalPaid,
    totalSavedInterest: 0,
    paidInstallmentsCount,
    paid_installments: paidInstallmentsCount,
    remainingInstallmentsCount: Math.max(0, totalInstallmentsCount - paidInstallmentsCount),
    remaining_installments: Math.max(0, totalInstallmentsCount - paidInstallmentsCount),
    overdueInstallmentsCount,
    totalInstallmentsCount,
    total_installments: totalInstallmentsCount,
    monthlyPayment: currentInstallmentAmount,
    current_installment_amount: currentInstallmentAmount,
    monthlyInstallment: currentInstallmentAmount,
    future_capital: futureCapital,
    future_interest: estimatedFutureInterest,
    future_total: futureTotal,
    total_estimated_interest: totalEstimatedInterest,
    totalEstimatedInterest: totalEstimatedInterest,
    total_loan_cost: totalLoanCost,
    totalLoanCost: totalLoanCost,
    progressPercent,
    amortized_percent: progressPercent,
    amortizedPercent: progressPercent,
    nextInstallment,
    next_due_date: nextDueDate,
    estimated_payoff_date: estimatedPayoffDate,
    lastActiveInstallment,
    lastInstallmentDate: estimatedPayoffDate,
    abatedInstallmentsCount: 0,
    advancedMonths: 0,
    advancedLabel: '',
    loanStatus
  };
}

/**
 * Calculate combined / consolidated metrics across multiple loan timelines
 */
export function getConsolidatedLoanMetrics(timelines, selectedIds = null) {
  const loanTimelines = (timelines || []).filter(
    (tl) => (tl.type === TimelineType.LOAN || (tl.type || '').toLowerCase().includes('loan')) && (!selectedIds || selectedIds.includes(tl.id))
  );

  let totalContractedDebt = 0;
  let totalRemainingBalance = 0;
  let totalPaid = 0;
  let totalPrincipalAmortized = 0;
  let totalInterestPaid = 0;
  let totalInstallments = 0;
  let paidInstallments = 0;
  let overdueInstallments = 0;

  loanTimelines.forEach((tl) => {
    const metrics = getLoanMetrics(tl, tl.events || []);
    totalContractedDebt += Number(metrics.totalDebt || tl.totalDebt || 0);
    totalRemainingBalance += Number(metrics.remainingBalance || 0);
    totalPaid += Number(metrics.totalPaid || 0);
    totalPrincipalAmortized += Number(metrics.totalPrincipalAmortized || 0);
    totalInterestPaid += Number(metrics.totalInterestPaid || 0);
    totalInstallments += metrics.totalInstallmentsCount;
    paidInstallments += metrics.paidInstallmentsCount;
    overdueInstallments += metrics.overdueInstallmentsCount;
  });

  return {
    activeCreditsCount: loanTimelines.length,
    totalContractedDebt,
    totalRemainingBalance,
    totalPaid,
    totalPrincipalAmortized,
    totalInterestPaid,
    totalInstallments,
    paidInstallments,
    overdueInstallments,
    progressPercent: totalContractedDebt > 0 ? Math.min(100, Math.round((totalPrincipalAmortized / totalContractedDebt) * 100)) : 0
  };
}

/**
 * Calculate Consolidated Loan Metrics at a specific future or past Horizon Month
 */
export function getConsolidatedLoanMetricsAtHorizon(timelines, targetHorizonMonth = null, selectedIds = null) {
  const loanTimelines = (timelines || []).filter(
    (tl) => (tl.type === TimelineType.LOAN || (tl.type || '').toLowerCase().includes('loan')) && (!selectedIds || selectedIds.includes(tl.id))
  );

  let totalContractedDebt = 0;
  let totalPrincipalAmortized = 0;
  let totalRemainingBalance = 0;

  loanTimelines.forEach((tl) => {
    const metrics = getLoanMetrics(tl, tl.events || []);
    const totalDebt = Number(metrics.totalDebt || tl.totalDebt || 0);
    totalContractedDebt += totalDebt;

    const allEvts = tl.events || [];
    let amortizedForLoan = 0;

    allEvts.forEach((ev) => {
      if (!ev || !ev.date) return;
      if (ev.status === EventStatus.CANCELLED || ev.status === EventStatus.DELETED) return;
      const evMonth = ev.date.substring(0, 7);
      if (targetHorizonMonth && evMonth > targetHorizonMonth) return;

      const isLoanInst = ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.eventType === EventType.LOAN_INSTALLMENT;
      const isAmort = ev.category === LoanEventCategory.AMORTIZATION || ev.eventType === EventType.AMORTIZATION;

      if (isLoanInst) {
        const totalAmt = Number(ev.amount || 0);
        const principal = ev.principalAmount !== undefined ? Number(ev.principalAmount) : (ev.principalPaid !== undefined ? Number(ev.principalPaid) : Math.round(totalAmt * 0.82));
        amortizedForLoan += principal;
      }
    });

    const cappedAmortized = Math.min(totalDebt, amortizedForLoan);
    totalPrincipalAmortized += cappedAmortized;
    totalRemainingBalance += Math.max(0, totalDebt - cappedAmortized);
  });

  return { totalContractedDebt, totalPrincipalAmortized, totalRemainingBalance };
}

/**
 * Calculate metrics for Financial (Entradas, Gastos, Investimentos, Balanço) timelines
 */
export function getFinancialMetrics(timeline, events = [], computeStartDate = null, targetHorizonMonth = null) {
  const allEvents = events.length > 0 ? events : (timeline.events || []);
  const todayStr = '2026-08-21';
  const currentMonthKey = todayStr.substring(0, 7); // '2026-08'
  const currentYearKey = todayStr.substring(0, 4); // '2026'
  const currentMonthDate = parseISO(`${currentMonthKey}-01`);
  const oneYearAheadDate = addMonths(currentMonthDate, 12);
  const oneYearAheadKey = format(oneYearAheadDate, 'yyyy-MM');
  const horizonMonthKey = targetHorizonMonth || currentMonthKey;

  let totalReceived = 0;
  let totalForecastIncome = 0;
  let totalForecastIncomeUpToCurrent = 0;
  let totalForecastIncomeHorizon = 0;
  let annualProjectedIncome = 0;
  let currentMonthIncome = 0;
  let currentMonthIncomeReceived = 0;
  let totalPaidExpenses = 0;
  let totalPaidExpensesOnly = 0;
  let totalPaidLoans = 0;
  let totalPlannedExpenses = 0;
  let totalPlannedExpensesUpToCurrent = 0;
  let totalPlannedExpensesOnlyUpToCurrent = 0;
  let totalPlannedLoansUpToCurrent = 0;
  let totalPlannedExpensesHorizon = 0;
  let currentMonthExpenses = 0;
  let currentMonthExpensesPaid = 0;
  let currentMonthExpensesOnly = 0;
  let currentMonthExpensesOnlyPaid = 0;
  let currentMonthLoans = 0;
  let currentMonthLoansPaid = 0;
  let currentYearExpenses = 0;
  let currentYearExpensesPaid = 0;
  let currentYearExpensesOnly = 0;
  let currentYearExpensesOnlyPaid = 0;
  let currentYearLoans = 0;
  let currentYearLoansPaid = 0;
  const expenseMonthsSet = new Set();
  let monthlyExpensesSum = 0;

  let nextIncome = null;
  let nextExpense = null;

  const seenInitialInvestments = new Set();
  const seenTargets = new Set();
  let totalPriorInvestedAll = 0;
  let totalPriorPoupanca = 0;
  let totalPriorPatrimonio = 0;
  let totalPriorPatrimonioAcquisition = 0;
  let totalPriorOutros = 0;
  let totalTargetSavings = 0;

  const startBound = computeStartDate && computeStartDate !== '1900-01' ? `${computeStartDate}-01` : null;

  (allEvents || []).forEach((ev) => {
    if (!ev) return;
    const isInvestment = ev.eventType === EventType.INVESTMENT;
    if (isInvestment) {
      if (ev.category === InvestmentEventCategory.ASSETS || ev.category === 'assets') {
        const initialKey = ev.eventId || ev.seriesId || ev.id;
        if (!seenInitialInvestments.has(initialKey)) {
          const currentVal = Number(ev.amount || ev.initialInvestedAmount || 0);
          const acqVal = Number(ev.initialInvestedAmount !== undefined && ev.initialInvestedAmount !== '' && Number(ev.initialInvestedAmount) > 0 ? ev.initialInvestedAmount : (ev.amount || 0));
          totalPriorInvestedAll += acqVal;
          totalPriorPatrimonio += currentVal;
          totalPriorPatrimonioAcquisition += acqVal;
          seenInitialInvestments.add(initialKey);
        }
      } else if (Number(ev.initialInvestedAmount || 0) > 0) {
        const initialKey = ev.eventId || ev.seriesId || ev.id;
        if (!seenInitialInvestments.has(initialKey)) {
          const initAmt = Number(ev.initialInvestedAmount);
          totalPriorInvestedAll += initAmt;
          if (ev.category === InvestmentEventCategory.OTHER || ev.category === InvestmentEventCategory.STOCKS || ev.category?.includes('etf') || ev.category?.includes('acoes')) {
            totalPriorOutros += initAmt;
          } else {
            totalPriorPoupanca += initAmt;
          }
          seenInitialInvestments.add(initialKey);
        }
      }

      if (Number(ev.targetAmount || 0) > 0) {
        const targetKey = ev.eventId || ev.seriesId || ev.id;
        if (!seenTargets.has(targetKey)) {
          totalTargetSavings += Number(ev.targetAmount);
          seenTargets.add(targetKey);
        }
      }

      if (startBound && ev.date < startBound && ev.category !== InvestmentEventCategory.ASSETS) {
        const isDone = isPositiveStatus(ev.status) || ev.isCompleted;
        if (isDone) {
          const amt = Number(ev.amount || 0);
          totalPriorInvestedAll += amt;
          if (ev.category === InvestmentEventCategory.OTHER || ev.category === InvestmentEventCategory.STOCKS || ev.category?.includes('etf') || ev.category?.includes('acoes')) {
            totalPriorOutros += amt;
          } else {
            totalPriorPoupanca += amt;
          }
        }
      }
    }
  });

  let totalAportesPoupanca = 0;
  let totalAportesPatrimonio = 0;
  let totalAportesOutros = 0;
  let totalAportesPoupancaHorizon = 0;
  let totalAportesPatrimonioHorizon = 0;
  let totalAportesOutrosHorizon = 0;

  let totalInvested = totalPriorInvestedAll;
  let totalPlannedInvestments = totalPriorInvestedAll;
  let totalPlannedInvestmentsUpToCurrent = totalPriorInvestedAll;
  let totalPlannedInvestmentsHorizon = totalPriorInvestedAll;
  let totalAmortized = 0;
  let totalLoanDebt = 0;

  allEvents.forEach((ev) => {
    if (!ev || !ev.date) return;
    const amt = Number(ev.amount || 0);
    const isPast = ev.date <= todayStr;
    const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent;
    const isInvestment = ev.eventType === EventType.INVESTMENT;
    const isIncome = ev.eventType === EventType.INCOME;
    const isExpense = ev.eventType === EventType.EXPENSE || isLoan;

    const evMonth = ev.date ? ev.date.substring(0, 7) : '';
    const isAfterStartBound = !startBound || ev.date >= startBound;
    const isUpToCurrent = (ev.date <= todayStr || evMonth <= currentMonthKey) && isAfterStartBound;
    const isUpToHorizon = (!horizonMonthKey || evMonth <= horizonMonthKey) && isAfterStartBound;

    if (isLoan) {
      const isPaidOrAmortized = isPositiveStatus(ev.status);
      const isAmort = ev.eventType === EventType.AMORTIZATION;
      const amortVal = isAmort ? amt : Number(ev.principalAmount || 0);

      if (isPaidOrAmortized) {
        totalAmortized += amortVal;
      } else if (ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED) {
        totalLoanDebt += amortVal;
      }
    }

    if (isIncome) {
      const isReceived = isPositiveStatus(ev.status) || ev.isCompleted;
      if (isUpToCurrent && isReceived) {
        totalReceived += amt;
      }
      if (isUpToCurrent && ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED) {
        totalForecastIncomeUpToCurrent += amt;
      }
      if (isUpToHorizon && ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED) {
        totalForecastIncomeHorizon += amt;
      }
      totalForecastIncome += amt;
      if (evMonth === currentMonthKey) {
        currentMonthIncome += amt;
        if (isReceived) {
          currentMonthIncomeReceived += amt;
        }
      }
      if (evMonth >= currentMonthKey && evMonth < oneYearAheadKey) {
        annualProjectedIncome += amt;
      }
      if (!isPast && (!nextIncome || ev.date < nextIncome.date)) nextIncome = ev;
    } else if (isExpense) {
      const isPaidOrNoPending = isPositiveStatus(ev.status);
      const isPlanned = ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED;

      if (isUpToCurrent && isPaidOrNoPending) {
        totalPaidExpenses += amt;
        if (isLoan) {
          totalPaidLoans += amt;
        } else {
          totalPaidExpensesOnly += amt;
        }
      }
      if (isUpToCurrent && isPlanned) {
        totalPlannedExpensesUpToCurrent += amt;
        if (isLoan) {
          totalPlannedLoansUpToCurrent += amt;
        } else {
          totalPlannedExpensesOnlyUpToCurrent += amt;
        }
      }
      if (isUpToHorizon && isPlanned) {
        totalPlannedExpensesHorizon += amt;
      }
      totalPlannedExpenses += amt;
      if (!isPast && (!nextExpense || ev.date < nextExpense.date)) nextExpense = ev;

      const evYear = ev.date ? ev.date.substring(0, 4) : '';
      if (evMonth === currentMonthKey && isPlanned) {
        currentMonthExpenses += amt;
        if (isLoan) {
          currentMonthLoans += amt;
        } else {
          currentMonthExpensesOnly += amt;
        }
        if (isPaidOrNoPending) {
          currentMonthExpensesPaid += amt;
          if (isLoan) {
            currentMonthLoansPaid += amt;
          } else {
            currentMonthExpensesOnlyPaid += amt;
          }
        }
      }
      if (evYear === currentYearKey && isPlanned) {
        currentYearExpenses += amt;
        if (isLoan) {
          currentYearLoans += amt;
        } else {
          currentYearExpensesOnly += amt;
        }
        if (isPaidOrNoPending) {
          currentYearExpensesPaid += amt;
          if (isLoan) {
            currentYearLoansPaid += amt;
          } else {
            currentYearExpensesOnlyPaid += amt;
          }
        }
      }
      if (evMonth && isPlanned) {
        expenseMonthsSet.add(evMonth);
        monthlyExpensesSum += amt;
      }
    } else if (isInvestment) {
      if (ev.category !== InvestmentEventCategory.ASSETS) {
        const isInvestedDone = isPositiveStatus(ev.status) || ev.isCompleted;
        if (isUpToCurrent && isInvestedDone) {
          totalInvested += amt;
          totalMonthlyAportesRealized += amt;
          if (ev.category === InvestmentEventCategory.OTHER || ev.category === InvestmentEventCategory.STOCKS || ev.category?.includes('etf') || ev.category?.includes('acoes') || ev.category?.includes('extra')) {
            totalAportesOutros += amt;
          } else {
            totalAportesPoupanca += amt;
          }
        }

        if (isUpToCurrent && ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED) {
          totalPlannedInvestmentsUpToCurrent += amt;
          totalMonthlyAportesPlannedCurrent += amt;
        }
        if (isUpToHorizon && ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED) {
          totalPlannedInvestmentsHorizon += amt;
          totalMonthlyAportesPlannedHorizon += amt;
          if (ev.category === InvestmentEventCategory.OTHER || ev.category === InvestmentEventCategory.STOCKS || ev.category?.includes('etf') || ev.category?.includes('acoes') || ev.category?.includes('extra')) {
            totalAportesOutrosHorizon += amt;
          } else {
            totalAportesPoupancaHorizon += amt;
          }
        }
        totalPlannedInvestments += amt;
      }
    }
  });

  const totalPoupanca = totalPriorPoupanca + totalAportesPoupanca;
  const totalPatrimonio = totalPriorPatrimonio + totalAportesPatrimonio;
  const totalOutros = totalPriorOutros + totalAportesOutros;

  const totalPoupancaHorizon = totalPriorPoupanca + totalAportesPoupancaHorizon;
  const totalPatrimonioHorizon = totalPriorPatrimonio + totalAportesPatrimonioHorizon;
  const totalOutrosHorizon = totalPriorOutros + totalAportesOutrosHorizon;

  const totalPatrimonioGain = totalPatrimonio - totalPriorPatrimonioAcquisition;
  const totalPatrimonioGainPercent = totalPriorPatrimonioAcquisition > 0
    ? ((totalPatrimonio - totalPriorPatrimonioAcquisition) / totalPriorPatrimonioAcquisition) * 100
    : 0;

  const totalPatrimonioGainHorizon = totalPatrimonioHorizon - totalPriorPatrimonioAcquisition;
  const totalPatrimonioGainPercentHorizon = totalPriorPatrimonioAcquisition > 0
    ? ((totalPatrimonioHorizon - totalPriorPatrimonioAcquisition) / totalPriorPatrimonioAcquisition) * 100
    : 0;

  const monthlyAverageExpenses = expenseMonthsSet.size > 0 ? (monthlyExpensesSum / expenseMonthsSet.size) : (currentMonthExpenses || 0);
  const projectedAnnualExpenses = currentYearExpenses > 0 ? currentYearExpenses : (monthlyAverageExpenses * 12);
  const monthlyAverageIncome = annualProjectedIncome > 0
    ? (annualProjectedIncome / 12)
    : (currentMonthIncome || 0);

  const netRealized = totalReceived - totalPaidExpenses - totalMonthlyAportesRealized;
  const netProjectedCurrent = totalForecastIncomeUpToCurrent - totalPlannedExpensesUpToCurrent - totalMonthlyAportesPlannedCurrent;
  const netProjectedHorizon = totalForecastIncomeHorizon - totalPlannedExpensesHorizon - totalMonthlyAportesPlannedHorizon;
  const netProjected = totalForecastIncome - totalPlannedExpenses - totalPlannedInvestments;
  const savingsRate = totalReceived > 0 ? Math.round(((totalInvested + Math.max(0, netRealized)) / totalReceived) * 100) : 0;

  return {
    totalReceived,
    totalForecastIncome,
    totalForecastIncomeUpToCurrent,
    totalForecastIncomeHorizon,
    annualProjectedIncome,
    currentMonthIncome,
    currentMonthIncomeReceived,
    monthlyAverageIncome,
    totalPaidExpenses,
    totalPlannedExpenses,
    totalPlannedExpensesUpToCurrent,
    totalPlannedExpensesHorizon,
    totalInvested,
    totalInvestedMarket: totalPoupanca + totalPatrimonio + totalOutros,
    totalPoupanca,
    totalPatrimonio,
    totalPatrimonioAcquisition: totalPriorPatrimonioAcquisition,
    totalPatrimonioGain,
    totalPatrimonioGainPercent,
    totalOutros,
    totalPoupancaHorizon,
    totalPatrimonioHorizon,
    totalPatrimonioGainHorizon,
    totalPatrimonioGainPercentHorizon,
    totalOutrosHorizon,
    totalTargetSavings,
    totalPlannedInvestments,
    totalPlannedInvestmentsUpToCurrent,
    totalPlannedInvestmentsHorizon,
    totalPlannedInvestmentsMarketHorizon: totalPoupancaHorizon + totalPatrimonioHorizon + totalOutrosHorizon,
    totalMonthlyAportesRealized,
    totalMonthlyAportesPlannedHorizon,
    currentMonthExpenses,
    currentMonthExpensesPaid,
    currentMonthExpensesOnly,
    currentMonthExpensesOnlyPaid,
    currentMonthLoans,
    currentMonthLoansPaid,
    currentYearExpenses,
    currentYearExpensesPaid,
    currentYearExpensesOnly,
    currentYearExpensesOnlyPaid,
    currentYearLoans,
    currentYearLoansPaid,
    annualProjectedExpenses: currentYearExpenses > 0 ? currentYearExpenses : projectedAnnualExpenses,
    annualProjectedExpensesOnly: currentYearExpensesOnly,
    annualProjectedLoans: currentYearLoans,
    totalPaidExpensesYear: currentYearExpensesPaid,
    totalPaidExpensesOnly,
    totalPaidLoans,
    totalAmortized,
    totalLoanDebt,
    totalPlannedExpensesOnlyUpToCurrent,
    totalPlannedLoansUpToCurrent,
    monthlyAverageExpenses,
    projectedAnnualExpenses,
    netRealized,
    netProjectedCurrent,
    netProjectedHorizon,
    netProjected,
    savingsRate,
    nextIncome,
    nextExpense,
    totalEventsCount: allEvents.length
  };
}

/**
 * Calculate metrics for Income (Entradas & Rendimentos) timelines
 */
export function getIncomeMetrics(timeline, events = [], computeStartDate = null) {
  const allEvents = events.length > 0 ? events : (timeline.events || []);
  const todayStr = '2026-08-21';
  const currentMonthKey = todayStr.substring(0, 7);
  const currentYearKey = todayStr.substring(0, 4);

  const rawComputeStartDate = computeStartDate || timeline?.computeStartDate || timeline?.computeFromMonth;
  const startBound = rawComputeStartDate && rawComputeStartDate !== '1900-01'
    ? (rawComputeStartDate.length === 7 ? `${rawComputeStartDate}-01` : rawComputeStartDate)
    : null;

  let totalReceivedAllTime = 0;
  let totalProjectedUpToCurrent = 0;
  let totalForecast = 0;
  let receivedCount = 0;
  let plannedCount = 0;
  let monthlyRecurring = Number(timeline.monthlySalary || 3349.00);
  let nextIncome = null;
  let currentMonthReceived = 0;
  let totalReceivedYear = 0;
  let annualProjected = 0;

  allEvents.forEach((ev) => {
    if (!ev || ev.isDeleted) return;
    const isIncome = ev.eventType === EventType.INCOME;

    if (!isIncome) return;

    const amt = Number(ev.amount || 0);
    const isPast = ev.date <= todayStr;
    const isReceived = isPositiveStatus(ev.status) || ev.isCompleted;
    const evMonth = ev.date ? ev.date.substring(0, 7) : '';
    const evYear = ev.date ? ev.date.substring(0, 4) : '';
    const isAfterStartBound = !startBound || ev.date >= startBound;
    const isUpToCurrent = (ev.date <= todayStr || evMonth <= currentMonthKey) && isAfterStartBound;

    if (isUpToCurrent) {
      if (ev.status !== EventStatus.CANCELLED && ev.status !== EventStatus.DELETED) {
        totalProjectedUpToCurrent += amt;
      }
      if (isReceived) {
        totalReceivedAllTime += amt;
      }
    }

    if (evYear === currentYearKey) {
      annualProjected += amt;
      if (isReceived) {
        totalReceivedYear += amt;
      }
    }

    if (evMonth === currentMonthKey && isReceived) {
      currentMonthReceived += amt;
    }

    if (isPast) {
      if (isReceived) {
        receivedCount++;
        totalForecast += amt;
      }
    } else {
      totalForecast += amt;
      plannedCount++;
      if (!nextIncome || ev.date < nextIncome.date) {
        nextIncome = ev;
      }
    }
  });

  return {
    totalReceived: totalReceivedYear,
    totalReceivedYear,
    totalReceivedAllTime,
    totalProjectedUpToCurrent,
    annualProjected: annualProjected || (monthlyRecurring * 12),
    currentMonthReceived,
    monthlyBaseSalary: monthlyRecurring,
    receivedCount,
    plannedCount,
    totalEventsCount: allEvents.length,
    monthlyRecurring,
    nextIncome
  };
}

/**
 * Generate regular income schedule events (e.g. salary)
 */
export function generateIncomeSchedule({
  monthlySalary = 3300.00,
  startDateStr = '2024-01-01',
  endDateStr = '2027-12-31',
  dueDay = 28
}) {
  const events = [];
  const start = parseISO(startDateStr);
  const end = parseISO(endDateStr);
  const todayStr = '2026-08-21';
  let cur = start;
  let counter = 1;

  while (cur <= end) {
    const year = cur.getFullYear();
    const month = cur.getMonth() + 1;
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = Number(dueDay).toString().padStart(2, '0');
    const dateStr = `${year}-${monthStr}-${dayStr}`;

    const isPast = dateStr <= todayStr;
    events.push({
      id: generateUUID(),
      date: dateStr,
      time: '10:00',
      title: `Monthly Salary (${formatCurrency(monthlySalary)})`,
      description: `Net salary transfer (${formatCurrency(monthlySalary)}).`,
      category: IncomeEventCategory.RECURRING_INCOME,
      eventType: EventType.INCOME,
      status: isPast ? EventStatus.RECEIVED : EventStatus.PLANNED,
      priority: EventPriority.NORMAL,
      amount: Number(monthlySalary),
      isIncome: true,
      isCompleted: isPast,
      labels: ['Salary', 'Recurring', isPast ? 'Received' : 'Forecast']
    });

    cur = addMonths(cur, 1);
    counter++;
  }

  return events;
}

