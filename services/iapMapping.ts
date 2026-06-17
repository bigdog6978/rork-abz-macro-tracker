import { ProEntitlementState } from '../features/pro/types';

/** Monetization removed in 1.3.2 — IAP calls are no-ops unless re-enabled. */
export const IAP_MONETIZATION_ENABLED = false;

/** Legacy lifetime product id (disabled). */
export const LIFETIME_PRODUCT_ID = 'physiq.lifetime.unlock';

export interface IapCustomerState {
  entitlement: ProEntitlementState;
  activeProductIds: string[];
}

export function mapOwnedProductsToEntitlement(ownedProductIds: string[]): ProEntitlementState {
  return ownedProductIds.includes(LIFETIME_PRODUCT_ID) ? 'unlocked' : 'core';
}
