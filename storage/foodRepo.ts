import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  NormalizedFood,
  RecentFoodEntry,
  CachedSearchResult,
  CachedFoodDetail,
} from '../features/food/types';

const KEYS = {
  recentFoods: 'abz_recent_foods',
  savedFoods: 'abz_saved_foods',
  searchCache: 'abz_search_cache',
  detailsCache: 'abz_details_cache',
  schemaVersion: 'abz_food_cache_version',
};

const CURRENT_SCHEMA_VERSION = 3;
const SEARCH_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DETAIL_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const MAX_RECENT = 50;
const MAX_SEARCH_CACHE_ENTRIES = 100;
const SEARCH_CACHE_PRUNE_TO = 80;

let schemaChecked = false;

async function ensureSchema(): Promise<void> {
  try {
    const version = await AsyncStorage.getItem(KEYS.schemaVersion);
    const current = version ? parseInt(version, 10) : 0;
    if (current < CURRENT_SCHEMA_VERSION) {
      await AsyncStorage.multiRemove([KEYS.searchCache, KEYS.detailsCache]);
      await AsyncStorage.setItem(
        KEYS.schemaVersion,
        String(CURRENT_SCHEMA_VERSION)
      );
      console.log(
        '[foodRepo] Schema migrated to version',
        CURRENT_SCHEMA_VERSION
      );
    }
  } catch (err) {
    console.log('[foodRepo] Schema check error:', err);
  }
}

async function checkSchema(): Promise<void> {
  if (!schemaChecked) {
    await ensureSchema();
    schemaChecked = true;
  }
}

export async function getRecentFoods(): Promise<RecentFoodEntry[]> {
  await checkSchema();
  try {
    const data = await AsyncStorage.getItem(KEYS.recentFoods);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.log('[foodRepo] Error reading recent foods:', err);
    return [];
  }
}

export async function addRecentFood(
  food: NormalizedFood,
  servingGrams: number
): Promise<void> {
  try {
    const recents = await getRecentFoods();
    const filtered = recents.filter((r) => r.food.id !== food.id);
    const entry: RecentFoodEntry = {
      food,
      lastUsedServingGrams: servingGrams,
      lastUsedAt: new Date().toISOString(),
    };
    const updated = [entry, ...filtered].slice(0, MAX_RECENT);
    await AsyncStorage.setItem(KEYS.recentFoods, JSON.stringify(updated));
    console.log('[foodRepo] Added to recent:', food.name);
  } catch (err) {
    console.log('[foodRepo] Error adding recent food:', err);
  }
}

export async function getSavedFoods(): Promise<NormalizedFood[]> {
  await checkSchema();
  try {
    const data = await AsyncStorage.getItem(KEYS.savedFoods);
    return data ? JSON.parse(data) : [];
  } catch (err) {
    console.log('[foodRepo] Error reading saved foods:', err);
    return [];
  }
}

export async function saveFood(food: NormalizedFood): Promise<void> {
  try {
    const saved = await getSavedFoods();
    const filtered = saved.filter((f) => f.id !== food.id);
    await AsyncStorage.setItem(
      KEYS.savedFoods,
      JSON.stringify([food, ...filtered])
    );
    console.log('[foodRepo] Saved food:', food.name);
  } catch (err) {
    console.log('[foodRepo] Error saving food:', err);
  }
}

export async function removeSavedFood(foodId: string): Promise<void> {
  try {
    const saved = await getSavedFoods();
    await AsyncStorage.setItem(
      KEYS.savedFoods,
      JSON.stringify(saved.filter((f) => f.id !== foodId))
    );
  } catch (err) {
    console.log('[foodRepo] Error removing saved food:', err);
  }
}

export async function getCachedSearch(
  query: string
): Promise<{ results: NormalizedFood[]; expired: boolean } | null> {
  await checkSchema();
  try {
    const data = await AsyncStorage.getItem(KEYS.searchCache);
    if (!data) return null;
    const cache: Record<string, CachedSearchResult> = JSON.parse(data);
    const key = query.toLowerCase().trim();
    const entry = cache[key];
    if (!entry) return null;
    const age = Date.now() - new Date(entry.cachedAt).getTime();
    return { results: entry.results, expired: age > SEARCH_TTL_MS };
  } catch (err) {
    console.log('[foodRepo] Error reading search cache:', err);
    return null;
  }
}

export async function setCachedSearch(
  query: string,
  results: NormalizedFood[]
): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(KEYS.searchCache);
    const cache: Record<string, CachedSearchResult> = data
      ? JSON.parse(data)
      : {};
    const key = query.toLowerCase().trim();
    cache[key] = { query: key, results, cachedAt: new Date().toISOString() };

    const keys = Object.keys(cache);
    if (keys.length > MAX_SEARCH_CACHE_ENTRIES) {
      const sorted = keys.sort(
        (a, b) =>
          new Date(cache[a].cachedAt).getTime() -
          new Date(cache[b].cachedAt).getTime()
      );
      for (let i = 0; i < keys.length - SEARCH_CACHE_PRUNE_TO; i++) {
        delete cache[sorted[i]];
      }
    }

    await AsyncStorage.setItem(KEYS.searchCache, JSON.stringify(cache));
  } catch (err) {
    console.log('[foodRepo] Error writing search cache:', err);
  }
}

export async function getCachedDetail(
  foodId: string
): Promise<{ food: NormalizedFood; expired: boolean } | null> {
  await checkSchema();
  try {
    const data = await AsyncStorage.getItem(KEYS.detailsCache);
    if (!data) return null;
    const cache: Record<string, CachedFoodDetail> = JSON.parse(data);
    const entry = cache[foodId];
    if (!entry) return null;
    const age = Date.now() - new Date(entry.cachedAt).getTime();
    return { food: entry.food, expired: age > DETAIL_TTL_MS };
  } catch (err) {
    console.log('[foodRepo] Error reading detail cache:', err);
    return null;
  }
}

export async function setCachedDetail(food: NormalizedFood): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(KEYS.detailsCache);
    const cache: Record<string, CachedFoodDetail> = data
      ? JSON.parse(data)
      : {};
    cache[food.id] = { food, cachedAt: new Date().toISOString() };
    await AsyncStorage.setItem(KEYS.detailsCache, JSON.stringify(cache));
  } catch (err) {
    console.log('[foodRepo] Error writing detail cache:', err);
  }
}
