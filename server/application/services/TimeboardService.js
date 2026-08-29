import { timeboardRepository } from '../../infrastructure/database/supabase/SupabaseTimeboardRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { loanContractRepository } from '../../infrastructure/database/json/JsonLoanContractRepository.js';
import { eventRepository } from '../../infrastructure/database/json/JsonEventRepository.js';
import { TimeboardType } from '../../domain/enums/index.js';

export class TimeboardService {
  async getAllTimeboards() {
    const timeboards = await timeboardRepository.getAll();
    const timelines = await timelineRepository.getAll();

    return timeboards.map((tb) => ({
      ...tb,
      timelines: timelines.filter((tl) => tl.timeboardId === tb.id)
    }));
  }

  async getTimeboardById(id) {
    const timeboard = await timeboardRepository.getById(id);
    if (!timeboard) return null;

    const timelines = await timelineRepository.getAll();
    return {
      ...timeboard,
      timelines: timelines.filter((tl) => tl.timeboardId === id)
    };
  }

  async createTimeboard(data) {
    const createdTimeboard = await timeboardRepository.create({
      ...data,
      type: data.type || TimeboardType.FINANCIAL
    });

    const isFinancial =
      createdTimeboard.isFinancial?.() ||
      createdTimeboard.type === 'financial' ||
      createdTimeboard.type === TimeboardType.FINANCIAL;

    if (isFinancial) {
      const defaultTimelines = [
        {
          timeboardId: createdTimeboard.id,
          name: 'Entradas e Rendimentos',
          type: 'entradas',
          color: '#10b981',
          description: 'Gestão de salários, rendimentos e receitas',
          isSystemDefault: true,
          canDelete: false,
          status: 'Ativo',
          periodicity: 'mensal',
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: createdTimeboard.tenantId || 'tenant-igor'
        },
        {
          timeboardId: createdTimeboard.id,
          name: 'Gastos e Despesas',
          type: 'gastos',
          color: '#f43f5e',
          description: 'Gestão de despesas fixas, recorrentes e variáveis',
          isSystemDefault: true,
          canDelete: false,
          status: 'Ativo',
          periodicity: 'mensal',
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: createdTimeboard.tenantId || 'tenant-igor'
        },
        {
          timeboardId: createdTimeboard.id,
          name: 'Investimentos e Poupança',
          type: 'investimentos',
          color: '#6366f1',
          description: 'Gestão de poupança, património e aportes',
          isSystemDefault: true,
          canDelete: false,
          status: 'Ativo',
          periodicity: 'mensal',
          startDate: '2026-01-01',
          endDate: '2027-04-30',
          tenantId: createdTimeboard.tenantId || 'tenant-igor'
        }
      ];

      for (const tl of defaultTimelines) {
        await timelineRepository.create(tl);
      }
    }

    return this.getTimeboardById(createdTimeboard.id);
  }

  async updateTimeboard(id, updates) {
    return timeboardRepository.update(id, updates);
  }

  async deleteTimeboard(id) {
    const timelines = await timelineRepository.getAll((tl) => tl.timeboardId === id);
    for (const tl of timelines) {
      await eventRepository.deleteMany((ev) => ev.timelineId === tl.id || ev.timelineOriginId === tl.id || ev.sobrepositionOver);
      await loanContractRepository.deleteMany((loan) => loan.timelineId === tl.id);
      await timelineRepository.delete(tl.id);
    }
    await eventRepository.deleteMany((ev) => ev.timeboardId === id);
    return timeboardRepository.delete(id);
  }
}

export const timeboardService = new TimeboardService();
