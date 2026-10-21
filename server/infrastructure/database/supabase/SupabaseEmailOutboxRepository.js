import { supabase } from './supabaseClient.js';
import { EmailOutboxStatus } from '../../../../shared/enums/index.js';

const TABLE = 'email_outbox';

const rowToEntity = (row) => ({
  id: row.id,
  timeboardId: row.timeboard_id,
  kind: row.kind,
  recipientEmail: row.recipient_email,
  payload: row.payload || {},
  status: row.status,
  attempts: row.attempts || 0,
  createdAt: row.created_at,
  sentAt: row.sent_at
});

/** E-mails to send to condominium owners (email_outbox, migration 0019). */
export class SupabaseEmailOutboxRepository {
  /** Queues an e-mail; an e-mail with the same dedupe key is never queued twice (returns null then). */
  async enqueue({ timeboardId, kind, recipientEmail, payload, dedupeKey }) {
    const { data, error } = await supabase
      .from(TABLE)
      .upsert({ timeboard_id: timeboardId, kind, recipient_email: recipientEmail, payload, dedupe_key: dedupeKey }, { onConflict: 'dedupe_key', ignoreDuplicates: true })
      .select()
      .maybeSingle();
    if (error) throw new Error(`Supabase enqueue [${TABLE}]: ${error.message}`);
    return data ? rowToEntity(data) : null;
  }

  async listPending(limit) {
    if (limit <= 0) return [];
    const { data, error } = await supabase.from(TABLE).select('*').eq('status', EmailOutboxStatus.PENDING).order('created_at', { ascending: true }).limit(limit);
    if (error) throw new Error(`Supabase listPending [${TABLE}]: ${error.message}`);
    return (data || []).map(rowToEntity);
  }

  async markSent(id) {
    await supabase.from(TABLE).update({ status: EmailOutboxStatus.SENT, sent_at: new Date().toISOString() }).eq('id', id);
  }

  /** A failed attempt: retried later, given up after `maxAttempts`. */
  async markFailed(entry, message, maxAttempts = 3) {
    const attempts = (entry.attempts || 0) + 1;
    await supabase.from(TABLE).update({
      attempts,
      last_error: String(message || '').slice(0, 500),
      status: attempts >= maxAttempts ? EmailOutboxStatus.FAILED : EmailOutboxStatus.PENDING
    }).eq('id', entry.id);
  }

  /** E-mails sent since a moment (optionally of one condominium). */
  async countSentSince(sinceIso, timeboardId = null) {
    let query = supabase.from(TABLE).select('id', { count: 'exact', head: true }).eq('status', EmailOutboxStatus.SENT).gte('sent_at', sinceIso);
    if (timeboardId) query = query.eq('timeboard_id', timeboardId);
    const { count, error } = await query;
    if (error) throw new Error(`Supabase countSentSince [${TABLE}]: ${error.message}`);
    return count || 0;
  }

  async countPending() {
    const { count } = await supabase.from(TABLE).select('id', { count: 'exact', head: true }).eq('status', EmailOutboxStatus.PENDING);
    return count || 0;
  }
}

export const emailOutboxRepository = new SupabaseEmailOutboxRepository();
