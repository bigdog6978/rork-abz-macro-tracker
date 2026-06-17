/**
 * App-managed free trial (NOT StoreKit). Trial unlocks all premium features for a fixed
 * window measured as 5 x 24h from the moment it is started. After expiry, access reverts to
 * core unless the user buys the one-time lifetime unlock.
 *
 * This module holds pure, dependency-free logic so it can be unit tested against edge dates.
 * Persistence lives in storage/proRepo.ts.
 */

export const TRIAL_DURATION_DAYS = 5;
const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DURATION_MS = TRIAL_DURATION_DAYS * DAY_MS;

export interface ProTrialState {
  /** ISO timestamp of when the trial began, or null if never started. */
  startedAt: string | null;
  /** True once the user has dismissed the trial-ended prompt for this trial. */
  expiryAcknowledged: boolean;
}

export const DEFAULT_TRIAL_STATE: ProTrialState = {
  startedAt: null,
  expiryAcknowledged: false,
};

export interface TrialStatus {
  /** True if a trial was ever started (active or expired). */
  started: boolean;
  /** True if a trial is currently within its 5-day window. */
  active: boolean;
  /** True if a trial was started but has passed its window. */
  expired: boolean;
  /** Whole days left (rounded up), 0 when not active. */
  daysRemaining: number;
  /** ISO timestamp of when the trial ends, or null if never started. */
  endsAt: string | null;
}

/** Returns the trial end time in ms, or null when no valid start exists. */
export function getTrialEndMs(startedAt: string | null): number | null {
  if (!startedAt) return null;
  const startMs = new Date(startedAt).getTime();
  if (!Number.isFinite(startMs)) return null;
  return startMs + TRIAL_DURATION_MS;
}

/** Derives the full trial status for a given start time relative to `now`. */
export function computeTrialStatus(startedAt: string | null, now: Date = new Date()): TrialStatus {
  const endMs = getTrialEndMs(startedAt);
  if (endMs == null) {
    return { started: false, active: false, expired: false, daysRemaining: 0, endsAt: null };
  }
  const remainingMs = endMs - now.getTime();
  const active = remainingMs > 0;
  return {
    started: true,
    active,
    expired: !active,
    daysRemaining: active ? Math.max(1, Math.ceil(remainingMs / DAY_MS)) : 0,
    endsAt: new Date(endMs).toISOString(),
  };
}
