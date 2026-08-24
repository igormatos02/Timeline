import { timeboardRepository } from '../repositories/TimeboardRepository.js';
import { timelineRepository } from '../repositories/TimelineRepository.js';
import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';

export class TimelineService {
  // --- Timeboard Operations ---
  async getAllTimeboards() {
    const timeboards = await timeboardRepository.getAll();
    const timelines = await this.getAllTimelines();

    return timeboards.map((tb) => ({
      ...tb,
      timelines: timelines.filter((tl) => tl.timeboardId === tb.id)
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

    // Se o timeboard for financeiro, cria automaticamente as 2 timelines obrigatórias do sistema
    if (createdTimeboard.type === 'financeiro') {
      // 1. Entradas e Rendimentos
      await timelineRepository.create({
        id: `tl-entradas-${createdTimeboard.id}`,
        timeboardId: createdTimeboard.id,
        name: 'Entradas e Rendimentos',
        type: 'entradas',
        color: '#10b981',
        description: 'Receitas recorrentes, salários e rendimentos.',
        isSystemDefault: true,
        canDelete: false,
        startDate: '2026-01-01',
        endDate: '2027-04-30'
      });

      // 2. Gastos e Saídas
      await timelineRepository.create({
        id: `tl-gastos-${createdTimeboard.id}`,
        timeboardId: createdTimeboard.id,
        name: 'Gastos e Saídas',
        type: 'gastos',
        color: '#f43f5e',
        description: 'Despesas correntes, fixas e variáveis.',
        isSystemDefault: true,
        canDelete: false,
        startDate: '2026-01-01',
        endDate: '2027-04-30'
      });
    }

    return this.getTimeboardById(createdTimeboard.id);
  }

  async updateTimeboard(id, updates) {
    return timeboardRepository.update(id, updates);
  }

  async deleteTimeboard(id) {
    // Cascade delete timelines
    const timelines = await timelineRepository.getAll((tl) => tl.timeboardId === id);
    for (const tl of timelines) {
      await eventRepository.deleteMany((ev) => ev.timelineOriginId === tl.id);
      await loanContractRepository.deleteMany((loan) => loan.timelineId === tl.id);
      await timelineRepository.delete(tl.id);
    }
    return timeboardRepository.delete(id);
  }

  // --- Timeline Operations ---
  async getAllTimelines() {
    const timelines = await timelineRepository.getAll();
    const allLoans = await loanContractRepository.getAll();
    const allEvents = await eventRepository.getAll();

    // Group loans and events by timeline
    return timelines.map((tl) => {
      const tlLoans = allLoans.filter((l) => l.timelineId === tl.id);
      const tlEvents = allEvents.filter((ev) => ev.timelineOriginId === tl.id || (tl.id === 'tl-income' && ev.timelineOriginId?.startsWith('tl-loan-')));

      return {
        ...tl,
        carLoans: tlLoans,
        events: tlEvents
      };
    });
  }

  async getTimelineById(id) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) return null;

    const loans = await loanContractRepository.findByTimelineId(id);
    const events = await eventRepository.getAll((ev) => ev.timelineOriginId === id || (id === 'tl-income' && ev.timelineOriginId?.startsWith('tl-loan-')));

    return {
      ...timeline,
      carLoans: loans,
      events
    };
  }

  async createTimeline(data) {
    // Validar se já existe uma timeline padrão de entradas ou gastos no mesmo timeboard
    if (data.type === 'entradas' || data.type === 'gastos') {
      const existing = await timelineRepository.getAll((tl) => tl.timeboardId === data.timeboardId && tl.type === data.type);
      if (existing.length > 0) {
        throw new Error(`O Timeboard já possui uma timeline de ${data.type === 'entradas' ? 'Entradas' : 'Gastos'} (única permitida).`);
      }
    }

    return timelineRepository.create(data);
  }

  async updateTimeline(id, updates) {
    return timelineRepository.update(id, updates);
  }

  async deleteTimeline(id) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) return false;

    if (timeline.isSystemDefault) {
      throw new Error('Não é permitido excluir timelines padrão do sistema (Entradas e Gastos).');
    }

