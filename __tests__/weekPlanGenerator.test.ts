import { generateWeekPlan } from '../utils/mealPlanGenerator';

describe('generateWeekPlan', () => {
  const macros = { calories: 2000, protein_g: 150, carbs_g: 200, fat_g: 67 };

  it('generates between 1 and 7 days', () => {
    const week = generateWeekPlan(macros, 'standard', [], 7);
    expect(week.days).toHaveLength(7);
    expect(week.numDays).toBe(7);
  });

  it('clamps invalid day counts', () => {
    expect(generateWeekPlan(macros, 'standard', [], 0).numDays).toBe(1);
    expect(generateWeekPlan(macros, 'standard', [], 99).numDays).toBe(7);
  });

  it('generates distinct day plans via generation seed', () => {
    const week = generateWeekPlan(macros, 'standard', [], 3);
    const day0Foods = week.days[0].meals.flatMap((m) => m.suggestions.map((s) => s.foodId)).join(',');
    const day1Foods = week.days[1].meals.flatMap((m) => m.suggestions.map((s) => s.foodId)).join(',');
    expect(day0Foods).not.toEqual(day1Foods);
  });
});
