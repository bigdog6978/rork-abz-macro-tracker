import { MacroTargets } from '../../types';
import {
  AthleteCycleDerivedState,
  AthleteProfile,
  ProDayType,
  ProDayTypeOverride,
  ProHealthSignals,
  ProMacroAdjustment,
} from './types';

const MAX_CAL_ADJUSTMENT_PCT = 0.14;
const MAX_CARB_ADJUSTMENT_G = 55;

/** Translate a manual override to a concrete day type; 'auto' defers to signals. */
function dayTypeFromOverride(override?: ProDayTypeOverride): ProDayType | null {
  switch (override) {
    case 'training':
    case 'competition':
      return 'workout_day';
    case 'rest':
      return 'rest_day';
    case 'auto':
    case undefined:
    default:
      return null;
  }
}

export function inferProDayType(
  signals: ProHealthSignals | null,
  override?: ProDayTypeOverride
): ProDayType {
  const forced = dayTypeFromOverride(override);
  if (forced) return forced;
  if (!signals) return 'rest_day';
  if (signals.workoutCount >= 1 || signals.workoutMinutes >= 35) return 'workout_day';
  if (signals.activeEnergyKcal >= 700 || signals.steps >= 12000) return 'high_activity_day';
  return 'rest_day';
}

export function applyProAdjustments(
  baseTargets: MacroTargets,
  signals: ProHealthSignals | null,
  override?: ProDayTypeOverride
): ProMacroAdjustment {
  const dayType = inferProDayType(signals, override);
  if (!signals) {
    return {
      targets: baseTargets,
      reason: 'No health signals available. Using core macro targets.',
      inferredDayType: dayType,
    };
  }

  let activityDeltaPct = Math.max(-0.2, Math.min(0.3, (signals.activeEnergyKcal - 500) / 1000));
  // A manual override nudges fueling even when same-day signals are quiet.
  if (override === 'competition') activityDeltaPct = Math.max(activityDeltaPct, 0.12);
  else if (override === 'training') activityDeltaPct = Math.max(activityDeltaPct, 0.06);
  else if (override === 'rest') activityDeltaPct = Math.min(activityDeltaPct, 0);
  const calorieDelta = Math.round(
    Math.max(
      -baseTargets.calories * MAX_CAL_ADJUSTMENT_PCT,
      Math.min(baseTargets.calories * MAX_CAL_ADJUSTMENT_PCT, baseTargets.calories * activityDeltaPct)
    )
  );
  const carbsDelta = Math.round(
    Math.max(-MAX_CARB_ADJUSTMENT_G, Math.min(MAX_CARB_ADJUSTMENT_G, activityDeltaPct * 190))
  );

  const nextProtein = Math.max(baseTargets.protein_g, Math.round(baseTargets.protein_g));
  const nextCarbs = Math.max(0, baseTargets.carbs_g + carbsDelta);
  const targetCalories = Math.max(1200, baseTargets.calories + calorieDelta);
  const fatCalories = Math.max(0, targetCalories - nextProtein * 4 - nextCarbs * 4);
  const nextFat = Math.max(20, Math.round(fatCalories / 9));
  const finalCalories = nextProtein * 4 + nextCarbs * 4 + nextFat * 9;

  const direction = calorieDelta === 0 ? 'matched' : calorieDelta > 0 ? 'increased' : 'reduced';
  const reason = `Activity ${direction} vs baseline (${Math.round(activityDeltaPct * 100)}%); carbs adjusted by ${carbsDelta}g.`;

  return {
    targets: {
      calories: finalCalories,
      protein_g: nextProtein,
      carbs_g: nextCarbs,
      fat_g: nextFat,
      calculationDetails: baseTargets.calculationDetails,
    },
    reason,
    inferredDayType: dayType,
  };
}

export function getHydrationTargetMl(baseTargets: MacroTargets, signals: ProHealthSignals | null): number {
  const baseline = 2400;
  const activityBoost = signals ? Math.round(Math.max(0, signals.workoutMinutes * 8 + signals.activeEnergyKcal * 0.35)) : 0;
  const calorieFactor = Math.round(Math.max(0, (baseTargets.calories - 1800) * 0.25));
  return Math.max(1800, Math.min(5200, baseline + activityBoost + calorieFactor));
}

