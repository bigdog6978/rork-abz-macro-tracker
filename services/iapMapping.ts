import { ProEntitlementState } from '../features/pro/types';

export const IAP_PRODUCT_IDS = {
  proMonthly: 'physiq.pro.monthly',
  athleteMonthly: 'physiq.athlete.monthly',
} as const;

export interface IapCustomerState {
  entitlement: ProEntitlementState;
  activeProductIds: string[];
  latestExpirationDate: string | null;
  lifecycleStatus: 'active' | 'expired' | 'grace_period' | 'billing_retry' | 'deferred';
  statusMessage: string;
  trialActive: boolean;
  trialEndsAt: string | null;
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
  billingIssueDetectedAt?: string | null;
  gracePeriodExpiresDate?: string | null;
  deferred?: boolean;
  trialActive?: boolean;
  trialEndsAt?: string | null;
  nowIso?: string;
}): IapCustomerState {
  const now = new Date(input.nowIso ?? new Date().toISOString());
  const exp = input.latestExpirationDate ? new Date(input.latestExpirationDate) : null;
  const hasActive = (input.activeSubscriptions ?? []).length > 0;
  let lifecycleStatus: IapCustomerState['lifecycleStatus'] = 'expired';
  let statusMessage = 'Subscription inactive. Upgrade to unlock premium features.';

  if (hasActive) {
    lifecycleStatus = 'active';
    statusMessage = 'Subscription active.';
  } else if (input.deferred) {
    lifecycleStatus = 'deferred';
    statusMessage = 'Purchase pending approval. Access will unlock when Apple confirms.';
  } else if (input.billingIssueDetectedAt) {
    lifecycleStatus = 'billing_retry';
    statusMessage = 'Billing issue detected. Please update payment details to keep access.';
  } else if (input.gracePeriodExpiresDate) {
    const grace = new Date(input.gracePeriodExpiresDate);
    if (grace.getTime() > now.getTime()) {
      lifecycleStatus = 'grace_period';
      statusMessage = 'In grace period. Premium access may pause if billing is not resolved.';
    }
  } else if (exp && exp.getTime() > now.getTime()) {
    lifecycleStatus = 'deferred';
    statusMessage = 'Purchase is pending and will activate shortly.';
  } else if (exp) {
    lifecycleStatus = 'expired';
    statusMessage = 'Subscription expired. Renew to restore premium features.';
  }

  return {
    entitlement: mapActiveSubscriptionsToEntitlement(input.activeSubscriptions ?? []),
    activeProductIds: input.activeSubscriptions ?? [],
    latestExpirationDate: input.latestExpirationDate ?? null,
    lifecycleStatus,
    statusMessage,
    trialActive: Boolean(input.trialActive),
    trialEndsAt: input.trialEndsAt ?? null,
  };
}

