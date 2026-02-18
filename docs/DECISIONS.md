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

Set the environment variable `EXPO_PUBLIC_USDA_API_KEY` with your USDA FoodData
Central API key. Get one free at https://fdc.nal.usda.gov/api-key-signup.html

If the key is missing, the app degrades gracefully:
- Manual entry and recent foods still work
- Search shows "Food lookup unavailable" message

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
