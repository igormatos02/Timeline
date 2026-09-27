import { EventType, isAccountOutflowEvent } from './EventType.js';

// Kinds of movement of an account (savings timeline), used by the account movement filter
export const AccountMovementType = Object.freeze({
  INFLOW: 'inflow',
  WITHDRAWAL: EventType.WITHDRAWAL,
  COST: EventType.POCKET_COST,
  EXPENSE: EventType.POCKET_EXPENSE
});

// Movement kind of an account event: cost / expense by type, withdrawal when it takes money out, otherwise inflow
export function getAccountMovementType(ev) {
  if (isAccountOutflowEvent(ev)) return ev.eventType;
  const isWithdrawal = ev?.eventType === EventType.WITHDRAWAL || Boolean(ev?.isWithdrawal) || Number(ev?.amount || 0) < 0;
  return isWithdrawal ? AccountMovementType.WITHDRAWAL : AccountMovementType.INFLOW;
}
