import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getToken } from '../services/api';
import { API_BASE_URL } from '../config';
import { DEFAULT_CATEGORIES } from '../theme';
import { schedulePaymentReminder, cancelPaymentReminder } from '../utils/notifications';

const CUSTOM_CATS_KEY   = '@nova_custom_cats';
const HIDDEN_CATS_KEY   = '@nova_hidden_cats';
const FinanceContext = createContext(null);

export function FinanceProvider({ children, isAuthenticated }) {
  const [accounts, setAccounts] = useState([]);
  const [archivedAccounts, setArchivedAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [recurringItems, setRecurringItems] = useState([]);
  const [savingsTransfers, setSavingsTransfers] = useState([]);
  const [financedItems, setFinancedItems] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [goals, setGoals] = useState([]);
  const [debts, setDebts] = useState([]);
  const [loans, setLoans] = useState([]);
  const [customCategories, setCustomCategories] = useState({ income: [], expense: [] });
  const [hiddenDefaultCats, setHiddenDefaultCats] = useState({ income: new Set(), expense: new Set() });
  const [isLoaded, setIsLoaded] = useState(false);
  const [syncError, setSyncError] = useState(null);

  useEffect(() => {
    AsyncStorage.multiGet([CUSTOM_CATS_KEY, HIDDEN_CATS_KEY]).then(pairs => {
      const [customRaw, hiddenRaw] = pairs;
      if (customRaw[1]) {
        try { setCustomCategories(JSON.parse(customRaw[1])); } catch (_) {}
      }
      if (hiddenRaw[1]) {
        try {
          const parsed = JSON.parse(hiddenRaw[1]);
          setHiddenDefaultCats({
            income:  new Set(parsed.income  || []),
            expense: new Set(parsed.expense || []),
          });
        } catch (_) {}
      }
    }).catch(() => {});
  }, []);

  const loadAll = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      setSyncError(null);
      setIsLoaded(false);

      const [accs, txs, recs] = await Promise.all([
        api.getAccounts(),
        api.getTransactions(),
        api.getRecurring(),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setRecurringItems(recs);

      const [transfers, financed, buds, gls, archived, dbs, lns] = await Promise.allSettled([
        api.getSavingsTransfers(),
        api.getFinancedItems(),
        api.getBudgets(),
        api.getGoals(),
        api.getArchivedAccounts(),
        api.getDebts(),
        api.getLoans(),
      ]);
      const transfersVal  = transfers.status  === 'fulfilled' ? transfers.value  : [];
      const financedVal   = financed.status   === 'fulfilled' ? financed.value   : [];
      const budsVal       = buds.status       === 'fulfilled' ? buds.value       : [];
      const glsVal        = gls.status        === 'fulfilled' ? gls.value        : [];
      const archivedVal   = archived.status   === 'fulfilled' ? archived.value   : [];
      const debtsVal      = dbs.status        === 'fulfilled' ? dbs.value        : [];
      const loansVal      = lns.status        === 'fulfilled' ? lns.value        : [];

      setSavingsTransfers(transfersVal);
      setFinancedItems(financedVal);
      setBudgets(budsVal);
      setGoals(glsVal);
      setArchivedAccounts(archivedVal);
      setDebts(debtsVal);
      setLoans(loansVal);

      const now = new Date();
      const today = now.getDate();
      const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      const pendingTransfers = transfersVal.filter(t =>
        t.active && t.lastApplied !== yearMonth && today >= t.dayOfMonth
      );
      const pendingFinanced = financedVal.filter(f =>
        f.active && f.lastApplied !== yearMonth && today >= f.dayOfMonth && f.appliedCount < f.months
      );

      if (pendingTransfers.length > 0 || pendingFinanced.length > 0) {
        await Promise.allSettled([
          ...pendingTransfers.map(t => api.applySavingsTransfer(t.id)),
          ...pendingFinanced.map(f => api.applyFinancedItem(f.id)),
        ]);
        const [freshAccs, freshTxs, freshTransfers, freshFinanced] = await Promise.allSettled([
          api.getAccounts(),
          api.getTransactions(),
          api.getSavingsTransfers(),
          api.getFinancedItems(),
        ]);
        if (freshAccs.status      === 'fulfilled') setAccounts(freshAccs.value);
        if (freshTxs.status       === 'fulfilled') setTransactions(freshTxs.value);
        if (freshTransfers.status === 'fulfilled') setSavingsTransfers(freshTransfers.value);
        if (freshFinanced.status  === 'fulfilled') setFinancedItems(freshFinanced.value);
      }
    } catch (e) {
      setSyncError(e.message);
    } finally {
      setIsLoaded(true);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      loadAll();
    } else {
      setAccounts([]); setArchivedAccounts([]); setTransactions([]);
      setRecurringItems([]); setSavingsTransfers([]); setFinancedItems([]);
      setBudgets([]); setGoals([]); setDebts([]); setLoans([]); setIsLoaded(false);
    }
  }, [isAuthenticated, loadAll]);

  const silentRefresh = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [accs, txs, recs] = await Promise.all([
        api.getAccounts(),
        api.getTransactions(),
        api.getRecurring(),
      ]);
      setAccounts(accs);
      setTransactions(txs);
      setRecurringItems(recs);

      const [transfers, financed, buds, gls, dbs, lns] = await Promise.allSettled([
        api.getSavingsTransfers(),
        api.getFinancedItems(),
        api.getBudgets(),
        api.getGoals(),
        api.getDebts(),
        api.getLoans(),
      ]);
      if (transfers.status === 'fulfilled') setSavingsTransfers(transfers.value);
      if (financed.status  === 'fulfilled') setFinancedItems(financed.value);
      if (buds.status      === 'fulfilled') setBudgets(buds.value);
      if (gls.status       === 'fulfilled') setGoals(gls.value);
      if (dbs.status       === 'fulfilled') setDebts(dbs.value);
      if (lns.status       === 'fulfilled') setLoans(lns.value);
      setSyncError(null);
    } catch (_) {}
  }, [isAuthenticated]);

  // ── SSE ───────────────────────────────────────────────────────────────────
  const sseRef = useRef(null);
  useEffect(() => {
    if (!isAuthenticated) { sseRef.current = null; return; }

    let active = true;
    let retryTimeout = null;

    async function connect() {
      if (!active) return;
      try {
        const token = await getToken();
        if (!token || !active) return;

        const res = await fetch(`${API_BASE_URL}/api/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok || !res.body) throw new Error('SSE connection failed');

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        sseRef.current = reader;

        while (active) {
          const { done, value } = await reader.read();
          if (done || !active) break;
          const text = decoder.decode(value, { stream: true });
          if (text.includes('"type":"refresh"')) silentRefresh();
        }
      } catch (_) {
        if (active) retryTimeout = setTimeout(connect, 5_000);
      }
    }

    connect();

    return () => {
      active = false;
      if (retryTimeout) clearTimeout(retryTimeout);
      try { sseRef.current?.cancel(); } catch (_) {}
    };
  }, [isAuthenticated, silentRefresh]);

  // ── AppState ──────────────────────────────────────────────────────────────
  const appStateRef = useRef(AppState.currentState);
  useEffect(() => {
    if (!isAuthenticated) return;

    const sub = AppState.addEventListener('change', nextState => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
        silentRefresh();
      }
    });

    return () => sub.remove();
  }, [isAuthenticated, silentRefresh]);

  // --- Cuentas ---
  const addAccount = useCallback(async (data) => {
    const account = { id: `acc_${Date.now()}`, balance: parseFloat(data.balance) || 0, ...data };
    await api.addAccount(account);
    setAccounts(prev => [...prev, account]);
  }, []);

  const updateAccount = useCallback(async (id, data) => {
    let updated;
    setAccounts(prev => {
      const current = prev.find(a => a.id === id);
      updated = { ...current, ...data };
      return prev.map(a => a.id === id ? updated : a);
    });
    await api.updateAccount(id, updated);
  }, []);

  const archiveAccount = useCallback(async (id) => {
    let acc;
    setAccounts(prev => {
      acc = prev.find(a => a.id === id);
      return prev.filter(a => a.id !== id);
    });
    await api.archiveAccount(id);
    if (acc) setArchivedAccounts(prev => [...prev, { ...acc, archived: 1 }]);
    setRecurringItems(prev => prev.map(r => r.accountId === id ? { ...r, active: false } : r));
    setSavingsTransfers(prev => prev.map(t =>
      (t.fromAccountId === id || t.toAccountId === id) ? { ...t, active: false } : t
    ));
    setFinancedItems(prev => prev.map(f => f.accountId === id ? { ...f, active: false } : f));
  }, []);

  // --- Transacciones ---
  const addTransaction = useCallback(async (data) => {
    const tx = {
      id: `tx_${Date.now()}`,
      date: data.date || new Date().toISOString(),
      notes: '',
      transferGroup: '',
      ...data,
      amount: parseFloat(data.amount),
    };
    await api.addTransaction(tx);
    const delta = tx.type === 'income' ? tx.amount : tx.type === 'expense' ? -tx.amount : 0;
    if (delta !== 0) {
      setAccounts(prev =>
        prev.map(a => a.id === tx.accountId ? { ...a, balance: +(a.balance + delta).toFixed(2) } : a)
      );
    }
    setTransactions(prev => [tx, ...prev]);
  }, []);

  const editTransaction = useCallback(async (id, data) => {
    let old;
    setTransactions(prev => {
      old = prev.find(t => t.id === id);
      return prev.map(t => t.id === id ? { ...t, ...data } : t);
    });
    await api.editTransaction(id, data);
    if (old) {
      const revert = old.type === 'income' ? -old.amount : old.type === 'expense' ? old.amount : 0;
      if (revert !== 0) {
        setAccounts(prev =>
          prev.map(a => a.id === old.accountId ? { ...a, balance: +(a.balance + revert).toFixed(2) } : a)
        );
      }
    }
    const delta = data.type === 'income' ? data.amount : data.type === 'expense' ? -data.amount : 0;
    if (delta !== 0) {
      setAccounts(prev =>
        prev.map(a => a.id === data.accountId ? { ...a, balance: +(a.balance + delta).toFixed(2) } : a)
      );
    }
  }, []);

  const deleteTransaction = useCallback(async (id) => {
    let tx, paired;
    setTransactions(prev => {
      tx = prev.find(t => t.id === id);
      if (tx?.transferGroup) {
        paired = prev.find(t => t.transferGroup === tx.transferGroup && t.id !== id);
      }
      const toRemove = new Set([id, paired?.id].filter(Boolean));
      return prev.filter(t => !toRemove.has(t.id));
    });
    await api.deleteTransaction(id);
    if (tx) {
      const revert = tx.type === 'income' ? -tx.amount : tx.type === 'expense' ? tx.amount : 0;
      if (revert !== 0) {
        setAccounts(prev =>
          prev.map(a => a.id === tx.accountId ? { ...a, balance: +(a.balance + revert).toFixed(2) } : a)
        );
      }
    }
    if (paired) {
      const pRevert = paired.type === 'income' ? -paired.amount : paired.type === 'expense' ? paired.amount : 0;
      if (pRevert !== 0) {
        setAccounts(prev =>
          prev.map(a => a.id === paired.accountId ? { ...a, balance: +(a.balance + pRevert).toFixed(2) } : a)
        );
      }
    }
  }, []);

  const addTransfer = useCallback(async (data) => {
    const result = await api.addTransfer(data);
    const group = result.group || `trf_${Date.now()}`;
    const amount = parseFloat(data.amount);
    const date = data.date || new Date().toISOString();
    const txOut = { id: `tx_out_${Date.now()}`, userId: null, accountId: data.fromAccountId,
      type: 'transfer-out', amount, description: data.description || 'Transferencia',
      category: 'transferencia', date, notes: '', transferGroup: group };
    const txIn  = { id: `tx_in_${Date.now()+1}`, userId: null, accountId: data.toAccountId,
      type: 'transfer-in', amount, description: data.description || 'Transferencia',
      category: 'transferencia', date, notes: '', transferGroup: group };
    setAccounts(prev => prev.map(a => {
      if (a.id === data.fromAccountId) return { ...a, balance: +(a.balance - amount).toFixed(2) };
      if (a.id === data.toAccountId)   return { ...a, balance: +(a.balance + amount).toFixed(2) };
      return a;
    }));
    setTransactions(prev => [txOut, txIn, ...prev]);
  }, []);

  // --- Fijos ---
  const addRecurring = useCallback(async (data) => {
    const item = { id: `rec_${Date.now()}`, active: true, customMonths: 0, ...data, amount: parseFloat(data.amount) };
    await api.addRecurring(item);
    setRecurringItems(prev => [...prev, item]);
    schedulePaymentReminder(item).catch(() => {});
  }, []);

  const updateRecurring = useCallback(async (item) => {
    await api.updateRecurring(item.id, item);
    setRecurringItems(prev => prev.map(r => r.id === item.id ? item : r));
    if (item.active !== false) schedulePaymentReminder(item).catch(() => {});
    else cancelPaymentReminder(item.id).catch(() => {});
  }, []);

  const deleteRecurring = useCallback(async (id) => {
    await api.deleteRecurring(id);
    setRecurringItems(prev => prev.filter(r => r.id !== id));
    cancelPaymentReminder(id).catch(() => {});
  }, []);

  // --- Transferencias de ahorro ---
  const addSavingsTransfer = useCallback(async (data) => {
    const item = { id: `st_${Date.now()}`, active: true, lastApplied: '', ...data, amount: parseFloat(data.amount) };
    setSavingsTransfers(prev => [...prev, item]);
    try { await api.addSavingsTransfer(item); }
    catch (e) { setSavingsTransfers(prev => prev.filter(t => t.id !== item.id)); throw e; }
  }, []);

  const updateSavingsTransfer = useCallback(async (item) => {
    setSavingsTransfers(prev => prev.map(t => t.id === item.id ? item : t));
    try { await api.updateSavingsTransfer(item.id, item); }
    catch (e) { api.getSavingsTransfers().then(setSavingsTransfers).catch(() => {}); throw e; }
  }, []);

  const deleteSavingsTransfer = useCallback(async (id) => {
    setSavingsTransfers(prev => prev.filter(t => t.id !== id));
    try { await api.deleteSavingsTransfer(id); }
    catch (e) { api.getSavingsTransfers().then(setSavingsTransfers).catch(() => {}); throw e; }
  }, []);

  // --- Pagos aplazados ---
  const addFinancedItem = useCallback(async (data) => {
    const monthly = data.monthlyAmount || +(data.totalAmount / data.months).toFixed(2);
    const item = { id: `fi_${Date.now()}`, active: true, appliedCount: 0, lastApplied: '',
      startDate: new Date().toISOString(), ...data, monthlyAmount: monthly,
      totalAmount: parseFloat(data.totalAmount), months: parseInt(data.months) };
    setFinancedItems(prev => [...prev, item]);
    try { await api.addFinancedItem(item); }
    catch (e) { setFinancedItems(prev => prev.filter(f => f.id !== item.id)); throw e; }
  }, []);

  const updateFinancedItem = useCallback(async (item) => {
    setFinancedItems(prev => prev.map(f => f.id === item.id ? item : f));
    try { await api.updateFinancedItem(item.id, item); }
    catch (e) { api.getFinancedItems().then(setFinancedItems).catch(() => {}); throw e; }
  }, []);

  const deleteFinancedItem = useCallback(async (id) => {
    setFinancedItems(prev => prev.filter(f => f.id !== id));
    try { await api.deleteFinancedItem(id); }
    catch (e) { api.getFinancedItems().then(setFinancedItems).catch(() => {}); throw e; }
  }, []);

  const applyFinancedItem = useCallback(async (id) => {
    await api.applyFinancedItem(id);
    const [freshAccs, freshTxs, freshFinanced] = await Promise.allSettled([
      api.getAccounts(),
      api.getTransactions(),
      api.getFinancedItems(),
    ]);
    if (freshAccs.status     === 'fulfilled') setAccounts(freshAccs.value);
    if (freshTxs.status      === 'fulfilled') setTransactions(freshTxs.value);
    if (freshFinanced.status === 'fulfilled') setFinancedItems(freshFinanced.value);
  }, []);

  // --- Presupuestos ---
  const addBudget = useCallback(async (data) => {
    const item = { id: `bud_${Date.now()}`, period: 'monthly', ...data, amount: parseFloat(data.amount) };
    setBudgets(prev => {
      const filtered = prev.filter(b => b.categoryId !== item.categoryId);
      return [...filtered, item];
    });
    try { await api.addBudget(item); }
    catch (e) { api.getBudgets().then(setBudgets).catch(() => {}); throw e; }
  }, []);

  const deleteBudget = useCallback(async (id) => {
    setBudgets(prev => prev.filter(b => b.id !== id));
    try { await api.deleteBudget(id); }
    catch (e) { api.getBudgets().then(setBudgets).catch(() => {}); throw e; }
  }, []);

  // --- Objetivos ---
  const addGoal = useCallback(async (data) => {
    const item = { id: `goal_${Date.now()}`, currentAmount: 0, targetDate: '', accountId: '', icon: '🎯', ...data,
      targetAmount: parseFloat(data.targetAmount) };
    setGoals(prev => [...prev, item]);
    try { await api.addGoal(item); }
    catch (e) { setGoals(prev => prev.filter(g => g.id !== item.id)); throw e; }
  }, []);

  const updateGoal = useCallback(async (id, data) => {
    let updated;
    setGoals(prev => {
      const current = prev.find(g => g.id === id);
      updated = { ...current, ...data };
      return prev.map(g => g.id === id ? updated : g);
    });
    try { await api.updateGoal(id, updated); }
    catch (e) { api.getGoals().then(setGoals).catch(() => {}); throw e; }
  }, []);

  const deleteGoal = useCallback(async (id) => {
    setGoals(prev => prev.filter(g => g.id !== id));
    try { await api.deleteGoal(id); }
    catch (e) { api.getGoals().then(setGoals).catch(() => {}); throw e; }
  }, []);

  // --- Deudas ---
  const addDebt = useCallback(async (data) => {
    const item = {
      id: `debt_${Date.now()}`,
      paidAmount: 0, icon: '🏚️', color: '#7c3aed', notes: '',
      startDate: new Date().toISOString().split('T')[0], targetDate: '', active: 1,
      ...data, totalAmount: parseFloat(data.totalAmount),
    };
    setDebts(prev => [...prev, item]);
    try { await api.addDebt(item); }
    catch (e) { setDebts(prev => prev.filter(d => d.id !== item.id)); throw e; }
  }, []);

  const updateDebt = useCallback(async (id, data) => {
    let updated;
    setDebts(prev => {
      const current = prev.find(d => d.id === id);
      updated = { ...current, ...data };
      return prev.map(d => d.id === id ? updated : d);
    });
    try { await api.updateDebt(id, updated); }
    catch (e) { api.getDebts().then(setDebts).catch(() => {}); throw e; }
  }, []);

  const deleteDebt = useCallback(async (id) => {
    setDebts(prev => prev.filter(d => d.id !== id));
    try { await api.deleteDebt(id); }
    catch (e) { api.getDebts().then(setDebts).catch(() => {}); throw e; }
  }, []);

  const payDebt = useCallback(async (id, { amount, accountId, date, description }) => {
    await api.payDebt(id, { amount, accountId, date, description });
    const [freshAccs, freshTxs, freshDebts] = await Promise.allSettled([
      api.getAccounts(), api.getTransactions(), api.getDebts(),
    ]);
    if (freshAccs.status  === 'fulfilled') setAccounts(freshAccs.value);
    if (freshTxs.status   === 'fulfilled') setTransactions(freshTxs.value);
    if (freshDebts.status === 'fulfilled') setDebts(freshDebts.value);
  }, []);

  // --- Préstamos ---
  const addLoan = useCallback(async (data) => {
    const item = {
      id: `loan_${Date.now()}`,
      collectedAmount: 0, icon: '🤝', color: '#10b981', notes: '',
      startDate: new Date().toISOString().split('T')[0], targetDate: '', active: 1,
      ...data, totalAmount: parseFloat(data.totalAmount),
    };
    setLoans(prev => [...prev, item]);
    try { await api.addLoan(item); }
    catch (e) { setLoans(prev => prev.filter(l => l.id !== item.id)); throw e; }
  }, []);

  const updateLoan = useCallback(async (id, data) => {
    let updated;
    setLoans(prev => {
      const current = prev.find(l => l.id === id);
      updated = { ...current, ...data };
      return prev.map(l => l.id === id ? updated : l);
    });
    try { await api.updateLoan(id, updated); }
    catch (e) { api.getLoans().then(setLoans).catch(() => {}); throw e; }
  }, []);

  const deleteLoan = useCallback(async (id) => {
    setLoans(prev => prev.filter(l => l.id !== id));
    try { await api.deleteLoan(id); }
    catch (e) { api.getLoans().then(setLoans).catch(() => {}); throw e; }
  }, []);

  const collectLoan = useCallback(async (id, { amount, accountId, date, description }) => {
    await api.collectLoan(id, { amount, accountId, date, description });
    const [freshAccs, freshTxs, freshLoans] = await Promise.allSettled([
      api.getAccounts(), api.getTransactions(), api.getLoans(),
    ]);
    if (freshAccs.status  === 'fulfilled') setAccounts(freshAccs.value);
    if (freshTxs.status   === 'fulfilled') setTransactions(freshTxs.value);
    if (freshLoans.status === 'fulfilled') setLoans(freshLoans.value);
  }, []);

  // --- Categorías personalizadas ---
  const addCategory = useCallback(async (catType, category) => {
    setCustomCategories(prev => {
      const updated = {
        ...prev,
        [catType]: [...prev[catType], { ...category, id: `cat_${Date.now()}` }],
      };
      AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const editCategory = useCallback(async (catType, id, updates) => {
    setCustomCategories(prev => {
      const updated = {
        ...prev,
        [catType]: prev[catType].map(c => c.id === id ? { ...c, ...updates } : c),
      };
      AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const deleteCategory = useCallback(async (catType, id) => {
    setCustomCategories(prev => {
      const updated = {
        ...prev,
        [catType]: prev[catType].filter(c => c.id !== id),
      };
      AsyncStorage.setItem(CUSTOM_CATS_KEY, JSON.stringify(updated)).catch(() => {});
      return updated;
    });
  }, []);

  const toggleHideDefaultCat = useCallback(async (catType, id) => {
    setHiddenDefaultCats(prev => {
      const nextSet = new Set(prev[catType]);
      if (nextSet.has(id)) nextSet.delete(id); else nextSet.add(id);
      const next = { ...prev, [catType]: nextSet };
      const serializable = { income: [...next.income], expense: [...next.expense] };
      AsyncStorage.setItem(HIDDEN_CATS_KEY, JSON.stringify(serializable)).catch(() => {});
      return next;
    });
  }, []);

  // --- Computed ---
  const categories = useMemo(() => ({
    income:  [
      ...DEFAULT_CATEGORIES.income.filter(c => !hiddenDefaultCats.income.has(c.id)),
      ...customCategories.income,
    ],
    expense: [
      ...DEFAULT_CATEGORIES.expense.filter(c => !hiddenDefaultCats.expense.has(c.id)),
      ...customCategories.expense,
    ],
  }), [hiddenDefaultCats, customCategories]);

  const totalBalance = useMemo(
    () => accounts.filter(a => a.type !== 'savings').reduce((s, a) => s + a.balance, 0),
    [accounts],
  );
  const totalSavings = useMemo(
    () => accounts.filter(a => a.type === 'savings').reduce((s, a) => s + a.balance, 0),
    [accounts],
  );
  const savingsAccounts = useMemo(() => accounts.filter(a => a.type === 'savings'), [accounts]);

  const monthlyFixed = useMemo(
    () => recurringItems
      .filter(r => r.active && r.type === 'expense' && (r.frequency === 'monthly' || r.customMonths === 1))
      .reduce((s, r) => s + r.amount, 0),
    [recurringItems],
  );
  const freeMoney = useMemo(() => totalBalance - monthlyFixed, [totalBalance, monthlyFixed]);

  const activeDebts = useMemo(() => debts.filter(d => d.active === 1 || d.active === true), [debts]);
  const activeLoans = useMemo(() => loans.filter(l => l.active === 1 || l.active === true), [loans]);

  const getTransactionsByPeriod = useCallback((period) => {
    const now = new Date();
    return transactions.filter(t => {
      const d = new Date(t.date);
      if (period === 'week') { const w = new Date(now); w.setDate(now.getDate()-7); return d >= w; }
      if (period === 'month') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      if (period === 'quarter') { const q = new Date(now); q.setMonth(now.getMonth()-3); return d >= q; }
      return true;
    });
  }, [transactions]);

  const getIncomeExpenseSummary = useCallback((txs) => {
    const realTxs = txs.filter(t => t.type === 'income' || t.type === 'expense');
    const income  = realTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const expense = realTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { income, expense, net: income - expense };
  }, []);

  // ── Memoized context value — prevents cascade re-renders ──────────────────
  const value = useMemo(() => ({
    accounts, archivedAccounts, transactions, recurringItems,
    savingsTransfers, financedItems, budgets, goals, debts, activeDebts,
    loans, activeLoans, categories,
    isLoaded, syncError,
    totalBalance, totalSavings, savingsAccounts, freeMoney, monthlyFixed,
    addAccount, updateAccount, archiveAccount,
    addTransaction, editTransaction, deleteTransaction, addTransfer,
    addRecurring, updateRecurring, deleteRecurring,
    addSavingsTransfer, updateSavingsTransfer, deleteSavingsTransfer,
    addFinancedItem, updateFinancedItem, deleteFinancedItem, applyFinancedItem,
    addBudget, deleteBudget,
    addGoal, updateGoal, deleteGoal,
    addDebt, updateDebt, deleteDebt, payDebt,
    addLoan, updateLoan, deleteLoan, collectLoan,
    addCategory, editCategory, deleteCategory,
    hiddenDefaultCats, toggleHideDefaultCat,
    customCategories,
    getTransactionsByPeriod, getIncomeExpenseSummary,
    reload: loadAll,
  }), [
    accounts, archivedAccounts, transactions, recurringItems,
    savingsTransfers, financedItems, budgets, goals, debts, activeDebts,
    loans, activeLoans, categories,
    isLoaded, syncError,
    totalBalance, totalSavings, savingsAccounts, freeMoney, monthlyFixed,
    addAccount, updateAccount, archiveAccount,
    addTransaction, editTransaction, deleteTransaction, addTransfer,
    addRecurring, updateRecurring, deleteRecurring,
    addSavingsTransfer, updateSavingsTransfer, deleteSavingsTransfer,
    addFinancedItem, updateFinancedItem, deleteFinancedItem, applyFinancedItem,
    addBudget, deleteBudget,
    addGoal, updateGoal, deleteGoal,
    addDebt, updateDebt, deleteDebt, payDebt,
    addLoan, updateLoan, deleteLoan, collectLoan,
    addCategory, editCategory, deleteCategory,
    hiddenDefaultCats, toggleHideDefaultCat,
    customCategories,
    getTransactionsByPeriod, getIncomeExpenseSummary,
    loadAll,
  ]);

  return (
    <FinanceContext.Provider value={value}>
      {children}
    </FinanceContext.Provider>
  );
}

export const useFinance = () => useContext(FinanceContext);
