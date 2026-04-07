import { FOODS, FoodItemData, computeMacros, formatPortionLabel } from '../constants/foodDatabase';
import { MacroTargets, DietaryModifier, DayPlan, MealSlot, MealSuggestion, MeasurementSystem, FoodCategory, UserAllergy, EatingStyle } from '../types';
import { isFoodBlockedByAllergies } from './allergyFilter';

interface MealFoodRef {
  foodId: string;
  role: 'protein' | 'carb' | 'fat' | 'veggie' | 'complete';
}

function roleToCategory(role: MealFoodRef['role']): FoodCategory {
  switch (role) {
    case 'protein': return 'protein';
    case 'carb': return 'carb';
    case 'fat': return 'fat';
    case 'veggie': return 'veggie';
    case 'complete': return 'mixed';
  }
}

interface MealBlueprint {
  name: string;
  icon: string;
  percentage: number;
  foods: MealFoodRef[];
}

interface StrategyBlueprints {
  meals: MealBlueprint[];
}

type StrategyBlueprintVariant = StrategyBlueprints[];

// ─── Snack blueprints per eating style ──────────────────────────────────────

interface SnackSet {
  morning: MealFoodRef[];
  afternoon: MealFoodRef[];
  evening: MealFoodRef[];
}

const BALANCED_SNACKS: SnackSet = {
  morning: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }],
  afternoon: [{ foodId: 'almonds', role: 'fat' }, { foodId: 'apple', role: 'carb' }],
  evening: [{ foodId: 'whey_protein', role: 'protein' }, { foodId: 'banana', role: 'carb' }],
};

const HIGH_PROTEIN_SNACKS: SnackSet = {
  morning: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }],
  afternoon: [{ foodId: 'whey_protein', role: 'protein' }, { foodId: 'apple', role: 'carb' }],
  evening: [{ foodId: 'cottage_cheese', role: 'protein' }, { foodId: 'almonds', role: 'fat' }],
};

const LOW_CARB_SNACKS: SnackSet = {
  morning: [{ foodId: 'cottage_cheese', role: 'protein' }, { foodId: 'almonds', role: 'fat' }],
  afternoon: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }],
  evening: [{ foodId: 'string_cheese', role: 'protein' }, { foodId: 'almonds', role: 'fat' }],
};

const KETO_SNACKS: SnackSet = {
  morning: [{ foodId: 'string_cheese', role: 'protein' }, { foodId: 'macadamia', role: 'fat' }],
  afternoon: [{ foodId: 'almonds', role: 'fat' }, { foodId: 'avocado', role: 'fat' }],
  evening: [{ foodId: 'cheddar', role: 'fat' }, { foodId: 'olive_oil', role: 'fat' }],
};

const CARNIVORE_SNACKS: SnackSet = {
  morning: [{ foodId: 'hard_boiled_eggs', role: 'protein' }, { foodId: 'string_cheese', role: 'fat' }],
  afternoon: [{ foodId: 'bacon', role: 'fat' }, { foodId: 'cheddar', role: 'fat' }],
  evening: [{ foodId: 'hard_boiled_eggs', role: 'protein' }, { foodId: 'butter', role: 'fat' }],
};

const MEDITERRANEAN_SNACKS: SnackSet = {
  morning: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }],
  afternoon: [{ foodId: 'mixed_nuts', role: 'fat' }, { foodId: 'dates', role: 'carb' }],
  evening: [{ foodId: 'hummus', role: 'fat' }, { foodId: 'pita', role: 'carb' }],
};

const VEGETARIAN_SNACKS: SnackSet = {
  morning: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }],
  afternoon: [{ foodId: 'almonds', role: 'fat' }, { foodId: 'apple', role: 'carb' }],
  evening: [{ foodId: 'whey_protein', role: 'protein' }, { foodId: 'banana', role: 'carb' }],
};

const VEGAN_SNACKS: SnackSet = {
  morning: [{ foodId: 'plant_protein', role: 'protein' }, { foodId: 'banana', role: 'carb' }],
  afternoon: [{ foodId: 'almond_butter', role: 'fat' }, { foodId: 'apple', role: 'carb' }],
  evening: [{ foodId: 'edamame', role: 'protein' }, { foodId: 'almonds', role: 'fat' }],
};

const LOW_FAT_SNACKS: SnackSet = {
  morning: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }],
  afternoon: [{ foodId: 'apple', role: 'carb' }, { foodId: 'rice_cake', role: 'carb' }],
  evening: [{ foodId: 'whey_protein', role: 'protein' }, { foodId: 'banana', role: 'carb' }],
};

const PERFORMANCE_SNACKS: SnackSet = {
  morning: [{ foodId: 'whey_protein', role: 'protein' }, { foodId: 'banana', role: 'carb' }],
  afternoon: [{ foodId: 'rice_cake', role: 'carb' }, { foodId: 'peanut_butter', role: 'fat' }],
  evening: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }],
};

const VEGETARIAN_KETO_SNACKS: SnackSet = {
  morning: [{ foodId: 'string_cheese', role: 'protein' }, { foodId: 'macadamia', role: 'fat' }],
  afternoon: [{ foodId: 'almonds', role: 'fat' }, { foodId: 'avocado', role: 'fat' }],
  evening: [{ foodId: 'cheddar', role: 'fat' }, { foodId: 'olive_oil', role: 'fat' }],
};

const VEGETARIAN_HP_SNACKS: SnackSet = {
  morning: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }],
  afternoon: [{ foodId: 'whey_protein', role: 'protein' }, { foodId: 'edamame', role: 'protein' }],
  evening: [{ foodId: 'cottage_cheese', role: 'protein' }, { foodId: 'almonds', role: 'fat' }],
};

// ─── Calorie-aware snack slot builder ────────────────────────────────────────

function buildSnackSlots(snacks: SnackSet, calories: number): MealBlueprint[] {
  const use3 = calories >= 2200;
  if (use3) {
    return [
      { name: 'Morning Snack', icon: 'cookie', percentage: 0.08, foods: snacks.morning },
      { name: 'Afternoon Snack', icon: 'cookie', percentage: 0.08, foods: snacks.afternoon },
      { name: 'Evening Snack', icon: 'cookie', percentage: 0.06, foods: snacks.evening },
    ];
  }
  return [
    { name: 'Morning Snack', icon: 'cookie', percentage: 0.09, foods: snacks.morning },
    { name: 'Afternoon Snack', icon: 'cookie', percentage: 0.09, foods: snacks.afternoon },
  ];
}

