import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api, getToken, setToken, clearToken, getRefreshToken, setRefreshToken, clearRefreshToken } from '../services/api';

const AuthContext  = createContext(null);
const USER_CACHE_KEY = 'nova_user_cache';
export const SHOW_ONBOARDING_KEY = '@nova_show_onboarding';

const CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const cacheUser   = (u) => SecureStore.setItemAsync(USER_CACHE_KEY, JSON.stringify({ ...u, cachedAt: Date.now() })).catch(() => {});
const getCached   = async () => {
  try {
    const raw = await SecureStore.getItemAsync(USER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed.cachedAt && Date.now() - parsed.cachedAt > CACHE_TTL_MS) return null;
    const { cachedAt, ...user } = parsed;
    return user;
  } catch { return null; }
};
const clearCached = () => SecureStore.deleteItemAsync(USER_CACHE_KEY).catch(() => {});

// Extrae id y username del payload JWT sin verificar firma (solo para fallback offline)
const decodeJwtUser = (token) => {
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    return { id: payload.id, username: payload.username, name: payload.username };
  } catch { return null; }
};

export function AuthProvider({ children }) {
  const [user, setUser]           = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLocked, setIsLocked]   = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (!token) return;

        try {
          const me = await api.me();
          setUser(me);
          cacheUser(me);
        } catch (apiErr) {
          if (apiErr.status === 401) {
            // El interceptor de api.js ya intentó renovar con el refresh token.
            // Si llega aquí con 401, la sesión es irrecuperable.
            await clearToken();
            await clearRefreshToken();
            await clearCached();
            return;
          }
          // Sin red o servidor caído → caché primero, luego JWT como último recurso
          const cached = await getCached();
          if (cached) {
            setUser(cached);
          } else {
            const fromJwt = decodeJwtUser(token);
            if (fromJwt) {
              setUser(fromJwt);
            } else {
              await clearToken();
              await clearRefreshToken();
              return;
            }
          }
        }
        setIsLocked(true);
      } catch {
        await clearToken();
        await clearRefreshToken();
        await clearCached();
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const login = async (username, password) => {
    const { token, refreshToken, user: u } = await api.login(username, password);
    await setToken(token);
    await setRefreshToken(refreshToken);
    await cacheUser(u);
    setUser(u);
    setIsLocked(false);
  };

  const register = async (username, name, password) => {
    const { token, refreshToken, user: u } = await api.register(username, name, password);
    await setToken(token);
    await setRefreshToken(refreshToken);
    await cacheUser(u);
    // Marca que hay que mostrar el onboarding una sola vez tras el registro
    await AsyncStorage.setItem(SHOW_ONBOARDING_KEY, 'true').catch(() => {});
    setUser(u);
    setIsLocked(false);
  };

  const logout = async () => {
    // Invalida el refresh token en el servidor antes de borrarlo localmente
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      api.logout(refreshToken).catch(() => {}); // fire-and-forget, no bloquea el logout local
    }
    await clearToken();
    await clearRefreshToken();
    await clearCached();
    setUser(null);
    setIsLocked(false);
  };

  const updateUser = async (data) => {
    const updated = await api.updateMe(data);
    setUser(updated);
    await cacheUser(updated);
    return updated;
  };

  const changePassword = async (currentPassword, newPassword) => {
    await api.changePassword({ currentPassword, newPassword });
  };

  const deleteAccount = async () => {
    await api.deleteMe();
    await clearToken();
    await clearRefreshToken();
    await clearCached();
    setUser(null);
    setIsLocked(false);
  };

  const lockApp = useCallback(() => setIsLocked(true), []);

  const unlock = useCallback(async () => {
    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled  = await LocalAuthentication.isEnrolledAsync();

      if (!hasHardware || !isEnrolled) {
        setIsLocked(false);
        return true;
      }

      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:         'Verifica tu identidad para acceder',
        fallbackLabel:         'Usar PIN del dispositivo',
        cancelLabel:           'Cancelar',
        disableDeviceFallback: false,
      });

      if (result.success) {
        setIsLocked(false);
        return true;
      }
      return false;
    } catch {
      setIsLocked(false);
      return true;
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      user, isLoading, isLocked,
      login, register, logout,
      updateUser, changePassword, deleteAccount,
      lockApp, unlock,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
