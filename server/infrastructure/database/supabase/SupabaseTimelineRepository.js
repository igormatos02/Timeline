import { supabase } from './supabaseClient.js';
import { Timeline } from '../../../domain/entities/Timeline.js';
import { LoanHeaderResultDTO } from '../../../../shared/dtos/LoanHeaderResultDTO.js';
import { ExpenseHeaderResultDTO } from '../../../../shared/dtos/ExpenseHeaderResultDTO.js';
import { IncomeHeaderResultDTO } from '../../../../shared/dtos/IncomeHeaderResultDTO.js';
import { InvestmentHeaderResultDTO } from '../../../../shared/dtos/InvestmentHeaderResultDTO.js';
import { IRepository } from '../../../domain/repositories/IRepository.js';

const TABLE = 'timelines';

// Maps database row (snake_case) to Domain Entity (camelCase)
function rowToEntity(row) {
  if (!row) return null;
  return new Timeline({
    id: row.id,
    timeboardId: row.timeboard_id,
    name: row.name,
    type: row.type,
    color: row.color,
    description: row.description,
    isSystemDefault: row.is_system_default,
    canDelete: row.can_delete,
    startDate: row.start_date,
    endDate: row.end_date,
    status: row.status,
    periodicity: row.periodicity,
    tenantId: row.tenant_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

// Maps Domain Entity (camelCase) to database columns (snake_case)
function entityToRow(data) {
  const row = {};
  if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
  if (data.timeboard_id !== undefined) row.timeboard_id = data.timeboard_id;
  if (data.name !== undefined) row.name = data.name;
  if (data.type !== undefined) row.type = data.type;
  if (data.color !== undefined) row.color = data.color;
  if (data.description !== undefined) row.description = data.description;
  if (data.isSystemDefault !== undefined) row.is_system_default = data.isSystemDefault;
  if (data.canDelete !== undefined) row.can_delete = data.canDelete;
  if (data.startDate !== undefined) row.start_date = data.startDate;
  if (data.start_date !== undefined) row.start_date = data.start_date;
  if (data.endDate !== undefined) row.end_date = data.endDate;
  if (data.end_date !== undefined) row.end_date = data.end_date;
  if (data.status !== undefined) row.status = data.status;
  if (data.periodicity !== undefined) row.periodicity = data.periodicity;
  if (data.tenantId !== undefined) row.tenant_id = data.tenantId;
  if (data.tenant_id !== undefined) row.tenant_id = data.tenant_id;
  return row;
}

export class SupabaseTimelineRepository extends IRepository {
  /**
   * Método de Infraestrutura: Executa a RPC Stored Procedure get_loan_timeline_metrics no Supabase
   */
  async fetchLoanMetrics(timelineId, referenceDate = null) {
    if (!timelineId) return null;
    const refDate = referenceDate || new Date().toISOString().substring(0, 10);
    try {
      const { data, error } = await supabase.rpc('get_loan_timeline_metrics', {
        p_timeline_id: timelineId,
        p_reference_date: refDate
      });
      if (error) {
        console.warn(`Error executing RPC get_loan_timeline_metrics for timeline ${timelineId}:`, error.message);
        return null;
      }
      return data && data.length > 0 ? LoanHeaderResultDTO.fromProcedureOutput(data[0]) : null;
    } catch (err) {
      console.warn(`Exception executing RPC get_loan_timeline_metrics:`, err.message);
      return null;
    }
  }

  /**
   * Método de Infraestrutura: Executa a RPC Stored Procedure get_expense_timeline_metrics no Supabase
   */
  async fetchExpenseMetrics(timelineId, referenceDate = null) {
    if (!timelineId) return null;
    const refDate = referenceDate || new Date().toISOString().substring(0, 10);
    try {
      const { data, error } = await supabase.rpc('get_expense_timeline_metrics', {
        p_timeline_id: timelineId,
        p_reference_date: refDate
      });
      if (error) {
        console.warn(`Error executing RPC get_expense_timeline_metrics for timeline ${timelineId}:`, error.message);
        return null;
      }
      return data && data.length > 0 ? ExpenseHeaderResultDTO.fromProcedureOutput(data[0]) : null;
    } catch (err) {
      console.warn(`Exception executing RPC get_expense_timeline_metrics:`, err.message);
      return null;
    }
  }

  /**
   * Método de Infraestrutura: Executa a RPC Stored Procedure get_income_timeline_metrics no Supabase
   */
  async fetchIncomeMetrics(timelineId, referenceDate = null) {
    if (!timelineId) return null;
    const refDate = referenceDate || new Date().toISOString().substring(0, 10);
    try {
      const { data, error } = await supabase.rpc('get_income_timeline_metrics', {
        p_timeline_id: timelineId,
        p_reference_date: refDate
      });
      if (error) {
        console.warn(`Error executing RPC get_income_timeline_metrics for timeline ${timelineId}:`, error.message);
        return null;
      }
      return data && data.length > 0 ? IncomeHeaderResultDTO.fromProcedureOutput(data[0]) : null;
    } catch (err) {
      console.warn(`Exception executing RPC get_income_timeline_metrics:`, err.message);
      return null;
    }
  }

  /**
   * Método de Infraestrutura: Executa a RPC Stored Procedure get_investment_timeline_metrics no Supabase
   */
  async fetchInvestmentMetrics(timelineId, referenceDate = null) {
    if (!timelineId) return null;
    const refDate = referenceDate || new Date().toISOString().substring(0, 10);
    try {
      const { data, error } = await supabase.rpc('get_investment_timeline_metrics', {
        p_timeline_id: timelineId,
        p_reference_date: refDate
      });
      if (error) {
        console.warn(`Error executing RPC get_investment_timeline_metrics for timeline ${timelineId}:`, error.message);
        return null;
      }
      return data && data.length > 0 ? InvestmentHeaderResultDTO.fromProcedureOutput(data[0]) : null;
    } catch (err) {
      console.warn(`Exception executing RPC get_investment_timeline_metrics:`, err.message);
      return null;
    }
  }

  async getAll(filterFn = null) {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw new Error(`Supabase getAll [timelines]: ${error.message}`);
    const rows = filterFn ? data.filter(filterFn) : data;
    return rows.map(rowToEntity);
  }

  async getAllByTimeboardId(timeboardId) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('timeboard_id', timeboardId);

    if (error) throw new Error(
      `Supabase getAllByTimeboardId [timelines]: ${error.message}`
    );

    const entities = data.map(rowToEntity);
    for (const entity of entities) {
      if (entity) {
        const typeLower = (entity.type || '').toLowerCase();
        if (typeLower === 'loan' || typeLower === 'empréstimo' || typeLower === 'emprestimo') {
          const metrics = await this.fetchLoanMetrics(entity.id);
          if (metrics) {
            entity.loanHeaderResult = metrics;
            entity.procedureMetrics = metrics;
            entity.metrics = metrics;
          }
        } else if (typeLower === 'expense' || typeLower === 'despesa' || typeLower === 'gastos') {
          const expenseMetrics = await this.fetchExpenseMetrics(entity.id);
          if (expenseMetrics) {
            entity.expenseHeaderResult = expenseMetrics;
            entity.procedureMetrics = expenseMetrics;
            entity.metrics = expenseMetrics;
          }
        }
      }
    }
    return entities;
  }

  async getById(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase getById [timelines]: ${error.message}`);
    const entity = rowToEntity(data);
    if (entity) {
      const typeLower = (entity.type || '').toLowerCase();
      if (typeLower === 'loan' || typeLower === 'empréstimo' || typeLower === 'emprestimo') {
        const metrics = await this.fetchLoanMetrics(id);
        if (metrics) {
          entity.loanHeaderResult = metrics;
          entity.procedureMetrics = metrics;
          entity.metrics = metrics;
        }
      } else if (typeLower === 'expense' || typeLower === 'despesa' || typeLower === 'gastos') {
        const expenseMetrics = await this.fetchExpenseMetrics(id);
        if (expenseMetrics) {
          entity.expenseHeaderResult = expenseMetrics;
          entity.procedureMetrics = expenseMetrics;
          entity.metrics = expenseMetrics;
        }
      }
    }
    return entity;
  }

  async findByTimeboardId(timeboardId) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('timeboard_id', timeboardId);
    if (error) throw new Error(`Supabase findByTimeboardId [timelines]: ${error.message}`);
    const entities = (data || []).map(rowToEntity);
    for (const entity of entities) {
      if (entity) {
        const typeLower = (entity.type || '').toLowerCase();
        if (typeLower === 'loan' || typeLower === 'empréstimo' || typeLower === 'emprestimo') {
          const metrics = await this.fetchLoanMetrics(entity.id);
          if (metrics) {
            entity.loanHeaderResult = metrics;
            entity.procedureMetrics = metrics;
            entity.metrics = metrics;
          }
        } else if (typeLower === 'expense' || typeLower === 'despesa' || typeLower === 'gastos') {
          const expenseMetrics = await this.fetchExpenseMetrics(entity.id);
          if (expenseMetrics) {
            entity.expenseHeaderResult = expenseMetrics;
            entity.procedureMetrics = expenseMetrics;
            entity.metrics = expenseMetrics;
          }
        }
      }
    }
    return entities;
  }

  async findByType(type) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('type', type);
    if (error) throw new Error(`Supabase findByType [timelines]: ${error.message}`);
    const entities = (data || []).map(rowToEntity);
    for (const entity of entities) {
      if (entity) {
        const typeLower = (entity.type || '').toLowerCase();
        if (typeLower === 'loan' || typeLower === 'empréstimo' || typeLower === 'emprestimo') {
          const metrics = await this.fetchLoanMetrics(entity.id);
          if (metrics) {
            entity.loanHeaderResult = metrics;
            entity.procedureMetrics = metrics;
            entity.metrics = metrics;
          }
        } else if (typeLower === 'expense' || typeLower === 'despesa' || typeLower === 'gastos') {
          const expenseMetrics = await this.fetchExpenseMetrics(entity.id);
          if (expenseMetrics) {
            entity.expenseHeaderResult = expenseMetrics;
            entity.procedureMetrics = expenseMetrics;
            entity.metrics = expenseMetrics;
          }
        }
      }
    }
    return entities;
  }

  async create(data) {
    const row = entityToRow(data);
    const { data: created, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw new Error(`Supabase create [timelines]: ${error.message}`);
    return rowToEntity(created);
  }

  async update(id, updates) {
    const row = entityToRow(updates);
    const { data, error } = await supabase.from(TABLE).update(row).eq('id', id).select().maybeSingle();
    if (error) throw new Error(`Supabase update [timelines]: ${error.message}`);
    return data ? rowToEntity(data) : null;
  }

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(`Supabase delete [timelines]: ${error.message}`);
    return true;
  }
}

export const timelineRepository = new SupabaseTimelineRepository();