    await eventRepository.deleteMany((ev) => ev.timelineOriginId === id);
    await loanContractRepository.deleteMany((loan) => loan.timelineId === id);
    return timelineRepository.delete(id);
  }

  // --- Events Operations ---
  async getAllEvents(filter = {}) {
    return eventRepository.getAll((ev) => {
      if (filter.timelineOriginId && ev.timelineOriginId !== filter.timelineOriginId) return false;
      if (filter.category && ev.category !== filter.category) return false;
      if (filter.startDate && ev.date < filter.startDate) return false;
      if (filter.endDate && ev.date > filter.endDate) return false;
      return true;
    });
  }

  async createEvent(eventData) {
    return eventRepository.create(eventData);
  }

  async updateEvent(id, updates) {
    const { propagateForward, updateAllRecurring, previousTitle, ...directUpdates } = updates;

    const existingEvent = await eventRepository.getById(id);
    if (!existingEvent) {
      throw new Error(`Event not found: ${id}`);
    }

    const updatedEvent = await eventRepository.update(id, directUpdates);

    // If recurring series propagation is requested
    if ((propagateForward || updateAllRecurring) && existingEvent.seriesId) {
      const fromDate = updateAllRecurring ? null : existingEvent.date;
      const seriesUpdates = {};

      if (directUpdates.title !== undefined) seriesUpdates.title = directUpdates.title;
      if (directUpdates.amount !== undefined) seriesUpdates.amount = directUpdates.amount;
      if (directUpdates.priority !== undefined) seriesUpdates.priority = directUpdates.priority;
      if (directUpdates.breakdownItems !== undefined) seriesUpdates.breakdownItems = directUpdates.breakdownItems;

      if (Object.keys(seriesUpdates).length > 0) {
        await eventRepository.updateRecurringSeries(existingEvent.seriesId, seriesUpdates, fromDate);
      }

      // If a specific subpart name was renamed across the series
      if (previousTitle && directUpdates.title) {
        await eventRepository.updateSubpartNameInSeries(existingEvent.seriesId, previousTitle, directUpdates.title, fromDate);
      }
    }

    return updatedEvent;
  }

  async toggleEventPayment(id) {
    const event = await eventRepository.getById(id);
    if (!event) throw new Error(`Event not found: ${id}`);

    let newStatus = 'Pago';
    let isCompleted = true;

    if (event.status === 'Pago' || event.isCompleted) {
      newStatus = 'Pendente';
      isCompleted = false;
    }

    return eventRepository.update(id, {
      status: newStatus,
      isCompleted
    });
  }

  async deleteEvent(id, options = {}) {
    const event = await eventRepository.getById(id);
    if (!event) return false;

    if (options.deleteSeries && event.seriesId) {
      const fromDate = options.fromDate || (options.onlySubsequent ? event.date : null);
      return eventRepository.deleteMany((ev) => ev.seriesId === event.seriesId && (!fromDate || ev.date >= fromDate));
    }

    return eventRepository.delete(id);
  }

  // --- Loan Operations ---
  async getLoanContracts() {
    return loanContractRepository.getAll();
  }

  async amortizeLoan({ loanId, amount, date, recalculateMode = 'prazo' }) {
    const loan = await loanContractRepository.getById(loanId);
    if (!loan) throw new Error(`Loan not found: ${loanId}`);

    const amortAmount = Number(amount);
    const newRemainingDebt = Math.max(0, loan.remainingDebt - amortAmount);
    const newAmortizedCapital = loan.amortizedCapital + amortAmount;

    // 1. Create amortization event
    const amortEvent = await eventRepository.create({
      timelineOriginId: loan.id,
      timelineOriginName: loan.name,
      timelineOriginIcon: '📉',
      date: date || new Date().toISOString().substring(0, 10),
      time: '12:00',
      title: `Amortização Extraordinária (${loan.name})`,
      description: `Amortização antecipada de ${amortAmount} €. Saldo restante: ${newRemainingDebt} €.`,
      category: 'amortizacao',
      status: 'Pago',
      amount: amortAmount,
      balanceAfter: newRemainingDebt,
      isCompleted: true
    });

    // 2. Update loan contract
    await loanContractRepository.update(loanId, {
      remainingDebt: newRemainingDebt,
      amortizedCapital: newAmortizedCapital
    });

    return {
      amortEvent,
      loan: await loanContractRepository.getById(loanId)
    };
  }
}

export const timelineService = new TimelineService();
