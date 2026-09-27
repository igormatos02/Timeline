import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timeboardMemberRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardMemberRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
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

export const accessService = new AccessService();
