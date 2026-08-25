export class LoanContract {
  constructor({
    id,
    tenantId = 'tenant-igor',
    timelineId = 'tl-income',
    contractNumber = '',
    name,
    type = 'Empréstimo',
    category = 'automovel', // 'automovel' | 'hipotecario' | 'pessoal'
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
    status = 'Em Progresso',
    periodicity = 'mensal',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.tenantId = tenantId || 'tenant-igor';
    this.timelineId = timelineId;
    this.contractNumber = contractNumber;
    this.name = name;
    this.type = type;
    this.category = category;
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

  static validate(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('LoanContract name is required');
    }
    if (!data.installmentAmount || isNaN(Number(data.installmentAmount))) {
      throw new Error('Valid installmentAmount is required');
    }
    return true;
  }
}
