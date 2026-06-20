import { loadData, removeData, saveData, STORAGE_KEYS } from '../services/storage';
import {
  AthleteCycleDerivedState,
  AthleteCycleLogEntry,
  AthleteCycleProfile,
  AthleteProfile,
  MenstrualPhaseTag,
  ProEntitlementState,
  ProHealthSignals,
  ProHydrationLog,
  ProSettings,
} from '../features/pro/types';
import { DEFAULT_TRIAL_STATE, ProTrialState } from '../features/pro/trial';

const DEFAULT_PRO_SETTINGS: ProSettings = {
  dynamicMacrosEnabled: true,
  hydrationEnabled: true,
  healthIntegrationEnabled: false,
  electrolyteNudgesEnabled: false,
  healthPermissionStatus: 'not_connected',
  soundEffectsEnabled: true,
};

const DEFAULT_ATHLETE_PROFILE: AthleteProfile = {
  enabled: false,
  persona: 'general',
  userType: 'performance_intermediate',
  sport: 'Soccer',
  sports: [],
  activities: [],
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
  if (!stored) return 'core';
  if (stored === 'core' || stored === 'unlocked') return stored;
  // Migrate legacy tiered/trial entitlements: any premium variant becomes a lifetime unlock.
  if (
    stored === 'pro_active' ||
    stored === 'pro_trial_active' ||
    stored === 'pro_subscriber_active' ||
    stored === 'athlete_trial_active' ||
    stored === 'athlete_subscriber_active'
  ) {
    return 'unlocked';
  }
  return 'core';
}

export async function setProEntitlement(state: ProEntitlementState): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_ENTITLEMENT, state);
}

export async function getTrialState(): Promise<ProTrialState> {
  const stored = await loadData<ProTrialState>(STORAGE_KEYS.PRO_TRIAL_STATE);
  return { ...DEFAULT_TRIAL_STATE, ...(stored ?? {}) };
}

export async function saveTrialState(state: ProTrialState): Promise<void> {
  await saveData(STORAGE_KEYS.PRO_TRIAL_STATE, state);
}

/** Starts the trial once. Idempotent: if a trial was ever started, the original start is kept. */
export async function startTrial(): Promise<ProTrialState> {
  const current = await getTrialState();
  if (current.startedAt) return current;
  const next: ProTrialState = { startedAt: new Date().toISOString(), expiryAcknowledged: false };
  await saveTrialState(next);
  return next;
}

/** Records that the user has seen the trial-ended prompt, so it is not shown again. */
export async function acknowledgeTrialExpiry(): Promise<ProTrialState> {
  const current = await getTrialState();
  const next: ProTrialState = { ...current, expiryAcknowledged: true };
  await saveTrialState(next);
  return next;
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
  const merged: AthleteProfile = { ...DEFAULT_ATHLETE_PROFILE, ...(stored ?? {}) };
  // Migration: seed multi-select `sports` from legacy single `sport` when empty.
  if ((!merged.sports || merged.sports.length === 0) && merged.sport) {
    merged.sports = [merged.sport];
  }
  if (!Array.isArray(merged.activities)) merged.activities = [];
  return merged;
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

const DAY_MS = 86400000;

/**
 * Estimate the current menstrual phase from the last period start + cycle length using a
 * standard calendar model, refined by a same-day logged tag when available.
 */
export function deriveAthleteCycleState(
  profile: AthleteCycleProfile,
  logs: AthleteCycleLogEntry[],
  now: Date = new Date()
): AthleteCycleDerivedState {
  const latest = logs[0];
  const cycleLength = clampCycleLength(profile.cycleLengthDays ?? 28);
  const periodLength = Math.max(2, Math.min(10, profile.periodLengthDays ?? 5));

  let calendarPhase: MenstrualPhaseTag = 'unknown';
  let cycleDay: number | null = null;
  let predictedNextPhaseDate: string | undefined;

  if (profile.lastPeriodStartDate) {
    const start = new Date(profile.lastPeriodStartDate);
    if (!Number.isNaN(start.getTime())) {
      const elapsed = Math.floor((now.getTime() - start.getTime()) / DAY_MS);
      cycleDay = ((elapsed % cycleLength) + cycleLength) % cycleLength; // 0-indexed day in cycle
      calendarPhase = phaseForCycleDay(cycleDay, cycleLength, periodLength);
      const nextPeriod = new Date(start.getTime() + (Math.floor(elapsed / cycleLength) + 1) * cycleLength * DAY_MS);
      predictedNextPhaseDate = nextPeriod.toISOString().slice(0, 10);
    }
  }

  // A log explicitly tagged today overrides the calendar estimate.
  const todayKey = now.toISOString().slice(0, 10);
  const todayLog = logs.find((l) => l.date === todayKey);
  const currentPhase: MenstrualPhaseTag =
    todayLog?.phaseTag && todayLog.phaseTag !== 'unknown'
      ? todayLog.phaseTag
      : calendarPhase !== 'unknown'
        ? calendarPhase
        : (latest?.phaseTag ?? 'unknown');

  const hasCalendar = Boolean(profile.lastPeriodStartDate);
  const hasLogs = logs.length >= 3;
  const symptomCount = latest?.symptoms?.length ?? 0;

  let phaseConfidence: 'high' | 'medium' | 'low' = 'low';
  if (hasCalendar && hasLogs) phaseConfidence = 'high';
  else if (hasCalendar || hasLogs || symptomCount > 0) phaseConfidence = 'medium';

  return {
    currentPhase,
    phaseConfidence,
    predictedNextPhaseDate,
    dataQuality: hasCalendar || hasLogs ? 'sufficient' : logs.length > 0 ? 'limited' : 'insufficient',
    lastComputedAt: now.toISOString(),
  };
}

function clampCycleLength(days: number): number {
  if (!Number.isFinite(days)) return 28;
  return Math.max(21, Math.min(40, Math.round(days)));
}

function phaseForCycleDay(cycleDay: number, cycleLength: number, periodLength: number): MenstrualPhaseTag {
  // Ovulation ~14 days before the next period; fertile/ovulatory window around it.
  const ovulationDay = cycleLength - 14;
  if (cycleDay < periodLength) return 'menstrual';
  if (cycleDay < ovulationDay - 1) return 'follicular';
  if (cycleDay <= ovulationDay + 1) return 'ovulatory';
  return 'luteal';
}

