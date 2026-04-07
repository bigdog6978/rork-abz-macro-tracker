# Apple Watch (watchOS) + iPhone integration

## Compatibility

- Minimum watchOS target: **8.0**
- Intended support: **watchOS 8.0 through current**
- Final install eligibility still depends on Apple toolchain/App Store validation at build submission time.

## Pro / Health messaging (iPhone)

**HealthKit stays on the iPhone** for adaptive Pro / Athlete-style targets; the Watch is optional and receives data via Health sync + WatchConnectivity (`docs` copy lives in `src/content/proMicrocopy.ts`). After activating Pro (trial or subscribe), iOS users see **`PostProHealthFlow`**: education modal → existing `HealthPermissionModal` → `enableHealthIntegration()`. Settings shows an **inline banner** while Health integration is off. No Watch app is required for HealthKit permission or reads.

## Strategy (HealthKit)

**Option B (implemented):** Macro and hydration **numbers** are computed on the **iPhone** (including HealthKit via `react-native-health`). The Watch app is **glanceable UI + WatchConnectivity** only: it shows the latest snapshot pushed from the phone and can send a **hydration quick-log** action back. No HealthKit entitlement is required on the Watch target for this flow.

**Option A (future):** Read/write HealthKit **on-watch** for standalone metrics; would require `com.apple.developer.healthkit` on the watch target, usage strings, and review-aligned copy.

## Native pieces

| Piece | Role |
|--------|------|
| `@bacons/apple-targets` | Generates the watchOS app target and embeds it in the iOS app (Continuous Native Generation). |
| `targets/watch/` | SwiftUI app: `PhysiqWatchApp`, `ContentView`, `WatchConnectivityManager`. |
| `physiq-watch-connectivity` | Expo module (`PhysiqWatch`) on **iPhone**: `sendProSnapshot`, events `onWatchPayload` / `onActivationChange`. |
| App Group | `group.app.rork.abz-macro-tracker` (entitlements on main app + synced to watch via apple-targets). Optional for future `ExtensionStorage` / shared files. |

## Local development

Requirements: **Xcode 16+**, **CocoaPods 1.16.2+**, **macOS** with watchOS simulators or a paired Watch.

```bash
cd /path/to/rork-abz-macro-tracker
export APPLE_TEAM_ID=YOUR_TEAM_ID   # 10-character Apple Team ID (Signing)
npm install
npx expo prebuild --clean -p ios
npx pod-install ios
open ios/PhysiqMacroTracker.xcworkspace
```

- Select the **watch** scheme (e.g. `watch` / product name from `targets/watch`) or the **iOS app** scheme; building the iOS app should embed the Watch app.
- Run the Watch target on a **watchOS simulator** paired with an iOS simulator, or on a physical Watch.

## EAS Build

Default iOS production profile builds the main app workspace; the embedded Watch binary is included when the Xcode project contains the Watch target (after prebuild).

```bash
eas build --platform ios --profile production
```

Set **`APPLE_TEAM_ID`** in EAS secrets or `eas.json` env so `app.config.ts` can pass `ios.appleTeamId` for signing (required by `@bacons/apple-targets` for auxiliary targets).

## App Store Connect / TestFlight

1. Create / enable the **Watch App** capability for the main App ID if Apple’s portal requires it (often automatic when a Watch binary is uploaded).
2. Upload a single iOS build; the **Watch app** appears as part of the same version.
3. On device: install the iPhone app from TestFlight, then open the **Watch** app on iPhone → **My Watch** → install the Physiq Watch app.

## WCSession behavior

- **Phone → Watch:** `updateApplicationContext` with string fields: `calories`, `protein`, `carbs`, `fat`, `hydration`, `updatedAt` (see `ProProvider`).
- **Watch → Phone:** `sendMessage` / `updateApplicationContext` with `action: hydration_ack`; iPhone adds **250 ml** via `addHydration(250)`.
- Athlete-aware summaries may be included (`tier`, `athleteSport`) but cycle-sensitive details are intentionally excluded from watch payloads.

If the session is not reachable, `applicationContext` still updates when the watch next becomes active.

## Testing checklist

- [ ] `WCSession` activates on iPhone (Dev Menu / logs optional).
- [ ] Watch UI shows macro snapshot after Pro state changes on phone.
- [ ] Hydration button on watch increments hydration on phone when paired.
- [ ] Archive in Xcode includes both **PhysiqMacroTracker** and **watch** targets.
