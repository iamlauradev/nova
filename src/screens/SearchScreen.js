import React, { useState, useMemo } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  StyleSheet, SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFinance } from '../context/FinanceContext';
import { COLORS } from '../theme';
import { formatCurrency, formatDateShort } from '../utils';

function ResultRow({ icon, title, subtitle, right, rightColor }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowIcon}>{icon}</Text>
      <View style={styles.rowInfo}>
        <Text style={styles.rowTitle} numberOfLines={1}>{title}</Text>
        {subtitle ? <Text style={styles.rowSub} numberOfLines={1}>{subtitle}</Text> : null}
      </View>
      {right ? <Text style={[styles.rowRight, { color: rightColor || COLORS.text }]}>{right}</Text> : null}
    </View>
  );
}

export default function SearchScreen() {
  const nav = useNavigation();
  const { transactions, accounts, categories, goals, debts, loans } = useFinance();
  const [query, setQuery] = useState('');

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (q.length < 2) return [];
    const items = [];
    const allCats = [...(categories.income || []), ...(categories.expense || [])];

    transactions.forEach(tx => {
      const desc = (tx.description || '').toLowerCase();
      const cat = allCats.find(c => c.id === tx.category);
      const catName = (cat?.name || '').toLowerCase();
      if (desc.includes(q) || catName.includes(q)) {
        items.push({
          key: `tx_${tx.id}`,
          type: 'transaction',
          icon: cat?.icon || (tx.type === 'income' ? '💰' : tx.type === 'transfer-in' || tx.type === 'transfer-out' ? '↔️' : '💸'),
          title: tx.description || cat?.name || 'Movimiento',
          subtitle: `${formatDateShort(tx.date)} · ${cat?.name || tx.type}`,
          right: `${tx.type === 'income' || tx.type === 'transfer-in' ? '+' : '-'}${formatCurrency(tx.amount)}`,
          rightColor: tx.type === 'income' || tx.type === 'transfer-in' ? COLORS.income : COLORS.expense,
        });
      }
    });

    accounts.forEach(acc => {
      if (acc.name.toLowerCase().includes(q)) {
        items.push({
          key: `acc_${acc.id}`,
          type: 'account',
          icon: '🏦',
          title: acc.name,
          subtitle: acc.type,
          right: formatCurrency(acc.balance),
          rightColor: acc.balance >= 0 ? COLORS.income : COLORS.expense,
        });
      }
    });

    (goals || []).forEach(g => {
      if (g.name.toLowerCase().includes(q)) {
        const pct = g.targetAmount > 0 ? g.currentAmount / g.targetAmount : 0;
        items.push({
          key: `goal_${g.id}`,
          type: 'goal',
          icon: g.icon || '🎯',
          title: g.name,
          subtitle: `${Math.round(pct * 100)}% completado`,
          right: formatCurrency(g.targetAmount),
          rightColor: COLORS.gold,
        });
      }
    });

    (debts || []).forEach(d => {
      if (d.name.toLowerCase().includes(q)) {
        items.push({
          key: `debt_${d.id}`,
          type: 'debt',
          icon: d.icon || '🏚️',
          title: d.name,
          subtitle: `Deuda · ${Math.round((d.paidAmount / d.totalAmount) * 100)}% pagado`,
          right: formatCurrency(d.totalAmount - d.paidAmount),
          rightColor: COLORS.expense,
        });
      }
    });

    (loans || []).forEach(l => {
      if (l.name.toLowerCase().includes(q)) {
        items.push({
          key: `loan_${l.id}`,
          type: 'loan',
          icon: l.icon || '🤝',
          title: l.name,
          subtitle: `Préstamo · ${Math.round((l.collectedAmount / l.totalAmount) * 100)}% cobrado`,
          right: formatCurrency(l.totalAmount - l.collectedAmount),
          rightColor: COLORS.gold,
        });
      }
    });

    return items.slice(0, 40);
  }, [q, transactions, accounts, categories, goals, debts, loans]);

  const TYPE_LABELS = { transaction: 'Movimiento', account: 'Cuenta', goal: 'Meta', debt: 'Deuda', loan: 'Préstamo' };

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => nav.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <TextInput
          style={styles.input}
          placeholder="Buscar movimientos, cuentas, metas..."
          placeholderTextColor={COLORS.textDim}
          value={query}
          onChangeText={setQuery}
          autoFocus
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')} style={styles.clear}>
            <Ionicons name="close-circle" size={18} color={COLORS.textDim} />
          </TouchableOpacity>
        )}
      </View>

      {q.length < 2 && (
        <View style={styles.hint}>
          <Ionicons name="search-outline" size={40} color={COLORS.textDim} />
          <Text style={styles.hintText}>Escribe al menos 2 caracteres</Text>
        </View>
      )}

      {q.length >= 2 && results.length === 0 && (
        <View style={styles.hint}>
          <Text style={styles.hintText}>Sin resultados para "{query}"</Text>
        </View>
      )}

      <FlatList
        data={results}
        keyExtractor={item => item.key}
        renderItem={({ item }) => (
          <View>
            <ResultRow
              icon={item.icon}
              title={item.title}
              subtitle={`${TYPE_LABELS[item.type] || ''} · ${item.subtitle}`}
              right={item.right}
              rightColor={item.rightColor}
            />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    gap: 8,
  },
  back: { padding: 4 },
  input: {
    flex: 1,
    backgroundColor: COLORS.bgCard,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: COLORS.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  clear: { padding: 4 },
  hint: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, opacity: 0.5 },
  hintText: { color: COLORS.textMuted, fontSize: 13 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  rowIcon: { fontSize: 20, width: 28, textAlign: 'center' },
  rowInfo: { flex: 1 },
  rowTitle: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  rowSub: { color: COLORS.textDim, fontSize: 11, marginTop: 1 },
  rowRight: { fontSize: 13, fontWeight: '700' },
  sep: { height: 1, backgroundColor: COLORS.borderSubtle, marginLeft: 56 },
});
