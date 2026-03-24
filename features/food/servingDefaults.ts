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
  avocado: 150,
  avocados: 150,
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
  'avocados',
  'avocado',
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

// ─── Volume-to-weight mappings for solid foods measured by cup/tbsp ───────────

import type { UnitId } from '../../src/lib/units';

export const VOLUME_WEIGHT_DEFAULTS: Array<{
  keywords: string[];
  gramsPerCup: number;
  gramsPerTbsp?: number;
}> = [
  { keywords: ['white rice', 'rice, white', 'rice white'], gramsPerCup: 200 },
  { keywords: ['brown rice', 'rice, brown', 'rice brown'], gramsPerCup: 200 },
  { keywords: ['quinoa'], gramsPerCup: 185 },
  { keywords: ['oat', 'oatmeal', 'oats'], gramsPerCup: 80, gramsPerTbsp: 5 },
  { keywords: ['flour', 'all-purpose flour', 'all purpose flour'], gramsPerCup: 125, gramsPerTbsp: 8 },
  { keywords: ['sugar', 'granulated sugar'], gramsPerCup: 200, gramsPerTbsp: 12.5 },
  { keywords: ['brown sugar'], gramsPerCup: 220, gramsPerTbsp: 13.8 },
  { keywords: ['honey'], gramsPerCup: 340, gramsPerTbsp: 21 },
  { keywords: ['peanut butter'], gramsPerCup: 258, gramsPerTbsp: 16 },
  { keywords: ['almond butter'], gramsPerCup: 258, gramsPerTbsp: 16 },
  { keywords: ['greek yogurt', 'yogurt'], gramsPerCup: 245, gramsPerTbsp: 15 },
  { keywords: ['cottage cheese'], gramsPerCup: 226, gramsPerTbsp: 14 },
  { keywords: ['lentil', 'lentils'], gramsPerCup: 198 },
  { keywords: ['chickpea', 'chickpeas', 'garbanzo'], gramsPerCup: 164 },
  { keywords: ['black bean', 'black beans'], gramsPerCup: 172 },
  { keywords: ['kidney bean', 'kidney beans'], gramsPerCup: 177 },
  { keywords: ['corn'], gramsPerCup: 164 },
  { keywords: ['pea', 'peas', 'green peas'], gramsPerCup: 160 },
  { keywords: ['broccoli'], gramsPerCup: 91, gramsPerTbsp: 6 },
  { keywords: ['spinach', 'baby spinach'], gramsPerCup: 30 },
  { keywords: ['blueberr', 'blueberries'], gramsPerCup: 148 },
  { keywords: ['strawberr', 'strawberries'], gramsPerCup: 152 },
  { keywords: ['mixed berries', 'berries'], gramsPerCup: 150 },
  { keywords: ['almond', 'almonds'], gramsPerCup: 143, gramsPerTbsp: 9 },
  { keywords: ['walnut', 'walnuts'], gramsPerCup: 117, gramsPerTbsp: 7 },
  { keywords: ['pasta', 'spaghetti', 'penne', 'macaroni'], gramsPerCup: 140 },
  { keywords: ['couscous'], gramsPerCup: 157 },
  { keywords: ['sweet potato', 'sweet potatoes'], gramsPerCup: 200 },
  { keywords: ['potato', 'potatoes'], gramsPerCup: 150 },
  { keywords: ['avocado'], gramsPerCup: 150 },
  { keywords: ['hummus'], gramsPerCup: 246, gramsPerTbsp: 15 },
  { keywords: ['cream cheese'], gramsPerCup: 232, gramsPerTbsp: 14.5 },
  // Fats & condiments
  { keywords: ['butter'], gramsPerCup: 227, gramsPerTbsp: 14.2 },
  { keywords: ['ghee'], gramsPerCup: 205, gramsPerTbsp: 12.8 },
  { keywords: ['mayonnaise', 'mayo'], gramsPerCup: 220, gramsPerTbsp: 13.8 },
  { keywords: ['sour cream'], gramsPerCup: 230, gramsPerTbsp: 14.4 },
  { keywords: ['salsa'], gramsPerCup: 240, gramsPerTbsp: 15 },
  { keywords: ['ketchup'], gramsPerCup: 240, gramsPerTbsp: 15 },
  { keywords: ['mustard'], gramsPerCup: 250, gramsPerTbsp: 15.6 },
  { keywords: ['hot sauce', 'sriracha', 'tabasco'], gramsPerCup: 240, gramsPerTbsp: 15 },
  { keywords: ['soy sauce', 'tamari'], gramsPerCup: 256, gramsPerTbsp: 16 },
  { keywords: ['worcestershire'], gramsPerCup: 260, gramsPerTbsp: 16 },
  { keywords: ['maple syrup', 'syrup'], gramsPerCup: 322, gramsPerTbsp: 20 },
  { keywords: ['tahini'], gramsPerCup: 240, gramsPerTbsp: 15 },
  { keywords: ['nutella', 'hazelnut spread'], gramsPerCup: 275, gramsPerTbsp: 17 },
  // Dairy
  { keywords: ['ricotta'], gramsPerCup: 246, gramsPerTbsp: 15 },
  // Powders & dry goods
  { keywords: ['protein powder', 'whey protein', 'casein'], gramsPerCup: 120, gramsPerTbsp: 7.5 },
  { keywords: ['cocoa powder', 'cacao powder'], gramsPerCup: 86, gramsPerTbsp: 5.4 },
  { keywords: ['nutritional yeast'], gramsPerCup: 60, gramsPerTbsp: 3.8 },
  { keywords: ['baking soda'], gramsPerCup: 230, gramsPerTbsp: 14 },
  { keywords: ['baking powder'], gramsPerCup: 220, gramsPerTbsp: 13.8 },
  { keywords: ['cornstarch', 'corn starch'], gramsPerCup: 128, gramsPerTbsp: 8 },
  // Seeds
  { keywords: ['chia seed', 'chia seeds'], gramsPerCup: 160, gramsPerTbsp: 10 },
  { keywords: ['flax seed', 'flaxseed', 'flax'], gramsPerCup: 149, gramsPerTbsp: 9.3 },
  { keywords: ['hemp seed', 'hemp hearts'], gramsPerCup: 160, gramsPerTbsp: 10 },
  { keywords: ['sesame seed', 'sesame seeds'], gramsPerCup: 144, gramsPerTbsp: 9 },
  { keywords: ['sunflower seed', 'sunflower seeds'], gramsPerCup: 140, gramsPerTbsp: 8.8 },
  { keywords: ['pumpkin seed', 'pumpkin seeds', 'pepitas'], gramsPerCup: 130, gramsPerTbsp: 8 },
];

/**
 * Look up the gram weight for a volume unit (cup, tbsp, tsp) based on the
 * food name or query. Returns null if no mapping exists.
 */
export function getVolumeWeightGrams(
  foodName: string,
  query: string,
  unitId: UnitId
): number | null {
  const combined = `${foodName} ${query}`.toLowerCase();
  for (const entry of VOLUME_WEIGHT_DEFAULTS) {
    if (entry.keywords.some((kw) => combined.includes(kw))) {
      if (unitId === 'cup') return entry.gramsPerCup;
      if (unitId === 'tbsp' && entry.gramsPerTbsp) return entry.gramsPerTbsp;
      if (unitId === 'tsp' && entry.gramsPerTbsp) return Math.round((entry.gramsPerTbsp / 3) * 10) / 10;
      return null;
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
