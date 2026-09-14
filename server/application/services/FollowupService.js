import { randomUUID } from 'crypto';
import { followupRepository } from '../../infrastructure/database/supabase/SupabaseFollowupRepository.js';
import { FollowupStatus, normalizeFollowupStatus } from '../../../shared/enums/index.js';

export class FollowupService {
  async getAllFollowups(query = {}) {
    const { timelineId, timeboardId } = query;
    if (timelineId) {
      return followupRepository.getByTimelineId(timelineId);
    }
    if (timeboardId) {
      return followupRepository.getByTimeboardId(timeboardId);
    }
    return followupRepository.getAll();
  }

  async getFollowupById(id) {
    if (!id) return null;
    return followupRepository.getById(id);
  }

  async getFollowupsByEventId(eventId) {
    if (!eventId) return [];
    return followupRepository.getByEventId(eventId);
  }

  async createFollowup(payload) {
    if (!payload.name || !payload.name.trim()) {
      throw new Error('Followup name is required');
    }

    const eventId = payload.eventId || payload.event_id || randomUUID();
    let creationDate;
    if (payload.createdAt) {
      creationDate = new Date(payload.createdAt).toISOString();
    } else if (payload.date) {
      const dateOnly = String(payload.date).substring(0, 10);
      creationDate = new Date(`${dateOnly}T12:00:00.000Z`).toISOString();
    } else {
      creationDate = new Date().toISOString();
    }

    const baseData = {
      eventId,
      timeboardId: payload.timeboardId || payload.timeboard_id,
      timelineId: payload.timelineId || payload.timeline_id || null,
      name: payload.name.trim(),
      description: payload.description ? payload.description.trim() : '',
      labels: Array.isArray(payload.labels) ? payload.labels : (typeof payload.labels === 'string' ? JSON.parse(payload.labels || '[]') : []),
      tenantId: payload.tenantId || payload.tenant_id || null,
      createdAt: creationDate,
      updatedAt: creationDate
    };

    // Registro 1: Posição 0 (Iniciado / Âncora no mês/dia de criação)
    const anchorData = {
      ...baseData,
      position: 0,
      status: FollowupStatus.INITIATED,
      notes: '',
      breakdownItems: []
    };

    // Registro 2: Posição 1 (Em andamento / Ativo com subtasks e notas)
    const initialStatus = payload.status ? normalizeFollowupStatus(payload.status) : FollowupStatus.IN_PROGRESS;
    const activeData = {
      ...baseData,
      position: 1,
      status: initialStatus === FollowupStatus.INITIATED ? FollowupStatus.IN_PROGRESS : initialStatus,
      notes: payload.notes || '',
      breakdownItems: Array.isArray(payload.breakdownItems)
        ? payload.breakdownItems
        : (Array.isArray(payload.breakdown_items) ? payload.breakdown_items : [])
    };

    const created = await followupRepository.createMany([anchorData, activeData]);
    // Retorna o registro ativo (posição 1) como principal
    const activeItem = created.find((item) => item.position === 1) || created[0];
    return activeItem;
  }

  async updateFollowup(id, payload) {
    const existing = await followupRepository.getById(id);
    if (!existing) {
      throw new Error('Followup not found');
    }

    // Se tentar alterar status ou notas da posição 0 (âncora), bloquear
    if (existing.position === 0) {
      const allowedUpdates = {};
      if (payload.name !== undefined) allowedUpdates.name = payload.name.trim();
      if (payload.description !== undefined) allowedUpdates.description = payload.description.trim();
      if (payload.labels !== undefined) allowedUpdates.labels = payload.labels;
      return followupRepository.update(id, allowedUpdates);
    }

    // Atualização normal da posição 1
    const updates = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.description !== undefined) updates.description = payload.description.trim();
    if (payload.labels !== undefined) updates.labels = payload.labels;
    if (payload.notes !== undefined) updates.notes = payload.notes;
    if (payload.breakdownItems !== undefined) updates.breakdownItems = payload.breakdownItems;
    if (payload.breakdown_items !== undefined) updates.breakdownItems = payload.breakdown_items;

    if (payload.status !== undefined) {
      const normalized = normalizeFollowupStatus(payload.status);
      updates.status = normalized;

      if (normalized === FollowupStatus.FINISHED) {
        // Se finalizado, fixar a data de conclusão
        const finishDate = payload.doneDate || payload.date || payload.updatedAt || new Date().toISOString();
        updates.updatedAt = new Date(finishDate).toISOString();
      } else {
        updates.updatedAt = new Date().toISOString();
      }
    } else {
      updates.updatedAt = new Date().toISOString();
    }