function adjustMealPercentages(mainMeals: MealBlueprint[], snackSlots: MealBlueprint[]): MealBlueprint[] {
  const snackTotal = snackSlots.reduce((s, sl) => s + sl.percentage, 0);
  const mainTotal = mainMeals.reduce((s, m) => s + m.percentage, 0);
  const scale = (1 - snackTotal) / mainTotal;
  return mainMeals.map((m) => ({ ...m, percentage: Math.round(m.percentage * scale * 1000) / 1000 }));
}

function assembleBlueprint(mainMeals: MealBlueprint[], snacks: SnackSet, calories: number): StrategyBlueprints {
  const snackSlots = buildSnackSlots(snacks, calories);
  const scaled = adjustMealPercentages(mainMeals, snackSlots);
  // Interleave: Breakfast, Morning Snack, Lunch, Afternoon Snack, Dinner, [Evening Snack]
  const result: MealBlueprint[] = [];
  const breakfast = scaled.find((m) => m.name === 'Breakfast');
  const lunch = scaled.find((m) => m.name === 'Lunch');
  const dinner = scaled.find((m) => m.name === 'Dinner');
  if (breakfast) result.push(breakfast);
  result.push(snackSlots[0]);
  if (lunch) result.push(lunch);
  result.push(snackSlots[1]);
  if (dinner) result.push(dinner);
  if (snackSlots[2]) result.push(snackSlots[2]);
  return { meals: result };
}

// ─── Main meal cores (without snacks) ────────────────────────────────────────

const BALANCED_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }, { foodId: 'berries', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'brown_rice', role: 'carb' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'salmon', role: 'protein' }, { foodId: 'sweet_potato', role: 'carb' }, { foodId: 'broccoli', role: 'veggie' }] },
];

const BALANCED_MAIN_ALT: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }, { foodId: 'banana', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'turkey_breast', role: 'protein' }, { foodId: 'quinoa', role: 'carb' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'cod', role: 'protein' }, { foodId: 'brown_rice', role: 'carb' }, { foodId: 'broccoli', role: 'veggie' }] },
];

const HIGH_PROTEIN_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'turkey_breast', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'quinoa', role: 'carb' }, { foodId: 'broccoli', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'cod', role: 'protein' }, { foodId: 'sweet_potato', role: 'carb' }, { foodId: 'asparagus', role: 'veggie' }] },
];

const LOW_CARB_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'avocado', role: 'fat' }, { foodId: 'spinach_cooked', role: 'veggie' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'mixed_greens', role: 'veggie' }, { foodId: 'olive_oil', role: 'fat' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'salmon', role: 'protein' }, { foodId: 'cauliflower', role: 'veggie' }, { foodId: 'green_beans', role: 'veggie' }] },
];

const KETO_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'bacon', role: 'fat' }, { foodId: 'avocado', role: 'fat' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'ground_beef_80', role: 'protein' }, { foodId: 'cheddar', role: 'fat' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'ribeye', role: 'protein' }, { foodId: 'spinach_cooked', role: 'veggie' }, { foodId: 'butter', role: 'fat' }] },
];

const KETO_MAIN_ALT: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'cheddar', role: 'fat' }, { foodId: 'avocado', role: 'fat' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'salmon', role: 'protein' }, { foodId: 'olive_oil', role: 'fat' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'ground_beef_80', role: 'protein' }, { foodId: 'butter', role: 'fat' }, { foodId: 'cauliflower', role: 'veggie' }] },
];

const KETO_HP_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'turkey_breast', role: 'protein' }, { foodId: 'avocado', role: 'fat' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'olive_oil', role: 'fat' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'salmon', role: 'protein' }, { foodId: 'cauliflower', role: 'veggie' }, { foodId: 'butter', role: 'fat' }] },
];

const CARNIVORE_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'bacon', role: 'fat' }, { foodId: 'butter', role: 'fat' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'ground_beef_80', role: 'protein' }, { foodId: 'butter', role: 'fat' }, { foodId: 'bacon', role: 'fat' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'ribeye', role: 'protein' }, { foodId: 'butter', role: 'fat' }, { foodId: 'cheddar', role: 'fat' }] },
];

const CARNIVORE_MAIN_ALT: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'hard_boiled_eggs', role: 'protein' }, { foodId: 'cheddar', role: 'fat' }, { foodId: 'bacon', role: 'fat' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'ribeye', role: 'protein' }, { foodId: 'butter', role: 'fat' }, { foodId: 'hard_boiled_eggs', role: 'protein' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'ground_beef_80', role: 'protein' }, { foodId: 'cheddar', role: 'fat' }, { foodId: 'bacon', role: 'fat' }] },
];

const LOW_FAT_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }, { foodId: 'banana', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'turkey_breast', role: 'protein' }, { foodId: 'white_rice', role: 'carb' }, { foodId: 'green_beans', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'cod', role: 'protein' }, { foodId: 'sweet_potato', role: 'carb' }, { foodId: 'broccoli', role: 'veggie' }] },
];

const PERFORMANCE_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }, { foodId: 'banana', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'white_rice', role: 'carb' }, { foodId: 'roasted_veggies', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'salmon', role: 'protein' }, { foodId: 'ww_pasta', role: 'carb' }, { foodId: 'asparagus', role: 'veggie' }] },
];

const MEDITERRANEAN_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'feta', role: 'fat' }, { foodId: 'pita', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'tabbouleh', role: 'carb' }, { foodId: 'hummus', role: 'fat' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'sea_bass', role: 'protein' }, { foodId: 'couscous', role: 'carb' }, { foodId: 'roasted_veggies', role: 'veggie' }] },
];

const MEDITERRANEAN_LEAN_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'pita', role: 'carb' }, { foodId: 'berries', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'tabbouleh', role: 'carb' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'sea_bass', role: 'protein' }, { foodId: 'couscous', role: 'carb' }, { foodId: 'roasted_veggies', role: 'veggie' }] },
];

const MEDITERRANEAN_MAIN_ALT: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'greek_yogurt', role: 'protein' }, { foodId: 'berries', role: 'carb' }, { foodId: 'pita', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'chicken_breast', role: 'protein' }, { foodId: 'couscous', role: 'carb' }, { foodId: 'roasted_veggies', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'sea_bass', role: 'protein' }, { foodId: 'tabbouleh', role: 'carb' }, { foodId: 'roasted_veggies', role: 'veggie' }] },
];

const VEGETARIAN_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }, { foodId: 'berries', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'lentils', role: 'complete' }, { foodId: 'quinoa', role: 'carb' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'tempeh', role: 'protein' }, { foodId: 'sweet_potato', role: 'carb' }, { foodId: 'broccoli', role: 'veggie' }] },
];

const VEGAN_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'tofu', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }, { foodId: 'banana', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'lentils', role: 'complete' }, { foodId: 'brown_rice', role: 'carb' }, { foodId: 'roasted_veggies', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'tempeh', role: 'protein' }, { foodId: 'quinoa', role: 'carb' }, { foodId: 'broccoli', role: 'veggie' }] },
];

