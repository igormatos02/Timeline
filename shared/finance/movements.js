import {
  EventType,
  EventStatus,
  TimelineType,
  LoanEventCategory,
  IncomeEventCategory,
  ExpenseEventCategory,
  InvestmentEventCategory,
  AmortizationEventCategory,
  AmortizationStrategy,
  MovementKind,
  isPositiveStatus,
  isCancelledStatus,
  isLoanTimelineType,
  normalizeTimelineType,
  isAccountOutflowEvent,
  isPocketTransferEvent
} from '../enums/index.js';

/**
 * Movement classification — the single place that decides what an event represents financially.
 * Every total (balance, headers, reports, mobile app) is built from these rules, so the same money is
 * never counted twice:
 * - a REFERENCE (e.g. a savings withdrawal shown in the income timeline) never counts where it is shown;
 * - only EFFECTIVE movements have a realized impact; pending and cancelled ones never do.
 */

// Legacy category values still stored on older events (kept so their classification does not change)
const LEGACY_LOAN_INSTALLMENT_CATEGORY = 'parcela_emprestimo';
const LEGACY_AMORTIZATION_CATEGORIES = ['amortizacao', 'amortization'];
const LEGACY_INVESTMENT_EVENT_TYPES = ['investments'];
const LEGACY_INVESTMENT_CATEGORIES = ['savings', 'investimento'];
export const WITHDRAWAL_REFERENCE_ID_PREFIX = 'virtual_withdrawal_';

/** Not deleted nor cancelled (cancelled movements stay in the history with zero impact). */
export function isActiveMovement(ev) {
  return Boolean(ev) && !ev.isDeleted && ev.status !== EventStatus.DELETED && !isCancelledStatus(ev.status);
}

/** Effective (received, paid, deposited, credited, withdrawn, amortized…): has a realized impact. */
export function isEffectiveMovement(ev) {
  return Boolean(ev) && (isPositiveStatus(ev.status) || isPositiveStatus(String(ev.status || '').toLowerCase()) || Boolean(ev.isCompleted));
}

/** A reference of a movement owned by another timeline (never counted where it is shown — see references.js). */
export function isReferenceMovement(ev) {
  return Boolean(ev) && (
    Boolean(ev.isReference) ||
    Boolean(ev.isVirtualWithdrawal) ||
    String(ev.id || '').startsWith(WITHDRAWAL_REFERENCE_ID_PREFIX)
  );
}

const isExternalFlag = (ev) => Boolean(ev.isExternal || ev.is_external || ev.isExternal === 'true' || ev.is_external === 'true');

/**
 * Classifies an event. Returns the movement kind plus the flags used by the balance totals:
 * { kind, isReference, isEffective, isExternal, amount (absolute), pocketId, targetPocketId, isTransfer,
 *   isLoan, isLoanInst, isAmortization, isIncome, isInvestment, isWithdrawal, isAccountOutflow, isExpense, absAmt }
 */
