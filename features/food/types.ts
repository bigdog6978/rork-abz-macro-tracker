export interface NormalizedFood {
  id: string;
  providerId: 'usda' | 'manual' | 'openfoodfacts' | 'cofid_uk';
  externalId?: string;
  name: string;
  brand?: string;
  basis: 'per100g';
  per100g: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  /** Grams per 1 serving when basis supports it */
  servingWeightGrams?: number;
  /** Milliliters per 1 serving for volume-based package servings */
  servingVolumeMl?: number;
  /** Density (g/ml) for volume→grams conversion */
  density_g_per_ml?: number | null;
  /** Unit label stored when food was saved (e.g. 'oz', 'g', 'lb', 'egg', 'strip') */
  unitLabel?: string;
  /** Original quantity the user entered when saving (e.g. 6 for "6 oz"). */
  savedQuantity?: number | null;
  updatedAt: string;
}

export interface FoodLogEntry {
  id: string;
  date: string;
  name: string;
  providerId: 'usda' | 'manual';
  externalId?: string;
  serving: { amount: number; unit: string };
  macros: {
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
  };
  customization?: {
    isCustomized: boolean;
    reason?: 'user_edit';
    baseFoodId?: string;
  };
}

export interface RecentFoodEntry {
  food: NormalizedFood;
  lastUsedServingGrams: number;
  lastUsedAt: string;
}

export interface CachedSearchResult {
  query: string;
  results: NormalizedFood[];
  cachedAt: string;
}

export interface CachedFoodDetail {
  food: NormalizedFood;
  cachedAt: string;
}
