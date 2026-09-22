/**
 * Application Constants
 */

export const DEFAULT_TENANT = Object.freeze({
  id: '9e3c3070-d4db-43be-ab03-3f852a9a81da',
  name: 'Global'
});

export function isGlobalTenant(tenantId, tenantName) {
  if (!tenantId && !tenantName) return true;
  if (tenantId === DEFAULT_TENANT.id) return true;
  const name = (tenantName || '').toLowerCase().trim();
  return name === 'global' || name === 'espaço pessoal' || name === '';
}

