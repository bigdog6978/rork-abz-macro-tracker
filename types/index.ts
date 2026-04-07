export type MeasurementSystem = 'metric' | 'us';

export interface DislikedFood {
  id: string;
  foodId: string;
  name: string;
  createdAt: number;
}

export interface UserAllergy {
  id: string;
  name: string;
  normalized: string;
  createdAt: number;
  updatedAt: number;
}

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'light_activity'
  | 'moderate_training'
  | 'strength_training'
  | 'endurance_training';

export type Goal = 'cut' | 'gain' | 'maintain' | 'recompose';

export type EatingStyle =
  | 'standard'
  | 'mediterranean'
  | 'vegan'
  | 'vegetarian'
  | 'paleo'
  | 'keto'
  | 'carnivore';

export type DietaryRestriction =
  | 'gluten_free'
  | 'dairy_free'
  | 'nut_free'
  | 'egg_free'
  | 'soy_free'
  | 'shellfish_free'
  | 'low_glycemic'
  | 'intermittent_fasting';

// Compatibility alias while refactoring existing imports.
export type DietaryModifier = DietaryRestriction;

// Legacy strategy values are migrated into the new Eating Style model.
export type MacroStrategy =
  | 'balanced'
  | 'high_protein'
  | 'low_carb'
  | 'low_fat'
  | 'performance'
  | 'mediterranean'
  | 'keto'
  | 'carnivore';

export interface UserProfile {
  firstName?: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightLb: number;
  bodyFatPercent?: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  eatingStyle: EatingStyle;
  dietModifiers: DietaryModifier[];
  dietNotes?: string;
  measurementSystem: MeasurementSystem;
  onboardingComplete: boolean;
}

export function lbToKg(lb: number): number {
  return Math.round(lb * 0.453592 * 10) / 10;
}

export function kgToLb(kg: number): number {
  return Math.round(kg * 2.20462 * 10) / 10;
}

export function cmToFtIn(cm: number): { ft: number; inches: number } {
  const totalInches = cm / 2.54;
  const ft = Math.floor(totalInches / 12);
  const inches = Math.round(totalInches % 12);
  return { ft, inches };
}

export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54 * 10) / 10;
}

export interface MacroTargets {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calculationDetails?: MacroCalculationDetails;
}

export interface MacroCalculationDetails {
  bmrFormula: string;
  estimatedBmr: number;
  activityLevelLabel: string;
  activityMultiplier: number;
  estimatedTdee: number;
  goalLabel: string;
  calorieAdjustmentLabel: string;
  calorieAdjustmentValue: number;
  eatingStyleLabel: string;
  proteinRuleLabel: string;
  proteinTargetGrams: number;
  carbTargetGrams: number;
  fatTargetGrams: number;
}

export interface NutrientsPer100g {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  timestamp: string;
  providerId?: 'usda' | 'manual' | 'openfoodfacts' | 'cofid_uk';
  externalId?: string;
  servingGrams?: number;
  source?: 'mealPlan' | 'manual';
  sourceRefId?: string;
  /** Measure mode: qty | grams | ounces. Legacy: 'units' treated as 'qty' */
  measureMode?: 'qty' | 'grams' | 'ounces' | 'units';
  /** Quantity (count or amount depending on mode) */
  quantity?: number;
  /** Grams per 1 unit when measureMode is qty */
  servingWeightG?: number;
  /** Per-100g nutrients for recalculation (USDA/barcode foods) */
  nutrientsPer100g?: NutrientsPer100g;
  /** True if user manually overrode macros; use stored values directly */
  isCustomMacros?: boolean;
  /** Extended unit kind ('mass' | 'volume' | 'serving') — set on entries edited after v1.3 */
  unitKind?: string;
  /** Extended unit id ('g' | 'oz' | 'lb' | 'ml' | 'fl_oz' | 'cup' | 'tbsp' | 'tsp' | 'piece' | 'serving') */
  unitId?: string;
  customization?: {
    isCustomized: boolean;
    reason?: 'user_edit';
    baseFoodId?: string;
  };
}

export interface DailyLog {
  date: string;
  entries: FoodEntry[];
}

export interface MealSlot {
  name: string;
  icon: string;
  percentage: number;
  suggestions: MealSuggestion[];
}

export type FoodCategory = 'protein' | 'carb' | 'fat' | 'fruit' | 'veggie' | 'mixed';

export interface MealSuggestion {
  id: string;
  foodId: string;
  name: string;
  portion: string;
  portionGrams: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  category: FoodCategory;
  isSubstitutable: boolean;
  isSwapped?: boolean;
}

