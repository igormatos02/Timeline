import { EventType, EventStatus, FollowupStatus, TimelineType, AmortizationEventCategory, isPocketTransferEvent } from '../enums/index.js';

/**
 * Status words of each kind of event — the single rule used by the server (status toggle, automatic
 * payments in the projection), the web app and the event cards.
 */
const typeOf = (ev) => ev?.eventType;
const timelineTypeOf = (ev) => ev?.timelineType || ev?.timeline_type;
const isReminder = (ev) => typeOf(ev) === EventType.REMINDER || timelineTypeOf(ev) === TimelineType.REMINDER;
const isTodo = (ev) => typeOf(ev) === EventType.TODO || timelineTypeOf(ev) === TimelineType.TODO;
const isFollowup = (ev) => typeOf(ev) === EventType.FOLLOWUP || timelineTypeOf(ev) === TimelineType.FOLLOWUP;
const isWithdrawal = (ev) => typeOf(ev) === EventType.WITHDRAWAL || Boolean(ev?.isWithdrawal);
const isAmortization = (ev) => typeOf(ev) === EventType.AMORTIZATION || Boolean(ev?.isAmortization) ||
  ev?.category === AmortizationEventCategory.REDUCE_TERM || ev?.category === AmortizationEventCategory.REDUCE_INSTALLMENT ||
  (typeof ev?.isAmortizationEvent === 'function' && ev.isAmortizationEvent());

/** Status of the event once done: received, withdrawn, invested, amortized, completed, closed, finished or paid. */
export function effectiveStatusFor(ev) {
  if (isReminder(ev)) return EventStatus.CLOSED;
  if (isTodo(ev) || isPocketTransferEvent(ev)) return EventStatus.COMPLETED;
  if (isFollowup(ev)) return FollowupStatus.FINISHED;
  if (typeOf(ev) === EventType.INCOME) return EventStatus.RECEIVED;
  if (isWithdrawal(ev)) return EventStatus.WITHDRAWN;
  if (typeOf(ev) === EventType.INVESTMENT) return EventStatus.INVESTED;
  if (isAmortization(ev)) return EventStatus.AMORTIZED;
  return EventStatus.PAID;
}

/** Status of the event while not done: planned (account deposits / withdrawals), in progress, open or pending. */
export function pendingStatusFor(ev) {
  if (typeOf(ev) === EventType.INVESTMENT || isWithdrawal(ev)) return EventStatus.PLANNED;
  if (isFollowup(ev)) return FollowupStatus.IN_PROGRESS;
  if (isReminder(ev)) return EventStatus.OPEN;
  return EventStatus.PENDING;
}
