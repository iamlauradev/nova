import React, { useState, useRef } from 'react';
import {
  View, TouchableOpacity, Text, StyleSheet, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

/**
 * Contextual FAB that expands into action buttons on press.
 * actions = [{ icon, label, color, onPress }]
 */
export default function ExpandableFAB({ actions = [], mainColor = COLORS.primary }) {
  const [open, setOpen] = useState(false);
  const anim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.spring(anim, { toValue, useNativeDriver: true, tension: 120, friction: 7 }).start();
    setOpen(!open);
  };

  const close = () => {
    Animated.spring(anim, { toValue: 0, useNativeDriver: true }).start();
    setOpen(false);
  };

  const rotation = anim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '45deg'] });

  return (
    <View style={styles.container} pointerEvents="box-none">
      {/* Sub-actions (rendered bottom-up) */}
      {actions.map((action, i) => {
        const offset = anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0, -((i + 1) * 68)],
        });
        const opacity = anim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] });
        return (
          <Animated.View
            key={action.label}
            style={[
              styles.subBtn,
              { transform: [{ translateY: offset }], opacity },
            ]}
          >
            <TouchableOpacity
              style={[styles.subAction, { borderColor: action.color || COLORS.primary }]}
              onPress={() => { close(); action.onPress(); }}
              activeOpacity={0.85}
            >
              <Ionicons name={action.icon} size={20} color={action.color || COLORS.primary} />
            </TouchableOpacity>
            <Text style={[styles.subLabel, { color: action.color || COLORS.text }]}>
              {action.label}
            </Text>
          </Animated.View>
        );
      })}

      {/* Main FAB */}
      <TouchableOpacity style={styles.fab} onPress={toggle} activeOpacity={0.85}>
        <LinearGradient
          colors={[mainColor, COLORS.primaryDark]}
          style={StyleSheet.absoluteFill}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        />
        <Animated.View style={{ transform: [{ rotate: rotation }] }}>
          <Ionicons name="add" size={28} color={COLORS.white} />
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 96, right: 20,
    alignItems: 'center',
  },
  fab: {
    width: 58, height: 58, borderRadius: 29,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    shadowColor: COLORS.primaryGlow, shadowOpacity: 1, shadowRadius: 16, elevation: 10,
  },
  subBtn: {
    position: 'absolute', bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end',
    gap: 10, width: 200, right: 0,
  },
  subAction: {
    width: 46, height: 46, borderRadius: 23,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.bgModal, borderWidth: 1,
  },
  subLabel: {
    display: 'none',  // label hidden — shown via icon only on mobile
  },
});
