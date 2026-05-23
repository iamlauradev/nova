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
import HintTooltip from '../components/HintTooltip';

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
function BarChart({ data, maxVal, color, onSelect }) {
  const [selected, setSelected] = React.useState(null);
  if (!data || data.length === 0) return null;
  const barW = Math.floor((CHART_W - (data.length - 1) * 6) / data.length);
  return (
    <View style={{ height: 160 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 }}>
        {data.map((item, i) => {
          const pct = maxVal > 0 ? item.value / maxVal : 0;
          const isSelected = selected === i;
          return (
            <TouchableOpacity
              key={i}
              style={{ width: barW, alignItems: 'center', gap: 4, flex: 1 }}
              onPress={() => setSelected(isSelected ? null : i)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1, width: '100%', backgroundColor: COLORS.borderSubtle, borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' }}>
                <LinearGradient
                  colors={isSelected ? [color, color] : [color, `${color}55`]}
                  style={{ width: '100%', height: `${Math.max(pct * 100, 2)}%`, borderRadius: 3 }}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                />
              </View>
              <Text style={{ color: COLORS.textDim, fontSize: 8, textAlign: 'center' }} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selected !== null && data[selected] && (
        <View style={{ alignItems: 'center', marginTop: 8 }}>
          <Text style={{ color: color, fontSize: 13, fontWeight: '800' }}>
            {data[selected].label}: {formatCurrency(data[selected].value)}
          </Text>
        </View>
      )}
    </View>
  );
}

function DualBarChart({ data, maxVal }) {
  const [selected, setSelected] = React.useState(null);
  if (!data || data.length === 0) return null;
  return (
    <View style={{ height: 160 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 120, gap: 6 }}>
        {data.map((item, i) => {
          const incPct = maxVal > 0 ? item.income / maxVal : 0;
          const expPct = maxVal > 0 ? item.expense / maxVal : 0;
          return (
            <TouchableOpacity
              key={i}
              style={{ flex: 1, alignItems: 'center', gap: 4 }}
              onPress={() => setSelected(selected === i ? null : i)}
              activeOpacity={0.7}
            >
              <View style={{ flex: 1, width: '100%', flexDirection: 'row', gap: 2, alignItems: 'flex-end' }}>
                <View style={{ flex: 1, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' }}>
                  <View style={{ height: `${Math.max(incPct * 100, 2)}%`, backgroundColor: COLORS.income, borderRadius: 2 }} />
                </View>
                <View style={{ flex: 1, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden', justifyContent: 'flex-end' }}>
                  <View style={{ height: `${Math.max(expPct * 100, 2)}%`, backgroundColor: COLORS.expense, borderRadius: 2 }} />
                </View>
              </View>
              <Text style={{ color: COLORS.textDim, fontSize: 8, textAlign: 'center' }} numberOfLines={1}>{item.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {selected !== null && data[selected] && (
        <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 8 }}>
          <Text style={{ color: COLORS.income, fontSize: 12, fontWeight: '700' }}>
            +{formatCurrency(data[selected].income)}
          </Text>
          <Text style={{ color: COLORS.expense, fontSize: 12, fontWeight: '700' }}>
            -{formatCurrency(data[selected].expense)}
          </Text>
        </View>
      )}
    </View>
  );
}

// ─── main screen ──────────────────────────────────────────
export default function StatsScreen() {
  const {
    transactions, categories, accounts,
    budgets, addBudget, deleteBudget,
    goals, addGoal, updateGoal, deleteGoal,
    debts, loans,
  } = useFinance();

  const [period, setPeriod] = useState('month');

  // ── Informe mensual ──────────────────────────────────────────────────────────
  const nowRef = new Date();
  const [reportMonth, setReportMonth] = useState({ year: nowRef.getFullYear(), month: nowRef.getMonth() });

  const MONTH_NAMES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

  const prevReportMonth = useMemo(() => ({
    year:  reportMonth.month === 0 ? reportMonth.year - 1 : reportMonth.year,
    month: reportMonth.month === 0 ? 11 : reportMonth.month - 1,
  }), [reportMonth]);

  const reportTxs = useMemo(() =>
    transactions.filter(t => {
      if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
      const d = new Date(t.date);
      return d.getFullYear() === reportMonth.year && d.getMonth() === reportMonth.month;
    }), [transactions, reportMonth]);

  const prevReportTxs = useMemo(() =>
    transactions.filter(t => {
      if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
      const d = new Date(t.date);
      return d.getFullYear() === prevReportMonth.year && d.getMonth() === prevReportMonth.month;
    }), [transactions, prevReportMonth]);

  const reportIncome  = reportTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const reportExpense = reportTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const reportNet     = reportIncome - reportExpense;
  const prevIncome    = prevReportTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const prevExpense   = prevReportTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const reportExpByCat = useMemo(() => {
    const map = {};
    reportTxs.filter(t => t.type === 'expense').forEach(t => { map[t.category] = (map[t.category] || 0) + t.amount; });
    return Object.entries(map)
      .map(([id, amount]) => {
        const cat = categories.expense.find(c => c.id === id);
        return { id, name: cat?.name || id, icon: cat?.icon || '💸', image: cat?.image, amount };
      })
      .sort((a, b) => b.amount - a.amount).slice(0, 5);
  }, [reportTxs, categories]);

  const activeDebts = useMemo(() => (debts  || []).filter(d => d.active !== 0 && d.active !== false), [debts]);
  const activeLoans = useMemo(() => (loans  || []).filter(l => l.active !== 0 && l.active !== false), [loans]);

  const isCurrentMonth = reportMonth.year === nowRef.getFullYear() && reportMonth.month === nowRef.getMonth();

  const prevMonth = () => setReportMonth(m => ({
    year:  m.month === 0 ? m.year - 1 : m.year,
    month: m.month === 0 ? 11 : m.month - 1,
  }));
  const nextMonth = () => {
    if (isCurrentMonth) return;
    setReportMonth(m => ({
      year:  m.month === 11 ? m.year + 1 : m.year,
      month: m.month === 11 ? 0 : m.month + 1,
    }));
  };

  const pctChange = (current, previous) => {
    if (previous === 0) return current > 0 ? '+∞' : '–';
    const p = Math.round((current - previous) / previous * 100);
    return (p > 0 ? '+' : '') + p + '%';
  };

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

  // ── C5: Anomalous spending detection ───────────────────────────────────────
  const anomalies = useMemo(() => {
    const now = new Date();
    const curYear = now.getFullYear(), curMonth = now.getMonth();
    const curExpByCat = {};
    transactions.filter(t => {
      if (t.type !== 'expense') return false;
      const d = new Date(t.date);
      return d.getFullYear() === curYear && d.getMonth() === curMonth;
    }).forEach(t => { curExpByCat[t.category] = (curExpByCat[t.category] || 0) + t.amount; });

    const avgByCat = {};
    for (let i = 1; i <= 3; i++) {
      const d = new Date(curYear, curMonth - i, 1);
      transactions.filter(t => {
        if (t.type !== 'expense') return false;
        const td = new Date(t.date);
        return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
      }).forEach(t => { avgByCat[t.category] = (avgByCat[t.category] || 0) + t.amount; });
    }
    Object.keys(avgByCat).forEach(k => { avgByCat[k] /= 3; });

    return Object.entries(curExpByCat)
      .filter(([catId, amount]) => {
        const avg = avgByCat[catId] || 0;
        return avg > 0 && amount > avg * 1.5 && (amount - avg) > 20;
      })
      .map(([catId, amount]) => {
        const cat = categories.expense.find(c => c.id === catId);
        const avg = avgByCat[catId];
        const pct = Math.round((amount - avg) / avg * 100);
        return { catId, name: cat?.name || catId, icon: cat?.icon || '💸', image: cat?.image, amount, avg, pct };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
  }, [transactions, categories]);

  // ── C6: Regla 50/30/20 ─────────────────────────────────────────────────────
  const NEEDS_CATS = new Set(['food','housing','utilities','transport','gasolina','health','medicinas','dentista','agua','gas','electricidad','internet','movil','impuestos','seguros']);
  const WANTS_CATS = new Set(['restaurants','clothing','streaming','sports','entertainment','travel','education','compras-online','compras-fisicas','cosmetica','videojuegos','cine','musica','viajes','vacaciones','copas','cervezas','comida-para-llevar','desayunos','caprichos-dulces']);
  const rule503020 = useMemo(() => {
    if (income <= 0) return null;
    let needsSpent = 0, wantsSpent = 0;
    periodTxs.filter(t => t.type === 'expense').forEach(t => {
      if (NEEDS_CATS.has(t.category)) needsSpent += t.amount;
      else if (WANTS_CATS.has(t.category)) wantsSpent += t.amount;
    });
    const savings = Math.max(0, income - expense);
    return {
      needs: { spent: needsSpent, pct: Math.round(needsSpent / income * 100), target: 50 },
      wants: { spent: wantsSpent, pct: Math.round(wantsSpent / income * 100), target: 30 },
      saves: { spent: savings,    pct: Math.round(savings    / income * 100), target: 20 },
    };
  }, [periodTxs, income, expense]);

  // ── C8: Weekly cash flow (income + expense by week of month) ───────────────
  const weeklyCashFlow = useMemo(() => {
    if (period !== 'month') return null;
    const weeks = [
      { label: '1–7', income: 0, expense: 0 },
      { label: '8–15', income: 0, expense: 0 },
      { label: '16–22', income: 0, expense: 0 },
      { label: '23+', income: 0, expense: 0 },
    ];
    periodTxs.filter(t => t.type === 'income' || t.type === 'expense').forEach(t => {
      const day = new Date(t.date).getDate();
      const idx = day <= 7 ? 0 : day <= 15 ? 1 : day <= 22 ? 2 : 3;
      weeks[idx][t.type] += t.amount;
    });
    return weeks;
  }, [periodTxs, period]);

  const maxWeekly = weeklyCashFlow
    ? Math.max(...weeklyCashFlow.flatMap(w => [w.income, w.expense]), 1)
    : 1;

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
                style={[styles.periodBtn, period === p && period !== 'report' && { backgroundColor: COLORS.primaryGlow, borderColor: COLORS.primary }]}
                onPress={() => setPeriod(p)}
              >
                <Text style={[styles.periodText, period === p && period !== 'report' && { color: COLORS.primaryLight }]}>
                  {p === 'week' ? 'SEMANA' : p === 'month' ? 'MES' : 'TRIMESTRE'}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              style={[styles.periodBtn, period === 'report' && { backgroundColor: `${COLORS.gold}22`, borderColor: COLORS.gold }]}
              onPress={() => setPeriod(p => p === 'report' ? 'month' : 'report')}
            >
              <Ionicons name="document-text-outline" size={12} color={period === 'report' ? COLORS.gold : COLORS.textDim} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* ══════════════════════════════════════════════════════════════
            INFORME MENSUAL
        ══════════════════════════════════════════════════════════════ */}
        {period === 'report' && (
          <View style={styles.body}>
            {/* Month navigator */}
            <View style={styles.monthNav}>
              <TouchableOpacity onPress={prevMonth} style={styles.monthNavBtn}>
                <Ionicons name="chevron-back" size={20} color={COLORS.primaryLight} />
              </TouchableOpacity>
              <Text style={styles.monthNavTitle}>{MONTH_NAMES[reportMonth.month]} {reportMonth.year}</Text>
              <TouchableOpacity onPress={nextMonth} style={styles.monthNavBtn} disabled={isCurrentMonth}>
                <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? COLORS.borderSubtle : COLORS.primaryLight} />
              </TouchableOpacity>
            </View>

            {/* Summary */}
            <View style={styles.summaryRow}>
              <GlowCard style={styles.summaryCard} color={COLORS.incomeGlow}>
                <Text style={styles.summaryLabel}>INGRESOS</Text>
                <Text style={[styles.summaryValue, { color: COLORS.income }]}>{formatCurrency(reportIncome)}</Text>
                {prevIncome > 0 && (
                  <Text style={{ fontSize: 10, marginTop: 4, fontWeight: '700',
                    color: reportIncome >= prevIncome ? COLORS.income : COLORS.expense }}>
                    {pctChange(reportIncome, prevIncome)} vs mes ant.
                  </Text>
                )}
              </GlowCard>
              <GlowCard style={styles.summaryCard} color={COLORS.expenseGlow}>
                <Text style={styles.summaryLabel}>GASTOS</Text>
                <Text style={[styles.summaryValue, { color: COLORS.expense }]}>{formatCurrency(reportExpense)}</Text>
                {prevExpense > 0 && (
                  <Text style={{ fontSize: 10, marginTop: 4, fontWeight: '700',
                    color: reportExpense <= prevExpense ? COLORS.income : COLORS.expense }}>
                    {pctChange(reportExpense, prevExpense)} vs mes ant.
                  </Text>
                )}
              </GlowCard>
            </View>

            <GlowCard color={reportNet >= 0 ? COLORS.incomeGlow : COLORS.expenseGlow}>
              <View style={styles.netRow}>
                <View>
                  <Text style={styles.summaryLabel}>BALANCE DEL MES</Text>
                  <Text style={[styles.netValue, { color: reportNet >= 0 ? COLORS.income : COLORS.expense }]}>
                    {reportNet >= 0 ? '+' : ''}{formatCurrency(reportNet)}
                  </Text>
                  <Text style={{ color: COLORS.textDim, fontSize: 10, marginTop: 4 }}>
                    {reportTxs.length} movimiento{reportTxs.length !== 1 ? 's' : ''}
                  </Text>
                </View>
                <Ionicons name={reportNet >= 0 ? 'trending-up' : 'trending-down'} size={32}
                  color={reportNet >= 0 ? COLORS.income : COLORS.expense} />
              </View>
            </GlowCard>

            {/* Top categories */}
            {reportExpByCat.length > 0 && (
              <>
                <SectionHeader title="TOP GASTOS POR CATEGORÍA" />
                <GlowCard>
                  <View style={{ gap: 14 }}>
                    {reportExpByCat.map((cat, i) => (
                      <View key={cat.id}>
                        <View style={styles.catRow}>
                          <Text style={{ color: COLORS.textDim, fontSize: 11, width: 14, marginRight: 6 }}>{i + 1}</Text>
                          <CategoryImage image={cat.image} icon={cat.icon} size={18} style={{ marginRight: 8 }} />
                          <Text style={styles.catName}>{cat.name}</Text>
                          <Text style={[styles.catAmount, { color: COLORS.expense }]}>{formatCurrency(cat.amount)}</Text>
                        </View>
                        <View style={styles.catBarBg}>
                          <LinearGradient
                            colors={[COLORS.expense, `${COLORS.expense}44`]}
                            style={[styles.catBarFill, { width: `${(cat.amount / (reportExpByCat[0]?.amount || 1)) * 100}%` }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </GlowCard>
              </>
            )}

            {/* Budget status */}
            {budgetRows.length > 0 && (
              <>
                <View style={{ position: 'relative' }}>
                  <SectionHeader title="PRESUPUESTOS ESTE MES" />
                  <HintTooltip
                    hintKey="budgets_hint"
                    text="Crea límites de gasto por categoría. Te avisamos cuando te acercas al tope mensual."
                  />
                </View>
                <GlowCard>
                  <View style={{ gap: 12 }}>
                    {budgetRows.map(b => (
                      <View key={b.id}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                          <Text style={{ fontSize: 14 }}>{b.light.icon}</Text>
                          <CategoryImage image={b.cat?.image} icon={b.cat?.icon || '💸'} size={16} style={{ marginRight: 4 }} />
                          <Text style={[styles.catName, { flex: 1 }]}>{b.cat?.name || b.categoryId}</Text>
                          <Text style={[styles.catAmount, { color: b.light.color }]}>{formatCurrency(b.spent)}</Text>
                          <Text style={{ color: COLORS.textDim, fontSize: 11 }}>/{formatCurrency(b.amount)}</Text>
                        </View>
                        <View style={styles.budgetBarBg}>
                          <LinearGradient
                            colors={[b.light.color, `${b.light.color}66`]}
                            style={[styles.budgetBarFill, { width: `${Math.min(b.pct * 100, 100)}%` }]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          />
                        </View>
                      </View>
                    ))}
                  </View>
                </GlowCard>
              </>
            )}

            {/* Goals */}
            {goals && goals.length > 0 && (
              <>
                <SectionHeader title="OBJETIVOS DE AHORRO" />
                <GlowCard>
                  <View style={{ gap: 14 }}>
                    {goals.map(g => {
                      const pct = g.targetAmount > 0 ? Math.min(1, g.currentAmount / g.targetAmount) : 0;
                      const isDone = pct >= 1;
                      const gColor = isDone ? COLORS.income : COLORS.gold;
                      return (
                        <View key={g.id}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                            <Text style={{ fontSize: 18 }}>{g.icon || '🎯'}</Text>
                            <Text style={[styles.catName, { flex: 1 }]}>{g.name}</Text>
                            <Text style={{ color: gColor, fontSize: 12, fontWeight: '700' }}>{Math.round(pct * 100)}%</Text>
                          </View>
                          <View style={styles.goalBarBg}>
                            <LinearGradient
                              colors={isDone ? [COLORS.income, `${COLORS.income}88`] : [COLORS.gold, `${COLORS.gold}66`]}
                              style={[styles.goalBarFill, { width: `${Math.round(pct * 100)}%` }]}
                              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            />
                          </View>
                          <Text style={styles.goalRemaining}>
                            {isDone ? '✓ Alcanzado' : `${formatCurrency(g.currentAmount)} de ${formatCurrency(g.targetAmount)}`}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </GlowCard>
              </>
            )}

            {/* Debts & Loans */}
            {(activeDebts.length > 0 || activeLoans.length > 0) && (
              <>
                <SectionHeader title="DEUDAS Y PRÉSTAMOS ACTIVOS" />
                <GlowCard>
                  <View style={{ gap: 10 }}>
                    {activeDebts.map(d => (
                      <View key={d.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16 }}>{d.icon || '🏚️'}</Text>
                        <Text style={[styles.catName, { flex: 1 }]}>{d.name}</Text>
                        <Text style={{ color: COLORS.expense, fontSize: 12, fontWeight: '700' }}>
                          -{formatCurrency(Math.max(0, d.totalAmount - d.paidAmount))}
                        </Text>
                      </View>
                    ))}
                    {activeLoans.map(l => (
                      <View key={l.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={{ fontSize: 16 }}>{l.icon || '🤝'}</Text>
                        <Text style={[styles.catName, { flex: 1 }]}>{l.name}</Text>
                        <Text style={{ color: COLORS.income, fontSize: 12, fontWeight: '700' }}>
                          +{formatCurrency(Math.max(0, l.totalAmount - l.collectedAmount))}
                        </Text>
                      </View>
                    ))}
                  </View>
                </GlowCard>
              </>
            )}

            {reportTxs.length === 0 && budgetRows.length === 0 && (!goals || goals.length === 0) && (
              <View style={[styles.emptyState, { marginTop: 24 }]}>
                <Text style={{ fontSize: 40 }}>📊</Text>
                <Text style={styles.emptyTitle}>Sin datos</Text>
                <Text style={styles.emptySubtitle}>
                  No hay movimientos en {MONTH_NAMES[reportMonth.month]} {reportMonth.year}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* ══════════════════════════════════════════════════════════════
            ANÁLISIS NORMAL (week / month / quarter)
        ══════════════════════════════════════════════════════════════ */}
        {period !== 'report' && (
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
                        { text: 'Eliminar', style: 'destructive', onPress: async () => {
                          try { await deleteBudget(b.id); }
                          catch (_) { Alert.alert('Error', 'No se pudo eliminar. Comprueba la conexión.'); }
                        }},
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
                          { text: 'Eliminar', style: 'destructive', onPress: async () => {
                            try { await deleteGoal(g.id); }
                            catch (_) { Alert.alert('Error', 'No se pudo eliminar. Comprueba la conexión.'); }
                          }},
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

          {/* ── C5: ALERTAS DE GASTO ANÓMALO ── */}
          {anomalies.length > 0 && (
            <>
              <SectionHeader title="⚠️ GASTOS ANÓMALOS" />
              <GlowCard color="rgba(251,113,133,0.08)">
                <Text style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 10 }}>
                  Categorías que superan en +50% la media de los últimos 3 meses
                </Text>
                <View style={{ gap: 10 }}>
                  {anomalies.map(a => (
                    <View key={a.catId} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <CategoryImage image={a.image} icon={a.icon} size={18} />
                      <Text style={[styles.catName, { flex: 1 }]}>{a.name}</Text>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ color: COLORS.expense, fontSize: 12, fontWeight: '800' }}>{formatCurrency(a.amount)}</Text>
                        <Text style={{ color: COLORS.textDim, fontSize: 10 }}>media: {formatCurrency(a.avg)} ({a.pct > 0 ? '+' : ''}{a.pct}%)</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </GlowCard>
            </>
          )}

          {/* ── C6: REGLA 50/30/20 ── */}
          {rule503020 && (
            <>
              <SectionHeader title="REGLA 50/30/20" />
              <GlowCard>
                <Text style={{ color: COLORS.textDim, fontSize: 10, marginBottom: 12 }}>
                  Distribución recomendada de los ingresos del período
                </Text>
                {[
                  { key: 'needs', label: 'NECESIDADES', emoji: '🏠', color: COLORS.accent },
                  { key: 'wants', label: 'DESEOS',      emoji: '🎉', color: COLORS.gold  },
                  { key: 'saves', label: 'AHORRO',      emoji: '💎', color: COLORS.income },
                ].map(({ key, label, emoji, color }) => {
                  const row = rule503020[key];
                  const over = row.pct > row.target;
                  return (
                    <View key={key} style={{ marginBottom: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 6 }}>
                        <Text style={{ fontSize: 14 }}>{emoji}</Text>
                        <Text style={{ flex: 1, color: COLORS.text, fontSize: 12, fontWeight: '700' }}>
                          {label}
                        </Text>
                        <Text style={{ color: COLORS.textDim, fontSize: 10 }}>
                          meta {row.target}% · real {row.pct}%
                        </Text>
                        <Text style={{ color: over ? COLORS.expense : COLORS.income, fontSize: 11, fontWeight: '800', width: 28, textAlign: 'right' }}>
                          {over ? '▲' : '✓'}
                        </Text>
                      </View>
                      <View style={styles.budgetBarBg}>
                        <LinearGradient
                          colors={[color, `${color}66`]}
                          style={[styles.budgetBarFill, { width: `${Math.min(row.pct, 100)}%`, opacity: over ? 1 : 0.8 }]}
                          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        />
                        {/* Target marker */}
                        <View style={{ position: 'absolute', left: `${row.target}%`, top: 0, bottom: 0, width: 1, backgroundColor: COLORS.textDim }} />
                      </View>
                    </View>
                  );
                })}
              </GlowCard>
            </>
          )}

          {/* ── C8: FLUJO DE CAJA SEMANAL ── */}
          {weeklyCashFlow && (
            <>
              <SectionHeader title="FLUJO DE CAJA SEMANAL" />
              <GlowCard>
                <View style={{ flexDirection: 'row', gap: 16, marginBottom: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.income }} />
                    <Text style={styles.legendText}>Ingresos</Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.expense }} />
                    <Text style={styles.legendText}>Gastos</Text>
                  </View>
                </View>
                <DualBarChart data={weeklyCashFlow} maxVal={maxWeekly} />
              </GlowCard>
            </>
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
        )}
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
  periodRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  periodBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderSubtle },
  periodText: { color: COLORS.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  // Informe mensual
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, paddingVertical: 4 },
  monthNavBtn: { padding: 8 },
  monthNavTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800', letterSpacing: 1, minWidth: 180, textAlign: 'center' },

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
