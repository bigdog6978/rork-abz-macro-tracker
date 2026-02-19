export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPE_FOOD_IDS: Record<MealType, string[]> = {
  breakfast: [
    'eggs', 'greek_yogurt', 'cottage_cheese', 'oats_dry', 'whey_protein',
    'plant_protein', 'banana', 'berries', 'tofu', 'tempeh',
  ],
  lunch: [
    'chicken_breast', 'turkey_breast', 'salmon', 'tofu', 'lentils',
    'brown_rice', 'quinoa', 'sweet_potato', 'mixed_greens', 'avocado',
    'ww_pasta', 'shrimp', 'cottage_cheese', 'hummus',
  ],
  dinner: [
    'chicken_breast', 'salmon', 'cod', 'ground_beef_90', 'ribeye',
    'pork_loin', 'shrimp', 'tofu', 'tempeh', 'brown_rice', 'white_rice',
    'potato', 'sweet_potato', 'quinoa', 'broccoli', 'asparagus',
    'cauliflower', 'green_beans', 'roasted_veggies', 'zucchini',
  ],
  snack: [
    'almonds', 'walnuts', 'mixed_nuts', 'macadamia', 'peanut_butter',
    'almond_butter', 'apple', 'banana', 'berries', 'dates',
    'greek_yogurt', 'cottage_cheese', 'whey_protein', 'plant_protein',
    'hummus',
  ],
};

const MEAL_NAME_MAP: Record<string, MealType> = {
  breakfast: 'breakfast',
  lunch: 'lunch',
  dinner: 'dinner',
  snack: 'snack',
  'morning snack': 'snack',
  'afternoon snack': 'snack',
  'evening snack': 'snack',
  'pre-workout': 'snack',
  'post-workout': 'snack',
};

export function mealNameToType(name: string): MealType | undefined {
  return MEAL_NAME_MAP[name.toLowerCase().trim()];
}
