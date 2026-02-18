import { FOODS, FoodItemData, computeMacros, formatPortionLabel } from '../constants/foodDatabase';
import { MacroTargets, MacroStrategy, DietaryModifier, DayPlan, MealSlot, MealSuggestion, DietaryPreference, MeasurementSystem, FoodCategory } from '../types';

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

const BALANCED_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'oats_dry', role: 'carb' },
        { foodId: 'berries', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'chicken_breast', role: 'protein' },
        { foodId: 'brown_rice', role: 'carb' },
        { foodId: 'mixed_greens', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'salmon', role: 'protein' },
        { foodId: 'sweet_potato', role: 'carb' },
        { foodId: 'broccoli', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'greek_yogurt', role: 'protein' },
        { foodId: 'almonds', role: 'fat' },
      ],
    },
  ],
};

const HIGH_PROTEIN_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'turkey_breast', role: 'protein' },
        { foodId: 'oats_dry', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'chicken_breast', role: 'protein' },
        { foodId: 'quinoa', role: 'carb' },
        { foodId: 'broccoli', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'cod', role: 'protein' },
        { foodId: 'sweet_potato', role: 'carb' },
        { foodId: 'asparagus', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'whey_protein', role: 'protein' },
        { foodId: 'apple', role: 'carb' },
      ],
    },
  ],
};

const LOW_CARB_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'avocado', role: 'fat' },
        { foodId: 'spinach_cooked', role: 'veggie' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'chicken_breast', role: 'protein' },
        { foodId: 'mixed_greens', role: 'veggie' },
        { foodId: 'olive_oil', role: 'fat' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'salmon', role: 'protein' },
        { foodId: 'cauliflower', role: 'veggie' },
        { foodId: 'green_beans', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'cottage_cheese', role: 'protein' },
        { foodId: 'almonds', role: 'fat' },
      ],
    },
  ],
};

const KETO_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'bacon', role: 'fat' },
        { foodId: 'avocado', role: 'fat' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'ground_beef_80', role: 'protein' },
        { foodId: 'cheddar', role: 'fat' },
        { foodId: 'mixed_greens', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'ribeye', role: 'protein' },
        { foodId: 'spinach_cooked', role: 'veggie' },
        { foodId: 'butter', role: 'fat' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'macadamia', role: 'fat' },
        { foodId: 'string_cheese', role: 'protein' },
      ],
    },
  ],
};

const CARNIVORE_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'bacon', role: 'fat' },
        { foodId: 'beef_liver', role: 'protein' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'ground_beef_80', role: 'protein' },
        { foodId: 'butter', role: 'fat' },
        { foodId: 'bone_broth', role: 'protein' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'ribeye', role: 'protein' },
        { foodId: 'shrimp', role: 'protein' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'beef_jerky', role: 'protein' },
        { foodId: 'hard_boiled_eggs', role: 'protein' },
      ],
    },
  ],
};

const LOW_FAT_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'oats_dry', role: 'carb' },
        { foodId: 'banana', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'turkey_breast', role: 'protein' },
        { foodId: 'white_rice', role: 'carb' },
        { foodId: 'green_beans', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'cod', role: 'protein' },
        { foodId: 'sweet_potato', role: 'carb' },
        { foodId: 'broccoli', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'greek_yogurt', role: 'protein' },
        { foodId: 'berries', role: 'carb' },
      ],
    },
  ],
};

const PERFORMANCE_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'oats_dry', role: 'carb' },
        { foodId: 'banana', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'chicken_breast', role: 'protein' },
        { foodId: 'white_rice', role: 'carb' },
        { foodId: 'roasted_veggies', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'salmon', role: 'protein' },
        { foodId: 'ww_pasta', role: 'carb' },
        { foodId: 'asparagus', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'whey_protein', role: 'protein' },
        { foodId: 'rice_cake', role: 'carb' },
        { foodId: 'peanut_butter', role: 'fat' },
      ],
    },
  ],
};

const MEDITERRANEAN_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'feta', role: 'fat' },
        { foodId: 'pita', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'chicken_breast', role: 'protein' },
        { foodId: 'tabbouleh', role: 'carb' },
        { foodId: 'hummus', role: 'fat' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'sea_bass', role: 'protein' },
        { foodId: 'couscous', role: 'carb' },
        { foodId: 'roasted_veggies', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'mixed_nuts', role: 'fat' },
        { foodId: 'dates', role: 'carb' },
      ],
    },
  ],
};

const VEGETARIAN_BALANCED_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'oats_dry', role: 'carb' },
        { foodId: 'berries', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'lentils', role: 'complete' },
        { foodId: 'quinoa', role: 'carb' },
        { foodId: 'mixed_greens', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'tempeh', role: 'protein' },
        { foodId: 'sweet_potato', role: 'carb' },
        { foodId: 'broccoli', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'greek_yogurt', role: 'protein' },
        { foodId: 'almonds', role: 'fat' },
      ],
    },
  ],
};

