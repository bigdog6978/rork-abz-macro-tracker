import { NormalizedFood } from './types';
import { USDA_API_KEY } from '../../config/env';
import * as usdaClient from './providers/usda/usdaClient';
import { normalizeSearchResult, normalizeDetailResult } from './providers/usda/usdaNormalizer';
import * as foodRepo from '../../storage/foodRepo';
import { FoodEntry } from '../../types';

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

export async function searchSuggestions(
  query: string
): Promise<NormalizedFood[]> {
  if (!query.trim()) return [];

  const results: NormalizedFood[] = [];
  const seen = new Set<string>();

  try {
    const [recents, saved] = await Promise.all([
      foodRepo.getRecentFoods(),
      foodRepo.getSavedFoods(),
    ]);
    const q = query.toLowerCase();

    for (const f of saved) {
      if (f.name.toLowerCase().includes(q) && !seen.has(f.id)) {
        seen.add(f.id);
        results.push(f);
      }
    }
    for (const r of recents) {
      if (r.food.name.toLowerCase().includes(q) && !seen.has(r.food.id)) {
        seen.add(r.food.id);
        results.push(r.food);
      }
    }
  } catch (err) {
    console.log('[foodService] Error loading local foods:', err);
  }

  if (!USDA_API_KEY) {
    console.log('[foodService] No USDA API key, returning local results only');
    return results;
  }

  try {
    const cached = await foodRepo.getCachedSearch(query);
    if (cached) {
      for (const f of cached.results) {
        if (!seen.has(f.id)) {
          seen.add(f.id);
          results.push(f);
        }
      }
      if (cached.expired) {
        refreshSearchInBackground(query);
      }
      return results;
    }

    const response = await usdaClient.searchFoods(query, 10);
    const normalized = (response.foods ?? []).map(normalizeSearchResult);
    await foodRepo.setCachedSearch(query, normalized);

    for (const f of normalized) {
      if (!seen.has(f.id)) {
        seen.add(f.id);
        results.push(f);
      }
    }
  } catch (err) {
    console.log('[foodService] USDA search error:', err);
  }

  return results;
}

function refreshSearchInBackground(query: string): void {
  usdaClient
    .searchFoods(query, 10)
    .then((response) => {
      const normalized = (response.foods ?? []).map(normalizeSearchResult);
      foodRepo.setCachedSearch(query, normalized);
      console.log('[foodService] Background search refreshed for:', query);
    })
    .catch((err) =>
      console.log('[foodService] Background refresh failed:', err)
    );
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
  } catch (err) {
    console.log('[foodService] Cache read error:', err);
  }

  try {
    const detail = await usdaClient.getFoodDetail(externalId);
    const normalized = normalizeDetailResult(detail);
    await foodRepo.setCachedDetail(normalized);
    return normalized;
  } catch (err) {
    console.log('[foodService] USDA detail error:', err);
    return null;
  }
}

function refreshDetailInBackground(externalId: string): void {
  usdaClient
    .getFoodDetail(externalId)
    .then((detail) => {
      const normalized = normalizeDetailResult(detail);
      foodRepo.setCachedDetail(normalized);
      console.log('[foodService] Background detail refreshed for:', externalId);
    })
    .catch((err) =>
      console.log('[foodService] Background detail refresh failed:', err)
    );
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
