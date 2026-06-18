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

type HealthKitNativeModule = {
  initHealthKit?: (permissions: HealthKitPermissions, callback: (error: string) => void) => void;
  isAvailable?: (callback: (err: string, available: boolean) => void) => void;
  getStepCount?: (options: HealthInputOptions, callback: (err: string, results: HealthValue) => void) => void;
  getAnchoredWorkouts?: (
    options: HealthInputOptions,
    callback: (err: unknown, results: AnchoredQueryResults) => void
  ) => void;
  getActiveEnergyBurned?: (
    options: HealthInputOptions,
    callback: (err: string, results: HealthValue[]) => void
  ) => void;
  getAppleExerciseTime?: (
    options: HealthInputOptions,
    callback: (err: string, results: HealthValue[]) => void
  ) => void;
  getHeartRateSamples?: (
    options: HealthInputOptions,
    callback: (err: string, results: HealthValue[]) => void
  ) => void;
  getSleepSamples?: (
    options: HealthInputOptions,
    callback: (err: string, results: HealthValue[]) => void
  ) => void;
  getRestingHeartRate?: (
    options: HealthInputOptions,
    callback: (err: string, results: HealthValue) => void
  ) => void;
  getHeartRateVariabilitySamples?: (
    options: HealthInputOptions,
    callback: (err: string, results: HealthValue[]) => void
  ) => void;
};

function logHealthKit(message: string, detail?: unknown) {
  if (__DEV__) {
    console.log(`[HealthKit] ${message}`, detail ?? '');
  }
}

function warnHealthKit(message: string, detail?: unknown) {
  console.warn(`[HealthKit] ${message}`, detail ?? '');
}

/** Resolve native bridge at call time — default import can lack methods under New Architecture. */
function getNativeHealthKit(): HealthKitNativeModule | null {
  const bridged = NativeModules.AppleHealthKit as HealthKitNativeModule | undefined;
  if (bridged && typeof bridged.initHealthKit === 'function') return bridged;
  if (typeof AppleHealthKit?.initHealthKit === 'function') return AppleHealthKit as HealthKitNativeModule;
  return null;
}

function isNativeModuleLoaded(): boolean {
  if (Platform.OS !== 'ios') return false;
  const native = getNativeHealthKit();
  return typeof native?.initHealthKit === 'function' && typeof native?.isAvailable === 'function';
}

function waitForUiSettled(): Promise<void> {
  return new Promise((resolve) => {
    const done = () => setTimeout(resolve, 450);
    if (typeof InteractionManager?.runAfterInteractions === 'function') {
      InteractionManager.runAfterInteractions(done);
    } else {
      done();
    }
  });
}

function callArray(
  method: ((opts: HealthInputOptions, cb: (err: string, results: HealthValue[]) => void) => void) | undefined,
  options: HealthInputOptions
): Promise<HealthValue[]> {
  if (typeof method !== 'function') return Promise.resolve([]);
  return new Promise((resolve) => {
    try {
      method(options, (err, results) => {
        if (err) {
          logHealthKit('read error', err);
          resolve([]);
        } else {
          resolve(results ?? []);
        }
      });
    } catch (error) {
      warnHealthKit('read threw', error);
      resolve([]);
    }
  });
}

function callSingle(
  method: ((opts: HealthInputOptions, cb: (err: string, results: HealthValue) => void) => void) | undefined,
  options: HealthInputOptions
): Promise<HealthValue | null> {
  if (typeof method !== 'function') return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      method(options, (err, results) => {
        if (err) {
          logHealthKit('read error', err);
          resolve(null);
        } else {
          resolve(results ?? null);
        }
      });
    } catch (error) {
      warnHealthKit('read threw', error);
      resolve(null);
    }
  });
}

function callAnchoredWorkouts(
  native: HealthKitNativeModule,
  options: HealthInputOptions
): Promise<WorkoutSample[]> {
  const method = native.getAnchoredWorkouts;
  if (typeof method !== 'function') return Promise.resolve([]);
  return new Promise((resolve) => {
    try {
      method(options, (err, results: AnchoredQueryResults) => {
        if (err) {
          logHealthKit('workout read error', err);
          resolve([]);
        } else {
          resolve((results?.data ?? []) as WorkoutSample[]);
        }
      });
    } catch (error) {
      warnHealthKit('workout read threw', error);
      resolve([]);
    }
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
  const native = getNativeHealthKit();
  if (!native?.isAvailable) {
    warnHealthKit('Native module AppleHealthKit is not linked');
    return false;
  }
  return new Promise((resolve) => {
    try {
      native.isAvailable!((err, available) => {
        if (err) {
          warnHealthKit('isAvailable error', err);
          resolve(false);
          return;
        }
        resolve(Boolean(available));
      });
    } catch (error) {
      warnHealthKit('isAvailable threw', error);
      resolve(false);
    }
  });
}

/** Lightweight read after authorization to confirm HealthKit bridge responds. */
export async function probeHealthKitReadAccess(): Promise<HealthKitProbeResult> {
  const native = getNativeHealthKit();
  if (!native?.getStepCount) {
    return { ok: false, message: 'AppleHealthKit.getStepCount is not available' };
  }
  const { startDate, endDate } = getActivityDayRange();
  return new Promise((resolve) => {
    try {
      native.getStepCount!({ startDate, endDate }, (err) => {
        if (err) {
          const message = typeof err === 'string' ? err : String(err);
          warnHealthKit('probe read failed', message);
          resolve({ ok: false, message });
          return;
        }
        logHealthKit('probe read succeeded');
        resolve({ ok: true });
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      warnHealthKit('probe read threw', message);
      resolve({ ok: false, message });
    }
  });
}

export async function requestHealthKitPermissions(): Promise<HealthKitPermissionResult> {
  try {
    if (Platform.OS !== 'ios') {
      return { ok: false, reason: 'unavailable', message: 'Not iOS' };
    }
    const native = getNativeHealthKit();
    if (!native?.initHealthKit) {
      return { ok: false, reason: 'native_module', message: 'AppleHealthKit native module missing' };
    }

    const available = await isHealthKitAvailable();
    if (!available) {
      return { ok: false, reason: 'unavailable', message: 'HealthKit not available on this device' };
    }

    await waitForUiSettled();

    const initResult = await new Promise<HealthKitPermissionResult>((resolve) => {
      try {
        native.initHealthKit!(HEALTHKIT_PERMISSIONS, (error) => {
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
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    warnHealthKit('requestHealthKitPermissions failed', message);
    return { ok: false, reason: 'error', message };
  }
}

export async function readTodayHealthSignals(): Promise<ProHealthSignals | null> {
  const native = getNativeHealthKit();
  if (!native) return null;
  const available = await isHealthKitAvailable();
  if (!available) return null;

  const activityRange = getActivityDayRange();
  const sleepRange = getSleepQueryRange();
  const workoutOptions: HealthInputOptions = { ...activityRange, type: 'Workout' };

  try {
    const [activeEnergy, stepCount, exercise, workouts, heartRateSamples, sleepSamples, restingHR, hrvSamples] =
      await Promise.all([
        callArray(native.getActiveEnergyBurned, activityRange),
        callSingle(native.getStepCount, activityRange),
        callArray(native.getAppleExerciseTime, activityRange),
        callAnchoredWorkouts(native, workoutOptions),
        callArray(native.getHeartRateSamples, activityRange),
        callArray(native.getSleepSamples, sleepRange),
        callSingle(native.getRestingHeartRate, activityRange),
        callArray(native.getHeartRateVariabilitySamples, activityRange),
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
