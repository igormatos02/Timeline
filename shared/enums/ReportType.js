// Reports available in the timeboard settings (Reports tab)
export const ReportType = Object.freeze({
  DEBTORS: 'debtors',
  CLOSINGS: 'closings',
  RECEIPTS: 'receipts' // register of the receipts issued in a period (printed for the condominium's book)
});

// Parts of a printed receipt: the receipt (the payer's copy) and the stub (canhoto, kept by the administration)
export const ReceiptPart = Object.freeze({
  BOTH: 'both',
  RECEIPT: 'receipt',
  STUB: 'stub'
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
