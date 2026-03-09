jest.mock('expo-constants', () => ({
  expoConfig: {
    extra: {},
  },
}));

jest.mock('../src/data/db', () => ({
  openDb: jest.fn(),
}));

jest.mock('../src/data/foodsRepo', () => ({
  upsertFood: jest.fn(),
  getFoodById: jest.fn(),
  searchFoods: jest.fn(),
}));

import { normalizeSearchResult, normalizeDetailResult } from '../features/food/providers/usda/usdaNormalizer';
import { computeMacrosForServing, createFoodEntry, createManualNormalizedFood } from '../features/food/foodService';
import { NormalizedFood } from '../features/food/types';
import { USDASearchFood, USDAFoodDetail } from '../features/food/providers/usda/usdaClient';

describe('usdaNormalizer', () => {
  describe('normalizeSearchResult', () => {
    it('extracts nutrients correctly from search result', () => {
      const food: USDASearchFood = {
        fdcId: 123456,
        description: 'Chicken breast, raw',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 1008, nutrientName: 'Energy', nutrientNumber: '208', unitName: 'kcal', value: 120 },
          { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: 22.5 },
          { nutrientId: 1005, nutrientName: 'Carbohydrate', nutrientNumber: '205', unitName: 'g', value: 0 },
          { nutrientId: 1004, nutrientName: 'Total lipid (fat)', nutrientNumber: '204', unitName: 'g', value: 2.6 },
        ],
      };

      const result = normalizeSearchResult(food);

      expect(result.id).toBe('usda:123456');
      expect(result.providerId).toBe('usda');
      expect(result.externalId).toBe('123456');
      expect(result.name).toBe('Chicken breast, raw');
      expect(result.basis).toBe('per100g');
      expect(result.per100g.calories).toBe(120);
      expect(result.per100g.protein_g).toBe(22.5);
      expect(result.per100g.carbs_g).toBe(0);
      expect(result.per100g.fat_g).toBe(2.6);
    });

    it('defaults missing nutrients to 0', () => {
      const food: USDASearchFood = {
        fdcId: 999,
        description: 'Mystery food',
        dataType: 'Survey',
        foodNutrients: [],
      };

      const result = normalizeSearchResult(food);

      expect(result.per100g.calories).toBe(0);
      expect(result.per100g.protein_g).toBe(0);
      expect(result.per100g.carbs_g).toBe(0);
      expect(result.per100g.fat_g).toBe(0);
    });

    it('handles partial nutrient data', () => {
      const food: USDASearchFood = {
        fdcId: 555,
        description: 'Partial food',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 1003, nutrientName: 'Protein', nutrientNumber: '203', unitName: 'g', value: 10 },
        ],
      };

      const result = normalizeSearchResult(food);

      expect(result.per100g.protein_g).toBe(10);
      expect(result.per100g.calories).toBe(0);
      expect(result.per100g.carbs_g).toBe(0);
      expect(result.per100g.fat_g).toBe(0);
    });

    it('uses fallback energy nutrient number 957', () => {
      const food: USDASearchFood = {
        fdcId: 777,
        description: 'Energy fallback food',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrientId: 2048, nutrientName: 'Energy (Atwater General Factors)', nutrientNumber: '957', unitName: 'kcal', value: 200 },
        ],
      };

      const result = normalizeSearchResult(food);
      expect(result.per100g.calories).toBe(200);
    });
  });

  describe('normalizeDetailResult', () => {
    it('extracts nutrients from detail format', () => {
      const food: USDAFoodDetail = {
        fdcId: 123456,
        description: 'Salmon, Atlantic',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', number: '208', unitName: 'kcal' }, amount: 208 },
          { nutrient: { id: 1003, name: 'Protein', number: '203', unitName: 'g' }, amount: 20.4 },
          { nutrient: { id: 1005, name: 'Carbohydrate', number: '205', unitName: 'g' }, amount: 0 },
          { nutrient: { id: 1004, name: 'Total lipid', number: '204', unitName: 'g' }, amount: 13.4 },
        ],
      };

      const result = normalizeDetailResult(food);

      expect(result.per100g.calories).toBe(208);
      expect(result.per100g.protein_g).toBe(20.4);
      expect(result.per100g.carbs_g).toBe(0);
      expect(result.per100g.fat_g).toBe(13.4);
    });

    it('handles missing amount fields', () => {
      const food: USDAFoodDetail = {
        fdcId: 888,
        description: 'No amount food',
        dataType: 'Foundation',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', number: '208', unitName: 'kcal' }, amount: undefined },
          { nutrient: { id: 1003, name: 'Protein', number: '203', unitName: 'g' } },
        ] as USDAFoodDetail['foodNutrients'],
      };

      const result = normalizeDetailResult(food);

      expect(result.per100g.calories).toBe(0);
      expect(result.per100g.protein_g).toBe(0);
    });
  });
});