const VEGETARIAN_KETO_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'avocado', role: 'fat' }, { foodId: 'cream_cheese', role: 'fat' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'tofu', role: 'protein' }, { foodId: 'cheddar', role: 'fat' }, { foodId: 'spinach_cooked', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'tempeh', role: 'protein' }, { foodId: 'cauliflower', role: 'veggie' }, { foodId: 'olive_oil', role: 'fat' }] },
];

const VEGETARIAN_HP_MAIN: MealBlueprint[] = [
  { name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
    foods: [{ foodId: 'eggs', role: 'protein' }, { foodId: 'cottage_cheese', role: 'protein' }, { foodId: 'oats_dry', role: 'carb' }] },
  { name: 'Lunch', icon: 'sun', percentage: 0.35,
    foods: [{ foodId: 'tofu', role: 'protein' }, { foodId: 'lentils', role: 'complete' }, { foodId: 'mixed_greens', role: 'veggie' }] },
  { name: 'Dinner', icon: 'moon', percentage: 0.30,
    foods: [{ foodId: 'tempeh', role: 'protein' }, { foodId: 'quinoa', role: 'carb' }, { foodId: 'broccoli', role: 'veggie' }] },
];

// ─── Food swap tables ────────────────────────────────────────────────────────

const MEAT_TAGS = ['meat', 'fish'];
const ANIMAL_TAGS = ['meat', 'fish', 'dairy', 'egg', 'animal'];
const DAIRY_TAGS = ['dairy'];
const GLUTEN_TAGS = ['gluten'];
const LEGUME_GRAIN_TAGS = ['legume', 'grain', 'dairy'];

function foodHasTag(food: FoodItemData, tags: string[]): boolean {
  return food.tags.some((t) => tags.includes(t));
}

const DAIRY_FREE_SWAPS: Record<string, string> = {
  greek_yogurt: 'edamame',
  cottage_cheese: 'tofu',
  cheddar: 'avocado',
  mozzarella: 'avocado',
  feta: 'olives',
  cream_cheese: 'almond_butter',
  butter: 'olive_oil',
  string_cheese: 'almonds',
  whey_protein: 'plant_protein',
  tzatziki: 'hummus',
  bulletproof_coffee: 'coconut_oil',
};

const GLUTEN_FREE_SWAPS: Record<string, string> = {
  oats_dry: 'sweet_potato',
  ww_bread: 'sweet_potato',
  couscous: 'quinoa',
  ww_pasta: 'brown_rice',
  pita: 'corn_tortilla',
  tortilla: 'corn_tortilla',
  tabbouleh: 'quinoa',
  rice_cake: 'banana',
};

const PALEO_SWAPS: Record<string, string> = {
  oats_dry: 'sweet_potato',
  brown_rice: 'sweet_potato',
  white_rice: 'potato',
  quinoa: 'sweet_potato',
  ww_bread: 'sweet_potato',
  ww_pasta: 'zucchini',
  couscous: 'cauliflower',
  pita: 'sweet_potato',
  tortilla: 'sweet_potato',
  corn_tortilla: 'sweet_potato',
  tabbouleh: 'roasted_veggies',
  lentils: 'sweet_potato',
  black_beans: 'sweet_potato',
  chickpeas: 'cauliflower',
  edamame: 'almonds',
  peanut_butter: 'almond_butter',
  hummus: 'avocado',
  greek_yogurt: 'avocado',
  cottage_cheese: 'avocado',
  cheddar: 'avocado',
  mozzarella: 'avocado',
  feta: 'olives',
  cream_cheese: 'almond_butter',
  butter: 'coconut_oil',
  string_cheese: 'macadamia',
  whey_protein: 'plant_protein',
  rice_cake: 'apple',
};

const LOW_GLYCEMIC_SWAPS: Record<string, string> = {
  white_rice: 'quinoa',
  pita: 'sweet_potato',
  tortilla: 'sweet_potato',
  corn_tortilla: 'sweet_potato',
  couscous: 'quinoa',
  tabbouleh: 'quinoa',
  rice_cake: 'apple',
  banana: 'apple',
  dates: 'berries',
  potato: 'sweet_potato',
};

function applyFoodSwaps(
  foodId: string,
  modifiers: string[]
): string {
  let current = foodId;
  const food = FOODS[current];
  if (!food) return current;

  if (modifiers.includes('dairy_free') && foodHasTag(food, DAIRY_TAGS)) {
    current = DAIRY_FREE_SWAPS[current] ?? current;
  }

  if (modifiers.includes('gluten_free')) {
    const f2 = FOODS[current];
    if (f2 && foodHasTag(f2, GLUTEN_TAGS)) {
      current = GLUTEN_FREE_SWAPS[current] ?? current;
    }
  }

  if (modifiers.includes('paleo')) {
    if (PALEO_SWAPS[current]) {
      current = PALEO_SWAPS[current];
    } else {
      const f2 = FOODS[current];
      if (f2 && foodHasTag(f2, LEGUME_GRAIN_TAGS)) {
        current = PALEO_SWAPS[current] ?? current;
      }
    }
  }

  if (modifiers.includes('low_glycemic')) {
    if (LOW_GLYCEMIC_SWAPS[current]) {
      current = LOW_GLYCEMIC_SWAPS[current];
    }
  }

  return current;
}

function pickVariant<T>(variants: T[], generationSeed = 0): T {
  if (variants.length === 0) {
    throw new Error('No meal plan variants available');
  }
  const index = Math.abs(generationSeed) % variants.length;
  return variants[index];
}

// ─── Blueprint selection ─────────────────────────────────────────────────────

interface MainMealConfig {
  main: MealBlueprint[];
  snacks: SnackSet;
}

