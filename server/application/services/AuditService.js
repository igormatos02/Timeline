import { auditLogRepository } from '../../infrastructure/database/supabase/SupabaseAuditLogRepository.js';
import { userRepository } from '../../infrastructure/database/supabase/SupabaseUserRepository.js';

/**
 * Records the actions that change money already recorded (see shared/enums/AuditAction.js).
 * Recording never blocks the action itself: a failure (e.g. migration 0010 not run yet) is only logged.
 */
export class AuditService {
  async record({ actor = null, timeboardId, action, event = null, occurrenceDate = null, details = null, snapshot = null }) {
    try {
      let userName = actor?.name || null;
      if (!userName && actor?.userId) {
        const user = await userRepository.getById(actor.userId).catch(() => null);
        userName = user?.name || user?.email || null;
      }
      await auditLogRepository.create({
        timeboardId: timeboardId || event?.timeboardId || event?.timeboard_id || null,
        userId: actor?.userId || null,
        userName,
        userRole: actor?.role || null,
        action,
        entityType: 'event',
        entityId: event?.eventId || event?.id || null,
        entityName: event?.name || event?.title || null,
        occurrenceDate: occurrenceDate ? String(occurrenceDate).substring(0, 10) : null,
        amount: event ? Math.abs(Number(event.amount ?? event.installmentAmount ?? 0)) : null,
        details,
        snapshot
      });
    } catch (err) {
      console.warn('Audit log not recorded:', err.message);
    }
  }

  async list(timeboardId) {
    return auditLogRepository.listByTimeboard(timeboardId);
  }
}

export const auditService = new AuditService();
