/**
 * SQLite repository for local foods (barcode-scanned, saved).
 */

import { openDb } from './db';
import type { LocalFood } from '../types/Food';
import type { NormalizedFood } from '../../features/food/types';

const PREFIX = 'off:';

function toId(barcode: string): string {
  return `${PREFIX}${barcode}`;
}

interface FoodRow {
  id: string;
  name: string;
  brand: string | null;
  barcode: string;
  source: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  serving_size: string | null;
  created_at: number;
  updated_at: number;
}

function mapRow(r: FoodRow): LocalFood {
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    barcode: r.barcode,
    source: r.source as 'openfoodfacts',
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    servingSize: r.serving_size,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export async function upsertFoodFromBarcode(
  barcode: string,
  data: {
    name: string;
    brand?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string | null;
  }
): Promise<LocalFood> {
  const db = await openDb();
  const id = toId(barcode);
  const now = Math.floor(Date.now() / 1000);

  const existing = await db.getFirstAsync<{ id: string }>(
    'SELECT id FROM foods WHERE barcode = ?',
    [barcode]
  );

  if (existing) {
    await db.runAsync(
      `UPDATE foods SET
        name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
        serving_size = ?, updated_at = ?
      WHERE barcode = ?`,
      [
        data.name,
        data.brand ?? null,
        data.calories,
        data.protein,
        data.carbs,
        data.fat,
        data.servingSize ?? null,
        now,
        barcode,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO foods (id, name, brand, barcode, source, calories, protein, carbs, fat, serving_size, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'openfoodfacts', ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        data.name,
        data.brand ?? null,
        barcode,
        data.calories,
        data.protein,
        data.carbs,
        data.fat,
        data.servingSize ?? null,
        now,
        now,
      ]
    );
  }

  const row = await db.getFirstAsync<FoodRow>(
    'SELECT * FROM foods WHERE barcode = ?',
    [barcode]
  );
  if (!row) throw new Error('Failed to read inserted food');
  return mapRow(row);
}

export async function getFoodByBarcode(barcode: string): Promise<LocalFood | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<FoodRow>(
    'SELECT * FROM foods WHERE barcode = ?',
    [barcode]
  );
  return row ? mapRow(row) : null;
}

export async function getFoodById(id: string): Promise<LocalFood | null> {
  if (!id.startsWith(PREFIX)) return null;
  const barcode = id.slice(PREFIX.length);
  return getFoodByBarcode(barcode);
}

export async function getSavedFoods(
  source?: 'openfoodfacts'
): Promise<LocalFood[]> {
  const db = await openDb();
  const rows = source
    ? await db.getAllAsync<FoodRow>('SELECT * FROM foods WHERE source = ? ORDER BY updated_at DESC', [
        source,
      ])
    : await db.getAllAsync<FoodRow>('SELECT * FROM foods ORDER BY updated_at DESC');
  return rows.map(mapRow);
}

/**
 * Search local foods by name (case-insensitive, token match).
 * Used to merge barcode-saved foods into search suggestions.
 */
export async function searchLocalFoods(query: string): Promise<LocalFood[]> {
  if (!query?.trim()) return [];
  const db = await openDb();
  const term = `%${query.trim().toLowerCase()}%`;
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT * FROM foods WHERE LOWER(name) LIKE ? OR (brand IS NOT NULL AND LOWER(brand) LIKE ?) ORDER BY updated_at DESC LIMIT 30`,
    [term, term]
  );
  return rows.map(mapRow);
}

export function localFoodToNormalizedFood(f: LocalFood): NormalizedFood {
  return {
    id: f.id,
    providerId: 'openfoodfacts',
    externalId: f.barcode,
    name: f.name,
    brand: f.brand ?? undefined,
    basis: 'per100g',
    per100g: {
      calories: f.calories,
      protein_g: f.protein,
      carbs_g: f.carbs,
      fat_g: f.fat,
    },
    updatedAt: new Date(f.updatedAt * 1000).toISOString(),
  };
}

export async function recordFoodSelection(foodId: string): Promise<void> {
  const db = await openDb();
  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `INSERT INTO food_stats (food_id, selection_count, last_selected_at)
     VALUES (?, 1, ?)
     ON CONFLICT(food_id) DO UPDATE SET
       selection_count = selection_count + 1,
       last_selected_at = ?`,
    [foodId, now, now]
  );
}
