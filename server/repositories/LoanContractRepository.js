import { JsonFileRepository } from './JsonFileRepository.js';
import { LoanContract } from '../models/LoanContract.js';

export class LoanContractRepository extends JsonFileRepository {
  constructor() {
    super('loan_contracts', LoanContract);
  }

  async findByTimelineId(timelineId) {
    return this.getAll((loan) => loan.timelineId === timelineId);
  }

  async findByContractNumber(contractNumber) {
    const all = await this.getAll((loan) => loan.contractNumber === contractNumber);
    return all.length > 0 ? all[0] : null;
  }
}

export const loanContractRepository = new LoanContractRepository();
