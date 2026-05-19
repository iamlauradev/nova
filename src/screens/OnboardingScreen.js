import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  FlatList, Dimensions, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

const LOGO_IMAGE = require('../img/logo.png');

const SLIDES = [
  {
    icon: 'wallet-outline',
    color: COLORS.primary,
    title: 'Bienvenido a Nova',
    body: 'Tu app personal de finanzas. Controla tus cuentas, gastos e ingresos en un solo lugar.',
  },
  {
    icon: 'swap-horizontal-outline',
    color: COLORS.accent,
    title: 'Registra cada movimiento',
    body: 'Añade transacciones fácilmente, organízalas por categorías y consulta tus estadísticas al instante.',
  },
  {
    icon: 'repeat-outline',
    color: COLORS.income,
    title: 'Compromisos fijos',
    body: 'Suscripciones, cuotas, deudas y ahorros — todo bajo control con recordatorios automáticos.',
  },
  {
    icon: 'shield-checkmark-outline',
    color: COLORS.primaryLight,
    title: 'Seguro y privado',
    body: 'Tus datos viajan cifrados. La app se bloquea automáticamente con tu huella o PIN.',
  },
];

export default function OnboardingScreen({ onFinish }) {
  const [current, setCurrent] = useState(0);
  const flatRef = useRef(null);
  const dotAnim = useRef(SLIDES.map((_, i) => new Animated.Value(i === 0 ? 1 : 0))).current;

  const goTo = (idx) => {
    flatRef.current?.scrollToIndex({ index: idx, animated: true });
    setCurrent(idx);
    SLIDES.forEach((_, i) => {
      Animated.timing(dotAnim[i], {
        toValue: i === idx ? 1 : 0,
        duration: 200,
        useNativeDriver: false,
      }).start();
    });
  };

  const handleNext = () => {
    if (current < SLIDES.length - 1) goTo(current + 1);
    else onFinish();
  };

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={['#0d0025', '#060612', '#060612']}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.deco1} />
      <View style={styles.deco2} />

      {/* Logo */}
      <View style={styles.logoWrap}>
        <Image source={LOGO_IMAGE} style={styles.logo} contentFit="contain" />
      </View>

      {/* Slides */}
      <FlatList
        ref={flatRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        scrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconCircle, { borderColor: `${item.color}50`, backgroundColor: `${item.color}15` }]}>
              <Ionicons name={item.icon} size={44} color={item.color} />
            </View>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        )}
      />

      {/* Dots */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <Animated.View
            key={i}
            style={[
              styles.dot,
              {
                width: dotAnim[i].interpolate({ inputRange: [0, 1], outputRange: [6, 20] }),
                backgroundColor: dotAnim[i].interpolate({
                  inputRange: [0, 1],
                  outputRange: [COLORS.border, COLORS.primary],
                }),
              },
            ]}
          />
        ))}
      </View>

      {/* Buttons */}
      <View style={styles.btnRow}>
        {current > 0 && (
          <TouchableOpacity style={styles.backBtn} onPress={() => goTo(current - 1)}>
            <Ionicons name="arrow-back" size={18} color={COLORS.textDim} />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={styles.nextBtn} onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <Text style={styles.nextBtnText}>
            {current < SLIDES.length - 1 ? 'SIGUIENTE' : 'EMPEZAR'}
          </Text>
          <Ionicons
            name={current < SLIDES.length - 1 ? 'arrow-forward' : 'checkmark'}
            size={16} color="#fff" style={{ marginLeft: 8 }}
          />
        </TouchableOpacity>
      </View>

      {/* Skip */}
      {current < SLIDES.length - 1 && (
        <TouchableOpacity style={styles.skipBtn} onPress={onFinish}>
          <Text style={styles.skipText}>Saltar</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', paddingTop: 40, paddingBottom: 50,
  },
  deco1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.primaryGlow, top: -80, right: -80, opacity: 0.1,
  },
  deco2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.accentGlow, bottom: 100, left: -80, opacity: 0.07,
  },
  logoWrap: { marginBottom: 16, marginTop: 8 },
  logo: { width: 56, height: 56 },

  slide: {
    width,
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 16,
    gap: 18,
  },
  iconCircle: {
    width: 100, height: 100, borderRadius: 50,
    borderWidth: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8,
  },
  title: {
    color: COLORS.text, fontSize: 20, fontWeight: '800',
    letterSpacing: 1, textAlign: 'center',
  },
  body: {
    color: COLORS.textMuted, fontSize: 14, textAlign: 'center',
    lineHeight: 22, maxWidth: 280,
  },

  dots: { flexDirection: 'row', gap: 6, marginTop: 28, marginBottom: 24 },
  dot: { height: 6, borderRadius: 3 },

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 40 },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  nextBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 48, borderRadius: 8, overflow: 'hidden',
  },
  nextBtnText: { color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 2 },

  skipBtn: { marginTop: 14, padding: 8 },
  skipText: { color: COLORS.textDim, fontSize: 12, textDecorationLine: 'underline' },
});
