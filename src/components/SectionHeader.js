import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

export default function SectionHeader({ title, right }) {
  return (
    <View style={styles.row}>
      <View style={styles.titleRow}>
        <View style={styles.dot} />
        <Text style={styles.title}>[ {title} ]</Text>
      </View>
      {right && <View>{right}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 4,
  },
  title: {
    color: COLORS.accent,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
  },
});
