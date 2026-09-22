import { pocketRepository } from '../../infrastructure/database/supabase/SupabasePocketRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { financialEventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { Pocket } from '../../domain/entities/Pocket.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

export class PocketService {
  async getAllPockets(query = {}) {
    const { timeboardId, timelineId } = query;

    if (timelineId) {
      return pocketRepository.getByTimelineId(timelineId);
    } else if (timeboardId) {
      return pocketRepository.getByTimeboardId(timeboardId);
    }
    return pocketRepository.getAll();
  }

  async getPocketById(id) {
    return pocketRepository.getById(id);
  }

  async createPocket(data) {
    Pocket.validate(data);

    let timeboardId = data.timeboardId || data.timeboard_id;
    const timelineId = data.timelineId || data.timeline_id;

    if (!timeboardId && timelineId) {
      try {
        const tl = await timelineRepository.getById(timelineId);
        if (tl) timeboardId = tl.timeboardId || tl.timeboard_id;
      } catch (e) {
        console.warn('Could not resolve timeboardId from timeline in createPocket:', e.message);
      }
    }

    const payload = {
      name: String(data.name).trim(),
      initialValue: Number(data.initialValue !== undefined ? data.initialValue : (data.initial_value !== undefined ? data.initial_value : 0)),
      targetValue: Number(data.targetValue !== undefined ? data.targetValue : (data.target_value !== undefined ? data.target_value : 0)),
      timelineId,
      timeboardId,
      dateCreated: data.dateCreated || data.date_created || new Date().toISOString(),
      dateClosed: data.dateClosed !== undefined ? data.dateClosed : (data.date_closed !== undefined ? data.date_closed : null)
    };

    return pocketRepository.create(payload);
  }

  async updatePocket(id, updates) {
    const existing = await pocketRepository.getById(id);
    if (!existing) {
      throw new Error(t('backend.validation.pocketNotFound'));
    }

    const payload = { ...updates };
    if (payload.name !== undefined) {
      payload.name = String(payload.name).trim();
      if (!payload.name) {
        throw new Error(t('backend.validation.pocketNameRequired'));
      }
    }
    if (payload.initialValue !== undefined) payload.initialValue = Number(payload.initialValue) || 0;
    if (payload.initial_value !== undefined) payload.initial_value = Number(payload.initial_value) || 0;
    if (payload.targetValue !== undefined) payload.targetValue = Number(payload.targetValue) || 0;
    if (payload.target_value !== undefined) payload.target_value = Number(payload.target_value) || 0;
    if (payload.dateClosed !== undefined) payload.dateClosed = payload.dateClosed;
    else if (payload.date_closed !== undefined) payload.date_closed = payload.date_closed;

    return pocketRepository.update(id, payload);
  }

  async deletePocket(id) {
    if (!id) return false;
    await financialEventRepository.deleteByPocketId(id);
    return pocketRepository.delete(id);
  }
}

export const pocketService = new PocketService();