    const updated = await followupRepository.update(id, updates);

    // Sincronizar nome/descrição/labels com o registro âncora (posição 0)
    if (existing.eventId && (payload.name !== undefined || payload.description !== undefined || payload.labels !== undefined)) {
      try {
        const siblings = await followupRepository.getByEventId(existing.eventId);
        const anchor = siblings.find((s) => s.position === 0 && s.id !== id);
        if (anchor) {
          const syncData = {};
          if (payload.name !== undefined) syncData.name = payload.name.trim();
          if (payload.description !== undefined) syncData.description = payload.description.trim();
          if (payload.labels !== undefined) syncData.labels = payload.labels;
          await followupRepository.update(anchor.id, syncData);
        }
      } catch (err) {
        console.warn('Error syncing followup anchor fields:', err.message);
      }
    }

    return updated;
  }

  async toggleStatus(id, newStatus = null) {
    const existing = await followupRepository.getById(id);
    if (!existing) {
      throw new Error('Followup not found');
    }

    if (existing.position === 0) {
      throw new Error('Initial anchor cannot change status');
    }

    let targetStatus;
    if (newStatus) {
      targetStatus = normalizeFollowupStatus(newStatus);
    } else {
      targetStatus = existing.status === FollowupStatus.FINISHED
        ? FollowupStatus.IN_PROGRESS
        : FollowupStatus.FINISHED;
    }

    const updates = {
      status: targetStatus,
      updatedAt: new Date().toISOString()
    };

    return followupRepository.update(id, updates);
  }

  async deleteFollowup(id) {
    const existing = await followupRepository.getById(id);
    if (!existing) return true;

    if (existing.eventId) {
      return followupRepository.deleteByEventId(existing.eventId);
    }
    return followupRepository.delete(id);
  }

  /**
   * Projeta os registros de follow-up de acordo com as regras de mês e visualização.
   */
  async getProjectedFollowups(query = {}) {
    const followups = await this.getAllFollowups(query);
    const todayStr = new Date().toISOString().substring(0, 10);
    const todayMonthStr = todayStr.substring(0, 7);

    // Agrupar por eventId
    const groups = new Map();
    const ungrouped = [];

    for (const f of followups) {
      if (f.eventId) {
        if (!groups.has(f.eventId)) {
          groups.set(f.eventId, []);
        }
        groups.get(f.eventId).push(f);
      } else {
        ungrouped.push(f);
      }
    }

    const projected = [];

    for (const [eventId, items] of groups.entries()) {
      const anchor = items.find((i) => i.position === 0);
      const active = items.find((i) => i.position === 1) || items.find((i) => i.position !== 0) || items[0];

      if (!anchor && active) {
        // Fallback se só existir 1 registro
        projected.push(active);
        continue;
      }

      const anchorDateStr = anchor?.createdAt ? String(anchor.createdAt).substring(0, 10) : todayStr;
      const anchorMonthStr = anchorDateStr.substring(0, 7);

      const isActiveFinished = active?.status === FollowupStatus.FINISHED;
      const activeDateStr = isActiveFinished
        ? (active?.updatedAt ? String(active.updatedAt).substring(0, 10) : todayStr)
        : todayStr;
      const activeMonthStr = activeDateStr.substring(0, 7);

      // Se ambos estiverem no mesmo mês (mês de criação), exibe o Início (Posição 0) e o Ativo/Fim (Posição 1) conectados
      if (anchorMonthStr === activeMonthStr) {
        projected.push({
          ...anchor,
          effectiveDate: anchorDateStr,
          isAnchorVisible: true,
          isReadOnly: true,
          status: FollowupStatus.INITIATED
        });

        projected.push({
          ...active,
          effectiveDate: isActiveFinished ? activeDateStr : anchorDateStr,
          isAnchorVisible: false,
          isFloating: false
        });
      } else {
        // Mês atual > Mês de criação:
        // Posição 0 fixo no mês de criação como iniciado (apenas leitura)
        projected.push({
          ...anchor,
          effectiveDate: anchorDateStr,
          isAnchorVisible: true,
          isReadOnly: true,
          status: FollowupStatus.INITIATED
        });

        // Posição 1 aparece no mês atual (em andamento) ou no mês em que foi finalizado
        projected.push({
          ...active,
          effectiveDate: isActiveFinished ? activeDateStr : todayStr,
          isAnchorVisible: false,
          isFloating: !isActiveFinished
        });
      }
    }

    for (const u of ungrouped) {
      projected.push(u);
    }

    return projected;
  }
}

export const followupService = new FollowupService();
