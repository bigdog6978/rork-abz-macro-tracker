# IAP Setup Checklist (Legacy)

> **As of version 1.3.2**, Physiq no longer sells in-app purchases. All premium features (adaptive macros, hydration, athlete mode, Health integration, etc.) are included for every user at no cost.
>
> The `react-native-purchases` integration and mapping in `services/iap.ts` / `services/iapMapping.ts` remain in the codebase for potential future use but are disabled via `IAP_MONETIZATION_ENABLED = false`. RevenueCat is **not** initialized on app launch.

## Historical product ID (disabled)

- `physiq.lifetime.unlock` — former one-time lifetime unlock (`LIFETIME_PRODUCT_ID` in `services/iapMapping.ts`)

## Re-enabling IAP (if ever needed)

1. Set `IAP_MONETIZATION_ENABLED = true` in `services/iap.ts`
2. Configure App Store Connect non-consumable + RevenueCat offering
3. Set `EXPO_PUBLIC_REVENUECAT_IOS_API_KEY`
4. Restore purchase UI and `ProProvider` entitlement gating
