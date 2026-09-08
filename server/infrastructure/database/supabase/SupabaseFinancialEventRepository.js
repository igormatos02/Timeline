import { IRepository } from '../../../domain/repositories/IRepository.js';
import { TimelineEvent } from '../../../domain/entities/TimelineEvent.js';
import { supabase } from './supabaseClient.js';
import { EventType, EventStatus, AmortizationEventCategory, AmortizationStrategy } from '../../../../shared/enums/index.js';

/**
 * Infrastructure Adapter: SupabaseFinancialEventRepository
 * Implements IRepository for Financial Events stored in Supabase table
 * 'financial_events'.
 *
 * Entity fields are kept strictly aligned with TimelineEvent:
 *
 *   installmentAmount  <-> installment_amount
 *   installmentCapital <-> installment_capital
 *   installmentInterest <-> installment_interest
 *   installmentFee     <-> installment_fee
 */
export class SupabaseFinancialEventRepository extends IRepository {
  constructor() {
    super();
    this.tableName = 'financial_events';
  }

  // -------------------------------------------------------------------------
  // Persistence -> Domain
  // -------------------------------------------------------------------------

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

      eventType,
      category: row.category,

      // Loan/installment values.
      // IMPORTANT: use `!= null` (not `!== undefined`) so that NULL from
      // the DB column is treated as "not set" and returns null here.
      // Number(null) = 0 would silently zero all capital calculations.
      installmentAmount:
        row.installment_amount != null
          ? Number(row.installment_amount)
          : Number(row.amount || 0),

      // Returns null when not stored — getPrincipal() will derive a fallback.
      installmentCapital:
        row.installment_capital != null
          ? Number(row.installment_capital)
          : null,

      // Returns null when not stored — getInstallmentInterest() will derive a fallback.
      installmentInterest:
        row.installment_interest != null
          ? Number(row.installment_interest)
          : null,

      // Returns null when not stored — getInstallmentFee() defaults to 0.
      installmentFee:
        row.installment_fee != null
          ? Number(row.installment_fee)
          : null,

      aggregation: row.aggregation || 'monthly',

      date: row.date,
      dueDate: row.due_date,
      paidDate: row.paid_date,

      // Prefer the status stored directly on the row (e.g. amortization events).
      // FinancialEventService.getAllEvents will override this with the value from
      // the financial_event_status join for regular installments.
      status: row.status || EventStatus.PENDING,

      automatic: row.automatic,
      isAutomatic: row.automatic,

      isRecurring: row.is_recurring,

      periodicity:
        row.aggregation ||
        (row.is_recurring ? 'recorrente' : 'unica'),

      eventId: row.event_id || null,

      version:
        row.event_version !== undefined
          ? Number(row.event_version)
          : 0,

      eventVersion:
        row.event_version !== undefined
          ? Number(row.event_version)
          : 0,

      dayOfMonth:
        row.day_of_month !== undefined
          ? row.day_of_month
          : null,

      isTerminated: Boolean(row.is_terminated),

      labels: Array.isArray(row.labels)
        ? row.labels
        : [],

      breakdownItems: Array.isArray(row.breakdown_items)
        ? row.breakdown_items
        : [],

      notes: row.notes || '',

      priority: row.priority || 'Normal',

      installmentNumber:
        row.installment_number !== undefined
          ? row.installment_number
          : null,

      totalInstallments:
        row.total_installments !== undefined
          ? row.total_installments
          : null,

      /*isCompleted: Boolean(
        row.is_completed ||
        row.status === 'paid' ||
        row.status === 'received' ||
        row.status === 'invested' ||
        row.status === 'amortized' ||
        row.status === 'completed' ||
        row.status === 'settled'
      ),*/

      isLocked: Boolean(row.is_locked),

      isSystemLoanEvent: Boolean(row.is_system_loan_event),

      amortizationAmount:
        row.amortization_amount != null
          ? Number(row.amortization_amount)
          : null,

      strategy:
        row.category === AmortizationEventCategory.REDUCE_INSTALLMENT
          ? AmortizationEventCategory.REDUCE_INSTALLMENT
          : row.category === AmortizationEventCategory.REDUCE_TERM
            ? AmortizationEventCategory.REDUCE_TERM
            : null,

      amortizationStrategy:
        row.category === AmortizationEventCategory.REDUCE_INSTALLMENT
          ? AmortizationEventCategory.REDUCE_INSTALLMENT
          : row.category === AmortizationEventCategory.REDUCE_TERM
            ? AmortizationEventCategory.REDUCE_TERM
            : null,

      remainingDebtAfter:
        row.remaining_debt_after != null
          ? Number(row.remaining_debt_after)
          : null,

