import {
  UserProfile,
  MacroTargets,
  ActivityLevel,
  Goal,
  GoalRate,
  DietaryPreference,
  MacroStrategy,
} from '../types';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  lightly_active: 1.375,
  moderately_active: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

const CUT_ADJUSTMENTS: Record<GoalRate, number> = {
  slow: -0.1,
  moderate: -0.15,
  aggressive: -0.25,
};

const GAIN_ADJUSTMENTS: Record<GoalRate, number> = {
  slow: 0.05,
  moderate: 0.1,
  aggressive: 0.15,
};

const RECOMPOSE_ADJUSTMENT = -0.05;

export function calculateBMR(profile: UserProfile): number {
  const weight_kg = profile.weight_lb * 0.453592;
  if (profile.sex === 'male') {
    return 10 * weight_kg + 6.25 * profile.height_cm - 5 * profile.age + 5;
  }
  return 10 * weight_kg + 6.25 * profile.height_cm - 5 * profile.age - 161;
}

export function calculateTDEE(profile: UserProfile): number {
  const bmr = calculateBMR(profile);
  return Math.round(bmr * ACTIVITY_MULTIPLIERS[profile.activity_level]);
}

export function calculateCalorieTarget(profile: UserProfile): number {
  const tdee = calculateTDEE(profile);

  if (profile.goal === 'maintain') {
    return tdee;
  }

  if (profile.goal === 'cut') {
    const adjustment = CUT_ADJUSTMENTS[profile.goal_rate];
    return Math.round(tdee * (1 + adjustment));
  }

  if (profile.goal === 'recompose') {
    return Math.round(tdee * (1 + RECOMPOSE_ADJUSTMENT));
  }

  const adjustment = GAIN_ADJUSTMENTS[profile.goal_rate];
  return Math.round(tdee * (1 + adjustment));
}

function getProteinPerLb(goal: Goal): number {
  switch (goal) {
    case 'cut':
      return 1.0;
    case 'recompose':
      return 1.1;
    case 'gain':
      return 0.9;
    case 'maintain':
      return 0.85;
  }
}

function getFatCaloriePercentage(preference: DietaryPreference): number {
  switch (preference) {
    case 'keto':
      return 0.70;
    case 'carnivore':
      return 0.65;
    case 'vegetarian':
      return 0.25;
    case 'mediterranean':
      return 0.35;
    case 'balanced':
      return 0.30;
  }
}

function getFatPercentFromStrategy(strategy: MacroStrategy): number {
  switch (strategy) {
    case 'keto':
      return 0.70;
    case 'carnivore':
      return 0.65;
    case 'low_carb':
      return 0.45;
    case 'high_protein':
      return 0.25;
    case 'low_fat':
      return 0.15;
    case 'performance':
      return 0.20;
    case 'mediterranean':
      return 0.35;
    case 'balanced':
      return 0.30;
  }
}

function getProteinMultiplierFromStrategy(strategy: MacroStrategy, goal: Goal): number {
  const base = getProteinPerLb(goal);
  switch (strategy) {
    case 'high_protein':
      return Math.min(base + 0.2, 1.2);
    case 'performance':
      return base;
    default:
      return base;
  }
}

export function calculateMacros(profile: UserProfile): MacroTargets {
  const calories = calculateCalorieTarget(profile);
  const strategy = profile.macro_strategy ?? undefined;

  const proteinPerLb = strategy
    ? getProteinMultiplierFromStrategy(strategy, profile.goal)
    : getProteinPerLb(profile.goal);
  const protein_g = Math.round(profile.weight_lb * proteinPerLb);
  const proteinCalories = protein_g * 4;

  const fatPercent = strategy
    ? getFatPercentFromStrategy(strategy)
    : getFatCaloriePercentage(profile.preference);
  let fatCalories = Math.round(calories * fatPercent);
  let fat_g = Math.round(fatCalories / 9);

  let carbCalories = calories - proteinCalories - fatCalories;
  let carbs_g = Math.round(carbCalories / 4);

  const effectiveStrategy = strategy ?? profile.preference;

  if (effectiveStrategy === 'keto' && carbs_g > 50) {
    carbs_g = 50;
    carbCalories = carbs_g * 4;
    fatCalories = calories - proteinCalories - carbCalories;
    fat_g = Math.round(fatCalories / 9);
  }

  if (effectiveStrategy === 'low_carb' && carbs_g > 100) {
    carbs_g = 100;
    carbCalories = carbs_g * 4;
    fatCalories = calories - proteinCalories - carbCalories;
    fat_g = Math.round(fatCalories / 9);
  }

  if ((effectiveStrategy === 'carnivore' || profile.preference === 'carnivore') && carbs_g > 20) {
    carbs_g = 20;
    carbCalories = carbs_g * 4;
    fatCalories = calories - proteinCalories - carbCalories;
    fat_g = Math.round(fatCalories / 9);
  }

  if (carbs_g < 0) carbs_g = 0;
  if (fat_g < 0) fat_g = 0;

  return {
    calories,
    protein_g,
    carbs_g,
    fat_g,
  };
}

export function macrosFromEntry(entry: { protein_g: number; carbs_g: number; fat_g: number }): number {
  return entry.protein_g * 4 + entry.carbs_g * 4 + entry.fat_g * 9;
}

export function getAdherencePercent(
  consumed: MacroTargets,
  targets: MacroTargets
): number {
  if (targets.calories === 0) return 0;
  const calRatio = Math.min(consumed.calories / targets.calories, 1.2);
  const protRatio = Math.min(consumed.protein_g / Math.max(targets.protein_g, 1), 1.2);
  const carbRatio = Math.min(consumed.carbs_g / Math.max(targets.carbs_g, 1), 1.2);
  const fatRatio = Math.min(consumed.fat_g / Math.max(targets.fat_g, 1), 1.2);

  const avg = (calRatio + protRatio + carbRatio + fatRatio) / 4;
  return Math.round(Math.min(avg, 1) * 100);
}

export function getTodayDateString(): string {
  return new Date().toISOString().split('T')[0];
}
