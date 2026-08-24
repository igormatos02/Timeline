/**
 * Frontend API Client for Chrono Timeline Backend
 * Communicates with /api endpoints with seamless fallback
 */

const API_BASE = '/api';

export async function fetchTimelines() {
  const res = await fetch(`${API_BASE}/timelines`);
  if (!res.ok) throw new Error(`Failed to fetch timelines: ${res.statusText}`);
  return res.json();
}

export async function fetchTimelineById(id) {
  const res = await fetch(`${API_BASE}/timelines/${id}`);
  if (!res.ok) throw new Error(`Failed to fetch timeline ${id}`);
  return res.json();
}

export async function createTimeline(timelineData) {
  const res = await fetch(`${API_BASE}/timelines`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(timelineData)
  });
  if (!res.ok) throw new Error('Failed to create timeline');
  return res.json();
}

export async function updateTimeline(id, updates) {
  const res = await fetch(`${API_BASE}/timelines/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update timeline');
  return res.json();
}

export async function deleteTimeline(id) {
  const res = await fetch(`${API_BASE}/timelines/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error('Failed to delete timeline');
  return res.json();
}

// Events
export async function createEvent(eventData) {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventData)
  });
  if (!res.ok) throw new Error('Failed to create event');
  return res.json();
}

export async function updateEvent(id, updates) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update event');
  return res.json();
}

export async function toggleEventPayment(id) {
  const res = await fetch(`${API_BASE}/events/${id}/toggle-payment`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to toggle event payment');
  return res.json();
}

export async function deleteEvent(id, options = {}) {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(options)
  });
  if (!res.ok) throw new Error('Failed to delete event');
  return res.json();
}

// Loans
export async function amortizeLoan(payload) {
  const res = await fetch(`${API_BASE}/loans/amortize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to process amortization');
  return res.json();
}
