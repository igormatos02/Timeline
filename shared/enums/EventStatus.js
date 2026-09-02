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
});

export const getEventStatusLabel = (status) => EventStatusLabel[status] || status;
