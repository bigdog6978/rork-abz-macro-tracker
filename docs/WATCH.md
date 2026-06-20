# Apple Watch (watchOS) + iPhone integration

## Compatibility

- Minimum watchOS target: **8.0**
- The **PHYSIQ** wordmark uses SwiftUI `.tracking` for letter-spacing on **watchOS 9+** only (same styling without tracking on 8.x).
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
| `targets/watch/` | SwiftUI app: `PhysiqWatchApp`, `ContentView`, `DayTypePicker`, `WatchPageContainer`, `WatchLayoutMetrics`, `WatchConnectivityManager`, `WatchInteractionFeedback`, `PhysiqPressableButtonStyle`, `PhysiqTheme`, `WatchSnapshot`, `RingGaugeView`. |
| `physiq-watch-connectivity` | Expo module (`PhysiqWatch`) on **iPhone**: `sendProSnapshot`, events `onWatchPayload` / `onActivationChange`. |
| `components/PhysiqWatchSync.tsx` | React: builds **dashboard-aligned** payload (same sources as the home screen) for **all** signed-in users on iOS—not Pro-gated. |
| App Group | `group.app.rork.abz-macro-tracker` (entitlements on main app + synced to watch via apple-targets). Optional for future `ExtensionStorage` / shared files. |

## Snapshot payload (phone → watch)

All values are **strings** (WatchConnectivity / `updateApplicationContext`). The iPhone waits for `WCSession` activation when possible, calls **`updateApplicationContext`**, and when the watch is **reachable** also sends the same dictionary via **`sendMessage`** for faster UI updates.

### Core fields (current)

| Key | Meaning |
|-----|---------|
| `caloriesRemaining` | `max(target − consumed, 0)` (matches dashboard dial center). |
| `caloriesTarget` | Daily calorie target. |
| `caloriesConsumed` | Calories logged today. |
| `proteinConsumed` / `proteinTarget` | Grams (one decimal as string). |
| `carbsConsumed` / `carbsTarget` | Grams. |
| `fatConsumed` / `fatTarget` | Grams. |
| `hydrationConsumedMl` / `hydrationTargetMl` | Hydration from Pro hydration log. |
| `hydration` | Legacy combined display, e.g. `1317/2400 ml`. |
| `streak` | Logging streak count. |
| `firstName` | Greeting. |
| `eatingStyle` | Short label (e.g. Standard). |
| `dietLine` | Eating style + dietary modifiers, e.g. `Standard · Low Glycemic`. |
| `primaryHex` | Theme accent from `ThemeProvider` (e.g. chartreuse `#DEFF00`). |
| `proteinHex` / `carbsHex` / `fatHex` | Macro dial colors (`constants/colors.ts`). |
| `hydrationHex` | Neon water blue `#00D4FF` for the Hydration page (not carbs green or brand accent). |
| `tier` | `core` / `pro` / `athlete` from Pro. |
| `athleteSport` | Sport when Athlete tier; empty otherwise. |
| `dayType` / `dayTypeLabel` | Inferred day type from Health + override engine (`workout_day`, etc.). |
| `dayTypeOverride` | Manual selection: `auto` \| `training` \| `competition` \| `rest` (mirrors Training Mode on iPhone). |
| `dayTypeOverrideLabel` | Human label: Auto, Training, Competition, Rest. |
| `dayTypeSource` | `override` when manual; `inferred` when Auto + Health. |
| `updatedAt` | ISO-8601 timestamp set at send time. |

### Legacy keys (older builds)

`calories`, `protein`, `carbs`, `fat` were **targets only**. The watch parser maps them when the new keys are absent.

### Premium vs core

- **Sync is not subscription-gated.** Any user who has finished onboarding gets a full dashboard snapshot so the Watch matches the phone.
- Pro/Athlete-only **behavior** (dynamic targets, etc.) still lives on the phone; the Watch only displays the latest numbers pushed from the app.

### Watch → phone

