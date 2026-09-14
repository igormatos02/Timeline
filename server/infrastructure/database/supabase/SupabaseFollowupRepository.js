import { IFollowupRepository } from '../../../domain/repositories/IFollowupRepository.js';
import { Followup } from '../../../domain/entities/Followup.js';
import { FollowupStatus, normalizeFollowupStatus } from '../../../../shared/enums/index.js';
import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabaseFollowupRepository
 * Manages Follow-up items in table 'followup'.
 */
export class SupabaseFollowupRepository extends IFollowupRepository {
  constructor() {
    super();
    this.tableName = 'followup';
  }

  _toEntity(row) {
    if (!row) return null;
    return new Followup({
      id: row.id,
      eventId: row.event_id,
      timeboardId: row.timeboard_id,
      timelineId: row.timeline_id,
      name: row.name,
      description: row.description || '',
      labels: Array.isArray(row.labels) ? row.labels : (typeof row.labels === 'string' ? JSON.parse(row.labels || '[]') : (row.labels || [])),
      notes: row.notes || '',
      breakdownItems: Array.isArray(row.breakdown_items) ? row.breakdown_items : (typeof row.breakdown_items === 'string' ? JSON.parse(row.breakdown_items || '[]') : (row.breakdown_items || [])),
      position: row.position !== undefined && row.position !== null ? Number(row.position) : 0,
      status: row.status ? normalizeFollowupStatus(row.status) : FollowupStatus.IN_PROGRESS,
      tenantId: row.tenant_id || null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    });
  }

  _toRow(data) {
    const row = {};
    if (data.id !== undefined) row.id = data.id;
    if (data.eventId !== undefined) row.event_id = data.eventId;
    if (data.event_id !== undefined) row.event_id = data.event_id;
    if (data.timeboardId !== undefined) row.timeboard_id = data.timeboardId;
    if (data.timeboard_id !== undefined) row.timeboard_id = data.timeboard_id;
    if (data.timelineId !== undefined) row.timeline_id = data.timelineId;
    if (data.timeline_id !== undefined) row.timeline_id = data.timeline_id;
    if (data.name !== undefined) row.name = data.name;
    if (data.description !== undefined) row.description = data.description;
    if (data.labels !== undefined) row.labels = Array.isArray(data.labels) ? data.labels : (typeof data.labels === 'string' ? JSON.parse(data.labels || '[]') : []);
    if (data.notes !== undefined) row.notes = data.notes;
    if (data.breakdownItems !== undefined) row.breakdown_items = Array.isArray(data.breakdownItems) ? data.breakdownItems : (typeof data.breakdownItems === 'string' ? JSON.parse(data.breakdownItems || '[]') : []);
    if (data.breakdown_items !== undefined) row.breakdown_items = Array.isArray(data.breakdown_items) ? data.breakdown_items : (typeof data.breakdown_items === 'string' ? JSON.parse(data.breakdown_items || '[]') : []);
    if (data.position !== undefined) row.position = Number(data.position);
    if (data.status !== undefined) row.status = normalizeFollowupStatus(data.status);
    if (data.tenantId !== undefined) row.tenant_id = data.tenantId;
    if (data.tenant_id !== undefined) row.tenant_id = data.tenant_id;
    if (data.createdAt !== undefined) row.created_at = data.createdAt;
    if (data.created_at !== undefined) row.created_at = data.created_at;
    if (data.updatedAt !== undefined) row.updated_at = data.updatedAt;
    if (data.updated_at !== undefined) row.updated_at = data.updated_at;
    else row.updated_at = new Date().toISOString();
    return row;
  }

  async getAll(filterFn = null) {
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching followup from Supabase:', error.message);
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
      console.error(`Error fetching followup ${id} from Supabase:`, error.message);
      return null;
    }
    return this._toEntity(data);
  }

  async getByEventId(eventId) {
    if (!eventId) return [];
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('event_id', eventId)
      .order('position', { ascending: true });

    if (error) {
      console.error(`Error fetching followup by event_id ${eventId}:`, error.message);
      return [];
    }
    return (data || []).map((r) => this._toEntity(r));
  }

  async getByTimelineId(timelineId) {
    if (!timelineId) return [];
    const { data, error } = await supabase
      .from(this.tableName)
      .select('*')
      .eq('timeline_id', timelineId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching followup for timeline ${timelineId}:`, error.message);
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
      console.error(`Error fetching followup for timeboard ${timeboardId}:`, error.message);
      return [];
    }
    return (data || []).map((r) => this._toEntity(r));
  }

  async create(data) {
    const row = this._toRow(data);
    if (!row.created_at) row.created_at = new Date().toISOString();

    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(row)
      .select()
      .single();

    if (error) {
      console.error('Error creating followup in Supabase:', error.message);
      throw new Error(`Failed to create followup: ${error.message}`);
    }
    return this._toEntity(created);
  }

  async createMany(items) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const rows = items.map((item) => {
      const r = this._toRow(item);
      if (!r.created_at) r.created_at = new Date().toISOString();
      return r;
    });

    const { data: created, error } = await supabase
      .from(this.tableName)
      .insert(rows)
      .select();

    if (error) {
      console.error('Error batch creating followups in Supabase:', error.message);
      throw new Error(`Failed to batch create followups: ${error.message}`);
    }
    return (created || []).map((r) => this._toEntity(r));
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
      console.error(`Error updating followup ${id} in Supabase:`, error.message);
      throw new Error(`Failed to update followup: ${error.message}`);
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
      console.error(`Error deleting followup ${id} from Supabase:`, error.message);
      throw new Error(`Failed to delete followup: ${error.message}`);
    }
    return true;
  }

  async deleteByEventId(eventId) {
    if (!eventId) return false;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('event_id', eventId);

    if (error) {
      console.error(`Error deleting followups for event_id ${eventId} from Supabase:`, error.message);
      throw new Error(`Failed to delete followups: ${error.message}`);
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
      console.error(`Error deleting followup for timeline ${timelineId} from Supabase:`, error.message);
      return false;
    }
    return true;
  }
}

export const followupRepository = new SupabaseFollowupRepository();
