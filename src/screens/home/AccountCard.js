import React, { memo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ACCOUNT_TYPES } from '../../theme';
import { formatCurrency } from '../../utils';
import CategoryImage from '../../components/CategoryImage';

const AccountCard = memo(function AccountCard({ account, onPress }) {
  const accountType = ACCOUNT_TYPES.find(t => t.id === account.type);
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.card, { borderColor: `${account.color || COLORS.primary}55` }]}>
        <LinearGradient
          colors={[`${account.color || COLORS.primary}22`, 'transparent']}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <View style={styles.iconWrap}>
          <CategoryImage image={accountType?.image} icon={accountType?.icon || '💳'} size={28} />
        </View>
        <Text style={styles.name} numberOfLines={1}>{account.name}</Text>
        <Text style={styles.type}>{accountType?.label || 'Cuenta'}</Text>
        <Text style={[styles.balance, { color: account.balance >= 0 ? COLORS.income : COLORS.expense }]}>
          {formatCurrency(account.balance)}
        </Text>
      </View>
    </TouchableOpacity>
  );
});

export default AccountCard;

const styles = StyleSheet.create({
  card: {
    width: 144, borderRadius: 6, borderWidth: 1,
    padding: 16, overflow: 'hidden', backgroundColor: COLORS.bgCard,
  },
  iconWrap: { marginBottom: 10, width: 32, height: 32, justifyContent: 'center' },
  name: { color: COLORS.text, fontSize: 13, fontWeight: '700', marginBottom: 2 },
  type: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1.2, marginBottom: 10 },
  balance: { fontSize: 15, fontWeight: '800' },
});
