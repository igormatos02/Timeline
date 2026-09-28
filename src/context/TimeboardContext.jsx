import React, { createContext, useContext, useMemo, useState } from 'react';
import { TimeboardType, HeaderDefaultState } from '../enums/index.js';

/**
 * Active timeboard features shared with deeply nested components (cards, modals, headers).
 * - isCondoflow: condominium timeboards hide personal features such as the diary mood.
 * - headerDefaultState: whether the timeline headers start collapsed or expanded.
 * - pockets: pockets of the account (names of the account spaces shown on the movements).
 */
const TimeboardContext = createContext({ timeboardType: null, isCondoflow: false, headerDefaultState: HeaderDefaultState.COLLAPSED, pockets: [] });

export function TimeboardProvider({ timeboardType = null, headerDefaultState = HeaderDefaultState.COLLAPSED, pockets = [], children }) {
  const value = useMemo(
    () => ({ timeboardType, isCondoflow: timeboardType === TimeboardType.CONDOFLOW, headerDefaultState, pockets }),
    [timeboardType, headerDefaultState, pockets]
  );
  return <TimeboardContext.Provider value={value}>{children}</TimeboardContext.Provider>;
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
 * Collapsed state of a timeline header, starting from the timeboard's default
 * and reset to it whenever the setting changes.
 */
export function useHeaderCollapsed() {
  const { headerDefaultState } = useContext(TimeboardContext);
  const defaultCollapsed = headerDefaultState !== HeaderDefaultState.EXPANDED;
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [appliedDefault, setAppliedDefault] = useState(defaultCollapsed);
  if (appliedDefault !== defaultCollapsed) {
    setAppliedDefault(defaultCollapsed);
    setCollapsed(defaultCollapsed);
  }
  return [collapsed, setCollapsed];
}
