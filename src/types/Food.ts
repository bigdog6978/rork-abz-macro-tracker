/**
 * Local SQLite food model for barcode-scanned and saved foods.
 */

export type LocalFoodSource = 'openfoodfacts' | 'manual' | 'usda';

export interface LocalFood {
  id: string;
  name: string;
  brand: string | null;
  barcode: string;
  source: LocalFoodSource;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string | null;
  /** Unit label for unit-based foods (e.g. "egg"). Parsed from serving_size JSON. */
  unitLabel?: string | null;
  /** Grams per 1 unit. Parsed from serving_size JSON. */
  servingWeightG?: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface FoodStatsRow {
  food_id: string;
  selection_count: number;
  last_selected_at: number;
}
