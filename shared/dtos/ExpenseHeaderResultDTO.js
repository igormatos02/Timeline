export class ExpenseHeaderResultDTO {
  constructor({
    current_month_expense = 0,
    current_month_income = 0,
    monthly_budget = 1500,
    income_commitment_percent = 0,
    committed_amount_30 = 0,
    committed_count_30 = 0,
    paid_amount_month = 0,
    paid_count_month = 0,
    paid_percent_month = 0,
    diff_previous_month_percent = 0,
    is_diff_negative = false,
    annual_projected_expense = 0,
    categories_breakdown = [],
    monthly_volume_history = []
  } = {}) {
    this.current_month_expense = Number(current_month_expense) || 0;
    this.current_month_income = Number(current_month_income) || 0;
    this.monthly_budget = Number(monthly_budget) || 1500;
    this.income_commitment_percent = Number(income_commitment_percent) || 0;
    this.committed_amount_30 = Number(committed_amount_30) || 0;
    this.committed_count_30 = Number(committed_count_30) || 0;
    this.paid_amount_month = Number(paid_amount_month) || 0;
    this.paid_count_month = Number(paid_count_month) || 0;
    this.paid_percent_month = Number(paid_percent_month) || 0;
    this.diff_previous_month_percent = Number(diff_previous_month_percent) || 0;
    this.is_diff_negative = Boolean(is_diff_negative);
    this.annual_projected_expense = Number(annual_projected_expense) || 0;
    this.categories_breakdown = Array.isArray(categories_breakdown) ? categories_breakdown : [];
    this.monthly_volume_history = Array.isArray(monthly_volume_history) ? monthly_volume_history : [];
  }

  static fromProcedureOutput(data = {}) {
    if (!data) return new ExpenseHeaderResultDTO();
    return new ExpenseHeaderResultDTO({
      current_month_expense: data.current_month_expense,
      current_month_income: data.current_month_income,
      monthly_budget: data.monthly_budget,
      income_commitment_percent: data.income_commitment_percent,
      committed_amount_30: data.committed_amount_30,
      committed_count_30: data.committed_count_30,
      paid_amount_month: data.paid_amount_month,
      paid_count_month: data.paid_count_month,
      paid_percent_month: data.paid_percent_month,
      diff_previous_month_percent: data.diff_previous_month_percent,
      is_diff_negative: data.is_diff_negative,
      annual_projected_expense: data.annual_projected_expense,
      categories_breakdown: data.categories_breakdown,
      monthly_volume_history: data.monthly_volume_history
    });
  }
}
