import { SupabaseFinancialEventRepository } from './SupabaseFinancialEventRepository.js';

/**
 * Infrastructure Adapter: SupabaseReminderRepository
 * Reminder events live in table 'reminders', which has the same columns as 'financial_events',
 * so the whole event mapping, recurrence and status logic is reused as is.
 */
export class SupabaseReminderRepository extends SupabaseFinancialEventRepository {
  constructor() {
    super();
    this.tableName = 'reminders';
  }

  // Occurrence statuses come from financial_event_status through the service's full status map;
  // the embedded join only exists for financial_events.
  async getAllWithStatuses(filter = null) {
    const entities = await this.getAll(filter);
    entities.forEach((entity) => {
      if (!Array.isArray(entity.statusesList)) entity.statusesList = [];
    });
    return entities;
  }
}

export const reminderRepository = new SupabaseReminderRepository();
