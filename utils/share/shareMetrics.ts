import { MeasurementRecord, ProgressTrend } from '../../features/progress/types';
import type { ShareTemplateId } from './shareConstants';

export function computeLeanMassLb(weightLb: number, bodyFatPercent: number): number {
  return weightLb * (1 - bodyFatPercent / 100);
}

export function computeLeanMassChange(
  baseline: MeasurementRecord | null,
  latest: MeasurementRecord | null
): ProgressTrend | null {
  if (
    baseline?.weightLb == null ||
    baseline.bodyFatPercent == null ||
    latest?.weightLb == null ||
    latest.bodyFatPercent == null ||
    baseline.id === latest.id
  ) {
    return null;
  }

  const baseLean = computeLeanMassLb(baseline.weightLb, baseline.bodyFatPercent);
  const latestLean = computeLeanMassLb(latest.weightLb, latest.bodyFatPercent);
  const change = latestLean - baseLean;
  const sign = change > 0 ? '+' : '';
  return {
    field: 'leanMass',
    label: 'Lean mass',
    baselineValue: baseLean,
    latestValue: latestLean,
    change,
    direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable',
    isPositive: change >= 0,
    displayValue: `${sign}${change.toFixed(1)} lb`,
  };
}

export interface PhotoStatChip {
  label: string;
  value: string;
  isPositive?: boolean;
}

export function buildPhotoStatChips(
  trends: ProgressTrend[],
  baseline: MeasurementRecord | null,
  latest: MeasurementRecord | null
): PhotoStatChip[] {
  const chips: PhotoStatChip[] = [];
  const lean = computeLeanMassChange(baseline, latest);
  const bodyFat = trends.find((t) => t.field === 'bodyFat');
  const weight = trends.find((t) => t.field === 'weight');

  if (bodyFat?.displayValue) {
    chips.push({ label: 'Body fat', value: bodyFat.displayValue, isPositive: bodyFat.isPositive });
  }
  if (weight?.displayValue) {
    chips.push({ label: 'Weight', value: weight.displayValue, isPositive: weight.isPositive });
  }
  if (lean?.displayValue) {
    chips.push({ label: lean.label, value: lean.displayValue, isPositive: lean.isPositive });
  }

  return chips.slice(0, 3);
}

export function isDailyMacrosShareable(consumed: {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}): boolean {
  return consumed.calories > 0 || consumed.protein_g > 0 || consumed.carbs_g > 0 || consumed.fat_g > 0;
}

export function pickDefaultShareTemplate(input: {
  hasDailyData: boolean;
  caloriesProgress: number;
  hasLatestPhoto: boolean;
  hasBodyProgress: boolean;
}): ShareTemplateId {
  if (input.hasDailyData && input.caloriesProgress >= 0.9) return 'daily_macros';
  if (input.hasLatestPhoto) return 'progress_photo';
  if (input.hasBodyProgress) return 'body_progress';
  if (input.hasDailyData) return 'daily_macros';
  return 'body_progress';
}
