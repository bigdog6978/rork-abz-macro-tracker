/**
 * Pure daily-log transforms shared by DailyLogProvider and dailyLogRepo.
 *
 * These used to live inside DailyLogProvider and ran over the entire log
 * history on every app launch. They now run once, when the legacy
 * AsyncStorage blob is migrated into SQLite (see dailyLogRepo.ts).
 */

import { FoodEntry } from '../types';
import {
  computeMacrosFromNutrients,
  computeTotalGrams,
} from '../features/food/foodService';
import { toDateKey } from '../utils/dateKey';

export interface StoredLogs {
  [date: string]: FoodEntry[];
}

/** Migrate legacy entries: measureMode 'units' -> 'qty' */
export function migrateEntry(entry: FoodEntry): FoodEntry {
  if (entry.measureMode === 'units') {
    return { ...entry, measureMode: 'qty' };
  }
  return entry;
}

/** Recompute entry macros from nutrientsPer100g when not custom */
export function ensureEntryMacros(entry: FoodEntry): FoodEntry {
  if (entry.isCustomMacros || !entry.nutrientsPer100g) return entry;
  const mode = (entry.measureMode === 'units' ? 'qty' : entry.measureMode) ?? 'grams';
  const qty = entry.quantity ?? entry.servingGrams ?? 100;
  const totalGrams = computeTotalGrams(mode, qty, entry.servingWeightG);
  const macros = computeMacrosFromNutrients(entry.nutrientsPer100g, totalGrams);
  return {
    ...entry,
    servingGrams: totalGrams,
    protein_g: macros.protein_g,
    carbs_g: macros.carbs_g,
    fat_g: macros.fat_g,
    calories: macros.calories,
  };
}

/** Full normalization pass over a legacy stored-logs blob (migrate + recompute). */
export function normalizeStoredLogs(logs: StoredLogs): StoredLogs {
  const out: StoredLogs = {};
  for (const [date, entries] of Object.entries(logs)) {
    if (!Array.isArray(entries)) continue;
    out[date] = entries.map((entry) => ensureEntryMacros(migrateEntry(entry)));
  }
  return out;
}

/**
 * Consecutive-day logging streak ending today (or yesterday when today has
 * no entries yet). Same walk DailyLogProvider.getStreak always did — callers
 * should memoize by `logs` reference.
 */
export function computeStreak(logs: StoredLogs, now: Date = new Date()): number {
  let streak = 0;
  const d = new Date(now);
  for (let i = 0; i < 365; i++) {
    const dateStr = toDateKey(d);
    const entries = logs[dateStr] ?? [];
    if (entries.length > 0) {
      streak++;
    } else if (i > 0) {
      break;
    }
    d.setDate(d.getDate() - 1);
  }
  return streak;
}
