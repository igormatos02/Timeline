import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { eventService } from './EventService.js';
import { planService, PlanLimitError } from './PlanService.js';
import {
  AccountOperation,
  EventPeriodicity,
  EventRecurrence,
  EventStatus,
  EventType,
  IncomeEventCategory,
  InvestmentEventCategory,
  PaymentChannel,
  PersonRole,
  PersonType,
  TimelineType,
  accountOperationEventType,
  isWalletTimelineType,
  normalizeTimelineType
} from '../../../shared/enums/index.js';
import { pendingStatusFor } from '../../../shared/finance/statusRules.js';
import { generateUUID } from '../../../shared/utils/uuid.js';
import { createT } from '../../../shared/i18n/index.js';

// Reasons a row is not imported (translated by the web under units.import.reasons)
export const UnitImportSkip = Object.freeze({
  MISSING_FIELDS: 'missingFields',
  INVALID_FEE: 'invalidFee',
  DUPLICATE_IN_FILE: 'duplicateInFile',
  ALREADY_EXISTS: 'alreadyExists'
});

const normalizeUnit = (value) => String(value || '').trim().toLowerCase();
const parseFee = (value) => {
  const text = String(value ?? '').trim().replace(/\s|€/g, '').replace(',', '.');
  if (!text) return 0;
  const amount = Number(text);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) / 100 : null;
};

/**
 * Imports a condominium's units (frações) from a spreadsheet: each row becomes an entity (individual owner) and,
 * when it has a monthly fee, the recurring fee movement the web creates (cash or bank account). The plan's unit
 * limit is checked for the whole file before anything is created.
 */
export class UnitImportService {
  async importUnits(timeboardId, { rows = [], feeStartDate, feeChannel = PaymentChannel.CASH, language = 'pt' }) {
    const t = createT(language);
    const existing = await personRepository.getByTimeboardId(timeboardId);
    const existingUnits = new Set((existing || []).map((p) => normalizeUnit(p.obligatorIdentification)).filter(Boolean));
    const seen = new Set();
    const skipped = [];
    const valid = [];

    (rows || []).forEach((row, index) => {
      const unit = String(row.unit || '').trim();
      const name = String(row.name || '').trim();
      const fee = parseFee(row.monthlyFee);
      const key = normalizeUnit(unit);
      let reason = null;
      if (!unit || !name) reason = UnitImportSkip.MISSING_FIELDS;
      else if (fee === null) reason = UnitImportSkip.INVALID_FEE;
      else if (seen.has(key)) reason = UnitImportSkip.DUPLICATE_IN_FILE;
      else if (existingUnits.has(key)) reason = UnitImportSkip.ALREADY_EXISTS;
      if (reason) {
        skipped.push({ line: index + 1, unit, reason });
        return;
      }
      seen.add(key);
      valid.push({ ...row, unit, name, fee });
    });

    // The whole file must fit the plan (nothing is created otherwise)
    const info = await planService.getPlanInfo(timeboardId);
    if (info?.isLicensed && info.usage.units + valid.length > info.limits.maxUnits) {
      throw new PlanLimitError(t('backend.plan.unitsLimit', { max: info.limits.maxUnits }), { limit: 'units', planId: info.effectivePlanId });
    }

    const timelines = await timelineRepository.findByTimeboardId(timeboardId);
    const isBank = feeChannel === PaymentChannel.BANK;
    const feeTimeline = isBank
      ? timelines.find((tl) => normalizeTimelineType(tl.type) === TimelineType.INVESTMENT)
      : timelines.find((tl) => isWalletTimelineType(tl.type));
    const startDate = /^\d{4}-\d{2}-\d{2}$/.test(String(feeStartDate || '')) ? feeStartDate : new Date().toISOString().substring(0, 10);
    const feeTitle = t('incomeCategories.condo_payment');

    let createdUnits = 0;
    let createdFees = 0;
    for (const row of valid) {
      const person = await personRepository.create({
        timeboardId,
        type: PersonType.PERSON,
        personName: row.name,
        obligatorIdentification: row.unit,
        email: String(row.email || '').trim(),
        phone: String(row.phone || '').trim(),
        taxId: String(row.taxId || '').trim() || null,
        observation: String(row.observation || '').trim(),
        role: PersonRole.INDIVIDUAL
      });
      createdUnits += 1;
      if (!row.fee || !feeTimeline) continue;
      // Same monthly fee as the web forms: an income of the cash, or money received in the bank account
      const eventType = isBank ? accountOperationEventType(AccountOperation.RECEIVE) : EventType.INCOME;
      await eventService.createEvent({
        id: generateUUID(),
        eventId: generateUUID(),
        title: feeTitle,
        name: feeTitle,
        description: '',
        amount: row.fee,
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
        timeboardId,
        timelineId: feeTimeline.id,
        timelineOriginId: feeTimeline.id,
        pocketId: null,
        pocket_id: null
      });
      createdFees += 1;
    }

    return { createdUnits, createdFees, skipped };
  }
}

export const unitImportService = new UnitImportService();
