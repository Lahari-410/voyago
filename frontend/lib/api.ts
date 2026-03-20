// All backend API calls live here
// Components import from this file — never write fetch() directly in a component

const API_URL = 'http://localhost:5000';

// ── TOKEN HELPERS ─────────────────────────────────────────────────────────────
export const getToken = (): string | null =>
  typeof window !== 'undefined' ? localStorage.getItem('voyago_token') : null;

export const setToken = (token: string) =>
  localStorage.setItem('voyago_token', token);

export const removeToken = () =>
  localStorage.removeItem('voyago_token');

// ── BASE FETCH ────────────────────────────────────────────────────────────────
// Adds the Authorization header with JWT token automatically to every request
const apiFetch = async (path: string, options: RequestInit = {}) => {
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Request failed');
  return data;
};

// ── API METHODS ────────────────────────────────────────────────────────────────
export const api = {
  auth: {
    register: (body: { name: string; email: string; password: string; phone: string }) =>
  apiFetch('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),

    login: (body: { email: string; password: string }) =>
      apiFetch('/api/auth/login', { method: 'POST', body: JSON.stringify(body) }),

    me: () => apiFetch('/api/auth/me'),
  },

  bookings: {
    create: (body: object) =>
      apiFetch('/api/bookings', { method: 'POST', body: JSON.stringify(body) }),
    getAll: () => apiFetch('/api/bookings'),
    getOne: (id: string) => apiFetch(`/api/bookings/${id}`),
  },

  rooms: {
    get: (id: string) => apiFetch(`/api/rooms/${id}`),
    reportIssue: (id: string, issue: string) =>
      apiFetch(`/api/rooms/${id}/issues`, { method: 'POST', body: JSON.stringify({ issue }) }),
    createCabSplit: (id: string, body: object) =>
      apiFetch(`/api/rooms/${id}/cab-split`, { method: 'POST', body: JSON.stringify(body) }),
    getCabSplits: (id: string) => apiFetch(`/api/rooms/${id}/cab-splits`),
  },

  payments: {
    createIntent: (body: { bookingId?: string; amount: number; type: string }) =>
      apiFetch('/api/payments/create-intent', { method: 'POST', body: JSON.stringify(body) }),
    confirm: (body: { paymentIntentId: string; bookingId: string }) =>
      apiFetch('/api/payments/confirm', { method: 'POST', body: JSON.stringify(body) }),
  },
};
export default api;