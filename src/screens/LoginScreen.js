import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { notifySuccess, notifyError, tapLight } from '../utils/haptics';
import { COLORS } from '../theme';

const PRINCIPAL_IMAGE = require('../img/login.png');

export default function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!username.trim() || !password.trim()) {
      return Alert.alert('Error', 'Rellena todos los campos');
    }
    if (mode === 'register' && !name.trim()) {
      return Alert.alert('Error', 'Introduce tu nombre');
    }
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username.trim(), password);
      } else {
        await register(username.trim(), name.trim(), password);
      }
      notifySuccess();
    } catch (e) {
      notifyError();
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.bg}>
      {/* Fondo degradado */}
      <LinearGradient
        colors={['#0d0025', '#060612', '#060612']}
        style={StyleSheet.absoluteFill}
      />

      {/* Decoración de fondo */}
      <View style={styles.decoration1} />
      <View style={styles.decoration2} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Header */}
          <View style={styles.logoArea}>
            <Image source={PRINCIPAL_IMAGE} style={styles.logoImg} contentFit="contain" />
            <Text style={styles.appName}>NOVA</Text>
            <Text style={styles.appSubtitle}>GESTIÓN FINANCIERA PERSONAL</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Corner decorations */}
            <View style={[styles.corner, styles.cornerTL]} />
            <View style={[styles.corner, styles.cornerTR]} />
            <View style={[styles.corner, styles.cornerBL]} />
            <View style={[styles.corner, styles.cornerBR]} />

            {/* Mode toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'login' && styles.modeBtnActive]}
                onPress={() => setMode('login')}
              >
                <Text style={[styles.modeBtnText, mode === 'login' && styles.modeBtnTextActive]}>
                  ACCEDER
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeBtn, mode === 'register' && styles.modeBtnActive]}
                onPress={() => setMode('register')}
              >
                <Text style={[styles.modeBtnText, mode === 'register' && styles.modeBtnTextActive]}>
                  REGISTRO
                </Text>
              </TouchableOpacity>
            </View>

            {mode === 'register' && (
              <>
                <Text style={styles.label}>NOMBRE</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Ej. Laura"
                  placeholderTextColor={COLORS.textDim}
                  value={name}
                  onChangeText={setName}
                  autoCapitalize="words"
                />
              </>
            )}

            <Text style={styles.label}>USUARIO</Text>
            <TextInput
              style={styles.input}
              placeholder="tu_usuario"
              placeholderTextColor={COLORS.textDim}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="username"
              textContentType="username"
              importantForAutofill="yes"
            />

            <Text style={styles.label}>CONTRASEÑA</Text>
            <View style={styles.passWrapper}>
              <TextInput
                style={styles.passInput}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textDim}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPass}
                autoCapitalize="none"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                textContentType={mode === 'login' ? 'password' : 'newPassword'}
                importantForAutofill="yes"
              />
              <TouchableOpacity onPress={() => setShowPass(p => !p)} style={styles.eyeBtn}>
                <Ionicons
                  name={showPass ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={COLORS.textDim}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.primary, COLORS.primaryDark]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              />
              {loading ? (
                <ActivityIndicator color={COLORS.white} />
              ) : (
                <Text style={styles.submitText}>
                  {mode === 'login' ? '[ ACCEDER AL SISTEMA ]' : '[ CREAR CUENTA ]'}
                </Text>
              )}
            </TouchableOpacity>

            {mode === 'login' && (
              <Text style={styles.hint}>
                ¿Primera vez? Pulsa "REGISTRO" para crear tu cuenta
              </Text>
            )}
          </View>

          <Text style={styles.footer}>Los datos se guardan en tu homelab</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const CORNER_SIZE = 10;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  bg: { flex: 1, backgroundColor: COLORS.bg },

  // Decoración de fondo
  decoration1: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: COLORS.primaryGlow,
    top: -100,
    right: -100,
    opacity: 0.15,
  },
  decoration2: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: COLORS.accentGlow,
    bottom: 50,
    left: -80,
    opacity: 0.1,
  },

  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },

  // Logo
  logoArea: { alignItems: 'center', marginBottom: 40 },
  logoImg: {
    width: 200,
    height: 200,
    marginBottom: 8,
  },
  appName: {
    color: COLORS.text,
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 6,
    marginBottom: 6,
    textShadowColor: COLORS.primaryGlow,
    textShadowRadius: 12,
  },
  appSubtitle: {
    color: COLORS.textDim,
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: '600',
  },

  // Card
  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    padding: 24,
    position: 'relative',
    shadowColor: COLORS.primaryGlow,
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 8,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.accent,
    zIndex: 2,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },

  // Mode toggle
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.bgCardLight,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 24,
    padding: 3,
  },
  modeBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 2 },
  modeBtnActive: { backgroundColor: COLORS.primaryGlow, borderWidth: 1, borderColor: COLORS.border },
  modeBtnText: { color: COLORS.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  modeBtnTextActive: { color: COLORS.primaryLight },

  label: {
    color: COLORS.textMuted,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 16,
  },
  passWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.bgCardLight,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 4,
    marginBottom: 24,
  },
  passInput: {
    flex: 1,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
  },
  eyeBtn: { paddingHorizontal: 14 },

  submitBtn: {
    paddingVertical: 16,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.primaryGlow,
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 8,
  },
  submitText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 2,
  },

  hint: {
    color: COLORS.textDim,
    fontSize: 11,
    textAlign: 'center',
    marginTop: 16,
  },

  footer: {
    color: COLORS.textDim,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 24,
    letterSpacing: 1,
  },
});
