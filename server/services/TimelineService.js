import { timeboardRepository } from '../repositories/TimeboardRepository.js';
import { timelineRepository } from '../repositories/TimelineRepository.js';
import { loanContractRepository } from '../repositories/LoanContractRepository.js';
import { eventRepository } from '../repositories/EventRepository.js';
import { addMonths, format, parseISO } from 'date-fns';

/**
 * Motor de Projeção de Eventos:
 * Transforma eventos únicos e eventos recorrentes base armazenados na BD num fluxo contínuo
 * de ocorrências projetadas dentro da janela temporal [startDate, endDate], aplicando sobreposições pontuais (sobrepositionOver)
 * e versões incrementais (version) a partir de datas específicas.
 */
export function projectEvents(rawEvents = [], options = {}) {
  const horizonEndDate = typeof options === 'string' ? options : (options.endDate || '2028-12-31');
  const filterStartDate = options.startDate || null;
  const filterEndDate = options.endDate || horizonEndDate;

  const uniqueEvents = [];
  const recurringSeriesMap = new Map(); // seriesId -> array de versões
  const overridesMap = new Map(); // `${sobrepositionOver}_${date}` -> override event

  // 1. Classificar os eventos brutos
  for (const ev of rawEvents) {
    const isLoan = ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || ev.category === 'amortizacao' || ev.timelineOriginId?.startsWith('tl-loan-');

    if (ev.sobrepositionOver) {
      const key = `${ev.sobrepositionOver}_${ev.date}`;
      if (!overridesMap.has(key) || Number(ev.version || 0) >= Number(overridesMap.get(key).version || 0)) {
        overridesMap.set(key, ev);
      }
    } else if (!isLoan && (ev.isRecurring || ev.periodicity === 'recorrente' || ev.seriesId)) {
      const sId = ev.seriesId || ev.id;
      const normalizedEv = {
        ...ev,
        seriesId: sId,
        version: ev.version !== undefined ? Number(ev.version) : 0
      };
      if (!recurringSeriesMap.has(sId)) {
        recurringSeriesMap.set(sId, []);
      }
      recurringSeriesMap.get(sId).push(normalizedEv);
    } else {
      uniqueEvents.push({
        ...ev,
        isFirstOccurrence: true
      });
    }
  }

  const projectedInstances = [];

  // 2. Projetar cada série recorrente
  for (const [seriesId, versions] of recurringSeriesMap.entries()) {
    // Agrupar versões por data e manter a versão com maior número de versão para a mesma data
    const versionsByDate = new Map();
    for (const v of versions) {
      if (!v || !v.date) continue;
      const vDate = v.date;
      if (!versionsByDate.has(vDate) || (Number(v.version || 0) >= Number(versionsByDate.get(vDate).version || 0))) {
        versionsByDate.set(vDate, v);
      }
    }

    // Ordenar as versões cronologicamente por data de início
    const sortedVersions = Array.from(versionsByDate.values()).sort((a, b) => (a.date > b.date ? 1 : -1));
    const rootVersion = sortedVersions[0];
    if (!rootVersion || !rootVersion.date) continue;

    let baseDate;
    try {
      baseDate = parseISO(rootVersion.date);
      if (isNaN(baseDate.getTime())) baseDate = new Date(2026, 0, 1);
    } catch {
      baseDate = new Date(2026, 0, 1);
    }

    const horizonDate = parseISO(horizonEndDate);
    const dayOfMonth = rootVersion.dayOfMonth || baseDate.getDate() || 1;

    const seriesTargetAmount = sortedVersions.find(v => v.targetAmount !== undefined && v.targetAmount !== null && Number(v.targetAmount) > 0)?.targetAmount;

    let curDate = baseDate;
    let safetyCounter = 0;

    while (curDate <= horizonDate && safetyCounter < 120) {
      safetyCounter++;
      const curDateStr = format(curDate, 'yyyy-MM-dd');
      const curMonthKey = curDateStr.substring(0, 7);

      // Encontrar a versão ativa: a versão mais recente cuja data seja <= curDateStr
      let activeVersion = rootVersion;
      for (const v of sortedVersions) {
        if (v.date <= curDateStr) {
          activeVersion = v;
        }
      }

      // Se a versão ativa estiver marcada como terminada a partir desta data, não projetar mais
      if (activeVersion.isTerminated || activeVersion.isDeleted) {
        curDate = addMonths(curDate, 1);
        try {
          const y = curDate.getFullYear();
          const m = curDate.getMonth();
          const lastDay = new Date(y, m + 1, 0).getDate();
          curDate = new Date(y, m, Math.min(dayOfMonth, lastDay));
        } catch { }
        continue;
      }

      // Verificar se existe sobreposição pontual (sobrepositionOver) para esta data/mês
      const overrideKey = `${seriesId}_${curDateStr}`;
      let override = overridesMap.get(overrideKey);
      if (!override) {
        for (const [k, ov] of overridesMap.entries()) {
          if (ov.sobrepositionOver === seriesId && ov.date?.substring(0, 7) === curMonthKey) {
            override = ov;
            break;
          }
        }
      }

      const isFirstOccurrence = curDateStr === rootVersion.date;

      if (override) {
        // Se a sobreposição for uma exclusão (tombstone), omitir a ocorrência
        if (override.isDeleted || override.status === 'Excluido') {
          // Omitido
        } else {
          projectedInstances.push({
            ...activeVersion,
            ...override,
            targetAmount: (override.targetAmount !== undefined && override.targetAmount !== null) ? override.targetAmount : (activeVersion.targetAmount || seriesTargetAmount),
            initialInvestedAmount: (override.initialInvestedAmount !== undefined && override.initialInvestedAmount !== null) ? override.initialInvestedAmount : activeVersion.initialInvestedAmount,
            isOverridden: true,
            sobrepositionOver: seriesId,
            isFirstOccurrence
          });
        }
      } else {
        // Ocorrência gerada a partir da versão ativa
        projectedInstances.push({
          ...activeVersion,
          id: `${seriesId}_${curDateStr}`,
          seriesId,
          version: activeVersion.version,
          targetAmount: activeVersion.targetAmount || seriesTargetAmount,
          date: curDateStr,
          isProjected: !isFirstOccurrence,
          isFirstOccurrence
        });
      }

      // Avançar para o próximo mês mantendo o dia pretendido
      curDate = addMonths(curDate, 1);
      try {
        const y = curDate.getFullYear();
        const m = curDate.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();
        curDate = new Date(y, m, Math.min(dayOfMonth, lastDay));
      } catch { }
    }
  }

  const allGenerated = [...uniqueEvents, ...projectedInstances];

  // Filtrar pela janela [filterStartDate, filterEndDate] se especificada
  return allGenerated.filter((ev) => {
    const isLoan = ev.category === 'parcela_emprestimo' || ev.isSystemLoanEvent || ev.category === 'amortizacao' || (ev.timelineOriginId && (String(ev.timelineOriginId).includes('loan') || String(ev.timelineOriginId).startsWith('d5e6f7a8') || String(ev.timelineOriginId).startsWith('e6f7a8b9') || String(ev.timelineOriginId).startsWith('f7a8b9c0') || String(ev.timelineOriginId).startsWith('c4d5e6f7')));
    // Eventos de empréstimos contratuais preservam o histórico completo para cálculo de amortização e dívida restante
    if (!isLoan) {
      if (filterStartDate && ev.date < filterStartDate) return false;
      if (filterEndDate && ev.date > filterEndDate) return false;
    }
    return true;
  });
}

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

    if (createdTimeboard.type === 'financeiro') {
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
    const timelines = await timelineRepository.getAll((tl) => tl.timeboardId === id);
    for (const tl of timelines) {
      await eventRepository.deleteMany((ev) => ev.timelineOriginId === tl.id || ev.sobrepositionOver);
      await loanContractRepository.deleteMany((loan) => loan.timelineId === tl.id);
      await timelineRepository.delete(tl.id);
    }
    return timeboardRepository.delete(id);
  }

  // --- Timeline Operations ---
  async getAllTimelines(query = {}) {
    const timelines = await timelineRepository.getAll();
    const allLoans = await loanContractRepository.getAll();
    const allRawEvents = await eventRepository.getAll();

    // Projetar todos os eventos com suporte aos filtros de data
    const projectedEvents = projectEvents(allRawEvents, query);

    return timelines.map((tl) => {
      const tlLoans = allLoans.filter((l) => l.timelineId === tl.id);
      // Cada timeline transporta estritamente os seus próprios eventos de origem
      const tlEvents = projectedEvents.filter((ev) => ev.timelineOriginId === tl.id);

      return {
        ...tl,
        carLoans: tlLoans,
        events: tlEvents
      };
    });
  }

  async getTimelineById(id, query = {}) {
    const timeline = await timelineRepository.getById(id);
    if (!timeline) return null;

    const loans = await loanContractRepository.findByTimelineId(id);
    const allRawEvents = await eventRepository.getAll();
    const projectedEvents = projectEvents(allRawEvents, query);

    const events = projectedEvents.filter((ev) => ev.timelineOriginId === id);

    return {
      ...timeline,
      carLoans: loans,
      events
    };
  }

  async createTimeline(data) {
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
    const allRawEvents = await eventRepository.getAll();
    const projectedEvents = projectEvents(allRawEvents, filter);

    return projectedEvents.filter((ev) => {
      if (filter.timelineOriginId && ev.timelineOriginId !== filter.timelineOriginId) return false;
      if (filter.category && ev.category !== filter.category) return false;
      return true;
    });
  }

  async createEvent(eventData) {
    const isRecurring = eventData.periodicity === 'recorrente' || eventData.isRecurring;
    const seriesId = eventData.seriesId || (isRecurring ? `series-${Date.now()}` : null);

    const payload = {
      ...eventData,
      seriesId,
      version: eventData.version !== undefined ? Number(eventData.version) : 0,
      isRecurring: Boolean(isRecurring)
    };

    return eventRepository.create(payload);
  }

  async updateEvent(id, updates) {
    const { updateScope, propagateForward, ...directUpdates } = updates;

    const allRawEvents = await eventRepository.getAll();
    const existing = await eventRepository.getById(id);

    const isLoan = directUpdates.category === 'parcela_emprestimo' ||
                   existing?.category === 'parcela_emprestimo' ||
                   directUpdates.isSystemLoanEvent ||
                   existing?.isSystemLoanEvent ||
                   (directUpdates.timelineOriginId && directUpdates.timelineOriginId.startsWith('tl-loan-')) ||
                   (existing?.timelineOriginId && existing?.timelineOriginId.startsWith('tl-loan-'));

    // --- REGRA DE EMPRÉSTIMOS ---
    // Empréstimos têm número fixo de eventos individuais (início e fim definidos).
    if (isLoan) {
      const targetDate = directUpdates.date || existing?.date;
      const loanTlId = directUpdates.timelineOriginId || existing?.timelineOriginId;

      if (updateScope === 'subsequent' || propagateForward) {
        // Alterar em lote todos os eventos subsequentes deste empréstimo
        await eventRepository.updateMany(
          (ev) => (ev.timelineOriginId === loanTlId || ev.category === 'parcela_emprestimo') &&
                  (!targetDate || ev.date >= targetDate),
          directUpdates
        );
        return existing ? eventRepository.update(id, directUpdates) : true;
      } else {
        // Alterar apenas o evento específico deste mês
        if (existing) {
          return eventRepository.update(id, directUpdates);
        } else {
          return eventRepository.create({ ...directUpdates, id });
        }
      }
    }

    // --- REGRAS DE ENTRADAS / GASTOS / RECORRENTES (Sem data de fim) ---
    const targetSeriesId = directUpdates.seriesId || updates.seriesId;

    if (targetSeriesId && directUpdates.targetAmount !== undefined && directUpdates.targetAmount !== '') {
      await eventRepository.updateMany(
        (ev) => ev.seriesId === targetSeriesId || ev.sobrepositionOver === targetSeriesId,
        { targetAmount: Number(directUpdates.targetAmount) || directUpdates.targetAmount }
      );
    }

    // Cenário 1: Alteração Única em Ocorrência de Evento Recorrente (sobrepositionOver)
    if (updateScope === 'single' && targetSeriesId) {
      const seriesVersions = allRawEvents.filter((ev) => ev.seriesId === targetSeriesId || ev.sobrepositionOver === targetSeriesId);
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);
      const nextVersion = currentHighestVersion + 1;

      const existingOverride = allRawEvents.find(
        (ev) => ev.sobrepositionOver === targetSeriesId && ev.date === directUpdates.date
      );

      if (existingOverride) {
        return eventRepository.update(existingOverride.id, {
          ...directUpdates,
          version: nextVersion,
          sobrepositionOver: targetSeriesId,
          isRecurring: false,
          periodicity: 'unico'
        });
      } else {
        return eventRepository.create({
          ...directUpdates,
          sobrepositionOver: targetSeriesId,
          version: nextVersion,
          isRecurring: false,
          periodicity: 'unico'
        });
      }
    }

    // Cenário 2: Alteração em Toda a Série (updateScope === 'all')
    if (updateScope === 'all' && targetSeriesId) {
      await eventRepository.updateMany(
        (ev) => ev.seriesId === targetSeriesId || ev.sobrepositionOver === targetSeriesId,
        directUpdates
      );
      return true;
    }

    // Cenário 3: Alteração Subsequente (Todos os meses a partir desta data -> Nova versão incremental)
    if ((updateScope === 'subsequent' || propagateForward) && targetSeriesId) {
      const seriesVersions = allRawEvents.filter((ev) => ev.seriesId === targetSeriesId && !ev.sobrepositionOver);
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);
      const nextVersion = currentHighestVersion + 1;

      const targetDate = directUpdates.date;
      await eventRepository.updateMany(
        (ev) => ev.sobrepositionOver === targetSeriesId && (!targetDate || ev.date >= targetDate),
        {
          targetAmount: directUpdates.targetAmount,
          initialInvestedAmount: directUpdates.initialInvestedAmount,
          title: directUpdates.title,
          category: directUpdates.category
        }
      );

      return eventRepository.create({
        ...directUpdates,
        seriesId: targetSeriesId,
        version: nextVersion,
        isRecurring: true,
        periodicity: 'recorrente'
      });
    }

    // Cenário 3: Atualização direta a evento existente
    if (existing) {
      return eventRepository.update(id, directUpdates);
    }

    // Se for uma ocorrência projetada sem registo direto, criar a sobreposição
    if (targetSeriesId) {
      return eventRepository.create({
        ...directUpdates,
        sobrepositionOver: targetSeriesId,
        isRecurring: false
      });
    }

    return eventRepository.create({ ...directUpdates, id });
  }

  async toggleEventPayment(id) {
    const event = await eventRepository.getById(id);
    if (event) {
      const isInvestment = event.isInvestment || event.financialType === 'investimento' || (event.category && event.category.startsWith('investimento'));
      const isIncome = event.isIncome || event.financialType === 'entrada' || (event.category && event.category.startsWith('entrada'));
      const isCompleted = !(event.status === 'Pago' || event.status === 'Recebido' || event.status === 'Investido' || event.isCompleted);
      const newStatus = isCompleted ? (isIncome ? 'Recebido' : isInvestment ? 'Investido' : 'Pago') : (isInvestment ? 'Planeado' : 'Pendente');

      return eventRepository.update(id, {
        status: newStatus,
        isCompleted
      });
    }

    // Se for uma ocorrência projetada, criar sobreposição com status alterado
    const allRaw = await eventRepository.getAll();
    const projected = projectEvents(allRaw);
    const projEv = projected.find((ev) => ev.id === id);

    if (projEv && projEv.seriesId) {
      const isInvestment = projEv.isInvestment || projEv.financialType === 'investimento' || (projEv.category && projEv.category.startsWith('investimento'));
      const isIncome = projEv.isIncome || projEv.financialType === 'entrada' || (projEv.category && projEv.category.startsWith('entrada'));
      const isCompleted = !(projEv.status === 'Pago' || projEv.status === 'Recebido' || projEv.status === 'Investido' || projEv.isCompleted);
      const newStatus = isCompleted ? (isIncome ? 'Recebido' : isInvestment ? 'Investido' : 'Pago') : (isInvestment ? 'Planeado' : 'Pendente');

      const seriesVersions = allRaw.filter((ev) => ev.seriesId === projEv.seriesId || ev.sobrepositionOver === projEv.seriesId);
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);

      return eventRepository.create({
        ...projEv,
        sobrepositionOver: projEv.seriesId,
        version: currentHighestVersion + 1,
        status: newStatus,
        isCompleted,
        isRecurring: false
      });
    }

    throw new Error(`Event not found: ${id}`);
  }

  async deleteEvent(id, options = {}) {
    const { deleteScope = 'single' } = options;
    const allRawEvents = await eventRepository.getAll();
    const directEvent = await eventRepository.getById(id);

    const isLoan = directEvent?.category === 'parcela_emprestimo' ||
                   directEvent?.isSystemLoanEvent ||
                   directEvent?.category === 'amortizacao' ||
                   directEvent?.timelineOriginId?.startsWith('tl-loan-');

    if (isLoan) {
      const targetDate = options.date || directEvent?.date;
      const loanTlId = directEvent?.timelineOriginId;

      if (deleteScope === 'subsequent') {
        await eventRepository.deleteMany((ev) => (ev.timelineOriginId === loanTlId || ev.category === 'parcela_emprestimo') && (!targetDate || ev.date >= targetDate));
        return true;
      } else if (deleteScope === 'all') {
        await eventRepository.deleteMany((ev) => ev.timelineOriginId === loanTlId || ev.id === id);
        return true;
      } else {
        return eventRepository.delete(id);
      }
    }

    const targetSeriesId = directEvent?.seriesId || directEvent?.sobrepositionOver || options.seriesId;

    // Se for para eliminar TODA a série (ou evento único direto)
    if (deleteScope === 'all' || options.deleteSeries) {
      if (targetSeriesId) {
        await eventRepository.deleteMany(
          (ev) => ev.seriesId === targetSeriesId || ev.sobrepositionOver === targetSeriesId || ev.id === id
        );
        return true;
      }
      return eventRepository.delete(id);
    }

    // Se for para eliminar SUBSEQUENTES (deste mês em diante): criar versão terminada com versão superior
    if (deleteScope === 'subsequent' && targetSeriesId) {
      const seriesVersions = allRawEvents.filter((ev) => ev.seriesId === targetSeriesId || ev.sobrepositionOver === targetSeriesId);
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);
      const nextVersion = currentHighestVersion + 1;
      const targetDate = options.date || directEvent?.date;

      await eventRepository.create({
        ...(directEvent || {}),
        seriesId: targetSeriesId,
        version: nextVersion,
        date: targetDate,
        isTerminated: true,
        isDeleted: true,
        isRecurring: true,
        periodicity: 'recorrente',
        title: directEvent?.title ? `${directEvent.title} (Encerrada)` : 'Série Encerrada'
      });
      return true;
    }

    // Se for exclusão de OCORRÊNCIA ÚNICA de série recorrente: criar tombstone com versão superior
    if (targetSeriesId) {
      const targetDate = options.date || directEvent?.date;
      const seriesVersions = allRawEvents.filter((ev) => ev.seriesId === targetSeriesId || ev.sobrepositionOver === targetSeriesId);
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);
      const nextVersion = currentHighestVersion + 1;

      const existingOverride = allRawEvents.find(
        (ev) => ev.sobrepositionOver === targetSeriesId && ev.date === targetDate
      );

      if (existingOverride) {
        return eventRepository.update(existingOverride.id, {
          isDeleted: true,
          status: 'Excluido',
          version: nextVersion
        });
      }

      await eventRepository.create({
        seriesId: targetSeriesId,
        sobrepositionOver: targetSeriesId,
        date: targetDate,
        version: nextVersion,
        isDeleted: true,
        status: 'Excluido',
        title: directEvent?.title ? `${directEvent.title} (Excluído)` : 'Ocorrência Excluída',
        isRecurring: false,
        periodicity: 'unico'
      });
      return true;
    }

    return eventRepository.delete(id);
  }

  async resetTimeline(timelineId) {
    const timeline = await timelineRepository.getById(timelineId);
    if (!timeline) return false;

    await eventRepository.deleteMany((ev) => ev.timelineOriginId === timelineId);
    return true;
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
