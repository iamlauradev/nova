import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

// A reusable card with the Solo Leveling "System Window" aesthetic
export default function GlowCard({ children, style, color, noPadding }) {
  const glowColor = color || COLORS.primaryGlow;
  const borderColor = color ? color.replace('0.45', '0.5') : COLORS.border;

  return (
    <View style={[styles.card, { borderColor, shadowColor: glowColor }, style]}>
      {/* Corner decorations */}
      <View style={[styles.cornerTL, { borderColor }]} />
      <View style={[styles.cornerTR, { borderColor }]} />
      <View style={[styles.cornerBL, { borderColor }]} />
      <View style={[styles.cornerBR, { borderColor }]} />
      <View style={noPadding ? styles.innerNoPad : styles.inner}>{children}</View>
    </View>
  );
}

const CORNER = 8;
const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderRadius: 4,
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
    position: 'relative',
  },
  inner: {
    padding: 16,
  },
  innerNoPad: {
    padding: 0,
  },
  cornerTL: {
    position: 'absolute',
    top: -1,
    left: -1,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    zIndex: 1,
  },
  cornerTR: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: CORNER,
    height: CORNER,
    borderTopWidth: 2,
    borderRightWidth: 2,
    zIndex: 1,
  },
  cornerBL: {
    position: 'absolute',
    bottom: -1,
    left: -1,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    zIndex: 1,
  },
  cornerBR: {
    position: 'absolute',
    bottom: -1,
    right: -1,
    width: CORNER,
    height: CORNER,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    zIndex: 1,
  },
});
