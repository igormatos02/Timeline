import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Entity / Value Object: EventBreakdown
 * Sub-item breakdown for financial event expense categorization.
 */
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
    if (!data.name || typeof data.name !== 'string' || data.name.trim() === '') {
      throw new Error(t('backend.validation.breakdownNameRequired'));
    }
    if (data.amount === undefined || isNaN(Number(data.amount))) {
      throw new Error(t('backend.validation.breakdownAmountRequired'));
    }
    return true;
  }
}
