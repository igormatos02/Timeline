import { DEFAULT_TENANT } from '../constants/tenant.js';
import { supabase } from './supabaseClient.js';

const API_BASE = '/api';

export const DEFAULT_USER = {
  id: 'user-igor-matos',
  name: 'Igor Matos',
  email: 'igor.matos@timeline.app',
  avatarInitials: 'IM',
  role: 'Administrador',
  tenantId: DEFAULT_TENANT.id,
  tenantName: DEFAULT_TENANT.name
};

export function getActiveTenantId() {
  return localStorage.getItem('chrono_active_tenant_id') || DEFAULT_TENANT.id;
}

export function isUserLoggedIn() {
  const token = localStorage.getItem('chrono_auth_token');
  const user = localStorage.getItem('chrono_active_user');
  return Boolean(token || user);
}

export function getCurrentUser() {
  const customUser = localStorage.getItem('chrono_active_user');
  if (customUser) {
    try {
      return JSON.parse(customUser);
    } catch { }
  }
  return null;
}

export function setCurrentUser(user) {
  if (!user) {
    localStorage.removeItem('chrono_active_user');
    localStorage.removeItem('chrono_auth_token');
    return;
  }
  localStorage.setItem('chrono_active_user', JSON.stringify(user));
  localStorage.setItem('chrono_auth_token', `token_${Date.now()}`);
}

export async function loginWithEmail(email, password) {
  if (!email || !password) {
    throw new Error('Email e palavra-passe são obrigatórios.');
  }

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao iniciar sessão.');
    }

    const name = data.name || email.split('@')[0];
    const initials = name.substring(0, 2).toUpperCase();

    const user = {
      id: data.id,
      name: name,
      email: data.email || email,
      avatarInitials: initials,
      avatarUrl: data.avatarUrl || null,
      googleId: data.googleId || null,
      role: 'Administrador',
      tenantId: DEFAULT_TENANT.id,
      tenantName: DEFAULT_TENANT.name
    };

    setCurrentUser(user);
    return user;
  } catch (err) {
    console.error('[api.loginWithEmail] Error:', err);
    throw err;
  }
}

export async function registerWithEmail(name, email, password) {
  if (!email || !password) {
    throw new Error('Email e palavra-passe são obrigatórios.');
  }

  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ name, email, password })
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao criar conta.');
    }

    const userName = data.name || name || email.split('@')[0];
    const initials = userName.substring(0, 2).toUpperCase();

    const user = {
      id: data.id,
      name: userName,
      email: data.email || email,
      avatarInitials: initials,
      avatarUrl: data.avatarUrl || null,
      googleId: null,
      role: 'Administrador',
      tenantId: DEFAULT_TENANT.id,
      tenantName: DEFAULT_TENANT.name
    };

    setCurrentUser(user);
    return user;
  } catch (err) {
    console.error('[api.registerWithEmail] Error:', err);
    throw err;
  }
}

export async function loginWithGoogle(pendingInvite = null) {
  try {
    let redirectUrl = window.location.origin;
    if (pendingInvite?.timeboardId) {
      const params = new URLSearchParams();
      params.set('inviteTimeboardId', pendingInvite.timeboardId);
      if (pendingInvite.email) params.set('email', pendingInvite.email);
      redirectUrl = `${window.location.origin}/?${params.toString()}`;
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl
      }
    });

    if (error) {
      console.warn('[api.loginWithGoogle] Supabase OAuth warning:', error);

      // Fallback if Google OAuth is not enabled in Supabase Dashboard
      const isProviderDisabled =
        error.message?.includes('provider is not enabled') ||
        error.message?.includes('Unsupported provider') ||
        error.code === 'validation_failed';

      if (isProviderDisabled) {
        // If user came via an invitation link, log them in directly as the invited user
        if (pendingInvite?.email) {
          const simulatedGoogleId = 'google_inv_' + Math.abs(pendingInvite.email.split('').reduce((a, b) => ((a << 5) - a) + b.charCodeAt(0), 0));
          const user = await syncGoogleUser({
            googleId: simulatedGoogleId,
            email: pendingInvite.email,
            name: pendingInvite.name || pendingInvite.email.split('@')[0],
            avatarUrl: null
          });
          return user;
        }

        throw new Error('O login com Google não está ativo no painel do Supabase (Authentication > Providers > Google). Pode ativar lá com o Client ID do Google Cloud ou entrar com Email e Senha abaixo.');
      }

      throw new Error(error.message || 'Falha ao iniciar autenticação com o Google.');
    }

    return data;
  } catch (err) {
    console.error('[api.loginWithGoogle] Error:', err);
    throw err;
  }
}

