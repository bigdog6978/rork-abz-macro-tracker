import { ProEntitlementState } from '../features/pro/types';

/** Single non-consumable lifetime unlock product. Centralized here. */
export const LIFETIME_PRODUCT_ID = 'physiq.lifetime.unlock';

export interface IapCustomerState {
  entitlement: ProEntitlementState;
  activeProductIds: string[];
}

export function mapOwnedProductsToEntitlement(ownedProductIds: string[]): ProEntitlementState {
  return ownedProductIds.includes(LIFETIME_PRODUCT_ID) ? 'unlocked' : 'core';
}
