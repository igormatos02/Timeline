import React, { createContext, useContext, useMemo } from 'react';

/**
 * Permissions for the current user on the active timeboard.
 * - isReadOnly: the user can only view data (individual role). They may still add notes to events.
 */
const PermissionsContext = createContext({ isReadOnly: false });

export function PermissionsProvider({ isReadOnly = false, children }) {
  const value = useMemo(() => ({ isReadOnly }), [isReadOnly]);
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
