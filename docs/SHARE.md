# Share progress (9:16 social cards)

Users generate **1080×1920 vertical PNG** infographics and share to Instagram, TikTok, Facebook, Messages, or Photos.

## Templates

| ID | Card | Data source |
|----|------|-------------|
| `daily_macros` | Calorie ring + P/C/F dials | `DailyLogProvider`, `UserProvider.macros` |
| `progress_photo` | Hero photo + stat chips | `PhotosProvider.latest`, `MeasurementsProvider` trends |
| `body_progress` | Goal score + measurement trends | `MeasurementsProvider`, `GoalSettingsProvider` |

Entry: [`app/share-progress.tsx`](../app/share-progress.tsx) — template chips, preview, caption, **Share to…** sheet.

Home nudge when calories ≥ 90% of target: **Share today's win**.

## Brand layout

- Canvas: **1080×1920** (`utils/share/shareConstants.ts`)
- Logo: [`DashBrandSvg`](../components/ui/DashBrandSvg.tsx) top-left at **14% of width** (~151px)
- Safe zones: avoid critical copy in top 250px / bottom 350px (platform UI overlays)

## Capture pipeline

1. Offscreen full-size card (`ref`, `left: -9999`)
2. `react-native-view-shot` → PNG at 1080×1920
3. 350ms settle delay for gauge animations
4. URI cached until template changes

## Social handoff (hybrid)

Branded [`ShareDestinationSheet`](../components/share/ShareDestinationSheet.tsx) rows call `shareImageToDestination()`:

- Instagram / TikTok / Facebook / Messages / More → `expo-sharing` native sheet
- Save to Photos → `expo-media-library`
- PhysiqMacros community → Facebook group URL

**Note:** iOS cannot post directly to Instagram/TikTok feeds without platform SDKs. The app generates the image and hands off via the system share sheet or Photos.

## Tests

```bash
npm test -- __tests__/shareProgress.test.ts
```

## Key files

- `components/share/ShareCardFrame.tsx` — shared frame + logo
- `components/share/DailyMacrosShareCard.tsx`
- `components/share/ProgressPhotoShareCard.tsx`
- `components/share/BodyProgressShareCard.tsx`
- `utils/share/shareCaption.ts` — template-aware captions
- `utils/share/shareMetrics.ts` — lean mass + stat chips
