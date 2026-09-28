import { MovementKind } from './MovementKind.js';

// Kinds of outflow shown in the Outflows (expense) timeline, used by its "outflow type" filter:
// its own expenses (paid by the available money), expenses paid by the savings and loan installments
export const OutflowType = Object.freeze({
  REGULAR: 'regular',
  SAVINGS: 'savings',
  INSTALLMENT: 'installment'
});

// Outflow type of a movement kind (references carry the kind of the movement they mirror)
export function getOutflowType(kind) {
  if (kind === MovementKind.SAVINGS_EXPENSE) return OutflowType.SAVINGS;
  if (kind === MovementKind.LOAN_INSTALLMENT || kind === MovementKind.AMORTIZATION) return OutflowType.INSTALLMENT;
  return OutflowType.REGULAR;
}
