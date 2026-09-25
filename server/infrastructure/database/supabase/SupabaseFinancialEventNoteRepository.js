import { supabase } from './supabaseClient.js';

/**
 * Infrastructure Adapter: SupabaseFinancialEventNoteRepository
 * Comments of a single event occurrence (year / month) in table 'financial_event_notes'.
 */
export class SupabaseFinancialEventNoteRepository {
  constructor() {
    this.tableName = 'financial_event_notes';
  }

  async getAll(filter = {}) {
    let query = supabase
      .from(this.tableName)
      .select('*')
      .order('created_at', { ascending: true });

    if (filter.year) query = query.eq('year', Number(filter.year));
    if (filter.month) query = query.eq('month', Number(filter.month));
    if (filter.eventId) query = query.eq('event_id', String(filter.eventId));
    if (filter.timelineId) query = query.eq('timeline_id', String(filter.timelineId));
    if (filter.timeboardId) query = query.eq('timeboard_id', String(filter.timeboardId));

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching financial_event_notes from Supabase:', error.message);
      return [];
    }
    return data || [];
  }

  // Map "year_month_eventId" -> notes of that occurrence (oldest first)
  async getNotesMap(filter = {}) {
    const rows = await this.getAll(filter);
    const map = new Map();
    for (const r of rows) {
      const key = `${r.year}_${r.month}_${r.event_id}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(r);
    }
    return map;
  }

  async create(row) {
    const { data, error } = await supabase
      .from(this.tableName)
      .insert([row])
      .select()
      .single();
    if (error) throw new Error(error.message);
    return data;
  }

  async delete(id) {
    if (!id) return false;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('id', String(id));
    if (error) throw new Error(error.message);
    return true;
  }

  // Moves the comments of an occurrence to another month (the occurrence date was changed)
  async moveMonth(fromYear, fromMonth, toYear, toMonth, eventIds) {
    const cleanIds = [...new Set((eventIds || []).filter(Boolean).map(String))];
    if (cleanIds.length === 0) return true;
    const { error } = await supabase
      .from(this.tableName)
      .update({ year: Number(toYear), month: Number(toMonth) })
      .eq('year', Number(fromYear))
      .eq('month', Number(fromMonth))
      .in('event_id', cleanIds);
    if (error) {
      console.error('Error moving financial_event_notes:', error.message);
      return false;
    }
    return true;
  }

  async deleteAllForEvent(eventIds) {
    const cleanIds = [...new Set((Array.isArray(eventIds) ? eventIds : [eventIds]).filter(Boolean).map(String))];
    if (cleanIds.length === 0) return true;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .in('event_id', cleanIds);
    if (error) {
      console.error('Error deleting financial_event_notes for events:', error.message);
      return false;
    }
    return true;
  }

  async deleteByTimelineId(timelineId) {
    if (!timelineId) return false;
    const { error } = await supabase
      .from(this.tableName)
      .delete()
      .eq('timeline_id', String(timelineId));
    if (error) {
      console.error(`Error deleting financial_event_notes for timeline ${timelineId}:`, error.message);
      return false;
    }
    return true;
  }
}

export const financialEventNoteRepository = new SupabaseFinancialEventNoteRepository();
