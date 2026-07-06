/**
 * Headless component (mounted in the root layout, like PhysiqWatchSync) that
 * keeps scheduled local reminders consistent with today's state:
 * - re-syncs (debounced) whenever protein/log/hydration state changes, so a
 *   log that closes the protein gap cancels tonight's nudge;
 * - re-syncs on app-background, the last reliable moment before the user
 *   walks away.
 */

import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useDailyLog } from '../providers/DailyLogProvider';
import { usePro } from '../providers/ProProvider';
import { useDashboardTargets } from '../hooks/useDashboardTargets';
import { getReminderSettings } from '../storage/reminderSettingsRepo';
import { configureNotificationHandler, syncReminders } from '../services/reminders';
import type { ReminderPlanInputs } from '../features/reminders/reminderPlan';

const SYNC_DEBOUNCE_MS = 2_000;
export const REMINDER_SETTINGS_QUERY_KEY = ['reminder_settings'] as const;

export default function RemindersSync() {
  const { todayEntries, todayTotals } = useDailyLog();
  const { targets } = useDashboardTargets();
  const { hydration, settings: proSettings } = usePro();
  const settingsQuery = useQuery({
    queryKey: REMINDER_SETTINGS_QUERY_KEY,
    queryFn: getReminderSettings,
  });
  const reminderSettings = settingsQuery.data;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    configureNotificationHandler();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' || !reminderSettings) return;

    const buildInputs = (): ReminderPlanInputs => ({
      settings: reminderSettings,
      now: new Date(),
      proteinRemainingG: Math.max(targets.protein_g - todayTotals.protein_g, 0),
      entriesLoggedToday: todayEntries.length,
      hydrationTrackingEnabled: proSettings.hydrationEnabled,
      hydrationConsumedMl: hydration.consumedMl,
      hydrationTargetMl: hydration.targetMl,
    });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void syncReminders(buildInputs());
    }, SYNC_DEBOUNCE_MS);

    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'background') return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      void syncReminders(buildInputs());
    });

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      sub.remove();
    };
  }, [
    reminderSettings,
    targets.protein_g,
    todayTotals.protein_g,
    todayEntries.length,
    proSettings.hydrationEnabled,
    hydration.consumedMl,
    hydration.targetMl,
  ]);

  return null;
}
