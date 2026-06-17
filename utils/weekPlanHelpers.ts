import { PlanDay, SavedMealPlan } from '../types';

/** Meals for a specific day index from a saved or generated plan. */
export function getMealsForDay(plan: SavedMealPlan | { days?: PlanDay[]; meals: PlanDay['meals'] }, dayIndex: number) {
  if (plan.days && plan.days.length > 0) {
    return plan.days[dayIndex]?.meals ?? plan.days[0]?.meals ?? [];
  }
  return plan.meals ?? [];
}

export function getPlanDayCount(plan: { days?: PlanDay[]; numDays?: number; meals?: unknown[] }): number {
  if (plan.days && plan.days.length > 0) return plan.days.length;
  if (plan.numDays) return plan.numDays;
  return 1;
}
