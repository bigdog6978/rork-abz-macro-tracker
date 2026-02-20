import AsyncStorage from '@react-native-async-storage/async-storage';

export type ServingUnit = 'qty' | 'g' | 'oz';

const KEYS = {
  preferredServingUnit: 'abz_preferred_serving_unit',
};

export async function getPreferredServingUnit(): Promise<ServingUnit> {
  try {
    const value = await AsyncStorage.getItem(KEYS.preferredServingUnit);
    if (value === 'oz') return 'oz';
    if (value === 'qty') return 'qty';
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
