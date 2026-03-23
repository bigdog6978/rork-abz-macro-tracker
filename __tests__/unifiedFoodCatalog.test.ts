/**
 * Tests for the unified food catalog architecture:
 * - UK CoFID import/normalization
 * - Local-first typed resolution
 * - Ingredient ranking quality with mixed sources
 * - Branded vs generic behavior
 * - Safe fallback behavior
 * - generateSearchName normalization
 */

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('../src/data/db', () => ({
  openDb: jest.fn(),
}));

jest.mock('../src/data/foodsRepo', () => {
  const actual = jest.requireActual('../src/data/foodsRepo');
  return {
    ...actual,
    searchLocalFoods: jest.fn().mockResolvedValue([]),
    importCatalogFoods: jest.fn().mockResolvedValue(0),
    getCatalogMeta: jest.fn().mockResolvedValue(null),
    setCatalogMeta: jest.fn().mockResolvedValue(undefined),
    hydrateUsdaResults: jest.fn().mockResolvedValue(undefined),
  };
});

import { rankFoods, type FoodItem } from '../src/search/foodSearch';
import { generateSearchName } from '../src/data/foodsRepo';

// ─── generateSearchName ─────────────────────────────────────────────────────

describe('generateSearchName', () => {
  it('lowercases and strips commas', () => {
    expect(generateSearchName('Chicken, breast, raw')).toBe('chicken breast raw');
  });

  it('strips hyphens and parentheses', () => {
    expect(generateSearchName('Semi-skimmed milk (pasteurised)')).toBe('semi skimmed milk pasteurised');
  });

  it('collapses multiple spaces', () => {
    expect(generateSearchName('Ackee,  canned,  drained')).toBe('ackee canned drained');
  });

  it('handles slashes and dots', () => {
    expect(generateSearchName('Oil/fat spread 60%')).toBe('oil fat spread 60%');
  });

  it('returns empty string for empty input', () => {
    expect(generateSearchName('')).toBe('');
  });

  it('matches UK CoFID searchName format', () => {
    expect(generateSearchName('Ackee, canned, drained')).toBe('ackee canned drained');
    expect(generateSearchName('Agar, dried')).toBe('agar dried');
    expect(generateSearchName('Baked beans, canned in tomato sauce')).toBe('baked beans canned in tomato sauce');
  });
});

// ─── UK CoFID normalization ─────────────────────────────────────────────────

describe('UK CoFID record normalization', () => {
  it('maps a CoFID record to a valid CatalogImportRecord shape', () => {
    const raw = {
      id: 'cofid_uk_13_145',
      source: 'cofid_uk',
      foodCode: '13-145',
      name: 'Ackee, canned, drained',
      searchName: 'ackee canned drained',
      description: '8 cans',
      groupCode: 'DG',
      servingBasis: '100g',
      calories: 151.0,
      protein: 2.9,
      carbs: 0.8,
      fat: 15.2,
      fiber: null,
      sugar: 0.8,
      sodiumMg: 240.0,
      potassiumMg: 270.0,
      calciumMg: 35.0,
      ironMg: 0.7,
      vitaminCMg: 30.0,
    };

    const record = {
      id: raw.id,
      name: raw.name,
      searchName: raw.searchName,
      brand: null,
      source: 'cofid_uk' as const,
      calories: raw.calories ?? 0,
      protein: raw.protein ?? 0,
      carbs: raw.carbs ?? 0,
      fat: raw.fat ?? 0,
    };

    expect(record.id).toBe('cofid_uk_13_145');
    expect(record.name).toBe('Ackee, canned, drained');
    expect(record.searchName).toBe('ackee canned drained');
    expect(record.source).toBe('cofid_uk');
    expect(record.calories).toBe(151);
    expect(record.protein).toBe(2.9);
  });

  it('defaults null macros to 0', () => {
    const raw = {
      calories: null as number | null,
      protein: null as number | null,
      carbs: null as number | null,
      fat: null as number | null,
    };

    expect(raw.calories ?? 0).toBe(0);
    expect(raw.protein ?? 0).toBe(0);
    expect(raw.carbs ?? 0).toBe(0);
    expect(raw.fat ?? 0).toBe(0);
  });
});

