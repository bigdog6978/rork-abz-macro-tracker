import { NormalizedFood } from './types';
import { USDA_API_KEY } from '../../config/env';
import * as usdaClient from './providers/usda/usdaClient';
import { normalizeSearchResult, normalizeDetailResult } from './providers/usda/usdaNormalizer';
import * as foodRepo from '../../storage/foodRepo';
import { FoodEntry } from '../../types';

export type SearchResult =
  | { status: 'ok'; results: NormalizedFood[] }
  | { status: 'empty'; results: [] }
  | { status: 'error' }
  | { status: 'rate_limited' };

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

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

export function isApiAvailable(): boolean {
  return !!USDA_API_KEY;
}

export async function searchSuggestions(query: string): Promise<SearchResult> {
  if (!query.trim()) {
    return { status: 'empty', results: [] };
  }

  if (!USDA_API_KEY) {
    return { status: 'error' };
  }

  try {
    const cached = await foodRepo.getCachedSearch(query);
    if (cached && !cached.expired) {
      const results = cached.results ?? [];
      if (results.length > 0) {
        return { status: 'ok', results };
      }
      return { status: 'empty', results: [] };
    }

    const response = await usdaClient.searchFoods(query, 10);
    const normalized = (response.foods ?? []).map(normalizeSearchResult);
    await foodRepo.setCachedSearch(query, normalized);

    if (cached?.expired) {
      refreshSearchInBackground(query);
    }

    if (normalized.length > 0) {
      return { status: 'ok', results: normalized };
    }
    return { status: 'empty', results: [] };
  } catch (err) {
    if (err instanceof usdaClient.USDARequestError && err.isRateLimit) {
      return { status: 'rate_limited' };
    }
    return { status: 'error' };
  }
}

function refreshSearchInBackground(query: string): void {
  usdaClient
    .searchFoods(query, 10)
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
  isCustomized: boolean
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
  };

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

export async function getRecentFoodsList(): Promise<
  { food: NormalizedFood; lastServingGrams: number }[]
> {
  const recents = await foodRepo.getRecentFoods();
  return recents.map((r) => ({
    food: r.food,
    lastServingGrams: r.lastUsedServingGrams,
  }));
}
