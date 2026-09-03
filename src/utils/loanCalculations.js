import { addDays, addWeeks, addMonths, addYears, format, parseISO, isBefore, isAfter, differenceInDays } from 'date-fns';
import { generateUUID } from './uuid.js';
import { EventType, EventStatus } from '../enums/index.js';
import { TimelineType } from '../../shared/enums/index.js';

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
  const p = (periodicity || 'mensal').toLowerCase();
  if (p === 'diaria') return 'dia';
  if (p === 'quinzenal') return 'semana';
  if (p === 'anual') return 'ano';
  // mensal, bimestral, semestral
  return 'mes';
}

/**
 * Helper to get human label for periodicity
 */
export function getPeriodicityLabel(periodicity) {
  const p = (periodicity || 'mensal').toLowerCase();
  switch (p) {
    case 'diaria': return 'Diária';
    case 'quinzenal': return 'Quinzenal';
    case 'bimestral': return 'Bimestral';
    case 'semestral': return 'Semestral';
    case 'anual': return 'Anual';
    default: return 'Mensal';
  }
}

/**
 * Generate regular loan installment events from loan parameters with principal and interest breakdown
 */
export function generateLoanSchedule({
  totalDebt,
  installmentAmount,
  startDateStr = '2026-01-15',
  dueDay = 15,
  periodicity = 'mensal',
  customInstallmentsCount = null,
  annualInterestRate = 4.5
}) {
  const events = [];
  let remainingBalance = Number(totalDebt);
  let currentStartDate = parseISO(startDateStr);
  const monthlyRate = (annualInterestRate / 100) / 12;

  const totalInstallments = customInstallmentsCount || Math.ceil(totalDebt / (installmentAmount * 0.85));

  for (let i = 1; i <= totalInstallments; i++) {
    let dueDate;
    const p = (periodicity || 'mensal').toLowerCase();

    if (p === 'diaria') {
      dueDate = addDays(currentStartDate, i - 1);
    } else if (p === 'quinzenal') {
      dueDate = addWeeks(currentStartDate, (i - 1) * 2);
    } else if (p === 'bimestral') {
      dueDate = addMonths(currentStartDate, (i - 1) * 2);
    } else if (p === 'semestral') {
      dueDate = addMonths(currentStartDate, (i - 1) * 6);
    } else if (p === 'anual') {
      dueDate = addYears(currentStartDate, i - 1);
    } else {
      // mensal default
      dueDate = addMonths(currentStartDate, i - 1);
    }

    const dueDateStr = format(dueDate, 'yyyy-MM-dd');
    const thisTotal = Number(installmentAmount);

    // Calcular parcela de juros sobre o saldo devedor
    const interestPortion = Math.min(thisTotal * 0.4, Math.round(remainingBalance * monthlyRate * 100) / 100) || Math.round(thisTotal * 0.18 * 100) / 100;
    const principalAmount = Math.min(remainingBalance, Math.round((thisTotal - interestPortion) * 100) / 100);
    const balanceAfter = Math.max(0, Math.round((remainingBalance - principalAmount) * 100) / 100);
    remainingBalance = balanceAfter;

    events.push({
      id: generateUUID(),
      date: dueDateStr,
      time: '09:00',
      title: `Prestação #${i} de ${totalInstallments}`,
      description: `Pagamento de prestação contratual (${formatCurrency(principalAmount)} capital + ${formatCurrency(interestPortion)} juros).`,
      category: 'parcela_emprestimo',
      status: EventStatus.PENDING,
      priority: 'Normal',
      amount: thisTotal,
      principalAmount: principalAmount,
      interestPortion: interestPortion,
      interestAmount: 0, // juros de mora adicionais por atraso
      balanceAfter: balanceAfter,
      installmentNumber: i,
      totalInstallments: totalInstallments,
      isSystemLoanEvent: true,
      isCompleted: false,
      labels: ['Empréstimo', 'Prestação']
    });

    if (remainingBalance <= 0) break;
  }

  return events;
}

/**
 * Recalculate remaining balances and installment numbers across all loan events
 */
