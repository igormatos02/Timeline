// Reports available in the timeboard settings (Reports tab)
export const ReportType = Object.freeze({
  DEBTORS: 'debtors',
  CLOSINGS: 'closings'
});

// How the rows of a report are grouped
export const ReportGroupBy = Object.freeze({
  TIMELINE: 'timeline',
  DEBTOR: 'debtor',
  DATE: 'date'
});

// Period of a closing report: a month, a year or everything up to a date
export const ClosingPeriod = Object.freeze({
  MONTH: 'month',
  YEAR: 'year',
  GENERAL: 'general'
});
