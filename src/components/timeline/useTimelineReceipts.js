import { useCallback, useMemo, useState } from 'react';
import { buildReceiptHtml, computeNextReceiptNumber, computeReceiptNumber } from '../../utils/receiptGenerator.js';
import * as api from '../../services/api.js';
import { format } from 'date-fns';

// Extracted from VerticalTimeline.jsx (VerticalTimeline).
export function useTimelineReceipts({
  activeTimeboard,
  currentUser,
  language,
  onCorrectEvent,
  onPatchEventLocal,
  persons,
  showToast,
  t,
  timeline,
  timelines
}) {
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [isGeneratingReceipt, setIsGeneratingReceipt] = useState(false);
  const [generatingLabelKey, setGeneratingLabelKey] = useState('receipt.generatingReceipt');

  // Receipts are numbered by the event's own timeline (e.g. income), even when opened from the Balance view
  const resolveReceiptTimeline = useCallback((targetEvent) => {
    const ownTimelineId = targetEvent?.timelineOriginId || targetEvent?.timelineId || targetEvent?.timeline_id;
    return (timelines || []).find((tl) => String(tl.id) === String(ownTimelineId)) || timeline;
  }, [timelines, timeline]);

  // Advances the receipt counter (cont_year) of the given timeline after the receipt number was used
  const advanceReceiptCounter = useCallback(async (receiptTimelineId, usedNumber) => {
    if (!receiptTimelineId || !usedNumber) return;
    const nextReceiptNumber = computeNextReceiptNumber(usedNumber);
    // Keep the in-memory timelines in sync so the next receipt proposes the right number
    [timeline, ...(timelines || [])].forEach((tl) => {
      if (tl && String(tl.id) === String(receiptTimelineId)) {
        tl.contYear = nextReceiptNumber;
        tl.cont_year = nextReceiptNumber;
      }
    });
    try {
      await api.updateTimeline(receiptTimelineId, {
        contYear: nextReceiptNumber,
        cont_year: nextReceiptNumber
      });
    } catch (err) {
      console.error('Error updating timeline cont_year after receipt:', err);
    }
  }, [timeline, timelines]);

  const handleReceiptPrint = useCallback(async () => {
    if (!receiptModalData || !receiptModalData.receiptNumber || !receiptModalData.timelineId) return;
    const { receiptNumber, timelineId, targetEvent, receiptDate } = receiptModalData;

    // Se o evento já possuía cont_year, não avança o contador da timeline
    const hadEventContYear = Boolean(
      (targetEvent?.contYear && targetEvent.contYear > 0) ||
      (targetEvent?.cont_year && targetEvent.cont_year > 0)
    );

    // Salvar o receiptNumber no status do evento na tabela financial_event_status
    if (targetEvent?.id) {
      targetEvent.contYear = receiptNumber;
      targetEvent.cont_year = receiptNumber;
      if (receiptDate) targetEvent.receiptDate = receiptDate;
      // Show the receipt number / payment date on the card right away
      onPatchEventLocal?.(targetEvent.id, {
        contYear: receiptNumber,
        cont_year: receiptNumber,
        ...(receiptDate ? { receiptDate } : {})
      });
      try {
        await api.setEventStatus(targetEvent.id, {
          date: targetEvent.date,
          status: targetEvent.status,
          contYear: receiptNumber,
          cont_year: receiptNumber,
          // The printed receipt carries this payment date: keep it stored
          ...(receiptDate ? { receiptDate } : {}),
          timelineId: targetEvent.timelineId || timelineId,
          timeboardId: activeTimeboard?.id
        });
      } catch (err) {
        console.error('Error saving cont_year in event status:', err);
      }
    }

    // Se o evento ainda NÃO tinha cont_year próprio, incrementa o contador da timeline do recibo
    if (!hadEventContYear) {
      await advanceReceiptCounter(timelineId, receiptNumber);
    }

    // The number is now stored on the occurrence: later changes never advance the counter
    setReceiptModalData((prev) => (prev ? { ...prev, proposedReceiptNumber: null } : prev));
  }, [receiptModalData, activeTimeboard, onPatchEventLocal, advanceReceiptCounter]);

  const handleOpenReceipt = useCallback((targetEvent, targetPerson) => {
    setGeneratingLabelKey('receipt.generatingReceipt');
    setIsGeneratingReceipt(true);
    setTimeout(() => {
      try {
        const receiptTimeline = resolveReceiptTimeline(targetEvent);
        const receiptNumber = computeReceiptNumber(receiptTimeline, targetEvent);
        const hasStoredNumber = Number(targetEvent?.cont_year ?? targetEvent?.contYear) > 0;
        // Saved payment date of this occurrence (receipt_date), or the event date by default
        const receiptDate = targetEvent?.receiptDate || targetEvent?.date || format(new Date(), 'yyyy-MM-dd');
        const html = buildReceiptHtml({
          event: targetEvent,
          timeboard: activeTimeboard,
          timeline: receiptTimeline,
          receiptNumber,
          currentUser,
          obligationPerson: targetPerson,
          persons,
          language,
          t,
          paymentDate: receiptDate
        });
        setReceiptModalData({
          isOpen: true,
          htmlContent: html,
          title: t('receipt.printReceipt'),
          receiptNumber,
          timelineId: receiptTimeline?.id,
          targetEvent,
          targetPerson,
          receiptDate,
          // The receipt number can be changed at any time
          canEditReceiptNumber: true,
          // Automatic proposal (timeline counter): saving it advances the counter, a custom number does not
          proposedReceiptNumber: hasStoredNumber ? null : receiptNumber
        });
      } catch (err) {
        console.error('Error generating receipt HTML:', err);
      } finally {
        setIsGeneratingReceipt(false);
      }
    }, 450);
  }, [activeTimeboard, timeline, currentUser, language, t, persons, resolveReceiptTimeline]);

  // The receipt date can be changed in the receipt modal header: rebuild the document with it
  const handleReceiptDateChange = useCallback((nextDate) => {
    setReceiptModalData((prev) => {
      if (!prev || !prev.targetEvent) return prev;
      const html = buildReceiptHtml({
        event: prev.targetEvent,
        timeboard: activeTimeboard,
        timeline,
        receiptNumber: prev.receiptNumber,
        currentUser,
        obligationPerson: prev.targetPerson,
        persons,
        language,
        t,
        paymentDate: nextDate
      });
      return { ...prev, receiptDate: nextDate, htmlContent: html };
    });
  }, [activeTimeboard, timeline, currentUser, persons, language, t]);

  // "Save" in the receipt modal: store the payment date in financial_event_status.receipt_date
  const handleSaveReceiptDate = useCallback(async (nextDate) => {
    const targetEvent = receiptModalData?.targetEvent;
    if (!targetEvent?.id || !nextDate) return;
    try {
      await api.setEventStatus(targetEvent.id, {
        date: targetEvent.date,
        status: targetEvent.status,
        receiptDate: nextDate,
        timelineId: targetEvent.timelineId || timeline?.id,
        timeboardId: activeTimeboard?.id
      });
      // Keep it in memory so the next time the receipt opens it already shows the saved date
      targetEvent.receiptDate = nextDate;
      onPatchEventLocal?.(targetEvent.id, { receiptDate: nextDate });
      setReceiptModalData((prev) => (prev ? { ...prev, receiptDate: nextDate } : prev));
    } catch (err) {
      console.error('Error saving receipt date:', err);
    }
  }, [receiptModalData, timeline, activeTimeboard, onPatchEventLocal]);

  // Receipt number changed in the receipt modal (at any time): stored on the event status; only the sequential proposal advances the counter.
  // Returns { error } with a translated message when it cannot be saved (e.g. number already used).
  const handleSaveReceiptNumber = useCallback(async (rawNumber) => {
    const targetEvent = receiptModalData?.targetEvent;
    const number = Number(rawNumber);
    if (!targetEvent?.id || !Number.isInteger(number) || number <= 0) {
      return { error: t('receipt.numberInvalid') };
    }
    try {
      await api.setEventStatus(targetEvent.id, {
        date: targetEvent.date,
        status: targetEvent.status,
        contYear: number,
        cont_year: number,
        receiptDate: receiptModalData.receiptDate,
        checkReceiptNumber: true,
        timelineId: receiptModalData.timelineId || targetEvent.timelineId || timeline?.id,
        timeboardId: activeTimeboard?.id
      });
    } catch (err) {
      return {
        error: err.code === 'RECEIPT_NUMBER_TAKEN'
          ? t('receipt.numberTaken', { number })
          : t('common.updateFailed', { message: err.message || '' })
      };
    }

    targetEvent.contYear = number;
    targetEvent.cont_year = number;
    onPatchEventLocal?.(targetEvent.id, { contYear: number, cont_year: number });
    // Keeping the automatic number uses the timeline counter: advance it (a custom number does not)
    if (receiptModalData.proposedReceiptNumber && Number(receiptModalData.proposedReceiptNumber) === number) {
      await advanceReceiptCounter(receiptModalData.timelineId, number);
    }
    setReceiptModalData((prev) => {
      if (!prev) return prev;
      const html = buildReceiptHtml({
        event: prev.targetEvent,
        timeboard: activeTimeboard,
        timeline,
        receiptNumber: number,
        currentUser,
        obligationPerson: prev.targetPerson,
        persons,
        language,
        t,
        paymentDate: prev.receiptDate
      });
      return { ...prev, receiptNumber: number, htmlContent: html, proposedReceiptNumber: null };
    });
    return { ok: true };
  }, [receiptModalData, timeline, activeTimeboard, currentUser, persons, language, t, onPatchEventLocal, advanceReceiptCounter]);

  // Payment date changed directly on the event card (ticket): store it and refresh the card at once
  const saveReceiptDate = useCallback(async (targetEvent, nextDate) => {
    if (!targetEvent?.id || !nextDate) return false;
    try {
      await api.setEventStatus(targetEvent.id, {
        date: targetEvent.date,
        status: targetEvent.status,
        receiptDate: nextDate,
        timelineId: targetEvent.timelineOriginId || targetEvent.timelineId || timeline?.id,
        timeboardId: activeTimeboard?.id
      });
      onPatchEventLocal?.(targetEvent.id, { receiptDate: nextDate });
      return true;
    } catch (err) {
      console.error('Error saving receipt date from the card:', err);
      return false;
    }
  }, [timeline, activeTimeboard, onPatchEventLocal]);

  // Next sequential receipt number proposed for an event without a stored one (its own timeline counter)
  const getProposedReceiptNumber = useCallback(
    (targetEvent) => computeReceiptNumber(resolveReceiptTimeline(targetEvent), targetEvent),
    [resolveReceiptTimeline]
  );

  // Receipt number added directly on the event card (ticket). Same rules as the receipt modal:
  // must be unique in the timeline, and only the proposed sequential number advances the counter.
  // Returns { ok } or { error } with a translated message.
  const saveReceiptNumber = useCallback(async (targetEvent, rawNumber) => {
    const number = Number(rawNumber);
    if (!targetEvent?.id || !Number.isInteger(number) || number <= 0) {
      return { error: t('receipt.numberInvalid') };
    }
    const receiptTimeline = resolveReceiptTimeline(targetEvent);
    // Only the first number of an occurrence can be the timeline's sequential proposal (which advances the counter)
    const hadStoredNumber = Number(targetEvent.cont_year ?? targetEvent.contYear) > 0;
    const proposedNumber = hadStoredNumber ? null : Number(computeReceiptNumber(receiptTimeline, targetEvent));
    try {
      await api.setEventStatus(targetEvent.id, {
        date: targetEvent.date,
        status: targetEvent.status,
        contYear: number,
        cont_year: number,
        receiptDate: targetEvent.receiptDate || targetEvent.date,
        checkReceiptNumber: true,
        timelineId: receiptTimeline?.id || targetEvent.timelineId || timeline?.id,
        timeboardId: activeTimeboard?.id
      });
    } catch (err) {
      return {
        error: err.code === 'RECEIPT_NUMBER_TAKEN'
          ? t('receipt.numberTaken', { number })
          : t('common.updateFailed', { message: err.message || '' })
      };
    }
    onPatchEventLocal?.(targetEvent.id, { contYear: number, cont_year: number });
    if (proposedNumber === number) {
      await advanceReceiptCounter(receiptTimeline?.id, number);
    }
    return { ok: true };
  }, [t, resolveReceiptTimeline, timeline, activeTimeboard, onPatchEventLocal, advanceReceiptCounter]);

  // Comments of one occurrence (year / month): stored in financial_event_notes, not on the event itself
  const addEventNote = useCallback(async (targetEvent, content) => {
    if (!targetEvent?.id || !content) return false;
    try {
      const note = await api.addEventNote(targetEvent.id, {
        date: targetEvent.date,
        content,
        timelineId: targetEvent.timelineOriginId || targetEvent.timelineId || timeline?.id,
        timeboardId: activeTimeboard?.id,
        authorId: currentUser?.id,
        authorName: currentUser?.name
      });
      const current = Array.isArray(targetEvent.monthNotes) ? targetEvent.monthNotes : [];
      onPatchEventLocal?.(targetEvent.id, { monthNotes: [...current, note] });
      return true;
    } catch (err) {
      showToast(t('common.updateFailed', { message: err.message || '' }), 'error');
      return false;
    }
  }, [timeline, activeTimeboard, currentUser, onPatchEventLocal, showToast, t]);

  const deleteEventNote = useCallback(async (targetEvent, noteId) => {
    if (!targetEvent?.id || !noteId) return false;
    try {
      await api.deleteEventNote(noteId);
      const current = Array.isArray(targetEvent.monthNotes) ? targetEvent.monthNotes : [];
      onPatchEventLocal?.(targetEvent.id, { monthNotes: current.filter((n) => n.id !== noteId) });
      return true;
    } catch (err) {
      showToast(t('common.updateFailed', { message: err.message || '' }), 'error');
      return false;
    }
  }, [onPatchEventLocal, showToast, t]);

  const eventActions = useMemo(
    () => ({
      saveReceiptDate,
      saveReceiptNumber,
      getProposedReceiptNumber,
      addEventNote,
      deleteEventNote,
      correctEvent: onCorrectEvent || null,
      currentUserId: currentUser?.id || null
    }),
    [saveReceiptDate, saveReceiptNumber, getProposedReceiptNumber, addEventNote, deleteEventNote, onCorrectEvent, currentUser?.id]
  );

  return {
    eventActions,
    generatingLabelKey,
    handleOpenReceipt,
    handleReceiptDateChange,
    handleReceiptPrint,
    handleSaveReceiptDate,
    handleSaveReceiptNumber,
    isGeneratingReceipt,
    receiptModalData,
    setGeneratingLabelKey,
    setIsGeneratingReceipt,
    setReceiptModalData
  };
}
