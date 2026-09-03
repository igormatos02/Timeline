export class IncomeHeaderResultDTO {
  constructor({
    current_month_income = 0,
    current_month_expense = 0,
    monthly_budget = 3000,
    income_commitment_percent = 100,
    projected_amount_30 = 0,
    projected_count_30 = 0,
    received_amount_month = 0,
    received_count_month = 0,
    diff_previous_month_percent = 0,
    is_diff_positive = true,
    annual_projected_income = 0,
    categories_breakdown = [],
    monthly_volume_history = []
  } = {}) {
    this.current_month_income = Number(current_month_income) || 0;
    this.current_month_expense = Number(current_month_expense) || 0;
    this.monthly_budget = Number(monthly_budget) || 3000;
    this.income_commitment_percent = Number(income_commitment_percent) || 100;
    this.projected_amount_30 = Number(projected_amount_30) || 0;
    this.projected_count_30 = Number(projected_count_30) || 0;
    this.received_amount_month = Number(received_amount_month) || 0;
    this.received_count_month = Number(received_count_month) || 0;
    this.diff_previous_month_percent = Number(diff_previous_month_percent) || 0;
    this.is_diff_positive = Boolean(is_diff_positive);
    this.annual_projected_income = Number(annual_projected_income) || 0;
    this.categories_breakdown = Array.isArray(categories_breakdown) ? categories_breakdown : [];
    this.monthly_volume_history = Array.isArray(monthly_volume_history) ? monthly_volume_history : [];
  }

  static fromProcedureOutput(data = {}) {
    if (!data) return new IncomeHeaderResultDTO();
    return new IncomeHeaderResultDTO({
      current_month_income: data.current_month_income,
      current_month_expense: data.current_month_expense,
      monthly_budget: data.monthly_budget,
      income_commitment_percent: data.income_commitment_percent,
      projected_amount_30: data.projected_amount_30,
      projected_count_30: data.projected_count_30,
      received_amount_month: data.received_amount_month,
      received_count_month: data.received_count_month,
      diff_previous_month_percent: data.diff_previous_month_percent,
      is_diff_positive: data.is_diff_positive,
      annual_projected_income: data.annual_projected_income,
      categories_breakdown: data.categories_breakdown,
      monthly_volume_history: data.monthly_volume_history
    });
  }
}
