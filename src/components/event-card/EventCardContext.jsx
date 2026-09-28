import { createContext, useContext } from 'react';

/**
 * Values of one event card (event, flags, handlers, local state) shared with its sections
 * (event-card/*: header, amount, badges, action buttons, one body per event type), so they do not need
 * to be passed down as props. Provided by TimelineEventInnerItem for its own event only.
 */
const EventCardContext = createContext(null);

export const EventCardProvider = EventCardContext.Provider;

export function useEventCard() {
  return useContext(EventCardContext);
}
