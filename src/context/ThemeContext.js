import React, { createContext, useContext, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { DARK_COLORS, LIGHT_COLORS } from '../theme';
import { useSettings } from './SettingsContext';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const { settings } = useSettings();

  const isDark = useMemo(() => {
    if (settings.themeMode === 'dark')   return true;
    if (settings.themeMode === 'light')  return false;
    return systemScheme !== 'light';  // 'system' or unset defaults to dark
  }, [settings.themeMode, systemScheme]);

  const colors = isDark ? DARK_COLORS : LIGHT_COLORS;

  return (
    <ThemeContext.Provider value={{ colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

/** Returns { colors, isDark }. Use `colors` instead of importing COLORS directly. */
export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
