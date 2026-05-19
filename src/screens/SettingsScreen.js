import React from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, Switch,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSettings } from '../context/SettingsContext';
import { COLORS } from '../theme';

// ─── Font scale presets ────────────────────────────────────────────────────────
const FONT_PRESETS = [
  { label: 'XS', value: 0.85 },
  { label: 'S',  value: 1.0  },
  { label: 'M',  value: 1.15 },
  { label: 'L',  value: 1.3  },
];

// ─── Currency options ──────────────────────────────────────────────────────────
const CURRENCIES = [
  { code: 'EUR', locale: 'es-ES', symbol: '€', label: 'Euro' },
  { code: 'USD', locale: 'en-US', symbol: '$', label: 'Dólar EEUU' },
  { code: 'GBP', locale: 'en-GB', symbol: '£', label: 'Libra' },
  { code: 'MXN', locale: 'es-MX', symbol: '$', label: 'Peso Mexicano' },
  { code: 'ARS', locale: 'es-AR', symbol: '$', label: 'Peso Argentino' },
  { code: 'COP', locale: 'es-CO', symbol: '$', label: 'Peso Colombiano' },
];

function SectionTitle({ label }) {
  return <Text style={styles.sectionTitle}>{label}</Text>;
}

function SettingRow({ icon, label, sublabel, right, onPress, noBorder }) {
  const Inner = (
    <View style={[styles.row, noBorder && { borderBottomWidth: 0 }]}>
      <View style={styles.rowLeft}>
        <View style={styles.rowIcon}>
          <Ionicons name={icon} size={18} color={COLORS.accent} />
        </View>
        <View style={styles.rowText}>
          <Text style={styles.rowLabel}>{label}</Text>
          {sublabel ? <Text style={styles.rowSub}>{sublabel}</Text> : null}
        </View>
      </View>
      <View style={styles.rowRight}>{right}</View>
    </View>
  );
  if (onPress) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.7}>{Inner}</TouchableOpacity>;
  }
  return Inner;
}

