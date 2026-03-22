/**
 * SQLite repository for local foods (barcode-scanned, saved).
 */

import { openDb } from './db';
import type { LocalFood, LocalFoodSource } from '../types/Food';
import type { NormalizedFood } from '../../features/food/types';
import { applyKnownLiquidDensity } from '../../features/food/liquidDensity';

const PREFIX_OFF = 'off:';
const PREFIX_MANUAL = 'manual:';
const PREFIX_USDA = 'usda:';

function toId(barcode: string, source: LocalFoodSource): string {
  if (source === 'manual' || source === 'usda') return barcode;
  return `${PREFIX_OFF}${barcode}`;
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

function parseUnitMeta(servingSize: string | null): {
  unitLabel?: string;
  servingWeightG?: number;
  servingVolumeMl?: number;
  density_g_per_ml?: number | null;
} {
  if (!servingSize?.trim().startsWith('{')) return {};
  try {
    const parsed = JSON.parse(servingSize) as {
      unitLabel?: string;
      servingWeightG?: number;
      servingVolumeMl?: number;
      density_g_per_ml?: number | null;
    };
    return {
      unitLabel: typeof parsed.unitLabel === 'string' ? parsed.unitLabel : undefined,
      servingWeightG: typeof parsed.servingWeightG === 'number' ? parsed.servingWeightG : undefined,
      servingVolumeMl: typeof parsed.servingVolumeMl === 'number' ? parsed.servingVolumeMl : undefined,
      density_g_per_ml: typeof parsed.density_g_per_ml === 'number' ? parsed.density_g_per_ml : undefined,
    };
  } catch {
    // Legacy format
  }
  return {};
}

function encodeServingSize(opts: {
  servingSize?: string | null;
  unitLabel?: string | null;
  servingWeightG?: number | null;
  servingVolumeMl?: number | null;
  density_g_per_ml?: number | null;
}): string | null {
  const hasMeta =
    (opts.unitLabel && typeof opts.servingWeightG === 'number') ||
    typeof opts.servingVolumeMl === 'number' ||
    typeof opts.density_g_per_ml === 'number';
  if (hasMeta) {
    const obj: Record<string, unknown> = {};
    if (opts.unitLabel && typeof opts.servingWeightG === 'number') {
      obj.unitLabel = opts.unitLabel;
      obj.servingWeightG = opts.servingWeightG;
    }
    if (typeof opts.servingVolumeMl === 'number') {
      obj.servingVolumeMl = opts.servingVolumeMl;
      if (opts.unitLabel) {
        obj.unitLabel = opts.unitLabel;
      }
    }
    if (typeof opts.density_g_per_ml === 'number') {
      obj.density_g_per_ml = opts.density_g_per_ml;
    }
    return JSON.stringify(obj);
  }
  return opts.servingSize ?? null;
}

function mapRow(r: FoodRow): LocalFood {
  const meta = parseUnitMeta(r.serving_size);
  return {
    id: r.id,
    name: r.name,
    brand: r.brand,
    barcode: r.barcode,
    source: r.source as LocalFoodSource,
    calories: r.calories,
    protein: r.protein,
    carbs: r.carbs,
    fat: r.fat,
    servingSize: r.serving_size,
    unitLabel: meta.unitLabel ?? null,
    servingWeightG: meta.servingWeightG ?? null,
    servingVolumeMl: meta.servingVolumeMl ?? null,
    density_g_per_ml: meta.density_g_per_ml ?? null,
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
    unitLabel?: string | null;
    servingWeightG?: number | null;
    servingVolumeMl?: number | null;
    density_g_per_ml?: number | null;
  }
): Promise<LocalFood> {
  const db = await openDb();
  const id = toId(barcode, 'openfoodfacts');
  const now = Math.floor(Date.now() / 1000);

  const servingSizeEnc = encodeServingSize({
    servingSize: data.servingSize,
    unitLabel: data.unitLabel,
    servingWeightG: data.servingWeightG,
    servingVolumeMl: data.servingVolumeMl,
    density_g_per_ml: data.density_g_per_ml,
  });

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
        servingSizeEnc,
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
        servingSizeEnc,
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
  const db = await openDb();
  const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  return row ? mapRow(row) : null;
}

export async function getSavedFoods(
  source?: LocalFoodSource
): Promise<LocalFood[]> {
  const db = await openDb();
  const rows = source
    ? await db.getAllAsync<FoodRow>('SELECT * FROM foods WHERE source = ? ORDER BY updated_at DESC', [
        source,
      ])
    : await db.getAllAsync<FoodRow>('SELECT * FROM foods ORDER BY updated_at DESC');
  return rows.map(mapRow);
}

export async function deleteSavedFood(id: string): Promise<void> {
  const db = await openDb();
  await db.runAsync('DELETE FROM foods WHERE id = ?', [id]);
  await db.runAsync('DELETE FROM food_stats WHERE food_id = ?', [id]);
}

export async function addManualFood(data: {
  name: string;
  brand?: string | null;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  servingSize?: string | null;
  unitLabel?: string | null;
  servingWeightG?: number | null;
  density_g_per_ml?: number | null;
}): Promise<LocalFood> {
  const db = await openDb();
  const id = `${PREFIX_MANUAL}${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  const barcode = id;
  const now = Math.floor(Date.now() / 1000);

  const existing = await db.getFirstAsync<FoodRow>(
    'SELECT * FROM foods WHERE LOWER(name) = LOWER(?) AND source = ?',
    [data.name.trim(), 'manual']
  );

  const servingSizeEnc = encodeServingSize({
    servingSize: data.servingSize,
    unitLabel: data.unitLabel,
    servingWeightG: data.servingWeightG,
    density_g_per_ml: data.density_g_per_ml,
  });

  if (existing) {
    await db.runAsync(
      `UPDATE foods SET
        name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
        serving_size = ?, updated_at = ?
      WHERE id = ?`,
      [
        data.name.trim(),
        data.brand ?? null,
        data.calories,
        data.protein,
        data.carbs,
        data.fat,
        servingSizeEnc,
        now,
        existing.id,
      ]
    );
    const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [existing.id]);
    if (!row) throw new Error('Failed to read updated food');
    return mapRow(row);
  }

  await db.runAsync(
    `INSERT INTO foods (id, name, brand, barcode, source, calories, protein, carbs, fat, serving_size, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name.trim(),
      data.brand ?? null,
      barcode,
      data.calories,
      data.protein,
      data.carbs,
      data.fat,
      servingSizeEnc,
      now,
      now,
    ]
  );

  const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to read inserted food');
  return mapRow(row);
}

