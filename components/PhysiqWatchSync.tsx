import { useCallback, useEffect, useMemo, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { sendProSnapshotToWatch, subscribePhysiqWatch } from 'physiq-watch-connectivity';
import { useUser } from '../providers/UserProvider';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useThemeColors } from '../providers/ThemeProvider';
import { usePro } from '../providers/ProProvider';
import { EATING_STYLE_LABELS, DIETARY_MODIFIER_LABELS } from '../types';
import Colors from '../constants/colors';

const DAY_TYPE_LABELS: Record<string, string> = {
  workout_day: 'Workout day',
  high_activity_day: 'High activity',
  rest_day: 'Rest day',
};

/**
 * Pushes dashboard-aligned macro + hydration snapshot to watchOS via WatchConnectivity.
 * Runs for all signed-in iOS users (not Pro-gated) so the Watch mirrors the phone dashboard.
 */
export default function PhysiqWatchSync() {
  const { profile, macros } = useUser();
  const { todayTotals, todayEntries, getStreak, addEntry } = useDailyLog();
  const colors = useThemeColors();
  const {
    hydration,
    hydrationUnit,
    athleteProfile,
    dynamicTargets,
    settings,
    inferredDayType,
    healthSignals,
    healthConnectionStatus,
  } = usePro();
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const targets = settings.dynamicMacrosEnabled ? dynamicTargets : macros;

  const payload = useMemo((): Record<string, string> => {
    const caloriesRemaining = Math.max(targets.calories - todayTotals.calories, 0);
    const streak = getStreak();
    const eatingStyle = EATING_STYLE_LABELS[profile.eatingStyle] ?? 'Standard';
    const modifiers = (profile.dietModifiers ?? [])
      .map((m) => DIETARY_MODIFIER_LABELS[m])
      .filter(Boolean);
    const dietLine = [eatingStyle, ...modifiers].join(' · ');
    const round1 = (n: number) => String(Math.round(n * 10) / 10);
    const syncState = profile.onboardingComplete ? 'ready' : 'onboarding_incomplete';
    const syncMessage = profile.onboardingComplete
      ? ''
      : 'Finish onboarding on iPhone to sync macro targets.';
    const dayTypeLabel = DAY_TYPE_LABELS[inferredDayType] ?? inferredDayType;
    const healthLine = healthSignals
      ? `${Math.round(healthSignals.activeEnergyKcal)} kcal active · ${healthSignals.workoutMinutes} min training`
      : '';

    if (__DEV__ && !profile.onboardingComplete) {
      console.log('[PhysiqWatchSync] sending degraded payload: onboarding incomplete');
    }

    return {
      caloriesRemaining: String(Math.round(caloriesRemaining)),
      caloriesTarget: String(Math.round(targets.calories)),
      caloriesConsumed: String(Math.round(todayTotals.calories)),
      proteinConsumed: round1(todayTotals.protein_g),
      proteinTarget: round1(targets.protein_g),
      carbsConsumed: round1(todayTotals.carbs_g),
      carbsTarget: round1(targets.carbs_g),
      fatConsumed: round1(todayTotals.fat_g),
      fatTarget: round1(targets.fat_g),
      hydrationConsumedMl: String(Math.round(hydration.consumedMl)),
      hydrationTargetMl: String(Math.round(hydration.targetMl)),
      hydration: `${Math.round(hydration.consumedMl)}/${Math.round(hydration.targetMl)} ml`,
      hydrationUnit,
      streak: String(streak),
      firstName: profile.firstName ?? '',
      eatingStyle,
      dietLine,
      primaryHex: colors.primary,
      proteinHex: Colors.protein,
      carbsHex: Colors.carbs,
      fatHex: Colors.fat,
      tier: 'unlocked',
      athleteSport: athleteProfile.enabled ? athleteProfile.sport : '',
      syncState,
      syncMessage,
      dayType: inferredDayType,
      dayTypeLabel,
      healthConnected: healthConnectionStatus === 'connected' ? '1' : '0',
      activeEnergyKcal: healthSignals ? String(Math.round(healthSignals.activeEnergyKcal)) : '0',
      workoutMinutes: healthSignals ? String(healthSignals.workoutMinutes) : '0',
      healthLine,
    };
  }, [
    profile.firstName,
    profile.onboardingComplete,
    profile.eatingStyle,
    profile.dietModifiers,
    targets.calories,
    targets.protein_g,
    targets.carbs_g,
    targets.fat_g,
    todayTotals.calories,
    todayTotals.protein_g,
    todayTotals.carbs_g,
    todayTotals.fat_g,
    colors.primary,
    hydration.consumedMl,
    hydration.targetMl,
    hydrationUnit,
    athleteProfile.enabled,
    athleteProfile.sport,
    inferredDayType,
    healthSignals,
    healthConnectionStatus,
    getStreak,
    todayEntries.length,
  ]);

  const send = useCallback((data: Record<string, string>, attempt = 0) => {
    const withTime = { ...data, updatedAt: new Date().toISOString() };
    void sendProSnapshotToWatch(withTime).catch((err) => {
      if (__DEV__) {
        console.warn('[PhysiqWatchSync] sendProSnapshot failed', err);
      }
      if (attempt < 2) {
        retryTimer.current = setTimeout(() => send(data, attempt + 1), 1500 * (attempt + 1));
      }
    });
    if (__DEV__) {
      console.log('[PhysiqWatchSync] snapshot keys', Object.keys(withTime).sort().join(', '));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    const timer = setTimeout(() => send(payload), 400);
    return () => {
      clearTimeout(timer);
      if (retryTimer.current) clearTimeout(retryTimer.current);
    };
  }, [payload, send]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      send(payload);
    });
    return () => sub.remove();
  }, [payload, send]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = subscribePhysiqWatch('onWatchPayload', (body) => {
      const data = (body.payload as Record<string, string> | undefined) ?? {};
      if (data.action !== 'add_protein') return;
      const grams = Number.parseInt(data.grams ?? '', 10);
      if (!Number.isFinite(grams) || grams <= 0) return;
      addEntry({
        id: `watch_protein_${Date.now()}`,
        name: `Protein (+${grams}g)`,
        protein_g: grams,
        carbs_g: 0,
        fat_g: 0,
        calories: grams * 4,
        timestamp: new Date().toISOString(),
        providerId: 'manual',
        source: 'manual',
        isCustomMacros: true,
      });
    });
    return () => sub?.remove();
  }, [addEntry]);

  return null;
}
