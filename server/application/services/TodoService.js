import { todoRepository } from '../../infrastructure/database/supabase/SupabaseTodoRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { EventStatus, EventPriority } from '../../../shared/enums/index.js';

export class TodoService {
  async getAllTodos(query = {}) {
    const { timeboardId, timelineId, status } = query;

    let todos = [];
    if (timelineId) {
      todos = await todoRepository.getByTimelineId(timelineId);
    } else if (timeboardId) {
      todos = await todoRepository.getByTimeboardId(timeboardId);
    } else {
      todos = await todoRepository.getAll();
    }

    if (status) {
      const normalizedStatus = String(status).toLowerCase();
      todos = todos.filter((t) => String(t.status || '').toLowerCase() === normalizedStatus);
    }

    return todos;
  }

  async getTodoById(id) {
    return todoRepository.getById(id);
  }

  async createTodo(data) {
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      throw new Error('O nome da tarefa é obrigatório.');
    }

    let timeboardId = data.timeboardId || data.timeboard_id;
    const timelineId = data.timelineId || data.timeline_id;

    if (!timeboardId && timelineId) {
      try {
        const tl = await timelineRepository.getById(timelineId);
        if (tl) timeboardId = tl.timeboardId || tl.timeboard_id;
      } catch (e) {
        console.warn('Could not resolve timeboardId from timeline in createTodo:', e.message);
      }
    }

    const payload = {
      ...data,
      name: data.name.trim(),
      description: data.description || '',
      labels: Array.isArray(data.labels) ? data.labels : (typeof data.labels === 'string' ? JSON.parse(data.labels || '[]') : []),
      notes: data.notes || '',
      priority: data.priority || EventPriority.NORMAL,
      status: data.status ? String(data.status).toLowerCase() : EventStatus.PENDING,
      doneDate: data.doneDate || data.done_date || (data.status === EventStatus.COMPLETED ? new Date().toISOString().substring(0, 10) : null),
      isObligation: Boolean(data.isObligation || data.is_obligation),
      obligationPersonId: data.obligationPersonId || data.obligation_person_id || null,
      timeboardId,
      timelineId,
      tenantId: data.tenantId || data.tenant_id || null
    };

    return todoRepository.create(payload);
  }

  async updateTodo(id, updates) {
    const existing = await todoRepository.getById(id);
    if (!existing) {
      throw new Error('Tarefa não encontrada.');
    }

    const payload = { ...updates };
    if (payload.name !== undefined) {
      payload.name = String(payload.name).trim();
      if (!payload.name) throw new Error('O nome da tarefa não pode ser vazio.');
    }

    if (payload.status !== undefined) {
      payload.status = String(payload.status).toLowerCase();
      if (payload.status === EventStatus.COMPLETED && !payload.doneDate && !payload.done_date && !existing.doneDate) {
        payload.doneDate = new Date().toISOString().substring(0, 10);
      } else if (payload.status === EventStatus.PENDING) {
        payload.doneDate = null;
        payload.done_date = null;
      }
    }

    return todoRepository.update(id, payload);
  }

  async toggleStatus(id, forcedStatus = null) {
    const existing = await todoRepository.getById(id);
    if (!existing) {
      throw new Error('Tarefa não encontrada.');
    }

    let nextStatus = EventStatus.COMPLETED;
    if (forcedStatus) {
      nextStatus = String(forcedStatus).toLowerCase();
    } else {
      nextStatus = existing.status === EventStatus.COMPLETED ? EventStatus.PENDING : EventStatus.COMPLETED;
    }

    const isNowCompleted = nextStatus === EventStatus.COMPLETED;
    const doneDate = isNowCompleted ? new Date().toISOString().substring(0, 10) : null;

    return todoRepository.update(id, {
      status: nextStatus,
      doneDate,
      done_date: doneDate
    });
  }

  async deleteTodo(id) {
    return todoRepository.delete(id);
  }
}

export const todoService = new TodoService();
