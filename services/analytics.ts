/**
 * Analytics + crash reporting facade. Everything is env-gated and no-ops
 * safely when keys are absent (Expo Go, dev, CI):
 *
 * - Crashes / errors → Sentry, enabled by EXPO_PUBLIC_SENTRY_DSN.
 * - Product events   → PostHog, enabled by EXPO_PUBLIC_POSTHOG_API_KEY
 *   (autocapture off; only the explicit, typed events below).
 *
 * Privacy: no PII in event props — no food names, no health values; only
 * methods, counts, and booleans. Events double as Sentry breadcrumbs so
 * crash reports carry recent user actions.
 *
 * Instruments the PRD §12 metrics (logging methods, watch interactions,
 * nudge actions, onboarding funnel, trial/purchase once monetization is on).
 */

import * as Sentry from '@sentry/react-native';
import PostHog from 'posthog-react-native';

export type AnalyticsEvent =
  // Onboarding funnel
  | 'onboarding_step_viewed'
  | 'onboarding_completed'
  // Logging (the core loop). method: search | best_match | quick_add |
  // voice | watch_voice | barcode | recent | saved | manual
  | 'food_logged'
  | 'log_entry_edited'
  | 'log_entry_deleted'
  // Watch interactions
  | 'watch_hydration_logged'
  | 'watch_day_type_changed'
  // Phone interactions
  | 'day_type_changed'
  | 'hydration_logged'
  | 'health_integration_enabled'
  | 'health_integration_disabled'
  // Reminders
  | 'reminders_master_toggled'
  | 'reminder_toggled'
  // Monetization (wired now; fires once IAP_MONETIZATION_ENABLED)
  | 'trial_started'
  | 'purchase_completed'
  | 'purchase_restored'
  // Sharing / plans
  | 'meal_plan_generated'
  | 'progress_shared';

export type AnalyticsProps = Record<string, string | number | boolean>;

const sentryDsn = process.env.EXPO_PUBLIC_SENTRY_DSN ?? '';
const posthogKey = process.env.EXPO_PUBLIC_POSTHOG_API_KEY ?? '';
const posthogHost = process.env.EXPO_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let posthog: PostHog | null = null;
let sentryEnabled = false;
let initialized = false;

/** Call once from the root layout. Safe to call multiple times. */
export function initAnalytics(): void {
  if (initialized) return;
  initialized = true;

  if (sentryDsn) {
    try {
      Sentry.init({
        dsn: sentryDsn,
        // Crash + error monitoring only; keep performance sampling light.
        tracesSampleRate: 0.1,
        sendDefaultPii: false,
        enabled: !__DEV__,
      });
      sentryEnabled = true;
    } catch (error) {
      console.warn('[Analytics] Sentry init failed', error);
    }
  }

  if (posthogKey) {
    try {
      posthog = new PostHog(posthogKey, {
        host: posthogHost,
        // Explicit events only — no autocapture, no session replay.
        captureAppLifecycleEvents: true,
        disabled: __DEV__,
      });
    } catch (error) {
      console.warn('[Analytics] PostHog init failed', error);
    }
  }
}

export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  try {
    posthog?.capture(event, props);
    if (sentryEnabled) {
      Sentry.addBreadcrumb({ category: 'analytics', message: event, data: props, level: 'info' });
    }
    if (__DEV__ && (posthogKey || sentryDsn)) {
      console.log('[Analytics]', event, props ?? {});
    }
  } catch {
    // Analytics must never break a user flow.
  }
}

export function trackScreen(name: string): void {
  try {
    posthog?.screen(name);
  } catch {
    // ignore
  }
}

/** Report a handled error (e.g. ErrorBoundary) to Sentry when enabled. */
export function reportError(error: unknown, context?: Record<string, unknown>): void {
  try {
    if (sentryEnabled) {
      Sentry.captureException(error, context ? { extra: context } : undefined);
    }
  } catch {
    // ignore
  }
}
