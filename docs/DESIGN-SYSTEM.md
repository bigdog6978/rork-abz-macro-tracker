# Physiq Design System

Tokens live in `theme/` (`tokens.ts` re-exports everything: `Spacing`,
`Radius`, `Gradients`, `Shadows`, `Motion`, `Type`, `Fonts`). This doc is the
contract; the tokens are the implementation.

## Typography

Numbers are this app's UI. Numeric tokens use **Rajdhani** (squared,
instrument-panel numerals matching the watch dial language) with tabular
figures; text tokens stay on the system font (SF) for body legibility.
Fonts are embedded at build via the `expo-font` config plugin
(`assets/fonts/Rajdhani-{Medium,SemiBold,Bold}.ttf`; family names = the
files' PostScript names, identical on iOS and Android).

| Token | Size/Line | Face | Use |
|---|---|---|---|
| `Type.display` | 44/48 | Rajdhani-Bold | Share cards, oversized hero stats |
| `Type.stat` | 30/34 | Rajdhani-Bold | Dial centers, Target/Consumed values |
| `Type.statSm` | 22/26 | Rajdhani-SemiBold | Calorie previews, totals, plan-reveal metrics |
| `Type.numeric` | (size at call site) | Rajdhani-SemiBold | Inline numbers: hydration row, streaks, macro counts |
| `Type.title` | 20/25 · 800 | SF | Screen/sheet titles |
| `Type.heading` | 17/22 · 700 | SF | Section titles, card headers |
| `Type.body` | 15/20 · 500 | SF | Rows, choices, inputs |
| `Type.bodySm` | 13/18 · 500 | SF | Secondary rows, macro summary lines |
| `Type.label` | 12/16 · 700 +0.5 | SF | Input labels, uppercase section markers |
| `Type.caption` | 11/14 · 600 | SF | Badges, hints, tab labels |

**Usage:** spread the token inside `createStyles`, then override only what
the layout needs (color, alignment, occasional size for `numeric`):

```ts
dialNumber: { ...Type.stat, color: colors.text },
hydrationRowText: { ...Type.numeric, fontSize: 14, lineHeight: 18, color: colors.text },
```

**Rules**
- Pure-number displays → Rajdhani tokens. Mixed text+number lines
  ("245 cal · 30p") may use `numeric` when numbers dominate, `bodySm` when
  words dominate.
- Dynamic Type: never cap `maxFontSizeMultiplier` below **1.3**; protect
  layouts with `adjustsFontSizeToFit` + `minimumFontScale` instead.
- No new inline `fontSize` in migrated files — extend the ramp if a real gap
  appears (it shouldn't).

## Color

- **UI code never imports `constants/colors` directly** — read everything
  through `useThemeColors()` (`providers/ThemeProvider`), which spreads the
  static palette and overlays the active accent (`primary`, `primaryMuted`,
  `onPrimary`). ESLint warns on violations (`no-restricted-imports`).
- Contrast floors (on `#0D0D0D`): `text` 15.8:1 · `textSecondary` (#A1A1AA)
  8.2:1 · `textTertiary` (#737373) 4.6:1 — tertiary is the minimum for any
  readable text; decorative strokes only below that.
- **Watch bridge:** JS colors flow to watchOS via the snapshot payload
  (`primaryHex`, `proteinHex`, `carbsHex`, `fatHex`, `hydrationHex` — see
  `features/pro/buildWatchSnapshot.ts`). Swift `PhysiqTheme` values are
  offline fallbacks only; change colors in `constants/colors.ts` /
  `theme/accentThemes.ts`, never in Swift first.
- The app is **dark-only** (`userInterfaceStyle: 'dark'`), so system sheets,
  alerts, and the keyboard match.

## Ring treatment (instrument dials)

`CalorieGauge` and `MacroRing` share the glow spec (keep in sync):

- **Glow:** the arc path drawn twice beneath the crisp stroke —
  `strokeWidth × 2.6` at 14% of the arc color, then `× 1.6` at 22%
  (layered strokes; no SVG filters). Active bottom dashes glow only when lit.
- **Bed:** the gauge's background disc is a radial gradient of the arc color
  at 6% → transparent (`withAlpha` from `theme/accentThemes.ts`).
- Everything derives from the `color` prop, so accent-theme switches retint
  live. Cost: 2–3 extra static `<Path>`s per ring.

## Motion & feedback (existing identity — reuse, don't reinvent)

- Press scale + haptic/sound via `PhysiqPressable` + `utils/interactionFeedback`
  (`tap`/`select`/`confirm`/`destructive`/`success`), mirrored on watch.
- Entry animation: `useStaggerFadeIn` / `useFadeIn` (`utils/motion.ts`).
- Tokens: `Motion` in `theme/tokens.ts` (spring configs, press scale).

## Migration status

Migrated to ramp + themed colors: dashboard + `components/home/*`,
Add Food + `components/add-food/*`, onboarding, tab chrome,
`GreetingHeader`, `Fab`, `TabScreenTitle`, `MacroRing`/`CalorieGauge`.

Remaining (migrate opportunistically when touching them — same pattern):
history, plan, settings bodies, share cards (give these `Type.display`),
edit-log-entry, saved-foods, measurement screens, watch Swift Rajdhani
(separate native task: bundle fonts into the watch target).
