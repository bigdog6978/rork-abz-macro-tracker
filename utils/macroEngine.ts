import {
  ACTIVITY_LABELS,
  ActivityLevel,
  EATING_STYLE_LABELS,
  EatingStyle,
  GOAL_LABELS,
  Goal,
  MacroCalculationDetails,
  MacroTargets,
  UserProfile,
} from '../types';
import { getTodayDateKey } from './dateKey';

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light_activity: 1.35,
  moderate_training: 1.5,
  strength_training: 1.65,
  endurance_training: 1.75,
};

const MIN_CALORIES = {
  male: 1500,
  female: 1200,
} as const;

const PROTEIN_FROM_LEAN_MASS: Record<Goal, number> = {
  cut: 1.1,
  gain: 0.95,
  maintain: 0.85,
  recompose: 1.0,
};

const PROTEIN_FROM_ACTIVITY: Record<ActivityLevel, number> = {
  sedentary: 0.7,
  light_activity: 0.8,
  moderate_training: 0.9,
  strength_training: 1.0,
  endurance_training: 0.9,
};

const MIN_PLAUSIBLE_BODY_FAT_PERCENT = 3;
const MAX_PLAUSIBLE_BODY_FAT_PERCENT = 70;

function getSafeWeightLb(profile: UserProfile): number {
  return Number.isFinite(profile.weightLb) && profile.weightLb > 0 ? profile.weightLb : 1;
}

function getValidBodyFatPercent(profile: UserProfile): number | undefined {
  if (!Number.isFinite(profile.bodyFatPercent)) return undefined;
  if (
    profile.bodyFatPercent == null ||
    profile.bodyFatPercent < MIN_PLAUSIBLE_BODY_FAT_PERCENT ||
    profile.bodyFatPercent > MAX_PLAUSIBLE_BODY_FAT_PERCENT
  ) {
    return undefined;
  }
  return profile.bodyFatPercent;
}

export function calculateBMR(profile: UserProfile): number {
  const weightKg = getSafeWeightLb(profile) * 0.45359237;
  if (profile.sex === 'male') {
    return 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age + 5;
  }
  return 10 * weightKg + 6.25 * profile.heightCm - 5 * profile.age - 161;
}

export function calculateTDEE(profile: UserProfile): number {
  return calculateBMR(profile) * ACTIVITY_MULTIPLIERS[profile.activityLevel];
}

export function getRecompCalorieAdjustment(profile: UserProfile): number {
  if (profile.goal !== 'recompose') return 0;
  const bodyFatPercent = getValidBodyFatPercent(profile);
  if (bodyFatPercent == null) return 0;
  const highBodyFatThreshold = profile.sex === 'male' ? 20 : 30;
  return bodyFatPercent >= highBodyFatThreshold ? -0.05 : 0;
}

export function calculateCalorieTarget(profile: UserProfile): number {
  const tdee = calculateTDEE(profile);
  let adjustedCalories = tdee;

  switch (profile.goal) {
    case 'cut':
      adjustedCalories = tdee * 0.8;
      break;
    case 'gain':
      adjustedCalories = tdee * 1.1;
      break;
    case 'recompose':
      adjustedCalories = tdee * (1 + getRecompCalorieAdjustment(profile));
      break;
    case 'maintain':
    default:
      adjustedCalories = tdee;
      break;
  }

  return Math.max(MIN_CALORIES[profile.sex], Math.round(adjustedCalories));
}

export function getLeanMassLb(profile: UserProfile): number {
  const weightLb = getSafeWeightLb(profile);
  const bodyFatPercent = getValidBodyFatPercent(profile);
  if (bodyFatPercent == null) {
    return weightLb;
  }
  return weightLb * (1 - bodyFatPercent / 100);
}

function calculateProteinTarget(profile: UserProfile): number {
  const weightLb = getSafeWeightLb(profile);
  const validBodyFatPercent = getValidBodyFatPercent(profile);
  const bodyWeightProteinAnchor = weightLb * PROTEIN_FROM_ACTIVITY[profile.activityLevel];

  if (validBodyFatPercent != null) {
    const leanMassLb = getLeanMassLb(profile);
    const baseProtein = leanMassLb * PROTEIN_FROM_LEAN_MASS[profile.goal];
    return Math.max(baseProtein, bodyWeightProteinAnchor, weightLb * 0.7);
  }

  return Math.max(bodyWeightProteinAnchor, weightLb * 0.7);
}

function calculateFatTarget(profile: UserProfile): number {
  const weightLb = getSafeWeightLb(profile);
  const baseFat = weightLb * 0.3;
  if (profile.eatingStyle === 'keto') {
    return Math.max(baseFat, weightLb * 0.5);
  }
  if (profile.eatingStyle === 'carnivore') {
    return Math.max(baseFat, weightLb * 0.45);
  }
  return baseFat;
}

