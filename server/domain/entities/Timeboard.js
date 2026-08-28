import { TimeboardType } from '../enums/index.js';

/**
 * Aggregate Root: Timeboard
 * Represents a workspace dashboard for financial or project tracking.
 */
export class Timeboard {
  constructor({
    id,
    name = 'Timeboard Portugal',
    description = '',
    tenantId = 'tenant-igor',
    tenant = 'tenant-igor',
    userId = null,
    type = TimeboardType.FINANCIAL,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.tenantId = tenantId || tenant || 'tenant-igor';
    this.tenant = this.tenantId;
    this.userId = userId;
    this.type = type;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isFinancial() {
    return this.type === TimeboardType.FINANCIAL;
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error('Timeboard name is required');
    }
    return true;
  }
}
