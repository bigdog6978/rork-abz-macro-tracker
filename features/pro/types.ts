import { MacroTargets } from '../../types';

export type ProEntitlementState = 'core' | 'unlocked';

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

export type AthleteUserType = 'casual_data_driven' | 'performance_intermediate' | 'advanced_athlete';
export type AthleteSeasonPhase = 'preseason' | 'in_season' | 'off_season';
export type AthleteSessionType = 'practice' | 'training' | 'game' | 'rest';
export type AthleteIntensity = 'low' | 'moderate' | 'high';

export interface AthleteScheduleEntry {
  id: string;
  dayOfWeek: number; // 0 Sunday ... 6 Saturday
  sessionType: AthleteSessionType;
  durationMin: number;
  intensity: AthleteIntensity;
}

export interface AthleteSeasonContext {
  phase: AthleteSeasonPhase;
  startDate?: string;
  endDate?: string;
}

export interface AthleteProfile {
  enabled: boolean;
  userType: AthleteUserType;
  sport: string;
  season: AthleteSeasonContext;
  schedule: AthleteScheduleEntry[];
}

export type MenstrualTrackingMode = 'manual' | 'health_import' | 'hybrid';
export type MenstrualBleedingLevel = 'none' | 'spotting' | 'light' | 'medium' | 'heavy';
export type MenstrualPhaseTag = 'menstrual' | 'follicular' | 'ovulatory' | 'luteal' | 'unknown';
export type MenstrualSymptom =
  | 'cramps'
  | 'fatigue'
  | 'bloating'
  | 'low_appetite'
  | 'high_appetite'
  | 'headache'
  | 'sleep_disturbance';

export interface AthleteCycleProfile {
  enabled: boolean;
  trackingMode: MenstrualTrackingMode;
  cycleLengthDays?: number;
  periodLengthDays?: number;
  lastPeriodStartDate?: string;
  symptomTrackingEnabled: boolean;
  notesEnabled: boolean;
  cycleDataConsentVersion?: string;
  cycleDataConsentGivenAt?: string;
  allowCycleDataInExports: boolean;
  allowCoachExportCycleSummary: boolean;
}

export interface AthleteCycleLogEntry {
  date: string;
  bleedingLevel?: MenstrualBleedingLevel;
  phaseTag?: MenstrualPhaseTag;
  symptoms?: MenstrualSymptom[];
  rpeAdjustment?: number;
  hydrationFlag?: 'normal' | 'elevated';
  freeTextNote?: string;
}

export interface AthleteCycleDerivedState {
  currentPhase: MenstrualPhaseTag;
  phaseConfidence: 'high' | 'medium' | 'low';
  predictedNextPhaseDate?: string;
  dataQuality: 'sufficient' | 'limited' | 'insufficient';
  lastComputedAt: string;
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
  tierApplied?: 'core' | 'pro' | 'athlete';
  explainability?: string[];
  adjustmentConfidence?: 'high' | 'medium' | 'low';
  fuelingStrategy?: string;
}

export const ATHLETE_SPORTS: string[] = [
  'Football (American)',
  'Soccer',
  'Basketball',
  'Baseball',
  'Ice Hockey',
  'Softball',
  'Volleyball',
  'Rugby',
  'Lacrosse',
  'Field Hockey',
  'Water Polo',
  'Cricket',
  'Track Sprinting',
  'Distance Running',
  'Marathon',
  'Cycling',
  'Swimming',
  'Tennis',
  'Wrestling',
  'Triathlon',
];

