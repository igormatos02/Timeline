import React, { createContext, useContext, useMemo } from 'react';
import { PersonRole } from '../enums/index.js';
import { Capability, can } from '../../shared/permissions.js';

/**
 * Permissions of the current user on the active timeboard (shared/permissions.js):
 * - role: admin / contributor / individual
 * - isReadOnly: individual member (only their own data, restricted views and filters)
 * - canEdit: create / edit / cancel / correct / delete events
 * - canChangeStatus: mark movements as done, payment date and receipt number
 * - canManage: timelines, pockets, entities, timeboard settings, audit log
 * - canPrint: receipts and reports
 * - canOverride: revert effective movements to pending and delete them (admins, recorded in the audit log)
 */
const permissionsFor = (role, isReadOnly) => ({
  role,
  isReadOnly,
  canEdit: can(role, Capability.EDIT),
  canChangeStatus: can(role, Capability.CHANGE_STATUS),
  canManage: can(role, Capability.MANAGE),
  canPrint: can(role, Capability.PRINT),
  canOverride: can(role, Capability.OVERRIDE)
});

const PermissionsContext = createContext(permissionsFor(PersonRole.ADMIN, false));

export function PermissionsProvider({ role = PersonRole.ADMIN, isReadOnly = false, children }) {
  const effectiveRole = isReadOnly ? PersonRole.INDIVIDUAL : role;
  const value = useMemo(() => permissionsFor(effectiveRole, isReadOnly), [effectiveRole, isReadOnly]);
  return <PermissionsContext.Provider value={value}>{children}</PermissionsContext.Provider>;
}

export function usePermissions() {
  return useContext(PermissionsContext);
}
