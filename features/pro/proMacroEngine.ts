import { MacroTargets } from '../../types';
import { ProDayType, ProHealthSignals, ProMacroAdjustment } from './types';

const MAX_CAL_ADJUSTMENT_PCT = 0.14;
const MAX_CARB_ADJUSTMENT_G = 55;

export function inferProDayType(signals: ProHealthSignals | null): ProDayType {
  if (!signals) return 'rest_day';
  if (signals.workoutMinutes >= 35) return 'workout_day';
  if (signals.activeEnergyKcal >= 700 || signals.steps >= 12000) return 'high_activity_day';
  return 'rest_day';
}

export function applyProAdjustments(
  baseTargets: MacroTargets,
  signals: ProHealthSignals | null
): ProMacroAdjustment {
  const dayType = inferProDayType(signals);
  if (!signals) {
    return {
      targets: baseTargets,
      reason: 'No health signals available. Using core macro targets.',
      inferredDayType: dayType,
    };
  }

  const activityDeltaPct = Math.max(-0.2, Math.min(0.3, (signals.activeEnergyKcal - 500) / 1000));
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

