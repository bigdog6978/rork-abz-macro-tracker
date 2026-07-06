/**
 * One-tap repeat logging: "copy yesterday" (whole day or a single meal) and
 * recents quick-chips. Pure helpers — the dashboard wires them to
 * useDailyLog.addEntries. Repeat meals are the majority of real-world logs;
 * these paths reduce them to a single tap.
 */

import { FoodEntry, MealType } from '../../types';
import { StoredLogs } from '../../storage/dailyLogMigration';
import { toDateKey } from '../../utils/dateKey';
import { entryMealType } from './mealType';
import type { NormalizedFood } from './types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2, 9);
}

export function yesterdayKey(now: Date = new Date()): string {
  const d = new Date(now);
  d.setDate(d.getDate() - 1);
  return toDateKey(d);
}

export function getYesterdayEntries(logs: StoredLogs, now: Date = new Date()): FoodEntry[] {
  return logs[yesterdayKey(now)] ?? [];
}

export function getYesterdayMeal(
  logs: StoredLogs,
  mealType: MealType,
  now: Date = new Date()
): FoodEntry[] {
  return getYesterdayEntries(logs, now).filter((e) => entryMealType(e) === mealType);
}

/**
 * Clone entries as fresh log entries for today: new id + timestamp, same
 * macros/serving/customization. `mealType` is pinned to the source entry's
 * (inferred for untagged ones) so a copied breakfast stays a breakfast even
 * when copied in the evening.
 */
export function cloneEntriesForToday(entries: FoodEntry[], now: Date = new Date()): FoodEntry[] {
  return entries.map((entry) => ({
    ...entry,
    id: generateId(),
    timestamp: now.toISOString(),
    mealType: entryMealType(entry),
  }));
}

export function sumCalories(entries: FoodEntry[]): number {
  return entries.reduce((acc, e) => acc + e.calories, 0);
}

export interface RecentChip {
  food: NormalizedFood;
  grams: number;
  calories: number;
}

/**
 * Top quick-log chips from the recents list (already recency-ordered by
 * foodService.getRecentFoodsList). Skips entries without usable serving or
 * per-100g data — a chip must be able to log in one tap with no follow-up.
 */
export function selectRecentChips(
  recents: { food: NormalizedFood; lastServingGrams: number }[],
  limit = 4
): RecentChip[] {
  const chips: RecentChip[] = [];
  for (const item of recents) {
    if (chips.length >= limit) break;
    const grams = item.lastServingGrams;
    const per100 = item.food.per100g;
    if (!per100 || !Number.isFinite(grams) || grams <= 0) continue;
    chips.push({
      food: item.food,
      grams,
      calories: Math.round((per100.calories * grams) / 100),
    });
  }
  return chips;
}
