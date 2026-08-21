import { addDays, addWeeks, addMonths, addYears, format, parseISO, isBefore, isAfter, differenceInDays } from 'date-fns';

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
      id: `loan-inst-${i}-${Date.now()}`,
      date: dueDateStr,
      time: '09:00',
      title: `Prestação #${i} de ${totalInstallments}`,
      description: `Pagamento de prestação contratual (${formatCurrency(principalAmount)} capital + ${formatCurrency(interestPortion)} juros).`,
      category: 'parcela_emprestimo',
      status: 'Pendente',
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
      const totalAmount = Number(ev.amount || 0);
      
      // Amortização de capital vs Juros embutidos
      let principal = ev.principalAmount !== undefined
        ? Number(ev.principalAmount)
        : (ev.interestPortion !== undefined ? Math.max(0, totalAmount - Number(ev.interestPortion)) : Math.round(totalAmount * 0.82 * 100) / 100);
      
      let interestPortion = ev.interestPortion !== undefined
        ? Number(ev.interestPortion)
        : Math.max(0, Math.round((totalAmount - principal) * 100) / 100);

      const lateInterest = Number(ev.interestAmount || 0);
      const isPaid = ev.status === 'Pago' || ev.isCompleted;
      
      // Check if overdue: date is before today and not paid
      let status = ev.status;
      try {
        const evDate = parseISO(ev.date);
        if (!isPaid && isBefore(evDate, today)) {
          status = 'Atrasada';
        } else if (!isPaid) {
          status = 'Pendente';
        }
      } catch (e) {}

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
      const amortAmount = Number(ev.amortizationAmount || ev.amount || 0);
      runningBalance = Math.max(0, Math.round((runningBalance - amortAmount) * 100) / 100);
      return {
        ...ev,
        balanceAfter: runningBalance,
        status: 'Concluído',
        isCompleted: true
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
  notes = ''
}) {
  const amortVal = Number(amortizationAmount);
  if (isNaN(amortVal) || amortVal <= 0) return eventsList;

  const amortEvent = {
    id: `amort-${Date.now()}`,
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
    labels: ['Amortização', 'Extraordinária']
  };

  let updatedList = [...eventsList, amortEvent];

  if (strategy === 'reduce_installment') {
    const futureUnpaid = updatedList.filter(
      (ev) => ev.category === 'parcela_emprestimo' && ev.status !== 'Pago' && ev.date >= amortizationDateStr
    );

    if (futureUnpaid.length > 0) {
      const state = recalculateLoanState(timeline, updatedList);
      const amortEvUpdated = state.find((e) => e.id === amortEvent.id);
      const remainingBalanceAfter = amortEvUpdated ? amortEvUpdated.balanceAfter : (Number(timeline.totalDebt) - amortVal);
      
      const newMonthlyPrincipal = Math.max(10, Math.round((remainingBalanceAfter / futureUnpaid.length) * 100) / 100);
      const estimatedInterest = Math.round(newMonthlyPrincipal * 0.18 * 100) / 100;
      const newTotal = newMonthlyPrincipal + estimatedInterest;

      updatedList = updatedList.map((ev) => {
        if (ev.category === 'parcela_emprestimo' && ev.status !== 'Pago' && ev.date >= amortizationDateStr) {
          return {
            ...ev,
            amount: newTotal,
            principalAmount: newMonthlyPrincipal,
            interestPortion: estimatedInterest
          };
        }
        return ev;
      });
    }
  } else {
    // Strategy: 'reduce_term'
    const recalculated = recalculateLoanState(timeline, updatedList);
    let zeroBalancePassed = false;
    updatedList = recalculated.filter((ev) => {
      if (ev.category !== 'parcela_emprestimo') return true;
      if (zeroBalancePassed && ev.status !== 'Pago') return false;
      if (ev.balanceAfter <= 0 && ev.amount <= 0) {
        zeroBalancePassed = true;
        return false;
      }
      if (ev.balanceAfter <= 0) {
        zeroBalancePassed = true;
      }
      return true;
    });
  }

  return recalculateLoanState(timeline, updatedList);
}

/**
 * Calculate Summary Metrics for the Loan Timeline Header
 */
export function getLoanMetrics(timeline, eventsList = []) {
  const totalDebt = Number(timeline.totalDebt || 0);
  
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

      if (ev.status === 'Pago' || ev.isCompleted) {
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
      const amort = Number(ev.amortizationAmount || ev.amount || 0);
      totalPaid += amort;
      totalPrincipalAmortized += amort;
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

  return {
    totalDebt,
    remainingBalance,
    totalPaid,
    totalPrincipalAmortized,
    totalContractInterestPaid,
    totalLateInterestPaid,
    totalInterestPaid,
    paidInstallmentsCount,
    overdueInstallmentsCount,
    totalInstallmentsCount,
    progressPercent,
    nextInstallment,
    loanStatus
  };
}
