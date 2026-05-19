import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../config';

const TOKEN_KEY     = 'solo_finance_token'; // SecureStore no admite @ en la clave
const LEGACY_KEY    = '@solo_finance_token'; // clave antigua en AsyncStorage

// Al leer el token: migra automáticamente desde AsyncStorage si existe
export const getToken = async () => {
  try {
    const secure = await SecureStore.getItemAsync(TOKEN_KEY);
    if (secure) return secure;
    // Migracion unica: si hay token legacy sin cifrar, moverlo a SecureStore y borrarlo
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
  await AsyncStorage.removeItem(LEGACY_KEY).catch(() => {}); // limpia legacy por si acaso
};

async function req(method, path, body) {
  const token = await getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
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

  // Profile
  updateMe:       (data) => req('PUT',    '/auth/me', data),
  changePassword: (data) => req('PUT',    '/auth/me/password', data),
  deleteMe:       ()     => req('DELETE', '/auth/me'),

  // Accounts
  getAccounts:        ()         => req('GET',    '/api/accounts'),
  getArchivedAccounts:()         => req('GET',    '/api/accounts/archived'),
  addAccount:         (data)     => req('POST',   '/api/accounts', data),
  updateAccount:      (id, data) => req('PUT',    `/api/accounts/${id}`, data),
  archiveAccount:     (id)       => req('DELETE', `/api/accounts/${id}`),

  // Transactions
  getTransactions:  ()         => req('GET',    '/api/transactions'),
  addTransaction:   (data)     => req('POST',   '/api/transactions', data),
  editTransaction:  (id, data) => req('PUT',    `/api/transactions/${id}`, data),
  deleteTransaction:(id)       => req('DELETE', `/api/transactions/${id}`),
  addTransfer:      (data)     => req('POST',   '/api/transactions/transfer', data),

  // Recurring
  getRecurring:   ()         => req('GET',    '/api/recurring'),
  addRecurring:   (data)     => req('POST',   '/api/recurring', data),
  updateRecurring:(id, data) => req('PUT',    `/api/recurring/${id}`, data),
  deleteRecurring:(id)       => req('DELETE', `/api/recurring/${id}`),

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
  getBudgets:  ()     => req('GET',    '/api/budgets'),
  addBudget:   (data) => req('POST',   '/api/budgets', data),
  deleteBudget:(id)   => req('DELETE', `/api/budgets/${id}`),

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
