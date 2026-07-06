import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  DEFAULT_REMINDER_SETTINGS,
  ReminderSettings,
} from '../features/reminders/reminderPlan';

const KEY = 'physiq_reminder_settings_v1';

export async function getReminderSettings(): Promise<ReminderSettings> {
  try {
    const stored = await AsyncStorage.getItem(KEY);
    if (!stored) return DEFAULT_REMINDER_SETTINGS;
    return { ...DEFAULT_REMINDER_SETTINGS, ...(JSON.parse(stored) as Partial<ReminderSettings>) };
  } catch (err) {
    console.log('[reminderSettingsRepo] read failed:', err);
    return DEFAULT_REMINDER_SETTINGS;
  }
}

export async function saveReminderSettings(settings: ReminderSettings): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(settings));
  } catch (err) {
    console.log('[reminderSettingsRepo] write failed:', err);
  }
}