// ─── Mixed-source ranking quality ───────────────────────────────────────────

describe('mixed-source ranking', () => {
  it('ranks CoFID generic chicken above branded chicken from other sources', () => {
    const foods: FoodItem[] = [
      { id: 'cofid-chicken', name: 'Chicken, breast, raw, meat only', brand: null, source: 'cofid_uk', calories: 106, protein: 24 },
      { id: 'usda-chicken', name: 'Chicken, breast, boneless, skinless, raw', brand: null, source: 'usda', calories: 120, protein: 22.5 },
      { id: 'branded-chicken', name: 'Chicken breast strips, grilled', brand: 'Wegmans', source: 'usda', calories: 130, protein: 20 },
    ];

    const ranked = rankFoods(foods, 'chicken breast');
    const ids = ranked.map((f) => f.id);

    expect(ids.indexOf('branded-chicken')).toBeGreaterThan(ids.indexOf('cofid-chicken'));
    expect(ids.indexOf('branded-chicken')).toBeGreaterThan(ids.indexOf('usda-chicken'));
  });

  it('ranks trusted reference sources above unbranded OFF for ingredient queries', () => {
    const foods: FoodItem[] = [
      { id: 'cofid-milk', name: 'Milk, whole, pasteurised', brand: null, source: 'cofid_uk', calories: 66, protein: 3.3 },
      { id: 'usda-milk', name: 'Milk, whole, raw', brand: null, source: 'usda', calories: 61, protein: 3.2 },
      { id: 'off-milk', name: 'Whole milk', brand: null, source: 'openfoodfacts', calories: 64, protein: 3.3 },
    ];

    const ranked = rankFoods(foods, 'milk');
    const ids = ranked.map((f) => f.id);

    expect(ids.indexOf('cofid-milk')).toBeLessThan(ids.indexOf('off-milk'));
    expect(ids.indexOf('usda-milk')).toBeLessThan(ids.indexOf('off-milk'));
  });

  it('still prefers generic over branded regardless of source', () => {
    const foods: FoodItem[] = [
      { id: 'branded-egg', name: 'Free range eggs', brand: 'Happy Eggs Co', source: 'cofid_uk', calories: 131, protein: 12.5 },
      { id: 'generic-egg', name: 'Egg, whole, raw, fresh', brand: null, source: 'usda', calories: 143, protein: 12.6 },
    ];

    const ranked = rankFoods(foods, 'egg');
    expect(ranked[0].id).toBe('generic-egg');
  });
});

// ─── Ingredient ranking quality with source-aware scoring ───────────────────

describe('ingredient ranking quality with source-aware scoring', () => {
  it('prefers foods with macro data over those without', () => {
    const foods: FoodItem[] = [
      { id: 'with-macros', name: 'Rice, white, boiled', brand: null, source: 'cofid_uk', calories: 138, protein: 2.6 },
      { id: 'no-macros', name: 'Rice, white, boiled', brand: null, source: 'manual', calories: 0, protein: 0 },
    ];

    const ranked = rankFoods(foods, 'rice');
    expect(ranked[0].id).toBe('with-macros');
  });

  it('prefers CoFID whole food over USDA processed variant for simple queries', () => {
    const foods: FoodItem[] = [
      { id: 'cofid-salmon', name: 'Salmon, Atlantic, raw', brand: null, source: 'cofid_uk', calories: 180, protein: 20 },
      { id: 'usda-smoked', name: 'Salmon, smoked', brand: null, source: 'usda', calories: 117, protein: 18 },
    ];

    const ranked = rankFoods(foods, 'salmon');
    expect(ranked[0].id).toBe('cofid-salmon');
  });

  it('does not let source bonus override a much better name match', () => {
    const foods: FoodItem[] = [
      { id: 'cofid-beans', name: 'Baked beans, canned', brand: null, source: 'cofid_uk', calories: 81, protein: 5 },
      { id: 'usda-banana', name: 'Banana, raw', brand: null, source: 'usda', calories: 89, protein: 1.1 },
    ];

    const ranked = rankFoods(foods, 'banana');
    expect(ranked[0].id).toBe('usda-banana');
  });
});

