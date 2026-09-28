import { MovementKind } from '../enums/index.js';
import { classifyMovement, isActiveMovement } from './movements.js';
import { computeFinancialPosition } from './financialPosition.js';
import { computeSpaceBalances, GENERAL_SPACE_KEY } from './savingsSpaces.js';

const round = (value) => Math.round((Number(value) || 0) * 100) / 100;

/**
 * "Where is my money": the answers to the 12 questions of the summary panel, from the shared engine only
 * (effective movements up to `asOfMonth`; references and cancelled movements never count):
 * available, savings (total and per space), received, expected to receive, spent (from the available money and
 * via savings), transferred, withdrawn, put into savings (internal / external), paid on loans, amortized, owed.
 *
 * - initialAvailable: starting balance of the available money (initial value of the income timeline)
 * - fromMonth: calculation start ('yyyy-MM' or null); horizonMonth: limit of "expected to receive"
 * - loans: [{ remainingDebt, amortizedCapital }] from the loan metrics (owed and amortized capital)
 * Wealth = available + savings - owed (transfers never change it).
 */
export function computeMoneySummary({
  events = [],
  timelineTypeMap = new Map(),
  pockets = [],
  fromMonth = null,
  asOfMonth,
  horizonMonth,
  initialAvailable = 0,
  loans = []
}) {
  const { realized } = computeFinancialPosition({ events, timelineTypeMap, fromMonth, asOfMonth, horizonMonth });
  const hasLowerBound = Boolean(fromMonth) && fromMonth !== '1900-01';

  // Income still expected: active, not effective, up to the horizon
  let expectedToReceive = 0;
  (events || []).forEach((ev) => {
    if (!ev || !ev.date || !isActiveMovement(ev)) return;
    const month = ev.date.substring(0, 7);
    if ((hasLowerBound && month < fromMonth) || month > horizonMonth) return;
    const movement = classifyMovement(ev, timelineTypeMap);
    if (movement.isReference || movement.isEffective || movement.kind !== MovementKind.INCOME) return;
    expectedToReceive += movement.amount;
  });

  const spaceBalances = computeSpaceBalances({ events, pockets, timelineTypeMap, side: 'realized', upToMonth: asOfMonth });
  const spaces = [
    { id: GENERAL_SPACE_KEY, isGeneral: true, balance: round(spaceBalances.get(GENERAL_SPACE_KEY)) },
    ...(pockets || []).map((pocket) => ({ id: pocket.id, name: pocket.name, balance: round(spaceBalances.get(String(pocket.id))) }))
  ];
  const savingsTotal = round(spaces.reduce((sum, space) => sum + space.balance, 0));
  const available = round(initialAvailable + realized.availableNet);
  const owed = round((loans || []).reduce((sum, loan) => sum + Number(loan.remainingDebt || 0), 0));
  const amortized = round((loans || []).reduce((sum, loan) => sum + Number(loan.amortizedCapital || 0), 0));

  return {
    available,
    savingsTotal,
    spaces,
    received: round(realized.income),
    expectedToReceive: round(expectedToReceive),
    spentFromAvailable: round(realized.expensesFromAvailable),
    spentViaSavings: round(realized.savingsExpenses),
    transferred: round(realized.transfers),
    withdrawn: round(realized.allWithdrawals),
    putIntoSavingsInternal: round(realized.depositsInternal),
    putIntoSavingsExternal: round(realized.depositsExternal),
    loanPaid: round(realized.loanPaid),
    amortized,
    owed,
    wealth: round(available + savingsTotal - owed)
  };
}
