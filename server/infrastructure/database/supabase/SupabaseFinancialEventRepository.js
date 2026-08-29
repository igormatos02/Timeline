import { IRepository } from '../../../domain/repositories/IRepository.js';
import { TimelineEvent } from '../../../domain/entities/TimelineEvent.js';
import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabaseFinancialEventRepository
 * Implements IRepository for Financial Events stored in Supabase table 'financial_events'.
 */
export class SupabaseFinancialEventRepository extends IRepository {
  constructor() {
    super();
    this.tableName = 'financial_events';
  }

  _toEntity(row) {
    if (!row) return null;

    return new TimelineEvent({
      id: row.id,
      tenantId: row.tenant_id,
      timeboardId: row.timeboard_id,
      timelineId: row.timeline_id,
      name: row.name,
      title: row.name,
      description: row.description || '',
      financialType: row.financial_type,
      financial_type: row.financial_type,
      category: row.category,
      amount: row.amount,
      currency: row.currency,
      date: row.date,
      dueDate: row.due_date,
      due_date: row.due_date,
      paidDate: row.paid_date,
      paid_date: row.paid_date,
      status: row.status,
      automatic: row.automatic,
      isAutomatic: row.automatic,
      isRecurring: row.is_recurring,
      is_recurring: row.is_recurring,
      periodicity: row.periodicity,
      // eventId is the canonical series key. Only set for recurring events.
      // For 'once' events, event_id equals the row's own id and must NOT be used as eventId.
      eventId: row.eventId,
      event_id: row.event_id || null,
      version: row.event_version !== undefined ? Number(row.event_version) : (row.version !== undefined ? Number(row.version) : 0),
      eventVersion: row.event_version !== undefined ? Number(row.event_version) : 0,
      event_version: row.event_version !== undefined ? Number(row.event_version) : 0,
      sobrepositionOver: row.sobreposition_over || null,
      dayOfMonth: row.day_of_month !== undefined ? row.day_of_month : null,
      isTerminated: Boolean(row.is_terminated),
      labels: Array.isArray(row.labels) ? row.labels : [],
      breakdownItems: Array.isArray(row.breakdown_items) ? row.breakdown_items : [],
      notes: row.notes || '',
      priority: row.priority || 'Normal',
      time: row.time || '09:00',
      installmentNumber: row.installment_number,
      installment_number: row.installment_number,
      totalInstallments: row.total_installments,
      total_installments: row.total_installments,
      amortizationStrategy: row.amortization_strategy,
      amortization_strategy: row.amortization_strategy,
      interestAmount: row.interest_amount,
      interest_amount: row.interest_amount,
      principalAmount: row.principal_amount,
      principal_amount: row.principal_amount,
      remainingDebtAfter: row.remaining_debt_after,
      remaining_debt_after: row.remaining_debt_after,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  _toRow(data) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validId = data.id && uuidRegex.test(data.id) ? data.id : undefined;
    const effectiveEventId = data.eventId || data.event_id || data.id || 'evt-default';

    const row = {
      event_id: effectiveEventId,
      event_version: data.eventVersion !== undefined ? Number(data.eventVersion) : (data.version !== undefined ? Number(data.version) : 0),
      sobreposition_over: data.sobrepositionOver || data.sobreposition_over || null,
      day_of_month: data.dayOfMonth !== undefined ? data.dayOfMonth : (data.day_of_month !== undefined ? data.day_of_month : null),
      is_terminated: Boolean(data.isTerminated || data.is_terminated),

      tenant_id: data.tenantId || data.tenant_id || 'tenant-igor',
      timeboard_id: data.timeboardId || data.timeboard_id || '5fcd8a1a-eac7-4405-9c8b-b9607e70b420',
      timeline_id: data.timelineId || data.timeline_id || null,
      name: data.name || data.title || 'Evento Financeiro',
      description: data.description || '',
      financial_type: data.financialType || data.financial_type || (data.isIncome ? 'entrada' : data.isInvestment ? 'investimento' : 'gasto'),
      category: data.category || 'saida_recorrente',
      amount: Number(data.amount) || 0,
      currency: data.currency || 'EUR',
      date: data.date,
      due_date: data.dueDate || data.due_date || null,
      paid_date: data.paidDate || data.paid_date || null,
      status: data.status || 'Pendente',
      automatic: Boolean(data.automatic !== undefined ? data.automatic : data.isAutomatic),
      is_recurring: Boolean(data.isRecurring !== undefined ? data.isRecurring : data.is_recurring),
      periodicity: data.periodicity || 'unico',

      installment_number: data.installmentNumber !== undefined ? data.installmentNumber : data.installment_number || null,
      total_installments: data.totalInstallments !== undefined ? data.totalInstallments : data.total_installments || null,
      amortization_strategy: data.amortizationStrategy || data.amortization_strategy || data.strategy || null,
      interest_amount: Number(data.interestAmount !== undefined ? data.interestAmount : data.interest_amount) || 0,
      principal_amount: Number(data.principalAmount !== undefined ? data.principalAmount : data.principal_amount) || 0,
      remaining_debt_after: Number(data.remainingDebtAfter !== undefined ? data.remainingDebtAfter : (data.remaining_debt_after || data.balanceAfter)) || null,

      labels: Array.isArray(data.labels) ? data.labels : [],
      breakdown_items: Array.isArray(data.breakdownItems) ? data.breakdownItems : (Array.isArray(data.breakdown_items) ? data.breakdown_items : []),
      notes: data.notes || '',
      priority: data.priority || 'Normal',
      time: data.time || '09:00',

      created_at: data.createdAt || data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    if (validId) {
      row.id = validId;
    }
    return row;
  }

  _partialToRow(data) {
    const row = {
      updated_at: new Date().toISOString()
    };
    if (data.eventId !== undefined || data.event_id !== undefined) {
      row.event_id = data.eventId || data.event_id;
    }
    if (data.eventVersion !== undefined || data.event_version !== undefined || data.version !== undefined) {
      row.event_version = data.eventVersion !== undefined ? Number(data.eventVersion) : (data.event_version !== undefined ? Number(data.event_version) : Number(data.version));
    }
    if (data.sobrepositionOver !== undefined || data.sobreposition_over !== undefined) {
      row.sobreposition_over = data.sobrepositionOver || data.sobreposition_over;
    }
    if (data.dayOfMonth !== undefined || data.day_of_month !== undefined) {
      row.day_of_month = data.dayOfMonth !== undefined ? data.dayOfMonth : data.day_of_month;
    }
    if (data.isTerminated !== undefined || data.is_terminated !== undefined) {
      row.is_terminated = Boolean(data.isTerminated || data.is_terminated);
    }
    if (data.tenantId !== undefined || data.tenant_id !== undefined) row.tenant_id = data.tenantId || data.tenant_id;
    if (data.timeboardId !== undefined || data.timeboard_id !== undefined) row.timeboard_id = data.timeboardId || data.timeboard_id;
    if (data.timelineId !== undefined || data.timeline_id !== undefined) row.timeline_id = data.timelineId || data.timeline_id;
    if (data.name !== undefined || data.title !== undefined) row.name = data.name || data.title;
    if (data.description !== undefined) row.description = data.description;
    if (data.financialType !== undefined || data.financial_type !== undefined) row.financial_type = data.financialType || data.financial_type;
    if (data.category !== undefined) row.category = data.category;
    if (data.amount !== undefined) row.amount = Number(data.amount) || 0;
    if (data.currency !== undefined) row.currency = data.currency;
    if (data.date !== undefined) row.date = data.date;
    if (data.dueDate !== undefined || data.due_date !== undefined) row.due_date = data.dueDate || data.due_date;
    if (data.paidDate !== undefined || data.paid_date !== undefined) row.paid_date = data.paidDate || data.paid_date;
    if (data.status !== undefined) row.status = data.status;
    if (data.automatic !== undefined || data.isAutomatic !== undefined) row.automatic = Boolean(data.automatic !== undefined ? data.automatic : data.isAutomatic);
    if (data.isRecurring !== undefined || data.is_recurring !== undefined) row.is_recurring = Boolean(data.isRecurring !== undefined ? data.isRecurring : data.is_recurring);
    if (data.periodicity !== undefined) row.periodicity = data.periodicity;
    if (data.installmentNumber !== undefined || data.installment_number !== undefined) row.installment_number = data.installmentNumber !== undefined ? data.installmentNumber : data.installment_number;
    if (data.totalInstallments !== undefined || data.total_installments !== undefined) row.total_installments = data.totalInstallments !== undefined ? data.totalInstallments : data.total_installments;
    if (data.amortizationStrategy !== undefined || data.amortization_strategy !== undefined) row.amortization_strategy = data.amortizationStrategy || data.amortization_strategy;
    if (data.interestAmount !== undefined || data.interest_amount !== undefined) row.interest_amount = Number(data.interestAmount !== undefined ? data.interestAmount : data.interest_amount) || 0;
    if (data.principalAmount !== undefined || data.principal_amount !== undefined) row.principal_amount = Number(data.principalAmount !== undefined ? data.principalAmount : data.principal_amount) || 0;
    if (data.remainingDebtAfter !== undefined || data.remaining_debt_after !== undefined) row.remaining_debt_after = Number(data.remainingDebtAfter !== undefined ? data.remainingDebtAfter : data.remaining_debt_after);
    if (data.labels !== undefined) row.labels = Array.isArray(data.labels) ? data.labels : [];
    if (data.breakdownItems !== undefined || data.breakdown_items !== undefined) row.breakdown_items = Array.isArray(data.breakdownItems) ? data.breakdownItems : (Array.isArray(data.breakdown_items) ? data.breakdown_items : []);
    if (data.notes !== undefined) row.notes = data.notes;
    if (data.priority !== undefined) row.priority = data.priority;
    if (data.time !== undefined) row.time = data.time;

    return row;
  }

  async getAll(predicate = null) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching financial events from Supabase:', error);
      return [];
    }

    const entities = (data || []).map((row) => this._toEntity(row));
    return predicate ? entities.filter(predicate) : entities;
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
      console.error('Error creating financial event in Supabase:', error);
      throw new Error(`Failed to create financial event: ${error.message}`);
    }
    return this._toEntity(data);
  }

