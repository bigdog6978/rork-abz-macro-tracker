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
});
