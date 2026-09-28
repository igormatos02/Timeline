import React, { useCallback } from 'react';
import { AmortizationEventCategory, EventPeriodicity, EventType, LoanAmortizationSystem, LoanEventCategory, TimelineStatus, TimelineType, isLoanTimelineType, normalizeTimelineType } from '../../enums/index.js';
import * as api from '../../services/api';
import { generateLoanInstallments } from '../../utils/loanCalculations';
import { generateUUID } from '../../utils/uuid.js';

// Extracted from App.jsx (App).
export function useTimelineActions({
  activeTimeboardId,
  activeTimeboardTimelines,
  activeTimeline,
  editingTimeline,
  rawEvents,
  refreshTimelines,
  setActiveTimelineId,
  setCreateTimelineInitialType,
  setDeletingTimeline,
  setEditingTimeline,
  setIsTimelineModalOpen,
  setIsTimelineSettingsModalOpen,
  setIsUpdatingInstallments,
  setRawEvents,
  setTimelines,
  showToast,
  t,
  timelines
}) {
  const calculatedEventsCount = React.useMemo(() => {
    return (activeTimeline?.events || rawEvents || []).length;
  }, [activeTimeline?.events, rawEvents]);

  // ----------------------------------------------------
  // Timeline Handlers
  // ----------------------------------------------------
  const handleOpenCreateTimeline = (initialType = null) => {
    setEditingTimeline(null);
    const validInitialType = typeof initialType === 'string' ? initialType : null;
    setCreateTimelineInitialType(validInitialType);
    setIsTimelineModalOpen(true);
  };

  const handleOpenEditTimeline = async () => {
    if (!activeTimeline) return;
    let enrichedTimeline = { ...activeTimeline };

    const isLoanType = isLoanTimelineType(activeTimeline.type);

    if (isLoanType) {
      try {
        const contract = await api.fetchLoanContract(activeTimeline.id);
        if (contract) {
          enrichedTimeline = {
            ...enrichedTimeline,
            contractNumber: contract.contractNumber ?? contract.contract_number ?? enrichedTimeline.contractNumber ?? '',
            bankName: contract.bankName ?? contract.bank_name ?? enrichedTimeline.bankName ?? '',
            totalDebt: contract.originalCapital ?? contract.original_capital ?? enrichedTimeline.totalDebt ?? '',
            tanRate: contract.tanRate ?? contract.tan_rate ?? enrichedTimeline.tanRate ?? '',
            spread: contract.spread ?? enrichedTimeline.spread ?? '',
            interestStampTaxRate: contract.installmentStampTax ?? contract.installment_stamp_tax ?? enrichedTimeline.interestStampTaxRate ?? '',
            totalInstallments: contract.totalInstallments ?? contract.total_installments ?? enrichedTimeline.totalInstallments ?? '',
            dueDay: contract.dueDay ?? contract.due_day ?? enrichedTimeline.dueDay ?? 15,
            startDate: contract.startDate ?? contract.start_date ?? enrichedTimeline.startDate,
            system: contract.system || contract.amortizationSystem || enrichedTimeline.system || enrichedTimeline.amortizationSystem || LoanAmortizationSystem.PRICE,
            amortizationSystem: contract.system || contract.amortizationSystem || enrichedTimeline.system || enrichedTimeline.amortizationSystem || LoanAmortizationSystem.PRICE
          };
        }
      } catch (e) {
        console.error('Error fetching loan contract for editing:', e);
      }
      setEditingTimeline(enrichedTimeline);
      setIsTimelineModalOpen(true);
    } else {
      setEditingTimeline(enrichedTimeline);
      setIsTimelineSettingsModalOpen(true);
    }
  };

  const handleSaveComputeStartDate = async (startDateVal) => {
    const balanceTimeline = (activeTimeboardTimelines || []).find(
      (t) => t && t.type === TimelineType.BALANCE
    );
    const targetTimeline = balanceTimeline || activeTimeline;
    if (targetTimeline && targetTimeline.id) {
      try {
        await api.updateTimeline(targetTimeline.id, {
          startDate: startDateVal,
          start_date: startDateVal
        });
        await refreshTimelines();
      } catch (err) {
        console.error('Error saving compute start date:', err);
      }
    }
  };

  const handleSaveTimeline = async (formData) => {
    const isInactive = formData.status === TimelineStatus.INACTIVE;
    const finalStatus = isInactive ? TimelineStatus.INACTIVE : TimelineStatus.ACTIVE;
    const timelineType = normalizeTimelineType(formData.type || editingTimeline?.type || TimelineType.LOAN);
    const isLoan = isLoanTimelineType(timelineType) || isLoanTimelineType(editingTimeline?.type);

    if (editingTimeline && editingTimeline.id) {
      // Update existing timeline
      const updatedData = {
        ...formData,
        type: timelineType,
        status: finalStatus
      };
      const { events, timelines, loanHeaderResult, procedureMetrics, ...timelinePayload } = updatedData;

      if (isLoan) {
        setIsUpdatingInstallments(true);
      }

      try {
        await api.updateTimeline(editingTimeline.id, timelinePayload);

        if (isLoan) {
          const parsedTotalDebt = Number(formData.totalDebt) || 0;
          const parsedTotalInstallments = Number(formData.totalInstallments) || 120;
          const parsedStampTax = Number(
            formData.interestStampTaxRate !== undefined && formData.interestStampTaxRate !== ''
              ? formData.interestStampTaxRate
              : (formData.installmentStampTax !== undefined && formData.installmentStampTax !== ''
                ? formData.installmentStampTax
                : (formData.taxaImpostoSeloJuros !== undefined ? formData.taxaImpostoSeloJuros : 0))
          ) || 0;

          // 1. Obter contrato existente e atualizar
          let existingContract = null;
          try {
            existingContract = await api.fetchLoanContract(editingTimeline.id);
          } catch (e) { }

          const dueDayNum = Number(formData.dueDay) || 15;
          const dueDayStr = dueDayNum.toString().padStart(2, '0');
          const fullStartDateStr = formData.startDate
            ? (formData.startDate.length === 7 ? `${formData.startDate}-${dueDayStr}` : formData.startDate)
            : new Date().toISOString().substring(0, 10);

          const contractPayload = {
            timelineId: editingTimeline.id,
            timeboardId: activeTimeboardId,
            contractName: formData.name,
            contractNumber: formData.contractNumber || '',
            bankName: formData.bankName || '',
            originalCapital: parsedTotalDebt,
            totalInstallments: parsedTotalInstallments,
            dueDay: dueDayNum,
            tanRate: Number(formData.tanRate) || 0,
            spread: Number(formData.spread) || 0,
            installmentStampTax: parsedStampTax,
            startDate: fullStartDateStr,
            system: formData.system || formData.amortizationSystem || LoanAmortizationSystem.PRICE
          };

          if (existingContract && existingContract.id) {
            await api.updateLoanContract(existingContract.id, contractPayload);
          } else {
            await api.createLoanContract(contractPayload);
          }

          // 2. Recalcular sempre os eventos de prestações com os novos valores do contrato
          const newScheduleEvents = generateLoanInstallments({
            totalDebt: parsedTotalDebt,
            totalAmountFinanced: parsedTotalDebt,
            monthlyInstallment: 0,
            totalInstallments: parsedTotalInstallments,
            numberOfInstallments: parsedTotalInstallments,
            tanRate: Number(formData.tanRate) || 0,
            spread: Number(formData.spread) || 0,
            taxaImpostoSeloJuros: parsedStampTax,
            interestStampTaxRate: parsedStampTax,
            startDate: fullStartDateStr,
            debtStartDate: fullStartDateStr,
            dueDay: dueDayNum,
            periodicity: formData.periodicity || formData.aggregation || EventPeriodicity.MONTHLY,
            amortizationSystem: formData.system || formData.amortizationSystem || LoanAmortizationSystem.PRICE
          });

          // Obter eventos existentes desta timeline (garantindo que vêm da API se rawEvents estiver desatualizado)
          let allEventsForTimeline = rawEvents.filter(ev => ev.timelineId === editingTimeline.id || ev.timelineOriginId === editingTimeline.id || ev.timeline_id === editingTimeline.id);
          try {
            const freshEvents = await api.fetchEvents({ timelineId: editingTimeline.id });
            if (freshEvents && freshEvents.length > 0) {
              allEventsForTimeline = freshEvents;
            }
          } catch (e) { }

          // Filtrar apenas as prestações de crédito (excluindo amortizações avulsas) ordenadas por prestação/data
          const existingInstallments = allEventsForTimeline.filter(ev =>
            (ev.eventType === EventType.LOAN_INSTALLMENT || ev.category === LoanEventCategory.LOAN_INSTALLMENT || ev.isSystemLoanEvent) &&
            ev.eventType !== EventType.AMORTIZATION &&
            ev.category !== AmortizationEventCategory.REDUCE_TERM &&
            ev.category !== AmortizationEventCategory.REDUCE_INSTALLMENT
          ).sort((a, b) => {
            const numA = Number(a.installmentNumber || a.installment_number || 0);
            const numB = Number(b.installmentNumber || b.installment_number || 0);
            if (numA && numB) return numA - numB;
            return (a.date || '').localeCompare(b.date || '');
          });

          if (newScheduleEvents.length > 0) {
            const payloadsToSave = [];
            for (let i = 0; i < newScheduleEvents.length; i++) {
              const newEv = newScheduleEvents[i];
              const matchExisting = existingInstallments.find(e => Number(e.installmentNumber || e.installment_number) === Number(newEv.installmentNumber || newEv.installment_number)) || existingInstallments[i];

              if (matchExisting && matchExisting.id) {
                payloadsToSave.push({
                  isUpdate: true,
                  id: matchExisting.id,
                  payload: {
                    ...matchExisting,
                    eventType: EventType.LOAN_INSTALLMENT,
                    category: LoanEventCategory.LOAN_INSTALLMENT,
                    isSystemLoanEvent: true,
                    amount: newEv.installmentAmount ?? newEv.amount,
                    installmentAmount: newEv.installmentAmount ?? newEv.amount,
                    installmentCapital: newEv.installmentCapital,
                    installmentInterest: newEv.installmentInterest,
                    installmentFee: newEv.installmentFee,
                    balanceAfter: newEv.balanceAfter,
                    description: newEv.description,
                    date: newEv.date,
                    dueDate: newEv.date,
                    installmentNumber: newEv.installmentNumber,
                    totalInstallments: newEv.totalInstallments,
                    id: matchExisting.id,
                    timelineId: editingTimeline.id,
                    timelineOriginId: editingTimeline.id,
                    timeboardId: activeTimeboardId
                  }
                });
              } else {
                payloadsToSave.push({
                  isUpdate: false,
                  payload: {
                    ...newEv,
                    amount: newEv.installmentAmount ?? newEv.amount,
                    installmentAmount: newEv.installmentAmount ?? newEv.amount,
                    installmentCapital: newEv.installmentCapital,
                    installmentInterest: newEv.installmentInterest,
                    installmentFee: newEv.installmentFee,
                    eventType: EventType.LOAN_INSTALLMENT,
                    category: LoanEventCategory.LOAN_INSTALLMENT,
                    isSystemLoanEvent: true,
                    timelineId: editingTimeline.id,
                    timelineOriginId: editingTimeline.id,
                    timeboardId: activeTimeboardId
                  }
                });
              }
            }

            // Excluir parcelas excedentes se o total de parcelas diminuiu
            const excessEvents = existingInstallments.filter(e => {
              const instNum = Number(e.installmentNumber || e.installment_number || 0);
              return instNum > newScheduleEvents.length;
            });
            if (excessEvents.length > 0) {
              await Promise.all(excessEvents.map(e => api.deleteEvent(e.id)));
            }

            // 1. Atualizar UI otimisticamente de imediato
            const optimisticEvList = payloadsToSave.map(p => p.payload);
            const excessIds = new Set(excessEvents.map(e => e.id));
            setRawEvents((prev) => {
              const updatedIds = new Set(optimisticEvList.filter(e => e.id).map(e => e.id));
              const filteredPrev = prev.filter(e => !updatedIds.has(e.id) && !excessIds.has(e.id));
              const merged = [...filteredPrev, ...optimisticEvList];
              return merged.sort((a, b) => {
                const instA = Number(a.installmentNumber || a.installment_number || 0);
                const instB = Number(b.installmentNumber || b.installment_number || 0);
                if (instA !== instB && instA > 0 && instB > 0) return instA - instB;
                return (a.date || '').localeCompare(b.date || '');
              });
            });

            // 2. Processar requisições em lotes paralelos (batching)
            const BATCH_SIZE = 10;
            for (let i = 0; i < payloadsToSave.length; i += BATCH_SIZE) {
              const batch = payloadsToSave.slice(i, i + BATCH_SIZE);
              await Promise.all(
                batch.map(item =>
                  item.isUpdate
                    ? api.updateEvent(item.id, item.payload)
                    : api.createEvent(item.payload)
                )
              );
            }
          }
        }

        await refreshTimelines();
        showToast(
          isLoan
            ? t('toast.contractAndInstallmentsUpdatedSuccess')
            : t('toast.timelineUpdatedSuccess'),
          'success'
        );
      } catch (err) {
        console.error('Error updating timeline and loan contract:', err);
        showToast(
          t('toast.timelineUpdateError', { error: err.message || '' }),
          'error'
        );
      } finally {
        setIsUpdatingInstallments(false);
      }
    } else {
      // Create new timeline
      const newTimelineId = generateUUID();
      const newTl = {
        ...formData,
        id: newTimelineId,
        type: timelineType,
        status: finalStatus,
        timeboardId: activeTimeboardId,
        events: formData.events || []
      };

      setTimelines((prev) => [newTl, ...prev]);
      setActiveTimelineId(newTl.id);

      if (isLoan) {
        setIsUpdatingInstallments(true);
      }

      try {
        // 1. Create Timeline (strip embedded events array from timeline payload)
        const { events, timelines, loanHeaderResult, procedureMetrics, ...createPayload } = newTl;
        await api.createTimeline(createPayload);

        // 2. If it's a Loan Timeline, create the Loan Contract first, then generate Installments
        const parsedTotalDebt = Number(formData.totalDebt) || 0;
        const parsedTotalInstallments = Number(formData.totalInstallments) || 120;
        const dueDayNum = Number(formData.dueDay) || 15;
        const dueDayStr = dueDayNum.toString().padStart(2, '0');
        const fullStartDateStr = formData.startDate
          ? (formData.startDate.length === 7 ? `${formData.startDate}-${dueDayStr}` : formData.startDate)
          : new Date().toISOString().substring(0, 10);
        const parsedStampTax = Number(
          formData.interestStampTaxRate !== undefined && formData.interestStampTaxRate !== ''
            ? formData.interestStampTaxRate
            : (formData.installmentStampTax !== undefined && formData.installmentStampTax !== ''
              ? formData.installmentStampTax
              : (formData.taxaImpostoSeloJuros !== undefined ? formData.taxaImpostoSeloJuros : 0))
        ) || 0;

        if (isLoan) {
          // Create LoanContract record in DB
          await api.createLoanContract({
            timelineId: newTimelineId,
            timeboardId: activeTimeboardId,
            contractName: formData.name,
            contractNumber: formData.contractNumber || '',
            bankName: formData.bankName || '',
            originalCapital: parsedTotalDebt,
            totalInstallments: parsedTotalInstallments,
            dueDay: dueDayNum,
            tanRate: Number(formData.tanRate) || 0,
            spread: Number(formData.spread) || 0,
            installmentStampTax: parsedStampTax,
            startDate: fullStartDateStr,
            system: formData.system || formData.amortizationSystem || LoanAmortizationSystem.PRICE
          });

          // 3. Create financial events for installments directly from simulated/generated events payload
          const chosenAmortizationSystem = formData.system || formData.amortizationSystem || LoanAmortizationSystem.PRICE;
          const installmentEvents = (Array.isArray(formData.events) && formData.events.length > 0)
            ? formData.events
            : (parsedTotalDebt > 0 ? generateLoanInstallments({
              totalDebt: parsedTotalDebt,
              totalAmountFinanced: parsedTotalDebt,
              monthlyInstallment: 0, // PMT formula
              totalInstallments: parsedTotalInstallments,
              numberOfInstallments: parsedTotalInstallments,
              tanRate: Number(formData.tanRate) || 0,
              spread: Number(formData.spread) || 0,
              taxaImpostoSeloJuros: parsedStampTax,
              interestStampTaxRate: parsedStampTax,
              startDate: fullStartDateStr,
              debtStartDate: fullStartDateStr,
              dueDay: dueDayNum,
              periodicity: formData.periodicity || formData.aggregation || EventPeriodicity.MONTHLY,
              amortizationSystem: chosenAmortizationSystem
            }) : []);

          if (installmentEvents.length > 0) {
            const BATCH_SIZE = 10;
            for (let i = 0; i < installmentEvents.length; i += BATCH_SIZE) {
              const batch = installmentEvents.slice(i, i + BATCH_SIZE);
              await Promise.all(
                batch.map((ev) =>
                  api.createEvent({
                    ...ev,
                    eventType: EventType.LOAN_INSTALLMENT,
                    category: LoanEventCategory.LOAN_INSTALLMENT,
                    isSystemLoanEvent: true,
                    timelineId: newTimelineId,
                    timelineOriginId: newTimelineId,
                    timeboardId: activeTimeboardId
                  })
                )
              );
            }
          }
        }

        await refreshTimelines();
        showToast(
          isLoan
            ? t('toast.contractAndInstallmentsCreatedSuccess')
            : t('toast.timelineCreatedSuccess'),
          'success'
        );
      } catch (err) {
        console.error('Error creating timeline, contract or generating loan installments:', err);
        showToast(t('toast.timelineCreateError', { error: err.message || '' }), 'error');
      } finally {
        setIsUpdatingInstallments(false);
      }
    }
  };

  const handleToggleTimelineStatus = async (targetTimeline, newStatus) => {
    if (!targetTimeline || !targetTimeline.id) return;
    setTimelines((prev) =>
      prev.map((tl) => (tl.id === targetTimeline.id ? { ...tl, status: newStatus } : tl))
    );
    try {
      await api.updateTimeline(targetTimeline.id, {
        ...targetTimeline,
        status: newStatus
      });
      await refreshTimelines();
    } catch (err) {
      console.error('Error toggling timeline status:', err);
    }
  };

  const handleRequestDeleteTimeline = useCallback((timelineOrId) => {
    let target = null;
    if (typeof timelineOrId === 'string') {
      target = timelines.find((tl) => tl.id === timelineOrId);
    } else if (
      timelineOrId &&
      typeof timelineOrId === 'object' &&
      timelineOrId.id &&
      typeof timelineOrId.id === 'string' &&
      !timelineOrId.nativeEvent &&
      !timelineOrId._reactName
    ) {
      target = timelineOrId;
    }
    setDeletingTimeline(target || activeTimeline);
  }, [timelines, activeTimeline]);

  return {
    calculatedEventsCount,
    handleOpenCreateTimeline,
    handleOpenEditTimeline,
    handleRequestDeleteTimeline,
    handleSaveComputeStartDate,
    handleSaveTimeline,
    handleToggleTimelineStatus
  };
}
