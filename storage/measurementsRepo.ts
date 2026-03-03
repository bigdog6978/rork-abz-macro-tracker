import AsyncStorage from '@react-native-async-storage/async-storage';
import { MeasurementRecord, MeasurementPromptSettings } from '../features/progress/types';
import { toDateKey } from '../utils/dateKey';

const KEYS = {
  measurements: 'abz_measurements',
  promptSettings: 'abz_measurement_prompt_settings',
};

function ensureDateKey(r: MeasurementRecord): MeasurementRecord {
  if (r.dateKey) return r;
  const dk = toDateKey(new Date(r.recordedAt));
  return { ...r, dateKey: dk };
}

function sortByDateKey(records: MeasurementRecord[]): MeasurementRecord[] {
  return [...records].sort((a, b) => {
    const dkA = a.dateKey ?? toDateKey(new Date(a.recordedAt));
    const dkB = b.dateKey ?? toDateKey(new Date(b.recordedAt));
    return dkA.localeCompare(dkB);
  });
}

export async function getMeasurementByDateKey(
  userId: string,
  dateKey: string
): Promise<MeasurementRecord | null> {
  const records = await getMeasurements(userId);
  return records.find((r) => (r.dateKey ?? toDateKey(new Date(r.recordedAt))) === dateKey) ?? null;
}

export async function upsertMeasurement(record: MeasurementRecord): Promise<void> {
  try {
    const dateKey = record.dateKey ?? toDateKey(new Date(record.recordedAt));
    const withKey = { ...record, dateKey };
    const existing = await getMeasurements(record.userId);
    const idx = existing.findIndex(
      (r) => (r.dateKey ?? toDateKey(new Date(r.recordedAt))) === dateKey
    );
    let updated: MeasurementRecord[];
    if (idx >= 0) {
      updated = [...existing];
      updated[idx] = withKey;
    } else {
      updated = [...existing, withKey];
    }
    updated = sortByDateKey(updated);
    await AsyncStorage.setItem(KEYS.measurements, JSON.stringify(updated));
  } catch (err) {
    console.log('[measurementsRepo] Error upserting measurement:', err);
  }
}

export async function addMeasurement(record: MeasurementRecord): Promise<void> {
  await upsertMeasurement(ensureDateKey(record));
}

export async function getMeasurements(userId: string): Promise<MeasurementRecord[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.measurements);
    if (!data) return [];
    const all: MeasurementRecord[] = JSON.parse(data);
    const migrated = all.map(ensureDateKey);
    return migrated
      .filter((r) => r.userId === userId)
      .sort((a, b) => (a.dateKey ?? '').localeCompare(b.dateKey ?? ''));
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
