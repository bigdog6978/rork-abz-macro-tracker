import { Goal } from '../../types';

export interface MeasurementRecord {
  id: string;
  userId: string;
  recordedAt: string;
  /** YYYY-MM-DD in local timezone; used for deduplication and edit-by-date */
  dateKey?: string;
  bodyFatPercent?: number;
  weightLb?: number;
  dressSize?: string;
  waistIn?: number;
  chestIn?: number;
  notes?: string;
  isBaseline?: boolean;
}

export type PromptCadence = 'weekly' | 'biweekly' | 'monthly' | 'off';

export interface MeasurementPromptSettings {
  cadence: PromptCadence;
  lastPromptedAt?: string;
  lastRecordedAt?: string;
  dismissCount: number;
}

export interface ProgressTrend {
  field: string;
  label: string;
  baselineValue?: number;
  latestValue?: number;
  change?: number;
  changePercent?: number;
  direction: 'up' | 'down' | 'stable' | 'unknown';
  isPositive: boolean;
  displayValue?: string;
}

export interface GoalScore {
  overall: number;
  breakdown: Array<{
    metric: string;
    label: string;
    score: number;
    weight: number;
    insight?: string;
  }>;
  insights: string[];
}

export const CADENCE_LABELS: Record<PromptCadence, string> = {
  weekly: 'Weekly',
  biweekly: 'Every 2 Weeks',
  monthly: 'Monthly',
  off: 'Off',
};

export const CADENCE_DAYS: Record<Exclude<PromptCadence, 'off'>, number> = {
  weekly: 7,
  biweekly: 14,
  monthly: 30,
};
