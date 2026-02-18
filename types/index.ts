export type MeasurementSystem = 'metric' | 'us';

export type Sex = 'male' | 'female';

export type ActivityLevel =
  | 'sedentary'
  | 'lightly_active'
  | 'moderately_active'
  | 'very_active'
  | 'extra_active';

export type Goal = 'cut' | 'recompose' | 'gain' | 'maintain';

export type GoalRate = 'slow' | 'moderate' | 'aggressive';

export type DietaryPreference =
  | 'keto'
  | 'carnivore'
  | 'vegetarian'
  | 'mediterranean'
  | 'balanced';

export type MacroStrategy =
  | 'balanced'
  | 'high_protein'
  | 'low_carb'
  | 'keto'
  | 'carnivore'
  | 'low_fat'
  | 'performance'
  | 'mediterranean';

export type DietaryModifier =
  | 'vegetarian'
  | 'vegan'
  | 'paleo'
  | 'gluten_free'
  | 'dairy_free'
  | 'intermittent_fasting';

export interface UserProfile {
  age: number;
  sex: Sex;
  height_cm: number;
  weight_lb: number;
  activity_level: ActivityLevel;
  goal: Goal;
  goal_rate: GoalRate;
  preference: DietaryPreference;
  macro_strategy: MacroStrategy;
  dietary_modifiers: DietaryModifier[];
  measurement_system: MeasurementSystem;
  onboarding_complete: boolean;
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
}

export interface FoodEntry {
  id: string;
  name: string;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  calories: number;
  timestamp: string;
  providerId?: 'usda' | 'manual';
  externalId?: string;
  servingGrams?: number;
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
  preference: DietaryPreference;
  strategy?: MacroStrategy;
  tags?: string[];
  meals: MealSlot[];
}

export const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  lightly_active: 'Lightly Active',
  moderately_active: 'Moderately Active',
  very_active: 'Very Active',
  extra_active: 'Extra Active',
};

export const ACTIVITY_DESCRIPTIONS: Record<ActivityLevel, string> = {
  sedentary: 'Little or no exercise',
  lightly_active: 'Light exercise 1-3 days/week',
  moderately_active: 'Moderate exercise 3-5 days/week',
  very_active: 'Hard exercise 6-7 days/week',
  extra_active: 'Very hard exercise, physical job',
};

export const GOAL_LABELS: Record<Goal, string> = {
  cut: 'Cut',
  recompose: 'Recompose',
  gain: 'Gain',
  maintain: 'Maintain',
};

export const GOAL_DESCRIPTIONS: Record<Goal, string> = {
  cut: 'Lose body fat while preserving muscle',
  recompose: 'Build muscle while reducing fat',
  gain: 'Build muscle with controlled weight gain',
  maintain: 'Sustain your physique and performance',
};

export const GOAL_RATE_LABELS: Record<GoalRate, string> = {
  slow: 'Slow & Steady',
  moderate: 'Moderate',
  aggressive: 'Aggressive',
};

export const PREFERENCE_LABELS: Record<DietaryPreference, string> = {
  keto: 'Keto',
  carnivore: 'Carnivore',
  vegetarian: 'Vegetarian',
  mediterranean: 'Mediterranean',
  balanced: 'Balanced',
};

export const PREFERENCE_DESCRIPTIONS: Record<DietaryPreference, string> = {
  keto: 'High fat, very low carb',
  carnivore: 'Animal-based, near zero carb',
  vegetarian: 'Plant-forward with dairy & eggs',
  mediterranean: 'Whole grains, healthy fats, lean protein',
  balanced: 'Flexible macros, no restrictions',
};

export const MACRO_STRATEGY_LABELS: Record<MacroStrategy, string> = {
  balanced: 'Balanced',
  high_protein: 'High Protein',
  low_carb: 'Low Carb',
  keto: 'Keto',
  carnivore: 'Carnivore',
  low_fat: 'Low Fat',
  performance: 'Performance',
  mediterranean: 'Mediterranean',
};

export const MACRO_STRATEGY_DESCRIPTIONS: Record<MacroStrategy, string> = {
  balanced: 'Flexible macros, no restrictions',
  high_protein: 'Protein-forward for lifting & recomposition',
  low_carb: 'Reduced carbs without strict keto',
  keto: 'High fat, very low carb',
  carnivore: 'Animal-based, near zero carb',
  low_fat: 'Lower fat, higher carb balance',
  performance: 'Higher carbs for training output',
  mediterranean: 'Whole foods, healthy fats, lean protein',
};

export const DIETARY_MODIFIER_LABELS: Record<DietaryModifier, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  paleo: 'Paleo',
  gluten_free: 'Gluten-Free',
  dairy_free: 'Dairy-Free',
  intermittent_fasting: 'Intermittent Fasting',
};

export const DIETARY_MODIFIER_DESCRIPTIONS: Record<DietaryModifier, string> = {
  vegetarian: 'No meat or fish',
  vegan: 'No animal products',
  paleo: 'No grains/legumes; whole foods',
  gluten_free: 'No gluten-containing foods',
  dairy_free: 'No dairy products',
  intermittent_fasting: 'Timing preference',
};

export interface SavedMealPlan {
  id: string;
  name: string;
  macroStrategy: MacroStrategy;
  dietaryModifiers: DietaryModifier[];
  createdAt: string;
  updatedAt: string;
  meals: MealSlot[];
  substitutionMap: Record<string, MealSuggestion>;
  macroTargets: MacroTargets;
  isActive: boolean;
}

export function strategyToPreference(strategy: MacroStrategy): DietaryPreference {
  switch (strategy) {
    case 'keto':
      return 'keto';
    case 'carnivore':
      return 'carnivore';
    case 'mediterranean':
      return 'mediterranean';
    case 'balanced':
    case 'high_protein':
    case 'low_carb':
    case 'low_fat':
    case 'performance':
      return 'balanced';
  }
}
