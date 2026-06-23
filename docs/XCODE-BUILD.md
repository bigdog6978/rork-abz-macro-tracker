# Xcode build & simulator troubleshooting

Physiq Macro Tracker — Expo SDK 54, React Native New Architecture, `expo-dev-client`, watch target via `@bacons/apple-targets`.

## Quick diagnosis: ⌘B vs ⌘R

| Step | Meaning |
|------|---------|
| **Product → Build (⌘B)** | **Compile** — does Swift/Obj-C/Pods compile? |
| **Product → Run (⌘R)** | **Run** — boot simulator, install app, launch |

If ⌘B succeeds but ⌘R fails, the problem is **simulator / install**, not your app source.

Verify from terminal:

```bash
cd ios
xcodebuild -workspace PhysiqMacroTracker.xcworkspace -scheme PhysiqMacroTracker \
  -configuration Debug \
  -destination 'platform=iOS Simulator,id=770AA0FB-29C4-4379-9E57-66E3B9045918' \
  build
```

Expect **`BUILD SUCCEEDED`**. Watch scheme:

```bash
xcodebuild -workspace PhysiqMacroTracker.xcworkspace -scheme watch \
  -configuration Debug \
  -destination 'platform=watchOS Simulator,id=90FE08C6-59B2-48B9-9F6D-92BD33EE29E1' \
  build
```

Run **one scheme at a time** — parallel builds cause `build.db locked`.

---

## “66 issues” in Issue Navigator

Xcode counts **warnings + errors** as “issues.” Most are **yellow warnings** from third-party pods — **not build failures**.

| Warning | Source | Action |
|---------|--------|--------|
| `Non-portable path to file '<Yoga/…>'` | React Native Yoga headers | **Ignore** on macOS (case-insensitive APFS) |
| `Pointer is missing a nullability type specifier` | Expo `EX*` pod headers | **Ignore** |
| `Cannot find protocol definition for 'RCTHostDelegate'` | `expo-dev-launcher` indexer | **Ignore if ⌘B succeeds** |
| `Ignoring duplicate libraries: '-lc++'` | CocoaPods linker | **Ignore** |
| Hermes / RN script phase “will be run during every build” | Pods | **Ignore** |

**Filter:** Issue Navigator → **Errors Only**. Trust **Build Succeeded** on ⌘B.

Do **not** rewrite watch Swift or app code to fix these.

---

## Root-cause table (common failures)

| Symptom | Layer | Likely cause | Fix |
|---------|-------|--------------|-----|
| 66 yellow issues, ⌘B succeeds | Warnings | Expo/RN/Yoga pods | Filter to errors only |
| `build.db locked` | Compile | Xcode + CLI building same DerivedData | Quit Xcode; one build at a time; clear DerivedData |
| `Timed out boot simulator 60s` | Run | CoreSimulator stuck | Reset simulators (below) |
| `Invalid device state` / exit 149 | Run | Sim not booted or service crashed | Boot stock iPhone 16; reset service |
| `Mach error -308 server died` | Run | CoreSimulator service died | `killall` + restart Simulator |
| `simctl install` exit 204 | Run | Same as above | Reset + stock simulator |
| Custom sim (e.g. CaboWabo3) | Run | Corrupt device state | Use **iPhone 16** (iOS 18.5) |

---

## Recommended simulator setup

Use **stock** simulators, not custom clones:

| Device | UUID (example) | Use |
|--------|----------------|-----|
| iPhone 16 (iOS 18.5) | `770AA0FB-29C4-4379-9E57-66E3B9045918` | Primary iOS run |
| Physiq Watch (watchOS 26.2) | `90FE08C6-59B2-48B9-9F6D-92BD33EE29E1` | Watch UI (pair with iPhone) |

List yours:

```bash
xcrun simctl list devices available | grep "iPhone 16 "
xcrun simctl list devices available | grep "Physiq Watch"
```

---

## Reset simulators (Run failures)

```bash
killall Simulator 2>/dev/null
killall com.apple.CoreSimulator.CoreSimulatorService 2>/dev/null
xcrun simctl shutdown all

# Boot stock iPhone 16 (replace UUID if needed)
xcrun simctl boot 770AA0FB-29C4-4379-9E57-66E3B9045918
open -a Simulator
```

In Xcode: scheme **PhysiqMacroTracker**, destination **iPhone 16**, ⌘R.

Avoid `npx expo run:ios` with custom device names until sim is stable.

---

## Clear DerivedData (build.db locked)

```bash
# Quit Xcode first
rm -rf ~/Library/Developer/Xcode/DerivedData/PhysiqMacroTracker-*
```

Never run **⌘B in Xcode** and **`expo run:ios`** at the same time.

---

## If compile actually fails (red errors on ⌘B)

1. Open **`ios/PhysiqMacroTracker.xcworkspace`** (not `.xcodeproj`).
2. Scheme: **PhysiqMacroTracker** (not a Pod sub-scheme).
3. Regenerate native project:

```bash
cd /path/to/rork-abz-macro-tracker
npx expo prebuild --clean -p ios
npx pod-install ios
```

4. If Pods corrupt:

```bash
cd ios && rm -rf Pods Podfile.lock build && pod install
```

5. Check disk space: `df -h /` (need several GB free for DerivedData).

6. Build settings: ensure **Treat Warnings as Errors** is **No** for Debug.

---

## Watch target

- Swift sources: `targets/watch/` → synced on `expo prebuild`.
- Typecheck:  
  `xcrun -sdk watchsimulator swiftc -typecheck -target arm64-apple-watchos9.0-simulator targets/watch/*.swift`
- Run **PhysiqMacroTracker** on paired iPhone sim (embeds watch app), or **watch** scheme after iPhone sim is healthy.

See [WATCH.md](./WATCH.md) for layout and pairing notes.

---

## Verified healthy state (2026-06-23)

- `xcodebuild` **PhysiqMacroTracker** → BUILD SUCCEEDED  
- `xcodebuild` **watch** → BUILD SUCCEEDED (when not concurrent with iOS build)  
- `simctl install` on iPhone 16 (`770AA0FB-…`) → success  
- Watch Swift typecheck → pass  

Failure mode for this project was **Run/Simulator + build.db contention**, not compile errors from watch layout changes.
