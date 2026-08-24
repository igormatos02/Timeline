export class EventBreakdown {
  constructor({
    id,
    eventId,
    name,
    amount = 0,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.eventId = eventId;
    this.name = name;
    this.amount = Number(amount) || 0;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Breakdown name is required');
    }
    if (data.amount === undefined || isNaN(Number(data.amount))) {
      throw new Error('Valid breakdown amount is required');
    }
    return true;
  }
}
