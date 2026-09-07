/**
 * Domain Entity: LoanContract
 * Represents a credit contract with static terms and parameters.
 */
export class LoanContract {
  constructor({
    id,
    timelineId = null,
    timeboardId = null,

    contractNumber = '',
    contractName = '',
    category = 'auto_loan',
    bankName = '',

    tanRate = 0,
    spread = 0.0,
    rateType = 'fixed',

    startDate = null,
    endDate = null,
    totalInstallments = 0,
    dueDay = 15,

    installmentStampTax = 0,
    processingFee = 0.0,
    insuranceFee = 0.0,

    originalCapital = 0,

    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  } = {}) {
    this.id = id;
    this.timelineId = timelineId;
    this.timeboardId = timeboardId;

    this.contractNumber = contractNumber;
    this.contractName = contractName;
    this.category = category;
    this.bankName = bankName;

    this.tanRate = Number(tanRate) || 0;
    this.spread = Number(spread) || 0.0;
    this.rateType = rateType;

    this.startDate = startDate;
    this.endDate = endDate;

    this.totalInstallments = Number(totalInstallments) || 0;
    this.dueDay = Number(dueDay) || 15;

    this.installmentStampTax = Number(installmentStampTax) || 0;
    this.processingFee = Number(processingFee) || 0.0;
    this.insuranceFee = Number(insuranceFee) || 0.0;

    this.originalCapital = Number(originalCapital) || 0;

    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }
}
