import { DayPlan, DietaryModifier, EatingStyle, MacroTargets, MeasurementSystem, UserAllergy } from '../types';
import { generateMealPlan } from '../utils/mealPlanGenerator';

export function getMealPlanForEatingStyle(
  eatingStyle: EatingStyle,
  modifiers: DietaryModifier[],
  macros?: MacroTargets,
  measurementSystem: MeasurementSystem = 'us',
  allergies: UserAllergy[] = [],
  generationSeed = 0
): DayPlan {
  const targets = macros ?? { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
  return generateMealPlan(targets, eatingStyle, modifiers, measurementSystem, allergies, generationSeed);
}

export const getMealPlanForStrategy = getMealPlanForEatingStyle;
