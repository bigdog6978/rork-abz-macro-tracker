/**
 * Unit tests for the Meal Plan Engine.
 * Verifies: solver reaches tolerance, diet constraints respected, plan totals match targets,
 * proper snack structure (no top-ups), and IF timing collapse.
 */

import { generateMealPlan, normalizeMacroTargetsForPlanning } from '../utils/mealPlanGenerator';
import { MacroTargets, UserAllergy } from '../types';

const TOLERANCE = { protein: 3, carbs: 5, fat: 3, calories: 50 };
const TEST_TOLERANCE = { protein: 15, carbs: 20, fat: 10, calories: 80 };
const REQUIRED_TARGET_TOLERANCE = { protein: 8, carbs: 15, fat: 6, calories: 60 };

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

function getMealNames(plan: ReturnType<typeof generateMealPlan>): string[] {
  return plan.meals.map((m) => m.name);
}

function getPlanFingerprint(plan: ReturnType<typeof generateMealPlan>): string {
  return plan.meals
    .map((meal) => meal.suggestions.map((suggestion) => suggestion.foodId).join(','))
    .join('|');
}

describe('MealPlanGenerator', () => {
  describe('target normalization for planning', () => {
    it('normalizes calories when macro-derived calories differ significantly', () => {
      const rawTargets: MacroTargets = { calories: 3615, protein_g: 229, carbs_g: 277, fat_g: 78 };
      const normalized = normalizeMacroTargetsForPlanning(rawTargets);
      expect(normalized.wasNormalized).toBe(true);
      expect(normalized.normalizedTargets.calories).toBe(2726);
      expect(normalized.deltaCalories).toBe(-889);
    });

    it('keeps calories unchanged when already consistent with macro energy', () => {
      const rawTargets: MacroTargets = { calories: 1941, protein_g: 122, carbs_g: 271, fat_g: 41 };
      const normalized = normalizeMacroTargetsForPlanning(rawTargets);
      expect(normalized.wasNormalized).toBe(false);
      expect(normalized.normalizedTargets.calories).toBe(1941);
      expect(normalized.deltaCalories).toBe(0);
    });
  });

  // ── No top-ups anywhere ──────────────────────────────────────────────────

  describe('snack structure', () => {
    it('never produces a meal named "Top-Up", "Top-Up Snack", or "Final Top-Up"', () => {
      const styles = ['standard', 'keto', 'carnivore', 'mediterranean', 'vegan', 'vegetarian'] as const;
      for (const style of styles) {
        const plan = generateMealPlan(
          { calories: 2500, protein_g: 180, carbs_g: 250, fat_g: 80 },
          style, [], 'us'
        );
        const names = getMealNames(plan);
        for (const n of names) {
          expect(n.toLowerCase()).not.toContain('top-up');
          expect(n.toLowerCase()).not.toContain('top up');
        }
      }
    });

    it('standard 2000 cal plan has 5 meal slots (3 meals + 2 snacks)', () => {
      const plan = generateMealPlan(
        { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 },
        'standard', [], 'us'
      );
      expect(plan.meals.length).toBe(5);
      const names = getMealNames(plan);
      expect(names).toContain('Morning Snack');
      expect(names).toContain('Afternoon Snack');
    });

    it('high-calorie (≥2200) plan has 6 meal slots (3 meals + 3 snacks)', () => {
      const plan = generateMealPlan(
        { calories: 2800, protein_g: 200, carbs_g: 300, fat_g: 90 },
        'standard', [], 'us'
      );
      expect(plan.meals.length).toBe(6);
      const names = getMealNames(plan);
      expect(names).toContain('Morning Snack');
      expect(names).toContain('Afternoon Snack');
      expect(names).toContain('Evening Snack');
    });

    it('very high calorie plan still uses named snack slots, not top-ups', () => {
      const plan = generateMealPlan(
        { calories: 4000, protein_g: 250, carbs_g: 500, fat_g: 90 },
        'standard', [], 'us'
      );
      const names = getMealNames(plan);
      for (const n of names) {
        expect(n.toLowerCase()).not.toContain('top');
      }
      expect(names).toContain('Morning Snack');
      expect(names).toContain('Afternoon Snack');
    });
  });

  // ── IF timing ────────────────────────────────────────────────────────────

  describe('intermittent fasting', () => {
    it('IF plans collapse to 2 meals + 1 snack during eating window', () => {
      const plan = generateMealPlan(
        { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 },
        'standard', ['intermittent_fasting'], 'us'
      );
      expect(plan.meals.length).toBeLessThanOrEqual(3);
      const names = getMealNames(plan);
      expect(names).toContain('First Meal (Noon)');
      expect(names).toContain('Second Meal');
      expect(names).not.toContain('Morning Snack');
      expect(names).not.toContain('Breakfast');
    });

    it('IF plans still hit macro targets', () => {
      const targets: MacroTargets = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };
      const plan = generateMealPlan(targets, 'standard', ['intermittent_fasting'], 'us');
      const totals = sumPlanTotals(plan);
      expect(withinTolerance(totals, targets, TEST_TOLERANCE)).toBe(true);
    });

    it('IF meal percentages remain mathematically exact (sum ~ 1.0)', () => {
      const targets: MacroTargets = { calories: 2200, protein_g: 160, carbs_g: 230, fat_g: 73 };
      const plan = generateMealPlan(targets, 'standard', ['intermittent_fasting'], 'us');
      const pct = plan.meals.reduce((sum, meal) => sum + meal.percentage, 0);
      expect(Math.abs(pct - 1)).toBeLessThanOrEqual(0.001);
    });
  });

  describe('required tolerance across preference combinations', () => {
    const cases: Array<{
      label: string;
      style: Parameters<typeof generateMealPlan>[1];
      modifiers: Parameters<typeof generateMealPlan>[2];
      targets: MacroTargets;
      allergies?: UserAllergy[];
      disliked?: string[];
    }> = [
      {
        label: 'no modifiers',
        style: 'standard',
        modifiers: [],
        targets: { calories: 2200, protein_g: 170, carbs_g: 230, fat_g: 73 },
      },
      {
        label: 'IF + low glycemic',
        style: 'standard',
        modifiers: ['intermittent_fasting', 'low_glycemic'],
        targets: { calories: 2400, protein_g: 180, carbs_g: 260, fat_g: 80 },
      },
      {
        label: 'IF + restrictions + allergies + disliked',
        style: 'mediterranean',
        modifiers: ['intermittent_fasting', 'low_glycemic', 'dairy_free', 'egg_free'],
        targets: { calories: 2100, protein_g: 140, carbs_g: 245, fat_g: 62 },
        allergies: [
          { id: 'a1', name: 'Soy', normalized: 'soy', createdAt: 0, updatedAt: 0 },
          { id: 'a2', name: 'Tree nuts', normalized: 'tree nuts', createdAt: 0, updatedAt: 0 },
        ],
        disliked: ['chicken_breast', 'greek_yogurt'],
      },
      {
        label: 'keto edge case',
        style: 'keto',
        modifiers: ['intermittent_fasting'],
        targets: { calories: 1900, protein_g: 140, carbs_g: 30, fat_g: 120 },
      },
      {
        label: 'carnivore edge case',
        style: 'carnivore',
        modifiers: ['intermittent_fasting'],
        targets: { calories: 2042, protein_g: 105, carbs_g: 5, fat_g: 178 },
      },
      {
        label: 'vegan edge case',
        style: 'vegan',
        modifiers: ['intermittent_fasting', 'low_glycemic'],
        targets: { calories: 2300, protein_g: 135, carbs_g: 300, fat_g: 70 },
      },
      {
        label: 'high calorie',
        style: 'standard',
        modifiers: ['intermittent_fasting'],
        targets: { calories: 3600, protein_g: 230, carbs_g: 430, fat_g: 100 },
      },
      {
        label: 'low calorie',
        style: 'standard',
        modifiers: [],
        targets: { calories: 1500, protein_g: 130, carbs_g: 120, fat_g: 50 },
      },
    ];

    it.each(cases)('$label stays within required tolerance and produces a usable plan', ({ style, modifiers, targets, allergies = [], disliked = [] }) => {
      const normalizedTargets = normalizeMacroTargetsForPlanning(targets).normalizedTargets;
      const plan = generateMealPlan(targets, style, modifiers, 'us', allergies, 1, disliked);
      const totals = sumPlanTotals(plan);
      const ok = withinTolerance(totals, normalizedTargets, REQUIRED_TARGET_TOLERANCE);

      expect(plan.planUnavailable).not.toBe(true);
      expect(plan.meals.length).toBeGreaterThan(0);
      expect(ok).toBe(true);
    });
  });

  // ── Solver convergence ───────────────────────────────────────────────────

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
      const ok = withinTolerance(totals, targets, { protein: 15, carbs: 10, fat: 12, calories: 120 });
      expect(ok).toBe(true);
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

  // ── Diet constraints ─────────────────────────────────────────────────────

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

  // ── Macro split regressions ──────────────────────────────────────────────

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

  // ── Allergy exclusion ────────────────────────────────────────────────────

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

  // ── Modifier-driven swaps ────────────────────────────────────────────────

  describe('modifier-driven swaps', () => {
    it('low glycemic swaps fast carb choices for lower-glycemic options without losing macro alignment', () => {
      const targets: MacroTargets = { calories: 1941, protein_g: 122, carbs_g: 271, fat_g: 41 };
      const plan = generateMealPlan(targets, 'mediterranean', ['low_glycemic'], 'us', [], 1);
      const totals = sumPlanTotals(plan);
      const foodIds = plan.meals.flatMap((meal) => meal.suggestions.map((suggestion) => suggestion.foodId));

      expect(foodIds).not.toContain('pita');
      expect(foodIds).not.toContain('couscous');
      expect(foodIds).not.toContain('tabbouleh');
      expect(foodIds).not.toContain('dates');
      expect(foodIds).toContain('sweet_potato');
      expect(foodIds).toContain('quinoa');
      expect(foodIds).toContain('berries');
      expect(withinTolerance(totals, targets, { protein: 12, carbs: 18, fat: 10, calories: 110 })).toBe(true);
    });

    it('supports very high calorie low-glycemic targets without high-GI foods', () => {
      const targets: MacroTargets = { calories: 4003, protein_g: 250, carbs_g: 582, fat_g: 75 };
      const plan = generateMealPlan(targets, 'standard', ['low_glycemic'], 'us');
      const totals = sumPlanTotals(plan);
      const foodIds = plan.meals.flatMap((meal) => meal.suggestions.map((suggestion) => suggestion.foodId));

      expect(foodIds).not.toContain('white_rice');
      expect(foodIds).not.toContain('banana');
      expect(foodIds).not.toContain('rice_cake');
      expect(totals.calories).toBeGreaterThanOrEqual(targets.calories * 0.92);
      expect(totals.calories).toBeLessThanOrEqual(targets.calories * 1.08);
      expect(totals.protein_g).toBeGreaterThanOrEqual(targets.protein_g * 0.88);
      expect(totals.carbs_g).toBeGreaterThanOrEqual(targets.carbs_g * 0.88);
      expect(totals.fat_g).toBeGreaterThanOrEqual(targets.fat_g * 0.8);
    });
  });

  // ── Regeneration ─────────────────────────────────────────────────────────

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
