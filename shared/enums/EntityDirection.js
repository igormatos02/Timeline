import { BalanceViewMode } from './BalanceViewMode.js';

// Side of an entity in the individual view, from the entity's point of view: what it owes the timeboard
// (income side: fees, dues) or what it has to receive from it (outflow side: suppliers, refunds)
export const EntityDirection = Object.freeze({
  OWES: 'owes',
  RECEIVES: 'receives'
});

/** Balance mode holding the movements of that side (used to classify and filter them). */
export function entityDirectionToBalanceMode(direction) {
  return direction === EntityDirection.RECEIVES ? BalanceViewMode.OUTFLOW : BalanceViewMode.INCOME;
}
