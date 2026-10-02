import { EventType } from './EventType.js';

// Movements of the current account (bank account timeline). Pockets only take contributions / withdrawals
// from it (PocketTransferKind); everything else happens here. Each operation is stored as an existing type.
export const AccountOperation = Object.freeze({
  RECEIVE: 'receive', // money from outside comes in (fees, salary): external deposit
  DEPOSIT: 'deposit', // money from the cash wallet comes in: internal deposit
  PAY: 'pay', // an expense paid by the account
  WITHDRAW: 'withdraw' // money goes to the cash wallet: withdrawal
});

/** Event type an operation is stored as. */
export function accountOperationEventType(operation) {
  if (operation === AccountOperation.PAY) return EventType.POCKET_EXPENSE;
  if (operation === AccountOperation.WITHDRAW) return EventType.WITHDRAWAL;
  return EventType.INVESTMENT;
}

/** Operation of a stored movement of the current account (new movements start as "receive"). */
export function accountOperationOf(event) {
  if (!event?.eventType) return AccountOperation.RECEIVE;
  if (event.eventType === EventType.WITHDRAWAL) return AccountOperation.WITHDRAW;
  if (event.eventType === EventType.POCKET_EXPENSE || event.eventType === EventType.POCKET_COST) return AccountOperation.PAY;
  const isExternal = event.isExternal ?? event.is_external;
  return isExternal === false ? AccountOperation.DEPOSIT : AccountOperation.RECEIVE;
}

export const isAccountOutflowOperation = (operation) => operation === AccountOperation.PAY || operation === AccountOperation.WITHDRAW;
