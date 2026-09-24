import { IPocketRepository } from '../../../domain/repositories/IPocketRepository.js';
import { Pocket } from '../../../domain/entities/Pocket.js';
import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabasePocketRepository
 * Manages pocket goals/buckets in table 'pockets'.
 */
export class SupabasePocketRepository extends IPocketRepository {
  constructor() {
    super();
    this.tableName = 'pockets';
  }

  _toEntity(row) {
    if (!row) return null;
    return new Pocket({
      id: row.id,
      name: row.name,
      initialValue: Number(row.initial_value || 0),
      initial_value: Number(row.initial_value || 0),
      targetValue: Number(row.target_value || 0),
      target_value: Number(row.target_value || 0),
      has_target: row.has_target,
      timelineId: row.timeline_id,
      timeline_id: row.timeline_id,
      timeboardId: row.timeboard_id,
      timeboard_id: row.timeboard_id,
      dateCreated: row.date_created,
      date_created: row.date_created,
      dateClosed: row.date_closed || null,
      date_closed: row.date_closed || null
    });
  }

  _toRow(data) {
    const row = {};
    if (data.id !== undefined) row.id = data.id;
    if (data.name !== undefined) row.name = String(data.name).trim();
    if (data.initialValue !== undefined) row.initial_value = Number(data.initialValue) || 0;
    else if (data.initial_value !== undefined) row.initial_value = Number(data.initial_value) || 0;

    if (data.targetValue !== undefined) row.target_value = Number(data.targetValue) || 0;
    else if (data.target_value !== undefined) row.target_value = Number(data.target_value) || 0;

    if (data.hasTarget !== undefined) row.has_target = Boolean(data.hasTarget);
    else if (data.has_target !== undefined) row.has_target = Boolean(data.has_target);

    if (data.timelineId !== undefined) row.timeline_id = data.timelineId;
    else if (data.timeline_id !== undefined) row.timeline_id = data.timeline_id;

    if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
    else if (data.timeboard_id !== undefined) row.timeboard_id = data.timeboard_id;

    if (data.dateCreated !== undefined) row.date_created = data.dateCreated;
    else if (data.date_created !== undefined) row.date_created = data.date_created;

    if (data.dateClosed !== undefined) row.date_closed = data.dateClosed;
    else if (data.date_closed !== undefined) row.date_closed = data.date_closed;

    return row;
  }

  async getAll(filterFn = null) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('date_created', { ascending: true });

    if (error) {
      console.error('Error fetching pockets from Supabase:', error.message);
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
      console.error(`Error fetching pocket ${id} from Supabase:`, error.message);
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
      .order('date_created', { ascending: true });

    if (error) {
      console.error(`Error fetching pockets for timeline ${timelineId}:`, error.message);
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
      .order('date_created', { ascending: true });

    if (error) {
      console.error(`Error fetching pockets for timeboard ${timeboardId}:`, error.message);
      return [];
    }
    return (data || []).map((r) => this._toEntity(r));
  }

  async create(data) {
    const row = this._toRow(data);
    if (!row.date_created) {
      row.date_created = new Date().toISOString();
    }

    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating pocket in Supabase:', error.message);
      throw new Error(`Failed to create pocket: ${error.message}`);
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
      console.error(`Error updating pocket ${id} in Supabase:`, error.message);
      throw new Error(`Failed to update pocket: ${error.message}`);
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
      console.error(`Error deleting pocket ${id} from Supabase:`, error.message);
      throw new Error(`Failed to delete pocket: ${error.message}`);
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
      console.error(`Error deleting pockets for timeline ${timelineId} from Supabase:`, error.message);
      return false;
    }
    return true;
  }
}

export const pocketRepository = new SupabasePocketRepository();
