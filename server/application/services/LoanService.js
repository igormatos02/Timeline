import { loanContractRepository } from '../../infrastructure/database/supabase/SupabaseLoanContractRepository.js';
import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { EventType, EventStatus } from '../../../shared/enums/index.js';

export class LoanService {
  async getLoanContracts() {
    return loanContractRepository.getAll();
  }

  async getLoanById(id) {
    return loanContractRepository.getById(id);
  }

  async getContractByTimelineId(timelineId) {
    return loanContractRepository.getByTimelineId(timelineId);
  }

  async createContract(contractData) {
    return loanContractRepository.create(contractData);
  }

  async updateContract(id, updates) {
    return loanContractRepository.update(id, updates);
  }

  async amortizeLoan({ loanId, amount, date, recalculateMode = 'prazo' }) {
    const loan = await loanContractRepository.getById(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);

    const amortAmount = Number(amount);
    const updatedLoanData = loan.applyAmortization ? loan.applyAmortization(amortAmount) : {
      remainingDebt: Math.max(0, loan.remainingDebt - amortAmount),
      amortizedCapital: (loan.amortizedCapital || 0) + amortAmount
    };

    const amortEvent = await eventRepository.create({
      timelineOriginId: loan.id,
      timelineOriginName: loan.name,
      timelineOriginIcon: '📉',
      date: date || new Date().toISOString().substring(0, 10),
      time: '12:00',
      title: `Amortização Extraordinária (${loan.name})`,
      description: `Amortização antecipada de ${amortAmount} €. Saldo restante: ${updatedLoanData.remainingDebt} €.`,
      eventType: EventType.AMORTIZATION,
      status: EventStatus.PAID,
      amount: amortAmount,
      balanceAfter: updatedLoanData.remainingDebt,
      isCompleted: true
    });

    await loanContractRepository.update(loanId, updatedLoanData);

    return {
      amortEvent,
      loan: await loanContractRepository.getById(loanId)
    };
  }
}

export const loanService = new LoanService();
