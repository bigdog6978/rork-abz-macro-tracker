import { Goal } from '../../types';

export type GoalTargetMetric = 'weight_lb' | 'bodyfat_pct' | 'waist_in' | 'lean_mass_lb';
export type GoalTargetDirection = 'lose' | 'gain' | 'maintain';

export interface GoalTarget {
  metric: GoalTargetMetric;
  direction: GoalTargetDirection;
  amount: number;
  baselineValue?: number;
  startDateKey: string;
  deadlineDateKey?: string | null;
}

export interface GoalSettings {
  goalType: Goal;
  target?: GoalTarget;
  updatedAt: number;
}

export const GOAL_TARGET_METRIC_LABELS: Record<GoalTargetMetric, string> = {
  weight_lb: 'Weight (lb)',
  bodyfat_pct: 'Body Fat (%)',
  waist_in: 'Waist (in)',
  lean_mass_lb: 'Lean Mass (lb)',
};

export const GOAL_TARGET_DIRECTION_LABELS: Record<GoalTargetDirection, string> = {
  lose: 'Lose',
  gain: 'Gain',
  maintain: 'Maintain',
};
