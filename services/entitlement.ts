/**
 * Gathers entitlement inputs (IAP, stored state, trial) and resolves them
 * via features/pro/resolveEntitlement.ts. Fast-path: while
 * IAP_MONETIZATION_ENABLED is false, no IAP/storage reads happen at all.
 */

import Constants from 'expo-constants';
import { ProEntitlementState } from '../features/pro/types';
import { computeTrialStatus } from '../features/pro/trial';
import {
  ResolvedEntitlement,
  resolveEntitlement,
} from '../features/pro/resolveEntitlement';
import { getProEntitlement, getTrialState } from '../storage/proRepo';
import { getCustomerState, IAP_MONETIZATION_ENABLED, initIAP } from './iap';

function readDevUnlockFlag(): boolean {
  const raw =
    (Constants.expoConfig?.extra?.EXPO_PUBLIC_DEV_UNLOCK_PREMIUM as string | undefined) ??
    process.env.EXPO_PUBLIC_DEV_UNLOCK_PREMIUM ??
    '';
  return raw === '1' || raw === 'true';
}

export async function loadEntitlementState(): Promise<ResolvedEntitlement> {
  if (!IAP_MONETIZATION_ENABLED) {
    return { entitlement: 'unlocked', hasPremium: true };
  }

  const [storedEntitlement, trialState] = await Promise.all([
    getProEntitlement(),
    getTrialState(),
  ]);

  let iapEntitlement: ProEntitlementState = 'core';
  try {
    await initIAP();
    iapEntitlement = (await getCustomerState()).entitlement;
  } catch (error) {
    // Offline / IAP unavailable — fall back to stored entitlement + trial.
    console.warn('[Entitlement] IAP state unavailable', error);
  }

  return resolveEntitlement({
    monetizationEnabled: true,
    devUnlock: readDevUnlockFlag(),
    storedEntitlement,
    iapEntitlement,
    trialStatus: computeTrialStatus(trialState.startedAt),
  });
}
