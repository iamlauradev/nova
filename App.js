import 'react-native-gesture-handler';
import React, { useRef, useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  View, Text, ActivityIndicator, StyleSheet,
  TouchableOpacity, AppState,
} from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigation } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';

import { AuthProvider, useAuth, SHOW_ONBOARDING_KEY } from './src/context/AuthContext';
import { FinanceProvider } from './src/context/FinanceContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { COLORS } from './src/theme';

import ErrorBoundary from './src/components/ErrorBoundary';
import CelebrationOverlay from './src/components/CelebrationOverlay';
import { CelebrationProvider, useCelebration } from './src/context/CelebrationContext';
import { requestNotificationPermissions } from './src/utils/notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NetworkProvider } from './src/context/NetworkContext';
import { ToastProvider } from './src/context/ToastContext';
import OfflineBanner from './src/components/OfflineBanner';
import LoginScreen from './src/screens/LoginScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import LockScreen from './src/screens/LockScreen';
import HomeScreen from './src/screens/HomeScreen';
import AccountsScreen from './src/screens/AccountsScreen';
import TransactionsScreen from './src/screens/TransactionsScreen';
import StatsScreen from './src/screens/StatsScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import ProfileScreen    from './src/screens/ProfileScreen';

const PRINCIPAL_IMAGE = require('./src/img/login.png');
const LOGO_IMAGE      = require('./src/img/logo.png');


const Tab   = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Minutos de inactividad en background antes de bloquear
const LOCK_TIMEOUT_MS = 5 * 60 * 1000;

const NAV_THEME = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: COLORS.bg,
    card: COLORS.bgCard,
    text: COLORS.text,
    border: COLORS.border,
    primary: COLORS.primary,
  },
};

function TabIcon({ name, color, focused }) {
  return (
    <View style={tabStyles.wrapper}>
      {focused && <View style={tabStyles.pill} />}
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={22}
        color={color}
        style={focused ? tabStyles.glow : null}
      />
    </View>
  );
}

const tabStyles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center', width: 48, height: 40 },
  pill: {
    position: 'absolute',
    width: 48, height: 36, borderRadius: 18,
    backgroundColor: `${COLORS.primary}22`,
    borderWidth: 1, borderColor: COLORS.border,
  },
  glow: { shadowColor: COLORS.primary, shadowOpacity: 1, shadowRadius: 10, elevation: 6 },
});

function LoadingScreen() {
  return (
    <View style={styles.center}>
      <Image source={PRINCIPAL_IMAGE} style={styles.loadingImg} contentFit="contain" />
      <ActivityIndicator size="small" color={COLORS.primary} style={{ marginTop: 32 }} />
      <Text style={styles.loadingText}>Conectando al sistema...</Text>
    </View>
  );
}

function HeaderGearButton() {
  const nav = useNavigation();
  return (
    <TouchableOpacity onPress={() => nav.navigate('Settings')} style={{ marginRight: 4 }}>
      <Ionicons name="settings-outline" size={20} color={COLORS.textDim} />
    </TouchableOpacity>
  );
}

function HeaderLogoutButton({ onPress }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ marginRight: 16 }}>
      <Ionicons name="log-out-outline" size={20} color={COLORS.textDim} />
    </TouchableOpacity>
  );
}

