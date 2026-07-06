/**
 * Builds the phone → watch snapshot payload (all values strings, per
 * WatchConnectivity conventions — see docs/WATCH.md).
 *
 * Extracted verbatim from PhysiqWatchSync so the foreground sync component
 * and the background refresh task (services/backgroundRefresh.ts) produce
 * identical payloads. This is the single source of truth for payload keys;
 * the watch parses them in WatchSnapshot.swift and ComplicationEntry.swift.
 */

import Colors from '../../constants/colors';
import {
  DIETARY_MODIFIER_LABELS,
  EATING_STYLE_LABELS,
  MacroTargets,
  UserProfile,
} from '../../types';
import type {
  AthleteProfile,
  HydrationUnit,
  ProDayType,
  ProHealthSignals,
  ProSettings,
} from './types';
import { DAY_TYPE_OVERRIDE_LABELS } from './constants';

const DAY_TYPE_LABELS: Record<ProDayType, string> = {
  workout_day: 'Workout day',
  high_activity_day: 'High activity',
  rest_day: 'Rest day',
};

export interface WatchSnapshotInputs {
  profile: UserProfile;
  targets: MacroTargets;
  totals: MacroTargets;
  streak: number;
  hydrationConsumedMl: number;
  hydrationTargetMl: number;
  hydrationUnit: HydrationUnit;
  primaryHex: string;
  athleteProfile: AthleteProfile;
  settings: ProSettings;
  inferredDayType: ProDayType;
  healthSignals: ProHealthSignals | null;
  healthConnected: boolean;
  voiceMealFeedback: string;
}

export function buildWatchSnapshotPayload(input: WatchSnapshotInputs): Record<string, string> {
  const {
    profile,
    targets,
    totals,
    streak,
    hydrationConsumedMl,
    hydrationTargetMl,
    hydrationUnit,
    primaryHex,
    athleteProfile,
    settings,
    inferredDayType,
    healthSignals,
    healthConnected,
    voiceMealFeedback,
  } = input;

  const caloriesRemaining = Math.max(targets.calories - totals.calories, 0);
  const eatingStyle = EATING_STYLE_LABELS[profile.eatingStyle] ?? 'Standard';
  const modifiers = (profile.dietModifiers ?? [])
    .map((m) => DIETARY_MODIFIER_LABELS[m])
    .filter(Boolean);
  const dietLine = [eatingStyle, ...modifiers].join(' · ');
  const round1 = (n: number) => String(Math.round(n * 10) / 10);
  const syncState = profile.onboardingComplete ? 'ready' : 'onboarding_incomplete';
  const syncMessage = profile.onboardingComplete
    ? ''
    : 'Finish onboarding on iPhone to sync macro targets.';
  const dayTypeLabel = DAY_TYPE_LABELS[inferredDayType] ?? inferredDayType;
  const dayTypeOverride = settings.dayTypeOverride ?? 'auto';
  const dayTypeOverrideLabel = DAY_TYPE_OVERRIDE_LABELS[dayTypeOverride];
  const dayTypeSource = dayTypeOverride !== 'auto' ? 'override' : 'inferred';
  const healthLine = healthSignals
    ? `${Math.round(healthSignals.activeEnergyKcal)} kcal active · ${healthSignals.workoutMinutes} min training`
    : '';

  return {
    caloriesRemaining: String(Math.round(caloriesRemaining)),
    caloriesTarget: String(Math.round(targets.calories)),
    caloriesConsumed: String(Math.round(totals.calories)),
    proteinConsumed: round1(totals.protein_g),
    proteinTarget: round1(targets.protein_g),
    carbsConsumed: round1(totals.carbs_g),
    carbsTarget: round1(targets.carbs_g),
    fatConsumed: round1(totals.fat_g),
    fatTarget: round1(targets.fat_g),
    hydrationConsumedMl: String(Math.round(hydrationConsumedMl)),
    hydrationTargetMl: String(Math.round(hydrationTargetMl)),
    hydration: `${Math.round(hydrationConsumedMl)}/${Math.round(hydrationTargetMl)} ml`,
    hydrationUnit,
    streak: String(streak),
    firstName: profile.firstName ?? '',
    eatingStyle,
    dietLine,
    primaryHex,
    proteinHex: Colors.protein,
    carbsHex: Colors.carbs,
    fatHex: Colors.fat,
    hydrationHex: Colors.hydration,
    tier: 'unlocked',
    athleteSport: athleteProfile.enabled ? athleteProfile.sport : '',
    syncState,
    syncMessage,
    dayType: inferredDayType,
    dayTypeLabel,
    dayTypeOverride,
    dayTypeOverrideLabel,
    dayTypeSource,
    healthConnected: healthConnected ? '1' : '0',
    activeEnergyKcal: healthSignals ? String(Math.round(healthSignals.activeEnergyKcal)) : '0',
    workoutMinutes: healthSignals ? String(healthSignals.workoutMinutes) : '0',
    healthLine,
    voiceMealFeedback,
  };
}
