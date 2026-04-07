import { loadData, removeData, saveData, STORAGE_KEYS } from '../services/storage';
import {
  AthleteCycleDerivedState,
  AthleteCycleLogEntry,
  AthleteCycleProfile,
  AthleteProfile,
  ProEntitlementState,
  ProHealthSignals,
  ProHydrationLog,
  ProSettings,
} from '../features/pro/types';

const DEFAULT_PRO_SETTINGS: ProSettings = {
  dynamicMacrosEnabled: true,
  hydrationEnabled: true,
  healthIntegrationEnabled: false,
  electrolyteNudgesEnabled: false,
  healthPermissionStatus: 'not_connected',
};

const DEFAULT_ATHLETE_PROFILE: AthleteProfile = {
  enabled: false,
  userType: 'performance_intermediate',
  sport: 'Soccer',
  season: { phase: 'in_season' },
  schedule: [],
};

const DEFAULT_CYCLE_PROFILE: AthleteCycleProfile = {
  enabled: false,
  trackingMode: 'manual',
  symptomTrackingEnabled: true,
  notesEnabled: true,
  allowCycleDataInExports: false,
  allowCoachExportCycleSummary: false,
};

export async function getProEntitlement(): Promise<ProEntitlementState> {
  const stored = await loadData<string>(STORAGE_KEYS.PRO_ENTITLEMENT);
  if (!stored) return 'core_active';
  if (stored === 'pro_active') return 'pro_subscriber_active';
  if (
    stored === 'core_active' ||
    stored === 'pro_trial_active' ||
    stored === 'pro_subscriber_active' ||
    stored === 'pro_trial_consumed' ||
    stored === 'athlete_trial_active' ||
    stored === 'athlete_subscriber_active' ||
    stored === 'athlete_trial_consumed'
  ) {
    return stored;
  }
  return 'core_active';
}

export async function setProEntitlement(state: ProEntitlementState): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_ENTITLEMENT, state);
}

export async function getProSettings(): Promise<ProSettings> {
  const stored = await loadData<ProSettings>(STORAGE_KEYS.PRO_SETTINGS);
  return { ...DEFAULT_PRO_SETTINGS, ...(stored ?? {}) };
}

export async function saveProSettings(settings: ProSettings): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_SETTINGS, settings);
}

export async function getLatestProHealthSignals(): Promise<ProHealthSignals | null> {
  return loadData<ProHealthSignals>(STORAGE_KEYS.PRO_HEALTH_SIGNALS);
}

export async function saveLatestProHealthSignals(signals: ProHealthSignals): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_HEALTH_SIGNALS, signals);
}

export async function getProHydrationLog(): Promise<ProHydrationLog | null> {
  return loadData<ProHydrationLog>(STORAGE_KEYS.PRO_HYDRATION_LOG);
}

export async function saveProHydrationLog(log: ProHydrationLog): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_HYDRATION_LOG, log);
}

export async function getProDynamicTargets() {
  return loadData(STORAGE_KEYS.PRO_DYNAMIC_TARGETS);
}

export async function saveProDynamicTargets(targets: unknown): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_DYNAMIC_TARGETS, targets);
}

export async function clearProDynamicTargets(): Promise<void> {
  await removeData(STORAGE_KEYS.PRO_DYNAMIC_TARGETS);
}

export async function getAthleteProfile(): Promise<AthleteProfile> {
  const stored = await loadData<AthleteProfile>(STORAGE_KEYS.ATHLETE_PROFILE);
  return { ...DEFAULT_ATHLETE_PROFILE, ...(stored ?? {}) };
}

export async function saveAthleteProfile(profile: AthleteProfile): Promise<void> {
  await saveData(STORAGE_KEYS.ATHLETE_PROFILE, profile);
}

export async function getAthleteCycleProfile(): Promise<AthleteCycleProfile> {
  const stored = await loadData<AthleteCycleProfile>(STORAGE_KEYS.ATHLETE_CYCLE_PROFILE);
  return { ...DEFAULT_CYCLE_PROFILE, ...(stored ?? {}) };
}

export async function saveAthleteCycleProfile(profile: AthleteCycleProfile): Promise<void> {
  await saveData(STORAGE_KEYS.ATHLETE_CYCLE_PROFILE, profile);
}

export async function getAthleteCycleLogs(): Promise<AthleteCycleLogEntry[]> {
  return (await loadData<AthleteCycleLogEntry[]>(STORAGE_KEYS.ATHLETE_CYCLE_LOGS)) ?? [];
}

export async function saveAthleteCycleLogs(logs: AthleteCycleLogEntry[]): Promise<void> {
  await saveData(STORAGE_KEYS.ATHLETE_CYCLE_LOGS, logs);
}

export async function appendAthleteCycleLog(log: AthleteCycleLogEntry): Promise<void> {
  const existing = await getAthleteCycleLogs();
  const next = [log, ...existing.filter((item) => item.date !== log.date)].slice(0, 90);
  await saveAthleteCycleLogs(next);
}

export async function clearAthleteCycleData(): Promise<void> {
  await removeData(STORAGE_KEYS.ATHLETE_CYCLE_PROFILE);
  await removeData(STORAGE_KEYS.ATHLETE_CYCLE_LOGS);
}

export function deriveAthleteCycleState(
  profile: AthleteCycleProfile,
  logs: AthleteCycleLogEntry[]
): AthleteCycleDerivedState {
  const now = new Date();
  const latest = logs[0];
  const symptomCount = latest?.symptoms?.length ?? 0;
  const currentPhase = latest?.phaseTag ?? 'unknown';
  const hasEnough = logs.length >= 3 || Boolean(profile.lastPeriodStartDate);
  return {
    currentPhase,
    phaseConfidence: hasEnough ? (symptomCount > 0 ? 'high' : 'medium') : 'low',
    predictedNextPhaseDate: profile.lastPeriodStartDate
      ? new Date(new Date(profile.lastPeriodStartDate).getTime() + (profile.cycleLengthDays ?? 28) * 86400000)
          .toISOString()
          .slice(0, 10)
      : undefined,
    dataQuality: hasEnough ? 'sufficient' : logs.length > 0 ? 'limited' : 'insufficient',
    lastComputedAt: now.toISOString(),
  };
}

