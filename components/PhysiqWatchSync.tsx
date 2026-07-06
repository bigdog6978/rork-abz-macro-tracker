import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import { sendProSnapshotToWatch, subscribePhysiqWatch } from 'physiq-watch-connectivity';
import { useUser } from '../providers/UserProvider';
import { useDailyLog } from '../providers/DailyLogProvider';
import { useThemeColors } from '../providers/ThemeProvider';
import { usePro } from '../providers/ProProvider';
import { useDashboardTargets } from '../hooks/useDashboardTargets';
import { processVoiceMealTranscript } from '../features/food/processVoiceMealTranscript';
import * as foodService from '../features/food/foodService';
import { buildWatchSnapshotPayload } from '../features/pro/buildWatchSnapshot';
import { track } from '../services/analytics';

const VOICE_FEEDBACK_TTL_MS = 45_000;

/**
 * Pushes dashboard-aligned macro + hydration snapshot to watchOS via WatchConnectivity.
 * Runs for all signed-in iOS users (not Pro-gated) so the Watch mirrors the phone dashboard.
 */
export default function PhysiqWatchSync() {
  const { profile } = useUser();
  const { targets, source: targetSource } = useDashboardTargets();
  const { todayTotals, getStreak, addEntries } = useDailyLog();
  const colors = useThemeColors();
  const {
    hydration,
    hydrationUnit,
    athleteProfile,
    settings,
    inferredDayType,
    healthSignals,
    healthConnectionStatus,
  } = usePro();
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceProcessingRef = useRef(false);
  const [voiceMealFeedback, setVoiceMealFeedback] = useState('');
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showVoiceFeedback = useCallback((message: string) => {
    setVoiceMealFeedback(message);
    if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    feedbackTimerRef.current = setTimeout(() => setVoiceMealFeedback(''), VOICE_FEEDBACK_TTL_MS);
  }, []);

  const payload = useMemo((): Record<string, string> => {
    if (__DEV__ && !profile.onboardingComplete) {
      console.log('[PhysiqWatchSync] sending degraded payload: onboarding incomplete');
    }

    // Payload construction lives in buildWatchSnapshotPayload so the
    // background refresh task produces an identical snapshot.
    return buildWatchSnapshotPayload({
      profile,
      targets,
      totals: todayTotals,
      streak: getStreak(),
      hydrationConsumedMl: hydration.consumedMl,
      hydrationTargetMl: hydration.targetMl,
      hydrationUnit,
      primaryHex: colors.primary,
      athleteProfile,
      settings,
      inferredDayType,
      healthSignals,
      healthConnected: healthConnectionStatus === 'connected',
      voiceMealFeedback,
    });
  }, [
    profile,
    targets,
    todayTotals,
    colors.primary,
    hydration.consumedMl,
    hydration.targetMl,
    hydrationUnit,
    athleteProfile,
    inferredDayType,
    settings,
    targetSource,
    healthSignals,
    healthConnectionStatus,
    getStreak,
    voiceMealFeedback,
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
      console.log('[PhysiqWatchSync] send', {
        dayTypeOverride: data.dayTypeOverride,
        caloriesTarget: data.caloriesTarget,
        proteinTarget: data.proteinTarget,
        updatedAt: withTime.updatedAt,
      });
    }
  }, []);

  const handleWatchVoiceMeal = useCallback(
    async (transcript: string) => {
      if (voiceProcessingRef.current) return;
      voiceProcessingRef.current = true;
      showVoiceFeedback('Processing spoken meal…');

      try {
        const { result, entries, resolvedItems } = await processVoiceMealTranscript(transcript);
        if (entries.length > 0) {
          addEntries(entries);
          track('food_logged', { method: 'watch_voice', items: entries.length });
          await Promise.all(
            resolvedItems.map((item) => foodService.addToRecent(item.food, item.grams))
          );
        }
        showVoiceFeedback(result.summary);
      } catch (err) {
        if (__DEV__) {
          console.warn('[PhysiqWatchSync] voice meal failed', err);
        }
        showVoiceFeedback('Could not log meal. Open Physiq on iPhone.');
      } finally {
        voiceProcessingRef.current = false;
      }
    },
    [addEntries, showVoiceFeedback]
  );

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
      if (data.action !== 'voice_meal') return;
      const transcript = data.transcript?.trim();
      if (!transcript) {
        showVoiceFeedback('Nothing heard. Try again.');
        return;
      }
      void handleWatchVoiceMeal(transcript);
    });
    return () => {
      sub?.remove();
      if (feedbackTimerRef.current) clearTimeout(feedbackTimerRef.current);
    };
  }, [handleWatchVoiceMeal, showVoiceFeedback]);

  return null;
}