export interface DayPlan {
  eatingStyle: EatingStyle;
  tags?: string[];
  meals: MealSlot[];
  /** True when allergies/constraints blocked all foods and no plan could be generated */
  planUnavailable?: boolean;
  /** Target macros/calories actually used to generate this plan. */
  targetUsed?: MacroTargets;
  /** Indicates whether calories were normalized to match macro-equivalent energy. */
  targetNormalization?: {
    wasNormalized: boolean;
    deltaCalories: number;
  };
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light_activity: 'Light Activity',
  moderate_training: 'Cardio / Group Fitness',
  strength_training: 'Strength Training',
  endurance_training: 'Very Active / Athlete',
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Desk job, little or no exercise',
  light_activity: 'Walking, yoga, pilates, or casual movement',
  moderate_training: 'Running, cycling, classes, or sport 3-5×/week',
  strength_training: 'Weight training or resistance work 3-5×/week',
  endurance_training: '6-7 days/week, high-volume endurance, or physical job',
};

export const GOAL_LABELS: Record<Goal, string> = {
  cut: 'Cut Fat',
  recompose: 'Body Recomposition',
  gain: 'Build Muscle',
  maintain: 'Maintain',
};

export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  cut: 'Reduce body fat while preserving muscle',
  recompose: 'Build muscle while slowly reducing body fat',
  gain: 'Support muscle growth with a small calorie surplus',
  maintain: 'Sustain your physique and performance',
};

export const EATING_STYLE_LABELS: Record<EatingStyle, string> = {
  standard: 'Standard',
  mediterranean: 'Mediterranean',
  vegan: 'Vegan',
  vegetarian: 'Vegetarian',
  paleo: 'Paleo',
  keto: 'Keto',
  carnivore: 'Carnivore',
};

export const EATING_STYLE_DESCRIPTIONS: Record<EatingStyle, string> = {
  standard: 'Balanced food choices with no specific restrictions',
  mediterranean: 'Whole foods, lean proteins, plants, and healthy fats',
  vegan: 'Plant-based foods only',
  vegetarian: 'No meat or fish',
  paleo: 'Whole foods with grains and legumes removed',
  keto: 'Very low-carb eating style with fat as the primary fuel source',
  carnivore: 'Animal-based foods with trace carbs only',
};

export const DIETARY_RESTRICTION_LABELS: Record<DietaryRestriction, string> = {
  gluten_free: 'Gluten-Free',
  dairy_free: 'Dairy-Free',
  nut_free: 'Nut-Free',
  egg_free: 'Egg-Free',
  soy_free: 'Soy-Free',
  shellfish_free: 'Shellfish-Free',
  low_glycemic: 'Low Glycemic',
  intermittent_fasting: 'Intermittent Fasting',
};

export const DIETARY_RESTRICTION_DESCRIPTIONS: Record<DietaryRestriction, string> = {
  gluten_free: 'No gluten-containing foods',
  dairy_free: 'No dairy products',
  nut_free: 'Avoid tree nuts and peanuts',
  egg_free: 'Avoid eggs and egg-based ingredients',
  soy_free: 'Avoid soy foods and soy-derived ingredients',
  shellfish_free: 'Avoid shellfish',
  low_glycemic: 'Prefer slower-digesting carb and fruit choices in meal plans',
  intermittent_fasting: 'Meal timing preference',
};

// Compatibility aliases for existing imports during the refactor.
export const DIETARY_MODIFIER_LABELS = DIETARY_RESTRICTION_LABELS;
export const DIETARY_MODIFIER_DESCRIPTIONS = DIETARY_RESTRICTION_DESCRIPTIONS;

export interface SavedMealPlan {
  id: string;
  name: string;
  eatingStyle: EatingStyle;
  dietaryModifiers: DietaryModifier[];
  createdAt: string;
  updatedAt: string;
  meals: MealSlot[];
  substitutionMap: Record<string, MealSuggestion>;
  macroTargets: MacroTargets;
  isActive: boolean;
}

export interface SavedMealTemplateItem {
  foodId: string;
  name: string;
  portion: string;
  portionGrams: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  category: FoodCategory;
}

export interface SavedMealTemplate {
  id: string;
  name: string;
  icon: string;
  eatingStyle: EatingStyle;
  dietaryModifiers: DietaryModifier[];
  items: SavedMealTemplateItem[];
  total: MacroTargets;
  compositionHash: string;
  createdAt: string;
  updatedAt: string;
}

export function legacyMacroStrategyToEatingStyle(strategy?: string | null): EatingStyle {
  switch (strategy) {
    case 'keto':
    case 'carnivore':
    case 'mediterranean':
      return strategy;
    case 'low_carb':
      return 'keto';
    case 'balanced':
    case 'high_protein':
    case 'low_fat':
    case 'performance':
    default:
      return 'standard';
  }
}

export function normalizeLegacyActivityLevel(level?: string | null): ActivityLevel {
  switch (level) {
    case 'sedentary':
      return 'sedentary';
    case 'lightly_active':
      return 'light_activity';
    case 'moderately_active':
      return 'moderate_training';
    case 'very_active':
      return 'strength_training';
    case 'extra_active':
      return 'endurance_training';
    case 'light_activity':
    case 'moderate_training':
    case 'strength_training':
    case 'endurance_training':
      return level;
    default:
      return 'moderate_training';
  }
}