      balanceAfter:
        row.balance_after != null
          ? Number(row.balance_after)
          : null,

      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  // -------------------------------------------------------------------------
  // Domain -> Persistence
  // -------------------------------------------------------------------------

  _toRow(data) {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    const validId =
      data.id && uuidRegex.test(data.id)
        ? data.id
        : undefined;

    const effectiveEventId =
      data.eventId ||
      data.event_id ||
      data.id ||
      'evt-default';

    const effectiveTenantId =
      data.tenantId && uuidRegex.test(data.tenantId)
        ? data.tenantId
        : data.tenant_id && uuidRegex.test(data.tenant_id)
          ? data.tenant_id
          : null;

    const effectiveTimeboardId =
      data.timeboardId && uuidRegex.test(data.timeboardId)
        ? data.timeboardId
        : data.timeboard_id && uuidRegex.test(data.timeboard_id)
          ? data.timeboard_id
          : null;

    const effectiveTimelineId =
      data.timelineId && uuidRegex.test(data.timelineId)
        ? data.timelineId
        : data.timeline_id && uuidRegex.test(data.timeline_id)
          ? data.timeline_id
          : null;

    const eventType =
      data.eventType ||
      data.event_type ||
      EventType.EXPENSE;

    const defaultCategory =
      eventType === EventType.INCOME
        ? 'entrada_recorrente'
        : eventType === EventType.INVESTMENT
          ? 'investimento_poupanca'
          : 'saida_recorrente';

    const installmentAmount =
      Number(
        data.installmentAmount !== undefined && data.installmentAmount !== null
          ? data.installmentAmount
          : data.amortizationAmount !== undefined && data.amortizationAmount !== null
            ? data.amortizationAmount
            : data.amount !== undefined && data.amount !== null
              ? data.amount
              : 0
      ) || 0;

    const installmentCapital =
      data.installmentCapital !== undefined && data.installmentCapital !== null
        ? Number(data.installmentCapital)
        : null;

    const installmentInterest =
      data.installmentInterest !== undefined && data.installmentInterest !== null
        ? Number(data.installmentInterest)
        : null;

    const installmentFee =
      data.installmentFee !== undefined && data.installmentFee !== null
        ? Number(data.installmentFee)
        : null;

    const row = {
      event_id: effectiveEventId,

      event_version:
        data.eventVersion !== undefined
          ? Number(data.eventVersion)
          : data.version !== undefined
            ? Number(data.version)
            : 0,

      is_terminated: Boolean(data.isTerminated),

      day_of_month:
        data.dayOfMonth !== undefined
          ? data.dayOfMonth
          : null,

      tenant_id: effectiveTenantId,
      timeboard_id: effectiveTimeboardId,
      timeline_id: effectiveTimelineId,

      name:
        data.name ||
        data.title ||
        'Evento Financeiro',

      description: data.description || '',

      event_type: eventType,

      category:
        data.category ||
        (data.strategy === AmortizationEventCategory.REDUCE_INSTALLMENT || data.amortizationStrategy === AmortizationEventCategory.REDUCE_INSTALLMENT
          ? AmortizationEventCategory.REDUCE_INSTALLMENT
          : data.strategy === AmortizationEventCategory.REDUCE_TERM || data.amortizationStrategy === AmortizationEventCategory.REDUCE_TERM
            ? AmortizationEventCategory.REDUCE_TERM
            : defaultCategory),

      // ---------------------------------------------------------------
      // ONLY TimelineEvent installment fields
      // ---------------------------------------------------------------

      installment_amount: installmentAmount,
      installment_capital: installmentCapital,
      installment_interest: installmentInterest,
      installment_fee: installmentFee,

      // Amortization event amount (how much capital is being amortized)
      amortization_amount:
        data.amortizationAmount != null
          ? Number(data.amortizationAmount)
          : null,

      //status: data.status || EventStatus.PENDING,

      aggregation:
        data.aggregation ||
        data.periodicity ||
        'monthly',

      date: data.date,

      due_date:
        data.dueDate !== undefined
          ? data.dueDate
          : null,

      paid_date:
        data.paidDate !== undefined
          ? data.paidDate
          : null,

      automatic:
        Boolean(
          data.automatic !== undefined
            ? data.automatic
            : data.isAutomatic
        ),

      is_recurring:
        Boolean(
          data.isRecurring !== undefined
            ? data.isRecurring
            : false
        ),

      installment_number:
        data.installmentNumber !== undefined
          ? data.installmentNumber
          : null,

      total_installments:
        data.totalInstallments !== undefined
          ? data.totalInstallments
          : null,

      labels:
        Array.isArray(data.labels)
          ? data.labels
          : [],

      breakdown_items:
        Array.isArray(data.breakdownItems)
          ? data.breakdownItems
          : [],

      notes: data.notes || '',

      priority: data.priority || 'Normal',

      created_at:
        data.createdAt ||
        new Date().toISOString(),

      updated_at:
        new Date().toISOString()
    };

    if (validId) {
      row.id = validId;
    }

    return row;
  }

