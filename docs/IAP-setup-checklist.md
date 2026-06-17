# iOS IAP Setup Checklist (Lifetime Unlock)

## Product ID

- `physiq.lifetime.unlock` — Physiq Premium (one-time, non-consumable lifetime unlock)

> Placeholder id. If you change it, update `LIFETIME_PRODUCT_ID` in `services/iapMapping.ts`.

## Free Trial (app-managed, not StoreKit)

- A 5-day free trial unlocks all premium features without any purchase or StoreKit involvement.
- Trial state is persisted locally (`physiq_pro_trial_state_v1`); duration is `TRIAL_DURATION_DAYS` in `features/pro/trial.ts`.
- The trial does NOT auto-renew and does NOT create any Apple subscription. After expiry, access reverts to core unless the user buys the lifetime unlock.
- No App Store Connect / RevenueCat configuration is required for the trial.

## App Store Connect

1. Create one non-consumable in-app purchase under the app.
2. Ensure it has:
   - product id `physiq.lifetime.unlock`
   - localized title/description
   - one-time price
3. Add required review screenshots and metadata.

## RevenueCat (if enabled)

1. Add iOS app in RevenueCat and connect App Store Connect API key.
2. Mirror the product:
   - `physiq.lifetime.unlock`
3. Ensure the current offering includes the lifetime package and is active.
4. Set env key for the app:
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

## Build/Release

1. Build with EAS iOS profile (production).
2. Test purchases in Sandbox/TestFlight users.
3. Verify flows:
   - fetch product + localized price
   - start 5-day free trial (grants premium without purchase)
   - trial expiry reverts to core and shows the trial-ended prompt once
   - purchase lifetime unlock
   - restore purchases
   - entitlement updates from `core` to `unlocked`
   - Terms of Use + Privacy links visible on onboarding and settings paywalls
