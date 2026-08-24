import { addDays, addWeeks, addMonths, addYears, format, parseISO, isBefore, isAfter, differenceInDays } from 'date-fns';
import { generateUUID } from './uuid.js';

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

/**
 * Calculate combined / consolidated metrics across multiple loan timelines
 */
export function getConsolidatedLoanMetrics(timelines, selectedIds = null) {
  const loanTimelines = (timelines || []).filter(
    (tl) => tl.type === 'Empréstimo' && (!selectedIds || selectedIds.includes(tl.id))
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
    totalContractedDebt += Number(tl.totalDebt || 0);
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
 * Calculate metrics for Financial (Entradas, Gastos, Investimentos, Balanço) timelines
 */
export function getFinancialMetrics(timeline, events = []) {
  const allEvents = events.length > 0 ? events : (timeline.events || []);
  const todayStr = '2026-08-21';
  const currentMonthKey = todayStr.substring(0, 7); // '2026-08'
  const currentYearKey = todayStr.substring(0, 4); // '2026'
  const currentMonthDate = parseISO(`${currentMonthKey}-01`);
  const oneYearAheadDate = addMonths(currentMonthDate, 12);
  const oneYearAheadKey = format(oneYearAheadDate, 'yyyy-MM');

  let totalReceived = 0;
  let totalForecastIncome = 0;
  let annualProjectedIncome = 0;
  let currentMonthIncome = 0;
  let currentMonthIncomeReceived = 0;
  let totalPaidExpenses = 0;
  let totalPlannedExpenses = 0;
  let totalInvested = 0;
  let totalPlannedInvestments = 0;

  let nextIncome = null;
  let nextExpense = null;

  let currentMonthExpenses = 0;
  let currentMonthExpensesPaid = 0;
  let currentYearExpenses = 0;
  const expenseMonthsSet = new Set();
  let monthlyExpensesSum = 0;

  allEvents.forEach((ev) => {
    const amt = Number(ev.amount || 0);
    const isPast = ev.date <= todayStr;
    const isLoan = ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || ev.timelineOriginId === 'tl-loan-jeep' || ev.timelineOriginId === 'tl-loan-dacia' || ev.timelineOriginId === 'tl-loan-casa1' || ev.timelineOriginId === 'tl-loan-casa2' || ev.timelineOriginId === 'tl-loan-80004197726';
    const isIncome = (ev.financialType === 'entrada' || ev.isIncome || (ev.category && ev.category.startsWith('entrada'))) && !ev.isExpense && !ev.isInvestment && !isLoan;
    const isExpense = ev.financialType === 'gasto' || ev.isExpense || (ev.category && ev.category.startsWith('saida')) || ev.category === 'gasto' || isLoan;
    const isInvestment = ev.financialType === 'investimento' || ev.isInvestment || (ev.category && ev.category.startsWith('investimento'));

    const evMonth = ev.date ? ev.date.substring(0, 7) : '';

    if (isIncome) {
      if (isPast && ev.status === 'Recebido') totalReceived += amt;
      totalForecastIncome += amt;
      if (evMonth === currentMonthKey) {
        currentMonthIncome += amt;
        if (isPast && ev.status === 'Recebido') currentMonthIncomeReceived += amt;
      }
      if (evMonth >= currentMonthKey && evMonth < oneYearAheadKey) {
        annualProjectedIncome += amt;
      }
      if (!isPast && (!nextIncome || ev.date < nextIncome.date)) nextIncome = ev;
    } else if (isExpense) {
      if (isPast && (ev.status === 'Pago' || ev.isCompleted)) totalPaidExpenses += amt;
      totalPlannedExpenses += amt;
      if (!isPast && (!nextExpense || ev.date < nextExpense.date)) nextExpense = ev;

      const evYear = ev.date ? ev.date.substring(0, 4) : '';
      if (evMonth === currentMonthKey) {
        currentMonthExpenses += amt;
        if (isPast && (ev.status === 'Pago' || ev.isCompleted)) currentMonthExpensesPaid += amt;
      }
      if (evYear === currentYearKey) {
        currentYearExpenses += amt;
      }
      if (evMonth) {
        expenseMonthsSet.add(evMonth);
        monthlyExpensesSum += amt;
      }
    } else if (isInvestment) {
      if (isPast && (ev.status === 'Investido' || ev.status === 'Pago' || ev.isCompleted)) totalInvested += amt;
      totalPlannedInvestments += amt;
    }
  });

  const monthlyAverageExpenses = expenseMonthsSet.size > 0 ? (monthlyExpensesSum / expenseMonthsSet.size) : (currentMonthExpenses || 1040);
  const projectedAnnualExpenses = currentYearExpenses > 0 ? currentYearExpenses : (monthlyAverageExpenses * 12);

  const netRealized = totalReceived - totalPaidExpenses - totalInvested;
  const netProjected = totalForecastIncome - totalPlannedExpenses - totalPlannedInvestments;
  const savingsRate = totalReceived > 0 ? Math.round(((totalInvested + Math.max(0, netRealized)) / totalReceived) * 100) : 0;

  return {
    totalReceived,
    totalForecastIncome,
    annualProjectedIncome,
    currentMonthIncome,
    currentMonthIncomeReceived,
    totalPaidExpenses,
    totalPlannedExpenses,
    totalInvested,
    totalPlannedInvestments,
    currentMonthExpenses,
    currentMonthExpensesPaid,
    monthlyAverageExpenses,
    projectedAnnualExpenses,
    netRealized,
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
export function getIncomeMetrics(timeline, events = []) {
  const allEvents = events.length > 0 ? events : (timeline.events || []);
  const todayStr = '2026-08-21';

  let totalReceived = 0;
  let totalForecast = 0;
  let receivedCount = 0;
  let plannedCount = 0;
  let monthlyRecurring = Number(timeline.monthlySalary || 3300.00);
  let nextIncome = null;

  allEvents.forEach((ev) => {
    const amt = Number(ev.amount || 0);
    const isPast = ev.date <= todayStr;
    const isReceived = ev.status === 'Recebido';

    if (isPast) {
      if (isReceived) {
        totalReceived += amt;
        receivedCount++;
        totalForecast += amt;
      } else {
        // Entrada passada não recebida (Em Atraso)
      }
    } else {
      // Futuro a partir da data de hoje: considera-se que vão ser recebidos
      totalForecast += amt;
      plannedCount++;
      if (!nextIncome || ev.date < nextIncome.date) {
        nextIncome = ev;
      }
    }
  });

  return {
    totalReceived,
    totalForecast,
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
      status: isPast ? 'Recebido' : 'Previsto',
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
