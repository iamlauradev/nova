import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const ICONS = {
  success: { name: 'checkmark-circle',  color: COLORS.income },
  error:   { name: 'close-circle',      color: COLORS.expense },
  info:    { name: 'information-circle', color: COLORS.accent },
};

export default function Toast({ visible, message, type = 'success', onHide }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(-12)).current;

  useEffect(() => {
    if (!visible) return;
    Animated.parallel([
      Animated.timing(opacity,     { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.timing(translateY,  { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();

    const t = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity,    { toValue: 0, duration: 280, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: -12, duration: 280, useNativeDriver: true }),
      ]).start(() => onHide?.());
    }, 2000);
    return () => clearTimeout(t);
  }, [visible, message]);

  if (!visible) return null;
  const icon = ICONS[type] || ICONS.info;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <Ionicons name={icon.name} size={18} color={icon.color} />
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', top: 60, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: COLORS.bgCard,
    borderRadius: 20, paddingVertical: 10, paddingHorizontal: 18,
    borderWidth: 1, borderColor: COLORS.border,
    shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 12, elevation: 12,
    zIndex: 9500,
  },
  text: { color: COLORS.text, fontSize: 13, fontWeight: '600' },
});
