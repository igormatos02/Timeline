import { addMonths, format, parseISO } from 'date-fns';
import { EventStatus, EventPeriodicity } from '../enums/index.js';

/**
 * Domain Service: ProjectionEngine
 * Calculates continuous time projections for recurring and discrete financial events,
 * applying period boundaries, overrides (sobrepositionOver), and termination versions.
 */
export function projectEvents(rawEvents = [], options = {}) {
  const horizonEndDate = typeof options === 'string' ? options : (options.endDate || '2056-12-31');
  const filterStartDate = options.startDate || null;
  const filterEndDate = options.endDate || horizonEndDate;

  const uniqueEvents = [];
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

    if (ev.sobrepositionOver) {
      const key = `${ev.sobrepositionOver}_${ev.date}`;
      if (!overridesMap.has(key) || Number(ev.version || 0) >= Number(overridesMap.get(key).version || 0)) {
        overridesMap.set(key, ev);
      }
    } else if (
      !isLoan &&
      (
        ev.isRecurring === true ||
        ev.periodicity === EventPeriodicity.RECURRING ||
        ev.periodicity === EventPeriodicity.PERIOD
      ) &&
      ev.periodicity !== EventPeriodicity.ONCE
    ) {
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
      uniqueEvents.push({
        ...ev,
        isFirstOccurrence: true
      });
    }
  }

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
    const seriesTargetAmount = sortedVersions.find(
      (v) => v.targetAmount !== undefined && v.targetAmount !== null && Number(v.targetAmount) > 0
    )?.targetAmount;

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
        curDate = addMonths(curDate, 1);
        try {
          const y = curDate.getFullYear();
          const m = curDate.getMonth();
          const lastDay = new Date(y, m + 1, 0).getDate();
          curDate = new Date(y, m, Math.min(dayOfMonth, lastDay));
        } catch {}
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
                : activeVersion.targetAmount || seriesTargetAmount,
            initialInvestedAmount:
              override.initialInvestedAmount !== undefined && override.initialInvestedAmount !== null
                ? override.initialInvestedAmount
                : activeVersion.initialInvestedAmount,
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
          targetAmount: activeVersion.targetAmount || seriesTargetAmount,
          date: curDateStr,
          isProjected: !isFirstOccurrence,
          isFirstOccurrence
        });
      }

      curDate = addMonths(curDate, 1);
      try {
        const y = curDate.getFullYear();
        const m = curDate.getMonth();
        const lastDay = new Date(y, m + 1, 0).getDate();
        curDate = new Date(y, m, Math.min(dayOfMonth, lastDay));
      } catch {}
    }
  }

  const allGenerated = [...uniqueEvents, ...projectedInstances];
  const todayStr = options.today || format(new Date(), 'yyyy-MM-dd');

  const finalEvents = allGenerated.map((ev) => {
    const isAuto = Boolean(ev.automatic !== undefined ? ev.automatic : ev.isAutomatic);
    const isCancelled = ev.status === EventStatus.CANCELLED || ev.status === 'Cancelado';
    const isDeleted = ev.status === EventStatus.DELETED || ev.status === 'Excluido';

    if (isAuto && ev.date && ev.date <= todayStr && !isCancelled && !isDeleted) {
      const isIncome = ev.financialType === 'income' || ev.financialType === 'entrada' || ev.isIncome || ev.category?.startsWith('entrada');
      const isInvestment = ev.financialType === 'investment' || ev.financialType === 'investimento' || ev.isInvestment || ev.category?.startsWith('investimento');
      const isAmortization = ev.financialType === 'amortization' || ev.financialType === 'amortizacao' || ev.category === 'amortizacao';

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
    const isLoan =
      ev.category === 'parcela_emprestimo' ||
      ev.isSystemLoanEvent ||
      ev.category === 'amortizacao' ||
      (ev.timelineId &&
        (String(ev.timelineId).includes('loan') ||
          String(ev.timelineId).startsWith('d5e6f7a8') ||
          String(ev.timelineId).startsWith('e6f7a8b9') ||
          String(ev.timelineId).startsWith('f7a8b9c0') ||
          String(ev.timelineId).startsWith('c4d5e6f7'))) ||
      (ev.timelineOriginId &&
        (String(ev.timelineOriginId).includes('loan') ||
          String(ev.timelineOriginId).startsWith('d5e6f7a8') ||
          String(ev.timelineOriginId).startsWith('e6f7a8b9') ||
          String(ev.timelineOriginId).startsWith('f7a8b9c0') ||
          String(ev.timelineOriginId).startsWith('c4d5e6f7')));

    if (!isLoan) {
      if (filterStartDate && ev.date < filterStartDate) return false;
      if (filterEndDate && ev.date > filterEndDate) return false;
    }
    return true;
  });
}
