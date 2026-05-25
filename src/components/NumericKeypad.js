import React, { useState, useImperativeHandle } from 'react';
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
 * Uncontrolled numeric keypad with built-in amount display.
 *
 * Props:
 *   initialValue — initial string value (e.g. "12,50")
 *
 * Ref API (via useImperativeHandle):
 *   getValue() — returns the current value string
 */
const NumericKeypad = React.forwardRef(function NumericKeypad({ initialValue = '' }, ref) {
  const [value, setValue] = useState(initialValue);

  useImperativeHandle(ref, () => ({
    getValue: () => value,
  }), [value]);

  const press = (key) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});

    setValue(prev => {
      if (key === '⌫') return prev.slice(0, -1);

      if (key === ',') {
        if (prev.includes(',')) return prev;
        if (prev === '') return '0,';
        return prev + ',';
      }

      // Block more than 2 decimal digits
      const commaIdx = prev.indexOf(',');
      if (commaIdx !== -1 && prev.length - commaIdx > 2) return prev;

      // Block leading zeros (except "0,")
      if (prev === '0' && key !== ',') return key;

      if (prev.replace(',', '').length >= MAX_LEN) return prev;

      return prev + key;
    });
  };

  return (
    <View>
      <View style={styles.display}>
        <Text style={[styles.displayText, !value && styles.displayPlaceholder]}>
          {value || '0,00'}
        </Text>
        <Text style={styles.displayCurrency}>€</Text>
      </View>
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
    </View>
  );
});

export default NumericKeypad;

const styles = StyleSheet.create({
  display: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    gap: 6,
  },
  displayText: {
    color: COLORS.text,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
    textAlign: 'right',
  },
  displayPlaceholder: { color: COLORS.textDim },
  displayCurrency: { color: COLORS.textMuted, fontSize: 18, fontWeight: '600' },
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
