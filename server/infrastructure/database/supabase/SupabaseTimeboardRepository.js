import { supabase } from './supabaseClient.js';
import { Timeboard } from '../../../domain/entities/Timeboard.js';
import { IRepository } from '../../../domain/repositories/IRepository.js';
import { HeaderDefaultState, PaymentChannel } from '../../../../shared/enums/index.js';

const TABLE = 'timeboards';

// Maps database row (snake_case) to Domain Entity (camelCase)
function rowToEntity(row) {
  if (!row) return null;
  return new Timeboard({
    id: row.id,
    name: row.name,
    description: row.description,
    tenant: row.tenant,
    tenantId: row.tenant_id,
    userId: row.user_id || row.owner_id,
    ownerId: row.owner_id || row.user_id,
    type: row.type,
    currency: row.Currency || row.currency || 'EUR',
    computeFrom: row.compute_from || row.computeFrom || null,
    printTemplate: row.print_template || row.printTemplate || null,
    print_template: row.print_template || row.printTemplate || null,
    headerDefaultState: row.header_default_state || undefined,
    // Condominium settings (migration 0015)
    baseFeeAmount: row.base_fee_amount ?? null,
    feeChannel: row.fee_channel || null,
    // Owner notifications (migration 0019)
    notifyReceipts: Boolean(row.notify_receipts),
    notifyOverdue: Boolean(row.notify_overdue),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

// Maps Domain Entity (camelCase) to database columns (snake_case)
function entityToRow(data, isCreate = false) {
  const row = {};
  if (data.id !== undefined) row.id = data.id;
  if (data.name !== undefined) row.name = data.name;
  if (data.description !== undefined) row.description = data.description;
  if (data.tenant !== undefined) row.tenant = data.tenant;
  else if (isCreate) row.tenant = 'Global';

  if (data.tenantId !== undefined || data.tenant_id !== undefined) {
    row.tenant_id = data.tenantId || data.tenant_id;
  } else if (isCreate) {
    row.tenant_id = '9e3c3070-d4db-43be-ab03-3f852a9a81da';
  }

  const effectiveOwnerId = data.ownerId || data.owner_id || data.userId || data.user_id;
  if (effectiveOwnerId !== undefined) {
    row.owner_id = effectiveOwnerId;
  }

  if (data.type !== undefined) row.type = data.type;
  if (data.currency !== undefined) row.Currency = data.currency;
  if (data.Currency !== undefined) row.Currency = data.Currency;

  if (data.printTemplate !== undefined || data.print_template !== undefined) {
    row.print_template = data.print_template ?? data.printTemplate;
  }

  if (Object.values(HeaderDefaultState).includes(data.headerDefaultState)) row.header_default_state = data.headerDefaultState;

  // Condominium settings (migration 0015)
  if (data.baseFeeAmount !== undefined) {
    const amount = data.baseFeeAmount === null || data.baseFeeAmount === '' ? null : Number(data.baseFeeAmount);
    row.base_fee_amount = Number.isFinite(amount) ? amount : null;
  }
  if (Object.values(PaymentChannel).includes(data.feeChannel)) row.fee_channel = data.feeChannel;
  // Owner notifications (migration 0019)
  if (typeof data.notifyReceipts === 'boolean') row.notify_receipts = data.notifyReceipts;
  if (typeof data.notifyOverdue === 'boolean') row.notify_overdue = data.notifyOverdue;

  const rawComputeFrom = data.computeFrom !== undefined ? data.computeFrom : data.compute_from;
  if (rawComputeFrom !== undefined) {
    if (!rawComputeFrom || rawComputeFrom === '1900-01' || rawComputeFrom === '1900-01-01') {
      row.compute_from = '1900-01-01';
    } else {
      row.compute_from = rawComputeFrom.length === 7 ? `${rawComputeFrom}-01` : rawComputeFrom;
    }
  }

  if (!isCreate) row.updated_at = new Date().toISOString();
  return row;
}

export class SupabaseTimeboardRepository extends IRepository {
  async getAll(filterFn = null) {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw new Error(`Supabase getAll [timeboards]: ${error.message}`);
    const rows = filterFn ? data.filter(filterFn) : data;
    return rows.map(rowToEntity);
  }

  async getById(id) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase getById [timeboards]: ${error.message}`);
    return rowToEntity(data);
  }

  async findByOwnerId(ownerId) {
    if (!ownerId) return [];
    const { data, error } = await supabase.from(TABLE).select('*').eq('owner_id', ownerId);
    if (error) throw new Error(`Supabase findByOwnerId [timeboards]: ${error.message}`);
    return (data || []).map(rowToEntity);
  }

  async findByTenant(tenant) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('tenant', tenant);
    if (error) throw new Error(`Supabase findByTenant [timeboards]: ${error.message}`);
    return (data || []).map(rowToEntity);
  }

  async create(data) {
    const row = entityToRow(data, true);
    const { data: created, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw new Error(`Supabase create [timeboards]: ${error.message}`);
    return rowToEntity(created);
  }

  async update(id, updates) {
    const row = entityToRow(updates, false);
    let { data, error } = await supabase.from(TABLE).update(row).eq('id', id).select().maybeSingle();
    // Before migration 0015 the condominium settings columns do not exist: save the rest
    if (error && /base_fee_amount|fee_channel|notify_receipts|notify_overdue/.test(error.message || '')) {
      const { base_fee_amount: _baseFee, fee_channel: _feeChannel, notify_receipts: _receipts, notify_overdue: _overdue, ...withoutSettings } = row;
      ({ data, error } = await supabase.from(TABLE).update(withoutSettings).eq('id', id).select().maybeSingle());
    }
    if (error) throw new Error(`Supabase update [timeboards]: ${error.message}`);
    return data ? rowToEntity(data) : null;
  }

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(`Supabase delete [timeboards]: ${error.message}`);
    return true;
  }
}

export const timeboardRepository = new SupabaseTimeboardRepository();
