import { TimelineType, EventAggregation, EventStatus, LoanEventCategory } from '../../../shared/enums/index.js';

/**
 * Aggregate Root: LoanContract
 * Represents a credit contract / loan with debt balance tracking and amortization methods.
 */
export class LoanContract {
  constructor({
    id,
    tenantId = '9e3c3070-d4db-43be-ab03-3f852a9a81da',
    timelineId = null,
    contractNumber = '',
    name,
    automatic = false,
    type = TimelineType.LOAN,
    category = LoanEventCategory.NONE,
    color = '#6366f1',
    description = '',
    totalDebt = 0,
    remainingDebt = 0,
    amortizedCapital = 0,
    installmentAmount = 0,
    financialPortion = 0,
    servicesPortion = 0,
    tan = 0,
    totalInstallments = 0,
    currentInstallmentNumber = 1,
    remainingMonths = 0,
    dueDay = 1,
    startDate,
    endDate,
    status = EventStatus.LOAN,
    periodicity = EventAggregation.MONTHLY,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.tenantId = tenantId || '9e3c3070-d4db-43be-ab03-3f852a9a81da';
    this.timelineId = timelineId;
    this.contractNumber = contractNumber;
    this.name = name;
    this.type = type;
    this.category = category;
    this.automatic = automatic;
    this.color = color;
    this.description = description;
    this.totalDebt = Number(totalDebt) || 0;
    this.remainingDebt = Number(remainingDebt) || 0;
    this.amortizedCapital = Number(amortizedCapital) || 0;
    this.installmentAmount = Number(installmentAmount) || 0;
    this.financialPortion = Number(financialPortion) || 0;
    this.servicesPortion = Number(servicesPortion) || 0;
    this.tan = Number(tan) || 0;
    this.totalInstallments = Number(totalInstallments) || 0;
    this.currentInstallmentNumber = Number(currentInstallmentNumber) || 1;
    this.remainingMonths = Number(remainingMonths) || 0;
    this.dueDay = Number(dueDay) || 1;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = status;
    this.periodicity = periodicity;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  applyAmortization(amortAmount) {
    const amount = Number(amortAmount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('Invalid amortization amount');
    }
    const newRemainingDebt = Math.max(0, Math.round((this.remainingDebt - amount) * 100) / 100);
    const newAmortizedCapital = Math.round(((this.amortizedCapital || 0) + amount) * 100) / 100;

    return {
      remainingDebt: newRemainingDebt,
      amortizedCapital: newAmortizedCapital
    };
  }

  rollbackAmortization(amortAmount) {
    const amount = Number(amortAmount);
    const restoredRemaining = Math.round(((this.remainingDebt || this.totalDebt) + amount) * 100) / 100;
    const restoredAmortized = Math.max(0, Math.round(((this.amortizedCapital || 0) - amount) * 100) / 100);

    return {
      remainingDebt: restoredRemaining,
      amortizedCapital: restoredAmortized
    };
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('LoanContract name is required');
    }
    if (data.installmentAmount === undefined || isNaN(Number(data.installmentAmount))) {
      throw new Error('Valid installmentAmount is required');
    }
    return true;
  }
}
