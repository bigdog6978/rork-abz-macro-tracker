import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeasurementRecord, MeasurementPromptSettings } from '../features/progress/types';

const KEYS = {
  measurements: 'abz_measurements',
  promptSettings: 'abz_measurement_prompt_settings',
};

export async function addMeasurement(record: MeasurementRecord): Promise<void> {
  try {
    const existing = await getMeasurements(record.userId);
    const updated = [...existing, record].sort(
      (a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
    );
    await AsyncStorage.setItem(KEYS.measurements, JSON.stringify(updated));
    console.log('[measurementsRepo] Added measurement:', record.id);
  } catch (err) {
    console.log('[measurementsRepo] Error adding measurement:', err);
  }
}

export async function getMeasurements(userId: string): Promise<MeasurementRecord[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.measurements);
    if (!data) return [];
    const all: MeasurementRecord[] = JSON.parse(data);
    return all
      .filter((r) => r.userId === userId)
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime());
  } catch (err) {
    console.log('[measurementsRepo] Error reading measurements:', err);
    return [];
  }
}

export async function getLatestMeasurement(userId: string): Promise<MeasurementRecord | null> {
  const records = await getMeasurements(userId);
  return records.length > 0 ? records[records.length - 1] : null;
}

export async function getBaselineMeasurement(userId: string): Promise<MeasurementRecord | null> {
  const records = await getMeasurements(userId);
  const baseline = records.find((r) => r.isBaseline);
  return baseline ?? (records.length > 0 ? records[0] : null);
}

export async function getPromptSettings(userId: string): Promise<MeasurementPromptSettings | null> {
  try {
    const data = await AsyncStorage.getItem(`${KEYS.promptSettings}_${userId}`);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.log('[measurementsRepo] Error reading prompt settings:', err);
    return null;
  }
}

export async function setPromptSettings(
  userId: string,
  settings: MeasurementPromptSettings
): Promise<void> {
  try {
    await AsyncStorage.setItem(`${KEYS.promptSettings}_${userId}`, JSON.stringify(settings));
    console.log('[measurementsRepo] Saved prompt settings for:', userId);
  } catch (err) {
    console.log('[measurementsRepo] Error saving prompt settings:', err);
  }
}

export async function deleteMeasurement(measurementId: string): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(KEYS.measurements);
    if (!data) return;
    const all: MeasurementRecord[] = JSON.parse(data);
    const updated = all.filter((r) => r.id !== measurementId);
    await AsyncStorage.setItem(KEYS.measurements, JSON.stringify(updated));
    console.log('[measurementsRepo] Deleted measurement:', measurementId);
  } catch (err) {
    console.log('[measurementsRepo] Error deleting measurement:', err);
  }
}
