import { eventService } from './EventService.js';
import { accessService } from './AccessService.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { EventStatus, TimelineType, isPositiveStatus, isCancelledStatus, normalizeTimelineType } from '../../../shared/enums/index.js';

// Timelines whose events are shared notices visible to individual members
const NOTICE_TIMELINE_TYPES = [TimelineType.REMINDER, TimelineType.DIARY];

const isActiveEvent = (ev) => ev && ev.date && !ev.isDeleted && ev.status !== EventStatus.DELETED && !isCancelledStatus(ev.status);
const isSettled = (ev) => isPositiveStatus(ev.status) || Boolean(ev.isCompleted);

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
   * (open obligations due up to today) and the paid / pending totals of the filtered period.
   */
  async getObligations(userId, { timeboardId, year, month }) {
    const access = await accessService.getTimeboardAccess(userId, timeboardId);
    if (!access) return null;
    const timelines = await timelineRepository.findByTimeboardId(timeboardId);
    const timelineNameById = new Map(timelines.map((tl) => [String(tl.id), tl.name]));
    const todayStr = new Date().toISOString().substring(0, 10);

    const events = await eventService.getAllEvents({ timeboardId });
    const own = (events || []).filter((ev) => isActiveEvent(ev) && this.isOwnObligation(ev, access));

    const debtBalance = own
      .filter((ev) => !isSettled(ev) && ev.date <= todayStr)
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
      role: access.role,
      debtBalance,
      paidTotal: items.filter((it) => it.isPaid).reduce((sum, it) => sum + it.amount, 0),
      pendingTotal: items.filter((it) => !it.isPaid).reduce((sum, it) => sum + it.amount, 0),
      items
    };
  }
}

export const meService = new MeService();
