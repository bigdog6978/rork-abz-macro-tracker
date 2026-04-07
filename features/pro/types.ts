import { MacroTargets } from '../../types';

export type ProEntitlementState =
  | 'core_active'
  | 'pro_trial_active'
  | 'pro_subscriber_active'
  | 'pro_trial_consumed';

export type ProDayType = 'workout_day' | 'high_activity_day' | 'rest_day';
export type HealthConnectionStatus =
  | 'connected'
  | 'not_connected'
  | 'denied_or_restricted'
  | 'not_available';

export interface ProSettings {
  dynamicMacrosEnabled: boolean;
  hydrationEnabled: boolean;
  healthIntegrationEnabled: boolean;
  electrolyteNudgesEnabled: boolean;
  healthPermissionStatus?: HealthConnectionStatus;
}

export interface ProHealthSignals {
  dateKey: string;
  activeEnergyKcal: number;
  steps: number;
  workoutMinutes: number;
  hrTrendDeltaPct: number;
  sleepHours: number;
}

export interface ProHydrationLog {
  dateKey: string;
  consumedMl: number;
  targetMl: number;
  lastUpdatedAt: string;
}

export interface ProMacroAdjustment {
  targets: MacroTargets;
  reason: string;
  inferredDayType: ProDayType;
}

