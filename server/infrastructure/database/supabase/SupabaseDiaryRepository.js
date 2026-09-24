import { IDiaryRepository } from '../../../domain/repositories/IDiaryRepository.js';
import { Diary } from '../../../domain/entities/Diary.js';
import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabaseDiaryRepository
 * Manages diary entries in table 'diaries'.
 */
export class SupabaseDiaryRepository extends IDiaryRepository {
  constructor() {
    super();
    this.tableName = 'diaries';
  }

  _toEntity(row) {
    if (!row) return null;
    return new Diary({
      id: row.id,
      timeboardId: row.timeboard_id,
      timelineId: row.timeline_id,
      name: row.name,
      description: row.description || '',
      labels: Array.isArray(row.labels) ? row.labels : (typeof row.labels === 'string' ? JSON.parse(row.labels || '[]') : (row.labels || [])),
      notes: row.notes || '',
      date: row.date || null,
      mood: row.mood || null,
      publishStatus: row.publish_status || null,
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
    if (data.date !== undefined) row.date = data.date ? String(data.date).substring(0, 10) : null;
    if (data.mood !== undefined) row.mood = data.mood;
    if (data.publishStatus !== undefined) row.publish_status = data.publishStatus;
    if (data.tenantId !== undefined) row.tenant_id = data.tenantId;
    if (data.tenant_id !== undefined) row.tenant_id = data.tenant_id;
    row.updated_at = new Date().toISOString();
    return row;
  }

  async getAll(filterFn = null) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching diaries from Supabase:', error.message);
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
      console.error(`Error fetching diary ${id} from Supabase:`, error.message);
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
      .order('date', { ascending: false });

    if (error) {
      console.error(`Error fetching diaries for timeline ${timelineId}:`, error.message);
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
      .order('date', { ascending: false });

    if (error) {
      console.error(`Error fetching diaries for timeboard ${timeboardId}:`, error.message);
      return [];
    }
    return (data || []).map((r) => this._toEntity(r));
  }

  async getByTimelineAndDate(timelineId, date) {
    if (!timelineId || !date) return [];
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('timeline_id', timelineId)
      .eq('date', String(date).substring(0, 10));

    if (error) {
      console.error(`Error fetching diaries for timeline ${timelineId} on ${date}:`, error.message);
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
      console.error('Error creating diary in Supabase:', error.message);
      throw new Error(`Failed to create diary: ${error.message}`);
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
      console.error(`Error updating diary ${id} in Supabase:`, error.message);
      throw new Error(`Failed to update diary: ${error.message}`);
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
      console.error(`Error deleting diary ${id} from Supabase:`, error.message);
      throw new Error(`Failed to delete diary: ${error.message}`);
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
      console.error(`Error deleting diaries for timeline ${timelineId} from Supabase:`, error.message);
      return false;
    }
    return true;
  }
}

export const diaryRepository = new SupabaseDiaryRepository();
