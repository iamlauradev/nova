import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

export function SkeletonBox({ width, height, borderRadius = 4, style }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 900, useNativeDriver: true }),
      ]),
    ).start();
  }, [anim]);

  const opacity = anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 0.7] });

  return (
    <Animated.View
      style={[
        { width, height, borderRadius, backgroundColor: COLORS.borderSubtle },
        { opacity },
        style,
      ]}
    />
  );
}

/** Full-page skeleton for the home screen cards */
export function HomeSkeleton() {
  return (
    <View style={styles.wrap}>
      <View style={styles.heroSk}>
        <SkeletonBox width={160} height={12} borderRadius={6} style={{ marginBottom: 16 }} />
        <SkeletonBox width={220} height={44} borderRadius={8} style={{ marginBottom: 12 }} />
        <SkeletonBox width={140} height={12} borderRadius={6} />
      </View>
      <View style={styles.cardsSk}>
        {[1, 2, 3].map(i => (
          <SkeletonBox key={i} width="100%" height={80} borderRadius={8} style={{ marginBottom: 12 }} />
        ))}
        <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
          <SkeletonBox width="48%" height={56} borderRadius={8} />
          <SkeletonBox width="48%" height={56} borderRadius={8} />
        </View>
        {[1, 2].map(i => (
          <SkeletonBox key={i} width="100%" height={64} borderRadius={8} style={{ marginBottom: 12 }} />
        ))}
      </View>
    </View>
  );
}

/** Skeleton for a list of transaction rows */
export function TransactionListSkeleton({ count = 6 }) {
  return (
    <View style={{ padding: 16, gap: 10 }}>
      {Array.from({ length: count }, (_, i) => (
        <View key={i} style={styles.txSk}>
          <SkeletonBox width={44} height={44} borderRadius={6} />
          <View style={{ flex: 1, gap: 8 }}>
            <SkeletonBox width="60%" height={12} borderRadius={6} />
            <SkeletonBox width="40%" height={10} borderRadius={6} />
          </View>
          <SkeletonBox width={60} height={14} borderRadius={6} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: COLORS.bg },
  heroSk: {
    paddingTop: 60, paddingBottom: 24, paddingHorizontal: 20, alignItems: 'center',
    backgroundColor: COLORS.bgCard,
  },
  cardsSk: { paddingHorizontal: 16, paddingTop: 16 },
  txSk: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: COLORS.bgCard, borderRadius: 6, padding: 12,
  },
});
