# Apple Health (HealthKit)

Adaptive Pro / Athlete features use [`react-native-health`](https://github.com/agencyenterprise/react-native-health) on the **iPhone** (`services/healthkit.ts`).

## Expo config (required)

The **`react-native-health` config plugin** is listed in `app.config.ts`. It:

- Adds **`com.apple.developer.healthkit`** to the iOS app entitlements.
- Sets **`NSHealthShareUsageDescription`** and **`NSHealthUpdateUsageDescription`** (same copy as the plugin options in `app.config.ts`).

Without this plugin, prebuild/EAS may ship a binary that never registers with HealthKit, so **Settings → Privacy & Security → Health** may not list Physiq after “Connect.”

## Apple Developer

1. Open [Identifiers](https://developer.apple.com/account/resources/identifiers/list) → App ID **`app.rork.abz-macro-tracker`**.
2. Enable **HealthKit** capability and save.
3. Regenerate or refresh **provisioning profiles** if Xcode/EAS reports an entitlement mismatch (EAS may prompt to sync credentials).

## Verify locally (optional)

`ios/` is gitignored; EAS generates it on each build. To inspect the merged entitlements:

```bash
npx expo prebuild --clean -p ios
```

Then open **`ios/PhysiqMacroTracker/PhysiqMacroTracker.entitlements`** and confirm:

- `com.apple.developer.healthkit` = `true`
- `com.apple.developer.healthkit.access` array (may be empty for standard read/write)

## Release

After changing HealthKit configuration, ship a **new iOS build** (EAS). Users must install that build before Physiq appears under **Health → Data Access & Devices**.
