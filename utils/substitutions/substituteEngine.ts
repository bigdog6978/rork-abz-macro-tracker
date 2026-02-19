import { MealSuggestion, MacroStrategy, DietaryModifier, FoodCategory, MeasurementSystem } from '../../types';
import { FOODS, formatPortionLabel } from '../../constants/foodDatabase';
import { SUBSTITUTE_CATALOG } from './substituteCatalog';
import { SubstituteCatalogItem, SubstituteResult } from './types';
import { MealType, MEAL_TYPE_FOOD_IDS } from '../../constants/mealSwapCatalog';

interface SubstituteOptions {
  strategy: MacroStrategy;
  modifiers: DietaryModifier[];
  measurementSystem?: MeasurementSystem;
  excludeFoodIds?: string[];
  mealType?: MealType;
}

const DIET_EXCLUSION_TAGS: Record<string, string[]> = {
  vegan: ['meat', 'fish', 'dairy', 'egg', 'animal'],
  vegetarian: ['meat', 'fish'],
  dairy_free: ['dairy'],
  carnivore_strategy: ['grain', 'legume', 'fruit', 'plant', 'vegetarian', 'vegan'],
};

const KETO_MAX_CARB_PER_SERVING = 12;
const LOW_CARB_MAX_CARB_PER_SERVING = 25;

function isItemAllowedByDiet(
  item: SubstituteCatalogItem,
  strategy: MacroStrategy,
  modifiers: DietaryModifier[]
): boolean {
  if (modifiers.includes('vegan')) {
    if (!item.tags.includes('vegan')) return false;
  } else if (modifiers.includes('vegetarian')) {
    if (!item.tags.includes('vegetarian') && !item.tags.includes('vegan')) return false;
  }

  if (modifiers.includes('dairy_free')) {
    if (item.tags.includes('dairy') && !item.tags.includes('dairy_free')) return false;
  }

  if (modifiers.includes('gluten_free')) {
    if (!item.tags.includes('gluten_free')) return false;
  }

  if (modifiers.includes('paleo')) {
    if (!item.tags.includes('paleo') && !item.tags.includes('veggie') && !item.tags.includes('plant')) {
      const hasPaleoTag = item.tags.includes('paleo');
      if (!hasPaleoTag) return false;
    }
  }

  if (strategy === 'carnivore') {
    const isAnimal = item.tags.includes('animal') || item.tags.includes('meat') ||
                     item.tags.includes('fish') || item.tags.includes('egg') ||
                     item.tags.includes('dairy') || item.tags.includes('carnivore');
    if (!isAnimal) return false;
  }

  if (strategy === 'keto') {
    if (item.macrosPerServing.carbs_g > KETO_MAX_CARB_PER_SERVING) return false;
  }

  if (strategy === 'low_carb') {
    if (item.macrosPerServing.carbs_g > LOW_CARB_MAX_CARB_PER_SERVING) return false;
  }

  return true;
}

function macroDistance(
  original: MealSuggestion,
  candidate: SubstituteCatalogItem,
  category: FoodCategory
): number {
  const oCal = original.calories || 1;
  const cCal = candidate.macrosPerServing.calories || 1;
  const calDiff = Math.abs(oCal - cCal) / oCal;

  let macroDiff = 0;
  if (category === 'protein') {
    const oP = original.protein_g || 1;
    macroDiff = Math.abs(oP - candidate.macrosPerServing.protein_g) / oP;
  } else if (category === 'carb' || category === 'fruit') {
    const oC = original.carbs_g || 1;
    macroDiff = Math.abs(oC - candidate.macrosPerServing.carbs_g) / oC;
  } else if (category === 'fat') {
    const oF = original.fat_g || 1;
    macroDiff = Math.abs(oF - candidate.macrosPerServing.fat_g) / oF;
  } else {
    macroDiff = calDiff;
  }

  return calDiff * 0.5 + macroDiff * 0.5;
}

function adjustServingToMatchCalories(
  candidate: SubstituteCatalogItem,
  targetCalories: number
): { servingG: number; macros: { calories: number; protein_g: number; carbs_g: number; fat_g: number } } {
  const baseCal = candidate.macrosPerServing.calories;
  if (baseCal <= 0) {
    return {
      servingG: candidate.defaultServingG,
      macros: { ...candidate.macrosPerServing },
    };
  }

  const scale = targetCalories / baseCal;
  const clampedScale = Math.max(0.3, Math.min(3.0, scale));
  const servingG = Math.round(candidate.defaultServingG * clampedScale);

  return {
    servingG,
    macros: {
      calories: Math.round(candidate.macrosPerServing.calories * clampedScale),
      protein_g: Math.round(candidate.macrosPerServing.protein_g * clampedScale * 10) / 10,
      carbs_g: Math.round(candidate.macrosPerServing.carbs_g * clampedScale * 10) / 10,
      fat_g: Math.round(candidate.macrosPerServing.fat_g * clampedScale * 10) / 10,
    },
  };
}

