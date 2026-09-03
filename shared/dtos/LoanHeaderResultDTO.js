export class LoanHeaderResultDTO {
  constructor({
    total_debt = 0,
    remaining_debt = 0,
    amortized_capital = 0,
    amortized_percent = 0,
    total_installments = 0,
    paid_installments = 0,
    remaining_installments = 0,
    current_installment_amount = 0,
    next_due_date = null,
    estimated_payoff_date = null,
    future_capital = 0,
    future_interest = 0,
    future_total = 0,
    future_capital_percent = 0,
    future_interest_percent = 0,
    paid_capital = 0,
    paid_interest = 0,
    paid_total = 0,
    original_capital = 0,
    total_estimated_interest = 0,
    total_loan_cost = 0
  } = {}) {
    this.total_debt = Number(total_debt) || 0;
    this.remaining_debt = Number(remaining_debt) || 0;
    this.amortized_capital = Number(amortized_capital) || 0;
    this.amortized_percent = Number(amortized_percent) || 0;
    this.total_installments = Number(total_installments) || 0;
    this.paid_installments = Number(paid_installments) || 0;
    this.remaining_installments = Number(remaining_installments) || 0;
    this.current_installment_amount = Number(current_installment_amount) || 0;
    this.next_due_date = next_due_date || null;
    this.estimated_payoff_date = estimated_payoff_date || null;
    this.future_capital = Number(future_capital) || 0;
    this.future_interest = Number(future_interest) || 0;
    this.future_total = Number(future_total) || 0;
    this.future_capital_percent = Number(future_capital_percent) || 0;
    this.future_interest_percent = Number(future_interest_percent) || 0;
    this.paid_capital = Number(paid_capital) || 0;
    this.paid_interest = Number(paid_interest) || 0;
    this.paid_total = Number(paid_total) || 0;
    this.original_capital = Number(original_capital) || 0;
    this.total_estimated_interest = Number(total_estimated_interest) || 0;
    this.total_loan_cost = Number(total_loan_cost) || 0;
  }

  static fromProcedureOutput(data = {}) {
    if (!data) return new LoanHeaderResultDTO();
    return new LoanHeaderResultDTO({
      total_debt: data.total_debt,
      remaining_debt: data.remaining_debt,
      amortized_capital: data.amortized_capital,
      amortized_percent: data.amortized_percent,
      total_installments: data.total_installments,
      paid_installments: data.paid_installments,
      remaining_installments: data.remaining_installments,
      current_installment_amount: data.current_installment_amount,
      next_due_date: data.next_due_date,
      estimated_payoff_date: data.estimated_payoff_date,
      future_capital: data.future_capital,
      future_interest: data.future_interest,
      future_total: data.future_total,
      future_capital_percent: data.future_capital_percent,
      future_interest_percent: data.future_interest_percent,
      paid_capital: data.paid_capital,
      paid_interest: data.paid_interest,
      paid_total: data.paid_total,
      original_capital: data.original_capital,
      total_estimated_interest: data.total_estimated_interest,
      total_loan_cost: data.total_loan_cost
    });
  }
}
