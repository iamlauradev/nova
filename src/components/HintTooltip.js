import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const PREFIX = '@nova_hint_seen_';

export default function HintTooltip({ hintKey, text, position = 'bottom' }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PREFIX + hintKey).then(val => {
      if (val !== 'true') setVisible(true);
    }).catch(() => {});
  }, [hintKey]);

  const dismiss = async () => {
    setVisible(false);
    await AsyncStorage.setItem(PREFIX + hintKey, 'true').catch(() => {});
  };

  if (!visible) return null;

  return (
    <View style={[styles.container, position === 'top' ? styles.top : styles.bottom]}>
      <View style={styles.bubble}>
        <Ionicons name="bulb-outline" size={14} color={COLORS.gold} style={{ marginRight: 6 }} />
        <Text style={styles.text}>{text}</Text>
        <TouchableOpacity onPress={dismiss} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="close" size={14} color={COLORS.textDim} />
        </TouchableOpacity>
      </View>
      {position === 'bottom' && <View style={styles.arrowUp} />}
      {position === 'top' && <View style={styles.arrowDown} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'absolute', left: 16, right: 16, zIndex: 100 },
  bottom: { top: '100%', marginTop: 6 },
  top: { bottom: '100%', marginBottom: 6 },
  bubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderGold,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 4,
    shadowColor: COLORS.gold,
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  text: { flex: 1, color: COLORS.text, fontSize: 12, lineHeight: 17 },
  arrowUp: {
    position: 'absolute',
    top: -6,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: COLORS.borderGold,
  },
  arrowDown: {
    position: 'absolute',
    bottom: -6,
    left: 20,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: COLORS.borderGold,
  },
});
