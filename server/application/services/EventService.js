import { financialEventService } from './FinancialEventService.js';
import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { TimeboardType } from '../../../shared/enums/index.js';

export class EventService {
  async getServiceForTimeboard(timeboardId) {
    if (!timeboardId) return financialEventService;
    try {
      const tb = await timeboardRepository.getById(timeboardId);
      if (tb && tb.type && tb.type !== TimeboardType.FINANCIAL) {
        // Placeholder for non-financial event services in the future
        return financialEventService;
      }
    } catch (e) {
      console.warn('Error resolving timeboard type, falling back to financialEventService:', e.message);
    }
    return financialEventService;
  }

  async getAllEvents(filter = {}) {
    const service = await this.getServiceForTimeboard(filter.timeboardId);
    return service.getAllEvents(filter);
  }

  async createEvent(eventData) {
    const service = await this.getServiceForTimeboard(eventData.timeboardId);
    return service.createEvent(eventData);
  }

  async updateEvent(id, updates) {
    const service = await this.getServiceForTimeboard(updates.timeboardId);
    return service.updateEvent(id, updates);
  }

  async toggleEventPayment(id) {
    return financialEventService.toggleEventPayment(id);
  }

  async deleteEvent(id, options = {}) {
    return financialEventService.deleteEvent(id, options);
  }
}

export const eventService = new EventService();
