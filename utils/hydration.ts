import type { MeasurementSystem } from '../types';

/** Hydration is always stored in mL internally; units affect display + input only. */
export type HydrationUnit = 'ml' | 'oz' | 'cup';

const ML_PER_FL_OZ = 29.5735;
const ML_PER_CUP = 236.588; // US customary cup

export function defaultHydrationUnit(system: MeasurementSystem): HydrationUnit {
  return system === 'us' ? 'cup' : 'ml';
}

export function mlToUnit(ml: number, unit: HydrationUnit): number {
  switch (unit) {
    case 'oz':
      return ml / ML_PER_FL_OZ;
    case 'cup':
      return ml / ML_PER_CUP;
    case 'ml':
    default:
      return ml;
  }
}

export function unitToMl(value: number, unit: HydrationUnit): number {
  switch (unit) {
    case 'oz':
      return value * ML_PER_FL_OZ;
    case 'cup':
      return value * ML_PER_CUP;
    case 'ml':
    default:
      return value;
  }
}

export function hydrationUnitLabel(unit: HydrationUnit): string {
  switch (unit) {
    case 'oz':
      return 'oz';
    case 'cup':
      return 'cups';
    case 'ml':
    default:
      return 'mL';
  }
}

/** Round to a clean display value per unit (mL whole, oz/cup to 1 decimal). */
function roundForUnit(value: number, unit: HydrationUnit): number {
  if (unit === 'ml') return Math.round(value);
  return Math.round(value * 10) / 10;
}

/** Single value formatted in the unit, e.g. "12.5 oz", "3 cups", "750 mL". */
export function formatHydrationValue(ml: number, unit: HydrationUnit): string {
  const v = roundForUnit(mlToUnit(ml, unit), unit);
  const num = unit === 'ml' ? String(v) : trimDecimal(v);
  return `${num} ${hydrationUnitLabel(unit)}`;
}

/** "consumed / target unit" for progress display. */
export function formatHydrationProgress(consumedMl: number, targetMl: number, unit: HydrationUnit): string {
  const consumed = roundForUnit(mlToUnit(consumedMl, unit), unit);
  const target = roundForUnit(mlToUnit(targetMl, unit), unit);
  const c = unit === 'ml' ? String(consumed) : trimDecimal(consumed);
  const t = unit === 'ml' ? String(target) : trimDecimal(target);
  return `${c} / ${t} ${hydrationUnitLabel(unit)}`;
}

function trimDecimal(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

export type HydrationQuickAdd = {
  /** Label shown on the chip, e.g. "+1 cup". */
  label: string;
  /** Milliliters added when tapped. */
  ml: number;
};

/** Quick-add presets per unit. Values stored as mL. */
export function hydrationQuickAdds(unit: HydrationUnit): HydrationQuickAdd[] {
  switch (unit) {
    case 'oz':
      return [
        { label: '+8 oz', ml: Math.round(unitToMl(8, 'oz')) },
        { label: '+16 oz', ml: Math.round(unitToMl(16, 'oz')) },
        { label: '+24 oz', ml: Math.round(unitToMl(24, 'oz')) },
      ];
    case 'cup':
      return [
        { label: '+1 cup', ml: Math.round(unitToMl(1, 'cup')) },
        { label: '+2 cups', ml: Math.round(unitToMl(2, 'cup')) },
        { label: '+3 cups', ml: Math.round(unitToMl(3, 'cup')) },
      ];
    case 'ml':
    default:
      return [
        { label: '+250 mL', ml: 250 },
        { label: '+500 mL', ml: 500 },
        { label: '+750 mL', ml: 750 },
      ];
  }
}
