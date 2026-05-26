import 'react-native-gesture-handler';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
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
import { FinanceProvider, useFinance } from './src/context/FinanceContext';
import { SettingsProvider } from './src/context/SettingsContext';
import { ThemeProvider } from './src/context/ThemeContext';
import { initSentry } from './src/utils/sentry';
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
import EnvelopesScreen from './src/screens/EnvelopesScreen';
import RecurringScreen from './src/screens/RecurringScreen';
import SettingsScreen from './src/screens/SettingsScreen';
import CategoriesScreen from './src/screens/CategoriesScreen';
import ProfileScreen    from './src/screens/ProfileScreen';
import SearchScreen     from './src/screens/SearchScreen';

initSentry();

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
    width: 48, height: 34, borderRadius: 17,
    backgroundColor: `${COLORS.primary}1a`,
    borderWidth: 1, borderColor: `${COLORS.primary}40`,
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

function HeaderSearchButton() {
  const nav = useNavigation();
  return (
    <TouchableOpacity onPress={() => nav.navigate('Search')} style={{ marginRight: 4 }}>
      <Ionicons name="search-outline" size={20} color={COLORS.textDim} />
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
        headerStyle: { backgroundColor: COLORS.bgCard, borderBottomWidth: 1, borderBottomColor: COLORS.borderSubtle },
        headerTintColor: COLORS.textMuted,
        headerTitleStyle: { fontSize: 10, fontWeight: '700', letterSpacing: 3, color: COLORS.accent },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <HeaderSearchButton />
            <HeaderGearButton />
            <HeaderLogoutButton onPress={logout} />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: COLORS.bgCard,
          borderTopColor: COLORS.borderSubtle, borderTopWidth: 1,
          height: 66, paddingBottom: 8, paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primaryLight,
        tabBarInactiveTintColor: COLORS.textDim,
        tabBarLabelStyle: { fontSize: 9, fontWeight: '800', letterSpacing: 1.5 },
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
        name="Sobres"
        component={EnvelopesScreen}
        options={{
          headerTitle: '⟨ SOBRES ⟩',
          tabBarIcon: ({ color, focused }) => <TabIcon name="layers" color={color} focused={focused} />,
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

function ConnectionErrorGate({ children }) {
  const { syncError, isLoaded, reload } = useFinance();
  const [retrying, setRetrying] = React.useState(false);

  const handleRetry = async () => {
    setRetrying(true);
    try { await reload(); } finally { setRetrying(false); }
  };

  if (isLoaded && syncError) {
    return (
      <View style={errorStyles.container}>
        <View style={errorStyles.iconWrap}>
          <Ionicons name="cloud-offline-outline" size={52} color={COLORS.expense} />
        </View>
        <Text style={errorStyles.title}>ERROR DE CONEXIÓN AL SERVIDOR</Text>
        <Text style={errorStyles.sub}>No se puede contactar con el servidor</Text>
        <TouchableOpacity style={errorStyles.btn} onPress={handleRetry} disabled={retrying}>
          <Text style={errorStyles.btnText}>{retrying ? 'RECONECTANDO...' : 'REINTENTAR'}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return children;
}

const errorStyles = StyleSheet.create({
  container: {
    flex: 1, backgroundColor: COLORS.bg,
    alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12,
  },
  iconWrap: {
    width: 96, height: 96, borderRadius: 48,
    backgroundColor: COLORS.bgCard,
    borderWidth: 1, borderColor: COLORS.expense,
    alignItems: 'center', justifyContent: 'center', marginBottom: 8,
    shadowColor: COLORS.expense, shadowRadius: 20, shadowOpacity: 0.35, elevation: 8,
  },
  title: {
    color: COLORS.text, fontSize: 13, fontWeight: '800', letterSpacing: 3, marginTop: 4,
    textAlign: 'center',
  },
  sub: { color: COLORS.textMuted, fontSize: 12, letterSpacing: 1, textAlign: 'center' },
  btn: {
    marginTop: 16, paddingHorizontal: 32, paddingVertical: 14,
    borderRadius: 4, borderWidth: 1, borderColor: COLORS.primary,
    backgroundColor: COLORS.primaryGlow,
  },
  btnText: { color: COLORS.primaryLight, fontWeight: '700', fontSize: 12, letterSpacing: 2 },
});

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
        <ThemeProvider>
        <ConnectionErrorGate>
        <NavigationContainer theme={NAV_THEME}>
          <CelebrationLayer>
          <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
            <Stack.Screen name="Tabs" options={{ animation: 'none' }}>
              {() => <FirstTimeGate><TabsNavigator user={user} logout={logout} /></FirstTimeGate>}
            </Stack.Screen>
            <Stack.Screen name="Settings"   component={SettingsScreen} />
            <Stack.Screen name="Categories" component={CategoriesScreen} />
            <Stack.Screen name="Profile"    component={ProfileScreen} />
            <Stack.Screen name="Search"     component={SearchScreen} options={{ presentation: 'modal', animation: 'slide_from_bottom' }} />
          </Stack.Navigator>
          </CelebrationLayer>
        </NavigationContainer>
        </ConnectionErrorGate>
        </ThemeProvider>
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
    <GestureHandlerRootView style={{ flex: 1 }}>
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
    </GestureHandlerRootView>
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
