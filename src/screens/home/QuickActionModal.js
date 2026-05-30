import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, Modal, TextInput, ScrollView,
  TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../theme';
import CategoryImage from '../../components/CategoryImage';

// ── Quick amount-entry modal (expense or income) ──────────────────────────────
// TextInput no-controlado: no hay re-render por cada tecla.
// El valor se lee del ref solo en el momento de confirmar.
export function QuickActionModal({ visible, type, cat, accounts, defaultAccountId, onClose, onConfirm }) {
  const inputRef  = useRef(null);
  const amountRef = useRef('');
  const [accountId, setAccountId]       = useState('');
  const [accDropdownOpen, setAccDropdownOpen] = useState(false);

  useEffect(() => {
    if (visible) {
      amountRef.current = '';
      inputRef.current?.clear();
      setAccountId(defaultAccountId || '');
      setAccDropdownOpen(false);
    }
  }, [visible, defaultAccountId]);

  if (!cat) return null;
  const isExpense     = type === 'expense';
  const color         = isExpense ? COLORS.expense : COLORS.income;
  const selectableAccounts = accounts.filter(a => a.type !== 'savings');
  const selectedAcc   = selectableAccounts.find(a => a.id === accountId);
  const gradient  = isExpense ? [COLORS.expense, '#c0392b'] : [COLORS.income, '#15803d'];
  const subtitle  = isExpense ? 'Registro rápido de gasto'  : 'Registro rápido de ingreso';
  const btnText   = isExpense ? 'AÑADIR GASTO'              : 'AÑADIR INGRESO';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <View style={styles.header}>
            <CategoryImage image={cat.image} icon={cat.icon} size={36} />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.title}>{cat.name}</Text>
              <Text style={styles.sub}>{subtitle}</Text>
            </View>
          </View>

          <Text style={styles.fieldLabel}>IMPORTE</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder="0,00"
            placeholderTextColor={COLORS.textDim}
            keyboardType="decimal-pad"
            onChangeText={v => { amountRef.current = v; }}
            autoFocus
          />

          <Text style={styles.fieldLabel}>CUENTA</Text>
          <TouchableOpacity
            style={[styles.accSelector, accDropdownOpen && styles.accSelectorOpen, selectedAcc && { borderColor: selectedAcc.color || COLORS.primary }]}
            onPress={() => setAccDropdownOpen(o => !o)}
          >
            <Text style={[styles.accSelectorText, selectedAcc && { color: selectedAcc.color || COLORS.primary }]}>
              {selectedAcc ? selectedAcc.name : 'Selecciona cuenta'}
            </Text>
            <Ionicons name={accDropdownOpen ? 'chevron-up' : 'chevron-down'} size={13} color={selectedAcc ? selectedAcc.color || COLORS.primary : COLORS.textMuted} />
          </TouchableOpacity>
          {accDropdownOpen && (
            <View style={styles.accDropdown}>
              <ScrollView bounces={false} showsVerticalScrollIndicator={false} style={styles.accDropdownScroll} keyboardShouldPersistTaps="handled">
                {selectableAccounts.map((acc, idx) => (
                  <TouchableOpacity
                    key={acc.id}
                    style={[styles.accDropdownItem, idx > 0 && styles.accDropdownItemBorder, accountId === acc.id && styles.accDropdownItemActive]}
                    onPress={() => { setAccountId(acc.id); setAccDropdownOpen(false); }}
                  >
                    <Text style={[styles.accDropdownItemText, accountId === acc.id && { color: acc.color || COLORS.primary }]}>{acc.name}</Text>
                    {accountId === acc.id && <Ionicons name="checkmark" size={13} color={acc.color || COLORS.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={styles.actions}>
            <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>CANCELAR</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btn, styles.confirmBtn]} onPress={() => onConfirm(amountRef.current, accountId)}>
              <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />
              <Ionicons name="flash" size={15} color="#fff" />
              <Text style={styles.confirmText}>{btnText}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Category grid picker modal ────────────────────────────────────────────────
export function CategoryPickerModal({ visible, type, categories, pinnedIds, onPin, onUnpin, onClose }) {
  const isExpense = type === 'expense';
  const cats   = isExpense ? categories.expense : categories.income;
  const color  = isExpense ? COLORS.primary     : COLORS.income;
  const title  = isExpense ? 'AÑADIR A GASTOS RÁPIDOS'   : 'AÑADIR A INGRESOS RÁPIDOS';
  const hint   = 'Mantén pulsado un acceso rápido para quitarlo';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.sheet, { maxHeight: '80%' }]}>
          <View style={styles.handle} />
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.sub}>{hint}</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
            {Object.entries(
              cats.reduce((acc, cat) => {
                if (!acc[cat.group]) acc[cat.group] = [];
                acc[cat.group].push(cat);
                return acc;
              }, {})
            ).map(([group, groupCats]) => (
              <View key={group} style={{ marginBottom: 12 }}>
                <Text style={styles.groupLabel}>{group}</Text>
                <View style={styles.catGrid}>
                  {groupCats.map(cat => {
                    const already = pinnedIds.includes(cat.id);
                    return (
                      <TouchableOpacity
                        key={cat.id}
                        style={[styles.catBtn, already && { borderColor: color, backgroundColor: `${color}18` }]}
                        onPress={() => already ? onUnpin(cat.id) : onPin(cat.id)}
                      >
                        <CategoryImage image={cat.image} icon={cat.icon} size={24} />
                        <Text style={[styles.catText, already && { color }]} numberOfLines={2}>{cat.name}</Text>
                        {already && <Ionicons name="checkmark-circle" size={12} color={color} style={{ position: 'absolute', top: 4, right: 4 }} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={[styles.btn, styles.confirmBtn, { marginTop: 12 }]} onPress={onClose}>
            <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
            <Text style={styles.confirmText}>LISTO</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  sheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 24, paddingBottom: 36,
    borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: COLORS.borderSubtle,
  },
  handle: { width: 36, height: 3, backgroundColor: COLORS.borderMid, borderRadius: 2, alignSelf: 'center', marginBottom: 22 },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  title: { color: COLORS.text, fontSize: 16, fontWeight: '800', letterSpacing: 0.5 },
  sub: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  input: {
    borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 18, fontWeight: '700',
    backgroundColor: COLORS.surface, marginBottom: 16,
  },
  accSelector: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bgCard, borderRadius: 6, marginBottom: 6,
  },
  accSelectorOpen: {
    borderBottomLeftRadius: 0, borderBottomRightRadius: 0, marginBottom: 0,
  },
  accSelectorText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  accDropdown: {
    borderWidth: 1, borderTopWidth: 0, borderColor: COLORS.borderSubtle,
    borderBottomLeftRadius: 6, borderBottomRightRadius: 6,
    backgroundColor: COLORS.bgCard, marginBottom: 16, overflow: 'hidden',
    maxHeight: 180,
  },
  accDropdownScroll: { flexGrow: 0 },
  accDropdownItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingVertical: 11,
  },
  accDropdownItemBorder: { borderTopWidth: 1, borderTopColor: COLORS.borderSubtle },
  accDropdownItemActive: { backgroundColor: COLORS.primaryGlow },
  accDropdownItemText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexDirection: 'row', gap: 6 },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard },
  cancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  confirmBtn: { overflow: 'hidden' },
  confirmText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  groupLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catBtn: { width: 72, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard, gap: 4, position: 'relative' },
  catText: { color: COLORS.textDim, fontSize: 9, fontWeight: '600', textAlign: 'center' },
});
