import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { loanContractRepository } from '../../infrastructure/database/json/JsonLoanContractRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';
import { EventStatus, EventPeriodicity, AmortizationStrategy } from '../../domain/enums/index.js';

export class EventService {
  async getAllEvents(filter = {}) {
    const allRawEvents = await eventRepository.getAll();
    const projectedEvents = projectEvents(allRawEvents, filter);

    return projectedEvents.filter((ev) => {
      if (filter.timeboardId && ev.timeboardId && ev.timeboardId !== filter.timeboardId) return false;
      if (filter.timelineId && ev.timelineId !== filter.timelineId) return false;
      if (filter.timelineOriginId && ev.timelineOriginId !== filter.timelineOriginId) return false;
      if (filter.financialType && ev.financialType !== filter.financialType) return false;
      if (filter.category && ev.category !== filter.category) return false;
      return true;
    });
  }

  async createEvent(eventData) {
    const isRecurring = eventData.periodicity === EventPeriodicity.RECURRING || eventData.isRecurring;
    const eventId = eventData.eventId || eventData.event_id || (isRecurring ? `series-${Date.now()}` : null);

    const payload = {
      ...eventData,
      timelineId: eventData.timelineId || eventData.timelineOriginId || null,
      timelineOriginId: eventData.timelineId || eventData.timelineOriginId || null,
      timeboardId: eventData.timeboardId || '5fcd8a1a-eac7-4405-9c8b-b9607e70b420',
      eventId,
      version: eventData.version !== undefined ? Number(eventData.version) : 0,
      isRecurring: Boolean(isRecurring)
    };

    const created = await eventRepository.create(payload);

    if (created.isAmortizationEvent?.() || payload.isAmortization || payload.category === 'amortizacao') {
      if (payload.status === EventStatus.AMORTIZED || payload.status === EventStatus.COMPLETED || payload.isCompleted) {
        await this.processLoanAmortization(created);
      }
    }

    return created;
  }