  // -------------------------------------------------------------------------
  // Partial Domain -> Persistence
  // -------------------------------------------------------------------------

  _partialToRow(data) {
    const row = {
      updated_at: new Date().toISOString()
    };

    if (
      data.eventId !== undefined ||
      data.event_id !== undefined
    ) {
      row.event_id =
        data.eventId !== undefined
          ? data.eventId
          : data.event_id;
    }

    if (
      data.eventVersion !== undefined ||
      data.version !== undefined
    ) {
      row.event_version =
        data.eventVersion !== undefined
          ? Number(data.eventVersion)
          : Number(data.version);
    }

    if (
      data.dayOfMonth !== undefined
    ) {
      row.day_of_month = data.dayOfMonth;
    }

    if (
      data.isTerminated !== undefined
    ) {
      row.is_terminated =
        Boolean(data.isTerminated);
    }

    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

    if (data.tenantId !== undefined) {
      row.tenant_id =
        data.tenantId &&
          uuidRegex.test(data.tenantId)
          ? data.tenantId
          : null;
    }

    if (data.timeboardId !== undefined) {
      row.timeboard_id =
        data.timeboardId &&
          uuidRegex.test(data.timeboardId)
          ? data.timeboardId
          : null;
    }

    if (data.timelineId !== undefined) {
      row.timeline_id =
        data.timelineId &&
          uuidRegex.test(data.timelineId)
          ? data.timelineId
          : null;
    }

    if (
      data.name !== undefined ||
      data.title !== undefined
    ) {
      row.name =
        data.name !== undefined
          ? data.name
          : data.title;
    }

    if (data.description !== undefined) {
      row.description = data.description;
    }

    if (data.eventType !== undefined) {
      row.event_type = data.eventType;
    }

    if (data.category !== undefined) {
      row.category = data.category;
    }

    // ---------------------------------------------------------------
    // ONLY TimelineEvent installment fields
    // ---------------------------------------------------------------

    if (data.installmentAmount !== undefined) {
      row.installment_amount =
        Number(data.installmentAmount) || 0;
    }

    if (data.installmentCapital !== undefined) {
      row.installment_capital =
        data.installmentCapital !== null
          ? Number(data.installmentCapital)
          : null;
    }

    if (data.installmentInterest !== undefined) {
      row.installment_interest =
        data.installmentInterest !== null
          ? Number(data.installmentInterest)
          : null;
    }

    if (data.installmentFee !== undefined) {
      row.installment_fee =
        data.installmentFee !== null
          ? Number(data.installmentFee)
          : null;
    }

    if (data.aggregation !== undefined) {
      row.aggregation = data.aggregation;
    }

    if (data.date !== undefined) {
      row.date = data.date;
    }

    if (data.dueDate !== undefined) {
      row.due_date = data.dueDate;
    }

    if (data.paidDate !== undefined) {
      row.paid_date = data.paidDate;
    }

    if (data.automatic !== undefined) {
      row.automatic = Boolean(data.automatic);
    }

    if (data.isAutomatic !== undefined) {
      row.automatic = Boolean(data.isAutomatic);
    }

    if (data.isRecurring !== undefined) {
      row.is_recurring = Boolean(data.isRecurring);
    }

    if (data.installmentNumber !== undefined) {
      row.installment_number =
        data.installmentNumber;
    }

    if (data.totalInstallments !== undefined) {
      row.total_installments =
        data.totalInstallments;
    }

    if (data.labels !== undefined) {
      row.labels =
        Array.isArray(data.labels)
          ? data.labels
          : [];
    }

    if (data.breakdownItems !== undefined) {
      row.breakdown_items =
        Array.isArray(data.breakdownItems)
          ? data.breakdownItems
          : [];
    }

    if (data.notes !== undefined) {
      row.notes = data.notes;
    }

    if (data.priority !== undefined) {
      row.priority = data.priority;
    }

    if (data.category !== undefined) {
      row.category = data.category;
    } else if (data.strategy !== undefined || data.amortizationStrategy !== undefined) {
      const strat = data.strategy || data.amortizationStrategy;
      row.category =
        strat === AmortizationEventCategory.REDUCE_INSTALLMENT
          ? AmortizationEventCategory.REDUCE_INSTALLMENT
          : AmortizationEventCategory.REDUCE_TERM;
    }

    if (data.amortizationAmount !== undefined) {
      row.amortization_amount =
        data.amortizationAmount != null
          ? Number(data.amortizationAmount)
          : null;
    }

    return row;
  }