function formatSubstitutePortion(
  foodId: string,
  servingG: number,
  measurementSystem: MeasurementSystem
): string {
  const foodData = FOODS[foodId];
  if (foodData) {
    return formatPortionLabel(foodData, servingG, measurementSystem);
  }
  return `${servingG}g`;
}

export function getSubstitutes(
  foodItem: MealSuggestion,
  options: SubstituteOptions,
  count: number = 12
): SubstituteResult[] {
  const { strategy, modifiers, measurementSystem = 'us', excludeFoodIds = [], mealType } = options;
  const category = foodItem.category;

  console.log('[SubstituteEngine] Finding substitutes for:', foodItem.name, 'category:', category, 'mealType:', mealType);

  const allExcluded = new Set([foodItem.foodId, ...excludeFoodIds]);
  const mealFoodIds = mealType ? new Set(MEAL_TYPE_FOOD_IDS[mealType]) : null;

  let candidates = SUBSTITUTE_CATALOG.filter((item) => {
    if (allExcluded.has(item.foodId)) return false;
    if (!isItemAllowedByDiet(item, strategy, modifiers)) return false;
    return true;
  });

  const mealTypeCandidates = mealFoodIds
    ? candidates.filter((c) => mealFoodIds.has(c.foodId))
    : [];
  const sameCategoryCandidates = candidates.filter((c) => c.category === category);

  let thresholdMultiplier = 1.0;
  const maxRelaxSteps = 5;
  let selected: SubstituteCatalogItem[] = [];
  const selectedIds = new Set<string>();

  const tryAdd = (items: SubstituteCatalogItem[]) => {
    for (const item of items) {
      if (selected.length >= count) break;
      if (!selectedIds.has(item.foodId)) {
        selectedIds.add(item.foodId);
        selected.push(item);
      }
    }
  };

  for (let step = 0; step < maxRelaxSteps && selected.length < count; step++) {
    const calThreshold = 0.2 * thresholdMultiplier;
    const macroThreshold = 0.25 * thresholdMultiplier;

    const pools = step < 2
      ? [mealTypeCandidates, sameCategoryCandidates]
      : [candidates];

    for (const pool of pools) {
      const filtered = pool.filter((c) => {
        if (selectedIds.has(c.foodId)) return false;
        const oCal = foodItem.calories || 1;
        const calDiff = Math.abs(oCal - c.macrosPerServing.calories) / oCal;
        if (calDiff > calThreshold) return false;

        if (category === 'protein') {
          const oP = foodItem.protein_g || 1;
          if (Math.abs(oP - c.macrosPerServing.protein_g) / oP > macroThreshold) return false;
        }
        if (category === 'carb' || category === 'fruit') {
          const oC = foodItem.carbs_g || 1;
          if (Math.abs(oC - c.macrosPerServing.carbs_g) / oC > macroThreshold) return false;
        }
        if (category === 'fat') {
          const oF = foodItem.fat_g || 1;
          if (Math.abs(oF - c.macrosPerServing.fat_g) / oF > macroThreshold) return false;
        }

        return true;
      });

      const scored = filtered.map((c) => {
        const base = macroDistance(foodItem, c, category);
        const mealBonus = mealFoodIds && mealFoodIds.has(c.foodId) ? -0.1 : 0;
        return { item: c, score: base + mealBonus };
      });
      scored.sort((a, b) => a.score - b.score);
      tryAdd(scored.map((s) => s.item));
    }

    thresholdMultiplier *= 1.5;
  }

  if (selected.length < count) {
    const remaining = candidates
      .filter((c) => !allExcluded.has(c.foodId) && !selectedIds.has(c.foodId))
      .sort((a, b) => macroDistance(foodItem, a, category) - macroDistance(foodItem, b, category));
    tryAdd(remaining);
  }

  const results: SubstituteResult[] = selected.map((item) => {
    const adjusted = adjustServingToMatchCalories(item, foodItem.calories);
    const portion = formatSubstitutePortion(item.foodId, adjusted.servingG, measurementSystem);

    return {
      catalogItem: item,
      adjustedServingG: adjusted.servingG,
      adjustedMacros: adjusted.macros,
      adjustedPortion: portion,
    };
  });

  console.log('[SubstituteEngine] Found', results.length, 'substitutes for', foodItem.name);
  return results;
}

export function applySubstitution(
  originalItem: MealSuggestion,
  substituteResult: SubstituteResult,
  mealIndex: number,
  foodIndex: number
): MealSuggestion {
  return {
    id: `${mealIndex}-${foodIndex}-${substituteResult.catalogItem.foodId}`,
    foodId: substituteResult.catalogItem.foodId,
    name: substituteResult.catalogItem.name,
    portion: substituteResult.adjustedPortion,
    portionGrams: substituteResult.adjustedServingG,
    protein_g: Math.round(substituteResult.adjustedMacros.protein_g),
    carbs_g: Math.round(substituteResult.adjustedMacros.carbs_g),
    fat_g: Math.round(substituteResult.adjustedMacros.fat_g),
    calories: substituteResult.adjustedMacros.calories,
    category: substituteResult.catalogItem.category,
    isSubstitutable: true,
    isSwapped: true,
  };
}
