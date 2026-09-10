import { addDays, addMonths, addYears, format, parseISO } from 'date-fns';
import { EventStatus, EventPeriodicity, EventRecurrence, EventType } from '../../../shared/enums/index.js';

function advanceDateByPeriodicity(curDate, periodicity, dayOfMonth) {
  const p = String(periodicity || EventPeriodicity.MONTHLY).toLowerCase();
  let nextDate;
  if (p === EventPeriodicity.BIWEEKLY || p === 'quinzenal' || p === 'biweekly') {
    return addDays(curDate, 14);
  } else if (p === EventPeriodicity.BIMONTHLY || p === 'bimestral' || p === 'bimonthly' || p === 'bimounthly') {
    nextDate = addMonths(curDate, 2);
  } else if (p === EventPeriodicity.SEMIANNUAL || p === 'semestral' || p === 'biannual' || p === 'semiannual') {
    nextDate = addMonths(curDate, 6);
  } else if (p === EventPeriodicity.ANNUAL || p === 'anual' || p === 'annual') {
    nextDate = addYears(curDate, 1);
  } else {
    nextDate = addMonths(curDate, 1);
  }

  try {
    const y = nextDate.getFullYear();
    const m = nextDate.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    nextDate = new Date(y, m, Math.min(dayOfMonth, lastDay));
  } catch { }

  return nextDate;
}

/**
 * Domain Service: ProjectionEngine
 * Calculates continuous time projections for recurring and discrete financial events,
 * applying period boundaries, overrides (sobrepositionOver), and termination versions.
 */
