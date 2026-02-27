/**
 * Default per-item weights for unit-friendly foods.
 * Used when measureMode is 'qty' to calculate macros from USDA per-100g data.
 */

export const UNIT_DEFAULTS: Record<string, number> = {
  egg: 50,
  eggs: 50,
  banana: 118,
  bananas: 118,
  apple: 182,
  apples: 182,
  date: 24,
  dates: 24,
};

/** Keywords to detect unit-friendly foods (order matters for pluralization) */
const UNIT_KEYWORDS = [
  'eggs',
  'egg',
  'bananas',
  'banana',
  'apples',
  'apple',
  'dates',
  'date',
];

/**
 * Detect unit label and default serving weight from food name.
 * Returns { unitLabel, servingWeightG } if unit-friendly, else null.
 */
export function detectUnitFromName(name: string): {
  unitLabel: string;
  servingWeightG: number;
} | null {
  const lower = name.toLowerCase().trim();
  for (const kw of UNIT_KEYWORDS) {
    const re = new RegExp(`\\b${kw}\\b`, 'i');
    if (re.test(lower)) {
      const singular = kw.endsWith('s') ? kw.slice(0, -1) : kw;
      const weight = UNIT_DEFAULTS[kw] ?? UNIT_DEFAULTS[singular] ?? 100;
      return {
        unitLabel: singular,
        servingWeightG: weight,
      };
    }
  }
  return null;
}

/**
 * Pluralize unit label for display (1 egg, 2 eggs).
 */
export function pluralizeUnit(count: number, unitLabel: string): string {
  if (count === 1) return unitLabel;
  if (unitLabel === 'serving') return 'servings';
  if (unitLabel.endsWith('s')) return unitLabel;
  if (unitLabel.endsWith('y') && !['a', 'e', 'i', 'o', 'u'].includes(unitLabel.slice(-2, -1))) {
    return unitLabel.slice(0, -1) + 'ies';
  }
  return unitLabel + 's';
}