function selectMainConfig(
  eatingStyle: EatingStyle,
  macros: MacroTargets,
  generationSeed = 0
): MainMealConfig {
  const fatRatio = macros.calories > 0 ? (macros.fat_g * 9) / macros.calories : 0;
  const proteinRatio = macros.calories > 0 ? (macros.protein_g * 4) / macros.calories : 0;

  switch (eatingStyle) {
    case 'mediterranean':
      if (fatRatio <= 0.28) {
        return {
          main: pickVariant([MEDITERRANEAN_LEAN_MAIN, MEDITERRANEAN_MAIN_ALT], generationSeed),
          snacks: MEDITERRANEAN_SNACKS,
        };
      }
      return {
        main: pickVariant([MEDITERRANEAN_MAIN, MEDITERRANEAN_MAIN_ALT], generationSeed),
        snacks: MEDITERRANEAN_SNACKS,
      };
    case 'vegan':
      return { main: VEGAN_MAIN, snacks: VEGAN_SNACKS };
    case 'vegetarian':
      return { main: VEGETARIAN_MAIN, snacks: VEGETARIAN_SNACKS };
    case 'keto':
      if (proteinRatio >= 0.28 && fatRatio <= 0.7) {
        return { main: KETO_HP_MAIN, snacks: KETO_SNACKS };
      }
      return {
        main: pickVariant([KETO_MAIN, KETO_MAIN_ALT], generationSeed),
        snacks: KETO_SNACKS,
      };
    case 'carnivore':
      return {
        main: pickVariant([CARNIVORE_MAIN, CARNIVORE_MAIN_ALT], generationSeed),
        snacks: CARNIVORE_SNACKS,
      };
    case 'paleo':
    case 'standard':
      if (proteinRatio > 0.38) {
        return { main: HIGH_PROTEIN_MAIN, snacks: HIGH_PROTEIN_SNACKS };
      }
    default:
      return {
        main: pickVariant([BALANCED_MAIN, BALANCED_MAIN_ALT], generationSeed),
        snacks: BALANCED_SNACKS,
      };
  }
}

// ─── IF timing ───────────────────────────────────────────────────────────────

function applyIFTimings(meals: MealBlueprint[]): MealBlueprint[] {
  const breakfast = meals.find((m) => m.name === 'Breakfast');
  const lunch = meals.find((m) => m.name === 'Lunch');
  const dinner = meals.find((m) => m.name === 'Dinner');
  const afternoonSnack = meals.find((m) => m.name === 'Afternoon Snack');

  if (!lunch || !dinner) return meals;

  const breakfastPct = breakfast?.percentage ?? 0;
  const morningSnackPct = meals.find((m) => m.name === 'Morning Snack')?.percentage ?? 0;
  const eveningSnackPct = meals.find((m) => m.name === 'Evening Snack')?.percentage ?? 0;
  const redistributed = (breakfastPct + morningSnackPct + eveningSnackPct) / 2;

  const result: MealBlueprint[] = [
    {
      name: 'First Meal (Noon)',
      icon: 'sun',
      percentage: lunch.percentage + redistributed,
      foods: [
        ...lunch.foods,
        ...(breakfast?.foods.slice(0, 1) ?? []),
      ],
    },
    ...(afternoonSnack ? [{
      ...afternoonSnack,
      name: 'Snack (Eating Window)',
      percentage: afternoonSnack.percentage,
    }] : []),
    {
      name: 'Second Meal',
      icon: 'moon',
      percentage: dinner.percentage + redistributed,
      foods: dinner.foods,
    },
  ];

  const totalPct = result.reduce((sum, meal) => sum + meal.percentage, 0);
  if (Math.abs(totalPct - 1) > 0.001) {
    if (__DEV__) {
      console.warn(`[mealPlan] IF percentages drifted from 1.0 (${totalPct.toFixed(4)}), normalizing.`);
    }
    const maxIdx = result.reduce(
      (best, meal, idx, arr) => (meal.percentage > arr[best].percentage ? idx : best),
      0
    );
    const delta = 1 - totalPct;
    result[maxIdx] = {
      ...result[maxIdx],
      percentage: result[maxIdx].percentage + delta,
    };
  }

  return result;
}

// ─── Solver and reconciliation ───────────────────────────────────────────────

const DAILY_TOLERANCE = { protein: 8, carbs: 15, fat: 6, calories: 60 };
const MIN_SCALE = 0.5;
const MAX_SCALE = 2.5;
const RECOVERY_MAX_SCALE = 4.0;
const SOLVER_ITERATIONS = 80;
const DAILY_RECONCILIATION_ITERATIONS = 160;

type MacroKey = 'protein_g' | 'carbs_g' | 'fat_g';
type MacroTolerance = { protein: number; carbs: number; fat: number; calories: number };

function getMealTargets(daily: MacroTargets, pct: number): MacroTargets {
  return {
    calories: Math.round(daily.calories * pct),
    protein_g: Math.round(daily.protein_g * pct),
    carbs_g: Math.round(daily.carbs_g * pct),
    fat_g: Math.round(daily.fat_g * pct),
  };
}

function withinTolerance(
  actual: MacroTargets,
  target: MacroTargets,
  tolerance: MacroTolerance = DAILY_TOLERANCE
): boolean {
  return (
    Math.abs(actual.calories - target.calories) <= tolerance.calories &&
    Math.abs(actual.protein_g - target.protein_g) <= tolerance.protein &&
    Math.abs(actual.carbs_g - target.carbs_g) <= tolerance.carbs &&
    Math.abs(actual.fat_g - target.fat_g) <= tolerance.fat
  );
}

function getMealTolerance(target: MacroTargets): MacroTolerance {
  return {
    protein: Math.max(2, Math.round(target.protein_g * 0.08)),
    carbs: Math.max(4, Math.round(target.carbs_g * 0.08)),
    fat: Math.max(2, Math.round(target.fat_g * 0.1)),
    calories: Math.max(25, Math.round(target.calories * 0.08)),
  };
}

function getCaloriesFromMacros(macros: {
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}): number {
  return macros.protein_g * 4 + macros.carbs_g * 4 + macros.fat_g * 9;
}

export function normalizeMacroTargetsForPlanning(target: MacroTargets): {
  normalizedTargets: MacroTargets;
  wasNormalized: boolean;
  deltaCalories: number;
} {
  const macroCalories = Math.round(getCaloriesFromMacros(target));
  const deltaCalories = macroCalories - target.calories;
  const wasNormalized = Math.abs(deltaCalories) > 75;

  if (!wasNormalized) {
    return {
      normalizedTargets: target,
      wasNormalized: false,
      deltaCalories: 0,
    };
  }

  return {
    normalizedTargets: {
      ...target,
      calories: macroCalories,
    },
    wasNormalized: true,
    deltaCalories,
  };
}

function scoreTargets(actual: MacroTargets, target: MacroTargets): number {
  const calErr = Math.abs(actual.calories - target.calories) / Math.max(target.calories, 1);
  const pErr = Math.abs(actual.protein_g - target.protein_g) / Math.max(target.protein_g, 1);
  const cErr = Math.abs(actual.carbs_g - target.carbs_g) / Math.max(target.carbs_g, 1);
  const fErr = Math.abs(actual.fat_g - target.fat_g) / Math.max(target.fat_g, 1);
  return calErr * 0.9 + pErr * 2.2 + cErr * 1.6 + fErr * 1.9;
}

function getMacroGap(actual: MacroTargets, target: MacroTargets, key: MacroKey): number {
  return target[key] - actual[key];
}

