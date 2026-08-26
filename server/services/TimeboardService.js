import { timeboardRepository } from '../repositories/TimeboardRepository.js';
import { timelineRepository } from '../repositories/TimelineRepository.js';
import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';
import { randomUUID } from 'crypto';



export class TimeboardService {
    // --- Timeboard Operations ---
    async getAllTimeboards() {
        const timeboards = await timeboardRepository.getAll();
        //const timelines = await this.getAllTimelines();

        return timeboards.map((tb) => ({
            ...tb,
            //timelines: timelines.filter((tl) => tl.timeboardId === tb.id)
        }));
    }

    async getTimeboardById(id) {
        const timeboard = await timeboardRepository.getById(id);
        if (!timeboard) return null;

        const timelines = await this.getAllTimelines();
        return {
            ...timeboard,
            timelines: timelines.filter((tl) => tl.timeboardId === id)
        };
    }

    async createTimeboard(data) {
        const createdTimeboard = await timeboardRepository.create({
            ...data,
            type: data.type || 'financeiro'
        });

        if (createdTimeboard.type === 'financeiro') {
            await timelineRepository.create({
                id: randomUUID(),
                timeboardId: createdTimeboard.id,
                name: 'Entradas e Rendimentos',
                type: 'entradas',
                color: '#10b981',
                description: 'Receitas recorrentes, salários e rendimentos.',
                isSystemDefault: true,
                canDelete: false,
                startDate: '2026-01-01',
                endDate: '2027-04-30',
                tenantId: createdTimeboard.tenantId || 'tenant-igor'
            });

            await timelineRepository.create({
                id: randomUUID(),
                timeboardId: createdTimeboard.id,
                name: 'Gastos e Saídas',
                type: 'gastos',
                color: '#f43f5e',
                description: 'Despesas correntes, fixas e variáveis.',
                isSystemDefault: true,
                canDelete: false,
                startDate: '2026-01-01',
                endDate: '2027-04-30',
                tenantId: createdTimeboard.tenantId || 'tenant-igor'
            });
        }

        return this.getTimeboardById(createdTimeboard.id);
    }

    async updateTimeboard(id, updates) {
        return timeboardRepository.update(id, updates);
    }

    async deleteTimeboard(id) {
        const timelines = await timelineRepository.getAll((tl) => tl.timeboardId === id);
        for (const tl of timelines) {
            await eventRepository.deleteMany((ev) => ev.timelineOriginId === tl.id || ev.sobrepositionOver);
            await loanContractRepository.deleteMany((loan) => loan.timelineId === tl.id);
            await timelineRepository.delete(tl.id);
        }
        return timeboardRepository.delete(id);
    }
}

export const timeboardService = new TimeboardService();
