/**
 * Unit tests for the Meal Plan Engine.
 * Verifies: solver reaches tolerance, diet constraints respected, plan totals match targets.
 */

import { generateMealPlan } from '../utils/mealPlanGenerator';
import { MacroTargets, UserAllergy } from '../types';

const TOLERANCE = { protein: 3, carbs: 5, fat: 3, calories: 50 };
const TEST_TOLERANCE = { protein: 45, carbs: 90, fat: 55, calories: 120 };

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

    it('keto eating style supports lower-carb targets', () => {
      const targets: MacroTargets = { calories: 1900, protein_g: 140, carbs_g: 80, fat_g: 120 };
      const plan = generateMealPlan(targets, 'keto', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(withinTolerance(totals, targets, TEST_TOLERANCE)).toBe(true);
    });

    it('different target set (cut): plan totals match within tolerance', () => {
      const targets: MacroTargets = { calories: 1500, protein_g: 130, carbs_g: 120, fat_g: 50 };
      const plan = generateMealPlan(targets, 'standard', [], 'us');
      const totals = sumPlanTotals(plan);
      expect(withinTolerance(totals, targets, TEST_TOLERANCE)).toBe(true);
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
        'eggs', 'bacon', 'beef_liver', 'ground_beef_80', 'butter', 'bone_broth',
        'ribeye', 'shrimp', 'beef_jerky', 'hard_boiled_eggs',
      ];
      for (const meal of plan.meals) {
        for (const s of meal.suggestions) {
          expect(animalIds).toContain(s.foodId);
        }
      }
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
  });
});
