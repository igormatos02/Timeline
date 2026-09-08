import { EventStatus, EventType, TimelineStatus, isPositiveStatus } from '../../../../../shared/enums/index.js';

/**
 * Domain Service: LoanDomainService
 * Encapsulates calculation rules and metrics for Loans, Mortgages, Installments and Amortizations.
 */
export class LoanDomainService {
  /**
   * Filter events belonging to loans
   */
  filterEvents(events = [], timelineId = null) {
    return events.filter((ev) => {
      if (!ev || ev.isDeleted) return false;
      if (timelineId && (ev.timelineId === timelineId || ev.timelineOriginId === timelineId)) return true;
      return (
        ev.eventType === EventType.AMORTIZATION || ev.eventType === EventType.LOAN_INSTALLMENT
      );
    });
  }

  /**
   * Calculate metrics for a single loan timeline or consolidated active loans
   */
  calculateMetrics(loanTimeline, loanEvents = [], currentMonthKey = null, loanContract = null) {
    const isInactive = loanTimeline && (loanTimeline.status === TimelineStatus.INACTIVE || loanTimeline.status === 'inactive');

    const activeMonth = currentMonthKey || new Date().toISOString().substring(0, 7);

    // Excluir qualquer evento de amortização extraordinária - processar estritamente apenas parcelas do contrato (LOAN_INSTALLMENT)
    const sortedEvents = [...loanEvents]
      .filter((ev) => ev && !ev.isDeleted && (ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === 'LOAN_INSTALLMENT'))
      .sort((a, b) => {
        const numA = Number(a.installmentNumber || 0);
        const numB = Number(b.installmentNumber || 0);
        if (numA && numB) return numA - numB;
        return (a.date || '').localeCompare(b.date || '');
      });

    // Calcular a soma total de capital amortizável de todas as prestações da série
    const sumCapitalFromAllEvents = sortedEvents.reduce((sum, ev) => {
      const cap = Number(ev.installmentCapital !== undefined ? ev.installmentCapital : (ev.principalAmount || 0));
      return sum + cap;
    }, 0);

    // Obter o capital financiado total diretamente do contrato de empréstimo (ou fallback para a timeline / eventos)
    const contractCapital = Number(loanContract?.originalCapital !== undefined && Number(loanContract.originalCapital) > 0 ? loanContract.originalCapital : (loanContract?.original_capital || 0));
    const totalDebtFromTimeline = contractCapital || Number(loanTimeline?.totalDebt || 0) || sumCapitalFromAllEvents;

    // Calcular capital total amortizado somando a parcela de capital das prestações pagas
    const totalCapitalPaidFromEvents = sortedEvents.reduce((sum, ev) => {
      if (isPositiveStatus(ev.status) || ev.isCompleted) {
        const capitalPortion = Number(ev.installmentCapital !== undefined ? ev.installmentCapital : (ev.principalAmount || 0));
        return sum + capitalPortion;
      }
      return sum;
    }, 0);

    // Obter o saldo devedor restante baseado estritamente nas parcelas PAGAS
    const paidEventsWithRemaining = sortedEvents.filter(ev => (isPositiveStatus(ev.status) || ev.isCompleted) && ev.remainingDebtAfter !== undefined && ev.remainingDebtAfter !== null);
    const lastPaidEvent = paidEventsWithRemaining[paidEventsWithRemaining.length - 1];

    let calculatedRemainingDebt = totalDebtFromTimeline - totalCapitalPaidFromEvents;
    if (lastPaidEvent && lastPaidEvent.remainingDebtAfter !== undefined) {
      calculatedRemainingDebt = Number(lastPaidEvent.remainingDebtAfter);
    }

    const totalDebt = totalDebtFromTimeline;
    const remainingDebt = Math.max(0, Math.min(totalDebt, calculatedRemainingDebt));
    const amortizedCapital = Math.max(0, totalCapitalPaidFromEvents);

    const monthlyInstallment = Number(loanTimeline?.installmentAmount || (sortedEvents[0]?.installmentAmount || 0));

    const progressPercent = totalDebt > 0 ? Math.min(100, Math.round((amortizedCapital / totalDebt) * 100)) : 0;

    // Calcular agregações de juros, custos e contagem de parcelas
    let totalEstimatedInterest = 0;
    let paidCapital = 0;
    let paidInterest = 0;
    let futureCapital = 0;
    let futureInterest = 0;
    let paidInstallmentsCount = 0;
    let nextDueDate = null;

    const totalInstallmentsCount = sortedEvents.length || Number(loanContract?.totalInstallments || loanContract?.total_installments || 0);

    for (const ev of sortedEvents) {
      const cap = Number(ev.installmentCapital !== undefined ? ev.installmentCapital : (ev.principalAmount || 0));
      const intVal = Number(ev.interestPortion !== undefined ? ev.interestPortion : (ev.interestAmount || ev.interest_amount || 0));
      const feeVal = Number(ev.taxAmount !== undefined ? ev.taxAmount : (ev.installmentFee || ev.tax_amount || 0));
      const isPaidOrAbatida = isPositiveStatus(ev.status) || ev.isCompleted;

      totalEstimatedInterest += (intVal + feeVal);

      if (isPaidOrAbatida) {
        paidCapital += cap;
        paidInterest += (intVal + feeVal);
        paidInstallmentsCount++;
      } else {
        futureCapital += cap;
        futureInterest += (intVal + feeVal);
        if (!nextDueDate && ev.date) {
          nextDueDate = ev.date;
        }
      }
    }

    const totalLoanCost = totalDebt + totalEstimatedInterest;
    const paidTotal = paidCapital + paidInterest;
    // Garantir que a soma do capital futuro a pagar coincide exatamente com o Saldo Devedor / Capital ainda devido
    const normalizedFutureCapital = remainingDebt;
    const futureTotal = normalizedFutureCapital + futureInterest;
    const remainingInstallmentsCount = Math.max(0, totalInstallmentsCount - paidInstallmentsCount);
    const lastActiveInstallment = sortedEvents.filter(ev => !isPositiveStatus(ev.status)).pop() || sortedEvents[sortedEvents.length - 1];
    const estimatedPayoffDate = lastActiveInstallment?.date || loanContract?.endDate || loanContract?.end_date || null;

    const monthlyInstallmentsPaid = sortedEvents
      .filter(
        (ev) =>
          ev.date &&
          ev.date.startsWith(activeMonth) &&
          !ev.isDeleted &&
          (isPositiveStatus(ev.status) || ev.isCompleted)
      )
      .reduce((sum, ev) => sum + (Number(ev.amount || ev.installmentAmount) || 0), 0);

    return {
      isActive: !isInactive,
      totalDebt: Math.round(totalDebt * 100) / 100,
      original_capital: Math.round(totalDebt * 100) / 100,
      originalCapital: Math.round(totalDebt * 100) / 100,

      remainingDebt: Math.round(remainingDebt * 100) / 100,
      remaining_debt: Math.round(remainingDebt * 100) / 100,
      remainingBalance: Math.round(remainingDebt * 100) / 100,

      amortizedCapital: Math.round(amortizedCapital * 100) / 100,
      amortized_capital: Math.round(amortizedCapital * 100) / 100,
      paid_capital: Math.round(paidCapital * 100) / 100,

      monthlyInstallment: Math.round(monthlyInstallment * 100) / 100,
      monthlyInstallmentsPaid: Math.round(monthlyInstallmentsPaid * 100) / 100,
      current_installment_amount: Math.round(monthlyInstallment * 100) / 100,

      total_estimated_interest: Math.round(totalEstimatedInterest * 100) / 100,
      totalEstimatedInterest: Math.round(totalEstimatedInterest * 100) / 100,

      total_loan_cost: Math.round(totalLoanCost * 100) / 100,
      totalLoanCost: Math.round(totalLoanCost * 100) / 100,

      paid_interest: Math.round(paidInterest * 100) / 100,
      paid_total: Math.round(paidTotal * 100) / 100,

      future_capital: Math.round(remainingDebt * 100) / 100,
      future_interest: Math.round(futureInterest * 100) / 100,
      future_total: Math.round(futureTotal * 100) / 100,

      paid_installments: paidInstallmentsCount,
      total_installments: totalInstallmentsCount,
      remaining_installments: remainingInstallmentsCount,

      estimated_payoff_date: estimatedPayoffDate,
      next_due_date: nextDueDate,

      progressPercent,
      amortized_percent: progressPercent,
      amortizedPercent: progressPercent
    };
  }
}

export const loanDomainService = new LoanDomainService();