describe('computeMacrosForServing', () => {
  const testFood: NormalizedFood = {
    id: 'usda:100',
    providerId: 'usda',
    externalId: '100',
    name: 'Test Food',
    basis: 'per100g',
    per100g: {
      calories: 200,
      protein_g: 20,
      carbs_g: 30,
      fat_g: 10,
    },
    updatedAt: new Date().toISOString(),
  };

  it('scales correctly for 100g (1:1)', () => {
    const result = computeMacrosForServing(testFood, 100);
    expect(result.calories).toBe(200);
    expect(result.protein_g).toBe(20);
    expect(result.carbs_g).toBe(30);
    expect(result.fat_g).toBe(10);
  });

  it('scales correctly for 50g (half)', () => {
    const result = computeMacrosForServing(testFood, 50);
    expect(result.calories).toBe(100);
    expect(result.protein_g).toBe(10);
    expect(result.carbs_g).toBe(15);
    expect(result.fat_g).toBe(5);
  });

  it('scales correctly for 250g', () => {
    const result = computeMacrosForServing(testFood, 250);
    expect(result.calories).toBe(500);
    expect(result.protein_g).toBe(50);
    expect(result.carbs_g).toBe(75);
    expect(result.fat_g).toBe(25);
  });

  it('returns 0 for 0g serving', () => {
    const result = computeMacrosForServing(testFood, 0);
    expect(result.calories).toBe(0);
    expect(result.protein_g).toBe(0);
    expect(result.carbs_g).toBe(0);
    expect(result.fat_g).toBe(0);
  });
});

describe('customization logic', () => {
  const baseFood: NormalizedFood = {
    id: 'usda:500',
    providerId: 'usda',
    externalId: '500',
    name: 'Base Food',
    basis: 'per100g',
    per100g: {
      calories: 150,
      protein_g: 15,
      carbs_g: 20,
      fat_g: 5,
    },
    updatedAt: new Date().toISOString(),
  };

  it('creates non-customized entry when macros match', () => {
    const macros = computeMacrosForServing(baseFood, 100);
    const entry = createFoodEntry(baseFood, baseFood.name, 100, macros, false);

    expect(entry.customization).toBeUndefined();
    expect(entry.providerId).toBe('usda');
    expect(entry.externalId).toBe('500');
    expect(entry.protein_g).toBe(15);
    expect(entry.carbs_g).toBe(20);
    expect(entry.fat_g).toBe(5);
  });

  it('creates customized entry when user edits macros', () => {
    const editedMacros = { calories: 200, protein_g: 25, carbs_g: 20, fat_g: 5 };
    const entry = createFoodEntry(baseFood, baseFood.name, 100, editedMacros, true);

    expect(entry.customization).toBeDefined();
    expect(entry.customization?.isCustomized).toBe(true);
    expect(entry.customization?.reason).toBe('user_edit');
    expect(entry.customization?.baseFoodId).toBe('usda:500');
    expect(entry.protein_g).toBe(25);
  });

  it('does NOT modify the base NormalizedFood when creating customized entry', () => {
    const originalPer100g = { ...baseFood.per100g };
    const editedMacros = { calories: 300, protein_g: 30, carbs_g: 40, fat_g: 10 };
    createFoodEntry(baseFood, 'Custom Name', 100, editedMacros, true);

    expect(baseFood.per100g.calories).toBe(originalPer100g.calories);
    expect(baseFood.per100g.protein_g).toBe(originalPer100g.protein_g);
    expect(baseFood.per100g.carbs_g).toBe(originalPer100g.carbs_g);
    expect(baseFood.per100g.fat_g).toBe(originalPer100g.fat_g);
    expect(baseFood.name).toBe('Base Food');
  });

  it('creates manual entry when no food is selected', () => {
    const macros = { calories: 100, protein_g: 10, carbs_g: 10, fat_g: 2 };
    const entry = createFoodEntry(null, 'Manual food', 150, macros, false);

    expect(entry.providerId).toBe('manual');
    expect(entry.externalId).toBeUndefined();
    expect(entry.customization).toBeUndefined();
  });
});

describe('createManualNormalizedFood', () => {
  it('scales macros back to per100g basis', () => {
    const macros = { calories: 200, protein_g: 20, carbs_g: 30, fat_g: 5 };
    const food = createManualNormalizedFood('My Food', macros, 200);

    expect(food.per100g.calories).toBe(100);
    expect(food.per100g.protein_g).toBe(10);
    expect(food.per100g.carbs_g).toBe(15);
    expect(food.per100g.fat_g).toBe(2.5);
    expect(food.providerId).toBe('manual');
    expect(food.basis).toBe('per100g');
  });
});
