const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    credentials: 'include' // Send and receive HttpOnly cookies
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  try {
    const res = await fetch(url, config);
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const error = new Error(data.message || `Request failed with status ${res.status}`);
      error.status = res.status;
      error.data = data;
      throw error;
    }

    return data;
  } catch (err) {
    if (!err.status && err.message === 'Failed to fetch') {
      const netError = new Error('Unable to connect to SplitSmart server. Please check your network or server status.');
      netError.status = 0;
      throw netError;
    }
    throw err;
  }
}

export const api = {
  // Auth
  register: (body) => request('/auth/register', { method: 'POST', body }),
  login: (body) => request('/auth/login', { method: 'POST', body }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me', { method: 'GET' }),

  // User
  getProfile: () => request('/users/me', { method: 'GET' }),
  updateProfile: (body) => request('/users/me', { method: 'PATCH', body }),

  // Dashboard
  getDashboardSummary: () => request('/dashboard', { method: 'GET' }),

  // Groups
  getGroups: () => request('/groups', { method: 'GET' }),
  getGroupById: (groupId) => request(`/groups/${groupId}`, { method: 'GET' }),
  createGroup: (body) => request('/groups', { method: 'POST', body }),
  updateGroup: (groupId, body) => request(`/groups/${groupId}`, { method: 'PATCH', body }),
  deleteGroup: (groupId) => request(`/groups/${groupId}`, { method: 'DELETE' }),
  addMember: (groupId, body) => request(`/groups/${groupId}/members`, { method: 'POST', body }),

  // Expenses
  createExpense: (groupId, body) => request(`/groups/${groupId}/expenses`, { method: 'POST', body }),
  getGroupExpenses: (groupId, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/groups/${groupId}/expenses${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getAllExpenses: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/expenses${query ? `?${query}` : ''}`, { method: 'GET' });
  },
  getExpenseById: (expenseId) => request(`/expenses/${expenseId}`, { method: 'GET' }),
  updateExpense: (expenseId, body) => request(`/expenses/${expenseId}`, { method: 'PATCH', body }),
  deleteExpense: (expenseId) => request(`/expenses/${expenseId}`, { method: 'DELETE' }),

  // Balances & Settlements
  getBalances: (groupId) => request(`/groups/${groupId}/balances`, { method: 'GET' }),
  getSettlementPlan: (groupId) => request(`/groups/${groupId}/settlement-plan`, { method: 'GET' }),
  getGroupSettlements: (groupId) => request(`/groups/${groupId}/settlements`, { method: 'GET' }),
  createSettlement: (groupId, body) => request(`/groups/${groupId}/settlements`, { method: 'POST', body }),
  getAllSettlements: () => request('/settlements', { method: 'GET' })
};

export default api;
