import { Platform } from 'react-native';
import AppleHealthKit, { HealthInputOptions, HealthKitPermissions, HealthValue } from 'react-native-health';
import { ProHealthSignals } from '../features/pro/types';
import { getTodayDateKey } from '../utils/dateKey';

function sumValues(values: HealthValue[] | undefined): number {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, item) => sum + (item.value ?? 0), 0);
}

function averageValues(values: HealthValue[] | undefined): number {
  if (!values || values.length === 0) return 0;
  return sumValues(values) / values.length;
}

function sampleDurationMs(sample: HealthValue): number {
  const start = sample.startDate ? new Date(sample.startDate).getTime() : NaN;
  const end = sample.endDate ? new Date(sample.endDate).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return end - start;
}

/**
 * Sum sleep duration from each sample's start/end span (not the category `value`).
 * Prefers actual asleep stages; falls back to in-bed spans when stages are unavailable,
 * so older devices that only report IN_BED still produce a usable number.
 */
function sumSleepHours(samples: HealthValue[] | undefined): number {
  if (!samples || samples.length === 0) return 0;
  const categoryOf = (s: HealthValue) => String((s as { value?: unknown }).value ?? '').toUpperCase();
  const asleep = samples.filter((s) => {
    const c = categoryOf(s);
    return c !== 'INBED' && c !== 'IN_BED' && c !== 'AWAKE';
  });
  const source = asleep.length > 0 ? asleep : samples;
  const ms = source.reduce((sum, item) => sum + sampleDurationMs(item), 0);
  return ms / 3600000;
}

function callArray(
  method: (opts: HealthInputOptions, cb: (err: string, results: HealthValue[]) => void) => void,
  options: HealthInputOptions
): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    method(options, (err, results) => {
      if (err) resolve([]);
      else resolve(results ?? []);
    });
  });
}

function callSingle(
  method: (opts: HealthInputOptions, cb: (err: string, results: HealthValue) => void) => void,
  options: HealthInputOptions
): Promise<HealthValue | null> {
  return new Promise((resolve) => {
    method(options, (err, results) => {
      if (err) resolve(null);
      else resolve(results ?? null);
    });
  });
}

const HEALTHKIT_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
    ],
    write: [],
  },
};

export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((_err, available) => resolve(Boolean(available)));
  });
}

export async function requestHealthKitPermissions(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  return new Promise((resolve) => {
    AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (error) => resolve(!error));
  });
}

export async function readTodayHealthSignals(): Promise<ProHealthSignals | null> {
  const available = await isHealthKitAvailable();
  if (!available) return null;

  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const endDate = now.toISOString();
  const options: HealthInputOptions = { startDate, endDate };

  const [activeEnergy, stepCount, exercise, heartRateSamples, sleepSamples, restingHR] = await Promise.all([
    callArray(AppleHealthKit.getActiveEnergyBurned, options),
    callSingle(AppleHealthKit.getStepCount, options),
    callArray(AppleHealthKit.getAppleExerciseTime, options),
    callArray(AppleHealthKit.getHeartRateSamples, options),
    callArray(AppleHealthKit.getSleepSamples, options),
    callSingle(AppleHealthKit.getRestingHeartRate, options),
  ]);

  const avgHr = averageValues(heartRateSamples);
  const restHr = restingHR?.value ?? avgHr;
  const hrTrendDeltaPct = restHr > 0 ? Math.round(((avgHr - restHr) / restHr) * 100) : 0;
  const sleepHours = sumSleepHours(sleepSamples);

  return {
    dateKey: getTodayDateKey(),
    activeEnergyKcal: Math.round(sumValues(activeEnergy)),
    steps: Math.round(stepCount?.value ?? 0),
    workoutMinutes: Math.round(sumValues(exercise)),
    hrTrendDeltaPct,
    sleepHours: Math.round(sleepHours * 10) / 10,
  };
}

