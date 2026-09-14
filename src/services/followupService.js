const API_BASE = '/api/followups';

export async function getAllFollowups(params = {}) {
  const query = new URLSearchParams();
  if (params.timeboardId) query.set('timeboardId', params.timeboardId);
  if (params.timelineId) query.set('timelineId', params.timelineId);

  const url = `${API_BASE}${query.toString() ? `?${query.toString()}` : ''}`;
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch followups');
  }
  return res.json();
}

export async function getFollowupById(id) {
  const res = await fetch(`${API_BASE}/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch followup');
  }
  return res.json();
}

export async function getFollowupsByEventId(eventId) {
  const res = await fetch(`${API_BASE}/event/${eventId}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to fetch followups by eventId');
  }
  return res.json();
}

export async function createFollowup(data) {
  const res = await fetch(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to create followup');
  }
  return res.json();
}

export async function updateFollowup(id, data) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to update followup');
  }
  return res.json();
}

export async function toggleFollowupStatus(id, status = null) {
  const res = await fetch(`${API_BASE}/${id}/toggle-status`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status })
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to toggle followup status');
  }
  return res.json();
}

export async function deleteFollowup(id) {
  const res = await fetch(`${API_BASE}/${id}`, {
    method: 'DELETE'
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Failed to delete followup');
  }
  return res.json();
}
