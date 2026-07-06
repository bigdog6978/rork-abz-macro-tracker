/**
 * Meal-group inference and log grouping. Entries are auto-tagged at creation
 * (editable in the entry editor); entries logged before the field existed
 * fall back to inference from their timestamp, so historical logs group
 * correctly with zero data migration.
 */

import {
  FoodEntry,
  MacroTargets,
  MEAL_TYPE_ORDER,
  MealType,
} from '../../types';

/** breakfast 4:00–10:59 · lunch 11:00–15:59 · dinner 16:00–20:59 · snack otherwise */
export function inferMealType(date: Date): MealType {
  const hour = date.getHours();
  if (hour >= 4 && hour < 11) return 'breakfast';
  if (hour >= 11 && hour < 16) return 'lunch';
  if (hour >= 16 && hour < 21) return 'dinner';
  return 'snack';
}

export function entryMealType(entry: FoodEntry): MealType {
  if (entry.mealType) return entry.mealType;
  const parsed = new Date(entry.timestamp ?? '');
  if (Number.isNaN(parsed.getTime())) return 'snack';
  return inferMealType(parsed);
}

export interface MealSection {
  mealType: MealType;
  entries: FoodEntry[];
  totals: MacroTargets;
}

/** Ordered, non-empty sections with per-meal macro subtotals. */
export function groupEntriesByMeal(entries: FoodEntry[]): MealSection[] {
  const byMeal = new Map<MealType, FoodEntry[]>();
  for (const entry of entries) {
    const meal = entryMealType(entry);
    const list = byMeal.get(meal);
    if (list) list.push(entry);
    else byMeal.set(meal, [entry]);
  }

  return MEAL_TYPE_ORDER.filter((meal) => byMeal.has(meal)).map((meal) => {
    const mealEntries = byMeal.get(meal) ?? [];
    return {
      mealType: meal,
      entries: mealEntries,
      totals: mealEntries.reduce(
        (acc, e) => ({
          calories: acc.calories + e.calories,
          protein_g: acc.protein_g + e.protein_g,
          carbs_g: acc.carbs_g + e.carbs_g,
          fat_g: acc.fat_g + e.fat_g,
        }),
        { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
      ),
    };
  });
}