  // -------------------------------------------------------------------------
  // Queries
  // -------------------------------------------------------------------------

  async getAllWithStatuses(filter = null) {
    let query = supabase
      .from(this.tableName)
      .select('*, financial_event_status(*)')
      .order('date', { ascending: true });

    if (filter && typeof filter === 'object') {
      if (filter.startDate) {
        query = query.gte('date', filter.startDate);
      }

      if (filter.endDate) {
        query = query.lte('date', filter.endDate);
      }

      if (filter.timeboardId) {
        query = query.eq(
          'timeboard_id',
          filter.timeboardId
        );
      }

      if (filter.timelineId) {
        query = query.eq(
          'timeline_id',
          filter.timelineId
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.warn(
        'Fallback to separate getAll due to join error:',
        error.message
      );

      return this.getAll(filter);
    }

    const entities = (data || []).map((row) => {
      const entity = this._toEntity(row);

      const statuses = Array.isArray(
        row.financial_event_status
      )
        ? row.financial_event_status
        : [];

      entity.statusesList = statuses;

      return entity;
    });

    return typeof filter === 'function'
      ? entities.filter(filter)
      : entities;
  }

  async getAll(filter = null) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('date', { ascending: true });

    if (filter && typeof filter === 'object') {
      if (filter.startDate) {
        query = query.gte('date', filter.startDate);
      }

      if (filter.endDate) {
        query = query.lte('date', filter.endDate);
      }

      if (filter.timeboardId) {
        query = query.eq(
          'timeboard_id',
          filter.timeboardId
        );
      }

      if (filter.timelineId) {
        query = query.eq(
          'timeline_id',
          filter.timelineId
        );
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error(
        'Error fetching financial events from Supabase:',
        error
      );

      return [];
    }

    const entities = (data || []).map((row) =>
      this._toEntity(row)
    );

    return typeof filter === 'function'
      ? entities.filter(filter)
      : entities;
  }

  async findByDateRange(
    startDate,
    endDate,
    additionalFilter = {}
  ) {
    return this.getAll({
      startDate,
      endDate,
      ...additionalFilter
    });
  }

  async getById(id) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      return null;
    }

    return this._toEntity(data);
  }

  // -------------------------------------------------------------------------
  // CRUD
  // -------------------------------------------------------------------------

  async create(item) {
    const row = this._toRow(item);

    const { data, error } = await supabase
      .from(this.tableName)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error(
        'Error creating financial event in Supabase:',
        error
      );

      throw new Error(
        `Failed to create financial event: ${error.message}`
      );
    }

    return this._toEntity(data);
  }

  async update(id, updates) {
    const rowUpdates = this._partialToRow(updates);

    delete rowUpdates.id;

    const { data, error } = await supabase
      .from(this.tableName)
      .update(rowUpdates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error(
        `Error updating financial event ${id} in Supabase:`,
        error
      );

      throw new Error(
        `Failed to update financial event: ${error.message}`
      );
    }

    return this._toEntity(data);
  }

  async delete(id) {
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(
        `Error deleting financial event ${id} from Supabase:`,
        error
      );

      return false;
    }

    return true;
  }

  async deleteByTimelineId(timelineId) {
    if (!timelineId) {
      return true;
    }

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('timeline_id', timelineId);

    if (error) {
      console.error(
        `Error deleting financial events for timeline ${timelineId} from Supabase:`,
        error
      );

      return false;
    }

    return true;
  }

  async updateMany(predicate, updates) {
    const all = await this.getAll();
    const toUpdate = all.filter(predicate);

    if (toUpdate.length === 0) {
      return [];
    }

    const ids = toUpdate.map((t) => t.id);
    const rowUpdates = this._partialToRow(updates);

    delete rowUpdates.id;

    const { data, error } = await supabase
      .from(this.tableName)
      .update(rowUpdates)
      .in('id', ids)
      .select();

    if (error) {
      console.error(
        'Error in batch updateMany Supabase:',
        error
      );

      const batchSize = 100;

      for (let i = 0; i < ids.length; i += batchSize) {
        const chunk = ids.slice(i, i + batchSize);

        await supabase
          .from(this.tableName)
          .update(rowUpdates)
          .in('id', chunk);
      }
    }

    return (data || []).map((row) =>
      this._toEntity(row)
    );
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

export const financialEventRepository =
  new SupabaseFinancialEventRepository();