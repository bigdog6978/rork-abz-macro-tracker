import { DayPlan, MacroStrategy, DietaryModifier, MacroTargets, MeasurementSystem, UserAllergy } from '../types';
import { generateMealPlan } from '../utils/mealPlanGenerator';

export function getMealPlanForStrategy(
  strategy: MacroStrategy,
  modifiers: DietaryModifier[],
  macros?: MacroTargets,
  measurementSystem: MeasurementSystem = 'us',
  allergies: UserAllergy[] = []
): DayPlan {
  const targets = macros ?? { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
  return generateMealPlan(targets, strategy, modifiers, measurementSystem, allergies);
}
