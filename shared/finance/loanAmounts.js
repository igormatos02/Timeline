/**
 * Amounts of a loan installment (total, capital, interest, fee) — shared by the loan engine
 * (src/utils/loanCalculations.js) and the financial engine (shared/finance).
 */

/**
 * Returns the total installment amount (capital + interest + fee).
 */
export function getInstallmentAmount(ev) {
  if (!ev) return 0;
  return Math.max(0, Number(ev.installmentAmount ?? ev.installment_amount ?? ev.amount ?? 0));
}

/**
 * Returns the stamp tax / fee portion of an installment.
 */
export function getInstallmentFee(ev) {
  if (!ev) return 0;
  const fee = ev.installmentFee ?? ev.installment_fee ?? ev.taxAmount ?? ev.tax_amount;
  if (fee != null && !isNaN(Number(fee))) {
    return Math.max(0, Number(fee));
  }
  return 0;
}

/**
 * Returns the contractual interest portion of an installment.
 *
 * Priority:
 *   1. ev.installmentInterest / ev.interestAmount — if stored
 *   2. installmentAmount - installmentCapital - installmentFee — if capital is known
 *   3. 18% of installmentAmount — last resort (complement of 82% capital share)
 */
export function getInstallmentInterest(ev) {
  if (!ev) return 0;
  const interest = ev.installmentInterest ?? ev.interestAmount ?? ev.interestPortion ?? ev.interest_amount;
  if (interest != null && !isNaN(Number(interest))) {
    return Math.max(0, Number(interest));
  }

  const total = getInstallmentAmount(ev);
  if (total <= 0) return 0;

  // Derive from total - capital - fee if capital is stored
  const cap = ev.installmentCapital ?? ev.principalAmount ?? ev.principal_amount;
  if (cap != null && !isNaN(Number(cap))) {
    const fee = getInstallmentFee(ev);
    return Math.max(0, Math.round((total - Number(cap) - fee) * 100) / 100);
  }

  // Last resort: 18% of total (complement of 82% used by getPrincipal)
  const fee = getInstallmentFee(ev);
  return Math.max(0, Math.round((total * 0.18 - fee) * 100) / 100);
}

/**
 * Returns the capital (principal) portion of an installment.
 *
 * Priority:
 *   1. ev.installmentCapital / ev.principalAmount — if stored
 *   2. ev.installmentAmount - ev.installmentInterest - ev.installmentFee — if interest is known
 *   3. 82% of installmentAmount — last resort (French amortization approximation)
 *
 * Returns 0 when passed null, abated, or explicitly zeroed.
 */
export function getPrincipal(ev) {
  if (!ev) return 0;
  const cap = ev.installmentCapital ?? ev.principalAmount ?? ev.principal_amount;

  // Trust a stored number (including 0).
  if (cap != null && !isNaN(Number(cap))) {
    return Math.max(0, Number(cap));
  }

  const total = getInstallmentAmount(ev);
  if (total <= 0) return 0; // abated or zeroed out

  const interest = ev.installmentInterest ?? ev.interestAmount ?? ev.interestPortion ?? ev.interest_amount;
  if (interest != null && !isNaN(Number(interest))) {
    const fee = getInstallmentFee(ev);
    return Math.max(0, Math.round((total - Number(interest) - fee) * 100) / 100);
  }

  // Last resort: 82% of total (typical capital share in French amortization at ~3–4% TAN)
  return Math.round(total * 0.82 * 100) / 100;
}
