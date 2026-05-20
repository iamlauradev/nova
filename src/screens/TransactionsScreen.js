import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, KeyboardAvoidingView, Platform, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRoute } from '@react-navigation/native';
import { useFinance } from '../context/FinanceContext';
import { COLORS, ACCOUNT_TYPES } from '../theme';
import { parseAmount, formatCurrency, formatDate } from '../utils';
import { tapMedium, notifySuccess, notifyError, notifyWarning } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import GlowCard from '../components/GlowCard';
import { Swipeable } from 'react-native-gesture-handler';
import EmojiPicker from '../components/EmojiPicker';
import DateField from '../components/DateField';
import CategoryImage from '../components/CategoryImage';

// ─── Date helpers ──────────────────────────────────────────────────────────────
const todayStr = () => {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
};

const parseDate = (s) => {
  if (!s) return new Date().toISOString().split('T')[0];
  const parts = s.trim().split('/');
  if (parts.length === 3) {
    const [d, m, y] = parts;
    const dt = new Date(`${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`);
    if (!isNaN(dt)) return dt.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
};

const isoToDisplay = (iso) => {
  if (!iso) return todayStr();
  try {
    const [y, m, d] = iso.split('T')[0].split('-');
    return `${d}/${m}/${y}`;
  } catch { return todayStr(); }
};

// ─── Period helpers ────────────────────────────────────────────────────────────
const PERIODS = [
  { key: 'month',  label: 'ESTE MES' },
  { key: 'last',   label: 'MES ANT.' },
  { key: 'all',    label: 'TODO' },
];

function txInPeriod(tx, period) {
  const now = new Date();
  const d = new Date(tx.date);
  if (period === 'all') return true;
  if (period === 'month') {
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }
  if (period === 'last') {
    const last = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return d.getMonth() === last.getMonth() && d.getFullYear() === last.getFullYear();
  }
  return true;
}

// ─── Blank forms ──────────────────────────────────────────────────────────────
const BLANK_FORM = {
  type: 'expense',
  amount: '',
  description: '',
  category: '',
  accountId: '',
  date: todayStr(),
  notes: '',
};

const BLANK_TRANSFER = {
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  description: '',
  date: todayStr(),
};

const BLANK_CAT = { name: '', icon: '⭐' }; // image = clave de emote

// ─── Main screen ──────────────────────────────────────────────────────────────
const PAGE_SIZE = 25;

export default function TransactionsScreen() {
  const route = useRoute();
  const {
    accounts,
    transactions,
    categories,
    addTransaction,
    editTransaction,
    deleteTransaction,
    addCategory,
    addTransfer,
    budgets,
  } = useFinance();

  // ── Filter state ─────────────────────────────────────────────────────────
  const [typeFilter,    setTypeFilter]    = useState('all');
  const [periodFilter,  setPeriodFilter]  = useState('month');
  const [accountFilter, setAccountFilter] = useState(null); // null = todas
  const [search,        setSearch]        = useState('');
  const [visibleCount,  setVisibleCount]  = useState(PAGE_SIZE);
  const [showSearch,    setShowSearch]    = useState(false);

  // ── Modal state ──────────────────────────────────────────────────────────
  const [showModal,        setShowModal]        = useState(false);
  const [editTarget,       setEditTarget]       = useState(null);
  const [form,             setForm]             = useState(BLANK_FORM);
  const [showTransferModal,setShowTransferModal] = useState(false);
  const [transferForm,     setTransferForm]     = useState(BLANK_TRANSFER);
  const [showCatModal,     setShowCatModal]     = useState(false);
  const [newCat,           setNewCat]           = useState(BLANK_CAT);

  // ── Category picker group ────────────────────────────────────────────────
  const [catGroupFilter, setCatGroupFilter] = useState(null);

  useEffect(() => {
    if (route.params?.openAdd) {
      if (route.params.openAdd === 'transfer') {
        setTransferForm(BLANK_TRANSFER);
        setShowTransferModal(true);
      } else {
        setEditTarget(null);
        setForm({ ...BLANK_FORM, type: route.params.openAdd });
        setShowModal(true);
      }
    }
    if (route.params?.search) {
      setSearch(route.params.search);
      setShowSearch(true);
      setPeriodFilter('all');
    }
  }, [route.params?.openAdd, route.params?.search]);

  // ── Filtered transactions ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = transactions;
    // Period
    list = list.filter(t => txInPeriod(t, periodFilter));
    // Type
    if (typeFilter === 'transfer') list = list.filter(t => t.type === 'transfer-in' || t.type === 'transfer-out');
    else if (typeFilter !== 'all') list = list.filter(t => t.type === typeFilter);
    // Account
    if (accountFilter) list = list.filter(t => t.accountId === accountFilter);
    // Search
    if (search.trim()) {
      const q = search.toLowerCase();
      const allCats = [...(categories.income || []), ...(categories.expense || [])];
      list = list.filter(t => {
        const cat = allCats.find(c => c.id === t.category);
        return (
          (t.description || '').toLowerCase().includes(q) ||
          (cat?.name || '').toLowerCase().includes(q) ||
          (t.notes || '').toLowerCase().includes(q) ||
          String(t.amount).includes(q.replace(',', '.'))
        );
      });
    }
    return list.slice().sort((a, b) => new Date(b.date) - new Date(a.date));
  }, [transactions, typeFilter, periodFilter, accountFilter, search, categories]);

  // Reset pagination when filters/search change
  React.useEffect(() => { setVisibleCount(PAGE_SIZE); }, [typeFilter, periodFilter, accountFilter, search]);

  const visibleTxs = filtered.slice(0, visibleCount);
  const hasMore    = visibleCount < filtered.length;

  // ── Period totals ────────────────────────────────────────────────────────
  const totals = useMemo(() => {
    const inc = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return { inc, exp };
  }, [filtered]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  const openAdd = () => { setEditTarget(null); setForm(BLANK_FORM); setCatGroupFilter(null); setShowModal(true); };

  const openEdit = (tx) => {
    setEditTarget(tx);
    setForm({
      type: tx.type,
      amount: String(tx.amount),
      description: tx.description || '',
      category: tx.category || '',
      accountId: tx.accountId,
      date: isoToDisplay(tx.date),
      notes: tx.notes || '',
    });
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditTarget(null); setForm(BLANK_FORM); };

  const handleSave = () => {
    const amount = parseAmount(form.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Introduce un importe válido (ej: 1,65)');
    if (!form.accountId) return Alert.alert('Error', 'Selecciona una cuenta');
    if (!form.category) return Alert.alert('Error', 'Selecciona una categoría');
    const payload = {
      type: form.type,
      amount,
      description: form.description.trim(),
      category: form.category,
      accountId: form.accountId,
      date: parseDate(form.date),
      notes: form.notes.trim(),
    };
    if (editTarget) { editTransaction(editTarget.id, payload); showToast('Movimiento actualizado'); }
    else {
      addTransaction(payload);
      showToast('Movimiento guardado ✓');
      // ── Budget threshold check ───────────────────────────────────────────
      if (payload.type === 'expense' && budgets && budgets.length > 0) {
        const catBudget = budgets.find(b => b.categoryId === payload.category);
        if (catBudget) {
          const now2 = new Date();
          const monthSpent = transactions
            .filter(t =>
              t.type === 'expense' &&
              t.category === payload.category &&
              (() => { const d = new Date(t.date); return d.getMonth() === now2.getMonth() && d.getFullYear() === now2.getFullYear(); })()
            )
            .reduce((s, t) => s + t.amount, 0) + amount;
          const pct = catBudget.amount > 0 ? monthSpent / catBudget.amount : 0;
          if (pct >= 1) {
            setTimeout(() => showToast('🔴 Presupuesto superado en esta categoría', 'error'), 600);
          } else if (pct >= 0.8) {
            setTimeout(() => showToast('🟡 Vas por el ' + Math.round(pct * 100) + '% del presupuesto', 'info'), 600);
          }
        }
      }
    }
    notifySuccess();
    closeModal();
  };

  const handleAddTransfer = () => {
    const amount = parseAmount(transferForm.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Introduce un importe válido');
    if (!transferForm.fromAccountId) return Alert.alert('Error', 'Selecciona cuenta origen');
    if (!transferForm.toAccountId) return Alert.alert('Error', 'Selecciona cuenta destino');
    if (transferForm.fromAccountId === transferForm.toAccountId)
      return Alert.alert('Error', 'Las cuentas deben ser distintas');
    addTransfer({
      fromAccountId: transferForm.fromAccountId,
      toAccountId: transferForm.toAccountId,
      amount,
      description: transferForm.description.trim() || 'Transferencia',
      date: parseDate(transferForm.date),
    });
    notifySuccess();
    showToast('Transferencia guardada ✓');
    setTransferForm(BLANK_TRANSFER);
    setShowTransferModal(false);
  };

  const handleAddCategory = async () => {
    if (!newCat.name.trim()) return Alert.alert('Error', 'Introduce un nombre');
    await addCategory(form.type === 'income' ? 'income' : 'expense', {
      name: newCat.name.trim(),
      icon: newCat.icon,
    });
    setNewCat(BLANK_CAT);
    setShowCatModal(false);
  };

  const confirmDelete = (tx) => {
    Alert.alert('¿Eliminar?', 'Se revertirá el efecto en el saldo de la cuenta.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => { notifyWarning(); deleteTransaction(tx.id); } },
    ]);
  };

  const { showToast } = useToast();

  const exportCSV = async () => {
    try {
      const allCats = [...(categories.income || []), ...(categories.expense || [])];
      const rows = [
        ['Fecha', 'Tipo', 'Importe', 'Descripción', 'Categoría', 'Cuenta', 'Notas'],
        ...filtered.map(t => {
          const cat = allCats.find(c => c.id === t.category);
          const acc = accounts.find(a => a.id === t.accountId);
          const typeLabel = t.type === 'income' ? 'Ingreso' : t.type === 'expense' ? 'Gasto' : 'Transferencia';
          return [
            t.date ? t.date.split('T')[0] : '',
            typeLabel,
            String(t.amount).replace('.', ','),
            `"${(t.description || '').replace(/"/g, '""')}"`,
            `"${(cat?.name || '').replace(/"/g, '""')}"`,
            `"${(acc?.name || '').replace(/"/g, '""')}"`,
            `"${(t.notes || '').replace(/"/g, '""')}"`,
          ];
        }),
      ];
      const csv = rows.map(r => r.join(';')).join('\n');
      const fileName = `nova_${new Date().toISOString().split('T')[0]}.csv`;
      const fileUri = FileSystem.documentDirectory + fileName;
      await FileSystem.writeAsStringAsync(fileUri, csv, { encoding: FileSystem.EncodingType.UTF8 });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: 'Exportar transacciones' });
      } else {
        Alert.alert('Exportado', `Archivo guardado en:\n${fileUri}`);
      }
      notifySuccess();
    } catch (e) {
      Alert.alert('Error', 'No se pudo exportar el CSV');
    }
  };

  const currentCats = form.type === 'income' ? (categories.income || []) : (categories.expense || []);
  const isTransfer = (type) => type === 'transfer-in' || type === 'transfer-out';

  // Group categories for picker
  const catGroups = useMemo(() => {
    const groups = {};
    currentCats.forEach(c => {
      const g = c.group || 'Otros';
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    return groups;
  }, [currentCats]);

  const allGroupNames = [...Object.keys(catGroups), 'ALL'];
  const effectiveGroup = catGroupFilter ?? allGroupNames[0];
  const visibleCats = effectiveGroup === 'ALL'
    ? currentCats
    : (catGroups[effectiveGroup] || []);

  return (
    <View style={styles.bg}>

      {/* ── Top bar: search ── */}
      {showSearch && (
        <View style={styles.searchBar}>
          <Ionicons name="search" size={16} color={COLORS.textMuted} style={{ marginLeft: 12 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar movimientos..."
            placeholderTextColor={COLORS.textDim}
            value={search}
            onChangeText={setSearch}
            autoFocus
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
              <Ionicons name="close-circle" size={16} color={COLORS.textDim} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── Filter bar ── */}
      <View style={styles.filterSection}>
        {/* Period row */}
        <View style={styles.periodRow}>
          {PERIODS.map(p => (
            <TouchableOpacity
              key={p.key}
              style={[styles.periodTab, periodFilter === p.key && styles.periodTabActive]}
              onPress={() => setPeriodFilter(p.key)}
            >
              <Text style={[styles.periodText, periodFilter === p.key && styles.periodTextActive]}>
                {p.label}
              </Text>
            </TouchableOpacity>
          ))}
          <View style={{ marginLeft: 'auto', flexDirection: 'row', gap: 2 }}>
            <TouchableOpacity
              style={[styles.periodTab, { paddingHorizontal: 10 }]}
              onPress={exportCSV}
            >
              <Ionicons name="download-outline" size={15} color={COLORS.textDim} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodTab, { paddingHorizontal: 10 }]}
              onPress={() => { setShowSearch(s => !s); if (showSearch) setSearch(''); }}
            >
              <Ionicons
                name={showSearch ? 'close' : 'search'}
                size={15}
                color={showSearch ? COLORS.primaryLight : COLORS.textDim}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Type row */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
          {[
            { key: 'all',      label: 'TODOS',           color: COLORS.primaryLight, bg: COLORS.primaryGlow, border: COLORS.primary },
            { key: 'income',   label: 'INGRESOS',        color: COLORS.income,       bg: COLORS.incomeGlow,  border: COLORS.income  },
            { key: 'expense',  label: 'GASTOS',          color: COLORS.expense,      bg: COLORS.expenseGlow, border: COLORS.expense  },
            { key: 'transfer', label: 'TRANSFERENCIAS',  color: COLORS.gold,         bg: `${COLORS.gold}22`, border: COLORS.gold    },
          ].map(f => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterTab, typeFilter === f.key && { backgroundColor: f.bg, borderColor: f.border }]}
              onPress={() => setTypeFilter(f.key)}
            >
              <Text style={[styles.filterText, typeFilter === f.key && { color: f.color }]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Account filter row */}
        {accounts.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={styles.filterBarContent}>
            <TouchableOpacity
              style={[styles.filterTab, accountFilter === null && { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary }]}
              onPress={() => setAccountFilter(null)}
            >
              <Text style={[styles.filterText, accountFilter === null && { color: COLORS.primaryLight }]}>TODAS</Text>
            </TouchableOpacity>
            {accounts.map(a => {
              const accType = ACCOUNT_TYPES.find(t => t.id === a.type);
              const active  = accountFilter === a.id;
              return (
                <TouchableOpacity
                  key={a.id}
                  style={[styles.filterTab, active && { backgroundColor: `${a.color}22`, borderColor: a.color }]}
                  onPress={() => setAccountFilter(active ? null : a.id)}
                >
                  <Text style={{ fontSize: 11, marginRight: 4 }}>{accType?.icon || '💳'}</Text>
                  <Text style={[styles.filterText, active && { color: a.color }]}>{a.name.toUpperCase()}</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Totals strip */}
        {(typeFilter === 'all' || typeFilter === 'income' || typeFilter === 'expense') && (
          <View style={styles.totalsRow}>
            {(typeFilter === 'all' || typeFilter === 'income') && (
              <Text style={[styles.totalText, { color: COLORS.income }]}>
                +{formatCurrency(totals.inc)}
              </Text>
            )}
            {typeFilter === 'all' && <Text style={styles.totalSep}>·</Text>}
            {(typeFilter === 'all' || typeFilter === 'expense') && (
              <Text style={[styles.totalText, { color: COLORS.expense }]}>
                -{formatCurrency(totals.exp)}
              </Text>
            )}
          </View>
        )}
      </View>

      {/* ── List ── */}
      {filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="receipt-outline" size={48} color={COLORS.textDim} />
          <Text style={styles.emptyText}>Sin movimientos</Text>
        </View>
      ) : (
        <FlatList
          data={visibleTxs}
          keyExtractor={i => i.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          onEndReached={() => { if (hasMore) setVisibleCount(c => c + PAGE_SIZE); }}
          onEndReachedThreshold={0.3}
          ListFooterComponent={hasMore
            ? () => (
                <View style={styles.loadMoreFooter}>
                  <Text style={styles.loadMoreText}>
                    Mostrando {visibleCount} de {filtered.length} movimientos
                  </Text>
                </View>
              )
            : filtered.length > PAGE_SIZE
              ? () => <View style={styles.loadMoreFooter}><Text style={styles.loadMoreText}>✓ Todos los movimientos</Text></View>
              : null
          }
          renderItem={({ item: tx }) => (
            <TxItem
              tx={tx}
              accounts={accounts}
              categories={categories}
              onEdit={isTransfer(tx.type) ? null : () => openEdit(tx)}
              onDelete={() => confirmDelete(tx)}
            />
          )}
        />
      )}

      {/* ── FABs ── */}
      <View style={styles.fabGroup}>
        <TouchableOpacity
          style={[styles.fab, styles.fabSecondary]}
          onPress={() => { setTransferForm(BLANK_TRANSFER); setShowTransferModal(true); }}
          activeOpacity={0.85}
        >
          <Ionicons name="swap-horizontal" size={22} color={COLORS.gold} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
          <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
          <Ionicons name="add" size={28} color={COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* ═══ Modal Transacción ═══ */}
      <Modal visible={showModal} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheet} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>
              {editTarget ? '[ EDITAR MOVIMIENTO ]' : '[ NUEVO MOVIMIENTO ]'}
            </Text>

            {/* Tipo */}
            <View style={styles.typeToggle}>
              {['expense', 'income'].map(t => (
                <TouchableOpacity
                  key={t}
                  style={[styles.typeBtn, form.type === t && {
                    backgroundColor: t === 'income' ? COLORS.incomeGlow : COLORS.expenseGlow,
                    borderColor: t === 'income' ? COLORS.income : COLORS.expense,
                  }]}
                  onPress={() => { setForm(p => ({ ...p, type: t, category: '' })); setCatGroupFilter(null); }}
                >
                  <Ionicons name={t === 'income' ? 'arrow-up-circle' : 'arrow-down-circle'} size={18}
                    color={form.type === t ? (t === 'income' ? COLORS.income : COLORS.expense) : COLORS.textDim} />
                  <Text style={[styles.typeBtnText, form.type === t && { color: t === 'income' ? COLORS.income : COLORS.expense }]}>
                    {t === 'income' ? 'INGRESO' : 'GASTO'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.fieldLabel}>IMPORTE (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={form.amount}
              onChangeText={v => setForm(p => ({ ...p, amount: v }))}
            />

            <Text style={styles.fieldLabel}>DESCRIPCIÓN (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Compra supermercado"
              placeholderTextColor={COLORS.textDim}
              value={form.description}
              onChangeText={v => setForm(p => ({ ...p, description: v }))}
            />

            <DateField
              label="FECHA"
              value={parseDate(form.date)}
              onChange={iso => setForm(p => ({ ...p, date: isoToDisplay(iso) }))}
            />

            <Text style={styles.fieldLabel}>CUENTA</Text>
            {accounts.length === 0 ? (
              <Text style={styles.noAccountsText}>Primero añade una cuenta en la pestaña "Cuentas"</Text>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {accounts.map(a => (
                    <TouchableOpacity
                      key={a.id}
                      style={[styles.chipBtn, form.accountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                      onPress={() => setForm(p => ({ ...p, accountId: a.id }))}
                    >
                      <Text style={styles.chipText}>{a.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            )}
            {form.accountId ? (() => {
              const selAcc = accounts.find(a => a.id === form.accountId);
              return selAcc ? (
                <Text style={[styles.accountBalHint, { color: selAcc.balance >= 0 ? COLORS.income : COLORS.expense }]}>
                  Saldo: {formatCurrency(selAcc.balance)}
                </Text>
              ) : null;
            })() : null}

            {/* ── Category picker ── */}
            <View style={styles.catLabelRow}>
              <Text style={styles.fieldLabel}>CATEGORÍA</Text>
              <TouchableOpacity onPress={() => { setShowCatModal(true); }} style={styles.newCatBtn}>
                <Ionicons name="add-circle-outline" size={14} color={COLORS.primaryLight} />
                <Text style={styles.newCatBtnText}>NUEVA</Text>
              </TouchableOpacity>
            </View>

            {/* Group filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {allGroupNames.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.groupChip, effectiveGroup === g && styles.groupChipActive]}
                    onPress={() => setCatGroupFilter(g)}
                  >
                    <Text style={[styles.groupChipText, effectiveGroup === g && styles.groupChipTextActive]}>
                      {g === 'ALL' ? 'Todos' : g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={styles.catGrid}>
              {visibleCats.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, form.category === c.id && {
                    backgroundColor: form.type === 'income' ? COLORS.incomeGlow : COLORS.expenseGlow,
                    borderColor: form.type === 'income' ? COLORS.income : COLORS.expense,
                  }]}
                  onPress={() => setForm(p => ({ ...p, category: c.id }))}
                >
                  <CategoryImage image={c.image} icon={c.icon} size={18} />
                  <Text style={styles.catName} numberOfLines={1}>{c.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>NOTAS (opcional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 12 }]}
              placeholder="Añade información adicional..."
              placeholderTextColor={COLORS.textDim}
              multiline
              value={form.notes}
              onChangeText={v => setForm(p => ({ ...p, notes: v }))}
            />

            <View style={[styles.modalActions, { marginTop: 8, marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={closeModal}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSave}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Modal Transferencia ═══ */}
      <Modal visible={showTransferModal} animationType="slide" transparent onRequestClose={() => setShowTransferModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheetStatic}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>[ TRANSFERENCIA ]</Text>

            <Text style={styles.fieldLabel}>IMPORTE (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={transferForm.amount}
              onChangeText={v => setTransferForm(p => ({ ...p, amount: v }))}
            />

            <Text style={styles.fieldLabel}>DESCRIPCIÓN (opcional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Mover a ahorros"
              placeholderTextColor={COLORS.textDim}
              value={transferForm.description}
              onChangeText={v => setTransferForm(p => ({ ...p, description: v }))}
            />

            <DateField
              label="FECHA"
              value={parseDate(transferForm.date)}
              onChange={iso => setTransferForm(p => ({ ...p, date: iso }))}
            />

            <Text style={styles.fieldLabel}>DESDE (origen)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, transferForm.fromAccountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                    onPress={() => setTransferForm(p => ({ ...p, fromAccountId: a.id }))}
                  >
                    <Text style={styles.chipText}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>HACIA (destino)</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {accounts.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    style={[styles.chipBtn, transferForm.toAccountId === a.id && { backgroundColor: `${a.color}33`, borderColor: a.color }]}
                    onPress={() => setTransferForm(p => ({ ...p, toAccountId: a.id }))}
                  >
                    <Text style={styles.chipText}>{a.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginBottom: 8 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowTransferModal(false)}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleAddTransfer}>
                <LinearGradient colors={[COLORS.gold, '#b8860b']} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>TRANSFERIR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ═══ Modal Nueva Categoría (numbered image picker) ═══ */}
      <Modal visible={showCatModal} animationType="slide" transparent onRequestClose={() => setShowCatModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.catModalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>[ NUEVA CATEGORÍA ]</Text>

            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Veterinario"
              placeholderTextColor={COLORS.textDim}
              value={newCat.name}
              onChangeText={v => setNewCat(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>EMOJI</Text>
            <View style={{ flex: 1 }}>
              <EmojiPicker
                selected={newCat.icon}
                onSelect={emoji => setNewCat(p => ({ ...p, icon: emoji }))}
              />
            </View>

            <View style={[styles.modalActions, { marginTop: 12 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowCatModal(false); setNewCat(BLANK_CAT); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleAddCategory}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

// ─── TxItem ───────────────────────────────────────────────────────────────────
const TxItem = React.memo(function TxItem({ tx, accounts, categories, onEdit, onDelete }) {
  const swipeRef = React.useRef(null);
  const account = accounts.find(a => a.id === tx.accountId);
  const isTransferOut = tx.type === 'transfer-out';
  const isTransferIn  = tx.type === 'transfer-in';
  const isTransfer    = isTransferOut || isTransferIn;
  const isIncome      = tx.type === 'income';
  const cats = isIncome ? categories.income : categories.expense;
  const cat  = cats.find(c => c.id === tx.category);

  const iconColor  = isTransferOut ? COLORS.gold : isTransferIn ? `${COLORS.gold}88` : isIncome ? COLORS.income : COLORS.expense;
  const iconBg     = isTransfer ? `${COLORS.gold}22` : 'transparent';
  const iconBorder = isTransferOut ? COLORS.gold : isTransferIn ? `${COLORS.gold}66` : isIncome ? COLORS.income : COLORS.expense;


  const renderLeft = () => (
    <TouchableOpacity
      style={styles.swipeEdit}
      onPress={() => { swipeRef.current?.close(); onEdit && onEdit(); }}
    >
      <Ionicons name="pencil" size={20} color="#fff" />
      <Text style={styles.swipeLabel}>Editar</Text>
    </TouchableOpacity>
  );

  const renderRight = () => (
    <TouchableOpacity
      style={styles.swipeDelete}
      onPress={() => { swipeRef.current?.close(); onDelete && onDelete(); }}
    >
      <Ionicons name="trash" size={20} color="#fff" />
      <Text style={styles.swipeLabel}>Borrar</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable ref={swipeRef} renderLeftActions={onEdit ? renderLeft : null} renderRightActions={renderRight} overshootLeft={false} overshootRight={false}>
    <View style={styles.txRow}>
      <View style={[styles.txIcon, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        {isTransfer ? (
          <Ionicons
            name={isTransferOut ? 'arrow-forward-circle' : 'arrow-back-circle'}
            size={20}
            color={iconColor}
          />
        ) : (
          <CategoryImage image={cat?.image} icon={cat?.icon || '💸'} size={32} />
        )}
      </View>
      <View style={styles.txInfo}>
        <Text style={styles.txName} numberOfLines={1}>
          {tx.description || (isTransfer ? 'Transferencia' : cat?.name || 'Movimiento')}
        </Text>
        <Text style={styles.txMeta}>
          {isTransfer
            ? (isTransferOut ? '↗ Salida' : '↙ Entrada')
            : cat?.name}
          {account ? ` · ${account.name}` : ''}
        </Text>
        <Text style={styles.txDate}>{formatDate(tx.date)}</Text>
        {tx.notes ? <Text style={styles.txNotes} numberOfLines={1}>📝 {tx.notes}</Text> : null}
      </View>
      <View style={styles.txRight}>
        <Text style={[styles.txAmount, { color: isTransferIn ? COLORS.income : isTransferOut ? COLORS.expense : isIncome ? COLORS.income : COLORS.expense }]}>
          {isTransferIn ? '+' : '-'}{formatCurrency(tx.amount)}
        </Text>
        <View style={styles.txActions}>
          {onEdit && (
            <TouchableOpacity onPress={onEdit} style={styles.txActionBtn}>
              <Ionicons name="pencil-outline" size={13} color={COLORS.textDim} />
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onDelete} style={styles.txActionBtn}>
            <Ionicons name="trash-outline" size={13} color={COLORS.textDim} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
    </Swipeable>
  );
});

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },

  // Search
  searchBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  searchInput: {
    flex: 1, color: COLORS.text, fontSize: 14, paddingVertical: 10, paddingHorizontal: 4,
  },

  // Filter section
  filterSection: {
    backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  periodRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, gap: 6,
  },
  periodTab: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  periodTabActive: {
    backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary,
  },
  periodText:       { color: COLORS.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  periodTextActive: { color: COLORS.primaryLight },

  filterBar: { maxHeight: 44 },
  filterBarContent: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingVertical: 6,
  },
  filterTab: {
    paddingHorizontal: 14, paddingVertical: 5, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  filterText: { color: COLORS.textDim, fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },

  totalsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
    paddingBottom: 8,
  },
  totalText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  totalSep:  { color: COLORS.textDim, fontSize: 12 },

  // List
  list: { padding: 16, gap: 8, paddingBottom: 210 },
  loadMoreFooter: { alignItems: 'center', paddingVertical: 16, paddingBottom: 8 },
  loadMoreText: { fontSize: 11, color: COLORS.textDim },
  txRow: {
    flexDirection: 'row', alignItems: 'flex-start',
    backgroundColor: COLORS.bgCard, borderRadius: 4, borderWidth: 1,
    borderColor: COLORS.borderSubtle, padding: 12, gap: 12,
  },
  txIcon: { width: 44, height: 44, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  txMeta: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  txDate: { color: COLORS.textDim, fontSize: 10, marginTop: 2 },
  txNotes: { color: COLORS.textDim, fontSize: 10, marginTop: 3, fontStyle: 'italic' },
  txRight: { alignItems: 'flex-end', gap: 4 },
  txAmount: { fontSize: 14, fontWeight: '800' },
  txActions: { flexDirection: 'row', gap: 2 },
  txActionBtn: { padding: 4 },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { color: COLORS.textMuted, fontSize: 15 },

  // FABs
  fabGroup: {
    position: 'absolute', bottom: 96, right: 20,
    flexDirection: 'column', alignItems: 'center', gap: 10,
  },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: COLORS.primaryGlow, shadowOpacity: 1, shadowRadius: 16, elevation: 10,
  },
  fabSecondary: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: `${COLORS.gold}22`, borderWidth: 1, borderColor: COLORS.gold,
  },

  // Modales base
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 24, maxHeight: '92%',
  },
  modalSheetStatic: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 24, paddingBottom: 40,
  },
  catModalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 24,
    height: '88%', display: 'flex', flexDirection: 'column',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgCardLight, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 4, color: COLORS.text, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
  },
  noAccountsText: { color: COLORS.expense, fontSize: 12, marginBottom: 16 },
  accountBalHint: { fontSize: 11, fontWeight: '700', marginBottom: 14, paddingHorizontal: 2 },
  typeToggle: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  typeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 12, borderRadius: 4, borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  typeBtnText: { color: COLORS.textDim, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  chipBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
  },
  chipText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },

  // Category picker
  catLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  newCatBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  newCatBtnText: { color: COLORS.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  groupChip: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
  },
  groupChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },
  groupChipText: { color: COLORS.textDim, fontSize: 10, fontWeight: '600' },
  groupChipTextActive: { color: COLORS.primaryLight },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
    maxWidth: 150,
  },
  catName: { color: COLORS.text, fontSize: 11, fontWeight: '600', flexShrink: 1 },

  // Numbered image picker
  imagePickerScroll: { maxHeight: 240, marginBottom: 8 },
  imagePickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  imagePickerBtn: {
    width: 50, height: 50, alignItems: 'center', justifyContent: 'center',
    borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
  },
  imagePickerBtnSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryGlow },

  // Modal actions
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  confirmBtn: { position: 'relative' },
  confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
