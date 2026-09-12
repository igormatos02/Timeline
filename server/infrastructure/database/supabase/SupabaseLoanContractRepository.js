import { IRepository } from '../../../domain/repositories/IRepository.js';
import { LoanContract } from '../../../domain/entities/LoanContract.js';
import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabaseLoanContractRepository
 * Manages loan contract parameters in table 'loan_contracts'.
 */
export class SupabaseLoanContractRepository extends IRepository {
  constructor() {
    super();
    this.tableName = 'loan_contracts';
  }

  _toEntity(row) {
    if (!row) return null;
    return new LoanContract({
      id: row.id,
      timelineId: row.timeline_id,
      timeboardId: row.timeboard_id,
      contractNumber: row.contract_number,
      contractName: row.contract_name,
      category: row.category,
      bankName: row.bank_name,
      tanRate: Number(row.tan_rate || 0),
      spread: Number(row.spread || 0),
      rateType: row.rate_type,
      startDate: row.start_date,
      endDate: row.end_date,
      totalInstallments: Number(row.total_installments || 0),
      dueDay: Number(row.due_day || 15),
      installmentStampTax: Number(row.installment_stamp_tax || 0),
      processingFee: Number(row.processing_fee || 0),
      insuranceFee: Number(row.insurance_fee || 0),
      originalCapital: Number(row.original_capital || 0),
      system: row.system || 'price',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  _toRow(data) {
    const totalInst = Number(data.totalInstallments !== undefined ? data.totalInstallments : data.total_installments) || 1;
    const startDateVal = data.startDate || data.start_date || new Date().toISOString().substring(0, 10);
    let endDateVal = data.endDate || data.end_date || null;

    if (!endDateVal && startDateVal) {
      try {
        const d = new Date(startDateVal);
        d.setMonth(d.getMonth() + (totalInst - 1));
        endDateVal = d.toISOString().substring(0, 10);
      } catch (e) {
        endDateVal = startDateVal;
      }
    }

    const row = {
      timeline_id: data.timelineId || data.timeline_id || null,
      timeboard_id: data.timeboardId || data.timeboard_id || null,
      contract_number: data.contractNumber || data.contract_number || null,
      contract_name: data.contractName || data.contract_name || 'Contrato Crédito',
      category: data.category || 'auto_loan',
      bank_name: data.bankName || data.bank_name || null,

      tan_rate: Number(data.tanRate !== undefined ? data.tanRate : data.tan_rate) || 0,
      spread: Number(data.spread) || 0.0,
      rate_type: data.rateType || data.rate_type || 'fixed',

      start_date: startDateVal,
      end_date: endDateVal,
      total_installments: totalInst,
      due_day: Number(data.dueDay !== undefined ? data.dueDay : data.due_day) || 15,

      installment_stamp_tax: Number(data.installmentStampTax !== undefined ? data.installmentStampTax : data.installment_stamp_tax) || 0,
      processing_fee: Number(data.processingFee !== undefined ? data.processingFee : data.processing_fee) || 0.0,
      insurance_fee: Number(data.insuranceFee !== undefined ? data.insuranceFee : data.insurance_fee) || 0.0,

      original_capital: Number(data.originalCapital !== undefined ? data.originalCapital : data.original_capital) || 0,
      system: (typeof (data.system || data.amortizationSystem) === 'string' ? (data.system || data.amortizationSystem) : 'price')
    };

    if (data.id) {
      row.id = data.id;
    }
    return row;
  }

  async getByTimelineId(timelineId) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('timeline_id', timelineId)
      .maybeSingle();

    if (error || !data) return null;
    return this._toEntity(data);
  }

  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) return null;
    return this._toEntity(data);
  }

  async create(item) {
    const row = this._toRow(item);
    const { data, error } = await supabase
      .from(this.tableName)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating loan_contract in Supabase:', error);
      throw new Error(`Failed to create loan contract: ${error.message}`);
    }
    return this._toEntity(data);
  }

  async update(id, updates) {
    const row = this._toRow(updates);
    delete row.id;

    const { data, error } = await supabase
      .from(this.tableName)
      .update(row)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating loan_contract ${id} in Supabase:`, error);
      throw new Error(`Failed to update loan contract: ${error.message}`);
    }
    return this._toEntity(data);
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting loan_contract ${id} in Supabase:`, error);
      throw new Error(`Failed to delete loan contract: ${error.message}`);
    }
    return true;
  }

  async deleteByTimelineId(timelineId) {
    if (!timelineId) return true;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('timeline_id', timelineId);

    if (error) {
      console.error(`Error deleting loan_contract for timeline ${timelineId} in Supabase:`, error);
      return false;
    }
    return true;
  }
}

export const loanContractRepository = new SupabaseLoanContractRepository();