export function classifyMovement(ev, timelineTypeMap = new Map()) {
  const tlType = timelineTypeMap.get(String(ev.timelineId || ev.timeline_id || ''));

  const isLoanInst = ev.eventType === EventType.LOAN_INSTALLMENT ||
    ev.category === LEGACY_LOAN_INSTALLMENT_CATEGORY ||
    ev.category === LoanEventCategory.LOAN_INSTALLMENT ||
    (Boolean(ev.isSystemLoanEvent) && ev.eventType !== EventType.AMORTIZATION && !LEGACY_AMORTIZATION_CATEGORIES.includes(ev.category));

  const isAmortization = ev.eventType === EventType.AMORTIZATION ||
    LEGACY_AMORTIZATION_CATEGORIES.includes(ev.category) ||
    ev.category === AmortizationEventCategory.REDUCE_TERM ||
    ev.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
    ev.category === AmortizationStrategy.REDUCE_TERM ||
    ev.category === AmortizationStrategy.REDUCE_INSTALLMENT;

  const isLoan = isLoanInst || isAmortization || isLoanTimelineType(tlType);

  const rawAmount = isLoanInst
    ? Number(ev.installmentAmount !== undefined && ev.installmentAmount !== null ? ev.installmentAmount : (ev.amount || 0))
    : Number(ev.amount || 0);
  const absAmt = Math.abs(rawAmount);

  const normalizedTlType = normalizeTimelineType(tlType || ev.timelineType || ev.timeline_type);

  const isIncome = (
    ev.eventType === EventType.INCOME ||
    normalizedTlType === TimelineType.INCOME ||
    ev.category === IncomeEventCategory.RECURRING_INCOME ||
    Boolean(ev.isIncome)
  ) && !isLoan;

  // Transfer between two spaces of the account (General / pockets): never a deposit nor a withdrawal
  const isTransfer = isPocketTransferEvent(ev) && !isLoan;

  const isInvestment = !isTransfer && (
    ev.eventType === EventType.INVESTMENT ||
    LEGACY_INVESTMENT_EVENT_TYPES.includes(ev.eventType) ||
    ev.eventType === EventType.WITHDRAWAL ||
    ev.category === InvestmentEventCategory.SAVINGS ||
    LEGACY_INVESTMENT_CATEGORIES.includes(ev.category) ||
    normalizedTlType === TimelineType.INVESTMENT ||
    Boolean(ev.isInvestment) ||
    Boolean(ev.isWithdrawal) ||
    Boolean(ev.pocketId || ev.pocket_id)
  ) && !isLoan;

  // Pocket costs / expenses debit the account but do not return money to the income timeline
  const isAccountOutflow = isInvestment && isAccountOutflowEvent(ev);
  const isWithdrawal = !isAccountOutflow && Boolean(
    ev.isWithdrawal ||
    ev.eventType === EventType.WITHDRAWAL ||
    (isInvestment && (ev.eventType === EventType.EXPENSE || ev.isExpense || Number(ev.amount || 0) < 0))
  );

  const isExpense = (
    ev.eventType === EventType.EXPENSE ||
    normalizedTlType === TimelineType.EXPENSE ||
    ev.category === ExpenseEventCategory.RECURRING_EXPENSE ||
    Boolean(ev.isExpense)
  ) && !isIncome && !isInvestment && !isLoan;

  const isReference = isReferenceMovement(ev);
  const isExternal = isExternalFlag(ev);

  let kind = MovementKind.NON_FINANCIAL;
  if (isReference) kind = ev.referenceKind || MovementKind.WITHDRAWAL;
  else if (isAmortization) kind = MovementKind.AMORTIZATION;
  else if (isLoan) kind = MovementKind.LOAN_INSTALLMENT;
  else if (isIncome) kind = MovementKind.INCOME;
  else if (isTransfer) kind = MovementKind.SAVINGS_TRANSFER;
  else if (isAccountOutflow) kind = MovementKind.SAVINGS_EXPENSE;
  else if (isWithdrawal) kind = MovementKind.WITHDRAWAL;
  else if (isInvestment) kind = isExternal ? MovementKind.DEPOSIT_EXTERNAL : MovementKind.DEPOSIT_INTERNAL;
  else if (isExpense) kind = MovementKind.EXPENSE;

  return {
    kind,
    isReference,
    isEffective: isEffectiveMovement(ev),
    isExternal,
    amount: absAmt,
    pocketId: ev.pocketId || ev.pocket_id || null,
    // Destination space of a transfer (null = General)
    targetPocketId: isTransfer ? (ev.targetPocketId || ev.target_pocket_id || null) : null,
    isTransfer,
    isLoan,
    isLoanInst,
    isAmortization,
    isIncome,
    isInvestment,
    isWithdrawal,
    isAccountOutflow,
    isExpense,
    absAmt
  };
}

// Status word of an effective movement, per kind (translation key under `status.`)
const EFFECTIVE_STATUS_KEY = Object.freeze({
  [MovementKind.INCOME]: 'received',
  [MovementKind.EXPENSE]: 'paid',
  [MovementKind.DEPOSIT_INTERNAL]: 'deposited',
  [MovementKind.DEPOSIT_EXTERNAL]: 'credited',
  [MovementKind.WITHDRAWAL]: 'withdrawn',
  [MovementKind.SAVINGS_EXPENSE]: 'paid',
  [MovementKind.SAVINGS_TRANSFER]: 'transferred',
  [MovementKind.LOAN_INSTALLMENT]: 'paid',
  [MovementKind.AMORTIZATION]: 'amortized'
});

/**
 * Uniform status of a movement for display (translation key under `status.`): pending, cancelled or the
 * effective word of its kind (received, paid, deposited, credited, withdrawn, transferred, amortized).
 */
export function getMovementStatusKey(ev, movement = classifyMovement(ev)) {
  if (isCancelledStatus(ev?.status)) return 'cancelled';
  if (!movement.isEffective) return 'pending';
  return EFFECTIVE_STATUS_KEY[movement.kind] || 'completed';
}
