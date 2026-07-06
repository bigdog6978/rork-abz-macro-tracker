/**
 * Pure reminder planning: given today's state and the user's reminder
 * settings, decide which local notifications should exist right now.
 * No expo-notifications imports — services/reminders.ts applies the plan;
 * this module is unit-tested in Node.
 *
 * All reminders are local and off by default (PRD: protein reminders,
 * hydration nudges, log reminder — Pro retention infrastructure).
 */

export interface ReminderSettings {
  /** Master switch — nothing schedules while false. */
  enabled: boolean;
  proteinNudgeEnabled: boolean;
  /** Local hour (0-23) for the evening protein-gap nudge. */
  proteinNudgeHour: number;
  /** Minimum grams of protein remaining before the nudge is worth sending. */
  proteinGapThresholdG: number;
  hydrationRemindersEnabled: boolean;
  /** Local hours for hydration checks; only behind-pace slots schedule. */
  hydrationHours: number[];
  logReminderEnabled: boolean;
  /** Local hour for the streak-protecting "nothing logged yet" reminder. */
  logReminderHour: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  enabled: false,
  proteinNudgeEnabled: true,
  proteinNudgeHour: 19,
  proteinGapThresholdG: 25,
  hydrationRemindersEnabled: true,
  hydrationHours: [10, 13, 16],
  logReminderEnabled: true,
  logReminderHour: 20,
};

export interface ReminderPlanInputs {
  settings: ReminderSettings;
  now: Date;
  /** Grams of protein still to eat today (target − consumed, floored at 0). */
  proteinRemainingG: number;
  entriesLoggedToday: number;
  hydrationTrackingEnabled: boolean;
  hydrationConsumedMl: number;
  hydrationTargetMl: number;
}

export interface PlannedReminder {
  /** Stable id: reminders are cancelled/rescheduled by this prefix+slot. */
  id: string;
  title: string;
  body: string;
  hour: number;
  minute: number;
}

export const REMINDER_ID_PREFIX = 'physiq-reminder-';

/** Assumed drinking window for the behind-pace check (8:00 → 20:00). */
const HYDRATION_WINDOW_START_HOUR = 8;
const HYDRATION_WINDOW_HOURS = 12;

export function isBehindHydrationPace(
  consumedMl: number,
  targetMl: number,
  hour: number
): boolean {
  if (targetMl <= 0) return false;
  const windowFraction = Math.min(
    Math.max((hour - HYDRATION_WINDOW_START_HOUR) / HYDRATION_WINDOW_HOURS, 0),
    1
  );
  return consumedMl < targetMl * windowFraction;
}

export function planReminders(inputs: ReminderPlanInputs): PlannedReminder[] {
  const {
    settings,
    now,
    proteinRemainingG,
    entriesLoggedToday,
    hydrationTrackingEnabled,
    hydrationConsumedMl,
    hydrationTargetMl,
  } = inputs;

  if (!settings.enabled) return [];

  const planned: PlannedReminder[] = [];
  const currentHour = now.getHours() + now.getMinutes() / 60;

  if (
    settings.proteinNudgeEnabled &&
    settings.proteinNudgeHour > currentHour &&
    proteinRemainingG >= settings.proteinGapThresholdG
  ) {
    const grams = Math.round(proteinRemainingG);
    planned.push({
      id: `${REMINDER_ID_PREFIX}protein`,
      title: 'Protein check-in',
      body: `${grams}g of protein left today — a shake or lean snack closes the gap.`,
      hour: settings.proteinNudgeHour,
      minute: 0,
    });
  }

  if (
    settings.hydrationRemindersEnabled &&
    hydrationTrackingEnabled &&
    hydrationTargetMl > 0
  ) {
    for (const hour of settings.hydrationHours) {
      if (hour <= currentHour) continue;
      if (!isBehindHydrationPace(hydrationConsumedMl, hydrationTargetMl, hour)) continue;
      planned.push({
        id: `${REMINDER_ID_PREFIX}hydration-${hour}`,
        title: 'Hydration',
        body: 'You are behind on water today — log a glass to stay on pace.',
        hour,
        minute: 0,
      });
    }
  }

  if (
    settings.logReminderEnabled &&
    settings.logReminderHour > currentHour &&
    entriesLoggedToday === 0
  ) {
    planned.push({
      id: `${REMINDER_ID_PREFIX}log`,
      title: 'Keep the streak',
      body: "Nothing logged yet today. It takes 10 seconds — speak it or scan it.",
      hour: settings.logReminderHour,
      minute: 0,
    });
  }

  return planned;
}
