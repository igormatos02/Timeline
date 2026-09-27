import {
  EventStatus,
  IncomeEventCategory,
  ExpenseEventCategory,
  isPositiveStatus,
  isCancelledStatus
} from '../enums/index.js';
import { classifyBalanceEvent } from './balanceMetrics.js';
import { CONDO_EXPENSE_CATEGORY_META } from '../components/event-modals/FinancialEventModalConfig.js';

const CONDO_EXPENSE_CATEGORY_IDS = Object.keys(CONDO_EXPENSE_CATEGORY_META);
const INCOME_CATEGORY_IDS = Object.values(IncomeEventCategory);
const EXPENSE_CATEGORY_IDS = Object.values(ExpenseEventCategory);

// Groups rows by label and returns [{ label, amount, percent }] sorted by amount (desc)
function breakdown(rows) {
  const totals = new Map();
  rows.forEach((row) => totals.set(row.groupLabel, (totals.get(row.groupLabel) || 0) + row.amount));
  const total = [...totals.values()].reduce((sum, amount) => sum + amount, 0);
  return [...totals.entries()]
    .map(([label, amount]) => ({ label, amount, percent: total > 0 ? Math.round((amount / total) * 100) : 0 }))
    .filter((item) => item.amount > 0)
    .sort((a, b) => b.amount - a.amount);
}

const sum = (rows) => rows.reduce((total, row) => total + row.amount, 0);
const byDate = (a, b) => a.date.localeCompare(b.date);

/**
 * Closing report of a period (month, year or everything up to a date), using the balance timeline rules:
 * realized income, savings (by pocket) and expenses (loan payments included), the balance of the period
 * (income - expenses - savings deducted from the balance) and the amounts still pending in the period.
 * `fromDate` may be null (no lower bound); dates are 'yyyy-MM-dd'.
 */
export function computeClosingReport({ events = [], timelines = [], pockets = [], fromDate = null, toDate, isCondoflow = false, t }) {
  const timelineTypeMap = new Map(timelines.map((tl) => [String(tl.id), tl.type]));
  const pocketNameById = new Map(pockets.map((p) => [String(p.id), p.name]));

  const incomeLabel = (category) => {
    const cat = String(category || '').toLowerCase();
    return t(`incomeCategories.${INCOME_CATEGORY_IDS.includes(cat) ? cat : IncomeEventCategory.OTHER}`);
  };
  const expenseLabel = (category) => {
    const cat = String(category || '').toLowerCase();
    if (isCondoflow) {
      return t(`condoExpenseCategories.${CONDO_EXPENSE_CATEGORY_IDS.includes(cat) ? cat : ExpenseEventCategory.OTHER}`);
    }
    return t(`expenseCategories.${EXPENSE_CATEGORY_IDS.includes(cat) ? cat : ExpenseEventCategory.OTHER}`);
  };
  const pocketLabel = (ev) => {
    const pocketId = ev.pocketId || ev.pocket_id;
    return (pocketId && pocketNameById.get(String(pocketId))) || t('timeboardSettings.reports.closings.noPocket');
  };

  const income = [];
  const savings = [];
  const expenses = [];
  const receivable = [];
  const payable = [];
  let savingsDeducted = 0;

  events.forEach((ev) => {
    if (!ev || !ev.date || ev.isDeleted || ev.isVirtual || ev.isSharedNotice) return;
    if (ev.status === EventStatus.DELETED || isCancelledStatus(ev.status)) return;
    if (!timelineTypeMap.has(String(ev.timelineId || ev.timeline_id || ''))) return;
    if ((fromDate && ev.date < fromDate) || ev.date > toDate) return;

    const { isLoan, isIncome, isInvestment, isWithdrawal, isExpense, absAmt } = classifyBalanceEvent(ev, timelineTypeMap);
    if (absAmt <= 0) return;

    const isRealized = isPositiveStatus(ev.status) || Boolean(ev.isCompleted) || ev.status === EventStatus.WITHDRAWN;
    const name = ev.title || ev.name || '';

    if (!isRealized) {
      if (isIncome) receivable.push({ date: ev.date, name, groupLabel: incomeLabel(ev.category), amount: absAmt });
      else if (isExpense) payable.push({ date: ev.date, name, groupLabel: expenseLabel(ev.category), amount: absAmt });
      else if (isLoan) payable.push({ date: ev.date, name, groupLabel: t('timeboardSettings.reports.closings.loanCategory'), amount: absAmt });
      return;
    }

    if (isLoan) {
      expenses.push({ date: ev.date, name, groupLabel: t('timeboardSettings.reports.closings.loanCategory'), amount: absAmt });
    } else if (isIncome) {
      income.push({ date: ev.date, name, groupLabel: incomeLabel(ev.category), amount: absAmt });
    } else if (isInvestment) {
      // Withdrawals are shown as negative savings
      const amount = isWithdrawal ? -absAmt : absAmt;
      savings.push({ date: ev.date, name, groupLabel: pocketLabel(ev), amount, isExternal: Boolean(ev.isExternal || ev.is_external) });
      if (!ev.isExternal && !ev.is_external) savingsDeducted += amount;
    } else if (isExpense) {
      expenses.push({ date: ev.date, name, groupLabel: expenseLabel(ev.category), amount: absAmt });
    }
  });

  const incomeTotal = sum(income);
  const expensesTotal = sum(expenses);
  const savingsTotal = sum(savings);

  return {
    income: { rows: income.sort(byDate), total: incomeTotal, breakdown: breakdown(income) },
    savings: {
      rows: savings.sort(byDate),
      total: savingsTotal,
      deducted: savingsDeducted,
      hasExternal: savings.some((row) => row.isExternal),
      breakdown: breakdown(savings.filter((row) => row.amount > 0))
    },
    expenses: { rows: expenses.sort(byDate), total: expensesTotal, breakdown: breakdown(expenses) },
    balance: incomeTotal - expensesTotal - savingsDeducted,
    pending: {
      receivable: { rows: receivable.sort(byDate), total: sum(receivable) },
      payable: { rows: payable.sort(byDate), total: sum(payable) }
    }
  };
}
