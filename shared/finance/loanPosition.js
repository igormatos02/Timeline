import { EventStatus, isCancelledStatus } from '../enums/index.js';
import { classifyMovement, isEffectiveMovement } from './movements.js';
import { getInstallmentAmount, getPrincipal } from './loanAmounts.js';

/**
 * Loan movements split by state (shared by the loan header and the summary panel):
 * - installments: pending (future), overdue (past due, not paid), paid, abated (removed by an amortization that
 *   reduced the term; their capital is already counted in the amortization), cancelled
 * - amortizations (extraordinary): pending, realized, cancelled
 * Each group has { count, amount }. The capital amortized comes from the paid installments (their capital share,
 * Price / SAC) plus the realized amortizations (their full value); pending and cancelled ones never count.
 */
const emptyGroup = () => ({ count: 0, amount: 0 });
const addTo = (group, amount) => { group.count += 1; group.amount += amount; };
const round = (value) => Math.round(value * 100) / 100;

export function computeLoanStatusBreakdown({ events = [], today }) {
  const installments = { pending: emptyGroup(), overdue: emptyGroup(), paid: emptyGroup(), abated: emptyGroup(), cancelled: emptyGroup() };
  const amortizations = { pending: emptyGroup(), realized: emptyGroup(), cancelled: emptyGroup() };
  let capitalFromInstallments = 0;
  let capitalFromAmortizations = 0;

  (events || []).forEach((ev) => {
    if (!ev || ev.isDeleted || ev.status === EventStatus.DELETED) return;
    const movement = classifyMovement(ev);
    if (movement.isReference) return;
    const isCancelled = isCancelledStatus(ev.status);
    const isEffective = !isCancelled && isEffectiveMovement(ev);

    if (movement.isAmortization) {
      const value = Math.abs(Number(ev.amortizationAmount ?? ev.installmentAmount ?? ev.amount ?? 0));
      if (isCancelled) addTo(amortizations.cancelled, value);
      else if (isEffective) {
        addTo(amortizations.realized, value);
        capitalFromAmortizations += value;
      } else addTo(amortizations.pending, value);
      return;
    }

    if (!movement.isLoanInst) return;
    const value = getInstallmentAmount(ev);
    const isAbated = ev.status === EventStatus.ABATED || ev.status === EventStatus.AMORTIZED || Boolean(ev.isAbated);
    if (isCancelled) addTo(installments.cancelled, value);
    else if (isAbated) addTo(installments.abated, value);
    else if (isEffective) {
      addTo(installments.paid, value);
      capitalFromInstallments += getPrincipal(ev);
    } else if (ev.status === EventStatus.OVERDUE || (today && ev.date && ev.date < today)) addTo(installments.overdue, value);
    else addTo(installments.pending, value);
  });

  const roundGroups = (groups) => Object.fromEntries(
    Object.entries(groups).map(([key, group]) => [key, { count: group.count, amount: round(group.amount) }])
  );

  return {
    installments: roundGroups(installments),
    amortizations: roundGroups(amortizations),
    capitalFromInstallments: round(capitalFromInstallments),
    capitalFromAmortizations: round(capitalFromAmortizations)
  };
}
