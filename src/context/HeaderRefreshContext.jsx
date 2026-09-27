import { createContext, useContext } from 'react';

/**
 * Reloads the timelines and events from the server.
 * Used by the timeline headers so their figures are refreshed every time they are expanded.
 */
const HeaderRefreshContext = createContext(null);

export const HeaderRefreshProvider = HeaderRefreshContext.Provider;

export function useHeaderRefresh() {
  return useContext(HeaderRefreshContext);
}
