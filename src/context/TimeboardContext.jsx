import React, { createContext, useContext, useMemo, useState } from 'react';
import { TimeboardType, HeaderDefaultState } from '../enums/index.js';

/**
 * Active timeboard features shared with deeply nested components (cards, modals, headers).
 * - isCondoflow: condominium timeboards hide personal features such as the diary mood.
 * - headerDefaultState: whether the timeline headers start collapsed or expanded.
 * - pockets: pockets of the account (names of the account spaces shown on the movements).
 */
const TimeboardContext = createContext({ timeboardType: null, isCondoflow: false, headerDefaultState: HeaderDefaultState.COLLAPSED, pockets: [] });

// Open / closed state shared by every timeline header (its own context: toggling it re-renders only the headers)
const HeaderCollapsedContext = createContext(null);

export function TimeboardProvider({ timeboardType = null, headerDefaultState = HeaderDefaultState.COLLAPSED, pockets = [], children }) {
  const value = useMemo(
    () => ({ timeboardType, isCondoflow: timeboardType === TimeboardType.CONDOFLOW, headerDefaultState, pockets }),
    [timeboardType, headerDefaultState, pockets]
  );

  // One state for all headers, so switching timeline or balance mode keeps the header open or closed;
  // it starts from the timeboard's default and is reset to it whenever the setting changes
  const defaultCollapsed = headerDefaultState !== HeaderDefaultState.EXPANDED;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [appliedDefault, setAppliedDefault] = useState(defaultCollapsed);
  if (appliedDefault !== defaultCollapsed) {
    setAppliedDefault(defaultCollapsed);
    setCollapsed(defaultCollapsed);
  }
  const collapsedValue = useMemo(() => [collapsed, setCollapsed], [collapsed]);

  return (
    <TimeboardContext.Provider value={value}>
      <HeaderCollapsedContext.Provider value={collapsedValue}>{children}</HeaderCollapsedContext.Provider>
    </TimeboardContext.Provider>
  );
}

export function useTimeboard() {
  return useContext(TimeboardContext);
}

/** Name of a pocket of the account, or null for the General space / an unknown pocket. */
export function usePocketName() {
  const { pockets } = useContext(TimeboardContext);
  return (pocketId) => (pocketId ? ((pockets || []).find((p) => String(p.id) === String(pocketId))?.name || null) : null);
}

/**
 * Collapsed state of the timeline headers: shared by all of them (see TimeboardProvider); outside a provider
 * each header keeps its own state.
 */
export function useHeaderCollapsed() {
  const shared = useContext(HeaderCollapsedContext);
  const { headerDefaultState } = useContext(TimeboardContext);
  const local = useState(headerDefaultState !== HeaderDefaultState.EXPANDED);
  return shared || local;
}