function TabsNavigator({ user, logout }) {
  return (
    <Tab.Navigator
      screenOptions={() => ({
        headerShown: true,
        headerStyle: { backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.border },
        headerTintColor: COLORS.textMuted,
        headerTitleStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: COLORS.accent },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <HeaderGearButton />
            <HeaderLogoutButton onPress={logout} />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.border, borderTopWidth: 1,
          height: 70, paddingBottom: 10, paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primaryLight,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '700', letterSpacing: 1 },
      })}
    >
      <Tab.Screen
        name="Inicio"
        component={HomeScreen}
        options={{
          headerTitle: `⟨ ${(user && user.name) ? user.name.toUpperCase() : 'SISTEMA'} ⟩`,
          tabBarIcon: ({ color, focused }) => <TabIcon name="home" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Cuentas"
        component={AccountsScreen}
        options={{
          headerTitle: '⟨ CUENTAS ⟩',
          tabBarIcon: ({ color, focused }) => <TabIcon name="wallet" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Transacciones"
        component={TransactionsScreen}
        options={{
          headerTitle: '⟨ MOVIMIENTOS ⟩',
          tabBarLabel: 'Movimientos',
          tabBarIcon: ({ color, focused }) => <TabIcon name="swap-horizontal" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          headerTitle: '⟨ ESTADÍSTICAS ⟩',
          tabBarLabel: 'Estadísticas',
          tabBarIcon: ({ color, focused }) => <TabIcon name="bar-chart" color={color} focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Fijos"
        component={RecurringScreen}
        options={{
          headerTitle: '⟨ COMPROMISOS FIJOS ⟩',
          tabBarIcon: ({ color, focused }) => <TabIcon name="repeat" color={color} focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

function FirstTimeGate({ children }) {
  // null = comprobando, true = mostrar, false = no mostrar
  const [showOnboarding, setShowOnboarding] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(SHOW_ONBOARDING_KEY).then(val => {
      if (!cancelled) setShowOnboarding(val === 'true');
    }).catch(() => {
      if (!cancelled) setShowOnboarding(false);
    });
    return () => { cancelled = true; };
  }, []);

  const handleFinish = React.useCallback(async () => {
    await AsyncStorage.removeItem(SHOW_ONBOARDING_KEY).catch(() => {});
    setShowOnboarding(false);
  }, []);

  if (showOnboarding === null) return null;
  if (showOnboarding) return <OnboardingScreen onFinish={handleFinish} />;
  return children;
}

function CelebrationLayer({ children }) {
  const { celebration, dismiss } = useCelebration();
  return (
    <>
      {children}
      <CelebrationOverlay
        visible={!!celebration}
        message={celebration?.message}
        subtext={celebration?.subtext}
        onDone={dismiss}
      />
    </>
  );
}

function MainApp({ user, logout }) {
  return (
    <CelebrationProvider>
    <ToastProvider>
    <FinanceProvider isAuthenticated={!!user}>
      <SettingsProvider>
        <NavigationContainer theme={NAV_THEME}>
          <CelebrationLayer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Tabs">
              {() => <FirstTimeGate><TabsNavigator user={user} logout={logout} /></FirstTimeGate>}
            </Stack.Screen>
            <Stack.Screen name="Settings"   component={SettingsScreen} />
            <Stack.Screen name="Categories" component={CategoriesScreen} />
            <Stack.Screen name="Profile"    component={ProfileScreen} />
          </Stack.Navigator>
          </CelebrationLayer>
        </NavigationContainer>
      </SettingsProvider>
    </FinanceProvider>
    </ToastProvider>
    </CelebrationProvider>
  );
}

// RootNavigator: contiene logica de AppState (timeout + lock)
function RootNavigator() {
  const { user, isLoading, logout, isLocked, lockApp } = useAuth();

  const currentAppState = useRef(AppState.currentState);
  const backgroundSince = useRef(null);

  useEffect(() => {
    const sub = AppState.addEventListener('change', nextState => {
      const prev = currentAppState.current;

      if (prev === 'active' && (nextState === 'background' || nextState === 'inactive')) {
        backgroundSince.current = Date.now();
      }

      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
        if (user && backgroundSince.current && Date.now() - backgroundSince.current > LOCK_TIMEOUT_MS) {
          lockApp();
        }
        backgroundSince.current = null;
      }

      currentAppState.current = nextState;
    });

    return () => sub.remove();
  }, [user, lockApp]);

  if (isLoading) return <LoadingScreen />;
  if (!user)     return <LoginScreen />;
  if (isLocked)  return <LockScreen />;

  return <MainApp user={user} logout={logout} />;
}

// Mascara de privacidad: cubre la app cuando va a background
// para que el selector de apps del sistema no muestre datos financieros
function PrivacyMask() {
  return (
    <View style={mask.root} pointerEvents="none">
      <LinearGradient
        colors={['#0d0025', '#060612']}
        style={StyleSheet.absoluteFill}
      />
      <Image source={LOGO_IMAGE} style={mask.logo} contentFit="contain" />
      <Text style={mask.appName}>NOVA</Text>
      <Text style={mask.sub}>Contenido oculto por seguridad</Text>
    </View>
  );
}

export default function App() {
  const [appActive, setAppActive] = useState(true);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setAppActive(state === 'active');
    });
    // Request notification permissions on first launch
    requestNotificationPermissions().catch(() => {});
    return () => sub.remove();
  }, []);

  return (
    <ErrorBoundary>
      <NetworkProvider>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <AuthProvider>
            <RootNavigator />
          </AuthProvider>
          <OfflineBanner />
          {!appActive && <PrivacyMask />}
        </SafeAreaProvider>
      </NetworkProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  loadingImg: {
    width: 220, height: 220,
  },
  loadingText: {
    color: COLORS.textMuted, fontSize: 12, letterSpacing: 2, fontWeight: '600',
  },
});

const mask = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 9999,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  logo: {
    width: 90, height: 90,
  },
  appName: {
    color: COLORS.text, fontSize: 18, fontWeight: '800',
    letterSpacing: 6,
    textShadowColor: COLORS.primaryGlow, textShadowRadius: 12,
  },
  sub: { color: COLORS.textDim, fontSize: 10, letterSpacing: 2 },
});
