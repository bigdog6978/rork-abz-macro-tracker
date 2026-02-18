import { NormalizedFood } from '../../types';
import { USDASearchFood, USDAFoodDetail, USDADetailNutrient, USDASearchNutrient } from './usdaClient';

const ENERGY_NUMBERS = ['208', '957'];
const PROTEIN_NUMBER = '203';
const CARB_NUMBER = '205';
const FAT_NUMBER = '204';

function extractFromSearchNutrients(
  nutrients: USDASearchNutrient[],
  numbers: string[]
): number {
  for (const num of numbers) {
    const found = nutrients.find((n) => n.nutrientNumber === num);
    if (found && found.value != null) return found.value;
  }
  return 0;
}

function extractFromDetailNutrients(
  nutrients: USDADetailNutrient[],
  numbers: string[]
): number {
  for (const num of numbers) {
    const found = nutrients.find((n) => n.nutrient?.number === num);
    if (found && found.amount != null) return found.amount;
  }
  return 0;
}

export function normalizeSearchResult(food: USDASearchFood): NormalizedFood {
  const nutrients = food.foodNutrients ?? [];
  const calories = extractFromSearchNutrients(nutrients, ENERGY_NUMBERS);
  const protein = extractFromSearchNutrients(nutrients, [PROTEIN_NUMBER]);
  const carbs = extractFromSearchNutrients(nutrients, [CARB_NUMBER]);
  const fat = extractFromSearchNutrients(nutrients, [FAT_NUMBER]);

  return {
    id: `usda:${food.fdcId}`,
    providerId: 'usda',
    externalId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner,
    basis: 'per100g',
    per100g: {
      calories: Math.round(calories),
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function normalizeDetailResult(food: USDAFoodDetail): NormalizedFood {
  const nutrients = food.foodNutrients ?? [];
  const calories = extractFromDetailNutrients(nutrients, ENERGY_NUMBERS);
  const protein = extractFromDetailNutrients(nutrients, [PROTEIN_NUMBER]);
  const carbs = extractFromDetailNutrients(nutrients, [CARB_NUMBER]);
  const fat = extractFromDetailNutrients(nutrients, [FAT_NUMBER]);

  return {
    id: `usda:${food.fdcId}`,
    providerId: 'usda',
    externalId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner,
    basis: 'per100g',
    per100g: {
      calories: Math.round(calories),
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
    },
    updatedAt: new Date().toISOString(),
  };
}
