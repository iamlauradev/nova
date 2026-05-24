import { useState, useMemo, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

const PINNED_EXPENSE_KEY = '@gasto_rapido_pinned';
const PINNED_INCOME_KEY  = '@ingreso_rapido_pinned';

export function useQuickActions({ transactions, categories, accounts, addTransaction }) {
  const [pinnedCatIds,    setPinnedCatIds]    = useState([]);
  const [pinnedIncomeIds, setPinnedIncomeIds] = useState([]);

  useEffect(() => {
    AsyncStorage.getItem(PINNED_EXPENSE_KEY)
      .then(v => { if (v) setPinnedCatIds(JSON.parse(v)); }).catch(() => {});
    AsyncStorage.getItem(PINNED_INCOME_KEY)
      .then(v => { if (v) setPinnedIncomeIds(JSON.parse(v)); }).catch(() => {});
  }, []);

  const savePinned = useCallback(async (ids) => {
    setPinnedCatIds(ids);
    await AsyncStorage.setItem(PINNED_EXPENSE_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

  const savePinnedIncome = useCallback(async (ids) => {
    setPinnedIncomeIds(ids);
    await AsyncStorage.setItem(PINNED_INCOME_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [quickModal,           setQuickModal]           = useState(null);
  const [quickAmount,          setQuickAmount]          = useState('');
  const [quickAccountId,       setQuickAccountId]       = useState('');
  const [showCatPicker,        setShowCatPicker]        = useState(false);

  const [quickIncomeModal,     setQuickIncomeModal]     = useState(null);
  const [quickIncomeAmount,    setQuickIncomeAmount]    = useState('');
  const [quickIncomeAccountId, setQuickIncomeAccountId] = useState('');
  const [showIncomeCatPicker,  setShowIncomeCatPicker]  = useState(false);

  // ── Frequent cats ────────────────────────────────────────────────────────
  const frequentCats = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
    const counts = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && new Date(t.date) >= cutoff)
        counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([id]) => categories.expense.find(c => c.id === id)).filter(Boolean);
  }, [transactions, categories.expense]);

  const frequentIncomeCats = useMemo(() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 60);
    const counts = {};
    transactions.forEach(t => {
      if (t.type === 'income' && new Date(t.date) >= cutoff)
        counts[t.category] = (counts[t.category] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([id]) => categories.income.find(c => c.id === id)).filter(Boolean);
  }, [transactions, categories.income]);

  const quickCats = useMemo(() => {
    const pinned = pinnedCatIds.map(id => categories.expense.find(c => c.id === id)).filter(Boolean);
    const freqIds = new Set(pinnedCatIds);
    return [...pinned, ...frequentCats.filter(c => !freqIds.has(c.id))].slice(0, 10);
  }, [pinnedCatIds, frequentCats, categories.expense]);

  const quickIncomeCats = useMemo(() => {
    const pinned = pinnedIncomeIds.map(id => categories.income.find(c => c.id === id)).filter(Boolean);
    const pinnedSet = new Set(pinnedIncomeIds);
    return [...pinned, ...frequentIncomeCats.filter(c => !pinnedSet.has(c.id))].slice(0, 10);
  }, [pinnedIncomeIds, frequentIncomeCats, categories.income]);

  // ── Pin / unpin ──────────────────────────────────────────────────────────
  const pinCategory = (catId) => {
    if (!pinnedCatIds.includes(catId)) savePinned([...pinnedCatIds, catId]);
    setShowCatPicker(false);
  };
  const unpinCategory = (catId) => {
    Alert.alert('Quitar acceso rápido', '¿Eliminar de Gastos Rápidos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => savePinned(pinnedCatIds.filter(id => id !== catId)) },
    ]);
  };
  const pinIncomeCategory = (catId) => {
    if (!pinnedIncomeIds.includes(catId)) savePinnedIncome([...pinnedIncomeIds, catId]);
    setShowIncomeCatPicker(false);
  };
  const unpinIncomeCategory = (catId) => {
    Alert.alert('Quitar acceso rápido', '¿Eliminar de Ingresos Rápidos?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Quitar', style: 'destructive', onPress: () => savePinnedIncome(pinnedIncomeIds.filter(id => id !== catId)) },
    ]);
  };

  // ── Quick add handlers ───────────────────────────────────────────────────
  const openQuickAdd = (cat) => {
    setQuickAmount('');
    setQuickAccountId(accounts.find(a => a.type !== 'savings')?.id || '');
    setQuickModal({ cat });
  };
  const confirmQuickAdd = async () => {
    const amt = parseFloat(quickAmount.replace(',', '.'));
    if (!amt || amt <= 0) return Alert.alert('Importe inválido', 'Introduce un importe mayor que 0');
    if (!quickAccountId) return Alert.alert('Cuenta requerida', 'Selecciona una cuenta');
    try {
      await addTransaction({
        type: 'expense', amount: amt, category: quickModal.cat.id,
        accountId: quickAccountId, description: quickModal.cat.name, date: new Date().toISOString(),
      });
      setQuickModal(null);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  const openQuickIncomeAdd = (cat) => {
    setQuickIncomeAmount('');
    setQuickIncomeAccountId(accounts.find(a => a.type !== 'savings')?.id || '');
    setQuickIncomeModal({ cat });
  };
  const confirmQuickIncomeAdd = async () => {
    const amt = parseFloat(quickIncomeAmount.replace(',', '.'));
    if (!amt || amt <= 0) return Alert.alert('Importe inválido', 'Introduce un importe mayor que 0');
    if (!quickIncomeAccountId) return Alert.alert('Cuenta requerida', 'Selecciona una cuenta');
    try {
      await addTransaction({
        type: 'income', amount: amt, category: quickIncomeModal.cat.id,
        accountId: quickIncomeAccountId, description: quickIncomeModal.cat.name, date: new Date().toISOString(),
      });
      setQuickIncomeModal(null);
    } catch (e) { Alert.alert('Error', e.message); }
  };

  return {
    quickCats, pinnedCatIds, pinCategory, unpinCategory,
    quickModal, setQuickModal, quickAmount, setQuickAmount,
    quickAccountId, setQuickAccountId, openQuickAdd, confirmQuickAdd,
    showCatPicker, setShowCatPicker,

    quickIncomeCats, pinnedIncomeIds, pinIncomeCategory, unpinIncomeCategory,
    quickIncomeModal, setQuickIncomeModal, quickIncomeAmount, setQuickIncomeAmount,
    quickIncomeAccountId, setQuickIncomeAccountId, openQuickIncomeAdd, confirmQuickIncomeAdd,
    showIncomeCatPicker, setShowIncomeCatPicker,
  };
}
