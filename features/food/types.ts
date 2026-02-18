export interface NormalizedFood {
  id: string;
  providerId: 'usda' | 'manual';
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
