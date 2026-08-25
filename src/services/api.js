/**
 * Frontend API Client for Chrono Timeline Backend
 * Communicates with /api endpoints with seamless multi-tenant header
 */

const API_BASE = '/api';

export const DEFAULT_USER = {
  id: 'user-igor-matos',
  name: 'Igor Matos',
  email: 'igor.matos@timeline.app',
  avatarInitials: 'IM',
  role: 'Administrador',
  tenantId: 'tenant-igor',
  tenantName: 'Workspace Principal'
};

export function getActiveTenantId() {
  return localStorage.getItem('chrono_active_tenant_id') || DEFAULT_USER.tenantId;
}

export function getCurrentUser() {
  const customUser = localStorage.getItem('chrono_active_user');
  if (customUser) {
    try {
      return JSON.parse(customUser);
    } catch { }
  }
  return DEFAULT_USER;
}

function getHeaders(custom = {}) {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': getActiveTenantId(),
    ...custom
  };
}

// Timeboards
export async function fetchTimeboards() {
  const res = await fetch(`${API_BASE}/timeboards`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch timeboards: ${res.statusText}`);
  return res.json();
}

export async function createTimeboard(timeboardData) {
  const res = await fetch(`${API_BASE}/timeboards`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      tenantId: getActiveTenantId(),
      ...timeboardData
    })
  });
  if (!res.ok) throw new Error('Failed to create timeboard');
  return res.json();
}

export async function updateTimeboard(id, updates) {
  const res = await fetch(`${API_BASE}/timeboards/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update timeboard');
  return res.json();
}

export async function deleteTimeboard(id) {
  const res = await fetch(`${API_BASE}/timeboards/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete timeboard');
  return res.json();
}

// Timelines
export async function fetchTimelines(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const res = await fetch(`${API_BASE}/timelines${query ? `?${query}` : ''}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch timelines: ${res.statusText}`);
  return res.json();
}

export async function fetchTimelineById(id, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const res = await fetch(`${API_BASE}/timelines/${id}${query ? `?${query}` : ''}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch timeline ${id}`);
  return res.json();
}

export async function createTimeline(timelineData) {
  const res = await fetch(`${API_BASE}/timelines`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      tenantId: getActiveTenantId(),
      ...timelineData
    })
  });
  if (!res.ok) throw new Error('Failed to create timeline');
  return res.json();
}

export async function updateTimeline(id, updates) {
  const res = await fetch(`${API_BASE}/timelines/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update timeline');
  return res.json();
}

export async function deleteTimeline(id) {
  const res = await fetch(`${API_BASE}/timelines/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to delete timeline');
  return res.json();
}

export async function resetTimeline(id) {
  const res = await fetch(`${API_BASE}/timelines/${id}/reset`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to reset timeline');
  return res.json();
}

// Events
export async function createEvent(eventData) {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      tenantId: getActiveTenantId(),
      ...eventData
    })
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}

export async function updateEvent(id, updates) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json();
}

export async function toggleEventPayment(id) {
  const res = await fetch(`${API_BASE}/events/${id}/toggle-payment`, {
    method: 'POST',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to toggle event payment');
  return res.json();
}

export async function deleteEvent(id, options = {}) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
    body: JSON.stringify(options)
  });
  if (!res.ok) throw new Error('Failed to delete event');
  return res.json();
}

// Loans
export async function amortizeLoan(payload) {
  const res = await fetch(`${API_BASE}/loans/amortize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to process amortization');
  return res.json();
}
