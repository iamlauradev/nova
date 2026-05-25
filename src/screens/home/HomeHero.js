import React, { memo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import AnimatedNumber from '../../components/AnimatedNumber';
import { formatCurrency } from '../../utils';

const HomeHero = memo(function HomeHero({
  mainAccounts, hiddenIds, onToggleAccount, isFiltered, displayBalance,
  totalSavings, monthIncome, monthExpense, monthNet, incomeDelta, expenseDelta,
}) {
  return (
    <LinearGradient colors={['#0a0030', '#080820', COLORS.bg]} locations={[0, 0.5, 1]} style={styles.hero}>
      <Text style={styles.systemLabel}>⟨ SISTEMA FINANCIERO ⟩</Text>
      <Text style={styles.balanceLabel}>{isFiltered ? 'SALDO SELECCIONADO' : 'SALDO DISPONIBLE'}</Text>
      <AnimatedNumber
        value={displayBalance}
        style={[styles.totalBalance, { color: displayBalance >= 0 ? COLORS.accent : COLORS.expense }]}
        format={formatCurrency}
      />
      {totalSavings > 0 && (
        <Text style={styles.savingsHint}>+ {formatCurrency(totalSavings)} en ahorros</Text>
      )}

      {mainAccounts.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.accountChips}>
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
                onPress={() => onToggleAccount(a.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.chipDot, { backgroundColor: hidden ? COLORS.textDim : (a.color || COLORS.primary) }]} />
                <Text style={[styles.chipLabel, { color: hidden ? COLORS.textDim : COLORS.text }]}>{a.name}</Text>
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
  );
});

export default HomeHero;

const styles = StyleSheet.create({
  hero: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 20, alignItems: 'center' },
  systemLabel: { color: COLORS.accentLight, fontSize: 10, fontWeight: '700', letterSpacing: 3, marginBottom: 16, opacity: 0.8 },
  balanceLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', letterSpacing: 3, marginBottom: 6 },
  totalBalance: { fontSize: 38, fontWeight: '800', letterSpacing: -1, textShadowColor: COLORS.accentGlow, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 20 },
  savingsHint: { color: COLORS.gold, fontSize: 12, fontWeight: '600', marginTop: 4, opacity: 0.85 },
  accountChips: { flexDirection: 'row', gap: 8, paddingHorizontal: 4, paddingVertical: 12 },
  accountChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1, backgroundColor: 'transparent' },
  accountChipHidden: { borderColor: COLORS.borderSubtle, backgroundColor: 'transparent' },
  chipDot: { width: 7, height: 7, borderRadius: 4 },
  chipLabel: { fontSize: 12, fontWeight: '600' },
  chipAmt: { fontSize: 11, fontWeight: '700' },
  summaryRow: { flexDirection: 'row', gap: 8, marginTop: 4, flexWrap: 'wrap', justifyContent: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  pillText: { fontSize: 12, fontWeight: '700' },
  deltaBadge: { fontSize: 9, fontWeight: '800', marginLeft: 2 },
});
