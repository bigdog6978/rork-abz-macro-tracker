import { NormalizedFood } from './types';
import {
  UnitId,
  UnitKind,
  toGrams,
  toMilliliters,
  mlToGrams,
} from '../../src/lib/units';
import { getUsdaApiKey } from '../../config/env';
import * as usdaClient from './providers/usda/usdaClient';
import { normalizeSearchResult, normalizeDetailResult } from './providers/usda/usdaNormalizer';
import * as foodRepo from '../../storage/foodRepo';
import * as foodsRepo from '../../src/data/foodsRepo';
import { openDb } from '../../src/data/db';
import { FoodEntry, NutrientsPer100g } from '../../types';
import {
  rankFoods,
  FoodItem,
  FoodStats,
} from '../../src/search/foodSearch';

const SEARCH_PAGE_SIZE = 50;

export type SearchResult =
  | { status: 'ok'; results: NormalizedFood[] }
  | { status: 'empty'; results: [] }
  | { status: 'error'; errorCode?: string; errorDetail?: string }
  | { status: 'rate_limited' };

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export type ScalingResult =
  | { ok: true; macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number }; gramsUsedForScaling: number }
  | { ok: false; reason: 'NEEDS_DENSITY' }
  | { ok: false; reason: 'UNSUPPORTED_SERVING' }
  | { ok: false; reason: 'NEEDS_SERVING_INFO' };

export function computeMacrosForServing(
  food: NormalizedFood,
  grams: number
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const factor = grams / 100;
  return {
    calories: Math.round(food.per100g.calories * factor),
    protein_g: Math.round(food.per100g.protein_g * factor * 10) / 10,
    carbs_g: Math.round(food.per100g.carbs_g * factor * 10) / 10,
    fat_g: Math.round(food.per100g.fat_g * factor * 10) / 10,
  };
}

/** Scale macros from quantity with unit. Returns ok + macros or error state. */
export function scaleMacrosFromQuantity(
  food: NormalizedFood,
  value: number,
  unit: UnitId,
  kind: UnitKind
): ScalingResult {
  const basis = food.basis ?? 'per100g';

  if (basis === 'per100g') {
    if (kind === 'mass') {
      const grams = toGrams(value, unit);
      const macros = computeMacrosForServing(food, grams);
      return { ok: true, macros, gramsUsedForScaling: grams };
    }
    if (kind === 'volume') {
      const ml = toMilliliters(value, unit);
      const density = food.density_g_per_ml;
      if (typeof density !== 'number' || density <= 0) {
        return { ok: false, reason: 'NEEDS_DENSITY' };
      }
      const grams = mlToGrams(ml, density);
      const macros = computeMacrosForServing(food, grams);
      return { ok: true, macros, gramsUsedForScaling: grams };
    }
    if (kind === 'serving') {
      const servingWeightG = food.servingWeightGrams;
      if (typeof servingWeightG !== 'number' || servingWeightG <= 0) {
        return { ok: false, reason: 'UNSUPPORTED_SERVING' };
      }
      const grams = value * servingWeightG;
      const macros = computeMacrosForServing(food, grams);
      return { ok: true, macros, gramsUsedForScaling: grams };
    }
  }

  // perServing: only if food has servingWeightGrams and we support it
  const servingWeightG = food.servingWeightGrams;
  if (kind === 'serving') {
    if (typeof servingWeightG === 'number' && servingWeightG > 0) {
      const grams = value * servingWeightG;
      const macros = computeMacrosForServing(food, grams);
      return { ok: true, macros, gramsUsedForScaling: grams };
    }
    return { ok: false, reason: 'UNSUPPORTED_SERVING' };
  }

  // Fallback: per100g with mass
  const grams = toGrams(value, unit);
  const macros = computeMacrosForServing(food, grams);
  return { ok: true, macros, gramsUsedForScaling: grams };
}

const OZ_TO_GRAMS = 28.349523125;

/** Compute macros from nutrientsPer100g and total grams */
export function computeMacrosFromNutrients(
  per100g: NutrientsPer100g,
  totalGrams: number
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  const factor = totalGrams / 100;
  return {
    calories: Math.round(per100g.calories * factor),
    protein_g: Math.round(per100g.protein_g * factor * 10) / 10,
    carbs_g: Math.round(per100g.carbs_g * factor * 10) / 10,
    fat_g: Math.round(per100g.fat_g * factor * 10) / 10,
  };
}

/** Compute total grams from measure mode, quantity, and servingWeightG */
export function computeTotalGrams(
  measureMode: 'qty' | 'grams' | 'ounces' | 'units',
  quantity: number,
  servingWeightG?: number
): number {
  const mode = measureMode === 'units' ? 'qty' : measureMode;
  if (mode === 'ounces') return quantity * OZ_TO_GRAMS;
  if (mode === 'qty' && typeof servingWeightG === 'number' && servingWeightG > 0) {
    return quantity * servingWeightG;
  }
  return quantity;
}

export function isApiAvailable(): boolean {
  return !!getUsdaApiKey();
}

