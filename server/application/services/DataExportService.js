import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { personRepository } from '../../infrastructure/database/supabase/SupabasePersonRepository.js';
import { financialEventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { financialEventStatusRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventStatusRepository.js';
import { diaryRepository } from '../../infrastructure/database/supabase/SupabaseDiaryRepository.js';
import { pocketRepository } from '../../infrastructure/database/supabase/SupabasePocketRepository.js';
import { eventService } from './EventService.js';
import { createZip } from '../../infrastructure/export/zip.js';
import { createT } from '../../../shared/i18n/index.js';

// CSV for Excel in Portugal: ";" separator and a BOM so the accents open correctly
const toCsv = (header, rows) => {
  const escape = (value) => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  return `﻿${[header, ...rows].map((row) => row.map(escape).join(';')).join('\r\n')}`;
};
const decimal = (value) => (value === null || value === undefined || value === '' ? '' : String(value).replace('.', ','));
const endOfCurrentMonth = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).toISOString().substring(0, 10);
};

/**
 * Full export of a timeboard (data portability): CSV sheets for Excel — entities, movements up to the current
 * month with their status, notices — and data.json with every stored record (series, statuses, receipts…).
 */
export class DataExportService {
  async exportTimeboard(timeboardId, { language = 'pt' } = {}) {
    const t = createT(language);
    const [timeboard, timelines, persons, events, statuses, diaries, pockets] = await Promise.all([
      timeboardRepository.getById(timeboardId),
      timelineRepository.findByTimeboardId(timeboardId),
      personRepository.getByTimeboardId(timeboardId),
      financialEventRepository.getAll({ timeboardId }),
      financialEventStatusRepository.getAll({ timeboardId }),
      diaryRepository.getByTimeboardId(timeboardId).catch(() => []),
      pocketRepository.getByTimeboardId(timeboardId).catch(() => [])
    ]);
    if (!timeboard) return null;

    const timelineName = new Map((timelines || []).map((tl) => [String(tl.id), tl.name]));
    const personById = new Map((persons || []).map((p) => [String(p.id), p]));
    const lastDate = endOfCurrentMonth();
    const occurrences = (await eventService.getAllEvents({ timeboardId }))
      .filter((e) => e.date && e.date <= lastDate)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)));

    const col = (key) => t(`dataExport.columns.${key}`);
    const label = (prefix, value) => {
      if (!value) return '';
      const text = t(`${prefix}.${value}`);
      return text === `${prefix}.${value}` ? value : text;
    };

    const entitiesCsv = toCsv(
      ['unit', 'name', 'type', 'role', 'email', 'phone', 'taxId', 'notes'].map(col),
      (persons || []).map((p) => [p.obligatorIdentification, p.personName, p.type, p.role, p.email, p.phone, p.taxId, p.observation])
    );
    const movementsCsv = toCsv(
      ['date', 'title', 'timeline', 'type', 'category', 'amount', 'status', 'unit', 'person', 'notes'].map(col),
      occurrences.map((e) => {
        const person = personById.get(String(e.obligationPersonId || ''));
        return [
          e.date,
          e.title || e.name,
          timelineName.get(String(e.timelineId)) || '',
          e.eventType,
          e.category,
          decimal(e.amount),
          label('status', e.status),
          person?.obligatorIdentification || '',
          person?.personName || '',
          e.notes || ''
        ];
      })
    );
    const noticesCsv = toCsv(
      ['date', 'title', 'timeline', 'content'].map(col),
      (diaries || []).map((d) => [d.date, d.title, timelineName.get(String(d.timelineId || d.timeline_id)) || '', d.content || d.description || ''])
    );

    const exportedAt = new Date().toISOString();
    const json = JSON.stringify({
      exportedAt,
      timeboard,
      timelines,
      pockets,
      persons,
      events,
      eventStatuses: statuses,
      notices: diaries
    }, null, 2);

    const file = (key, ext) => `${t(`dataExport.files.${key}`)}.${ext}`;
    const buffer = createZip([
      { name: file('entities', 'csv'), content: entitiesCsv },
      { name: file('movements', 'csv'), content: movementsCsv },
      { name: file('notices', 'csv'), content: noticesCsv },
      { name: file('data', 'json'), content: json },
      { name: file('readme', 'txt'), content: t('dataExport.readme', { name: timeboard.name, date: exportedAt.substring(0, 10), until: lastDate }) }
    ]);
    const safeName = String(timeboard.name || 'timeboard').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return { buffer, fileName: `${safeName}-${exportedAt.substring(0, 10)}.zip` };
  }
}

export const dataExportService = new DataExportService();
