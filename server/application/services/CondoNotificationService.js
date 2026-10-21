import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { financialEventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { emailOutboxRepository } from '../../infrastructure/database/supabase/SupabaseEmailOutboxRepository.js';
import { eventService } from './EventService.js';
import { meService } from './MeService.js';
import { emailService } from './EmailService.js';
import { pushNotificationService } from './PushNotificationService.js';
import {
  CondoNotificationKind,
  EventRecurrence,
  IncomeEventCategory,
  InvestmentEventCategory,
  PersonCategory,
  PushNotificationKind,
  TimeboardType,
  isPositiveStatus,
  personCategoryOf
} from '../../../shared/enums/index.js';
import { getAppUrl } from '../../../shared/config/appConfig.js';
import { OVERDUE_NOTICE_DAY } from '../../../shared/config/notifications.js';
import { createT } from '../../../shared/i18n/index.js';

// E-mails per day this service may send: under the free plan of the e-mail provider (about 300 a day), leaving the
// rest for invitations and account e-mails, which are never held back
const DAILY_EMAIL_BUDGET = Number(process.env.EMAIL_DAILY_BUDGET) || 250;
const TIME_ZONE = 'Europe/Lisbon';
// Owners' notices are written in the condominiums' language
const NOTICE_LANGUAGE = 'pt';

const FEE_CATEGORIES = new Set([IncomeEventCategory.CONDO_PAYMENT, InvestmentEventCategory.CONDO_PAYMENT]);
const todayIn = (timeZone) => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
const money = (value) => Number(value || 0).toFixed(2).replace('.', ',');
const monthLabelOf = (date, language) => format(parseISO(date), 'MMMM yyyy', { locale: language === 'pt' ? pt : enUS });
const isRecurringRow = (row) => row.recurrence === EventRecurrence.RECURRING || row.recurrence === EventRecurrence.LIMITED || row.isRecurring;

/**
 * Notices to the owners of a condominium's units — the receipt when a fee is received and, once a month, the
 * overdue fees — when the condominium turned them on (settings → Geral). Owners with the CondoFlow app get a push
 * notification; the others an e-mail, sent through an outbox within a daily budget (what does not fit waits for
 * the next day, never lost) and never twice (dedupe keys). Nothing here ever fails the action that triggered it.
 */
export class CondoNotificationService {
  /** A fee occurrence changed status (web or Gestão app): when it was received, its receipt goes to the owner. */
  async onFeeStatusChanged({ id, date, status }) {
    try {
      if (!id || !isPositiveStatus(status)) return null;
      const [rootId, idDate] = String(id).split('_');
      const row = await financialEventRepository.getById(rootId);
      if (!row || !FEE_CATEGORIES.has(row.category) || !(row.obligationPersonId || row.obligation_person_id)) return null;
      const timeboard = await timeboardRepository.getById(row.timeboardId || row.timeboard_id);
      if (timeboard?.type !== TimeboardType.CONDOFLOW || !timeboard.notifyReceipts) return null;
      const person = await personRepository.getById(row.obligationPersonId || row.obligation_person_id);
      if (!person || personCategoryOf(person) !== PersonCategory.UNIT) return null;

      const receipt = await this._receiptOf({ row, idDate, date, timeboard, person });
      const { occurrenceId, month, amount } = receipt;

      const pushed = await pushNotificationService.notifyUser(person.userId, timeboard.id, PushNotificationKind.RECEIPT, (t) => ({
        title: t('backend.notify.receiptPushTitle', { timeboard: timeboard.name || '' }),
        body: t('backend.notify.receiptPushBody', { month, amount: money(amount) })
      }), { eventId: occurrenceId });
      if (pushed.sent > 0) return { channel: 'push' };
      if (!person.email) return { channel: 'none' };

      await emailOutboxRepository.enqueue({
        timeboardId: timeboard.id,
        kind: CondoNotificationKind.RECEIPT,
        recipientEmail: person.email,
        dedupeKey: `receipt:${occurrenceId}`,
        payload: receipt.payload
      });
      await this.processOutbox(5);
      return { channel: 'email' };
    } catch (err) {
      console.warn('[CondoNotificationService] receipt notice not sent:', err.message);
      return null;
    }
  }

  /** A fee occurrence of a unit: its id, month, amount, whether it is paid and the e-mail payload of its receipt. */
  async _receiptOf({ row, idDate, date, timeboard, person }) {
    const occurrenceDate = String(date || idDate || row.date).substring(0, 10);
    const occurrenceId = isRecurringRow(row) ? `${row.eventId || row.id}_${occurrenceDate}` : row.id;
    // The amount of that month (a series may have changed value over time)
    const monthEvents = await eventService.getAllEvents({
      timeboardId: timeboard.id,
      startDate: format(startOfMonth(parseISO(occurrenceDate)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(parseISO(occurrenceDate)), 'yyyy-MM-dd')
    });
    const occurrence = (monthEvents || []).find((ev) => String(ev.id) === String(occurrenceId));
    const amount = Math.abs(Number(occurrence?.amount ?? row.amount ?? 0));
    const month = monthLabelOf(occurrenceDate, NOTICE_LANGUAGE);
    return {
      occurrenceId,
      month,
      amount,
      isPaid: isPositiveStatus(occurrence?.status),
      payload: {
        name: person.personName || '',
        unit: person.obligatorIdentification || '',
        timeboardName: timeboard.name || '',
        month,
        amount: money(amount),
        receiptUrl: meService.createEmailReceiptLink({ timeboard, eventId: occurrenceId, personId: person.id, language: NOTICE_LANGUAGE })
      }
    };
  }

  /**
   * "Enviar por email" in the receipt (web): sends the receipt of a paid fee to the given address now, or keeps it
   * for the next day when today's budget is used up. Resending is allowed (no dedupe).
   */
  async sendReceiptByEmail({ id, date, personId, email }) {
    const t = createT('en');
    const recipient = String(email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) throw Object.assign(new Error(t('backend.notify.invalidEmail')), { status: 400 });
    const [rootId, idDate] = String(id).split('_');
    const row = await financialEventRepository.getById(rootId);
    const timeboard = row ? await timeboardRepository.getById(row.timeboardId || row.timeboard_id) : null;
    const person = personId ? await personRepository.getById(personId) : null;
    if (!row || timeboard?.type !== TimeboardType.CONDOFLOW || !person || String(person.timeboardId) !== String(timeboard.id)) {
      throw Object.assign(new Error(t('backend.notify.receiptUnavailable')), { status: 404 });
    }
    const receipt = await this._receiptOf({ row, idDate, date, timeboard, person });
    if (!receipt.isPaid) throw Object.assign(new Error(t('backend.notify.receiptNotPaid')), { status: 409 });
    await emailOutboxRepository.enqueue({
      timeboardId: timeboard.id,
      kind: CondoNotificationKind.RECEIPT,
      recipientEmail: recipient,
      dedupeKey: `receipt-manual:${receipt.occurrenceId}:${Date.now()}`,
      payload: receipt.payload
    });
    const result = await this.processOutbox(1);
    return { sent: result.sent > 0, queued: result.sent === 0 };
  }

  /** Daily job: on the notice day, each unit with overdue fees is told once that month (push or e-mail). */
  async runMonthlyOverdue() {
    const today = todayIn(TIME_ZONE);
    if (Number(today.substring(8, 10)) !== OVERDUE_NOTICE_DAY) return { skipped: true };
    const monthKey = today.substring(0, 7);
    const condominiums = await timeboardRepository.getAll((tb) => tb.type === TimeboardType.CONDOFLOW && tb.notifyOverdue);
    let pushed = 0;
    let queued = 0;
    for (const timeboard of condominiums) {
      try {
        const [overdue, persons] = await Promise.all([
          meService.getOverdueByPerson(timeboard.id, today),
          personRepository.getByTimeboardId(timeboard.id)
        ]);
        for (const person of persons.filter((p) => personCategoryOf(p) === PersonCategory.UNIT)) {
          const debt = overdue.get(String(person.id));
          if (!debt?.overdueCount) continue;
          const result = await pushNotificationService.notifyUser(person.userId, timeboard.id, PushNotificationKind.OVERDUE, (t) => ({
            title: t('backend.notify.overduePushTitle', { timeboard: timeboard.name || '' }),
            body: t('backend.notify.overduePushBody', { count: debt.overdueCount, amount: money(debt.overdueAmount) })
          }));
          if (result.sent > 0) {
            pushed += 1;
            continue;
          }
          if (!person.email) continue;
          const entry = await emailOutboxRepository.enqueue({
            timeboardId: timeboard.id,
            kind: CondoNotificationKind.OVERDUE,
            recipientEmail: person.email,
            dedupeKey: `overdue:${person.id}:${monthKey}`,
            payload: {
              name: person.personName || '',
              unit: person.obligatorIdentification || '',
              timeboardName: timeboard.name || '',
              count: debt.overdueCount,
              amount: money(debt.overdueAmount)
            }
          });
          if (entry) queued += 1;
        }
      } catch (err) {
        console.warn(`[CondoNotificationService] overdue notices of ${timeboard.id} failed:`, err.message);
      }
    }
    const outbox = await this.processOutbox();
    return { pushed, queued, ...outbox };
  }

  /** Sends queued e-mails, oldest first, while today's budget allows; the rest wait for the next run. */
  async processOutbox(limit = Infinity) {
    try {
      return await this._processOutbox(limit);
    } catch (err) {
      // e.g. before migration 0019 (no outbox): the daily job goes on
      console.warn('[CondoNotificationService] outbox not processed:', err.message);
      return { sent: 0, error: err.message };
    }
  }

  async _processOutbox(limit) {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const room = DAILY_EMAIL_BUDGET - await emailOutboxRepository.countSentSince(startOfToday.toISOString());
    const pending = await emailOutboxRepository.listPending(Math.max(0, Math.min(room, limit)));
    let sent = 0;
    for (const entry of pending) {
      try {
        const delivered = await emailService.sendCondoNotification(this._render(entry));
        // E-mail not configured in this environment: keep everything for later
        if (!delivered) break;
        await emailOutboxRepository.markSent(entry.id);
        sent += 1;
      } catch (err) {
        await emailOutboxRepository.markFailed(entry, err.message);
      }
    }
    return { sent, pending: await emailOutboxRepository.countPending(), budgetLeft: Math.max(0, room - sent) };
  }

  _render(entry) {
    const t = createT(NOTICE_LANGUAGE);
    const p = entry.payload;
    if (entry.kind === CondoNotificationKind.RECEIPT) {
      return {
        toEmail: entry.recipientEmail,
        toName: p.name,
        language: NOTICE_LANGUAGE,
        subject: t('backend.notify.receiptSubject', { timeboard: p.timeboardName, month: p.month }),
        title: t('backend.notify.receiptTitle'),
        paragraphs: [t('backend.notify.receiptBody', { name: p.name, month: p.month, amount: p.amount, timeboard: p.timeboardName })],
        details: [
          { label: t('backend.notify.unitLabel'), value: p.unit },
          { label: t('backend.notify.monthLabel'), value: p.month },
          { label: t('backend.notify.amountLabel'), value: `${p.amount} €` }
        ],
        ctaUrl: p.receiptUrl,
        ctaLabel: t('backend.notify.receiptCta')
      };
    }
    return {
      toEmail: entry.recipientEmail,
      toName: p.name,
      language: NOTICE_LANGUAGE,
      subject: t('backend.notify.overdueSubject', { timeboard: p.timeboardName }),
      title: t('backend.notify.overdueTitle'),
      paragraphs: [
        t('backend.notify.overdueBody', { name: p.name, count: p.count, amount: p.amount, timeboard: p.timeboardName }),
        t('backend.notify.overdueHint')
      ],
      details: [
        { label: t('backend.notify.unitLabel'), value: p.unit },
        { label: t('backend.notify.overdueCountLabel'), value: String(p.count) },
        { label: t('backend.notify.amountLabel'), value: `${p.amount} €` }
      ],
      ctaUrl: `${getAppUrl()}/condoflow`,
      ctaLabel: t('backend.notify.overdueCta')
    };
  }

  /** E-mails this condominium sent this month (settings → Geral). */
  async monthStats(timeboardId) {
    const since = startOfMonth(new Date()).toISOString();
    return { sentThisMonth: await emailOutboxRepository.countSentSince(since, timeboardId) };
  }
}

export const condoNotificationService = new CondoNotificationService();
