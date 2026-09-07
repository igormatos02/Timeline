export class BalanceHeaderResultDTO {
  constructor({
    net_realized = 0,
    total_received = 0,
    total_paid_expenses = 0,
    total_invested = 0,
    total_remaining_debt = 0,
    investments_breakdown = [],
    investments_total_accumulated = 0,
    loans_breakdown = [],
    total_amortized = 0,
    total_loan_debt = 0,
    projected_list = []
  } = {}) {
    this.net_realized = Number(net_realized) || 0;
    this.total_received = Number(total_received) || 0;
    this.total_paid_expenses = Number(total_paid_expenses) || 0;
    this.total_invested = Number(total_invested) || 0;
    this.total_remaining_debt = Number(total_remaining_debt) || 0;

    this.investments_breakdown = Array.isArray(investments_breakdown) ? investments_breakdown : [];
    this.investments_total_accumulated = Number(investments_total_accumulated) || 0;

    this.loans_breakdown = Array.isArray(loans_breakdown) ? loans_breakdown : [];
    this.total_amortized = Number(total_amortized) || 0;
    this.total_loan_debt = Number(total_loan_debt) || 0;

    this.projected_list = Array.isArray(projected_list) ? projected_list : [];
  }

  static fromProcedureOutput(data = {}, projectedData = []) {
    if (!data) return new BalanceHeaderResultDTO();
    return new BalanceHeaderResultDTO({
      net_realized: data.net_realized,
      total_received: data.total_received,
      total_paid_expenses: data.total_paid_expenses,
      total_invested: data.total_invested,
      total_remaining_debt: data.total_remaining_debt,

      investments_breakdown: data.investments_breakdown,
      investments_total_accumulated: data.investments_total_accumulated,

      loans_breakdown: data.loans_breakdown,
      total_amortized: data.total_amortized,
      total_loan_debt: data.total_loan_debt,

      projected_list: Array.isArray(projectedData) ? projectedData.map((item) => ({
        monthKey: item.month_key,
        monthLabel: item.month_label,
        monthsOffset: Number(item.months_offset || 0),
        netProjected: Number(item.net_projected || 0),
        forecastIncome: Number(item.forecast_income || 0),
        plannedExpenses: Number(item.planned_expenses || 0),
        plannedInvestments: Number(item.planned_investments || 0),
        plannedAmortization: Number(item.planned_amortization || 0)
      })) : []
    });
  }
}
