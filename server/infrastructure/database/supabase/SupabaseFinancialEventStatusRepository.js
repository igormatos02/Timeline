import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabaseFinancialEventStatusRepository
 * Manages dynamic monthly event statuses in table 'financial_event_status'.
 */
export class SupabaseFinancialEventStatusRepository {
  constructor() {
    this.tableName = 'financial_event_status';
  }

  async getAll(filter = null) {
    let query = supabase
      .from(this.tableName)
      .select('*');

    if (filter && typeof filter === 'object') {
      if (filter.year) query = query.eq('year', Number(filter.year));
      if (filter.month) query = query.eq('month', Number(filter.month));
      if (filter.eventId || filter.event_id) query = query.eq('event_id', String(filter.eventId || filter.event_id));
      if (filter.status) query = query.eq('status', String(filter.status));
      if (filter.timelineId || filter.timeline_id) query = query.eq('timeline_id', String(filter.timelineId || filter.timeline_id));
      if (filter.timeboardId || filter.timeboard_id) query = query.eq('timeboard_id', String(filter.timeboardId || filter.timeboard_id));
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching financial_event_status from Supabase:', error.message);
      return [];
    }

    const list = data || [];
    return typeof filter === 'function' ? list.filter(filter) : list;
  }

  async getStatusMap(filter = null) {
    const records = await this.getAll(filter);
    const map = new Map();
    for (const r of records) {
      const key = `${r.year}_${r.month}_${r.event_id}`;
      map.set(key, r.status);
    }
    return map;
  }

  async upsertStatus(year, month, eventId, status, options = {}) {
    if (!year || !month || !eventId || !status) return null;

    const row = {
      year: Number(year),
      month: Number(month),
      event_id: String(eventId),
      status: String(status),
      updated_at: new Date().toISOString()
    };

    if (options.timelineId || options.timeline_id) {
      row.timeline_id = String(options.timelineId || options.timeline_id);
    }
    if (options.timeboardId || options.timeboard_id) {
      row.timeboard_id = String(options.timeboardId || options.timeboard_id);
    }

    const { data, error } = await supabase
      .from(this.tableName)
      .upsert(row, { onConflict: 'year,month,event_id' })
      .select();

    if (error) {
      console.error('Error upserting financial_event_status:', error.message);
      throw new Error(`Failed to upsert financial_event_status: ${error.message}`);
    }
    return data && data[0] ? data[0] : row;
  }

  async deleteStatus(year, month, eventId) {
    if (!year || !month || !eventId) return false;

    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('year', Number(year))
      .eq('month', Number(month))
      .eq('event_id', String(eventId));

    if (error) {
      console.error('Error deleting financial_event_status:', error.message);
      return false;
    }
    return true;
  }
}

export const financialEventStatusRepository = new SupabaseFinancialEventStatusRepository();
