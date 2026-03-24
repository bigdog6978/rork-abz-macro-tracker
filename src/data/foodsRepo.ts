/**
 * SQLite repository for local foods (barcode-scanned, saved, imported catalogs).
 */

import { openDb } from './db';
import type { LocalFood, LocalFoodSource } from '../types/Food';
import type { NormalizedFood } from '../../features/food/types';
import { applyKnownLiquidDensity } from '../../features/food/liquidDensity';

const PREFIX_OFF = 'off:';
const PREFIX_MANUAL = 'manual:';
const PREFIX_USDA = 'usda:';

/**
 * Normalize a food name for search indexing.
 * Strips punctuation, collapses whitespace, lowercases.
 */
export function generateSearchName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,\-()\/\.;:'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

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
  search_name: string | null;
  created_at: number;
  updated_at: number;
  saved_at: number | null;
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

  const searchName = generateSearchName(data.name);

  if (existing) {
    await db.runAsync(
      `UPDATE foods SET
        name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
        serving_size = ?, search_name = ?, updated_at = ?
      WHERE barcode = ?`,
      [
        data.name,
        data.brand ?? null,
        data.calories,
        data.protein,
        data.carbs,
        data.fat,
        servingSizeEnc,
        searchName,
        now,
        barcode,
      ]
    );
  } else {
    await db.runAsync(
      `INSERT INTO foods (id, name, brand, barcode, source, calories, protein, carbs, fat, serving_size, search_name, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'openfoodfacts', ?, ?, ?, ?, ?, ?, ?, ?)`,
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
        searchName,
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

/**
 * Returns only foods the user explicitly saved:
 *   - source = 'manual'        (entered manually or via Save toggle)
 *   - source = 'openfoodfacts' (scanned via barcode)
 *   - source = 'usda' with saved_at set (explicitly bookmarked via "Save to Saved Foods")
 * Excludes auto-cached USDA search results and CoFID bulk-import entries.
 */
export async function getUserSavedFoods(): Promise<LocalFood[]> {
  const db = await openDb();
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT * FROM foods
     WHERE source IN ('manual', 'openfoodfacts')
        OR saved_at IS NOT NULL
     ORDER BY updated_at DESC`
  );
  return rows.map(mapRow);
}

export async function deleteSavedFood(id: string): Promise<void> {
  const db = await openDb();
  const row = await db.getFirstAsync<{ source: string }>('SELECT source FROM foods WHERE id = ?', [id]);
  if (row?.source === 'usda') {
    // Soft-delete: clear saved_at so the row stays in the search cache but
    // is no longer shown in Saved Foods.
    await db.runAsync('UPDATE foods SET saved_at = NULL WHERE id = ?', [id]);
  } else {
    await db.runAsync('DELETE FROM foods WHERE id = ?', [id]);
    await db.runAsync('DELETE FROM food_stats WHERE food_id = ?', [id]);
  }
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

  const manualSearchName = generateSearchName(data.name);

  if (existing) {
    await db.runAsync(
      `UPDATE foods SET
        name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
        serving_size = ?, search_name = ?, updated_at = ?
      WHERE id = ?`,
      [
        data.name.trim(),
        data.brand ?? null,
        data.calories,
        data.protein,
        data.carbs,
        data.fat,
        servingSizeEnc,
        manualSearchName,
        now,
        existing.id,
      ]
    );
    const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [existing.id]);
    if (!row) throw new Error('Failed to read updated food');
    return mapRow(row);
  }

  await db.runAsync(
    `INSERT INTO foods (id, name, brand, barcode, source, calories, protein, carbs, fat, serving_size, search_name, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'manual', ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      manualSearchName,
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

  const usdaSearchName = generateSearchName(data.name);
  const existing = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);

  if (existing) {
    await db.runAsync(
      `UPDATE foods SET
        name = ?, brand = ?, calories = ?, protein = ?, carbs = ?, fat = ?,
        serving_size = ?, search_name = ?, updated_at = ?, saved_at = ?
      WHERE id = ?`,
      [
        data.name.trim(),
        data.brand ?? null,
        data.calories,
        data.protein,
        data.carbs,
        data.fat,
        servingSizeEnc,
        usdaSearchName,
        now,
        now,
        id,
      ]
    );
    const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
    if (!row) throw new Error('Failed to read updated food');
    return mapRow(row);
  }

  await db.runAsync(
    `INSERT INTO foods (id, name, brand, barcode, source, calories, protein, carbs, fat, serving_size, search_name, created_at, updated_at, saved_at)
     VALUES (?, ?, ?, ?, 'usda', ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      usdaSearchName,
      now,
      now,
      now,
    ]
  );

  const row = await db.getFirstAsync<FoodRow>('SELECT * FROM foods WHERE id = ?', [id]);
  if (!row) throw new Error('Failed to read inserted food');
  return mapRow(row);
}

/**
 * Search all local foods (saved, imported catalogs, cached USDA) by name.
 * Matches against both `search_name` (normalized) and `name` (display).
 * Returns up to 80 candidates for re-ranking by the scoring engine.
 */
export async function searchLocalFoods(query: string): Promise<LocalFood[]> {
  if (!query?.trim()) return [];
  const db = await openDb();
  const rawTerm = `%${query.trim().toLowerCase()}%`;
  const normalizedTerm = `%${generateSearchName(query)}%`;
  const rows = await db.getAllAsync<FoodRow>(
    `SELECT * FROM foods
     WHERE search_name LIKE ?
        OR LOWER(name) LIKE ?
        OR (brand IS NOT NULL AND LOWER(brand) LIKE ?)
     ORDER BY updated_at DESC
     LIMIT 80`,
    [normalizedTerm, rawTerm, rawTerm]
  );
  return rows.map(mapRow);
}

export function localFoodToNormalizedFood(f: LocalFood): NormalizedFood {
  const providerId: NormalizedFood['providerId'] =
    f.source === 'usda' ? 'usda'
    : f.source === 'manual' ? 'manual'
    : f.source === 'cofid_uk' ? 'cofid_uk'
    : 'openfoodfacts';
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

// ─── Catalog metadata helpers ───────────────────────────────────────────────

export async function getCatalogMeta(key: string): Promise<string | null> {
  const db = await openDb();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM catalog_meta WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setCatalogMeta(key: string, value: string): Promise<void> {
  const db = await openDb();
  await db.runAsync(
    `INSERT OR REPLACE INTO catalog_meta (key, value) VALUES (?, ?)`,
    [key, value]
  );
}

// ─── Batch catalog import ───────────────────────────────────────────────────

export interface CatalogImportRecord {
  id: string;
  name: string;
  searchName: string;
  brand?: string | null;
  source: LocalFoodSource;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

/**
 * Batch-import catalog records (e.g. UK CoFID) into the foods table.
 * Uses INSERT OR IGNORE so reruns skip existing rows without error.
 */
export async function importCatalogFoods(
  records: CatalogImportRecord[]
): Promise<number> {
  if (records.length === 0) return 0;
  const db = await openDb();
  const now = Math.floor(Date.now() / 1000);
  let inserted = 0;

  await db.execAsync('BEGIN TRANSACTION');
  try {
    for (const r of records) {
      const result = await db.runAsync(
        `INSERT OR IGNORE INTO foods
           (id, name, brand, barcode, source, calories, protein, carbs, fat,
            serving_size, search_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [
          r.id,
          r.name,
          r.brand ?? null,
          r.id,
          r.source,
          r.calories,
          r.protein,
          r.carbs,
          r.fat,
          r.searchName,
          now,
          now,
        ]
      );
      if (result.changes > 0) inserted++;
    }
    await db.execAsync('COMMIT');
  } catch (e) {
    await db.execAsync('ROLLBACK');
    throw e;
  }

  return inserted;
}

/**
 * Hydrate USDA search results into SQLite so they appear in future local searches.
 * Uses INSERT OR IGNORE so duplicates are silently skipped.
 */
export async function hydrateUsdaResults(
  foods: NormalizedFood[]
): Promise<void> {
  if (foods.length === 0) return;
  const db = await openDb();
  const now = Math.floor(Date.now() / 1000);

  await db.execAsync('BEGIN TRANSACTION');
  try {
    for (const f of foods) {
      const id = f.id;
      const searchName = generateSearchName(f.name);
      await db.runAsync(
        `INSERT OR IGNORE INTO foods
           (id, name, brand, barcode, source, calories, protein, carbs, fat,
            serving_size, search_name, created_at, updated_at)
         VALUES (?, ?, ?, ?, 'usda', ?, ?, ?, ?, NULL, ?, ?, ?)`,
        [
          id,
          f.name,
          f.brand ?? null,
          id,
          f.per100g.calories,
          f.per100g.protein_g,
          f.per100g.carbs_g,
          f.per100g.fat_g,
          searchName,
          now,
          now,
        ]
      );
    }
    await db.execAsync('COMMIT');
  } catch {
    try { await db.execAsync('ROLLBACK'); } catch { /* ignore */ }
  }
}
