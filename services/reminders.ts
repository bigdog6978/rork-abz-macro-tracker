/**
 * Local reminder scheduling (expo-notifications). Applies the pure plan from
 * features/reminders/reminderPlan.ts: cancels every physiq-reminder-* that
 * should no longer exist and schedules the ones that should.
 *
 * Local-only — no push server, no remote tokens. Safe no-op on web and when
 * permission is not granted.
 */

import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import {
  PlannedReminder,
  REMINDER_ID_PREFIX,
  ReminderPlanInputs,
  planReminders,
} from '../features/reminders/reminderPlan';

let handlerConfigured = false;

/** Show reminders as banners while the app is foregrounded too. */
export function configureNotificationHandler(): void {
  if (handlerConfigured || Platform.OS === 'web') return;
  handlerConfigured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

export async function getNotificationPermissionStatus(): Promise<'granted' | 'denied' | 'undetermined'> {
  if (Platform.OS === 'web') return 'denied';
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return 'granted';
  return current.canAskAgain ? 'undetermined' : 'denied';
}

/** Contextual request — call from the Settings toggle, not app launch. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

async function cancelPhysiqReminders(exceptIds: Set<string>): Promise<void> {
  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    scheduled
      .filter((n) => n.identifier.startsWith(REMINDER_ID_PREFIX) && !exceptIds.has(n.identifier))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

function triggerFor(reminder: PlannedReminder, now: Date): Notifications.NotificationTriggerInput {
  const fireAt = new Date(now);
  fireAt.setHours(reminder.hour, reminder.minute, 0, 0);
  return {
    type: Notifications.SchedulableTriggerInputTypes.DATE,
    date: fireAt,
  };
}

/**
 * Reconcile scheduled notifications with the current plan. Reschedules by
 * identifier, so repeated syncs are idempotent and stale reminders (e.g.
 * protein nudge after the target was hit) are cancelled.
 */
export async function syncReminders(inputs: ReminderPlanInputs): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const permission = await getNotificationPermissionStatus();
    const planned = permission === 'granted' ? planReminders(inputs) : [];

    await cancelPhysiqReminders(new Set());
    if (planned.length === 0) return;

    await Promise.all(
      planned.map((reminder) =>
        Notifications.scheduleNotificationAsync({
          identifier: reminder.id,
          content: {
            title: reminder.title,
            body: reminder.body,
            sound: false,
          },
          trigger: triggerFor(reminder, inputs.now),
        })
      )
    );
  } catch (error) {
    // Never let reminder scheduling break app flows (e.g. Expo Go).
    console.warn('[Reminders] sync failed', error);
  }
}

/** Full teardown when the master toggle turns off. */
export async function cancelAllReminders(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await cancelPhysiqReminders(new Set());
  } catch (error) {
    console.warn('[Reminders] cancel failed', error);
  }
}
