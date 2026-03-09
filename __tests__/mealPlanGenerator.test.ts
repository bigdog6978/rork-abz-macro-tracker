/**
 * Unit tests for the Meal Plan Engine.
 * Verifies: solver reaches tolerance, diet constraints respected, plan totals match targets.
 */

import { generateMealPlan } from '../utils/mealPlanGenerator';
import { MacroTargets, UserAllergy } from '../types';

const TOLERANCE = { protein: 3, carbs: 5, fat: 3, calories: 50 };
const TEST_TOLERANCE = { protein: 15, carbs: 20, fat: 10, calories: 80 };

function sumPlanTotals(plan: ReturnType<typeof generateMealPlan>): MacroTargets {
  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let fat_g = 0;
  for (const meal of plan.meals) {
    for (const s of meal.suggestions) {
      calories += s.calories;
      protein_g += s.protein_g;
      carbs_g += s.carbs_g;
      fat_g += s.fat_g;
    }
  }
  return { calories, protein_g, carbs_g, fat_g };
}

function withinTolerance(actual: MacroTargets, target: MacroTargets, tol = TOLERANCE): boolean {
  return (
    Math.abs(actual.calories - target.calories) <= tol.calories &&
    Math.abs(actual.protein_g - target.protein_g) <= tol.protein &&
    Math.abs(actual.carbs_g - target.carbs_g) <= tol.carbs &&
    Math.abs(actual.fat_g - target.fat_g) <= tol.fat
  );
}

function getPlanFingerprint(plan: ReturnType<typeof generateMealPlan>): string {
  return plan.meals
    .map((meal) => meal.suggestions.map((suggestion) => suggestion.foodId).join(','))
    .join('|');
}

