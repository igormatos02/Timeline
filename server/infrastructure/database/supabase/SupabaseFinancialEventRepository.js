import { IRepository } from '../../../domain/repositories/IRepository.js';
import { TimelineEvent } from '../../../domain/entities/TimelineEvent.js';
import { supabase } from './supabaseClient.js';
import { EventType, EventStatus } from '../../../../shared/enums/index.js';

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

    const eventType = row.event_type || EventType.EXPENSE;
    return new TimelineEvent({
      id: row.id,
      tenantId: row.tenant_id,
      timeboardId: row.timeboard_id,
      timelineId: row.timeline_id,
      name: row.name,
      title: row.name,
      description: row.description || '',
      eventType: eventType,
      event_type: eventType,
      category: row.category,
      amount: row.installment_amount !== undefined && row.installment_amount !== null ? Number(row.installment_amount) : Number(row.amount || 0),
      installmentAmount: row.installment_amount,
      installment_amount: row.installment_amount,
      installmentCapital: row.installment_capital,
      installment_capital: row.installment_capital,
      installmentInterest: row.installment_interest,
      installment_interest: row.installment_interest,
      installmentFee: row.installment_fee,
      installment_fee: row.installment_fee,
      aggregation: row.aggregation || 'monthly',
      date: row.date,
      dueDate: row.due_date,
      due_date: row.due_date,
      paidDate: row.paid_date,
      paid_date: row.paid_date,
      status: EventStatus.PENDING,
      automatic: row.automatic,
      isAutomatic: row.automatic,
      isRecurring: row.is_recurring,
      is_recurring: row.is_recurring,
      periodicity: row.aggregation || (row.is_recurring ? 'recorrente' : 'unica'),
      eventId: row.event_id || null,
      event_id: row.event_id || null,
      version: row.event_version !== undefined ? Number(row.event_version) : 0,
      eventVersion: row.event_version !== undefined ? Number(row.event_version) : 0,
      event_version: row.event_version !== undefined ? Number(row.event_version) : 0,
      dayOfMonth: row.day_of_month !== undefined ? row.day_of_month : null,
      isTerminated: Boolean(row.is_terminated),
      labels: Array.isArray(row.labels) ? row.labels : [],
      breakdownItems: Array.isArray(row.breakdown_items) ? row.breakdown_items : [],
      notes: row.notes || '',
      priority: row.priority || 'Normal',
      installmentNumber: row.installment_number,
      installment_number: row.installment_number,
      totalInstallments: row.total_installments,
      total_installments: row.total_installments,
      principalAmount: row.installment_capital !== undefined ? Number(row.installment_capital) : Number(row.principal_amount || 0),
      principal_amount: row.installment_capital !== undefined ? Number(row.installment_capital) : Number(row.principal_amount || 0),
      interestAmount: row.installment_interest !== undefined ? Number(row.installment_interest) : Number(row.interest_amount || 0),
      interest_amount: row.installment_interest !== undefined ? Number(row.installment_interest) : Number(row.interest_amount || 0),
      taxAmount: row.installment_fee !== undefined ? Number(row.installment_fee) : Number(row.tax_amount || 0),
      tax_amount: row.installment_fee !== undefined ? Number(row.installment_fee) : Number(row.tax_amount || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  _toRow(data) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validId = data.id && uuidRegex.test(data.id) ? data.id : undefined;
    const effectiveEventId = data.eventId || data.event_id || data.id || 'evt-default';
    const effectiveTenantId = (data.tenantId && uuidRegex.test(data.tenantId)) ? data.tenantId : ((data.tenant_id && uuidRegex.test(data.tenant_id)) ? data.tenant_id : null);
    const effectiveTimeboardId = (data.timeboardId && uuidRegex.test(data.timeboardId)) ? data.timeboardId : ((data.timeboard_id && uuidRegex.test(data.timeboard_id)) ? data.timeboard_id : null);
    const effectiveTimelineId = (data.timelineId && uuidRegex.test(data.timelineId)) ? data.timelineId : ((data.timeline_id && uuidRegex.test(data.timeline_id)) ? data.timeline_id : null);

    const fType = data.eventType || data.event_type || EventType.EXPENSE;
    const defaultCategory = (fType === EventType.INCOME) ? 'entrada_recorrente' : (fType === EventType.INVESTMENT) ? 'investimento_poupanca' : 'saida_recorrente';

    const instTotal = Number(data.installmentAmount !== undefined ? data.installmentAmount : (data.installment_amount !== undefined ? data.installment_amount : data.amount)) || 0;
    const instCap = Number(data.installmentCapital !== undefined ? data.installmentCapital : (data.installment_capital !== undefined ? data.installment_capital : (data.principalAmount || data.principal_amount))) || 0;
    const instInt = Number(data.installmentInterest !== undefined ? data.installmentInterest : (data.installment_interest !== undefined ? data.installment_interest : (data.interestAmount || data.interest_amount || data.interestPortion))) || 0;
    const instFee = Number(data.installmentFee !== undefined ? data.installmentFee : (data.installment_fee !== undefined ? data.installment_fee : (data.taxAmount || data.tax_amount))) || 0;

    const row = {
      event_id: effectiveEventId,
      event_version: data.eventVersion !== undefined ? Number(data.eventVersion) : (data.version !== undefined ? Number(data.version) : 0),
      is_terminated: Boolean(data.isTerminated || data.is_terminated),
      day_of_month: data.dayOfMonth !== undefined ? data.dayOfMonth : (data.day_of_month !== undefined ? data.day_of_month : null),

      tenant_id: effectiveTenantId,
      timeboard_id: effectiveTimeboardId,
      timeline_id: effectiveTimelineId,
      name: data.name || data.title || 'Evento Financeiro',
      description: data.description || '',
      event_type: fType,
      category: data.category || defaultCategory,

      installment_amount: instTotal,
      installment_capital: instCap,
      installment_interest: instInt,
      installment_fee: instFee,
      aggregation: data.aggregation || data.periodicity || 'monthly',

      date: data.date,
      due_date: data.dueDate || data.due_date || null,
      paid_date: data.paidDate || data.paid_date || null,
      automatic: Boolean(data.automatic !== undefined ? data.automatic : data.isAutomatic),
      is_recurring: Boolean(data.isRecurring !== undefined ? data.isRecurring : data.is_recurring),

      installment_number: data.installmentNumber !== undefined ? data.installmentNumber : data.installment_number || null,
      total_installments: data.totalInstallments !== undefined ? data.totalInstallments : data.total_installments || null,

      labels: Array.isArray(data.labels) ? data.labels : [],
      breakdown_items: Array.isArray(data.breakdownItems) ? data.breakdownItems : (Array.isArray(data.breakdown_items) ? data.breakdown_items : []),
      notes: data.notes || '',
      priority: data.priority || 'Normal',

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
    if (data.dayOfMonth !== undefined || data.day_of_month !== undefined) {
      row.day_of_month = data.dayOfMonth !== undefined ? data.dayOfMonth : data.day_of_month;
    }
    if (data.isTerminated !== undefined || data.is_terminated !== undefined) {
      row.is_terminated = Boolean(data.isTerminated || data.is_terminated);
    }
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (data.tenantId !== undefined || data.tenant_id !== undefined) {
      const val = data.tenantId || data.tenant_id;
      row.tenant_id = uuidRegex.test(val) ? val : '9e3c3070-d4db-43be-ab03-3f852a9a81da';
    }
    if (data.timeboardId !== undefined || data.timeboard_id !== undefined) {
      const val = data.timeboardId || data.timeboard_id;
      row.timeboard_id = uuidRegex.test(val) ? val : '5fcd8a1a-eac7-4405-9c8b-b9607e70b420';
    }
    if (data.timelineId !== undefined || data.timeline_id !== undefined) {
      const val = data.timelineId || data.timeline_id;
      row.timeline_id = val && uuidRegex.test(val) ? val : null;
    }
    if (data.name !== undefined || data.title !== undefined) row.name = data.name || data.title;
    if (data.description !== undefined) row.description = data.description;
    if (data.eventType !== undefined || data.event_type !== undefined) {
      row.event_type = data.eventType || data.event_type;
    }
    if (data.category !== undefined) row.category = data.category;
    if (data.amount !== undefined || data.installmentAmount !== undefined || data.installment_amount !== undefined) {
      row.installment_amount = Number(data.installmentAmount !== undefined ? data.installmentAmount : (data.installment_amount !== undefined ? data.installment_amount : data.amount)) || 0;
    }
    if (data.date !== undefined) row.date = data.date;
    if (data.dueDate !== undefined || data.due_date !== undefined) row.due_date = data.dueDate || data.due_date;
    if (data.paidDate !== undefined || data.paid_date !== undefined) row.paid_date = data.paidDate || data.paid_date;
    if (data.automatic !== undefined || data.isAutomatic !== undefined) row.automatic = Boolean(data.automatic !== undefined ? data.automatic : data.isAutomatic);
    if (data.isRecurring !== undefined || data.is_recurring !== undefined) row.is_recurring = Boolean(data.isRecurring !== undefined ? data.isRecurring : data.is_recurring);
    if (data.installmentNumber !== undefined || data.installment_number !== undefined) row.installment_number = data.installmentNumber !== undefined ? data.installmentNumber : data.installment_number;
    if (data.totalInstallments !== undefined || data.total_installments !== undefined) row.total_installments = data.totalInstallments !== undefined ? data.totalInstallments : data.total_installments;
    if (data.amortizationStrategy !== undefined || data.amortization_strategy !== undefined) row.amortization_strategy = data.amortizationStrategy || data.amortization_strategy;

    if (data.interestAmount !== undefined || data.interest_amount !== undefined || data.interestPortion !== undefined || data.interest_portion !== undefined || data.installmentInterest !== undefined || data.installment_interest !== undefined) {
      const val = Number(data.interestPortion !== undefined ? data.interestPortion : (data.interest_portion !== undefined ? data.interest_portion : (data.installmentInterest !== undefined ? data.installmentInterest : (data.installment_interest !== undefined ? data.installment_interest : (data.interestAmount !== undefined ? data.interestAmount : data.interest_amount))))) || 0;
      row.installment_interest = val;
    }
    if (data.principalAmount !== undefined || data.principal_amount !== undefined || data.installmentCapital !== undefined || data.installment_capital !== undefined) {
      const val = Number(data.principalAmount !== undefined ? data.principalAmount : (data.principal_amount !== undefined ? data.principal_amount : (data.installmentCapital !== undefined ? data.installmentCapital : data.installment_capital))) || 0;
      row.installment_capital = val;
    }
    if (data.taxAmount !== undefined || data.tax_amount !== undefined || data.installmentFee !== undefined || data.installment_fee !== undefined) {
      const val = Number(data.taxAmount !== undefined ? data.taxAmount : (data.tax_amount !== undefined ? data.tax_amount : (data.installmentFee !== undefined ? data.installmentFee : data.installment_fee))) || 0;
      row.installment_fee = val;
    }

    if (data.labels !== undefined) row.labels = Array.isArray(data.labels) ? data.labels : [];
    if (data.breakdownItems !== undefined || data.breakdown_items !== undefined) row.breakdown_items = Array.isArray(data.breakdownItems) ? data.breakdownItems : (Array.isArray(data.breakdown_items) ? data.breakdown_items : []);
    if (data.notes !== undefined) row.notes = data.notes;
    if (data.priority !== undefined) row.priority = data.priority;

    return row;
  }

  async getAllWithStatuses(filter = null) {
    // Buscar todos os eventos e fazer um LEFT JOIN simples com a tabela de status mensais
    let query = supabase
      .from(this.tableName)
      .select('*, financial_event_status(*)')
      .order('date', { ascending: true });

    if (filter && typeof filter === 'object') {
      if (filter.startDate) query = query.gte('date', filter.startDate);
      if (filter.endDate) query = query.lte('date', filter.endDate);
      if (filter.timeboardId) query = query.eq('timeboard_id', filter.timeboardId);
      if (filter.timelineId) query = query.eq('timeline_id', filter.timelineId);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('Fallback to separate getAll due to join error:', error.message);
      return this.getAll(filter);
    }

    const entities = (data || []).map((row) => {
      const entity = this._toEntity(row);
      const statuses = Array.isArray(row.financial_event_status) ? row.financial_event_status : [];
      entity.statusesList = statuses;
      return entity;
    });

    return typeof filter === 'function' ? entities.filter(filter) : entities;
  }

  async getAll(filter = null) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('date', { ascending: true });

    if (filter && typeof filter === 'object') {
      if (filter.startDate) query = query.gte('date', filter.startDate);
      if (filter.endDate) query = query.lte('date', filter.endDate);
      if (filter.timeboardId) query = query.eq('timeboard_id', filter.timeboardId);
      if (filter.timelineId) query = query.eq('timeline_id', filter.timelineId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching financial events from Supabase:', error);
      return [];
    }

    const entities = (data || []).map((row) => this._toEntity(row));
    return typeof filter === 'function' ? entities.filter(filter) : entities;
  }

  async findByDateRange(startDate, endDate, additionalFilter = {}) {
    return this.getAll({ startDate, endDate, ...additionalFilter });
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

  async deleteByTimelineId(timelineId) {
    if (!timelineId) return true;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('timeline_id', timelineId);

    if (error) {
      console.error(`Error deleting financial events for timeline ${timelineId} from Supabase:`, error);
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
