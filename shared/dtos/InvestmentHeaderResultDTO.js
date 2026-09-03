export class InvestmentHeaderResultDTO {
  constructor({
    current_month_invested = 0,
    current_month_income = 0,
    monthly_target = 500,
    savings_rate_percent = 0,
    committed_amount_30 = 0,
    committed_count_30 = 0,
    paid_amount_month = 0,
    paid_count_month = 0,
    diff_previous_month_percent = 0,
    is_diff_positive = true,
    annual_projected_invested = 0,
    categories_breakdown = [],
    monthly_volume_history = []
  } = {}) {
    this.current_month_invested = Number(current_month_invested) || 0;
    this.current_month_income = Number(current_month_income) || 0;
    this.monthly_target = Number(monthly_target) || 500;
    this.savings_rate_percent = Number(savings_rate_percent) || 0;
    this.committed_amount_30 = Number(committed_amount_30) || 0;
    this.committed_count_30 = Number(committed_count_30) || 0;
    this.paid_amount_month = Number(paid_amount_month) || 0;
    this.paid_count_month = Number(paid_count_month) || 0;
    this.diff_previous_month_percent = Number(diff_previous_month_percent) || 0;
    this.is_diff_positive = Boolean(is_diff_positive);
    this.annual_projected_invested = Number(annual_projected_invested) || 0;
    this.categories_breakdown = Array.isArray(categories_breakdown) ? categories_breakdown : [];
    this.monthly_volume_history = Array.isArray(monthly_volume_history) ? monthly_volume_history : [];
  }

  static fromProcedureOutput(data = {}) {
    if (!data) return new InvestmentHeaderResultDTO();
    return new InvestmentHeaderResultDTO({
      current_month_invested: data.current_month_invested,
      current_month_income: data.current_month_income,
      monthly_target: data.monthly_target,
      savings_rate_percent: data.savings_rate_percent,
      committed_amount_30: data.committed_amount_30,
      committed_count_30: data.committed_count_30,
      paid_amount_month: data.paid_amount_month,
      paid_count_month: data.paid_count_month,
      diff_previous_month_percent: data.diff_previous_month_percent,
      is_diff_positive: data.is_diff_positive,
      annual_projected_invested: data.annual_projected_invested,
      categories_breakdown: data.categories_breakdown,
      monthly_volume_history: data.monthly_volume_history
    });
  }
}
