import { loanContractRepository } from '../../infrastructure/database/supabase/SupabaseLoanContractRepository.js';

export class LoanContractService {
  async getContractByTimelineId(timelineId) {
    if (!timelineId) return null;
    return loanContractRepository.getByTimelineId(timelineId);
  }

  async getContractById(id) {
    if (!id) return null;
    return loanContractRepository.getById(id);
  }

  async createContract(contractData) {
    return loanContractRepository.create(contractData);
  }

  async updateContract(id, updates) {
    return loanContractRepository.update(id, updates);
  }

  async deleteContract(id) {
    return loanContractRepository.delete(id);
  }
}

export const loanContractService = new LoanContractService();