function getRolePriority(role: MealFoodRef['role'], key: MacroKey): number {
  if (key === 'protein_g') {
    if (role === 'protein') return 3;
    if (role === 'complete') return 2;
    if (role === 'fat') return 1;
    return 0;
  }
  if (key === 'carbs_g') {
    if (role === 'carb') return 3;
    if (role === 'complete') return 2;
    if (role === 'veggie') return 1;
    return 0;
  }
  if (role === 'fat') return 3;
  if (role === 'protein' || role === 'complete') return 1;
  return 0;
}

function getCandidateOrder(
  resolvedFoods: { food: FoodItemData; ref: MealFoodRef }[],
  key: MacroKey
): number[] {
  return resolvedFoods
    .map(({ food, ref }, idx) => ({
      idx,
      priority: getRolePriority(ref.role, key),
      density: food.per100g[key],
    }))
    .filter((item) => item.priority > 0 && item.density > 0)
    .sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return b.density - a.density;
    })
    .map((item) => item.idx);
}

function getAdjustmentOrder(actual: MacroTargets, target: MacroTargets): MacroKey[] {
  return (['protein_g', 'carbs_g', 'fat_g'] as MacroKey[]).sort((a, b) => {
    const aErr = Math.abs(getMacroGap(actual, target, a)) / Math.max(target[a], 1);
    const bErr = Math.abs(getMacroGap(actual, target, b)) / Math.max(target[b], 1);
    return bErr - aErr;
  });
}

const ROLE_FALLBACK_FOODS: Record<MealFoodRef['role'], string[]> = {
  protein: ['chicken_breast', 'eggs', 'tofu', 'lentils', 'salmon'],
  carb: ['brown_rice', 'sweet_potato', 'quinoa', 'oats_dry'],
  fat: ['olive_oil', 'avocado', 'almonds'],
  veggie: ['broccoli', 'mixed_greens', 'cauliflower'],
  complete: ['lentils', 'black_beans', 'chickpeas', 'tofu'],
};

function appendFallbackFoods(
  resolvedFoods: { food: FoodItemData; ref: MealFoodRef }[],
  blueprint: MealBlueprint,
  mealTarget: MacroTargets,
  modifiers: string[],
  allergies: UserAllergy[],
  dislikedFoodIds: string[],
  seenIds: Set<string>
): void {
  const missingRoles = Array.from(new Set(blueprint.foods.map((f) => f.role))).filter(
    (role) => !resolvedFoods.some((item) => item.ref.role === role)
  );
  if (mealTarget.fat_g >= 6 && !resolvedFoods.some((item) => item.ref.role === 'fat')) {
    missingRoles.push('fat');
  }
  if (mealTarget.carbs_g >= 10 && !resolvedFoods.some((item) => item.ref.role === 'carb')) {
    missingRoles.push('carb');
  }

  for (const role of Array.from(new Set(missingRoles))) {
    const candidates = ROLE_FALLBACK_FOODS[role] ?? [];
    for (const baseFoodId of candidates) {
      const foodId = applyFoodSwaps(baseFoodId, modifiers);
      const food = FOODS[foodId];
      if (!food || seenIds.has(foodId)) continue;
      if (isFoodBlockedByAllergies(food, allergies)) continue;
      if (dislikedFoodIds.includes(foodId)) continue;
      seenIds.add(foodId);
      resolvedFoods.push({ food, ref: { foodId, role } });
      break;
    }
  }
}

function buildMealToTarget(
  blueprint: MealBlueprint,
  mealTarget: MacroTargets,
  modifiers: string[],
  measurementSystem: MeasurementSystem = 'us',
  allergies: UserAllergy[] = [],
  dislikedFoodIds: string[] = []
): MealSlot {
  const resolvedFoods: { food: FoodItemData; ref: MealFoodRef }[] = [];
  const seenIds = new Set<string>();

  for (const ref of blueprint.foods) {
    let foodId = applyFoodSwaps(ref.foodId, modifiers);
    const food = FOODS[foodId];
    if (!food || seenIds.has(foodId)) continue;
    if (isFoodBlockedByAllergies(food, allergies)) continue;
    if (dislikedFoodIds.includes(foodId)) continue;
    seenIds.add(foodId);
    resolvedFoods.push({ food, ref: { ...ref, foodId } });
  }

  appendFallbackFoods(
    resolvedFoods,
    blueprint,
    mealTarget,
    modifiers,
    allergies,
    dislikedFoodIds,
    seenIds
  );

  if (resolvedFoods.length === 0) {
    return {
      name: blueprint.name,
      icon: blueprint.icon,
      percentage: blueprint.percentage,
      suggestions: [],
    };
  }

  const multipliers = solveMealMacros(resolvedFoods, mealTarget);
  const suggestions: MealSuggestion[] = resolvedFoods.map(({ food, ref }, idx) => {
    const m = multipliers[idx] ?? 1;
    const portionG = Math.round(food.basePortionG * m);
    const macros = computeMacros(food, portionG);
    const portion = formatPortionLabel(food, portionG, measurementSystem);

    return {
      id: `${blueprint.name.toLowerCase().replace(/\s+/g, '-')}-${idx}-${food.id}`,
      foodId: food.id,
      name: food.name,
      portion,
      portionGrams: portionG,
      protein_g: Math.round(macros.protein_g * 10) / 10,
      carbs_g: Math.round(macros.carbs_g * 10) / 10,
      fat_g: Math.round(macros.fat_g * 10) / 10,
      calories: Math.round(getCaloriesFromMacros(macros)),
      category: roleToCategory(ref.role),
      isSubstitutable: true,
    };
  });

  return {
    name: blueprint.name,
    icon: blueprint.icon,
    percentage: blueprint.percentage,
    suggestions,
  };
}

function scaleMealToTargets(
  blueprint: MealBlueprint,
  dailyMacros: MacroTargets,
  modifiers: string[],
  measurementSystem: MeasurementSystem = 'us',
  allergies: UserAllergy[] = [],
  dislikedFoodIds: string[] = []
): MealSlot {
  return buildMealToTarget(
    blueprint,
    getMealTargets(dailyMacros, blueprint.percentage),
    modifiers,
    measurementSystem,
    allergies,
    dislikedFoodIds
  );
}

