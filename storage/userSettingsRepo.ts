import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AccentThemeId } from '../theme/accentThemes';

/** Weight-based modes only (qty mode is per-food, not persisted) */
export type ServingUnit = 'g' | 'oz';

/** Measure mode: qty = item count, grams/ounces = weight */
export type MeasureMode = 'qty' | 'grams' | 'ounces';

const KEYS = {
  preferredServingUnit: 'abz_preferred_serving_unit',
  accentTheme: 'abz_accent_theme',
};

export async function getPreferredServingUnit(): Promise<ServingUnit> {
  try {
    const value = await AsyncStorage.getItem(KEYS.preferredServingUnit);
    if (value === 'oz') return 'oz';
    return 'g';
  } catch (err) {
    console.log('[userSettingsRepo] Error reading serving unit:', err);
    return 'g';
  }
}

export async function setPreferredServingUnit(unit: ServingUnit): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.preferredServingUnit, unit);
  } catch (err) {
    console.log('[userSettingsRepo] Error writing serving unit:', err);
  }
}

export async function getAccentTheme(): Promise<AccentThemeId> {
  try {
    const value = await AsyncStorage.getItem(KEYS.accentTheme);
    switch (value) {
      case 'red':
      case 'chartreuse':
      case 'blue':
      case 'violet':
      case 'pink':
      case 'orange':
        return value;
      default:
        return 'chartreuse';
    }
  } catch (err) {
    console.log('[userSettingsRepo] Error reading accent theme:', err);
    return 'chartreuse';
  }
}

export async function setAccentTheme(theme: AccentThemeId): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.accentTheme, theme);
  } catch (err) {
    console.log('[userSettingsRepo] Error writing accent theme:', err);
  }
}
