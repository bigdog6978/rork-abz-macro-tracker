import {
  DayPlan,
  DietaryModifier,
  EatingStyle,
  MacroTargets,
  MeasurementSystem,
  UserAllergy,
  WeekPlan,
} from '../types';
import { generateMealPlan, generateWeekPlan } from '../utils/mealPlanGenerator';

export function getMealPlanForEatingStyle(
  eatingStyle: EatingStyle,
  modifiers: DietaryModifier[],
  macros?: MacroTargets,
  measurementSystem: MeasurementSystem = 'us',
  allergies: UserAllergy[] = [],
  generationSeed = 0,
  dislikedFoodIds: string[] = []
): DayPlan {
  const targets = macros ?? { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
  return generateMealPlan(targets, eatingStyle, modifiers, measurementSystem, allergies, generationSeed, dislikedFoodIds);
}

export function getWeekPlanForEatingStyle(
  eatingStyle: EatingStyle,
  modifiers: DietaryModifier[],
  numDays: number,
  macros?: MacroTargets,
  measurementSystem: MeasurementSystem = 'us',
  allergies: UserAllergy[] = [],
  generationSeed = 0,
  dislikedFoodIds: string[] = []
): WeekPlan {
  const targets = macros ?? { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
  return generateWeekPlan(
    targets,
    eatingStyle,
    modifiers,
    numDays,
    measurementSystem,
    allergies,
    generationSeed,
    dislikedFoodIds
  );
}

export const getMealPlanForStrategy = getMealPlanForEatingStyle;
