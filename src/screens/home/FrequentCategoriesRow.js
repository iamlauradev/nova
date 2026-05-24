import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import CategoryImage from '../../components/CategoryImage';

export default function FrequentCategoriesRow({ cats, type, pinnedIds, onPress, onLongPress, onPickerOpen, onAddEmpty }) {
  const color = type === 'expense' ? COLORS.expense : COLORS.income;
  const glow  = type === 'expense' ? COLORS.expenseGlow : COLORS.incomeGlow;
  const emptyLabel = type === 'expense' ? 'Añadir gasto' : 'Añadir ingreso';

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickScroll}>
      {cats.length === 0 ? (
        <TouchableOpacity style={styles.quickChipAdd} onPress={onAddEmpty}>
          <Ionicons name="flash" size={16} color={color} />
          <Text style={[styles.quickChipText, { color }]}>{emptyLabel}</Text>
        </TouchableOpacity>
      ) : (
        cats.map(cat => {
          const isPinned = pinnedIds.includes(cat.id);
          return (
            <TouchableOpacity
              key={cat.id}
              style={[styles.quickChip, { borderColor: color }]}
              onPress={() => onPress(cat)}
              onLongPress={() => isPinned && onLongPress(cat.id)}
              activeOpacity={0.75}
            >
              <LinearGradient colors={[glow, 'transparent']} style={StyleSheet.absoluteFill} />
              <CategoryImage image={cat.image} icon={cat.icon} size={22} />
              <Text style={styles.quickChipText} numberOfLines={1}>{cat.name}</Text>
              {isPinned && <View style={[styles.quickPinDot, { backgroundColor: color }]} />}
            </TouchableOpacity>
          );
        })
      )}
      <TouchableOpacity style={[styles.quickChipAdd, { marginLeft: 4 }]} onPress={onPickerOpen}>
        <Ionicons name="add" size={18} color={COLORS.primaryLight} />
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  quickScroll: { paddingBottom: 4, gap: 8, paddingHorizontal: 2 },
  quickChip: {
    flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    width: 82, paddingVertical: 11, paddingHorizontal: 6, borderRadius: 8,
    borderWidth: 1, overflow: 'hidden', backgroundColor: COLORS.bgCard, gap: 5,
    position: 'relative',
  },
  quickChipText: { color: COLORS.textMuted, fontSize: 10, fontWeight: '600', textAlign: 'center' },
  quickPinDot: { position: 'absolute', top: 5, right: 5, width: 5, height: 5, borderRadius: 3 },
  quickChipAdd: {
    width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderStyle: 'dashed', borderColor: COLORS.borderMid,
    backgroundColor: COLORS.bgCard, alignSelf: 'center', flexDirection: 'row', gap: 4,
  },
});