export async function syncGoogleUser(googlePayload) {
  if (!googlePayload || !googlePayload.googleId) {
    throw new Error('Dados do Google inválidos.');
  }

  try {
    const res = await fetch(`${API_BASE}/auth/google`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(googlePayload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Falha ao autenticar com Google.');
    }

    const userName = data.name || googlePayload.name || (googlePayload.email ? googlePayload.email.split('@')[0] : 'Utilizador Google');
    const initials = userName.substring(0, 2).toUpperCase();

    const user = {
      id: data.id,
      name: userName,
      email: data.email || googlePayload.email,
      avatarInitials: initials,
      avatarUrl: data.avatarUrl || googlePayload.avatarUrl || null,
      googleId: data.googleId || googlePayload.googleId,
      role: 'Administrador',
      tenantId: DEFAULT_TENANT.id,
      tenantName: DEFAULT_TENANT.name
    };

    setCurrentUser(user);
    return user;
  } catch (err) {
    console.error('[api.syncGoogleUser] Error:', err);
    throw err;
  }
}

export async function logoutUser() {
  localStorage.removeItem('chrono_active_user');
  localStorage.removeItem('chrono_auth_token');
  try {
    await supabase.auth.signOut();
  } catch (e) {}
}

function getHeaders(custom = {}) {
  return {
    'Content-Type': 'application/json',
    'x-tenant-id': getActiveTenantId(),
    ...custom
  };
}

// Timeboards
export async function fetchTimeboards(userId = null) {
  const current = getCurrentUser();
  const targetUserId = userId || (current ? current.id : null);
  const url = targetUserId
    ? `${API_BASE}/timeboards?userId=${encodeURIComponent(targetUserId)}`
    : `${API_BASE}/timeboards`;

  const res = await fetch(url, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch timeboards: ${res.statusText}`);
  return res.json();
}

export async function createTimeboard(timeboardData) {
  const current = getCurrentUser();
  const res = await fetch(`${API_BASE}/timeboards`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      tenantId: getActiveTenantId(),
      ownerId: current ? current.id : null,
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

// Timeboard Members (Shared Dashboards)
export async function fetchTimeboardMembers(timeboardId) {
  if (!timeboardId) return [];
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/members`, {
    headers: getHeaders()
  });
  if (!res.ok) return [];
  return res.json();
}

export async function addTimeboardMember(timeboardId, memberUserId) {
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/members`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId: memberUserId })
  });
  if (!res.ok) throw new Error('Failed to add member to timeboard');
  return res.json();
}

export async function removeTimeboardMember(timeboardId, memberUserId) {
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/members/${memberUserId}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Failed to remove member from timeboard');
  return res.json();
}

export async function sendTimeboardInvitation({ timeboardId, personId, email, role, inviterName, invitedBy }) {
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/invite`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ personId, email, role, inviterName, invitedBy })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao enviar convite por email.');
  return data;
}

export async function fetchTimeboardInvitations(timeboardId) {
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/invitations`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error('Falha ao obter lista de convites.');
  return res.json();
}

export async function revokeTimeboardInvitation(timeboardId, invitationId) {
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/invitations/${invitationId}/revoke`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao revogar convite.');
  return data;
}

