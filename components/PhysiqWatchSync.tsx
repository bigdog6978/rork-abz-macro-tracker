import { useCallback, useEffect, useMemo } from 'react';
import { AppState, Platform } from 'react-native';
import { sendProSnapshotToWatch } from 'physiq-watch-connectivity';
import { useUser } from '../providers/UserProvider';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useThemeColors } from '../providers/ThemeProvider';
import { usePro } from '../providers/ProProvider';
import { EATING_STYLE_LABELS, DIETARY_MODIFIER_LABELS } from '../types';
import Colors from '../constants/colors';

/**
 * Pushes dashboard-aligned macro + hydration snapshot to watchOS via WatchConnectivity.
 * Runs for all signed-in iOS users (not Pro-gated) so the Watch mirrors the phone dashboard.
 */
export default function PhysiqWatchSync() {
  const { profile, macros } = useUser();
  const { todayTotals, todayEntries, getStreak } = useDailyLog();
  const colors = useThemeColors();
  const { hydration, tierLabel, hasAthleteAccess, athleteProfile } = usePro();

  const payload = useMemo((): Record<string, string> => {
    const caloriesRemaining = Math.max(macros.calories - todayTotals.calories, 0);
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

    if (__DEV__ && !profile.onboardingComplete) {
      console.log('[PhysiqWatchSync] sending degraded payload: onboarding incomplete');
    }
    if (__DEV__ && !profile.firstName) {
      console.log('[PhysiqWatchSync] payload has empty firstName');
    }

    return {
      caloriesRemaining: String(Math.round(caloriesRemaining)),
      caloriesTarget: String(Math.round(macros.calories)),
      caloriesConsumed: String(Math.round(todayTotals.calories)),
      proteinConsumed: round1(todayTotals.protein_g),
      proteinTarget: round1(macros.protein_g),
      carbsConsumed: round1(todayTotals.carbs_g),
      carbsTarget: round1(macros.carbs_g),
      fatConsumed: round1(todayTotals.fat_g),
      fatTarget: round1(macros.fat_g),
      hydrationConsumedMl: String(Math.round(hydration.consumedMl)),
      hydrationTargetMl: String(Math.round(hydration.targetMl)),
      hydration: `${Math.round(hydration.consumedMl)}/${Math.round(hydration.targetMl)} ml`,
      streak: String(streak),
      firstName: profile.firstName ?? '',
      eatingStyle,
      dietLine,
      primaryHex: colors.primary,
      proteinHex: Colors.protein,
      carbsHex: Colors.carbs,
      fatHex: Colors.fat,
      tier: tierLabel,
      athleteSport: hasAthleteAccess ? athleteProfile.sport : '',
      syncState,
      syncMessage,
    };
  }, [
    profile.firstName,
    profile.onboardingComplete,
    profile.eatingStyle,
    profile.dietModifiers,
    macros.calories,
    macros.protein_g,
    macros.carbs_g,
    macros.fat_g,
    todayTotals.calories,
    todayTotals.protein_g,
    todayTotals.carbs_g,
    todayTotals.fat_g,
    colors.primary,
    hydration.consumedMl,
    hydration.targetMl,
    tierLabel,
    hasAthleteAccess,
    athleteProfile.sport,
    getStreak,
    todayEntries.length,
  ]);

  const send = useCallback((data: Record<string, string>) => {
    const withTime = { ...data, updatedAt: new Date().toISOString() };
    void sendProSnapshotToWatch(withTime).catch((err) => {
      if (__DEV__) {
        console.warn('[PhysiqWatchSync] sendProSnapshot failed', err);
      }
    });
    if (__DEV__) {
      console.log('[PhysiqWatchSync] snapshot keys', Object.keys(withTime).sort().join(', '));
    }
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;

    send(payload);
    const timers = [400, 1200, 2500].map((ms) => setTimeout(() => send(payload), ms));
    return () => timers.forEach(clearTimeout);
  }, [payload, send]);

  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      send(payload);
    });
    return () => sub.remove();
  }, [payload, send]);

  return null;
}
