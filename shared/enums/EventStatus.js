export const EventStatus = Object.freeze({
  ALL: 'all',
  PENDING: 'pending',
  PAID: 'paid',
  RECEIVED: 'received',
  INVESTED: 'invested',
  PLANNED: 'planned',
  COMPLETED: 'completed',
  AMORTIZED: 'amortized',
  OVERDUE: 'overdue',
  CANCELLED: 'cancelled',
  DELETED: 'deleted',
  IN_PROGRESS: 'in_progress',
  SETTLED: 'settled',
  ABATED: 'abated',
  OPEN: 'open',
  CLOSED: 'closed',
  TO_RECEIVE: 'toReceive',
  TO_PAY: 'toPay',
  NEXT_INCOME: 'nextIncome'
});

export const ReminderEventStatus = Object.freeze({
  OPEN: EventStatus.OPEN,
  CLOSED: EventStatus.CLOSED,
  CANCELLED: EventStatus.CANCELLED
});

export const EventStatusLabel = Object.freeze({
  [EventStatus.ALL]: 'All',
  [EventStatus.PENDING]: 'Pending',
  [EventStatus.PAID]: 'Paid',
  [EventStatus.RECEIVED]: 'Received',
  [EventStatus.INVESTED]: 'Invested',
  [EventStatus.PLANNED]: 'Planned',
  [EventStatus.COMPLETED]: 'Completed',
  [EventStatus.AMORTIZED]: 'Amortized',
  [EventStatus.OVERDUE]: 'Overdue',
  [EventStatus.CANCELLED]: 'Cancelled',
  [EventStatus.DELETED]: 'Deleted',
  [EventStatus.IN_PROGRESS]: 'In Progress',
  [EventStatus.SETTLED]: 'Settled',
  [EventStatus.ABATED]: 'Abated',
  [EventStatus.OPEN]: 'Open',
  [EventStatus.CLOSED]: 'Closed',
  [EventStatus.TO_RECEIVE]: 'To Receive',
  [EventStatus.TO_PAY]: 'To Pay',
  [EventStatus.NEXT_INCOME]: 'Next Income'
});

export const getEventStatusLabel = (status) => EventStatusLabel[status] || status;

export const POSITIVE_EVENT_STATUSES = new Set([
  EventStatus.RECEIVED,
  EventStatus.PAID,
  EventStatus.INVESTED,
  EventStatus.COMPLETED,
  EventStatus.AMORTIZED,
  EventStatus.SETTLED,
  EventStatus.ABATED,
  EventStatus.CLOSED
]);

export const isPositiveStatus = (status) => {
  if (!status) return false;
  return POSITIVE_EVENT_STATUSES.has(String(status).toLowerCase());
};
export const isCancelledStatus = (status) => {
  if (!status) return false;
  return String(status).toLowerCase() === EventStatus.CANCELLED;
};
export const isNegativeStatus = (status) => !status || (!isPositiveStatus(status) && !isCancelledStatus(status));


