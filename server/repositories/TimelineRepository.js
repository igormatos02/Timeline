import { supabase } from '../lib/supabaseClient.js';
import { Timeline } from '../models/Timeline.js';

const TABLE = 'timelines';

// Mapeia a row do Supabase (snake_case) → modelo da app (camelCase)
function rowToModel(row) {
  if (!row) return null;
  return new Timeline({
    id:              row.id,
    timeboardId:     row.timeboard_id,
    name:            row.name,
    type:            row.type,
    color:           row.color,
    description:     row.description,
    isSystemDefault: row.is_system_default,
    canDelete:       row.can_delete,
    startDate:       row.start_date,
    endDate:         row.end_date,
    status:          row.status,
    periodicity:     row.periodicity,
    tenantId:        row.tenant_id,
    createdAt:       row.created_at,
    updatedAt:       row.updated_at
  });
}

// Mapeia o modelo da app (camelCase) → colunas do Supabase (snake_case)
function modelToRow(data) {
  const row = {};
  if (data.timeboardId     !== undefined) row.timeboard_id     = data.timeboardId;
  if (data.timeboard_id    !== undefined) row.timeboard_id     = data.timeboard_id;
  if (data.name            !== undefined) row.name             = data.name;
  if (data.type            !== undefined) row.type             = data.type;
  if (data.color           !== undefined) row.color            = data.color;
  if (data.description     !== undefined) row.description      = data.description;
  if (data.isSystemDefault !== undefined) row.is_system_default = data.isSystemDefault;
  if (data.canDelete       !== undefined) row.can_delete       = data.canDelete;
  if (data.startDate       !== undefined) row.start_date       = data.startDate;
  if (data.start_date      !== undefined) row.start_date       = data.start_date;
  if (data.endDate         !== undefined) row.end_date         = data.endDate;
  if (data.end_date        !== undefined) row.end_date         = data.end_date;
  if (data.status          !== undefined) row.status           = data.status;
  if (data.periodicity     !== undefined) row.periodicity      = data.periodicity;
  if (data.tenantId        !== undefined) row.tenant_id        = data.tenantId;
  if (data.tenant_id       !== undefined) row.tenant_id        = data.tenant_id;
  return row;
}

export class TimelineRepository {

  async getAll(filterFn = null) {
    const { data, error } = await supabase.from(TABLE).select('*');
    if (error) throw new Error(`Supabase getAll [timelines]: ${error.message}`);
    const rows = filterFn ? data.filter(filterFn) : data;
    return rows.map(rowToModel);
  }

  async getById(id) {
    const { data, error } = await supabase
      .from(TABLE).select('*').eq('id', id).maybeSingle();
    if (error) throw new Error(`Supabase getById [timelines]: ${error.message}`);
    return rowToModel(data);
  }

  async findByTimeboardId(timeboardId) {
    const { data, error } = await supabase
      .from(TABLE).select('*').eq('timeboard_id', timeboardId);
    if (error) throw new Error(`Supabase findByTimeboardId [timelines]: ${error.message}`);
    return (data || []).map(rowToModel);
  }

  async findByType(type) {
    const { data, error } = await supabase
      .from(TABLE).select('*').eq('type', type);
    if (error) throw new Error(`Supabase findByType [timelines]: ${error.message}`);
    return (data || []).map(rowToModel);
  }

  async create(data) {
    const row = modelToRow(data);
    const { data: created, error } = await supabase
      .from(TABLE).insert(row).select().single();
    if (error) throw new Error(`Supabase create [timelines]: ${error.message}`);
    return rowToModel(created);
  }

  async update(id, updates) {
    const row = modelToRow(updates);
    const { data, error } = await supabase
      .from(TABLE).update(row).eq('id', id).select().single();
    if (error) throw new Error(`Supabase update [timelines]: ${error.message}`);
    return rowToModel(data);
  }

  async delete(id) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id);
    if (error) throw new Error(`Supabase delete [timelines]: ${error.message}`);
    return true;
  }
}

export const timelineRepository = new TimelineRepository();
