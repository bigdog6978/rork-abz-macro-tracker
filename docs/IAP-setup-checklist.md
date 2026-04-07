# iOS IAP Setup Checklist (Pro + Athlete)

## Product IDs

- `physiq.pro.monthly` — Physiq Pro ($4.99/mo)
- `physiq.athlete.monthly` — Physiq Athlete ($6.99/mo)

## App Store Connect

1. Create both auto-renewable subscriptions under the app.
2. Ensure each has:
   - localized title/description
   - pricing
   - subscription group assignment
   - trial/intro offer config (if desired)
3. Add required review screenshots and metadata.

## RevenueCat (if enabled)

1. Add iOS app in RevenueCat and connect App Store Connect API key.
2. Mirror products:
   - `physiq.pro.monthly`
   - `physiq.athlete.monthly`
3. Ensure offerings include both packages and current offering is active.
4. Set env key for the app:
   - `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`

## Build/Release

1. Build with EAS iOS profile (production).
2. Test purchases in Sandbox/TestFlight users.
3. Verify flows:
   - fetch products + localized prices
   - purchase pro/athlete
   - restore purchases
   - active/expired entitlement updates
   - grace period / billing retry / deferred pending messaging paths
   - Terms of Use + Privacy links visible on onboarding and settings paywalls

