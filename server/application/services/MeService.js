import { eventService } from './EventService.js';
import { accessService } from './AccessService.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { timelineService } from './TimelineService.js';
import { pocketRepository } from '../../infrastructure/database/supabase/SupabasePocketRepository.js';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { TimelineType, isWalletTimelineType, PersonRole, TimelineStatus, normalizeTimelineType, isLoanTimelineType, BalanceViewMode, EntityDirection, isKindInBalanceViewMode, paymentChannelOf } from '../../../shared/enums/index.js';
import { classifyMovement, isActiveMovement, isEffectiveMovement } from '../../../shared/finance/movements.js';
import { computeMoneySummary } from '../../../shared/finance/moneySummary.js';
import { recalculateLoanState, getLoanMetrics } from '../../../shared/finance/loanCalculations.js';
import { buildReceiptHtml } from '../../../shared/utils/receiptGenerator.js';
import { createT } from '../../../shared/i18n/index.js';
import { createLinkToken, verifyLinkToken, LinkTokenPurpose } from '../../infrastructure/security/sessionToken.js';

// Timelines whose events are shared notices visible to individual members
const NOTICE_TIMELINE_TYPES = [TimelineType.REMINDER, TimelineType.DIARY];

// Movement rules from the shared financial engine (same as the web)
const isActiveEvent = (ev) => Boolean(ev && ev.date) && isActiveMovement(ev);
const isSettled = (ev) => isEffectiveMovement(ev);

