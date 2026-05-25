import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFinance } from '../context/FinanceContext';
import { COLORS } from '../theme';
import { formatCurrency } from '../utils';
import GlowCard from '../components/GlowCard';
import SectionHeader from '../components/SectionHeader';
import CategoryImage from '../components/CategoryImage';
import { HomeSkeleton } from '../components/SkeletonLoader';
import AccountCard from './home/AccountCard';
import HomeHero from './home/HomeHero';
import FrequentCategoriesRow from './home/FrequentCategoriesRow';
import RecentTransactionsList from './home/RecentTransactionsList';
import { QuickActionModal, CategoryPickerModal } from './home/QuickActionModal';
import { useQuickActions } from '../hooks/useQuickActions';

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
    accounts, transactions, categories, totalBalance, totalSavings,
    savingsAccounts, freeMoney, monthlyFixed, activeDebts, activeLoans,
    addTransaction, budgets, recurringItems, isLoaded,
  } = useFinance();

  const mainAccounts = useMemo(() => accounts.filter(a => a.type !== 'savings'), [accounts]);
  const defaultAccountId = useMemo(() => accounts.find(a => a.type !== 'savings')?.id ?? '', [accounts]);

  // ── Account visibility toggle ─────────────────────────────────────────────
  const [hiddenIds, setHiddenIds] = useState(new Set());
  const toggleAccount = useCallback((id) => {
    setHiddenIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const isFiltered     = hiddenIds.size > 0;
  const visibleBalance = useMemo(
    () => mainAccounts.filter(a => !hiddenIds.has(a.id)).reduce((s, a) => s + (a.balance || 0), 0),
    [mainAccounts, hiddenIds],
  );
  const displayBalance = isFiltered ? visibleBalance : totalBalance;

  // ── Month stats ───────────────────────────────────────────────────────────
  const now = new Date();
  const monthTxs = useMemo(() => transactions.filter(t => {
    if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
    const d = new Date(t.date);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  }), [transactions]);

  const monthIncome  = useMemo(() => monthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const monthExpense = useMemo(() => monthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0), [monthTxs]);
  const monthNet     = monthIncome - monthExpense;

  // ── Previous month delta ──────────────────────────────────────────────────
  const prevMonth = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
  const prevYear  = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
  const prevMonthTxs = useMemo(() => transactions.filter(t => {
    if (t.type === 'transfer-in' || t.type === 'transfer-out') return false;
    const d = new Date(t.date);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  }), [transactions, prevMonth, prevYear]);

  const { incomeDelta, expenseDelta } = useMemo(() => {
    const pIncome  = prevMonthTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const pExpense = prevMonthTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    return {
      incomeDelta:  pIncome  > 0 ? ((monthIncome  - pIncome)  / pIncome)  * 100 : null,
      expenseDelta: pExpense > 0 ? ((monthExpense - pExpense) / pExpense) * 100 : null,
    };
  }, [prevMonthTxs, monthIncome, monthExpense]);

  // ── Net worth ─────────────────────────────────────────────────────────────
  const totalAssets      = accounts.reduce((s, a) => s + a.balance, 0);
  const totalLiabilities = (activeDebts  || []).reduce((s, d) => s + Math.max(0, d.totalAmount - d.paidAmount),     0);
  const loansReceivable  = (activeLoans  || []).reduce((s, l) => s + Math.max(0, l.totalAmount - l.collectedAmount), 0);
  const netWorth         = totalAssets - totalLiabilities + loansReceivable;

  // ── End-of-month projection ───────────────────────────────────────────────
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const dayOfMonth  = now.getDate();
  const progress    = dayOfMonth / daysInMonth;
  const projIncome  = progress > 0 ? monthIncome  / progress : monthIncome;
  const projExpense = progress > 0 ? monthExpense / progress : monthExpense;
  const projNet     = projIncome - projExpense;
  const projBalance = totalBalance + (projNet - monthNet);

  const freeMoneyPct = monthlyFixed > 0 ? Math.min(100, Math.max(0, (freeMoney / (freeMoney + monthlyFixed)) * 100)) : 100;
  const freeColor    = freeMoney > 0 ? COLORS.income : COLORS.expense;

  // ── Budget alerts ─────────────────────────────────────────────────────────
  const budgetAlerts = useMemo(() => {
    if (!budgets?.length) return [];
    return budgets.map(b => {
      const cat   = (categories?.expense || []).find(c => c.id === b.categoryId);
      const spent = monthTxs.filter(t => t.category === b.categoryId).reduce((s, t) => s + t.amount, 0);
      const pct   = b.amount > 0 ? spent / b.amount : 0;
      return { ...b, cat, spent, pct };
    }).filter(b => b.pct >= 0.8);
  }, [budgets, categories, monthTxs]);

  // ── Upcoming recurring charges ────────────────────────────────────────────
  const upcomingCharges = useMemo(() => {
    if (!recurringItems) return [];
    const today = now.getDate();
    return recurringItems
      .filter(r => r.active && r.type === 'expense' && r.frequency === 'monthly' && r.dayOfMonth)
      .map(r => ({ ...r, daysUntil: Number(r.dayOfMonth) >= today ? Number(r.dayOfMonth) - today : null }))
      .filter(r => r.daysUntil !== null && r.daysUntil <= 10)
      .sort((a, b) => a.daysUntil - b.daysUntil)
      .slice(0, 5);
  }, [recurringItems]);

  // ── Recent transactions (memoized para que RecentTransactionsList no re-renderice) ─
  const recent = useMemo(() => transactions.slice(0, 8), [transactions]);

  // ── Callbacks estables de navegación ─────────────────────────────────────
  const onViewAll     = useCallback(() => nav.navigate('Transacciones'),                     [nav]);
  const onAddIncome   = useCallback(() => nav.navigate('Transacciones', { openAdd: 'income' }),   [nav]);
  const onAddExpense  = useCallback(() => nav.navigate('Transacciones', { openAdd: 'expense' }),  [nav]);
  const onAddTransfer = useCallback(() => nav.navigate('Transacciones', { openAdd: 'transfer' }), [nav]);

  // ── Quick actions (debe ir antes de los callbacks de modal) ───────────────
  const qa = useQuickActions({ transactions, categories, accounts, addTransaction });

  // useState setters son estables: podemos usarlos como dependencias sin problema
  const onCloseExpenseModal = useCallback(() => qa.setQuickModal(null),       [qa.setQuickModal]);
  const onCloseIncomeModal  = useCallback(() => qa.setQuickIncomeModal(null), [qa.setQuickIncomeModal]);

  if (!isLoaded) return <HomeSkeleton />;

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        <HomeHero
          mainAccounts={mainAccounts}
          hiddenIds={hiddenIds}
          onToggleAccount={toggleAccount}
          isFiltered={isFiltered}
          displayBalance={displayBalance}
          totalSavings={totalSavings}
          monthIncome={monthIncome}
          monthExpense={monthExpense}
          monthNet={monthNet}
          incomeDelta={incomeDelta}
          expenseDelta={expenseDelta}
        />

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
                <Text style={[styles.freeAmount, { color: freeColor }]}>{formatCurrency(freeMoney)}</Text>
              </View>
              <View style={styles.freeRight}>
                <Text style={styles.freeRightLabel}>FIJOS/MES</Text>
                <Text style={[styles.freeRightAmount, { color: COLORS.expense }]}>-{formatCurrency(monthlyFixed)}</Text>
              </View>
            </View>
            <View style={styles.freeBarBg}>
              <LinearGradient
                colors={freeMoney > 0 ? [COLORS.income, `${COLORS.income}88`] : [COLORS.expense, `${COLORS.expense}88`]}
                style={[styles.freeBarFill, { width: `${freeMoneyPct}%` }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              />
            </View>
            <Text style={styles.freeHint}>Saldo total menos tus gastos fijos mensuales activos</Text>
          </GlowCard>

          {/* ── ALERTAS DE PRESUPUESTO ── */}
          {budgetAlerts.length > 0 && (
            <GlowCard color="rgba(251,191,36,0.08)">
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>⚠️ PRESUPUESTOS</Text>
                <TouchableOpacity onPress={() => nav.navigate('Stats')}>
                  <Text style={styles.seeAll}>Ver todos →</Text>
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
                        <Text style={styles.alertCat}>{b.cat?.name || b.categoryId}</Text>
                        <Text style={[styles.alertPct, { color: over ? COLORS.expense : COLORS.gold }]}>
                          {over ? '🔴' : '🟡'} {Math.round(b.pct * 100)}%
                        </Text>
                      </View>
                      <View style={styles.alertBarBg}>
                        <View style={[styles.alertBarFill, { width: `${Math.min(b.pct * 100, 100)}%`, backgroundColor: over ? COLORS.expense : COLORS.gold }]} />
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
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>📅 PRÓXIMOS CARGOS</Text>
                <TouchableOpacity onPress={() => nav.navigate('Fijos')}>
                  <Text style={styles.seeAll}>Ver todos →</Text>
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
            <TouchableOpacity style={[styles.actionBtn, { borderColor: COLORS.income }]} onPress={onAddIncome} activeOpacity={0.8}>
              <LinearGradient colors={[COLORS.incomeGlow, 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="arrow-up-circle" size={20} color={COLORS.income} />
              <Text style={[styles.actionText, { color: COLORS.income }]}>INGRESO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: COLORS.expense }]} onPress={onAddExpense} activeOpacity={0.8}>
              <LinearGradient colors={[COLORS.expenseGlow, 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="arrow-down-circle" size={20} color={COLORS.expense} />
              <Text style={[styles.actionText, { color: COLORS.expense }]}>GASTO</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, { borderColor: COLORS.gold, flex: 0.7 }]} onPress={onAddTransfer} activeOpacity={0.8}>
              <LinearGradient colors={[`${COLORS.gold}22`, 'transparent']} style={StyleSheet.absoluteFill} />
              <Ionicons name="swap-horizontal" size={20} color={COLORS.gold} />
              <Text style={[styles.actionText, { color: COLORS.gold }]}>MOVER</Text>
            </TouchableOpacity>
          </View>

          {/* ── GASTOS RÁPIDOS ── */}
          <SectionHeader title="⚡ GASTOS RÁPIDOS" right={<TouchableOpacity onPress={qa.openExpenseCatPicker}><Text style={styles.seeAll}>+ Añadir</Text></TouchableOpacity>} />
          <FrequentCategoriesRow
            cats={qa.quickCats} type="expense" pinnedIds={qa.pinnedCatIds}
            onPress={qa.openQuickAdd} onLongPress={qa.unpinCategory}
            onPickerOpen={qa.openExpenseCatPicker}
            onAddEmpty={onAddExpense}
          />

          {/* ── INGRESOS RÁPIDOS ── */}
          <SectionHeader title="⚡ INGRESOS RÁPIDOS" right={<TouchableOpacity onPress={qa.openIncomeCatPicker}><Text style={styles.seeAll}>+ Añadir</Text></TouchableOpacity>} />
          <FrequentCategoriesRow
            cats={qa.quickIncomeCats} type="income" pinnedIds={qa.pinnedIncomeIds}
            onPress={qa.openQuickIncomeAdd} onLongPress={qa.unpinIncomeCategory}
            onPickerOpen={qa.openIncomeCatPicker}
            onAddEmpty={onAddIncome}
          />

          {/* ── CUENTAS ── */}
          <SectionHeader title="CUENTAS" right={<TouchableOpacity onPress={() => nav.navigate('Cuentas')}><Text style={styles.seeAll}>Ver todas →</Text></TouchableOpacity>} />
          {mainAccounts.length === 0 ? (
            <TouchableOpacity style={styles.emptyAccounts} onPress={() => nav.navigate('Cuentas')} activeOpacity={0.8}>
              <Ionicons name="add-circle-outline" size={32} color={COLORS.primary} />
              <Text style={styles.emptyText}>Añade tu primera cuenta</Text>
            </TouchableOpacity>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} nestedScrollEnabled contentContainerStyle={styles.accountScroll}>
              {mainAccounts.map(a => (
                <AccountCard key={a.id} account={a} onPress={() => nav.navigate('Cuentas')} />
              ))}
            </ScrollView>
          )}

          {/* ── AHORROS ── */}
          {savingsAccounts.length > 0 && (
            <>
              <SectionHeader title="AHORROS" right={<TouchableOpacity onPress={() => nav.navigate('Cuentas')}><Text style={styles.seeAll}>Ver cuentas →</Text></TouchableOpacity>} />
              <GlowCard color={`${COLORS.gold}22`}>
                <View style={styles.savingsRow}>
                  <View>
                    <Text style={styles.savingsLabel}>TOTAL AHORRADO</Text>
                    <Text style={[styles.savingsAmount, { color: COLORS.gold }]}>{formatCurrency(totalSavings)}</Text>
                  </View>
                  <Text style={styles.savingsVault}>🏦</Text>
                </View>
                {savingsAccounts.length > 1 && (
                  <View style={styles.savingsBreakdown}>
                    {savingsAccounts.map(a => (
                      <View key={a.id} style={styles.savingsItem}>
                        <View style={[styles.savingsDot, { backgroundColor: a.color || COLORS.gold }]} />
                        <Text style={styles.savingsItemName} numberOfLines={1}>{a.name}</Text>
                        <Text style={[styles.savingsItemAmt, { color: a.color || COLORS.gold }]}>{formatCurrency(a.balance)}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </GlowCard>
            </>
          )}

          {/* ── DEUDAS ACTIVAS ── */}
          {activeDebts?.length > 0 && (
            <>
              <SectionHeader title="DEUDAS" right={<TouchableOpacity onPress={() => nav.navigate('Fijos')}><Text style={styles.seeAll}>Gestionar →</Text></TouchableOpacity>} />
              <GlowCard color="rgba(244,63,94,0.10)">
                {activeDebts.map((debt, i) => {
                  const total = debt.totalAmount || 0;
                  const paid  = debt.paidAmount  || 0;
                  const pct   = total > 0 ? Math.min(paid / total, 1) : 0;
                  return (
                    <View key={debt.id} style={[styles.debtItem, i > 0 && styles.debtDivider]}>
                      <View style={styles.debtHeader}>
                        <Text style={{ fontSize: 16 }}>{debt.icon || '🏚️'}</Text>
                        <Text style={styles.debtName} numberOfLines={1}>{debt.name}</Text>
                        <Text style={styles.debtRemaining}>-{formatCurrency(total - paid)}</Text>
                      </View>
                      <View style={styles.debtBarBg}>
                        <LinearGradient colors={['#f43f5e', '#be123c']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                          style={[styles.debtBarFill, { width: `${Math.round(pct * 100)}%` }]} />
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
              <View style={styles.monthDivider} />
              <View style={styles.monthCell}>
                <Text style={styles.monthCellLabel}>GASTOS</Text>
                <Text style={[styles.monthCellValue, { color: COLORS.expense }]}>-{formatCurrency(monthExpense)}</Text>
              </View>
              <View style={styles.monthDivider} />
              <View style={styles.monthCell}>
                <Text style={styles.monthCellLabel}>BALANCE</Text>
                <Text style={[styles.monthCellValue, { color: monthNet >= 0 ? COLORS.income : COLORS.expense }]}>
                  {monthNet >= 0 ? '+' : ''}{formatCurrency(monthNet)}
                </Text>
              </View>
            </View>
            {monthExpense > 0 && monthIncome > 0 && (
              <View style={styles.monthBar}>
                <LinearGradient colors={[COLORS.income, `${COLORS.income}88`]} style={[styles.monthBarIncome, { flex: monthIncome }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
                <LinearGradient colors={[`${COLORS.expense}88`, COLORS.expense]} style={[styles.monthBarExpense, { flex: monthExpense }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} />
              </View>
            )}
          </GlowCard>

          <RecentTransactionsList
            recent={recent}
            accounts={accounts}
            categories={categories}
            onViewAll={onViewAll}
          />
        </View>
      </ScrollView>

      {/* ── Modals ── */}
      <QuickActionModal
        visible={!!qa.quickModal} type="expense" cat={qa.quickModal?.cat}
        accounts={accounts} defaultAccountId={defaultAccountId}
        onClose={onCloseExpenseModal} onConfirm={qa.confirmQuickAdd}
      />
      <QuickActionModal
        visible={!!qa.quickIncomeModal} type="income" cat={qa.quickIncomeModal?.cat}
        accounts={accounts} defaultAccountId={defaultAccountId}
        onClose={onCloseIncomeModal} onConfirm={qa.confirmQuickIncomeAdd}
      />
      <CategoryPickerModal
        visible={qa.showCatPicker} type="expense" categories={categories}
        pinnedIds={qa.pinnedCatIds} onPin={qa.pinCategory} onUnpin={qa.unpinCategory}
        onClose={qa.closeExpenseCatPicker}
      />
      <CategoryPickerModal
        visible={qa.showIncomeCatPicker} type="income" categories={categories}
        pinnedIds={qa.pinnedIncomeIds} onPin={qa.pinIncomeCategory} onUnpin={qa.unpinIncomeCategory}
        onClose={qa.closeIncomeCatPicker}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 100 },
  body: { paddingHorizontal: 14, paddingTop: 16, gap: 12 },
  seeAll: { color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' },

  netWorthHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  netWorthLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  netWorthValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  netWorthRight: { alignItems: 'flex-end', gap: 4 },
  netWorthRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  netWorthRowLabel: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1 },
  netWorthRowValue: { fontSize: 12, fontWeight: '700' },

  freeMoneyHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 10 },
  freeLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, fontWeight: '700', marginBottom: 4 },
  freeAmount: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  freeRight: { alignItems: 'flex-end' },
  freeRightLabel: { color: COLORS.textDim, fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  freeRightAmount: { fontSize: 15, fontWeight: '700' },
  freeBarBg: { height: 5, backgroundColor: COLORS.borderSubtle, borderRadius: 3, overflow: 'hidden', marginBottom: 8 },
  freeBarFill: { height: 5, borderRadius: 3 },
  freeHint: { color: COLORS.textDim, fontSize: 10, lineHeight: 14 },

  alertHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  alertTitle: { fontSize: 10, fontWeight: '800', color: COLORS.gold, letterSpacing: 1.5 },
  budgetAlertRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  alertCat: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  alertPct: { fontSize: 11, fontWeight: '700' },
  alertBarBg: { height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  alertBarFill: { height: 4, borderRadius: 2 },

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

  upcomingRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7 },
  upcomingName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  upcomingWhen: { color: COLORS.textDim, fontSize: 10, marginTop: 1 },
  upcomingAmt: { color: COLORS.expense, fontSize: 13, fontWeight: '800' },

  actionsRow: { flexDirection: 'row', gap: 10, marginVertical: 4 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 6, borderWidth: 1, overflow: 'hidden' },
  actionText: { fontWeight: '800', fontSize: 11, letterSpacing: 1.5 },

  accountScroll: { paddingBottom: 4, gap: 12 },
  emptyAccounts: { alignItems: 'center', justifyContent: 'center', padding: 24, borderRadius: 4, borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.border, marginBottom: 4, gap: 8 },
  emptyText: { color: COLORS.textMuted, fontSize: 13 },

  savingsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  savingsLabel: { color: COLORS.textMuted, fontSize: 9, letterSpacing: 2, fontWeight: '600', marginBottom: 4 },
  savingsAmount: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  savingsVault: { fontSize: 32 },
  savingsBreakdown: { marginTop: 12, gap: 6 },
  savingsItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  savingsDot: { width: 8, height: 8, borderRadius: 4 },
  savingsItemName: { flex: 1, color: COLORS.textDim, fontSize: 12 },
  savingsItemAmt: { fontSize: 12, fontWeight: '700' },

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

  monthGrid: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  monthCell: { flex: 1, alignItems: 'center' },
  monthCellLabel: { color: COLORS.textDim, fontSize: 9, letterSpacing: 2, fontWeight: '600', marginBottom: 4 },
  monthCellValue: { fontSize: 14, fontWeight: '800' },
  monthDivider: { width: 1, height: 32, backgroundColor: COLORS.borderSubtle },
  monthBar: { flexDirection: 'row', height: 5, borderRadius: 3, overflow: 'hidden' },
  monthBarIncome: { height: 5 },
  monthBarExpense: { height: 5 },
});
