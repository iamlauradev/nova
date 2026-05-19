import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

/**
 * DateField — renders a styled touchable that opens the native date picker.
 *
 * Props:
 *   value      string  ISO date "YYYY-MM-DD"
 *   onChange   fn(isoString)
 *   label      string  optional label above
 */
export default function DateField({ value, onChange, label, style }) {
  const [show, setShow] = useState(false);

  const date = value ? new Date(value) : new Date();

  const displayDate = value
    ? (() => {
        const [y, m, d] = value.split('T')[0].split('-');
        return `${d}/${m}/${y}`;
      })()
    : 'Seleccionar fecha';

  const handleChange = (event, selected) => {
    if (Platform.OS === 'android') setShow(false);
    if (event.type === 'dismissed') return;
    if (selected) onChange(selected.toISOString().split('T')[0]);
  };

  return (
    <View style={style}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TouchableOpacity style={styles.field} onPress={() => setShow(true)} activeOpacity={0.8}>
        <Ionicons name="calendar-outline" size={16} color={COLORS.accent} style={{ marginRight: 8 }} />
        <Text style={styles.value}>{displayDate}</Text>
      </TouchableOpacity>

      {/* iOS needs a modal wrapper, Android shows inline */}
      {show && Platform.OS === 'ios' ? (
        <Modal transparent animationType="slide" visible={show}>
          <View style={styles.iosOverlay}>
            <View style={styles.iosSheet}>
              <View style={styles.iosHeader}>
                <TouchableOpacity onPress={() => setShow(false)}>
                  <Text style={styles.iosDone}>Hecho</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={date}
                mode="date"
                display="spinner"
                onChange={handleChange}
                themeVariant="dark"
                locale="es-ES"
                style={{ backgroundColor: COLORS.bgCard }}
              />
            </View>
          </View>
        </Modal>
      ) : show ? (
        <DateTimePicker
          value={date}
          mode="date"
          display="default"
          onChange={handleChange}
          themeVariant="dark"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    color: COLORS.textMuted, fontSize: 10, letterSpacing: 2,
    marginBottom: 8, fontWeight: '600',
  },
  field: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: 4, paddingHorizontal: 14, paddingVertical: 13,
    marginBottom: 16,
  },
  value: { color: COLORS.text, fontSize: 15 },

  iosOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  iosSheet: { backgroundColor: COLORS.bgCard, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  iosHeader: { flexDirection: 'row', justifyContent: 'flex-end', padding: 16 },
  iosDone: { color: COLORS.accent, fontSize: 16, fontWeight: '700' },
});
