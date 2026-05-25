import React, { memo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import { formatCurrency, formatDateShort as formatDate } from '../../utils';
import CategoryImage from '../../components/CategoryImage';

const TransactionRow = memo(function TransactionRow({ tx, accounts, categories }) {
  const account = accounts.find(a => a.id === tx.accountId);
  const isTransfer = tx.type === 'transfer-in' || tx.type === 'transfer-out';
  const isIncome = tx.type === 'income';
  const cats = isIncome ? categories.income : categories.expense;
  const cat = cats.find(c => c.id === tx.category);

  const iconBg = isTransfer ? `${COLORS.gold}22` : 'transparent';
  const iconBorder = isTransfer ? COLORS.gold : isIncome ? COLORS.income : COLORS.expense;
  const amountColor =
    tx.type === 'transfer-in'  ? COLORS.income  :
    tx.type === 'transfer-out' ? COLORS.expense :
    isIncome ? COLORS.income : COLORS.expense;
  const sign = isIncome || tx.type === 'transfer-in' ? '+' : '-';

  return (
    <View style={styles.row}>
      <View style={[styles.icon, { backgroundColor: iconBg, borderColor: iconBorder }]}>
        {isTransfer
          ? <Ionicons
              name={tx.type === 'transfer-out' ? 'arrow-forward-circle' : 'arrow-back-circle'}
              size={18}
              color={COLORS.gold}
            />
          : <CategoryImage image={cat?.image} icon={cat?.icon || '💸'} size={30} />
        }
      </View>
      <View style={styles.info}>
        <Text style={styles.name} numberOfLines={1}>
          {tx.description || (isTransfer ? 'Transferencia' : cat?.name || 'Movimiento')}
        </Text>
        <Text style={styles.sub}>{account?.name || '?'} · {formatDate(tx.date)}</Text>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}{formatCurrency(tx.amount)}
      </Text>
    </View>
  );
});

export default TransactionRow;

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 12 },
  icon: { width: 42, height: 42, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1 },
  name: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  sub: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  amount: { fontSize: 13, fontWeight: '800' },
});
