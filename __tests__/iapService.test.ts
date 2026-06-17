import { LIFETIME_PRODUCT_ID, IAP_MONETIZATION_ENABLED, mapOwnedProductsToEntitlement } from '../services/iapMapping';

describe('iap mapping', () => {
  it('maps owned lifetime product to unlocked entitlement', () => {
    expect(mapOwnedProductsToEntitlement([LIFETIME_PRODUCT_ID])).toBe('unlocked');
  });

  it('maps no owned products to core', () => {
    expect(mapOwnedProductsToEntitlement([])).toBe('core');
  });

  it('ignores unrelated product ids', () => {
    expect(mapOwnedProductsToEntitlement(['some.other.product'])).toBe('core');
  });

  it('monetization is disabled in production builds', () => {
    expect(IAP_MONETIZATION_ENABLED).toBe(false);
  });
});
