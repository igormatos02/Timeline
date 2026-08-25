export class Timeboard {
  constructor({
    id,
    name = 'Timeboard Principal',
    description = '',
    tenantId = 'tenant-igor',
    tenant = 'tenant-igor',
    type = 'financeiro', // 'financeiro' | 'projetos' | 'pessoal'
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.tenantId = tenantId || tenant || 'tenant-igor';
    this.tenant = this.tenantId;
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
