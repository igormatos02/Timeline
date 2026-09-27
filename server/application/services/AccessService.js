import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timeboardMemberRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardMemberRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { supabase } from '../../infrastructure/database/supabase/supabaseClient.js';
import { PersonRole } from '../../../shared/enums/index.js';

/**
 * Access of a user to a timeboard: the owner is admin; members take the role of their linked person
 * (contributor when none); anyone else has no access.
 * Returns { role, personId, obligatorIdentification } or null.
 */
export class AccessService {
  async getTimeboardAccess(userId, timeboardId) {
    if (!userId || !timeboardId) return null;
    const timeboard = await timeboardRepository.getById(timeboardId);
    if (!timeboard) return null;
    if (String(timeboard.ownerId || timeboard.userId || '') === String(userId)) {
      return { role: PersonRole.ADMIN, personId: null, obligatorIdentification: null };
    }
    const memberships = await timeboardMemberRepository.getByUserId(userId);
    const isMember = memberships.some((m) => String(m.timeboardId) === String(timeboardId));
    if (!isMember) return null;
    const persons = await personRepository.getByUserId(userId);
    const person = persons.find((p) => String(p.timeboardId) === String(timeboardId));
    return {
      role: person?.role || PersonRole.CONTRIBUTOR,
      personId: person?.id || null,
      obligatorIdentification: person?.obligatorIdentification || null
    };
  }

  /** Timeboard targeted by a request: explicit timeboard id, or the timeboard of a timeline id. */
  async resolveTimeboardId({ timeboardId, timelineId }) {
    if (timeboardId) return String(timeboardId);
    if (!timelineId) return null;
    const timeline = await timelineRepository.getById(timelineId);
    return timeline?.timeboardId ? String(timeline.timeboardId) : null;
  }
}

// Tables (and id columns) where each kind of resource can live, in lookup order
const RESOURCE_TABLES = {
  // Events: financial events (by row id or series id), diary posts, reminders, follow-ups and to-dos
  event: [['financial_events', 'id'], ['financial_events', 'event_id'], ['diaries', 'id'], ['reminders', 'id'], ['followup', 'id'], ['to_do', 'id']],
  note: [['financial_event_notes', 'id']],
  timeline: [['timelines', 'id']],
  person: [['persons', 'id']],
  pocket: [['pockets', 'id']],
  todo: [['to_do', 'id']],
  followup: [['followup', 'id']],
  loan: [['loan_contracts', 'id']]
};

// Occurrences of recurring events use `<seriesId>_<yyyy-MM-dd>` as id
const stripOccurrenceDate = (id) => String(id).replace(/_\d{4}-\d{2}-\d{2}$/, '');

AccessService.prototype.resolveResourceTimeboardId = async function resolveResourceTimeboardId(kind, rawId) {
  if (!rawId || !RESOURCE_TABLES[kind]) return null;
  const ids = kind === 'event' ? [...new Set([String(rawId), stripOccurrenceDate(rawId)])] : [String(rawId)];
  for (const [table, column] of RESOURCE_TABLES[kind]) {
    for (const id of ids) {
      const select = table === 'to_do' ? 'timeline_id' : (table === 'timelines' || table === 'persons' ? 'timeboard_id' : 'timeboard_id, timeline_id');
      const { data, error } = await supabase.from(table).select(select).eq(column, id).limit(1).maybeSingle();
      if (error || !data) continue;
      if (data.timeboard_id) return String(data.timeboard_id);
      if (data.timeline_id) return this.resolveTimeboardId({ timelineId: data.timeline_id });
    }
  }
  return null;
};

export const accessService = new AccessService();