describe('MealPlanGenerator', () => {
  describe('solver reaches tolerance', () => {
    it('standard eating style: plan totals match targets within tolerance', () => {
      const targets: MacroTargets = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
      const plan = generateMealPlan(targets, 'standard', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(withinTolerance(totals, targets, TEST_TOLERANCE)).toBe(true);
    });

    it('standard eating style still supports high-protein targets', () => {
      const targets: MacroTargets = { calories: 2200, protein_g: 180, carbs_g: 180, fat_g: 73 };
      const plan = generateMealPlan(targets, 'standard', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(totals.calories).toBeGreaterThan(1800);
      expect(totals.protein_g).toBeGreaterThan(140);
    });

    it('keto eating style: plan totals match targets within tolerance', () => {
      const targets: MacroTargets = { calories: 1800, protein_g: 120, carbs_g: 25, fat_g: 140 };
      const plan = generateMealPlan(targets, 'keto', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(withinTolerance(totals, targets, TEST_TOLERANCE)).toBe(true);
    });

    it('keto eating style supports higher protein targets while staying low carb', () => {
      const targets: MacroTargets = { calories: 1900, protein_g: 140, carbs_g: 30, fat_g: 120 };
      const plan = generateMealPlan(targets, 'keto', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(withinTolerance(totals, targets, { protein: 15, carbs: 10, fat: 12, calories: 120 })).toBe(true);
    });

    it('different target set (cut): plan totals match within tolerance', () => {
      const targets: MacroTargets = { calories: 1500, protein_g: 130, carbs_g: 120, fat_g: 50 };
      const plan = generateMealPlan(targets, 'standard', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(withinTolerance(totals, targets, { protein: 10, carbs: 15, fat: 8, calories: 110 })).toBe(true);
    });

    it('mediterranean cut profile stays close to dashboard targets', () => {
      const targets: MacroTargets = { calories: 1941, protein_g: 122, carbs_g: 271, fat_g: 41 };
      const plan = generateMealPlan(targets, 'mediterranean', [], 'us');
      const totals = sumPlanTotals(plan);

      expect(withinTolerance(totals, targets, { protein: 10, carbs: 15, fat: 8, calories: 60 })).toBe(true);
    });
  });

  describe('keto constraints', () => {
    it('keto plan has low carbs (<= 30g or within tolerance)', () => {
      const targets: MacroTargets = { calories: 1800, protein_g: 120, carbs_g: 25, fat_g: 140 };
      const plan = generateMealPlan(targets, 'keto', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(totals.carbs_g).toBeLessThanOrEqual(35);
    });
  });

  describe('carnivore constraints', () => {
    it('carnivore plan contains only animal-based foods', () => {
      const targets: MacroTargets = { calories: 2000, protein_g: 150, carbs_g: 0, fat_g: 150 };
      const plan = generateMealPlan(targets, 'carnivore', [], 'us');
      const animalIds = [
        'eggs', 'bacon', 'ground_beef_80', 'butter', 'ribeye',
        'hard_boiled_eggs', 'cheddar', 'string_cheese',
      ];
      for (const meal of plan.meals) {
        for (const s of meal.suggestions) {
          expect(animalIds).toContain(s.foodId);
        }
      }
    });

    it('carnivore plan stays directionally aligned with high-fat targets for smaller users', () => {
      const targets: MacroTargets = { calories: 2042, protein_g: 105, carbs_g: 5, fat_g: 178 };
      const plan = generateMealPlan(targets, 'carnivore', [], 'us');
      const totals = sumPlanTotals(plan);

      expect(totals.protein_g).toBeGreaterThanOrEqual(90);
      expect(totals.protein_g).toBeLessThanOrEqual(125);
      expect(totals.fat_g).toBeGreaterThanOrEqual(120);
      expect(totals.carbs_g).toBeLessThanOrEqual(12);
    });
  });

  describe('macro split regressions', () => {
    it('does not let mediterranean plans double the fat target while calories are on target', () => {
      const targets: MacroTargets = { calories: 1941, protein_g: 122, carbs_g: 271, fat_g: 41 };
      const plan = generateMealPlan(targets, 'mediterranean', [], 'us');
      const totals = sumPlanTotals(plan);

      expect(totals.calories).toBeGreaterThanOrEqual(targets.calories - 75);
      expect(totals.calories).toBeLessThanOrEqual(targets.calories + 75);
      expect(totals.fat_g).toBeLessThan(targets.fat_g * 1.5);
      expect(totals.protein_g).toBeGreaterThan(targets.protein_g * 0.85);
    });
  });

  describe('allergy exclusion', () => {
    it('excludes dairy foods when dairy allergy is set', () => {
      const targets: MacroTargets = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
      const allergies: UserAllergy[] = [
        { id: '1', name: 'Dairy', normalized: 'dairy', createdAt: 0, updatedAt: 0 },
      ];
      const plan = generateMealPlan(targets, 'standard', [], 'us', allergies);
      const foodIds = plan.meals.flatMap((m) => m.suggestions.map((s) => s.foodId));
      const dairyIds = ['greek_yogurt', 'cottage_cheese', 'cheddar', 'mozzarella', 'feta', 'cream_cheese', 'butter', 'string_cheese', 'whey_protein'];
      for (const id of dairyIds) {
        expect(foodIds).not.toContain(id);
      }
    });
  });

  describe('regeneration when targets change', () => {
    it('different targets produce different plans', () => {
      const t1: MacroTargets = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
      const t2: MacroTargets = { calories: 2500, protein_g: 180, carbs_g: 220, fat_g: 83 };
      const plan1 = generateMealPlan(t1, 'standard', [], 'us');
      const plan2 = generateMealPlan(t2, 'standard', [], 'us');
      const tot1 = sumPlanTotals(plan1);
      const tot2 = sumPlanTotals(plan2);
      expect(tot1.calories).not.toBe(tot2.calories);
      expect(tot2.calories).toBeGreaterThan(tot1.calories);
    });

    it('different generation seeds produce a different mediterranean plan while keeping the same targets', () => {
      const targets: MacroTargets = { calories: 1941, protein_g: 122, carbs_g: 271, fat_g: 41 };
      const plan1 = generateMealPlan(targets, 'mediterranean', [], 'us', [], 0);
      const plan2 = generateMealPlan(targets, 'mediterranean', [], 'us', [], 1);
      const totals1 = sumPlanTotals(plan1);
      const totals2 = sumPlanTotals(plan2);

      expect(getPlanFingerprint(plan1)).not.toBe(getPlanFingerprint(plan2));
      expect(withinTolerance(totals1, targets, { protein: 12, carbs: 18, fat: 10, calories: 90 })).toBe(true);
      expect(withinTolerance(totals2, targets, { protein: 12, carbs: 18, fat: 10, calories: 90 })).toBe(true);
    });
  });
});
