import { EventType, EventStatus, TimelineType, MovementKind, isPositiveStatus } from '../enums/index.js';
import { classifyMovement, isActiveMovement, isEffectiveMovement, WITHDRAWAL_REFERENCE_ID_PREFIX } from './movements.js';

/**
 * References: read-only copies of a movement shown in a timeline that does not own it, so each timeline
 * tells the whole story of its money. They are built in memory (never persisted) and never count in any
 * total (see isReferenceMovement) — the movement is only counted in its owner timeline.
 */

export { WITHDRAWAL_REFERENCE_ID_PREFIX };
export const OUTFLOW_REFERENCE_ID_PREFIX = 'ref_outflow_';

// Fields that make an event look like a pocket, recurring series or loan installment — cleared on references
const OWNER_ONLY_FIELDS = Object.freeze({
  pocketId: null,
  pocket_id: null,
  pocket: null,
  eventId: null,
  seriesId: null,
  installmentNumber: null,
  installment_number: null,
  installmentAmount: null,
  isSystemLoanEvent: false,
  isAmortization: false,
  isAbated: false,
  loanId: null,
  loan_id: null,
  loanContractId: null,
  labels: []
});

const placeOn = (timelineId) => ({ timelineId, timeline_id: timelineId, timelineOriginId: timelineId, timeline_origin_id: timelineId });

/**
 * Savings withdrawals shown as income in the income timeline (the money "returning" to the available money).
 */
export function buildWithdrawalReferences({ events = [], incomeTimelineId }) {
  if (!incomeTimelineId) return [];
  const references = [];
  (events || []).forEach((ev) => {
    if (!ev || ev.isDeleted) return;
    const isWithdrawal = ev.eventType === EventType.WITHDRAWAL || Boolean(ev.isWithdrawal);
    if (!isWithdrawal) return;
    const isPositive = isPositiveStatus(ev.status) || Boolean(ev.isCompleted) || ev.status === EventStatus.WITHDRAWN;
    references.push({
      ...ev,
      ...OWNER_ONLY_FIELDS,
      ...placeOn(incomeTimelineId),
      id: `${WITHDRAWAL_REFERENCE_ID_PREFIX}${ev.id}`,
      originalWithdrawalId: ev.id,
      eventType: EventType.INCOME,
      isIncome: true,
      isWithdrawal: false,
      isInvestment: false,
      category: null,
      categoryName: null,
      status: isPositive ? EventStatus.RECEIVED : EventStatus.PENDING,
      isCompleted: isPositive,
      amount: Math.abs(Number(ev.amount || 0)),
      title: ev.title || ev.name || '',
      name: ev.title || ev.name || '',
      isVirtual: true,
      isReadOnly: true,
      isVirtualWithdrawal: true
    });
  });
  return references;
}

/**
 * Outflows owned by other timelines shown in the Outflows (expense) timeline:
 * - expenses and costs paid by the savings (active ones, with their status);
 * - loan installments and amortizations already paid.
 * Each reference keeps `referenceKind` (the mirrored movement kind) and the origin (event + timeline).
 */
export function buildOutflowReferences({ events = [], expenseTimelineId, timelineTypeMap = new Map() }) {
  if (!expenseTimelineId) return [];
  const references = [];
  (events || []).forEach((ev) => {
    if (!ev || !ev.date || !isActiveMovement(ev)) return;
    const movement = classifyMovement(ev, timelineTypeMap);
    if (movement.isReference) return;
    const isSavingsExpense = movement.kind === MovementKind.SAVINGS_EXPENSE;
    const isPaidLoanPayment = (movement.kind === MovementKind.LOAN_INSTALLMENT || movement.kind === MovementKind.AMORTIZATION) && movement.isEffective;
    if (!isSavingsExpense && !isPaidLoanPayment) return;

    const originTimelineId = ev.timelineId || ev.timeline_id || ev.timelineOriginId || null;
    const isEffective = isEffectiveMovement(ev);
    references.push({
      ...ev,
      ...OWNER_ONLY_FIELDS,
      ...placeOn(expenseTimelineId),
      id: `${OUTFLOW_REFERENCE_ID_PREFIX}${ev.id}`,
      eventType: EventType.EXPENSE,
      timelineType: TimelineType.EXPENSE,
      isExpense: true,
      isIncome: false,
      isWithdrawal: false,
      isInvestment: false,
      // Pocket expenses keep their expense category (so the category filter still finds them)
      category: isSavingsExpense ? ev.category || null : null,
      status: isEffective ? EventStatus.PAID : EventStatus.PENDING,
      isCompleted: isEffective,
      amount: movement.amount,
      title: ev.title || ev.name || '',
      name: ev.title || ev.name || '',
      isVirtual: true,
      isReadOnly: true,
      isReference: true,
      referenceKind: movement.kind,
      referenceOriginId: ev.id,
      referenceOriginTimelineId: originTimelineId ? String(originTimelineId) : null
    });
  });
  return references;
}
