import { TimeboardType } from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Aggregate Root: Timeboard
 * Represents a workspace dashboard for financial or project tracking.
 */
export class Timeboard {
  constructor({
    id,
    name = '',
    description = '',
    tenantId = null,
    userId = null,
    ownerId = null,
    type = TimeboardType.FINANCIAL,
    tenant = null,
    currency = 'EUR',
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString()
  }) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.tenantId = tenantId;
    this.userId = userId || ownerId;
    this.ownerId = ownerId || userId;
    this.type = type;
    this.tenant = tenant;
    this.currency = currency;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  isFinancial() {
    return this.type === TimeboardType.FINANCIAL;
  }

  static validate(data) {
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error(t('backend.validation.timeboardNameRequired'));
    }
    return true;
  }
}
