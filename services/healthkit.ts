import { InteractionManager, NativeModules, Platform } from 'react-native';
import AppleHealthKit, {
  AnchoredQueryResults,
  HealthInputOptions,
  HealthKitPermissions,
  HealthValue,
} from 'react-native-health';
import { ProHealthSignals } from '../features/pro/types';
import {
  buildProHealthSignals,
  getActivityDayRange,
  getSleepQueryRange,
  WorkoutSample,
} from './healthkitMapping';

export type HealthKitPermissionResult =
  | { ok: true }
  | { ok: false; reason: 'unavailable' | 'native_module' | 'denied' | 'error'; message?: string };

export type HealthKitProbeResult = { ok: true } | { ok: false; message?: string };

function logHealthKit(message: string, detail?: unknown) {
  if (__DEV__) {
    console.log(`[HealthKit] ${message}`, detail ?? '');
  }
}

function warnHealthKit(message: string, detail?: unknown) {
  console.warn(`[HealthKit] ${message}`, detail ?? '');
}

function isNativeModuleLoaded(): boolean {
  if (Platform.OS !== 'ios') return false;
  const native = NativeModules.AppleHealthKit as { initHealthKit?: unknown; isAvailable?: unknown } | undefined;
  return typeof native?.initHealthKit === 'function' && typeof native?.isAvailable === 'function';
}

function waitForUiSettled(): Promise<void> {
  return new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => {
      setTimeout(resolve, 450);
    });
  });
}

function callArray(
  method: (opts: HealthInputOptions, cb: (err: string, results: HealthValue[]) => void) => void,
  options: HealthInputOptions
): Promise<HealthValue[]> {
  return new Promise((resolve) => {
    method(options, (err, results) => {
      if (err) {
        logHealthKit('read error', err);
        resolve([]);
      } else {
        resolve(results ?? []);
      }
    });
  });
}

function callSingle(
  method: (opts: HealthInputOptions, cb: (err: string, results: HealthValue) => void) => void,
  options: HealthInputOptions
): Promise<HealthValue | null> {
  return new Promise((resolve) => {
    method(options, (err, results) => {
      if (err) {
        logHealthKit('read error', err);
        resolve(null);
      } else {
        resolve(results ?? null);
      }
    });
  });
}

function callAnchoredWorkouts(options: HealthInputOptions): Promise<WorkoutSample[]> {
  return new Promise((resolve) => {
    AppleHealthKit.getAnchoredWorkouts(options, (err, results: AnchoredQueryResults) => {
      if (err) {
        logHealthKit('workout read error', err);
        resolve([]);
      } else {
        resolve((results?.data ?? []) as WorkoutSample[]);
      }
    });
  });
}

const HEALTHKIT_PERMISSIONS: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.Workout,
      AppleHealthKit.Constants.Permissions.AppleExerciseTime,
    ],
    write: [],
  },
};

export function isHealthKitNativeModuleLoaded(): boolean {
  return isNativeModuleLoaded();
}

export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') return false;
  if (!isNativeModuleLoaded()) {
    warnHealthKit('Native module AppleHealthKit is not linked');
    return false;
  }
  return new Promise((resolve) => {
    AppleHealthKit.isAvailable((err, available) => {
      if (err) {
        warnHealthKit('isAvailable error', err);
        resolve(false);
        return;
      }
      resolve(Boolean(available));
    });
  });
}

/** Lightweight read after authorization to confirm HealthKit bridge responds. */
export async function probeHealthKitReadAccess(): Promise<HealthKitProbeResult> {
  if (!isNativeModuleLoaded()) {
    return { ok: false, message: 'AppleHealthKit native module missing' };
  }
  const { startDate, endDate } = getActivityDayRange();
  return new Promise((resolve) => {
    AppleHealthKit.getStepCount({ startDate, endDate }, (err) => {
      if (err) {
        const message = typeof err === 'string' ? err : String(err);
        warnHealthKit('probe read failed', message);
        resolve({ ok: false, message });
        return;
      }
      logHealthKit('probe read succeeded');
      resolve({ ok: true });
    });
  });
}

export async function requestHealthKitPermissions(): Promise<HealthKitPermissionResult> {
  if (Platform.OS !== 'ios') {
    return { ok: false, reason: 'unavailable', message: 'Not iOS' };
  }
  if (!isNativeModuleLoaded()) {
    return { ok: false, reason: 'native_module', message: 'AppleHealthKit native module missing' };
  }

  const available = await isHealthKitAvailable();
  if (!available) {
    return { ok: false, reason: 'unavailable', message: 'HealthKit not available on this device' };
  }

  await waitForUiSettled();

  const initResult = await new Promise<HealthKitPermissionResult>((resolve) => {
    try {
      AppleHealthKit.initHealthKit(HEALTHKIT_PERMISSIONS, (error) => {
        if (error) {
          const message = typeof error === 'string' ? error : String(error);
          warnHealthKit('initHealthKit failed', message);
          const denied =
            message.toLowerCase().includes('authorization') ||
            message.toLowerCase().includes('denied') ||
            message.toLowerCase().includes('cancel');
          resolve({
            ok: false,
            reason: denied ? 'denied' : 'error',
            message,
          });
          return;
        }
        logHealthKit('initHealthKit succeeded');
        resolve({ ok: true });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnHealthKit('initHealthKit threw', message);
      resolve({ ok: false, reason: 'error', message });
    }
  });

  if (!initResult.ok) return initResult;

  const probe = await probeHealthKitReadAccess();
  if (!probe.ok) {
    const message = probe.message ?? 'HealthKit probe read failed';
    const denied =
      message.toLowerCase().includes('authorization') ||
      message.toLowerCase().includes('denied') ||
      message.toLowerCase().includes('permission');
    if (denied) {
      return { ok: false, reason: 'denied', message };
    }
    warnHealthKit('probe failed after init; continuing as connected', message);
  }

  return { ok: true };
}

export async function readTodayHealthSignals(): Promise<ProHealthSignals | null> {
  if (!isNativeModuleLoaded()) return null;
  const available = await isHealthKitAvailable();
  if (!available) return null;

  const activityRange = getActivityDayRange();
  const sleepRange = getSleepQueryRange();
  const workoutOptions: HealthInputOptions = { ...activityRange, type: 'Workout' };

  try {
    const [activeEnergy, stepCount, exercise, workouts, heartRateSamples, sleepSamples, restingHR, hrvSamples] =
      await Promise.all([
        callArray(AppleHealthKit.getActiveEnergyBurned, activityRange),
        callSingle(AppleHealthKit.getStepCount, activityRange),
        callArray(AppleHealthKit.getAppleExerciseTime, activityRange),
        callAnchoredWorkouts(workoutOptions),
        callArray(AppleHealthKit.getHeartRateSamples, activityRange),
        callArray(AppleHealthKit.getSleepSamples, sleepRange),
        callSingle(AppleHealthKit.getRestingHeartRate, activityRange),
        callArray(AppleHealthKit.getHeartRateVariabilitySamples, activityRange),
      ]);

    return buildProHealthSignals({
      activeEnergy,
      stepCount,
      exerciseMinutes: exercise,
      workouts,
      heartRateSamples,
      sleepSamples,
      restingHR,
      hrvSamples,
    });
  } catch (error) {
    warnHealthKit('readTodayHealthSignals failed', error);
    return null;
  }
}