// Side of an obligation for the person: what the person owes (income side: fees) or what the person has to
// receive (outflow side: suppliers, refunds) — the two are never added together
const obligationSide = (ev, timelineTypeMap) => {
  const kind = classifyMovement(ev, timelineTypeMap).kind;
  if (isKindInBalanceViewMode(kind, BalanceViewMode.INCOME)) return EntityDirection.OWES;
  if (isKindInBalanceViewMode(kind, BalanceViewMode.OUTFLOW)) return EntityDirection.RECEIVES;
  return null;
};
const timelineTypeMapOf = (timelines) => new Map((timelines || []).map((tl) => [String(tl.id), tl.type]));
// A receipt link opened in the phone's browser is valid for a few minutes
const RECEIPT_LINK_TTL_SECONDS = 10 * 60;
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
    const [persons, events, timelines] = await Promise.all([
      personRepository.getByTimeboardId(timeboardId),
      eventService.getAllEvents({ timeboardId }),
      timelineRepository.findByTimeboardId(timeboardId)
    ]);
    const timelineTypeMap = timelineTypeMapOf(timelines);
    const todayStr = new Date().toISOString().substring(0, 10);
    const summary = new Map();
    (events || []).forEach((ev) => {
      if (!isActiveEvent(ev) || isSettled(ev) || ev.date > debtLimitDate()) return;
      const personId = String(ev.obligationPersonId || ev.obligation_person_id || '');
      if (!personId) return;
      const side = obligationSide(ev, timelineTypeMap);
      if (!side) return;
      const entry = summary.get(personId) || { debtBalance: 0, toReceiveBalance: 0, overdueCount: 0 };
      if (side === EntityDirection.OWES) {
        entry.debtBalance += Math.abs(Number(ev.amount || 0));
        if (ev.date < todayStr) entry.overdueCount += 1;
      } else {
        entry.toReceiveBalance += Math.abs(Number(ev.amount || 0));
      }
      summary.set(personId, entry);
    });
    return persons
      .map((p) => ({
        id: p.id,
        name: p.personName || p.email || '',
        role: p.role,
        debtBalance: summary.get(String(p.id))?.debtBalance || 0,
        toReceiveBalance: summary.get(String(p.id))?.toReceiveBalance || 0,
        overdueCount: summary.get(String(p.id))?.overdueCount || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Admins: "where is my money" of the timeboard (shared/finance/moneySummary.js, same rules as the web balance):
   * effective movements up to the current month, loans recalculated like the web.
   */
  async getSummary(userId, { timeboardId }) {
    const access = await accessService.getTimeboardAccess(userId, timeboardId);
    if (!access || access.role !== PersonRole.ADMIN) return null;
    const [timeboard, timelines, pockets] = await Promise.all([
      timeboardRepository.getById(timeboardId),
      timelineService.getAllTimelines(timeboardId),
      pocketRepository.getByTimeboardId(timeboardId)
    ]);
    let events = await eventService.getAllEvents({ timeboardId });
    const loanTimelines = (timelines || []).filter((tl) => isLoanTimelineType(tl.type) && (tl.status === TimelineStatus.ACTIVE || !tl.status));
    loanTimelines.forEach((loanTimeline) => { events = recalculateLoanState(loanTimeline, events); });

    const incomeTimeline = (timelines || []).find((tl) => isWalletTimelineType(tl.type));
    const rawComputeFrom = String(timeboard?.computeFrom || '');
    const today = new Date();
    const horizon = new Date(today.getFullYear() + 1, today.getMonth(), 1);
    return computeMoneySummary({
      events,
      timelineTypeMap: new Map((timelines || []).map((tl) => [String(tl.id), tl.type])),
      pockets: pockets || [],
      fromMonth: rawComputeFrom && !rawComputeFrom.startsWith('1900-01') ? rawComputeFrom.substring(0, 7) : null,
      asOfMonth: today.toISOString().substring(0, 7),
      horizonMonth: horizon.toISOString().substring(0, 7),
      initialAvailable: Number(incomeTimeline?.initialValue ?? incomeTimeline?.initial_value ?? 0),
      loans: loanTimelines.map((loanTimeline) => getLoanMetrics(loanTimeline, events))
    });
  }

  async getObligations(userId, { timeboardId, year, month, personId = null }) {
    const userAccess = await accessService.getTimeboardAccess(userId, timeboardId);
    if (!userAccess) return null;
    const target = await this._resolveTarget(userAccess, timeboardId, personId);
    if (!target) return null;
    const access = { ...userAccess, ...target };
    const timelines = await timelineRepository.findByTimeboardId(timeboardId);
    const timelineNameById = new Map(timelines.map((tl) => [String(tl.id), tl.name]));
    const timelineTypeMap = timelineTypeMapOf(timelines);
    const todayStr = new Date().toISOString().substring(0, 10);

    const events = await eventService.getAllEvents({ timeboardId });
    const own = (events || []).filter((ev) => isActiveEvent(ev) && this.isOwnObligation(ev, access));

    // Open amounts due up to the end of the current month, per side
    const openDue = own.filter((ev) => !isSettled(ev) && ev.date <= debtLimitDate());
    const sumSide = (side) => openDue
      .filter((ev) => obligationSide(ev, timelineTypeMap) === side)
      .reduce((sum, ev) => sum + Math.abs(Number(ev.amount || 0)), 0);
    const debtBalance = sumSide(EntityDirection.OWES);
    const toReceiveBalance = sumSide(EntityDirection.RECEIVES);

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
        side: obligationSide(ev, timelineTypeMap),
        timelineName: timelineNameById.get(String(ev.timelineId || ev.timeline_id || '')) || '',
        // Cash (wallet) or bank (account), and the receipt of a paid installment
        channel: paymentChannelOf(timelineTypeMap.get(String(ev.timelineId || ev.timeline_id || ''))),
        receiptNumber: isSettled(ev) ? (ev.contYear ?? ev.cont_year ?? null) : null,
        paidOn: isSettled(ev) ? String(ev.receiptDate || ev.paidDate || ev.date || '').substring(0, 10) : null
      }))
      .sort((a, b) => b.date.localeCompare(a.date));

    return {
      personId: access.personId,
      role: userAccess.role,
      debtBalance,
      toReceiveBalance,
      paidTotal: items.filter((it) => it.isPaid).reduce((sum, it) => sum + it.amount, 0),
      pendingTotal: items.filter((it) => !it.isPaid).reduce((sum, it) => sum + it.amount, 0),
      items
    };
  }

  /**
   * Paid obligation of the person (own, or any entity's for admins) for a receipt, or null when not allowed.
   * Checked when the link is asked for and again when it is opened (access may have changed meanwhile).
   */
  async _findReceiptEvent(userId, { timeboardId, eventId, personId }) {
    const userAccess = await accessService.getTimeboardAccess(userId, timeboardId);
    if (!userAccess) return null;
    const target = await this._resolveTarget(userAccess, timeboardId, personId);
    if (!target) return null;
    const events = await eventService.getAllEvents({ timeboardId });
    const event = (events || []).find((ev) => String(ev.id) === String(eventId));
    if (!event || !isActiveEvent(event) || !isSettled(event) || !this.isOwnObligation(event, { ...userAccess, ...target })) return null;
    return { event, personId: target.personId };
  }

  /** Signed link token of the receipt of a paid obligation (opened in the phone's browser), or null when not allowed. */
  async createReceiptLinkToken(userId, { timeboardId, eventId, personId = null, language = 'pt' }) {
    const found = await this._findReceiptEvent(userId, { timeboardId, eventId, personId });
    if (!found) return null;
    return createLinkToken(LinkTokenPurpose.RECEIPT, {
      sub: userId,
      timeboardId,
      eventId: found.event.id,
      personId: found.personId,
      language
    }, RECEIPT_LINK_TTL_SECONDS);
  }

  /** Receipt HTML of a receipt link token (same document as the web's), or null when the link is not valid. */
  async renderReceipt(token) {
    const claims = verifyLinkToken(token, LinkTokenPurpose.RECEIPT);
    if (!claims) return null;
    const found = await this._findReceiptEvent(claims.sub, claims);
    if (!found) return null;
    const { event, personId } = found;
    const [timeboard, timelines, persons] = await Promise.all([
      timeboardRepository.getById(claims.timeboardId),
      timelineRepository.findByTimeboardId(claims.timeboardId),
      personRepository.getByTimeboardId(claims.timeboardId)
    ]);
    const language = claims.language || 'pt';
    const issuer = (persons || []).find((p) => p.role === PersonRole.ADMIN);
    return buildReceiptHtml({
      event,
      timeboard,
      timeline: (timelines || []).find((tl) => String(tl.id) === String(event.timelineId || event.timeline_id)) || null,
      receiptNumber: event.contYear ?? event.cont_year ?? null,
      currentUser: issuer ? { name: issuer.personName || issuer.name } : null,
      obligationPerson: (persons || []).find((p) => String(p.id) === String(personId)) || null,
      persons: persons || [],
      language,
      t: createT(language),
      paymentDate: event.receiptDate || event.date
    });
  }
}

export const meService = new MeService();
