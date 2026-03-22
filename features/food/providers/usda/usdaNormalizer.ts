import { NormalizedFood } from '../../types';
import { USDASearchFood, USDAFoodDetail, USDADetailNutrient, USDASearchNutrient } from './usdaClient';

const ENERGY_NUMBERS = ['208', '957', '1008'];
const PROTEIN_NUMBERS = ['203', '1003'];
const CARB_NUMBERS = ['205', '1005'];
const FAT_NUMBERS = ['204', '1004', '298'];

function deriveCaloriesFromMacros(protein: number, carbs: number, fat: number): number {
  return protein * 4 + carbs * 4 + fat * 9;
}

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
  const protein = extractFromSearchNutrients(nutrients, PROTEIN_NUMBERS);
  const carbs = extractFromSearchNutrients(nutrients, CARB_NUMBERS);
  const fat = extractFromSearchNutrients(nutrients, FAT_NUMBERS);
  const resolvedCalories = calories > 0 ? calories : deriveCaloriesFromMacros(protein, carbs, fat);

  return {
    id: `usda:${food.fdcId}`,
    providerId: 'usda',
    externalId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner,
    basis: 'per100g',
    per100g: {
      calories: Math.round(resolvedCalories),
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
  const protein = extractFromDetailNutrients(nutrients, PROTEIN_NUMBERS);
  const carbs = extractFromDetailNutrients(nutrients, CARB_NUMBERS);
  const fat = extractFromDetailNutrients(nutrients, FAT_NUMBERS);
  const resolvedCalories = calories > 0 ? calories : deriveCaloriesFromMacros(protein, carbs, fat);

  return {
    id: `usda:${food.fdcId}`,
    providerId: 'usda',
    externalId: String(food.fdcId),
    name: food.description,
    brand: food.brandOwner,
    basis: 'per100g',
    per100g: {
      calories: Math.round(resolvedCalories),
      protein_g: Math.round(protein * 10) / 10,
      carbs_g: Math.round(carbs * 10) / 10,
      fat_g: Math.round(fat * 10) / 10,
    },
    updatedAt: new Date().toISOString(),
  };
}