export async function addUsdaFood(
  fdcId: string,
  data: {
    name: string;
    brand?: string | null;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    servingSize?: string | null;
    unitLabel?: string | null;
    servingWeightG?: number | null;
    density_g_per_ml?: number | null;
  }
): Promise<LocalFood> {
  const db = await openDb();
  const id = `${PREFIX_USDA}${fdcId}`;
  const barcode = id;
  const now = Math.floor(Date.now() / 1000);

  const servingSizeEnc = encodeServingSize({
    servingSize: data.servingSize,
    unitLabel: data.unitLabel,
    servingWeightG: data.servingWeightG,
    density_g_per_ml: data.density_g_per_ml,
  });

  const existing = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);

  if (existing) {
    await db.runAsync(
      `UPDATE foods SET
        name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
        serving_size = ?, updated_at = ?
      WHERE id = ?`,
      [
        data.name.trim(),
        data.brand ?? null,
        data.calories,
        data.protein,
        data.carbs,
        data.fat,
        servingSizeEnc,
        now,
        id,
      ]
    );
    const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
    if (!row) throw new Error('Failed to read updated food');
    return mapRow(row);
  }

  await db.runAsync(
    `INSERT INTO foods (id, name, brand, barcode, source, calories, protein, carbs, fat, serving_size, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'usda', ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.name.trim(),
      data.brand ?? null,
      barcode,
      data.calories,
      data.protein,
      data.carbs,
      data.fat,
      servingSizeEnc,
      now,
      now,
    ]
  );

  const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to read inserted food');
  return mapRow(row);
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
  const providerId = f.source === 'usda' ? 'usda' : f.source === 'manual' ? 'manual' : 'openfoodfacts';
  const norm: NormalizedFood = {
    id: f.id,
    providerId,
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
  if (typeof f.servingWeightG === 'number') norm.servingWeightGrams = f.servingWeightG;
  if (typeof f.servingVolumeMl === 'number') norm.servingVolumeMl = f.servingVolumeMl;
  if (typeof f.density_g_per_ml === 'number') norm.density_g_per_ml = f.density_g_per_ml;
  return applyKnownLiquidDensity(norm);
}

/**
 * Update density (g/ml) for a saved food. Merges into existing serving_size JSON.
 */
export async function updateFoodDensity(
  foodId: string,
  density_g_per_ml: number
): Promise<LocalFood | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [foodId]);
  if (!row) return null;

  const meta = parseUnitMeta(row.serving_size);
  const servingSizeEnc = encodeServingSize({
    servingSize: row.serving_size,
    unitLabel: meta.unitLabel ?? undefined,
    servingWeightG: meta.servingWeightG ?? undefined,
    servingVolumeMl: meta.servingVolumeMl ?? undefined,
    density_g_per_ml,
  });

  const now = Math.floor(Date.now() / 1000);
  await db.runAsync(
    `UPDATE foods SET serving_size = ?, updated_at = ? WHERE id = ?`,
    [servingSizeEnc, now, foodId]
  );

  const updated = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [foodId]);
  return updated ? mapRow(updated) : null;
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
