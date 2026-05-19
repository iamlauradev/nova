import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, TextInput, Alert, FlatList,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useFinance } from '../context/FinanceContext';
import { DEFAULT_CATEGORIES, COLORS } from '../theme';
import CategoryImage from '../components/CategoryImage';
import EmojiPicker from '../components/EmojiPicker';



// ─── CategoryRow ──────────────────────────────────────────────────────────────
function CategoryRow({ cat, isDefault, isHidden, onEdit, onDelete, onToggleHide }) {
  return (
    <View style={[styles.catRow, isHidden && styles.catRowHidden]}>
      <View style={[styles.catIconWrap, { opacity: isHidden ? 0.4 : 1 }]}>
        <CategoryImage image={cat.image} icon={cat.icon} size={26} />
      </View>
      <View style={styles.catInfo}>
        <Text style={[styles.catName, isHidden && { color: COLORS.textDim }]}>{cat.name}</Text>
        {cat.group ? <Text style={styles.catGroup}>{cat.group}</Text> : null}
        {isDefault && <View style={styles.defaultBadge}><Text style={styles.defaultBadgeText}>DEFAULT</Text></View>}
      </View>
      <View style={styles.catActions}>
        {isDefault ? (
          <TouchableOpacity style={styles.actionBtn} onPress={() => onToggleHide(cat.id)} activeOpacity={0.7}>
            <Ionicons
              name={isHidden ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={isHidden ? COLORS.textMuted : COLORS.textDim}
            />
          </TouchableOpacity>
        ) : (
          <>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onEdit(cat)} activeOpacity={0.7}>
              <Ionicons name="pencil-outline" size={17} color={COLORS.accent} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => onDelete(cat)} activeOpacity={0.7}>
              <Ionicons name="trash-outline" size={17} color={COLORS.expense} />
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}

// ─── EditModal ────────────────────────────────────────────────────────────────
function EditModal({ visible, catType, initial, onClose, onSave }) {
  const [name, setName] = useState(initial?.name || '');
  const [icon, setIcon] = useState(initial?.icon || initial?.image || '⭐');
  const [tab, setTab] = useState('emote'); // 'info' | 'emote'

  React.useEffect(() => {
    if (visible) {
      setName(initial?.name || '');
      setIcon(initial?.icon || initial?.image || '⭐');
      setTab('info');
    }
  }, [visible, initial]);

  const isValid = name.trim().length > 0;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.handle} />
          <Text style={styles.modalTitle}>
            {initial?.id ? 'EDITAR CATEGORÍA' : 'NUEVA CATEGORÍA'}
          </Text>

          {/* Tab switcher */}
          <View style={styles.modalTabs}>
            {['info', 'emote'].map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.modalTab, tab === t && styles.modalTabActive]}
                onPress={() => setTab(t)}
              >
                <Text style={[styles.modalTabText, tab === t && { color: COLORS.accent }]}>
                  {t === 'info' ? 'NOMBRE' : 'EMOJI'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {tab === 'info' ? (
            <View style={[styles.editInfo, { flex: 1 }]}>
              {/* Preview */}
              <View style={styles.previewRow}>
                <View style={[styles.previewIcon, {
                  borderColor: catType === 'income' ? COLORS.income : COLORS.expense,
                }]}>
                  <CategoryImage icon={icon} size={34} />
                </View>
                <View>
                  <Text style={styles.previewName}>{name || 'Sin nombre'}</Text>
                  <Text style={styles.previewType}>
                    {catType === 'income' ? 'Ingreso' : 'Gasto'}
                  </Text>
                </View>
              </View>

              <Text style={styles.fieldLabel}>NOMBRE DE LA CATEGORÍA</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Ej: Suscripciones"
                placeholderTextColor={COLORS.textDim}
                autoCapitalize="sentences"
                maxLength={32}
              />
            </View>
          ) : (
            <View style={{ flex: 1 }}><EmojiPicker selected={icon} onSelect={setIcon} /></View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={onClose}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, styles.saveBtn, !isValid && { opacity: 0.4 }]}
              onPress={() => isValid && onSave({ name: name.trim(), icon })}
              disabled={!isValid}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.accent]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              <Text style={styles.saveText}>Guardar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
export default function CategoriesScreen() {
  const nav = useNavigation();
  const {
    customCategories,
    hiddenDefaultCats,
    addCategory,
    editCategory,
    deleteCategory,
    toggleHideDefaultCat,
  } = useFinance();

  const [catType, setCatType] = useState('expense'); // 'income' | 'expense'
  const [editModal, setEditModal] = useState({ visible: false, cat: null });

  const defaultCats = DEFAULT_CATEGORIES[catType];
  const customCats  = customCategories[catType];
  const hiddenSet   = hiddenDefaultCats[catType];

  // Group default categories
  const groupedDefaults = useMemo(() => {
    const groups = {};
    defaultCats.forEach(c => {
      const g = c.group || 'Otros';
      if (!groups[g]) groups[g] = [];
      groups[g].push(c);
    });
    return Object.entries(groups); // [['Alimentación', [...]], ...]
  }, [defaultCats]);

  const openAdd = () => setEditModal({ visible: true, cat: null });
  const openEdit = (cat) => setEditModal({ visible: true, cat });
  const closeModal = () => setEditModal({ visible: false, cat: null });

  const handleSave = async ({ name, icon }) => {
    const cat = editModal.cat;
    if (cat?.id) {
      await editCategory(catType, cat.id, { name, icon });
    } else {
      await addCategory(catType, { name, icon });
    }
    closeModal();
  };

  const handleDelete = (cat) => {
    Alert.alert(
      'Eliminar categoría',
      `¿Eliminar "${cat.name}"? Las transacciones que la usen no se verán afectadas.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteCategory(catType, cat.id) },
      ]
    );
  };

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>CATEGORÍAS</Text>
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Ionicons name="add" size={22} color={COLORS.accent} />
        </TouchableOpacity>
      </View>

      {/* Type tabs */}
      <View style={styles.tabs}>
        {[
          { key: 'expense', label: 'Gastos',   color: COLORS.expense },
          { key: 'income',  label: 'Ingresos', color: COLORS.income  },
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            style={[styles.tab, catType === t.key && { borderBottomColor: t.color, borderBottomWidth: 2 }]}
            onPress={() => setCatType(t.key)}
          >
            <Text style={[styles.tabText, catType === t.key && { color: t.color }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Custom categories */}
        {customCats.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>MIS CATEGORÍAS</Text>
            <View style={styles.card}>
              {customCats.map((cat, i) => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  isDefault={false}
                  isHidden={false}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleHide={() => {}}
                />
              ))}
            </View>
          </View>
        )}

        {/* Default categories grouped */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            CATEGORÍAS PREDEFINIDAS
            <Text style={styles.sectionHint}> · toca 👁 para ocultar</Text>
          </Text>
          {groupedDefaults.map(([groupName, cats]) => (
            <View key={groupName} style={[styles.card, { marginBottom: 8 }]}>
              <Text style={styles.groupHeader}>{groupName}</Text>
              {cats.map(cat => (
                <CategoryRow
                  key={cat.id}
                  cat={cat}
                  isDefault={true}
                  isHidden={hiddenSet.has(cat.id)}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleHide={(id) => toggleHideDefaultCat(catType, id)}
                />
              ))}
            </View>
          ))}
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={openAdd} activeOpacity={0.85}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.accent]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        />
        <Ionicons name="add" size={28} color="#fff" />
      </TouchableOpacity>

      <EditModal
        visible={editModal.visible}
        catType={catType}
        initial={editModal.cat}
        onClose={closeModal}
        onSave={handleSave}
      />
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 56, paddingBottom: 16, paddingHorizontal: 20,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCard,
  },
  headerTitle: { color: COLORS.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2 },
  addBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${COLORS.accent}18`,
  },

  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle },
  tab: {
    flex: 1, paddingVertical: 14, alignItems: 'center',
    borderBottomColor: 'transparent', borderBottomWidth: 2,
  },
  tabText: { color: COLORS.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.5 },

  content: { padding: 16, gap: 0 },

  section: { marginBottom: 8 },
  sectionTitle: { color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 2, marginBottom: 8, marginLeft: 4 },
  sectionHint: { color: COLORS.textDim, fontWeight: '400', letterSpacing: 0 },

  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 10,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  groupHeader: {
    color: COLORS.textMuted, fontSize: 9, fontWeight: '700', letterSpacing: 2,
    paddingHorizontal: 14, paddingTop: 10, paddingBottom: 4,
    backgroundColor: `${COLORS.bgCardLight}88`,
  },

  catRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, gap: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  catRowHidden: { opacity: 0.55 },
  catIconWrap: {
    width: 40, height: 40, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  catInfo: { flex: 1, gap: 2 },
  catName: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
  catGroup: { color: COLORS.textDim, fontSize: 10 },
  defaultBadge: {
    alignSelf: 'flex-start',
    backgroundColor: `${COLORS.gold}22`,
    borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1,
  },
  defaultBadgeText: { color: COLORS.gold, fontSize: 8, fontWeight: '700', letterSpacing: 1 },

  catActions: { flexDirection: 'row', gap: 4 },
  actionBtn: { padding: 6 },

  fab: {
    position: 'absolute', bottom: 24, right: 20,
    width: 56, height: 56, borderRadius: 28,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: COLORS.primaryGlow, shadowOpacity: 1, shadowRadius: 14, elevation: 10,
  },

  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: COLORS.overlay },
  modalSheet: {
    backgroundColor: COLORS.bgModal, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
    borderTopWidth: 1, borderColor: COLORS.border,
    height: '90%', flexDirection: 'column',
  },
  handle: { width: 40, height: 4, backgroundColor: COLORS.border, borderRadius: 2, alignSelf: 'center', marginBottom: 20 },
  modalTitle: { color: COLORS.accent, fontSize: 12, fontWeight: '800', letterSpacing: 2, marginBottom: 16 },

  modalTabs: { flexDirection: 'row', marginBottom: 20, gap: 4 },
  modalTab: {
    flex: 1, paddingVertical: 8, alignItems: 'center',
    borderRadius: 6, borderWidth: 1, borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bgCard,
  },
  modalTabActive: { borderColor: COLORS.accent, backgroundColor: `${COLORS.accent}14` },
  modalTabText: { color: COLORS.textMuted, fontSize: 11, fontWeight: '700', letterSpacing: 1 },

  editInfo: { gap: 16 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 4 },
  previewIcon: {
    width: 56, height: 56, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, backgroundColor: COLORS.bgCard,
  },
  previewName: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  previewType: { color: COLORS.textDim, fontSize: 11, marginTop: 2 },

  fieldLabel: { color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2, marginBottom: 8 },
  input: {
    backgroundColor: COLORS.bgCard, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 8, paddingHorizontal: 14, paddingVertical: 13,
    color: COLORS.text, fontSize: 16, fontWeight: '600',
  },

  modalActions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  modalBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  cancelBtn: { borderWidth: 1, borderColor: COLORS.borderSubtle, backgroundColor: COLORS.bgCard },
  cancelText: { color: COLORS.textMuted, fontWeight: '700', fontSize: 13 },
  saveBtn: { overflow: 'hidden' },
  saveText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
});
