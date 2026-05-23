import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { COLORS } from '../theme';
import * as Haptics from 'expo-haptics';

const KEYS = [
  ['7', '8', '9'],
  ['4', '5', '6'],
  ['1', '2', '3'],
  [',', '0', '⌫'],
];

const MAX_LEN = 10;

/**
 * Custom numeric keypad for amount inputs.
 *
 * Props:
 *   value    — current string value (e.g. "12,50")
 *   onChange — called with the new string value
 */
export default function NumericKeypad({ value = '', onChange }) {
  const press = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    if (key === '⌫') {
      onChange(value.slice(0, -1));
      return;
    }

    if (key === ',') {
      if (value.includes(',')) return;        // only one comma
      if (value === '') { onChange('0,'); return; }
      onChange(value + ',');
      return;
    }

    // Block more than 2 decimal digits
    const commaIdx = value.indexOf(',');
    if (commaIdx !== -1 && value.length - commaIdx > 2) return;

    // Block leading zeros (except "0,")
    if (value === '0' && key !== ',') { onChange(key); return; }

    if (value.replace(',', '').length >= MAX_LEN) return;

    onChange(value + key);
  };

  return (
    <View style={styles.container}>
      {KEYS.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map(key => (
            <TouchableOpacity
              key={key}
              style={[styles.key, key === '⌫' && styles.keyDelete]}
              onPress={() => press(key)}
              activeOpacity={0.6}
            >
              <Text style={[styles.keyText, key === '⌫' && styles.keyDeleteText]}>
                {key}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.bgCard,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 6,
  },
  key: {
    flex: 1,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.bgCardLight,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
  },
  keyDelete: {
    backgroundColor: `${COLORS.expense}15`,
    borderColor: `${COLORS.expense}40`,
  },
  keyText: {
    color: COLORS.text,
    fontSize: 20,
    fontWeight: '600',
  },
  keyDeleteText: {
    color: COLORS.expense,
    fontSize: 22,
  },
});
