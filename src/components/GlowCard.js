import React from 'react';
import { View, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

// Deriva el color de los corners desde el prop color a mayor opacidad
function cornerColor(color) {
  if (!color) return COLORS.border;
  if (color.startsWith('rgba')) {
    // rgba(R,G,B,A) → rgba(R,G,B,0.42)
    return color.replace(/[\d.]+\)$/, '0.42)');
  }
  // hex #RRGGBB22 → usa el hex sin alpha + opacidad fija
  const base = color.length === 9 ? color.slice(0, 7) : color;
  return `${base}6a`;
}

export default function GlowCard({ children, style, color, noPadding }) {
  const glowColor = color || COLORS.primaryGlow;
  const cColor = cornerColor(color);

  return (
    <View style={[styles.card, { shadowColor: glowColor }, style]}>
      <View style={[styles.cornerTL, { borderColor: cColor }]} />
      <View style={[styles.cornerTR, { borderColor: cColor }]} />
      <View style={[styles.cornerBL, { borderColor: cColor }]} />
      <View style={[styles.cornerBR, { borderColor: cColor }]} />
      <View style={noPadding ? styles.innerNoPad : styles.inner}>{children}</View>
    </View>
  );
}

const CORNER = 10;

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,   // borde exterior muy sutil — la profundidad la da el shadow
    borderRadius: 6,
    shadowOpacity: 0.5,
    shadowRadius: 18,                    // glow difuso, amplio y elegante
    shadowOffset: { width: 0, height: 2 },
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
    position: 'absolute', top: -1, left: -1,
    width: CORNER, height: CORNER,
    borderTopWidth: 2, borderLeftWidth: 2, zIndex: 1,
  },
  cornerTR: {
    position: 'absolute', top: -1, right: -1,
    width: CORNER, height: CORNER,
    borderTopWidth: 2, borderRightWidth: 2, zIndex: 1,
  },
  cornerBL: {
    position: 'absolute', bottom: -1, left: -1,
    width: CORNER, height: CORNER,
    borderBottomWidth: 2, borderLeftWidth: 2, zIndex: 1,
  },
  cornerBR: {
    position: 'absolute', bottom: -1, right: -1,
    width: CORNER, height: CORNER,
    borderBottomWidth: 2, borderRightWidth: 2, zIndex: 1,
  },
});
