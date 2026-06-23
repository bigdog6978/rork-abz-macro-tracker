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

## Full-screen layout (watch UI)

Paged screens use **`WatchPageContainer`** + **`WatchLayoutMetrics`** for an **immersive edge-to-edge** layout on 40mm, 45mm, and 49mm watches.

### Root cause (bottom dead band)

`TabView` + `PageTabViewStyle` reports a `GeometryReader` height that **ends above the page-indicator dots**. Prior layouts bottom-pinned footers to that shorter height, leaving a visible empty row between controls and dots. A secondary bug in v2 pinned footers in a `ZStack(alignment: .top)` without `.frame(maxHeight: .infinity)`, so spacers never expanded.

**v4 fix:** `layoutHeight = geo.size.height + pageIndicatorReserve` (~14–18pt by watch class). Footers and hero bands use `layoutHeight`; page dots overlay the bottom band.

### Three-layer page model

| Layer | Content | Position |
|-------|---------|----------|
| **Hero** | Instrument dials / macro cards | Fixed-height band between header and footer |
| **Footer overlay** | Stats, buttons, day-type grid | `.frame(height: layoutHeight, alignment: .bottom)` |
| **Header overlay** | Icon + title + status dot | `safeTop` + `safeLeading` below/side of corner radius |

### Safe zones

| Zone | Purpose | Value |
|------|---------|-------|
| **safeTop** | Clear top-left bezel | 10–14pt by watch height |
| **safeLeading** | Title/icon clear of curve | **6pt** minimum |
| **footerHorizontalInset** | Buttons follow bottom corners | **8pt** each side |
| **pageIndicatorReserve** | Reclaim TabView dot band | **14–18pt** |
| **Horizontal (container)** | Edge bleed for dials | **2pt** |

### System clock

Third-party watchOS apps **cannot hide** the system time. `inlinePageHeader` uses a minimal **8pt** trailing gap (not 44pt). Title stays leading; clock stays system-owned upper-right.

### Instrument dials

Watch rings mirror phone **`CalorieGauge`** and **`MacroRing`** (`components/ui/`):

| Watch view | Phone component | Style |
|------------|-----------------|-------|
| `CalorieInstrumentDial` | `CalorieGauge` | Solid top semicircle + **28** bottom tick segments |
| `MacroInstrumentDial` | `MacroRing` | Locked top semicircle + **20** bottom ticks; **% centered** |

DEBUG builds log `[WatchLayout] geo=… layoutH=… reserve=…` to the console.
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
| **Xcode “66 issues” but app won’t run** | See **[XCODE-BUILD.md](./XCODE-BUILD.md)** — usually **warnings**, not errors. Confirm ⌘B **Build Succeeded**; fix **simulator** (stock iPhone 16, reset CoreSimulator). Do not change watch Swift for Yoga/Expo pod warnings. |
| **`build.db locked`** | Quit Xcode; don’t run `expo run:ios` while Xcode builds; clear DerivedData. |
| **Watch layout changes not visible** | Run `npx expo prebuild --clean -p ios` — Xcode reads generated `ios/`, not `targets/watch/` directly. |

## Testing checklist

- [ ] `WCSession` activates on iPhone (DEBUG logs in `PhysiqWatchModule.swift`).
- [ ] Watch UI shows macro snapshot after onboarding completes on phone (core user OK).
- [ ] Hydration button on watch increments hydration on phone when paired.
- [ ] Speak meal on watch adds resolved foods on phone (iPhone app running or reachable).
- [ ] Today page: day-type buttons show selected state; Auto / Train / Comp / Rest sync with iPhone Training Mode.
- [ ] Archive in Xcode includes both **PhysiqMacroTracker** and **watch** targets.
