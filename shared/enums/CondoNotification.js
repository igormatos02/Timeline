// Notifications to the owners of a condominium's units (push when they have the app, e-mail otherwise)
export const CondoNotificationKind = Object.freeze({
  RECEIPT: 'receipt', // a fee was received: the receipt
  OVERDUE: 'overdue' // monthly notice of overdue fees
});

// State of an e-mail of the outbox
export const EmailOutboxStatus = Object.freeze({
  PENDING: 'pending',
  SENT: 'sent',
  FAILED: 'failed'
});
