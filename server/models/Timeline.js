export class Timeline {
  constructor({
    id,
    timeboardId = 'tb-principal',
    name,
    type = 'Financeiro', // 'Financeiro' | 'Empréstimo' | 'Personalizado'
    color = '#10b981',
    description = '',
    startDate = '2026-01-01',
    endDate = '2027-04-30',
    status = 'Em Progresso',
    periodicity = 'mensal',
    monthlySalary = 3349.60,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.timeboardId = timeboardId;
    this.name = name;
    this.type = type;
    this.color = color;
    this.description = description;
    this.startDate = startDate;
    this.endDate = endDate;
    this.status = status;
    this.periodicity = periodicity;
    this.monthlySalary = Number(monthlySalary) || 0;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Timeline name is required');
    }
    return true;
  }
}
