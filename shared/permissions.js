import { PersonRole } from './enums/index.js';

/**
 * What each role can do in a timeboard — the single rule used by the server (route guards, service checks)
 * and by the interface (which buttons are shown).
 * - individual: only sees their own data (the server filters it); changes nothing
 * - contributor: operates payments — sees the values, marks movements as paid / received, adds the payment
 *   date and receipt number, comments and prints; never creates, edits, cancels or deletes
 * - admin (the owner is always admin): everything, including reverting effective movements to pending and
 *   deleting them — those overrides are recorded in the audit log
 */
export const Capability = Object.freeze({
  VIEW: 'view',
  PRINT: 'print',
  CHANGE_STATUS: 'change_status', // pending -> effective, payment date, receipt number
  NOTE: 'note',
  EDIT: 'edit', // create / edit / cancel / correct / delete events
  MANAGE: 'manage', // timelines, pockets, loans, entities, members, invitations, timeboard settings, audit log
  OVERRIDE: 'override' // revert effective movements to pending, delete effective movements
});

const ROLE_CAPABILITIES = Object.freeze({
  [PersonRole.ADMIN]: Object.values(Capability),
  [PersonRole.CONTRIBUTOR]: [Capability.VIEW, Capability.PRINT, Capability.CHANGE_STATUS, Capability.NOTE],
  [PersonRole.INDIVIDUAL]: [Capability.VIEW]
});

/** Whether the role has the capability (unknown roles have none). */
export function can(role, capability) {
  return Boolean(role && ROLE_CAPABILITIES[role]?.includes(capability));
}