const VEGAN_BALANCED_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'tofu', role: 'protein' },
        { foodId: 'oats_dry', role: 'carb' },
        { foodId: 'banana', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'lentils', role: 'complete' },
        { foodId: 'brown_rice', role: 'carb' },
        { foodId: 'roasted_veggies', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'tempeh', role: 'protein' },
        { foodId: 'quinoa', role: 'carb' },
        { foodId: 'broccoli', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'plant_protein', role: 'protein' },
        { foodId: 'almond_butter', role: 'fat' },
      ],
    },
  ],
};

const VEGETARIAN_KETO_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'avocado', role: 'fat' },
        { foodId: 'cream_cheese', role: 'fat' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'tofu', role: 'protein' },
        { foodId: 'cheddar', role: 'fat' },
        { foodId: 'spinach_cooked', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'tempeh', role: 'protein' },
        { foodId: 'cauliflower', role: 'veggie' },
        { foodId: 'olive_oil', role: 'fat' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'macadamia', role: 'fat' },
        { foodId: 'string_cheese', role: 'protein' },
      ],
    },
  ],
};

const VEGETARIAN_HIGH_PROTEIN_BLUEPRINTS: StrategyBlueprints = {
  meals: [
    {
      name: 'Breakfast', icon: 'sunrise', percentage: 0.25,
      foods: [
        { foodId: 'eggs', role: 'protein' },
        { foodId: 'cottage_cheese', role: 'protein' },
        { foodId: 'oats_dry', role: 'carb' },
      ],
    },
    {
      name: 'Lunch', icon: 'sun', percentage: 0.35,
      foods: [
        { foodId: 'tofu', role: 'protein' },
        { foodId: 'lentils', role: 'complete' },
        { foodId: 'mixed_greens', role: 'veggie' },
      ],
    },
    {
      name: 'Dinner', icon: 'moon', percentage: 0.30,
      foods: [
        { foodId: 'tempeh', role: 'protein' },
        { foodId: 'quinoa', role: 'carb' },
        { foodId: 'broccoli', role: 'veggie' },
      ],
    },
    {
      name: 'Snacks', icon: 'cookie', percentage: 0.10,
      foods: [
        { foodId: 'whey_protein', role: 'protein' },
        { foodId: 'edamame', role: 'protein' },
      ],
    },
  ],
};

const STRATEGY_BLUEPRINTS: Record<MacroStrategy, StrategyBlueprints> = {
  balanced: BALANCED_BLUEPRINTS,
  high_protein: HIGH_PROTEIN_BLUEPRINTS,
  low_carb: LOW_CARB_BLUEPRINTS,
  keto: KETO_BLUEPRINTS,
  carnivore: CARNIVORE_BLUEPRINTS,
  low_fat: LOW_FAT_BLUEPRINTS,
  performance: PERFORMANCE_BLUEPRINTS,
  mediterranean: MEDITERRANEAN_BLUEPRINTS,
};

const MEAT_TAGS = ['meat', 'fish'];
const ANIMAL_TAGS = ['meat', 'fish', 'dairy', 'egg', 'animal'];
const DAIRY_TAGS = ['dairy'];
const GLUTEN_TAGS = ['gluten'];
const LEGUME_GRAIN_TAGS = ['legume', 'grain', 'dairy'];

function foodHasTag(food: FoodItemData, tags: string[]): boolean {
  return food.tags.some((t) => tags.includes(t));
}

function getVegetarianBlueprint(strategy: MacroStrategy): StrategyBlueprints | null {
  switch (strategy) {
    case 'balanced':
    case 'low_carb':
    case 'low_fat':
    case 'performance':
    case 'mediterranean':
      return VEGETARIAN_BALANCED_BLUEPRINTS;
    case 'high_protein':
      return VEGETARIAN_HIGH_PROTEIN_BLUEPRINTS;
    case 'keto':
      return VEGETARIAN_KETO_BLUEPRINTS;
    case 'carnivore':
      return null;
    default:
      return VEGETARIAN_BALANCED_BLUEPRINTS;
  }
}

