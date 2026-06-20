import { MacroTargets } from '../../types';

export type ProEntitlementState = 'core' | 'unlocked';

export type ProDayType = 'workout_day' | 'high_activity_day' | 'rest_day';
export type HealthConnectionStatus =
  | 'connected'
  | 'not_connected'
  | 'denied_or_restricted'
  | 'not_available';

/** Hydration is stored in mL; this only affects how amounts are shown and entered. */
export type HydrationUnit = 'ml' | 'oz' | 'cup';

export interface ProSettings {
  dynamicMacrosEnabled: boolean;
  hydrationEnabled: boolean;
  healthIntegrationEnabled: boolean;
  electrolyteNudgesEnabled: boolean;
  healthPermissionStatus?: HealthConnectionStatus;
  /** User dismissed the one-time Apple Health education prompt. */
  healthEducationDismissed?: boolean;
  /** Preferred hydration display/input unit. Defaults from measurement system when unset. */
  hydrationUnit?: HydrationUnit;
  /** User manually overrides the inferred day type for Adaptive Targets. */
  dayTypeOverride?: ProDayTypeOverride;
  /** Play a soft click on button taps (haptics always follow system settings). */
  soundEffectsEnabled?: boolean;
}

/** Manual day-type selection; 'auto' defers to Health-inferred day type. */
export type ProDayTypeOverride = 'auto' | 'training' | 'competition' | 'rest';

export type AthleteUserType = 'casual_data_driven' | 'performance_intermediate' | 'advanced_athlete';
export type AthleteSeasonPhase = 'preseason' | 'in_season' | 'off_season';
export type AthleteSessionType = 'practice' | 'training' | 'game' | 'rest';
export type AthleteIntensity = 'low' | 'moderate' | 'high';

/** How the user relates to Training Mode, captured at onboarding. */
export type TrainingPersona = 'athlete' | 'fitness' | 'general';

/** Competitive level for athletes; experience (AthleteUserType) is derived from this. */
export type AthleteCompetitionLevel =
  | 'recreational'
  | 'high_school'
  | 'college'
  | 'amateur_club'
  | 'semi_pro'
  | 'professional'
  | 'masters';

export const COMPETITION_LEVEL_LABELS: Record<AthleteCompetitionLevel, string> = {
  recreational: 'Recreational',
  high_school: 'High School',
  college: 'College / Collegiate',
  amateur_club: 'Amateur / Club',
  semi_pro: 'Semi-pro',
  professional: 'Professional',
  masters: 'Masters / Adult league',
};

/** General fitness activities for non-athlete users. */
export type ActivityType =
  | 'weight_training'
  | 'running'
  | 'cycling'
  | 'swimming'
  | 'yoga'
  | 'pilates'
  | 'hiit'
  | 'hiking'
  | 'walking'
  | 'rowing'
  | 'climbing'
  | 'martial_arts'
  | 'dance'
  | 'team_sports_casual'
  | 'other';

export const ACTIVITY_TYPES: { id: ActivityType; label: string; icon: string }[] = [
  { id: 'weight_training', label: 'Weight training', icon: 'dumbbell' },
  { id: 'running', label: 'Running', icon: 'footprints' },
  { id: 'cycling', label: 'Cycling / Biking', icon: 'bike' },
  { id: 'swimming', label: 'Swimming', icon: 'waves' },
  { id: 'yoga', label: 'Yoga', icon: 'flower2' },
  { id: 'pilates', label: 'Pilates', icon: 'activity' },
  { id: 'hiit', label: 'HIIT / Cross-training', icon: 'zap' },
  { id: 'hiking', label: 'Hiking', icon: 'mountain' },
  { id: 'walking', label: 'Walking', icon: 'footprints' },
  { id: 'rowing', label: 'Rowing', icon: 'sailboat' },
  { id: 'climbing', label: 'Climbing', icon: 'mountain-snow' },
  { id: 'martial_arts', label: 'Martial arts', icon: 'swords' },
  { id: 'dance', label: 'Dance', icon: 'music' },
  { id: 'team_sports_casual', label: 'Team sports (casual)', icon: 'users' },
  { id: 'other', label: 'Other', icon: 'circle' },
];

/** Map a competition level to the legacy experience tier used by the macro engine. */
export function deriveAthleteUserType(level?: AthleteCompetitionLevel): AthleteUserType {
  switch (level) {
    case 'recreational':
    case undefined:
      return 'casual_data_driven';
    case 'high_school':
    case 'college':
    case 'amateur_club':
    case 'masters':
      return 'performance_intermediate';
    case 'semi_pro':
    case 'professional':
      return 'advanced_athlete';
    default:
      return 'performance_intermediate';
  }
}

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
  /** Captured at onboarding; drives whether sport/season or activities are shown. */
  persona: TrainingPersona;
  userType: AthleteUserType;
  /** When true, userType is respected as-is; otherwise it is derived from competitionLevel. */
  userTypeManualOverride?: boolean;
  /** Primary sport (kept for backward compatibility); first of `sports` when present. */
  sport: string;
  /** All selected sports for athletes. */
  sports: string[];
  competitionLevel?: AthleteCompetitionLevel;
  /** Selected activities for fitness (non-athlete) users. */
  activities: ActivityType[];
  /** Optional typical training/workout sessions per week (seeds schedule load). */
  sessionsPerWeek?: number;
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
  /** Distinct workouts logged today (HealthKit anchored query). */
  workoutCount: number;
  hrTrendDeltaPct: number;
  sleepHours: number;
  /** Average HRV (SDNN, ms) when samples exist. */
  hrvSdnnMs?: number;
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
  'Rowing/Crew',
  'Golf',
  'Gymnastics',
  'Powerlifting',
  'Olympic Weightlifting',
  'CrossFit',
  'Climbing',
  'Martial Arts/MMA',
  'General Strength',
  'General Cardio',
  'Hybrid/CrossFit',
  'Hiking/Outdoor',
];

