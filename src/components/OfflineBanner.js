import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNetwork } from '../context/NetworkContext';
import { COLORS } from '../theme';

export default function OfflineBanner() {
  const { isOnline } = useNetwork();
  const slideAnim = useRef(new Animated.Value(-50)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: isOnline ? -50 : 0,
      tension: 80,
      friction: 10,
      useNativeDriver: true,
    }).start();
  }, [isOnline]);

  return (
    <Animated.View
      style={[styles.banner, { transform: [{ translateY: slideAnim }] }]}
      pointerEvents="none"
    >
      <Ionicons name="cloud-offline-outline" size={14} color="#fff" />
      <Text style={styles.text}>Sin conexión — modo offline</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 8000,
    backgroundColor: '#B04030',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    gap: 6,
  },
  text: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
});
