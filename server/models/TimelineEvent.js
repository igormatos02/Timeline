export class TimelineEvent {
  constructor({
    id,
    seriesId = null,
    sobrepositionOver = null,
    version = 0,
    isTerminated = false,
    dayOfMonth = null,
    timelineOriginId = 'tl-income',
    timelineOriginName = 'Financeiro',
    timelineOriginIcon = '💰',
    date,
    time = '09:00',
    title,
    description = '',
    category = 'saida_recorrente',
    financialType = 'gasto', // 'entrada' | 'gasto' | 'investimento'
    periodicity = 'recorrente', // 'recorrente' | 'unico'
    status = 'Pendente', // 'Pago' | 'Recebido' | 'Investido' | 'Pendente' | 'Atrasada' | 'Planeado'
    priority = 'Normal', // 'Urgente' | 'Alta' | 'Normal' | 'Baixa'
    amount = 0,
    initialInvestedAmount = 0,
    isIncome = false,
    isExpense = false,
    isInvestment = false,
    isRecurring = false,
    isCompleted = false,
    isLocked = false,
    isSystemLoanEvent = false,
    principalAmount = 0,
    interestPortion = 0,
    interestAmount = 0,
    balanceAfter = 0,
    installmentNumber = null,
    totalInstallments = null,
    labels = [],
    breakdownItems = [],
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.seriesId = seriesId;
    this.sobrepositionOver = sobrepositionOver;
    this.version = Number(version) || 0;
    this.isTerminated = Boolean(isTerminated);
    this.dayOfMonth = dayOfMonth;
    this.timelineOriginId = timelineOriginId;
    this.timelineOriginName = timelineOriginName;
    this.timelineOriginIcon = timelineOriginIcon;
    this.date = date;
    this.time = time;
    this.title = title;
    this.description = description;
    this.category = category;
    this.financialType = financialType;
    this.periodicity = periodicity;
    this.status = status;
    this.priority = priority;
    this.amount = Number(amount) || 0;
    this.initialInvestedAmount = Number(initialInvestedAmount) || 0;
    this.isIncome = isIncome;
    this.isExpense = isExpense;
    this.isInvestment = isInvestment;
    this.isRecurring = isRecurring;
    this.isCompleted = isCompleted;
    this.isLocked = isLocked;
    this.isSystemLoanEvent = isSystemLoanEvent;
    this.principalAmount = Number(principalAmount) || 0;
    this.interestPortion = Number(interestPortion) || 0;
    this.interestAmount = Number(interestAmount) || 0;
    this.balanceAfter = Number(balanceAfter) || 0;
    this.installmentNumber = installmentNumber;
    this.totalInstallments = totalInstallments;
    this.labels = Array.isArray(labels) ? labels : [];
    this.breakdownItems = Array.isArray(breakdownItems) ? breakdownItems : [];
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validate(data) {
    if (!data.date || typeof data.date !== 'string') {
      throw new Error('Valid event date (YYYY-MM-DD) is required');
    }
    if (!data.title || typeof data.title !== 'string') {
      throw new Error('Event title is required');
    }
    return true;
  }
}
