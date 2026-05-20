import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Dimensions, Modal, TextInput, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { COLORS, EMOJI_OPTIONS } from '../theme';
import { formatCurrency, parseAmount } from '../utils';
import GlowCard from '../components/GlowCard';
import SectionHeader from '../components/SectionHeader';
import CategoryImage from '../components/CategoryImage';

const { width } = Dimensions.get('window');
const CHART_W = width - 64;

// ─── helpers ──────────────────────────────────────────────
function getDateRange(period) {
  const now = new Date();
  let start;
  if (period === 'week')    { start = new Date(now); start.setDate(now.getDate() - 7); }
  else if (period === 'month') { start = new Date(now.getFullYear(), now.getMonth(), 1); }
  else                      { start = new Date(now); start.setMonth(now.getMonth() - 3); }
  return { start, end: now };
}

function trafficLight(pct) {
  if (pct >= 1)   return { color: COLORS.expense,  icon: '🔴', label: 'SUPERADO' };
  if (pct >= 0.8) return { color: COLORS.gold,     icon: '🟡', label: 'ATENCIÓN' };
  return              { color: COLORS.income,  icon: '🟢', label: 'OK' };
}

// ─── sub-components ───────────────────────────────────────
function BarChart({ data, maxVal, color }) {
  if (!data || data.length === 0) return null;
  const barW = Math.floor((CHART_W - (data.length - 1) * 6) / data.length);
  return (
    <View style={{ height: 140 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 }}>
        {data.map((item, i) => {
          const pct = maxVal > 0 ? item.value / maxVal : 0;
          return (
            <View key={i} style={{ width: barW, alignItems: 'center', gap: 4 }}>
              <View style={{ flex: 1, width: '100%', backgroundColor: COLORS.borderSubtle, borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' }}>
                <LinearGradient
                  colors={[color, `${color}55`]}
                  style={{ width: '100%', height: `${Math.max(pct * 100, 2)}%`, borderRadius: 3 }}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
              </View>
              <Text style={{ color: COLORS.textDim, fontSize: 8, textAlign: 'center' }} numberOfLines={1}>{item.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────
export default function StatsScreen() {
  const {
    transactions, categories, accounts,
    budgets, addBudget, deleteBudget,
    goals, addGoal, updateGoal, deleteGoal,
  } = useFinance();

  const [period, setPeriod] = useState('month');

  // Budget modal
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ categoryId: '', amount: '' });
  const [budgetCatGroup, setBudgetCatGroup] = useState(null);
  const budgetCatGroups = useMemo(() => {
    const groups = {};
    categories.expense.forEach(c => { const g = c.group || 'Otros'; if (!groups[g]) groups[g] = []; groups[g].push(c); });
    return groups;
  }, [categories.expense]);
  const budgetGroupNames = useMemo(() => [...Object.keys(budgetCatGroups), 'ALL'], [budgetCatGroups]);
  const budgetEffectiveGroup = budgetCatGroup ?? budgetGroupNames[0];
  const budgetVisibleCats = budgetEffectiveGroup === 'ALL' ? categories.expense : (budgetCatGroups[budgetEffectiveGroup] || []);

  // Goal modal
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editGoal, setEditGoal] = useState(null);
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', currentAmount: '', icon: '🎯', accountId: '', targetDate: '' });

  const { start, end } = getDateRange(period);

  const periodTxs = useMemo(() =>
    transactions.filter(t => {
      if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
      const d = new Date(t.date);
      return d >= start && d <= end;
    }), [transactions, period]);

  const income  = periodTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const expense = periodTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const net = income - expense;

  // Category breakdown
  const expenseByCat = useMemo(() => {
    const map = {};
    periodTxs.filter(t => t.type === 'expense').forEach(t => {
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return Object.entries(map)
      .map(([id, amount]) => {
        const cat = categories.expense.find(c => c.id === id);
        return { id, name: cat?.name || id, icon: cat?.icon || '💸', amount };
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [periodTxs, categories]);

  const maxExpenseCat = expenseByCat[0]?.amount || 1;

  // Chart data
  const chartData = useMemo(() => {
    if (period === 'week') {
      const days = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const label = d.toLocaleDateString('es-ES', { weekday: 'short' }).slice(0, 2);
        const value = periodTxs
          .filter(t => t.type === 'expense' && new Date(t.date).toDateString() === d.toDateString())
          .reduce((s, t) => s + t.amount, 0);
        days.push({ label, value });
      }
      return days;
    }
    if (period === 'month') {
      const weeks = [{ label: '1-7', value: 0 }, { label: '8-15', value: 0 }, { label: '16-22', value: 0 }, { label: '23+', value: 0 }];
      periodTxs.filter(t => t.type === 'expense').forEach(t => {
        const day = new Date(t.date).getDate();
        weeks[day <= 7 ? 0 : day <= 15 ? 1 : day <= 22 ? 2 : 3].value += t.amount;
      });
      return weeks;
    }
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('es-ES', { month: 'short' });
      const value = periodTxs
        .filter(t => t.type === 'expense' && new Date(t.date).getMonth() === d.getMonth())
        .reduce((s, t) => s + t.amount, 0);
      months.push({ label, value });
    }
    return months;
  }, [periodTxs, period]);

  const maxChartVal = Math.max(...chartData.map(d => d.value), 1);

  // Balance evolution (last 6 months)
  const balanceEvolution = useMemo(() => {
    const totalNow = accounts.reduce((s, a) => s + a.balance, 0);
    const points = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setMonth(d.getMonth() - i);
      const label = d.toLocaleDateString('es-ES', { month: 'short' });
      // Sum all txs from that month onward to reconstruct past balance
      const futureFlow = transactions
        .filter(tx => {
          if (tx.type === 'transfer-in' || tx.type === 'transfer-out') return false;
          const txDate = new Date(tx.date);
          return txDate > new Date(d.getFullYear(), d.getMonth() + 1, 0);
        })
        .reduce((s, tx) => s + (tx.type === 'income' ? -tx.amount : tx.amount), 0);
      points.push({ label, value: totalNow + futureFlow });
    }
    return points;
  }, [accounts, transactions]);

  const minBal = Math.min(...balanceEvolution.map(p => p.value));
  const maxBal = Math.max(...balanceEvolution.map(p => p.value));
  const balRange = maxBal - minBal || 1;

  // Budget helpers
  const thisMonthTxs = useMemo(() =>
    transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date), now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }), [transactions]);

  const budgetRows = useMemo(() =>
    (budgets || []).map(b => {
      const cat = categories.expense.find(c => c.id === b.categoryId);
      const spent = thisMonthTxs.filter(t => t.category === b.categoryId).reduce((s, t) => s + t.amount, 0);
      const pct = b.amount > 0 ? spent / b.amount : 0;
      const light = trafficLight(pct);
      return { ...b, cat, spent, pct, light };
    }), [budgets, categories, thisMonthTxs]);

  // Goal helpers
  const openAddGoal = () => {
    setEditGoal(null);
    setGoalForm({ name: '', targetAmount: '', currentAmount: '', icon: '🎯', accountId: '', targetDate: '' });
    setShowGoalModal(true);
  };

  const openEditGoal = (g) => {
    setEditGoal(g);
    setGoalForm({
      name: g.name,
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      icon: g.icon || '🎯',
      accountId: g.accountId || '',
      targetDate: g.targetDate || '',
    });
    setShowGoalModal(true);
  };

  const handleSaveGoal = () => {
    if (!goalForm.name.trim()) return Alert.alert('Error', 'Introduce un nombre');
    const target = parseAmount(goalForm.targetAmount);
    if (!target || target <= 0) return Alert.alert('Error', 'Introduce el importe objetivo');
    const current = parseAmount(goalForm.currentAmount) || 0;
    const payload = {
      name: goalForm.name.trim(),
      targetAmount: target,
      currentAmount: current,
      icon: goalForm.icon,
      accountId: goalForm.accountId || null,
      targetDate: goalForm.targetDate || null,
    };
    if (editGoal) updateGoal(editGoal.id, payload);
    else addGoal(payload);
    setShowGoalModal(false);
  };

  const handleSaveBudget = () => {
    if (!budgetForm.categoryId) return Alert.alert('Error', 'Selecciona una categoría');
    const amount = parseAmount(budgetForm.amount);
    if (!amount || amount <= 0) return Alert.alert('Error', 'Introduce un importe válido');
    addBudget({ categoryId: budgetForm.categoryId, amount, period: 'monthly' });
    setBudgetForm({ categoryId: '', amount: '' });
    setBudgetCatGroup(null);
    setShowBudgetModal(false);
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <LinearGradient colors={['#0d0025', COLORS.bg]} style={styles.header}>
          <Text style={styles.systemLabel}>⟨ ANÁLISIS FINANCIERO ⟩</Text>
          <View style={styles.periodRow}>
            {['week', 'month', 'quarter'].map(p => (
              <TouchableOpacity
                key={p}
                style={[styles.periodBtn, period === p && { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary }]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && { color: COLORS.primaryLight }]}>
                  {p === 'week' ? 'SEMANA' : p === 'month' ? 'MES' : 'TRIMESTRE'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── RESUMEN ── */}
          <View style={styles.summaryRow}>
            <GlowCard style={styles.summaryCard} color={COLORS.incomeGlow}>
              <Text style={styles.summaryLabel}>INGRESOS</Text>
              <Text style={[styles.summaryValue, { color: COLORS.income }]}>{formatCurrency(income)}</Text>
            </GlowCard>
            <GlowCard style={styles.summaryCard} color={COLORS.expenseGlow}>
              <Text style={styles.summaryLabel}>GASTOS</Text>
              <Text style={[styles.summaryValue, { color: COLORS.expense }]}>{formatCurrency(expense)}</Text>
            </GlowCard>
          </View>
          <GlowCard color={net >= 0 ? COLORS.incomeGlow : COLORS.expenseGlow}>
            <View style={styles.netRow}>
              <View>
                <Text style={styles.summaryLabel}>BALANCE DEL PERÍODO</Text>
                <Text style={[styles.netValue, { color: net >= 0 ? COLORS.income : COLORS.expense }]}>
                  {net >= 0 ? '+' : ''}{formatCurrency(net)}
                </Text>
              </View>
              <Ionicons name={net >= 0 ? 'trending-up' : 'trending-down'} size={32} color={net >= 0 ? COLORS.income : COLORS.expense} />
            </View>
          </GlowCard>

          {/* ── PRESUPUESTOS ── */}
          <SectionHeader
            title="PRESUPUESTOS (este mes)"
            right={
              <TouchableOpacity onPress={() => setShowBudgetModal(true)} style={styles.addBtn}>
                <Ionicons name="add" size={14} color={COLORS.primary} />
                <Text style={styles.addBtnText}>AÑADIR</Text>
              </TouchableOpacity>
            }
          />
          {budgetRows.length === 0 ? (
            <TouchableOpacity style={styles.emptyState} onPress={() => setShowBudgetModal(true)} activeOpacity={0.8}>
              <Text style={{ fontSize: 28 }}>🚦</Text>
              <Text style={styles.emptyTitle}>Sin presupuestos</Text>
              <Text style={styles.emptySubtitle}>Controla cuánto gastas por categoría cada mes</Text>
            </TouchableOpacity>
          ) : (
            <GlowCard>
              <View style={{ gap: 14 }}>
                {budgetRows.map(b => (
                  <View key={b.id}>
                    <View style={styles.budgetRow}>
                      <CategoryImage image={b.cat?.image} icon={b.cat?.icon || '💸'} size={20} style={{ marginRight: 8 }} />
                      <View style={{ flex: 1 }}>
                        <View style={styles.budgetLabelRow}>
                          <Text style={styles.budgetName}>{b.cat?.name || b.categoryId}</Text>
                          <Text style={styles.budgetLight}>{b.light.icon}</Text>
                        </View>
                        <View style={styles.budgetBarBg}>
                          <LinearGradient
                            colors={[b.light.color, `${b.light.color}66`]}
                            style={[styles.budgetBarFill, { width: `${Math.min(b.pct * 100, 100)}%` }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          />
                        </View>
                        {b.pct >= 1 ? (
                          <Text style={[styles.budgetRemaining, { color: COLORS.expense }]}>
                            Excedido {formatCurrency(b.spent - b.amount)}
                          </Text>
                        ) : (
                          <Text style={styles.budgetRemaining}>
                            Quedan {formatCurrency(b.amount - b.spent)}
                          </Text>
                        )}
                      </View>
                      <View style={styles.budgetAmts}>
                        <Text style={[styles.budgetSpent, { color: b.light.color }]}>{formatCurrency(b.spent)}</Text>
                        <Text style={styles.budgetTotal}>/{formatCurrency(b.amount)}</Text>
                      </View>
                      <TouchableOpacity onPress={() => Alert.alert('¿Eliminar?', `Eliminar presupuesto de ${b.cat?.name}?`, [
                        { text: 'Cancelar', style: 'cancel' },
                        { text: 'Eliminar', style: 'destructive', onPress: () => deleteBudget(b.id) },
                      ])} style={{ padding: 4 }}>
                        <Ionicons name="trash-outline" size={13} color={COLORS.textDim} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            </GlowCard>
          )}

          {/* ── OBJETIVOS ── */}
          <SectionHeader
            title="OBJETIVOS"
            right={
              <TouchableOpacity onPress={openAddGoal} style={styles.addBtn}>
                <Ionicons name="add" size={14} color={COLORS.gold} />
                <Text style={[styles.addBtnText, { color: COLORS.goldLight }]}>AÑADIR</Text>
              </TouchableOpacity>
            }
          />
          {(!goals || goals.length === 0) ? (
            <TouchableOpacity style={[styles.emptyState, { borderColor: `${COLORS.gold}44` }]} onPress={openAddGoal} activeOpacity={0.8}>
              <Text style={{ fontSize: 28 }}>🎯</Text>
              <Text style={[styles.emptyTitle, { color: COLORS.gold }]}>Sin objetivos</Text>
              <Text style={styles.emptySubtitle}>Fija metas de ahorro y sigue tu progreso</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ gap: 10 }}>
              {goals.map(g => {
                const pct = g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0;
                const isDone = pct >= 1;
                const goalColor = isDone ? COLORS.income : COLORS.gold;
                const remaining = Math.max(0, g.targetAmount - g.currentAmount);
                return (
                  <GlowCard key={g.id} color={`${goalColor}22`}>
                    <View style={styles.goalHeader}>
                      <Text style={styles.goalIcon}>{g.icon || '🎯'}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.goalName}>{g.name}</Text>
                        {g.targetDate && (
                          <Text style={styles.goalDate}>📅 {g.targetDate}</Text>
                        )}
                      </View>
                      <View style={styles.goalActions}>
                        <TouchableOpacity onPress={() => openEditGoal(g)} style={{ padding: 4 }}>
                          <Ionicons name="pencil-outline" size={14} color={COLORS.textDim} />
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => Alert.alert('¿Eliminar?', `Eliminar objetivo "${g.name}"?`, [
                          { text: 'Cancelar', style: 'cancel' },
                          { text: 'Eliminar', style: 'destructive', onPress: () => deleteGoal(g.id) },
                        ])} style={{ padding: 4 }}>
                          <Ionicons name="trash-outline" size={14} color={COLORS.textDim} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    <View style={styles.goalBarBg}>
                      <LinearGradient
                        colors={isDone ? [COLORS.income, `${COLORS.income}88`] : [COLORS.gold, `${COLORS.gold}66`]}
                        style={[styles.goalBarFill, { width: `${Math.round(pct * 100)}%` }]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                      />
                    </View>
                    <View style={styles.goalFooter}>
                      <Text style={[styles.goalCurrent, { color: goalColor }]}>{formatCurrency(g.currentAmount)}</Text>
                      <Text style={styles.goalPct}>{Math.round(pct * 100)}%</Text>
                      <Text style={styles.goalTarget}>{formatCurrency(g.targetAmount)}</Text>
                    </View>
                    {!isDone && <Text style={styles.goalRemaining}>Faltan {formatCurrency(remaining)}</Text>}
                    {isDone && <Text style={[styles.goalRemaining, { color: COLORS.income }]}>✓ ¡Objetivo alcanzado!</Text>}
                    {!isDone && g.targetDate && (() => {
                      try {
                        const parts = g.targetDate.split('/');
                        if (parts.length === 3) {
                          const target = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
                          const now2 = new Date();
                          const monthsLeft = Math.max(1, (target.getFullYear() - now2.getFullYear()) * 12 + (target.getMonth() - now2.getMonth()));
                          const neededPerMonth = remaining / monthsLeft;
                          if (neededPerMonth > 0) {
                            return (
                              <Text style={styles.goalMonthlySuggestion}>
                                💡 {formatCurrency(neededPerMonth)}/mes · {monthsLeft} mes{monthsLeft !== 1 ? 'es' : ''} restante{monthsLeft !== 1 ? 's' : ''}
                              </Text>
                            );
                          }
                        }
                      } catch (_) {}
                      return null;
                    })()}
                  </GlowCard>
                );
              })}
            </View>
          )}

          {/* ── GASTOS POR PERÍODO ── */}
          <SectionHeader title="GASTOS POR PERÍODO" />
          <GlowCard>
            {periodTxs.length === 0 ? (
              <Text style={styles.noData}>Sin datos para este período</Text>
            ) : (
              <BarChart data={chartData} maxVal={maxChartVal} color={COLORS.expense} />
            )}
          </GlowCard>

          {/* ── EVOLUCIÓN DEL SALDO ── */}
          <SectionHeader title="EVOLUCIÓN DEL SALDO (6 meses)" />
          <GlowCard>
            <View style={{ height: 120, flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
              {balanceEvolution.map((p, i) => {
                const normalizedPct = (p.value - minBal) / balRange;
                const barH = Math.max(normalizedPct * 90, 4);
                const barColor = p.value >= 0 ? COLORS.accent : COLORS.expense;
                return (
                  <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                    <Text style={{ color: COLORS.textDim, fontSize: 8 }}>{formatCurrency(p.value, true)}</Text>
                    <View style={{ width: '100%', height: barH + '%' === '0%' ? 4 : undefined, backgroundColor: COLORS.borderSubtle, borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end', flex: 1 }}>
                      <LinearGradient
                        colors={[barColor, `${barColor}55`]}
                        style={{ width: '100%', height: `${Math.round(normalizedPct * 100) || 4}%`, borderRadius: 3 }}
                        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                      />
                    </View>
                    <Text style={{ color: COLORS.textDim, fontSize: 8, textAlign: 'center' }}>{p.label}</Text>
                  </View>
                );
              })}
            </View>
          </GlowCard>

          {/* ── TOP CATEGORÍAS ── */}
          {expenseByCat.length > 0 && (
            <>
              <SectionHeader title="TOP CATEGORÍAS DE GASTO" />
              <GlowCard>
                <View style={{ gap: 14 }}>
                  {expenseByCat.map(cat => (
                    <View key={cat.id}>
                      <View style={styles.catRow}>
                        <CategoryImage image={cat?.image} icon={cat?.icon || '💸'} size={20} style={{ marginRight: 8 }} />
                        <Text style={styles.catName}>{cat.name}</Text>
                        <Text style={[styles.catAmount, { color: COLORS.expense }]}>{formatCurrency(cat.amount)}</Text>
                      </View>
                      <View style={styles.catBarBg}>
                        <LinearGradient
                          colors={[COLORS.expense, `${COLORS.expense}44`]}
                          style={[styles.catBarFill, { width: `${(cat.amount / maxExpenseCat) * 100}%` }]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        />
                      </View>
                    </View>
                  ))}
                </View>
              </GlowCard>
            </>
          )}

          {/* ── DISTRIBUCIÓN CUENTAS ── */}
          <SectionHeader title="DISTRIBUCIÓN DE CUENTAS" />
          <GlowCard>
            {accounts.length === 0 ? (
              <Text style={styles.noData}>Sin cuentas registradas</Text>
            ) : (
              <View style={{ gap: 12 }}>
                {accounts.map(a => {
                  const pct = totalBalance > 0 ? Math.max(0, a.balance / totalBalance) : 0;
                  return (
                    <View key={a.id}>
                      <View style={styles.catRow}>
                        <View style={[styles.acDot, { backgroundColor: a.color || COLORS.primary }]} />
                        <Text style={styles.catName}>{a.name}</Text>
                        <Text style={[styles.catAmount, { color: a.balance >= 0 ? COLORS.text : COLORS.expense }]}>{formatCurrency(a.balance)}</Text>
                      </View>
                      {totalBalance > 0 && a.balance > 0 && (
                        <View style={styles.catBarBg}>
                          <LinearGradient
                            colors={[a.color || COLORS.primary, `${a.color || COLORS.primary}44`]}
                            style={[styles.catBarFill, { width: `${pct * 100}%` }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          />
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </GlowCard>

          {/* Income vs Expense bar */}
          {(income > 0 || expense > 0) && (
            <>
              <SectionHeader title="INGRESOS VS GASTOS" />
              <GlowCard>
                <View style={{ gap: 12 }}>
                  <View style={{ flexDirection: 'row', height: 12, borderRadius: 4, overflow: 'hidden', gap: 2 }}>
                    {income > 0 && <View style={{ flex: income / (income + expense), backgroundColor: COLORS.income, height: 12, borderRadius: 4 }} />}
                    {expense > 0 && <View style={{ flex: expense / (income + expense), backgroundColor: COLORS.expense, height: 12, borderRadius: 4 }} />}
                  </View>
                  <View style={{ flexDirection: 'row', gap: 20 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.income }} />
                      <Text style={styles.legendText}>Ingresos {income > 0 ? Math.round(income / (income + expense) * 100) : 0}%</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.expense }} />
                      <Text style={styles.legendText}>Gastos {expense > 0 ? Math.round(expense / (income + expense) * 100) : 0}%</Text>
                    </View>
                  </View>
                </View>
              </GlowCard>
            </>
          )}
        </View>
      </ScrollView>

      {/* ── Modal Presupuesto ── */}
      <Modal visible={showBudgetModal} animationType="slide" transparent onRequestClose={() => { setShowBudgetModal(false); setBudgetCatGroup(null); }}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>[ PRESUPUESTO MENSUAL ]</Text>

            <Text style={styles.fieldLabel}>CATEGORÍA</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 6 }}>
                {budgetGroupNames.map(g => (
                  <TouchableOpacity
                    key={g}
                    style={[styles.chipBtn, budgetEffectiveGroup === g && { borderColor: COLORS.expense, backgroundColor: COLORS.expenseGlow }]}
                    onPress={() => setBudgetCatGroup(g)}
                  >
                    <Text style={[styles.chipText, budgetEffectiveGroup === g && { color: '#fb7185' }]}>
                      {g === 'ALL' ? 'Todos' : g}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <ScrollView style={{ maxHeight: 140, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {budgetVisibleCats.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.chipBtn, budgetForm.categoryId === c.id && { backgroundColor: COLORS.expenseGlow, borderColor: COLORS.expense }]}
                    onPress={() => setBudgetForm(p => ({ ...p, categoryId: c.id }))}
                  >
                    <CategoryImage image={c.image} icon={c.icon} size={14} style={{ marginRight: 4 }} />
                    <Text style={styles.chipText}>{c.name}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.fieldLabel}>LÍMITE MENSUAL (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={budgetForm.amount}
              onChangeText={v => setBudgetForm(p => ({ ...p, amount: v }))}
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowBudgetModal(false); setBudgetCatGroup(null); }}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveBudget}>
                <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ── Modal Objetivo ── */}
      <Modal visible={showGoalModal} animationType="slide" transparent onRequestClose={() => setShowGoalModal(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
          <ScrollView style={styles.modalSheetScroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <View style={styles.handle} />
            <Text style={[styles.modalTitle, { color: COLORS.gold }]}>
              {editGoal ? '[ EDITAR OBJETIVO ]' : '[ NUEVO OBJETIVO ]'}
            </Text>

            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Vacaciones, Coche, Fondo de emergencia..."
              placeholderTextColor={COLORS.textDim}
              value={goalForm.name}
              onChangeText={v => setGoalForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>IMPORTE OBJETIVO (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={goalForm.targetAmount}
              onChangeText={v => setGoalForm(p => ({ ...p, targetAmount: v }))}
            />

            <Text style={styles.fieldLabel}>AHORRADO ACTUALMENTE (€)</Text>
            <TextInput
              style={styles.input}
              placeholder="0,00"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              value={goalForm.currentAmount}
              onChangeText={v => setGoalForm(p => ({ ...p, currentAmount: v }))}
            />

            <Text style={styles.fieldLabel}>FECHA OBJETIVO (opcional, DD/MM/AAAA)</Text>
            <TextInput
              style={styles.input}
              placeholder="31/12/2025"
              placeholderTextColor={COLORS.textDim}
              value={goalForm.targetDate}
              onChangeText={v => setGoalForm(p => ({ ...p, targetDate: v }))}
            />

            <Text style={styles.fieldLabel}>ICONO — seleccionado: <Text style={{ fontSize: 18 }}>{goalForm.icon}</Text></Text>
            <ScrollView style={{ maxHeight: 140, marginBottom: 16 }} showsVerticalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {EMOJI_OPTIONS.slice(0, 40).map((e, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.emojiBtn, goalForm.icon === e && styles.emojiBtnSelected]}
                    onPress={() => setGoalForm(p => ({ ...p, icon: e }))}
                  >
                    <Text style={{ fontSize: 20 }}>{e}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={[styles.modalActions, { marginBottom: 48 }]}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setShowGoalModal(false)}>
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSaveGoal}>
                <LinearGradient colors={[COLORS.gold, '#b45309']} style={StyleSheet.absoluteFill} />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 100 },
  header: { paddingTop: 56, paddingBottom: 20, paddingHorizontal: 16 },
  systemLabel: { color: COLORS.accentLight, fontSize: 10, letterSpacing: 3, fontWeight: '700', marginBottom: 16, opacity: 0.8 },
  periodRow: { flexDirection: 'row', gap: 8 },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderSubtle },
  periodText: { color: COLORS.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  body: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },

  summaryRow: { flexDirection: 'row', gap: 12 },
  summaryCard: { flex: 1 },
  summaryLabel: { color: COLORS.textMuted, fontSize: 9, letterSpacing: 2, fontWeight: '600', marginBottom: 6 },
  summaryValue: { fontSize: 16, fontWeight: '800' },
  netRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  netValue: { fontSize: 24, fontWeight: '800', marginTop: 4 },

  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4, borderWidth: 1, borderColor: COLORS.border },
  addBtnText: { color: COLORS.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  emptyState: { alignItems: 'center', padding: 24, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, gap: 6 },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginTop: 4 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 17 },

  // Budget
  budgetRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  budgetLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  budgetName: { color: COLORS.text, fontSize: 13, fontWeight: '600', flex: 1 },
  budgetLight: { fontSize: 14 },
  budgetBarBg: { height: 4, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  budgetBarFill: { height: 4, borderRadius: 2 },
  budgetAmts: { alignItems: 'flex-end' },
  budgetSpent: { fontSize: 12, fontWeight: '800' },
  budgetTotal: { color: COLORS.textDim, fontSize: 10 },

  // Goals
  goalHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  goalIcon: { fontSize: 24 },
  goalName: { color: COLORS.text, fontSize: 14, fontWeight: '700' },
  goalDate: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  goalActions: { flexDirection: 'row', gap: 2 },
  goalBarBg: { height: 6, backgroundColor: COLORS.borderSubtle, borderRadius: 3, overflow: 'hidden', marginBottom: 6 },
  goalBarFill: { height: 6, borderRadius: 3 },
  goalFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  goalCurrent: { fontSize: 14, fontWeight: '800' },
  goalPct: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700' },
  goalTarget: { color: COLORS.textDim, fontSize: 12 },
  goalRemaining: { color: COLORS.textDim, fontSize: 11, marginTop: 4 },
  goalMonthlySuggestion: { color: COLORS.gold, fontSize: 11, marginTop: 3, fontWeight: '600' },
  budgetRemaining: { color: COLORS.textDim, fontSize: 10, marginTop: 3 },

  noData: { color: COLORS.textMuted, textAlign: 'center', fontSize: 13, paddingVertical: 8 },
  legendText: { color: COLORS.textMuted, fontSize: 12 },

  catRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  catEmoji: { fontSize: 16, marginRight: 8 },
  catName: { flex: 1, color: COLORS.text, fontSize: 13, fontWeight: '600' },
  catAmount: { fontSize: 13, fontWeight: '700' },
  catBarBg: { height: 3, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  catBarFill: { height: 3, borderRadius: 2 },
  acDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 24, paddingBottom: 40,
  },
  modalSheetScroll: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderWidth: 1, borderColor: COLORS.border, padding: 24, maxHeight: '92%',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgCardLight, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 4, color: COLORS.text, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, marginBottom: 16,
  },
  chipBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight },
  chipText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  emojiBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight },
  emojiBtnSelected: { borderColor: COLORS.gold, backgroundColor: `${COLORS.gold}22` },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: { flex: 1, paddingVertical: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  confirmBtn: { position: 'relative' },
  confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
