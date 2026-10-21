import { addMonths, format, getDaysInMonth, parseISO, startOfMonth } from 'date-fns';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { financialEventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { eventService } from './EventService.js';
import {
  AccountOperation,
  EventPeriodicity,
  EventRecurrence,
  EventStatus,
  EventType,
  EventUpdateMode,
  IncomeEventCategory,
  InvestmentEventCategory,
  PaymentChannel,
  PersonCategory,
  TimelineType,
  accountOperationEventType,
  isWalletTimelineType,
  normalizeTimelineType,
  paymentChannelOf,
  personCategoryOf
} from '../../../shared/enums/index.js';
import { pendingStatusFor } from '../../../shared/finance/statusRules.js';
import { accountingStartOf } from '../../../shared/finance/accountingStart.js';
import { generateUUID } from '../../../shared/utils/uuid.js';
import { createT } from '../../../shared/i18n/index.js';

// What "Atualizar lançamentos" did
export const UnitFeeAction = Object.freeze({
  CREATED: 'created',
  UPDATED: 'updated',
  UNCHANGED: 'unchanged'
});

const FEE_CATEGORIES = new Set([IncomeEventCategory.CONDO_PAYMENT, InvestmentEventCategory.CONDO_PAYMENT]);
const RECURRING = new Set([EventRecurrence.RECURRING, EventRecurrence.LIMITED]);
const ISO_DATE = 'yyyy-MM-dd';

const versionOf = (row) => Number(row.version ?? row.eventVersion ?? row.event_version ?? 0);
const cents = (value) => Math.round(Number(String(value ?? '').replace(',', '.')) * 100) / 100;

// Parts of a fee (e.g. quota + fundo de reserva) in the shape the entries use: { id, name, amount }
const normalizeParts = (parts) => (Array.isArray(parts) ? parts : [])
  .map((part) => ({ id: part.id || generateUUID(), name: String(part.name || '').trim(), amount: cents(part.amount) }))
  .filter((part) => part.amount > 0);
const sameParts = (a, b) => JSON.stringify(normalizeParts(a).map(({ name, amount }) => [name, amount]))
  === JSON.stringify(normalizeParts(b).map(({ name, amount }) => [name, amount]));

/** Same day of month as the series in another month (clamped to the month's length). */
const sameDayIn = (month, day) => format(new Date(month.getFullYear(), month.getMonth(), Math.min(day, getDaysInMonth(month))), ISO_DATE);

/**
 * Monthly fee of a condominium unit (settings → Frações → Quota): reads the unit's recurring fee and applies a
 * new value — creating the series from the accounting start date, or changing it from next month on through the
 * series' own "from this month onwards" update (past months, the current month and paid months are untouched).
 */
export class UnitFeeService {
  async _context(timeboardId, personId) {
    const [timeboard, person] = await Promise.all([timeboardRepository.getById(timeboardId), personRepository.getById(personId)]);
    if (!timeboard || !person || String(person.timeboardId) !== String(timeboardId) || personCategoryOf(person) !== PersonCategory.UNIT) return null;
    return { timeboard, person };
  }

  /** The unit's open fee series: its id, the value in force this month, its parts and where it is received. */
  async _findSeries(timeboardId, personId, today = new Date()) {
    const [rows, timelines] = await Promise.all([
      financialEventRepository.getAll({ timeboardId }),
      timelineRepository.findByTimeboardId(timeboardId)
    ]);
    const typeById = new Map(timelines.map((tl) => [String(tl.id), tl.type]));
    const todayKey = format(today, ISO_DATE);
    const feeRows = (rows || []).filter((row) => (
      String(row.obligationPersonId || row.obligation_person_id || '') === String(personId) &&
      FEE_CATEGORIES.has(row.category) &&
      (RECURRING.has(row.recurrence) || row.isRecurring)
    ));
    const bySeries = new Map();
    for (const row of feeRows) {
      const seriesId = row.eventId || row.event_id || row.id;
      bySeries.set(seriesId, [...(bySeries.get(seriesId) || []), row]);
    }
    const series = [...bySeries.entries()]
      .map(([seriesId, segments]) => {
        const sorted = [...segments].filter((s) => !s.sobrepositionOver).sort((a, b) => (a.date === b.date ? versionOf(a) - versionOf(b) : String(a.date).localeCompare(String(b.date))));
        const root = sorted[0];
        const end = sorted.map((s) => s.limitDate || s.limit_date || s.recurrenceEndDate).find(Boolean) || null;
        // The value last set (it may start next month) and the one in force today
        const latest = sorted[sorted.length - 1];
        const current = [...sorted].reverse().find((s) => String(s.date) <= todayKey) || root;
        return { seriesId, root, latest, current, end };
      })
      .filter(({ root, end }) => root && (!end || end >= todayKey))
      .sort((a, b) => String(b.root.date).localeCompare(String(a.root.date)));
    const open = series[0];
    if (!open) return null;
    return {
      seriesId: open.seriesId,
      startDate: open.root.date,
      day: Number(String(open.root.date).substring(8, 10)) || 1,
      amount: cents(open.latest.amount ?? open.latest.installmentAmount),
      parts: normalizeParts(open.latest.breakdownItems || open.latest.breakdown_items),
      // When the value last set starts in a later month, the one in force until then
      valueFrom: open.latest.date,
      currentAmount: cents(open.current.amount ?? open.current.installmentAmount),
      channel: paymentChannelOf(typeById.get(String(open.root.timelineId || open.root.timeline_id))) || PaymentChannel.CASH
    };
  }

  /** The unit's fee for the form (null when it has none yet). */
  async getUnitFee(timeboardId, personId, today = new Date()) {
    const context = await this._context(timeboardId, personId);
    if (!context) return null;
    const series = await this._findSeries(timeboardId, personId, today);
    return series ? { exists: true, ...series } : { exists: false };
  }

  /** Creates the unit's fee from the start date, or changes its value from next month on. */
  async applyUnitFee(timeboardId, personId, { amount, parts = [], channel }, language = 'pt', today = new Date()) {
    const t = createT(language);
    const context = await this._context(timeboardId, personId);
    if (!context) throw Object.assign(new Error(t('backend.validation.unitNotFound')), { status: 404 });
    const startDate = accountingStartOf(context.timeboard);
    if (!startDate) throw Object.assign(new Error(t('backend.validation.startDateRequired')), { status: 409, code: 'START_DATE_REQUIRED' });

    const cleanParts = normalizeParts(parts);
    const value = cleanParts.length > 0 ? cents(cleanParts.reduce((sum, part) => sum + part.amount, 0)) : cents(amount);
    if (!(value > 0)) throw Object.assign(new Error(t('backend.validation.unitFeeInvalid')), { status: 400 });

    const series = await this._findSeries(timeboardId, personId, today);
    if (!series) {
      await this._createSeries(context, { value, parts: cleanParts, channel: channel || context.timeboard.feeChannel, startDate: format(startOfMonth(parseISO(startDate)), ISO_DATE), t });
      return { action: UnitFeeAction.CREATED, fromDate: format(startOfMonth(parseISO(startDate)), ISO_DATE), amount: value };
    }
    if (series.amount === value && sameParts(series.parts, cleanParts)) {
      return { action: UnitFeeAction.UNCHANGED, amount: value };
    }
    // From next month on: the series' occurrence of next month gets the new value for itself and what follows
    const fromDate = sameDayIn(addMonths(startOfMonth(today), 1), series.day);
    await eventService.updateEvent(`${series.seriesId}_${fromDate}`, {
      // The new segment starts on this occurrence's date (without it, it would start with the series)
      date: fromDate,
      amount: value,
      breakdownItems: cleanParts,
      breakdown_items: cleanParts,
      updateScope: EventUpdateMode.SUBSEQUENT
    });
    return { action: UnitFeeAction.UPDATED, fromDate, previousAmount: series.amount, amount: value };
  }

  /** A unit's recurring monthly fee, as the web forms create it (cash income or money received in the account). */
  async _createSeries({ timeboard, person }, { value, parts, channel, startDate, t }) {
    const timelines = await timelineRepository.findByTimeboardId(timeboard.id);
    const isBank = channel === PaymentChannel.BANK;
    const timeline = isBank
      ? timelines.find((tl) => normalizeTimelineType(tl.type) === TimelineType.INVESTMENT)
      : timelines.find((tl) => isWalletTimelineType(tl.type));
    if (!timeline) throw Object.assign(new Error(t('backend.validation.unitFeeNoTimeline')), { status: 409 });
    const eventType = isBank ? accountOperationEventType(AccountOperation.RECEIVE) : EventType.INCOME;
    const title = t('incomeCategories.condo_payment');
    return eventService.createEvent({
      id: generateUUID(),
      eventId: generateUUID(),
      title,
      name: title,
      description: '',
      amount: value,
      breakdownItems: parts.length > 0 ? parts : undefined,
      date: startDate,
      dayOfMonth: Number(startDate.substring(8, 10)),
      recurrence: EventRecurrence.RECURRING,
      isRecurring: true,
      periodicity: EventPeriodicity.MONTHLY,
      eventType,
      category: isBank ? InvestmentEventCategory.CONDO_PAYMENT : IncomeEventCategory.CONDO_PAYMENT,
      ...(isBank ? { isExternal: true, is_external: true } : {}),
      status: isBank ? pendingStatusFor({ eventType }) : EventStatus.PENDING,
      isObligation: true,
      obligationPersonId: person.id,
      timeboardId: timeboard.id,
      timelineId: timeline.id,
      timelineOriginId: timeline.id,
      pocketId: null,
      pocket_id: null
    });
  }
}

export const unitFeeService = new UnitFeeService();
