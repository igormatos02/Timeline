import { EventType, isAccountOutflowEvent, isPocketTransferEvent } from './EventType.js';

// Kinds of movement of an account (savings timeline), used by the account movement filter
export const AccountMovementType = Object.freeze({
  INFLOW: 'inflow',
  WITHDRAWAL: EventType.WITHDRAWAL,
  EXPENSE: EventType.POCKET_EXPENSE,
  TRANSFER: EventType.POCKET_TRANSFER
});

// Movement kind of an account event: expense (legacy costs included), transfer, withdrawal when it takes
// money out, otherwise inflow
export function getAccountMovementType(ev) {
  if (isAccountOutflowEvent(ev)) return AccountMovementType.EXPENSE;
  if (isPocketTransferEvent(ev)) return AccountMovementType.TRANSFER;
  const isWithdrawal = ev?.eventType === EventType.WITHDRAWAL || Boolean(ev?.isWithdrawal) || Number(ev?.amount || 0) < 0;
  return isWithdrawal ? AccountMovementType.WITHDRAWAL : AccountMovementType.INFLOW;
}
