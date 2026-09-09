import { supabase } from './supabaseClient.js';
import { Timeboard } from '../../../domain/entities/Timeboard.js';
import { IRepository } from '../../../domain/repositories/IRepository.js';

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
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

// Maps Domain Entity (camelCase) to database columns (snake_case)
function entityToRow(data) {
  const row = {};
  if (data.id !== undefined) row.id = data.id;
  if (data.name !== undefined) row.name = data.name;
  if (data.description !== undefined) row.description = data.description;
  row.tenant = data.tenant || 'Global';
  row.tenant_id = data.tenantId || data.tenant_id || '9e3c3070-d4db-43be-ab03-3f852a9a81da';
  if (data.user_id !== undefined) row.user_id = data.user_id;
  if (data.userId !== undefined) row.user_id = data.userId;
  if (data.owner_id !== undefined) row.owner_id = data.owner_id;
  if (data.ownerId !== undefined) row.owner_id = data.ownerId;
  if (data.type !== undefined) row.type = data.type;
  if (data.currency !== undefined) row.Currency = data.currency;
  if (data.Currency !== undefined) row.Currency = data.Currency;
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
    const row = entityToRow(data);
    const { data: created, error } = await supabase.from(TABLE).insert(row).select().single();
    if (error) throw new Error(`Supabase create [timeboards]: ${error.message}`);
    return rowToEntity(created);
  }

  async update(id, updates) {
    const row = entityToRow(updates);
    const { data: error } = await supabase.from(TABLE).update(row).eq('id', id).select().single();
    if (error) throw new Error(`Supabase update [timeboards]: ${error.message}`);
    return rowToEntity(data);
  }

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(`Supabase delete [timeboards]: ${error.message}`);
    return true;
  }
}

export const timeboardRepository = new SupabaseTimeboardRepository();
