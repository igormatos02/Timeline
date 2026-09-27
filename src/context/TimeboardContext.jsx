import React, { createContext, useContext, useMemo, useState } from 'react';
import { TimeboardType, HeaderDefaultState } from '../enums/index.js';

/**
 * Active timeboard features shared with deeply nested components (cards, modals, headers).
 * - isCondoflow: condominium timeboards hide personal features such as the diary mood.
 * - headerDefaultState: whether the timeline headers start collapsed or expanded.
 */
const TimeboardContext = createContext({ timeboardType: null, isCondoflow: false, headerDefaultState: HeaderDefaultState.COLLAPSED });

export function TimeboardProvider({ timeboardType = null, headerDefaultState = HeaderDefaultState.COLLAPSED, children }) {
  const value = useMemo(
    () => ({ timeboardType, isCondoflow: timeboardType === TimeboardType.CONDOFLOW, headerDefaultState }),
    [timeboardType, headerDefaultState]
  );
  return <TimeboardContext.Provider value={value}>{children}</TimeboardContext.Provider>;
}

export function useTimeboard() {
  return useContext(TimeboardContext);
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
