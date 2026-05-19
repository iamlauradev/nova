import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Alert, Modal, KeyboardAvoidingView, Platform,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { COLORS, SIZES } from '../theme';
import { tapLight, notifySuccess, notifyError } from '../utils/haptics';

// ── Avatar con iniciales ──────────────────────────────────────────────────────
function AvatarCircle({ name, emoji, size = 80 }) {
  if (emoji) {
    return (
      <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      </View>
    );
  }
  const initials = (name || '?')
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <LinearGradient
      colors={[COLORS.primary, COLORS.accent]}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
    >
      <Text style={{ color: '#fff', fontSize: size * 0.36, fontWeight: '700' }}>{initials}</Text>
    </LinearGradient>
  );
}

// ── Emoji picker mini (para avatar) ──────────────────────────────────────────
const AVATAR_EMOJIS = ['🦊','🐺','🦁','🐯','🐻','🐼','🦅','🦋','🐉','🌙','⭐','💎','🔮','🎭','🧙','🤖','👾','🎃','🏴‍☠️','🌈','🍀','⚡','🔥','🌊','🎯'];

function EmojiAvatarPicker({ visible, current, onSelect, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.pickerSheet}>
          <Text style={styles.pickerTitle}>Elige tu avatar</Text>
          <View style={styles.pickerGrid}>
            {/* Opción "sin emoji" (usar iniciales) */}
            <TouchableOpacity
              style={[styles.emojiCell, !current && styles.emojiCellActive]}
              onPress={() => { onSelect(null); onClose(); }}
            >
              <Text style={styles.emojiText}>🔤</Text>
            </TouchableOpacity>
            {AVATAR_EMOJIS.map(e => (
              <TouchableOpacity
                key={e}
                style={[styles.emojiCell, current === e && styles.emojiCellActive]}
                onPress={() => { onSelect(e); onClose(); }}
              >
                <Text style={styles.emojiText}>{e}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

// ── Row de sección ────────────────────────────────────────────────────────────
function SectionRow({ icon, label, value, onPress, danger, noBorder }) {
  return (
    <TouchableOpacity
      style={[styles.row, noBorder && { borderBottomWidth: 0 }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={[styles.rowIcon, danger && { backgroundColor: 'rgba(251,113,133,0.15)' }]}>
        <Ionicons name={icon} size={18} color={danger ? COLORS.expense : COLORS.primary} />
      </View>
      <View style={styles.rowBody}>
        <Text style={[styles.rowLabel, danger && { color: COLORS.expense }]}>{label}</Text>
        {value ? <Text style={styles.rowValue} numberOfLines={1}>{value}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />
    </TouchableOpacity>
  );
}

// ── Modal edición campo de texto ──────────────────────────────────────────────
function EditFieldModal({ visible, title, placeholder, value, secure, onSave, onClose, extraField }) {
  const [val, setVal]       = useState(value || '');
  const [extra, setExtra]   = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    if (visible) { setVal(value || ''); setExtra(''); }
  }, [visible]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await onSave(val, extra);
      onClose();
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.modalWrap}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.editSheet}>
          <Text style={styles.editTitle}>{title}</Text>

          <TextInput
            style={styles.editInput}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textDim}
            value={val}
            onChangeText={setVal}
            secureTextEntry={secure}
            autoCapitalize="none"
          />

          {extraField && (
            <TextInput
              style={[styles.editInput, { marginTop: 10 }]}
              placeholder={extraField.placeholder}
              placeholderTextColor={COLORS.textDim}
              value={extra}
              onChangeText={setExtra}
              secureTextEntry={extraField.secure}
              autoCapitalize="none"
            />
          )}

          <View style={styles.editBtns}>
            <TouchableOpacity style={styles.editCancel} onPress={onClose}>
              <Text style={styles.editCancelTxt}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.editConfirm} onPress={handleSave} disabled={loading}>
              {loading
                ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.editConfirmTxt}>Guardar</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ── Pantalla principal ────────────────────────────────────────────────────────
export default function ProfileScreen() {
  const nav = useNavigation();
  const { user, updateUser, changePassword, deleteAccount, logout } = useAuth();
  const { showToast } = useToast();

  const [avatarEmoji, setAvatarEmoji]   = useState(user?.avatarEmoji || null);
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);

  // Modales de edición
  const [editModal, setEditModal] = useState(null); // null | 'name' | 'username' | 'password'

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAvatarSelect = async (emoji) => {
    try {
      tapLight();
      setAvatarEmoji(emoji);
      await updateUser({ avatarEmoji: emoji });
      showToast('Avatar actualizado', 'success');
    } catch (e) {
      notifyError();
      showToast(e.message || 'Error al guardar avatar', 'error');
    }
  };

  const handleSaveName = async (newName) => {
    if (!newName.trim()) throw new Error('El nombre no puede estar vacío');
    await updateUser({ name: newName.trim() });
    notifySuccess();
    showToast('Nombre actualizado', 'success');
  };

  const handleSaveUsername = async (newUsername) => {
    if (!newUsername.trim()) throw new Error('El usuario no puede estar vacío');
    await updateUser({ username: newUsername.trim() });
    notifySuccess();
    showToast('Usuario actualizado', 'success');
  };

  const handleSavePassword = async (newPassword, currentPassword) => {
    if (!currentPassword) throw new Error('Introduce tu contraseña actual');
    if (newPassword.length < 6) throw new Error('La nueva contraseña debe tener al menos 6 caracteres');
    await changePassword(currentPassword, newPassword);
    notifySuccess();
    showToast('Contraseña cambiada', 'success');
  };

  const handleLogout = () => {
    tapLight();
    Alert.alert(
      'Cerrar sesión',
      '¿Seguro que quieres salir?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Salir', style: 'destructive', onPress: () => { notifySuccess(); logout(); } },
      ]
    );
  };

  const handleDeleteAccount = () => {
    tapLight();
    Alert.alert(
      '⚠️ Eliminar cuenta',
      'Esta acción es irreversible. Se borrarán todos tus datos (cuentas, movimientos, categorías, etc.) de forma permanente.\n\n¿Estás absolutamente seguro?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar permanentemente',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Última confirmación',
              'Escribe "BORRAR" para confirmar que quieres eliminar tu cuenta.',
              [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Confirmo',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      notifyError();
                      await deleteAccount();
                    } catch (e) {
                      showToast(e.message || 'Error al eliminar cuenta', 'error');
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  const displayName = user?.name || user?.username || '?';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="arrow-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mi perfil</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity onPress={() => { tapLight(); setShowAvatarPicker(true); }} activeOpacity={0.8}>
            <AvatarCircle name={displayName} emoji={avatarEmoji} size={96} />
            <View style={styles.avatarEditBadge}>
              <Ionicons name="camera" size={14} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarName}>{displayName}</Text>
          <Text style={styles.avatarUsername}>@{user?.username}</Text>
        </View>

        {/* Sección Info */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>INFORMACIÓN</Text>
          <View style={styles.card}>
            <SectionRow
              icon="person-outline"
              label="Nombre"
              value={user?.name || '—'}
              onPress={() => setEditModal('name')}
            />
            <SectionRow
              icon="at-outline"
              label="Usuario"
              value={`@${user?.username || '—'}`}
              onPress={() => setEditModal('username')}
              noBorder
            />
          </View>
        </View>

        {/* Sección Seguridad */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SEGURIDAD</Text>
          <View style={styles.card}>
            <SectionRow
              icon="lock-closed-outline"
              label="Cambiar contraseña"
              onPress={() => setEditModal('password')}
              noBorder
            />
          </View>
        </View>

        {/* Sección Sesión */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>SESIÓN</Text>
          <View style={styles.card}>
            <SectionRow
              icon="log-out-outline"
              label="Cerrar sesión"
              onPress={handleLogout}
              noBorder
            />
          </View>
        </View>

        {/* Zona de peligro */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: COLORS.expense }]}>ZONA DE PELIGRO</Text>
          <View style={[styles.card, styles.dangerCard]}>
            <SectionRow
              icon="trash-outline"
              label="Eliminar cuenta"
              onPress={handleDeleteAccount}
              danger
              noBorder
            />
          </View>
          <Text style={styles.dangerHint}>
            Eliminar tu cuenta borrará permanentemente todos tus datos. Esta acción no se puede deshacer.
          </Text>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Emoji avatar picker */}
      <EmojiAvatarPicker
        visible={showAvatarPicker}
        current={avatarEmoji}
        onSelect={handleAvatarSelect}
        onClose={() => setShowAvatarPicker(false)}
      />

      {/* Edit modals */}
      <EditFieldModal
        visible={editModal === 'name'}
        title="Cambiar nombre"
        placeholder="Tu nombre completo"
        value={user?.name}
        onSave={handleSaveName}
        onClose={() => setEditModal(null)}
      />
      <EditFieldModal
        visible={editModal === 'username'}
        title="Cambiar usuario"
        placeholder="nuevo_usuario"
        value={user?.username}
        onSave={handleSaveUsername}
        onClose={() => setEditModal(null)}
      />
      <EditFieldModal
        visible={editModal === 'password'}
        title="Cambiar contraseña"
        placeholder="Nueva contraseña (mín. 6 caracteres)"
        secure
        extraField={{ placeholder: 'Contraseña actual', secure: true }}
        onSave={handleSavePassword}
        onClose={() => setEditModal(null)}
      />
    </View>
  );
}

// ── Estilos ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 56, paddingBottom: 12,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: SIZES.lg, fontWeight: '700', color: COLORS.text },

  scroll: { paddingHorizontal: 16, paddingTop: 24 },

  // Avatar
  avatarSection: { alignItems: 'center', marginBottom: 32 },
  avatar: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.border },
  avatarEditBadge: {
    position: 'absolute', bottom: 2, right: 2,
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: COLORS.bg,
  },
  avatarName: { marginTop: 12, fontSize: SIZES.xl, fontWeight: '700', color: COLORS.text },
  avatarUsername: { marginTop: 2, fontSize: SIZES.sm, color: COLORS.textMuted },

  // Sections
  section: { marginBottom: 20 },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: COLORS.textDim,
    letterSpacing: 1.2, marginBottom: 8, marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },
  dangerCard: { borderColor: 'rgba(251,113,133,0.25)' },
  dangerHint: {
    fontSize: 11, color: COLORS.textDim, marginTop: 6, marginHorizontal: 4, lineHeight: 16,
  },

  // Row
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  rowIcon: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: 'rgba(168,85,247,0.12)',
    alignItems: 'center', justifyContent: 'center',
    marginRight: 12,
  },
  rowBody: { flex: 1 },
  rowLabel: { fontSize: SIZES.sm, fontWeight: '600', color: COLORS.text },
  rowValue: { fontSize: 12, color: COLORS.textMuted, marginTop: 1 },

  // Avatar emoji picker
  pickerOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center', alignItems: 'center',
  },
  pickerSheet: {
    backgroundColor: COLORS.surface2,
    borderRadius: 20, padding: 20, width: '88%',
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  pickerTitle: {
    fontSize: SIZES.md, fontWeight: '700', color: COLORS.text,
    textAlign: 'center', marginBottom: 16,
  },
  pickerGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6 },
  emojiCell: {
    width: 46, height: 46, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  emojiCellActive: { backgroundColor: COLORS.primary + '40', borderWidth: 1.5, borderColor: COLORS.primary },
  emojiText: { fontSize: 24 },

  // Edit modal
  modalWrap: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  editSheet: {
    backgroundColor: COLORS.surface2,
    borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 24, paddingBottom: 36,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
  },
  editTitle: {
    fontSize: SIZES.lg, fontWeight: '700', color: COLORS.text,
    marginBottom: 16,
  },
  editInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 12, borderWidth: 1, borderColor: COLORS.borderSubtle,
    paddingHorizontal: 14, paddingVertical: 12,
    color: COLORS.text, fontSize: SIZES.md,
  },
  editBtns: { flexDirection: 'row', gap: 10, marginTop: 20 },
  editCancel: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
  },
  editCancelTxt: { color: COLORS.textMuted, fontSize: SIZES.sm, fontWeight: '600' },
  editConfirm: {
    flex: 1, paddingVertical: 13, borderRadius: 12,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
  },
  editConfirmTxt: { color: '#fff', fontSize: SIZES.sm, fontWeight: '700' },
});
