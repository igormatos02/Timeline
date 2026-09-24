export const HistoryPeriod = Object.freeze({
  LAST_6_MONTHS: 'last_6_months',
  LAST_YEAR: 'last_year',
  LAST_2_YEARS: 'last_2_years',
  LAST_5_YEARS: 'last_5_years'
});

// Number of months covered by each history period
export const HISTORY_PERIOD_MONTHS = Object.freeze({
  [HistoryPeriod.LAST_6_MONTHS]: 6,
  [HistoryPeriod.LAST_YEAR]: 12,
  [HistoryPeriod.LAST_2_YEARS]: 24,
  [HistoryPeriod.LAST_5_YEARS]: 60
});
