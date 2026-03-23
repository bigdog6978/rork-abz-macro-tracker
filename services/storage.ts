import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  USER_PROFILE: 'physiq_user_profile',
  MACRO_TARGETS: 'physiq_macro_targets',
  DAILY_LOGS: 'physiq_daily_logs',
  PROTOCOL: 'physiq_protocol',
  SETTINGS: 'physiq_settings',
  MEAL_PLAN_QUANTITIES: 'physiq_meal_plan_quantities',
  GOAL_SETTINGS: 'physiq_goal_settings',
  USER_ALLERGIES: 'physiq_user_allergies_v1',
  DISLIKED_FOODS: 'physiq_disliked_foods_v1',
  CUSTOM_MACRO_TARGETS: 'physiq_custom_macro_targets',
} as const;

export async function saveData(key: string, value: unknown): Promise<void> {
  try {
    const serialized = JSON.stringify(value);
    await AsyncStorage.setItem(key, serialized);
  } catch (error) {
    console.warn('[Storage] saveData failed:', key, error);
  }
}

export async function loadData<T>(key: string): Promise<T | null> {
  try {
    const stored = await AsyncStorage.getItem(key);
    if (stored == null) return null;
    return JSON.parse(stored) as T;
  } catch (error) {
    console.warn('[Storage] loadData failed:', key, error);
    return null;
  }
}

export async function removeData(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.warn('[Storage] removeData failed:', key, error);
  }
}
