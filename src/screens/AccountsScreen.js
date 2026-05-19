import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Modal,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { notifySuccess, notifyWarning } from '../utils/haptics';
import { useToast } from '../context/ToastContext';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { COLORS, ACCOUNT_TYPES, ACCOUNT_COLORS } from '../theme';
import { parseAmount, formatCurrency } from '../utils';
import GlowCard from '../components/GlowCard';
import SectionHeader from '../components/SectionHeader';
import CategoryImage from '../components/CategoryImage';

const BLANK = { name: '', type: 'checking', balance: '', color: COLORS.primary };

export default function AccountsScreen() {
  const {
    accounts,
    archivedAccounts,
    totalBalance,
    addAccount,
    updateAccount,
    archiveAccount,
  } = useFinance();

  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // account being edited
  const [form, setForm] = useState(BLANK);
  const [showArchived, setShowArchived] = useState(false);

  const openAdd = () => {
    setEditTarget(null);
    setForm(BLANK);
    setShowModal(true);
  };

  const openEdit = (acc) => {
    setEditTarget(acc);
    setForm({ name: acc.name, type: acc.type, balance: String(acc.balance), color: acc.color });
    setShowModal(true);
  };

  const { showToast } = useToast();

  const handleSave = () => {
    if (!form.name.trim()) return Alert.alert('Error', 'El nombre no puede estar vacío');
    if (editTarget) {
      updateAccount(editTarget.id, {
        name: form.name.trim(),
        type: form.type,
        color: form.color,
      });
    } else {
      addAccount({ ...form, balance: parseAmount(form.balance) });
    }
    notifySuccess();
    showToast(editTarget ? 'Cuenta actualizada ✓' : 'Cuenta creada ✓');
    setForm(BLANK);
    setEditTarget(null);
    setShowModal(false);
  };

  const confirmArchive = (acc) => {
    Alert.alert(
      '¿Archivar cuenta?',
      `"${acc.name}" se archivará. El historial de transacciones se conserva.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Archivar',
          style: 'destructive',
          onPress: () => { notifyWarning(); archiveAccount(acc.id); },
        },
      ]
    );
  };

  const activeAccounts = accounts.filter(a => a.type !== 'savings');
  const savingsAccounts = accounts.filter(a => a.type === 'savings');

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <LinearGradient colors={['#0d0025', COLORS.bg]} style={styles.hero}>
          <Text style={styles.systemLabel}>⟨ GESTIÓN DE CUENTAS ⟩</Text>
          <Text style={styles.totalLabel}>PATRIMONIO TOTAL</Text>
          <Text style={[styles.total, { color: totalBalance >= 0 ? COLORS.gold : COLORS.expense }]}>
            {formatCurrency(totalBalance)}
          </Text>
          <Text style={styles.accountCount}>
            {accounts.length} cuenta{accounts.length !== 1 ? 's' : ''} activa{accounts.length !== 1 ? 's' : ''}
          </Text>
        </LinearGradient>

        <View style={styles.body}>
          {/* Cuentas principales */}
          <SectionHeader
            title="MIS CUENTAS"
            right={
              <TouchableOpacity onPress={openAdd} style={styles.addBtn}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addBtnText}>AÑADIR</Text>
              </TouchableOpacity>
            }
          />

          {activeAccounts.length === 0 && savingsAccounts.length === 0 ? (
            <TouchableOpacity
              style={styles.emptyState}
              onPress={openAdd}
              activeOpacity={0.8}
            >
              <Ionicons name="wallet-outline" size={40} color={COLORS.primary} />
              <Text style={styles.emptyTitle}>Sin cuentas todavía</Text>
              <Text style={styles.emptySubtitle}>
                Añade tus bancos, efectivo o ahorros para empezar a gestionar tu dinero
              </Text>
              <View style={[styles.addBtn, { marginTop: 12 }]}>
                <Ionicons name="add" size={16} color={COLORS.primary} />
                <Text style={styles.addBtnText}>AÑADIR CUENTA</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <>
              {activeAccounts.map(acc => (
                <AccountRow key={acc.id} account={acc} onEdit={openEdit} onArchive={confirmArchive} />
              ))}

              {savingsAccounts.length > 0 && (
                <>
                  <SectionHeader title="AHORROS" style={{ marginTop: 8 }} />
                  {savingsAccounts.map(acc => (
                    <AccountRow key={acc.id} account={acc} onEdit={openEdit} onArchive={confirmArchive} />
                  ))}
                </>
              )}
            </>
          )}

          {/* Cuentas archivadas */}
          {archivedAccounts && archivedAccounts.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <TouchableOpacity
                style={styles.archivedToggle}
                onPress={() => setShowArchived(v => !v)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={showArchived ? 'chevron-down' : 'chevron-forward'}
                  size={14}
                  color={COLORS.textDim}
                />
                <Text style={styles.archivedToggleText}>
                  ARCHIVADAS ({archivedAccounts.length})
                </Text>
              </TouchableOpacity>

              {showArchived && archivedAccounts.map(acc => (
                <AccountRow key={acc.id} account={acc} archived />
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      {/* Add / Edit Account Modal */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent
        onRequestClose={() => { setShowModal(false); setEditTarget(null); setForm(BLANK); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalSheet}>
            <View style={styles.handle} />
            <Text style={styles.modalTitle}>
              {editTarget ? '[ EDITAR CUENTA ]' : '[ NUEVA CUENTA ]'}
            </Text>

            <Text style={styles.fieldLabel}>NOMBRE</Text>
            <TextInput
              style={styles.input}
              placeholder="Ej. Cuenta BBVA"
              placeholderTextColor={COLORS.textDim}
              value={form.name}
              onChangeText={v => setForm(p => ({ ...p, name: v }))}
            />

            <Text style={styles.fieldLabel}>TIPO</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {ACCOUNT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t.id}
                    style={[
                      styles.typeChip,
                      form.type === t.id && {
                        backgroundColor: COLORS.primaryGlow,
                        borderColor: COLORS.primary,
                      },
                    ]}
                    onPress={() => setForm(p => ({ ...p, type: t.id }))}
                  >
                    <CategoryImage image={t.image} icon={t.icon} size={16} />
                    <Text style={styles.typeChipText}>{t.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {!editTarget && (
              <>
                <Text style={styles.fieldLabel}>SALDO INICIAL (€)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0,00"
                  placeholderTextColor={COLORS.textDim}
                  keyboardType="decimal-pad"
                  value={form.balance}
                  onChangeText={v => setForm(p => ({ ...p, balance: v }))}
                />
              </>
            )}

            <Text style={styles.fieldLabel}>COLOR</Text>
            <View style={styles.colorRow}>
              {ACCOUNT_COLORS.map(c => (
                <TouchableOpacity
                  key={c}
                  onPress={() => setForm(p => ({ ...p, color: c }))}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    form.color === c && styles.colorDotSelected,
                  ]}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => { setShowModal(false); setEditTarget(null); setForm(BLANK); }}
              >
                <Text style={styles.cancelBtnText}>CANCELAR</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.confirmBtn]} onPress={handleSave}>
                <LinearGradient
                  colors={[COLORS.primary, COLORS.primaryDark]}
                  style={StyleSheet.absoluteFill}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
                <Text style={styles.confirmBtnText}>GUARDAR</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function AccountRow({ account, onEdit, onArchive, archived = false }) {
  const accountType = ACCOUNT_TYPES.find(t => t.id === account.type);
  const pct = account.balance > 0 ? Math.min(100, (account.balance / 10000) * 100) : 0;

  return (
    <GlowCard style={[styles.accCard, archived && styles.accCardArchived]} color={archived ? 'transparent' : `${account.color}44`}>
      <View style={styles.accHeader}>
        <View style={styles.accLeft}>
          <View style={[
            styles.accIconBg,
            { backgroundColor: `${account.color}22`, borderColor: archived ? COLORS.borderSubtle : account.color },
          ]}>
            <CategoryImage image={accountType?.image} icon={accountType?.icon || '💳'} size={26} style={archived ? { opacity: 0.5 } : undefined} />
          </View>
          <View>
            <Text style={[styles.accName, archived && { color: COLORS.textDim }]}>{account.name}</Text>
            <Text style={styles.accType}>
              {archived ? '🗃 ARCHIVADA' : accountType?.label || 'Cuenta'}
            </Text>
          </View>
        </View>

        {!archived && (
          <View style={styles.accActions}>
            <TouchableOpacity onPress={() => onEdit(account)} style={styles.actionBtn}>
              <Ionicons name="pencil-outline" size={15} color={COLORS.textDim} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onArchive(account)} style={styles.actionBtn}>
              <Ionicons name="archive-outline" size={15} color={COLORS.textDim} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.accBalanceRow}>
        <Text style={[
          styles.accBalance,
          { color: archived ? COLORS.textDim : account.balance >= 0 ? COLORS.text : COLORS.expense },
        ]}>
          {formatCurrency(account.balance)}
        </Text>
      </View>

      {account.balance > 0 && !archived && (
        <View style={styles.progressBg}>
          <LinearGradient
            colors={[account.color, `${account.color}55`]}
            style={[styles.progressFill, { width: `${pct}%` }]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          />
        </View>
      )}
    </GlowCard>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 100 },

  hero: {
    paddingTop: 60,
    paddingBottom: 28,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  systemLabel: {
    color: COLORS.goldLight,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 3,
    marginBottom: 12,
    opacity: 0.9,
  },
  totalLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 3, marginBottom: 6 },
  total: { fontSize: 36, fontWeight: '800', letterSpacing: -1 },
  accountCount: { color: COLORS.textDim, fontSize: 12, marginTop: 8 },

  body: { paddingHorizontal: 16, paddingTop: 20, gap: 12 },

  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  addBtnText: { color: COLORS.primaryLight, fontSize: 10, fontWeight: '700', letterSpacing: 1 },

  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 4,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: COLORS.border,
    gap: 8,
  },
  emptyTitle: { color: COLORS.text, fontSize: 16, fontWeight: '700', marginTop: 8 },
  emptySubtitle: { color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 18 },

  // Account row
  accCard: { marginBottom: 0 },
  accCardArchived: { opacity: 0.65 },
  accHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  accLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  accIconBg: { width: 42, height: 42, borderRadius: 4, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  accIconText: { fontSize: 20 },
  accName: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  accType: { color: COLORS.textDim, fontSize: 10, letterSpacing: 1, marginTop: 2 },
  accActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },
  accBalanceRow: { marginBottom: 10 },
  accBalance: { fontSize: 22, fontWeight: '800' },
  progressBg: { height: 3, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  progressFill: { height: 3, borderRadius: 2 },

  // Archived toggle
  archivedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  archivedToggleText: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalSheet: {
    backgroundColor: COLORS.bgModal,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: 24,
    paddingBottom: 40,
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '700', letterSpacing: 2, marginBottom: 20 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, letterSpacing: 2, marginBottom: 8, fontWeight: '600' },
  input: {
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1,
    borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCardLight,
  },
  typeChipText: { color: COLORS.text, fontSize: 12, fontWeight: '600' },
  colorRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap', marginBottom: 24 },
  colorDot: { width: 30, height: 30, borderRadius: 15 },
  colorDotSelected: { borderWidth: 3, borderColor: COLORS.white, transform: [{ scale: 1.15 }] },
  modalActions: { flexDirection: 'row', gap: 12 },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.border },
  cancelBtnText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
  confirmBtn: { position: 'relative' },
  confirmBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 12, letterSpacing: 1 },
});