export async function unlinkPersonMember(timeboardId, personId) {
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/persons/${personId}/unlink`, {
    method: 'POST',
    headers: getHeaders()
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao desvincular membro.');
  return data;
}

export async function acceptTimeboardInvite(timeboardId, userId, email = null) {
  const res = await fetch(`${API_BASE}/timeboards/${timeboardId}/accept-invite`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ userId, email })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Falha ao aceitar convite.');
  return data;
}

// Persons & Organizations (Entities) Cache Helpers
function getLocalPersons(timeboardId) {
  try {
    const key = `chrono_persons_${timeboardId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function setLocalPersons(timeboardId, list) {
  try {
    const key = `chrono_persons_${timeboardId}`;
    localStorage.setItem(key, JSON.stringify(list));
  } catch (e) {
    console.error('Failed to save persons to localStorage:', e);
  }
}

export async function fetchPersons(params = {}) {
  let tbId = '';
  if (typeof params === 'string') {
    tbId = params;
  } else if (params && typeof params === 'object') {
    tbId = params.timeboardId || params.timeboard_id || '';
  }
  if (!tbId) return [];

  try {
    const res = await fetch(`${API_BASE}/persons?timeboardId=${encodeURIComponent(tbId)}`, {
      headers: getHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        const sorted = [...data].sort((a, b) => {
          const typeComp = (a.type || '').toLowerCase().localeCompare((b.type || '').toLowerCase());
          if (typeComp !== 0) return typeComp;
          return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
        });
        setLocalPersons(tbId, sorted);
        return sorted;
      }
    }
  } catch (err) {
    console.warn(`[api.fetchPersons] Network error, loading from local cache:`, err);
  }

  // Fallback to local cache
  const cached = getLocalPersons(tbId);
  return [...cached].sort((a, b) => {
    const typeComp = (a.type || '').toLowerCase().localeCompare((b.type || '').toLowerCase());
    if (typeComp !== 0) return typeComp;
    return (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' });
  });
}

export async function createPerson(personData) {
  const tbId = personData.timeboardId || personData.timeboard_id;
  try {
    const res = await fetch(`${API_BASE}/persons`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(personData)
    });
    if (res.ok) {
      const created = await res.json();
      if (tbId) {
        const current = getLocalPersons(tbId);
        setLocalPersons(tbId, [...current.filter(p => p.id !== created.id), created]);
      }
      return created;
    }
  } catch (err) {
    console.warn(`[api.createPerson] Network error, saving locally:`, err);
  }

  // Local fallback creation
  const localCreated = {
    ...personData,
    id: personData.id || `person_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  if (tbId) {
    const current = getLocalPersons(tbId);
    setLocalPersons(tbId, [...current, localCreated]);
  }
  return localCreated;
}

export async function updatePerson(id, updates) {
  const tbId = updates.timeboardId || updates.timeboard_id;
  try {
    const res = await fetch(`${API_BASE}/persons/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(updates)
    });
    if (res.ok) {
      const updated = await res.json();
      if (tbId) {
        const current = getLocalPersons(tbId);
        setLocalPersons(tbId, current.map(p => (p.id === id ? { ...p, ...updated } : p)));
      }
      return updated;
    }
  } catch (err) {
    console.warn(`[api.updatePerson] Network error, updating locally:`, err);
  }

  // Local fallback update
  if (tbId) {
    const current = getLocalPersons(tbId);
    const existing = current.find(p => p.id === id);
    const updated = { ...existing, ...updates, id, updatedAt: new Date().toISOString() };
    setLocalPersons(tbId, current.map(p => (p.id === id ? updated : p)));
    return updated;
  }
  return { id, ...updates };
}

export async function deletePerson(id, timeboardId = null) {
  try {
    const res = await fetch(`${API_BASE}/persons/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (res.ok) {
      if (timeboardId) {
        const current = getLocalPersons(timeboardId);
        setLocalPersons(timeboardId, current.filter(p => p.id !== id));
      }
      return res.json();
    }
  } catch (err) {
    console.warn(`[api.deletePerson] Network error, removing locally:`, err);
  }

  if (timeboardId) {
    const current = getLocalPersons(timeboardId);
    setLocalPersons(timeboardId, current.filter(p => p.id !== id));
  }
  return { success: true };
}

// Timelines
export async function fetchTimelines(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(
      ([_, v]) => v !== undefined && v !== null && v !== ''
    )
  ).toString();

  const res = await fetch(
    `${API_BASE}/timelines${query ? `?${query}` : ''}`,
    {
      headers: getHeaders()
    }
  );

  if (!res.ok) {
    throw new Error(`Failed to fetch timelines: ${res.statusText}`);
  }

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
export async function fetchEvents(params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([_, v]) => v !== undefined && v !== null && v !== '')
  ).toString();
  const res = await fetch(`${API_BASE}/events${query ? `?${query}` : ''}`, {
    headers: getHeaders()
  });
  if (!res.ok) throw new Error(`Failed to fetch events: ${res.statusText}`);
  return res.json();
}

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

export async function toggleEventPayment(id, status = null) {
  const res = await fetch(`${API_BASE}/events/${id}/toggle-payment`, {
    method: 'POST',
    headers: getHeaders(),
    ...(status ? { body: JSON.stringify({ status }) } : {})
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
export async function fetchLoanContract(timelineId) {
  const res = await fetch(`${API_BASE}/loans/timeline/${timelineId}`, {
    headers: getHeaders()
  });
  if (!res.ok) return null;
  return res.json();
}

export async function createLoanContract(contractData) {
  const res = await fetch(`${API_BASE}/loans`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({
      tenantId: getActiveTenantId(),
      ...contractData
    })
  });
  if (!res.ok) throw new Error('Failed to create loan contract');
  return res.json();
}

export async function updateLoanContract(id, updates) {
  const res = await fetch(`${API_BASE}/loans/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates)
  });
  if (!res.ok) throw new Error('Failed to update loan contract');
  return res.json();
}

export async function amortizeLoan(payload) {
  const res = await fetch(`${API_BASE}/loans/amortize`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to process amortization');
  return res.json();
}
