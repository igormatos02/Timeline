import { ITodoRepository } from '../../../domain/repositories/ITodoRepository.js';
import { Todo } from '../../../domain/entities/Todo.js';
import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabaseTodoRepository
 * Manages To Do items in table 'to_do'.
 */
export class SupabaseTodoRepository extends ITodoRepository {
  constructor() {
    super();
    this.tableName = 'to_do';
  }

  _toEntity(row) {
    if (!row) return null;
    return new Todo({
      id: row.id,
      timeboardId: row.timeboard_id,
      timelineId: row.timeline_id,
      name: row.name,
      description: row.description || '',
      labels: Array.isArray(row.labels) ? row.labels : (typeof row.labels === 'string' ? JSON.parse(row.labels || '[]') : (row.labels || [])),
      notes: row.notes || '',
      priority: row.priority || '',
      status: row.status || '',
      doneDate: row.done_date || null,
      isObligation: Boolean(row.is_obligation),
      obligationPersonId: row.obligation_person_id || null,
      tenantId: row.tenant_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  _toRow(data) {
    const row = {};
    if (data.id !== undefined) row.id = data.id;
    if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
    if (data.timeboard_id !== undefined) row.timeboard_id = data.timeboard_id;
    if (data.timelineId !== undefined) row.timeline_id = data.timelineId;
    if (data.timeline_id !== undefined) row.timeline_id = data.timeline_id;
    if (data.name !== undefined) row.name = data.name;
    if (data.description !== undefined) row.description = data.description;
    if (data.labels !== undefined) row.labels = Array.isArray(data.labels) ? data.labels : (typeof data.labels === 'string' ? JSON.parse(data.labels || '[]') : []);
    if (data.notes !== undefined) row.notes = data.notes;
    if (data.priority !== undefined) row.priority = data.priority;
    if (data.status !== undefined) row.status = String(data.status).toLowerCase();
    if (data.doneDate !== undefined) row.done_date = data.doneDate;
    if (data.done_date !== undefined) row.done_date = data.done_date;
    if (data.isObligation !== undefined) row.is_obligation = Boolean(data.isObligation);
    if (data.is_obligation !== undefined) row.is_obligation = Boolean(data.is_obligation);
    if (data.obligationPersonId !== undefined) row.obligation_person_id = data.obligationPersonId;
    if (data.obligation_person_id !== undefined) row.obligation_person_id = data.obligation_person_id;
    if (data.tenantId !== undefined) row.tenant_id = data.tenantId;
    if (data.tenant_id !== undefined) row.tenant_id = data.tenant_id;
    row.updated_at = new Date().toISOString();
    return row;
  }

  async getAll(filterFn = null) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching to_do from Supabase:', error.message);
      return [];
    }

    const entities = (data || []).map((r) => this._toEntity(r));
    return typeof filterFn === 'function' ? entities.filter(filterFn) : entities;
  }

  async getById(id) {
    if (!id) return null;
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error(`Error fetching to_do ${id} from Supabase:`, error.message);
      return null;
    }
    return this._toEntity(data);
  }

  async getByTimelineId(timelineId) {
    if (!timelineId) return [];
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('timeline_id', timelineId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching to_do for timeline ${timelineId}:`, error.message);
      return [];
    }
    return (data || []).map((r) => this._toEntity(r));
  }

  async getByTimeboardId(timeboardId) {
    if (!timeboardId) return [];
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('timeboard_id', timeboardId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching to_do for timeboard ${timeboardId}:`, error.message);
      return [];
    }
    return (data || []).map((r) => this._toEntity(r));
  }

  async create(data) {
    const row = this._toRow(data);
    row.created_at = new Date().toISOString();

    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating to_do in Supabase:', error.message);
      throw new Error(`Failed to create to_do: ${error.message}`);
    }
    return this._toEntity(created);
  }

  async update(id, updates) {
    if (!id) return null;
    const row = this._toRow(updates);

    const { data, error } = await supabase
      .from(this.tableName)
      .update(row)
      .eq('id', id)
      .select()
      .maybeSingle();

    if (error) {
      console.error(`Error updating to_do ${id} in Supabase:`, error.message);
      throw new Error(`Failed to update to_do: ${error.message}`);
    }
    return this._toEntity(data);
  }

  async delete(id) {
    if (!id) return false;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', id);

    if (error) {
      console.error(`Error deleting to_do ${id} from Supabase:`, error.message);
      throw new Error(`Failed to delete to_do: ${error.message}`);
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
      console.error(`Error deleting to_do for timeline ${timelineId} from Supabase:`, error.message);
      return false;
    }
    return true;
  }
}

export const todoRepository = new SupabaseTodoRepository();
