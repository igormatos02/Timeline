import { TimelineType } from '../enums/index.js';

/**
 * Aggregate Root: Timeline
 * Represents a timeline track for income, expenses, investments, or contractual loans.
 */
export class Timeline {
  constructor({
    id,
    tenantId = 'tenant-igor',
    timeboardId = 'tb-principal',
    name,
    type = TimelineType.EXPENSE,
    color = '#10b981',
    description = '',
    isSystemDefault = false,
    canDelete = true,
    startDate = '2026-01-01',
    endDate = '2027-04-30',
    status = 'Em Progresso',
    periodicity = 'mensal',
    monthlySalary = 0,
    contractNumber = '',
    totalDebt = 0,
    remainingDebt = 0,
    amortizedCapital = 0,
    installmentAmount = 0,
    tan = 0,
    totalInstallments = 0,
    currentInstallmentNumber = 1,
    remainingMonths = 0,
    dueDay = 1,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.tenantId = tenantId || 'tenant-igor';
    this.timeboardId = timeboardId;
    this.name = name;
    this.type = type;
    this.color = color;
    this.description = description;
    this.isSystemDefault = Boolean(isSystemDefault);
    this.canDelete = isSystemDefault ? false : Boolean(canDelete);
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = status;
    this.periodicity = periodicity;
    this.monthlySalary = Number(monthlySalary) || 0;
    this.contractNumber = contractNumber;
    this.totalDebt = Number(totalDebt) || 0;
    this.remainingDebt = Number(remainingDebt) || 0;
    this.amortizedCapital = Number(amortizedCapital) || 0;
    this.installmentAmount = Number(installmentAmount) || 0;
    this.tan = Number(tan) || 0;
    this.totalInstallments = Number(totalInstallments) || 0;
    this.currentInstallmentNumber = Number(currentInstallmentNumber) || 1;
    this.remainingMonths = Number(remainingMonths) || 0;
    this.dueDay = Number(dueDay) || 1;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isLoan() {
    return this.type === TimelineType.LOAN;
  }

  isUniquePerTimeboard() {
    return this.type === TimelineType.INCOME || this.type === TimelineType.EXPENSE;
  }

  canBeDeleted() {
    return !this.isSystemDefault && this.canDelete;
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Timeline name is required');
    }
    const validTypes = Object.values(TimelineType);
    if (data.type && !validTypes.includes(data.type)) {
      throw new Error(`Invalid timeline type: ${data.type}`);
    }
    return true;
  }
}
