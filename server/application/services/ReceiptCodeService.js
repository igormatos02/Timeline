import { randomInt } from 'node:crypto';
import { endOfMonth, format, parseISO, startOfMonth } from 'date-fns';
import { pt, enUS } from 'date-fns/locale';
import { receiptCodeRepository } from '../../infrastructure/database/supabase/SupabaseReceiptCodeRepository.js';
import { financialEventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { financialEventStatusRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventStatusRepository.js';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { eventService } from './EventService.js';
import { EventRecurrence, PersonRole, TimeboardType, isPositiveStatus } from '../../../shared/enums/index.js';
import { buildReceiptHtml, computeNextReceiptNumber, computeReceiptNumber } from '../../../shared/utils/receiptGenerator.js';
import { formatCurrency } from '../../../shared/utils/formatCurrency.js';
import { getAppUrl } from '../../../shared/config/appConfig.js';
import { createT } from '../../../shared/i18n/index.js';

// Receipt codes: CF-XXXX-XXXX-XXXX from 31 unambiguous symbols (no 0/O, 1/I/L) — about 59 bits, unguessable
const CODE_PREFIX = 'CF';
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_GROUPS = 3;
const CODE_GROUP_LENGTH = 4;
// Attempts to take the next receipt number when another receipt already uses it
const MAX_NUMBER_ATTEMPTS = 25;

// State of a receipt code on the verification page
export const ReceiptCodeState = Object.freeze({
  VALID: 'valid',
  VOIDED: 'voided',
  NOT_FOUND: 'notFound'
});

const generateCode = () => [CODE_PREFIX, ...Array.from({ length: CODE_GROUPS }, () => (
  Array.from({ length: CODE_GROUP_LENGTH }, () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)]).join('')
))].join('-');