- `sendMessage` / `updateApplicationContext` with `action: hydration_ack`; iPhone adds **250 ml** via `addHydration(250)` in `ProProvider` (listener is iOS-wide, not Pro-gated).
- `action: voice_meal` with `transcript` — iPhone runs the same voice meal parser/resolver as Add Food, auto-adds high/medium-confidence matches, and pushes `voiceMealFeedback` back in the next snapshot.
- `action: set_day_type` with `dayType` (`auto` \| `training` \| `competition` \| `rest`) — iPhone updates `ProSettings.dayTypeOverride`; next snapshot includes `dayTypeOverride` + labels for Watch selected state.

## Safe layout (watch UI)

Paged screens use **`WatchPageContainer`** + **`WatchLayoutMetrics`** (`targets/watch/`) so content never overlaps system chrome:

| Zone | Purpose | How it's computed |
|------|---------|-------------------|
| **Top inset** | System time / status bar | `max(safeAreaInsets.top, 28–30pt)` |
| **Bottom inset** | TabView page-indicator dots | `safeAreaInsets.bottom + 22–26pt` (taller on 40–41mm) |
| **Horizontal** | Bezel clearance | 8pt each side |

Non-scroll pages (**Calories**, **Hydration**) vertically center content inside the safe band. Scroll pages (**Macros**, **Today**) respect the same insets and scroll only when content exceeds the band.

**Scaled components** (from available safe height/width):

| Watch class | Approx. height | Hero ring | Mini ring | Streak row |
|-------------|----------------|-----------|-----------|------------|
| 40–41mm | &lt; 210pt | ~88–96pt | ~40–44pt | Hidden if band &lt; 198pt |
| 45mm | 210–240pt | ~100–108pt | ~46–48pt | Shown when space allows |
| 49mm Ultra | &gt; 240pt | up to 112pt | up to 48pt | Shown |

Touch targets use **44pt minimum height** on primary buttons and stat cards.

Hydration UI uses dedicated **neon blue** (`#00D4FF`) — not macro carbs green or chartreuse brand accent.

## Interaction feedback

Primary buttons use **`WatchInteractionFeedback`** (`.click`, `.success`, etc.) plus **`PhysiqPressableButtonStyle`** / **`PhysiqSelectButtonStyle`** for a subtle press scale (respects Reduce Motion). No custom audio on Watch — system click haptics cover sound + tactile feedback. See `docs/INTERACTION-FEEDBACK.md`.

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

## Troubleshooting

| Symptom | Things to check |
|--------|-----------------|
| Watch shows “No macro data yet” | Open the **iPhone app** at least once after install; confirm onboarding is complete. Check Xcode console: `[PhysiqWatchSync]` (JS dev) and `[PhysiqWatch]` / `[PhysiqWatch iPhone]` (DEBUG native). |
| Dashes / stale numbers | Confirm **WCSession** is activated (`Ready` on watch). Toggle the iPhone app to foreground; snapshot is resent on **AppState active** and a few seconds after load. |
| Hydration button does nothing | Phone must process `hydration_ack` (see `ProProvider`); ensure iOS build includes `physiq-watch-connectivity`. |
| Simulator oddities | Pair **watch + phone simulators** in Xcode’s Watch Simulator pairing; WatchConnectivity can be flaky—test on **real devices** for release sign-off. |

## Testing checklist

- [ ] `WCSession` activates on iPhone (DEBUG logs in `PhysiqWatchModule.swift`).
- [ ] Watch UI shows macro snapshot after onboarding completes on phone (core user OK).
- [ ] Hydration button on watch increments hydration on phone when paired.
- [ ] Speak meal on watch adds resolved foods on phone (iPhone app running or reachable).
- [ ] Today page: day-type buttons show selected state; Auto / Train / Comp / Rest sync with iPhone Training Mode.
- [ ] Archive in Xcode includes both **PhysiqMacroTracker** and **watch** targets.
