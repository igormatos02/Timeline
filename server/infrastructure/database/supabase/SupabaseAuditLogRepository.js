import { supabase } from './supabaseClient.js';

const TABLE = 'audit_log';

const toEntry = (row) => ({
  id: row.id,
  timeboardId: row.timeboard_id,
  userId: row.user_id,
  userName: row.user_name,
  userRole: row.user_role,
  action: row.action,
  entityType: row.entity_type,
  entityId: row.entity_id,
  entityName: row.entity_name,
  occurrenceDate: row.occurrence_date,
  amount: row.amount != null ? Number(row.amount) : null,
  details: row.details || null,
  snapshot: row.snapshot || null,
  createdAt: row.created_at
});

/** Audit log (table 'audit_log', migration 0010). */
export class SupabaseAuditLogRepository {
  async create(entry) {
    const { error } = await supabase.from(TABLE).insert({
      timeboard_id: entry.timeboardId || null,
      user_id: entry.userId || null,
      user_name: entry.userName || null,
      user_role: entry.userRole || null,
      action: entry.action,
      entity_type: entry.entityType || 'event',
      entity_id: entry.entityId ? String(entry.entityId) : null,
      entity_name: entry.entityName || null,
      occurrence_date: entry.occurrenceDate || null,
      amount: entry.amount ?? null,
      details: entry.details || null,
      snapshot: entry.snapshot || null
    });
    if (error) throw new Error(`Supabase create [${TABLE}]: ${error.message}`);
  }

  async listByTimeboard(timeboardId, { limit = 200 } = {}) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('timeboard_id', timeboardId)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Supabase list [${TABLE}]: ${error.message}`);
    return (data || []).map(toEntry);
  }
}

export const auditLogRepository = new SupabaseAuditLogRepository();