function toFoodItem(f: NormalizedFood): FoodItem {
  return {
    id: f.id,
    name: f.name,
    brand: f.brand ?? null,
    calories: f.per100g?.calories,
    protein: f.per100g?.protein_g,
    carbs: f.per100g?.carbs_g,
    fat: f.per100g?.fat_g,
  };
}

async function getFoodStatsMap(): Promise<Record<string, FoodStats>> {
  const recents = await foodRepo.getRecentFoods();
  const map: Record<string, FoodStats> = {};
  for (const r of recents) {
    const id = r.food.id;
    const existing = map[id];
    const lastAt = new Date(r.lastUsedAt).getTime();
    if (existing) {
      existing.selectionCount += 1;
      existing.lastSelectedAt = Math.max(existing.lastSelectedAt, lastAt);
    } else {
      map[id] = { selectionCount: 1, lastSelectedAt: lastAt };
    }
  }
  try {
    const db = await openDb();
    const stats = await db.getAllAsync<{ food_id: string; selection_count: number; last_selected_at: number }>(
      'SELECT food_id, selection_count, last_selected_at FROM food_stats'
    );
    for (const s of stats) {
      const existing = map[s.food_id];
      if (existing) {
        existing.selectionCount = Math.max(existing.selectionCount, s.selection_count);
        existing.lastSelectedAt = Math.max(existing.lastSelectedAt, s.last_selected_at * 1000);
      } else {
        map[s.food_id] = {
          selectionCount: s.selection_count,
          lastSelectedAt: s.last_selected_at * 1000,
        };
      }
    }
  } catch {
    // SQLite may not be ready
  }
  return map;
}

export async function searchSuggestions(query: string): Promise<SearchResult> {
  if (!query.trim()) {
    return { status: 'empty', results: [] };
  }

  const q = query.trim();

  // Always fetch local (SQLite) foods for search — available offline
  let localResults: NormalizedFood[] = [];
  try {
    const localFoods = await foodsRepo.searchLocalFoods(q);
    localResults = localFoods.map(foodsRepo.localFoodToNormalizedFood);
  } catch {
    // SQLite may not be ready
  }

  if (!getUsdaApiKey()) {
    if (localResults.length > 0) {
      const items = localResults.map(toFoodItem);
      const statsMap = await getFoodStatsMap();
      const ranked = rankFoods(items, q, statsMap);
      const byId = new Map(localResults.map((f) => [f.id, f]));
      const reordered = ranked.map((r) => byId.get(r.id)!).filter(Boolean);
      return { status: 'ok', results: reordered };
    }
    return { status: 'error', errorCode: 'USDA_API_KEY_MISSING' };
  }

  try {
    const cached = await foodRepo.getCachedSearch(query);
    if (cached && !cached.expired) {
      const results = cached.results ?? [];
      const merged = mergeAndDedupe(localResults, results);
      if (merged.length > 0) {
        const items = merged.map(toFoodItem);
        const statsMap = await getFoodStatsMap();
        const ranked = rankFoods(items, q, statsMap);
        const byId = new Map(merged.map((f) => [f.id, f]));
        const reordered = ranked.map((r) => byId.get(r.id)!).filter(Boolean);
        return { status: 'ok', results: reordered };
      }
      return { status: 'empty', results: [] };
    }

    const response = await usdaClient.searchFoods(query, SEARCH_PAGE_SIZE);
    const normalized = (response.foods ?? []).map(normalizeSearchResult);
    await foodRepo.setCachedSearch(query, normalized);

    if (cached?.expired) {
      refreshSearchInBackground(query);
    }

    const merged = mergeAndDedupe(localResults, normalized);
    if (merged.length > 0) {
      const items = merged.map(toFoodItem);
      const statsMap = await getFoodStatsMap();
      const ranked = rankFoods(items, q, statsMap);
      const byId = new Map(merged.map((f) => [f.id, f]));
      const reordered = ranked.map((r) => byId.get(r.id)!).filter(Boolean);
      return { status: 'ok', results: reordered };
    }
    return { status: 'empty', results: [] };
  } catch (err) {
    const usdaErr = err instanceof usdaClient.USDARequestError ? err : null;
    const errorCode = usdaErr?.code;
    const errorDetail = usdaErr?.usdaMessage;
    if (usdaErr?.isRateLimit) {
      if (localResults.length > 0) {
        const items = localResults.map(toFoodItem);
        const statsMap = await getFoodStatsMap();
        const ranked = rankFoods(items, q, statsMap);
        const byId = new Map(localResults.map((f) => [f.id, f]));
        const reordered = ranked.map((r) => byId.get(r.id)!).filter(Boolean);
        return { status: 'ok', results: reordered };
      }
      return { status: 'rate_limited' };
    }
    if (localResults.length > 0) {
      const items = localResults.map(toFoodItem);
      const statsMap = await getFoodStatsMap();
      const ranked = rankFoods(items, q, statsMap);
      const byId = new Map(localResults.map((f) => [f.id, f]));
      const reordered = ranked.map((r) => byId.get(r.id)!).filter(Boolean);
      return { status: 'ok', results: reordered };
    }
    return { status: 'error', errorCode: errorCode ?? 'UNKNOWN', errorDetail };
  }
}

