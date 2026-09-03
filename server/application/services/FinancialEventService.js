import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { financialEventStatusRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventStatusRepository.js';
import { loanContractRepository } from '../../infrastructure/database/json/JsonLoanContractRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';
import { calcToggledStatus } from '../../domain/entities/TimelineEvent.js';
import { EventType, EventStatus, EventPeriodicity, AmortizationStrategy, isPositiveStatus, isNegativeStatus } from '../../../shared/enums/index.js';

export class FinancialEventService {
  async _syncStatus(date, eventId, status, options = {}) {
    if (!date || !eventId || !status) return;
    const dateStr = String(date);
    if (dateStr.length < 7) return;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(5, 7), 10);
    if (isNaN(year) || isNaN(month)) return;

    if (isPositiveStatus(status)) {
      await financialEventStatusRepository.upsertStatus(year, month, eventId, status, options);
    } else if (isNegativeStatus(status)) {
      await financialEventStatusRepository.deleteStatus(year, month, eventId);
    }
  }

  async getAllEvents(filter = {}) {
    const rawEvents = await eventRepository.getAll();
    const projectedEvents = projectEvents(rawEvents);

    const statusMap = await financialEventStatusRepository.getStatusMap();
    for (const ev of projectedEvents) {
      const dateStr = ev.date ? String(ev.date) : '';
      if (dateStr.length >= 7) {
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(5, 7), 10);
        const targetId = ev.eventId || ev.id;
        const key = `${year}_${month}_${targetId}`;
        const keyById = `${year}_${month}_${ev.id}`;
        const matchedStatus = statusMap.get(key) || statusMap.get(keyById);
        if (matchedStatus) {
          ev.status = matchedStatus;
          ev.isCompleted = isPositiveStatus(matchedStatus);
        } else {
          ev.status = EventStatus.PENDING;
          ev.isCompleted = false;
        }
      } else {
        ev.status = EventStatus.PENDING;
        ev.isCompleted = false;
      }
    }

    return projectedEvents.filter((ev) => {
      if (filter.timeboardId && ev.timeboardId && ev.timeboardId !== filter.timeboardId) return false;
      if (filter.timelineId && ev.timelineId !== filter.timelineId && ev.timelineOriginId !== filter.timelineId) return false;
      if (filter.timelineOriginId && ev.timelineOriginId !== filter.timelineOriginId) return false;
      if (filter.eventType && ev.eventType !== filter.eventType) return false;
      if (filter.status && ev.status !== filter.status) return false;
      if (filter.startDate && ev.date < filter.startDate) return false;
      if (filter.endDate && ev.date > filter.endDate) return false;
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
      timeboardId: eventData.timeboardId || null,
      eventId,
      version: eventData.version !== undefined ? Number(eventData.version) : 0,
      isRecurring: Boolean(isRecurring)
    };

    const created = await eventRepository.create(payload);

    if (payload.status && payload.date) {
      await this._syncStatus(payload.date, created.eventId || created.id, payload.status, {
        timelineId: created.timelineId || created.timeline_id || payload.timelineId || payload.timeline_id,
        timeboardId: created.timeboardId || created.timeboard_id || payload.timeboardId || payload.timeboard_id
      });
    }

    if (created.isAmortizationEvent?.() || created.eventType === EventType.AMORTIZATION) {
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

    const loanTlId = directUpdates.timelineId || directUpdates.timelineOriginId || existing?.timelineId || existing?.timelineOriginId;
    const isLoan = Boolean(loanTlId && (directUpdates.isLoanEvent?.() || existing?.isLoanEvent?.() || directUpdates.isSystemLoanEvent || existing?.isSystemLoanEvent || directUpdates.eventType === EventType.AMORTIZATION || existing?.eventType === EventType.AMORTIZATION));

    const targetSeriesId = directUpdates.eventId || directUpdates.event_id || updates.eventId || (isLoan ? loanTlId : (existing?.eventId || id));
    const isAmountOrDateChange =
      (directUpdates.amount !== undefined && existing && Number(directUpdates.amount) !== Number(existing.amount)) ||
      (directUpdates.date !== undefined && existing && directUpdates.date !== existing.date) ||
      (directUpdates.dayOfMonth !== undefined && existing && Number(directUpdates.dayOfMonth) !== Number(existing.dayOfMonth));

    if (directUpdates.status) {
      const targetDate = directUpdates.date || existing?.date;
      await this._syncStatus(targetDate, targetSeriesId, directUpdates.status, {
        timelineId: directUpdates.timelineId || directUpdates.timeline_id || existing?.timelineId || existing?.timeline_id,
        timeboardId: directUpdates.timeboardId || directUpdates.timeboard_id || existing?.timeboardId || existing?.timeboard_id
      });
    }

    // Direct Series-Wide Automatic Toggle
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
          isCompleted: directUpdates.isCompleted !== undefined ? directUpdates.isCompleted : existing.isCompleted
        });
      }
      return true;
    }

    if (isLoan) {
      const targetDate = directUpdates.date || existing?.date;

      if (updateScope === 'subsequent' || propagateForward) {
        await eventRepository.updateMany(
          (ev) =>
            (loanTlId && (ev.timelineId === loanTlId || ev.timelineOriginId === loanTlId)) &&
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
      const isAmountOrDateExplicit = directUpdates.amount !== undefined || directUpdates.date !== undefined;
      if (!isAmountOrDateExplicit && directUpdates.status) {
        return true;
      }

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
      } else if (isAmountOrDateExplicit) {
        const { id: _oldId, ...cleanOverrideData } = directUpdates;
        return eventRepository.create({
          ...cleanOverrideData,
          sobrepositionOver: targetSeriesId,
          version: nextVersion,
          isRecurring: false,
          periodicity: EventPeriodicity.ONCE
        });
      }
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
          eventType: directUpdates.eventType
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
    if (targetSeriesId && (directUpdates.amount !== undefined || directUpdates.date !== undefined))
      return eventRepository.create({ ...directUpdates, sobrepositionOver: targetSeriesId, isRecurring: false });
    return true;
  }

  async toggleEventPayment(id) {
    const allEvents = await this.getAllEvents();
    const targetEvent = allEvents.find((e) => e.id === id || e.eventId === id || e.sobrepositionOver === id);

    if (!targetEvent) {
      throw new Error(`Event not found: ${id}`);
    }

    const toggled = calcToggledStatus(targetEvent);
    const targetEventId = targetEvent.eventId || targetEvent.id;
    const targetDate = targetEvent.date;

    await this._syncStatus(targetDate, targetEventId, toggled.status, {
      timelineId: targetEvent.timelineId || targetEvent.timeline_id,
      timeboardId: targetEvent.timeboardId || targetEvent.timeboard_id
    });

    if (targetEvent.isAmortizationEvent?.() || targetEvent.eventType === EventType.AMORTIZATION) {
      if (toggled.isCompleted) {
        await this.processLoanAmortization({ ...targetEvent, ...toggled });
      } else {
        await this.rollbackLoanAmortization(targetEvent);
      }
    }

    return { ...targetEvent, ...toggled };
  }

  async deleteEvent(id, options = {}) {
    const { deleteScope = 'single' } = options;
    const allRawEvents = await eventRepository.getAll();
    const directEvent = await eventRepository.getById(id);

    if (directEvent?.isAmortizationEvent?.() || directEvent?.eventType === EventType.AMORTIZATION) {
      await this.rollbackLoanAmortization(directEvent);
      return eventRepository.delete(id);
    }

    const isLoan =
      directEvent?.isLoanEvent?.() ||
      directEvent?.isSystemLoanEvent ||
      directEvent?.eventType === EventType.AMORTIZATION;
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

    const loanTimelineId = amortEvent.timelineId || amortEvent.timelineOriginId;
    if (!loanTimelineId) return;

    const amortDate = amortEvent.date;
    const strategy = amortEvent.strategy || amortEvent.amortizationStrategy || AmortizationStrategy.REDUCE_TERM;

    const allEvents = await eventRepository.getAll();
    const loanInstallments = allEvents.filter(
      (ev) =>
        (ev.timelineId === loanTimelineId || ev.timelineOriginId === loanTimelineId) &&
        !ev.isAmortizationEvent?.() &&
        ev.eventType !== EventType.AMORTIZATION &&
        !ev.isAmortization
    );
    if (loanInstallments.length === 0) return;

    const now = new Date().toISOString();

    function extractInstallmentPrincipal(inst) {
      if (inst.principalAmount !== undefined && Number(inst.principalAmount) > 0) return Number(inst.principalAmount);
      const total = Number(inst.amount || 0);
      const interest = Number(inst.interestPortion || inst.interestAmount || 0);
      if (interest > 0 && interest < total) return Math.round((total - interest) * 100) / 100;
      return Math.max(1, Math.round(total * 0.82 * 100) / 100);
    }

    if (strategy === AmortizationStrategy.REDUCE_TERM || strategy === 'reduce_term') {
      const futureUnpaid = loanInstallments
        .filter((ev) => ev.status !== EventStatus.PAID && ev.status !== EventStatus.COMPLETED && !ev.isCompleted && ev.status !== 'Abatida' && !ev.isAbatida && ev.date >= amortDate)
        .sort((a, b) => (a.date > b.date ? 1 : -1));

      let remainingToDeduct = amortVal;
      const updates = [];

      for (let i = futureUnpaid.length - 1; i >= 0; i--) {
        if (remainingToDeduct <= 0) break;
        const inst = futureUnpaid[i];
        const instPrincipal = extractInstallmentPrincipal(inst);

        if (remainingToDeduct >= instPrincipal) {
          updates.push({
            id: inst.id,
            data: {
              status: 'Abatida',
              isAbatida: true,
              isCompleted: true,
              originalAmount: inst.amount || instPrincipal,
              amount: 0,
              principalAmount: 0,
              interestPortion: 0,
              interestAmount: 0,
              labels: Array.from(new Set([...(inst.labels || []), 'Abatida'])),
              updatedAt: now
            }
          });
          remainingToDeduct -= instPrincipal;
        } else {
          const newPrincipal = Math.max(0, Math.round((instPrincipal - remainingToDeduct) * 100) / 100);
          const interestPortion = Number(inst.interestPortion || inst.interestAmount || 0);
          updates.push({
            id: inst.id,
            data: {
              amount: Math.round((newPrincipal + interestPortion) * 100) / 100,
              principalAmount: newPrincipal,
              labels: Array.from(new Set([...(inst.labels || []), 'Abatida Parcial'])),
              updatedAt: now
            }
          });
          remainingToDeduct = 0;
        }
      }

      for (let i = 0; i < updates.length; i += 15) {
        const chunk = updates.slice(i, i + 15);
        await Promise.all(chunk.map((u) => eventRepository.update(u.id, u.data)));
      }
    } else {
      // reduce_installment
      const futureUnpaid = loanInstallments.filter(
        (ev) => ev.status !== EventStatus.PAID && ev.status !== EventStatus.COMPLETED && !ev.isCompleted && ev.status !== 'Abatida' && !ev.isAbatida && ev.date >= amortDate
      );
      if (futureUnpaid.length > 0) {
        let currentRemainingDebt = futureUnpaid.reduce((acc, ev) => acc + extractInstallmentPrincipal(ev), 0);
        if (currentRemainingDebt <= 0) currentRemainingDebt = 13259.93;

        const originalInstallment = Number(futureUnpaid[0].originalAmount || futureUnpaid[0].amount || 218.47);
        const newFuturePrincipal = Math.max(0, currentRemainingDebt - amortVal);
        const reductionRatio = currentRemainingDebt > 0 ? newFuturePrincipal / currentRemainingDebt : 1;
        const newTotal = Math.max(1, Math.round(originalInstallment * reductionRatio * 100) / 100);

        const updates = futureUnpaid.map((ev) => {
          const origAmt = Number(ev.originalAmount || ev.amount || originalInstallment);
          const origCap = Number(ev.principalAmount || Math.round(origAmt * 0.82 * 100) / 100);
          const origJur = Number(ev.interestPortion || ev.interestAmount || Math.round(origAmt * 0.18 * 100) / 100);
          return {
            id: ev.id,
            data: {
              originalAmount: origAmt,
              amount: newTotal,
              principalAmount: Math.round(origCap * reductionRatio * 100) / 100,
              interestPortion: Math.round(origJur * reductionRatio * 100) / 100,
              interestAmount: Math.round(origJur * reductionRatio * 100) / 100,
              updatedAt: now
            }
          };
        });

        for (let i = 0; i < updates.length; i += 15) {
          const chunk = updates.slice(i, i + 15);
          await Promise.all(chunk.map((u) => eventRepository.update(u.id, u.data)));
        }
      }
    }
  }

  async rollbackLoanAmortization(amortEvent) {
    const loanTimelineId = amortEvent?.timelineId || amortEvent?.timelineOriginId;
    if (!loanTimelineId) return;

    const allEvents = await eventRepository.getAll();
    const now = new Date().toISOString();

    const loanInstallments = allEvents.filter(
      (ev) =>
        (ev.timelineId === loanTimelineId || ev.timelineOriginId === loanTimelineId) &&
        !ev.isAmortizationEvent?.() &&
        ev.eventType !== EventType.AMORTIZATION &&
        !ev.isAmortization &&
        ev.status !== EventStatus.PAID &&
        ev.status !== EventStatus.COMPLETED &&
        !ev.isCompleted
    );

    const updates = loanInstallments.map((ev) => {
      const origAmt = Number(ev.originalAmount || ev.amount || 218.47);
      const filteredLabels = (ev.labels || []).filter((l) => l !== 'Abatida' && l !== 'Abatida Parcial');
      return {
        id: ev.id,
        data: {
          status: EventStatus.PENDING,
          isAbatida: false,
          isCompleted: false,
          amount: origAmt,
          principalAmount: Math.round(origAmt * 0.82 * 100) / 100,
          interestPortion: Math.round(origAmt * 0.18 * 100) / 100,
          interestAmount: Math.round(origAmt * 0.18 * 100) / 100,
          labels: filteredLabels,
          updatedAt: now
        }
      };
    });

    for (let i = 0; i < updates.length; i += 15) {
      const chunk = updates.slice(i, i + 15);
      await Promise.all(chunk.map((u) => eventRepository.update(u.id, u.data)));
    }

    try {
      if (loanTimelineId) {
        const loan = await loanContractRepository.getById(loanTimelineId);
        const amortVal = Number(amortEvent.amount || amortEvent.amortizationAmount || 0);
        if (loan) {
          const changes = loan.rollbackAmortization ? loan.rollbackAmortization(amortVal) : {
            remainingDebt: Math.round(((Number(loan.remainingDebt || loan.totalDebt)) + amortVal) * 100) / 100,
            amortizedCapital: Math.max(0, Math.round(((Number(loan.amortizedCapital) || 0) - amortVal) * 100) / 100)
          };
          await loanContractRepository.update(loan.id, changes);
        }
        const tl = await timelineRepository.getById(loanTimelineId);
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

export const financialEventService = new FinancialEventService();
