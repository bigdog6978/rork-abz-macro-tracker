# Architecture Decisions

## Food Lookup Architecture

### Provider Abstraction

All external food API calls go through the `FoodProvider` interface defined in
`features/food/providers/FoodProvider.ts`. The UI never calls USDA (or any
external API) directly — all access is mediated by `features/food/foodService.ts`.

To add a new provider:
1. Implement `FoodProvider` interface in a new directory under `features/food/providers/`
2. Add a normalizer that converts provider responses to `NormalizedFood`
3. Update `foodService.ts` to use the new provider (one-line swap)

### USDA API Key Setup

Get a free API key at https://fdc.nal.usda.gov/api-key-signup.html

**Local development:** Add to `.env`:
```
EXPO_PUBLIC_USDA_API_KEY=your-key-here
```

**EAS production builds:** Create an EAS secret (required for TestFlight):
```bash
eas secret:create --name usda_api_key --value "your-key-here" --scope project
```

The key is embedded at build time via `app.config.ts` → `extra.USDA_API_KEY` and read at runtime via `Constants.expoConfig?.extra?.USDA_API_KEY`. Do not rely on `process.env` at runtime in standalone builds.

If the key is missing:
- Search shows "Search unavailable. You can still enter macros manually."
- Manual entry remains available

### Caching Strategy

- **Recent foods**: No TTL, always available offline (max 50 entries)
- **Saved foods**: No TTL, always available offline
- **Search cache**: 7-day TTL, stale-while-revalidate pattern
- **Detail cache**: 30-day TTL, stale-while-revalidate pattern
- **Schema version**: `foodCacheSchemaVersion = 1` — on mismatch, caches are
  cleared but user data (logs, recents, saved) is preserved

### Customization Model

When a user selects a USDA food and then edits macros:
- The base `NormalizedFood.per100g` is never modified
- The `FoodEntry` stored in the daily log carries a `customization` field:
  - `isCustomized: true`
  - `reason: 'user_edit'`
  - `baseFoodId`: reference to the original `NormalizedFood.id`
- The dashboard shows an "Edited" indicator on customized entries

### No New Dependencies

This implementation uses only existing project dependencies:
- `@react-native-async-storage/async-storage` for persistence
- `@tanstack/react-query` patterns (used in providers)
- Native `fetch` for USDA API calls
