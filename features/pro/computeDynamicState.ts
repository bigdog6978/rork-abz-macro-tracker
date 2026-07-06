/**
 * Pure derivations extracted verbatim from ProProvider so the background
 * refresh task (services/backgroundRefresh.ts) computes IDENTICAL dynamic
 * targets and hydration state without React. ProProvider delegates here —
 * change this module, never fork the logic.
 */

import type { MacroTargets } from '../../types';
import type {
  AthleteCycleDerivedState,
  AthleteProfile,
  ProHealthSignals,
  ProHydrationLog,
  ProSettings,
} from './types';
import {
  applyAthleteAdjustments,
  applyProAdjustments,
  getAthleteHydrationTargetMl,
  getHydrationTargetMl,
} from './proMacroEngine';

/** ProProvider's `dynamic` memo. `cycleDerived` must already be gated on
 * `cycleProfile.enabled` by the caller (pass null when disabled). */
export function computeDynamicState(
  baseMacros: MacroTargets,
  settings: ProSettings,
  healthSignals: ProHealthSignals | null,
  athleteProfile: AthleteProfile,
  cycleDerived: AthleteCycleDerivedState | null
) {
  if (!settings.dynamicMacrosEnabled) {
    return {
      targets: baseMacros,
      reason: 'Core macro targets active.',
      inferredDayType: 'rest_day' as const,
      tierApplied: 'core' as const,
      explainability: ['Dynamic layer disabled'],
      adjustmentConfidence: 'high' as const,
      fuelingStrategy: 'Base fueling only.',
    };
  }
  const proAdjusted = applyProAdjustments(baseMacros, healthSignals, settings.dayTypeOverride);
  if (!athleteProfile.enabled) return { ...proAdjusted, tierApplied: 'pro' as const };
  return applyAthleteAdjustments(baseMacros, proAdjusted, athleteProfile, cycleDerived);
}

/** ProProvider's hydration target selection. */
export function computeHydrationTargetMl(
  settings: ProSettings,
  athleteProfile: AthleteProfile,
  dynamicTargets: MacroTargets,
  healthSignals: ProHealthSignals | null,
  cycleDerived: AthleteCycleDerivedState | null
): number {
  if (!settings.hydrationEnabled) return 2400;
  return athleteProfile.enabled
    ? getAthleteHydrationTargetMl(dynamicTargets, healthSignals, athleteProfile, cycleDerived)
    : getHydrationTargetMl(dynamicTargets, healthSignals);
}

/** ProProvider's hydration memo: reset consumed on day rollover, apply target. */
export function computeHydrationLogState(
  base: ProHydrationLog,
  todayKey: string,
  targetMl: number
): ProHydrationLog {
  if (base.dateKey !== todayKey) {
    return { ...base, dateKey: todayKey, consumedMl: 0, targetMl };
  }
  return { ...base, targetMl };
}
