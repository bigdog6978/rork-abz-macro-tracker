import AsyncStorage from '@react-native-async-storage/async-storage';

/** Weight-based modes only (qty mode is per-food, not persisted) */
export type ServingUnit = 'g' | 'oz';

/** Measure mode: qty = item count, grams/ounces = weight */
export type MeasureMode = 'qty' | 'grams' | 'ounces';

const KEYS = {
  preferredServingUnit: 'abz_preferred_serving_unit',
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
