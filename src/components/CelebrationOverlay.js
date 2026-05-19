import React, { useEffect, useRef } from 'react';
import {
  View, Text, Animated, StyleSheet, Easing, Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const { width, height } = Dimensions.get('window');

// Particle colours cycling through the neon palette
const PARTICLE_COLORS = [
  COLORS.primary, COLORS.accent, COLORS.income,
  '#FFD700', '#FF6BFF', '#00E5FF',
];

function Particle({ index, total }) {
  const angle = (index / total) * 2 * Math.PI;
  const radius = 90 + Math.random() * 80;
  const tx = Math.cos(angle) * radius;
  const ty = Math.sin(angle) * radius - 60;

  const anim = useRef(new Animated.Value(0)).current;
  const size = 6 + Math.random() * 8;
  const color = PARTICLE_COLORS[index % PARTICLE_COLORS.length];
  const delay = Math.random() * 200;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.timing(anim, {
        toValue: 1,
        duration: 700 + Math.random() * 400,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        transform: [
          { translateX: anim.interpolate({ inputRange: [0, 1], outputRange: [0, tx] }) },
          { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, ty] }) },
          { scale: anim.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 1.4, 0.2] }) },
        ],
        opacity: anim.interpolate({ inputRange: [0, 0.7, 1], outputRange: [1, 1, 0] }),
      }}
    />
  );
}

/**
 * CelebrationOverlay
 *
 * Props:
 *   visible  boolean
 *   message  string  — e.g. '¡Deuda saldada!'
 *   subtext  string  — optional subtitle
 *   onDone   fn      — called when animation ends and overlay should hide
 */
export default function CelebrationOverlay({ visible, message, subtext, onDone }) {
  const fadeAnim  = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    if (!visible) return;
    // Reset
    fadeAnim.setValue(0);
    scaleAnim.setValue(0.5);

    Animated.parallel([
      Animated.spring(scaleAnim, { toValue: 1, tension: 60, friction: 6, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: true }).start(() => {
        onDone && onDone();
      });
    }, 2200);
    return () => clearTimeout(timer);
  }, [visible]);

  if (!visible) return null;

  const PARTICLE_COUNT = 18;

  return (
    <Animated.View style={[styles.overlay, { opacity: fadeAnim }]} pointerEvents="none">
      {/* Dim background */}
      <View style={styles.dimBg} />

      <Animated.View style={[styles.card, { transform: [{ scale: scaleAnim }] }]}>
        {/* Particles */}
        <View style={styles.particleOrigin}>
          {Array.from({ length: PARTICLE_COUNT }).map((_, i) => (
            <Particle key={i} index={i} total={PARTICLE_COUNT} />
          ))}
        </View>

        {/* Icon */}
        <View style={styles.iconCircle}>
          <Ionicons name="trophy" size={36} color="#FFD700" />
        </View>

        <Text style={styles.message}>{message || '¡Completado!'}</Text>
        {subtext ? <Text style={styles.subtext}>{subtext}</Text> : null}

        {/* Glow lines */}
        <View style={[styles.glowLine, { backgroundColor: COLORS.primary }]} />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9000,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  card: {
    backgroundColor: COLORS.bgCard,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: `${COLORS.primary}60`,
    paddingHorizontal: 40,
    paddingVertical: 32,
    alignItems: 'center',
    gap: 10,
    shadowColor: COLORS.primary,
    shadowOpacity: 0.8,
    shadowRadius: 24,
    elevation: 20,
    minWidth: 260,
  },
  particleOrigin: {
    position: 'absolute',
    width: 1,
    height: 1,
    top: '40%',
    left: '50%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircle: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: `${'#FFD700'}22`,
    borderWidth: 1, borderColor: `${'#FFD700'}60`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  message: {
    color: COLORS.text, fontSize: 18, fontWeight: '800',
    letterSpacing: 1, textAlign: 'center',
  },
  subtext: {
    color: COLORS.textMuted, fontSize: 12, textAlign: 'center', lineHeight: 18,
  },
  glowLine: {
    width: 60, height: 2, borderRadius: 1, marginTop: 8, opacity: 0.7,
  },
});
