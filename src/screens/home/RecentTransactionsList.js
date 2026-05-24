import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';
import GlowCard from '../../components/GlowCard';
import SectionHeader from '../../components/SectionHeader';
import TransactionRow from './TransactionRow';

export default function RecentTransactionsList({ recent, accounts, categories, onViewAll }) {
  return (
    <>
      <SectionHeader
        title="ACTIVIDAD RECIENTE"
        right={
          <TouchableOpacity onPress={onViewAll}>
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
    </>
  );
}

const styles = StyleSheet.create({
  seeAll: { color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' },
  noData: { color: COLORS.textMuted, textAlign: 'center', fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.borderSubtle, marginHorizontal: 12 },
});
