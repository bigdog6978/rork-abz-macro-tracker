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

## Daily Log Storage (July 2026)

### SQLite row-per-entry store

Daily food logs live in `physiq_logs.db` (`storage/dailyLogRepo.ts`), one row
per `FoodEntry` (JSON payload + `date_key` index) — not in the old
`physiq_daily_logs` AsyncStorage blob. Rationale: the blob was rewritten in
full on every add/edit/delete and re-normalized over the entire history on
every launch, so cost grew linearly with lifetime usage. Row writes are O(1)
and per-day queries are indexed.

- **Migration:** one-time, on first open. The legacy blob is normalized once
  (`storage/dailyLogMigration.ts`), inserted in a single transaction, and
  preserved at `physiq_daily_logs_backup_v1` as a rollback path (never
  deleted).
- **Fallback:** if SQLite is unavailable (web) or migration fails, the repo
  transparently falls back to the AsyncStorage blob with the pre-refactor
  behavior. Data is never lost to a failed migration.
- **State ownership:** the React Query cache (`['food_logs']`) is the single
  source of truth in `DailyLogProvider`; mutations are synchronous functional
  cache updates plus fire-and-forget row writes serialized through a write
  queue.

### USDA API key (future)

The USDA key is embedded client-side via `app.config.ts` `extra`. Acceptable
for a free FDC key, but all installs share one rate limit and the key is
extractable. When a backend exists (e.g. for AI photo logging), route USDA
calls through a thin proxy and drop the embedded key — the `FoodProvider`
abstraction makes this a one-file change in `features/food/providers/usda/`.
