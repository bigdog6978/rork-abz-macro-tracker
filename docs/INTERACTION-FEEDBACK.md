# Interaction feedback

Unified tap feedback across iPhone, iPad, and watchOS: **micro-motion**, **haptics**, and optional **UI click** on phone.

## Intent taxonomy

| Intent | When | Phone haptic | Watch haptic | Sound |
|--------|------|--------------|--------------|-------|
| `tap` | Default button/chip | Light impact | `.click` | Soft click |
| `select` | Pills, toggles, day type | Selection | `.click` | Soft click |
| `confirm` | Save, log, Continue | Medium impact | `.click` | Louder click |
| `success` | Completed action | Success notification | `.success` | None |
| `warning` | Partial failure | Warning notification | `.retry` | None |
| `destructive` | Delete | Medium impact | `.failure` | Muted click |

## Phone / tablet (React Native)

- **`utils/interactionFeedback.ts`** — `playFeedback(intent)`, sound preload, reduce-motion listener.
- **`components/ui/PhysiqPressable.tsx`** — wrap tappable UI; fires feedback on press-in + spring scale (unless Reduce Motion).
- **`components/InteractionFeedbackInit.tsx`** — mounted in `app/_layout.tsx`; preloads click sound at launch.
- **Setting:** `ProSettings.soundEffectsEnabled` (default `true`) — Settings → Sound Effects chip.

### Migration pattern

Replace `TouchableOpacity` + inline `Haptics.*`:

```tsx
<PhysiqPressable feedback="select" style={styles.chip} onPress={onPress}>
  {children}
</PhysiqPressable>
```

For programmatic outcomes (toast after save), call `playFeedback('success')` once — no wrapper.

### Audio

- Asset: `assets/sounds/ui-click.wav` (~40ms synthetic click).
- `expo-audio` (`createAudioPlayer` + `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' })`) so the ambient UI click plays even while muted without ducking other audio.
- `expo-audio` is lazy-`require`d inside a `try/catch`; if the native module is unavailable (e.g. stale dev build), feedback silently degrades to **haptics-only** and never breaks rendering.
- Debounced to 80ms between clicks.

## watchOS (SwiftUI)

- **`WatchInteractionFeedback.swift`** — `WatchInteractionFeedback.play(.tap | .select | …)`.
- **`PhysiqPressableButtonStyle.swift`** — scale to 0.96 on press; `PhysiqSelectButtonStyle` for grids (0.97).
- System `.click` provides haptic + watch click sound — no bundled audio on Watch.

Applied to: `ContentView` quick-actions, `DayTypePicker`, `VoiceMealMicBar` / `VoiceMealLegacySheet`.

## Accessibility

- **Reduce Motion:** scale disabled; haptic + sound (if enabled) remain.
- **Web:** haptics and sound no-op.
- Haptics follow iOS/watchOS system settings; no in-app haptic toggle.

## Adding feedback to new screens

1. Use `PhysiqPressable` for buttons/chips.
2. Pick the closest intent from the table above.
3. Do not add duplicate `Haptics.*` at the call site.