export function recalculateLoanState(timeline, eventsList) {
  const initialDebt = Number(timeline.totalDebt || 0);
  let runningBalance = initialDebt;
  const todayStr = '2026-08-21';
  const today = parseISO(todayStr);

  // Sort loan events chronologically
  const sorted = [...eventsList].sort((a, b) => {
    if (a.date === b.date) {
      if (a.category === 'amortizacao') return -1;
      if (b.category === 'amortizacao') return 1;
      return (a.installmentNumber || 0) - (b.installmentNumber || 0);
    }
    return a.date.localeCompare(b.date);
  });

  const updatedEvents = sorted.map((ev) => {
    if (ev.category === 'parcela_emprestimo') {
      const isAbatida = ev.status === 'Abatida' || Boolean(ev.isAbatida);
      if (isAbatida) {
        return {
          ...ev,
          status: 'Abatida',
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

      // Amortização de capital vs Juros embutidos
      let principal = ev.principalAmount !== undefined
        ? Number(ev.principalAmount)
        : (ev.interestPortion !== undefined ? Math.max(0, totalAmount - Number(ev.interestPortion)) : Math.round(totalAmount * 0.82 * 100) / 100);

      let interestPortion = ev.interestPortion !== undefined
        ? Number(ev.interestPortion)
        : Math.max(0, Math.round((totalAmount - principal) * 100) / 100);

      const lateInterest = Number(ev.interestAmount || 0);
      const isPaid = ev.status === EventStatus.PAID || ev.status === 'paid' || ev.status === 'Pago' || ev.isCompleted;

      // Check if overdue: date is before today and not paid
      let status = ev.status;
      try {
        const evDate = parseISO(ev.date);
        if (!isPaid && isBefore(evDate, today)) {
          status = EventStatus.OVERDUE;
        } else if (!isPaid) {
          status = EventStatus.PENDING;
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
    } else if (ev.category === 'amortizacao') {
      const isAmortized = ev.status === EventStatus.AMORTIZED || ev.status === 'amortized' || ev.status === 'Amortizado' || ev.status === EventStatus.COMPLETED || ev.status === 'Concluído' || Boolean(ev.isCompleted);
      if (isAmortized) {
        const amortAmount = Number(ev.amortizationAmount || ev.amount || 0);
        runningBalance = Math.max(0, Math.round((runningBalance - amortAmount) * 100) / 100);
      }
      return {
        ...ev,
        balanceAfter: runningBalance,
        status: isAmortized ? EventStatus.AMORTIZED : EventStatus.PENDING,
        isCompleted: isAmortized
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

    if (targetFound && ev.category === 'parcela_emprestimo' && ev.status !== 'Pago') {
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
 * Apply an extraordinary amortization event
 * Strategy: 'reduce_term' (shorten duration) OR 'reduce_installment' (lower future installments)
 */
export function applyExtraordinaryAmortization({
  timeline,
  eventsList,
  amortizationAmount,
  amortizationDateStr,
  strategy = 'reduce_term',
  notes = '',
  existingAmortEvent = null
}) {
  const amortVal = Number(amortizationAmount);
  if (isNaN(amortVal) || amortVal <= 0) return eventsList;

  const amortEvent = existingAmortEvent || {
    id: generateUUID(),
    date: amortizationDateStr,
    time: '12:00',
    title: `Amortização Extraordinária: ${formatCurrency(amortVal)}`,
    description: notes || `Amortização extraordinária para ${strategy === 'reduce_term' ? 'redução do prazo' : 'redução do valor da prestação'}.`,
    category: 'amortizacao',
    status: 'Concluído',
    priority: 'Alta',
    amount: amortVal,
    amortizationAmount: amortVal,
    strategy: strategy,
    isCompleted: true,
    labels: ['Amortização', strategy === 'reduce_term' ? 'Redução Prazo' : 'Redução Parcela']
  };

  let updatedList = eventsList.some((e) => e.id === amortEvent.id) ? [...eventsList] : [...eventsList, amortEvent];

  if (strategy === 'reduce_installment') {
    // 2. Diminuir Parcela: Reduz o valor das parcelas dali para a frente proporcionalmente
    const futureUnpaid = updatedList.filter(
      (ev) => ev.category === 'parcela_emprestimo' && ev.status !== 'Pago' && ev.date >= amortizationDateStr
    );

    if (futureUnpaid.length > 0) {
      const currentRemainingDebt = Number(timeline.remainingDebt || timeline.totalDebt || 13259.93);
      const originalInstallment = Number(timeline.installmentAmount || futureUnpaid[0].originalAmount || futureUnpaid[0].amount || 218.47);
      const newFuturePrincipal = Math.max(0, currentRemainingDebt - amortVal);
      const reductionRatio = currentRemainingDebt > 0 ? (newFuturePrincipal / currentRemainingDebt) : 1;
      const newTotal = Math.max(1, Math.round(originalInstallment * reductionRatio * 100) / 100);

      updatedList = updatedList.map((ev) => {
        if (ev.category === 'parcela_emprestimo' && ev.status !== 'Pago' && ev.date >= amortizationDateStr) {
          const origAmt = Number(ev.originalAmount || ev.amount || originalInstallment);
          const origCap = Number(ev.principalAmount || Math.round(origAmt * 0.82 * 100) / 100);
          const origJur = Number(ev.interestPortion || Math.round(origAmt * 0.18 * 100) / 100);
          return {
            ...ev,
            originalAmount: origAmt,
            amount: newTotal,
            principalAmount: Math.round(origCap * reductionRatio * 100) / 100,
            interestPortion: Math.round(origJur * reductionRatio * 100) / 100
          };
        }
        return ev;
      });
    }
  } else {
    // 1. Diminuir Prazo: Abater parcelas do fim para trás mantendo visíveis com status Abatida
    const futureUnpaid = updatedList
      .filter((ev) => ev.category === 'parcela_emprestimo' && ev.status !== 'Pago' && ev.status !== 'Abatida' && !ev.isAbatida && ev.date >= amortizationDateStr)
      .sort((a, b) => (a.date > b.date ? 1 : -1));

    let remainingToDeduct = amortVal;
    const updatesMap = new Map();

    // Iterar do fim para trás (da última parcela para a anterior)
    for (let i = futureUnpaid.length - 1; i >= 0; i--) {
      if (remainingToDeduct <= 0) break;
      const inst = futureUnpaid[i];
      const instPrincipal = inst.principalAmount !== undefined ? Number(inst.principalAmount) : Number(inst.amount || 0);

      if (remainingToDeduct >= instPrincipal) {
        // Totalmente abatida: mantém visível mas zerada e com label Abatida
        updatesMap.set(inst.id, {
          status: 'Abatida',
          isAbatida: true,
          isCompleted: true,
          originalAmount: inst.amount || instPrincipal,
          amount: 0,
          principalAmount: 0,
          interestPortion: 0,
          labels: Array.from(new Set([...(inst.labels || []), 'Abatida']))
        });
        remainingToDeduct -= instPrincipal;
      } else {
        // Abate parcial
        const newPrincipal = Math.max(0, instPrincipal - remainingToDeduct);
        const interestPortion = Number(inst.interestPortion || 0);
        updatesMap.set(inst.id, {
          amount: Math.round((newPrincipal + interestPortion) * 100) / 100,
          principalAmount: Math.round(newPrincipal * 100) / 100,
          labels: Array.from(new Set([...(inst.labels || []), 'Abatida Parcial']))
        });
        remainingToDeduct = 0;
      }
    }

    updatedList = updatedList.map((ev) => {
      if (updatesMap.has(ev.id)) {
        return {
          ...ev,
          ...updatesMap.get(ev.id)
        };
      }
      return ev;
    });
  }
  return recalculateLoanState(timeline, updatedList);
}

/**
 * Calculate Summary Metrics for the Loan Timeline Header
 */
export function getLoanMetrics(timeline, eventsList = []) {
  let calculatedTotalDebt = Number(timeline?.totalDebt || timeline?.totalLoanAmount || timeline?.initialDebt || 0);
  if (!calculatedTotalDebt || calculatedTotalDebt === 0) {
    calculatedTotalDebt = (eventsList || []).reduce((acc, ev) => {
      if (ev.category === 'parcela_emprestimo') {
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
    if (ev.category === 'parcela_emprestimo') {
      totalInstallmentsCount++;
      const totalAmt = Number(ev.amount || 0);
      const principal = ev.principalAmount !== undefined ? Number(ev.principalAmount) : Math.round(totalAmt * 0.82);
      const interestPortion = ev.interestPortion !== undefined ? Number(ev.interestPortion) : totalAmt - principal;
      const lateInterest = Number(ev.interestAmount || 0);

      const isPaidOrAbatida = ev.status === 'Pago' || ev.status === 'paid' || ev.status === 'Abatida' || Boolean(ev.isAbatida) || Boolean(ev.isCompleted);

      if (isPaidOrAbatida) {
        totalPaid += totalAmt + lateInterest;
        totalContractInterestPaid += interestPortion;
        totalLateInterestPaid += lateInterest;
        totalPrincipalAmortized += principal;
        paidInstallmentsCount++;
      } else if (ev.status === 'Atrasada' || (ev.date < todayStr && !ev.isCompleted)) {
        overdueInstallmentsCount++;
        if (!nextInstallment || ev.date < nextInstallment.date) {
          nextInstallment = ev;
        }
      } else {
        if (!nextInstallment || ev.date < nextInstallment.date) {
          nextInstallment = ev;
        }
      }
    } else if (ev.category === 'amortizacao') {
      const isAmortized = ev.status === 'Amortizado' || ev.status === 'Concluído' || Boolean(ev.isCompleted);
      if (isAmortized) {
        const amort = Number(ev.amortizationAmount || ev.amount || 0);
        totalPaid += amort;
        totalPrincipalAmortized += amort;
      }
    }
  });

  const remainingBalance = Math.max(0, totalDebt - totalPrincipalAmortized);
  const progressPercent = totalDebt > 0 ? Math.min(100, Math.round((totalPrincipalAmortized / totalDebt) * 100)) : 0;
  const totalInterestPaid = totalContractInterestPaid + totalLateInterestPaid;

  // General Status
  let loanStatus = 'Em Dia';
  if (remainingBalance === 0 && totalDebt > 0) {
    loanStatus = 'Liquidado / Quitado';
  } else if (overdueInstallmentsCount > 0) {
    loanStatus = `${overdueInstallmentsCount} Parcela(s) Atrasada(s)`;
  }

  // Identificar a data da última prestação ativa (não abatida)
  let lastActiveInstallment = null;
  const activeInstallments = eventsList
    .filter((ev) => ev.category === 'parcela_emprestimo' && !ev.isAbatida && ev.status !== 'Abatida')
    .sort((a, b) => a.date.localeCompare(b.date));

  if (activeInstallments.length > 0) {
    lastActiveInstallment = activeInstallments[activeInstallments.length - 1];
  } else {
    const allLoanInst = eventsList
      .filter((ev) => ev.category === 'parcela_emprestimo')
      .sort((a, b) => a.date.localeCompare(b.date));
    lastActiveInstallment = allLoanInst.length > 0 ? allLoanInst[allLoanInst.length - 1] : null;
  }

  // Contar parcelas abatidas por amortização extraordinária
  const abatedInstallments = eventsList.filter(
    (ev) => ev.category === 'parcela_emprestimo' && (ev.isAbatida || ev.status === 'Abatida')
  );
  const abatedInstallmentsCount = abatedInstallments.length;

  let advancedMonths = abatedInstallmentsCount;
  let advancedLabel = '';
  if (advancedMonths > 0) {
    if (advancedMonths >= 12) {
      const yrs = Math.floor(advancedMonths / 12);
      const rem = advancedMonths % 12;
      advancedLabel = rem > 0
        ? `${yrs} ${yrs === 1 ? 'ano' : 'anos'} e ${rem} ${rem === 1 ? 'mês' : 'meses'}`
        : `${yrs} ${yrs === 1 ? 'ano' : 'anos'}`;
    } else {
      advancedLabel = `${advancedMonths} ${advancedMonths === 1 ? 'mês' : 'meses'}`;
    }
  }

  // Calcular o total de juros futuros poupados por amortizações (ambas as estratégias: redução de prazo e redução de parcela)
  let totalSavedInterest = 0;

  // 1. Poupança por redução de prazo (parcelas com status Abatida)
  eventsList.forEach((ev) => {
    if (ev.category === 'parcela_emprestimo' && (ev.isAbatida || ev.status === 'Abatida')) {
      let origJur = 0;
      if (ev.description) {
        const match = ev.description.match(/\(([\d\s.,]+)\s*€?\s*capital\s*\+\s*([\d\s.,]+)\s*€?\s*juros/i);
        if (match && match[2]) {
          origJur = parseFloat(match[2].replace(/\s/g, '').replace(',', '.'));
        }
      }
      if (!origJur || isNaN(origJur)) {
        const origAmt = Number(ev.originalAmount || (ev.amount > 0 ? ev.amount : 218.47));
        origJur = Math.round(origAmt * 0.15 * 100) / 100;
      }
      totalSavedInterest += origJur;
    }
  });

  // 2. Poupança líquida de juros por redução do valor da parcela (Total reduzido nas prestações - Capital amortizado)
  const defaultInstAmt = Number(timeline.installmentAmount || 218.47);
  let totalInstallmentReduction = 0;
  eventsList.forEach((ev) => {
    if (ev.category === 'parcela_emprestimo' && !ev.isAbatida && ev.status !== 'Abatida' && ev.status !== 'Pago') {
      const origAmt = Number(ev.originalAmount || defaultInstAmt);
      const currentAmt = Number(ev.amount || 0);
      if (origAmt > currentAmt && currentAmt > 0) {
        totalInstallmentReduction += (origAmt - currentAmt);
      }
    }
  });

  let amortizedForInstallmentReduction = 0;
  eventsList.forEach((ev) => {
    if (ev.category === 'amortizacao' && ev.strategy === 'reduce_installment' && (ev.status === 'Amortizado' || ev.status === 'Concluído' || Boolean(ev.isCompleted))) {
      amortizedForInstallmentReduction += Number(ev.amount || ev.amortizationAmount || 0);
    }
  });

  if (totalInstallmentReduction > 0) {
    const netInterestSavedFromReduction = Math.max(0, totalInstallmentReduction - amortizedForInstallmentReduction);
    totalSavedInterest += netInterestSavedFromReduction;
  }

  totalSavedInterest = Math.round(totalSavedInterest * 100) / 100;

  const lastInstallmentDate = lastActiveInstallment ? lastActiveInstallment.date : (timeline.endDate || null);
  const monthlyPayment = Number(timeline.installmentAmount || 0) || (nextInstallment ? Number(nextInstallment.amount || 0) : (eventsList.find((e) => e.category === 'parcela_emprestimo')?.amount || 0));
  const remainingInstallmentsCount = Math.max(0, totalInstallmentsCount - paidInstallmentsCount);

  return {
    totalDebt,
    remainingBalance,
    totalPaid,
    totalPrincipalAmortized,
    totalContractInterestPaid,
    totalLateInterestPaid,
    totalInterestPaid,
    totalSavedInterest,
    paidInstallmentsCount,
    remainingInstallmentsCount,
    overdueInstallmentsCount,
    totalInstallmentsCount,
    monthlyPayment,
    progressPercent,
    nextInstallment,
    lastActiveInstallment,
    lastInstallmentDate,
    abatedInstallmentsCount,
    advancedMonths,
    advancedLabel,
    loanStatus
  };
}

/**
 * Calculate combined / consolidated metrics across multiple loan timelines
 */
export function getConsolidatedLoanMetrics(timelines, selectedIds = null) {
  const loanTimelines = (timelines || []).filter(
    (tl) => (tl.type === 'Empréstimo' || tl.type === 'emprestimo' || tl.type === 'loan' || tl.type === TimelineType.LOAN) && (!selectedIds || selectedIds.includes(tl.id))
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

  const progressPercent = totalContractedDebt > 0
    ? Math.min(100, Math.round((totalPrincipalAmortized / totalContractedDebt) * 100))
    : 0;

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
    progressPercent
  };
}

/**
 * Calculate Consolidated Loan Metrics at a specific future or past Horizon Month
 */
export function getConsolidatedLoanMetricsAtHorizon(timelines, targetHorizonMonth = null, selectedIds = null) {
  const loanTimelines = (timelines || []).filter(
    (tl) => (tl.type === 'Empréstimo' || tl.type === 'emprestimo' || tl.type === 'loan' || tl.type === TimelineType.LOAN) && (!selectedIds || selectedIds.includes(tl.id))
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
      if (ev.status === 'Cancelado' || ev.status === 'Excluido') return;
      const evMonth = ev.date.substring(0, 7);
      if (targetHorizonMonth && evMonth > targetHorizonMonth) return;

      if (ev.category === 'parcela_emprestimo') {
        const totalAmt = Number(ev.amount || 0);
        const principal = ev.principalAmount !== undefined
          ? Number(ev.principalAmount)
          : (ev.principalPaid !== undefined ? Number(ev.principalPaid) : Math.round(totalAmt * 0.82));
        amortizedForLoan += principal;
      } else if (ev.category === 'amortizacao') {
        const isAmortized = ev.status === 'Amortizado' || ev.status === 'Concluído' || Boolean(ev.isCompleted);
        if (isAmortized) {
          const amort = Number(ev.amortizationAmount || ev.amount || 0);
          amortizedForLoan += amort;
        }
      }
    });

    const cappedAmortized = Math.min(totalDebt, amortizedForLoan);
    totalPrincipalAmortized += cappedAmortized;
    totalRemainingBalance += Math.max(0, totalDebt - cappedAmortized);
  });

  return {
    totalContractedDebt,
    totalPrincipalAmortized,
    totalRemainingBalance
  };
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

  // 1. Coletar todo o valor inicial já investido anteriormente por subtipo (Poupança, Património, Outros) e Metas
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
      if (ev.category === 'investimento_patrimonio') {
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
          if (ev.category === 'investimento_outros' || ev.category?.includes('etf') || ev.category?.includes('acoes')) {
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

      // Se o aporte foi feito e liquidado (Investido/Pago) antes do mês de início da computação, soma ao património prévio
      if (startBound && ev.date < startBound && ev.category !== 'investimento_patrimonio') {
        const isDone = ev.status === 'Investido' || ev.status === 'invested' || ev.status === 'Pago' || ev.status === 'paid' || ev.isCompleted;
        if (isDone) {
          const amt = Number(ev.amount || 0);
          totalPriorInvestedAll += amt;
          if (ev.category === 'investimento_outros' || ev.category?.includes('etf') || ev.category?.includes('acoes')) {
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
  let totalMonthlyAportesRealized = 0;
  let totalMonthlyAportesPlannedCurrent = 0;
  let totalMonthlyAportesPlannedHorizon = 0;

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

    if (isIncome) {
      // Apenas o que foi efetivamente recebido entra no Saldo Líquido Realizado
      const isReceived = ev.status === EventStatus.RECEIVED || ev.status === 'received' || ev.status === 'Recebido' || ev.status === EventStatus.PAID || ev.status === 'paid' || ev.status === 'Pago' || ev.isCompleted;
      if (isUpToCurrent && isReceived) {
        totalReceived += amt;
      }
      if (isUpToCurrent && ev.status !== EventStatus.CANCELLED && ev.status !== 'Cancelado' && ev.status !== 'Excluido') {
        totalForecastIncomeUpToCurrent += amt;
      }
      if (isUpToHorizon && ev.status !== EventStatus.CANCELLED && ev.status !== 'Cancelado' && ev.status !== 'Excluido') {
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
      // Gastos/Empréstimos pagos ou sem pendência até ao período atual
      const isPaidOrNoPending = ev.status === EventStatus.PAID || ev.status === 'paid' || ev.status === 'Pago' || ev.status === EventStatus.RECEIVED || ev.status === 'received' || ev.status === 'Recebido' || ev.isCompleted || (isPast && ev.status !== EventStatus.PENDING && ev.status !== 'pending' && ev.status !== 'Pendente' && ev.status !== 'Atrasada' && ev.status !== 'Cancelado');
      const isPlanned = ev.status !== EventStatus.CANCELLED && ev.status !== 'Cancelado' && ev.status !== 'Excluido';

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
      // Investimentos realizados / aportados até ao período atual (Património é estático/consolidado)
      if (ev.category !== 'investimento_patrimonio') {
        const isInvestedDone = ev.status === EventStatus.INVESTED || ev.status === 'invested' || ev.status === 'Investido' || ev.status === EventStatus.PAID || ev.status === 'paid' || ev.status === 'Pago' || ev.isCompleted || (isPast && ev.status !== EventStatus.PENDING && ev.status !== 'pending' && ev.status !== 'Pendente' && ev.status !== 'Cancelado');
        if (isUpToCurrent && isInvestedDone) {
          totalInvested += amt;
          totalMonthlyAportesRealized += amt;
          if (ev.category === 'investimento_outros' || ev.category?.includes('etf') || ev.category?.includes('acoes') || ev.category?.includes('extra')) {
            totalAportesOutros += amt;
          } else {
            totalAportesPoupanca += amt;
          }
        }

        if (isUpToCurrent && ev.status !== EventStatus.CANCELLED && ev.status !== 'Cancelado' && ev.status !== 'Excluido') {
          totalPlannedInvestmentsUpToCurrent += amt;
          totalMonthlyAportesPlannedCurrent += amt;
        }
        if (isUpToHorizon && ev.status !== EventStatus.CANCELLED && ev.status !== 'Cancelado' && ev.status !== 'Excluido') {
          totalPlannedInvestmentsHorizon += amt;
          totalMonthlyAportesPlannedHorizon += amt;
          if (ev.category === 'investimento_outros' || ev.category?.includes('etf') || ev.category?.includes('acoes') || ev.category?.includes('extra')) {
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
    const isLoan = ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT || ev.isSystemLoanEvent;
    const isInvestment = ev.eventType === EventType.INVESTMENT;
    const isIncome = ev.eventType === EventType.INCOME;

    if (!isIncome) return;

    const amt = Number(ev.amount || 0);
    const isPast = ev.date <= todayStr;
    const isReceived = ev.status === EventStatus.RECEIVED || ev.status === 'received' || ev.status === 'Recebido' || ev.status === EventStatus.PAID || ev.status === 'paid' || ev.status === 'Pago' || ev.isCompleted;
    const evMonth = ev.date ? ev.date.substring(0, 7) : '';
    const evYear = ev.date ? ev.date.substring(0, 4) : '';
    const isAfterStartBound = !startBound || ev.date >= startBound;
    const isUpToCurrent = (ev.date <= todayStr || evMonth <= currentMonthKey) && isAfterStartBound;

    if (isUpToCurrent) {
      if (ev.status !== EventStatus.CANCELLED && ev.status !== 'Cancelado' && ev.status !== 'Excluido') {
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
      title: `Salário Mensal (${formatCurrency(monthlySalary)})`,
      description: `Transferência de vencimento líquido (${formatCurrency(monthlySalary)}).`,
      category: 'entrada_recorrente',
      status: isPast ? EventStatus.RECEIVED : EventStatus.PLANNED,
      priority: 'Normal',
      amount: Number(monthlySalary),
      isIncome: true,
      isCompleted: isPast,
      labels: ['Salário', 'Recorrente', isPast ? 'Recebido' : 'Previsto']
    });

    cur = addMonths(cur, 1);
    counter++;
  }

  return events;
}
