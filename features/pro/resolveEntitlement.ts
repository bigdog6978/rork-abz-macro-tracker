/**
 * Pure entitlement resolution. Launch-day behavior is a single flag flip:
 * while IAP_MONETIZATION_ENABLED is false (services/iapMapping.ts) this
 * always resolves 'unlocked' — exactly the pre-wiring hardcode. Once the
 * flag is true, RevenueCat ownership, the one-time trial window, and the
 * internal-review env unlock all participate.
 *
 * See APP_STORE_SUBMISSION.md → "Monetization launch checklist".
 */

import type { ProEntitlementState } from './types';
import type { TrialStatus } from './trial';

export interface EntitlementInputs {
  monetizationEnabled: boolean;
  /** EXPO_PUBLIC_DEV_UNLOCK_PREMIUM — local/internal review only. */
  devUnlock: boolean;
  /** Locally persisted entitlement (proRepo) — survives offline launches. */
  storedEntitlement: ProEntitlementState;
  /** Live RevenueCat-derived entitlement; 'core' when IAP unavailable. */
  iapEntitlement: ProEntitlementState;
  trialStatus: TrialStatus;
}

export interface ResolvedEntitlement {
  entitlement: ProEntitlementState;
  hasPremium: boolean;
}

export function resolveEntitlement(inputs: EntitlementInputs): ResolvedEntitlement {
  const { monetizationEnabled, devUnlock, storedEntitlement, iapEntitlement, trialStatus } = inputs;

  if (!monetizationEnabled || devUnlock) {
    return { entitlement: 'unlocked', hasPremium: true };
  }
  if (iapEntitlement === 'unlocked' || storedEntitlement === 'unlocked') {
    return { entitlement: 'unlocked', hasPremium: true };
  }
  if (trialStatus.active) {
    // Trial grants premium behavior without a purchased entitlement.
    return { entitlement: 'core', hasPremium: true };
  }
  return { entitlement: 'core', hasPremium: false };
}
