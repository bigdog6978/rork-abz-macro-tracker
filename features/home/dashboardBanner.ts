/**
 * Single-banner-slot policy for the dashboard: at most ONE prompt/nudge
 * shows at a time, by priority. Keeps system content from stacking above
 * the user's own log.
 */

export type DashboardBannerKind = 'measurement' | 'photo' | 'training';

export interface DashboardBannerInputs {
  /** Existing measurement cadence prompt (useMeasurements().showPrompt). */
  measurementPromptVisible: boolean;
  /** Baseline photo nudge: 3-day streak, no baseline photo, not dismissed. */
  streak: number;
  hasBaselinePhoto: boolean;
  photoPromptDismissed: boolean;
  /** Training Mode nudge (athlete profile off but pro features on). */
  trainingNudgeEligible: boolean;
}

export const PHOTO_PROMPT_MIN_STREAK = 3;

export function selectDashboardBanner(inputs: DashboardBannerInputs): DashboardBannerKind | null {
  if (inputs.measurementPromptVisible) return 'measurement';
  if (
    !inputs.hasBaselinePhoto &&
    !inputs.photoPromptDismissed &&
    inputs.streak >= PHOTO_PROMPT_MIN_STREAK
  ) {
    return 'photo';
  }
  if (inputs.trainingNudgeEligible) return 'training';
  return null;
}