  async update(id, updates) {
    const rowUpdates = this._partialToRow(updates);
    delete rowUpdates.id; // Do not overwrite primary key

    const { data, error } = await supabase
      .from(this.tableName)
      .update(rowUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(`Error updating financial event ${id} in Supabase:`, error);
      throw new Error(`Failed to update financial event: ${error.message}`);
    }
    return this._toEntity(data);
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting financial event ${id} from Supabase:`, error);
      return false;
    }
    return true;
  }

  async updateMany(predicate, updates) {
    const all = await this.getAll();
    const toUpdate = all.filter(predicate);
    if (toUpdate.length === 0) return [];

    const ids = toUpdate.map(t => t.id);
    const rowUpdates = this._partialToRow(updates);
    delete rowUpdates.id;

    // Fast batch update in Supabase (1 single network call)
    const { data, error } = await supabase
      .from(this.tableName)
      .update(rowUpdates)
      .in('id', ids)
      .select();

    if (error) {
      console.error('Error in batch updateMany Supabase:', error);
      const batchSize = 100;
      for (let i = 0; i < ids.length; i += batchSize) {
        const chunk = ids.slice(i, i + batchSize);
        await supabase.from(this.tableName).update(rowUpdates).in('id', chunk);
      }
    }

    return (data || []).map(r => this._toEntity(r));
  }

  async deleteMany(predicate) {
    const all = await this.getAll();
    const toDelete = all.filter(predicate);
    for (const item of toDelete) {
      await this.delete(item.id);
    }
    return toDelete.length;
  }
}

export const financialEventRepository = new SupabaseFinancialEventRepository();