function getGoalAdjustmentInfo(profile: UserProfile, estimatedTdee: number) {
  switch (profile.goal) {
    case 'cut':
      return {
        goalLabel: GOAL_LABELS.cut,
        calorieAdjustmentLabel: 'Fat Loss (-20%)',
        calorieAdjustmentValue: Math.round(estimatedTdee * 0.8) - Math.round(estimatedTdee),
      };
    case 'gain':
      return {
        goalLabel: GOAL_LABELS.gain,
        calorieAdjustmentLabel: 'Muscle Gain (+10%)',
        calorieAdjustmentValue: Math.round(estimatedTdee * 1.1) - Math.round(estimatedTdee),
      };
    case 'recompose': {
      const recompAdjustment = getRecompCalorieAdjustment(profile);
      return {
        goalLabel: GOAL_LABELS.recompose,
        calorieAdjustmentLabel: `Body Recomposition (${Math.round(recompAdjustment * 100)}%)`,
        calorieAdjustmentValue:
          Math.round(estimatedTdee * (1 + recompAdjustment)) - Math.round(estimatedTdee),
      };
    }
    case 'maintain':
    default:
      return {
        goalLabel: GOAL_LABELS.maintain,
        calorieAdjustmentLabel: 'Maintenance (0%)',
        calorieAdjustmentValue: 0,
      };
  }
}

function getProteinRuleLabel(profile: UserProfile): string {
  if (getValidBodyFatPercent(profile) != null) {
    return `${PROTEIN_FROM_LEAN_MASS[profile.goal]} g/lb lean mass, floored by ${PROTEIN_FROM_ACTIVITY[profile.activityLevel]} g/lb body weight`;
  }
  return `${PROTEIN_FROM_ACTIVITY[profile.activityLevel]} g/lb body weight (0.7 g/lb floor)`;
}

function buildCalculationDetails(
  profile: UserProfile,
  targets: Omit<MacroTargets, 'calculationDetails'>
): MacroCalculationDetails {
  const estimatedBmr = Math.round(calculateBMR(profile));
  const estimatedTdee = Math.round(calculateTDEE(profile));
  const activityMultiplier = ACTIVITY_MULTIPLIERS[profile.activityLevel];
  const { goalLabel, calorieAdjustmentLabel, calorieAdjustmentValue } = getGoalAdjustmentInfo(
    profile,
    estimatedTdee
  );

  return {
    bmrFormula: 'Mifflin-St Jeor',
    estimatedBmr,
    activityLevelLabel: ACTIVITY_LABELS[profile.activityLevel],
    activityMultiplier,
    estimatedTdee,
    goalLabel,
    calorieAdjustmentLabel,
    calorieAdjustmentValue,
    eatingStyleLabel: EATING_STYLE_LABELS[profile.eatingStyle],
    proteinRuleLabel: getProteinRuleLabel(profile),
    proteinTargetGrams: targets.protein_g,
    carbTargetGrams: targets.carbs_g,
    fatTargetGrams: targets.fat_g,
  };
}

export function applyEatingStyleOverrides(
  profile: UserProfile,
  base: Omit<MacroTargets, 'calories'>
): MacroTargets {
  const targetCalories = calculateCalorieTarget(profile);
  let protein_g = Math.round(base.protein_g);
  let fat_g = Math.max(0, Math.round(base.fat_g));

  const proteinCalories = protein_g * 4;
  const minimumFatCalories = fat_g * 9;

  let carbs_g = Math.max(0, Math.round((targetCalories - proteinCalories - minimumFatCalories) / 4));

  if (profile.eatingStyle === 'keto') {
    carbs_g = Math.min(30, Math.max(20, carbs_g > 0 ? carbs_g : 30));
    fat_g = Math.max(fat_g, Math.round((targetCalories - protein_g * 4 - carbs_g * 4) / 9));
  }

  if (profile.eatingStyle === 'carnivore') {
    carbs_g = 5;
    fat_g = Math.max(fat_g, Math.round((targetCalories - protein_g * 4 - carbs_g * 4) / 9));
  }

  if (carbs_g < 0) carbs_g = 0;
  if (fat_g < 0) fat_g = 0;

  const calories = protein_g * 4 + carbs_g * 4 + fat_g * 9;
  const targets = { calories, protein_g, carbs_g, fat_g };
  return {
    ...targets,
    calculationDetails: buildCalculationDetails(profile, targets),
  };
}

export function calculateMacros(profile: UserProfile): MacroTargets {
  const protein_g = calculateProteinTarget(profile);
  const fat_g = calculateFatTarget(profile);
  return applyEatingStyleOverrides(profile, { protein_g, fat_g, carbs_g: 0 });
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
  return getTodayDateKey();
}
