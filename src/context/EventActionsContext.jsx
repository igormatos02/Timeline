import { createContext, useContext } from 'react';

/**
 * Actions available to event cards without prop drilling through every timeline view.
 * - saveReceiptDate(event, 'yyyy-MM-dd'): stores the payment date of a paid / received occurrence
 * - saveReceiptNumber(event, number): stores the receipt number of an occurrence -> { ok } | { error }
 * - getProposedReceiptNumber(event): next sequential receipt number of the event's timeline
 * - addEventNote(event, text) / deleteEventNote(event, noteId): comments of that occurrence (year / month)
 * - currentUserId: id of the signed-in user (authors can delete their own comments)
 */
const EventActionsContext = createContext({
  saveReceiptDate: null,
  saveReceiptNumber: null,
  getProposedReceiptNumber: null,
  addEventNote: null,
  deleteEventNote: null,
  currentUserId: null
});

export const EventActionsProvider = EventActionsContext.Provider;

export function useEventActions() {
  return useContext(EventActionsContext);
}
