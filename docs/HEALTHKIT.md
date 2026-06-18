# Apple Health (HealthKit)

Adaptive Pro / Athlete features use [`react-native-health`](https://github.com/agencyenterprise/react-native-health) on the **iPhone** (`services/healthkit.ts`, mapping in `services/healthkitMapping.ts`).

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
- `com.apple.security.application-groups` includes `group.app.rork.abz-macro-tracker`

## Data read (read-only)

| HealthKit type | Use |
|----------------|-----|
| Active energy | Macro adjustment / day-type inference |
| Steps | High-activity day detection |
| Workouts + exercise time | Training-day detection, hydration boost |
| Heart rate + resting HR | HR trend vs baseline |
| HRV (SDNN) | Recovery signal for athlete adjustments |
| Sleep analysis | Prior-night sleep window (yesterday noon → now) |

Physiq does **not** write to HealthKit (`write: []`).

## Connection flow

1. User taps **Connect** → `HealthPermissionModal` → **Continue**
2. Modal dismisses → `requestHealthKitPermissions()` waits for UI settle → `initHealthKit`
3. Probe read (`getStepCount`) confirms bridge responds
4. `readTodayHealthSignals()` populates `ProHealthSignals` locally
5. Foreground `AppState` refresh keeps signals current

## Watch (Option B)

HealthKit stays on **iPhone only**. The watch app receives health-enriched macro snapshots via WatchConnectivity (`PhysiqWatchSync.tsx`). See `docs/WATCH.md`.

## App Store compliance checklist

| Item | Status |
|------|--------|
| Guideline 5.1.3 — clear consent before Health access | In-app modal + system sheet |
| No ads/marketing/data mining on Health data | App does not use Health for ads |
| No third-party sharing of Health data | Local storage only |
| `NSHealthShareUsageDescription` + `NSHealthUpdateUsageDescription` | Set via config plugin |
| `com.apple.developer.healthkit` entitlement | Plugin + prebuild verify |
| App ID HealthKit capability + provisioning | **Verify in Apple Developer / EAS** |
| Privacy policy discloses Health usage | `legal/privacyPolicy.ts` §5 |
| App Store Connect privacy labels | **Declare Health & Fitness data** |
| No HealthKit on watch target (Option B) | Watch uses phone snapshot only |
| No iCloud sync of HealthKit samples | Local SQLite only |

## Release

After changing HealthKit configuration, ship a **new iOS build** (EAS). Users must install that build before Physiq appears under **Health → Data Access & Devices**.
