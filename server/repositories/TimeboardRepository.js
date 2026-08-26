import { supabase } from '../lib/supabaseClient.js';
import { Timeboard } from '../models/Timeboard.js';

const TABLE = 'timeboards';

// Mapeia a row do Supabase (snake_case) para o modelo da app (camelCase)
function rowToModel(row) {
  if (!row) return null;
  return new Timeboard({
    id: row.id,
    name: row.name,
    description: row.description,
    tenant: row.tenant,
    tenantId: row.tenant_id,
    userId: row.user_id,
    type: row.type,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  });
}

// Mapeia o modelo da app (camelCase) para as colunas do Supabase (snake_case)
function modelToRow(data) {
  const row = {};
  if (data.name !== undefined)        row.name        = data.name;
  if (data.description !== undefined) row.description = data.description;
  if (data.tenant !== undefined)      row.tenant      = data.tenant;
  if (data.tenant_id !== undefined)   row.tenant_id   = data.tenant_id;
  if (data.tenantId !== undefined)    row.tenant_id   = data.tenantId;
  if (data.user_id !== undefined)     row.user_id     = data.user_id;
  if (data.userId !== undefined)      row.user_id     = data.userId;
  if (data.type !== undefined)        row.type        = data.type;
  return row;
}

export class TimeboardRepository {

  async getAll(filterFn = null) {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw new Error(`Supabase getAll [timeboards]: ${error.message}`);
    const rows = filterFn ? data.filter(filterFn) : data;
    return rows.map(rowToModel);
  }

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase getById [timeboards]: ${error.message}`);
    return rowToModel(data);
  }

  async findByTenant(tenant) {
    const { data, error } = await supabase
      .from(TABLE).select('*').eq('tenant', tenant);
    if (error) throw new Error(`Supabase findByTenant [timeboards]: ${error.message}`);
    return (data || []).map(rowToModel);
  }

  async create(data) {
    const row = modelToRow(data);
    const { data: created, error } = await supabase
      .from(TABLE).insert(row).select().single();
    if (error) throw new Error(`Supabase create [timeboards]: ${error.message}`);
    return rowToModel(created);
  }

  async update(id, updates) {
    const row = modelToRow(updates);
    const { data, error } = await supabase
      .from(TABLE).update(row).eq('id', id).select().single();
    if (error) throw new Error(`Supabase update [timeboards]: ${error.message}`);
    return rowToModel(data);
  }

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(`Supabase delete [timeboards]: ${error.message}`);
    return true;
  }
}

export const timeboardRepository = new TimeboardRepository();
