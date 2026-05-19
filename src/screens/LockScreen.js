import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { notifySuccess, notifyError, tapHeavy } from '../utils/haptics';
import { COLORS } from '../theme';

const LOGO_IMAGE = require('../img/logo.png');

export default function LockScreen() {
  const { unlock, logout } = useAuth();
  const [status, setStatus] = useState('idle'); // 'idle' | 'waiting' | 'failed'

  // Lanza la autenticación biométrica automáticamente al montar la pantalla
  useEffect(() => {
    handleUnlock();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUnlock = async () => {
    setStatus('waiting');
    const ok = await unlock();
    if (ok) {
      notifySuccess();
    } else {
      notifyError();
      setStatus('failed');
    }
  };

  return (
    <View style={styles.root}>
      {/* Fondo degradado */}
      <LinearGradient
        colors={['#0d0025', '#060612', '#060612']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decoración */}
      <View style={styles.deco1} />
      <View style={styles.deco2} />

      {/* Contenido central */}
      <View style={styles.content}>

        {/* Logo con anillo pulsante */}
        <View style={styles.iconWrap}>
          <LinearGradient
            colors={[`${COLORS.primary}22`, `${COLORS.accent}11`]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <View style={[styles.iconRing, status === 'failed' && { borderColor: `${COLORS.expense}55` }]} />
          <Image source={LOGO_IMAGE} style={styles.logoImg} contentFit="contain" />
        </View>

        <Text style={styles.appName}>NOVA</Text>
        <Text style={styles.lockedLabel}>SESIÓN BLOQUEADA</Text>

        {/* Estado */}
        {status === 'waiting' ? (
          <View style={styles.statusRow}>
            <ActivityIndicator size="small" color={COLORS.accent} />
            <Text style={styles.statusText}>Esperando verificación...</Text>
          </View>
        ) : status === 'failed' ? (
          <Text style={styles.failedText}>
            Autenticación cancelada o fallida
          </Text>
        ) : null}

        {/* Botón principal: reintentar biometría */}
        <TouchableOpacity
          style={styles.unlockBtn}
          onPress={handleUnlock}
          activeOpacity={0.85}
          disabled={status === 'waiting'}
        >
          <LinearGradient
            colors={[COLORS.primary, COLORS.accent]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          />
          <Ionicons name="finger-print" size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.unlockBtnText}>
            {status === 'waiting' ? 'VERIFICANDO...' : 'DESBLOQUEAR'}
          </Text>
        </TouchableOpacity>

        {/* Cerrar sesión como última salida */}
        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.7}>
          <Text style={styles.logoutText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </View>

      {/* Footer */}
      <Text style={styles.footer}>Protegido con autenticación del dispositivo</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.bg, alignItems: 'center', justifyContent: 'center' },

  deco1: {
    position: 'absolute', width: 300, height: 300, borderRadius: 150,
    backgroundColor: COLORS.primaryGlow,
    top: -100, right: -100, opacity: 0.12,
  },
  deco2: {
    position: 'absolute', width: 200, height: 200, borderRadius: 100,
    backgroundColor: COLORS.accentGlow,
    bottom: 80, left: -80, opacity: 0.08,
  },

  content: { alignItems: 'center', paddingHorizontal: 40, gap: 16 },

  iconWrap: {
    width: 130, height: 130, borderRadius: 65,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: COLORS.border,
    overflow: 'hidden', marginBottom: 8,
  },
  iconRing: {
    position: 'absolute',
    width: 130, height: 130, borderRadius: 65,
    borderWidth: 1, borderColor: `${COLORS.primary}55`,
    transform: [{ scale: 1.22 }],
  },
  logoImg: {
    width: 100, height: 100,
  },

  appName: {
    color: COLORS.text, fontSize: 20, fontWeight: '800',
    letterSpacing: 6,
    textShadowColor: COLORS.primaryGlow, textShadowRadius: 12,
  },
  lockedLabel: {
    color: COLORS.textMuted, fontSize: 9, fontWeight: '700',
    letterSpacing: 4, marginBottom: 8,
  },

  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusText: { color: COLORS.textDim, fontSize: 13 },
  failedText: {
    color: COLORS.expense, fontSize: 12, fontWeight: '600',
    textAlign: 'center',
  },

  unlockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: 240, paddingVertical: 16, borderRadius: 8,
    overflow: 'hidden', marginTop: 8,
    shadowColor: COLORS.primaryGlow, shadowOpacity: 1, shadowRadius: 14, elevation: 8,
  },
  unlockBtnText: {
    color: '#fff', fontWeight: '800', fontSize: 13, letterSpacing: 2,
  },

  logoutBtn: { marginTop: 12, padding: 8 },
  logoutText: { color: COLORS.textDim, fontSize: 12, textDecorationLine: 'underline' },

  footer: {
    position: 'absolute', bottom: 40,
    color: COLORS.textDim, fontSize: 10, letterSpacing: 1,
  },
});
