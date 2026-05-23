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
        colors={['#0c0030', '#08081e', '#07071a']}
        locations={[0, 0.45, 1]}
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

  decoration1: {
    position: 'absolute',
    width: 380,
    height: 380,
    borderRadius: 190,
    backgroundColor: COLORS.primaryGlow,
    top: -140,
    right: -120,
    opacity: 0.12,
  },
  decoration2: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: COLORS.accentGlow,
    bottom: 60,
    left: -100,
    opacity: 0.08,
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

  card: {
    backgroundColor: COLORS.bgCard,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 6,
    padding: 24,
    position: 'relative',
    shadowColor: COLORS.primaryGlow,
    shadowOpacity: 0.6,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  corner: {
    position: 'absolute',
    width: CORNER_SIZE,
    height: CORNER_SIZE,
    borderColor: COLORS.border,
    zIndex: 2,
  },
  cornerTL: { top: -1, left: -1, borderTopWidth: 2, borderLeftWidth: 2 },
  cornerTR: { top: -1, right: -1, borderTopWidth: 2, borderRightWidth: 2 },
  cornerBL: { bottom: -1, left: -1, borderBottomWidth: 2, borderLeftWidth: 2 },
  cornerBR: { bottom: -1, right: -1, borderBottomWidth: 2, borderRightWidth: 2 },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    marginBottom: 24,
    padding: 3,
  },
  modeBtn: { flex: 1, paddingVertical: 11, alignItems: 'center', borderRadius: 4 },
  modeBtnActive: { backgroundColor: 'rgba(168,85,247,0.18)', borderWidth: 1, borderColor: COLORS.border },
  modeBtnText: { color: COLORS.textDim, fontSize: 11, fontWeight: '700', letterSpacing: 2 },
  modeBtnTextActive: { color: COLORS.primaryLight },

  label: {
    color: COLORS.textDim,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    color: COLORS.text,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    marginBottom: 16,
  },
  passWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
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
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    shadowColor: COLORS.primaryGlow,
    shadowOpacity: 1,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 10,
  },
  submitText: {
    color: COLORS.white,
    fontWeight: '800',
    fontSize: 12,
    letterSpacing: 2.5,
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
