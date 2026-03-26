import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import Colors from '../constants/colors';
import { ACCENT_THEMES, AccentThemeId, getAccessibleOnColor, withAlpha } from '../theme/accentThemes';
import { getAccentTheme, setAccentTheme as persistAccentTheme } from '../storage/userSettingsRepo';

export type AppColors = typeof Colors & {
  onPrimary: string;
};

type ThemeContextValue = {
  accentTheme: AccentThemeId;
  setAccentTheme: (theme: AccentThemeId) => Promise<void>;
  colors: AppColors;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [accentTheme, setAccentThemeState] = useState<AccentThemeId>('chartreuse');

  useEffect(() => {
    getAccentTheme()
      .then(setAccentThemeState)
      .catch(() => {});
  }, []);

  const setAccentTheme = useCallback(async (theme: AccentThemeId) => {
    setAccentThemeState(theme);
    await persistAccentTheme(theme);
  }, []);

  const colors = useMemo<AppColors>(() => {
    const primary = ACCENT_THEMES[accentTheme]?.primary ?? Colors.primary;
    const onPrimary = getAccessibleOnColor(primary);
    return {
      ...Colors,
      primary,
      primaryMuted: withAlpha(primary, 0.15),
      onPrimary,
    };
  }, [accentTheme]);

  const value = useMemo(
    () => ({
      accentTheme,
      setAccentTheme,
      colors,
    }),
    [accentTheme, colors, setAccentTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}

export function useThemeColors(): AppColors {
  return useTheme().colors;
}
