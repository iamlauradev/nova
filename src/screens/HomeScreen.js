import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Animated,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFinance } from '../context/FinanceContext';
import { COLORS } from '../theme';
import { formatCurrency, formatDateShort as formatDate } from '../utils';
import GlowCard from '../components/GlowCard';
import SectionHeader from '../components/SectionHeader';
import CategoryImage from '../components/CategoryImage';
import AnimatedNumber from '../components/AnimatedNumber';
import { HomeSkeleton } from '../components/SkeletonLoader';
import AccountCard from './home/AccountCard';
import TransactionRow from './home/TransactionRow';

function PulseView({ children, style }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.25, 0.65] });
  return (
    <View style={style}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: COLORS.expense, opacity, borderRadius: 6 }]} />
      {children}
    </View>
  );
}

export default function HomeScreen() {
  const nav = useNavigation();
  const {
    accounts,
    transactions,
    categories,
    totalBalance,
    totalSavings,
    savingsAccounts,
    freeMoney,
    monthlyFixed,
    activeDebts,
    activeLoans,
    addTransaction,
    budgets,
    recurringItems,
    isLoaded,
  } = useFinance();

  const mainAccounts = accounts.filter(a => a.type !== 'savings');

  // ── Account visibility toggle ───────────────────────────────────────────────
  // hiddenIds: set of account IDs excluded from the visible sum
  const [hiddenIds, setHiddenIds] = useState(new Set());

  const toggleAccount = (id) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const visibleBalance = useMemo(
    () => mainAccounts
      .filter(a => !hiddenIds.has(a.id))
      .reduce((sum, a) => sum + (a.balance || 0), 0),
    [mainAccounts, hiddenIds],
  );

  const isFiltered = hiddenIds.size > 0;
  const displayBalance = isFiltered ? visibleBalance : totalBalance;

  // ── Month stats ─────────────────────────────────────────────────────────────
  const recent = transactions.slice(0, 8);
  const now = new Date();
  const monthTxs = transactions.filter(t => {
    if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const monthIncome  = monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const monthExpense = monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const monthNet = monthIncome - monthExpense;

  const freeMoneyPct = monthlyFixed > 0 ? Math.min(100, Math.max(0, (freeMoney / (freeMoney + monthlyFixed)) * 100)) : 100;
  const freeColor = freeMoney > 0 ? COLORS.income : COLORS.expense;

  // ── Previous month comparison ──────────────────────────────────────────────
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevMonthTxs = transactions.filter(t => {
    if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
    const d = new Date(t.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });
  const prevIncome  = prevMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const incomeDelta  = prevIncome  > 0 ? ((monthIncome  - prevIncome)  / prevIncome)  * 100 : null;
  const expenseDelta = prevExpense > 0 ? ((monthExpense - prevExpense) / prevExpense) * 100 : null;

  // ── Patrimonio neto ───────────────────────────────────────────────────────
  const totalAssets      = accounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = (activeDebts || []).reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount), 0);
  const loansReceivable  = (activeLoans || []).reduce((s, l) => s + Math.max(0, l.totalAmount - l.collectedAmount), 0);
  const netWorth         = totalAssets - totalLiabilities + loansReceivable;

  // ── End-of-month projection ───────────────────────────────────────────────
  const daysInMonth   = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth    = now.getDate();
  const progress      = dayOfMonth / daysInMonth; // 0..1
  const projIncome    = progress > 0 ? monthIncome  / progress : monthIncome;
  const projExpense   = progress > 0 ? monthExpense / progress : monthExpense;
  const projNet       = projIncome - projExpense;
  const projBalance   = totalBalance + (projNet - monthNet);

  // ── Budget alerts ─────────────────────────────────────────────────────────
  const budgetAlerts = useMemo(() => {
    if (!budgets || budgets.length === 0) return [];
    const now2 = new Date();
    return budgets.map(b => {
      const cat = (categories?.expense || []).find(c => c.id === b.categoryId);
      const spent = monthTxs.filter(t => t.category === b.categoryId).reduce((s, t) => s + t.amount, 0);
      const pct = b.amount > 0 ? spent / b.amount : 0;
      return { ...b, cat, spent, pct };
    }).filter(b => b.pct >= 0.8);
  }, [budgets, categories, monthTxs]);

  // ── Próximos cargos fijos ─────────────────────────────────────────────────
  const upcomingCharges = useMemo(() => {
    if (!recurringItems) return [];
    const today = now.getDate();
    return recurringItems
      .filter(r => r.active && r.type === 'expense' && r.frequency === 'monthly' && r.dayOfMonth)
      .map(r => ({ ...r, daysUntil: Number(r.dayOfMonth) >= today ? Number(r.dayOfMonth) - today : null }))
      .filter(r => r.daysUntil !== null && r.daysUntil <= 10)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [recurringItems, now]);

  // ── Ingresos Rápidos ──────────────────────────────────────────────────────
  const PINNED_INCOME_KEY = '@ingreso_rapido_pinned';
  const [pinnedIncomeIds, setPinnedIncomeIds] = useState([]);
  const [quickIncomeModal, setQuickIncomeModal] = useState(null);
  const [quickIncomeAmount, setQuickIncomeAmount] = useState('');
  const [quickIncomeAccountId, setQuickIncomeAccountId] = useState('');
  const [showIncomeCatPicker, setShowIncomeCatPicker] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(PINNED_INCOME_KEY).then(v => { if (v) setPinnedIncomeIds(JSON.parse(v)); }).catch(() => {});
  }, []);

  const savePinnedIncome = useCallback(async (ids) => {
    setPinnedIncomeIds(ids);
    await AsyncStorage.setItem(PINNED_INCOME_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

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

  const frequentIncomeCats = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const counts = {};
    transactions.forEach(t => {
      if (t.type === 'income' && new Date(t.date) >= cutoff) {
        counts[t.category] = (counts[t.category] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => categories.income.find(c => c.id === id))
      .filter(Boolean);
  }, [transactions, categories.income]);

  const quickIncomeCats = useMemo(() => {
    const pinned = pinnedIncomeIds.map(id => categories.income.find(c => c.id === id)).filter(Boolean);
    const pinnedSet = new Set(pinnedIncomeIds);
    const autoFill = frequentIncomeCats.filter(c => !pinnedSet.has(c.id));
    return [...pinned, ...autoFill].slice(0, 10);
  }, [pinnedIncomeIds, frequentIncomeCats, categories.income]);

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
        type: 'income',
        amount: amt,
        category: quickIncomeModal.cat.id,
        accountId: quickIncomeAccountId,
        description: quickIncomeModal.cat.name,
        date: new Date().toISOString(),
      });
      setQuickIncomeModal(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  // ── Gastos Rápidos ─────────────────────────────────────────────────────────
  const PINNED_KEY = '@gasto_rapido_pinned';
  const [pinnedCatIds, setPinnedCatIds] = useState([]);
  const [quickModal, setQuickModal] = useState(null); // { cat }
  const [quickAmount, setQuickAmount] = useState('');
  const [quickAccountId, setQuickAccountId] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);
  useEffect(() => {
    AsyncStorage.getItem(PINNED_KEY).then(v => { if (v) setPinnedCatIds(JSON.parse(v)); }).catch(() => {});
  }, []);

  const savePinned = useCallback(async (ids) => {
    setPinnedCatIds(ids);
    await AsyncStorage.setItem(PINNED_KEY, JSON.stringify(ids)).catch(() => {});
  }, []);

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

  // Auto-detectar categorías de gasto frecuentes (últimos 60 días)
  const frequentCats = useMemo(() => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 60);
    const counts = {};
    transactions.forEach(t => {
      if (t.type === 'expense' && new Date(t.date) >= cutoff) {
        counts[t.category] = (counts[t.category] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([id]) => categories.expense.find(c => c.id === id))
      .filter(Boolean);
  }, [transactions, categories.expense]);

  // Combinar: primero las pinned (que no estén ya en frecuentes), luego las frecuentes
  const quickCats = useMemo(() => {
    const pinnedCats = pinnedCatIds
      .map(id => categories.expense.find(c => c.id === id))
      .filter(Boolean);
    const freqIds = new Set(pinnedCatIds);
    const autoFill = frequentCats.filter(c => !freqIds.has(c.id));
    return [...pinnedCats, ...autoFill].slice(0, 10);
  }, [pinnedCatIds, frequentCats, categories.expense]);

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
        type: 'expense',
        amount: amt,
        category: quickModal.cat.id,
        accountId: quickAccountId,
        description: quickModal.cat.name,
        date: new Date().toISOString(),
      });
      setQuickModal(null);
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  };

  if (!isLoaded) return <HomeSkeleton />;

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HERO ── */}
        <LinearGradient colors={['#0a0030', '#080820', COLORS.bg]} locations={[0, 0.5, 1]} style={styles.hero}>
          <Text style={styles.systemLabel}>⟨ SISTEMA FINANCIERO ⟩</Text>
          <Text style={styles.balanceLabel}>
            {isFiltered ? 'SALDO SELECCIONADO' : 'SALDO DISPONIBLE'}
          </Text>
          <AnimatedNumber
            value={displayBalance}
            style={[styles.totalBalance, { color: displayBalance >= 0 ? COLORS.accent : COLORS.expense }]}
            format={formatCurrency}
          />
          {totalSavings > 0 && (
            <Text style={styles.savingsHint}>+ {formatCurrency(totalSavings)} en ahorros</Text>
          )}

          {/* ── Account chips ── */}
          {mainAccounts.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.accountChips}
            >
              {mainAccounts.map(a => {
                const hidden = hiddenIds.has(a.id);
                return (
                  <TouchableOpacity
                    key={a.id}
                    style={[
                      styles.accountChip,
                      hidden
                        ? styles.accountChipHidden
                        : { borderColor: a.color || COLORS.primary, backgroundColor: `${a.color || COLORS.primary}22` },
                    ]}
                    onPress={() => toggleAccount(a.id)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.chipDot, { backgroundColor: hidden ? COLORS.textDim : (a.color || COLORS.primary) }]} />
                    <Text style={[styles.chipLabel, { color: hidden ? COLORS.textDim : COLORS.text }]}>
                      {a.name}
                    </Text>
                    {!hidden && (
                      <Text style={[styles.chipAmt, { color: a.balance < 0 ? COLORS.expense : (a.color || COLORS.primary) }]}>
                        {formatCurrency(a.balance)}
                      </Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          <View style={styles.summaryRow}>
            <View style={[styles.pill, { borderColor: COLORS.income }]}>
              <Ionicons name="arrow-up" size={12} color={COLORS.income} />
              <Text style={[styles.pillText, { color: COLORS.income }]}>{formatCurrency(monthIncome)}</Text>
              {incomeDelta !== null && (
                <Text style={[styles.deltaBadge, { color: incomeDelta >= 0 ? COLORS.income : COLORS.expense }]}>
                  {incomeDelta >= 0 ? '▲' : '▼'}{Math.abs(incomeDelta).toFixed(0)}%
                </Text>
              )}
            </View>
            <View style={[styles.pill, { borderColor: COLORS.expense }]}>
              <Ionicons name="arrow-down" size={12} color={COLORS.expense} />
              <Text style={[styles.pillText, { color: COLORS.expense }]}>{formatCurrency(monthExpense)}</Text>
              {expenseDelta !== null && (
                <Text style={[styles.deltaBadge, { color: expenseDelta <= 0 ? COLORS.income : COLORS.expense }]}>
                  {expenseDelta >= 0 ? '▲' : '▼'}{Math.abs(expenseDelta).toFixed(0)}%
                </Text>
              )}
            </View>
            <View style={[styles.pill, { borderColor: monthNet >= 0 ? COLORS.accent : COLORS.expense }]}>
              <Ionicons name="trending-up" size={12} color={monthNet >= 0 ? COLORS.accent : COLORS.expense} />
              <Text style={[styles.pillText, { color: monthNet >= 0 ? COLORS.accent : COLORS.expense }]}>
                {monthNet >= 0 ? '+' : ''}{formatCurrency(monthNet)}
              </Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── PATRIMONIO NETO ── */}
          {(activeDebts?.length > 0 || activeLoans?.length > 0) && (
            <GlowCard color={netWorth >= 0 ? 'rgba(168,85,247,0.10)' : 'rgba(251,113,133,0.10)'}>
              <View style={styles.netWorthHeader}>
                <View>
                  <Text style={styles.netWorthLabel}>⚖️ PATRIMONIO NETO</Text>
                  <Text style={[styles.netWorthValue, { color: netWorth >= 0 ? COLORS.primary : COLORS.expense }]}>
                    {netWorth >= 0 ? '+' : ''}{formatCurrency(netWorth)}
                  </Text>
                </View>
                <View style={styles.netWorthRight}>
                  <View style={styles.netWorthRow}>
                    <Text style={styles.netWorthRowLabel}>Activos</Text>
                    <Text style={[styles.netWorthRowValue, { color: COLORS.income }]}>{formatCurrency(totalAssets)}</Text>
                  </View>
                  {totalLiabilities > 0 && (
                    <View style={styles.netWorthRow}>
                      <Text style={styles.netWorthRowLabel}>Deudas</Text>
                      <Text style={[styles.netWorthRowValue, { color: COLORS.expense }]}>-{formatCurrency(totalLiabilities)}</Text>
                    </View>
                  )}
                  {loansReceivable > 0 && (
                    <View style={styles.netWorthRow}>
                      <Text style={styles.netWorthRowLabel}>Préstamos</Text>
                      <Text style={[styles.netWorthRowValue, { color: COLORS.income }]}>+{formatCurrency(loansReceivable)}</Text>
                    </View>
                  )}
                </View>
              </View>
            </GlowCard>
          )}

          {/* ── DINERO LIBRE ── */}
          <GlowCard color={`${freeColor}22`}>
            <View style={styles.freeMoneyHeader}>
              <View>
                <Text style={styles.freeLabel}>⚡ DINERO LIBRE</Text>
                <Text style={[styles.freeAmount, { color: freeColor }]}>
                  {formatCurrency(freeMoney)}
                </Text>
              </View>
              <View style={styles.freeRight}>
                <Text style={styles.freeRightLabel}>FIJOS/MES</Text>
                <Text style={[styles.freeRightAmount, { color: COLORS.expense }]}>
                  -{formatCurrency(monthlyFixed)}
                </Text>
              </View>
            </View>
            <View style={styles.freeBarBg}>
              <LinearGradient
                colors={freeMoney > 0 ? [COLORS.income, `${COLORS.income}88`] : [COLORS.expense, `${COLORS.expense}88`]}
                style={[styles.freeBarFill, { width: `${freeMoneyPct}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.freeHint}>
              Saldo total menos tus gastos fijos mensuales activos
            </Text>
          </GlowCard>

          {/* ── ALERTAS DE PRESUPUESTO ── */}
          {budgetAlerts.length > 0 && (
            <GlowCard color="rgba(251,191,36,0.08)">
              <View style={styles.budgetAlertHeader}>
                <Text style={styles.budgetAlertTitle}>⚠️ PRESUPUESTOS</Text>
                <TouchableOpacity onPress={() => nav.navigate('Stats')}>
                  <Text style={styles.budgetAlertLink}>Ver todos →</Text>
                </TouchableOpacity>
              </View>
              {budgetAlerts.map(b => {
                const over = b.pct >= 1;
                const RowWrapper = over ? PulseView : View;
                return (
                  <RowWrapper key={b.id} style={styles.budgetAlertRow}>
                    <Text style={{ fontSize: 16, marginRight: 6 }}>{b.cat?.icon || '💸'}</Text>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 3 }}>
                        <Text style={styles.budgetAlertCat}>{b.cat?.name || b.categoryId}</Text>
                        <Text style={[styles.budgetAlertPct, { color: over ? COLORS.expense : COLORS.gold }]}>
                          {over ? '🔴' : '🟡'} {Math.round(b.pct * 100)}%
                        </Text>
                      </View>
                      <View style={styles.budgetAlertBarBg}>
                        <View style={[styles.budgetAlertBarFill, {
                          width: `${Math.min(b.pct * 100, 100)}%`,
                          backgroundColor: over ? COLORS.expense : COLORS.gold,
                        }]} />
                      </View>
                    </View>
                  </RowWrapper>
                );
              })}
            </GlowCard>
          )}

          {/* ── PROYECCIÓN FIN DE MES ── */}
          <GlowCard color="rgba(34,211,238,0.08)">
            <View style={styles.projHeader}>
              <View>
                <Text style={styles.projLabel}>📅 FIN DE MES EST.</Text>
                <Text style={[styles.projBalance, { color: projBalance >= 0 ? COLORS.accent : COLORS.expense }]}>
                  {formatCurrency(projBalance)}
                </Text>
              </View>
              <View style={styles.projRight}>
                <Text style={styles.projProgressLabel}>{dayOfMonth}/{daysInMonth} días</Text>
                <View style={styles.projBarBg}>
                  <View style={[styles.projBarFill, { width: `${Math.round(progress * 100)}%` }]} />
                </View>
              </View>
            </View>
            <View style={styles.projRow}>
              <View style={styles.projStat}>
                <Text style={styles.projStatLabel}>Ing. proyectado</Text>
                <Text style={[styles.projStatValue, { color: COLORS.income }]}>{formatCurrency(projIncome)}</Text>
              </View>
              <View style={styles.projDivider} />
              <View style={styles.projStat}>
                <Text style={styles.projStatLabel}>Gast. proyectado</Text>
                <Text style={[styles.projStatValue, { color: COLORS.expense }]}>{formatCurrency(projExpense)}</Text>
              </View>
              <View style={styles.projDivider} />
              <View style={styles.projStat}>
                <Text style={styles.projStatLabel}>Neto proyectado</Text>
                <Text style={[styles.projStatValue, { color: projNet >= 0 ? COLORS.income : COLORS.expense }]}>
                  {projNet >= 0 ? '+' : ''}{formatCurrency(projNet)}
                </Text>
              </View>
            </View>
            <Text style={styles.projHint}>Estimación basada en el ritmo de gasto actual del mes</Text>
          </GlowCard>

          {/* ── PRÓXIMOS CARGOS FIJOS ── */}
          {upcomingCharges.length > 0 && (
            <GlowCard color="rgba(251,191,36,0.06)">
              <View style={styles.budgetAlertHeader}>
                <Text style={styles.budgetAlertTitle}>📅 PRÓXIMOS CARGOS</Text>
                <TouchableOpacity onPress={() => nav.navigate('Fijos')}>
                  <Text style={styles.budgetAlertLink}>Ver todos →</Text>
                </TouchableOpacity>
              </View>
              {upcomingCharges.map(r => {
                const cat = categories.expense.find(c => c.id === r.category);
                return (
                  <View key={r.id} style={styles.upcomingRow}>
                    <CategoryImage image={cat?.image} icon={cat?.icon || '💸'} size={20} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.upcomingName}>{r.name}</Text>
                      <Text style={styles.upcomingWhen}>
                        {r.daysUntil === 0 ? 'Hoy' : `En ${r.daysUntil} día${r.daysUntil !== 1 ? 's' : ''}`}
                      </Text>
                    </View>
                    <Text style={styles.upcomingAmt}>-{formatCurrency(r.amount)}</Text>
                  </View>
                );
              })}
            </GlowCard>
          )}

          {/* ── ACCIONES RÁPIDAS ── */}
          <View style={styles.actionsRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.income }]}
              onPress={() => nav.navigate('Transacciones', { openAdd: 'income' })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[COLORS.incomeGlow, 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="arrow-up-circle" size={20} color={COLORS.income} />
              <Text style={[styles.actionText, { color: COLORS.income }]}>INGRESO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.expense }]}
              onPress={() => nav.navigate('Transacciones', { openAdd: 'expense' })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[COLORS.expenseGlow, 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="arrow-down-circle" size={20} color={COLORS.expense} />
              <Text style={[styles.actionText, { color: COLORS.expense }]}>GASTO</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor: COLORS.gold, flex: 0.7 }]}
              onPress={() => nav.navigate('Transacciones', { openAdd: 'transfer' })}
              activeOpacity={0.8}
            >
              <LinearGradient colors={[`${COLORS.gold}22`, 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="swap-horizontal" size={20} color={COLORS.gold} />
              <Text style={[styles.actionText, { color: COLORS.gold }]}>MOVER</Text>
            </TouchableOpacity>
          </View>

          {/* ── GASTOS RÁPIDOS ── */}
          <SectionHeader
            title="⚡ GASTOS RÁPIDOS"
            right={
              <TouchableOpacity onPress={() => setShowCatPicker(true)}>
                <Text style={styles.seeAll}>+ Añadir</Text>
              </TouchableOpacity>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
            {quickCats.length === 0 ? (
              <TouchableOpacity
                style={[styles.quickChipAdd]}
                onPress={() => nav.navigate('Transacciones', { openAdd: 'expense' })}
              >
                <Ionicons name="flash" size={16} color={COLORS.expense} />
                <Text style={[styles.quickChipText, { color: COLORS.expense }]}>Añadir gasto</Text>
              </TouchableOpacity>
            ) : (
              quickCats.map(cat => {
                const isPinned = pinnedCatIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.quickChip, { borderColor: COLORS.expense }]}
                    onPress={() => openQuickAdd(cat)}
                    onLongPress={() => isPinned && unpinCategory(cat.id)}
                    activeOpacity={0.75}
                  >
                    <LinearGradient colors={[COLORS.expenseGlow, 'transparent']} style={StyleSheet.absoluteFill} />
                    <CategoryImage image={cat.image} icon={cat.icon} size={22} />
                    <Text style={styles.quickChipText} numberOfLines={1}>{cat.name}</Text>
                    {isPinned && <View style={styles.quickPinDot} />}
                  </TouchableOpacity>
                );
              })
            )}
            <TouchableOpacity
              style={[styles.quickChipAdd, { marginLeft: 4 }]}
              onPress={() => setShowCatPicker(true)}
            >
              <Ionicons name="add" size={18} color={COLORS.primaryLight} />
            </TouchableOpacity>
          </ScrollView>

          {/* ── INGRESOS RÁPIDOS ── */}
          <SectionHeader
            title="⚡ INGRESOS RÁPIDOS"
            right={
              <TouchableOpacity onPress={() => setShowIncomeCatPicker(true)}>
                <Text style={styles.seeAll}>+ Añadir</Text>
              </TouchableOpacity>
            }
          />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
            {quickIncomeCats.length === 0 ? (
              <TouchableOpacity
                style={[styles.quickChipAdd]}
                onPress={() => nav.navigate('Transacciones', { openAdd: 'income' })}
              >
                <Ionicons name="flash" size={16} color={COLORS.income} />
                <Text style={[styles.quickChipText, { color: COLORS.income }]}>Añadir ingreso</Text>
              </TouchableOpacity>
            ) : (
              quickIncomeCats.map(cat => {
                const isPinned = pinnedIncomeIds.includes(cat.id);
                return (
                  <TouchableOpacity
                    key={cat.id}
                    style={[styles.quickChip, { borderColor: COLORS.income }]}
                    onPress={() => openQuickIncomeAdd(cat)}
                    onLongPress={() => isPinned && unpinIncomeCategory(cat.id)}
                    activeOpacity={0.75}
                  >
                    <LinearGradient colors={[COLORS.incomeGlow, 'transparent']} style={StyleSheet.absoluteFill} />
                    <CategoryImage image={cat.image} icon={cat.icon} size={22} />
                    <Text style={styles.quickChipText} numberOfLines={1}>{cat.name}</Text>
                    {isPinned && <View style={[styles.quickPinDot, { backgroundColor: COLORS.income }]} />}
                  </TouchableOpacity>
                );
              })
            )}
            <TouchableOpacity
              style={[styles.quickChipAdd, { marginLeft: 4 }]}
              onPress={() => setShowIncomeCatPicker(true)}
            >
              <Ionicons name="add" size={18} color={COLORS.primaryLight} />
            </TouchableOpacity>
          </ScrollView>

          {/* ── CUENTAS ── */}
          <SectionHeader
            title="CUENTAS"
            right={
              <TouchableOpacity onPress={() => nav.navigate('Cuentas')}>
                <Text style={styles.seeAll}>Ver todas →</Text>
              </TouchableOpacity>
            }
          />
          {mainAccounts.length === 0 ? (
            <TouchableOpacity style={styles.emptyAccounts} onPress={() => nav.navigate('Cuentas')} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={32} color={COLORS.primary} />
              <Text style={styles.emptyText}>Añade tu primera cuenta</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountScroll}>
              {mainAccounts.map(a => (
                <AccountCard key={a.id} account={a} onPress={() => nav.navigate('Cuentas')} />
              ))}
            </ScrollView>
          )}

          {/* ── AHORROS ── */}
          {savingsAccounts.length > 0 && (
            <>
              <SectionHeader
                title="AHORROS"
                right={
                  <TouchableOpacity onPress={() => nav.navigate('Cuentas')}>
                    <Text style={styles.seeAll}>Ver cuentas →</Text>
                  </TouchableOpacity>
                }
              />
              <GlowCard color={`${COLORS.gold}22`}>
                <View style={styles.savingsRow}>
                  <View>
                    <Text style={styles.savingsLabel}>TOTAL AHORRADO</Text>
                    <Text style={[styles.savingsAmount, { color: COLORS.gold }]}>
                      {formatCurrency(totalSavings)}
                    </Text>
                  </View>
                  <Text style={styles.savingsVault}>🏦</Text>
                </View>
                {savingsAccounts.length > 1 && (
                  <View style={styles.savingsBreakdown}>
                    {savingsAccounts.map(a => (
                      <View key={a.id} style={styles.savingsItem}>
                        <View style={[styles.savingsDot, { backgroundColor: a.color || COLORS.gold }]} />
                        <Text style={styles.savingsItemName} numberOfLines={1}>{a.name}</Text>
                        <Text style={[styles.savingsItemAmt, { color: a.color || COLORS.gold }]}>
                          {formatCurrency(a.balance)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </GlowCard>
            </>
          )}

          {/* ── DEUDAS ACTIVAS ── */}
          {activeDebts && activeDebts.length > 0 && (
            <>
              <SectionHeader
                title="DEUDAS"
                right={
                  <TouchableOpacity onPress={() => nav.navigate('Fijos')}>
                    <Text style={styles.seeAll}>Gestionar →</Text>
                  </TouchableOpacity>
                }
              />
              <GlowCard color="rgba(244,63,94,0.10)">
                {activeDebts.map((debt, i) => {
                  const total = debt.totalAmount || 0;
                  const paid = debt.paidAmount || 0;
                  const pct = total > 0 ? Math.min(paid / total, 1) : 0;
                  const remaining = total - paid;
                  return (
                    <View key={debt.id} style={[styles.debtItem, i > 0 && styles.debtDivider]}>
                      <View style={styles.debtHeader}>
                        <Text style={{ fontSize: 16 }}>{debt.icon || '🏚️'}</Text>
                        <Text style={styles.debtName} numberOfLines={1}>{debt.name}</Text>
                        <Text style={styles.debtRemaining}>-{formatCurrency(remaining)}</Text>
                      </View>
                      <View style={styles.debtBarBg}>
                        <LinearGradient
                          colors={['#f43f5e', '#be123c']}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[styles.debtBarFill, { width: `${Math.round(pct * 100)}%` }]}
                        />
                      </View>
                      <View style={styles.debtFooter}>
                        <Text style={styles.debtPaid}>{formatCurrency(paid)} pagado</Text>
                        <Text style={styles.debtPct}>{Math.round(pct * 100)}%</Text>
                      </View>
                    </View>
                  );
                })}
              </GlowCard>
            </>
          )}

          {/* ── RESUMEN MES ── */}
          <SectionHeader title="ESTE MES" />
          <GlowCard>
            <View style={styles.monthGrid}>
              <View style={styles.monthCell}>
                <Text style={styles.monthCellLabel}>INGRESOS</Text>
                <Text style={[styles.monthCellValue, { color: COLORS.income }]}>+{formatCurrency(monthIncome)}</Text>
              </View>
              <View style={[styles.monthDivider]} />
              <View style={styles.monthCell}>
                <Text style={styles.monthCellLabel}>GASTOS</Text>
                <Text style={[styles.monthCellValue, { color: COLORS.expense }]}>-{formatCurrency(monthExpense)}</Text>
              </View>
              <View style={[styles.monthDivider]} />
              <View style={styles.monthCell}>
                <Text style={styles.monthCellLabel}>BALANCE</Text>
                <Text style={[styles.monthCellValue, { color: monthNet >= 0 ? COLORS.income : COLORS.expense }]}>
                  {monthNet >= 0 ? '+' : ''}{formatCurrency(monthNet)}
                </Text>
              </View>
            </View>
            {monthExpense > 0 && monthIncome > 0 && (
              <View style={styles.monthBar}>
                <LinearGradient
                  colors={[COLORS.income, `${COLORS.income}88`]}
                  style={[styles.monthBarIncome, { flex: monthIncome }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
                <LinearGradient
                  colors={[`${COLORS.expense}88`, COLORS.expense]}
                  style={[styles.monthBarExpense, { flex: monthExpense }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
              </View>
            )}
          </GlowCard>

          {/* ── ACTIVIDAD RECIENTE ── */}
          <SectionHeader
            title="ACTIVIDAD RECIENTE"
            right={
              <TouchableOpacity onPress={() => nav.navigate('Transacciones')}>
                <Text style={styles.seeAll}>Ver todo →</Text>
              </TouchableOpacity>
            }
          />
          {recent.length === 0 ? (
            <GlowCard>
              <Text style={styles.noData}>Sin movimientos todavía</Text>
            </GlowCard>
          ) : (
            <GlowCard noPadding>
              <View style={{ padding: 4 }}>
                {recent.map((tx, i) => (
                  <View key={tx.id}>
                    <TransactionRow tx={tx} accounts={accounts} categories={categories} />
                    {i < recent.length - 1 && <View style={styles.divider} />}
                  </View>
                ))}
              </View>
            </GlowCard>
          )}
        </View>
      </ScrollView>

      {/* ── Modal Quick Add ── */}
      {quickModal && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setQuickModal(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.quickModalSheet}>
              <View style={styles.handle} />
              <View style={styles.quickModalHeader}>
                <CategoryImage image={quickModal.cat.image} icon={quickModal.cat.icon} size={36} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.quickModalTitle}>{quickModal.cat.name}</Text>
                  <Text style={styles.quickModalSub}>Registro rápido de gasto</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>IMPORTE</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={COLORS.textDim}
                keyboardType="decimal-pad"
                value={quickAmount}
                onChangeText={setQuickAmount}
                autoFocus
              />

              <Text style={styles.fieldLabel}>CUENTA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {accounts.filter(a => a.type !== 'savings').map(acc => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.accChip, quickAccountId === acc.id && { borderColor: acc.color || COLORS.primary, backgroundColor: `${acc.color || COLORS.primary}22` }]}
                      onPress={() => setQuickAccountId(acc.id)}
                    >
                      <Text style={[styles.accChipText, quickAccountId === acc.id && { color: acc.color || COLORS.primary }]}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.quickModalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setQuickModal(null)}>
                  <Text style={styles.cancelBtnText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={confirmQuickAdd}>
                  <LinearGradient colors={[COLORS.expense, '#c0392b']} style={StyleSheet.absoluteFill} />
                  <Ionicons name="flash" size={15} color="#fff" />
                  <Text style={styles.confirmBtnText}>AÑADIR GASTO</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ── Modal Quick Income Add ── */}
      {quickIncomeModal && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setQuickIncomeModal(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalOverlay}>
            <View style={styles.quickModalSheet}>
              <View style={styles.handle} />
              <View style={styles.quickModalHeader}>
                <CategoryImage image={quickIncomeModal.cat.image} icon={quickIncomeModal.cat.icon} size={36} />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.quickModalTitle}>{quickIncomeModal.cat.name}</Text>
                  <Text style={styles.quickModalSub}>Registro rápido de ingreso</Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>IMPORTE</Text>
              <TextInput
                style={styles.input}
                placeholder="0,00"
                placeholderTextColor={COLORS.textDim}
                keyboardType="decimal-pad"
                value={quickIncomeAmount}
                onChangeText={setQuickIncomeAmount}
                autoFocus
              />

              <Text style={styles.fieldLabel}>CUENTA</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {accounts.filter(a => a.type !== 'savings').map(acc => (
                    <TouchableOpacity
                      key={acc.id}
                      style={[styles.accChip, quickIncomeAccountId === acc.id && { borderColor: acc.color || COLORS.primary, backgroundColor: `${acc.color || COLORS.primary}22` }]}
                      onPress={() => setQuickIncomeAccountId(acc.id)}
                    >
                      <Text style={[styles.accChipText, quickIncomeAccountId === acc.id && { color: acc.color || COLORS.primary }]}>{acc.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>

              <View style={styles.quickModalActions}>
                <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setQuickIncomeModal(null)}>
                  <Text style={styles.cancelBtnText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={confirmQuickIncomeAdd}>
                  <LinearGradient colors={[COLORS.income, '#15803d']} style={StyleSheet.absoluteFill} />
                  <Ionicons name="flash" size={15} color="#fff" />
                  <Text style={styles.confirmBtnText}>AÑADIR INGRESO</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ── Modal Picker de Categorías para Ingresos Rápidos ── */}
      <Modal visible={showIncomeCatPicker} animationType="slide" transparent onRequestClose={() => setShowIncomeCatPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.quickModalSheet, { maxHeight: '80%' }]}>
            <View style={styles.handle} />
            <Text style={styles.quickModalTitle}>AÑADIR A INGRESOS RÁPIDOS</Text>
            <Text style={styles.quickModalSub}>Mantén pulsado un ingreso rápido para quitarlo</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {Object.entries(
                categories.income.reduce((acc, cat) => {
                  if (!acc[cat.group]) acc[cat.group] = [];
                  acc[cat.group].push(cat);
                  return acc;
                }, {})
              ).map(([group, cats]) => (
                <View key={group} style={{ marginBottom: 12 }}>
                  <Text style={styles.groupLabel}>{group}</Text>
                  <View style={styles.catPickerGrid}>
                    {cats.map(cat => {
                      const already = pinnedIncomeIds.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.catPickerBtn, already && { borderColor: COLORS.income, backgroundColor: `${COLORS.income}18` }]}
                          onPress={() => already ? unpinIncomeCategory(cat.id) : pinIncomeCategory(cat.id)}
                        >
                          <CategoryImage image={cat.image} icon={cat.icon} size={24} />
                          <Text style={[styles.catPickerText, already && { color: COLORS.income }]} numberOfLines={2}>{cat.name}</Text>
                          {already && <Ionicons name="checkmark-circle" size={12} color={COLORS.income} style={{ position: 'absolute', top: 4, right: 4 }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn, { marginTop: 12 }]} onPress={() => setShowIncomeCatPicker(false)}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
              <Text style={styles.confirmBtnText}>LISTO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ── Modal Picker de Categorías para Gastos Rápidos ── */}
      <Modal visible={showCatPicker} animationType="slide" transparent onRequestClose={() => setShowCatPicker(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.quickModalSheet, { maxHeight: '80%' }]}>
            <View style={styles.handle} />
            <Text style={styles.quickModalTitle}>AÑADIR A GASTOS RÁPIDOS</Text>
            <Text style={styles.quickModalSub}>Mantén pulsado un gasto rápido para quitarlo</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {Object.entries(
                categories.expense.reduce((acc, cat) => {
                  if (!acc[cat.group]) acc[cat.group] = [];
                  acc[cat.group].push(cat);
                  return acc;
                }, {})
              ).map(([group, cats]) => (
                <View key={group} style={{ marginBottom: 12 }}>
                  <Text style={styles.groupLabel}>{group}</Text>
                  <View style={styles.catPickerGrid}>
                    {cats.map(cat => {
                      const already = pinnedCatIds.includes(cat.id);
                      return (
                        <TouchableOpacity
                          key={cat.id}
                          style={[styles.catPickerBtn, already && styles.catPickerBtnActive]}
                          onPress={() => already ? unpinCategory(cat.id) : pinCategory(cat.id)}
                        >
                          <CategoryImage image={cat.image} icon={cat.icon} size={24} />
                          <Text style={[styles.catPickerText, already && { color: COLORS.primary }]} numberOfLines={2}>{cat.name}</Text>
                          {already && <Ionicons name="checkmark-circle" size={12} color={COLORS.primary} style={{ position: 'absolute', top: 4, right: 4 }} />}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn, { marginTop: 12 }]} onPress={() => setShowCatPicker(false)}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
              <Text style={styles.confirmBtnText}>LISTO</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 100 },

  hero: {
    paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center',
  },
  systemLabel: {
    color: COLORS.accentLight, fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 16, opacity: 0.8,
  },
  balanceLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 3, marginBottom: 6 },
  totalBalance: {
    fontSize: 38, fontWeight: '800', letterSpacing: -1,
    textShadowColor: COLORS.accentGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20,
  },
  savingsHint: { color: COLORS.gold, fontSize: 12, fontWeight: '600', marginTop: 4, opacity: 0.85 },

  // ── Account chips ─────────────────────────────────────────────────────────
  accountChips: {
    flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 12,
  },
  accountChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1, backgroundColor: 'transparent',
  },
  accountChipHidden: {
    borderColor: COLORS.borderSubtle, backgroundColor: 'transparent',
  },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  chipAmt: { fontSize: 11, fontWeight: '700' },

  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' },
  pill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
    borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)',
  },
  pillText: { fontSize: 12, fontWeight: '700' },
  deltaBadge: { fontSize: 9, fontWeight: '800', marginLeft: 2 },

  // Projection card
  projHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 },
  projLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  projBalance: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },
  projRight: { alignItems: 'flex-end' },
  projProgressLabel: { color: COLORS.textDim, fontSize: 10, marginBottom: 5 },
  projBarBg: { width: 80, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.1)' },
  projBarFill: { height: 4, borderRadius: 2, backgroundColor: COLORS.accent },
  projRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  projStat: { flex: 1, alignItems: 'center' },
  projStatLabel: { fontSize: 9, color: COLORS.textDim, marginBottom: 3, textAlign: 'center' },
  projStatValue: { fontSize: 13, fontWeight: '700', textAlign: 'center' },
  projDivider: { width: 1, height: 30, backgroundColor: COLORS.borderSubtle },
  projHint: { fontSize: 10, color: COLORS.textDim, textAlign: 'center', marginTop: 2 },

  // Upcoming charges
  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  upcomingName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  upcomingWhen: { color: COLORS.textDim, fontSize: 10, marginTop: 1 },
  upcomingAmt: { color: COLORS.expense, fontSize: 13, fontWeight: '800' },

  // Budget alerts
  budgetAlertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  budgetAlertTitle: { fontSize: 10, fontWeight: '800', color: COLORS.gold, letterSpacing: 1.5 },
  budgetAlertLink: { fontSize: 11, color: COLORS.accent },
  budgetAlertRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  budgetAlertCat: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  budgetAlertPct: { fontSize: 11, fontWeight: '700' },
  budgetAlertBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  budgetAlertBarFill: { height: 4, borderRadius: 2 },

  body: { paddingHorizontal: 14, paddingTop: 16, gap: 12 },

  // Net worth
  netWorthHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  netWorthLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  netWorthValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  netWorthRight: { alignItems: 'flex-end', gap: 4 },
  netWorthRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  netWorthRowLabel: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1 },
  netWorthRowValue: { fontSize: 12, fontWeight: '700' },

  // Free money
  freeMoneyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  freeLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  freeAmount: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  freeRight: { alignItems: 'flex-end' },
  freeRightLabel: { color: COLORS.textDim, fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  freeRightAmount: { fontSize: 15, fontWeight: '700' },
  freeBarBg: { height: 5, backgroundColor: COLORS.borderSubtle, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  freeBarFill: { height: 5, borderRadius: 3 },
  freeHint: { color: COLORS.textDim, fontSize: 10, lineHeight: 14 },

  // Actions
  actionsRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 6, borderWidth: 1, overflow: 'hidden',
  },
  actionText: { fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },

  // Accounts
  accountScroll: { paddingBottom: 4, gap: 12 },
  accountCard: {
    width: 140, borderRadius: 4, borderWidth: 1,
    padding: 16, overflow: 'hidden', backgroundColor: COLORS.bgCard,
  },
  accountIconWrap: { marginBottom: 10, width: 32, height: 32, justifyContent: 'center' },
  accountName: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  accountType: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1, marginBottom: 10 },
  accountBalance: { fontSize: 15, fontWeight: '800' },
  emptyAccounts: {
    alignItems: 'center', justifyContent: 'center', padding: 24,
    borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border,
    marginBottom: 4, gap: 8,
  },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },

  // Savings
  savingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savingsLabel: { color: COLORS.textMuted, fontSize: 9, letterSpacing: 2, fontWeight: '600', marginBottom: 4 },
  savingsAmount: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  savingsVault: { fontSize: 32 },
  savingsBreakdown: { marginTop: 12, gap: 6 },
  savingsItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savingsDot: { width: 8, height: 8, borderRadius: 4 },
  savingsItemName: { flex: 1, color: COLORS.textDim, fontSize: 12 },
  savingsItemAmt: { fontSize: 12, fontWeight: '700' },

  // Debts
  debtItem: { paddingVertical: 8 },
  debtDivider: { borderTopWidth: 1, borderTopColor: COLORS.borderSubtle, marginTop: 8 },
  debtHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  debtName: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
  debtRemaining: { color: '#f43f5e', fontSize: 13, fontWeight: '800' },
  debtBarBg: { height: 4, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden', marginBottom: 4 },
  debtBarFill: { height: 4, borderRadius: 2 },
  debtFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  debtPaid: { color: COLORS.textDim, fontSize: 10 },
  debtPct: { color: '#fb7185', fontSize: 10, fontWeight: '700' },

  // Month summary
  monthGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  monthCell: { flex: 1, alignItems: 'center' },
  monthCellLabel: { color: COLORS.textDim, fontSize: 9, letterSpacing: 2, fontWeight: '600', marginBottom: 4 },
  monthCellValue: { fontSize: 14, fontWeight: '800' },
  monthDivider: { width: 1, height: 32, backgroundColor: COLORS.borderSubtle },
  monthBar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden' },
  monthBarIncome: { height: 5 },
  monthBarExpense: { height: 5 },

  // Transactions
  txRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  txIcon: { width: 42, height: 42, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  txInfo: { flex: 1 },
  txName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  txSub: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  txAmount: { fontSize: 13, fontWeight: '800' },
  divider: { height: 1, backgroundColor: COLORS.borderSubtle, marginHorizontal: 12 },

  noData: { color: COLORS.textMuted, textAlign: 'center', fontSize: 13 },
  seeAll: { color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' },

  // ── Gastos Rápidos ────────────────────────────────────────────────────────
  quickScroll: { paddingBottom: 4, gap: 8, paddingHorizontal: 2 },
  quickChip: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 82, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 8,
    borderWidth: 1, overflow: 'hidden', backgroundColor: COLORS.bgCard, gap: 5,
    position: 'relative',
  },
  quickChipText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  quickPinDot: {
    position: 'absolute', top: 5, right: 5, width: 5, height: 5,
    borderRadius: 3, backgroundColor: COLORS.primary,
  },
  quickChipAdd: {
    width: 44, height: 44, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.borderMid,
    backgroundColor: COLORS.bgCard,
    alignSelf: 'center',
  },

  // ── Modal Quick Add ───────────────────────────────────────────────────────
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  quickModalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 24, paddingBottom: 36,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.borderSubtle,
  },
  handle: { width: 36, height: 3, backgroundColor: COLORS.borderMid, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  quickModalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  quickModalTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  quickModalSub: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 18, fontWeight: '700',
    backgroundColor: COLORS.surface, marginBottom: 16,
  },
  accChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard,
  },
  accChipText: { color: COLORS.textMuted, fontSize: 12, fontWeight: '600' },
  quickModalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 4, alignItems: 'center',
    justifyContent: 'center', overflow: 'hidden', flexDirection: 'row', gap: 6,
  },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  confirmBtn: { overflow: 'hidden' },
  confirmBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },

  // ── Category picker ───────────────────────────────────────────────────────
  groupLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  catPickerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPickerBtn: {
    width: 72, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard,
    gap: 4, position: 'relative',
  },
  catPickerBtnActive: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}18` },
  catPickerText: { color: COLORS.textDim, fontSize: 9, fontWeight: '600', textAlign: 'center' },
});
