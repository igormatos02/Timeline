import { financialEventRepository as eventRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventRepository.js';
import { financialEventStatusRepository } from '../../infrastructure/database/supabase/SupabaseFinancialEventStatusRepository.js';
import { loanContractRepository } from '../../infrastructure/database/supabase/SupabaseLoanContractRepository.js';
import { timelineRepository } from '../../infrastructure/database/supabase/SupabaseTimelineRepository.js';
import { todoRepository } from '../../infrastructure/database/supabase/SupabaseTodoRepository.js';
import { todoService } from './TodoService.js';
import { projectEvents } from '../../domain/services/ProjectionEngine.js';
import { calcToggledStatus } from '../../domain/entities/TimelineEvent.js';
import {
  EventType,
  TimelineType,
  EventStatus,
  EventPriority,
  EventPeriodicity,
  EventRecurrence,
  EventDeletionMode,
  EventUpdateMode,
  AmortizationStrategy,
  LoanEventCategory,
  AmortizationEventCategory,
  InvestmentEventCategory,
  IncomeEventCategory,
  ExpensesEventCategory,
  DiaryMood,
  isPositiveStatus,
  isNegativeStatus,
  isCancelledStatus,
  normalizeRecurrence
} from '../../../shared/enums/index.js';
import { createT } from '../../../shared/i18n/index.js';

const t = createT('en');

export class FinancialEventService {
  async _syncStatus(date, eventId, status, options = {}) {
    if (!date || !eventId || !status) return;
    const dateStr = String(date);
    if (dateStr.length < 7) return;
    const year = parseInt(dateStr.substring(0, 4), 10);
    const month = parseInt(dateStr.substring(5, 7), 10);
    if (isNaN(year) || isNaN(month)) return;

    if (status === EventStatus.DELETED) {
      await financialEventStatusRepository.upsertStatus(year, month, eventId, EventStatus.DELETED, options);
    } else if (status === EventStatus.CANCELLED || isCancelledStatus(status)) {
      await financialEventStatusRepository.upsertStatus(year, month, eventId, EventStatus.CANCELLED, options);
    } else if (isPositiveStatus(status)) {
      await financialEventStatusRepository.upsertStatus(year, month, eventId, status, options);
    } else if (isNegativeStatus(status)) {
      await financialEventStatusRepository.deleteStatus(year, month, eventId);
    }
  }

  async getAllEvents(filter = {}) {
    const rawEvents = await eventRepository.getAllWithStatuses();
    const statusMap = await financialEventStatusRepository.getStatusMap();

    // Mapear também os status dinâmicos que vieram no join dos rawEvents
    const joinedStatusMap = new Map();
    for (const rawEv of rawEvents) {
      if (Array.isArray(rawEv.statusesList)) {
        for (const st of rawEv.statusesList) {
          if (st && st.year && st.month) {
            const keyByEvId = `${st.year}_${st.month}_${st.event_id}`;
            joinedStatusMap.set(keyByEvId, st.status);
          }
        }
      }
    }

    // Attach status to non-recurring rawEvents/overrides before projection so ProjectionEngine knows tombstone overrides
    for (const rawEv of rawEvents) {
      if (rawEv.isRecurring) continue; // Monthly status in financial_event_status applies to projected occurrences, not recurring root templates
      const dateStr = rawEv.date ? String(rawEv.date) : '';
      if (dateStr.length >= 7) {
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(5, 7), 10);
        const targetId = rawEv.eventId || rawEv.id;
        const key = `${year}_${month}_${targetId}`;
        const keyById = `${year}_${month}_${rawEv.id}`;
        let matchedStatus = statusMap.get(key) || statusMap.get(keyById) || joinedStatusMap.get(key) || joinedStatusMap.get(keyById);
        if (matchedStatus) {
          rawEv.status = matchedStatus;
          rawEv.isCompleted = isPositiveStatus(matchedStatus);
          if (matchedStatus === EventStatus.DELETED) {
            rawEv.isDeleted = true;
          }
        }
      }
    }

    const projectedEvents = projectEvents(rawEvents, filter);

    for (const ev of projectedEvents) {
      const dateStr = ev.date ? String(ev.date) : '';
      if (dateStr.length >= 7) {
        const year = parseInt(dateStr.substring(0, 4), 10);
        const month = parseInt(dateStr.substring(5, 7), 10);
        const targetId = ev.eventId || ev.id;
        const key = `${year}_${month}_${targetId}`;
        const keyById = `${year}_${month}_${ev.id}`;
        const keyBySob = ev.sobrepositionOver ? `${year}_${month}_${ev.sobrepositionOver}` : null;
        const keyBySeries = ev.seriesId ? `${year}_${month}_${ev.seriesId}` : null;
        const keyByStrippedId = ev.id && String(ev.id).includes('_') ? `${year}_${month}_${String(ev.id).split('_')[0]}` : null;
        const keyByStrippedTargetId = targetId && String(targetId).includes('_') ? `${year}_${month}_${String(targetId).split('_')[0]}` : null;

        let matchedStatus =
          statusMap.get(key) ||
          statusMap.get(keyById) ||
          (keyBySob ? statusMap.get(keyBySob) : null) ||
          (keyBySeries ? statusMap.get(keyBySeries) : null) ||
          (keyByStrippedId ? statusMap.get(keyByStrippedId) : null) ||
          (keyByStrippedTargetId ? statusMap.get(keyByStrippedTargetId) : null) ||
          joinedStatusMap.get(key) ||
          joinedStatusMap.get(keyById) ||
          (keyBySob ? joinedStatusMap.get(keyBySob) : null) ||
          (keyBySeries ? joinedStatusMap.get(keyBySeries) : null) ||
          (keyByStrippedId ? joinedStatusMap.get(keyByStrippedId) : null) ||
          (keyByStrippedTargetId ? joinedStatusMap.get(keyByStrippedTargetId) : null);

        if (matchedStatus) {
          ev.status = matchedStatus;
          ev.isCompleted = isPositiveStatus(matchedStatus);
        } else {
          ev.status = ev.status || EventStatus.PENDING;
          ev.isCompleted = isPositiveStatus(ev.status);
        }
      } else {
        ev.status = ev.status || EventStatus.PENDING;
        ev.isCompleted = isPositiveStatus(ev.status);
      }
    }

    // Calcular/recalcular dinamicamente remainingDebtAfter e balanceAfter para parcelas de empréstimos
    const eventsByTimeline = new Map();
    for (const ev of projectedEvents) {
      const tlId = ev.timelineId || ev.timelineOriginId;
      if (tlId && (ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.isSystemLoanEvent)) {
        if (!eventsByTimeline.has(tlId)) {
          eventsByTimeline.set(tlId, []);
        }
        eventsByTimeline.get(tlId).push(ev);
      }
    }

    for (const [tlId, loanEvs] of eventsByTimeline.entries()) {
      const sortedLoanEvs = loanEvs.sort((a, b) => {
        const numA = Number(a.installmentNumber || 0);
        const numB = Number(b.installmentNumber || 0);
        if (numA && numB) return numA - numB;
        return (a.date || '').localeCompare(b.date || '');
      });

      // Tentar obter o contrato de empréstimo associado à timeline para saber o capital inicial
      let initialCapital = 0;
      try {
        const contract = await loanContractRepository.getByTimelineId(tlId);
        if (contract) {
          initialCapital = Number(contract.originalCapital || contract.original_capital || 0);
        }
      } catch (e) { }

      // Se não houver contrato ou originalCapital for 0, somamos o capital de todas as prestações da série
      if (!initialCapital || initialCapital <= 0) {
        initialCapital = sortedLoanEvs.reduce((sum, e) => {
          const cap = Number(e.installmentCapital !== undefined ? e.installmentCapital : (e.principalAmount || 0));
          return sum + cap;
        }, 0);
      }

      // Se ainda for 0, tentar encontrar pelo primeiro evento com balanceAfter
      if (!initialCapital || initialCapital <= 0) {
        const firstWithBalance = sortedLoanEvs.find(e => e.balanceAfter !== undefined && e.balanceAfter !== null && Number(e.balanceAfter) > 0);
        if (firstWithBalance) {
          initialCapital = Number(firstWithBalance.balanceAfter) + Number(firstWithBalance.installmentCapital || firstWithBalance.principalAmount || 0);
        }
      }

      let runningBalance = initialCapital;

      for (let i = 0; i < sortedLoanEvs.length; i++) {
        const ev = sortedLoanEvs[i];
        const capitalPortion = Number(ev.installmentCapital !== undefined ? ev.installmentCapital : (ev.principalAmount || 0));

        if (runningBalance > 0) {
          runningBalance = Math.max(0, runningBalance - capitalPortion);
          ev.remainingDebtAfter = runningBalance;
          ev.balanceAfter = runningBalance;
        } else if (ev.remainingDebtAfter !== undefined && ev.remainingDebtAfter !== null) {
          ev.balanceAfter = Number(ev.remainingDebtAfter);
        } else {
          ev.balanceAfter = 0;
          ev.remainingDebtAfter = 0;
        }
      }
    }

    // Resolve timeline to timeboard mapping for complete multi-timeline support
    let timelineToTimeboard = new Map();
    try {
      const allTimelines = await timelineRepository.getAll();
      for (const tl of allTimelines) {
        if (tl && tl.id) {
          const tbId = tl.timeboardId || tl.timeboard_id;
          if (tbId) timelineToTimeboard.set(tl.id, tbId);
        }
      }
    } catch (err) {
      console.warn('Error loading timeline mapping in getAllEvents:', err.message);
    }

    // Attach missing timeboardId to projectedEvents if timelineId is known
    for (const ev of projectedEvents) {
      if (!ev.timeboardId && ev.timelineId && timelineToTimeboard.has(ev.timelineId)) {
        ev.timeboardId = timelineToTimeboard.get(ev.timelineId);
      }
    }

    // Load To Do items from to_do table and map them to projected timeline events
    try {
      const todos = await todoRepository.getAll();
      const todayStr = new Date().toISOString().substring(0, 10);

      for (const todo of todos) {
        if (!todo || !todo.id) continue;
        const rawStatus = String(todo.status || '').toLowerCase();
        const isCompleted = typeof todo.isCompleted === 'function' ? todo.isCompleted() : (rawStatus === EventStatus.COMPLETED || isPositiveStatus(rawStatus));
        const effectiveDoneDate = todo.doneDate || todo.done_date;
        const fallbackDate = todo.date || (todo.createdAt ? String(todo.createdAt).substring(0, 10) : (todo.updatedAt ? String(todo.updatedAt).substring(0, 10) : todayStr));
        const effectiveDate = effectiveDoneDate ? String(effectiveDoneDate).substring(0, 10) : fallbackDate;
        const effectiveTimeboardId = todo.timeboardId || (todo.timelineId ? timelineToTimeboard.get(todo.timelineId) : null);

        projectedEvents.push({
          id: todo.id,
          eventId: todo.id,
          timelineId: todo.timelineId,
          timelineOriginId: todo.timelineId,
          timeboardId: effectiveTimeboardId,
          title: todo.name,
          name: todo.name,
          description: todo.description || '',
          notes: todo.notes || '',
          labels: todo.labels || [],
          priority: todo.priority || EventPriority.NORMAL,
          status: isCompleted ? EventStatus.COMPLETED : (rawStatus || EventStatus.PENDING),
          isCompleted,
          doneDate: effectiveDoneDate,
          isObligation: todo.isObligation,
          obligationPersonId: todo.obligationPersonId,
          eventType: EventType.TODO,
          timelineType: TimelineType.TODO,
          recurrence: EventRecurrence.ONCE,
          isRecurring: false,
          date: effectiveDate,
          createdAt: todo.createdAt,
          updatedAt: todo.updatedAt
        });
      }
    } catch (err) {
      console.warn('Error including to_do items in getAllEvents:', err.message);
    }

    const filteredEvents = projectedEvents.filter((ev) => {
      if (filter.timeboardId && ev.timeboardId && ev.timeboardId !== filter.timeboardId) return false;
      if (filter.timelineId && ev.timelineId !== filter.timelineId && ev.timelineOriginId !== filter.timelineId) return false;
      if (filter.timelineOriginId && ev.timelineOriginId !== filter.timelineOriginId) return false;
      if (filter.eventType && ev.eventType !== filter.eventType) return false;
      if (filter.status && ev.status !== filter.status) return false;
      if (filter.startDate && ev.date < filter.startDate) return false;
      if (filter.endDate && ev.date > filter.endDate) return false;
      return true;
    });

    // Lazy load: for REGISTER events or DIARY timelines, omit description from list payload to save memory
    return filteredEvents.map((ev) => {
      if (ev.eventType === EventType.REGISTER || ev.timelineType === TimelineType.DIARY) {
        const { description, ...rest } = ev;
        return { ...rest, hasDescription: Boolean(description) };
      }
      return ev;
    });
  }

  async getEventById(id) {
    if (!id) return null;
    const directEvent = await eventRepository.getById(id);
    if (directEvent) return directEvent;

    const allEvents = await eventRepository.getAll();
    const found = allEvents.find((e) => e.id === id || e.eventId === id || e.sobrepositionOver === id);
    return found || null;
  }

  async createEvent(eventData) {
    if (eventData.eventType === EventType.TODO || eventData.timelineType === TimelineType.TODO) {
      return todoService.createTodo(eventData);
    }

    const isRecurring =
      eventData.recurrence === EventRecurrence.RECURRING ||
      eventData.recurrence === EventRecurrence.LIMITED ||
      eventData.periodicity === EventPeriodicity.RECURRING ||
      eventData.isRecurring;
    const eventId = eventData.eventId || eventData.event_id || (isRecurring ? `series-${Date.now()}` : null);

    const isLoanInstallment = (
      eventData.eventType === EventType.LOAN_INSTALLMENT ||
      eventData.category === LoanEventCategory.LOAN_INSTALLMENT ||
      eventData.isSystemLoanEvent
    );

    let timeboardId = eventData.timeboardId || eventData.timeboard_id || null;
    const timelineId = eventData.timelineId || eventData.timelineOriginId || eventData.timeline_id || null;

    if (!timeboardId && timelineId) {
      try {
        const tl = await timelineRepository.getById(timelineId);
        if (tl) timeboardId = tl.timeboardId || tl.timeboard_id;
      } catch (e) {
        console.warn('Could not resolve timeboardId from timeline in createEvent:', e.message);
      }
    }

    const isRegister = eventData.eventType === EventType.REGISTER;
    if (isRegister) {
      const allRawEvents = await eventRepository.getAll();
      const duplicate = allRawEvents.find((e) => {
        if (e.isDeleted || e.status === EventStatus.DELETED) return false;
        const sameTimeline = String(e.timelineId || e.timelineOriginId || e.timeline_id) === String(timelineId);
        const sameDate = String(e.date) === String(eventData.date);
        return sameTimeline && sameDate;
      });

      if (duplicate) {
        throw new Error(t('diaryModal.duplicateDayError'));
      }
    }

    const payload = {
      ...eventData,
      timelineId,
      timelineOriginId: timelineId,
      timeboardId,
      eventId,
      version: isLoanInstallment ? 0 : (eventData.version !== undefined ? Number(eventData.version) : 0),
      eventVersion: isLoanInstallment ? 0 : (eventData.eventVersion !== undefined ? Number(eventData.eventVersion) : 0),
      event_version: isLoanInstallment ? 0 : (eventData.event_version !== undefined ? Number(eventData.event_version) : 0),
      recurrence: isLoanInstallment || isRegister ? EventRecurrence.ONCE : (eventData.recurrence || (isRecurring ? EventRecurrence.RECURRING : EventRecurrence.ONCE)),
      periodicity: eventData.periodicity || EventPeriodicity.MONTHLY,
      isRecurring: isLoanInstallment || isRegister ? false : Boolean(isRecurring)
    };

    const created = await eventRepository.create(payload);

    if (payload.status && payload.date) {
      await this._syncStatus(payload.date, created.eventId || created.id, payload.status, {
        timelineId: created.timelineId || created.timeline_id || payload.timelineId || payload.timeline_id,
        timeboardId: created.timeboardId || created.timeboard_id || payload.timeboardId || payload.timeboard_id
      });
    }

    // Apenas grava o registo do evento de amortização na base de dados, sem alterar as parcelas da timeline
    return created;
  }

  async updateEvent(id, updates) {
    const { updateScope, propagateForward, ...directUpdates } = updates;

    const isTodoDirect = await todoRepository.getById(id);
    if (isTodoDirect || directUpdates.eventType === EventType.TODO || directUpdates.timelineType === TimelineType.TODO) {
      return todoService.updateTodo(id, directUpdates);
    }

    const allRawEvents = await eventRepository.getAll();
    const existingDirect = (await eventRepository.getById(id)) || allRawEvents.find((e) => e.id === id);

    const isRegister = directUpdates.eventType === EventType.REGISTER || existingDirect?.eventType === EventType.REGISTER;
    if (isRegister && directUpdates.date && directUpdates.date !== existingDirect?.date) {
      const duplicate = allRawEvents.find((e) => {
        if (e.id === id || e.eventId === id || e.isDeleted || e.status === EventStatus.DELETED) return false;
        const sameTimeline = String(e.timelineId || e.timelineOriginId || e.timeline_id) === String(existingDirect?.timelineId || directUpdates.timelineId);
        const sameDate = String(e.date) === String(directUpdates.date);
        return sameTimeline && sameDate;
      });

      if (duplicate) {
        throw new Error(t('diaryModal.duplicateDayError'));
      }
    }

    const loanTlId = directUpdates.timelineId || directUpdates.timelineOriginId || existingDirect?.timelineId || existingDirect?.timelineOriginId;
    const isLoan = Boolean(loanTlId && (directUpdates.isLoanEvent?.() || existingDirect?.isLoanEvent?.() || directUpdates.isSystemLoanEvent || existingDirect?.isSystemLoanEvent || directUpdates.eventType === EventType.AMORTIZATION || existingDirect?.eventType === EventType.AMORTIZATION));

    const targetSeriesId = directUpdates.eventId || directUpdates.event_id || updates.eventId || existingDirect?.eventId || (id && id.includes('_') ? id.split('_')[0] : (isLoan ? loanTlId : (existingDirect?.id || id)));

    const seriesRootEvent = allRawEvents.find((e) => (e.eventId && e.eventId === targetSeriesId) || e.id === targetSeriesId);
    const existing = existingDirect || seriesRootEvent;

    const existingVersion = existing
      ? Number(existing.version !== undefined ? existing.version : (existing.eventVersion !== undefined ? existing.eventVersion : (existing.event_version || 0)))
      : 0;

    const seriesVersions = targetSeriesId
      ? allRawEvents.filter((ev) => ev.eventId === targetSeriesId || ev.sobrepositionOver === targetSeriesId || ev.id === targetSeriesId)
      : [];

    const currentHighestVersion = seriesVersions.reduce((max, v) => {
      const vNum = Number(v.version !== undefined ? v.version : (v.eventVersion !== undefined ? v.eventVersion : (v.event_version || 0)));
      return Math.max(max, vNum);
    }, existingVersion);

    const isLoanInstallment = (
      directUpdates.eventType === EventType.LOAN_INSTALLMENT ||
      existing?.eventType === EventType.LOAN_INSTALLMENT ||
      directUpdates.category === LoanEventCategory.LOAN_INSTALLMENT ||
      existing?.category === LoanEventCategory.LOAN_INSTALLMENT ||
      existing?.isSystemLoanEvent ||
      directUpdates.isSystemLoanEvent
    );

    const isRecurring = Boolean(
      directUpdates.isRecurring !== undefined ? directUpdates.isRecurring :
        (directUpdates.recurrence !== undefined ? (directUpdates.recurrence === EventRecurrence.RECURRING || directUpdates.recurrence === EventRecurrence.LIMITED) :
          (existing?.isRecurring !== undefined ? existing.isRecurring :
            (existing?.recurrence !== undefined ? (existing.recurrence === EventRecurrence.RECURRING || existing.recurrence === EventRecurrence.LIMITED) :
              (directUpdates.periodicity === EventPeriodicity.RECURRING || directUpdates.periodicity === EventPeriodicity.PERIOD))))
    );

    const isSubsequentUpdate = (
      updateScope === EventUpdateMode.SUBSEQUENT ||
      propagateForward === true ||
      directUpdates.propagateForward === true
    );

    const isSingleUpdate = (
      updateScope === EventUpdateMode.SINGLE
    );

    // 1. Prestações de empréstimo (loan_installment) são alteradas diretamente mantendo versão 0
    if (isLoanInstallment) {
      const updatePayload = {
        ...directUpdates,
        version: 0,
        eventVersion: 0,
        event_version: 0,
        is_recurring: false,
        isRecurring: false
      };
      if (directUpdates.status) {
        const targetDate = directUpdates.date || existing?.date;
        await this._syncStatus(targetDate, targetSeriesId, directUpdates.status, {
          timelineId: directUpdates.timelineId || directUpdates.timeline_id || existing?.timelineId || existing?.timeline_id,
          timeboardId: directUpdates.timeboardId || directUpdates.timeboard_id || existing?.timeboardId || existing?.timeboard_id
        });
      }
      return eventRepository.update(id, updatePayload);
    }

    const isInvestment = (
      directUpdates.eventType === EventType.INVESTMENT ||
      existing?.eventType === EventType.INVESTMENT ||
      directUpdates.category === InvestmentEventCategory.SAVINGS ||
      directUpdates.category === InvestmentEventCategory.ASSETS ||
      directUpdates.category === InvestmentEventCategory.OTHER ||
      existing?.category === InvestmentEventCategory.SAVINGS ||
      existing?.category === InvestmentEventCategory.ASSETS ||
      existing?.category === InvestmentEventCategory.OTHER
    );

    // Sincronizar category, title/name, targetAmount, initialInvestedAmount e isExternal em todos os registos existentes da série
    if (seriesVersions.length > 0 && (
      directUpdates.category !== undefined ||
      directUpdates.title !== undefined ||
      directUpdates.name !== undefined ||
      directUpdates.targetAmount !== undefined ||
      directUpdates.initialInvestedAmount !== undefined ||
      directUpdates.isExternal !== undefined ||
      directUpdates.is_external !== undefined
    )) {
      for (const sv of seriesVersions) {
        if (sv.id) {
          const syncPatch = {};
          if (directUpdates.category !== undefined) syncPatch.category = directUpdates.category;
          if (directUpdates.title || directUpdates.name) {
            syncPatch.title = directUpdates.title || directUpdates.name;
            syncPatch.name = directUpdates.name || directUpdates.title;
          }
          if (directUpdates.targetAmount !== undefined) syncPatch.targetAmount = directUpdates.targetAmount;
          if (directUpdates.initialInvestedAmount !== undefined) syncPatch.initialInvestedAmount = directUpdates.initialInvestedAmount;
          if (directUpdates.isExternal !== undefined || directUpdates.is_external !== undefined) {
            syncPatch.isExternal = Boolean(directUpdates.isExternal !== undefined ? directUpdates.isExternal : directUpdates.is_external);
            syncPatch.is_external = syncPatch.isExternal;
          }
          await eventRepository.update(sv.id, syncPatch);
        }
      }
    }

    // Alteração de propriedades (como categoria, título, notas, prioridade, etc.) sem alteração de valor monetário ou data não cria nova versão
    const isAmountChanged = (
      directUpdates.amount !== undefined &&
      existing?.amount !== undefined &&
      Number(directUpdates.amount) !== Number(existing?.amount)
    );

    const isDateChanged = (
      directUpdates.date !== undefined &&
      existing?.date !== undefined &&
      directUpdates.date !== existing.date
    );

    if (!isAmountChanged && !isDateChanged) {
      const targetRecordId = existingDirect?.id || seriesRootEvent?.id || (id && !id.includes('_') ? id : null);
      if (targetRecordId) {
        const updatePayload = {
          ...directUpdates,
          is_recurring: isRecurring,
          isRecurring: isRecurring
        };
        if (directUpdates.status) {
          const targetDate = directUpdates.date || existingDirect?.date || existing?.date;
          await this._syncStatus(targetDate, targetSeriesId, directUpdates.status, {
            timelineId: directUpdates.timelineId || directUpdates.timeline_id || existingDirect?.timelineId || existing?.timelineId,
            timeboardId: directUpdates.timeboardId || directUpdates.timeboard_id || existingDirect?.timeboardId || existing?.timeboard_id
          });
        }
        return eventRepository.update(targetRecordId, updatePayload);
      }
    }

    // 2. Eventos não-recorrentes ou edição global de toda a série ou edição direta do registo da mesma data
    const isDirectRecordInPlace = (
      existingDirect &&
      existingDirect.id &&
      !id.includes('_') &&
      (!directUpdates.date || directUpdates.date === existingDirect.date) &&
      (!isSubsequentUpdate || existingDirect.version > 0)
    );

    if (isDirectRecordInPlace || (!isRecurring && existingDirect && existingDirect.id)) {
      const updatePayload = {
        ...directUpdates,
        is_recurring: isRecurring,
        isRecurring: isRecurring
      };
      if (directUpdates.status) {
        const targetDate = directUpdates.date || existingDirect?.date;
        await this._syncStatus(targetDate, targetSeriesId, directUpdates.status, {
          timelineId: directUpdates.timelineId || directUpdates.timeline_id || existingDirect?.timelineId || existingDirect?.timeline_id,
          timeboardId: directUpdates.timeboardId || directUpdates.timeboard_id || existingDirect?.timeboardId || existingDirect?.timeboard_id
        });
      }
      return eventRepository.update(existingDirect.id || id, updatePayload);
    }

    // 3. Edição com propagação ("A partir deste mês" / subsequentes): Cria nova versão incremental na série
    if (isSubsequentUpdate || (isRecurring && !isSingleUpdate)) {
      const nextVersion = currentHighestVersion + 1;
      const baseEventData = existing ? { ...existing } : {};
      delete baseEventData.id;

      const targetDate = directUpdates.date || existing?.date;

      // Clean up any stale future versions of the same series at or after targetDate
      const staleFutureVersions = seriesVersions.filter((ev) =>
        ev.id &&
        ev.id !== existingDirect?.id &&
        ev.date >= targetDate &&
        !ev.sobrepositionOver
      );
      for (const stale of staleFutureVersions) {
        await eventRepository.delete(stale.id);
      }

      const newVersionedPayload = {
        ...baseEventData,
        ...directUpdates,
        tenantId: directUpdates.tenantId || existing?.tenantId || seriesRootEvent?.tenantId,
        timeboardId: directUpdates.timeboardId || existing?.timeboardId || seriesRootEvent?.timeboardId,
        timelineId: directUpdates.timelineId || directUpdates.timelineOriginId || existing?.timelineId || existing?.timelineOriginId || seriesRootEvent?.timelineId,
        timelineOriginId: directUpdates.timelineId || directUpdates.timelineOriginId || existing?.timelineId || existing?.timelineOriginId || seriesRootEvent?.timelineId,
        eventId: targetSeriesId,
        date: targetDate,
        is_recurring: true,
        isRecurring: true,
        version: nextVersion,
        eventVersion: nextVersion,
        event_version: nextVersion
      };
      delete newVersionedPayload.id;

      if (directUpdates.status) {
        await this._syncStatus(targetDate, targetSeriesId, directUpdates.status, {
          timelineId: newVersionedPayload.timelineId,
          timeboardId: newVersionedPayload.timeboardId
        });
      }

      return eventRepository.create(newVersionedPayload);
    }

    // 4. Edição pontual ("Apenas este mês"): Cria override pontual (sobrepositionOver)
    const nextVersion = currentHighestVersion + 1;
    const baseEventData = existing ? { ...existing } : {};
    delete baseEventData.id;

    const targetDate = directUpdates.date || existing?.date;

    const singleOverridePayload = {
      ...baseEventData,
      ...directUpdates,
      tenantId: directUpdates.tenantId || existing?.tenantId || seriesRootEvent?.tenantId,
      timeboardId: directUpdates.timeboardId || existing?.timeboardId || seriesRootEvent?.timeboardId,
      timelineId: directUpdates.timelineId || directUpdates.timelineOriginId || existing?.timelineId || existing?.timelineOriginId || seriesRootEvent?.timelineId,
      timelineOriginId: directUpdates.timelineId || directUpdates.timelineOriginId || existing?.timelineId || existing?.timelineOriginId || seriesRootEvent?.timelineId,
      eventId: targetSeriesId,
      sobrepositionOver: targetSeriesId,
      date: targetDate,
      is_recurring: false,
      isRecurring: false,
      version: nextVersion,
      eventVersion: nextVersion,
      event_version: nextVersion
    };
    delete singleOverridePayload.id;

    if (directUpdates.status) {
      await this._syncStatus(targetDate, targetSeriesId, directUpdates.status, {
        timelineId: singleOverridePayload.timelineId,
        timeboardId: singleOverridePayload.timeboardId
      });
    }

    return eventRepository.create(singleOverridePayload);
  }

  async toggleEventPayment(id, explicitStatus = null) {
    const todoItem = await todoRepository.getById(id);
    if (todoItem) {
      return todoService.toggleStatus(id, explicitStatus);
    }

    const allEvents = await this.getAllEvents();
    const targetEvent = allEvents.find((e) => e.id === id || e.eventId === id || e.sobrepositionOver === id);

    if (!targetEvent) {
      throw new Error(`${t('backend.validation.eventNotFound')}: ${id}`);
    }

    const toggled = calcToggledStatus(targetEvent, explicitStatus);
    const targetEventId = targetEvent.eventId || targetEvent.id;
    const targetDate = targetEvent.date;

    await this._syncStatus(targetDate, targetEventId, toggled.status, {
      timelineId: targetEvent.timelineId || targetEvent.timeline_id,
      timeboardId: targetEvent.timeboardId || targetEvent.timeboard_id
    });

    if (targetEvent.id && !String(targetEvent.id).includes('_')) {
      try {
        await eventRepository.update(targetEvent.id, {
          status: toggled.status,
          isCompleted: toggled.isCompleted
        });
      } catch (e) {
        console.warn('Could not update direct event status in financial_events:', e.message);
      }
    }

    return { ...targetEvent, ...toggled };
  }

  async deleteEvent(id, options = {}) {
    const todoItem = await todoRepository.getById(id);
    if (todoItem) {
      return todoService.deleteTodo(id);
    }

    const deletionMode = options.deletionMode || options.deleteScope || EventDeletionMode.ONLY_THIS;
    const allRawEvents = await eventRepository.getAll();
    const directEvent = await eventRepository.getById(id);

    if (directEvent && (directEvent.isAmortizationEvent?.() || directEvent.eventType === EventType.AMORTIZATION || directEvent.category === AmortizationEventCategory.REDUCE_TERM || directEvent.category === AmortizationEventCategory.REDUCE_INSTALLMENT)) {
      if (directEvent.date) {
        const year = parseInt(directEvent.date.substring(0, 4), 10);
        const month = parseInt(directEvent.date.substring(5, 7), 10);
        await financialEventStatusRepository.deleteStatus(year, month, id);
      }
      return eventRepository.delete(id);
    }

    const isLoan = directEvent && (
      directEvent.isLoanEvent?.() ||
      directEvent.isSystemLoanEvent ||
      directEvent.eventType === EventType.LOAN_INSTALLMENT ||
      directEvent.category === LoanEventCategory.LOAN_INSTALLMENT
    );
    if (isLoan) {
      if (directEvent.date) {
        const year = parseInt(directEvent.date.substring(0, 4), 10);
        const month = parseInt(directEvent.date.substring(5, 7), 10);
        await financialEventStatusRepository.deleteStatus(year, month, id);
      }
      return eventRepository.delete(id);
    }

    const targetSeriesId = directEvent?.eventId || directEvent?.event_id || directEvent?.sobrepositionOver || options.eventId || (id && id.includes('_') ? id.split('_')[0] : id);
    const targetDate = options.date || directEvent?.date || (id && id.includes('_') ? id.split('_')[1] : null);

    const rootEvent = directEvent || allRawEvents.find((ev) => (ev.eventId && ev.eventId === targetSeriesId) || ev.id === targetSeriesId || ev.id === id) || {};

    const rootNormRec = normalizeRecurrence(rootEvent);
    const isRecurringSeries =
      rootNormRec === EventRecurrence.RECURRING ||
      rootNormRec === EventRecurrence.LIMITED ||
      Boolean(id && String(id).includes('_')) ||
      allRawEvents.some((ev) => {
        const evRec = normalizeRecurrence(ev);
        return ((ev.eventId && ev.eventId === targetSeriesId) || ev.id === targetSeriesId) && (evRec === EventRecurrence.RECURRING || evRec === EventRecurrence.LIMITED);
      });

    const isAll = deletionMode === EventDeletionMode.EVERYTHING || options.deleteSeries;
    const isSubsequent = deletionMode === EventDeletionMode.FROM_NOW_ON;
    const isOnlyThis = deletionMode === EventDeletionMode.ONLY_THIS;

    if (isAll) {
      const effectiveSeriesId = targetSeriesId || rootEvent.id;
      const allRelatedEvents = allRawEvents.filter(
        (ev) => (effectiveSeriesId && (ev.eventId === effectiveSeriesId || ev.id === effectiveSeriesId || ev.sobrepositionOver === effectiveSeriesId)) ||
          (id && (ev.id === id || ev.eventId === id)) ||
          (directEvent && (ev.id === directEvent.id || ev.eventId === directEvent.eventId))
      );

      const targetIds = Array.from(new Set([
        effectiveSeriesId,
        rootEvent?.id,
        directEvent?.id,
        id,
        ...(allRelatedEvents.map(e => e.id)),
        ...(allRelatedEvents.map(e => e.eventId))
      ].filter(Boolean)));

      // 1. Delete all records from financial_event_status table
      await financialEventStatusRepository.deleteAllStatusForEvent(targetIds);

      // 2. Delete all records from financial_events table
      await eventRepository.deleteByEventId(targetIds);

      for (const singleId of targetIds) {
        await eventRepository.delete(singleId);
      }

      return true;
    }

    if (isSubsequent && (targetSeriesId || rootEvent.id)) {
      const effectiveSeriesId = targetSeriesId || rootEvent.id;
      const seriesVersions = allRawEvents.filter(
        (ev) => (ev.eventId && ev.eventId === effectiveSeriesId) || ev.id === effectiveSeriesId || ev.sobrepositionOver === effectiveSeriesId
      );
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version !== undefined ? v.version : (v.eventVersion !== undefined ? v.eventVersion : (v.event_version || 0)))), 0);
      const nextVersion = currentHighestVersion + 1;

      const newVersionPayload = {
        tenantId: rootEvent?.tenantId || rootEvent?.tenant_id,
        timeboardId: rootEvent?.timeboardId || rootEvent?.timeboard_id,
        timelineId: rootEvent?.timelineId || rootEvent?.timeline_id,
        timelineOriginId: rootEvent?.timelineOriginId || rootEvent?.timelineId || rootEvent?.timeline_id,
        name: rootEvent?.name || rootEvent?.title ? `${rootEvent?.name || rootEvent?.title} ${t('backend.event.seriesClosedSuffix')}` : t('backend.event.seriesClosed'),
        title: rootEvent?.title || rootEvent?.name ? `${rootEvent?.title || rootEvent?.name} ${t('backend.event.seriesClosedSuffix')}` : t('backend.event.seriesClosed'),
        description: rootEvent?.description || '',
        eventType: rootEvent?.eventType || rootEvent?.event_type || EventType.EXPENSE,
        category: rootEvent?.category,
        amount: rootEvent?.amount || rootEvent?.installmentAmount || 0,
        installmentAmount: rootEvent?.installmentAmount || rootEvent?.amount || 0,
        eventId: effectiveSeriesId,
        event_id: effectiveSeriesId,
        version: nextVersion,
        eventVersion: nextVersion,
        date: targetDate,
        isTerminated: true,
        isDeleted: true,
        isRecurring: true,
        recurrence: EventRecurrence.RECURRING,
        periodicity: rootEvent?.periodicity || EventPeriodicity.MONTHLY,
        status: EventStatus.DELETED
      };

      const newVersionRow = await eventRepository.create(newVersionPayload);

      if (targetDate) {
        const year = parseInt(targetDate.substring(0, 4), 10);
        const month = parseInt(targetDate.substring(5, 7), 10);
        const aliases = Array.from(new Set([effectiveSeriesId, rootEvent?.id, directEvent?.id, id, newVersionRow?.id].filter(Boolean)));
        // Exclui da tabela de status todos os status deste evento com mês/ano igual ou superior à data da exclusão
        await financialEventStatusRepository.deleteStatusFromMonthOnward(year, month, aliases);
      }
      return true;
    }

    if ((isOnlyThis || isRecurringSeries) && (targetSeriesId || rootEvent.id)) {
      const effectiveSeriesId = targetSeriesId || rootEvent.id;
      const seriesVersions = allRawEvents.filter(
        (ev) => (ev.eventId && ev.eventId === effectiveSeriesId) || ev.id === effectiveSeriesId || ev.sobrepositionOver === effectiveSeriesId
      );
      const currentHighestVersion = seriesVersions.reduce((max, v) => Math.max(max, Number(v.version !== undefined ? v.version : (v.eventVersion !== undefined ? v.eventVersion : (v.event_version || 0)))), 0);
      const nextVersion = currentHighestVersion + 1;

      const existingOverride = allRawEvents.find(
        (ev) => ((ev.eventId && ev.eventId === effectiveSeriesId) || ev.id === effectiveSeriesId || ev.sobrepositionOver === effectiveSeriesId) &&
          ev.date === targetDate &&
          !ev.isRecurring
      );

      let savedRow;
      if (existingOverride) {
        savedRow = await eventRepository.update(existingOverride.id, {
          isDeleted: true,
          isTerminated: true,
          status: EventStatus.DELETED,
          version: nextVersion,
          eventVersion: nextVersion,
          isRecurring: false
        });
      } else {
        const tombstonePayload = {
          tenantId: rootEvent?.tenantId || rootEvent?.tenant_id,
          timeboardId: rootEvent?.timeboardId || rootEvent?.timeboard_id,
          timelineId: rootEvent?.timelineId || rootEvent?.timeline_id,
          timelineOriginId: rootEvent?.timelineOriginId || rootEvent?.timelineId || rootEvent?.timeline_id,
          name: rootEvent?.name || rootEvent?.title ? `${rootEvent?.name || rootEvent?.title} ${t('backend.event.occurrenceDeletedSuffix')}` : t('backend.event.occurrenceDeleted'),
          title: rootEvent?.title || rootEvent?.name ? `${rootEvent?.title || rootEvent?.name} ${t('backend.event.occurrenceDeletedSuffix')}` : t('backend.event.occurrenceDeleted'),
          description: rootEvent?.description || '',
          eventType: rootEvent?.eventType || rootEvent?.event_type || EventType.EXPENSE,
          category: rootEvent?.category,
          amount: rootEvent?.amount || rootEvent?.installmentAmount || 0,
          installmentAmount: rootEvent?.installmentAmount || rootEvent?.amount || 0,
          eventId: effectiveSeriesId,
          event_id: effectiveSeriesId,
          sobrepositionOver: effectiveSeriesId,
          date: targetDate,
          version: nextVersion,
          eventVersion: nextVersion,
          isDeleted: true,
          isTerminated: true,
          status: EventStatus.DELETED,
          isRecurring: false,
          periodicity: EventPeriodicity.ONCE
        };
        savedRow = await eventRepository.create(tombstonePayload);
      }

      if (targetDate) {
        const year = parseInt(targetDate.substring(0, 4), 10);
        const month = parseInt(targetDate.substring(5, 7), 10);
        const aliases = Array.from(new Set([effectiveSeriesId, rootEvent?.id, directEvent?.id, id, savedRow?.id].filter(Boolean)));
        await financialEventStatusRepository.deleteStatus(year, month, aliases);
      }
      return true;
    }

    if (directEvent?.date || targetDate) {
      const d = directEvent?.date || targetDate;
      const year = parseInt(d.substring(0, 4), 10);
      const month = parseInt(d.substring(5, 7), 10);
      await financialEventStatusRepository.deleteStatus(year, month, id);
      if (targetSeriesId) {
        await financialEventStatusRepository.deleteStatus(year, month, targetSeriesId);
      }
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
      // Use canonical field names; fall back to legacy names for backward compat
      const cap = inst.installmentCapital ?? inst.principalAmount;
      if (cap != null && !isNaN(Number(cap))) return Math.max(0, Number(cap));
      const total = Number(inst.installmentAmount || inst.amount || 0);
      const interest = Number(inst.installmentInterest ?? inst.interestPortion ?? inst.interestAmount ?? 0);
      if (interest > 0 && interest < total) return Math.round((total - interest) * 100) / 100;
      return Math.round(total * 0.82 * 100) / 100;
    }

    if (strategy === AmortizationStrategy.REDUCE_TERM) {
      await this._recalculateForReduceTerm(loanInstallments, amortVal, amortDate, now, extractInstallmentPrincipal);
    } else {
      await this._recalculateForReduceInstallment(loanInstallments, amortVal, amortDate, now, extractInstallmentPrincipal);
    }
  }

  async _recalculateForReduceTerm(loanInstallments, amortVal, amortDate, now, extractInstallmentPrincipal) {
    const futureUnpaid = loanInstallments
      .filter((ev) => ev.status !== EventStatus.PAID && ev.status !== EventStatus.COMPLETED && !ev.isCompleted && ev.status !== EventStatus.ABATED && ev.status !== EventStatus.AMORTIZED && ev.date >= amortDate)
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
            status: EventStatus.ABATED,
            isCompleted: true,
            installmentAmount: 0,
            installmentCapital: 0,
            installmentInterest: 0,
            installmentFee: 0,
            labels: Array.from(new Set([...(inst.labels || []), t('backend.event.abated')])),
            updatedAt: now
          }
        });
        remainingToDeduct -= instPrincipal;
      } else {
        const newPrincipal = Math.max(0, Math.round((instPrincipal - remainingToDeduct) * 100) / 100);
        const interestPortion = Number(inst.installmentInterest ?? inst.interestPortion ?? inst.interestAmount ?? 0);
        const fee = Number(inst.installmentFee ?? inst.taxAmount ?? 0);
        updates.push({
          id: inst.id,
          data: {
            installmentAmount: Math.round((newPrincipal + interestPortion + fee) * 100) / 100,
            installmentCapital: newPrincipal,
            labels: Array.from(new Set([...(inst.labels || []), t('backend.event.partiallyAbated')])),
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
  }

  async _recalculateForReduceInstallment(loanInstallments, amortVal, amortDate, now, extractInstallmentPrincipal) {
    const amortDateStr = (amortDate || '').substring(0, 10);
    const futureInstallments = loanInstallments.filter(
      (ev) => !isCancelledStatus(ev.status) && (ev.date || '').substring(0, 10) >= amortDateStr
    );
    if (futureInstallments.length > 0) {
      let currentRemainingDebt = futureInstallments.reduce((acc, ev) => acc + extractInstallmentPrincipal(ev), 0);
      if (currentRemainingDebt <= 0) return;

      const firstEv = futureInstallments[0];
      const originalInstallment = Number(firstEv.installmentAmount || firstEv.amount || 0);
      const newFuturePrincipal = Math.max(0, currentRemainingDebt - amortVal);
      const reductionRatio = currentRemainingDebt > 0 ? newFuturePrincipal / currentRemainingDebt : 0;

      const updates = futureInstallments.map((ev) => {
        const origCap = Number(ev.installmentCapital ?? ev.principalAmount ?? Math.round((ev.installmentAmount || ev.amount || originalInstallment) * 0.82 * 100) / 100);
        const origJur = Number(ev.installmentInterest ?? ev.interestPortion ?? ev.interestAmount ?? Math.round((ev.installmentAmount || ev.amount || originalInstallment) * 0.18 * 100) / 100);
        const origFee = Number(ev.installmentFee ?? ev.taxAmount ?? 0);
        const newCap = Math.round(origCap * reductionRatio * 100) / 100;
        const newJur = Math.round(origJur * reductionRatio * 100) / 100;
        const newFee = Math.round(origFee * (reductionRatio === 0 ? 0 : 1) * 100) / 100;
        const newTotal = Math.round((newCap + newJur + newFee) * 100) / 100;
        const isFullyAmortized = reductionRatio === 0 || (newCap === 0 && newJur === 0 && newTotal === 0);

        const labels = Array.from(new Set([
          ...(ev.labels || []),
          isFullyAmortized ? t('backend.event.abated') : t('backend.event.partiallyAbated')
        ]));

        return {
          id: ev.id,
          data: {
            installmentAmount: newTotal,
            installmentCapital: newCap,
            installmentInterest: newJur,
            installmentFee: newFee,
            status: isFullyAmortized ? EventStatus.ABATED : ev.status,
            isCompleted: isFullyAmortized ? true : Boolean(ev.isCompleted),
            labels,
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
      const filteredLabels = (ev.labels || []).filter((l) => l !== t('backend.event.abated') && l !== t('backend.event.partiallyAbated') && l !== 'Abatida' && l !== 'Abatida Parcial');
      return {
        id: ev.id,
        data: {
          status: EventStatus.PENDING,
          isAbatida: false,
          isCompleted: false,
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
