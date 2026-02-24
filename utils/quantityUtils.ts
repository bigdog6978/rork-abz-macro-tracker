import { FOODS } from '../constants/foodDatabase';

export interface QuantityInfo {
  qty: number;
  unit: string;
  step: number;
  isCountBased: boolean;
}

export function getQuantityInfo(
  foodId: string,
  portionGrams: number,
  measurementSystem: 'metric' | 'us' = 'us'
): QuantityInfo | null {
  const food = FOODS[foodId];
  if (!food) return null;

  if (measurementSystem === 'metric') {
    return { qty: portionGrams, unit: 'g', step: 5, isCountBased: false };
  }

  const units = portionGrams / food.gramsPerUnit;
  const countBased = ['large egg', 'egg', 'strip', 'stick', 'date', 'cake', 'tortilla', 'pita', 'spear'].includes(food.unitLabel);

  let unit = food.unitLabel;
  if (food.unitLabel === 'large egg' || food.unitLabel === 'egg') unit = 'eggs';
  else if (food.unitLabel === 'strip') unit = 'strips';
  else if (food.unitLabel === 'stick') unit = 'sticks';
  else if (food.unitLabel === 'date') unit = 'dates';
  else if (food.unitLabel === 'oz') unit = 'oz';
  else if (food.unitLabel.startsWith('cup')) unit = 'cups';
  else if (food.unitLabel === 'tbsp') unit = 'tbsp';
  else if (food.unitLabel === 'scoop') unit = 'scoops';

  const step = countBased ? 1 : 0.5;

  return {
    qty: countBased ? Math.round(units) : Math.round(units * 4) / 4,
    unit,
    step,
    isCountBased: countBased,
  };
}

export function scaleMacros(
  baseCalories: number,
  baseProtein: number,
  baseCarbs: number,
  baseFat: number,
  scale: number
): { calories: number; protein_g: number; carbs_g: number; fat_g: number } {
  return {
    calories: Math.round(baseCalories * scale),
    protein_g: Math.round(baseProtein * scale),
    carbs_g: Math.round(baseCarbs * scale),
    fat_g: Math.round(baseFat * scale),
  };
}

export function formatQuantityDisplay(qty: number, unit: string): string {
  if (unit === 'eggs') return qty === 1 ? '1 egg' : `${qty} eggs`;
  if (unit === 'oz') return `${qty} oz`;
  if (unit === 'cups') return qty === 1 ? '1 cup' : `${qty} cups`;
  if (unit === 'g') return `${Math.round(qty)}g`;
  const rounded = qty % 1 === 0 ? qty : qty.toFixed(2).replace(/\.?0+$/, '');
  return `${rounded} ${unit}`;
}
