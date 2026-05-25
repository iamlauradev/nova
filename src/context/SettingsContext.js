import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureCurrency } from '../utils';

// ─── Defaults ─────────────────────────────────────────────────────────────────
const SETTINGS_KEY = '@nova_settings';

const DEFAULT_SETTINGS = {
  fontScale: 1.0,        // 0.85 | 1.0 | 1.15 | 1.3
  currency: 'EUR',       // EUR | USD | GBP | MXN | ARS | COP
  currencyLocale: 'es-ES',
  showCents: true,
  darkMode: true,        // always true for now, reserved for future
  compactNumbers: false,
};

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);

  // ── Load from storage ───────────────────────────────────────────────────────
  useEffect(() => {
    AsyncStorage.getItem(SETTINGS_KEY)
      .then(raw => {
        if (raw) {
          try {
            const saved = JSON.parse(raw);
            setSettings(prev => ({ ...prev, ...saved }));
          } catch (_) {}
        }
      })
      .finally(() => setLoaded(true));
  }, []);

  // ── Persist on change ───────────────────────────────────────────────────────
  useEffect(() => {
    if (loaded) {
      AsyncStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
      configureCurrency(settings.currency || 'EUR', settings.currencyLocale || 'es-ES');
    }
  }, [settings, loaded]);

  // ── Updaters ────────────────────────────────────────────────────────────────
  const updateSetting = (key, value) =>
    setSettings(prev => ({ ...prev, [key]: value }));

  const resetSettings = () => setSettings(DEFAULT_SETTINGS);

  // ── Derived helpers ─────────────────────────────────────────────────────────
  // fs(base) → scaled font size
  const fs = (base) => Math.round(base * settings.fontScale);

  return (
    <SettingsContext.Provider value={{ settings, updateSetting, resetSettings, fs, loaded }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used inside SettingsProvider');
  return ctx;
}