export default function SettingsScreen() {
  const nav = useNavigation();
  const { settings, updateSetting } = useSettings();

  const currentCurrency = CURRENCIES.find(c => c.code === settings.currency) || CURRENCIES[0];

  return (
    <View style={styles.root}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => nav.goBack()}>
          <Ionicons name="chevron-back" size={22} color={COLORS.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AJUSTES</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* ── Apariencia ──────────────────────────────────────────────────────── */}
        <SectionTitle label="APARIENCIA" />
        <View style={styles.card}>
          {/* Font size */}
          <View style={[styles.row, { flexDirection: 'column', alignItems: 'flex-start', gap: 12 }]}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <Ionicons name="text" size={18} color={COLORS.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Tamaño de texto</Text>
                <Text style={styles.rowSub}>Afecta a toda la aplicación</Text>
              </View>
            </View>
            <View style={styles.fontPresetRow}>
              {FONT_PRESETS.map(p => (
                <TouchableOpacity
                  key={p.value}
                  style={[styles.fontPresetBtn, settings.fontScale === p.value && styles.fontPresetBtnActive]}
                  onPress={() => updateSetting('fontScale', p.value)}
                  activeOpacity={0.7}
                >
                  {settings.fontScale === p.value && (
                    <LinearGradient
                      colors={[COLORS.primary, COLORS.accent]}
                      style={StyleSheet.absoluteFill}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  )}
                  <Text style={[
                    styles.fontPresetLabel,
                    { fontSize: 10 + (FONT_PRESETS.indexOf(p)) * 2 },
                    settings.fontScale === p.value && { color: '#fff', fontWeight: '800' },
                  ]}>
                    {p.label}
                  </Text>
                  <Text style={[styles.fontPreviewChar,
                    { fontSize: 14 + (FONT_PRESETS.indexOf(p)) * 3 },
                    settings.fontScale === p.value && { color: '#fff' },
                  ]}>Aa</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* ── Moneda ──────────────────────────────────────────────────────────── */}
        <SectionTitle label="MONEDA" />
        <View style={styles.card}>
          <View style={styles.currencyGrid}>
            {CURRENCIES.map(c => (
              <TouchableOpacity
                key={c.code}
                style={[styles.currencyBtn, settings.currency === c.code && styles.currencyBtnActive]}
                onPress={() => { updateSetting('currency', c.code); updateSetting('currencyLocale', c.locale); }}
                activeOpacity={0.7}
              >
                {settings.currency === c.code && (
                  <LinearGradient
                    colors={[`${COLORS.primary}33`, `${COLORS.accent}22`]}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                )}
                <Text style={[styles.currencySymbol, settings.currency === c.code && { color: COLORS.accent }]}>
                  {c.symbol}
                </Text>
                <Text style={[styles.currencyCode, settings.currency === c.code && { color: COLORS.text }]}>
                  {c.code}
                </Text>
                <Text style={styles.currencyLabel} numberOfLines={1}>{c.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={[styles.row, { borderBottomWidth: 0, marginTop: 4 }]}>
            <View style={styles.rowLeft}>
              <View style={styles.rowIcon}>
                <Ionicons name="eye-outline" size={18} color={COLORS.accent} />
              </View>
              <View style={styles.rowText}>
                <Text style={styles.rowLabel}>Mostrar centavos</Text>
              </View>
            </View>
            <Switch
              value={settings.showCents}
              onValueChange={v => updateSetting('showCents', v)}
              trackColor={{ false: COLORS.bgCard, true: `${COLORS.primary}99` }}
              thumbColor={settings.showCents ? COLORS.primary : COLORS.textDim}
            />
          </View>
        </View>

        {/* ── Categorías ──────────────────────────────────────────────────────── */}
        <SectionTitle label="ORGANIZACIÓN" />
        <View style={styles.card}>
          <SettingRow
            icon="pricetag-outline"
            label="Gestionar categorías"
            sublabel="Editar, crear y ocultar categorías"
            noBorder
            onPress={() => nav.navigate('Categories')}
            right={<Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />}
          />
        </View>

        {/* ── Perfil ──────────────────────────────────────────────────────── */}
        <SectionTitle label="CUENTA" />
        <View style={styles.card}>
          <SettingRow
            icon="person-circle-outline"
            label="Mi perfil"
            sublabel="Nombre, contraseña, avatar y más"
            noBorder
            onPress={() => nav.navigate('Profile')}
            right={<Ionicons name="chevron-forward" size={16} color={COLORS.textDim} />}
          />
        </View>

        {/* ── Acerca de ──────────────────────────────────────────────────────── */}
        <SectionTitle label="ACERCA DE" />
        <View style={styles.card}>
          <SettingRow
            icon="information-circle-outline"
            label="Nova"
            sublabel="v1.0.1 · modo personal"
            noBorder
            right={null}
          />
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>
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
  headerTitle: {
    color: COLORS.accent, fontSize: 13, fontWeight: '800', letterSpacing: 2,
  },

  content: { padding: 20, gap: 0 },

  sectionTitle: {
    color: COLORS.textMuted, fontSize: 10, fontWeight: '700', letterSpacing: 2,
    marginTop: 24, marginBottom: 10, marginLeft: 4,
  },
  card: {
    backgroundColor: COLORS.bgCard, borderRadius: 12,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
  },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  rowIcon: {
    width: 34, height: 34, borderRadius: 8,
    backgroundColor: `${COLORS.accent}18`,
    alignItems: 'center', justifyContent: 'center',
  },
  rowText: { flex: 1 },
  rowLabel: { color: COLORS.text, fontSize: 14, fontWeight: '600' },
  rowSub: { color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  rowRight: {},

  // Font presets
  fontPresetRow: { flexDirection: 'row', gap: 8, paddingLeft: 46, paddingBottom: 4 },
  fontPresetBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bgCardLight,
    overflow: 'hidden', gap: 2,
  },
  fontPresetBtnActive: { borderColor: COLORS.primary },
  fontPresetLabel: { color: COLORS.textMuted, fontWeight: '700', letterSpacing: 1 },
  fontPreviewChar: { color: COLORS.textDim, fontWeight: '600' },

  // Currency grid
  currencyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16 },
  currencyBtn: {
    width: '30%', alignItems: 'center', paddingVertical: 10, borderRadius: 8,
    borderWidth: 1, borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.bgCardLight,
    overflow: 'hidden', gap: 2,
  },
  currencyBtnActive: { borderColor: COLORS.primary },
  currencySymbol: { fontSize: 22, fontWeight: '800', color: COLORS.textDim },
  currencyCode: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted, letterSpacing: 1 },
  currencyLabel: { fontSize: 9, color: COLORS.textDim, textAlign: 'center', paddingHorizontal: 4 },
});
