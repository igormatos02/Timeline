export class Timeboard {
  constructor({
    id,
    name = 'Timeboard Principal',
    description = '',
    tenant = 'default',
    type = null,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.tenant = tenant;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string') {
      throw new Error('Timeboard name is required');
    }
    return true;
  }
}