function getAthleteSessionLoad(athlete: AthleteProfile): number {
  return athlete.schedule.reduce((sum, entry) => {
    const sessionWeight =
      entry.sessionType === 'game' ? 1.25 : entry.sessionType === 'training' ? 1.1 : entry.sessionType === 'practice' ? 1 : 0.5;
    const intensityWeight = entry.intensity === 'high' ? 1.3 : entry.intensity === 'moderate' ? 1 : 0.7;
    return sum + (entry.durationMin / 60) * sessionWeight * intensityWeight;
  }, 0);
}

export function applyAthleteAdjustments(
  baseTargets: MacroTargets,
  proAdjusted: ProMacroAdjustment,
  athlete: AthleteProfile,
  cycle: AthleteCycleDerivedState | null
): ProMacroAdjustment {
  const load = getAthleteSessionLoad(athlete);
  const seasonFactor =
    athlete.season.phase === 'preseason' ? 1.06 : athlete.season.phase === 'in_season' ? 1.03 : 0.97;
  const loadFactor = Math.max(0.9, Math.min(1.2, 1 + load / 40));
  const cycleHydrationBoost =
    cycle && cycle.currentPhase === 'menstrual' ? 180 : cycle && cycle.currentPhase === 'luteal' ? 120 : 0;
  const cycleFuelBoost = cycle && cycle.phaseConfidence !== 'low' && cycle.currentPhase === 'luteal' ? 0.02 : 0;

  const calorieMultiplier = seasonFactor * loadFactor * (1 + cycleFuelBoost);
  const nextCalories = Math.max(1400, Math.round(proAdjusted.targets.calories * calorieMultiplier));
  const carbDelta = Math.round((nextCalories - proAdjusted.targets.calories) / 6);
  const protein = Math.max(proAdjusted.targets.protein_g, Math.round(proAdjusted.targets.protein_g * 1.04));
  const carbs = Math.max(0, proAdjusted.targets.carbs_g + carbDelta);
  const fatCalories = Math.max(0, nextCalories - protein * 4 - carbs * 4);
  const fat = Math.max(25, Math.round(fatCalories / 9));
  const finalCalories = protein * 4 + carbs * 4 + fat * 9;

  const fuelingStrategy =
    athlete.season.phase === 'in_season'
      ? 'Competition fueling windows prioritized (T-24 / T-4 / post-session).'
      : athlete.season.phase === 'preseason'
        ? 'Training build block fueling emphasis with higher carb timing around sessions.'
        : 'Off-season recovery and consistency emphasis.';

  const explainability = [
    `Athlete schedule load score: ${load.toFixed(1)}`,
    `Season context: ${athlete.season.phase.replace('_', '-')}`,
    cycle ? `Cycle phase influence: ${cycle.currentPhase} (${cycle.phaseConfidence})` : 'Cycle phase influence: not enabled',
  ];

  return {
    targets: {
      calories: finalCalories,
      protein_g: protein,
      carbs_g: carbs,
      fat_g: fat,
      calculationDetails: baseTargets.calculationDetails,
    },
    reason:
      `Athlete layer applied using schedule + season` +
      (cycle ? ' + female athlete cycle-aware hooks' : '') +
      '.',
    inferredDayType: proAdjusted.inferredDayType,
    tierApplied: 'athlete',
    explainability,
    adjustmentConfidence: cycle?.phaseConfidence === 'low' ? 'medium' : 'high',
    fuelingStrategy,
  };
}

export function getAthleteHydrationTargetMl(
  baseTargets: MacroTargets,
  signals: ProHealthSignals | null,
  athlete: AthleteProfile,
  cycle: AthleteCycleDerivedState | null
): number {
  const base = getHydrationTargetMl(baseTargets, signals);
  const loadBoost = Math.round(getAthleteSessionLoad(athlete) * 45);
  const cycleBoost = cycle?.currentPhase === 'menstrual' ? 180 : cycle?.currentPhase === 'luteal' ? 120 : 0;
  return Math.max(2000, Math.min(5800, base + loadBoost + cycleBoost));
}

