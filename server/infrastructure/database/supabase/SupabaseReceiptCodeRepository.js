import { supabase } from './supabaseClient.js';

const TABLE = 'receipt_codes';

const rowToEntity = (row) => ({
  code: row.code,
  timeboardId: row.timeboard_id,
  eventId: row.event_id,
  occurrenceDate: row.occurrence_date,
  personId: row.person_id,
  createdAt: row.created_at,
  voidedAt: row.voided_at
});

/** Receipt codes of received fees (receipt_codes, migration 0020). */
export class SupabaseReceiptCodeRepository {
  async findActive(eventId, occurrenceDate) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('event_id', String(eventId)).eq('occurrence_date', occurrenceDate).is('voided_at', null).maybeSingle();
    if (error) throw new Error(`Supabase findActive [${TABLE}]: ${error.message}`);
    return data ? rowToEntity(data) : null;
  }

  async findByCode(code) {
    const { data, error } = await supabase.from(TABLE).select('*').eq('code', code).maybeSingle();
    if (error) throw new Error(`Supabase findByCode [${TABLE}]: ${error.message}`);
    return data ? rowToEntity(data) : null;
  }

  /** Creates a code; null when the occurrence got one meanwhile (unique active code). */
  async create({ code, timeboardId, eventId, occurrenceDate, personId }) {
    const { data, error } = await supabase.from(TABLE).insert({ code, timeboard_id: timeboardId, event_id: String(eventId), occurrence_date: occurrenceDate, person_id: personId || null }).select().maybeSingle();
    if (error) {
      if (error.code === '23505') return null;
      throw new Error(`Supabase create [${TABLE}]: ${error.message}`);
    }
    return data ? rowToEntity(data) : null;
  }

  async voidActive(eventId, occurrenceDate) {
    const { error } = await supabase.from(TABLE).update({ voided_at: new Date().toISOString() }).eq('event_id', String(eventId)).eq('occurrence_date', occurrenceDate).is('voided_at', null);
    if (error) throw new Error(`Supabase voidActive [${TABLE}]: ${error.message}`);
  }
}

export const receiptCodeRepository = new SupabaseReceiptCodeRepository();
