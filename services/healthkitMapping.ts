import { HealthValue } from 'react-native-health';
import { ProHealthSignals } from '../features/pro/types';
import { toDateKey } from '../utils/dateKey';

export type WorkoutSample = {
  duration?: number;
};

function sampleDurationMs(sample: HealthValue): number {
  const start = sample.startDate ? new Date(sample.startDate).getTime() : NaN;
  const end = sample.endDate ? new Date(sample.endDate).getTime() : NaN;
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
  return end - start;
}

/** Calendar day start → now (activity metrics). */
export function getActivityDayRange(now = new Date()): { startDate: string; endDate: string } {
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

/**
 * Prior-night sleep window: yesterday noon → now.
 * Captures sleep that ended this morning even when the session started yesterday.
 */
export function getSleepQueryRange(now = new Date()): { startDate: string; endDate: string } {
  const start = new Date(now);
  start.setDate(start.getDate() - 1);
  start.setHours(12, 0, 0, 0);
  return { startDate: start.toISOString(), endDate: now.toISOString() };
}

export function sumNumericValues(values: HealthValue[] | undefined): number {
  if (!values || values.length === 0) return 0;
  return values.reduce((sum, item) => sum + (item.value ?? 0), 0);
}

export function averageNumericValues(values: HealthValue[] | undefined): number {
  if (!values || values.length === 0) return 0;
  return sumNumericValues(values) / values.length;
}

/**
 * Sum sleep duration from each sample's start/end span (not the category `value`).
 */
export function sumSleepHours(samples: HealthValue[] | undefined): number {
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

export function sumWorkoutMinutes(workouts: WorkoutSample[] | undefined): number {
  if (!workouts || workouts.length === 0) return 0;
  const seconds = workouts.reduce((sum, w) => sum + (w.duration ?? 0), 0);
  return Math.round(seconds / 60);
}

export function buildProHealthSignals(input: {
  activeEnergy: HealthValue[];
  stepCount: HealthValue | null;
  exerciseMinutes: HealthValue[];
  workouts: WorkoutSample[];
  heartRateSamples: HealthValue[];
  sleepSamples: HealthValue[];
  restingHR: HealthValue | null;
  hrvSamples: HealthValue[];
  now?: Date;
}): ProHealthSignals {
  const now = input.now ?? new Date();
  const avgHr = averageNumericValues(input.heartRateSamples);
  const restHr = input.restingHR?.value ?? avgHr;
  const hrTrendDeltaPct = restHr > 0 ? Math.round(((avgHr - restHr) / restHr) * 100) : 0;
  const exerciseMinutes = Math.round(sumNumericValues(input.exerciseMinutes));
  const workoutMinutes = Math.max(exerciseMinutes, sumWorkoutMinutes(input.workouts));
  const hrvAvg = averageNumericValues(input.hrvSamples);

  return {
    dateKey: toDateKey(now),
    activeEnergyKcal: Math.round(sumNumericValues(input.activeEnergy)),
    steps: Math.round(input.stepCount?.value ?? 0),
    workoutMinutes,
    workoutCount: input.workouts.length,
    hrTrendDeltaPct,
    sleepHours: Math.round(sumSleepHours(input.sleepSamples) * 10) / 10,
    hrvSdnnMs: hrvAvg > 0 ? Math.round(hrvAvg * 10) / 10 : undefined,
  };
}