/** Typed or scanned code in the canonical form (upper case, dashes), or '' when it cannot be one. */
export const normalizeReceiptCode = (raw) => {
  const compact = String(raw || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = compact.startsWith(CODE_PREFIX) ? compact.substring(CODE_PREFIX.length) : compact;
  if (body.length !== CODE_GROUPS * CODE_GROUP_LENGTH) return '';
  const groups = body.match(new RegExp(`.{${CODE_GROUP_LENGTH}}`, 'g'));
  return [CODE_PREFIX, ...groups].join('-');
};

export const receiptVerifyUrl = (code) => `${getAppUrl()}/recibo/${code}`;

const isRecurringRow = (row) => row.recurrence === EventRecurrence.RECURRING || row.recurrence === EventRecurrence.LIMITED || row.isRecurring;
const seriesIdOf = (row) => String(row.eventId || row.event_id || row.id);

/**
 * Receipts of a condominium's received obligations (CondoFlow): when an occurrence becomes received it gets a
 * receipt code (printed with a QR code; timeboard.pt/recibo/<code> verifies it) and, when it has none, the next
 * receipt number of its timeline — the rule the web applies when printing; the number can still be changed.
 * Reverting or cancelling voids the code for good.
 */
export class ReceiptCodeService {
  /** Occurrence of an event id ("<series>_<date>" or a unique event) in a condominium, or null. */
  async _occurrence(id, date) {
    const [rootId, idDate] = String(id).split('_');
    const row = await financialEventRepository.getByIdOrSeries(rootId);
    if (!row || !(row.obligationPersonId || row.obligation_person_id)) return null;
    const timeboard = await timeboardRepository.getById(row.timeboardId || row.timeboard_id);
    if (timeboard?.type !== TimeboardType.CONDOFLOW) return null;
    const occurrenceDate = String(date || idDate || row.date).substring(0, 10);
    const occurrenceId = isRecurringRow(row) ? `${seriesIdOf(row)}_${occurrenceDate}` : row.id;
    return { row, timeboard, occurrenceDate, occurrenceId, seriesId: seriesIdOf(row), personId: row.obligationPersonId || row.obligation_person_id };
  }

  /** A status change (web, Gestão app): received → code and number; reverted / cancelled → code voided. */
  async onStatusChanged({ id, date, status }) {
    try {
      if (!id || !status) return null;
      const occurrence = await this._occurrence(id, date);
      if (!occurrence) return null;
      if (!isPositiveStatus(status)) {
        await receiptCodeRepository.voidActive(occurrence.seriesId, occurrence.occurrenceDate);
        return null;
      }
      // The number first: it does not depend on the codes table
      const receiptNumber = await this._ensureReceiptNumber(occurrence, status);
      const code = await this._ensureCode(occurrence);
      return { code, receiptNumber };
    } catch (err) {
      console.warn('[ReceiptCodeService] receipt code not handled:', err.message);
      return null;
    }
  }

  /** The receipt code of a received occurrence (created when missing), with its receipt number. */
  async codeForOccurrence({ id, date }) {
    const occurrence = await this._occurrence(id, date);
    if (!occurrence) return null;
    const current = await this._monthOccurrence(occurrence);
    if (!isPositiveStatus(current?.status)) return null;
    const receiptNumber = await this._ensureReceiptNumber(occurrence, current.status);
    const code = await this._ensureCode(occurrence);
    return { code, receiptNumber, verifyUrl: receiptVerifyUrl(code) };
  }

  async _ensureCode({ timeboard, seriesId, occurrenceDate, personId }) {
    const existing = await receiptCodeRepository.findActive(seriesId, occurrenceDate);
    if (existing) return existing.code;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const created = await receiptCodeRepository.create({ code: generateCode(), timeboardId: timeboard.id, eventId: seriesId, occurrenceDate, personId });
      if (created) return created.code;
      // Another request created it meanwhile (or, very unlikely, the code exists): use the occurrence's code
      const raced = await receiptCodeRepository.findActive(seriesId, occurrenceDate);
      if (raced) return raced.code;
    }
    throw new Error('Could not create a receipt code');
  }

  /** Next receipt number of the occurrence's timeline when it has none (skipping numbers already used). */
  async _ensureReceiptNumber({ row, timeboard, seriesId, occurrenceDate, occurrenceId }, status) {
    const [year, month] = occurrenceDate.substring(0, 7).split('-').map(Number);
    const rows = await financialEventStatusRepository.getAll({ eventId: seriesId, year, month });
    const stored = Number(rows.find((r) => Number(r.cont_year) > 0)?.cont_year || 0);
    if (stored > 0) return stored;
    const timeline = await timelineRepository.getById(row.timelineId || row.timeline_id);
    let number = computeReceiptNumber(timeline);
    for (let attempt = 0; attempt < MAX_NUMBER_ATTEMPTS; attempt += 1) {
      try {
        await eventService.setEventStatus(occurrenceId, {
          date: occurrenceDate,
          status,
          contYear: number,
          cont_year: number,
          checkReceiptNumber: true,
          timelineId: timeline?.id,
          timeboardId: timeboard.id
        });
        if (timeline?.id) await timelineRepository.update(timeline.id, { contYear: computeNextReceiptNumber(number), cont_year: computeNextReceiptNumber(number) });
        return number;
      } catch (err) {
        if (err.code !== 'RECEIPT_NUMBER_TAKEN') throw err;
        number = computeNextReceiptNumber(number);
      }
    }
    return null;
  }

  /** The occurrence as the timeline shows it (status, amount, receipt number and date of that month). */
  async _monthOccurrence({ timeboard, occurrenceDate, occurrenceId }) {
    const events = await eventService.getAllEvents({
      timeboardId: timeboard.id,
      startDate: format(startOfMonth(parseISO(occurrenceDate)), 'yyyy-MM-dd'),
      endDate: format(endOfMonth(parseISO(occurrenceDate)), 'yyyy-MM-dd')
    });
    return (events || []).find((ev) => String(ev.id) === String(occurrenceId)) || null;
  }

  /** Verification page: whether a code is valid, with the receipt's essentials (no contacts). */
  async verify(rawCode, language = 'pt') {
    const code = normalizeReceiptCode(rawCode);
    const record = code ? await receiptCodeRepository.findByCode(code) : null;
    if (!record) return { state: ReceiptCodeState.NOT_FOUND };
    const found = await this._recordOccurrence(record);
    const isValid = !record.voidedAt && found && isPositiveStatus(found.event?.status);
    if (!isValid) return { state: ReceiptCodeState.VOIDED, code };
    const { event, timeboard, person } = found;
    const locale = language === 'pt' ? pt : enUS;
    const paymentDate = event.receiptDate || event.receipt_date || event.date;
    return {
      state: ReceiptCodeState.VALID,
      code,
      condominium: timeboard.name || '',
      unit: person?.obligatorIdentification || '',
      concept: event.title || event.name || '',
      month: format(parseISO(event.date), 'MMMM yyyy', { locale }),
      amount: formatCurrency(Math.abs(Number(event.amount || 0))),
      paymentDate: format(parseISO(paymentDate), 'dd/MM/yyyy'),
      receiptNumber: event.contYear ?? event.cont_year ?? null
    };
  }

  /** Receipt HTML of a valid code (the e-mail and the verification page open it), or null. */
  async renderByCode(rawCode, language = 'pt') {
    const code = normalizeReceiptCode(rawCode);
    const record = code ? await receiptCodeRepository.findByCode(code) : null;
    if (!record || record.voidedAt) return null;
    const found = await this._recordOccurrence(record);
    if (!found || !isPositiveStatus(found.event?.status)) return null;
    const { event, timeboard, person, persons, timeline } = found;
    const issuer = persons.find((p) => p.role === PersonRole.ADMIN);
    return buildReceiptHtml({
      event,
      timeboard,
      timeline,
      receiptNumber: event.contYear ?? event.cont_year ?? null,
      currentUser: issuer ? { name: issuer.personName || issuer.name } : null,
      obligationPerson: person,
      persons,
      language,
      t: createT(language),
      paymentDate: event.receiptDate || event.date,
      receiptCode: code,
      verifyUrl: receiptVerifyUrl(code)
    });
  }

  async _recordOccurrence(record) {
    const timeboard = await timeboardRepository.getById(record.timeboardId);
    if (!timeboard) return null;
    const row = await financialEventRepository.getById(record.eventId)
      || (await financialEventRepository.getAll({ timeboardId: timeboard.id })).find((r) => seriesIdOf(r) === String(record.eventId));
    if (!row) return null;
    const occurrenceId = isRecurringRow(row) ? `${record.eventId}_${record.occurrenceDate}` : row.id;
    const event = await this._monthOccurrence({ timeboard, occurrenceDate: record.occurrenceDate, occurrenceId });
    if (!event) return null;
    const [persons, timelines] = await Promise.all([
      personRepository.getByTimeboardId(timeboard.id),
      timelineRepository.findByTimeboardId(timeboard.id)
    ]);
    return {
      event,
      timeboard,
      persons: persons || [],
      person: (persons || []).find((p) => String(p.id) === String(record.personId)) || null,
      timeline: (timelines || []).find((tl) => String(tl.id) === String(event.timelineId || event.timeline_id)) || null
    };
  }
}

export const receiptCodeService = new ReceiptCodeService();
