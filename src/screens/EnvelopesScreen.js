import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, KeyboardAvoidingView, Platform, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useFinance } from '../context/FinanceContext';
import { COLORS } from '../theme';
import { formatCurrency } from '../utils';
import GlowCard from '../components/GlowCard';
import SectionHeader from '../components/SectionHeader';
import CategoryImage from '../components/CategoryImage';
import { api } from '../services/api';

const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

export default function EnvelopesScreen() {
  const { transactions, categories } = useFinance();

  const today = new Date();
  const [navYear,  setNavYear]  = useState(today.getFullYear());
  const [navMonth, setNavMonth] = useState(today.getMonth());

  // envelopes: { [categoryId]: assigned }
  const [envelopes, setEnvelopes] = useState({});
  const [loading,   setLoading]   = useState(false);

  // editing state
  const [editModal,  setEditModal]  = useState(null); // { catId, cat }
  const [editAmount, setEditAmount] = useState('');

  // add-envelope picker
  const [showPicker, setShowPicker] = useState(false);

  // ── Load envelopes for selected month ────────────────────────────────────
  const loadEnvelopes = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api.getEnvelopes(navYear, navMonth);
      const map = {};
      rows.forEach(r => { map[r.categoryId] = r.assigned; });
      setEnvelopes(map);
    } catch (_) {}
    setLoading(false);
  }, [navYear, navMonth]);

  useEffect(() => { loadEnvelopes(); }, [loadEnvelopes]);

  // ── Compute spending for the selected month from transactions ─────────────
  const monthSpend = useMemo(() => {
    const map = {};
    transactions.forEach(t => {
      if (t.type !== 'expense') return;
      const d = new Date(t.date);
      if (d.getFullYear() !== navYear || d.getMonth() !== navMonth) return;
      map[t.category] = (map[t.category] || 0) + t.amount;
    });
    return map;
  }, [transactions, navYear, navMonth]);

  const monthIncome = useMemo(() => {
    return transactions
      .filter(t => {
        if (t.type !== 'income') return false;
        const d = new Date(t.date);
        return d.getFullYear() === navYear && d.getMonth() === navMonth;
      })
      .reduce((s, t) => s + t.amount, 0);
  }, [transactions, navYear, navMonth]);

  // ── Derived totals ─────────────────────────────────────────────────────────
  const totalAssigned  = Object.values(envelopes).reduce((s, v) => s + v, 0);
  const toAssign       = monthIncome - totalAssigned;

  // ── Nav helpers ────────────────────────────────────────────────────────────
  const goPrev = () => {
    if (navMonth === 0) { setNavYear(y => y - 1); setNavMonth(11); }
    else setNavMonth(m => m - 1);
  };
  const goNext = () => {
    const isNow = navYear === today.getFullYear() && navMonth === today.getMonth();
    if (isNow) return;
    if (navMonth === 11) { setNavYear(y => y + 1); setNavMonth(0); }
    else setNavMonth(m => m + 1);
  };
  const isCurrentMonth = navYear === today.getFullYear() && navMonth === today.getMonth();

  // ── Save envelope ──────────────────────────────────────────────────────────
  const saveEnvelope = async (catId, amount) => {
    const assigned = parseFloat(amount.replace(',', '.')) || 0;
    try {
      await api.setEnvelope({ year: navYear, month: navMonth, categoryId: catId, assigned });
      setEnvelopes(prev => ({ ...prev, [catId]: assigned }));
    } catch (_) { Alert.alert('Error', 'No se pudo guardar'); }
  };

  const removeEnvelope = async (catId) => {
    Alert.alert('Eliminar sobre', '¿Quitar este sobre del mes?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: async () => {
        try {
          await api.deleteEnvelope(catId, navYear, navMonth);
          setEnvelopes(prev => { const n = { ...prev }; delete n[catId]; return n; });
        } catch (_) { Alert.alert('Error', 'No se pudo eliminar'); }
      }},
    ]);
  };

  // ── Categories with envelopes ─────────────────────────────────────────────
  const activeCatIds = Object.keys(envelopes);
  const activeCats   = activeCatIds
    .map(id => categories.expense.find(c => c.id === id))
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));

  // Also show any category with spending even if no envelope set
  const spendOnlyCats = Object.keys(monthSpend)
    .filter(id => envelopes[id] === undefined)
    .map(id => categories.expense.find(c => c.id === id))
    .filter(Boolean);

  const allCats = [...activeCats, ...spendOnlyCats];

  // ── Available cats for picker (not yet assigned) ───────────────────────────
  const availableCats = categories.expense.filter(c => envelopes[c.id] === undefined);

  return (
    <View style={styles.bg}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* ── HEADER ── */}
        <LinearGradient colors={['#0a0030', '#080820', COLORS.bg]} locations={[0, 0.5, 1]} style={styles.hero}>
          <Text style={styles.heroLabel}>⟨ PRESUPUESTO POR SOBRES ⟩</Text>

          {/* Month nav */}
          <View style={styles.monthNav}>
            <TouchableOpacity onPress={goPrev} style={styles.navBtn}>
              <Ionicons name="chevron-back" size={20} color={COLORS.primaryLight} />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{MONTHS[navMonth]} {navYear}</Text>
            <TouchableOpacity onPress={goNext} style={styles.navBtn} disabled={isCurrentMonth}>
              <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? COLORS.borderSubtle : COLORS.primaryLight} />
            </TouchableOpacity>
          </View>

          {/* Para asignar */}
          <View style={[styles.toAssignBadge, { borderColor: toAssign >= 0 ? COLORS.income : COLORS.expense }]}>
            <Text style={styles.toAssignLabel}>PARA ASIGNAR</Text>
            <Text style={[styles.toAssignAmt, { color: toAssign >= 0 ? COLORS.income : COLORS.expense }]}>
              {toAssign >= 0 ? '' : '-'}{formatCurrency(Math.abs(toAssign))}
            </Text>
          </View>

          <View style={styles.heroStats}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>INGRESOS</Text>
              <Text style={[styles.heroStatVal, { color: COLORS.income }]}>{formatCurrency(monthIncome)}</Text>
            </View>
            <View style={styles.heroStatDiv} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatLabel}>ASIGNADO</Text>
              <Text style={[styles.heroStatVal, { color: COLORS.primary }]}>{formatCurrency(totalAssigned)}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.body}>

          {/* ── SOBRES ── */}
          <SectionHeader
            title="SOBRES"
            right={
              <TouchableOpacity onPress={() => setShowPicker(true)}>
                <Text style={styles.addBtn}>+ Añadir</Text>
              </TouchableOpacity>
            }
          />

          {allCats.length === 0 ? (
            <GlowCard color={`${COLORS.primary}18`}>
              <TouchableOpacity style={styles.emptyState} onPress={() => setShowPicker(true)} activeOpacity={0.8}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>💼</Text>
                <Text style={styles.emptyTitle}>Sin sobres este mes</Text>
                <Text style={styles.emptySub}>Asigna tu dinero a categorías de gasto</Text>
              </TouchableOpacity>
            </GlowCard>
          ) : (
            <View style={{ gap: 8 }}>
              {allCats.map(cat => {
                const assigned  = envelopes[cat.id] || 0;
                const spent     = monthSpend[cat.id] || 0;
                const available = assigned - spent;
                const pct       = assigned > 0 ? Math.min(1, spent / assigned) : (spent > 0 ? 1 : 0);
                const isOver    = available < 0;
                const isUnset   = envelopes[cat.id] === undefined;
                const barColor  = isOver ? COLORS.expense : pct >= 0.8 ? COLORS.gold : COLORS.income;

                return (
                  <GlowCard key={cat.id} color={isOver ? 'rgba(251,113,133,0.08)' : 'rgba(168,85,247,0.06)'}>
                    <View style={styles.envelopeRow}>
                      <CategoryImage image={cat.image} icon={cat.icon} size={28} />
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={styles.catName}>{cat.name}</Text>
                        <View style={styles.amtsRow}>
                          <Text style={[styles.amtLabel, { color: COLORS.textDim }]}>
                            Gastado: <Text style={{ color: COLORS.expense }}>{formatCurrency(spent)}</Text>
                          </Text>
                          <Text style={[styles.amtLabel, { color: available >= 0 ? COLORS.income : COLORS.expense, fontWeight: '800' }]}>
                            Disponible: {formatCurrency(available)}
                          </Text>
                        </View>
                        {assigned > 0 && (
                          <View style={styles.envBarBg}>
                            <View style={[styles.envBarFill, { width: `${Math.min(pct * 100, 100)}%`, backgroundColor: barColor }]} />
                          </View>
                        )}
                      </View>
                      <View style={styles.envelopeRight}>
                        <TouchableOpacity
                          style={[styles.assignedBtn, isUnset && { borderStyle: 'dashed', borderColor: COLORS.borderMid }]}
                          onPress={() => { setEditModal({ catId: cat.id, cat }); setEditAmount(assigned > 0 ? String(assigned) : ''); }}
                        >
                          <Text style={[styles.assignedAmt, { color: isUnset ? COLORS.textDim : COLORS.primary }]}>
                            {isUnset ? '—' : formatCurrency(assigned)}
                          </Text>
                          <Ionicons name="pencil-outline" size={10} color={COLORS.textDim} />
                        </TouchableOpacity>
                        {envelopes[cat.id] !== undefined && (
                          <TouchableOpacity style={styles.deleteBtn} onPress={() => removeEnvelope(cat.id)}>
                            <Ionicons name="trash-outline" size={12} color={COLORS.textDim} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </GlowCard>
                );
              })}
            </View>
          )}

          {/* ── INFO ── */}
          <GlowCard color="rgba(34,211,238,0.05)">
            <Text style={styles.infoTitle}>💡 ¿CÓMO FUNCIONA?</Text>
            <Text style={styles.infoText}>
              Asigna cada euro de tus ingresos a una categoría antes de gastarlo.
              Cuando "Para asignar" llega a 0€, has dado trabajo a todo tu dinero.
            </Text>
          </GlowCard>
        </View>
      </ScrollView>

      {/* ── Modal editar asignado ── */}
      {editModal && (
        <Modal visible animationType="slide" transparent onRequestClose={() => setEditModal(null)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.overlay}>
            <View style={styles.editSheet}>
              <View style={styles.handle} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 }}>
                <CategoryImage image={editModal.cat.image} icon={editModal.cat.icon} size={32} />
                <View>
                  <Text style={styles.editTitle}>{editModal.cat.name}</Text>
                  <Text style={styles.editSub}>Sobre de {MONTHS[navMonth]}</Text>
                </View>
              </View>
              <Text style={styles.fieldLabel}>CANTIDAD ASIGNADA</Text>
              <TextInput
                style={styles.editInput}
                placeholder="0,00"
                placeholderTextColor={COLORS.textDim}
                keyboardType="decimal-pad"
                value={editAmount}
                onChangeText={setEditAmount}
                autoFocus
              />
              <View style={styles.editActions}>
                <TouchableOpacity style={[styles.btn, styles.cancelBtn]} onPress={() => setEditModal(null)}>
                  <Text style={styles.cancelText}>CANCELAR</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={async () => {
                    await saveEnvelope(editModal.catId, editAmount);
                    setEditModal(null);
                  }}
                >
                  <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
                  <Text style={styles.saveText}>GUARDAR</Text>
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </Modal>
      )}

      {/* ── Modal añadir categoría ── */}
      <Modal visible={showPicker} animationType="slide" transparent onRequestClose={() => setShowPicker(false)}>
        <View style={styles.overlay}>
          <View style={[styles.editSheet, { maxHeight: '80%' }]}>
            <View style={styles.handle} />
            <Text style={styles.editTitle}>AÑADIR SOBRE</Text>
            <Text style={styles.editSub}>Elige una categoría para asignarle dinero</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 12 }}>
              {availableCats.length === 0 ? (
                <Text style={{ color: COLORS.textMuted, textAlign: 'center', marginTop: 20 }}>
                  Todas las categorías ya tienen sobre este mes
                </Text>
              ) : (
                Object.entries(
                  availableCats.reduce((acc, cat) => {
                    if (!acc[cat.group]) acc[cat.group] = [];
                    acc[cat.group].push(cat);
                    return acc;
                  }, {})
                ).map(([group, cats]) => (
                  <View key={group} style={{ marginBottom: 12 }}>
                    <Text style={styles.groupLabel}>{group}</Text>
                    <View style={styles.catGrid}>
                      {cats.map(cat => (
                        <TouchableOpacity
                          key={cat.id}
                          style={styles.catPickBtn}
                          onPress={() => {
                            setShowPicker(false);
                            setEditModal({ catId: cat.id, cat });
                            setEditAmount('');
                          }}
                        >
                          <CategoryImage image={cat.image} icon={cat.icon} size={24} />
                          <Text style={styles.catPickText} numberOfLines={2}>{cat.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={[styles.btn, styles.saveBtn, { marginTop: 12 }]} onPress={() => setShowPicker(false)}>
              <LinearGradient colors={[COLORS.primary, COLORS.primaryDark]} style={StyleSheet.absoluteFill} />
              <Text style={styles.saveText}>CERRAR</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1, backgroundColor: COLORS.bg },
  scroll: { paddingBottom: 100 },
  body: { paddingHorizontal: 14, paddingTop: 16, gap: 12 },

  hero: { paddingTop: 24, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center', gap: 16 },
  heroLabel: { color: COLORS.accentLight, fontSize: 9, fontWeight: '700', letterSpacing: 3, opacity: 0.8 },

  monthNav: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  navBtn: { padding: 6 },
  monthTitle: { color: COLORS.text, fontSize: 18, fontWeight: '800', letterSpacing: 0.5, minWidth: 160, textAlign: 'center' },

  toAssignBadge: {
    borderWidth: 1, borderRadius: 12, paddingHorizontal: 24, paddingVertical: 12, alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  toAssignLabel: { color: COLORS.textMuted, fontSize: 9, letterSpacing: 3, fontWeight: '700', marginBottom: 4 },
  toAssignAmt: { fontSize: 32, fontWeight: '800', letterSpacing: -1 },

  heroStats: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1, alignItems: 'center' },
  heroStatLabel: { color: COLORS.textDim, fontSize: 9, letterSpacing: 2, marginBottom: 4 },
  heroStatVal: { fontSize: 15, fontWeight: '800' },
  heroStatDiv: { width: 1, height: 28, backgroundColor: COLORS.borderSubtle },

  addBtn: { color: COLORS.primaryLight, fontSize: 11, fontWeight: '600' },

  emptyState: { alignItems: 'center', paddingVertical: 12 },
  emptyTitle: { color: COLORS.text, fontSize: 15, fontWeight: '700', marginBottom: 4 },
  emptySub: { color: COLORS.textDim, fontSize: 12, textAlign: 'center' },

  envelopeRow: { flexDirection: 'row', alignItems: 'center' },
  catName: { color: COLORS.text, fontSize: 13, fontWeight: '600', marginBottom: 4 },
  amtsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  amtLabel: { fontSize: 11 },
  envBarBg: { height: 3, backgroundColor: COLORS.borderSubtle, borderRadius: 2, overflow: 'hidden' },
  envBarFill: { height: 3, borderRadius: 2 },

  envelopeRight: { alignItems: 'flex-end', gap: 6, marginLeft: 8 },
  assignedBtn: {
    borderWidth: 1, borderColor: COLORS.border, borderRadius: 8, paddingHorizontal: 10,
    paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 4,
  },
  assignedAmt: { fontSize: 13, fontWeight: '800' },
  deleteBtn: { padding: 4 },

  infoTitle: { color: COLORS.accent, fontSize: 9, fontWeight: '800', letterSpacing: 2, marginBottom: 8 },
  infoText: { color: COLORS.textDim, fontSize: 11, lineHeight: 17 },

  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  editSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 16, borderTopRightRadius: 16,
    padding: 24, paddingBottom: 36, borderTopWidth: 1, borderColor: COLORS.borderSubtle,
  },
  handle: { width: 36, height: 3, backgroundColor: COLORS.borderMid, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  editTitle: { color: COLORS.text, fontSize: 16, fontWeight: '800' },
  editSub: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },
  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginTop: 4 },
  editInput: {
    borderWidth: 1, borderColor: COLORS.borderSubtle, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 13, color: COLORS.text, fontSize: 22,
    fontWeight: '700', backgroundColor: COLORS.surface, marginBottom: 20,
  },
  editActions: { flexDirection: 'row', gap: 12 },
  btn: { flex: 1, paddingVertical: 14, borderRadius: 4, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexDirection: 'row', gap: 6 },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard },
  cancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  saveBtn: { overflow: 'hidden' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 13 },

  groupLabel: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPickBtn: {
    width: 72, alignItems: 'center', paddingVertical: 10, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard, gap: 4,
  },
  catPickText: { color: COLORS.textDim, fontSize: 9, fontWeight: '600', textAlign: 'center' },
});