function solveMealMacros(
  resolvedFoods: { food: FoodItemData; ref: MealFoodRef }[],
  target: MacroTargets
): number[] {
  let mults = resolvedFoods.map(() => 1);
  const mealTolerance = getMealTolerance(target);

  const getTotals = (m: number[]) => {
    let cal = 0, p = 0, c = 0, f = 0;
    resolvedFoods.forEach(({ food }, i) => {
      const g = food.basePortionG * (m[i] ?? 1);
      const factor = g / 100;
      p += food.per100g.protein_g * factor;
      c += food.per100g.carbs_g * factor;
      f += food.per100g.fat_g * factor;
    });
    cal = getCaloriesFromMacros({ protein_g: p, carbs_g: c, fat_g: f });
    return { calories: cal, protein_g: p, carbs_g: c, fat_g: f };
  };

  for (let iter = 0; iter < SOLVER_ITERATIONS; iter++) {
    const tot = getTotals(mults);
    if (withinTolerance(tot, target, mealTolerance)) break;

    const currentScore = scoreTargets(tot, target);
    let bestScore = currentScore;
    let bestMults = mults;

    const macroOrder = getAdjustmentOrder(tot, target);
    for (const key of macroOrder) {
      const gap = getMacroGap(tot, target, key);
      const tolerance =
        key === 'protein_g'
          ? mealTolerance.protein
          : key === 'carbs_g'
            ? mealTolerance.carbs
            : mealTolerance.fat;

      if (Math.abs(gap) <= tolerance) continue;

      const factors = gap > 0 ? [1.18, 1.12, 1.08] : [0.82, 0.88, 0.94];
      const candidateIndices = getCandidateOrder(resolvedFoods, key).slice(0, 4);

      for (const idx of candidateIndices) {
        for (const factor of factors) {
          const nextMults = [...mults];
          nextMults[idx] = Math.max(MIN_SCALE, Math.min(MAX_SCALE, (nextMults[idx] ?? 1) * factor));
          if (Math.abs(nextMults[idx] - (mults[idx] ?? 1)) < 0.001) continue;

          const candidateScore = scoreTargets(getTotals(nextMults), target);
          if (candidateScore + 0.0001 < bestScore) {
            bestScore = candidateScore;
            bestMults = nextMults;
          }
        }
      }
    }

    if (bestScore + 0.0001 >= currentScore) {
      break;
    }

    mults = bestMults;
  }

  return mults;
}

function getDailyTotals(meals: MealSlot[]): MacroTargets {
  return meals.reduce(
    (acc, meal) => {
      meal.suggestions.forEach((s) => {
        acc.calories += s.calories;
        acc.protein_g += s.protein_g;
        acc.carbs_g += s.carbs_g;
        acc.fat_g += s.fat_g;
      });
      return acc;
    },
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
  );
}

function cloneMeals(meals: MealSlot[]): MealSlot[] {
  return meals.map((meal) => ({
    ...meal,
    suggestions: meal.suggestions.map((suggestion) => ({ ...suggestion })),
  }));
}

function getSuggestionRolePriority(
  suggestion: MealSuggestion,
  food: FoodItemData,
  key: MacroKey
): number {
  if (key === 'protein_g') {
    if (suggestion.category === 'protein') return 3;
    if (suggestion.category === 'mixed') return 2;
    return food.per100g.protein_g > 10 ? 1 : 0;
  }
  if (key === 'carbs_g') {
    if (suggestion.category === 'carb') return 3;
    if (suggestion.category === 'mixed') return 2;
    if (suggestion.category === 'veggie') return 1;
    return 0;
  }
  if (suggestion.category === 'fat') return 3;
  if (suggestion.category === 'mixed') return 2;
  return food.per100g.fat_g > 8 ? 1 : 0;
}

function adjustSuggestionPortion(
  meals: MealSlot[],
  mealIdx: number,
  suggestionIdx: number,
  factor: number,
  measurementSystem: MeasurementSystem
): MealSlot[] {
  const nextMeals = cloneMeals(meals);
  const suggestion = nextMeals[mealIdx].suggestions[suggestionIdx];
  const food = FOODS[suggestion.foodId];
  if (!food) return meals;

  const targetGrams = Math.round(
    Math.max(MIN_SCALE, Math.min(MAX_SCALE, (suggestion.portionGrams / food.basePortionG) * factor)) *
      food.basePortionG
  );
  const macros = computeMacros(food, targetGrams);
  nextMeals[mealIdx].suggestions[suggestionIdx] = {
    ...suggestion,
    portionGrams: targetGrams,
    portion: formatPortionLabel(food, targetGrams, measurementSystem),
    calories: Math.round(getCaloriesFromMacros(macros)),
    protein_g: Math.round(macros.protein_g * 10) / 10,
    carbs_g: Math.round(macros.carbs_g * 10) / 10,
    fat_g: Math.round(macros.fat_g * 10) / 10,
  };

  return nextMeals;
}

function adjustSuggestionByGramDelta(
  meals: MealSlot[],
  mealIdx: number,
  suggestionIdx: number,
  gramDelta: number,
  measurementSystem: MeasurementSystem
): MealSlot[] {
  const nextMeals = cloneMeals(meals);
  const suggestion = nextMeals[mealIdx].suggestions[suggestionIdx];
  const food = FOODS[suggestion.foodId];
  if (!food) return meals;

  const minGrams = Math.round(food.basePortionG * MIN_SCALE);
  const maxGrams = Math.round(food.basePortionG * MAX_SCALE);
  const targetGrams = Math.max(
    minGrams,
    Math.min(maxGrams, Math.round(suggestion.portionGrams + gramDelta))
  );

  if (targetGrams === suggestion.portionGrams) {
    return meals;
  }

  const macros = computeMacros(food, targetGrams);
  nextMeals[mealIdx].suggestions[suggestionIdx] = {
    ...suggestion,
    portionGrams: targetGrams,
    portion: formatPortionLabel(food, targetGrams, measurementSystem),
    calories: Math.round(getCaloriesFromMacros(macros)),
    protein_g: Math.round(macros.protein_g * 10) / 10,
    carbs_g: Math.round(macros.carbs_g * 10) / 10,
    fat_g: Math.round(macros.fat_g * 10) / 10,
  };

  return nextMeals;
}

function adjustSuggestionByGramDeltaWithBounds(
  meals: MealSlot[],
  mealIdx: number,
  suggestionIdx: number,
  gramDelta: number,
  measurementSystem: MeasurementSystem,
  maxScale: number
): MealSlot[] {
  const nextMeals = cloneMeals(meals);
  const suggestion = nextMeals[mealIdx].suggestions[suggestionIdx];
  const food = FOODS[suggestion.foodId];
  if (!food) return meals;

  const minGrams = Math.round(food.basePortionG * MIN_SCALE);
  const maxGrams = Math.round(food.basePortionG * maxScale);
  const targetGrams = Math.max(
    minGrams,
    Math.min(maxGrams, Math.round(suggestion.portionGrams + gramDelta))
  );

  if (targetGrams === suggestion.portionGrams) {
    return meals;
  }

  const macros = computeMacros(food, targetGrams);
  nextMeals[mealIdx].suggestions[suggestionIdx] = {
    ...suggestion,
    portionGrams: targetGrams,
    portion: formatPortionLabel(food, targetGrams, measurementSystem),
    calories: Math.round(getCaloriesFromMacros(macros)),
    protein_g: Math.round(macros.protein_g * 10) / 10,
    carbs_g: Math.round(macros.carbs_g * 10) / 10,
    fat_g: Math.round(macros.fat_g * 10) / 10,
  };

  return nextMeals;
}

