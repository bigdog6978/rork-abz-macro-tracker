import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoalSettings } from '../features/progress/goalTargetTypes';
import { STORAGE_KEYS } from '../services/storage';

const KEY = STORAGE_KEYS.GOAL_SETTINGS;

export async function getGoalSettings(): Promise<GoalSettings | null> {
  try {
    const data = await AsyncStorage.getItem(KEY);
    if (!data) return null;
    return JSON.parse(data) as GoalSettings;
  } catch (err) {
    console.warn('[goalSettingsRepo] Error reading:', err);
    return null;
  }
}

export async function saveGoalSettings(settings: GoalSettings): Promise<void> {
  try {
    const withTimestamp = { ...settings, updatedAt: Date.now() };
    await AsyncStorage.setItem(KEY, JSON.stringify(withTimestamp));
  } catch (err) {
    console.warn('[goalSettingsRepo] Error saving:', err);
  }
}
