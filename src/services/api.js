import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const TOKEN_KEY         = 'nova_token';
const REFRESH_TOKEN_KEY = 'nova_refresh_token';
const LEGACY_KEY        = '@nova_token'; // clave antigua en AsyncStorage

// ── Access token ────────────────────────────────────────────
export const getToken = async () => {
  try {
    const secure = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secure) return secure;
    // Migración única: mueve token legacy sin cifrar a SecureStore
    const legacy = await AsyncStorage.getItem(LEGACY_KEY);
    if (legacy) {
      await SecureStore.setItemAsync(TOKEN_KEY, legacy);
      await AsyncStorage.removeItem(LEGACY_KEY);
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
};

export const setToken   = (t) => SecureStore.setItemAsync(TOKEN_KEY, t);
export const clearToken = async () => {
  await SecureStore.deleteItemAsync(TOKEN_KEY).catch(() => {});
  await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {});
};

// ── Refresh token ────────────────────────────────────────────
export const getRefreshToken   = () => SecureStore.getItemAsync(REFRESH_TOKEN_KEY).catch(() => null);
export const setRefreshToken   = (t) => SecureStore.setItemAsync(REFRESH_TOKEN_KEY, t);
export const clearRefreshToken = () => SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY).catch(() => {});

// ── Renovación automática de access token ───────────────────
let isRefreshing    = false;
let refreshPromise  = null;

async function doRefresh() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error('Sin refresh token');

  const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Refresh fallido');

  await setToken(data.token);
  await setRefreshToken(data.refreshToken);
  return data.token;
}

// ── Función central de peticiones ───────────────────────────
async function req(method, path, body) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Intento de renovación automática en caso de access token expirado
  if (res.status === 401 && path !== '/auth/refresh' && path !== '/auth/login' && path !== '/auth/register') {
    try {
      if (!isRefreshing) {
        isRefreshing   = true;
        refreshPromise = doRefresh().finally(() => {
          isRefreshing  = false;
          refreshPromise = null;
        });
      }
      const newToken = await refreshPromise;

      // Reintento con el nuevo access token
      const retryRes = await fetch(`${API_BASE_URL}${path}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${newToken}` },
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      const retryData = await retryRes.json().catch(() => ({}));
      if (!retryRes.ok) {
        const err = new Error(retryData.error || `Error ${retryRes.status}`);
        err.status = retryRes.status;
        throw err;
      }
      return retryData;
    } catch (refreshErr) {
      // Si ya es un error de API con código conocido, lo relanzamos tal cual
      if (refreshErr.status) throw refreshErr;
      // Refresh fallido: tokens inválidos, hay que volver a hacer login
      await clearToken();
      await clearRefreshToken();
      const err = new Error('Sesión expirada. Inicia sesión de nuevo.');
      err.status = 401;
      throw err;
    }
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `Error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  login:    (username, password) => req('POST', '/auth/login', { username, password }),
  register: (username, name, password) => req('POST', '/auth/register', { username, name, password }),
  me:       () => req('GET', '/auth/me'),
  logout:   (refreshToken) => req('POST', '/auth/logout', { refreshToken }),
  refresh:  (refreshToken) => req('POST', '/auth/refresh', { refreshToken }),

  // Profile
  updateMe:       (data) => req('PUT',    '/auth/me', data),
  changePassword: (data) => req('PUT',    '/auth/me/password', data),
  deleteMe:       ()     => req('DELETE', '/auth/me'),

  // Accounts
  getAccounts:         ()         => req('GET',    '/api/accounts'),
  getArchivedAccounts: ()         => req('GET',    '/api/accounts/archived'),
  addAccount:          (data)     => req('POST',   '/api/accounts', data),
  updateAccount:       (id, data) => req('PUT',    `/api/accounts/${id}`, data),
  archiveAccount:      (id)       => req('DELETE', `/api/accounts/${id}`),

  // Transactions
  getTransactions:   ()         => req('GET',    '/api/transactions'),
  addTransaction:    (data)     => req('POST',   '/api/transactions', data),
  editTransaction:   (id, data) => req('PUT',    `/api/transactions/${id}`, data),
  deleteTransaction: (id)       => req('DELETE', `/api/transactions/${id}`),
  addTransfer:       (data)     => req('POST',   '/api/transactions/transfer', data),

  // Recurring
  getRecurring:    ()         => req('GET',    '/api/recurring'),
  addRecurring:    (data)     => req('POST',   '/api/recurring', data),
  updateRecurring: (id, data) => req('PUT',    `/api/recurring/${id}`, data),
  deleteRecurring: (id)       => req('DELETE', `/api/recurring/${id}`),

  // Savings transfers
  getSavingsTransfers:   ()         => req('GET',    '/api/savings-transfers'),
  addSavingsTransfer:    (data)     => req('POST',   '/api/savings-transfers', data),
  updateSavingsTransfer: (id, data) => req('PUT',    `/api/savings-transfers/${id}`, data),
  deleteSavingsTransfer: (id)       => req('DELETE', `/api/savings-transfers/${id}`),
  applySavingsTransfer:  (id)       => req('POST',   `/api/savings-transfers/${id}/apply`),

  // Financed items
  getFinancedItems:   ()         => req('GET',    '/api/financed-items'),
  addFinancedItem:    (data)     => req('POST',   '/api/financed-items', data),
  updateFinancedItem: (id, data) => req('PUT',    `/api/financed-items/${id}`, data),
  deleteFinancedItem: (id)       => req('DELETE', `/api/financed-items/${id}`),
  applyFinancedItem:  (id)       => req('POST',   `/api/financed-items/${id}/apply`),

  // Budgets
  getBudgets:   ()     => req('GET',    '/api/budgets'),
  addBudget:    (data) => req('POST',   '/api/budgets', data),
  deleteBudget: (id)   => req('DELETE', `/api/budgets/${id}`),

  // Envelopes
  getEnvelopes:   (year, month)        => req('GET',    `/api/envelopes?year=${year}&month=${month}`),
  setEnvelope:    (data)               => req('PUT',    '/api/envelopes', data),
  deleteEnvelope: (catId, year, month) => req('DELETE', `/api/envelopes/${catId}?year=${year}&month=${month}`),

  // Goals
  getGoals:   ()         => req('GET',    '/api/goals'),
  addGoal:    (data)     => req('POST',   '/api/goals', data),
  updateGoal: (id, data) => req('PUT',    `/api/goals/${id}`, data),
  deleteGoal: (id)       => req('DELETE', `/api/goals/${id}`),

  // Debts
  getDebts:   ()         => req('GET',    '/api/debts'),
  addDebt:    (data)     => req('POST',   '/api/debts', data),
  updateDebt: (id, data) => req('PUT',    `/api/debts/${id}`, data),
  deleteDebt: (id)       => req('DELETE', `/api/debts/${id}`),
  payDebt:    (id, data) => req('POST',   `/api/debts/${id}/pay`, data),

  // Loans
  getLoans:    ()         => req('GET',    '/api/loans'),
  addLoan:     (data)     => req('POST',   '/api/loans', data),
  updateLoan:  (id, data) => req('PUT',    `/api/loans/${id}`, data),
  deleteLoan:  (id)       => req('DELETE', `/api/loans/${id}`),
  collectLoan: (id, data) => req('POST',   `/api/loans/${id}/collect`, data),
};
