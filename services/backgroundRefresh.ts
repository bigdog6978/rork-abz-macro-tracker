/**
 * Periodic background refresh (iOS BGTaskScheduler via expo-background-task):
 * re-reads HealthKit signals and pushes a fresh dashboard-aligned snapshot to
 * the watch WITHOUT the app being opened — so watch pages and complications
 * don't show last night's numbers all morning.
 *
 * Runs opportunistically (iOS decides; minimum interval below is a floor,
 * not a schedule). All data access is repo-level — no React. Target math is
 * shared with ProProvider via features/pro/computeDynamicState.ts and payload
 * shape via features/pro/buildWatchSnapshot.ts, so background snapshots are
 * byte-identical to foreground ones.
 */

import { Platform } from 'react-native';
import * as BackgroundTask from 'expo-background-task';
import * as TaskManager from 'expo-task-manager';
import { sendProSnapshotToWatch } from 'physiq-watch-connectivity';
import { MacroTargets } from '../types';
import { calculateMacros } from '../utils/macroEngine';
import { normalizeStoredProfile, LegacyUserProfile } from '../utils/profileNormalization';
import { loadData, STORAGE_KEYS } from './storage';
import { readTodayHealthSignals } from './healthkit';
import {
  deriveAthleteCycleState,
  getAthleteCycleLogs,
  getAthleteCycleProfile,
  getAthleteProfile,
  getLatestProHealthSignals,
  getProHydrationLog,
  getProSettings,
  saveLatestProHealthSignals,
} from '../storage/proRepo';
import * as dailyLogRepo from '../storage/dailyLogRepo';
import { computeStreak } from '../storage/dailyLogMigration';
import {
  computeDynamicState,
  computeHydrationLogState,
  computeHydrationTargetMl,
} from '../features/pro/computeDynamicState';
import { buildWatchSnapshotPayload } from '../features/pro/buildWatchSnapshot';
import { defaultHydrationUnit } from '../utils/hydration';
import { getTodayDateKey } from '../utils/dateKey';
import { getAccentTheme } from '../storage/userSettingsRepo';
import { ACCENT_THEMES } from '../theme/accentThemes';
import Colors from '../constants/colors';
import type { ProHydrationLog } from '../features/pro/types';

export const BACKGROUND_REFRESH_TASK = 'physiq-background-refresh';

/** Floor in minutes; iOS schedules opportunistically above this. */
const MINIMUM_INTERVAL_MINUTES = 30;

const emptyHydration: ProHydrationLog = {
  dateKey: '',
  consumedMl: 0,
  targetMl: 2400,
  lastUpdatedAt: '',
};

function sumTotals(entries: { calories: number; protein_g: number; carbs_g: number; fat_g: number }[]): MacroTargets {
  return entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein_g: acc.protein_g + e.protein_g,
      carbs_g: acc.carbs_g + e.carbs_g,
      fat_g: acc.fat_g + e.fat_g,
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

/** Exposed for direct invocation in tests and dev tooling. */
export async function runBackgroundRefresh(): Promise<void> {
  if (Platform.OS !== 'ios') return;

  const storedProfile = await loadData<LegacyUserProfile>(STORAGE_KEYS.USER_PROFILE);
  const profile = normalizeStoredProfile(storedProfile);
  if (!profile.onboardingComplete) return;

  const customMacros = await loadData<MacroTargets>(STORAGE_KEYS.CUSTOM_MACRO_TARGETS);
  const baseMacros = customMacros ?? calculateMacros(profile);

  const settings = await getProSettings();

  // Fresh HealthKit read is the whole point of the background wake; persist
  // it so the app opens with current signals too.
  let healthSignals = await getLatestProHealthSignals();
  if (settings.healthIntegrationEnabled) {
    try {
      const live = await readTodayHealthSignals();
      if (live) {
        await saveLatestProHealthSignals(live);
        healthSignals = live;
      }
    } catch (error) {
      console.warn('[BackgroundRefresh] health read failed', error);
    }
  }

  const athleteProfile = await getAthleteProfile();
  const cycleProfile = await getAthleteCycleProfile();
  const cycleDerived = cycleProfile.enabled
    ? deriveAthleteCycleState(cycleProfile, await getAthleteCycleLogs())
    : null;

  const dynamic = computeDynamicState(baseMacros, settings, healthSignals, athleteProfile, cycleDerived);
  const targets = settings.dynamicMacrosEnabled ? dynamic.targets : baseMacros;

  const logs = await dailyLogRepo.loadAllLogs();
  const today = getTodayDateKey();
  const totals = sumTotals(logs[today] ?? []);
  const streak = computeStreak(logs);

  const hydrationBase = (await getProHydrationLog()) ?? emptyHydration;
  const hydrationTarget = computeHydrationTargetMl(
    settings,
    athleteProfile,
    dynamic.targets,
    healthSignals,
    cycleDerived
  );
  const hydration = computeHydrationLogState(hydrationBase, today, hydrationTarget);
  const hydrationUnit = settings.hydrationUnit ?? defaultHydrationUnit(profile.measurementSystem);

  const accentTheme = await getAccentTheme().catch(() => null);
  const primaryHex = (accentTheme && ACCENT_THEMES[accentTheme]?.primary) || Colors.primary;

  const payload = buildWatchSnapshotPayload({
    profile,
    targets,
    totals,
    streak,
    hydrationConsumedMl: hydration.consumedMl,
    hydrationTargetMl: hydration.targetMl,
    hydrationUnit,
    primaryHex,
    athleteProfile,
    settings,
    inferredDayType: dynamic.inferredDayType,
    healthSignals,
    healthConnected: settings.healthIntegrationEnabled,
    voiceMealFeedback: '',
  });

  await sendProSnapshotToWatch({ ...payload, updatedAt: new Date().toISOString() });
}

// Must be defined at module scope so the task exists when iOS wakes the app
// headlessly. Import this module from the root layout.
TaskManager.defineTask(BACKGROUND_REFRESH_TASK, async () => {
  try {
    await runBackgroundRefresh();
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch (error) {
    console.warn('[BackgroundRefresh] task failed', error);
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundRefresh(): Promise<void> {
  if (Platform.OS !== 'ios') return;
  try {
    const status = await BackgroundTask.getStatusAsync();
    if (status !== BackgroundTask.BackgroundTaskStatus.Available) {
      if (__DEV__) console.log('[BackgroundRefresh] unavailable:', status);
      return;
    }
    await BackgroundTask.registerTaskAsync(BACKGROUND_REFRESH_TASK, {
      minimumInterval: MINIMUM_INTERVAL_MINUTES,
    });
  } catch (error) {
    // Registration failure must never break app startup (e.g. Expo Go).
    console.warn('[BackgroundRefresh] register failed', error);
  }
}
