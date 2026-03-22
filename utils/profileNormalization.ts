import {
  DietaryModifier,
  UserProfile,
  kgToLb,
  legacyMacroStrategyToEatingStyle,
  normalizeLegacyActivityLevel,
} from '../types';

export type LegacyUserProfile = {
  first_name?: string;
  firstName?: string;
  age?: number;
  sex?: 'male' | 'female';
  height_cm?: number;
  heightCm?: number;
  weight_lb?: number;
  weightLb?: number;
  bodyFatPercent?: number;
  body_fat_percent?: number;
  activity_level?: string;
  activityLevel?: string;
  goal?: 'cut' | 'gain' | 'maintain' | 'recompose';
  goal_rate?: string;
  preference?: string;
  macro_strategy?: string;
  dietary_modifiers?: string[];
  dietModifiers?: string[];
  dietNotes?: string;
  diet_notes?: string;
  measurement_system?: 'metric' | 'us';
  measurementSystem?: 'metric' | 'us';
  onboarding_complete?: boolean;
  onboardingComplete?: boolean;
};

export const DEFAULT_PROFILE: UserProfile = {
  age: 30,
  sex: 'male',
  heightCm: 175,
  weightLb: 180,
  bodyFatPercent: undefined,
  activityLevel: 'moderate_training',
  goal: 'cut',
  eatingStyle: 'standard',
  dietModifiers: [],
  dietNotes: '',
  measurementSystem: 'us',
  onboardingComplete: false,
};

function getBmiFromWeightLb(weightLb: number, heightCm: number): number | undefined {
  if (!Number.isFinite(weightLb) || weightLb <= 0 || !Number.isFinite(heightCm) || heightCm <= 0) {
    return undefined;
  }
  const weightKg = weightLb * 0.45359237;
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function normalizeStoredWeightLb(
  value: number | undefined,
  fallback: number,
  measurementSystem: 'metric' | 'us',
  heightCm: number
): number {
  if (!Number.isFinite(value) || (value as number) <= 0) {
    return fallback;
  }

  const rawWeightLb = value as number;
  if (measurementSystem === 'metric') {
    const bmiAsLb = getBmiFromWeightLb(rawWeightLb, heightCm);
    const convertedWeightLb = kgToLb(rawWeightLb);
    const bmiAsKgConverted = getBmiFromWeightLb(convertedWeightLb, heightCm);

    const rawLooksImplausiblyLow = bmiAsLb != null && bmiAsLb < 15;
    const convertedLooksMorePlausible =
      bmiAsKgConverted != null &&
      bmiAsKgConverted >= 15 &&
      (bmiAsLb == null || bmiAsKgConverted > bmiAsLb + 4);

    if (rawLooksImplausiblyLow && convertedLooksMorePlausible) {
      return convertedWeightLb;
    }
  }

  return rawWeightLb;
}

function normalizeStoredBodyFatPercent(value: number | undefined): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  return (value as number) >= 3 && (value as number) <= 70 ? (value as number) : undefined;
}

function normalizeDietModifiers(raw: string[] | undefined): DietaryModifier[] {
  const valid = new Set<DietaryModifier>([
    'gluten_free',
    'dairy_free',
    'nut_free',
    'egg_free',
    'soy_free',
    'shellfish_free',
    'low_glycemic',
    'intermittent_fasting',
  ]);
  return (raw ?? []).filter((value): value is DietaryModifier => valid.has(value as DietaryModifier));
}

function deriveEatingStyle(stored: LegacyUserProfile): UserProfile['eatingStyle'] {
  const legacyModifiers = stored.dietary_modifiers ?? stored.dietModifiers ?? [];
  if (legacyModifiers.includes('vegan')) return 'vegan';
  if (legacyModifiers.includes('vegetarian')) return 'vegetarian';
  if (legacyModifiers.includes('paleo')) return 'paleo';
  if (stored.preference === 'vegetarian') return 'vegetarian';
  if (stored.preference === 'mediterranean') return 'mediterranean';
  return legacyMacroStrategyToEatingStyle(stored.macro_strategy ?? stored.preference);
}

export function normalizeStoredProfile(stored: LegacyUserProfile | null | undefined): UserProfile {
  if (!stored) return DEFAULT_PROFILE;

  const measurementSystem =
    stored.measurementSystem ?? stored.measurement_system ?? DEFAULT_PROFILE.measurementSystem;
  const heightCm = stored.heightCm ?? stored.height_cm ?? DEFAULT_PROFILE.heightCm;

  return {
    ...DEFAULT_PROFILE,
    firstName: stored.firstName ?? stored.first_name ?? DEFAULT_PROFILE.firstName,
    age: stored.age ?? DEFAULT_PROFILE.age,
    sex: stored.sex ?? DEFAULT_PROFILE.sex,
    heightCm,
    weightLb: normalizeStoredWeightLb(
      stored.weightLb ?? stored.weight_lb,
      DEFAULT_PROFILE.weightLb,
      measurementSystem,
      heightCm
    ),
    bodyFatPercent: normalizeStoredBodyFatPercent(
      stored.bodyFatPercent ?? stored.body_fat_percent ?? DEFAULT_PROFILE.bodyFatPercent
    ),
    goal: stored.goal ?? DEFAULT_PROFILE.goal,
    activityLevel: normalizeLegacyActivityLevel(stored.activityLevel ?? stored.activity_level),
    eatingStyle: deriveEatingStyle(stored),
    dietModifiers: normalizeDietModifiers(stored.dietModifiers ?? stored.dietary_modifiers),
    dietNotes: stored.dietNotes ?? stored.diet_notes ?? DEFAULT_PROFILE.dietNotes,
    measurementSystem,
    onboardingComplete:
      stored.onboardingComplete ?? stored.onboarding_complete ?? DEFAULT_PROFILE.onboardingComplete,
  };
}
