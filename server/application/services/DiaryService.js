import { diaryRepository } from '../../infrastructure/database/supabase/SupabaseDiaryRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { DiaryMood } from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

/**
 * Application Service: DiaryService
 * Diary entries (one per day per diary timeline) stored in table 'diaries'.
 */
export class DiaryService {
  async getAllDiaries(query = {}) {
    const { timeboardId, timelineId } = query;
    if (timelineId) return diaryRepository.getByTimelineId(timelineId);
    if (timeboardId) return diaryRepository.getByTimeboardId(timeboardId);
    return diaryRepository.getAll();
  }

  async getDiaryById(id) {
    return diaryRepository.getById(id);
  }

  async _assertDayIsFree(timelineId, date, ignoreId = null) {
    if (!timelineId || !date) return;
    const sameDay = await diaryRepository.getByTimelineAndDate(timelineId, date);
    if (sameDay.some((d) => String(d.id) !== String(ignoreId))) {
      throw new Error(t('diaryModal.duplicateDayError'));
    }
  }

  // Diary payloads arrive in the generic event shape (title / category); map them to the diary columns
  _normalizePayload(data) {
    const payload = {};
    const name = data.name ?? data.title;
    if (name !== undefined) payload.name = String(name).trim();
    if (data.description !== undefined) payload.description = data.description || '';
    if (data.labels !== undefined) payload.labels = data.labels;
    if (data.notes !== undefined) payload.notes = data.notes || '';
    if (data.date !== undefined) payload.date = data.date ? String(data.date).substring(0, 10) : null;
    const mood = data.mood ?? data.category;
    if (mood !== undefined) payload.mood = mood || DiaryMood.GOOD;
    return payload;
  }

  async createDiary(data) {
    const payload = this._normalizePayload(data);
    if (!payload.name) throw new Error(t('diaryModal.titleRequired'));
    if (!payload.date) throw new Error(t('diaryModal.dateRequired'));

    let timeboardId = data.timeboardId || data.timeboard_id;
    const timelineId = data.timelineId || data.timelineOriginId || data.timeline_id || null;

    if (!timeboardId && timelineId) {
      try {
        const tl = await timelineRepository.getById(timelineId);
        if (tl) timeboardId = tl.timeboardId || tl.timeboard_id;
      } catch (e) {
        console.warn('Could not resolve timeboardId from timeline in createDiary:', e.message);
      }
    }

    await this._assertDayIsFree(timelineId, payload.date);

    return diaryRepository.create({
      ...payload,
      mood: payload.mood || DiaryMood.GOOD,
      timeboardId,
      timelineId,
      tenantId: data.tenantId || data.tenant_id || null
    });
  }

  async updateDiary(id, updates) {
    const existing = await diaryRepository.getById(id);
    if (!existing) throw new Error(t('diaryModal.notFound'));

    const payload = this._normalizePayload(updates);
    if (payload.name !== undefined && !payload.name) throw new Error(t('diaryModal.titleRequired'));
    if (payload.date && payload.date !== existing.date) {
      await this._assertDayIsFree(existing.timelineId, payload.date, id);
    }

    return diaryRepository.update(id, payload);
  }

  async deleteDiary(id) {
    return diaryRepository.delete(id);
  }
}

export const diaryService = new DiaryService();
