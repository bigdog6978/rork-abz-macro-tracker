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
  const sleepHours = sumValues(sleepSamples) / 60;

  return {
    dateKey: getTodayDateKey(),
    activeEnergyKcal: Math.round(sumValues(activeEnergy)),
    steps: Math.round(stepCount?.value ?? 0),
    workoutMinutes: Math.round(sumValues(exercise)),
    hrTrendDeltaPct,
    sleepHours: Math.round(sleepHours * 10) / 10,
  };
}

