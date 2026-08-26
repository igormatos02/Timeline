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
  const horizonEndDate = typeof options === 'string' ? options : (options.endDate || '2056-12-31');
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

    while (curDate <= horizonDate && safetyCounter < 480) {
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

      // Se a versão ativa ou root tiver periodicidade 'periodo' com data de fim:
      const seriesEndDate = activeVersion.recurrenceEndDate || activeVersion.endDate || rootVersion.recurrenceEndDate || rootVersion.endDate;
      const isPeriodo = activeVersion.periodicity === 'periodo' || rootVersion.periodicity === 'periodo' || Boolean(seriesEndDate);

      if (isPeriodo && seriesEndDate) {
        const endMonthKey = seriesEndDate.length === 7 ? seriesEndDate : seriesEndDate.substring(0, 7);
        if (curMonthKey > endMonthKey) {
          break; // Atingiu o mês de fim definido pelo usuário no período!
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

  async resetTimeline(timelineId) {
    const timeline = await timelineRepository.getById(timelineId);
    if (!timeline) return false;

    await eventRepository.deleteMany((ev) => ev.timelineOriginId === timelineId);
    return true;
  }
}

export const timelineService = new TimelineService();
