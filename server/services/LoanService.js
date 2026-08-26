import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';

export class LoanService {
  // --- Read ---
  async getLoanContracts() {
    return loanContractRepository.getAll();
  }

  async getLoanById(id) {
    return loanContractRepository.getById(id);
  }

  // --- Amortize ---
  async amortizeLoan({ loanId, amount, date, recalculateMode = 'prazo' }) {
    const loan = await loanContractRepository.getById(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);

    const amortAmount = Number(amount);
    const newRemainingDebt = Math.max(0, loan.remainingDebt - amortAmount);
    const newAmortizedCapital = (loan.amortizedCapital || 0) + amortAmount;

    const amortEvent = await eventRepository.create({
      timelineOriginId: loan.id,
      timelineOriginName: loan.name,
      timelineOriginIcon: '📉',
      date: date || new Date().toISOString().substring(0, 10),
      time: '12:00',
      title: `Amortização Extraordinária (${loan.name})`,
      description: `Amortização antecipada de ${amortAmount} €. Saldo restante: ${newRemainingDebt} €.`,
      category: 'amortizacao',
      status: 'Pago',
      amount: amortAmount,
      balanceAfter: newRemainingDebt,
      isCompleted: true
    });

    await loanContractRepository.update(loanId, {
      remainingDebt: newRemainingDebt,
      amortizedCapital: newAmortizedCapital
    });

    return {
      amortEvent,
      loan: await loanContractRepository.getById(loanId)
    };
  }
}

export const loanService = new LoanService();
