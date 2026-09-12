import { IRepository } from '../../../domain/repositories/IRepository.js';
import { TimelineEvent } from '../../../domain/entities/TimelineEvent.js';
import { supabase } from './supabaseClient.js';
import { EventType, EventStatus, EventPriority, EventPeriodicity, EventRecurrence, AmortizationEventCategory, AmortizationStrategy } from '../../../../shared/enums/index.js';

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
      timelineType: row.timeline_type || null,
      timeline_type: row.timeline_type || null,
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

      recurrence:
        row.recurrence ||
        (row.is_recurring ? EventRecurrence.RECURRING : EventRecurrence.ONCE),

      periodicity:
        row.periodicity ||
        row.aggregation ||
        EventPeriodicity.MONTHLY,

      aggregation:
        row.periodicity ||
        row.aggregation ||
        EventPeriodicity.MONTHLY,

      limitDate: row.limit_date || row.recurrence_end_date || row.end_date || null,
      limit_date: row.limit_date || row.recurrence_end_date || row.end_date || null,
      recurrenceEndDate: row.limit_date || row.recurrence_end_date || row.end_date || null,
      endDate: row.limit_date || row.recurrence_end_date || row.end_date || null,

      date: row.date,
      dueDate: row.due_date,
      paidDate: row.paid_date,

      // Prefer the status stored directly on the row (e.g. amortization events).
      // FinancialEventService.getAllEvents will override this with the value from
      // the financial_event_status join for regular installments.
      status: row.is_terminated ? EventStatus.DELETED : (row.status || EventStatus.PENDING),
      isDeleted: Boolean(row.is_terminated || row.status === EventStatus.DELETED),
      sobrepositionOver: row.sobreposition_over || null,

      automatic: row.automatic,
      isAutomatic: row.automatic,

      isRecurring:
        row.recurrence === EventRecurrence.RECURRING ||
        row.recurrence === EventRecurrence.LIMITED ||
        Boolean(row.is_recurring),
      isExternal: Boolean(row.is_external),
      is_external: Boolean(row.is_external),

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

      labels: (() => {
        let rawLabels = row.labels;
        if (typeof rawLabels === 'string') {
          try { rawLabels = JSON.parse(rawLabels); } catch {}
        }
        return Array.isArray(rawLabels)
          ? rawLabels.filter(l => typeof l !== 'string' || (!l.startsWith('meta:initial:') && !l.startsWith('meta:target:')))
          : [];
      })(),

      breakdownItems: (() => {
        let rawItems = row.breakdown_items;
        if (typeof rawItems === 'string') {
          try { rawItems = JSON.parse(rawItems); } catch {}
        }
        return Array.isArray(rawItems)
          ? rawItems.filter(it => !it?._isFinancialMeta)
          : [];
      })(),

      initialInvestedAmount: (() => {
        let val = 0;
        let rawItems = row.breakdown_items;
        if (typeof rawItems === 'string') {
          try { rawItems = JSON.parse(rawItems); } catch {}
        }
        if (Array.isArray(rawItems)) {
          const meta = rawItems.find(it => it && it._isFinancialMeta);
          if (meta && meta.initialInvestedAmount != null) val = Number(meta.initialInvestedAmount);
        }
        let rawLabels = row.labels;
        if (typeof rawLabels === 'string') {
          try { rawLabels = JSON.parse(rawLabels); } catch {}
        }
        if (!val && Array.isArray(rawLabels)) {
          const l = rawLabels.find(lbl => typeof lbl === 'string' && lbl.startsWith('meta:initial:'));
          if (l) val = Number(l.replace('meta:initial:', '')) || 0;
        }
        if (!val && row.initial_invested_amount != null) {
          val = Number(row.initial_invested_amount);
        }
        return val || 0;
      })(),

      targetAmount: (() => {
        let val = 0;
        let rawItems = row.breakdown_items;
        if (typeof rawItems === 'string') {
          try { rawItems = JSON.parse(rawItems); } catch {}
        }
        if (Array.isArray(rawItems)) {
          const meta = rawItems.find(it => it && it._isFinancialMeta);
          if (meta && meta.targetAmount != null) val = Number(meta.targetAmount);
        }
        let rawLabels = row.labels;
        if (typeof rawLabels === 'string') {
          try { rawLabels = JSON.parse(rawLabels); } catch {}
        }
        if (!val && Array.isArray(rawLabels)) {
          const l = rawLabels.find(lbl => typeof lbl === 'string' && lbl.startsWith('meta:target:'));
          if (l) val = Number(l.replace('meta:target:', '')) || 0;
        }
        if (!val && row.target_amount != null) {
          val = Number(row.target_amount);
        }
        return val || 0;
      })(),

      notes: row.notes || '',

      priority: row.priority || EventPriority.NORMAL,

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

      isObligation: Boolean(row.is_obligation || row.isObligation),
      is_obligation: Boolean(row.is_obligation || row.isObligation),
      obligationPersonId: row.obligation_person_id || row.obligationPersonId || null,
      obligation_person_id: row.obligation_person_id || row.obligationPersonId || null,

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
          : '9e3c3070-d4db-43be-ab03-3f852a9a81da';

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
        data.amount !== undefined && data.amount !== null
          ? data.amount
          : data.installmentAmount !== undefined && data.installmentAmount !== null
            ? data.installmentAmount
            : data.amortizationAmount !== undefined && data.amortizationAmount !== null
              ? data.amortizationAmount
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
        data.title ||
        data.name ||
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

      recurrence:
        data.recurrence ||
        (data.isRecurring ? EventRecurrence.RECURRING : EventRecurrence.ONCE),

      periodicity:
        data.periodicity ||
        data.aggregation ||
        EventPeriodicity.MONTHLY,

      limit_date: (() => {
        const raw =
          data.limitDate ||
          data.limit_date ||
          data.recurrenceEndDate ||
          data.endDate ||
          null;
        if (!raw) return null;
        const str = String(raw).trim();
        if (/^\d{4}-\d{2}$/.test(str)) {
          const [y, m] = str.split('-').map(Number);
          const lastDay = new Date(y, m, 0).getDate();
          return `${str}-${String(lastDay).padStart(2, '0')}`;
        }
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          return str.substring(0, 10);
        }
        return null;
      })(),

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

      is_external:
        Boolean(
          data.isExternal !== undefined
            ? data.isExternal
            : (data.is_external !== undefined ? data.is_external : false)
        ),

      installment_number:
        data.installmentNumber !== undefined
          ? data.installmentNumber
          : null,

      total_installments:
        data.totalInstallments !== undefined
          ? data.totalInstallments
          : null,

      labels: (() => {
        let labels = Array.isArray(data.labels) ? [...data.labels] : [];
        labels = labels.filter(l => typeof l !== 'string' || (!l.startsWith('meta:initial:') && !l.startsWith('meta:target:')));
        if (data.initialInvestedAmount != null && Number(data.initialInvestedAmount) > 0) {
          labels.push(`meta:initial:${Number(data.initialInvestedAmount)}`);
        }
        if (data.targetAmount != null && Number(data.targetAmount) > 0) {
          labels.push(`meta:target:${Number(data.targetAmount)}`);
        }
        return labels;
      })(),

      breakdown_items: (() => {
        let items = Array.isArray(data.breakdownItems) ? [...data.breakdownItems] : [];
        items = items.filter(it => !it?._isFinancialMeta);
        const hasMeta = (data.initialInvestedAmount != null && Number(data.initialInvestedAmount) > 0) ||
                        (data.targetAmount != null && Number(data.targetAmount) > 0);
        if (hasMeta) {
          items.push({
            _isFinancialMeta: true,
            initialInvestedAmount: Number(data.initialInvestedAmount) || 0,
            targetAmount: Number(data.targetAmount) || 0
          });
        }
        return items;
      })(),

      notes: data.notes || '',

      priority: data.priority || EventPriority.NORMAL,

      is_obligation: Boolean(
        data.isObligation !== undefined
          ? data.isObligation
          : (data.is_obligation !== undefined ? data.is_obligation : false)
      ),

      obligation_person_id:
        (data.isObligation || data.is_obligation) &&
        (data.obligationPersonId || data.obligation_person_id) &&
        uuidRegex.test(data.obligationPersonId || data.obligation_person_id)
          ? (data.obligationPersonId || data.obligation_person_id)
          : null,

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

    if (data.tenantId !== undefined || data.tenant_id !== undefined) {
      const rawTenant = data.tenantId || data.tenant_id;
      row.tenant_id =
        rawTenant &&
          uuidRegex.test(rawTenant)
          ? rawTenant
          : '9e3c3070-d4db-43be-ab03-3f852a9a81da';
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

    if (data.name !== undefined) {
      row.name = data.name;
    }

    if (data.title !== undefined) {
      row.name = data.title;
    }

    if (data.description !== undefined) {
      row.description = data.description;
    }

    if (data.category !== undefined) {
      row.category = data.category;
    }

    if (
      data.eventType !== undefined ||
      data.event_type !== undefined
    ) {
      row.event_type =
        data.eventType ||
        data.event_type;
    }

    if (data.amount !== undefined && data.amount !== null) {
      row.installment_amount =
        Number(data.amount) || 0;
    } else if (data.installmentAmount !== undefined && data.installmentAmount !== null) {
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

    if (data.amortizationAmount !== undefined) {
      row.amortization_amount =
        data.amortizationAmount !== null
          ? Number(data.amortizationAmount)
          : null;
    }

    if (data.recurrence !== undefined) {
      row.recurrence = data.recurrence;
    } else if (data.isRecurring !== undefined) {
      row.recurrence = data.isRecurring ? EventRecurrence.RECURRING : EventRecurrence.ONCE;
    }

    if (data.periodicity !== undefined) {
      row.periodicity = data.periodicity;
    } else if (data.aggregation !== undefined) {
      row.periodicity = data.aggregation;
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

    if (data.isExternal !== undefined || data.is_external !== undefined) {
      row.is_external = Boolean(data.isExternal !== undefined ? data.isExternal : data.is_external);
    }

    if (data.installmentNumber !== undefined) {
      row.installment_number =
        data.installmentNumber;
    }

    if (data.totalInstallments !== undefined) {
      row.total_installments =
        data.totalInstallments;
    }

    if (data.labels !== undefined || data.initialInvestedAmount !== undefined || data.targetAmount !== undefined) {
      let labels = Array.isArray(data.labels) ? [...data.labels] : [];
      labels = labels.filter(l => typeof l !== 'string' || (!l.startsWith('meta:initial:') && !l.startsWith('meta:target:')));
      if (data.initialInvestedAmount != null && Number(data.initialInvestedAmount) > 0) {
        labels.push(`meta:initial:${Number(data.initialInvestedAmount)}`);
      }
      if (data.targetAmount != null && Number(data.targetAmount) > 0) {
        labels.push(`meta:target:${Number(data.targetAmount)}`);
      }
      row.labels = labels;
    }

    if (data.breakdownItems !== undefined || data.initialInvestedAmount !== undefined || data.targetAmount !== undefined) {
      let items = Array.isArray(data.breakdownItems) ? [...data.breakdownItems] : [];
      items = items.filter(it => !it?._isFinancialMeta);
      const hasMeta = (data.initialInvestedAmount != null && Number(data.initialInvestedAmount) > 0) ||
                      (data.targetAmount != null && Number(data.targetAmount) > 0);
      if (hasMeta) {
        items.push({
          _isFinancialMeta: true,
          initialInvestedAmount: Number(data.initialInvestedAmount) || 0,
          targetAmount: Number(data.targetAmount) || 0
        });
      }
      row.breakdown_items = items;
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

    if (data.limitDate !== undefined || data.limit_date !== undefined || data.recurrenceEndDate !== undefined || data.endDate !== undefined) {
      const raw = data.limitDate || data.limit_date || data.recurrenceEndDate || data.endDate || null;
      if (!raw) {
        row.limit_date = null;
      } else {
        const str = String(raw).trim();
        if (/^\d{4}-\d{2}$/.test(str)) {
          const [y, m] = str.split('-').map(Number);
          const lastDay = new Date(y, m, 0).getDate();
          row.limit_date = `${str}-${String(lastDay).padStart(2, '0')}`;
        } else if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
          row.limit_date = str.substring(0, 10);
        } else {
          row.limit_date = null;
        }
      }
    }

    if (data.isObligation !== undefined || data.is_obligation !== undefined) {
      row.is_obligation = Boolean(data.isObligation !== undefined ? data.isObligation : data.is_obligation);
    }

    if (data.obligationPersonId !== undefined || data.obligation_person_id !== undefined) {
      const rawId = data.obligationPersonId || data.obligation_person_id;
      row.obligation_person_id = rawId && uuidRegex.test(rawId) ? rawId : null;
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
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return null;
    }

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
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      console.warn(`Cannot update financial event: invalid UUID ${id}`);
      return null;
    }

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
    if (!id || typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return false;
    }

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

  async deleteByEventId(eventId) {
    if (!eventId) return true;
    const ids = Array.isArray(eventId) ? eventId.filter(Boolean).map(String) : [String(eventId)];
    if (ids.length === 0) return true;

    for (const singleId of ids) {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(singleId);
      if (isUuid) {
        await supabase.from(this.tableName).delete().eq('id', singleId);
      }
      await supabase.from(this.tableName).delete().eq('event_id', singleId);
    }
    return true;
  }

  async deleteByTimelineId(timelineId) {
    if (!timelineId) {
      return true;
    }

    const { error: err1 } = await supabase
      .from(this.tableName)
      .delete()
      .eq('timeline_id', timelineId);

    const { error: err2 } = await supabase
      .from(this.tableName)
      .delete()
      .eq('timeline_origin_id', timelineId);

    if (err1) {
      console.warn(`Warning deleting financial events by timeline_id ${timelineId}:`, err1.message);
    }
    if (err2) {
      console.warn(`Warning deleting financial events by timeline_origin_id ${timelineId}:`, err2.message);
    }

    return !err1 || !err2;
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