  async updateEvent(id, updates) {
    const { updateScope, propagateForward, ...directUpdates } = updates;

    const allRawEvents = await eventRepository.getAll();
    const existing = await eventRepository.getById(id);

    const isLoan =
      directUpdates.category === 'parcela_emprestimo' ||
      existing?.category === 'parcela_emprestimo' ||
      directUpdates.isSystemLoanEvent ||
      existing?.isSystemLoanEvent ||
      directUpdates.timelineOriginId?.startsWith('tl-loan-') ||
      existing?.timelineOriginId?.startsWith('tl-loan-') ||
      Boolean(directUpdates.timelineId || existing?.timelineId);

    const loanTlId = directUpdates.timelineId || directUpdates.timelineOriginId || existing?.timelineId || existing?.timelineOriginId;
    const targetSeriesId = directUpdates.eventId || directUpdates.event_id || updates.eventId || (isLoan ? loanTlId : (existing?.eventId || id));
    const isAmountOrDateChange =
      (directUpdates.amount !== undefined && existing && Number(directUpdates.amount) !== Number(existing.amount)) ||
      (directUpdates.date !== undefined && existing && directUpdates.date !== existing.date) ||
      (directUpdates.dayOfMonth !== undefined && existing && Number(directUpdates.dayOfMonth) !== Number(existing.dayOfMonth));

    // 1. Direct Series-Wide Automatic Toggle (when toggling automatic specifically without value/date change)
    if (!isAmountOrDateChange && (updateScope === 'all_series' || (directUpdates.automatic !== undefined && directUpdates.amount === undefined && directUpdates.date === undefined))) {
      const matchKey = targetSeriesId || loanTlId || id;
      await eventRepository.updateMany(
        (ev) =>
          (matchKey && (
            ev.eventId === matchKey ||
            ev.id === matchKey ||
            ev.sobrepositionOver === matchKey ||
            ev.timelineId === matchKey ||
            ev.timelineOriginId === matchKey
          )) ||
          (loanTlId && (ev.timelineId === loanTlId || ev.timelineOriginId === loanTlId)),
        {
          automatic: Boolean(directUpdates.automatic),
          isAutomatic: Boolean(directUpdates.automatic)
        }
      );

      if (existing) {
        await eventRepository.update(id, {
          automatic: Boolean(directUpdates.automatic),
          isAutomatic: Boolean(directUpdates.automatic),
          status: directUpdates.status || existing.status,
          isCompleted: directUpdates.isCompleted !== undefined ? directUpdates.isCompleted : existing.isCompleted
        });
      }
      return true;
    }

    if (isLoan && (directUpdates.category === 'parcela_emprestimo' || existing?.category === 'parcela_emprestimo')) {
      const targetDate = directUpdates.date || existing?.date;

      if (updateScope === 'subsequent' || propagateForward) {
        await eventRepository.updateMany(
          (ev) =>
            ((loanTlId && (ev.timelineId === loanTlId || ev.timelineOriginId === loanTlId)) || ev.category === 'parcela_emprestimo') &&
            (!targetDate || ev.date >= targetDate),
          directUpdates
        );
        return existing ? eventRepository.update(id, directUpdates) : true;
      } else {
        if (existing) return eventRepository.update(id, directUpdates);
        else return eventRepository.create({ ...directUpdates, id });
      }
    }

    if (updateScope === 'all_series' || updateScope === 'all') {
      if (targetSeriesId) {
        await eventRepository.updateMany(
          (ev) =>
            ev.eventId === targetSeriesId ||
            ev.id === targetSeriesId ||
            ev.sobrepositionOver === targetSeriesId ||
            (ev.timelineId && ev.timelineId === targetSeriesId),
          directUpdates
        );
      }
      if (existing) {
        await eventRepository.update(id, directUpdates);
      }
      return true;
    }

    if (updateScope === 'single' && targetSeriesId) {
      const seriesVersions = allRawEvents.filter(
        (ev) => ev.eventId === targetSeriesId || ev.sobrepositionOver === targetSeriesId
      );
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
          periodicity: EventPeriodicity.ONCE
        });
      } else {
        const { id: _oldId, ...cleanOverrideData } = directUpdates;
        return eventRepository.create({
          ...cleanOverrideData,
          sobrepositionOver: targetSeriesId,
          version: nextVersion,
          isRecurring: false,
          periodicity: EventPeriodicity.ONCE
        });
      }
    }

    if (updateScope === 'all' && targetSeriesId) {
      await eventRepository.updateMany(
        (ev) => ev.eventId === targetSeriesId || ev.sobrepositionOver === targetSeriesId,
        directUpdates
      );
      return true;
    }

    if ((updateScope === 'subsequent' || propagateForward) && targetSeriesId) {
      const seriesVersions = allRawEvents.filter((ev) => ev.eventId === targetSeriesId && !ev.sobrepositionOver);
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

      const { id: _oldId, ...cleanVersionData } = directUpdates;
      return eventRepository.create({
        ...cleanVersionData,
        eventId: targetSeriesId,
        version: nextVersion,
        isRecurring: true,
        periodicity: EventPeriodicity.RECURRING
      });
    }

    if (existing) return eventRepository.update(id, directUpdates);
    if (targetSeriesId)
      return eventRepository.create({ ...directUpdates, sobrepositionOver: targetSeriesId, isRecurring: false });
    return eventRepository.create({ ...directUpdates, id });
  }

  async toggleEventPayment(id) {
    const event = await eventRepository.getById(id);
    if (event) {
      const toggled = event.getToggledStatus ? event.getToggledStatus() : { status: EventStatus.PAID, isCompleted: true };
      const updated = await eventRepository.update(id, toggled);

      if (event.isAmortizationEvent?.() || event.category === 'amortizacao') {
        if (toggled.isCompleted) {
          await this.processLoanAmortization({ ...event, ...toggled });
        } else {
          await this.rollbackLoanAmortization(event);
        }
      }

      return updated;
    }

    const allRaw = await eventRepository.getAll();
    const projected = projectEvents(allRaw);
    const projEv = projected.find((ev) => ev.id === id);

    if (projEv && projEv.eventId) {
      const toggled = projEv.getToggledStatus ? projEv.getToggledStatus() : { status: EventStatus.PAID, isCompleted: true };
      const seriesVersions = allRaw.filter(
        (ev) => ev.eventId === projEv.eventId || ev.sobrepositionOver === projEv.eventId
      );
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);

      return eventRepository.create({
        ...projEv,
        sobrepositionOver: projEv.eventId,
        version: currentHighestVersion + 1,
        ...toggled,
        isRecurring: false
      });
    }

    throw new Error(`Event not found: ${id}`);
  }

  async deleteEvent(id, options = {}) {
    const { deleteScope = 'single' } = options;
    const allRawEvents = await eventRepository.getAll();
    const directEvent = await eventRepository.getById(id);

    if (directEvent?.isAmortizationEvent?.() || directEvent?.category === 'amortizacao') {
      await this.rollbackLoanAmortization(directEvent);
      return eventRepository.delete(id);
    }

    const isLoan =
      directEvent?.category === 'parcela_emprestimo' ||
      directEvent?.isSystemLoanEvent ||
      directEvent?.timelineOriginId?.startsWith('tl-loan-');
    if (isLoan) return eventRepository.delete(id);

    const targetSeriesId = directEvent?.eventId || directEvent?.event_id || directEvent?.sobrepositionOver || options.eventId;

    if (deleteScope === 'all' || options.deleteSeries) {
      if (targetSeriesId) {
        await eventRepository.deleteMany(
          (ev) => ev.eventId === targetSeriesId || ev.sobrepositionOver === targetSeriesId || ev.id === id
        );
        return true;
      }
      return eventRepository.delete(id);
    }

    if (deleteScope === 'subsequent' && targetSeriesId) {
      const seriesVersions = allRawEvents.filter(
        (ev) => ev.eventId === targetSeriesId || ev.sobrepositionOver === targetSeriesId
      );
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);
      const targetDate = options.date || directEvent?.date;

      await eventRepository.create({
        ...(directEvent || {}),
        eventId: targetSeriesId,
        version: currentHighestVersion + 1,
        date: targetDate,
        isTerminated: true,
        isDeleted: true,
        isRecurring: true,
        periodicity: EventPeriodicity.RECURRING,
        title: directEvent?.title ? `${directEvent.title} (Encerrada)` : 'Série Encerrada'
      });
      return true;
    }

    if (targetSeriesId) {
      const targetDate = options.date || directEvent?.date;
      const seriesVersions = allRawEvents.filter(
        (ev) => ev.eventId === targetSeriesId || ev.sobrepositionOver === targetSeriesId
      );
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version || 0)), 0);
      const nextVersion = currentHighestVersion + 1;

      const existingOverride = allRawEvents.find(
        (ev) => ev.sobrepositionOver === targetSeriesId && ev.date === targetDate
      );
      if (existingOverride) {
        return eventRepository.update(existingOverride.id, { isDeleted: true, status: EventStatus.DELETED, version: nextVersion });
      }
      await eventRepository.create({
        eventId: targetSeriesId,
        sobrepositionOver: targetSeriesId,
        date: targetDate,
        version: nextVersion,
        isDeleted: true,
        status: EventStatus.DELETED,
        title: directEvent?.title ? `${directEvent.title} (Excluído)` : 'Ocorrência Excluída',
        isRecurring: false,
        periodicity: EventPeriodicity.ONCE
      });
      return true;
    }

    return eventRepository.delete(id);
  }

  async processLoanAmortization(amortEvent) {
    const amortVal = Number(amortEvent.amount || amortEvent.amortizationAmount || 0);
    if (isNaN(amortVal) || amortVal <= 0) return;

    const loanTlId = amortEvent.timelineId || amortEvent.timelineOriginId;
    const amortDate = amortEvent.date;
    const strategy = amortEvent.strategy || AmortizationStrategy.REDUCE_TERM;

    const rawEvents = await eventRepository._readAllRaw();
    const loanInstallments = rawEvents.filter(
      (ev) =>
        ((loanTlId && (ev.timelineId === loanTlId || ev.timelineOriginId === loanTlId)) ||
          (ev.category === 'parcela_emprestimo' && ev.timelineOriginName === amortEvent.timelineOriginName)) &&
        ev.category === 'parcela_emprestimo'
    );
    if (loanInstallments.length === 0) return;

    const now = new Date().toISOString();

    function extractInstallmentPrincipal(inst) {
      if (inst.principalAmount !== undefined && Number(inst.principalAmount) > 0) return Number(inst.principalAmount);
      if (inst.description) {
        const match = inst.description.match(/\(([\d\s.,]+)\s*€?\s*capital/i);
        if (match && match[1]) {
          const parsed = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
          if (!isNaN(parsed) && parsed > 0) return parsed;
        }
      }
      const total = Number(inst.amount || 0);
      const interest = Number(inst.interestPortion || 0);
      if (interest > 0 && interest < total) return Math.round((total - interest) * 100) / 100;
      return Math.max(1, Math.round(total * 0.85 * 100) / 100);
    }

    if (strategy === AmortizationStrategy.REDUCE_TERM) {
      const futureUnpaid = loanInstallments
        .filter((ev) => ev.status !== EventStatus.PAID && ev.status !== 'Abatida' && !ev.isAbatida && ev.date >= amortDate)
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      let remainingToDeduct = amortVal;
      const updatesMap = new Map();

      for (let i = futureUnpaid.length - 1; i >= 0; i--) {
        if (remainingToDeduct <= 0) break;
        const inst = futureUnpaid[i];
        const instPrincipal = extractInstallmentPrincipal(inst);

        if (remainingToDeduct >= instPrincipal) {
          updatesMap.set(inst.id, {
            status: 'Abatida',
            isAbatida: true,
            isCompleted: true,
            originalAmount: inst.amount || instPrincipal,
            amount: 0,
            principalAmount: 0,
            interestPortion: 0,
            labels: Array.from(new Set([...(inst.labels || []), 'Abatida'])),
            updatedAt: now
          });
          remainingToDeduct -= instPrincipal;
        } else {
          const newPrincipal = Math.max(0, Math.round((instPrincipal - remainingToDeduct) * 100) / 100);
          const interestPortion = Number(inst.interestPortion || 0);
          updatesMap.set(inst.id, {
            amount: Math.round((newPrincipal + interestPortion) * 100) / 100,
            principalAmount: newPrincipal,
            labels: Array.from(new Set([...(inst.labels || []), 'Abatida Parcial'])),
            updatedAt: now
          });
          remainingToDeduct = 0;
        }
      }

      if (updatesMap.size > 0) {
        const updatedAll = rawEvents.map((ev) => (updatesMap.has(ev.id) ? { ...ev, ...updatesMap.get(ev.id) } : ev));
        await eventRepository._writeAllRaw(updatedAll);
      }
    } else {
      const futureUnpaid = loanInstallments.filter(
        (ev) => ev.status !== EventStatus.PAID && ev.status !== 'Abatida' && !ev.isAbatida && ev.date >= amortDate
      );
      if (futureUnpaid.length > 0) {
        let currentRemainingDebt = 13259.93;
        try {
          const loan = await loanContractRepository.getById(loanTlId);
          if (loan && loan.remainingDebt) currentRemainingDebt = Number(loan.remainingDebt);
        } catch {}

        const originalInstallment = Number(futureUnpaid[0].originalAmount || futureUnpaid[0].amount || 218.47);
        const newFuturePrincipal = Math.max(0, currentRemainingDebt - amortVal);
        const reductionRatio = currentRemainingDebt > 0 ? newFuturePrincipal / currentRemainingDebt : 1;
        const newTotal = Math.max(1, Math.round(originalInstallment * reductionRatio * 100) / 100);

        const futureIds = new Set(futureUnpaid.map((e) => e.id));
        const updatedAll = rawEvents.map((ev) => {
          if (futureIds.has(ev.id)) {
            const origAmt = Number(ev.originalAmount || ev.amount || originalInstallment);
            const origCap = Number(ev.principalAmount || Math.round(origAmt * 0.82 * 100) / 100);
            const origJur = Number(ev.interestPortion || Math.round(origAmt * 0.18 * 100) / 100);
            return {
              ...ev,
              originalAmount: origAmt,
              amount: newTotal,
              principalAmount: Math.round(origCap * reductionRatio * 100) / 100,
              interestPortion: Math.round(origJur * reductionRatio * 100) / 100,
              updatedAt: now
            };
          }
          return ev;
        });
        await eventRepository._writeAllRaw(updatedAll);
      }
    }

    try {
      if (loanTlId) {
        const loan = await loanContractRepository.getById(loanTlId);
        if (loan) {
          const changes = loan.applyAmortization ? loan.applyAmortization(amortVal) : {
            remainingDebt: Math.max(0, loan.remainingDebt - amortVal),
            amortizedCapital: (loan.amortizedCapital || 0) + amortVal
          };
          await loanContractRepository.update(loan.id, changes);
        }
        const tl = await timelineRepository.getById(loanTlId);
        if (tl) {
          await timelineRepository.update(tl.id, {
            remainingDebt: Math.max(0, Math.round((Number(tl.remainingDebt || tl.totalDebt) - amortVal) * 100) / 100),
            amortizedCapital: Math.round(((Number(tl.amortizedCapital) || 0) + amortVal) * 100) / 100
          });
        }
      }
    } catch (e) {
      console.error('Error updating loan remaining debt:', e);
    }
  }

  async rollbackLoanAmortization(amortEvent) {
    const amortVal = Number(amortEvent.amount || amortEvent.amortizationAmount || 0);
    const loanTlId = amortEvent.timelineId || amortEvent.timelineOriginId;
    const rawEvents = await eventRepository._readAllRaw();
    const now = new Date().toISOString();

    let defaultInstallmentAmount = 218.47;
    try {
      if (loanTlId) {
        const loan = await loanContractRepository.getById(loanTlId);
        if (loan && loan.installmentAmount) defaultInstallmentAmount = Number(loan.installmentAmount);
      }
    } catch {}

    const updatedEvents = rawEvents.map((ev) => {
      if (
        ((loanTlId && (ev.timelineId === loanTlId || ev.timelineOriginId === loanTlId)) ||
          (ev.category === 'parcela_emprestimo' && ev.timelineOriginName === amortEvent.timelineOriginName)) &&
        ev.category === 'parcela_emprestimo' &&
        ev.status !== EventStatus.PAID
      ) {
        let cap = 0,
          jur = 0;
        if (ev.description) {
          const match = ev.description.match(/\(([\d\s.,]+)\s*€?\s*capital\s*\+\s*([\d\s.,]+)\s*€?\s*juros/i);
          if (match && match[1] && match[2]) {
            cap = parseFloat(match[1].replace(/\s/g, '').replace(',', '.'));
            jur = parseFloat(match[2].replace(/\s/g, '').replace(',', '.'));
          }
        }
        const origAmt = Number(ev.originalAmount || defaultInstallmentAmount);
        const filteredLabels = (ev.labels || []).filter((l) => l !== 'Abatida' && l !== 'Abatida Parcial');
        return {
          ...ev,
          status: EventStatus.PENDING,
          isAbatida: false,
          isCompleted: false,
          amount: origAmt,
          principalAmount: cap || Math.round(origAmt * 0.82 * 100) / 100,
          interestPortion: jur || Math.round(origAmt * 0.18 * 100) / 100,
          labels: filteredLabels.length > 0 ? filteredLabels : [amortEvent.timelineOriginName || 'Empréstimo', EventStatus.PENDING],
          updatedAt: now
        };
      }
      return ev;
    });
    await eventRepository._writeAllRaw(updatedEvents);

    try {
      if (loanTlId) {
        const loan = await loanContractRepository.getById(loanTlId);
        if (loan) {
          const changes = loan.rollbackAmortization ? loan.rollbackAmortization(amortVal) : {
            remainingDebt: Math.round(((Number(loan.remainingDebt || loan.totalDebt)) + amortVal) * 100) / 100,
            amortizedCapital: Math.max(0, Math.round(((Number(loan.amortizedCapital) || 0) - amortVal) * 100) / 100)
          };
          await loanContractRepository.update(loan.id, changes);
        }
        const tl = await timelineRepository.getById(loanTlId);
        if (tl) {
          await timelineRepository.update(tl.id, {
            remainingDebt: Math.round(((Number(tl.remainingDebt || tl.totalDebt)) + amortVal) * 100) / 100,
            amortizedCapital: Math.max(0, Math.round(((Number(tl.amortizedCapital) || 0) - amortVal) * 100) / 100)
          });
        }
      }
    } catch (e) {
      console.error('Error rolling back loan remaining debt:', e);
    }
  }
}

function hasEventMeaningfullyChanged(base, updates) {
  if (!base) return true;
  if (updates.title !== undefined && (updates.title ?? '').trim() !== (base.title ?? '').trim()) return true;
  if (updates.amount !== undefined && Number(updates.amount || 0) !== Number(base.amount || 0)) return true;
  if (
    updates.initialInvestedAmount !== undefined &&
    Number(updates.initialInvestedAmount || 0) !== Number(base.initialInvestedAmount || 0)
  )
    return true;
  if (updates.targetAmount !== undefined && Number(updates.targetAmount || 0) !== Number(base.targetAmount || 0))
    return true;
  if (updates.category !== undefined && updates.category !== base.category) return true;
  if (updates.financialType !== undefined && updates.financialType !== base.financialType) return true;
  if (updates.status !== undefined && updates.status !== base.status) return true;
  if (updates.priority !== undefined && updates.priority !== base.priority) return true;
  if (updates.time !== undefined && updates.time !== base.time) return true;
  if (updates.description !== undefined && (updates.description ?? '').trim() !== (base.description ?? '').trim())
    return true;
  if (updates.dayOfMonth !== undefined && Number(updates.dayOfMonth) !== Number(base.dayOfMonth)) return true;
  if (updates.isCompleted !== undefined && Boolean(updates.isCompleted) !== Boolean(base.isCompleted)) return true;
  if (updates.isLocked !== undefined && Boolean(updates.isLocked) !== Boolean(base.isLocked)) return true;
  if (updates.automatic !== undefined && Boolean(updates.automatic) !== Boolean(base.automatic ?? base.isAutomatic)) return true;
  if (updates.isAutomatic !== undefined && Boolean(updates.isAutomatic) !== Boolean(base.automatic ?? base.isAutomatic)) return true;
  if (updates.periodicity !== undefined && updates.periodicity !== base.periodicity) return true;
  if (updates.recurrenceEndDate !== undefined && updates.recurrenceEndDate !== base.recurrenceEndDate) return true;
  if (updates.endDate !== undefined && updates.endDate !== base.endDate) return true;
  if (
    updates.breakdownItems !== undefined &&
    JSON.stringify(base.breakdownItems || []) !== JSON.stringify(updates.breakdownItems || [])
  )
    return true;
  if (
    updates.labels !== undefined &&
    JSON.stringify([...(base.labels || [])].sort()) !== JSON.stringify([...(updates.labels || [])].sort())
  )
    return true;
  return false;
}

export const eventService = new EventService();
