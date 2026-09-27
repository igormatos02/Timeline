import { eventService } from './EventService.js';
import { accessService } from './AccessService.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { EventStatus, TimelineType, PersonRole, isPositiveStatus, isCancelledStatus, normalizeTimelineType } from '../../../shared/enums/index.js';

// Timelines whose events are shared notices visible to individual members
const NOTICE_TIMELINE_TYPES = [TimelineType.REMINDER, TimelineType.DIARY];

const isActiveEvent = (ev) => ev && ev.date && !ev.isDeleted && ev.status !== EventStatus.DELETED && !isCancelledStatus(ev.status);
const isSettled = (ev) => isPositiveStatus(ev.status) || Boolean(ev.isCompleted);
// Debt balance: open obligations due up to the end of the current month (same rule as the web individual header)
const debtLimitDate = () => `${new Date().toISOString().substring(0, 7)}-31`;

/**
 * Data of the logged-in person in a timeboard (individual members, e.g. condominium owners):
 * only their own obligations are read here, filtered on the server.
 */
export class MeService {
  /** Whether an event is an obligation of the person (by person id or obligator identification). */
  isOwnObligation(ev, access) {
    if (!ev || !access) return false;
    const personId = ev.obligationPersonId || ev.obligation_person_id;
    if (access.personId && personId && String(personId) === String(access.personId)) return true;
    const obligatorId = String(ev.obligatorIdentification || ev.obligator_identification || '').trim().toLowerCase();
    const ownObligatorId = String(access.obligatorIdentification || '').trim().toLowerCase();
    return Boolean(ownObligatorId && obligatorId && obligatorId === ownObligatorId);
  }

  /** Events an individual member may receive: their obligations plus the shared notices (reminders, diary). */
  async filterEventsForIndividual(events, timeboardId, access) {
    const timelines = await timelineRepository.findByTimeboardId(timeboardId);
    const noticeTimelineIds = new Set(
      timelines.filter((tl) => NOTICE_TIMELINE_TYPES.includes(normalizeTimelineType(tl.type))).map((tl) => String(tl.id))
    );
    return (events || []).filter((ev) => (
      this.isOwnObligation(ev, access) || noticeTimelineIds.has(String(ev.timelineId || ev.timeline_id || ''))
    ));
  }

  /**
   * Obligations of the person in a timeboard, optionally filtered by year / month, with the debt balance
   * (open obligations due up to the end of the current month) and the paid / pending totals of the filtered period.
   */
  /**
   * Person whose obligations are read: the user's own person, or — for admins only — any person of the
   * timeboard (`personId`). Returns { personId, obligatorIdentification } or null when not allowed.
   */
  async _resolveTarget(access, timeboardId, personId) {
    if (!personId || String(personId) === String(access.personId)) {
      return { personId: access.personId, obligatorIdentification: access.obligatorIdentification };
    }
    if (access.role !== PersonRole.ADMIN) return null;
    const person = await personRepository.getById(personId);
    if (!person || String(person.timeboardId) !== String(timeboardId)) return null;
    return { personId: person.id, obligatorIdentification: person.obligatorIdentification || null };
  }

  /** Admins: the timeboard's entities with their debt balance (open obligations due up to the end of the month). */
  async getEntities(userId, { timeboardId }) {
    const access = await accessService.getTimeboardAccess(userId, timeboardId);
    if (!access || access.role !== PersonRole.ADMIN) return null;
    const persons = await personRepository.getByTimeboardId(timeboardId);
    const events = await eventService.getAllEvents({ timeboardId });
    const todayStr = new Date().toISOString().substring(0, 10);
    const summary = new Map();
    (events || []).forEach((ev) => {
      if (!isActiveEvent(ev) || isSettled(ev) || ev.date > debtLimitDate()) return;
      const personId = String(ev.obligationPersonId || ev.obligation_person_id || '');
      if (!personId) return;
      const entry = summary.get(personId) || { debtBalance: 0, overdueCount: 0 };
      entry.debtBalance += Math.abs(Number(ev.amount || 0));
      if (ev.date < todayStr) entry.overdueCount += 1;
      summary.set(personId, entry);
    });
    return persons
      .map((p) => ({
        id: p.id,
        name: p.personName || p.email || '',
        role: p.role,
        debtBalance: summary.get(String(p.id))?.debtBalance || 0,
        overdueCount: summary.get(String(p.id))?.overdueCount || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getObligations(userId, { timeboardId, year, month, personId = null }) {
    const userAccess = await accessService.getTimeboardAccess(userId, timeboardId);
    if (!userAccess) return null;
    const target = await this._resolveTarget(userAccess, timeboardId, personId);
    if (!target) return null;
    const access = { ...userAccess, ...target };
    const timelines = await timelineRepository.findByTimeboardId(timeboardId);
    const timelineNameById = new Map(timelines.map((tl) => [String(tl.id), tl.name]));
    const todayStr = new Date().toISOString().substring(0, 10);

    const events = await eventService.getAllEvents({ timeboardId });
    const own = (events || []).filter((ev) => isActiveEvent(ev) && this.isOwnObligation(ev, access));

    const debtBalance = own
      .filter((ev) => !isSettled(ev) && ev.date <= debtLimitDate())
      .reduce((sum, ev) => sum + Math.abs(Number(ev.amount || 0)), 0);

    const periodPrefix = year ? (month ? `${year}-${String(month).padStart(2, '0')}` : String(year)) : '';
    const items = own
      .filter((ev) => !periodPrefix || ev.date.startsWith(periodPrefix))
      .map((ev) => ({
        id: ev.id,
        title: ev.title || ev.name || '',
        date: ev.date,
        amount: Math.abs(Number(ev.amount || 0)),
        status: ev.status,
        isPaid: isSettled(ev),
        isOverdue: !isSettled(ev) && ev.date < todayStr,
        timelineName: timelineNameById.get(String(ev.timelineId || ev.timeline_id || '')) || ''
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      personId: access.personId,
      role: userAccess.role,
      debtBalance,
      paidTotal: items.filter((it) => it.isPaid).reduce((sum, it) => sum + it.amount, 0),
      pendingTotal: items.filter((it) => !it.isPaid).reduce((sum, it) => sum + it.amount, 0),
      items
    };
  }
}

export const meService = new MeService();
