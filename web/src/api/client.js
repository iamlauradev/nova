function getToken() {
  return localStorage.getItem('nova_token')
}

async function apiFetch(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(path, { ...options, headers })

  if (res.status === 401) {
    localStorage.removeItem('nova_token')
    localStorage.removeItem('nova_user')
    localStorage.removeItem('nova_refresh')
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error || `HTTP ${res.status}`)
  }

  return res.json()
}

// Auth
export const authApi = {
  login: (data) => apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  register: (data) => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  me: () => apiFetch('/auth/me'),
  updateMe: (data) => apiFetch('/auth/me', { method: 'PUT', body: JSON.stringify(data) }),
  updateEmail: (email) => apiFetch('/auth/me/email', { method: 'PATCH', body: JSON.stringify({ email }) }),
  changePassword: (data) => apiFetch('/auth/me/password', { method: 'PUT', body: JSON.stringify(data) }),
  forgotPassword: (email) => apiFetch('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  resetPassword: (data) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify(data) }),
  logout: (refreshToken) => apiFetch('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
}

// Accounts
export const accountsApi = {
  list: () => apiFetch('/api/accounts'),
  create: (data) => apiFetch('/api/accounts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/accounts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archive: (id) => apiFetch(`/api/accounts/${id}`, { method: 'DELETE' }),
}

// Transactions
export const transactionsApi = {
  list: () => apiFetch('/api/transactions'),
  create: (data) => apiFetch('/api/transactions', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/transactions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/transactions/${id}`, { method: 'DELETE' }),
  transfer: (data) => apiFetch('/api/transactions/transfer', { method: 'POST', body: JSON.stringify(data) }),
}

// Loans
export const loansApi = {
  list: () => apiFetch('/api/loans'),
  create: (data) => apiFetch('/api/loans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/loans/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/loans/${id}`, { method: 'DELETE' }),
  collect: (id, data) => apiFetch(`/api/loans/${id}/collect`, { method: 'POST', body: JSON.stringify(data) }),
}

// Debts
export const debtsApi = {
  list: () => apiFetch('/api/debts'),
  create: (data) => apiFetch('/api/debts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/debts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/debts/${id}`, { method: 'DELETE' }),
  pay: (id, data) => apiFetch(`/api/debts/${id}/pay`, { method: 'POST', body: JSON.stringify(data) }),
}

// Savings transfers
export const savingsApi = {
  list: () => apiFetch('/api/savings-transfers'),
  create: (data) => apiFetch('/api/savings-transfers', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/savings-transfers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/savings-transfers/${id}`, { method: 'DELETE' }),
}

// Goals
export const goalsApi = {
  list: () => apiFetch('/api/goals'),
  create: (data) => apiFetch('/api/goals', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/goals/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/goals/${id}`, { method: 'DELETE' }),
}

// Budgets
export const budgetsApi = {
  list: () => apiFetch('/api/budgets'),
  create: (data) => apiFetch('/api/budgets', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/budgets/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/budgets/${id}`, { method: 'DELETE' }),
}

// Recurring
export const recurringApi = {
  list: () => apiFetch('/api/recurring'),
  create: (data) => apiFetch('/api/recurring', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => apiFetch(`/api/recurring/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id) => apiFetch(`/api/recurring/${id}`, { method: 'DELETE' }),
}

// Admin
export const adminApi = {
  users: (params = {}) => {
    const q = new URLSearchParams(params).toString()
    return apiFetch(`/admin/users${q ? '?' + q : ''}`)
  },
  user: (id) => apiFetch(`/admin/users/${id}`),
  resetPassword: (id) => apiFetch(`/admin/users/${id}/reset-password`, { method: 'POST' }),
  suspend: (id) => apiFetch(`/admin/users/${id}/suspend`, { method: 'PATCH' }),
  stats: () => apiFetch('/admin/stats'),
}