function mergeAndDedupe(
  local: NormalizedFood[],
  usda: NormalizedFood[]
): NormalizedFood[] {
  const seen = new Set<string>();
  const out: NormalizedFood[] = [];
  for (const f of local) {
    if (!seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  for (const f of usda) {
    if (!seen.has(f.id)) {
      seen.add(f.id);
      out.push(f);
    }
  }
  return out;
}

function refreshSearchInBackground(query: string): void {
  usdaClient
    .searchFoods(query, SEARCH_PAGE_SIZE)
    .then((response) => {
      const normalized = (response.foods ?? []).map(normalizeSearchResult);
      foodRepo.setCachedSearch(query, normalized);
    })
    .catch(() => {});
}

export async function getFood(
  externalId: string
): Promise<NormalizedFood | null> {
  const cacheKey = `usda:${externalId}`;

  try {
    const cached = await foodRepo.getCachedDetail(cacheKey);
    if (cached) {
      if (cached.expired) {
        refreshDetailInBackground(externalId);
      }
      return cached.food;
    }
  } catch {
    // ignore cache read errors
  }

  try {
    const detail = await usdaClient.getFoodDetail(externalId);
    const normalized = normalizeDetailResult(detail);
    await foodRepo.setCachedDetail(normalized);
    return normalized;
  } catch {
    return null;
  }
}

function refreshDetailInBackground(externalId: string): void {
  usdaClient
    .getFoodDetail(externalId)
    .then((detail) => {
      const normalized = normalizeDetailResult(detail);
      foodRepo.setCachedDetail(normalized);
    })
    .catch(() => {});
}

export async function addToRecent(
  food: NormalizedFood,
  grams: number
): Promise<void> {
  await foodRepo.addRecentFood(food, grams);
}

export async function saveFoodToFavorites(
  food: NormalizedFood
): Promise<void> {
  await foodRepo.saveFood(food);
}

export function createFoodEntry(
  food: NormalizedFood | null,
  name: string,
  servingGrams: number,
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  isCustomized: boolean,
  opts?: {
    measureMode?: 'qty' | 'grams' | 'ounces';
    quantity?: number;
    servingWeightG?: number;
  }
): FoodEntry {
  const entry: FoodEntry = {
    id: generateId(),
    name,
    protein_g: Math.round(macros.protein_g * 10) / 10,
    carbs_g: Math.round(macros.carbs_g * 10) / 10,
    fat_g: Math.round(macros.fat_g * 10) / 10,
    calories: Math.round(macros.calories),
    timestamp: new Date().toISOString(),
    providerId: food?.providerId ?? 'manual',
    externalId: food?.externalId,
    servingGrams,
    isCustomMacros: isCustomized,
  };

  if (opts?.measureMode) {
    entry.measureMode = opts.measureMode;
    entry.quantity = opts.quantity ?? (opts.measureMode === 'qty' && opts.servingWeightG
      ? servingGrams / opts.servingWeightG
      : opts.measureMode === 'ounces'
        ? servingGrams / OZ_TO_GRAMS
        : servingGrams);
    if (opts.measureMode === 'qty' && opts.servingWeightG) {
      entry.servingWeightG = opts.servingWeightG;
    }
  } else {
    entry.quantity = servingGrams;
    entry.measureMode = 'grams';
  }

  if (food) {
    entry.nutrientsPer100g = {
      calories: food.per100g.calories,
      protein_g: food.per100g.protein_g,
      carbs_g: food.per100g.carbs_g,
      fat_g: food.per100g.fat_g,
    };
  }

  if (isCustomized && food) {
    entry.customization = {
      isCustomized: true,
      reason: 'user_edit',
      baseFoodId: food.id,
    };
  }

  return entry;
}

export function createManualNormalizedFood(
  name: string,
  macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number },
  servingGrams: number
): NormalizedFood {
  const factor = servingGrams > 0 ? 100 / servingGrams : 1;
  return {
    id: `manual:${generateId()}`,
    providerId: 'manual',
    name,
    basis: 'per100g',
    per100g: {
      calories: Math.round(macros.calories * factor),
      protein_g: Math.round(macros.protein_g * factor * 10) / 10,
      carbs_g: Math.round(macros.carbs_g * factor * 10) / 10,
      fat_g: Math.round(macros.fat_g * factor * 10) / 10,
    },
    updatedAt: new Date().toISOString(),
  };
}

export { usdaHealthCheck } from './providers/usda/usdaClient';

export async function getRecentFoodsList(): Promise<
  { food: NormalizedFood; lastServingGrams: number }[]
> {
  const recents = await foodRepo.getRecentFoods();
  return recents.map((r) => ({
    food: r.food,
    lastServingGrams: r.lastUsedServingGrams,
  }));
}