function reconcileDailyTotals(
  meals: MealSlot[],
  dailyTarget: MacroTargets,
  measurementSystem: MeasurementSystem = 'us'
): MealSlot[] {
  let workingMeals = cloneMeals(meals);

  for (let iter = 0; iter < DAILY_RECONCILIATION_ITERATIONS; iter++) {
    const totals = getDailyTotals(workingMeals);
    if (withinTolerance(totals, dailyTarget, DAILY_TOLERANCE)) {
      return workingMeals;
    }

    const currentScore = scoreTargets(totals, dailyTarget);
    let bestScore = currentScore;
    let bestMeals = workingMeals;

    const macroOrder = getAdjustmentOrder(totals, dailyTarget);
    for (const key of macroOrder) {
      const gap = getMacroGap(totals, dailyTarget, key);
      const tolerance =
        key === 'protein_g'
          ? DAILY_TOLERANCE.protein
          : key === 'carbs_g'
            ? DAILY_TOLERANCE.carbs
            : DAILY_TOLERANCE.fat;

      if (Math.abs(gap) <= tolerance) continue;

      const factors = gap > 0 ? [1.25, 1.15, 1.08] : [0.75, 0.85, 0.92];
      const candidates = workingMeals.flatMap((meal, mealIdx) =>
        meal.suggestions
          .map((suggestion, suggestionIdx) => {
            const food = FOODS[suggestion.foodId];
            if (!food) return null;
            return {
              mealIdx,
              suggestionIdx,
              priority: getSuggestionRolePriority(suggestion, food, key),
              density: food.per100g[key],
            };
          })
          .filter((candidate): candidate is NonNullable<typeof candidate> => {
            return candidate != null && candidate.priority > 0 && candidate.density > 0;
          })
      )
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.density - a.density;
      })
      .slice(0, 8);

      for (const candidate of candidates) {
        for (const factor of factors) {
          const nextMeals = adjustSuggestionPortion(
            workingMeals,
            candidate.mealIdx,
            candidate.suggestionIdx,
            factor,
            measurementSystem
          );
          const candidateScore = scoreTargets(getDailyTotals(nextMeals), dailyTarget);
          if (candidateScore + 0.0001 < bestScore) {
            bestScore = candidateScore;
            bestMeals = nextMeals;
          }
        }
      }
    }

    if (bestScore + 0.0001 >= currentScore) {
      return workingMeals;
    }

    workingMeals = bestMeals;
  }

  return workingMeals;
}

function needsCloseGapTightening(actual: MacroTargets, target: MacroTargets): boolean {
  const calorieGap = target.calories - actual.calories;
  return Math.abs(calorieGap) > 20 && Math.abs(calorieGap) <= 180;
}

function getCloseGapScore(actual: MacroTargets, target: MacroTargets): number {
  const calorieGap = target.calories - actual.calories;
  const proteinGap = target.protein_g - actual.protein_g;
  const carbGap = target.carbs_g - actual.carbs_g;
  const fatGap = target.fat_g - actual.fat_g;

  const caloriePenalty = Math.abs(calorieGap) / 20;
  const proteinPenalty = Math.abs(proteinGap) / 6;
  const carbPenalty = Math.abs(carbGap) / 10;
  const fatPenalty = Math.abs(fatGap) / 4;

  const overshootPenalty =
    Math.max(0, actual.protein_g - target.protein_g - 4) * 0.35 +
    Math.max(0, actual.carbs_g - target.carbs_g - 10) * 0.18 +
    Math.max(0, actual.fat_g - target.fat_g - 4) * 0.45 +
    Math.max(0, actual.calories - target.calories - 35) * 0.08;

  return caloriePenalty * 2 + proteinPenalty + carbPenalty + fatPenalty + overshootPenalty;
}

function getCloseGapMacroOrder(
  eatingStyle: EatingStyle,
  actual: MacroTargets,
  target: MacroTargets
): MacroKey[] {
  const calorieGap = target.calories - actual.calories;

  if (calorieGap >= 0) {
    const energyByMacro: Record<MacroKey, number> = {
      protein_g: Math.max(0, target.protein_g - actual.protein_g) * 4,
      carbs_g: Math.max(0, target.carbs_g - actual.carbs_g) * 4,
      fat_g: Math.max(0, target.fat_g - actual.fat_g) * 9,
    };

    const baseOrder: MacroKey[] =
      eatingStyle === 'keto' || eatingStyle === 'carnivore'
        ? ['fat_g', 'protein_g', 'carbs_g']
        : ['carbs_g', 'protein_g', 'fat_g'];

    return [...baseOrder].sort((a, b) => {
      if (energyByMacro[a] !== energyByMacro[b]) {
        return energyByMacro[b] - energyByMacro[a];
      }
      return baseOrder.indexOf(a) - baseOrder.indexOf(b);
    });
  }

  const excessEnergyByMacro: Record<MacroKey, number> = {
    protein_g: Math.max(0, actual.protein_g - target.protein_g) * 4,
    carbs_g: Math.max(0, actual.carbs_g - target.carbs_g) * 4,
    fat_g: Math.max(0, actual.fat_g - target.fat_g) * 9,
  };
  const baseOrder: MacroKey[] = ['fat_g', 'carbs_g', 'protein_g'];

  return [...baseOrder].sort((a, b) => {
    if (excessEnergyByMacro[a] !== excessEnergyByMacro[b]) {
      return excessEnergyByMacro[b] - excessEnergyByMacro[a];
    }
    return baseOrder.indexOf(a) - baseOrder.indexOf(b);
  });
}

