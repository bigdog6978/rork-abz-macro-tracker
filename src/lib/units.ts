/**
 * Unit conversions for mass, volume, and serving.
 * Used for food logging and macro scaling.
 */

export type UnitKind = 'mass' | 'volume' | 'serving';

export type UnitId =
  | 'g'
  | 'oz'
  | 'lb'
  | 'ml'
  | 'l'
  | 'fl_oz'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'serving'
  | 'piece';

export const MASS_UNITS: UnitId[] = ['g', 'oz', 'lb'];
export const VOLUME_UNITS: UnitId[] = ['ml', 'fl_oz', 'cup', 'l', 'tbsp', 'tsp'];
export const SERVING_UNITS: UnitId[] = ['serving', 'piece'];

// Conversion constants (exact values per spec)
const OZ_TO_G = 28.349523125;
const LB_TO_G = 453.59237;
const L_TO_ML = 1000;
const FL_OZ_TO_ML = 29.5735295625;
const CUP_TO_ML = 236.5882365;
const TBSP_TO_ML = 14.78676478125;
const TSP_TO_ML = 4.92892159375;

/** Convert mass value to grams */
export function toGrams(value: number, unit: UnitId): number {
  switch (unit) {
    case 'g':
      return value;
    case 'oz':
      return value * OZ_TO_G;
    case 'lb':
      return value * LB_TO_G;
    default:
      return value;
  }
}

/** Convert volume value to milliliters */
export function toMilliliters(value: number, unit: UnitId): number {
  switch (unit) {
    case 'ml':
      return value;
    case 'l':
      return value * L_TO_ML;
    case 'fl_oz':
      return value * FL_OZ_TO_ML;
    case 'cup':
      return value * CUP_TO_ML;
    case 'tbsp':
      return value * TBSP_TO_ML;
    case 'tsp':
      return value * TSP_TO_ML;
    default:
      return value;
  }
}

/** Convert milliliters to grams using density (g/ml) */
export function mlToGrams(ml: number, density_g_per_ml: number): number {
  return ml * density_g_per_ml;
}

export function isMassUnit(unit: UnitId): boolean {
  return MASS_UNITS.includes(unit);
}

export function isVolumeUnit(unit: UnitId): boolean {
  return VOLUME_UNITS.includes(unit);
}

export function isServingUnit(unit: UnitId): boolean {
  return SERVING_UNITS.includes(unit);
}

export function getUnitKind(unit: UnitId): UnitKind {
  if (isMassUnit(unit)) return 'mass';
  if (isVolumeUnit(unit)) return 'volume';
  return 'serving';
}
