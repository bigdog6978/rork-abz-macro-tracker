import { IAP_PRODUCT_IDS, mapCustomerLikeInfoToState } from '../services/iapMapping';

describe('iap mapping', () => {
  it('maps athlete active subscription to athlete entitlement', () => {
    const state = mapCustomerLikeInfoToState({
      activeSubscriptions: [IAP_PRODUCT_IDS.athleteMonthly],
      latestExpirationDate: '2027-01-01T00:00:00Z',
    });
    expect(state.entitlement).toBe('athlete_subscriber_active');
  });

  it('maps pro active subscription to pro entitlement', () => {
    const state = mapCustomerLikeInfoToState({
      activeSubscriptions: [IAP_PRODUCT_IDS.proMonthly],
      latestExpirationDate: null,
    });
    expect(state.entitlement).toBe('pro_subscriber_active');
  });

  it('maps empty subscriptions to core', () => {
    const state = mapCustomerLikeInfoToState({
      activeSubscriptions: [],
      latestExpirationDate: null,
    });
    expect(state.entitlement).toBe('core_active');
  });

  it('maps billing issue to billing_retry lifecycle', () => {
    const state = mapCustomerLikeInfoToState({
      activeSubscriptions: [],
      latestExpirationDate: '2026-04-01T00:00:00Z',
      billingIssueDetectedAt: '2026-04-02T00:00:00Z',
    });
    expect(state.lifecycleStatus).toBe('billing_retry');
  });

  it('maps grace period when grace end is in future', () => {
    const state = mapCustomerLikeInfoToState({
      activeSubscriptions: [],
      gracePeriodExpiresDate: '2999-04-02T00:00:00Z',
    });
    expect(state.lifecycleStatus).toBe('grace_period');
  });

  it('maps deferred pending state', () => {
    const state = mapCustomerLikeInfoToState({
      activeSubscriptions: [],
      deferred: true,
    });
    expect(state.lifecycleStatus).toBe('deferred');
  });
});