function tightenCloseCalorieGap(
  meals: MealSlot[],
  eatingStyle: EatingStyle,
  dailyTarget: MacroTargets,
  measurementSystem: MeasurementSystem = 'us'
): MealSlot[] {
  let workingMeals = cloneMeals(meals);

  for (let iter = 0; iter < 24; iter++) {
    const totals = getDailyTotals(workingMeals);
    if (!needsCloseGapTightening(totals, dailyTarget)) {
      return workingMeals;
    }

    const currentScore = getCloseGapScore(totals, dailyTarget);
    let bestScore = currentScore;
    let bestMeals = workingMeals;

    const macroOrder = getCloseGapMacroOrder(eatingStyle, totals, dailyTarget);
    const calorieGap = dailyTarget.calories - totals.calories;
    for (const key of macroOrder) {
      const candidates = workingMeals.flatMap((meal, mealIdx) =>
        meal.suggestions
          .map((suggestion, suggestionIdx) => {
            const food = FOODS[suggestion.foodId];
            if (!food) return null;
            return {
              mealIdx,
              suggestionIdx,
              priority: getSuggestionRolePriority(suggestion, food, key),
              density: food.per100g[key],
            };
          })
          .filter((candidate): candidate is NonNullable<typeof candidate> => {
            return candidate != null && candidate.priority > 0 && candidate.density > 0;
          })
      )
      .sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.density - a.density;
      })
      .slice(0, 10);

      for (const candidate of candidates) {
        const gramSteps =
          calorieGap >= 0
            ? [5, 8, 10, 12, 15, 18, 22, 28, 35]
            : [-5, -8, -10, -12, -15, -18, -22, -28, -35];

        for (const gramDelta of gramSteps) {
          const nextMeals = adjustSuggestionByGramDelta(
            workingMeals,
            candidate.mealIdx,
            candidate.suggestionIdx,
            gramDelta,
            measurementSystem
          );
          const nextTotals = getDailyTotals(nextMeals);
          if (nextTotals.calories > dailyTarget.calories + 45) {
            continue;
          }
          if (
            totals.protein_g >= dailyTarget.protein_g &&
            nextTotals.protein_g > totals.protein_g + 1.5
          ) {
            continue;
          }
          if (
            totals.fat_g >= dailyTarget.fat_g &&
            nextTotals.fat_g > totals.fat_g + 1.2
          ) {
            continue;
          }
          if (
            totals.carbs_g >= dailyTarget.carbs_g &&
            nextTotals.carbs_g > totals.carbs_g + 4
          ) {
            continue;
          }
          const candidateScore = getCloseGapScore(nextTotals, dailyTarget);
          if (candidateScore + 0.0001 < bestScore) {
            bestScore = candidateScore;
            bestMeals = nextMeals;
          }
        }
      }
    }

    if (bestScore + 0.0001 >= currentScore) {
      return workingMeals;
    }

    workingMeals = bestMeals;
  }

  return workingMeals;
}

function recoverRemainingCalorieGap(
  meals: MealSlot[],
  eatingStyle: EatingStyle,
  dailyTarget: MacroTargets,
  measurementSystem: MeasurementSystem = 'us'
): MealSlot[] {
  let workingMeals = cloneMeals(meals);

  for (let iter = 0; iter < 28; iter++) {
    const totals = getDailyTotals(workingMeals);
    const calorieGap = dailyTarget.calories - totals.calories;
    if (Math.abs(calorieGap) <= DAILY_TOLERANCE.calories) {
      return workingMeals;
    }

    const increasing = calorieGap > 0;
    const gramSteps = increasing
      ? [4, 7, 10, 14, 18, 24, 32, 42, 56]
      : [-4, -7, -10, -14, -18, -24, -32, -42, -56];

    const macroKeyOrder = getCloseGapMacroOrder(eatingStyle, totals, dailyTarget);

    let bestMeals = workingMeals;
    let bestScore = getCloseGapScore(totals, dailyTarget);

    for (const key of macroKeyOrder) {
      const candidates = workingMeals
        .flatMap((meal, mealIdx) =>
          meal.suggestions
            .map((suggestion, suggestionIdx) => {
              const food = FOODS[suggestion.foodId];
              if (!food) return null;
              return {
                mealIdx,
                suggestionIdx,
                priority: getSuggestionRolePriority(suggestion, food, key),
                density: food.per100g[key],
              };
            })
            .filter((candidate): candidate is NonNullable<typeof candidate> => {
              return candidate != null && candidate.priority > 0 && candidate.density > 0;
            })
        )
        .sort((a, b) => {
          if (a.priority !== b.priority) return b.priority - a.priority;
          return b.density - a.density;
        })
        .slice(0, 14);

      for (const candidate of candidates) {
        for (const gramDelta of gramSteps) {
          const nextMeals = adjustSuggestionByGramDeltaWithBounds(
            workingMeals,
            candidate.mealIdx,
            candidate.suggestionIdx,
            gramDelta,
            measurementSystem,
            RECOVERY_MAX_SCALE
          );
          const nextTotals = getDailyTotals(nextMeals);
          if (nextTotals.calories > dailyTarget.calories + 60) continue;
          if (
            (eatingStyle === 'keto' || eatingStyle === 'carnivore') &&
            nextTotals.carbs_g > dailyTarget.carbs_g + 10
          ) {
            continue;
          }

          const candidateScore = getCloseGapScore(nextTotals, dailyTarget);
          if (candidateScore + 0.0001 < bestScore) {
            bestScore = candidateScore;
            bestMeals = nextMeals;
          }
        }
      }
    }

    if (bestMeals === workingMeals) {
      return workingMeals;
    }
    workingMeals = bestMeals;
  }

  return workingMeals;
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function generateMealPlan(
  macros: MacroTargets,
  eatingStyle: EatingStyle,
  modifiers: DietaryModifier[],
  measurementSystem: MeasurementSystem = 'us',
  allergies: UserAllergy[] = [],
  generationSeed = 0,
  dislikedFoodIds: string[] = []
): DayPlan {
  const {
    normalizedTargets,
    wasNormalized,
    deltaCalories,
  } = normalizeMacroTargetsForPlanning(macros);
  const effectiveModifiers = eatingStyle === 'paleo' ? [...modifiers, 'paleo'] : modifiers;
  const isIF = effectiveModifiers.includes('intermittent_fasting');

  const config = selectMainConfig(eatingStyle, normalizedTargets, generationSeed);
  const blueprint = assembleBlueprint(config.main, config.snacks, normalizedTargets.calories);

  let mealBlueprints = [...blueprint.meals];
  if (isIF) {
    mealBlueprints = applyIFTimings(mealBlueprints);
  }

  let meals = mealBlueprints.map((mb) =>
    scaleMealToTargets(
      mb,
      normalizedTargets,
      effectiveModifiers,
      measurementSystem,
      allergies,
      dislikedFoodIds
    )
  );
  meals = reconcileDailyTotals(meals, normalizedTargets, measurementSystem);
  meals = tightenCloseCalorieGap(meals, eatingStyle, normalizedTargets, measurementSystem);
  meals = recoverRemainingCalorieGap(meals, eatingStyle, normalizedTargets, measurementSystem);

  const totalFoods = meals.reduce((s, m) => s + m.suggestions.length, 0);
  const planUnavailable = totalFoods === 0;

  return {
    eatingStyle,
    tags: effectiveModifiers as string[],
    meals,
    planUnavailable,
    targetUsed: normalizedTargets,
    targetNormalization: {
      wasNormalized,
      deltaCalories,
    },
  };
}
