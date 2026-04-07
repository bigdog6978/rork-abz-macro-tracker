import { ProEntitlementState } from '../features/pro/types';

export const IAP_PRODUCT_IDS = {
  proMonthly: 'physiq.pro.monthly',
  athleteMonthly: 'physiq.athlete.monthly',
} as const;

export interface IapCustomerState {
  entitlement: ProEntitlementState;
  activeProductIds: string[];
  latestExpirationDate: string | null;
}

export function mapActiveSubscriptionsToEntitlement(activeSubscriptions: string[]): ProEntitlementState {
  const active = new Set(activeSubscriptions);
  if (active.has(IAP_PRODUCT_IDS.athleteMonthly)) return 'athlete_subscriber_active';
  if (active.has(IAP_PRODUCT_IDS.proMonthly)) return 'pro_subscriber_active';
  return 'core_active';
}

export function mapCustomerLikeInfoToState(input: {
  activeSubscriptions: string[];
  latestExpirationDate?: string | null;
}): IapCustomerState {
  return {
    entitlement: mapActiveSubscriptionsToEntitlement(input.activeSubscriptions ?? []),
    activeProductIds: input.activeSubscriptions ?? [],
    latestExpirationDate: input.latestExpirationDate ?? null,
  };
}