export function projectEvents(rawEvents = [], options = {}) {
  const horizonEndDate = typeof options === 'string' ? options : (options.endDate || '2056-12-31');
  const filterStartDate = options.startDate || null;
  const filterEndDate = options.endDate || horizonEndDate;

  const rawUniqueEvents = [];
  const recurringSeriesMap = new Map(); // seriesId -> array of versions
  const overridesMap = new Map(); // `${sobrepositionOver}_${date}` -> override event

  // 1. Classify raw events
  for (const ev of rawEvents) {
    const isLoan =
      ev.category === 'parcela_emprestimo' ||
      ev.isSystemLoanEvent ||
      ev.category === 'amortizacao' ||
      (ev.timelineId && String(ev.timelineId).startsWith('tl-loan-')) ||
      (ev.timelineOriginId && String(ev.timelineOriginId).startsWith('tl-loan-'));

    const isRecurringEvent =
      !isLoan &&
      (
        ev.recurrence === EventRecurrence.RECURRING ||
        ev.recurrence === EventRecurrence.LIMITED ||
        ev.recurrence === 'recurring' ||
        ev.recurrence === 'limited' ||
        ev.isRecurring === true ||
        ev.is_recurring === true ||
        ev.periodicity === 'recorrente' ||
        ev.periodicity === 'period'
      ) &&
      ev.recurrence !== EventRecurrence.ONCE &&
      ev.recurrence !== 'once' &&
      ev.periodicity !== 'once' &&
      ev.periodicity !== 'unica';

    const seriesTargetId = ev.sobrepositionOver || (
      !isRecurringEvent && ev.eventId && rawEvents.some(r => (r.isRecurring || r.recurrence === EventRecurrence.RECURRING || r.recurrence === EventRecurrence.LIMITED || r.periodicity === 'recorrente' || r.periodicity === 'period') && (r.eventId === ev.eventId || r.id === ev.eventId)) ? ev.eventId : null
    );

    if (seriesTargetId) {
      const key = `${seriesTargetId}_${ev.date}`;
      if (!overridesMap.has(key) || Number(ev.version || 0) >= Number(overridesMap.get(key).version || 0)) {
        overridesMap.set(key, { ...ev, sobrepositionOver: seriesTargetId });
      }
    } else if (isRecurringEvent) {
      const sId = ev.eventId || ev.id;
      const normalizedEv = {
        ...ev,
        eventId: sId,
        version: ev.version !== undefined ? Number(ev.version) : 0
      };
      if (!recurringSeriesMap.has(sId)) {
        recurringSeriesMap.set(sId, []);
      }
      recurringSeriesMap.get(sId).push(normalizedEv);
    } else {
      rawUniqueEvents.push({
        ...ev,
        isFirstOccurrence: true
      });
    }
  }

  const uniqueEventsMap = new Map();
  for (const ev of rawUniqueEvents) {
    const sId = ev.eventId || ev.id;
    const evVersion = Number(ev.version !== undefined ? ev.version : (ev.eventVersion !== undefined ? ev.eventVersion : (ev.event_version || 0)));
    if (!uniqueEventsMap.has(sId)) {
      uniqueEventsMap.set(sId, ev);
    } else {
      const curVersion = Number(uniqueEventsMap.get(sId).version !== undefined ? uniqueEventsMap.get(sId).version : (uniqueEventsMap.get(sId).eventVersion !== undefined ? uniqueEventsMap.get(sId).eventVersion : (uniqueEventsMap.get(sId).event_version || 0)));
      if (evVersion >= curVersion) {
        uniqueEventsMap.set(sId, ev);
      }
    }
  }
  const uniqueEvents = Array.from(uniqueEventsMap.values())
    .filter((ev) => !ev.isDeleted && ev.status !== EventStatus.DELETED && !ev.isTerminated)
    .map((ev) => ({
      ...ev,
      isFirstOccurrence: true,
      isProjected: false
    }));

  const projectedInstances = [];

  // 2. Project each recurring series
  for (const [seriesId, versions] of recurringSeriesMap.entries()) {
    const versionsByDate = new Map();
    for (const v of versions) {
      if (!v || !v.date) continue;
      const vDate = v.date;
      if (!versionsByDate.has(vDate) || Number(v.version || 0) >= Number(versionsByDate.get(vDate).version || 0)) {
        versionsByDate.set(vDate, v);
      }
    }

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

    // A meta (targetAmount) da série de investimento deve ser sempre a da maior versão
    const sortedByVersionDesc = [...versions].sort((a, b) => {
      const vA = Number(a.version !== undefined ? a.version : (a.eventVersion !== undefined ? a.eventVersion : (a.event_version || 0)));
      const vB = Number(b.version !== undefined ? b.version : (b.eventVersion !== undefined ? b.eventVersion : (b.event_version || 0)));
      return vB - vA;
    });
    const highestVersionWithTarget = sortedByVersionDesc.find(
      (v) => v.targetAmount !== undefined && v.targetAmount !== null && Number(v.targetAmount) > 0
    );
    const seriesTargetAmount = highestVersionWithTarget
      ? highestVersionWithTarget.targetAmount
      : (sortedByVersionDesc[0]?.targetAmount ?? rootVersion.targetAmount);

    let curDate = baseDate;
    let safetyCounter = 0;

    while (curDate <= horizonDate && safetyCounter < 480) {
      safetyCounter++;
      const curDateStr = format(curDate, 'yyyy-MM-dd');
      const curMonthKey = curDateStr.substring(0, 7);

      let activeVersion = rootVersion;
      for (const v of sortedVersions) {
        if (v.date <= curDateStr) {
          activeVersion = v;
        }
      }

      const seriesEndDate =
        activeVersion.recurrenceEndDate || activeVersion.endDate || rootVersion.recurrenceEndDate || rootVersion.endDate;
      const isPeriod =
        activeVersion.recurrence === EventRecurrence.LIMITED ||
        rootVersion.recurrence === EventRecurrence.LIMITED ||
        activeVersion.periodicity === EventPeriodicity.PERIOD ||
        rootVersion.periodicity === EventPeriodicity.PERIOD ||
        Boolean(seriesEndDate);

      if (isPeriod && seriesEndDate) {
        const endMonthKey = seriesEndDate.length === 7 ? seriesEndDate : seriesEndDate.substring(0, 7);
        if (curMonthKey > endMonthKey) {
          break;
        }
      }

      if (activeVersion.isTerminated || activeVersion.isDeleted) {
        curDate = advanceDateByPeriodicity(curDate, activeVersion.periodicity || rootVersion.periodicity, dayOfMonth);
        continue;
      }

      const overrideKey = `${seriesId}_${curDateStr}`;
      let override = overridesMap.get(overrideKey);
      if (!override) {
        for (const [, ov] of overridesMap.entries()) {
          if (ov.sobrepositionOver === seriesId && ov.date?.substring(0, 7) === curMonthKey) {
            override = ov;
            break;
          }
        }
      }

      const isFirstOccurrence = curDateStr === rootVersion.date;

      if (override) {
        if (override.isDeleted || override.status === EventStatus.DELETED) {
          // Excluded (tombstone)
        } else {
          projectedInstances.push({
            ...activeVersion,
            ...override,
            targetAmount:
              override.targetAmount !== undefined && override.targetAmount !== null
                ? override.targetAmount
                : (seriesTargetAmount !== undefined && seriesTargetAmount !== null ? seriesTargetAmount : activeVersion.targetAmount),
            initialInvestedAmount:
              override.initialInvestedAmount !== undefined && override.initialInvestedAmount !== null
                ? override.initialInvestedAmount
                : (isFirstOccurrence ? (activeVersion.initialInvestedAmount || 0) : 0),
            isOverridden: true,
            sobrepositionOver: seriesId,
            isFirstOccurrence
          });
        }
      } else {
        projectedInstances.push({
          ...activeVersion,
          id: `${seriesId}_${curDateStr}`,
          eventId: seriesId,
          version: activeVersion.version,
          targetAmount: seriesTargetAmount !== undefined && seriesTargetAmount !== null ? seriesTargetAmount : activeVersion.targetAmount,
          initialInvestedAmount: isFirstOccurrence ? (activeVersion.initialInvestedAmount || 0) : 0,
          date: curDateStr,
          isProjected: !isFirstOccurrence,
          isFirstOccurrence
        });
      }

      curDate = advanceDateByPeriodicity(curDate, activeVersion.periodicity || rootVersion.periodicity, dayOfMonth);
    }
  }

  const allGenerated = [...uniqueEvents, ...projectedInstances];
  const todayStr = options.today || format(new Date(), 'yyyy-MM-dd');

  const finalEvents = allGenerated.map((ev) => {
    const isAuto = Boolean(ev.automatic !== undefined ? ev.automatic : ev.isAutomatic);
    const isCancelled = ev.status === EventStatus.CANCELLED || ev.status === 'Cancelado';
    const isDeleted = ev.status === EventStatus.DELETED || ev.status === 'Excluido';

    if (isAuto && ev.date && ev.date <= todayStr && !isCancelled && !isDeleted) {
      const isIncome = ev.eventType === EventType.INCOME;
      const isInvestment = ev.eventType === EventType.INVESTMENT;
      const isAmortization = ev.eventType === EventType.AMORTIZATION;

      let autoStatus = EventStatus.PAID;
      if (isIncome) autoStatus = EventStatus.RECEIVED;
      else if (isInvestment) autoStatus = EventStatus.INVESTED;
      else if (isAmortization) autoStatus = EventStatus.AMORTIZED;

      return {
        ...ev,
        automatic: true,
        isAutomatic: true,
        status: autoStatus,
        isCompleted: true
      };
    }
    return {
      ...ev,
      automatic: isAuto,
      isAutomatic: isAuto
    };
  });

  return finalEvents.filter((ev) => {
    if (filterStartDate && ev.date < filterStartDate) return false;
    if (filterEndDate && ev.date > filterEndDate) return false;
    return true;
  });
}