function getVeganBlueprint(strategy: MacroStrategy): StrategyBlueprints | null {
  switch (strategy) {
    case 'carnivore':
      return null;
    case 'keto':
      return null;
    default:
      return VEGAN_BALANCED_BLUEPRINTS;
  }
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

function applyFoodSwaps(
  foodId: string,
  modifiers: DietaryModifier[]
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

  return current;
}

function selectBlueprint(
  strategy: MacroStrategy,
  modifiers: DietaryModifier[]
): StrategyBlueprints {
  const isVegan = modifiers.includes('vegan');
  const isVegetarian = modifiers.includes('vegetarian') || isVegan;

  if (isVegan) {
    return getVeganBlueprint(strategy) ?? VEGAN_BALANCED_BLUEPRINTS;
  }

  if (isVegetarian) {
    return getVegetarianBlueprint(strategy) ?? VEGETARIAN_BALANCED_BLUEPRINTS;
  }

  return STRATEGY_BLUEPRINTS[strategy] ?? BALANCED_BLUEPRINTS;
}

function applyIFTimings(meals: MealBlueprint[]): MealBlueprint[] {
  const breakfast = meals.find((m) => m.name === 'Breakfast');
  const lunch = meals.find((m) => m.name === 'Lunch');
  const dinner = meals.find((m) => m.name === 'Dinner');
  const snacks = meals.find((m) => m.name === 'Snacks');

  if (!lunch || !dinner) return meals;

  const breakfastPct = breakfast?.percentage ?? 0;
  const redistributed = breakfastPct / 2;

  return [
    {
      name: 'First Meal (Noon)',
      icon: 'sun',
      percentage: (lunch.percentage + redistributed),
      foods: [
        ...(lunch.foods),
        ...(breakfast?.foods.slice(0, 1) ?? []),
      ],
    },
    {
      name: 'Second Meal',
      icon: 'moon',
      percentage: (dinner.percentage + redistributed),
      foods: dinner.foods,
    },
    ...(snacks ? [{
      ...snacks,
      name: 'Snacks (Eating Window)',
    }] : []),
  ];
}

function scaleMealToTargets(
  blueprint: MealBlueprint,
  dailyMacros: MacroTargets,
  modifiers: DietaryModifier[],
  measurementSystem: MeasurementSystem = 'us'
): MealSlot {
  const slotCalTarget = dailyMacros.calories * blueprint.percentage;

  const resolvedFoods: { food: FoodItemData; ref: MealFoodRef }[] = [];
  const seenIds = new Set<string>();

  for (const ref of blueprint.foods) {
    let foodId = applyFoodSwaps(ref.foodId, modifiers);
    const food = FOODS[foodId];
    if (!food || seenIds.has(foodId)) continue;
    seenIds.add(foodId);
    resolvedFoods.push({ food, ref: { ...ref, foodId } });
  }

  if (resolvedFoods.length === 0) {
    return {
      name: blueprint.name,
      icon: blueprint.icon,
      percentage: blueprint.percentage,
      suggestions: [],
    };
  }

  const baseCalories = resolvedFoods.reduce((sum, { food }) => {
    return sum + (food.per100g.calories * food.basePortionG / 100);
  }, 0);

  const scaleFactor = baseCalories > 0 ? slotCalTarget / baseCalories : 1;

  const minScale = 0.3;
  const maxScale = 3.0;
  const clampedScale = Math.max(minScale, Math.min(maxScale, scaleFactor));

  const suggestions: MealSuggestion[] = resolvedFoods.map(({ food, ref }, idx) => {
    const portionG = Math.round(food.basePortionG * clampedScale);
    const macros = computeMacros(food, portionG);
    const portion = formatPortionLabel(food, portionG, measurementSystem);

    return {
      id: `${blueprint.name.toLowerCase().replace(/\s+/g, '-')}-${idx}-${food.id}`,
      foodId: food.id,
      name: food.name,
      portion,
      portionGrams: portionG,
      protein_g: Math.round(macros.protein_g),
      carbs_g: Math.round(macros.carbs_g),
      fat_g: Math.round(macros.fat_g),
      calories: macros.calories,
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

function strategyToDietaryPreference(strategy: MacroStrategy): DietaryPreference {
  switch (strategy) {
    case 'keto': return 'keto';
    case 'carnivore': return 'carnivore';
    case 'mediterranean': return 'mediterranean';
    default: return 'balanced';
  }
}

export function generateMealPlan(
  macros: MacroTargets,
  strategy: MacroStrategy,
  modifiers: DietaryModifier[],
  measurementSystem: MeasurementSystem = 'us'
): DayPlan {
  console.log('[MealPlanGenerator] Generating plan for strategy:', strategy, 'modifiers:', modifiers, 'macros:', macros);

  const blueprint = selectBlueprint(strategy, modifiers);
  const isIF = modifiers.includes('intermittent_fasting');

  let mealBlueprints = [...blueprint.meals];

  if (isIF) {
    mealBlueprints = applyIFTimings(mealBlueprints);
  }

  const meals = mealBlueprints.map((mb) =>
    scaleMealToTargets(mb, macros, modifiers, measurementSystem)
  );

  return {
    preference: strategyToDietaryPreference(strategy),
    strategy,
    tags: modifiers as string[],
    meals,
  };
}
