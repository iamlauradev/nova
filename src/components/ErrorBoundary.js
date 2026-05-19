import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    console.error('[ErrorBoundary]', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    const { error } = this.state;

    return (
      <View style={styles.root}>
        <LinearGradient
          colors={['#0d0025', '#060612', '#060612']}
          style={StyleSheet.absoluteFill}
        />
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="warning-outline" size={40} color={COLORS.expense} />
          </View>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.subtitle}>
            La aplicación encontró un error inesperado.
          </Text>
          {error && (
            <ScrollView style={styles.errorBox} contentContainerStyle={{ padding: 12 }}>
              <Text style={styles.errorText}>{error.toString()}</Text>
            </ScrollView>
          )}
          <TouchableOpacity style={styles.btn} onPress={this.handleReset} activeOpacity={0.8}>
            <LinearGradient
              colors={[COLORS.primary, COLORS.accent]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <Ionicons name="refresh" size={16} color="#fff" style={{ marginRight: 8 }} />
            <Text style={styles.btnText}>REINTENTAR</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', padding: 24,
  },
  card: {
    width: '100%', maxWidth: 360,
    backgroundColor: COLORS.bgCard,
    borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    padding: 28, alignItems: 'center', gap: 14,
  },
  iconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: `${COLORS.expense}18`,
    borderWidth: 1, borderColor: `${COLORS.expense}40`,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: COLORS.text, fontSize: 18, fontWeight: '800', letterSpacing: 1,
  },
  subtitle: {
    color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20,
  },
  errorBox: {
    width: '100%', maxHeight: 120,
    backgroundColor: `${COLORS.expense}12`,
    borderRadius: 8, borderWidth: 1, borderColor: `${COLORS.expense}30`,
  },
  errorText: {
    color: COLORS.expense, fontSize: 10, fontFamily: 'monospace',
  },
  btn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    width: 200, paddingVertical: 14, borderRadius: 8,
    overflow: 'hidden', marginTop: 4,
  },
  btnText: {
    color: '#fff', fontWeight: '800', fontSize: 12, letterSpacing: 2,
  },
});
