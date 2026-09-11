export const EventPeriodicity = Object.freeze({
  MONTHLY: 'monthly',
  BIWEEKLY: 'biweekly',
  BIMONTHLY: 'bimonthly',
  SEMIANNUAL: 'biannual',
  ANNUAL: 'annual'
});

/**
 * Normalizes periodicity to canonical EventPeriodicity enum value
 */
export function normalizePeriodicity(periodicity) {
  if (periodicity && Object.values(EventPeriodicity).includes(periodicity)) {
    return periodicity;
  }
  return EventPeriodicity.MONTHLY;
}
