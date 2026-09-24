import React, { createContext, useContext, useMemo } from 'react';
import { TimeboardType } from '../enums/index.js';

/**
 * Active timeboard features shared with deeply nested components (cards, modals, headers).
 * - isCondoflow: condominium timeboards hide personal features such as the diary mood.
 */
const TimeboardContext = createContext({ timeboardType: null, isCondoflow: false });

export function TimeboardProvider({ timeboardType = null, children }) {
  const value = useMemo(
    () => ({ timeboardType, isCondoflow: timeboardType === TimeboardType.CONDOFLOW }),
    [timeboardType]
  );
  return <TimeboardContext.Provider value={value}>{children}</TimeboardContext.Provider>;
}

export function useTimeboard() {
  return useContext(TimeboardContext);
}
