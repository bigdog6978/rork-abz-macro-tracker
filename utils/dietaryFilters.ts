import { FOODS, FoodItemData } from '../constants/foodDatabase';
import { DietaryModifier, EatingStyle } from '../types';

const PSMF_MAX_CARB_PER_100G = 15;

/** Mammalian land meat — fish is excluded (Ashkenazi norm: fish + dairy allowed). */
export function isMammalianMeat(food: FoodItemData): boolean {
  return food.tags.includes('meat') && !food.tags.includes('fish');
}

export function isDairyFood(food: FoodItemData): boolean {
  return food.tags.includes('dairy');
}

export function isFoodBlockedByDietaryModifiers(
  food: FoodItemData,
  modifiers: DietaryModifier[],
  eatingStyle?: EatingStyle
): boolean {
  if (modifiers.includes('halal') || modifiers.includes('kosher')) {
    if (food.tags.includes('pork')) return true;
  }

  if (modifiers.includes('halal') && food.tags.includes('alcohol')) {
    return true;
  }

  if (modifiers.includes('kosher') && food.tags.includes('shellfish')) {
    return true;
  }

  if (eatingStyle === 'psmf') {
    if (food.tags.includes('high_fat')) return true;
    if (food.per100g.carbs_g > PSMF_MAX_CARB_PER_100G && !food.tags.includes('veggie')) {
      return true;
    }
  }

  return false;
}

/** True when kosher modifier is on and meal contains both mammalian meat and dairy. */
export function mealViolatesKosherMeatDairy(foodIds: string[]): boolean {
  let hasMammalMeat = false;
  let hasDairy = false;
  for (const id of foodIds) {
    const food = FOODS[id];
    if (!food) continue;
    if (isMammalianMeat(food)) hasMammalMeat = true;
    if (isDairyFood(food)) hasDairy = true;
  }
  return hasMammalMeat && hasDairy;
}

export function resolveKosherFoodId(foodId: string, mealFoodIds: string[], dairyFreeSwaps: Record<string, string>): string {
  const food = FOODS[foodId];
  if (!food || !isDairyFood(food)) return foodId;
  if (!mealViolatesKosherMeatDairy(mealFoodIds)) return foodId;
  return dairyFreeSwaps[foodId] ?? foodId;
}
