import { Goal } from '../../types';
import { MeasurementRecord, MeasurementPromptSettings, GoalScore, ProgressTrend } from './types';

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

function trendScore(change: number, desiredDirection: 'down' | 'up' | 'stable', scale: number): number {
  if (desiredDirection === 'stable') {
    const deviation = Math.abs(change);
    return clamp(100 - (deviation / scale) * 100, 0, 100);
  }
  if (desiredDirection === 'down') {
    if (change <= 0) return clamp(Math.abs(change) / scale * 100, 0, 100);
    return clamp(-change / scale * 50, 0, 0);
  }
  if (change >= 0) return clamp(change / scale * 100, 0, 100);
  return 0;
}

function formatChange(val: number, unit: string, decimals: number = 1): string {
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(decimals)} ${unit}`;
}

export function computeTrends(
  baseline: MeasurementRecord | null,
  latest: MeasurementRecord | null,
  goal: Goal,
  sex: 'male' | 'female',
): ProgressTrend[] {
  const trends: ProgressTrend[] = [];
  if (!baseline || !latest || baseline.id === latest.id) return trends;

  if (baseline.weightLb != null && latest.weightLb != null) {
    const change = latest.weightLb - baseline.weightLb;
    const isPositive =
      goal === 'cut' ? change < 0 :
      goal === 'gain' ? change > 0 :
      goal === 'maintain' ? Math.abs(change) < 2 :
      true;
    trends.push({
      field: 'weight',
      label: 'Weight',
      baselineValue: baseline.weightLb,
      latestValue: latest.weightLb,
      change,
      changePercent: baseline.weightLb > 0 ? (change / baseline.weightLb) * 100 : 0,
      direction: change > 0.5 ? 'up' : change < -0.5 ? 'down' : 'stable',
      isPositive,
      displayValue: formatChange(change, 'lb'),
    });
  }

  if (baseline.waistIn != null && latest.waistIn != null) {
    const change = latest.waistIn - baseline.waistIn;
    const isPositive = goal === 'gain' ? Math.abs(change) < 1 : change <= 0;
    trends.push({
      field: 'waist',
      label: 'Waist',
      baselineValue: baseline.waistIn,
      latestValue: latest.waistIn,
      change,
      direction: change > 0.2 ? 'up' : change < -0.2 ? 'down' : 'stable',
      isPositive,
      displayValue: formatChange(change, 'in'),
    });
  }

  if (baseline.chestIn != null && latest.chestIn != null) {
    const change = latest.chestIn - baseline.chestIn;
    const isPositive =
      goal === 'gain' || goal === 'recompose' ? change >= 0 :
      goal === 'cut' ? Math.abs(change) < 1 :
      true;
    trends.push({
      field: 'chest',
      label: 'Chest',
      baselineValue: baseline.chestIn,
      latestValue: latest.chestIn,
      change,
      direction: change > 0.2 ? 'up' : change < -0.2 ? 'down' : 'stable',
      isPositive,
      displayValue: formatChange(change, 'in'),
    });
  }

  if (baseline.bodyFatPercent != null && latest.bodyFatPercent != null) {
    const change = latest.bodyFatPercent - baseline.bodyFatPercent;
    const isPositive =
      goal === 'cut' || goal === 'recompose' ? change <= 0 :
      goal === 'maintain' ? Math.abs(change) < 1 :
      true;
    trends.push({
      field: 'bodyFat',
      label: 'Body Fat',
      baselineValue: baseline.bodyFatPercent,
      latestValue: latest.bodyFatPercent,
      change,
      direction: change > 0.3 ? 'up' : change < -0.3 ? 'down' : 'stable',
      isPositive,
      displayValue: formatChange(change, '%'),
    });
  }

  if (sex === 'female' && baseline.dressSize != null && latest.dressSize != null) {
    const bVal = parseFloat(baseline.dressSize) || 0;
    const lVal = parseFloat(latest.dressSize) || 0;
    if (bVal > 0 && lVal > 0) {
      const change = lVal - bVal;
      trends.push({
        field: 'dressSize',
        label: 'Dress Size',
        baselineValue: bVal,
        latestValue: lVal,
        change,
        direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable',
        isPositive: goal === 'cut' ? change <= 0 : goal === 'maintain' ? Math.abs(change) < 1 : true,
        displayValue: change === 0 ? 'No change' : `${change > 0 ? '+' : ''}${change} size${Math.abs(change) !== 1 ? 's' : ''}`,
      });
    }
  }

  return trends;
}

export function computeGoalScore(
  baseline: MeasurementRecord | null,
  latest: MeasurementRecord | null,
  goal: Goal,
  sex: 'male' | 'female',
  recordCount: number,
): GoalScore {
  const result: GoalScore = { overall: 0, breakdown: [], insights: [] };
  if (!baseline || !latest || baseline.id === latest.id) {
    result.insights.push('Add more measurements to see your progress score.');
    return result;
  }

  const hasWaist = baseline.waistIn != null && latest.waistIn != null;
  const hasChest = baseline.chestIn != null && latest.chestIn != null;
  const hasBf = baseline.bodyFatPercent != null && latest.bodyFatPercent != null;
  const hasWeight = baseline.weightLb != null && latest.weightLb != null;

  const waistChange = hasWaist ? (latest.waistIn! - baseline.waistIn!) : 0;
  const chestChange = hasChest ? (latest.chestIn! - baseline.chestIn!) : 0;
  const bfChange = hasBf ? (latest.bodyFatPercent! - baseline.bodyFatPercent!) : 0;
  const weightChange = hasWeight ? (latest.weightLb! - baseline.weightLb!) : 0;

  if (goal === 'cut') {
    let weights = { waist: 0.60, bf: 0.25, weight: 0.15 };
    if (!hasWaist && !hasBf) {
      weights = { waist: 0, bf: 0, weight: 1.0 };
    } else if (!hasWaist) {
      weights = { waist: 0, bf: 0.65, weight: 0.35 };
    } else if (!hasBf) {
      weights = { waist: 0.75, bf: 0, weight: 0.25 };
    }

    if (hasWaist && weights.waist > 0) {
      const s = trendScore(waistChange, 'down', 3);
      result.breakdown.push({ metric: 'waist', label: 'Waist', score: s, weight: weights.waist, insight: `Waist ${formatChange(waistChange, 'in')} since baseline` });
    }
    if (hasBf && weights.bf > 0) {
      const s = trendScore(bfChange, 'down', 5);
      result.breakdown.push({ metric: 'bodyFat', label: 'Body Fat', score: s, weight: weights.bf, insight: `Body fat ${formatChange(bfChange, '%')} since baseline` });
    }
    if (hasWeight && weights.weight > 0) {
      const s = trendScore(weightChange, 'down', 10);
      result.breakdown.push({ metric: 'weight', label: 'Weight', score: s, weight: weights.weight, insight: `Weight ${formatChange(weightChange, 'lb')} since baseline` });
    }
  } else if (goal === 'recompose') {
    let weights = { waist: 0.50, chest: 0.20, bf: 0.30 };
    if (!hasWaist) weights = { waist: 0, chest: 0.40, bf: 0.60 };
    if (!hasBf) weights = { waist: 0.60, chest: 0.40, bf: 0 };
    if (!hasWaist && !hasBf) weights = { waist: 0, chest: 0.50, bf: 0 };
    if (!hasChest && !hasBf) weights = { waist: 1.0, chest: 0, bf: 0 };
    if (!hasWaist && !hasChest && !hasBf) {
      if (hasWeight) {
        result.breakdown.push({ metric: 'weight', label: 'Weight Stability', score: trendScore(weightChange, 'stable', 5), weight: 1.0 });
      }
    } else {
      if (hasWaist && weights.waist > 0) {
        const s = trendScore(waistChange, 'down', 3);
        result.breakdown.push({ metric: 'waist', label: 'Waist', score: s, weight: weights.waist, insight: `Waist ${formatChange(waistChange, 'in')}` });
      }
      if (hasChest && weights.chest > 0) {
        const s = trendScore(chestChange, 'up', 2);
        result.breakdown.push({ metric: 'chest', label: 'Chest', score: s, weight: weights.chest, insight: `Chest ${formatChange(chestChange, 'in')}` });
      }
      if (hasBf && weights.bf > 0) {
        const s = trendScore(bfChange, 'down', 5);
        result.breakdown.push({ metric: 'bodyFat', label: 'Body Fat', score: s, weight: weights.bf, insight: `Body fat ${formatChange(bfChange, '%')}` });
      }
    }
  } else if (goal === 'gain') {
    let weights = { chest: 0.50, weight: 0.30, waistStability: 0.20 };
    if (!hasChest) weights = { chest: 0, weight: 0.60, waistStability: 0.40 };
    if (!hasWaist) weights = { chest: 0.65, weight: 0.35, waistStability: 0 };
    if (!hasChest && !hasWaist) weights = { chest: 0, weight: 1.0, waistStability: 0 };

    if (hasChest && weights.chest > 0) {
      const s = trendScore(chestChange, 'up', 2);
      result.breakdown.push({ metric: 'chest', label: 'Chest', score: s, weight: weights.chest, insight: `Chest ${formatChange(chestChange, 'in')}` });
    }
    if (hasWeight && weights.weight > 0) {
      const s = trendScore(weightChange, 'up', 10);
      result.breakdown.push({ metric: 'weight', label: 'Weight', score: s, weight: weights.weight, insight: `Weight ${formatChange(weightChange, 'lb')}` });
    }
    if (hasWaist && weights.waistStability > 0) {
      const s = trendScore(waistChange, 'stable', 2);
      result.breakdown.push({ metric: 'waistStability', label: 'Waist Control', score: s, weight: weights.waistStability, insight: waistChange > 1 ? 'Waist increasing — watch calorie surplus' : 'Waist stable — clean gains' });
    }
  } else {
    let weights = { waist: 0.40, weight: 0.30, consistency: 0.30 };
    if (!hasWaist) weights = { waist: 0, weight: 0.50, consistency: 0.50 };

    if (hasWaist && weights.waist > 0) {
      const s = trendScore(waistChange, 'stable', 1.5);
      result.breakdown.push({ metric: 'waist', label: 'Waist Stability', score: s, weight: weights.waist });
    }
    if (hasWeight && weights.weight > 0) {
      const s = trendScore(weightChange, 'stable', 5);
      result.breakdown.push({ metric: 'weight', label: 'Weight Stability', score: s, weight: weights.weight });
    }
    const consistencyScore = clamp(recordCount * 20, 0, 100);
    result.breakdown.push({ metric: 'consistency', label: 'Consistency', score: consistencyScore, weight: weights.consistency, insight: `${recordCount} measurement${recordCount !== 1 ? 's' : ''} recorded` });
  }

  if (result.breakdown.length > 0) {
    const totalWeight = result.breakdown.reduce((sum, b) => sum + b.weight, 0);
    result.overall = Math.round(
      result.breakdown.reduce((sum, b) => sum + b.score * (b.weight / totalWeight), 0)
    );
  }

  result.breakdown.forEach((b) => {
    if (b.insight) result.insights.push(b.insight);
  });

  return result;
}

export function shouldShowPrompt(
  settings: MeasurementPromptSettings | null,
  hasBaseline: boolean,
  onboardingDate?: string,
): boolean {
  if (!settings || settings.cadence === 'off') return false;

  const now = Date.now();

  if (!hasBaseline) {
    if (!onboardingDate) return false;
    const onboardTs = new Date(onboardingDate).getTime();
    const daysSinceOnboarding = (now - onboardTs) / (1000 * 60 * 60 * 24);
    return daysSinceOnboarding >= 3;
  }

  const cadenceDays = settings.cadence === 'weekly' ? 7 : settings.cadence === 'biweekly' ? 14 : 30;

  const lastRecordTs = settings.lastRecordedAt ? new Date(settings.lastRecordedAt).getTime() : 0;
  const daysSinceRecord = lastRecordTs > 0 ? (now - lastRecordTs) / (1000 * 60 * 60 * 24) : 999;

  if (lastRecordTs === 0) {
    return daysSinceRecord >= 7;
  }

  return daysSinceRecord >= cadenceDays;
}