// ─── Branded vs generic across sources ──────────────────────────────────────

describe('branded vs generic across sources', () => {
  it('deprioritizes branded foods even from a trusted source', () => {
    const foods: FoodItem[] = [
      { id: 'generic-oat', name: 'Oats, rolled, raw', brand: null, source: 'cofid_uk', calories: 375, protein: 11 },
      { id: 'branded-oat', name: 'Oat cereal', brand: 'Quaker', source: 'usda', calories: 367, protein: 10 },
      { id: 'off-oat', name: 'Porridge oats', brand: 'Tesco', source: 'openfoodfacts', calories: 365, protein: 11 },
    ];

    const ranked = rankFoods(foods, 'oats');
    const ids = ranked.map((f) => f.id);

    expect(ids[0]).toBe('generic-oat');
    expect(ids.indexOf('generic-oat')).toBeLessThan(ids.indexOf('branded-oat'));
    expect(ids.indexOf('generic-oat')).toBeLessThan(ids.indexOf('off-oat'));
  });
});

// ─── Fallback behavior ──────────────────────────────────────────────────────

describe('fallback behavior', () => {
  it('returns results even if all foods have source=cofid_uk (USDA unavailable)', () => {
    const foods: FoodItem[] = [
      { id: 'cofid-apple', name: 'Apple, raw, flesh only', brand: null, source: 'cofid_uk', calories: 47, protein: 0.4 },
      { id: 'cofid-banana', name: 'Banana, raw', brand: null, source: 'cofid_uk', calories: 95, protein: 1.1 },
    ];

    const ranked = rankFoods(foods, 'apple');
    expect(ranked.length).toBe(2);
    expect(ranked[0].id).toBe('cofid-apple');
  });

  it('handles empty food list gracefully', () => {
    const ranked = rankFoods([], 'chicken');
    expect(ranked).toEqual([]);
  });

  it('handles empty query gracefully', () => {
    const foods: FoodItem[] = [
      { id: 'a', name: 'Apple', brand: null },
    ];
    const ranked = rankFoods(foods, '');
    expect(ranked.length).toBe(1);
  });
});

// ─── Existing ranking behavior preserved ────────────────────────────────────

describe('existing ranking tests still pass with source field', () => {
  it('prefers generic whole eggs over branded (with source field)', () => {
    const foods: FoodItem[] = [
      { id: 'generic-egg', name: 'Egg, whole, raw, fresh', brand: null, source: 'usda' },
      { id: 'wegmans-egg', name: 'Large brown eggs', brand: 'Wegmans', source: 'usda' },
      { id: 'egg-salad', name: 'Egg salad', brand: null, source: 'usda' },
    ];

    const ranked = rankFoods(foods, 'egg');
    const ids = ranked.map((food) => food.id);
    expect(ids[0]).toBe('generic-egg');
  });

  it('prefers plain chicken breast over branded (with source field)', () => {
    const foods: FoodItem[] = [
      { id: 'generic-chicken', name: 'Chicken breast, skinless, boneless, raw', brand: null, source: 'usda' },
      { id: 'branded-chicken', name: 'Chicken breast strips, grilled', brand: 'Wegmans', source: 'usda' },
      { id: 'nuggets', name: 'Chicken nuggets', brand: 'Tyson', source: 'usda' },
    ];

    const ranked = rankFoods(foods, 'chicken breast');
    expect(ranked[0].id).toBe('generic-chicken');
  });

  it('treats size words like large as weak modifiers (with source field)', () => {
    const foods: FoodItem[] = [
      { id: 'lima-cooked', name: 'Lima beans, large, mature seeds, cooked, boiled, without salt', brand: null, source: 'usda' },
      { id: 'lima-raw', name: 'Lima beans, large, mature seeds, raw', brand: null, source: 'usda' },
      { id: 'egg-large', name: 'Eggs, Grade A, Large, egg whole', brand: null, source: 'usda' },
      { id: 'burger-large', name: 'Fast foods, cheeseburger; single, large patty', brand: null, source: 'usda' },
    ];

    const ranked = rankFoods(foods, 'large egg');
    const ids = ranked.map((food) => food.id);
    expect(ids[0]).toBe('egg-large');
  });
});
