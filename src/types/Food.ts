/**
 * Local SQLite food model for barcode-scanned and saved foods.
 */

export interface LocalFood {
  id: string;
  name: string;
  brand: string | null;
  barcode: string;
  source: 'openfoodfacts';
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface FoodStatsRow {
  food_id: string;
  selection_count: number;
  last_selected_at: number;
}
